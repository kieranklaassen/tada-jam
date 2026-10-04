import { ANSWER_SECONDS, type Decor } from './decor'
import type { Fruit } from './measure'
import { BOARD, COUNTER, CRATE, DOG, QUEUE, RAIL_BOX, SHELF_BOX, WALL, WINDOW, inside, type Box, type Point } from './stage'
import { draw } from './stream'
import { LANDS_AFTER, SETS_DOWN_AFTER, type GameEvent } from './moves'
import { TO_MOUTH_SECONDS } from './scenes'
import { answerSeconds } from './voices'

// What a touch sets off beyond itself: the burst of juice along a cut, the
// drops that fly on and spatter the wall, the hop of the two pieces, the curl
// of peel, a piece dropping to the dog, a fruit thumping down. None of it is
// saved and none of it is the state: the world has already changed when an
// effect starts, and the effect only shows how. Pure: it runs on the seconds
// it is handed and a stream of its own, which nothing else draws from.

export type Fx =
  /** A star of juice where the blade crossed. */
  | { kind: 'burst'; x: number; y: number; size: number; fruit: Fruit; seed: number; age: number; life: number }
  /** A drop in flight. One that reaches the wall leaves a spatter there. */
  | { kind: 'drop'; x: number; y: number; vx: number; vy: number; r: number; fruit: Fruit; wall: boolean; age: number; life: number }
  /** A spatter on the wall, or a smaller one on the bare wood of the counter. It dries and goes: short-lived, and never saved. */
  | { kind: 'spatter'; x: number; y: number; r: number; fruit: Fruit; seed: number; age: number; life: number }
  /** The lines a blade leaves behind it. */
  | { kind: 'lines'; x: number; y: number; angle: number; reach: number; age: number; life: number }
  /** A curl of peel, spinning away to the dog. */
  | { kind: 'curl'; x: number; y: number; fromX: number; fromY: number; fruit: Fruit; age: number; life: number }
  /** A piece on its way to whoever eats it: the dog, or a customer. `tx`, `ty` is the mouth it flies to. */
  | { kind: 'fly'; x: number; y: number; tx: number; ty: number; from: Box; fruit: Fruit; age: number; life: number }
  /** The mark of a knock on something bare. */
  | { kind: 'knock'; x: number; y: number; age: number; life: number }
  /** The tin's lid coming down on a misfit: it bounces on what sticks out, or shuts on a gap and springs back. */
  | { kind: 'lid'; how: 'over' | 'under'; age: number; life: number }
  /** The open tin's sprung jaw snapping out and back, twice, like a castanet: when it is poked, and when it springs open. */
  | { kind: 'jaw'; age: number; life: number }
  /** The crate's top slat, split by the blade. It mends as the fruit that tumbled out lands. */
  | { kind: 'slat'; age: number; life: number }
  /** The ruled parts under the open tin answering the roller, one by one. */
  | { kind: 'answer'; parts: number; age: number; life: number }
  /** The crate chewing what it was given, before the burp: its top works like a jaw. */
  | { kind: 'chew'; age: number; life: number }
  /** The roller on its way along what it was let go on: a fruit, a piece, the rail, the lid, a customer, the crate, the dog. */
  | { kind: 'roll'; x0: number; x1: number; y: number; age: number; life: number }
  /** The marks a comic puts round a head, with no letter in them: an impact star, drops of sweat flying off, and the short lines of a start. */
  | { kind: 'star'; x: number; y: number; size: number; seed: number; age: number; life: number }
  /** One of the things about the stall that are no part of the task, answering a tap in its own small way (decor.ts). */
  | { kind: 'decor'; what: Decor; index: number; age: number; life: number }
  | { kind: 'sweat'; x: number; y: number; seed: number; age: number; life: number }
  | { kind: 'shock'; x: number; y: number; r: number; age: number; life: number }

/** How a piece moves for a moment, on top of where it lies: a hop apart after a cut, a quiver, a landing, a slide to the shelf. */
export type Shake = { id: number; kind: 'hop' | 'quiver' | 'land' | 'slide' | 'rattle'; dir: number; from: Box | null; age: number; life: number }

export type FxState = {
  fx: Fx[]
  shakes: Shake[]
  /** The awning's flap: how far it is blown, and how fast that is changing. A spring brings it back. */
  flap: number
  flapSpeed: number
  /** The crate's rock, the same way. */
  rock: number
  rockSpeed: number
  /** The tin's jolt when it is poked, struck or skidded on: a stiff little spring. */
  jolt: number
  joltSpeed: number
  /** Where drops of juice came down on the stall's panel in the last step: whoever stands there has juice on its face. */
  hits: Point[]
  /** The state of the stream the effects scatter by. */
  seed: number
}

export const newFx = (seed: number): FxState => ({ fx: [], shakes: [], flap: 0, flapSpeed: 0, rock: 0, rockSpeed: 0, jolt: 0, joltSpeed: 0, hits: [], seed })

/** The most effects alive at once, and the most spatters on the wall: the oldest go first. */
export const MOST_FX = 90
export const MOST_SPATTERS = 28
const GRAVITY = 1500
/** Where the dog's mouth is, for whatever flies to it. */
export const MOUTH = { x: DOG.x + DOG.w / 2, y: DOG.y + 78 } as const

/** How long a curl of peel is in the air before it comes down on the dog's head, where it sits until the dog has it. */
export const CURL_FLIGHT = 0.55
export const CURL_LIFE = 1.05

/** A fruit out of the crate is in the air for the first part of its landing, and comes down with its thump this long after it set off. */
const LAND_FALL = 0.55
const LAND_LIFE = LANDS_AFTER / LAND_FALL

/** A lid that tries a misfit starts down as the piece is laid, takes this long over it, and first strikes what sticks out this long after it started. */
export const LID_LIFE = 0.7
export const LID_STRIKES = LID_LIFE / 6

/** A thing about the stall that is no part of the task is tapped, and answers: one answer at a time for each of them, started again by a new tap. */
export function answer(state: FxState, what: Decor, index: number): FxState {
  const others = state.fx.filter((one) => !(one.kind === 'decor' && one.what === what && one.index === index))
  return trimmed({ ...state, fx: [...others, { kind: 'decor', what, index, age: 0, life: ANSWER_SECONDS[what] }] })
}

/** How far through its answer one of them is, from 0 to 1, or -1 when it is not answering. */
export function answering(state: FxState, what: Decor, index = 0): number {
  const one = state.fx.find((other) => other.kind === 'decor' && other.what === what && other.index === index)
  return one ? Math.max(0, Math.min(1, one.age / one.life)) : -1
}

/** A comic's mark at a place on the stage, starting after `delay` seconds. */
export function mark(state: FxState, kind: 'star' | 'sweat' | 'shock', at: Point, delay = 0, size = 1): FxState {
  const drawn = draw(state.seed)
  const one: Fx = kind === 'star' ? { kind, x: at.x, y: at.y, size: 26 * size, seed: drawn.value * 1000, age: -delay, life: 0.3 } : kind === 'sweat' ? { kind, x: at.x, y: at.y, seed: drawn.value * 1000, age: -delay, life: 0.7 } : { kind, x: at.x, y: at.y, r: 34 * size, age: -delay, life: 0.4 }
  return trimmed({ ...state, fx: [...state.fx, one], seed: drawn.state })
}

/** The roller, let go, runs from `x0` to `x1` at height `y` before it is back on its cords. */
export function rollAlong(state: FxState, x0: number, x1: number, y: number, life: number): FxState {
  return trimmed({ ...state, fx: [...state.fx.filter((one) => one.kind !== 'roll'), { kind: 'roll', x0, x1, y, age: 0, life }] })
}

/** Adds what one thing that happened sets off. `heads` says where each customer's face is, for what flies to one. */
export function spawn(state: FxState, event: GameEvent, heads: Partial<Record<'window' | 0 | 1, Point>> = {}): FxState {
  const next: FxState = { ...state, fx: [...state.fx], shakes: [...state.shakes] }
  const random = (): number => {
    const drawn = draw(next.seed)
    next.seed = drawn.state
    return drawn.value
  }
  // A shake that starts `after` a wait holds the piece where it was until then.
  const shake = (id: number, kind: Shake['kind'], dir: number, life: number, from: Box | null = null, after = 0): void => {
    next.shakes = next.shakes.filter((other) => other.id !== id)
    next.shakes.push({ id, kind, dir, from, age: -after, life })
  }
  switch (event.kind) {
    case 'cut': {
      const big = Math.min(1, event.length / 2400)
      // The burst pops above the piece, clear of the cut itself, which is the thing to be read.
      next.fx.push({ kind: 'burst', x: event.x, y: event.y - event.h / 2 - 18, size: 24 + 26 * big, fruit: event.fruit, seed: random() * 1000, age: 0, life: 0.3 })
      next.fx.push({ kind: 'lines', x: event.x, y: event.y - event.h / 2 - 4, angle: Math.PI / 2, reach: 70 + 50 * big, age: 0, life: 0.24 })
      const drops = 7 + Math.round(4 * big)
      for (let i = 0; i < drops; i++) {
        // Most drops go up and on to the wall; a few fall short onto the counter.
        const wall = i % 3 !== 2
        // Drops for the wall fan out wide, so the wall is spattered and not blotted in one place.
        const vx = (random() - 0.5) * (wall ? 1300 : 420)
        // A drop for the wall leaves fast enough to get there from wherever the cut was made, the bottom row of the shelf included, and
        // lives until it does: every one of them spatters the wall.
        const from = event.y - event.h / 2, reach = Math.sqrt(2 * GRAVITY * Math.max(0, from - (WALL.y + WALL.h - 12)))
        const vy = wall ? -Math.max(820 + random() * 520, reach * (1.12 + random() * 0.3)) : -(220 + random() * 260)
        next.fx.push({ kind: 'drop', x: event.x, y: from, vx, vy, r: 4 + random() * 5, fruit: event.fruit, wall, age: 0, life: wall ? 1.2 : 0.55 })
      }
      shake(event.left, 'hop', -1, 0.34)
      shake(event.right, 'hop', 1, 0.34)
      break
    }
    case 'curl':
      next.fx.push({ kind: 'curl', x: event.x, y: event.y, fromX: event.x, fromY: event.y, fruit: event.fruit, age: 0, life: CURL_LIFE })
      shake(event.id, 'quiver', 1, 0.3)
      break
    case 'poke':
      shake(event.id, 'quiver', 1, 0.6)
      break
    case 'land':
      shake(event.id, 'land', 0, LAND_LIFE)
      next.rockSpeed += 5
      break
    case 'swept':
      event.ids.forEach((id, i) => shake(id, 'slide', 0, 0.3, event.from[i], event.after ?? 0))
      break
    case 'fell':
      next.fx.push({ kind: 'fly', x: event.from.x, y: event.from.y, tx: MOUTH.x, ty: MOUTH.y, from: event.from, fruit: event.piece.fruit, age: -(event.after ?? 0), life: 0.4 })
      break
    case 'ate':
    case 'splat': {
      // To a customer's mouth, or onto its face, where it bursts.
      const to = heads[event.whom] ?? mouthOf(event.whom)
      next.fx.push({ kind: 'fly', x: event.from.x, y: event.from.y, tx: to.x, ty: to.y, from: event.from, fruit: event.piece.fruit, age: event.kind === 'ate' ? -(event.after ?? 0) : 0, life: TO_MOUTH_SECONDS })
      if (event.kind === 'splat') next.fx.push({ kind: 'burst', x: to.x, y: to.y, size: 30, fruit: event.piece.fruit, seed: random() * 1000, age: -TO_MOUTH_SECONDS, life: 0.3 })
      break
    }
    case 'setDown':
      event.ids.forEach((id, i) => shake(id, 'slide', 0, SETS_DOWN_AFTER, event.from[i]))
      break
    case 'misfit':
      // Too long, the lid bounces on it; too short, the piece slides and rattles in the gap, by no more than the gap.
      next.fx.push({ kind: 'lid', how: event.how, age: 0, life: LID_LIFE })
      if (event.gap > 0) shake(event.id, 'rattle', Math.min(1, event.gap / 200), 0.9)
      next.joltSpeed += 5
      break
    case 'tinPoke':
      next.joltSpeed += event.open ? 9 : 6
      if (event.open) next.fx.push({ kind: 'jaw', age: 0, life: 0.3 })
      break
    case 'burp':
      // It chews first, rocking as it does, and then burps.
      next.rockSpeed += 7
      next.fx.push({ kind: 'chew', age: 0, life: 0.36 })
      break
    case 'given':
      shake(event.id, 'slide', 0, 0.2, event.from)
      // The tin springs open: it jolts on its rail, and the jaw at its end snaps out.
      if (event.opened) {
        next.joltSpeed += 8
        next.fx.push({ kind: 'jaw', age: 0, life: 0.3 })
      }
      break
    case 'knocked':
      shake(event.id, 'slide', 0, 0.3, event.from, event.after ?? 0)
      break
    case 'bounce':
    case 'skid':
      if (event.kind === 'skid' || event.off === 'tin') next.joltSpeed += 8
      // A whole fruit that a flung piece bounced off shivers, and so does anything struck where it lies on the shelf.
      if (event.kind === 'bounce' && event.struck !== undefined) shake(event.struck, 'quiver', 1, 0.5)
      next.fx.push({ kind: 'burst', x: event.x, y: event.y, size: 20, fruit: 'middle', seed: random() * 1000, age: 0, life: 0.2 })
      next.fx.push({ kind: 'lines', x: event.x, y: event.y, angle: -Math.PI / 2, reach: 50, age: 0, life: 0.2 })
      break
    case 'rolled':
      next.fx.push({ kind: 'knock', x: event.x, y: event.y, age: 0, life: 0.3 })
      if (event.on === 'crate') next.rockSpeed += 6
      if (event.on === 'tin') next.joltSpeed += 5
      if (event.on === 'tin' && event.parts > 0) next.fx.push({ kind: 'answer', parts: event.parts, age: 0, life: answerSeconds(event.parts) })
      break
    case 'spill':
      next.rockSpeed += 9
      next.fx.push({ kind: 'slat', age: 0, life: 0.45 })
      next.fx.push({ kind: 'burst', x: CRATE.x + CRATE.w / 2, y: CRATE.y + 30, size: 34, fruit: 'middle', seed: random() * 1000, age: 0, life: 0.25 })
      break
    case 'snap':
      next.fx.push({ kind: 'lines', x: event.x, y: event.y, angle: Math.PI, reach: 60, age: 0, life: 0.2 })
      break
    case 'knock':
      next.fx.push({ kind: 'knock', x: event.x, y: event.y, age: 0, life: 0.25 })
      break
    default:
      // What happens to a customer, the tin or the roller is acted out by the figures, not by an effect here.
      break
  }
  return trimmed(next)
}

/** A stroke that crossed nothing: lines where it went, and the awning flaps. */
export function whoosh(state: FxState, x: number, y: number, angle: number): FxState {
  return trimmed({ ...state, fx: [...state.fx, { kind: 'lines', x, y, angle, reach: 110, age: 0, life: 0.26 }], flapSpeed: state.flapSpeed + 7 })
}

function trimmed(state: FxState): FxState {
  let fx = state.fx
  const spatters = fx.filter((one) => one.kind === 'spatter')
  if (spatters.length > MOST_SPATTERS) {
    const drop = new Set<Fx>(spatters.slice(0, spatters.length - MOST_SPATTERS))
    fx = fx.filter((one) => !drop.has(one))
  }
  if (fx.length > MOST_FX) fx = fx.slice(fx.length - MOST_FX)
  return { ...state, fx }
}

/** Plays `dt` seconds: everything ages, drops fly and fall, a drop that reaches the wall leaves a spatter, and what is over goes. */
export function step(state: FxState, dt: number): FxState {
  const fx: Fx[] = []
  const hits: Point[] = []
  let seed = state.seed
  for (const one of state.fx) {
    const age = one.age + dt
    if (one.kind === 'drop') {
      const x = one.x + one.vx * dt, y = one.y + one.vy * dt, vy = one.vy + GRAVITY * dt
      const onWall = one.wall && y <= WALL.y + WALL.h - 12
      if (onWall || age >= one.life) {
        if (onWall) {
          const drawn = draw(seed)
          seed = drawn.state
          const at = { x: Math.max(WALL.x + 22, Math.min(WALL.x + WALL.w - 22, x)), y: Math.max(WALL.y + 60, y - drawn.value * 150) }
          fx.push({ kind: 'spatter', x: at.x, y: at.y, r: one.r * 1.9, fruit: one.fruit, seed: drawn.value * 1000, age: 0, life: 14 })
          hits.push(at)
        } else if (!one.wall && inside({ x, y }, COUNTER) && ![BOARD, SHELF_BOX, RAIL_BOX, CRATE, DOG].some((box) => inside({ x, y }, { x: box.x - 10, y: box.y - 10, w: box.w + 20, h: box.h + 20 }))) {
          // A drop that falls short leaves a small splat on the bare wood, never on the board, the shelf or the rail.
          fx.push({ kind: 'spatter', x, y, r: one.r * 1.2, fruit: one.fruit, seed: x + y, age: 0, life: 8 })
        }
        continue
      }
      fx.push({ ...one, x, y: Math.min(y, COUNTER.y + COUNTER.h - 8), vy, age })
    } else if (age < one.life) {
      fx.push({ ...one, age } as Fx)
    }
  }
  // Two springs, each with its own stiffness: the awning is loose cloth, the crate is heavy wood.
  const flapSpeed = (state.flapSpeed - state.flap * 60 * dt) * Math.max(0, 1 - 3.2 * dt)
  const rockSpeed = (state.rockSpeed - state.rock * 190 * dt) * Math.max(0, 1 - 7 * dt)
  const joltSpeed = (state.joltSpeed - state.jolt * 420 * dt) * Math.max(0, 1 - 9 * dt)
  return trimmed({
    fx,
    shakes: state.shakes.map((shake) => ({ ...shake, age: shake.age + dt })).filter((shake) => shake.age < shake.life),
    flap: state.flap + flapSpeed * dt,
    flapSpeed,
    rock: state.rock + rockSpeed * dt,
    rockSpeed,
    jolt: state.jolt + joltSpeed * dt,
    joltSpeed,
    hits,
    seed,
  })
}

/** Where a piece is drawn for now, on top of its own box: an offset, and a squash that keeps its left edge and its length. */
export type Offset = { dx: number; dy: number; squash: number }
const STILL: Offset = { dx: 0, dy: 0, squash: 0 }

/**
 * A working piece moves only as the idea needs: it hops apart from the one it was cut from and lands with a
 * small squash, quivers when poked, drops in from the crate, or slides to the shelf. Its length never changes.
 */
export function offsetOf(state: FxState, id: number, at: Box | null): Offset {
  const shake = state.shakes.find((one) => one.id === id)
  if (!shake) return STILL
  const t = Math.max(0, Math.min(1, shake.age / shake.life))
  switch (shake.kind) {
    case 'hop': {
      const up = Math.sin(Math.min(1, t / 0.7) * Math.PI)
      const settle = t > 0.7 ? Math.sin(((t - 0.7) / 0.3) * Math.PI) : 0
      return { dx: shake.dir * 5 * (1 - t), dy: -16 * up, squash: 0.16 * settle }
    }
    case 'quiver':
      return { dx: 0, dy: Math.sin(t * Math.PI * 7) * 4 * (1 - t), squash: 0.1 * Math.sin(t * Math.PI * 7) * (1 - t) }
    case 'land': {
      // It comes out of the crate: from over the crate's corner of the counter, up in an arc and down onto its lane, where it lands with a squash.
      const fall = Math.min(1, t / LAND_FALL)
      const settle = t > LAND_FALL ? Math.sin(((t - LAND_FALL) / (1 - LAND_FALL)) * Math.PI) : 0
      if (!at) return { dx: 0, dy: -150 * (1 - fall * fall), squash: 0.22 * settle }
      const dx = Math.max(0, COUNTER.x + COUNTER.w - 10 - (at.x + at.w)), dy = CRATE.y - 20 - at.y
      return { dx: dx * (1 - fall), dy: dy * (1 - fall * fall) - 70 * Math.sin(fall * Math.PI), squash: 0.22 * settle }
    }
    case 'rattle':
      // It slides back and forth in the gap, further the wider the gap, and comes to rest where it lies.
      return { dx: 14 * shake.dir * Math.abs(Math.sin(t * Math.PI * 4)) * (1 - t), dy: 0, squash: 0 }
    case 'slide': {
      if (!shake.from || !at) return STILL
      const ease = 1 - (1 - t) * (1 - t)
      return { dx: (shake.from.x - at.x) * (1 - ease), dy: (shake.from.y - at.y) * (1 - ease), squash: 0 }
    }
  }
}

/** Whether anything is still moving, so the view knows the scene has settled. */
export function settled(state: FxState): boolean {
  return state.shakes.length === 0 && state.fx.every((one) => one.kind === 'spatter') && Math.abs(state.flap) < 0.002 && Math.abs(state.rock) < 0.002 && Math.abs(state.jolt) < 0.002
}

/** Where something flying to a mouth is now: an arc from where it started to that mouth, the dog's unless another is given. */
export function flight(fromX: number, fromY: number, t: number, to: { x: number; y: number } = MOUTH): { x: number; y: number } {
  const ease = t * t
  return { x: fromX + (to.x - fromX) * t, y: fromY + (to.y - fromY) * ease - Math.sin(t * Math.PI) * 90 }
}

/** Where a customer's mouth is, near enough for something to fly to: the one at the window, or one of the two who wait. */
export function mouthOf(whom: 'window' | 0 | 1): { x: number; y: number } {
  const box = whom === 'window' ? WINDOW : QUEUE[whom]
  return { x: box.x + (whom === 'window' ? 210 : 100), y: box.y + (whom === 'window' ? 96 : 150) }
}
