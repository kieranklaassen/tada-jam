import { makeRng } from './rng'

// The stone: coloured glass in black lead, lit from behind. A piece is a flat
// fill with a thick dark line round it; large panes get streaks and bubbles.

export type G = CanvasRenderingContext2D
export type Canvas = HTMLCanvasElement
export type Draw = (g: G) => void

export const LEAD = '#06050b'

export function makeCanvas(w: number, h: number): Canvas {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w))
  canvas.height = Math.max(1, Math.round(h))
  return canvas
}

let streaks: Canvas | null = null
const TILE = 256

/** Streaks and bubbles, made the first time they are asked for and never at module load. */
export function streakTile(): Canvas {
  if (streaks) return streaks
  const canvas = makeCanvas(TILE, TILE), g = canvas.getContext('2d')!, rng = makeRng(77)
  for (let i = 0; i < 46; i++) {
    const x = rng.next() * TILE, y = rng.next() * TILE, w = 30 + rng.next() * 110, bend = (rng.next() - 0.5) * 26
    g.strokeStyle = rng.next() < 0.6 ? `rgba(255,255,255,${0.05 + rng.next() * 0.1})` : `rgba(0,0,20,${0.06 + rng.next() * 0.12})`
    g.lineWidth = 2 + rng.next() * 10
    g.lineCap = 'round'
    for (const [ox, oy] of [[0, 0], [-TILE, 0], [0, -TILE]]) { g.beginPath(); g.moveTo(x + ox, y + oy); g.quadraticCurveTo(x + ox + w / 2, y + oy + bend, x + ox + w, y + oy + w * 0.3); g.stroke() }
  }
  for (let i = 0; i < 26; i++) {
    g.fillStyle = 'rgba(255,255,255,0.16)'
    g.beginPath(); g.ellipse(rng.next() * TILE, rng.next() * TILE, 1 + rng.next() * 2.4, 1 + rng.next() * 1.4, 0.4, 0, 7); g.fill()
  }
  streaks = canvas
  return canvas
}

const paths = new Map<string, Path2D>()
/** A shape by its outline, kept. */
export function shape(d: string): Path2D {
  let path = paths.get(d)
  // Shapes that move are new each frame: let the lot go before it grows.
  if (!path && paths.size > 900) paths.clear()
  if (!path) paths.set(d, (path = new Path2D(d)))
  return path
}

/** What the last frame filled, for the grown-up's overlay and the budget test. */
export const count = { fills: 0 }

/** One piece of glass in its lead. */
export function piece(g: G, d: string, color: string, lead = 5): void {
  const path = shape(d)
  g.fillStyle = color
  g.fill(path)
  if (lead > 0) { g.strokeStyle = LEAD; g.lineWidth = lead; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(path) }
  count.fills++
}

export function oval(g: G, x: number, y: number, rx: number, ry: number, color: string, lead = 5, turn = 0): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), turn, 0, Math.PI * 2)
  g.fillStyle = color
  g.fill()
  if (lead > 0) { g.strokeStyle = LEAD; g.lineWidth = lead; g.stroke() }
  count.fills++
}

/** A bare line of lead. */
export function line(g: G, d: string, width = 4, color = LEAD): void {
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.stroke(shape(d))
  count.fills++
}

/** The light that comes through a piece: a soft pale sliver. */
export function shine(g: G, x: number, y: number, rx: number, ry: number, turn = 0, strength = 0.28): void {
  g.globalAlpha *= strength
  oval(g, x, y, rx, ry, '#fff8e0', 0, turn)
  g.globalAlpha /= strength
}

/** An eye of milk glass: it looks, it blinks, and it can be wide or sleepy. */
export function eye(g: G, x: number, y: number, r: number, open: number, look: { x: number; y: number }, pupil = 0.52): void {
  if (open < 0.14) {
    g.strokeStyle = LEAD; g.lineWidth = Math.max(3, r * 0.3); g.lineCap = 'round'
    g.beginPath(); g.arc(x, y - r * 0.25, r * 0.85, 0.25, Math.PI - 0.25); g.stroke()
    count.fills++
    return
  }
  oval(g, x, y, r, r * Math.min(1.2, open), '#fbf6e4', Math.max(2.5, r * 0.22))
  oval(g, x + look.x * r * 0.4, y + look.y * r * 0.34 * Math.min(1, open), r * pupil, r * pupil * Math.min(1, open), '#140f1e', 0)
  oval(g, x + look.x * r * 0.4 - r * 0.16, y + look.y * r * 0.34 * open - r * 0.2, r * 0.15, r * 0.15 * Math.min(1, open), '#ffffff', 0)
}

let glowSprite: Canvas | null = null
/** One soft glow, made once and tinted by nothing: warm candle light. */
export function glow(g: G, x: number, y: number, r: number, strength: number): void {
  if (!glowSprite) {
    glowSprite = makeCanvas(256, 256)
    const c = glowSprite.getContext('2d')!
    const fade = c.createRadialGradient(128, 128, 4, 128, 128, 126)
    fade.addColorStop(0, 'rgba(255,244,200,0.95)')
    fade.addColorStop(0.25, 'rgba(255,214,120,0.5)')
    fade.addColorStop(0.6, 'rgba(255,170,70,0.16)')
    fade.addColorStop(1, 'rgba(255,150,40,0)')
    c.fillStyle = fade
    c.fillRect(0, 0, 256, 256)
  }
  const before = g.globalCompositeOperation, alpha = g.globalAlpha
  g.globalCompositeOperation = 'lighter'
  g.globalAlpha = alpha * Math.min(1, strength)
  g.drawImage(glowSprite, x - r, y - r, r * 2, r * 2)
  g.globalCompositeOperation = before
  g.globalAlpha = alpha
  count.fills++
}

/** A candle flame standing on (x, y). */
export function flame(g: G, x: number, y: number, size: number, time: number, lean = 0, tall = 1): void {
  const flick = Math.sin(time * 11) * 0.06 + Math.sin(time * 17.3) * 0.05
  g.save()
  g.translate(x, y)
  g.rotate(Math.max(-1.5, Math.min(1.5, lean * 0.7)) + flick * 0.6)
  g.scale(size, size * tall * (1 + flick))
  piece(g, 'M0 -62 C 8 -42 22 -30 20 -12 C 19 4 8 8 0 8 C -8 8 -19 4 -20 -12 C -22 -30 -8 -42 0 -62 Z', '#f58a1f', 4)
  piece(g, 'M0 -42 C 6 -28 13 -20 12 -8 C 11 2 5 5 0 5 C -5 5 -11 2 -12 -8 C -13 -20 -6 -28 0 -42 Z', '#ffd24a', 0)
  piece(g, 'M0 -20 C 3 -14 6 -10 6 -4 C 5 2 3 3 0 3 C -3 3 -5 2 -6 -4 C -6 -10 -3 -14 0 -20 Z', '#fffbe6', 0)
  g.restore()
}

/** An apple with its candle, the foot of the apple at (0, 0). */
export function apple(g: G, color: string, k: number, lit: boolean, time: number): void {
  g.save()
  g.scale(k, k)
  piece(g, 'M-7 -40 L7 -40 L6 -66 L-6 -66 Z', '#fbf0d2', 4)
  if (!lit) line(g, 'M0 -66 L1 -74', 4)
  piece(g, 'M0 -37 C 12 -46 34 -40 33 -19 C 32 -2 16 2 0 0 C -16 2 -32 -2 -33 -19 C -34 -40 -12 -46 0 -37 Z', color, 5)
  shine(g, -14, -24, 6, 10, 0.5, 0.5)
  piece(g, 'M10 -39 C 18 -54 30 -52 34 -48 C 28 -40 18 -36 10 -39 Z', '#3f9a3c', 3.5)
  if (lit) flame(g, 0, -68, 0.5, time)
  g.restore()
}
