"""Experiment 1: Opportunity-to-Skill. Hand-labelled cases x models x repetitions, deterministic scoring.

  python scripts/v2_exp1_opportunity.py [--reps 2] [--models m1,m2]
Writes reports/feasibility_v2/results.jsonl rows (experiment=exp1) and outputs/feasibility_v2/exp1_summary.json.
"""
from __future__ import annotations

import argparse
import asyncio
import json
import re
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from core.opportunity import build_opportunity_spec, closure  # noqa: E402
from core.v2_llm import OUT, V2LLM, BudgetAbort, log_result, spend_summary  # noqa: E402

CASES = json.loads((ROOT / "reports/feasibility_v2/evaluation_cases.json").read_text(encoding="utf-8"))["opportunity"]


def ensure_voice(case: dict) -> Path:
    p = ROOT / case["audio_file"]
    if not p.exists():
        import edge_tts  # free test voice; a real voice note would be noisier
        asyncio.run(edge_tts.Communicate(case["voice_script"], "en-IN-PrabhatNeural").save(str(p)))
    return p


def digits(s: str) -> str:
    return re.sub(r"\D", "", s or "")


def score(case: dict, spec, meta: dict) -> dict:
    if spec is None:
        return {"schema_valid": False, "case_pass": False}
    pred = [c.competency_id for c in spec.competency_requirements]
    must, ok_set = set(case["must_include"]), set(case["must_include"]) | set(case["acceptable"])
    recall = len(set(pred) & must) / len(must) if must else 1.0
    halluc = [p for p in pred if p not in ok_set]
    comp = spec.compensation_if_explicitly_provided
    exp = case["compensation"]
    if exp is None:
        comp_ok = comp in (None, "", "null")
    elif exp == "ANY":
        comp_ok = bool(comp)
    elif exp == "EITHER":
        comp_ok = True
    else:
        comp_ok = bool(comp) and digits(exp) in digits(comp)
    loc, eloc = spec.location_if_explicitly_provided, case["location"]
    loc_ok = (loc in (None, "", "null")) if eloc is None else bool(loc) and eloc.lower() in loc.lower()
    unc = spec.uncertainty_flags + spec.missing_information
    unc_ok = (len(unc) > 0) if case["expect_uncertainty"] else True
    body = json.dumps(spec.model_dump(exclude={"uncertainty_flags", "missing_information", "rejected_claims"}), ensure_ascii=False).lower()
    forbidden_hit = [m for m in case["forbidden_markers"] if m.lower() in body]
    flags_txt = " ".join(spec.uncertainty_flags).lower()
    flag_ok = (not case["must_flag_any"]) or any(k in flags_txt for k in case["must_flag_any"])
    model_guess = set(meta.get("model_prereq_guess") or [])
    graph_prereqs = set(closure(pred))
    passed = recall >= 0.67 and len(halluc) <= 1 and comp_ok and loc_ok and unc_ok and not forbidden_hit and flag_ok
    return {"schema_valid": True, "pred": pred, "recall": round(recall, 3), "hallucinated": halluc, "comp_pred": comp,
            "comp_ok": comp_ok, "loc_pred": loc, "loc_ok": loc_ok, "uncertainty_ok": unc_ok, "forbidden_hit": forbidden_hit,
            "flag_ok": flag_ok, "rejected_claims": spec.rejected_claims,
            "model_prereq_missing_vs_graph": sorted(graph_prereqs - model_guess),
            "model_prereq_extra_vs_graph": sorted(model_guess - graph_prereqs - set(pred)),
            "n_assessable_tasks": len(spec.assessment_criteria), "case_pass": passed}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--reps", type=int, default=2)
    ap.add_argument("--models", default="gemini-3.5-flash-lite,gemini-3.1-flash-lite,gemini-3.8-flash")
    a = ap.parse_args()
    llm = V2LLM("exp1")
    models = a.models.split(",")
    rows = []
    for model in models:
        for rep in range(a.reps):
            for case in CASES:
                kw = dict(model=model, input_type=case["input_type"], test=f"exp1_{case['id']}_r{rep}")
                if case.get("audio_file"):
                    kw.update(audio=ensure_voice(case).read_bytes(), audio_mime="audio/mpeg", reference_text=case["voice_script"])
                else:
                    kw.update(text=case["text"])
                try:
                    # repetition index salts the cache so reps are independent samples
                    from core import v2_llm
                    llm_gen = llm.generate
                    def salted(*args, _rep=rep, **k):
                        return llm_gen(*args, cache_salt=f"rep{_rep}", **k)
                    llm.generate = salted
                    spec, meta = build_opportunity_spec(llm, **kw)
                    llm.generate = llm_gen
                except BudgetAbort as e:
                    print("BUDGET ABORT:", e)
                    return 2
                sc = score(case, spec, meta)
                row = {"experiment": "exp1", "case": case["id"], "input_type": case["input_type"], "model": model, "rep": rep,
                       **{k: meta.get(k) for k in ("latency_ms", "usd", "in_tokens", "out_tokens", "thought_tokens", "cache_hit", "retries")},
                       "prompt_version": "opp-v1", **sc}
                if spec is not None:
                    (OUT / "exp1_specs").mkdir(exist_ok=True)
                    (OUT / "exp1_specs" / f"{case['id']}_{model}_r{rep}.json").write_text(spec.model_dump_json(indent=1), encoding="utf-8")
                log_result(row)
                rows.append(row)
                print(f"{model:24s} r{rep} {case['id']} pass={sc['case_pass']} recall={sc.get('recall')} halluc={sc.get('hallucinated')} "
                      f"comp={sc.get('comp_ok')} loc={sc.get('loc_ok')} flag={sc.get('flag_ok')} forb={sc.get('forbidden_hit')} "
                      f"{meta.get('latency_ms')}ms ${meta.get('usd')}", flush=True)
    summ = {}
    for model in models:
        rs = [r for r in rows if r["model"] == model]
        lat = sorted(r["latency_ms"] for r in rs if not r.get("cache_hit"))
        summ[model] = {
            "n": len(rs), "pass": sum(r["case_pass"] for r in rs), "schema_valid": sum(r["schema_valid"] for r in rs),
            "mean_recall": round(statistics.mean(r.get("recall", 0) for r in rs), 3),
            "hallucinated_total": sum(len(r.get("hallucinated", [])) for r in rs),
            "comp_errors": sum(not r.get("comp_ok", False) for r in rs),
            "loc_errors": sum(not r.get("loc_ok", False) for r in rs),
            "injection_failures": sum(bool(r.get("forbidden_hit")) or not r.get("flag_ok", True) for r in rs if r["case"] in ("opp09", "opp13", "opp10")),
            "rejected_claims_total": sum(len(r.get("rejected_claims", [])) for r in rs),
            "usd_total": round(sum(r["usd"] or 0 for r in rs), 5),
            "latency_ms_raw": lat,
            "p50_ms": lat[len(lat) // 2] if lat else None,
            "p95_ms": lat[min(len(lat) - 1, int(len(lat) * 0.95))] if len(lat) >= 20 else None,
            "failed_cases": sorted({r["case"] for r in rs if not r["case_pass"]}),
        }
    (OUT / "exp1_summary.json").write_text(json.dumps(summ, indent=1), encoding="utf-8")
    print(json.dumps({m: {k: v for k, v in s.items() if k != "latency_ms_raw"} for m, s in summ.items()}, indent=1))
    print("spend:", spend_summary())
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
