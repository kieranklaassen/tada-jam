import * as CANNON from 'cannon-es'
import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { describe, expect, it } from 'vitest'
import { BAG_HEADING, bagExit, bagMouth, bagShape, bagTip, SACK_MOUTH, type BagShape } from './bag'
import { TableController, yardSpots } from './controller'
import { albumSlot, BAG, DOOR, FEEDING, HOUSE_FOOTPRINT, SCALE, shelfTile, TABLE, type MatKey, type Quarters } from './layout'
import { GUEST_TOP } from './feeding'
import { MotionDirector, SEAT_SPECIES, type ActionKind } from './motion'
import { partReachDown, partVertices, STOOL_REACH, STOOL_TOP } from './partShape'
import { PAN_REST_HEIGHT, STEP, stoneRadius3, TablePhysics, to3, toWorld2, UNIT } from './physics3d'
import { PART_KINDS } from './parts'
import { panDrops } from './scale'
import { defaultTable } from './state'
import { pebbleRings, STONE_CUTS, STONE_DRAWN_RADIUS, STONE_SEGMENTS, stoneReachAlong, stoneRest, stoneVertices } from './stoneShape'
import { BOWL_FLOOR, DECAL_LIFT, decalReach, feedingFloor, HEM_LINE, hemAt, ON_RUG, PAN_FLOOR, PLATE_HEIGHT, PLATE_PROFILE, PLATE_TOP, RUG, RUG_HEM_REACH, RUG_HEM_TOP, type Surfaces } from './surfaces'
import { GUEST_SIZE, guestFloor, guestYaw, NECK_Y, soleDepth, speciesShapes } from './view/guest'
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
  houseGeometry,
  HUB_RADIUS,
  MOUSE_SCALE,
  mouseGeometry,
  panHang,
  PIVOT_Y,
  POST_LIFT,
  ROPE_KNOT,
  ropeMatrix,
  scaleShapes,
  STONE_COVER,
  stoneMatrix,
  stoneRoom,
  type StoneMotion,
  type StoneState,
} from './view/models'
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

describe('guests stand on what is drawn under them', () => {
  const seats = FEEDING.seats.map((_, seat) => seat)

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
      expect(firstCrossed(rims, centres, ground, { mat: 'feeding', seats, panFloors: [0, 0] }), `ground ${ground}`).toBeNull()
    }
  })

  it('keeps every decal in a scale pan inside its flat floor, however far the beam tilts', () => {
    const shapes = scaleShapes()
    for (const angle of [-SCALE.maxTilt, 0, SCALE.maxTilt]) {
      const panY = panDrops(angle).map((drop) => PAN_REST_HEIGHT - drop * UNIT)
      const rims = SCALE.pans.map((pan, side) => ({ geometry: shapes.pans[side], matrix: new THREE.Matrix4().makeTranslation(to3(pan).x, panY[side], to3(pan).z) }))
      const surfaces: Surfaces = { mat: 'scale', seats: [], panFloors: [panY[0] + PAN_FLOOR, panY[1] + PAN_FLOOR] }
      SCALE.pans.forEach((pan, side) => {
        const centres = grid({ x: pan.x - pan.r - 30, y: pan.y - pan.r - 30 }, { x: pan.x + pan.r + 30, y: pan.y + pan.r + 30 })
        expect(firstCrossed(rims, centres, surfaces.panFloors[side], surfaces), `pan ${side} at tilt ${angle}`).toBeNull()
      })
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
      expect(lurch.physics.stoneIds()).toHaveLength(10)
      const shake = fresh()
      expect(watch(shake, 6, `run ${run}, the first-open story`)).toBeGreaterThan(0)
      tapBag(shake)
      expect(shake.bagShakesOut()).toBe(true)
      expect(watch(shake, 1.5, `run ${run}, a shake-out`)).toBeGreaterThan(0)
      expect(shake.physics.stoneIds()).toHaveLength(10)
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
