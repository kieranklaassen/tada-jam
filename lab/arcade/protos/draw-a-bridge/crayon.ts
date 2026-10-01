// Crayon-on-paper rendering. Everything here draws once into an offscreen
// canvas (made inside `create`, never at import), so the waxy grain costs
// nothing per frame.

export interface Pt {
  x: number
  y: number
}

export type Ctx = CanvasRenderingContext2D

export function canvasOf(w: number, h: number): [HTMLCanvasElement, Ctx] {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(2, Math.ceil(w))
  canvas.height = Math.max(2, Math.ceil(h))
  return [canvas, canvas.getContext('2d') as Ctx]
}

const r = (a: number, b: number) => a + Math.random() * (b - a)

// Trace a polyline with a slightly unsteady hand. Does not stroke or fill.
export function wobble(c: Ctx, pts: readonly Pt[], amp = 1.6, closed = false, begin = true): void {
  if (begin) c.beginPath()
  const first = pts[0]
  if (!first) return
  c.moveTo(first.x, first.y)
  const n = closed ? pts.length : pts.length - 1
  for (let i = 0; i < n; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % pts.length]!
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const steps = Math.max(1, Math.round(len / 28))
    const nx = len > 0 ? -(b.y - a.y) / len : 0
    const ny = len > 0 ? (b.x - a.x) / len : 0
    for (let s = 1; s <= steps; s++) {
      const t = s / steps
      const j = s === steps ? 0 : r(-amp, amp)
      c.lineTo(a.x + (b.x - a.x) * t + nx * j, a.y + (b.y - a.y) * t + ny * j)
    }
  }
  if (closed) c.closePath()
}

// Diagonal scribble strokes over a rectangle (clip first for other shapes).
export function hatch(c: Ctx, x: number, y: number, w: number, h: number, color: string, alpha = 0.35, spacing = 9, width = 5, slant = 0.7): void {
  c.save()
  c.strokeStyle = color
  c.lineCap = 'round'
  for (let u = -h * slant; u < w + spacing; u += spacing) {
    c.globalAlpha = alpha * r(0.5, 1)
    c.lineWidth = width * r(0.6, 1.2)
    const x0 = x + u + r(-3, 3)
    c.beginPath()
    c.moveTo(x0, y + h + r(-2, 4))
    c.quadraticCurveTo(x0 + h * slant * 0.5 + r(-5, 5), y + h * 0.5, x0 + h * slant + r(-3, 3), y + r(-4, 2))
    c.stroke()
  }
  c.restore()
}

// Punch paper-coloured specks out of whatever is already drawn: wax grain.
export function speckle(c: Ctx, x: number, y: number, w: number, h: number, count: number, alpha = 0.4): void {
  c.save()
  c.globalCompositeOperation = 'destination-out'
  c.fillStyle = '#000'
  for (let i = 0; i < count; i++) {
    c.globalAlpha = alpha * Math.random()
    const s = r(1, 2.6)
    c.fillRect(x + Math.random() * w, y + Math.random() * h, s, s * r(0.6, 1.6))
  }
  c.restore()
}

export interface InkSprite {
  canvas: HTMLCanvasElement
  // Where the canvas's top-left sits relative to the body's position.
  ox: number
  oy: number
}

// A thick crayon stroke through `pts` (local coordinates), with a darker rim,
// a waxy highlight and grain along its length.
export function inkSprite(pts: readonly Pt[], color: string, dark: string, width: number): InkSprite {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const p of pts) {
    minX = Math.min(minX, p.x)
    minY = Math.min(minY, p.y)
    maxX = Math.max(maxX, p.x)
    maxY = Math.max(maxY, p.y)
  }
  const pad = width / 2 + 5
  const [canvas, c] = canvasOf(maxX - minX + pad * 2, maxY - minY + pad * 2)
  c.translate(pad - minX, pad - minY)
  c.lineCap = 'round'
  c.lineJoin = 'round'
  const trace = (dx: number, dy: number) => {
    c.beginPath()
    const first = pts[0]!
    c.moveTo(first.x + dx, first.y + dy)
    if (pts.length === 1) c.lineTo(first.x + dx + 0.1, first.y + dy)
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i]!.x + dx, pts[i]!.y + dy)
  }
  trace(0, 0)
  c.strokeStyle = dark
  c.lineWidth = width + 4
  c.stroke()
  trace(0, 0)
  c.strokeStyle = color
  c.lineWidth = width
  c.stroke()
  trace(-1.5, -2.5)
  c.strokeStyle = 'rgba(255,255,255,0.32)'
  c.lineWidth = width * 0.3
  c.stroke()
  // Grain: walk the path and punch specks and short ridges across it.
  c.globalCompositeOperation = 'destination-out'
  c.fillStyle = '#000'
  c.strokeStyle = '#000'
  for (let i = 0; i < Math.max(1, pts.length - 1); i++) {
    const a = pts[i]!
    const b = pts[i + 1] ?? a
    const len = Math.hypot(b.x - a.x, b.y - a.y)
    const ux = len > 0 ? (b.x - a.x) / len : 1
    const uy = len > 0 ? (b.y - a.y) / len : 0
    for (let d = 0; d <= len; d += 2.2) {
      const off = r(-width / 2, width / 2)
      const px = a.x + ux * d - uy * off
      const py = a.y + uy * d + ux * off
      c.globalAlpha = r(0.15, 0.7)
      const s = r(1, 2.4)
      c.fillRect(px, py, s, s)
      if (Math.random() < 0.12) {
        c.globalAlpha = 0.22
        c.lineWidth = 1.2
        c.beginPath()
        c.moveTo(px, py)
        c.lineTo(px + ux * r(6, 16), py + uy * r(6, 16))
        c.stroke()
      }
    }
  }
  return { canvas, ox: minX - pad, oy: minY - pad }
}

// Ramer-Douglas-Peucker: a wiggly finger path down to the corners that matter.
export function simplify(pts: readonly Pt[], tolerance: number): Pt[] {
  if (pts.length < 3) return pts.map((p) => ({ x: p.x, y: p.y }))
  const keep = new Uint8Array(pts.length)
  keep[0] = 1
  keep[pts.length - 1] = 1
  const stack: [number, number][] = [[0, pts.length - 1]]
  while (stack.length > 0) {
    const [i0, i1] = stack.pop()!
    const a = pts[i0]!
    const b = pts[i1]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy)
    let worst = 0
    let at = -1
    for (let i = i0 + 1; i < i1; i++) {
      const p = pts[i]!
      const d = len > 0 ? Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len : Math.hypot(p.x - a.x, p.y - a.y)
      if (d > worst) {
        worst = d
        at = i
      }
    }
    if (at !== -1 && worst > tolerance) {
      keep[at] = 1
      stack.push([i0, at], [at, i1])
    }
  }
  const out: Pt[] = []
  for (let i = 0; i < pts.length; i++) if (keep[i]) out.push({ x: pts[i]!.x, y: pts[i]!.y })
  return out
}
