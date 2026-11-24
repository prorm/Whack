// The automated slop & safety sieve. Runs on the device before any human sees a submission.
// Honest limits: these are signals, not proof. Missing camera metadata is a warning, never a verdict;
// an AI provenance marker or a duplicate is a block. The 2-of-3 master review still decides.

export type Level = 'block' | 'warn' | 'ok'
export interface Check { id: string; level: Level; label: string; detail: string }

// ---------------------------------------------------------------- image metadata (pure, bytes in)
export interface ImageMeta { make?: string; model?: string; software?: string; c2pa: boolean; aiSourceType: boolean; pngParams: boolean }

const ascii = (b: Uint8Array, from: number, len: number) => { let s = ''; for (let i = 0; i < len && from + i < b.length; i++) { const c = b[from + i]; if (c === 0) break; s += String.fromCharCode(c) } return s }
function findAscii(b: Uint8Array, needle: string, limit = b.length) {
  const n = needle.length, first = needle.charCodeAt(0)
  for (let i = 0; i + n <= Math.min(b.length, limit); i++) {
    if (b[i] !== first) continue
    let ok = true
    for (let j = 1; j < n; j++) if (b[i + j] !== needle.charCodeAt(j)) { ok = false; break }
    if (ok) return i
  }
  return -1
}

/** Reads Make / Model / Software from a JPEG's EXIF IFD0 and scans for C2PA and IPTC "AI-generated" markers. */
export function readMeta(b: Uint8Array): ImageMeta {
  const meta: ImageMeta = {
    c2pa: findAscii(b, 'c2pa', 400_000) >= 0 || findAscii(b, 'jumb', 400_000) >= 0,
    aiSourceType: findAscii(b, 'trainedAlgorithmicMedia') >= 0 || findAscii(b, 'compositeWithTrainedAlgorithmicMedia') >= 0,
    pngParams: b[0] === 0x89 && b[1] === 0x50 && (findAscii(b, 'tEXtparameters', 200_000) >= 0 || findAscii(b, 'iTXtparameters', 200_000) >= 0),
  }
  if (b[0] !== 0xff || b[1] !== 0xd8) return meta
  let p = 2
  while (p + 4 < b.length && b[p] === 0xff) {
    const marker = b[p + 1], len = (b[p + 2] << 8) | b[p + 3]
    if (marker === 0xe1 && ascii(b, p + 4, 4) === 'Exif') {
      const t = p + 10
      const le = b[t] === 0x49
      const u16 = (o: number) => le ? b[t + o] | (b[t + o + 1] << 8) : (b[t + o] << 8) | b[t + o + 1]
      const u32 = (o: number) => le ? (b[t + o] | (b[t + o + 1] << 8) | (b[t + o + 2] << 16) | (b[t + o + 3] << 24)) >>> 0 : ((b[t + o] << 24) | (b[t + o + 1] << 16) | (b[t + o + 2] << 8) | b[t + o + 3]) >>> 0
      const ifd = u32(4), n = u16(ifd)
      for (let i = 0; i < n; i++) {
        const e = ifd + 2 + i * 12, tag = u16(e), count = u32(e + 4)
        const at = count <= 4 ? e + 8 : u32(e + 8)
        const v = ascii(b, t + at, Math.min(count, 64)).trim()
        if (tag === 0x010f) meta.make = v
        if (tag === 0x0110) meta.model = v
        if (tag === 0x0131) meta.software = v
      }
      break
    }
    if (marker === 0xda) break
    p += 2 + len
  }
  return meta
}

/** dHash bits that may differ and still count as the same picture (re-encoded, resized, lightly cropped). */
export const DUPLICATE_BITS = 10

const GENERATORS = /(dall.?e|midjourney|stable.?diffusion|imagen|gemini|firefly|nano.?banana|flux\.1|comfyui|automatic1111|leonardo|ideogram)/i

export function imageChecks(m: ImageMeta, size: { w: number; h: number }, nearest: { id: string; distance: number } | null): Check[] {
  const out: Check[] = []
  if (m.aiSourceType) out.push({ id: 'ai-marker', level: 'block', label: 'AI provenance marker found', detail: 'The file declares itself AI-generated (IPTC trainedAlgorithmicMedia). Field Scars must be real captures.' })
  if (m.software && GENERATORS.test(m.software)) out.push({ id: 'ai-software', level: 'block', label: 'Made by an image generator', detail: `Software tag says "${m.software}".` })
  if (m.pngParams) out.push({ id: 'ai-params', level: 'block', label: 'Diffusion prompt embedded', detail: 'The PNG carries generation parameters.' })
  if (m.c2pa && !m.aiSourceType) out.push({ id: 'c2pa', level: 'warn', label: 'Content Credentials present', detail: 'Reviewers should open the credentials and check who made and edited this image.' })
  if (!m.make && !m.model) out.push({ id: 'no-camera', level: 'warn', label: 'No camera metadata', detail: 'Screenshots, edited, forwarded and AI images all lack it. Not a verdict: reviewers look closer.' })
  else out.push({ id: 'camera', level: 'ok', label: 'Camera metadata', detail: [m.make, m.model].filter(Boolean).join(' ') })
  if (Math.min(size.w, size.h) < 480) out.push({ id: 'res', level: 'block', label: 'Photo too small', detail: `${size.w}×${size.h}. Need at least 480 px on the short side so the fault is visible.` })
  if (nearest && nearest.distance <= DUPLICATE_BITS) out.push({ id: 'dupe', level: 'block', label: 'Duplicate of an existing card', detail: `Near-identical to "${nearest.id}" (difference ${nearest.distance}/64). Recycled images are not new evidence.` })
  else out.push({ id: 'unique', level: 'ok', label: 'Not a known image', detail: nearest ? `Closest card differs by ${nearest.distance}/64.` : 'No cards to compare yet.' })
  return out
}

// ---------------------------------------------------------------- duplicate detection (difference hash)
/** dHash of a 9×8 grayscale grid (72 values, row-major). Returns 16 hex chars. */
export function dhash(gray: number[]): string {
  if (gray.length !== 72) throw new Error('dhash needs 9×8 = 72 values')
  let bits = ''
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) bits += gray[y * 9 + x] > gray[y * 9 + x + 1] ? '1' : '0'
  let hex = ''
  for (let i = 0; i < 64; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
  return hex
}
export function hamming(a: string, b: string) {
  let d = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) { let x = parseInt(a[i], 16) ^ parseInt(b[i], 16); while (x) { d += x & 1; x >>= 1 } }
  return d
}
export function nearestHash(h: string, known: { id: string; hash: string }[]) {
  let best: { id: string; distance: number } | null = null
  for (const k of known) { const d = hamming(h, k.hash); if (!best || d < best.distance) best = { id: k.id, distance: d } }
  return best
}

// ---------------------------------------------------------------- words
const NEGATED = /\b(never|don'?t|do not|avoid|must not|should not|stop)\b/i
/** [pattern, reason, can a "never / don't" earlier in the sentence make it a safety rule instead?] */
const UNSAFE: [RegExp, string, boolean?][] = [
  [/\b(work(ing)?|touch(ing)?)\b[^.]{0,30}\blive\b|\blive (wire|line|work)\b|\bwithout (isolat|switching off|turning off|lockout)/i, 'Describes working live or without isolation.', true],
  [/\b(bypass|jump(er)?|short)\b[^.]{0,25}\b(mcb|rcd|rccb|elcb|breaker|fuse|earth)/i, 'Describes bypassing a protective device.', true],
  [/\b(no|skip|without)\b[^.]{0,15}\b(earth(ing)?|ground(ing)?|ppe|gloves)\b/i, 'Skips earthing or protective equipment.'],
  [/\b(bigger|higher|larger|upsize)\b[^.]{0,20}\b(fuse|mcb|breaker)\b[^.]{0,30}\b(stop|so it (doesn't|does not)|tripping)/i, 'Upsizes a breaker to stop nuisance trips.', true],
  [/\b(disable|turn off|skip)\b[^.]{0,20}\b(verification|signature check|tls|ssl|auth)/i, 'Disables a security check.', true],
]
const GENERATED_TELLS = /\b(as an ai|delve|in conclusion|it'?s important to note|furthermore|in today'?s fast-paced|tapestry|unlock the power|game.?changer|seamless(ly)?)\b/i

export function textChecks(t: { rule: string; wrongBelief: string; why: string }): Check[] {
  const out: Check[] = []
  const all = `${t.rule}. ${t.wrongBelief}. ${t.why}`
  const sentences = all.split(/[.!?\n]+/)
  for (const [re, why, negatable] of UNSAFE) {
    const hit = sentences.some((sn) => { const m = re.exec(sn); return !!m && !(negatable && NEGATED.test(sn.slice(0, m.index + m[0].length))) })
    if (hit) out.push({ id: 'unsafe', level: 'block', label: 'Unsafe procedure', detail: `${why} FLUX never teaches this, even as the "wrong" answer. Rephrase as the hazard to spot.` })
  }
  if (t.rule.trim().length < 12) out.push({ id: 'rule-short', level: 'block', label: 'Rule too short', detail: 'Say what failed and why in one sentence.' })
  if (t.rule.length > 220) out.push({ id: 'rule-long', level: 'block', label: 'Rule too long', detail: 'One rule per card, under 220 characters.' })
  if (t.wrongBelief.trim().length < 8) out.push({ id: 'belief', level: 'block', label: 'Missing wrong belief', detail: 'What do juniors believe that causes this? It becomes the Cap-or-Fact card.' })
  if (GENERATED_TELLS.test(all)) out.push({ id: 'tells', level: 'warn', label: 'Reads like generated text', detail: 'Heuristic only. Write it the way you would say it on site.' })
  if (!out.some((c) => c.level === 'block')) out.push({ id: 'words', level: 'ok', label: 'Words pass', detail: 'No unsafe procedure detected (keyword screen, reviewers still check).' })
  return out
}

export function verdict(checks: Check[]): Level {
  return checks.some((c) => c.level === 'block') ? 'block' : checks.some((c) => c.level === 'warn') ? 'warn' : 'ok'
}
