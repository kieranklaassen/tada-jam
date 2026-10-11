import type { Rng } from './rng'

// Oil paint, in canvas 2D. Everything in the game is laid down with the three
// marks below: a loaded stroke, a dab, and a filled passage worked over with
// the brush. Each mark is thick paint lit from the window at the upper left:
// a dark edge where the ridge throws its shadow, bristle streaks along the
// pull of the brush, and a wet glint on the ridge that faces the light.
// The marks are made once, into sprites and into the scenery, never per frame.

export type G = CanvasRenderingContext2D

type Rgb = [number, number, number]
const parsed = new Map<string, Rgb>()

function rgb(hex: string): Rgb {
  let value = parsed.get(hex)
  if (!value) {
    if (hex.startsWith('#')) {
      const n = parseInt(hex.slice(1), 16)
      value = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    } else {
      // A colour this module made itself: the first three numbers of it.
      const [r = 0, g = 0, b = 0] = (hex.match(/[\d.]+/g) ?? []).map(Number)
      value = [r, g, b]
    }
    parsed.set(hex, value)
  }
  return value
}

/** A colour moved towards white (`by` above 0) or towards a warm black (below 0). */
export function tone(hex: string, by: number, alpha = 1): string {
  const [r, g, b] = rgb(hex)
  const to: Rgb = by >= 0 ? [255, 248, 226] : [22, 12, 6]
  const t = Math.min(1, Math.abs(by))
  const part = (from: number, target: number): number => Math.round(from + (target - from) * t)
  return `rgba(${part(r, to[0])},${part(g, to[1])},${part(b, to[2])},${alpha})`
}

/** One colour part of the way to another. */
export function blend(a: string, b: string, t: number, alpha = 1): string {
  const [ar, ag, ab] = rgb(a), [br, bg, bb] = rgb(b)
  return `rgba(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)},${alpha})`
}

/** A path through points given as x, y, x, y: straight for two points, curved through the middle ones for more. */
function trace(g: G, pts: readonly number[], dx = 0, dy = 0): void {
  g.beginPath()
  g.moveTo(pts[0] + dx, pts[1] + dy)
  if (pts.length <= 4) {
    g.lineTo(pts[2] + dx, pts[3] + dy)
    return
  }
  for (let i = 2; i < pts.length - 2; i += 2) g.quadraticCurveTo(pts[i] + dx, pts[i + 1] + dy, (pts[i] + pts[i + 2]) / 2 + dx, (pts[i + 1] + pts[i + 3]) / 2 + dy)
  g.lineTo(pts[pts.length - 2] + dx, pts[pts.length - 1] + dy)
}

export class Brush {
  constructor(readonly g: G, private readonly rng: Rng) {}

  /** A number from `low` up to `high`. */
  vary(low: number, high: number): number {
    return low + (high - low) * this.rng.next()
  }

  /**
   * One pull of a loaded brush through the points. `gloss` is how wet the ridge shines, from 0 for a glaze that
   * lies flat to 1 for thick paint.
   */
  stroke(pts: readonly number[], width: number, color: string, gloss = 1): void {
    const g = this.g
    const ax = pts[0], ay = pts[1], bx = pts[pts.length - 2], by = pts[pts.length - 1]
    const length = Math.hypot(bx - ax, by - ay) || 1
    // The normal of the stroke that faces the window.
    let nx = -(by - ay) / length, ny = (bx - ax) / length
    if (nx + ny > 0) { nx = -nx; ny = -ny }
    g.lineCap = 'round'
    g.lineJoin = 'round'
    const edge = width * 0.3
    if (gloss > 0) {
      g.strokeStyle = tone(color, -0.5, 0.55 * gloss)
      g.lineWidth = width
      trace(g, pts, Math.max(0.7, width * 0.1), Math.max(0.7, width * 0.12))
      g.stroke()
    }
    g.strokeStyle = color
    g.lineWidth = width
    trace(g, pts)
    g.stroke()
    if (width >= 3) {
      // Bristle streaks along the pull.
      const streaks = width > 14 ? 4 : 2
      g.lineWidth = Math.max(0.6, width * 0.09)
      for (let i = 0; i < streaks; i++) {
        const off = ((i + 0.5) / streaks - 0.5) * width * 0.62 + this.vary(-0.4, 0.4)
        g.strokeStyle = tone(color, i % 2 ? 0.2 : -0.22, 0.38)
        trace(g, pts, nx * off, ny * off)
        g.stroke()
      }
    }
    if (gloss > 0) {
      g.strokeStyle = tone(color, -0.4, 0.5 * gloss)
      g.lineWidth = Math.max(0.6, width * 0.12)
      trace(g, pts, -nx * edge, -ny * edge)
      g.stroke()
      g.strokeStyle = tone(color, 0.5, 0.78 * gloss)
      g.lineWidth = Math.max(0.7, width * 0.15)
      trace(g, pts, nx * edge, ny * edge)
      g.stroke()
    }
  }

  /** One touch of a loaded brush: an oval of thick paint, turned by `rot`. */
  dab(x: number, y: number, rx: number, ry: number, rot: number, color: string, gloss = 1): void {
    const g = this.g
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    if (gloss > 0) {
      g.fillStyle = tone(color, -0.5, 0.5 * gloss)
      g.beginPath()
      g.ellipse(Math.max(0.6, rx * 0.1), Math.max(0.6, ry * 0.16), rx, ry, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.fillStyle = color
    g.beginPath()
    g.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
    g.fill()
    if (rx > 3) {
      g.lineCap = 'round'
      g.lineWidth = Math.max(0.6, ry * 0.2)
      g.strokeStyle = tone(color, -0.25, 0.4)
      g.beginPath(); g.moveTo(-rx * 0.6, ry * 0.3); g.lineTo(rx * 0.55, ry * 0.36); g.stroke()
      g.strokeStyle = tone(color, 0.22, 0.4)
      g.beginPath(); g.moveTo(-rx * 0.5, -ry * 0.1); g.lineTo(rx * 0.6, -ry * 0.05); g.stroke()
    }
    if (gloss > 0) {
      g.strokeStyle = tone(color, 0.55, 0.8 * gloss)
      g.lineWidth = Math.max(0.7, Math.min(rx, ry) * 0.22)
      g.lineCap = 'round'
      g.beginPath()
      g.ellipse(0, 0, rx * 0.72, ry * 0.62, 0, Math.PI * 1.08, Math.PI * 1.55)
      g.stroke()
    }
    g.restore()
  }

  /**
   * A filled passage: the outline `path` lays down, filled and then worked over with `pulls` strokes of the
   * brush at about the angle `grain`, with a lit rim on the side that faces the window.
   */
  fill(path: (g: G) => void, color: string, pulls = 6, grain = 0, gloss = 1): void {
    const g = this.g
    if (gloss > 0) {
      g.save()
      g.translate(1.6, 2)
      g.fillStyle = tone(color, -0.5, 0.5 * gloss)
      g.beginPath(); path(g); g.fill()
      g.restore()
    }
    g.fillStyle = color
    g.beginPath(); path(g); g.fill()
    g.save()
    g.beginPath(); path(g); g.clip()
    // The brushwork inside it.
    const box = this.box
    g.lineCap = 'round'
    for (let i = 0; i < pulls; i++) {
      const x = this.vary(box.left, box.right), y = this.vary(box.top, box.bottom)
      const reach = this.vary(0.25, 0.6) * Math.max(box.right - box.left, box.bottom - box.top)
      const a = grain + this.vary(-0.25, 0.25)
      g.strokeStyle = tone(color, this.vary(-0.3, 0.3), 0.34)
      g.lineWidth = this.vary(2, 7)
      g.beginPath()
      g.moveTo(x - Math.cos(a) * reach, y - Math.sin(a) * reach)
      g.quadraticCurveTo(x + this.vary(-6, 6), y + this.vary(-6, 6), x + Math.cos(a) * reach, y + Math.sin(a) * reach)
      g.stroke()
    }
    if (gloss > 0) {
      // The rim that faces the light, and the one turned away from it.
      g.lineWidth = 3
      g.strokeStyle = tone(color, -0.45, 0.5 * gloss)
      g.translate(-1.6, -1.8)
      g.beginPath(); path(g); g.stroke()
      g.strokeStyle = tone(color, 0.5, 0.7 * gloss)
      g.translate(3.2, 3.6)
      g.lineWidth = 2.4
      g.beginPath(); path(g); g.stroke()
    }
    g.restore()
  }

  /** The bounds `fill` spreads its brushwork over. Set before a fill. */
  box = { left: 0, top: 0, right: 100, bottom: 100 }

  within(left: number, top: number, right: number, bottom: number): this {
    this.box = { left, top, right, bottom }
    return this
  }
}

let maker = (): HTMLCanvasElement => document.createElement('canvas')

/** Where sprites come from. A test that counts what a frame draws hands in canvases that record instead of painting. */
export function useCanvases(make: () => HTMLCanvasElement): void {
  maker = make
}

/** A canvas to paint a sprite into, `density` pixels to the stage unit. */
export function sheet(width: number, height: number, density: number): { canvas: HTMLCanvasElement; g: G } {
  const canvas = maker()
  canvas.width = Math.max(1, Math.ceil(width * density))
  canvas.height = Math.max(1, Math.ceil(height * density))
  const g = canvas.getContext('2d')! as G
  g.scale(density, density)
  return { canvas, g }
}
