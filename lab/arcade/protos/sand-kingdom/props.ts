// Everything on the beach that is not sand or water, modelled by hand from a
// few simple solids and coloured per vertex: the wooden bucket and moulds, the
// spade, the tideline's treasures, the rocks, and the small sea folk. All of
// it is matte and plain, like carved and painted wooden toys.

import * as THREE from 'three'
import { ROCKS, baseAt } from './terrain.ts'

export type RGB = [number, number, number]
type Painter = (x: number, y: number, z: number) => RGB

const TAU = Math.PI * 2

export function rgb(hex: number): RGB {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]
}

function mix(a: RGB, b: RGB, t: number): RGB {
  const u = t < 0 ? 0 : t > 1 ? 1 : t
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
}

function wobble(x: number, y: number, z: number, seed: number): number {
  return (Math.sin(x * 1.7 + seed) * Math.sin(y * 2.3 + seed * 1.3) + Math.sin(z * 1.9 + seed * 0.7) * Math.sin(x * 2.9 + y * 1.1 + seed * 2.1)) * 0.5
}

function paint(geo: THREE.BufferGeometry, color: RGB | Painter): THREE.BufferGeometry {
  const p = geo.getAttribute('position')
  const c = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i++) {
    const v = typeof color === 'function' ? color(p.getX(i), p.getY(i), p.getZ(i)) : color
    c[i * 3] = v[0]
    c[i * 3 + 1] = v[1]
    c[i * 3 + 2] = v[2]
  }
  geo.setAttribute('aColor', new THREE.BufferAttribute(c, 3))
  return geo
}

// One flat colour per triangle, chosen at its middle: crisp staves and bands
// without needing a vertex on every edge.
function paintFaces(source: THREE.BufferGeometry, color: Painter): THREE.BufferGeometry {
  const geo = source.index ? source.toNonIndexed() : source
  if (geo !== source) source.dispose()
  const p = geo.getAttribute('position')
  const c = new Float32Array(p.count * 3)
  for (let i = 0; i < p.count; i += 3) {
    const v = color((p.getX(i) + p.getX(i + 1) + p.getX(i + 2)) / 3, (p.getY(i) + p.getY(i + 1) + p.getY(i + 2)) / 3, (p.getZ(i) + p.getZ(i + 1) + p.getZ(i + 2)) / 3)
    for (let q = 0; q < 3; q++) {
      c[(i + q) * 3] = v[0]
      c[(i + q) * 3 + 1] = v[1]
      c[(i + q) * 3 + 2] = v[2]
    }
  }
  geo.setAttribute('aColor', new THREE.BufferAttribute(c, 3))
  return geo
}

const scratch = new THREE.Matrix4()
function place(geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): THREE.BufferGeometry {
  scratch.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz))
  geo.applyMatrix4(scratch)
  return geo
}

// Painted parts, joined into one geometry (one draw call).
function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const flat = parts.map((g) => (g.index ? g.toNonIndexed() : g))
  let count = 0
  for (const g of flat) count += g.getAttribute('position').count
  const pos = new Float32Array(count * 3)
  const nor = new Float32Array(count * 3)
  const col = new Float32Array(count * 3)
  let at = 0
  for (const g of flat) {
    pos.set(g.getAttribute('position').array as Float32Array, at)
    nor.set(g.getAttribute('normal').array as Float32Array, at)
    col.set(g.getAttribute('aColor').array as Float32Array, at)
    at += g.getAttribute('position').count * 3
  }
  for (const g of parts) g.dispose()
  for (const g of flat) g.dispose()
  const out = new THREE.BufferGeometry()
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  out.setAttribute('aColor', new THREE.BufferAttribute(col, 3))
  return out
}

function lumpy(r: number, amp: number, freq: number, seed: number, w = 14, hSeg = 10): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, w, hSeg)
  const p = g.getAttribute('position')
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i)
    const y = p.getY(i)
    const z = p.getZ(i)
    const k = 1 + amp * wobble((x / r) * freq, (y / r) * freq, (z / r) * freq, seed)
    p.setXYZ(i, x * k, y * k, z * k)
  }
  g.computeVertexNormals()
  return g
}

function lathe(points: [number, number][], segments = 20): THREE.BufferGeometry {
  return new THREE.LatheGeometry(
    points.map(([r, y]) => new THREE.Vector2(r, y)),
    segments,
  )
}

// A limb that tapers along a curve.
function tube(points: [number, number, number][], radii: number[], radial = 8, samples = 14, ref: [number, number, number] = [1, 0, 0]): THREE.BufferGeometry {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], p[2])))
  const pos: number[] = []
  const idx: number[] = []
  const up = new THREE.Vector3(ref[0], ref[1], ref[2])
  const n = new THREE.Vector3()
  const b = new THREE.Vector3()
  for (let s = 0; s <= samples; s++) {
    const t = s / samples
    const p = curve.getPoint(t)
    const tan = curve.getTangent(t)
    const f = t * (radii.length - 1)
    const i0 = Math.min(radii.length - 2, Math.floor(f))
    const radius = radii[i0] + (radii[i0 + 1] - radii[i0]) * (f - i0)
    n.crossVectors(tan, up).normalize()
    b.crossVectors(tan, n).normalize()
    for (let a = 0; a < radial; a++) {
      const ang = (a / radial) * TAU
      pos.push(p.x + (Math.cos(ang) * n.x + Math.sin(ang) * b.x) * radius, p.y + (Math.cos(ang) * n.y + Math.sin(ang) * b.y) * radius, p.z + (Math.cos(ang) * n.z + Math.sin(ang) * b.z) * radius)
    }
  }
  for (let s = 0; s < samples; s++) {
    for (let a = 0; a < radial; a++) {
      const a1 = (a + 1) % radial
      const p0 = s * radial + a
      const p1 = s * radial + a1
      const p2 = (s + 1) * radial + a
      const p3 = (s + 1) * radial + a1
      idx.push(p0, p2, p1, p1, p2, p3)
    }
  }
  // Round off both ends.
  const first = curve.getPoint(0)
  const last = curve.getPoint(1)
  const c0 = pos.length / 3
  pos.push(first.x, first.y, first.z, last.x, last.y, last.z)
  for (let a = 0; a < radial; a++) {
    const a1 = (a + 1) % radial
    idx.push(c0, a, a1)
    idx.push(c0 + 1, samples * radial + a1, samples * radial + a)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

// ------------------------------------------------------------------ tools

const WOOD = rgb(0xbd8a57)
const WOOD_LIGHT = rgb(0xd2a471)
const WOOD_DARK = rgb(0x94673f)
const SAND = rgb(0xe9c58a)
const SAND_LIGHT = rgb(0xf3d6a2)

function staves(x: number, z: number, a: RGB, b: RGB): RGB {
  const ang = Math.atan2(z, x) + Math.PI
  return Math.floor((ang / TAU) * 10 + 0.5) % 2 === 0 ? a : b
}

export interface MouldProp {
  group: THREE.Group
  // 0 empty, 1 packed to the brim.
  setFill(f: number): void
  // Half its height: where its middle is when it stands on the sand.
  half: number
  // How far its point is pushed into the sand when it stands the right way up.
  sunk: number
}

function sandCap(): THREE.BufferGeometry {
  return paint(
    lathe(
      [
        [0, 0.07],
        [0.2, 0.06],
        [0.38, 0.03],
        [0.5, 0],
      ],
      18,
    ),
    (x, _y, z) => mix(SAND_LIGHT, SAND, Math.hypot(x, z) / 0.5 + wobble(x * 9, 0, z * 9, 3) * 0.3),
  )
}

export function makeBucket(mat: THREE.Material): MouldProp {
  const blue = rgb(0x5f8ea6)
  const band = (y: number) => (y > -0.335 && y < -0.245) || (y > 0.165 && y < 0.255)
  const outer = paintFaces(
    lathe([
      [0, -0.5],
      [0.46, -0.5],
      [0.477, -0.33],
      [0.485, -0.25],
      [0.527, 0.17],
      [0.535, 0.25],
      [0.56, 0.5],
      [0.52, 0.5],
    ]),
    (x, y, z) => (band(y) ? blue : y > 0.49 || y < -0.49 ? WOOD_LIGHT : mix(staves(x, z, WOOD, WOOD_LIGHT), WOOD_DARK, 0.12 - y * 0.2)),
  )
  const inner = paint(
    lathe([
      [0.52, 0.5],
      [0.43, -0.45],
      [0, -0.45],
    ]),
    (x, y, z) => mix(staves(x, z, WOOD_DARK, WOOD), rgb(0x8a6644), (0.5 - y) * 0.5),
  )
  const rope = paint(place(new THREE.TorusGeometry(0.53, 0.028, 6, 18, Math.PI), 0, 0.42, 0, -1.25, 0, 0), rgb(0xe9dab4))
  const group = new THREE.Group()
  group.add(new THREE.Mesh(merge([outer, inner, rope]), mat))
  const fill = new THREE.Mesh(sandCap(), mat)
  group.add(fill)
  return {
    group,
    half: 0.5,
    sunk: 0,
    setFill(f) {
      fill.visible = f > 0.01
      const y = -0.42 + 0.87 * f
      const r = 0.43 + (y + 0.45) * (0.09 / 0.95)
      fill.position.y = y
      fill.scale.set(r / 0.5, 0.4 + f * 0.9, r / 0.5)
    },
  }
}

export function makeCone(mat: THREE.Material): MouldProp {
  const red = rgb(0xb9584a)
  const pale = rgb(0xdcc08e)
  const pale2 = rgb(0xcfae78)
  const outer = paintFaces(
    lathe([
      [0, -0.4],
      [0.03, -0.4],
      [0.2775, 0.2],
      [0.319, 0.3],
      [0.36, 0.4],
      [0.33, 0.4],
    ]),
    (x, y, z) => (y > 0.2 && y < 0.3 ? red : y > 0.39 ? WOOD_LIGHT : staves(x, z, pale, pale2)),
  )
  const inner = paint(
    lathe([
      [0.33, 0.4],
      [0.02, -0.36],
      [0, -0.36],
    ]),
    (_x, y) => mix(rgb(0xb89a68), rgb(0x7e6644), (0.4 - y) * 0.9),
  )
  const group = new THREE.Group()
  group.add(new THREE.Mesh(merge([outer, inner]), mat))
  const fill = new THREE.Mesh(sandCap(), mat)
  group.add(fill)
  return {
    group,
    half: 0.4,
    sunk: 0.09,
    setFill(f) {
      fill.visible = f > 0.01
      const y = -0.26 + 0.62 * f
      const r = 0.02 + (y + 0.36) * (0.31 / 0.76)
      fill.position.y = y
      fill.scale.set(r / 0.5, 0.5 + f * 0.7, r / 0.5)
    },
  }
}

// A long wooden mould for a length of wall.
export function makeWallMould(mat: THREE.Material): MouldProp {
  const green = rgb(0x7c9a66)
  const parts: THREE.BufferGeometry[] = []
  const side = (x: number, z: number, w: number, d: number) => {
    // Planks, each a slightly different piece of wood.
    const plank: Painter = (px, y, pz) => {
      const along = w > d ? px : pz
      const n = Math.floor((along + 2) / 0.21)
      const base = n % 2 === 0 ? WOOD : mix(WOOD, WOOD_LIGHT, 0.7)
      return y > 0.3 ? WOOD_LIGHT : y > 0.1 && y < 0.2 ? green : mix(base, WOOD_DARK, 0.15 - y * 0.3)
    }
    parts.push(paintFaces(place(new THREE.BoxGeometry(w, 0.62, d, w > d ? 6 : 1, 6, w > d ? 1 : 3), x, 0, z), plank))
  }
  side(0, 0.25, 1.28, 0.04)
  side(0, -0.25, 1.28, 0.04)
  side(0.62, 0, 0.04, 0.46)
  side(-0.62, 0, 0.04, 0.46)
  parts.push(paint(place(new THREE.BoxGeometry(1.24, 0.04, 0.5), 0, -0.29, 0), WOOD_DARK))
  const group = new THREE.Group()
  group.add(new THREE.Mesh(merge(parts), mat))
  const fill = new THREE.Mesh(
    paint(place(new THREE.BoxGeometry(1.19, 0.06, 0.45), 0, 0, 0), (x, y, z) => (y > 0 ? mix(SAND_LIGHT, SAND, wobble(x * 9, 0, z * 9, 5) * 0.5 + 0.5) : SAND)),
    mat,
  )
  group.add(fill)
  return {
    group,
    half: 0.31,
    sunk: 0,
    setFill(f) {
      fill.visible = f > 0.01
      fill.position.y = -0.26 + 0.54 * f
    },
  }
}

export interface SpadeProp {
  group: THREE.Group
  setLoad(f: number): void
}

export function makeSpade(mat: THREE.Material): SpadeProp {
  // The blade, cupped, with a rounded tip at the origin.
  const cols = 6
  const rows = 6
  const pos: number[] = []
  const idx: number[] = []
  for (let v = 0; v <= rows; v++) {
    const y = (v / rows) * 0.38
    const w = 0.17 * (0.3 + 0.7 * Math.sqrt(Math.min(1, y / 0.13)))
    for (let u = 0; u <= cols; u++) {
      const s = (u / cols) * 2 - 1
      pos.push(s * w, y, -0.05 * (1 - s * s) + 0.02 * (y / 0.38))
    }
  }
  for (let v = 0; v < rows; v++) {
    for (let u = 0; u < cols; u++) {
      const a = v * (cols + 1) + u
      idx.push(a, a + 1, a + cols + 1, a + 1, a + cols + 2, a + cols + 1)
    }
  }
  const blade = new THREE.BufferGeometry()
  blade.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  blade.setIndex(idx)
  blade.computeVertexNormals()
  paint(blade, (_x, y) => mix(rgb(0x8fa9b4), rgb(0x6f8f9f), y / 0.38))
  const socket = paint(place(new THREE.CylinderGeometry(0.032, 0.06, 0.16, 8), 0, 0.42, 0), rgb(0x6f8f9f))
  const shaft = paint(place(new THREE.CylinderGeometry(0.03, 0.034, 0.74, 8), 0, 0.84, 0), (_x, y) => mix(WOOD, WOOD_LIGHT, (y - 0.47) / 0.74))
  const grip = paint(place(new THREE.CylinderGeometry(0.036, 0.036, 0.24, 8), 0, 1.22, 0, 0, 0, Math.PI / 2), WOOD_DARK)
  const group = new THREE.Group()
  group.add(new THREE.Mesh(merge([blade, socket, shaft, grip]), mat))
  const heap = new THREE.Mesh(
    paint(place(lumpy(0.15, 0.16, 2.2, 4, 10, 8), 0, 0.19, 0.03, 0, 0, 0, 1, 0.75, 0.6), (_x, y) => mix(SAND, SAND_LIGHT, (y - 0.1) / 0.2)),
    mat,
  )
  heap.visible = false
  group.add(heap)
  return {
    group,
    setLoad(f) {
      heap.visible = f > 0.05
      const s = 0.3 + 0.7 * Math.min(1, f)
      heap.scale.set(s, s, s)
    },
  }
}

// -------------------------------------------------------------- treasures

export type Treasure = 'scallop' | 'snail' | 'pebble' | 'feather' | 'wood' | 'weed'

const SCALLOPS: [RGB, RGB][] = [
  [rgb(0xfbefe0), rgb(0xf0b79a)],
  [rgb(0xfdf4e6), rgb(0xe7a3a0)],
  [rgb(0xfff6ea), rgb(0xf2c98a)],
]

function scallopGeo(variant: number): THREE.BufferGeometry {
  const [pale, deep] = SCALLOPS[variant % SCALLOPS.length]
  const R = 0.3
  const cols = 18
  const rows = 6
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  for (let v = 0; v <= rows; v++) {
    const u = v / rows
    for (let c = 0; c <= cols; c++) {
      const a = ((c / cols) * 2 - 1) * 1.2
      const rib = 0.5 + 0.5 * Math.cos((c / cols) * Math.PI * 2 * 7)
      const r = u * R * (1 + 0.035 * rib)
      const dome = Math.sin(Math.min(1, u * 1.08) * Math.PI) ** 0.75 * (1 - 0.35 * (a / 1.2) ** 2) * (0.84 + 0.16 * rib)
      pos.push(Math.sin(a) * r, 0.02 + dome * R * 0.42, R * 0.52 - Math.cos(a) * r)
      const k = mix(mix(pale, deep, u * 0.9 + 0.1), deep, (1 - rib) * 0.35 * u)
      col.push(k[0], k[1], k[2])
    }
  }
  for (let v = 0; v < rows; v++) {
    for (let c = 0; c < cols; c++) {
      const a = v * (cols + 1) + c
      idx.push(a, a + cols + 1, a + 1, a + 1, a + cols + 1, a + cols + 2)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(col), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  // The little ears at the hinge.
  const ear = paint(place(new THREE.BoxGeometry(0.2, 0.035, 0.07), 0, 0.03, R * 0.52), pale)
  return merge([g, ear])
}

function snailGeo(variant: number): THREE.BufferGeometry {
  const cream = rgb(0xf7ead2)
  const band = variant % 2 === 0 ? rgb(0xc98a5a) : rgb(0x9b7aa0)
  const swirl: Painter = (x, y, z) => {
    const turn = Math.atan2(y - 0.17, x) / TAU + Math.hypot(x, y - 0.17) * 2.2 + z * 0.8
    return mix(cream, band, Math.sin(turn * TAU * 1.5) > 0.35 ? 0.85 : 0)
  }
  const body = paint(place(new THREE.SphereGeometry(0.2, 16, 12), 0, 0.17, 0, 0, 0, 0, 1.08, 0.88, 0.9), swirl)
  const whorl = paint(place(new THREE.SphereGeometry(0.12, 12, 9), -0.12, 0.25, -0.02), swirl)
  const tip = paint(place(new THREE.SphereGeometry(0.06, 10, 8), -0.2, 0.31, -0.03), mix(cream, band, 0.6))
  // The mouth of the shell, toward the child.
  const mouth = paint(place(new THREE.SphereGeometry(0.1, 12, 8), 0.1, 0.11, 0.12, 0, 0, 0, 1, 0.8, 0.55), rgb(0x6b4a3a))
  return merge([body, whorl, tip, mouth])
}

const PEBBLES: RGB[] = [rgb(0xa9a8a6), rgb(0xe8e2d6), rgb(0xb98a72), rgb(0x8d98a3)]

function pebbleGeo(variant: number): THREE.BufferGeometry {
  const c = PEBBLES[variant % PEBBLES.length]
  const g = place(lumpy(0.22, 0.1, 1.3, variant * 3.1 + 1, 14, 10), 0, 0.1, 0, 0, variant, 0, 1.15, 0.52, 0.9)
  g.computeVertexNormals()
  return paint(g, (x, y, z) => mix(mix(c, [1, 1, 1], 0.12 + y * 0.9), [0.3, 0.3, 0.32], wobble(x * 14, y * 14, z * 14, variant) > 0.55 ? 0.25 : 0))
}

function woodGeo(variant: number): THREE.BufferGeometry {
  const silver = rgb(0xcbbca6)
  const grey = rgb(0x9f917e)
  const grain: Painter = (x, y, z) => mix(silver, grey, 0.5 + 0.5 * Math.sin(y * 60 + z * 40 + Math.sin(x * 9) * 2) * 0.6 + (Math.abs(x) > 0.48 ? 0.3 : 0))
  const bend = variant % 2 === 0 ? 0.07 : -0.05
  const log = tube(
    [
      [-0.56, 0.085, 0],
      [-0.24, 0.09, bend],
      [0.16, 0.08, bend * 0.6],
      [0.56, 0.075, -bend],
    ],
    [0.07, 0.085, 0.075, 0.05],
    8,
    12,
    [0, 1, 0],
  )
  const stub = tube(
    [
      [0.18, 0.1, bend * 0.6],
      [0.27, 0.19, bend * 0.6 + 0.1],
      [0.3, 0.26, bend * 0.6 + 0.2],
    ],
    [0.045, 0.035, 0.022],
    6,
    5,
    [1, 0, 0],
  )
  return merge([paint(log, grain), paint(stub, grain)])
}

function featherGeo(variant: number): THREE.BufferGeometry {
  const white = rgb(0xf7f4ee)
  const tipCol = variant % 2 === 0 ? rgb(0x8f99a6) : rgb(0xc9a27a)
  const quill = paint(
    tube(
      [
        [0, -0.06, 0],
        [0.01, 0.4, 0],
        [0.05, 0.98, 0],
      ],
      [0.016, 0.012, 0.004],
      5,
      8,
      [0, 0, 1],
    ),
    rgb(0xefe6d2),
  )
  const rows = 12
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  for (let v = 0; v <= rows; v++) {
    const t = v / rows
    const y = 0.2 + t * 0.8
    const cx = 0.01 + 0.04 * t * t
    const w = 0.15 * Math.sin(Math.min(1, t * 1.08 + 0.06) * Math.PI) ** 0.6
    for (let s = -1; s <= 1; s++) {
      pos.push(cx + s * w * (s < 0 ? 0.75 : 1), y - Math.abs(s) * 0.05, s === 0 ? 0 : -0.025)
      const k = mix(white, tipCol, Math.max(0, t - 0.55) * 2.2 + (Math.abs(s) > 0 && v % 3 === 0 ? 0.12 : 0))
      col.push(k[0], k[1], k[2])
    }
  }
  for (let v = 0; v < rows; v++) {
    const a = v * 3
    idx.push(a, a + 1, a + 3, a + 1, a + 4, a + 3, a + 1, a + 2, a + 4, a + 2, a + 5, a + 4)
  }
  const vane = new THREE.BufferGeometry()
  vane.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  vane.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(col), 3))
  vane.setIndex(idx)
  vane.computeVertexNormals()
  return merge([quill, vane])
}

export const WEED_SEGMENTS = 14

// A ribbon of seaweed. It is laid flat here; the game drapes it over the sand.
function weedGeo(variant: number): THREE.BufferGeometry {
  const a = variant % 2 === 0 ? rgb(0x6f8440) : rgb(0x8b4d59)
  const b = variant % 2 === 0 ? rgb(0x4d6b3c) : rgb(0x6a3a4c)
  const pos: number[] = []
  const col: number[] = []
  const idx: number[] = []
  for (let s = 0; s <= WEED_SEGMENTS; s++) {
    const t = s / WEED_SEGMENTS
    const x = (t - 0.5) * 1.35
    const z = Math.sin(t * 7 + variant) * 0.09
    const w = 0.1 * (0.5 + Math.sin(t * Math.PI) * 0.6) * (1 + 0.3 * Math.sin(t * 23))
    pos.push(x, 0.02, z - w, x, 0.035, z, x, 0.02, z + w)
    for (let q = 0; q < 3; q++) {
      const k = mix(a, b, q === 1 ? 0.75 : 0.1 + 0.3 * Math.sin(t * 17) ** 2)
      col.push(k[0], k[1], k[2])
    }
  }
  for (let s = 0; s < WEED_SEGMENTS; s++) {
    const p = s * 3
    idx.push(p, p + 1, p + 3, p + 1, p + 4, p + 3, p + 1, p + 2, p + 4, p + 2, p + 5, p + 4)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(col), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

export function makeTreasure(kind: Treasure, variant: number, mat: THREE.Material): THREE.Mesh {
  const geo = kind === 'scallop' ? scallopGeo(variant) : kind === 'snail' ? snailGeo(variant) : kind === 'pebble' ? pebbleGeo(variant) : kind === 'feather' ? featherGeo(variant) : kind === 'wood' ? woodGeo(variant) : weedGeo(variant)
  return new THREE.Mesh(geo, mat)
}

// ------------------------------------------------------------------ rocks

export function makeRocks(mat: THREE.Material): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = []
  ROCKS.forEach((r, i) => {
    const y0 = baseAt(r.x, r.z) - r.ry * 0.25
    const g = lumpy(1, 0.2, 1.5, i * 2.7 + 0.5, 14, 9)
    place(g, r.x, y0, r.z, 0, i * 1.3, 0, r.rx, r.ry * 1.2, r.rz)
    g.computeVertexNormals()
    const warm = rgb(0xa79c90)
    const cool = rgb(0x8a8a8c)
    paint(g, (x, y, z) => {
      const t = (y - y0) / (r.ry * 1.2)
      let c = mix(cool, warm, 0.5 + 0.5 * wobble(x * 3, y * 3, z * 3, i))
      c = mix(mix(c, [0.36, 0.34, 0.36], 0.55), c, Math.min(1, t * 1.6 + 0.35))
      // Lichen and the green line the tide leaves.
      if (wobble(x * 7, y * 7, z * 7, i + 4) > 0.5 && t > 0.5) c = mix(c, rgb(0xd9c98a), 0.5)
      if (t < 0.3) c = mix(c, rgb(0x66754a), 0.3)
      return c
    })
    parts.push(g)
  })
  return new THREE.Mesh(merge(parts), mat)
}

// --------------------------------------------------------------- sea folk

export interface MerChild {
  group: THREE.Group
  fin: THREE.Object3D
  mouth: THREE.Object3D
  head: THREE.Object3D
}

// A small mer-child, sitting: seat at the origin, tail hanging toward +z.
export function makeMerChild(mat: THREE.Material): MerChild {
  const skin = rgb(0xf4cfab)
  const teal = rgb(0x62b3a2)
  const tealDeep = rgb(0x3c8f90)
  const hair = rgb(0xc0603a)
  const hairDeep = rgb(0x9a452c)
  const body = paint(
    tube(
      [
        [0, 0.43, 0],
        [0, 0.24, 0.01],
        [0, 0.08, 0.05],
        [0.02, 0.03, 0.21],
        [0.05, -0.12, 0.33],
        [0.09, -0.32, 0.37],
        [0.12, -0.47, 0.355],
      ],
      [0.085, 0.1, 0.118, 0.105, 0.078, 0.052, 0.028],
      10,
      20,
      [1, 0, 0],
    ),
    (_x, y, z) => {
      const along = y > 0.05 ? 0 : Math.min(1, (0.05 - y) / 0.5 + z * 0.4)
      if (y > 0.17) return skin
      if (y > 0.11) return mix(teal, skin, (y - 0.11) / 0.06)
      return mix(teal, tealDeep, along)
    },
  )
  const arm = (side: number) =>
    paint(
      tube(
        [
          [side * 0.095, 0.37, 0],
          [side * 0.14, 0.24, 0.05],
          [side * 0.08, 0.13, 0.14],
        ],
        [0.034, 0.03, 0.028],
        6,
        6,
        [0, 0, 1],
      ),
      skin,
    )
  const back = paint(place(new THREE.SphereGeometry(1, 12, 10), 0, 0.37, -0.075, 0, 0, 0, 0.15, 0.27, 0.085), (_x, y) => mix(hairDeep, hair, (y - 0.1) / 0.5))
  const group = new THREE.Group()
  group.add(new THREE.Mesh(merge([body, arm(1), arm(-1), back]), mat))

  const head = new THREE.Group()
  head.position.set(0, 0.58, 0.02)
  const face = paint(new THREE.SphereGeometry(0.15, 16, 12), (_x, y, z) => mix(skin, rgb(0xf0b99a), z > 0.08 && y < 0 && y > -0.08 ? 0.35 : 0))
  const cap = paint(place(new THREE.SphereGeometry(0.168, 16, 12), 0, 0.022, -0.035), (_x, y) => mix(hairDeep, hair, (y + 0.1) / 0.28))
  const eye = (side: number) => paint(place(new THREE.SphereGeometry(0.016, 6, 5), side * 0.052, 0.0, 0.142), rgb(0x3a2a26))
  head.add(new THREE.Mesh(merge([face, cap, eye(1), eye(-1)]), mat))
  const mouth = new THREE.Mesh(paint(new THREE.SphereGeometry(0.016, 6, 5), rgb(0x9a4a44)), mat)
  mouth.position.set(0, -0.058, 0.14)
  head.add(mouth)
  group.add(head)

  // Tail fin: two soft lobes.
  const finGeo = new THREE.BufferGeometry()
  finGeo.setAttribute(
    'position',
    new THREE.BufferAttribute(
      new Float32Array([0, 0, 0, -0.15, -0.14, 0.03, -0.05, -0.2, 0.0, 0, 0, 0, -0.05, -0.2, 0.0, 0.0, -0.11, -0.01, 0, 0, 0, 0.0, -0.11, -0.01, 0.07, -0.21, 0.0, 0, 0, 0, 0.07, -0.21, 0.0, 0.16, -0.12, 0.03]),
      3,
    ),
  )
  finGeo.computeVertexNormals()
  paint(finGeo, (_x, y) => mix(tealDeep, rgb(0x8fd0bd), -y / 0.2))
  const fin = new THREE.Mesh(finGeo, mat)
  fin.position.set(0.12, -0.46, 0.355)
  group.add(fin)
  return { group, fin, mouth, head }
}

// A hermit crab without a home yet: origin on the sand under its middle.
export function makeCrab(mat: THREE.Material): THREE.Mesh {
  const coral = rgb(0xe37f5c)
  const light = rgb(0xf2a47c)
  const parts: THREE.BufferGeometry[] = []
  parts.push(paint(place(lumpy(0.12, 0.08, 1.4, 2, 12, 9), 0, 0.085, 0, 0, 0, 0, 1.3, 0.62, 1), (_x, y) => mix(coral, light, (y - 0.03) / 0.1)))
  for (const side of [-1, 1]) {
    parts.push(paint(place(new THREE.CylinderGeometry(0.01, 0.012, 0.09, 5), side * 0.05, 0.17, 0.07), light))
    parts.push(paint(place(new THREE.SphereGeometry(0.02, 7, 6), side * 0.05, 0.22, 0.07), rgb(0x2e2422)))
    parts.push(paint(place(new THREE.SphereGeometry(0.052, 9, 7), side * 0.17, 0.07, 0.1, 0, 0, 0, 1.2, 0.75, 0.9), light))
    for (let l = 0; l < 3; l++) {
      parts.push(
        paint(
          tube(
            [
              [side * 0.11, 0.08, -0.06 + l * 0.05],
              [side * 0.2, 0.1, -0.09 + l * 0.06],
              [side * 0.25, 0.0, -0.11 + l * 0.07],
            ],
            [0.018, 0.014, 0.008],
            5,
            4,
            [0, 0, 1],
          ),
          coral,
        ),
      )
    }
  }
  return new THREE.Mesh(merge(parts), mat)
}

const STARS: RGB[] = [rgb(0xee9156), rgb(0xe07a84), rgb(0xe9b45e), rgb(0xd98a6a)]

export function makeStarfish(variant: number, mat: THREE.Material): THREE.Mesh {
  const c = STARS[variant % STARS.length]
  const pale = mix(c, [1, 0.95, 0.85], 0.45)
  const pos: number[] = [0, 0.07, 0]
  const col: number[] = [...pale]
  const idx: number[] = []
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU + variant
    const m = a + TAU / 10
    // tip, a ridge point half way out, and the notch between arms
    pos.push(Math.cos(a) * 0.24, 0.012, Math.sin(a) * 0.24)
    col.push(...c)
    pos.push(Math.cos(a) * 0.12, 0.055, Math.sin(a) * 0.12)
    col.push(...mix(c, pale, 0.5))
    pos.push(Math.cos(m) * 0.085, 0.012, Math.sin(m) * 0.085)
    col.push(...mix(c, [0.5, 0.25, 0.2], 0.25))
  }
  for (let i = 0; i < 5; i++) {
    const tip = 1 + i * 3
    const ridge = tip + 1
    const notch = tip + 2
    const prev = 1 + ((i + 4) % 5) * 3 + 2
    idx.push(0, notch, ridge, 0, ridge, prev, ridge, notch, tip, ridge, tip, prev)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3))
  g.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(col), 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return new THREE.Mesh(g, mat)
}

// A minnow, nose toward +x.
export function makeFish(mat: THREE.Material): THREE.Mesh {
  const dark = rgb(0x3f6168)
  const body = paint(place(new THREE.SphereGeometry(0.06, 8, 6), 0, 0, 0, 0, 0, 0, 2.2, 0.75, 0.6), (x) => mix(dark, rgb(0x6f949a), x * 4 + 0.3))
  const tail = new THREE.BufferGeometry()
  tail.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.11, 0, 0, -0.21, 0.0, 0.055, -0.21, 0.0, -0.055]), 3))
  tail.computeVertexNormals()
  paint(tail, dark)
  return new THREE.Mesh(merge([body, tail]), mat)
}

// A drop of wet sand, and the handful it falls from.
export function makeDrop(mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(paint(new THREE.SphereGeometry(0.05, 7, 6), rgb(0xb98f5e)), mat)
}

export function makeHandful(mat: THREE.Material): THREE.Mesh {
  return new THREE.Mesh(
    paint(lumpy(0.16, 0.22, 2.1, 6, 10, 8), (_x, y) => mix(rgb(0xa57c4f), rgb(0xcaa06c), y * 3 + 0.5)),
    mat,
  )
}

export function glowTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas')
  c.width = 128
  c.height = 128
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, 'rgba(255,236,170,1)')
    grad.addColorStop(0.18, 'rgba(255,206,120,0.75)')
    grad.addColorStop(0.5, 'rgba(255,160,70,0.22)')
    grad.addColorStop(1, 'rgba(255,140,60,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  }
  return new THREE.CanvasTexture(c)
}
