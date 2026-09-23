import * as THREE from 'three'
import { COLS, PLOTS, ROWS, SPRING_COL } from '../layout'
import { colour, MeshBuilder } from './build'
import { foliageMaterial, HAZE, paintedMaterial } from './materials'
import { rng, uvRect } from './paint'
import {
  backZ,
  BANK_Y,
  cellX,
  CREEK_Y,
  CREEK_Z0,
  CREEK_Z1,
  floorY,
  frontZ,
  GRID_LEFT,
  GRID_RIGHT,
  SIDE_RISE,
  POND,
  RACK_SPACING,
  RACK_Z,
  RACK_Y,
  rowZ,
  SPRING,
  STEP,
  WALL_OUT,
} from './world'

// The painted hillside: terraces and their stone walls, the slope running up
// behind the spring to the crest, trees framing the garden, the creek and
// pond at the foot, the near bank with the rack mat, the sky, and slow
// shafts of afternoon light. Built once per page into a handful of meshes.

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

const SIDE = 7.5
const CREST_Z = -5.3
const CREST_Y = 1.75

/** Baked light: warmer and brighter toward the sun (left), a little cooler to the right, darker at the foot of walls. */
function sunTint(x: number, base: number, warm = 0.06): THREE.Color {
  const k = THREE.MathUtils.clamp(0.5 - x / 14, 0, 1)
  return new THREE.Color(base + warm * k * 1.2, base + warm * k * 0.7, base - warm * 0.4 + (1 - k) * 0.05)
}

function isPlot(c: number, r: number): boolean {
  return PLOTS.some((p) => p.c === c && p.r === r)
}

function terraces(b: MeshBuilder, random: () => number): void {
  for (let r = 0; r < ROWS; r++) {
    const y = floorY(r)
    const z0 = backZ(r)
    const z1 = frontZ(r)
    for (let c = 0; c < COLS; c++) {
      const x0 = cellX(c) - 0.5
      const x1 = cellX(c) + 0.5
      const region = (c + r) % 2 === 0 ? 'grass' : 'grassSun'
      const flip = random() > 0.5
      const uv: [number, number, number, number] = flip ? [1, 0, 0, 1] : [0, 0, 1, 1]
      const back = isPlot(c, r) ? 0.9 : 0.93
      b.quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), region, [sunTint(x0, 1.06), sunTint(x1, 1.06), sunTint(x1, back), sunTint(x0, back)], uv)
    }
    for (const [xa, xb] of [
      [-SIDE, GRID_LEFT],
      [GRID_RIGHT, SIDE],
    ]) {
      const steps = 3
      for (let s = 0; s < steps; s++) {
        const x0 = xa + ((xb - xa) * s) / steps
        const x1 = xa + ((xb - xa) * (s + 1)) / steps
        const rise = (x: number) => Math.max(0, Math.abs(x) - GRID_RIGHT) * SIDE_RISE
        b.quad(V(x0, y + rise(x0), z1), V(x1, y + rise(x1), z1), V(x1, y + rise(x1), z0), V(x0, y + rise(x0), z0), 'meadow', [sunTint(x0, 0.9), sunTint(x1, 0.9), sunTint(x1, 0.84), sunTint(x0, 0.84)])
      }
    }
    const yBelow = r + 1 < ROWS ? floorY(r + 1) : CREEK_Y - 0.06
    const lip = (x: number) => y + Math.max(0, Math.abs(x) - GRID_RIGHT) * SIDE_RISE
    wallStrip(b, -SIDE, SIDE, yBelow, lip, z1 + WALL_OUT)
    // The lawn runs out over the wall's top so no sky shows through between floor and wall. Its segments break where
    // the wall's do (at the grid's edges, where the sides start to rise): one bridging that bend floats over the wall.
    const lips = Math.round(2 * SIDE)
    for (let s = 0; s < lips; s++) {
      const x0 = -SIDE + ((2 * SIDE) / lips) * s
      const x1 = x0 + (2 * SIDE) / lips
      b.quad(V(x0, lip(x0), z1 + WALL_OUT + 0.01), V(x1, lip(x1), z1 + WALL_OUT + 0.01), V(x1, lip(x1), z1 - 0.01), V(x0, lip(x0), z1 - 0.01), 'meadow', [sunTint(x0, 0.82), sunTint(x1, 0.82), sunTint(x1, 0.9), sunTint(x0, 0.9)], [0, 0.4, 1, 0.45])
    }
  }
}

/**
 * A stone wall facing the camera, in one-unit segments so the painted stones tile without leaving their atlas region.
 * Each corner takes the painting's height from its own: where the top rises beside the grid, the stones keep their
 * size and their courses stay level instead of stretching segment by segment.
 */
function wallStrip(b: MeshBuilder, xa: number, xb: number, bottom: number, top: (x: number) => number, z: number): void {
  const region = uvRect('wall')
  const u = (t: number) => region.u0 + (region.u1 - region.u0) * t
  const v = (y: number) => region.v0 + (region.v1 - region.v0) * Math.min(1, (0.5 * (y - bottom)) / STEP)
  const facing = V(0, 0, 1)
  const segs = Math.round(xb - xa)
  for (let s = 0; s < segs; s++) {
    const x0 = xa + ((xb - xa) * s) / segs
    const x1 = xa + ((xb - xa) * (s + 1)) / segs
    const u0 = (s % 2) * 0.5
    const i0 = b.vertex(V(x0, bottom, z), facing, u(u0), v(bottom), sunTint(x0, 0.6, 0.02))
    const i1 = b.vertex(V(x1, bottom, z), facing, u(u0 + 0.5), v(bottom), sunTint(x1, 0.6, 0.02))
    const i2 = b.vertex(V(x1, top(x1), z), facing, u(u0 + 0.5), v(top(x1)), sunTint(x1, 0.98, 0.1))
    const i3 = b.vertex(V(x0, top(x0), z), facing, u(u0), v(top(x0)), sunTint(x0, 0.98, 0.1))
    b.indices.push(i0, i1, i2, i0, i2, i3)
  }
}

function upperHill(b: MeshBuilder): void {
  const y0 = floorY(0)
  const z0 = backZ(0)
  const ledgeY = y0 + 0.4
  wallStrip(b, -SIDE, SIDE, y0, () => ledgeY, z0)
  const rows: [number, number][] = [
    [z0, ledgeY],
    [z0 - 1.1, ledgeY + 0.06],
    [z0 - 2.0, ledgeY + 0.22],
    [CREST_Z, CREST_Y],
    [CREST_Z - 1.6, CREST_Y - 0.5],
  ]
  for (let i = 0; i < rows.length - 1; i++) {
    const [za, ya] = rows[i]
    const [zb, yb] = rows[i + 1]
    const segs = 6
    for (let s = 0; s < segs; s++) {
      const x0 = -SIDE - 2 + ((2 * SIDE + 4) / segs) * s
      const x1 = x0 + (2 * SIDE + 4) / segs
      // Flat where the slope meets the ledge wall: a bump lifting its front edge off the wall's top opens a slit of sky.
      const bump = (x: number, z: number) => Math.sin(x * 0.7 + z) * 0.12 * Math.min(1, (z0 - z) / 1.1)
      const haze = 0.95 - i * 0.05
      b.quad(V(x0, ya + bump(x0, za), za), V(x1, ya + bump(x1, za), za), V(x1, yb + bump(x1, zb), zb), V(x0, yb + bump(x0, zb), zb), 'meadow', [sunTint(x0, haze), sunTint(x1, haze), sunTint(x1, haze - 0.04), sunTint(x0, haze - 0.04)])
    }
  }
}

function creekAndBank(b: MeshBuilder): void {
  const bedY = CREEK_Y - 0.1
  for (let s = 0; s < 8; s++) {
    const x0 = -SIDE - 2 + ((2 * SIDE + 4) / 8) * s
    const x1 = x0 + (2 * SIDE + 4) / 8
    b.quad(V(x0, bedY, CREEK_Z1), V(x1, bedY, CREEK_Z1), V(x1, bedY, CREEK_Z0), V(x0, bedY, CREEK_Z0), 'bank', colour('#6d7a5a', 0.8))
    b.quad(V(x0, bedY, CREEK_Z1), V(x1, bedY, CREEK_Z1), V(x1, BANK_Y, CREEK_Z1 + 0.18), V(x0, BANK_Y, CREEK_Z1 + 0.18), 'bank', [colour('#8a8060', 0.7), colour('#8a8060', 0.7), colour('#c8b890'), colour('#c8b890')], [0, 0, 1, 0.4])
  }
  const zs = [CREEK_Z1 + 0.18, CREEK_Z1 + 0.5, RACK_Z + 1.4, RACK_Z + 4]
  for (let i = 0; i < zs.length - 1; i++) {
    const segs = 8
    for (let s = 0; s < segs; s++) {
      const x0 = -SIDE - 2 + ((2 * SIDE + 4) / segs) * s
      const x1 = x0 + (2 * SIDE + 4) / segs
      const region = i === 0 ? 'bank' : 'grass'
      const tint = i === 0 ? 1 : 0.94
      b.quad(V(x0, BANK_Y, zs[i + 1]), V(x1, BANK_Y, zs[i + 1]), V(x1, BANK_Y, zs[i]), V(x0, BANK_Y, zs[i]), region, [sunTint(x0, tint), sunTint(x1, tint), sunTint(x1, tint * 1.02), sunTint(x0, tint * 1.02)])
    }
  }
}

function rack(b: MeshBuilder): void {
  const half = RACK_SPACING * 2.5 + 0.12
  const z0 = RACK_Z - 0.46
  const z1 = RACK_Z + 0.46
  const y = RACK_Y
  const shadow = colour('#3a4a3a', 0.6)
  b.quad(V(-half - 0.06, BANK_Y + 0.004, z1 + 0.1), V(half + 0.1, BANK_Y + 0.004, z1 + 0.1), V(half + 0.1, BANK_Y + 0.004, z0 - 0.02), V(-half - 0.06, BANK_Y + 0.004, z0 - 0.02), 'blob', shadow, [0.1, 0.1, 0.9, 0.9])
  const slots = 5
  for (let s = 0; s < slots; s++) {
    const x0 = -half + ((2 * half) / slots) * s
    const x1 = x0 + (2 * half) / slots
    b.quad(V(x0, y, z1), V(x1, y, z1), V(x1, y, z0), V(x0, y, z0), 'mat', [sunTint(x0, 1.04), sunTint(x1, 1.04), sunTint(x1, 0.94), sunTint(x0, 0.94)])
  }
  const rail = (z: number, w: number) => {
    const t = 0.06
    b.quad(V(-half - 0.04, y + t, z + w), V(half + 0.04, y + t, z + w), V(half + 0.04, y + t, z - w), V(-half - 0.04, y + t, z - w), 'wood', colour('#f0d0a8'), [0, 0, 1, 0.25])
    b.quad(V(-half - 0.04, y - 0.02, z + w), V(half + 0.04, y - 0.02, z + w), V(half + 0.04, y + t, z + w), V(-half - 0.04, y + t, z + w), 'wood', colour('#a07850'), [0, 0, 1, 0.25])
  }
  rail(z0, 0.05)
  rail(z1, 0.05)
}

function rockGeometry(random: () => number, detail = 1): THREE.BufferGeometry {
  const g = new THREE.IcosahedronGeometry(1, detail)
  const p = g.getAttribute('position')
  const v = new THREE.Vector3()
  const seed = random() * 10
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i)
    const k = 1 + Math.sin(v.x * 3 + seed) * 0.12 + Math.cos(v.z * 4 + seed) * 0.1
    v.multiplyScalar(k)
    if (v.y < -0.2) v.y = -0.2
    p.setXYZ(i, v.x, v.y, v.z)
  }
  g.computeVertexNormals()
  const colours: number[] = []
  const n = g.getAttribute('normal')
  for (let i = 0; i < p.count; i++) {
    const up = n.getY(i) * 0.5 + 0.5
    const side = -n.getX(i) * 0.5 + 0.5
    const light = 0.6 + up * 0.38 + side * 0.12
    const warm = up * 0.6 + side * 0.4
    colours.push(light * (0.94 + warm * 0.1), light * (0.94 + warm * 0.04), light * (1.04 - warm * 0.1))
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  return g
}

function rocks(b: MeshBuilder, random: () => number): void {
  const m = new THREE.Matrix4()
  const place = (x: number, y: number, z: number, sx: number, sy: number, sz: number, tint = '#ffffff') => {
    m.compose(V(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, random() * 6, 0)), V(sx, sy, sz))
    const g = rockGeometry(random)
    b.append(g, colour(tint), 'rock', m, 0.6)
    g.dispose()
  }
  const s = SPRING
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2 + 0.3
    if (Math.sin(a) > 0.55) continue
    place(s.x + Math.cos(a) * 0.62, s.y - 0.08, s.z + Math.sin(a) * 0.34, 0.2 + random() * 0.12, 0.16 + random() * 0.14, 0.18 + random() * 0.08)
  }
  place(s.x - 0.95, s.y + 0.02, s.z - 0.35, 0.45, 0.42, 0.36, '#e8e4dc')
  place(s.x + 0.9, s.y - 0.02, s.z - 0.25, 0.38, 0.3, 0.32)
  place(s.x - 0.3, s.y + 0.1, s.z - 0.7, 0.5, 0.36, 0.3, '#f0ece4')
  const p = POND
  for (let i = 0; i < 11; i++) {
    const a = (i / 11) * Math.PI * 2
    place(p.x + Math.cos(a) * 1.05, p.y + 0.02, p.z + Math.sin(a) * 0.55, 0.14 + random() * 0.1, 0.1 + random() * 0.08, 0.12 + random() * 0.06, '#dcd8d0')
  }
  for (let i = 0; i < 14; i++) {
    const x = -SIDE + random() * SIDE * 2
    if (Math.abs(x) < GRID_RIGHT + 0.3) continue
    place(x, CREEK_Y + 0.02, CREEK_Z0 + 0.05 + random() * 0.5, 0.08 + random() * 0.1, 0.06 + random() * 0.05, 0.08 + random() * 0.06, '#d0ccc4')
  }
}

function trunk(b: MeshBuilder, x: number, y: number, z: number, h: number, w: number): void {
  const g = new THREE.CylinderGeometry(w * 0.7, w, h, 7, 1, true)
  const colours: number[] = []
  const n = g.getAttribute('normal')
  for (let i = 0; i < n.count; i++) {
    const lit = -n.getX(i) * 0.5 + 0.5
    colours.push(0.35 + lit * 0.3, 0.27 + lit * 0.2, 0.22 + lit * 0.12)
  }
  g.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  b.append(g, colour('#ffffff'), 'wood', new THREE.Matrix4().makeTranslation(x, y + h / 2, z))
  g.dispose()
}

function foliage(f: MeshBuilder, solid: MeshBuilder, random: () => number): void {
  /** `rise` is where the canopy starts up the trunk; the crest trees' canopies sit low so the frame's top edge shows them, not bare poles. */
  const tree = (x: number, y: number, z: number, s: number, lean = 0, rise = 0.55) => {
    trunk(solid, x, y, z, s * 0.9, s * 0.09)
    f.card(V(x + lean * 0.3 + 0.1 * s, y + s * rise, z - 0.3), s * 1.5, s * 1.25, 'canopyDark', colour('#ffffff', 0.92), 0, 0.25)
    f.card(V(x + lean * 0.5 - 0.15 * s, y + s * (rise + 0.07), z), s * 1.35, s * 1.2, 'canopy', colour('#ffffff'), 0.1, 0.3)
    f.card(V(x + lean * 0.4 + 0.3 * s, y + s * (rise + 0.25), z + 0.25), s * 0.95, s * 0.85, 'canopy', colour('#fffbe8', 1.04), -0.15, 0.35)
  }
  tree(-6.3, floorY(1), rowZ(1) - 0.2, 2.6, 0.3)
  tree(6.5, floorY(0) + 0.2, backZ(0) - 0.6, 2.3, -0.2)
  tree(-4.4, CREST_Y - 0.1, CREST_Z - 0.3, 2.1, 0, -0.2)
  tree(-2.9, CREST_Y - 0.2, CREST_Z - 1.1, 1.6, 0, -0.2)
  tree(3.6, CREST_Y - 0.1, CREST_Z - 0.4, 1.9, 0, -0.2)
  tree(5.4, CREST_Y - 0.2, CREST_Z - 1.2, 1.7, 0, -0.2)
  f.card(V(4.5, floorY(0) + 0.4, backZ(0) - 1.3), 2.6, 2.5, 'bambooGrove', colour('#ffffff', 0.95), 0.2, 0.3)
  f.card(V(-5.0, floorY(0) + 0.4, backZ(0) - 1.2), 2.4, 2.4, 'bambooGrove', colour('#ffffff', 0.9), -0.2, 0.3)
  for (let r = 0; r < ROWS; r++) {
    const y = floorY(r)
    const z = frontZ(r) - 0.02
    for (const side of [-1, 1]) {
      for (let k = 0; k < 3; k++) {
        const x = side * (GRID_RIGHT + 1.3 + k * 1.1 + random() * 0.3)
        f.card(V(x, y + Math.max(0, Math.abs(x) - GRID_RIGHT) * SIDE_RISE, z - 0.3 - random() * 0.3), 1.1 + random() * 0.4, 0.5 + random() * 0.2, 'bush', sunTint(x, 1), (random() - 0.5) * 0.4, 0.4)
      }
    }
    for (let c = 0; c <= COLS; c++) {
      const x = cellX(c) - 0.5 + (random() - 0.5) * 0.08
      f.card(V(x, y - 0.02, z + WALL_OUT + 0.02), 0.34, 0.13 + random() * 0.05, 'tuft', sunTint(x, 1.02), 0, 1)
    }
    for (let k = 0; k < 5; k++) {
      const x = (random() > 0.5 ? 1 : -1) * (GRID_RIGHT + 0.2 + random() * 3.2)
      f.card(V(x, y + Math.max(0, Math.abs(x) - GRID_RIGHT) * SIDE_RISE, rowZ(r) + (random() - 0.5) * 0.6), 0.6, 0.26, 'wildflowers', colour('#ffffff'), (random() - 0.5) * 0.5, 1)
    }
  }
  for (let k = 0; k < 12; k++) {
    const x = -SIDE + random() * SIDE * 2
    f.card(V(x, floorY(0) + 0.42, backZ(0) - 0.2 - random() * 1.2), 0.9, 0.3, random() > 0.5 ? 'tuft' : 'wildflowers', sunTint(x, 0.98), (random() - 0.5) * 0.4, 1)
  }
  const p = POND
  for (let k = 0; k < 5; k++) f.card(V(p.x - 1.1 + k * 0.18, CREEK_Y, p.z - 0.45 + random() * 0.2), 0.5, 0.55 + random() * 0.3, 'reeds', colour('#ffffff'), 0.3, 1)
  for (let k = 0; k < 10; k++) {
    const x = -SIDE + random() * SIDE * 2
    if (Math.abs(x) < 3.4) continue
    f.card(V(x, BANK_Y, CREEK_Z1 + 0.25 + random() * 0.3), 0.7, 0.3 + random() * 0.2, random() > 0.4 ? 'tuft' : 'reeds', sunTint(x, 1), (random() - 0.5) * 0.3, 1)
  }
  for (let k = 0; k < 8; k++) {
    const x = (random() > 0.5 ? 1 : -1) * (3.6 + random() * 3)
    f.card(V(x, BANK_Y, RACK_Z - 0.2 + random() * 1.2), 0.8, 0.28, random() > 0.5 ? 'wildflowers' : 'tuft', sunTint(x, 1), (random() - 0.5) * 0.4, 1)
  }
  const lily = uvRect('lily')
  for (let k = 0; k < 5; k++) {
    const x = p.x - 0.6 + random() * 1.2
    const z = p.z - 0.25 + random() * 0.5
    const s = 0.14 + random() * 0.08
    const yy = CREEK_Y + 0.012
    const base = f.vertexCount
    const up = V(0, 1, 0)
    const tint = colour('#ffffff')
    const a = random() * 6
    for (const [dx, dz, u, v] of [
      [-1, 1, lily.u0, lily.v0],
      [1, 1, lily.u1, lily.v0],
      [1, -1, lily.u1, lily.v1],
      [-1, -1, lily.u0, lily.v1],
    ]) {
      const cx = Math.cos(a) * dx - Math.sin(a) * dz
      const cz = Math.sin(a) * dx + Math.cos(a) * dz
      f.vertex(V(x + cx * s, yy, z + cz * s * 0.8), up, u, v, tint, 0)
    }
    f.indices.push(base, base + 1, base + 2, base, base + 2, base + 3)
  }
}

export type Scenery = {
  group: THREE.Group
  sky: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>
  /** Draw this share of the light shafts, most prominent first. */
  showShafts(share: number): void
}

// The sky is a painted backdrop pinned to the screen: its top is always the
// top of the view, so the clouds sit where the painting put them whatever
// the surface's shape. Only the strip above the hill crest is ever seen.
const SKY_VERTEX = /* glsl */ `
uniform float uScale;
uniform float uDrift;
varying vec2 vUv;
void main() {
  vUv = vec2(uv.x * uScale + uDrift, uv.y);
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`
const SKY_FRAGMENT = /* glsl */ `
uniform sampler2D map;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(map, vUv);
  #include <colorspace_fragment>
}
`

const SHAFT_VERTEX = /* glsl */ `
attribute float aPhase;
varying vec2 vUv;
varying float vPhase;
void main() {
  vUv = uv;
  vPhase = aPhase;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`
const SHAFT_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform float uTime;
uniform float uStrength;
varying vec2 vUv;
varying float vPhase;
void main() {
  float a = texture2D(map, vUv).a;
  float breathe = 0.6 + 0.4 * sin(uTime * 0.3 + vPhase * 6.2831);
  gl_FragColor = vec4(vec3(1.0, 0.9, 0.62) * a * breathe * uStrength, 1.0);
}
`

const SHAFTS = [
  { x: -6.2, w: 1.3, s: 1 },
  { x: -4.6, w: 0.7, s: 0.8 },
  { x: -3.3, w: 1.6, s: 1 },
  { x: -1.4, w: 0.9, s: 0.75 },
  { x: 0.4, w: 1.4, s: 0.9 },
  { x: 2.2, w: 0.8, s: 0.6 },
]
/** Index order, most visible first (judged from each shaft rendered alone), so a lower tier drawing only the first few keeps the light that reads. */
const SHAFT_PROMINENCE = [1, 5, 3, 0, 2, 4]

function lightShafts(atlas: THREE.Texture, time: { value: number }): { mesh: THREE.Mesh; show(share: number): void } {
  const r = uvRect('shaft', 4)
  const positions: number[] = []
  const uvs: number[] = []
  const phases: number[] = []
  const indices: number[] = []
  const dir = V(0.55, -0.74, 0.38).normalize()
  SHAFTS.forEach((shaft, i) => {
    const top = V(shaft.x - 1.6, 5.2, -4.2 + i * 0.35)
    const bottom = top.clone().addScaledVector(dir, 8.5 * shaft.s + 2)
    const side = V(0, 0, 1).cross(dir).normalize().multiplyScalar(shaft.w / 2)
    for (const [p, u, v] of [
      [top.clone().sub(side), r.u0, r.v1],
      [top.clone().add(side), r.u1, r.v1],
      [bottom.clone().add(side.clone().multiplyScalar(1.8)), r.u1, r.v0],
      [bottom.clone().sub(side.clone().multiplyScalar(1.8)), r.u0, r.v0],
    ] as [THREE.Vector3, number, number][]) {
      positions.push(p.x, p.y, p.z)
      uvs.push(u, v)
      phases.push(i * 0.27)
    }
  })
  for (const i of SHAFT_PROMINENCE) {
    const base = i * 4
    indices.push(base, base + 2, base + 1, base, base + 3, base + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  g.setAttribute('aPhase', new THREE.Float32BufferAttribute(phases, 1))
  g.setIndex(indices)
  const material = new THREE.ShaderMaterial({
    vertexShader: SHAFT_VERTEX,
    fragmentShader: SHAFT_FRAGMENT,
    uniforms: { map: { value: atlas }, uTime: time, uStrength: { value: 0.3 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
  })
  const mesh = new THREE.Mesh(g, material)
  mesh.renderOrder = 10
  mesh.frustumCulled = false
  const show = (share: number) => g.setDrawRange(0, Math.max(1, Math.round(SHAFTS.length * share)) * 6)
  return { mesh, show }
}

export function buildScenery(atlas: THREE.Texture, skyTexture: THREE.Texture, time: { value: number }): Scenery {
  const random = rng(4242)
  const group = new THREE.Group()
  const ground = new MeshBuilder()
  terraces(ground, random)
  upperHill(ground)
  creekAndBank(ground)
  rack(ground)
  rocks(ground, random)
  const leaves = new MeshBuilder()
  foliage(leaves, ground, random)
  group.add(new THREE.Mesh(ground.build(), paintedMaterial(atlas)))
  const leafMesh = new THREE.Mesh(leaves.build(true), foliageMaterial(atlas))
  group.add(leafMesh)

  const far = new MeshBuilder()
  far.quad(V(-18, -4.6, -16), V(18, -4.6, -16), V(18, 1.0, -16), V(-18, 1.0, -16), 'farHills', colour('#ffffff'))
  const farMaterial = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, transparent: true, depthWrite: false, fog: false })
  const farMesh = new THREE.Mesh(far.build(), farMaterial)
  farMesh.renderOrder = -1
  group.add(farMesh)

  const skyMaterial = new THREE.ShaderMaterial({
    vertexShader: SKY_VERTEX,
    fragmentShader: SKY_FRAGMENT,
    uniforms: { map: { value: skyTexture }, uScale: { value: 1 }, uDrift: { value: 0 } },
    depthTest: false,
    depthWrite: false,
  })
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), skyMaterial)
  sky.renderOrder = -2
  sky.frustumCulled = false
  group.add(sky)

  const shafts = lightShafts(atlas, time)
  group.add(shafts.mesh)
  return { group, sky, showShafts: shafts.show }
}

export function sceneFog(): THREE.Fog {
  return new THREE.Fog(HAZE, 24, 48)
}

export const SPRING_TOP_ROW_Y = floorY(0)
export const SPRING_COLUMN = SPRING_COL
