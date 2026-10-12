import { makeRng } from './rng'

// The look: a two-colour print (ART.md, "The look"). One sheet of cream
// paper, a blue ink and a berry red, both solid, which overprint to an
// indigo. The red plate sits a little off register. Ink is laid with
// `multiply`, as a second ink is laid over a first; paper is the sheet left
// bare, and a shape of paper hides what is behind it.
//
// Everything the view draws goes through `Print`, which also counts it: the
// count is what the frame-budget test and the grown-up overlay read.

export type G = CanvasRenderingContext2D
export type Shape = (g: G) => void

export const PAPER = '#f4ead4'
export const BLUE = '#2a9ee6'
export const RED = '#ff4f72'
/** The blue as it looks on the sheet, for ink that replaces what is behind it: the paper times the blue. */
export const BLUE_ON_PAPER = '#2891bf'
/** How far the red plate sits from the blue, in stage units. */
export const REGISTER = { x: 2.4, y: 1.5 } as const

/** The paper, the open water and the overprint as they look under the night's second pull of the blue: each is its day colour times the blue. */
export const NIGHT_PAPER = BLUE_ON_PAPER
export const NIGHT_WATER = '#075aac'
export const INK = '#282d55'
export const NIGHT_INK = '#071c4d'
/** The blue pulled twice, as one ink: what a figure left out of the night's pull wears where it is blue, so that it still stands off the flooded snow. */
export const BLUE_TWICE = '#0762cf'

/**
 * `paper` hides what is behind it. `blue` and `red` are printed over what is there. `both` is the two inks on
 * one shape, which is the indigo with a blue sliver on one side and a red one on the other. `ink` is that
 * indigo laid as one flat shape, for small things such as eyes. `water` is ink that replaces what is behind
 * it, for the open pond. `grain` and `cloud` are flecks of bare paper. `light` and `spark` are bare paper
 * whatever the hour: a lamp's glass, and light broken into specks.
 */
export type Tone = 'paper' | 'blue' | 'red' | 'both' | 'ink' | 'water' | 'grain' | 'cloud' | 'light' | 'spark'

/** The fleck tiles for a size: the two of the day, and the same two under the night's pull. */
export type Tiles = { grain: CanvasPattern | null; cloud: CanvasPattern | null; nightGrain: CanvasPattern | null; nightCloud: CanvasPattern | null }

/** A figure painted once for a size, by day and under the night's pull: its box is in its own units, about its own origin. */
export type Sprite = { day: CanvasImageSource; night: CanvasImageSource; figure: CanvasImageSource; x: number; y: number; w: number; h: number }

const TAU = Math.PI * 2
const NONE = 'rgba(0,0,0,0)'

export class Print {
  /** Fills, strokes and stamps since `begin`. */
  count = 0
  /** The night's pull is over the sheet: paper is no longer bare, and every ink is laid on that. */
  night = false
  /**
   * By night, the figure being drawn is left out of the night's pull, as light is: its paper stays bare and its
   * red stays red, and its blue is the blue pulled twice.
   */
  knockout = false
  /** Every shape is laid as paper, whatever its tone: the first of the two passes that paint a sprite, so that every ink of the second lies on paper. */
  under = false
  private tiles: Tiles = { grain: null, cloud: null, nightGrain: null, nightCloud: null }
  constructor(readonly g: G) {}

  begin(): void {
    this.count = 0
  }
  /** The fleck tiles, made once for a size by `tiles` below. */
  use(made: Tiles): void {
    this.tiles = made
  }

  private paper(): string {
    return this.night && !this.knockout ? NIGHT_PAPER : PAPER
  }
  private blue(): string {
    return this.night && this.knockout ? BLUE_TWICE : BLUE
  }
  private ink(): string {
    return this.night && !this.knockout ? NIGHT_INK : INK
  }

  /** Fills a shape with a tone. With `holes`, a part of the shape drawn inside another is left out, which is how a block of clear ice gets its glint. */
  fill(tone: Tone, shape: Shape, holes = false): void {
    const g = this.g
    if (tone === 'both' && !this.under) {
      this.fill('blue', shape, holes)
      this.fill('red', shape, holes)
      return
    }
    this.count++
    const rule: CanvasFillRule = holes ? 'evenodd' : 'nonzero'
    const t = this.tiles
    if (tone === 'red' || tone === 'both') {
      g.save()
      g.translate(REGISTER.x, REGISTER.y)
      g.beginPath()
      shape(g)
      g.globalCompositeOperation = this.under ? 'source-over' : 'multiply'
      g.fillStyle = this.under ? this.paper() : RED
      g.fill(rule)
      g.restore()
      return
    }
    g.beginPath()
    shape(g)
    g.globalCompositeOperation = tone === 'blue' && !this.under ? 'multiply' : 'source-over'
    g.fillStyle = this.under ? this.paper()
      : tone === 'paper' ? this.paper()
      : tone === 'blue' ? this.blue()
      : tone === 'ink' ? this.ink()
      : tone === 'water' ? (this.night ? NIGHT_WATER : BLUE_ON_PAPER)
      : tone === 'grain' ? ((this.night ? t.nightGrain : t.grain) ?? NONE)
      : tone === 'cloud' ? ((this.night ? t.nightCloud : t.cloud) ?? NONE)
      : tone === 'spark' ? (t.cloud ?? NONE)
      : PAPER
    g.fill(rule)
    g.globalCompositeOperation = 'source-over'
  }

  /** An ink on bare paper whatever is behind: the sheet is cleared under the shape first, so a red mitten stays red in front of a blue coat. */
  solid(tone: 'blue' | 'red' | 'both', shape: Shape): void {
    this.fill('paper', shape)
    this.fill(tone, shape)
  }

  /** A line of bare paper or of ink, with round ends. */
  line(tone: 'paper' | 'blue' | 'red' | 'ink', width: number, shape: Shape): void {
    const g = this.g
    this.count++
    g.beginPath()
    shape(g)
    g.lineWidth = width
    g.lineCap = 'round'
    g.lineJoin = 'round'
    const flat = tone === 'paper' || tone === 'ink' || this.under
    g.globalCompositeOperation = flat ? 'source-over' : 'multiply'
    g.strokeStyle = tone === 'paper' || this.under ? this.paper() : tone === 'ink' ? this.ink() : tone === 'blue' ? this.blue() : RED
    g.stroke()
    g.globalCompositeOperation = 'source-over'
  }

  /** One stamp of a layer painted earlier, in the surface's own pixels. */
  stamp(layer: CanvasImageSource, x: number, y: number): void {
    this.count++
    this.g.drawImage(layer, x, y)
  }

  /** One stamp of a sprite with its origin at `x`, `y`, turned and stretched about that origin. */
  sprite(sprite: Sprite, x: number, y: number, turn = 0, sx = 1, sy = 1): void {
    const g = this.g
    this.count++
    g.save()
    g.translate(x, y)
    if (turn) g.rotate(turn)
    if (sx !== 1 || sy !== 1) g.scale(sx, sy)
    g.drawImage(this.night ? (this.knockout ? sprite.figure : sprite.night) : sprite.day, sprite.x, sprite.y, sprite.w, sprite.h)
    g.restore()
  }

  /** Draws `inside` moved, turned and stretched about a point. */
  at(x: number, y: number, turn: number, sx: number, sy: number, inside: () => void): void {
    const g = this.g
    g.save()
    g.translate(x, y)
    if (turn) g.rotate(turn)
    if (sx !== 1 || sy !== 1) g.scale(sx, sy)
    inside()
    g.restore()
  }

  /** Draws `inside` only where `shape` is. */
  within(shape: Shape, inside: () => void): void {
    const g = this.g
    g.save()
    g.beginPath()
    shape(g)
    g.clip()
    inside()
    g.restore()
  }
}

// --- Shapes ------------------------------------------------------------------

export const oval = (cx: number, cy: number, rx: number, ry: number, turn = 0): Shape => (g) => {
  g.moveTo(cx + Math.cos(turn) * rx, cy + Math.sin(turn) * rx)
  g.ellipse(cx, cy, rx, ry, turn, 0, TAU)
}
export const dot = (cx: number, cy: number, r: number): Shape => oval(cx, cy, r, r)
export const poly = (...points: number[]): Shape => (g) => {
  g.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1])
  g.closePath()
}
/** A bar with rounded corners, given by its middle. */
export const bar = (cx: number, cy: number, w: number, h: number, r: number): Shape => (g) => {
  const x = cx - w / 2, y = cy - h / 2, k = Math.min(r, w / 2, h / 2)
  g.moveTo(x + k, y)
  g.lineTo(x + w - k, y)
  g.quadraticCurveTo(x + w, y, x + w, y + k)
  g.lineTo(x + w, y + h - k)
  g.quadraticCurveTo(x + w, y + h, x + w - k, y + h)
  g.lineTo(x + k, y + h)
  g.quadraticCurveTo(x, y + h, x, y + h - k)
  g.lineTo(x, y + k)
  g.quadraticCurveTo(x, y, x + k, y)
  g.closePath()
}
/** A lens: two arcs between two points, `bulge` thick on one side and `back` on the other. */
export const lens = (x0: number, y0: number, x1: number, y1: number, bulge: number, back = 0): Shape => (g) => {
  const mx = (x0 + x1) / 2, my = (y0 + y1) / 2, dx = x1 - x0, dy = y1 - y0, n = Math.hypot(dx, dy) || 1
  const nx = -dy / n, ny = dx / n
  g.moveTo(x0, y0)
  g.quadraticCurveTo(mx + nx * bulge * 2, my + ny * bulge * 2, x1, y1)
  g.quadraticCurveTo(mx + nx * back * 2, my + ny * back * 2, x0, y0)
  g.closePath()
}
/** A shape moved, turned and stretched about a point: several of these make one path, so many things are one fill. */
export const placed = (x: number, y: number, turn: number, sx: number, sy: number, shape: Shape): Shape => (g) => {
  g.save()
  g.translate(x, y)
  if (turn) g.rotate(turn)
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  shape(g)
  g.restore()
}
/** Several shapes as one. */
export const all = (...shapes: Shape[]): Shape => (g) => {
  for (const shape of shapes) shape(g)
}
/** A soft-cornered shape through points, for clouds, drifts and mounds. */
export const blobby = (points: readonly number[]): Shape => (g) => {
  const n = points.length / 2
  const mid = (i: number): [number, number] => {
    const a = (i % n) * 2, b = ((i + 1) % n) * 2
    return [(points[a] + points[b]) / 2, (points[a + 1] + points[b + 1]) / 2]
  }
  const [sx, sy] = mid(n - 1)
  g.moveTo(sx, sy)
  for (let i = 0; i < n; i++) {
    const [ex, ey] = mid(i)
    g.quadraticCurveTo(points[i * 2], points[i * 2 + 1], ex, ey)
  }
  g.closePath()
}

// --- Flecks ------------------------------------------------------------------

/** Makes a canvas to paint a layer on. A test hands in one that only counts. */
export type MakeLayer = (width: number, height: number) => HTMLCanvasElement

/** The side of a fleck tile, in stage units. */
export const TILE = 160

/**
 * The fleck tiles at `density` device pixels to a stage unit: fine sparse flecks for ink grain, and coarse
 * crowded ones for cloudy ice, each as bare paper and again as paper under the night's pull. Filling a shape
 * with one lets the sheet show through the ink. Made once for a size, never per frame.
 */
export function tiles(make: MakeLayer, g: G, density: number): Tiles {
  const side = Math.max(8, Math.round(TILE * density))
  const paint = (seed: number, many: number, least: number, most: number, colour: string): CanvasPattern | null => {
    const layer = make(side, side)
    const t = layer.getContext('2d')
    if (!t) return null
    const chance = makeRng(seed)
    t.fillStyle = colour
    for (let i = 0; i < many; i++) {
      const x = chance.next() * TILE, y = chance.next() * TILE, r = least + chance.next() * (most - least), squash = 0.5 + chance.next() * 0.5, turn = chance.next() * Math.PI
      // Drawn again across each edge, so the tile repeats with no seam.
      for (const ox of [-TILE, 0, TILE]) for (const oy of [-TILE, 0, TILE]) {
        if (x + ox < -most || x + ox > TILE + most || y + oy < -most || y + oy > TILE + most) continue
        t.beginPath()
        t.ellipse((x + ox) * density, (y + oy) * density, r * density, r * squash * density, turn, 0, TAU)
        t.fill()
      }
    }
    const pattern = g.createPattern(layer, 'repeat')
    // The tile is in device pixels and the drawing in stage units: the pattern is brought back by the density.
    if (pattern && typeof pattern.setTransform === 'function' && typeof DOMMatrix !== 'undefined') pattern.setTransform(new DOMMatrix().scale(1 / density))
    return pattern
  }
  return { grain: paint(11, 150, 0.5, 1.5, PAPER), cloud: paint(23, 300, 2.2, 6.5, PAPER), nightGrain: paint(11, 150, 0.5, 1.5, NIGHT_PAPER), nightCloud: paint(23, 300, 2.2, 6.5, NIGHT_PAPER) }
}

/**
 * Paints a figure once for a size, as a sprite: by day, under the night's pull, and left out of it. Each is painted in
 * two passes, the first laying every shape as paper, so that every ink of the second lies on paper and the
 * sprite hides what is behind it as the figure drawn live would.
 */
export function bake(make: MakeLayer, density: number, made: Tiles, box: { x: number; y: number; w: number; h: number }, draw: (p: Print) => void): Sprite | null {
  const paint = (night: boolean, knockout: boolean): CanvasImageSource | null => {
    const layer = make(Math.max(1, Math.ceil(box.w * density)), Math.max(1, Math.ceil(box.h * density)))
    const g = layer.getContext('2d')
    if (!g) return null
    g.setTransform(density, 0, 0, density, -box.x * density, -box.y * density)
    const p = new Print(g)
    p.use(made)
    p.night = night
    p.knockout = knockout
    p.under = true
    draw(p)
    p.under = false
    draw(p)
    return layer
  }
  const day = paint(false, false), night = paint(true, false), figure = paint(true, true)
  return day && night && figure ? { day, night, figure, ...box } : null
}
