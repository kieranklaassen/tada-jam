// The drawing kit of the scratch card. A figure is not a sprite: it is a
// handful of rough lines and shapes written into four buckets as numbers in
// stage units, and the view scrapes each bucket with one stroke or one fill.
//   hide    the wax a figure stands on, so nothing behind shows through it
//   lines   scraped lines
//   whites  scraped-clear shapes: the eyes, a lamp
//   pupils  wax left standing inside a white
// Nothing here knows a canvas, so the figures can be measured in a test.

/** A list of paths as flat numbers: the points of every path one after another, and where each path ends. */
export class Bucket {
  pts: Float32Array
  ends: Int32Array
  /** Numbers in `pts`, and paths in `ends`. */
  n = 0
  m = 0

  constructor(points = 2048, paths = 256) {
    this.pts = new Float32Array(points * 2)
    this.ends = new Int32Array(paths)
  }

  clear(): void {
    this.n = 0
    this.m = 0
  }

  point(x: number, y: number): void {
    if (this.n + 2 > this.pts.length) {
      const grown = new Float32Array(this.pts.length * 2)
      grown.set(this.pts)
      this.pts = grown
    }
    this.pts[this.n++] = x
    this.pts[this.n++] = y
  }

  /** Ends the path that the points since the last end belong to. A path of fewer than two points is dropped. */
  end(): void {
    const from = this.m === 0 ? 0 : this.ends[this.m - 1]
    if (this.n - from < 4) {
      this.n = from
      return
    }
    if (this.m + 1 > this.ends.length) {
      const grown = new Int32Array(this.ends.length * 2)
      grown.set(this.ends)
      this.ends = grown
    }
    this.ends[this.m++] = this.n
  }
}

/** A whole number mixed into a number from -1 up to 1, the same on every machine. */
export function noise(a: number, b: number): number {
  let h = (Math.imul(a | 0, 0x9e3779b1) ^ Math.imul(b | 0, 0x85ebca6b)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0
  return ((h ^ (h >>> 15)) >>> 0) / 2147483648 - 1
}

export type BucketName = 'hide' | 'lines' | 'whites' | 'pupils'

/**
 * Four buckets and a pen. The pen keeps a stack of placements (move, turn, stretch), so a head is written
 * round its own neck and a figure round its own feet. Every point of a line is nudged by `wobble` stage units,
 * by a number that depends on `boil`: a view that steps `boil` a few times a second gets lines that shiver as
 * hand-scraped frames do, and one that leaves it alone gets lines that stand still.
 */
export class Sketch {
  readonly hide = new Bucket(1024, 64)
  readonly lines = new Bucket(4096, 512)
  readonly whites = new Bucket(512, 64)
  readonly pupils = new Bucket(512, 64)
  wobble = 1.1
  boil = 0
  private a = 1
  private b = 0
  private c = 0
  private d = 1
  private e = 0
  private f = 0
  private readonly stack: number[] = []
  private path = 0

  clear(): void {
    this.hide.clear()
    this.lines.clear()
    this.whites.clear()
    this.pupils.clear()
    this.stack.length = 0
    this.a = 1; this.b = 0; this.c = 0; this.d = 1; this.e = 0; this.f = 0
    this.path = 0
  }

  /** Places what follows at `x`, `y` of the placement so far, turned by `turn` and stretched by `sx`, `sy`. */
  push(x: number, y: number, turn = 0, sx = 1, sy = sx): void {
    this.stack.push(this.a, this.b, this.c, this.d, this.e, this.f)
    const cos = Math.cos(turn), sin = Math.sin(turn)
    const e = this.a * x + this.c * y + this.e, f = this.b * x + this.d * y + this.f
    const a = (this.a * cos + this.c * sin) * sx, b = (this.b * cos + this.d * sin) * sx
    const c = (this.c * cos - this.a * sin) * sy, d = (this.d * cos - this.b * sin) * sy
    this.a = a; this.b = b; this.c = c; this.d = d; this.e = e; this.f = f
  }

  pop(): void {
    const s = this.stack
    this.f = s.pop()!; this.e = s.pop()!; this.d = s.pop()!; this.c = s.pop()!; this.b = s.pop()!; this.a = s.pop()!
  }

  /** Where a point of the placement so far lands on the stage. */
  at(x: number, y: number, out: { x: number; y: number }): { x: number; y: number } {
    out.x = this.a * x + this.c * y + this.e
    out.y = this.b * x + this.d * y + this.f
    return out
  }

  /** A step on the stage, as the same step in the placement so far: the way back through every turn, stretch and mirror. */
  back(dx: number, dy: number, out: { x: number; y: number }): { x: number; y: number } {
    const det = this.a * this.d - this.b * this.c || 1
    out.x = (this.d * dx - this.c * dy) / det
    out.y = (this.a * dy - this.b * dx) / det
    return out
  }

  private put(bucket: Bucket, x: number, y: number, rough: boolean): void {
    let px = this.a * x + this.c * y + this.e, py = this.b * x + this.d * y + this.f
    if (rough && this.wobble > 0) {
      const i = bucket.n
      px += noise(this.path * 131 + i, this.boil) * this.wobble
      py += noise(this.path * 197 + i, this.boil + 7) * this.wobble
    }
    bucket.point(px, py)
  }

  /** A line through the points given as x, y, x, y. */
  line(points: readonly number[], into: BucketName = 'lines'): void {
    const bucket = this[into]
    this.path++
    for (let i = 0; i + 1 < points.length; i += 2) this.put(bucket, points[i], points[i + 1], true)
    bucket.end()
  }

  /** A bend from one point to another, pulled towards a third, as `steps` straight pieces. */
  bend(x0: number, y0: number, cx: number, cy: number, x1: number, y1: number, steps = 8, into: BucketName = 'lines'): void {
    const bucket = this[into]
    this.path++
    for (let i = 0; i <= steps; i++) {
      const t = i / steps, u = 1 - t
      this.put(bucket, u * u * x0 + 2 * u * t * cx + t * t * x1, u * u * y0 + 2 * u * t * cy + t * t * y1, true)
    }
    bucket.end()
  }

  /** Part of an oval's edge, from angle `from` to angle `to`, the oval turned by `turn`. */
  arc(cx: number, cy: number, rx: number, ry: number, from: number, to: number, steps = 12, turn = 0, into: BucketName = 'lines'): void {
    const bucket = this[into]
    this.path++
    const cos = Math.cos(turn), sin = Math.sin(turn)
    for (let i = 0; i <= steps; i++) {
      const angle = from + ((to - from) * i) / steps
      const x = Math.cos(angle) * rx, y = Math.sin(angle) * ry
      this.put(bucket, cx + x * cos - y * sin, cy + x * sin + y * cos, true)
    }
    bucket.end()
  }

  /** A whole oval as a shape. In `lines` it is its edge, drawn closed. */
  oval(into: BucketName, cx: number, cy: number, rx: number, ry: number, turn = 0, steps = 18): void {
    const bucket = this[into]
    this.path++
    const cos = Math.cos(turn), sin = Math.sin(turn)
    const last = into === 'lines' ? steps : steps - 1
    for (let i = 0; i <= last; i++) {
      const angle = (Math.PI * 2 * i) / steps
      const x = Math.cos(angle) * rx, y = Math.sin(angle) * ry
      this.put(bucket, cx + x * cos - y * sin, cy + x * sin + y * cos, into === 'lines')
    }
    bucket.end()
  }

  /** A shape through the points given, closed by whoever fills it. */
  shape(into: BucketName, points: readonly number[]): void {
    const bucket = this[into]
    this.path++
    for (let i = 0; i + 1 < points.length; i += 2) this.put(bucket, points[i], points[i + 1], false)
    bucket.end()
  }

  /** Short strokes set out from a centre like spines or fur, from angle `from` to `to`, each leaning by `lean`. */
  fringe(cx: number, cy: number, rx: number, ry: number, from: number, to: number, count: number, length: number, lean = 0, ripple = 0): void {
    for (let i = 0; i < count; i++) {
      const angle = from + ((to - from) * i) / Math.max(1, count - 1)
      const x = cx + Math.cos(angle) * rx, y = cy + Math.sin(angle) * ry
      const reach = length * (1 + 0.25 * noise(i, 3) + ripple * Math.sin(i * 1.7 + ripple * 9))
      const out = angle + lean
      this.line([x, y, x + Math.cos(out) * reach, y + Math.sin(out) * reach])
    }
  }
}

/** Whether a point lies inside a closed shape given as x, y, x, y. */
export function inside(shape: ArrayLike<number>, count: number, x: number, y: number): boolean {
  let within = false
  for (let i = 0, j = count - 2; i < count; j = i, i += 2) {
    const xi = shape[i], yi = shape[i + 1], xj = shape[j], yj = shape[j + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) within = !within
  }
  return within
}
