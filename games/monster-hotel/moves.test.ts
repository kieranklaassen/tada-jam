import { describe, expect, it } from 'vitest'
import { arrange, holds, placeOf, thing, THING_KINDS, type Arrangement } from './arrangement'
import { overTheDay } from './hours'
import type { House } from './hotel'
import { settled } from './mood'
import { numerals, sendAway, setDown, tap, turnWheel, type Held, type Outcome, type Target } from './moves'

const twin: House = { shape: 'long', fixtures: [], twins: [5] }
const all = { quilt: 'cupboard', pipe: 'cupboard', stove: 'cupboard', ice: 'cupboard', clock: 'cupboard' } as const
const start = (): Arrangement => arrange(twin, { troll: 4, blob: 3, bat: 'lobby', yeti: 5, singer: 'bench' }, all, { bench: 'singer' })

describe('the object-by-action grid', () => {
  const objects: Held[] = [{ guest: 'bat' }, { thing: 'quilt' }, { thing: 'pipe' }, { thing: 'stove' }, { thing: 'ice' }, { thing: 'clock' }]
  const actions: ((held: Held) => Outcome)[] = [
    (held) => setDown(start(), held, { room: 0 }).outcome,
    (held) => setDown(start(), held, { guest: 'blob' }).outcome,
    (held) => setDown(start(), held, { edge: '3-4', nearer: 3 }).outcome,
    (held) => tap(start(), held).outcome,
  ]

  it('every cell has a result of its own, and none is refused', () => {
    const cells = objects.flatMap((held) => actions.map((act) => act(held)))
    expect(cells).not.toContain('nothing')
    expect(cells).not.toContain('no-bed')
    expect(new Set(cells).size).toBe(objects.length * actions.length)
  })

  it('the fifth column: each thing does something of its own through a day and a night', () => {
    // Each where it is put to use: the quilt and the pipe on a wall, the stove and ice box in a room, the clock with a keeper.
    const used = arrange(twin, { troll: 4, blob: 3, cook: 1, fly: 0 }, { quilt: { edge: '3-4' }, pipe: { edge: '1-4' }, stove: { room: 0 }, ice: { room: 5 }, clock: { guest: 'blob' } })
    const kinds = objects.map((held) => {
      const day = overTheDay(used, 'guest' in held ? { guest: 'troll' } : held)
      return `${day.day.kind}/${day.night.kind}`
    })
    expect(kinds).toEqual(['asleep/at-its-thing', 'stops/stops', 'carries/carries', 'burns/burns', 'chills/chills', 'turns-hours/turns-hours'])
    expect(overTheDay(used, { thing: 'quilt' }).night).toEqual({ kind: 'stops', airs: ['din'] })
    expect(overTheDay(used, { thing: 'quilt' }).day).toEqual({ kind: 'stops', airs: [] })
    // The pipe through the cook's ceiling carries the smell up by day and nothing at night, when the cook sleeps.
    expect(overTheDay(used, { thing: 'pipe' }).day).toEqual({ kind: 'carries', airs: ['pong'] })
    expect(overTheDay(used, { thing: 'pipe' }).night).toEqual({ kind: 'carries', airs: [] })
    expect(overTheDay(used, { guest: 'cook' }).day).toEqual({ kind: 'at-its-thing', makes: ['pong'] })
  })

  it('a wrong use changes the house as truly as a right one', () => {
    // The quilt on the troll: it makes no noise, the blob next door sleeps, and the troll is cross instead.
    const wrapped = setDown(start(), { thing: 'quilt' }, { guest: 'troll' })
    expect(wrapped.outcome).toBe('wraps')
    expect(holds(wrapped.arrangement, 'troll', 'quilt')).toBe(true)
    // The stove on a wall slides into the nearer room and warms it.
    const slid = setDown(start(), { thing: 'stove' }, { edge: '0-1', nearer: 1 })
    expect(slid.outcome).toBe('stove-scorches')
    expect(thing(slid.arrangement, 'stove')!.at).toEqual({ room: 1 })
    // A guest set down on a wall steps out into the nearer room.
    const stuck = setDown(start(), { guest: 'bat' }, { edge: '0-1', nearer: 0 })
    expect(stuck.outcome).toBe('through-the-wall')
    expect(placeOf(stuck.arrangement, 'bat')).toBe(0)
  })
})

describe('setting a guest down', () => {
  it('moves into a free room, shares a room with a spare bed, and swaps with the one in a single room', () => {
    expect(placeOf(setDown(start(), { guest: 'bat' }, { room: 1 }).arrangement, 'bat')).toBe(1)
    const shared = setDown(start(), { guest: 'bat' }, { guest: 'yeti' })
    expect(shared.outcome).toBe('shares')
    expect(placeOf(shared.arrangement, 'bat')).toBe(5)
    const swapped = setDown(start(), { guest: 'troll' }, { room: 3 })
    expect(swapped.outcome).toBe('swaps')
    expect([placeOf(swapped.arrangement, 'troll'), placeOf(swapped.arrangement, 'blob')]).toEqual([3, 4])
    const out = setDown(start(), { guest: 'bat' }, { guest: 'blob' })
    expect([placeOf(out.arrangement, 'bat'), placeOf(out.arrangement, 'blob')]).toEqual([3, 'lobby'])
  })

  it('a full room of two beds turns a third guest away, and nothing changes', () => {
    const full = setDown(start(), { guest: 'bat' }, { room: 5 }).arrangement
    const third = setDown(full, { guest: 'troll' }, { room: 5 })
    expect(third.outcome).toBe('no-bed')
    expect(third.changed).toBe(false)
    expect(third.arrangement).toBe(full)
    // Set down on one of the two, it changes places with that one.
    expect(setDown(full, { guest: 'troll' }, { guest: 'bat' }).outcome).toBe('swaps')
  })

  it('only the bench guest sits on the bench, and it joins the house when carried in', () => {
    expect(placeOf(setDown(start(), { guest: 'troll' }, 'bench').arrangement, 'troll')).toBe('lobby')
    const joined = setDown(start(), { guest: 'singer' }, { room: 0 })
    expect(placeOf(joined.arrangement, 'singer')).toBe(0)
    expect(placeOf(setDown(joined.arrangement, { guest: 'singer' }, 'bench').arrangement, 'singer')).toBe('bench')
    // A guest whose room the bench guest takes goes to the lobby, never to the bench.
    const taken = setDown(start(), { guest: 'singer' }, { guest: 'troll' })
    expect([placeOf(taken.arrangement, 'singer'), placeOf(taken.arrangement, 'troll')]).toEqual([4, 'lobby'])
  })

  it('a thing a guest holds goes where the guest goes', () => {
    const wrapped = setDown(start(), { thing: 'quilt' }, { guest: 'troll' }).arrangement
    const moved = setDown(wrapped, { guest: 'troll' }, { room: 0 }).arrangement
    expect(holds(moved, 'troll', 'quilt')).toBe(true)
  })

  it('setting a guest down where it already is changes nothing', () => {
    for (const target of [{ room: 4 }, { guest: 'troll' }, 'cupboard'] as Target[]) {
      const move = setDown(start(), { guest: 'troll' }, target)
      expect(move.changed).toBe(false)
      expect(move.outcome).toBe('nothing')
    }
    expect(setDown(start(), { guest: 'bat' }, 'lobby').changed).toBe(false)
  })

  it('a guest on the coach sends this lot away: the bench guest stays and the things go back', () => {
    const busy = setDown(setDown(start(), { thing: 'quilt' }, { guest: 'troll' }).arrangement, { thing: 'stove' }, { room: 0 }).arrangement
    const away = setDown(busy, { guest: 'blob' }, 'coach')
    expect(away.outcome).toBe('sent-away')
    expect(away.arrangement.guests.map((guest) => guest.at)).toEqual(['gone', 'gone', 'gone', 'gone', 'bench'])
    expect(away.arrangement.things.every((item) => item.at === 'cupboard')).toBe(true)
    expect(sendAway(away.arrangement).arrangement.guests).toEqual(away.arrangement.guests)
    expect(settled(away.arrangement)).toBe(false)
  })
})

describe('setting a thing down', () => {
  it('a wall or floor holds the quilt or the pipe, never both', () => {
    const quilted = setDown(start(), { thing: 'quilt' }, { edge: '3-4', nearer: 3 }).arrangement
    const piped = setDown(quilted, { thing: 'pipe' }, { edge: '3-4', nearer: 4 })
    expect(thing(piped.arrangement, 'pipe')!.at).toEqual({ edge: '3-4' })
    expect(thing(piped.arrangement, 'quilt')!.at).toBe('cupboard')
    expect(piped.changed).toBe(true)
  })

  it('a guest who will change its hours keeps the alarm clock; one who will not shrugs it off and keeps its hours', () => {
    expect(setDown(start(), { thing: 'clock' }, { guest: 'troll' }).outcome).toBe('clock-kept')
    const house = setDown(start(), { guest: 'bat' }, { room: 0 }).arrangement
    expect(setDown(house, { thing: 'clock' }, { guest: 'bat' }).outcome).toBe('clock-shrugged-off')
  })

  it('a guest with no room hands a thing back', () => {
    const handed = setDown(setDown(start(), { thing: 'pipe' }, { room: 1 }).arrangement, { thing: 'pipe' }, { guest: 'bat' })
    expect(handed.outcome).toBe('handed-back')
    expect(thing(handed.arrangement, 'pipe')!.at).toBe('cupboard')
    expect(handed.changed).toBe(true)
    expect(setDown(start(), { thing: 'pipe' }, { guest: 'bat' }).changed).toBe(false)
  })

  it('a room, a wall or a guest the house does not have is answered with nothing, and a thing the cast lacks too', () => {
    expect(setDown(start(), { thing: 'quilt' }, { room: 9 }).outcome).toBe('nothing')
    expect(setDown(start(), { thing: 'quilt' }, { edge: '0-5', nearer: 0 }).outcome).toBe('nothing')
    expect(setDown(start(), { guest: 'bat' }, { room: -1 }).outcome).toBe('nothing')
    expect(setDown(start(), { guest: 'cook' }, { room: 0 }).outcome).toBe('nothing')
    expect(setDown(arrange(twin, { troll: 4 }), { thing: 'quilt' }, { room: 0 }).outcome).toBe('nothing')
    expect(tap(arrange(twin, { troll: 4 }), { thing: 'stove' }).outcome).toBe('nothing')
  })

  it('never changes the arrangement it was given', () => {
    const before = start()
    const copy = JSON.stringify(before)
    for (const kind of THING_KINDS) setDown(before, { thing: kind }, { guest: 'troll' })
    setDown(before, { guest: 'troll' }, { room: 3 })
    sendAway(before)
    turnWheel(before)
    expect(JSON.stringify(before)).toBe(copy)
  })
})

describe('taps, the wheel and the numerals', () => {
  it('a tapped guest is the toy: the page is drawn from its place and the house does not change', () => {
    const move = tap(start(), { guest: 'troll' })
    expect(move.outcome).toBe('looks-from')
    expect(move.changed).toBe(false)
    expect(move.arrangement).toEqual(start())
  })

  it('the dial of the stove and of the ice box turns one, two, three and one again, and is never a counted move', () => {
    let house = start()
    const dials: number[] = []
    for (let i = 0; i < 4; i++) {
      const move = tap(house, { thing: 'stove' })
      expect(move.changed).toBe(false)
      house = move.arrangement
      dials.push(thing(house, 'stove')!.dial)
    }
    expect(dials).toEqual([2, 3, 1, 2])
    expect(tap(house, { thing: 'ice' }).outcome).toBe('ice-dial')
  })

  it('the wheel turns day to night and back, by the child only, and is never a counted move', () => {
    const night = turnWheel(start())
    expect(night.arrangement.phase).toBe('night')
    expect(night.changed).toBe(false)
    expect(turnWheel(night.arrangement).arrangement.phase).toBe('day')
  })

  it('the only numerals are the two dials, each a whole number from 1 to 3 laid on its own thing', () => {
    const house = tap(start(), { thing: 'ice' }).arrangement
    expect(numerals(house)).toEqual([{ value: 1, on: 'stove' }, { value: 2, on: 'ice' }])
    expect(numerals(arrange(twin, { troll: 4 }))).toEqual([])
  })
})
