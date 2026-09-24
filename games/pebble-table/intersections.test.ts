import * as CANNON from 'cannon-es'
import { describe, expect, it } from 'vitest'
import { FEEDING, TABLE, type Quarters } from './layout'
import { STOOL_REACH, STOOL_TOP } from './partShape'
import { STEP, TablePhysics, toWorld2, UNIT } from './physics3d'
import { STONE_CUTS, STONE_DRAWN_RADIUS, STONE_SEGMENTS, stoneRest, stoneVertices } from './stoneShape'

// What the intersection audit (npm run check:intersections -- pebble-table)
// found drawn pieces doing, pinned at the level of the shapes and physics
// that caused it: each test fails against the code the audit first ran on.

const SIZES: readonly Quarters[] = [4, 2, 1]

const run = (physics: TablePhysics, seconds: number) => {
  for (let t = 0; t < seconds; t += STEP) physics.step(STEP)
}

function drawnPoints(q: Quarters): CANNON.Vec3[] {
  const vertices = stoneVertices(STONE_CUTS[q], STONE_SEGMENTS)
  const points: CANNON.Vec3[] = []
  for (let i = 0; i < vertices.length; i += 3) points.push(new CANNON.Vec3(vertices[i], vertices[i + 1], vertices[i + 2]).scale(STONE_DRAWN_RADIUS))
  return points
}

/** A stone's collider, and a function taking body-space points into its space. */
function collider(body: CANNON.Body): { shape: CANNON.ConvexPolyhedron; local: (p: CANNON.Vec3) => CANNON.Vec3 } {
  const shape = body.shapes[0]
  if (!(shape instanceof CANNON.ConvexPolyhedron)) throw new Error('stone collider is not convex')
  const offset = body.shapeOffsets[0]
  return { shape, local: (p) => p.vsub(offset) }
}

/** How deep a body-space point sits inside a convex collider; negative outside. */
function depthInside(shape: CANNON.ConvexPolyhedron, p: CANNON.Vec3): number {
  let depth = Infinity
  shape.faces.forEach((face, i) => {
    depth = Math.min(depth, -shape.faceNormals[i].dot(p.vsub(shape.vertices[face[0]])))
  })
  return depth
}

const toWorld = (body: CANNON.Body, local: CANNON.Vec3) => body.position.vadd(body.quaternion.vmult(local))

/** The height of a body's lowest drawn point, from the vertical row of its rotation. */
function lowest(body: CANNON.Body, points: readonly CANNON.Vec3[]): number {
  const { x, y, z, w } = body.quaternion
  const [rx, ry, rz] = [2 * (x * y + w * z), 1 - 2 * (x * x + z * z), 2 * (y * z - w * x)]
  let low = Infinity
  for (const p of points) low = Math.min(low, rx * p.x + ry * p.y + rz * p.z)
  return body.position.y + low
}
const toLocal = (body: CANNON.Body, world: CANNON.Vec3) => body.quaternion.conjugate().vmult(world.vsub(body.position))

describe('stones collide as they are drawn', () => {
  it('draws every size inside its collider, and the collider touches the drawing on every side', () => {
    const physics = new TablePhysics()
    SIZES.forEach((q, i) => physics.addStone(i + 1, q, { x: 400 + i * 200, y: 500 }))
    SIZES.forEach((q, i) => {
      const { shape, local } = collider(physics.body(i + 1)!)
      const points = drawnPoints(q).map(local)
      const outside = Math.max(...points.map((p) => -depthInside(shape, p)))
      expect(outside, `size ${q}: drawn stone pokes out of its collider`).toBeLessThan(1e-4)
      shape.faces.forEach((face, f) => {
        const gap = Math.min(...points.map((p) => -shape.faceNormals[f].dot(p.vsub(shape.vertices[face[0]]))))
        expect(gap, `size ${q}: collider face ${f} stands off the drawing`).toBeLessThan(1e-3)
      })
    })
  })

  it('rests every size with its drawn belly on the table, neither sunk nor floating', () => {
    const physics = new TablePhysics()
    SIZES.forEach((q, i) => physics.addStone(i + 1, q, { x: 400 + i * 200, y: 500 }))
    run(physics, 1.5)
    SIZES.forEach((q, i) => {
      const body = physics.body(i + 1)!
      const bottom = Math.min(...drawnPoints(q).map((p) => toWorld(body, p).y))
      expect(bottom, `size ${q}`).toBeGreaterThan(-0.05)
      expect(bottom, `size ${q}`).toBeLessThan(0.05)
      expect(body.position.y).toBeCloseTo(stoneRest(q), 1)
    })
  })

  it('settles a spilled heap of mixed stones without any drawn stone inside another', () => {
    const physics = new TablePhysics()
    let seed = 7
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const sizes: Quarters[] = []
    for (let i = 0; i < 16; i++) {
      const q = SIZES[i % 3]
      sizes.push(q)
      physics.addStone(i + 1, q, { x: 700 + (random() - 0.5) * 90, y: 500 + (random() - 0.5) * 90 }, { y: 2 + i * 1.6, spin: (random() - 0.5) * 6 })
    }
    run(physics, 4)
    let worst = 0
    for (let a = 1; a <= sizes.length; a++) {
      const bodyA = physics.body(a)!
      const points = drawnPoints(sizes[a - 1]).map((p) => toWorld(bodyA, p))
      for (let b = 1; b <= sizes.length; b++) {
        if (a === b) continue
        const bodyB = physics.body(b)!
        const { shape, local } = collider(bodyB)
        for (const p of points) worst = Math.max(worst, depthInside(shape, local(toLocal(bodyB, p))))
      }
    }
    expect(worst).toBeLessThan(0.12)
  })

  it('lets a sweeping finger push stones against a stool and the bowl without pressing any into the table', () => {
    const stool = FEEDING.seats[3].guest
    const between = { x: (stool.x + FEEDING.bowl.x) / 2, y: (stool.y + FEEDING.bowl.y) / 2 }
    const points = drawnPoints(4)
    let seed = 11
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    let deepest = 0
    for (let trial = 0; trial < 13; trial++) {
      const physics = new TablePhysics()
      physics.setMat('feeding')
      physics.setFixture('stool', { ...stool, r: STOOL_REACH / UNIT }, STOOL_TOP)
      for (let i = 0; i < 6; i++) {
        const a = random() * Math.PI * 2
        const d = 60 + random() * 90
        physics.addStone(i + 1, 4, { x: between.x + Math.cos(a) * d, y: between.y + Math.sin(a) * d })
      }
      run(physics, 1)
      const angle = random() * Math.PI * 2
      const from = { x: between.x - Math.cos(angle) * 220, y: between.y - Math.sin(angle) * 220 }
      for (let t = 0; t <= 1.8; t += 1 / 60) {
        const k = Math.min(1, t / 0.9)
        physics.setBroom(1, t <= 0.9 ? { x: from.x + Math.cos(angle) * 440 * k, y: from.y + Math.sin(angle) * 440 * k } : null)
        physics.step(1 / 60)
        for (let id = 1; id <= 6; id++) {
          const body = physics.body(id)!
          const at = toWorld2(body.position)
          if (at.x < TABLE.x || at.x > TABLE.x + TABLE.w || at.y < TABLE.y || at.y > TABLE.y + TABLE.h) continue
          deepest = Math.max(deepest, -lowest(body, points))
        }
      }
    }
    expect(deepest).toBeLessThan(0.8)
  }, 30_000)
})
