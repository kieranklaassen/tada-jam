// Shapes and the puffy fill. Everything here runs once, when a sticker is
// baked into its sprite (sticker.ts), never per frame, so it may use blur.
//
// A drawing works in design units with the y axis pointing down. `k` is how
// many device pixels one unit takes in the sprite being baked: a canvas shadow
// is measured in device pixels whatever the transform, so the blur needs it.

export type Ctx = CanvasRenderingContext2D
/**
 * What a drawing is handed. `cut` gathers the shapes it fills, in the
 * drawing's own units: the outline the gloss is clipped to each frame. A shape
 * drawn inside another (under a clip, or a feature of a face) is not gathered:
 * `mute` counts how deep the drawing is inside such a part.
 */
export type Pen = { g: Ctx; k: number; cut: Path2D; toUnits: DOMMatrix; mute: number }

/** A pen for one bake: `g` is already set to draw in the drawing's units. */
export function penFor(g: Ctx, k: number): Pen {
  return { g, k, cut: new Path2D(), toUnits: g.getTransform().inverse(), mute: 0 }
}

function gather(pen: Pen, path: Path2D): void {
  if (!pen.mute) pen.cut.addPath(path, pen.toUnits.multiply(pen.g.getTransform()))
}

/** Draws `inside` clipped to `clip`. What it draws lies inside a shape already drawn, so it adds nothing to the outline. */
export function within(pen: Pen, clip: Path2D, inside: () => void): void {
  pen.g.save()
  pen.g.clip(clip)
  pen.mute++
  inside()
  pen.mute--
  pen.g.restore()
}

/** Turns a list of points to run clockwise on screen, so every gathered shape winds the same way and their union has no holes. */
function clockwise(points: readonly number[]): readonly number[] {
  let area = 0
  const n = points.length / 2
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    area += points[i * 2] * points[j * 2 + 1] - points[j * 2] * points[i * 2 + 1]
  }
  if (area >= 0) return points
  const turned: number[] = []
  for (let i = n - 1; i >= 0; i--) turned.push(points[i * 2], points[i * 2 + 1])
  return turned
}

/** An ellipse, turned clockwise by `rot` radians. */
export function ell(cx: number, cy: number, rx: number, ry: number, rot = 0): Path2D {
  const p = new Path2D()
  p.ellipse(cx, cy, rx, ry, rot, 0, Math.PI * 2)
  return p
}

/** A rounded rectangle, turned about its centre by `rot`. */
export function box(x: number, y: number, w: number, h: number, r: number, rot = 0): Path2D {
  const p = new Path2D()
  p.roundRect(x, y, w, h, Math.min(r, w / 2, h / 2))
  if (!rot) return p
  const cx = x + w / 2, cy = y + h / 2, turned = new Path2D()
  turned.addPath(p, new DOMMatrix().translateSelf(cx, cy).rotateSelf((rot * 180) / Math.PI).translateSelf(-cx, -cy))
  return turned
}

/** A closed smooth shape through the points `[x0, y0, x1, y1, ...]`. `round` 0 gives corners, 1 a soft blob. */
export function blob(given: readonly number[], round = 1): Path2D {
  const points = clockwise(given), n = points.length / 2, p = new Path2D()
  const at = (i: number): [number, number] => { const j = ((i % n) + n) % n; return [points[j * 2], points[j * 2 + 1]] }
  const t = round / 6
  p.moveTo(...at(0))
  for (let i = 0; i < n; i++) {
    const [ax, ay] = at(i - 1), [bx, by] = at(i), [cx, cy] = at(i + 1), [dx, dy] = at(i + 2)
    p.bezierCurveTo(bx + (cx - ax) * t, by + (cy - ay) * t, cx - (dx - bx) * t, cy - (dy - by) * t, cx, cy)
  }
  p.closePath()
  return p
}

/** A straight-edged closed shape: machine-cut corners (spines, bristles). */
export function poly(given: readonly number[]): Path2D {
  const points = clockwise(given), p = new Path2D()
  p.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2) p.lineTo(points[i], points[i + 1])
  p.closePath()
  return p
}

export function fill(pen: Pen, path: Path2D, color: string | CanvasGradient): void {
  pen.g.fillStyle = color
  pen.g.fill(path)
  gather(pen, path)
}

/** A round-ended line through the points, straight or (with `smooth`) curved through them. */
export function line({ g }: Pen, points: readonly number[], color: string, width: number, smooth = true): void {
  g.strokeStyle = color
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(points[0], points[1])
  if (!smooth || points.length < 6) {
    for (let i = 2; i < points.length; i += 2) g.lineTo(points[i], points[i + 1])
  } else {
    for (let i = 2; i < points.length - 2; i += 2) {
      g.quadraticCurveTo(points[i], points[i + 1], (points[i] + points[i + 2]) / 2, (points[i + 1] + points[i + 3]) / 2)
    }
    g.lineTo(points[points.length - 2], points[points.length - 1])
  }
  g.stroke()
}

/** Everything outside `path` as far as it matters to the surface being drawn on: the surface's own box and a margin, in the current units. */
function outsideOf(g: Ctx, path: Path2D, margin: number): Path2D {
  const inverse = g.getTransform().inverse(), w = g.canvas.width, h = g.canvas.height
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const [x, y] of [[-margin, -margin], [w + margin, -margin], [w + margin, h + margin], [-margin, h + margin]]) {
    const at = inverse.transformPoint({ x, y })
    x0 = Math.min(x0, at.x); y0 = Math.min(y0, at.y); x1 = Math.max(x1, at.x); y1 = Math.max(y1, at.y)
  }
  const outside = new Path2D()
  outside.rect(x0, y0, x1 - x0, y1 - y0)
  outside.addPath(path)
  return outside
}

/** A soft band just inside a shape's edge, lit or shaded: the shadow of everything outside the shape, pushed in by (dx, dy). */
function innerEdge({ g, k }: Pen, path: Path2D, color: string, dx: number, dy: number, blur: number): void {
  const outside = outsideOf(g, path, (blur + Math.abs(dx) + Math.abs(dy)) * k * 3)
  g.save()
  g.clip(path)
  g.shadowColor = color
  g.shadowBlur = blur * k
  g.shadowOffsetX = dx * k
  g.shadowOffsetY = dy * k
  g.fillStyle = '#000'
  g.fill(outside, 'evenodd')
  g.restore()
}

/**
 * The puffy fill of the look: a flat colour that swells towards the viewer,
 * lit from the upper left. `depth` scales how fat the swell is (1 for a body,
 * less for a small part).
 */
export function puff(pen: Pen, path: Path2D, color: string, depth = 1): void {
  fill(pen, path, color)
  innerEdge(pen, path, 'rgba(58, 30, 96, 0.34)', -5 * depth, -7 * depth, 13 * depth)
  innerEdge(pen, path, 'rgba(255, 255, 255, 0.62)', 4 * depth, 6 * depth, 10 * depth)
}

/** An eye: a dark oval with a glint. `lid` from 0 (wide) to 1 (shut) lowers a lid in the colour of the fur round it; `slant` tips the lid for a sad or tired look. */
export function eye(pen: Pen, x: number, y: number, r: number, ink: string, fur: string, lid = 0, slant = 0): void {
  const { g } = pen
  if (lid >= 1) {
    line(pen, [x - r, y, x, y + r * 0.55, x + r, y], ink, r * 0.5)
    return
  }
  pen.mute++
  fill(pen, ell(x, y, r * 0.86, r), ink)
  fill(pen, ell(x - r * 0.3, y - r * 0.34 + lid * r * 0.7, r * 0.3, r * 0.3), '#ffffff')
  pen.mute--
  if (lid <= 0) return
  g.save()
  g.clip(ell(x, y, r * 0.86 + 0.6, r + 0.6))
  g.translate(x, y - r + lid * r * 2)
  g.rotate(slant)
  g.fillStyle = fur
  g.fillRect(-r * 3, -r * 4, r * 6, r * 4)
  g.restore()
  // The lid's edge, so a half-shut eye reads as heavy and not as a smaller eye.
  g.save()
  g.translate(x, y - r + lid * r * 2)
  g.rotate(slant)
  line(pen, [-r * 0.95, 0, r * 0.95, 0], ink, r * 0.3, false)
  g.restore()
}
