import { describe, expect, it } from 'vitest'
import { MAX_DELIVERIES } from './model'
import { SAVE_VERSION, deserialize, serialize } from './snapshot'

describe('snapshot', () => {
  it('round-trips through JSON', () => {
    const saved = serialize([{ shape: 'O', x: 0, y: 488, angle: 0, secured: true }], ['T', 'L', 'J'])
    expect(deserialize(JSON.parse(JSON.stringify(saved)))).toEqual(saved)
  })

  it('reads empty, old and corrupt slots as a fresh street', () => {
    for (const value of [null, undefined, 42, 'x', [], {}, { v: 0, pieces: [] }, { v: SAVE_VERSION, pieces: 'nope' }]) {
      const result = deserialize(value)
      expect(result === null || result.pieces.length === 0).toBe(true)
    }
  })

  it('drops damaged pieces and keeps the good ones', () => {
    const result = deserialize({
      v: SAVE_VERSION,
      pieces: [
        { shape: 'O', x: 0, y: 488, angle: 0, secured: true },
        { shape: 'Q', x: 0, y: 0, angle: 0 },
        { shape: 'I', x: Number.NaN, y: 0, angle: 0 },
        { shape: 'L', x: 9999, y: 0, angle: 0 },
        null,
        { shape: 'S', x: 16, y: 420, angle: 0.01, secured: 'yes' },
      ],
      next: ['O', 'nope', 'T'],
    })
    expect(result?.pieces).toEqual([
      { shape: 'O', x: 0, y: 488, angle: 0, secured: true },
      { shape: 'S', x: 16, y: 420, angle: 0.01, secured: false },
    ])
    expect(result?.next).toEqual([])
  })

  it('stays far under the 64 KB slot cap at the delivery limit', () => {
    const pieces = Array.from({ length: MAX_DELIVERIES + 20 }, (_, i) => ({ shape: 'J' as const, x: -123.45, y: 488 - i * 64.12, angle: -0.1234, secured: true }))
    const json = JSON.stringify(serialize(pieces, ['O', 'T', 'L']))
    expect(json.length).toBeLessThan(16 * 1024)
    expect(deserialize(JSON.parse(json))?.pieces.length).toBe(MAX_DELIVERIES)
  })

  it('keeps scaffolds, and renumbers them when a damaged piece is dropped', () => {
    const result = deserialize({
      v: SAVE_VERSION,
      pieces: [{ shape: 'O', x: 0, y: 488, angle: 0 }, { shape: 'Q', x: 0, y: 0, angle: 0 }, { shape: 'I', x: 0, y: 440, angle: 0 }],
      bonds: [[-1, 0], [0, 2], [1, 2], [2, 2], 'x', [0.5, 1]],
      next: ['O', 'T', 'L'],
    })
    expect(result?.pieces.length).toBe(2)
    expect(result?.bonds).toEqual([[-1, 0], [0, 1]])
  })

  it('still reads version 1 slots, which had no scaffolds', () => {
    const result = deserialize({ v: 1, pieces: [{ shape: 'O', x: 0, y: 488, angle: 0, secured: true }], next: ['O', 'T', 'L'] })
    expect(result?.pieces.length).toBe(1)
    expect(result?.bonds).toEqual([])
  })
})
