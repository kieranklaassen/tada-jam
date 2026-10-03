import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { castById } from './casts'
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
    expect(byWay(page.airs)).toEqual(byWay(SPIKE_SCENE.airs))
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
    expect(pageOf(away).guests.map((guest) => guest.id)).toEqual([cast.bench])
  })

  it('the page is drawn from the guest the child touched, and the house on it is the same house', () => {
    const start = withCast(freshStay(null), castById('two-guests/b')!)
    const looked = tapIn(start, { guest: 'blob' }).stay
    expect(pageOf(looked).from).toBe('blob')
    expect({ ...pageOf(looked), from: null }).toEqual(pageOf(start))
  })

  it('a content guest whom something it loves reaches is drawn happier, and a cross one turns to its trouble', () => {
    const house = arrange({ shape: 'long', fixtures: [], twins: [] }, { cook: 1, fly: 2, blob: 0 }, {}, { phase: 'day' })
    const guests = Object.fromEntries(pageOfArrangement(house, null, true).guests.map((guest) => [guest.id, guest]))
    expect([guests.fly.mood, guests.fly.turnedTo]).toEqual(['happier', null])
    expect([guests.blob.mood, guests.blob.turnedTo]).toEqual(['cross', 'right'])
    expect(guests.cook.mood).toBe('content')
  })

  it('past the early places the plain page keeps only the last crossing of each air', () => {
    const house = arrange({ shape: 'long', fixtures: [], twins: [] }, { singer: 3, troll: 5 }, {}, { phase: 'night' })
    const whole = pageOfArrangement(house, null, true).airs.filter((air) => air.kind === 'din' && air.rooms[0] === 3)
    expect(whole.some((air) => air.rooms.length === 3)).toBe(true)
    const last = pageOfArrangement(house, null, false).airs
    expect(last.every((air) => air.rooms.length === 2)).toBe(true)
  })
})
