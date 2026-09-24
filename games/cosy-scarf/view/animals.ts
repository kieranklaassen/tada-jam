import * as THREE from 'three'
import type { ActorView } from '../controller'
import { blanketHem, restHeight, standY } from '../ground'
import { BLANKET, LOOM } from '../layout'
import { emptyPose, MotionDirector, type Pose } from '../motion'
import { clamp01, smooth } from '../springs'
import type { AnimalKey } from '../state'
import { ball, beadEye, capsule, cone, egg, eggProfile, merge, once, part, type ColorFn } from './shapes'
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

// --- standing on the ground ------------------------------------------------------
// An animal rests on what is drawn under it (snow, or the blanket and its
// ribbed hem): its root goes as low as it can with none of the places it
// stands on (its body's underside, its feet) sunk in. Hops and steps lift
// from there.

/** A rounded foot lying flat: its middle (in its own mesh) and its half-sizes. */
type FootShape = { at: readonly [number, number, number]; size: readonly [number, number, number] }
/**
 * Where a rounded foot is felt for the ground: its lowest point, then rings (fractions of its half-size out from it), `around` to a ring.
 * Three numbers a spot: across, forward, and how far up its half-height it stays below the middle.
 */
function footSpots(rings: readonly number[], around: number): Float64Array {
  const spots = [0, 0, 1]
  rings.forEach((r, ring) => {
    for (let k = 0; k < around; k++) {
      const a = ((k + (ring % 2) * 0.5) / around) * TAU
      spots.push(Math.cos(a) * r, Math.sin(a) * r, Math.sqrt(1 - r * r))
    }
  })
  return Float64Array.from(spots)
}
/** The cosine then the sine of `count` even turns round a circle. */
function circle(count: number): Float64Array {
  const turns = new Float64Array(2 * count)
  for (let k = 0; k < count; k++) {
    turns[2 * k] = Math.cos((k / count) * TAU)
    turns[2 * k + 1] = Math.sin((k / count) * TAU)
  }
  return turns
}
/** Snow and the flat of the blanket are gentle underfoot; across the blanket's narrow rib the ground is felt far more finely. */
const FOOT_SPOTS = footSpots([0.3, 0.55, 0.75, 0.9], 8)
const FOOT_SPOTS_ON_HEM = footSpots([0.15, 0.3, 0.45, 0.6, 0.75, 0.9], 12)
/** The body's egg is felt this many rows up from its bottom, round each row; across the rib, between rows too (its lathe runs straight between them). */
const UNDERSIDE_ROWS = 4
const UNDERSIDE_AROUND = circle(12)
const UNDERSIDE_AROUND_ON_HEM = circle(24)
const UNDERSIDE_SPLIT_ON_HEM = 3
/** Nothing rests quite flush, so rounding never reads as sinking. */
const REST_GAP = 0.02
/** The most places an animal stands on: its body across the rib, and four feet (the bear's feet and toes). */
const MAX_SOLES = 1 + (UNDERSIDE_ROWS * UNDERSIDE_SPLIT_ON_HEM * UNDERSIDE_AROUND_ON_HEM.length) / 2 + (4 * FOOT_SPOTS_ON_HEM.length) / 3

const footShape = (radius: number, at: [number, number, number], scale: [number, number, number]): FootShape => ({ at, size: [radius * scale[0], radius * scale[1], radius * scale[2]] })
const undersideOf = (radius: number, height: number, bottomFlat: number) => eggProfile(radius, height, bottomFlat).slice(0, UNDERSIDE_ROWS + 1)

// --- limbs sewn onto the body ------------------------------------------------------
// An arm, a flipper or a paw is sewn on at its shoulder, the middle of its
// rounded top, and turns about it, so the seam sinks in the same however it
// turns. The rest of it lies against the body, never deeper in than the seam:
// turned toward the body, it stops where it meets it.

/** A body egg's outline: how deep a point in its frame lies inside it, to its nearest edge across the lathe (below zero outside). */
export class EggOutline {
  private readonly rows: readonly THREE.Vector2[]

  constructor(radius: number, height: number, bottomFlat: number) {
    this.rows = eggProfile(radius, height, bottomFlat)
  }

  depth(x: number, y: number, z: number): number {
    const rows = this.rows
    const across = Math.hypot(x, z)
    let near = Infinity
    let inside = false
    for (let i = 1; i < rows.length; i++) {
      const a = rows[i - 1]
      const b = rows[i]
      const dx = b.x - a.x
      const dy = b.y - a.y
      const f = clamp01(((across - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy))
      near = Math.min(near, Math.hypot(across - a.x - f * dx, y - a.y - f * dy))
      if (y >= a.y && y < b.y) inside = across < a.x + ((y - a.y) / dy) * dx
    }
    return inside ? near : -near
  }
}

/** Forward turns at which a shoulder knows how far out its limb must turn. */
const SHOULDER_STEPS = 96

/**
 * A shoulder on the right of the body (mirrored for the left): for each turn
 * forward (about x), how far out (about z) the limb hanging `length` down from
 * it must at least be turned so no part of it lies deeper in the body than the
 * shoulder itself. Worked out once; a lookup a frame.
 */
class Shoulder {
  private readonly least = new Float32Array(SHOULDER_STEPS + 1)

  constructor(outline: EggOutline, x: number, y: number, z: number, length: number) {
    const seam = outline.depth(x, y, z)
    const deepest = (rx: number, rz: number) => {
      let deep = -Infinity
      for (let k = 1; k <= 4; k++) {
        const s = (-length * k) / 4
        deep = Math.max(deep, outline.depth(x - s * Math.sin(rz), y + s * Math.cos(rz) * Math.cos(rx), z + s * Math.cos(rz) * Math.sin(rx)))
      }
      return deep
    }
    for (let i = 0; i <= SHOULDER_STEPS; i++) {
      const rx = -Math.PI + (i / SHOULDER_STEPS) * TAU
      let low = -Math.PI / 2
      let high = Math.PI / 2
      if (deepest(rx, low) <= seam) high = low
      for (let step = 0; step < 24 && high - low > 1e-4; step++) {
        const mid = (low + high) / 2
        if (deepest(rx, mid) <= seam) high = mid
        else low = mid
      }
      this.least[i] = high
    }
  }

  /** The least outward turn for a limb turned `rx` forward. */
  out(rx: number): number {
    const f = ((((rx + Math.PI) / TAU) % 1) + 1) % 1
    const at = f * SHOULDER_STEPS
    const i = Math.floor(at)
    return this.least[i] + (this.least[i + 1] - this.least[i]) * (at - i)
  }

  /** A right-hand limb's turn out, no less than it must be. */
  right(rx: number, rz: number): number {
    return Math.max(rz, this.out(rx))
  }

  /** A left-hand limb's turn out (the mirror), no less than it must be. */
  left(rx: number, rz: number): number {
    return Math.min(rz, -this.out(rx))
  }
}

/** Lifts at which a step knows how far out from under the belly its foot must move. */
const STEP_LIFTS = 24

/**
 * A foot tucked under the belly on the right (mirrored for the left), lifted
 * to step or stamp: for each lift up to `most`, how far it moves out from
 * under the belly (along the line from the body's middle through where it is
 * sewn on) so no part of it lies deeper in the body than when it stands.
 * `tilt` turns its toe up as it lifts (radians a unit). Worked out once; a lookup a frame.
 */
class Step {
  private readonly shift = new Float32Array(STEP_LIFTS + 1)
  private readonly most: number
  readonly outX: number
  readonly outZ: number

  constructor(outline: EggOutline, shapes: readonly FootShape[], x: number, z: number, most: number, tilt = 0) {
    this.most = most
    const across = Math.hypot(x, z)
    this.outX = x / across
    this.outZ = z / across
    const points: THREE.Vector3[] = []
    for (const { at, size } of shapes) {
      for (let i = 0; i <= 8; i++) {
        const polar = (i / 8) * Math.PI
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * TAU
          points.push(new THREE.Vector3(at[0] + size[0] * Math.sin(polar) * Math.cos(a), at[1] + size[1] * Math.cos(polar), at[2] + size[2] * Math.sin(polar) * Math.sin(a)))
        }
      }
    }
    const deepest = (lift: number, out: number) => {
      const c = Math.cos(-lift * tilt)
      const s = Math.sin(-lift * tilt)
      let deep = -Infinity
      for (const p of points) deep = Math.max(deep, outline.depth(x + p.x + out * this.outX, lift + p.y * c - p.z * s, z + p.y * s + p.z * c + out * this.outZ))
      return deep
    }
    const standing = deepest(0, 0)
    for (let i = 1; i <= STEP_LIFTS; i++) {
      const lift = (i / STEP_LIFTS) * most
      let low = this.shift[i - 1]
      let high = low + most * 2
      for (let step = 0; step < 24 && high - low > 1e-4; step++) {
        const mid = (low + high) / 2
        if (deepest(lift, mid) <= standing) high = mid
        else low = mid
      }
      this.shift[i] = deepest(lift, low) <= standing ? low : high
    }
  }

  /** How far out a foot lifted `lift` moves. */
  out(lift: number): number {
    const at = clamp01(lift / this.most) * STEP_LIFTS
    const i = Math.min(STEP_LIFTS - 1, Math.floor(at))
    return this.shift[i] + (this.shift[i + 1] - this.shift[i]) * (at - i)
  }
}

/** Where lumps of snow slide over the cap's rim: [angle round the head, size, how far down]. */
const DRIPS: [number, number, number][] = [
  [-0.75, 0.3, 0.22],
  [0.4, 0.26, 0.3],
  [1.5, 0.22, 0.12],
  [-2.2, 0.24, 0.16],
]

/** One lump of a snow heap: a ball this big, squashed by `scale`, at `at`. */
export type SnowLump = { at: [number, number, number]; radius: number; scale: [number, number, number]; segments: number; underside?: number }

/** The lumps of a snow heap `depth` as deep front to back as it is wide: a dome, two heaps on it and drips over its rim. */
export function snowLumps(radius: number, depth: number): SnowLump[] {
  return [
    { at: [0, 0, 0], radius, scale: [1, 0.55, 0.95 * depth], segments: 14, underside: 0.06 },
    { at: [radius * 0.3, radius * 0.38, radius * 0.1 * depth], radius: radius * 0.58, scale: [1, 1, depth], segments: 10 },
    { at: [-radius * 0.42, radius * 0.28, -radius * 0.15 * depth], radius: radius * 0.42, scale: [1, 1, depth], segments: 10 },
    ...DRIPS.map(([angle, size, drop]): SnowLump => ({ at: [Math.sin(angle) * radius * 0.88, -radius * drop, Math.cos(angle) * radius * 0.82 * depth], radius: radius * size, scale: [1, 1, depth], segments: 8, underside: 0.06 })),
  ]
}

/** A heap of crocheted snow, lumpy with drips over its rim: a smooth even disc reads as a beret. */
const snowCap = (radius: number, depth: number) =>
  once(`snow-cap-${radius}-${depth}`, () =>
    merge(snowLumps(radius, depth).map((lump) => part(ball(lump.radius, 0.8, lump.segments), { color: PALETTE.snow, at: lump.at, scale: lump.scale, underside: lump.underside }))),
  )

/**
 * Where the snow heaps on each head, in the head's frame: its centre, radius,
 * depth (front to back, against its width) and how far it tips forward to lie
 * along the brow. The bunny's and the fox's sit on the brow in front of their
 * ears, which are sewn in across the crown, and those ears tip forward no
 * further than `earsForward` while it is on.
 */
export type SnowSeat = { y: number; z: number; radius: number; depth: number; tilt: number; earsForward: number }
export const SNOW_SEATS: Record<AnimalKey, SnowSeat> = {
  bunny: { y: 5.05, z: 4, radius: 3.3, depth: 0.6, tilt: 0.3, earsForward: 0.55 },
  penguin: { y: 6.6, z: -0.4, radius: 4.4, depth: 1, tilt: 0, earsForward: Infinity },
  fox: { y: 5.08, z: 3.5, radius: 3.8, depth: 0.6, tilt: 0.3, earsForward: 0.95 },
  bear: { y: 7.2, z: -0.4, radius: 4.7, depth: 1, tilt: 0, earsForward: Infinity },
}
/** How far the snow rises as it pops off, along its own tipped up. */
const SNOW_RISE = 5

/** How far the snow has melted off as the scarf warms the animal: 0 on, 1 gone (hidden from 0.99). */
export const snowMelt = (warm: number): number => smooth(clamp01(warm / 0.6))

/** Lifts and shrinks the snow as it melts, popping it off along its tipped up. */
export function seatSnow(cap: THREE.Object3D, seat: SnowSeat, melt: number): void {
  const rise = melt * SNOW_RISE
  cap.position.set(0, seat.y + rise * Math.cos(seat.tilt), seat.z + rise * Math.sin(seat.tilt))
  cap.rotation.set(seat.tilt, 0, 0)
  cap.scale.setScalar(1 - melt * 0.8)
  cap.visible = melt < 0.99
}
/** How far forward ears may tip once the snow has gone: further than any pose takes them. */
const EARS_FREE = Math.PI

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
  private earLimit = EARS_FREE
  private lastWarm = -1
  private breathAt = 0
  private breaths = 0
  private seenTap = Number.NEGATIVE_INFINITY
  private seenRow = Number.NEGATIVE_INFINITY
  private seenHum = Number.NEGATIVE_INFINITY
  private readonly mouthAt = new THREE.Vector3()
  private readonly scratch = new THREE.Vector3()
  /** The body egg's outline near its bottom, where it can meet the ground. */
  protected abstract readonly underside: readonly THREE.Vector2[]
  /** How high the head sits on the body: a body pushed down squashes about its base instead, so the head drops as far. */
  protected abstract readonly headHeight: number
  /** The places it stands on this frame, three numbers each: gathered in the body's frame, then laid over the ground (across, how high above the root, along). */
  private readonly soles = new Float64Array(3 * MAX_SOLES)
  /** How many of `soles`' numbers are this frame's. */
  private soleEnd = 0
  /** Where the root stands, and how it is turned, while its soles are felt. */
  private standX = 0
  private standZ = 0
  private standCos = 1
  private standSin = 0

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
  protected face(head: THREE.Object3D, eyeGeometry: THREE.BufferGeometry, eyeY: number, mouth: [number, number, number]): void {
    this.eyeMesh = this.piece(eyeGeometry, head, 0, eyeY, 0)
    this.eyeMesh.name = 'eyes'
    const seat = SNOW_SEATS[this.animal]
    this.cap = this.piece(snowCap(seat.radius, seat.depth), head, 0, 0, 0, this.snow)
    this.cap.name = 'snow-cap'
    seatSnow(this.cap, seat, 0)
    this.mouthAt.set(...mouth)
  }

  /** How far forward the ears may tip now: behind the snow while it is on, easing free once it has popped off. */
  protected earRoom(actor: ActorView, dt: number): number {
    const seat = SNOW_SEATS[this.animal]
    this.earLimit = snowMelt(actor.warm) < 0.99 ? seat.earsForward : approach(this.earLimit, EARS_FREE, 5, dt)
    return this.earLimit
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
      seatSnow(cap, SNOW_SEATS[this.animal], snowMelt(actor.warm))
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

  protected nameParts(parts: Record<string, THREE.Object3D>): void {
    for (const [name, part] of Object.entries(parts)) part.name = name
  }

  /** The places its feet stand on this frame, in the body's frame (steps left out). */
  protected abstract feetSoles(): void

  /**
   * Stand the animal at (x, z), turned as its root already is, on the ground
   * drawn there: as low as it goes with no sole sunk in. The body's own lift
   * stays on top; a body pushed below its base squashes down about it instead.
   */
  protected settle(x: number, z: number): void {
    const body = this.body
    if (body.position.y < 0) {
      body.scale.y *= 1 + body.position.y / this.headHeight
      body.position.y = 0
    }
    const yaw = this.root.rotation.y
    this.standX = x
    this.standZ = z
    this.standCos = Math.cos(yaw)
    this.standSin = Math.sin(yaw)
    this.soleEnd = 0
    this.bodySoles()
    this.feetSoles()
    this.layOverGround()
    this.root.position.set(x, restHeight(this.soles, this.soleEnd / 3) + REST_GAP, z)
  }

  /** Every sole from the body's frame into the root's, squashed, widened and tipped as the body is (its lift left out), and laid over the ground where the root stands. */
  private layOverGround(): void {
    const { position, rotation, scale } = this.body
    const wide = scale.x
    const tall = scale.y
    const deep = scale.z
    const bodyX = position.x
    const bodyZ = position.z
    const leanCos = Math.cos(rotation.x)
    const leanSin = Math.sin(rotation.x)
    const rollCos = Math.cos(rotation.z)
    const rollSin = Math.sin(rotation.z)
    const x0 = this.standX
    const z0 = this.standZ
    const c = this.standCos
    const s = this.standSin
    const soles = this.soles
    const end = this.soleEnd
    for (let i = 0; i < end; i += 3) {
      const sx = soles[i] * wide
      const sy = soles[i + 1] * tall
      const sz = soles[i + 2] * deep
      const x1 = sx * rollCos - sy * rollSin
      const y1 = sx * rollSin + sy * rollCos
      const px = bodyX + x1
      const pz = bodyZ + y1 * leanSin + sz * leanCos
      soles[i] = x0 + px * c + pz * s
      soles[i + 1] = y1 * leanCos - sz * leanSin
      soles[i + 2] = z0 - px * s + pz * c
    }
  }

  /** Whether anything within `reach` of (x, z) in the root's frame comes near the blanket's ribbed hem. */
  private nearHem(x: number, z: number, reach: number): boolean {
    const c = this.standCos
    const s = this.standSin
    const d = blanketHem(this.standX + x * c + z * s, this.standZ - x * s + z * c)
    return d > -reach && d < BLANKET.rib + reach
  }

  /** The body egg's underside, in the body's frame. */
  private bodySoles(): void {
    const { position, scale } = this.body
    const rows = this.underside
    const hem = this.nearHem(position.x, position.z, rows[rows.length - 1].x * Math.max(scale.x, scale.z) + 1)
    const around = hem ? UNDERSIDE_AROUND_ON_HEM : UNDERSIDE_AROUND
    const split = hem ? UNDERSIDE_SPLIT_ON_HEM : 1
    const soles = this.soles
    let at = this.soleEnd
    soles[at++] = 0
    soles[at++] = rows[0].y
    soles[at++] = 0
    for (let row = 1; row < rows.length; row++) {
      for (let part = 1; part <= split; part++) {
        const f = part / split
        const r = rows[row - 1].x + (rows[row].x - rows[row - 1].x) * f
        const h = rows[row - 1].y + (rows[row].y - rows[row - 1].y) * f
        for (let k = 0; k < around.length; k += 2) {
          soles[at++] = around[k] * r
          soles[at++] = h
          soles[at++] = around[k + 1] * r
        }
      }
    }
    this.soleEnd = at
  }

  /** A rounded foot whose mesh sits at (x, y, z) in the body's frame (mirrored left to right for `side` -1), felt where it can touch down. */
  protected footSoles(foot: FootShape, x: number, y: number, z: number, side = 1): void {
    const { at: middle, size } = foot
    const rx = size[0]
    const ry = size[1]
    const rz = size[2]
    const cx = x + side * middle[0]
    const cy = y + middle[1]
    const cz = z + middle[2]
    const spots = this.nearHem(cx, cz, Math.max(rx, rz) + 1) ? FOOT_SPOTS_ON_HEM : FOOT_SPOTS
    const soles = this.soles
    let at = this.soleEnd
    for (let i = 0; i < spots.length; i += 3) {
      soles[at++] = cx + spots[i] * rx
      soles[at++] = cy - ry * spots[i + 2]
      soles[at++] = cz + spots[i + 1] * rz
    }
    this.soleEnd = at
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

const BUNNY_EGG = [7.2, 14, 0.35] as const
const BUNNY_FOOT = footShape(2.5, [3.1, 1.2, 3.2], [1, 0.55, 1.5])
/** An arm is a capsule hanging `length` below the middle of its rounded top, which is sewn on here. */
const BUNNY_ARM = { radius: 1.5, length: 3.4, shoulder: [5.6, 10, 1.6] as const }
const bunnyShoulder = () => once('bunny-shoulder', () => new Shoulder(new EggOutline(...BUNNY_EGG), ...BUNNY_ARM.shoulder, BUNNY_ARM.length))

const bunnyBody = () =>
  once('bunny-body', () => {
    const fur = new THREE.Color(PALETTE.bunny)
    const cream = new THREE.Color(PALETTE.bunnyLight)
    const belly: ColorFn = (p, n) => (n.z > 0.5 && p.y > 2.5 && p.y < 11 ? cream : fur)
    return merge([
      part(egg(BUNNY_EGG[0], BUNNY_EGG[1], 1.1, BUNNY_EGG[2]), { color: belly, ground: 0 }),
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
/** A bunny ear: a long capsule up from where it is sewn on, lined in front with a flatter one. */
export const BUNNY_EAR = { radius: 1.9, length: 7.5, y: 5.6, lining: { radius: 1.05, length: 5.8, y: 5.8, z: 1.3, depth: 0.45 } }
const bunnyEar = () =>
  once('bunny-ear', () => {
    const { lining } = BUNNY_EAR
    return merge([
      part(capsule(BUNNY_EAR.radius, BUNNY_EAR.length, 0.9), { color: PALETTE.bunny, at: [0, BUNNY_EAR.y, 0] }),
      part(capsule(lining.radius, lining.length, 0.7), { color: PALETTE.bunnyInner, at: [0, lining.y, lining.z], scale: [1, 1, lining.depth] }),
    ])
  })
const bunnyArm = () => once('bunny-arm', () => part(capsule(BUNNY_ARM.radius, BUNNY_ARM.length, 0.8), { color: PALETTE.bunny, at: [0, -BUNNY_ARM.length / 2, 0] }))
const bunnyFeet = () =>
  once('bunny-feet', () =>
    merge([
      part(ball(2.5, 0.8, 12), { color: PALETTE.bunnyLight, at: [-BUNNY_FOOT.at[0], BUNNY_FOOT.at[1], BUNNY_FOOT.at[2]], scale: [1, 0.55, 1.5], ground: 0 }),
      part(ball(2.5, 0.8, 12), { color: PALETTE.bunnyLight, at: [...BUNNY_FOOT.at], scale: [1, 0.55, 1.5], ground: 0 }),
    ]),
  )

export class Bunny extends Amigurumi {
  readonly animal = 'bunny'
  readonly neckRadius = 6.3
  readonly band = 5
  readonly drape = 0.16
  protected readonly breathEvery = 1.7
  protected readonly director = new MotionDirector('bunny', 11)
  protected readonly underside = undersideOf(...BUNNY_EGG)
  protected readonly headHeight = 19.6
  private readonly head: THREE.Mesh
  private readonly earL: THREE.Mesh
  private readonly earR: THREE.Mesh
  private readonly armL: THREE.Mesh
  private readonly armR: THREE.Mesh
  private readonly feet: THREE.Mesh
  private readonly shoulder = bunnyShoulder()

  constructor(materials: YarnMaterials) {
    super(materials)
    const [sx, sy, sz] = BUNNY_ARM.shoulder
    this.piece(bunnyBody(), this.body, 0, 0, 0).name = 'body'
    this.head = this.piece(bunnyHead(), this.body, 0, 19.6, 0.4)
    this.earL = this.piece(bunnyEar(), this.head, -2.5, 5.2, -0.6)
    this.earR = this.piece(bunnyEar(), this.head, 2.5, 5.2, -0.6)
    this.armL = this.piece(bunnyArm(), this.body, -sx, sy, sz)
    this.armR = this.piece(bunnyArm(), this.body, sx, sy, sz)
    this.feet = this.piece(bunnyFeet(), this.body, 0, 0, 0)
    this.nameParts({ head: this.head, 'ear-l': this.earL, 'ear-r': this.earR, 'arm-l': this.armL, 'arm-r': this.armR, feet: this.feet })
    this.neck.position.set(0, 13.9, 0.2)
    this.face(this.head, eyes('bunny', 2.6, 6.1, 0.95), 0.9, [0, -2.8, 6.8])
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
    const earRoom = this.earRoom(actor, dt)
    this.earL.rotation.set(Math.min(earRoom, -0.25 * droop - earBack - pose.earL), 0, 0.18 + earSplay + droop * 0.95)
    this.earR.rotation.set(Math.min(earRoom, -0.25 * droop - earBack - pose.earR), 0, -0.18 - earSplay - droop * 0.95)

    // Cold arms hug the belly; hoping arms reach up; raised arms swing forward and out.
    const hug = clamp01(cold * (1 - reach) + pose.hug)
    const up = Math.max(armsUp, reach * 2.3)
    const out = armsUp > 0 ? 0.5 : 0
    const forwardL = -1.2 * hug - up - pose.armL * 0.8
    const forwardR = -1.2 * hug - up - pose.armR * 0.8
    this.armL.rotation.set(forwardL, 0, this.shoulder.left(forwardL, -0.1 + 0.6 * hug - out - pose.armL * 0.6))
    this.armR.rotation.set(forwardR, 0, this.shoulder.right(forwardR, 0.1 - 0.6 * hug + out + pose.armR * 0.6))
    this.feet.position.z = -feetBack * 2
    this.feet.rotation.x = feetBack * 0.6
    this.settle(x, z)
    this.breathe(this.head, actor, m, cold)
  }

  protected feetSoles(): void {
    this.footSoles(BUNNY_FOOT, 0, 0, this.feet.position.z)
    this.footSoles(BUNNY_FOOT, 0, 0, this.feet.position.z, -1)
  }
}

// --- the penguin: slow and rocking; waddles with alternating feet ---------------

const PENGUIN_EGG = [9, 21, 0.3] as const
const PENGUIN_FOOT = footShape(2.4, [0, 0.7, 1.4], [1.1, 0.4, 1.6])
/** Where the feet are sewn on under the belly, how high a waddle lifts one, and how far its toe turns up a unit of lift. */
const PENGUIN_FEET = { x: 3, z: 3.6, lift: 1.3, tilt: 0.2 }
const penguinStep = () => once('penguin-step', () => new Step(new EggOutline(...PENGUIN_EGG), [PENGUIN_FOOT], PENGUIN_FEET.x, PENGUIN_FEET.z, PENGUIN_FEET.lift, PENGUIN_FEET.tilt))
const PENGUIN_FLIPPER = { radius: 1.7, length: 8, flat: 0.45, shoulder: [7.6, 14.5, 0.2] as const }
const penguinShoulder = () => once('penguin-shoulder', () => new Shoulder(new EggOutline(...PENGUIN_EGG), ...PENGUIN_FLIPPER.shoulder, PENGUIN_FLIPPER.length))
/** Straight out of the body at the right shoulder, across the lathe (x, y). */
const penguinShoulderNormal = () =>
  once('penguin-shoulder-normal', () => {
    const outline = new EggOutline(...PENGUIN_EGG)
    const [x, y, z] = PENGUIN_FLIPPER.shoulder
    const gx = outline.depth(x - 1e-3, y, z) - outline.depth(x + 1e-3, y, z)
    const gy = outline.depth(x, y - 1e-3, z) - outline.depth(x, y + 1e-3, z)
    const length = Math.hypot(gx, gy)
    return { x: gx / length, y: gy / length }
  })

const penguinBody = () =>
  once('penguin-body', () => {
    const navy = new THREE.Color(PALETTE.penguin)
    const cream = new THREE.Color(PALETTE.penguinBelly)
    const belly: ColorFn = (p, n) => (n.z > 0.32 && p.y > 1.2 && p.y < 17.5 && Math.abs(p.x) < 6.8 ? cream : navy)
    return part(egg(PENGUIN_EGG[0], PENGUIN_EGG[1], 1.2, PENGUIN_EGG[2], 24), { color: belly, ground: 0 })
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
const penguinFlipper = () =>
  once('penguin-flipper', () =>
    part(capsule(PENGUIN_FLIPPER.radius, PENGUIN_FLIPPER.length, 0.9), { color: PALETTE.penguin, at: [0, -PENGUIN_FLIPPER.length / 2, 0], scale: [PENGUIN_FLIPPER.flat, 1, 1] }),
  )
const penguinFoot = () => once('penguin-foot', () => part(ball(2.4, 0.7, 12), { color: PALETTE.beak, at: [...PENGUIN_FOOT.at], scale: [1.1, 0.4, 1.6], ground: 0 }))

export class Penguin extends Amigurumi {
  readonly animal = 'penguin'
  readonly neckRadius = 7.4
  readonly band = 5.4
  readonly drape = 0.24
  protected readonly breathEvery = 2.7
  protected readonly director = new MotionDirector('penguin', 23)
  protected readonly underside = undersideOf(...PENGUIN_EGG)
  protected readonly headHeight = 21.4
  private readonly head: THREE.Mesh
  private readonly flipperL: THREE.Mesh
  private readonly flipperR: THREE.Mesh
  private readonly footL: THREE.Mesh
  private readonly footR: THREE.Mesh
  private readonly shoulder = penguinShoulder()
  private readonly step = penguinStep()
  private readonly normal = penguinShoulderNormal()

  constructor(materials: YarnMaterials) {
    super(materials)
    const [sx, sy, sz] = PENGUIN_FLIPPER.shoulder
    this.piece(penguinBody(), this.body, 0, 0, 0).name = 'body'
    this.head = this.piece(penguinHead(), this.body, 0, 21.4, 0.3)
    this.flipperL = this.piece(penguinFlipper(), this.body, -sx, sy, sz)
    this.flipperR = this.piece(penguinFlipper(), this.body, sx, sy, sz)
    this.footL = this.piece(penguinFoot(), this.body, -PENGUIN_FEET.x, 0, PENGUIN_FEET.z)
    this.footR = this.piece(penguinFoot(), this.body, PENGUIN_FEET.x, 0, PENGUIN_FEET.z)
    this.nameParts({ head: this.head, 'flipper-l': this.flipperL, 'flipper-r': this.flipperR, 'foot-l': this.footL, 'foot-r': this.footR })
    this.neck.position.set(0, 16.2, 0.3)
    this.face(this.head, eyes('penguin', 2.2, 6.3, 0.9), 0.8, [0, -1.2, 9.6])
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
      // It rolls onto one foot and steps with the other.
      const side = index % 2 === 0 ? 1 : -1
      roll = side * Math.sin(f * Math.PI) * 0.24
      if (side > 0) liftR = Math.sin(f * Math.PI) * PENGUIN_FEET.lift
      else liftL = Math.sin(f * Math.PI) * PENGUIN_FEET.lift
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
    this.root.rotation.y = this.shownYaw + spin + pose.twist
    this.body.position.set(0, bounce + pose.lift, 0)
    this.body.rotation.set(0.12 * cold - 0.16 * reach + pose.lean, 0, roll + pose.roll + wave(t, 9) * 0.02 * cold)
    const wide = 1 + pose.squash * 0.5
    // Hunched in the cold: the whole body huddles down, the head only nestles into it.
    this.body.scale.set(wide, (1 - pose.squash) * (1 - 0.08 * cold), wide)
    this.head.rotation.set(0.18 * cold - 0.15 * reach + pose.headPitch, this.look(x, z, m) + pose.headYaw, -roll * 0.5 + pose.headRoll)
    this.head.position.y = 21.4 - 0.4 * cold
    const clamp = 0.06 + 0.16 * actor.warm - pose.hug * 0.12
    this.flap(this.flipperL, -1, this.shoulder.left(0, -(clamp + spread + reach + pose.armL)))
    this.flap(this.flipperR, 1, this.shoulder.right(0, clamp + spread + reach + pose.armR))
    // A lifted foot steps out from under the belly, never up into it.
    const outL = this.step.out(liftL)
    const outR = this.step.out(liftR)
    this.footL.position.set(-PENGUIN_FEET.x - outL * this.step.outX, liftL, PENGUIN_FEET.z + outL * this.step.outZ)
    this.footR.position.set(PENGUIN_FEET.x + outR * this.step.outX, liftR, PENGUIN_FEET.z + outR * this.step.outZ)
    this.footL.rotation.x = -liftL * PENGUIN_FEET.tilt
    this.footR.rotation.x = -liftR * PENGUIN_FEET.tilt
    this.settle(x, z)
    this.breathe(this.head, actor, m, cold)
  }

  /**
   * A flipper is flat: turned edge-on to the body, its rounded top reaches
   * further in than lying flat against it, so its shoulder slides out along
   * the body's normal by the difference and the seam sinks in the same.
   */
  private flap(flipper: THREE.Mesh, side: number, turn: number): void {
    const normal = this.normal
    const across = side * turn
    const edge = -normal.x * Math.cos(across) - normal.y * Math.sin(across)
    const along = normal.x * Math.sin(across) - normal.y * Math.cos(across)
    const flat = PENGUIN_FLIPPER.flat * PENGUIN_FLIPPER.radius
    const slide = Math.hypot(flat * edge, PENGUIN_FLIPPER.radius * along) - flat
    const [x, y, z] = PENGUIN_FLIPPER.shoulder
    flipper.position.set(side * (x + slide * normal.x), y + slide * normal.y, z)
    flipper.rotation.set(0, 0, turn)
  }

  protected feetSoles(): void {
    this.footSoles(PENGUIN_FOOT, this.footL.position.x, 0, this.footL.position.z)
    this.footSoles(PENGUIN_FOOT, this.footR.position.x, 0, this.footR.position.z)
  }
}

// --- the fox: smooth and sly; trots level with its tail streaming ------------------

const FOX_EGG = [7, 13.5, 0.35] as const
/** A paw is a capsule hanging `length` below its shoulder, just inside the belly: its lower end's round is what touches down. */
const FOX_PAW = { radius: 1.35, length: 1.4, shoulder: [2.6, 2, 4.2] as const }
const FOX_PAW_SOLE = footShape(FOX_PAW.radius, [0, 0, 0], [1, 1, 1])
const foxShoulder = () => once('fox-shoulder', () => new Shoulder(new EggOutline(...FOX_EGG), ...FOX_PAW.shoulder, FOX_PAW.length))

const foxBody = () =>
  once('fox-body', () => {
    const fur = new THREE.Color(PALETTE.fox)
    const cream = new THREE.Color(PALETTE.foxLight)
    const chest: ColorFn = (p, n) => (n.z > 0.5 && p.y > 4.5 ? cream : fur)
    return part(egg(FOX_EGG[0], FOX_EGG[1], 1.1, FOX_EGG[2]), { color: chest, ground: 0 })
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
/** A fox ear: a cone flattened front to back, standing up from where it is sewn on. */
export const FOX_EAR = { radius: 2.5, height: 5.4, y: 2.5, depth: 0.55 }
const foxEar = () =>
  once('fox-ear', () => {
    const fur = new THREE.Color(PALETTE.fox)
    const tip = new THREE.Color(PALETTE.foxDark)
    return part(cone(FOX_EAR.radius, FOX_EAR.height, 0.7, 10), { color: (p) => (p.y > 0.9 ? tip : fur), at: [0, FOX_EAR.y, 0], scale: [1, 1, FOX_EAR.depth] })
  })
/**
 * The tail's base is a capsule round a spine up its middle, sewn into the
 * back at the middle of its lower round (`root`, in the body's frame) and
 * turning about it; its tip an egg on the end.
 */
const FOX_TAIL_BASE = { radius: 2.6, length: 6, root: [0, 4.52, -6.57] as const }
const FOX_TAIL_SPINE = [0, FOX_TAIL_BASE.length / 2, FOX_TAIL_BASE.length]
const FOX_TAIL_TIP_AT = FOX_TAIL_BASE.length + 1
const FOX_TAIL_TIP = [3.4, 9, 0.1] as const
const FOX_TAIL_TIP_ROWS = eggProfile(...FOX_TAIL_TIP)
/** The tail rides this far clear of the ground, and a streaming tail is lifted no higher than it trails at rest. */
const TAIL_CLEAR = 0.15
const TAIL_REST = -0.7
/** Cold, the tail is held up closer behind it, but no more upright than its lower round still sinks into the back as deep as ever. */
const TAIL_COLD = 0.35
/** How far past the loom's posts and feet a tail flung round beside it passes (the loom rocks a little about its foot). */
const TAIL_LOOM_CLEAR = 0.6
/** Furthest a tail tip gets from the fox's middle, flung straight out (the body puffs up a little when warm). */
const TAIL_REACH = (Math.hypot(FOX_TAIL_BASE.root[1], FOX_TAIL_BASE.root[2]) + FOX_TAIL_TIP_AT + FOX_TAIL_TIP[1] + FOX_TAIL_TIP[0]) * 1.2
type Capsule = { ax: number; ay: number; az: number; bx: number; by: number; bz: number; r: number }
/** The loom's posts and the feet running forward under them. */
const LOOM_LOW: Capsule[] = [-1, 1].flatMap((side) => {
  const x = LOOM.x + side * LOOM.postX
  const footZ = LOOM.z + LOOM.foot.z
  return [
    { ax: x, ay: 0, az: LOOM.z, bx: x, by: LOOM.rodY, bz: LOOM.z, r: LOOM.postBottom },
    { ax: x, ay: LOOM.foot.y, az: footZ - LOOM.foot.length / 2, bx: x, by: LOOM.foot.y, bz: footZ + LOOM.foot.length / 2, r: LOOM.foot.radius },
  ]
})

/** How far a ball at (x, y, z) of radius `r` sinks into any of the loom's posts and feet. */
function intoLoom(x: number, y: number, z: number, r: number): number {
  let into = -Infinity
  for (let i = 0; i < LOOM_LOW.length; i++) {
    const s = LOOM_LOW[i]
    const abx = s.bx - s.ax
    const aby = s.by - s.ay
    const abz = s.bz - s.az
    const t = clamp01(((x - s.ax) * abx + (y - s.ay) * aby + (z - s.az) * abz) / (abx * abx + aby * aby + abz * abz))
    into = Math.max(into, r + s.r + TAIL_LOOM_CLEAR - Math.hypot(x - s.ax - abx * t, y - s.ay - aby * t, z - s.az - abz * t))
  }
  return into
}

/** Whether a fox standing at (x, z) could swing its tail as far as the loom. */
function tailReachesLoom(x: number, z: number): boolean {
  for (let i = 0; i < LOOM_LOW.length; i++) {
    const s = LOOM_LOW[i]
    const dx = Math.max(Math.min(s.ax, s.bx) - x, 0, x - Math.max(s.ax, s.bx))
    const dz = Math.max(Math.min(s.az, s.bz) - z, 0, z - Math.max(s.az, s.bz))
    if (Math.hypot(dx, dz) - s.r < TAIL_REACH) return true
  }
  return false
}

const foxTailBase = () => once('fox-tail-base', () => part(capsule(FOX_TAIL_BASE.radius, FOX_TAIL_BASE.length, 1), { color: PALETTE.fox, at: [0, FOX_TAIL_BASE.length / 2, 0] }))
const foxTailTip = () =>
  once('fox-tail-tip', () => {
    const fur = new THREE.Color(PALETTE.fox)
    const cream = new THREE.Color(PALETTE.foxLight)
    return part(egg(FOX_TAIL_TIP[0], FOX_TAIL_TIP[1], 1, FOX_TAIL_TIP[2]), { color: (p) => (p.y > 5.4 ? cream : fur) })
  })
const foxPaw = () =>
  once('fox-paw', () => part(capsule(FOX_PAW.radius, FOX_PAW.length, 0.7), { color: PALETTE.foxDark, at: [0, -FOX_PAW.length / 2, 0], ground: -FOX_PAW.shoulder[1] }))

export class Fox extends Amigurumi {
  readonly animal = 'fox'
  readonly neckRadius = 6.1
  readonly band = 4.7
  readonly drape = 0.18
  protected readonly breathEvery = 2.2
  protected readonly director = new MotionDirector('fox', 37)
  protected readonly underside = undersideOf(...FOX_EGG)
  protected readonly headHeight = 19
  private readonly head: THREE.Mesh
  private readonly earL: THREE.Mesh
  private readonly earR: THREE.Mesh
  private readonly tailBase: THREE.Mesh
  private readonly tailTip: THREE.Mesh
  private readonly pawL: THREE.Mesh
  private readonly pawR: THREE.Mesh
  private readonly shoulder = foxShoulder()
  private tailLag = 0
  private byLoom = false

  constructor(materials: YarnMaterials) {
    super(materials)
    this.piece(foxBody(), this.body, 0, 0, 0).name = 'body'
    this.head = this.piece(foxHead(), this.body, 0, 19, 0.6)
    this.earL = this.piece(foxEar(), this.head, -3.4, 4.6, -0.4)
    this.earR = this.piece(foxEar(), this.head, 3.4, 4.6, -0.4)
    this.tailBase = this.piece(foxTailBase(), this.body, ...FOX_TAIL_BASE.root)
    this.tailTip = this.piece(foxTailTip(), this.tailBase, 0, FOX_TAIL_TIP_AT, 0)
    const [sx, sy, sz] = FOX_PAW.shoulder
    this.pawL = this.piece(foxPaw(), this.body, -sx, sy, sz)
    this.pawR = this.piece(foxPaw(), this.body, sx, sy, sz)
    this.nameParts({ head: this.head, 'ear-l': this.earL, 'ear-r': this.earR, tail: this.tailBase, 'tail-tip': this.tailTip, 'paw-l': this.pawL, 'paw-r': this.pawR })
    this.neck.position.set(0, 13.3, 0.3)
    this.face(this.head, eyes('fox', 2.5, 5.7, 0.9), 1.1, [0, -2.2, 10.2])
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
      const phase = (t - actor.walkBegan) * 3.3
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
    this.root.rotation.y = this.shownYaw + spin + wiggle + pose.twist
    this.body.position.set(0, lift - crouch + pose.lift, 0)
    this.body.rotation.set(pitch + 0.1 * cold + pose.lean, 0, wave(t, 14) * 0.025 * cold + pose.roll)
    const wide = 1 + pose.squash * 0.5
    // Hunched in the cold: the whole body huddles down, the head only nestles into it.
    this.body.scale.set(wide, (1 - pose.squash) * (1 - 0.08 * cold) - crouch * 0.03, wide)
    this.head.rotation.set(0.2 * cold - 0.1 * reach + pitch * 0.6 + pose.headPitch, this.look(x, z, m) + pose.headYaw, pose.headRoll)
    this.head.position.y = 19 - 0.3 * cold
    const flat = cold
    const earRoom = this.earRoom(actor, dt)
    this.earL.rotation.set(Math.min(earRoom, -flat + reach * 0.3 - pose.earL), wave(t, 0.9) * 0.22, 0.12 + flat * 0.4)
    this.earR.rotation.set(Math.min(earRoom, -flat + reach * 0.3 - pose.earR), wave(t, 0.9, 2) * 0.22, -0.12 - flat * 0.4)

    // Tail: swishing with the director, wrapped round the paws when cold, streaming when moving; the tip follows late.
    this.tailLag = approach(this.tailLag, pose.tail, 4, dt)
    const wrap = cold * 2.3
    this.tailBase.rotation.set(TAIL_REST - stream * 0.9 + cold * TAIL_COLD - reach * 0.5, pose.tail + wrap, 0)
    this.tailTip.rotation.set(0.4 - stream * 0.3 + cold * 0.3, this.tailLag * 1.4 + wrap * 0.35, 0)
    // Paws swing from the shoulder: to and fro at a trot, reaching forward when hoping or lifted.
    const forwardL = -pawSwing * 0.5 - reach * 0.6 - Math.max(0, pose.armL) * 0.9
    const forwardR = pawSwing * 0.5 - reach * 0.6 - Math.max(0, pose.armR) * 0.9
    this.pawL.rotation.set(forwardL, 0, this.shoulder.left(forwardL, 0))
    this.pawR.rotation.set(forwardR, 0, this.shoulder.right(forwardR, 0))
    this.settle(x, z)
    this.liftTail(x, z)
    this.breathe(this.head, actor, m, cold)
  }

  protected feetSoles(): void {
    this.pawSoles(this.pawL)
    this.pawSoles(this.pawR)
  }

  /** A tail flung out low (the chase) is lifted where it leaves the body, just as far as rides it clear of the ground and over the loom's feet. */
  private liftTail(x: number, z: number): void {
    const tail = this.tailBase
    const from = tail.rotation.x
    if (from >= TAIL_REST) return
    this.byLoom = tailReachesLoom(x, z)
    if (this.tailSink() <= 0) return
    let low = 0
    let high = TAIL_REST - from
    for (let i = 0; i < 8; i++) {
      const mid = (low + high) / 2
      tail.rotation.x = from + mid
      if (this.tailSink() > 0) low = mid
      else high = mid
    }
    tail.rotation.x = from + high
  }

  /**
   * How far the tail's lowest point, spine sphere by sphere and tip ring by
   * ring, comes below riding clear of the ground; beside the loom, also how
   * far its round, sphere by sphere along it, comes into the loom's posts and feet.
   */
  private tailSink(): number {
    const tip = this.tailTip
    tip.updateWorldMatrix(true, false)
    const base = this.tailBase.matrixWorld
    const e = base.elements
    const r = FOX_TAIL_BASE.radius * base.getMaxScaleOnAxis()
    let sink = -Infinity
    for (let i = 0; i < FOX_TAIL_SPINE.length; i++) {
      const y = FOX_TAIL_SPINE[i]
      const cx = e[4] * y + e[12]
      const cy = e[5] * y + e[13]
      const cz = e[6] * y + e[14]
      sink = Math.max(sink, standY(cx, cz) + TAIL_CLEAR - (cy - r))
      if (this.byLoom) sink = Math.max(sink, intoLoom(cx, cy, cz, r))
    }
    const t = tip.matrixWorld.elements
    const scale = tip.matrixWorld.getMaxScaleOnAxis()
    const length = Math.hypot(t[4], t[5], t[6])
    const ay = t[5] / length
    const across = Math.sqrt(Math.max(0, 1 - ay * ay))
    const dx = across > 1e-6 ? (ay * t[4]) / length / across : 0
    const dy = across > 1e-6 ? (ay * ay - 1) / across : 0
    const dz = across > 1e-6 ? (ay * t[6]) / length / across : 0
    for (let i = 0; i < FOX_TAIL_TIP_ROWS.length; i++) {
      const row = FOX_TAIL_TIP_ROWS[i]
      const ring = row.x * scale
      const px = t[4] * row.y + t[12]
      const py = t[5] * row.y + t[13]
      const pz = t[6] * row.y + t[14]
      sink = Math.max(sink, standY(px + dx * ring, pz + dz * ring) + TAIL_CLEAR - (py + dy * ring))
      if (this.byLoom) sink = Math.max(sink, intoLoom(px, py, pz, ring))
    }
    return sink
  }

  private pawSoles(paw: THREE.Mesh): void {
    const { position, rotation } = paw
    const hang = FOX_PAW.length * Math.cos(rotation.z)
    this.footSoles(FOX_PAW_SOLE, position.x + FOX_PAW.length * Math.sin(rotation.z), position.y - hang * Math.cos(rotation.x), position.z - hang * Math.sin(rotation.x))
  }
}

// --- the bear: big, slow and heavy; lumbers with thumping steps -------------------

const BEAR_EGG = [9.6, 17.5, 0.35] as const
const BEAR_FOOT = footShape(3.3, [0, 1.5, 1.2], [1, 0.55, 1.3])
const BEAR_TOE = footShape(1.7, [0, 1.4, 4.9], [1, 0.85, 0.3])
/** Where the feet are sewn on under the belly, and how high the dance's big stomp lifts one (a lumbering step lifts less). */
const BEAR_FEET = { x: 4.4, z: 2.6, lift: 3 }
const bearStep = () => once('bear-step', () => new Step(new EggOutline(...BEAR_EGG), [BEAR_FOOT, BEAR_TOE], BEAR_FEET.x, BEAR_FEET.z, BEAR_FEET.lift))
const BEAR_ARM = { radius: 2.4, length: 6, shoulder: [8.2, 13.4, 1] as const }
const bearShoulder = () => once('bear-shoulder', () => new Shoulder(new EggOutline(...BEAR_EGG), ...BEAR_ARM.shoulder, BEAR_ARM.length))

const bearBody = () =>
  once('bear-body', () => {
    const fur = new THREE.Color(PALETTE.bear)
    const light = new THREE.Color(PALETTE.bearLight)
    const belly: ColorFn = (p, n) => (n.z > 0.45 && p.y > 3 && p.y < 13.5 ? light : fur)
    return part(egg(BEAR_EGG[0], BEAR_EGG[1], 1.3, BEAR_EGG[2], 24), { color: belly, ground: 0 })
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
const bearArm = () => once('bear-arm', () => part(capsule(BEAR_ARM.radius, BEAR_ARM.length, 1.1), { color: PALETTE.bear, at: [0, -BEAR_ARM.length / 2, 0] }))
const bearFoot = () =>
  once('bear-foot', () =>
    merge([
      part(ball(3.3, 1, 14), { color: PALETTE.bear, at: [...BEAR_FOOT.at], scale: [1, 0.55, 1.3], ground: 0 }),
      part(ball(1.7, 0.8, 10), { color: PALETTE.bearLight, at: [...BEAR_TOE.at], scale: [1, 0.85, 0.3] }),
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
  protected readonly underside = undersideOf(...BEAR_EGG)
  protected readonly headHeight = 23.4
  private readonly head: THREE.Mesh
  private readonly armL: THREE.Mesh
  private readonly armR: THREE.Mesh
  private readonly footL: THREE.Mesh
  private readonly footR: THREE.Mesh
  private readonly shoulder = bearShoulder()
  private readonly step = bearStep()
  private jiggle = 0

  constructor(materials: YarnMaterials) {
    super(materials)
    const [sx, sy, sz] = BEAR_ARM.shoulder
    this.piece(bearBody(), this.body, 0, 0, 0).name = 'body'
    this.head = this.piece(bearHead(), this.body, 0, 23.4, 0.5)
    this.armL = this.piece(bearArm(), this.body, -sx, sy, sz)
    this.armR = this.piece(bearArm(), this.body, sx, sy, sz)
    this.footL = this.piece(bearFoot(), this.body, -BEAR_FEET.x, 0, BEAR_FEET.z)
    this.footR = this.piece(bearFoot(), this.body, BEAR_FEET.x, 0, BEAR_FEET.z)
    this.nameParts({ head: this.head, 'arm-l': this.armL, 'arm-r': this.armR, 'foot-l': this.footL, 'foot-r': this.footR })
    this.neck.position.set(0, 16.6, 0.4)
    this.face(this.head, eyes('bear', 2.9, 7, 0.95), 1.3, [0, -2.8, 9.4])
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
      // It sways onto one foot and lifts the other.
      const side = index % 2 === 0 ? 1 : -1
      sway = side * Math.sin(f * Math.PI) * 0.1
      dip = f > 0.85 ? Math.sin(((f - 0.85) / 0.15) * Math.PI) * 0.9 : 0
      if (side > 0) liftR = Math.sin(f * Math.PI) * 2
      else liftL = Math.sin(f * Math.PI) * 2
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
          const lift = Math.sin(Math.min(1, f / 0.7) * Math.PI) * BEAR_FEET.lift
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
    this.root.rotation.y = this.shownYaw + pose.twist
    const inhale = reach * 0.07
    const jig = wave(t, 6) * this.jiggle * 0.05
    this.body.position.set(0, -dip - stompSquash * 0.8 + pose.lift, 0)
    const wide = 1 + pose.squash * 0.5 + jig
    // Hunched in the cold: the whole body huddles down, the head only nestles into it.
    this.body.scale.set(wide, (1 - pose.squash) * (1 + inhale - 0.08 * cold) - stompSquash * 0.07 - jig, wide)
    this.body.rotation.set(0.1 * cold + pose.lean, 0, sway + pose.roll + wave(t, 5) * 0.02 * cold)
    this.head.rotation.set(0.2 * cold - 0.2 * reach + pose.headPitch, this.look(x, z, m) + pose.headYaw, hug * 0.18 + sway * 0.4 + pose.headRoll)
    this.head.position.y = 23.4 - 0.4 * cold

    // Arms: rubbing each other when cold, rising when hoping, up when dancing, hugging at the end.
    const rub = cold * (1 - reach)
    const rubbing = wave(t, 2) * 0.28 * rub
    const raise = Math.max(armsUp * 2.7, reach * 1.9)
    const across = Math.max(rub * 0.5, hug * 0.7) + pose.hug * 0.6
    const forwardL = -0.9 * rub + rubbing - raise - hug * 0.9 - pose.armL
    const forwardR = -0.9 * rub - rubbing - raise - hug * 0.9 - pose.armR
    this.armL.rotation.set(forwardL, 0, this.shoulder.left(forwardL, -0.12 + across - armsUp * 0.35 - pose.armL * 0.3 + wave(t, 0.3) * 0.04))
    this.armR.rotation.set(forwardR, 0, this.shoulder.right(forwardR, 0.12 - across + armsUp * 0.35 + pose.armR * 0.3 - wave(t, 0.3) * 0.04))
    // A lifted foot swings out from under the belly, never up into it.
    const outL = this.step.out(liftL)
    const outR = this.step.out(liftR)
    this.footL.position.set(-BEAR_FEET.x - outL * this.step.outX, liftL, BEAR_FEET.z + outL * this.step.outZ)
    this.footR.position.set(BEAR_FEET.x + outR * this.step.outX, liftR, BEAR_FEET.z + outR * this.step.outZ)
    this.settle(x, z)
    this.breathe(this.head, actor, m, cold)
  }

  protected feetSoles(): void {
    this.bearFootSoles(this.footL)
    this.bearFootSoles(this.footR)
  }

  private bearFootSoles(foot: THREE.Mesh): void {
    this.footSoles(BEAR_FOOT, foot.position.x, 0, foot.position.z)
    this.footSoles(BEAR_TOE, foot.position.x, 0, foot.position.z)
  }
}

export type Animal = Bunny | Penguin | Fox | Bear

/** Each body egg: radius, height and how flat its bottom is. */
export const BODY_EGG: Record<AnimalKey, readonly [number, number, number]> = { bunny: BUNNY_EGG, penguin: PENGUIN_EGG, fox: FOX_EGG, bear: BEAR_EGG }

export function buildAnimals(materials: YarnMaterials): Record<AnimalKey, Animal> {
  const animals = { bunny: new Bunny(materials), penguin: new Penguin(materials), fox: new Fox(materials), bear: new Bear(materials) }
  for (const [key, animal] of Object.entries(animals)) {
    animal.root.name = key
    animal.root.userData.jamObject = key
  }
  return animals
}

/** Where an animal's neck frame is in the world (for the flight target), without allocating. */
export function neckWorld(animal: Animal, out: THREE.Vector3): THREE.Vector3 {
  return out.setFromMatrixPosition(animal.neck.matrixWorld)
}
