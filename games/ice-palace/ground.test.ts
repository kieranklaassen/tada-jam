import { describe, expect, it } from 'vitest'
import { BLOCK_H, CLEAR_WITHIN, MAX_LEN, POND, SAW_GAP, awayFromHole, cutReach, freeIce, holeOf, iceAt, inHole, onPond, sawable, type Hole } from './ground'

describe('the pond', () => {
  it('is clear in the middle and cloudy round the edge', () => {
    expect(iceAt(POND.cx, POND.cy)).toBe('clear')
    expect(iceAt(POND.cx + POND.rx * (CLEAR_WITHIN - 0.05), POND.cy)).toBe('clear')
    expect(iceAt(POND.cx + POND.rx * (CLEAR_WITHIN + 0.05), POND.cy)).toBe('cloudy')
    expect(iceAt(POND.cx, POND.cy - POND.ry * 0.9)).toBe('cloudy')
  })

  it('keeps the saw inside its edge, so a hole never reaches the snow', () => {
    expect(onPond(POND.cx + POND.rx - 4, POND.cy)).toBe(true)
    expect(sawable(POND.cx + POND.rx - 4, POND.cy)).toBe(false)
    expect(sawable(POND.cx, POND.cy)).toBe(true)
    // Wherever the saw may be, a point half a block to either side is still on the pond.
    for (let turn = 0; turn < Math.PI * 2; turn += 0.1) {
      const x = POND.cx + Math.cos(turn) * (POND.rx - 31), y = POND.cy + Math.sin(turn) * (POND.ry - 31)
      if (!sawable(x, y)) continue
      for (const side of [0, 1, 2, 3]) expect(onPond(x + Math.cos((side * Math.PI) / 2) * (BLOCK_H / 2), y + Math.sin((side * Math.PI) / 2) * (BLOCK_H / 2))).toBe(true)
    }
  })
})

describe('a hole', () => {
  const hole: Hole = { x: 500, y: 660, angle: Math.PI / 2, len: 120 }
  it('lies along its own angle', () => {
    expect(inHole(hole, 500, 660 + 55)).toBe(true)
    expect(inHole(hole, 500 + 55, 660)).toBe(false)
    expect(awayFromHole(hole, 500 + BLOCK_H / 2 + 10, 660)).toBeCloseTo(10)
  })
})

describe('a cut', () => {
  it('is as long as the finger went, on free ice', () => {
    expect(cutReach({ x: 460, y: 670 }, 0, 150, [], [])).toEqual({ len: 150, stopped: false })
  })

  it('stops at the longest block the pond gives', () => {
    expect(cutReach({ x: 380, y: 668 }, 0, 500, [], [])).toEqual({ len: MAX_LEN, stopped: true })
  })

  it('stops at the edge of the pond', () => {
    const reach = cutReach({ x: 800, y: 668 }, 0, 280, [], [])
    expect(reach.stopped).toBe(true)
    expect(reach.len).toBeLessThan(280)
    expect(sawable(800 + reach.len, 668)).toBe(true)
  })

  it('stops short of open water and of a block lying on the ice, with ice left between', () => {
    const hole: Hole = { x: 640, y: 668, angle: Math.PI / 2, len: 100 }
    const atWater = cutReach({ x: 420, y: 668 }, 0, 280, [hole], [])
    expect(atWater.stopped).toBe(true)
    expect(awayFromHole(hole, 420 + atWater.len, 668)).toBeGreaterThanOrEqual(BLOCK_H / 2 + SAW_GAP)
    const atBlock = cutReach({ x: 420, y: 668 }, 0, 280, [], [{ x: 640, y: 668, len: 80 }])
    expect(atBlock.stopped).toBe(true)
    expect(420 + atBlock.len).toBeLessThanOrEqual(640 - 40 - BLOCK_H / 2 - SAW_GAP)
    expect(freeIce(640, 668, [], [{ x: 640, y: 668, len: 80 }])).toBe(false)
  })

  it('leaves a hole whose middle is the middle of the line and whose length is the line, in whole units', () => {
    expect(holeOf({ x: 400, y: 600 }, 0, 120.4)).toEqual({ x: 460, y: 600, angle: 0, len: 120 })
    const slanted = holeOf({ x: 400, y: 600 }, 0.7071, 100)
    expect(Number.isInteger(slanted.x) && Number.isInteger(slanted.y) && Number.isInteger(slanted.len)).toBe(true)
    expect(slanted.angle).toBe(0.71)
  })
})
