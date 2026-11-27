export const TERMINALS = ['line', 'fuse-in', 'fuse-out', 'switch-out', 'lamp-n', 'neutral', 'earth'] as const
export type Terminal = typeof TERMINALS[number]
export const TERMINAL_LABEL: Record<Terminal, string> = {
  line: 'Supply L', 'fuse-in': 'Fuse in', 'fuse-out': 'Fuse out', 'switch-out': 'Lamp L',
  'lamp-n': 'Lamp N', neutral: 'Neutral rail', earth: 'Earth',
}
export const PARTS = ['fuse', 'neutral', 'switch', 'lamp'] as const
export type Part = typeof PARTS[number]
export const PART_LABEL: Record<Part, string> = { fuse: 'Fuse', neutral: 'Neutral joint', switch: 'Wall switch', lamp: 'Lamp' }
export const TEST_POINTS: Record<Part, [Terminal, Terminal]> = {
  fuse: ['fuse-in', 'fuse-out'], neutral: ['lamp-n', 'neutral'], switch: ['fuse-out', 'switch-out'], lamp: ['switch-out', 'lamp-n'],
}
export type Mode = 'ac' | 'ohm'
export type Action = { kind: 'cover' | 'breaker' | 'switch' | 'test' } | { kind: 'repair'; part: Part } |
  { kind: 'probe'; mode: Mode; a: Terminal; b: Terminal } | { kind: 'bridge' }
export type Measurement = { mode: Mode; a: Terminal; b: Terminal; value: number | null; result: 'reading' | 'open' | 'blocked' }
export type ArenaState = {
  cover: boolean; breaker: boolean; switchOn: boolean; isolated: boolean; isolationProven: boolean; fixed: boolean; tested: boolean; bridged: boolean;
  violations: number; guesses: number; diagnosed: boolean; readings: Measurement[]; message: string;
}

export const ARENA_VERSION = 1
export const TRACE_LIMIT = 80
export const faultFor = (seed: number) => PARTS[seed % PARTS.length]!
export const supplyFor = (seed: number) => 225 + Math.floor(seed / 4) % 12
export const freshArena = (): ArenaState => ({
  cover: false, breaker: true, switchOn: true, isolated: false, isolationProven: false, fixed: false, tested: false, bridged: false,
  violations: 0, guesses: 0, diagnosed: false, readings: [], message: 'The lamp is dark. Inspect the workbench and find the fault.',
})

type Node = Terminal | 'source'
type Branch = [Node, Node, number]
const NODES: Node[] = ['source', 'line', 'fuse-in', 'fuse-out', 'switch-out', 'lamp-n']
const resistance = { fuse: 0.06, neutral: 0.12, switch: 0.08, lamp: 880 }

function circuit(seed: number, s: ArenaState): Record<Part | 'breaker' | 'feed' | 'bridge', Branch | null> {
  const fault = s.fixed ? undefined : faultFor(seed)
  return {
    feed: ['source', 'line', 0.1], breaker: s.breaker ? ['line', 'fuse-in', 0.08] : null,
    fuse: fault === 'fuse' ? null : ['fuse-in', 'fuse-out', resistance.fuse],
    neutral: fault === 'neutral' ? null : ['lamp-n', 'neutral', resistance.neutral],
    switch: !s.switchOn || fault === 'switch' ? null : ['fuse-out', 'switch-out', resistance.switch],
    lamp: fault === 'lamp' ? null : ['switch-out', 'lamp-n', resistance.lamp],
    bridge: s.bridged ? ['fuse-in', 'neutral', 0.15] : null,
  }
}

/** Conductance matrix for a linear RMS equivalent circuit. Floating nodes have a weak meter reference. */
function nodal(branches: (Branch | null)[], fixed: Partial<Record<Node, number>>, inject: Partial<Record<Node, number>> = {}) {
  const nodes = NODES.filter((node) => fixed[node] === undefined)
  const known: Partial<Record<Node, number>> = { neutral: 0, earth: 0, ...fixed }
  const matrix = nodes.map((node, i) => [...nodes.map((_, j) => i === j ? 1e-9 : 0), inject[node] ?? 0])
  for (const branch of branches) {
    if (!branch) continue
    const [a, b, ohms] = branch
    for (const [from, to] of [[a, b], [b, a]] as const) {
      const i = nodes.indexOf(from), j = nodes.indexOf(to)
      if (i < 0) continue
      const row = matrix[i]!, g = 1 / ohms
      row[i]! += g
      if (j < 0) row[nodes.length]! += g * (known[to] ?? 0)
      else row[j]! -= g
    }
  }
  for (let i = 0; i < nodes.length; i++) {
    const pivot = matrix[i]!
    for (let j = i + 1; j < nodes.length; j++) {
      const row = matrix[j]!, ratio = row[i]! / pivot[i]!
      for (let k = i; k <= nodes.length; k++) row[k]! -= ratio * pivot[k]!
    }
  }
  for (let i = nodes.length - 1; i >= 0; i--) {
    const row = matrix[i]!
    let value = row[nodes.length]!
    for (let j = i + 1; j < nodes.length; j++) value -= row[j]! * known[nodes[j]!]!
    known[nodes[i]!] = value / row[i]!
  }
  return known as Record<Node, number>
}

export function solveArena(seed: number, s: ArenaState) {
  const parts = circuit(seed, s)
  const volts = nodal(Object.values(parts), { source: supplyFor(seed) })
  const lampWatts = parts.lamp ? (volts['switch-out'] - volts['lamp-n']) ** 2 / resistance.lamp : 0
  return { volts, lampWatts, amps: Math.abs(volts.source - volts.line) / 0.1, lit: lampWatts > 45 }
}

function ohmsBetween(seed: number, s: ArenaState, a: Terminal, b: Terminal) {
  const parts = circuit(seed, s)
  // A floating current source models the meter. Bias every node very weakly to ground.
  const volts = nodal(Object.values(parts), {}, { [a]: 1, [b]: -1 })
  const path = a === 'earth' ? 'neutral' : a
  const end = b === 'earth' ? 'neutral' : b
  if (path === end) return 0
  if (a === 'earth' || b === 'earth') return ohmsBetween(seed, s, path, end)
  const reading = Math.abs(volts[a] - volts[b])
  return reading > 100_000 ? null : reading
}

const pair = (a: Terminal, b: Terminal, x: Terminal, y: Terminal) => (a === x && b === y) || (a === y && b === x)
const unsafe = (s: ArenaState, message: string): ArenaState => ({ ...s, violations: s.violations + 1, message })

export function applyAction(seed: number, s: ArenaState, action: Action): ArenaState {
  switch (action.kind) {
    case 'cover': return { ...s, cover: !s.cover, message: s.cover ? 'Cover closed.' : 'Cover open. Select a tool or tap a control.' }
    case 'breaker': {
      const next = { ...s, breaker: !s.breaker, isolated: false, tested: false,
        message: s.breaker ? 'Breaker open. Prove absence of voltage at Fuse in to the Neutral rail.' : 'Breaker closed. Check the lamp, then run the load test.' }
      const { amps } = solveArena(seed, next)
      if (next.breaker && amps > 6) return { ...unsafe(next, `Breaker tripped at ${amps.toFixed(1)} A. Find the simulated short before restoring power.`), breaker: false }
      return next
    }
    case 'bridge': {
      if (!s.cover) return { ...s, message: 'Open the cover to access the circuit.' }
      if (s.breaker || !s.isolated) return unsafe(s, 'Safety gate failed. Isolate and prove zero voltage before changing the circuit.')
      return { ...s, bridged: !s.bridged, tested: false, guesses: s.guesses + 1,
        message: s.bridged ? 'The simulated bridge is removed.' : 'A simulated short is in place. Observe what happens when you restore power.' }
    }
    case 'switch': return { ...s, switchOn: !s.switchOn, tested: false, message: s.switchOn ? 'Wall switch OFF.' : 'Wall switch ON.' }
    case 'test': {
      const lit = solveArena(seed, s).lit
      const tested = lit && !s.cover
      return { ...s, tested, message: tested ? 'Load test passed. The lamp is drawing power.' : lit ? 'Close the cover before the final load test.' : 'Load test failed. The lamp remains dark.' }
    }
    case 'repair': {
      if (!s.cover) return { ...s, message: 'Open the cover to service the circuit.' }
      if (s.breaker || !s.isolated) return unsafe(s, s.breaker ? 'Simulated arc. Repair attempt blocked while the circuit was energized.' : 'Safety gate failed. Measure zero volts before touching a part.')
      if (s.fixed || action.part !== faultFor(seed) || !s.diagnosed) return { ...s, guesses: s.guesses + 1,
        fixed: s.fixed || action.part === faultFor(seed), tested: false, message: 'Undiagnosed part change logged. Verify the fault with the meter before replacing parts.' }
      return { ...s, fixed: true, tested: false, message: `${PART_LABEL[action.part]} repaired. Close the cover and restore power to run the load test.` }
    }
    case 'probe': {
      const { a, b, mode } = action
      if (!s.cover || a === b) return { ...s, message: 'Open the cover and choose two different terminals.' }
      const blocked = mode === 'ohm' && (s.breaker || !s.isolated || a === 'line' || b === 'line')
      const { volts } = solveArena(seed, s)
      const raw = blocked ? null : mode === 'ac' ? Math.abs(volts[a] - volts[b]) : ohmsBetween(seed, s, a, b)
      const value = raw === null ? null : Math.round(raw * (mode === 'ac' ? 10 : 100)) / (mode === 'ac' ? 10 : 100)
      const reading: Measurement = { a, b, mode, value, result: blocked ? 'blocked' : value === null ? 'open' : 'reading' }
      const readings = [...s.readings, reading]
      if (blocked) return { ...unsafe(s, 'Safety gate failed. Resistance mode requires proven isolation and downstream terminals.'), readings }
      const isolated = s.isolated || (!s.breaker && mode === 'ac' && value === 0 && pair(a, b, 'fuse-in', 'neutral'))
      const fault = faultFor(seed)
      const diagnosed = s.diagnosed || (!s.fixed && mode === 'ohm' && value === null && (fault !== 'switch' || s.switchOn) && pair(a, b, ...TEST_POINTS[fault]))
      const result = value === null ? 'OL · open path' : `${value.toFixed(mode === 'ac' ? 1 : 2)} ${mode === 'ac' ? 'V AC' : 'Ω'}`
      return { ...s, isolated, isolationProven: s.isolationProven || isolated, diagnosed, readings, message: isolated && !s.isolated ? `${result} · Isolation verified.` : result }
    }
  }
}

export const replayArena = (seed: number, actions: Action[]) => actions.reduce((state, action) => applyAction(seed, state, action), freshArena())
export const arenaPassed = (s: ArenaState) => s.fixed && s.diagnosed && s.tested && s.violations === 0 && s.guesses === 0

export function validTrace(trace: unknown): trace is Action[] {
  return Array.isArray(trace) && trace.length > 0 && trace.length <= TRACE_LIMIT && trace.every((action) => {
    if (!action || typeof action !== 'object') return false
    if (['cover', 'breaker', 'switch', 'test', 'bridge'].includes(action.kind)) return Object.keys(action).length === 1
    if (action.kind === 'repair') return PARTS.includes(action.part) && Object.keys(action).length === 2
    return action.kind === 'probe' && (action.mode === 'ac' || action.mode === 'ohm') && Object.keys(action).length === 4 &&
      TERMINALS.includes(action.a) && TERMINALS.includes(action.b) && action.a !== action.b
  })
}
