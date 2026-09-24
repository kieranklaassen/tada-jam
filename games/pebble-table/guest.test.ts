import * as THREE from 'three'
import { MeshBVH } from 'three-mesh-bvh'
import { describe, expect, it } from 'vitest'
import { PERSONALITIES, restPose, SEAT_SPECIES, type ActionKind, type MotionPose, type Species } from './motion'
import { ARM_AT, CHEEK_AT, EAR_AT, GUEST_SIZE, NECK_Y, poseGuest, speciesShapes } from './view/guest'

// A guest's parts hang together as one object. The audit flags two of them
// that cross deeper at some moment than at their shallowest: a limb or a nose
// swinging into what it hangs on. These tests pose every species through all
// of its motion and measure each pair the way the audit does.

type Part = { name: string; mesh: THREE.Mesh; bvh: MeshBVH; points: THREE.Vector3[]; box: THREE.Box3 }

/** The audit samples up to 700 points of a piece; this many keeps every lump in reach. */
const SAMPLES = 500

function rigOf(species: Species) {
  const shapes = speciesShapes(species)
  const parts: Part[] = []
  const add = (name: string, geometry: THREE.BufferGeometry, parent: THREE.Object3D, at?: readonly [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry)
    if (at) mesh.position.set(...at)
    parent.add(mesh)
    geometry.computeBoundingBox()
    const position = geometry.attributes.position
    const stride = Math.ceil(position.count / SAMPLES)
    const points = Array.from({ length: Math.ceil(position.count / stride) }, (_, i) => new THREE.Vector3().fromBufferAttribute(position, i * stride))
    parts.push({ name, mesh, bvh: new MeshBVH(geometry), points, box: geometry.boundingBox!.clone() })
    return mesh
  }
  const root = new THREE.Group()
  add('body', shapes.body, root)
  const arms = [-1, 1].map((side) => {
    const arm = new THREE.Group()
    arm.position.set(side * ARM_AT[0], ARM_AT[1], ARM_AT[2])
    root.add(arm)
    add(side < 0 ? 'arm-left' : 'arm-right', shapes.arm, arm)
    return arm
  })
  const head = new THREE.Group()
  head.position.set(0, NECK_Y, 0)
  root.add(head)
  add('head', shapes.head, head)
  const nose = add('nose', shapes.nose, head, shapes.noseAt)
  const cheeks = [-1, 1].map((side) => add(side < 0 ? 'cheek-left' : 'cheek-right', shapes.cheek, head, [side * CHEEK_AT[0], CHEEK_AT[1], CHEEK_AT[2]]))
  const ears = (shapes.ears ?? []).map((geometry, i) => {
    const ear = new THREE.Group()
    ear.position.set((i === 0 ? -1 : 1) * EAR_AT[0], EAR_AT[1], EAR_AT[2])
    head.add(ear)
    add(i === 0 ? 'ear-left' : 'ear-right', geometry, ear)
    return ear
  })
  return { shapes, root, parts, rig: { root, head, nose, cheeks, ears, arms } }
}

function plus(pose: MotionPose, delta: Partial<Record<keyof MotionPose, number | [number, number]>>): MotionPose {
  const out = { ...pose, armUp: [...pose.armUp], armForward: [...pose.armForward], ears: [...pose.ears] } as MotionPose
  for (const [key, value] of Object.entries(delta) as [keyof MotionPose, number | [number, number]][]) {
    if (Array.isArray(value)) (out[key] as [number, number]) = [(out[key] as [number, number])[0] + value[0], (out[key] as [number, number])[1] + value[1]]
    else (out[key] as number) += value
  }
  return out
}

type Named = { name: string; pose: MotionPose }

/** Every pose a species passes through: idling, reaching, rumbled, and each action alone and while reaching. */
function posesOf(species: Species, step: number): Named[] {
  const personality = PERSONALITIES[species]
  const kinds: ActionKind[] = ['react', 'eat', 'poke', 'arrive', 'delight']
  const poses: Named[] = []
  const idle = (now: number) => plus(restPose(), personality.idle(now, 0))
  for (let now = 0; now < 4; now += step * 8) {
    poses.push({ name: `idle ${now.toFixed(2)}`, pose: idle(now) })
    poses.push({ name: `reach ${now.toFixed(2)}`, pose: plus(idle(now), personality.reach(1, now, 0)) })
    poses.push({ name: `rumble ${now.toFixed(2)}`, pose: plus(idle(now), { squash: 0.06, headPitch: 0.22, armForward: [0.5, 0.5] }) })
  }
  for (const kind of kinds) {
    for (const action of personality[kind]) {
      for (let t = 0; t < 1; t += step) {
        for (const glance of [-1, 1]) {
          const acting = plus(idle(t * 3), action.sample(t, 1.15, glance))
          const name = `${action.name} ${t.toFixed(2)} ${glance}`
          poses.push({ name, pose: acting }, { name: `${name} reaching`, pose: plus(acting, personality.reach(1, t * 3, 0)) })
        }
      }
    }
  }
  return poses
}

/** A part as posed: its matrix, the inverse, how much it scales lengths, and its box, all in the guest's frame. */
type Placed = { part: Part; matrix: THREE.Matrix4; inverse: THREE.Matrix4; scale: number; box: THREE.Box3; bvh: MeshBVH; points: THREE.Vector3[]; size: number }

const unit = new THREE.Vector3()
function place(part: Part): Placed {
  part.mesh.updateWorldMatrix(true, false)
  const matrix = part.mesh.matrixWorld.clone()
  const s = new THREE.Vector3()
  matrix.decompose(unit, new THREE.Quaternion(), s)
  const uniform = Math.abs(s.x - s.y) < 1e-9 && Math.abs(s.y - s.z) < 1e-9
  // A part squashed out of true (a puffing cheek, a wiggling nose) is measured
  // from a copy baked into place, since lengths no longer scale evenly.
  const bvh = uniform ? part.bvh : new MeshBVH(part.mesh.geometry.clone().applyMatrix4(matrix))
  const local = uniform ? matrix : new THREE.Matrix4()
  const box = part.box.clone().applyMatrix4(matrix)
  const size = box.getSize(new THREE.Vector3())
  return {
    part,
    matrix: local,
    inverse: local.clone().invert(),
    scale: uniform ? s.x : 1,
    box,
    bvh,
    points: part.points.map((p) => p.clone().applyMatrix4(matrix)),
    size: [size.x, size.y, size.z].sort((a, b) => a - b)[1],
  }
}

/** Whether a part is drawn: the audit, like the renderer, skips a part hidden itself or under a hidden parent. */
function shown(part: Part): boolean {
  for (let o: THREE.Object3D | null = part.mesh; o; o = o.parent) if (!o.visible) return false
  return true
}

const hit = { point: new THREE.Vector3(), distance: 0, faceIndex: 0 }
const [ta, tb, tc, q] = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]

/** How deep a's deepest point lies inside b. */
function depthInto(a: Placed, b: Placed): number {
  const near = b.box.clone().expandByScalar(0.01)
  const geometry = b.bvh.geometry
  const index = geometry.index
  const position = geometry.attributes.position
  let depth = 0
  for (const p of a.points) {
    if (!near.containsPoint(p)) continue
    q.copy(p).applyMatrix4(b.inverse)
    b.bvh.closestPointToPoint(q, hit as never)
    if (hit.distance * b.scale <= depth) continue
    const f = hit.faceIndex * 3
    const [i, j, k] = index ? [index.getX(f), index.getX(f + 1), index.getX(f + 2)] : [f, f + 1, f + 2]
    ta.fromBufferAttribute(position, i)
    tb.fromBufferAttribute(position, j)
    tc.fromBufferAttribute(position, k)
    const normal = tb.sub(ta).cross(tc.sub(ta))
    if (normal.dot(ta.subVectors(q, hit.point)) < 0) depth = hit.distance * b.scale
  }
  return depth
}

type Range = { min: number; max: number; size: number; shallowest: string; deepest: string }

function embedRanges(species: Species, step: number): Map<string, Range> {
  const { shapes, root, parts, rig } = rigOf(species)
  const ranges = new Map<string, Range>()
  for (const { name, pose } of posesOf(species, step)) {
    poseGuest(rig, shapes, pose, { yaw: 0, pitch: 0 }, 1)
    // The whole guest squashes and leans together, which moves no part against
    // another; measure in its own upright frame at full size.
    root.rotation.set(0, 0, 0)
    root.scale.setScalar(GUEST_SIZE)
    root.updateMatrixWorld(true)
    const placed = parts.filter(shown).map(place)
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const [a, b] = [placed[i], placed[j]]
        const key = `${a.part.name} x ${b.part.name}`
        const touching = a.box.intersectsBox(b.box)
        if (!touching && !ranges.has(key)) continue
        const depth = touching ? Math.max(depthInto(a, b), depthInto(b, a)) : 0
        const range = ranges.get(key) ?? { min: Infinity, max: 0, size: Math.min(a.size, b.size), shallowest: '', deepest: '' }
        if (depth < range.min) [range.min, range.shallowest] = [depth, name]
        if (depth > range.max) [range.max, range.deepest] = [depth, name]
        ranges.set(key, range)
      }
    }
  }
  return ranges
}

// The audit lets two parts of one guest sink into each other deeper than at
// their shallowest by the larger of 6% of the smaller part and 0.2% of the
// view; the camera always fits the table's 164 cm width (stage.tsx), so the
// view is never narrower. These keep a quarter of that spare.
const allowed = (range: Range) => 0.75 * Math.max(0.06 * range.size, 0.002 * 164)

describe('a guest keeps its parts pressed together by the same amount, however it moves', () => {
  for (const species of new Set(SEAT_SPECIES)) {
    it(`never swings a ${species}'s arms, ears, nose or cheeks deeper into what they hang on`, () => {
      const ranges = embedRanges(species, 0.1)
      const hanging = ['body x arm-left', 'body x arm-right', 'head x nose', 'head x cheek-left', 'head x cheek-right']
      if (species === 'rabbit') hanging.push('head x ear-left', 'head x ear-right')
      for (const pair of hanging) expect(ranges.has(pair), pair).toBe(true)
      // The head itself nods on its neck and, curling up, sinks into the body
      // on purpose; what is measured here is every part that hangs on and
      // moves on its own.
      for (const [pair, range] of ranges) {
        if (pair === 'body x head') continue
        expect(range.max - range.min, `${pair}: shallowest ${range.shallowest}, deepest ${range.deepest}`).toBeLessThanOrEqual(allowed(range))
      }
    })
  }

  it('slides a nose along its snout from where it always sat', () => {
    for (const species of new Set(SEAT_SPECIES)) {
      const { shapes, rig } = rigOf(species)
      poseGuest(rig, shapes, restPose(), { yaw: 0, pitch: 0 }, 1)
      expect(rig.nose.position.toArray().map((v) => +v.toFixed(6))).toEqual(shapes.noseAt)
      expect(rig.nose.rotation.x).toBe(0)
      poseGuest(rig, shapes, { ...restPose(), nose: 1 }, { yaw: 0, pitch: 0 }, 1)
      expect(rig.nose.position.y).toBeGreaterThan(shapes.noseAt[1] + 0.15)
    }
  })

  it(`tucks a curling hedgehog's cheeks away into its face before its face meets its belly, and brings them back`, () => {
    const { shapes, rig } = rigOf('hedgehog')
    for (const [drop, shown] of [[0, true], [1, true], [2.6, false], [0, true]] as const) {
      poseGuest(rig, shapes, { ...restPose(), headDrop: drop, headPitch: (drop / 2.6) * 0.7 }, { yaw: 0, pitch: 0 }, 1)
      for (const cheek of rig.cheeks) expect(cheek.visible).toBe(shown)
    }
    expect(rig.cheeks[0].scale.x).toBe(1)
  })
})
