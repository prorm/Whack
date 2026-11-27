import type { Action, Measurement, Part } from './arena.ts'
import type { Profile, SolarAnswer } from './solar.ts'

export type TrialKind = 'solar' | 'arena' | 'code' | 'data' | 'aicode' | 'aitrade'
export type Ticket = { id: string | null; seed: number; version: number }
export type SolarTicket = Ticket & { profile: Profile }
type Base = { id: string; seed: number; version: number; at: number; passed: boolean; digest: string }
export type ArenaRecord = Base & { kind: 'arena'; fault: Part; readings: Measurement[]; isolationProven: boolean; violations: number; guesses: number; tested: boolean; trace: Action[] }
export type SolarRecord = Base & { kind: 'solar'; profile: Profile; answer: SolarAnswer; panelCount: boolean; decision: boolean }
export type CodeRecord = Base & { kind: 'code'; variant: string; title: string; tests: { name: string; hidden: boolean; pass: boolean }[]; code: string; report: string;
  contract: { visible: number; hidden: number; timeLimitMs: number; network: string } }
export type DataRecord = Base & { kind: 'data'; variant: string; answer: { flagged: Record<string, string> }; missed: number; wrong: number; misreason: number; payable: number }
type Brief = { passed: boolean; missing: string[]; leaked: string[]; noise: string[] }
export type AiCodeRecord = Base & { kind: 'aicode'; variant: string; title: string; brief: Brief; ship: string; shipCorrect: boolean; expose: string; exposeCorrect: boolean; answer: unknown }
export type AiTradeRecord = Base & { kind: 'aitrade'; claim: string; fault: string; aiWasRight: boolean; brief: Brief; unsafeCorrect: boolean; claimTested: boolean; verdict: string; verdictCorrect: boolean; evidenced: boolean; measured: string[]; answer: unknown }
export type Receipt = { record: ArenaRecord | SolarRecord | CodeRecord | DataRecord | AiCodeRecord | AiTradeRecord; signature: string; keyId: string }
export type SharedProof = { receipt: Receipt; token: string; at: number }

export async function verifySignature(receipt: Receipt, publicKey: string) {
  try {
    const decode = (value: string) => Uint8Array.from(atob(value.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
    const bytes = decode(publicKey)
    const keyDigest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))
    const id = Array.from(keyDigest, (n) => n.toString(16).padStart(2, '0')).join('').slice(0, 20)
    if (id !== receipt.keyId) return false
    const key = await crypto.subtle.importKey('spki', bytes, { name: 'Ed25519' }, false, ['verify'])
    return crypto.subtle.verify('Ed25519', key, decode(receipt.signature), new TextEncoder().encode(JSON.stringify(receipt.record)))
  } catch { return false }
}
