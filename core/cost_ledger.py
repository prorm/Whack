"""CostLedger: every model call is estimated, budget-checked, and logged.

* reports/cost_log.jsonl holds one line per call (cumulative across runs).
* guard(estimate) runs BEFORE any paid image/video call and raises BudgetExceeded
  if cumulative spend + estimate would pass MAX_TEST_BUDGET_USD.
"""
from __future__ import annotations

import json
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path

from .settings import model_registry, settings


class BudgetExceeded(RuntimeError):
    pass


def price_of(model_id: str) -> dict:
    return model_registry()["models"].get(model_id, {}).get("price", {})


def estimate_text(model_id: str, in_tokens: int, out_tokens: int) -> float:
    p = price_of(model_id)
    return in_tokens / 1e6 * p.get("input_per_1m", 0) + out_tokens / 1e6 * p.get("output_per_1m", 0)


def estimate_images(model_id: str, n: int) -> float:
    return n * price_of(model_id).get("per_image", 0)


def estimate_video(model_id: str, seconds: float, audio: bool) -> float:
    p = price_of(model_id)
    return seconds * (p.get("per_second_audio", 0) if audio else p.get("per_second_silent", 0))


@dataclass
class CallRecord:
    run_id: str
    test: str
    model: str
    modality: str
    usd: float = 0.0
    latency_ms: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    thought_tokens: int = 0
    images: int = 0
    video_seconds: float = 0.0
    bytes_out: int = 0
    ok: bool = True
    error: str = ""
    extra: dict = field(default_factory=dict)


class CostLedger:
    def __init__(self, run_id: str, path: Path | None = None, budget: float | None = None):
        self.run_id = run_id
        self.path = path or settings().reports_dir / "cost_log.jsonl"
        self.budget = settings().max_budget_usd if budget is None else budget
        self._lock = threading.Lock()
        self.records: list[CallRecord] = []

    # cumulative spend across all runs on disk
    def spent_total(self) -> float:
        if not self.path.exists():
            return 0.0
        total = 0.0
        for line in self.path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                total += json.loads(line).get("usd", 0.0)
        return total

    def spent_this_run(self) -> float:
        return sum(r.usd for r in self.records)

    def guard(self, estimate_usd: float, what: str) -> None:
        total = self.spent_total()
        if total + estimate_usd > self.budget:
            raise BudgetExceeded(
                f"Refusing {what}: spent ${total:.4f} + estimate ${estimate_usd:.4f} > budget ${self.budget:.2f}"
            )

    @contextmanager
    def track(self, test: str, model: str, modality: str):
        rec = CallRecord(run_id=self.run_id, test=test, model=model, modality=modality)
        t0 = time.perf_counter()
        try:
            yield rec
        except Exception as e:  # record failures too, then re-raise
            rec.ok, rec.error = False, f"{type(e).__name__}: {e}"[:500]
            raise
        finally:
            rec.latency_ms = rec.latency_ms or int((time.perf_counter() - t0) * 1000)
            if modality == "text":
                rec.usd = estimate_text(model, rec.input_tokens, rec.output_tokens + rec.thought_tokens)
            elif modality == "image":
                rec.usd = estimate_images(model, rec.images)
            elif modality == "video":
                rec.usd = estimate_video(model, rec.video_seconds, rec.extra.get("audio", True))
            self._write(rec)

    def _write(self, rec: CallRecord) -> None:
        row = {"ts": datetime.now(timezone.utc).isoformat(), **rec.__dict__}
        row["usd"] = round(row["usd"], 6)
        with self._lock:
            self.records.append(rec)
            with self.path.open("a", encoding="utf-8") as f:
                f.write(json.dumps(row, ensure_ascii=False) + "\n")


def ledgered(test: str, modality: str):
    """Decorator form: the wrapped fn receives `rec` as kwarg and must fill usage fields.

    Usage:  @ledgered("storyboard", "text")
            def call(self, model, ..., rec=None): rec.input_tokens = ...
    The first positional arg after self must expose `.ledger`; the model id is passed as kwarg `model`.
    """

    def deco(fn):
        def wrapper(obj, *a, model: str, **kw):
            with obj.ledger.track(kw.pop("test", test), model, modality) as rec:
                return fn(obj, *a, model=model, rec=rec, **kw)

        return wrapper

    return deco
