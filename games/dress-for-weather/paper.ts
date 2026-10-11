import { makeRng, type Rng } from './rng'

// The paper-doll look, as a few painters. Every piece is thin printed paper
// cut out with scissors: its outline is straight snips with corners that are
// not quite round, its colour is flat and matte with a faint printed-line
// shading down one side, and the print sits a little off the cut, so a sliver
// of white paper shows along two edges and never all round. A piece lies on
// whatever is under it with a small soft shadow.
// Everything here draws in the units of the context it is given.

export type Pen = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
/** What a sprite is drawn into: a canvas, or a test's stand-in for one. */
export type Sheet = { width: number; height: number; getContext(type: '2d'): Pen | null }

let make: () => Sheet = () => document.createElement('canvas') as unknown as Sheet
/** Hands the painters another source of canvases: a test's, which draws nothing. */
export function useCanvases(factory: () => Sheet): void {
  make = factory
}

/** A closed outline as x, y pairs. */
export type Ring = readonly number[]

export const PAPER = '#fffdf7'
export const PAPER_BACK = '#dcd5c6'
export const KEY_LINE = '#4a3f3a'

export function ring(...xy: number[]): Ring {
  return xy
}

/** The same outline on the other side of the piece's middle. */
export function mirrored(r: Ring): Ring {
  const out: number[] = []
  for (let i = r.length - 2; i >= 0; i -= 2) out.push(-r[i], r[i + 1])
  return out
}

/** A many-sided outline round a middle: a circle as scissors cut it. */
export function round(cx: number, cy: number, rx: number, ry: number, sides = 14, turn = 0): Ring {
  const out: number[] = []
  for (let i = 0; i < sides; i++) {
    const a = turn + (i / sides) * Math.PI * 2
    out.push(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry)
  }
  return out
}

function area(r: Ring): number {
  let sum = 0
  for (let i = 0; i < r.length; i += 2) {
    const j = (i + 2) % r.length
    sum += r[i] * r[j + 1] - r[j] * r[i + 1]
  }
  return sum / 2
}

/** The outline wound one way, so that several in one path add up and never cancel. */
function wound(r: Ring): Ring {
  if (area(r) >= 0) return r
  const out: number[] = []
  for (let i = r.length - 2; i >= 0; i -= 2) out.push(r[i], r[i + 1])
  return out
}

export function boundsOf(rings: readonly Ring[]): { x0: number; y0: number; x1: number; y1: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const r of rings) {
    for (let i = 0; i < r.length; i += 2) {
      x0 = Math.min(x0, r[i]); x1 = Math.max(x1, r[i])
      y0 = Math.min(y0, r[i + 1]); y1 = Math.max(y1, r[i + 1])
    }
  }
  return { x0, y0, x1, y1 }
}

/**
 * Traces an outline as scissors cut it: straight along each side, and round each corner in one short snip
 * whose length differs from corner to corner. Adds a closed subpath; the caller begins the path.
 */
export function snip(g: Pen, outline: Ring, rng: Rng, corner = 7): void {
  const r = wound(outline), n = r.length / 2
  for (let i = 0; i < n; i++) {
    const px = r[((i + n - 1) % n) * 2], py = r[((i + n - 1) % n) * 2 + 1]
    const x = r[i * 2], y = r[i * 2 + 1]
    const nx = r[((i + 1) % n) * 2], ny = r[((i + 1) % n) * 2 + 1]
    const before = Math.hypot(px - x, py - y), after = Math.hypot(nx - x, ny - y)
    const cut = corner * (0.6 + rng.next() * 0.8)
    const a = Math.min(cut, before * 0.45) / (before || 1), b = Math.min(cut * (0.7 + rng.next() * 0.6), after * 0.45) / (after || 1)
    const ax = x + (px - x) * a, ay = y + (py - y) * a, bx = x + (nx - x) * b, by = y + (ny - y) * b
    if (i === 0) g.moveTo(ax, ay)
    else g.lineTo(ax, ay)
    g.lineTo(bx, by)
  }
  g.closePath()
}

/** Faint printed-line shading: thin parallel lines over a box, to be drawn inside a clip. */
export function hatch(g: Pen, x0: number, y0: number, x1: number, y1: number, colour: string, gap = 5, width = 1, slant = 1): void {
  g.beginPath()
  const h = y1 - y0
  for (let x = x0 - h; x < x1 + h; x += gap) {
    g.moveTo(x, y0)
    g.lineTo(x + h * slant, y1)
  }
  g.strokeStyle = colour
  g.lineWidth = width
  g.stroke()
}

/** How far the print sits off the cut, in the piece's units. */
export const OFF_REGISTER = { x: 1.6, y: 1.3 }

export type PieceArt = {
  /** The outlines of the paper: where they overlap they are one piece. */
  rings: readonly Ring[]
  /** The flat colour printed on it. */
  colour: string
  /** The darker tint its shading lines are printed in. */
  shade: string
  /** Printed details, drawn over the colour inside the cut, in the piece's units. */
  print?: (g: Pen) => void
  /** How round the scissors took the corners. */
  corner?: number
  /** A piece that is printed edge to edge has no shading band of its own. */
  flat?: boolean
}

/**
 * Draws one piece of printed, cut paper at the pen's origin: its shadow, the white paper, and the print a
 * little off the cut. `seed` fixes how the scissors went, so a piece is cut the same way each time it is made.
 */
export function printed(g: Pen, art: PieceArt, seed: number, shadow = true): void {
  const trace = () => {
    const rng = makeRng(seed)
    g.beginPath()
    for (const r of art.rings) snip(g, r, rng, art.corner)
  }
  if (shadow) {
    g.save()
    g.shadowColor = 'rgba(30, 40, 30, 0.34)'
    // A shadow is measured in the sheet's own pixels, whatever the pen's units are.
    const k = (g as CanvasRenderingContext2D).getTransform?.().a ?? 1
    g.shadowBlur = 3 * k
    g.shadowOffsetX = 1.5 * k
    g.shadowOffsetY = 2.5 * k
    trace()
    g.fillStyle = PAPER
    g.fill()
    g.restore()
  }
  trace()
  g.fillStyle = PAPER
  g.fill()
  g.save()
  trace()
  g.clip()
  g.translate(OFF_REGISTER.x, OFF_REGISTER.y)
  const box = boundsOf(art.rings)
  // The print itself: the colour to just inside the cut, then the shading lines down the right-hand side.
  g.beginPath()
  for (const r of art.rings) {
    const w = wound(r)
    g.moveTo(w[0], w[1])
    for (let i = 2; i < w.length; i += 2) g.lineTo(w[i], w[i + 1])
    g.closePath()
  }
  g.fillStyle = art.colour
  g.fill()
  if (!art.flat) {
    const from = box.x0 + (box.x1 - box.x0) * 0.6
    g.globalAlpha = 0.55
    hatch(g, from, box.y0, box.x1 + 4, box.y1 + 4, art.shade, 4.5, 1)
    g.globalAlpha = 1
  }
  art.print?.(g)
  // The printed outline, which the scissors followed and did not quite keep to.
  g.beginPath()
  for (const r of art.rings) {
    const w = wound(r)
    g.moveTo(w[0], w[1])
    for (let i = 2; i < w.length; i += 2) g.lineTo(w[i], w[i + 1])
    g.closePath()
  }
  g.strokeStyle = KEY_LINE
  g.lineWidth = 2
  g.lineJoin = 'round'
  g.stroke()
  g.restore()
}

/** A sprite: something drawn once, with where its own origin lies in it, in stage units. */
export type Sprite = { sheet: Sheet; x: number; y: number; w: number; h: number }

/**
 * Makes a sprite of whatever `paint` draws round an origin, inside the given box of stage units, at `density`
 * device pixels a unit. `margin` leaves room for the shadow.
 */
export function sprite(box: { x0: number; y0: number; x1: number; y1: number }, density: number, paint: (g: Pen) => void, margin = 12): Sprite {
  const x = box.x0 - margin, y = box.y0 - margin, w = box.x1 - box.x0 + margin * 2, h = box.y1 - box.y0 + margin * 2
  const sheet = make()
  sheet.width = Math.max(1, Math.ceil(w * density))
  sheet.height = Math.max(1, Math.ceil(h * density))
  const g = sheet.getContext('2d')
  if (g) {
    g.setTransform(density, 0, 0, density, -x * density, -y * density)
    paint(g)
  }
  return { sheet, x, y, w, h }
}

/** A printed piece as a sprite. */
export function printedSprite(art: PieceArt, seed: number, density: number, extra?: (g: Pen) => void): Sprite {
  return sprite(boundsOf(art.rings), density, (g) => {
    printed(g, art, seed)
    extra?.(g)
  })
}
