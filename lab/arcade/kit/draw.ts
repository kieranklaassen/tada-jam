// Drawing helpers for the arcade round. Everything takes logical 1180 by 820
// coordinates. The point of this file is character: `eyes`, `face` and
// `sprite` turn a shape into someone, and `squash` makes it move like it has
// weight. Words and numbers are allowed in the lab (`label`).

import { TAU } from './math.ts'
import { drawText, fontFor, outlineWidth } from './text.ts'
import { H, W } from './types.ts'

// A vertical gradient over the whole field: the cheapest backdrop that does
// not look like a blank page.
export function sky(g: CanvasRenderingContext2D, top: string, bottom: string): void {
  const grad = g.createLinearGradient(0, 0, 0, H)
  grad.addColorStop(0, top)
  grad.addColorStop(1, bottom)
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
}

export function circle(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, stroke?: string, width = 4): void {
  g.beginPath()
  g.arc(x, y, Math.max(0, r), 0, TAU)
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = width
    g.stroke()
  }
}

export function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0, rx), Math.max(0, ry), rot, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

// Top-left anchored, like fillRect.
export function rrect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string, width = 4): void {
  g.beginPath()
  g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  g.fillStyle = fill
  g.fill()
  if (stroke) {
    g.strokeStyle = stroke
    g.lineWidth = width
    g.stroke()
  }
}

export function line(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 6): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  g.stroke()
}

// A soft ground shadow. Shrink `scale` as the thing above it rises.
export function shadow(g: CanvasRenderingContext2D, x: number, y: number, rx: number, scale = 1, alpha = 0.22): void {
  g.beginPath()
  g.ellipse(x, y, Math.max(0, rx * scale), Math.max(0, rx * 0.28 * scale), 0, 0, TAU)
  g.fillStyle = `rgba(0,0,0,${alpha})`
  g.fill()
}

export function star(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string, rot = 0): void {
  g.beginPath()
  for (let i = 0; i < 10; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.45
    if (i === 0) g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
    else g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr)
  }
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

export function heart(g: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string): void {
  g.beginPath()
  g.moveTo(x, y + r * 0.9)
  g.bezierCurveTo(x - r * 1.6, y - r * 0.2, x - r * 0.7, y - r * 1.3, x, y - r * 0.4)
  g.bezierCurveTo(x + r * 0.7, y - r * 1.3, x + r * 1.6, y - r * 0.2, x, y + r * 0.9)
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

// Draw `fn` squashed around a point. sx and sy are scales; anchor the point at
// the base of a character (its feet) so it squashes into the ground, not the
// air. `volume(1.25)` gives a matching pair that keeps the area the same.
export function squash(g: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, fn: () => void, rot = 0): void {
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(sx, sy)
  g.translate(-x, -y)
  fn()
  g.restore()
}

// A stretch factor to a volume-preserving scale pair: volume(1.2) is tall and
// thin, volume(0.8) is short and wide.
export function volume(stretch: number): [number, number] {
  const s = Math.max(0.2, stretch)
  return [1 / Math.sqrt(s), s]
}

// Two cartoon eyes centred on (x, y). `size` is one eye's radius. lookX and
// lookY are -1..1 (where the pupils point). `blink` 0 is open, 1 is shut.
export function eyes(g: CanvasRenderingContext2D, x: number, y: number, size: number, lookX = 0, lookY = 0, blink = 0, gap = 1.15): void {
  for (const side of [-1, 1]) {
    const ex = x + side * size * gap
    const open = Math.max(0.08, 1 - blink)
    g.beginPath()
    g.ellipse(ex, y, size, size * open, 0, 0, TAU)
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = Math.max(2, size * 0.14)
    g.strokeStyle = 'rgba(30,20,40,0.85)'
    g.stroke()
    if (open > 0.3) {
      const px = ex + lookX * size * 0.4
      const py = y + lookY * size * 0.4 * open
      g.beginPath()
      g.arc(px, py, size * 0.5, 0, TAU)
      g.fillStyle = '#1e1428'
      g.fill()
      g.beginPath()
      g.arc(px - size * 0.16, py - size * 0.18, size * 0.17, 0, TAU)
      g.fillStyle = '#ffffff'
      g.fill()
    }
  }
}

export type Mood = 'happy' | 'wow' | 'sad' | 'yum' | 'sleepy' | 'grumpy' | 'dizzy' | 'plain'

// Eyes and a mouth: a whole face for a blob. `size` is one eye's radius; the
// face is about 5 sizes wide. For blinking, pass `blinkAt(stage.time, seed)`.
export function face(g: CanvasRenderingContext2D, x: number, y: number, size: number, mood: Mood = 'happy', lookX = 0, lookY = 0, blink = 0): void {
  const shut = mood === 'sleepy' ? 0.85 : mood === 'yum' ? 0.7 : blink
  if (mood === 'dizzy') {
    g.strokeStyle = '#1e1428'
    g.lineWidth = Math.max(2, size * 0.28)
    g.lineCap = 'round'
    for (const side of [-1, 1]) {
      const ex = x + side * size * 1.15
      g.beginPath()
      g.moveTo(ex - size * 0.6, y - size * 0.6)
      g.lineTo(ex + size * 0.6, y + size * 0.6)
      g.moveTo(ex + size * 0.6, y - size * 0.6)
      g.lineTo(ex - size * 0.6, y + size * 0.6)
      g.stroke()
    }
  } else {
    eyes(g, x, y, size, lookX, lookY, shut)
  }
  if (mood === 'grumpy') {
    g.strokeStyle = '#1e1428'
    g.lineWidth = Math.max(2, size * 0.3)
    g.lineCap = 'round'
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(x + side * size * 2.0, y - size * 1.7)
      g.lineTo(x + side * size * 0.5, y - size * 1.1)
      g.stroke()
    }
  }
  const my = y + size * 1.7
  g.lineWidth = Math.max(2, size * 0.28)
  g.lineCap = 'round'
  g.strokeStyle = '#1e1428'
  g.fillStyle = '#1e1428'
  g.beginPath()
  if (mood === 'happy' || mood === 'yum') {
    g.arc(x, my - size * 0.5, size * 1.1, 0.15 * Math.PI, 0.85 * Math.PI)
    g.stroke()
    if (mood === 'yum') {
      g.beginPath()
      g.ellipse(x + size * 0.5, my + size * 0.55, size * 0.4, size * 0.5, 0.3, 0, TAU)
      g.fillStyle = '#ff6b8a'
      g.fill()
    }
  } else if (mood === 'wow') {
    g.ellipse(x, my, size * 0.6, size * 0.8, 0, 0, TAU)
    g.fill()
  } else if (mood === 'sad' || mood === 'grumpy') {
    g.arc(x, my + size * 0.9, size * 0.9, 1.2 * Math.PI, 1.8 * Math.PI)
    g.stroke()
  } else if (mood === 'dizzy') {
    g.moveTo(x - size, my)
    g.quadraticCurveTo(x - size * 0.5, my - size * 0.6, x, my)
    g.quadraticCurveTo(x + size * 0.5, my + size * 0.6, x + size, my)
    g.stroke()
  } else {
    g.moveTo(x - size * 0.7, my)
    g.lineTo(x + size * 0.7, my)
    g.stroke()
  }
}

// 0 most of the time, 1 for a moment every few seconds. `seed` offsets one
// character's blinks from another's.
export function blinkAt(time: number, seed = 0): number {
  const phase = (time + seed * 1.37) % (3.1 + (seed % 3) * 0.7)
  return phase < 0.12 ? 1 : 0
}

// Emoji (or any text) as a sprite, centred on (x, y), `size` pixels tall.
// Rendered once to an offscreen canvas and reused, so dozens per frame are
// cheap. This is how a prototype gets a recognisable watermelon, frog or
// rocket without an art pass.
const spriteCache = new Map<string, HTMLCanvasElement>()
const SPRITE_PX = 160

function spriteFor(char: string): HTMLCanvasElement {
  let canvas = spriteCache.get(char)
  if (canvas) return canvas
  canvas = document.createElement('canvas')
  canvas.width = SPRITE_PX * 1.4
  canvas.height = SPRITE_PX * 1.4
  const c = canvas.getContext('2d')
  if (c) {
    c.font = `${SPRITE_PX}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`
    c.textAlign = 'center'
    c.textBaseline = 'middle'
    c.fillText(char, canvas.width / 2, canvas.height / 2 + SPRITE_PX * 0.06)
  }
  spriteCache.set(char, canvas)
  return canvas
}

export function sprite(g: CanvasRenderingContext2D, char: string, x: number, y: number, size: number, rot = 0, sx = 1, sy = 1): void {
  const img = spriteFor(char)
  const s = (size / SPRITE_PX) * img.width
  if (rot === 0 && sx === 1 && sy === 1) {
    g.drawImage(img, x - s / 2, y - s / 2, s, s)
    return
  }
  g.save()
  g.translate(x, y)
  if (rot) g.rotate(rot)
  g.scale(sx, sy)
  g.drawImage(img, -s / 2, -s / 2, s, s)
  g.restore()
}

// Centred text with an outline, for scores and banners.
export function label(
  g: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size = 40,
  color = '#ffffff',
  outline: string | null = 'rgba(30,20,40,0.85)',
  align: CanvasTextAlign = 'center',
): void {
  // The words are drawn from a cached sprite (see text.ts). The context is
  // still left as a direct fillText would leave it, for callers that go on to
  // measure or draw text of their own.
  g.font = fontFor(size)
  g.textAlign = align
  g.textBaseline = 'middle'
  g.lineJoin = 'round'
  if (outline) {
    g.lineWidth = outlineWidth(size)
    g.strokeStyle = outline
  }
  g.fillStyle = color
  drawText(g, text, x, y, size, color, outline, align)
}

// A pulsing ring and a small bouncing hand: the idle hint. Call it while the
// child has not touched for a few seconds, pointing at what to touch.
export function hint(g: CanvasRenderingContext2D, x: number, y: number, time: number, radius = 60): void {
  const t = (time % 1.2) / 1.2
  g.globalAlpha = 1 - t
  g.strokeStyle = '#ffffff'
  g.lineWidth = 6
  g.beginPath()
  g.arc(x, y, radius * (0.6 + t * 0.6), 0, TAU)
  g.stroke()
  g.globalAlpha = 1
  sprite(g, '👆', x + radius * 0.35, y + radius * 0.75 + Math.sin(time * 6) * 8, radius * 0.9)
}
