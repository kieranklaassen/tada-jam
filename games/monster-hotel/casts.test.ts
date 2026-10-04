import { describe, expect, it } from 'vitest'
import { awake, holds, isEdgeAt, isGuestAt, isRoomAt, occupants, present, roomOf, thing, THING_KINDS, type Arrangement } from './arrangement'
import { CASTS, castById, castsAt, neatOf, startOf, withBenchOf, type Cast } from './casts'
import { FIRST_VISIT, LADDER, WHOLE_PATHS_UNTIL } from './config'
import { demandOf } from './demand'
import { GUEST_IDS, PHASES, TASTES } from './guests'
import { bedsIn, edgeById, roomCount } from './hotel'
import { heard, moodOf, settled } from './mood'
import { delightsIn, kits, roomings, solve } from './solver'

/** The share of the ways of giving out the rooms that settle the house with everything left in the cupboard. */
function bareShare(cast: Cast): number {
  const start = startOf(cast)
  let all = 0, settling = 0
  for (const rooming of roomings(cast, cast.guests)) {
    all++
    if (settled({ ...start, guests: start.guests.map((guest) => ({ id: guest.id, at: rooming[guest.id] ?? guest.at })) })) settling++
  }
  return settling / all
}

/** Whether an arrangement puts the new thing of its place to its proper use. */
const USES: Record<string, (arrangement: Arrangement) => boolean> = {
  'two-guests': () => true,
  'heat-and-snow': (a) => a.house.fixtures.length === 2,
  quilt: (a) => isEdgeAt(thing(a, 'quilt')!.at),
  corridor: (a) => delightsIn(a) > 0,
  'stove-and-ice': (a) => (['stove', 'ice'] as const).some((kind) => isRoomAt(thing(a, kind)!.at)),
  'alarm-clock': (a) => {
    const at = thing(a, 'clock')!.at
    return isGuestAt(at) && TASTES[at.guest].flexible
  },
  'tower-and-pipe': (a) => isEdgeAt(thing(a, 'pipe')!.at),
  'twin-rooms': (a) => Array.from({ length: roomCount(a.house.shape) }, (_, room) => occupants(a, room).length).some((count) => count === 2),
  listener: (a) => roomOf(a, 'singer') !== null && heard(a, 'singer', 'night'),
  'full-house': (a) => a.things.filter((item) => item.at !== 'cupboard').length >= 2,
}

describe('the designed order', () => {
  it('has ten places with stable ids that name what is in the house, never a grade, a groep or a level', () => {
    expect(LADDER).toEqual(['two-guests', 'heat-and-snow', 'quilt', 'corridor', 'stove-and-ice', 'alarm-clock', 'tower-and-pipe', 'twin-rooms', 'listener', 'full-house'])
    for (const id of LADDER) expect(id).not.toMatch(/grade|groep|fase|level|year|class|\d/)
    expect(new Set(LADDER).size).toBe(LADDER.length)
    expect(LADDER).toContain(WHOLE_PATHS_UNTIL)
  })

  it('starts a first visit at the first place for 9 and 10 and no age, and at the second from 11', () => {
    expect(FIRST_VISIT).toEqual([{ fromAge: 9, position: 'two-guests' }, { fromAge: 11, position: 'heat-and-snow' }])
  })

  it('gives every place three casts, each with an id of its own that begins with its place', () => {
    for (const place of LADDER) expect(castsAt(place).length, place).toBe(3)
    expect(CASTS.length).toBe(3 * LADDER.length)
    expect(new Set(CASTS.map((cast) => cast.id)).size).toBe(CASTS.length)
    for (const cast of CASTS) {
      expect(cast.id.startsWith(`${cast.position}/`), cast.id).toBe(true)
      expect(castById(cast.id)).toBe(cast)
    }
  })

  it('adds one new thing at a time: a thing or a guest appears in the cupboard or the coach only from its own place on', () => {
    const firstPlace: Record<string, string> = { quilt: 'quilt', stove: 'stove-and-ice', ice: 'stove-and-ice', clock: 'alarm-clock', pipe: 'tower-and-pipe', singer: 'listener', cook: 'corridor', fly: 'corridor', lizard: 'heat-and-snow', yeti: 'heat-and-snow' }
    for (const cast of CASTS) {
      const here = LADDER.indexOf(cast.position)
      for (const name of [...cast.kit, ...cast.guests]) {
        if (name in firstPlace) expect(here, `${name} in ${cast.id}`).toBeGreaterThanOrEqual(LADDER.indexOf(firstPlace[name]))
      }
      const shape = cast.house.shape
      if (shape === 'long') expect(here, cast.id).toBeGreaterThanOrEqual(LADDER.indexOf('corridor'))
      if (shape === 'tower') expect(here, cast.id).toBeGreaterThanOrEqual(LADDER.indexOf('tower-and-pipe'))
      if (cast.house.twins.length > 0) expect(here, cast.id).toBeGreaterThanOrEqual(LADDER.indexOf('twin-rooms'))
      if (cast.house.fixtures.length > 0) expect(here, cast.id).toBeGreaterThanOrEqual(LADDER.indexOf('heat-and-snow'))
    }
    // And each place does bring its new thing, in every cast.
    for (const cast of castsAt('quilt')) expect(cast.kit).toContain('quilt')
    for (const cast of castsAt('corridor')) expect(cast.guests).toEqual(expect.arrayContaining(['cook', 'fly']))
    for (const cast of castsAt('stove-and-ice')) expect(cast.kit).toEqual(expect.arrayContaining(['stove', 'ice']))
    for (const cast of castsAt('alarm-clock')) expect(cast.kit).toContain('clock')
    for (const cast of castsAt('tower-and-pipe')) expect([cast.house.shape, cast.kit.includes('pipe')]).toEqual(['tower', true])
    for (const cast of castsAt('twin-rooms')) expect(cast.guests.length).toBeGreaterThan(roomCount(cast.house.shape))
    for (const cast of castsAt('listener')) expect(cast.guests).toContain('singer')
    for (const cast of castsAt('full-house')) expect([cast.guests.length, cast.kit.length]).toEqual([5, 3])
  })
})

describe('every cast', () => {
  it.each(CASTS.map((cast) => [cast.id, cast] as const))('%s is well formed, with a bed spare for the guest on the bench', (_, cast) => {
    expect(new Set(cast.guests).size).toBe(cast.guests.length)
    expect(cast.guests.every((id) => GUEST_IDS.includes(id))).toBe(true)
    expect(cast.guests).not.toContain(cast.bench)
    expect(new Set(cast.kit).size).toBe(cast.kit.length)
    expect(cast.kit.every((kind) => THING_KINDS.includes(kind))).toBe(true)
    const rooms = roomCount(cast.house.shape)
    expect(cast.house.twins.every((room) => room >= 0 && room < rooms)).toBe(true)
    const beds = Array.from({ length: rooms }, (_, room) => bedsIn(cast.house, room)).reduce((sum, count) => sum + count, 0)
    expect(beds).toBeGreaterThan(cast.guests.length)
    const start = startOf(cast)
    expect(present(start)).toEqual([...cast.guests])
    expect(settled(start)).toBe(false)
  })

  it.each(CASTS.map((cast) => [cast.id, cast] as const))('%s is settled by at least two different ways of giving out the rooms', (_, cast) => {
    expect(solve(cast, { enough: 2, keep: 0 }).settling).toBeGreaterThanOrEqual(2)
  })

  it.each(CASTS.map((cast) => [cast.id, cast] as const))('%s has a neat way that settles the house, puts the new thing of its place to use, and uses nothing idly', (_, cast) => {
    const neat = neatOf(cast)
    expect(cast.guests.every((id) => roomOf(neat, id) !== null)).toBe(true)
    expect(roomOf(neat, cast.bench)).toBe(null)
    for (const item of neat.things) {
      if (isEdgeAt(item.at)) expect(edgeById(cast.house.shape, item.at.edge), `${item.kind} on ${item.at.edge}`).not.toBe(null)
      if (isGuestAt(item.at)) expect(roomOf(neat, item.at.guest)).not.toBe(null)
    }
    expect(settled(neat)).toBe(true)
    expect(USES[cast.position](neat)).toBe(true)
    // Put any one placed thing back in the cupboard and the house is no longer settled, or somebody is less happy.
    for (const item of neat.things) {
      if (item.at === 'cupboard') continue
      const without: Arrangement = { ...neat, things: neat.things.map((other) => (other.kind === item.kind ? { ...other, at: 'cupboard' } : other)) }
      expect(!settled(without) || delightsIn(without) < delightsIn(neat), `${item.kind} is idle`).toBe(true)
    }
  })

  it.each(CASTS.map((cast) => [cast.id, cast] as const))('%s can be settled with the bench guest carried in', (_, cast) => {
    const full = withBenchOf(cast)
    expect(roomOf(full, cast.bench)).not.toBe(null)
    expect(present(full).length).toBe(cast.guests.length + 1)
    expect(settled(full)).toBe(true)
  })
})

describe('how hard the places are', () => {
  it('in the first two places a child who gives out rooms blind settles the house within a few tries', () => {
    for (const place of LADDER.slice(0, 2)) for (const cast of castsAt(place)) expect(bareShare(cast), cast.id).toBeGreaterThanOrEqual(1 / 8)
  })

  it('from the third place on, giving out rooms blind seldom settles the house', () => {
    for (const place of LADDER.slice(2)) for (const cast of castsAt(place)) expect(bareShare(cast), cast.id).toBeLessThanOrEqual(1 / 8)
  })

  it('once things can be placed a house has from about two hundred to many thousands of arrangements', () => {
    const sizes = LADDER.slice(2).flatMap((place) => castsAt(place)).map((cast) => {
      let rooms = 0, placings = 0
      for (const _ of roomings(cast, cast.guests)) rooms++
      for (const _ of kits(cast, cast.guests)) placings++
      return rooms * placings
    })
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(190)
    expect(Math.max(...sizes)).toBeGreaterThan(100000)
  })

  it('keeps the singer off the bench until her own place, so that she is new there', () => {
    for (const cast of CASTS) if (cast.bench === 'singer') expect(LADDER.indexOf(cast.position), cast.id).toBeGreaterThanOrEqual(LADDER.indexOf('listener'))
  })

  it('no guest of any cast is cross for a reason the child cannot find from its place', () => {
    // Every grievance of every guest, in every neat arrangement with one guest moved, names a kind the page can draw.
    const kinds = new Set<string>()
    for (const cast of CASTS) {
      const neat = neatOf(cast)
      const moved: Arrangement = { ...neat, guests: neat.guests.map((guest, at) => (at === 0 ? { id: guest.id, at: 'lobby' } : guest)) }
      for (const arrangement of [neat, moved]) {
        for (const id of present(arrangement)) for (const phase of PHASES) for (const grievance of moodOf(arrangement, id, phase).grievances) kinds.add(grievance.kind)
      }
    }
    for (const kind of kinds) expect(['no-room', 'too-warm', 'too-cold', 'din', 'pong', 'wrapped', 'unheard']).toContain(kind)
    expect(kinds).toContain('no-room')
  })

  it('awake and asleep are told from the arrangement alone, at every hour', () => {
    for (const cast of CASTS) {
      const neat = neatOf(cast)
      for (const id of cast.guests) expect(PHASES.filter((phase) => awake(neat, id, phase)).length, `${cast.id} ${id}`).toBe(1)
      for (const id of cast.guests) if (holds(neat, id, 'clock')) expect(TASTES[id].flexible).toBe(true)
    }
  })

  it('on a first visit, at whichever place it starts, two of the guests in the lobby ask for the same door', () => {
    for (const { position } of FIRST_VISIT) {
      const first = castsAt(position)[0]
      const doors = first.guests.map((id) => demandOf(first.house, id))
      expect(new Set(doors).size, first.id).toBeLessThan(doors.length)
    }
  })
})
