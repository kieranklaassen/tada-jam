import { drawBadger, drawFox, drawHedgehog, drawOwl } from './figures'
import { BADGER_BOX, OWL_BOX, POLE, WIRE, foxBox, hedgehogBox, type Box } from './layout'
import { Sketch, inside, type Bucket } from './sketch'
import { RUSH, THROW, type Light, type Patch, type Wood } from './wood'

// Lit means answered. Whether a light lies on one of the four large creatures
// is asked here, once a step, of the creature as it is drawn: the same shape
// the view scrapes, written into a sketch that knows no canvas. The view
// shows a creature whole and in full exactly when `touch` says a patch
// touches it, and the creature answers exactly that light, so nobody is ever
// shown lit by a light it does not answer, and no patch cuts anybody in two.

export const BIG = ['owl', 'badger', 'fox', 'hedgehog'] as const
export type Big = (typeof BIG)[number]

/** How wide of a creature a rushing patch may pass and still be a rush past it. */
export const RUSH_WIDE = 70

export type Sight = {
  /** The topmost patch that touches the creature as it is drawn, or null: the lantern gives light and it falls here. */
  touch: Patch | null
  /** The light the creature answers: that patch's, while the creatures answer at all. */
  light: Light | null
  /** A light is rushing past: it moves faster than `RUSH`, and a patch passes over the creature or within `RUSH_WIDE` of it. */
  rush: boolean
}

export const freshSight = (): Sight => ({ touch: null, light: null, rush: false })

const PAINT = { owl: drawOwl, badger: drawBadger, fox: drawFox, hedgehog: drawHedgehog } as const
const forms: Record<Big, Sketch> = { owl: new Sketch(), badger: new Sketch(), fox: new Sketch(), hedgehog: new Sketch() }
for (const name of BIG) forms[name].wobble = 0

function roomOf(w: Wood, name: Big): Box {
  return name === 'owl' ? OWL_BOX : name === 'badger' ? BADGER_BOX : name === 'fox' ? foxBox(w.fox.x) : hedgehogBox(w.hedgehog.x)
}

/** How far a patch reaches from its own middle, at most. */
export const reachOf = (patch: Patch) => Math.hypot(patch.rx, patch.ry) + 6

/** Whether a point lies in a patch, or within `wide` of its outline. */
export function near(patch: Patch, x: number, y: number, wide: number): boolean {
  const world = patch.world
  if (inside(world, world.length, x, y)) return true
  if (wide <= 0) return false
  for (let i = 0; i < world.length; i += 2) if (Math.hypot(world[i] - x, world[i + 1] - y) < wide) return true
  return false
}

/** Whether a point lies inside any of a bucket's closed shapes. */
function holds(bucket: Bucket, x: number, y: number): boolean {
  const pts = bucket.pts
  let from = 0
  for (let p = 0; p < bucket.m; p++) {
    const end = bucket.ends[p]
    let within = false
    for (let i = from, j = end - 2; i < end; j = i, i += 2) {
      const xi = pts[i], yi = pts[i + 1], xj = pts[j], yj = pts[j + 1]
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) within = !within
    }
    if (within) return true
    from = end
  }
  return false
}

/** The topmost patch that comes within `wide` of any point of a figure's wax, or lies wholly inside it. */
function over(w: Wood, form: Bucket, room: Box, wide: number): Patch | null {
  const pts = form.pts, count = form.n
  for (let p = w.patches.length - 1; p >= 0; p--) {
    const patch = w.patches[p], reach = reachOf(patch) + wide
    if (patch.x + reach < room.left || patch.x - reach > room.right || patch.y + reach < room.top || patch.y - reach > room.bottom) continue
    for (let i = 0; i < count; i += 2) {
      const x = pts[i], y = pts[i + 1]
      if (Math.abs(x - patch.x) > reach || Math.abs(y - patch.y) > reach) continue
      if (near(patch, x, y, wide)) return patch
    }
    // A patch too small to reach the figure's edge may still lie in the middle of it.
    if (holds(form, patch.x, patch.y)) return patch
  }
  return null
}

/** Looks at the four large creatures as they stand now, and writes what light lies on each. */
export function see(w: Wood): void {
  const fast = w.shines && w.speed > RUSH
  for (const name of BIG) {
    const sight = w.sight[name]
    sight.touch = null; sight.light = null; sight.rush = false
    if (!w.gives) continue
    const room = roomOf(w, name)
    // Nothing of any patch comes near its room: it need not be drawn to know that.
    let any = false
    for (const patch of w.patches) {
      const reach = reachOf(patch) + (fast ? RUSH_WIDE : 0)
      if (patch.x + reach >= room.left && patch.x - reach <= room.right && patch.y + reach >= room.top && patch.y - reach <= room.bottom) { any = true; break }
    }
    if (!any) continue
    const form = forms[name]
    form.clear()
    PAINT[name](form, w, w.time)
    sight.touch = over(w, form.hide, room, 0)
    if (w.shines) {
      sight.light = sight.touch ? (sight.touch.paper ?? 'plain') : null
      sight.rush = fast && (sight.touch !== null || over(w, form.hide, room, RUSH_WIDE) !== null)
    }
  }
}

/**
 * Whether a large creature is drawn lit, whole and in full: a patch touches it, and the lantern is not on its
 * hook. On the hook the windows glow on the wall and the creatures only idle, so the glow lights nobody: who
 * does not answer is not drawn lit.
 */
export const shownLit = (w: Wood, name: Big): boolean => w.sight[name].touch !== null && !w.hung
/** Whether a large creature stands where the glow of a hung lantern lies: it is drawn over the glow as the dark shows it. */
export const underGlow = (w: Wood, name: Big): boolean => w.sight[name].touch !== null && w.hung && w.glow > 0

/** What every creature keeps to show that it saw a light it is not answering. */
export type Glance = { glance: number; glanceWait: number; saw: boolean }
/** Seconds between one such look and the next, while the light stays. */
export const GLANCE_EVERY = 1.4

/**
 * Lit means answered, and a creature that cannot answer just now (it is resting after its last answer, or the
 * light moves too fast for it) still shows, in the step the light reaches it and now and again after, that the
 * light touched it: `glance` goes to 1 and falls away, and the view draws a blink and a start with it.
 */
export function notice(body: Glance, lit: boolean, answering: boolean, dt: number): void {
  body.glance = Math.max(0, body.glance - dt * 2.5)
  if (lit && !answering) {
    body.glanceWait = body.saw ? body.glanceWait - dt : 0
    if (body.glanceWait <= 0) { body.glance = 1; body.glanceWait = GLANCE_EVERY }
  }
  body.saw = lit
}

/** Where the middle of a patch falls when the grip is at rest at a point and the lantern hangs still. */
export function fallOf(patch: Patch, gx: number, gy: number, out: { x: number; y: number }): { x: number; y: number } {
  out.x = gx + POLE.x + Math.cos(patch.bearing) * THROW
  out.y = gy + POLE.y + WIRE + Math.sin(patch.bearing) * THROW + patch.drop
  return out
}

const fell = { x: 0, y: 0 }

/** A large creature as it is drawn now: the shape `restLight` asks about. Drawn once for many questions. */
export function formOf(w: Wood, name: Big): Bucket {
  const form = forms[name]
  form.clear()
  PAINT[name](form, w, w.time)
  return form.hide
}

/**
 * The topmost patch that would touch a drawn shape if the grip came to rest at `gx`, `gy`: the same question
 * `see` asks of the lantern where it is, asked of a place it has not been carried to yet.
 */
export function restLight(w: Wood, form: Bucket, gx: number, gy: number): Patch | null {
  const pts = form.pts, count = form.n
  for (let p = w.patches.length - 1; p >= 0; p--) {
    const patch = w.patches[p], reach = reachOf(patch)
    fallOf(patch, gx, gy, fell)
    for (let i = 0; i < count; i += 2) {
      const x = pts[i] - fell.x, y = pts[i + 1] - fell.y
      if (Math.abs(x) > reach || Math.abs(y) > reach) continue
      if (inside(patch.local, patch.local.length, x, y)) return patch
    }
    if (holds(form, fell.x, fell.y)) return patch
  }
  return null
}

/** The topmost patch that would touch a small round thing at `x`, `y` of radius `r` if the grip came to rest at `gx`, `gy`. */
export function restTouch(w: Wood, x: number, y: number, r: number, gx: number, gy: number): Patch | null {
  for (let p = w.patches.length - 1; p >= 0; p--) {
    const patch = w.patches[p], n = patch.local.length
    fallOf(patch, gx, gy, fell)
    const dx = x - fell.x, dy = y - fell.y
    if (inside(patch.local, n, dx, dy) || inside(patch.local, n, dx + r, dy) || inside(patch.local, n, dx - r, dy) || inside(patch.local, n, dx, dy + r) || inside(patch.local, n, dx, dy - r)) return patch
  }
  return null
}
