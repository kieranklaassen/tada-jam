import * as THREE from 'three'
import { FEEDING, type Point } from '../layout'
import { SEAT_SPECIES, type MotionPose, type Species } from '../motion'
import { feedingFloor } from '../surfaces'
import { merge, PALETTE, piece } from './clay'
import { quillGeometry, quillLayout, withShells } from './fur'
import * as geo from './geometry'

// A guest's clay parts, built once per species, and what its pose needs to
// keep it standing on what is under it rather than sunk into it.

type V3 = [number, number, number]

/** How big a guest is drawn: its model's units are this many centimetres. */
export const GUEST_SIZE = 1.5
/** More than a guest ever leans or rolls (motion.ts), in radians. */
const SOLE_TILT = 0.45
/** How much wider than drawn a squash makes a guest at most. */
const SQUASH_WIDEN = 1.15
/** How far above its lowest point a body point can be and still touch the ground within `SOLE_TILT` (model units). */
const LOW_BAND = 1.6

/** A body's distinct points near its bottom, as (x, y, z) triples. */
function lowPoints(body: THREE.BufferGeometry): number[] {
  const position = body.attributes.position
  let bottom = Infinity
  for (let i = 0; i < position.count; i++) bottom = Math.min(bottom, position.getY(i))
  const seen = new Set<string>()
  const out: number[] = []
  for (let i = 0; i < position.count; i++) {
    const [x, y, z] = [position.getX(i), position.getY(i), position.getZ(i)]
    const key = `${x},${y},${z}`
    if (y > bottom + LOW_BAND || seen.has(key)) continue
    seen.add(key)
    out.push(x, y, z)
  }
  return out
}

/** Of `points`, those that are lowest for some lean and roll within `SOLE_TILT`. */
function soleOf(points: number[]): Float32Array {
  const steps = 12
  const picked = new Set<number>()
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const ux = Math.tan(((2 * i) / steps - 1) * SOLE_TILT)
      const uz = Math.tan(((2 * j) / steps - 1) * SOLE_TILT)
      let low = Infinity
      let at = 0
      for (let k = 0; k < points.length; k += 3) {
        const h = ux * points[k] + points[k + 1] + uz * points[k + 2]
        if (h < low) [low, at] = [h, k]
      }
      picked.add(at)
    }
  }
  return Float32Array.from([...picked].flatMap((k) => [points[k], points[k + 1], points[k + 2]]))
}

function reachOf(points: number[]): number {
  let reach = 0
  for (let k = 0; k < points.length; k += 3) reach = Math.max(reach, Math.hypot(points[k], points[k + 2]))
  return reach
}

/** How far below a guest's root its lowest drawn point is, for the root's rotation and scale in `matrix` (cm). */
export function soleDepth(sole: Float32Array, matrix: THREE.Matrix4): number {
  const e = matrix.elements
  let low = Infinity
  for (let i = 0; i < sole.length; i += 3) low = Math.min(low, e[1] * sole[i] + e[5] * sole[i + 1] + e[9] * sole[i + 2])
  return -low
}

/** Where a guest's head sits on its body, in the model's units. */
export const NECK_Y = 7.4
/** Where the parts that move on their own hang on the body and the head (model units; arms and ears mirrored by side). */
export const ARM_AT: V3 = [3.9, 4.7, 0.9]
export const EAR_AT: V3 = [1.4, 5.6, -0.3]
export const CHEEKS_AT: V3 = [0, 2.3, 2.5]

/** The nodes of a guest that move: the root turns and squashes the whole guest, the head sits on it, and the rest hang on the head or the body. */
export type GuestRig = {
  root: THREE.Object3D
  head: THREE.Object3D
  nose: THREE.Object3D
  cheeks: THREE.Object3D
  ears: readonly (THREE.Object3D | null)[]
  arms: readonly (THREE.Object3D | null)[]
}

/** Poses a guest's moving parts for motion `m`, looking by `look` (radians) and popped in by `pop`; the root's height is left to the caller. */
export function poseGuest(rig: GuestRig, shapes: GuestShapes, m: MotionPose, look: { yaw: number; pitch: number }, pop: number): void {
  const vertical = 1 - m.squash
  const horizontal = 1 + m.squash * 0.6
  rig.root.scale.set(GUEST_SIZE * horizontal * pop, GUEST_SIZE * vertical * pop, GUEST_SIZE * horizontal * pop)
  rig.root.rotation.set(m.lean, m.twist, m.roll)
  rig.head.position.y = NECK_Y - m.headDrop
  rig.head.rotation.set(look.pitch + m.headPitch, look.yaw + m.headYaw, m.headRoll)
  rig.nose.position.y = shapes.noseAt[1] + m.nose * 0.22
  rig.nose.scale.set(1 + Math.abs(m.nose) * 0.18, 1 - Math.abs(m.nose) * 0.2, 1)
  rig.cheeks.scale.set(1 + m.cheeks * 0.12, 1 + m.cheeks * 0.45, 1 + m.cheeks * 0.6)
  rig.ears.forEach((ear, side) => ear?.rotation.set(-0.05 - m.ears[side] * 0.9, 0, (side === 0 ? 1 : -1) * m.ears[side] * 0.15))
  rig.arms.forEach((arm, side) => arm?.rotation.set(-m.armForward[side], 0, (side === 0 ? -1 : 1) * (0.45 + m.armUp[side])))
}

export type GuestShapes = {
  body: THREE.BufferGeometry
  head: THREE.BufferGeometry
  eyes: THREE.BufferGeometry
  mouth: THREE.BufferGeometry
  arm: THREE.BufferGeometry
  /** Parts that move on their own: nose (wiggles), cheeks (puff), rabbit ears (flick, left then right, built around their base). */
  nose: THREE.BufferGeometry
  cheeks: THREE.BufferGeometry
  ears: [THREE.BufferGeometry, THREE.BufferGeometry] | null
  noseAt: V3
  /** Shell geometry for clay-tuft fur (rabbit, bear), or null. */
  furBody: THREE.BufferGeometry | null
  furHead: THREE.BufferGeometry | null
  /** Hedgehog quills: one shared quill and where each instance sits, for the body and the head. */
  quill: THREE.BufferGeometry | null
  quillsBody: THREE.Matrix4[]
  quillsHead: THREE.Matrix4[]
  /** The body points that can be its lowest as it leans and rolls (see `soleOf`), and how far out from its middle its low parts reach (cm, at full size). */
  sole: Float32Array
  footReach: number
}

function guestShapes(species: Species): GuestShapes {
  const fur = species === 'rabbit' ? PALETTE.rabbit : species === 'bear' ? PALETTE.bear : PALETTE.hedgehog
  const light = species === 'bear' ? PALETTE.bearMuzzle : '#f7ead3'
  const sphere = geo.sphere(26)
  const body = [
    piece(sphere, fur, { position: [0, 4, 0], scale: [4.4, 4.1, 4.1] }, { lump: 0.3, frequency: 0.55, seed: 1 }),
    piece(sphere, light, { position: [0, 3.5, 2.6], scale: [2.9, 2.8, 1.8] }, { lump: 0.15, frequency: 0.7 }),
    piece(sphere, fur, { position: [-2, 0.6, 2.2], scale: [1.5, 0.8, 1.9] }, { lump: 0.1 }),
    piece(sphere, fur, { position: [2, 0.6, 2.2], scale: [1.5, 0.8, 1.9] }, { lump: 0.1 }),
  ]
  if (species === 'rabbit') body.push(piece(sphere, '#fbf4e8', { position: [0, 2.2, -3.8], scale: 1.4 }, { lump: 0.2 }))

  const headSphere: V3 = [0, 3.1, 0.2]
  const head = [piece(sphere, fur, { position: headSphere, scale: species === 'hedgehog' ? [3.4, 3.1, 3.3] : [3.5, 3.3, 3.3] }, { lump: 0.22, frequency: 0.7, seed: 3, ground: null })]
  const muzzle = species === 'hedgehog' ? { position: [0, 2.3, 3.4] as V3, scale: [1.5, 1.3, 1.9] as V3 } : { position: [0, 2.3, 2.9] as V3, scale: [1.8, 1.3, 1.1] as V3 }
  head.push(piece(sphere, light, muzzle, { lump: 0.08, ground: null }))
  const nose = merge([piece(sphere, PALETTE.nose, { position: [0, 0, 0], scale: [0.55, 0.42, 0.4] }, { ground: null })])
  const cheeks = merge([-1, 1].map((side) => piece(sphere, PALETTE.cheek, { position: [side * 2.4, 0, 0], scale: [0.8, 0.5, 0.35] }, { ground: null })))
  const ears =
    species === 'rabbit'
      ? ([-1, 1].map((side) =>
          merge([
            piece(geo.capsule(14), fur, { position: [0, 2, 0], rotation: [-0.12, 0, -side * 0.16], scale: [1.4, 3.3, 0.9] }, { lump: 0.12, ground: null }),
            piece(geo.capsule(12), PALETTE.rabbitInner, { position: [0, 2.1, 0.55], rotation: [-0.12, 0, -side * 0.16], scale: [0.75, 2.6, 0.35] }, { ground: null }),
          ]),
        ) as [THREE.BufferGeometry, THREE.BufferGeometry])
      : null
  for (const side of [-1, 1]) {
    if (species === 'bear') {
      head.push(piece(sphere, fur, { position: [side * 2.7, 5.9, 0], scale: [1.35, 1.35, 0.9] }, { lump: 0.1, ground: null }))
      head.push(piece(sphere, PALETTE.bearMuzzle, { position: [side * 2.7, 5.9, 0.6], scale: [0.75, 0.75, 0.4] }, { ground: null }))
    } else if (species === 'hedgehog') {
      head.push(piece(sphere, fur, { position: [side * 2.4, 5.2, 0.2], scale: [0.8, 0.8, 0.5] }, { ground: null }))
    }
  }

  const eyes = [-1, 1].flatMap((side) => [
    piece(sphere, PALETTE.eye, { position: [side * 1.42, 0, 2.9], scale: [0.78, 0.9, 0.55] }, { ground: null }),
    piece(sphere, PALETTE.shine, { position: [side * 1.42 + 0.26, 0.32, 3.38], scale: 0.26 }, { ground: null }),
    piece(sphere, PALETTE.shine, { position: [side * 1.42 - 0.2, -0.28, 3.4], scale: 0.1 }, { ground: null }),
  ])
  const merged = merge(body)
  const low = lowPoints(merged)
  return {
    body: merged,
    head: merge(head),
    eyes: merge(eyes),
    mouth: merge([piece(geo.capsule(10), PALETTE.mouth, { rotation: [0, 0, Math.PI / 2], scale: [0.3, 0.7, 0.3] }, { ground: null })]),
    arm: merge([piece(geo.capsule(12), fur, { position: [0, -1.5, 0], scale: [1.2, 1.6, 1.2] }, { lump: 0.08, ground: null })]),
    nose,
    cheeks,
    ears,
    noseAt: [0, 2.8, muzzle.position[2] + muzzle.scale[2] * 0.85],
    furBody: species === 'hedgehog' ? null : withShells(piece(sphere, fur, { position: [0, 4, 0], scale: [4.4, 4.1, 4.1] }, { lump: 0.3, frequency: 0.55, seed: 1 })),
    furHead: species === 'hedgehog' ? null : withShells(piece(sphere, fur, { position: headSphere, scale: [3.5, 3.3, 3.3] }, { lump: 0.22, frequency: 0.7, seed: 3, ground: null })),
    quill: species === 'hedgehog' ? quillGeometry(PALETTE.spikes, '#c9a27a') : null,
    quillsBody: species === 'hedgehog' ? quillLayout(70, [0, 4.2, 0], 4.0, 1, 0.12, 1.8) : [],
    quillsHead: species === 'hedgehog' ? quillLayout(26, headSphere, 3.2, 5, 0.15, 1.15) : [],
    sole: soleOf(low),
    footReach: reachOf(low) * GUEST_SIZE * SQUASH_WIDEN,
  }
}

const shapeCache = new Map<Species, GuestShapes>()

export function speciesShapes(species: Species): GuestShapes {
  let cached = shapeCache.get(species)
  if (!cached) {
    cached = guestShapes(species)
    shapeCache.set(species, cached)
  }
  return cached
}

/** What the guest at `seat` stands on at `at`: the highest the feeding mat is anywhere under its feet (cm). */
export function guestFloor(seat: number, at: Point): number {
  return feedingFloor(at, speciesShapes(SEAT_SPECIES[seat % SEAT_SPECIES.length]).footReach)
}

/** Which way the guest at `seat` faces: toward the bowl, turned partway to the child. */
export function guestYaw(seat: number): number {
  const facing = FEEDING.seats[seat].facing
  return Math.atan2(-facing.x * 0.8, -facing.y + 1.5)
}
