import { describe, expect, it } from 'vitest'
import {
  COLS,
  EARTH,
  LUMPS,
  MOUTH,
  MUD,
  OPEN,
  ROCK,
  ROWS,
  SAND,
  STONE,
  at,
  atRest,
  clone,
  count,
  equal,
  fromPicture,
  generate,
  held,
  settle,
  step,
  toPicture,
} from './ground'

// The ground's rules as small pictures, written before the rules were. In a picture: `.` open, `#` earth, `s` sand,
// `m` mud, `o` stone, `X` rock. The edges of a picture count as rock, as the glass and the frame do.
const rest = (before: string[]): string[] => {
  const ground = fromPicture(before)
  settle(ground)
  return toPicture(ground)
}

describe('sand', () => {
  const cases: { name: string; before: string[]; after: string[] }[] = [
    {
      name: 'set down on a ledge it falls to the floor below',
      before: ['s....', '#....', '#....', 'XXXXX'],
      after: ['.....', '#....', '#s...', 'XXXXX'],
    },
    {
      name: 'the same column between two stones stands',
      before: ['..oso..', '..oso..', '..oso..', '..oso..', 'XXXXXXX'],
      after: ['..oso..', '..oso..', '..oso..', '..oso..', 'XXXXXXX'],
    },
    {
      name: 'it pours into a tunnel dug under it',
      before: ['#sss#', '#...#', '#...#', 'XXXXX'],
      after: ['#...#', '#...#', '#sss#', 'XXXXX'],
    },
    {
      name: 'on one held lump of mud it slides off the open side',
      before: ['.s.', '#m.', '#..', 'XXX'],
      after: ['...', '#m.', '#.s', 'XXX'],
    },
  ]
  for (const row of cases) it(row.name, () => expect(rest(row.before)).toEqual(row.after))

  it('a column four tall with nothing beside it slumps', () => {
    const ground = fromPicture(['...s...', '...s...', '...s...', '...s...', 'XXXXXXX'])
    settle(ground)
    const heights = Array.from({ length: 7 }, (_, x) => [0, 1, 2, 3].filter((y) => at(ground, x, y) === SAND).length)
    expect(Math.max(...heights)).toBeLessThanOrEqual(2)
    for (let x = 1; x < 7; x++) expect(Math.abs(heights[x] - heights[x - 1])).toBeLessThanOrEqual(1)
    expect(count(ground, SAND)).toBe(4)
  })

  it('comes to rest with every step between two columns at most one cell', () => {
    const ground = fromPicture(['....s....', '....s....', '....s....', '....s....', '....s....', '....s....', 'XXXXXXXXX'])
    settle(ground)
    const heights = Array.from({ length: 9 }, (_, x) => [0, 1, 2, 3, 4, 5].filter((y) => at(ground, x, y) === SAND).length)
    for (let x = 1; x < 9; x++) expect(Math.abs(heights[x] - heights[x - 1])).toBeLessThanOrEqual(1)
    expect(count(ground, SAND)).toBe(6)
  })
})

describe('mud', () => {
  const cases: { name: string; before: string[]; after: string[] }[] = [
    { name: 'set against a wall it stays', before: ['#m.', '#..', 'XXX'], after: ['#m.', '#..', 'XXX'] },
    { name: 'set in the open with nothing touching it, it falls', before: ['.....', '..m..', '.....', 'XXXXX'], after: ['.....', '.....', '..m..', 'XXXXX'] },
    { name: 'it hangs from a ceiling', before: ['#####', '..m..', '.....', 'XXXXX'], after: ['#####', '..m..', '.....', 'XXXXX'] },
    { name: 'it holds its shape as a beam between two walls', before: ['#mmm#', '#...#', 'XXXXX'], after: ['#mmm#', '#...#', 'XXXXX'] },
    { name: 'two lumps in the air do not hold each other up', before: ['.....', '.mm..', '.....', 'XXXXX'], after: ['.....', '.....', '.mm..', 'XXXXX'] },
    { name: 'it never slumps', before: ['..m..', '..m..', '..m..', 'XXXXX'], after: ['..m..', '..m..', '..m..', 'XXXXX'] },
  ]
  for (const row of cases) it(row.name, () => expect(rest(row.before)).toEqual(row.after))
})

describe('stone', () => {
  const cases: { name: string; before: string[]; after: string[] }[] = [
    {
      name: 'with nothing under it, it falls straight down to the first thing that bears it and does not slide',
      before: ['..o..', '.....', '..s..', '.....', 'XXXXX'],
      after: ['.....', '.....', '..o..', '..s..', 'XXXXX'],
    },
    {
      name: 'between two borne stones it stays as a lintel when the tunnel is dug under it',
      before: ['.ooo.', '.o.o.', 'XXXXX'],
      after: ['.ooo.', '.o.o.', 'XXXXX'],
    },
    {
      name: 'on sand it falls when the sand is dug away',
      before: ['..o..', '#...#', '#...#', 'XXXXX'],
      after: ['.....', '#...#', '#.o.#', 'XXXXX'],
    },
    {
      name: 'sand beside it does not bear it',
      before: ['#sos#', '##.##', 'XXXXX'],
      after: ['#s.s#', '##o##', 'XXXXX'],
    },
    {
      name: 'it sticks out of a tunnel roof while earth holds both its sides',
      before: ['#o#', '#.#', 'XXX'],
      after: ['#o#', '#.#', 'XXX'],
    },
    {
      name: 'a lintel bears the sand that lies on it',
      before: ['#sss#', '#ooo#', '#o.o#', 'XXXXX'],
      after: ['#sss#', '#ooo#', '#o.o#', 'XXXXX'],
    },
    { name: 'mud under it bears it', before: ['.o.', '#m.', '#..', 'XXX'], after: ['.o.', '#m.', '#..', 'XXX'] },
  ]
  for (const row of cases) it(row.name, () => expect(rest(row.before)).toEqual(row.after))
})

describe('the ground as a whole', () => {
  it('earth and rock never move', () => {
    const before = ['#.#.#', '.....', '#...#', 'XXXXX']
    expect(rest(before)).toEqual(before)
  })

  it('moves a falling lump one cell a step, lowest first', () => {
    const ground = fromPicture(['.o.', '.o.', '...', '...', 'XXX'])
    step(ground)
    expect(toPicture(ground)).toEqual(['...', '.o.', '.o.', '...', 'XXX'])
    expect(atRest(ground)).toBe(false)
    step(ground)
    expect(toPicture(ground)).toEqual(['...', '...', '.o.', '.o.', 'XXX'])
    expect(step(ground)).toEqual([])
    expect(atRest(ground)).toBe(true)
  })

  it('says which cells a step changed', () => {
    const ground = fromPicture(['.s.', '...', 'XXX'])
    expect(step(ground).sort((a, b) => a - b)).toEqual([1, 4])
  })

  it('works out what is held from the rock and the earth outward', () => {
    const ground = fromPicture(['....', '.mm.', '....', '#m..', 'XXXX'])
    const h = held(ground)
    expect([h[5], h[6]]).toEqual([0, 0])
    expect(h[13]).toBe(1)
  })

  it('never makes or loses a lump while it comes to rest', () => {
    const ground = fromPicture(['smosmo', 'osmosm', '......', '.#..#.', '......', 'XXXXXX'])
    const before = LUMPS.map((kind) => count(ground, kind))
    settle(ground)
    expect(LUMPS.map((kind) => count(ground, kind))).toEqual(before)
    expect(atRest(ground)).toBe(true)
  })

  it('gives the same ground for the same moves, cell for cell', () => {
    const play = () => {
      const ground = generate(7)
      for (let x = 4; x < 16; x++) for (const y of [11, 12]) if (at(ground, x, y) === EARTH) ground.cells[y * COLS + x] = OPEN
      settle(ground)
      return ground
    }
    expect(equal(play(), play())).toBe(true)
  })
})

describe('a new nest', () => {
  it('is the same for the same seed and differs for another', () => {
    expect(equal(generate(1), generate(1))).toBe(true)
    expect(equal(generate(1), generate(2))).toBe(false)
  })

  it('is 40 by 21, with turf on top, bedrock below, an open mouth and a short shaft', () => {
    const ground = generate(3)
    expect([ground.cols, ground.rows]).toEqual([COLS, ROWS])
    for (let x = 0; x < COLS; x++) {
      expect(at(ground, x, 0)).toBe(MOUTH.includes(x) ? OPEN : ROCK)
      expect(at(ground, x, ROWS - 1)).toBe(ROCK)
    }
    for (const x of MOUTH) for (const y of [1, 2, 3]) expect(at(ground, x, y)).toBe(OPEN)
  })

  it('lies at rest, with all three materials in it and mud within reach of the shaft', () => {
    for (const seed of [0, 1, 2, 3, 99]) {
      const ground = generate(seed)
      expect(atRest(ground)).toBe(true)
      expect(count(ground, SAND)).toBeGreaterThanOrEqual(40)
      expect(count(ground, MUD)).toBeGreaterThanOrEqual(24)
      expect(count(ground, STONE)).toBeGreaterThanOrEqual(16)
      let near = 0
      for (let y = 1; y <= 7; y++) for (let x = 12; x <= 27; x++) if (at(ground, x, y) === MUD) near++
      expect(near).toBeGreaterThan(0)
    }
  })

  it('is not changed by a copy of it being changed', () => {
    const ground = generate(5)
    const copy = clone(ground)
    copy.cells.fill(OPEN)
    expect(count(ground, EARTH)).toBeGreaterThan(400)
  })
})
