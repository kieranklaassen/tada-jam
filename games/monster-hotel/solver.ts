import type { Arrangement, Dial, Thing, ThingAt, ThingKind } from './arrangement'
import { startOf, type Cast } from './casts'
import { TASTES, type GuestId } from './guests'
import { bedsIn, edgesOf, roomCount } from './hotel'
import { PHASES } from './guests'
import { moodOf, settled } from './mood'

// Tries every arrangement of a cast. The game never runs this: it is here for
// the tests that hold the designed order to its promises (several
// arrangements settle every cast) and for writing new casts. The idle ladder
// shows a move, never a solution, so no solver is needed while playing.

/** Every way of giving the guests rooms, each within its room's beds. */
export function* roomings(cast: Cast, guests: readonly GuestId[]): Generator<Record<string, number>> {
  const rooms = roomCount(cast.house.shape)
  const taken = new Array<number>(rooms).fill(0)
  const at: Record<string, number> = {}
  function* place(next: number): Generator<Record<string, number>> {
    if (next === guests.length) {
      yield { ...at }
      return
    }
    for (let room = 0; room < rooms; room++) {
      if (taken[room] >= bedsIn(cast.house, room)) continue
      taken[room]++
      at[guests[next]] = room
      yield* place(next + 1)
      taken[room]--
    }
  }
  yield* place(0)
}

/**
 * Every place for one thing that changes anything: the quilt and the pipe on
 * a wall, a floor or a guest; the stove and the ice box in a room at each
 * step of the dial; the alarm clock with a guest who will change its hours.
 * Everywhere else a thing does what it does in the cupboard.
 */
export function placesFor(cast: Cast, kind: ThingKind, guests: readonly GuestId[]): { at: ThingAt; dial: Dial }[] {
  const places: { at: ThingAt; dial: Dial }[] = [{ at: 'cupboard', dial: 1 }]
  if (kind === 'stove' || kind === 'ice') {
    for (let room = 0; room < roomCount(cast.house.shape); room++) for (const dial of [1, 2, 3] as const) places.push({ at: { room }, dial })
    return places
  }
  if (kind !== 'clock') for (const edge of edgesOf(cast.house.shape)) places.push({ at: { edge: edge.id }, dial: 1 })
  for (const guest of guests) if (kind !== 'clock' || TASTES[guest].flexible) places.push({ at: { guest }, dial: 1 })
  return places
}

/** Every way of placing the cast's things that the solver tries: it does not try two things on one wall or floor, though the game allows it. */
export function* kits(cast: Cast, guests: readonly GuestId[]): Generator<Thing[]> {
  const options = cast.kit.map((kind) => placesFor(cast, kind, guests))
  const things: Thing[] = []
  function* place(next: number): Generator<Thing[]> {
    if (next === cast.kit.length) {
      yield things.map((item) => ({ ...item }))
      return
    }
    for (const option of options[next]) {
      const at = option.at
      if (typeof at === 'object' && 'edge' in at && things.some((item) => typeof item.at === 'object' && 'edge' in item.at && item.at.edge === at.edge)) continue
      things.push({ kind: cast.kit[next], at, dial: option.dial })
      yield* place(next + 1)
      things.pop()
    }
  }
  yield* place(0)
}

export type Solved = {
  /** Ways of giving out the rooms. */
  roomings: number
  /** Roomings that settle the house with everything left in the cupboard. */
  bare: number
  /** Roomings that settle the house with the things placed somehow. */
  settling: number
  /** One settled arrangement for each settling rooming, up to `keep`. */
  examples: Arrangement[]
}

/**
 * Solves a cast for the guests who came by coach, or with the bench guest
 * carried in as well. `enough` stops the search once that many roomings have
 * settled; leave it out to count them all.
 */
export function solve(cast: Cast, options: { withBench?: boolean; enough?: number; keep?: number } = {}): Solved {
  const guests = options.withBench ? [...cast.guests, cast.bench] : [...cast.guests]
  const start = startOf(cast)
  const solved: Solved = { roomings: 0, bare: 0, settling: 0, examples: [] }
  for (const rooming of roomings(cast, guests)) {
    solved.roomings++
    const lodgers = start.guests.map((guest) => ({ id: guest.id, at: rooming[guest.id] ?? guest.at }))
    const bare: Arrangement = { ...start, guests: lodgers }
    let found: Arrangement | null = settled(bare) ? bare : null
    if (found) solved.bare++
    else {
      for (const things of kits(cast, guests)) {
        const tried: Arrangement = { ...start, guests: lodgers, things }
        if (settled(tried)) {
          found = tried
          break
        }
      }
    }
    if (!found) continue
    solved.settling++
    if (solved.examples.length < (options.keep ?? 4)) solved.examples.push(found)
    if (options.enough && solved.settling >= options.enough) break
  }
  return solved
}

/** How many delights the guests of a settled arrangement show over a day and a night: what makes one arrangement plainly happier than another. */
export function delightsIn(arrangement: Arrangement): number {
  let count = 0
  for (const guest of arrangement.guests) for (const phase of PHASES) count += moodOf(arrangement, guest.id, phase).delights.length
  return count
}
