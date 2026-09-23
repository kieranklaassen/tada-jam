import { describe, expect, it } from 'vitest'
import { FbmRow, hash, NoiseRow, PX_PER_UNIT } from './view/wood'

/** Four corner hashes per sample: what each row lookup must reproduce. */
function cornerNoise(x: number, y: number, period = 0): number {
  const xi = Math.floor(x)
  const yi = Math.floor(y)
  const u = (x - xi) * (x - xi) * (3 - 2 * (x - xi))
  const v = (y - yi) * (y - yi) * (3 - 2 * (y - yi))
  const x0 = period > 0 ? ((xi % period) + period) % period : xi
  const x1 = period > 0 ? (x0 + 1) % period : xi + 1
  const a = hash(x0, yi)
  const b = hash(x1, yi)
  const c = hash(x0, yi + 1)
  const d = hash(x1, yi + 1)
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v
}

function cornerFbm(x: number, y: number, period = 0): number {
  return cornerNoise(x, y, period) * 0.55 + cornerNoise(x * 2 + 5, y * 2.1 + 1.3, period * 2) * 0.3 + cornerNoise(x * 4 + 9, y * 4.3 + 3.7, period * 4) * 0.15
}

const WIDTH = 1024
const LAST = (WIDTH - 1) / PX_PER_UNIT

describe('wood grain rows', () => {
  it('give the same noise as four corner hashes at every pixel of a row, across the wrap', () => {
    const row = new NoiseRow()
    for (const [scale, offset, period] of [
      [1, 0, 4],
      [16, 3, 64],
      [40, 0, 0],
    ] as const) {
      for (const y of [0, 0.37, 12.9, 91.25]) {
        row.set(y, offset, LAST * scale + offset, period)
        let worst = 0
        for (let px = 0; px < WIDTH; px++) {
          const x = (px / PX_PER_UNIT) * scale + offset
          worst = Math.max(worst, Math.abs(row.at(x) - cornerNoise(x, y, period)))
        }
        expect(worst).toBeLessThan(1e-12)
      }
    }
  })

  it('give the same three octaves as the corner version', () => {
    const row = new FbmRow()
    for (const period of [0, 3]) {
      for (const y of [0.1, 1.44, 7.7]) {
        row.set(y, 11, LAST * 0.75 + 11, period)
        let worst = 0
        for (let px = 0; px < WIDTH; px++) {
          const x = (px / PX_PER_UNIT) * 0.75 + 11
          worst = Math.max(worst, Math.abs(row.at(x) - cornerFbm(x, y, period)))
        }
        expect(worst).toBeLessThan(1e-12)
      }
    }
  })

  it('repeat along the grain every period, so long boards tile without a seam', () => {
    const samples = [0.25, 1.5, 3.75]
    const shifted = (row: NoiseRow) => samples.map((x) => row.at(x + 4) - row.at(x))
    const wrapped = new NoiseRow()
    wrapped.set(2.5, 0, 8, 4)
    expect(shifted(wrapped)).toEqual([0, 0, 0])
    const open = new NoiseRow()
    open.set(2.5, 0, 8)
    expect(shifted(open)).not.toEqual([0, 0, 0])
  })
})
