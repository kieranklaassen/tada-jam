import { LADDER } from './config'
import type { CupSize } from './forms'
import { SEAT_COUNT, TRAY, placeSpot, spoonSpot, type Spot } from './layout'
import { LIKES, type Party, type PartyGuest } from './party'
import { emptyWorld, type GuestId, type Thing, type ThingKind, type World } from './world'

// The designed order, made concrete: which party each position lays out, and
// the table that party sits down to. No clock and no chance of its own: the
// ordinary detail of a party (which of two guests comes, who sits where) is
// drawn from a seeded stream whose state is stored, so the same position and
// seed always lay out the same party. Nothing else in the game draws from
// this stream, and nothing here is shown or counted.

/** Where the stream starts, and what stands in for a seed that cannot be used. Any number but 0 would do. */
export const FIRST_SEED = 2463534242

/**
 * One step of the stream: a xorshift on an unsigned 32-bit state. A state of 0
 * would stay 0 for ever, so 0 and anything that is not a number start from
 * `FIRST_SEED`, and no step ever gives 0.
 */
export function nextSeed(seed: number): number {
  let state = Number.isFinite(seed) ? seed >>> 0 : 0
  if (state === 0) state = FIRST_SEED
  state ^= state << 13
  state ^= state >>> 17
  state ^= state << 5
  return state >>> 0
}

/** A whole number from 0 to n - 1 read from a seed. It reads the top of the state, which is the better mixed end. */
export function pick(seed: number, n: number): number {
  const count = Math.floor(n)
  if (!(count > 1)) return 0
  const state = Number.isFinite(seed) ? seed >>> 0 : 0
  return Math.min(count - 1, Math.floor((state / 0x100000000) * count))
}

/** Several draws in a row from one seed. The seed is stepped before the first draw and after each one, so the state left over has been used for nothing. */
function draws(seed: number) {
  let state = nextSeed(seed)
  const below = (n: number): number => {
    const value = pick(state, n)
    state = nextSeed(state)
    return value
  }
  /** A copy of the list in an order from the stream. */
  const shuffled = <T>(list: readonly T[]): T[] => {
    const out = [...list]
    for (let i = out.length - 1; i > 0; i--) {
      const j = below(i + 1)
      const moved = out[i]
      out[i] = out[j]
      out[j] = moved
    }
    return out
  }
  return { below, shuffled, left: () => state }
}

const own = (who: GuestId): PartyGuest => ({ who, cup: 'own' })
const bare = (who: GuestId): PartyGuest => ({ who, cup: 'none' })
const party = (guests: PartyGuest[], trayCups: CupSize[] = [], laysOwnPlace = false): Party => ({ guests, trayCups, laysOwnPlace })

/** The plain cup that holds a guest's amount when it is full. A Duckling has no amount of its own and takes a house cup. */
export function plainCupFor(who: GuestId): CupSize {
  return who === 'mouse' ? 'thimble' : who === 'hen' ? 'small' : 'house'
}

/**
 * The party a position lays out, and the seed to store for next time. An id
 * the order does not know lays out the first position's party. The seed that
 * comes back has always moved on, so the next party is drawn afresh. A party
 * never has more than four guests, and a Duckling never comes without its
 * twin, who sits on its right.
 */
export function partyFor(position: string, seed: number): { party: Party; seed: number } {
  const { below, shuffled, left } = draws(seed)
  const bearOrMouse = (): GuestId => (below(2) === 0 ? 'bear' : 'mouse')
  const laid = (): Party => {
    switch (LADDER.includes(position) ? position : LADDER[0]) {
      case 'drop':
        return party([own('mouse')], [], true)
      case 'lay-a-place':
        return party([own(bearOrMouse())])
      case 'two-guests':
        return party(shuffled([own('bear'), own('mouse')]))
      case 'halfway':
        return party(shuffled([own('hen'), own(bearOrMouse())]))
      case 'three-guests':
        return party(shuffled([own('bear'), own('hen'), own('mouse')]))
      case 'twins':
        return party([own('duckling-a'), own('duckling-b')])
      case 'whose-cup':
        return party(shuffled([bare('bear'), bare('mouse')]), shuffled<CupSize>(['house', 'thimble']))
      case 'three-cups':
        // Smallest amount at the left, so the three cups end in a row by size.
        return party([bare('mouse'), bare('hen'), bare('bear')], shuffled<CupSize>(['thimble', 'small', 'house']))
      case 'full-table': {
        // The Ducklings and two of the other three, each of those two with its own cup or with none.
        const others = shuffled<GuestId>(['bear', 'mouse', 'hen']).slice(0, 2).map((who) => (below(2) === 0 ? own(who) : bare(who)))
        // The twins move as one block, so they stay side by side wherever they sit.
        const blocks = shuffled([[own('duckling-a'), own('duckling-b')], [others[0]], [others[1]]])
        const cups = others.filter((guest) => guest.cup === 'none').map((guest) => plainCupFor(guest.who))
        return party(blocks.flat(), shuffled(cups))
      }
      default:
        // `brim`, the first position.
        return party([own('bear')], [], true)
    }
  }
  const made = laid()
  return { party: made, seed: left() }
}

/** How far apart the spoons lie on the tray, and the plain cups stand. */
const SPOON_GAP = 0.22
const CUP_GAP = 1.35

/** A spot is kept to a hundredth of a unit, which is how a save stores it. */
const hundredth = (value: number): number => Math.round(value * 100) / 100 + 0

function thing(id: string, kind: ThingKind, spot: Spot, over: Partial<Thing> = {}): Thing {
  return { id, kind, size: 'house', ring: null, owner: null, x: hundredth(spot.x), z: hundredth(spot.z), on: null, heldBy: null, tea: 0, ...over }
}

/**
 * The table as a party sits down to it: the pot on its stand, the saucers in
 * a stack and the spoons in a row on the tray, each guest's own cup, the plain
 * cups for the guests who bring none, and the sponge and the bowl. Everything
 * is dry. A guest who lays its own place has taken the top saucer and the last
 * spoon to its place and set its cup on the saucer; any other guest with a cup
 * holds it in the air over its place. The sponge and the bowl are in the list
 * from the start: whether they have come out of the tray is a mark in the save.
 */
export function setTable(laidOut: Party): World {
  const world = emptyWorld()
  const seats = laidOut.guests.length
  const saucers: Thing[] = [], spoons: Thing[] = [], cups: Thing[] = []
  for (let i = 0; i < SEAT_COUNT; i++) {
    saucers.push(thing(`saucer-${i}`, 'saucer', TRAY.saucers, { on: i > 0 ? `saucer-${i - 1}` : null }))
    spoons.push(thing(`spoon-${i}`, 'spoon', { x: TRAY.spoons.x + SPOON_GAP * i, z: TRAY.spoons.z }))
  }
  // Saucers and spoons still on the tray; the next one taken is the highest of them.
  let free = SEAT_COUNT
  laidOut.guests.forEach((guest, seat) => {
    if (guest.cup !== 'own') return
    const place = placeSpot(seats, seat)
    const ring = (LIKES as Partial<Record<GuestId, number>>)[guest.who] ?? null
    const cup = thing(`cup-${guest.who}`, 'cup', place, { ring, owner: guest.who })
    if (laidOut.laysOwnPlace && free > 0) {
      free -= 1
      const laidSpoon = spoonSpot(seats, seat)
      Object.assign(saucers[free], { x: cup.x, z: cup.z, on: null })
      Object.assign(spoons[free], { x: hundredth(laidSpoon.x), z: hundredth(laidSpoon.z) })
      cup.on = saucers[free].id
    } else {
      cup.heldBy = guest.who
    }
    cups.push(cup)
  })
  laidOut.trayCups.forEach((size, index) => {
    cups.push(thing(`cup-plain-${index}`, 'cup', { x: TRAY.cups.x + CUP_GAP * index, z: TRAY.cups.z }, { size }))
  })
  world.things.push(thing('pot', 'pot', TRAY.pot), ...saucers, ...spoons, ...cups, thing('sponge', 'sponge', TRAY.sponge), thing('bowl', 'bowl', TRAY.bowl))
  return world
}
