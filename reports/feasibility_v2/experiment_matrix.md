# Experiment matrix

Data labels: **MEASURED** (ran here, numbers from logs) · **SYNTHETIC** (fictional personas / simulated learners) · **UNVERIFIED** (needs a human) · **PENDING** (needs a real device).

| # | Question | Method | Data | Status | Headline result | Evidence |
|---|---|---|---|---|---|---|
| 1 | Can messy job text become structured, assessable competencies? | 14 hand-labelled cases (6 input types incl. Kannada script, voice, injection, scam) × 3 models × 2 reps = 84 runs; closed competency vocabulary; evidence quotes verified against source; deterministic scoring | MEASURED | Done | Pass 19/28 (3.5 Flash-Lite), 22/28 (3.1 Flash-Lite), 24/28 (3.8 Flash). 0 invented pay/location/employer, 0 injection successes, scam flagged 6/6. Failures are under-extraction on WhatsApp shorthand. | `core/opportunity.py`, `scripts/v2_exp1_opportunity.py`, `outputs/feasibility_v2/exp1_summary.json`, `exp1_specs/` |
| 2 | Do different people get materially different paths? | Event-sourced Learning Twin, Beta mastery + uncertainty, adaptive diagnostic over curated graph; 3 fictional personas; 7 scenario tests | SYNTHETIC | Done | Paths differ for diagnosed reasons: A `fractions→percent`, B `percent→commission` (misconception flagged), C skips percentages → `sheet formulas→sheet % formula`. All 7 scenarios pass. | `app/src/engine/learner.ts`, `learner.test.ts` |
| 3 | Can one verified concept compile into several accurate modes? | Hand-authored ConceptSpec; LLM compiles course/reading/audio(en+kn) with every number as {op,args}; code recomputes; 2 models × 9 calls; interactive + practical modes are deterministic code | MEASURED (numbers) / UNVERIFIED (prose, Kannada) | Done | 64/64 exercise answers recompute correctly; 0 invented worked-example ids; Kannada keeps the same numbers 8/8. Only 2 prose claims were machine-checkable. | `core/compiler.py`, `exp3_outputs/`, app `#/learn` |
| 4 | Can we pick interventions from evidence? | Deterministic explainable policy (R1–R7) + guarded Thompson bandit (modality only, min 30 outcomes/arm) + offline simulation | MEASURED (policy tests) / SYNTHETIC (bandit sim) | Done | Policy tests pass. Simulation: a per-learner bandit beats a fixed default only after ~100–500 interactions; with 5–20 it identifies the best modality 33–46% of the time (chance 25%). | `policy.ts`, `sim_bandit.ts`, `exp4_sim.json`, `adaptation_measurement_plan` in FINAL_REPORT |
| 5 | Personalised revision reels without per-learner video? | Deterministic reel planner on the learner twin; cached Veo clips; in-feed answer; Remotion render of one learner-specific reel | MEASURED | Done | Plan 0.02 ms, 0 AI calls; reel spec 462 B JSON + cached clips 135–445 KB (once). Server-rendered MP4 alternative: 72 s render, 6.8 MB per 10 s reel. Optional TTS hook $0.0015. | `remix.ts`, `remix.test.ts`, `exp5_remix_reel.mp4`, screenshot `exp7_remix_reel_in_feed_390x844.png` |
| 6 | Practical competence vs quiz recognition? | Seeded unseen payout-sheet variants, deterministic per-cell grading, misconception notes, copy detection, separated evidence levels, audit log, consent-gated minimised employer view | MEASURED (unit tests) | Done | 11 adversarial tests pass incl. copied answers, ambiguous input, AI-cannot-override, replacement revokes approval, no-consent denial, data minimisation. Identity verification not implemented (always `not_verified`). | `proof.ts`, `proof.test.ts`, `domain.test.ts` |
| 7 | Does it hold up as a product? | Desktop Chrome; 390×844 iframe harness; axe-core; fault-injecting server (latency, media 404); real offline (server killed) | MEASURED (desktop Chrome) / PENDING (devices) | Done | axe 0 violations on 7 screens (after fixing 2 critical on feed); offline reload + lesson + work order pass; cold first render 2.0 s / offline-ready 7.3 s at 800 ms latency; px-fixed headings ignore text scaling. | `results.jsonl` (exp7 rows), `real_device_checklist.md` |
| 8 | Is it affordable? | Measured unit costs × declared assumptions; 3 architectures; cache-hit sensitivity | MEASURED units / PROJECTED totals | Done | Per learner/month at 50% cache: A $3.94, B $0.34, C $0.006. | `unit_economics.md`, `scripts/v2_unit_economics.py` |

## Test inventory (re-runnable)

| Suite | Command | Count |
|---|---|---|
| Engine + existing domain rules | `cd app && npm run test:engine` | 35 tests, 35 pass |
| Bandit simulation (synthetic) | `cd app && npm run sim:bandit` | 8 settings × 4 policies |
| Opportunity eval | `python scripts/v2_exp1_opportunity.py --reps 2` | 84 runs (cached reruns cost $0) |
| Compiler eval | `python scripts/v2_exp3_compiler.py --tts` | 18 compiles + 1 TTS sample (cached) |
| Economics | `python scripts/v2_unit_economics.py` | regenerates unit_economics.md + cost_breakdown.md |
