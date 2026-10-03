import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { KINDS } from './kinds'
import { skyFits } from './order'
import { callNext, outcomeOf, popHeld, sendBunch, type PlayEvent } from './play'
import { draw } from './rng'
import { PARADE_LENGTH, deserializeSave, freshSave, serializeSave, type Save } from './save'
import { STATE_VERSION } from './state'
import { served, without } from './world'

type Step = { save: Save; events: PlayEvent[] }

const FIRST = LADDER[0], LAST = LADDER[LADDER.length - 1]

/** What storage hands back on the next visit. */
const reopened = (save: Save): Save => deserializeSave(JSON.parse(JSON.stringify(serializeSave(save))))

/** A game opened at this position with this seed, with every first showing already played unless the test is about them. */
function at(position: string, seed = 1, shown = true): Save {
  return { ...deserializeSave({ v: STATE_VERSION, position, finished: false, rng: seed }), shown: { give: shown, each: shown, bunch: shown } }
}

/** The first seed from `from` on whose game at this position has what the test needs. */
function seedWhere(position: string, wanted: (save: Save) => boolean, from = 1): number {
  for (let seed = from; seed < from + 500; seed++) if (wanted(at(position, seed))) return seed
  throw new Error(`no game at ${position} has what the test needs`)
}

/** The place of a single of the troop's colour: every sky holds one. */
const singleSlot = (save: Save): number => save.sky.findIndex((bunch) => bunch.colour === save.troop.kind && bunch.count === 1)

/** The place of a bunch of another colour, or -1. */
const otherSlot = (save: Save): number => save.sky.findIndex((bunch) => bunch.colour !== save.troop.kind)

/** The place of a bunch of the troop's colour with more balloons than there are friends without one, or -1. */
const tooBigSlot = (save: Save): number => save.sky.findIndex((bunch) => bunch.colour === save.troop.kind && bunch.count > without(save.troop).length)

/** What a child who knows sends: the bunch of the right colour with exactly one for each friend still without, else the single. */
function knowingSlot(save: Save): number {
  const fitting = save.sky.findIndex((bunch) => bunch.colour === save.troop.kind && bunch.count === without(save.troop).length)
  return fitting >= 0 ? fitting : singleSlot(save)
}

/** Serves the troop as a child who knows does. Says how many bunches it took and how many of them were not taken. */
function serveKnowing(save: Save): { save: Save; sends: number; slips: number } {
  let current = save, sends = 0, slips = 0
  // Never more sends than friends: a rule that broke fails the test here and cannot hang it.
  for (; sends < 3 && !served(current.troop); sends++) {
    const result = sendBunch(current, knowingSlot(current))
    if (result.events[0]?.type !== 'taken') slips++
    current = result.save
  }
  expect(served(current.troop)).toBe(true)
  return { save: current, sends, slips }
}

/** Sends singles of the troop's colour until the troop is served. */
function serve(save: Save): Save {
  let current = save
  for (let sent = 0; sent < 3 && !served(current.troop); sent++) current = sendBunch(current, singleSlot(current)).save
  expect(served(current.troop)).toBe(true)
  return current
}

/** One slip: a bunch of another colour where the sky holds one, else a bunch that is too many. */
function slip(save: Save): Save {
  let current = save
  // Three friends under bunches of their own colour cannot go wrong yet: after a single, the three-bunch is one too many.
  for (let sent = 0; sent < 3 && otherSlot(current) < 0 && tooBigSlot(current) < 0; sent++) current = sendBunch(current, singleSlot(current)).save
  const result = sendBunch(current, otherSlot(current) >= 0 ? otherSlot(current) : tooBigSlot(current))
  expect(['refused', 'gotAway']).toContain(result.events[0].type)
  return result.save
}

/** One whole cycle with this many slips before the troop is served, and then the next troop called in. */
function cycle(save: Save, slips: number): Save {
  let current = save
  for (let made = 0; made < slips; made++) current = slip(current)
  return callNext(serve(current)).save
}

/** Every rule a save keeps after every touch. Returns the ones that are broken. */
function broken(save: Save): string[] {
  const found: string[] = []
  if (!skyFits(save.sky, save.troop.kind)) found.push('the sky does not fit the troop')
  if (save.troop.held.length !== save.troop.size) found.push('held is not one for each friend')
  if (![0, 1, 2].includes(save.slips)) found.push('slips out of range')
  if (!LADDER.includes(save.position)) found.push('position not in the ladder')
  if (save.parade.length > PARADE_LENGTH) found.push('parade too long')
  if (save.parade.some((marched) => marched.balloons < 0 || marched.balloons > marched.size)) found.push('a marched troop with more balloons than friends')
  if (save.next.kind === save.troop.kind) found.push('the waiting troop is of the kind on screen')
  if (served(save.troop) && !save.finished) found.push('served and not finished')
  if (!Number.isInteger(save.rng) || save.rng < 0 || save.rng > 0xffffffff) found.push('the stream is no uint32')
  return found
}

/** Freezes a save all the way down, so a function that changed what it was handed would throw. */
function frozen<T>(value: T): T {
  if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
    Object.freeze(value)
    for (const inner of Object.values(value)) frozen(inner)
  }
  return value
}

describe('how a cycle is judged', () => {
  it('goes well with no slip, is mixed with one, and goes badly with two or more', () => {
    expect([0, 1, 2, 3, 9].map(outcomeOf)).toEqual(['well', 'mixed', 'badly', 'badly', 'badly'])
  })
})

describe('sending a bunch', () => {
  it('changes nothing and says nothing for a place the sky does not have', () => {
    const save = at('trio-singles')
    for (const slot of [-1, save.sky.length, 99, 0.5, Number.NaN]) expect(sendBunch(save, slot)).toEqual({ save, events: [] })
  })

  it('gives a single of the troop\'s colour to the first friend without one, and leaves the sky as it was', () => {
    const save = at('trio-singles', seedWhere('trio-singles', (game) => game.troop.size === 3))
    const slot = singleSlot(save)
    const first = sendBunch(save, slot)
    expect(first.events).toEqual([{ type: 'taken', slot, bunch: save.sky[slot], takers: [0] }])
    expect(first.save).toEqual({ ...save, troop: { ...save.troop, held: [true, false, false] } })
    const second = sendBunch(first.save, slot)
    expect(second.events).toEqual([{ type: 'taken', slot, bunch: save.sky[slot], takers: [1] }])
    expect(second.save.sky).toEqual(save.sky)
  })

  it('counts a refused bunch as a slip and changes nothing else', () => {
    const save = at('solo-three-colours')
    const slot = otherSlot(save)
    const result = sendBunch(save, slot)
    expect(result.events).toEqual([{ type: 'refused', slot, bunch: save.sky[slot] }])
    expect(result.save).toEqual({ ...save, slips: 1 })
  })

  it('counts a bunch that got away as a slip and changes nothing else', () => {
    const save = at('bunches-own-colour', seedWhere('bunches-own-colour', (game) => game.troop.size === 2))
    const slot = save.sky.findIndex((bunch) => bunch.count === 3)
    const result = sendBunch(save, slot)
    expect(result.events).toEqual([{ type: 'gotAway', slot, bunch: save.sky[slot], grabber: 0, spare: 1 }])
    expect(result.save).toEqual({ ...save, slips: 1 })
    // With one friend served the two-bunch is too many as well, and the friend still without one is the one lifted.
    const half = sendBunch(save, singleSlot(save)).save
    const pair = half.sky.findIndex((bunch) => bunch.count === 2)
    expect(sendBunch(half, pair).events).toEqual([{ type: 'gotAway', slot: pair, bunch: half.sky[pair], grabber: 1, spare: 1 }])
  })

  it('keeps the slips at two however many there are', () => {
    let save = at('solo-two-colours')
    const counted: number[] = []
    for (let sent = 0; sent < 5; sent++) {
      save = sendBunch(save, otherSlot(save)).save
      counted.push(save.slips)
    }
    expect(counted).toEqual([1, 2, 2, 2, 2])
  })

  it('takes a bunch smaller than the troop without a slip: not yet enough is not an error', () => {
    const save = at('bunches-own-colour', seedWhere('bunches-own-colour', (game) => game.troop.size === 3))
    const pair = save.sky.findIndex((bunch) => bunch.count === 2)
    const result = sendBunch(save, pair)
    expect(result.events).toEqual([{ type: 'taken', slot: pair, bunch: save.sky[pair], takers: [0, 1] }])
    expect(result.save.slips).toBe(0)
    expect(result.save.finished).toBe(false)
    const done = sendBunch(result.save, singleSlot(result.save))
    expect(done.events[1]).toEqual({ type: 'served', together: false, order: [2] })
    expect(done.save.position).toBe('bunches-mixed')
  })

  it('starts the ending when the last friend takes its balloon: together for a bunch, in turn for a single', () => {
    const save = at('bunches-own-colour', seedWhere('bunches-own-colour', (game) => game.troop.size === 3))
    const trio = save.sky.findIndex((bunch) => bunch.count === 3)
    expect(sendBunch(save, trio).events).toEqual([
      { type: 'taken', slot: trio, bunch: save.sky[trio], takers: [0, 1, 2] },
      { type: 'served', together: true, order: [0, 1, 2] },
    ])
    const one = sendBunch(save, singleSlot(save)).save
    const pair = one.sky.findIndex((bunch) => bunch.count === 2)
    expect(sendBunch(one, pair).events[1]).toEqual({ type: 'served', together: true, order: [1, 2] })
    const solo = at('solo-two-colours')
    expect(sendBunch(solo, singleSlot(solo)).events[1]).toEqual({ type: 'served', together: false, order: [0] })
  })
})

describe('the position in the designed order', () => {
  it('moves up one step after a clean cycle, stays after one slip, and moves down one step after two', () => {
    const start = at('solo-three-colours')
    expect(cycle(start, 0).position).toBe('pair-singles')
    expect(cycle(start, 1).position).toBe('solo-three-colours')
    expect(cycle(start, 2).position).toBe('solo-two-colours')
    expect(cycle(start, 4).position).toBe('solo-two-colours')
  })

  it('judges slips of both sorts alike: one refused and one that got away make two', () => {
    const start = at('bunches-mixed', seedWhere('bunches-mixed', (game) => game.troop.size === 2))
    const refused = sendBunch(start, otherSlot(start))
    expect(refused.events[0].type).toBe('refused')
    // With one friend served, the bunch of two in the troop's colour is one too many.
    const half = sendBunch(refused.save, singleSlot(start)).save
    const lifted = sendBunch(half, tooBigSlot(half))
    expect(lifted.events[0].type).toBe('gotAway')
    expect(lifted.save.slips).toBe(2)
    expect(serve(lifted.save).position).toBe('bunches-own-colour')
    // The lift-off alone is one slip: the cycle is mixed and the position stays.
    const onlyLifted = sendBunch(sendBunch(start, singleSlot(start)).save, tooBigSlot(half))
    expect(onlyLifted.events[0].type).toBe('gotAway')
    expect(serve(onlyLifted.save).position).toBe('bunches-mixed')
  })

  it('never moves inside a cycle: only the send that serves the troop moves it', () => {
    let save = at('trio-singles', seedWhere('trio-singles', (game) => game.troop.size === 3))
    const moves: boolean[] = []
    for (const slot of [otherSlot(save), singleSlot(save), singleSlot(save), singleSlot(save)]) {
      const result = sendBunch(save, slot)
      moves.push(result.save.position !== save.position)
      expect(result.save.finished).toBe(result.events.some((event) => event.type === 'served'))
      save = result.save
    }
    // One slip: the cycle was mixed, so even the last send leaves it where it was.
    expect(moves).toEqual([false, false, false, false])
    expect(save.position).toBe('trio-singles')
    expect(save.finished).toBe(true)

    let clean = at('trio-singles', seedWhere('trio-singles', (game) => game.troop.size === 3))
    const steps: string[] = []
    for (let sent = 0; sent < 3; sent++) {
      clean = sendBunch(clean, singleSlot(clean)).save
      steps.push(clean.position)
    }
    expect(steps).toEqual(['trio-singles', 'trio-singles', 'bunches-own-colour'])
  })

  it('never moves twice for one cycle: a balloon popped and given again after the ending is play', () => {
    const start = at('solo-three-colours')
    const ended = serve(start)
    expect(ended.position).toBe('pair-singles')
    const emptied = popHeld(ended, 0)
    expect(emptied.events).toEqual([{ type: 'popped', friend: 0 }])
    expect(emptied.save).toEqual({ ...ended, troop: { ...ended.troop, held: [false] } })
    const again = sendBunch(emptied.save, singleSlot(emptied.save))
    // Taken, and no second ending: the cycle was judged once.
    expect(again.events.map((event) => event.type)).toEqual(['taken'])
    expect(again.save).toEqual(ended)
  })

  it('does not judge what is sent after the troop is served', () => {
    const start = at('solo-three-colours')
    const ended = serve(start)
    const refused = sendBunch(ended, otherSlot(ended))
    expect(refused.events[0].type).toBe('refused')
    expect(refused.save).toEqual(ended)
    // The same lift-off, for fun, as often as the child likes.
    for (let sent = 0; sent < 3; sent++) {
      const lifted = sendBunch(ended, singleSlot(ended))
      expect(lifted.events).toEqual([{ type: 'gotAway', slot: singleSlot(ended), bunch: ended.sky[singleSlot(ended)], grabber: 0, spare: 1 }])
      expect(lifted.save).toEqual(ended)
    }
    expect(callNext(refused.save).save.position).toBe('pair-singles')
  })

  it('does not judge a pop', () => {
    const start = at('pair-singles')
    let save = sendBunch(start, singleSlot(start)).save
    for (let round = 0; round < 3; round++) {
      const result = popHeld(save, 0)
      expect(result.events).toEqual([{ type: 'popped', friend: 0 }])
      expect(result.save).toEqual({ ...save, troop: { ...save.troop, held: [false, false] } })
      save = sendBunch(result.save, singleSlot(result.save)).save
    }
    expect(save.slips).toBe(0)
    expect(serve(save).position).toBe('trio-singles')
  })

  it('judges a cycle the same after a put-away in the middle of it', () => {
    const start = at('solo-three-colours')
    const slipped = reopened(sendBunch(reopened(sendBunch(start, otherSlot(start)).save), otherSlot(start)).save)
    expect(slipped.slips).toBe(2)
    expect(serve(slipped).position).toBe('solo-two-colours')
  })

  it('stops at either end of the ladder', () => {
    expect(cycle(at(FIRST), 2).position).toBe(FIRST)
    expect(cycle(at(LAST), 0).position).toBe(LAST)
  })
})

describe('popping a held balloon', () => {
  it('does nothing for a friend who holds none or is not there', () => {
    const save = at('pair-singles')
    for (const friend of [0, 1, 2, -1, 0.5]) expect(popHeld(save, friend)).toEqual({ save, events: [] })
  })
})

describe('calling the next troop', () => {
  it('only makes it wave before the troop on screen is served', () => {
    const save = at('pair-singles')
    expect(callNext(save)).toEqual({ save, events: [{ type: 'waved' }] })
    const half = sendBunch(save, singleSlot(save)).save
    expect(callNext(half)).toEqual({ save: half, events: [{ type: 'waved' }] })
  })

  it('sends the served troop to the parade and brings the waiting troop in as it was laid out', () => {
    for (const position of LADDER) {
      for (let seed = 1; seed <= 40; seed++) {
        const ended = serve(at(position, seed))
        const { save, events } = callNext(ended)
        const marched = { kind: ended.troop.kind, size: ended.troop.size, balloons: ended.troop.size }
        expect(events).toEqual([{ type: 'steppedIn', marched, showing: null }])
        expect(save.parade).toEqual([marched])
        // The troop that waited keeps its kind and its size, and nobody holds a balloon yet.
        expect(save.troop).toEqual({ ...ended.next, held: Array(ended.next.size).fill(false) })
        expect(save.finished).toBe(false)
        expect(save.slips).toBe(0)
        expect(save.position).toBe(ended.position)
        expect(broken(save)).toEqual([])
      }
    }
  })

  it('lays out the new sky and the troop after next from the position as it stands after the cycle was judged', () => {
    // A clean cycle at the second solo position moves to the pair position. The friend that waited was planned alone
    // and steps in alone; the troop that comes to the edge now is a pair, and the sky is the pair position's.
    const ended = serve(at('solo-three-colours', 5))
    expect(ended.position).toBe('pair-singles')
    expect(ended.next.size).toBe(1)
    const { save } = callNext(ended)
    expect(save.troop.size).toBe(1)
    expect(save.next.size).toBe(2)
    expect(save.sky).toHaveLength(5)
    // Up into the bunches: the sky of the troop that steps in is already the new position's.
    const intoBunches = callNext(serve(at('trio-singles', 5))).save
    expect(intoBunches.position).toBe('bunches-own-colour')
    expect(intoBunches.sky.map((bunch) => bunch.count).sort()).toEqual([1, 2, 3])
    expect(intoBunches.sky.every((bunch) => bunch.colour === intoBunches.troop.kind)).toBe(true)
  })

  it('counts the balloons the troop carries off, not the friends', () => {
    const ended = serve(at('trio-singles', seedWhere('trio-singles', (game) => game.troop.size === 3)))
    const popped = popHeld(popHeld(ended, 0).save, 2).save
    const { save, events } = callNext(popped)
    expect(events[0]).toMatchObject({ type: 'steppedIn', marched: { kind: ended.troop.kind, size: 3, balloons: 1 } })
    expect(save.parade).toEqual([{ kind: ended.troop.kind, size: 3, balloons: 1 }])
  })

  it('keeps the last four troops on the far hill, oldest first', () => {
    let save = at(LAST, 9)
    const all: { kind: string; size: number; balloons: number }[] = []
    for (let troops = 1; troops <= 7; troops++) {
      const ended = serve(save)
      all.push({ kind: ended.troop.kind, size: ended.troop.size, balloons: ended.troop.size })
      save = callNext(ended).save
      expect(save.parade).toEqual(all.slice(-PARADE_LENGTH))
    }
    expect(save.parade).toHaveLength(PARADE_LENGTH)
  })

  it('never brings in two troops of one kind in a row', () => {
    let save = at('bunches-mixed', 3)
    for (let troops = 0; troops < 60; troops++) {
      const before = save.troop.kind
      save = callNext(serve(save)).save
      expect(save.troop.kind).not.toBe(before)
      expect(save.next.kind).not.toBe(save.troop.kind)
    }
  })

  it('shows a new idea once, inside the step-in that brings it, and marks it at once', () => {
    // From a new game for the youngest: giving is shown at the start, by the view. Then a child who knows climbs.
    let save: Save = { ...freshSave(null), shown: { give: true, each: false, bunch: false } }
    const showings: { idea: string; position: string; size: number; skyHasBunch: boolean }[] = []
    for (let troops = 0; troops < 12; troops++) {
      save = serveKnowing(save).save
      const { save: after, events } = callNext(save)
      const event = events[0]
      if (event.type === 'steppedIn' && event.showing !== null) {
        expect(event.showing.kind).not.toBe(after.troop.kind)
        expect(event.showing.kind).not.toBe(after.next.kind)
        showings.push({ idea: event.showing.idea, position: after.position, size: after.troop.size, skyHasBunch: after.sky.some((bunch) => bunch.count > 1) })
        // Marked in the same save, so a put-away during the showing never shows it twice.
        for (const mark of event.showing.marks) expect(after.shown[mark]).toBe(true)
      }
      save = after
    }
    expect(showings.map((showing) => showing.idea)).toEqual(['each', 'bunch'])
    // One for each is shown when the first pair steps in, a troop after the position moved, since that pair was laid out then.
    expect(showings[0]).toMatchObject({ size: 2, skyHasBunch: false })
    expect(showings[1].skyHasBunch).toBe(true)
    expect(save.shown).toEqual({ give: true, each: true, bunch: true })
  })
})

describe('found as left', () => {
  it('plays on identically after a put-away in the middle of a cycle: the same events for the same taps', () => {
    for (const position of LADDER) {
      let kept = at(position, 21)
      // Into the middle of things: a slip, a balloon given, the stream moved on by a few troops.
      for (let troops = 0; troops < 3; troops++) kept = callNext(serve(kept)).save
      kept = slip(kept)
      let opened = reopened(kept)
      expect(opened).toEqual(kept)
      let rng = 77
      for (let tap = 0; tap < 300; tap++) {
        const which = draw(rng), where = draw(which.rng)
        rng = where.rng
        const act = (save: Save): Step => (which.value < 0.7 ? sendBunch(save, Math.floor(where.value * 5)) : which.value < 0.8 ? popHeld(save, Math.floor(where.value * 3)) : callNext(save))
        const a = act(kept), b = act(opened)
        expect(b.events).toEqual(a.events)
        expect(b.save).toEqual(a.save)
        kept = a.save
        // Put away and opened again every few taps on one side only.
        opened = tap % 7 === 0 ? reopened(b.save) : b.save
      }
    }
  })
})

describe('a long run of random taps', () => {
  it('never throws, never changes the save it was handed, and keeps every rule after every tap', () => {
    for (const seed of [1, 2, 3]) {
      let save = frozen(freshSave(seed + 1, seed))
      let rng = seed * 7919
      const seen = { served: 0, steppedIn: 0, waved: 0, refused: 0, gotAway: 0, popped: 0, taken: 0 }
      const positions = new Set<string>()
      for (let tap = 0; tap < 1500; tap++) {
        const which = draw(rng), where = draw(which.rng)
        rng = where.rng
        let result: Step
        // Random places, some of them not in the sky; random friends, some of them not there; random calls for the next troop.
        if (which.value < 0.6) result = sendBunch(save, Math.floor(where.value * 7) - 1)
        else if (which.value < 0.75) result = popHeld(save, Math.floor(where.value * 5) - 1)
        else result = callNext(save)
        for (const event of result.events) seen[event.type]++
        const after = result.save
        expect(broken(after), `seed ${seed}, tap ${tap}`).toEqual([])
        expect(reopened(after), `seed ${seed}, tap ${tap}`).toEqual(after)
        // The position moves only with the ending of a cycle, and one step at most.
        const moved = Math.abs(LADDER.indexOf(after.position) - LADDER.indexOf(save.position))
        expect(moved).toBeLessThanOrEqual(result.events.some((event) => event.type === 'served') ? 1 : 0)
        // The sky is the same for the whole cycle.
        if (!result.events.some((event) => event.type === 'steppedIn')) expect(after.sky).toEqual(save.sky)
        positions.add(after.position)
        save = frozen(after)
      }
      // The run reached every kind of event, so the rules above were held against all of them.
      for (const [type, count] of Object.entries(seen)) expect(count, `${type} with seed ${seed}`).toBeGreaterThan(0)
      expect(positions.size).toBeGreaterThan(1)
    }
  })
})

describe('whole visits', () => {
  it('takes a child who knows from the first position to the last, one step a cycle, and keeps them there', () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      let save = freshSave(null, seed)
      expect(save.position).toBe(FIRST)
      const visited: string[] = []
      for (let troops = 0; troops < 12; troops++) {
        const { save: ended, sends, slips } = serveKnowing(save)
        expect(slips).toBe(0)
        save = ended
        // Where a bunch holds one for each, the whole troop is served in one touch.
        if (save.sky.some((bunch) => bunch.colour === save.troop.kind && bunch.count === save.troop.size)) expect(sends).toBe(1)
        visited.push(save.position)
        save = callNext(save).save
      }
      expect(visited.slice(0, LADDER.length - 1)).toEqual(LADDER.slice(1))
      expect(visited.slice(LADDER.length - 1).every((position) => position === LAST)).toBe(true)
    }
  })

  it('takes a child who taps the wrong bunch twice in every cycle down to the first position, one step a cycle, and no further', () => {
    let save = at(LAST, 4)
    const visited: string[] = []
    for (let troops = 0; troops < 8; troops++) {
      save = cycle(save, 2)
      visited.push(save.position)
    }
    expect(visited.slice(0, LADDER.length - 1)).toEqual([...LADDER].reverse().slice(1))
    expect(visited.slice(LADDER.length - 1).every((position) => position === FIRST)).toBe(true)
  })

  it('can always be finished by a child who only ever taps the single of the troop\'s colour', () => {
    for (const position of LADDER) {
      let save = at(position, 13)
      for (let troops = 0; troops < 20; troops++) save = callNext(serve(save)).save
      expect(save.parade).toHaveLength(PARADE_LENGTH)
    }
  })

  it('sees all four kinds come by', () => {
    let save = freshSave(null)
    const seen = new Set<string>()
    for (let troops = 0; troops < 30; troops++) {
      seen.add(save.troop.kind)
      save = callNext(serve(save)).save
    }
    expect([...seen].sort()).toEqual([...KINDS].sort())
  })
})
