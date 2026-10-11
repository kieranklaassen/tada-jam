import { describe, expect, it } from 'vitest'
import { MOST_WORKERS, ROOM, aired, chambers, kingdom, rooms } from './chambers'
import { EARTH, OPEN, fromPicture, generate, put } from './ground'

// In these pictures the mouth is the open cell in the top row.
const mouthOf = (picture: string[]) => [picture[0].indexOf('.')]

describe('rooms', () => {
  it('finds a clear block four wide and three high', () => {
    const picture = ['XX.XXXXX', '##.#####', '##....##', '##....##', '##....##', 'XXXXXXXX']
    const found = rooms(fromPicture(picture), mouthOf(picture))
    expect(found.length).toBe(1)
    expect(found[0].cells.length).toBe(12)
    expect(found[0].aired).toBe(true)
  })

  const notRooms: { name: string; picture: string[] }[] = [
    { name: 'a tunnel two cells high, however long', picture: ['XX.XXXXXXX', '##.#######', '##........', '##........', 'XXXXXXXXXX'] },
    { name: 'a block three wide', picture: ['XX.XXXXX', '##.#####', '##...###', '##...###', '##...###', 'XXXXXXXX'] },
    { name: 'a block with a lump in it', picture: ['XX.XXXXX', '##.#####', '##....##', '##.s..##', '##....##', 'XXXXXXXX'] },
    { name: 'the shaft', picture: ['X..X', '#..#', '#..#', '#..#', '#..#', 'XXXX'] },
  ]
  for (const row of notRooms) it(`does not take ${row.name} for a room`, () => expect(rooms(fromPicture(row.picture), mouthOf(row.picture))).toEqual([]))

  it('takes blocks that overlap or touch along a side as one room, and blocks apart as two', () => {
    const joined = ['XX.XXXXXXX', '##.#######', '##.......#', '##.......#', '##.......#', '######...#', 'XXXXXXXXXX']
    expect(rooms(fromPicture(joined), mouthOf(joined)).length).toBe(1)
    const apart = ['X.XXXXXXXXXX', '#.##########', '#....##....#', '#....##....#', '#....##....#', 'XXXXXXXXXXXX']
    expect(rooms(fromPicture(apart), mouthOf(apart)).length).toBe(2)
  })
})

describe('the largest kingdom', () => {
  it('holds forty rooms, eight across and five down, each with one cell between it and the next', () => {
    const ground = generate(1)
    for (let y = 1; y < ground.rows - 1; y++) for (let x = 0; x < ground.cols; x++) put(ground, x, y, EARTH)
    for (let row = 0; row < 5; row++) for (let col = 0; col < 8; col++) {
      for (let y = 0; y < ROOM.height; y++) for (let x = 0; x < ROOM.width; x++) put(ground, col * 5 + x, 1 + row * 4 + y, OPEN)
    }
    expect(rooms(ground).length).toBe(40)
    // A ninth across or a sixth down does not fit between the turf and the bedrock.
    expect(8 * (ROOM.width + 1) - 1).toBeLessThanOrEqual(ground.cols)
    expect(9 * (ROOM.width + 1) - 1).toBeGreaterThan(ground.cols)
    expect(5 * (ROOM.height + 1) - 1).toBeLessThanOrEqual(ground.rows - 2)
    expect(6 * (ROOM.height + 1) - 1).toBeGreaterThan(ground.rows - 2)
  })
})

describe('chambers of the kingdom', () => {
  const sealed = ['XX.XXXXX', '##.#####', '########', '##....##', '##....##', '##....##', 'XXXXXXXX']

  it('does not count a room that air does not reach', () => {
    const ground = fromPicture(sealed)
    expect(rooms(ground, [2]).length).toBe(1)
    expect(chambers(ground, [2])).toEqual([])
  })

  it('counts it again once a way is opened, however narrow', () => {
    const ground = fromPicture(sealed)
    put(ground, 2, 2, OPEN)
    expect(chambers(ground, [2]).length).toBe(1)
  })

  it('follows air through open cells only', () => {
    const ground = fromPicture(['X.X', '#.#', '#m#', '#.#', 'XXX'])
    const air = aired(ground, [1])
    expect([air[1], air[4], air[7], air[10]]).toEqual([1, 1, 0, 0])
  })
})

describe('the kingdom that follows from the ground', () => {
  it('has no chamber, no worker and no queen room in a new nest', () => {
    const k = kingdom(generate(1))
    expect([k.chambers.length, k.workers, k.queenRoom]).toEqual([0, 0, null])
    expect(k.hollow).toBeGreaterThan(0)
    expect(k.hollow).toBeLessThan(0.02)
  })

  it('gives two workers a chamber, puts the queen in the largest, and grows the hill with what is dug', () => {
    const ground = generate(1)
    const before = kingdom(ground).hollow
    for (let y = 2; y <= 4; y++) for (let x = 21; x <= 24; x++) put(ground, x, y, OPEN)
    for (let y = 10; y <= 13; y++) for (let x = 17; x <= 22; x++) put(ground, x, y, OPEN)
    for (let y = 4; y <= 9; y++) put(ground, 20, y, OPEN)
    const k = kingdom(ground)
    expect(k.chambers.length).toBe(2)
    expect(k.workers).toBe(4)
    expect(k.chambers[k.queenRoom!].cells.length).toBe(24)
    expect(k.hollow).toBeGreaterThan(before)
  })

  it('stops the crowd of workers at sixteen', () => {
    const ground = generate(1)
    for (let n = 0; n < 7; n++) for (let y = 2; y <= 4; y++) for (let x = n * 5; x < n * 5 + 4; x++) put(ground, x, y, OPEN)
    for (let n = 0; n < 7; n++) for (let y = 14; y <= 16; y++) for (let x = n * 5; x < n * 5 + 4; x++) put(ground, x, y, OPEN)
    for (let x = 0; x < 40; x++) { put(ground, x, 5, OPEN); put(ground, x, 13, OPEN) }
    for (let y = 1; y <= 13; y++) put(ground, 19, y, OPEN)
    const k = kingdom(ground)
    expect(k.chambers.length).toBeGreaterThan(8)
    expect(k.workers).toBe(MOST_WORKERS)
  })
})
