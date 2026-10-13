import type { Sheet } from './print'

// A stand-in for a canvas 2D context that draws nothing and keeps a record:
// which sheets were stamped where and how large, how many strokes and fills
// the pen made, how many sheets were asked for, and one number folded from
// every call and every figure passed to it, so two frames that differ
// anywhere differ in that number. The frame budget and the pose tests run
// the real view on it, on a machine with no canvas at all.

export type Stamped = { image: unknown; x: number; y: number; w: number; h: number }

type Matrix = [number, number, number, number, number, number]

const shade = { addColorStop(): void {} }

export class Recording {
  stamped: Stamped[] = []
  strokes = 0
  fills = 0
  private m: Matrix = [1, 0, 0, 1, 0, 0]
  private readonly stack: Matrix[] = []
  // The painters set these; nothing reads them back.
  fillStyle: unknown = ''
  strokeStyle: unknown = ''
  lineWidth = 1
  lineCap = 'butt'
  lineJoin = 'miter'
  globalAlpha = 1
  globalCompositeOperation = 'source-over'

  /** Every call since the last reset, folded into one number. */
  digest = 0

  reset(): void {
    this.stamped = []
    this.strokes = 0
    this.fills = 0
    this.digest = 0
  }

  private note(call: number, figures: readonly number[]): void {
    let h = Math.imul(this.digest ^ call, 0x9e3779b1) >>> 0
    for (const figure of figures) h = Math.imul(h ^ Math.round(figure * 100), 0x85ebca6b) >>> 0
    this.digest = h
  }

  save(): void {
    this.stack.push([...this.m] as Matrix)
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

  transform(a: number, b: number, c: number, d: number, e: number, f: number): void {
    this.mul(a, b, c, d, e, f)
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

  /** A stamp is recorded by where its middle lands on the surface and how big it is there. Both forms of the call are read. */
  drawImage(image: unknown, ...at: number[]): void {
    const [x, y, w, h] = at.length === 8 ? at.slice(4) : at
    const [a, b, c, d, e, f] = this.m
    this.note(1, [...at, a, b, c, d, e, f, this.globalAlpha])
    const mx = x + w / 2, my = y + h / 2
    this.stamped.push({ image, x: a * mx + c * my + e, y: b * mx + d * my + f, w: w * Math.hypot(a, b), h: h * Math.hypot(c, d) })
  }

  createLinearGradient(): typeof shade {
    return shade
  }

  createRadialGradient(): typeof shade {
    return shade
  }

  createPattern(): unknown {
    return {}
  }

  /** A point of a path is noted where it lands on the surface. */
  private at(call: number, figures: readonly number[]): void {
    this.note(call, [...figures, ...this.m])
  }

  beginPath(): void { this.note(2, []) }
  closePath(): void { this.note(3, []) }
  moveTo(...to: number[]): void { this.at(4, to) }
  lineTo(...to: number[]): void { this.at(5, to) }
  quadraticCurveTo(...to: number[]): void { this.at(6, to) }
  arc(...to: number[]): void { this.at(7, to) }
  ellipse(...to: number[]): void { this.at(8, to) }
  rect(...to: number[]): void { this.at(9, to) }
  clip(): void { this.note(10, []) }
  private ink(call: number, style: unknown, more: readonly number[]): void {
    let tone = 0
    for (const letter of typeof style === 'string' ? style : '') tone = (tone * 31 + letter.charCodeAt(0)) % 99991
    this.note(call, [tone, this.globalAlpha, ...more])
  }
  fillRect(...to: number[]): void {
    this.fills += 1
    this.ink(11, this.fillStyle, [...to, ...this.m])
  }
  fill(): void {
    this.fills += 1
    this.ink(12, this.fillStyle, [])
  }
  stroke(): void {
    this.strokes += 1
    this.ink(13, this.strokeStyle, [this.lineWidth])
  }
}

/** Sheets that record what is printed on them, and how many were made. */
export function recordingSheets(): { make: (width: number, height: number) => Sheet; made: () => number } {
  let made = 0
  return {
    make: (width, height) => {
      made += 1
      const g = new Recording()
      return { width, height, getContext: () => g }
    },
    made: () => made,
  }
}
