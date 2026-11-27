// The device identity and the one JSON POST helper every server call uses.
// The storage key is unchanged from earlier builds, so existing devices keep their records and share links.
const DEVICE = 'scrollproof:device:v1'

export function deviceToken() {
  const existing = localStorage.getItem(DEVICE)
  if (existing) return existing
  const token = crypto.randomUUID()
  localStorage.setItem(DEVICE, token)
  return token
}

export async function request<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + deviceToken() },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(8000),
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error ?? 'The server is unavailable. Your work is saved on this device.')
  }
  return response.json()
}
