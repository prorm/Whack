import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'

export function missionRoom(task) {
  return { title: task, roles: { 'cataloguer-demo': 'Classify rows', 'calculator-demo': 'Reconcile quantities',
    'verifier-demo': 'Check independently' }, contributions: [], simulation: true }
}

export function note(room, actor, text, id) {
  if (!Object.hasOwn(room.roles, actor)) throw new Error('Unknown role')
  if (!text.trim() || text.length > 500) throw new Error('Give a concise task note')
  if (room.contributions.some((event) => event.id === id)) return room
  return { ...room, contributions: [...room.contributions, { actor, id, text: text.trim(), role: room.roles[actor] }] }
}

export function summary(room) {
  return Object.entries(room.roles).map(([actor, role]) => ({
    actor, role, notes: room.contributions.filter((event) => event.actor === actor).map((event) => event.text),
    status: room.contributions.some((event) => event.actor === actor) ? 'contribution recorded' : 'awaiting contribution',
  }))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  let room = missionRoom('School supply cupboard · simulation')
  room = note(room, 'cataloguer-demo', 'Grouped by school supply SKU.', 'example-1')
  room = note(room, 'calculator-demo', 'Expected 94, counted 80, variance −14.', 'example-2')
  console.log(JSON.stringify({ title: room.title, progress: summary(room) }, null, 2))
}
