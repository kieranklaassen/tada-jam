import * as THREE from 'three'
import { FEEDING, type Point } from '../layout'
import { SEAT_SPECIES, type MotionPose, type Species } from '../motion'
import { feedingFloor } from '../surfaces'
import { lump, merge, PALETTE, piece } from './clay'
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
/** Where the parts that move on their own hang on the body and the head (model units; arms and ears mirrored by side): the joints arms and ears turn on. */
export const ARM_AT: V3 = [4.2, 4.07, 0.9]
export const EAR_AT: V3 = [1.4, 5.6, -0.3]
export const CHEEK_AT: V3 = [2.4, 2.3, 2.5]
/** How far the head sinks (curling up) as the cheeks tuck away into the face, from starting to gone: gone before the face meets the belly. */
const CHEEK_TUCK: [number, number] = [1.2, 1.9]
/** How small a tucking cheek has grown when it is all but sunk under the face, and is put away. */
const CHEEK_SUNK = 0.4

/** The nodes of a guest that move: the root turns and squashes the whole guest, the head sits on it, and the rest hang on the head or the body. */
export type GuestRig = {
  root: THREE.Object3D
  head: THREE.Object3D
  nose: THREE.Object3D
  cheeks: readonly (THREE.Object3D | null)[]
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
  const [noseY, noseZ, noseTilt] = alongTrack(shapes.noseTrack, m.nose)
  rig.nose.position.set(shapes.noseAt[0], noseY, noseZ)
  rig.nose.rotation.x = noseTilt
  rig.nose.scale.set(1 + Math.abs(m.nose) * 0.18, 1 - Math.abs(m.nose) * 0.2, 1)
  // A cheek puffs out of the face and tucks back into it about the point of it
  // sunk deepest in the head, so it never sinks any deeper however it swells;
  // tucked out of sight, it is put away rather than left shrinking inside.
  const tuck = 1 - THREE.MathUtils.smoothstep(m.headDrop, CHEEK_TUCK[0], CHEEK_TUCK[1])
  const puff: V3 = [(1 + m.cheeks * 0.12) * tuck, (1 + m.cheeks * 0.45) * tuck, (1 + m.cheeks * 0.6) * tuck]
  rig.cheeks.forEach((cheek, side) => {
    if (!cheek) return
    const mirror = side === 0 ? -1 : 1
    const deep: V3 = [shapes.cheekDeep[0] * mirror, shapes.cheekDeep[1], shapes.cheekDeep[2]]
    cheek.visible = tuck > CHEEK_SUNK
    cheek.scale.set(...puff)
    cheek.position.set(mirror * CHEEK_AT[0] + deep[0] * (1 - puff[0]), CHEEK_AT[1] + deep[1] * (1 - puff[1]), CHEEK_AT[2] + deep[2] * (1 - puff[2]))
  })
  rig.ears.forEach((ear, side) => ear?.rotation.set(-0.05 - m.ears[side] * 0.9, 0, (side === 0 ? 1 : -1) * m.ears[side] * 0.15))
  rig.arms.forEach((arm, side) => arm?.rotation.set(-m.armForward[side], 0, (side === 0 ? -1 : 1) * (0.45 + m.armUp[side])))
}

export type GuestShapes = {
  body: THREE.BufferGeometry
  head: THREE.BufferGeometry
  eyes: THREE.BufferGeometry
  mouth: THREE.BufferGeometry
  arm: THREE.BufferGeometry
  /** Parts that move on their own: nose (wiggles), a cheek drawn on each side (puffs), rabbit ears (flick, left then right, built out from the joint they turn on). */
  nose: THREE.BufferGeometry
  cheek: THREE.BufferGeometry
  /** From the right cheek's middle to its point sunk deepest in the head (mirrored for the left). */
  cheekDeep: V3
  ears: [THREE.BufferGeometry, THREE.BufferGeometry] | null
  noseAt: V3
  /** Where the nose goes as it wiggles (see `noseTrack`). */
  noseTrack: Float32Array
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

/**
 * A unit capsule reshaped into a part that turns on a joint at its origin and
 * reaches along +y: `width` and `depth` across (x and z radii), its near end a
 * round knob `knob` tall centred `root` along, its far end a cap `tip` tall
 * ending `reach` along. Lumped like the rest of the clay except around the
 * knob, which, left smooth and round about the joint, sinks into what the part
 * hangs on by the same amount however the part turns.
 */
function stalk(segments: number, size: { root: number; knob: number; reach: number; tip: number; width: number; depth: number }, amount = 0): THREE.BufferGeometry {
  const smooth = geo.capsule(segments)
  const lumped = amount ? lump(smooth, amount) : smooth
  const from = smooth.attributes.position
  const g = lumped.clone()
  const position = g.attributes.position
  const { root, knob, reach, tip, width, depth } = size
  for (let i = 0; i < position.count; i++) {
    const w = THREE.MathUtils.smoothstep(from.getY(i), -0.5, 0)
    const [x, y, z] = [0, 1, 2].map((axis) => from.getComponent(i, axis) + (position.getComponent(i, axis) - from.getComponent(i, axis)) * w)
    const along = y < -0.5 ? root + (y + 0.5) * 2 * knob : y > 0.5 ? reach - tip + (y - 0.5) * 2 * tip : root + (y + 0.5) * (reach - tip - root)
    position.setXYZ(i, x * 2 * width, along, z * 2 * depth)
  }
  g.computeVertexNormals()
  return g
}

/** From the middle of an ellipsoid of radii `size` at `at` to its point sunk deepest into the ellipsoid of radii `radii` at `centre`, the head it sits on. */
function deepestInto(at: V3, size: V3, centre: V3, radii: V3): V3 {
  const inward = new THREE.Vector3(...[0, 1, 2].map((k) => (centre[k] - at[k]) / radii[k] ** 2)).normalize()
  const reach = new THREE.Vector3(size[0] * inward.x, size[1] * inward.y, size[2] * inward.z).length()
  return [0, 1, 2].map((k) => (size[k] ** 2 * inward.getComponent(k)) / reach) as V3
}

/** How far the nose slides along its snout per unit of wiggle, and the widest wiggle `noseTrack` covers. */
const NOSE_SLIDE = 0.22
const NOSE_WIGGLE = 2
const NOSE_STEPS = 16

/**
 * Where the nose goes as it wiggles, as [y, z, tilt] at wiggles evenly from
 * -NOSE_WIGGLE to NOSE_WIGGLE: it slides up and down the front of the snout,
 * turning with the surface under it, so it stays pressed in as far as it sits
 * at rest instead of sinking into the snout or lifting off it.
 */
function noseTrack(head: THREE.BufferGeometry, rest: V3): Float32Array {
  const mesh = new THREE.Mesh(head)
  const ray = new THREE.Raycaster()
  const back = new THREE.Vector3(0, 0, -1)
  const front = (y: number) => {
    ray.set(new THREE.Vector3(rest[0], y, 100), back)
    return ray.intersectObject(mesh)[0]?.point.z ?? rest[2]
  }
  const span = 0.15
  const slope = (y: number) => Math.atan((front(y + span) - front(y - span)) / (2 * span))
  const [y0, sunk, tilt0] = [rest[1], front(rest[1]) - rest[2], slope(rest[1])]
  const track = new Float32Array((NOSE_STEPS + 1) * 3)
  for (let i = 0; i <= NOSE_STEPS; i++) {
    const y = y0 + ((i / NOSE_STEPS) * 2 - 1) * NOSE_WIGGLE * NOSE_SLIDE
    const tilt = slope(y) - tilt0
    track.set([y + sunk * Math.sin(tilt), front(y) - sunk * Math.cos(tilt), tilt], i * 3)
  }
  return track
}

/** The [y, z, tilt] on `track` at `wiggle`. */
function alongTrack(track: Float32Array, wiggle: number): V3 {
  const at = ((THREE.MathUtils.clamp(wiggle, -NOSE_WIGGLE, NOSE_WIGGLE) / NOSE_WIGGLE + 1) / 2) * NOSE_STEPS
  const i = Math.min(Math.floor(at), NOSE_STEPS - 1)
  const f = at - i
  return [0, 1, 2].map((k) => track[i * 3 + k] + (track[(i + 1) * 3 + k] - track[i * 3 + k]) * f) as V3
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
  const headRadii: V3 = species === 'hedgehog' ? [3.4, 3.1, 3.3] : [3.5, 3.3, 3.3]
  const head = [piece(sphere, fur, { position: headSphere, scale: headRadii }, { lump: 0.22, frequency: 0.7, seed: 3, ground: null })]
  const muzzle = species === 'hedgehog' ? { position: [0, 2.3, 3.4] as V3, scale: [1.5, 1.3, 1.9] as V3 } : { position: [0, 2.3, 2.9] as V3, scale: [1.8, 1.3, 1.1] as V3 }
  head.push(piece(sphere, light, muzzle, { lump: 0.08, ground: null }))
  const nose = merge([piece(sphere, PALETTE.nose, { scale: [0.55, 0.42, 0.4] }, { ground: null })])
  const cheekSize: V3 = [0.8, 0.5, 0.35]
  const cheek = merge([piece(sphere, PALETTE.cheek, { scale: cheekSize }, { ground: null })])
  const ears =
    species === 'rabbit'
      ? ([-1, 1].map((side) =>
          merge([
            piece(stalk(14, { root: 0, knob: 0.45, reach: 5.28, tip: 1.65, width: 0.7, depth: 0.45 }, 0.12), fur, { rotation: [-0.074, 0, -side * 0.1] }, { ground: null }),
            piece(stalk(12, { root: 0.5, knob: 0.175, reach: 4.7, tip: 1.3, width: 0.375, depth: 0.175 }).translate(0, 0, 0.55), PALETTE.rabbitInner, { rotation: [-0.074, 0, -side * 0.1] }, { ground: null }),
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
  const headShape = merge(head)
  const noseAt: V3 = [0, 2.8, muzzle.position[2] + muzzle.scale[2] * 0.85]
  const low = lowPoints(merged)
  return {
    body: merged,
    head: headShape,
    eyes: merge(eyes),
    mouth: merge([piece(geo.capsule(10), PALETTE.mouth, { rotation: [0, 0, Math.PI / 2], scale: [0.3, 0.7, 0.3] }, { ground: null })]),
    arm: merge([piece(stalk(12, { root: 0, knob: 0.6, reach: 2.4, tip: 0.8, width: 0.6, depth: 0.6 }, 0.08), fur, { rotation: [0, 0, Math.PI] }, { ground: null })]),
    nose,
    cheek,
    cheekDeep: deepestInto(CHEEK_AT, cheekSize, headSphere, headRadii),
    ears,
    noseAt,
    noseTrack: noseTrack(headShape, noseAt),
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
