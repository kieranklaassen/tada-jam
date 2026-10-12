import { makeRng, type Rng } from './rng'

// The wax crayon. Every picture in the game is made here from three things:
// a scribble (back-and-forth strokes that fill a shape and leave streaks of
// paper between them), a pressed line (the same hue pushed harder), and the
// tooth of the paper, which takes specks back out of whatever was drawn so
// the sheet shows through. Shapes get a dry, broken edge instead of a clean
// one. There is no opaque fill, no ink line and no light.
//
// This file needs a browser canvas. It is the look only: no rule of the game
// reads it, and the view reaches it through the pen (pen.ts).

export type Ink = readonly [number, number, number]

/** The box of crayons. Paper is the sheet itself. */
export const INK = {
  paper: [252, 249, 242],
  soil: [104, 96, 134],
  soilDark: [74, 68, 104],
  grass: [126, 176, 82],
  grassDark: [84, 136, 70],
  moss: [158, 190, 96],
  sky: [176, 212, 236],
  bark: [146, 104, 72],
  barkDark: [104, 70, 50],
  farBark: [198, 178, 172],
  orange: [240, 138, 48],
  red: [218, 72, 56],
  yellow: [248, 204, 56],
  gold: [232, 170, 44],
  olive: [170, 168, 62],
  lime: [200, 216, 84],
  leafGreen: [112, 164, 70],
  cream: [246, 236, 212],
  birch: [250, 244, 230],
  tan: [226, 196, 140],
  nut: [176, 126, 76],
  nutDark: [122, 82, 52],
  white: [255, 253, 248],
  cloud: [214, 230, 246],
  cloudEdge: [124, 160, 212],
  pink: [246, 150, 160],
  blush: [236, 96, 110],
  toad: [128, 152, 70],
  toadDark: [82, 108, 56],
  belly: [226, 222, 150],
  fern: [58, 128, 84],
  fernDark: [38, 96, 70],
  dark: [44, 36, 52],
  shade: [92, 84, 122],
  glow: [255, 226, 96],
  gust: [150, 190, 232],
  mushroom: [224, 78, 62],
} as const satisfies Record<string, Ink>

export type InkName = keyof typeof INK

export function rgba(ink: Ink, alpha: number): string {
  return `rgba(${ink[0]},${ink[1]},${ink[2]},${alpha})`
}

export type Stroke = {
  /** The way the strokes run, in radians. */
  angle: number
  /** Stage units from one stroke to the next, and how thick a stroke is. A gap wider than the stroke leaves paper. */
  gap: number
  width: number
  alpha: number
}

export class Wax {
  readonly ctx: CanvasRenderingContext2D
  private readonly rng: Rng
  private readonly tooth: CanvasPattern
  private readonly edge: CanvasPattern

  constructor(ctx: CanvasRenderingContext2D, seed: number, tooth: CanvasPattern, edge: CanvasPattern) {
    this.ctx = ctx
    this.rng = makeRng(seed)
    this.tooth = tooth
    this.edge = edge
  }

  /** A number from -1 to 1, for a hand that never draws the same line twice. */
  jitter(): number {
    return this.rng.next() * 2 - 1
  }

  /** Fills a shape with back-and-forth strokes. `box` is the shape's middle and its reach. */
  scribble(shape: Path2D, box: { x: number; y: number; r: number }, ink: Ink, stroke: Stroke): void {
    const ctx = this.ctx
    ctx.save()
    ctx.clip(shape)
    ctx.translate(box.x, box.y)
    ctx.rotate(stroke.angle + this.jitter() * 0.05)
    ctx.strokeStyle = rgba(ink, stroke.alpha)
    ctx.lineWidth = stroke.width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    const r = box.r + stroke.width
    let side = 1, first = true
    for (let y = -r; y <= r; y += stroke.gap * (0.8 + this.rng.next() * 0.45)) {
      const from = -r * side, to = r * side
      if (first) { ctx.moveTo(from, y); first = false }
      else ctx.lineTo(from, y + this.jitter() * stroke.gap * 0.3)
      const pieces = Math.max(2, Math.round(r / 45))
      for (let k = 1; k <= pieces; k++) ctx.lineTo(from + ((to - from) * k) / pieces, y + this.jitter() * stroke.gap * 0.42)
      side = -side
    }
    ctx.stroke()
    ctx.restore()
  }

  /** Breaks the edge of a shape up into grain, so it ends as crayon ends on paper and not as a cut. */
  fray(shape: Path2D, width: number): void {
    const ctx = this.ctx
    ctx.save()
    ctx.globalCompositeOperation = 'destination-out'
    ctx.strokeStyle = this.edge
    ctx.lineWidth = width
    ctx.stroke(shape)
    ctx.restore()
  }

  /** A line pressed hard: drawn twice, a little apart, as a hand goes over it. `points` are x, y pairs. */
  press(points: readonly number[], ink: Ink, width: number, alpha = 0.8, closed = false): void {
    const ctx = this.ctx
    ctx.save()
    ctx.strokeStyle = rgba(ink, alpha)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    for (let pass = 0; pass < 2; pass++) {
      ctx.lineWidth = width * (pass === 0 ? 1 : 0.6)
      ctx.beginPath()
      const wobble = width * 0.35
      for (let i = 0; i < points.length; i += 2) {
        const x = points[i] + this.jitter() * wobble, y = points[i + 1] + this.jitter() * wobble
        if (i === 0) ctx.moveTo(x, y)
        else {
          // A soft bend through the point before, so a pressed line is never a ruled one.
          const px = points[i - 2], py = points[i - 1]
          ctx.quadraticCurveTo(px + (x - px) * 0.5 + this.jitter() * wobble, py + (y - py) * 0.5 + this.jitter() * wobble, x, y)
        }
      }
      if (closed) ctx.closePath()
      ctx.stroke()
    }
    ctx.restore()
  }

  /** A shape filled in one or two layers of crayon, frayed at its edge. The second layer is laid across the first. */
  fill(shape: Path2D, box: { x: number; y: number; r: number }, ink: Ink, stroke: Stroke, over?: { ink: Ink; stroke: Stroke }, fray = 3): void {
    this.scribble(shape, box, ink, stroke)
    this.scribble(shape, box, ink, { ...stroke, angle: stroke.angle + 0.5, alpha: stroke.alpha * 0.55, gap: stroke.gap * 1.3 })
    if (over) this.scribble(shape, box, over.ink, over.stroke)
    if (fray > 0) this.fray(shape, fray)
  }

  /** Takes the tooth of the paper back out of everything drawn so far. */
  grain(width: number, height: number): void {
    const ctx = this.ctx
    ctx.save()
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = this.tooth
    ctx.fillRect(0, 0, width, height)
    ctx.restore()
  }
}

/** The tooth of the paper as a tile: specks that crayon skips. `cover` is the share of the tile they take, `scale` the device pixels to a stage unit. */
export function toothTile(scale: number, cover: number, seed: number): HTMLCanvasElement {
  const size = Math.max(32, Math.round(96 * scale))
  const tile = document.createElement('canvas')
  tile.width = size; tile.height = size
  const ctx = tile.getContext('2d')!
  const rng = makeRng(seed)
  const speck = 0.75 * scale
  const count = Math.round((cover * size * size) / (Math.PI * speck * speck))
  ctx.fillStyle = '#000'
  for (let i = 0; i < count; i++) {
    const x = rng.next() * size, y = rng.next() * size, r = speck * (0.5 + rng.next() * 0.9)
    ctx.globalAlpha = 0.55 + rng.next() * 0.45
    // Drawn at the tile's edges too, so the tile repeats without a seam.
    for (const ox of [0, -size, size]) for (const oy of [0, -size, size]) {
      if (x + ox < -r || x + ox > size + r || y + oy < -r || y + oy > size + r) continue
      ctx.beginPath()
      ctx.ellipse(x + ox, y + oy, r, r * (0.6 + rng.next() * 0.5), rng.next() * 3.1, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  return tile
}

/** A closed shape through points, with every corner rounded: x, y pairs. */
export function blobPath(points: readonly number[]): Path2D {
  const path = new Path2D(), n = points.length / 2
  const mid = (i: number): [number, number] => {
    const a = (i % n) * 2, b = ((i + 1) % n) * 2
    return [(points[a] + points[b]) / 2, (points[a + 1] + points[b + 1]) / 2]
  }
  const [sx, sy] = mid(n - 1)
  path.moveTo(sx, sy)
  for (let i = 0; i < n; i++) {
    const [mx, my] = mid(i)
    path.quadraticCurveTo(points[i * 2], points[i * 2 + 1], mx, my)
  }
  path.closePath()
  return path
}

export function ellipsePath(x: number, y: number, rx: number, ry: number, turn = 0): Path2D {
  const path = new Path2D()
  path.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
  return path
}
