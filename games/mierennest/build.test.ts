import { describe, expect, it } from 'vitest'
import { asSaved, canPickUp, dig, digAlong, mouthful, pickUp, setDown } from './build'
import { EARTH, LUMPS, MOUTH, MUD, OPEN, ROCK, SAND, STONE, at, clone, count, equal, fromPicture, generate, settle, toPicture } from './ground'

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
      expect(at(ground, x, 0)).toBe(MOUTH.includes(x) ? OPEN : ROCK)
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
  it('takes a lump the ant can reach by an open way, and leaves the ground as it was', () => {
    const ground = fromPicture(['..s#', '####', 'XXXX'])
    const before = clone(ground)
    expect(canPickUp(ground, { x: 0, y: 0 }, 2, 0)).toBe(true)
    expect(pickUp(ground, { x: 0, y: 0 }, 2, 0)).toEqual({ kind: SAND, from: 2 })
    expect(equal(ground, before)).toBe(true)
  })

  it('does not take earth, rock, open ground, a buried lump, or a lump no open way reaches', () => {
    const ground = fromPicture(['.####.', '.#o#s.', '.#.#X#', 'XXXXXX'])
    const ant = { x: 0, y: 0 }
    for (const [x, y] of [[1, 0], [2, 1], [0, 1], [4, 2], [4, 1]]) expect(pickUp(ground, ant, x, y), `${x},${y}`).toBeNull()
    // The same sand is taken by an ant that stands on its side of the earth.
    expect(pickUp(ground, { x: 5, y: 0 }, 4, 1)).toEqual({ kind: SAND, from: 10 })
  })

  it('keeps bearing what stood on it while it is carried', () => {
    const ground = fromPicture(['#.#.', '#s#.', '#o..', '##..', 'XXXX'])
    const before = clone(ground)
    const carried = pickUp(ground, { x: 2, y: 2 }, 1, 2)!
    expect(carried.kind).toBe(STONE)
    settle(ground)
    expect(equal(ground, before)).toBe(true)
  })

  it('sets the lump down in the open cell where the finger lets go, and the cell it left is open', () => {
    const ground = fromPicture(['.....', '.o...', 'XXXXX'])
    const ant = { x: 0, y: 1 }
    const carried = pickUp(ground, ant, 1, 1)!
    expect(setDown(ground, ant, carried, 3.4, 1.6)).toBe(8)
    expect(toPicture(ground)).toEqual(['.....', '...o.', 'XXXXX'])
  })

  it('lets what stood on it fall once it is set down elsewhere', () => {
    const ground = fromPicture(['#.#.', '#s#.', '#o..', '##..', 'XXXX'])
    const ant = { x: 2, y: 2 }
    const carried = pickUp(ground, ant, 1, 2)!
    expect(setDown(ground, ant, carried, 3.5, 3.5)).toBe(15)
    settle(ground)
    expect(toPicture(ground)).toEqual(['#.#.', '#.#.', '#...', '##so', 'XXXX'])
  })

  const nowhere: { name: string; picture: string[]; ant: [number, number]; lump: [number, number]; drop: [number, number] }[] = [
    { name: 'on earth', picture: ['.s.#', 'XXXX'], ant: [0, 0], lump: [1, 0], drop: [3.5, 0.5] },
    { name: 'on another lump', picture: ['.s.o', 'XXXX'], ant: [0, 0], lump: [1, 0], drop: [3.5, 0.5] },
    { name: 'on itself', picture: ['.s..', 'XXXX'], ant: [0, 0], lump: [1, 0], drop: [1.5, 0.5] },
    { name: 'in the top row, where the mouth is', picture: ['...', '.s.', 'XXX'], ant: [0, 1], lump: [1, 1], drop: [1.5, 0.5] },
    { name: 'in an open cell no open way reaches', picture: ['.s#.', 'XXXX'], ant: [0, 0], lump: [1, 0], drop: [3.5, 0.5] },
    { name: 'outside the ground', picture: ['.s.', 'XXX'], ant: [0, 0], lump: [1, 0], drop: [7, 0.5] },
  ]
  for (const row of nowhere) {
    it(`let go ${row.name}, the lump is back where it came from and nothing has changed`, () => {
      // The pictures stand a row down from the top, so only the case about the top row is in it.
      const ground = fromPicture(row.name.startsWith('in the top') ? row.picture : ['####', ...row.picture].map((r) => r.padEnd(4, '#')))
      const down = row.name.startsWith('in the top') ? 0 : 1
      const before = clone(ground)
      const ant = { x: row.ant[0], y: row.ant[1] + down }
      const carried = pickUp(ground, ant, row.lump[0], row.lump[1] + down)!
      expect(carried).not.toBeNull()
      expect(setDown(ground, ant, carried, row.drop[0], row.drop[1] + down)).toBeNull()
      expect(equal(ground, before)).toBe(true)
    })
  }

  it('is saved with nothing in the air, and working that out does not change the ground in play', () => {
    const ground = fromPicture(['.s.', '...', '...', 'XXX'])
    const saved = asSaved(ground)
    expect(toPicture(saved)).toEqual(['...', '...', '.s.', 'XXX'])
    expect(toPicture(ground)).toEqual(['.s.', '...', '...', 'XXX'])
    expect(count(saved, EARTH)).toBe(0)
  })

  it('makes and loses no lump, however lumps are carried about', () => {
    const ground = generate(6)
    for (let y = 2; y <= 12; y++) for (let x = 5; x <= 34; x++) if (at(ground, x, y) === EARTH) ground.cells[y * ground.cols + x] = OPEN
    settle(ground)
    const before = LUMPS.map((kind) => count(ground, kind))
    const ant = { x: 20, y: 1 }
    let moved = 0
    for (let n = 0; n < 800; n++) {
      const carried = pickUp(ground, ant, (n * 7) % 40, 1 + ((n * 11) % 19))
      if (carried && setDown(ground, ant, carried, ((n * 13) % 40) + 0.5, 1.5 + ((n * 5) % 12)) !== null) moved++
      settle(ground)
    }
    expect(moved).toBeGreaterThan(5)
    expect(LUMPS.map((kind) => count(ground, kind))).toEqual(before)
  })
})
