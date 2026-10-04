import type { Kind } from './kinds'

// How a piece moves in the two moments it moves at all: as it lands, and
// once as its pizza slides out of the oven. Each kind has its own move for
// each. A piece at rest does not move, and no move changes what a piece is:
// every one ends exactly where and as it began. Pure: numbers for the view.

/**
 * What a move adds to a piece as it is drawn: a turn in radians, a hop in stage units, how much wider and taller
 * (0 is as it is), how far to one side of its spot it still is as it rolls there, how strongly it glints or
 * steams, each 0 to 1, and how far it has gone into its soft shape, 0 to 1 (`SOFT` in kinds.ts).
 */
export type PieceMove = { turn: number; hop: number; wide: number; tall: number; roll: number; shine: number; steam: number; soft: number }

/** A piece at rest. */
export const REST: PieceMove = { turn: 0, hop: 0, wide: 0, tall: 0, roll: 0, shine: 0, steam: 0, soft: 0 }

const hump = (t: number): number => Math.sin(Math.min(1, Math.max(0, t)) * Math.PI)

/**
 * How a kind answers the spring under it, for each unit of the spring. The spring peaks near 0.3 under a landing
 * and near 0.2 under the bob that a landing or a tap on the pizza gives the pieces already lying there, so these
 * are sized to be seen: a landing piece is squashed by a tenth to a sixth and hops a few units, and a piece that
 * bobs moves two units or more. The pepper swings, the mushroom's cap bobs highest, the olive hops, the cheese
 * slaps down flat and barely leaves the pizza, the sock flumps widest, the worm wriggles round.
 */
const LANDING: Record<Kind, { turn: number; hop: number; wide: number; tall: number }> = {
  pepper: { turn: 0.9, hop: 12, wide: 0.4, tall: -0.3 },
  mushroom: { turn: 0, hop: 24, wide: 0.35, tall: -0.35 },
  olive: { turn: 0, hop: 14, wide: 0.3, tall: -0.3 },
  cheese: { turn: 0, hop: 10, wide: 0.55, tall: -0.45 },
  sock: { turn: 0.2, hop: 12, wide: 0.6, tall: -0.5 },
  worm: { turn: -1.2, hop: 12, wide: 0.4, tall: -0.3 },
}

/**
 * How a tub answers the spring it sits on, which a finger pushes down: how much wider and taller it is drawn, 0 as
 * it is. Under a press the spring reaches about -0.2, so the tub is an eighth shorter and a tenth wider for a moment.
 */
export function tubSquash(spring: number): { wide: number; tall: number } {
  return { wide: -spring * 0.45, tall: spring * 0.62 }
}

/**
 * How the pizza answers its spring, which a landing and a tap both kick: a turn in radians and how much wider it is
 * drawn (and that much flatter). A landing turns it about two degrees and a tap about three, with everything on it.
 */
export function pizzaJiggle(spring: number): { turn: number; wide: number } {
  return { turn: spring * 0.25, wide: spring * 0.1 }
}

/** An olive comes down a finger-width short of its spot and rolls the rest of the way: how far, in stage units, and for how long. */
export const OLIVE_ROLLS = 18
/** A pepper comes down a little short and skids the rest, without turning over. */
export const PEPPER_SKIDS = 8
const ROLL_LASTS = 0.32

/** How far short of its spot a kind comes down, in stage units: its flight ends there, and the landing rolls it home. */
export function rollsIn(kind: Kind): number {
  return kind === 'olive' ? OLIVE_ROLLS : kind === 'pepper' ? PEPPER_SKIDS : 0
}

/** A piece landing: `settle` is where its spring is, 0 at rest, and `age` how many seconds ago it came down. */
export function landing(kind: Kind, settle: number, age = 9): PieceMove {
  const k = LANDING[kind]
  const u = Math.min(1, Math.max(0, age / ROLL_LASTS))
  // Rolling: it is still short of its spot by what is left, and turns as it comes.
  const left = rollsIn(kind) * (1 - u) * (1 - u)
  return { turn: k.turn * settle - (kind === 'olive' ? left / 13 : 0), hop: k.hop * settle, wide: k.wide * settle, tall: k.tall * settle, roll: -left, shine: 0, steam: 0, soft: 0 }
}

/**
 * A kind's baking move, played once as the pizza slides out, `u` from 0 to 1:
 * the pepper blisters in three quick swells, the mushroom shrinks a touch and
 * comes back, an olive glistens and jumps with a "tok", the cheese's corners go
 * soft and it sags, the sock lifts and sways and steams, the worm curls up
 * into a ball and lets go.
 */
export function bakingMove(kind: Kind, u: number): PieceMove {
  const h = hump(u)
  switch (kind) {
    case 'pepper': {
      const swell = 0.14 * Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u)
      return { ...REST, wide: swell, tall: swell }
    }
    case 'mushroom':
      return { ...REST, wide: -0.16 * h, tall: -0.16 * h }
    case 'olive':
      return { ...REST, hop: 14 * hump(u * 2.5), shine: h }
    case 'cheese':
      // Its corners go soft and round, and it sags a little wider.
      return { ...REST, wide: 0.1 * h, tall: -0.06 * h, soft: h }
    case 'sock':
      return { ...REST, turn: 0.14 * Math.sin(u * Math.PI * 4) * (1 - u), hop: 5 * h, steam: h }
    case 'worm':
      // It curls up into a ball, head to tail, and lets go.
      return { ...REST, turn: 0.7 * h, soft: h }
  }
}
