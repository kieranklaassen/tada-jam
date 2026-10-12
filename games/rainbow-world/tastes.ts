import type { Spot } from './layout'
import { carriedBy, stand } from './stack'
import type { Piece } from './thing'
import type { World } from './world'

// What each character wants, as things it looks at: the tall doll at the top of whatever is tallest, the small
// doll at the nearest larger thing to hide behind, the horse at the nearest doll, and a doll that was just set down at the finger. The view turns these into
// where eyes go and which way a body leans. Nothing here changes the world.

const out = { x: 0, y: 0, rot: 0 }

/** The top of the tallest thing in sight that is not the asker: what the tall doll looks up at. */
export function tallestTop(world: World, asker: Piece): Spot | null {
  let best: Spot | null = null
  for (const p of world.pieces) {
    if (p === asker || p.at === 'basket') continue
    const at = stand(world.pieces, p, out), top = at.y - p.def.height
    if (!best || top < best.y) best = { x: at.x, y: top }
  }
  return best
}

/** The nearest thing on the mat that is larger than the asker: what the small doll ducks behind. */
export function hideout(world: World, asker: Piece): Spot | null {
  let best: Spot | null = null, nearest = Infinity
  for (const p of world.pieces) {
    if (p === asker || p.at !== 'mat' || p.on !== null || p.def.halfWidth * p.def.height <= asker.def.halfWidth * asker.def.height) continue
    const far = Math.hypot(p.px - asker.px, p.py - asker.py)
    if (far < nearest) { nearest = far; best = { x: p.px, y: p.py - p.def.height * 0.5 } }
  }
  return best
}

/** The nearest doll: what the horse turns its head to. */
export function nearestDoll(world: World, asker: Piece): Spot | null {
  let best: Spot | null = null, nearest = Infinity
  for (const p of world.pieces) {
    if (p.def.kind !== 'doll' || p.at === 'basket') continue
    const at = stand(world.pieces, p, out), far = Math.hypot(at.x - asker.px, at.y - asker.py)
    if (far < nearest) { nearest = far; best = { x: at.x, y: at.y - p.def.height * 0.7 } }
  }
  return best
}

/** Whatever is in the air just now: what the cat's eyes follow. */
export function inTheAir(world: World): Spot | null {
  for (const p of world.pieces) {
    if (!p.flight && world.hand?.id !== p.def.id) continue
    const at = stand(world.pieces, p, out)
    return { x: at.x, y: at.y - p.def.height * 0.5 }
  }
  return null
}

/**
 * What a face looks at, or null for straight ahead. A doll that has just been set down looks at the finger
 * that set it down, and follows it; everyone else looks at what just landed; then at the thing in hand; then
 * at what the asker wants; then at the finger while it is about.
 */
export function gaze(world: World, asker: Piece | null, want: Spot | null): Spot | null {
  const t = world.time, held = world.held
  if (t < world.look.until) return asker && world.look.by === asker.def.id ? world.finger : world.look
  if (held) return { x: held.px, y: held.py - held.lift - held.def.height * 0.5 }
  if (want) return want
  return t - world.finger.at < 2.5 ? world.finger : null
}

/** How hard the tall doll strains, 0 to 1: it carries a doll or the horse. This is its face while it carries, and it is itself again when the load is off. */
export function strainOf(p: Piece): number {
  return p.def.id === 'doll-tall' ? Math.max(0, -p.mood) : 0
}

/** The top of what a doll carries: where a straining doll's eyes go. */
export function loadTop(world: World, p: Piece): Spot | null {
  const load = carriedBy(world.pieces, p)
  if (!load) return null
  const at = stand(world.pieces, load, out)
  return { x: at.x, y: at.y - load.def.height }
}
