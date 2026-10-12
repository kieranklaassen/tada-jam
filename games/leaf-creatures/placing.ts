import { onEarth } from './clearing'
import { MAX_CAPS, MAX_PARTS, MAX_REACH } from './config'
import { roomAt } from './reach'
import { SHAPES, STICK_SLACK, crosses, ends, gap, isLong, reach, wrap, type Kind, type Placed } from './parts'
import { caps, isFull, nearest, newPart, placed, recentre, toThing, type Part, type Thing } from './things'

// Where a part ends up when it is pressed on: which thing it sticks to, or
// that it begins a new one, or that it does neither. And where a part that
// was only tapped lands when it flies to the earth by itself. Nothing here
// draws or reads a clock.

/** How far a thing would reach from its middle with these parts added, given in its own frame. A thing never woken is measured from the middle of all its parts, which is where its middle will be. */
export function reachWith(thing: Thing, more: readonly { kind: Kind; x: number; y: number }[]): number {
  const all = [...thing.parts, ...more]
  let mx = 0, my = 0
  if (!thing.awake && thing.turn === 0) { for (const part of all) { mx += part.x; my += part.y } mx /= all.length; my /= all.length }
  let far = 0
  for (const part of all) far = Math.max(far, Math.hypot(part.x - mx, part.y - my) + SHAPES[part.kind].half + SHAPES[part.kind].r)
  return far
}

/** How clear of the home control and the corner a part pressed on to a creature lies, at the least: its own half width and a crayon edge more. */
export const PART_CLEAR = 12

/** Whether a part lying like this is clear of the home control and of the corner along its whole length. */
export function clearOfBoth(at: Placed): boolean {
  const [ax, ay, bx, by] = ends(at), need = SHAPES[at.kind].r + PART_CLEAR
  for (let k = 0; k <= 4; k++) if (roomAt(ax + ((bx - ax) * k) / 4, ay + ((by - ay) * k) / 4) < need) return false
  return true
}

export type Pressed =
  /** It stuck to a thing, or began one. */
  | { how: 'on'; thing: Thing; part: Part }
  /** The thing it touched carries all it can: it is shaken off. */
  | { how: 'shaken'; thing: Thing }
  /** It touched nothing and is not over the earth. */
  | { how: 'off' }

/**
 * Presses a part on where it is. It joins the thing whose nearest part it
 * touches most closely. Things never woken that it also touches become one
 * with that thing, when the whole stays within what one thing may carry. A
 * part that touches nothing begins a new thing if it is over the earth.
 * With `onto`, the part joins that thing and no other. A part let go off the
 * earth joins nothing that was never woken, so such a thing always lies on
 * the earth; and a part that would reach further from the thing's middle
 * than one thing may is shaken off like one part too many.
 */
export function pressOn(things: Thing[], kind: Kind, look: number, at: Placed, nextId: () => number, onto: Thing | null = null): Pressed {
  let best: Thing | null = onto, bestGap = STICK_SLACK
  const touched: Thing[] = []
  // A part that flew to a thing by itself belongs to that thing, whoever else is standing close by.
  for (const thing of onto ? [] : things) {
    // A sleeper under the fern takes nothing on.
    if (thing.bedded) continue
    const g = nearest(thing, at).gap
    if (g > STICK_SLACK) continue
    touched.push(thing)
    if (g <= bestGap) { best = thing; bestGap = g }
  }
  if (!best) {
    if (!onEarth(at.x, at.y)) return { how: 'off' }
    const thing: Thing = { id: nextId(), x: at.x, y: at.y, turn: 0, awake: false, woke: 0, drowsy: false, bedded: false, parts: [] }
    const part = newPart(kind, 0, 0, at.turn, look)
    thing.parts.push(part)
    things.push(thing)
    return { how: 'on', thing, part }
  }
  if (!best.awake && !onEarth(at.x, at.y)) return { how: 'off' }
  if (isFull(best, kind)) return { how: 'shaken', thing: best }
  // A creature takes nothing on where the part would lie under the home control or in the corner: it shakes it off.
  if (best.awake && !clearOfBoth(at)) return { how: 'shaken', thing: best }
  const local = toThing(best, at.x, at.y)
  if (reachWith(best, [{ kind, x: local.x, y: local.y }]) > MAX_REACH) return { how: 'shaken', thing: best }
  const part = newPart(kind, local.x, local.y, at.turn - best.turn, look)
  best.parts.push(part)
  if (!best.awake) {
    for (const other of touched) {
      if (other === best || other.awake) continue
      const allCaps = caps(best) + caps(other), allParts = best.parts.length + other.parts.length - allCaps
      if (allCaps > MAX_CAPS || allParts > MAX_PARTS) continue
      const theirs = other.parts.map((moved) => { const where = placed(other, moved), into = toThing(best, where.x, where.y); return { kind: moved.kind, x: into.x, y: into.y } })
      if (reachWith(best, theirs) > MAX_REACH) continue
      // The part bridges two things that were never woken: from now on they are one.
      for (const moved of other.parts) {
        const where = placed(other, moved), into = toThing(best, where.x, where.y)
        moved.x = into.x; moved.y = into.y; moved.turn = where.turn - best.turn
        moved.fromX = into.x; moved.fromY = into.y
        best.parts.push(moved)
      }
      things.splice(things.indexOf(other), 1)
    }
    recentre(best)
  }
  return { how: 'on', thing: best, part }
}

/** The gap two eyes are given that fly on by themselves: a third of a cap, so two eyes are two eyes and never one figure. */
export const CAP_GAP = SHAPES.cap.wide / 3
/** How far apart the middles of two such caps are. */
export const BESIDE = SHAPES.cap.r * 2 + CAP_GAP
const GOLDEN = Math.PI * (3 - Math.sqrt(5))
/** How many places a part that flies on by itself tries before it gives the thing up. */
export const SPOKES = 14
/** How far apart, in radians, two long parts are that fan from one place, and how far from straight on the first of them lies. */
export const FAN_STEP = 0.22
export const FAN_FIRST = 0.4

/** The place on a thing's edge that long parts fan from, in the thing's own frame: the tip of the part laid first, or its rim on the side away from the stem. `axis` points out of the thing there. */
export function hubOf(thing: Thing): { x: number; y: number; axis: number } {
  const first = thing.parts[0], shape = SHAPES[first.kind]
  const out = isLong(first.kind) ? shape.half : shape.half + shape.r * 0.7
  return { x: first.x + Math.cos(first.turn) * out, y: first.y + Math.sin(first.turn) * out, axis: first.turn }
}

/** A point of the thing's own frame, on the stage. */
function onStage(thing: Thing, x: number, y: number): { x: number; y: number } {
  const c = Math.cos(thing.turn), s = Math.sin(thing.turn)
  return { x: thing.x + x * c - y * s, y: thing.y + x * s + y * c }
}

/** Where a cap that flies on by itself comes to lie. */
function capLanding(thing: Thing, free: (at: Placed) => boolean): Placed | null {
  const eyes = thing.parts.filter((part) => part.kind === 'cap').map((part) => placed(thing, part))
  const body = thing.parts.filter((part) => part.kind !== 'cap').map((part) => placed(thing, part))
  if (eyes.length === 0) {
    // The first eye: on the part laid first, toward its stem end, where a second has room on the same part.
    const first = thing.parts[0], shape = SHAPES[first.kind], far = Math.min(shape.half + shape.r, Math.max(shape.half * 0.8, BESIDE / 2))
    const where = onStage(thing, first.x - Math.cos(first.turn) * far, first.y - Math.sin(first.turn) * far)
    return { kind: 'cap', x: where.x, y: where.y, turn: 0 }
  }
  // The next eye: a third of a cap clear of every eye that is there, and as far on to the thing as that leaves it.
  let best: Placed | null = null, bestScore = Infinity, spare: Placed | null = null, spareScore = Infinity
  for (const eye of eyes) {
    for (let k = 0; k < 24; k++) {
      const angle = (k / 24) * Math.PI * 2
      const at: Placed = { kind: 'cap', x: eye.x + Math.cos(angle) * BESIDE, y: eye.y + Math.sin(angle) * BESIDE, turn: 0 }
      if (eyes.some((other) => Math.hypot(other.x - at.x, other.y - at.y) < BESIDE - 0.01)) continue
      let score = body.length === 0 ? 1 - Math.cos(angle) : Infinity
      for (const part of body) score = Math.min(score, reach(part, at.x, at.y))
      if (score < spareScore) { spare = at; spareScore = score }
      if (score < bestScore && free(at)) { best = at; bestScore = score }
    }
  }
  return best ?? spare
}

/** Where a long part that flies on by itself comes to lie: by one end at the thing's edge, one of a fan, crossing nothing. */
function fanLanding(thing: Thing, kind: Kind, free: (at: Placed) => boolean): Placed | null {
  const hub = hubOf(thing), where = onStage(thing, hub.x, hub.y), half = SHAPES[kind].half
  const long = thing.parts.filter((part) => isLong(part.kind)).map((part) => placed(thing, part))
  // The ways out of the hub that a long part already lies along.
  const taken: number[] = []
  for (let i = 0; i < long.length; i++) {
    const [ax, ay, bx, by] = ends(long[i])
    const nearA = Math.hypot(ax - where.x, ay - where.y), nearB = Math.hypot(bx - where.x, by - where.y)
    if (Math.min(nearA, nearB) < 16) taken.push(nearA < nearB ? Math.atan2(by - ay, bx - ax) : Math.atan2(ay - by, ax - bx))
  }
  for (let k = 0; k < SPOKES; k++) {
    const angle = thing.turn + hub.axis + (k % 2 === 0 ? 1 : -1) * (FAN_FIRST + FAN_STEP * Math.floor(k / 2))
    if (taken.some((other) => Math.abs(wrap(other - angle)) < FAN_STEP / 2)) continue
    const at: Placed = { kind, x: where.x + Math.cos(angle) * (half + 2), y: where.y + Math.sin(angle) * (half + 2), turn: angle }
    if (long.some((other) => crosses(other, at))) continue
    if (free(at)) return at
  }
  return null
}

/** Where a leaf or a seed that flies on by itself comes to lie: on the part laid first, out from its middle like a petal, each a turn on from the last, and over no eye. */
function petalLanding(thing: Thing, kind: Kind, free: (at: Placed) => boolean): Placed | null {
  const first = placed(thing, thing.parts[0])
  const eyes = thing.parts.filter((part) => part.kind === 'cap').map((part) => placed(thing, part))
  const petals = thing.parts.filter((part) => part.kind !== 'cap' && !isLong(part.kind)).length
  const lap = 6 + SHAPES[kind].r * 0.3
  for (let tries = 0; tries < SPOKES; tries++) {
    const angle = first.turn + Math.PI / 2 + (petals + tries) * GOLDEN
    const at: Placed = { kind, x: first.x, y: first.y, turn: angle }
    // From well outside, in until it laps the body.
    for (let far = SHAPES[first.kind].half + SHAPES[first.kind].r + SHAPES[kind].half + SHAPES[kind].r + 8; far >= 0; far -= 4) {
      at.x = first.x + Math.cos(angle) * far
      at.y = first.y + Math.sin(angle) * far
      if (gap(first, at) <= -lap) break
    }
    if (eyes.some((eye) => gap(eye, at) < 4)) continue
    if (free(at)) return at
  }
  return null
}

/**
 * Where a part that flies to a thing by itself comes to lie, on the stage, or null when the thing has no place
 * left for it. An eye goes on to the thing, a third of a cap clear of every other eye. A twig, a willow leaf or
 * a feather goes on by one end at the thing's edge and fans from there like legs or a tail, so no two cross. A
 * maple wing, a round leaf or a seed laps the part laid first, like a petal.
 */
export function landingOn(thing: Thing, kind: Kind, free: (at: Placed) => boolean = () => true): Placed | null {
  if (kind === 'cap') return capLanding(thing, free)
  return isLong(kind) ? fanLanding(thing, kind, free) : petalLanding(thing, kind, free)
}

/** How a part that begins a thing by itself lies: each kind a little differently, so a first twig is not a first feather. */
export const LAY_TURN: Record<Kind, number> = { twig: 0.35, maple: -1.2, willow: 0.08, round: -0.9, feather: -0.3, seed: 0.7, cap: 0 }
