import * as THREE from 'three'
import type { GardenController } from '../controller'
import { CENTRE, FROM_EDGE, INTO_POND, LAND_OFF, LAND_PLOT } from '../flow'
import { E, N, ROWS, S, SPRING_COL, W } from '../layout'
import { opensTo } from '../pieces'
import { pieceAt } from '../state'
import { NEVER, WATER_SPEED, type TimedSegment } from '../waterTiming'
import { shared } from './materials'
import { backZ, cellX, CREEK_Y, CREEK_Z0, CREEK_Z1, floorY, frontZ, GRID_RIGHT, PIPE_Y, POND, rowZ, SIDE_RISE, SPRING, SPRING_LIP } from './world'

// Running water is one ribbon mesh (KTD3). When the build changes, every
// segment becomes a short strip of quads whose vertices carry the times the
// water's head reaches them and leaves them; the shader hides the strip
// outside that window and scrolls a painted flow texture along it at the
// water's own speed, so a new stream visibly runs downhill and a cut one
// drains, with nothing animated on the CPU. Water running loose across the
// grass also darkens a wide band of wet ground under itself that dries a few
// seconds after it stops, so a stray stream leaves a trace of where it went.
// Still water (spring pool, creek, pond) is a second, static mesh.

const MAX_VERTS = 12000
const MAX_INDEX = 18000
const WATER_LEVEL = PIPE_Y - 0.028
const FLOOR_WET = 0.014
const ALONG = 2
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
const MAX_SAMPLES = 10
const path = Array.from({ length: MAX_SAMPLES }, () => new THREE.Vector3())
const MAX_SPLASHES = 64

export class WaterView {
  readonly group = new THREE.Group()
  /** Where water lands after a fall or pour: x, y, z, when it starts landing, when it stops, strength. */
  readonly splashes = new Float32Array(MAX_SPLASHES * 6)
  splashCount = 0
  private readonly geometry = new THREE.BufferGeometry()
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
  private garden: GardenController | null = null

  constructor(flowTexture: THREE.Texture) {
    const g = this.geometry
    g.setAttribute('position', new THREE.BufferAttribute(this.positions, 3).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('uv', new THREE.BufferAttribute(this.uvs, 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aTime', new THREE.BufferAttribute(this.times, 2).setUsage(THREE.DynamicDrawUsage))
    g.setAttribute('aLook', new THREE.BufferAttribute(this.looks, 2).setUsage(THREE.DynamicDrawUsage))
    g.setIndex(new THREE.BufferAttribute(this.index, 1).setUsage(THREE.DynamicDrawUsage))
    g.setDrawRange(0, 0)
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
    const ribbon = new THREE.Mesh(g, this.ribbonMaterial)
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
    this.still.renderOrder = 1
    this.group.add(this.still)
  }

  update(garden: GardenController): void {
    if (garden.waterVersion === this.version) return
    this.version = garden.waterVersion
    this.garden = garden
    this.verts = 0
    this.indices = 0
    this.splashCount = 0
    for (const segment of garden.water) this.wetGround(segment)
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
    g.setDrawRange(0, this.indices)
  }

  /** Does the cell below catch falling water in an uphill-facing pipe mouth? */
  private catches(c: number, r: number): boolean {
    if (!this.garden || r >= ROWS) return false
    const piece = pieceAt(this.garden.state, c, r)
    return piece !== null && piece.kind !== 'wheel' && opensTo(piece, N)
  }

  private landY(c: number, r: number): number {
    if (r >= ROWS) return CREEK_Y + 0.01
    return floorY(r) + (this.catches(c, r) ? WATER_LEVEL : FLOOR_WET)
  }

  /** The spring's overflow down onto the top terrace: always running. */
  private spill(garden: GardenController): void {
    this.garden = garden
    const end = this.b.set(cellX(SPRING_COL), this.landY(SPRING_COL, 0), backZ(0) + 0.03)
    const n = arc(SPRING_LIP, end, 0.12, 5)
    this.strip(n, 0, 0.3, -NEVER, NEVER, 0, { width: 0.22, foam: 0.7, fade: false })
    this.splash(end, -NEVER, NEVER, 0.8)
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

  private sidePoint(c: number, r: number, side: number, y: number, out: THREE.Vector3): THREE.Vector3 {
    out.set(cellX(c), y, rowZ(r))
    if (side === N) out.z = backZ(r)
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
      const z0 = s.a === FROM_EDGE ? backZ(s.r) : rowZ(s.r) + 0.06
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
    const width = 0.08 + 0.1 * Math.sqrt(Math.min(1, s.flow))
    const y0 = floorY(s.r)
    const pipe = y0 + WATER_LEVEL
    const x = cellX(s.c)
    let n = 0
    let look: Look = { width, foam: 0, fade: false }
    switch (s.kind) {
      case 'channel': {
        const a = this.sidePoint(s.c, s.r, s.a, pipe, this.a)
        const b = this.sidePoint(s.c, s.r, s.b, pipe, this.b)
        const bend = s.a !== CENTRE && s.b !== CENTRE && (s.a + s.b) % 2 === 1
        n = bend ? curve(a, this.c.set(x, pipe, rowZ(s.r)), b, 6) : line(a, b, 3)
        look = { width: width * 0.85, foam: 0.05, fade: false }
        break
      }
      case 'drop': {
        n = line(this.a.set(x, pipe, rowZ(s.r)), this.b.set(x, y0 + FLOOR_WET, rowZ(s.r) + 0.06), 3)
        look = { width: width * 1.1, foam: 0.8, fade: false }
        break
      }
      case 'trickle': {
        const z0 = s.a === FROM_EDGE ? backZ(s.r) : rowZ(s.r) + 0.06
        n = meander(x, y0 + FLOOR_WET, z0, frontZ(s.r) + 0.005, s.c * 7 + s.r * 3, s.a === FROM_EDGE ? 7 : 5)
        look = { width: width * 1.4, foam: 0.1, fade: false }
        break
      }
      case 'fall': {
        const start = this.a.set(x, y0 + FLOOR_WET, frontZ(s.r))
        const end = s.b === INTO_POND ? this.b.set(x, CREEK_Y + 0.01, CREEK_Z0 + 0.22) : this.b.set(x, this.landY(s.c, s.r + 1), frontZ(s.r) + 0.05)
        n = arc(start, end, 0.03, 5)
        look = { width: width * 1.3, foam: 0.75, fade: false }
        break
      }
      case 'pourDown': {
        const start = this.a.set(x, pipe, frontZ(s.r))
        const end = s.b === INTO_POND ? this.b.set(x, CREEK_Y + 0.01, CREEK_Z0 + 0.3) : this.b.set(x, this.landY(s.c, s.r + 1), frontZ(s.r) + 0.14)
        n = arc(start, end, 0.08, 6)
        look = { width: width * 1.1, foam: 0.6, fade: false }
        break
      }
      case 'pourSide': {
        const dx = s.a === E ? 1 : -1
        const start = this.a.set(x + dx * 0.5, pipe, rowZ(s.r))
        if (s.b === LAND_OFF) {
          n = arc(start, this.b.set(x + dx * 1.05, y0 + 0.06, rowZ(s.r) + 0.05), 0.1, 6)
          look = { width: width * 1.05, foam: 0.6, fade: true }
        } else {
          const land = s.b === LAND_PLOT ? 0.78 : 1
          n = arc(start, this.b.set(x + dx * land, y0 + FLOOR_WET + (s.b === LAND_PLOT ? 0.03 : 0), rowZ(s.r) + 0.06), 0.1, 6)
          look = { width: width * 1.05, foam: 0.6, fade: false }
        }
        break
      }
      default: {
        const never: never = s.kind
        return never
      }
    }
    this.strip(n, s.d0, s.d1, s.tArrive, s.tDepart, s.d0, look)
    if (s.kind !== 'channel' && s.kind !== 'trickle' && n > 1) {
      const late = (s.d1 - s.d0) / WATER_SPEED
      this.splash(path[n - 1], s.tArrive <= -NEVER ? -NEVER : s.tArrive + late, s.tDepart >= NEVER ? NEVER : s.tDepart + late, Math.min(1, 0.4 + s.flow * 0.6))
    }
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

  dispose(): void {
    this.geometry.dispose()
    this.still.geometry.dispose()
    this.ribbonMaterial.dispose()
    this.stillMaterial.dispose()
  }
}

function line(a: THREE.Vector3, b: THREE.Vector3, n: number): number {
  for (let i = 0; i < n; i++) path[i].lerpVectors(a, b, i / (n - 1))
  return n
}

function curve(a: THREE.Vector3, control: THREE.Vector3, b: THREE.Vector3, n: number): number {
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1)
    const u = 1 - t
    path[i].set(u * u * a.x + 2 * u * t * control.x + t * t * b.x, u * u * a.y + 2 * u * t * control.y + t * t * b.y, u * u * a.z + 2 * u * t * control.z + t * t * b.z)
  }
  return n
}

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

