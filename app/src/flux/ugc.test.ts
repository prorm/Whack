// Field Scars, provenance, sieve and blueprint rules. Run: npm run test:flux
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { badges, validateCard } from './cards.ts'
import { canPost, challenge, resolve, review, type Submission } from './community.ts'
import { dhash, hamming, imageChecks, nearestHash, readMeta, textChecks, verdict } from './sieve.ts'
import { compute, evaluate, lintBlueprint, missionWon, runTests, sweep, workVariant, type Blueprint } from './blueprint.ts'

const EV = JSON.parse(readFileSync(new URL('./blueprints/ev_charger.json', import.meta.url), 'utf8')) as Blueprint
const T = Date.UTC(2026, 10, 24)

const sub = (over: Partial<Submission> = {}): Submission => ({
  id: 's1', createdAt: T, domain: 'trades', concept: 'safety', contributor: { name: 'Manju', role: 'Wireman', city: 'Mysuru' },
  photo: 'data:', hash: '0'.repeat(16), hot: { x: 50, y: 50, r: 12 }, question: 'Tap the fault', rule: 'Burnt MC4 from a loose crimp',
  wrongBelief: 'Any MC4 fits any MC4', why: 'Mismatched connectors heat up', checks: [], status: 'pending', reviews: [], challenges: [], changelog: [], ...over,
})

test('no passive scroll: only decision cards pass', () => {
  assert.ok(validateCard({ id: 'a', concept: 'x', kind: 'video', explain: 'x' }).length > 0)
  assert.deepEqual(validateCard({ id: 'a', concept: 'x', kind: 'choice', explain: 'why', options: [{ t: 'A', ok: true }, { t: 'B' }] }), [])
  assert.ok(validateCard({ id: 'a', concept: 'x', kind: 'choice', explain: 'why', options: [{ t: 'A', ok: true }, { t: 'B', ok: true }] }).length > 0)
  assert.ok(validateCard({ id: 'a', concept: 'x', kind: 'spot', explain: 'why', hot: { x: 50, y: 50, r: 60 } }).length > 0)
})

test('community cards need real media and two distinct verifiers', () => {
  const base = { id: 'a', concept: 'x', kind: 'spot', explain: 'why', hot: { x: 50, y: 50, r: 10 } }
  const prov = { origin: 'community_verified' as const, mediaSource: 'real_capture' as const, truth: 'master_review' as const, isDemo: true, contributor: { name: 'M', role: 'r', city: 'c', verifiedCount: 0, demo: false } }
  assert.ok(validateCard({ ...base, prov: { ...prov, verifiedBy: ['A', 'A'] } }).some((e) => /two different/.test(e)))
  assert.ok(validateCard({ ...base, prov: { ...prov, mediaSource: 'ai_generated', verifiedBy: ['A', 'B'] } }).some((e) => /real capture/.test(e)))
  assert.deepEqual(validateCard({ ...base, prov: { ...prov, verifiedBy: ['A', 'B'] } }), [])
})

test('badges never hide AI media or DEMO status', () => {
  const b = badges({ origin: 'flux_original', mediaSource: 'ai_generated', truth: 'team_authored', isDemo: false }).map((x) => x.label)
  assert.ok(b.includes('AI-GENERATED DEMO PHOTO'))
  assert.ok(badges({ origin: 'company_bounty', mediaSource: 'none', truth: 'team_authored', isDemo: true }).some((x) => x.label === 'DEMO'))
})

test('sieve: AI markers, generator software and duplicates block; missing EXIF only warns', () => {
  const enc = (s: string) => new TextEncoder().encode(s)
  assert.ok(readMeta(enc('xxxx http://cv.iptc.org/newscodes/digitalsourcetype/trainedAlgorithmicMedia xx')).aiSourceType)
  const meta = readMeta(new Uint8Array([0xff, 0xd8, 0xff, 0xd9]))
  assert.equal(verdict(imageChecks(meta, { w: 1080, h: 1920 }, null)), 'warn')
  assert.equal(verdict(imageChecks({ ...meta, software: 'Midjourney v7' }, { w: 1080, h: 1920 }, null)), 'block')
  assert.equal(verdict(imageChecks({ ...meta, make: 'Xiaomi', model: 'Redmi 13' }, { w: 1080, h: 1920 }, null)), 'ok')
  assert.equal(verdict(imageChecks({ ...meta, make: 'Xiaomi' }, { w: 1080, h: 1920 }, { id: 'spot-mc4', distance: 3 })), 'block')
  assert.equal(verdict(imageChecks({ ...meta, make: 'Xiaomi' }, { w: 300, h: 400 }, null)), 'block')
})

test('sieve: EXIF Make/Model parsed from a real-shaped JPEG', () => {
  // minimal little-endian EXIF with Make="Acme" (tag 0x010f, ASCII, count 5, offset 26)
  const tiff = [0x49, 0x49, 0x2a, 0x00, 8, 0, 0, 0, 1, 0, 0x0f, 0x01, 2, 0, 5, 0, 0, 0, 26, 0, 0, 0, 0, 0, 0, 0, ...new TextEncoder().encode('Acme'), 0]
  const app1 = [...new TextEncoder().encode('Exif'), 0, 0, ...tiff]
  const len = app1.length + 2
  const jpg = new Uint8Array([0xff, 0xd8, 0xff, 0xe1, len >> 8, len & 255, ...app1, 0xff, 0xd9])
  assert.equal(readMeta(jpg).make, 'Acme')
})

test('dhash + hamming find near duplicates', () => {
  const g = Array.from({ length: 72 }, (_, i) => (i * 37) % 255)
  const h1 = dhash(g), h2 = dhash(g.map((v, i) => (i === 5 ? v + 300 : v)))
  assert.equal(h1.length, 16)
  assert.ok(hamming(h1, h2) <= 2)
  assert.equal(nearestHash(h1, [{ id: 'a', hash: h2 }, { id: 'b', hash: 'f'.repeat(16) }])!.id, 'a')
})

test('sieve: unsafe procedures and empty rules are blocked', () => {
  assert.equal(verdict(textChecks({ rule: 'Just jumper the RCD so it stops tripping', wrongBelief: 'RCD is useless', why: 'x' })), 'block')
  assert.equal(verdict(textChecks({ rule: 'Never work on the panel live, isolate first', wrongBelief: 'Gloves are enough', why: 'x' })), 'ok')
  assert.equal(verdict(textChecks({ rule: 'Working live on the string is fine with gloves', wrongBelief: 'x is y always', why: 'x' })), 'block')
  assert.equal(verdict(textChecks({ rule: 'MC4 melted', wrongBelief: 'Any connector fits', why: 'x' })), 'block')
  assert.equal(verdict(textChecks({ rule: 'Mismatched MC4 brands heat up under load', wrongBelief: 'Any MC4 fits any MC4', why: 'In conclusion, delve deeper' })), 'warn')
})

test('prove it to post it', () => {
  assert.equal(canPost({}, {}, 'trades'), false)
  assert.equal(canPost({ trades: T }, {}, 'trades'), true)
  assert.equal(canPost({ trades: T }, {}, 'tech'), false)
  assert.equal(canPost({}, { tech: 'm-farah' }, 'tech'), true)
})

test('2-of-3 master review, once each, domain-scoped, sieve blocks approval', () => {
  let s = sub()
  assert.throws(() => review(s, 'm-ananya', 'approve', '', T), /domain/)
  s = review(s, 'm-lakshmi', 'approve', '', T)
  assert.throws(() => review(s, 'm-lakshmi', 'approve', '', T), /once/)
  assert.equal(s.status, 'pending')
  s = review(s, 'm-imran', 'approve', '', T + 1)
  assert.equal(s.status, 'live')
  assert.match(s.changelog.at(-1)!.note, /Lakshmi R\. \+ Imran S\./)
  assert.throws(() => review(sub(), 'm-gowda', 'reject', ' ', T), /reason/)
  let r = review(sub(), 'm-gowda', 'reject', 'Fault not visible', T)
  r = review(r, 'm-imran', 'reject', 'Blurry', T)
  assert.equal(r.status, 'rejected')
  assert.throws(() => review(sub({ checks: [{ id: 'dupe', level: 'block', label: '', detail: '' }] }), 'm-gowda', 'approve', '', T), /sieve/)
})

test('challenge the rule: patch keeps it live with a changelog, retire removes it', () => {
  let s = review(review(sub(), 'm-lakshmi', 'approve', '', T), 'm-imran', 'approve', '', T)
  assert.throws(() => challenge(s, 'Divya', 'wrong', 'x', T), /specific/)
  s = challenge(s, 'Divya', 'Crimp tool matters more than brand here', 'IEC 62852 requires same-type mating', T)
  s = resolve(s, 'c1', 'm-gowda', 'patched', T + 5, 'Only mate connectors of the same type and use the right crimp tool')
  assert.equal(s.status, 'live')
  assert.match(s.why, /same type/)
  assert.match(s.changelog.at(-1)!.note, /Patched/)
  s = challenge(s, 'Arun', 'New 2027 guideline bans field crimping', 'Guideline section 4.2', T + 9)
  s = resolve(s, 'c2', 'm-imran', 'retired', T + 10)
  assert.equal(s.status, 'retired')
})

test('expression language: precedence, booleans, functions, no eval', () => {
  assert.equal(evaluate('1 + 2 * 3', {}), 7)
  assert.equal(evaluate('(1 + 2) * 3', {}), 9)
  assert.equal(evaluate('a >= 2 && a < 5', { a: 3 }), 1)
  assert.equal(evaluate('b ? 10 : 20', { b: 0 }), 20)
  assert.equal(evaluate('floor(min(7.9, 9))', {}), 7)
  assert.throws(() => evaluate('alert(1)', {}), /Unknown function/)
  assert.throws(() => evaluate('constructor', {}), /Unknown name/)
})

test('EV blueprint: lint clean, every code-gate test passes', () => {
  assert.deepEqual(lintBlueprint(EV), [])
  for (const r of runTests(EV)) assert.ok(r.ok, `${r.name}: ${r.detail}`)
})

test('EV blueprint missions are winnable and the obvious wrong move is not', () => {
  const [kill, fixed, bal] = EV.missions
  assert.ok(missionWon(EV, kill, { charger: 32, hour: 21, balance: 0 }))
  assert.ok(!missionWon(EV, kill, { charger: 32, hour: 18, balance: 0 }))
  const safe = compute(EV, {}).safeFixed
  assert.ok(missionWon(EV, fixed, { charger: safe, hour: 18, balance: 0 }, sweep(EV, { charger: safe, balance: 0 })))
  assert.ok(!missionWon(EV, fixed, { charger: safe + 1, hour: 18, balance: 0 }, sweep(EV, { charger: safe + 1, balance: 0 })))
  assert.ok(!missionWon(EV, fixed, { charger: safe - 1, hour: 18, balance: 0 }, sweep(EV, { charger: safe - 1, balance: 0 })))
  assert.ok(missionWon(EV, bal, { charger: 32, hour: 21, balance: 1 }))
  assert.ok(!missionWon(EV, bal, { charger: 32, hour: 21, balance: 0 }))
})

test('EV work orders are valid unseen variants', () => {
  for (let s = 1; s < 200; s++) {
    const w = workVariant(EV, s)
    assert.ok(w.key.dinner >= 6 && w.key.fixed >= w.key.dinner)
    assert.ok(!(w.givens.mainLimit === 40 && w.givens.base === 0.5 && w.givens.ac === 1.5 && w.givens.cook === 2.0))
  }
})
