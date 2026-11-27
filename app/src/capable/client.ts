import { deviceToken } from '../api'
import { useEffect, useState } from 'react'
import type { Receipt } from './proof'

export const RECORDS_KEY = 'capable:v2:records'
export type ProofItem = { receipt: Receipt; token: string | null }
export function rememberReceipt(receipt: Receipt) {
  try {
    const items: ProofItem[] = JSON.parse(localStorage.getItem(RECORDS_KEY) ?? '[]')
    if (!items.some((item) => item.receipt.record.id === receipt.record.id))
      localStorage.setItem(RECORDS_KEY, JSON.stringify([{ receipt, token: null }, ...items].slice(0, 40)))
  } catch { /* The server remains the source of the signed record. */ }
}

export async function capableRequest<T>(path: string, body: unknown) {
  const response = await fetch(`/api/capable/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deviceToken()}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(24_000),
  })
  if (!response.ok) {
    const info = await response.json().catch(() => null)
    throw new Error(info?.error ?? 'The CAPABLE server is unavailable.')
  }
  return response.json() as Promise<T>
}

export function useLocal<T>(key: string, initial: T) {
  const [value, set] = useState<T>(() => {
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? initial } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* Keep the active session usable. */ } }, [key, value])
  return [value, set] as const
}

export const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0] || 1
export const errorText = (error: unknown) => error instanceof Error ? error.message : 'The request could not finish.'

export async function base64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read the selected file.'))
    reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '')
    reader.readAsDataURL(blob)
  })
}

export async function normalizedPhoto(file: File) {
  if (file.size > 15_000_000 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) throw new Error('Choose a JPG, PNG or WebP image under 15 MB.')
  const image = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas'), scale = Math.min(1, 1280 / Math.max(image.width, image.height))
    canvas.width = Math.max(1, Math.round(image.width * scale))
    canvas.height = Math.max(1, Math.round(image.height * scale))
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const result = canvas.toDataURL('image/jpeg', 0.74)
    if (result.length > 525_000) throw new Error('Crop the photo closer to the label.')
    return result
  } finally { image.close() }
}

/** Encode a bounded, mono 16 kHz recording for the server's PCM validator. */
export async function voiceWav(blob: Blob) {
  const decoder = new AudioContext()
  let original: AudioBuffer
  try { original = await decoder.decodeAudioData(await blob.arrayBuffer()) } finally { await decoder.close() }
  const length = Math.max(1, Math.min(16 * 16000, Math.floor(original.duration * 16000)))
  const offline = new OfflineAudioContext(1, length, 16000)
  const input = offline.createBufferSource(); input.buffer = original; input.connect(offline.destination); input.start()
  const samples = (await offline.startRendering()).getChannelData(0)
  const wav = new ArrayBuffer(samples.length * 2 + 44), data = new DataView(wav)
  const write = (start: number, text: string) => [...text].forEach((char, i) => data.setUint8(start + i, char.charCodeAt(0)))
  write(0, 'RIFF'); data.setUint32(4, wav.byteLength - 8, true); write(8, 'WAVEfmt ')
  data.setUint32(16, 16, true); data.setUint16(20, 1, true); data.setUint16(22, 1, true)
  data.setUint32(24, 16000, true); data.setUint32(28, 32000, true); data.setUint16(32, 2, true); data.setUint16(34, 16, true)
  write(36, 'data'); data.setUint32(40, samples.length * 2, true)
  samples.forEach((sample, i) => data.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, sample)) * 32767), true))
  return { mimeType: 'audio/wav', data: await base64(new Blob([wav], { type: 'audio/wav' })) }
}
