import * as THREE from 'three'
import type { GardenController } from '../controller'
import { TRAVEL_SECONDS, type CreatureKind, type Phase, type Presence } from '../creatures'
import { ROWS, type Cell } from '../layout'
import { TRAVEL_BLEND, type MotionPose } from '../motion'
import { MeshBuilder } from './build'
import { hopPoint, planHops, type Hop } from './hops'
import { celMaterial } from './materials'
import type { ShadowSink } from './pieces'
import type { CreatureSpot, Projector } from './projector'
import { cellX, floorY, FROG_PAD, frontZ, GRID_LEFT, GRID_RIGHT, rowZ, SIDE_RISE, sideRise, TANUKI_NAP_OUT } from './world'

// The three visitors are built differently, not one rig with different paint.
// The frog has a throat that balloons, a tongue, and hind legs that fling out.
// The sparrow has a snapping head, wings and a flicking tail. The tanuki has a
// curling body, ears that flick, eyes that open and a yawning mouth. Each is a
// handful of cel-lit parts on pivots. How they move comes from their motion
// personality (`../motion`); this file only walks them along their paths and
// maps each pose onto parts.

/** Rig units that a pose's lift and shift (in body heights) are measured in. */
const BODY: Record<CreatureKind, number> = { frog: 0.17, sparrow: 0.13, tanuki: 0.24 }

function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

function span(t: number, a: number, b: number): number {
  return clamp01((t - a) / (b - a))
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t)
}

/** A shape with a darker back and a paler belly, baked into vertex colours. */
function blob(rx: number, ry: number, rz: number, top: string, belly: string | null, segments = 12): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(1, segments, Math.max(6, Math.round(segments * 0.7)))
  const a = new THREE.Color(top)
  const b = new THREE.Color(belly ?? top)
  const p = g.getAttribute('position')
  const colours: number[] = []
  const c = new THREE.Color()
  for (let i = 0; i < p.count; i++) {
    const t = smooth(span(-p.getY(i) + p.getZ(i) * 0.35, -0.05, 0.55))
    c.copy(a).lerp(b, belly ? t : 0)
    colours.push(c.r, c.g, c.b)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  g.scale(rx, ry, rz)
  return g
}

const M = new THREE.Matrix4()
const Q = new THREE.Quaternion()
const E = new THREE.Euler()
const P = new THREE.Vector3()
const S = new THREE.Vector3(1, 1, 1)

function at(x: number, y: number, z: number, rx = 0, ry = 0, rz = 0): THREE.Matrix4 {
  return M.compose(P.set(x, y, z), Q.setFromEuler(E.set(rx, ry, rz)), S)
}

function add(b: MeshBuilder, g: THREE.BufferGeometry, matrix: THREE.Matrix4, hex = '#ffffff'): void {
  b.append(g, new THREE.Color(hex), 'blob', matrix)
  g.dispose()
}

class Part extends THREE.Mesh<THREE.BufferGeometry, THREE.ShaderMaterial> {
  constructor(b: MeshBuilder, material: THREE.ShaderMaterial, name: string) {
    super(b.build(), material)
    this.name = name
    this.frustumCulled = false
  }
}

function pivot(parent: THREE.Object3D, x: number, y: number, z: number): THREE.Group {
  const g = new THREE.Group()
  g.position.set(x, y, z)
  parent.add(g)
  return g
}

/** The body pivot sits at the feet; yaw is applied last so a lean or roll follows the way it faces. */
function bodyPivot(root: THREE.Object3D): THREE.Group {
  const body = pivot(root, 0, 0, 0)
  body.rotation.order = 'YXZ'
  return body
}

function squashBody(body: THREE.Object3D, squash: number, sx = 1, sy = 1, sz = 1): void {
  body.scale.set(sx * (1 + squash * 0.6), sy * (1 - squash), sz * (1 + squash * 0.35))
}

type Rig = {
  readonly root: THREE.Group
  /** `side` mirrors a pose's lean to one side (1 or -1). */
  apply(pose: MotionPose, side: number): void
}

// ---------------------------------------------------------------- frog

class Frog implements Rig {
  readonly root = new THREE.Group()
  private readonly body: THREE.Group
  private readonly eyes: THREE.Group
  private readonly throat: THREE.Group
  private readonly tongue: THREE.Group
  private readonly legs: [THREE.Group, THREE.Group]

  constructor(material: THREE.ShaderMaterial) {
    this.body = bodyPivot(this.root)
    const trunk = new MeshBuilder()
    add(trunk, blob(0.12, 0.085, 0.14, '#4f9a4a', '#e8e2a4'), at(0, 0.075, 0))
    add(trunk, blob(0.03, 0.05, 0.03, '#428a40', null, 8), at(0.07, 0.03, 0.09, 0.3, 0, -0.3))
    add(trunk, blob(0.03, 0.05, 0.03, '#428a40', null, 8), at(-0.07, 0.03, 0.09, 0.3, 0, 0.3))
    add(trunk, new THREE.TorusGeometry(0.06, 0.006, 4, 10, Math.PI * 0.8), at(0, 0.075, 0.137, 0, 0, Math.PI * 1.1), '#3e2a1c')
    this.body.add(new Part(trunk, material, 'frog-body'))
    this.eyes = pivot(this.body, 0, 0.14, 0.06)
    this.eyes.rotation.order = 'YXZ'
    const eyes = new MeshBuilder()
    for (const x of [-0.055, 0.055]) {
      add(eyes, blob(0.036, 0.036, 0.036, '#5aa452', null, 10), at(x, 0, 0))
      add(eyes, blob(0.024, 0.026, 0.02, '#fbf6e4', null, 8), at(x * 1.05, 0.004, 0.024))
      add(eyes, blob(0.013, 0.017, 0.01, '#1e1410', null, 8), at(x * 1.08, 0.004, 0.04))
    }
    this.eyes.add(new Part(eyes, material, 'frog-eyes'))
    this.throat = pivot(this.body, 0, 0.045, 0.11)
    const throat = new MeshBuilder()
    add(throat, blob(0.055, 0.04, 0.035, '#f4eec0', null, 10), at(0, 0, 0))
    this.throat.add(new Part(throat, material, 'frog-throat'))
    // The tongue darts up and forward from the mouth; it is drawn only while out.
    this.tongue = pivot(this.body, 0, 0.07, 0.13)
    this.tongue.rotation.x = -0.65
    const tongue = new MeshBuilder()
    add(tongue, new THREE.CylinderGeometry(0.008, 0.011, 0.22, 5), at(0, 0, 0.11, Math.PI / 2, 0, 0), '#e8808a')
    add(tongue, blob(0.018, 0.014, 0.018, '#f0909a', null, 6), at(0, 0, 0.22))
    this.tongue.add(new Part(tongue, material, 'frog-tongue'))
    this.tongue.visible = false
    const leg = (side: number) => {
      const hip = pivot(this.body, side * 0.09, 0.05, -0.07)
      const b = new MeshBuilder()
      add(b, blob(0.035, 0.035, 0.08, '#428a40', null, 8), at(side * 0.02, -0.01, 0.02, 0.2, 0, 0))
      add(b, blob(0.028, 0.012, 0.07, '#6cae5a', null, 8), at(side * 0.03, -0.042, 0.06))
      hip.add(new Part(b, material, 'frog-leg'))
      return hip
    }
    this.legs = [leg(-1), leg(1)]
  }

  apply(p: MotionPose, _side: number): void {
    const b = this.body
    b.position.set(p.shift * BODY.frog, p.lift * BODY.frog, p.advance * BODY.frog)
    b.rotation.set(p.lean, p.spin, p.roll)
    squashBody(b, p.squash)
    this.eyes.rotation.set(p.headPitch, p.headYaw, p.headRoll)
    this.eyes.scale.set(1, Math.max(0.12, p.eyes), 1)
    const puff = Math.max(0, p.throat)
    this.throat.scale.set(1 + puff * 0.9, 1 + puff * 1.2, 1 + puff)
    this.tongue.visible = p.tongue > 0.02
    this.tongue.scale.set(1, 1, Math.max(0.02, p.tongue))
    for (let i = 0; i < 2; i++) this.legs[i].rotation.x = -0.2 + p.legs[i] * 1.3
  }
}

// ---------------------------------------------------------------- sparrow

class Sparrow implements Rig {
  readonly root = new THREE.Group()
  private readonly body: THREE.Group
  private readonly tilt: THREE.Group
  private readonly head: THREE.Group
  private readonly wings: [THREE.Group, THREE.Group]
  private readonly tail: THREE.Group

  constructor(material: THREE.ShaderMaterial) {
    this.body = bodyPivot(this.root)
    this.tilt = pivot(this.body, 0, 0.05, 0)
    const trunk = new MeshBuilder()
    add(trunk, blob(0.062, 0.058, 0.085, '#8a5a36', '#efe2c8'), at(0, 0.03, 0, 0.25, 0, 0))
    add(trunk, new THREE.CylinderGeometry(0.004, 0.004, 0.05, 4), at(0.02, -0.01, 0.01), '#c07a3a')
    add(trunk, new THREE.CylinderGeometry(0.004, 0.004, 0.05, 4), at(-0.02, -0.01, 0.01), '#c07a3a')
    this.tilt.add(new Part(trunk, material, 'sparrow-body'))
    this.head = pivot(this.tilt, 0, 0.075, 0.055)
    this.head.rotation.order = 'YXZ'
    const head = new MeshBuilder()
    add(head, blob(0.045, 0.043, 0.045, '#7a4a2a', '#f2e8d4'), at(0, 0.01, 0))
    add(head, blob(0.03, 0.02, 0.03, '#9a6a42', null, 8), at(0, 0.035, -0.008))
    add(head, new THREE.ConeGeometry(0.012, 0.035, 6), at(0, 0.004, 0.056, Math.PI / 2, 0, 0), '#e0a040')
    for (const x of [-0.034, 0.034]) {
      add(head, blob(0.008, 0.009, 0.006, '#1a1210', null, 6), at(x, 0.016, 0.03, 0, x > 0 ? 0.6 : -0.6, 0))
      add(head, blob(0.014, 0.012, 0.01, '#f8f2e4', null, 6), at(x * 1.1, -0.004, 0.022))
    }
    this.head.add(new Part(head, material, 'sparrow-head'))
    const wing = (side: number) => {
      const shoulder = pivot(this.tilt, side * 0.05, 0.05, 0.02)
      const b = new MeshBuilder()
      add(b, blob(0.012, 0.045, 0.075, '#6a4228', '#b88a5a'), at(side * 0.008, -0.012, -0.03, 0.35, 0, 0))
      add(b, blob(0.01, 0.02, 0.05, '#f0e4c8', null, 6), at(side * 0.012, 0.01, -0.02, 0.35, 0, 0))
      shoulder.add(new Part(b, material, 'sparrow-wing'))
      return shoulder
    }
    this.wings = [wing(-1), wing(1)]
    this.tail = pivot(this.tilt, 0, 0.03, -0.075)
    const tail = new MeshBuilder()
    add(tail, blob(0.03, 0.008, 0.06, '#5a3a24', null, 8), at(0, 0.005, -0.045, -0.35, 0, 0))
    this.tail.add(new Part(tail, material, 'sparrow-tail'))
  }

  apply(p: MotionPose, _side: number): void {
    const b = this.body
    b.position.set(p.shift * BODY.sparrow, p.lift * BODY.sparrow, p.advance * BODY.sparrow)
    b.rotation.set(0, p.spin, 0)
    squashBody(b, p.squash)
    this.tilt.rotation.set(p.lean, 0, p.roll)
    this.head.rotation.set(p.headPitch, p.headYaw, p.headRoll)
    this.wings[0].rotation.set(0, 0, -p.wings[0])
    this.wings[1].rotation.set(0, 0, p.wings[1])
    this.tail.rotation.x = p.tail
  }
}

// ---------------------------------------------------------------- tanuki

class Tanuki implements Rig {
  readonly root = new THREE.Group()
  private readonly body: THREE.Group
  private readonly roll: THREE.Group
  private readonly head: THREE.Group
  private readonly ears: [THREE.Group, THREE.Group]
  private readonly eyesOpen: THREE.Group
  private readonly eyesShut: THREE.Group
  private readonly mouth: THREE.Group
  private readonly tail: THREE.Group

  constructor(material: THREE.ShaderMaterial) {
    this.body = bodyPivot(this.root)
    this.roll = pivot(this.body, 0, 0, 0)
    const trunk = new MeshBuilder()
    add(trunk, blob(0.15, 0.12, 0.19, '#8a7258', '#d8c8a8'), at(0, 0.12, 0))
    add(trunk, blob(0.1, 0.05, 0.12, '#6a5642', null, 10), at(0, 0.2, -0.02))
    for (const [x, z] of [
      [-0.08, 0.1],
      [0.08, 0.1],
      [-0.09, -0.11],
      [0.09, -0.11],
    ]) add(trunk, blob(0.04, 0.05, 0.045, '#3a2e26', null, 8), at(x, 0.05, z))
    this.roll.add(new Part(trunk, material, 'tanuki-body'))
    this.head = pivot(this.roll, 0, 0.17, 0.16)
    this.head.rotation.order = 'YXZ'
    const head = new MeshBuilder()
    add(head, blob(0.11, 0.095, 0.1, '#9a8264', '#efe4cc'), at(0, 0.03, 0.02))
    add(head, blob(0.05, 0.03, 0.05, '#e8dcc4', null, 8), at(0, -0.005, 0.1))
    add(head, blob(0.016, 0.013, 0.012, '#1e1612', null, 8), at(0, 0.012, 0.148))
    for (const x of [-0.055, 0.055]) add(head, blob(0.042, 0.032, 0.02, '#3a2e26', null, 8), at(x, 0.035, 0.085, 0, 0, x > 0 ? -0.35 : 0.35))
    this.head.add(new Part(head, material, 'tanuki-head'))
    // Each ear hinges at its base so it can flick on its own.
    const ear = (side: number) => {
      const tilt = -side * 0.35
      const hinge = pivot(this.head, side * 0.069 + 0.03 * Math.sin(tilt), 0.12 - 0.03 * Math.cos(tilt), 0)
      hinge.rotation.z = tilt
      const b = new MeshBuilder()
      add(b, new THREE.ConeGeometry(0.035, 0.06, 6), at(0, 0.03, 0), '#5a4634')
      hinge.add(new Part(b, material, 'tanuki-ear'))
      return hinge
    }
    this.ears = [ear(-1), ear(1)]
    this.eyesShut = pivot(this.head, 0, 0.038, 0.104)
    const shut = new MeshBuilder()
    for (const x of [-0.052, 0.052]) add(shut, new THREE.TorusGeometry(0.014, 0.004, 4, 8, Math.PI), at(x, 0, 0, 0, 0, Math.PI), '#f2e8d8')
    this.eyesShut.add(new Part(shut, material, 'tanuki-eyes-shut'))
    this.eyesOpen = pivot(this.head, 0, 0.038, 0.1)
    const open = new MeshBuilder()
    for (const x of [-0.052, 0.052]) {
      add(open, blob(0.016, 0.018, 0.008, '#fbf6e8', null, 8), at(x, 0, 0))
      add(open, blob(0.009, 0.011, 0.006, '#1a120e', null, 6), at(x, 0, 0.006))
    }
    this.eyesOpen.add(new Part(open, material, 'tanuki-eyes-open'))
    this.mouth = pivot(this.head, 0, -0.03, 0.118)
    const mouth = new MeshBuilder()
    add(mouth, blob(0.024, 0.02, 0.01, '#5a2a24', null, 8), at(0, 0, 0))
    add(mouth, blob(0.012, 0.008, 0.008, '#e8908a', null, 6), at(0, -0.008, 0.004))
    this.mouth.add(new Part(mouth, material, 'tanuki-mouth'))
    this.tail = pivot(this.roll, 0, 0.11, -0.17)
    const tail = new MeshBuilder()
    for (let i = 0; i < 4; i++) add(tail, blob(0.055 - i * 0.004, 0.05 - i * 0.004, 0.05, i % 2 ? '#3a2e26' : '#9a8264', null, 8), at(0, 0.01 * i, -0.04 - i * 0.05))
    this.tail.add(new Part(tail, material, 'tanuki-tail'))
  }

  /**
   * Curled up, the head turns and the tail wraps around the `side` of the body (1: its left); a roll goes over
   * toward that side too, the child's, away from the bushes behind.
   */
  apply(p: MotionPose, side: number): void {
    const b = this.body
    const curl = clamp01(p.curl)
    b.position.set(p.shift * BODY.tanuki, p.lift * BODY.tanuki, p.advance * BODY.tanuki)
    b.rotation.set(p.lean, p.spin, 0)
    squashBody(b, p.squash, 1 + 0.08 * curl, 1 - 0.28 * curl, 1 - 0.05 * curl)
    this.roll.rotation.z = p.roll * side
    this.head.position.set(0.05 * curl * side, 0.17 - 0.1 * curl, 0.16 - 0.02 * curl)
    this.head.rotation.set(0.25 * curl + p.headPitch, -0.5 * curl * side + p.headYaw, 0.2 * curl * side + p.headRoll)
    this.tail.rotation.y = (1.5 * curl + p.tail) * side
    for (let i = 0; i < 2; i++) this.ears[i].rotation.x = -p.ears[i]
    const open = clamp01(p.awake) * p.eyes
    this.eyesOpen.visible = open > 0.5
    this.eyesShut.visible = open <= 0.5
    this.eyesOpen.scale.set(1, Math.max(0.1, open), 1)
    const yawn = Math.max(0, p.mouth)
    this.mouth.scale.set(1 + yawn * 0.6, 0.2 + yawn * 2.2, 1)
  }
}

// ---------------------------------------------------------------- tracks

type Track = {
  kind: CreatureKind
  rig: Rig
  phase: Phase
  spot: Cell | null
  readonly from: THREE.Vector3
  readonly to: THREE.Vector3
  readonly pos: THREE.Vector3
  /** Facing (yaw) at rest. */
  restYaw: number
  /** The frog's hops for the current trip. */
  hops: Hop[]
  spotRef: CreatureSpot
}

const FROG_HOP = 0.62
/** How far the frog's feet clear a wall it jumps: its belly and flung legs hang this far below them. */
const FROG_CLEARANCE = 0.14
/** Its hind feet trail this far behind its body in a leap, so each leap also clears the ground that far back. */
const FROG_TRAIL = 0.25
/** Its landing out of the pond is this far in from the front terrace's edge. */
const FROG_BANK_IN = 0.2
/** The frog sits on its paddy's front ridge, this far left of the plot's middle, its feet this far over the bed. */
const FROG_SEAT_X = -0.15
const FROG_SEAT_Y = 0.11
/** The frog's feet reach this far below its middle as it sits. */
const FROG_FEET = 0.03
/** On the ground (or its pad) its middle is this far over it, its feet a hair above. */
const FROG_STAND = FROG_FEET + 0.012
/** The sparrow sits on the front ridge of its bed, this far left of the plot's middle. */
const SPARROW_SEAT_X = -0.28
/** Midway through a flight the sparrow is this far nearer the child than a straight line would carry it. */
const SPARROW_BOW = 0.8
/** The tanuki walks and naps along a lane this far in front of its terrace's middle, clear of the bushes behind. */
const TANUKI_LANE = 0.18
/** Leaving, it gets up over this much of its walk off, while its gait takes over, before it sets off. */
const TANUKI_GET_UP = TRAVEL_BLEND / TRAVEL_SECONDS.tanuki
/**
 * At rest a visitor's body turns this far from the way its seat faces, toward the child. The sparrow's seat faces
 * straight along the terrace, so its hops (which run the way its seat faces) stay on its bed's front ridge.
 */
const REST_TURN: Record<CreatureKind, number> = { frog: 0, sparrow: 0.3, tanuki: 0 }
/**
 * How far a seated visitor's body turns from the way its seat faces, at most; turning to the child, its head turns the
 * rest of the way. Side-on on its ridge, the sparrow looks round at the child instead of swinging its long tail back
 * through the flowers behind it.
 */
const BODY_TURN: Record<CreatureKind, number> = { frog: Math.PI, sparrow: 0.45, tanuki: Math.PI }
/** Visitors are modelled at life-ish size, then drawn larger so a child can find them at a glance. */
const SIZE: Record<CreatureKind, number> = { frog: 1.9, sparrow: 2.4, tanuki: 1.7 }
/** Travel gait cycles per second: the sparrow's wingbeats and the tanuki's waddle steps (the frog's hops follow distance). */
const GAIT_RATE = { sparrow: 9, tanuki: 1.7 }
/** The yaw that faces the camera, which looks up the hill from the front. */
const FACING_CHILD = 0

export class CreaturesView {
  readonly group = new THREE.Group()
  private readonly material = celMaterial({ outline: 0.85 })
  private readonly tracks: Track[]

  constructor(projector: Projector) {
    const spots: CreatureSpot[] = []
    this.tracks = (['frog', 'sparrow', 'tanuki'] as const).map((kind) => {
      const rig = kind === 'frog' ? new Frog(this.material) : kind === 'sparrow' ? new Sparrow(this.material) : new Tanuki(this.material)
      rig.root.name = kind
      rig.root.userData.jamObject = kind
      rig.root.visible = false
      rig.root.scale.setScalar(SIZE[kind])
      rig.root.rotation.order = 'YXZ'
      this.group.add(rig.root)
      const pos = new THREE.Vector3()
      const spotRef: CreatureSpot = { kind, visible: false, at: pos }
      spots.push(spotRef)
      return { kind, rig, phase: 'away' as Phase, spot: null, from: new THREE.Vector3(), to: new THREE.Vector3(), pos, restYaw: 0, hops: [], spotRef }
    })
    projector.creatures = spots
  }

  /**
   * The frog's trip: from the pond onto the bank square in front of its pad, a landing on the terrace in front of
   * its plot, then up onto the ridge; or back.
   */
  private planTrip(track: Track): void {
    if (track.kind !== 'frog') return
    const route = [track.from, track.to]
    if (track.spot && track.spot.r + 1 < ROWS) route.splice(1, 0, frogApproach(track.spot, new THREE.Vector3()))
    const leaving = track.to.y < track.from.y
    route.splice(leaving ? route.length - 1 : 1, 0, frogBank(new THREE.Vector3()))
    planHops(route, FROG_HOP, FROG_CLEARANCE, track.hops, FROG_TRAIL, FROG_STAND)
  }

  private begin(track: Track, presence: Presence): void {
    const was = track.phase
    const next = presence.phase
    track.phase = next
    if (next === 'arriving' && presence.spot) {
      track.restYaw = restSpot(track.kind, presence.spot, track.to)
      if (was === 'here' || was === 'arriving') track.from.copy(track.pos)
      else entrySpot(track.kind, presence.spot, track.to, track.from)
      track.spot = presence.spot
    } else if (next === 'leaving' && track.spot) {
      track.from.copy(track.pos)
      entrySpot(track.kind, track.spot, track.from, track.to)
    } else if (next === 'here' && presence.spot) {
      track.restYaw = restSpot(track.kind, presence.spot, track.to)
      track.pos.copy(track.to)
      track.spot = presence.spot
    }
    this.planTrip(track)
  }

  update(garden: GardenController, shadows: ShadowSink): void {
    const now = garden.now
    for (let i = 0; i < this.tracks.length; i++) {
      const track = this.tracks[i]
      const presence = garden.creatures[i]
      if (presence.phase !== track.phase) this.begin(track, presence)
      const root = track.rig.root
      const visible = presence.phase !== 'away' && (presence.phase !== 'here' || track.spot !== null)
      root.visible = visible
      track.spotRef.visible = visible && presence.phase === 'here'
      if (!visible) continue
      const director = garden.creatureMotion[track.kind]
      const u = presence.progress(now)
      let yaw = track.restYaw
      let ground = track.to.y
      let height = 0
      let pose: MotionPose
      if (presence.phase === 'arriving' || presence.phase === 'leaving') {
        const from = track.from
        const to = track.to
        // Leaving, the tanuki gets up where it lay before it turns and walks off, so whatever it was still doing
        // (rolled on its back, say) ends facing the way it lay, never swung round into the bushes.
        const tanukiLeaving = track.kind === 'tanuki' && presence.phase === 'leaving'
        const walk = tanukiLeaving ? span(u, TANUKI_GET_UP, 1) : u
        yaw = tanukiLeaving && u < TANUKI_GET_UP ? track.restYaw : Math.atan2(to.x - from.x, to.z - from.z)
        track.pos.lerpVectors(from, to, track.kind === 'tanuki' ? walk : smooth(u))
        ground = from.y + (to.y - from.y) * walk
        switch (track.kind) {
          case 'frog': {
            // Hop from landing to landing: each hop is a crouch on the ground, then an arc.
            const hops = track.hops
            const hopsF = Math.min(u * hops.length, hops.length - 1e-4)
            const index = Math.floor(hopsF)
            const hop = hops[index]
            const air = clamp01((hopsF - index - 0.28) / 0.72)
            ground = hopPoint(hop, air, track.pos)
            height = track.pos.y - ground
            yaw = Math.atan2(hop.to.x - hop.from.x, hop.to.z - hop.from.z)
            pose = director.sample(now, hopsF)
            break
          }
          case 'sparrow': {
            // Its flights bow out toward the child: off one ridge and onto the next it flies forward, never back
            // through the plants of the bed it leaves or the one it comes to.
            const bow = Math.sin(u * Math.PI)
            track.pos.y += bow * 0.6
            track.pos.z += bow * SPARROW_BOW
            height = track.pos.y - ground
            const landing = presence.phase === 'arriving' ? span(u, 0.82, 1) : 1 - span(u, 0, 0.12)
            pose = director.sample(now, now * GAIT_RATE.sparrow, landing)
            break
          }
          case 'tanuki':
            pose = director.sample(now, now * GAIT_RATE.tanuki)
            break
          default: {
            const never: never = track.kind
            return never
          }
        }
      } else {
        track.pos.copy(track.to)
        pose = director.sample(now)
        // The body turns in place on its seat, so a hop in a poke still runs the way the seat faces.
        const turn = REST_TURN[track.kind]
        const toChild = turn + (FACING_CHILD - (yaw + turn)) * clamp01(pose.face)
        const body = Math.max(-BODY_TURN[track.kind], Math.min(BODY_TURN[track.kind], toChild))
        pose.spin += body
        pose.headYaw += toChild - body
      }
      // Either end of the terraces, the tanuki curls up toward the child, its tail around the front and clear of the bushes.
      track.rig.apply(pose, track.to.x < 0 ? 1 : -1)
      height += Math.max(0, pose.lift) * BODY[track.kind] * SIZE[track.kind]
      root.position.copy(track.pos)
      root.rotation.set(track.kind === 'tanuki' ? slopePitch(track.pos.x, yaw) : 0, yaw, 0)
      const radius = (track.kind === 'tanuki' ? 0.26 : track.kind === 'frog' ? 0.14 : 0.08) * SIZE[track.kind]
      shadows.shadow(track.pos.x, ground, track.pos.z, radius * (1 + height * 0.6), Math.max(0.15, 1 - height * 0.7))
    }
  }

  dispose(): void {
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose()
    })
    this.material.dispose()
  }
}

/**
 * Where each visitor settles at a spot, and the way its seat faces. The frog and the sparrow sit on the front ridge
 * of their plot (never a buildable cell), clear of its crop; the tanuki naps on the meadow at the end of the wheel's
 * terrace, in earshot, facing the build and the child, so it never lies on the build.
 */
export function restSpot(kind: CreatureKind, spot: Cell, out: THREE.Vector3): number {
  const x = cellX(spot.c)
  const y = floorY(spot.r)
  const z = rowZ(spot.r)
  switch (kind) {
    case 'frog':
      out.set(x + FROG_SEAT_X, y + FROG_SEAT_Y, frontZ(spot.r) - 0.045)
      return 0.2
    case 'sparrow':
      out.set(x + SPARROW_SEAT_X, y + 0.07, frontZ(spot.r) - 0.05)
      return -Math.PI / 2
    case 'tanuki': {
      const left = spot.c <= 3
      const tx = left ? GRID_LEFT - TANUKI_NAP_OUT : GRID_RIGHT + TANUKI_NAP_OUT
      out.set(tx, y + sideRise(tx), z + TANUKI_LANE)
      return left ? Math.PI / 2 - 0.35 : -Math.PI / 2 + 0.35
    }
    default: {
      const never: never = kind
      return never
    }
  }
}

/** The pitch that lays a body facing `yaw` at `x` along the meadow's rise beside the grid: nose up, going uphill. */
function slopePitch(x: number, yaw: number): number {
  if (Math.abs(x) <= GRID_RIGHT) return 0
  return -Math.atan(SIDE_RISE * Math.sign(x) * Math.sin(yaw))
}

/** Where a visitor comes from and goes back to. */
export function entrySpot(kind: CreatureKind, spot: Cell, rest: THREE.Vector3, out: THREE.Vector3): THREE.Vector3 {
  switch (kind) {
    // Standing on its lily pad, the frog's feet a hair over the pad.
    case 'frog':
      return out.set(FROG_PAD.x, FROG_PAD.y + FROG_STAND, FROG_PAD.z)
    // From off the right edge and in front of its bed, so it never comes down through the plants behind the ridge.
    case 'sparrow':
      return out.set(rest.x + 4.5, rest.y + 3.4, rest.z + 3)
    case 'tanuki': {
      const left = spot.c <= 3
      const tx = left ? GRID_LEFT - 3.2 : GRID_RIGHT + 3.2
      return out.set(tx, floorY(spot.r) + sideRise(tx), rowZ(spot.r) + TANUKI_LANE)
    }
    default: {
      const never: never = kind
      return never
    }
  }
}

/**
 * The frog's landing on the bank square in front of its lily pad. It leaps the wall out of the pond (or back in)
 * straight across, so a hind leg splayed to one side never reaches over the wall's edge before its body does.
 */
export function frogBank(out: THREE.Vector3): THREE.Vector3 {
  return out.set(FROG_PAD.x, floorY(ROWS - 1) + FROG_STAND, frontZ(ROWS - 1) - FROG_BANK_IN)
}

/** The frog's landing on the terrace in front of its plot, between two cells and in front of their pipes' line. */
export function frogApproach(spot: Cell, out: THREE.Vector3): THREE.Vector3 {
  return out.set(cellX(spot.c) - 0.5, floorY(spot.r + 1) + FROG_STAND, rowZ(spot.r + 1) + 0.2)
}
