import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { clearAt, legalised } from './ground'
import { GROUND, type P } from './layout'
import { TABLE } from './room'
import { deserialize, firstSeason, freshSaved, freshWorld, serialize, type Saved } from './save'
import { Finger, LAPS } from './script'
import { STATE_VERSION } from './state'
import { createToy, savedOf } from './toy'
import { PLACES, SEASONS, THINGS } from './wood'

const full = (): Saved => ({
  ...freshSaved(6), finished: true, season: 'winter', open: ['log', 'burrow'], rolled: true, wet: ['worm', 'apple'], bitten: true, toad: { at: 'seat', place: 'log' },
  things: { worm: { at: 'path', x: 400, y: 700 }, snail: { at: 'nest' }, feather: { at: 'table', x: 500, y: 600 }, acorn: { at: 'bowl' }, button: { at: 'stone' }, apple: { at: 'hedgehog' } },
})

describe('the saved wood', () => {
  it('age is only a first-visit default: spring under five or with no age, autumn from five, and nothing else differs', () => {
    expect(firstSeason(null)).toBe('spring')
    for (const age of [1, 2, 3, 4]) expect(firstSeason(age)).toBe('spring')
    for (const age of [5, 6, 7, 12, 40]) expect(firstSeason(age)).toBe('autumn')
    expect(freshSaved(null)).toEqual({ v: STATE_VERSION, position: LADDER[0], finished: false, ...freshWorld(null) })
    // Whatever the age, the world is the same but for the season it opens in: nothing is held back from anyone.
    for (const age of [null, 1, 3, 4, 5, 7, 12]) expect({ ...freshSaved(age), season: 'spring' }).toEqual(freshSaved(null))
    // Every season, every place and every thing is in the world of every age, and a saved season wins over the age.
    for (const age of [null, 3, 7]) for (const season of SEASONS) {
      const back = deserialize({ ...full(), season }, age)
      expect(back.season).toBe(season)
      expect(Object.keys(back.things)).toEqual([...THINGS])
    }
    expect(deserialize({ v: STATE_VERSION, season: 'summer' }, 6).season).toBe('summer')
  })

  it('reads back what it wrote', () => {
    const state = full()
    expect(deserialize(JSON.parse(JSON.stringify(serialize(state))), 3)).toEqual(state)
  })

  it('gives a first visit for anything that is not its record', () => {
    for (const raw of [null, undefined, 3, 'wood', [], { v: 0 }, { v: STATE_VERSION + 1, season: 'winter' }, { season: 'winter' }]) expect(deserialize(raw, 4)).toEqual(freshSaved(4))
  })

  it('repairs each field by itself', () => {
    const back = deserialize({
      v: STATE_VERSION, position: 'nowhere', season: 'monsoon', open: ['log', 'log', 'moon', 4, null, 'grass'], rolled: 'yes', wet: ['apple', 'apple', 'cloud', 'worm'], bitten: 1, toad: { at: 'seat', place: 'moon' },
      things: { worm: { at: 'hedgehog' }, snail: { at: 'path', x: 'far', y: 3 }, feather: { at: 'path', x: Infinity, y: 0 }, acorn: { at: 'stone' }, button: { at: 'stone' }, apple: { at: 'moon' }, cloud: { at: 'nest' } },
    }, 6)
    expect(back).toEqual({
      v: STATE_VERSION, position: LADDER[0], finished: false, season: 'autumn', open: ['grass', 'log'], rolled: false, wet: ['worm', 'apple'], bitten: false, toad: { at: 'stone' },
      // Only the apple is worn; a point must be two numbers; one thing lies on the stone.
      things: { worm: { at: 'home' }, snail: { at: 'home' }, feather: { at: 'home' }, acorn: { at: 'stone' }, button: { at: 'home' }, apple: { at: 'home' } },
    })
    expect(deserialize({ v: STATE_VERSION, season: 'winter', open: 'log', rolled: true, things: 7, toad: 'stone' }, null)).toEqual({ ...freshSaved(null), season: 'winter', rolled: true })
  })

  it('puts every point of a damaged save where a thing may lie, and no two things on one point', () => {
    const inBoxes = (at: P): boolean => GROUND.some((box) => at.x >= box.x0 && at.x <= box.x1 && at.y >= box.y0 && at.y <= box.y1)
    const damaged = deserialize({
      v: STATE_VERSION, season: 'summer', open: [...PLACES], toad: { at: 'path', x: -500, y: 3000 },
      things: { worm: { at: 'path', x: 160, y: 652 }, snail: { at: 'path', x: 160, y: 652 }, feather: { at: 'path', x: 3000, y: -900 }, acorn: { at: 'table', x: 0, y: 0 }, button: { at: 'table', x: 0, y: 0 }, apple: { at: 'table', x: 3000, y: 3000 } },
    }, null)
    const made = legalised(damaged), toy = createToy(made, 1)
    for (const thing of ['worm', 'snail', 'feather'] as const) {
      const where = made.things[thing]
      expect(where.at).toBe('path')
      if (where.at === 'path') { expect(inBoxes(where), thing).toBe(true); expect(clearAt(toy, where, thing), thing).toBe(true) }
    }
    const table = (['acorn', 'button', 'apple'] as const).map((thing) => made.things[thing] as { at: 'table'; x: number; y: number })
    for (const where of table) { expect(where.at).toBe('table'); expect(where.x >= TABLE.x0 && where.x <= TABLE.x1 && where.y >= TABLE.y0 && where.y <= TABLE.y1).toBe(true) }
    expect(Math.hypot(table[0].x - table[1].x, table[0].y - table[1].y)).toBeGreaterThan(30)
    expect(made.toad.at).toBe('path')
    // Made legal once, it stays as it is.
    expect(legalised(made)).toEqual(made)
  })

  it('found as left: at every moment of the whole walk the save reads back as it was written, is one the game would write, and is small', () => {
    let looked = 0, largest = 0
    const finger: Finger = new Finger(1, 20, (toy) => {
      looked += 1
      // Often, and at every moment something is in the hand or a scene is under way.
      if (looked % 7 !== 0 && toy.hand === null && toy.scene === null) return
      const saved = savedOf(toy), written = JSON.stringify(serialize({ ...freshSaved(null), ...saved }))
      largest = Math.max(largest, written.length)
      const back = deserialize(JSON.parse(written), 7)
      expect({ season: back.season, open: back.open, rolled: back.rolled, things: back.things, wet: back.wet, bitten: back.bitten, toad: back.toad, finished: back.finished }).toEqual(saved)
      expect(legalised(saved)).toEqual(saved)
      // Opened from that save, nothing is under way: no scene, no motion, nothing in the hand, nothing to be heard.
      const opened = createToy(saved, 5)
      expect(opened.scene).toBeNull()
      expect(opened.hand).toBeNull()
      expect(opened.acts).toEqual({})
      expect(opened.sounds).toEqual([])
    })
    for (const lap of Object.values(LAPS)) lap(finger)
    expect(looked).toBeGreaterThan(10000)
    expect(largest).toBeLessThan(700)
  }, 30000)
})
