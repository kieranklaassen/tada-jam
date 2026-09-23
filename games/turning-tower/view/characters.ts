import * as THREE from 'three'
import type { BirdPose, WandererPose } from '../motion'
import type { Vec3 } from '../world'
import { box, Builder, emissive } from './build'
import { hex, PALETTE, type RGB } from './palette'

// The two characters, built once from faceted primitives (KTD9). Local frame:
// feet at the origin, facing +z, +x to the character's right as seen from the
// camera at the default heading. Each moving part is its own mesh so poses
// are plain transforms; nothing here allocates once built.

type V = [number, number, number]

const INDIGO = hex(PALETTE.indigo)
const INDIGO_LIGHT = hex(PALETTE.indigoLight)
const CREAM = hex(PALETTE.cream)
const HUB = hex(PALETTE.hub)
const LANTERN_CORE = emissive(hex(PALETTE.lanternCore))
const LANTERN = hex(PALETTE.lantern)
const PATH = hex(PALETTE.path)
const PATH_EDGE = hex(PALETTE.pathEdge)
const BIRD_BODY = hex(PALETTE.birdBody)
const BIRD_BELLY = hex(PALETTE.cream)
const BIRD_WING = hex(PALETTE.birdWing)
const BIRD_ACCENT = hex(PALETTE.birdBack)
const BEAK = hex(PALETTE.beak)
const BLUSH = hex(PALETTE.blush)

/** A capped frustum around +y: radius r0 at y0 to r1 at y1 (r1 = 0 makes a cone). */
function frustum(b: Builder, centre: Vec3, r0: number, r1: number, y0: number, y1: number, sides: number, color: RGB, phase = 0, lean: Vec3 = [0, 0, 0]): void {
  const inside: V = [centre[0] + lean[0] * 0.5, centre[1] + (y0 + y1) / 2, centre[2] + lean[2] * 0.5]
  const at = (i: number, r: number, y: number, top: boolean): V => {
    const a = phase + (i / sides) * Math.PI * 2
    return [centre[0] + Math.sin(a) * r + (top ? lean[0] : 0), centre[1] + y, centre[2] + Math.cos(a) * r + (top ? lean[2] : 0)]
  }
  const top: V = [centre[0] + lean[0], centre[1] + y1, centre[2] + lean[2]]
  const bottom: V = [centre[0], centre[1] + y0, centre[2]]
  for (let i = 0; i < sides; i++) {
    const p0 = at(i, r0, y0, false)
    const p1 = at(i + 1, r0, y0, false)
    const q0 = at(i, r1, y1, true)
    const q1 = at(i + 1, r1, y1, true)
    if (r1 > 0) {
      b.quadAway(p0, p1, q1, q0, inside, color)
      b.triAway(top, q0, q1, bottom, color)
    } else {
      b.triAway(p0, p1, top, inside, color)
    }
    b.triAway(bottom, p1, p0, top, color)
  }
}

/** A faceted ball: `rings` bands of `sides` facets. */
function ball(b: Builder, centre: Vec3, radius: number, sides: number, rings: number, color: RGB, squashY = 1): void {
  const at = (ring: number, side: number): V => {
    const phi = -Math.PI / 2 + (ring / rings) * Math.PI
    const theta = (side / sides) * Math.PI * 2 + (ring % 2) * (Math.PI / sides)
    return [centre[0] + Math.sin(theta) * Math.cos(phi) * radius, centre[1] + Math.sin(phi) * radius * squashY, centre[2] + Math.cos(theta) * Math.cos(phi) * radius]
  }
  for (let r = 0; r < rings; r++) {
    for (let s = 0; s < sides; s++) {
      const a = at(r, s)
      const bb = at(r, s + 1)
      const c = at(r + 1, s + 1)
      const d = at(r + 1, s)
      if (r === 0) b.triAway(a, c, d, centre, color)
      else if (r === rings - 1) b.triAway(a, bb, d, centre, color)
      else {
        b.triAway(a, bb, d, centre, color)
        b.triAway(bb, c, d, centre, color)
      }
    }
  }
}

/** Big enough for a seven-year-old to find at a glance: a hood nearly as tall as a paver is wide. */
export const WANDERER_SCALE = 1.3

/**
 * The lantern hangs from the hook of a staff held out from the cloak, at head
 * height, so it reads beside the body from any heading instead of trailing on
 * the ground.
 */
const LANTERN_SCALE = 1.4
const ARM_OUT = 0.25
const STAFF_TOP = 0.66
const STAFF_HOOK = 0.1

export type WandererRig = {
  root: THREE.Object3D
  shadow: THREE.Object3D
  halo: THREE.Object3D
  apply(pose: WandererPose): void
}

/**
 * A small pilgrim in a deep indigo cloak and a tall pointed hood, carrying an
 * amber lantern on a crooked staff. Indigo against coral is the strongest
 * contrast in the scene: the child finds the wanderer first.
 */
export function buildWanderer(material: THREE.Material, halo: THREE.Object3D, shadow: THREE.Object3D): WandererRig {
  const body = new Builder()
  frustum(body, [0, 0, 0], 0.2, 0.195, 0, 0.06, 7, INDIGO_LIGHT)
  frustum(body, [0, 0, 0], 0.19, 0.085, 0.05, 0.36, 7, INDIGO)
  frustum(body, [0, 0, 0], 0.11, 0.1, 0.33, 0.38, 7, CREAM, Math.PI / 7)
  box(body, [-0.1, 0, 0.1], [-0.035, 0.035, 0.2], HUB)
  box(body, [0.035, 0, 0.1], [0.1, 0.035, 0.2], HUB)

  const head = new Builder()
  frustum(head, [0, 0, -0.01], 0.13, 0, 0.0, 0.38, 7, INDIGO, 0, [0, 0, -0.11])
  // The face: a cream mask set into the hood, with two dark eyes.
  const faceZ = 0.085
  for (let i = 0; i < 8; i++) {
    const a0 = (i / 8) * Math.PI * 2
    const a1 = ((i + 1) / 8) * Math.PI * 2
    head.triAway([0, 0.11, faceZ + 0.02], [Math.sin(a0) * 0.068, 0.11 + Math.cos(a0) * 0.072, faceZ], [Math.sin(a1) * 0.068, 0.11 + Math.cos(a1) * 0.072, faceZ], [0, 0.11, 0], CREAM)
  }
  box(head, [-0.036, 0.1, faceZ + 0.012], [-0.018, 0.13, faceZ + 0.028], INDIGO)
  box(head, [0.018, 0.1, faceZ + 0.012], [0.036, 0.13, faceZ + 0.028], INDIGO)
  box(head, [-0.052, 0.075, faceZ + 0.008], [-0.03, 0.088, faceZ + 0.022], BLUSH)
  box(head, [0.03, 0.075, faceZ + 0.008], [0.052, 0.088, faceZ + 0.022], BLUSH)

  const arm = new Builder()
  box(arm, [-0.026, -0.17, -0.026], [0.026, 0.01, 0.026], INDIGO)
  ball(arm, [0, -0.18, 0], 0.034, 5, 3, CREAM)

  const staff = new Builder()
  box(staff, [-0.016, -0.1, -0.016], [0.016, STAFF_TOP, 0.016], HUB)
  box(staff, [-0.016, STAFF_TOP - 0.03, -0.016], [STAFF_HOOK + 0.016, STAFF_TOP, 0.016], HUB)
  box(staff, [STAFF_HOOK - 0.012, STAFF_TOP - 0.05, -0.012], [STAFF_HOOK + 0.012, STAFF_TOP - 0.02, 0.012], HUB)

  const lantern = new Builder()
  box(lantern, [-0.007, -0.04, -0.007], [0.007, 0, 0.007], HUB)
  frustum(lantern, [0, 0, 0], 0.058, 0.018, -0.075, -0.035, 6, HUB)
  frustum(lantern, [0, 0, 0], 0.05, 0.05, -0.16, -0.075, 6, LANTERN_CORE, Math.PI / 6)
  frustum(lantern, [0, 0, 0], 0.04, 0.058, -0.18, -0.16, 6, LANTERN)

  const root = new THREE.Object3D()
  const figure = new THREE.Object3D()
  figure.scale.setScalar(WANDERER_SCALE)
  root.add(figure)
  const torso = new THREE.Object3D()
  figure.add(torso)
  const bodyMesh = new THREE.Mesh(body.geometry(), material)
  torso.add(bodyMesh)
  const headMesh = new THREE.Mesh(head.geometry(), material)
  headMesh.position.set(0, 0.36, 0)
  headMesh.rotation.order = 'YXZ'
  torso.add(headMesh)
  const armPivot = new THREE.Object3D()
  armPivot.position.set(0.14, 0.29, 0.02)
  armPivot.rotation.order = 'YXZ'
  armPivot.add(new THREE.Mesh(arm.geometry(), material))
  torso.add(armPivot)
  // The staff stands upright in the hand whatever the arm's outward angle.
  const staffPivot = new THREE.Object3D()
  staffPivot.position.set(0, -0.18, 0)
  staffPivot.rotation.z = -ARM_OUT
  staffPivot.add(new THREE.Mesh(staff.geometry(), material))
  armPivot.add(staffPivot)
  const lanternPivot = new THREE.Object3D()
  lanternPivot.position.set(STAFF_HOOK, STAFF_TOP - 0.05, 0)
  lanternPivot.scale.setScalar(LANTERN_SCALE)
  lanternPivot.add(new THREE.Mesh(lantern.geometry(), material))
  const glass = new THREE.Object3D()
  glass.position.set(0, -0.12, 0)
  lanternPivot.add(glass)
  staffPivot.add(lanternPivot)
  for (const mesh of [bodyMesh, headMesh]) mesh.frustumCulled = false

  const LIFT = 0.7
  return {
    root,
    shadow,
    halo,
    apply(pose) {
      root.visible = pose.alpha > 0.03
      shadow.visible = root.visible
      halo.visible = root.visible
      root.position.set(pose.x, pose.y + pose.bob, pose.z)
      if (pose.tiltAxis === 2) {
        root.rotation.order = 'ZYX'
        root.rotation.set(0, pose.heading, pose.tilt)
      } else {
        root.rotation.order = 'XYZ'
        root.rotation.set(pose.tiltAxis === 1 ? pose.tilt : 0, pose.heading, 0)
      }
      const s = pose.squash
      torso.scale.set(1 / Math.sqrt(s), s, 1 / Math.sqrt(s))
      torso.rotation.set(pose.lean, 0, pose.roll)
      headMesh.rotation.set(-pose.headPitch, pose.headYaw, 0)
      armPivot.rotation.set(-pose.arm * LIFT, pose.armYaw, ARM_OUT)
      lanternPivot.rotation.set(pose.arm * LIFT - pose.swingForward, 0, -pose.swingSide)
      shadow.position.set(pose.x, pose.y + 0.012, pose.z)
      root.updateWorldMatrix(true, true)
      halo.position.setFromMatrixPosition(glass.matrixWorld)
    },
  }
}

export type BirdRig = {
  root: THREE.Object3D
  shadow: THREE.Object3D
  apply(pose: BirdPose): void
}

/**
 * A plump cerulean bird the size of one block, with a flat back saddled in
 * the same mint as every walkable path: where it is a moving bridge, it looks
 * like one. It is not sunflower, because in most dioramas it is company, not
 * a handle; a cream crest and tail tips make it a bluebird.
 */
export function buildBird(material: THREE.Material, shadow: THREE.Object3D): BirdRig {
  const body = new Builder()
  const w = 0.43
  const y0 = 0.16
  const y1 = 0.95
  const c = 0.15
  const section: [number, number][] = [
    [-w + c, y0],
    [w - c, y0],
    [w, y0 + c],
    [w, y1 - c],
    [w - c, y1],
    [-w + c, y1],
    [-w, y1 - c],
    [-w, y0 + c],
  ]
  const mid = (y0 + y1) / 2
  const rings: [number, number][] = [
    [-0.47, 0.55],
    [-0.38, 1],
    [0.3, 1],
    [0.44, 0.7],
  ]
  const point = (ring: number, j: number): V => {
    const [z, k] = rings[ring]
    const [x, y] = section[j % section.length]
    return [x * k, mid + (y - mid) * k, z]
  }
  const centre: V = [0, mid, -0.02]
  const belly = new Set([0, 1, 7])
  for (let r = 0; r + 1 < rings.length; r++) {
    for (let j = 0; j < section.length; j++) {
      body.quadAway(point(r, j), point(r, j + 1), point(r + 1, j + 1), point(r + 1, j), centre, belly.has(j) ? BIRD_BELLY : BIRD_BODY)
    }
  }
  for (const [ring, z] of [
    [0, rings[0][0]],
    [rings.length - 1, rings[rings.length - 1][0]],
  ] as const) {
    const capCentre: V = [0, mid, z]
    for (let j = 0; j < section.length; j++) body.triAway(capCentre, point(ring, j), point(ring, j + 1), centre, belly.has(j) ? BIRD_BELLY : BIRD_BODY)
  }
  // The saddle: a mint paver on its back, exactly where the wanderer stands.
  box(body, [-0.31, y1 - 0.004, -0.33], [0.31, y1 + 0.03, 0.25], PATH_EDGE)
  body.quad([-0.29, y1 + 0.031, -0.31], [-0.29, y1 + 0.031, 0.23], [0.29, y1 + 0.031, 0.23], [0.29, y1 + 0.031, -0.31], PATH)
  for (const x of [-0.15, 0.15]) {
    box(body, [x - 0.025, 0.02, -0.02], [x + 0.025, y0 + 0.02, 0.03], BEAK)
    box(body, [x - 0.06, 0, -0.03], [x + 0.06, 0.03, 0.12], BEAK)
  }

  const head = new Builder()
  ball(head, [0, 0.12, 0.06], 0.24, 8, 4, BIRD_BODY)
  const beakBase = 0.27
  const tip: V = [0, 0.08, 0.46]
  const beakInside: V = [0, 0.1, beakBase]
  const corners: V[] = [
    [-0.075, 0.03, beakBase],
    [0.075, 0.03, beakBase],
    [0.075, 0.16, beakBase],
    [-0.075, 0.16, beakBase],
  ]
  for (let i = 0; i < 4; i++) head.triAway(corners[i], corners[(i + 1) % 4], tip, beakInside, BEAK)
  for (const side of [-1, 1]) {
    const ex = side * 0.215
    box(head, [ex - 0.03, 0.14, 0.12], [ex + 0.03, 0.22, 0.2], INDIGO)
    box(head, [ex - (side > 0 ? 0.005 : 0.035), 0.195, 0.175], [ex + (side > 0 ? 0.035 : 0.005), 0.215, 0.195], CREAM)
    box(head, [side * 0.14 - 0.05, 0.04, 0.2], [side * 0.14 + 0.05, 0.08, 0.26], BLUSH)
  }
  head.plate([[0, 0.34, 0.08], [0, 0.52, -0.06], [0, 0.35, -0.04]], BIRD_ACCENT)
  head.plate([[0, 0.33, 0.0], [0, 0.46, -0.16], [0, 0.32, -0.1]], BIRD_ACCENT)

  const tail = new Builder()
  tail.plate([[-0.06, 0, 0], [-0.24, 0.16, -0.32], [-0.1, 0.2, -0.36]], BIRD_ACCENT)
  tail.plate([[0, 0, 0], [-0.06, 0.26, -0.42], [0.06, 0.26, -0.42]], BIRD_ACCENT)
  tail.plate([[0.06, 0, 0], [0.1, 0.2, -0.36], [0.24, 0.16, -0.32]], BIRD_ACCENT)

  const wing = (side: number): THREE.BufferGeometry => {
    const b = new Builder()
    const x = side * 0.012
    b.plate(
      [
        [x, 0, 0.22],
        [x, -0.02, -0.3],
        [x, -0.44, -0.36],
        [x, -0.34, 0.06],
      ],
      BIRD_WING,
    )
    b.plate(
      [
        [x * 2, -0.34, -0.2],
        [x * 2, -0.44, -0.36],
        [x * 2, -0.3, -0.38],
      ],
      BIRD_ACCENT,
    )
    return b.geometry()
  }

  const root = new THREE.Object3D()
  const torso = new THREE.Object3D()
  root.add(torso)
  torso.add(new THREE.Mesh(body.geometry(), material))
  const headMesh = new THREE.Mesh(head.geometry(), material)
  headMesh.position.set(0, 0.86, 0.34)
  headMesh.rotation.order = 'YXZ'
  torso.add(headMesh)
  const tailMesh = new THREE.Mesh(tail.geometry(), material)
  tailMesh.position.set(0, 0.8, -0.44)
  torso.add(tailMesh)
  const wings = [1, -1].map((side) => {
    const mesh = new THREE.Mesh(wing(side), material)
    mesh.position.set(side * (w + 0.005), 0.8, -0.02)
    torso.add(mesh)
    return { mesh, side }
  })

  return {
    root,
    shadow,
    apply(pose) {
      root.visible = pose.alpha > 0.03
      shadow.visible = root.visible && pose.wing === 0
      root.position.set(pose.x, pose.y + pose.bob, pose.z)
      root.rotation.set(0, pose.heading, 0)
      const s = pose.squash
      const p = 1 + pose.puff * 0.14
      torso.scale.set(p / Math.sqrt(s), p * s, p / Math.sqrt(s))
      torso.rotation.set(pose.pitch, 0, 0)
      headMesh.rotation.set(-pose.headPitch, pose.headYaw, pose.headTilt)
      tailMesh.rotation.set(Math.max(-0.6, Math.min(0.8, pose.tail * 0.5)), 0, 0)
      for (const { mesh, side } of wings) mesh.rotation.set(0, 0, side * pose.wing)
      shadow.position.set(pose.x, pose.y + 0.012, pose.z)
    },
  }
}
