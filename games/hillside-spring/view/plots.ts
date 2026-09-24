import * as THREE from 'three'
import type { GardenController } from '../controller'
import { reachPose, type ReachPose } from '../guidance'
import { PLOTS, type CropKind } from '../layout'
import { MeshBuilder } from './build'
import { INK, SHADE, shared, SUN, SUN_DIR } from './materials'
import { rng, uvRect } from './paint'
import { backZ, cellX, floorY, frontZ, rowZ } from './world'

// The four thirsty plots. Beds are soil that darkens as it soaks (the rice
// paddy floods). Every crop on every plot is one merged, cel-lit mesh: the
// vertex shader grows each plant from a wilted sprout to full bloom, opens
// its flowers or swells its pumpkins last, droops it while thirsty, stretches
// it toward the nearest running water (whenever the child stops, opening its
// leaves to the child first, and eagerly as new water arrives close by), and
// gives it a little bounce when it is harvested or tapped. A few floats per
// plot drive all of it: one draw call.

const INSET = 0.07
/** A bed's soil lies this high over the floor. */
export const SOIL = 0.022
const BANK_HEIGHT = 0.045
const BANK_WIDTH = 0.05
/** The top of the bank round a bed: its middle is this far from the bed's middle, and it stands this high over the floor. */
export const BANK_OUT = 0.5 - INSET + BANK_WIDTH / 2
export const BANK_TOP = SOIL + BANK_HEIGHT

const BED_VERTEX = /* glsl */ `
attribute float aPlot;
attribute vec3 color;
varying vec2 vUv;
varying vec3 vColor;
varying float vPlot;
varying vec2 vWorld;
void main() {
  vUv = uv;
  vColor = color;
  vPlot = aPlot;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const BED_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform sampler2D uFlow;
uniform float uWet[4];
uniform float uPaddy;
uniform float uTime;
uniform vec2 uWetShift;
varying vec2 vUv;
varying vec3 vColor;
varying float vPlot;
varying vec2 vWorld;
void main() {
  vec3 dry = texture2D(map, vUv).rgb;
  vec3 col = dry;
  if (vPlot >= 0.0) {
    int id = int(vPlot + 0.5);
    float wet = id == 0 ? uWet[0] : id == 1 ? uWet[1] : id == 2 ? uWet[2] : uWet[3];
    vec3 soaked = texture2D(map, vUv + uWetShift).rgb;
    col = mix(dry, soaked, wet);
    if (abs(vPlot - uPaddy) < 0.5) {
      float n = texture2D(uFlow, vWorld * 0.8 + vec2(uTime * 0.02, uTime * 0.013)).r;
      vec3 sky = mix(vec3(0.46, 0.66, 0.68), vec3(0.86, 0.92, 0.84), smoothstep(0.4, 0.85, n));
      col = mix(col, sky, wet * 0.72);
    }
  }
  gl_FragColor = vec4(col * vColor, 1.0);
  #include <colorspace_fragment>
}
`

const CROP_VERTEX = /* glsl */ `
attribute vec3 color;
attribute float aPlot;
attribute float aBloom;
attribute vec3 aRoot;
attribute vec3 aAnchor;
uniform float uGrowth[4];
uniform float uWet[4];
uniform float uLean[4];
uniform float uReach[4];
uniform float uAsk[4];
uniform float uPop[4];
uniform float uWiggle[4];
uniform float uTime;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vView;
varying float vPerk;
float pick(float a[4], int id) {
  return id == 0 ? a[0] : id == 1 ? a[1] : id == 2 ? a[2] : a[3];
}
void main() {
  int id = int(aPlot + 0.5);
  float g = pick(uGrowth, id);
  float wet = pick(uWet, id);
  float lean = pick(uLean, id);
  float reach = pick(uReach, id);
  float ask = pick(uAsk, id);
  float pop = pick(uPop, id);
  float wiggle = pick(uWiggle, id);
  vec3 local = position - aRoot;
  if (aBloom > 0.5) {
    vec3 anchor = aAnchor - aRoot;
    float open = smoothstep(0.5, 1.0, g);
    local = anchor + (local - anchor) * max(open, 0.001);
  }
  float size = mix(0.62, 1.0, smoothstep(0.0, 0.85, g));
  size *= 1.0 + 0.35 * sin(pop * 18.0) * exp(-pop * 5.0);
  local *= size;
  float h = max(local.y, 0.0);
  float droop = (1.0 - wet) * (1.0 - smoothstep(0.55, 1.0, g)) * (1.0 - 0.65 * reach);
  local.y *= 1.0 + 0.12 * reach + 0.14 * ask;
  local.xz *= 1.0 + 0.5 * ask * smoothstep(0.0, 0.06, h);
  float bend = droop * min(h * h * 3.2, 0.24);
  local.z += bend * 0.9;
  local.y -= bend * 0.45;
  local.x += lean * h * 0.9;
  float sway = sin(uTime * 1.6 + aRoot.x * 3.1 + aRoot.z * 1.7) * 0.05 * h * (0.3 + g);
  local.x += sway + sin(wiggle * 28.0) * exp(-wiggle * 4.0) * h * 0.35;
  vec4 world = modelMatrix * vec4(aRoot + local, 1.0);
  vNormal = normalize(mat3(modelMatrix) * normal);
  vView = cameraPosition - world.xyz;
  vColor = color;
  vPerk = max(wet, g);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const CROP_FRAGMENT = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSun;
uniform vec3 uShade;
uniform vec3 uInk;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vView;
varying float vPerk;
void main() {
  vec3 albedo = vColor;
  float grey = dot(albedo, vec3(0.3, 0.55, 0.15));
  vec3 wilted = mix(albedo, vec3(0.56, 0.42, 0.16) * (0.35 + grey), 0.72);
  albedo = mix(wilted, albedo, smoothstep(0.0, 0.8, vPerk));
  vec3 n = normalize(vNormal);
  float facing = dot(n, normalize(vView));
  if (facing < 0.0) { n = -n; facing = -facing; }
  float hl = dot(n, uSunDir) * 0.5 + 0.5;
  hl *= hl;
  float band = smoothstep(0.28, 0.44, hl);
  vec3 col = albedo * (mix(uShade, uSun, band) + vec3(0.1) * (hl - 0.5));
  col = mix(col, uInk, smoothstep(0.3, 0.08, facing) * 0.55);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

/** Accumulates crop parts (flat vertex colour, no texture) with the extra per-vertex data the grow shader needs. */
class CropBuilder {
  readonly mesh = new MeshBuilder()
  readonly plot: number[] = []
  readonly bloom: number[] = []
  readonly root: number[] = []
  readonly anchor: number[] = []
  /** Every plant of the current crop grows this much bigger around its own root. */
  scale = 1
  private readonly grow = new THREE.Matrix4()
  private readonly tmp = new THREE.Matrix4()

  add(g: THREE.BufferGeometry, hex: string, plot: number, root: THREE.Vector3, matrix: THREE.Matrix4, bloom = false, anchor = root): void {
    const before = this.mesh.vertexCount
    const k = this.scale
    this.grow.makeTranslation(root.x, root.y, root.z).multiply(this.tmp.makeScale(k, k, k)).multiply(this.tmp.makeTranslation(-root.x, -root.y, -root.z))
    this.mesh.append(g, new THREE.Color(hex), 'sprites', this.grow.multiply(matrix))
    g.dispose()
    const ax = root.x + (anchor.x - root.x) * k
    const ay = root.y + (anchor.y - root.y) * k
    const az = root.z + (anchor.z - root.z) * k
    for (let i = before; i < this.mesh.vertexCount; i++) {
      this.plot.push(plot)
      this.bloom.push(bloom ? 1 : 0)
      this.root.push(root.x, root.y, root.z)
      this.anchor.push(ax, ay, az)
    }
  }

  build(): THREE.BufferGeometry {
    const g = this.mesh.build()
    g.setAttribute('aPlot', new THREE.Float32BufferAttribute(this.plot, 1))
    g.setAttribute('aBloom', new THREE.Float32BufferAttribute(this.bloom, 1))
    g.setAttribute('aRoot', new THREE.Float32BufferAttribute(this.root, 3))
    g.setAttribute('aAnchor', new THREE.Float32BufferAttribute(this.anchor, 3))
    return g
  }
}

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)
const M = (at: THREE.Vector3, rx = 0, ry = 0, rz = 0, s = V(1, 1, 1)) => new THREE.Matrix4().compose(at, new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), s)

function stem(b: CropBuilder, plot: number, root: THREE.Vector3, h: number, r: number, hex: string, lean = 0): THREE.Vector3 {
  b.add(new THREE.CylinderGeometry(r * 0.7, r, h, 5, 1, true), hex, plot, root, M(V(root.x + lean * h * 0.5, root.y + h / 2, root.z), 0, 0, -lean))
  return V(root.x + lean * h, root.y + h, root.z)
}

function leaf(b: CropBuilder, plot: number, root: THREE.Vector3, at: THREE.Vector3, size: number, yaw: number, hex: string, droop = 0.4): void {
  b.add(new THREE.SphereGeometry(1, 6, 4), hex, plot, root, M(V(at.x + Math.cos(yaw) * size * 0.9, at.y, at.z - Math.sin(yaw) * size * 0.9), 0, yaw, droop, V(size, size * 0.12, size * 0.42)))
}

function sunflower(b: CropBuilder, plot: number, x: number, y: number, z: number, random: () => number): void {
  for (const [dx, dz, h] of [
    [-0.22, -0.14, 0.56],
    [0.14, -0.18, 0.5],
    [0.26, 0.02, 0.42],
  ]) {
    const root = V(x + dx, y, z + dz)
    const top = stem(b, plot, root, h, 0.03, '#6f9a3c')
    leaf(b, plot, root, V(root.x, y + h * 0.35, root.z), 0.1, random() * 6, '#5f9a38')
    leaf(b, plot, root, V(root.x, y + h * 0.6, root.z), 0.085, random() * 6, '#6aa640')
    const head = V(top.x, top.y + 0.02, top.z + 0.02)
    const face = M(head, 1.05, 0, 0)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2
      const petal = new THREE.Matrix4().multiplyMatrices(face, M(V(Math.cos(a) * 0.085, 0, Math.sin(a) * 0.085), 0, -a, 0, V(0.06, 0.012, 0.028)))
      b.add(new THREE.SphereGeometry(1, 5, 3), i % 2 ? '#f2bf2a' : '#f6cf48', plot, root, petal, true, head)
    }
    b.add(new THREE.CylinderGeometry(0.058, 0.064, 0.028, 10), '#6a3e1c', plot, root, face.clone().multiply(M(V(0, 0.01, 0))), true, head)
  }
}

function rice(b: CropBuilder, plot: number, x: number, y: number, z: number, random: () => number): void {
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 3; j++) {
      // The paddy's front left is open water: the frog sits there, on the ridge.
      if (j === 2 && i < 3) continue
      const root = V(x - 0.3 + i * 0.2 + (random() - 0.5) * 0.03, y + 0.01, z - 0.24 + j * 0.24 + (random() - 0.5) * 0.03)
      for (let k = 0; k < 5; k++) {
        const yaw = (k / 5) * Math.PI * 2 + random()
        const tilt = 0.18 + random() * 0.2
        const h = 0.24 + random() * 0.08
        b.add(new THREE.BoxGeometry(0.022, h, 0.006), k % 2 ? '#78b048' : '#8cc056', plot, root, M(V(root.x + Math.cos(yaw) * tilt * h * 0.5, root.y + h / 2, root.z + Math.sin(yaw) * tilt * h * 0.5), Math.sin(yaw) * tilt, 0, -Math.cos(yaw) * tilt))
      }
      for (let k = 0; k < 2; k++) {
        const yaw = random() * 6
        const at = V(root.x + Math.cos(yaw) * 0.05, root.y + 0.26, root.z + Math.sin(yaw) * 0.05)
        b.add(new THREE.SphereGeometry(1, 5, 3), '#e8c860', plot, root, M(at, 0.6, yaw, 0.3, V(0.022, 0.05, 0.022)), true, at)
      }
    }
  }
}

function pumpkin(b: CropBuilder, plot: number, x: number, y: number, z: number, random: () => number): void {
  const root = V(x, y, z)
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + random() * 0.4
    const d = 0.18 + random() * 0.12
    const at = V(x + Math.cos(a) * d, y + 0.05 + random() * 0.04, z + Math.sin(a) * d * 0.8)
    b.add(new THREE.SphereGeometry(1, 7, 4), i % 2 ? '#5d9636' : '#6aa43e', plot, root, M(at, 0.2 - random() * 0.4, a, 0.1, V(0.12, 0.03, 0.1)))
    b.add(new THREE.CylinderGeometry(0.012, 0.014, 0.12, 4, 1, true), '#6f9a3c', plot, root, M(V(at.x, y + 0.08, at.z), 0, 0, 0.3))
  }
  for (const [dx, dz, s] of [
    [-0.12, 0.1, 0.13],
    [0.16, -0.08, 0.1],
  ]) {
    const at = V(x + dx, y + s * 0.72, z + dz)
    const body = new THREE.SphereGeometry(1, 12, 8)
    const p = body.getAttribute('position')
    const colours: number[] = []
    for (let i = 0; i < p.count; i++) {
      const a = Math.atan2(p.getZ(i), p.getX(i))
      const rib = 1 - 0.08 * Math.pow(Math.abs(Math.cos(a * 4)), 3)
      p.setXYZ(i, p.getX(i) * rib, p.getY(i), p.getZ(i) * rib)
      const k = 0.85 + 0.15 * Math.abs(Math.sin(a * 4))
      colours.push(k, k, k)
    }
    body.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
    body.computeVertexNormals()
    b.add(body, '#ee8a2a', plot, root, M(at, 0, random(), 0, V(s, s * 0.72, s)), true, at)
    b.add(new THREE.CylinderGeometry(0.012, 0.018, 0.05, 5), '#5a6a2a', plot, root, M(V(at.x, at.y + s * 0.72, at.z), 0.2, 0, 0.2), true, at)
  }
}

function cosmos(b: CropBuilder, plot: number, x: number, y: number, z: number, random: () => number): void {
  const colours = ['#f29ac0', '#fbe8f0', '#d8609a', '#f6b6d0']
  for (let i = 0; i < 8; i++) {
    // The bed's front left stays open: the sparrow sits there, on the ridge.
    if (i === 4 || i === 5) continue
    const root = V(x - 0.3 + (i % 4) * 0.2 + (random() - 0.5) * 0.08, y, z - 0.18 + Math.floor(i / 4) * 0.27 + (random() - 0.5) * 0.08)
    const h = 0.3 + random() * 0.16
    const lean = (random() - 0.5) * 0.3
    const top = stem(b, plot, root, h, 0.018, '#6a9a3a', lean)
    for (let k = 0; k < 3; k++) leaf(b, plot, root, V(root.x + lean * h * (0.2 + k * 0.2), y + h * (0.2 + k * 0.2), root.z), 0.045, random() * 6, '#78a848', 0.2)
    const head = V(top.x, top.y + 0.01, top.z)
    const face = M(head, 0.7, 0, lean)
    const colour = colours[i % colours.length]
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2
      const petal = new THREE.Matrix4().multiplyMatrices(face, M(V(Math.cos(a) * 0.04, 0, Math.sin(a) * 0.04), 0, -a, 0, V(0.035, 0.008, 0.017)))
      b.add(new THREE.SphereGeometry(1, 5, 3), colour, plot, root, petal, true, head)
    }
    b.add(new THREE.SphereGeometry(0.014, 6, 4), '#f0c030', plot, root, face.clone().multiply(M(V(0, 0.008, 0))), true, head)
  }
}

const GROW: Record<CropKind, typeof sunflower> = { sunflower, rice, pumpkin, cosmos }
/** Crops are drawn big enough to read from across the room: a thirsty plot must look thirsty to a five-year-old. */
const CROP_SCALE: Record<CropKind, number> = { sunflower: 1.4, rice: 1.5, pumpkin: 1.45, cosmos: 1.6 }

function bedGeometry(): THREE.BufferGeometry {
  const b = new MeshBuilder()
  const plot: number[] = []
  for (const p of PLOTS) {
    const x0 = cellX(p.c) - 0.5 + INSET
    const x1 = cellX(p.c) + 0.5 - INSET
    const z0 = backZ(p.r) + INSET
    const z1 = frontZ(p.r) - INSET
    const y = floorY(p.r) + SOIL
    const before = b.vertexCount
    const tint = new THREE.Color(1, 1, 1)
    b.quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), 'soilDry', tint)
    for (let i = before; i < b.vertexCount; i++) plot.push(p.id)
    const ridge = p.kind === 'rice' ? new THREE.Color('#9a8260') : new THREE.Color('#a07850')
    const lit = ridge.clone().multiplyScalar(1.25)
    const h = BANK_HEIGHT
    const w = BANK_WIDTH
    const edges: [THREE.Vector3, THREE.Vector3][] = [
      [V(x0 - w, y, z1 + w), V(x1 + w, y, z1 + w)],
      [V(x1 + w, y, z0 - w), V(x0 - w, y, z0 - w)],
      [V(x0 - w, y, z0 - w), V(x0 - w, y, z1 + w)],
      [V(x1 + w, y, z1 + w), V(x1 + w, y, z0 - w)],
    ]
    for (let e = 0; e < edges.length; e++) {
      const [a, c] = edges[e]
      const before2 = b.vertexCount
      const along = new THREE.Vector3().subVectors(c, a).normalize()
      const inward = along.clone().cross(new THREE.Vector3(0, 1, 0)).multiplyScalar(-w)
      const top0 = a.clone().setY(y + h)
      const top1 = c.clone().setY(y + h)
      b.quad(a.clone().setY(y - 0.03), c.clone().setY(y - 0.03), top1, top0, p.kind === 'rice' ? 'bank' : 'wood', ridge, [0, 0, 1, 0.2])
      // The front and back ridges' tops cover the corners; the sides' stop short of them rather than lie over them.
      const trim = e < 2 ? 0 : w
      const t0 = top0.clone().addScaledVector(along, trim)
      const t1 = top1.clone().addScaledVector(along, -trim)
      b.quad(t0, t1, t1.clone().add(inward), t0.clone().add(inward), p.kind === 'rice' ? 'bank' : 'wood', lit, [0, 0.3, 1, 0.5])
      for (let i = before2; i < b.vertexCount; i++) plot.push(-1)
    }
  }
  const g = b.build()
  g.setAttribute('aPlot', new THREE.Float32BufferAttribute(plot, 1))
  return g
}

/** How far a reaching plant leans (shader units per unit height), stronger when the water is close. */
const LEAN_FAR = 0.28
const LEAN_NEAR = 0.14
/** An eager reach as new water arrives nearby: up quickly, hold, settle back. */
const EAGER_SECONDS = 1.6
const IDLE_REACH = 0.9

function eager(t: number): number {
  if (t < 0 || t > EAGER_SECONDS) return 0
  const x = t / EAGER_SECONDS
  const rise = Math.min(1, x / 0.2)
  const settle = x < 0.55 ? 1 : 1 - (x - 0.55) / 0.45
  return rise * rise * (3 - 2 * rise) * settle * settle * (3 - 2 * settle)
}

/** How much taller than built a crop can stand: reaching for water and asking to be picked stretch it up (the grow shader). */
export const CROP_STRETCH = 1.3

/** The top (world y) of each plot's crop at its tallest: full bloom, stretched as far as the grow shader goes. */
export function cropTops(crops: THREE.BufferGeometry): Float32Array {
  const tops = new Float32Array(PLOTS.length).fill(-Infinity)
  const position = crops.getAttribute('position')
  const root = crops.getAttribute('aRoot')
  const plot = crops.getAttribute('aPlot')
  for (let i = 0; i < position.count; i++) {
    const id = Math.round(plot.getX(i))
    const y = root.getY(i) + Math.max(0, position.getY(i) - root.getY(i)) * CROP_STRETCH
    if (y > tops[id]) tops[id] = y
  }
  return tops
}

export class PlotsView {
  readonly group = new THREE.Group()
  /** See `cropTops`. */
  readonly tops: Float32Array
  private readonly bedMaterial: THREE.ShaderMaterial
  private readonly cropMaterial: THREE.ShaderMaterial
  private readonly beds: THREE.Mesh
  private readonly crops: THREE.Mesh
  private readonly wet = new Float32Array(PLOTS.length)
  private readonly growth = new Float32Array(PLOTS.length)
  private readonly lean = new Float32Array(PLOTS.length)
  private readonly reach = new Float32Array(PLOTS.length)
  private readonly ask = new Float32Array(PLOTS.length)
  private readonly pose: ReachPose = { stand: 0, ask: 0, point: 0 }
  private readonly pop = new Float32Array(PLOTS.length).fill(10)
  private readonly wiggle = new Float32Array(PLOTS.length).fill(10)

  constructor(atlas: THREE.Texture, flowTexture: THREE.Texture) {
    const soilDry = uvRect('soilDry')
    const soilWet = uvRect('soilWet')
    this.bedMaterial = new THREE.ShaderMaterial({
      vertexShader: BED_VERTEX,
      fragmentShader: BED_FRAGMENT,
      uniforms: {
        map: { value: atlas },
        uFlow: { value: flowTexture },
        uWet: { value: this.wet },
        uPaddy: { value: PLOTS.find((p) => p.kind === 'rice')?.id ?? -9 },
        uTime: shared.time,
        uWetShift: { value: new THREE.Vector2(soilWet.u0 - soilDry.u0, soilWet.v0 - soilDry.v0) },
      },
    })
    this.beds = new THREE.Mesh(bedGeometry(), this.bedMaterial)
    this.beds.name = 'beds'
    this.group.add(this.beds)

    const b = new CropBuilder()
    const random = rng(99)
    for (const p of PLOTS) {
      b.scale = CROP_SCALE[p.kind]
      GROW[p.kind](b, p.id, cellX(p.c), floorY(p.r) + SOIL, rowZ(p.r), random)
    }
    this.cropMaterial = new THREE.ShaderMaterial({
      vertexShader: CROP_VERTEX,
      fragmentShader: CROP_FRAGMENT,
      uniforms: {
        uGrowth: { value: this.growth },
        uWet: { value: this.wet },
        uLean: { value: this.lean },
        uReach: { value: this.reach },
        uAsk: { value: this.ask },
        uPop: { value: this.pop },
        uWiggle: { value: this.wiggle },
        uTime: shared.time,
        uSunDir: { value: SUN_DIR },
        uSun: { value: SUN },
        uShade: { value: SHADE },
        uInk: { value: INK },
      },
      side: THREE.DoubleSide,
    })
    this.crops = new THREE.Mesh(b.build(), this.cropMaterial)
    this.crops.name = 'crops'
    this.tops = cropTops(this.crops.geometry)
    this.crops.frustumCulled = false
    this.group.add(this.crops)
  }

  update(garden: GardenController): void {
    const now = garden.now
    const pose = garden.guide.lean === null ? null : reachPose(garden.guide.lean, this.pose)
    for (let i = 0; i < PLOTS.length; i++) {
      const p = PLOTS[i]
      this.wet[p.id] = garden.wetness[p.id]
      this.growth[p.id] = garden.state.growth[p.id]
      const thirsty = garden.state.growth[p.id] < 1 && garden.wetness[p.id] < 0.5
      const eagerly = thirsty ? eager(now - garden.reachAt[p.id]) : 0
      const idle = thirsty && pose !== null
      const point = Math.max(idle ? pose.point * IDLE_REACH : 0, eagerly)
      const toward = garden.reach[p.id]
      this.reach[p.id] = Math.max(idle ? pose.stand * IDLE_REACH : 0, eagerly)
      this.ask[p.id] = idle ? pose.ask : 0
      this.lean[p.id] = point * toward.dir * (LEAN_FAR + LEAN_NEAR / Math.max(1, toward.cells))
      this.pop[p.id] = Math.min(10, now - garden.harvestedAt[p.id])
      this.wiggle[p.id] = Math.min(10, now - garden.plotTappedAt[p.id])
    }
  }

  dispose(): void {
    this.beds.geometry.dispose()
    this.crops.geometry.dispose()
    this.bedMaterial.dispose()
    this.cropMaterial.dispose()
  }
}
