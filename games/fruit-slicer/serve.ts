import { WHOLE, commonParts, fitOf, giveOf, inParts, shareLength, type Fit, type Share } from './measure'
import { signBetween, tinParts, type Customer } from './orders'
import { inTin, type Piece, type World } from './world'

// The error as a consequence: what lies in a tin against what was ordered.
// A tin is exactly as long as the share that was ordered and its jaw has a
// little give, so a piece fits, sticks out by exactly the excess, or leaves a
// gap exactly as long as what is missing. Nothing here is a verdict: these are
// the lengths the view draws. Pure.

export type Compartment = {
  /** The length this compartment was made for, in points. */
  ordered: number
  /** The pieces of the ordered fruit lying in it, in order, and their total length. */
  pieces: Piece[]
  total: number
  /** How the total sits against the ordered length: within the give, over by so much, or under by so much. */
  fit: Fit
}

export type Served = {
  parts: Compartment[]
  /** Every compartment within the give; or the way the worst one is off; or nothing of the ordered fruit in the tin at all. */
  kind: 'fit' | 'over' | 'under' | 'empty'
  /** By how many points the worst compartment is over (positive) or under (negative). */
  by: number
  /** Pieces of another fruit: shares of a different whole. The customer picks them out for the dog. */
  strays: Piece[]
}

/** Lays lists of pieces, one list a compartment, against a customer's order. */
export function serveOf(customer: Customer, lists: readonly (readonly Piece[])[]): Served {
  const give = giveOf(customer.fruit)
  const strays: Piece[] = []
  const parts = tinParts(customer).map((ordered, index) => {
    const all = lists[index] ?? []
    const pieces = all.filter((piece) => piece.fruit === customer.fruit)
    strays.push(...all.filter((piece) => piece.fruit !== customer.fruit))
    const total = pieces.reduce((sum, piece) => sum + piece.length, 0)
    return { ordered, pieces, total, fit: fitOf(total, ordered, give) }
  })
  const worst = parts.reduce((a, b) => (Math.abs(b.fit.by) > Math.abs(a.fit.by) ? b : a))
  const any = parts.some((part) => part.pieces.length > 0)
  const kind = !any ? 'empty' : parts.every((part) => part.fit.kind === 'fit') ? 'fit' : worst.fit.kind
  return { parts, kind, by: worst.fit.by, strays }
}

/** What lies in the tin at the window against the order of the customer standing there. */
export function served(world: World, customer: Customer): Served {
  return serveOf(customer, tinParts(customer).map((_, part) => inTin(world, part)))
}

/** One share as it is ruled on the rail under the open tin: the whole in equal parts, and how many of them the share covers. */
export type RuledRow = { share: Share; parts: number; lit: number }

/**
 * The why of a consequence: the whole fruit ruled into equal parts along the rail, with the ordered parts
 * lit. For the cat's two shares both rows are ruled into the same parts, the fewest that both come out in,
 * and the sign goes between their ends.
 */
export function ruling(customer: Customer): { whole: number; rows: RuledRow[]; sign: 'less' | 'equals' | 'greater' | null } {
  const [first, second] = customer.shares
  const parts = second ? commonParts(first, second) : first.den
  const rows = customer.shares.map((share) => ({ share, parts, lit: inParts(share, parts)?.num ?? share.num }))
  return { whole: WHOLE[customer.fruit], rows, sign: signBetween(customer) }
}

/** How much of one ruled part a misfit is: the gap or the overhang as a fraction of a part, signed like `by`. */
export function offInParts(customer: Customer, by: number): number {
  const part = shareLength(customer.fruit, { num: 1, den: ruling(customer).rows[0].parts })
  return by / part
}
