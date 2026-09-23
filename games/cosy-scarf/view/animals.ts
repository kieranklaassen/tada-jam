import * as THREE from 'three'
import type { ActorView } from '../controller'
import { groundY } from '../layout'
import { emptyPose, MotionDirector, type Pose } from '../motion'
import { clamp01, smooth } from '../springs'
import type { AnimalKey } from '../state'
import { ball, beadEye, capsule, cone, egg, merge, once, part, type ColorFn } from './shapes'
import { PALETTE, type WarmthUniforms, type YarnMaterials } from './yarn'

// Four amigurumi friends. Each is a handful of crocheted parts on pivots
// (one draw call per part). The rig owns what is physical and particular to
// the animal: its gait, its happy dance, how it stands when cold and how it
// hopes for the scarf. Everything it does between those (idle life, blinks,
// answering a tap, a row, a pattern, asking for the scarf, rare delights)
// comes from its own director in `../motion`, added on top as a pose. The
// bunny is quick and twitchy, the penguin slow and rocking, the fox smooth
// and sly, the bear big and heavy.

export type Moment = {
  t: number
  dt: number
  /** 0..1: a row is being knitted right now. */
  knitting: number
  /** The scarf is offered to this animal. */
  hoping: boolean
  /** Where the eyes go (the scarf, the needles, or the child). */
  focus: THREE.Vector3
  /** 0..1: how far the scarf on the loom is toward long enough, for the animal waiting there. */
  progress: number
  /** When the last pattern rang out. */
  humAt: number
  step: (animal: AnimalKey, weight: number) => void
  puff: (x: number, y: number, z: number, size: number) => void
}

const TAU = Math.PI * 2

function wave(t: number, hz: number, phase = 0): number {
  return Math.sin(t * TAU * hz + phase)
}

function approach(current: number, target: number, rate: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-rate * dt))
}

function turn(current: number, target: number, rate: number, dt: number): number {
  let d = target - current
  while (d > Math.PI) d -= TAU
  while (d < -Math.PI) d += TAU
  return current + d * (1 - Math.exp(-rate * dt))
}

/** Where lumps of snow slide over the cap's rim: [angle round the head, size, how far down]. */
const DRIPS: [number, number, number][] = [
  [-0.75, 0.3, 0.22],
  [0.4, 0.26, 0.3],
  [1.5, 0.22, 0.12],
  [-2.2, 0.24, 0.16],
]

/** A heap of crocheted snow, lumpy with drips over its rim: a smooth even disc reads as a beret. */
const snowCap = (radius: number) =>
  once(`snow-cap-${radius}`, () =>
    merge([
      part(ball(radius, 0.8, 14), { color: PALETTE.snow, scale: [1, 0.55, 0.95], underside: 0.06 }),
      part(ball(radius * 0.58, 0.8, 10), { color: PALETTE.snow, at: [radius * 0.3, radius * 0.38, radius * 0.1] }),
      part(ball(radius * 0.42, 0.8, 10), { color: PALETTE.snow, at: [-radius * 0.42, radius * 0.28, -radius * 0.15] }),
      ...DRIPS.map(([angle, size, drop]) =>
        part(ball(radius * size, 0.8, 8), { color: PALETTE.snow, at: [Math.sin(angle) * radius * 0.88, -radius * drop, Math.cos(angle) * radius * 0.82], underside: 0.06 }),
      ),
    ]),
  )

/** Two bead eyes centred on y = 0, so scaling the mesh in y closes them. */
const eyes = (key: string, x: number, z: number, radius: number) =>
  once(`${key}-eyes`, () => merge([...beadEye([-x, 0, z], radius, [0, 0, 1]), ...beadEye([x, 0, z], radius, [0, 0, 1])]))

abstract class Amigurumi {
  readonly root = new THREE.Group()
  readonly body = new THREE.Group()
  /** The scarf's frame: centred in the neck, z toward the animal's front. */
  readonly neck = new THREE.Object3D()
  abstract readonly animal: AnimalKey
  abstract readonly neckRadius: number
  abstract readonly band: number
  abstract readonly drape: number
  /** Seconds between frosty breaths while cold: each animal breathes at its own pace. */
  protected abstract readonly breathEvery: number
  protected abstract readonly director: MotionDirector
  protected readonly material: THREE.MeshStandardMaterial
  /** The snow cap is not the animal: it keeps its own white, untouched by the cold tint. */
  private readonly snow: THREE.MeshStandardMaterial
  protected readonly warmth: WarmthUniforms
  protected readonly pose: Pose = emptyPose()
  protected shownYaw = 0
  protected headYaw = 0
  protected stepIndex = -1
  private cap: THREE.Mesh | null = null
  private eyeMesh: THREE.Mesh | null = null
  private capY = 0
  private lastWarm = -1
  private breathAt = 0
  private breaths = 0
  private seenTap = Number.NEGATIVE_INFINITY
  private seenRow = Number.NEGATIVE_INFINITY
  private seenHum = Number.NEGATIVE_INFINITY
  private readonly mouthAt = new THREE.Vector3()
  private readonly scratch = new THREE.Vector3()

  constructor(materials: YarnMaterials) {
    const { material, warmth } = materials.animal()
    this.material = material
    this.snow = materials.crochet
    this.warmth = warmth
    this.root.add(this.body)
    this.body.add(this.neck)
    this.root.visible = false
  }

  /** How cold the animal looks: fully cold until it has a scarf, a little less with every row knitted for it. */
  protected coldness(actor: ActorView, m: Moment): number {
    return (1 - actor.warm) * (1 - 0.45 * m.progress)
  }

  /** The eyes (their own mesh, so they can blink), a lump of snow on the head, and where the breath leaves the mouth. */
  protected face(head: THREE.Object3D, eyeGeometry: THREE.BufferGeometry, eyeY: number, capY: number, capRadius: number, mouth: [number, number, number]): void {
    this.eyeMesh = this.piece(eyeGeometry, head, 0, eyeY, 0)
    this.cap = this.piece(snowCap(capRadius), head, 0, capY, -0.4, this.snow)
    this.capY = capY
    this.mouthAt.set(...mouth)
  }

  /** Turn what happened to this animal into director actions and sample its pose for this frame. */
  protected direct(actor: ActorView, m: Moment, dancing: boolean): Pose {
    const chilly = actor.warm < 0.5
    const director = this.director
    if (actor.tapAt !== this.seenTap) {
      this.seenTap = actor.tapAt
      director.trigger(chilly ? 'poke' : 'pet', actor.tapAt)
    }
    if (actor.rowAt !== this.seenRow) {
      this.seenRow = actor.rowAt
      if (chilly) director.trigger('row', actor.rowAt)
    }
    if (m.humAt !== this.seenHum) {
      this.seenHum = m.humAt
      if (!chilly) director.trigger('hum', m.humAt, director.personality.humDelay)
    }
    const quiet = actor.walking || dancing || actor.reach.x > 0.05 || m.knitting > 0.3
    const pose = director.sample(m.t, quiet, chilly, this.pose)
    if (this.eyeMesh) this.eyeMesh.scale.y = Math.max(0.1, 1 - pose.shut)
    return pose
  }

  /** Frosty breath while cold and standing still; the snow cap pops off in a puff as the scarf warms it. */
  protected breathe(head: THREE.Object3D, actor: ActorView, m: Moment, cold: number): void {
    const cap = this.cap
    if (cap) {
      const melt = smooth(clamp01(actor.warm / 0.6))
      cap.visible = melt < 0.99
      cap.position.y = this.capY + melt * 5
      cap.scale.setScalar(1 - melt * 0.8)
      if (this.lastWarm >= 0 && this.lastWarm < 0.2 && actor.warm >= 0.2) {
        this.scratch.setFromMatrixPosition(cap.matrixWorld)
        m.puff(this.scratch.x, this.scratch.y, this.scratch.z, 1.3)
      }
    }
    this.lastWarm = actor.warm
    if (m.t < this.breathAt) return
    this.breathAt = m.t + this.breathEvery * (0.85 + 0.3 * ((this.breaths++ * 0.618) % 1))
    if (cold < 0.3 || actor.walking) return
    this.scratch.copy(this.mouthAt).applyMatrix4(head.matrixWorld)
    m.puff(this.scratch.x, this.scratch.y, this.scratch.z + 1, 0.4 + 0.25 * cold)
  }

  protected piece(geometry: THREE.BufferGeometry, parent: THREE.Object3D, x: number, y: number, z: number, material: THREE.Material = this.material): THREE.Mesh {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.set(x, y, z)
    parent.add(mesh)
    return mesh
  }

  /** Yaw toward `focus` from where the animal stands, relative to its body. */
  protected gaze(x: number, z: number, focus: THREE.Vector3): number {
    const toward = Math.atan2(focus.x - x, focus.z - z) - this.shownYaw
    return THREE.MathUtils.clamp(Math.atan2(Math.sin(toward), Math.cos(toward)), -0.85, 0.85)
  }

  /** Turn the head toward `focus` at this animal's own pace. */
  protected look(x: number, z: number, m: Moment): number {
    this.headYaw = approach(this.headYaw, this.gaze(x, z, m.focus), this.director.personality.look, m.dt)
    return this.headYaw
  }

  /** A footfall when the step count changes; `count` is how many feet have landed so far on this walk. */
  protected footfall(count: number, weight: number, m: Moment): void {
    if (count !== this.stepIndex) {
      if (this.stepIndex >= 0 && count > this.stepIndex) m.step(this.animal, weight)
      this.stepIndex = count
    }
  }

  sync(actor: ActorView, m: Moment): void {
    this.root.visible = actor.visible
    this.warmth.uCold.value = this.coldness(actor, m)
    this.warmth.uBlush.value = Math.max(actor.warm, 0.6 * m.progress)
  }

  abstract update(actor: ActorView, m: Moment): void

  dispose(): void {
    this.material.dispose()
  }
}

// --- the bunny: quick, twitchy, springy; hops with both feet together ---------

const bunnyBody = () =>
  once('bunny-body', () => {
    const fur = new THREE.Color(PALETTE.bunny)
    const cream = new THREE.Color(PALETTE.bunnyLight)
    const belly: ColorFn = (p, n) => (n.z > 0.5 && p.y > 2.5 && p.y < 11 ? cream : fur)
    return merge([
      part(egg(7.2, 14, 1.1, 0.35), { color: belly, ground: 0 }),
      part(ball(2.6, 0.9, 12), { color: cream, at: [0, 4.4, -6.8] }),
    ])
  })
const bunnyHead = () =>
  once('bunny-head', () =>
    merge([
      part(ball(7, 1.1, 22), { color: PALETTE.bunny, scale: [1.06, 0.94, 1] }),
      part(ball(2.1, 0.9, 12), { color: PALETTE.bunnyLight, at: [-1.15, -2.1, 5.6] }),
      part(ball(2.1, 0.9, 12), { color: PALETTE.bunnyLight, at: [1.15, -2.1, 5.6] }),
      part(ball(0.75, 0.5, 10), { color: PALETTE.bunnyInner, at: [0, -0.9, 6.9], bead: true }),
      part(ball(1.35, 0.8, 10), { color: PALETTE.bunny, at: [-4.3, -1.6, 4.8], scale: [1, 0.7, 0.45], blush: true }),
      part(ball(1.35, 0.8, 10), { color: PALETTE.bunny, at: [4.3, -1.6, 4.8], scale: [1, 0.7, 0.45], blush: true }),
    ]),
  )
const bunnyEar = () =>
  once('bunny-ear', () =>
    merge([
      part(capsule(1.9, 7.5, 0.9), { color: PALETTE.bunny, at: [0, 5.6, 0] }),
      part(capsule(1.05, 5.8, 0.7), { color: PALETTE.bunnyInner, at: [0, 5.8, 1.3], scale: [1, 1, 0.45] }),
    ]),
  )
const bunnyArm = () => once('bunny-arm', () => part(capsule(1.5, 3.4, 0.8), { color: PALETTE.bunny, at: [0, -2.3, 0] }))
const bunnyFeet = () =>
  once('bunny-feet', () =>
    merge([
      part(ball(2.5, 0.8, 12), { color: PALETTE.bunnyLight, at: [-3.1, 1.2, 3.2], scale: [1, 0.55, 1.5], ground: 0 }),
      part(ball(2.5, 0.8, 12), { color: PALETTE.bunnyLight, at: [3.1, 1.2, 3.2], scale: [1, 0.55, 1.5], ground: 0 }),
    ]),
  )

export class Bunny extends Amigurumi {
  readonly animal = 'bunny'
  readonly neckRadius = 6.3
  readonly band = 5
  readonly drape = 0.16
  protected readonly breathEvery = 1.7
  protected readonly director = new MotionDirector('bunny', 11)
  private readonly head: THREE.Mesh
  private readonly earL: THREE.Mesh
  private readonly earR: THREE.Mesh
  private readonly armL: THREE.Mesh
  private readonly armR: THREE.Mesh
  private readonly feet: THREE.Mesh

  constructor(materials: YarnMaterials) {
    super(materials)
    this.piece(bunnyBody(), this.body, 0, 0, 0)
    this.head = this.piece(bunnyHead(), this.body, 0, 19.6, 0.4)
    this.earL = this.piece(bunnyEar(), this.head, -2.5, 5.2, -0.6)
    this.earR = this.piece(bunnyEar(), this.head, 2.5, 5.2, -0.6)
    this.armL = this.piece(bunnyArm(), this.body, -5.6, 10.6, 1.6)
    this.armR = this.piece(bunnyArm(), this.body, 5.6, 10.6, 1.6)
    this.feet = this.piece(bunnyFeet(), this.root, 0, 0, 0)
    this.neck.position.set(0, 13.9, 0.2)
    this.face(this.head, eyes('bunny', 2.6, 6.1, 0.95), 0.9, 6.2, 3.9, [0, -2.8, 6.8])
  }

  update(actor: ActorView, m: Moment): void {
    const { t, dt } = m
    const cold = this.coldness(actor, m)
    const reach = Math.max(0, actor.reach.x)
    let x = actor.x
    let z = actor.z
    let lift = 0
    let squashY = 1
    let spin = 0
    let wiggle = 0
    let earBack = 0
    let earSplay = 0
    let armsUp = 0
    let feetBack = 0

    // Gait: two-footed hops that only travel while airborne.
    if (actor.walking && t >= actor.walkT0) {
      const distance = Math.hypot(actor.walkTo.x - actor.walkFrom.x, actor.walkTo.z - actor.walkFrom.z)
      const hops = Math.max(2, Math.round(distance / 8.5))
      const along = actor.walkProgress * hops
      const index = Math.min(hops - 1, Math.floor(along))
      const f = actor.walkProgress >= 1 ? 1 : along - index
      const air = clamp01((f - 0.18) / 0.6)
      const k = (index + smooth(air)) / hops
      x = actor.walkFrom.x + (actor.walkTo.x - actor.walkFrom.x) * k
      z = actor.walkFrom.z + (actor.walkTo.z - actor.walkFrom.z) * k
      lift = Math.sin(air * Math.PI) * 5.5
      squashY = f < 0.18 ? 1 - Math.sin((f / 0.18) * Math.PI) * 0.16 : f > 0.8 ? 1 - Math.sin(((f - 0.8) / 0.2) * Math.PI) * 0.18 : 1 + Math.sin(air * Math.PI) * 0.08
      earBack = air > 0 && air < 1 ? 0.55 : 0
      feetBack = Math.sin(air * Math.PI) * 0.5
      this.footfall(index + (f > 0.8 ? 1 : 0), 0.3, m)
    } else this.stepIndex = -1

    // Dance: three binkies, the middle one with a full twist in the air, then a wiggle.
    const danceAge = t - actor.danceAt
    const dancing = danceAge >= 0 && danceAge < actor.danceLength
    if (dancing) {
      const d = danceAge / actor.danceLength
      if (d < 0.8) {
        const along = (d / 0.8) * 3
        const index = Math.floor(along)
        const f = along - index
        lift = Math.max(lift, Math.sin(f * Math.PI) * 7)
        squashY *= f < 0.12 ? 0.86 : 1 + Math.sin(f * Math.PI) * 0.1
        if (index === 1) spin = smooth(f) * TAU
        earSplay = Math.sin(f * Math.PI) * 0.7
        armsUp = Math.sin(f * Math.PI) * 1.8
      } else wiggle = wave(t, 7) * 0.12 * (1 - (d - 0.8) / 0.2)
    }

    const pose = this.direct(actor, m, dancing)

    // Hoping for the scarf: ears up, arms up, bouncing on its toes.
    const hopeBounce = Math.abs(wave(t, 2.1)) * 1.2 * reach
    this.shownYaw = turn(this.shownYaw, actor.yaw, 12, dt)
    this.root.position.set(x, groundY(x, z), z)
    this.root.rotation.y = this.shownYaw + spin + pose.twist
    const shiver = wave(t, 18) * 0.22 * cold
    this.body.position.set(shiver, lift + hopeBounce + pose.lift, 0)
    const tall = squashY * (1 - pose.squash) * (1 - 0.06 * cold) * (1 + 0.05 * reach)
    const wide = 1 + (1 - squashY) * 0.5 + pose.squash * 0.5
    this.body.scale.set(wide, tall, wide)
    this.body.rotation.set(0.08 * cold + pose.lean, 0, wiggle + pose.roll)

    this.head.rotation.set(0.14 * cold - 0.12 * reach + pose.headPitch, this.look(x, z, m) + pose.headYaw, pose.headRoll)
    this.head.position.y = 19.6 - cold * 0.6

    // Cold ears flop out sideways like a sad lop; hoping ears prick up.
    const droop = cold * (1 - reach)
    this.earL.rotation.set(-0.25 * droop - earBack - pose.earL, 0, 0.18 + earSplay + droop * 0.95)
    this.earR.rotation.set(-0.25 * droop - earBack - pose.earR, 0, -0.18 - earSplay - droop * 0.95)

    // Cold arms hug the belly; hoping arms reach up; raised arms swing forward and out.
    const hug = clamp01(cold * (1 - reach) + pose.hug)
    const up = Math.max(armsUp, reach * 2.3)
    const out = armsUp > 0 ? 0.5 : 0
    this.armL.rotation.set(-1.2 * hug - up - pose.armL * 0.8, 0, -0.1 + 0.6 * hug - out - pose.armL * 0.6)
    this.armR.rotation.set(-1.2 * hug - up - pose.armR * 0.8, 0, 0.1 - 0.6 * hug + out + pose.armR * 0.6)
    this.feet.position.set(0, lift * 0.85, -feetBack * 2)
    this.feet.rotation.x = feetBack * 0.6
    this.breathe(this.head, actor, m, cold)
  }
}

// --- the penguin: slow and rocking; waddles with alternating feet ---------------

const penguinBody = () =>
  once('penguin-body', () => {
    const navy = new THREE.Color(PALETTE.penguin)
    const cream = new THREE.Color(PALETTE.penguinBelly)
    const belly: ColorFn = (p, n) => (n.z > 0.32 && p.y > 1.2 && p.y < 17.5 && Math.abs(p.x) < 6.8 ? cream : navy)
    return part(egg(9, 21, 1.2, 0.3, 24), { color: belly, ground: 0 })
  })
const penguinHead = () =>
  once('penguin-head', () => {
    const navy = new THREE.Color(PALETTE.penguin)
    const cream = new THREE.Color(PALETTE.penguinBelly)
    const face: ColorFn = (p, n) => (n.z > 0.35 && p.y < 2.6 && (Math.hypot(p.x - 2.1, p.y + 0.4) < 3.4 || Math.hypot(p.x + 2.1, p.y + 0.4) < 3.4 || p.y < -1.8) ? cream : navy)
    return merge([
      part(ball(7, 1.2, 22), { color: face }),
      part(cone(1.5, 3.4, 0.6, 10), { color: PALETTE.beak, at: [0, -0.9, 7.8], rot: [Math.PI / 2, 0, 0], bead: true }),
      part(ball(1.3, 0.8, 10), { color: PALETTE.penguinBelly, at: [-4.2, -1.9, 4.9], scale: [1, 0.7, 0.45], blush: true }),
      part(ball(1.3, 0.8, 10), { color: PALETTE.penguinBelly, at: [4.2, -1.9, 4.9], scale: [1, 0.7, 0.45], blush: true }),
    ])
  })
const penguinFlipper = () => once('penguin-flipper', () => part(capsule(1.7, 8, 0.9), { color: PALETTE.penguin, at: [0, -5, 0], scale: [0.45, 1, 1] }))
const penguinFoot = () => once('penguin-foot', () => part(ball(2.4, 0.7, 12), { color: PALETTE.beak, at: [0, 0.7, 1.4], scale: [1.1, 0.4, 1.6], ground: 0 }))

export class Penguin extends Amigurumi {
  readonly animal = 'penguin'
  readonly neckRadius = 7.4
  readonly band = 5.4
  readonly drape = 0.24
  protected readonly breathEvery = 2.7
  protected readonly director = new MotionDirector('penguin', 23)
  private readonly head: THREE.Mesh
  private readonly flipperL: THREE.Mesh
  private readonly flipperR: THREE.Mesh
  private readonly footL: THREE.Mesh
  private readonly footR: THREE.Mesh

  constructor(materials: YarnMaterials) {
    super(materials)
    this.piece(penguinBody(), this.body, 0, 0, 0)
    this.head = this.piece(penguinHead(), this.body, 0, 21.4, 0.3)
    this.flipperL = this.piece(penguinFlipper(), this.body, -7.6, 15.5, 0.2)
    this.flipperR = this.piece(penguinFlipper(), this.body, 7.6, 15.5, 0.2)
    this.footL = this.piece(penguinFoot(), this.root, -3, 0, 3.6)
    this.footR = this.piece(penguinFoot(), this.root, 3, 0, 3.6)
    this.neck.position.set(0, 16.2, 0.3)
    this.face(this.head, eyes('penguin', 2.2, 6.3, 0.9), 0.8, 6.6, 4.4, [0, -1.2, 9.6])
  }

  update(actor: ActorView, m: Moment): void {
    const { t, dt } = m
    const cold = this.coldness(actor, m)
    const reach = Math.max(0, actor.reach.x)
    let x = actor.x
    let z = actor.z
    let roll = 0
    let bounce = 0
    let spin = 0
    let liftL = 0
    let liftR = 0
    let spread = 0

    // Gait: a waddle, rolling onto each foot in turn; the body stops and starts.
    if (actor.walking && t >= actor.walkT0) {
      const distance = Math.hypot(actor.walkTo.x - actor.walkFrom.x, actor.walkTo.z - actor.walkFrom.z)
      const steps = Math.max(3, Math.round(distance / 3.6))
      const along = actor.walkProgress * steps
      const index = Math.min(steps - 1, Math.floor(along))
      const f = actor.walkProgress >= 1 ? 1 : along - index
      const k = (index + smooth(f) * 0.75 + f * 0.25) / steps
      x = actor.walkFrom.x + (actor.walkTo.x - actor.walkFrom.x) * k
      z = actor.walkFrom.z + (actor.walkTo.z - actor.walkFrom.z) * k
      const side = index % 2 === 0 ? 1 : -1
      roll = side * Math.sin(f * Math.PI) * 0.24
      if (side > 0) liftL = Math.sin(f * Math.PI) * 1.3
      else liftR = Math.sin(f * Math.PI) * 1.3
      spread = 0.35
      this.footfall(index + (f > 0.92 ? 1 : 0), 0.4, m)
    } else this.stepIndex = -1

    // Dance: spins round twice with flippers out, bouncing on its belly, then ta-da.
    const danceAge = t - actor.danceAt
    const dancing = danceAge >= 0 && danceAge < actor.danceLength
    if (dancing) {
      const d = danceAge / actor.danceLength
      spin = smooth(clamp01(d / 0.65)) * TAU * 2
      bounce = Math.abs(wave(danceAge, 3)) * 1.6 * (d < 0.65 ? 1 : 0)
      spread = d < 0.65 ? 1.25 : 1.25 + Math.sin(clamp01((d - 0.65) / 0.35) * Math.PI) * 0.9
      roll = d < 0.65 ? wave(danceAge, 1.5) * 0.12 : -0.1 * Math.sin(clamp01((d - 0.65) / 0.35) * Math.PI)
    }

    const pose = this.direct(actor, m, dancing)

    // Cold: beak chattering in little bounces. Hoping: leans back, flippers wide, heel-toe bouncing.
    bounce += Math.abs(wave(t, 9)) * 0.35 * cold + Math.abs(wave(t, 2.5)) * 0.5 * reach
    this.shownYaw = turn(this.shownYaw, actor.yaw, 3, dt)
    this.root.position.set(x, groundY(x, z), z)
    this.root.rotation.y = this.shownYaw + spin + pose.twist
    this.body.position.set(0, bounce + pose.lift, 0)
    this.body.rotation.set(0.12 * cold - 0.16 * reach + pose.lean, 0, roll + pose.roll + wave(t, 9) * 0.02 * cold)
    const wide = 1 + pose.squash * 0.5
    this.body.scale.set(wide, (1 - pose.squash) * (1 - 0.04 * cold), wide)
    this.head.rotation.set(0.18 * cold - 0.15 * reach + pose.headPitch, this.look(x, z, m) + pose.headYaw, -roll * 0.5 + pose.headRoll)
    this.head.position.y = 21.4 - 1.2 * cold
    const clamp = 0.06 + 0.16 * actor.warm - pose.hug * 0.12
    this.flipperL.rotation.set(0, 0, -(clamp + spread + reach + pose.armL))
    this.flipperR.rotation.set(0, 0, clamp + spread + reach + pose.armR)
    this.footL.position.y = liftL
    this.footR.position.y = liftR
    this.footL.rotation.x = -liftL * 0.2
    this.footR.rotation.x = -liftR * 0.2
    this.breathe(this.head, actor, m, cold)
  }
}

// --- the fox: smooth and sly; trots level with its tail streaming ------------------

const foxBody = () =>
  once('fox-body', () => {
    const fur = new THREE.Color(PALETTE.fox)
    const cream = new THREE.Color(PALETTE.foxLight)
    const chest: ColorFn = (p, n) => (n.z > 0.5 && p.y > 4.5 ? cream : fur)
    return part(egg(7, 13.5, 1.1, 0.35), { color: chest, ground: 0 })
  })
const foxHead = () =>
  once('fox-head', () => {
    const fur = new THREE.Color(PALETTE.fox)
    const cream = new THREE.Color(PALETTE.foxLight)
    const face: ColorFn = (p, n) => (n.z > 0.2 && p.y < -0.6 ? cream : fur)
    return merge([
      part(ball(6.8, 1.1, 22), { color: face, scale: [1.08, 0.94, 1] }),
      part(cone(2.7, 5.2, 0.7, 12), { color: PALETTE.foxLight, at: [0, -1.5, 7.4], rot: [Math.PI / 2, 0, 0] }),
      part(ball(0.85, 0.5, 10), { color: PALETTE.foxDark, at: [0, -1.4, 10], bead: true }),
      part(ball(1.3, 0.8, 10), { color: PALETTE.fox, at: [-4.3, -1.8, 4.4], scale: [1, 0.7, 0.45], blush: true }),
      part(ball(1.3, 0.8, 10), { color: PALETTE.fox, at: [4.3, -1.8, 4.4], scale: [1, 0.7, 0.45], blush: true }),
    ])
  })
const foxEar = () =>
  once('fox-ear', () => {
    const fur = new THREE.Color(PALETTE.fox)
    const tip = new THREE.Color(PALETTE.foxDark)
    return part(cone(2.5, 5.4, 0.7, 10), { color: (p) => (p.y > 0.9 ? tip : fur), at: [0, 2.5, 0], scale: [1, 1, 0.55] })
  })
const foxTailBase = () => once('fox-tail-base', () => part(capsule(2.6, 6, 1), { color: PALETTE.fox, at: [0, 4.2, 0] }))
const foxTailTip = () =>
  once('fox-tail-tip', () => {
    const fur = new THREE.Color(PALETTE.fox)
    const cream = new THREE.Color(PALETTE.foxLight)
    return part(egg(3.4, 9, 1, 0.1), { color: (p) => (p.y > 5.4 ? cream : fur) })
  })
const foxPaw = () => once('fox-paw', () => part(capsule(1.35, 3.2, 0.7), { color: PALETTE.foxDark, at: [0, 2.2, 0], ground: 0 }))

export class Fox extends Amigurumi {
  readonly animal = 'fox'
  readonly neckRadius = 6.1
  readonly band = 4.7
  readonly drape = 0.18
  protected readonly breathEvery = 2.2
  protected readonly director = new MotionDirector('fox', 37)
  private readonly head: THREE.Mesh
  private readonly earL: THREE.Mesh
  private readonly earR: THREE.Mesh
  private readonly tailBase: THREE.Mesh
  private readonly tailTip: THREE.Mesh
  private readonly pawL: THREE.Mesh
  private readonly pawR: THREE.Mesh
  private tailLag = 0

  constructor(materials: YarnMaterials) {
    super(materials)
    this.piece(foxBody(), this.body, 0, 0, 0)
    this.head = this.piece(foxHead(), this.body, 0, 19, 0.6)
    this.earL = this.piece(foxEar(), this.head, -3.4, 4.6, -0.4)
    this.earR = this.piece(foxEar(), this.head, 3.4, 4.6, -0.4)
    this.tailBase = this.piece(foxTailBase(), this.body, 0, 3.6, -5.8)
    this.tailTip = this.piece(foxTailTip(), this.tailBase, 0, 8.2, 0)
    this.pawL = this.piece(foxPaw(), this.root, -2.6, 0, 4.2)
    this.pawR = this.piece(foxPaw(), this.root, 2.6, 0, 4.2)
    this.neck.position.set(0, 13.3, 0.3)
    this.face(this.head, eyes('fox', 2.5, 5.7, 0.9), 1.1, 6, 3.8, [0, -2.2, 10.2])
  }

  update(actor: ActorView, m: Moment): void {
    const { t, dt } = m
    const cold = this.coldness(actor, m)
    const reach = Math.max(0, actor.reach.x)
    let x = actor.x
    let z = actor.z
    let lift = 0
    let spin = 0
    let pitch = 0
    let stream = 0
    let pawSwing = 0
    let crouch = 0

    // Gait: a level trot, paws ticking fast, tail streaming out behind.
    if (actor.walking && t >= actor.walkT0) {
      const k = smooth(actor.walkProgress) * 0.3 + actor.walkProgress * 0.7
      x = actor.walkFrom.x + (actor.walkTo.x - actor.walkFrom.x) * k
      z = actor.walkFrom.z + (actor.walkTo.z - actor.walkFrom.z) * k
      const phase = (t - actor.walkT0) * 3.3
      lift = Math.abs(Math.sin(phase * Math.PI)) * 0.45
      pawSwing = Math.sin(phase * Math.PI)
      stream = 1
      this.footfall(Math.floor(phase * 2), 0.25, m)
    } else this.stepIndex = -1

    // Dance: chases its own tail round and round, then pounces on an imaginary mouse.
    const danceAge = t - actor.danceAt
    const dancing = danceAge >= 0 && danceAge < actor.danceLength
    if (dancing) {
      const d = danceAge / actor.danceLength
      const chase = clamp01(d / 0.58)
      spin = -(chase * chase * (3 - 2 * chase)) * TAU * 1.5
      stream = Math.sin(chase * Math.PI) * 1.3
      if (d > 0.62) {
        const f = clamp01((d - 0.62) / 0.34)
        crouch = f < 0.25 ? Math.sin((f / 0.25) * Math.PI * 0.5) * 2 : 0
        lift = f < 0.25 ? 0 : Math.sin(((f - 0.25) / 0.75) * Math.PI) * 6.5
        pitch = f < 0.25 ? -0.15 : Math.sin(((f - 0.25) / 0.75) * Math.PI) * 0.4 * (f > 0.6 ? 1.6 : 0.4)
      }
    }

    const pose = this.direct(actor, m, dancing)

    // Hoping: crouched low, back end wiggling like before a pounce.
    crouch = Math.max(crouch, reach * 1.2)
    const wiggle = wave(t, 3) * 0.13 * reach
    this.shownYaw = turn(this.shownYaw, actor.yaw, 7, dt)
    this.root.position.set(x, groundY(x, z), z)
    this.root.rotation.y = this.shownYaw + spin + wiggle + pose.twist
    this.body.position.set(0, lift - crouch + pose.lift, 0)
    this.body.rotation.set(pitch + 0.1 * cold + pose.lean, 0, wave(t, 14) * 0.025 * cold + pose.roll)
    const wide = 1 + pose.squash * 0.5
    this.body.scale.set(wide, (1 - pose.squash) * (1 - 0.05 * cold) - crouch * 0.03, wide)
    this.head.rotation.set(0.2 * cold - 0.1 * reach + pitch * 0.6 + pose.headPitch, this.look(x, z, m) + pose.headYaw, pose.headRoll)
    this.head.position.y = 19 - 0.8 * cold
    const flat = cold
    this.earL.rotation.set(-flat + reach * 0.3 - pose.earL, wave(t, 0.9) * 0.22, 0.12 + flat * 0.4)
    this.earR.rotation.set(-flat + reach * 0.3 - pose.earR, wave(t, 0.9, 2) * 0.22, -0.12 - flat * 0.4)

    // Tail: swishing with the director, wrapped round the paws when cold, streaming when moving; the tip follows late.
    this.tailLag = approach(this.tailLag, pose.tail, 4, dt)
    const wrap = cold * 2.3
    this.tailBase.rotation.set(-0.7 - stream * 0.9 + cold * 0.6 - reach * 0.5, pose.tail + wrap, 0)
    this.tailTip.rotation.set(0.4 - stream * 0.3 + cold * 0.3, this.tailLag * 1.4 + wrap * 0.35, 0)
    this.pawL.position.set(-2.6, pose.armL * 1.2, 4.2 + pawSwing * 1.4)
    this.pawR.position.set(2.6, pose.armR * 1.2, 4.2 - pawSwing * 1.4)
    this.pawL.rotation.x = pawSwing * 0.3 - reach * 0.8 - pose.armL * 0.6
    this.pawR.rotation.x = -pawSwing * 0.3 - reach * 0.8 - pose.armR * 0.6
    this.breathe(this.head, actor, m, cold)
  }
}

// --- the bear: big, slow and heavy; lumbers with thumping steps -------------------

const bearBody = () =>
  once('bear-body', () => {
    const fur = new THREE.Color(PALETTE.bear)
    const light = new THREE.Color(PALETTE.bearLight)
    const belly: ColorFn = (p, n) => (n.z > 0.45 && p.y > 3 && p.y < 13.5 ? light : fur)
    return part(egg(9.6, 17.5, 1.3, 0.35, 24), { color: belly, ground: 0 })
  })
const bearHead = () =>
  once('bear-head', () =>
    merge([
      part(ball(8, 1.3, 22), { color: PALETTE.bear, scale: [1.08, 0.95, 1] }),
      part(ball(2.8, 1, 12), { color: PALETTE.bear, at: [-5.8, 5.6, -0.6], scale: [1, 1, 0.6] }),
      part(ball(2.8, 1, 12), { color: PALETTE.bear, at: [5.8, 5.6, -0.6], scale: [1, 1, 0.6] }),
      part(ball(1.6, 0.8, 10), { color: PALETTE.bearLight, at: [-5.8, 5.6, 0.9], scale: [1, 1, 0.3] }),
      part(ball(1.6, 0.8, 10), { color: PALETTE.bearLight, at: [5.8, 5.6, 0.9], scale: [1, 1, 0.3] }),
      part(ball(3.3, 1, 14), { color: PALETTE.bearLight, at: [0, -2, 6.6], scale: [1.15, 0.82, 0.8] }),
      part(ball(1.05, 0.6, 10), { color: PALETTE.nose, at: [0, -1, 9.1], scale: [1.3, 0.9, 0.9], bead: true }),
      part(ball(1.5, 0.8, 10), { color: PALETTE.bear, at: [-5, -2, 5.4], scale: [1, 0.7, 0.45], blush: true }),
      part(ball(1.5, 0.8, 10), { color: PALETTE.bear, at: [5, -2, 5.4], scale: [1, 0.7, 0.45], blush: true }),
    ]),
  )
const bearArm = () => once('bear-arm', () => part(capsule(2.4, 6, 1.1), { color: PALETTE.bear, at: [0, -3.8, 0] }))
const bearFoot = () =>
  once('bear-foot', () =>
    merge([
      part(ball(3.3, 1, 14), { color: PALETTE.bear, at: [0, 1.5, 1.2], scale: [1, 0.55, 1.3], ground: 0 }),
      part(ball(1.7, 0.8, 10), { color: PALETTE.bearLight, at: [0, 1.4, 4.9], scale: [1, 0.85, 0.3] }),
    ]),
  )

/** When in the dance each big stomp lands: left foot, then right. */
const STOMPS = [0.42, 0.6]

export class Bear extends Amigurumi {
  readonly animal = 'bear'
  readonly neckRadius = 7.6
  readonly band = 5.8
  readonly drape = 0.3
  protected readonly breathEvery = 3.4
  protected readonly director = new MotionDirector('bear', 53)
  private readonly head: THREE.Mesh
  private readonly armL: THREE.Mesh
  private readonly armR: THREE.Mesh
  private readonly footL: THREE.Mesh
  private readonly footR: THREE.Mesh
  private jiggle = 0

  constructor(materials: YarnMaterials) {
    super(materials)
    this.piece(bearBody(), this.body, 0, 0, 0)
    this.head = this.piece(bearHead(), this.body, 0, 23.4, 0.5)
    this.armL = this.piece(bearArm(), this.body, -8.2, 14.2, 1)
    this.armR = this.piece(bearArm(), this.body, 8.2, 14.2, 1)
    this.footL = this.piece(bearFoot(), this.root, -4.4, 0, 2.6)
    this.footR = this.piece(bearFoot(), this.root, 4.4, 0, 2.6)
    this.neck.position.set(0, 16.6, 0.4)
    this.face(this.head, eyes('bear', 2.9, 7, 0.95), 1.3, 7.2, 4.7, [0, -2.8, 9.4])
  }

  update(actor: ActorView, m: Moment): void {
    const { t, dt } = m
    const cold = this.coldness(actor, m)
    const reach = Math.max(0, actor.reach.x)
    let x = actor.x
    let z = actor.z
    let sway = 0
    let dip = 0
    let liftL = 0
    let liftR = 0
    let armsUp = 0
    let hug = 0
    let stompSquash = 0

    // Gait: a slow lumber, swaying onto each heavy foot; the body dips at every thump.
    if (actor.walking && t >= actor.walkT0) {
      const distance = Math.hypot(actor.walkTo.x - actor.walkFrom.x, actor.walkTo.z - actor.walkFrom.z)
      const steps = Math.max(3, Math.round(distance / 6.5))
      const along = actor.walkProgress * steps
      const index = Math.min(steps - 1, Math.floor(along))
      const f = actor.walkProgress >= 1 ? 1 : along - index
      const k = (index + f * f * (3 - 2 * f) * 0.6 + f * 0.4) / steps
      x = actor.walkFrom.x + (actor.walkTo.x - actor.walkFrom.x) * k
      z = actor.walkFrom.z + (actor.walkTo.z - actor.walkFrom.z) * k
      const side = index % 2 === 0 ? 1 : -1
      sway = side * Math.sin(f * Math.PI) * 0.1
      dip = f > 0.85 ? Math.sin(((f - 0.85) / 0.15) * Math.PI) * 0.9 : 0
      if (side > 0) liftL = Math.sin(f * Math.PI) * 2
      else liftR = Math.sin(f * Math.PI) * 2
      this.footfall(index + (f > 0.88 ? 1 : 0), 1, m)
    } else this.stepIndex = -1

    // Dance: arms up and swaying, two big stomps, a belly jiggle, then a hug for itself.
    const danceAge = t - actor.danceAt
    const dancing = danceAge >= 0 && danceAge < actor.danceLength
    if (dancing) {
      const d = danceAge / actor.danceLength
      armsUp = d < 0.78 ? Math.min(1, d / 0.12) : Math.max(0, 1 - (d - 0.78) / 0.08)
      sway = wave(danceAge, 0.8) * 0.13 * armsUp
      for (let i = 0; i < STOMPS.length; i++) {
        const f = (d - STOMPS[i]) / 0.12
        if (f >= 0 && f < 1) {
          const lift = Math.sin(Math.min(1, f / 0.7) * Math.PI) * 3
          if (i === 0) liftL = lift
          else liftR = lift
          if (f > 0.7) stompSquash = Math.sin(((f - 0.7) / 0.3) * Math.PI)
        }
      }
      hug = d > 0.8 ? Math.min(1, (d - 0.8) / 0.1) : 0
    }
    if (stompSquash > 0.9 && this.jiggle < 0.3) m.step(this.animal, 1)
    this.jiggle = Math.max(this.jiggle * Math.exp(-dt * 2.5), stompSquash)

    const pose = this.direct(actor, m, dancing)

    // Hoping: a big hopeful breath in, arms rising.
    this.shownYaw = turn(this.shownYaw, actor.yaw, 2.5, dt)
    this.root.position.set(x, groundY(x, z), z)
    this.root.rotation.y = this.shownYaw + pose.twist
    const inhale = reach * 0.07
    const jig = wave(t, 6) * this.jiggle * 0.05
    this.body.position.set(0, -dip - stompSquash * 0.8 + pose.lift, 0)
    const wide = 1 + pose.squash * 0.5 + jig
    this.body.scale.set(wide, (1 - pose.squash) * (1 + inhale - 0.05 * cold) - stompSquash * 0.07 - jig, wide)
    this.body.rotation.set(0.1 * cold + pose.lean, 0, sway + pose.roll + wave(t, 5) * 0.02 * cold)
    this.head.rotation.set(0.2 * cold - 0.2 * reach + pose.headPitch, this.look(x, z, m) + pose.headYaw, hug * 0.18 + sway * 0.4 + pose.headRoll)
    this.head.position.y = 23.4 - 1 * cold

    // Arms: rubbing each other when cold, rising when hoping, up when dancing, hugging at the end.
    const rub = cold * (1 - reach)
    const rubbing = wave(t, 2) * 0.28 * rub
    const raise = Math.max(armsUp * 2.7, reach * 1.9)
    const across = Math.max(rub * 0.5, hug * 0.7) + pose.hug * 0.6
    this.armL.rotation.set(-0.9 * rub + rubbing - raise - hug * 0.9 - pose.armL, 0, -0.12 + across - armsUp * 0.35 - pose.armL * 0.3 + wave(t, 0.3) * 0.04)
    this.armR.rotation.set(-0.9 * rub - rubbing - raise - hug * 0.9 - pose.armR, 0, 0.12 - across + armsUp * 0.35 + pose.armR * 0.3 - wave(t, 0.3) * 0.04)
    this.footL.position.y = liftL
    this.footR.position.y = liftR
    this.breathe(this.head, actor, m, cold)
  }
}

export type Animal = Bunny | Penguin | Fox | Bear

export function buildAnimals(materials: YarnMaterials): Record<AnimalKey, Animal> {
  return { bunny: new Bunny(materials), penguin: new Penguin(materials), fox: new Fox(materials), bear: new Bear(materials) }
}

/** Where an animal's neck frame is in the world (for the flight target), without allocating. */
export function neckWorld(animal: Animal, out: THREE.Vector3): THREE.Vector3 {
  return out.setFromMatrixPosition(animal.neck.matrixWorld)
}
