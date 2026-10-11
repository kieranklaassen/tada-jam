import { EARTH, MUD, ROCK, SAND, STONE, type Kind } from './ground'

// Each invader kind as a small table of habits, read by the raid. The habits are fixed, so a child can learn them
// and test them on purpose; they are the ones the design sheet lists under "The invaders, by habit" (ART.md).
// Nothing here moves an invader: this is what it can pass, what stops it, and how it answers each shot.

export type InvaderKind = 'ant' | 'beetle' | 'fly' | 'dungBeetle' | 'dungFly'
export const INVADERS: readonly InvaderKind[] = ['ant', 'beetle', 'fly', 'dungBeetle', 'dungFly']

/** What a machine can be loaded with. Each is a different shot. */
export type Shot = 'sand' | 'mud' | 'stone'
export const SHOTS: readonly Shot[] = ['sand', 'mud', 'stone']

/**
 * What a hit does. Nobody is hurt and nobody is removed: an invader goes `home` by itself, is `held` where it is
 * until the workers free it when the raid is over, or carries `on` after a moment.
 */
export type Answer = {
  /** The name of this outcome; no two are alike. */
  id: string
  then: 'home' | 'held' | 'on'
  /** Seconds of game time before it moves again. */
  pause: number
  /** How far it is thrown back along the way it came, in cells; `hall` is to the end of the open way behind it. */
  back: number | 'hall'
  /** A second hit of the same kind while it is still paused sends it home. */
  twiceIsHome?: true
  /** The dung ball grows by this many cells across. */
  ballGrows?: number
  /** The dung beetle gives up its ball and carries on as a plain beetle. */
  losesBall?: true
  /** Every dung beetle loses its way and rolls home. */
  armyLosesItsWay?: true
}

export type Habit = {
  /** The clear height it needs to walk, in cells. A flier does not walk. */
  high: number
  /** A flier needs a clear block this wide and this high to be in, and crosses walls, pits and mud wherever it has that. */
  flies: { wide: number; high: number } | null
  /** The highest step it gets up: a number of cells, or any face it can climb. */
  stepUp: number | 'any'
  /** The kinds whose faces it climbs, when it climbs. */
  climbs: readonly Kind[]
  /** A face of this kind slides away under it: it cannot be climbed. */
  slipsOn: readonly Kind[]
  /** Underfoot or on a face it climbs, this kind holds it fast. */
  stuckOn: readonly Kind[]
  /** A drop of this many cells or more is a pit it does not get out of. Null: it gets out of any pit, or flies over. */
  pit: number | null
  /** How hard it pushes a wall. Beetles in a line push together, up to `PUSHERS_IN_A_LINE`. */
  push: number
  /** It ploughs through loose sand that cannot be shoved. */
  ploughsSand: boolean
  /** Where its way is too narrow, it digs these kinds wider. */
  widens: readonly Kind[]
  /** What it wants, which it shows at the log. */
  want: string
  /** Its own act in a chamber, done once, and how many seconds it takes. */
  act: { id: string; seconds: number }
  /** How long it tries at something it cannot pass before it gives up and goes home, in seconds. */
  patience: number
  shots: Record<Shot, Answer>
}

/** The most beetles that push one wall together. */
export const PUSHERS_IN_A_LINE = 3
/** How many cells across a dung ball is, and how hard it pushes. */
export const DUNG_BALL = { across: 3, push: 6 } as const

const FLIER = { wide: 2, high: 3 } as const

export const HABITS: Record<InvaderKind, Habit> = {
  ant: {
    high: 1, flies: null, stepUp: 'any', climbs: [EARTH, STONE, ROCK], slipsOn: [SAND], stuckOn: [MUD], pit: null,
    push: 0, ploughsSand: false, widens: [],
    want: 'a-bed-that-is-not-its-own', act: { id: 'naps-in-the-middle', seconds: 6 }, patience: 5,
    shots: {
      sand: { id: 'buried-to-the-feelers', then: 'home', pause: 2, back: 0 },
      mud: { id: 'rolled-up-in-the-ball', then: 'held', pause: 0, back: 0 },
      stone: { id: 'rolled-flat', then: 'home', pause: 2.5, back: 1 },
    },
  },
  beetle: {
    high: 2, flies: null, stepUp: 1, climbs: [], slipsOn: [], stuckOn: [], pit: 2,
    push: 3, ploughsSand: true, widens: [],
    want: 'the-seeds-in-the-pantry', act: { id: 'eats-one-seed-slowly', seconds: 7 }, patience: 6,
    shots: {
      sand: { id: 'rattles-off-the-shell', then: 'on', pause: 1, back: 0 },
      mud: { id: 'walks-on-blind', then: 'home', pause: 1, back: 0 },
      stone: { id: 'onto-its-back', then: 'on', pause: 4, back: 2, twiceIsHome: true },
    },
  },
  fly: {
    high: 2, flies: FLIER, stepUp: 'any', climbs: [], slipsOn: [], stuckOn: [], pit: null,
    push: 0, ploughsSand: false, widens: [],
    want: 'to-taste-everything', act: { id: 'tastes-its-own-foot', seconds: 6 }, patience: 4,
    shots: {
      sand: { id: 'blown-back-tumbling', then: 'on', pause: 2, back: 'hall' },
      mud: { id: 'wings-gummed', then: 'home', pause: 5, back: 0 },
      stone: { id: 'steps-aside', then: 'on', pause: 0.5, back: 0 },
    },
  },
  dungBeetle: {
    high: 2, flies: null, stepUp: 1, climbs: [], slipsOn: [], stuckOn: [], pit: 2,
    push: 3, ploughsSand: true, widens: [SAND, MUD, EARTH],
    want: 'to-park-its-ball-in-the-grandest-room', act: { id: 'admires-its-ball', seconds: 8 }, patience: 6,
    shots: {
      sand: { id: 'ball-a-size-bigger', then: 'on', pause: 1, back: 0, ballGrows: 1 },
      mud: { id: 'ball-stuck-to-the-floor', then: 'on', pause: 3, back: 0, losesBall: true },
      stone: { id: 'runs-after-its-ball', then: 'on', pause: 1, back: 'hall' },
    },
  },
  dungFly: {
    high: 2, flies: FLIER, stepUp: 'any', climbs: [], slipsOn: [], stuckOn: [], pit: null,
    push: 0, ploughsSand: false, widens: [],
    want: 'to-be-obeyed', act: { id: 'conducts-nobody', seconds: 6 }, patience: 8,
    shots: {
      sand: { id: 'drops-its-twig', then: 'on', pause: 3, back: 'hall' },
      mud: { id: 'down-comes-the-leader', then: 'home', pause: 5, back: 0, armyLosesItsWay: true },
      stone: { id: 'steps-aside-without-looking', then: 'on', pause: 0, back: 0 },
    },
  },
}

/** Whether this kind fits a way of this clear height, in cells: a walker by its own height, a flier by its flying room. */
export const fits = (kind: InvaderKind, clearHigh: number, clearWide = Infinity): boolean => {
  const habit = HABITS[kind]
  return habit.flies ? clearHigh >= habit.flies.high && clearWide >= habit.flies.wide : clearHigh >= habit.high
}

/** Whether this kind gets up a step of this many cells whose face is of this kind. */
export function climbsStep(kind: InvaderKind, cells: number, face: Kind): boolean {
  const habit = HABITS[kind]
  if (habit.flies) return true
  if (habit.stepUp === 'any') return habit.climbs.includes(face)
  return cells <= habit.stepUp
}
