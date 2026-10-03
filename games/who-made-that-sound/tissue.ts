// Painted tissue: the game's one material. A sheet is a flat hue covered in
// brush streaks, a piece is a shape cut or torn out of a sheet, and nothing
// has a line round it, a shadow under it or a light on it. Every streak and
// every wobble of an edge comes from one seeded stream, so the same seed
// paints the same page every time.

/** A point of an outline. A third number other than 0 keeps the corner sharp when the outline is softened. */
export type Pt = readonly [number, number, number?]

/** A piece cut out and ready to lay down: where its canvas goes around its joint, in the units it was cut in. */
export type Sprite = { canvas: HTMLCanvasElement; x: number; y: number; w: number; h: number }

// --- The seeded stream -------------------------------------------------------

/** A stream of numbers from 0 up to but not 1 (mulberry32). */
export function stream(seed: number): () => number {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** A seed of its own for each named thing, so adding a piece does not repaint the others. */
export function seedFor(seed: number, name: string): number {
  let hash = seed >>> 0
  for (let i = 0; i < name.length; i++) hash = Math.imul(hash ^ name.charCodeAt(i), 0x01000193) >>> 0
  return hash
}

// --- Shapes to cut -----------------------------------------------------------

/** An oval's corners, for softening. */
export function oval(rx: number, ry: number, cx = 0, cy = 0, corners = 10): Pt[] {
  return Array.from({ length: corners }, (_, i) => {
    const angle = (i / corners) * Math.PI * 2
    return [cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry] as const
  })
}

/** A shape with a left half like its right: `profile` lists a height and the half width there, top to bottom. */
export function lathe(profile: readonly Pt[]): Pt[] {
  const right = profile.map(([y, half, sharp]) => [half, y, sharp] as const)
  const left = profile.filter(([, half]) => half > 0).map(([y, half, sharp]) => [-half, y, sharp] as const).reverse()
  return [...right, ...left]
}

/** A strip folded like a spring, from 0,0 down to 0,`length`: every fold is a sharp corner. */
export function zigzag(length: number, swing: number, folds: number, thick: number): Pt[] {
  const side = (offset: number) => Array.from({ length: folds + 1 }, (_, i) => [(i % 2 ? swing : -swing) + offset, (i / folds) * length, 1] as const)
  return [...side(thick / 2), ...side(-thick / 2).reverse()]
}

/** The same shape seen in a mirror. */
export function mirror(points: readonly Pt[]): Pt[] {
  return points.map(([x, y, sharp]) => [-x, y, sharp] as const).reverse()
}

/** Rounds a closed outline by cutting its corners, `rounds` times over. Sharp corners stay. */
export function soften(points: readonly Pt[], rounds: number): Pt[] {
  let out = [...points]
  for (let round = 0; round < rounds; round++) {
    const next: Pt[] = []
    for (let i = 0; i < out.length; i++) {
      const [x, y, sharp] = out[i], [bx, by] = out[(i + out.length - 1) % out.length], [ax, ay] = out[(i + 1) % out.length]
      if (sharp) next.push(out[i])
      else next.push([x + (bx - x) * 0.25, y + (by - y) * 0.25], [x + (ax - x) * 0.25, y + (ay - y) * 0.25])
    }
    out = next
  }
  return out
}

/**
 * The edge a hand leaves. The outline is walked in steps of `facet` and each
 * stop is pushed off the line by up to `wobble`: long steps give the flat
 * facets of scissors going round a curve, short steps the ragged run of a
 * tear. Sharp corners are kept where they are.
 */
export function handEdge(points: readonly Pt[], facet: number, wobble: number, rand: () => number): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < points.length; i++) {
    const [x, y, sharp] = points[i], [nx, ny] = points[(i + 1) % points.length]
    const length = Math.hypot(nx - x, ny - y)
    out.push(sharp ? [x, y] : [x + (rand() - 0.5) * wobble, y + (rand() - 0.5) * wobble])
    const steps = Math.floor(length / facet)
    for (let step = 1; step < steps; step++) {
      const along = (step + (rand() - 0.5) * 0.5) / steps, off = (rand() - 0.5) * 2 * wobble
      out.push([x + (nx - x) * along - ((ny - y) / length) * off, y + (ny - y) * along + ((nx - x) / length) * off])
    }
  }
  return out
}

export function bounds(points: readonly Pt[]): { x: number; y: number; w: number; h: number } {
  let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity
  for (const [x, y] of points) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y) }
  return { x: left, y: top, w: right - left, h: bottom - top }
}

// --- Colour ------------------------------------------------------------------

/** A hex colour as hue (degrees), saturation and lightness (0 to 1). */
export function toHsl(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  const r = (value >> 16) / 255, g = ((value >> 8) & 255) / 255, b = (value & 255) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b), span = max - min, light = (max + min) / 2
  if (span === 0) return [0, 0, light]
  const hue = max === r ? ((g - b) / span + 6) % 6 : max === g ? (b - r) / span + 2 : (r - g) / span + 4
  return [hue * 60, span / (1 - Math.abs(2 * light - 1)), light]
}

/** The same paint a little off: the hue turned by `turn` degrees and the lightness moved by `lift`. */
export function shade(hex: string, turn: number, lift: number): string {
  const [hue, saturation, was] = toHsl(hex)
  const light = Math.max(0.04, Math.min(0.97, was + lift)), chroma = (1 - Math.abs(2 * light - 1)) * saturation
  const sixth = ((((hue + turn) % 360) + 360) % 360) / 60, second = chroma * (1 - Math.abs((sixth % 2) - 1)), base = light - chroma / 2
  const [r, g, b] = [[chroma, second, 0], [second, chroma, 0], [0, chroma, second], [0, second, chroma], [second, 0, chroma], [chroma, 0, second]][Math.floor(sixth) % 6]
  return '#' + [r, g, b].map((part) => Math.round((part + base) * 255).toString(16).padStart(2, '0')).join('')
}

// --- Painting and cutting ----------------------------------------------------

/** The white page everything is laid on. It shows wherever paint ran thin and along a torn edge. */
export const PAGE = '#fdfbf4'

/** How a sheet is painted: `drama` scales how far the streaks stray from the hue (a working surface keeps it low), `broad` the width of the brush. */
export type Brush = { drama: number; broad: number }

/** Paints one sheet: broad strokes all one way, the drag marks of the bristles in them, and places where the paint ran thin. */
export function paintSheet(hex: string, seed: number, width: number, height: number, brush: Brush): HTMLCanvasElement {
  const sheet = document.createElement('canvas')
  sheet.width = Math.max(1, Math.round(width)); sheet.height = Math.max(1, Math.round(height))
  const ctx = sheet.getContext('2d')!, rand = stream(seed), { drama, broad } = brush
  const reach = Math.hypot(sheet.width, sheet.height) / 2
  ctx.fillStyle = hex
  ctx.fillRect(0, 0, sheet.width, sheet.height)
  ctx.translate(sheet.width / 2, sheet.height / 2)
  ctx.rotate(rand() * Math.PI)
  // One pass of the brush: a band of paint, and the drag marks of its bristles inside the band, each a little
  // lighter or darker and starting and stopping where it likes.
  const pass = (thick: number, colour: string, alpha: number, from: number, to: number, bristles: number) => {
    const across = (rand() * 2 - 1) * reach, bend = (rand() - 0.5) * reach * 0.14, drift = (rand() - 0.5) * reach * 0.08
    const line = (offset: number, width: number, start: number, end: number) => {
      ctx.lineWidth = width
      ctx.beginPath()
      ctx.moveTo(start, across + offset)
      ctx.quadraticCurveTo((from + to) / 2, across + offset + bend, end, across + offset + drift)
      ctx.stroke()
    }
    ctx.strokeStyle = colour
    ctx.globalAlpha = alpha
    line(0, thick, from, to)
    for (let i = 0; i < bristles; i++) {
      const start = from + rand() * (to - from) * 0.5
      ctx.strokeStyle = shade(colour, 0, (rand() < 0.5 ? -1 : 1) * (0.03 + rand() * 0.08) * drama)
      ctx.globalAlpha = 0.25 + rand() * 0.4
      line((rand() - 0.5) * thick, broad * (0.6 + rand() * 1.6), start, start + (to - start) * (0.4 + rand() * 0.6))
    }
  }
  const strokes = Math.round(reach / (broad * 3))
  for (let i = 0; i < strokes; i++) {
    // One stroke in seven carries a little of the next hue along, as a brush not quite washed does.
    const turn = rand() < 0.14 ? (rand() < 0.5 ? -20 : 20) : (rand() - 0.5) * 14, thick = broad * (10 + rand() * 30)
    pass(thick, shade(hex, turn * drama, (rand() - 0.5) * 0.24 * drama), 0.35 + rand() * 0.4, -reach, reach, Math.round(thick / (broad * 4)))
  }
  // Where the paint ran thin the page shows through, in long pale streaks.
  for (let i = 0; i < strokes / 3; i++) pass(broad * (2 + rand() * 7), PAGE, (0.07 + rand() * 0.15) * drama, -reach, reach, 0)
  return sheet
}

function trace(ctx: CanvasRenderingContext2D, points: readonly Pt[]) {
  ctx.beginPath()
  points.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.closePath()
}

/** How a piece leaves the sheet. */
export type Cut = {
  /** Pixels for each unit of the outline. */
  scale: number
  /** How many pixels of the piece one pixel of the sheet covers: over 1 lays the sheet's streaks broader. */
  spread: number
  /** The step and the wobble of the edge, in units (`handEdge`). */
  facet: number
  wobble: number
  /** A torn edge shows the pale inside of the paper, this wide in units; scissors leave none. */
  torn?: number
  /** Thin tissue lets what lies under it show: 1 is opaque. */
  alpha?: number
}

/** Cuts one piece out of a sheet: a sprite around the outline's own 0,0, which is the joint the piece turns on. */
export function cutPiece(sheet: HTMLCanvasElement, outline: readonly Pt[], seed: number, cut: Cut): Sprite {
  const rand = stream(seed), edge = handEdge(outline, cut.facet, cut.wobble, rand), box = bounds(edge), pad = 2 / cut.scale
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil((box.w + pad * 2) * cut.scale); canvas.height = Math.ceil((box.h + pad * 2) * cut.scale)
  const ctx = canvas.getContext('2d')!
  ctx.scale(cut.scale, cut.scale)
  ctx.translate(pad - box.x, pad - box.y)
  ctx.save()
  trace(ctx, edge)
  ctx.clip()
  // The piece comes from anywhere on the sheet, at any turn, so two pieces of one sheet never match. A piece
  // bigger than the sheet has the sheet stretched under it.
  const across = Math.hypot(box.w, box.h) * cut.scale
  const grow = Math.max(cut.spread, (across * 1.02) / Math.min(sheet.width, sheet.height)) / cut.scale
  const slack = (side: number) => (rand() - 0.5) * Math.max(0, side * grow - across / cut.scale)
  ctx.translate(box.x + box.w / 2, box.y + box.h / 2)
  ctx.rotate(Math.floor(rand() * 4) * (Math.PI / 2) + (rand() - 0.5) * 0.5)
  ctx.translate(slack(sheet.width), slack(sheet.height))
  ctx.scale(grow, grow)
  ctx.drawImage(sheet, -sheet.width / 2, -sheet.height / 2)
  ctx.restore()
  if (cut.torn) {
    // The pale rim is the same outline torn a second time, so it runs wide in one place and is gone in the next.
    ctx.globalCompositeOperation = 'source-atop'
    ctx.strokeStyle = PAGE
    ctx.globalAlpha = 0.6
    ctx.lineWidth = cut.torn
    trace(ctx, handEdge(outline, cut.facet * 1.7, cut.wobble + cut.torn * 0.6, rand))
    ctx.stroke()
  }
  if (cut.alpha !== undefined && cut.alpha < 1) {
    ctx.globalCompositeOperation = 'destination-in'
    ctx.globalAlpha = cut.alpha
    ctx.fillRect(box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2)
  }
  return { canvas, x: box.x - pad, y: box.y - pad, w: canvas.width / cut.scale, h: canvas.height / cut.scale }
}
