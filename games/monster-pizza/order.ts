import type { Picture, Wanted } from './card'
import { LADDER } from './config'
import { CHARACTERS, CUSTOMERS, type Customer } from './customers'
import { KINDS, type Kind } from './kinds'
import type { Rng } from './rng'
import type { CycleOutcome } from './state'

// The rules of an order: what a customer asks for at each place of the
// designed order, how a pizza compares with a card, and how a cycle went.
// Pure. The places and their ids are in config.ts (LADDER); what each holds is
// in the design sheet in ART.md, "The designed order, and what is stored".
//
// Designed from (cited by pack id or official code, never by wording):
//   us-ca K.CC.5, us-ca K.CC.6, and the foundations us-ca 1.2 and us-ca 1.6
//   (Mathematics, Strand 1.0) and us-ca 2.1 (Approaches to Learning, Strand 2.0);
//   nl Hoeveelheden / 3 (peuters), nl rw/gb/2/01/fase1, nl rw/gb/2/08/fase1
//   and nl rw/gb/2/03/fase1.

/** What an order holds at one place. Amounts are whole pieces. */
type Place = {
  /** How many kinds are wanted. */
  kinds: [number, number]
  /** How many pieces in all. */
  pieces: [number, number]
  /** Whether a tub of a kind that is not wanted stands on the table. */
  spareTub: boolean
  picture: Picture
}

/** No order asks for more than ten pieces in all. */
export const MOST = 10

const PLACES: Record<string, Place> = {
  'a-few': { kinds: [1, 1], pieces: [1, 3], spareTub: false, picture: 'rows' },
  'to-five': { kinds: [1, 1], pieces: [2, 5], spareTub: false, picture: 'rows' },
  'spare-tub': { kinds: [1, 1], pieces: [2, 5], spareTub: true, picture: 'rows' },
  'two-kinds': { kinds: [2, 2], pieces: [2, 5], spareTub: true, picture: 'rows' },
  'to-ten': { kinds: [1, 1], pieces: [6, 10], spareTub: true, picture: 'rows' },
  'two-kinds-to-ten': { kinds: [2, 2], pieces: [6, 10], spareTub: true, picture: 'rows' },
  'three-kinds': { kinds: [3, 3], pieces: [6, 10], spareTub: true, picture: 'rows' },
  scattered: { kinds: [1, 3], pieces: [3, 10], spareTub: true, picture: 'scattered' },
}

export function placeOf(position: string): Place {
  return PLACES[position] ?? PLACES[LADDER[0]]
}

export type Order = { wanted: Wanted[]; picture: Picture; seed: number; tubs: Kind[] }

/**
 * Lays out a customer's order for a place. The kind it loves is always on the
 * card and the kind it cannot stand never is; where a spare tub stands, it
 * holds the kind this customer cannot stand. `atLeast` is the fewest pieces
 * in all, for the first order a child ever sees, which a showing must not
 * complete.
 */
export function layOrder(position: string, who: Customer, rng: Rng, atLeast = 1): Order {
  const place = placeOf(position)
  const taste = CHARACTERS[who]
  const kindCount = place.kinds[0] + rng.int(place.kinds[1] - place.kinds[0] + 1)
  const low = Math.max(place.pieces[0], kindCount, atLeast)
  const total = low + rng.int(Math.max(1, place.pieces[1] - low + 1))
  const others = KINDS.filter((kind) => kind !== taste.loves && kind !== taste.cannotStand)
  const kinds: Kind[] = [taste.loves]
  while (kinds.length < kindCount) {
    const pick = rng.pick(others.filter((kind) => !kinds.includes(kind)))
    kinds.push(pick)
  }
  // Every kind gets one piece, and the rest are dealt out one at a time.
  const counts = kinds.map(() => 1)
  for (let left = total - kinds.length; left > 0; left--) counts[rng.int(kinds.length)] += 1
  const wanted = kinds.map((kind, i) => ({ kind, count: counts[i] }))
  // The tubs stand in an order of their own, so the kind wanted is not always the first one.
  const tubs = [...kinds, ...(place.spareTub ? [taste.cannotStand] : [])]
  for (let i = tubs.length - 1; i > 0; i--) {
    const j = rng.int(i + 1)
    ;[tubs[i], tubs[j]] = [tubs[j], tubs[i]]
  }
  return { wanted, picture: place.picture, seed: (rng.int(0x7fffffff) + 1) >>> 0, tubs }
}

/** How one kind on the pizza compares with the card: `off` above zero is too many, below zero too few. */
export type Difference = { kind: Kind; wanted: number; have: number; off: number }

/**
 * Pairs the pizza's pieces off with the card's, kind by kind, and returns the
 * kinds that do not come out even. A kind that is not on the card at all
 * counts as too many of it. The card's kinds come first, in the card's order.
 */
export function compare(wanted: readonly Wanted[], pieces: readonly { kind: Kind }[]): Difference[] {
  const have = new Map<Kind, number>()
  for (const piece of pieces) have.set(piece.kind, (have.get(piece.kind) ?? 0) + 1)
  const out: Difference[] = []
  for (const want of wanted) {
    const n = have.get(want.kind) ?? 0
    if (n !== want.count) out.push({ kind: want.kind, wanted: want.count, have: n, off: n - want.count })
    have.delete(want.kind)
  }
  for (const kind of KINDS) {
    const n = have.get(kind)
    if (n) out.push({ kind, wanted: 0, have: n, off: n })
  }
  return out
}

export function matches(wanted: readonly Wanted[], pieces: readonly { kind: Kind }[]): boolean {
  return compare(wanted, pieces).length === 0
}

/** How a cycle went, from how many pizzas the customer pushed back before the one it ate. Most should go well. */
export function judge(pushedBack: number): CycleOutcome {
  return pushedBack <= 0 ? 'well' : pushedBack === 1 ? 'mixed' : 'badly'
}

/** The place one higher: where the big roll's order comes from. The last place has none higher. */
export function harder(position: string, ladder: readonly string[] = LADDER): string {
  const at = ladder.indexOf(position)
  return at < 0 ? ladder[0] : ladder[Math.min(ladder.length - 1, at + 1)]
}

/**
 * How the position moves when a customer has eaten. A cycle at the stored
 * position moves it one place by how it went. A cycle the child chose with
 * the big roll moves it up one place when it went well, and not at all otherwise.
 */
export function outcomeFor(pushedBack: number, bigRoll: boolean): CycleOutcome {
  const went = judge(pushedBack)
  return bigRoll && went !== 'well' ? 'mixed' : went
}

/**
 * Who waits at the door after a customer has been called in. The one who was
 * not picked stays and keeps its roll; a newcomer takes the other roll. On a
 * first visit both are new. Nobody at the door is the customer at the
 * counter or the one who has just eaten, and the two are never the same one.
 */
export function refillDoor(before: { small: Customer; big: Customer } | null, picked: 'small' | 'big' | null, atCounter: Customer | null, leaving: Customer | null, rng: Rng): { small: Customer; big: Customer } {
  const stays = before && picked ? (picked === 'small' ? before.big : before.small) : null
  const free = CUSTOMERS.filter((who) => who !== atCounter && who !== leaving && who !== stays)
  const newcomer = rng.pick(free)
  if (stays && picked) return picked === 'small' ? { small: newcomer, big: stays } : { small: stays, big: newcomer }
  return { small: newcomer, big: rng.pick(free.filter((who) => who !== newcomer)) }
}
