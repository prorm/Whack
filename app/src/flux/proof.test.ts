// Learner-to-employer core: competency graph, assessments, passport, consent, matching and the goal feed.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { ASK_COMPETENCY, grade, makeTask, outcomes, evTask } from './assess.ts'
import { CHECKLIST, attachReview, grant, intact, levelOf, makeRecord, openMisconceptions, revoke, statusOf, visibleTo, type EvidenceRecord } from './passport.ts'
import { COMPETENCIES, SEED_JOBS, byId, depth, matchJob, needsSupervision, type CompetencyId } from './skills.ts'
import { rankForGoal, type GoalReel } from './goal.ts'
import { emptyMemory, review } from './memory.ts'
import type { Blueprint } from './blueprint.ts'

const EV = JSON.parse(readFileSync(new URL('./blueprints/ev_charger.json', import.meta.url), 'utf8')) as Blueprint
const T0 = Date.UTC(2026, 10, 24, 10)
const right = (id: string, seed: number) => { const t = makeTask(id, seed, EV); return { t, a: Object.fromEntries(t.asks.map((x) => [x.id, String(t.key[x.id])])) } }
const allChecks = Object.fromEntries(CHECKLIST.map((c) => [c.id, true])) as Record<(typeof CHECKLIST)[number]['id'], boolean>
const status = (rs: EvidenceRecord[]) => (c: CompetencyId) => statusOf(rs, c)

test('graph: prerequisites exist, no cycles, every assessment maps its asks to competencies', () => {
  for (const c of COMPETENCIES) { for (const p of c.prereqs) assert.ok(byId(p), `${c.id} → ${p}`); assert.doesNotThrow(() => depth(c.id)) }
  for (const c of COMPETENCIES.filter((x) => x.assessment)) {
    const map = ASK_COMPETENCY[c.assessment!.id]
    assert.ok(map && Object.values(map).includes(c.id), `${c.assessment!.id} evidences ${c.id}`)
  }
  assert.equal(byId('site.safety').assessment, null, 'safety cannot be proven in the app')
  for (const j of SEED_JOBS) { assert.equal(j.demo, true); for (const r of j.requires) assert.ok(byId(r)) }
})

test('assessments are seeded and deterministic, and differ across seeds', () => {
  for (const id of ['quick.series', 'wo.solar-string', 'wo.ev-load', 'quick.idempotency', 'quick.backoff']) {
    assert.deepEqual(makeTask(id, 77, EV), makeTask(id, 77, EV))
    const labels = new Set(Array.from({ length: 12 }, (_, i) => JSON.stringify(makeTask(id, (100 + i) * 7919, EV).key)))
    assert.ok(labels.size > 3, `${id} varies with the seed`)
  }
  for (let s = 1; s < 60; s++) { const t = makeTask('quick.backoff', s); assert.equal(t.key.late, t.key._cap, 'late retry always hits the cap') }
})

test('graders pass right answers and name known wrong methods', () => {
  for (let s = 1; s < 40; s++) {
    for (const id of ['quick.series', 'wo.solar-string', 'wo.ev-load', 'quick.idempotency', 'quick.backoff']) {
      const { t, a } = right(id, s)
      assert.equal(grade(t, a).pass, true, `${id} seed ${s}`)
    }
  }
  const s = makeTask('quick.series', 5)
  const swapped = grade(s, { aV: String(s.key._aWrong), bI: String(s.key._bWrong) })
  assert.equal(swapped.pass, false); assert.equal(swapped.misconceptions.aV, 'swapped_rule')
  const w = makeTask('quick.idempotency', 9)
  assert.equal(grade(w, { credits: String(w.key._naiveCredits), total: String(w.key._naiveTotal) }).misconceptions.total, 'no_dedupe')
  const b = makeTask('quick.backoff', 3)
  assert.equal(grade(b, { early: String(b.key.early), late: String(b.key._base * 2 ** (b.key._k2 - 1)) }).misconceptions.late, 'ignored_cap')
  assert.equal(grade(s, { aV: 'banana', bI: '' }).pass, false, 'garbage never passes')
})

test('solar work order grades each competency separately', () => {
  const t = makeTask('wo.solar-string', 42)
  const o = outcomes(t, grade(t, { max: String(t.key.max), min: String(t.key.min - 1) }))
  assert.equal(o['solar.cold-max'].pass, true)
  assert.equal(o['solar.mppt-min'].pass, false)
})

test('no false awards: nothing but a passed, intact, current-version record evidences a competency', () => {
  assert.equal(statusOf([], 'solar.series').state, 'not_started')
  // reels and memory do not touch the passport
  let m = emptyMemory(); for (let i = 0; i < 20; i++) m = review(m, 'series', true, T0 + i, 's1', 'r')
  assert.equal(statusOf([], 'solar.series').state, 'not_started')
  const t = makeTask('quick.series', 3)
  const fail = makeRecord(t, { aV: '1', bI: '1' }, T0, 'att-1')
  assert.equal(statusOf([fail], 'solar.series').state, 'failed')
  const pass = makeRecord(t, { aV: String(t.key.aV), bI: String(t.key.bI) }, T0 + 1, 'att-2')
  assert.equal(statusOf([fail, pass], 'solar.series').state, 'evidenced')
  assert.equal(levelOf(pass, 'solar.series'), 'system_assessed')
  // tampering with the response after grading breaks the fingerprint
  const forged = { ...fail, outcomes: { 'solar.series': { pass: true, misconceptions: [] } } } as EvidenceRecord
  assert.equal(intact(forged), false)
  assert.equal(statusOf([forged], 'solar.series').state, 'failed')
  // in-person competencies are never evidenced
  assert.equal(matchJob(SEED_JOBS[0], status([pass])).rows.find((r) => r.id === 'site.safety')!.state, 'in_person')
})

test('assessment versioning: a record graded on an older version stops counting', () => {
  const { t, a } = right('quick.series', 8)
  const old = makeRecord({ ...t, version: 0 }, a, T0, 'att-old')
  assert.equal(statusOf([old], 'solar.series').state, 'failed')
  assert.match(statusOf([old], 'solar.series').note!, /version/)
})

test('trainer review binds to the exact attempt and fingerprint; a new attempt detaches it', () => {
  const { t, a } = right('wo.solar-string', 11)
  const rec = makeRecord(t, a, T0, 'att-a')
  assert.throws(() => attachReview(rec, { reviewer: 'Demo trainer', demo: true, decision: 'approved', checklist: { ...allChecks, working: false }, at: T0 }), /four/)
  const reviewed = attachReview(rec, { reviewer: 'Demo trainer', demo: true, decision: 'approved', checklist: allChecks, at: T0 })
  assert.equal(levelOf(reviewed, 'solar.cold-max'), 'trainer_reviewed')
  // review copied onto a different attempt does not count
  const other = makeRecord(t, a, T0 + 5, 'att-b')
  assert.equal(levelOf({ ...other, review: reviewed.review }, 'solar.cold-max'), 'system_assessed')
  // newer attempt is the current one
  assert.equal(statusOf([reviewed, other], 'solar.cold-max').level, 'system_assessed')
  const failed = makeRecord(makeTask('wo.solar-string', 12), { max: '1', min: '1' }, T0, 'att-c')
  assert.throws(() => attachReview(failed, { reviewer: 'x', demo: true, decision: 'approved', checklist: allChecks, at: T0 }), /passed/)
})

test('consent: employers see only records shared with them, until revoked', () => {
  const { t, a } = right('quick.idempotency', 4)
  const r1 = makeRecord(t, a, T0, 'att-1'), r2 = makeRecord(t, a, T0 + 1, 'att-2')
  let shares = grant([], { id: 'sh-1', employerId: 'emp-a', recordIds: ['att-1'], at: T0 })
  assert.deepEqual(visibleTo('emp-a', [r1, r2], shares).map((r) => r.id), ['att-1'])
  assert.deepEqual(visibleTo('emp-b', [r1, r2], shares), [])
  shares = revoke(shares, 'sh-1', T0 + 9)
  assert.deepEqual(visibleTo('emp-a', [r1, r2], shares), [])
  assert.throws(() => grant([], { id: 'x', employerId: 'emp-a', recordIds: [], at: T0 }))
})

test('matching: explicit rows, eligibility flips after assessment, hazardous work stays supervised', () => {
  const solar = SEED_JOBS.find((j) => j.id === 'job-solar-apprentice')!
  let recs: EvidenceRecord[] = []
  let m = matchJob(solar, status(recs))
  assert.equal(m.eligible, false); assert.equal(m.need, 4); assert.equal(m.next, 'solar.series', 'foundation first')
  const s = right('quick.series', 1), w = right('wo.solar-string', 2)
  recs = [makeRecord(s.t, s.a, T0, 'a1')]
  m = matchJob(solar, status(recs)); assert.equal(m.have, 1); assert.equal(m.eligible, false)
  recs.push(makeRecord(w.t, w.a, T0 + 1, 'a2'))
  m = matchJob(solar, status(recs)); assert.equal(m.have, 3); assert.equal(m.next, 'solar.design', 'the project is the last gap')
  // the project: an oversized design fails, a valid design passes
  const roof = makeTask('proj.rooftop', 1)
  assert.equal(statusOf([makeRecord(roof, { inv: '0', strings: '2', per: '7' }, T0 + 2, 'pj0')], 'solar.design').state, 'failed')
  recs.push(makeRecord(roof, { inv: '1', strings: '2', per: '7' }, T0 + 3, 'pj1', 'live', 'Two strings of seven on the 10 kW inverter.'))
  m = matchJob(solar, status(recs))
  assert.equal(m.eligible, true)
  assert.match(m.outcome, /supervised practical/i)
  assert.equal(needsSupervision({ requires: ['ev.load'], supervised: false }), true, 'employer cannot untick supervision for hazardous work')
  const pay = SEED_JOBS.find((j) => j.id === 'job-payments-support')!
  const i = right('quick.idempotency', 5), b = right('quick.backoff', 6)
  assert.match(matchJob(pay, status([makeRecord(i.t, i.a, T0, 'p1'), makeRecord(b.t, b.a, T0, 'p2')])).outcome, /interview shortlist/)
  // a failed retake after a pass removes eligibility
  const bad = makeRecord(s.t, { aV: '0', bI: '0' }, T0 + 50, 'a3')
  assert.equal(matchJob(solar, status([...recs, bad])).eligible, false)
})

const REELS: GoalReel[] = [
  { id: 'c-cold', concept: 'cold', kind: 'choice', fixes: ['sign_flip'] },
  { id: 'm-cold', concept: 'cold', kind: 'motion', fixes: ['used_stc'] },
  { id: 'c-max', concept: 'maxstring', kind: 'bubbles', fixes: ['rounded_up'] },
  { id: 'm-hose', concept: 'series', kind: 'motion' },
  { id: 'c-series', concept: 'series', kind: 'choice' },
  { id: 'm-heat', concept: 'minstring', kind: 'motion' },
  { id: 'spot', concept: 'safety', kind: 'spot' },
  { id: 'cb-series', concept: 'series', kind: 'choice', callback: true },
  { id: 'pay', concept: 'idem', kind: 'choice' },
]
const solarJob = SEED_JOBS[0]

test('goal feed: deterministic, foundations first, intuition first, proof slot after each gap, nothing off-goal', () => {
  const a = rankForGoal(REELS, solarJob, [], emptyMemory(), 's1', T0)
  assert.deepEqual(a, rankForGoal(REELS, solarJob, [], emptyMemory(), 's1', T0))
  const seq = a.map((x) => x.type === 'reel' ? x.reel.id : `PROOF:${x.competency}`)
  assert.deepEqual(seq.slice(0, 3), ['m-hose', 'c-series', 'PROOF:solar.series'])
  assert.ok(seq.indexOf('m-cold') < seq.indexOf('c-cold'), 'motion intuition reel before the drill')
  assert.ok(!seq.includes('pay'), 'payments reels are not in the solar goal')
  assert.ok(!seq.includes('cb-series'), 'callbacks only after a miss in an earlier session')
  assert.equal((a.find((x) => x.type === 'reel' && x.reel.id === 'spot') as { tag: string }).tag, 'prepare')
  assert.match((a[0] as { why: string }).why, /Foundation for/)
})

test('goal feed: rematch only from an earlier session; repair from a failed attempt; proven skills leave the gap list', () => {
  const m = review(emptyMemory(), 'series', false, T0, 's1', 'c-series')
  assert.notEqual((rankForGoal(REELS, solarJob, [], m, 's1', T0)[0] as { reel: GoalReel }).reel.id, 'cb-series', 'same session: no reorder')
  const later = rankForGoal(REELS, solarJob, [], m, 's2', T0 + 1)
  assert.equal(later[0].tag, 'rematch')
  // failed work order with a named mistake → the matching repair reel jumps ahead of the gap blocks
  let failed: EvidenceRecord | undefined
  for (let seed = 1; seed < 200 && !failed; seed++) {
    const t = makeTask('wo.solar-string', seed)
    const r = makeRecord(t, { max: String(t.key.max + 1), min: String(t.key.min) }, T0, 'f1')
    if (openMisconceptions([r], ['solar.cold-max']).some((x) => x.misconception === 'rounded_up')) failed = r
  }
  assert.ok(failed, 'some seed produces a rounded-up mistake')
  const r = rankForGoal(REELS, solarJob, [failed!], emptyMemory(), 's3', T0)
  assert.equal(r[0].tag, 'repair'); assert.equal((r[0] as { reel: GoalReel }).reel.id, 'c-max')
  assert.match((r[0] as { why: string }).why, /Fixes your mistake on WO-/)
  // once series is proven, its reels leave the gap list
  const s = right('quick.series', 2)
  const proven = rankForGoal(REELS, solarJob, [makeRecord(s.t, s.a, T0, 'p')], emptyMemory(), 's4', T0)
  assert.ok(!proven.some((x) => x.type === 'proof' && x.competency === 'solar.series'))
  assert.ok(!proven.some((x) => x.type === 'reel' && x.reel.id === 'm-hose' && x.tag === 'gap'))
})

test('EV task wraps the tested blueprint', () => {
  const t = evTask(EV, 7)
  assert.equal(t.asks.length, 2)
  assert.equal(grade(t, Object.fromEntries(t.asks.map((a) => [a.id, String(t.key[a.id])]))).pass, true)
})

test('motion reels obey the No Passive Scroll law: they must force exactly one right decision', async () => {
  const { validateCard, badges } = await import('./cards.ts')
  assert.ok(validateCard({ id: 'm', concept: 'cold', kind: 'motion', explain: 'why' }).length > 0, 'a motion clip with no decision is refused')
  assert.deepEqual(validateCard({ id: 'm', concept: 'cold', kind: 'motion', explain: 'why', options: [{ t: 'UP', ok: true }, { t: 'DOWN' }] }), [])
  assert.ok(badges({ origin: 'flux_original', mediaSource: 'motion_ai_plate', truth: 'tested_code', isDemo: false }).some((b) => /AI VIDEO BACKDROP/.test(b.label)), 'Veo backdrops are always badged')
})
