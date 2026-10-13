// The pen every picture of the game is drawn with. A picture is a list of
// filled shapes in stage units, written once as a plain function of a pen,
// and the same function serves two pens:
// - `CanvasPen` paints it onto a 2D context, once, when the sprites are made;
// - `MeasurePen` only takes its measure, with no canvas, so the view knows how
//   large a sprite to make and a test can ask where a figure is.
// A pen can be moved, turned, scaled and mirrored for a part of a picture
// (`at`), and can cut shapes out of what is already drawn (`cut`), which is
// how a dark figure gets its eyes and the creases between its parts.

/** The dark of a lit segment. */
export const INK = '#17231d'

export type Box = { x: number; y: number; w: number; h: number }

export type Place = { turn?: number; scale?: number; mirror?: boolean }

type Matrix = readonly [number, number, number, number, number, number]

const IDENTITY: Matrix = [1, 0, 0, 1, 0, 0]

export abstract class Pen {
  /** The colour shapes are filled with. A segment is always `INK`; the printed card sets its own. */
  color = INK
  private matrix: Matrix = IDENTITY
  private cutting = false

  /** Draws `picture` moved to `x`, `y`, then turned (radians, clockwise on screen), scaled and mirrored left to right about that point. */
  at(x: number, y: number, picture: () => void, place: Place = {}): void {
    const [a, b, c, d, e, f] = this.matrix
    const s = place.scale ?? 1, cos = Math.cos(place.turn ?? 0) * s, sin = Math.sin(place.turn ?? 0) * s, mx = place.mirror ? -1 : 1
    // The local matrix: mirror first, then scale and turn, then move.
    const la = cos * mx, lb = sin * mx, lc = -sin, ld = cos
    const before = this.matrix
    this.matrix = [a * la + c * lb, b * la + d * lb, a * lc + c * ld, b * lc + d * ld, a * x + c * y + e, b * x + d * y + f]
    picture()
    this.matrix = before
  }

  /** Draws `picture`, which is written in stage units, turned, scaled or mirrored about the point `cx`, `cy`. */
  about(cx: number, cy: number, picture: () => void, place: Place): void {
    this.at(cx, cy, () => this.at(-cx, -cy, picture), place)
  }

  /** Whatever `picture` draws is taken out of what is there already. */
  cut(picture: () => void): void {
    const before = this.cutting
    this.cutting = true
    picture()
    this.cutting = before
  }

  /**
   * Whatever `picture` draws shows only inside the box `x`, `y`, `w`, `h`, given in the pen's units where it
   * stands. For a pen that is moved or scaled but not turned.
   */
  within(x: number, y: number, w: number, h: number, picture: () => void): void {
    const [x0, y0] = this.point(x, y), [x1, y1] = this.point(x + w, y + h)
    this.clip({ x: Math.min(x0, x1), y: Math.min(y0, y1), w: Math.abs(x1 - x0), h: Math.abs(y1 - y0) }, picture)
  }

  /** A filled oval, turned by `turn` radians. */
  ell(cx: number, cy: number, rx: number, ry: number, turn = 0): void {
    const [a, b, c, d] = this.matrix
    const scale = Math.hypot(a, b)
    // Where the oval's long axis points once the pen's own turn and mirror are applied.
    const ux = a * Math.cos(turn) + c * Math.sin(turn), uy = b * Math.cos(turn) + d * Math.sin(turn)
    const [x, y] = this.point(cx, cy)
    this.oval(x, y, rx * scale, ry * scale, Math.atan2(uy, ux), this.cutting)
  }

  /** A filled closed shape with rounded corners: the outline runs through the middle of each side and bends round each point. */
  blob(points: readonly number[]): void {
    this.path(this.points(points), true, true, 0, this.cutting)
  }

  /** A filled shape with straight sides. */
  poly(points: readonly number[]): void {
    this.path(this.points(points), true, false, 0, this.cutting)
  }

  /** A stroke of even width with round ends, bending round each point between its first and last. */
  line(points: readonly number[], width: number): void {
    this.path(this.points(points), false, points.length > 4, width * Math.hypot(this.matrix[0], this.matrix[1]), this.cutting)
  }

  private point(x: number, y: number): [number, number] {
    const [a, b, c, d, e, f] = this.matrix
    return [a * x + c * y + e, b * x + d * y + f]
  }

  private points(points: readonly number[]): number[] {
    const out: number[] = []
    for (let i = 0; i + 1 < points.length; i += 2) out.push(...this.point(points[i], points[i + 1]))
    return out
  }

  protected abstract clip(box: Box, picture: () => void): void
  protected abstract oval(cx: number, cy: number, rx: number, ry: number, turn: number, cut: boolean): void
  /** `width` 0 fills the shape; anything more strokes the line at that width. */
  protected abstract path(points: readonly number[], closed: boolean, smooth: boolean, width: number, cut: boolean): void
}

/** Takes a picture's measure: the box its ink lies in, and how many shapes it is. */
export class MeasurePen extends Pen {
  shapes = 0
  private x0 = Infinity
  private y0 = Infinity
  private x1 = -Infinity
  private y1 = -Infinity
  private only: Box | null = null

  /** The box that holds every inked shape, or null when nothing was inked. */
  get box(): Box | null {
    return this.x1 < this.x0 ? null : { x: this.x0, y: this.y0, w: this.x1 - this.x0, h: this.y1 - this.y0 }
  }

  protected clip(box: Box, picture: () => void): void {
    const before = this.only
    this.only = before ? meet(before, box) : box
    picture()
    this.only = before
  }

  protected oval(cx: number, cy: number, rx: number, ry: number, turn: number, cut: boolean): void {
    this.shapes += 1
    if (cut) return
    const cos = Math.cos(turn), sin = Math.sin(turn)
    this.grow(cx, cy, Math.hypot(rx * cos, ry * sin), Math.hypot(rx * sin, ry * cos))
  }

  // A rounded shape lies inside the straight-sided one through the same points, so the points bound both.
  protected path(points: readonly number[], _closed: boolean, _smooth: boolean, width: number, cut: boolean): void {
    this.shapes += 1
    if (cut) return
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
    for (let i = 0; i + 1 < points.length; i += 2) {
      x0 = Math.min(x0, points[i] - width / 2); x1 = Math.max(x1, points[i] + width / 2)
      y0 = Math.min(y0, points[i + 1] - width / 2); y1 = Math.max(y1, points[i + 1] + width / 2)
    }
    this.take(x0, y0, x1, y1)
  }

  private grow(x: number, y: number, rx: number, ry: number): void {
    this.take(x - rx, y - ry, x + rx, y + ry)
  }

  /** The box of one shape, less whatever of it lies outside the clip. */
  private take(x0: number, y0: number, x1: number, y1: number): void {
    const only = this.only
    if (only) {
      x0 = Math.max(x0, only.x); x1 = Math.min(x1, only.x + only.w); y0 = Math.max(y0, only.y); y1 = Math.min(y1, only.y + only.h)
      if (x1 <= x0 || y1 <= y0) return
    }
    this.x0 = Math.min(this.x0, x0); this.x1 = Math.max(this.x1, x1)
    this.y0 = Math.min(this.y0, y0); this.y1 = Math.max(this.y1, y1)
  }
}

/** The part two boxes share; a box of no size where they share none. */
export function meet(a: Box, b: Box): Box {
  const x = Math.max(a.x, b.x), y = Math.max(a.y, b.y)
  return { x, y, w: Math.max(0, Math.min(a.x + a.w, b.x + b.w) - x), h: Math.max(0, Math.min(a.y + a.h, b.y + b.h) - y) }
}

/** The part of a 2D context a pen paints with. */
export type Surface = Pick<
  CanvasRenderingContext2D,
  'beginPath' | 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'closePath' | 'ellipse' | 'fill' | 'stroke' | 'fillStyle' | 'strokeStyle' | 'lineWidth' | 'lineCap' | 'lineJoin' | 'globalCompositeOperation' | 'save' | 'restore' | 'rect' | 'clip'
>

/** Paints a picture onto a 2D context whose transform already maps stage units to pixels. */
export class CanvasPen extends Pen {
  private readonly g: Surface

  constructor(g: Surface) {
    super()
    this.g = g
  }

  protected clip(box: Box, picture: () => void): void {
    const g = this.g
    g.save()
    g.beginPath()
    g.rect(box.x, box.y, box.w, box.h)
    g.clip()
    picture()
    g.restore()
  }

  protected oval(cx: number, cy: number, rx: number, ry: number, turn: number, cut: boolean): void {
    const g = this.g
    this.mode(cut)
    g.beginPath()
    g.ellipse(cx, cy, rx, ry, turn, 0, Math.PI * 2)
    g.fill()
  }

  protected path(points: readonly number[], closed: boolean, smooth: boolean, width: number, cut: boolean): void {
    const g = this.g, n = points.length / 2
    if (n < 2) return
    this.mode(cut)
    g.beginPath()
    const x = (i: number) => points[((i + n) % n) * 2], y = (i: number) => points[((i + n) % n) * 2 + 1]
    if (!smooth) {
      g.moveTo(x(0), y(0))
      for (let i = 1; i < n; i++) g.lineTo(x(i), y(i))
    } else if (closed) {
      g.moveTo((x(-1) + x(0)) / 2, (y(-1) + y(0)) / 2)
      for (let i = 0; i < n; i++) g.quadraticCurveTo(x(i), y(i), (x(i) + x(i + 1)) / 2, (y(i) + y(i + 1)) / 2)
    } else {
      g.moveTo(x(0), y(0))
      for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(x(i), y(i), i === n - 2 ? x(i + 1) : (x(i) + x(i + 1)) / 2, i === n - 2 ? y(i + 1) : (y(i) + y(i + 1)) / 2)
    }
    if (width > 0) {
      g.lineWidth = width
      g.lineCap = 'round'
      g.lineJoin = 'round'
      g.stroke()
      return
    }
    if (closed) g.closePath()
    g.fill()
  }

  private mode(cut: boolean): void {
    this.g.globalCompositeOperation = cut ? 'destination-out' : 'source-over'
    this.g.fillStyle = this.color
    this.g.strokeStyle = this.color
  }
}

/** A picture: a plain function of a pen. */
export type Picture = (p: Pen) => void

/**
 * Draws `picture`, which is written about the point `from`, so that this point lies at `to`, scaled by `scale`
 * and mirrored left to right when asked. The same figure can then stand in any room.
 */
export function placed(p: Pen, picture: () => void, from: { x: number; y: number }, to: { x: number; y: number }, scale = 1, mirror = false): void {
  p.at(to.x + (mirror ? scale * from.x : -scale * from.x), to.y - scale * from.y, picture, { scale, mirror })
}
