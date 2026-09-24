import type { ConvexPolyhedron } from 'cannon-es'
import { describe, expect, it } from 'vitest'
import { BODY_R, HAIR, HEAD_R, HEAD_Y } from './doll'
import { angleOf, DOLL_PARTS, HARD_KNOCK, PlayPhysics, STEP } from './physics'
import { PIECES, pieceShape, pointInConvex, SHAPES, skylineAt, transformInto, worldParts, type Vec2 } from './pieces'

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

/** The deepest any corner of convex (counter-clockwise) `poly` lies inside convex `into`, 0 if none does. */
function cornerDepth(poly: readonly Vec2[], into: readonly Vec2[]): number {
  let deepest = 0
  for (const p of poly) {
    let inside = Infinity
    for (let i = 0; i < into.length; i++) {
      const a = into[i]
      const b = into[(i + 1) % into.length]
      const length = Math.hypot(b.x - a.x, b.y - a.y)
      inside = Math.min(inside, ((a.y - b.y) * (p.x - a.x) + (b.x - a.x) * (p.y - a.y)) / length)
    }
    deepest = Math.max(deepest, inside)
  }
  return deepest
}

/** How far piece `id` reaches into the painted head of the doll standing at (x, y): negative while it stays clear. */
function paintDepth(physics: PlayPhysics, id: number, x: number, y: number): number {
  const body = physics.body(id)!
  const middle = { x, y: y + HEAD_Y }
  let deepest = -Infinity
  for (const part of worldParts(pieceShape(id), { x: body.position.x, y: body.position.y, angle: angleOf(body) })) {
    let edge = Infinity
    for (let i = 0; i < part.length; i++) {
      const a = part[i]
      const b = part[(i + 1) % part.length]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const t = Math.max(0, Math.min(1, ((middle.x - a.x) * dx + (middle.y - a.y) * dy) / (dx * dx + dy * dy)))
      edge = Math.min(edge, Math.hypot(middle.x - a.x - dx * t, middle.y - a.y - dy * t))
    }
    deepest = Math.max(deepest, HEAD_R + HAIR - (pointInConvex(part, middle) ? -edge : edge))
  }
  return deepest
}

/** How far piece `id` and the doll standing at (x, y) reach into each other, 0 when apart. */
function dollOverlap(physics: PlayPhysics, id: number, x: number, y: number): number {
  const body = physics.body(id)!
  const piece = worldParts(pieceShape(id), { x: body.position.x, y: body.position.y, angle: angleOf(body) })
  const doll = DOLL_PARTS.map((part) => part.map((p) => ({ x: p.x + x, y: p.y + y })))
  let deepest = 0
  for (const a of piece) for (const b of doll) deepest = Math.max(deepest, cornerDepth(a, b), cornerDepth(b, a))
  return deepest
}

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

describe('PlayPhysics: the doll in the way', () => {
  it('a block dropped on her head bounces off her instead of passing through, and is heard knocking her over', () => {
    const physics = new PlayPhysics()
    physics.setDoll(0, 0, true)
    physics.add(CUBE, { x: 0.2, y: 4.5, angle: 0 })
    let hit = -1
    let deepest = 0
    let settledDepth = 0
    for (let t = 0; t < 3; t += STEP) {
      physics.setDoll(0, 0, true)
      const report = physics.step(STEP)
      if (report.dollHit >= 0) hit = report.dollHit
      const depth = dollOverlap(physics, CUBE, 0, 0)
      deepest = Math.max(deepest, depth)
      if (t > 1) settledDepth = Math.max(settledDepth, depth)
    }
    expect(hit).toBe(CUBE)
    expect(deepest, 'deepest in any one step of the fall').toBeLessThan(0.25)
    expect(settledDepth, 'once it has come down').toBeLessThan(0.02)
  })

  it('a block that comes down on her head, or leans on it, stops outside her paint', () => {
    for (const [id, dx, angle] of [
      [CUBE, 0, 0],
      [CUBE, 0.3, 0],
      [CUBE, -0.45, 0.4],
      [PLANK, 0.5, 0],
      [PLANK, -0.2, 0.3],
      [PILLAR, 0.35, Math.PI / 2],
    ] as const) {
      const physics = new PlayPhysics()
      physics.setDoll(0, 0, true)
      physics.add(id, { x: dx, y: 3.6, angle })
      let falling = -Infinity
      let after = -Infinity
      let touched = -1
      for (let t = 0; t < 3; t += STEP) {
        physics.setDoll(0, 0, true)
        physics.step(STEP)
        const depth = paintDepth(physics, id, 0, 0)
        if (touched < 0 && depth > -0.06) touched = t
        if (touched >= 0 && t - touched < 0.1) falling = Math.max(falling, depth)
        else if (touched >= 0) after = Math.max(after, depth)
      }
      const where = `${PIECES[id].kind} ${dx} over her, turned ${angle.toFixed(2)}`
      expect(touched, where).toBeGreaterThan(0)
      // Coming down it may dip a step's travel into her before the contact holds it, and is out again within a tenth of a second.
      expect(falling, `${where}, coming down`).toBeLessThan(0.08)
      expect(after, `${where}, after`).toBeLessThan(-0.01)
    }
  })

  it('a block sliding into her softly stops against her without knocking her over; a hard one knocks', () => {
    for (const speed of [1.5, HARD_KNOCK * 2]) {
      const physics = new PlayPhysics()
      physics.setDoll(0, 0, true)
      const start = -(BODY_R + 0.5) + 0.01
      physics.add(CUBE, { x: start, y: cubeRest, angle: 0 })
      physics.body(CUBE)!.velocity.set(speed, 0, 0)
      let hit = -1
      for (let t = 0; t < 1; t += STEP) {
        physics.setDoll(0, 0, true)
        const report = physics.step(STEP)
        if (report.dollHit >= 0) hit = report.dollHit
      }
      expect(hit, `came in at ${speed}`).toBe(speed > HARD_KNOCK ? CUBE : -1)
      expect(dollOverlap(physics, CUBE, 0, 0), `came in at ${speed}`).toBeLessThan(0.02)
    }
  })

  it('blocks at rest never meet her, so brushing past the build never shoves it', () => {
    const physics = new PlayPhysics()
    physics.add(CUBE, { x: 0, y: cubeRest, angle: 0 })
    run(physics, 1)
    const before = physics.body(CUBE)!.position.x
    for (let t = 0; t < 1; t += STEP) {
      physics.setDoll(2 - t * 1.2, 0, true)
      expect(physics.step(STEP).dollHit).toBe(-1)
    }
    expect(physics.body(CUBE)!.position.x).toBeCloseTo(before, 4)
  })

  it('the piece under her feet never knocks into her, even rocking under her weight', () => {
    const HALF = 5
    const halfRest = -Math.min(...SHAPES.half.parts.flat().map((p) => p.y))
    const feetX = 0.45
    const feetY = skylineAt([{ id: HALF, parts: worldParts(SHAPES.half, { x: 0, y: halfRest, angle: 0 }) }], feetX)
    for (const standsOn of [HALF, null]) {
      const physics = new PlayPhysics()
      physics.add(HALF, { x: 0, y: halfRest, angle: 0 })
      physics.setDoll(feetX, feetY, true, standsOn)
      // Her outline dips into the dome beside her feet; the dome rocks hard enough to count as a knock.
      expect(dollOverlap(physics, HALF, feetX, feetY)).toBeGreaterThan(0.01)
      physics.body(HALF)!.angularVelocity.set(0, 0, 5)
      let hit = -1
      for (let i = 0; i < 6; i++) {
        const report = physics.step(STEP)
        if (report.dollHit >= 0) hit = report.dollHit
      }
      expect(hit, standsOn === null ? 'not her support' : 'her support').toBe(standsOn === null ? HALF : -1)
    }
  })

  it('out of the build plane (up with the kite, or tumbled out in front) she meets nothing', () => {
    const physics = new PlayPhysics()
    physics.setDoll(0, 0, false)
    physics.add(CUBE, { x: 0, y: 4.5, angle: 0 })
    let hit = -1
    for (let t = 0; t < 2; t += STEP) {
      const report = physics.step(STEP)
      if (report.dollHit >= 0) hit = report.dollHit
    }
    expect(hit).toBe(-1)
    expect(physics.body(CUBE)!.position.y).toBeCloseTo(cubeRest, 1)
  })
})

/** Whether `p` is inside polygon `poly` (any shape, either winding). */
function insidePolygon(poly: readonly Vec2[], p: Vec2): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    if (a.y > p.y !== b.y > p.y && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

function edgeDistance(poly: readonly Vec2[], p: Vec2): number {
  let best = Infinity
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i]
    const b = poly[(i + 1) % poly.length]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
    best = Math.min(best, Math.hypot(p.x - a.x - dx * t, p.y - a.y - dy * t))
  }
  return best
}

/** How deep the drawn outlines of pieces `a` and `b` reach into each other, walking each outline in steps of a few hundredths. */
function drawnOverlap(physics: PlayPhysics, a: number, b: number): number {
  const drawn = (id: number) => {
    const body = physics.body(id)!
    return transformInto(pieceShape(id).outline, { x: body.position.x, y: body.position.y, angle: angleOf(body) }, [])
  }
  const A = drawn(a)
  const B = drawn(b)
  let deepest = 0
  for (const [from, into] of [
    [A, B],
    [B, A],
  ]) {
    for (let i = 0; i < from.length; i++) {
      const p = from[i]
      const q = from[(i + 1) % from.length]
      const n = Math.max(1, Math.ceil(Math.hypot(q.x - p.x, q.y - p.y) / 0.03))
      for (let k = 0; k < n; k++) {
        const at = { x: p.x + ((q.x - p.x) * k) / n, y: p.y + ((q.y - p.y) * k) / n }
        if (insidePolygon(into, at)) deepest = Math.max(deepest, edgeDistance(into, at))
      }
    }
  }
  return deepest
}

describe('PlayPhysics: pieces resting on pieces', () => {
  // Ids: 0 cube, 2 large arch, 4 plank, 5 half, 7 small arch, 9 half.
  it('a piece dropped on another comes to rest on its drawn surface, and a landing dips in only briefly', () => {
    let worstRest = 0
    let worstDip = 0
    let longestDip = 0
    let cases = 0
    for (const base of [2, 7, 5, 4, 0]) {
      for (const drop of [4, 0, 9]) {
        if (PIECES[drop].kind === PIECES[base].kind) continue
        for (const x of [-1.2, -0.4, 0.3, 1.1]) {
          for (const h of [0.3, 1.2]) {
            for (const angle of [0, -0.6]) {
              const physics = new PlayPhysics()
              const baseShape = pieceShape(base)
              physics.add(base, { x: 0, y: -Math.min(...baseShape.outline.map((p) => p.y)), angle: 0 })
              run(physics, 1)
              const top = Math.max(...baseShape.outline.map((p) => p.y + physics.body(base)!.position.y))
              const under = -Math.min(...transformInto(pieceShape(drop).outline, { x: 0, y: 0, angle }, []).map((p) => p.y))
              physics.add(drop, { x, y: top + under + h, angle })
              let dipFor = 0
              for (let t = 0; t < 3; t += STEP) {
                physics.step(STEP)
                const depth = drawnOverlap(physics, base, drop)
                worstDip = Math.max(worstDip, depth)
                dipFor = depth > 0.03 ? dipFor + STEP : 0
                longestDip = Math.max(longestDip, dipFor)
              }
              worstRest = Math.max(worstRest, drawnOverlap(physics, base, drop))
              cases++
            }
          }
        }
      }
    }
    expect(cases).toBe(192)
    expect(worstRest, 'at rest').toBeLessThan(0.02)
    // A step's travel at landing speed, held for a few frames at most while the contact pushes it back out.
    expect(worstDip, 'deepest landing').toBeLessThan(0.25)
    expect(longestDip, 'longest a landing stays in more than 0.03').toBeLessThan(0.15)
  })
})
