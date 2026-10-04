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

  it('a full room of two beds refuses nobody: a third guest set down in it changes places with the second of the two', () => {
    const full = setDown(start(), { guest: 'bat' }, { room: 5 }).arrangement
    const third = setDown(full, { guest: 'troll' }, { room: 5 })
    expect(third.outcome).toBe('swaps')
    expect(third.changed).toBe(true)
    expect(placeOf(third.arrangement, 'troll')).toBe(5)
    const out = full.guests.filter((guest) => guest.at === 5).map((guest) => guest.id).filter((id) => placeOf(third.arrangement, id) !== 5)
    expect(out.length).toBe(1)
    expect(placeOf(third.arrangement, out[0])).toBe(placeOf(full, 'troll'))
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

  it('a guest given to the guest on the bench changes places with it: the bench guest comes in, and the other waits in the lobby', () => {
    // From a room: the singer takes the troll's room.
    const fromRoom = setDown(start(), { guest: 'troll' }, { guest: 'singer' })
    expect(fromRoom.outcome).toBe('swaps')
    expect([placeOf(fromRoom.arrangement, 'singer'), placeOf(fromRoom.arrangement, 'troll'), fromRoom.changed]).toEqual([4, 'lobby', true])
    // From the lobby: the singer comes into the lobby too.
    const fromLobby = setDown(start(), { guest: 'bat' }, { guest: 'singer' })
    expect([placeOf(fromLobby.arrangement, 'singer'), placeOf(fromLobby.arrangement, 'bat'), fromLobby.changed]).toEqual(['lobby', 'lobby', true])
  })

  it('a guest on the coach sends this lot away: every guest of the cast goes, the bench guest included, and the things go back', () => {
    const busy = setDown(setDown(start(), { thing: 'quilt' }, { guest: 'troll' }).arrangement, { thing: 'stove' }, { room: 0 }).arrangement
    const away = setDown(busy, { guest: 'blob' }, 'coach')
    expect(away.outcome).toBe('sent-away')
    expect(away.arrangement.guests.map((guest) => guest.at)).toEqual(['gone', 'gone', 'gone', 'gone', 'gone'])
    expect(away.arrangement.things.every((item) => item.at === 'cupboard')).toBe(true)
    expect(sendAway(away.arrangement).arrangement.guests).toEqual(away.arrangement.guests)
    expect(settled(away.arrangement)).toBe(false)
  })
})

describe('setting a thing down', () => {
  it('nothing fixed to a wall is taken away by fixing another thing there: the quilt and the pipe share one, and each does what it does', () => {
    const quilted = setDown(start(), { thing: 'quilt' }, { edge: '3-4', nearer: 3 }).arrangement
    const piped = setDown(quilted, { thing: 'pipe' }, { edge: '3-4', nearer: 4 })
    expect(thing(piped.arrangement, 'pipe')!.at).toEqual({ edge: '3-4' })
    expect(thing(piped.arrangement, 'quilt')!.at).toEqual({ edge: '3-4' })
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

describe('a thing stays only with a guest who has a room', () => {
  it('a guest carried out to the lobby hands back what it held, and so does one changed out of its room by another', () => {
    const wrapped = setDown(start(), { thing: 'quilt' }, { guest: 'blob' }).arrangement
    expect(holds(wrapped, 'blob', 'quilt')).toBe(true)
    // Carried to the lobby: the quilt is in the cupboard, and the blob is not wrapped.
    const out = setDown(wrapped, { guest: 'blob' }, 'lobby').arrangement
    expect([placeOf(out, 'blob'), thing(out, 'quilt')!.at]).toEqual(['lobby', 'cupboard'])
    // The bat from the lobby onto the wrapped blob: they change places, and the blob in the lobby holds nothing.
    const changed = setDown(wrapped, { guest: 'bat' }, { guest: 'blob' }).arrangement
    expect([placeOf(changed, 'bat'), placeOf(changed, 'blob'), thing(changed, 'quilt')!.at]).toEqual([3, 'lobby', 'cupboard'])
    // Carried from one room to another, it keeps what it holds.
    const moved = setDown(wrapped, { guest: 'blob' }, { room: 0 }).arrangement
    expect([placeOf(moved, 'blob'), holds(moved, 'blob', 'quilt')]).toEqual([0, true])
  })
})

describe('the outer sides of the house take things too', () => {
  const heated: House = { shape: 'square', fixtures: [{ kind: 'boiler', col: 0 }, { kind: 'snow', col: 1 }], twins: [] }
  const at = (guests: Parameters<typeof arrange>[1]) => arrange(heated, guests, { quilt: 'cupboard', pipe: 'cupboard', stove: 'cupboard', ice: 'cupboard', clock: 'cupboard' })

  it('the quilt on the floor over the boiler stops its warmth there, and on the ceiling under the snow hole its cold', () => {
    // The yeti over the boiler is too warm; with the quilt on that floor it is content.
    const warm = at({ yeti: 0 })
    expect(settled(warm)).toBe(false)
    const quilted = setDown(warm, { thing: 'quilt' }, { edge: 'under-0', nearer: 0 })
    expect([quilted.outcome, thing(quilted.arrangement, 'quilt')!.at, quilted.changed]).toEqual(['quilt-hangs', { edge: 'under-0' }, true])
    expect(settled(quilted.arrangement)).toBe(true)
    // The lizard under the snow hole is too cold; the quilt on that ceiling stops the cold, though the room is then only mild.
    const cold = at({ lizard: 3 })
    const over = setDown(cold, { thing: 'quilt' }, { edge: 'over-3', nearer: 3 }).arrangement
    expect(overTheDay(over, { thing: 'quilt' }).day).toEqual({ kind: 'stops', airs: ['cold'] })
    // With the pipe let through the quilt, it comes through again.
    const piped = setDown(quilted.arrangement, { thing: 'pipe' }, { edge: 'under-0', nearer: 0 }).arrangement
    expect(settled(piped)).toBe(false)
    // The pipe there carries the boiler's warmth at every hour, alone or let through the quilt: that is what it toots and whooshes with.
    for (const house of [piped, setDown(warm, { thing: 'pipe' }, { edge: 'under-0', nearer: 0 }).arrangement]) {
      expect(overTheDay(house, { thing: 'pipe' })).toEqual({ day: { kind: 'carries', airs: ['warm'] }, night: { kind: 'carries', airs: ['warm'] } })
    }
    // On an outer wall with nothing behind it, it carries nothing.
    expect(overTheDay(setDown(warm, { thing: 'pipe' }, { edge: 'left-0', nearer: 0 }).arrangement, { thing: 'pipe' }).day).toEqual({ kind: 'carries', airs: [] })
  })

  it('nothing set on an outer wall, floor or ceiling is refused: a thing is fixed there or slides into the room, and a guest steps out into it', () => {
    const house = at({ troll: 'lobby' })
    expect(setDown(house, { thing: 'clock' }, { edge: 'left-2', nearer: 2 }).outcome).toBe('clock-on-wall')
    expect(setDown(house, { thing: 'pipe' }, { edge: 'right-1', nearer: 1 }).outcome).toBe('pipe-joins')
    const stove = setDown(house, { thing: 'stove' }, { edge: 'under-1', nearer: 1 })
    expect([stove.outcome, thing(stove.arrangement, 'stove')!.at]).toEqual(['stove-scorches', { room: 1 }])
    const stuck = setDown(house, { guest: 'troll' }, { edge: 'over-2', nearer: 2 })
    expect([stuck.outcome, placeOf(stuck.arrangement, 'troll')]).toEqual(['through-the-wall', 2])
    // An edge the house does not have is still nothing.
    expect(setDown(house, { thing: 'quilt' }, { edge: 'under-3', nearer: 3 }).outcome).toBe('nothing')
  })
})
