"""Experiment 3: compile one verified concept into course / reading / audio (en+kn); check deterministically.

  python scripts/v2_exp3_compiler.py [--models gemini-3.5-flash-lite,gemini-3.8-flash] [--tts]
"""
from __future__ import annotations

import argparse
import json
import sys
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.compiler import check_course, check_inline_claims, check_items, check_kannada, compile_mode  # noqa: E402
from core.v2_llm import OUT, V2LLM, BudgetAbort, log_result, spend_summary  # noqa: E402

SUBTOPICS = ["basic", "commission", "change", "sheet"]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--models", default="gemini-3.5-flash-lite,gemini-3.8-flash")
    ap.add_argument("--tts", action="store_true", help="render one Kannada audio sample for human review (~$0.01)")
    a = ap.parse_args()
    llm = V2LLM("exp3")
    odir = OUT / "exp3_outputs"
    odir.mkdir(exist_ok=True)
    summary = {}
    for model in a.models.split(","):
        jobs = [("course", None)] + [("reading", s) for s in SUBTOPICS] + [("audio", s) for s in SUBTOPICS]
        res = []
        for mode, sub in jobs:
            try:
                obj, meta = compile_mode(llm, model, mode, sub)
            except BudgetAbort as e:
                print("BUDGET ABORT", e)
                return 2
            checks: dict = {}
            if obj is not None:
                (odir / f"{model}_{mode}_{sub or 'all'}.json").write_text(obj.model_dump_json(indent=1), encoding="utf-8")
                if mode == "course":
                    checks = check_course(obj)
                    items_ok = (checks["checkpoints"]["answer_ok"], checks["checkpoints"]["n"])
                    factual_wrong = len(checks["inline_claims"]["claims_wrong"]) + (checks["checkpoints"]["n"] - checks["checkpoints"]["answer_ok"])
                elif mode == "reading":
                    ci = check_items(obj.practice)
                    checks = {"practice": ci, "inline_claims": check_inline_claims(" ".join(s.text for s in obj.steps)), "steps": len(obj.steps)}
                    items_ok = (ci["answer_ok"], ci["n"])
                    factual_wrong = len(checks["inline_claims"]["claims_wrong"]) + ci["n"] - ci["answer_ok"]
                else:
                    en_items = [t.pause_question for t in obj.en_turns if t.pause_question]
                    kn_items = [t.pause_question for t in obj.kn_turns if t.pause_question]
                    ci = check_items(en_items + kn_items)
                    checks = {"pause_items": ci, "kannada": check_kannada(obj.en_turns, obj.kn_turns),
                              "inline_claims": check_inline_claims(" ".join(t.text for t in obj.en_turns))}
                    items_ok = (ci["answer_ok"], ci["n"])
                    factual_wrong = len(checks["inline_claims"]["claims_wrong"]) + ci["n"] - ci["answer_ok"]
            else:
                items_ok, factual_wrong = (0, 0), None
            row = {"experiment": "exp3", "mode": mode, "subtopic": sub, "model": model, "prompt_version": "compile-v1",
                   **{k: meta.get(k) for k in ("schema_valid", "latency_ms", "usd", "in_tokens", "out_tokens", "thought_tokens", "bytes", "cache_hit", "retries")},
                   "items_correct": items_ok[0], "items_total": items_ok[1], "factual_errors_detected": factual_wrong, "checks": checks}
            log_result(row)
            res.append(row)
            print(f"{model:22s} {mode:8s} {str(sub):10s} valid={meta.get('schema_valid')} items={items_ok[0]}/{items_ok[1]} "
                  f"factual_err={factual_wrong} {meta.get('latency_ms')}ms {meta.get('bytes')}B ${meta.get('usd')}", flush=True)
            if mode == "audio" and obj is not None:
                k = checks["kannada"]
                print(f"   kn: ratio={k['kn_script_ratio']} ಶೇಕಡಾ={k['uses_percent_term_ಶೇಕಡಾ']} same_numbers={k['same_numbers_en_kn']} q={k['pause_questions_en']}/{k['pause_questions_kn']}")
        summary[model] = {
            "calls": len(res), "schema_valid": sum(bool(r["schema_valid"]) for r in res),
            "items_correct": sum(r["items_correct"] for r in res), "items_total": sum(r["items_total"] for r in res),
            "factual_errors_detected": sum(r["factual_errors_detected"] or 0 for r in res),
            "usd": round(sum(r["usd"] or 0 for r in res), 5), "latency_ms": [r["latency_ms"] for r in res],
            "bytes_by_mode": {m: sum(r["bytes"] or 0 for r in res if r["mode"] == m) for m in ("course", "reading", "audio")},
            "kn_same_numbers": [r["checks"].get("kannada", {}).get("same_numbers_en_kn") for r in res if r["mode"] == "audio"],
            "kn_uses_shekada": [r["checks"].get("kannada", {}).get("uses_percent_term_ಶೇಕಡಾ") for r in res if r["mode"] == "audio"],
        }
    if a.tts:
        render_kn_sample(llm, odir)
    (OUT / "exp3_summary.json").write_text(json.dumps(summary, indent=1, ensure_ascii=False), encoding="utf-8")
    print(json.dumps({m: {k: v for k, v in s.items() if k != "latency_ms"} for m, s in summary.items()}, indent=1, ensure_ascii=False))
    print("spend:", spend_summary())
    return 0


def render_kn_sample(llm: V2LLM, odir: Path) -> None:
    """One Kannada audio sample for a fluent listener to judge. Not machine-verifiable."""
    from google.genai import types
    src = next(odir.glob("gemini-3.8-flash_audio_basic.json"), None) or next(odir.glob("*_audio_basic.json"))
    obj = json.loads(src.read_text(encoding="utf-8"))
    text = " ".join(t["text"] for t in obj["kn_turns"][:3])
    out = odir / "kn_audio_sample_for_human_review.wav"
    if out.exists():
        print("kn sample cached")
        return
    llm.guard("gemini-3.8-flash-tts", len(text), 2000, "exp3_kn_tts")
    with llm.ledger.track("exp3_kn_tts", "gemini-3.8-flash-tts", "text") as rec:
        r = llm.client.models.generate_content(model="gemini-3.8-flash-tts", contents=text, config=types.GenerateContentConfig(
            response_modalities=["AUDIO"], speech_config=types.SpeechConfig(voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name="Kore")))))
        rec.input_tokens = r.usage_metadata.prompt_token_count or 0
        rec.output_tokens = r.usage_metadata.candidates_token_count or 0
        part = r.candidates[0].content.parts[0]
        out.write_bytes(part.inline_data.data)
    (odir / "kn_audio_sample_text.txt").write_text(text, encoding="utf-8")
    print("kn sample written:", out, out.stat().st_size, "bytes")


if __name__ == "__main__":
    raise SystemExit(main())
