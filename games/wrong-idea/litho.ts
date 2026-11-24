import { makeRng } from './rng'

// The stone: flat matte colours with soft crayon-grain shading and no line, as
// on a printed classroom chart. Everything is drawn once into a cached sprite;
// the grain is a tile of specks, laid in thinner and thinner layers.

export type G = CanvasRenderingContext2D
export type Canvas = HTMLCanvasElement

export function makeCanvas(w: number, h: number): Canvas {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(w))
  canvas.height = Math.max(1, Math.round(h))
  return canvas
}

const TILE = 192
let tiles: { dark: Canvas; light: Canvas } | null = null

/** Made the first time it is asked for, never at module load. */
function grain(): { dark: Canvas; light: Canvas } {
  if (tiles) return tiles
  const make = (seed: number, rgb: [number, number, number]) => {
    const canvas = makeCanvas(TILE, TILE), g = canvas.getContext('2d')!
    const rng = makeRng(seed)
    g.fillStyle = `rgb(${rgb.join()})`
    for (let i = 0; i < 5200; i++) {
      g.globalAlpha = 0.12 + rng.next() * 0.5
      const s = 0.8 + rng.next() * 1.5
      g.fillRect(rng.next() * TILE, rng.next() * TILE, s, s * (0.7 + rng.next() * 0.6))
    }
    return canvas
  }
  tiles = { dark: make(11, [52, 30, 26]), light: make(23, [255, 246, 220]) }
  return tiles
}

/** Crayon along one side of whatever is clipped: from nothing to thick over the box, in thin layers. */
function rub(g: G, which: 'dark' | 'light', x: number, y: number, w: number, h: number, angle: number, strength: number): void {
  const tile = grain()[which]
  g.save()
  const cx = x + w / 2, cy = y + h / 2, reach = (Math.abs(Math.cos(angle)) * w + Math.abs(Math.sin(angle)) * h) / 2, across = Math.hypot(w, h)
  g.translate(cx, cy)
  g.rotate(angle)
  const layers = 14
  for (let i = 0; i < layers; i++) {
    const pattern = g.createPattern(tile, 'repeat')
    if (!pattern) break
    g.globalAlpha = strength * (0.1 + i * 0.026)
    g.fillStyle = pattern
    g.save()
    g.translate(i * 37, i * 53)
    g.fillRect(reach * (-0.45 + i * 0.1) - i * 37, -across - i * 53, reach * 2, across * 2)
    g.restore()
  }
  g.restore()
}

export type Path = (g: G) => void

/** One flat of colour: filled, dark crayon on the side away from the light, a little light on the other. */
export function flat(g: G, path: Path, colour: string, box: readonly [number, number, number, number], shade = 0.6, angle = 0.5): void {
  g.beginPath()
  path(g)
  g.fillStyle = colour
  g.fill()
  if (shade <= 0) return
  g.save()
  g.clip()
  rub(g, 'dark', box[0], box[1], box[2], box[3], angle, shade)
  rub(g, 'light', box[0], box[1], box[2], box[3], angle + Math.PI, shade * 0.42)
  g.restore()
}

export function ellipse(x: number, y: number, rx: number, ry: number, turn = 0): Path {
  return (g) => g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), turn, 0, Math.PI * 2)
}

export function round(x: number, y: number, w: number, h: number, r: number): Path {
  return (g) => g.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
}

export function poly(...points: readonly (readonly [number, number])[]): Path {
  return (g) => {
    points.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
    g.closePath()
  }
}

/** A closed soft shape through its points. */
export function soft(...p: readonly (readonly [number, number])[]): Path {
  return (g) => {
    const mid = (a: readonly [number, number], b: readonly [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const
    const start = mid(p[p.length - 1], p[0])
    g.moveTo(start[0], start[1])
    p.forEach((one, i) => {
      const to = mid(one, p[(i + 1) % p.length])
      g.quadraticCurveTo(one[0], one[1], to[0], to[1])
    })
    g.closePath()
  }
}

export function mix(a: string, b: string, t: number): string {
  const read = (c: string) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
  const [x, y] = [read(a), read(b)]
  return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}

type Sprite = { canvas: Canvas; x: number; y: number; w: number; h: number }

/** Everything that is painted once, at the ratio it is shown at. */
export class Sprites {
  private readonly made = new Map<string, Sprite>()
  ratio = 1
  drawn = 0

  resize(ratio: number): void {
    if (Math.abs(ratio - this.ratio) < 0.01) return
    this.ratio = ratio
    this.made.clear()
  }

  /** The sprite's box is in the units of what is drawn, about its own origin. */
  get(key: string, box: readonly [number, number, number, number], paint: (g: G) => void): Sprite {
    let sprite = this.made.get(key)
    if (!sprite) {
      const [x, y, w, h] = box
      const canvas = makeCanvas(w * this.ratio, h * this.ratio), g = canvas.getContext('2d')!
      g.scale(this.ratio, this.ratio)
      g.translate(-x, -y)
      paint(g)
      sprite = { canvas, x, y, w, h }
      this.made.set(key, sprite)
    }
    return sprite
  }

  stamp(g: G, key: string, box: readonly [number, number, number, number], paint: (g: G) => void): void {
    const sprite = this.get(key, box, paint)
    g.drawImage(sprite.canvas, sprite.x, sprite.y, sprite.w, sprite.h)
    this.drawn += 1
  }
}
