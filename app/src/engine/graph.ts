// Curated competency graph + canonical percentages ConceptSpec (both hand-authored, in /content).
import graphJson from '../../../content/competency_graph.json' with { type: 'json' }
import conceptJson from '../../../content/concepts/percentages.json' with { type: 'json' }

export interface GraphNode { label: string; kind: string; prereqs: string[] }
export interface DiagnosticItem { id: string; q: string; answer: number }

export const GRAPH = graphJson as unknown as {
  _meta: { version: string }
  nodes: Record<string, GraphNode>
  diagnostics: Record<string, DiagnosticItem[]>
  misconceptions: Record<string, { concept: string; label: string; detect: string }>
}

export type Op = 'pct_of' | 'ratio_pct' | 'pct_change' | 'pct_of_plus_fixed'
export interface PracticeItem { id: string; q: string; op: Op; args: number[]; answer: number }
export interface ConceptSpec {
  _meta: { version: string }
  concept_id: string
  graph_nodes: string[]
  learning_objective: string
  prerequisites: string[]
  essential_facts: string[]
  vocabulary: { term: string; kn: string; symbol?: string }[]
  subtopics: Record<string, { worked_examples: { id: string; text: string; steps: string[]; answer: number }[]; practice: PracticeItem[] }>
  misconceptions: { id: string; subtopic: string; example_wrong: string; repair: string }[]
  assessment_rubric: { criterion: string; points: number }[]
}
export const PERCENT = conceptJson as unknown as ConceptSpec

/** Direct + transitive prerequisites of `id`, in dependency order, excluding `id`. */
export function closure(id: string): string[] {
  const out: string[] = []
  const visit = (n: string) => {
    for (const p of GRAPH.nodes[n]?.prereqs ?? []) {
      if (!out.includes(p)) { visit(p); out.push(p) }
    }
  }
  visit(id)
  return out
}

/** Deterministic calculator: the single source of truth for every percent answer. */
export function compute(op: Op, args: number[]): number {
  const r2 = (x: number) => Math.round(x * 100) / 100
  switch (op) {
    case 'pct_of': return r2((args[1] * args[0]) / 100)
    case 'ratio_pct': return r2((args[0] / args[1]) * 100)
    case 'pct_change': return r2(((args[1] - args[0]) / args[0]) * 100)
    case 'pct_of_plus_fixed': return r2((args[1] * args[0]) / 100 + args[2] * args[3])
  }
}

/** Classify a wrong percent answer into a known misconception (deterministic, no AI). */
export function detectMisconception(op: Op, args: number[], answer: number): string | undefined {
  const near = (a: number, b: number) => Math.abs(a - b) < 0.11
  if (op === 'pct_of') {
    const [pct, base] = args
    if (near(answer, base + pct)) return 'pct_add_instead_of_multiply'
    if (near(answer, base / pct)) return 'pct_divide_by_percent'
    if (near(answer, base * pct)) return 'sheet_percent_no_divide'
  }
  if (op === 'pct_change') {
    const [oldV, newV] = args
    if (near(Math.abs(answer), Math.abs(((newV - oldV) / newV) * 100))) return 'pct_change_wrong_base'
  }
  return undefined
}

/** Seeded variant generator so every attempt / reel can use fresh numbers with a known answer. */
export function rng(seed: number) {
  let s = seed >>> 0 || 1
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
}

export function percentVariant(seed: number, op: Op = 'pct_of'): PracticeItem {
  const r = rng(seed)
  const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]
  if (op === 'pct_change') {
    const oldV = pick([200, 250, 400, 500, 800, 1200])
    const pct = pick([10, 15, 20, 25, -10, -20])
    const newV = oldV + (oldV * pct) / 100
    return { id: `v_ch_${seed}`, q: `Went from ${oldV} to ${newV}. Percent change?`, op, args: [oldV, newV], answer: compute(op, [oldV, newV]) }
  }
  const pct = pick([2, 4, 5, 10, 12, 15, 20, 25])
  const base = pick([300, 400, 600, 800, 1200, 1500, 2400])
  const q = pick([
    `${pct}% of ${base} items were damaged. How many items?`,
    `Commission is ${pct}% on sales of ₹${base}. How much commission?`,
    `${pct}% discount on a bill of ₹${base}. How much is the discount?`,
  ])
  return { id: `v_po_${seed}`, q, op: 'pct_of', args: [pct, base], answer: compute('pct_of', [pct, base]) }
}
