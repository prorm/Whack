"""Experiment 8: unit economics from MEASURED ledger costs + explicitly ASSUMED scale variables.

Writes reports/feasibility_v2/unit_economics.md and cost_breakdown.md. Re-run after changing ASSUMPTIONS.
"""
from __future__ import annotations

import json
import statistics
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from core.v2_llm import CACHE_LOG, ledger_rows, spend_summary  # noqa: E402

R = ROOT / "reports" / "feasibility_v2"
results = [json.loads(l) for l in (R / "results.jsonl").read_text(encoding="utf-8").splitlines() if l.strip()]
rows = ledger_rows()
v2 = [r for r in rows if str(r["run_id"]).startswith("v2-")]

# ---------------------------------------------------------------- MEASURED unit costs (USD) from the ledger / results
def mean(xs):
    xs = [x for x in xs if x is not None]
    return statistics.mean(xs) if xs else None

exp1 = [r for r in results if r.get("experiment") == "exp1" and not r.get("cache_hit")]
exp3 = [r for r in results if r.get("experiment") == "exp3" and not r.get("cache_hit")]
M = {
    "opportunity_spec_flash_lite": mean([r["usd"] for r in exp1 if r["model"] == "gemini-3.5-flash-lite"]),
    "opportunity_spec_3_1_lite": mean([r["usd"] for r in exp1 if r["model"] == "gemini-3.1-flash-lite"]),
    "opportunity_spec_3_8_flash": mean([r["usd"] for r in exp1 if r["model"] == "gemini-3.8-flash"]),
    "concept_compile_9_calls_flash_lite": sum(r["usd"] for r in exp3 if r["model"] == "gemini-3.5-flash-lite"),
    "concept_compile_9_calls_3_8_flash": sum(r["usd"] for r in exp3 if r["model"] == "gemini-3.8-flash"),
    "tts_line_5_8s": next((r["usd"] for r in results if r.get("step") == "tts_hook"), None),
    "storyboard_llm_per_reel_v1": 0.0068,      # measured in v1 report (gemini-3.5-flash-lite, 3 reels)
    "veo_lite_4s_silent": 0.12,               # measured in v1 ledger (3 clips)
    "image_edit": 0.034,                      # measured in v1 ledger
    "reel_plan_deterministic": 0.0,           # measured: 0 AI calls, 0.02 ms
}
m5 = next(r for r in results if r.get("step") == "measurements")
BYTES = {"reel_spec_json": m5["reel_spec_json_bytes"], "server_rendered_mp4_10s": m5["server_render"]["mp4_bytes"],
         "cached_clips_total": sum(m5["cached_video_bytes_each"].values()), "precache_total": 1_499_865,
         "render_seconds_per_10s_reel": m5["server_render"]["render_ms"] / 1000}

# ---------------------------------------------------------------- ASSUMED variables (not measured; change freely)
A = {
    "reel_impressions_per_learner_month": 60,
    "lessons_per_learner_month": 8,
    "assessments_per_learner_month": 4,
    "opportunity_specs_per_learner_month": 1,       # each job parse is shared across learners viewing it; worst case 1/learner
    "concepts_in_catalogue": 50,                     # shared one-time compile
    "reusable_veo_plates": 20,
    "character_images": 10,
    "bandwidth_usd_per_gb": 0.08,                    # ASSUMED CDN egress price
    "render_cpu_usd_per_hour": 0.05,                 # ASSUMED vCPU-hour price for server-side Remotion
    "render_vcpus": 2,
    "infra_flat_usd_month": {100: 10, 1000: 40, 10000: 250},  # ASSUMED hosting/DB/monitoring
    "tts_share_of_reels_arch_c": 0.0,                # Arch C default: captions only (TTS optional)
    "llm_feedback_per_assessment_usd": M["opportunity_spec_flash_lite"],  # ~1 flash-lite call, advisory only
}
GB = 1024 ** 3


def per_learner(arch: str, cache_hit: float) -> dict:
    n = A["reel_impressions_per_learner_month"]
    bw = lambda b: b / GB * A["bandwidth_usd_per_gb"]  # noqa: E731
    assess = A["assessments_per_learner_month"] * A["llm_feedback_per_assessment_usd"]
    opp = A["opportunity_specs_per_learner_month"] * M["opportunity_spec_flash_lite"]
    if arch == "A":  # fresh AI media per learner reel
        unique = n * (1 - cache_hit)
        gen = unique * (M["veo_lite_4s_silent"] + M["storyboard_llm_per_reel_v1"] + M["tts_line_5_8s"])
        render = unique * BYTES["render_seconds_per_10s_reel"] / 3600 * A["render_vcpus"] * A["render_cpu_usd_per_hour"]
        band = n * bw(BYTES["server_rendered_mp4_10s"])
        return {"content": gen, "render": render, "bandwidth": band, "assessment": assess, "opportunity": opp}
    if arch == "B":  # shared lessons + personalised LLM text + TTS audio per reel (server-rendered mp4)
        unique = n * (1 - cache_hit)
        gen = unique * (M["storyboard_llm_per_reel_v1"] + M["tts_line_5_8s"])
        render = unique * BYTES["render_seconds_per_10s_reel"] / 3600 * A["render_vcpus"] * A["render_cpu_usd_per_hour"]
        band = n * bw(BYTES["server_rendered_mp4_10s"])
        return {"content": gen, "render": render, "bandwidth": band, "assessment": assess, "opportunity": opp}
    # C: cached media templates + deterministic on-device overlays (no AI per reel)
    tts = n * A["tts_share_of_reels_arch_c"] * (1 - cache_hit) * M["tts_line_5_8s"]
    band = bw(BYTES["precache_total"]) + n * bw(BYTES["reel_spec_json"])
    return {"content": tts, "render": 0.0, "bandwidth": band, "assessment": assess, "opportunity": opp}


one_time = {
    "concept compile (all modes, 3.8 Flash) x concepts": A["concepts_in_catalogue"] * M["concept_compile_9_calls_3_8_flash"],
    "reusable Veo Lite plates": A["reusable_veo_plates"] * M["veo_lite_4s_silent"],
    "character images": A["character_images"] * M["image_edit"],
}

L = ["# Unit economics (Experiment 8)", "",
     "**Measured** = from `reports/cost_log.jsonl` / `results.jsonl` in this project. **Assumed** = a declared planning variable, not a measurement.",
     "Provider prices come from `config/models.json`; entries marked `assumed` there were never verified against a price sheet.", "",
     "## Measured unit costs", "", "| Operation | USD | Source |", "|---|---|---|"]
for k, v in M.items():
    L.append(f"| {k} | {v:.5f} | measured |" if v is not None else f"| {k} | n/a | |")
L += ["", "## Measured payload sizes", "", "| Item | Bytes |", "|---|---|"] + [f"| {k} | {v:,} |" for k, v in BYTES.items()]
L += ["", "## Assumptions (edit and re-run)", "", "```json", json.dumps(A, indent=1), "```", "",
      "## One-time shared generation (catalogue)", "", "| Item | USD |", "|---|---|"] + [f"| {k} | {v:.2f} |" for k, v in one_time.items()]
L.append(f"| **Total one-time** | **{sum(one_time.values()):.2f}** |")
L += ["", "## Per-learner monthly cost by architecture (projection)", "",
      "| Architecture | Cache hit | Content gen | Render | Bandwidth | Assessment | Opportunity | **Total / learner / month** |", "|---|---|---|---|---|---|---|---|"]
for arch, name in (("A", "A: fresh AI media per learner"), ("B", "B: shared lessons + personalised text/TTS (server mp4)"), ("C", "C: cached media + dynamic overlays")):
    for h in (0.1, 0.5, 0.9):
        c = per_learner(arch, h)
        L.append(f"| {name} | {h:.0%} | {c['content']:.4f} | {c['render']:.4f} | {c['bandwidth']:.4f} | {c['assessment']:.4f} | {c['opportunity']:.4f} | **{sum(c.values()):.4f}** |")
L += ["", "## Monthly totals at scale (projection, 50% cache hit, incl. assumed infra)", "", "| MAU | A | B | C |", "|---|---|---|---|"]
for mau in (100, 1000, 10000):
    infra = A["infra_flat_usd_month"][mau]
    vals = [mau * sum(per_learner(a, 0.5).values()) + infra for a in "ABC"]
    L.append(f"| {mau:,} | ${vals[0]:,.0f} | ${vals[1]:,.0f} | ${vals[2]:,.0f} |")
L += ["", "Infra overhead is an assumed flat figure per tier (see assumptions). One-time catalogue cost is excluded from monthly rows.", "",
      "## Sensitivity: cache hit 10% vs 90% (per learner / month)", ""]
for arch in "ABC":
    lo, hi = sum(per_learner(arch, 0.1).values()), sum(per_learner(arch, 0.9).values())
    L.append(f"- {arch}: ${lo:.4f} at 10% -> ${hi:.4f} at 90% ({lo / hi if hi else float('inf'):.1f}x)")
L += ["", "## Reading this honestly", "",
      "- The dominant cost driver in A is the Veo clip per reel; in B it is server rendering + MP4 bandwidth, not the LLM text; in C it is the one-time precache download.",
      "- C's per-learner AI cost is ~0 because reels are planned deterministically on device; the trade-off is less variety (limited to template x concept combinations).",
      "- None of these numbers include human trainer review time, which is the real per-credential cost (not measured here).",
      "- These are projections from measured unit costs and assumed usage; they are not production measurements."]
(R / "unit_economics.md").write_text("\n".join(L) + "\n", encoding="utf-8")

# ---------------------------------------------------------------- cost breakdown (actual spend)
by = defaultdict(lambda: {"calls": 0, "usd": 0.0, "failed": 0})
for r in v2:
    key = r["test"].split("_")[0]
    by[key]["calls"] += 1
    by[key]["usd"] += r["usd"]
    by[key]["failed"] += 0 if r["ok"] else 1
most = max(v2, key=lambda r: r["usd"]) if v2 else None
cache_hits = len(CACHE_LOG.read_text(encoding="utf-8").splitlines()) if CACHE_LOG.exists() else 0
sp = spend_summary()
C = ["# Cost breakdown (feasibility v2)", "",
     f"- Pre-v2 ledger spend: **${sp['pre_v2_ledger']:.4f}** (brief reported $0.62; the conservative figure ${sp['pre_v2_conservative']:.2f} is used for cap checks).",
     f"- v2 incremental spend (measured, all metered Vertex calls): **${sp['v2']:.4f}** of the $2.00 v2 cap.",
     f"- Lifetime (conservative): **${sp['lifetime_conservative']:.4f}** of the $5.00 cap.",
     f"- Cache hits (served from disk, $0, not in ledger): **{cache_hits}**.",
     "- Claude Code subscription usage is NOT in this ledger (not a Vertex cost).", "",
     "| Experiment / prefix | Calls | Failed | USD |", "|---|---|---|---|"]
for k, v in sorted(by.items(), key=lambda kv: -kv[1]["usd"]):
    C.append(f"| {k} | {v['calls']} | {v['failed']} | {v['usd']:.4f} |")
if most:
    C += ["", f"Most expensive single v2 call: `{most['test']}` on `{most['model']}` at ${most['usd']:.5f}.",
          "Most expensive operation in the project overall: a 4 s Veo 3.1 Lite clip ($0.12 silent, measured in v1). No Veo was generated in v2."]
(R / "cost_breakdown.md").write_text("\n".join(C) + "\n", encoding="utf-8")
print("\n".join(L[-20:]))
print(json.dumps(sp))
