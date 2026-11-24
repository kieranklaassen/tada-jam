import type { Id } from './cast'
import type { Game } from './game'
import { handPose, type HandPose } from './guidance'
import { EASEL, KEY, MAESTRO, headOf, inRoom, type P3 } from './layout'
import { seated } from './table'

// What the idle ladder shows: one press of a ghost hand, on whatever the
// child has not tried yet. First the painter, since what he paints is the
// whole joke; then a turn; then calling one over; and the table's key once
// something has been painted and it stands up. The picture is never the
// hand's to plan: it turns whoever is nearest, whichever way that faces.

export type Demo = 'paint' | 'turn' | 'bring' | 'key'

export function nextDemo(game: Game, index: number): Demo {
  const order: Demo[] = game.table.painted ? ['turn', 'paint', 'bring'] : ['paint', 'turn', 'bring']
  if (game.table.painted && game.keyUp > 0.9) order.push('key')
  const fresh = order.filter((demo) => !game.done.has(demo) && (demo !== 'paint' || !game.table.painted))
  // Turn and paint by turns when everything has been found.
  const list = fresh.length > 0 ? fresh : (['turn', 'paint'] as Demo[])
  return list[index % list.length]
}

/** Whoever stands nearest the child on the table. */
export const nearest = (game: Game): Id => seated(game.table).sort((a, b) => game.poses[b].z - game.poses[a].z || game.poses[a].x - game.poses[b].x)[0]
/** The one waiting lowest on the steps, or null. */
export function waiting(game: Game): Id | null {
  return [...game.table.homes].sort((a, b) => (a ? game.poses[a].y : 9) - (b ? game.poses[b].y : 9))[0] ?? null
}

export function demoAt(game: Game, demo: Demo): P3 | null {
  if (demo === 'paint') return { x: MAESTRO.x - 0.1, y: 3.1, z: MAESTRO.z + 1.2 }
  if (demo === 'key') return { x: KEY.x, y: KEY.y + 0.6, z: KEY.z + 0.3 }
  const id = demo === 'turn' ? nearest(game) : waiting(game)
  if (!id) return null
  const pose = game.poses[id]
  return inRoom({ x: pose.x, y: pose.y, z: pose.z + 1.1 }, 0, 0, headOf(id) * 0.6, 0)
}

const pose: HandPose = { travel: 0, press: 0, opacity: 0 }
export function handAt(game: Game, demo: Demo, progress: number): { x: number; y: number; z: number; press: number; opacity: number } | null {
  const at = demoAt(game, demo)
  if (!at) return null
  handPose(progress, false, pose, 1)
  return { ...at, press: pose.press, opacity: pose.opacity }
}

/** Where the glow lies: the one thing that is wanted. */
export function glowAt(game: Game): { x: number; y: number; z: number; r: number; flat: boolean } {
  if (!game.table.painted) return { x: EASEL.x * 0.4, y: 3.2, z: MAESTRO.z + 1.1, r: 2.5, flat: false }
  const p = game.poses[nearest(game)]
  return { x: p.x, y: p.y + 0.05, z: p.z, r: 1.75, flat: true }
}
