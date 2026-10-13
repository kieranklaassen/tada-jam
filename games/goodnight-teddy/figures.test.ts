import { describe, expect, it } from 'vitest'
import { PYJAMA_STRIPES } from './figures'

describe('the pyjamas', () => {
  it('have stripes a little uneven: no two gaps in a row and no two thicknesses in a row are the same', () => {
    for (const stripes of Object.values(PYJAMA_STRIPES)) {
      expect(stripes.length).toBeGreaterThan(3)
      const gaps = stripes.slice(1).map(([y], n) => y - stripes[n][0])
      for (const gap of gaps) expect(gap).toBeGreaterThan(12)
      for (let n = 1; n < gaps.length; n++) expect(Math.abs(gaps[n] - gaps[n - 1])).toBeGreaterThan(3)
      for (let n = 1; n < stripes.length; n++) expect(Math.abs(stripes[n][1] - stripes[n - 1][1])).toBeGreaterThan(0.8)
      // A little: no stripe is twice as thick as another, and none leans far.
      const thick = stripes.map(([, wide]) => wide)
      expect(Math.max(...thick) / Math.min(...thick)).toBeLessThan(2)
      for (const [, , lean] of stripes) expect(Math.abs(lean)).toBeLessThanOrEqual(4)
    }
  })
})
