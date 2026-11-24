// Experiment 4 — OFFLINE SYNTHETIC simulation of bandit mechanics. NOT evidence about real learners.
// Question: with realistic effect sizes, how many interactions does a bandit need to find a learner's best modality?
// Run: node src/engine/sim_bandit.ts > ../outputs/feasibility_v2/exp4_sim.json
import { betaSample } from './policy.ts'
import { rng } from './graph.ts'

type Arm = 'text' | 'audio' | 'interactive' | 'worked_example'
const ARMS: Arm[] = ['text', 'audio', 'interactive', 'worked_example']
// Assumed population success rates on a LATER equivalent item (synthetic; worked examples slightly better on average).
const POP: Record<Arm, number> = { text: 0.55, audio: 0.53, interactive: 0.58, worked_example: 0.62 }

function learners(n: number, indivSd: number, r: () => number) {
  const gauss = () => Math.sqrt(-2 * Math.log(r() || 1e-12)) * Math.cos(2 * Math.PI * r())
  return Array.from({ length: n }, () => Object.fromEntries(ARMS.map((a) => [a, Math.min(0.95, Math.max(0.05, POP[a] + indivSd * gauss()))])) as Record<Arm, number>)
}

function runPolicy(kind: 'fixed' | 'random' | 'pooled_ts' | 'individual_ts', people: Record<Arm, number>[], T: number, seed: number) {
  const r = rng(seed)
  const pooled: Record<Arm, [number, number]> = Object.fromEntries(ARMS.map((a) => [a, [1, 1]])) as never
  let reward = 0, oracle = 0
  let identified = 0
  for (const p of people) {
    const indiv: Record<Arm, [number, number]> = Object.fromEntries(ARMS.map((a) => [a, [1, 1]])) as never
    const best = ARMS.reduce((x, y) => (p[y] > p[x] ? y : x))
    for (let t = 0; t < T; t++) {
      let arm: Arm
      if (kind === 'fixed') arm = 'worked_example'
      else if (kind === 'random') arm = ARMS[Math.floor(r() * 4)]
      else {
        const post = kind === 'pooled_ts' ? pooled : indiv
        arm = ARMS.reduce((x, y) => (betaSample(post[y][0], post[y][1], r) > betaSample(post[x][0], post[x][1], r) ? y : x))
      }
      const ok = r() < p[arm] ? 1 : 0
      reward += ok; oracle += p[best]
      pooled[arm][ok ? 0 : 1]++; indiv[arm][ok ? 0 : 1]++
    }
    const meanOf = (a: Arm) => indiv[a][0] / (indiv[a][0] + indiv[a][1])
    if (kind === 'individual_ts' && ARMS.reduce((x, y) => (meanOf(y) > meanOf(x) ? y : x)) === best) identified++
  }
  const n = people.length * T
  return { policy: kind, mean_reward: +(reward / n).toFixed(4), oracle_mean: +(oracle / n).toFixed(4), regret_per_step: +((oracle - reward) / n).toFixed(4),
    individual_best_identified: kind === 'individual_ts' ? +(identified / people.length).toFixed(3) : null }
}

const out: Record<string, unknown> = {
  label: 'SYNTHETIC SIMULATION — mechanics only, not learner evidence',
  assumptions: { population_success_rates: POP, reward: 'correct on a later equivalent assessment', learners: 400 },
  results: [] as unknown[],
}
for (const indivSd of [0.03, 0.1]) {
  const people = learners(400, indivSd, rng(7))
  for (const T of [5, 20, 100, 500]) {
    const row: Record<string, unknown> = { individual_sd: indivSd, interactions_per_learner: T }
    for (const k of ['fixed', 'random', 'pooled_ts', 'individual_ts'] as const) row[k] = runPolicy(k, T >= 500 ? people.slice(0, 80) : people, T, 11)
    ;(out.results as unknown[]).push(row)
  }
}
console.log(JSON.stringify(out, null, 1))
