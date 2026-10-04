import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { CASTS, castById, neatOf, withBenchOf } from './casts'
import { PHASES } from './guests'
import { moodOf } from './mood'
import { setDownIn, tapIn } from './cycle'
import { SPIKE_SCENE, type InkAir, type InkGuest } from './inkScene'
import { pageOf, pageOfArrangement } from './page'
import { freshStay, withCast } from './stay'

const byId = (guests: InkGuest[]) => [...guests].sort((a, b) => a.id.localeCompare(b.id))
const byWay = (airs: InkAir[]) => [...airs].sort((a, b) => `${a.kind}${a.rooms}`.localeCompare(`${b.kind}${b.rooms}`))

describe('from the rules to the page', () => {
  it('the look spike is a true state of the rules: the same house arranged the same way gives the same page', () => {
    const house = arrange(
      SPIKE_SCENE.house,
      { lizard: 0, cook: 1, fly: 2, blob: 3, troll: 4, yeti: 5, bat: 'lobby', singer: 'bench' },
      { quilt: 'cupboard', pipe: 'cupboard', stove: 'cupboard', ice: 'cupboard', clock: 'cupboard' },
      { phase: 'night', bench: 'singer', dials: { stove: 2 } },
    )
    const page = pageOfArrangement(house, null, true)
    expect(byId(page.guests)).toEqual(byId(SPIKE_SCENE.guests))
    // The spike's scene lists the airs that cross a wall or a floor; the page also keeps each air in the room it is made in.
    expect(byWay(page.airs.filter((air) => air.rooms.length > 1))).toEqual(byWay(SPIKE_SCENE.airs))
    expect(page.things).toEqual(SPIKE_SCENE.things)
    expect([page.phase, page.from, page.house]).toEqual([SPIKE_SCENE.phase, SPIKE_SCENE.from, SPIKE_SCENE.house])
  })

  it('a guest in the lobby waits and stares at the door it wants; nobody who has left is drawn', () => {
    const cast = castById('two-guests/a')!
    const start = withCast(freshStay(null), cast)
    const page = pageOf(start)
    // In a house with nothing built in, both stare at the same door.
    expect(page.guests.filter((guest) => guest.place === 'lobby').map((guest) => guest.staresAt)).toEqual([3, 3])
    expect(page.guests.find((guest) => guest.place === 'bench')!.id).toBe(cast.bench)
    const away = setDownIn(start, { guest: 'troll' }, 'coach').stay
    expect(pageOf(away).guests).toEqual([])
  })

  it('the page is drawn from the guest the child touched, and the house on it is the same house', () => {
    const start = withCast(freshStay(null), castById('two-guests/b')!)
    const looked = tapIn(start, { guest: 'blob' }).stay
    const page = pageOf(looked), plain = pageOf(start)
    expect(page.from).toBe('blob')
    // In the lobby it has no room yet: the large room is the one it asks for.
    expect(page.view).toEqual({ from: 'blob', room: 3, large: false })
    expect([page.house, page.phase, page.guests, page.things]).toEqual([plain.house, plain.phase, plain.guests, plain.things])
    expect(plain.view).toBeUndefined()
  })

  it('the same noise is marked by how the guest whose page it is takes it', () => {
    const house = arrange({ shape: 'square', fixtures: [], twins: [] }, { troll: 2, blob: 3, bat: 0 }, {}, { phase: 'night' })
    const din = (from: 'troll' | 'blob' | 'bat') => Object.fromEntries(pageOfArrangement(house, from, true).airs.filter((air) => air.kind === 'din').map((air) => [air.rooms.join('-'), air.taken]))
    // From the troll's place its own noise is its pride, wherever it goes.
    expect(din('troll')).toEqual({ '2': 'loved', '2-3': 'loved', '2-0': 'loved' })
    // From the place of the blob it keeps awake: the way into the blob's room is what it minds, and the rest is nothing to it.
    // The room it is made in is marked too: the way is black all the way back to the tuba.
    expect(din('blob')).toEqual({ '2': 'minded', '2-3': 'minded', '2-0': 'faint' })
    // The bat is up at night and minds no noise.
    expect(din('bat')).toEqual({ '2': 'faint', '2-3': 'faint', '2-0': 'faint' })
    // On the plain page nothing is marked.
    expect(pageOfArrangement(house, null, true).airs.every((air) => air.taken === undefined)).toBe(true)
    // Held over another room, the blob's page marks what would reach it there.
    const held = pageOfArrangement(house, 'blob', true, 0).airs.filter((air) => air.kind === 'din')
    expect(Object.fromEntries(held.map((air) => [air.rooms.join('-'), air.taken]))).toEqual({ '2': 'minded', '2-3': 'faint', '2-0': 'minded' })
  })

  it('a content guest whom something it loves reaches is drawn happier, and a cross one turns to its trouble', () => {
    const house = arrange({ shape: 'long', fixtures: [], twins: [] }, { cook: 1, fly: 2, blob: 0 }, {}, { phase: 'day' })
    const guests = Object.fromEntries(pageOfArrangement(house, null, true).guests.map((guest) => [guest.id, guest]))
    // The fly leans into the smell, toward the wall it comes through.
    expect([guests.fly.mood, guests.fly.turnedTo]).toEqual(['happier', 'left'])
    expect([guests.blob.mood, guests.blob.turnedTo]).toEqual(['cross', 'right'])
    expect(guests.cook.mood).toBe('content')
  })

  it('past the early places the plain page keeps only the last crossing of a trouble or a delight, into the room of the guest it reaches', () => {
    // The singer sings at night over a sleeping blob two rooms along; the troll, far off, minds nothing.
    const house = arrange({ shape: 'long', fixtures: [], twins: [] }, { singer: 3, blob: 1, troll: 5 }, {}, { phase: 'night' })
    const whole = pageOfArrangement(house, null, true).airs.filter((air) => air.kind === 'din' && air.rooms[0] === 3)
    expect(whole.some((air) => air.rooms.length === 3)).toBe(true)
    const last = pageOfArrangement(house, null, false).airs.filter((air) => air.rooms.length > 1)
    // Only what crosses into the blob's room is left, each as its last crossing: nothing on the way there, and nothing into a room where nobody minds.
    expect(last.length).toBeGreaterThan(0)
    expect(last.every((air) => air.rooms.length === 2 && air.rooms[1] === 1)).toBe(true)
    // From the blob's own place the whole way is there.
    expect(pageOfArrangement(house, 'blob', false).airs.some((air) => air.rooms.length === 3 && air.rooms[2] === 1 && air.taken === 'minded')).toBe(true)
  })

  it('what the hung quilt is stopping bunches against it, on the side it comes from, and nothing bunches where it stops nothing', () => {
    const shape = { shape: 'square', fixtures: [], twins: [] } as const
    // The tuba at night, the quilt on its wall: the noise is pressed up on the troll's side.
    const stops = arrange(shape, { troll: 0, blob: 1 }, { quilt: { edge: '0-1' } }, { phase: 'night' })
    expect(pageOfArrangement(stops, null, true).bunches).toEqual([0])
    // By day the troll sleeps: the quilt stops nothing and nothing bunches.
    expect(pageOfArrangement({ ...stops, phase: 'day' }, null, true).bunches).toEqual([])
    // On a wall nobody's noise reaches, nothing bunches either.
    const idle = arrange(shape, { troll: 0, blob: 1 }, { quilt: { edge: '2-3' } }, { phase: 'night' })
    expect(pageOfArrangement(idle, null, true).bunches).toEqual([])
  })

  it('a smell that a wall would let through anyway passes through the pipe let through that wall: the pipe is drawn carrying it', () => {
    const shape = { shape: 'tower', fixtures: [], twins: [] } as const
    const house = arrange(shape, { cook: 0, fly: 1 }, { pipe: { edge: '0-1' } }, { phase: 'day' })
    expect(pageOfArrangement(house, null, true).passing).toBe(true)
    // A noise goes through the wall and never through the pipe.
    expect(pageOfArrangement(arrange(shape, { troll: 0 }, { pipe: { edge: '0-1' } }, { phase: 'night' }), null, true).passing).toBe(false)
  })

  it('a must-have that is missing, with nothing to blame, is on the guest\'s own page all the same', () => {
    const shape = { shape: 'square', fixtures: [], twins: [] } as const
    // The lizard in a mild room: nothing makes it cold; warmth is simply not there.
    const mild = arrange(shape, { lizard: 0 }, {}, { phase: 'day' })
    expect(pageOfArrangement(mild, 'lizard', true).wants).toEqual({ room: 0, kind: 'warm' })
    expect(pageOfArrangement(mild, null, true).wants).toBeUndefined()
    // The singer at night with nobody awake in reach of her.
    const alone = arrange(shape, { singer: 0 }, {}, { phase: 'night' })
    expect(pageOfArrangement(alone, 'singer', true).wants).toEqual({ room: 0, kind: 'heard' })
    // Warm enough, or heard: nothing is wanting.
    const warm = arrange({ shape: 'square', fixtures: [{ kind: 'boiler', col: 0 }], twins: [] }, { lizard: 0 }, {}, { phase: 'day' })
    expect(pageOfArrangement(warm, 'lizard', true).wants).toBe(null)
    const heard = arrange(shape, { singer: 0, troll: 1 }, {}, { phase: 'night' })
    expect(pageOfArrangement(heard, 'singer', true).wants).toBe(null)
  })

  it('a guest cross only because a noise keeps it awake is not marked as cold: the lizard beside the tuba in a warm room', () => {
    const house = { shape: 'square', fixtures: [{ kind: 'boiler', col: 0 }], twins: [] } as const
    const noisy = pageOfArrangement(arrange(house, { lizard: 0, troll: 1 }, {}, { phase: 'night' }), null, true).guests.find((guest) => guest.id === 'lizard')!
    expect([noisy.mood, noisy.woken]).toEqual(['cross', true])
    const cold = pageOfArrangement(arrange(house, { lizard: 1 }, {}, { phase: 'day' }), null, true).guests.find((guest) => guest.id === 'lizard')!
    expect([cold.mood, cold.woken]).toEqual(['cross', undefined])
  })

  it('the pipe is drawn carrying only at the hour something passes through it, whoever is or is not at its far end', () => {
    const shape = { shape: 'tower', fixtures: [], twins: [] } as const
    // The cook stews by day under a pipe through its ceiling, with nobody upstairs: past the early places no crossing is drawn, and the pipe still shows what it carries.
    const house = arrange(shape, { cook: 0 }, { pipe: { edge: '0-2' } }, { phase: 'day' })
    const day = pageOfArrangement(house, null, false)
    expect(day.passing).toBe(true)
    expect(day.airs.filter((air) => air.rooms.length > 1 && air.kind === 'pong')).toEqual([])
    // By night the cook sleeps and no smell is made; its own small warmth still goes up the pipe. In the cupboard, the pipe carries nothing.
    expect(pageOfArrangement(arrange(shape, { cook: 0 }, {}, { phase: 'day' }), null, false).passing).toBe(false)
    expect(pageOfArrangement(arrange(shape, { troll: 0 }, { pipe: { edge: '0-2' } }, { phase: 'day' }), null, false).passing).toBe(false)
  })

  it('from a cross guest\'s place a trouble is marked the whole way back to the thing it starts from, floor by floor', () => {
    // The stove at three flames on the ground floor of the tower, and the bat two floors up, where it must not be warm.
    const house = arrange({ shape: 'tower', fixtures: [], twins: [] }, { bat: 4 }, { stove: { room: 0 } }, { phase: 'day', dials: { stove: 3 } })
    const warm = Object.fromEntries(pageOfArrangement(house, 'bat', false).airs.filter((air) => air.kind === 'warm').map((air) => [air.rooms.join('-'), air.taken]))
    expect(warm).toEqual({ '0': 'minded', '0-2': 'minded', '0-2-4': 'minded' })
  })

  it('a trouble made in the very room it is minded in is marked there, from the cross guest\'s place', () => {
    const taken = (page: { airs: InkAir[] }, kind: InkAir['kind'], room: number) => page.airs.find((air) => air.kind === kind && air.rooms.length === 1 && air.rooms[0] === room)?.taken
    // The yeti over the boiler: the warmth is made under its own floor and has crossed nothing.
    const boiler = arrange({ shape: 'square', fixtures: [{ kind: 'boiler', col: 0 }], twins: [] }, { yeti: 0 }, {}, { phase: 'day' })
    expect(taken(pageOfArrangement(boiler, 'yeti', true), 'warm', 0)).toBe('minded')
    expect(taken(pageOfArrangement(boiler, null, true), 'warm', 0)).toBeUndefined()
    // The fly's buzz stays in its own room, where a bat that shares the room sleeps by day.
    const twin = arrange({ shape: 'square', fixtures: [], twins: [0] }, { fly: 0, bat: 0 }, {}, { phase: 'day' })
    expect(taken(pageOfArrangement(twin, 'bat', true), 'din', 0)).toBe('minded')
    expect(taken(pageOfArrangement(twin, 'fly', true), 'din', 0)).toBe('loved')
    // A room-mate's stew: the blob minds the smell at any hour, and the fly loves it.
    const stew = arrange({ shape: 'square', fixtures: [], twins: [1] }, { cook: 1, blob: 1 }, {}, { phase: 'day' })
    expect(taken(pageOfArrangement(stew, 'blob', true), 'pong', 1)).toBe('minded')
  })

  it('heavy black is only ever on the page of a guest who is cross: in every neat way of every cast, at both hours, a content guest\'s page marks nothing as minded', () => {
    let pages = 0
    for (const cast of CASTS) {
      for (const house of [neatOf(cast), withBenchOf(cast)]) {
        for (const phase of PHASES) {
          const at = { ...house, phase }
          for (const guest of at.guests) {
            if (typeof guest.at !== 'number') continue
            const minded = pageOfArrangement(at, guest.id, true).airs.filter((air) => air.taken === 'minded')
            if (moodOf(at, guest.id, phase).content) expect(minded, `${cast.id} ${guest.id} ${phase}`).toEqual([])
            pages++
          }
        }
      }
    }
    expect(pages).toBeGreaterThan(200)
  })

  it('a warmth that a cold cancels is nothing to the guest between them, and the same warmth alone is its trouble', () => {
    const shape = { shape: 'tower', fixtures: [{ kind: 'boiler', col: 0 }], twins: [] } as const
    const taken = (house: ReturnType<typeof arrange>) => pageOfArrangement(house, 'blob', true).airs.filter((air) => air.kind === 'warm').map((air) => air.taken)
    // The blob one floor up over the boiler is too warm, and the warmth is drawn as its trouble.
    const warm = arrange(shape, { blob: 2 }, {}, { phase: 'day' })
    expect(moodOf(warm, 'blob', 'day').content).toBe(false)
    expect(moodOf(warm, 'blob', 'day').grievances.map((grievance) => grievance.kind)).toEqual(['too-warm'])
    expect(taken(warm)).toContain('minded')
    // With the yeti in the room above it, the yeti's cold sinks onto it and the room is mild again: the blob is content, and the same warmth is still drawn, in pencil.
    const mild = arrange(shape, { blob: 2, yeti: 4 }, {}, { phase: 'day' })
    expect(moodOf(mild, 'blob', 'day').content).toBe(true)
    expect(taken(mild).length).toBeGreaterThan(0)
    expect(new Set(taken(mild))).toEqual(new Set(['faint']))
  })
})
