import type { Id } from './cast'
import type { Game } from './game'
import { handPose, type HandPose } from './guidance'
import { KEY, MAESTRO, headOf, inRoom, type P3 } from './layout'
import { seated } from './table'

// What the idle ladder shows: one press of a ghost hand, on the next step of
// the round. Somebody on the table changes, he paints it, somebody changes.
// What is found by the way (calling one over, the table's key) comes in where
// somebody changes. The picture is never the hand's to plan: it turns whoever
// is nearest, whichever way that faces.

export type Demo = 'paint' | 'turn' | 'bring' | 'key'

export function nextDemo(game: Game, index: number): Demo {
  // A bare easel waits for a picture. A picture that stands shown is of the table as it is, so the table is to change.
  const changes: Demo[] = []
  if (game.done.has('turn')) {
    if (!game.done.has('bring') && waiting(game)) changes.push('bring')
    else if (!game.done.has('key') && game.keyUp > 0.9) changes.push('key')
  }
  changes.push('turn')
  const list: Demo[] = game.table.finished ? changes : ['paint', ...changes]
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

/** Where the glow lies: on the one thing the hand will show first. */
export function glowAt(game: Game, demo: Demo = nextDemo(game, 0)): { x: number; y: number; z: number; r: number; flat: boolean } {
  if (demo === 'paint') return { x: MAESTRO.x - 0.5, y: 3.4, z: MAESTRO.z - 1.1, r: 3.4, flat: false }
  if (demo === 'key') return { x: KEY.x, y: KEY.y, z: KEY.z, r: 1.5, flat: false }
  const p = game.poses[(demo === 'bring' ? waiting(game) : null) ?? nearest(game)]
  return { x: p.x, y: p.y + 0.05, z: p.z, r: 2.15, flat: true }
}
