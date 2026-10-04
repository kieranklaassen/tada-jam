import type { Answer, Frame } from './frame'
import { key, length, pinsOf, type Part, type Point } from './kit'

// Where every part of the bridge comes to rest, for the view, and the springs
// that take it there. Pure numbers in grid cells (x right, y up).
//
// A firm part rests where the frame model puts it, with the model's small
// displacement drawn larger by one fixed factor. A part the model leaves out
// (frame.ts) is not science any more and says nothing: it hangs straight down
// from whatever still holds it, a part pinned to it hangs from its end in
// turn, and a part that nothing holds lies on the ground or floats.

/** The dip is drawn larger than computed, by this one factor for every part and every bridge (ART.md, "Where it is not science"). */
export const DRAWN_DIP = 6

/** The level of the water in every gap, in cells above the river bed. */
export const WATER = 2.05

export type Rest = {
  a: readonly [number, number]
  b: readonly [number, number]
  /** `firm`: carrying, where the model puts it. `hangs`: swinging from a point that is held. `lies`: nothing holds it. */
  how: 'firm' | 'hangs' | 'lies'
  /** The point it turns about, as a share of the way from a to b: 0 for a firm part. */
  pivot: number
  /** A thread that nothing pulls on: it is drawn with a loose curve. */
  slack: boolean
  /** A link of a chain: the hanging part this one hangs from, and where along that part, as a share from its a to its b. */
  via?: { part: number; share: number }
  /** Its other end is pinned to another swinging part as well: where along that one. While the two pins are as far apart as it is long, it goes with both, as the top of a square that leans into a diamond does. */
  tie?: { part: number; share: number }
}

export function rests(parts: readonly Part[], frame: Frame, answer: Answer, isFooting: (p: Point) => boolean, ground: (x: number) => number): Rest[] {
  const held = new Map<string, readonly [number, number]>()
  /** Where a grid point of a firm part lies now. */
  const firmAt = (p: Point): readonly [number, number] => {
    const node = frame.at.get(key(p))
    if (node === undefined) return p
    const [dx, dy] = answer.moved(node)
    return [p[0] + dx * DRAWN_DIP, p[1] + dy * DRAWN_DIP]
  }
  const out: (Rest | null)[] = parts.map((part, index) => {
    if (!frame.firm[index]) return null
    for (const point of pinsOf(part)) held.set(key(point), firmAt(point))
    return { a: firmAt(part.a), b: firmAt(part.b), how: 'firm', pivot: 0, slack: answer.parts[index].strain === 'slack' }
  })
  // A part hangs from the one solid point along it (a footing, or a pin of a firm part). What is pinned to a
  // hanging part and to nothing solid hangs from it in turn, like a chain.
  const solid = new Map(held)
  /** Which hanging part each held point is on, so a chain knows its links. */
  const owner = new Map<string, { part: number; share: number }>()
  const hangFrom = (part: Part, index: number, on: Point, at: readonly [number, number]) => {
    const long = length(part), share = Math.hypot(on[0] - part.a[0], on[1] - part.a[1]) / long
    // The longer side goes down, and where the ground is nearer than its length it leans, its end on the ground,
    // toward the side where the ground falls away.
    const down = share <= 0.5 ? 1 : -1, below = long * Math.max(share, 1 - share)
    const room = at[1] - ground(at[0])
    const lean = room >= below ? 0 : Math.acos(Math.max(0, room) / below) * (ground(at[0] + 0.5) <= ground(at[0] - 0.5) ? 1 : -1)
    const dx = Math.sin(lean) * down, dy = Math.cos(lean) * down
    const rest: Rest = { a: [at[0] - dx * share * long, at[1] + dy * share * long], b: [at[0] + dx * (1 - share) * long, at[1] - dy * (1 - share) * long], how: 'hangs', pivot: share, slack: false, via: owner.get(key(on)) }
    // Pinned by its one end to a swinging part and by its other to another one: it is tied to that one too.
    // Only where the two pins come to rest as far apart as it is long: then the three fold together, as a
    // parallelogram does, and it lies down joined to both.
    const via = rest.via, other = share === 0 ? part.b : share === 1 ? part.a : null, second = other && owner.get(key(other)), there = other && held.get(key(other))
    if (via && second && there && second.part !== via.part && Math.abs(Math.hypot(there[0] - at[0], there[1] - at[1]) - long) < 0.02 * long) {
      rest.tie = second
      // Where it rests is between the two pins.
      if (share === 0) { rest.a = [at[0], at[1]]; rest.b = [there[0], there[1]] } else { rest.b = [at[0], at[1]]; rest.a = [there[0], there[1]] }
    }
    out[index] = rest
    for (const p of pinsOf(part)) {
      if (held.has(key(p))) continue
      const along = Math.hypot(p[0] - part.a[0], p[1] - part.a[1]) / long
      held.set(key(p), [rest.a[0] + (rest.b[0] - rest.a[0]) * along, rest.a[1] + (rest.b[1] - rest.a[1]) * along])
      owner.set(key(p), { part: index, share: along })
    }
  }
  parts.forEach((part, index) => {
    if (out[index]) return
    const on = pinsOf(part).filter((p) => solid.has(key(p)) || isFooting(p))
    // Held at two solid places it cannot swing: it stays where it was laid.
    if (on.length > 1) out[index] = { a: part.a, b: part.b, how: 'hangs', pivot: 0, slack: false }
    else if (on.length === 1) hangFrom(part, index, on[0], solid.get(key(on[0])) ?? on[0])
  })
  for (let round = 0; round < parts.length; round++) {
    let hung = false
    parts.forEach((part, index) => {
      if (out[index]) return
      const on = pinsOf(part).find((p) => held.has(key(p)))
      if (!on) return
      hangFrom(part, index, on, held.get(key(on))!)
      hung = true
    })
    if (!hung) break
  }
  // What nothing holds drops where it is and lies level: on the ground, or on the water.
  return parts.map((part, index) => {
    const rest = out[index]
    if (rest) return rest
    const long = length(part), mid = (part.a[0] + part.b[0]) / 2
    const floor = Math.max(ground(mid), WATER) + 0.08
    return { a: [mid - long / 2, floor], b: [mid + long / 2, floor], how: 'lies', pivot: 0.5, slack: false }
  })
}

/** A value on a spring: where it is and how fast it moves. */
export type Spring = { at: number; speed: number }

/**
 * One step of a damped spring toward a target. `beat` is how many times a
 * second it would swing with nothing to damp it, and `damp` how quickly the
 * swing dies: under 1 it overshoots and settles, at 1 it arrives without.
 */
export function spring(s: Spring, target: number, dt: number, beat: number, damp: number): void {
  // Short steps keep a stiff spring steady whatever the frame time was.
  const steps = Math.max(1, Math.ceil(dt / 0.008)), h = dt / steps, w = 2 * Math.PI * beat
  for (let i = 0; i < steps; i++) {
    s.speed += (-w * w * (s.at - target) - 2 * damp * w * s.speed) * h
    s.at += s.speed * h
  }
}

/** The same angle, written as the turn nearest to `near`: a part swings the short way round. */
export const nearest = (angle: number, near: number): number => angle + 2 * Math.PI * Math.round((near - angle) / (2 * Math.PI))

/** A part as it is drawn at this instant: a point on it, the way it points, and both carried by springs. */
export type Moving = {
  /** The point the part turns about, in cells, and the share of the way from a to b where that point lies. */
  x: Spring
  y: Spring
  pivot: number
  /** The direction from a to b, in radians. */
  turn: Spring
  how: Rest['how']
}

const direction = (rest: Rest) => Math.atan2(rest.b[1] - rest.a[1], rest.b[0] - rest.a[0])
const pivotOf = (rest: Rest): [number, number] => [rest.a[0] + (rest.b[0] - rest.a[0]) * rest.pivot, rest.a[1] + (rest.b[1] - rest.a[1]) * rest.pivot]

/** A part already at rest: how the world is found on load, where nothing eases in. */
export function atRest(rest: Rest): Moving {
  const [x, y] = pivotOf(rest)
  return { x: { at: x, speed: 0 }, y: { at: y, speed: 0 }, pivot: rest.pivot, turn: { at: direction(rest), speed: 0 }, how: rest.how }
}

/** The two ends of a moving part, in cells. `long` is the length it was cut to. */
export function ends(moving: Moving, long: number): { a: [number, number]; b: [number, number] } {
  const c = Math.cos(moving.turn.at), s = Math.sin(moving.turn.at)
  return {
    a: [moving.x.at - c * long * moving.pivot, moving.y.at - s * long * moving.pivot],
    b: [moving.x.at + c * long * (1 - moving.pivot), moving.y.at + s * long * (1 - moving.pivot)],
  }
}

/** How each way of resting moves: a firm part is stiff light wood, a hanging one swings, a fallen one drops and settles. */
export const GAIT = {
  firm: { beat: 6.5, damp: 0.42, swing: 6.5, swingDamp: 0.5 },
  // What is not held folds slowly, like a deckchair: about half a second from upright to the ground.
  hangs: { beat: 5, damp: 0.6, swing: 0.55, swingDamp: 0.28 },
  lies: { beat: 2.2, damp: 0.75, swing: 2.2, swingDamp: 0.6 },
} as const

/**
 * Moves a part one step toward where it rests. When the point it turns about
 * changes (it was firm and now hangs from its other end), the part keeps the
 * place and the direction it has and swings on from there: nothing jumps.
 */
export function follow(moving: Moving, rest: Rest, long: number, dt: number, carried: readonly [number, number] = [0, 0]): void {
  if (moving.pivot !== rest.pivot) {
    const now = ends(moving, long)
    moving.x.at = now.a[0] + (now.b[0] - now.a[0]) * rest.pivot
    moving.y.at = now.a[1] + (now.b[1] - now.a[1]) * rest.pivot
    moving.pivot = rest.pivot
  }
  moving.how = rest.how
  // A link of a chain is carried along by the part it hangs from: `carried` is how far that part's pin is from its rest.
  const gait = GAIT[rest.how], [x, y] = pivotOf(rest)
  spring(moving.x, x + carried[0], dt, gait.beat, gait.damp)
  spring(moving.y, y + carried[1], dt, gait.beat, gait.damp)
  spring(moving.turn, nearest(direction(rest), moving.turn.at), dt, gait.swing, gait.swingDamp)
}

/** How far a part still is from rest, in cells and cells a second together: the scene is still when every part is under a small bound. */
export const unrest = (moving: Moving, rest: Rest, long: number): number => {
  const [x, y] = pivotOf(rest)
  return Math.hypot(moving.x.at - x, moving.y.at - y) + Math.abs(nearest(direction(rest), moving.turn.at) - moving.turn.at) * long + 0.1 * (Math.hypot(moving.x.speed, moving.y.speed) + Math.abs(moving.turn.speed) * long)
}
