export type Track = 'inventory' | 'payouts'
export type Posting = { id: string; title: string; organization: string; track: Track; url: string; notes: string }

export const TRACKS = {
  inventory: {
    title: 'Inventory & Stock Assistant', area: 'Retail operations', skill: 'Reconcile stock counts',
    description: 'Find a stock discrepancy, check the spreadsheet formula, and explain the difference.',
    requirement: 'Compare the expected closing stock with the physical count and report the signed difference.',
    time: 'About 10 min', artifact: 'Stock reconciliation worksheet', lessonRoute: 'inventory-learning',
  },
  payouts: {
    title: 'Dispatch & Payout Assistant', area: 'Delivery operations', skill: 'Calculate rider payouts',
    description: 'Check commission and per-order bonuses, then calculate the total owed to three riders.',
    requirement: 'Calculate each rider’s percentage-based commission, add the per-order bonus, and total the payouts.',
    time: 'About 12 min', artifact: 'Rider payout worksheet', lessonRoute: 'path',
  },
} as const

export const INVENTORY_SAMPLE_ID = 'inventory-sample-v1'
export const TRACK_KEYS: Track[] = ['inventory', 'payouts']
export const EMPTY_POSTINGS: Posting[] = []
export const EMPTY_IDS: string[] = []

export function postingUrl(input: string) {
  try {
    const url = new URL(input.trim())
    if (url.protocol !== 'https:' || url.username || url.password) return null
    return url.href
  } catch { return null }
}
