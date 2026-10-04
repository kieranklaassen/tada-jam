import { between, type Rng } from './rng'

// How chalk is drawn. Every chalk thing in the game (the child's marks, the
// engine, the riders, the homes) goes through these few calls, so it all reads
// as one stick of chalk on one patch of tar. The ground shows through chalk
// as specks, in one of two ways that give the same picture: a figure is drawn
// solid onto a clear layer and `roughen` knocks the tar's grain out of the
// layer in one pass; a mark is drawn straight onto the surface in an ink that
// already has the grain in it (`makeInk`), which costs no second pass.

export type Pt = { x: number; y: number }
type G = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
/** What a chalk call draws with: a plain colour, or an ink with the grain in it. */
export type Ink = string | CanvasPattern

/** The five pastels, in the fixed order marks take them. */
export const CHALKS = ['#f6f3ea', '#f8dc74', '#f6a3b9', '#9fd0f5', '#a8e6bf'] as const
/** Extra sticks for the figures only. */
export const ORANGE = '#f7b27a', LILAC = '#c9b4f2', GREEN = '#8fd98a', RED = '#f08b84'

/** Points round an ellipse, a little uneven, as a hand draws one. */
export function ring(rng: Rng, cx: number, cy: number, rx: number, ry: number, wobble = 0.06, steps = 28): Pt[] {
  const pts: Pt[] = []
  const lean = between(rng, -0.4, 0.4)
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2
    const k = 1 + wobble * Math.sin(a * 2 + lean * 5) + between(rng, -wobble, wobble) * 0.5
    pts.push({ x: cx + Math.cos(a) * rx * k, y: cy + Math.sin(a) * ry * k })
  }
  return pts
}

/** A box with soft corners, corners first cut and then shaken a little. */
export function box(rng: Rng, x: number, y: number, w: number, h: number, round = 0.2, shake = 1.5): Pt[] {
  const r = Math.min(w, h) * round
  const raw: Pt[] = [
    { x: x + r, y }, { x: x + w / 2, y }, { x: x + w - r, y }, { x: x + w, y: y + r }, { x: x + w, y: y + h / 2 },
    { x: x + w, y: y + h - r }, { x: x + w - r, y: y + h }, { x: x + w / 2, y: y + h }, { x: x + r, y: y + h },
    { x, y: y + h - r }, { x, y: y + h / 2 }, { x, y: y + r },
  ]
  return raw.map((p) => ({ x: p.x + between(rng, -shake, shake), y: p.y + between(rng, -shake, shake) }))
}

function trace(g: G, pts: readonly Pt[], closed: boolean, dx = 0, dy = 0) {
  g.beginPath()
  if (pts.length < 3) {
    pts.forEach((p, i) => (i ? g.lineTo(p.x + dx, p.y + dy) : g.moveTo(p.x + dx, p.y + dy)))
    return
  }
  // Through the midpoints, so a run of points is one flowing line.
  const n = pts.length
  if (closed) {
    g.moveTo((pts[n - 1].x + pts[0].x) / 2 + dx, (pts[n - 1].y + pts[0].y) / 2 + dy)
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n]
      g.quadraticCurveTo(p.x + dx, p.y + dy, (p.x + q.x) / 2 + dx, (p.y + q.y) / 2 + dy)
    }
    g.closePath()
    return
  }
  g.moveTo(pts[0].x + dx, pts[0].y + dy)
  for (let i = 1; i < n - 1; i++) {
    const p = pts[i], q = pts[i + 1]
    g.quadraticCurveTo(p.x + dx, p.y + dy, (p.x + q.x) / 2 + dx, (p.y + q.y) / 2 + dy)
  }
  g.lineTo(pts[n - 1].x + dx, pts[n - 1].y + dy)
}

/** One chalk line: a wide faint smear of dust, the body of the stroke, and a brighter pressed core. */
export function chalkLine(g: G, rng: Rng, pts: readonly Pt[], colour: Ink, width = 9, closed = false) {
  if (!pts.length) return
  g.save()
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = colour
  g.fillStyle = colour
  if (pts.length === 1) {
    g.globalAlpha = 0.9
    g.beginPath()
    g.arc(pts[0].x, pts[0].y, width * 0.7, 0, Math.PI * 2)
    g.fill()
    g.restore()
    return
  }
  g.globalAlpha = 0.07
  g.lineWidth = width * 1.6
  trace(g, pts, closed)
  g.stroke()
  g.globalAlpha = 0.82
  g.lineWidth = width
  trace(g, pts, closed, between(rng, -0.6, 0.6), between(rng, -0.6, 0.6))
  g.stroke()
  g.globalAlpha = 0.5
  g.lineWidth = width * 0.45
  trace(g, pts, closed, between(rng, -1.2, 1.2), between(rng, -1.2, 1.2))
  g.stroke()
  g.restore()
}

/** A scribbled fill: one back-and-forth hatch inside the shape, with gaps the tar shows through. */
export function chalkFill(g: G, rng: Rng, shape: readonly Pt[], colour: Ink, angle = -0.5, gap = 9, width = 7) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const p of shape) { x0 = Math.min(x0, p.x); y0 = Math.min(y0, p.y); x1 = Math.max(x1, p.x); y1 = Math.max(y1, p.y) }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, reach = Math.hypot(x1 - x0, y1 - y0) / 2 + gap
  const ux = Math.cos(angle), uy = Math.sin(angle)
  const hatch: Pt[] = []
  let side = 1
  for (let d = -reach; d <= reach; d += gap * between(rng, 0.8, 1.25)) {
    const along = reach * side * between(rng, 0.92, 1.05)
    hatch.push({ x: cx - uy * d + ux * along, y: cy + ux * d + uy * along })
    side = -side
  }
  g.save()
  trace(g, shape, true)
  g.clip()
  g.globalAlpha = 0.3
  g.fillStyle = colour
  g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4)
  g.globalAlpha = 1
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.strokeStyle = colour
  g.globalAlpha = 0.78
  g.lineWidth = width
  g.beginPath()
  hatch.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  g.stroke()
  g.restore()
}

/** A filled and outlined chalk shape. */
export function chalkShape(g: G, rng: Rng, shape: readonly Pt[], fill: Ink | null, line: Ink | null, width = 6, angle = -0.5) {
  if (fill) chalkFill(g, rng, shape, fill, angle, Math.max(6, width * 1.4), Math.max(5, width * 1.1))
  if (line) chalkLine(g, rng, shape, line, width, true)
}

/** Rubs chalk away inside a shape, down to the bare tar: an eye's pupil, a gap in a line. */
export function bare(g: G, shape: readonly Pt[]) {
  g.save()
  g.globalCompositeOperation = 'destination-out'
  trace(g, shape, true)
  g.fill()
  g.restore()
}

/** Loose dust beside a mark. */
export function dust(g: G, rng: Rng, x: number, y: number, spread: number, colour: string, count = 14) {
  g.save()
  g.fillStyle = colour
  for (let i = 0; i < count; i++) {
    const a = between(rng, 0, Math.PI * 2), d = spread * Math.sqrt(rng.next())
    g.globalAlpha = between(rng, 0.15, 0.55)
    g.beginPath()
    g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.7, between(rng, 0.6, 2), 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

/**
 * The grain of the tar as a tile of holes: fine specks where the chalk skipped
 * over the low places, and a few bigger pits. Made once and kept.
 */
export function makeGrain(rng: Rng, size = 256): HTMLCanvasElement {
  const tile = document.createElement('canvas')
  tile.width = tile.height = size
  const g = tile.getContext('2d')!
  const image = g.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    const n = rng.next()
    // Most of the surface takes chalk; about a third takes less, and a few pits take none.
    image.data[i * 4 + 3] = n < 0.07 ? 255 : n < 0.32 ? Math.floor(between(rng, 60, 170)) : n < 0.6 ? Math.floor(between(rng, 0, 50)) : 0
  }
  g.putImageData(image, 0, 0)
  g.fillStyle = '#000'
  for (let i = 0; i < size / 5; i++) {
    g.globalAlpha = between(rng, 0.5, 1)
    g.beginPath()
    g.ellipse(between(rng, 0, size), between(rng, 0, size), between(rng, 0.8, 2.2), between(rng, 0.6, 1.6), between(rng, 0, 3), 0, Math.PI * 2)
    g.fill()
  }
  return tile
}

/** Knocks the grain out of everything drawn on the layer so far. `scale` is the layer's pixels per tile pixel. */
export function roughen(g: G, grain: CanvasImageSource, width: number, height: number, scale = 1) {
  const pattern = g.createPattern(grain, 'repeat')
  if (!pattern) return
  g.save()
  g.setTransform(scale, 0, 0, scale, 0, 0)
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = pattern
  g.fillRect(0, 0, width / scale, height / scale)
  g.restore()
}

/**
 * An ink of one chalk colour with the tar's grain already knocked out of it.
 * A line stroked in it shows the ground as specks, and since the ink is laid
 * from the surface's own corner, the specks fall in the same places for every
 * stroke. `grainSize` is how many surface pixels one pixel of the grain covers.
 */
export function makeInk(g: G, grain: HTMLCanvasElement, colour: string, grainSize = 1): CanvasPattern | null {
  const tile = document.createElement('canvas')
  tile.width = grain.width
  tile.height = grain.height
  const t = tile.getContext('2d')!
  t.fillStyle = colour
  t.fillRect(0, 0, tile.width, tile.height)
  t.globalCompositeOperation = 'destination-out'
  t.drawImage(grain, 0, 0)
  const ink = g.createPattern(tile, 'repeat')
  ink?.setTransform(new DOMMatrix().scale(grainSize))
  return ink
}
