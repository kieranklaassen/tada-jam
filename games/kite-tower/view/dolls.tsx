import { useFrame } from '@react-three/fiber'
import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { Hero, KiteController, Watcher } from '../controller'
import { ARM, ARM_R, BlockField, BODY_PROFILE, BRIM, CUFF, DollGuard, DUCK, FACE_CELL, FACE_SHELL, FACE_TOP, fitHead, FLY_GRIP, FLY_RAISE, GRIP_REACH, HAIR, HAND_R, HAND_REACH, HEAD_R, HEAD_Y, NECK_Y, POM_R, POM_Y, SHOULDER, SPOOL_ROOM, type DollPlace, type HeadKind, type HeadPose } from '../doll'
import { WATCHERS } from '../layout'
import { MotionDirector, type Activity, type Face, type PoseDelta } from '../motion'
import { PIECES, SHAPES } from '../pieces'
import { swayAngle, type Rock } from '../sway'
import { drawnPose, type DrawnPose } from './pieces'
import { merge, stained, woodLathe } from './shapes'
import { atlasUv, woodMaterial } from './wood'

// Three peg dolls, each a lathed beech body with painted clothes, a round
// head with painted hair or a hat, a face painted on a thin shell (four
// expressions in one atlas, swapped by texture offset), and two little arms.
// The hero's route gait lives here (she hops on both feet, climbs with a
// crouch, a pull and a knee-over, and dangles from the kite kicking her
// feet); everything a doll does as itself (idle life, blinks, reactions,
// cheers, pokes, delights) comes from its director in motion.ts, and this
// file only maps the pose onto the rig.

type Expression = 0 | 1 | 2 | 3
const OPEN: Expression = 0
const BLINK: Expression = 1
const HAPPY: Expression = 2
const SURPRISED: Expression = 3

export type DollSpec = {
  name: 'pip' | 'moss' | 'bean'
  row: number
  scale: number
  lower: string
  upper: string
  band: string
  hair: string
  hat?: string
  kind: HeadKind
}

export const HERO: DollSpec = { name: 'pip', row: 0, scale: 1, lower: '#e25a47', upper: '#ee7a5d', band: '#f7e6c4', hair: '#6d4428', kind: 'bob' }
export const MOSS: DollSpec = { name: 'moss', row: 1, scale: 1.1, lower: '#6f9a78', upper: '#94b88f', band: '#e9dcc0', hair: '#d8d2c6', hat: '#9c8764', kind: 'cap' }
export const BEAN: DollSpec = { name: 'bean', row: 2, scale: 0.8, lower: '#3e72b8', upper: '#f3cf5e', band: '#3e72b8', hair: '#8a5a34', hat: '#d9473b', kind: 'beanie' }

const SKIN = '#f4dcc0'

// ---- faces -------------------------------------------------------------------

const CELL = 256
/** The face shell spans more arc across than down; features are drawn narrower so they land round. */
const SQUEEZE = 0.74

function faceAtlas(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = CELL * 4
  canvas.height = CELL * 3
  const context = canvas.getContext('2d')!
  const ink = '#3b2616'
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 4; col++) {
      context.save()
      context.translate(col * CELL + CELL / 2, row * CELL)
      context.scale(SQUEEZE, 1)
      const eyeY = 112
      const eyeX = 46
      const cheek = context.createRadialGradient(0, 0, 0, 0, 0, 30)
      cheek.addColorStop(0, 'rgba(240,120,110,0.55)')
      cheek.addColorStop(1, 'rgba(240,120,110,0)')
      for (const side of [-1, 1]) {
        context.save()
        context.translate(side * 74, 156)
        context.fillStyle = cheek
        context.beginPath()
        context.arc(0, 0, 30, 0, Math.PI * 2)
        context.fill()
        context.restore()
      }
      context.fillStyle = ink
      context.strokeStyle = ink
      context.lineCap = 'round'
      context.lineWidth = 7
      for (const side of [-1, 1]) {
        const x = side * eyeX
        if (col === OPEN) {
          context.beginPath()
          context.ellipse(x, eyeY, 11, 15, 0, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = '#fff'
          context.beginPath()
          context.arc(x + 4, eyeY - 6, 4, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = ink
        } else if (col === BLINK) {
          context.beginPath()
          context.arc(x, eyeY - 4, 13, Math.PI * 0.15, Math.PI * 0.85)
          context.stroke()
        } else if (col === HAPPY) {
          context.beginPath()
          context.arc(x, eyeY + 8, 14, Math.PI * 1.15, Math.PI * 1.85)
          context.stroke()
        } else {
          context.beginPath()
          context.ellipse(x, eyeY, 13, 18, 0, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = '#fff'
          context.beginPath()
          context.arc(x + 4, eyeY - 7, 5, 0, Math.PI * 2)
          context.fill()
          context.fillStyle = ink
        }
      }
      if (row === 1) {
        // Moss: soft grey brows and a moustache.
        context.strokeStyle = '#9b938a'
        context.lineWidth = 9
        for (const side of [-1, 1]) {
          context.beginPath()
          context.moveTo(side * 30, eyeY - 30 - (col === SURPRISED ? 8 : 0))
          context.quadraticCurveTo(side * 48, eyeY - 38 - (col === SURPRISED ? 8 : 0), side * 64, eyeY - 28)
          context.stroke()
        }
        context.fillStyle = '#c9c1b6'
        context.beginPath()
        context.ellipse(-20, 170, 24, 11, 0.25, 0, Math.PI * 2)
        context.ellipse(20, 170, 24, 11, -0.25, 0, Math.PI * 2)
        context.fill()
        context.fillStyle = ink
        context.strokeStyle = ink
      }
      if (row === 2) {
        context.fillStyle = 'rgba(160,90,50,0.55)'
        for (const [fx, fy] of [
          [-70, 140],
          [-58, 150],
          [-80, 152],
          [70, 140],
          [58, 150],
          [80, 152],
        ]) {
          context.beginPath()
          context.arc(fx, fy, 3.2, 0, Math.PI * 2)
          context.fill()
        }
        context.fillStyle = ink
      }
      const mouthY = row === 1 ? 190 : 176
      context.lineWidth = 6
      if (col === HAPPY) {
        context.beginPath()
        context.moveTo(-22, mouthY - 4)
        context.quadraticCurveTo(0, mouthY + 30, 22, mouthY - 4)
        context.closePath()
        context.fillStyle = '#8a3b2c'
        context.fill()
        context.stroke()
      } else if (col === SURPRISED) {
        context.fillStyle = '#8a3b2c'
        context.beginPath()
        context.ellipse(0, mouthY + 4, 9, 12, 0, 0, Math.PI * 2)
        context.fill()
      } else {
        context.beginPath()
        context.arc(0, mouthY - 14, 18, Math.PI * 0.2, Math.PI * 0.8)
        context.stroke()
      }
      context.restore()
    }
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

// ---- geometry -----------------------------------------------------------------

function paintByHeight(geometry: THREE.BufferGeometry, colorAt: (y: number) => string): THREE.BufferGeometry {
  const position = geometry.getAttribute('position')
  const colors = new Float32Array(position.count * 3)
  const c = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    c.set(colorAt(position.getY(i)))
    colors[i * 3] = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  return geometry
}

export function bodyGeometry(spec: DollSpec): THREE.BufferGeometry {
  const body = woodLathe(BODY_PROFILE, 32, (y) => 0.86 + 0.14 * THREE.MathUtils.smoothstep(y, 0, 0.12))
  return paintByHeight(body, (y) => (y > 1.27 ? SKIN : y > 0.66 ? spec.upper : y > 0.58 ? spec.band : spec.lower))
}

/** A piece of sphere with wood grain running up it (for hair, hats, heads). */
function woodSphere(r: number, phiStart: number, phiLength: number, thetaStart: number, thetaLength: number, color: string, w = 28, h = 14): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, w, h, phiStart, phiLength, thetaStart, thetaLength)
  const position = g.getAttribute('position') as THREE.BufferAttribute
  const uv = g.getAttribute('uv') as THREE.BufferAttribute
  const out: [number, number] = [0, 0]
  const wear = new Float32Array(position.count * 2)
  for (let i = 0; i < position.count; i++) {
    atlasUv(true, 0.4 + position.getY(i) + r, 0.08 + uv.getX(i) * Math.min(1.8, Math.PI * 2 * r * (phiLength / (Math.PI * 2))), out)
    uv.setXY(i, out[0], out[1])
    wear[i * 2 + 1] = 1
  }
  g.setAttribute('wear', new THREE.BufferAttribute(wear, 2))
  return stained(g, color)
}

export function headGeometry(spec: DollSpec): THREE.BufferGeometry {
  const r = HEAD_R
  const profile = Array.from({ length: 15 }, (_, i) => {
    const a = -Math.PI / 2 + (Math.PI * i) / 14
    return { x: Math.max(0, Math.cos(a) * r), y: r + Math.sin(a) * r }
  })
  const head = stained(woodLathe(profile, 32), SKIN)
  head.translate(0, -r, 0)
  const parts = [head]
  const hair = (g: THREE.BufferGeometry) => {
    parts.push(g)
  }
  if (spec.kind === 'bob') {
    hair(woodSphere(r + 0.025, 0, Math.PI * 2, 0, 1.0, spec.hair))
    // Round the back and sides down to the jaw, leaving the face open.
    hair(woodSphere(r + 0.03, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, 0.6, 1.5, spec.hair))
  } else if (spec.kind === 'cap') {
    hair(woodSphere(r + 0.02, Math.PI / 2 + 1.1, Math.PI * 2 - 2.2, 0.9, 1.0, spec.hair))
    hair(woodSphere(r + 0.035, 0, Math.PI * 2, 0, 0.95, spec.hat!))
    const brim = woodLathe(
      [
        { x: 0, y: 0 },
        { x: BRIM.rx - 0.02, y: 0 },
        { x: BRIM.rx, y: 0.02 },
        { x: BRIM.rx - 0.02, y: BRIM.thick },
        { x: 0, y: BRIM.thick },
      ],
      24,
    )
    brim.scale(1, 1, BRIM.rz / BRIM.rx)
    brim.translate(0, BRIM.y, BRIM.z)
    hair(stained(brim, spec.hat!))
  } else {
    hair(woodSphere(r + 0.03, 0, Math.PI * 2, 0, 1.2, spec.hat!))
    const mid = r * 0.36
    const cuff = woodLathe(
      [
        { x: r * 0.9, y: CUFF.y0 - mid },
        { x: r + 0.06, y: -0.05 },
        { x: CUFF.r, y: 0.02 },
        { x: r + 0.05, y: 0.08 },
        { x: r * 0.8, y: CUFF.y1 - mid },
      ],
      32,
    )
    cuff.translate(0, mid, 0)
    hair(stained(cuff, spec.hat!))
    hair(woodSphere(r + 0.02, Math.PI / 2 + 1.2, Math.PI * 2 - 2.4, 1.1, 0.7, spec.hair))
  }
  return merge(parts)
}

/** The face shell from just below the hair or hat down to the chin, painted as if it covered the whole atlas cell, so the features sit where they always did. */
export function faceGeometry(kind: HeadKind): THREE.BufferGeometry {
  const top = FACE_TOP[kind]
  const length = FACE_CELL.bottom - top
  const g = new THREE.SphereGeometry(FACE_SHELL.r, 24, Math.max(6, Math.round((14 * length) / (FACE_CELL.bottom - FACE_CELL.top))), FACE_SHELL.phi0, FACE_SHELL.phiLength, top, length)
  const position = g.getAttribute('position')
  const uv = g.getAttribute('uv')
  for (let i = 0; i < position.count; i++) {
    const theta = Math.acos(Math.max(-1, Math.min(1, position.getY(i) / FACE_SHELL.r)))
    uv.setY(i, 1 - (theta - FACE_CELL.top) / (FACE_CELL.bottom - FACE_CELL.top))
  }
  return g
}

/** An arm hanging from the middle of its rounded top (the shoulder pivot) down to the hand. */
export function armGeometry(spec: DollSpec): THREE.BufferGeometry {
  const r = ARM_R
  const profile: { x: number; y: number }[] = []
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (Math.PI / 2) * (i / 5)
    profile.push({ x: Math.cos(a) * HAND_R, y: r + Math.sin(a) * HAND_R })
  }
  for (let i = 0; i <= 5; i++) {
    const a = (Math.PI / 2) * (i / 5)
    profile.push({ x: Math.cos(a) * r, y: ARM - r + Math.sin(a) * r })
  }
  const arm = woodLathe(profile, 12)
  arm.translate(0, -ARM + r, 0)
  return paintByHeight(arm, (y) => (y < -ARM + r + 0.17 ? SKIN : spec.upper))
}

// ---- rig ----------------------------------------------------------------------

class DollRig {
  readonly root = new THREE.Group()
  /** Pivots at the feet: lean, squash and roll. */
  readonly lean = new THREE.Group()
  readonly head = new THREE.Group()
  readonly armL = new THREE.Group()
  readonly armR = new THREE.Group()
  readonly pom: THREE.Mesh | null = null
  readonly texture: THREE.Texture
  private readonly geometries: THREE.BufferGeometry[] = []
  private expression = -1
  private followYaw = 0
  private followPitch = 0
  private readonly turn = { pitch: 0, roll: 0 }
  readonly spec: DollSpec
  /** Keeps the arms out of the head, hat, body, each other and the blocks, and the face out of the body. */
  readonly guard: DollGuard
  private readonly blocks = new BlockField()
  private readonly near = new BlockField()
  private readonly nearRoom = (x: number, y: number, z: number) => this.near.roomDistance(x, y, z)
  /** The head, its hat and pom as balls in the head's frame (the pom's follows it), for `fitLean`. */
  private readonly balls: Ball[]

  constructor(spec: DollSpec, wood: THREE.Material, faces: THREE.Texture) {
    this.spec = spec
    this.guard = new DollGuard(spec.kind)
    this.balls = headBalls(spec.kind)
    const body = bodyGeometry(spec)
    const head = headGeometry(spec)
    const face = faceGeometry(spec.kind)
    const arm = armGeometry(spec)
    this.geometries.push(body, head, face, arm)
    this.texture = faces.clone()
    this.texture.repeat.set(1 / 4, 1 / 3)
    this.texture.offset.set(0, 1 - (spec.row + 1) / 3)
    const faceMaterial = new THREE.MeshStandardMaterial({ map: this.texture, transparent: true, depthWrite: false, roughness: 0.75, polygonOffset: true, polygonOffsetFactor: -1 })
    const named = (mesh: THREE.Mesh, part: string) => {
      mesh.name = `${spec.name}-${part}`
      return mesh
    }
    this.root.userData.jamObject = spec.name
    this.root.add(this.lean)
    this.lean.add(named(new THREE.Mesh(body, wood), 'body'))
    this.head.position.set(0, HEAD_Y, 0)
    this.head.add(named(new THREE.Mesh(head, wood), 'head'))
    const faceMesh = named(new THREE.Mesh(face, faceMaterial), 'face')
    faceMesh.renderOrder = 3
    this.head.add(faceMesh)
    this.lean.add(this.head)
    this.armL.position.set(-SHOULDER.x, SHOULDER.y, 0)
    this.armR.position.set(SHOULDER.x, SHOULDER.y, 0)
    this.armL.add(named(new THREE.Mesh(arm, wood), 'arm-l'))
    this.armR.add(named(new THREE.Mesh(arm, wood), 'arm-r'))
    this.lean.add(this.armL, this.armR)
    if (spec.kind === 'beanie') {
      const pom = woodSphere(POM_R, 0, Math.PI * 2, 0, Math.PI, '#f7efe0', 16, 10)
      this.geometries.push(pom)
      this.pom = named(new THREE.Mesh(pom, wood), 'pom')
      this.pom.position.set(0, POM_Y, 0)
      this.head.add(this.pom)
      this.guard.setPom(0, POM_Y, 0)
    }
    this.root.scale.setScalar(spec.scale)
    this.root.traverse((o) => {
      o.frustumCulled = false
    })
  }

  setExpression(expression: Expression): void {
    if (expression === this.expression) return
    this.expression = expression
    this.texture.offset.x = expression / 4
  }

  /**
   * Arms by how far each is raised (0 down .. PI straight up, outward) and swung forward. Each stops where
   * it would first touch the head, hat, body, the other arm or a block; call after `look` so the head's turn
   * this frame is the one it keeps clear of. The right arm goes first, so the right hand wins a clap.
   */
  arms(raiseL: number, raiseR: number, forwardL = 0, forwardR = 0): void {
    const guard = this.guard
    guard.beginArms()
    const right = guard.arm(1, raiseR, forwardR)
    const left = guard.arm(-1, raiseL, forwardL)
    this.armL.rotation.set(forwardL, 0, -left)
    this.armR.rotation.set(forwardR, 0, right)
  }

  /**
   * Turn the head toward a room point (yaw across, pitch up and down), limited like a neck, following at
   * the doll's own rate per second; the pose's head offsets go on top unsmoothed, so quick nods stay quick.
   * A nod or tilt that would dip the face or hair into the body is eased back to the first touch.
   */
  look(target: { x: number; y: number }, from: { x: number; y: number }, bodyYaw: number, amount: number, rate: number, dt: number, pose: PoseDelta): void {
    const dx = target.x - from.x
    const dy = target.y - from.y
    const yaw = Math.max(-0.7, Math.min(0.7, Math.atan2(dx, 3.2))) - bodyYaw * 0.6
    const pitch = Math.max(-0.5, Math.min(0.35, -Math.atan2(dy, Math.abs(dx) + 1.4) * 0.8))
    const blend = 1 - Math.exp(-rate * dt)
    this.followYaw += (yaw * amount - this.followYaw) * blend
    this.followPitch += (pitch * amount - this.followPitch) * blend
    const headYaw = this.followYaw + pose.headYaw
    const turn = this.guard.turnHead(this.followPitch + pose.headPitch, headYaw, pose.headRoll, this.turn)
    this.head.rotation.set(turn.pitch, headYaw, turn.roll)
  }

  /** Keep the arms out of the blocks as drawn this frame; call once the root and lean are posed, before `arms`. */
  avoidBlocks(c: KiteController): void {
    this.root.updateMatrixWorld(true)
    const e = this.lean.matrixWorld.elements
    const scale = this.spec.scale
    const cx = e[4] * SHOULDER.y + e[12]
    const cy = e[5] * SHOULDER.y + e[13]
    gatherBlocks(c, this.blocks, cx, cy, (SHOULDER.x + ARM + HAND_R) * scale)
    if (this.blocks.empty) {
      this.guard.setObstacle(null)
      return
    }
    const f = this.blocks.frame
    f[0] = e[0]
    f[1] = e[4]
    f[2] = e[8]
    f[3] = e[12]
    f[4] = e[1]
    f[5] = e[5]
    f[6] = e[9]
    f[7] = e[13]
    f[8] = e[2]
    f[9] = e[6]
    f[10] = e[10]
    f[11] = e[14]
    this.guard.setObstacle(this.blocks.distance)
  }

  /** Fit the head among the blocks near it as drawn (see `fitHead`): feet at (x, y), `z` out from the build. */
  fitHead(c: KiteController, x: number, y: number, z: number, pose: HeadPose): void {
    const scale = this.spec.scale
    gatherBlocks(c, this.near, x, y + HEAD_Y * pose.squash * scale, HEAD_ROOM_REACH * scale)
    if (!this.near.empty) fitHead(this.nearRoom, x, y, z, scale, pose)
  }

  /**
   * Bow, tilt, bob and stretch only as far as the blocks by the head, the
   * cap's brim and the pom allow: first eased back toward upright, all
   * together, and if upright is not clear either, ducked. Call with the root
   * placed at feet height `y` (before `lift`) and turned, and after `look`,
   * so the head's own turn is the one kept clear. Writes the pose it keeps.
   */
  fitLean(c: KiteController, y: number, pose: LeanPose): void {
    const scale = this.spec.scale
    const want = leanScratch
    want.lift = pose.lift
    want.bow = pose.bow
    want.roll = pose.roll
    want.squash = pose.squash
    this.poseLean(y, want.lift, want.bow, want.roll, want.squash)
    const e = this.head.matrixWorld.elements
    gatherBlocks(c, this.near, e[12], e[13], LEAN_REACH * scale)
    if (this.near.empty || this.ballsClear(want.squash)) return
    const low = Math.min(1, want.squash)
    const at = (k: number, squash: number) => {
      this.poseLean(y, want.lift * k, want.bow * k, want.roll * k, squash)
      return this.ballsClear(squash)
    }
    let k = 0
    let squash = low
    if (at(0, low)) {
      let lo = 0
      let hi = 1
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2
        if (at(mid, low + (want.squash - low) * mid)) lo = mid
        else hi = mid
      }
      k = lo
      squash = low + (want.squash - low) * lo
    } else {
      let lo = Math.min(DUCK, low)
      let hi = low
      for (let i = 0; i < 6; i++) {
        const mid = (lo + hi) / 2
        if (at(0, mid)) lo = mid
        else hi = mid
      }
      squash = lo
    }
    pose.lift = want.lift * k
    pose.bow = want.bow * k
    pose.roll = want.roll * k
    pose.squash = squash
    this.poseLean(y, pose.lift, pose.bow, pose.roll, pose.squash)
  }

  private poseLean(y: number, lift: number, bow: number, roll: number, squash: number): void {
    this.root.position.y = y + lift
    this.lean.rotation.set(bow, 0, roll)
    const wide = 1 / Math.sqrt(squash)
    this.lean.scale.set(wide, squash, wide)
    this.root.updateMatrixWorld(true)
  }

  private ballsClear(squash: number): boolean {
    const grow = this.spec.scale * Math.max(squash, 1 / Math.sqrt(squash))
    const m = this.head.matrixWorld
    const v = placeScratch
    for (const b of this.balls) {
      v.set(b.x, b.y, b.z).applyMatrix4(m)
      if (this.near.roomDistance(v.x, v.y, v.z) < b.r * grow + LEAN_GAP) return false
    }
    if (this.pom) {
      v.copy(this.pom.position).applyMatrix4(m)
      if (this.near.roomDistance(v.x, v.y, v.z) < POM_R * grow + LEAN_GAP) return false
    }
    return true
  }

  /** Write where the posed doll's parts are in the room; call after `arms`. */
  place(out: DollPlace): void {
    this.root.updateMatrixWorld(true)
    const v = placeScratch
    const at = (object: THREE.Object3D, x: number, y: number, into: { x: number; y: number; z: number }) => {
      v.set(x, y, 0).applyMatrix4(object.matrixWorld)
      into.x = v.x
      into.y = v.y
      into.z = v.z
    }
    at(this.lean, 0, 0, out.feet)
    at(this.lean, 0, NECK_Y, out.neck)
    at(this.head, 0, 0, out.head)
    at(this.armL, 0, 0, out.shoulderL)
    at(this.armL, 0, -HAND_REACH, out.handL)
    at(this.armR, 0, 0, out.shoulderR)
    at(this.armR, 0, -HAND_REACH, out.handR)
    at(this.armR, 0, -GRIP_REACH, out.grip)
    out.scale = this.spec.scale
    out.set = true
  }

  dispose(): void {
    for (const g of this.geometries) g.dispose()
    this.texture.dispose()
  }
}

/** Blocks this far from the head's middle upright are in reach of her lean, spring and stretch. */
const HEAD_ROOM_REACH = HEAD_R + HAIR + 0.8
/** Blocks this far across from the head's middle are in reach of a bow, the brim and the pom. */
const LEAN_REACH = BRIM.z + BRIM.rz + 0.8
const LEAN_GAP = 0.012

type Ball = { x: number; y: number; z: number; r: number }
type LeanPose = HeadPose & { bow: number }
const leanScratch: LeanPose = { lift: 0, bow: 0, roll: 0, squash: 1 }

/**
 * The head and hair (out to the beanie's cuff), and the cap's brim as rings
 * of small balls along its thin edge and across it: close enough that a
 * block's corner between two of them stays within a hair of the brim.
 */
function headBalls(kind: HeadKind): Ball[] {
  const balls: Ball[] = [{ x: 0, y: 0, z: 0, r: kind === 'beanie' ? CUFF.r : HEAD_R + HAIR }]
  if (kind === 'cap') {
    const y = BRIM.y + BRIM.thick / 2
    const r = BRIM.thick / 2 + 0.01
    for (const [reach, steps] of [
      [1, 22],
      [0.6, 10],
    ] as const) {
      for (let i = 0; i <= steps; i++) {
        const a = -0.6 + ((Math.PI + 1.2) * i) / steps
        balls.push({ x: Math.cos(a) * BRIM.rx * reach, y, z: BRIM.z + Math.sin(a) * BRIM.rz * reach, r })
      }
    }
  }
  return balls
}

const placeScratch = new THREE.Vector3()
const drawn: DrawnPose = { x: 0, y: 0, angle: 0, scale: 1 }
const drawnRock: Rock = { angle: 0, pivot: 0 }

/** Every block on the build plane, as drawn, that comes within `reach` of (x, y). */
export function gatherBlocks(c: KiteController, field: BlockField, x: number, y: number, reach: number): void {
  field.clear()
  for (const piece of PIECES) {
    const id = piece.id
    if (c.trayed[id] || !c.physics.has(id)) continue
    drawnPose(c, id, drawn, drawnRock)
    const shape = SHAPES[piece.kind]
    if (Math.hypot(drawn.x - x, drawn.y - y) > reach + Math.hypot(shape.half.x, shape.half.y) * drawn.scale) continue
    for (const part of shape.parts) field.add(part, drawn.x, drawn.y, drawn.angle, drawn.scale, shape.depth)
  }
}

function useRig(spec: DollSpec, wood: THREE.Material, faces: THREE.Texture): DollRig {
  const rig = useMemo(() => new DollRig(spec, wood, faces), [spec, wood, faces])
  useEffect(() => () => rig.dispose(), [rig])
  return rig
}

function faceOf(face: Face | null): Expression {
  switch (face) {
    case null:
    case 'open':
      return OPEN
    case 'blink':
      return BLINK
    case 'happy':
      return HAPPY
    case 'surprised':
      return SURPRISED
    default: {
      const never: never = face
      throw new Error(`unknown face ${String(never)}`)
    }
  }
}

/** A doll's director and the last cues it has heard (pokes, topples, reactions). */
function useDirector(doll: 'pip' | 'moss' | 'bean', seed: number) {
  return useMemo(() => ({ director: new MotionDirector(doll, seed), boopAt: -Infinity, cueAt: -Infinity }), [doll, seed])
}

function activityOf(mode: Watcher['mode']): Activity {
  return mode === 'walk' ? 'walk' : mode === 'idle' ? 'idle' : 'busy'
}

function smooth(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

// ---- the hero -------------------------------------------------------------------

function HeroDoll({ controller, place, wood, faces }: { controller: KiteController; place: DollPlace; wood: THREE.Material; faces: THREE.Texture }) {
  const rig = useRig(HERO, wood, faces)
  const cues = useDirector('pip', 1)
  const scratch = useMemo(() => ({ rock: { angle: 0, pivot: 0 } as Rock, from: { x: 0, y: 0 }, yaw: 0, reachSide: 1, head: { lift: 0, roll: 0, squash: 1 } as HeadPose, lean: { lift: 0, bow: 0, roll: 0, squash: 1 } as LeanPose }), [])
  // After the game step (-1) and before the kite, which drapes its line and tail round where she is now.
  useFrame((_, dt) => {
    const c = controller
    const hero: Hero = c.hero
    const t = c.t
    const age = t - hero.since
    let x = hero.x
    let y = hero.y
    let roll = 0
    let squash = 1
    let lift = 0
    let raise = 0.18 + hero.reach * 2.75
    let raiseL = 0
    let raiseR = 0
    let forward = 0
    let forwardL = 0
    let forwardR = 0
    let yawGoal = hero.facing * 0.55
    let expression: Expression = OPEN
    if (hero.boopAt !== cues.boopAt) {
      cues.boopAt = hero.boopAt
      cues.director.trigger('poke', t)
    }
    if (c.toppleAt !== cues.cueAt) {
      cues.cueAt = c.toppleAt
      if (hero.mode === 'stand') cues.director.trigger('react', t)
    }
    const calm = hero.mode === 'stand' && hero.reach < 0.3 && c.kite.mode === 'perched' && c.held.length === 0
    const pose = cues.director.sample(t, calm ? 'idle' : 'busy')
    switch (hero.mode) {
      case 'stand': {
        const goal = c.kiteGoal
        const near = Math.abs(hero.x - goal.x) < 2.4 && c.kite.mode === 'perched'
        if (near && hero.reach > 0.6) {
          // Tiptoe reaching: little two-footed jumps toward the kite.
          const hop = Math.max(0, Math.sin(t * 7.5))
          lift = hop * hop * 0.14 * hero.reach
          squash = 1 + hop * 0.05 - (1 - hop) * 0.03
          // Short peg arms raised straight up end at the top of the head and read as holding it at play
          // size. The arm on the kite's side stretches up and out toward it, clear of the head, the other
          // stays out for balance (both up would be a cheer, even with the kite straight overhead), and the
          // doll leans in a little. She turns square to the child and brings the reaching arm a little
          // forward: turned toward the kite, that arm swung behind her and behind any block beside her.
          const dx = goal.x - hero.x
          if (Math.abs(dx) > 0.25) scratch.reachSide = Math.sign(dx)
          const lean = Math.min(1, Math.abs(dx) / 1.6)
          const toward = (0.3 + 0.1 * lean) * hero.reach
          const away = (0.3 + 1.4 * Math.max(0.6, lean)) * hero.reach
          const left = scratch.reachSide < 0
          raiseL -= left ? toward : away
          raiseR -= left ? away : toward
          forwardL += left ? 0.35 * hero.reach : 0
          forwardR += left ? 0 : 0.35 * hero.reach
          roll -= scratch.reachSide * (0.03 + 0.05 * lean) * hero.reach
          yawGoal *= 1 - 0.75 * hero.reach
        }
        raise += Math.sin(t * 3.1) * 0.08 * hero.reach
        break
      }
      case 'travel': {
        const seg = hero.segment
        const k = seg.phase
        switch (seg.kind) {
          case 'walk': {
            const hopPhase = k * seg.hops
            const local = hopPhase - Math.floor(hopPhase)
            const air = Math.sin(local * Math.PI)
            lift = air * 0.22
            squash = 0.9 + air * 0.16
            raise = 0.35 + air * 0.55
            forward = -0.3 * air
            break
          }
          case 'climb': {
            if (k < 0.25) {
              squash = 1 - 0.14 * smooth(k / 0.25)
              raise = 0.3 + 2.5 * smooth(k / 0.25)
            } else if (k < 0.75) {
              const p = (k - 0.25) / 0.5
              roll = -hero.facing * 0.42 * Math.sin(p * Math.PI * 0.5)
              squash = 0.9 + 0.04 * p
              raise = 2.8 - 1.9 * p
              forward = -0.9 * p
            } else {
              const p = (k - 0.75) / 0.25
              roll = -hero.facing * 0.42 * (1 - smooth(p))
              squash = 0.94 + 0.12 * Math.sin(p * Math.PI)
              raise = 0.9 - 0.5 * p
            }
            expression = OPEN
            break
          }
          case 'hop': {
            const air = Math.sin(k * Math.PI)
            squash = 0.9 + air * 0.22
            raise = 0.6 + air * 1.8
            roll = -hero.facing * 0.2 * Math.sin(k * Math.PI * 2)
            break
          }
          case 'drop': {
            raise = 2.8
            squash = 1.08
            expression = HAPPY
            break
          }
          case null:
            break
          default: {
            const never: never = seg.kind
            throw new Error(`unknown segment ${String(never)}`)
          }
        }
        break
      }
      case 'grab': {
        const k = Math.min(1, age / 0.8)
        lift = Math.sin(k * Math.PI) * 0.3
        squash = 1 + Math.sin(k * Math.PI) * 0.08
        raise = 3.0
        expression = HAPPY
        break
      }
      case 'fly': {
        // Dangling from the kite string, kicking; the right hand holds the spool at FLY_GRIP.
        roll = hero.swing
        squash = 1.03
        raise = FLY_RAISE
        forward = Math.sin(t * 2.1) * 0.12
        yawGoal = Math.sin(t * 1.4) * 0.6
        expression = HAPPY
        break
      }
      case 'land': {
        const k = age / 0.9
        squash = 1 - 0.2 * Math.exp(-k * 7) * Math.cos(k * 18)
        raise = 2.2 * (1 - smooth(k))
        expression = HAPPY
        break
      }
      case 'tumble': {
        const since = t - hero.tumbleSince
        switch (hero.tumble) {
          case 'out':
            // A startled hop toward the child.
            squash = 1.06
            raise = 1.6
            expression = SURPRISED
            break
          case 'roll':
            roll = hero.spin
            raise = 1.6
            expression = SURPRISED
            break
          case 'sit':
            // Sat on the rug, giggling.
            squash = 0.82 + 0.04 * Math.sin(since * 14) * Math.exp(-since * 2)
            roll = Math.sin(since * 11) * 0.12 * Math.exp(-since * 1.5)
            raise = 0.9 + Math.sin(since * 14) * 0.3
            expression = HAPPY
            break
          case 'back':
            // Hopping back into the build, like her walk.
            squash = 0.94 + hero.hop * 0.6
            raise = 0.35 + hero.hop * 3
            expression = HAPPY
            break
          default: {
            const never: never = hero.tumble
            throw new Error(`unknown tumble phase ${String(never)}`)
          }
        }
        break
      }
      default: {
        const never: never = hero.mode
        throw new Error(`unknown hero mode ${String(never)}`)
      }
    }
    // Hanging, she stays where the controller hung her by the hand.
    if (hero.mode !== 'fly') {
      lift += pose.lift
      roll += pose.roll
    }
    squash += pose.squash
    yawGoal += pose.twist
    if (expression === OPEN) expression = faceOf(pose.face)
    // Ride the sway of whatever the doll stands on.
    if (hero.mode === 'stand' && hero.on !== null) {
      const stack = c.pieceStack[hero.on]
      if (stack >= 0 && stack < c.stacks.length) {
        const rock = swayAngle(c.stacks[stack], t, c.stackKick[stack] ?? 0, scratch.rock)
        const dx = x - rock.pivot
        const cos = Math.cos(rock.angle)
        const sin = Math.sin(rock.angle)
        x = rock.pivot + dx * cos - y * sin
        y = dx * sin + y * cos
        roll += rock.angle
      }
    }
    // On her feet she leans, springs and stretches only as far as the blocks beside and above her head allow, and ducks under one lower than her head.
    if (hero.mode !== 'fly' && (hero.mode !== 'tumble' || hero.tumble !== 'roll')) {
      const head = scratch.head
      head.lift = lift
      head.roll = roll
      head.squash = squash
      rig.fitHead(c, x, y, hero.z, head)
      lift = head.lift
      roll = head.roll
      squash = head.squash
    }
    scratch.yaw += (yawGoal - scratch.yaw) * Math.min(1, dt * 8)
    rig.root.position.set(x, y + lift, hero.z)
    rig.root.rotation.set(0, scratch.yaw + pose.spin, 0)
    if (hero.mode === 'fly') {
      rig.root.rotation.set(0, 0, roll)
      rig.lean.rotation.set(0, scratch.yaw, 0)
    } else if (hero.mode === 'tumble' && hero.tumble === 'roll') {
      // Roll about the middle of the body rather than the feet.
      rig.root.position.y += 0.9
      rig.lean.position.set(0, -0.9, 0)
      rig.root.rotation.set(0, 0, roll)
      rig.lean.rotation.set(0, 0, 0)
    } else {
      rig.lean.position.set(0, 0, 0)
      rig.lean.rotation.set(pose.bow, 0, roll)
    }
    if (hero.mode !== 'tumble' || hero.tumble !== 'roll') rig.lean.position.set(0, 0, 0)
    const wide = 1 / Math.sqrt(squash)
    rig.lean.scale.set(wide, squash, wide)
    if (hero.mode === 'fly') {
      // Twist and stretch about the spool in her hand, not her feet, so the line's end stays put.
      const across = FLY_GRIP.x * wide
      rig.lean.position.set(FLY_GRIP.x - across * Math.cos(scratch.yaw), FLY_GRIP.y * (1 - squash), across * Math.sin(scratch.yaw))
    }
    scratch.from.x = x
    scratch.from.y = y + 1.7
    rig.look(hero.look, scratch.from, scratch.yaw, hero.mode === 'fly' ? 0.3 : 1, cues.director.personality.lookRate, dt, pose)
    if (hero.mode !== 'fly' && (hero.mode !== 'tumble' || hero.tumble !== 'roll')) {
      const fit = scratch.lean
      fit.lift = lift
      fit.bow = pose.bow
      fit.roll = roll
      fit.squash = squash
      rig.fitLean(c, y, fit)
    }
    rig.avoidBlocks(c)
    rig.guard.hold(hero.mode === 'grab' || hero.mode === 'fly' ? 1 : 0, GRIP_REACH, SPOOL_ROOM)
    if (hero.mode === 'fly') rig.arms(raise + pose.raiseL, FLY_RAISE, forward + pose.forwardL, 0)
    else rig.arms(raise + raiseL + pose.raiseL, raise + raiseR + pose.raiseR, forward + forwardL + pose.forwardL, forward + forwardR + pose.forwardR)
    rig.setExpression(expression)
    rig.place(place)
  }, -0.5)
  return <primitive object={rig.root} />
}

// ---- Moss: tall, slow, gentle ------------------------------------------------------------

function MossDoll({ controller, wood, faces }: { controller: KiteController; wood: THREE.Material; faces: THREE.Texture }) {
  const rig = useRig(MOSS, wood, faces)
  const cues = useDirector('moss', 2)
  const scratch = useMemo(() => ({ from: { x: 0, y: 0 }, yaw: 0.4, lean: { lift: 0, bow: 0, roll: 0, squash: 1 } as LeanPose }), [])
  useFrame((_, dt) => {
    const w: Watcher = controller.watchers[0]
    const t = controller.t
    const director = cues.director
    if (w.boopAt !== cues.boopAt) {
      cues.boopAt = w.boopAt
      director.trigger('poke', t)
    }
    if (w.mode === 'react' && w.since !== cues.cueAt) {
      cues.cueAt = w.since
      director.trigger('react', t)
    }
    director.setCheering(w.mode === 'cheer', t)
    const pose = director.sample(t, activityOf(w.mode))
    scratch.yaw += (w.facing * 0.45 + pose.twist - scratch.yaw) * Math.min(1, dt * 4)
    rig.root.position.set(w.x + pose.shift, pose.lift, WATCHERS[0].z)
    rig.root.rotation.set(0, scratch.yaw + pose.spin, 0)
    rig.lean.rotation.set(pose.bow, 0, pose.roll)
    const squash = 1 + pose.squash
    rig.lean.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
    scratch.from.x = w.x
    scratch.from.y = 1.9
    // Hands over his eyes means he is not watching.
    rig.look(w.look, scratch.from, scratch.yaw, director.isPlaying('react', t) ? 0.3 : 1, director.personality.lookRate, dt, pose)
    const fit = scratch.lean
    fit.lift = pose.lift
    fit.bow = pose.bow
    fit.roll = pose.roll
    fit.squash = squash
    rig.fitLean(controller, 0, fit)
    rig.avoidBlocks(controller)
    rig.arms(0.12 + pose.raiseL, 0.12 + pose.raiseR, pose.forwardL, pose.forwardR)
    rig.setExpression(faceOf(pose.face))
  })
  return <primitive object={rig.root} />
}

// ---- Bean: small, quick, bouncy --------------------------------------------------------------

function BeanDoll({ controller, wood, faces }: { controller: KiteController; wood: THREE.Material; faces: THREE.Texture }) {
  const rig = useRig(BEAN, wood, faces)
  const cues = useDirector('bean', 3)
  const scratch = useMemo(() => ({ from: { x: 0, y: 0 }, yaw: -0.4, pom: 0, pomV: 0, pomZ: 0, pomZV: 0, prevX: 0, prevLift: 0, prevRoll: 0, prevPitch: 0, lean: { lift: 0, bow: 0, roll: 0, squash: 1 } as LeanPose }), [])
  useFrame((_, dt) => {
    const w: Watcher = controller.watchers[1]
    const t = controller.t
    const director = cues.director
    if (w.boopAt !== cues.boopAt) {
      cues.boopAt = w.boopAt
      director.trigger('poke', t)
      scratch.pomV += 9
    }
    if (w.mode === 'react' && w.since !== cues.cueAt) {
      cues.cueAt = w.since
      director.trigger('react', t)
    }
    director.setCheering(w.mode === 'cheer', t)
    const pose = director.sample(t, activityOf(w.mode))
    // He leans into a scoot.
    const roll = pose.roll + (w.mode === 'walk' ? -w.facing * 0.16 : 0)
    scratch.yaw += (w.facing * 0.5 + pose.twist - scratch.yaw) * Math.min(1, dt * 10)
    const x = w.x + pose.shift
    rig.root.position.set(x, pose.lift, WATCHERS[1].z)
    rig.root.rotation.set(0, scratch.yaw + pose.spin, 0)
    rig.lean.rotation.set(pose.bow, 0, roll)
    const squash = 1 + pose.squash
    rig.lean.scale.set(1 / Math.sqrt(squash), squash, 1 / Math.sqrt(squash))
    // The pom-pom on two springs, flung by the body's motion and the head's shakes and nods.
    if (dt > 0) {
      const vx = (x - scratch.prevX) / dt
      const vy = (pose.lift - scratch.prevLift) / dt
      const vRoll = (roll + pose.headRoll - scratch.prevRoll) / dt
      const vPitch = (pose.bow + pose.headPitch - scratch.prevPitch) / dt
      scratch.pomV += (-vx * 0.8 - vy * 0.5 - vRoll * 0.5) * dt * 10
      scratch.pomZV += -vPitch * 0.5 * dt * 10
      scratch.pomV += (-scratch.pom * 90 - scratch.pomV * 7) * dt
      scratch.pomZV += (-scratch.pomZ * 90 - scratch.pomZV * 7) * dt
      scratch.pom = Math.max(-0.6, Math.min(0.6, scratch.pom + scratch.pomV * dt))
      scratch.pomZ = Math.max(-0.6, Math.min(0.6, scratch.pomZ + scratch.pomZV * dt))
    }
    scratch.prevX = x
    scratch.prevLift = pose.lift
    scratch.prevRoll = roll + pose.headRoll
    scratch.prevPitch = pose.bow + pose.headPitch
    if (rig.pom) {
      const p = rig.pom.position
      p.set(Math.sin(scratch.pom) * 0.12, POM_Y - (Math.abs(scratch.pom) + Math.abs(scratch.pomZ)) * 0.04, Math.sin(scratch.pomZ) * 0.12)
      rig.guard.setPom(p.x, p.y, p.z)
    }
    scratch.from.x = w.x
    scratch.from.y = 1.4
    rig.look(w.look, scratch.from, scratch.yaw, 1, director.personality.lookRate, dt, pose)
    const fit = scratch.lean
    fit.lift = pose.lift
    fit.bow = pose.bow
    fit.roll = roll
    fit.squash = squash
    rig.fitLean(controller, 0, fit)
    rig.avoidBlocks(controller)
    rig.arms(0.25 + pose.raiseL, 0.25 + pose.raiseR, pose.forwardL, pose.forwardR)
    rig.setExpression(faceOf(pose.face))
  })
  return <primitive object={rig.root} />
}

/** The three dolls; `pip` is kept up to date with where the hero's parts are each frame. */
export function Dolls({ controller, pip }: { controller: KiteController; pip: DollPlace }) {
  const { wood, faces } = useMemo(() => ({ wood: woodMaterial({ vertexColors: true }), faces: faceAtlas() }), [])
  useEffect(
    () => () => {
      wood.dispose()
      faces.dispose()
    },
    [wood, faces],
  )
  return (
    <>
      <MossDoll controller={controller} wood={wood} faces={faces} />
      <BeanDoll controller={controller} wood={wood} faces={faces} />
      <HeroDoll controller={controller} place={pip} wood={wood} faces={faces} />
    </>
  )
}
