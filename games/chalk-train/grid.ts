import { KINDS, type Mark, type MarkKind, type Reading } from './marks'
import { crossings, inside, middle, nearestOn } from './path'
import { DANDELION, PUDDLE, distance, inPuddle, type Pt } from './yard'

// The grid of the design sheet: six things a mark can land on, by five kinds
// of mark. Two rules fill it and never change: the form of the mark is the
// form of the ride, and chalk laid on a thing chalks that thing. Every cell
// is seen and heard differently from every other.

export const THINGS = ['tar', 'engine', 'rider', 'puddle', 'dandelion', 'line'] as const
export type Thing = (typeof THINGS)[number]

export type Cell = {
  /** What is seen. The view keys its motion on this. */
  sight: string
  /** What is heard. The voices are keyed on this. */
  sound: string
  /** The chalk stays on the tar as a mark. Otherwise it went onto the thing. */
  stays: boolean
  /** The train sets off along the mark, or to it. */
  rides: boolean
}

const cell = (sight: string, sound: string, stays: boolean, rides: boolean): Cell => ({ sight, sound, stays, rides })

export const GRID: Record<Thing, Record<MarkKind, Cell>> = {
  tar: {
    tap: cell('dot-and-trundle', 'tick-then-hoot', true, true),
    line: cell('rail-run', 'long-whistle', true, true),
    zigzag: cell('corner-bunch', 'hiccup-toots', true, true),
    loop: cell('loop-the-loop', 'swoop-whistle', true, true),
    scribble: cell('thicket-burst', 'engine-sneeze', true, true),
  },
  engine: {
    tap: cell('smoke-ring', 'poot', false, false),
    line: cell('wheelspin-leap', 'screech', true, true),
    zigzag: cell('stripes-wriggle', 'wheezy-steam-giggle', false, false),
    loop: cell('lasso-spin', 'kettle-whistle', true, false),
    scribble: cell('dust-cloud-shake', 'cough-puff', false, false),
  },
  rider: {
    tap: cell('own-trick', 'own-call', false, false),
    line: cell('train-comes', 'coupling-clunk', true, true),
    zigzag: cell('tickle-bounce', 'own-squeak', false, false),
    loop: cell('hoop-spin', 'own-hum', true, false),
    scribble: cell('dusted-pale', 'own-sneeze', false, false),
  },
  puddle: {
    tap: cell('plop-rings', 'plop', false, false),
    line: cell('wet-chalk-bow-wave', 'hiss', true, true),
    zigzag: cell('skipping-splashes', 'plip-plip', true, true),
    loop: cell('ring-road-reflection', 'echo-whistle', true, true),
    scribble: cell('water-tint-swirl', 'glug', false, false),
  },
  dandelion: {
    tap: cell('seed-burst', 'soft-puff', false, false),
    line: cell('stalk-twang', 'twang', true, true),
    zigzag: cell('stalk-rattle', 'tick-tock-twangs', true, true),
    loop: cell('garden-ring-flower', 'petal-rustle', true, true),
    scribble: cell('seed-tuft-beard', 'muffled-toot', true, true),
  },
  line: {
    tap: cell('called-along-line', 'bell', false, true),
    line: cell('crossing', 'double-clack', true, true),
    zigzag: cell('rumble-strip', 'drumroll', true, true),
    loop: cell('curl-whip', 'whip-zip', true, true),
    scribble: cell('knot-squeeze', 'creak-cork', true, true),
  },
}

/** How near a mark must come to count as landing on a thing, in tar units. */
export const REACH = { engine: 85, rider: 65, dandelion: 55, stalk: 30, line: 28 } as const

/** What is on the tar when a mark lands. */
export type Scene = {
  /** The middle of the engine's body. */
  engine: Pt
  /** The middle of each rider that stands on the tar, at a stop or at home. */
  riders: readonly Pt[]
  /** The chalk already there. */
  marks: readonly Mark[]
}

export const dandelionHead = { x: DANDELION.x, y: DANDELION.y - 28 }
/** Whether a point is at the dandelion: within the stalk's reach of its head or of its foot. */
export const atDandelion = (q: Pt): boolean => distance(q, dandelionHead) <= REACH.stalk || distance(q, DANDELION) <= REACH.stalk
const puddleMiddle = { x: PUDDLE.x, y: PUDDLE.y }
const comesWithin = (p: readonly Pt[], target: Pt, reach: number): boolean => p.some((q) => distance(q, target) <= reach)

/**
 * The thing a mark lands on. Where a mark could count for several, the order
 * is the engine, a rider, the puddle, the dandelion, a line, and the bare tar
 * last. Which rider it is comes back as its index in the scene.
 */
export function landsOn(p: readonly Pt[], reading: Reading, scene: Scene): { thing: Thing; rider: number } {
  const hit = (thing: Thing, rider = -1) => ({ thing, rider })
  const older = scene.marks
  if (reading.kind === 'loop') {
    // A loop lands on what it goes round.
    if (inside(p, scene.engine)) return hit('engine')
    const round = scene.riders.findIndex((r) => inside(p, r))
    if (round >= 0) return hit('rider', round)
    if (inside(p, puddleMiddle)) return hit('puddle')
    if (inside(p, dandelionHead)) return hit('dandelion')
    return older.some((m) => crossings(p, m.p) > 0) ? hit('line') : hit('tar')
  }
  if (reading.kind === 'line') {
    // A line lands on where it starts, or on what it runs to or through.
    if (distance(p[0], scene.engine) <= REACH.engine) return hit('engine')
    const met = scene.riders.findIndex((r) => comesWithin(p, r, REACH.rider))
    if (met >= 0) return hit('rider', met)
    if (p.some((q) => inPuddle(q))) return hit('puddle')
    if (comesWithin(p, dandelionHead, REACH.stalk) || comesWithin(p, DANDELION, REACH.stalk)) return hit('dandelion')
    return older.some((m) => crossings(p, m.p) > 0) ? hit('line') : hit('tar')
  }
  // A tap, a zigzag and a scribble land on what lies under their middle.
  const at = reading.kind === 'tap' ? p[0] : middle(p)
  const wide = reading.kind === 'tap' ? 0 : 10
  // Chalk is laid on a thing only where some of it touches the thing: a wide zigzag whose middle happens to lie
  // over a rider has not chalked it, and a scribble is in the water where at least half of it is.
  if (distance(at, scene.engine) <= REACH.engine + wide && comesWithin(p, scene.engine, REACH.engine)) return hit('engine')
  const under = scene.riders.findIndex((r) => distance(at, r) <= REACH.rider + wide && comesWithin(p, r, REACH.rider))
  if (under >= 0) return hit('rider', under)
  if (reading.kind === 'zigzag' ? p.some((q) => inPuddle(q)) : inPuddle(at) && p.filter((q) => inPuddle(q)).length * 2 >= p.length) return hit('puddle')
  if (distance(at, dandelionHead) <= REACH.dandelion || (reading.kind === 'zigzag' && comesWithin(p, dandelionHead, REACH.stalk))) return hit('dandelion')
  if (reading.kind === 'zigzag') return older.some((m) => crossings(p, m.p) >= 2) ? hit('line') : hit('tar')
  return older.some((m) => m.p.length > 1 && nearestOn(m.p, at).gap <= REACH.line + wide) ? hit('line') : hit('tar')
}

/** What a mark of this kind does to the thing it lands on. */
export const answer = (thing: Thing, kind: MarkKind): Cell => GRID[thing][kind]

export const GRID_SIZE = THINGS.length * KINDS.length
