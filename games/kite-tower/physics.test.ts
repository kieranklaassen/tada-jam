import type { ConvexPolyhedron } from 'cannon-es'
import { describe, expect, it } from 'vitest'
import { angleOf, PlayPhysics, STEP } from './physics'
import { PIECES, SHAPES } from './pieces'

// Ids from the tray set: 0 cube, 2 large arch, 4 plank, 6 pillar.
const CUBE = 0
const CUBE_B = 1
const ARCH = 2
const PLANK = 4
const PILLAR = 6

function run(physics: PlayPhysics, seconds: number): { settled: boolean; impacts: number } {
  let settled = false
  let impacts = 0
  for (let t = 0; t < seconds; t += STEP) {
    const report = physics.step(STEP)
    if (report.settledNow) settled = true
    impacts += report.impacts
  }
  return { settled, impacts }
}

const cubeRest = -SHAPES.cube.parts[0][0].y

describe('PlayPhysics', () => {
  it('a dropped cube comes to rest on the rug and the world reports it settled', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: 0, y: 2, angle: 0 })
    const { settled, impacts } = run(physics, 3)
    expect(settled).toBe(true)
    expect(impacts).toBeGreaterThan(0)
    expect(physics.body(CUBE)!.position.y).toBeCloseTo(cubeRest, 1)
    expect(physics.isResting).toBe(true)
  })

  it('a block landing flat is one knock, however many contact points it touches down on', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: 0, y: 3, angle: 0 })
    let hard = 0
    let most = 0
    for (let t = 0; t < 1.5; t += STEP) {
      const report = physics.step(STEP)
      hard += report.hardKnocks
      most = Math.max(most, report.impacts)
    }
    expect(most).toBe(1)
    expect(hard).toBe(1)
  })

  it('a plank landing across two cubes is one knock, in the plank’s voice', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: -1, y: cubeRest, angle: 0 })
    physics.add(CUBE_B, { x: 1, y: cubeRest, angle: 0 })
    run(physics, 1)
    physics.add(PLANK, { x: 0, y: 2.2, angle: 0 })
    for (let t = 0; t < 1; t += STEP) {
      const report = physics.step(STEP)
      if (report.impacts === 0) continue
      expect(report.impacts).toBe(1)
      expect(report.impactIds[0]).toBe(PLANK)
      return
    }
    expect.unreachable('the plank never landed')
  })

  it('every hull separates on its own in-plane side normals only, with no edge-pair axes', () => {
    const physics = new PlayPhysics()
    for (const piece of PIECES) {
      const body = physics.add(piece.id, { x: 0, y: 3, angle: 0 })
      for (const shape of body.shapes) {
        const hull = shape as ConvexPolyhedron
        expect(hull.uniqueEdges).toHaveLength(0)
        const sides = hull.faces.length - 2
        expect(hull.uniqueAxes!.length).toBeGreaterThanOrEqual(Math.ceil(sides / 2))
        expect(hull.uniqueAxes!.length).toBeLessThanOrEqual(sides)
        for (const axis of hull.uniqueAxes!) {
          expect(axis.z).toBe(0)
          expect(axis.length()).toBeCloseTo(1, 6)
        }
      }
      physics.remove(piece.id)
    }
  })

  it('a cube dropped on a cube rests on top of it', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: 1, y: cubeRest, angle: 0 })
    physics.add(CUBE_B, { x: 1.05, y: 1 + cubeRest + 0.3, angle: 0 })
    run(physics, 3)
    expect(physics.body(CUBE_B)!.position.y).toBeCloseTo(1 + cubeRest, 1)
  })

  it('a plank balanced far off-centre on a cube topples to the rug', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: 0, y: cubeRest, angle: 0 })
    const plankRest = -SHAPES.plank.parts[0][0].y
    physics.add(PLANK, { x: 1.3, y: 1 + plankRest + 0.02, angle: 0 })
    run(physics, 4)
    const plank = physics.body(PLANK)!
    expect(plank.position.y).toBeLessThan(1)
  })

  it('doll weight at the edge of a wide stack stands, at the far end of an overhanging plank it tips', () => {
    const wide = new PlayPhysics()
    wide.add(ARCH, { x: 0, y: -SHAPES.archL.parts[0][0].y + 0.01, angle: 0 })
    run(wide, 2)
    wide.setLoad(ARCH, 0.4, 1.6)
    run(wide, 3)
    expect(Math.abs(angleOf(wide.body(ARCH)!))).toBeLessThan(0.05)

    const seesaw = new PlayPhysics()
    seesaw.add(CUBE, { x: 0, y: cubeRest, angle: 0 })
    const plankRest = -SHAPES.plank.parts[0][0].y
    seesaw.add(PLANK, { x: 0.35, y: 1 + plankRest, angle: 0 })
    run(seesaw, 2)
    expect(Math.abs(angleOf(seesaw.body(PLANK)!))).toBeLessThan(0.05)
    seesaw.setLoad(PLANK, 1.9, 1.32)
    run(seesaw, 3)
    expect(Math.abs(angleOf(seesaw.body(PLANK)!))).toBeGreaterThan(0.2)
  })

  it('a standing pillar with the doll on top stays up', () => {
    const physics = new PlayPhysics()
    physics.add(PILLAR, { x: -2, y: -SHAPES.pillar.parts[0][0].y, angle: 0 })
    run(physics, 1)
    physics.setLoad(PILLAR, -2.3, 1.9)
    run(physics, 3)
    expect(Math.abs(angleOf(physics.body(PILLAR)!))).toBeLessThan(0.05)
  })

  it('a held piece follows its target, pushes nothing, and drops when let go', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: 0, y: cubeRest, angle: 0 })
    physics.add(CUBE_B, { x: 3, y: cubeRest, angle: 0 })
    run(physics, 1)
    physics.hold(CUBE_B)
    physics.moveHeld(CUBE_B, 0, cubeRest, Math.PI / 2)
    run(physics, 0.5)
    expect(physics.body(CUBE_B)!.position.x).toBeCloseTo(0, 5)
    expect(angleOf(physics.body(CUBE_B)!)).toBeCloseTo(Math.PI / 2, 3)
    expect(physics.body(CUBE)!.position.x).toBeCloseTo(0, 2)
    physics.moveHeld(CUBE_B, 0, 1 + cubeRest + 0.2, 0)
    run(physics, 0.2)
    physics.release(CUBE_B, 0)
    run(physics, 3)
    expect(physics.body(CUBE_B)!.position.y).toBeCloseTo(1 + cubeRest, 1)
  })

  it('bodies stay on the build plane', () => {
    const physics = new PlayPhysics()
    physics.add(ARCH, { x: 0, y: 3, angle: 0.7 })
    physics.add(PLANK, { x: 0.4, y: 5, angle: -0.4 })
    physics.add(CUBE, { x: -0.3, y: 7, angle: 0.3 })
    run(physics, 4)
    for (const id of [ARCH, PLANK, CUBE]) {
      const body = physics.body(id)!
      expect(Math.abs(body.position.z)).toBeLessThan(1e-9)
      expect(Math.abs(body.quaternion.x) + Math.abs(body.quaternion.y)).toBeLessThan(1e-6)
    }
  })

  it('a straight tower with the doll on top settles, falls asleep and stops creeping', () => {
    const physics = new PlayPhysics()
    const tower = [CUBE, CUBE_B, 3, 8]
    tower.forEach((id, i) => physics.add(id, { x: 2, y: i + cubeRest + i * 0.01, angle: 0 }))
    run(physics, 2)
    physics.setLoad(8, physics.body(8)!.position.x + 0.05, 4)
    let t = 0
    while (!physics.isResting && t < 10) {
      physics.step(STEP)
      t += STEP
    }
    expect(physics.isResting, 'the loaded tower falls asleep').toBe(true)
    expect(t, 'seconds from the doll stepping on to rest (she waits for rest before climbing on)').toBeLessThan(2)
    const before = tower.map((id) => ({ x: physics.body(id)!.position.x, y: physics.body(id)!.position.y }))
    run(physics, 4)
    tower.forEach((id, i) => {
      const body = physics.body(id)!
      expect(Math.hypot(body.position.x - before[i].x, body.position.y - before[i].y), `cube ${id} creep over 4 s`).toBeLessThan(0.005)
    })
    expect(physics.isResting).toBe(true)
  })

  it('a plank bridges two cubes and holds the doll', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: -1, y: cubeRest, angle: 0 })
    physics.add(CUBE_B, { x: 1, y: cubeRest, angle: 0 })
    const plankRest = -SHAPES.plank.parts[0][0].y
    physics.add(PLANK, { x: 0, y: 1 + plankRest + 0.01, angle: 0 })
    run(physics, 2)
    physics.setLoad(PLANK, 0.2, 1 + 2 * plankRest)
    run(physics, 3)
    expect(Math.abs(angleOf(physics.body(PLANK)!))).toBeLessThan(0.03)
    expect(physics.body(PLANK)!.position.y).toBeCloseTo(1 + plankRest, 1)
  })

  it('removing a support lets what rested on it fall', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: 0, y: cubeRest, angle: 0 })
    physics.add(CUBE_B, { x: 0, y: 1 + cubeRest, angle: 0 })
    run(physics, 2)
    physics.remove(CUBE)
    run(physics, 2)
    expect(physics.body(CUBE_B)!.position.y).toBeCloseTo(cubeRest, 1)
  })
})
