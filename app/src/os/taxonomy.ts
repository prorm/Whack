// The cross-industry capability graph. One shared vocabulary for employers, learners, educators and organizers.
// Pure data. The requirement compiler matches employer text against `terms`; the path planner walks `prereqs`;
// `proof` names the only thing that can turn a capability into evidence. 'pending' means no validated
// assessment exists yet, and the product must say so instead of pretending.
import type { CompetencyId } from '../flux/skills.ts'

export type Domain = 'software' | 'cloud' | 'data' | 'energy' | 'electrical' | 'operations' | 'communication'
export type ProofKind = 'codelab' | 'datalab' | 'arena' | 'forge' | 'flux' | 'human' | 'in_person' | 'pending'
export type Lab = 'CodeLab' | 'DataLab' | 'TradeLab' | 'InfraLab' | 'PeopleLab' | 'CreativeLab'

export interface Capability {
  id: string
  title: string
  domain: Domain
  prereqs: string[]
  /** lower-case phrases an employer might write; matched on word boundaries */
  terms: string[]
  proof: { kind: ProofKind; label: string; flux?: CompetencyId; variant?: string }
  /** the reusable environment that hosts practice and proof, if one exists */
  lab?: Lab
  learn?: { label: string; href: string }
  hours: number
  hazardous?: boolean
}

export const DOMAIN_LABEL: Record<Domain, string> = {
  software: 'Software engineering', cloud: 'Cloud & infrastructure', data: 'Data & analytics', energy: 'Renewable energy',
  electrical: 'Electrical trades', operations: 'Business operations', communication: 'Communication',
}

const code = (label: string, variant?: string) => ({ kind: 'codelab' as const, label, variant })
const data = (label: string) => ({ kind: 'datalab' as const, label })
const pending = { kind: 'pending' as const, label: 'No validated assessment yet' }

export const CAPABILITIES: Capability[] = [
  // ---------------------------------------------------------------- software
  { id: 'programming', title: 'Programming fundamentals', domain: 'software', prereqs: [], hours: 20, lab: 'CodeLab',
    terms: ['python', 'javascript', 'typescript', 'programming', 'coding', 'write code', 'java', 'node.js', 'nodejs'],
    proof: code('Any CodeLab work sample'), learn: { label: 'CodeLab briefing', href: '#/codelab' } },
  { id: 'http-apis', title: 'HTTP & REST APIs', domain: 'software', prereqs: ['programming'], hours: 6, lab: 'CodeLab',
    terms: ['rest api', 'rest apis', 'restful', 'api', 'apis', 'http', 'endpoint', 'endpoints', 'webhook', 'webhooks', 'status code', 'status codes'],
    proof: code('CodeLab payment API work sample'), learn: { label: 'CodeLab briefing: webhooks and status codes', href: '#/codelab' } },
  { id: 'log-analysis', title: 'Reading logs & tracing failures', domain: 'software', prereqs: ['programming'], hours: 4, lab: 'CodeLab',
    terms: ['logs', 'log', 'logging', 'observability', 'monitoring', 'trace', 'tracing', 'alerts', 'system monitoring'],
    proof: code('CodeLab incident logs'), learn: { label: 'CodeLab briefing: read the incident log', href: '#/codelab' } },
  { id: 'api-debugging', title: 'API debugging & error handling', domain: 'software', prereqs: ['http-apis', 'log-analysis'], hours: 8, lab: 'CodeLab',
    terms: ['debug', 'debugging', 'fix bugs', 'fixing bugs', 'bug', 'bugs', 'api errors', 'error handling', 'errors', 'failed transactions', 'failed payment', 'failed payments'],
    proof: code('Unseen CodeLab repair, hidden tests'), learn: { label: 'Guided CodeLab incident', href: '#/codelab' } },
  { id: 'regression-testing', title: 'Testing without regressions', domain: 'software', prereqs: ['programming'], hours: 6, lab: 'CodeLab',
    terms: ['testing', 'unit test', 'unit tests', 'tests', 'regression', 'regressions', 'test cases', 'qa', 'edge cases'],
    proof: code('Hidden regression suite in CodeLab'), learn: { label: 'CodeLab: run the visible tests', href: '#/codelab' } },
  { id: 'payments-idempotency', title: 'Idempotent payment handling', domain: 'software', prereqs: ['http-apis'], hours: 4, lab: 'CodeLab',
    terms: ['duplicate charges', 'duplicate charge', 'charged twice', 'idempotent', 'idempotency', 'payment transactions', 'payments', 'payment'],
    proof: { kind: 'flux', label: 'Unseen duplicate-webhook check', flux: 'pay.idempotency' }, learn: { label: 'Payments story lesson', href: '#/flux-pay' } },
  { id: 'retries', title: 'Retries, timeouts & backoff', domain: 'software', prereqs: ['http-apis'], hours: 3,
    terms: ['retry', 'retries', 'backoff', 'timeouts', 'timeout', 'rate limit', 'rate limits'],
    proof: { kind: 'flux', label: 'Unseen retry-schedule check', flux: 'pay.backoff' }, learn: { label: 'Payments story lesson', href: '#/flux-pay' } },
  { id: 'incident-response', title: 'Production incident troubleshooting', domain: 'software', prereqs: ['api-debugging'], hours: 6, lab: 'CodeLab',
    terms: ['incident', 'incidents', 'incident troubleshooting', 'troubleshoot', 'troubleshooting', 'outage', 'outages', 'on-call', 'production issues', 'investigate', 'investigating'],
    proof: code('Unseen CodeLab incident'), learn: { label: 'Guided CodeLab incident', href: '#/codelab' } },
  { id: 'incident-report', title: 'Incident reports', domain: 'communication', prereqs: ['incident-response'], hours: 2, lab: 'CodeLab',
    terms: ['incident report', 'incident reports', 'postmortem', 'post-mortem', 'technical documentation', 'documentation', 'write up', 'root cause'],
    proof: { kind: 'human', label: 'Trainer review against a rubric' }, learn: { label: 'CodeLab: write the incident report', href: '#/codelab' } },
  { id: 'ai-assisted-debugging', title: 'AI-assisted production debugging', domain: 'software', prereqs: ['api-debugging', 'regression-testing'], hours: 3, lab: 'CodeLab',
    terms: ['ai tools', 'ai-assisted', 'ai assisted', 'ai coding', 'ai pair', 'copilot', 'github copilot', 'llm', 'llms', 'chatgpt', 'generative ai', 'genai', 'prompt engineering', 'coding assistant', 'coding assistants'],
    proof: code('AI Pair: catch the copilot’s regression and prove it with a test'), learn: { label: 'AI Pair · software', href: '#/ailab' } },
  { id: 'ai-data-hygiene', title: 'Safe AI use: no secrets or customer data', domain: 'communication', prereqs: [], hours: 1, lab: 'CodeLab',
    terms: ['responsible ai', 'ai policy', 'ai governance', 'data privacy', 'confidential data', 'data protection'],
    proof: code('AI Pair brief in CodeLab or TradeLab'), learn: { label: 'AI Pair · the four rules', href: '#/ailab' } },
  { id: 'sql', title: 'SQL & databases', domain: 'data', prereqs: [], hours: 12, lab: 'DataLab',
    terms: ['sql', 'database', 'databases', 'schema', 'schemas', 'query', 'queries', 'postgres', 'postgresql', 'mysql', 'joins'],
    proof: { kind: 'pending', label: 'SQL tasks in DataLab are awaiting validation' } },
  { id: 'git', title: 'Version control', domain: 'software', prereqs: ['programming'], hours: 4,
    terms: ['git', 'github', 'version control', 'pull request', 'pull requests', 'code review'], proof: pending },
  { id: 'containers', title: 'Containers', domain: 'cloud', prereqs: ['linux'], hours: 10, lab: 'InfraLab',
    terms: ['docker', 'container', 'containers', 'kubernetes', 'k8s', 'containerised', 'containerized'], proof: pending },
  { id: 'ci-cd', title: 'CI/CD & deployment', domain: 'cloud', prereqs: ['git', 'containers'], hours: 8, lab: 'InfraLab',
    terms: ['ci/cd', 'continuous integration', 'pipeline', 'pipelines', 'deployment', 'deployments', 'deploy', 'release'], proof: pending },

  // ---------------------------------------------------------------- cloud & infrastructure
  { id: 'linux', title: 'Linux administration', domain: 'cloud', prereqs: [], hours: 16, lab: 'InfraLab',
    terms: ['linux', 'unix', 'shell', 'bash', 'command line', 'linux administration'], proof: pending },
  { id: 'networking', title: 'Computer networking', domain: 'cloud', prereqs: [], hours: 14, lab: 'InfraLab',
    terms: ['networking', 'network', 'networks', 'tcp/ip', 'tcp', 'dns', 'routing', 'firewall', 'firewalls'], proof: pending },
  { id: 'virtualization', title: 'Virtualization', domain: 'cloud', prereqs: ['linux', 'networking'], hours: 8, lab: 'InfraLab',
    terms: ['virtualization', 'virtualisation', 'vmware', 'hypervisor', 'virtual machines', 'vms'], proof: pending },
  { id: 'scripting', title: 'Automation scripting', domain: 'cloud', prereqs: ['programming', 'linux'], hours: 8, lab: 'InfraLab',
    terms: ['scripting', 'scripts', 'automation', 'automate', 'powershell'], proof: pending },
  { id: 'cloud-services', title: 'Cloud services', domain: 'cloud', prereqs: ['linux', 'networking'], hours: 12, lab: 'InfraLab',
    terms: ['cloud', 'aws', 'azure', 'gcp', 'cloud services', 'cloud infrastructure', 'infrastructure'], proof: pending },

  // ---------------------------------------------------------------- data & operations
  { id: 'spreadsheets', title: 'Spreadsheets', domain: 'data', prereqs: [], hours: 6, lab: 'DataLab',
    terms: ['excel', 'spreadsheet', 'spreadsheets', 'google sheets', 'formulas', 'pivot'], proof: data('DataLab ledger task'),
    learn: { label: 'DataLab briefing', href: '#/datalab' } },
  { id: 'reconciliation', title: 'Reconciling transactions', domain: 'data', prereqs: ['spreadsheets'], hours: 5, lab: 'DataLab',
    terms: ['reconcile', 'reconciliation', 'reconciling', 'discrepancies', 'discrepancy', 'ledger', 'ledgers', 'mismatch', 'settlement', 'settlements'],
    proof: data('Unseen DataLab reconciliation'), learn: { label: 'DataLab: reconcile a settlement', href: '#/datalab' } },
  { id: 'data-cleaning', title: 'Cleaning messy data', domain: 'data', prereqs: ['spreadsheets'], hours: 5, lab: 'DataLab',
    terms: ['data cleaning', 'clean data', 'messy data', 'duplicates', 'data quality'], proof: data('DataLab duplicate and refund rows'),
    learn: { label: 'DataLab: clean the export', href: '#/datalab' } },
  { id: 'data-insight', title: 'Business insight from data', domain: 'data', prereqs: ['data-cleaning', 'sql'], hours: 8, lab: 'DataLab',
    terms: ['insight', 'insights', 'dashboard', 'dashboards', 'analytics', 'analysis', 'kpi', 'kpis', 'reporting'], proof: pending },
  { id: 'percentages', title: 'Percentages, commissions & payouts', domain: 'operations', prereqs: [], hours: 4,
    terms: ['percentage', 'percentages', 'commission', 'commissions', 'payout', 'payouts', 'margin', 'discount'],
    proof: { kind: 'human', label: 'Reviewed payout worksheet' } },
  { id: 'inventory', title: 'Inventory & stock control', domain: 'operations', prereqs: ['spreadsheets', 'percentages'], hours: 6,
    terms: ['inventory', 'stock', 'warehouse', 'fulfilment', 'fulfillment', 'stock count'],
    proof: { kind: 'human', label: 'Reviewed stock worksheet' } },

  // ---------------------------------------------------------------- energy & electrical (the existing FLUX course and labs)
  { id: 'electrical-basics', title: 'Volts, amps & watts', domain: 'energy', prereqs: [], hours: 1,
    terms: ['voltage', 'volts', 'amps', 'watts', 'electricity', 'electrical basics'],
    proof: { kind: 'flux', label: 'Unseen series & parallel check', flux: 'solar.series' }, learn: { label: 'Lesson 1 · Push, flow and power', href: '#/fl-lesson?id=l1' } },
  { id: 'series-parallel', title: 'Series & parallel wiring', domain: 'energy', prereqs: ['electrical-basics'], hours: 1,
    terms: ['series and parallel', 'series wiring', 'parallel wiring', 'string wiring', 'series strings'],
    proof: { kind: 'flux', label: 'Unseen series & parallel check', flux: 'solar.series' }, learn: { label: 'Lesson 2 · Series and parallel', href: '#/fl-lesson?id=l2' } },
  { id: 'cold-string', title: 'Cold-morning string sizing', domain: 'energy', prereqs: ['series-parallel'], hours: 1, lab: 'TradeLab',
    terms: ['solar', 'solar panels', 'pv', 'string sizing', 'temperature coefficient', 'voc'],
    proof: { kind: 'flux', label: 'Unseen solar work order or Solar Forge receipt', flux: 'solar.cold-max' }, learn: { label: 'Lesson 3 · Cold makes volts', href: '#/fl-lesson?id=l3' } },
  { id: 'mppt-window', title: 'Inverter MPPT window', domain: 'energy', prereqs: ['cold-string'], hours: 1,
    terms: ['inverter', 'inverters', 'mppt'],
    proof: { kind: 'flux', label: 'Unseen MPPT check', flux: 'solar.mppt-min' }, learn: { label: 'Lesson 4 · The inverter window', href: '#/fl-lesson?id=l4' } },
  { id: 'rooftop-design', title: 'Rooftop array design', domain: 'energy', prereqs: ['mppt-window'], hours: 2,
    terms: ['rooftop', 'array design', 'solar design', 'design a safe solar array'],
    proof: { kind: 'flux', label: 'Rooftop project, all checks', flux: 'solar.design' }, learn: { label: 'Project · Mr. Sharma’s roof', href: '#/fl-project' } },
  { id: 'ev-load', title: 'EV charger load planning', domain: 'energy', prereqs: ['electrical-basics'], hours: 1,
    terms: ['ev', 'electric vehicle', 'ev charger', 'charger', 'chargers', 'breaker', 'load balancing'],
    proof: { kind: 'flux', label: 'Unseen EV load work order', flux: 'ev.load' }, learn: { label: 'EV story lesson', href: '#/flux-ev' } },
  { id: 'safe-isolation', title: 'Safe isolation (simulated)', domain: 'electrical', prereqs: ['electrical-basics'], hours: 2, lab: 'TradeLab', hazardous: true,
    terms: ['isolation', 'isolate', 'lockout', 'lock out', 'tagout', 'dead test'],
    proof: { kind: 'arena', label: 'Practical Arena isolation gate (supervised on site)' }, learn: { label: 'Practical Arena', href: '#/capable' } },
  { id: 'fault-diagnosis', title: 'Electrical fault diagnosis', domain: 'electrical', prereqs: ['safe-isolation'], hours: 3, lab: 'TradeLab', hazardous: true,
    terms: ['multimeter', 'fault finding', 'fault diagnosis', 'diagnose faults', 'continuity', 'circuit', 'circuits', 'wiring faults', 'electrical faults'],
    proof: { kind: 'arena', label: 'Unseen Practical Arena fault' }, learn: { label: 'Practical Arena', href: '#/capable' } },
  { id: 'ai-fault-triage', title: 'AI-assisted fault diagnosis (verify before you act)', domain: 'electrical', prereqs: ['fault-diagnosis'], hours: 1, lab: 'TradeLab', hazardous: true,
    terms: ['ai diagnostics', 'ai-assisted diagnosis', 'ai inspection', 'smart diagnostics', 'diagnostic app', 'diagnostic apps'],
    proof: { kind: 'arena', label: 'AI Pair · TradeLab: check the AI’s call with the meter (simulation)' }, learn: { label: 'AI Pair · trades', href: '#/ailab?track=trade' } },
  { id: 'site-safety', title: 'Site electrical safety', domain: 'electrical', prereqs: ['safe-isolation'], hours: 4, hazardous: true,
    terms: ['site safety', 'ppe', 'earthing', 'safety'], proof: { kind: 'in_person', label: 'Supervised check on site only' } },

  // ---------------------------------------------------------------- communication
  { id: 'customer-communication', title: 'Explaining fixes to customers', domain: 'communication', prereqs: [], hours: 3, lab: 'PeopleLab',
    terms: ['customer communication', 'customer-facing', 'customer support', 'customer service', 'complaint', 'complaints', 'stakeholder', 'stakeholders', 'explain fixes', 'explain to customers', 'explain the fix'],
    proof: { kind: 'human', label: 'Reviewed role-play (PeopleLab not built)' } },
]

export const CAP = Object.fromEntries(CAPABILITIES.map((c) => [c.id, c])) as Record<string, Capability>
export const capById = (id: string) => CAP[id]

/** Every prerequisite reachable from `ids`, including `ids`, in an order where prerequisites come first. */
export function closure(ids: string[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const visit = (id: string, path: string[]) => {
    if (seen.has(id) || !CAP[id]) return
    if (path.includes(id)) throw new Error(`prerequisite cycle at ${id}`)
    for (const p of CAP[id].prereqs) visit(p, [...path, id])
    seen.add(id); out.push(id)
  }
  ids.forEach((id) => visit(id, []))
  return out
}

/** Which reusable environments the platform actually ships today. */
export const LABS: { id: Lab; status: 'live' | 'planned'; route?: string; supports: string }[] = [
  { id: 'CodeLab', status: 'live', route: '#/codelab', supports: 'Programming, API debugging, testing, incident response, AI Pair' },
  { id: 'DataLab', status: 'live', route: '#/datalab', supports: 'Spreadsheets, reconciliation, data cleaning, operations' },
  { id: 'TradeLab', status: 'live', route: '#/capable', supports: 'Electrical fault diagnosis, solar sizing, equipment labels, AI Pair' },
  { id: 'InfraLab', status: 'planned', supports: 'Linux, networking, containers, deployment' },
  { id: 'PeopleLab', status: 'planned', supports: 'Customer and stakeholder conversations' },
  { id: 'CreativeLab', status: 'planned', supports: 'Design briefs, accessibility, portfolios' },
]
