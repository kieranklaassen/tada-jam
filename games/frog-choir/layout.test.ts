import { describe, expect, it } from 'vitest'
import { COLUMNS, PADS, padUnder, partnerPad, ROW_PITCH_HZ, ROWS } from './layout'

describe('pond layout', () => {
  it('has two pads per column, in different rows', () => {
    for (let column = 0; column < COLUMNS; column++) {
      const pads = PADS.filter((pad) => pad.column === column)
      expect(pads).toHaveLength(2)
      expect(pads[0].row).not.toBe(pads[1].row)
    }
  })

  it('offers every pitch in at least two columns', () => {
    for (let row = 0; row < ROWS; row++) {
      expect(PADS.filter((pad) => pad.row === row).length, `row ${row}`).toBeGreaterThanOrEqual(2)
    }
  })

  it('pitch rises from near to far', () => {
    for (const a of PADS) for (const b of PADS) if (a.z > b.z + 0.5) expect(a.pitch).toBeLessThan(b.pitch)
    expect([...ROW_PITCH_HZ].sort((a, b) => a - b)).toEqual(ROW_PITCH_HZ)
  })

  it('keeps pads apart, so a drop lands on exactly one', () => {
    for (const a of PADS) {
      for (const b of PADS) {
        if (a === b) continue
        expect(Math.hypot(a.x - b.x, a.z - b.z), `${a.index}-${b.index}`).toBeGreaterThan(a.radius + b.radius + 0.1)
      }
    }
  })

  it('finds the pad under a point and nothing over open water', () => {
    const pad = PADS[5]
    expect(padUnder(pad.x + 0.3, pad.z - 0.2)?.index).toBe(5)
    expect(padUnder(40, 40)).toBeNull()
  })

  it('pairs each pad with the other pad in its column', () => {
    for (const pad of PADS) {
      const partner = partnerPad(pad.index)
      expect(partner.column).toBe(pad.column)
      expect(partner.index).not.toBe(pad.index)
      expect(partnerPad(partner.index).index).toBe(pad.index)
    }
  })
})
