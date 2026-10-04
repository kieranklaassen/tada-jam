import { describe, expect, it } from 'vitest'
import { LAYOUT } from './props'
import { bucketTop, floorSpot, wallSpot } from './spots'

describe('the things of the place that stand still', () => {
  it('a pool is a pool across its oval, the drain is the drain across its grate, and the floor between them is floor', () => {
    for (const pool of LAYOUT.pools) {
      expect(floorSpot(pool.x, pool.z)).toBe('pool')
      expect(floorSpot(pool.x + pool.rx * 0.8, pool.z)).toBe('pool')
      expect(floorSpot(pool.x, pool.z - pool.rz * 0.8)).toBe('pool')
      expect(floorSpot(pool.x + pool.rx * 1.1, pool.z)).toBeNull()
    }
    expect(floorSpot(LAYOUT.drain.x, LAYOUT.drain.z)).toBe('drain')
    expect(floorSpot(LAYOUT.drain.x + 0.5, LAYOUT.drain.z + 0.2)).toBe('drain')
    expect(floorSpot(LAYOUT.drain.x + 1.0, LAYOUT.drain.z)).toBeNull()
    expect(floorSpot(0, 2.6)).toBeNull()
    expect(floorSpot(-6, 0)).toBeNull()
  })

  it('the two pools and the drain lie apart from each other and from the puddle in the yard', () => {
    const [a, b] = LAYOUT.pools
    expect(Math.hypot((a.x - b.x) / (a.rx + b.rx), (a.z - b.z) / (a.rz + b.rz))).toBeGreaterThan(1)
    for (const pool of LAYOUT.pools) {
      expect(pool.z - pool.rz).toBeGreaterThan(LAYOUT.drain.z + 0.4)
      expect(Math.hypot(pool.x - LAYOUT.puddle.x, pool.z - LAYOUT.puddle.z)).toBeGreaterThan(pool.rx + LAYOUT.puddle.rx)
    }
  })

  it('the window is the window across its glass and the pipe is the pipe along its length, and the tiles between are wall', () => {
    const w = LAYOUT.window, pipe = LAYOUT.pipe
    expect(wallSpot((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2)).toBe('window')
    expect(wallSpot(w.x0 + 0.05, w.y1 - 0.05)).toBe('window')
    expect(wallSpot(-4, pipe.y)).toBe('pipe')
    expect(wallSpot(1, pipe.y + 0.2)).toBe('pipe')
    expect(wallSpot(pipe.x1 + 0.4, pipe.y)).toBeNull()
    expect(wallSpot(-4, 2.0)).toBeNull()
    expect(wallSpot(-4, 4.6)).toBeNull()
    // The pipe runs under the window with tiles between: a finger is on one or on the other.
    expect(w.y0 - pipe.y).toBeGreaterThan(0.3)
  })

  it('the bucket stands beside the post of the rack, on the floor', () => {
    const [x, y, z] = bucketTop()
    expect(x).toBeGreaterThan(LAYOUT.rack.x)
    expect(z).toBe(LAYOUT.rack.z)
    expect(y).toBeGreaterThan(0.5)
    expect(y).toBeLessThan(1)
  })
})
