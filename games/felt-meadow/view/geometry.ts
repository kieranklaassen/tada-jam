import {
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  CatmullRomCurve3,
  Color,
  CylinderGeometry,
  Euler,
  IcosahedronGeometry,
  LatheGeometry,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  SphereGeometry,
  TorusGeometry,
  TubeGeometry,
  Vector2,
  Vector3,
} from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import {
  BURROW,
  BURROW_HOLE,
  BUSHES,
  groundY,
  HILL,
  PLOT_RADIUS,
  PLOTS,
  POUCH,
  POUCH_INSIDE,
  POUCH_PROFILE,
  POUCH_RADIUS,
  POUCH_RUFFLE_Y,
  POUCH_STRING,
  SEED_RADIUS,
  STONES,
} from '../layout'
import { smoothstep } from '../math'
import type { SeasonLook } from '../season'
import { paint, PALETTE } from './felt'

// Every mesh in the meadow, built once when the page first mounts it. Rigid
// props are merged into single geometries with their colours (and contact
// occlusion) baked into vertex colours; anything that repeats is instanced
// by the models. Units are about a centimetre.

/** `tuck`: how far the slab's sides run on below the paper floor, so none of the slab lies in the floor's plane. */
export const SLAB = { bottom: -16, corner: 18, roll: 6, tuck: 2 }

type Shade = (p: Vector3, n: Vector3, out: Color) => void

const tmpP = new Vector3()
const tmpN = new Vector3()
const tmpC = new Color()

function tint(geometry: BufferGeometry, shade: number | Shade): BufferGeometry {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    tmpN.fromBufferAttribute(normal, i)
    if (typeof shade === 'number') paint(shade, tmpC)
    else shade(tmpP, tmpN, tmpC)
    colors[i * 3] = tmpC.r
    colors[i * 3 + 1] = tmpC.g
    colors[i * 3 + 2] = tmpC.b
  }
  geometry.setAttribute('color', new BufferAttribute(colors, 3))
  return geometry
}

function place(geometry: BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): BufferGeometry {
  const matrix = new Matrix4().compose(new Vector3(x, y, z), new Quaternion().setFromEuler(new Euler(rx, ry, rz)), new Vector3(sx, sy, sz))
  geometry.applyMatrix4(matrix)
  return geometry
}

function merge(parts: BufferGeometry[]): BufferGeometry {
  const indexed = parts.map((part) => (part.index ? part : indexedCopy(part)))
  const merged = mergeGeometries(indexed, false)
  if (!merged) throw new Error('felt-meadow: geometry parts do not share attributes')
  for (const part of parts) part.dispose()
  return merged
}

function indexedCopy(geometry: BufferGeometry): BufferGeometry {
  const count = geometry.getAttribute('position').count
  const index = new Uint32Array(count)
  for (let i = 0; i < count; i++) index[i] = i
  geometry.setIndex(new BufferAttribute(index, 1))
  return geometry
}

function hash(x: number, y: number, z: number): number {
  const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453
  return s - Math.floor(s)
}

function valueNoise(x: number, y: number, z: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const iz = Math.floor(z)
  const fx = x - ix
  const fy = y - iy
  const fz = z - iz
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  const uz = fz * fz * (3 - 2 * fz)
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t
  const n = (dx: number, dy: number, dz: number) => hash(ix + dx, iy + dy, iz + dz)
  return lerp(
    lerp(lerp(n(0, 0, 0), n(1, 0, 0), ux), lerp(n(0, 1, 0), n(1, 1, 0), ux), uy),
    lerp(lerp(n(0, 0, 1), n(1, 0, 1), ux), lerp(n(0, 1, 1), n(1, 1, 1), ux), uy),
    uz,
  )
}

/** Push vertices along their normals by soft noise: hand-felted things are never perfectly round. */
function lumpy(geometry: BufferGeometry, amount: number, frequency: number, seed = 0): BufferGeometry {
  const position = geometry.getAttribute('position')
  const normal = geometry.getAttribute('normal')
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    tmpN.fromBufferAttribute(normal, i)
    const n = valueNoise(tmpP.x * frequency + seed, tmpP.y * frequency, tmpP.z * frequency) - 0.5
    tmpP.addScaledVector(tmpN, n * amount)
    position.setXYZ(i, tmpP.x, tmpP.y, tmpP.z)
  }
  geometry.computeVertexNormals()
  return geometry
}

function mixHex(a: number, b: number, t: number, out: Color): Color {
  paint(a, out)
  const r = out.r
  const g = out.g
  const bl = out.b
  paint(b, out)
  return out.setRGB(r + (out.r - r) * t, g + (out.g - g) * t, bl + (out.b - bl) * t)
}

function sphere(radius: number, width = 16, height = 12): BufferGeometry {
  return new SphereGeometry(radius, width, height)
}

function rod(from: Vector3, to: Vector3, radius: number, segments = 6): BufferGeometry {
  const length = from.distanceTo(to)
  const geometry = new CylinderGeometry(radius, radius * 0.85, length, segments, 1)
  const direction = to.clone().sub(from).normalize()
  const quaternion = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction)
  geometry.applyMatrix4(new Matrix4().compose(from.clone().add(to).multiplyScalar(0.5), quaternion, new Vector3(1, 1, 1)))
  return geometry
}

// ---- the hill ------------------------------------------------------------

function axis(lo: number, hi: number, margin: number, inner: number, outer: number): number[] {
  const out: number[] = []
  for (let i = outer; i >= 1; i--) out.push(lo - margin * (i / outer) ** 1.7)
  for (let i = 0; i <= inner; i++) out.push(lo + ((hi - lo) * i) / inner)
  for (let i = 1; i <= outer; i++) out.push(hi + margin * (i / outer) ** 1.7)
  return out
}

/** The felt slab: the hill's top surface rolling over a soft rounded edge into straight sides. */
export function hillGeometry(look: SeasonLook): BufferGeometry {
  const { corner, roll, bottom, tuck } = SLAB
  const margin = roll * (Math.PI / 2) + 34
  const xs = axis(HILL.left, HILL.right, margin, 72, 14)
  const zs = axis(HILL.far, HILL.near, margin, 50, 14)
  const positions: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const grass = paint(parseInt(look.grass.slice(1), 16))
  const fleck = paint(parseInt(look.grassFleck.slice(1), 16))
  const color = new Color()
  for (const Z of zs) {
    for (const X of xs) {
      const cx = Math.min(HILL.right - corner, Math.max(HILL.left + corner, X))
      const cz = Math.min(HILL.near - corner, Math.max(HILL.far + corner, Z))
      const dx = X - cx
      const dz = Z - cz
      const distance = Math.hypot(dx, dz)
      let x = X
      let z = Z
      let y: number
      let drop = 0
      if (distance <= corner) y = groundY(X, Z)
      else {
        const nx = dx / distance
        const nz = dz / distance
        const ex = cx + nx * corner
        const ez = cz + nz * corner
        const d = distance - corner
        const arc = roll * (Math.PI / 2)
        const out = d <= arc ? roll * Math.sin(d / roll) : roll
        drop = d <= arc ? roll * (1 - Math.cos(d / roll)) : roll + (d - arc)
        x = ex + nx * out
        z = ez + nz * out
        y = Math.max(bottom - tuck, groundY(ex, ez) - drop)
      }
      positions.push(x, y, z)
      uvs.push(X / 17, Z / 17)

      const mottle = valueNoise(x * 0.035, 0.5, z * 0.035) - 0.5
      const patch = smoothstep(0.66, 0.82, valueNoise(x * 0.09 + 3, 1.5, z * 0.09))
      color.copy(grass).lerp(fleck, patch * 0.22)
      let light = 1 + mottle * 0.12
      for (let plot = 0; plot < PLOTS.length; plot++) {
        const r = Math.hypot(x - PLOTS[plot].x, z - PLOTS[plot].z)
        light *= 1 - 0.3 * Math.exp(-(((r - PLOT_RADIUS * 0.98) / 2.8) ** 2)) - (r < PLOT_RADIUS ? 0.2 : 0)
      }
      const rp = Math.hypot(x - POUCH.x, z - POUCH.z)
      light *= 1 - 0.32 * Math.exp(-(((rp - POUCH_RADIUS * 0.95) / 3.6) ** 2)) - (rp < POUCH_RADIUS ? 0.25 : 0)
      const rb = Math.hypot(x - BURROW.x, z - BURROW.z)
      light *= 1 - 0.25 * Math.exp(-(((rb - 4.2) / 2.2) ** 2))
      light *= 1 - 0.14 * Math.min(1, drop / roll) - 0.22 * smoothstep(roll, roll + 28, drop)
      color.multiplyScalar(light)
      colors.push(color.r, color.g, color.b)
    }
  }
  const width = xs.length
  const index: number[] = []
  // The burrow's hole: the hill is cut away there, and the grass round the cut is drawn in under the soil ring, so
  // the ring hides the cut's edge.
  const fromBurrow = (v: number) => Math.hypot(positions[v * 3] - BURROW.x, positions[v * 3 + 2] - BURROW.z)
  const cut = (v: number) => fromBurrow(v) < BURROW_HOLE.open
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < width - 1; i++) {
      const quad = [j * width + i, j * width + i + 1, (j + 1) * width + i, (j + 1) * width + i + 1]
      if (!quad.some(cut)) continue
      for (const v of quad) {
        const r = fromBurrow(v)
        if (cut(v) || r <= BURROW_HOLE.rim) continue
        const x = BURROW.x + ((positions[v * 3] - BURROW.x) / r) * BURROW_HOLE.rim
        const z = BURROW.z + ((positions[v * 3 + 2] - BURROW.z) / r) * BURROW_HOLE.rim
        positions.splice(v * 3, 3, x, groundY(x, z), z)
      }
    }
  }
  // Past the sides the grid folds flat onto the slab's tucked bottom, under the paper floor: faces lying there are
  // never seen and would only overlap each other.
  const floor = (v: number) => positions[v * 3 + 1] <= bottom - tuck + 1e-6
  const kept = (u: number, v: number, w: number) => !cut(u) && !cut(v) && !cut(w) && !(floor(u) && floor(v) && floor(w))
  for (let j = 0; j < zs.length - 1; j++) {
    for (let i = 0; i < width - 1; i++) {
      const a = j * width + i
      const b = a + 1
      const c = a + width
      const d = c + 1
      if (kept(a, c, b)) index.push(a, c, b)
      if (kept(b, c, d)) index.push(b, c, d)
    }
  }
  // Only the vertices still in use, so nothing of the hill is left over the hole.
  const used: number[] = []
  const renumber = new Map<number, number>()
  for (let k = 0; k < index.length; k++) {
    if (!renumber.has(index[k])) {
      renumber.set(index[k], used.length)
      used.push(index[k])
    }
    index[k] = renumber.get(index[k]) as number
  }
  const pick = (from: number[], n: number) => new Float32Array(used.flatMap((v) => from.slice(v * n, v * n + n)))
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(pick(positions, 3), 3))
  geometry.setAttribute('uv', new BufferAttribute(pick(uvs, 2), 2))
  geometry.setAttribute('color', new BufferAttribute(pick(colors, 3), 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

/** Where the backdrop's floor turns up into its wall, and the wall's plane: close enough behind the slab to fill the top of the frame. */
export const WALL = { turn: -94, radius: 18, z: -112 }

/** The warm seamless paper the slab stands on, curving up into a pale sky wall; the slab's contact shadow is baked in. */
export function backdropGeometry(look: SeasonLook): BufferGeometry {
  const profile: { z: number; y: number }[] = []
  const bottom = SLAB.bottom
  for (let i = 0; i <= 16; i++) profile.push({ z: 320 - (i / 16) * (320 - WALL.turn), y: bottom })
  const radius = WALL.radius
  for (let i = 1; i <= 10; i++) {
    const a = (i / 10) * (Math.PI / 2)
    profile.push({ z: WALL.turn - Math.sin(a) * radius, y: bottom + (1 - Math.cos(a)) * radius })
  }
  for (let i = 1; i <= 8; i++) profile.push({ z: WALL.turn - radius, y: bottom + radius + (i / 8) * 300 })
  const sky = parseInt(look.sky.slice(1), 16)
  const columns = 56
  const positions: number[] = []
  const colors: number[] = []
  const uvs: number[] = []
  const color = new Color()
  for (let j = 0; j < profile.length; j++) {
    const { z, y } = profile[j]
    for (let i = 0; i <= columns; i++) {
      const x = -700 + (i / columns) * 1400
      positions.push(x, y, z)
      uvs.push(i / columns, j / profile.length)
      const height = y - bottom
      if (height < 1) mixHex(PALETTE.floorNear, PALETTE.floorFar, smoothstep(320, WALL.turn, z), color)
      else mixHex(PALETTE.floorFar, sky, smoothstep(0, 30, height), color)
      const ox = Math.max(0, Math.abs(x) - (HILL.right - 4))
      const oz = Math.max(0, z - (HILL.near - 4), HILL.far + 4 - z)
      const outside = Math.hypot(ox, oz)
      let light = 1 - 0.34 * Math.exp(-outside / 9) * (height < 1 ? 1 : Math.exp(-height / 12))
      light *= 1 - 0.1 * smoothstep(200, 620, Math.abs(x)) - 0.05 * smoothstep(160, 320, z)
      color.multiplyScalar(light)
      colors.push(color.r, color.g, color.b)
    }
  }
  const index: number[] = []
  const width = columns + 1
  for (let j = 0; j < profile.length - 1; j++) {
    for (let i = 0; i < columns; i++) {
      const a = j * width + i
      const b = a + 1
      const c = a + width
      const d = c + 1
      index.push(a, b, c, b, d, c)
    }
  }
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(positions), 3))
  geometry.setAttribute('uv', new BufferAttribute(new Float32Array(uvs), 2))
  geometry.setAttribute('color', new BufferAttribute(new Float32Array(colors), 3))
  geometry.setIndex(index)
  geometry.computeVertexNormals()
  return geometry
}

// ---- props -------------------------------------------------------------

export function molehillGeometry(): BufferGeometry {
  const profile = [
    [PLOT_RADIUS * 1.12, -3.2],
    [PLOT_RADIUS * 1.05, -0.6],
    [PLOT_RADIUS * 0.96, 0.6],
    [PLOT_RADIUS * 0.82, 1.9],
    [PLOT_RADIUS * 0.62, 3.1],
    [PLOT_RADIUS * 0.46, 3.85],
    [PLOT_RADIUS * 0.36, 4.2],
    [PLOT_RADIUS * 0.28, 4.05],
    [PLOT_RADIUS * 0.18, 3.7],
    [0.01, 3.5],
  ].map(([r, y]) => new Vector2(r, y))
  const geometry = new LatheGeometry(profile, 30)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    const angle = Math.atan2(tmpP.z, tmpP.x)
    const r = Math.hypot(tmpP.x, tmpP.z)
    const lump = 1 + 0.07 * Math.sin(angle * 5 + tmpP.y * 0.6) + 0.045 * Math.sin(angle * 11 + 2) + 0.05 * (valueNoise(tmpP.x * 0.4, tmpP.y * 0.4, tmpP.z * 0.4) - 0.5)
    const k = r > PLOT_RADIUS * 0.3 ? lump : 1
    position.setXYZ(i, tmpP.x * k, tmpP.y + (r > 2 ? 0.25 * Math.sin(angle * 7) : 0), tmpP.z * k)
  }
  geometry.computeVertexNormals()
  return tint(geometry, (p, _n, out) => {
    const r = Math.hypot(p.x, p.z)
    const dimple = r < PLOT_RADIUS * 0.3 ? 0.62 : 1
    const base = 0.72 + 0.28 * smoothstep(-1.5, 2.2, p.y)
    const crumb = 0.92 + 0.16 * valueNoise(p.x * 0.9, p.y * 0.9, p.z * 0.9)
    paint(PALETTE.soil, out).multiplyScalar(dimple * base * crumb)
  })
}

export function seedGeometry(): BufferGeometry {
  const geometry = lumpy(sphere(SEED_RADIUS, 20, 14), 0.22, 1.1)
  return tint(geometry, (p, _n, out) => out.setRGB(1, 1, 1).multiplyScalar(0.74 + 0.26 * smoothstep(-SEED_RADIUS, SEED_RADIUS * 0.4, p.y)))
}

/** The cream drawstring pouch, sitting up with its mouth open toward the child. */
export function pouchGeometry(): BufferGeometry {
  const body = new LatheGeometry(
    POUCH_PROFILE.map(([r, y]) => new Vector2(r, y)),
    40,
  )
  const position = body.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    const angle = Math.atan2(tmpP.z, tmpP.x)
    const gather = 1 + 0.045 * Math.sin(angle * 14) * smoothstep(6.5, 10.2, tmpP.y) * (1 - smoothstep(10.8, 11.3, tmpP.y))
    const ruffle = tmpP.y > POUCH_RUFFLE_Y ? 1 + 0.07 * Math.sin(angle * 9) : 1
    const sag = 1 + 0.04 * Math.sin(angle * 2 + 0.6) * (1 - smoothstep(4, 9, tmpP.y))
    const k = gather * ruffle * sag
    position.setXYZ(i, tmpP.x * k, tmpP.y + (tmpP.y > POUCH_RUFFLE_Y ? 0.3 * Math.sin(angle * 9 + 1) : 0), tmpP.z * k)
  }
  body.computeVertexNormals()
  tint(body, (p, _n, out) => {
    const angle = Math.atan2(p.z, p.x)
    const fold = Math.sin(angle * 14) < 0 && p.y > 6.5 && p.y < 11 ? 0.9 : 1
    const base = 0.8 + 0.2 * smoothstep(-0.8, 3.5, p.y)
    mixHex(PALETTE.pouch, PALETTE.pouchShade, 1 - smoothstep(0, 6, p.y), out).multiplyScalar(fold * base)
  })
  const inside = tint(place(sphere(1, 20, 8), 0, POUCH_INSIDE.y, 0, 0, 0, 0, POUCH_INSIDE.radius, POUCH_INSIDE.depth, POUCH_INSIDE.radius), PALETTE.pouchInside)
  const string = tint(place(new TorusGeometry(POUCH_STRING.radius, POUCH_STRING.tube, 6, 36), 0, POUCH_STRING.y, 0, Math.PI / 2), PALETTE.string)
  const parts = [body, inside, string]
  for (const side of [-1, 1]) {
    const curve = new CatmullRomCurve3([
      new Vector3(side * 1.4, 10.7, 5.8),
      new Vector3(side * 2.1, 9.6, 7.4),
      new Vector3(side * 2.7, 7.8, 8.8),
      new Vector3(side * 3.3, 6.4, 9.3),
    ])
    parts.push(tint(new TubeGeometry(curve, 14, 0.34, 5), PALETTE.string))
    parts.push(tint(place(sphere(0.85, 10, 8), side * 3.35, 6.1, 9.35), PALETTE.string))
  }
  return merge(parts)
}

// ---- flowers -------------------------------------------------------------

/** One stem segment: a unit-tall open tube, its base at the origin; the models stretch it along the stem curve. */
export function stemGeometry(): BufferGeometry {
  const geometry = new CylinderGeometry(0.66, 0.72, 1, 7, 1, true)
  geometry.translate(0, 0.5, 0)
  return tint(geometry, PALETTE.stem)
}

export function leafGeometry(): BufferGeometry {
  const geometry = place(sphere(1, 14, 8), 3.1, 0, 0, 0, 0, 0, 3.3, 0.42, 1.55)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    position.setY(i, tmpP.y + (tmpP.x / 6.4) ** 2 * 1.1 - Math.abs(tmpP.z) * 0.18)
  }
  geometry.computeVertexNormals()
  return tint(geometry, (p, _n, out) => paint(Math.abs(p.z) < 0.28 ? PALETTE.leafVein : PALETTE.leaf, out).multiplyScalar(0.82 + 0.18 * smoothstep(0, 3, p.x)))
}

export const PETAL_LENGTH = 6.2

/** A petal pointing along +x from its base at the origin, cupped a little at the tip. Coloured per instance. */
export function petalGeometry(): BufferGeometry {
  const geometry = place(sphere(1, 14, 8), PETAL_LENGTH * 0.5, 0, 0, 0, 0, 0, PETAL_LENGTH * 0.5, 0.7, 2.05)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    const k = tmpP.x / PETAL_LENGTH
    position.setXYZ(i, tmpP.x, tmpP.y + k * k * 1.1, tmpP.z * (0.75 + 0.35 * Math.sin(Math.min(1, k * 1.2) * Math.PI * 0.5)))
  }
  geometry.computeVertexNormals()
  return tint(geometry, (p, _n, out) => out.setRGB(1, 1, 1).multiplyScalar(0.72 + 0.28 * smoothstep(0.2, 2.4, p.x)))
}

export function centreGeometry(): BufferGeometry {
  const geometry = lumpy(place(sphere(2.35, 16, 10), 0, 0.25, 0, 0, 0, 0, 1, 0.62, 1), 0.34, 1.4, 4)
  return tint(geometry, (p, _n, out) => out.setRGB(1, 1, 1).multiplyScalar(0.8 + 0.2 * smoothstep(-0.6, 1.2, p.y)))
}

// ---- the bee -------------------------------------------------------------

/** Stripes run along the body (z forward): a yellow front, two dark bands, a yellow tail. */
function beeStripe(z: number): number {
  const u = z / 3.9
  const dark = (a: number, b: number) => smoothstep(a - 0.07, a + 0.07, u) * (1 - smoothstep(b - 0.07, b + 0.07, u))
  return Math.min(1, dark(-0.02, 0.3) + dark(-0.66, -0.36) + (1 - smoothstep(-0.95, -0.85, u)))
}

function beeBodyBall(): BufferGeometry {
  const body = lumpy(place(sphere(1, 24, 18), 0, 0, 0, 0, 0, 0, 3.1, 2.9, 3.9), 0.18, 0.9, 9)
  return tint(body, (p, _n, out) => mixHex(PALETTE.beeYellow, PALETTE.beeDark, beeStripe(p.z), out).multiplyScalar(0.78 + 0.22 * smoothstep(-2.6, 1.6, p.y)))
}

function beeHeadBall(): BufferGeometry {
  return tint(lumpy(sphere(2.6, 20, 14), 0.14, 1.2, 3), (p, _n, out) => paint(PALETTE.beeDark, out).multiplyScalar(0.8 + 0.2 * smoothstep(-2, 1.5, p.y)))
}

/**
 * The hulls the bee's fuzz shells are pushed out from: the body and head balls
 * alone. Inflating the merged legs, eyes, cheeks, and smile too would leave a
 * dithered grey ring around every one of them, right across the face.
 */
export function beeShellGeometries(): { body: BufferGeometry; head: BufferGeometry } {
  return { body: beeBodyBall(), head: beeHeadBall() }
}

export function beeBodyGeometry(): BufferGeometry {
  const parts = [beeBodyBall()]
  for (const side of [-1, 1]) {
    for (const z of [-1.3, 0.2, 1.6]) {
      parts.push(tint(rod(new Vector3(side * 1.3, -2.2, z), new Vector3(side * 1.9, -3.4, z + 0.3), 0.3), PALETTE.beeDark))
    }
  }
  return merge(parts)
}

export const BEE_HEAD = { y: 0.95, z: 4.25 }

export function beeHeadGeometry(): BufferGeometry {
  const parts = [beeHeadBall()]
  for (const side of [-1, 1]) {
    parts.push(tint(place(sphere(1, 14, 10), side * 1.12, 0.62, 1.72, 0, 0, 0, 1.2, 1.32, 1.05), PALETTE.eyeWhite))
    parts.push(tint(place(sphere(0.7, 12, 8), side * 1.2, 0.58, 2.62, 0, 0, 0, 1, 1.12, 0.8), PALETTE.beeDark))
    parts.push(tint(place(sphere(0.24, 8, 6), side * 1.0, 0.98, 3.12), PALETTE.eyeWhite))
    parts.push(tint(place(sphere(0.11, 6, 4), side * 1.42, 0.3, 3.1), PALETTE.eyeWhite))
    parts.push(tint(place(sphere(1, 10, 6), side * 1.7, -0.62, 1.72, 0, side * 0.6, 0, 0.66, 0.46, 0.25), PALETTE.cheek))
    const from = new Vector3(side * 0.7, 1.9, 0.6)
    const to = new Vector3(side * 1.45, 3.7, 1.9)
    parts.push(tint(rod(from, to, 0.22), PALETTE.beeDark))
    parts.push(tint(place(sphere(0.5, 8, 6), to.x, to.y, to.z), PALETTE.beeDark))
  }
  const smile = new CatmullRomCurve3([new Vector3(-0.62, -0.72, 2.34), new Vector3(0, -1.02, 2.5), new Vector3(0.62, -0.72, 2.34)])
  parts.push(tint(new TubeGeometry(smile, 8, 0.13, 4), PALETTE.cheek))
  return merge(parts)
}

/** The right wing, pivoting at its root on the body's shoulder; the left one is the same wing mirrored. */
export function wingGeometry(): BufferGeometry {
  const geometry = place(sphere(1, 16, 8), 2.9, 0, -0.5, 0, 0.4, 0, 3.1, 0.34, 2.1)
  return tint(geometry, (p, _n, out) => paint(PALETTE.wing, out).multiplyScalar(0.9 + 0.1 * smoothstep(0, 3, p.x)))
}

export function pollenGeometry(): BufferGeometry {
  return tint(lumpy(sphere(1.15, 12, 8), 0.18, 1.8, 2), 0xffffff)
}

// ---- the snail -----------------------------------------------------------

export function snailBodyGeometry(): BufferGeometry {
  const geometry = new CapsuleGeometry(1.75, 8, 5, 14)
  geometry.rotateX(Math.PI / 2)
  const position = geometry.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    let y = tmpP.y * 0.72
    if (tmpP.z > 2.2) y += (tmpP.z - 2.2) ** 2 * 0.16
    y = Math.max(y, -1.05)
    position.setXYZ(i, tmpP.x * (tmpP.z < -3 ? 0.8 : 1), y + 1.2, tmpP.z)
  }
  geometry.computeVertexNormals()
  return tint(geometry, (p, n, out) => {
    mixHex(PALETTE.snailBody, PALETTE.snailBelly, n.y < -0.5 ? 1 : 0, out).multiplyScalar(0.8 + 0.2 * smoothstep(0, 2.2, p.y))
  })
}

export const SNAIL_SHELL = { y: 4.4, z: -1.2 }

/** A rolled felt coil: overlapping balls along a spiral, big to small, in two alternating dyes. */
export function snailShellGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = []
  const steps = 16
  for (let i = 0; i < steps; i++) {
    const a = i * 0.62 - 0.9
    const rho = 2.5 * Math.exp(-0.105 * i)
    const radius = 2.75 * Math.exp(-0.1 * i)
    const ball = sphere(radius, 14, 10)
    place(ball, 0, Math.sin(a) * rho, -Math.cos(a) * rho, 0, 0, 0, 0.78, 1, 1)
    parts.push(tint(ball, (p, _n, out) => paint(i % 3 === 1 ? PALETTE.shellStripe : PALETTE.shell, out).multiplyScalar(0.8 + 0.2 * smoothstep(-3, 2, p.y))))
  }
  return merge(parts)
}

/** One eye stalk, standing on the head's top. The pupil sits on the top-front of the tip, where a camera looking down sees it. */
export function eyeStalkGeometry(): BufferGeometry {
  const stalk = tint(new CylinderGeometry(0.26, 0.36, 3.4, 7, 1).translate(0, 1.7, 0), PALETTE.snailBody)
  const tip = tint(place(sphere(0.64, 10, 8), 0, 3.55, 0), PALETTE.snailBody)
  const pupil = tint(place(sphere(0.4, 8, 6), 0, 3.75, 0.36), PALETTE.beeDark)
  return merge([stalk, tip, pupil])
}

// ---- the mouse -----------------------------------------------------------

export function mouseBodyGeometry(): BufferGeometry {
  const body = place(sphere(1, 20, 14), 0, 0, 0, 0, 0, 0, 2.5, 2.3, 3.5)
  const position = body.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    const k = tmpP.z > 0 ? 1 - 0.28 * (tmpP.z / 3.5) : 1
    position.setXYZ(i, tmpP.x * k, tmpP.y * k + 2.1, tmpP.z)
  }
  body.computeVertexNormals()
  tint(body, (p, n, out) => mixHex(PALETTE.mouse, PALETTE.mouseBelly, smoothstep(-0.1, -0.6, n.y), out).multiplyScalar(0.8 + 0.2 * smoothstep(0, 2.6, p.y)))
  const parts = [body]
  for (const side of [-1, 1]) for (const z of [-1.8, 1.7]) parts.push(tint(place(sphere(0.55, 8, 6), side * 1.3, 0.3, z, 0, 0, 0, 1, 0.6, 1.3), PALETTE.mousePink))
  return merge(parts)
}

export const MOUSE_HEAD = { y: 3.0, z: 2.7 }

export function mouseHeadGeometry(): BufferGeometry {
  const head = place(sphere(1, 18, 12), 0, 0, 0, 0, 0, 0, 1.75, 1.6, 2.3)
  const position = head.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    tmpP.fromBufferAttribute(position, i)
    const k = tmpP.z > 0 ? 1 - 0.45 * (tmpP.z / 2.3) : 1
    position.setXYZ(i, tmpP.x * k, tmpP.y * k, tmpP.z)
  }
  head.computeVertexNormals()
  tint(head, (p, n, out) => mixHex(PALETTE.mouse, PALETTE.mouseBelly, smoothstep(-0.2, -0.7, n.y), out).multiplyScalar(0.84 + 0.16 * smoothstep(-1, 1, p.y)))
  const parts = [head]
  parts.push(tint(place(sphere(0.52, 10, 8), 0, 0.05, 2.35), PALETTE.mousePink))
  for (const side of [-1, 1]) {
    parts.push(tint(place(sphere(0.36, 8, 6), side * 0.8, 0.6, 1.0), PALETTE.beeDark))
    parts.push(tint(place(sphere(1, 12, 8), side * 1.15, 1.55, -0.25, -0.2, side * -0.3, 0, 1.3, 1.3, 0.36), PALETTE.mouse))
    parts.push(tint(place(sphere(1, 10, 6), side * 1.15, 1.55, 0.02, -0.2, side * -0.3, 0, 0.85, 0.85, 0.26), PALETTE.mousePink))
  }
  return merge(parts)
}

/** The mouse's tail root on its rump, in its own units from under the middle of its body: the tail swings from here. */
export const TAIL_ROOT = { y: 1.5, z: -3.1 }

/** The tail from its root, curling up behind. */
export function mouseTailGeometry(): BufferGeometry {
  const curve = new CatmullRomCurve3([new Vector3(0, 0, 0), new Vector3(0, -0.4, -2.1), new Vector3(1, 0.2, -4.1), new Vector3(2.3, 1.3, -5)])
  return tint(new TubeGeometry(curve, 16, 0.26, 5), PALETTE.mousePink)
}

// ---- the hill's quiet furniture -------------------------------------------

/** A felted grass tussock: a low soft mound with three short rounded blades leaning out of it. */
export function tuftGeometry(): BufferGeometry {
  const mound = lumpy(place(sphere(1, 8, 4), 0, 0.1, 0, 0, 0, 0, 1.25, 0.55, 1.1), 0.12, 1.4, 2)
  const parts: BufferGeometry[] = [tint(mound, (p, _n, out) => out.setRGB(1, 1, 1).multiplyScalar(0.86 + 0.14 * smoothstep(-0.2, 0.6, p.y)))]
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.5
    const lean = 0.5 + (i % 2) * 0.18
    const blade = new CapsuleGeometry(0.42, 0.5 + (i % 2) * 0.35, 2, 5)
    blade.scale(1, 1, 0.7)
    blade.translate(0, 0.62, 0)
    place(blade, Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45, Math.sin(a) * lean, 0, -Math.cos(a) * lean)
    parts.push(tint(blade, (p, _n, out) => out.setRGB(1, 1, 1).multiplyScalar(0.84 + 0.22 * smoothstep(0, 2.2, p.y))))
  }
  return merge(parts)
}

export function scatterGeometry(kind: SeasonLook['scatter']): BufferGeometry | null {
  switch (kind) {
    case 'blossom': {
      const parts: BufferGeometry[] = []
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2
        parts.push(tint(place(sphere(0.5, 8, 6), Math.cos(a) * 0.55, 0.18, Math.sin(a) * 0.55, 0, 0, 0, 1, 0.35, 1), 0xffffff))
      }
      parts.push(tint(place(sphere(0.3, 6, 4), 0, 0.3, 0), 0xf3d77a))
      return merge(parts)
    }
    case 'leaves':
      return tint(place(sphere(1, 10, 6), 0, 0.15, 0, 0, 0, 0, 1.5, 0.14, 0.75), 0xffffff)
    case 'snow':
      return tint(place(sphere(0.7, 8, 6), 0, 0.12, 0, 0, 0, 0, 1, 0.35, 1), 0xffffff)
    case 'none':
      return null
    default: {
      const unreachable: never = kind
      return unreachable
    }
  }
}

/**
 * The mouse's burrow, in the hole cut in the hill: a dark shaft whose top flares out under the grass, and a
 * lumpy soil ring round the mouth. Both follow the slope.
 */
export function burrowGeometry(): BufferGeometry {
  const { rim, shaft, depth, ring, tube, squash, lift } = BURROW_HOLE
  // From the flared lip under the grass (past the cut's edge) down the wall to the floor, so the lathe faces in
  // toward the hole.
  const profile = [
    [rim + 0.3, -0.35],
    [ring - 0.2, -0.4],
    [shaft + 0.5, -0.75],
    [shaft, -1.6],
    [shaft, -depth],
    [0.01, -depth],
  ].map(([r, y]) => new Vector2(r, y))
  const hole = tint(new LatheGeometry(profile, 28), (p, _n, out) => mixHex(0x24170f, PALETTE.soil, smoothstep(-6, -0.4, p.y) * 0.55, out))
  const soil = tint(place(lumpy(new TorusGeometry(ring, tube, 8, 26), 0.3, 1, 5), 0, lift, 0, Math.PI / 2, 0, 0, 1, 1, squash), (p, _n, out) =>
    paint(PALETTE.soil, out).multiplyScalar(0.8 + 0.2 * smoothstep(lift - tube * squash, lift + tube * squash, p.y)),
  )
  const burrow = merge([hole, soil])
  const position = burrow.getAttribute('position')
  for (let i = 0; i < position.count; i++) {
    const x = BURROW.x + position.getX(i)
    const z = BURROW.z + position.getZ(i)
    position.setXYZ(i, x, position.getY(i) + groundY(x, z), z)
  }
  burrow.computeBoundingSphere()
  return burrow
}

/** Static felt things on the hill: bushes on the crest, two stones. */
export function decorGeometry(): BufferGeometry {
  const parts: BufferGeometry[] = []
  for (const [x, z, size] of BUSHES) {
    for (let k = 0; k < 4; k++) {
      const a = k * 2.1
      const r = size * (0.75 - k * 0.1)
      const bx = x + Math.cos(a) * size * 0.55
      const bz = z + Math.sin(a) * size * 0.35
      const ball = lumpy(sphere(r, 16, 12), r * 0.12, 0.35, k + x)
      place(ball, bx, groundY(bx, bz) + r * 0.55, bz)
      parts.push(tint(ball, (p, _n, out) => mixHex(PALETTE.bush, PALETTE.bushLight, smoothstep(-r, r, p.y - groundY(bx, bz)), out)))
    }
  }
  for (const [x, z, s] of STONES) {
    const stone = lumpy(sphere(s, 14, 10), s * 0.18, 0.5, x)
    place(stone, x, groundY(x, z) + s * 0.25, z, 0, x, 0, 1.2, 0.55, 1)
    parts.push(tint(stone, (p, _n, out) => paint(PALETTE.stone, out).multiplyScalar(0.8 + 0.2 * smoothstep(-s, s, p.y - groundY(x, z)))))
  }
  return merge(parts)
}

/** Felt appliqué on the sky wall: a sun and two clouds, drawn unlit so their dyes show as authored. */
export function wallDecorGeometry(look: SeasonLook): BufferGeometry {
  const parts: BufferGeometry[] = []
  const wallZ = WALL.z + 1.5
  const edge = (n: Vector3) => (0.86 + 0.14 * Math.max(0, n.z)) * 1.1
  parts.push(tint(lumpy(place(sphere(11, 28, 10), 74, 27, wallZ, 0, 0, 0, 1, 1, 0.22), 0.6, 0.25, 1), (p, n, out) => paint(parseInt(look.sun.slice(1), 16), out).multiplyScalar(edge(n) * (0.95 + 0.05 * smoothstep(18, 36, p.y)))))
  for (const [x, y, s] of [
    [-58, 20, 0.7],
    [16, 29, 0.55],
  ] as const) {
    for (let k = 0; k < 4; k++) {
      const r = (9 - Math.abs(k - 1.5) * 2.2) * s
      const cloud = lumpy(sphere(r, 16, 8), r * 0.12, 0.3, k)
      place(cloud, x + (k - 1.5) * 9 * s, y + (k === 1 || k === 2 ? 3 : 0) * s, wallZ + 1, 0, 0, 0, 1, 0.8, 0.25)
      parts.push(tint(cloud, (p, n, out) => paint(PALETTE.cloud, out).multiplyScalar(edge(n) * (0.97 + 0.03 * smoothstep(y - r, y + r, p.y)))))
    }
  }
  return merge(parts)
}

export function flatQuad(): BufferGeometry {
  const geometry = new PlaneGeometry(1, 1)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

export function puffGeometry(): BufferGeometry {
  return tint(new IcosahedronGeometry(1, 1), 0xffffff)
}
