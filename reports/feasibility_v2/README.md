# ScrollProof feasibility v2

Start with **FINAL_REPORT.md** (answers + one recommended architecture), then **go_no_go.md**.

| File | Contents |
|---|---|
| baseline.md | Repo audit, build health, ledger reconciliation, what was already demonstrated |
| model_inventory.md | Models probed in this project, prices and their sources, operations exercised |
| experiment_matrix.md | Each experiment: question, method, data label, result, evidence, how to re-run |
| evaluation_cases.json | 14 hand-labelled opportunity cases with scoring rules (written before any model run) |
| results.jsonl | Every experiment row (exp1, exp3, exp5, exp7) with model, prompt version, tokens, cost, latency, cache hit |
| cost_breakdown.md | Actual v2 spend by experiment, caps, cache hits |
| failure_analysis.md | Hard-gate status, every failure found and whether it was fixed |
| unit_economics.md | Measured unit costs, declared assumptions, 3 architectures, sensitivity |
| real_device_checklist.md | Android tests, all PENDING |
| go_no_go.md | Decision + 0–5 rubric per subsystem |

## Reproduce

```bash
# engine tests (Learning Twin, policy, remix, Proof Lab, existing washer rules): free, offline
cd app && npm run test:engine && npm run sim:bandit
# LLM experiments: budget-guarded (+$2 cap, $5 lifetime), disk-cached (re-runs cost $0)
python scripts/v2_inventory.py
python scripts/v2_exp1_opportunity.py --reps 2
python scripts/v2_exp3_compiler.py --tts
python scripts/v2_unit_economics.py
# app + browser tests
cd app && npm run build && node ../scripts/v2_static_server.mjs --port 4174 [--latency 800] [--fail-media]
# learner-specific remix reel (reuses cached Veo clips)
cd app && node src/engine/exp5_plan.ts > ../outputs/feasibility_v2/exp5_reel_props.json
cd reel && npx remotion render RemixReel ../outputs/feasibility_v2/exp5_remix_reel.mp4 --props=../outputs/feasibility_v2/exp5_render_props.json
```

Generated artefacts live in `outputs/feasibility_v2/` (specs, compiled lessons, Kannada audio sample for human review, rendered remix reel, screenshots, simulation output).
