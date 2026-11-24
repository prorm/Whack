// Browser-side capture helpers for Field Scars: decode, blur private regions, re-encode (which also strips EXIF/GPS),
// and fingerprint images for duplicate detection. Nothing leaves the device.
import { dhash } from './sieve'

export function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => fail(new Error('Could not read this image')); i.src = url })
}

/** 9×8 grayscale grid → dHash. */
export function fingerprint(img: HTMLImageElement | HTMLCanvasElement): string {
  // two-step, smoothed downsample: compression and rescaling noise must not flip bits
  const m = document.createElement('canvas'); m.width = 72; m.height = 64
  const mx = m.getContext('2d')!
  mx.imageSmoothingEnabled = true; mx.imageSmoothingQuality = 'high'
  mx.filter = 'blur(2px)'
  mx.drawImage(img, 0, 0, 72, 64)
  const c = document.createElement('canvas'); c.width = 9; c.height = 8
  const x = c.getContext('2d', { willReadFrequently: true })!
  x.imageSmoothingEnabled = true; x.imageSmoothingQuality = 'high'
  x.drawImage(m, 0, 0, 9, 8)
  const d = x.getImageData(0, 0, 9, 8).data
  const g: number[] = []
  for (let i = 0; i < 72; i++) g.push(0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2])
  return dhash(g)
}

export interface Blur { x: number; y: number; r: number } // percent of width / height / width
/** Draw at most `max` px on the long side, blur the marked circles, return a JPEG data URL (no metadata survives). */
export function render(img: HTMLImageElement, blurs: Blur[], max = 960, quality = 0.8): string {
  const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight))
  const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k)
  const c = document.createElement('canvas'); c.width = w; c.height = h
  const x = c.getContext('2d')!
  x.drawImage(img, 0, 0, w, h)
  for (const b of blurs) {
    x.save()
    x.beginPath(); x.arc((b.x / 100) * w, (b.y / 100) * h, (b.r / 100) * w, 0, Math.PI * 2); x.clip()
    x.filter = 'blur(18px)'
    x.drawImage(c, 0, 0)
    x.filter = 'none'
    x.fillStyle = 'rgba(40,40,40,.35)'; x.fill()
    x.restore()
  }
  return c.toDataURL('image/jpeg', quality)
}

/** Fingerprints of the images already in the deck, so recycled pictures are caught. */
const KNOWN = ['fault_mc4.webp', 'fault_shade.webp', 'fault_cable.webp', 'ev_panel.webp', 'ev_night.webp', 'dawn.webp', 'noon.webp', 'akka.webp', 'chotu.webp', 'chotu_shock.webp', 'sharma.webp', 'pay.webp']
let known: Promise<{ id: string; hash: string }[]> | null = null
export function knownHashes() {
  known ??= Promise.all(KNOWN.map(async (f) => { try { return { id: f.replace('.webp', ''), hash: fingerprint(await loadImage('/media/flux/' + f)) } } catch { return null } }))
    .then((l) => l.filter((x): x is { id: string; hash: string } => !!x))
  return known
}

export function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result)); r.readAsDataURL(b) })
}
