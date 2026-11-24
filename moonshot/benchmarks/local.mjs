import assert from 'node:assert/strict'
import { writeFile } from 'node:fs/promises'
import { inventoryAnswer, redact, propose, initialSteps, answerSource, approve, DEMO } from '../../app/src/moonshot/domain.ts'
import { missionRoom, note, summary } from '../prototypes/mission_room.mjs'
import gold from '../fixtures/golden.json' with { type: 'json' }

const consent = { capture:true, derivatives:true, publicShare:false }
const trace = propose(DEMO.sourceText,true,consent)
const steps = initialSteps(trace).map((entry) => ({...entry, status:'checked', instruction:entry.id === 'fix' ? 'Use receipts from C4.' : entry.instruction }))
const playbook = approve(trace,steps,1,DEMO.followup.answer,0)
const tokenize = (text) => text.toLowerCase().match(/[a-z0-9]+/g)?.filter((token) => token.length > 2 && !['the','what','why','for','and','was','did','how'].includes(token)) ?? []

const search = (query, chunks) => {
  const tokens = new Set(tokenize(query))
  const best = chunks.map((entry) => ({ id:entry.id, score:tokenize(entry.content).filter((token) => tokens.has(token)).length }))
    .sort((a,b) => b.score-a.score)[0]
  return best?.score ? best.id : ''
}
const retrieval = [
  ['Whole transcript', (query) => search(query, trace.actions.map((entry) => ({id:entry.id, content:entry.speech})))],
  ['Timestamped observations + transcript', (query) => search(query, trace.actions.map((entry) => ({id:entry.id, content:entry.action+' '+entry.seen+' '+entry.speech})))],
  ['Reviewed trace + explicit abstention routing', (query) => answerSource(playbook,trace,query,0)?.span ?? ''],
].map(([name, fn]) => {
  const started = performance.now()
  const answers = gold.probeQuestions.map(([query, expected]) => ({query,expected,actual:fn(query)}))
  return { name, correct: answers.filter((answer) => answer.actual === answer.expected).length,
    falseAnswersOnUnobservable: answers.filter((answer) => !answer.expected && answer.actual).length, ms:performance.now()-started, answers }
})

let school = missionRoom('School supply cupboard · simulation')
school = note(school, 'cataloguer-demo', 'Grouped by supply SKU.', 'one')
school = note(school, 'calculator-demo', 'Expected 94, counted 80, variance −14.', 'two')
assert.strictEqual(note(school,'calculator-demo','Retry identical event','two'),school)
assert.throws(() => note(school,'unassigned','Attempted unattributed note','three'),/Unknown role/)
assert.equal(summary(school).filter((item) => item.notes.length).length,2)

const inputCases = [
  ['Opening: 120. Received: 30. Sold: 18. Counted: 128.',true],
  ['Received: 30; Counted: 128; Sold: 18; Opening: 120',true],
  ['opening=0; received=0; sold=0; counted=0',true],
  ['Opening: 35. Received: 4. Sold: 10. Counted: 30.',true],
  ['Opening: 12, Received: 0, Sold: 2, Counted: 10',true],
  ['Opening: 120. Received: 30. Counted: 128.',false],
  ['Opening: 120. Received: 30. Sold: 180. Counted: 128.',false],
  ['Opening: 120. Opening: 90. Received: 30. Sold: 18. Counted: 128.',false],
  ['Opening: 120.5. Received: 30. Sold: 18. Counted: 128.',false],
  ['Opening: -120. Received: 30. Sold: 18. Counted: 128.',false],
  ['Opening: 123456. Received: 30. Sold: 18. Counted: 128.',false],
  ['Stock check, source ambiguous, reported 128.',false],
].map(([source, expected]) => ({source,expected,actual:!!propose(source,false,consent).facts}))
assert(inputCases.every((item) => item.actual === item.expected))
const glossary = ['VLOOKUP','FALSE','SUM','SKU','stock','commission','cell reference','=B4+C4-D4','TIN-24','132','128','−4']
assert.equal(inventoryAnswer('−4'),-4)
const supports = ['Contact a@example.com. Opening: 120.', 'Supplier testhandle@upi. =B4+C4-D4.', 'The screened worksheet indicates a discrepancy.']
await writeFile(new URL('./local-results.json',import.meta.url), JSON.stringify({
  classification:'Synthetic fixture, deterministic scoring; no human preference',
  retrieval,inputCases,glossary,redaction:supports.map((text) => [text,redact(text)]),school:summary(school),
},null,2)+'\n')
console.log(JSON.stringify({retrieval:retrieval.map(({name,correct,falseAnswersOnUnobservable})=>({name,correct,falseAnswersOnUnobservable})), inputCases:inputCases.length, assignedRoles:3},null,2))
