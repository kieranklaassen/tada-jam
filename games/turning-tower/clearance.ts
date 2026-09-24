import { apply, BIRD, frame, HEAD_PIVOT, headFrame, headTurn, tailFrame, tailTurn, torsoFrame, turnOf, wingFrame, wingTurn, type Frame } from './anatomy'
import { PECK_PITCH, SNUG, SWELL, type BirdPose, type BirdReach, type WandererPose } from './motion'
import type { MutableVec3 } from './projection'
import type { Decor, RoomSpec } from './rooms'
import { armFit, pack, PAVER_RAISE, stateRange, transformPoint, type GroupDef, type Layout } from './world'

// The room the bird has. Its head, wings and tail are not cells, so the
// lattice alone cannot keep them out of the walls: every frame the controller
// asks here which way the bird may face, how far it may turn its head and
// open each wing, whether it may peck, and whether it has room to swell, and
// the motion stays inside that. Every answer holds for the body at the
// extremes its motion reaches, so it depends only on where the bird stands
// and what is around it, and is kept until one of those changes. The walls
// and the wanderer are asked separately: a wanderer walking by changes only
// its own (cheap) half of the answer.

/** Every test point keeps at least this far from a wall, a paver or a turning segment (it may rest on a floor). */
const MARGIN = 0.04
const HEAD_YAW = 1.6
const HEAD_PITCH = 0.6
const YAW_STEP = 0.1
const WING_STEP = 0.05
/** Headings are tried in this many bins all the way round. */
const BINS = 126
const BIN = (Math.PI * 2) / BINS
const FLICKS = [-0.6, 0, 0.8] as const
const TILTS = [-0.35, 0, 0.35] as const
/** The head turns about the middle of its ball, so no turn or tilt moves the ball. */
const BALL = BIRD.headBall.radius
/** The farthest any head point gets from the head's pivot, and any wing point from its hinge, whatever the turn, tilt or opening. */
const HEAD_REACH = 0.44
const WING_REACH = 0.57
const PECKING = [PECK_PITCH] as const
const PITCHES_UP = [HEAD_PITCH, HEAD_PITCH / 2] as const
const PITCHES_DOWN = [-HEAD_PITCH, -HEAD_PITCH / 2] as const

/** The squashes, fluffing and body pitches the motion reaches in one state. */
type Envelope = { squashes: readonly number[]; puff: number; pitches: readonly number[] }
/** Every heading it faces must hold its snug body; it swells only where the swollen one fits too. */
const SNUG_BODY: Envelope = { squashes: SNUG.squash, puff: SNUG.puff, pitches: [SNUG.rock, 0] }
const SWELL_BODY: Envelope = { squashes: SWELL.squash, puff: SWELL.puff, pitches: [SWELL.rock, 0] }

/** The farthest any of it reaches from its feet at full size, swollen: across (tail, wing tips) and up (crest). */
const SPAN = 1.3
const TOP = 2.1
/** The wanderer as the bird sees it at full size: a column round its cloak and the lantern it holds out. */
const WANDERER_RADIUS = 0.45
const WANDERER_HEIGHT = 1
/** A moving bird's place is rounded to this grid (its size rounded up); the rounding moves it at most `PLACE_SLACK`. */
const PLACE_GRID = 0.05
const PLACE_SLACK = (PLACE_GRID / 2) * Math.sqrt(3) + 1e-3
/** The wanderer's place is rounded to a grid and its column grown to cover the rounding and a frame's walk. */
const WANDERER_GRID = 0.05
const WANDERER_SLACK = 0.07
const FULL: BirdReach = { yawLo: -HEAD_YAW, yawHi: HEAD_YAW, pitchLo: -HEAD_PITCH, pitchHi: HEAD_PITCH, wingLeft: BIRD.wingOpen, wingRight: BIRD.wingOpen, peck: true, swell: true }
const MIDDLE = (BIRD.belly + BIRD.back) / 2
/** The body's cross-section corners, as `buildBird` draws them. */
const SECTION: readonly (readonly [number, number])[] = [
  [BIRD.halfWidth, BIRD.belly + BIRD.chamfer],
  [BIRD.halfWidth, BIRD.back - BIRD.chamfer],
  [-BIRD.halfWidth, BIRD.belly + BIRD.chamfer],
  [-BIRD.halfWidth, BIRD.back - BIRD.chamfer],
  [BIRD.halfWidth - BIRD.chamfer, BIRD.back],
  [BIRD.chamfer - BIRD.halfWidth, BIRD.back],
  [BIRD.halfWidth - BIRD.chamfer, BIRD.belly],
  [BIRD.chamfer - BIRD.halfWidth, BIRD.belly],
]
/** Extra cross-sections along its long straight flanks, so a wall's corner cannot slip in between the drawn rings. */
const FLANK = [-0.15, 0.07] as const
/** The saddle's top corners (x, z). */
const SADDLE: readonly (readonly [number, number])[] = [
  [-0.31, -0.33],
  [-0.31, 0.25],
  [0.31, -0.33],
  [0.31, 0.25],
]
/** Every torso test point (x, y, z in turn): each drawn ring's corners, the extra flank sections, the saddle's corners. */
const TORSO = new Float64Array(
  [
    ...BIRD.rings.flatMap(([z, k]) => SECTION.map(([x, y]) => [x * k, MIDDLE + (y - MIDDLE) * k, z])),
    ...FLANK.flatMap((z) => SECTION.map(([x, y]) => [x, y, z])),
    ...SADDLE.map(([x, z]) => [x, BIRD.saddleTop, z]),
  ].flat(),
)
const FLICK_TURNS = FLICKS.map((flick) => tailTurn(flick, turnOf()))
/** Shapes this much beyond the box round its reach are left out of its tests. */
const NEAR_PAD = 0.1

type Cylinder = { axis: number; a: number; b: number; lo: number; hi: number; radius: number }
type Box = { min: MutableVec3; max: MutableVec3 }
type Sweep = { turn: Cylinder | null; slide: Box | null }
/** The test body in one squash and body pitch of an envelope: its torso frame, and the most that frame stretches. */
type Stand = { torso: Frame; stretch: number }

/** The two coordinates across an axis, in order. */
function across(axis: number, x: number, y: number, z: number, out: MutableVec3): MutableVec3 {
  out[0] = axis === 0 ? y : x
  out[1] = axis === 2 ? y : z
  out[2] = axis === 0 ? x : axis === 1 ? y : z
  return out
}

function axisIndex(axis: 'x' | 'y' | 'z'): number {
  return axis === 'x' ? 0 : axis === 'y' ? 1 : 2
}

function staticDecor(item: Decor): Cylinder | Box | null {
  switch (item.kind) {
    case 'dome':
      return item.group === undefined ? { axis: 1, a: item.at[0], b: item.at[2], lo: item.at[1] - 0.02, hi: item.at[1] + item.radius, radius: item.radius * 1.08 } : null
    case 'cone':
      return item.group === undefined ? { axis: 1, a: item.at[0], b: item.at[2], lo: item.at[1], hi: item.at[1] + item.height, radius: item.radius * 1.12 } : null
    case 'column':
      return item.group === undefined ? { axis: 1, a: item.at[0], b: item.at[2], lo: item.at[1], hi: item.at[1] + item.height + 0.07, radius: item.radius * 1.35 } : null
    case 'finial':
      return item.group === undefined ? { axis: 1, a: item.at[0], b: item.at[2], lo: item.at[1], hi: item.at[1] + 0.48, radius: 0.16 } : null
    case 'wheel': {
      // A wheel turns in place, so it fills the same disc whatever its segment is doing.
      const axis = axisIndex(item.axis)
      const c = across(axis, item.at[0], item.at[1], item.at[2], [0, 0, 0])
      return { axis, a: c[0], b: c[1], lo: c[2] - 0.1, hi: c[2] + 0.1, radius: item.radius }
    }
    case 'shaft':
      return { min: [item.at[0] + 0.5, item.at[1], item.at[2] - 0.48], max: [item.at[0] + 0.62, item.at[1] + item.height + 0.1, item.at[2] + 0.48] }
    case 'window':
    case 'grip':
      return null
    default: {
      const unreachable: never = item
      return unreachable
    }
  }
}

/** Everything a segment can reach while it moves: a turn's whole swing, or a slide's whole run. */
function sweepOf(group: GroupDef, decor: readonly Decor[], index: number): Sweep {
  const range = stateRange(group)
  if (group.kind === 'slide') {
    const min: MutableVec3 = [Infinity, Infinity, Infinity]
    const max: MutableVec3 = [-Infinity, -Infinity, -Infinity]
    for (const state of [range.min, range.max]) {
      for (const cell of group.cells) {
        const p = transformPoint(group, state, cell.at)
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k], p[k])
          max[k] = Math.max(max[k], p[k] + 1)
        }
      }
    }
    // Its paver on top and its grip on a face stand a little proud of its cells.
    for (let k = 0; k < 3; k++) {
      min[k] -= 0.16
      max[k] += 0.16
    }
    return { turn: null, slide: { min, max } }
  }
  const axis = axisIndex(group.axis)
  const fit = armFit(group)
  const pivot = across(axis, group.pivot[0], group.pivot[1], group.pivot[2], [0, 0, 0])
  let lo = Infinity
  let hi = -Infinity
  for (const cell of group.cells) {
    lo = Math.min(lo, cell.at[axis])
    hi = Math.max(hi, cell.at[axis] + 1)
  }
  let radius = fit.radius
  if (axis === 1) hi += PAVER_RAISE
  // A level turn rises as it swings (`levelLift`) and carries its pavers on its sides.
  else radius += 0.23 + PAVER_RAISE
  for (const item of decor) {
    if (item.kind !== 'wheel' || item.group !== index) continue
    lo = Math.min(lo, item.at[axis] - 0.1)
    hi = Math.max(hi, item.at[axis] + 0.1)
    radius = Math.max(radius, item.radius)
  }
  return { turn: { axis, a: pivot[0], b: pivot[1], lo, hi, radius }, slide: null }
}

/** Whether a point, or a ball of radius `grow` round it, comes within the margin of a cylinder. */
function inCylinder(c: Cylinder, x: number, y: number, z: number, scratch: MutableVec3, grow = 0): boolean {
  const p = across(c.axis, x, y, z, scratch)
  const m = MARGIN + grow
  if (p[2] < c.lo - m || p[2] > c.hi + m) return false
  const u = p[0] - c.a
  const v = p[1] - c.b
  const r = c.radius + m
  return u * u + v * v < r * r
}

function inBox(b: Box, x: number, y: number, z: number, grow = 0): boolean {
  const m = MARGIN + grow
  return x > b.min[0] - m && x < b.max[0] + m && y > b.min[1] - m && y < b.max[1] + m && z > b.min[2] - m && z < b.max[2] + m
}

/** Squared distance from a point to a unit cell's box, squashed to `height` from its floor. */
function cellDistance(x: number, y: number, z: number, i: number, j: number, k: number, height: number): number {
  const dx = x < i ? i - x : x > i + 1 ? x - i - 1 : 0
  const dy = y < j ? j - y : y > j + height ? y - j - height : 0
  const dz = z < k ? k - z : z > k + 1 ? z - k - 1 : 0
  return dx * dx + dy * dy + dz * dz
}

/** Whether a shape comes within `pad` of an axis-aligned box. */
function shapeMeets(shape: Cylinder | Box, min: MutableVec3, max: MutableVec3, pad: number): boolean {
  if (!('axis' in shape)) {
    for (let k = 0; k < 3; k++) if (shape.max[k] + pad <= min[k] || shape.min[k] - pad >= max[k]) return false
    return true
  }
  const r = shape.radius + pad
  const u = shape.axis === 0 ? 1 : 0
  const v = shape.axis === 2 ? 1 : 2
  return (
    shape.hi + pad > min[shape.axis] &&
    shape.lo - pad < max[shape.axis] &&
    shape.a + r > min[u] &&
    shape.a - r < max[u] &&
    shape.b + r > min[v] &&
    shape.b - r < max[v]
  )
}

function wrap(a: number): number {
  return a - Math.PI * 2 * Math.round(a / (Math.PI * 2))
}

/** A value on the place grid, or the value itself if it already is on it. */
function onGrid(v: number): number {
  const snapped = Math.round(v / PLACE_GRID) * PLACE_GRID
  return Math.abs(snapped - v) < 1e-6 ? v : snapped
}

function binOf(index: number): number {
  return ((index % BINS) + BINS) % BINS
}

function reaches(): BirdReach[] {
  return Array.from({ length: BINS }, () => ({ ...FULL }))
}

type Against = 'world' | 'wanderer'

export class Clearance {
  private readonly cells = new Set<number>()
  private readonly pavers = new Set<number>()
  private statics: (Cylinder | Box)[] = []
  private sweeps: Sweep[] = []
  private readonly moving: boolean[] = []
  /** The decor and the moving segments' reaches, and those of them near where it stands. */
  private readonly shapes: (Cylinder | Box)[] = []
  private readonly near: (Cylinder | Box)[] = []
  private readonly wanderer: Cylinder = { axis: 1, a: 0, b: 0, lo: 0, hi: 0, radius: 0 }
  private wandererNear = false
  private birdGroup = -1
  /** The bird as the tests pose it: its place is copied in, the rest is set per test. */
  private readonly body: BirdPose = { x: NaN, y: 0, z: NaN, heading: 0, alpha: 1, bob: NaN, squash: 1, pitch: 0, headYaw: 0, headPitch: 0, headTilt: 0, wing: 0, wingLeft: 0, wingRight: 0, tail: 0, puff: 0, scale: NaN, ground: NaN }
  private envelope: Envelope = SNUG_BODY
  /** Extra margin for a bird placed on the grid: as far as the rounding moved it. */
  private slack = 0
  /** The most the posed body is scaled along any axis. */
  private stretch = 1
  private readonly stands: Stand[] = []
  private standCount = 0
  private readonly heads = TILTS.map(() => turnOf())
  private readonly part = frame()
  private readonly wing = turnOf()
  private against: Against = 'world'
  /** Bumped when the walls' half of the answers may change; the wanderer's half is bumped with it, and whenever the wanderer moves. */
  private worldGeneration = 0
  private wandererGeneration = 0
  private openGeneration = -1
  private open = false
  private awayGeneration = -1
  private away = true
  private readonly worldStamp = new Int32Array(BINS).fill(-1)
  private readonly worldClear = new Uint8Array(BINS)
  private readonly wandererStamp = new Int32Array(BINS).fill(-1)
  private readonly wandererClear = new Uint8Array(BINS)
  private readonly worldReachStamp = new Int32Array(BINS).fill(-1)
  private readonly worldReach = reaches()
  private readonly wandererReachStamp = new Int32Array(BINS).fill(-1)
  private readonly wandererReach = reaches()
  private readonly scratch: MutableVec3 = [0, 0, 0]
  private readonly point: MutableVec3 = [0, 0, 0]
  /** The box round everything the bird can reach from where it stands. */
  private readonly low: MutableVec3 = [0, 0, 0]
  private readonly high: MutableVec3 = [0, 0, 0]

  /** A new diorama: its decor and each segment's reach. */
  setRoom(spec: RoomSpec, birdGroup: number): void {
    this.birdGroup = birdGroup
    this.statics = []
    for (const item of spec.decor) {
      const shape = staticDecor(item)
      if (shape) this.statics.push(shape)
    }
    this.sweeps = spec.groups.map((group, index) => sweepOf(group, spec.decor, index))
    this.moving.length = spec.groups.length
    this.moving.fill(false)
    this.cells.clear()
    this.pavers.clear()
    this.gatherShapes()
    this.worldChanged()
  }

  /** The blocks where they stand now (all but the bird's own), the pavers on them, and which segments are on the move. */
  setLayout(layout: Layout, groupOf: (cell: number) => number, moving: (group: number) => boolean): void {
    this.cells.clear()
    this.pavers.clear()
    const positions = layout.positions
    for (let i = 0; i < positions.length; i++) {
      if (groupOf(i) === this.birdGroup && this.birdGroup >= 0) continue
      const p = positions[i]
      this.cells.add(pack(p[0], p[1], p[2]))
    }
    for (const tile of layout.tiles) {
      if (tile.group === this.birdGroup && this.birdGroup >= 0) continue
      this.pavers.add(pack(tile.x, tile.y + 1, tile.z))
    }
    for (let g = 0; g < this.moving.length; g++) this.moving[g] = g !== this.birdGroup && moving(g)
    this.gatherShapes()
    this.worldChanged()
  }

  /**
   * Where the bird stands this frame (its feet, size and bob) and the
   * wanderer, or null while it rides the bird (the bird then keeps its head
   * clear of its rider). Nothing is worked out again unless one of them moved.
   */
  setPlace(pose: BirdPose, wanderer: WandererPose | null): void {
    const body = this.body
    // A bird on the move is placed on a grid, so its answers last until it crosses a grid line, and every test keeps the rounding's worth further off.
    const x = onGrid(pose.x)
    const ground = onGrid(pose.ground)
    const z = onGrid(pose.z)
    const scale = Math.ceil(pose.scale / PLACE_GRID - 1e-6) * PLACE_GRID
    const slack = x === pose.x && ground === pose.ground && z === pose.z ? 0 : PLACE_SLACK
    if (x !== body.x || ground !== body.ground || z !== body.z || scale !== body.scale || pose.bob !== body.bob || slack !== this.slack) {
      body.x = x
      body.ground = ground
      body.z = z
      body.scale = scale
      body.bob = pose.bob
      this.slack = slack
      const span = SPAN * scale + slack
      this.low[0] = x - span
      this.low[1] = ground + pose.bob - slack
      this.low[2] = z - span
      this.high[0] = x + span
      this.high[1] = ground + pose.bob + TOP * scale + slack
      this.high[2] = z + span
      this.worldChanged()
    }
    if (!wanderer || wanderer.alpha <= 0.03) {
      if (this.wandererNear) this.wandererGeneration++
      this.wandererNear = false
      return
    }
    const c = this.wanderer
    const a = Math.round(wanderer.x / WANDERER_GRID) * WANDERER_GRID
    const b = Math.round(wanderer.z / WANDERER_GRID) * WANDERER_GRID
    const lo = Math.floor(wanderer.ground / WANDERER_GRID) * WANDERER_GRID
    const hi = lo + Math.ceil((WANDERER_HEIGHT * wanderer.scale) / WANDERER_GRID + 1) * WANDERER_GRID
    const radius = WANDERER_RADIUS * wanderer.scale + WANDERER_SLACK
    if (this.wandererNear && c.a === a && c.b === b && c.lo === lo && c.hi === hi && c.radius === radius) return
    c.a = a
    c.b = b
    c.lo = lo
    c.hi = hi
    c.radius = radius
    this.wandererNear = true
    this.wandererGeneration++
  }

  /** Whether a point comes within the margin of anything the bird must keep out of. */
  blocked(x: number, y: number, z: number): boolean {
    return this.cellHit(x, y, z) || this.shapeHit(this.shapes, x, y, z, this.slack) || this.wandererHit(x, y, z, 0)
  }

  /**
   * The heading to face this frame: toward `wanted`, or the nearest clear
   * heading to it, turning from `current` at most `maxStep` and only through
   * clear headings (it waits rather than swing its tail through a wall).
   * An infinite step places it at once.
   */
  face(current: number, wanted: number, maxStep: number): number {
    const target = this.nearestClear(wanted)
    if (Number.isNaN(target)) return Number.isFinite(maxStep) ? current : wanted
    if (!Number.isFinite(maxStep)) return target
    const delta = wrap(target - current)
    // Something came up against it where it stands: turn away from it briskly.
    if (!this.clearAt(Math.round(current / BIN))) return current + Math.max(-2 * maxStep, Math.min(2 * maxStep, delta))
    const next = current + Math.max(-maxStep, Math.min(maxStep, delta))
    const from = Math.round(current / BIN)
    const to = Math.round(next / BIN)
    const dir = Math.sign(to - from)
    for (let b = from; b !== to; b += dir) if (!this.clearAt(b + dir)) return current
    return next
  }

  /** How far it may turn its head and open each wing facing `heading`, whether it may peck, and whether it may swell. */
  reachAt(heading: number, out: BirdReach): BirdReach {
    const index = Math.round(heading / BIN)
    const bin = binOf(index)
    if (this.openAir()) Object.assign(out, FULL)
    else {
      if (this.worldReachStamp[bin] !== this.worldGeneration) {
        this.worldReachStamp[bin] = this.worldGeneration
        this.against = 'world'
        this.reachFor(index * BIN, true, this.worldReach[bin])
      }
      Object.assign(out, this.worldReach[bin])
    }
    if (this.wandererAway()) return out
    if (this.wandererReachStamp[bin] !== this.wandererGeneration) {
      this.wandererReachStamp[bin] = this.wandererGeneration
      this.against = 'wanderer'
      this.reachFor(index * BIN, out.swell, this.wandererReach[bin])
    }
    const w = this.wandererReach[bin]
    out.yawLo = Math.max(out.yawLo, w.yawLo)
    out.yawHi = Math.min(out.yawHi, w.yawHi)
    out.pitchLo = Math.max(out.pitchLo, w.pitchLo)
    out.pitchHi = Math.min(out.pitchHi, w.pitchHi)
    out.wingLeft = Math.min(out.wingLeft, w.wingLeft)
    out.wingRight = Math.min(out.wingRight, w.wingRight)
    out.peck = out.peck && w.peck
    out.swell = out.swell && w.swell
    return out
  }

  private worldChanged(): void {
    this.worldGeneration++
    this.wandererGeneration++
  }

  /** The decor, and the reach of every segment on the move. */
  private gatherShapes(): void {
    const shapes = this.shapes
    shapes.length = 0
    for (const shape of this.statics) shapes.push(shape)
    for (let g = 0; g < this.moving.length; g++) {
      if (!this.moving[g]) continue
      const sweep = this.sweeps[g]
      if (sweep.turn) shapes.push(sweep.turn)
      if (sweep.slide) shapes.push(sweep.slide)
    }
  }

  /** Whether a point comes within the margin (and the place's slack) of a wall or a paver (it may rest on a floor). */
  private cellHit(x: number, y: number, z: number): boolean {
    const m = MARGIN + this.slack
    const cx = Math.floor(x)
    const cy = Math.floor(y)
    const cz = Math.floor(z)
    const x0 = x - cx < m ? cx - 1 : cx
    const x1 = cx + 1 - x < m ? cx + 1 : cx
    const y1 = cy + 1 - y < m ? cy + 1 : cy
    const z0 = z - cz < m ? cz - 1 : cz
    const z1 = cz + 1 - z < m ? cz + 1 : cz
    for (let i = x0; i <= x1; i++) for (let j = cy; j <= y1; j++) for (let k = z0; k <= z1; k++) if (this.cells.has(pack(i, j, k))) return true
    return y - cy < PAVER_RAISE && this.pavers.has(pack(cx, cy, cz))
  }

  /** Whether a point, or a ball of radius `grow` round it, comes within the margin of any of `shapes`. */
  private shapeHit(shapes: readonly (Cylinder | Box)[], x: number, y: number, z: number, grow: number): boolean {
    for (let i = 0; i < shapes.length; i++) {
      const shape = shapes[i]
      if ('axis' in shape ? inCylinder(shape, x, y, z, this.scratch, grow) : inBox(shape, x, y, z, grow)) return true
    }
    return false
  }

  private worldHit(x: number, y: number, z: number): boolean {
    return this.cellHit(x, y, z) || (this.near.length > 0 && this.shapeHit(this.near, x, y, z, this.slack))
  }

  /** Whether a ball comes within the margin of a wall, a paver or a turning segment (it may rest on a floor). */
  private worldBall(x: number, y: number, z: number, ball: number): boolean {
    const radius = ball + this.slack
    const r = radius + MARGIN
    const r2 = r * r
    const x1 = Math.floor(x + r)
    const y1 = Math.floor(y + r)
    const z1 = Math.floor(z + r)
    for (let i = Math.floor(x - r); i <= x1; i++) {
      for (let j = Math.floor(y - radius); j <= y1; j++) {
        for (let k = Math.floor(z - r); k <= z1; k++) {
          const key = pack(i, j, k)
          if (this.cells.has(key) && cellDistance(x, y, z, i, j, k, 1) < (j + 1 <= y - radius ? radius * radius : r2)) return true
          if (this.pavers.has(key) && cellDistance(x, y, z, i, j, k, PAVER_RAISE) < radius * radius) return true
        }
      }
    }
    return this.near.length > 0 && this.shapeHit(this.near, x, y, z, radius)
  }

  private wandererHit(x: number, y: number, z: number, grow: number): boolean {
    return this.wandererNear && inCylinder(this.wanderer, x, y, z, this.scratch, grow + this.slack)
  }

  private hit(p: MutableVec3): boolean {
    return this.against === 'world' ? this.worldHit(p[0], p[1], p[2]) : this.wandererHit(p[0], p[1], p[2], 0)
  }

  private ballHit(p: MutableVec3, radius: number): boolean {
    return this.against === 'world' ? this.worldBall(p[0], p[1], p[2], radius) : this.wandererHit(p[0], p[1], p[2], radius)
  }

  /**
   * Whether no wall, paver or moving segment comes anywhere near: then it may
   * face any way and do anything. Gathers the shapes near it for the tests.
   */
  private openAir(): boolean {
    if (this.openGeneration !== this.worldGeneration) {
      this.openGeneration = this.worldGeneration
      const low = this.low
      const high = this.high
      const near = this.near
      near.length = 0
      let open = true
      for (const shape of this.shapes) {
        if (!shapeMeets(shape, low, high, NEAR_PAD)) continue
        near.push(shape)
        if (open && shapeMeets(shape, low, high, MARGIN)) open = false
      }
      this.open = open && !this.cellsMeet(low, high)
    }
    return this.open
  }

  /** Whether the wanderer is too far off to matter. */
  private wandererAway(): boolean {
    if (this.awayGeneration !== this.wandererGeneration) {
      this.awayGeneration = this.wandererGeneration
      this.away = !this.wandererNear || !shapeMeets(this.wanderer, this.low, this.high, MARGIN)
    }
    return this.away
  }

  private cellsMeet(low: MutableVec3, high: MutableVec3): boolean {
    const x1 = Math.floor(high[0] + MARGIN)
    const y1 = Math.floor(high[1] + MARGIN)
    const z1 = Math.floor(high[2] + MARGIN)
    for (let i = Math.floor(low[0] - MARGIN); i <= x1; i++) {
      for (let j = Math.floor(low[1]); j <= y1; j++) {
        for (let k = Math.floor(low[2] - MARGIN); k <= z1; k++) {
          if (this.cells.has(pack(i, j, k))) return true
          if (j + PAVER_RAISE > low[1] && this.pavers.has(pack(i, j, k))) return true
        }
      }
    }
    return false
  }

  /** Whether its body, tail and resting head are clear at rest facing bin `index` (any integer; bins wrap). */
  private clearAt(index: number): boolean {
    const bin = binOf(index)
    if (!this.openAir()) {
      if (this.worldStamp[bin] !== this.worldGeneration) {
        this.worldStamp[bin] = this.worldGeneration
        this.against = 'world'
        this.worldClear[bin] = this.fits(index * BIN, SNUG_BODY) ? 1 : 0
      }
      if (this.worldClear[bin] === 0) return false
    }
    if (this.wandererAway()) return true
    if (this.wandererStamp[bin] !== this.wandererGeneration) {
      this.wandererStamp[bin] = this.wandererGeneration
      this.against = 'wanderer'
      this.wandererClear[bin] = this.fits(index * BIN, SNUG_BODY) ? 1 : 0
    }
    return this.wandererClear[bin] === 1
  }

  /** `wanted` if it is clear, else the nearest clear bin either way round, else NaN. */
  private nearestClear(wanted: number): number {
    const base = Math.round(wanted / BIN)
    if (this.clearAt(base)) return wanted
    for (let k = 1; k <= BINS / 2; k++) {
      if (this.clearAt(base + k)) return (base + k) * BIN
      if (this.clearAt(base - k)) return (base - k) * BIN
    }
    return NaN
  }

  /** Its body, tail and resting head through a whole envelope. */
  private fits(heading: number, envelope: Envelope): boolean {
    this.envelope = envelope
    this.prepare(heading, envelope.pitches)
    return this.bodyFree() && this.headFree(0, 0)
  }

  private reachFor(heading: number, swellAllowed: boolean, out: BirdReach): void {
    out.swell = swellAllowed && this.fits(heading, SWELL_BODY)
    const envelope = out.swell ? SWELL_BODY : SNUG_BODY
    this.envelope = envelope
    this.prepare(heading, envelope.pitches)
    if (this.headOpen()) {
      out.yawLo = -HEAD_YAW
      out.yawHi = HEAD_YAW
      out.pitchLo = -HEAD_PITCH
      out.pitchHi = HEAD_PITCH
    } else {
      out.pitchHi = 0
      out.pitchLo = 0
      for (const p of PITCHES_UP) {
        if (this.headFree(0, p)) {
          out.pitchHi = p
          break
        }
      }
      for (const p of PITCHES_DOWN) {
        if (this.headFree(0, p)) {
          out.pitchLo = p
          break
        }
      }
      out.yawHi = this.yawLimit(1, out.pitchLo, out.pitchHi)
      out.yawLo = -this.yawLimit(-1, out.pitchLo, out.pitchHi)
    }
    out.wingRight = this.wingOpen(1) ? BIRD.wingOpen : this.wingLimit(1)
    out.wingLeft = this.wingOpen(-1) ? BIRD.wingOpen : this.wingLimit(-1)
    this.prepare(heading, PECKING)
    out.peck = this.bodyFree() && this.headFree(out.yawLo, 0) && this.headFree(0, 0) && this.headFree(out.yawHi, 0)
  }

  /** Pose the test body: squashed, fluffed as the envelope allows, and lifted onto its toes or heels for a pitch, as the motion does. */
  private stand(squash: number, pitch: number): void {
    const body = this.body
    const puff = 1 + this.envelope.puff * 0.14
    const tip = Math.sin(pitch)
    body.squash = squash
    body.puff = this.envelope.puff
    body.y = body.ground + Math.max(0, BIRD.toe * tip, -BIRD.heel * tip) * (puff / Math.sqrt(squash)) * body.scale
    this.stretch = body.scale * puff * Math.max(1 / Math.sqrt(squash), squash)
  }

  /** The test body facing `heading` at every squash in the envelope and every body pitch given: the tests below try each. */
  private prepare(heading: number, pitches: readonly number[]): void {
    let n = 0
    for (const s of this.envelope.squashes) {
      for (const pitch of pitches) {
        this.stand(s, pitch)
        if (n === this.stands.length) this.stands.push({ torso: frame(), stretch: 1 })
        const stand = this.stands[n++]
        torsoFrame(this.body, heading, pitch, stand.torso)
        stand.stretch = this.stretch
      }
    }
    this.standCount = n
  }

  /** Its body and tail, with every flick of the tail. */
  private bodyFree(): boolean {
    const p = this.point
    const tips = BIRD.tailTips
    for (let n = 0; n < this.standCount; n++) {
      const torso = this.stands[n].torso
      for (let i = 0; i < TORSO.length; i += 3) if (this.hit(apply(torso, TORSO[i], TORSO[i + 1], TORSO[i + 2], p))) return false
      for (const flick of FLICK_TURNS) {
        const tail = tailFrame(torso, flick, this.part)
        for (let i = 0; i < tips.length; i++) if (this.hit(apply(tail, tips[i][0], tips[i][1], tips[i][2], p))) return false
      }
    }
    return true
  }

  /** Its head turned by `yaw` and pitched by `headPitch`, at every tilt. */
  private headFree(yaw: number, headPitch: number): boolean {
    const p = this.point
    const beak = BIRD.beakTip
    const ball = BIRD.headBall.centre
    const crest = BIRD.crest
    const heads = this.heads
    for (let t = 0; t < TILTS.length; t++) headTurn(yaw, headPitch, TILTS[t], heads[t])
    for (let n = 0; n < this.standCount; n++) {
      const { torso, stretch } = this.stands[n]
      for (let t = 0; t < TILTS.length; t++) {
        const head = headFrame(torso, heads[t], this.part)
        if (TILTS[t] === 0) {
          if (this.hit(apply(head, beak[0], beak[1], beak[2], p))) return false
          if (this.ballHit(apply(head, ball[0], ball[1], ball[2], p), BALL * stretch)) return false
        }
        // A tilt swings the crest far more than the ball it sits on.
        for (let i = 0; i < crest.length; i++) if (this.hit(apply(head, crest[i][0], crest[i][1], crest[i][2], p))) return false
      }
    }
    return true
  }

  /** Whether nothing comes near its head however it turns it. */
  private headOpen(): boolean {
    const pivot = HEAD_PIVOT
    for (let n = 0; n < this.standCount; n++) {
      const { torso, stretch } = this.stands[n]
      if (this.ballHit(apply(torso, pivot[0], pivot[1], pivot[2], this.point), HEAD_REACH * stretch)) return false
    }
    return true
  }

  /** Whether nothing comes near one wing however far it opens. Side +1 is the right wing. */
  private wingOpen(side: number): boolean {
    const root = BIRD.wingRoot
    for (let n = 0; n < this.standCount; n++) {
      const { torso, stretch } = this.stands[n]
      if (this.ballHit(apply(torso, side * root[0], root[1], root[2], this.point), WING_REACH * stretch)) return false
    }
    return true
  }

  /** One wing opened by `angle`. */
  private wingFree(side: number, angle: number): boolean {
    const p = this.point
    const turn = wingTurn(side, angle, this.wing)
    for (let n = 0; n < this.standCount; n++) {
      const wing = wingFrame(this.stands[n].torso, side, turn, this.part)
      for (const local of BIRD.wingPlate) if (this.hit(apply(wing, local[0], local[1], local[2], p))) return false
      for (const local of BIRD.wingAccent) if (this.hit(apply(wing, local[0], local[1], local[2], p))) return false
    }
    return true
  }

  private yawLimit(side: number, pitchLo: number, pitchHi: number): number {
    let limit = 0
    for (let step = 1; step * YAW_STEP < HEAD_YAW + YAW_STEP - 1e-9; step++) {
      const yaw = Math.min(step * YAW_STEP, HEAD_YAW)
      const y = side * yaw
      if (!this.headFree(y, 0) || !this.headFree(y, pitchLo) || !this.headFree(y, pitchHi)) break
      limit = yaw
    }
    return limit
  }

  private wingLimit(side: number): number {
    for (let angle = BIRD.wingOpen; angle > 0; angle -= WING_STEP) if (this.wingFree(side, angle)) return angle
    return 0
  }
}
