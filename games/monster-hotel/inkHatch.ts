// The pen: one black ink, cream paper and one printed spot colour; a line that
// trembles a little, by a seeded generator; and tone made only by hatching,
// which is three tiles of ruled strokes built once and clipped to shapes.
// Nothing here reads a clock or a random source.

export const PAPER = '#f1e9d6'
export const INK = '#1d1a17'
/** The one spot colour, printed flat, and only on what can be touched. */
export const SPOT = '#e2472b'

/** A small seeded generator: the same seed gives the same line every time. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A seed from a word, so each figure has its own hand. */
export function seedOf(word: string, salt = 0): number {
  let h = 2166136261 ^ salt
  for (let i = 0; i < word.length; i++) h = Math.imul(h ^ word.charCodeAt(i), 16777619)
  return h >>> 0
}

export type Surface = { width: number; height: number; getContext(kind: '2d'): CanvasRenderingContext2D | null }
export type MakeSurface = (width: number, height: number) => Surface

/** The three tiles: sparse, medium and close strokes. Cross-hatching lays one twice, at two angles. */
export type HatchTiles = { tiles: Surface[] }

const TILE = 144
/** Strokes to a tile; the tile's height divides by each, so the ruling repeats without a seam. */
const RULINGS = [24, 36, 48]
const WEIGHTS = [0.75, 0.8, 0.9]

/** Builds the hatch tiles for one pixel ratio. Each stroke wobbles and is lifted here and there, as a hand rules. */
export function buildHatch(make: MakeSurface, ratio: number, seed: number): HatchTiles {
  const size = Math.round(TILE * ratio)
  const tiles = RULINGS.map((count, index) => {
    const tile = make(size, size)
    const g = tile.getContext('2d')
    if (!g) return tile
    const rng = mulberry32(seed + index * 977)
    g.strokeStyle = INK
    g.lineCap = 'round'
    const gapY = size / count
    for (let row = 0; row < count; row++) {
      const y0 = (row + 0.5) * gapY
      const a1 = (0.25 + rng() * 0.45) * ratio, a2 = (0.1 + rng() * 0.3) * ratio
      const p1 = rng() * 6.283, p2 = rng() * 6.283
      // The wobble closes on itself across the tile, so a stroke meets its own start.
      const yAt = (x: number) => y0 + a1 * Math.sin((x / size) * 6.283 + p1) + a2 * Math.sin((x / size) * 18.85 + p2)
      // Each stroke is drawn three times, a tile apart, so one that runs off an edge comes back in at the other.
      const start = rng() * size
      let x = start
      while (x < start + size) {
        const end = Math.min(start + size - 0.01, x + (34 + rng() * 96) * ratio)
        g.lineWidth = WEIGHTS[index]! * ratio * (0.8 + rng() * 0.45)
        for (const shift of [-size, 0, size]) {
          g.beginPath()
          g.moveTo(x + shift, yAt(x))
          for (let px = x + 6 * ratio; px < end; px += 6 * ratio) g.lineTo(px + shift, yAt(px))
          g.lineTo(end + shift, yAt(end))
          g.stroke()
        }
        // The pen lifts now and then, and comes down again a hair later.
        x = end + (rng() < 0.3 ? (1.5 + rng() * 3.5) * ratio : 0.01)
      }
    }
    return tile
  })
  return { tiles }
}

export type Tone = 0 | 1 | 2 | 3 | 4

type ShapeOptions = {
  /** A flat fill under the line. */
  fill?: string | null
  /** Hatching: 1 a light single ruling, 2 a medium one, 3 crossed, 4 crossed close. */
  tone?: Tone
  /** The angle of the ruling, in radians. */
  angle?: number
  /** The line's weight; 0 draws no line. */
  w?: number
  /** Straight edges with corners, where the default is a curve through the points. */
  sharp?: boolean
  color?: string
}

/**
 * Draws on one context in whatever units it is scaled to. `unit` is how many
 * device pixels one of those units is, so the hatching, which is ruled in
 * device pixels, keeps its weight on every figure.
 */
export class Pen {
  readonly ctx: CanvasRenderingContext2D
  private readonly rng: () => number
  private readonly patterns: (CanvasPattern | null)[]
  private readonly reach: number
  /** How far the line strays, in the context's units. */
  tremble: number

  constructor(ctx: CanvasRenderingContext2D, surface: { width: number; height: number }, hatch: HatchTiles, seed: number, tremble = 0.7) {
    this.ctx = ctx
    this.rng = mulberry32(seed)
    this.patterns = hatch.tiles.map((tile) => ctx.createPattern(tile as unknown as CanvasImageSource, 'repeat'))
    this.reach = surface.width + surface.height
    this.tremble = tremble
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
  }

  /** The next seeded number, for a drawing that scatters something. */
  next(): number { return this.rng() }

  /** The points of a line through `pts` (x, y, x, y ...), sampled finely and trembling. */
  private trace(pts: readonly number[], closed: boolean, sharp: boolean): number[] {
    const n = pts.length / 2
    const out: number[] = []
    const step = 5
    const px = (i: number) => pts[2 * (closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i)))]!
    const py = (i: number) => pts[2 * (closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))) + 1]!
    const spans = closed ? n : n - 1
    for (let i = 0; i < spans; i++) {
      const x1 = px(i), y1 = py(i), x2 = px(i + 1), y2 = py(i + 1)
      const count = Math.max(1, Math.ceil(Math.hypot(x2 - x1, y2 - y1) / step))
      for (let k = 0; k < count; k++) {
        const t = k / count
        if (sharp) { out.push(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t); continue }
        // A smooth curve through the points.
        const x0 = px(i - 1), y0 = py(i - 1), x3 = px(i + 2), y3 = py(i + 2), t2 = t * t, t3 = t2 * t
        out.push(
          0.5 * (2 * x1 + (x2 - x0) * t + (2 * x0 - 5 * x1 + 4 * x2 - x3) * t2 + (3 * x1 - x0 - 3 * x2 + x3) * t3),
          0.5 * (2 * y1 + (y2 - y0) * t + (2 * y0 - 5 * y1 + 4 * y2 - y3) * t2 + (3 * y1 - y0 - 3 * y2 + y3) * t3),
        )
      }
    }
    if (!closed) out.push(px(n - 1), py(n - 1))
    // The tremble: a slow seeded drift, eased between stray points a little way apart, so the line wavers and never jitters.
    const total = out.length / 2, amp = this.tremble
    if (amp > 0 && total > 1) {
      const every = 3, knots = Math.ceil(total / every) + 1
      const kx: number[] = [], ky: number[] = []
      for (let i = 0; i < knots; i++) { kx.push((this.rng() - 0.5) * 2 * amp); ky.push((this.rng() - 0.5) * 2 * amp) }
      // A closed line comes back to where it set out.
      if (closed) { kx[knots - 1] = kx[0]!; ky[knots - 1] = ky[0]! }
      for (let i = 0; i < total; i++) {
        const k = Math.floor(i / every), t = (i % every) / every, e = t * t * (3 - 2 * t)
        out[2 * i] = out[2 * i]! + kx[k]! + (kx[k + 1]! - kx[k]!) * e
        out[2 * i + 1] = out[2 * i + 1]! + ky[k]! + (ky[k + 1]! - ky[k]!) * e
      }
    }
    return out
  }

  private path(points: readonly number[], closed: boolean): void {
    const g = this.ctx
    g.beginPath()
    g.moveTo(points[0]!, points[1]!)
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i]!, points[i + 1]!)
    if (closed) g.closePath()
  }

  /** Rules the clipped path with one tile at one angle. */
  private rule(tile: number, angle: number): void {
    const g = this.ctx, pattern = this.patterns[tile]
    if (!pattern) return
    const c = Math.cos(angle), s = Math.sin(angle), r = this.reach
    g.setTransform(c, s, -s, c, this.rng() * 97, this.rng() * 97)
    g.fillStyle = pattern
    g.fillRect(-r, -r, 2 * r, 2 * r)
  }

  private shade(points: readonly number[], tone: Tone, angle: number): void {
    if (tone === 0) return
    const g = this.ctx
    g.save()
    this.path(points, true)
    g.clip()
    if (tone === 1) this.rule(0, angle)
    else if (tone === 2) this.rule(1, angle)
    else if (tone === 3) { this.rule(1, angle); this.rule(1, angle + 1.2) }
    else { this.rule(2, angle); this.rule(2, angle + 1.15) }
    g.restore()
  }

  /** An open line through the points. */
  line(pts: readonly number[], w = 1.6, sharp = false, color = INK): void {
    const g = this.ctx
    this.path(this.trace(pts, false, sharp), false)
    g.strokeStyle = color
    g.lineWidth = w
    g.stroke()
  }

  /** A limb or a pipe: a thick line of flat colour with an ink edge. */
  tube(pts: readonly number[], w: number, fill = PAPER, edge = 1.4, sharp = false): void {
    const g = this.ctx
    const points = this.trace(pts, false, sharp)
    this.path(points, false)
    g.strokeStyle = INK
    g.lineWidth = w + 2 * edge
    g.stroke()
    this.path(points, false)
    g.strokeStyle = fill
    g.lineWidth = w
    g.stroke()
  }

  /** A closed shape: an optional flat fill, optional hatching, then its line. */
  shape(pts: readonly number[], options: ShapeOptions = {}): void {
    const g = this.ctx
    const points = this.trace(pts, true, options.sharp ?? false)
    if (options.fill) {
      this.path(points, true)
      g.fillStyle = options.fill
      g.fill()
    }
    if (options.tone) this.shade(points, options.tone, options.angle ?? -0.9)
    const w = options.w ?? 1.6
    if (w > 0) {
      this.path(points, true)
      g.strokeStyle = options.color ?? INK
      g.lineWidth = w
      g.stroke()
    }
  }

  /** Hatching alone, inside a shape, with no line round it. */
  tone(pts: readonly number[], tone: Tone, angle = -0.9, sharp = true): void {
    this.shade(this.trace(pts, true, sharp), tone, angle)
  }

  rect(x: number, y: number, w: number, h: number, options: ShapeOptions = {}): void {
    this.shape([x, y, x + w, y, x + w, y + h, x, y + h], { sharp: true, ...options })
  }

  /** A box whose four lines are ruled one at a time and run a little past their corners, as a draughtsman's do. */
  box(x: number, y: number, w: number, h: number, weight = 1.4, over = 2): void {
    const o = () => over * (0.3 + this.rng())
    this.line([x - o(), y, x + w + o(), y], weight, true)
    this.line([x + w, y - o(), x + w, y + h + o()], weight, true)
    this.line([x + w + o(), y + h, x - o(), y + h], weight, true)
    this.line([x, y + h + o(), x, y - o()], weight, true)
  }

  ellipse(cx: number, cy: number, rx: number, ry: number, options: ShapeOptions = {}, turn = 0): void {
    const pts: number[] = []
    const n = Math.max(8, Math.min(18, Math.round((rx + ry) / 3)))
    const c = Math.cos(turn), s = Math.sin(turn)
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2, x = Math.cos(a) * rx, y = Math.sin(a) * ry
      pts.push(cx + x * c - y * s, cy + x * s + y * c)
    }
    this.shape(pts, options)
  }

  /** A solid spot of ink: a pupil, a nostril, a rivet. */
  dot(x: number, y: number, r: number, color = INK): void {
    const g = this.ctx
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fillStyle = color
    g.fill()
  }

  /** Runs `draw` with everything it draws kept inside a shape. */
  inside(pts: readonly number[], sharp: boolean, draw: () => void): void {
    const g = this.ctx
    g.save()
    this.path(this.trace(pts, true, sharp), true)
    g.clip()
    draw()
    g.restore()
  }
}
