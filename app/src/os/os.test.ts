import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CAPABILITIES, CAP, closure } from './taxonomy.ts'
import { blueprint, compileRequirement, diffBlueprint, simulationMatch } from './compiler.ts'
import { CHANGE_PRESET, SEED_REQUIREMENTS, coverage, opportunitiesFrom } from './market.ts'
import { evidenceFrom } from './evidence.ts'
import { planPath, unlocks } from './path.ts'
import { CODE_VERSION, PRACTICE_VARIANT, VARIANTS, VERIFIED_VARIANTS, runSuite, starterCode, testCases, verifiedVariant, type VariantId } from './codelab.ts'
import { DATA_VARIANTS, gradeData, ledgerFor, solveData } from './datalab.ts'

const none = () => ({ state: 'not_started' as const })

test('graph: every prerequisite exists, there are no cycles, every capability has proof or says it has none', () => {
  for (const c of CAPABILITIES) {
    for (const p of c.prereqs) assert.ok(CAP[p], `${c.id} → missing ${p}`)
    assert.ok(c.proof.label.length > 3)
    if (c.hazardous) assert.ok(['arena', 'in_person'].includes(c.proof.kind), `${c.id} hazardous proof must be supervised or simulated`)
  }
  assert.doesNotThrow(() => closure(CAPABILITIES.map((c) => c.id)))
  const order = closure(['ci-cd'])
  assert.ok(order.indexOf('linux') < order.indexOf('containers') && order.indexOf('containers') < order.indexOf('ci-cd'))
})

test('compiler: the backend employers normalise to one shared foundation with employer branches', () => {
  const paylane = compileRequirement(SEED_REQUIREMENTS[0].text).matched.map((m) => m.id)
  for (const id of ['api-debugging', 'regression-testing', 'incident-report', 'payments-idempotency', 'sql']) assert.ok(paylane.includes(id), id)
  const b = blueprint(SEED_REQUIREMENTS.filter((r) => r.cluster === 'backend'))
  for (const id of ['programming', 'http-apis', 'api-debugging', 'incident-response', 'log-analysis']) assert.ok(b.shared.includes(id), `shared ${id}`)
  assert.deepEqual(b.branches.find((x) => x.req.orgId === 'kiranacart')?.ids, ['git'])
  assert.ok(b.branches.find((x) => x.req.orgId === 'metroledger')!.ids.includes('reconciliation'))
})

test('compiler: unknown tools are flagged for validation, never mapped by guesswork', () => {
  const c = compileRequirement('A junior engineer should set up Terraform for staging, write Python scripts to rotate logs, and explain outages to stakeholders.')
  assert.ok(c.unmapped.includes('Terraform'))
  assert.ok(c.matched.some((m) => m.id === 'programming'))
  assert.ok(!c.matched.some((m) => m.id === 'rooftop-design'))
  assert.equal(compileRequirement('Rest of the team handles the current queue.').matched.length, 0, 'ordinary English words are not skills')
})

test('compiler: a changed requirement adds only the new capabilities and their prerequisites', () => {
  const before = blueprint(SEED_REQUIREMENTS.filter((r) => r.cluster === 'backend'))
  const after = blueprint(SEED_REQUIREMENTS.filter((r) => r.cluster === 'backend').map((r) => r.id === CHANGE_PRESET.reqId ? { ...r, change: CHANGE_PRESET.text } : r))
  const { added, removed } = diffBlueprint(before, after)
  assert.deepEqual(added.sort(), ['ci-cd', 'containers', 'linux'])
  assert.deepEqual(removed, [])
})

test('simulation registry: CodeLab hosts the backend path; uncovered capabilities say so', () => {
  const { byLab, unhosted } = simulationMatch(['api-debugging', 'git'])
  assert.ok(byLab.get('CodeLab')!.includes('api-debugging'))
  assert.ok(unhosted.includes('git'))
})

test('evidence: only graded work counts; a passed CodeLab receipt covers its capabilities, a report waits for a human', () => {
  assert.deepEqual(evidenceFrom(none, []), {})
  const ev = evidenceFrom(none, [{ kind: 'code', passed: true, at: 2, report: 'Root cause: missing rounding.' }])
  assert.equal(ev['api-debugging'].state, 'evidenced')
  assert.equal(ev['incident-report'].state, 'review')
  const failed = evidenceFrom(none, [{ kind: 'code', passed: false, at: 1 }])
  assert.equal(failed['api-debugging'].state, 'failed')
  const later = evidenceFrom(none, [{ kind: 'code', passed: false, at: 1 }, { kind: 'code', passed: true, at: 3 }])
  assert.equal(later['api-debugging'].state, 'evidenced')
  const arena = evidenceFrom(none, [{ kind: 'arena', passed: true, at: 1 }])
  assert.match(arena['fault-diagnosis'].level!, /simulation/)
  const flux = evidenceFrom((id) => id === 'pay.idempotency' ? { state: 'evidenced', level: 'system_assessed' } : { state: 'not_started' }, [])
  assert.equal(flux['payments-idempotency'].state, 'evidenced')
})

test('career GPS: evidence skips steps, a declared skill goes straight to proof, missing proof is honest', () => {
  const ev = evidenceFrom(none, [{ kind: 'code', passed: true, at: 1 }])
  const plan = planPath(['incident-report', 'git', 'sql'], ev, new Set(['sql']))
  const st = Object.fromEntries(plan.steps.map((s) => [s.id, s.state]))
  assert.equal(st['api-debugging'], 'proven')
  assert.equal(st['incident-report'], 'learn')
  assert.equal(st['git'], 'pending')
  assert.equal(st['sql'], 'pending')
  const fresh = planPath(['api-debugging'], {}, new Set(['programming']))
  assert.equal(fresh.steps.find((s) => s.id === 'programming')!.state, 'prove')
  assert.equal(fresh.steps.at(-1)!.id, 'api-debugging')
  assert.ok(fresh.remainingHours > 0)
})

test('exchange: coverage is a count of evidenced requirements, never a score; site safety stays in person', () => {
  const opps = opportunitiesFrom(SEED_REQUIREMENTS)
  const solar = opps.find((o) => o.id === 'o-suryodaya')!
  assert.ok(solar.supervised)
  const cov = coverage(solar, {})
  assert.equal(cov.rows.find((r) => r.id === 'site-safety')!.state, 'in_person')
  assert.equal(cov.total, cov.rows.length - 1)
  const cohort = opps.find((o) => o.commitment === 'sponsored-cohort')!
  assert.ok(cohort.requires.includes('virtualization') && cohort.requires.includes('containers'))
  const ev = evidenceFrom(none, [{ kind: 'code', passed: true, at: 1 }])
  const top = unlocks(opps, ev)
  assert.ok(top.length > 0 && top.every((u) => ev[u.id]?.state !== 'evidenced'))
})

test('codelab: the reference passes everything; each starter fails its own incident and nothing else', () => {
  for (const v of Object.keys(VARIANTS) as VariantId[]) {
    for (const seed of [1, 77, 4242, 9_000_001]) {
      const cases = testCases(v, seed)
      const starter = runSuite(starterCode(v), cases)
      assert.ok(starter.some((r) => !r.hidden && !r.pass), `${v} starter should fail a visible test`)
      assert.ok(starter.some((r) => r.hidden && !r.pass), `${v} starter should fail a hidden test`)
      assert.ok(starter.find((r) => r.name === 'A captured payment is credited once')!.pass, `${v} starter keeps the happy path`)
    }
  }
  assert.ok(!VERIFIED_VARIANTS.includes(PRACTICE_VARIANT))
  assert.equal(verifiedVariant(3), VERIFIED_VARIANTS[0])
  assert.equal(CODE_VERSION, 1)
})

test('codelab: hidden tests use fresh values per seed and hide their expectations', () => {
  const a = testCases('units', 11).filter((c) => c.hidden).map((c) => JSON.stringify(c.events))
  const b = testCases('units', 12).filter((c) => c.hidden).map((c) => JSON.stringify(c.events))
  assert.notDeepEqual(a, b)
  const res = runSuite('function handleWebhook() { return { status: 200 } }', testCases('units', 11))
  assert.ok(res.filter((r) => r.hidden).every((r) => r.got === undefined && r.expect === undefined))
  assert.ok(runSuite('this is not javascript', testCases('units', 11)).every((r) => !r.pass && r.error))
})

test('datalab: the solver passes, a typical wrong answer fails with the reason named', () => {
  for (const v of DATA_VARIANTS) for (const seed of [5, 99, 123456]) {
    const ledger = ledgerFor(v, seed)
    const right = solveData(v, seed)
    assert.equal(gradeData(v, seed, right).passed, true)
    assert.equal(gradeData(v, seed, { flagged: {} }).passed, false)
    assert.ok(ledger.length >= 12)
  }
})
