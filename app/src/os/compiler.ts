// The Work Compiler: employer text → capabilities, tasks, prerequisites and the phrases it could not map.
// Deterministic. It can only name capabilities that exist in the graph; anything else is returned as
// `unmapped` and is shown as awaiting validation, never silently turned into a skill.
import { CAP, CAPABILITIES, closure } from './taxonomy.ts'

export interface Match { id: string; phrases: string[] }
export interface Compiled { matched: Match[]; implied: string[]; tasks: string[]; unmapped: string[] }

const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ')
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')
const TERM_RE = new Map(CAPABILITIES.flatMap((c) => c.terms.map((t) => [t, new RegExp(`(^|[^a-z0-9])${esc(t)}(?=[^a-z0-9]|$)`)] as const)))

const VERBS = /\b(investigat|identif|fix|diagnos|writ|build|deploy|reconcil|design|troubleshoot|explain|monitor|resolv|repair|install|configur|maintain|automat|clean|analy[sz]|size|siz|handle|read|ship|catch|calculat|isolat|debug|test|use|follow|check)/i
const VERB_AT = /\b(investigat|identif|fix|diagnos|writ|build|deploy|reconcil|design|troubleshoot|explain|monitor|resolv|repair|install|configur|maintain|automat|clean|analy[sz]|size|handle|read|ship|catch|calculat|isolat|debug|set up|rotate|follow|check|consume)/i
const FILLER = /^(and|or|with|in|the|a|an|our|we|to|of|for|on|from|be|should|must|able|ability|experience|knowledge|familiarity|strong|good|basic|solid|working|plus|also|now|needs?|requires?|capable|junior|senior|developers?|engineers?|candidates?|people|team|work|using|use|other|etc|including|like|such|as|is|are|can|will)$/

const COMMON = new Set(['a', 'an', 'the', 'our', 'we', 'they', 'from', 'junior', 'senior', 'india', 'bengaluru', 'monday', 'quarter', 'interns', 'team', 'staging', 'environment', 'production', 'new', 'next', 'every', 'each', 'week', 'weekly', 'daily', 'also', 'should', 'must', 'will', 'can', 'this', 'that', 'these', 'those', 'when', 'what', 'who', 'how', 'it', 'its', 'one', 'two', 'three', 'ltd', 'pvt', 'inc'])

export function compileRequirement(text: string): Compiled {
  const t = norm(text)
  const matched: Match[] = []
  for (const c of CAPABILITIES) {
    const phrases = c.terms.filter((term) => TERM_RE.get(term)!.test(t))
    // a longer phrase owns its words: "incident report" should not also count as a bare "incident"
    if (phrases.length) matched.push({ id: c.id, phrases })
  }
  const owned = (term: string, self: string) => matched.some((m) => m.id !== self && m.phrases.some((p) => p !== term && p.includes(term) && p.length > term.length))
  const kept = matched.filter((m) => m.phrases.some((p) => !owned(p, m.id)))
  const ids = kept.map((m) => m.id)
  const implied = closure(ids).filter((id) => !ids.includes(id))

  const sentences = text.split(/(?<=[.!?;])\s+|\n+/).map((s) => s.trim().replace(/^[-•*\d.)\s]+/, '')).filter(Boolean)
  // A list of duties inside one sentence becomes one task per duty, starting at its verb.
  const tasks = sentences.flatMap((s) => {
    const clauses: string[] = []
    for (const part of s.split(/,\s*|\s+and\s+|;\s*/)) {
      const at = part.search(VERB_AT)
      const text = part.replace(/[.!?]+$/, '').trim()
      if (at >= 0) clauses.push(text.slice(text.search(VERB_AT)))
      else if (clauses.length && text) clauses[clauses.length - 1] += ` and ${text}` // "webhooks and duplicate charges"
    }
    clauses.splice(0, clauses.length, ...clauses.filter((c) => c.split(' ').length >= 2))
    if (clauses.length >= 2) return clauses.map((c) => c[0].toUpperCase() + c.slice(1))
    return VERBS.test(s) && s.split(' ').length >= 3 ? [s] : []
  }).slice(0, 8)

  // Named tools and skills the graph does not know yet (Terraform, Figma, Kafka): capitalised words that are not
  // sentence starts, plus short list items. They are shown as awaiting validation, never mapped by guesswork.
  const allTerms = CAPABILITIES.flatMap((c) => c.terms)
  const known = (w: string) => allTerms.some((term) => term === w || term.split(' ').includes(w) || (w.length > 3 && term.includes(w)))
  const named = [...text.matchAll(/(?<![.!?]\s|^)\b([A-Z][A-Za-z0-9+#]{2,}(?:\.[A-Za-z]+)?)\b/g)].map((m) => m[1])
    .filter((w) => !COMMON.has(w.toLowerCase()) && !known(w.toLowerCase()))
  const listed = t.split(/[,;\n•]|\band\b|\bor\b|\.\s/).map((frag) => frag.trim()
    .split(' ').filter((w) => w && !FILLER.test(w.replace(/[^a-z0-9/+#.-]/g, ''))).join(' ').replace(/[^a-z0-9/+#. -]/g, '').replace(/\.$/, '').trim())
    .filter((frag) => frag.length > 1 && frag.split(' ').length <= 2 && !VERBS.test(frag) && !COMMON.has(frag) && !known(frag))
  const seen = new Set<string>()
  const unmapped = [...named, ...listed].filter((w) => { const k = w.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true }).slice(0, 6)

  return { matched: kept, implied, tasks, unmapped }
}

export interface Requirement { id: string; orgId: string; org: string; role: string; text: string; cluster: string; at: number; change?: string }
export interface Blueprint {
  /** capabilities two or more organizations ask for */
  shared: string[]
  /** capabilities only one organization asks for */
  branches: { req: Requirement; ids: string[] }[]
  /** prerequisites nobody wrote down but the graph requires */
  foundations: string[]
  /** every capability in learning order */
  ordered: string[]
  demand: Record<string, number>
}

export const fullText = (r: Requirement) => r.change ? `${r.text} ${r.change}` : r.text

export function blueprint(reqs: Requirement[]): Blueprint {
  const compiled = reqs.map((req) => ({ req, ids: compileRequirement(fullText(req)).matched.map((m) => m.id) }))
  const demand: Record<string, number> = {}
  compiled.forEach(({ ids }) => ids.forEach((id) => { demand[id] = (demand[id] ?? 0) + 1 }))
  const direct = Object.keys(demand)
  const shared = reqs.length < 2 ? direct : direct.filter((id) => demand[id] >= 2)
  const branches = reqs.length < 2 ? [] : compiled.map(({ req, ids }) => ({ req, ids: ids.filter((id) => demand[id] === 1) }))
  const ordered = closure(direct)
  return { shared, branches, foundations: ordered.filter((id) => !demand[id]), ordered, demand }
}

export function diffBlueprint(before: Blueprint, after: Blueprint) {
  return { added: after.ordered.filter((id) => !before.ordered.includes(id)), removed: before.ordered.filter((id) => !after.ordered.includes(id)) }
}

/** The labs that could host practice for a compiled requirement, and what is left without a validated home. */
export function simulationMatch(ids: string[]) {
  const all = closure(ids)
  const byLab = new Map<string, string[]>()
  const unhosted: string[] = []
  for (const id of all) {
    const lab = CAP[id].lab
    if (lab) byLab.set(lab, [...(byLab.get(lab) ?? []), id])
    else if (CAP[id].proof.kind === 'pending') unhosted.push(id)
  }
  return { byLab, unhosted }
}
