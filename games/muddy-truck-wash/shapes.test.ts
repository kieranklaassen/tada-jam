import { describe, expect, it } from 'vitest'
import { MAT, Shape, rgb } from './shapes'

const RED = rgb(0xd0202a)

/** Every triangle's own facing agrees with the normals written for its corners. */
function facesOutward(shape: Shape): number {
  let wrong = 0
  const p = shape.position, n = shape.normal
  for (let i = 0; i < p.length; i += 9) {
    const ux = p[i + 3] - p[i], uy = p[i + 4] - p[i + 1], uz = p[i + 5] - p[i + 2]
    const vx = p[i + 6] - p[i], vy = p[i + 7] - p[i + 1], vz = p[i + 8] - p[i + 2]
    const gx = uy * vz - uz * vy, gy = uz * vx - ux * vz, gz = ux * vy - uy * vx
    if (Math.hypot(gx, gy, gz) < 1e-12) continue
    for (let k = 0; k < 9; k += 3) if (gx * n[i + k] + gy * n[i + k + 1] + gz * n[i + k + 2] <= 0) wrong += 1
  }
  return wrong
}

describe('die-cast shapes', () => {
  it('a chamfered box has 44 triangles, fills its size and faces outward', () => {
    const s = new Shape().box([2, 1, 0.5], RED, { at: [1, 2, 3] }, { bevel: 0.1 })
    expect(s.triangles).toBe(44)
    const { min, max } = s.bounds()
    expect(min).toEqual([0, 1.5, 2.75])
    expect(max).toEqual([2, 2.5, 3.25])
    expect(facesOutward(s)).toBe(0)
  })

  it('a tapered and turned box still faces outward', () => {
    const s = new Shape().box([2, 1, 1], RED, { at: [0, 0, 0], turn: { axis: 'z', by: 0.4 } }, { top: { sx: 0.5, dx: -0.3, sz: 0.8 } })
    expect(facesOutward(s)).toBe(0)
  })

  it('marks only chamfers as edges, where enamel chips', () => {
    const s = new Shape().box([1, 1, 1], RED)
    let edges = 0
    for (let i = 1; i < s.surface.length; i += 2) edges += s.surface[i]
    // 12 edge quads and 8 corner triangles: 32 of the 44 triangles.
    expect(edges).toBe(32 * 3)
    expect(s.surface[0]).toBe(MAT.enamel)
  })

  it.each(['x', 'y', 'z'] as const)('a turned piece along %s faces outward and lies along it', (axis) => {
    const s = new Shape().round(0.5, 2, RED, {}, { axis, r2: 0.3 })
    expect(facesOutward(s)).toBe(0)
    const { min, max } = s.bounds()
    const k = { x: 0, y: 1, z: 2 }[axis]
    expect(max[k] - min[k]).toBeCloseTo(2)
  })

  it('a ball, a dome and a ring face outward', () => {
    expect(facesOutward(new Shape().ball(1, RED))).toBe(0)
    expect(facesOutward(new Shape().ball(1, RED, {}, { from: 0, squash: [1, 0.6, 1] }))).toBe(0)
    expect(facesOutward(new Shape().ring(1, 0.2, RED, { turn: { axis: 'y', by: 1 } }, { arc: 5, rise: 0.4 }))).toBe(0)
  })

  it('writes a colour and a surface pair for every corner', () => {
    const s = new Shape().box([1, 1, 1], RED).round(0.3, 1, RED, {}, { mat: MAT.rubber })
    expect(s.color.length).toBe(s.position.length)
    expect(s.normal.length).toBe(s.position.length)
    expect(s.surface.length).toBe((s.position.length / 3) * 2)
  })
})
