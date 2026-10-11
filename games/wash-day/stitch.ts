// The stitches the whole look is made of: thread on linen. Every painter here
// draws into a 2D context in stage units and is used to paint a piece once
// into a cached sprite; only a few live threads are drawn each frame.
//
//   satin    a fill of parallel threads, laid in one direction for each shape
//   running  a dashed outline, for scenery
//   chain    the one thick outline, kept for what can be touched
//   knot     a small round stitch: a flower head, an eye, a button, a bubble of suds

export type Ctx = CanvasRenderingContext2D
export type Pt = readonly [number, number]
export type Sprite = { canvas: HTMLCanvasElement; w: number; h: number }

/** A small seeded stream for the look alone, so a piece is stitched the same way each time it is painted. */
export function wobbler(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function channel(hex: string, at: number): number {
  return parseInt(hex.slice(at, at + 2), 16)
}

/** A thread colour moved towards white (amount above 0) or towards black (below 0). */
export function shade(hex: string, amount: number): string {
  const to = amount >= 0 ? 255 : 0, k = Math.abs(amount)
  const mix = (at: number) => Math.round(channel(hex, at) + (to - channel(hex, at)) * k)
  return `rgb(${mix(1)},${mix(3)},${mix(5)})`
}

type Maker = (width: number, height: number) => HTMLCanvasElement
const fromDocument: Maker = (width, height) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return canvas
}
let maker: Maker = fromDocument

/** A canvas of its own for a cached piece, `width` by `height` device pixels. */
export function canvasOf(width: number, height: number): HTMLCanvasElement {
  return maker(Math.max(1, Math.round(width)), Math.max(1, Math.round(height)))
}

/** Where cached pieces get their canvases from: the document's, unless a test hands in its own that counts what is drawn. */
export function useCanvases(own: Maker | null): void {
  maker = own ?? fromDocument
}

/** Paints a piece once into a canvas of its own, `scale` device pixels to a stage unit. */
export function sprite(w: number, h: number, scale: number, paint: (g: Ctx) => void): Sprite {
  const canvas = canvasOf(Math.ceil(w * scale), Math.ceil(h * scale))
  const g = canvas.getContext('2d')!
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  paint(g)
  return { canvas, w, h }
}

/** A closed outline with its corners rounded, as cloth is cut. `round` is the share of each edge given to the corner. */
export function soft(g: Ctx, points: readonly Pt[], round = 0.22): void {
  const n = points.length
  g.beginPath()
  for (let i = 0; i < n; i++) {
    const [px, py] = points[(i + n - 1) % n], [cx, cy] = points[i], [nx, ny] = points[(i + 1) % n]
    const ax = cx + (px - cx) * round, ay = cy + (py - cy) * round
    const bx = cx + (nx - cx) * round, by = cy + (ny - cy) * round
    if (i === 0) g.moveTo(ax, ay)
    else g.lineTo(ax, ay)
    g.quadraticCurveTo(cx, cy, bx, by)
  }
  g.closePath()
}

export function oval(g: Ctx, x: number, y: number, rx: number, ry: number, turn = 0): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
}

/**
 * Satin stitch: fills the path `shape` lays down with parallel threads at `angle`, each a stroke with a lighter
 * core, over a darker ground that shows between them. `box` bounds the shape. Threads come in three tones, so the
 * fill catches the light in one direction.
 */
export function satin(g: Ctx, shape: (g: Ctx) => void, box: { x: number; y: number; w: number; h: number }, colour: string, angle: number, seed = 1, gap = 3.4): void {
  const next = wobbler(seed)
  g.save()
  shape(g)
  g.fillStyle = shade(colour, -0.22)
  g.fill()
  g.clip()
  const cx = box.x + box.w / 2, cy = box.y + box.h / 2
  const reach = Math.hypot(box.w, box.h) / 2 + gap
  const dx = Math.cos(angle), dy = Math.sin(angle)
  const tones = [colour, shade(colour, 0.12), shade(colour, -0.08)]
  const paths = tones.map(() => new Path2D())
  const cores = new Path2D()
  for (let d = -reach; d <= reach; d += gap) {
    const ox = cx - dy * d, oy = cy + dx * d
    const jitter = (next() - 0.5) * gap * 0.3
    const path = paths[Math.floor(next() * 3)]
    path.moveTo(ox - dx * reach + jitter, oy - dy * reach)
    path.lineTo(ox + dx * reach + jitter, oy + dy * reach)
    cores.moveTo(ox - dx * reach + jitter, oy - dy * reach)
    cores.lineTo(ox + dx * reach + jitter, oy + dy * reach)
  }
  g.lineCap = 'butt'
  g.lineWidth = gap * 0.94
  tones.forEach((tone, i) => {
    g.strokeStyle = tone
    g.stroke(paths[i])
  })
  g.lineWidth = gap * 0.28
  g.strokeStyle = shade(colour, 0.3)
  g.stroke(cores)
  g.restore()
  g.lineCap = 'round'
}

/** Running stitch along a line: dashes of thread with the cloth showing between. */
export function running(g: Ctx, points: readonly Pt[], colour: string, width = 2.8, dash: readonly number[] = [9, 6], closed = false): void {
  g.beginPath()
  points.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  if (closed) g.closePath()
  g.setLineDash(dash as number[])
  g.lineWidth = width
  g.strokeStyle = colour
  g.stroke()
  g.lineWidth = width * 0.35
  g.strokeStyle = shade(colour, 0.35)
  g.stroke()
  g.setLineDash([])
}

/** Chain stitch: one thick rope of thread with a lighter loop for each link, the outline of what can be touched. */
export function chain(g: Ctx, points: readonly Pt[], colour: string, closed = true, size = 8): void {
  g.beginPath()
  points.forEach(([x, y], i) => (i === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  if (closed) g.closePath()
  g.lineWidth = size * 0.62
  g.strokeStyle = colour
  g.stroke()
  g.setLineDash([size * 0.7, size * 0.5])
  g.lineWidth = size * 0.3
  g.strokeStyle = shade(colour, 0.38)
  g.stroke()
  g.setLineDash([])
}

/** The points of an oval, for a chain or a running stitch round it. */
export function ring(x: number, y: number, rx: number, ry: number, count = 40, turn = 0): Pt[] {
  const c = Math.cos(turn), s = Math.sin(turn)
  return Array.from({ length: count }, (_, i): Pt => {
    const a = (i / count) * Math.PI * 2
    const px = Math.cos(a) * rx, py = Math.sin(a) * ry
    return [x + px * c - py * s, y + px * s + py * c]
  })
}

/** The corners of a soft outline as points close enough together for a chain to follow its curves. */
export function softPoints(points: readonly Pt[], round = 0.22, steps = 5): Pt[] {
  const n = points.length, out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const [px, py] = points[(i + n - 1) % n], [cx, cy] = points[i], [nx, ny] = points[(i + 1) % n]
    const ax = cx + (px - cx) * round, ay = cy + (py - cy) * round
    const bx = cx + (nx - cx) * round, by = cy + (ny - cy) * round
    for (let s = 0; s <= steps; s++) {
      const t = s / steps, k = 1 - t
      out.push([k * k * ax + 2 * k * t * cx + t * t * bx, k * k * ay + 2 * k * t * cy + t * t * by])
    }
  }
  return out
}

/** A knot: a round stitch with a small shadow under it and a dot of light on it. */
export function knot(g: Ctx, x: number, y: number, r: number, colour: string): void {
  g.fillStyle = shade(colour, -0.35)
  oval(g, x + r * 0.14, y + r * 0.2, r, r)
  g.fill()
  g.fillStyle = colour
  oval(g, x, y, r, r)
  g.fill()
  g.fillStyle = shade(colour, 0.5)
  oval(g, x - r * 0.3, y - r * 0.32, r * 0.34, r * 0.3)
  g.fill()
}

/** One straight stitch. */
export function stitch(g: Ctx, x0: number, y0: number, x1: number, y1: number, colour: string, width = 3): void {
  g.beginPath()
  g.moveTo(x0, y0)
  g.lineTo(x1, y1)
  g.lineWidth = width
  g.strokeStyle = colour
  g.stroke()
  g.lineWidth = width * 0.35
  g.strokeStyle = shade(colour, 0.35)
  g.stroke()
}

export type Seg = { x0: number; y0: number; x1: number; y1: number }

/** Whether two threads cross: each passes through the other, or one ends on the other. Threads that lie along one line do not. */
export function crosses(a: Seg, b: Seg): boolean {
  const side = (p: Seg, x: number, y: number) => (p.x1 - p.x0) * (y - p.y0) - (p.y1 - p.y0) * (x - p.x0)
  const a0 = side(b, a.x0, a.y0), a1 = side(b, a.x1, a.y1), b0 = side(a, b.x0, b.y0), b1 = side(a, b.x1, b.y1)
  if (a0 === 0 && a1 === 0) return false
  return a0 * a1 <= 0 && b0 * b1 <= 0
}

/** The seed stitches laid since the picture was begun, in cells of 16 units, so a new one is tried against its neighbours only. */
let laid = new Map<number, Seg[]>()
const cellOf = (x: number, y: number) => Math.floor(x / 16) * 4096 + Math.floor(y / 16)

/** Begins a picture: no seed stitch has been laid on it yet. */
export function beginSeeds(): void {
  laid = new Map()
}

/**
 * Seed stitches scattered over a box: short threads at all angles, as for leaves in a hedge or flecks in grass. No
 * two of them cross, in this scatter or in any other laid on the same picture since `beginSeeds`: two crossed
 * stitches read as a sign. A thread that would cross one already laid is tried at other places and angles, and
 * left out if none is free.
 */
export function seeds(g: Ctx, box: { x: number; y: number; w: number; h: number }, count: number, colour: string, seed: number, length = 8, width = 2.6): void {
  const next = wobbler(seed)
  const body = new Path2D()
  const free = (thread: Seg): boolean => {
    const cx = (thread.x0 + thread.x1) / 2, cy = (thread.y0 + thread.y1) / 2
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) {
      for (const other of laid.get(cellOf(cx + i * 16, cy + j * 16)) ?? []) if (crosses(thread, other)) return false
    }
    return true
  }
  for (let n = 0; n < count; n++) {
    for (let attempt = 0; attempt < 6; attempt++) {
      const x = box.x + next() * box.w, y = box.y + next() * box.h, a = next() * Math.PI
      const thread = { x0: x - Math.cos(a) * length * 0.5, y0: y - Math.sin(a) * length * 0.5, x1: x + Math.cos(a) * length * 0.5, y1: y + Math.sin(a) * length * 0.5 }
      if (!free(thread)) continue
      const key = cellOf(x, y)
      const there = laid.get(key)
      if (there) there.push(thread)
      else laid.set(key, [thread])
      body.moveTo(thread.x0, thread.y0)
      body.lineTo(thread.x1, thread.y1)
      break
    }
  }
  g.lineWidth = width
  g.strokeStyle = colour
  g.stroke(body)
  g.lineWidth = width * 0.35
  g.strokeStyle = shade(colour, 0.35)
  g.stroke(body)
}

/** The bare linen: a weave of slightly uneven threads, as one small tile to repeat. `scale` is device pixels to a stage unit. */
export function linenTile(scale: number, colour: string): HTMLCanvasElement {
  const pitch = Math.max(2, Math.round(3.2 * scale)), cells = 12
  const tile = canvasOf(pitch * cells, pitch * cells)
  const g = tile.getContext('2d')!
  const next = wobbler(77)
  g.fillStyle = colour
  g.fillRect(0, 0, tile.width, tile.height)
  for (let i = 0; i < cells; i++) {
    // A warp thread down and a weft thread across, each a little lighter or darker than its neighbours.
    g.fillStyle = shade(colour, (next() - 0.5) * 0.16)
    g.fillRect(i * pitch, 0, pitch * 0.62, tile.height)
  }
  for (let j = 0; j < cells; j++) {
    for (let i = 0; i < cells; i++) {
      if ((i + j) % 2) continue
      g.fillStyle = shade(colour, 0.04 + (next() - 0.5) * 0.14)
      g.fillRect(i * pitch - pitch * 0.19, j * pitch, pitch, pitch * 0.62)
    }
    g.fillStyle = shade(colour, -0.2)
    g.globalAlpha = 0.35
    g.fillRect(0, j * pitch + pitch * 0.62, tile.width, Math.max(1, pitch * 0.2))
    g.globalAlpha = 1
  }
  return tile
}
