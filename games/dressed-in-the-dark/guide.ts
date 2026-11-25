import type { Point } from './input'
import { BED, KNOB, WARDROBE, bedX, pegOf } from './layout'
import type { Show } from './show'
import { LOVES, type Garment } from './things'

// The one move the room asks for, for the glow and the ghost hand. Lamp out; what the cold one dreams of, carried
// to its bed; lamp on, to see; and round again. Every second showing carries something else, since anything may go
// on anyone.

export type Move = { what: 'cord' | 'wardrobe' | 'garment'; from: Point; to: Point | null; carries: Garment | null }

const CORD: Move = { what: 'cord', from: { x: KNOB.x, y: KNOB.y }, to: null, carries: null }
const DOOR: Move = { what: 'wardrobe', from: { x: WARDROBE.x + 96, y: 210 }, to: null, carries: null }

export function moveFor(show: Show, index: number): Move {
  if (show.lit || show.asksLamp) return CORD
  const hanging = show.hanging
  const cold = show.cold, bed = cold ? show.people[cold].bed : null
  if (cold === null || bed === null || hanging.length === 0) return CORD
  const x = bedX(bed), loved = LOVES[cold]
  // What it dreams of is behind the door, or on somebody else already: then anything.
  if (!show.night.out(loved) && index % 2 === 0) return DOOR
  const near = [...hanging].sort((a, b) => Math.abs(pegOf(a).x - x) - Math.abs(pegOf(b).x - x)).filter((one) => one !== loved)
  const garment = hanging.includes(loved) && (index % 2 === 0 || near.length === 0) ? loved : near[0]
  return { what: 'garment', from: pegOf(garment), to: { x, y: BED.top + 50 }, carries: garment }
}
