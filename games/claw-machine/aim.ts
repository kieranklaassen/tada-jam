import type { Target } from './deeds'
import { BELL, SLOT_Z, STEP, TRAY, TRAY_DEPTH, TRAY_WIDTH, WALL, placeAt } from './places'
import { lampSpots } from './lamps'
import { nearestPlace } from './tray'
import { WATCHER_AT, WATCHER_SIZE } from './watcher'

// What a finger on the glass is pointing at. The view gives the line of sight
// through the finger; this finds the first thing on it: a gobbler, the ledge,
// a bell post, or else a place on the tray. A child touches the thing they
// mean, and the claw goes there. The watcher and the lamps are no business of
// the claw's: a finger on one of them is answered by it alone.

export type Ray = { ox: number; oy: number; oz: number; dx: number; dy: number; dz: number }

/** A gobbler as the finger sees it: where it stands and how wide and tall it is. */
export type Standing = { x: number; width: number; height: number }

/** A toy or a stack of toys on the tray as the finger sees it: its place, and how high its top is. */
export type Stack = { place: number; top: number }

export type Aim = {
  target: Target
  /** Where the line of sight meets the thing: over the tray, the point the trolley follows. */
  x: number
  z: number
}

/** How far from the middle of its place a toy on the tray reaches, as a finger sees it. */
const STACK_HALF = { x: 2.6, z: 1.8 } as const

/** The height a finger points at over the tray: about the middle of a toy standing on it. */
export const POINTING_HEIGHT = 1.6

/** How far along the ray it enters a box, or Infinity when it misses. */
function enters(ray: Ray, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): number {
  let near = 0, far = Infinity
  const slab = (o: number, d: number, lo: number, hi: number): boolean => {
    if (Math.abs(d) < 1e-9) return o >= lo && o <= hi
    const a = (lo - o) / d, b = (hi - o) / d
    near = Math.max(near, Math.min(a, b)); far = Math.min(far, Math.max(a, b))
    return near <= far
  }
  return slab(ray.ox, ray.dx, x0, x1) && slab(ray.oy, ray.dy, y0, y1) && slab(ray.oz, ray.dz, z0, z1) ? near : Infinity
}

/** How far along the ray it enters a gobbler as the finger sees it. Its eyes stand out a little past its sides, and a finger on an eye means the gobbler. */
const entersGobbler = (ray: Ray, one: Standing): number => enters(ray, one.x - one.width / 2 - 1, STEP.top, SLOT_Z - 3.4, one.x + one.width / 2 + 1, STEP.top + one.height, SLOT_Z + 3.2)
/** And a bell on its post at an end of the rail. */
const entersBell = (ray: Ray, side: number): number => enters(ray, side * BELL.x - BELL.half - 0.6, 0, BELL.z - BELL.half - 1.5, side * BELL.x + BELL.half + 0.6, BELL.top + 1.2, BELL.z + BELL.half + 1.5)
/** And the row the crew stands in, from end to end of the step and as high as its tallest head: the gobblers and the gaps between them. */
const entersRow = (ray: Ray, crew: readonly Standing[]): number =>
  crew.length === 0 ? Infinity : enters(ray, STEP.x, STEP.top, SLOT_Z - 3.4, STEP.x + STEP.w, STEP.top + Math.max(...crew.map((one) => one.height)), SLOT_Z + 3.2)

/** A thing in the cabinet that the claw has nothing to do with. A finger on it is answered by that thing alone, and the claw stays where it is. */
export type Aside = { on: 'watcher' } | { on: 'lamp'; lamp: number }

const LAMPS = lampSpots()
/** How far round a bulb a finger still means the bulb: a bulb is small and a finger is not. */
const LAMP_REACH = 0.85

/**
 * Whether the finger is on the watcher beside the tray or on a lamp, and which. A thing the claw goes to that
 * stands in front of it wins: a gobbler, a bell on its post (the watcher sits half behind one), and with a toy
 * in the jaws the whole row of the crew, where the toy is meant for a mouth.
 */
export function asideAt(ray: Ray, crew: readonly Standing[], holding: boolean, stacks: readonly Stack[] = []): Aside | null {
  let best = Math.min(entersBell(ray, -1), entersBell(ray, 1), holding ? entersRow(ray, crew) : Infinity, ...crew.map((one) => entersGobbler(ray, one)))
  for (const stack of stacks) { const at = placeAt(stack.place); best = Math.min(best, enters(ray, at.x - STACK_HALF.x, TRAY.top, at.z - STACK_HALF.z, at.x + STACK_HALF.x, stack.top, at.z + STACK_HALF.z)) }
  let found: Aside | null = null
  const half = WATCHER_SIZE.half
  const watcher = enters(ray, WATCHER_AT.x - half, 0, WATCHER_AT.z - half, WATCHER_AT.x + half, WATCHER_SIZE.height, WATCHER_AT.z + half)
  if (watcher < best) { best = watcher; found = { on: 'watcher' } }
  LAMPS.forEach((spot, lamp) => {
    const t = enters(ray, spot.x - LAMP_REACH, spot.y - LAMP_REACH, spot.z - LAMP_REACH, spot.x + LAMP_REACH, spot.y + LAMP_REACH, spot.z + LAMP_REACH)
    if (t < best) { best = t; found = { on: 'lamp', lamp } }
  })
  return found
}

/**
 * What the finger points at. `holding` is whether a toy is in the jaws: then a finger anywhere in the row of the
 * crew, on a gobbler or in a gap between two, means the mouth nearest to it, so there is no aiming.
 */
export function aimAt(ray: Ray, crew: readonly Standing[], holding = false, stacks: readonly Stack[] = []): Aim {
  let best = Infinity, target: Target | null = null
  // What stands on the tray stands in front of the crew: a finger on the top of a tall toy in the back row
  // means the toy, though the gobbler behind it is on the same line of sight.
  for (const stack of stacks) {
    const at = placeAt(stack.place)
    const t = enters(ray, at.x - STACK_HALF.x, TRAY.top, at.z - STACK_HALF.z, at.x + STACK_HALF.x, stack.top, at.z + STACK_HALF.z)
    if (t < best) { best = t; target = { on: 'place', place: stack.place } }
  }
  const onTray = target
  crew.forEach((one, slot) => {
    const t = entersGobbler(ray, one)
    if (t < best) { best = t; target = { on: 'gobbler', slot } }
  })
  if (holding && target === onTray) {
    const t = entersRow(ray, crew)
    if (t < Infinity) {
      const x = ray.ox + ray.dx * t
      best = t; target = { on: 'gobbler', slot: crew.reduce((nearest, one, slot) => (Math.abs(one.x - x) < Math.abs(crew[nearest].x - x) ? slot : nearest), 0) }
    }
  }
  // The ledge: the parapet and everything behind it. Which crate is meant is told by the side.
  const ledge = enters(ray, -19, 0, WALL.z - 8.5, 19, WALL.top + 8, WALL.z + 1)
  const at = (t: number) => ({ x: ray.ox + ray.dx * t, z: ray.oz + ray.dz * t })
  if (ledge < best) { best = ledge; target = { on: 'ledge', which: at(ledge).x < 0 ? 0 : 1 } }
  for (const side of [-1, 1] as const) {
    const t = entersBell(ray, side)
    if (t < best) { best = t; target = { on: 'rail-end', side } }
  }
  if (target && target.on === 'place') { const spot = at(best); return { target, x: Math.min(TRAY.x + TRAY_WIDTH, Math.max(TRAY.x, spot.x)), z: Math.min(TRAY.z + TRAY_DEPTH, Math.max(TRAY.z, spot.z)) } }
  if (target) return { target, ...at(best) }
  // Nothing stands in the way: the finger is on the tray, or off it, where the nearest place is meant.
  const t = Math.abs(ray.dy) < 1e-9 ? 0 : (POINTING_HEIGHT - ray.oy) / ray.dy
  const x = Math.min(TRAY.x + TRAY_WIDTH, Math.max(TRAY.x, ray.ox + ray.dx * t))
  const z = Math.min(TRAY.z + TRAY_DEPTH, Math.max(TRAY.z, ray.oz + ray.dz * t))
  return { target: { on: 'place', place: nearestPlace(x, z) }, x, z }
}
