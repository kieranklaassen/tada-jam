// Painting helpers for the advent market. The look is gouache by candlelight:
// matte, opaque, soft-edged shapes with dry-brush texture, lit from many small
// flames. Everything here is plain canvas, and nothing touches the DOM until
// it is called from inside `create`.

import { TAU } from '../../kit/math.ts'

export type G = CanvasRenderingContext2D
export type Rng = () => number
export type Rgb = readonly [number, number, number]

// A painted picture kept on its own canvas, sized in logical pixels.
export interface Sprite {
  canvas: HTMLCanvasElement
  w: number
  h: number
}

export function mulberry(seed: number): Rng {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function makeSprite(w: number, h: number, scale: number, paint: (g: G) => void): Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(w * scale))
  canvas.height = Math.max(1, Math.ceil(h * scale))
  const g = canvas.getContext('2d')
  if (!g) throw new Error('2D canvas is not available')
  g.scale(scale, scale)
  g.lineCap = 'round'
  g.lineJoin = 'round'
  paint(g)
  // Make the browser finish painting now, not in the first frame that uses it.
  g.getImageData(0, 0, 1, 1)
  return { canvas, w, h }
}

export function put(g: G, s: Sprite, x: number, y: number, scale = 1): void {
  g.drawImage(s.canvas, x, y, s.w * scale, s.h * scale)
}

export function hexRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function rgba(c: Rgb, a = 1): string {
  return `rgba(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])},${a})`
}

export function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

export function shade(c: Rgb, k: number): Rgb {
  // k below 1 darkens toward a warm umber, above 1 lifts toward candle cream.
  return k < 1 ? mix([46, 24, 20], c, k) : mix(c, [255, 236, 190], k - 1)
}

// The plant-dye palette the whole market is painted from.
export const DYE = {
  madder: hexRgb('#b4533f'),
  rose: hexRgb('#c9806f'),
  ochre: hexRgb('#cf9a3e'),
  honey: hexRgb('#e6ae45'),
  cream: hexRgb('#efdfbe'),
  moss: hexRgb('#6c7a45'),
  fir: hexRgb('#35543a'),
  firDark: hexRgb('#223a2c'),
  indigo: hexRgb('#3d5173'),
  dusk: hexRgb('#586a9a'),
  plum: hexRgb('#75495d'),
  wood: hexRgb('#a8703f'),
  woodDark: hexRgb('#6e4426'),
  woodLight: hexRgb('#c99558'),
  wall: hexRgb('#d9a273'),
  skin: hexRgb('#edc39c'),
  wax: hexRgb('#e9aa3c'),
  umber: hexRgb('#2e1814'),
} as const

// A soft round dab of colour.
export function blob(g: G, x: number, y: number, r: number, c: Rgb, alpha: number): void {
  const grad = g.createRadialGradient(x, y, 0, x, y, r)
  grad.addColorStop(0, rgba(c, alpha))
  grad.addColorStop(0.55, rgba(c, alpha * 0.55))
  grad.addColorStop(1, rgba(c, 0))
  g.fillStyle = grad
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

// Dry-brush texture inside a rectangle: short matte strokes a little lighter
// and a little darker than what is under them, all leaning one way. Clip
// first if the shape is not a rectangle.
export function brush(g: G, x: number, y: number, w: number, h: number, rng: Rng, count: number, angle = 0, strength = 1, long = 60): void {
  g.save()
  g.lineCap = 'round'
  for (let i = 0; i < count; i++) {
    const px = x + rng() * w
    const py = y + rng() * h
    const len = long * (0.4 + rng())
    const a = angle + (rng() - 0.5) * 0.35
    const light = rng() < 0.5
    g.strokeStyle = light ? `rgba(255,232,190,${(0.03 + rng() * 0.05) * strength})` : `rgba(60,28,20,${(0.03 + rng() * 0.05) * strength})`
    g.lineWidth = 3 + rng() * 11
    g.beginPath()
    g.moveTo(px, py)
    g.lineTo(px + Math.cos(a) * len, py + Math.sin(a) * len)
    g.stroke()
  }
  g.restore()
}

// Fine speckle: the tooth of the paper showing through the paint.
export function grain(g: G, x: number, y: number, w: number, h: number, count: number, rng: Rng, dark = 0.05, light = 0.05): void {
  for (let i = 0; i < count; i++) {
    const s = 0.7 + rng() * 1.5
    g.fillStyle = rng() < 0.5 ? `rgba(50,24,18,${dark})` : `rgba(255,244,214,${light})`
    g.fillRect(x + rng() * w, y + rng() * h, s, s)
  }
}

// A closed smooth shape through points: hand-made edges for free.
export function smoothClosed(g: G, pts: readonly (readonly [number, number])[]): void {
  const n = pts.length
  const last = pts[n - 1]!
  const first = pts[0]!
  g.beginPath()
  g.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2)
  for (let i = 0; i < n; i++) {
    const p = pts[i]!
    const q = pts[(i + 1) % n]!
    g.quadraticCurveTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2)
  }
  g.closePath()
}

// A round-ish shape with a hand's wobble.
export function wobbly(g: G, x: number, y: number, rx: number, ry: number, rng: Rng, wobble = 0.07, points = 12, rot = 0): void {
  const pts: [number, number][] = []
  const c = Math.cos(rot)
  const s = Math.sin(rot)
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU
    const k = 1 + (rng() * 2 - 1) * wobble
    const px = Math.cos(a) * rx * k
    const py = Math.sin(a) * ry * k
    pts.push([x + px * c - py * s, y + px * s + py * c])
  }
  smoothClosed(g, pts)
}

// A four-sided shape with slightly wandering edges, filled matte.
export function slab(g: G, x: number, y: number, w: number, h: number, fill: string, rng: Rng, wander = 1.5): void {
  const j = () => (rng() - 0.5) * 2 * wander
  g.beginPath()
  g.moveTo(x + j(), y + j())
  g.lineTo(x + w * 0.5 + j(), y + j() * 0.6)
  g.lineTo(x + w + j(), y + j())
  g.lineTo(x + w + j(), y + h + j())
  g.lineTo(x + w * 0.5 + j(), y + h + j() * 0.6)
  g.lineTo(x + j(), y + h + j())
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

// A plank surface: matte base, brushed along the grain, with a few seams.
export function planks(g: G, x: number, y: number, w: number, h: number, base: Rgb, rng: Rng, rows: number, vertical = false): void {
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  g.fillStyle = rgba(base)
  g.fillRect(x, y, w, h)
  const n = Math.max(1, rows)
  for (let i = 0; i < n; i++) {
    const tone = 0.9 + rng() * 0.22
    g.fillStyle = rgba(shade(base, tone), 0.55)
    if (vertical) g.fillRect(x + (w / n) * i, y, w / n, h)
    else g.fillRect(x, y + (h / n) * i, w, h / n)
  }
  brush(g, x - 40, y - 10, w + 40, h + 20, rng, Math.round((w * h) / 2600), vertical ? Math.PI / 2 : 0, 0.9, vertical ? 70 : 110)
  // Grain lines.
  for (let i = 0; i < Math.round((vertical ? w : h) / 7); i++) {
    const at = rng()
    const phase = rng() * 9
    const amp = 1 + rng() * 2.5
    g.beginPath()
    const span = vertical ? h : w
    for (let s = -10; s <= span + 10; s += 26) {
      const off = Math.sin(s * 0.008 + phase) * amp + Math.sin(s * 0.027 + phase * 2) * amp * 0.4
      const px = vertical ? x + at * w + off : x + s
      const py = vertical ? y + s : y + at * h + off
      if (s === -10) g.moveTo(px, py)
      else g.lineTo(px, py)
    }
    g.strokeStyle = `rgba(70,36,18,${0.05 + rng() * 0.09})`
    g.lineWidth = 0.8 + rng() * 1.4
    g.stroke()
  }
  for (let i = 1; i < n; i++) {
    g.beginPath()
    if (vertical) {
      const px = x + (w / n) * i
      g.moveTo(px, y)
      g.lineTo(px + (rng() - 0.5) * 2, y + h)
    } else {
      const py = y + (h / n) * i
      g.moveTo(x, py)
      g.lineTo(x + w, py + (rng() - 0.5) * 2)
    }
    g.strokeStyle = 'rgba(58,30,16,0.42)'
    g.lineWidth = 2
    g.stroke()
  }
  g.restore()
}

// A lazured wall: thin veils of warm colour laid over each other.
export function lazure(g: G, x: number, y: number, w: number, h: number, base: Rgb, tints: readonly Rgb[], rng: Rng, count: number): void {
  g.save()
  g.beginPath()
  g.rect(x, y, w, h)
  g.clip()
  g.fillStyle = rgba(base)
  g.fillRect(x, y, w, h)
  for (let i = 0; i < count; i++) {
    blob(g, x + rng() * w, y + rng() * h, 70 + rng() * 170, tints[Math.floor(rng() * tints.length)]!, 0.08 + rng() * 0.12)
  }
  brush(g, x, y, w, h, rng, Math.round((w * h) / 5200), -0.5, 0.7, 90)
  g.restore()
}

// One fir sprig lying along +x from (x, y): a stem, side twigs, and needles in
// three greens. `len` is the stem length.
export function sprig(g: G, x: number, y: number, len: number, ang: number, rng: Rng, tone = 1, twigs = true): void {
  const paths: [number, number, number, number][][] = [[], [], []]
  const needle = (px: number, py: number, a: number, l: number) => {
    paths[Math.floor(rng() * 3)]!.push([px, py, px + Math.cos(a) * l, py + Math.sin(a) * l])
  }
  const needles = (x0: number, y0: number, a: number, l: number, size: number) => {
    const steps = Math.max(3, Math.round(l / 5))
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const px = x0 + Math.cos(a) * l * t
      const py = y0 + Math.sin(a) * l * t
      const nl = size * (1 - t * 0.45) * (0.8 + rng() * 0.4)
      needle(px, py, a + 0.95 + (rng() - 0.5) * 0.3, nl)
      needle(px, py, a - 0.95 + (rng() - 0.5) * 0.3, nl)
    }
    needle(x0 + Math.cos(a) * l, y0 + Math.sin(a) * l, a, size * 0.8)
  }
  g.save()
  g.translate(x, y)
  g.rotate(ang)
  const stems: [number, number, number, number][] = [[0, 0, len, 0]]
  needles(0, 0, 0, len, len * 0.11 + 4)
  if (twigs) {
    const count = Math.max(2, Math.round(len / 26))
    for (let i = 0; i < count; i++) {
      const t = 0.12 + (i / count) * 0.7
      const l = len * (0.5 - t * 0.32) * (0.8 + rng() * 0.4)
      for (const side of [-1, 1]) {
        const a = side * (0.62 + rng() * 0.25)
        stems.push([len * t, 0, len * t + Math.cos(a) * l, Math.sin(a) * l])
        needles(len * t, 0, a, l, len * 0.085 + 3.5)
      }
    }
  }
  g.lineCap = 'round'
  g.strokeStyle = rgba(shade([92, 62, 38], tone))
  g.lineWidth = Math.max(1.2, len * 0.022)
  g.beginPath()
  for (const s of stems) {
    g.moveTo(s[0], s[1])
    g.lineTo(s[2], s[3])
  }
  g.stroke()
  const greens: Rgb[] = [shade([34, 62, 44], tone), shade([52, 88, 56], tone), shade([86, 118, 70], tone)]
  for (let k = 0; k < 3; k++) {
    g.strokeStyle = rgba(greens[k]!)
    g.lineWidth = Math.max(1.3, len * 0.02)
    g.beginPath()
    for (const n of paths[k]!) {
      g.moveTo(n[0], n[1])
      g.lineTo(n[2], n[3])
    }
    g.stroke()
  }
  g.restore()
}

// A swag of fir between two points, hanging by `sag`.
export function garland(g: G, x0: number, y0: number, x1: number, y1: number, sag: number, rng: Rng, size = 34, tone = 1): void {
  const steps = Math.max(4, Math.round(Math.hypot(x1 - x0, y1 - y0) / (size * 0.42)))
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * sag
    const slope = Math.atan2(y1 - y0 + Math.cos(t * Math.PI) * Math.PI * sag, x1 - x0)
    for (const side of [-1, 1]) {
      sprig(g, x, y, size * (0.75 + rng() * 0.5), slope + side * (0.5 + rng() * 0.7) + (rng() < 0.5 ? Math.PI : 0), rng, tone * (0.85 + rng() * 0.3), false)
    }
  }
}

// A candle flame standing on (x, y), `h` tall. `flick` is about 0.8..1.1.
export function flame(g: G, x: number, y: number, h: number, flick: number, lean = 0): void {
  const hh = h * (0.86 + flick * 0.14)
  const w = h * 0.3
  const tipX = lean * h * 0.5 + (flick - 0.95) * h * 0.35
  g.beginPath()
  g.moveTo(x, y + h * 0.05)
  g.bezierCurveTo(x - w * 1.3, y - hh * 0.16, x - w * 0.5 + tipX * 0.6, y - hh * 0.7, x + tipX, y - hh)
  g.bezierCurveTo(x + w * 0.5 + tipX * 0.6, y - hh * 0.7, x + w * 1.3, y - hh * 0.16, x, y + h * 0.05)
  g.fillStyle = '#f7a531'
  g.fill()
  g.beginPath()
  g.ellipse(x + tipX * 0.25, y - hh * 0.32, w * 0.56, hh * 0.31, 0, 0, TAU)
  g.fillStyle = '#fff1bd'
  g.fill()
  g.beginPath()
  g.ellipse(x, y - h * 0.04, w * 0.3, h * 0.1, 0, 0, TAU)
  g.fillStyle = 'rgba(110,140,235,0.45)'
  g.fill()
}

// A flame's flicker for time `t`, different for each `seed`, about 0.8..1.1.
export function flicker(t: number, seed = 0): number {
  return 0.95 + Math.sin(t * 9.1 + seed * 3.7) * 0.06 + Math.sin(t * 23.3 + seed * 1.3) * 0.035 + Math.sin(t * 3.3 + seed) * 0.04
}

// Shapes drawn with a soft edge, by painting only the blurred shadow of a
// path that sits off the canvas. `scale` is the context's own scale.
export function soft(g: G, color: string, blur: number, scale: number, path: () => void): void {
  const far = 5000
  g.save()
  g.shadowColor = color
  g.shadowBlur = blur * scale
  g.shadowOffsetX = far * scale
  g.shadowOffsetY = 0
  g.translate(-far, 0)
  g.fillStyle = '#000'
  path()
  g.fill()
  g.restore()
}

// A scalloped cloth awning: stripes in two dyes, hanging edge in soft curves.
export function awning(g: G, x: number, y: number, w: number, h: number, a: Rgb, b: Rgb, rng: Rng, scallops = 7): void {
  const drop = h * 0.3
  g.save()
  g.beginPath()
  g.moveTo(x + 14, y)
  g.lineTo(x + w - 14, y)
  g.lineTo(x + w, y + h - drop)
  const sw = w / scallops
  for (let i = scallops - 1; i >= 0; i--) {
    const sx = x + sw * i
    g.quadraticCurveTo(sx + sw * 0.5, y + h + drop * 0.55, sx, y + h - drop)
  }
  g.closePath()
  g.clip()
  g.fillStyle = rgba(a)
  g.fillRect(x - 4, y - 4, w + 8, h + drop + 8)
  // Stripes fan slightly, as cloth pulled over a frame does.
  const stripes = scallops * 2
  for (let i = 0; i < stripes; i += 2) {
    const t0 = i / stripes
    const t1 = (i + 1) / stripes
    g.beginPath()
    g.moveTo(x + 14 + (w - 28) * t0, y - 2)
    g.lineTo(x + 14 + (w - 28) * t1, y - 2)
    g.lineTo(x + w * t1, y + h + drop)
    g.lineTo(x + w * t0, y + h + drop)
    g.closePath()
    g.fillStyle = rgba(b)
    g.fill()
  }
  // Light from below on the hanging edge, shade under the ridge.
  const grad = g.createLinearGradient(0, y, 0, y + h + drop)
  grad.addColorStop(0, 'rgba(40,18,14,0.28)')
  grad.addColorStop(0.45, 'rgba(40,18,14,0)')
  grad.addColorStop(1, 'rgba(255,214,140,0.2)')
  g.fillStyle = grad
  g.fillRect(x - 4, y - 4, w + 8, h + drop + 8)
  brush(g, x, y, w, h + drop, rng, Math.round((w * h) / 900), Math.PI / 2, 0.8, 40)
  g.restore()
}

export interface Look {
  coat: Rgb
  hat: Rgb
  hair: Rgb
  skin: Rgb
  // 0 a knitted cap, 1 a headscarf, 2 bare hair with a bun, 3 a pointed felt hat.
  head: number
}

// A simply-drawn person standing on (x, y), `h` tall: a felt-doll shape with
// a barely-drawn face. `lh` and `rh` are hand positions relative to (x, y), or
// null for an arm at rest. `turn` -1..1 shifts the face.
export function person(g: G, x: number, y: number, h: number, look: Look, lh: readonly [number, number] | null, rh: readonly [number, number] | null, turn = 0, bob = 0): void {
  const headR = h * 0.105
  const headY = y - h + headR + bob
  const shoulderY = headY + headR * 1.25
  const hemY = y - h * 0.06
  const coat = rgba(look.coat)
  const coatDark = rgba(shade(look.coat, 0.78))
  // Feet.
  g.fillStyle = rgba(shade(DYE.woodDark, 0.7))
  g.beginPath()
  g.ellipse(x - h * 0.07, y - h * 0.02, h * 0.06, h * 0.03, 0, 0, TAU)
  g.ellipse(x + h * 0.07, y - h * 0.02, h * 0.06, h * 0.03, 0, 0, TAU)
  g.fill()
  // Coat: a soft bell.
  g.beginPath()
  g.moveTo(x - h * 0.13, shoulderY)
  g.quadraticCurveTo(x, shoulderY - h * 0.05, x + h * 0.13, shoulderY)
  g.quadraticCurveTo(x + h * 0.2, (shoulderY + hemY) / 2, x + h * 0.2, hemY)
  g.quadraticCurveTo(x, hemY + h * 0.035, x - h * 0.2, hemY)
  g.quadraticCurveTo(x - h * 0.2, (shoulderY + hemY) / 2, x - h * 0.13, shoulderY)
  g.fillStyle = coat
  g.fill()
  // A darker side, away from the light.
  g.save()
  g.clip()
  g.fillStyle = 'rgba(40,18,14,0.16)'
  g.fillRect(x + h * 0.04, shoulderY - h * 0.1, h * 0.3, h)
  g.restore()
  // Arms.
  const arm = (side: number, hand: readonly [number, number] | null) => {
    const sx = x + side * h * 0.125
    const sy = shoulderY + h * 0.035
    const hx = hand ? x + hand[0] : x + side * h * 0.17
    const hy = hand ? y + hand[1] : shoulderY + h * 0.36 + bob
    g.strokeStyle = coatDark
    g.lineWidth = h * 0.075
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(sx, sy)
    const ex = (sx + hx) / 2 + side * h * 0.05
    const ey = (sy + hy) / 2 + h * 0.05
    g.quadraticCurveTo(ex, ey, hx, hy)
    g.stroke()
    g.fillStyle = rgba(look.skin)
    g.beginPath()
    g.arc(hx, hy, h * 0.034, 0, TAU)
    g.fill()
  }
  arm(-1, lh)
  arm(1, rh)
  // Head.
  g.fillStyle = rgba(look.skin)
  g.beginPath()
  g.arc(x, headY, headR, 0, TAU)
  g.fill()
  // Hair or hat.
  if (look.head === 0) {
    g.fillStyle = rgba(look.hat)
    g.beginPath()
    g.arc(x, headY - headR * 0.12, headR * 1.06, Math.PI * 1.02, Math.PI * 1.98)
    g.quadraticCurveTo(x, headY - headR * 0.5, x - headR * 1.06, headY - headR * 0.18)
    g.fill()
    g.beginPath()
    g.arc(x, headY - headR * 1.2, headR * 0.26, 0, TAU)
    g.fill()
  } else if (look.head === 1) {
    g.fillStyle = rgba(look.hat)
    g.beginPath()
    g.arc(x, headY - headR * 0.05, headR * 1.1, Math.PI * 0.9, Math.PI * 2.1)
    g.quadraticCurveTo(x, headY - headR * 0.75, x - headR * 1.08, headY + headR * 0.3)
    g.fill()
  } else if (look.head === 2) {
    g.fillStyle = rgba(look.hair)
    g.beginPath()
    g.arc(x, headY - headR * 0.1, headR * 1.04, Math.PI * 0.98, Math.PI * 2.02)
    g.quadraticCurveTo(x, headY - headR * 0.6, x - headR * 1.04, headY - headR * 0.04)
    g.fill()
    g.beginPath()
    g.arc(x - turn * headR * 0.4, headY - headR * 1.05, headR * 0.36, 0, TAU)
    g.fill()
  } else {
    g.fillStyle = rgba(look.hat)
    g.beginPath()
    g.moveTo(x - headR * 1.1, headY - headR * 0.25)
    g.quadraticCurveTo(x - headR * 0.2, headY - headR * 1.3, x + headR * 0.25, headY - headR * 2.3)
    g.quadraticCurveTo(x + headR * 0.5, headY - headR * 1.2, x + headR * 1.1, headY - headR * 0.25)
    g.quadraticCurveTo(x, headY - headR * 0.75, x - headR * 1.1, headY - headR * 0.25)
    g.fill()
  }
  // The face: two dots and the smallest mouth.
  const fx = x + turn * headR * 0.42
  g.fillStyle = 'rgba(60,34,26,0.8)'
  g.beginPath()
  g.arc(fx - headR * 0.34, headY + headR * 0.12, Math.max(1, headR * 0.085), 0, TAU)
  g.arc(fx + headR * 0.34, headY + headR * 0.12, Math.max(1, headR * 0.085), 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(150,70,58,0.7)'
  g.lineWidth = Math.max(1, headR * 0.08)
  g.beginPath()
  g.arc(fx, headY + headR * 0.36, headR * 0.2, 0.2 * Math.PI, 0.8 * Math.PI)
  g.stroke()
  // A little warmth on the cheeks.
  g.fillStyle = 'rgba(214,112,92,0.22)'
  g.beginPath()
  g.arc(fx - headR * 0.56, headY + headR * 0.36, headR * 0.2, 0, TAU)
  g.arc(fx + headR * 0.56, headY + headR * 0.36, headR * 0.2, 0, TAU)
  g.fill()
}

// A folded paper star with eight points, the kind that hangs in the hall.
export function paperStar(g: G, x: number, y: number, r: number, a: Rgb, b: Rgb, rot = 0): void {
  for (let i = 0; i < 8; i++) {
    const ang = rot + (i / 8) * TAU
    const c0 = Math.cos(ang)
    const s0 = Math.sin(ang)
    for (const side of [-1, 1]) {
      const a1 = ang + side * (TAU / 16)
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(a1) * r * 0.5, y + Math.sin(a1) * r * 0.5)
      g.lineTo(x + c0 * r, y + s0 * r)
      g.closePath()
      g.fillStyle = rgba(side < 0 ? a : b)
      g.fill()
    }
  }
}

// The halo round a flame, kept as a sprite and drawn at any size.
export function makeGlow(inner: string, mid: string, outer: string): Sprite {
  return makeSprite(128, 128, 1, (g) => {
    const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64)
    grad.addColorStop(0, inner)
    grad.addColorStop(0.3, mid)
    grad.addColorStop(0.65, outer)
    grad.addColorStop(1, outer.replace(/[\d.]+\)$/, '0)'))
    g.fillStyle = grad
    g.fillRect(0, 0, 128, 128)
  })
}

export function glow(g: G, s: Sprite, x: number, y: number, r: number, alpha = 1): void {
  if (alpha <= 0.003) return
  const before = g.globalAlpha
  g.globalAlpha = before * Math.min(1, alpha)
  g.drawImage(s.canvas, x - r, y - r, r * 2, r * 2)
  g.globalAlpha = before
}

// Candlelight baked into a painted backdrop: a dusky veil over everything,
// lifted in a pool round each flame, and a little warmth laid in the pools.
export interface Light {
  x: number
  y: number
  r: number
  // 0..1, how completely the veil lifts at the flame.
  lift?: number
}

export function candlelit(g: G, w: number, h: number, lights: readonly Light[], veil: string, warmth = 0.16): void {
  const k = 0.25
  const tmp = document.createElement('canvas')
  tmp.width = Math.ceil(w * k)
  tmp.height = Math.ceil(h * k)
  const t = tmp.getContext('2d')
  if (!t) return
  t.scale(k, k)
  t.fillStyle = veil
  t.fillRect(0, 0, w, h)
  t.globalCompositeOperation = 'destination-out'
  for (const l of lights) {
    const grad = t.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r)
    const lift = l.lift ?? 1
    grad.addColorStop(0, `rgba(0,0,0,${lift})`)
    grad.addColorStop(0.35, `rgba(0,0,0,${lift * 0.78})`)
    grad.addColorStop(0.7, `rgba(0,0,0,${lift * 0.3})`)
    grad.addColorStop(1, 'rgba(0,0,0,0)')
    t.fillStyle = grad
    t.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2)
  }
  g.save()
  g.imageSmoothingEnabled = true
  g.drawImage(tmp, 0, 0, w, h)
  for (const l of lights) {
    const grad = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 0.8)
    const a = warmth * (l.lift ?? 1)
    grad.addColorStop(0, `rgba(255,196,110,${a})`)
    grad.addColorStop(0.5, `rgba(255,170,90,${a * 0.4})`)
    grad.addColorStop(1, 'rgba(255,170,90,0)')
    g.fillStyle = grad
    g.fillRect(l.x - l.r, l.y - l.r, l.r * 2, l.r * 2)
  }
  g.restore()
}

// A red apple that holds a candle, about `r` in radius, sitting on (x, y).
export function apple(g: G, x: number, y: number, r: number, tone = 1): void {
  g.beginPath()
  g.moveTo(x, y - r * 1.55)
  g.bezierCurveTo(x - r * 0.5, y - r * 1.95, x - r * 1.25, y - r * 1.5, x - r * 1.05, y - r * 0.7)
  g.bezierCurveTo(x - r * 0.95, y - r * 0.1, x - r * 0.4, y + r * 0.08, x, y)
  g.bezierCurveTo(x + r * 0.4, y + r * 0.08, x + r * 0.95, y - r * 0.1, x + r * 1.05, y - r * 0.7)
  g.bezierCurveTo(x + r * 1.25, y - r * 1.5, x + r * 0.5, y - r * 1.95, x, y - r * 1.55)
  g.fillStyle = rgba(shade([176, 52, 44], tone))
  g.fill()
  g.save()
  g.clip()
  g.fillStyle = rgba(shade([212, 96, 60], tone), 0.75)
  g.beginPath()
  g.ellipse(x - r * 0.4, y - r * 1.05, r * 0.45, r * 0.62, 0.3, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(60,14,18,0.3)'
  g.beginPath()
  g.ellipse(x + r * 0.75, y - r * 0.55, r * 0.5, r * 0.8, -0.2, 0, TAU)
  g.fill()
  g.restore()
}

// A woven willow basket, drawn in two halves so things can sit inside it.
// Its rim is centred on (0, 0); the body hangs below, the handle arches above.
export const BASKET = { rx: 86, ry: 22, depth: 92, handle: 96 }

export function basketBack(g: G): void {
  const { rx, ry, handle } = BASKET
  // The inside, in shade.
  g.beginPath()
  g.ellipse(0, 0, rx, ry, 0, 0, TAU)
  g.fillStyle = '#6a4326'
  g.fill()
  // The far side of the handle.
  g.strokeStyle = '#8a5a30'
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(-rx + 10, -2)
  g.bezierCurveTo(-rx + 6, -handle * 1.25, rx - 6, -handle * 1.25, rx - 10, -2)
  g.stroke()
  g.strokeStyle = 'rgba(255,220,160,0.25)'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(-rx + 8, -6)
  g.bezierCurveTo(-rx + 5, -handle * 1.27, rx - 9, -handle * 1.27, rx - 13, -8)
  g.stroke()
}

export function basketFront(g: G, rng: Rng): void {
  const { rx, ry, depth } = BASKET
  g.save()
  g.beginPath()
  g.moveTo(-rx, 0)
  g.bezierCurveTo(-rx * 0.94, depth * 0.7, -rx * 0.74, depth, -rx * 0.56, depth)
  g.lineTo(rx * 0.56, depth)
  g.bezierCurveTo(rx * 0.74, depth, rx * 0.94, depth * 0.7, rx, 0)
  g.ellipse(0, 0, rx, ry, 0, 0, Math.PI, false)
  g.closePath()
  g.fillStyle = '#b07a42'
  g.fill()
  g.clip()
  // The weave: rows of short strokes, every other row shifted.
  for (let row = 0; row < 9; row++) {
    const y = ry * 0.5 + row * 12
    for (let i = -8; i <= 8; i++) {
      const cx = i * 22 + (row % 2) * 11
      const bow = Math.sqrt(Math.max(0, 1 - (cx / (rx * 1.05)) ** 2)) * ry
      g.strokeStyle = rng() < 0.5 ? 'rgba(226,176,110,0.75)' : 'rgba(148,96,48,0.8)'
      g.lineWidth = 7
      g.beginPath()
      g.moveTo(cx - 8, y + bow)
      g.quadraticCurveTo(cx, y + bow - 3, cx + 8, y + bow)
      g.stroke()
    }
  }
  // Shade to one side and toward the foot.
  const grad = g.createLinearGradient(-rx, 0, rx, 0)
  grad.addColorStop(0, 'rgba(255,214,150,0.12)')
  grad.addColorStop(0.5, 'rgba(0,0,0,0)')
  grad.addColorStop(1, 'rgba(50,22,12,0.34)')
  g.fillStyle = grad
  g.fillRect(-rx, -ry, rx * 2, depth + ry * 2)
  const down = g.createLinearGradient(0, 0, 0, depth)
  down.addColorStop(0.5, 'rgba(50,22,12,0)')
  down.addColorStop(1, 'rgba(50,22,12,0.3)')
  g.fillStyle = down
  g.fillRect(-rx, -ry, rx * 2, depth + ry * 2)
  g.restore()
  // The rim, a thicker rope of willow.
  g.strokeStyle = '#c48d4e'
  g.lineWidth = 8
  g.beginPath()
  g.ellipse(0, 0, rx, ry, 0, 0.02, Math.PI - 0.02, false)
  g.stroke()
  g.strokeStyle = 'rgba(255,226,170,0.4)'
  g.lineWidth = 2
  g.beginPath()
  g.ellipse(0, -2, rx - 2, ry, 0, 0.2, Math.PI - 0.2, false)
  g.stroke()
}

// A window onto the December afternoon: dusk sky, snowy hill, dark firs, a
// wooden frame, and snow lying on the ledge. `day` 0..1 lifts it from dusk
// toward pale afternoon light. Live snowflakes are drawn by the scene.
export function duskWindow(g: G, x: number, y: number, w: number, h: number, rng: Rng, day = 0, arch = false, bars = true): void {
  const outline = () => {
    g.beginPath()
    if (arch) {
      g.moveTo(x, y + h)
      g.lineTo(x, y + w * 0.5)
      g.arc(x + w / 2, y + w * 0.5, w / 2, Math.PI, 0)
      g.lineTo(x + w, y + h)
      g.closePath()
    } else {
      g.rect(x, y, w, h)
    }
  }
  g.save()
  outline()
  g.clip()
  const sky = g.createLinearGradient(0, y, 0, y + h)
  const top = mix([42, 54, 104], [150, 176, 214], day)
  const mid = mix([98, 108, 164], [196, 210, 232], day)
  const low = mix([196, 150, 162], [244, 226, 208], day)
  sky.addColorStop(0, rgba(top))
  sky.addColorStop(0.55, rgba(mid))
  sky.addColorStop(0.86, rgba(low))
  sky.addColorStop(1, rgba(mix([228, 184, 160], [250, 236, 214], day)))
  g.fillStyle = sky
  g.fillRect(x, y, w, h)
  // A far snowy hill and a nearer one.
  const snowFar = rgba(mix([150, 156, 198], [214, 222, 238], day))
  const snowNear = rgba(mix([190, 192, 222], [238, 240, 248], day))
  g.fillStyle = snowFar
  g.beginPath()
  g.moveTo(x, y + h * 0.72)
  g.quadraticCurveTo(x + w * 0.3, y + h * 0.6, x + w * 0.62, y + h * 0.7)
  g.quadraticCurveTo(x + w * 0.85, y + h * 0.76, x + w, y + h * 0.66)
  g.lineTo(x + w, y + h)
  g.lineTo(x, y + h)
  g.fill()
  // Firs standing in the snow.
  const firs = Math.max(2, Math.round(w / 60))
  for (let i = 0; i < firs; i++) {
    const fx = x + ((i + 0.3 + rng() * 0.5) / firs) * w
    const fh = h * (0.2 + rng() * 0.2)
    const base = y + h * (0.74 + rng() * 0.08)
    g.fillStyle = rgba(mix(mix([30, 44, 70], [70, 96, 104], day), [46, 60, 84], rng() * 0.5))
    for (let k = 0; k < 4; k++) {
      const ty = base - fh + (fh * k) / 4
      const half = (fh * 0.12 * (k + 1.4)) / 1.6
      g.beginPath()
      g.moveTo(fx, ty - fh * 0.1)
      g.lineTo(fx - half, ty + fh * 0.3)
      g.lineTo(fx + half, ty + fh * 0.3)
      g.closePath()
      g.fill()
    }
  }
  g.fillStyle = snowNear
  g.beginPath()
  g.moveTo(x, y + h * 0.86)
  g.quadraticCurveTo(x + w * 0.4, y + h * 0.78, x + w * 0.7, y + h * 0.86)
  g.quadraticCurveTo(x + w * 0.9, y + h * 0.9, x + w, y + h * 0.84)
  g.lineTo(x + w, y + h)
  g.lineTo(x, y + h)
  g.fill()
  // Snow already in the air, far off.
  g.fillStyle = 'rgba(255,255,255,0.5)'
  for (let i = 0; i < Math.round((w * h) / 2600); i++) {
    g.beginPath()
    g.arc(x + rng() * w, y + rng() * h, 0.8 + rng() * 1.2, 0, TAU)
    g.fill()
  }
  // Glass: a faint sheen from the room.
  g.fillStyle = 'rgba(255,220,170,0.05)'
  g.beginPath()
  g.moveTo(x, y)
  g.lineTo(x + w * 0.5, y)
  g.lineTo(x + w * 0.15, y + h)
  g.lineTo(x, y + h)
  g.fill()
  g.restore()
  // The frame.
  g.strokeStyle = rgba(DYE.woodDark)
  g.lineWidth = Math.max(8, w * 0.045)
  g.lineJoin = 'round'
  outline()
  g.stroke()
  if (bars) {
    g.lineWidth = Math.max(5, w * 0.028)
    g.beginPath()
    g.moveTo(x + w / 2, y + (arch ? 2 : 0))
    g.lineTo(x + w / 2, y + h)
    g.moveTo(x, y + h * 0.48)
    g.lineTo(x + w, y + h * 0.48)
    g.stroke()
  }
  g.strokeStyle = 'rgba(255,214,150,0.22)'
  g.lineWidth = 2
  outline()
  g.stroke()
  // Snow on the ledge outside and in the corners of the panes.
  g.fillStyle = 'rgba(244,246,255,0.92)'
  for (const [cx, cw] of bars ? ([[x + w * 0.25, w * 0.46], [x + w * 0.75, w * 0.46]] as const) : ([[x + w * 0.5, w * 0.94]] as const)) {
    g.beginPath()
    g.moveTo(cx - cw / 2, y + h - 3)
    g.quadraticCurveTo(cx - cw * 0.2, y + h - 3 - h * 0.05, cx, y + h - 3 - h * 0.025)
    g.quadraticCurveTo(cx + cw * 0.3, y + h - 3 - h * 0.06, cx + cw / 2, y + h - 3)
    g.closePath()
    g.fill()
  }
}

// Snow falling inside a rectangle (a window): a handful of slow flakes.
export interface Snow {
  x: number
  y: number
  w: number
  h: number
  flakes: { u: number; v: number; s: number; sp: number; ph: number }[]
}

export function makeSnow(x: number, y: number, w: number, h: number, count: number, rng: Rng): Snow {
  const flakes = []
  for (let i = 0; i < count; i++) flakes.push({ u: rng(), v: rng(), s: 1.2 + rng() * 2, sp: 0.03 + rng() * 0.04, ph: rng() * TAU })
  return { x, y, w, h, flakes }
}

export function drawSnow(g: G, snow: Snow, time: number, ox = 0, alpha = 0.85): void {
  g.fillStyle = `rgba(255,255,255,${alpha})`
  g.beginPath()
  for (const f of snow.flakes) {
    const v = (f.v + time * f.sp) % 1
    const px = snow.x + ox + 6 + f.u * (snow.w - 12) + Math.sin(time * 0.7 + f.ph) * 5
    const py = snow.y + 6 + v * (snow.h - 14)
    g.moveTo(px + f.s, py)
    g.arc(px, py, f.s, 0, TAU)
  }
  g.fill()
}
