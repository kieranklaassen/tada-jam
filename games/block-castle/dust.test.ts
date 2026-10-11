import { describe, expect, it } from 'vitest'
import { KINDS } from './blocks'
import { landingDust } from './dust'
import { SIZE } from './layout'
import { SECOND_KNOCK } from './motion'
import { makeRng } from './rng'

describe('the wool dust of a landing', () => {
  const rng = makeRng(5)
  const roll = (): number => rng.next()

  it('comes up in a puff at each end of the long one: the left end as it lands, the right at its second knock', () => {
    const dust = landingDust('long', [1, 0, -1], roll)
    const half = SIZE.long[0] / 2
    const left = dust.filter((puff) => puff.x < 1), right = dust.filter((puff) => puff.x > 1)
    expect(left.length).toBeGreaterThanOrEqual(5)
    expect(right.length).toBe(left.length)
    for (const puff of left) {
      expect(puff.delay).toBe(0)
      // At the end, not along the block, and drifting outward.
      expect(puff.x).toBeLessThan(1 - half + 0.15)
      expect(Math.cos(puff.angle)).toBeLessThan(0.4)
    }
    for (const puff of right) {
      expect(puff.delay).toBe(SECOND_KNOCK.long)
      expect(puff.x).toBeGreaterThan(1 + half - 0.15)
      expect(Math.cos(puff.angle)).toBeGreaterThan(-0.4)
    }
    // Nothing comes up along its middle.
    for (const puff of dust) expect(Math.abs(puff.x - 1)).toBeGreaterThan(half - 0.15)
  })

  it('is one ring round the foot of every other kind, all at once', () => {
    for (const kind of KINDS) {
      if (kind === 'long') continue
      const dust = landingDust(kind, [0, 0, 0], roll)
      expect(dust, kind).toHaveLength(8)
      for (const puff of dust) expect(puff.delay, kind).toBe(0)
      expect(dust.some((puff) => puff.x > 0) && dust.some((puff) => puff.x < 0) && dust.some((puff) => puff.z > 0) && dust.some((puff) => puff.z < 0), kind).toBe(true)
    }
  })
})
