import { describe, expect, it } from 'vitest'
import { COLS, DRYING_GULPS_PER_S, MOST, MUD_AT, PUDDLE_AT, ROWS, cellAt, cellsAt, centreOf, decode, dry, dryGround, encode, levelAt, levelOf, pour } from './ground'

describe('the ground of a yard', () => {
  it('starts dry everywhere', () => {
    const ground = dryGround()
    expect(ground).toHaveLength(COLS * ROWS)
    expect(ground.every((gulps) => gulps === 0)).toBe(true)
  })

  it('finds the cell under a point and nothing outside the yard', () => {
    expect(cellAt(0, 0)).toBe(0)
    expect(cellAt(COLS - 0.01, ROWS - 0.01)).toBe(COLS * ROWS - 1)
    expect(cellAt(3.7, 2.2)).toBe(2 * COLS + 3)
    for (const [x, z] of [[-0.1, 1], [COLS, 1], [1, -0.1], [1, ROWS], [Number.NaN, 1]]) expect(cellAt(x, z)).toBe(-1)
  })

  it('goes from dry to damp to a puddle to mud as gulps land on one spot', () => {
    let ground = dryGround()
    const seen = [levelAt(ground, 5.5, 4.5)]
    for (let gulp = 0; gulp < MOST; gulp++) {
      ground = pour(ground, 5.5, 4.5, 1)
      seen.push(levelAt(ground, 5.5, 4.5))
    }
    expect(seen).toEqual(['dry', 'damp', 'damp', 'puddle', 'mud', 'mud'])
  })

  it('never holds more than five gulps in a cell', () => {
    let ground = dryGround()
    for (let gulp = 0; gulp < 40; gulp++) ground = pour(ground, 1.5, 1.5, 1)
    expect(Math.max(...ground)).toBe(MOST)
    expect(MOST).toBeLessThanOrEqual(5)
  })

  it('wets only the cell the water lands in, and loses water that lands outside', () => {
    const ground = pour(dryGround(), 8.2, 3.9, 1)
    expect(ground.filter((gulps) => gulps > 0)).toHaveLength(1)
    expect(pour(ground, -3, 2, 1)).toBe(ground)
    expect(pour(ground, 2, 2, 0)).toBe(ground)
  })

  it('does not change the ground it was given', () => {
    const before = dryGround()
    pour(before, 2, 2, 1)
    expect(before.every((gulps) => gulps === 0)).toBe(true)
  })

  it('dries a blot of one gulp in a quarter of a minute and a line of two in half a minute', () => {
    let ground = pour(pour(pour(dryGround(), 2.5, 2.5, 1), 9.5, 2.5, 1), 9.5, 2.5, 1)
    ground = dry(ground, 14)
    expect(levelAt(ground, 2.5, 2.5)).toBe('damp')
    ground = dry(ground, 1.01)
    expect(levelAt(ground, 2.5, 2.5)).toBe('dry')
    expect(levelAt(ground, 9.5, 2.5)).toBe('damp')
    ground = dry(ground, 15)
    expect(levelAt(ground, 9.5, 2.5)).toBe('dry')
    expect(1 / DRYING_GULPS_PER_S).toBe(15)
  })

  it('leaves a puddle and mud as they are, however long the yard is on screen', () => {
    let ground = dryGround()
    for (let gulp = 0; gulp < PUDDLE_AT; gulp++) ground = pour(ground, 4.5, 4.5, 1)
    for (let gulp = 0; gulp < MUD_AT; gulp++) ground = pour(ground, 6.5, 4.5, 1)
    const later = dry(ground, 3600)
    expect(levelAt(later, 4.5, 4.5)).toBe('puddle')
    expect(levelAt(later, 6.5, 4.5)).toBe('mud')
    expect(later).toBe(ground)
  })

  it('plays no time on a frame of no length', () => {
    const ground = pour(dryGround(), 2, 2, 1)
    expect(dry(ground, 0)).toBe(ground)
    expect(dry(ground, -1)).toBe(ground)
  })

  it('lists the cells at a level with their centres', () => {
    let ground = dryGround()
    for (let gulp = 0; gulp < PUDDLE_AT; gulp++) ground = pour(ground, 4.5, 4.5, 1)
    const cells = cellsAt(ground, 'puddle')
    expect(cells).toEqual([cellAt(4.5, 4.5)])
    expect(centreOf(cells[0])).toEqual({ x: 4.5, z: 4.5 })
    expect(cellsAt(ground, 'dry')).toHaveLength(COLS * ROWS - 1)
  })

  it('names each level by the gulps it takes', () => {
    expect([0, 0.2, 2.9, 3, 3.9, 4, 5].map(levelOf)).toEqual(['dry', 'damp', 'damp', 'puddle', 'puddle', 'mud', 'mud'])
  })
})

describe('the saved ground', () => {
  it('comes back at the same level in every cell', () => {
    let ground = dryGround()
    ground = pour(ground, 1.5, 1.5, 1)
    for (let gulp = 0; gulp < PUDDLE_AT; gulp++) ground = pour(ground, 7.5, 2.5, 1)
    for (let gulp = 0; gulp < MOST; gulp++) ground = pour(ground, 12.5, 8.5, 1)
    const saved = encode(ground)
    expect(saved).toHaveLength(COLS * ROWS)
    const back = decode(saved)
    expect(back.map(levelOf)).toEqual(ground.map(levelOf))
    expect(encode(back)).toBe(saved)
  })

  it('reads anything that is not a whole grid as dry sand', () => {
    for (const raw of [undefined, null, 7, {}, [], '', '0123', '0'.repeat(COLS * ROWS + 1)]) {
      expect(decode(raw).every((gulps) => gulps === 0)).toBe(true)
    }
  })

  it('reads a damaged cell as dry and keeps the others', () => {
    const saved = `x9${'2'}${'0'.repeat(COLS * ROWS - 3)}`
    const back = decode(saved)
    expect(back.slice(0, 3).map(levelOf)).toEqual(['dry', 'dry', 'puddle'])
  })
})
