// FLUX Learn curriculum: the narration says the same numbers physics.ts computes, goals are reachable,
// training problems are fresh and solvable, and the project has more than one right design.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { COURSE, GOALS, LESSONS, LINES, SPOKEN, trainSet, near } from './course.ts'
import { checkRoof, ROOFTOP } from '../assess.ts'

const VO = JSON.parse(readFileSync(new URL('./vo.json', import.meta.url), 'utf8')) as { durations: Record<string, number> }

test('every narrated line exists, has recorded audio, and every lesson teaches before it tests', () => {
  for (const l of LESSONS) {
    for (const s of l.steps) {
      const lines = s.kind === 'play' ? [s.line, s.success] : s.kind === 'say' || s.kind === 'predict' ? [s.line] : []
      for (const id of lines) { assert.ok(LINES[id], `${l.id}: line ${id}`); assert.ok(VO.durations[id] > 1, `${id} has audio`) }
    }
    const firstTest = l.steps.findIndex((s) => ['check', 'choice', 'train', 'guided'].includes(s.kind))
    const firstTeach = l.steps.findIndex((s) => s.kind === 'say')
    assert.ok(firstTeach === 0, `${l.id} opens by teaching`)
    if (firstTest >= 0) assert.ok(firstTest > firstTeach, `${l.id} teaches before testing`)
  }
  assert.equal(LESSONS[0].kicker, 'Absolute basics')
  assert.equal(COURSE.job, 'job-solar-apprentice')
})

test('the narration speaks the numbers physics.ts computes', () => {
  const said = (id: string, ...words: string[]) => words.forEach((w) => assert.match(LINES[id].toLowerCase(), new RegExp(w), `${id} says ${w}`))
  assert.equal(Math.round(SPOKEN.panelWatts / 10) * 10, 540); said('l1_06', 'five hundred and forty')
  assert.equal(Math.round(SPOKEN.eightSeries / 10) * 10, 330); said('l2_07', 'three hundred and thirty')
  assert.equal(Math.round(SPOKEN.crossTemp), 22); said('l3_04', 'twenty-two')
  assert.equal(SPOKEN.riseBy, 4.6); said('l3_06', 'four point six')
  assert.equal(SPOKEN.vocCold, 51.9); said('l3_06', 'fifty-one point nine'); said('l4_05', 'fifty-one point nine')
  assert.equal(SPOKEN.ratio, 11.57); said('l4_05', 'eleven point five seven')
  assert.equal(SPOKEN.max, 11); said('l4_05', 'eleven\\.')
  assert.equal(Math.round(SPOKEN.vmpHot), 35); said('l4_06', 'thirty-five')
  assert.equal(SPOKEN.minRatio, 3.4); said('l4_06', 'three point four')
  assert.equal(SPOKEN.min, 4); said('l4_06', 'four panels')
})

test('experiment goals are reachable from the sliders, and not met at the start', () => {
  for (const l of LESSONS) for (const s of l.steps) {
    if (s.kind !== 'play' || s.control.kind !== 'sliders') continue
    const goal = GOALS[s.control.goal as keyof typeof GOALS]
    const start = Object.fromEntries(s.control.sliders.map((x) => [x.id, x.start]))
    assert.equal(goal(start), false, `${s.line} is not solved at the start`)
    // brute-force the slider grid: at least one setting meets the goal
    const [a, b] = s.control.sliders
    let ok = false
    for (let x = a.min; x <= a.max + 1e-9 && !ok; x += a.step) {
      if (!b) { ok = goal({ [a.id]: x }); continue }
      for (let y = b.min; y <= b.max + 1e-9 && !ok; y += b.step) ok = goal({ [a.id]: x, [b.id]: y })
    }
    assert.ok(ok, `${s.line} goal is reachable`)
  }
})

test('training sets are seeded, fresh across seeds, and their own answers pass', () => {
  for (const g of ['series', 'voc', 'window'] as const) {
    assert.deepEqual(trainSet(g, 5, 3), trainSet(g, 5, 3))
    const qs = new Set(Array.from({ length: 10 }, (_, i) => trainSet(g, 1000 + i * 977, 3).map((p) => p.q).join('|')))
    assert.ok(qs.size > 6, `${g} sets vary`)
    for (const p of trainSet(g, 42, 3)) { assert.ok(near(String(p.answer), p.answer, p.tol)); assert.ok(!near('0', p.answer, p.tol)) }
  }
})

test('project: several valid designs, and each wrong one names the failing check', () => {
  const valid: string[] = []
  for (let inv = 0; inv < ROOFTOP.inverters.length; inv++) for (let s = 1; s <= 3; s++) for (let per = 1; per <= 16; per++)
    if (checkRoof(inv, s, per).every((c) => c.ok)) valid.push(`${inv}:${s}x${per}`)
  assert.deepEqual(valid.sort(), ['1:1x14', '1:2x7'])
  assert.equal(checkRoof(0, 2, 7).find((c) => !c.ok)!.id, 'size', '5 kW inverter is too small for 7.56 kW')
  assert.ok(checkRoof(1, 1, 13).some((c) => c.id === 'count' && !c.ok))
})
