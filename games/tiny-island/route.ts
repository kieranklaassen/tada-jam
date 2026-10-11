// How a thing gets through the air without passing through anything. Every
// flight in the game (a toy sent to the island, a toy going home, the sheep's
// bound, the cat's leap, the gull's flight, a toy lifted onto the wave) asks
// here how high it has to go, and a toy carried by a finger asks how high it
// has to be held where it is. Plain numbers, in the world's own units.

/** Something that stands in the way: an upright round thing with a top. */
export type Obstacle = { x: number; z: number; r: number; top: number }

export type Point = { x: number; y: number; z: number }

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const smooth = (t: number): number => t * t * (3 - 2 * t)

/** How far a point is from the stretch of ground between two points. */
function fromStretch(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax, dz = bz - az, length = dx * dx + dz * dz
  const along = length === 0 ? 0 : clamp01(((px - ax) * dx + (pz - az) * dz) / length)
  return Math.hypot(px - (ax + dx * along), pz - (az + dz * along))
}

/**
 * How much of its buoy's own motion the gull takes on at a distance from the buoy's middle: all of it on the buoy
 * and while it sets down on it or lifts off, none of it a wingbeat away. The buoy rides the swell and rocks, and
 * what is over it goes with it, so the two are never drawn into each other.
 */
export function riding(d: number): number {
  return 1 - smooth(clamp01((d - 1.2) / 1.4))
}

/** The least height at which the gull passes at a distance from the middle of its buoy, whose top is at `top`: level with the top over it and a little beyond, and down a steep slope from there, so it sets down from above and lifts off upward. */
export function overBuoy(d: number, top: number): number {
  return top - 2 * Math.max(0, d - 1)
}

/** How much room is kept over the top of whatever is flown over. */
export const OVER = 0.3

/**
 * The height at which a thing of radius `r` has to cross from one point of the ground to another so that it
 * passes over everything that stands in its way, or null when the way is clear and it can go in a plain arc.
 */
export function cruise(from: { x: number; z: number }, to: { x: number; z: number }, r: number, obstacles: readonly Obstacle[]): number | null {
  let high: number | null = null
  for (const o of obstacles) {
    if (fromStretch(o.x, o.z, from.x, from.z, to.x, to.z) >= r + o.r + 0.02) continue
    high = Math.max(high ?? -Infinity, o.top + OVER)
  }
  return high
}

/**
 * Where a flight is at `t` (0 to 1). With `high` null it is one arc, `arc` high at its middle. Otherwise it
 * goes straight up to `high`, crosses there, and comes straight down: nothing is crossed below that height.
 */
export function fly(t: number, from: Point, to: Point, arc: number, high: number | null, out: Point): Point {
  if (high === null) {
    const ease = smooth(clamp01(t))
    out.x = from.x + (to.x - from.x) * ease
    out.y = from.y + (to.y - from.y) * ease + 4 * t * (1 - t) * arc
    out.z = from.z + (to.z - from.z) * ease
    return out
  }
  const top = Math.max(high, from.y, to.y)
  const across = smooth(clamp01((t - 0.3) / 0.4))
  out.x = from.x + (to.x - from.x) * across
  out.z = from.z + (to.z - from.z) * across
  out.y = t < 0.3 ? from.y + (top - from.y) * smooth(clamp01(t / 0.3)) : t < 0.7 ? top : top + (to.y - top) * smooth(clamp01((t - 0.7) / 0.3))
  return out
}

/** How far out from a thing a carried toy starts to rise over it. */
const APPROACH = 0.9

/**
 * How high a carried thing of radius `r` has to be held over the point (x, z): `floor` where nothing stands
 * near, rising over whatever does. It depends on the place alone, so a fast finger takes nothing through
 * anything: the toy is over the top by the time the two would touch.
 */
export function heldOver(x: number, z: number, r: number, floor: number, obstacles: readonly Obstacle[]): number {
  let high = floor
  for (const o of obstacles) {
    const gap = Math.hypot(o.x - x, o.z - z) - (r + o.r)
    if (gap >= APPROACH) continue
    const over = o.top + OVER
    if (over > floor) high = Math.max(high, floor + (over - floor) * smooth(clamp01(1 - gap / APPROACH)))
  }
  return high
}

/** Where a way that swings `far` to one side is at `u` (0 to 1) along it: furthest out at its middle, nothing at either end. */
export function swung(from: { x: number; z: number }, to: { x: number; z: number }, far: number, u: number, out: { x: number; z: number }): { x: number; z: number } {
  const dx = to.x - from.x, dz = to.z - from.z, length = Math.hypot(dx, dz) || 1, swing = far * Math.sin(u * Math.PI)
  out.x = from.x + dx * u + (-dz / length) * swing
  out.z = from.z + dz * u + (dx / length) * swing
  return out
}

/**
 * How far to one side a thing of radius `r` has to swing on its way from one point of the ground to another to
 * pass clear of everything in `obstacles` at any height: 0 when the straight way is clear, else the least swing
 * to either side that is, or undefined when there is no way round within `most`. Of two ways equally far out, the
 * one on the side `first` (1 or -1) is taken; with `only`, no way on the other side is looked for.
 */
export function around(from: { x: number; z: number }, to: { x: number; z: number }, r: number, obstacles: readonly Obstacle[], first: 1 | -1 = 1, only = false, most = 5.4): number | undefined {
  const at = { x: 0, z: 0 }
  const clear = (far: number): boolean => {
    for (let i = 0; i <= 24; i++) {
      swung(from, to, far, i / 24, at)
      for (const o of obstacles) if (Math.hypot(at.x - o.x, at.z - o.z) < r + o.r + 0.02) return false
    }
    return true
  }
  if (clear(0)) return 0
  for (let far = 0.6; far <= most + 1e-9; far += 0.6) {
    if (clear(far * first)) return far * first
    if (!only && clear(-far * first)) return -far * first
  }
  return undefined
}

/** How much room is kept between a carried thing and a thing it is carried round. */
const BESIDE = 0.1
/** How strongly a thing carried round another is drawn to the viewer's side of it. */
const FRONT = 1.5

/**
 * Where a thing of radius `r`, `tall` from its foot to its top (and `more` than that at this moment, stretched
 * as it is lifted), is held when a finger carries it over the point
 * (x, z): over that point at `hover` above the ground, risen over whatever stands near (`heldOver`), and never
 * higher than the lid of the frame lets it be (`lid(z)` is how high a top may be that far from the viewer).
 * Where the lid stops it from clearing a thing it is not passed through it: it is held beside it, on the
 * viewer's side (larger z), and slides round it as the finger goes on. Where the lid is too low for it even on
 * the ground (the back of the sea, for the tallest), it is held as far back as it can stand.
 */
export function held(x: number, z: number, r: number, tall: number, more: number, hover: number, ground: (x: number, z: number) => number, lid: (z: number) => number, obstacles: readonly Obstacle[], out: Point): Point {
  // A thing is gone round, not over, when the lid over its far side is too low for that. This is the same
  // wherever the finger is, so a thing is never over it at one moment and beside it at the next.
  const round = obstacles.filter((o) => o.top + OVER + tall > lid(o.z - r - o.r))
  const over = round.length === 0 ? obstacles : obstacles.filter((o) => !round.includes(o))
  let px = x, pz = z
  for (let pass = 0; pass < 6; pass++) {
    let moved = false
    for (const o of round) {
      const reach = r + o.r + BESIDE, dx = px - o.x, dz = pz - o.z, off = Math.hypot(dx, dz)
      if (off >= reach) continue
      // Out to its edge the way the finger is from its middle, drawn toward the viewer the nearer the middle it is.
      const ux = dx / reach, uz = dz / reach + FRONT * (1 - off / reach), length = Math.hypot(ux, uz) || 1
      px = o.x + (ux / length) * reach
      pz = o.z + (uz / length) * reach
      moved = true
    }
    // As far back as it can stand under the lid.
    for (let step = 0; step < 200 && ground(px, pz) + tall + more > lid(pz); step++) { pz += 0.05; moved = true }
    if (!moved) break
  }
  // Still in something (toys all round): forward until it is in nothing.
  for (let step = 0; step < 200 && round.some((o) => Math.hypot(px - o.x, pz - o.z) < r + o.r + BESIDE - 1e-6); step++) pz += 0.1
  const floor = ground(px, pz)
  out.x = px
  out.z = pz
  out.y = Math.max(floor, Math.min(heldOver(px, pz, r, floor + hover, over), lid(pz) - tall - more))
  return out
}
