// Sound, voice and haptics. All media is pre-rendered and cached; nothing here calls a model.
const M = '/media/flux/'
const cache = new Map<string, HTMLAudioElement>()
let voiceEl: HTMLAudioElement | null = null
let loop: HTMLAudioElement | null = null

export const isMuted = () => localStorage.getItem('flux:mute') === '1'
export function setMuted(v: boolean) {
  localStorage.setItem('flux:mute', v ? '1' : '0')
  if (v) { voiceEl?.pause(); loop?.pause() }
  dispatchEvent(new Event('flux:mute'))
}

function el(src: string) {
  let a = cache.get(src)
  if (!a) { a = new Audio(src); a.preload = 'auto'; cache.set(src, a) }
  return a
}

export type Sfx = 'zap' | 'alarm' | 'powerup' | 'combo' | 'wrong' | 'frost' | 'ding' | 'whoosh' | 'tick' | 'boom' | 'buzz'
const LEGACY: Partial<Record<Sfx, string>> = { ding: '/media/sfx/ding.m4a', whoosh: '/media/sfx/whoosh.m4a', tick: '/media/sfx/tick.m4a', boom: '/media/sfx/boom.m4a', buzz: '/media/sfx/buzz.m4a' }

export function sfx(name: Sfx, volume = 0.6) {
  if (isMuted()) return
  const src = LEGACY[name] ?? `${M}sfx_${name}.m4a`
  const a = el(src).cloneNode() as HTMLAudioElement
  a.volume = volume
  void a.play().catch(() => {})
}

export function voice(id: string, onEnd?: () => void) {
  voiceEl?.pause()
  if (isMuted()) { onEnd?.(); return }
  const a = new Audio(`${M}vo_${id}.m4a`)
  voiceEl = a
  a.volume = 1
  if (onEnd) a.onended = onEnd
  void a.play().catch(() => onEnd?.())
}
export function stopVoice() { voiceEl?.pause(); voiceEl = null }

export function hum(on: boolean, volume = 0.15) {
  if (!on || isMuted()) { loop?.pause(); return }
  if (!loop) { loop = new Audio(`${M}sfx_hum.m4a`); loop.loop = true }
  loop.volume = volume
  void loop.play().catch(() => {})
}

export function haptic(p: number | number[]) {
  try { navigator.vibrate?.(p) } catch { /* not supported */ }
}

export const media = (name: string) => M + name
