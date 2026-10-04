import type { Target } from './deeds'
import { BELL, SLOT_Z, STEP, TRAY, TRAY_DEPTH, TRAY_WIDTH, WALL } from './places'
import { nearestPlace } from './tray'
import { WATCHER_AT, WATCHER_SIZE } from './watcher'

// What a finger on the glass is pointing at. The view gives the line of sight
// through the finger; this finds the first thing on it: a gobbler, the ledge,
// a bell post, or else a place on the tray. A child touches the thing they
// mean, and the claw goes there.

export type Ray = { ox: number; oy: number; oz: number; dx: number; dy: number; dz: number }

/** A gobbler as the finger sees it: where it stands and how wide and tall it is. */
export type Standing = { x: number; width: number; height: number }

export type Aim = {
  target: Target
  /** Where the line of sight meets the thing: over the tray, the point the trolley follows. */
  x: number
  z: number
}

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

/** Whether the finger is on the watcher beside the tray, which the claw cannot reach: it answers by itself. */
export function onWatcher(ray: Ray): boolean {
  const half = WATCHER_SIZE.half
  return enters(ray, WATCHER_AT.x - half, 0, WATCHER_AT.z - half, WATCHER_AT.x + half, WATCHER_SIZE.height, WATCHER_AT.z + half) < Infinity
}

export function aimAt(ray: Ray, crew: readonly Standing[]): Aim {
  let best = Infinity, target: Target | null = null
  crew.forEach((one, slot) => {
    // Its eyes stand out a little past its sides, and a finger on an eye means the gobbler.
    const half = one.width / 2 + 1
    const t = enters(ray, one.x - half, STEP.top, SLOT_Z - 3.4, one.x + half, STEP.top + one.height, SLOT_Z + 3.2)
    if (t < best) { best = t; target = { on: 'gobbler', slot } }
  })
  // The ledge: the parapet and everything behind it. Which crate is meant is told by the side.
  const ledge = enters(ray, -19, 0, WALL.z - 8.5, 19, WALL.top + 8, WALL.z + 1)
  const at = (t: number) => ({ x: ray.ox + ray.dx * t, z: ray.oz + ray.dz * t })
  if (ledge < best) { best = ledge; target = { on: 'ledge', which: at(ledge).x < 0 ? 0 : 1 } }
  for (const side of [-1, 1] as const) {
    const t = enters(ray, side * BELL.x - BELL.half - 0.6, 0, BELL.z - BELL.half - 1.5, side * BELL.x + BELL.half + 0.6, BELL.top + 1.2, BELL.z + BELL.half + 1.5)
    if (t < best) { best = t; target = { on: 'rail-end', side } }
  }
  if (target) return { target, ...at(best) }
  // Nothing stands in the way: the finger is on the tray, or off it, where the nearest place is meant.
  const t = Math.abs(ray.dy) < 1e-9 ? 0 : (POINTING_HEIGHT - ray.oy) / ray.dy
  const x = Math.min(TRAY.x + TRAY_WIDTH, Math.max(TRAY.x, ray.ox + ray.dx * t))
  const z = Math.min(TRAY.z + TRAY_DEPTH, Math.max(TRAY.z, ray.oz + ray.dz * t))
  return { target: { on: 'place', place: nearestPlace(x, z) }, x, z }
}
