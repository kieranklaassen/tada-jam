import { makeRng, type Rng } from './rng'

// The pencil: how every line of the look is laid. Graphite on squared paper:
// a line is drawn twice, a little apart, as a hand goes over it; tone is
// hatching, never a filled field; and the tooth of the paper shows in every
// stroke, because a stroke is drawn through a tile of grain. One coloured
// pencil, an orange one, is kept for what the finger works.
// Everything here draws through a plain 2D context, so a test can hand it a
// stand-in that draws nothing and counts.

export type Ctx = CanvasRenderingContext2D
/** What makes a canvas of a size in pixels: the document in the game, a stand-in in a test. */
export type MakeCanvas = (width: number, height: number) => HTMLCanvasElement

export const PAPER = '#f7f4ec'
/** The printed squares. */
export const GRID_INK = 'rgba(96, 148, 204, 0.4)'
export const GRAPHITE = [54, 57, 68] as const
export const ORANGE = [228, 98, 20] as const

export type Lead = 'graphite' | 'orange'

const rgba = (c: readonly [number, number, number], a: number): string => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`

/** A tile of pencil grain in one colour: mostly lead, with the paper's tooth showing through as gaps. */
function grainTile(make: MakeCanvas, colour: readonly [number, number, number], seed: number): HTMLCanvasElement {
  const size = 64
  const tile = make(size, size)
  const ctx = tile.getContext('2d')
  if (!ctx) return tile
  const rng = makeRng(seed)
  // Eight strengths of lead; each is one fill of all its specks.
  const levels = [0.2, 0.42, 0.58, 0.7, 0.8, 0.88, 0.95, 1]
  const cells: number[][] = levels.map(() => [])
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    // Most of a stroke is dark; about one speck in five is a gap in the tooth.
    const v = rng.next()
    const level = v < 0.2 ? Math.floor(rng.next() * 3) : 3 + Math.floor(rng.next() * 5)
    cells[level].push(x, y)
  }
  levels.forEach((alpha, level) => {
    ctx.fillStyle = rgba(colour, alpha)
    ctx.beginPath()
    const at = cells[level]
    for (let i = 0; i < at.length; i += 2) ctx.rect(at[i], at[i + 1], 1, 1)
    ctx.fill()
  })
  return tile
}

/** The leads: for each colour, a plain ink and the tile its grain is drawn through. */
export class Leads {
  private readonly tiles: Record<Lead, HTMLCanvasElement>

  constructor(make: MakeCanvas) {
    this.tiles = { graphite: grainTile(make, GRAPHITE, 11), orange: grainTile(make, ORANGE, 23) }
  }

  /** What to stroke with on `ctx`, whose drawing is `scale` pixels to a unit: the grain at one speck a pixel, or the plain ink. */
  ink(ctx: Ctx, lead: Lead, scale: number, grain = true): string | CanvasPattern {
    const plain = rgba(lead === 'graphite' ? GRAPHITE : ORANGE, 0.82)
    if (!grain) return plain
    const pattern = ctx.createPattern(this.tiles[lead], 'repeat')
    if (!pattern) return plain
    // The grain is the paper's, so it stays one speck to a pixel however large the drawing is.
    if (typeof DOMMatrix !== 'undefined' && scale > 0) pattern.setTransform(new DOMMatrix().scale(1 / scale))
    return pattern
  }
}

/** One sitting with the pencil on one canvas. Coordinates are units; `scale` is pixels to a unit. */
export class Pencil {
  readonly ctx: Ctx
  readonly rng: Rng
  private readonly graphite: string | CanvasPattern
  private readonly orange: string | CanvasPattern
  private lead: Lead = 'graphite'
  /** Every weight is multiplied by `thin` and every tone by `fade`: a figure drawn larger keeps a pencil's line, and one that stands further back is drawn paler. */
  private readonly thin: number
  private readonly fade: number

  constructor(ctx: Ctx, leads: Leads, scale: number, seed: number, thin = 1, fade = 1) {
    this.ctx = ctx
    this.thin = thin
    this.fade = fade
    this.rng = makeRng(seed)
    this.graphite = leads.ink(ctx, 'graphite', scale)
    this.orange = leads.ink(ctx, 'orange', scale)
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  /** Takes up the graphite or the orange pencil. */
  take(lead: Lead): this {
    this.lead = lead
    return this
  }

  private ink(): string | CanvasPattern {
    return this.lead === 'graphite' ? this.graphite : this.orange
  }

  private jitter(by: number): number {
    return (this.rng.next() - 0.5) * 2 * by
  }

  /** A closed, slightly uneven round: the points of an ellipse drawn by hand. */
  round(cx: number, cy: number, rx: number, ry: number, turn = 0, rough = 0.03, count = 18): number[] {
    const points: number[] = []
    const cos = Math.cos(turn), sin = Math.sin(turn)
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const r = 1 + this.jitter(rough)
      const x = Math.cos(a) * rx * r, y = Math.sin(a) * ry * r
      points.push(cx + x * cos - y * sin, cy + x * sin + y * cos)
    }
    return points
  }

  /** Lays a path through `points` (x and y in turn) on the context, without stroking it: smooth, or with `hard` corners. */
  trace(points: readonly number[], closed = false, wobble = 0, hard = false): void {
    const ctx = this.ctx
    const n = points.length / 2
    const xs: number[] = [], ys: number[] = []
    for (let i = 0; i < n; i++) {
      xs.push(points[i * 2] + (wobble ? this.jitter(wobble) : 0))
      ys.push(points[i * 2 + 1] + (wobble ? this.jitter(wobble) : 0))
    }
    if (hard) {
      ctx.moveTo(xs[0], ys[0])
      for (let i = 1; i < n; i++) ctx.lineTo(xs[i], ys[i])
      if (closed) ctx.closePath()
      return
    }
    if (closed) {
      ctx.moveTo((xs[n - 1] + xs[0]) / 2, (ys[n - 1] + ys[0]) / 2)
      for (let i = 0; i < n; i++) {
        const next = (i + 1) % n
        ctx.quadraticCurveTo(xs[i], ys[i], (xs[i] + xs[next]) / 2, (ys[i] + ys[next]) / 2)
      }
      ctx.closePath()
      return
    }
    ctx.moveTo(xs[0], ys[0])
    if (n === 2) ctx.lineTo(xs[1], ys[1])
    for (let i = 1; i < n - 1; i++) {
      const last = i === n - 2
      ctx.quadraticCurveTo(xs[i], ys[i], last ? xs[i + 1] : (xs[i] + xs[i + 1]) / 2, last ? ys[i + 1] : (ys[i] + ys[i + 1]) / 2)
    }
  }

  /** A pencil line through `points`: drawn twice, the second pass thinner and a little off, as a hand goes over a line. */
  line(points: readonly number[], weight = 2, tone = 0.9, closed = false, wobble = 0.7, hard = false): this {
    const ctx = this.ctx
    ctx.strokeStyle = this.ink()
    for (let pass = 0; pass < 2; pass++) {
      ctx.globalAlpha = tone * this.fade * (pass === 0 ? 1 : 0.5)
      ctx.lineWidth = weight * this.thin * (pass === 0 ? 1 : 0.6)
      ctx.beginPath()
      this.trace(points, closed, pass === 0 ? wobble * 0.4 : wobble, hard)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    return this
  }

  /** Paper inside a closed outline, so that what is behind does not show through, and then the outline. */
  shape(points: readonly number[], weight = 2, tone = 0.9, wobble = 0.7, hard = false): this {
    this.paper(points, hard)
    return this.line(points, weight, tone, true, wobble, hard)
  }

  /** Paper inside a closed outline, with no line. */
  paper(points: readonly number[], hard = false): this {
    const ctx = this.ctx
    ctx.globalAlpha = 1
    ctx.fillStyle = PAPER
    ctx.beginPath()
    this.trace(points, true, 0, hard)
    ctx.fill()
    return this
  }

  /**
   * Hatching inside a closed outline: parallel strokes at `angle`, `gap` apart, each a little uneven and none
   * quite reaching the edge at the same place. `cross` lays a second set across the first, for the darkest tone.
   */
  hatch(points: readonly number[], angle: number, gap: number, weight = 1.2, tone = 0.6, cross = false, hard = false): this {
    const ctx = this.ctx
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (let i = 0; i < points.length; i += 2) {
      x0 = Math.min(x0, points[i]); x1 = Math.max(x1, points[i])
      y0 = Math.min(y0, points[i + 1]); y1 = Math.max(y1, points[i + 1])
    }
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2
    const reach = Math.hypot(x1 - x0, y1 - y0) / 2 + gap
    ctx.save()
    ctx.beginPath()
    this.trace(points, true, 0, hard)
    ctx.clip()
    ctx.strokeStyle = this.ink()
    ctx.lineWidth = weight * this.thin
    ctx.globalAlpha = tone * this.fade
    for (const turn of cross ? [angle, angle + 1.2] : [angle]) {
      const dx = Math.cos(turn), dy = Math.sin(turn)
      ctx.beginPath()
      for (let d = -reach; d <= reach; d += gap * (0.8 + 0.4 * this.rng.next())) {
        const ox = cx - dy * d, oy = cy + dx * d
        const from = -reach * (0.9 + 0.1 * this.rng.next()), to = reach * (0.9 + 0.1 * this.rng.next())
        ctx.moveTo(ox + dx * from + this.jitter(0.6), oy + dy * from + this.jitter(0.6))
        ctx.lineTo(ox + dx * to + this.jitter(0.6), oy + dy * to + this.jitter(0.6))
      }
      ctx.stroke()
    }
    ctx.restore()
    ctx.globalAlpha = 1
    return this
  }

  /** A filled dot of lead: a pupil, a nostril, a speck. */
  dot(x: number, y: number, r: number, tone = 0.95): this {
    const ctx = this.ctx
    ctx.globalAlpha = tone * this.fade
    ctx.fillStyle = this.ink()
    ctx.beginPath()
    ctx.arc(x, y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
    return this
  }
}

/** The points of a straight line from one place to another, with a slight bow, as a ruler is not used. */
export function stroke(x0: number, y0: number, x1: number, y1: number, bow = 0): number[] {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2
  const dx = x1 - x0, dy = y1 - y0
  const far = Math.hypot(dx, dy) || 1
  return [x0, y0, mx - (dy / far) * bow, my + (dx / far) * bow, x1, y1]
}
