import type { Sheet } from './marker'

// A stand-in for a canvas 2D context that draws nothing and keeps a record:
// what was stamped where, how many pen strokes and fills were made, and how
// many canvases were asked for. The frame budget and the overlap tests run
// the real view on it, on a machine with no canvas at all.

export type Stamp = { image: unknown; x: number; y: number; w: number; h: number }

type Matrix = [number, number, number, number, number, number]

export class Recording {
  stamps: Stamp[] = []
  strokes = 0
  fills = 0
  clips = 0
  private m: Matrix = [1, 0, 0, 1, 0, 0]
  private readonly stack: Matrix[] = []
  readonly canvas: { width: number; height: number }
  // The view and the marker set these; nothing reads them back.
  fillStyle: unknown = ''
  strokeStyle: unknown = ''
  lineWidth = 1
  lineCap = 'butt'
  lineJoin = 'miter'
  globalAlpha = 1
  globalCompositeOperation = 'source-over'

  constructor(width = 0, height = 0) {
    this.canvas = { width, height }
  }

  reset(): void {
    this.stamps = []
    this.strokes = 0
    this.fills = 0
    this.clips = 0
  }

  save(): void {
    this.stack.push([...this.m])
  }

  restore(): void {
    this.m = this.stack.pop() ?? this.m
  }

  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.m = [a, b, c, d, e, f]
  }

  private mul(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const [A, B, C, D, E, F] = this.m
    this.m = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F]
  }

  translate(x: number, y: number): void {
    this.mul(1, 0, 0, 1, x, y)
  }

  scale(x: number, y: number): void {
    this.mul(x, 0, 0, y, 0, 0)
  }

  rotate(a: number): void {
    this.mul(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0)
  }

  /** Where a point of the current units lands on the surface. */
  at(x: number, y: number): { x: number; y: number } {
    const [a, b, c, d, e, f] = this.m
    return { x: a * x + c * y + e, y: b * x + d * y + f }
  }

  /** A stamp is recorded by where its middle lands and how big it is there. */
  drawImage(image: unknown, x: number, y: number, w: number, h: number): void {
    const mid = this.at(x + w / 2, y + h / 2)
    const [a, b, c, d] = this.m
    this.stamps.push({ image, x: mid.x, y: mid.y, w: w * Math.hypot(a, b), h: h * Math.hypot(c, d) })
  }

  beginPath(): void {}
  closePath(): void {}
  moveTo(): void {}
  lineTo(): void {}
  quadraticCurveTo(): void {}
  arc(): void {}
  rect(): void {}
  fillRect(): void {
    this.fills += 1
  }
  fill(): void {
    this.fills += 1
  }
  stroke(): void {
    this.strokes += 1
  }
  clip(): void {
    this.clips += 1
  }
}

/** Canvases for sprites that record what is drawn into them, and how many were made. */
export function recordingCanvases(): { make: () => Sheet; made: () => number } {
  let made = 0
  return {
    make: () => {
      made += 1
      const g = new Recording()
      return { width: 0, height: 0, getContext: () => g }
    },
    made: () => made,
  }
}
