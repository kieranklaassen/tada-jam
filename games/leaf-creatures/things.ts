import { MAX_CAPS, MAX_PARTS } from './config'
import { MOVERS, SHAPES, gap, reach, type Kind, type Mover, type Placed } from './parts'

// A thing is whatever parts were pressed together, lying on the earth. With
// two caps on it, it is a creature. A part is kept where it lies from the
// thing's middle, so a creature carries its parts with it as it turns and
// travels. Nothing here draws or reads a clock.

export type Part = {
  kind: Kind
  /** Where it lies from the thing's middle, as the thing was laid. */
  x: number
  y: number
  turn: number
  /** Which of its crayon drawings it is: chosen when it was lifted from its heap. */
  look: number
  /** Seconds until it touches down, while it is still coming down from the hand or through the air. */
  fall: number
  /** Where it set out from when it came through the air by itself, in the thing's own frame; with `flight` the seconds the whole way takes. */
  fromX: number
  fromY: number
  flight: number
  /** Bounces still to come after it has touched, and seconds to the next one. */
  bounces: number
  nextBounce: number
  /** The settle that rings out after it touches: 1 at the touch, eased to 0. */
  settle: number
  /** True while the finger has lifted it from where it lies: it is still the thing's, and goes back if the carry is taken away. */
  inHand: boolean
  /** Its place in the order parts were laid in this visit: the lowest was laid longest ago. 0 until the toy has counted it. */
  order: number
}

export type Thing = {
  id: number
  x: number
  y: number
  /** How far it is turned from the way it was laid. */
  turn: number
  awake: boolean
  /** Its place in the order of waking, 0 if never woken. */
  woke: number
  drowsy: boolean
  bedded: boolean
  parts: Part[]
}

export function newPart(kind: Kind, x: number, y: number, turn: number, look: number): Part {
  return { kind, x, y, turn, look, fall: 0, fromX: x, fromY: y, flight: 0, bounces: 0, nextBounce: 0, settle: 0, inHand: false, order: 0 }
}

/** Where a part lies on the stage. */
export function placed(thing: Thing, part: Part): Placed {
  const c = Math.cos(thing.turn), s = Math.sin(thing.turn)
  return { kind: part.kind, x: thing.x + part.x * c - part.y * s, y: thing.y + part.x * s + part.y * c, turn: thing.turn + part.turn }
}

/** A stage point in the thing's own frame. */
export function toThing(thing: Thing, x: number, y: number): { x: number; y: number } {
  const c = Math.cos(thing.turn), s = Math.sin(thing.turn), dx = x - thing.x, dy = y - thing.y
  return { x: dx * c + dy * s, y: -dx * s + dy * c }
}

export function caps(thing: Thing): number {
  let n = 0
  for (const part of thing.parts) if (part.kind === 'cap') n++
  return n
}

export function count(thing: Thing, kind: Kind): number {
  let n = 0
  for (const part of thing.parts) if (part.kind === kind) n++
  return n
}

/** Whether one more part of this kind is more than the thing carries. */
export function isFull(thing: Thing, kind: Kind): boolean {
  return kind === 'cap' ? caps(thing) >= MAX_CAPS : thing.parts.length - caps(thing) >= MAX_PARTS
}

/** The gap between a part about to be pressed on and the nearest part of a thing, and which part that is. */
export function nearest(thing: Thing, at: Placed): { gap: number; index: number } {
  let best = Infinity, index = -1
  for (let i = 0; i < thing.parts.length; i++) {
    if (thing.parts[i].inHand) continue
    const g = gap(placed(thing, thing.parts[i]), at)
    if (g < best) { best = g; index = i }
  }
  return { gap: best, index }
}

/** The part of a thing under a finger, or -1: the one whose outside is nearest, within `within`. */
export function partAt(thing: Thing, x: number, y: number, within: number): number {
  let best = within, index = -1
  for (let i = thing.parts.length - 1; i >= 0; i--) {
    // A part in the hand or still coming through the air is not where it will lie: it is not to be touched there.
    if (thing.parts[i].inHand || (thing.parts[i].fall > 0 && thing.parts[i].flight > 0)) continue
    const d = reach(placed(thing, thing.parts[i]), x, y)
    if (d < best) { best = d; index = i }
  }
  return index
}

/** Moves the thing's middle to the middle of its parts without moving any part on the stage. Only a thing that was never turned is recentred. */
export function recentre(thing: Thing): void {
  if (thing.parts.length === 0 || thing.turn !== 0) return
  let mx = 0, my = 0
  for (const part of thing.parts) { mx += part.x; my += part.y }
  mx /= thing.parts.length; my /= thing.parts.length
  for (const part of thing.parts) { part.x -= mx; part.y -= my; part.fromX -= mx; part.fromY -= my }
  thing.x += mx; thing.y += my
}

/** How far the thing reaches from its middle. */
export function radius(thing: Thing): number {
  let r = 0
  for (const part of thing.parts) r = Math.max(r, Math.hypot(part.x, part.y) + SHAPES[part.kind].half + SHAPES[part.kind].r)
  return r
}

/**
 * The way a thing faces, as an angle in its own frame: from its middle to
 * the middle of its caps, so the eyes lead wherever the child put them. Caps
 * that sit on the very middle face up the page.
 */
export function front(thing: Thing): number {
  let cx = 0, cy = 0, n = 0, mx = 0, my = 0
  for (const part of thing.parts) {
    mx += part.x; my += part.y
    if (part.kind === 'cap') { cx += part.x; cy += part.y; n++ }
  }
  if (n === 0) return -Math.PI / 2
  cx = cx / n - mx / thing.parts.length; cy = cy / n - my / thing.parts.length
  return Math.hypot(cx, cy) < 4 ? -Math.PI / 2 : Math.atan2(cy, cx)
}

export type Way = Mover | 'feather' | 'seed' | 'cap'

/**
 * How a creature travels: by the kind it has most of among the four movers,
 * and of two that tie, the one laid first. With none of those it struts on a
 * feather, creeps on a seed, and waddles as caps alone.
 */
export function wayOf(thing: Thing): Way {
  let best: Mover | null = null, most = 0
  for (const part of thing.parts) {
    if (!(MOVERS as readonly string[]).includes(part.kind)) continue
    const n = count(thing, part.kind)
    // Parts are walked in the order they were laid, so the first to reach the highest number keeps it.
    if (n > most) { most = n; best = part.kind as Mover }
  }
  if (best) return best
  if (count(thing, 'feather') > 0) return 'feather'
  if (count(thing, 'seed') > 0) return 'seed'
  return 'cap'
}
