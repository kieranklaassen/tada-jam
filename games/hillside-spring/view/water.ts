import * as THREE from 'three'
import type { GardenController } from '../controller'
import { CENTRE, FROM_EDGE, INTO_POND, LAND_OFF, LAND_PLOT } from '../flow'
import { cellIndex, E, N, plotAt, ROWS, S, SPRING_COL, W, type Side } from '../layout'
import { opensTo, type Piece } from '../pieces'
import { pieceAt } from '../state'
import { NEVER, WATER_SPEED, type TimedSegment } from '../waterTiming'
import { shared } from './materials'
import { BANK_OUT, BANK_TOP, SOIL } from './plots'
import { armReach, BOARD_FOOT, BOARD_TRAVEL, HUB_OUTER, SIDE_YAW, SWINGING, WALL_REACH, type PiecePose, type PiecesView } from './pieces'
import { backZ, cellX, CREEK_Y, CREEK_Z0, CREEK_Z1, floorY, frontZ, GRID_RIGHT, PIPE_Y, POND, rowZ, SIDE_RISE, SPRING, SPRING_LIP, WALL_OUT } from './world'

// Running water is one ribbon mesh (KTD3). When the build changes, every
// segment becomes a short strip of quads whose vertices carry the times the
// water's head reaches them and leaves them; the shader hides the strip
// outside that window and scrolls a painted flow texture along it at the
// water's own speed, so a new stream visibly runs downhill and a cut one
// drains, with nothing animated on the CPU while the kit stands still. While
// a piece turns, lands or hops, or one is held, the strips are rewritten each
// frame: water a piece holds moves with it, and water falling onto a piece
// that is moving or in a hand lands on top of it. Water running loose across the
// grass also darkens a wide band of wet ground under itself that dries a few
// seconds after it stops, so a stray stream leaves a trace of where it went.
// Still water (spring pool, creek, pond) is a second, static mesh.

const MAX_VERTS = 12000
const MAX_INDEX = 18000
const WATER_LEVEL = PIPE_Y - 0.028
/**
 * Water in a trough, or pouring from or into one, is at most the trough's width at the waterline. A bend turns it on
 * a circle this far from the hub's middle along each arm: as tight as a ribbon that wide turns without folding, and
 * inside the hub's wall.
 */
const IN_TROUGH = 0.85
const ELBOW = 0.078
/**
 * Water through a hub stops short of its wall on both sides, and the wall's rim stands over the gap: from an arm's
 * end this far out from the hub's middle, and from this far in, where the widest ribbon's corners clear the wall.
 */
const HUB_OUT = HUB_OUTER + 0.008
const HUB_IN = 0.08
/**
 * Loose water on a floor where a piece stands runs round its stand (the crossed legs, a sluice's frame posts, both
 * spread wider while the piece squashes on landing): this far to one side of the stand's middle while it passes the
 * stand, which reaches this far from the middle along the row.
 */
const AROUND = 0.31
const STAND = 0.18
/** From behind the stand it runs straight on this far before swinging out, so its width, turned across the row as it swings, stays off the wall behind. */
const LEAD = 0.06
/** Water brimming over a hub leaves its rim just outside the lashing and lands beside the stand. */
const BRIM = HUB_OUTER + 0.012
const BRIM_LANDING = AROUND
/** Held back by a closed sluice's board, water in the hub stops this far short of its middle, at the board's face. */
const BOARD_FACE = 0.02
/** A rising sluice board lets the water under it once it is this far up: its lower edge clears the water. */
const BOARD_CLEAR = (WATER_LEVEL + 0.012 - BOARD_FOOT) / BOARD_TRAVEL
/** An arm stops short of the wall behind its cell; water in it starts this far inside its closed end. */
const END_GAP = 0.02
const NORTH_END = WALL_REACH - END_GAP
/** Water falling into a north arm lands this far in front of the wall, well inside the arm. */
const INTO_MOUTH = 0.14
/** Loose water runs out over the lawn's lip, which overhangs the wall's face, and falls from just past its edge. */
const OVER_LIP = WALL_OUT + 0.015
/** Water falling over a wall onto bare floor lands this far in front of the wall and trickles on from there. */
const FALL_LANDING = 0.1
const FLOOR_WET = 0.014
const ALONG = 2
/** Falling water landing on a cover lands this far over its top. */
const ON_TOP = 0.012

/** What of the kit the water follows: placed pieces off their rest pose, and what falling water lands on top of. */
type Kit = Pick<PiecesView, 'poses' | 'covers' | 'coverCount'>
const STILL_KIT: Kit = { poses: new Map(), covers: [], coverCount: 0 }
/** aLook.x below zero marks a wet-ground strip rather than water. */
const WET = -1
const DRY_SECONDS = 4

const RIBBON_VERTEX = /* glsl */ `
attribute vec2 aTime;
attribute vec2 aLook;
varying vec2 vUv;
varying vec2 vTime;
varying vec2 vLook;
void main() {
  vUv = uv;
  vTime = aTime;
  vLook = aLook;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const RIBBON_FRAGMENT = /* glsl */ `
uniform sampler2D uFlow;
uniform float uTime;
uniform float uScroll;
uniform vec3 uDeep;
uniform vec3 uLight;
uniform vec3 uFoam;
varying vec2 vUv;
varying vec2 vTime;
varying vec2 vLook;
void main() {
  float head = uTime - vTime.x;
  float tail = vTime.y - uTime;
  float across = vUv.x;
  if (vLook.x < -0.5) {
    if (head < 0.0 || tail < -${DRY_SECONDS.toFixed(1)}) discard;
    float soak = smoothstep(0.0, 0.8, head) * smoothstep(-${DRY_SECONDS.toFixed(1)}, 0.0, tail);
    float patchy = texture2D(uFlow, vec2(across * 0.5, vUv.y * 0.25)).r;
    float band = smoothstep(0.0, 0.3, across) * smoothstep(1.0, 0.7, across);
    gl_FragColor = vec4(0.035, 0.06, 0.012, band * soak * vLook.y * (0.5 + 0.25 * patchy));
    #include <colorspace_fragment>
    return;
  }
  if (head < 0.0 || tail < 0.0) discard;
  float edge = smoothstep(0.0, 0.16, across) * smoothstep(1.0, 0.84, across);
  vec2 uv = vec2(across * 0.35, vUv.y - uTime * uScroll);
  float a = texture2D(uFlow, uv).r;
  float b = texture2D(uFlow, uv * vec2(1.7, 0.6) + vec2(0.31, uTime * 0.4)).r;
  float streak = a * 0.65 + b * 0.35;
  vec3 col = mix(uDeep, uLight, smoothstep(0.35, 0.75, streak) * 0.85 + (1.0 - edge) * 0.2);
  float front = 1.0 - smoothstep(0.0, 0.35, head);
  float foam = max(vLook.x * smoothstep(0.45, 0.8, streak + 0.2), front);
  foam = max(foam, smoothstep(0.82, 0.95, streak) * 0.8);
  col = mix(col, uFoam, foam);
  float alpha = edge * mix(0.82, 0.96, foam) * vLook.y * smoothstep(0.0, 0.12, tail);
  gl_FragColor = vec4(col, alpha);
  #include <colorspace_fragment>
}
`

const STILL_VERTEX = /* glsl */ `
attribute float aDrift;
varying vec2 vWorld;
varying vec2 vUv;
varying float vDrift;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xz;
  vUv = uv;
  vDrift = aDrift;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const STILL_FRAGMENT = /* glsl */ `
uniform sampler2D uFlow;
uniform float uTime;
uniform vec3 uDeep;
uniform vec3 uLight;
uniform vec3 uFoam;
varying vec2 vWorld;
varying vec2 vUv;
varying float vDrift;
void main() {
  vec2 p = vWorld * vec2(0.9, 1.6);
  float a = texture2D(uFlow, p.yx * 0.5 + vec2(0.0, uTime * 0.09 * vDrift + uTime * 0.01)).r;
  float b = texture2D(uFlow, p * 0.37 + vec2(uTime * 0.013, -uTime * 0.02)).r;
  float n = a * 0.5 + b * 0.5;
  float edge = smoothstep(0.0, 0.3, vUv.x) * smoothstep(1.0, 0.7, vUv.x);
  vec3 col = mix(uDeep, uLight, vUv.y * 0.55 + smoothstep(0.45, 0.8, n) * 0.35);
  col = mix(col, uFoam, smoothstep(0.84, 0.95, n) * 0.7 + (1.0 - edge) * 0.25);
  gl_FragColor = vec4(col, mix(0.7, 0.95, edge));
  #include <colorspace_fragment>
}
`

type Look = { width: number; foam: number; fade: boolean }

/** Scratch path: up to 10 samples of a segment. */
const MAX_SAMPLES = 13
const path = Array.from({ length: MAX_SAMPLES }, () => new THREE.Vector3())
const MAX_SPLASHES = 64

export class WaterView {
  readonly group = new THREE.Group()
  /** Where water lands after a fall or pour: x, y, z, when it starts landing, when it stops, strength. */
  readonly splashes = new Float32Array(MAX_SPLASHES * 6)
  splashCount = 0
  private readonly geometry = new THREE.BufferGeometry()
  private readonly wetGeometry = new THREE.BufferGeometry()
  private readonly positions = new Float32Array(MAX_VERTS * 3)
  private readonly uvs = new Float32Array(MAX_VERTS * 2)
  private readonly times = new Float32Array(MAX_VERTS * 2)
  private readonly looks = new Float32Array(MAX_VERTS * 2)
  private readonly index = new Uint16Array(MAX_INDEX)
  private readonly ribbonMaterial: THREE.ShaderMaterial
  private readonly stillMaterial: THREE.ShaderMaterial
  private readonly still: THREE.Mesh
  private version = -1
  private verts = 0
  private indices = 0
  private readonly a = new THREE.Vector3()
  private readonly b = new THREE.Vector3()
  private readonly c = new THREE.Vector3()
  private readonly dir = new THREE.Vector3()
  private readonly side = new THREE.Vector3()
  private readonly towardA = new THREE.Vector3()
  private readonly towardB = new THREE.Vector3()
  private readonly from = new THREE.Vector3()
  private readonly to = new THREE.Vector3()
  private readonly spot = new THREE.Vector3()
  private readonly offset = new THREE.Vector3()
  private readonly moved = new THREE.Matrix4()
  private readonly leaving = new THREE.Matrix4()
  private readonly arriving = new THREE.Matrix4()
  private readonly step = new THREE.Matrix4()
  /** How much narrower the last pour laid must be to fit the moving mouth it lands in. */
  private narrow = 1
  private garden: GardenController | null = null
  private kit: Kit = STILL_KIT
  /** Whether the last strips were laid for a moving kit, so they are laid again once it stands still. */
  private stirred = false

  constructor(flowTexture: THREE.Texture) {
    const g = this.geometry
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aTime', new THREE.BufferAttribute(this.times, 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aLook', new THREE.BufferAttribute(this.looks, 2).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(new THREE.BufferAttribute(this.index, 1).setUsage(THREE.DynamicDrawUsage))
    g.setDrawRange(0, 0)
    const wet = this.wetGeometry
    for (const name of ['position', 'uv', 'aTime', 'aLook']) wet.setAttribute(name, g.getAttribute(name))
    wet.setIndex(g.getIndex())
    wet.setDrawRange(0, 0)
    const colours = {
      uDeep: { value: new THREE.Color('#2878a8') },
      uLight: { value: new THREE.Color('#8ad2e2') },
      uFoam: { value: new THREE.Color('#f4fbf6') },
    }
    this.ribbonMaterial = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VERTEX,
      fragmentShader: RIBBON_FRAGMENT,
      uniforms: { uFlow: { value: flowTexture }, uTime: shared.time, uScroll: { value: WATER_SPEED * ALONG * 0.5 }, ...colours },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    // The wet ground is a darkening of the grass under the water, drawn from the same buffers just before it.
    const ground = new THREE.Mesh(wet, this.ribbonMaterial)
    ground.name = 'wet-ground'
    ground.frustumCulled = false
    ground.renderOrder = 1.5
    this.group.add(ground)
    const ribbon = new THREE.Mesh(g, this.ribbonMaterial)
    ribbon.name = 'running-water'
    ribbon.frustumCulled = false
    ribbon.renderOrder = 2
    this.group.add(ribbon)

    this.stillMaterial = new THREE.ShaderMaterial({
      vertexShader: STILL_VERTEX,
      fragmentShader: STILL_FRAGMENT,
      uniforms: {
        uFlow: { value: flowTexture },
        uTime: shared.time,
        uDeep: { value: new THREE.Color('#467f7c') },
        uLight: { value: new THREE.Color('#a9cbb8') },
        uFoam: { value: new THREE.Color('#f2f4e6') },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.still = new THREE.Mesh(stillGeometry(), this.stillMaterial)
    this.still.name = 'still-water'
    this.still.renderOrder = 1
    this.group.add(this.still)
  }

  update(garden: GardenController, kit: Kit = STILL_KIT): void {
    const stirred = kit.poses.size > 0 || kit.coverCount > 0
    if (garden.waterVersion === this.version && !stirred && !this.stirred) return
    this.version = garden.waterVersion
    this.stirred = stirred
    this.garden = garden
    this.kit = kit
    this.verts = 0
    this.indices = 0
    this.splashCount = 0
    for (const segment of garden.water) this.wetGround(segment)
    const wet = this.indices
    this.spill(garden)
    for (const segment of garden.water) this.segment(segment)
    const g = this.geometry
    for (const name of ['position', 'uv', 'aTime', 'aLook']) {
      const attribute = g.getAttribute(name) as THREE.BufferAttribute
      attribute.clearUpdateRanges()
      attribute.addUpdateRange(0, this.verts * attribute.itemSize)
      attribute.needsUpdate = true
    }
    const index = g.getIndex()!
    index.clearUpdateRanges()
    index.addUpdateRange(0, this.indices)
    index.needsUpdate = true
    g.setDrawRange(wet, this.indices - wet)
    this.wetGeometry.setDrawRange(0, wet)
  }

  /** Does the cell below catch falling water in an uphill-facing pipe mouth? */
  private catches(c: number, r: number): boolean {
    if (!this.garden || r >= ROWS) return false
    const piece = pieceAt(this.garden.state, c, r)
    return piece !== null && opensTo(piece, N)
  }

  private landY(c: number, r: number): number {
    if (r >= ROWS) return CREEK_Y + 0.01
    if (plotAt(c, r)) return floorY(r) + SOIL + FLOOR_WET
    return floorY(r) + (this.catches(c, r) ? WATER_LEVEL : FLOOR_WET)
  }

  /**
   * The spring's overflow down onto the top terrace: always running. It arcs out clear of the ledge wall's top corner
   * and lands as far in front of the wall as it would inside a north arm, whether or not one catches it.
   */
  private spill(garden: GardenController): void {
    this.garden = garden
    const caught = this.catches(SPRING_COL, 0)
    const end = this.b.set(cellX(SPRING_COL), this.landY(SPRING_COL, 0), backZ(0) + INTO_MOUTH)
    const n = this.pour(SPRING_LIP, end, 0.16, 5, undefined, 0, 0, SPRING_COL, 0, caught)
    if (n === 0) return
    this.strip(n, 0, 0.3, -NEVER, NEVER, 0, { width: (caught ? 0.18 * IN_TROUGH : 0.22) * this.narrow, foam: 0.7, fade: false })
    this.splash(path[n - 1], -NEVER, NEVER, 0.8)
  }

  private splash(at: THREE.Vector3, arrive: number, depart: number, strength: number): void {
    if (this.splashCount >= MAX_SPLASHES) return
    const i = this.splashCount++ * 6
    this.splashes[i] = at.x
    this.splashes[i + 1] = at.y
    this.splashes[i + 2] = at.z
    this.splashes[i + 3] = arrive
    this.splashes[i + 4] = depart
    this.splashes[i + 5] = strength
  }

  /** Where water in a trough meets side `side` of cell (c, r); for a piece off its rest, short of the wall its arm stops at. */
  private sidePoint(c: number, r: number, side: number, y: number, out: THREE.Vector3, pose?: PiecePose): THREE.Vector3 {
    out.set(cellX(c), y, rowZ(r))
    if (pose && side !== CENTRE) {
      const wide = 1 / Math.sqrt(Math.max(0.3, pose.squash))
      const reach = armReach(SIDE_YAW[side] + pose.yaw, WALL_REACH / wide) - END_GAP
      this.sidePoint(c, r, side, y, this.spot)
      const far = Math.hypot(this.spot.x - out.x, this.spot.z - out.z)
      return out.lerp(this.spot, Math.min(1, reach / far))
    }
    if (side === N) out.z = rowZ(r) - NORTH_END
    else if (side === S) out.z = frontZ(r)
    else if (side === E) out.x += 0.5
    else if (side === W) out.x -= 0.5
    return out
  }

  /** A wide, soft band of darkened grass under water running loose over a floor or pouring off the grid. */
  private wetGround(s: TimedSegment): void {
    const y = floorY(s.r) + FLOOR_WET * 0.5
    const x = cellX(s.c)
    const width = 0.56 + 0.2 * Math.sqrt(Math.min(1, s.flow))
    let n = 0
    if (s.kind === 'trickle') {
      const z0 = s.a === FROM_EDGE ? backZ(s.r) + FALL_LANDING : rowZ(s.r) + 0.06
      // Straight rather than along the water's meander: a band this wide folds over itself at every wiggle.
      n = line(this.a.set(x, y, z0), this.b.set(x, y, frontZ(s.r) - 0.02), 5)
    } else if (s.kind === 'pourSide' && s.b === LAND_OFF) {
      const dx = s.a === E ? 1 : -1
      n = 5
      for (let i = 0; i < n; i++) {
        const px = x + dx * (0.7 + i * 0.18)
        path[i].set(px, y + Math.max(0, Math.abs(px) - GRID_RIGHT) * SIDE_RISE + 0.006, rowZ(s.r) + 0.04)
      }
    }
    if (n < 2) return
    const d0 = s.kind === 'trickle' ? s.d0 : s.d1
    const d1 = s.kind === 'trickle' ? s.d1 : s.d1 + 0.5
    this.strip(n, d0, d1, s.tArrive, s.tDepart, s.d0, { width: s.kind === 'trickle' ? width : 0.66, foam: WET, fade: true })
  }

  private segment(s: TimedSegment): void {
    const own = s.kind === 'channel' || s.kind === 'drop'
    const piece = this.garden ? pieceAt(this.garden.state, s.c, s.r) : null
    // Water left in a piece turned under it spills at once, rather than draining through the walls of its arms.
    if (piece && s.kind === 'channel' && s.tDepart < NEVER && !holds(piece, s)) return
    const pose = piece ? this.kit.poses.get(cellIndex(s.c, s.r)) : undefined
    const verts = this.verts
    const splashes = this.splashCount
    this.lay(s, pose)
    if (pose && own) this.carry(this.poseMatrix(pose, s.c, s.r), verts, splashes)
  }


  private lay(s: TimedSegment, pose: PiecePose | undefined): void {
    const width = 0.08 + 0.1 * Math.sqrt(Math.min(1, s.flow))
    const y0 = floorY(s.r)
    const pipe = y0 + WATER_LEVEL
    const x = cellX(s.c)
    let n = 0
    let look: Look = { width, foam: 0, fade: false }
    switch (s.kind) {
      case 'channel': {
        const a = this.sidePoint(s.c, s.r, s.a, pipe, this.a, pose)
        const b = this.sidePoint(s.c, s.r, s.b, pipe, this.b, pose)
        this.channel(s, a, this.c.set(x, pipe, rowZ(s.r)), b, { width: width * IN_TROUGH, foam: 0.05, fade: false }, pose)
        return
      }
      case 'drop': {
        // At the wheel the water falls through the paddles it turns. Anywhere else it has nowhere to go: it brims over
        // the hub's rim on a side with no arm and falls beside the hub, never through its floor.
        const piece = this.garden ? pieceAt(this.garden.state, s.c, s.r) : null
        if (piece && piece.kind !== 'wheel') {
          const side = brimSide(piece)
          const dx = side === E ? 1 : side === W ? -1 : 0
          const dz = side === S ? 1 : side === N ? -1 : 0
          const start = this.a.set(x + dx * BRIM, y0 + PIPE_Y + 0.026, rowZ(s.r) + dz * BRIM)
          n = arc(start, this.b.set(x + dx * BRIM_LANDING, y0 + FLOOR_WET, rowZ(s.r) + dz * BRIM_LANDING), 0.02, 5)
        } else n = line(this.a.set(x, pipe, rowZ(s.r)), this.b.set(x, y0 + FLOOR_WET, rowZ(s.r) + 0.06), 3)
        look = { width: width * 1.1, foam: 0.8, fade: false }
        break
      }
      case 'trickle': {
        const stand = this.garden ? pieceAt(this.garden.state, s.c, s.r) : null
        if (stand && stand.kind !== 'wheel') n = this.round(s, stand, y0 + FLOOR_WET)
        else {
          const z0 = s.a === FROM_EDGE ? backZ(s.r) + FALL_LANDING : rowZ(s.r) + 0.06
          n = meander(x, y0 + FLOOR_WET, z0, frontZ(s.r) + OVER_LIP, s.c * 7 + s.r * 3, s.a === FROM_EDGE ? 7 : 5)
        }
        look = { width: width * 1.4, foam: 0.1, fade: false }
        break
      }
      case 'fall': {
        const start = this.a.set(x, y0 + FLOOR_WET, frontZ(s.r) + OVER_LIP)
        // A fall caught by a pipe below lands well inside its mouth, as narrow as the water in it. One into a bed drops
        // almost straight onto the bank along its back, clear of the plants sprawling over its soil.
        const caught = s.b !== INTO_POND && this.catches(s.c, s.r + 1)
        const bed = s.b !== INTO_POND && plotAt(s.c, s.r + 1) !== null
        const end =
          s.b === INTO_POND
            ? this.b.set(x, CREEK_Y + 0.01, CREEK_Z0 + 0.22)
            : bed
              ? this.b.set(x, floorY(s.r + 1) + BANK_TOP + ON_TOP, backZ(s.r + 1) + 0.5 - BANK_OUT)
              : this.b.set(x, this.landY(s.c, s.r + 1), frontZ(s.r) + (caught ? INTO_MOUTH : FALL_LANDING))
        n = this.pour(start, end, 0.03, 5, undefined, 0, 0, s.c, s.r + 1, caught)
        if (n === 0) return
        look = { width: width * (caught ? IN_TROUGH : 1.3) * this.narrow, foam: 0.75, fade: false }
        break
      }
      case 'pourDown': {
        const start = this.sidePoint(s.c, s.r, S, pipe, this.a, pose)
        const end = s.b === INTO_POND ? this.b.set(x, CREEK_Y + 0.01, CREEK_Z0 + 0.3) : this.b.set(x, this.landY(s.c, s.r + 1), frontZ(s.r) + INTO_MOUTH)
        n = this.pour(start, end, 0.08, 6, pose, s.c, s.r, s.c, s.r + 1, s.b !== INTO_POND && this.catches(s.c, s.r + 1))
        if (n === 0) return
        look = { width: width * IN_TROUGH * this.narrow, foam: 0.6, fade: false }
        break
      }
      case 'pourSide': {
        const dx = s.a === E ? 1 : -1
        const start = this.sidePoint(s.c, s.r, s.a, pipe, this.a, pose)
        if (s.b === LAND_OFF) {
          n = this.pour(start, this.b.set(x + dx * 1.05, y0 + 0.06, rowZ(s.r) + 0.05), 0.1, 6, pose, s.c, s.r, s.c + dx, s.r, false)
          if (n === 0) return
          look = { width: width * IN_TROUGH * this.narrow, foam: 0.6, fade: true }
        } else {
          // Onto a bed it lands on the bank, clear of what grows there, straight out along the arm: the bank is so near
          // that a pour angled along the row would turn its width back into the arm's end. Onto a floor where a piece
          // stands that does not take the water, beside the piece's stand.
          const blocked = this.garden !== null && pieceAt(this.garden.state, s.c + dx, s.r) !== null
          const bed = s.b === LAND_PLOT
          const land = bed ? 1 - BANK_OUT : blocked ? 1 - AROUND : 1
          const end = this.b.set(x + dx * land, y0 + (bed ? BANK_TOP + ON_TOP : FLOOR_WET), rowZ(s.r) + (bed ? 0 : 0.06))
          n = this.pour(start, end, 0.1, 6, pose, s.c, s.r, s.c + dx, s.r, false)
          if (n === 0) return
          look = { width: width * IN_TROUGH * this.narrow, foam: 0.6, fade: false }
        }
        break
      }
      default: {
        const never: never = s.kind
        return never
      }
    }
    this.strip(n, s.d0, s.d1, s.tArrive, s.tDepart, s.d0, look)
    if (s.kind !== 'trickle' && n > 1) {
      const late = (s.d1 - s.d0) / WATER_SPEED
      this.splash(path[n - 1], s.tArrive <= -NEVER ? -NEVER : s.tArrive + late, s.tDepart >= NEVER ? NEVER : s.tDepart + late, Math.min(1, 0.4 + s.flow * 0.6))
    }
  }

  /**
   * Water along a trough from side `a` to `centre` and on to side `b` (either may be the centre): in a piece with a
   * hub, one strip up to the hub's wall, one inside it, one from its wall on, so no water runs through the wall.
   */
  private channel(s: TimedSegment, a: THREE.Vector3, centre: THREE.Vector3, b: THREE.Vector3, look: Look, pose: PiecePose | undefined): void {
    const toA = a.distanceTo(centre)
    const toB = b.distanceTo(centre)
    const piece = this.garden ? pieceAt(this.garden.state, s.c, s.r) : null
    if (piece?.kind === 'wheel') {
      this.strip(line(a, b, 3), s.d0, s.d1, s.tArrive, s.tDepart, s.d0, look)
      return
    }
    const d = (along: number) => s.d0 + ((s.d1 - s.d0) * along) / (toA + toB)
    const towardA = this.towardA.subVectors(a, centre).normalize()
    const towardB = this.towardB.subVectors(b, centre).normalize()
    if (toA > HUB_OUT) this.strip(line(a, this.from.copy(centre).addScaledVector(towardA, HUB_OUT), 2), d(0), d(toA - HUB_OUT), s.tArrive, s.tDepart, s.d0, look)
    const from = this.from.copy(centre).addScaledVector(towardA, Math.min(toA, HUB_IN))
    // A closed sluice's board holds the water back (what is past it goes at once), and so does an opening one until
    // the board's edge clears the water.
    const board = piece?.kind === 'sluice' && (!piece.open || (pose !== undefined && pose.gate < BOARD_CLEAR))
    if (!board || toA > 0) {
      const to = board ? this.to.copy(centre).addScaledVector(towardA, BOARD_FACE) : this.to.copy(centre).addScaledVector(towardB, Math.min(toB, HUB_IN))
      const bend = toA > 0 && toB > 0 && Math.abs(towardA.dot(towardB)) < 0.5
      const n = bend ? elbow(from, centre, to, ELBOW, 13) : line(from, to, 2)
      this.strip(n, d(Math.max(0, toA - HUB_IN)), d(toA + Math.min(toB, HUB_IN)), s.tArrive, s.tDepart, s.d0, look)
    }
    if (toB > HUB_OUT) this.strip(line(this.from.copy(centre).addScaledVector(towardB, HUB_OUT), b, 2), d(toA + HUB_OUT), d(toA + toB), s.tArrive, s.tDepart, s.d0, look)
  }

  /** Writes the scratch path as a strip: width across, distance along, and each vertex's arrive/depart times. */
  private strip(n: number, d0: number, d1: number, tArrive: number, tDepart: number, dRef: number, look: Look): void {
    if (n < 2 || this.verts + n * 2 > MAX_VERTS || this.indices + (n - 1) * 6 > MAX_INDEX) return
    const base = this.verts
    for (let i = 0; i < n; i++) {
      const p = path[i]
      const prev = path[Math.max(0, i - 1)]
      const next = path[Math.min(n - 1, i + 1)]
      this.dir.subVectors(next, prev)
      this.side.set(-this.dir.z, 0, this.dir.x)
      if (this.side.lengthSq() < 1e-6) this.side.set(1, 0, 0)
      this.side.normalize().multiplyScalar(look.width / 2)
      const t = i / (n - 1)
      const d = d0 + (d1 - d0) * t
      const arrive = tArrive <= -NEVER ? -NEVER : tArrive + (d - dRef) / WATER_SPEED
      const depart = tDepart >= NEVER ? NEVER : tDepart + (d - dRef) / WATER_SPEED
      const fade = !look.fade ? 1 : look.foam === WET ? Math.min(1, 2.5 * Math.sin(Math.PI * t)) : 1 - t * t
      for (let k = 0; k < 2; k++) {
        const v = this.verts++
        const sign = k === 0 ? -1 : 1
        this.positions[v * 3] = p.x + this.side.x * sign
        this.positions[v * 3 + 1] = p.y
        this.positions[v * 3 + 2] = p.z + this.side.z * sign
        this.uvs[v * 2] = k
        this.uvs[v * 2 + 1] = d * ALONG
        this.times[v * 2] = arrive
        this.times[v * 2 + 1] = depart
        this.looks[v * 2] = look.foam
        this.looks[v * 2 + 1] = fade
      }
    }
    for (let i = 0; i < n - 1; i++) {
      const a = base + i * 2
      this.index[this.indices++] = a
      this.index[this.indices++] = a + 1
      this.index[this.indices++] = a + 2
      this.index[this.indices++] = a + 1
      this.index[this.indices++] = a + 3
      this.index[this.indices++] = a + 2
    }
  }

  /**
   * Loose water across the floor of a cell round the stand of the piece there, from where it lands: behind the piece
   * (falling over the wall, or brimming over its back), beside it (brimming over a side, or poured short of it from the
   * next cell), or in front of it.
   */
  private round(s: TimedSegment, stand: Piece, y: number): number {
    const x = cellX(s.c)
    const z = rowZ(s.r)
    const z1 = frontZ(s.r) + OVER_LIP
    const water = this.garden?.water ?? []
    if (s.a === FROM_EDGE) return around(x, y, x, backZ(s.r) + FALL_LANDING, z, z1)
    if (water.some((o) => o.kind === 'drop' && o.c === s.c && o.r === s.r)) {
      const side = brimSide(stand)
      const dx = side === E ? 1 : side === W ? -1 : 0
      const dz = side === S ? 1 : side === N ? -1 : 0
      return around(x, y, x + dx * BRIM_LANDING, z + dz * BRIM_LANDING, z, z1)
    }
    const fromEast = water.some((o) => o.kind === 'pourSide' && o.a === W && o.c === s.c + 1 && o.r === s.r)
    return around(x, y, x + (fromEast ? AROUND : -AROUND), z + 0.06, z, z1)
  }

  /**
   * Lays water pouring or falling from `start` to `end` (in cell (c, r)) along the scratch path, following the kit this
   * frame: it leaves the arm of a moving piece `from` (in cell (fc, fr)) along that arm, and lands on top of a cover
   * over `end`, or else in the mouth of a piece there that is landing or hopping. Water pouring from a piece swinging
   * round, or falling onto a cover as high as `start`, is not laid. Returns the points laid and sets `narrow`.
   */
  private pour(start: THREE.Vector3, end: THREE.Vector3, lift: number, points: number, from: PiecePose | undefined, fc: number, fr: number, c: number, r: number, caught: boolean): number {
    this.narrow = 1
    if (from && Math.abs(from.yaw) > SWINGING) return 0
    let top = -Infinity
    for (let i = 0; i < this.kit.coverCount; i++) {
      const cover = this.kit.covers[i]
      if (cover.bottom < start.y && cover.top > end.y && Math.hypot(end.x - cover.x, end.z - cover.z) < cover.reach) top = Math.max(top, cover.top)
    }
    let into: PiecePose | undefined
    if (top > -Infinity) {
      if (top + ON_TOP >= start.y) return 0
      end.y = top + ON_TOP
    } else if (caught && r < ROWS) {
      into = this.kit.poses.get(cellIndex(c, r))
      if (into && Math.abs(into.yaw) > SWINGING) into = undefined
    }
    const n = arc(start, end, lift, points)
    const leaving = from ? this.poseMatrix(from, fc, fr, this.leaving) : null
    const arriving = into ? this.poseMatrix(into, c, r, this.arriving) : null
    if (!leaving && !arriving) return n
    // Eased at both ends, so the water leaves along the arm it pours from and drops into the mouth it lands in.
    for (let i = 0; i < n; i++) {
      const t = i / (n - 1)
      const arrive = t * t * (3 - 2 * t)
      const p = path[i]
      this.spot.copy(p)
      if (leaving) p.addScaledVector(this.offset.copy(this.spot).applyMatrix4(leaving).sub(this.spot), 1 - arrive)
      if (arriving) p.addScaledVector(this.offset.copy(this.spot).applyMatrix4(arriving).sub(this.spot), arrive)
    }
    this.narrow = Math.min(from ? narrowing(from) : 1, into ? narrowing(into) : 1)
    return n
  }

  /** The move from where the piece in cell (c, r) rests to where it stands this frame. */
  private poseMatrix(pose: PiecePose, c: number, r: number, out = this.moved): THREE.Matrix4 {
    const wide = 1 / Math.sqrt(Math.max(0.3, pose.squash))
    const x = cellX(c)
    const y = floorY(r)
    const z = rowZ(r)
    return out
      .makeTranslation(-x, -y, -z)
      .premultiply(this.step.makeScale(wide, pose.squash, wide))
      .premultiply(this.step.makeRotationY(pose.yaw))
      .premultiply(this.step.makeTranslation(x, y + pose.lift, z))
  }

  /** Moves the strips and splashes written since `verts` and `splashes` by `move`. */
  private carry(move: THREE.Matrix4, verts: number, splashes: number): void {
    for (let v = verts; v < this.verts; v++) this.spot.fromArray(this.positions, v * 3).applyMatrix4(move).toArray(this.positions, v * 3)
    for (let i = splashes; i < this.splashCount; i++) this.spot.fromArray(this.splashes, i * 6).applyMatrix4(move).toArray(this.splashes, i * 6)
  }

  dispose(): void {
    this.geometry.dispose()
    this.wetGeometry.dispose()
    this.still.geometry.dispose()
    this.ribbonMaterial.dispose()
    this.stillMaterial.dispose()
  }
}

/** The side water with nowhere to go brims over a piece's hub: the first without an arm, the front if it can. */
function brimSide(piece: Piece): Side {
  return [S, E, W, N].find((each) => !opensTo(piece, each)) ?? S
}

/**
 * Loose water from (x0, z0) to the front of its cell at (x, z1), round a stand in the middle of the cell (at z = zc):
 * from behind the stand it swings out `AROUND` to its east and back; from beside or before it, it runs to the front.
 */
function around(x: number, y: number, x0: number, z0: number, zc: number, z1: number): number {
  const n = 13
  const behind = z0 < zc - STAND
  for (let i = 0; i < n; i++) {
    const z = z0 + (z1 - z0) * (i / (n - 1))
    const past = 1 - smooth((z - zc - STAND) / (z1 - zc - STAND))
    const out = behind ? AROUND * Math.min(smooth((z - z0 - LEAD) / (zc - STAND - z0 - LEAD)), past) : (x0 - x) * past
    path[i].set(x + out, y, z)
  }
  return n
}

function smooth(t: number): number {
  const k = Math.min(1, Math.max(0, t))
  return k * k * (3 - 2 * k)
}

/** How much narrower a piece's troughs are in this pose: squashed down it widens, stretched up it narrows. */
function narrowing(pose: PiecePose): number {
  return Math.min(1, 1 / Math.sqrt(Math.max(0.3, pose.squash)))
}

/** Does the piece have an arm on the side this stretch of trough runs to or from? */
function holds(piece: Piece, s: TimedSegment): boolean {
  const side = s.a === CENTRE ? s.b : s.a
  return side === CENTRE || opensTo(piece, side as Side)
}

function line(a: THREE.Vector3, b: THREE.Vector3, n: number): number {
  for (let i = 0; i < n; i++) path[i].lerpVectors(a, b, i / (n - 1))
  return n
}

/** Along a trough from `a` to within `radius` of `corner`, round a quarter circle there, and along the next trough to `b`. */
export function elbow(a: THREE.Vector3, corner: THREE.Vector3, b: THREE.Vector3, radius: number, n: number): number {
  const alongA = ELBOW_FROM.subVectors(a, corner).normalize()
  const alongB = ELBOW_TO.subVectors(b, corner).normalize()
  path[0].copy(a)
  for (let i = 1; i < n - 1; i++) {
    const turn = ((i - 1) / (n - 3)) * (Math.PI / 2)
    path[i].copy(corner).addScaledVector(alongA, radius * (1 - Math.sin(turn))).addScaledVector(alongB, radius * (1 - Math.cos(turn)))
  }
  path[n - 1].copy(b)
  return n
}

const ELBOW_FROM = new THREE.Vector3()
const ELBOW_TO = new THREE.Vector3()

/** A pour: leaves `a` with a little outward lift and falls to `b` under gravity. */
function arc(a: THREE.Vector3, b: THREE.Vector3, lift: number, n: number): number {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const out = Math.sqrt(t)
    path[i].set(a.x + (b.x - a.x) * out, a.y + (b.y - a.y) * t * t + lift * Math.sin(t * Math.PI) * (1 - t), a.z + (b.z - a.z) * out)
  }
  return n
}

/** A rivulet across a terrace floor: wanders a little from side to side as it runs toward the wall. */
function meander(x: number, y: number, z0: number, z1: number, seed: number, n: number): number {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const wobble = Math.sin(t * Math.PI * 1.6 + seed) * 0.07 * Math.sin(t * Math.PI)
    path[i].set(x + wobble, y, z0 + (z1 - z0) * t)
  }
  return n
}

/** Spring pool, creek and pond, with UV x running bank to bank for soft edges. */
function stillGeometry(): THREE.BufferGeometry {
  const positions: number[] = []
  const uvs: number[] = []
  const drifts: number[] = []
  const indices: number[] = []
  const ellipse = (cx: number, y: number, cz: number, rx: number, rz: number, drift: number) => {
    const base = positions.length / 3
    positions.push(cx, y, cz)
    uvs.push(0.5, 0.5)
    drifts.push(drift)
    const n = 20
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const wob = 1 + Math.sin(a * 3 + cx) * 0.06
      positions.push(cx + Math.cos(a) * rx * wob, y, cz + Math.sin(a) * rz * wob)
      uvs.push(0, 0.2 + 0.6 * (0.5 - Math.sin(a) * 0.5))
      drifts.push(drift)
    }
    for (let i = 1; i <= n; i++) indices.push(base, base + i + 1, base + i)
  }
  ellipse(SPRING.x, SPRING.y - 0.02, SPRING.z, 0.46, 0.26, 0.2)
  ellipse(POND.x, CREEK_Y + 0.005, POND.z, 1.05, 0.52, 0)
  const x0 = -9.5
  const x1 = 9.5
  const segs = 12
  for (let s = 0; s <= segs; s++) {
    const x = x0 + ((x1 - x0) * s) / segs
    for (const [k, z] of [
      [0, CREEK_Z0 - 0.02],
      [1, CREEK_Z1 + 0.06],
    ] as const) {
      positions.push(x, CREEK_Y, z)
      uvs.push(k, k === 0 ? 0.9 : 0.1)
      drifts.push(1)
    }
  }
  const creek = positions.length / 3 - (segs + 1) * 2
  for (let s = 0; s < segs; s++) {
    const a = creek + s * 2
    indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('aDrift', new THREE.Float32BufferAttribute(drifts, 1))
  g.setIndex(indices)
  return g
}

