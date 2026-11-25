import type { Guidance } from './guidance'
import { QUILT, SIZE } from './layout'
import type { Point } from './play'
import type { Village } from './village'

// What the hand shows a child who has not touched anything for a while: a
// move that could be made now, never an answer. Shake the quilt over the bare
// grass in front of whoever asks; every other time, tap them.

export type Move = { from: Point; to: Point; drag: boolean; on: 'quilt' | 'body' }

export function moveToShow(v: Village, _guidance: Guidance | null = null): Move {
  const q = v.quilt
  const mid = { x: q.x, y: q.hem + 1.2 }
  const tapQuilt: Move = { from: mid, to: mid, drag: false, on: 'quilt' }
  if (q.empty || v.night) return tapQuilt
  const asker = v.asker
  if (!asker) return tapQuilt
  const end = Math.min(QUILT.right, Math.max(QUILT.left, v.snowEnds(asker.x) + 1.2))
  // Snow all the way down in front: a tap sends it off.
  if (end > 5) {
    const on = { x: asker.x, y: asker.y + SIZE[asker.id].tall / 2 }
    return { from: on, to: on, drag: false, on: 'body' }
  }
  if (Math.abs(end - q.x) < 1.6) return tapQuilt
  return { from: mid, to: { x: end, y: mid.y }, drag: true, on: 'quilt' }
}
