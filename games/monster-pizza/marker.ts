import { makeRng, type Rng } from './rng'
import { bounds, streaks, wobble, type Ring } from './shapes'

// The felt-tip look, as a happy five-year-old draws: a bold outline that
// wobbles, a fill of parallel strokes that miss the edge and darken where
// they overlap, and a dark dot where the pen rested. Working pieces are the
// exception: `solid` fills them whole, so nothing distracts from how many
// there are (pack: game-design, working-objects-stay-plain.md).
// Everything here draws in the units of the context it is given.

export type Pen = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D

export const INK = '#2b2a33'
export const PAPER = '#fffdf6'

function trace(g: Pen, ring: Ring, closed: boolean): void {
  const n = ring.length / 2
  g.beginPath()
  if (!closed) {
    g.moveTo(ring[0], ring[1])
    for (let i = 1; i < n - 1; i++) {
      const mx = (ring[i * 2] + ring[i * 2 + 2]) / 2, my = (ring[i * 2 + 1] + ring[i * 2 + 3]) / 2
      g.quadraticCurveTo(ring[i * 2], ring[i * 2 + 1], mx, my)
    }
    g.lineTo(ring[n * 2 - 2], ring[n * 2 - 1])
    return
  }
  // Through the midpoints, so the ring closes without a corner.
  g.moveTo((ring[n * 2 - 2] + ring[0]) / 2, (ring[n * 2 - 1] + ring[1]) / 2)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    g.quadraticCurveTo(ring[i * 2], ring[i * 2 + 1], (ring[i * 2] + ring[j * 2]) / 2, (ring[i * 2 + 1] + ring[j * 2 + 1]) / 2)
  }
  g.closePath()
}

/** A whole, flat fill: for the pieces a child counts, and for paper. */
export function solid(g: Pen, ring: Ring, color: string): void {
  trace(g, ring, true)
  g.fillStyle = color
  g.fill()
}

/** A marker fill: strokes at `angle` that miss the edges and darken where they overlap. */
export function colourIn(g: Pen, ring: Ring, color: string, rng: Rng, angle = -0.5, width = 13): void {
  const lines = streaks(ring, angle, width * 0.82, width * 0.55, rng)
  g.save()
  g.globalCompositeOperation = 'multiply'
  g.strokeStyle = color
  g.lineCap = 'round'
  g.lineWidth = width
  g.globalAlpha = 0.86
  g.beginPath()
  for (const line of lines) {
    g.moveTo(line.x0, line.y0)
    g.lineTo(line.x1, line.y1)
  }
  g.stroke()
  // A second, sparser pass where the hand went back over it.
  g.globalAlpha = 0.3
  g.beginPath()
  for (let i = 0; i < lines.length; i += 3) {
    const line = lines[i]
    g.moveTo(line.x0 + (line.x1 - line.x0) * 0.2, line.y0 + (line.y1 - line.y0) * 0.2 + width * 0.3)
    g.lineTo(line.x1, line.y1 + width * 0.3)
  }
  g.stroke()
  g.restore()
}

/** A bold wobbly outline, with the dot where the pen came to rest. */
export function outline(g: Pen, ring: Ring, rng: Rng, width = 6, color = INK, closed = true, shake = 1.6): void {
  const drawn = wobble(ring, shake, rng)
  g.save()
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  trace(g, drawn, closed)
  g.stroke()
  g.globalCompositeOperation = 'multiply'
  g.fillStyle = color
  g.globalAlpha = 0.55
  const last = drawn.length - 2
  for (const at of closed ? [0] : [0, last]) {
    g.beginPath()
    g.arc(drawn[at], drawn[at + 1], width * 0.72, 0, Math.PI * 2)
    g.fill()
  }
  g.restore()
}

/** A figure in the look: coloured in, then outlined. */
export function figure(g: Pen, ring: Ring, color: string, rng: Rng, angle?: number, width = 6, stroke = 13): void {
  colourIn(g, ring, color, rng, angle, stroke)
  outline(g, ring, rng, width)
}

/** A working piece: one flat colour inside one bold outline, steady and whole. */
export function plain(g: Pen, ring: Ring, color: string, width = 5, edge = INK): void {
  solid(g, ring, color)
  g.save()
  g.strokeStyle = edge
  g.lineWidth = width
  g.lineJoin = 'round'
  trace(g, ring, true)
  g.stroke()
  g.restore()
}

/** A single pen line through the points. */
export function line(g: Pen, points: Ring, rng: Rng, width = 6, color = INK): void {
  outline(g, points, rng, width, color, false)
}

/** A cached drawing. `x` and `y` place its top left corner in the units it was drawn in. */
export type Sprite = { image: CanvasImageSource; x: number; y: number; w: number; h: number }

/**
 * Draws once into a canvas of its own, at `density` device pixels to a unit,
 * and returns it for stamping. `box` is what the drawing covers, in units;
 * `pad` leaves room for the outline and the strokes that run over the edge.
 */
export function sprite(box: { x: number; y: number; w: number; h: number }, density: number, pad: number, draw: (g: Pen) => void): Sprite {
  const x = box.x - pad, y = box.y - pad, w = box.w + pad * 2, h = box.h + pad * 2
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(w * density))
  canvas.height = Math.max(1, Math.ceil(h * density))
  const g = canvas.getContext('2d')!
  g.scale(density, density)
  g.translate(-x, -y)
  draw(g)
  return { image: canvas, x, y, w, h }
}

/** A sprite of one ring drawn as a figure, seeded by name so its wobble is its own and never changes. */
export function figureSprite(ring: Ring, color: string, seed: number, density: number, angle?: number, width = 6, stroke = 13): Sprite {
  return sprite(bounds(ring), density, width + stroke, (g) => figure(g, ring, color, makeRng(seed), angle, width, stroke))
}

export function stamp(g: Pen, s: Sprite, dx = 0, dy = 0): void {
  g.drawImage(s.image, s.x + dx, s.y + dy, s.w, s.h)
}
