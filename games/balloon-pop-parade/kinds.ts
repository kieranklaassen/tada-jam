// The four kinds of friend. Each kind is one colour all over and takes only
// balloons of that colour, so a balloon's colour is named by the kind it
// belongs to and there is no list of colours beside this one.

export const KINDS = ['duck', 'frog', 'hippo', 'crab'] as const

export type Kind = (typeof KINDS)[number]

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

/**
 * A kind's fixed tastes, as ids of its own motions for the view to play. They
 * never change, so what a child finds out about a kind stays true.
 */
export type Taste = {
  /** How it takes a balloon of its own colour. */
  catch: string
  /** How it refuses a balloon of another colour. */
  refuse: string
  /** How it goes up with a bunch that holds too many. */
  liftOff: string
  /** What it does when a balloon it holds is popped. */
  popped: string
  /** What it does when it is poked itself. */
  poke: string
  /** Whether the balloon it refuses ends in a pop. */
  refusalPops: boolean
}

// No two kinds share a motion (the test holds that), so a refusal is as much
// that kind's own as its catch.
export const TASTES: Record<Kind, Taste> = {
  duck: { catch: 'beakCatch', refuse: 'tailSwat', liftOff: 'flapUp', popped: 'leapAndSit', poke: 'tailWag', refusalPops: true },
  frog: { catch: 'tongueReel', refuse: 'throatBounce', liftOff: 'tongueHang', popped: 'throatFlat', poke: 'hopOnSpot', refusalPops: true },
  // The hippo sneezes the balloon away: it zooms off going flat and never pops.
  hippo: { catch: 'yawnCatch', refuse: 'sneeze', liftOff: 'toesLift', popped: 'slowLookUp', poke: 'bellyWobble', refusalPops: false },
  crab: { catch: 'snipCatch', refuse: 'pinch', liftOff: 'propeller', popped: 'hideEyes', poke: 'sideShuffle', refusalPops: true },
}
