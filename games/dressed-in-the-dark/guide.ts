import type { Point } from './input'
import { KNOB, WARDROBE, bedX, BED, pegOf } from './layout'
import type { Show } from './show'
import type { Garment } from './things'

// One move the child could make now, for the ghost hand. Never the answer, since there is none.

export type Move = { from: Point; to: Point | null; carries: Garment | null }

const CORD: Move = { from: { x: KNOB.x, y: KNOB.y }, to: null, carries: null }

export function moveFor(show: Show, index: number): Move {
  if (show.lit || show.allDressed) return CORD
  if (!show.night.open && index >= 2 && index % 2 === 0) return { from: { x: WARDROBE.x + 96, y: 210 }, to: null, carries: null }
  const hanging = show.hanging
  // A bed with nobody warm yet, and the garment that hangs nearest to it.
  const cold = show.cold, bed = cold ? show.people[cold].bed : null
  if (hanging.length === 0 || bed === null) return CORD
  const x = bedX(bed)
  const garment = [...hanging].sort((a, b) => Math.abs(pegOf(a).x - x) - Math.abs(pegOf(b).x - x))[index % Math.min(2, hanging.length)]
  return { from: pegOf(garment), to: { x, y: BED.top + 50 }, carries: garment }
}
