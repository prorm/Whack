import assert from 'node:assert/strict'
import { test } from 'node:test'
import fixture from '../../../moonshot/fixtures/golden.json' with { type: 'json' }
import { approve, answerSource, DEMO, gradeInventory, initialSteps, inventoryAnswer, parseStock, propose, redact, stockResult, stockStory, variant } from './domain.ts'

const consent = {capture:true, derivatives:true, publicShare:false}
const fixtureTrace = () => propose(DEMO.sourceText, true, consent)
const repaired = (trace = fixtureTrace()) => initialSteps(trace).map((step) => ({...step,
  instruction: step.id === 'fix' ? 'Use receipts from C4 for TIN-24.' : step.instruction, status: 'checked' as const }))

test('independent inventory keys cover shortages, surplus, zero variance and zero stock', () => {
  for (const [inputs, expected] of fixture.assessment) {
    const stock = { opening: inputs[0], received: inputs[1], sold: inputs[2], counted: inputs[3] }
    assert.deepEqual(stockResult(stock), {expected:expected[0], variance:expected[1]})
    assert(gradeInventory(stock, expected[0], expected[1]).correct)
  }
})

test('incorrect outcomes, omissions and unknown methods keep different evidence states', () => {
  assert.equal(gradeInventory(DEMO.facts, 132, 4).misconception, 'reversed-variance')
  assert.equal(gradeInventory(DEMO.facts, 168, -4).misconception, 'added-sales')
  assert.equal(gradeInventory(DEMO.facts, 132, -4).correct, true)
  assert.equal(inventoryAnswer('−4'), -4)
  for (const invalid of ['', 'maybe 4', 'about 132', '4–5', '4.6', 'NaN', 'Infinity']) assert.equal(inventoryAnswer(invalid), null)
})

test('synthetic and private parsing only use observed values', () => {
  assert.deepEqual(parseStock(DEMO.sourceText), DEMO.facts)
  assert.equal(parseStock('opening: 10, received: 5, sold: 3'), null)
  assert.equal(parseStock('opening: 10, received: 5, sold: 30, counted: 2'), null)
  assert.equal(parseStock('opening: 10.5, received: 5, sold: 3, counted: 2'), null)
  assert.equal(parseStock('opening: 10, opening: 30, received: 5, sold: 3, counted: 2'), null)
  const trace = propose(DEMO.sourceText + ' contributor contact a@example.com', false, consent)
  assert.equal(trace.actions.length, 1)
  assert(!JSON.stringify(trace).includes('a@example.com'))
  assert.deepEqual(trace.observedOutcomes, [])
})

test('golden privacy inputs are redacted while formula and SKU remain intact', () => {
  for (const [source, flag] of fixture.privacy) {
    if (flag) assert(redact(source).includes(`[${flag}]`), source)
    else assert.equal(redact(source), source)
  }
})

test('publishing requires permission, source, a resolved draft and a corrected C4 reference', () => {
  const trace = fixtureTrace()
  assert.throws(() => approve(trace, initialSteps(trace), 1, '', 10), /Check, correct/)
  assert.throws(() => approve(trace, initialSteps(trace).map((step) => ({...step,status:'checked'})), 1, '', 10), /shows C4/)
  assert.throws(() => approve({...trace, permissions:{...consent, derivatives:false}}, repaired(trace), 1, '', 10), /permission/)
  assert.throws(() => approve({...trace, safetyFlags:['outside scope']}, repaired(trace), 1, '', 10), /scope/)
  assert.throws(() => approve(trace, repaired(trace).map((step) => ({...step,span:'invented'})), 1, '', 10), /source reference/)
  assert.throws(() => approve(trace, repaired(trace).map((step) => ({...step,status:'unsafe'})), 1, '', 10), /unsafe/)
})

test('released versions preserve prior checked instruction text', () => {
  const trace = fixtureTrace()
  const drafts = repaired(trace)
  const original = approve(trace, drafts, 1, '', 10)
  drafts[0].instruction = 'Verify the correct SKU is selected.'
  const successor = approve(trace, drafts, 2, 'Test reason', 20)
  assert.notEqual(original.steps[0].instruction, successor.steps[0].instruction)
  assert.equal(original.version, 1)
  assert.equal(successor.version, 2)
})

test('timestamp Q&A cites accepted evidence and abstains from unsupported questions', () => {
  const trace = fixtureTrace()
  const approved = approve(trace, repaired(trace), 1, DEMO.followup.answer, 10)
  for (const [query, expected] of fixture.probeQuestions) {
    assert.equal(answerSource(approved, trace, query, 0)?.span ?? '', expected, query)
  }
  assert.equal(answerSource(approved, {...trace,reviewStatus:'withdrawn'}, 'Why C4 instead of C5?', 0), null)
})

test('fresh recall formula uses unfamiliar numbers and viewing alone has no effect', () => {
  const unseen = variant(234)
  assert.notDeepEqual(unseen, DEMO.facts)
  const story = stockStory(DEMO.facts, 4, 'reversed-variance', unseen, false)
  const answer = stockResult(unseen)
  assert.equal(story.formula, '128 − 132')
  assert.equal(story.answerFormula, `${unseen.counted} − ${answer.expected}`)
  assert(!story.question.includes('−4'))
  assert.equal(story.wrong, '4')
})
