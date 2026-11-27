import { readFile, mkdir } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { loadEnvFile } from 'node:process'
import { DatabaseSync } from 'node:sqlite'
import { createGemini, makeBudget } from './capable_gemini.mjs'
import { FIELD_IDS, sampleObservations } from '../app/src/capable/solar.ts'

const root = resolve(import.meta.dirname, '..')
try { loadEnvFile(resolve(root, '.env')) } catch (error) { if (error.code !== 'ENOENT') throw error }
await mkdir(resolve(root, 'app/.data'), { recursive: true })
const db = new DatabaseSync(resolve(root, 'app/.data/capable-gemini.sqlite'))
db.exec('PRAGMA busy_timeout=5000; PRAGMA synchronous=FULL;')
const budget = makeBudget(db, Number(process.env.CAPABLE_GEMINI_BUDGET_USD ?? process.env.MAX_TEST_BUDGET_USD ?? 4.75))
const ai = createGemini({ budget })
const requested = process.argv.slice(2)
const jobs = []

for (const [label, covered] of [['ridge', false], ['ridge', true], ['summit', false]]) {
  if (requested.length && !requested.includes('lens') && !(label === 'ridge' && !covered && requested.includes('lens-one'))) break
  jobs.push([`lens ${label}${covered ? ' covered' : ''}`, async () => {
    const image = await readFile(resolve(root, `app/src/capable/${label}${covered ? '-covered' : ''}.jpg`))
    const output = await ai.lens({ mimeType: 'image/jpeg', data: image.toString('base64') })
    const expected = sampleObservations(label, covered)
    const values = Object.fromEntries(FIELD_IDS.map((key) => [key, output.observations[key].value]))
    const matches = FIELD_IDS.every((key) => values[key] === expected[key].value)
    return { passed: matches, values }
  }])
}
if (!requested.length || requested.includes('decision')) jobs.push(['decision', async () => {
  const output = await ai.decision('Since the temperature coefficient is negative, making the cell colder decreases the voltage.')
  return { passed: output.choice === 'direction', choice: output.choice, confidence: output.confidence }
}])
if (!requested.length || requested.includes('mentor')) jobs.push(['mentor', async () => {
  const output = await ai.mentor({ lang: 'kn', text: 'ತಂಪಾದಾಗ ವೋಲ್ಟೇಜ್ ಏಕೆ ಹೆಚ್ಚುತ್ತದೆ?' })
  return { passed: /[\u0C80-\u0CFF]/.test(output.note), tool: output.tool }
}])
if (requested.includes('audio')) jobs.push(['mentor synthetic audio', async () => {
  const pcm = execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', "flite=text='Cold raises open circuit voltage':voice=slt",
    '-t', '6', '-ar', '16000', '-ac', '1', '-f', 's16le', 'pipe:1'], { windowsHide: true })
  const header = Buffer.alloc(44)
  header.write('RIFF'); header.writeUInt32LE(pcm.length + 36, 4); header.write('WAVEfmt ', 8)
  header.writeUInt32LE(16, 16); header.writeUInt16LE(1, 20); header.writeUInt16LE(1, 22)
  header.writeUInt32LE(16000, 24); header.writeUInt32LE(32000, 28); header.writeUInt16LE(2, 32); header.writeUInt16LE(16, 34)
  header.write('data', 36); header.writeUInt32LE(pcm.length, 40)
  const output = await ai.mentor({ lang: 'en', text: '', media: { mimeType: 'audio/wav', data: Buffer.concat([header, pcm]).toString('base64') } })
  return { passed: /cold.*voltage/i.test(output.transcript), transcript: output.transcript, tool: output.tool }
}])

console.log(JSON.stringify({ config: ai.status() }))
for (const [name, run] of jobs) {
  const start = Date.now()
  try {
    const result = await run()
    console.log(JSON.stringify({ name, ...result, ms: Date.now() - start }))
    if (!result.passed) process.exitCode = 1
  } catch (error) {
    console.log(JSON.stringify({ name, passed: false, error: error.message, ms: Date.now() - start }))
    process.exitCode = 1
  }
}
console.log(JSON.stringify({ budget: budget.summary(), ledger: db.prepare('SELECT model,outcome,input_tokens,output_tokens FROM capable_gemini_calls ORDER BY id DESC LIMIT 19').all() }))
db.close()
