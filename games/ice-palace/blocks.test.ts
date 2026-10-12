import { describe, expect, it } from 'vitest'
import { BALL, CEILING_Y, ICICLE, ICICLE_W, ON_BANK_Y, bears, borne, covers, freeSpot, hangPlace, mayLie, onBankX, overWater, restOf, restOnBank, rollBall, settle, widthOf, type Rest } from './blocks'
import { BLOCK_H, BUILD, KEEP_OUT, type Hole } from './ground'

const built = (len: number, x: number, row: number): Rest => restOf('clear', len, x, ON_BANK_Y - row * BLOCK_H, 'built')
const lying = (len: number, x: number, y: number): Rest => restOf('clear', len, x, y, 'lying')

describe('a block set down above the bank', () => {
  it('falls to the snow where nothing is under it', () => {
    expect(restOnBank(100, 500, 200, [])).toEqual({ x: 500, y: ON_BANK_Y, on: 'snow' })
  })

  it('rests on the block under it, however little of it is over that block', () => {
    const base = [built(100, 500, 0)]
    expect(restOnBank(100, 500, 200, base)).toEqual({ x: 500, y: ON_BANK_Y - BLOCK_H, on: 'block' })
    expect(restOnBank(100, 597, 200, base)).toEqual({ x: 597, y: ON_BANK_Y - BLOCK_H, on: 'block' })
    expect(restOnBank(100, 600, 200, base)).toEqual({ x: 600, y: ON_BANK_Y, on: 'snow' })
  })

  it('goes up on top when it is let go inside a pile', () => {
    const pile = [built(100, 500, 0), built(100, 500, 1)]
    expect(restOnBank(80, 500, ON_BANK_Y, pile)).toEqual({ x: 500, y: ON_BANK_Y - 2 * BLOCK_H, on: 'block' })
  })

  it('goes under a lintel when it is let go under it, and onto it when it is let go above', () => {
    const gate = [built(60, 400, 0), built(60, 560, 0), built(220, 480, 1)]
    expect(restOnBank(70, 480, ON_BANK_Y - 4, gate)).toEqual({ x: 480, y: ON_BANK_Y, on: 'snow' })
    expect(restOnBank(70, 480, 200, gate)).toEqual({ x: 480, y: ON_BANK_Y - 2 * BLOCK_H, on: 'block' })
  })

  it('stays on the bank between the lamp child and the king', () => {
    expect(onBankX(0, 100)).toBe(BUILD.x0 + 50)
    expect(onBankX(2000, 100)).toBe(BUILD.x1 - 50)
  })

  it('settles beside a pile that has reached the ceiling, on the highest free place there, and never above the ceiling', () => {
    const tower: Rest[] = []
    for (let row = 0; ON_BANK_Y - row * BLOCK_H >= CEILING_Y; row++) tower.push(built(100, 500, row))
    const rest = restOnBank(100, 500, 100, tower)!
    expect(rest.y).toBeGreaterThanOrEqual(CEILING_Y)
    expect(tower.some((b) => covers(rest.x, rest.y, 100, b.x, b.y, b.len))).toBe(false)
    expect(Math.abs(rest.x - 500)).toBeLessThan(110)
  })

  it('bears nothing on a snowball or an icicle: what is let go over one settles beside it', () => {
    expect(bears('ball')).toBe(false)
    expect(bears('icicle')).toBe(false)
    const ball = restOf('ball', BALL, 500, ON_BANK_Y, 'built')
    const rest = restOnBank(100, 500, 200, [ball])!
    expect(rest.y).toBe(ON_BANK_Y)
    expect(covers(rest.x, rest.y, 100, ball.x, ball.y, widthOf(ball))).toBe(false)
  })

  it('hangs an icicle under a block that has a free place under it, and nowhere else', () => {
    const gate = [built(60, 400, 0), built(60, 560, 0), built(220, 480, 1)]
    expect(hangPlace(480, ON_BANK_Y, gate)).toEqual({ x: 480, y: ON_BANK_Y })
    expect(hangPlace(480, 200, gate)).toBeNull()
    expect(hangPlace(700, ON_BANK_Y, gate)).toBeNull()
    expect(widthOf(restOf('icicle', ICICLE, 0, 0, 'hung'))).toBe(ICICLE_W)
  })

  it('rolls a snowball off a block to the snow beside it, and leaves one on the bare bank where it is set', () => {
    expect(rollBall(BALL, 500, 200, [])).toEqual([{ x: 500, y: ON_BANK_Y, on: 'snow' }])
    const path = rollBall(BALL, 510, 200, [built(100, 500, 0)])
    expect(path.length).toBeGreaterThan(1)
    const last = path[path.length - 1]
    expect(last.y).toBe(ON_BANK_Y)
    expect(covers(last.x, last.y, BALL, 500, ON_BANK_Y, 100)).toBe(false)
  })
})

describe('taking a block out of a pile', () => {
  it('brings down what stood on it, and leaves what is still borne', () => {
    const lintel = built(220, 480, 1), onTop = built(60, 480, 2)
    const left = [built(60, 400, 0), lintel, onTop]
    // The right post is gone: the lintel still rests on the left one.
    expect(settle(left).size).toBe(0)
    // Both posts gone: the lintel comes down to the snow and what stood on it comes down with it.
    const moved = settle([lintel, onTop])
    expect(moved.get(0)?.y).toBe(ON_BANK_Y)
    expect(moved.get(1)?.y).toBe(ON_BANK_Y - BLOCK_H)
    expect(borne(lintel, [lintel])).toBe(false)
  })
})

describe('a block lying below the bank', () => {
  const hole: Hole = { x: 560, y: 672, angle: 0, len: 150 }

  it('stays where it is put when the place is free', () => {
    expect(freeSpot(120, 400, 700, [], [])).toEqual({ x: 400, y: 700 })
  })

  it('moves off another lying block to the nearest free place', () => {
    const others = [lying(120, 400, 700)]
    const spot = freeSpot(120, 410, 704, others, [])
    expect(mayLie(120, spot.x, spot.y, others, [])).toBe(true)
    expect(covers(spot.x, spot.y, 120, 400, 700, 120, 4)).toBe(false)
    expect(Math.hypot(spot.x - 410, spot.y - 704)).toBeLessThan(140)
  })

  it('never lies over open water, not even with one end', () => {
    expect(overWater(120, 560, 672, hole)).toBe(true)
    expect(overWater(120, 690, 672, hole)).toBe(true)
    expect(overWater(120, 560, 672 - BLOCK_H - 4, hole)).toBe(false)
    const spot = freeSpot(120, 690, 676, [], [hole])
    expect(overWater(120, spot.x, spot.y, hole)).toBe(false)
  })

  it('keeps out of the two corners where the peeper and the berry bush are', () => {
    for (const corner of KEEP_OUT) {
      const spot = freeSpot(100, corner.x + corner.w / 2, corner.y + corner.h / 2, [], [])
      expect(spot.x + 50 <= corner.x || spot.x - 50 >= corner.x + corner.w || spot.y + BLOCK_H / 2 <= corner.y || spot.y - BLOCK_H / 2 >= corner.y + corner.h).toBe(true)
    }
  })
})
