import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { pairDepth, preparePiece, type CameraInfo, type MaterialInfo, type Piece } from '../../scripts/intersections/core'
import { PERSONALITIES, restPose, SEAT_SPECIES, type ActionKind, type MotionPose, type Species } from './motion'
import { ARM_AT, CHEEK_AT, EAR_AT, GUEST_SIZE, NECK_Y, poseGuest, speciesShapes } from './view/guest'

// A guest's parts hang together as one object. The audit flags two of them
// that cross deeper at some moment than at their shallowest: a limb or a nose
// swinging into what it hangs on, or a cheek swelling out of a face. These
// tests pose every species through all of its motion and measure each pair
// with the audit's own measure.

type Part = { name: string; mesh: THREE.Mesh }

function rigOf(species: Species) {
  const shapes = speciesShapes(species)
  const parts: Part[] = []
  const add = (name: string, geometry: THREE.BufferGeometry, parent: THREE.Object3D, at?: readonly [number, number, number]) => {
    const mesh = new THREE.Mesh(geometry)
    if (at) mesh.position.set(...at)
    parent.add(mesh)
    parts.push({ name, mesh })
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

const CLAY: MaterialInfo = { type: 'MeshStandardMaterial', side: THREE.FrontSide, transparent: false, opacity: 1, depthTest: true, depthWrite: true, polygonOffset: false, colorWrite: true, customVertex: false, renderOrder: 0 }
// Every part is a closed shape, so no camera has to say which side of one is inside.
const CAMERA: CameraInfo = { position: [0, 0, 200], forward: [0, 0, -1], ortho: false, near: 1, far: 1000, fov: 27, orthoHeight: 0, view: [], projection: [], viewport: [1180, 820], logDepth: false }

const at = new THREE.Vector3()
/** A part as the audit reads it: its triangles placed by `matrix`. */
function bake(part: Part, matrix: THREE.Matrix4): Piece {
  const position = part.mesh.geometry.getAttribute('position')
  const positions = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) at.fromBufferAttribute(position, i).applyMatrix4(matrix).toArray(positions, i * 3)
  const index = part.mesh.geometry.getIndex()
  return preparePiece({ id: part.name, mesh: part.name, label: part.name, object: 'guest', positions, index: index ? Uint32Array.from(index.array) : null, material: CLAY })
}

/** Whether a part is drawn: the audit, like the renderer, skips a part hidden itself or under a hidden parent. */
function shown(part: Part): boolean {
  for (let o: THREE.Object3D | null = part.mesh; o; o = o.parent) if (!o.visible) return false
  return true
}

type Range = { min: number; max: number; scale: number; shallowest: string; deepest: string }

/**
 * How deep each pair of parts crosses, shallowest and deepest, over every
 * pose. The whole guest squashes and leans together, which moves no part
 * against another, so it is measured upright at full size; a part is measured
 * against the head in the head's own frame, since the head is the one large
 * part that moves. The head itself nods on its neck and, curling up, sinks
 * into the body on purpose, so what is measured is every part that hangs on
 * and moves on its own.
 */
function embedRanges(species: Species, step: number): Map<string, Range> {
  const { shapes, root, parts, rig } = rigOf(species)
  const ranges = new Map<string, Range>()
  const upright = new THREE.Matrix4()
  const [body, head] = ['body', 'head'].map((name) => parts.find((part) => part.name === name)!)
  const hanging = parts.filter((part) => part !== body && part !== head)
  for (const part of parts) part.mesh.geometry.computeBoundingBox()
  // Most parts sit still through most poses: each placing is read, and each
  // pair of placings measured, once.
  const read = new Map<string, Piece>()
  const measured = new Map<string, { depth: number; scale: number }>()
  const placing = (part: Part, frame: THREE.Matrix4) => {
    const matrix = frame.clone().multiply(part.mesh.matrixWorld)
    return { part, matrix, key: `${part.name} ${matrix.elements.map((e) => e.toFixed(6)).join(' ')}` }
  }
  const piece = ({ part, matrix, key }: ReturnType<typeof placing>) => {
    if (!read.has(key)) read.set(key, bake(part, matrix))
    return read.get(key)!
  }
  const measure = (a: Part, b: Part, frame: THREE.Matrix4, name: string) => {
    const key = `${a.name} x ${b.name}`
    const [pa, pb] = [placing(a, frame), placing(b, frame)]
    const touching = a.mesh.geometry.boundingBox!.clone().applyMatrix4(pa.matrix).intersectsBox(b.mesh.geometry.boundingBox!.clone().applyMatrix4(pb.matrix))
    if (!touching && !ranges.has(key)) return
    const both = `${pa.key} | ${pb.key}`
    let crossing = touching ? measured.get(both) : { depth: 0, scale: 0 }
    if (!crossing) {
      const [ra, rb] = [piece(pa), piece(pb)]
      measured.set(both, (crossing = { depth: pairDepth(ra, rb, CAMERA)?.depth ?? 0, scale: Math.min(ra.scale, rb.scale) }))
    }
    const depth = crossing.depth
    if (!ranges.has(key) && depth === 0) return
    const range = ranges.get(key) ?? { min: Infinity, max: 0, scale: crossing.scale, shallowest: '', deepest: '' }
    if (depth < range.min) [range.min, range.shallowest] = [depth, name]
    if (depth > range.max) [range.max, range.deepest] = [depth, name]
    ranges.set(key, range)
  }
  for (const { name, pose } of posesOf(species, step)) {
    poseGuest(rig, shapes, pose, { yaw: 0, pitch: 0 }, 1)
    root.rotation.set(0, 0, 0)
    root.scale.setScalar(GUEST_SIZE)
    root.updateMatrixWorld(true)
    const inHead = new THREE.Matrix4().makeScale(GUEST_SIZE, GUEST_SIZE, GUEST_SIZE).multiply(rig.head.matrixWorld.clone().invert())
    const moving = hanging.filter(shown)
    moving.forEach((part, i) => {
      measure(body, part, upright, name)
      measure(head, part, inHead, name)
      for (const other of moving.slice(i + 1)) measure(part, other, upright, name)
    })
  }
  return ranges
}

// The audit lets two parts of one guest sink into each other deeper than at
// their shallowest by the larger of 6% of the smaller part and 0.2% of the
// view; the camera always fits the table's 164 cm width (stage.tsx), so the
// view is never narrower. These keep a quarter of that spare.
const allowed = (range: Range) => 0.75 * Math.max(0.06 * range.scale, 0.002 * 164)

describe('a guest keeps its parts pressed together by the same amount, however it moves', () => {
  for (const species of new Set(SEAT_SPECIES)) {
    it(`never swings a ${species}'s arms, ears, nose or cheeks deeper into what they hang on`, () => {
      const ranges = embedRanges(species, 0.1)
      const hanging = ['body x arm-left', 'body x arm-right', 'head x nose', 'head x cheek-left', 'head x cheek-right']
      if (species === 'rabbit') hanging.push('head x ear-left', 'head x ear-right')
      for (const pair of hanging) expect(ranges.has(pair), pair).toBe(true)
      for (const [pair, range] of ranges) {
        expect(range.max - range.min, `${pair}: shallowest ${range.shallowest}, deepest ${range.deepest}`).toBeLessThanOrEqual(allowed(range))
      }
    }, 30_000)
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
