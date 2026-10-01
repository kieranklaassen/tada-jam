// Hair for the salon: every strand is a short chain pinned to the head. It is
// pulled toward its rest shape by a spring that weakens as the strand gets
// longer, so short hair stands up and twangs and long hair hangs and swings.

import { TAU, clamp } from '../../kit/math.ts'

export type HairStyle = 'lock' | 'curl' | 'spike'

export const SEGS = 4
export const NODES = SEGS + 1
// Fixed physics step, so hair droops the same at 60 and 120 Hz.
export const HAIR_STEP = 1 / 120

export interface Strand {
  // Root and rest direction in head-local coordinates.
  lx: number
  ly: number
  dx: number
  dy: number
  base: number
  max: number
  len: number
  px: number[]
  py: number[]
  ox: number[]
  oy: number[]
  // Natural and current colour of each segment, root to tip.
  nat: string[]
  col: string[]
  front: boolean
  width: number
  phase: number
  cutAt: number
  maxed: boolean
  // Pentatonic step, for strands that ring when plucked.
  note: number
}

export interface HeadPose {
  x: number
  y: number
  cos: number
  sin: number
  sx: number
  sy: number
}

export interface Blower {
  x: number
  y: number
  r: number
  power: number
}

export interface HairFeel {
  stiff: number
  grav: number
  drag: number
  // How much hair grown past its natural length arcs over and hangs.
  droop: number
}

// What a cut hands back: where the loose end is and how it lies.
export interface Snip {
  x: number
  y: number
  angle: number
  len: number
  color: string
}

export function makeStrand(lx: number, ly: number, dx: number, dy: number, base: number, front: boolean, width: number, nat: string[], note: number): Strand {
  const d = Math.hypot(dx, dy) || 1
  return {
    lx,
    ly,
    dx: dx / d,
    dy: dy / d,
    base,
    max: Math.min(330, base * 2.8),
    len: base,
    px: new Array<number>(NODES).fill(0),
    py: new Array<number>(NODES).fill(0),
    ox: new Array<number>(NODES).fill(0),
    oy: new Array<number>(NODES).fill(0),
    nat,
    col: nat.slice(),
    front,
    width,
    phase: Math.random() * TAU,
    cutAt: -100,
    maxed: false,
    note,
  }
}

function rootX(s: Strand, p: HeadPose): number {
  return p.x + s.lx * p.sx * p.cos - s.ly * p.sy * p.sin
}
function rootY(s: Strand, p: HeadPose): number {
  return p.y + s.lx * p.sx * p.sin + s.ly * p.sy * p.cos
}

// Lay the strand out at rest (a new animal, no velocity).
export function placeStrand(s: Strand, p: HeadPose): void {
  const rx = rootX(s, p)
  const ry = rootY(s, p)
  const tx = s.dx * p.cos - s.dy * p.sin
  const ty = s.dx * p.sin + s.dy * p.cos
  const seg = s.len / SEGS
  for (let i = 0; i < NODES; i++) {
    s.px[i] = s.ox[i] = rx + tx * seg * i
    s.py[i] = s.oy[i] = ry + ty * seg * i
  }
}

export function stepStrand(s: Strand, p: HeadPose, feel: HairFeel, time: number, blowers: readonly Blower[]): void {
  const h = HAIR_STEP
  const rx = rootX(s, p)
  const ry = rootY(s, p)
  const seg = s.len / SEGS
  const ratio = s.base / Math.max(s.len, 24)
  const k = feel.stiff * clamp(ratio ** 1.2, 0.3, 2.2)
  const droop = clamp(s.len / s.base - 1, 0, 2) * feel.droop
  const side = s.lx >= 0 ? 1 : -1
  const sway = Math.sin(time * 1.5 + s.phase) * 0.07
  const c = Math.cos(sway)
  const sn = Math.sin(sway)
  const bx = s.dx * p.cos - s.dy * p.sin
  const by = s.dx * p.sin + s.dy * p.cos
  const tx = bx * c - by * sn
  const ty = bx * sn + by * c
  s.px[0] = s.ox[0] = rx
  s.py[0] = s.oy[0] = ry
  // The rest shape: straight when short, arcing outward and down when long.
  let gx = rx
  let gy = ry
  for (let i = 1; i < NODES; i++) {
    const bend = droop * (i / SEGS)
    const ux = tx + side * bend * 0.3
    const uy = ty + bend
    const ul = Math.hypot(ux, uy) || 1
    gx += (ux / ul) * seg
    gy += (uy / ul) * seg
    let x = s.px[i]!
    let y = s.py[i]!
    const vx = (x - s.ox[i]!) * feel.drag
    const vy = (y - s.oy[i]!) * feel.drag
    s.ox[i] = x
    s.oy[i] = y
    let ax = 0
    let ay = feel.grav
    for (const b of blowers) {
      const ex = x - b.x
      const ey = y - b.y
      const d = Math.hypot(ex, ey)
      if (d < b.r && d > 1) {
        const f = (b.power * (1 - d / b.r)) / d
        // A little flutter so blown hair flaps instead of freezing.
        const flap = 1 + 0.35 * Math.sin(time * 34 + s.phase * 3 + i)
        ax += ex * f * flap
        ay += ey * f * flap
      }
    }
    x += vx + ax * h * h
    y += vy + ay * h * h
    const pull = 1 - Math.exp(-k * h * (1 - 0.1 * i))
    x += (gx - x) * pull
    y += (gy - y) * pull
    // Follow the leader: keep the segment its length.
    const qx = x - s.px[i - 1]!
    const qy = y - s.py[i - 1]!
    const d = Math.hypot(qx, qy) || 1
    s.px[i] = s.px[i - 1]! + (qx / d) * seg
    s.py[i] = s.py[i - 1]! + (qy / d) * seg
  }
}

// Throw the whole strand away from a point (a sneeze, a pluck).
export function kickStrand(s: Strand, x: number, y: number, amount: number): void {
  for (let i = 1; i < NODES; i++) {
    const ex = s.px[i]! - x
    const ey = s.py[i]! - y
    const d = Math.hypot(ex, ey) || 1
    s.px[i] = s.px[i]! + (ex / d) * amount * (i / SEGS)
    s.py[i] = s.py[i]! + (ey / d) * amount * (i / SEGS)
  }
}

function segDist(px: number, py: number, ax: number, ay: number, bx: number, by: number): [number, number] {
  const vx = bx - ax
  const vy = by - ay
  const l2 = vx * vx + vy * vy
  const u = l2 > 0 ? clamp(((px - ax) * vx + (py - ay) * vy) / l2, 0, 1) : 0
  return [Math.hypot(px - (ax + vx * u), py - (ay + vy * u)), u]
}

// How far along the strand (in pixels from the root) the finger touches it,
// or -1 when it does not.
export function touchAt(s: Strand, x: number, y: number, r: number): number {
  const seg = s.len / SEGS
  const reach = r + s.width * 0.4
  for (let i = 0; i < SEGS; i++) {
    const [d, u] = segDist(x, y, s.px[i]!, s.py[i]!, s.px[i + 1]!, s.py[i + 1]!)
    if (d < reach) return (i + u) * seg
  }
  return -1
}

// Shorten to `newLen`, keeping the part that is left where it was.
function shorten(s: Strand, newLen: number): void {
  const oldSeg = s.len / SEGS
  const newSeg = newLen / SEGS
  const nx: number[] = []
  const ny: number[] = []
  const nc: string[] = []
  for (let j = 0; j < NODES; j++) {
    const at = oldSeg > 0 ? (j * newSeg) / oldSeg : 0
    const i = Math.min(SEGS - 1, Math.floor(at))
    const f = at - i
    nx.push(s.px[i]! + (s.px[i + 1]! - s.px[i]!) * f)
    ny.push(s.py[i]! + (s.py[i + 1]! - s.py[i]!) * f)
  }
  for (let j = 0; j < SEGS; j++) {
    const at = oldSeg > 0 ? ((j + 0.5) * newSeg) / oldSeg : 0
    nc.push(s.col[Math.min(SEGS - 1, Math.floor(at))]!)
  }
  for (let j = 0; j < NODES; j++) {
    s.px[j] = s.ox[j] = nx[j]!
    s.py[j] = s.oy[j] = ny[j]!
  }
  s.col = nc
  s.len = newLen
  s.maxed = false
}

// Cut the strand where the finger crosses it. `toStub` cuts at the root
// whatever part is touched (the shaver).
export function cutStrand(s: Strand, x: number, y: number, r: number, stub: number, toStub: boolean): Snip | null {
  if (s.len <= stub + 5) return null
  const at = touchAt(s, x, y, r)
  if (at < 0) return null
  const newLen = toStub ? stub : Math.max(stub, at)
  const removed = s.len - newLen
  if (removed < 7) return null
  const seg = s.len / SEGS
  const cutAt = newLen / seg
  const i = Math.min(SEGS - 1, Math.floor(cutAt))
  const f = cutAt - i
  const cx = s.px[i]! + (s.px[i + 1]! - s.px[i]!) * f
  const cy = s.py[i]! + (s.py[i + 1]! - s.py[i]!) * f
  const tx = s.px[SEGS]!
  const ty = s.py[SEGS]!
  const snip: Snip = { x: (cx + tx) / 2, y: (cy + ty) / 2, angle: Math.atan2(ty - cy, tx - cx), len: removed, color: s.col[SEGS - 1]! }
  shorten(s, newLen)
  return snip
}

export function paintStrand(s: Strand, x: number, y: number, r: number, color: string): number {
  let changed = 0
  const reach = r + s.width * 0.4
  for (let i = 0; i < SEGS; i++) {
    if (s.col[i] === color) continue
    const [d] = segDist(x, y, s.px[i]!, s.py[i]!, s.px[i + 1]!, s.py[i + 1]!)
    if (d < reach) {
      s.col[i] = color
      changed++
    }
  }
  return changed
}

// Darker outline for any hex colour, cached.
const outlines = new Map<string, string>()
export function outlineOf(hex: string): string {
  let out = outlines.get(hex)
  if (out) return out
  const n = parseInt(hex.slice(1), 16)
  const r = Math.round(((n >> 16) & 255) * 0.55)
  const g = Math.round(((n >> 8) & 255) * 0.5)
  const b = Math.round((n & 255) * 0.58)
  out = `rgb(${r},${g},${b})`
  outlines.set(hex, out)
  return out
}

// Smoothed centre line: the five nodes plus a Catmull-Rom point between each.
const SUB = SEGS * 2
const qx = new Array<number>(SUB + 1).fill(0)
const qy = new Array<number>(SUB + 1).fill(0)
function smooth(s: Strand): void {
  for (let i = 0; i < NODES; i++) {
    qx[i * 2] = s.px[i]!
    qy[i * 2] = s.py[i]!
  }
  for (let i = 0; i < SEGS; i++) {
    const a = Math.max(0, i - 1)
    const d = Math.min(SEGS, i + 2)
    qx[i * 2 + 1] = (-s.px[a]! + 9 * s.px[i]! + 9 * s.px[i + 1]! - s.px[d]!) / 16
    qy[i * 2 + 1] = (-s.py[a]! + 9 * s.py[i]! + 9 * s.py[i + 1]! - s.py[d]!) / 16
  }
}

function drawLock(g: CanvasRenderingContext2D, s: Strand): void {
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(qx[0]!, qy[0]!)
  for (let m = 1; m <= SUB; m++) g.lineTo(qx[m]!, qy[m]!)
  g.lineWidth = s.width + 7
  g.strokeStyle = outlineOf(s.col[0]!)
  g.stroke()
  let i = 0
  while (i < SEGS) {
    let j = i
    while (j + 1 < SEGS && s.col[j + 1] === s.col[i]) j++
    g.beginPath()
    g.moveTo(qx[i * 2]!, qy[i * 2]!)
    for (let m = i * 2 + 1; m <= (j + 1) * 2; m++) g.lineTo(qx[m]!, qy[m]!)
    g.lineWidth = s.width
    g.strokeStyle = s.col[i]!
    g.stroke()
    i = j + 1
  }
  // A thin shine down the root half, so locks read as glossy, not flat.
  g.beginPath()
  g.moveTo(qx[1]!, qy[1]!)
  for (let m = 2; m <= 4; m++) g.lineTo(qx[m]!, qy[m]!)
  g.lineWidth = s.width * 0.22
  g.strokeStyle = 'rgba(255,255,255,0.28)'
  g.stroke()
}

function along(d: number, len: number): [number, number] {
  const at = clamp((d / Math.max(1, len)) * SUB, 0, SUB - 0.0001)
  const i = Math.floor(at)
  const f = at - i
  return [qx[i]! + (qx[i + 1]! - qx[i]!) * f, qy[i]! + (qy[i + 1]! - qy[i]!) * f]
}

function drawCurl(g: CanvasRenderingContext2D, s: Strand): void {
  const r = s.width / 2
  const count = Math.max(1, Math.ceil(s.len / (r * 1.25)))
  g.beginPath()
  for (let n = 1; n <= count; n++) {
    const [x, y] = along((n / count) * s.len, s.len)
    g.moveTo(x + r + 3.5, y)
    g.arc(x, y, r + 3.5, 0, TAU)
  }
  g.fillStyle = outlineOf(s.col[0]!)
  g.fill()
  for (let i = 0; i < SEGS; i++) {
    let any = false
    for (let n = 1; n <= count; n++) {
      const seg = Math.min(SEGS - 1, Math.floor(((n - 0.5) / count) * SEGS))
      if (seg !== i) continue
      if (!any) {
        g.beginPath()
        any = true
      }
      const [x, y] = along((n / count) * s.len, s.len)
      const wob = 1 + 0.12 * Math.sin(n * 2.1 + s.phase)
      g.moveTo(x + r * wob, y)
      g.arc(x, y, r * wob, 0, TAU)
    }
    if (any) {
      g.fillStyle = s.col[i]!
      g.fill()
    }
  }
}

function drawSpike(g: CanvasRenderingContext2D, s: Strand): void {
  const half = s.width / 2
  // Normals along the centre line.
  const lx: number[] = []
  const ly: number[] = []
  const rx: number[] = []
  const ry: number[] = []
  for (let m = 0; m <= SUB; m++) {
    const a = Math.max(0, m - 1)
    const b = Math.min(SUB, m + 1)
    const tx = qx[b]! - qx[a]!
    const ty = qy[b]! - qy[a]!
    const d = Math.hypot(tx, ty) || 1
    const w = half * (1 - (m / SUB) * 0.94)
    lx.push(qx[m]! - (ty / d) * w)
    ly.push(qy[m]! + (tx / d) * w)
    rx.push(qx[m]! + (ty / d) * w)
    ry.push(qy[m]! - (tx / d) * w)
  }
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(lx[0]!, ly[0]!)
  for (let m = 1; m <= SUB; m++) g.lineTo(lx[m]!, ly[m]!)
  for (let m = SUB; m >= 0; m--) g.lineTo(rx[m]!, ry[m]!)
  g.closePath()
  g.lineWidth = 6
  g.strokeStyle = outlineOf(s.col[0]!)
  g.stroke()
  let i = 0
  while (i < SEGS) {
    let j = i
    while (j + 1 < SEGS && s.col[j + 1] === s.col[i]) j++
    g.beginPath()
    g.moveTo(lx[i * 2]!, ly[i * 2]!)
    for (let m = i * 2 + 1; m <= (j + 1) * 2; m++) g.lineTo(lx[m]!, ly[m]!)
    for (let m = (j + 1) * 2; m >= i * 2; m--) g.lineTo(rx[m]!, ry[m]!)
    g.closePath()
    g.fillStyle = s.col[i]!
    g.fill()
    i = j + 1
  }
}

export function drawStrand(g: CanvasRenderingContext2D, s: Strand, style: HairStyle): void {
  smooth(s)
  if (style === 'curl') drawCurl(g, s)
  else if (style === 'spike') drawSpike(g, s)
  else drawLock(g, s)
}

// A loose clipping, in its own coordinates (centred, lying along x).
export function drawClip(g: CanvasRenderingContext2D, style: HairStyle, len: number, width: number, color: string): void {
  if (style === 'curl') {
    const r = width / 2
    g.beginPath()
    g.arc(0, 0, r + 3, 0, TAU)
    g.fillStyle = outlineOf(color)
    g.fill()
    g.beginPath()
    g.arc(0, 0, r, 0, TAU)
    g.fillStyle = color
    g.fill()
    return
  }
  if (style === 'spike') {
    g.beginPath()
    g.moveTo(-len / 2, -width * 0.3)
    g.lineTo(len / 2, 0)
    g.lineTo(-len / 2, width * 0.3)
    g.closePath()
    g.lineJoin = 'round'
    g.lineWidth = 5
    g.strokeStyle = outlineOf(color)
    g.stroke()
    g.fillStyle = color
    g.fill()
    return
  }
  g.lineCap = 'round'
  const half = Math.max(1, len / 2 - width * 0.3)
  g.beginPath()
  g.moveTo(-half, 0)
  g.quadraticCurveTo(0, width * 0.5, half, 0)
  g.lineWidth = width * 0.8 + 5
  g.strokeStyle = outlineOf(color)
  g.stroke()
  g.lineWidth = width * 0.8
  g.strokeStyle = color
  g.stroke()
}
