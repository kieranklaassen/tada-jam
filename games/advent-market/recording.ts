import type { Sheet } from './paint'

// A stand-in for a canvas 2D context, for tests on a machine with no canvas.
// It draws nothing and keeps a record: every stamp with where it landed on
// the surface and how big, how many strokes and fills were made, and how
// many canvases were asked for. Whatever else the painters call is accepted
// and ignored.

export type Stamp = { image: unknown; x: number; y: number; w: number; h: number; turn: number }

type Matrix = [number, number, number, number, number, number]

/** How many fills and strokes have been made with a blur on, on every recording context together. */
let blurred = 0
export const blurredPaint = (): number => blurred

class Record {
  shadowBlur = 0
  stamps: Stamp[] = []
  strokes = 0
  fills = 0
  m: Matrix = [1, 0, 0, 1, 0, 0]
  readonly stack: Matrix[] = []
  constructor(readonly canvas: { width: number; height: number }) {}

  reset(): void {
    this.stamps = []
    this.strokes = 0
    this.fills = 0
    this.inks = []
  }
  save(): void { this.stack.push([...this.m]) }
  restore(): void { this.m = this.stack.pop() ?? this.m }
  setTransform(a: number, b: number, c: number, d: number, e: number, f: number): void { this.m = [a, b, c, d, e, f] }
  private mul(a: number, b: number, c: number, d: number, e: number, f: number): void {
    const [A, B, C, D, E, F] = this.m
    this.m = [A * a + C * b, B * a + D * b, A * c + C * d, B * c + D * d, A * e + C * f + E, B * e + D * f + F]
  }
  translate(x: number, y: number): void { this.mul(1, 0, 0, 1, x, y) }
  scale(x: number, y: number): void { this.mul(x, 0, 0, y, 0, 0) }
  rotate(a: number): void { this.mul(Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0) }
  /** A stamp is kept by where its middle lands on the surface, how big it is there and how far it is turned. A stamp of part of a picture is kept by where that part lands. */
  drawImage(image: unknown, ...at: number[]): void {
    const [x, y, w, h] = at.length > 4 ? at.slice(4) : at
    const [a, b, c, d, e, f] = this.m
    const mx = x + w / 2, my = y + h / 2
    this.stamps.push({ image, x: a * mx + c * my + e, y: b * mx + d * my + f, w: Math.abs(w) * Math.hypot(a, b), h: Math.abs(h) * Math.hypot(c, d), turn: Math.atan2(b, a) })
  }
  fillRect(): void { this.fills += 1; if (this.shadowBlur > 0) blurred += 1 }
  fill(): void { this.fills += 1; if (this.shadowBlur > 0) blurred += 1; this.inked() }
  stroke(): void { this.strokes += 1; if (this.shadowBlur > 0) blurred += 1; this.inked() }
  /** Every figure drawn fresh, as one number made of its path and of where the transform put it: two frames that differ in a figure differ here. */
  inks: number[] = []
  private path = 0
  private inked(): void { this.inks.push(this.path + this.m.reduce((sum, v, i) => sum + v * (i + 1) * 0.37, 0)) }
  private trace(...values: number[]): void { values.forEach((v, i) => { this.path = this.path * 1.0001 + v * (i + 1.5) }) }
  beginPath(): void { this.path = 0 }
  moveTo(x: number, y: number): void { this.trace(x, y) }
  lineTo(x: number, y: number): void { this.trace(x, y, 1) }
  quadraticCurveTo(a: number, b: number, x: number, y: number): void { this.trace(a, b, x, y) }
  ellipse(x: number, y: number, rx: number, ry: number, turn: number): void { this.trace(x, y, rx, ry, turn) }
  arc(x: number, y: number, r: number): void { this.trace(x, y, r) }
  rect(x: number, y: number, w: number, h: number): void { this.trace(x, y, w, h) }
  createRadialGradient(): { addColorStop(): void } { return { addColorStop() {} } }
  createLinearGradient(): { addColorStop(): void } { return { addColorStop() {} } }
}

export type Recording = Record & CanvasRenderingContext2D

/** A recording context. Paths, clips and style settings it does not know are taken and dropped. */
export function recording(width = 0, height = 0): Recording {
  const record = new Record({ width, height })
  const bag: { [key: string | symbol]: unknown } = {}
  return new Proxy(record, {
    get(target, key) {
      if (key in target) {
        const value = (target as unknown as { [key: string | symbol]: unknown })[key]
        return typeof value === 'function' ? value.bind(target) : value
      }
      if (key in bag) return bag[key]
      // A method the record does not keep: beginPath, arc, clip and the rest.
      return () => {}
    },
    set(target, key, value) {
      if (key in target) (target as unknown as { [key: string | symbol]: unknown })[key] = value
      else bag[key] = value
      return true
    },
  }) as unknown as Recording
}

/** Canvases for sprites, which record what is painted into them, and a count of how many were made. */
export function recordingCanvases(): { make: () => Sheet; made: () => number } {
  let made = 0
  return {
    make: () => {
      made += 1
      const g = recording()
      return { width: 0, height: 0, getContext: () => g }
    },
    made: () => made,
  }
}
