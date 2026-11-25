// The thick black line of the book, with the small tremble of a hand. Every
// shape is a closed or open run of points made once; it is placed, turned and
// stretched point by point, so the line keeps its width however a shape is
// squashed.

export type Shape = { pts: Float32Array; closed: boolean }
export const INK = '#151311'
export const COLOR = {
  red: '#d9321f', yellow: '#f5c21b', blue: '#2279c4', green: '#1f8f4d', white: '#fdfaf1', orange: '#f07f1a',
  brown: '#8a5632', grey: '#a9afb3', skin: '#fbe3c8', night: '#12285c', straw: '#e0a63c', pink: '#ee8d84', ink: INK,
} as const

/** A small steady wobble for a point of a shape: the same each time. */
function tremble(seed: number, i: number): number {
  const s = Math.sin(seed * 127.1 + i * 311.7) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

/** A smooth run through the points given as x, y, x, y. */
export function smooth(seed: number, xy: readonly number[], closed = true, shake = 1.1, steps = 7): Shape {
  const n = xy.length / 2, segs = closed ? n : n - 1
  const out = new Float32Array((segs * steps + (closed ? 0 : 1)) * 2)
  const px = (i: number): number => xy[(closed ? (i + n) % n : Math.min(n - 1, Math.max(0, i))) * 2]
  const py = (i: number): number => xy[(closed ? (i + n) % n : Math.min(n - 1, Math.max(0, i))) * 2 + 1]
  let k = 0
  for (let s = 0; s < segs; s++) {
    for (let j = 0; j < steps + (!closed && s === segs - 1 ? 1 : 0); j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t
      const cr = (a: number, b: number, c: number, d: number): number => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (3 * b - a - 3 * c + d) * t3)
      const w = j % 2 === 0 ? shake : shake * 0.5
      out[k] = cr(px(s - 1), px(s), px(s + 1), px(s + 2)) + tremble(seed, k) * w
      out[k + 1] = cr(py(s - 1), py(s), py(s + 1), py(s + 2)) + tremble(seed + 7, k) * w
      k += 2
    }
  }
  return { pts: out, closed }
}
export function oval(seed: number, rx: number, ry: number, shake = 1.1): Shape {
  const xy: number[] = []
  for (let i = 0; i < 10; i++) xy.push(Math.cos((i / 10) * Math.PI * 2) * rx, Math.sin((i / 10) * Math.PI * 2) * ry)
  return smooth(seed, xy, true, shake, 4)
}
/** Straight sides between the points, each side with its tremble. */
export function poly(seed: number, xy: readonly number[], closed = true, shake = 1.2): Shape {
  const n = xy.length / 2, segs = closed ? n : n - 1, steps = 5
  const out = new Float32Array((segs * steps + (closed ? 0 : 1)) * 2)
  let k = 0
  for (let s = 0; s < segs; s++) {
    const a = s * 2, b = ((s + 1) % n) * 2
    for (let j = 0; j < steps + (!closed && s === segs - 1 ? 1 : 0); j++) {
      const t = j / steps
      out[k] = xy[a] + (xy[b] - xy[a]) * t + tremble(seed, k) * shake
      out[k + 1] = xy[a + 1] + (xy[b + 1] - xy[a + 1]) * t + tremble(seed + 3, k) * shake
      k += 2
    }
  }
  return { pts: out, closed }
}

export type At = { x?: number; y?: number; rot?: number; sx?: number; sy?: number; line?: number; ink?: string }

export class Brush {
  /** Fills and strokes laid since it was last set to 0. */
  laid = 0
  line = 9
  constructor(public pen: CanvasRenderingContext2D) {}

  private trace(s: Shape, at: At): void {
    const { pts } = s, pen = this.pen
    const sx = at.sx ?? 1, sy = at.sy ?? 1, c = Math.cos(at.rot ?? 0), n = Math.sin(at.rot ?? 0), ox = at.x ?? 0, oy = at.y ?? 0
    pen.beginPath()
    for (let i = 0; i < pts.length; i += 2) {
      const x = pts[i] * sx, y = pts[i + 1] * sy
      if (i === 0) pen.moveTo(ox + x * c - y * n, oy + x * n + y * c)
      else pen.lineTo(ox + x * c - y * n, oy + x * n + y * c)
    }
    if (s.closed) pen.closePath()
  }
  /** A filled shape with the line round it; a line of 0 is no line. */
  lay(s: Shape, fill: string | null, at: At = {}): void {
    const pen = this.pen, line = at.line ?? this.line
    this.trace(s, at)
    if (fill) { pen.fillStyle = fill; pen.fill(); this.laid++ }
    if (line > 0) { pen.lineWidth = line; pen.strokeStyle = at.ink ?? INK; pen.stroke(); this.laid++ }
  }
  /** A limb: a bent tube from one spot to another. */
  tube(x0: number, y0: number, mx: number, my: number, x1: number, y1: number, wide: number, fill: string): void {
    const pen = this.pen
    pen.beginPath(); pen.moveTo(x0, y0); pen.quadraticCurveTo(mx, my, x1, y1)
    pen.lineWidth = wide + this.line * 2 - 1; pen.strokeStyle = INK; pen.stroke()
    pen.lineWidth = wide; pen.strokeStyle = fill; pen.stroke()
    this.laid += 2
  }
  dot(x: number, y: number, rx: number, ry: number, fill: string): void {
    const pen = this.pen
    pen.beginPath(); pen.ellipse(x, y, Math.abs(rx), Math.abs(ry), 0, 0, Math.PI * 2)
    pen.fillStyle = fill; pen.fill(); this.laid++
  }
  curve(x0: number, y0: number, mx: number, my: number, x1: number, y1: number, line = this.line, ink: string = INK): void {
    const pen = this.pen
    pen.beginPath(); pen.moveTo(x0, y0); pen.quadraticCurveTo(mx, my, x1, y1)
    pen.lineWidth = line; pen.strokeStyle = ink; pen.stroke(); this.laid++
  }
  ring(x: number, y: number, r: number, a0: number, a1: number, line: number, ink: string = INK): void {
    const pen = this.pen
    pen.beginPath(); pen.arc(x, y, Math.abs(r), a0, a1)
    pen.lineWidth = line; pen.strokeStyle = ink; pen.stroke(); this.laid++
  }
}
