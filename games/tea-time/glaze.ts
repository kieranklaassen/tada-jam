// The look's surfaces, painted once at load on small canvases: the white tin
// glaze with its sharp highlight (a matcap), the warm tea and gilding, and the
// hand-painted cobalt brushwork (one atlas for every piece, one sheet of
// tiles for the wall). Nothing is fetched: every pixel is drawn here from a
// seeded stream, so the pottery is the same on every device and every load.

export const COBALT = '#1d3f9e'
export const COBALT_WASH = '#6f8fd6'
export const GLAZE = '#f4f6fa'
export const GILT = '#e3a23f'
export const TEA = '#c06f24'
export const CLOTH = '#4a6eb0'

/** A fixed stream for brush jitter, so two loads paint the same strokes. */
export function brushStream(seed: number): () => number {
  let s = seed >>> 0 || 0x9e3779b9
  return () => {
    s ^= s << 13; s >>>= 0
    s ^= s >>> 17
    s ^= s << 5; s >>>= 0
    return s / 2 ** 32
  }
}

type Ctx = CanvasRenderingContext2D

function canvasOf(doc: Document, width: number, height: number): { canvas: HTMLCanvasElement; ctx: Ctx } {
  const canvas = doc.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, ctx: canvas.getContext('2d')! }
}

/**
 * A matcap: what a glazed ball looks like from the camera, which the material
 * then wraps round every form. `tint` is the body colour at its brightest;
 * the hot spot is pure white, and the material keeps that spot white whatever
 * is painted under the glaze (pieces.ts), which is what makes it read as fired.
 */
export function paintMatcap(doc: Document, tint: string, shade: string, gloss: number): HTMLCanvasElement {
  const size = 256
  const { canvas, ctx } = canvasOf(doc, size, size)
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, size, size)
  // The body: lit from the upper left, falling off to a cool shade at the lower right.
  const body = ctx.createRadialGradient(size * 0.38, size * 0.32, size * 0.05, size * 0.5, size * 0.5, size * 0.56)
  body.addColorStop(0, tint)
  body.addColorStop(0.55, tint)
  body.addColorStop(1, shade)
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
  ctx.fill()
  // A cool rim light low on the right, as from a pale wall behind the table.
  const rim = ctx.createRadialGradient(size * 0.74, size * 0.78, 0, size * 0.74, size * 0.78, size * 0.26)
  rim.addColorStop(0, `rgba(255, 255, 255, ${0.3 * gloss})`)
  rim.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = rim
  ctx.fillRect(0, 0, size, size)
  // The window: a soft pane and, inside it, the small hard spot of a glaze.
  ctx.save()
  ctx.translate(size * 0.34, size * 0.28)
  ctx.rotate(-0.5)
  const pane = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 0.16)
  pane.addColorStop(0, `rgba(255, 255, 255, ${0.55 * gloss})`)
  pane.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = pane
  ctx.scale(1.5, 1)
  ctx.beginPath()
  ctx.arc(0, 0, size * 0.16, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = `rgba(255, 255, 255, ${gloss})`
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.05, size * 0.034, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  return canvas
}

/** One stroke of a loaded brush: it starts fat and wet, thins and runs dry toward its end. */
export function stroke(ctx: Ctx, random: () => number, points: readonly [number, number][], width: number, color = COBALT, wet = 1): void {
  if (points.length < 2) return
  const steps = Math.max(12, Math.round(points.length * 14))
  ctx.fillStyle = color
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const at = t * (points.length - 1)
    const k = Math.min(points.length - 2, Math.floor(at)), f = at - k
    const x = points[k][0] + (points[k + 1][0] - points[k][0]) * f
    const y = points[k][1] + (points[k + 1][1] - points[k][1]) * f
    // The belly of the stroke is a third of the way along; the tail is a hair.
    const w = width * (0.25 + 0.75 * Math.sin(Math.min(1, t * 1.6 + 0.12) * Math.PI) ** 0.7) * (0.9 + random() * 0.2)
    ctx.globalAlpha = wet * (0.5 + 0.5 * (1 - t)) * (0.75 + random() * 0.25)
    ctx.beginPath()
    ctx.arc(x + (random() - 0.5) * width * 0.12, y + (random() - 0.5) * width * 0.12, Math.max(0.6, w / 2), 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** A curve through three points, as a list a stroke can follow. */
export function arc3(a: [number, number], b: [number, number], c: [number, number], n = 8): [number, number][] {
  const points: [number, number][] = []
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t
    points.push([u * u * a[0] + 2 * u * t * b[0] + t * t * c[0], u * u * a[1] + 2 * u * t * b[1] + t * t * c[1]])
  }
  return points
}

/** A pale wash under the line work, as a potter lays in before the dark strokes. */
function wash(ctx: Ctx, x: number, y: number, rx: number, ry: number, alpha = 0.35): void {
  ctx.globalAlpha = alpha
  ctx.fillStyle = COBALT_WASH
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
}

/** A five-petal flower with a dot for its heart. */
export function flower(ctx: Ctx, random: () => number, x: number, y: number, r: number): void {
  wash(ctx, x, y, r * 0.9, r * 0.9, 0.25)
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + random() * 0.2
    stroke(ctx, random, arc3([x + Math.cos(a) * r * 0.25, y + Math.sin(a) * r * 0.25], [x + Math.cos(a + 0.5) * r * 0.9, y + Math.sin(a + 0.5) * r * 0.9], [x + Math.cos(a) * r, y + Math.sin(a) * r]), r * 0.34)
  }
  ctx.fillStyle = COBALT
  ctx.beginPath()
  ctx.arc(x, y, r * 0.16, 0, Math.PI * 2)
  ctx.fill()
}

/** A fish in three strokes and a dot, facing right (`dir` 1) or left (-1). */
export function fish(ctx: Ctx, random: () => number, x: number, y: number, r: number, dir: 1 | -1 = 1): void {
  wash(ctx, x, y, r * 0.9, r * 0.45, 0.4)
  const d = dir
  stroke(ctx, random, arc3([x - d * r, y], [x, y - r * 0.75], [x + d * r, y]), r * 0.22)
  stroke(ctx, random, arc3([x - d * r, y], [x, y + r * 0.75], [x + d * r, y]), r * 0.22)
  stroke(ctx, random, [[x - d * r * 0.95, y], [x - d * r * 1.5, y - r * 0.5]], r * 0.26)
  stroke(ctx, random, [[x - d * r * 0.95, y], [x - d * r * 1.5, y + r * 0.5]], r * 0.26)
  for (let i = 0; i < 3; i++) stroke(ctx, random, arc3([x - d * r * (0.3 - i * 0.3), y - r * 0.3], [x - d * r * (0.15 - i * 0.3), y], [x - d * r * (0.3 - i * 0.3), y + r * 0.3]), r * 0.1, COBALT, 0.7)
  ctx.fillStyle = COBALT
  ctx.beginPath()
  ctx.arc(x + d * r * 0.6, y - r * 0.12, r * 0.09, 0, Math.PI * 2)
  ctx.fill()
}

/** A row of rolling wave curls, left to right. */
export function waves(ctx: Ctx, random: () => number, x0: number, x1: number, y: number, h: number): void {
  const n = Math.max(2, Math.round((x1 - x0) / (h * 2.2)))
  const step = (x1 - x0) / n
  for (let i = 0; i < n; i++) {
    const x = x0 + i * step
    stroke(ctx, random, arc3([x, y + h * 0.5], [x + step * 0.55, y - h * 0.9], [x + step * 0.9, y + h * 0.3]), h * 0.42)
  }
}

/** A band right across a strip: one long loaded stroke. */
export function band(ctx: Ctx, random: () => number, x0: number, x1: number, y: number, width: number, color = COBALT): void {
  ctx.fillStyle = color
  for (let x = x0; x <= x1; x += 2) {
    ctx.globalAlpha = 0.8 + random() * 0.2
    ctx.fillRect(x, y - width / 2 + (random() - 0.5) * width * 0.12, 3, width * (0.9 + random() * 0.15))
  }
  ctx.globalAlpha = 1
}

/** A row of fat dabs. */
export function dabs(ctx: Ctx, random: () => number, x0: number, x1: number, y: number, r: number, every: number): void {
  for (let x = x0 + every / 2; x < x1; x += every) stroke(ctx, random, [[x - r * 0.2, y - r * 0.5], [x + r * 0.2, y + r * 0.5]], r * 1.2)
}

/** Fine cracks in the glaze, the crazing of old pottery: barely there, and only where asked. */
export function crazing(ctx: Ctx, random: () => number, x: number, y: number, w: number, h: number, lines: number): void {
  ctx.strokeStyle = 'rgba(96, 112, 150, 0.16)'
  ctx.lineWidth = 0.8
  for (let i = 0; i < lines; i++) {
    let px = x + random() * w, py = y + random() * h
    ctx.beginPath()
    ctx.moveTo(px, py)
    for (let k = 0; k < 4; k++) {
      px += (random() - 0.5) * w * 0.22
      py += (random() - 0.5) * h * 0.22
      ctx.lineTo(Math.max(x, Math.min(x + w, px)), Math.max(y, Math.min(y + h, py)))
    }
    ctx.stroke()
  }
}

export { canvasOf }
