import { LADDER } from './config'
import { FRUITS, PARTS, RAIL, commonParts, compareShares, reduced, shareLength, type Fruit, type Share } from './measure'
import { pick } from './stream'

// Who comes to the window and what they order, by the position in the designed
// order. Pure and seeded: the same position and the same state of the stream
// lay out the same customer. The limits each order is held to are the ones in
// ART.md under "The records"; `inRange` states them and the test holds every
// order ever laid out to them.

export type Who = 'pelican' | 'twins' | 'ants' | 'cat' | 'boa'

export type Customer = {
  who: Who
  /** The fruit the order is a share of. The cat's two shares are of this one fruit. */
  fruit: Fruit
  /** One share, or two for the cat. Kept as ordered: two quarters stay two quarters. */
  shares: Share[]
  /** It carried what was new at the position it was laid out for. Only a cycle with such a customer moves the position. */
  step: boolean
  /** The fraction is laid on its ticket and on its open tin. */
  written: boolean
  /** Its ticket shows the part lines. */
  lined: boolean
}

/** What is new at each position of the ladder. A position with neither a new customer nor new parts changes how a ticket looks. */
const NEW: Readonly<Record<string, { who?: Who; parts?: readonly number[] }>> = {
  half: { who: 'pelican', parts: [2] },
  quarter: { parts: [4] },
  shared: { who: 'twins' },
  carried: { who: 'ants' },
  written: {},
  eighths: { parts: [8] },
  thirds: { parts: [3, 6] },
  fifths: { parts: [5, 10] },
  twelfths: { parts: [12] },
  bigger: { who: 'cat' },
  longer: { who: 'boa' },
  bare: {},
}

const indexOf = (position: string): number => Math.max(0, LADDER.indexOf(position))

/** Everything in play at a position: the customers met so far and the parts a fruit has been cut into so far. */
export function inPlay(position: string): { who: Who[]; parts: number[]; written: boolean } {
  const who: Who[] = [], parts: number[] = []
  for (const id of LADDER.slice(0, indexOf(position) + 1)) {
    const added = NEW[id]
    if (added?.who) who.push(added.who)
    if (added?.parts) parts.push(...added.parts)
  }
  return { who, parts, written: indexOf(position) >= LADDER.indexOf('written') }
}

/** The share the customer wants in its tin: the one ordered, or the bigger of the cat's two. */
export function wanted(customer: Customer): Share {
  const [first, second] = customer.shares
  return second && compareShares(second, first) > 0 ? second : first
}

/** The sign that goes between the cat's two shares, first to second. */
export function signBetween(customer: Customer): 'less' | 'equals' | 'greater' | null {
  const [first, second] = customer.shares
  if (!second) return null
  const order = compareShares(first, second)
  return order < 0 ? 'less' : order > 0 ? 'greater' : 'equals'
}

/** The share each twin gets: half of the order, in the fewest parts. */
export function twinShare(share: Share): Share {
  return reduced({ num: share.num, den: 2 * share.den })
}

/** The lengths of the tin's compartments, in points: one for most customers, two equal ones for the twins. */
export function tinParts(customer: Customer): number[] {
  const length = shareLength(customer.fruit, wanted(customer))
  return customer.who === 'twins' ? [length / 2, length / 2] : [length]
}

/** Every order this customer could place with these parts, of this fruit. */
export function ordersFor(who: Who, fruit: Fruit, parts: readonly number[]): Share[][] {
  const single: Share[] = []
  for (const den of parts) {
    const most = who === 'boa' ? 2 * den : who === 'pelican' || who === 'cat' ? den - 1 : den
    const least = who === 'boa' ? den + 1 : who === 'ants' ? 2 : 1
    for (let num = least; num <= most; num++) {
      const share = { num, den }
      if (who === 'twins' && !PARTS.includes(twinShare(share).den)) continue
      if (shareLength(fruit, share) > RAIL) continue
      single.push(share)
    }
  }
  if (who !== 'cat') return single.map((share) => [share])
  // Two shares that differ in both numbers, and that can be ruled into the same parts with parts on the list.
  const pairs: Share[][] = []
  for (const a of single) for (const b of single) if (a.num !== b.num && a.den !== b.den && PARTS.includes(commonParts(a, b))) pairs.push([a, b])
  return pairs
}

/** Whether an order uses parts from this list: in a share, or in what each twin gets. */
function usesParts(customer: Pick<Customer, 'who' | 'shares'>, parts: readonly number[]): boolean {
  return customer.shares.some((share) => parts.includes(share.den) || (customer.who === 'twins' && parts.includes(twinShare(share).den)))
}

/**
 * Lays out one customer for a position. `role` says which of the two who wait this is: the one who carries
 * what is new at the position, or one drawn from an earlier position, so known work comes back mixed in. At
 * the first position both carry the new thing, since nothing comes before it.
 */
export function layOut(position: string, role: 'new' | 'known', seed: number): { customer: Customer; seed: number } {
  const here = indexOf(position)
  let state = seed
  let at = here
  if (role === 'known' && here > 0) {
    const earlier = pick(state, [...Array(here).keys()])
    at = earlier.value
    state = earlier.state
  }
  const id = LADDER[at]
  const added = NEW[id] ?? {}
  const play = inPlay(id)
  // The customer who is new at that position, or anyone met so far; then an order that uses what is new there.
  const whos = (added.who ? [added.who] : play.who).filter((who) => FRUITS.some((fruit) => choices(who, fruit).length > 0))
  function choices(who: Who, fruit: Fruit): Share[][] {
    const all = ordersFor(who, fruit, play.parts)
    return added.parts ? all.filter((shares) => usesParts({ who, shares }, added.parts!)) : all
  }
  const who = pick(state, whos)
  const fruits = FRUITS.filter((fruit) => choices(who.value, fruit).length > 0)
  const fruit = pick(who.state, fruits)
  const shares = pick(fruit.state, choices(who.value, fruit.value))
  const customer: Customer = {
    who: who.value,
    fruit: fruit.value,
    shares: shares.value.map((share) => ({ ...share })),
    step: role === 'new' || here === 0,
    written: inPlay(position).written,
    lined: !(position === 'bare' && role === 'new'),
  }
  return { customer, seed: shares.state }
}

/** The limits every order is held to. Returns what is wrong with it, or nothing. */
export function inRange(customer: Customer): string[] {
  const wrong: string[] = []
  const { who, shares, fruit } = customer
  if (shares.length !== (who === 'cat' ? 2 : 1)) wrong.push('the number of shares')
  for (const share of shares) {
    if (!PARTS.includes(share.den)) wrong.push(`parts not in play: ${share.den}`)
    if (!Number.isInteger(share.num) || share.num < 1) wrong.push('not a count of parts')
    if (who !== 'boa' && who !== 'twins' && who !== 'ants' && share.num >= share.den) wrong.push('a whole or more')
    if ((who === 'twins' || who === 'ants') && share.num > share.den) wrong.push('more than a whole')
    if (who === 'boa' && (share.num <= share.den || share.num > 2 * share.den)) wrong.push('not between one whole and two')
    if (!Number.isInteger(shareLength(fruit, share))) wrong.push('not a whole number of points')
    if (shareLength(fruit, share) > RAIL) wrong.push('longer than the rail')
  }
  if (who === 'twins' && !PARTS.includes(twinShare(shares[0]).den)) wrong.push("a twin's share is off the list")
  if (who === 'ants' && shares[0].num < 2) wrong.push('one ant is not a file')
  if (who === 'cat' && shares.length === 2) {
    if (shares[0].num === shares[1].num || shares[0].den === shares[1].den) wrong.push('the two shares do not differ in both numbers')
    if (!PARTS.includes(commonParts(shares[0], shares[1]))) wrong.push('no common parts on the list')
  }
  return wrong
}
