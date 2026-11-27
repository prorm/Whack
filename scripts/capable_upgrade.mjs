import { createHash, createPrivateKey, createPublicKey, generateKeyPairSync, randomInt, randomUUID, sign } from 'node:crypto'
import { ARENA_VERSION, arenaPassed, faultFor, replayArena, validTrace } from '../app/src/capable/arena.ts'
import { gradeSolar, readProfile, SOLAR_VERSION, validSolarAnswer } from '../app/src/capable/solar.ts'
import { GeminiError } from './capable_gemini.mjs'
import { spawn } from 'node:child_process'
import { resolve } from 'node:path'
import { CODE_VERSION, VARIANTS, incidentLog, starterCode, testCases, validCode, verifiedVariant } from '../app/src/os/codelab.ts'
import { DATA_VERIFIED, DATA_VERSION, gradeData, ledgerFor, validDataAnswer } from '../app/src/os/datalab.ts'
import { AI_VERSION, aiCodeTicket, aiTradeTicket, gradeAiCode, gradeAiTrade, validAiCodeAnswer, validAiTradeAnswer } from '../app/src/os/aipair.ts'
import { CAP } from '../app/src/os/taxonomy.ts'

const SANDBOX = resolve(import.meta.dirname, 'codelab_sandbox.mjs')
const HARNESS = resolve(import.meta.dirname, '../app/src/os/codelab.ts')
/** Run learner code in a permission-restricted child process with a hard kill. */
export function runSandboxed(code, variant, seed) {
  return new Promise((done) => {
    const child = spawn(process.execPath, ['--permission', '--disallow-code-generation-from-strings', `--allow-fs-read=${SANDBOX}`, `--allow-fs-read=${HARNESS}`,
      '--max-old-space-size=64', SANDBOX], { stdio: ['pipe', 'pipe', 'ignore'], timeout: 4000, windowsHide: true })
    let out = ''
    child.stdout.on('data', (d) => { out += d; if (out.length > 200_000) child.kill() })
    child.on('error', () => done(null))
    child.on('close', () => { try { done(JSON.parse(out)) } catch { done(null) } })
    child.stdin.end(JSON.stringify({ code, variant, seed }))
  })
}

const UUID = /^[a-f0-9-]{36}$/
const digest = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex')

export function capableUpgrade(db, gemini) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS capable_issuer (id INTEGER PRIMARY KEY CHECK (id=1), secret TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS capable_trial (
      id TEXT PRIMARY KEY, device TEXT NOT NULL, kind TEXT NOT NULL, seed INTEGER NOT NULL,
      version INTEGER NOT NULL, profile TEXT, receipt TEXT, share TEXT UNIQUE, shared_at INTEGER, revoked INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS capable_device ON capable_trial(device);
    CREATE TABLE IF NOT EXISTS capable_share (
      token TEXT PRIMARY KEY, trial TEXT NOT NULL, at INTEGER NOT NULL, revoked INTEGER NOT NULL DEFAULT 0
    );
    INSERT OR IGNORE INTO capable_share(token,trial,at,revoked)
      SELECT share,id,shared_at,revoked FROM capable_trial WHERE share IS NOT NULL;
  `)
  const selectKey = db.prepare('SELECT secret FROM capable_issuer WHERE id=1')
  if (!selectKey.get()) {
    const { privateKey } = generateKeyPairSync('ed25519')
    db.prepare('INSERT OR IGNORE INTO capable_issuer VALUES (1,?)').run(privateKey.export({ type: 'pkcs8', format: 'pem' }))
  }
  const secret = createPrivateKey(selectKey.get().secret)
  const key = createPublicKey(secret).export({ type: 'spki', format: 'der' })
  const publicKey = key.toString('base64url')
  const keyId = createHash('sha256').update(key).digest('hex').slice(0, 20)
  const create = db.prepare('INSERT INTO capable_trial(id,device,kind,seed,version,profile) VALUES (?,?,?,?,?,?)')
  const own = db.prepare('SELECT * FROM capable_trial WHERE id=? AND device=?')
  const last = db.prepare('SELECT seed FROM capable_trial WHERE device=? AND kind=? ORDER BY rowid DESC LIMIT 1')
  const recent = db.prepare('SELECT receipt,share,revoked FROM capable_trial WHERE device=? AND receipt IS NOT NULL ORDER BY rowid DESC LIMIT 40')
  const finish = db.prepare('UPDATE capable_trial SET receipt=? WHERE id=? AND receipt IS NULL')
  const share = db.prepare('UPDATE capable_trial SET share=?,shared_at=?,revoked=0 WHERE id=?')
  const newPublic = db.prepare('INSERT INTO capable_share(token,trial,at) VALUES (?,?,?)')
  const revoke = db.prepare('UPDATE capable_trial SET revoked=1 WHERE id=?')
  const revokePublic = db.prepare('UPDATE capable_share SET revoked=1 WHERE trial=?')
  const publicView = db.prepare('SELECT t.receipt,s.revoked,s.at FROM capable_share s JOIN capable_trial t ON t.id=s.trial WHERE s.token=?')

  return {
    public(path) {
      if (path === '/api/capable/key') return [200, { keyId, publicKey }]
      const token = path.split('/').at(-1)
      if (!path.startsWith('/api/capable/public/') || !UUID.test(token)) return [404, { error: 'Proof link not found.' }]
      const row = publicView.get(token)
      if (!row) return [404, { error: 'Proof link not found.' }]
      if (row.revoked) return [410, { error: 'The learner revoked this proof link.' }]
      return [200, { receipt: JSON.parse(row.receipt), token, at: row.at }]
    },
    async handle(path, device, body) {
      if (path === 'models') return [200, gemini.status()]
      try {
        if (path === 'lens') return [200, await gemini.lens(body.media)]
        if (path === 'decision') return [200, await gemini.decision(body.text, body.task)]
        if (path === 'mentor') return [200, await gemini.mentor(body)]
        if (path === 'compile') {
          if (!gemini.compile) return [503, { error: 'AI proposal is unavailable. The deterministic compiler result stands.' }]
          const result = await gemini.compile(body.text, Object.keys(CAP))
          return [200, { ...result, capabilities: result.capabilities.filter((c) => CAP[c.id]) }]
        }
      } catch (error) {
        if (error instanceof GeminiError) return [error.status, { error: error.message }]
        throw error
      }
      if (path === 'records') return [200, { records: recent.all(device).map((row) => ({ receipt: JSON.parse(row.receipt), token: row.revoked ? null : row.share })) }]
      if (path === 'start') {
        const { kind } = body
        if (!['solar', 'arena', 'code', 'data', 'aicode', 'aitrade'].includes(kind)) return [400, { error: 'Choose an available assessment.' }]
        const profile = kind === 'solar' ? readProfile(body.profile) : null
        if (kind === 'solar' && !profile) return [400, { error: 'The solar inputs need confirmation.' }]
        const previous = last.get(device, kind)?.seed
        let seed = randomInt(1, 0x1_0000_0000)
        const sameCase = (a, b) => kind === 'aicode' ? verifiedVariant(a) === verifiedVariant(b) : kind === 'aitrade' ? faultFor(a) === faultFor(b) : kind === 'arena' ? faultFor(a) === faultFor(b) : kind === 'code' ? verifiedVariant(a) === verifiedVariant(b) : kind === 'data' ? a === b : a % 1404 === b % 1404
        while (previous !== undefined && sameCase(seed, previous)) seed = randomInt(1, 0x1_0000_0000)
        const version = { arena: ARENA_VERSION, solar: SOLAR_VERSION, code: CODE_VERSION, data: DATA_VERSION, aicode: AI_VERSION, aitrade: AI_VERSION }[kind]
        const id = randomUUID()
        create.run(id, device, kind, seed, version, profile && JSON.stringify(profile))
        // CodeLab keeps its seed on the server: the learner gets the incident, the starter code and the visible tests only.
        if (kind === 'code') {
          const variant = verifiedVariant(seed)
          return [201, { id, seed: 0, version, variant, starter: starterCode(variant), logs: incidentLog(variant, seed),
            visible: testCases(variant, seed).filter((c) => !c.hidden), hidden: testCases(variant, seed).filter((c) => c.hidden).length }]
        }
        // AI Pair keeps its seed on the server too: the learner gets the brief, the assistant's answer and the options.
        // The assistant's suggestions are our own fixed code, so they run with the default loader, not the sandbox.
        if (kind === 'aicode') return [201, { id, seed: 0, version, ticket: aiCodeTicket(verifiedVariant(seed), seed) }]
        if (kind === 'aitrade') return [201, { id, seed: 0, version, ticket: aiTradeTicket(seed) }]
        if (kind === 'data') return [201, { id, seed: 0, version, variant: DATA_VERIFIED, rows: ledgerFor(DATA_VERIFIED, seed) }]
        return [201, { id, seed, version, ...(profile ? { profile } : {}) }]
      }
      if (!['grade', 'share', 'revoke'].includes(path)) return [404, { error: 'Capability route not found.' }]
      const row = typeof body.id === 'string' && UUID.test(body.id) ? own.get(body.id, device) : null
      if (!row) return [404, { error: 'This assessment ticket was not issued to this learner.' }]
      if (path === 'revoke' || path === 'share') {
        db.exec('BEGIN IMMEDIATE')
        try {
          const live = own.get(row.id, device)
          let result
          if (path === 'revoke') {
            revoke.run(row.id); revokePublic.run(row.id); result = [200, { revoked: true }]
          } else if (!live.receipt || !JSON.parse(live.receipt).record.passed) {
            result = [409, { error: 'Pass a server-verified trial before sharing.' }]
          } else if (live.share && !live.revoked) {
            result = [200, { token: live.share, at: live.shared_at }]
          } else {
            const token = randomUUID(), at = Date.now()
            newPublic.run(token, row.id, at); share.run(token, at, row.id)
            result = [200, { token, at }]
          }
          db.exec('COMMIT')
          return result
        } catch (error) { db.exec('ROLLBACK'); throw error }
      }
      if (row.receipt) return [200, JSON.parse(row.receipt)]
      const base = { id: row.id, seed: row.seed, version: row.version, at: Date.now() }
      let record
      if (row.kind === 'arena') {
        if (row.version !== ARENA_VERSION || !validTrace(body.trace)) return [400, { error: 'Invalid practical action trace.' }]
        const state = replayArena(row.seed, body.trace)
        record = { ...base, kind: 'arena', fault: faultFor(row.seed), passed: arenaPassed(state), digest: digest(body.trace),
          violations: state.violations, isolationProven: state.isolationProven, guesses: state.guesses, tested: state.tested, trace: body.trace, readings: state.readings }
      } else if (row.kind === 'code') {
        if (row.version !== CODE_VERSION || !validCode(body.code)) return [400, { error: 'Submit the handler source (under 12,000 characters).' }]
        const variant = verifiedVariant(row.seed)
        const results = await runSandboxed(body.code, variant, row.seed)
        if (!Array.isArray(results)) return [422, { error: 'The submission did not finish inside the sandbox (time or memory limit). Nothing was recorded; try again.' }]
        const report = typeof body.report === 'string' ? body.report.slice(0, 2000) : ''
        record = { ...base, kind: 'code', variant, title: VARIANTS[variant].title, passed: results.length === testCases(variant, row.seed).length && results.every((r) => r.pass),
          tests: results.map((r) => ({ name: r.name, hidden: r.hidden, pass: r.pass })), digest: digest({ code: body.code, report }), code: body.code, report,
          contract: { visible: results.filter((r) => !r.hidden).length, hidden: results.filter((r) => r.hidden).length, timeLimitMs: 4000, network: 'not provided to learner code' } }
      } else if (row.kind === 'aicode') {
        if (row.version !== AI_VERSION || !validAiCodeAnswer(body.answer)) return [400, { error: 'Invalid AI Pair answer.' }]
        const variant = verifiedVariant(row.seed)
        const g = gradeAiCode(variant, row.seed, body.answer)
        record = { ...base, kind: 'aicode', variant, title: VARIANTS[variant].title, passed: g.passed, digest: digest(body.answer), answer: body.answer,
          brief: g.brief, ship: body.answer.ship, shipCorrect: g.shipCorrect, expose: body.answer.expose, exposeCorrect: g.exposeCorrect }
      } else if (row.kind === 'aitrade') {
        if (row.version !== AI_VERSION || !validAiTradeAnswer(body.answer)) return [400, { error: 'Invalid AI Pair answer.' }]
        const g = gradeAiTrade(row.seed, body.answer)
        record = { ...base, kind: 'aitrade', passed: g.passed, digest: digest(body.answer), answer: body.answer, claim: g.claim, fault: g.fault, aiWasRight: g.aiWasRight,
          brief: g.brief, unsafeCorrect: g.unsafeCorrect, claimTested: g.claimTested, verdict: body.answer.verdict, verdictCorrect: g.verdictCorrect, evidenced: g.evidenced, measured: body.answer.measured }
      } else if (row.kind === 'data') {
        if (row.version !== DATA_VERSION || !validDataAnswer(body.answer)) return [400, { error: 'Invalid reconciliation answer.' }]
        const grade = gradeData(DATA_VERIFIED, row.seed, body.answer)
        record = { ...base, kind: 'data', variant: DATA_VERIFIED, passed: grade.passed, digest: digest(body.answer), answer: body.answer,
          missed: grade.missed, wrong: grade.wrong, misreason: grade.misreason, payable: grade.payable }
      } else {
        if (row.version !== SOLAR_VERSION || !validSolarAnswer(body.answer)) return [400, { error: 'Invalid work-order answer.' }]
        const profile = JSON.parse(row.profile)
        const answer = { panels: body.answer.panels, proposal: body.answer.proposal }
        const grade = gradeSolar(profile, row.seed, answer)
        record = { ...base, kind: 'solar', profile, answer, passed: grade.passed, digest: digest({ profile, answer }), panelCount: grade.panelCount, decision: grade.decision }
      }
      const receipt = { record, keyId, signature: sign(null, Buffer.from(JSON.stringify(record)), secret).toString('base64url') }
      return [200, finish.run(JSON.stringify(receipt), row.id).changes ? receipt : JSON.parse(own.get(row.id, device).receipt)]
    },
  }
}
