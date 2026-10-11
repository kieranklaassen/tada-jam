import { makeRng, type Rng } from './rng'

// The look's materials: red and yellow ochre, charcoal and white clay, rubbed
// onto rock. A shape is filled with pigment and then worn through a grain, so
// the rock shows in specks, as it does where pigment is rubbed on by hand.
// Everything is drawn once into a sprite and stamped.

export const ROCK = '#c9b08a'
export const ROCK_LIGHT = '#dcc7a2'
export const ROCK_DARK = '#9c8160'
export const RED = '#a8431d'
export const RED_DEEP = '#7b2c12'
export const RED_PALE = '#c8683e'
export const YELLOW = '#d79c34'
export const YELLOW_DEEP = '#a66f1c'
export const CHARCOAL = '#2b211b'
export const CHARCOAL_PALE = '#584a3f'
export const CLAY = '#f1e8d3'
/** Dug space: charcoal rubbed in until the rock is gone. */
export const DARK = '#1a120e'
/** The one bright thing in the toy: the candle on the mole's hat. */
export const FLAME = '#ffc84a'

export type Paint = CanvasRenderingContext2D
/** A picture drawn once. `w` and `h` are its size in stage units, and `ax`, `ay` the point of it that is placed. */
export type Sprite = { image: HTMLCanvasElement; w: number; h: number; ax: number; ay: number }
export type MakeCanvas = (width: number, height: number) => HTMLCanvasElement

export type Pt = readonly [number, number]

/** A closed soft outline through points. */
export function blob(g: Paint, points: readonly Pt[]): void {
  const n = points.length
  const mid = (a: Pt, b: Pt): Pt => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
  const start = mid(points[n - 1], points[0])
  g.beginPath()
  g.moveTo(start[0], start[1])
  for (let i = 0; i < n; i++) {
    const m = mid(points[i], points[(i + 1) % n])
    g.quadraticCurveTo(points[i][0], points[i][1], m[0], m[1])
  }
  g.closePath()
}

/** An open soft line through points. */
export function trail(g: Paint, points: readonly Pt[]): void {
  g.beginPath()
  g.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i][0] + points[i + 1][0]) / 2, my = (points[i][1] + points[i + 1][1]) / 2
    g.quadraticCurveTo(points[i][0], points[i][1], mx, my)
  }
  const last = points[points.length - 1]
  g.lineTo(last[0], last[1])
}

/** The points of a rounded box whose edge wanders by `wander`, as a hand-rubbed patch does. */
export function patch(rng: Rng, x: number, y: number, w: number, h: number, wander: number): Pt[] {
  const out: Pt[] = []
  const per = 4
  const edge = (ax: number, ay: number, bx: number, by: number): void => {
    for (let i = 0; i < per; i++) {
      const t = (i + 0.5) / per
      out.push([ax + (bx - ax) * t + (rng.next() - 0.5) * wander, ay + (by - ay) * t + (rng.next() - 0.5) * wander])
    }
  }
  edge(x, y, x + w, y)
  edge(x + w, y, x + w, y + h)
  edge(x + w, y + h, x, y + h)
  edge(x, y + h, x, y)
  return out
}

/** An oval as points, with a little wander. */
export function oval(rng: Rng | null, cx: number, cy: number, rx: number, ry: number, wander = 0, count = 12): Pt[] {
  const out: Pt[] = []
  for (let i = 0; i < count; i++) {
    const a = (i / count) * Math.PI * 2
    const k = 1 + (rng ? (rng.next() - 0.5) * wander : 0)
    out.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k])
  }
  return out
}

/** A charcoal line as a stick of charcoal draws it: twice, a hair apart, so it is never one clean stroke. */
export function charcoal(g: Paint, draw: () => void, width: number, color: string = CHARCOAL): void {
  g.save()
  g.strokeStyle = color
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.lineWidth = width
  g.globalAlpha *= 0.9
  draw()
  g.stroke()
  g.translate(width * 0.35, -width * 0.25)
  g.lineWidth = width * 0.5
  g.globalAlpha *= 0.55
  draw()
  g.stroke()
  g.restore()
}

/** Dots of pigment put on with a fingertip. */
export function fingerDots(g: Paint, rng: Rng, color: string, count: number, x: number, y: number, w: number, h: number, size: number): void {
  g.fillStyle = color
  for (let i = 0; i < count; i++) {
    const r = size * (0.7 + rng.next() * 0.6)
    g.beginPath()
    g.ellipse(x + rng.next() * w, y + rng.next() * h, r, r * (0.8 + rng.next() * 0.3), rng.next() * 3, 0, Math.PI * 2)
    g.fill()
  }
}

export class Pigments {
  private readonly grain: HTMLCanvasElement
  /** How many pictures were drawn, for the count of what a resize costs. */
  made = 0

  /** `k` is how many pixels of the canvas one stage unit is: the fit's scale times the pixel ratio. */
  constructor(readonly k: number, private readonly make: MakeCanvas) {
    // The grain: specks and a few larger bare patches, tiled. Fixed, so the rock looks the same on every visit.
    const size = 192
    const rng = makeRng(0x6a11)
    this.grain = make(size, size)
    const g = this.grain.getContext('2d')!
    g.fillStyle = '#000'
    for (let i = 0; i < 2400; i++) {
      g.globalAlpha = 0.25 + rng.next() * 0.75
      const s = 0.7 + rng.next() * 2.1
      g.fillRect(rng.next() * size, rng.next() * size, s, s * (0.6 + rng.next() * 0.8))
    }
    for (let i = 0; i < 26; i++) {
      g.globalAlpha = 0.12 + rng.next() * 0.22
      g.beginPath()
      g.ellipse(rng.next() * size, rng.next() * size, 4 + rng.next() * 9, 2 + rng.next() * 5, rng.next() * 3, 0, Math.PI * 2)
      g.fill()
    }
  }

  /**
   * Draws a picture once. `paint` draws in stage units with the placed point at the origin; the picture is then
   * worn through the grain by `wear`, 0 for none and 1 for rubbed nearly away.
   */
  sprite(w: number, h: number, ax: number, ay: number, paint: (g: Paint) => void, wear = 0.4): Sprite {
    const k = this.k
    const image = this.make(Math.max(1, Math.ceil(w * k)), Math.max(1, Math.ceil(h * k)))
    const g = image.getContext('2d')!
    g.setTransform(k, 0, 0, k, ax * k, ay * k)
    paint(g)
    if (wear > 0) this.wear(g, image.width, image.height, wear, this.made * 37)
    this.made += 1
    return { image, w, h, ax, ay }
  }

  /** Rubs away part of what a context holds, through the grain. */
  wear(g: Paint, width: number, height: number, amount: number, shift = 0): void {
    g.save()
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'destination-out'
    g.globalAlpha = amount
    const pattern = g.createPattern(this.grain, 'repeat')
    if (pattern) {
      g.translate(-(shift % 192), -((shift * 7) % 192))
      g.fillStyle = pattern
      g.fillRect(0, 0, width + 192, height + 192)
    }
    g.restore()
  }
}

/** Stamps a picture with its placed point at `x`, `y`. */
export function stamp(g: Paint, sprite: Sprite, x: number, y: number): void {
  g.drawImage(sprite.image, x - sprite.ax, y - sprite.ay, sprite.w, sprite.h)
}

/** Stamps a picture turned and stretched about its placed point. */
export function stampTurned(g: Paint, sprite: Sprite, x: number, y: number, turn: number, sx = 1, sy = 1): void {
  g.save()
  g.translate(x, y)
  if (turn) g.rotate(turn)
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  g.drawImage(sprite.image, -sprite.ax, -sprite.ay, sprite.w, sprite.h)
  g.restore()
}
