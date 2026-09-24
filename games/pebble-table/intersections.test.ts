import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { describe, expect, it, vi } from 'vitest'
import { pairDepth, preparePiece, type CameraInfo, type MaterialInfo } from '../../scripts/intersections/core'
import { BAG_HEADING, bagExit, bagMouth, bagShape, bagTip, SACK_MOUTH, type BagShape } from './bag'
import { TableController, yardSpots } from './controller'
import { albumSlot, BAG, DOOR, FEEDING, HOUSE_FOOTPRINT, SCALE, shelfTile, TABLE, type MatKey, type Point, type Quarters } from './layout'
import { GUEST_ARM, GUEST_RADIUS, GUEST_REACH, guestArms, GUEST_TOP, guestYaw } from './feeding'
import { MotionDirector, SEAT_SPECIES, type ActionKind, type MotionPose } from './motion'
import { PART_PIECES, partCollider, partCover, partPieceVertices, partReachDown, partRest, partVertices, SHELL, STOOL_REACH, STOOL_TOP, surfacePoints, type Lumped } from './partShape'
import { HOLD_HEIGHT, PAN_REST_HEIGHT, STEP, stoneRadius3, TablePhysics, to3, toWorld2, UNIT } from './physics3d'
import { JARS, PART_KINDS, type PartKind } from './parts'
import { panDrops, SWAY_MOST } from './scale'
import { defaultTable } from './state'
import { pebbleRings, STONE_CUTS, STONE_DRAWN_RADIUS, STONE_SEGMENTS, stoneReachAlong, stoneReachDown, stoneRest, stoneVertices } from './stoneShape'
import { BOWL_FLOOR, DECAL_LIFT, decalReach, feedingFloor, HEM_LINE, hemAt, ON_RUG, PAN_FLOOR, PAN_ROLL, panRimReach, PLATE_HEIGHT, PLATE_PROFILE, PLATE_TOP, ROPE_KNOT, RUG, RUG_HEM_REACH, RUG_HEM_TOP, surfaceUnder, type Surfaces } from './surfaces'
import { ARM_AT, GUEST_SIZE, guestFloor, NECK_Y, poseGuest, soleDepth, speciesShapes } from './view/guest'
import {
  ALBUM_SCALE,
  albumGeometry,
  bagGeometry,
  CHOOSER_SCALE,
  chooserGeometry,
  DOOR_FARTHEST,
  doorLeafGeometry,
  doorSwing,
  easeOutBack,
  feedingShapes,
  GHOST_BELOW,
  GHOST_REACH,
  houseGeometry,
  HUB_RADIUS,
  MOUSE_SCALE,
  mouseGeometry,
  panHang,
  partGeometry,
  PIVOT_Y,
  POST_LIFT,
  ROPE_REACH,
  ropeMatrix,
  ropeRun,
  type RopeBall,
  scaleShapes,
  STONE_COVER,
  stoneCover,
  stoneMatrix,
  stoneRoom,
  type StoneMotion,
  type StoneState,
} from './view/models'
import { ghostFloor, stoneStates } from './view/game'
import * as geo from './view/geometry'
import { comingOut, DOOR_HINGE, DOOR_SWING, doorwayGap, goingHome, houseGap, VISITOR_GAP, VISITOR_REACH, visitorGone, visitorPose, visitorWalk, type VisitorPose, type VisitorTimes } from './visitors'
import { chunk } from './voice'

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

const CLAY: MaterialInfo = { type: 'MeshStandardMaterial', side: THREE.FrontSide, transparent: false, opacity: 1, depthTest: true, depthWrite: true, polygonOffset: false, colorWrite: true, customVertex: false, renderOrder: 0 }
// The pieces measured here are closed shapes, so no camera has to say which side of one is inside.
const CAMERA: CameraInfo = { position: [0, 200, 0], forward: [0, -1, 0], ortho: false, near: 1, far: 1000, fov: 27, orthoHeight: 0, view: [], projection: [], viewport: [1180, 820], logDepth: false }

/** A drawn shape placed as the intersection audit reads it: its triangles in world space. */
function auditPiece(name: string, geometry: THREE.BufferGeometry, matrix: THREE.Matrix4) {
  const position = geometry.getAttribute('position')
  const positions = new Float32Array(position.count * 3)
  const v = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) v.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(positions, i * 3)
  const index = geometry.getIndex()
  return preparePiece({ id: name, mesh: name, label: name, object: name, positions, index: index ? Uint32Array.from(index.array) : null, material: CLAY })
}

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

  it('keeps every stone that lands on, slides into or rests beside the rug hem out of its rope', () => {
    const hemDistance = (x: number, z: number) => {
      let near = Infinity
      for (let i = 1; i < HEM_LINE.length; i++) {
        const [a, b] = [to3(HEM_LINE[i - 1]), to3(HEM_LINE[i])]
        const [dx, dz] = [b.x - a.x, b.z - a.z]
        const k = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz)))
        near = Math.min(near, Math.hypot(x - a.x - k * dx, z - a.z - k * dz))
      }
      return near
    }
    let deepest = 0
    for (const [out, speed] of [[-2, 0], [0, 0], [1.5, 0], [3.2, 0], [7, -25]] as const) {
      const physics = new TablePhysics()
      physics.setMat('feeding')
      const spots = Array.from({ length: 12 }, (_, k) => {
        const a = ((k + 0.37) / 12) * Math.PI * 2
        const hem = hemAt(a / (Math.PI * 2))
        const [nx, nz] = [Math.cos(a) / RUG.rx, Math.sin(a) / RUG.rz]
        const n = Math.hypot(nx, nz)
        const at = { x: hem.x + (nx / n) * (out / UNIT), y: hem.y + (nz / n) * (out / UNIT) }
        return { q: SIZES[k % 3], at, velocity: { x: (nx / n) * speed, y: 0, z: (nz / n) * speed } }
      })
      spots.forEach(({ q, at, velocity }, i) => physics.addStone(i + 1, q, at, { y: stoneRest(q) + 1.5, velocity }))
      run(physics, 2)
      spots.forEach(({ q }, i) => {
        const body = physics.body(i + 1)!
        for (const p of drawnPoints(q).map((local) => toWorld(body, local))) {
          if (p.y < RUG_HEM_TOP - 0.02) deepest = Math.max(deepest, RUG_HEM_REACH - hemDistance(p.x, p.z))
        }
      })
    }
    expect(deepest).toBeLessThan(0.05)
  })
})

/** A stone as the view reads it: a body at `at` (cm) turned by `turn`. */
const stoneAt = (id: number, q: Quarters, at: { x: number; y: number; z: number }, turn: { x: number; y: number; z: number; w: number }, pulse = 0): StoneState => ({
  id,
  q,
  position: { x: at.x, y: at.y, z: at.z },
  quaternion: [turn.x, turn.y, turn.z, turn.w],
  velocityY: 0,
  held: false,
  pulse,
  glow: 0,
})

const still = (stone: StoneState): StoneMotion => ({ stone, amount: 0, rock: 0, pop: 1 })

function stoneGeometry(q: Quarters): THREE.BufferGeometry {
  const geometry = new THREE.SphereGeometry(1, STONE_SEGMENTS, pebbleRings(STONE_SEGMENTS))
  geometry.attributes.position.array.set(stoneVertices(STONE_CUTS[q], STONE_SEGMENTS))
  return geometry
}

describe('the guidance ghost stone lies on what it is lifted from and carried over', () => {
  it("lifts the ghost stone over the bowl's side, a plate's rim and the rug's hem rather than into them", () => {
    const table = new TableController({ ...defaultTable(6), liveMat: 'feeding', seats: FEEDING.seats.map(() => true) }, { save: () => {} })
    const shapes = feedingShapes()
    const rug = to3(RUG.center)
    const place = (at: Point, y: number) => new THREE.Matrix4().makeTranslation(to3(at).x, y, to3(at).z)
    const drawn = [
      auditPiece('hem', shapes.rugRope, new THREE.Matrix4().makeTranslation(rug.x, 0, rug.z)),
      auditPiece('bowl', shapes.bowl, place(FEEDING.bowl, ON_RUG)),
      ...FEEDING.seats.map((seat, index) => auditPiece(`plate ${index}`, shapes.plate, place(seat.plate, ON_RUG))),
    ]
    const pebble = geo.pebble(20)
    const size = new THREE.Vector3().setScalar(stoneRadius3(4))
    const spots = [FEEDING.bowl, ...FEEDING.seats.map((seat) => seat.plate), ...HEM_LINE.filter((_, i) => i % 20 === 0)]
    let met = 0
    for (const spot of spots) {
      for (let dx = -160; dx <= 160; dx += 20) {
        for (let dy = -160; dy <= 160; dy += 20) {
          const at = { x: spot.x + dx, y: spot.y + dy }
          const p = to3(at, Math.max(1.4, ghostFloor(table, at) + GHOST_BELOW))
          const ghost = auditPiece('ghost', pebble, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).scale(size))
          for (const piece of drawn) {
            if (!ghost.box.intersectsBox(piece.box)) continue
            met++
            expect(pairDepth(ghost, piece, CAMERA)?.depth ?? 0, `${piece.id} at ${at.x}, ${at.y}`).toBeLessThan(0.05)
          }
        }
      }
    }
    expect(met).toBeGreaterThan(100)
  }, 30_000)

  it('lays the ghost stone on top of every stone it would reach into, however they lie in a heap', () => {
    const table = new TableController({ ...defaultTable(6), bag: 40, total: 40 }, { save: () => {} })
    table.setProjector({ toScreen: (v) => toWorld2(v), toPlane: (screen) => screen })
    let clock = 0
    for (let i = 0; i < 10; i++) {
      const to = { x: 560 + (i % 4) * 22, y: 640 + Math.floor(i / 4) * 22 }
      table.pointerDown(2, BAG, (clock += 10))
      for (let k = 1; k <= 10; k++) {
        table.pointerMove(2, { x: BAG.x + ((to.x - BAG.x) * k) / 10, y: BAG.y + ((to.y - BAG.y) * k) / 10 }, (clock += 16))
        table.step(1 / 60)
      }
      for (let t = 0; t < 0.2; t += 1 / 60) table.step(1 / 60)
      table.pointerUp(2, to, (clock += 150))
      for (let t = 0; t < 0.6; t += 1 / 60) table.step(1 / 60)
    }
    for (let t = 0; t < 3; t += 1 / 60) table.step(1 / 60)
    const ghostLow = Math.min(...drawnPoints(4).map((p) => p.y))
    const ids = table.physics.stoneIds()
    let under = 0
    for (const id of ids) {
      const body = table.physics.body(id)!
      const centre = new CANNON.Vec3(body.position.x, 0, body.position.z)
      centre.y = Math.max(1.4, ghostFloor(table, toWorld2(centre)) + GHOST_BELOW)
      for (const other of ids) {
        const b = table.physics.body(other)!
        const reached = drawnPoints(table.quartersOf(other))
          .map((p) => toWorld(b, p))
          .filter((p) => Math.hypot(p.x - centre.x, p.z - centre.z) < GHOST_REACH)
        if (!reached.length) continue
        under++
        expect(centre.y + ghostLow).toBeGreaterThanOrEqual(Math.max(...reached.map((p) => p.y)) - 1e-6)
      }
    }
    expect(ids.length).toBeGreaterThan(8)
    expect(under).toBeGreaterThan(ids.length)
  })

  it('lays the ghost stone over a loose acorn, shell, stick or boulder it is carried over, however it came to lie', () => {
    let seed = 5
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const parts = PART_KINDS.map((kind, i) => ({ id: 900 + i, kind, x: 560 + i * 60, y: 660 }))
    const table = new TableController({ ...defaultTable(6), liveMat: 'scale', parts }, { save: () => {} })
    for (const part of parts) table.physics.addPart(part.id, part.kind, part, { y: 4, spin: (random() - 0.5) * 6, yaw: random() * Math.PI * 2 })
    for (let t = 0; t < 2; t += 1 / 60) table.step(1 / 60)
    const pebble = geo.pebble(20)
    const size = new THREE.Vector3().setScalar(stoneRadius3(4))
    let [deepest, met, worst] = [0, 0, '']
    for (const part of parts) {
      const body = table.physics.body(part.id)!
      const drawn = auditPiece(part.kind, partGeometry(part.kind), new THREE.Matrix4().compose(new THREE.Vector3(body.position.x, body.position.y, body.position.z), new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w), new THREE.Vector3(1, 1, 1)))
      const middle = toWorld2(body.position)
      for (let dx = -100; dx <= 100; dx += 10) {
        for (let dy = -100; dy <= 100; dy += 10) {
          const at = { x: middle.x + dx, y: middle.y + dy }
          const p = to3(at, Math.max(1.4, ghostFloor(table, at) + GHOST_BELOW))
          const ghost = auditPiece('ghost', pebble, new THREE.Matrix4().makeTranslation(p.x, p.y, p.z).scale(size))
          if (!ghost.box.intersectsBox(drawn.box)) continue
          met++
          const depth = pairDepth(ghost, drawn, CAMERA)?.depth ?? 0
          if (depth > deepest) [deepest, worst] = [depth, `${part.kind} at ${dx}, ${dy}`]
        }
      }
    }
    expect(met, 'the ghost stone never came near a part, so this measures nothing').toBeGreaterThan(100)
    expect(deepest, worst).toBeLessThan(0.05)
  }, 30_000)
})

describe('stones are drawn on what they land on', () => {
  it('measures how far a turned stone reaches down to its drawing', () => {
    let seed = 3
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (const q of SIZES) {
      const points = drawnPoints(q)
      for (let trial = 0; trial < 20; trial++) {
        const turn = new CANNON.Quaternion(random() - 0.5, random() - 0.5, random() - 0.5, random() - 0.5).normalize()
        const body = new CANNON.Body({ mass: 0 })
        body.quaternion.copy(turn)
        expect(stoneReachDown(q, turn.x, turn.y, turn.z, turn.w), `size ${q}`).toBeCloseTo(-lowest(body, points), 4)
      }
    }
  })

  it('draws a stone dropped from the hand on the table, however hard it lands in the physics', () => {
    const table = new TableController({ ...defaultTable(6), bag: 40, total: 40 }, { save: () => {} })
    table.setProjector({ toScreen: (v) => toWorld2(v), toPlane: (screen) => screen })
    let [dipped, drawn, clock] = [Infinity, Infinity, 0]
    for (let i = 0; i < 6; i++) {
      const to = { x: 560 + i * 60, y: 640 }
      table.pointerDown(2, BAG, (clock += 10))
      for (let k = 1; k <= 10; k++) {
        table.pointerMove(2, { x: BAG.x + ((to.x - BAG.x) * k) / 10, y: BAG.y + ((to.y - BAG.y) * k) / 10 }, (clock += 16))
        table.step(1 / 60)
      }
      table.pointerUp(2, to, (clock += 16))
      for (let t = 0; t < 0.8; t += 1 / 60) {
        table.step(1 / 60)
        const surfaces = table.physics.surfaces(table.state.liveMat, table.state.seats)
        for (const stone of stoneStates(table)) {
          const body = table.physics.body(stone.id)
          if (!body || stone.held) continue
          // Under a hanging pan, a stone lies on the table.
          const under = surfaceUnder(toWorld2(body.position), surfaces)
          const ground = body.position.y > under ? under : 0
          const low = lowest(body, drawnPoints(stone.q)) - body.position.y
          dipped = Math.min(dipped, body.position.y + low - ground)
          drawn = Math.min(drawn, stone.position.y + low - ground)
        }
      }
    }
    expect(dipped, 'no stone dipped into the table as it landed, so this measures nothing').toBeLessThan(-0.1)
    expect(drawn).toBeGreaterThan(-1e-6)
  })
})

describe('loose parts are drawn on what they land on', () => {
  it('measures how far a turned part reaches down to within a hair of its drawing, and never past it', () => {
    let seed = 5
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (const kind of PART_KINDS) {
      const v = partVertices(kind)
      for (let trial = 0; trial < 40; trial++) {
        const q = new THREE.Quaternion(random() - 0.5, random() - 0.5, random() - 0.5, random() - 0.5).normalize()
        const down = new THREE.Vector3(0, -1, 0).applyQuaternion(q.clone().invert())
        let reach = -Infinity
        for (let i = 0; i < v.length; i += 3) reach = Math.max(reach, v[i] * down.x + v[i + 1] * down.y + v[i + 2] * down.z)
        const measured = partReachDown(kind, q.x, q.y, q.z, q.w)
        expect(measured, kind).toBeLessThanOrEqual(reach + 1e-6)
        expect(measured, kind).toBeGreaterThan(reach - 0.03)
      }
    }
  })

  it('draws a part landing fast on a stone out of it, and never lets a shell or stick sink into one', () => {
    for (const kind of PART_KINDS) {
      const physics = new TablePhysics()
      physics.addStone(1, 4, { x: 800, y: 700 })
      run(physics, 1)
      const stone = physics.body(1)!
      const { shape, local } = collider(stone)
      const v = partVertices(kind)
      const points = Array.from({ length: v.length / 3 }, (_, i) => new CANNON.Vec3(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]))
      physics.addPart(2, kind, { x: 800, y: 700 }, { y: stone.position.y + 8, velocity: { x: 0, y: -130, z: 0 } })
      const part = physics.body(2)!
      let [raw, drawn] = [0, 0]
      for (let t = 0; t < 0.6; t += STEP) {
        physics.step(STEP)
        const lift = physics.sunk(new Set([part])).get(part) ?? new CANNON.Vec3()
        for (const point of points) {
          const at = toWorld(part, point)
          raw = Math.max(raw, depthInside(shape, local(toLocal(stone, at))))
          drawn = Math.max(drawn, depthInside(shape, local(toLocal(stone, at.vadd(lift)))))
        }
      }
      if (!partCollider(kind).prism) expect(raw, `${kind}: how deep its balls sink (cm)`).toBeLessThan(0.2)
      expect(drawn, `${kind}: how deep it is drawn in (cm)`).toBeLessThan(0.05)
    }
  })

  it('draws a stick pressed into one lying on a stone lifted off it, not the one under it pushed into the stone', () => {
    const physics = new TablePhysics()
    physics.addStone(1, 4, { x: 800, y: 700 })
    run(physics, 1)
    const stone = physics.body(1)!
    const { shape, local } = collider(stone)
    physics.addPart(2, 'stick', { x: 800, y: 700 }, { y: stone.position.y + 3 })
    run(physics, 1.5)
    physics.addPart(3, 'stick', { x: 800, y: 700 })
    const [under, over] = [physics.body(2)!, physics.body(3)!]
    expect(under.sleepState, 'the stick under has settled on the stone').toBe(CANNON.Body.SLEEPING)
    over.position.copy(under.position)
    over.quaternion.setFromAxisAngle(CANNON.Vec3.UNIT_Y, Math.PI / 2).mult(under.quaternion, over.quaternion)
    over.position.y += 2 * partRest('stick') - 0.6
    over.updateAABB()
    under.updateAABB()
    const v = partVertices('stick')
    const points = Array.from({ length: v.length / 3 }, (_, i) => new CANNON.Vec3(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]))
    const inStone = (lift: CANNON.Vec3) => Math.max(...points.map((point) => depthInside(shape, local(toLocal(stone, toWorld(under, point).vadd(lift))))))
    const sunk = physics.sunk(new Set([under, over]))
    const [down, up] = [sunk.get(under) ?? new CANNON.Vec3(), sunk.get(over) ?? new CANNON.Vec3()]
    expect(up.y - down.y, 'the sticks are drawn apart').toBeGreaterThan(0.5)
    expect(inStone(down), 'how deep the stick under is drawn in the stone (cm)').toBeLessThan(Math.max(0.02, inStone(new CANNON.Vec3()) + 0.01))

    // Two pressed together with nothing else in the way each move half the way apart.
    physics.addPart(4, 'stick', { x: 400, y: 700 })
    physics.addPart(5, 'stick', { x: 400, y: 700 })
    const [low, high] = [physics.body(4)!, physics.body(5)!]
    high.quaternion.setFromAxisAngle(CANNON.Vec3.UNIT_Y, Math.PI / 2)
    high.position.y = low.position.y + 2 * partRest('stick') - 0.6
    low.updateAABB()
    high.updateAABB()
    const apart = physics.sunk(new Set([low, high]))
    expect(apart.get(high)!.y - apart.get(low)!.y, 'the two are drawn apart about as far as they overlap, not twice as far').toBeLessThan(1)
  })

  it('draws sticks and shells tipped out of their jars onto a stone on it and never in it, however they tumble and pile up', () => {
    let seed = 7
    const random = vi.spyOn(Math, 'random').mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
    const topDown = { toScreen: (v: { x: number; z: number }) => toWorld2(v), toPlane: (screen: Point) => screen }
    let clock = 0
    let [deepest, worst, near] = [0, '', 0]
    try {
      for (const [kind, trials] of [['stick', 16], ['shell', 6]] as const) {
        const v = partVertices(kind)
        const points = Array.from({ length: v.length / 3 }, (_, i) => new CANNON.Vec3(v[i * 3], v[i * 3 + 1], v[i * 3 + 2]))
        const tip = (table: TableController) => {
          table.pointerDown(1, JARS[kind], (clock += 10))
          table.pointerUp(1, JARS[kind], (clock += 80))
        }
        const spill = new TableController({ ...defaultTable(6), liveMat: 'scale' }, { save: () => {} })
        spill.setProjector(topDown)
        tip(spill)
        for (let t = 0; t < 2.5; t += 1 / 60) spill.step(1 / 60)
        const landed = spill.state.parts.map((part) => toWorld2(spill.physics.body(part.id)!.position))
        for (let trial = 0; trial < trials; trial++) {
          const spot = landed[trial % landed.length]
          const at = { x: spot.x + (Math.random() - 0.5) * 60, y: spot.y + (Math.random() - 0.5) * 60 }
          const table = new TableController({ ...defaultTable(6), liveMat: 'scale', pieces: [{ id: 500, q: SIZES[trial % 3], x: at.x, y: at.y }], bag: 39 }, { save: () => {} })
          table.setProjector(topDown)
          for (let t = 0; t < 1; t += 1 / 60) table.step(1 / 60)
          tip(table)
          for (let frame = 0; frame < 180; frame++) {
            table.step(1 / 60)
            const stone = table.physics.body(500)
            if (frame % 2 || !stone) continue
            const { shape, local } = collider(stone)
            const parts = table.state.parts.flatMap((part) => table.physics.body(part.id) ?? [])
            const sunk = table.physics.sunk(new Set(parts))
            stone.updateAABB()
            for (const part of parts) {
              part.updateAABB()
              if (!part.aabb.overlaps(stone.aabb)) continue
              const lift = sunk.get(part) ?? new CANNON.Vec3()
              let depth = -Infinity
              for (const point of points) depth = Math.max(depth, depthInside(shape, local(toLocal(stone, toWorld(part, point).vadd(lift)))))
              if (depth > -0.3) near++
              if (depth > deepest) [deepest, worst] = [depth, `${kind} ${part.id} on a ${SIZES[trial % 3]}-quarter stone, trial ${trial}, frame ${frame}`]
            }
          }
        }
      }
    } finally {
      random.mockRestore()
    }
    expect(near, 'no part came to the stone, so this measures nothing').toBeGreaterThan(200)
    expect(deepest, worst).toBeLessThan(0.12)
  }, 60_000)

  it("holds a shell's drawn back, belly and rim within a hair of its balls, and lays it down on its lowest point", () => {
    const { balls } = partCollider('shell')
    const points = surfacePoints(partPieceVertices('shell', 'body'), SHELL.body.segments, SHELL.body.rings, 0.05)
    let [outside, lowest] = [0, Infinity]
    for (let i = 0; i < points.length; i += 3) {
      lowest = Math.min(lowest, points[i + 1])
      outside = Math.max(outside, Math.min(...balls.map((b) => Math.hypot(points[i] - b.x, points[i + 1] - b.y, points[i + 2] - b.z) - b.r)))
    }
    expect(outside).toBeLessThan(0.13)
    expect(Math.min(...balls.map((b) => b.y - b.r))).toBeCloseTo(lowest, 6)
  })

  it('settles spilled acorns, shells and sticks against and on one another without one drawn inside another', () => {
    let seed = 11
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const kinds = (['acorn', 'shell', 'stick', 'shell', 'acorn', 'shell'] as const).flatMap((kind) => [kind, kind])
    const drawn = new Map(PART_KINDS.map((kind) => [kind, partGeometry(kind)]))
    let [deepest, met, worst] = [0, 0, '']
    for (let heap = 0; heap < 3; heap++) {
      const physics = new TablePhysics()
      kinds.forEach((kind, i) => physics.addPart(i + 1, kind, { x: 700 + (random() - 0.5) * 80, y: 500 + (random() - 0.5) * 80 }, { y: 2 + i * 1.2, spin: (random() - 0.5) * 6, yaw: random() * Math.PI * 2 }))
      run(physics, 4)
      const pieces = kinds.map((kind, i) => {
        const body = physics.body(i + 1)!
        const matrix = new THREE.Matrix4().compose(new THREE.Vector3(body.position.x, body.position.y, body.position.z), new THREE.Quaternion(body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w), new THREE.Vector3(1, 1, 1))
        return { kind, piece: auditPiece(`${kind} ${i + 1}`, drawn.get(kind)!, matrix) }
      })
      pieces.forEach((a, i) =>
        pieces.slice(i + 1).forEach((b) => {
          if (!a.piece.box.intersectsBox(b.piece.box)) return
          met++
          const depth = pairDepth(a.piece, b.piece, CAMERA)?.depth ?? 0
          if (depth > deepest) [deepest, worst] = [depth, `${a.piece.id} in ${b.piece.id}, heap ${heap}`]
        }),
      )
    }
    expect(met, 'no two parts came to lie together, so this measures nothing').toBeGreaterThan(20)
    expect(deepest, worst).toBeLessThan(0.25)
  }, 60_000)
})

describe('stones squash, rock and pop without sinking or swelling into a neighbour', () => {
  const geometries = new Map(SIZES.map((q) => [q, stoneGeometry(q)]))
  const drawn = (motion: StoneMotion, keep: number) => pointsOf(geometries.get(motion.stone.q)!, stoneMatrix(motion, keep, new THREE.Matrix4()))
  const lowestOf = (motion: StoneMotion, keep = 1) => Math.min(...drawn(motion, keep).map((p) => p.y))
  /** How deep any drawn point of `motion`'s stone, kept by `keep`, lies inside `other`'s. */
  const depthInto = (motion: StoneMotion, keep: number, other: StoneMotion, otherKeep: number) => {
    const matrix = stoneMatrix(other, otherKeep, new THREE.Matrix4())
    const geometry = geometries.get(other.stone.q)!
    const inside = insideOf(geometry, matrix)
    const distance = distanceTo(geometry, matrix)
    const box = new THREE.Box3().setFromPoints(pointsOf(geometry, matrix))
    return Math.max(0, ...drawn(motion, keep).filter((p) => box.containsPoint(p) && inside(p)).map(distance))
  }
  const settledHeap = () => {
    const physics = new TablePhysics()
    let seed = 23
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const sizes: Quarters[] = []
    for (let i = 0; i < 10; i++) {
      sizes.push(SIZES[i % 3])
      physics.addStone(i + 1, SIZES[i % 3], { x: 700 + (random() - 0.5) * 80, y: 500 + (random() - 0.5) * 80 }, { y: 2 + i * 1.6, spin: (random() - 0.5) * 6 })
    }
    run(physics, 4)
    return sizes.map((q, i) => {
      const body = physics.body(i + 1)!
      return stoneAt(i + 1, q, body.position, body.quaternion)
    })
  }
  const loudest = (stone: StoneState, k: number): StoneMotion => ({ stone, amount: k % 2 ? -0.3 : 0.35, rock: k % 3 === 0 ? 0.35 : -0.35, pop: 1.28 })

  it('turns and scales a stone about its lowest point, however it lies', () => {
    let seed = 5
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (let trial = 0; trial < 45; trial++) {
      const q = SIZES[trial % 3]
      const turn = new THREE.Quaternion().setFromEuler(new THREE.Euler(random() * Math.PI * 2, random() * Math.PI * 2, random() * Math.PI * 2))
      const rest = still(stoneAt(1, q, { x: 0, y: 5, z: 0 }, turn))
      const moved: StoneMotion = { ...rest, amount: -0.3 + random() * 0.65, rock: (random() - 0.5) * 0.7, pop: 1 + random() * 0.28 }
      expect(Math.abs(lowestOf(moved) - lowestOf(rest)), `trial ${trial}`).toBeLessThan(1e-4)
    }
  })

  it('never swells a stone in a heap into another, one at a time or all at once', () => {
    const heap = settledHeap()
    const rest = heap.map(still)
    const baseline = (a: number, b: number) => depthInto(rest[a], 1, rest[b], 1)
    heap.forEach((stone, i) => {
      const motions = rest.map((m, j) => (j === i ? loudest(stone, i) : m))
      const keep = stoneRoom(motions[i], motions)
      heap.forEach((_, j) => {
        if (j !== i) expect(depthInto(motions[i], keep, rest[j], 1), `stone ${i + 1} into ${j + 1}`).toBeLessThan(baseline(i, j) + 0.01)
      })
    })
    const all = heap.map(loudest)
    const keeps = all.map((m) => stoneRoom(m, all))
    all.forEach((m, i) =>
      all.forEach((other, j) => {
        if (j !== i) expect(depthInto(m, keeps[i], other, keeps[j]), `stone ${i + 1} into ${j + 1}, all moving`).toBeLessThan(baseline(i, j) + 0.01)
      }),
    )
  }, 30_000)

  it('pops a stone lying on another in full, and holds back the one under it', () => {
    const identity = new THREE.Quaternion()
    const under = stoneAt(1, 4, { x: 0, y: stoneRest(4), z: 0 }, identity, 1)
    const top = stoneRest(4) + stoneReachAlong(4, 0, 1, 0)
    const over = stoneAt(2, 4, { x: 0.4, y: top + stoneRest(4), z: 0.2 }, identity, 1)
    const motions = [loudest(under, 0), loudest(over, 1)]
    expect(stoneRoom(motions[1], [still(under), motions[1]])).toBe(1)
    expect(depthInto(motions[1], 1, still(under), 1)).toBe(0)
    expect(stoneRoom(motions[0], [motions[0], still(over)])).toBe(0)
  })

  it('draws no shadow or glow wholly inside the stone lying on it', () => {
    const lyingStones = [...SIZES.map((q, i) => stoneAt(i + 1, q, { x: 0, y: stoneRest(q), z: 0 }, new THREE.Quaternion())), ...settledHeap()].filter((stone) => lowestOf(still(stone)) < 0.05)
    for (const stone of lyingStones) {
      const matrix = stoneMatrix(still(stone), 1, new THREE.Matrix4())
      const inside = insideOf(geometries.get(stone.q)!, matrix)
      const smallest = stoneRadius3(stone.q) * STONE_COVER
      const edge = Array.from({ length: 32 }, (_, k) => new THREE.Vector3(stone.position.x + Math.cos((k / 32) * Math.PI * 2) * smallest, DECAL_LIFT, stone.position.z + Math.sin((k / 32) * Math.PI * 2) * smallest))
      expect(edge.some((p) => !inside(p)), `stone ${stone.id} (size ${stone.q}) hides a decal of ${smallest.toFixed(2)} cm`).toBe(true)
    }
  })
})

type Pose = { lean: number; twist: number; roll: number; squash: number }
const STILL: Pose = { lean: 0, twist: 0, roll: 0, squash: 0 }

/** A seated guest's drawn body in the world (cm), posed and stood on its floor the way the view does it. */
function guestBody(seat: number, pose: Pose = STILL): THREE.Vector3[] {
  const shapes = speciesShapes(SEAT_SPECIES[seat % SEAT_SPECIES.length])
  const root = new THREE.Object3D()
  const [wide, tall] = [1 + pose.squash * 0.6, 1 - pose.squash]
  root.scale.set(GUEST_SIZE * wide, GUEST_SIZE * tall, GUEST_SIZE * wide)
  root.rotation.set(pose.lean, pose.twist, pose.roll)
  root.updateMatrix()
  const at = FEEDING.seats[seat].guest
  const p = to3(at)
  const place = new THREE.Matrix4().makeTranslation(p.x, guestFloor(seat, at) + soleDepth(shapes.sole, root.matrix), p.z).multiply(new THREE.Matrix4().makeRotationY(guestYaw(seat))).multiply(root.matrix)
  const position = shapes.body.attributes.position
  return Array.from({ length: position.count }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(place))
}

const toPlane = (v: THREE.Vector3) => ({ x: v.x / UNIT + 800, y: v.z / UNIT + 500 })

/** A seated guest's drawn arms in the world (cm) in motion pose `m`, stood on its floor the way the view does it. */
function guestArmPoints(seat: number, m: MotionPose): THREE.Vector3[] {
  const shapes = speciesShapes(SEAT_SPECIES[seat % SEAT_SPECIES.length])
  const root = new THREE.Object3D()
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Object3D()
    arm.position.set(side * ARM_AT[0], ARM_AT[1], ARM_AT[2])
    root.add(arm)
    return arm
  })
  const head = new THREE.Object3D()
  head.position.set(0, NECK_Y, 0)
  root.add(head)
  poseGuest({ root, head, nose: new THREE.Object3D(), cheeks: [null, null], ears: [null, null], arms }, shapes, m, { yaw: 0, pitch: 0 }, 1)
  root.updateMatrix()
  const at = FEEDING.seats[seat].guest
  root.position.y = guestFloor(seat, at) + soleDepth(shapes.sole, root.matrix) + Math.max(0, m.lift)
  const place = new THREE.Object3D()
  const p = to3(at)
  place.position.set(p.x, 0, p.z)
  place.rotation.y = guestYaw(seat)
  place.add(root)
  place.updateMatrixWorld(true)
  return arms.flatMap((arm) => pointsOf(shapes.arm, arm.matrixWorld))
}

/** A guest's idling poses over a while, with and without a tummy rumble pushing its arms forward (models.tsx); a wave or a hop is left out, and a stone never rests where one reaches (controller.ts). */
function idlePoses(seat: number): MotionPose[] {
  const director = new MotionDirector(SEAT_SPECIES[seat % SEAT_SPECIES.length], seat, 0)
  const poses: MotionPose[] = []
  for (let t = 0; t < 12; t += 0.1) {
    const m = director.sample(t, true, 0)
    poses.push(m)
    for (const k of [1, 0.4]) poses.push({ ...m, squash: m.squash + 0.06 * k, headPitch: m.headPitch + 0.22, armForward: [m.armForward[0] + 0.5 * k, m.armForward[1] + 0.5 * k] })
  }
  return poses
}

describe('guests stand on what is drawn under them', () => {
  const seats = FEEDING.seats.map((_, seat) => seat)
  const floorOf = (seat: number) => feedingFloor(FEEDING.seats[seat].guest, GUEST_RADIUS * UNIT)

  it('keeps each seated guest clear of its plate, leaning in to eat or not', () => {
    const plateReach = FEEDING.plateRadius * UNIT * 1.04
    const plateTop = ON_RUG + (Math.max(...PLATE_PROFILE.map(([, h]) => h)) + 0.04) * PLATE_HEIGHT
    for (const seat of seats) {
      const plate = FEEDING.seats[seat].plate
      for (const lean of [0, 0.22]) {
        const over = guestBody(seat, { ...STILL, lean }).filter((v) => Math.hypot(toPlane(v).x - plate.x, toPlane(v).y - plate.y) * UNIT < plateReach)
        expect(Math.min(Infinity, ...over.map((v) => v.y)), `seat ${seat} leaning ${lean}`).toBeGreaterThan(plateTop)
      }
    }
  })

  it('stands each guest with its lowest point on the highest thing under it as it leans, rolls, twists and squashes', () => {
    let seed = 5
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    for (const seat of seats) {
      const floor = guestFloor(seat, FEEDING.seats[seat].guest)
      for (let trial = 0; trial < 12; trial++) {
        const pose = { lean: (random() * 2 - 1) * 0.22, twist: (random() * 2 - 1) * 1.5, roll: (random() * 2 - 1) * 0.2, squash: -0.14 + random() * 0.42 }
        const low = Math.min(...guestBody(seat, pose).map((v) => v.y))
        expect(Math.abs(low - floor), `seat ${seat} ${JSON.stringify(pose)}`).toBeLessThan(0.01)
      }
    }
  })

  it('stands no guest taller than its collider, however it stretches, hops or springs in', () => {
    const top = (geometry: THREE.BufferGeometry, y = 0) => Math.max(...pointsOf(geometry, new THREE.Matrix4().makeTranslation(0, y, 0)).map((v) => v.y))
    const floor = Math.max(...FEEDING.seats.map((seat, i) => guestFloor(i, seat.guest)))
    const kinds: ActionKind[] = ['react', 'eat', 'poke', 'arrive', 'delight']
    for (const species of new Set(SEAT_SPECIES)) {
      const shapes = speciesShapes(species)
      const bottom = Math.min(...pointsOf(shapes.body, new THREE.Matrix4()).map((v) => v.y))
      const height = Math.max(top(shapes.body), top(shapes.head, NECK_Y), ...(shapes.ears ?? []).map((ear) => top(ear, NECK_Y + 5.6))) - bottom
      let tallest = 0
      for (let seed = 0; seed < 4; seed++) {
        const director = new MotionDirector(species, seed, 0)
        let [t, arrived] = [0, -Infinity]
        for (let round = 0; round < 30; round++) {
          const kind = kinds[round % kinds.length]
          director.trigger(kind, t)
          if (kind === 'arrive') arrived = t
          for (let k = 0; k < 150; k++, t += 1 / 60) {
            const since = (t - arrived) / 0.4
            const pop = since < 1 ? Math.max(0.01, easeOutBack(since)) : 1
            for (const reach of [0, 1]) {
              const m = director.sample(t, reach > 0, reach)
              tallest = Math.max(tallest, floor + Math.max(0, m.lift) + height * GUEST_SIZE * (1 - m.squash) * pop)
            }
          }
        }
      }
      expect(tallest, species).toBeLessThanOrEqual(GUEST_TOP[species])
      expect(GUEST_TOP[species] - tallest, species).toBeLessThan(1)
    }
  })

  it('reaches no farther from a guest\'s middle than GUEST_REACH, however it waves, hops or springs in', () => {
    const kinds: ActionKind[] = ['react', 'eat', 'poke', 'arrive', 'delight']
    let farthest = 0
    for (const species of new Set(SEAT_SPECIES)) {
      const shapes = speciesShapes(species)
      const root = new THREE.Object3D()
      const arms = [-1, 1].map((side) => {
        const arm = new THREE.Object3D()
        arm.position.set(side * ARM_AT[0], ARM_AT[1], ARM_AT[2])
        root.add(arm)
        return arm
      })
      const head = new THREE.Object3D()
      head.position.set(0, NECK_Y, 0)
      root.add(head)
      const rig = { root, head, nose: new THREE.Object3D(), cheeks: [null, null], ears: [null, null], arms }
      const parts: [THREE.BufferGeometry, THREE.Object3D][] = [[shapes.body, root], ...arms.map((arm): [THREE.BufferGeometry, THREE.Object3D] => [shapes.arm, arm])]
      const v = new THREE.Vector3()
      for (let seed = 0; seed < 2; seed++) {
        const director = new MotionDirector(species, seed, 0)
        let [t, arrived] = [0, -Infinity]
        for (let round = 0; round < 20; round++) {
          const kind = kinds[round % kinds.length]
          director.trigger(kind, t)
          if (kind === 'arrive') arrived = t
          for (let k = 0; k < 150; k += 4, t += 4 / 60) {
            const since = (t - arrived) / 0.4
            const pop = since < 1 ? Math.max(0.01, easeOutBack(since)) : 1
            for (const reach of [0, 1]) {
              const m = director.sample(t, reach > 0, reach)
              for (const rumble of [0, 1]) {
                const posed = { ...m, squash: m.squash + 0.06 * rumble, armForward: [m.armForward[0] + 0.5 * rumble, m.armForward[1] + 0.5 * rumble] as [number, number] }
                poseGuest(rig, shapes, posed, { yaw: 0, pitch: 0 }, pop)
                root.updateMatrixWorld(true)
                for (const [geometry, node] of parts) {
                  const position = geometry.attributes.position
                  for (let i = 0; i < position.count; i += 2) farthest = Math.max(farthest, Math.hypot(v.fromBufferAttribute(position, i).applyMatrix4(node.matrixWorld).x, v.z))
                }
              }
            }
          }
        }
      }
    }
    expect(farthest).toBeLessThanOrEqual(GUEST_REACH)
    expect(GUEST_REACH - farthest).toBeLessThan(0.5)
  })

  it('holds each seated guest\'s arms inside its collider as it idles and rumbles', () => {
    for (const seat of seats) {
      const floor = feedingFloor(FEEDING.seats[seat].guest, GUEST_RADIUS * UNIT)
      const arms = guestArms(seat).map((arm) => to3(arm))
      let out = -Infinity
      for (const m of idlePoses(seat)) {
        for (const v of guestArmPoints(seat, m)) {
          const past = Math.min(...arms.map((arm) => Math.max(Math.hypot(v.x - arm.x, v.z - arm.z) - GUEST_ARM.r, floor + GUEST_ARM.low - v.y, v.y - floor - GUEST_ARM.high)))
          out = Math.max(out, past)
        }
      }
      expect(out, `seat ${seat}: an arm reaches this far out of its collider (cm)`).toBeLessThan(0)
      expect(out, `seat ${seat}: the arm colliders stand this far off the arms (cm)`).toBeGreaterThan(-0.4)
    }
  })

  it('leans a stone tipped against a guest\'s side on its arm, never around it', () => {
    const drawn = new Map(SIZES.map((q) => [q, drawnPoints(q)]))
    let leaned = 0
    for (const seat of seats) {
      const species = SEAT_SPECIES[seat % SEAT_SPECIES.length]
      const guest = to3(FEEDING.seats[seat].guest)
      const armPoints = idlePoses(seat).filter((_, i) => i % 6 === 0).flatMap((m) => guestArmPoints(seat, m))
      guestArms(seat).forEach((arm, side) => {
        for (const q of [4, 1] as const) {
          const physics = new TablePhysics()
          physics.setMat('feeding')
          physics.setPlates(FEEDING.seats.map(() => true))
          physics.setGuest(`guest-${seat}`, seat, GUEST_TOP[species])
          const a = to3(arm)
          const u = new THREE.Vector3(guest.x - a.x, 0, guest.z - a.z).normalize()
          const r = stoneRadius3(q)
          const start = new THREE.Vector3(a.x, a.y, a.z).addScaledVector(u, -(GUEST_ARM.r + r * 0.55 + 0.5))
          // Stood on its edge, its face to the guest and its top tipped 20 degrees toward it.
          const turn = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(-u.z, 0, u.x), (70 * Math.PI) / 180)
          physics.addStone(1, q, toPlane(start), { y: r + 0.2 })
          const body = physics.body(1)!
          body.quaternion.set(turn.x, turn.y, turn.z, turn.w)
          body.position.y = r + 0.2
          run(physics, 2.5)
          const { shape, local } = collider(body)
          const deepest = Math.max(...armPoints.map((v) => depthInside(shape, local(toLocal(body, new CANNON.Vec3(v.x, v.y, v.z))))))
          expect(deepest, `seat ${seat} ${side ? 'right' : 'left'} arm, size ${q}: the arm sinks this deep into the stone (cm)`).toBeLessThan(0.1)
          const top = Math.max(...drawn.get(q)!.map((p) => toWorld(body, p).y))
          if (top > floorOf(seat) + GUEST_ARM.low) leaned++
        }
      })
    }
    expect(leaned, 'stones left standing tall enough to reach an arm').toBeGreaterThan(8)
  })

  it('never stands a guest in the rug, its hem or the table', () => {
    for (const seat of seats) {
      const sunk = Math.max(...guestBody(seat).map((v) => feedingFloor(toPlane(v), 0) - v.y))
      expect(sunk, `seat ${seat}`).toBeLessThanOrEqual(1e-6)
    }
  })
})

/** Unique world-space vertices of a geometry placed by `matrix`. */
function pointsOf(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.Vector3[] {
  const position = geometry.attributes.position
  const seen = new Map<string, THREE.Vector3>()
  for (let i = 0; i < position.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(position, i).applyMatrix4(matrix)
    seen.set(`${v.x.toFixed(4)},${v.y.toFixed(4)},${v.z.toFixed(4)}`, v)
  }
  return [...seen.values()]
}

const RAYS = [new THREE.Vector3(0.5377, 0.7071, 0.4581), new THREE.Vector3(-0.6231, 0.2213, -0.7502), new THREE.Vector3(0.1279, -0.8813, 0.455)].map((d) => d.normalize())

/** A test for points inside a closed shape placed by `matrix`: odd crossings along most of three rays. */
function insideOf(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): (p: THREE.Vector3) => boolean {
  const placed = (geometry.index ? geometry.toNonIndexed() : geometry.clone()).applyMatrix4(matrix)
  const bvh = new MeshBVH(placed)
  const ray = new THREE.Ray()
  const odd = (p: THREE.Vector3, dir: THREE.Vector3) => {
    const hits = bvh.raycast(ray.set(p, dir), THREE.DoubleSide).map((h) => h.distance).sort((a, b) => a - b)
    return hits.filter((d, i) => d > 1e-7 && (i === 0 || d - hits[i - 1] > 1e-6)).length % 2 === 1
  }
  return (p) => RAYS.filter((dir) => odd(p, dir)).length >= 2
}

/** How far a point is from the nearest surface of a shape placed by `matrix`. */
function distanceTo(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4): (p: THREE.Vector3) => number {
  const bvh = new MeshBVH(geometry.clone().applyMatrix4(matrix))
  return (p) => bvh.closestPointToPoint(p)?.distance ?? Infinity
}

describe('the scale hangs together at every tilt', () => {
  const shapes = scaleShapes()
  const post = to3(SCALE.post)
  const postAt = new THREE.Matrix4().makeTranslation(post.x, POST_LIFT, post.z)
  const beamAt = (angle: number) => new THREE.Matrix4().makeTranslation(post.x, PIVOT_Y, post.z).multiply(new THREE.Matrix4().makeRotationZ(-angle))
  const tilts = [-SCALE.maxTilt, 0, SCALE.maxTilt]
  const hangs = (angle: number, sway: number) =>
    ([0, 1] as const).map((side) => ({ side, ...panHang(side, angle, PAN_REST_HEIGHT - panDrops(angle)[side] * UNIT, sway) }))

  it('hangs every pan rope from knot to knot, clear of the beam and the pans', () => {
    for (const angle of tilts) {
      const inBeam = insideOf(shapes.beam, beamAt(angle))
      for (const sway of [-1.6, 1.6]) {
        for (const { side, center, top, rims } of hangs(angle, sway)) {
          const inPan = insideOf(shapes.pans[side], new THREE.Matrix4().makeTranslation(center.x, center.y, center.z))
          rims.forEach((rim, k) => {
            const free = pointsOf(shapes.chain, ropeMatrix(top, rim, new THREE.Matrix4())).filter((v) => v.distanceTo(top) > ROPE_KNOT.radius && v.distanceTo(rim) > ROPE_KNOT.radius)
            expect(free.filter(inBeam).length, `rope ${side}.${k} in the beam at tilt ${angle}, swing ${sway}`).toBe(0)
            expect(free.filter(inPan).length, `rope ${side}.${k} in its pan at tilt ${angle}, swing ${sway}`).toBe(0)
          })
        }
      }
    }
  })

  it('presses every knot into what it hangs from or sits on, by nearly the same at every tilt and swing', () => {
    const pressed = new Map<string, number[]>()
    const note = (key: string, depth: number) => pressed.set(key, [...(pressed.get(key) ?? []), depth])
    for (const angle of tilts) {
      const toBeam = distanceTo(shapes.beam, beamAt(angle))
      for (const sway of [-1.6, 0, 1.6]) {
        for (const { side, center, top, rims } of hangs(angle, sway)) {
          note(`top ${side}`, ROPE_KNOT.radius - toBeam(top))
          const toPan = distanceTo(shapes.pans[side], new THREE.Matrix4().makeTranslation(center.x, center.y, center.z))
          rims.forEach((rim, k) => note(`rim ${side}.${k}`, ROPE_KNOT.radius - toPan(rim)))
        }
      }
    }
    for (const [key, depths] of pressed) {
      expect(Math.min(...depths), key).toBeGreaterThan(0.05)
      expect(Math.max(...depths) - Math.min(...depths), key).toBeLessThan(0.15)
    }
  })

  it('draws every rope piece within its reach of the line between its ends', () => {
    const [from, to] = [new THREE.Vector3(1, 2, 3), new THREE.Vector3(4, -6, 5)]
    const line = new THREE.Line3(from, to)
    const farthest = Math.max(...pointsOf(shapes.chain, ropeMatrix(from, to, new THREE.Matrix4())).map((v) => v.distanceTo(line.closestPointToPoint(v, true, new THREE.Vector3()))))
    expect(farthest).toBeLessThanOrEqual(ROPE_REACH + 1e-6)
    expect(farthest).toBeGreaterThan(ROPE_REACH * 0.9)
  })

  it('lays each pan rope over a stone or part carried into it, never through it, and leaves it straight past one', () => {
    // Held, a part is drawn 1.12x, so its cover grows as much, and a stone stretches up to a tenth
    // and lifts a hair, so each ball of its cover grows by a tenth of how far it reaches, and more.
    // Over a pan, where its ropes are, they ride at HOLD_HEIGHT or as high as clears its rim and
    // knots, with HOLD_ROOM (1 cm) between (see `heldAt`): lowest, and tightest under the rim, at
    // that. A thing is picked up as it lay: as drawn or turned about the vertical, an acorn also on
    // its side.
    const turns = (kind: PartKind | 'stone') => [
      new THREE.Quaternion(),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 1.1, 0)),
      ...(kind === 'acorn' ? [new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.6, Math.PI / 2))] : []),
    ]
    type Grown = { at: THREE.Vector3; radius: number }
    type Held = { name: string; geometry: THREE.BufferGeometry; matrix: (at: THREE.Vector3) => THREE.Matrix4; balls: (at: THREE.Vector3) => RopeBall[]; size: number; rest: number }
    const heldAs = (name: string, geometry: THREE.BufferGeometry, grown: Grown[], matrix: Held['matrix'], rest: number): Held => ({
      name,
      geometry,
      matrix,
      rest,
      balls: (at) => grown.map((ball) => ({ center: ball.at.clone().add(at), radius: ball.radius })),
      size: Math.max(...grown.map((ball) => ball.at.length() + ball.radius)),
    })
    const held: Held[] = [
      ...([1, 4] as Quarters[]).flatMap((q) =>
        turns('stone').map((turn, k) => {
          const grown = stoneCover(q).map((ball): Grown => {
            const at = new THREE.Vector3(ball.x, ball.y, ball.z)
            return { at: at.clone().applyQuaternion(turn), radius: ball.r + (at.length() + ball.r) * 0.1 + 0.1 }
          })
          return heldAs(`stone ${q} ${k}`, stoneGeometry(q), grown, (at) => stoneMatrix({ stone: stoneAt(0, q, at, turn), amount: -0.1, rock: 0, pop: 1 }, 1, new THREE.Matrix4()), stoneRest(q))
        }),
      ),
      ...PART_KINDS.flatMap((kind) =>
        turns(kind).map((turn, k) => {
          const grown = partCover(kind).map((ball): Grown => ({ at: new THREE.Vector3(ball.x, ball.y, ball.z).applyQuaternion(turn).multiplyScalar(1.12), radius: ball.r * 1.12 }))
          return heldAs(`${kind} ${k}`, partGeometry(kind), grown, (at) => new THREE.Matrix4().compose(at, turn, new THREE.Vector3(1.12, 1.12, 1.12)), partRest(kind))
        }),
      ),
    ]
    const up = new THREE.Vector3(0, 1, 0)
    let [laid, wrapped, measured, closest] = [0, 0, 0, Infinity]
    for (const angle of tilts) {
      const inBeam = insideOf(shapes.beam, beamAt(angle))
      for (const { side, center: panAt, top, rims } of hangs(angle, 0)) {
        const inPan = insideOf(shapes.pans[side], new THREE.Matrix4().makeTranslation(panAt.x, panAt.y, panAt.z))
        const panTop = panAt.y + panRimReach(SCALE.pans[side].r * UNIT).knots
        rims.forEach((rim, k) => {
          const along = rim.clone().sub(top).normalize()
          const across = new THREE.Vector3().crossVectors(along, up).normalize()
          const level = new THREE.Vector3(along.x, 0, along.z).normalize()
          for (const piece of held)
            for (const aside of [across, level])
              for (const off of [-0.5, 0, 0.5]) {
                  const height = Math.max(HOLD_HEIGHT, panTop + piece.rest + 1)
                  const at = top.clone().lerp(rim, (top.y - height) / (top.y - rim.y)).addScaledVector(aside, off * piece.size)
                  const balls = piece.balls(at)
                  const run = ropeRun(top, rim, [balls])
                  const where = `${piece.name} on rope ${side}.${k} at tilt ${angle}, ${height.toFixed(1)} cm, ${off} aside`
                  laid++
                  if (run.length > 2) wrapped++
                  expect([run[0], run.at(-1)]).toEqual([top, rim])
                  // A ball reaching a knot is passed closer (see `ropeRun`): measured against the drawing instead.
                  const atKnot = (c: THREE.Vector3, radius: number) => Math.min(c.distanceTo(top), c.distanceTo(rim)) < (radius + ROPE_REACH) * 1.1 + 0.1
                  let knotted = false
                  for (let i = 0; i + 1 < run.length; i++) {
                    const line = new THREE.Line3(run[i], run[i + 1])
                    for (const ball of balls) {
                      const c = new THREE.Vector3(ball.center.x, ball.center.y, ball.center.z)
                      if (atKnot(c, ball.radius)) knotted = true
                      else closest = Math.min(closest, c.distanceTo(line.closestPointToPoint(c, true, new THREE.Vector3())) - ball.radius - ROPE_REACH)
                    }
                    const free = pointsOf(shapes.chain, ropeMatrix(run[i], run[i + 1], new THREE.Matrix4())).filter((v) => v.distanceTo(top) > ROPE_KNOT.radius && v.distanceTo(rim) > ROPE_KNOT.radius)
                    expect(free.filter(inBeam).length, `rope in the beam: ${where}`).toBe(0)
                    expect(free.filter(inPan).length, `rope in its pan: ${where}`).toBe(0)
                  }
                  if (knotted || (angle === 0 && off === 0)) {
                    const drawn = auditPiece(piece.name, piece.geometry, piece.matrix(at))
                    for (let i = 0; i + 1 < run.length; i++) {
                      measured++
                      expect(pairDepth(drawn, auditPiece('rope', shapes.chain, ropeMatrix(run[i], run[i + 1], new THREE.Matrix4())), CAMERA)?.depth ?? 0, where).toBe(0)
                    }
                  }
                  const past = top.clone().lerp(rim, 0.5).addScaledVector(across, piece.size * 2 + 1)
                  expect(ropeRun(top, rim, [piece.balls(past)]), `rope bent by ${piece.name} beside it`).toEqual([top, rim])
                }
        })
      }
    }
    expect(laid).toBeGreaterThan(500)
    expect(wrapped).toBeGreaterThan(laid * 0.6)
    expect(measured).toBeGreaterThan(300)
    expect(closest).toBeGreaterThan(0)
  }, 60_000)

  it('covers every part with balls a rope is laid over, standing off its drawing by little', () => {
    for (const kind of PART_KINDS) {
      const cover = partCover(kind)
      let outside = -Infinity
      for (const [piece, lumped] of Object.entries(PART_PIECES[kind] as Record<string, Lumped>)) {
        const points = surfacePoints(partPieceVertices(kind, piece), lumped.segments, lumped.rings, 0.05)
        for (let i = 0; i < points.length; i += 3) {
          let inside = -Infinity
          for (const ball of cover) inside = Math.max(inside, ball.r - Math.hypot(points[i] - ball.x, points[i + 1] - ball.y, points[i + 2] - ball.z))
          outside = Math.max(outside, -inside)
        }
      }
      expect(outside, kind).toBeLessThanOrEqual(0)
      expect(Math.max(...cover.map((ball) => ball.r)), kind).toBeLessThan(kind === 'boulder' ? 1.6 : 0.75)
    }
  })

  const panPieces = new Map<string, ReturnType<typeof auditPiece>>()
  /** A pan drawn where it hangs, measured once for each place it hangs. */
  const drawnPan = (side: 0 | 1, x: number, y: number, z: number) => {
    const key = [side, x, y, z].map((v) => v.toFixed(4)).join()
    let piece = panPieces.get(key)
    if (!piece) panPieces.set(key, (piece = auditPiece('pan', shapes.pans[side], new THREE.Matrix4().makeTranslation(x, y, z))))
    return piece
  }

  it('lets a stone let go over either rolled rim, at any tilt, roll off it without sinking into the clay', () => {
    const SEGMENTS = 14
    let [deepest, met] = [0, 0]
    // Tilted one way, one pan rides up and the other down.
    for (const angle of [0, SCALE.maxTilt]) {
      for (const q of [4, 1] as const) {
        for (const half of [0, 0.5]) {
          const physics = new TablePhysics()
          physics.setMat('scale')
          physics.setPanDrops(panDrops(angle))
          run(physics, 0.1)
          ;([0, 1] as const).forEach((side) => {
            const pan = SCALE.pans[side]
            const top = physics.panY(side) + PAN_ROLL.y + pan.r * UNIT * PAN_ROLL.radius * PAN_ROLL.tube
            for (let i = 0; i < SEGMENTS; i++) {
              const a = ((i + half) / SEGMENTS) * Math.PI * 2
              const at = { x: pan.x + Math.cos(a) * pan.r * PAN_ROLL.radius, y: pan.y + Math.sin(a) * pan.r * PAN_ROLL.radius }
              physics.addStone(side * 100 + i + 1, q, at, { y: top + stoneRest(q) + 0.2 })
            }
          })
          for (let frame = 0; frame < 60; frame++) {
            physics.step(1 / 60)
            if (frame % 3) continue
            ;([0, 1] as const).forEach((side) => {
              const at = to3(SCALE.pans[side])
              const drawn = drawnPan(side, at.x, physics.panY(side), at.z)
              for (let i = 0; i < SEGMENTS; i++) {
                const body = physics.body(side * 100 + i + 1)
                if (!body) continue
                const stone = stoneAt(side * 100 + i + 1, q, body.position, body.quaternion)
                const piece = auditPiece('stone', stoneGeometry(q), stoneMatrix(still(stone), 1, new THREE.Matrix4()))
                if (!piece.box.intersectsBox(drawn.box)) continue
                met++
                deepest = Math.max(deepest, pairDepth(piece, drawn, CAMERA)?.depth ?? 0)
              }
            })
          }
        }
      }
    }
    expect(met, 'no stone came near a pan, so this measures nothing').toBeGreaterThan(1000)
    expect(deepest).toBeLessThan(0.2)
  }, 60_000)

  it('carries a stone over a pan riding high on the beam, never through its rolled rim', () => {
    const table = new TableController({ ...defaultTable(6), bag: 40, total: 40 }, { save: () => {} })
    table.setProjector({ toScreen: (v) => toWorld2(v), toPlane: (screen) => screen })
    const [left, right] = SCALE.pans
    let clock = 0
    const carry = (path: readonly Point[], frames: number, each: () => void = () => {}) => {
      table.pointerDown(2, path[0], (clock += 10))
      for (let k = 1; k <= frames; k++) {
        const f = (k / frames) * (path.length - 1)
        const [a, b] = [path[Math.floor(f)], path[Math.min(path.length - 1, Math.floor(f) + 1)]]
        table.pointerMove(2, { x: a.x + (b.x - a.x) * (f % 1), y: a.y + (b.y - a.y) * (f % 1) }, (clock += 16))
        table.step(1 / 60)
        each()
      }
    }
    for (let i = 0; i < 4; i++) {
      carry([BAG, { x: left.x + (i - 1.5) * 30, y: left.y }], 40)
      table.pointerUp(2, { x: left.x + (i - 1.5) * 30, y: left.y }, (clock += 16))
      for (let t = 0; t < 1; t += 1 / 60) table.step(1 / 60)
    }
    for (let t = 0; t < 3; t += 1 / 60) table.step(1 / 60)
    expect(table.physics.panY(1) - PAN_REST_HEIGHT, 'the right pan never rode up, so this measures nothing').toBeGreaterThan(3)
    let [deepest, met] = [0, 0]
    const across = [BAG, { x: right.x - right.r - 60, y: right.y }, { x: right.x + right.r + 60, y: right.y }]
    carry(across, 150, () => {
      for (const stone of stoneStates(table).filter((stone) => stone.held)) {
        const piece = auditPiece('stone', stoneGeometry(stone.q), stoneMatrix(still(stone), 1, new THREE.Matrix4()))
        ;([0, 1] as const).forEach((side) => {
          const at = to3(SCALE.pans[side])
          const pan = drawnPan(side, at.x + table.physics.panSwung(side), table.physics.panY(side), at.z)
          const [a, b] = [piece.box, pan.box]
          if (a.max.x < b.min.x || a.min.x > b.max.x || a.max.z < b.min.z || a.min.z > b.max.z) return
          met++
          deepest = Math.max(deepest, pairDepth(piece, pan, CAMERA)?.depth ?? 0)
        })
      }
    })
    expect(met, 'the stone was never carried over a pan, so this measures nothing').toBeGreaterThan(20)
    expect(deepest).toBe(0)
  }, 60_000)

  it('swings each pan with what lies in it, never sliding its rim through a stone', () => {
    const table = new TableController({ ...defaultTable(6), bag: 40, total: 40 }, { save: () => {} })
    table.setProjector({ toScreen: (v) => toWorld2(v), toPlane: (screen) => screen })
    const [left, right] = SCALE.pans
    let [deepest, swung, met, clock] = [0, 0, 0, 0]
    // Carried out of the bag, held over the spot, then let go.
    const drop = (to: Point, settle: number) => {
      table.pointerDown(2, BAG, (clock += 10))
      for (let k = 1; k <= 40; k++) {
        const f = Math.min(1, k / 30)
        table.pointerMove(2, { x: BAG.x + (to.x - BAG.x) * f, y: BAG.y + (to.y - BAG.y) * f }, (clock += 16))
        table.step(1 / 60)
      }
      table.pointerUp(2, to, (clock += 16))
      for (let t = 0; t < settle; t += 1 / 60) {
        table.step(1 / 60)
        ;([0, 1] as const).forEach((side) => {
          const sway = table.physics.panSwung(side)
          swung = Math.max(swung, Math.abs(sway))
          const at = to3(SCALE.pans[side])
          const pan = auditPiece('pan', shapes.pans[side], new THREE.Matrix4().makeTranslation(at.x + sway, table.physics.panY(side), at.z))
          for (const stone of stoneStates(table)) {
            if (stone.held) continue
            const piece = auditPiece('stone', stoneGeometry(stone.q), stoneMatrix(still(stone), 1, new THREE.Matrix4()))
            if (!piece.box.intersectsBox(pan.box)) continue
            met++
            deepest = Math.max(deepest, pairDepth(piece, pan, CAMERA)?.depth ?? 0)
          }
        })
      }
    }
    for (const a of [0, Math.PI, 0.4, Math.PI - 0.4]) drop({ x: left.x + Math.cos(a) * left.r * 0.6, y: left.y + Math.sin(a) * left.r * 0.6 }, 1.2)
    for (let i = 0; i < 6; i++) drop({ x: right.x, y: right.y }, 1.6)
    expect(swung, 'the pans never swung, so this measures nothing').toBeGreaterThan(1)
    expect(met, 'no stone lay in a pan, so this measures nothing').toBeGreaterThan(1000)
    expect(deepest).toBeLessThan(0.1)
  }, 60_000)

  it('turns the beam on its round hub, so the post meets the beam only there', () => {
    const inPost = insideOf(shapes.post, postAt)
    const pivot = new THREE.Vector3(post.x, PIVOT_Y, post.z)
    for (let angle = -SCALE.maxTilt; angle <= SCALE.maxTilt + 1e-9; angle += SCALE.maxTilt / 4) {
      const inBeam = insideOf(shapes.beam, beamAt(angle))
      const stray = [...pointsOf(shapes.post, postAt).filter(inBeam), ...pointsOf(shapes.beam, beamAt(angle)).filter(inPost)].filter((v) => v.distanceTo(pivot) > HUB_RADIUS * 1.001)
      expect(stray.length, `tilt ${angle}`).toBe(0)
    }
  })

  it('draws the post as a closed solid standing flat on the table, a hair above its contact shadow', () => {
    const lowest = Math.min(...pointsOf(shapes.post, postAt).map((v) => v.y))
    expect(lowest).toBeGreaterThan(DECAL_LIFT)
    expect(lowest).toBeLessThan(0.1)
    const position = shapes.post.attributes.position
    const at = (v: number) => Math.round(v * 1e4) + 0
    const key = (i: number) => `${at(position.getX(i))},${at(position.getY(i))},${at(position.getZ(i))}`
    const edges = new Map<string, number>()
    for (let t = 0; t < position.count / 3; t++) {
      const [a, b, c] = [key(t * 3), key(t * 3 + 1), key(t * 3 + 2)]
      if (a === b || b === c || a === c) continue
      for (const edge of [[a, b], [b, c], [c, a]].map((pair) => pair.sort().join('|'))) edges.set(edge, (edges.get(edge) ?? 0) + 1)
    }
    expect([...edges.values()].filter((n) => n !== 2).length).toBe(0)
  })
})

/** How far a shape reaches from its upright axis, so it holds whichever way the shape turns. */
function footprint(geometry: THREE.BufferGeometry, scale: number): number {
  const position = geometry.attributes.position
  let reach = 0
  for (let i = 0; i < position.count; i++) reach = Math.max(reach, Math.hypot(position.getX(i), position.getZ(i)))
  return reach * scale
}

describe('the choosers and the album stand apart on the shelf', () => {
  const mats: readonly MatKey[] = ['scale', 'feeding', 'door']
  const spacing = (shelfTile(1).y - shelfTile(0).y) * UNIT

  it('never draws two neighbouring choosers into each other, whichever two are on the shelf', () => {
    for (const a of mats) {
      for (const b of mats) {
        if (a === b) continue
        expect(footprint(chooserGeometry(a), CHOOSER_SCALE) + footprint(chooserGeometry(b), CHOOSER_SCALE), `${a} above ${b}`).toBeLessThan(spacing)
      }
    }
  })

  it('never draws the album into the chooser above it, even as it springs in', () => {
    let overshoot = 0
    for (let t = 0; t <= 1; t += 0.01) overshoot = Math.max(overshoot, easeOutBack(t))
    const album = footprint(albumGeometry(), ALBUM_SCALE * overshoot)
    const gap = (albumSlot().y - shelfTile(1).y) * UNIT
    for (const mat of mats) expect(footprint(chooserGeometry(mat), CHOOSER_SCALE) + album, mat).toBeLessThan(gap)
  })
})

type Segment = readonly [THREE.Vector2, THREE.Vector2]

/** Where a shape placed by `matrix` crosses the level `y`: one segment on the table's plane (x, z) per triangle that does. */
function crossings(geometry: THREE.BufferGeometry, matrix: THREE.Matrix4, y: number): Segment[] {
  const position = geometry.attributes.position
  const corners = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]
  const segments: Segment[] = []
  for (let t = 0; t < position.count; t += 3) {
    corners.forEach((v, k) => v.fromBufferAttribute(position, t + k).applyMatrix4(matrix))
    const cut: THREE.Vector2[] = []
    for (const [a, b] of [[0, 1], [1, 2], [2, 0]]) {
      const [p, q] = [corners[a], corners[b]]
      if (p.y > y === q.y > y) continue
      const k = (y - p.y) / (q.y - p.y)
      cut.push(new THREE.Vector2(p.x + (q.x - p.x) * k, p.z + (q.z - p.z) * k))
    }
    if (cut.length === 2) segments.push([cut[0], cut[1]])
  }
  return segments
}

function distanceToSegment(p: THREE.Vector2, [a, b]: Segment): number {
  const ab = b.clone().sub(a)
  const k = THREE.MathUtils.clamp(p.clone().sub(a).dot(ab) / Math.max(ab.lengthSq(), 1e-12), 0, 1)
  return p.distanceTo(a.clone().addScaledVector(ab, k))
}

describe('contact shadows and glow rings lie flat on what they are cast on', () => {
  const most = 15
  /** Half a millimetre: how far the chords of a drawn lathe (a pan has 40 of them) fall inside the circle its profile is turned on. */
  const chord = 0.05
  /** Decal centres every centimetre over an area of the table, in world units. */
  const grid = (from: { x: number; y: number }, to: { x: number; y: number }) => {
    const points: { x: number; y: number }[] = []
    for (let x = from.x; x <= to.x; x += 10) for (let y = from.y; y <= to.y; y += 10) points.push({ x, y })
    return points
  }
  /** The first decal of `ground` that a rim or hem drawn higher than it reaches into, or null. */
  const firstCrossed = (rims: { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 }[], centres: { x: number; y: number }[], ground: number, surfaces: Surfaces) => {
    const segments = rims.flatMap(({ geometry, matrix }) => crossings(geometry, matrix, ground + DECAL_LIFT))
    for (const at of centres) {
      const reach = decalReach(at, ground, surfaces, most)
      if (reach <= 0) continue
      const p = to3(at)
      const centre = new THREE.Vector2(p.x, p.z)
      const into = segments.find((segment) => distanceToSegment(centre, segment) < reach - chord)
      if (into) return { at, ground, reach, by: reach - distanceToSegment(centre, into) }
    }
    return null
  }

  it('keeps every decal on the feeding mat inside the plate or bowl it lies in, and clear of the hem and of plates it lies beside', () => {
    const shapes = feedingShapes()
    const centre = to3(RUG.center)
    const place = (at: { x: number; y: number }, y: number) => new THREE.Matrix4().makeTranslation(to3(at).x, y, to3(at).z)
    const seats = FEEDING.seats.map(() => true)
    const rims = [
      { geometry: shapes.rugRope, matrix: new THREE.Matrix4().makeTranslation(centre.x, 0, centre.z) },
      { geometry: shapes.bowl, matrix: place(FEEDING.bowl, ON_RUG) },
      ...FEEDING.seats.map((seat) => ({ geometry: shapes.plate, matrix: place(seat.plate, ON_RUG) })),
    ]
    const centres = grid({ x: RUG.center.x - RUG.rx - 40, y: RUG.center.y - RUG.rz - 40 }, { x: RUG.center.x + RUG.rx + 40, y: RUG.center.y + RUG.rz + 40 })
    for (const ground of [0, RUG.top, RUG_HEM_TOP, PLATE_TOP, BOWL_FLOOR]) {
      expect(firstCrossed(rims, centres, ground, { mat: 'feeding', seats, panFloors: [0, 0], panSway: 0 }), `ground ${ground}`).toBeNull()
    }
  })

  it('keeps every decal in a scale pan inside its flat floor, however far the beam tilts and the pans swing', () => {
    const shapes = scaleShapes()
    for (const angle of [-SCALE.maxTilt, 0, SCALE.maxTilt]) {
      for (const sway of [-SWAY_MOST, 0, SWAY_MOST]) {
        const panY = panDrops(angle).map((drop) => PAN_REST_HEIGHT - drop * UNIT)
        const rims = SCALE.pans.map((pan, side) => ({ geometry: shapes.pans[side], matrix: new THREE.Matrix4().makeTranslation(to3(pan).x + sway, panY[side], to3(pan).z) }))
        const surfaces: Surfaces = { mat: 'scale', seats: [], panFloors: [panY[0] + PAN_FLOOR, panY[1] + PAN_FLOOR], panSway: sway }
        SCALE.pans.forEach((pan, side) => {
          const x = pan.x + sway / UNIT
          const centres = grid({ x: x - pan.r - 30, y: pan.y - pan.r - 30 }, { x: x + pan.r + 30, y: pan.y + pan.r + 30 })
          expect(firstCrossed(rims, centres, surfaces.panFloors[side], surfaces), `pan ${side} at tilt ${angle}, swung ${sway}`).toBeNull()
        })
      }
    }
  })
})

describe('Knock-Knock visitors come and go clear of the house, its door and each other', () => {
  const house = houseGeometry()
  const leaf = doorLeafGeometry()
  const mouse = mouseGeometry()
  const houseTree = new MeshBVH(house)
  const leafTree = (leaf.boundsTree = new MeshBVH(leaf))
  const mouseTree = (mouse.boundsTree = new MeshBVH(mouse))
  const home = to3(DOOR.house)
  const houseAt = new THREE.Matrix4().makeTranslation(home.x, 0, home.z).scale(new THREE.Vector3().setScalar(DOOR.houseScale))
  const leafAt = (angle: number) => houseAt.clone().multiply(new THREE.Matrix4().makeTranslation(...DOOR_HINGE)).multiply(new THREE.Matrix4().makeRotationY(angle))
  const mouseAt = ({ x, y, z, facing, grow, squash }: VisitorPose) => {
    const s = MOUSE_SCALE * grow
    return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, facing, 0)), new THREE.Vector3(s, s * squash, s))
  }
  const meets = (tree: MeshBVH, at: THREE.Matrix4, other: THREE.BufferGeometry, otherAt: THREE.Matrix4) => tree.intersectsGeometry(other, at.clone().invert().multiply(otherAt))
  const swings: number[] = []
  for (let angle = 0; angle > DOOR_FARTHEST; angle -= 0.02) swings.push(angle)
  swings.push(DOOR_FARTHEST)
  const answer = (count: number) => yardSpots(chunk(Array.from({ length: count }, (_, i) => i), 3))

  it('draws a visitor no wider than VISITOR_REACH, standing on the table', () => {
    const points = pointsOf(mouse, new THREE.Matrix4().makeScale(MOUSE_SCALE, MOUSE_SCALE, MOUSE_SCALE))
    expect(Math.max(...points.map((v) => Math.hypot(v.x, v.z)))).toBeLessThanOrEqual(VISITOR_REACH)
    expect(Math.min(...points.map((v) => v.y))).toBeGreaterThanOrEqual(-1e-6)
  })

  it('swings the door out clear of its frame and the walls, however far a knock rattles it', () => {
    for (const angle of swings) expect(meets(houseTree, houseAt, leaf, leafAt(angle)), `angle ${angle}`).toBe(false)
    expect(Math.min(...pointsOf(leaf, leafAt(0)).map((v) => v.y))).toBeGreaterThanOrEqual(-1e-6)
  })

  it('keeps the swinging door in the doorway stones are cleared from', () => {
    for (const angle of swings) {
      for (const v of pointsOf(leaf, leafAt(angle))) expect(doorwayGap(toPlane(v), []) <= 0 || houseGap(toPlane(v)) <= 0, `angle ${angle}: ${v.x.toFixed(2)}, ${v.z.toFixed(2)}`).toBe(true)
    }
  })

  it('stands the house solid over its drawn walls and shut door, and no farther', () => {
    /** Stones lie and stack below this (cm). */
    const lying = 8.5
    const s = DOOR.houseScale
    const drawn = [...pointsOf(house, new THREE.Matrix4()), ...pointsOf(leaf, new THREE.Matrix4().makeTranslation(...DOOR_HINGE))].filter((v) => v.y * s < lying)
    for (const v of drawn) expect(houseGap({ x: DOOR.house.x + (v.x * s) / UNIT, y: DOOR.house.y + (v.z * s) / UNIT }), `${v.x.toFixed(2)}, ${v.z.toFixed(2)}`).toBeLessThanOrEqual(0)
    const [walls, porch] = HOUSE_FOOTPRINT
    const beside = drawn.filter((v) => Math.abs(v.x) > porch.right)
    const front = drawn.filter((v) => v.z > walls.front)
    const faces: [string, number, number][] = [
      ['walls left', Math.min(...drawn.map((v) => v.x)), walls.left],
      ['walls right', Math.max(...drawn.map((v) => v.x)), walls.right],
      ['walls back', Math.min(...drawn.map((v) => v.z)), walls.back],
      ['walls front', Math.max(...beside.map((v) => v.z)), walls.front],
      ['porch left', Math.min(...front.map((v) => v.x)), porch.left],
      ['porch right', Math.max(...front.map((v) => v.x)), porch.right],
      ['porch front', Math.max(...drawn.map((v) => v.z)), porch.front],
    ]
    for (const [face, drawnAt, solidAt] of faces) expect(Math.abs(drawnAt - solidAt), face).toBeLessThan(0.35)
  })

  it('stands every visitor clear of every other on its spot, however they wiggle', () => {
    for (let count = 1; count <= DOOR.maxVisitors; count++) {
      const spots = answer(count).map((spot) => to3(spot))
      for (let a = 0; a < spots.length; a++) {
        for (let b = a + 1; b < spots.length; b++) {
          for (const wa of [-0.12, 0, 0.12]) {
            for (const wb of [-0.12, 0, 0.12]) {
              const at = (p: THREE.Vector3 | { x: number; z: number }, facing: number) => mouseAt({ x: p.x, y: 0, z: p.z, facing, grow: 1, squash: 1, walking: false })
              expect(meets(mouseTree, at(spots[a], wa), mouse, at(spots[b], wb)), `${count} visitors: ${a} and ${b}`).toBe(false)
            }
          }
        }
      }
    }
  })

  it('brings every number of visitors out and back in without one touching the house, its door or another, whenever the child knocks', () => {
    for (let count = 1; count <= DOOR.maxVisitors; count++) {
      const spots = answer(count)
      const outAt = comingOut(spots, 0)
      const allOut = Math.max(...spots.map((spot, i) => outAt[i] + visitorWalk(spot)))
      for (const knockAt of [DOOR_SWING / 2, DOOR_SWING + (count / 2) * VISITOR_GAP + 0.1, allOut + 0.5]) {
        const visitors: VisitorTimes[] = spots.map((spot, i) => ({ home: spot, outAt: outAt[i], leaveAt: null, pokeAt: i === 0 ? allOut + 0.2 : null }))
        let closeAt: number | null = null
        for (let t = 0; closeAt === null || t <= closeAt + DOOR_SWING; t += 1 / 30) {
          if (closeAt === null && t >= knockAt) closeAt = goingHome(visitors, t) + 0.1
          const angle = doorSwing(0, closeAt, t)
          const drawn: { pose: VisitorPose; at: THREE.Matrix4 }[] = []
          for (const visitor of visitors) {
            const pose = visitorPose(visitor, drawn.length, t)
            if (pose) drawn.push({ pose, at: mouseAt(pose) })
          }
          const where = `${count} visitors, knocked at ${knockAt.toFixed(2)}, at ${t.toFixed(2)}`
          for (const [a, { pose, at }] of drawn.entries()) {
            expect(meets(houseTree, houseAt, mouse, at), `${where}: visitor ${a} in the house`).toBe(false)
            for (const swing of [angle, Math.max(DOOR_FARTHEST, angle - 0.3)]) expect(meets(leafTree, leafAt(swing), mouse, at), `${where}: visitor ${a} in the door`).toBe(false)
            for (const [b, other] of drawn.entries()) {
              if (b <= a || Math.hypot(pose.x - other.pose.x, pose.z - other.pose.z) > (pose.grow + other.pose.grow) * VISITOR_REACH) continue
              expect(meets(mouseTree, at, mouse, other.at), `${where}: visitors ${a} and ${b}`).toBe(false)
            }
          }
        }
        expect(visitors.every((visitor) => visitorGone(visitor, closeAt! + DOOR_SWING))).toBe(true)
      }
    }
  })
})

describe('stones leave the bag clear of it', () => {
  const bag = bagGeometry()
  const bagTree = new MeshBVH(bag)
  const home = to3(BAG)
  const bagAt = (shape: BagShape) =>
    new THREE.Matrix4()
      .makeTranslation(home.x, 0, home.z)
      .multiply(new THREE.Matrix4().makeRotationY(BAG_HEADING))
      .multiply(new THREE.Matrix4().compose(new THREE.Vector3(0, shape.y, 0), new THREE.Quaternion().setFromEuler(new THREE.Euler(shape.roll, 0, shape.lie)), new THREE.Vector3(...shape.scale)))
  const reach = Math.max(...SIZES.flatMap((q) => drawnPoints(q).map((p) => p.length())))
  /** The bag's drawn vertices placed for a shape, as flat x, y, z triples. */
  const placed = (shape: BagShape) => {
    const e = bagAt(shape).elements
    const from = bag.attributes.position.array
    const out = new Float64Array(from.length)
    for (let i = 0; i < from.length; i += 3) {
      const [x, y, z] = [from[i], from[i + 1], from[i + 2]]
      out[i] = e[0] * x + e[4] * y + e[8] * z + e[12]
      out[i + 1] = e[1] * x + e[5] * y + e[9] * z + e[13]
      out[i + 2] = e[2] * x + e[6] * y + e[10] * z + e[14]
    }
    return out
  }
  const stone = new THREE.SphereGeometry(reach, 20, 14)
  const inBag = insideOf(bag, new THREE.Matrix4())
  const shapeOf = (table: TableController) => bagShape(table.state.bag / table.state.total, bagTip(table.bagTipStart === null ? null : table.t - table.bagTipStart, table.bagShakesOut()))
  /** How many stones lie on the table or hop across it (one come to rest leaning on a guest hops off it). */
  const onTable = (table: TableController) => new Set([...table.physics.stoneIds(), ...table.flightViews().map((flight) => flight.id)]).size
  /** Every stone near the bag, drawn or in flight, over `seconds` of play: none may touch or sit in the bag as it is drawn at that moment. */
  const watch = (table: TableController, seconds: number, where: string) => {
    let near = 0
    for (let t = 0; t < seconds; t += 1 / 60) {
      table.step(1 / 60)
      const toBag = bagAt(shapeOf(table)).invert()
      const stones = [
        ...table.physics.stoneIds().map((id) => table.physics.body(id)!.position),
        ...table.flightViews().filter((flight) => !flight.mouse).map((flight) => flight.position),
      ]
      for (const p of stones) {
        if (Math.hypot(p.x - home.x, p.z - home.z) > 30) continue
        near++
        const at = new THREE.Matrix4().makeTranslation(p.x, p.y, p.z)
        const moment = `${where}, ${t.toFixed(2)} s in, stone at ${[p.x, p.y, p.z].map((v) => v.toFixed(1))}`
        expect(bagTree.intersectsGeometry(stone, toBag.clone().multiply(at)), `${moment}: touches the bag`).toBe(false)
        expect(inBag(new THREE.Vector3(p.x, p.y, p.z).applyMatrix4(toBag)), `${moment}: inside the bag`).toBe(false)
      }
    }
    return near
  }
  const tapBag = (table: TableController) => {
    table.pointerDown(1, BAG, 0)
    table.pointerUp(1, BAG, 80)
  }
  const fresh = () => {
    const table = new TableController(defaultTable(4), { save: () => {} })
    table.setProjector({ toScreen: (v) => toWorld2(v), toPlane: (screen) => screen })
    return table
  }

  it('draws the mouth where bagMouth says, and nothing of the sack past it where a stone leaves', () => {
    for (const shakeOut of [false, true]) {
      for (let age = 0; age < 0.9; age += 0.01) {
        for (const fullness of [0, 0.5, 1]) {
          const shape = bagShape(fullness, bagTip(age, shakeOut))
          const { at, axis } = bagMouth(shape)
          const drawn = new THREE.Vector3(0, SACK_MOUTH, 0).applyMatrix4(bagAt(shape))
          expect(drawn.distanceTo(new THREE.Vector3(at.x, at.y, at.z))).toBeLessThan(1e-9)
          const exit = bagExit(shape, reach)
          const p = placed(shape)
          let nearest = Infinity
          for (let i = 0; i < p.length; i += 3) nearest = Math.min(nearest, Math.hypot(p[i] - exit.x, p[i + 1] - exit.y, p[i + 2] - exit.z))
          expect(nearest, `${shakeOut ? 'shake-out' : 'lurch'} at ${age.toFixed(2)} s, ${fullness} full`).toBeGreaterThan(reach + 1)
          expect(Math.hypot(axis.x, axis.y, axis.z)).toBeCloseTo(1, 12)
        }
      }
    }
  })

  it('rocks the bag on its belly as it tips, never deeper into the table than it lies at rest', () => {
    for (const fullness of [0, 0.25, 0.5, 0.75, 1]) {
      const lowest = (shape: BagShape) => {
        const p = placed(shape)
        let low = Infinity
        for (let i = 1; i < p.length; i += 3) low = Math.min(low, p[i])
        return low
      }
      const rest = lowest(bagShape(fullness, bagTip(null, false)))
      // Resting, its cloth's folds and lumps press a few millimetres into the table under it, out of sight.
      expect(rest, `${fullness} full, at rest`).toBeGreaterThan(-0.5)
      for (const shakeOut of [false, true]) {
        for (let age = 0; age < 0.9; age += 0.02) {
          expect(lowest(bagShape(fullness, bagTip(age, shakeOut))), `${shakeOut ? 'shake-out' : 'lurch'} at ${age.toFixed(2)} s, ${fullness} full`).toBeGreaterThan(Math.min(rest, 0) - 0.1)
        }
      }
    }
  })

  it('spills every stone out past the mouth without one touching the bag, on a lurch or a shake-out', () => {
    for (let run = 0; run < 4; run++) {
      const lurch = fresh()
      tapBag(lurch)
      expect(lurch.bagShakesOut()).toBe(false)
      expect(watch(lurch, 1.5, `run ${run}, a lurch`)).toBeGreaterThan(0)
      expect(onTable(lurch)).toBe(10)
      const shake = fresh()
      expect(watch(shake, 6, `run ${run}, the first-open story`)).toBeGreaterThan(0)
      tapBag(shake)
      expect(shake.bagShakesOut()).toBe(true)
      expect(watch(shake, 1.5, `run ${run}, a shake-out`)).toBeGreaterThan(0)
      expect(onTable(shake)).toBe(10)
    }
  })

  it('stacks the spilled stones clear of one another as they leave', () => {
    const thickness = Math.max(...SIZES.map((q) => Math.max(...drawnPoints(q).map((p) => p.y)) - Math.min(...drawnPoints(q).map((p) => p.y))))
    const table = fresh()
    tapBag(table)
    const at = table.physics.stoneIds().map((id) => table.physics.body(id)!.position)
    expect(at).toHaveLength(10)
    for (const [i, a] of at.entries()) {
      for (const b of at.slice(i + 1)) expect(Math.abs(a.y - b.y) > thickness || Math.hypot(a.x - b.x, a.z - b.z) > 2 * reach, `${a} and ${b}`).toBe(true)
    }
  })
})
