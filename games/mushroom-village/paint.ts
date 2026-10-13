import type { Point } from './input'
import { makeRng, type Rng } from './rng'

// Poster paint on sugar paper: thick opaque paint laid with a fat brush. No
// outline anywhere. A shape is a wobbly filled blob with the ridges the
// bristles left in it, a bead of thicker paint along one edge, and here and
// there a drip; where two wet colours met, one has run into the other; and
// the rough paper shows wherever the brush did not go.
// Everything here paints once, into a sprite or the backdrop. Nothing in this
// file runs in a frame.

export type Ctx = CanvasRenderingContext2D

/** One pot of paint: its colour, and that colour where the ridges catch the light and where they shade. */
export type Pot = { base: string; light: string; dark: string }

export function pot(base: string, light: string, dark: string): Pot {
  return { base, light, dark }
}

export type BlobOptions = {
  /** How far the edge wanders, in units. */
  wobble?: number
  /** The direction the brush went, in radians: the ridges lie along it. */
  along?: number
  /** How strongly the ridges show, 0 to 1. */
  ridges?: number
  /** How many drips hang from the lower edge. */
  drips?: number
  /** No bead of thick paint at the edge: for a dab too small to have one. */
  flat?: boolean
  /** The brush ran dry at the end of its pass: streaks of this colour, the paper's, show through there. */
  dry?: string
}

/** A closed smooth curve through points, as a path on `ctx`. */
export function trace(ctx: Ctx, points: readonly Point[]): void {
  const n = points.length
  ctx.beginPath()
  const last = points[n - 1], first = points[0]
  ctx.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2)
  for (let i = 0; i < n; i++) {
    const p = points[i], q = points[(i + 1) % n]
    ctx.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
  }
  ctx.closePath()
}

/** The points moved a little, each by its own amount: a hand does not paint a true edge. */
export function wobbled(points: readonly Point[], rng: Rng, amount: number): Point[] {
  return points.map((p) => ({ x: p.x + (rng.next() - 0.5) * 2 * amount, y: p.y + (rng.next() - 0.5) * 2 * amount }))
}

export function ellipse(cx: number, cy: number, rx: number, ry: number, count = 14, turn = 0): Point[] {
  return Array.from({ length: count }, (_, i) => {
    const a = (i / count) * Math.PI * 2 + turn
    return { x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry }
  })
}

/** One pass of a fat brush from `a` to `b`: a band with round ends, a little wider in the middle, bowed by `bow` units. */
export function band(a: Point, b: Point, width: number, bow = 0, steps = 6): Point[] {
  const dx = b.x - a.x, dy = b.y - a.y, length = Math.hypot(dx, dy) || 1
  const nx = -dy / length, ny = dx / length, tx = dx / length, ty = dy / length
  const side = (sign: 1 | -1): Point[] => Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps, swell = 0.82 + 0.18 * Math.sin(t * Math.PI), sag = Math.sin(t * Math.PI) * bow
    return { x: a.x + dx * t + nx * (sign * width * 0.5 * swell + sag), y: a.y + dy * t + ny * (sign * width * 0.5 * swell + sag) }
  })
  const cap = width * 0.42
  return [...side(1), { x: b.x + tx * cap, y: b.y + ty * cap }, ...side(-1).reverse(), { x: a.x - tx * cap, y: a.y - ty * cap }]
}

function bounds(points: readonly Point[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of points) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
  return { x0, y0, x1, y1 }
}

/** Paints one blob of thick paint: the fill, the bristle ridges, the bead at the edge and the drips. */
export function blob(ctx: Ctx, shape: readonly Point[], paint: Pot, rng: Rng, options: BlobOptions = {}): void {
  const wobble = options.wobble ?? 2.5, along = options.along ?? 0, strength = options.ridges ?? 1
  const points = wobble > 0 ? wobbled(shape, rng, wobble) : [...shape]
  const box = bounds(points)
  const size = Math.max(box.x1 - box.x0, box.y1 - box.y0)

  // Drips first, so the blob's own edge lies over where they start.
  const drips = options.drips ?? 0
  for (let i = 0; i < drips; i++) {
    const x = box.x0 + (box.x1 - box.x0) * (0.2 + 0.6 * rng.next())
    // The lowest point of the blob near this x.
    let y = box.y0
    for (const p of points) if (Math.abs(p.x - x) < size * 0.16 && p.y > y) y = p.y
    const length = 8 + rng.next() * Math.min(24, size * 0.22), width = 4.5 + rng.next() * 3
    ctx.fillStyle = paint.base
    ctx.beginPath()
    ctx.moveTo(x - width / 2, y - 6)
    ctx.lineTo(x - width / 2, y + length)
    ctx.arc(x, y + length, width / 2 + 1, Math.PI, 0, true)
    ctx.lineTo(x + width / 2, y - 6)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = paint.light
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.arc(x - 1, y + length - 0.5, width * 0.22, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }

  trace(ctx, points)
  ctx.fillStyle = paint.base
  ctx.fill()

  ctx.save()
  trace(ctx, points)
  ctx.clip()
  // The ridges the bristles left: thin lines along the brush's way, light and dark by turns, none quite straight.
  if (strength > 0) {
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, reach = size * 0.75 + 6
    const tx = Math.cos(along), ty = Math.sin(along), nx = -ty, ny = tx
    const gap = Math.max(3.2, Math.min(7, size / 14))
    ctx.lineCap = 'round'
    for (let offset = -reach; offset <= reach; offset += gap * (0.7 + 0.6 * rng.next())) {
      if (rng.next() < 0.18) continue
      const light = rng.next() < 0.5
      ctx.strokeStyle = light ? paint.light : paint.dark
      ctx.globalAlpha = (light ? 0.5 : 0.42) * strength * (0.5 + 0.5 * rng.next())
      ctx.lineWidth = 1.2 + rng.next() * 2.4
      const from = -reach * (0.6 + 0.4 * rng.next()), to = reach * (0.6 + 0.4 * rng.next()), bow = (rng.next() - 0.5) * gap * 2.4
      ctx.beginPath()
      ctx.moveTo(cx + tx * from + nx * offset, cy + ty * from + ny * offset)
      ctx.quadraticCurveTo(cx + nx * (offset + bow), cy + ny * (offset + bow), cx + tx * to + nx * offset, cy + ty * to + ny * offset)
      ctx.stroke()
    }
  }
  if (options.dry) {
    const cx = (box.x0 + box.x1) / 2, cy = (box.y0 + box.y1) / 2, tx = Math.cos(along), ty = Math.sin(along), nx = -ty, ny = tx
    const length = Math.abs(tx) * (box.x1 - box.x0) + Math.abs(ty) * (box.y1 - box.y0), across = Math.abs(nx) * (box.x1 - box.x0) + Math.abs(ny) * (box.y1 - box.y0)
    ctx.strokeStyle = options.dry
    ctx.lineCap = 'round'
    for (let i = 0; i < 9; i++) {
      const offset = (rng.next() - 0.5) * across * 0.8, reach = length * (0.1 + 0.16 * rng.next())
      ctx.globalAlpha = 0.5 + 0.4 * rng.next()
      ctx.lineWidth = 1 + rng.next() * 2.2
      ctx.beginPath()
      ctx.moveTo(cx + tx * (length / 2) + nx * offset, cy + ty * (length / 2) + ny * offset)
      ctx.lineTo(cx + tx * (length / 2 - reach) + nx * offset, cy + ty * (length / 2 - reach) + ny * offset)
      ctx.stroke()
    }
  }
  // The bead of thick paint: shaded on the lower right, catching the light on the upper left.
  if (!options.flat) {
    const bead = Math.max(2.5, Math.min(7, size / 12))
    ctx.lineJoin = 'round'
    ctx.globalAlpha = 0.34
    ctx.strokeStyle = paint.dark
    ctx.lineWidth = bead * 1.7
    ctx.translate(-bead * 0.5, -bead * 0.6)
    trace(ctx, points)
    ctx.stroke()
    ctx.globalAlpha = 0.5
    ctx.strokeStyle = paint.light
    ctx.lineWidth = bead * 1.2
    ctx.translate(bead * 1.1, bead * 1.3)
    trace(ctx, points)
    ctx.stroke()
  }
  ctx.restore()
  ctx.globalAlpha = 1
}

/** Two wet colours met here: `paint` has run a little way into what lies under it, in soft tongues. */
export function run(ctx: Ctx, x: number, y: number, radius: number, colour: string, rng: Rng): void {
  ctx.fillStyle = colour
  for (let i = 0; i < 5; i++) {
    const a = rng.next() * Math.PI * 2, r = radius * (0.3 + 0.7 * rng.next())
    ctx.globalAlpha = 0.16 + 0.14 * rng.next()
    trace(ctx, wobbled(ellipse(x + Math.cos(a) * radius * 0.4, y + Math.sin(a) * radius * 0.4, r, r * (0.5 + 0.5 * rng.next()), 8, a), rng, r * 0.2))
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** Points turned about a middle by an angle: how a dab is laid at a tilt. */
export function turned(points: readonly Point[], cx: number, cy: number, angle: number): Point[] {
  const c = Math.cos(angle), s = Math.sin(angle)
  return points.map((p) => ({ x: cx + (p.x - cx) * c - (p.y - cy) * s, y: cy + (p.x - cx) * s + (p.y - cy) * c }))
}

/**
 * A small dab of paint with no bead: a spot, a petal, a cheek. `along` is the way the bristles went, which turns
 * the ridges only; `tilt` turns the dab itself.
 */
export function dab(ctx: Ctx, x: number, y: number, rx: number, ry: number, paint: Pot, rng: Rng, along = 0, tilt = 0): void {
  const shape = ellipse(x, y, rx, ry, 9, rng.next() * 6)
  blob(ctx, tilt === 0 ? shape : turned(shape, x, y, tilt), paint, rng, { wobble: Math.min(rx, ry) * 0.16, along, ridges: 0.7, flat: Math.min(rx, ry) < 7 })
}

/** A line of paint left by the edge of the brush: for a stalk, a whisker, a reed. */
export function stroke(ctx: Ctx, points: readonly Point[], width: number, colour: string): void {
  ctx.strokeStyle = colour
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length - 1; i++) ctx.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2)
  const last = points[points.length - 1]
  ctx.lineTo(last.x, last.y)
  ctx.stroke()
}

/** The sugar paper: one tile of a muted colour with its fibres and flecks, to be laid as a pattern. */
export function paperTile(ctx: Ctx, size: number, colour: string): void {
  const rng = makeRng(0x5a9a2)
  ctx.fillStyle = colour
  ctx.fillRect(0, 0, size, size)
  ctx.lineCap = 'round'
  for (let i = 0; i < size * 7; i++) {
    const x = rng.next() * size, y = rng.next() * size, a = rng.next() * Math.PI, length = 2 + rng.next() * 9
    ctx.strokeStyle = rng.next() < 0.5 ? '#ffffff' : '#2a1f33'
    ctx.globalAlpha = 0.05 + rng.next() * 0.09
    ctx.lineWidth = 0.6 + rng.next() * 0.9
    ctx.beginPath()
    // Drawn at the tile's four neighbours too, so the pattern has no seam.
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) {
      ctx.moveTo(x + ox, y + oy)
      ctx.lineTo(x + ox + Math.cos(a) * length, y + oy + Math.sin(a) * length)
    }
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}
