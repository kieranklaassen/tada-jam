// Each invader kind as a small table, read by the raid: how hard it pushes, its own act in a chamber, how long it
// tries before it gives up, and how it answers each shot. What a kind fits, climbs and is stopped by, the other
// habits the design sheet lists under "The invaders, by habit" (ART.md), are rules of the way it goes (`routes.ts`)
// and of the raid (`raid.ts`), and are held by their tests.

export type InvaderKind = 'ant' | 'beetle' | 'fly' | 'dungBeetle' | 'dungFly'

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
  /** How hard it pushes a wall. Beetles in a line push together, up to `PUSHERS_IN_A_LINE`. */
  push: number
  /**
   * Its own act in a chamber, done once: how many seconds it takes the first of its kind in a raid, who does it in
   * full, and how many it takes a later one of the same kind, who does the end of it only.
   */
  act: { id: string; seconds: number; again: number }
  /** How long it tries at something it cannot pass before it gives up and goes home, in seconds. */
  patience: number
  shots: Record<Shot, Answer>
}

/** The most beetles that push one wall together. */
export const PUSHERS_IN_A_LINE = 3
/** How many cells across a dung ball is, and how hard it pushes. */
export const DUNG_BALL = { across: 3, push: 6 } as const

/** How long the short act of a later one of a kind takes: the end of the act, and no more. */
export const AGAIN = 1.8

export const HABITS: Record<InvaderKind, Habit> = {
  ant: {
    push: 0, act: { id: 'naps-in-the-middle', seconds: 5, again: AGAIN }, patience: 5,
    shots: {
      sand: { id: 'buried-to-the-feelers', then: 'home', pause: 2, back: 0 },
      mud: { id: 'rolled-up-in-the-ball', then: 'held', pause: 0, back: 0 },
      stone: { id: 'rolled-flat', then: 'home', pause: 2.5, back: 1 },
    },
  },
  beetle: {
    push: 3, act: { id: 'eats-one-seed-slowly', seconds: 6, again: AGAIN }, patience: 6,
    shots: {
      sand: { id: 'rattles-off-the-shell', then: 'on', pause: 1, back: 0 },
      mud: { id: 'walks-on-blind', then: 'home', pause: 1, back: 0 },
      stone: { id: 'onto-its-back', then: 'on', pause: 4, back: 2, twiceIsHome: true },
    },
  },
  fly: {
    push: 0, act: { id: 'tastes-its-own-foot', seconds: 5, again: AGAIN }, patience: 4,
    shots: {
      sand: { id: 'blown-back-tumbling', then: 'on', pause: 2, back: 'hall' },
      mud: { id: 'wings-gummed', then: 'home', pause: 5, back: 0 },
      stone: { id: 'steps-aside', then: 'on', pause: 0.5, back: 0 },
    },
  },
  dungBeetle: {
    push: 3, act: { id: 'admires-its-ball', seconds: 6, again: AGAIN }, patience: 6,
    shots: {
      sand: { id: 'ball-a-size-bigger', then: 'on', pause: 1, back: 0, ballGrows: 1 },
      mud: { id: 'ball-stuck-to-the-floor', then: 'on', pause: 3, back: 0, losesBall: true },
      stone: { id: 'runs-after-its-ball', then: 'on', pause: 1, back: 'hall' },
    },
  },
  dungFly: {
    push: 0, act: { id: 'conducts-nobody', seconds: 5, again: AGAIN }, patience: 8,
    shots: {
      sand: { id: 'drops-its-twig', then: 'on', pause: 3, back: 'hall' },
      mud: { id: 'down-comes-the-leader', then: 'home', pause: 5, back: 0, armyLosesItsWay: true },
      stone: { id: 'steps-aside-without-looking', then: 'on', pause: 0, back: 0 },
    },
  },
}
