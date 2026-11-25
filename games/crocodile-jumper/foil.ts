// Foil. A wrapper is a fixed set of flat facets, each as bright as its tilt
// makes it in one light. A picture is baked in a few lights, and a thing that
// turns steps through them, so it flashes as it goes and is still at rest.

export type Ctx = CanvasRenderingContext2D
type Make = (width: number, height: number) => HTMLCanvasElement
const browser: Make = (width, height) => Object.assign(document.createElement('canvas'), { width, height })
let make: Make = browser
/** A test hands in canvases of its own, and null takes them back. */
export function useCanvases(other: Make | null): void { make = other ?? browser }
export const canvas = (w: number, h: number): HTMLCanvasElement => make(Math.max(1, Math.ceil(w)), Math.max(1, Math.ceil(h)))

/** Dark, middle, light: a metal's three tones. The brightest facets go to near white. */
export type Metal = readonly [string, string, string]
export const METAL = {
  croc: ['#0b4a34', '#1f9a63', '#8ee6ae'],
  dog: ['#6a3310', '#c9772a', '#ffd08a'],
  snail: ['#43246f', '#8f5cc9', '#dcb8ff'],
  seal: ['#4a5a68', '#9db0bf', '#eef6fb'],
  python: ['#7a1450', '#d8408f', '#ffb3d6'],
  sausage: ['#7c1712', '#d8402f', '#ffa08a'],
  shoe: ['#123a7d', '#2f74cf', '#9fd0ff'],
  duck: ['#9a6500', '#f0b41c', '#fff0a0'],
  ink: ['#0d1230', '#26305e', '#7f8fd0'],
  silver: ['#7b8291', '#c3cad6', '#ffffff'],
  gold: ['#7d5a14', '#cf9f3a', '#ffe9a6'],
  beak: ['#7a4a08', '#d98a1f', '#ffd58a'],
  plum: ['#3b1d3d', '#6d3a6c', '#b887b3'],
  mouse: ['#5c5560', '#978d9a', '#dcd3dd'],
  mint: ['#1f6b66', '#4fb5a8', '#bdf2e6'],
} satisfies Record<string, Metal>
export type MetalName = keyof typeof METAL

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
function mix(a: string, b: string, k: number): string {
  const p = rgb(a), q = rgb(b)
  return `#${p.map((v, i) => Math.round(v + (q[i] - v) * k).toString(16).padStart(2, '0')).join('')}`
}
/** A facet's colour for a brightness from 0 to 1. */
export function shade([dark, mid, light]: Metal, b: number): string {
  if (b < 0.45) return mix(dark, mid, Math.max(0, b) / 0.45)
  if (b < 0.82) return mix(mid, light, (b - 0.45) / 0.37)
  return mix(light, '#ffffff', Math.min(1, (b - 0.82) / 0.18) * 0.85)
}

/** The blue that bare skin goes in the cold. */
const CHILL = '#8fc4ff'
export const chilled = (m: Metal, by = 1): Metal => [mix(m[0], '#3c5fae', 0.5 * by), mix(m[1], CHILL, 0.48 * by), mix(m[2], '#eaf6ff', 0.6 * by)]

export function stream(seed: number): () => number {
  let s = (seed * 2654435761) >>> 0 || 1
  return () => { s ^= s << 13; s ^= s >>> 17; s ^= s << 5; return (s >>> 0) / 2 ** 32 }
}

export type Box = readonly [number, number, number, number]
export const LIGHTS = 3

/** Fills `path` with facets. `light` is which of the lights; `size` the middle facet's width; `round` how strongly it is lit as a swelling shape. */
export function foil(ctx: Ctx, path: Path2D, [x, y, w, h]: Box, metal: Metal, o: { seed: number; light?: number; size?: number; round?: number; edge?: number } ): void {
  const { seed, light = 0, size = 22, round = 0.42, edge = 2.6 } = o
  const rand = stream(seed), cols = Math.ceil(w / size) + 1, rows = Math.ceil(h / size) + 1
  const px: number[] = [], py: number[] = []
  for (let r = 0; r <= rows; r++) for (let c = 0; c <= cols; c++) {
    px.push(x + (c - 0.5 + (rand() - 0.5) * 0.85 + (r % 2) * 0.5) * size)
    py.push(y + (r - 0.5 + (rand() - 0.5) * 0.85) * size)
  }
  const a = light * 2.1 - 2.2, lx = Math.cos(a), ly = Math.sin(a)
  ctx.save()
  ctx.clip(path)
  ctx.lineWidth = 0.7
  const tri = (i: number, j: number, k: number): void => {
    const nx = rand() * 2 - 1, ny = rand() * 2 - 1
    const v = ((py[i] + py[j] + py[k]) / 3 - y) / h
    const b = 0.44 + (nx * lx + ny * ly) * 0.36 + (0.46 - v) * round
    ctx.fillStyle = ctx.strokeStyle = shade(metal, b)
    ctx.beginPath()
    ctx.moveTo(px[i], py[i]); ctx.lineTo(px[j], py[j]); ctx.lineTo(px[k], py[k])
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
  const n = cols + 1
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * n + c
    if (rand() < 0.5) { tri(i, i + 1, i + n); tri(i + 1, i + n + 1, i + n) } else { tri(i, i + 1, i + n + 1); tri(i, i + n + 1, i + n) }
  }
  ctx.lineJoin = 'round'
  // The turned-under edge, and a lit rim along the top of it.
  ctx.strokeStyle = metal[0]
  ctx.globalAlpha = 0.3
  ctx.lineWidth = Math.min(18, h * 0.22)
  ctx.translate(0, -h * 0.04)
  ctx.stroke(path)
  ctx.restore()
  if (edge > 0) {
    ctx.strokeStyle = metal[0]
    ctx.lineWidth = edge
    ctx.lineJoin = 'round'
    ctx.stroke(path)
  }
}

export function path(build: (p: Path2D) => void): Path2D { const p = new Path2D(); build(p); return p }
export const oval = (x: number, y: number, rx: number, ry: number, turn = 0): Path2D => path((p) => p.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2))
export const poly = (points: readonly (readonly [number, number])[]): Path2D => path((p) => { points.forEach(([x, y], i) => (i ? p.lineTo(x, y) : p.moveTo(x, y))); p.closePath() })
/** A closed soft shape through points. */
export function blob(points: readonly (readonly [number, number])[], tight = 1): Path2D {
  return path((p) => {
    const n = points.length, k = tight / 6
    for (let i = 0; i < n; i++) {
      const a = points[(i + n - 1) % n], b = points[i], c = points[(i + 1) % n], d = points[(i + 2) % n]
      if (i === 0) p.moveTo(b[0], b[1])
      p.bezierCurveTo(b[0] + (c[0] - a[0]) * k, b[1] + (c[1] - a[1]) * k, c[0] - (d[0] - b[0]) * k, c[1] - (d[1] - b[1]) * k, c[0], c[1])
    }
    p.closePath()
  })
}

/** A twist of cellophane: a fan of see-through pleats from a knot. */
export function twist(ctx: Ctx, x: number, y: number, turn: number, r: number, tint: string, spread = 1.3): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  const n = 7
  for (let i = 0; i < n; i++) {
    const a = (i / n - 0.5) * spread, b = ((i + 1) / n - 0.5) * spread, far = r * (0.86 + 0.14 * (i % 2))
    ctx.globalAlpha = i % 2 ? 0.34 : 0.55
    ctx.fillStyle = i % 3 === 1 ? '#ffffff' : tint
    ctx.beginPath()
    ctx.moveTo(0, -r * 0.06); ctx.lineTo(Math.cos(a) * far, Math.sin(a) * far); ctx.lineTo(Math.cos(b) * r, Math.sin(b) * r); ctx.lineTo(0, r * 0.06)
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

/** Dull paper: a flat with soft creases, the inside of a wrapper. */
export function paper(ctx: Ctx, p: Path2D, [x, y, w, h]: Box, base: string, seed: number, crease = 0.05): void {
  ctx.save()
  ctx.clip(p)
  ctx.fillStyle = base
  ctx.fillRect(x, y, w, h)
  const rand = stream(seed)
  for (let i = 0; i < 46; i++) {
    const cx = x + rand() * w, cy = y + rand() * h, s = 40 + rand() * 150
    ctx.globalAlpha = crease * (0.4 + rand())
    ctx.fillStyle = rand() < 0.5 ? '#ffffff' : '#2a1c38'
    ctx.beginPath()
    for (let k = 0; k < 3; k++) { const a = rand() * 6.3; ctx.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s * 0.7) }
    ctx.closePath()
    ctx.fill()
  }
  ctx.restore()
}

export type Picture = { image: HTMLCanvasElement; x: number; y: number; w: number; h: number }
/** Pictures by name, painted at the surface's density the first time each is asked for. */
export class Album {
  private readonly made = new Map<string, Picture>()
  constructor(readonly density: number) {}
  get(key: string, box: Box, paint: (ctx: Ctx) => void): Picture {
    let picture = this.made.get(key)
    if (!picture) {
      const [x, y, w, h] = box
      const image = canvas(w * this.density, h * this.density), ctx = image.getContext('2d')!
      ctx.scale(this.density, this.density)
      ctx.translate(-x, -y)
      paint(ctx)
      picture = { image, x, y, w, h }
      this.made.set(key, picture)
    }
    return picture
  }
}

/** What draws a frame, and counts it. */
export class Pen {
  tally = 0
  constructor(readonly ctx: Ctx) {}
  stamp(p: Picture): void { this.tally++; this.ctx.drawImage(p.image, p.x, p.y, p.w, p.h) }
  /** The stretch of a picture from `x` on, `w` wide, moved by `dx`, `dy`. */
  slice(p: Picture, density: number, x: number, w: number, dx: number, dy: number): void {
    if (w <= 0) return
    this.tally++
    this.ctx.drawImage(p.image, (x - p.x) * density, 0, w * density, p.image.height, x + dx, p.y + dy, w, p.h)
  }
  fill(p: Path2D, colour: string, alpha = 1): void { this.tally++; this.ctx.globalAlpha = alpha; this.ctx.fillStyle = colour; this.ctx.fill(p); this.ctx.globalAlpha = 1 }
  line(p: Path2D, colour: string, width: number, alpha = 1): void { this.tally++; this.ctx.globalAlpha = alpha; this.ctx.strokeStyle = colour; this.ctx.lineWidth = width; this.ctx.lineCap = 'round'; this.ctx.lineJoin = 'round'; this.ctx.stroke(p); this.ctx.globalAlpha = 1 }
  at(x: number, y: number, draw: () => void, turn = 0, sx = 1, sy = sx): void {
    const c = this.ctx
    c.save()
    c.translate(x, y)
    if (turn) c.rotate(turn)
    if (sx !== 1 || sy !== 1) c.scale(sx, sy)
    draw()
    c.restore()
  }
}
