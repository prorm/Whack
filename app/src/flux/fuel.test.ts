// Scroll Fuel rules. Run: npm run test:flux
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { MIN, RULES, afterAnswer, canEscape, drain, earn, emptyFuel, escape, gatedSite, refuel, record, stats, thumbNative } from './fuel.ts'

const T = Date.UTC(2026, 10, 24, 21)

test('tank drains only while a gated app is active, and long gaps never drain', () => {
  let f = emptyFuel(T)
  f = drain(f, T + 1000, true)
  assert.equal(f.tankMs, 10 * MIN - 1000)
  f = drain(f, T + 2000, false)
  assert.equal(f.tankMs, 10 * MIN - 1000)
  f = drain(f, T + 10 * 60_000, true) // device slept: no drain
  assert.equal(f.tankMs, 10 * MIN - 1000)
  f = { ...f, tankMs: 500 }
  f = drain(f, f.lastDrainAt + 1000, true)
  assert.equal(f.tankMs, 0)
})

test('first try earns 10, follow-up 5, bounty 15, misses 0', () => {
  assert.equal(earn(true, 1), 10)
  assert.equal(earn(true, 2), 5)
  assert.equal(earn(true, 1, true), 15)
  assert.equal(earn(false, 1), 0)
})

test('a miss forces the explanation and a follow-up; never more than 3 cards per toll', () => {
  assert.deepEqual(afterAnswer(false, 1), { kind: 'explain-then-followup', waitMs: RULES.explainMs })
  assert.deepEqual(afterAnswer(true, 2), { kind: 'unlock', minutes: 5 })
  assert.deepEqual(afterAnswer(false, 3), { kind: 'mercy', minutes: RULES.mercy })
})

test('the tank is capped so nobody banks hours', () => {
  let f = emptyFuel(T)
  for (let i = 0; i < 10; i++) f = refuel(f, 10, T)
  assert.equal(f.tankMs, RULES.tankMax * MIN)
})

test('free DM break: once per hour', () => {
  let f = { ...emptyFuel(T), tankMs: 0 }
  assert.ok(canEscape(f, T))
  f = escape(f, T)
  assert.equal(f.tankMs, 2 * MIN)
  assert.throws(() => escape(f, T + 30 * MIN), /comes back/)
  assert.ok(canEscape(f, T + 61 * MIN))
})

test('doomscroll-to-proof mirror counts breaks, recalls and first-try rate', () => {
  let f = emptyFuel(T)
  const e = (o: object) => ({ at: T, app: 'instagram', reelId: 'r', concept: 'cold', correct: true, attempt: 1, minutes: 10, ...o })
  f = record(f, e({}))
  f = record(f, e({ correct: false, minutes: 0 }))
  f = record(f, e({ attempt: 2, minutes: 5 }))
  f = record(f, e({ app: 'youtube-shorts', concept: 'idem' }))
  const s = stats(f, T - 1, T + 1)
  assert.equal(s.breaks, 3)
  assert.equal(s.recalls, 4)
  assert.equal(Math.round(s.firstTryRate * 100), 67)
  assert.equal(s.minutesEarned, 25)
  assert.deepEqual(s.byApp, { instagram: 2, 'youtube-shorts': 1 })
})

test('gate only thumb-native cards', () => {
  assert.ok(thumbNative({ kind: 'spot' }))
  assert.ok(!thumbNative({ kind: 'choice', options: [1, 2, 3, 4] }))
  assert.ok(!thumbNative({ kind: 'essay' }))
})

test('site matching: Instagram everywhere, YouTube only on Shorts, only when enabled', () => {
  const on = ['instagram', 'youtube-shorts']
  assert.equal(gatedSite('https://www.instagram.com/reels/abc/', on), 'instagram')
  assert.equal(gatedSite('https://www.youtube.com/shorts/xyz', on), 'youtube-shorts')
  assert.equal(gatedSite('https://www.youtube.com/watch?v=1', on), null)
  assert.equal(gatedSite('https://www.reddit.com/', on), null)
  assert.equal(gatedSite('https://evil-instagram.com/', on), null)
})
