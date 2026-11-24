// FLUX rules. Run: npm run test:flux
import assert from 'node:assert/strict'
import { test } from 'node:test'
import { DAY, battery, emptyMemory, orderFeed, review } from './memory.ts'
import {
  HOME, INVERTERS, PANELS, SITES, brier, diagnoseMax, diagnoseMin, keyFor, maxPanels, minPanels, parallel, peakOfDay,
  reading, series, vocAt, workOrder,
} from './physics.ts'

test('series adds volts, parallel adds amps', () => {
  assert.deepEqual(series(3, 40, 10), { v: 120, i: 10 })
  assert.deepEqual(parallel(3, 40, 10), { v: 40, i: 30 })
})

test('cold raises Voc, heat lowers it', () => {
  const p = HOME.panel
  assert.ok(vocAt(p, 8) > p.voc)
  assert.ok(vocAt(p, 70) < p.voc)
  assert.equal(Math.round(vocAt(p, 8) * 100) / 100, 51.88) // 49.6 × (1 + 0.0027 × 17)
})

test('the home example: 12 panels look safe at 25 °C but cross 600 V on an 8 °C dawn', () => {
  const { panel, inverter, site } = HOME
  assert.equal(Math.floor(inverter.vmax / panel.voc), 12)
  assert.equal(maxPanels(inverter, panel, site.tMin), 11)
  assert.ok(12 * vocAt(panel, site.tMin) > 600)
  assert.ok(11 * vocAt(panel, site.tMin) < 600)
  assert.equal(minPanels(inverter, panel, site.tCellHot), 4)
  // the cold open's "noon test in May" number
  assert.equal(Math.round(12 * vocAt(panel, 70)), 523)
})

test('the simulated day: 12 panels peak at sunrise in January and kill the inverter; 11 survive', () => {
  const peak = peakOfDay(12, 'jan')
  assert.ok(peak.hour < 7.5, `peak at ${peak.hour}`)
  assert.ok(peak.voc > 600)
  assert.ok(peakOfDay(11, 'jan').voc < 600)
  assert.equal(reading(12, 'may', 13).zone, 'tracking')
  assert.equal(reading(3, 'may', 13.5).zone, 'asleep')
  assert.equal(reading(12, 'jan', 3).zone, 'dark')
})

test('work orders are never the home example and always have a consistent key', () => {
  for (let s = 1; s < 400; s++) {
    const { order, key } = workOrder(s)
    assert.ok(order.site.id !== 'blr')
    assert.ok(!(order.panel.id === HOME.panel.id && order.inverter.id === HOME.inverter.id))
    assert.ok(key.max * vocAt(order.panel, order.site.tMin) <= order.inverter.vmax)
    assert.ok((key.max + 1) * vocAt(order.panel, order.site.tMin) > order.inverter.vmax)
    assert.ok(key.min <= key.max)
  }
})

test('misconception detector names the wrong method', () => {
  const o = { panel: PANELS[0], inverter: INVERTERS[1], site: SITES.find((s) => s.id === 'leh')! }
  const k = keyFor(o)
  assert.equal(diagnoseMax(o, k.max), undefined)
  assert.equal(diagnoseMax(o, Math.floor(1000 / 49.6)), 'used_stc')
  const hot = Math.floor(1000 / vocAt(o.panel, o.site.tCellHot))
  assert.equal(diagnoseMax(o, hot), 'used_hot')
  assert.equal(diagnoseMin(o, Math.floor(200 / (41.6 * (1 - 0.0035 * 30)))), 'min_rounded_down')
  assert.equal(diagnoseMax(o, 999), undefined)
})

test('brier calibration', () => {
  assert.equal(brier(1, true), 0)
  assert.equal(brier(1, false), 1)
  assert.equal(brier(0.5, false), 0.25)
})

test('memory ladder 1/3/7/21 and battery decay', () => {
  const t0 = Date.UTC(2026, 10, 24)
  let m = emptyMemory()
  m = review(m, 'cold', true, t0, 's1')
  assert.equal(m.cards.cold.intervalDays, 1)
  m = review(m, 'cold', true, t0 + DAY, 's2')
  assert.equal(m.cards.cold.intervalDays, 3)
  m = review(m, 'cold', true, t0 + 4 * DAY, 's3')
  assert.equal(m.cards.cold.intervalDays, 7)
  m = review(m, 'cold', true, t0 + 11 * DAY, 's4')
  assert.equal(m.cards.cold.intervalDays, 21)
  assert.ok(Math.abs(battery(m.cards.cold, m.cards.cold.dueAt) - 0.7) < 1e-9)
  assert.equal(battery(m.cards.cold, m.cards.cold.lastAt), 1)
  m = review(m, 'cold', false, t0 + 40 * DAY, 's5')
  assert.equal(m.cards.cold.reps, 0)
  assert.equal(m.cards.cold.intervalDays, 1)
})

test('a missed feed question moves the callback reel to the top only in a LATER session', () => {
  const reels = [
    { id: 'a', concept: 'series' }, { id: 'b', concept: 'cold' },
    { id: 'cb-cold', concept: 'cold', callback: true }, { id: 'c', concept: 'maxstring' },
  ]
  const t0 = Date.UTC(2026, 10, 24)
  let m = review(emptyMemory(), 'cold', false, t0, 's1', 'b')
  // same session: no reorder, callback hidden
  assert.deepEqual(orderFeed(reels, m, 's1', t0).map((x) => x.reel.id), ['a', 'b', 'c'])
  // later session: callback first
  assert.equal(orderFeed(reels, m, 's2', t0 + 1000).map((x) => x.reel.id)[0], 'cb-cold')
  // fixed in the later session -> callback gone in the next one
  m = review(m, 'cold', true, t0 + 2000, 's2', 'cb-cold')
  assert.ok(!orderFeed(reels, m, 's3', t0 + 3000).some((x) => x.reel.id === 'cb-cold'))
})
