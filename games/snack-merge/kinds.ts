// The six things on the shelf and the one rule of joining (ART.md, "The
// object-by-action grid"). A snack is the set of things it holds, kept as a
// number whose bits name them in shelf order, so a snack is the same snack
// however it was made. Pure: no drawing and no sound.

export const THINGS = ['bread', 'cheese', 'egg', 'chilli', 'jelly', 'ice'] as const
export type Thing = (typeof THINGS)[number]

/** Which things a snack holds: bit `i` is `THINGS[i]`. One to three bits are set. */
export type Kind = number

export const BREAD = 1, CHEESE = 2, EGG = 4, CHILLI = 8, JELLY = 16, ICE = 32
/** The three that add a layer, and the three that add a power. */
export const LAYERS = BREAD | CHEESE | EGG
export const POWERS = CHILLI | JELLY | ICE

/** A snack holds at most this many things. */
export const MOST = 3

export function countOf(kind: Kind): number {
  let n = 0
  for (let i = 0; i < THINGS.length; i++) if (kind & (1 << i)) n += 1
  return n
}

/** Whether a number is a snack: whole, with one to three of the six bits set. */
export function isKind(value: unknown): value is Kind {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 && value < 1 << THINGS.length && countOf(value) <= MOST
}

/** The shelf places of the things a snack holds, in shelf order. */
export function thingsOf(kind: Kind): number[] {
  const out: number[] = []
  for (let i = 0; i < THINGS.length; i++) if (kind & (1 << i)) out.push(i)
  return out
}

/** Two snacks that touch join when they share no thing and hold at most three between them. */
export function canJoin(a: Kind, b: Kind): boolean {
  return (a & b) === 0 && countOf(a | b) <= MOST
}

export function join(a: Kind, b: Kind): Kind {
  return a | b
}

/** Every snack there is: the six, the fifteen of two things and the twenty of three. */
export const ALL_KINDS: readonly Kind[] = Array.from({ length: (1 << THINGS.length) - 1 }, (_, i) => i + 1).filter(isKind)

/** How big a snack is, by how many things it holds, in stage units. */
const RADIUS = [0, 38, 48, 58] as const
export function radiusOf(kind: Kind): number {
  return RADIUS[countOf(kind)]
}
export const BIGGEST = RADIUS[MOST]

/**
 * Which thing answers when two snacks bump without joining: the first thing in shelf order that both hold, and
 * for two that share nothing and are only too many together, the first thing of the one that arrived.
 */
export function bumpThing(arrived: Kind, other: Kind): number {
  const shared = arrived & other
  return thingsOf(shared !== 0 ? shared : arrived)[0]
}

/**
 * How a thing behaves in the hand and in the jar. A snack of two or three things takes the mean of its things'
 * numbers, so a toastie hangs heavy and bounces a little.
 */
export type Manner = {
  /** How far it swings under the claw for the same pull, and how soon the swing dies (per second). */
  swing: number
  swingDamp: number
  /** How much of its speed it keeps in a bounce, 0 to 1. */
  bounce: number
  /** How flat an impact squashes it, and how the squash springs back: stiffness and damping. */
  squash: number
  squashStiff: number
  squashDamp: number
  /** How well it holds the floor, 0 to 1: ice slides on. */
  grip: number
  /** How much it goes on wobbling after any move, 0 to 1. */
  wobble: number
}

const MANNERS: readonly Manner[] = [
  /* bread  */ { swing: 0.25, swingDamp: 5, bounce: 0.04, squash: 0.36, squashStiff: 120, squashDamp: 11, grip: 1, wobble: 0 },
  /* cheese */ { swing: 1.25, swingDamp: 1.1, bounce: 0.6, squash: 0.26, squashStiff: 420, squashDamp: 14, grip: 0.7, wobble: 0.1 },
  /* egg    */ { swing: 0.7, swingDamp: 2.6, bounce: 0, squash: 0.5, squashStiff: 150, squashDamp: 9, grip: 0.45, wobble: 0.25 },
  /* chilli */ { swing: 0.8, swingDamp: 2.2, bounce: 0.22, squash: 0.16, squashStiff: 520, squashDamp: 22, grip: 0.8, wobble: 0 },
  /* jelly  */ { swing: 1, swingDamp: 1.5, bounce: 0.3, squash: 0.4, squashStiff: 210, squashDamp: 3.2, grip: 0.9, wobble: 1 },
  /* ice    */ { swing: 0, swingDamp: 9, bounce: 0.12, squash: 0, squashStiff: 600, squashDamp: 30, grip: 0.04, wobble: 0 },
]

const manners = new Map<Kind, Manner>()

export function mannerOf(kind: Kind): Manner {
  let manner = manners.get(kind)
  if (!manner) {
    const parts = thingsOf(kind).map((i) => MANNERS[i])
    const mean = (pick: (m: Manner) => number) => parts.reduce((sum, m) => sum + pick(m), 0) / parts.length
    manner = {
      swing: mean((m) => m.swing),
      swingDamp: mean((m) => m.swingDamp),
      bounce: mean((m) => m.bounce),
      squash: mean((m) => m.squash),
      squashStiff: mean((m) => m.squashStiff),
      squashDamp: mean((m) => m.squashDamp),
      grip: mean((m) => m.grip),
      // A wobble shows through whatever else is in the snack.
      wobble: Math.max(...parts.map((m) => m.wobble)),
    }
    manners.set(kind, manner)
  }
  return manner
}
