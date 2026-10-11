import { LADDER } from './config'
import { VASE, VASES, maxLean, type Vase, type VaseId } from './layout'
import { PLANTS, type Kind } from './plants'

// The four visitors, the turns of the ring, and each visitor's fixed taste.
// Pure: what a visitor makes of a bouquet depends on the bouquet alone, so the
// same bouquet gets the same answer every time and a child can test it.

export const VISITORS = ['goat', 'beekeeper', 'bride', 'aunt'] as const
export type VisitorId = (typeof VISITORS)[number]

export type Turn = { visitor: VisitorId; vase: VaseId }

type Spot = { x: number; y: number }

/**
 * Where the parts of each visitor are, from the middle of its head, at full size: what the plants land on, stick
 * to and wind round. `headY` is how high the middle of its head is on the stage when it stands at the table.
 * `ivy` is the part a tendril takes hold of: the goat's horn, the bride's ear, the others' noses.
 */
export const RIG: Record<VisitorId, { headY: number; nose: Spot; eyes: readonly [Spot, Spot]; top: Spot; mouth: Spot; behind: Spot; neck: Spot; ivy: Spot }> = {
  goat: { headY: 398, nose: { x: 0, y: 75 }, eyes: [{ x: -41, y: -22 }, { x: 41, y: -22 }], top: { x: 0, y: -84 }, mouth: { x: 0, y: 98 }, behind: { x: 112, y: 176 }, neck: { x: 0, y: 122 }, ivy: { x: 66, y: -150 } },
  beekeeper: { headY: 384, nose: { x: 0, y: 28 }, eyes: [{ x: -20, y: 4 }, { x: 20, y: 4 }], top: { x: 0, y: -98 }, mouth: { x: 0, y: 46 }, behind: { x: 118, y: 196 }, neck: { x: 0, y: 86 }, ivy: { x: 0, y: 28 } },
  bride: { headY: 312, nose: { x: 0, y: 10 }, eyes: [{ x: -15, y: -7 }, { x: 15, y: -7 }], top: { x: 0, y: -50 }, mouth: { x: 0, y: 27 }, behind: { x: 80, y: 250 }, neck: { x: 0, y: 58 }, ivy: { x: 35, y: -2 } },
  aunt: { headY: 332, nose: { x: 0, y: 22 }, eyes: [{ x: -14, y: -12 }, { x: 14, y: -12 }], top: { x: 0, y: -78 }, mouth: { x: 0, y: 38 }, behind: { x: 60, y: 240 }, neck: { x: 0, y: 64 }, ivy: { x: 0, y: 22 } },
}

/** The visitor and the vase of a turn of the ring. An id nobody knows is the first turn. */
export function turnOf(position: string): Turn {
  const [visitor, vase] = position.split('-')
  const known = (VISITORS as readonly string[]).includes(visitor) && (VASES as readonly string[]).includes(vase)
  return known ? { visitor: visitor as VisitorId, vase: vase as VaseId } : { visitor: 'goat', vase: 'boot' }
}

/** The turn after this one: the ring has no end. */
export function nextPosition(position: string, ladder: readonly string[] = LADDER): string {
  const at = ladder.indexOf(position)
  return ladder[(at + 1) % ladder.length]
}

/** A piece of a bouquet, as a taste reads it. */
export type Stood = { kind: Kind; len: number; head: boolean; spent: boolean; at: number; scale: number }

/** How a piece stands in a vase (garden.ts works it out): how far it sinks, and whether its head tips. */
export type Stance = { lean: number; sink: number; droop: number }

export type Answer = 'loves' | 'cannot' | 'stalks' | 'laugh' | 'unveil' | 'plain'

export type Verdict = {
  /** The plants whose flowers answer the sniff, in the order the child put them in: the first three kinds. */
  sniffs: Kind[]
  /** The visitor's own answers to the whole bouquet, in the order they play. */
  answers: Answer[]
  /** How many bees ride the bouquet. */
  bees: number
  /** Every piece stands out of the vase to the same height. */
  neat: boolean
  /** Which pieces are carried off, by their place in the bouquet. The goat keeps the first and eats the rest. */
  keeps: number[]
  /** The dandelions of the bouquet end bald: a sneeze blew them. */
  bald: boolean
}

/** A flower that can still answer a sniff: it is on the piece, and it is not spent. */
const inFlower = (piece: Stood): boolean => piece.head && !piece.spent

/** Stands out of the vase to within this of every other piece: the aunt's eye for neatness, in stage units. */
export const NEAT_WITHIN = 14

/**
 * What a visitor makes of a bouquet. `stances` is how each piece stands in `vase`, in the same order.
 * Nothing here is chance, and nothing depends on anything but the pieces, their order and how they stand.
 */
export function verdict(who: VisitorId, pieces: readonly Stood[], stances: readonly Stance[], vase: Vase): Verdict {
  const sniffs: Kind[] = []
  for (const piece of pieces) if (inFlower(piece) && !sniffs.includes(piece.kind) && sniffs.length < 3) sniffs.push(piece.kind)
  const stalks = pieces.length > 0 && pieces.every((piece) => !piece.head)
  const has = (kind: Kind): boolean => pieces.some((piece) => piece.kind === kind && inFlower(piece))
  const bees = pieces.filter((piece) => piece.head && PLANTS[piece.kind].bee).length
  const outs = pieces.map((piece, index) => piece.len - stances[index].sink)
  const neat = pieces.length > 0 && Math.max(...outs) - Math.min(...outs) <= NEAT_WITHIN
  const untidy = stances.some((stance) => stance.droop !== 0 || Math.abs(stance.lean) > maxLean(vase) * 0.8)
  const answers: Answer[] = []
  let bald = sniffs.includes('dandelion')
  // The aunt's taste is for neatness and not for flowers: a stalk that tips or leans out wide gets her eyebrow before she measures.
  if (stalks) answers.push(...(who === 'aunt' && untidy ? ['cannot', 'stalks'] as const : ['stalks'] as const))
  else {
    switch (who) {
      case 'goat':
        if (pieces.some((piece) => piece.kind === 'thistle')) answers.push('loves')
        if (has('onion')) answers.push('cannot')
        break
      case 'beekeeper':
        answers.push(bees > 0 ? 'loves' : 'cannot')
        break
      case 'bride':
        if (has('poppy')) answers.push('loves')
        if (has('dandelion')) { answers.push('cannot'); bald = true }
        break
      case 'aunt':
        if (has('thistle') && has('dandelion')) { answers.push('laugh'); bald = true }
        if (untidy) answers.push('cannot')
        else if (neat) answers.push('loves')
        break
    }
  }
  // Any ivy in what she is handed takes hold of her veil, tip or no tip, stalks or flowers.
  if (who === 'beekeeper' && pieces.some((piece) => piece.kind === 'ivy')) answers.push('unveil')
  if (answers.length === 0) answers.push('plain')
  const keeps = who === 'goat' ? (pieces.length > 0 ? [0] : []) : pieces.map((_, index) => index)
  return { sniffs, answers, bees, neat, keeps, bald }
}

/** How many more pieces are tipped to the right than to the left. */
export function tippedBalance(stances: readonly Stance[]): number {
  return stances.reduce((sum, stance) => sum + Math.sign(stance.droop), 0)
}

/** Whether a vase with these pieces goes over, and to which side; and whether it is one head short of it and rocks. */
export function tipping(stances: readonly Stance[], vase: Vase): { over: -1 | 0 | 1; rocks: boolean } {
  if (vase.tips === 0) return { over: 0, rocks: false }
  const balance = tippedBalance(stances)
  const over = Math.abs(balance) >= vase.tips ? (Math.sign(balance) as -1 | 1) : 0
  return { over, rocks: over === 0 && Math.abs(balance) === vase.tips - 1 }
}

export { VASE }
