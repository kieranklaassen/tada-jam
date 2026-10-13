import { describe, expect, it } from 'vitest'
import { SEATS, SUN } from './ground'
import { freshSave } from './save'
import { stepAt } from './shapes'
import { EVERY, OUT, Village, type Shown } from './village'
import { BELL, FRAME, LOOSEN_S, ON_CART, PUFF, RED, carry, doorOf, fromLog, liftPath, loaded, run, stored, tap, village, type At } from './testkit'

// Found as left. A game that is parked stays mounted and is found again as
// it rests; a game that is closed is loaded from its save. The two must be
// the same village, whatever the child was doing when it was put away: so
// each test parks a village in the middle of something and compares all that
// is seen with a fresh load of what was stored.

const WATER: At = { x: 870, y: 742 }
const ROW = [860, 880, 900, 920, 940, 960, 980].map((x) => ({ x, y: 600 }))
/** All that is seen, without the clock. */
const seen = (v: Village): Omit<Shown, 't'> => { const { t: _t, ...rest } = v.show(); return JSON.parse(JSON.stringify(rest)) }
const draw = (v: Village, points: readonly At[]): void => { v.press(points[0]); for (const p of points.slice(1)) v.drag(p) }

const HOUSES = { mushrooms: [{ ...RED, door: true }, { ...BELL, door: true }, { ...PUFF, door: false }], homes: { tall: null, sleepy: null, sneezy: 1, baker: 2 } }

/** Each state a put-away may find, as the last thing the child did before it. */
const STATES: [string, () => Village][] = [
  ['a hold in progress', () => { const v = village(); v.press({ x: 900, y: 500 }); run(v, 0.7); return v }],
  ['a hold on a mushroom that stands', () => { const v = village({ mushrooms: [RED] }); v.press({ x: RED.x, y: RED.y - 60 }); run(v, 0.5); return v }],
  ['a pull in progress, past where it comes out', () => { const v = village({ mushrooms: [RED] }); carry(v, { x: RED.x, y: RED.y - 100 }, { x: RED.x, y: RED.y - 100 - OUT - 30 }); return v }],
  ['a door from the cart in the hand, over a mushroom', () => { const v = village({ mushrooms: [RED] }); carry(v, ON_CART, { x: RED.x, y: RED.y - 30 }); return v }],
  ['a door from a house in the hand', () => { const v = village(HOUSES); carry(v, doorOf(v, 1), { x: 880, y: 620 }); return v }],
  ['a stroke in progress', () => { const v = village(); carry(v, { x: 860, y: 620 }, { x: 1000, y: 620 }); return v }],
  ['a path in the hand, lifted high', () => { const v = village({ paths: [ROW] }); carry(v, { x: 920, y: 600 }, { x: 920, y: 600 - OUT - 40 }); return v }],
  ['a gnome on his way to a new house', () => { const v = village({ mushrooms: [RED] }); carry(v, ON_CART, { x: RED.x, y: RED.y - 30 }); v.lift(); run(v, 1.8); return v }],
  ['a gnome who was sent, just as he sets off', () => { const v = village({ mushrooms: [RED] }); carry(v, ON_CART, { x: RED.x, y: RED.y - 30 }); v.lift(); return v }],
  ['a gnome on a walk', () => { const v = village({ ...HOUSES, paths: [fromLog(stepAt(RED))] }); tap(v, doorOf(v, 1)); run(v, 2.5); return v }],
  ['a gnome strolling a path that leads nowhere', () => { const v = village(); draw(v, [{ x: 880, y: 600 }, { x: 760, y: 560 }, { x: 640, y: 540 }]); v.lift(); run(v, 2); return v }],
  ['night as it falls', () => { const v = village(HOUSES); tap(v, SUN); run(v, 1.2); return v }],
  ['morning as it comes', () => { const v = village({ ...HOUSES, night: true }); tap(v, { x: SUN.x, y: 250 }); run(v, 0.6); return v }],
  ['night, long after', () => { const v = village(HOUSES); tap(v, SUN); run(v, 12); return v }],
  ['the cart on its way in', () => { const v = new Village(freshSave(3), 1); tap(v, WATER); run(v, 1.2); return v }],
  ['a cart that is owed', () => { const v = new Village(freshSave(3), 1); v.press(WATER); run(v, 0.3); return v }],
  ['the first pebbles as the snail lays them', () => { const v = village({ mushrooms: [RED], shown: ['cart'] }); tap(v, ON_CART); run(v, 2.6); return v }],
  ['a hat pulled off a gnome', () => { const v = village(); carry(v, { x: SEATS.baker.x, y: SEATS.baker.y - 100 }, { x: SEATS.baker.x, y: SEATS.baker.y - 180 }); run(v, 0.2); return v }],
  ['a hat pressed down over a gnome\'s eyes', () => { const v = village(); v.press({ x: SEATS.baker.x, y: SEATS.baker.y - 100 }); run(v, 1); return v }],
  ['the sun pulled down far enough', () => { const v = village(); carry(v, SUN, { x: SUN.x, y: SUN.y + 100 }); return v }],
  ['water drawn up, and a frog on a dome', () => { const v = village(); carry(v, WATER, { x: WATER.x, y: WATER.y - 120 }); run(v, 0.3); return v }],
  ['a frog on a dome', () => { const v = village(); v.press({ x: 730, y: 740 }); run(v, 1); return v }],
  ['a raft on the stream, a gate on a path and a sneeze in the air', () => {
    const v = village({ mushrooms: [PUFF], paths: [ROW] })
    carry(v, ON_CART, WATER); v.lift()
    carry(v, ON_CART, { x: 920, y: 600 }); v.lift()
    tap(v, { x: PUFF.x, y: PUFF.y - 60 }); run(v, 0.9)
    return v
  }],
]

describe('parked and returned equals saved and loaded', () => {
  it.each(STATES)('%s', (_name, make) => {
    const v = make()
    const kept = stored(v)
    v.rest()
    // Going to rest changes nothing that is kept.
    expect(stored(v)).toEqual(kept)
    expect(seen(v)).toEqual(seen(loaded(v)))
    expect(v.busy).toBe(false)
    expect(v.takeNotes()).toEqual([])
    // And nothing was left behind that goes off later: no sound follows, no scene starts.
    v.takeFired()
    run(v, 2)
    expect(v.takeFired()).toEqual([])
    expect(v.sceneRunning).toBe(false)
  })

  it.each(STATES)('%s: what was stored reads back as itself', (_name, make) => {
    const v = make()
    expect(stored(loaded(v))).toEqual(stored(v))
  })
})

describe('a touch that is taken away does nothing in the child\'s name', () => {
  it('leaves a mushroom standing that was pulled past where it comes out', () => {
    const v = village({ mushrooms: [RED] })
    carry(v, { x: RED.x, y: RED.y - 100 }, { x: RED.x, y: RED.y - 100 - OUT - 30 })
    v.takeNotes()
    v.takeAway()
    expect(v.toSave().mushrooms).toEqual([RED])
    expect(v.show().mushrooms[0].pull).toBe(0)
    expect(v.takeNotes()).toEqual([])
  })

  it('puts a door back where it came from: on the cart, or in its house with the gnome still at home', () => {
    const v = village({ mushrooms: [RED] })
    carry(v, ON_CART, { x: RED.x, y: RED.y - 30 })
    v.takeAway()
    expect(v.toSave().mushrooms[0].door).toBe(false)
    expect(v.show().door).toBeNull()
    expect(v.sceneRunning).toBe(false)
    const lived = village(HOUSES)
    carry(lived, doorOf(lived, 1), { x: 880, y: 620 })
    lived.takeAway()
    expect(lived.toSave().mushrooms[0].door).toBe(true)
    expect(lived.toSave().homes.sneezy).toBe(1)
    expect(lived.show().mushrooms[0].door).toBe(true)
    expect(lived.show().gnomes.sneezy.where).toBe('home')
  })

  it('does not bring the night, send a door, send a gnome out or roll a path away', () => {
    const sun = village()
    carry(sun, SUN, { x: SUN.x, y: SUN.y + 100 })
    sun.takeAway()
    expect(sun.toSave().night).toBe(false)
    expect(sun.show().sun.y).toBe(SUN.y)
    const tapped = village()
    tapped.press(SUN); tapped.step(FRAME); tapped.takeAway()
    expect(tapped.toSave().night).toBe(false)
    const cart = village({ mushrooms: [RED] })
    cart.press(ON_CART); cart.step(FRAME); cart.takeAway()
    expect(cart.toSave().mushrooms[0].door).toBe(false)
    const door = village({ ...HOUSES, paths: [fromLog(stepAt(RED))] })
    door.press(doorOf(door, 1)); door.step(FRAME); door.takeAway()
    expect(door.sceneRunning).toBe(false)
    const path = village({ paths: [ROW] })
    liftPath(path, { x: 920, y: 600 }, OUT + 40)
    path.takeAway()
    expect(path.toSave().paths).toEqual([ROW])
  })

  it('keeps what the finger had already done: the size it was held to and the pebbles it laid', () => {
    const grown = village()
    grown.press({ x: 900, y: 500 }); run(grown, 0.7)
    const size = grown.toSave().mushrooms[0].size
    expect(size).toBeGreaterThan(3)
    grown.takeAway()
    expect(grown.toSave().mushrooms[0].size).toBe(size)
    const drawn = village()
    carry(drawn, { x: 860, y: 620 }, { x: 1000, y: 620 })
    const laid = drawn.toSave().paths
    drawn.takeAway()
    expect(drawn.toSave().paths).toEqual(laid)
  })

  it('starts no showing that is owed: the cart waits for a finger the child lifts', () => {
    const v = new Village(freshSave(3), 1)
    v.press(WATER); v.step(FRAME); v.takeAway()
    run(v, 2)
    expect(v.sceneRunning).toBe(false)
    expect(v.toSave().shown).toEqual([])
    tap(v, WATER)
    expect(v.sceneRunning).toBe(true)
  })

  it('gives a gnome his hat back without a sound', () => {
    const v = village()
    carry(v, { x: SEATS.baker.x, y: SEATS.baker.y - 100 }, { x: SEATS.baker.x, y: SEATS.baker.y - 180 })
    run(v, 0.2); v.takeNotes()
    v.takeAway()
    expect(v.show().gnomes.baker.hatPull).toBe(0)
    expect(v.show().gnomes.baker.hands).toBe(false)
    expect(v.takeNotes()).toEqual([])
  })
})

describe('nothing is wound up on load', () => {
  it('makes no sound and starts no scene in a loaded village that nobody touches, short of what goes on by itself', () => {
    const v = loaded(village({ ...HOUSES, paths: [fromLog(stepAt(RED))], night: true }))
    v.step(FRAME)
    expect(v.takeNotes()).toEqual([])
    run(v, Math.min(EVERY.snore, EVERY.smoke) - 0.2)
    expect(v.takeNotes()).toEqual([])
    expect(v.sceneRunning).toBe(false)
  })

  it('counts the baker\'s next walk for water from nothing, and not at all under a finger', () => {
    const far = { mushrooms: [{ ...RED, door: true }], paths: [fromLog(stepAt(RED))], homes: { tall: null, sleepy: null, sneezy: null, baker: 1 } }
    const v = loaded(village(far))
    run(v, EVERY.fetch - 0.5)
    expect(v.sceneRunning).toBe(false)
    run(v, 1)
    expect(v.sceneRunning).toBe(true)
    const held = loaded(village(far))
    held.press(WATER)
    run(held, EVERY.fetch + 5)
    expect(held.sceneRunning).toBe(false)
  })

  it('leaves no answer of a thing behind when the thing is pulled out: what follows is the answer to the pull alone', () => {
    const after = (tapFirst: boolean) => {
      const v = village({ mushrooms: [PUFF] })
      if (tapFirst) tap(v, { x: PUFF.x, y: PUFF.y - 60 })
      carry(v, { x: PUFF.x, y: PUFF.y - 60 }, { x: PUFF.x, y: PUFF.y - 60 - OUT - 40 })
      run(v, LOOSEN_S)
      v.takeFired()
      v.lift()
      expect(v.count).toBe(0)
      run(v, 4)
      return v.takeFired()
    }
    expect(after(true)).toEqual(after(false))
  })
})
