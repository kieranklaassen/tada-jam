import * as THREE from 'three'
import { MAX_HELD, RACK, type CellMotion, type GardenController } from '../controller'
import { CENTRE } from '../flow'
import type { Point } from '../input'
import { cellIndex, COLS, N, PLOTS, ROWS, type Side } from '../layout'
import { baseOpenings, PIECE_WEIGHT, type PieceKind } from '../pieces'
import { pieceAt } from '../state'
import { colour, MeshBuilder } from './build'
import { CarryGround } from './carry'
import { celMaterial } from './materials'
import { uvRect, type RegionName } from './paint'
import type { Projector } from './projector'
import { cellX, floorY, groundY, PIPE_Y, RACK_Y, RACK_Z, rackX, ROW_DEPTH, rowZ, WALL_OUT } from './world'

// The bamboo kit, drawn with one instanced mesh per part (KTD5): trough
// arms, the lashed hub on its stand, the sluice frame and board, and the
// waterwheel with its mill hut, millstone and windchime. The same meshes
// draw the pieces on the hillside, on the rack, and in a child's hand, so
// the whole kit costs eight draw calls however much is built.

const R = 0.11
const INNER = 0.78
const ARM_LENGTH = 0.5
/** The hub's outer and inner wall: the arms stop at the outer one, and water inside the hub stays within the inner one. */
export const HUB_OUTER = 0.14
export const HUB_INNER = 0.118
export const WHEEL_Y = 0.3
export const WHEEL_R = 0.26
const RACK_SCALE = 1
/** A held piece floats this far above its cell; dropped, it falls the rest of the way before it squashes. */
const HOVER_LIFT = 0.2
/** Held over a piece it would swap out, it floats this far over that piece's top instead, clear of its bob. */
const HOVER_CLEAR = 0.06
/** Carried over the hillside it floats this far above the hill's plane, and at least this far over anything under it. */
export const CARRY_LIFT = 0.3
const CARRY_CLEAR = 0.2
const HELD_SCALE = 1.04
/** How high each piece stands over its floor: its hub's rim, the sluice with its board fully raised, the wheel's top. */
export const PIECE_TOP: Record<PieceKind, number> = { straight: PIPE_Y + 0.022, bend: PIPE_Y + 0.022, split: PIPE_Y + 0.022, sluice: 0.58, wheel: 0.6 }
/** How far north of its cell's middle a piece on the hillside may reach: to just short of the face of the wall behind. */
export const WALL_REACH = ROW_DEPTH / 2 - WALL_OUT - 0.005
const DROP_SECONDS = 0.07
/**
 * A ghost press nudges the piece this far the way a real tap would move it (a fifth of a quarter turn, a third of the
 * board's travel) and lets it spring back: it shows what a tap does without showing where the piece should end up.
 */
const PRESS_TWIST = 0.2
const PRESS_GATE = 0.35
/** A sluice board's lower edge over the floor when it is down, and how far it rises when the sluice is open. */
export const BOARD_FOOT = PIPE_Y - 0.06
export const BOARD_TRAVEL = 0.16
/** Nearer its rest than this, a piece counts as at rest. */
const SETTLED = 1e-3
/** Turned further than this off its rest, a piece swings its arms through where water falls onto it. */
export const SWINGING = 0.35
const CAPACITY = { arm: 160, hub: 60, frame: 40, board: 40, wheel: 24, hut: 24, stone: 24, chime: 24 }

/** Somewhere to put soft shadows on the ground (centre, size, strength 0..1): a round blob, or a streak under a pipe arm. */
export type ShadowSink = {
  shadow(x: number, y: number, z: number, radius: number, strength: number): void
  /** Stretched along `yaw` (the same yaw as an arm; 0 runs north–south): `length` along it, `width` across. */
  streak(x: number, y: number, z: number, yaw: number, length: number, width: number, strength: number): void
}

/**
 * How a placed piece stands this frame off the pose its water is laid for: turned further by `yaw`, raised by `lift`,
 * squashed by `squash` (and widened to match), its sluice board raised to `gate` (1 is fully up).
 */
export type PiecePose = { yaw: number; lift: number; squash: number; gate: number }

/** Something falling water lands on top of this frame: a piece in a hand, or a placed one swinging round. */
export type Cover = { x: number; z: number; reach: number; bottom: number; top: number }

/** What the ghost hand does to the bamboo in a demonstration: carries a piece (`kind`, or none), or presses one to turn it. */
export type DemoPiece = {
  kind: PieceKind | null
  at: THREE.Vector3
  scale: number
  /** The cell pressed in a turn demonstration (-1 for none), and how far in the press is, 0..1. */
  pressCell: number
  press: number
}

type Part = keyof typeof CAPACITY
const PARTS = Object.keys(CAPACITY) as Part[]
const PART_NAMES: Record<Part, string> = {
  arm: 'bamboo-arm',
  hub: 'bamboo-hub',
  frame: 'sluice-frame',
  board: 'sluice-board',
  wheel: 'wheel',
  hut: 'mill-hut',
  stone: 'millstone',
  chime: 'windchime',
}

/** Which piece each drawn part belongs to (the intersection audit's objects): one per cell, rack slot, hand, and the demo. */
const CELL_KEYS = Array.from({ length: COLS * ROWS }, (_, i) => `piece-${i}`)
const RACK_KEYS = RACK.map((_, slot) => `rack-${slot}`)
const HELD_KEYS = Array.from({ length: MAX_HELD }, (_, i) => `held-${i}`)
const DEMO_KEY = 'demo-piece'

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

/** Where an arm's inner end meets the outside of the hub's wall, this far out from the cell centre `x` to its side. */
const hubFace = (x: number) => -Math.sqrt(HUB_OUTER * HUB_OUTER - x * x)

/** A half-culm trough from the hub's wall to the cell's north edge, open on top, pale inside. */
function armGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  const r = uvRect('bamboo')
  const u = (t: number) => r.u0 + (r.u1 - r.u0) * t
  const v = (t: number) => r.v0 + (r.v1 - r.v0) * t
  const segs = 8
  const ring = (radius: number, inward: boolean, tint: THREE.Color, u0: number, u1: number) => {
    const base = b.vertexCount
    for (let i = 0; i <= segs; i++) {
      const a = Math.PI + (i / segs) * Math.PI
      const n = V(Math.cos(a), Math.sin(a), 0)
      if (inward) n.negate()
      const x = Math.cos(a) * radius
      const y = PIPE_Y + Math.sin(a) * radius
      b.vertex(V(x, y, hubFace(x)), n, u(u0 + (u1 - u0) * (i / segs)), v(0), tint)
      b.vertex(V(x, y, -ARM_LENGTH), n, u(u0 + (u1 - u0) * (i / segs)), v(1), tint)
    }
    for (let i = 0; i < segs; i++) {
      const a = base + i * 2
      if (inward) b.indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      else b.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  ring(R, false, colour('#ffffff'), 0, 1)
  ring(R * INNER, true, colour('#fff2d0', 1.1), 0.42, 0.58)
  const rim = colour('#f4ecc8')
  const up = V(0, 1, 0)
  for (const side of [-1, 1]) {
    const base = b.vertexCount
    b.vertex(V(side * R, PIPE_Y, hubFace(R)), up, u(0.5), v(0), rim)
    b.vertex(V(side * R * INNER, PIPE_Y, hubFace(R * INNER)), up, u(0.5), v(0), rim)
    b.vertex(V(side * R, PIPE_Y, -ARM_LENGTH), up, u(0.5), v(1), rim)
    b.vertex(V(side * R * INNER, PIPE_Y, -ARM_LENGTH), up, u(0.5), v(1), rim)
    if (side > 0) b.indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3)
    else b.indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2)
  }
  const cap = b.vertexCount
  const back = V(0, 0, -1)
  for (let i = 0; i <= segs; i++) {
    const a = Math.PI + (i / segs) * Math.PI
    b.vertex(V(Math.cos(a) * R, PIPE_Y + Math.sin(a) * R, -ARM_LENGTH), back, u(0.1), v(0.5), rim)
    b.vertex(V(Math.cos(a) * R * INNER, PIPE_Y + Math.sin(a) * R * INNER, -ARM_LENGTH), back, u(0.1), v(0.5), rim)
  }
  for (let i = 0; i < segs; i++) {
    const a = cap + i * 2
    b.indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  return b.build()
}

type Solid = Extract<RegionName, 'wood' | 'bamboo' | 'rock' | 'thatch'>

function place(b: MeshBuilder, g: THREE.BufferGeometry, tint: string, region: Solid, at: THREE.Vector3, rotation?: THREE.Euler, scale?: THREE.Vector3): void {
  b.append(g, colour(tint), region, new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(rotation ?? new THREE.Euler()), scale ?? V(1, 1, 1)))
  g.dispose()
}

function box(b: MeshBuilder, w: number, h: number, d: number, at: THREE.Vector3, tint: string, region: Solid, rotation?: THREE.Euler): void {
  place(b, new THREE.BoxGeometry(w, h, d), tint, region, at, rotation)
}

function cylinder(b: MeshBuilder, rTop: number, rBottom: number, h: number, segs: number, at: THREE.Vector3, tint: string, region: Solid, rotation?: THREE.Euler, open = false): void {
  place(b, new THREE.CylinderGeometry(rTop, rBottom, h, segs, 1, open), tint, region, at, rotation)
}

/** The lashed joint at a piece's centre (open on top so the water shows) on a crossed stand. */
function hubGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  const top = PIPE_Y + 0.022
  cylinder(b, HUB_OUTER, HUB_OUTER, 0.14, 14, V(0, top - 0.07, 0), '#ffffff', 'bamboo', undefined, true)
  const inner = new THREE.CylinderGeometry(HUB_INNER, HUB_INNER, 0.13, 14, 1, true)
  inner.scale(-1, 1, 1)
  place(b, inner, '#fff0cc', 'bamboo', V(0, top - 0.065, 0))
  place(b, new THREE.CircleGeometry(0.12, 14), '#e8d8a8', 'bamboo', V(0, PIPE_Y - 0.07, 0), new THREE.Euler(-Math.PI / 2, 0, 0))
  cylinder(b, 0.145, 0.145, 0.03, 14, V(0, top - 0.016, 0), '#6a4a2c', 'wood', undefined, true)
  const leg = PIPE_Y - 0.1
  for (const side of [-1, 1]) {
    box(b, 0.03, leg * 1.4, 0.03, V(side * 0.07, leg / 2, 0.05), '#b08a5a', 'wood', new THREE.Euler(0, 0, side * 0.7))
    box(b, 0.03, leg * 1.4, 0.03, V(side * 0.07, leg / 2, -0.05), '#a07a4a', 'wood', new THREE.Euler(0, 0, -side * 0.7))
  }
  return b.build()
}

function frameGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  for (const x of [-0.12, 0.12]) box(b, 0.036, 0.46, 0.04, V(x, 0.23, 0), '#9a7048', 'wood')
  box(b, 0.3, 0.04, 0.05, V(0, 0.46, 0), '#b08058', 'wood')
  box(b, 0.34, 0.025, 0.07, V(0, 0.49, 0), '#7a5436', 'wood')
  return b.build()
}

function boardGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  box(b, 0.2, 0.16, 0.026, V(0, 0, 0), '#d09a5c', 'wood')
  box(b, 0.028, 0.14, 0.03, V(0, 0.14, 0), '#8a5a34', 'wood')
  box(b, 0.1, 0.03, 0.03, V(0, 0.21, 0), '#8a5a34', 'wood')
  return b.build()
}

/** A little wheel facing the camera: two rims, spokes, paddles and a hub, around the z axis. */
function wheelGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  for (const z of [-0.05, 0.05]) place(b, new THREE.TorusGeometry(WHEEL_R - 0.03, 0.018, 5, 22), '#b07a48', 'wood', V(0, 0, z))
  // Each spoke sits a hair off the last where they cross at the axle, so their faces never share a depth.
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI
    for (const z of [-0.05, 0.05]) box(b, 0.022, WHEEL_R * 1.9, 0.02, V(0, 0, z + Math.sign(z) * (i - 1) * 0.003), '#8a5a34', 'wood', new THREE.Euler(0, 0, a))
  }
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    box(b, 0.1, 0.02, 0.14, V(Math.cos(a) * (WHEEL_R - 0.015), Math.sin(a) * (WHEEL_R - 0.015), 0), '#d8a468', 'wood', new THREE.Euler(0, 0, a))
  }
  cylinder(b, 0.045, 0.045, 0.16, 10, V(0, 0, 0), '#6a4a30', 'wood', new THREE.Euler(Math.PI / 2, 0, 0))
  return b.build()
}

/** The mill hut: plank walls and a thatched gable roof. */
function hutGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  box(b, 0.26, 0.2, 0.24, V(0, 0.1, 0), '#caa070', 'wood')
  box(b, 0.07, 0.11, 0.01, V(-0.05, 0.075, 0.121), '#4a3020', 'wood')
  place(b, new THREE.CylinderGeometry(0.19, 0.19, 0.34, 3, 1), '#f0d8a0', 'thatch', V(0, 0.27, 0), new THREE.Euler(0, 0, Math.PI / 2), V(1, 0.62, 1.15))
  return b.build()
}

function stoneGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  cylinder(b, 0.1, 0.105, 0.045, 14, V(0, 0.0225, 0), '#c8c4b8', 'rock')
  cylinder(b, 0.092, 0.095, 0.045, 14, V(0, 0.07, 0), '#e0dcd0', 'rock')
  box(b, 0.015, 0.02, 0.08, V(0, 0.1, 0.06), '#6a4a30', 'wood')
  return b.build()
}

function chimeGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  box(b, 0.09, 0.012, 0.012, V(0, 0, 0), '#6a4a30', 'wood')
  for (const [x, h] of [
    [-0.03, 0.08],
    [0, 0.1],
    [0.03, 0.07],
  ]) {
    box(b, 0.004, 0.03, 0.004, V(x, -0.015, 0), '#3a2a20', 'wood')
    cylinder(b, 0.01, 0.01, h, 6, V(x, -0.03 - h / 2, 0), '#ffffff', 'bamboo')
  }
  return b.build()
}

/** A part built facing north turns to face a side (indexed N, E, S, W). */
export const SIDE_YAW: readonly number[] = [0, -Math.PI / 2, Math.PI, Math.PI / 2]

export class PiecesView {
  readonly group = new THREE.Group()
  /** This frame's placed pieces that stand off the pose their water is laid for, by cell. */
  readonly poses = new Map<number, PiecePose>()
  /** This frame's covers over the hillside: `covers[0..coverCount)`. */
  readonly covers: Cover[] = Array.from({ length: MAX_HELD + 2 + COLS * ROWS }, () => ({ x: 0, z: 0, reach: 0, bottom: 0, top: 0 }))
  coverCount = 0
  private readonly posePool: PiecePose[] = Array.from({ length: COLS * ROWS }, () => ({ yaw: 0, lift: 0, squash: 1, gate: 1 }))
  private readonly meshes: Record<Part, THREE.InstancedMesh>
  private readonly counts: Record<Part, number> = { arm: 0, hub: 0, frame: 0, board: 0, wheel: 0, hut: 0, stone: 0, chime: 0 }
  private readonly material: THREE.ShaderMaterial
  private readonly projector: Projector
  /** Which side each wheel's water comes from, refreshed when the build changes. */
  private readonly wheelEntry = new Map<number, Side>()
  private buildVersion = -1
  private readonly base = new THREE.Matrix4()
  private readonly local = new THREE.Matrix4()
  private readonly out = new THREE.Matrix4()
  private readonly shift = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly p = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  private readonly e = new THREE.Euler()
  private readonly hill = new THREE.Vector3()
  private readonly toward = new THREE.Vector3()
  private readonly owners: Record<Part, string[]>
  private owner = ''
  private baseYaw = 0
  private baseWidth = 1
  /** How far north of the base the current piece may reach (world units): the wall behind its cell, if it has one. */
  private reach = Infinity
  private readonly ground = new CarryGround(RACK.length)
  private readonly cropTops: Float32Array

  /** `cropTops`: the top (world y) of each plot's crop at its fullest reach. */
  constructor(atlas: THREE.Texture, projector: Projector, cropTops: Float32Array) {
    this.projector = projector
    this.cropTops = cropTops
    this.material = celMaterial({ map: atlas, outline: 0.9 })
    const build: Record<Part, () => THREE.BufferGeometry> = {
      arm: armGeometry,
      hub: hubGeometry,
      frame: frameGeometry,
      board: boardGeometry,
      wheel: wheelGeometry,
      hut: hutGeometry,
      stone: stoneGeometry,
      chime: chimeGeometry,
    }
    const meshes = {} as Record<Part, THREE.InstancedMesh>
    const owners = {} as Record<Part, string[]>
    for (const part of PARTS) {
      const mesh = new THREE.InstancedMesh(build[part](), this.material, CAPACITY[part])
      mesh.name = PART_NAMES[part]
      mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
      mesh.frustumCulled = false
      mesh.count = 0
      owners[part] = new Array<string>(CAPACITY[part]).fill('')
      mesh.userData.jamInstanceObjects = owners[part]
      meshes[part] = mesh
      this.group.add(mesh)
    }
    this.meshes = meshes
    this.owners = owners
  }

  private push(part: Part): void {
    const i = this.counts[part]
    if (i >= CAPACITY[part]) return
    this.out.multiplyMatrices(this.base, this.local)
    this.meshes[part].setMatrixAt(i, this.out)
    this.owners[part][i] = this.owner
    this.counts[part] = i + 1
  }

  private part(part: Part, x: number, y: number, z: number, yaw: number): void {
    this.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw)
    // An arm short of the wall behind its cell keeps its inner end on the hub's wall.
    const outer = part === 'arm' ? Math.min(ARM_LENGTH, armReach(this.baseYaw + yaw, this.reach / this.baseWidth)) : ARM_LENGTH
    const k = (outer - HUB_OUTER) / (ARM_LENGTH - HUB_OUTER)
    this.local.compose(this.p.set(x, y, z), this.q, this.s.set(1, 1, k))
    if (k !== 1) this.local.multiply(this.shift.makeTranslation(0, 0, (HUB_OUTER * (k - 1)) / k))
    this.push(part)
  }

  private spun(part: Part, x: number, y: number, z: number, rx: number, ry: number, rz: number): void {
    this.e.set(rx, ry, rz)
    this.local.makeRotationFromEuler(this.e).setPosition(x, y, z)
    this.push(part)
  }

  private setBase(x: number, y: number, z: number, yaw: number, scale: number, squash: number, reach = Infinity): void {
    this.q.setFromAxisAngle(THREE.Object3D.DEFAULT_UP, yaw)
    const wide = 1 / Math.sqrt(Math.max(0.3, squash))
    this.base.compose(this.p.set(x, y, z), this.q, this.s.set(scale * wide, scale * squash, scale * wide))
    this.baseYaw = yaw
    this.baseWidth = scale * wide
    this.reach = reach
  }

  /** What a carried piece has to clear this frame: the crops, and the pieces on the hillside and the rack. */
  private refreshGround(garden: GardenController): void {
    const cells = this.ground.cells
    cells.fill(-Infinity)
    for (const plot of PLOTS) cells[cellIndex(plot.c, plot.r)] = this.cropTops[plot.id]
    for (const piece of garden.state.pieces) cells[cellIndex(piece.c, piece.r)] = floorY(piece.r) + PIECE_TOP[piece.kind]
    for (let slot = 0; slot < RACK.length; slot++) this.ground.rack[slot] = RACK_Y + PIECE_TOP[RACK[slot]] * RACK_SCALE * 1.05
  }

  /** Every part of one piece around the current base transform. */
  private emit(kind: PieceKind, open: boolean, m: CellMotion | null, entry: Side, now: number, gateNudge = 0): void {
    if (kind === 'wheel') {
      this.part('arm', 0, 0, 0, SIDE_YAW[entry])
      const angle = m?.wheelAngle ?? 0
      this.spun('wheel', 0, WHEEL_Y, 0, 0, 0, -angle)
      this.spun('hut', 0.3, 0, -0.27, 0, 0, 0)
      this.spun('stone', -0.31, 0, 0.3, 0, angle * 0.5, 0)
      const ring = m ? Math.min(1, Math.abs(m.wheelSpeed) / 3) : 0
      // The chime hangs under the eave, between the hut's front and the paddles, low enough that its bar tilts clear of
      // the thatch, and swings mostly along them.
      this.spun('chime', 0.3, 0.212, -0.11, Math.sin(now * 5.3) * 0.15 * ring, 0, Math.sin(now * 3.7) * 0.3 * ring)
      return
    }
    const openings = baseOpenings(kind)
    for (let i = 0; i < openings.length; i++) this.part('arm', 0, 0, 0, SIDE_YAW[openings[i]])
    this.part('hub', 0, 0, 0, 0)
    if (kind === 'sluice') {
      this.part('frame', 0, 0, 0, 0)
      const lift = (m ? m.gate : open ? 1 : 0) + gateNudge
      this.part('board', 0, BOARD_FOOT + 0.08 + lift * BOARD_TRAVEL, 0, 0)
    }
  }

  private refreshEntries(garden: GardenController): void {
    this.buildVersion = garden.buildVersion
    this.wheelEntry.clear()
    for (const segment of garden.flow.segments) {
      if (segment.kind !== 'channel' || segment.b !== CENTRE || segment.a === CENTRE) continue
      const index = cellIndex(segment.c, segment.r)
      if (!this.wheelEntry.has(index)) this.wheelEntry.set(index, segment.a as Side)
    }
  }

  /**
   * A pipe lies just above the grass: a shadow under each arm, turning with the piece, sets it on the hill instead of
   * over it. Seen from the camera's pitch an arm hides the ground to about 1.7 radii out, so the streak spreads past that.
   */
  private armShadows(kind: PieceKind, x: number, y: number, z: number, yaw: number, shadows: ShadowSink): void {
    const openings = baseOpenings(kind)
    for (let i = 0; i < openings.length; i++) {
      const arm = yaw + SIDE_YAW[openings[i]]
      const reach = ARM_LENGTH * 0.5
      shadows.streak(x - Math.sin(arm) * reach, y, z - Math.cos(arm) * reach, arm, ARM_LENGTH * 1.2, R * 5.5, 1)
    }
    shadows.shadow(x, y, z, kind === 'sluice' ? 0.36 : 0.28, 1)
  }

  private cover(x: number, z: number, reach: number, bottom: number, height: number): void {
    if (this.coverCount >= this.covers.length) return
    const cover = this.covers[this.coverCount++]
    cover.x = x
    cover.z = z
    cover.reach = reach
    cover.bottom = bottom
    cover.top = bottom + height
  }

  update(garden: GardenController, shadows: ShadowSink, demo: DemoPiece): void {
    if (garden.buildVersion !== this.buildVersion) this.refreshEntries(garden)
    for (let i = 0; i < PARTS.length; i++) this.counts[PARTS[i]] = 0
    this.poses.clear()
    this.coverCount = 0
    const now = garden.now
    const pieces = garden.state.pieces
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]
      const index = cellIndex(piece.c, piece.r)
      const m = garden.motion[index]
      const since = now - m.placedAt
      const land = since - DROP_SECONDS
      const fall = since < DROP_SECONDS ? 1 - (since / DROP_SECONDS) ** 2 : 0
      // Light bamboo springs on landing; the heavy wheel thuds, squashing less and settling at once.
      const heavy = Math.sqrt(PIECE_WEIGHT[piece.kind])
      const squash = since < DROP_SECONDS ? 1.1 : land < 1.2 ? 1 - (0.3 / heavy) * Math.cos((land * 16) / heavy) * Math.exp(-land * 6 * heavy) : 1
      const tapped = now - m.tappedAt
      const hop = (tapped < 0.28 ? Math.sin((tapped / 0.28) * Math.PI) * 0.06 : 0) + fall * HOVER_LIFT
      const x = cellX(piece.c)
      const z = rowZ(piece.r)
      const y = floorY(piece.r)
      const pressed = demo.pressCell === index ? demo.press : 0
      const sluice = piece.kind === 'sluice'
      const yaw = piece.kind === 'wheel' ? 0 : -(m.turn + (sluice ? 0 : PRESS_TWIST * pressed)) * (Math.PI / 2)
      const gateNudge = sluice ? (piece.open ? -PRESS_GATE : PRESS_GATE) * pressed : 0
      const turned = piece.kind === 'wheel' ? 0 : yaw + m.target * (Math.PI / 2)
      const gate = sluice ? m.gate + gateNudge : 1
      const rest = piece.open || !sluice ? 1 : 0
      if (Math.abs(turned) > SETTLED || hop > SETTLED || Math.abs(squash - 1) > SETTLED || Math.abs(gate - rest) > SETTLED) {
        const pose = this.posePool[index]
        pose.yaw = turned
        pose.lift = hop
        pose.squash = squash
        pose.gate = gate
        this.poses.set(index, pose)
      }
      if (Math.abs(turned) > SWINGING) this.cover(x, z, ARM_LENGTH / Math.sqrt(Math.max(0.3, squash)), y + hop, PIECE_TOP[piece.kind] * squash)
      this.setBase(x, y + hop, z, yaw, 1, squash, WALL_REACH)
      this.owner = CELL_KEYS[index]
      this.emit(piece.kind, piece.open, m, this.wheelEntry.get(index) ?? N, now, gateNudge)
      if (piece.kind === 'wheel') shadows.shadow(x, y, z, 0.44, 1)
      else this.armShadows(piece.kind, x, y, z, yaw, shadows)
    }
    for (let slot = 0; slot < RACK.length; slot++) {
      const tapped = now - garden.rackTappedAt[slot]
      const hop = tapped < 0.35 ? Math.sin((tapped / 0.35) * Math.PI) * 0.1 : 0
      const breathe = 1 + garden.guide.glow * 0.05 * Math.sin(now * 3 + slot)
      const x = rackX(slot, RACK.length)
      const yaw = RACK[slot] === 'wheel' ? 0 : Math.PI * 0.06 * (slot % 2 === 0 ? 1 : -1)
      this.setBase(x, RACK_Y + hop, RACK_Z, yaw, RACK_SCALE * breathe, 1)
      this.owner = RACK_KEYS[slot]
      this.emit(RACK[slot], true, null, N, now)
      shadows.shadow(x, RACK_Y, RACK_Z, 0.36, 1)
    }
    if (garden.held.size > 0) this.refreshGround(garden)
    let hand = 0
    for (const held of garden.held.values()) {
      this.owner = HELD_KEYS[hand++]
      const weight = PIECE_WEIGHT[held.kind]
      const lifted = Math.min(1, (now - held.since) / (0.13 * weight))
      const bob = (Math.sin((now * 6) / weight + held.id) * 0.018) / weight
      const yaw = held.kind === 'wheel' ? 0 : -held.turn * (Math.PI / 2)
      if (held.hover) {
        const x = cellX(held.hover.c)
        const z = rowZ(held.hover.r)
        const y = floorY(held.hover.r)
        const under = pieceAt(garden.state, held.hover.c, held.hover.r)
        const lift = under ? Math.max(HOVER_LIFT, PIECE_TOP[under.kind] + HOVER_CLEAR) : HOVER_LIFT
        this.setBase(x, y + lift * lifted + bob, z, yaw, HELD_SCALE, 1, WALL_REACH)
        this.cover(x, z, ARM_LENGTH * HELD_SCALE, y + lift * lifted + bob, PIECE_TOP[held.kind] * HELD_SCALE)
        shadows.shadow(x, y, z, 0.4, 0.75)
      } else {
        this.carry(held.at, lifted)
        this.setBase(this.hill.x, this.hill.y + bob, this.hill.z, yaw, HELD_SCALE, 1)
        this.cover(this.hill.x, this.hill.z, ARM_LENGTH * HELD_SCALE, this.hill.y + bob, PIECE_TOP[held.kind] * HELD_SCALE)
        shadows.shadow(this.hill.x, groundY(this.hill.x, this.hill.z), this.hill.z, 0.42, 0.55)
      }
      this.emit(held.kind, held.open, null, N, now)
    }
    if (demo.kind && demo.scale > 0.01) {
      this.setBase(demo.at.x, demo.at.y + 0.26, demo.at.z, 0, demo.scale, 1)
      this.cover(demo.at.x, demo.at.z, ARM_LENGTH * demo.scale, demo.at.y + 0.26, PIECE_TOP[demo.kind] * demo.scale)
      this.owner = DEMO_KEY
      this.emit(demo.kind, true, null, N, now)
      shadows.shadow(demo.at.x, demo.at.y, demo.at.z, 0.4, 0.5 * demo.scale)
    }
    for (let i = 0; i < PARTS.length; i++) {
      const part = PARTS[i]
      const mesh = this.meshes[part]
      mesh.count = this.counts[part]
      mesh.instanceMatrix.needsUpdate = true
    }
  }

  /**
   * Where a piece carried over the hillside floats: over the finger's point on the hill's plane, or further back along
   * the finger's ray (so still under the finger) until it clears the terraces, crops and pieces under it.
   */
  private carry(at: Point, lifted: number): void {
    const hill = this.projector.hill(at, this.hill)
    hill.y += CARRY_LIFT * lifted
    const eye = this.projector.fingerRay(at).origin
    const toward = this.toward.subVectors(hill, eye).normalize()
    if (toward.y > -0.05) return
    for (let i = 0; i < 4; i++) {
      const need = this.ground.under(hill.x, hill.z) + 0.02 + CARRY_CLEAR * lifted
      if (hill.y >= need) return
      hill.addScaledVector(toward, (need - hill.y) / toward.y)
    }
  }

  dispose(): void {
    for (const mesh of Object.values(this.meshes)) mesh.geometry.dispose()
    this.material.dispose()
  }
}

/**
 * How long an arm at world yaw `yaw` (0 points north) may be for no part of it to reach further north of its base
 * than `reach`: its end's rim spans the trough's width across the arm.
 */
export function armReach(yaw: number, reach: number): number {
  const north = Math.cos(yaw)
  if (north <= 1e-6) return Infinity
  return (reach - R * Math.abs(Math.sin(yaw))) / north
}
