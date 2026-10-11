import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { rocketPenguinManifest } from './manifest'
import { deserialize, freshSave, serialize, type Save } from './save'
import { STATE_VERSION } from './state'
import { newToy, playHome, pullAndLetGo, pullAt } from './testing'
import { CATAPULT } from './world'

const stored = (save: Save): unknown => JSON.parse(JSON.stringify(serialize(save)))

describe('what the toy saves', () => {
  it('starts every first visit the same, whatever the age: in the one place, with no ring', () => {
    const [youngest, oldest] = rocketPenguinManifest.ageBand
    for (const age of [null, 2, youngest - 1, youngest, oldest, oldest + 1, 40]) expect(freshSave(age)).toEqual({ v: STATE_VERSION, position: 'kit', finished: false, bolted: [], last: null, eating: null, rod: 'fresh' })
    expect(LADDER).toEqual(['kit'])
  })

  it('round-trips through storage', () => {
    const save: Save = { ...freshSave(null), bolted: ['springs', 'fish'], last: { x: -84, y: 58 }, eating: { who: 'walrus', fish: 'frozen' }, rod: 'wet' }
    expect(deserialize(stored(save))).toEqual(save)
    expect(deserialize(stored(freshSave(null)))).toEqual(freshSave(null))
  })

  it('holds exactly the fields the sheet lists', () => {
    expect(Object.keys(stored(freshSave(null)) as object).sort()).toEqual(['bolted', 'eating', 'finished', 'last', 'position', 'rod', 'v'])
  })

  it.each([
    ['fresh', ['fish'], 'fresh', 'fresh'],
    ['wet', ['fish'], 'wet', 'wet'],
    ['frozen', ['rocket', 'fish'], 'frozen', 'frozen'],
    ['missing', ['fish'], undefined, 'fresh'],
    ['a state there is not', ['fish'], 'eaten', 'fresh'],
    ['not a name', ['fish'], { fish: 'wet' }, 'fresh'],
    ['a number', ['fish'], 2, 'fresh'],
    ['frozen with no rod bolted on', ['wings'], 'frozen', 'fresh'],
    ['wet with nothing bolted on', [], 'wet', 'fresh'],
  ])('reads the fish on the rod that is %s, each as itself or as fresh, and keeps the rest', (_, bolted, rod, read) => {
    const raw = { ...(stored({ ...freshSave(null), last: { x: -40, y: 30 } }) as object), bolted, rod }
    const save = deserialize(raw)
    expect(save.rod).toBe(read)
    expect(save.bolted).toEqual(bolted)
    expect(save.last).toEqual({ x: -40, y: 30 })
    // What is written is read back the same.
    expect(deserialize(stored(save))).toEqual(save)
  })

  it.each([
    ['missing', undefined, []],
    ['not a list', 'rocket', []],
    ['a record', { rocket: true }, []],
    ['an unknown part', ['rocket', 'anchor'], ['rocket']],
    ['a repeat', ['wings', 'wings', 'fish'], ['wings', 'fish']],
    ['more than two', ['fish', 'rocket', 'wings', 'balloon'], ['fish', 'rocket']],
    ['not names', [1, null, 'umbrella', { id: 'fish' }], ['umbrella']],
  ])('reads bolted parts that are %s part by part, and keeps the rest', (_, bolted, read) => {
    expect(deserialize({ v: STATE_VERSION, position: 'kit', finished: false, bolted, last: { x: -5, y: 9 }, eating: { who: 'chick', fish: 'wet' } })).toEqual({ ...freshSave(null), bolted: read, last: { x: -5, y: 9 }, eating: { who: 'chick', fish: 'wet' } })
  })

  it.each([
    ['missing', undefined],
    ['a name', 'chick'],
    ['a list', ['chick', 'fresh']],
    ['a friend there is not', { who: 'gull', fish: 'fresh' }],
    ['a fish there is not', { who: 'chick', fish: 'eaten' }],
    ['half of it', { who: 'puffin' }],
  ])('reads an eating that is %s as nobody eating, and keeps the rest', (_, eating) => {
    expect(deserialize({ v: STATE_VERSION, position: 'kit', finished: false, bolted: ['balloon'], last: null, eating })).toEqual({ ...freshSave(null), bolted: ['balloon'] })
  })

  it('writes only what it would read: a save made by hand is repaired on its way out too', () => {
    const odd = { ...freshSave(null), bolted: ['fish', 'fish', 'rocket', 'wings'], eating: { who: 'walrus', fish: 'wet', more: 1 } } as unknown as Save
    expect(serialize(odd)).toEqual({ ...freshSave(null), bolted: ['fish', 'rocket'], eating: { who: 'walrus', fish: 'wet' } })
  })

  it.each([
    ['nothing', undefined],
    ['null', null],
    ['a string', 'last'],
    ['a number', 3],
    ['an array', [{ x: 1, y: 2 }]],
    ['a later version', { v: STATE_VERSION + 1, position: 'kit', finished: false, last: { x: -10, y: 10 } }],
    ['no version', { position: 'kit', last: { x: -10, y: 10 } }],
  ])('gives a fresh save for %s', (_, raw) => {
    expect(deserialize(raw, null)).toEqual(freshSave(null))
  })

  it.each([
    ['missing', undefined],
    ['null', null],
    ['a string', 'left'],
    ['an array', [-10, 10]],
    ['half a point', { x: -10 }],
    ['not numbers', { x: '-10', y: '10' }],
    ['not finite', { x: Number.NaN, y: 4 }],
    ['infinite', { x: -10, y: Number.POSITIVE_INFINITY }],
    ['further than the bands reach', { x: -900, y: 40 }],
  ])('reads a ring that is %s as no ring, and keeps the rest', (_, last) => {
    expect(deserialize({ v: STATE_VERSION, position: 'kit', finished: false, last })).toEqual(freshSave(null))
  })

  it('rounds the ring to whole units, reading and writing', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'kit', finished: false, last: { x: -84.4, y: 57.6 } }).last).toEqual({ x: -84, y: 58 })
    expect(serialize({ ...freshSave(null), last: { x: -84.4, y: 57.6 } }).last).toEqual({ x: -84, y: 58 })
  })

  it('keeps no mark of a finished cycle, since the game judges none', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'kit', finished: true, last: null }).finished).toBe(false)
    expect(serialize({ ...freshSave(null), finished: true }).finished).toBe(false)
  })

  it('reads a position the game does not have as the one place', () => {
    expect(deserialize({ v: STATE_VERSION, position: 'somewhere-else', finished: false, last: { x: -5, y: 9 } })).toEqual({ ...freshSave(null), last: { x: -5, y: 9 } })
  })

  it('reads back every release the catapult allows', () => {
    for (let degrees = -180; degrees < 180; degrees += 15) for (const reach of [10, 60, 130, CATAPULT.reach]) {
      const played = newToy()
      pullAndLetGo(played, pullAt(degrees, reach))
      if (played.save.last === null) continue
      expect(deserialize(stored(played.save)).last, `${degrees}° at ${reach}`).toEqual(played.save.last)
    }
  })

  it('stays a few hundred bytes at most, however long it is played', () => {
    const played = newToy(1, { ...freshSave(null), bolted: ['umbrella', 'springs'], eating: { who: 'walrus', fish: 'frozen' } })
    for (let n = 0; n < 12; n++) {
      pullAndLetGo(played, pullAt(20 + n * 5, 120 + n * 5))
      playHome(played)
    }
    expect(JSON.stringify(stored(played.save)).length).toBeLessThan(300)
  })
})
