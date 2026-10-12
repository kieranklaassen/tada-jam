import { makeRng, type Rng } from './rng'

// Candlelit gouache, as paint: matte opaque shapes laid with a broad brush,
// soft at the edge, with no ink line and no bands of tone. A form is one flat
// daub, a few lighter strokes on the side the flames are on and a few darker
// ones on the other. Everything here is painted into a sprite, and the frame
// stamps it. The hall and all that stands in it are painted when the surface
// takes its shape, with blurred edges. A thing is painted in the frame in
// which it first looks as it does, and that is painted without blur.

export type Pen = CanvasRenderingContext2D
/** A canvas, or what a test hands over in its place. */
export type Sheet = { width: number; height: number; getContext(kind: '2d'): unknown }

let makeSheet: () => Sheet = () => document.createElement('canvas')

/** Where sprites get their canvases. A test gives recording ones, so the painters run on a machine with no canvas. */
export function useCanvases(make: () => Sheet): void {
  makeSheet = make
}

/** A picture painted once: `w` by `h` in stage units, with the point (`ox`, `oy`) of it as its handle. */
export type Sprite = { image: CanvasImageSource; w: number; h: number; ox: number; oy: number }

/** An empty sprite and the pen that paints it, in stage units with the handle at the origin. A painting too long for one frame is laid into it step by step. */
export function blank(w: number, h: number, ox: number, oy: number, density: number): { sprite: Sprite; g: Pen } {
  const sheet = makeSheet()
  sheet.width = Math.max(1, Math.ceil(w * density))
  sheet.height = Math.max(1, Math.ceil(h * density))
  const g = sheet.getContext('2d') as Pen
  g.setTransform(density, 0, 0, density, ox * density, oy * density)
  return { sprite: { image: sheet as unknown as CanvasImageSource, w, h, ox, oy }, g }
}

/** Tells the brushes how many canvas pixels a stage unit gets in the sprite about to be painted. */
export function setDensity(density: number): void {
  SOFT.density = density
}

/**
 * Paints a sprite. The painter draws in stage units with the handle at the origin; `density` is how many
 * canvas pixels a stage unit gets, so a sprite is as sharp as the surface it is stamped on.
 */
export function sprite(w: number, h: number, ox: number, oy: number, density: number, paint: (g: Pen) => void): Sprite {
  const made = blank(w, h, ox, oy, density)
  setDensity(density)
  paint(made.g)
  return made.sprite
}

/** Stamps a sprite with its handle at (x, y). */
export function stamp(g: Pen, s: Sprite, x: number, y: number): void {
  g.drawImage(s.image, x - s.ox, y - s.oy, s.w, s.h)
}

/** Stamps the part of a sprite from `from` to `to` (stage units across it, from its left edge), with that part's left edge at x. */
export function stampPart(g: Pen, s: Sprite, from: number, to: number, x: number, y: number): void {
  const image = s.image as unknown as { width: number; height: number }
  const k = image.width / s.w
  g.drawImage(s.image, from * k, 0, (to - from) * k, image.height, x, y - s.oy, to - from, s.h)
}

/** Stamps a sprite turned and stretched about its handle. */
export function stampTurned(g: Pen, s: Sprite, x: number, y: number, angle: number, sx = 1, sy = 1): void {
  g.save()
  g.translate(x, y)
  if (angle) g.rotate(angle)
  if (sx !== 1 || sy !== 1) g.scale(sx, sy)
  g.drawImage(s.image, -s.ox, -s.oy, s.w, s.h)
  g.restore()
}

/** How soft a daub's edge is, in stage units. A shadow's blur ignores the transform, so the density is kept here. */
const SOFT = { density: 1, edge: 2.2, blur: true }

/**
 * Whether the brushes soften their edges with a blur. They do for the pictures painted when the surface takes its
 * shape. A thing is painted in the frame in which it first looks as it does, and a blur is the dearest paint
 * there is, so a thing is painted without one: its daubs get a feathered edge from one faint stroke instead.
 */
export function setBlur(on: boolean): void {
  SOFT.blur = on
}

export type Rgb = [number, number, number]

export function rgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function mix(a: string, b: string, t: number): string {
  const p = rgb(a), q = rgb(b)
  const c = (i: number) => Math.round(p[i] + (q[i] - p[i]) * t)
  return `#${((1 << 24) | (c(0) << 16) | (c(1) << 8) | c(2)).toString(16).slice(1)}`
}

export function alpha(hex: string, a: number): string {
  const [r, g, b] = rgb(hex)
  return `rgba(${r},${g},${b},${a})`
}

/** The brown dark everything falls off into, and the colour of the flames' light. */
export const DARK = '#1c120c'
export const GLOW = '#ffb347'

/** A flat list of points, x then y. */
export type Ring = number[]

/** A closed curve through the middles of the ring's sides, so no corner shows. */
export function trace(g: Pen, ring: Ring): void {
  const n = ring.length / 2
  g.beginPath()
  g.moveTo((ring[n * 2 - 2] + ring[0]) / 2, (ring[n * 2 - 1] + ring[1]) / 2)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    g.quadraticCurveTo(ring[i * 2], ring[i * 2 + 1], (ring[i * 2] + ring[j * 2]) / 2, (ring[i * 2 + 1] + ring[j * 2 + 1]) / 2)
  }
  g.closePath()
}

/** An oval as a ring, laid by hand: never quite round. */
export function oval(cx: number, cy: number, rx: number, ry: number, rng?: Rng, turn = 0, points = 10): Ring {
  const ring: Ring = []
  const cos = Math.cos(turn), sin = Math.sin(turn)
  for (let i = 0; i < points; i++) {
    const a = (i / points) * Math.PI * 2
    const wob = rng ? 1 + (rng.next() - 0.5) * 0.07 : 1
    const x = Math.cos(a) * rx * 1.04 * wob, y = Math.sin(a) * ry * 1.04 * wob
    ring.push(cx + x * cos - y * sin, cy + x * sin + y * cos)
  }
  return ring
}

function bounds(ring: Ring): { x: number; y: number; w: number; h: number } {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (let i = 0; i < ring.length; i += 2) {
    x0 = Math.min(x0, ring[i]); x1 = Math.max(x1, ring[i])
    y0 = Math.min(y0, ring[i + 1]); y1 = Math.max(y1, ring[i + 1])
  }
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }
}

/** Where the light comes from for the sprite being painted, as a direction: (1, 0) is from the right. */
export type Light = { x: number; y: number }

/**
 * One form in gouache: a flat daub with a soft edge, then, inside it, broad strokes of lighter paint on the lit
 * side and darker paint on the far side. `form` is how strongly it is modelled: 0 leaves the daub flat.
 */
export function daub(g: Pen, ring: Ring, colour: string, light: Light | null = null, rng: Rng = makeRng(1), form = 1): void {
  g.save()
  trace(g, ring)
  g.fillStyle = colour
  if (SOFT.blur) {
    g.shadowColor = colour
    g.shadowBlur = SOFT.edge * SOFT.density
    g.fill()
    g.shadowBlur = 0
    g.shadowColor = 'transparent'
  } else {
    g.fill()
    g.strokeStyle = alpha(colour, 0.5)
    g.lineWidth = SOFT.edge
    g.stroke()
  }
  if (light && form > 0) {
    const b = bounds(ring)
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, reach = Math.max(b.w, b.h)
    const len = Math.hypot(light.x, light.y) || 1
    const lx = light.x / len, ly = light.y / len
    g.clip()
    g.lineCap = 'round'
    const lay = (side: number, paint: string, strokes: number, strength: number) => {
      for (let k = 0; k < strokes; k++) {
        // Each stroke is laid a little off the last, in its own direction, as a hand lays them.
        const off = (0.24 + k * 0.17 + rng.next() * 0.06) * side
        const mx = cx + lx * b.w * off, my = cy + ly * b.h * off
        const turn = (rng.next() - 0.5) * 0.5, cos = Math.cos(turn), sin = Math.sin(turn)
        const px = -ly * cos - lx * sin, py = lx * cos - ly * sin
        const bend = (0.1 + rng.next() * 0.16) * reach * side
        g.beginPath()
        g.moveTo(mx - px * reach * 0.6, my - py * reach * 0.6)
        g.quadraticCurveTo(mx - lx * bend, my - ly * bend, mx + px * reach * 0.6, my + py * reach * 0.6)
        g.strokeStyle = alpha(paint, strength * (0.55 + k * 0.3) * form)
        g.lineWidth = Math.min(b.w, b.h) * (0.26 + rng.next() * 0.1)
        g.stroke()
      }
    }
    lay(1, mix(colour, GLOW, 0.4), 2, 0.3)
    lay(-1, mix(colour, DARK, 0.6), 2, 0.4)
  }
  g.restore()
}

/** One stroke of a loaded brush through the points, soft at the edge. */
export function brush(g: Pen, points: Ring, colour: string, width: number): void {
  g.save()
  if (SOFT.blur) {
    g.shadowColor = colour
    g.shadowBlur = SOFT.edge * 0.7 * SOFT.density
  }
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(points[0], points[1])
  for (let i = 2; i < points.length - 2; i += 2) g.quadraticCurveTo(points[i], points[i + 1], (points[i] + points[i + 2]) / 2, (points[i + 1] + points[i + 3]) / 2)
  g.lineTo(points[points.length - 2], points[points.length - 1])
  g.stroke()
  g.restore()
}

/** A round dab of paint. */
export function dot(g: Pen, x: number, y: number, r: number, colour: string): void {
  g.save()
  if (SOFT.blur) {
    g.shadowColor = colour
    g.shadowBlur = SOFT.edge * 0.6 * SOFT.density
  }
  g.fillStyle = colour
  g.beginPath()
  g.arc(x, y, r, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** Dry brush over an area: many faint short strokes, so flat paint looks laid by hand. */
export function dryBrush(g: Pen, x: number, y: number, w: number, h: number, colour: string, count: number, rng: Rng, length = 90, width = 16, strength = 0.1): void {
  g.save()
  g.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const sx = x + rng.next() * w, sy = y + rng.next() * h
    const a = (rng.next() - 0.5) * 0.9
    const l = length * (0.5 + rng.next())
    g.strokeStyle = alpha(colour, strength * (0.4 + rng.next() * 0.9))
    g.lineWidth = width * (0.5 + rng.next())
    g.beginPath()
    g.moveTo(sx, sy)
    g.quadraticCurveTo(sx + Math.cos(a) * l * 0.5, sy + Math.sin(a) * l * 0.5 + (rng.next() - 0.5) * 14, sx + Math.cos(a) * l, sy + Math.sin(a) * l)
    g.stroke()
  }
  g.restore()
}

/** A pool of light: brightest in the middle and gone at `r`. Painted into the hall, or made a sprite and added. */
export function pool(g: Pen, x: number, y: number, r: number, colour: string, strength: number): void {
  const fade = g.createRadialGradient(x, y, 0, x, y, r)
  fade.addColorStop(0, alpha(colour, strength))
  fade.addColorStop(0.35, alpha(colour, strength * 0.45))
  fade.addColorStop(0.7, alpha(colour, strength * 0.12))
  fade.addColorStop(1, alpha(colour, 0))
  g.fillStyle = fade
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

/**
 * Candlelight on a finished sprite: what is already painted is warmed near the light at (x, y) and falls off
 * into the brown dark away from it. Only paint that is there is touched.
 */
export function candlelit(g: Pen, x: number, y: number, r: number, dark = 0.8, warm = 0.16): void {
  g.save()
  g.globalCompositeOperation = 'source-atop'
  const shade = g.createRadialGradient(x, y, r * 0.25, x, y, r)
  shade.addColorStop(0, alpha(DARK, 0))
  shade.addColorStop(0.55, alpha(DARK, dark * 0.42))
  shade.addColorStop(1, alpha(DARK, dark))
  g.fillStyle = shade
  g.fillRect(x - r * 3, y - r * 3, r * 6, r * 6)
  const glow = g.createRadialGradient(x, y, 0, x, y, r * 0.8)
  glow.addColorStop(0, alpha(GLOW, warm))
  glow.addColorStop(1, alpha(GLOW, 0))
  g.fillStyle = glow
  g.fillRect(x - r, y - r, r * 2, r * 2)
  g.restore()
}

/** A straight-sided fill with a soft edge, for what a carpenter made: a frame, a crate, a pane. */
export function slab(g: Pen, x: number, y: number, w: number, h: number, colour: string): void {
  g.save()
  if (SOFT.blur) {
    g.shadowColor = colour
    g.shadowBlur = SOFT.edge * SOFT.density
  }
  g.fillStyle = colour
  g.fillRect(x, y, w, h)
  g.restore()
}
