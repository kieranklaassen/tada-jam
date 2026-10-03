import { describe, expect, it } from 'vitest'
import { PLATE, STUD_SIDES, bounds, buildMesh, centred, type Brick, type BrickMesh } from './bricks'

const RED = [1, 0, 0] as const

/** The smallest agreement between a triangle's own facing and the normals stored on its corners. */
function worstFacing(mesh: BrickMesh): number {
  let worst = 1
  const p = mesh.position, n = mesh.normal
  for (let t = 0; t < mesh.index.length; t += 3) {
    const [a, b, c] = [mesh.index[t] * 3, mesh.index[t + 1] * 3, mesh.index[t + 2] * 3]
    const ux = p[b] - p[a], uy = p[b + 1] - p[a + 1], uz = p[b + 2] - p[a + 2]
    const vx = p[c] - p[a], vy = p[c + 1] - p[a + 1], vz = p[c + 2] - p[a + 2]
    const fx = uy * vz - uz * vy, fy = uz * vx - ux * vz, fz = ux * vy - uy * vx
    const length = Math.hypot(fx, fy, fz)
    expect(length).toBeGreaterThan(1e-9)
    for (const i of [a, b, c]) worst = Math.min(worst, (fx * n[i] + fy * n[i + 1] + fz * n[i + 2]) / length)
  }
  return worst
}

describe('brick geometry', () => {
  it('winds every triangle to face the way its normals point', () => {
    const bricks: Brick[] = [
      { x: 0, y: 0, z: 0, w: 2, d: 3, h: 3, colour: RED },
      { x: 3, y: 0, z: 0, w: 2, d: 2, h: 3, colour: RED, round: true },
      { x: 6, y: 0, z: 0, w: 1, d: 0.5, h: 3, colour: RED, round: true, axis: 'z' },
    ]
    // A cylinder's side is flat between two rounded normals, so its facing agrees a little less than fully.
    expect(worstFacing(buildMesh(bricks, true))).toBeGreaterThan(0.85)
  })

  it('puts a stud on every open cell and none where a brick sits on top', () => {
    const base: Brick = { x: 0, y: 0, z: 0, w: 4, d: 2, h: 3, colour: RED }
    expect(buildMesh([base]).studs).toBe(8)
    const cab: Brick = { x: 1, y: 3, z: 0, w: 2, d: 2, h: 3, colour: RED }
    // Four cells of the base are under the cab, and the cab has four of its own.
    expect(buildMesh([base, cab]).studs).toBe(4 + 4)
    expect(buildMesh([{ ...base, studs: false }]).studs).toBe(0)
  })

  it('gives a narrow round brick one stud and a wheel on its side none', () => {
    expect(buildMesh([{ x: 0, y: 0, z: 0, w: 1, d: 1, h: 3, colour: RED, round: true }]).studs).toBe(1)
    expect(buildMesh([{ x: 0, y: 0, z: 0, w: 1, d: 0.5, h: 3, colour: RED, round: true, axis: 'z' }]).studs).toBe(0)
  })

  it('keeps every array in step', () => {
    const mesh = buildMesh([{ x: 0, y: 0, z: 0, w: 1, d: 1, h: 1, colour: RED }])
    const vertices = mesh.position.length / 3
    expect(mesh.normal.length).toBe(vertices * 3)
    expect(mesh.color.length).toBe(vertices * 3)
    expect(mesh.face.length).toBe(vertices * 4)
    expect(Math.max(...mesh.index)).toBe(vertices - 1)
    // Five faces of a box without its bottom, and one stud: a side ring and a cap.
    expect(vertices).toBe(5 * 4 + STUD_SIDES * 3)
  })

  it('measures a build and centres it on its footprint', () => {
    const bricks: Brick[] = [{ x: 2, y: 3, z: 4, w: 4, d: 2, h: 3, colour: RED }]
    expect(bounds(bricks)).toEqual({ min: [2, 3 * PLATE, 4], max: [6, 6 * PLATE, 6] })
    const moved = bounds(centred(bricks))
    expect(moved.min[0]).toBeCloseTo(-2); expect(moved.max[0]).toBeCloseTo(2)
    expect(moved.min[1]).toBeCloseTo(0)
    expect(moved.min[2]).toBeCloseTo(-1); expect(moved.max[2]).toBeCloseTo(1)
  })
})
