import type { Kind } from './kinds'

// How a piece moves in the two moments it moves at all: as it lands, and
// once as its pizza slides out of the oven. Each kind has its own move for
// each. A piece at rest does not move, and no move changes what a piece is:
// every one ends exactly where and as it began. Pure: numbers for the view.

/** What a move adds to a piece as it is drawn: a turn in radians, a hop in stage units, and how much wider and taller (0 is as it is). */
export type PieceMove = { turn: number; hop: number; wide: number; tall: number }

const hump = (t: number): number => Math.sin(Math.min(1, Math.max(0, t)) * Math.PI)

/** How a kind answers the spring it lands on, for each unit of the spring: the pepper skids round, the mushroom bobs, the olive hops, the cheese barely stirs, the sock flumps wide, the worm wriggles once. */
const LANDING: Record<Kind, PieceMove> = {
  pepper: { turn: 0.22, hop: 0, wide: 0.03, tall: 0.03 },
  mushroom: { turn: 0, hop: 5, wide: 0.07, tall: 0.07 },
  olive: { turn: 0, hop: 9, wide: 0.03, tall: 0.03 },
  cheese: { turn: 0, hop: 0, wide: 0.02, tall: 0.02 },
  sock: { turn: 0, hop: 0, wide: 0.11, tall: -0.09 },
  worm: { turn: -0.3, hop: 0, wide: 0.06, tall: -0.04 },
}

/** A piece landing: `settle` is where its spring is, 0 at rest. */
export function landing(kind: Kind, settle: number): PieceMove {
  const k = LANDING[kind]
  return { turn: k.turn * settle, hop: k.hop * settle, wide: k.wide * settle, tall: k.tall * settle }
}

/**
 * A kind's baking move, played once as the pizza slides out, `u` from 0 to 1:
 * the pepper blisters in three quick swells, the mushroom shrinks a touch and
 * comes back, an olive jumps with a "tok", the cheese sags wide and soft, the
 * sock lifts and sways in its own steam, the worm curls up and lets go.
 */
export function bakingMove(kind: Kind, u: number): PieceMove {
  const h = hump(u)
  switch (kind) {
    case 'pepper': {
      const swell = 0.14 * Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u)
      return { turn: 0, hop: 0, wide: swell, tall: swell }
    }
    case 'mushroom':
      return { turn: 0, hop: 0, wide: -0.16 * h, tall: -0.16 * h }
    case 'olive':
      return { turn: 0, hop: 14 * hump(u * 2.5), wide: 0, tall: 0 }
    case 'cheese':
      return { turn: 0, hop: 0, wide: 0.15 * h, tall: -0.1 * h }
    case 'sock':
      return { turn: 0.14 * Math.sin(u * Math.PI * 4) * (1 - u), hop: 5 * h, wide: 0, tall: 0 }
    case 'worm':
      return { turn: 0.7 * h, hop: 0, wide: -0.14 * h, tall: 0.04 * h }
  }
}
