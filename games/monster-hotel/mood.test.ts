import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { GUEST_IDS, TASTES } from './guests'
import type { House } from './hotel'
import { contentAllDay, heard, lastCrossing, moodOf, settled, sideOf, turnsTo } from './mood'

const long: House = { shape: 'long', fixtures: [], twins: [] }
const heated: House = { shape: 'long', fixtures: [{ kind: 'boiler', col: 0 }, { kind: 'snow', col: 2 }], twins: [] }
const kinds = (arrangement: ReturnType<typeof arrange>, id: Parameters<typeof moodOf>[1], phase: 'day' | 'night') =>
  moodOf(arrangement, id, phase).grievances.map((grievance) => grievance.kind)

describe('who is cross, and exactly why', () => {
  it('a guest in the lobby wants a room and nothing else', () => {
    expect(kinds(arrange(long, { blob: 'lobby' }), 'blob', 'day')).toEqual(['no-room'])
  })

  it('the tuba at night bothers the sleeper next door, with the wall it came through', () => {
    const house = arrange(long, { troll: 4, blob: 3 })
    const mood = moodOf(house, 'blob', 'night')
    expect(mood.content).toBe(false)
    const [grievance] = mood.grievances
    expect(grievance.kind).toBe('din')
    if (grievance.kind !== 'din') throw new Error('expected a noise')
    expect(grievance.arrival.source.by).toEqual({ guest: 'troll' })
    expect(grievance.arrival.path).toEqual([4, 3])
    expect(sideOf(house, grievance.arrival)).toBe('right')
    expect(lastCrossing(house, grievance.arrival)).toBe('3-4')
    expect(turnsTo(house, 'blob', 'night')).toBe('right')
    // By day the troll sleeps and the blob is up: no trouble, and nowhere to turn.
    expect(moodOf(house, 'blob', 'day').content).toBe(true)
    expect(turnsTo(house, 'blob', 'day')).toBe(null)
  })

  it('two guests who both keep the night are good neighbours: the bat is awake while the tuba plays', () => {
    const house = arrange(long, { troll: 4, bat: 3 })
    expect(contentAllDay(house, 'bat')).toBe(true)
    expect(contentAllDay(house, 'troll')).toBe(true)
    expect(settled(house)).toBe(true)
  })

  it('the same noise is a trouble to one guest and nothing to another', () => {
    const house = arrange(long, { troll: 4, blob: 3, yeti: 5 })
    expect(moodOf(house, 'blob', 'night').content).toBe(false)
    expect(kinds(house, 'yeti', 'night')).toEqual([])
  })

  it('a quilt on the wall between them settles it, and so does a room further off', () => {
    expect(settled(arrange(long, { troll: 4, blob: 3 }, { quilt: { edge: '3-4' } }))).toBe(true)
    expect(settled(arrange(long, { troll: 5, blob: 3 }))).toBe(true)
    expect(settled(arrange(long, { troll: 4, blob: 3 }))).toBe(false)
  })

  it('asking the troll to play by day settles it too, since it will change its hours', () => {
    const house = arrange(long, { troll: 4, blob: 3 }, { clock: { guest: 'troll' } })
    expect(settled(house)).toBe(true)
    // The bat next door would now be woken by day, and the bat will not change its hours.
    const withBat = arrange(long, { troll: 4, bat: 3 }, { clock: { guest: 'troll' } })
    expect(kinds(withBat, 'bat', 'day')).toEqual(['din'])
    expect(settled(arrange(long, { troll: 4, bat: 3 }, { clock: { guest: 'bat' } }))).toBe(true)
  })

  it('a room too warm or too cold names what pushes it the wrong way', () => {
    const house = arrange(heated, { yeti: 0, lizard: 5 })
    const yeti = moodOf(house, 'yeti', 'day').grievances[0]
    expect(yeti.kind).toBe('too-warm')
    if (yeti.kind !== 'too-warm') throw new Error('expected warmth')
    expect(yeti.from.map((arrival) => arrival.source.by)).toEqual([{ fixture: 'boiler' }])
    const lizard = moodOf(house, 'lizard', 'day').grievances[0]
    expect(lizard.kind).toBe('too-cold')
    if (lizard.kind !== 'too-cold') throw new Error('expected cold')
    expect(lizard.from.map((arrival) => arrival.source.by)).toEqual([{ fixture: 'snow' }])
    expect(settled(arrange(heated, { yeti: 5, lizard: 0 }))).toBe(true)
  })

  it('a guest who needs warmth in a mild room is cross with nothing to blame', () => {
    const mood = moodOf(arrange(long, { lizard: 0 }), 'lizard', 'day')
    expect(mood.grievances).toEqual([{ kind: 'too-cold', temperature: 0, from: [] }])
    expect(turnsTo(arrange(long, { lizard: 0 }), 'lizard', 'day')).toBe(null)
  })

  it('the cold the yeti brings sinks onto whoever is below, and never bothers the yeti', () => {
    const house = arrange(long, { yeti: 3, fly: 0 })
    expect(contentAllDay(house, 'yeti')).toBe(true)
    expect(kinds(house, 'fly', 'day')).toEqual(['too-cold'])
    expect(turnsTo(house, 'fly', 'day')).toBe('up')
  })

  it('the dial matters: a flame too few leaves the lizard cold, a flame too many warms the yeti above it', () => {
    // The lizard on the ground with the stove, the yeti above: the yeti's cold sinks one step, the stove's warmth rises.
    const at = (dial: 1 | 2 | 3) => arrange(long, { lizard: 0, yeti: 3 }, { stove: { room: 0 } }, { dials: { stove: dial } })
    expect(kinds(at(1), 'lizard', 'day')).toEqual(['too-cold'])
    expect(settled(at(2))).toBe(true)
    expect(kinds(at(3), 'yeti', 'day')).toEqual(['too-warm'])
    expect(turnsTo(at(3), 'yeti', 'day')).toBe('down')
    // With the floor between them padded, any flame that warms the lizard will do.
    expect(settled(arrange(long, { lizard: 0, yeti: 3 }, { stove: { room: 0 }, quilt: { edge: '0-3' } }, { dials: { stove: 3 } }))).toBe(true)
  })

  it('half-way is no settlement: in one room no step of the dial suits both the lizard and the yeti', () => {
    const twin: House = { shape: 'long', fixtures: [], twins: [0] }
    for (const dial of [1, 2, 3] as const) {
      expect(settled(arrange(twin, { lizard: 0, yeti: 0 }, { stove: { room: 0 } }, { dials: { stove: dial } }))).toBe(false)
    }
  })

  it('the smell of the stew is a trouble to the blob and a treat to the fly', () => {
    const house = arrange(long, { cook: 1, blob: 0, fly: 2 })
    expect(kinds(house, 'blob', 'day')).toEqual(['pong'])
    const fly = moodOf(house, 'fly', 'day')
    expect(fly.content).toBe(true)
    expect(fly.delights.map((delight) => delight.kind)).toEqual(['pong'])
    // At night the cook sleeps: nothing drifts, and the fly has nothing to love.
    expect(moodOf(house, 'blob', 'night').content).toBe(true)
    expect(moodOf(house, 'fly', 'night').delights).toEqual([])
  })

  it('a cross guest shows no delight', () => {
    const house = arrange(long, { cook: 1, fly: 2, yeti: 5 })
    const fly = moodOf(house, 'fly', 'day')
    expect(fly.content).toBe(false)
    expect(fly.delights).toEqual([])
  })

  it('the cook hums along only when the tuba is played by day', () => {
    expect(moodOf(arrange(long, { troll: 4, cook: 1 }), 'cook', 'night').delights).toEqual([])
    const swapped = arrange(long, { troll: 4, cook: 1 }, { clock: { guest: 'troll' } })
    expect(moodOf(swapped, 'cook', 'day').delights.map((delight) => delight.kind)).toEqual(['din'])
  })

  it('wrapped in the quilt, the troll is cross and the blob is happier', () => {
    expect(kinds(arrange(long, { troll: 4 }, { quilt: { guest: 'troll' } }), 'troll', 'night')).toEqual(['wrapped'])
    expect(moodOf(arrange(long, { blob: 4 }, { quilt: { guest: 'blob' } }), 'blob', 'night').delights).toEqual([{ kind: 'wrap' }])
  })

  it('the singer is content only when someone awake hears her and does not mind', () => {
    expect(kinds(arrange(long, { singer: 4 }), 'singer', 'night')).toEqual(['unheard'])
    // The blob next door is asleep at night: it hears her and minds.
    const asleep = arrange(long, { singer: 4, blob: 3 })
    expect(heard(asleep, 'singer', 'night')).toBe(false)
    expect(kinds(asleep, 'blob', 'night')).toEqual(['din'])
    // The bat keeps the night and minds noise only in its sleep.
    const bat = arrange(long, { singer: 4, bat: 2 })
    expect(heard(bat, 'singer', 'night')).toBe(true)
    expect(settled(bat)).toBe(true)
    // Out of reach of her voice, nobody hears her.
    expect(heard(arrange(long, { singer: 3, bat: 2 }, { quilt: { edge: '3-4' } }), 'singer', 'night')).toBe(false)
    // By day she sleeps and needs nobody.
    expect(moodOf(arrange(long, { singer: 4 }), 'singer', 'day').content).toBe(true)
  })

  it('two who share a room hear each other at full strength, and a day and a night sleeper can share', () => {
    const twin: House = { shape: 'long', fixtures: [], twins: [4] }
    expect(settled(arrange(twin, { troll: 4, blob: 4 }))).toBe(false)
    expect(settled(arrange(twin, { troll: 4, bat: 4 }))).toBe(true)
    const noise = moodOf(arrange(twin, { troll: 4, blob: 4 }), 'blob', 'night').grievances[0]
    if (noise.kind !== 'din') throw new Error('expected a noise')
    expect(noise.arrival.level).toBe(2)
    expect(sideOf(arrange(twin, { troll: 4, blob: 4 }), noise.arrival)).toBe(null)
  })

  it('the house is settled only when everyone staying is content by day and by night', () => {
    expect(settled(arrange(long, {}))).toBe(false)
    expect(settled(arrange(long, { troll: 4, bat: 'lobby' }))).toBe(false)
    // The guest on the bench is no part of it until carried in.
    expect(settled(arrange(long, { troll: 4, singer: 'bench' }, {}, { bench: 'singer' }))).toBe(true)
    expect(settled(arrange(long, { troll: 4, bat: 'gone' }))).toBe(true)
  })

  it('every guest is content alone in a room that suits it, so no guest is impossible', () => {
    for (const id of GUEST_IDS) {
      const [coldest, warmest] = TASTES[id].comfort
      const brings = TASTES[id].carries
      // A stove or an ice box in its room brings it into its comfort if what it brings does not.
      const want = Math.max(coldest, Math.min(warmest, brings))
      const things = want > brings ? { stove: { room: 4 } } : want < brings ? { ice: { room: 4 } } : {}
      const dials = { stove: Math.abs(want - brings) as 1 | 2 | 3, ice: Math.abs(want - brings) as 1 | 2 | 3 }
      const alone = arrange(long, { [id]: 4, ...(TASTES[id].needsListener ? { bat: 5 } : {}) }, things, { dials })
      expect(contentAllDay(alone, id), id).toBe(true)
    }
  })

  it('tastes never change: the same arrangement always gives the same mood', () => {
    const house = arrange(heated, { troll: 4, blob: 3, cook: 1, fly: 2, yeti: 5 })
    for (const id of ['troll', 'blob', 'cook', 'fly', 'yeti'] as const) expect(moodOf(house, id, 'night')).toEqual(moodOf(house, id, 'night'))
  })
})
