// The one material everything here is made of: carded wool. Strands, soft
// washes of fleece, and plump needle-felted shapes with fuzzy edges. Nothing
// in this file draws a hard outline.

export type G = CanvasRenderingContext2D
export type RGB = readonly [number, number, number]

export const TAU = Math.PI * 2

// Cached art is drawn at this many canvas pixels per logical pixel. Set once
// inside `create`, from the device pixel ratio.
let RES = 1
export function setRes(r: number): void {
  RES = r
}
export function res(): number {
  return RES
}

export function makeCanvas(w: number, h: number): [HTMLCanvasElement, G] {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.ceil(w))
  c.height = Math.max(1, Math.ceil(h))
  return [c, c.getContext('2d')!]
}

// A cached sprite, drawn at RES and used at its logical size.
export interface Sprite {
  canvas: HTMLCanvasElement
  w: number
  h: number
}

export function sprite(w: number, h: number, paint: (g: G) => void, scale = RES): Sprite {
  const [canvas, g] = makeCanvas(w * scale, h * scale)
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  paint(g)
  return { canvas, w, h }
}

// Centred on (x, y), with an optional turn and stretch.
export function put(g: G, s: Sprite, x: number, y: number, rot = 0, sx = 1, sy = sx): void {
  if (rot === 0) {
    g.drawImage(s.canvas, x - (s.w * sx) / 2, y - (s.h * sy) / 2, s.w * sx, s.h * sy)
    return
  }
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.drawImage(s.canvas, (-s.w * sx) / 2, (-s.h * sy) / 2, s.w * sx, s.h * sy)
  g.restore()
}

export function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Roughly normal, -1..1 most of the time.
export function gauss(rand: () => number): number {
  return (rand() + rand() + rand() + rand() - 2) / 1.2
}

export function rgba(c: RGB, a = 1): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
}

export function mix(a: RGB, b: RGB, t: number): RGB {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

const WHITE: RGB = [255, 250, 240]
const DARK: RGB = [44, 34, 40]

// k above 0 lightens toward warm white, below 0 darkens toward a warm dark.
export function shade(c: RGB, k: number): RGB {
  return k >= 0 ? mix(c, WHITE, k) : mix(c, DARK, -k)
}

// The strand colours of one carded fleece: the dye, lighter and darker, and a
// few strands of something else that went through the carders with it.
export function tones(c: RGB, flecks: readonly RGB[] = [], spread = 0.2): string[] {
  const out: string[] = []
  for (const k of [-1, -0.6, -0.3, 0, 0, 0.3, 0.6, 1]) out.push(rgba(shade(c, k * spread)))
  for (const f of flecks) out.push(rgba(f))
  return out
}

// One curved strand through (x, y).
export function strand(g: G, x: number, y: number, ang: number, len: number, bend: number): void {
  const dx = Math.cos(ang) * len * 0.5
  const dy = Math.sin(ang) * len * 0.5
  g.beginPath()
  g.moveTo(x - dx, y - dy)
  g.quadraticCurveTo(x - Math.sin(ang) * bend, y + Math.cos(ang) * bend, x + dx, y + dy)
  g.stroke()
}

export interface StrandOptions {
  count: number
  colors: readonly string[]
  len: readonly [number, number]
  width?: readonly [number, number]
  alpha?: readonly [number, number]
  // The way the fleece was laid, and how far strands stray from it.
  angle?: number
  spread?: number
  bend?: number
  // Only strands whose middle passes this test are drawn.
  inside?: (x: number, y: number) => boolean
}

// Strands scattered evenly over a rectangle.
export function strands(g: G, rand: () => number, x: number, y: number, w: number, h: number, o: StrandOptions): void {
  const width = o.width ?? [0.6, 1.3]
  const alpha = o.alpha ?? [0.12, 0.4]
  const spread = o.spread ?? 0.4
  const bend = o.bend ?? 0.2
  for (let i = 0; i < o.count; i++) {
    const px = x + rand() * w
    const py = y + rand() * h
    if (o.inside && !o.inside(px, py)) continue
    const len = o.len[0] + rand() * (o.len[1] - o.len[0])
    g.strokeStyle = o.colors[Math.floor(rand() * o.colors.length)]
    g.globalAlpha = alpha[0] + rand() * (alpha[1] - alpha[0])
    g.lineWidth = width[0] + rand() * (width[1] - width[0])
    strand(g, px, py, (o.angle ?? 0) + gauss(rand) * spread, len, gauss(rand) * len * bend)
  }
  g.globalAlpha = 1
}

// A soft round wash, the way a thin layer of fleece tints what is under it.
export function wash(g: G, x: number, y: number, rx: number, ry: number, c: RGB, alpha: number, rot = 0): void {
  const grad = g.createRadialGradient(0, 0, 0, 0, 0, 1)
  grad.addColorStop(0, rgba(c, alpha))
  grad.addColorStop(0.55, rgba(c, alpha * 0.55))
  grad.addColorStop(1, rgba(c, 0))
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(rx, ry)
  g.fillStyle = grad
  g.beginPath()
  g.arc(0, 0, 1, 0, TAU)
  g.fill()
  g.restore()
}

export interface FeltOptions {
  // How soft the edge is, in logical pixels.
  soft?: number
  // Strands per 100 square pixels.
  density?: number
  len?: readonly [number, number]
  angle?: number
  spread?: number
  // 0..1: how round and raised it looks.
  plump?: number
  // Drop shadow under it; 0 for none.
  lift?: number
  flecks?: readonly RGB[]
  // How far loose strands stand out past the edge.
  fuzz?: number
  alpha?: number
}

export interface Box {
  x: number
  y: number
  w: number
  h: number
}

// A needle-felted piece: a soft-edged body of one fleece, lit from the upper
// left, covered in its own strands, with loose ones standing out past the edge.
export function felted(g: G, path: Path2D, box: Box, color: RGB, rand: () => number, o: FeltOptions = {}): void {
  const soft = o.soft ?? 3
  const plump = o.plump ?? 0.5
  const lift = o.lift ?? 4
  const len = o.len ?? [7, 20]
  const fuzz = o.fuzz ?? 1
  const pad = Math.ceil(soft * 3 + len[1] + 8)
  const [tc, t] = makeCanvas((box.w + pad * 2) * RES, (box.h + pad * 2) * RES)
  const dx = pad - box.x
  const dy = pad - box.y
  t.setTransform(RES, 0, 0, RES, dx * RES, dy * RES)
  t.lineCap = 'round'

  // The body: only the blurred shadow of the shape is kept, so no edge is hard.
  const far = 4000
  for (let pass = 0; pass < 2; pass++) {
    t.save()
    t.shadowColor = rgba(color)
    t.shadowBlur = soft * RES * (pass === 0 ? 1 : 0.45)
    t.shadowOffsetX = far * RES
    t.translate(-far, 0)
    t.fillStyle = '#000'
    t.fill(path)
    t.restore()
  }

  // Light and weight, only where there is wool.
  t.globalCompositeOperation = 'source-atop'
  const lightGrad = t.createLinearGradient(box.x, box.y, box.x + box.w * 0.35, box.y + box.h)
  lightGrad.addColorStop(0, `rgba(255,248,232,${0.34 * plump})`)
  lightGrad.addColorStop(0.45, 'rgba(255,248,232,0)')
  lightGrad.addColorStop(0.6, 'rgba(50,30,40,0)')
  lightGrad.addColorStop(1, `rgba(50,30,40,${0.36 * plump})`)
  t.fillStyle = lightGrad
  t.fillRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2)

  const colors = tones(color, o.flecks ?? [], 0.24)
  const hit = (px: number, py: number) => t.isPointInPath(path, (px + dx) * RES, (py + dy) * RES)
  const area = box.w * box.h
  const count = Math.round((area / 100) * (o.density ?? 9))
  strands(t, rand, box.x, box.y, box.w, box.h, {
    count,
    colors,
    len,
    angle: o.angle ?? 0,
    spread: o.spread ?? 1.2,
    alpha: [0.14, 0.42],
    width: [0.5, 1.2],
    inside: hit,
  })
  // Loose strands, allowed past the edge.
  t.globalCompositeOperation = 'source-over'
  if (fuzz > 0) {
    strands(t, rand, box.x, box.y, box.w, box.h, {
      count: Math.round(count * 0.3 * fuzz),
      colors,
      len: [len[0] * 0.8, len[1] * 1.1],
      angle: o.angle ?? 0,
      spread: o.spread ?? 1.2,
      alpha: [0.1, 0.3],
      width: [0.4, 0.9],
      inside: hit,
    })
  }

  g.save()
  g.globalAlpha = o.alpha ?? 1
  if (lift > 0) {
    g.shadowColor = 'rgba(58,40,36,0.34)'
    g.shadowBlur = lift * 1.6 * RES
    g.shadowOffsetX = lift * 0.3 * RES
    g.shadowOffsetY = lift * 0.6 * RES
  }
  g.drawImage(tc, box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2)
  g.restore()
}

// Path helpers. Every shape is a little uneven, as a hand would roll it.
export function ellipsePath(x: number, y: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D()
  p.ellipse(x, y, rx, ry, rot, 0, TAU)
  return p
}

export function roundRectPath(x: number, y: number, w: number, h: number, r: number): Path2D {
  const p = new Path2D()
  p.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  return p
}

// A closed soft shape through the given points.
export function blobPath(points: readonly (readonly [number, number])[]): Path2D {
  const p = new Path2D()
  const n = points.length
  const last = points[n - 1]
  const first = points[0]
  p.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
  for (let i = 0; i < n; i++) {
    const a = points[i]
    const b = points[(i + 1) % n]
    p.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
  }
  p.closePath()
  return p
}

export function boxOf(points: readonly (readonly [number, number])[], grow = 0): Box {
  let x0 = Infinity
  let y0 = Infinity
  let x1 = -Infinity
  let y1 = -Infinity
  for (const [x, y] of points) {
    x0 = Math.min(x0, x)
    y0 = Math.min(y0, y)
    x1 = Math.max(x1, x)
    y1 = Math.max(y1, y)
  }
  return { x: x0 - grow, y: y0 - grow, w: x1 - x0 + grow * 2, h: y1 - y0 + grow * 2 }
}

// A felted piece from a list of points, the common case.
export function feltBlob(g: G, points: readonly (readonly [number, number])[], color: RGB, rand: () => number, o: FeltOptions = {}): void {
  felted(g, blobPath(points), boxOf(points, 2), color, rand, o)
}

export function feltEllipse(g: G, x: number, y: number, rx: number, ry: number, color: RGB, rand: () => number, o: FeltOptions = {}, rot = 0): void {
  const r = Math.max(rx, ry)
  felted(g, ellipsePath(x, y, rx, ry, rot), { x: x - r, y: y - r, w: r * 2, h: r * 2 }, color, rand, o)
}
