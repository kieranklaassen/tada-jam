import * as THREE from 'three'
import type { Critter } from './critter'
import { CAMERA, onTurntable, TRAY, traySlot, TRAY_SLOT_RISE, TURNTABLE } from './layout'
import {
  BODY,
  canTake,
  ellipsoidPoint,
  FAMILY,
  HEAD_DIR,
  HEAD_RADIUS,
  LEG_LENGTH,
  MARK_EYES,
  MOUTH_DIR,
  NOSE_DIR,
  PART_KINDS,
  SINK,
  socketFor,
  socketOf,
  TAIL_DIR,
  tiltForward,
  type Hue,
  type PartKind,
  type Socket,
  type Vec3,
} from './parts'
import { HUE_HEX } from './palette'
import { noseHue } from './state'

// Pose to pixels, without React: every clay piece on the bench is an
// instance in one of a few shared batches (one per part shape, plus bodies,
// noses, pupils, lids, and painted marks). Each frame the rig walks the
// critters, builds a body frame from its pose, hangs every part on its
// socket, and writes matrices, colours, and boil amounts straight into the
// batches' typed arrays, which the view hands to its InstancedMeshes as-is.
// It also records where things ended up, for hit tests and shadows.

/** How far each part reaches out from its base along its local +y, in bench units (the shapes are built to match). */
export const PART_REACH: Record<PartKind, number> = {
  legStub: LEG_LENGTH.legStub,
  legLong: LEG_LENGTH.legLong,
  eye: 2.3,
  earRound: 3.4,
  earPoint: 4.6,
  earFlop: 5,
  tailCurl: 4.2,
  tailLong: 8,
  head: 4.845,
  horn: 3.4,
}
/** The eye's white ball: its centre height above the eye base, and its radius. */
export const EYE_BALL = { center: 1.05, radius: 1.3 } as const
export const PUPIL_RADIUS = 0.6
/**
 * Where each paw's sole spreads at the end of its leg, as (x, z) in the leg's frame: toes forward, heel back, and
 * its sides (measured from the shapes), so a tipped or swung leg keeps its toes and heel on the floor too.
 */
const SOLE = {
  legStub: solePoints(1.65, 2.45, 1.5),
  legLong: solePoints(1.55, 2.85, 1.5),
} as const
const SOLE_GAP = 0.02
const FLANK_LIFT = 1.5
type FaceBox = { readonly min: Vec3; readonly max: Vec3 }
/**
 * The local bounds of the shapes painted or pressed onto a body's face (measured from the shapes). The body's own
 * belly is flattened where it rests, so a nose or mouth low on a squashed lump would otherwise dip under it.
 */
const FACE_BOX: Record<'nose' | 'mark' | 'crescent', FaceBox> = {
  nose: { min: [-1.55, -0.6, -1.25], max: [1.55, 1.7, 1.25] },
  mark: { min: [-1.05, -0.25, -1.05], max: [1.05, 0.3, 1.05] },
  crescent: { min: [-1.25, -0.15, -0.8], max: [1.25, 0.25, 0.5] },
}
function solePoints(side: number, toes: number, heel: number): (readonly [number, number])[] {
  const d = 0.75
  return [[0, toes], [0, -heel], [side, 0], [-side, 0], [side * d, toes * d], [-side * d, toes * d], [side * d, -heel * d], [-side * d, -heel * d]]
}
/** How thick each part is around its tip, for a critter's footprint: a foot, an eyeball, the head's whole ball. */
const PART_GIRTH: Record<PartKind, number> = {
  legStub: 2.2,
  legLong: 2.2,
  eye: 1.4,
  earRound: 1.9,
  earPoint: 1.2,
  earFlop: 1.6,
  tailCurl: 2,
  tailLong: 1.6,
  head: HEAD_RADIUS,
  horn: 1,
}
/** The head's neck runs from its centre toward the body along this (unit) direction. */
const NECK_LENGTH = Math.hypot(0.87, 0.5)
export const HEAD_NECK: Vec3 = [0, -0.87 / NECK_LENGTH, -0.5 / NECK_LENGTH]

export type BatchKey = PartKind | 'body' | 'nose' | 'pupil' | 'lid' | 'mark' | 'crescent'
export const BATCH_KEYS: readonly BatchKey[] = [...PART_KINDS, 'body', 'nose', 'pupil', 'lid', 'mark', 'crescent']

const CAPACITY: Record<BatchKey, number> = {
  legStub: 44,
  legLong: 44,
  eye: 24,
  earRound: 16,
  earPoint: 16,
  earFlop: 16,
  tailCurl: 12,
  tailLong: 12,
  head: 12,
  horn: 16,
  body: 8,
  nose: 8,
  pupil: 30,
  lid: 30,
  mark: 24,
  crescent: 32,
}

function interned(prefix: string): (id: number | string) => string {
  const keys = new Map<number | string, string>()
  return (id) => {
    let key = keys.get(id)
    if (key === undefined) {
      key = `${prefix}-${id}`
      keys.set(id, key)
    }
    return key
  }
}

/**
 * Which thing on the bench an instance belongs to: a critter with every part pressed on it, a part in
 * its tray slot, on a finger, or flying home. Interned, so the frame loop allocates nothing; the view
 * hands them to the intersection audit as each mesh's `userData.jamInstanceObjects`.
 */
export const OWNER = { critter: interned('critter'), tray: interned('tray'), held: interned('held'), flying: interned('flying') } as const

/** One instanced draw's worth of clay: matrices, colours, per-instance boil (amount, seed), and owner. */
export class Batch {
  readonly matrices: Float32Array
  readonly colors: Float32Array
  readonly boil: Float32Array
  readonly owners: string[]
  count = 0

  constructor(readonly capacity: number) {
    this.matrices = new Float32Array(capacity * 16)
    this.colors = new Float32Array(capacity * 3).fill(1)
    this.boil = new Float32Array(capacity * 2)
    this.owners = new Array<string>(capacity).fill('')
  }

  push(matrix: THREE.Matrix4, color: ArrayLike<number>, colorAt: number, boil: number, seed: number, owner: string): void {
    if (this.count >= this.capacity) return
    const i = this.count++
    this.owners[i] = owner
    matrix.toArray(this.matrices, i * 16)
    this.colors[i * 3] = color[colorAt]
    this.colors[i * 3 + 1] = color[colorAt + 1]
    this.colors[i * 3 + 2] = color[colorAt + 2]
    this.boil[i * 2] = boil
    this.boil[i * 2 + 1] = seed
  }
}

/** Soft overlays (contact shadows, dents, glows, snore bubbles): a matrix and three parameters (strength, shape, spare) each. */
export class OverlayBatch {
  readonly matrices: Float32Array
  readonly params: Float32Array
  count = 0

  constructor(readonly capacity: number) {
    this.matrices = new Float32Array(capacity * 16)
    this.params = new Float32Array(capacity * 3)
  }

  push(matrix: THREE.Matrix4, strength: number, shape: number, spare = 0): void {
    if (this.count >= this.capacity || strength <= 0.003) return
    const i = this.count++
    matrix.toArray(this.matrices, i * 16)
    this.params[i * 3] = strength
    this.params[i * 3 + 1] = shape
    this.params[i * 3 + 2] = spare
  }
}

export const SHADOW_SHAPE = { blob: 0, dent: 1 } as const
export const GLOW_SHAPE = { glow: 0, bubble: 1, crumb: 2 } as const

/** Linear-space RGB for the three hues, then white (for pieces whose colour is painted into the geometry). */
const COLORS = new Float32Array(12)
for (const hue of [0, 1, 2] as const) {
  const c = new THREE.Color(HUE_HEX[hue])
  COLORS.set([c.r, c.g, c.b], hue * 3)
}
COLORS.set([1, 1, 1], 9)
const WHITE = 9
const hueAt = (hue: Hue) => hue * 3

const UP = new THREE.Vector3(0, 1, 0)
const FORWARD = new THREE.Vector3(0, 0, 1)
const ONE = new THREE.Vector3(1, 1, 1)

/**
 * Parts show a little larger in the tray and on a finger than on a body, so
 * small hands and eyes find them; a head shrinks to fit its slot. Each one
 * slides to its real size as it settles onto its socket.
 */
export const DISPLAY_SCALE: Record<PartKind, number> = {
  legStub: 1.3,
  legLong: 1.15,
  eye: 1.4,
  earRound: 1.3,
  earPoint: 1.1,
  earFlop: 1.15,
  tailCurl: 1.3,
  tailLong: 1,
  head: 0.78,
  horn: 1.4,
}

/**
 * How each part rests in the tray and hangs from a finger, turned so it
 * reads at a glance from the child's side: legs lie on their side with the
 * toe up, eyes and ears face the camera, tails curl up.
 */
function displayMatrix(kind: PartKind, out: THREE.Matrix4): THREE.Matrix4 {
  const tilt = Math.PI / 2 - CAMERA.pitch
  const s = DISPLAY_SCALE[kind]
  const scale = new THREE.Matrix4().makeScale(s, s, s)
  switch (FAMILY[kind]) {
    case 'legs': {
      // hip to foot runs left to right, toe pointing up and a little toward the child
      const lying = new THREE.Matrix4().makeBasis(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0), new THREE.Vector3(0, 1, 0))
      const lean = new THREE.Matrix4().makeRotationX(tilt * 0.35)
      const center = new THREE.Matrix4().makeTranslation((-PART_REACH[kind] * s) / 2, 0, 0)
      return out.copy(center).multiply(lean).multiply(lying).multiply(scale)
    }
    case 'eyes':
      return out.makeRotationX(tilt).multiply(scale)
    case 'ears':
      out.makeRotationX(-CAMERA.pitch * 0.85)
      if (kind === 'earFlop') out.multiply(new THREE.Matrix4().makeRotationZ(-1.05))
      return out.multiply(scale)
    case 'horns':
      return out.makeRotationX(tilt * 0.5).multiply(scale)
    case 'tail':
      return out.makeRotationFromEuler(new THREE.Euler(tilt * 0.6, kind === 'tailLong' ? 0.6 : 0, kind === 'tailLong' ? -0.9 : 0)).multiply(scale)
    case 'head':
      // stood on its neck, face tipped up toward the child
      return out.makeRotationX(-Math.atan2(-HEAD_NECK[2], -HEAD_NECK[1])).multiply(scale)
    default: {
      const unreachable: never = FAMILY[kind]
      return unreachable
    }
  }
}

/**
 * How far each part reaches below its origin as it lies in the tray (display pose and size): its
 * collar's rim, a leg's side, the head's neck. Measured from view/shapes.ts; tray.test.ts holds them
 * to the geometry, so a part rests on its slot instead of sinking into it.
 */
export const DISPLAY_FOOT: Record<PartKind, number> = {
  legStub: 2.373,
  legLong: 1.767,
  eye: 2.127,
  earRound: 1.314,
  earPoint: 1.112,
  earFlop: 1.119,
  tailCurl: 1.384,
  tailLong: 1.317,
  head: 4.845,
  horn: 1.414,
}
const REST_GAP = 0.02

/** The height at which a displayed part's base sits above the surface it rests on. */
export function displayBase(kind: PartKind): number {
  return TRAY_SLOT_RISE + DISPLAY_FOOT[kind] + REST_GAP
}

export type Anim = { sy: number; sxz: number; out: number; wiggle: number }

const surface = { p: [0, 0, 0] as Vec3, n: [0, 0, 0] as Vec3 }
const tilted: Vec3 = [0, 0, 0]
const socketScratch: Socket = { anchor: 'body', dir: TAIL_DIR }

export class Rig {
  readonly batches: Record<BatchKey, Batch>
  readonly shadows = new OverlayBatch(72)
  readonly glows = new OverlayBatch(48)
  /** The tray's resting matrices, one per part kind, from the slot's surface (without the regrow scale). */
  private readonly trayRest: Record<PartKind, THREE.Matrix4>
  readonly display: Record<PartKind, THREE.Matrix4>

  private readonly B = new THREE.Matrix4()
  private readonly F = new THREE.Matrix4()
  private readonly M = new THREE.Matrix4()
  private readonly W = new THREE.Matrix4()
  private readonly R = new THREE.Matrix4()
  private readonly T = new THREE.Matrix4()
  private readonly markScratch = new THREE.Matrix4()
  private readonly v = new THREE.Vector3()
  private readonly v2 = new THREE.Vector3()
  private readonly x = new THREE.Vector3()
  private readonly n = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly e = new THREE.Euler()
  private rx: number = BODY.rx
  private ry: number = BODY.ry
  private rz: number = BODY.rz
  private faceIsHead = false
  private owner = ''
  /** The top of what the critter being drawn stands over (none while it is carried). */
  private floor = 0
  private feetOnFloor = true

  constructor() {
    const batches = {} as Record<BatchKey, Batch>
    for (const key of BATCH_KEYS) batches[key] = new Batch(CAPACITY[key])
    this.batches = batches
    this.display = {} as Record<PartKind, THREE.Matrix4>
    this.trayRest = {} as Record<PartKind, THREE.Matrix4>
    for (const kind of PART_KINDS) {
      this.display[kind] = displayMatrix(kind, new THREE.Matrix4())
      this.trayRest[kind] = new THREE.Matrix4().makeTranslation(0, displayBase(kind) - TRAY_SLOT_RISE, 0).multiply(this.display[kind])
    }
  }

  begin(): void {
    for (const key of BATCH_KEYS) this.batches[key].count = 0
    this.shadows.count = 0
    this.glows.count = 0
  }

  // --- critters ------------------------------------------------------------------

  /** Build the body frame B and the face frame F for `critter` from its pose. */
  private frame(critter: Critter): void {
    const pose = critter.pose
    const w = critter.wobble
    this.rx = BODY.rx * pose.sx * (1 + 0.5 * w)
    this.ry = BODY.ry * pose.sy * (1 - w)
    this.rz = BODY.rz * pose.sz * (1 + 0.5 * w)
    const belly = this.ry * 0.92
    const legs = critter.profile.legs
    const lift = legs ? critter.standLift + (belly - critter.standLift) * pose.legSplay : belly
    const m = critter.mover
    this.floor = critter.mode === 'carried' ? -Infinity : onTurntable(m, 1) ? TURNTABLE.height : 0
    this.e.set(pose.pitch, m.heading + pose.yaw, pose.roll, 'YXZ')
    this.q.setFromEuler(this.e)
    this.v.set(m.x, critter.ground + lift + pose.lift, m.z)
    this.B.compose(this.v, this.q, ONE)
    this.faceIsHead = false
    this.F.copy(this.B)
    const parts = critter.save.parts
    for (let i = 0; i < parts.length; i++) {
      if (parts[i].kind !== 'head') continue
      this.headFrame(critter, this.F)
      this.faceIsHead = true
      break
    }
  }

  /** The head hangs off the body at HEAD_DIR and nods and tilts about its neck. */
  private headFrame(critter: Critter, out: THREE.Matrix4): THREE.Matrix4 {
    ellipsoidPoint(HEAD_DIR, this.rx, this.ry, this.rz, surface)
    const { p, n } = surface
    const pose = critter.pose
    out.copy(this.B).multiply(this.T.makeTranslation(p[0], p[1], p[2]))
    this.e.set(pose.headNod, 0, pose.headTilt, 'XYZ')
    out.multiply(this.R.makeRotationFromEuler(this.e))
    const reach = HEAD_RADIUS * 0.62
    return out.multiply(this.T.makeTranslation(n[0] * reach, n[1] * reach, n[2] * reach))
  }

  /** A point on the face (the head's sphere, or the body's front) along `dir`, into `surface`. */
  private faceSurface(dir: Vec3, tilt: boolean): void {
    if (this.faceIsHead) {
      const l = Math.sqrt(dir[0] * dir[0] + dir[1] * dir[1] + dir[2] * dir[2])
      for (let i = 0; i < 3; i++) {
        surface.n[i] = dir[i] / l
        surface.p[i] = surface.n[i] * HEAD_RADIUS
      }
      return
    }
    ellipsoidPoint(tilt ? tiltForward(dir, tilted) : dir, this.rx, this.ry, this.rz, surface)
  }

  /** Rotation with +y along `n` and +z leaning toward `hint`. */
  private basis(nx: number, ny: number, nz: number, hint: THREE.Vector3, out: THREE.Matrix4): THREE.Matrix4 {
    this.n.set(nx, ny, nz).normalize()
    this.x.crossVectors(this.n, hint)
    if (this.x.lengthSq() < 1e-6) this.x.crossVectors(this.n, hint === FORWARD ? UP : FORWARD)
    this.x.normalize()
    this.v2.crossVectors(this.x, this.n)
    return out.makeBasis(this.x, this.n, this.v2)
  }

  /**
   * The world matrix of a part of `kind` on its socket `dir` (with `legOrder`
   * the leg's place among the legs), animated by `anim`. Requires frame().
   */
  private place(critter: Critter, kind: PartKind, dir: Vec3, legOrder: number, anim: Anim | null, out: THREE.Matrix4): THREE.Matrix4 {
    const pose = critter.pose
    const sy = anim ? anim.sy : 1
    const sxz = anim ? anim.sxz : 1
    const push = anim ? anim.out : 0
    const wiggle = anim ? anim.wiggle : 0
    const family = FAMILY[kind]
    if (family === 'head') {
      this.headFrame(critter, out)
      return out.multiply(this.T.makeScale(sxz, sy, sxz))
    }
    if (family === 'legs') {
      // Each leg is stretched so its foot reaches the ground when the critter stands at rest.
      ellipsoidPoint(dir, BODY.rx, BODY.ry, BODY.rz, surface)
      const standY = critter.standLift + surface.p[1] + SINK
      ellipsoidPoint(dir, this.rx, this.ry, this.rz, surface)
      const { p } = surface
      const length = Math.min(1.6, Math.max(0.55, standY / LEG_LENGTH[kind as 'legStub' | 'legLong']))
      const side = Math.abs(dir[0]) < 0.05 ? 0 : Math.sign(dir[0])
      const splay = 0.12 + pose.legSplay * 1.25
      out.copy(this.B).multiply(this.T.makeTranslation(p[0], p[1] + SINK - push, p[2]))
      out.multiply(this.basis(0, -1, 0, FORWARD, this.R))
      if (side !== 0) out.multiply(this.R.makeRotationZ(side * splay))
      else out.multiply(this.R.makeRotationX((dir[2] >= 0 ? 1 : -1) * (splay - 0.12)))
      const swing = pose.legSwing[Math.min(legOrder, pose.legSwing.length - 1)]
      out.multiply(this.R.makeRotationX(swing + wiggle))
      const bend = pose.legBend[Math.min(legOrder, pose.legBend.length - 1)]
      out.multiply(this.T.makeScale(sxz, length * sy * (1 - 0.28 * bend), sxz))
      return this.footOnFloor(out, kind as 'legStub' | 'legLong')
    }
    if (family === 'tail') {
      ellipsoidPoint(dir, this.rx, this.ry, this.rz, surface)
      const { p, n } = surface
      const sink = SINK - push
      out.copy(this.B).multiply(this.T.makeTranslation(p[0] - n[0] * sink, p[1] - n[1] * sink, p[2] - n[2] * sink))
      out.multiply(this.basis(n[0], n[1], n[2], UP, this.R))
      out.multiply(this.R.makeRotationZ(pose.tail * 0.6 + wiggle))
      out.multiply(this.R.makeRotationX(pose.tailLift * 0.5))
      return out.multiply(this.T.makeScale(sxz, sy, sxz))
    }
    // face parts: eyes, ears, horns
    this.faceSurface(dir, family !== 'eyes')
    const { p, n } = surface
    const sink = (family === 'eyes' ? SINK * 0.5 : SINK) - push
    out.copy(this.F).multiply(this.T.makeTranslation(p[0] - n[0] * sink, p[1] - n[1] * sink, p[2] - n[2] * sink))
    out.multiply(this.basis(n[0], n[1], n[2], family === 'eyes' ? UP : FORWARD, this.R))
    if (family === 'ears') {
      const side = Math.sign(dir[0]) || 1
      if (kind === 'earFlop') {
        // hangs down past the cheek; perking up lifts it toward level
        const droop = Math.min(2.3, Math.max(1.25, 2.0 - 0.5 * pose.ear))
        out.multiply(this.R.makeRotationZ(-side * droop))
        out.multiply(this.R.makeRotationX(0.3 + 0.2 * pose.ear + wiggle))
      } else {
        out.multiply(this.R.makeRotationX((kind === 'earPoint' ? 0.2 : 0.12) * pose.ear + wiggle))
        out.multiply(this.R.makeRotationZ(-side * 0.18))
      }
    } else if (wiggle !== 0) out.multiply(this.R.makeRotationX(wiggle))
    return out.multiply(this.T.makeScale(sxz, sy, sxz))
  }

  /** A leg never reaches through what its critter stands on: splayed, tipped, or swung, it is shortened so its foot rests on top. */
  private footOnFloor(out: THREE.Matrix4, kind: 'legStub' | 'legLong'): THREE.Matrix4 {
    if (!this.feetOnFloor) return out
    const e = out.elements
    const down = -e[5] * LEG_LENGTH[kind]
    const room = e[13] - this.floor - SOLE_GAP
    let fit = 1
    if (down > 0) for (const [x, z] of SOLE[kind]) fit = Math.min(fit, (room + e[1] * x + e[9] * z) / down)
    fit = Math.max(0.15, fit)
    // A leg splayed out flat can't lift its paw by being shorter: it sits a little higher up its critter's flank
    // (its collar sinks deeper into the clay), and only past that is its paw slimmed.
    let low = 0
    for (const [x, z] of SOLE[kind]) low = Math.min(low, e[1] * x + e[9] * z)
    const left = room - fit * Math.max(0, down)
    const lift = Math.min(FLANK_LIFT, Math.max(0, -(left + low)))
    const girth = low < 0 ? Math.min(1, Math.max(0.3, (left + lift) / -low)) : 1
    e[13] += lift
    if (fit >= 1 && girth >= 1) return out
    return out.multiply(this.T.makeScale(girth, fit, girth))
  }

  private readonly anim: Anim = { sy: 1, sxz: 1, out: 0, wiggle: 0 }

  /** Squish-on, pull, and poke animation for part `index`. */
  private animFor(critter: Critter, index: number): Anim {
    const a = this.anim
    const age = critter.partAge[index] ?? 10
    a.sy = 1
    a.out = 0
    a.wiggle = 0
    if (age < 0.8) {
      const decay = Math.exp(-6.5 * age)
      a.sy = 1 - 0.5 * decay * Math.cos(15 * age)
      a.out = -0.7 * decay
    }
    const pull = critter.pull
    if (pull && pull.index === index) {
      a.sy *= 1 + 0.65 * pull.amount
      a.out += 1.6 * pull.amount
    }
    const poke = critter.poke
    if (poke && poke.index === index) a.wiggle = 0.35 * Math.sin(poke.t * 26) * (1 - poke.t / 0.7)
    a.sxz = 1 / Math.sqrt(Math.max(0.3, a.sy))
    return a
  }

  critter(critter: Critter): void {
    if (critter.gone) return
    this.frame(critter)
    const world = critter.world
    const boil = critter.boil
    const seed = (critter.save.seed % 997) / 997
    const pose = critter.pose
    const hue = hueAt(critter.save.hue)
    this.owner = OWNER.critter(critter.save.id)
    this.W.copy(this.B).multiply(this.T.makeScale(this.rx / BODY.rx, this.ry / BODY.ry, this.rz / BODY.rz))
    this.batches.body.push(this.W, COLORS, hue, boil, seed, this.owner)
    this.v.setFromMatrixPosition(this.B)
    world.body[0] = this.v.x
    world.body[1] = this.v.y
    world.body[2] = this.v.z
    world.bodyR = Math.max(this.rx, this.rz) * 1.08
    let footprint = world.bodyR

    const parts = critter.save.parts
    let legOrder = 0
    let eyes = 0
    world.feetCount = 0
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const socket = socketFor(parts, i, socketScratch)
      const isLeg = FAMILY[part.kind] === 'legs'
      this.place(critter, part.kind, socket.dir, legOrder, this.animFor(critter, i), this.W)
      this.batches[part.kind].push(this.W, COLORS, hueAt(part.hue), boil, seed + i * 0.07, this.owner)
      const reach = PART_REACH[part.kind] * 0.55
      this.v.set(0, reach, 0).applyMatrix4(this.W)
      world.parts[i * 3] = this.v.x
      world.parts[i * 3 + 1] = this.v.y
      world.parts[i * 3 + 2] = this.v.z
      this.v.set(0, PART_REACH[part.kind], 0).applyMatrix4(this.W)
      footprint = Math.max(footprint, Math.hypot(this.v.x - world.body[0], this.v.z - world.body[2]) + PART_GIRTH[part.kind])
      if (isLeg) {
        this.v.set(0, PART_REACH[part.kind], 0).applyMatrix4(this.W)
        const f = world.feetCount++ * 3
        world.feet[f] = this.v.x
        world.feet[f + 1] = this.v.y
        world.feet[f + 2] = this.v.z
        legOrder++
      }
      if (part.kind === 'eye') {
        eyes++
        this.eyeExtras(this.W, critter.lookX, critter.lookY, pose.lids, critter.save.hue, boil, seed)
      }
    }

    world.reach = footprint

    // nose
    this.faceSurface(NOSE_DIR, false)
    const { p, n } = surface
    this.W.copy(this.F).multiply(this.T.makeTranslation(p[0] - n[0] * 0.3, p[1] - n[1] * 0.3, p[2] - n[2] * 0.3))
    this.W.multiply(this.basis(n[0], n[1], n[2], UP, this.R))
    const nose = (1 + 0.1 * Math.max(0, -critter.wobble) * 4) * (1 + 0.4 * critter.itch)
    this.W.multiply(this.T.makeScale(nose, nose, nose))
    this.offFloor(this.W, FACE_BOX.nose)
    this.batches.nose.push(this.W, COLORS, hueAt(noseHue(critter.save.hue)), boil, seed + 0.5, this.owner)
    this.v.set(0, 0.8, 0).applyMatrix4(this.W)
    world.nose[0] = this.v.x
    world.nose[1] = this.v.y
    world.nose[2] = this.v.z

    // painted face: sleepy eyes when it has none of its own, and always a mouth
    if (eyes === 0) {
      const open = Math.min(1.25, Math.max(0, pose.lids))
      // shut, they are two sleepy crescents; opening, they become round dots
      if (open < 0.3) for (const dir of MARK_EYES) this.mark(dir, 0.95, 0.75 - open, boil, seed, 'crescent')
      else for (const dir of MARK_EYES) this.mark(dir, 0.55 + 0.2 * open, 0.3 + 0.5 * Math.min(1, open), boil, seed)
    }
    const mouth = Math.max(0, pose.mouth)
    this.mark(MOUTH_DIR, 0.7 + 0.3 * mouth, 0.16 + 0.6 * mouth, boil, seed)
  }

  private mark(dir: Vec3, width: number, height: number, boil: number, seed: number, key: 'mark' | 'crescent' = 'mark'): void {
    this.faceSurface(dir, false)
    const { p, n } = surface
    this.M.copy(this.F).multiply(this.T.makeTranslation(p[0], p[1], p[2]))
    this.M.multiply(this.basis(n[0], n[1], n[2], UP, this.R))
    this.M.multiply(this.T.makeScale(width, 1, height))
    this.offFloor(this.M, FACE_BOX[key])
    this.batches[key].push(this.M, COLORS, WHITE, boil * 0.5, seed, this.owner)
  }

  /** Moves a face feature up (into its body) until its lowest point clears the floor, as a squashed body's belly does. */
  private offFloor(m: THREE.Matrix4, box: FaceBox): void {
    const e = m.elements
    let low = e[13]
    for (let j = 0; j < 3; j++) low += Math.min(e[j * 4 + 1] * box.min[j], e[j * 4 + 1] * box.max[j])
    const below = this.floor + SOLE_GAP - low
    if (below > 0) e[13] += below
  }

  /** Pupils that look around (a glint painted in), and clay lids in the body's colour that close over the eye. */
  private eyeExtras(eye: THREE.Matrix4, lookX: number, lookY: number, lids: number, lidHue: Hue, boil: number, seed: number): void {
    this.M.copy(eye).multiply(this.T.makeTranslation(0, EYE_BALL.center, 0))
    this.W.copy(this.M)
    this.e.set(Math.max(-0.5, Math.min(0.5, lookY * 0.4)), 0, Math.max(-0.6, Math.min(0.6, lookX * 0.5)), 'XYZ')
    this.W.multiply(this.R.makeRotationFromEuler(this.e)).multiply(this.T.makeTranslation(0, EYE_BALL.radius * 0.86, 0))
    const wide = Math.max(1, Math.min(1.25, lids))
    this.W.multiply(this.T.makeScale(wide, 1, wide))
    // under a mostly shut lid the pupil's glint would poke through; a lash line shows the eye is closed instead
    if (lids > 0.3) this.batches.pupil.push(this.W, COLORS, WHITE, boil * 0.5, seed, this.owner)
    else {
      this.W.copy(this.M).multiply(this.T.makeTranslation(0, EYE_BALL.radius * 1.12, 0)).multiply(this.T.makeScale(0.85, 1, 0.85))
      this.batches.crescent.push(this.W, COLORS, WHITE, boil * 0.5, seed, this.owner)
    }
    if (lids < 0.995) {
      this.M.multiply(this.R.makeRotationX(Math.max(0, lids) * Math.PI))
      this.batches.lid.push(this.M, COLORS, hueAt(lidHue), boil, seed, this.owner)
    }
  }

  /**
   * Where a new part of `kind` would sit on `critter` (its world matrix into
   * `out`), or false when that family is full.
   */
  socket(critter: Critter, kind: PartKind, out: THREE.Matrix4): boolean {
    if (critter.gone || !canTake(critter.save.parts, kind)) return false
    this.frame(critter)
    const parts = critter.save.parts
    const socket = socketOf(parts, parts.length, kind, socketScratch)
    let legOrder = 0
    for (const part of parts) if (FAMILY[part.kind] === 'legs') legOrder++
    this.place(critter, kind, socket.dir, legOrder, null, out)
    return true
  }

  /**
   * Where a new part of this kind will show once pressed on: part-way along it, outside the body.
   * Glows and the demonstration aim here, not at the socket itself, which for a leg is under the
   * belly and would put the glow on the face.
   */
  socketMark(critter: Critter, kind: PartKind, out: THREE.Vector3): boolean {
    // where a standing leg would reach, even on a lump lying flat on the turntable
    this.feetOnFloor = false
    const room = this.socket(critter, kind, this.markScratch)
    this.feetOnFloor = true
    if (!room) return false
    // a leg is marked at its foot, clear of the nose that is tapped later
    out.set(0, PART_REACH[kind] * (FAMILY[kind] === 'legs' ? 1 : 0.7), 0).applyMatrix4(this.markScratch)
    return true
  }

  // --- the tray, loose parts -----------------------------------------------------

  /** A part resting in its tray slot, growing back (`grow` 0..1) and hopping (`hop` in bench units); it squashes and grows about where it touches the slot. */
  trayPart(kind: PartKind, hue: Hue, grow: number, hop: number, squash: number, boil: number): void {
    const g = Math.max(0.001, grow)
    const sy = g * (1 - squash)
    const sxz = g * (1 + squash * 0.6)
    const slot = traySlot(kind)
    this.W.makeTranslation(slot.x, TRAY.height + TRAY_SLOT_RISE + hop, slot.z).multiply(this.T.makeScale(sxz, sy, sxz)).multiply(this.trayRest[kind])
    this.loose(kind, hue, this.W, boil, PART_KINDS.indexOf(kind) * 0.1, OWNER.tray(kind))
  }

  /** A part on its own (in the tray, on a finger, or flying home), with its eye extras when it is an eye. */
  loose(kind: PartKind, hue: Hue, matrix: THREE.Matrix4, boil: number, seed: number, owner: string, lookX = 0, lookY = 0): void {
    this.owner = owner
    this.batches[kind].push(matrix, COLORS, hueAt(hue), boil, seed, owner)
    if (kind === 'eye') this.eyeExtras(matrix, lookX, lookY, 1, hue, boil, seed)
  }

  // --- overlays ------------------------------------------------------------------

  /** A soft contact shadow (or a thumbprint dent) lying on the surface at height `y`. */
  shadow(x: number, y: number, z: number, radius: number, strength: number, shape: number = SHADOW_SHAPE.blob, stretch = 1): void {
    this.W.makeRotationX(-Math.PI / 2)
    this.W.setPosition(x, y + 0.04, z)
    this.W.multiply(this.T.makeScale(radius * 2 * stretch, radius * 2, 1))
    this.shadows.push(this.W, strength, shape)
  }

  /** A camera-facing glow, snore bubble, or clay crumb of world size `size` at a point. */
  glow(x: number, y: number, z: number, size: number, strength: number, shape: number = GLOW_SHAPE.glow, spare = 0): void {
    this.W.makeScale(size, size, size)
    this.W.setPosition(x, y, z)
    this.glows.push(this.W, strength, shape, spare)
  }
}
