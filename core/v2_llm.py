"""Feasibility v2 LLM gateway: budget-guarded, cached, fully logged.

Rules enforced here (see reports/feasibility_v2/README.md):
* Additional v2 budget: $2.00 (V2_BUDGET_USD). Lifetime cap: MAX_TEST_BUDGET_USD ($5.00).
* Before every paid call: availability check (probe), WORST-CASE cost estimate
  (estimated input tokens + max_output_tokens counted twice to cover thinking tokens),
  abort if either cap could be exceeded.
* Every real call is logged to reports/cost_log.jsonl (run_id prefix "v2-").
* Cache hits are logged separately to outputs/feasibility_v2/cache_log.jsonl and cost $0.
"""
from __future__ import annotations

import hashlib
import json
import os
import time
from datetime import datetime, timezone
from pathlib import Path

from google import genai
from google.genai import types

from .cost_ledger import CostLedger, estimate_text, price_of
from .settings import ROOT, settings

V2_BUDGET_USD = float(os.getenv("V2_BUDGET_USD", "2.00"))
OUT = ROOT / "outputs" / "feasibility_v2"
CACHE = OUT / "cache"
CACHE.mkdir(parents=True, exist_ok=True)
CACHE_LOG = OUT / "cache_log.jsonl"
# Conservative fallback price when a model has no entry in config/models.json.
FALLBACK_PRICE = {"input_per_1m": 2.0, "output_per_1m": 12.0}


class BudgetAbort(RuntimeError):
    pass


def ledger_rows() -> list[dict]:
    p = settings().reports_dir / "cost_log.jsonl"
    if not p.exists():
        return []
    return [json.loads(l) for l in p.read_text(encoding="utf-8").splitlines() if l.strip()]


def spend_summary() -> dict:
    rows = ledger_rows()
    pre = sum(r["usd"] for r in rows if not str(r.get("run_id", "")).startswith("v2-"))
    v2 = sum(r["usd"] for r in rows if str(r.get("run_id", "")).startswith("v2-"))
    # The brief reports $0.62 prior spend; the ledger holds $0.615. Use the larger (conservative).
    pre_conservative = max(pre, 0.62)
    return {"pre_v2_ledger": round(pre, 4), "pre_v2_conservative": pre_conservative, "v2": round(v2, 4),
            "lifetime_conservative": round(pre_conservative + v2, 4)}


def _price(model: str) -> dict:
    p = price_of(model)
    return p if p.get("input_per_1m") is not None and "output_per_1m" in p else FALLBACK_PRICE


def worst_case_usd(model: str, est_in_tokens: int, max_out: int) -> float:
    p = _price(model)
    # thinking tokens are billed as output: allow the same again
    return est_in_tokens / 1e6 * p["input_per_1m"] + 2 * max_out / 1e6 * p["output_per_1m"]


class V2LLM:
    def __init__(self, run_tag: str):
        s = settings()
        self.run_id = f"v2-{run_tag}-{datetime.now().strftime('%Y%m%d-%H%M%S')}"
        self.ledger = CostLedger(self.run_id)
        self.client = genai.Client(vertexai=True, project=s.project, location=s.text_location)
        self._available: dict[str, bool] = {}

    # ---------------------------------------------------------------- guards
    def available(self, model: str) -> bool:
        if model not in self._available:
            try:
                self.client.models.get(model=model)
                self._available[model] = True
            except Exception:
                self._available[model] = False
        return self._available[model]

    def guard(self, model: str, est_in: int, max_out: int, what: str) -> float:
        if not self.available(model):
            raise BudgetAbort(f"{model} not available in this project")
        est = worst_case_usd(model, est_in, max_out)
        sp = spend_summary()
        if sp["v2"] + est > V2_BUDGET_USD:
            raise BudgetAbort(f"{what}: v2 spend ${sp['v2']:.4f} + worst-case ${est:.4f} > v2 cap ${V2_BUDGET_USD}")
        if sp["lifetime_conservative"] + est > settings().max_budget_usd:
            raise BudgetAbort(f"{what}: lifetime ${sp['lifetime_conservative']:.4f} + ${est:.4f} > ${settings().max_budget_usd}")
        return est

    # ---------------------------------------------------------------- call
    def generate(self, model: str, contents, *, test: str, prompt_version: str, schema: type | None = None,
                 max_out: int = 2048, temperature: float = 0.2, json_mode: bool = True, use_cache: bool = True,
                 cache_salt: str = "") -> dict:
        """Returns {text, model, cache_hit, latency_ms, usd, in_tokens, out_tokens, thought_tokens, est_worst_usd}."""
        key_src = json.dumps({"m": model, "c": _contents_key(contents), "s": schema.__name__ if schema else None,
                              "pv": prompt_version, "t": temperature, "salt": cache_salt}, sort_keys=True)
        key = hashlib.sha256(key_src.encode()).hexdigest()[:24]
        cpath = CACHE / f"{key}.json"
        if use_cache and cpath.exists():
            hit = json.loads(cpath.read_text(encoding="utf-8"))
            _append(CACHE_LOG, {"ts": _now(), "run_id": self.run_id, "test": test, "model": model, "key": key})
            return {**hit, "cache_hit": True, "usd": 0.0, "latency_ms": 0}
        est_in = _estimate_in_tokens(contents)
        est = self.guard(model, est_in, max_out, test)
        cfg: dict = dict(temperature=temperature, max_output_tokens=max_out)
        if json_mode:
            cfg["response_mime_type"] = "application/json"
            if schema is not None:
                cfg["response_json_schema"] = schema.model_json_schema()
        if model.startswith("gemini-3") and "tts" not in model:
            cfg["thinking_config"] = types.ThinkingConfig(thinking_level="low")
        retries = 0
        with self.ledger.track(test, model, "text") as rec:
            while True:
                try:
                    resp = self.client.models.generate_content(model=model, contents=contents,
                                                               config=types.GenerateContentConfig(**cfg))
                    break
                except Exception as e:
                    if "429" in str(e) and retries < 3:
                        retries += 1
                        time.sleep(8 * 2 ** retries)
                        continue
                    raise
            u = resp.usage_metadata
            rec.input_tokens = (u.prompt_token_count or 0) if u else 0
            rec.output_tokens = (u.candidates_token_count or 0) if u else 0
            rec.thought_tokens = (u.thoughts_token_count or 0) if u else 0
            rec.extra.update(prompt_version=prompt_version, est_worst_usd=round(est, 6), retries=retries)
            text = resp.text or ""
        out = {"text": text, "model": model, "latency_ms": rec.latency_ms, "in_tokens": rec.input_tokens,
               "out_tokens": rec.output_tokens, "thought_tokens": rec.thought_tokens,
               "usd": round(estimate_text(model, rec.input_tokens, rec.output_tokens + rec.thought_tokens), 6),
               "est_worst_usd": round(est, 6), "retries": retries, "prompt_version": prompt_version}
        cpath.write_text(json.dumps(out, ensure_ascii=False), encoding="utf-8")
        return {**out, "cache_hit": False}


def _contents_key(contents) -> str:
    if isinstance(contents, str):
        return contents
    parts = []
    for c in contents:
        if isinstance(c, str):
            parts.append(c)
        elif isinstance(c, types.Part) and c.inline_data is not None:
            parts.append(hashlib.sha256(c.inline_data.data).hexdigest())
        else:
            parts.append(str(c))
    return "\n".join(parts)


def _estimate_in_tokens(contents) -> int:
    if isinstance(contents, str):
        return len(contents) // 2 + 50  # conservative: ~2 chars/token (Kannada script is token-heavy)
    n = 50
    for c in contents:
        if isinstance(c, str):
            n += len(c) // 2
        elif isinstance(c, types.Part) and c.inline_data is not None:
            n += len(c.inline_data.data) // 100  # audio/image: generous
    return n


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _append(path: Path, row: dict) -> None:
    with path.open("a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False) + "\n")


def log_result(row: dict) -> None:
    """Append one experiment result to reports/feasibility_v2/results.jsonl."""
    _append(settings().reports_dir / "feasibility_v2" / "results.jsonl", {"ts": _now(), **row})
