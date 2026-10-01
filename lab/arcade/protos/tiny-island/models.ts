// The wooden toys, the island and its turntable, the sea and the tray, built
// from a handful of low-poly primitives into one vertex-coloured geometry each
// (one draw call per toy). Nothing here touches the DOM or WebGL.

import * as THREE from 'three'

export interface Geo {
  pos: number[]
  col: number[]
  glow: number[]
}

export const newGeo = (): Geo => ({ pos: [], col: [], glow: [] })

// A small seeded generator so the hand-painted wobble in the colours is the
// same every time the island is built.
let seed = 20260930
export function reseed(n: number): void {
  seed = n >>> 0
}
function rr(): number {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0
  return seed / 4294967296
}

export function hex(c: string): [number, number, number] {
  const n = parseInt(c.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

interface Paint {
  // 1 for glass that warms after dusk.
  glow?: number
  // Per-triangle shade wobble, for leaves, wool and ground.
  facet?: number
  // Per-part shade wobble.
  jit?: number
  ry?: number
  rx?: number
  rz?: number
  sx?: number
  sy?: number
  sz?: number
}

const v = new THREE.Vector3()
const q = new THREE.Quaternion()
const e = new THREE.Euler()
const s3 = new THREE.Vector3()
const p3 = new THREE.Vector3()

function mat(x: number, y: number, z: number, o: Paint): THREE.Matrix4 {
  e.set(o.rx ?? 0, o.ry ?? 0, o.rz ?? 0, 'YXZ')
  q.setFromEuler(e)
  return new THREE.Matrix4().compose(p3.set(x, y, z), q, s3.set(o.sx ?? 1, o.sy ?? 1, o.sz ?? 1))
}

function add(G: Geo, src: THREE.BufferGeometry, m: THREE.Matrix4, color: string, o: Paint): void {
  const g = src.index ? src.toNonIndexed() : src
  const p = g.getAttribute('position')
  const [r0, g0, b0] = hex(color)
  const j0 = 1 + (rr() - 0.5) * 2 * (o.jit ?? 0.015)
  for (let i = 0; i < p.count; i += 3) {
    const jf = j0 * (1 + (rr() - 0.5) * 2 * (o.facet ?? 0))
    for (let k = 0; k < 3; k++) {
      v.fromBufferAttribute(p, i + k).applyMatrix4(m)
      G.pos.push(v.x, v.y, v.z)
      G.col.push(r0 * jf, g0 * jf, b0 * jf)
      G.glow.push(o.glow ?? 0)
    }
  }
  if (g !== src) g.dispose()
  src.dispose()
}

// Every primitive sits with its base at y.
export function box(G: Geo, w: number, h: number, d: number, x: number, y: number, z: number, color: string, o: Paint = {}): void {
  const src = new THREE.BoxGeometry(w, h, d)
  src.translate(0, h / 2, 0)
  add(G, src, mat(x, y, z, o), color, o)
}

export function cyl(G: Geo, rTop: number, rBot: number, h: number, seg: number, x: number, y: number, z: number, color: string, o: Paint = {}): void {
  const src = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1)
  src.translate(0, h / 2, 0)
  add(G, src, mat(x, y, z, o), color, o)
}

// Centred on x, y, z.
export function ball(G: Geo, r: number, detail: number, x: number, y: number, z: number, color: string, o: Paint = {}): void {
  add(G, new THREE.IcosahedronGeometry(r, detail), mat(x, y, z, o), color, o)
}

function tri(G: Geo, a: number[], b: number[], c: number[], rgb: [number, number, number], glow = 0): void {
  G.pos.push(a[0]!, a[1]!, a[2]!, b[0]!, b[1]!, b[2]!, c[0]!, c[1]!, c[2]!)
  for (let k = 0; k < 3; k++) {
    G.col.push(rgb[0], rgb[1], rgb[2])
    G.glow.push(glow)
  }
}

function shade(color: string, f: number): [number, number, number] {
  const [r, g, b] = hex(color)
  return [r * f, g * f, b * f]
}

// A roof: a triangular prism with its ridge along x, base at y.
export function prism(G: Geo, w: number, h: number, d: number, x: number, y: number, z: number, color: string, o: Paint = {}): void {
  const m = mat(x, y, z, o)
  const P = (px: number, py: number, pz: number): number[] => {
    v.set(px, py, pz).applyMatrix4(m)
    return [v.x, v.y, v.z]
  }
  const A = P(-w / 2, 0, -d / 2)
  const B = P(w / 2, 0, -d / 2)
  const C = P(w / 2, 0, d / 2)
  const D = P(-w / 2, 0, d / 2)
  const E = P(-w / 2, h, 0)
  const F = P(w / 2, h, 0)
  const c = shade(color, 1 + (rr() - 0.5) * 0.03)
  tri(G, D, C, F, c)
  tri(G, D, F, E, c)
  tri(G, B, A, E, c)
  tri(G, B, E, F, c)
  tri(G, A, D, E, c)
  tri(G, C, B, F, c)
  tri(G, A, B, C, c)
  tri(G, A, C, D, c)
}

export function build(G: Geo): THREE.BufferGeometry {
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(G.pos, 3))
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(G.col, 3))
  g.setAttribute('aGlow', new THREE.Float32BufferAttribute(G.glow, 1))
  g.computeBoundingSphere()
  return g
}

// ---------------------------------------------------------------- palette

export const C = {
  grass: '#b6e3ae',
  grassHi: '#d6eeb6',
  sand: '#f8e9cb',
  brook: '#a6dbe8',
  sea: '#9bd6dc',
  seaNear: '#84c9d3',
  wood: '#e6c59b',
  woodMid: '#d9b384',
  woodDark: '#c59a6b',
  cream: '#fdf3e3',
  coral: '#f2a391',
  blue: '#9fc4e0',
  butter: '#f4d98e',
  pink: '#f7c6d0',
  mint: '#aee0c8',
  lilac: '#cdc7da',
  stone: '#ece4d8',
  stone2: '#ded7cc',
  wool: '#fffaf0',
  dark: '#857a76',
  glass: '#e2f0f4',
  leaf: '#a9d8a2',
  pine: '#8fcab4',
  skin: '#f7dcc4',
}

export const ROOFS = [C.coral, C.blue, C.butter]
const WALLS = [C.cream, '#fbeae4', '#f1f5ee']

// ---------------------------------------------------------------- the toys

export function cottage(variant: number): THREE.BufferGeometry {
  const G = newGeo()
  const roof = ROOFS[variant % 3]!
  box(G, 1.0, 0.6, 0.78, 0, 0, 0, WALLS[variant % 3]!)
  prism(G, 1.18, 0.46, 0.98, 0, 0.6, 0, roof)
  box(G, 0.15, 0.36, 0.15, 0.27, 0.72, -0.12, '#eab9a8')
  box(G, 0.19, 0.04, 0.19, 0.27, 1.08, -0.12, C.cream)
  box(G, 0.2, 0.34, 0.05, 0, 0, 0.385, C.woodDark)
  box(G, 0.18, 0.18, 0.05, -0.31, 0.24, 0.385, C.glass, { glow: 1 })
  box(G, 0.18, 0.18, 0.05, 0.31, 0.24, 0.385, C.glass, { glow: 1 })
  box(G, 0.2, 0.18, 0.05, 0, 0.24, -0.385, C.glass, { glow: 1 })
  box(G, 0.05, 0.18, 0.18, 0.495, 0.24, 0.05, C.glass, { glow: 1 })
  box(G, 0.05, 0.18, 0.18, -0.495, 0.24, 0.05, C.glass, { glow: 1 })
  return build(G)
}

// Where each cottage's smoke leaves it, and its windows, in its own space.
export const CHIMNEY = new THREE.Vector3(0.27, 1.16, -0.12)

export function tree(variant: number): THREE.BufferGeometry {
  const G = newGeo()
  cyl(G, 0.23, 0.26, 0.05, 10, 0, 0, 0, C.wood)
  if (variant % 2 === 1) {
    cyl(G, 0.06, 0.07, 0.24, 6, 0, 0.05, 0, C.woodDark)
    cyl(G, 0, 0.42, 0.5, 7, 0, 0.24, 0, C.pine, { facet: 0.05 })
    cyl(G, 0, 0.33, 0.45, 7, 0, 0.53, 0, C.pine, { facet: 0.05, ry: 0.4 })
    cyl(G, 0, 0.23, 0.4, 7, 0, 0.82, 0, C.pine, { facet: 0.05, ry: 0.8 })
  } else {
    const leaf = variant === 2 ? C.pink : C.leaf
    cyl(G, 0.06, 0.075, 0.52, 6, 0, 0.05, 0, C.woodDark)
    ball(G, 0.42, 1, 0, 0.9, 0, leaf, { facet: 0.06, sy: 1.05 })
    ball(G, 0.25, 0, 0.24, 1.12, 0.1, leaf, { facet: 0.06 })
  }
  return build(G)
}

export function sheep(): THREE.BufferGeometry {
  const G = newGeo()
  ball(G, 0.25, 1, 0, 0.36, 0, C.wool, { facet: 0.035, sx: 0.95, sy: 0.86, sz: 1.25 })
  ball(G, 0.115, 0, 0, 0.44, 0.33, C.dark, { ry: 0.3 })
  box(G, 0.06, 0.03, 0.05, -0.12, 0.47, 0.3, C.dark, { rz: 0.3 })
  box(G, 0.06, 0.03, 0.05, 0.12, 0.47, 0.3, C.dark, { rz: -0.3 })
  ball(G, 0.065, 0, 0, 0.4, -0.32, C.wool)
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) cyl(G, 0.035, 0.035, 0.22, 5, sx * 0.11, 0, sz * 0.17, C.dark)
  return build(G)
}

export function stones(): THREE.BufferGeometry {
  const G = newGeo()
  cyl(G, 0.17, 0.19, 0.05, 7, -0.37, 0, 0.05, C.stone, { ry: 0.3 })
  cyl(G, 0.2, 0.22, 0.055, 7, 0, 0, -0.04, C.stone2, { ry: 1.1 })
  cyl(G, 0.16, 0.18, 0.05, 7, 0.37, 0, 0.05, C.stone, { ry: 2.0 })
  return build(G)
}

export function well(): THREE.BufferGeometry {
  const G = newGeo()
  cyl(G, 0.3, 0.33, 0.28, 8, 0, 0, 0, C.lilac, { facet: 0.03 })
  cyl(G, 0.22, 0.22, 0.02, 8, 0, 0.27, 0, '#8fc4dc')
  box(G, 0.05, 0.5, 0.05, -0.27, 0.26, 0, C.woodDark)
  box(G, 0.05, 0.5, 0.05, 0.27, 0.26, 0, C.woodDark)
  box(G, 0.56, 0.035, 0.035, 0, 0.62, 0, C.wood)
  prism(G, 0.8, 0.22, 0.46, 0, 0.74, 0, C.coral)
  box(G, 0.012, 0.16, 0.012, 0, 0.46, 0, C.woodMid)
  cyl(G, 0.055, 0.045, 0.09, 6, 0, 0.38, 0, C.wood)
  return build(G)
}

export const BRIDGE_HALF = 0.8
export const BRIDGE_RISE = 0.3
export function bridge(): THREE.BufferGeometry {
  const G = newGeo()
  for (let i = -2; i <= 2; i++) {
    const x = i * 0.33
    const y = BRIDGE_RISE * (1 - (x / 0.95) ** 2)
    const slope = Math.atan((-2 * BRIDGE_RISE * x) / (0.95 * 0.95))
    box(G, 0.37, 0.07, 0.52, x, y - 0.03, 0, i % 2 === 0 ? C.wood : C.woodMid, { rz: slope })
    for (const side of [-1, 1]) {
      box(G, 0.045, 0.17, 0.045, x, y, side * 0.235, C.woodDark, { rz: slope })
      box(G, 0.37, 0.045, 0.05, x, y + 0.16, side * 0.235, C.coral, { rz: slope })
    }
  }
  box(G, 0.2, 0.13, 0.6, -0.86, 0, 0, C.lilac)
  box(G, 0.2, 0.13, 0.6, 0.86, 0, 0, C.lilac)
  return build(G)
}

export const HUB = new THREE.Vector3(0, 1.0, 0.46)
export function windmill(): THREE.BufferGeometry {
  const G = newGeo()
  const turn = Math.PI / 6
  cyl(G, 0.44, 0.46, 0.14, 6, 0, 0, 0, C.pink, { ry: turn })
  cyl(G, 0.26, 0.42, 1.15, 6, 0, 0.1, 0, C.cream, { ry: turn })
  cyl(G, 0, 0.36, 0.34, 6, 0, 1.25, 0, C.blue, { ry: turn })
  box(G, 0.2, 0.34, 0.05, 0, 0.1, 0.34, C.woodDark, { rx: -0.12 })
  box(G, 0.15, 0.16, 0.05, 0, 0.62, 0.278, C.glass, { glow: 1, rx: -0.12 })
  cyl(G, 0.04, 0.04, 0.24, 6, HUB.x, HUB.y, HUB.z - 0.22, C.woodDark, { rx: Math.PI / 2 })
  return build(G)
}

export function blades(): THREE.BufferGeometry {
  const G = newGeo()
  cyl(G, 0.075, 0.075, 0.06, 8, 0, 0, -0.03, C.coral, { rx: Math.PI / 2 })
  for (let k = 0; k < 4; k++) {
    const a = (k * Math.PI) / 2
    const ca = Math.cos(a)
    const sa = Math.sin(a)
    // Each blade is built pointing up, then turned about the hub.
    const place = (w: number, h: number, d: number, bx: number, by: number, color: string): void => {
      box(G, w, h, d, bx * ca - by * sa, bx * sa + by * ca, 0, color, { rz: a })
    }
    place(0.045, 0.66, 0.035, 0, 0.02, C.woodDark)
    place(0.2, 0.46, 0.022, 0.1, 0.2, C.cream)
  }
  return build(G)
}

export const LAMP = new THREE.Vector3(0, 1.9, 0)
export function lighthouse(): THREE.BufferGeometry {
  const G = newGeo()
  cyl(G, 0.44, 0.5, 0.2, 8, 0, 0, 0, C.lilac, { facet: 0.03 })
  const radii = [0.38, 0.33, 0.28, 0.23]
  for (let i = 0; i < 3; i++) cyl(G, radii[i + 1]!, radii[i]!, 0.5, 8, 0, 0.2 + i * 0.5, 0, i === 1 ? '#f0968b' : '#fffaf2')
  cyl(G, 0.34, 0.3, 0.06, 8, 0, 1.7, 0, C.wood)
  cyl(G, 0.17, 0.17, 0.27, 8, 0, 1.76, 0, '#fff4cc', { glow: 1 })
  cyl(G, 0, 0.27, 0.24, 8, 0, 2.03, 0, '#f0968b')
  ball(G, 0.05, 0, 0, 2.29, 0, C.butter)
  box(G, 0.2, 0.32, 0.05, 0, 0.2, 0.33, C.woodDark, { rx: -0.1 })
  box(G, 0.12, 0.15, 0.05, 0, 0.88, 0.285, C.glass, { glow: 1, rx: -0.1 })
  return build(G)
}

// The jetty runs out along +z from the shore; its deck is JETTY_DECK above the sea.
export const JETTY_END = 1.95
export function jetty(): THREE.BufferGeometry {
  const G = newGeo()
  for (let i = 0; i < 8; i++) box(G, 0.5, 0.05, 0.27, 0, 0.26, -0.2 + i * 0.285, i % 2 === 0 ? C.wood : C.woodMid)
  for (const z of [0.95, 1.85]) for (const side of [-1, 1]) cyl(G, 0.045, 0.045, 0.75, 6, side * 0.22, -0.35, z, C.woodDark)
  cyl(G, 0.055, 0.055, 0.3, 6, 0.22, 0.3, 1.85, C.woodDark)
  ball(G, 0.07, 0, 0.22, 0.62, 1.85, C.coral)
  return build(G)
}

export function boat(): THREE.BufferGeometry {
  const G = newGeo()
  cyl(G, 0.2, 0.12, 0.16, 6, 0, -0.04, 0, C.coral, { sx: 0.8, sz: 2.1 })
  cyl(G, 0.16, 0.16, 0.02, 6, 0, 0.115, 0, C.cream, { sx: 0.8, sz: 2.1 })
  cyl(G, 0.018, 0.018, 0.58, 5, 0, 0.12, 0.02, C.woodDark)
  const sail = hex(C.cream)
  tri(G, [0, 0.2, -0.02], [0, 0.68, 0.0], [0, 0.2, -0.36], sail)
  tri(G, [0, 0.24, 0.05], [0, 0.6, 0.05], [0, 0.24, 0.26], shade(C.butter, 1))
  box(G, 0.05, 0.05, 0.05, 0, 0.7, 0.02, '#fff4cc', { glow: 1 })
  return build(G)
}

// A peg-doll gnome with a pointed hat the colour of its cottage roof.
export function gnome(variant: number): THREE.BufferGeometry {
  const G = newGeo()
  const coat = ROOFS[variant % 3]!
  cyl(G, 0.075, 0.12, 0.28, 6, 0, 0, 0, coat)
  ball(G, 0.085, 0, 0, 0.35, 0, C.skin)
  cyl(G, 0, 0.1, 0.2, 6, 0, 0.39, 0, coat)
  return build(G)
}

export function puff(): THREE.BufferGeometry {
  const G = newGeo()
  ball(G, 1, 0, 0, 0, 0, '#ffffff', { facet: 0.03 })
  return build(G)
}

// ---------------------------------------------------------------- the land

export const ISLE_R = 4.4
export const RIM_R = 5.0
export const RIM_TOP = 0.1
export const FOOT_R = 5.32
const FOOT_TOP = -0.1

const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export const HILL = { x: -1.5, z: -1.3 }

// A beach that rises a little from the rim, a short grassy bank, a meadow, a hill.
export function groundH(x: number, z: number): number {
  const r = Math.hypot(x, z)
  const beach = 0.1 * (1 - sstep(3.85, ISLE_R, r))
  const bank = 0.24 * (1 - sstep(3.4, 3.85, r))
  const inside = 1 - sstep(2.8, 3.5, r)
  const hill = 1.0 * Math.exp(-((x - HILL.x) ** 2 + (z - HILL.z) ** 2) / 1.5)
  const bumps = 0.05 * Math.sin(1.7 * x + 0.6) * Math.cos(1.4 * z - 0.4)
  return RIM_TOP + beach + bank + inside * (hill + bumps)
}

// The brook: from a spring at the foot of the hill, winding down to the shore.
const BROOK_CTRL: [number, number][] = [
  [-0.35, -0.15],
  [0.45, 0.75],
  [0.65, 1.9],
  [1.45, 2.95],
  [1.75, 4.25],
]
export const BROOK: { x: number; z: number; w: number }[] = (() => {
  const out: { x: number; z: number; w: number }[] = []
  const P = BROOK_CTRL
  const n = P.length
  for (let i = 0; i < n - 1; i++) {
    const p0 = P[Math.max(0, i - 1)]!
    const p1 = P[i]!
    const p2 = P[i + 1]!
    const p3 = P[Math.min(n - 1, i + 2)]!
    for (let k = 0; k < 6; k++) {
      const t = k / 6
      const cr = (a: number, b: number, c: number, d: number): number =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (-a + 3 * b - 3 * c + d) * t * t * t)
      const u = (i + t) / (n - 1)
      out.push({ x: cr(p0[0], p1[0], p2[0], p3[0]), z: cr(p0[1], p1[1], p2[1], p3[1]), w: 0.2 + 0.18 * u })
    }
  }
  const last = P[n - 1]!
  out.push({ x: last[0], z: last[1], w: 0.4 })
  return out
})()

export interface BrookHit {
  d: number
  x: number
  z: number
  // Unit tangent, and how far along (0 spring, 1 mouth).
  tx: number
  tz: number
  u: number
}

export function brookNearest(x: number, z: number): BrookHit {
  let best: BrookHit = { d: 1e9, x: 0, z: 0, tx: 1, tz: 0, u: 0 }
  for (let i = 0; i < BROOK.length - 1; i++) {
    const a = BROOK[i]!
    const b = BROOK[i + 1]!
    const dx = b.x - a.x
    const dz = b.z - a.z
    const len2 = dx * dx + dz * dz
    const t = Math.min(1, Math.max(0, ((x - a.x) * dx + (z - a.z) * dz) / len2))
    const px = a.x + dx * t
    const pz = a.z + dz * t
    const d = Math.hypot(x - px, z - pz)
    if (d < best.d) {
      const len = Math.sqrt(len2)
      best = { d, x: px, z: pz, tx: dx / len, tz: dz / len, u: (i + t) / (BROOK.length - 1) }
    }
  }
  return best
}

export function island(): THREE.BufferGeometry {
  const G = newGeo()
  const SEG = 48
  const radii = [0, 0.5, 1.0, 1.5, 2.0, 2.5, 2.95, 3.4, 3.62, 3.85, 4.12, ISLE_R]
  const bankCol = hex('#a3d7a2')
  const grass = hex(C.grass)
  const hi = hex(C.grassHi)
  const sand = hex(C.sand)
  // A little wander on each ring so the facets are not a spider's web.
  const point = (ring: number, seg: number): number[] => {
    const r = radii[ring]!
    const wob = ring > 0 && ring < 7 ? Math.sin(seg * 2.3 + ring * 1.7) * 0.07 : 0
    const a = ((seg + (ring % 2) * 0.5) / SEG) * Math.PI * 2
    const x = Math.sin(a) * (r + wob)
    const z = Math.cos(a) * (r + wob)
    return [x, groundH(x, z), z]
  }
  const paint = (ring: number, a: number[], b: number[], c: number[]): void => {
    const cy = (a[1]! + b[1]! + c[1]!) / 3
    const j = 1 + (rr() - 0.5) * 0.06
    let col: [number, number, number]
    if (ring >= 9) col = [sand[0] * j, sand[1] * j, sand[2] * j]
    else if (ring >= 7) col = [bankCol[0] * j, bankCol[1] * j, bankCol[2] * j]
    else {
      const t = sstep(0.6, 1.1, cy)
      col = [(grass[0] + (hi[0] - grass[0]) * t) * j, (grass[1] + (hi[1] - grass[1]) * t) * j, (grass[2] + (hi[2] - grass[2]) * t) * j]
    }
    tri(G, a, b, c, col, -1)
  }
  for (let ring = 0; ring < radii.length - 1; ring++) {
    for (let seg = 0; seg < SEG; seg++) {
      const a = point(ring, seg)
      const b = point(ring, seg + 1)
      const c = point(ring + 1, seg)
      const d = point(ring + 1, seg + 1)
      if (ring === 0) paint(ring, a, c, d)
      else if (ring % 2 === 0) {
        paint(ring, a, c, d)
        paint(ring, a, d, b)
      } else {
        paint(ring, a, c, b)
        paint(ring, b, c, d)
      }
    }
  }

  // The brook lies as a ribbon just above the grass, with a round spring pool.
  const water = hex(C.brook)
  const lift = 0.03
  for (let i = 0; i < BROOK.length - 1; i++) {
    const a = BROOK[i]!
    const b = BROOK[i + 1]!
    const len = Math.hypot(b.x - a.x, b.z - a.z)
    const nx = -(b.z - a.z) / len
    const nz = (b.x - a.x) / len
    const prev = BROOK[Math.max(0, i - 1)]!
    const plen = Math.hypot(a.x - prev.x, a.z - prev.z) || 1
    const pnx = i === 0 ? nx : -(a.z - prev.z) / plen
    const pnz = i === 0 ? nz : (a.x - prev.x) / plen
    const ax = (nx + pnx) / 2
    const az = (nz + pnz) / 2
    const next = BROOK[Math.min(BROOK.length - 1, i + 2)]!
    const nlen = Math.hypot(next.x - b.x, next.z - b.z) || 1
    const bx = i === BROOK.length - 2 ? nx : (nx - (next.z - b.z) / nlen) / 2
    const bz = i === BROOK.length - 2 ? nz : (nz + (next.x - b.x) / nlen) / 2
    const at = (px: number, pz: number): number[] => [px, groundH(px, pz) + lift, pz]
    const a1 = at(a.x + ax * a.w, a.z + az * a.w)
    const a2 = at(a.x - ax * a.w, a.z - az * a.w)
    const b1 = at(b.x + bx * b.w, b.z + bz * b.w)
    const b2 = at(b.x - bx * b.w, b.z - bz * b.w)
    const j = 1 + (rr() - 0.5) * 0.05
    const col: [number, number, number] = [water[0] * j, water[1] * j, water[2] * j]
    tri(G, a1, a2, b1, col, -1)
    tri(G, a2, b2, b1, col, -1)
  }
  const spring = BROOK[0]!
  for (let k = 0; k < 8; k++) {
    const a0 = (k / 8) * Math.PI * 2
    const a1 = ((k + 1) / 8) * Math.PI * 2
    const at = (a: number, r: number): number[] => {
      const px = spring.x + Math.sin(a) * r
      const pz = spring.z + Math.cos(a) * r
      return [px, groundH(px, pz) + lift, pz]
    }
    tri(G, at(0, 0), at(a0, 0.42), at(a1, 0.42), water, -1)
  }

  // A scatter of tiny flowers, three faces each.
  const petals = [C.pink, C.butter, '#ffffff', C.coral]
  for (let i = 0; i < 46; i++) {
    const a = rr() * Math.PI * 2
    const r = 0.4 + rr() * 2.9
    const x = Math.sin(a) * r
    const z = Math.cos(a) * r
    if (brookNearest(x, z).d < 0.45) continue
    cyl(G, 0, 0.055, 0.07, 3, x, groundH(x, z) + 0.005, z, petals[i % 4]!, { ry: rr() * 3, glow: -1 })
  }

  // The turntable: a wooden ring round the shore with painted pegs to turn it by.
  const RSEG = 48
  for (let seg = 0; seg < RSEG; seg++) {
    const a0 = (seg / RSEG) * Math.PI * 2
    const a1 = ((seg + 1) / RSEG) * Math.PI * 2
    const stave = Math.floor(seg / 4) % 2 === 0 ? 1 : 0.955
    const top = shade(C.wood, stave)
    const side = shade(C.woodMid, stave)
    const P = (a: number, r: number, y: number): number[] => [Math.sin(a) * r, y, Math.cos(a) * r]
    const inner = ISLE_R - 0.03
    tri(G, P(a0, inner, RIM_TOP), P(a0, RIM_R - 0.07, RIM_TOP), P(a1, RIM_R - 0.07, RIM_TOP), top)
    tri(G, P(a0, inner, RIM_TOP), P(a1, RIM_R - 0.07, RIM_TOP), P(a1, inner, RIM_TOP), top)
    tri(G, P(a0, RIM_R - 0.07, RIM_TOP), P(a0, RIM_R, RIM_TOP - 0.07), P(a1, RIM_R, RIM_TOP - 0.07), shade(C.wood, stave * 1.03))
    tri(G, P(a0, RIM_R - 0.07, RIM_TOP), P(a1, RIM_R, RIM_TOP - 0.07), P(a1, RIM_R - 0.07, RIM_TOP), shade(C.wood, stave * 1.03))
    tri(G, P(a0, RIM_R, RIM_TOP - 0.07), P(a0, RIM_R, FOOT_TOP), P(a1, RIM_R, FOOT_TOP), side)
    tri(G, P(a0, RIM_R, RIM_TOP - 0.07), P(a1, RIM_R, FOOT_TOP), P(a1, RIM_R, RIM_TOP - 0.07), side)
    // A wider foot below the ring, like the base of a turned wooden platter.
    const foot = shade(C.woodDark, stave === 1 ? 1.04 : 1)
    tri(G, P(a0, RIM_R, FOOT_TOP), P(a0, FOOT_R, FOOT_TOP), P(a1, FOOT_R, FOOT_TOP), foot)
    tri(G, P(a0, RIM_R, FOOT_TOP), P(a1, FOOT_R, FOOT_TOP), P(a1, RIM_R, FOOT_TOP), foot)
    tri(G, P(a0, FOOT_R, FOOT_TOP), P(a0, FOOT_R, -0.4), P(a1, FOOT_R, -0.4), shade(C.woodDark, 0.94))
    tri(G, P(a0, FOOT_R, FOOT_TOP), P(a1, FOOT_R, -0.4), P(a1, FOOT_R, FOOT_TOP), shade(C.woodDark, 0.94))
  }
  const pegs = [C.coral, C.butter, C.blue, C.mint, C.pink, C.cream]
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    cyl(G, 0.11, 0.13, 0.11, 8, Math.sin(a) * 4.7, RIM_TOP, Math.cos(a) * 4.7, pegs[i % 6]!)
  }
  return build(G)
}

// The sea: a wide faceted sheet whose far edge is the horizon.
export function sea(far: number, near: number, half: number): THREE.BufferGeometry {
  const G = newGeo()
  const NX = 44
  const NZ = 20
  const c0 = hex(C.sea)
  const c1 = hex(C.seaNear)
  const at = (i: number, k: number): number[] => {
    const x = -half + (i / NX) * 2 * half + (k % 2) * (half / NX)
    const z = far + (k / NZ) * (near - far)
    return [x, 0, z]
  }
  const paint = (a: number[], b: number[], c: number[]): void => {
    const cx = (a[0]! + b[0]! + c[0]!) / 3
    const cz = (a[2]! + b[2]! + c[2]!) / 3
    const r = Math.hypot(cx, cz)
    // Darker close under the turntable, as if it shades the water.
    const t = 1 - sstep(FOOT_R, FOOT_R + 1.6, r)
    const j = 1 + (rr() - 0.5) * 0.05
    tri(G, a, b, c, [(c0[0] + (c1[0] - c0[0]) * t) * j, (c0[1] + (c1[1] - c0[1]) * t) * j, (c0[2] + (c1[2] - c0[2]) * t) * j])
  }
  for (let k = 0; k < NZ; k++) {
    for (let i = -1; i < NX + 1; i++) {
      const a = at(i, k)
      const b = at(i + 1, k)
      const c = at(i, k + 1)
      const d = at(i + 1, k + 1)
      if (k % 2 === 0) {
        paint(a, c, b)
        paint(b, c, d)
      } else {
        paint(a, c, d)
        paint(a, d, b)
      }
    }
  }
  return build(G)
}

// The tray: a shallow beech box with a round mat for each kind of toy.
export function tray(width: number, depth: number, slots: number[]): THREE.BufferGeometry {
  const G = newGeo()
  box(G, width, 0.2, depth, 0, -0.2, 0, C.wood)
  box(G, width + 0.16, 0.34, 0.12, 0, -0.2, -depth / 2 - 0.04, C.woodMid)
  box(G, width + 0.16, 0.26, 0.12, 0, -0.2, depth / 2 + 0.04, C.woodMid)
  box(G, 0.12, 0.34, depth, -width / 2 - 0.02, -0.2, 0, C.woodMid)
  box(G, 0.12, 0.34, depth, width / 2 + 0.02, -0.2, 0, C.woodMid)
  for (const x of slots) cyl(G, 0.43, 0.43, 0.012, 18, x, 0, 0.05, '#d7b488', { sz: 0.92 })
  return build(G)
}
