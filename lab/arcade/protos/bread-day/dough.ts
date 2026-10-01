// The dough. The big piece is a soft blob: a ring of points on springs round a
// centre, with its area held nearly constant, so a push on one side bulges the
// others and it wobbles back when let go. Pieces pulled off it are short
// chains of points: one point is a roll, many are a rope that can be laid in a
// curl. The same shapes are drawn raw, risen and baked.

import { TAU, clamp, lerp } from '../../kit/math.ts'
import { css, mixRgb, seedShape } from './scene.ts'
import type { RGB } from './scene.ts'

export const N = 40
const COS: number[] = []
const SIN: number[] = []
const COS2: number[] = []
// Lying on a table and seen from in front, a round of dough is a little wider
// than it is tall.
const SHAPE: number[] = []
for (let i = 0; i < N; i++) {
  const a = (i / N) * TAU
  COS.push(Math.cos(a))
  SIN.push(Math.sin(a))
  COS2.push(Math.cos(a * 2))
  SHAPE.push((1.07 * 0.88) / Math.hypot(0.88 * Math.cos(a), 1.07 * Math.sin(a)))
}

// Rope pieces: spacing of the points and the rope's radius.
export const SEG = 14
export const ROPE_R = 17
export const ROLL_MASS = Math.PI * 37 * 37

export interface BlobSeed {
  a: number
  f: number
  kind: number
  rot: number
}

interface Crease {
  x: number
  y: number
  rot: number
  len: number
  life: number
}

interface Blotch {
  a: number
  f: number
  r: number
  light: boolean
}

export interface Blob {
  x: number
  y: number
  // Area-equivalent rest radius.
  R: number
  rho: number[]
  vel: number[]
  lump: number[]
  // Bites torn out of the baked loaf, per point, 0..1.
  notch: number[]
  // 0 is shaggy, just come together; 1 is smooth and springy.
  work: number
  // 0..1 while a hand is pressing down on it: it spreads a little.
  flat: number
  rise: number
  bake: number
  creases: Crease[]
  blotches: Blotch[]
  seeds: BlobSeed[]
}

export function makeBlob(x: number, y: number, R: number, rand: () => number): Blob {
  const p1 = rand() * TAU
  const p2 = rand() * TAU
  const p3 = rand() * TAU
  const lump: number[] = []
  for (let i = 0; i < N; i++) {
    const a = (i / N) * TAU
    lump.push(Math.sin(a * 3 + p1) * 0.5 + Math.sin(a * 5 + p2) * 0.35 + Math.sin(a * 8 + p3) * 0.22)
  }
  const blotches: Blotch[] = []
  for (let i = 0; i < 28; i++) blotches.push({ a: rand() * TAU, f: Math.sqrt(rand()) * 0.88, r: 0.07 + rand() * 0.12, light: i % 2 === 0 })
  const b: Blob = { x, y, R, rho: [], vel: [], lump, notch: [], work: 0, flat: 0, rise: 0, bake: 0, creases: [], blotches, seeds: [] }
  for (let i = 0; i < N; i++) {
    b.notch.push(0)
    b.vel.push(0)
    b.rho.push(0)
  }
  for (let i = 0; i < N; i++) b.rho[i] = restRadius(b, i)
  return b
}

export function restRadius(b: Blob, i: number): number {
  const rough = (1 - b.work) * 0.11
  return b.R * SHAPE[i]! * (1 + rough * b.lump[i]! + b.flat * 0.05) * (1 - b.notch[i]!)
}

function sample(values: number[], angle: number): number {
  const t = ((((angle / TAU) % 1) + 1) % 1) * N
  const i = Math.floor(t) % N
  const f = t - Math.floor(t)
  return values[i]! * (1 - f) + values[(i + 1) % N]! * f
}

export function radiusAt(b: Blob, angle: number): number {
  return sample(b.rho, angle)
}

export function restAt(b: Blob, angle: number): number {
  const t = ((((angle / TAU) % 1) + 1) % 1) * N
  const i = Math.floor(t) % N
  const f = t - Math.floor(t)
  return restRadius(b, i) * (1 - f) + restRadius(b, (i + 1) % N) * f
}

// How much bigger the dough is drawn once it has risen and sprung in the oven.
export function growth(rise: number, bake: number): number {
  return 1 + 0.2 * rise + 0.06 * Math.min(1, bake)
}

export function stepBlob(b: Blob, dt: number): void {
  const rigid = b.bake > 0.12
  const k = rigid ? 420 : lerp(44, 100, b.work)
  const c = rigid ? 36 : lerp(11, 7.2, b.work)
  const kn = rigid ? 500 : 300
  const h = dt / 2
  for (let s = 0; s < 2; s++) {
    let area = 0
    let want = 0
    for (let i = 0; i < N; i++) {
      const rest = restRadius(b, i)
      area += b.rho[i]! * b.rho[i]!
      want += rest * rest
    }
    const pressure = ((want - area) / want) * b.R * 240
    for (let i = 0; i < N; i++) {
      const rho = b.rho[i]!
      const acc = k * (restRadius(b, i) - rho) + kn * (b.rho[(i + N - 1) % N]! + b.rho[(i + 1) % N]! - 2 * rho) - c * b.vel[i]! + pressure
      b.vel[i] = b.vel[i]! + acc * h
    }
    for (let i = 0; i < N; i++) {
      const rest = restRadius(b, i)
      b.rho[i] = clamp(b.rho[i]! + b.vel[i]! * h, rest * 0.3, rest * 2.6)
    }
  }
  for (let i = b.creases.length - 1; i >= 0; i--) {
    const crease = b.creases[i]!
    crease.life -= dt / 5
    if (crease.life <= 0) b.creases.splice(i, 1)
  }
}

// A finger inside the dough moving `mx`, `my` this frame: the dough ahead of
// it bulges and the dough behind draws in.
export function pushBlob(b: Blob, mx: number, my: number, depth: number): void {
  const moved = Math.hypot(mx, my)
  if (moved < 0.01) return
  const dx = mx / moved
  const dy = my / moved
  const gain = Math.min(moved, 46) * (0.55 + 0.6 * depth)
  for (let i = 0; i < N; i++) {
    const c = COS[i]! * dx + SIN[i]! * dy
    const w = c > 0 ? c * c * c : c * 0.28
    b.rho[i] = b.rho[i]! + gain * 0.34 * w
    b.vel[i] = b.vel[i]! + gain * 3 * w
  }
}

// A finger pressing in from outside: no point of the outline may be under it.
export function dentBlob(b: Blob, fx: number, fy: number, finger: number): void {
  const d2 = fx * fx + fy * fy
  for (let i = 0; i < N; i++) {
    const proj = fx * COS[i]! + fy * SIN[i]!
    if (proj <= 0) continue
    const perp2 = d2 - proj * proj
    if (perp2 >= finger * finger) continue
    const limit = Math.max(proj - Math.sqrt(finger * finger - perp2), restRadius(b, i) * 0.34)
    if (b.rho[i]! > limit) {
      b.rho[i] = limit
      if (b.vel[i]! > 0) b.vel[i] = 0
    }
  }
}

// A finger that began inside and is now `beyond` pixels past the edge at
// `angle`: a lobe follows it, narrowing to a neck as it goes.
export function pullBlob(b: Blob, angle: number, beyond: number, dt: number): void {
  const sigma = lerp(0.5, 0.2, clamp(beyond / 130, 0, 1))
  const rate = Math.min(1, dt * 26)
  for (let i = 0; i < N; i++) {
    let da = Math.abs((i / N) * TAU - angle) % TAU
    if (da > Math.PI) da = TAU - da
    const g = Math.exp(-((da / sigma) ** 2))
    if (g < 0.01) continue
    const target = restRadius(b, i) + beyond * g
    b.rho[i] = lerp(b.rho[i]!, target, rate * Math.min(1, g * 1.6))
    b.vel[i] = b.vel[i]! * 0.7
  }
}

// Flatten (positive) or stand up (negative) and let the springs answer.
export function squashBlob(b: Blob, amount: number): void {
  for (let i = 0; i < N; i++) {
    b.rho[i] = b.rho[i]! * (1 + amount * COS2[i]!)
    b.vel[i] = b.vel[i]! + amount * COS2[i]! * b.R * 3
  }
}

export function jiggleBlob(b: Blob, amount: number): void {
  for (let i = 0; i < N; i++) b.vel[i] = b.vel[i]! + amount * b.R * (COS2[i]! * 0.6 + b.lump[i]! * 0.5)
}

export function addCrease(b: Blob, fx: number, fy: number, dirX: number, dirY: number): void {
  if (b.creases.length > 6) b.creases.shift()
  b.creases.push({ x: (fx / b.R) * 0.6, y: (fy / b.R) * 0.6, rot: Math.atan2(dirY, dirX) + Math.PI / 2, len: 0.5 + Math.random() * 0.3, life: 1 })
}

// Tear a bite out of the baked loaf at `angle`.
export function notchBlob(b: Blob, angle: number, depth: number): void {
  for (let i = 0; i < N; i++) {
    let da = Math.abs((i / N) * TAU - angle) % TAU
    if (da > Math.PI) da = TAU - da
    const g = Math.exp(-((da / 0.36) ** 2))
    b.notch[i] = Math.min(0.62, b.notch[i]! + depth * g * (0.85 + Math.random() * 0.3))
  }
}

// ------------------------------------------------------------- colours

const RAW: RGB = [242, 229, 201]
const SHAGGY: RGB = [232, 217, 188]
const RAMP: readonly (readonly [number, RGB])[] = [
  [0, RAW],
  [0.3, [241, 214, 160]],
  [0.65, [231, 180, 106]],
  [1, [209, 143, 70]],
  [1.45, [160, 98, 48]],
]

export interface Crust {
  base: RGB
  light: RGB
  dark: RGB
  line: RGB
}

export function crust(bake: number, smooth: number): Crust {
  let base: RGB = RAMP[RAMP.length - 1]![1]
  for (let i = 1; i < RAMP.length; i++) {
    const [at, color] = RAMP[i]!
    const [from, before] = RAMP[i - 1]!
    if (bake <= at) {
      base = mixRgb(before, color, clamp((bake - from) / (at - from), 0, 1))
      break
    }
  }
  if (bake < 0.3) base = mixRgb(base, SHAGGY, (1 - smooth) * (1 - bake / 0.3) * 0.8)
  const b = Math.min(1, bake)
  return {
    base,
    light: mixRgb(base, [255, 251, 238], 0.5 - b * 0.12),
    dark: mixRgb(base, [128, 76, 34], 0.22 + b * 0.2),
    line: mixRgb(base, [104, 62, 26], 0.4 + b * 0.16),
  }
}

// ------------------------------------------------------------- drawing

function blobPath(g: CanvasRenderingContext2D, b: Blob, cx: number, cy: number, scale: number): void {
  g.beginPath()
  let px = cx + b.rho[N - 1]! * scale * COS[N - 1]!
  let py = cy + b.rho[N - 1]! * scale * SIN[N - 1]!
  let x0 = cx + b.rho[0]! * scale
  let y0 = cy
  g.moveTo((px + x0) / 2, (py + y0) / 2)
  for (let i = 0; i < N; i++) {
    const j = (i + 1) % N
    px = x0
    py = y0
    x0 = cx + b.rho[j]! * scale * COS[j]!
    y0 = cy + b.rho[j]! * scale * SIN[j]!
    g.quadraticCurveTo(px, py, (px + x0) / 2, (py + y0) / 2)
  }
  g.closePath()
}

export interface Press {
  x: number
  y: number
}

export function drawBlob(g: CanvasRenderingContext2D, b: Blob, cx: number, cy: number, presses: readonly Press[], breath: number): void {
  const s = growth(b.rise, b.bake) * (1 + breath)
  const col = crust(b.bake, b.work)
  const R = b.R * s
  const baked = Math.min(1, b.bake)
  blobPath(g, b, cx + 4, cy + 9 + b.rise * 3, s * 1.01)
  g.fillStyle = 'rgba(92,58,28,0.2)'
  g.fill()
  blobPath(g, b, cx, cy, s)
  const grad = g.createRadialGradient(cx - R * 0.3, cy - R * 0.36, R * 0.06, cx - R * 0.05, cy, R * 1.22)
  grad.addColorStop(0, css(col.light))
  grad.addColorStop(0.55, css(col.base))
  grad.addColorStop(1, css(col.dark))
  g.fillStyle = grad
  g.fill()
  g.save()
  g.clip()
  // Just mixed, it is patchy with flour and wet; kneading works that away.
  const patchy = (1 - b.work) * (1 - Math.min(1, b.bake * 3))
  if (patchy > 0.02) {
    for (const blotch of b.blotches) {
      const r = radiusAt(b, blotch.a) * blotch.f * s
      g.fillStyle = blotch.light ? `rgba(255,252,242,${0.42 * patchy})` : `rgba(204,180,138,${0.26 * patchy})`
      g.beginPath()
      g.ellipse(cx + Math.cos(blotch.a) * r, cy + Math.sin(blotch.a) * r, blotch.r * R, blotch.r * R * 0.62, blotch.a, 0, TAU)
      g.fill()
    }
  }
  // Folds from kneading.
  for (const crease of b.creases) {
    const x = cx + crease.x * R
    const y = cy + crease.y * R
    const hx = Math.cos(crease.rot) * crease.len * R * 0.5
    const hy = Math.sin(crease.rot) * crease.len * R * 0.5
    const bx = -hy * 0.3
    const by = hx * 0.3
    g.lineWidth = 3
    g.strokeStyle = css(col.dark, 0.5 * crease.life)
    g.beginPath()
    g.moveTo(x - hx, y - hy)
    g.quadraticCurveTo(x + bx, y + by, x + hx, y + hy)
    g.stroke()
    g.strokeStyle = `rgba(255,252,240,${0.5 * crease.life})`
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(x - hx + 2, y - hy + 4)
    g.quadraticCurveTo(x + bx + 2, y + by + 4, x + hx + 2, y + hy + 4)
    g.stroke()
  }
  if (baked > 0.1) {
    // A floury bloom on the crust, and the cracks where it sprang.
    g.fillStyle = `rgba(255,250,236,${0.2 * baked})`
    for (let i = 0; i < 5; i++) {
      const blotch = b.blotches[i * 3]!
      const r = radiusAt(b, blotch.a) * blotch.f * 0.7 * s
      g.beginPath()
      g.ellipse(cx + Math.cos(blotch.a) * r - R * 0.08, cy + Math.sin(blotch.a) * r - R * 0.1, blotch.r * R * 1.3, blotch.r * R * 0.5, blotch.a * 0.3 - 0.4, 0, TAU)
      g.fill()
    }
    g.strokeStyle = css(col.dark, 0.55 * baked)
    g.lineWidth = 2.2
    for (let i = 0; i < 3; i++) {
      const blotch = b.blotches[i * 2 + 1]!
      const x = cx + (i - 1) * R * 0.42 + Math.cos(blotch.a) * R * 0.06
      const y = cy - R * 0.06 + Math.sin(blotch.a) * R * 0.12
      g.beginPath()
      g.moveTo(x - R * 0.1, y + R * 0.24)
      g.quadraticCurveTo(x - R * 0.02, y, x + R * 0.12, y - R * 0.24)
      g.stroke()
    }
    // Where a piece has been torn off: pale crumb.
    let open = false
    g.beginPath()
    for (let i = 0; i <= N; i++) {
      const j = i % N
      if (b.notch[j]! > 0.03) {
        const x = cx + b.rho[j]! * s * COS[j]!
        const y = cy + b.rho[j]! * s * SIN[j]!
        if (open) g.lineTo(x, y)
        else g.moveTo(x, y)
        open = true
      } else {
        open = false
      }
    }
    // (Only the half of each stroke inside the loaf shows: the rest is clipped.)
    g.strokeStyle = css(col.dark, 0.7)
    g.lineWidth = 52
    g.stroke()
    g.strokeStyle = '#f6e9cb'
    g.lineWidth = 46
    g.stroke()
    g.strokeStyle = 'rgba(206,176,126,0.8)'
    g.lineWidth = 5
    g.setLineDash([3, 13])
    g.lineDashOffset = 4
    g.stroke()
    g.lineWidth = 22
    g.setLineDash([4, 17])
    g.lineDashOffset = 11
    g.strokeStyle = 'rgba(206,176,126,0.5)'
    g.stroke()
    g.setLineDash([])
    g.lineDashOffset = 0
  }
  for (const press of presses) {
    // A dent: light on the far lip, shade on the near wall, deepest off-centre.
    g.fillStyle = 'rgba(255,253,244,0.4)'
    g.beginPath()
    g.ellipse(press.x + 4, press.y + 8, 50, 43, 0, 0, TAU)
    g.fill()
    g.fillStyle = css(col.dark, 0.5)
    g.beginPath()
    g.ellipse(press.x, press.y, 42, 36, 0, 0, TAU)
    g.fill()
    g.fillStyle = css(col.base, 0.55)
    g.beginPath()
    g.ellipse(press.x + 5, press.y + 6, 31, 26, 0, 0, TAU)
    g.fill()
  }
  for (const seed of b.seeds) {
    const r = radiusAt(b, seed.a) * seed.f * s
    seedShape(g, cx + Math.cos(seed.a) * r, cy + Math.sin(seed.a) * r, seed.kind, seed.rot, 1.15)
  }
  // The sheen of worked dough.
  const sheen = baked > 0.1 ? 0.1 : 0.12 + 0.3 * b.work
  g.fillStyle = `rgba(255,255,250,${sheen})`
  g.beginPath()
  g.ellipse(cx - R * 0.3, cy - R * 0.4, R * 0.44, R * 0.17, -0.42, 0, TAU)
  g.fill()
  g.restore()
  blobPath(g, b, cx, cy, s)
  g.strokeStyle = css(col.line)
  g.lineWidth = 2.6
  g.stroke()
}

// ------------------------------------------------------------- pieces

export interface PNode {
  x: number
  y: number
}

export interface PieceSeed {
  i: number
  ox: number
  oy: number
  kind: number
  rot: number
}

export interface Piece {
  nodes: PNode[]
  // Area in square pixels, and the radius that follows from it.
  mass: number
  thick: number
  smooth: number
  rise: number
  bake: number
  seeds: PieceSeed[]
  // 0 plain, 1 twisted like a plait.
  twist: number
  twistTo: number
  // A squash that springs back when it is set down or patted.
  wob: number
  wobVel: number
  phase: number
  // Torn from the baked loaf: one face is crumb.
  torn: boolean
  // Sharing: which figure has it (-1 none), how far it has travelled to them,
  // where it started, and how much is eaten.
  owner: number
  give: number
  fromX: number
  fromY: number
  eaten: number
}

export function makePiece(x: number, y: number, mass: number, smooth: number): Piece {
  return {
    nodes: [{ x, y }],
    mass,
    thick: Math.sqrt(mass / Math.PI),
    smooth,
    rise: 0,
    bake: 0,
    seeds: [],
    twist: 0,
    twistTo: 0,
    wob: 0,
    wobVel: 0,
    phase: Math.random() * TAU,
    torn: false,
    owner: -1,
    give: 0,
    fromX: 0,
    fromY: 0,
    eaten: 0,
  }
}

export function pieceLength(p: Piece): number {
  return (p.nodes.length - 1) * SEG
}

// The radius of a sausage of this area and length.
export function thickFor(mass: number, length: number): number {
  return (-2 * length + Math.sqrt(4 * length * length + 4 * Math.PI * mass)) / (2 * Math.PI)
}

export function massFor(length: number, radius: number): number {
  return 2 * radius * length + Math.PI * radius * radius
}

export function pieceCentre(p: Piece): PNode {
  let x = 0
  let y = 0
  for (const node of p.nodes) {
    x += node.x
    y += node.y
  }
  return { x: x / p.nodes.length, y: y / p.nodes.length }
}

// The farthest any part of the piece reaches from its centre.
export function pieceReach(p: Piece): number {
  const c = pieceCentre(p)
  let far = 0
  for (const node of p.nodes) far = Math.max(far, Math.hypot(node.x - c.x, node.y - c.y))
  return far + p.thick * growth(p.rise, p.bake)
}

const ROLL_X: number[] = []
const ROLL_Y: number[] = []

function ropePath(g: CanvasRenderingContext2D, nodes: readonly PNode[], dx: number, dy: number): void {
  g.beginPath()
  g.moveTo(nodes[0]!.x + dx, nodes[0]!.y + dy)
  for (let i = 1; i < nodes.length - 1; i++) {
    const a = nodes[i]!
    const b = nodes[i + 1]!
    g.quadraticCurveTo(a.x + dx, a.y + dy, (a.x + b.x) / 2 + dx, (a.y + b.y) / 2 + dy)
  }
  const last = nodes[nodes.length - 1]!
  g.lineTo(last.x + dx, last.y + dy)
}

export function drawPiece(g: CanvasRenderingContext2D, p: Piece): void {
  const col = crust(p.bake, p.smooth)
  const s = growth(p.rise, p.bake)
  const baked = Math.min(1, p.bake)
  if (p.nodes.length === 1) {
    const { x, y } = p.nodes[0]!
    const r = p.thick * s
    const sx = 1 + p.wob * 0.5
    const sy = (1 - p.wob * 0.5) * 0.92
    g.fillStyle = 'rgba(92,58,28,0.2)'
    g.beginPath()
    g.ellipse(x + 3, y + 6 + p.rise * 2, r * sx * 1.02, r * sy * 1.02, 0, 0, TAU)
    g.fill()
    const rough = 0.025 + (1 - p.smooth) * 0.07
    const M = 12
    for (let j = 0; j < M; j++) {
      const a = (j / M) * TAU
      const rr = r * (1 + rough * (Math.sin(a * 2 + p.phase) * 0.6 + Math.sin(a * 3 + p.phase * 1.7) * 0.5))
      ROLL_X[j] = x + Math.cos(a) * rr * sx
      ROLL_Y[j] = y + Math.sin(a) * rr * sy
    }
    g.beginPath()
    g.moveTo((ROLL_X[M - 1]! + ROLL_X[0]!) / 2, (ROLL_Y[M - 1]! + ROLL_Y[0]!) / 2)
    for (let j = 0; j < M; j++) {
      const k = (j + 1) % M
      g.quadraticCurveTo(ROLL_X[j]!, ROLL_Y[j]!, (ROLL_X[j]! + ROLL_X[k]!) / 2, (ROLL_Y[j]! + ROLL_Y[k]!) / 2)
    }
    g.closePath()
    const grad = g.createRadialGradient(x - r * 0.3, y - r * 0.36, r * 0.08, x, y, r * 1.2)
    grad.addColorStop(0, css(col.light))
    grad.addColorStop(0.55, css(col.base))
    grad.addColorStop(1, css(col.dark))
    g.fillStyle = grad
    g.fill()
    g.strokeStyle = css(col.line)
    g.lineWidth = 2.4
    g.stroke()
    if (p.torn) {
      // The torn face: pale crumb with a few holes.
      const a = p.phase
      const fx = x + Math.cos(a) * r * 0.3
      const fy = y + Math.sin(a) * r * 0.26
      g.fillStyle = '#f6e9cb'
      g.beginPath()
      g.ellipse(fx, fy, r * 0.6, r * 0.46, a, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(206,176,126,0.75)'
      for (let k = 0; k < 5; k++) {
        const ha = a + k * 1.9
        g.beginPath()
        g.ellipse(fx + Math.cos(ha) * r * 0.26, fy + Math.sin(ha) * r * 0.2, r * 0.07, r * 0.05, ha, 0, TAU)
        g.fill()
      }
    } else {
      if (baked > 0.1) {
        g.fillStyle = `rgba(255,250,236,${0.2 * baked})`
        g.beginPath()
        g.ellipse(x - r * 0.1, y - r * 0.12, r * 0.6, r * 0.28, p.phase * 0.2 - 0.4, 0, TAU)
        g.fill()
      }
      g.fillStyle = `rgba(255,255,250,${baked > 0.1 ? 0.12 : 0.16 + 0.24 * p.smooth})`
      g.beginPath()
      g.ellipse(x - r * 0.3 * sx, y - r * 0.4 * sy, r * 0.4, r * 0.16, -0.42, 0, TAU)
      g.fill()
    }
    for (const seed of p.seeds) seedShape(g, x + seed.ox * s * sx, y + seed.oy * s * sy, seed.kind, seed.rot, 1.1)
    return
  }
  const r = p.thick * s * (1 + p.wob * 0.3)
  ropePath(g, p.nodes, 3, 6 + p.rise * 2)
  g.strokeStyle = 'rgba(92,58,28,0.2)'
  g.lineWidth = r * 2 + 3
  g.stroke()
  ropePath(g, p.nodes, 0, 0)
  g.strokeStyle = css(col.line)
  g.lineWidth = r * 2 + 4.6
  g.stroke()
  g.strokeStyle = css(col.base)
  g.lineWidth = r * 2
  g.stroke()
  // Shade underneath and a light along the top, so it reads as round.
  ropePath(g, p.nodes, r * 0.12, r * 0.3)
  g.strokeStyle = css(col.dark, 0.5)
  g.lineWidth = r * 1.25
  g.stroke()
  ropePath(g, p.nodes, 0, 0)
  g.strokeStyle = css(col.base)
  g.lineWidth = r * 1.3
  g.stroke()
  ropePath(g, p.nodes, -r * 0.2, -r * 0.34)
  g.strokeStyle = css(col.light, 0.75)
  g.lineWidth = r * 0.5
  g.stroke()
  if (p.twist > 0.02) {
    // Twisted like a plait: fat lobes lying aslant along the rope.
    g.globalAlpha = Math.min(1, p.twist)
    g.lineWidth = 2.2
    for (let i = 1; i < p.nodes.length - 1; i += 2) {
      const a = p.nodes[i - 1]!
      const b = p.nodes[i + 1]!
      const m = p.nodes[i]!
      const slant = Math.atan2(b.y - a.y, b.x - a.x) + 0.72
      g.beginPath()
      g.ellipse(m.x, m.y, r * 1.08, r * 0.66, slant, 0, TAU)
      g.fillStyle = css(col.base)
      g.fill()
      g.strokeStyle = css(col.line, 0.85)
      g.stroke()
      g.beginPath()
      g.ellipse(m.x - r * 0.16, m.y - r * 0.26, r * 0.5, r * 0.17, slant, 0, TAU)
      g.fillStyle = css(col.light, 0.7)
      g.fill()
    }
    g.globalAlpha = 1
  }
  for (const seed of p.seeds) {
    const node = p.nodes[Math.min(seed.i, p.nodes.length - 1)]!
    seedShape(g, node.x + seed.ox, node.y + seed.oy, seed.kind, seed.rot, 1.1)
  }
}
