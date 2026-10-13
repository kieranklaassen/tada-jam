import { KIND, seatOf } from './kinds'
import { ride } from './motion'
import { CROWD, GATE, KEEPER, MAYOR } from './places'
import { LET_DOWN, liftOf, type Play, type Target } from './play'
import { FLOAT } from './seen'
import { STREET } from './street'

// What a finger is on. The view turns the touched point of the surface into
// a ray from the eye; this finds what the ray meets first. A tall thing is
// touched where it is seen, on its body, and not only at its foot: as high as
// it rides, hangs, hops, leaps or bounces, and a balloon on top where it
// floats. The hole is touched on its mouth. A stack that rides over it hides
// the mouth from the eye, so a finger on a thing of that stack is told as a
// touch on that thing, which the model answers as the thing and as the hole.

export type Ray = { ox: number; oy: number; oz: number; dx: number; dy: number; dz: number }

/** Where the ray meets the street, or null when it looks up and away. */
export function streetPoint(ray: Ray): { x: number; z: number; t: number } | null {
  if (ray.dy >= -1e-6) return null
  const t = -ray.oy / ray.dy
  return { x: ray.ox + ray.dx * t, z: ray.oz + ray.dz * t, t }
}

/** How far along the ray it first meets an upright drum standing at (cx, cz) from y0 up to y1, or Infinity. */
export function meets(ray: Ray, cx: number, cz: number, radius: number, y0: number, y1: number): number {
  let nearest = Infinity
  // The side.
  const px = ray.ox - cx, pz = ray.oz - cz
  const a = ray.dx * ray.dx + ray.dz * ray.dz, b = 2 * (px * ray.dx + pz * ray.dz), c = px * px + pz * pz - radius * radius
  const under = b * b - 4 * a * c
  if (a > 1e-9 && under >= 0) {
    const t = (-b - Math.sqrt(under)) / (2 * a), y = ray.oy + ray.dy * t
    if (t > 0 && y >= y0 && y <= y1) nearest = t
  }
  // The top, seen from above.
  if (ray.dy < -1e-6) {
    const t = (y1 - ray.oy) / ray.dy, x = ray.ox + ray.dx * t - cx, z = ray.oz + ray.dz * t - cz
    if (t > 0 && x * x + z * z <= radius * radius) nearest = Math.min(nearest, t)
  }
  return nearest
}

/** How far along the ray it first meets an upright board across the street at z, from x0 to x1 and up to `high`, or Infinity. */
function meetsBoard(ray: Ray, x0: number, x1: number, z: number, high: number): number {
  if (Math.abs(ray.dz) < 1e-9) return Infinity
  const t = (z - ray.oz) / ray.dz, x = ray.ox + ray.dx * t, y = ray.oy + ray.dy * t
  return t > 0 && x >= x0 && x <= x1 && y >= 0 && y <= high ? t : Infinity
}

/** The smallest thing is given a foot at least this wide for the finger. */
const LEAST_RADIUS = 0.55
/** The hole takes a touch a little outside its rim. */
const RIM_SLACK = 0.22
/**
 * The gate takes a finger on its leaves and its posts, up to just over its tallest bar. The arch over them is
 * scenery: its upper right reaches into the grown-up's corner of the surface (overlay.ts), where no touch is
 * answered, so no part of what answers as the gate lies there.
 */
export const GATE_TOUCH = GATE.high - GATE.half + 0.6
/** How far a balloon on top of a stack floats above its seat, for the finger. */
const floats = (parts: readonly string[]): number => (parts.length > 1 && parts[parts.length - 1] === 'balloon' ? FLOAT : 0)

/**
 * Where a finger finds the hole: the middle of its mouth, or, with a stack riding over it and hiding it, the middle
 * of the thing at the bottom of that stack, where it hangs. The ghost hand taps there, and so do the tests and the audit.
 */
export function holePoint(play: Play): { x: number; y: number; z: number } {
  const bottom = play.riding[0], anchor = play.anchor
  if (!bottom || Math.hypot(play.x - anchor.x, play.z - anchor.z) > LET_DOWN) return { x: play.x, y: 0, z: play.z }
  return { x: anchor.x, y: bottom.y + ride(play.load, play.bob) + KIND[bottom.kind].height / 2, z: anchor.z }
}

/** `mayorX` is where the mayor stands along his rail now. A thing is touched where it is seen, which while it walks is not yet where it will stand. */
export function pick(ray: Ray, play: Play, mayorX: number): Target {
  const ground = streetPoint(ray)
  const x = ground ? Math.max(STREET.x0, Math.min(STREET.x1, ground.x)) : play.x
  const z = ground ? Math.max(STREET.z0, Math.min(STREET.z1, ground.z)) : play.z
  let nearest = ground ? ground.t : Infinity
  let target: Target = { on: 'street', x, z }
  if (ground && Math.hypot(ground.x - play.x, ground.z - play.z) <= play.mouth / 2 + RIM_SLACK) target = { on: 'hole', x: ground.x, z: ground.z }
  // What rides on the breath is touched as a thing is, each where it hangs on the bob: it answers as itself. A thing
  // still down in the mouth is not there to touch.
  const riding = play.riding, parts = riding.map((rider) => rider.kind), bob = riding.length > 0 ? ride(play.load, play.bob) : 0
  riding.forEach((rider, part) => {
    const foot = rider.y + bob, top = part < riding.length - 1 ? riding[part + 1].y + bob : foot + KIND[rider.kind].height + floats(parts)
    const t = meets(ray, play.anchor.x, play.anchor.z, Math.max(LEAST_RADIUS, KIND[rider.kind].width / 2), foot, Math.max(top, foot + 0.1))
    if (t < nearest) { nearest = t; target = { on: 'rider', part, x: play.anchor.x, z: play.anchor.z } }
  })
  for (const thing of play.things) {
    if (thing.away) continue
    // Each thing of a stack is touched where it sits: the finger is on the one the line of sight meets first.
    const last = thing.parts.length - 1, lift = liftOf(thing)
    thing.parts.forEach((kind, part) => {
      const foot = lift + seatOf(thing.parts, part), top = part < last ? lift + seatOf(thing.parts, part + 1) : foot + KIND[kind].height + floats(thing.parts)
      const t = meets(ray, thing.sx, thing.sz, Math.max(LEAST_RADIUS, KIND[kind].width / 2), foot, Math.max(top, foot + 0.1))
      if (t < nearest) { nearest = t; target = { on: 'thing', thing, part, x: thing.x, z: thing.z } }
    })
  }
  // The bystanders stand beyond the far kerb: a touch on one brings the hole to the kerb at his feet.
  const mayor = meets(ray, mayorX, MAYOR.z, 1.5 * MAYOR.size, 0, MAYOR.floor + 4.4 * MAYOR.size)
  if (mayor < nearest) { nearest = mayor; target = { on: 'mayor', x: Math.max(STREET.x0, Math.min(STREET.x1, mayorX)), z: STREET.z0 } }
  const keeper = meets(ray, KEEPER.x, KEEPER.z, 0.75, 0, 6.2 * KEEPER.size)
  if (keeper < nearest) { nearest = keeper; target = { on: 'keeper', x: KEEPER.x, z: STREET.z0 } }
  const gate = meetsBoard(ray, GATE.x - GATE.half - 0.3, GATE.x + GATE.half + 0.3, GATE.z, GATE_TOUCH)
  if (gate < nearest) { nearest = gate; target = { on: 'gate', x: GATE.x, z: STREET.z0 } }
  CROWD.forEach((one, head) => {
    const t = meets(ray, one.x, one.z, 0.85 * one.size, 0, 2.9 * one.size)
    if (t < nearest) { nearest = t; target = { on: 'crowd', head, x: Math.max(STREET.x0, Math.min(STREET.x1, one.x)), z: one.back ? STREET.z1 : STREET.z0 } }
  })
  return target
}
