import type { Rng } from './rng'

// The wet watercolour kit: paper, pencil and washes, painted into a 2D
// context. A wash is built once (a soft-edged body, a darker ring where the
// pigment pooled at its edge, blooms dropped in wet, and grain where the paper
// shows through) and laid on the paper with `multiply`, so washes that overlap
// darken and the pencil under-drawing shows through them. Nothing here blurs
// per frame and nothing uses the context's `filter`: softness comes from
// drawing a shape small and scaling it up.

export type Ctx = CanvasRenderingContext2D
export type Sheet = { canvas: CanvasImageSource & { width: number; height: number }; g: Ctx }
/** Makes an off-screen sheet of the given size in device pixels. The Mount passes the browser's; a test passes a stub. */
export type MakeSheet = (width: number, height: number) => Sheet
export type Point = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }

export const PAPER = '#fbf7ee'
export const GRAPHITE = '#4b4a57'

/** A six-digit colour at a strength from 0 to 1. A fade runs to the same colour at no strength, never to black. */
export function fadeTo(color: string, strength: number): string {
  const n = Number.parseInt(color.slice(1), 16)
  const value = color.length === 4
    ? [((n >> 8) & 15) * 17, ((n >> 4) & 15) * 17, (n & 15) * 17]
    : [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  return `rgba(${value[0]},${value[1]},${value[2]},${strength})`
}

/** A closed, slightly uneven outline around an ellipse: the hand that painted it was not a compass. */
export function blob(rng: Rng, cx: number, cy: number, rx: number, ry: number, wobble = 0.06, points = 14): Point[] {
  const out: Point[] = []
  const turn = rng.range(0, Math.PI * 2)
  for (let i = 0; i < points; i++) {
    const a = turn + (i / points) * Math.PI * 2
    const r = 1 + rng.range(-wobble, wobble)
    out.push({ x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r })
  }
  return out
}

/** The smallest box that holds every point, grown by `pad` on each side. */
export function boxOf(points: readonly Point[], pad = 0): Box {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
  for (const p of points) {
    if (p.x < minX) minX = p.x
    if (p.y < minY) minY = p.y
    if (p.x > maxX) maxX = p.x
    if (p.y > maxY) maxY = p.y
  }
  return { x: minX - pad, y: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
}

/** Traces a line through the points, closed or open, as the current path: smooth, or with straight sides when `sharp`. */
export function trace(g: Ctx, points: readonly Point[], closed = true, sharp = false): void {
  const n = points.length
  if (n < 2) return
  g.beginPath()
  if (sharp) {
    g.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < n; i++) g.lineTo(points[i].x, points[i].y)
    if (closed) g.closePath()
    return
  }
  if (!closed) {
    g.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < n - 1; i++) {
      const p = points[i], q = points[i + 1]
      g.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
    }
    g.lineTo(points[n - 1].x, points[n - 1].y)
    return
  }
  const first = points[0], last = points[n - 1]
  g.moveTo((last.x + first.x) / 2, (last.y + first.y) / 2)
  for (let i = 0; i < n; i++) {
    const p = points[i], q = points[(i + 1) % n]
    g.quadraticCurveTo(p.x, p.y, (p.x + q.x) / 2, (p.y + q.y) / 2)
  }
  g.closePath()
}

export type WashStyle = {
  /** The pigment. */
  color: string
  /** The darker colour that pooled at the edge; the pigment itself when left out. */
  edge?: string
  /** How strong the wash is, 0 to 1. */
  strength?: number
  /** How far the edge bleeds, in scene units: small for a wash laid on dry paper, large for one laid on wet. */
  bleed?: number
  /** How wide the ring of pooled pigment at the edge is, in scene units. */
  pool?: number
  /** Colours dropped in wet: each blooms as a soft patch inside the wash. */
  blooms?: readonly string[]
  /** How much paper shows through as grain, 0 to 1. */
  grain?: number
  /** A plain piece: an even coat with a crisp edge, no blooms and no grain. */
  flat?: boolean
  /** Straight sides between the points, for a strip or a plank. */
  sharp?: boolean
  /** Paper is put back under the shape first, as a painter leaves a place unpainted for what comes on top. A plain piece always is. */
  reserve?: boolean
}

/** Puts paper back under a shape, so that what is painted there next is not darkened by what lies beneath. */
export function lift(g: Ctx, points: readonly Point[], sharp = false): void {
  g.save()
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.fillStyle = PAPER
  trace(g, points, true, sharp)
  g.fill()
  g.restore()
}

export class Watercolour {
  private readonly grainTile: Sheet
  /** The sheets a wash is built on, one for each part of the work and used again for every wash, so painting a whole scene holds six of them and no more. */
  private readonly sheets = new Map<string, Sheet>()
  /** How many washes and pencil lines have been laid down. */
  laid = 0

  private readonly makeSheet: MakeSheet
  private rng: Rng
  /** Device pixels per scene unit. */
  private readonly scale: number

  constructor(makeSheet: MakeSheet, rng: Rng, scale: number) {
    this.makeSheet = makeSheet
    this.rng = rng
    this.scale = scale
    this.grainTile = this.paintGrain()
  }

  /** Gives back the memory of every sheet it made. A tablet's browser keeps a tight count of canvas memory, and a sheet that is only dropped is not given back at once. */
  dispose(): void {
    for (const sheet of [...this.sheets.values(), this.grainTile]) { sheet.canvas.width = 0; sheet.canvas.height = 0 }
    this.sheets.clear()
  }

  /** Paints from another stream from here on: a piece that is painted again draws the same blooms as before. */
  from(rng: Rng): this {
    this.rng = rng
    return this
  }

  /** A cleared sheet of this size for one part of the work. Sizing a canvas wipes it and resets its context. */
  private scratch(role: string, width: number, height: number): Sheet {
    let sheet = this.sheets.get(role)
    if (!sheet) {
      sheet = this.makeSheet(width, height)
      this.sheets.set(role, sheet)
    }
    sheet.canvas.width = width
    sheet.canvas.height = height
    return sheet
  }

  /** Specks where the pigment missed the hollows of the paper. */
  private paintGrain(): Sheet {
    const size = 160
    const tile = this.makeSheet(size, size)
    for (let i = 0; i < 900; i++) {
      const r = this.rng.range(0.4, 1.7)
      tile.g.globalAlpha = this.rng.range(0.15, 0.8)
      tile.g.beginPath()
      tile.g.arc(this.rng.range(0, size), this.rng.range(0, size), r, 0, Math.PI * 2)
      tile.g.fill()
    }
    return tile
  }

  /** The sheet of paper itself, with a faint tooth. */
  paper(g: Ctx, width: number, height: number): void {
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.fillStyle = PAPER
    g.fillRect(0, 0, width, height)
    g.globalAlpha = 0.05
    g.fillStyle = g.createPattern(this.grainTile.canvas, 'repeat') ?? GRAPHITE
    g.fillRect(0, 0, width, height)
    g.globalAlpha = 1
  }

  /**
   * One wash. `points` are in scene units and `g` is already scaled to them.
   * The wash is built on sheets of its own and laid down in one `multiply`.
   */
  wash(g: Ctx, points: readonly Point[], style: WashStyle): void {
    this.laid++
    const s = this.scale
    if (style.reserve ?? style.flat) lift(g, points, style.sharp)
    const bleed = style.flat ? 1.5 : (style.bleed ?? 3)
    const pool = style.flat ? 2.5 : (style.pool ?? 5)
    const box = boxOf(points, bleed * 3)
    const w = Math.max(2, Math.ceil(box.w * s)), h = Math.max(2, Math.ceil(box.h * s))
    const place = (sheet: Sheet): void => { sheet.g.setTransform(s, 0, 0, s, -box.x * s, -box.y * s) }

    // The shape with a hard edge.
    const mask = this.scratch('mask', w, h)
    place(mask)
    trace(mask.g, points, true, style.sharp)
    mask.g.fill()

    // The same shape with a soft edge: drawn small, then scaled back up in two stages, which keeps the edge smooth.
    const soften = (source: Sheet, by: number, into: string): Sheet => {
      const k = Math.max(1, by * s), sw = Math.max(1, Math.ceil(w / k)), sh = Math.max(1, Math.ceil(h / k))
      const r = Math.sqrt(k), mw = Math.max(1, Math.ceil(w / r)), mh = Math.max(1, Math.ceil(h / r))
      const midDown = this.scratch('mid', mw, mh)
      midDown.g.drawImage(source.canvas, 0, 0, w, h, 0, 0, mw, mh)
      const small = this.scratch('small', sw, sh)
      small.g.drawImage(midDown.canvas, 0, 0, mw, mh, 0, 0, sw, sh)
      const midUp = this.scratch('mid', mw, mh)
      midUp.g.drawImage(small.canvas, 0, 0, sw, sh, 0, 0, mw, mh)
      const soft = this.scratch(into, w, h)
      soft.g.drawImage(midUp.canvas, 0, 0, mw, mh, 0, 0, w, h)
      return soft
    }
    const body = soften(mask, bleed, 'body')
    body.g.globalCompositeOperation = 'source-in'
    body.g.fillStyle = style.color
    body.g.fillRect(0, 0, w, h)

    if (!style.flat) {
      // Wet-in-wet: other pigment dropped into the wash, and lighter pools where water pushed the pigment away.
      place(body)
      body.g.globalCompositeOperation = 'source-atop'
      for (const color of style.blooms ?? []) this.bloom(body.g, box, color, 0.55)
      body.g.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < 3; i++) this.bloom(body.g, box, '#000', 0.28)
      body.g.setTransform(1, 0, 0, 1, 0, 0)
    }

    // The ring where pigment pooled as the wash dried: the hard shape minus its softened self.
    const ring = this.scratch('ring', w, h)
    ring.g.drawImage(mask.canvas, 0, 0)
    ring.g.globalCompositeOperation = 'destination-out'
    ring.g.drawImage(soften(mask, pool, 'soft').canvas, 0, 0)
    ring.g.globalCompositeOperation = 'source-in'
    ring.g.fillStyle = style.edge ?? style.color
    ring.g.fillRect(0, 0, w, h)
    body.g.globalCompositeOperation = 'source-over'
    body.g.globalAlpha = style.flat ? 0.55 : 1
    body.g.drawImage(ring.canvas, 0, 0)
    // Laid twice, so the rim is plainly darker than the wash inside it.
    if (!style.flat) body.g.drawImage(ring.canvas, 0, 0)
    body.g.globalAlpha = 1

    if (!style.flat) {
      body.g.globalCompositeOperation = 'destination-out'
      body.g.globalAlpha = style.grain ?? 0.22
      body.g.fillStyle = body.g.createPattern(this.grainTile.canvas, 'repeat') ?? '#000'
      body.g.fillRect(0, 0, w, h)
      body.g.globalAlpha = 1
    }

    g.save()
    g.globalCompositeOperation = 'multiply'
    g.globalAlpha = style.strength ?? (style.flat ? 0.95 : 0.8)
    g.drawImage(body.canvas, box.x, box.y, box.w, box.h)
    g.restore()
  }

  /** One soft patch somewhere inside the box. */
  private bloom(g: Ctx, box: Box, color: string, alpha: number): void {
    const x = box.x + this.rng.range(0.2, 0.8) * box.w, y = box.y + this.rng.range(0.2, 0.8) * box.h
    const r = Math.max(6, Math.min(box.w, box.h) * this.rng.range(0.22, 0.5))
    const fade = g.createRadialGradient(x, y, 0, x, y, r)
    fade.addColorStop(0, fadeTo(color, 1))
    fade.addColorStop(0.55, fadeTo(color, 0.55))
    fade.addColorStop(1, fadeTo(color, 0))
    g.globalAlpha = alpha
    g.fillStyle = fade
    g.fillRect(x - r, y - r, r * 2, r * 2)
    g.globalAlpha = 1
  }

  /** A pencil line: drawn twice, a little apart, as a hand goes over a line it is not sure of. */
  pencil(g: Ctx, points: readonly Point[], closed = false, weight = 1, sharp = false): void {
    this.laid++
    g.save()
    g.globalCompositeOperation = 'multiply'
    g.strokeStyle = GRAPHITE
    g.lineCap = 'round'
    g.lineJoin = 'round'
    for (let pass = 0; pass < 2; pass++) {
      const jitter = pass === 0 ? 0 : 1.1
      const moved = points.map((p) => ({ x: p.x + this.rng.range(-jitter, jitter), y: p.y + this.rng.range(-jitter, jitter) }))
      g.globalAlpha = pass === 0 ? 0.55 : 0.3
      g.lineWidth = (pass === 0 ? 1.5 : 1) * weight
      trace(g, moved, closed, sharp)
      g.stroke()
    }
    g.restore()
  }
}
