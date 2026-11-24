// Experiment 5: produce Remotion props for ONE learner-specific misconception-repair reel and time the planning step.
// Run: node src/engine/exp5_plan.ts > ../outputs/feasibility_v2/exp5_reel_props.json
import { apply, newTwin, runDiagnostic } from './learner.ts'
import { PERSONA_B, RESPOND_B } from './personas.ts'
import { planReel } from './remix.ts'
import { PERCENT } from './graph.ts'

const T0 = Date.UTC(2026, 10, 24, 9)
let twin = runDiagnostic(newTwin(PERSONA_B), RESPOND_B, T0).twin
twin = apply(twin, { id: 'b-miss-1', learnerId: twin.learnerId, at: T0 + 3_600_000, type: 'answer', conceptId: 'percent_basic', itemId: 'p_b1',
  op: 'pct_of', args: [20, 350], answer: 370, correct: false, source: 'practice' })

const N = 2000
const t0 = performance.now()
let plan = planReel(twin, T0 + 7_200_000)
for (let i = 0; i < N - 1; i++) plan = planReel(twin, T0 + 7_200_000 + i)
const perPlanMs = (performance.now() - t0) / N
plan = planReel(twin, T0 + 7_200_000)!
const mis = PERCENT.misconceptions.find((m) => m.id === plan!.pub.misconception_id)!
const props = {
  _label: 'Learner-specific reel for FICTIONAL persona B (synthetic). Answer is deliberately NOT included in the reel.',
  learnerLabel: 'Persona B (fictional)',
  hook: plan.pub.hook,
  wrong: mis.example_wrong,
  repairTitle: 'Percent OF = multiply, then ÷ 100',
  repairWrong: '350 + 20 = 370 ✗',
  repairRight: '350 × 20 ÷ 100 = 70 ✓',
  question: plan.pub.recall_question,
  reel_public: plan.pub,
  answer_key_kept_server_side: { reel_id: plan.key.reel_id, example_signature: plan.key.example_signature },
  timing: { plan_ms_mean_over_2000: +perPlanMs.toFixed(4), ai_calls: 0 },
}
console.log(JSON.stringify(props, null, 1))
