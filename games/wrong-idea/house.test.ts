import { describe, expect, it } from 'vitest'
import { exampleIn, freshHouse, ideaOf, isTidy, put, take, type House } from './house'
import { fits, learn } from './learner'
import { deserialize, fresh, serialize } from './save'
import { PLACES, THINGS, thingOf, type Place, type ThingId } from './things'
import { WISHES, firstWish, isMet, nextWish } from './wishes'
import { makeRng, below, pick } from './rng'

const into = (place: Place, ...ids: ThingId[]): House => ids.reduce((house, id) => put(house, id, place), freshHouse())
const inside = (house: House, place: Place) => THINGS.filter((one) => house.at[one.id] === place).map((one) => one.id).sort()
const fitting = (test: (one: (typeof THINGS)[number]) => boolean) => THINGS.filter(test).map((one) => one.id).sort()
const light = THINGS.filter((one) => !one.heavy).map((one) => one.id)

describe('his idea', () => {
  it('follows the sheet, row by row', () => {
    expect(learn(['red-sock'], [])).toEqual({ colour: 'red' })
    expect(learn(['red-sock', 'blue-sock'], [])).toEqual({ kind: 'sock' })
    expect(learn(['red-sock', 'red-hat'], [])).toEqual({ colour: 'red' })
    expect(learn(['blue-sock', 'red-hat'], [])).toEqual({ spots: true })
    expect(learn(['blue-sock', 'hen'], [])).toEqual({ colour: 'blue', spots: true })
    expect(learn(['cat', 'piglet'], [])).toEqual({ alive: true })
    expect(learn(['red-sock', 'yellow-pot'], [])).toEqual({})
    expect(learn(['red-sock'], ['king'])).toEqual({ kind: 'sock' })
    expect(learn(['red-sock'], ['king', 'blue-sock'])).toEqual({ colour: 'red', kind: 'sock' })
    expect(learn([], [])).toBeNull()
  })
  it('is the same whatever order two things came in, and always fits both', () => {
    for (const a of light) for (const b of light) {
      if (a === b) continue
      const idea = learn([a, b], [])!
      expect(learn([b, a], [])).toEqual(idea)
      expect(fits(idea, thingOf(a)) && fits(idea, thingOf(b))).toBe(true)
    }
  })
  it('gives many different results from two things, every kind of idea among them', () => {
    const results = new Set<string>()
    for (const a of light) for (const b of light) if (a < b) results.add(JSON.stringify(learn([a, b], [])))
    for (const want of [{}, { alive: true }, { spots: true }, { kind: 'hat' }, { colour: 'blue', spots: true }]) expect(results).toContain(JSON.stringify(want))
    expect(results.size).toBe(10)
  })
})

describe('the house', () => {
  it('a red sock in the soup brings everything red, the king in his cape too; a blue one makes it socks', () => {
    const red = into('soup', 'red-sock')
    expect(inside(red, 'soup')).toEqual(fitting((one) => one.colour === 'red'))
    expect(red.at.king).toBe('soup')
    expect(red.butler).toBeNull()
    expect(inside(put(red, 'blue-sock', 'soup'), 'soup')).toEqual(['blue-sock', 'red-sock', 'yellow-sock'])
  })
  it('two with nothing in common bring everything, and the butler', () => {
    const all = into('bath', 'red-sock', 'yellow-pot')
    expect(inside(all, 'bath')).toHaveLength(THINGS.length)
    expect(all.butler).toBe('bath')
  })
  it('two animals bring everyone alive, the butler too', () => {
    const alive = into('bed', 'cat', 'piglet')
    expect(inside(alive, 'bed')).toEqual(fitting((one) => one.alive))
    expect(alive.butler).toBe('bed')
  })
  it('the king pulled out makes it socks; pulled out of everything he alone is spared', () => {
    expect(inside(take(into('soup', 'red-sock'), 'king'), 'soup')).toEqual(['blue-sock', 'red-sock', 'yellow-sock'])
    const spared = take(into('soup', 'red-sock', 'yellow-pot'), 'gran')
    expect(inside(spared, 'soup')).toHaveLength(THINGS.length - 1)
    expect(spared.at.gran).toBe('home')
  })
  it("never moves what the child put somewhere, and gives a thing back when the later idea lets go of it", () => {
    const two = put(into('soup', 'red-sock'), 'red-hat', 'bath')
    expect(two.at['red-sock']).toBe('soup')
    expect(two.at.king).toBe('bath')
    expect(take(two, 'red-hat').at.king).toBe('soup')
  })
  it('the last example pulled out takes the idea with it, and putting a spared thing back unsays it', () => {
    expect(isTidy(take(into('soup', 'red-sock'), 'red-sock'))).toBe(true)
    const spared = take(into('soup', 'red-sock', 'yellow-pot'), 'hen')
    const again = put(spared, 'hen', 'soup')
    expect(again.nots.soup).toEqual([])
    expect(exampleIn(again, 'hen')).toBe('soup')
    expect(isTidy(freshHouse())).toBe(true)
  })
  it('putting a thing where it is is a put: an example, or one already', () => {
    const red = into('soup', 'red-sock')
    expect(put(red, 'red-sock', 'soup')).toEqual(red)
    expect(ideaOf(put(red, 'piglet', 'soup'), 'soup')).toEqual({ colour: 'red' })
  })
})

/** Every move the child has: a light thing from home, anything once it is in a place, and a pull. */
function moves(house: House): House[] {
  return THINGS.flatMap((one) => {
    const home = house.at[one.id] === 'home'
    return [
      ...(home && one.heavy ? [] : PLACES.filter((place) => house.at[one.id] !== place).map((place) => put(house, one.id, place))),
      ...(home ? [] : [take(house, one.id)]),
    ]
  })
}

describe('the wishes', () => {
  it('each can be met from a tidy house in at most three moves, and some need more than one', { timeout: 30000 }, () => {
    const need = WISHES.map((wish) => {
      const start = freshHouse()
      if (moves(start).some((house) => isMet(wish, house))) return 1
      const second = moves(start).flatMap(moves)
      if (second.some((house) => isMet(wish, house))) return 2
      return second.slice(0, 3000).some((house) => moves(house).some((next) => isMet(wish, next))) ? 3 : 99
    })
    expect(need).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3].map((most, i) => Math.min(most, need[i])))
    expect(Math.max(...need)).toBeGreaterThan(1)
  })
  it('the next wish is never one already true', () => {
    expect(isMet(WISHES[nextWish(0, into('soup', 'red-sock'))], into('soup', 'red-sock'))).toBe(false)
    expect(firstWish(null)).toBe(0)
    expect(firstWish(3)).toBe(0)
    expect(firstWish(9)).toBe(3)
  })
  it('have ids of their own', () => expect(new Set(WISHES.map((wish) => wish.id)).size).toBe(WISHES.length))
})

describe('the save', () => {
  it('gives back any house that play reaches, and stays small', () => {
    const rng = makeRng(7)
    for (let run = 0; run < 60; run++) {
      let house = freshHouse()
      for (let step = 0; step < 12; step++) house = pick(rng, moves(house))
      const saved = { ...fresh(null), house, wish: below(rng, WISHES.length), dreaming: false, begun: true }
      const text = JSON.stringify(serialize(saved))
      expect(deserialize(JSON.parse(text), null)).toEqual(saved)
      expect(text.length).toBeLessThan(4096)
    }
  })
  it('a wish the outcome meets is saved as met, and one it does not as still dreamed', () => {
    const start = { ...fresh(null), dreaming: true, begun: true }
    const met = serialize({ ...start, house: into('soup', 'red-sock') })
    expect([met.wish, met.dreaming]).toEqual(['queen-bath', false])
    const not = serialize({ ...start, house: into('soup', 'blue-sock') })
    expect([not.wish, not.dreaming]).toEqual(['king-soup', true])
  })
  it('opens on anything', () => {
    for (const raw of [null, 3, 'x', [], {}, { v: 2 }, { v: 1 }, { v: 1, house: 4 }, { v: 1, house: { examples: { soup: ['nobody', 'butler', 'red-sock', 'red-sock', 5], bed: ['red-sock'], bath: 'x' }, nots: { bath: ['king'], soup: 7 }, order: ['moon', 'soup', 'soup'] }, wish: 'gone' }]) {
      const saved = deserialize(raw, 4)
      expect(saved.v).toBe(1)
      expect(THINGS.every((one) => saved.house.at[one.id] !== undefined)).toBe(true)
      expect(saved.house.order).toHaveLength(3)
      expect(saved.house.nots.bath).toEqual([])
    }
  })
})

describe('out is out', () => {
  it('an example pulled out is never fetched straight back', () => {
    const movable = THINGS.filter((one) => !one.heavy)
    for (const place of PLACES) for (const a of movable) for (const b of movable) {
      if (a.id === b.id) continue
      expect(take(put(put(freshHouse(), a.id, place), b.id, place), a.id).at[a.id], `${a.id} out from ${b.id}`).toBe('home')
    }
  })
})
