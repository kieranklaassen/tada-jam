import { BROW_UP, CART, SEATS, type GnomeId } from './ground'
import { deserialize, freshSave, serialize, type MushroomSave, type VillageSave } from './save'
import { doorBox, type Box } from './shapes'
import { TAP_S } from './config'
import { LOOSE_S } from './touch'
import { Village } from './village'

// What the game's tests share: a village made from a few kept things, a finger, and game time.

export const FRAME = 1 / 60
export type At = { x: number; y: number }

/** A village with the first showings behind it, so a test of one thing is not interrupted by the cart or the snail. */
export function village(over: Partial<VillageSave> = {}, seed = 1): Village {
  return new Village({ ...freshSave(6), shown: ['cart', 'pebbles'], ...over }, seed)
}

export const run = (v: Village, seconds: number): void => { for (let t = 0; t < seconds - 1e-9; t += FRAME) v.step(FRAME) }
export const tap = (v: Village, at: At): void => { v.press(at); v.step(FRAME); v.lift() }
export const hold = (v: Village, at: At, seconds: number): void => { v.press(at); run(v, seconds); v.lift() }
/** A finger that lands, moves in a few steps and lets go. */
export function stroke(v: Village, from: At, to: At, steps = 12): void {
  v.press(from)
  for (let i = 1; i <= steps; i++) v.drag({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })
  v.lift()
}
/** The same, with the finger left on the glass. */
export function carry(v: Village, from: At, to: At, steps = 12): void {
  v.press(from)
  for (let i = 1; i <= steps; i++) v.drag({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps })
}

/** How long a finger keeps a pulled cap up before it is seen to be loose and comes out. */
export const LOOSEN_S = TAP_S + LOOSE_S + 0.05
/** A deliberate pull: the finger lands on a cap, goes up this far, and stays until the cap is seen to be loose. */
export function pullUp(v: Village, at: At, up: number): void {
  v.press(at)
  v.drag({ x: at.x, y: at.y - up })
  run(v, LOOSEN_S)
}

/** A deliberate lift of a path: the finger rests on a pebble for longer than a tap, goes up this far, and stays until the path is seen to be loose. */
export function liftPath(v: Village, at: At, up: number): void {
  v.press(at)
  run(v, TAP_S + 0.05)
  v.drag({ x: at.x, y: at.y - up })
  run(v, LOOSE_S + 0.05)
}

/** The middle of a gnome's hat where he sits, and the middle of his chest. */
export const hatOf = (who: GnomeId): At => ({ x: SEATS[who].x, y: Math.round((SEATS[who].top + SEATS[who].y - BROW_UP) / 2) })
export const chestOf = (who: GnomeId): At => ({ x: SEATS[who].x, y: SEATS[who].y - 100 })

export const stored = (v: Village): unknown => JSON.parse(JSON.stringify(serialize(v.toSave())))
export const loaded = (v: Village, seed = 7): Village => new Village(deserialize(stored(v), 6), seed)

export const middle = (box: Box): At => ({ x: (box.x0 + box.x1) / 2, y: (box.y0 + box.y1) / 2 })
/** The middle of a kept mushroom's door, as the frame draws it. */
export function doorOf(v: Village, id: number): At {
  const m = v.show().mushrooms.find((other) => other.id === id)!
  return middle(doorBox(m))
}
export const ON_CART: At = { x: CART.x, y: CART.y - 30 }

export const RED: MushroomSave = { id: 1, x: 1010, y: 510, size: 6, door: false }
export const BELL: MushroomSave = { id: 2, x: 640, y: 400, size: 6, door: false }
export const PUFF: MushroomSave = { id: 3, x: 290, y: 450, size: 6, door: false }
/** Pebbles from the log, between the sneezy gnome and the baker, up towards the sunny moss. */
export const fromLog = (to: At, x = 520): At[] => {
  const points: At[] = [], row = Math.round(to.y / 20) * 20
  for (let y = 560; y >= row; y -= 20) points.push({ x, y })
  for (let px = x + 20; px <= to.x; px += 20) points.push({ x: px, y: row })
  return points
}
