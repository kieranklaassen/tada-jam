import { describe, expect, it } from 'vitest'
import { asSaved, canPickUp, dig, digAlong, mouthful, pickUp, putBack, setDown } from './build'
import { EARTH, LUMPS, MUD, OPEN, ROCK, SAND, STONE, at, clone, count, equal, fromPicture, generate, settle, toPicture } from './ground'

describe('digging', () => {
  it('bites the two-by-two block whose middle is nearest the finger', () => {
    expect(mouthful(2.9, 3.2)).toEqual([{ x: 2, y: 2 }, { x: 3, y: 2 }, { x: 2, y: 3 }, { x: 3, y: 3 }])
  })

  it('opens earth, which is gone for good', () => {
    const ground = fromPicture(['####', '####', '####', 'XXXX'])
    const answer = dig(ground, 2, 1)
    expect(toPicture(ground)).toEqual(['#..#', '#..#', '####', 'XXXX'])
    expect(answer.dug.sort((a, b) => a - b)).toEqual([1, 2, 5, 6])
    expect(answer.met).toEqual([])
  })

  const unbitten: { name: string; picture: string[]; met: number[] }[] = [
    { name: 'sand', picture: ['ss', 'ss', 'XX'], met: [SAND] },
    { name: 'mud', picture: ['mm', 'mm', 'XX'], met: [MUD] },
    { name: 'stone', picture: ['oo', 'oo', 'XX'], met: [STONE] },
    { name: 'rock', picture: ['XX', 'XX', 'XX'], met: [ROCK] },
  ]
  for (const row of unbitten) {
    it(`does not bite ${row.name}: nothing changes, and the dig is still answered`, () => {
      const ground = fromPicture(row.picture)
      const before = clone(ground)
      const answer = dig(ground, 1, 1)
      expect(equal(ground, before)).toBe(true)
      expect(answer.dug).toEqual([])
      expect(answer.met).toEqual(row.met)
    })
  }

  it('says what it met beside what it dug', () => {
    const ground = fromPicture(['#s', 'o#', 'XX'])
    const answer = dig(ground, 1, 1)
    expect(answer.dug.length).toBe(2)
    expect(answer.met.sort()).toEqual([SAND, STONE])
  })

  it('digs a tunnel along a drag and no further than the finger went', () => {
    const ground = fromPicture(['########', '########', '########', '########', 'XXXXXXXX'])
    digAlong(ground, 1, 2, 5, 2)
    expect(toPicture(ground)).toEqual(['########', '......##', '......##', '########', 'XXXXXXXX'])
  })

  it('never opens the turf or the bedrock of a nest, however the finger drags', () => {
    const ground = generate(4)
    digAlong(ground, 0, 0, 40, 0.4)
    digAlong(ground, 0, 20.6, 40, 21)
    for (let x = 0; x < ground.cols; x++) {
      expect(at(ground, x, 0)).toBe(x === 19 || x === 20 ? OPEN : ROCK)
      expect(at(ground, x, 20)).toBe(ROCK)
    }
  })

  it('makes and loses no lump, whatever is dug', () => {
    const ground = generate(2)
    const before = LUMPS.map((kind) => count(ground, kind))
    for (let n = 0; n < 40; n++) digAlong(ground, (n * 7) % 40, 1 + ((n * 5) % 19), (n * 11) % 40, 1 + ((n * 3) % 19))
    settle(ground)
    expect(LUMPS.map((kind) => count(ground, kind))).toEqual(before)
  })
})

describe('carrying and setting down', () => {
  it('picks up a lump that has open ground beside it, and leaves its cell open', () => {
    const ground = fromPicture(['.s#', '###', 'XXX'])
    expect(canPickUp(ground, 1, 0)).toBe(true)
    expect(pickUp(ground, 1, 0)).toEqual({ kind: SAND, from: 1 })
    expect(at(ground, 1, 0)).toBe(OPEN)
  })

  it('does not pick up earth, rock, open ground or a lump buried on all four sides', () => {
    const ground = fromPicture(['#####', '##o##', '#.#X#', 'XXXXX'])
    const before = clone(ground)
    for (const [x, y] of [[0, 0], [2, 1], [1, 2], [3, 2]]) expect(pickUp(ground, x, y)).toBeNull()
    expect(equal(ground, before)).toBe(true)
  })

  it('sets a lump down in the open cell nearest the finger', () => {
    const ground = fromPicture(['.....', '.....', 'XXXXX'])
    expect(setDown(ground, { kind: STONE, from: 0 }, 3.4, 1.6)).toBe(8)
    expect(at(ground, 3, 1)).toBe(STONE)
  })

  it('sets it beside a full cell when the finger is on one, within reach', () => {
    const ground = fromPicture(['#####', '#.###', 'XXXXX'])
    expect(setDown(ground, { kind: MUD, from: 0 }, 3.5, 1.5)).toBe(6)
  })

  it('sets nothing down where there is no room in reach, and nothing in the top row', () => {
    const full = fromPicture(['#####', '#####', 'XXXXX'])
    expect(setDown(full, { kind: MUD, from: 0 }, 2.5, 0.5)).toBeNull()
    const mouth = fromPicture(['..', '##', 'XX'])
    const before = clone(mouth)
    expect(setDown(mouth, { kind: SAND, from: 0 }, 0.5, 0.5)).toBeNull()
    expect(equal(mouth, before)).toBe(true)
  })

  it('puts a lump back in the cell it came from', () => {
    const ground = fromPicture(['###', '.o#', '###', 'XXX'])
    const before = clone(ground)
    const carried = pickUp(ground, 1, 1)!
    putBack(ground, carried)
    expect(equal(ground, before)).toBe(true)
  })

  it('puts it back on top when sand has poured into its cell meanwhile', () => {
    const ground = fromPicture(['#.#', '#s#', '#o#', '#.#', 'XXX'])
    const carried = pickUp(ground, 1, 2)!
    settle(ground)
    expect(toPicture(ground)).toEqual(['#.#', '#.#', '#.#', '#s#', 'XXX'])
    putBack(ground, carried)
    expect(toPicture(ground)).toEqual(['#.#', '#.#', '#o#', '#s#', 'XXX'])
  })

  it('is saved with the lump back where it came from and nothing in the air', () => {
    const ground = fromPicture(['#.#', '#s#', '#o#', '#.#', 'XXX'])
    const whole = LUMPS.map((kind) => count(ground, kind))
    const carried = pickUp(ground, 1, 2)!
    const saved = asSaved(ground, carried)
    expect(LUMPS.map((kind) => count(saved, kind))).toEqual(whole)
    // Earth holds the stone on both sides, so the save is the ground as it was before the lump was picked.
    expect(toPicture(saved)).toEqual(['#.#', '#s#', '#o#', '#.#', 'XXX'])
    // The ground in play is not changed by working out what a save holds.
    expect(at(ground, 1, 2)).toBe(OPEN)
    expect(count(ground, EARTH)).toBe(8)
  })
})
