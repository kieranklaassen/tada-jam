import * as THREE from 'three'
import type { Critter } from './critter'
import { CAMERA, TRAY, traySlot } from './layout'
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
  head: 0,
  horn: 3.4,
}
/** The eye's white ball: its centre height above the eye base, and its radius. */
export const EYE_BALL = { center: 1.05, radius: 1.3 } as const
export const PUPIL_RADIUS = 0.6

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
  crescent: 16,
}

/** One instanced draw's worth of clay: matrices, colours, and per-instance boil (amount, seed). */
export class Batch {
  readonly matrices: Float32Array
  readonly colors: Float32Array
  readonly boil: Float32Array
  count = 0

  constructor(readonly capacity: number) {
    this.matrices = new Float32Array(capacity * 16)
    this.colors = new Float32Array(capacity * 3).fill(1)
    this.boil = new Float32Array(capacity * 2)
  }

  push(matrix: THREE.Matrix4, color: ArrayLike<number>, colorAt: number, boil: number, seed: number): void {
    if (this.count >= this.capacity) return
    const i = this.count++
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
      return out.copy(scale)
    default: {
      const unreachable: never = FAMILY[kind]
      return unreachable
    }
  }
}

/** The height at which a displayed part's base sits above the surface it rests on. */
export function displayBase(kind: PartKind): number {
  const s = DISPLAY_SCALE[kind]
  switch (FAMILY[kind]) {
    case 'legs':
      return 1.3 * s
    case 'head':
      return HEAD_RADIUS * 0.8 * s
    case 'tail':
      return (kind === 'tailLong' ? 1.4 : 0.9) * s
    default:
      return 0.4 * s
  }
}

export type Anim = { sy: number; sxz: number; out: number; wiggle: number }

const surface = { p: [0, 0, 0] as Vec3, n: [0, 0, 0] as Vec3 }
const tilted: Vec3 = [0, 0, 0]
const socketScratch: Socket = { anchor: 'body', dir: TAIL_DIR }

export class Rig {
  readonly batches: Record<BatchKey, Batch>
  readonly shadows = new OverlayBatch(72)
  readonly glows = new OverlayBatch(48)
  /** The tray's resting matrices, one per part kind (without the regrow scale). */
  private readonly trayRest: Record<PartKind, THREE.Matrix4>
  readonly display: Record<PartKind, THREE.Matrix4>

  private readonly B = new THREE.Matrix4()
  private readonly F = new THREE.Matrix4()
  private readonly M = new THREE.Matrix4()
  private readonly W = new THREE.Matrix4()
  private readonly R = new THREE.Matrix4()
  private readonly T = new THREE.Matrix4()
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

  constructor() {
    const batches = {} as Record<BatchKey, Batch>
    for (const key of BATCH_KEYS) batches[key] = new Batch(CAPACITY[key])
    this.batches = batches
    this.display = {} as Record<PartKind, THREE.Matrix4>
    this.trayRest = {} as Record<PartKind, THREE.Matrix4>
    for (const kind of PART_KINDS) {
      this.display[kind] = displayMatrix(kind, new THREE.Matrix4())
      const slot = traySlot(kind)
      this.trayRest[kind] = new THREE.Matrix4().makeTranslation(slot.x, TRAY.height + displayBase(kind), slot.z).multiply(this.display[kind])
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
    const [px, py, pz] = surface.p
    const [nx, ny, nz] = surface.n
    const pose = critter.pose
    out.copy(this.B).multiply(this.T.makeTranslation(px, py, pz))
    this.e.set(pose.headNod, 0, pose.headTilt, 'XYZ')
    out.multiply(this.R.makeRotationFromEuler(this.e))
    const reach = HEAD_RADIUS * 0.62
    return out.multiply(this.T.makeTranslation(nx * reach, ny * reach, nz * reach))
  }

  /** A point on the face (the head's sphere, or the body's front) along `dir`, into `surface`. */
  private faceSurface(dir: Vec3, tilt: boolean): void {
    if (this.faceIsHead) {
      const l = Math.hypot(dir[0], dir[1], dir[2])
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
      const [px, py, pz] = surface.p
      const length = Math.min(1.6, Math.max(0.55, standY / LEG_LENGTH[kind as 'legStub' | 'legLong']))
      const side = Math.abs(dir[0]) < 0.05 ? 0 : Math.sign(dir[0])
      const splay = 0.12 + pose.legSplay * 1.25
      out.copy(this.B).multiply(this.T.makeTranslation(px, py + SINK - push, pz))
      out.multiply(this.basis(0, -1, 0, FORWARD, this.R))
      if (side !== 0) out.multiply(this.R.makeRotationZ(side * splay))
      else out.multiply(this.R.makeRotationX((dir[2] >= 0 ? 1 : -1) * (splay - 0.12)))
      const swing = pose.legSwing[Math.min(legOrder, pose.legSwing.length - 1)]
      out.multiply(this.R.makeRotationX(swing + wiggle))
      const bend = pose.legBend[Math.min(legOrder, pose.legBend.length - 1)]
      return out.multiply(this.T.makeScale(sxz, length * sy * (1 - 0.28 * bend), sxz))
    }
    if (family === 'tail') {
      ellipsoidPoint(dir, this.rx, this.ry, this.rz, surface)
      const [px, py, pz] = surface.p
      const [nx, ny, nz] = surface.n
      const sink = SINK - push
      out.copy(this.B).multiply(this.T.makeTranslation(px - nx * sink, py - ny * sink, pz - nz * sink))
      out.multiply(this.basis(nx, ny, nz, UP, this.R))
      out.multiply(this.R.makeRotationZ(pose.tail * 0.6 + wiggle))
      out.multiply(this.R.makeRotationX(pose.tailLift * 0.5))
      return out.multiply(this.T.makeScale(sxz, sy, sxz))
    }
    // face parts: eyes, ears, horns
    this.faceSurface(dir, family !== 'eyes')
    const [px, py, pz] = surface.p
    const [nx, ny, nz] = surface.n
    const sink = (family === 'eyes' ? SINK * 0.5 : SINK) - push
    out.copy(this.F).multiply(this.T.makeTranslation(px - nx * sink, py - ny * sink, pz - nz * sink))
    out.multiply(this.basis(nx, ny, nz, family === 'eyes' ? UP : FORWARD, this.R))
    if (family === 'ears') {
      const side = Math.sign(dir[0]) || 1
      if (kind === 'earFlop') {
        out.multiply(this.R.makeRotationZ(-side * (1.15 + 0.3 * pose.ear)))
        out.multiply(this.R.makeRotationX(0.35 * pose.ear + wiggle))
      } else {
        out.multiply(this.R.makeRotationX((kind === 'earPoint' ? 0.2 : 0.12) * pose.ear + wiggle))
        out.multiply(this.R.makeRotationZ(-side * 0.18))
      }
    } else if (wiggle !== 0) out.multiply(this.R.makeRotationX(wiggle))
    return out.multiply(this.T.makeScale(sxz, sy, sxz))
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
    this.W.copy(this.B).multiply(this.T.makeScale(this.rx / BODY.rx, this.ry / BODY.ry, this.rz / BODY.rz))
    this.batches.body.push(this.W, COLORS, hue, boil, seed)
    this.v.setFromMatrixPosition(this.B)
    world.body[0] = this.v.x
    world.body[1] = this.v.y
    world.body[2] = this.v.z
    world.bodyR = Math.max(this.rx, this.rz) * 1.08

    const parts = critter.save.parts
    let legOrder = 0
    let eyes = 0
    world.feetCount = 0
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const socket = socketFor(parts, i, socketScratch)
      const isLeg = FAMILY[part.kind] === 'legs'
      this.place(critter, part.kind, socket.dir, legOrder, this.animFor(critter, i), this.W)
      this.batches[part.kind].push(this.W, COLORS, hueAt(part.hue), boil, seed + i * 0.07)
      const reach = PART_REACH[part.kind] * 0.55
      this.v.set(0, reach, 0).applyMatrix4(this.W)
      world.parts[i * 3] = this.v.x
      world.parts[i * 3 + 1] = this.v.y
      world.parts[i * 3 + 2] = this.v.z
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

    // nose
    this.faceSurface(NOSE_DIR, false)
    const [px, py, pz] = surface.p
    const [nx, ny, nz] = surface.n
    this.W.copy(this.F).multiply(this.T.makeTranslation(px - nx * 0.3, py - ny * 0.3, pz - nz * 0.3))
    this.W.multiply(this.basis(nx, ny, nz, UP, this.R))
    const nose = 1 + 0.1 * Math.max(0, -critter.wobble) * 4
    this.W.multiply(this.T.makeScale(nose, nose, nose))
    this.batches.nose.push(this.W, COLORS, hueAt(noseHue(critter.save.hue)), boil, seed + 0.5)
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
    const [px, py, pz] = surface.p
    const [nx, ny, nz] = surface.n
    this.M.copy(this.F).multiply(this.T.makeTranslation(px, py, pz))
    this.M.multiply(this.basis(nx, ny, nz, UP, this.R))
    this.M.multiply(this.T.makeScale(width, 1, height))
    this.batches[key].push(this.M, COLORS, WHITE, boil * 0.5, seed)
  }

  /** Pupils that look around (a glint painted in), and clay lids in the body's colour that close over the eye. */
  private eyeExtras(eye: THREE.Matrix4, lookX: number, lookY: number, lids: number, lidHue: Hue, boil: number, seed: number): void {
    this.M.copy(eye).multiply(this.T.makeTranslation(0, EYE_BALL.center, 0))
    this.W.copy(this.M)
    this.e.set(Math.max(-0.5, Math.min(0.5, lookY * 0.4)), 0, Math.max(-0.6, Math.min(0.6, lookX * 0.5)), 'XYZ')
    this.W.multiply(this.R.makeRotationFromEuler(this.e)).multiply(this.T.makeTranslation(0, EYE_BALL.radius * 0.86, 0))
    const wide = Math.max(1, Math.min(1.25, lids))
    this.W.multiply(this.T.makeScale(wide, 1, wide))
    this.batches.pupil.push(this.W, COLORS, WHITE, boil * 0.5, seed)
    if (lids < 0.995) {
      this.M.multiply(this.R.makeRotationX(Math.max(0, lids) * Math.PI))
      this.batches.lid.push(this.M, COLORS, hueAt(lidHue), boil, seed)
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

  // --- the tray, loose parts -----------------------------------------------------

  /** A part resting in its tray slot, growing back (`grow` 0..1) and hopping (`hop` in bench units). */
  trayPart(kind: PartKind, hue: Hue, grow: number, hop: number, squash: number, boil: number): void {
    const g = Math.max(0.001, grow)
    const sy = g * (1 - squash)
    const sxz = g * (1 + squash * 0.6)
    this.W.makeTranslation(0, hop, 0).multiply(this.trayRest[kind]).multiply(this.T.makeScale(sxz, sy, sxz))
    this.loose(kind, hue, this.W, boil, PART_KINDS.indexOf(kind) * 0.1)
  }

  /** A part on its own (in the tray, on a finger, or flying home), with its eye extras when it is an eye. */
  loose(kind: PartKind, hue: Hue, matrix: THREE.Matrix4, boil: number, seed: number, lookX = 0, lookY = 0): void {
    this.batches[kind].push(matrix, COLORS, hueAt(hue), boil, seed)
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
