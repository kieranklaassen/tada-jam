import { describe, expect, it } from 'vitest'
import { ANIMALS, LOVERS, SNACKS, TASTES, THINGS, WISHES, coatAfter, hates, nextWish, wishAt, type Animal } from './things'
import { bait, columnOf, feed, freshTown, heights, hide, onGround, putOn, ring, snackHome, stays, sweep, tallest, tapAnimal, toGround, turn, tapSnack, type Town } from './town'
import { makeRng } from './rng'

const at = (id: string): Town => ({ ...freshTown(null), position: id, count: wishAt(id).count, ballot: [...wishAt(id).ballot] })

/** What must hold after any act. */
function check(town: Town): void {
  const all = town.columns.flat()
  expect(new Set(all).size).toBe(all.length)
  if (town.hidden) expect(all).not.toContain(town.hidden)
  for (const who of all) {
    expect(ANIMALS.indexOf(who)).toBeLessThan(town.count)
    expect(stays(town, who, columnOf(town, who))).toBe(true)
  }
  if (town.finished) expect(onGround(town)).toEqual([])
  expect(new Set(town.ballot).size).toBe(3)
  for (const s of SNACKS) if (town.snacks[s] !== null) expect(town.ballot[town.snacks[s]!]).not.toBeNull()
}

describe('tastes', () => {
  it('rank every thing once, and every snack has a lover in the first town', () => {
    for (const who of ANIMALS) expect([...TASTES[who]].sort()).toEqual([...THINGS].sort())
    for (const s of SNACKS) expect(LOVERS[s].some((who) => ANIMALS.indexOf(who) < WISHES[0].count)).toBe(true)
    for (const t of THINGS) expect(ANIMALS.some((who) => hates(who, t))).toBe(true)
  })
})

describe('the vote', () => {
  it('takes everyone to what they like and makes the tallest happen to all', () => {
    const town = freshTown(null)
    const { result } = ring(town)
    expect(heights(town)).toEqual([1, 3, 0])
    expect(result).toMatchObject({ won: ['mud'], met: true })
    expect(town.coats.elephant).toBe('muddy')
    expect(town).toMatchObject({ finished: true, fresh: true, position: 'one-over' })
    check(town)
  })
  it('is turned by one animal', () => {
    const town = at('one-over')
    for (const who of onGround(town)) tapAnimal(town, who)
    expect(heights(town)).toEqual([3, 2, 0])
    putOn(town, 'pig', 1)
    expect(ring(town).result).toMatchObject({ won: ['sleep'], met: true })
  })
  it('makes both happen when they are level', () => {
    const town = at('both-at-once')
    expect(ring(town).result!.won).toEqual(['fly', 'sleep'])
    expect(coatAfter('clean', ['bath', 'mud'])).toBe('fizzy')
  })
  it('leaves the hidden one out of the graph and does it to it all the same', () => {
    const town = freshTown(null)
    hide(town, 'pig')
    ring(town)
    expect(town.columns.flat()).not.toContain('pig')
    expect(town.coats.pig).toBe('muddy')
    hide(town, 'cat')
    check(town)
  })
  it('keeps the graph until the next touch, and the next ballot comes in with it', () => {
    const town = freshTown(null)
    ring(town)
    const graph = JSON.stringify(town.columns)
    expect(JSON.stringify(town.columns)).toBe(graph)
    const events = ring(town).events
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['sweep', 'turn', 'arrive']))
    expect(town).toMatchObject({ finished: false, fresh: false, count: 5, ballot: ['dance', 'sleep', null] })
    expect(town.columns.flat()).toEqual([])
    expect(sweep(town)).toEqual([])
  })
  it('asks the same again when the wish was not met', () => {
    const town = at('one-over')
    ring(town)
    expect(town).toMatchObject({ finished: true, fresh: false, position: 'one-over' })
    const graph = JSON.stringify(town.columns)
    expect(ring(town).events).toEqual([{ type: 'return' }])
    expect(town.ballot).toEqual(['dance', 'sleep', null])
    // As it stood, so that one thing can be changed.
    expect(JSON.stringify(town.columns)).toBe(graph)
    putOn(town, 'pig', 1)
    expect(ring(town).result!.met).toBe(true)
  })
})

describe('meddling', () => {
  it('springs back off what it cannot stand, unless a snack lies there, and goes when the snack goes', () => {
    const town = freshTown(null)
    const out = putOn(town, 'cat', 0)
    expect(out[0]).toMatchObject({ type: 'bounce', who: 'cat', from: 0 })
    expect(columnOf(town, 'cat')).toBe(1)
    bait(town, 'cheese', 0)
    expect(columnOf(town, 'cat')).toBe(0)
    expect(columnOf(town, 'mouse')).toBe(0)
    putOn(town, 'mouse', 1)
    expect(columnOf(town, 'mouse')).toBe(1)
    snackHome(town, 'cheese')
    expect(columnOf(town, 'cat')).toBe(1)
    check(town)
  })
  it('drops everyone above by one square', () => {
    const town = freshTown(null)
    for (const who of ['pig', 'cat', 'mouse'] as const) tapAnimal(town, who)
    const out = toGround(town, 'pig')
    expect(out.filter((e) => e.type === 'fall')).toHaveLength(2)
    expect(town.columns[1]).toEqual(['cat', 'mouse'])
  })
  it('goes round by taps: up, across what it can stand, down', () => {
    const town = at('third-column')
    const rounds = [0, 1, 2, 3].map(() => { tapAnimal(town, 'mouse'); return columnOf(town, 'mouse') })
    expect(rounds).toEqual([2, 0, 1, -1])
    expect([0, 1, 2].map(() => { tapAnimal(town, 'pig'); return columnOf(town, 'pig') })).toEqual([1, 2, -1])
  })
  it('sends a snack along by taps, and home', () => {
    const town = at('one-over')
    expect([0, 1, 2].map(() => { tapSnack(town, 'bun'); return town.snacks.bun })).toEqual([0, 1, null])
  })
  it('holds one in the basket', () => {
    const town = freshTown(null)
    hide(town, 'pig')
    hide(town, 'cat')
    expect(town.hidden).toBe('cat')
    expect(onGround(town)).toContain('pig')
    tapAnimal(town, 'cat')
    expect(town.hidden).toBeNull()
  })
  it('turns a picture through everything not on show, and only the third can be shut', () => {
    const town = freshTown(null)
    for (const who of onGround(town)) tapAnimal(town, who)
    const seen = [0, 1, 2, 3].map(() => { turn(town, 0); check(town); return town.ballot[0] })
    expect(new Set(seen)).toEqual(new Set(['dance', 'fly', 'sleep', 'bath']))
    const third = [0, 1, 2, 3].map(() => { turn(town, 2); check(town); return town.ballot[2] })
    expect(third).toContain(null)
    expect(third.filter(Boolean)).toHaveLength(3)
  })
  it('feeds a lover, and the others spit', () => {
    const town = freshTown(null)
    expect(feed(town, 'bun', 'elephant')[0]).toMatchObject({ type: 'eat' })
    expect(feed(town, 'bun', 'cat')[0]).toMatchObject({ type: 'spit' })
  })
  it('never breaks, whatever is done in whatever order', () => {
    const rng = makeRng(11), pick = <T>(list: readonly T[]): T => list[Math.floor(rng.next() * list.length)]
    const town = freshTown(null)
    for (let i = 0; i < 6000; i++) {
      const who = pick(ANIMALS.slice(0, town.count)), col = Math.floor(rng.next() * 3), snack = pick(SNACKS)
      pick([() => tapAnimal(town, who), () => putOn(town, who, col), () => toGround(town, who), () => hide(town, who), () => bait(town, snack, col), () => snackHome(town, snack), () => feed(town, snack, who), () => turn(town, col), () => ring(town)])()
      check(town)
    }
  })
})

describe('the order', () => {
  it('goes round and comes back', () => {
    let id = WISHES[0].id
    const seen = new Set<string>()
    for (let i = 0; i < 12; i++) { seen.add(id); id = nextWish(id) }
    expect(seen.size).toBe(WISHES.length)
  })
  it('every wish can be met by carrying alone, in at most three moves, and the first with none', () => {
    const moves = WISHES.map((w) => {
      const town = at(w.id)
      for (const who of onGround(town)) tapAnimal(town, who)
      let edge = [town.columns]
      const seen = new Set([JSON.stringify(town.columns.map((c) => [...c].sort()))])
      for (let d = 0; d < 5; d++) {
        const next: Animal[][][] = []
        for (const columns of edge) {
          const t = { ...town, columns: columns.map((c) => [...c]) }
          const won = tallest(t)
          if (won.length === w.wish.length && w.wish.every((x) => won.includes(x))) return d
          for (const who of t.columns.flat()) for (let col = 0; col < 3; col++) {
            const u = { ...t, columns: t.columns.map((c) => [...c]) }
            putOn(u, who, col)
            const key = JSON.stringify(u.columns.map((c) => [...c].sort()))
            if (!seen.has(key)) { seen.add(key); next.push(u.columns) }
          }
        }
        edge = next
      }
      return Infinity
    })
    expect(moves).toEqual([0, 1, 0, 1, 1, 0, 1, 1, 1, 3])
  })
})
