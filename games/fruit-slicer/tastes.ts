import { WHOLE, fitOf, giveOf, sameSize, shareLength, wholeParts, type Fruit } from './measure'
import { wanted, type Customer } from './orders'
import type { Served } from './serve'
import type { Piece } from './world'

// The characters' fixed tastes: how each wants its order cut. A taste never
// changes, so a child can learn it and test it on purpose, and it never enters
// the judgement of a cycle: meeting it is the visibly better way of filling an
// order, and missing it still fills the order. What comes out of here is the
// customer's body answering these exact pieces, as numbers the view acts out.
// Pure.

export type Taste =
  /** One smooth bulge for one piece; every further piece is a lump and a hiccup. */
  | { who: 'pelican'; liked: boolean; lumps: number[]; hiccups: number }
  /** Two pieces of one length, one each; otherwise the longer piece is pulled between them. */
  | { who: 'twins'; liked: boolean; pulled: 0 | 1 | null; by: number }
  /** How many ants lift each piece, which ants are flattened under a piece that ends between two of them, and how many walk with nothing. */
  | { who: 'ants'; liked: boolean; lifts: number[]; flattened: number[]; idle: number }
  /** The longer tin filled; a look at the gap when it was given the smaller share; cross-eyed when the two shares are equal. */
  | { who: 'cat'; liked: boolean; gaveSmaller: boolean; crossEyed: boolean; gap: number }
  /** Long smooth swellings; a sneeze for every crumb. */
  | { who: 'boa'; liked: boolean; swellings: number[]; sneezes: number }

/** A piece shorter than this share of its fruit is a crumb to the boa. */
export const CRUMB_PARTS = 8

/** What the customer's body makes of exactly these pieces. */
export function tasteOf(customer: Customer, result: Served): Taste {
  const pieces = result.parts.flatMap((part) => part.pieces)
  const lengths = pieces.map((piece) => piece.length)
  switch (customer.who) {
    case 'pelican':
      return { who: 'pelican', liked: pieces.length === 1, lumps: lengths, hiccups: Math.max(0, pieces.length - 1) }
    case 'twins': {
      const [a, b] = result.parts
      const by = (a?.total ?? 0) - (b?.total ?? 0)
      const even = Math.abs(by) <= giveOf(customer.fruit)
      const oneEach = a?.pieces.length === 1 && b?.pieces.length === 1
      return { who: 'twins', liked: even && oneEach, pulled: even ? null : by > 0 ? 0 : 1, by }
    }
    case 'ants': {
      const share = wanted(customer)
      const part = shareLength(customer.fruit, { num: 1, den: share.den })
      const lifts: number[] = [], flattened: number[] = []
      let end = 0
      for (const piece of pieces) {
        end += piece.length
        const count = wholeParts(piece.length, customer.fruit, share.den)
        lifts.push(count ?? Math.max(1, Math.ceil(piece.length / part)))
        // The ant standing under the end of a piece that stops between two marks.
        if (count === null) flattened.push(Math.max(0, Math.min(share.num - 1, Math.floor(end / part))))
      }
      const busy = Math.min(share.num, lifts.reduce((sum, count) => sum + count, 0))
      return { who: 'ants', liked: pieces.length === share.num && lifts.every((count) => count === 1) && flattened.length === 0, lifts, flattened: [...new Set(flattened)], idle: share.num - busy }
    }
    case 'cat': {
      const [first, second] = customer.shares
      const equal = !!second && sameSize(first, second)
      const smaller = second ? Math.min(shareLength(customer.fruit, first), shareLength(customer.fruit, second)) : 0
      const total = result.parts[0]?.total ?? 0
      const gaveSmaller = !equal && !!second && fitOf(total, smaller, giveOf(customer.fruit)).kind === 'fit'
      return { who: 'cat', liked: result.kind === 'fit', gaveSmaller, crossEyed: equal, gap: Math.max(0, -result.by) }
    }
    case 'boa': {
      const crumb = WHOLE[customer.fruit] / CRUMB_PARTS
      const sneezes = lengths.filter((length) => length < crumb).length
      return { who: 'boa', liked: sneezes === 0 && pieces.length > 0, swellings: lengths.filter((length) => length >= crumb), sneezes }
    }
  }
}

/** The dog under the counter wants whatever falls, and likes the smallest things best. */
export type DogTaste = { act: 'spin' | 'snap' | 'cheeks'; cheeks: number }

/** What the dog does with a length of this fruit: a full circle for a curl or a crumb, a snap for a piece, bulging cheeks for a long one. */
export function dogTaste(length: number, fruit: Fruit): DogTaste {
  const share = length / WHOLE[fruit]
  return { act: share < 1 / CRUMB_PARTS ? 'spin' : share < 1 / 2 ? 'snap' : 'cheeks', cheeks: Math.min(1, share) }
}

/** Whether a customer fed by hand, with no tin, got the secret: a whole uncut fruit, to the pelican. */
export function isGlider(customer: Customer, piece: Piece): boolean {
  return customer.who === 'pelican' && piece.length === WHOLE[piece.fruit]
}
