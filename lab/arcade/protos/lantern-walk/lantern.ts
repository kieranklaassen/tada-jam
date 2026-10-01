// The paper and the lantern it becomes. The sheet is one painted canvas; a cut
// punches a real hole in it, and the rolled lantern is that same canvas wrapped
// round in strips, so what the child cut is exactly what shines later.

import { TAU, clamp, lerp } from '../../kit/math.ts'
import { along, blob, grain, hexRgb, makeCanvas, rgba, shapePath, smoothClosed } from './art.ts'
import type { G, Kind, Rgb, Rng } from './art.ts'

// The flat sheet, in logical pixels.
export const SW = 480
export const SH = 300
// The rolled lantern at scale 1: half-width, rim depth, and the height of the
// wire handle above the rim. The pivot (where it hangs from) is the top of
// the handle.
export const R = 150
export const RY = 26
export const BAIL = 70
export const HOLE_R = 31
// Pivot to the middle of the body, and to its foot.
export const MID = BAIL + SH / 2 + RY / 2
export const FOOT = BAIL + SH + RY

const THM = 1.2
const SIN_THM = Math.sin(THM)
const Q = 2
const PAD = 4
const STRIPS = 48

export interface Hole {
  // Sheet coordinates of the centre.
  x: number
  y: number
  kind: Kind
  rot: number
}

// Sheet position (-1..1 across) to where it sits on the lantern's front (-1..1).
function mapS(u: number): number {
  return Math.sin(u * THM) / SIN_THM
}

function unmapS(s: number): number {
  return Math.asin(clamp(s, -1, 1) * SIN_THM) / THM
}

const WASHES: readonly (readonly Rgb[])[] = [
  ['#6f4a9c', '#c24c80', '#ea6f3e', '#f6a73c', '#f9d466'],
  ['#d2452f', '#ec7735', '#f6ad40', '#f8d267', '#f4a890'],
  ['#3f4f9e', '#8556a6', '#d7587c', '#f1904a', '#f8c851'],
  ['#b93f80', '#e45a43', '#f49b3b', '#f9cd58', '#f5e190'],
].map((stops) => stops.map(hexRgb))

// The wash colour at a point of the sheet (0..1 each way).
export function washAt(variant: number, fx: number, fy: number): Rgb {
  const stops = WASHES[variant % WASHES.length]!
  return along(stops, fy * 0.92 + 0.04 + 0.07 * Math.sin(fx * 5.2 + variant * 1.7))
}

function paintSheet(g: G, variant: number, rng: Rng): void {
  g.setTransform(1, 0, 0, 1, 0, 0)
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  g.clearRect(0, 0, SW * Q, SH * Q)
  g.save()
  g.scale(Q, Q)
  // A torn, deckled edge rather than a ruled rectangle.
  const pts: [number, number][] = []
  const j = () => rng() * 2.4
  for (let x = 6; x <= SW - 6; x += 39) pts.push([x, 1 + j()])
  for (let y = 6; y <= SH - 6; y += 36) pts.push([SW - 1 - j(), y])
  for (let x = SW - 6; x >= 6; x -= 39) pts.push([x, SH - 1 - j()])
  for (let y = SH - 6; y >= 6; y -= 36) pts.push([1 + j(), y])
  smoothClosed(g, pts)
  g.clip()
  const stops = WASHES[variant % WASHES.length]!
  const base = g.createLinearGradient(0, 0, SW * 0.12, SH)
  stops.forEach((c, i) => base.addColorStop(i / (stops.length - 1), rgba(c)))
  g.fillStyle = base
  g.fillRect(0, 0, SW, SH)
  // Wet-on-wet: soft dabs that drift a little off their band.
  for (let i = 0; i < 110; i++) {
    const x = rng() * SW
    const y = rng() * SH
    const c = washAt(variant, x / SW + (rng() - 0.5) * 0.2, y / SH + (rng() - 0.5) * 0.3)
    blob(g, x, y, 34 + rng() * 78, c, 0.12 + rng() * 0.16)
  }
  // Blooms where water ran back in: a pale middle and a darker rim.
  for (let i = 0; i < 9; i++) {
    const x = rng() * SW
    const y = rng() * SH
    const r = 26 + rng() * 46
    const grad = g.createRadialGradient(x, y, 0, x, y, r)
    grad.addColorStop(0, 'rgba(255,248,225,0.13)')
    grad.addColorStop(0.6, 'rgba(255,248,225,0.05)')
    grad.addColorStop(0.84, 'rgba(120,40,40,0.035)')
    grad.addColorStop(1, 'rgba(120,40,40,0)')
    g.fillStyle = grad
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  grain(g, 0, 0, SW, SH, 2600, rng, 0.06, 0.08)
  // Pigment pools along the edge as the sheet dries.
  smoothClosed(g, pts)
  g.strokeStyle = 'rgba(110,40,50,0.16)'
  g.lineWidth = 9
  g.stroke()
  g.strokeStyle = 'rgba(255,250,235,0.5)'
  g.lineWidth = 1.6
  g.stroke()
  g.restore()
}

// Draw the sheet bent round by `k` (0 flat, 1 a full lantern front), its left
// edge held at x0. Vertical strips, each sheared to follow the rim's curve.
function strips(g: G, src: CanvasImageSource, k: number, x0: number, y0: number, atop: boolean): void {
  const half = lerp(SW / 2, R, k)
  const cx = x0 + half
  const ry = RY * k
  let xa = cx - half
  let sa = -1
  let ya = y0
  for (let i = 1; i <= STRIPS; i++) {
    const u = -1 + (2 * i) / STRIPS
    const off = lerp((u * SW) / 2, R * mapS(u), k)
    const xb = cx + off
    const sb = off / half
    const yb = y0 + ry * Math.sqrt(Math.max(0, 1 - sb * sb))
    const w = xb - xa
    g.save()
    g.translate(xa, ya)
    g.transform(1, (yb - ya) / w, 0, 1, 0, 0)
    g.drawImage(src, ((i - 1) / STRIPS) * SW * Q, 0, (SW * Q) / STRIPS, SH * Q, 0, 0, w + 0.7, SH)
    const sm = (sa + sb) / 2
    const shade = k * 0.4 * Math.abs(sm) ** 2.4
    const shine = k * 0.1 * Math.exp(-(((sm + 0.3) / 0.22) ** 2))
    if (atop) g.globalCompositeOperation = 'source-atop'
    if (shade > 0.004) {
      g.fillStyle = `rgba(70,26,30,${shade})`
      g.fillRect(0, 0, w + 0.7, SH)
    }
    if (shine > 0.004) {
      g.fillStyle = `rgba(255,246,214,${shine})`
      g.fillRect(0, 0, w + 0.7, SH)
    }
    g.restore()
    xa = xb
    sa = sb
    ya = yb
  }
}

function bodyPath(g: G, inset: number): void {
  const r = R - inset
  g.beginPath()
  g.moveTo(-r, BAIL)
  g.ellipse(0, BAIL, r, RY, 0, Math.PI, 0, true)
  g.lineTo(r, BAIL + SH - inset)
  g.ellipse(0, BAIL + SH - inset, r, RY, 0, 0, Math.PI, false)
  g.closePath()
}

// A beeswax candle stub standing on (x, y). `flame` 0 is unlit.
export function drawCandle(g: G, x: number, y: number, scale: number, flame: number, flick: number): void {
  g.save()
  g.translate(x, y)
  g.scale(scale, scale)
  const w = 23
  const h = 58
  const body = g.createLinearGradient(-w, 0, w, 0)
  body.addColorStop(0, '#c98a2a')
  body.addColorStop(0.35, '#f0bd4e')
  body.addColorStop(0.7, '#e3a83c')
  body.addColorStop(1, '#b97a24')
  g.fillStyle = body
  g.beginPath()
  g.moveTo(-w, -h)
  g.lineTo(-w - 1.5, -4)
  g.ellipse(0, -4, w + 1.5, 7, 0, Math.PI, 0, true)
  g.lineTo(w, -h)
  g.closePath()
  g.fill()
  // A drip of wax and the melted top.
  g.fillStyle = '#f3c65c'
  g.beginPath()
  g.ellipse(0, -h, w, 6.5, 0, 0, TAU)
  g.fill()
  g.beginPath()
  g.ellipse(-w + 5, -h + 14, 4.5, 12, 0.1, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(160,100,20,0.25)'
  g.beginPath()
  g.ellipse(0, -h + 0.5, w * 0.55, 3.2, 0, 0, TAU)
  g.fill()
  g.strokeStyle = '#3d2c22'
  g.lineWidth = 2.4
  g.beginPath()
  g.moveTo(0, -h)
  g.quadraticCurveTo(1.5, -h - 6, 0.5, -h - 11)
  g.stroke()
  if (flame > 0.01) drawFlame(g, 0.5, -h - 9, 1.25 * flame, flick)
  g.restore()
}

// A candle flame standing on (x, y): a soft teardrop that leans as it flickers.
export function drawFlame(g: G, x: number, y: number, size: number, flick: number): void {
  const lean = (flick - 0.9) * 1.6
  const h = 30 * size * (0.9 + flick * 0.12)
  const w = 9.5 * size
  g.save()
  g.translate(x, y)
  g.beginPath()
  g.moveTo(0, 2)
  g.bezierCurveTo(-w * 1.25, -h * 0.18, -w * 0.5 + lean * 8, -h * 0.72, lean * 14, -h)
  g.bezierCurveTo(w * 0.5 + lean * 8, -h * 0.72, w * 1.25, -h * 0.18, 0, 2)
  g.fillStyle = '#ffb53a'
  g.fill()
  g.beginPath()
  g.ellipse(lean * 3, -h * 0.34, w * 0.56, h * 0.33, 0, 0, TAU)
  g.fillStyle = '#fff4c2'
  g.fill()
  g.beginPath()
  g.ellipse(0, -2, w * 0.3, 4 * size, 0, 0, TAU)
  g.fillStyle = 'rgba(120,150,255,0.5)'
  g.fill()
  g.restore()
}

export interface Lantern {
  holes: Hole[]
  variant: number
  rolled: boolean
  // A fresh sheet for a new day.
  reset(variant: number, rng: Rng): void
  // Cut a window. The hole is in sheet coordinates.
  cut(hole: Hole): void
  // The sheet lying flat with its top-left at (x, y).
  drawFlat(g: G, x: number, y: number): void
  // The sheet part-way rolled, left edge held at x.
  drawMorph(g: G, x: number, y: number, k: number): void
  // Wrap the sheet into the lantern body. Call once the roll is finished.
  roll(): void
  // The finished lantern hanging from (px, py). `light` 0..1 is the candle's
  // glow. `candle` is -1 with no candle inside, else 0..1 as it is lowered in.
  draw(g: G, px: number, py: number, scale: number, theta: number, light: number, flick: number, candle: number, bail: number): void
  // A point on the lantern's front (relative to the pivot, scale 1, upright) to
  // the sheet, or null when it is off the paper.
  toSheet(lx: number, ly: number): { x: number; y: number } | null
  // Where a hole sits on the front, relative to the pivot at scale 1, and how
  // much the curve squeezes it sideways.
  front(hole: Hole): { x: number; y: number; squeeze: number }
}

export function createLantern(): Lantern {
  const [sheet, sg] = makeCanvas(SW * Q, SH * Q)
  const bw = 2 * R + 2 * PAD
  const bh = SH + RY + 2 * PAD
  const [body, bg] = makeCanvas(bw * Q, bh * Q)
  const [glow, gg] = makeCanvas(bw * Q, bh * Q)

  const bake = (): void => {
    bg.setTransform(Q, 0, 0, Q, 0, 0)
    bg.globalCompositeOperation = 'source-over'
    bg.clearRect(0, 0, bw, bh)
    strips(bg, sheet, 1, PAD, PAD, true)
    // The glued seam, and the paper's thickness along the front rim.
    bg.globalCompositeOperation = 'source-atop'
    const sx = PAD + R + R * 0.86
    const sy = PAD + RY * Math.sqrt(1 - 0.86 * 0.86)
    bg.strokeStyle = 'rgba(80,30,30,0.28)'
    bg.lineWidth = 1.6
    bg.beginPath()
    bg.moveTo(sx, sy)
    bg.lineTo(sx, sy + SH)
    bg.stroke()
    bg.strokeStyle = 'rgba(255,246,220,0.55)'
    bg.lineWidth = 2
    bg.beginPath()
    bg.ellipse(PAD + R, PAD, R - 1, RY, 0, 0, Math.PI)
    bg.stroke()
    bg.globalCompositeOperation = 'source-over'

    // The same shape filled with candle light: added over the paper when lit.
    gg.setTransform(1, 0, 0, 1, 0, 0)
    gg.globalCompositeOperation = 'source-over'
    gg.clearRect(0, 0, bw * Q, bh * Q)
    gg.drawImage(body, 0, 0)
    gg.globalCompositeOperation = 'source-in'
    const cx = (PAD + R) * Q
    const cy = (PAD + SH * 0.72) * Q
    const grad = gg.createRadialGradient(cx, cy, 10, cx, cy, 300 * Q)
    grad.addColorStop(0, 'rgba(255,214,120,1)')
    grad.addColorStop(0.5, 'rgba(255,160,60,0.85)')
    grad.addColorStop(1, 'rgba(220,90,40,0.5)')
    gg.fillStyle = grad
    gg.fillRect(0, 0, bw * Q, bh * Q)
    gg.globalCompositeOperation = 'source-over'
  }

  const punch = (hole: Hole): void => {
    sg.save()
    sg.setTransform(Q, 0, 0, Q, 0, 0)
    sg.translate(hole.x, hole.y)
    sg.rotate(hole.rot)
    shapePath(sg, hole.kind, HOLE_R)
    // The cut edge shows as a slightly darker line just outside the hole.
    sg.globalCompositeOperation = 'source-atop'
    sg.strokeStyle = 'rgba(95,35,35,0.4)'
    sg.lineWidth = 3
    sg.stroke()
    sg.globalCompositeOperation = 'destination-out'
    sg.fillStyle = '#000'
    sg.fill()
    sg.restore()
  }

  const self: Lantern = {
    holes: [],
    variant: 0,
    rolled: false,
    reset(variant, rng) {
      self.holes = []
      self.variant = variant
      self.rolled = false
      paintSheet(sg, variant, rng)
    },
    cut(hole) {
      self.holes.push(hole)
      punch(hole)
      if (self.rolled) bake()
    },
    drawFlat(g, x, y) {
      g.drawImage(sheet, x, y, SW, SH)
    },
    drawMorph(g, x, y, k) {
      strips(g, sheet, k, x, y, false)
    },
    roll() {
      self.rolled = true
      bake()
    },
    draw(g, px, py, scale, theta, light, flick, candle, bail) {
      g.save()
      g.translate(px, py)
      if (theta) g.rotate(theta)
      g.scale(scale, scale)
      if (bail > 0.02) {
        const top = BAIL - BAIL * bail
        g.strokeStyle = '#4b3a30'
        g.lineWidth = 3.5
        g.beginPath()
        g.moveTo(-R + 7, BAIL + 4)
        g.bezierCurveTo(-R + 12, BAIL - BAIL * bail * 0.8, -40, top, 0, top)
        g.bezierCurveTo(40, top, R - 12, BAIL - BAIL * bail * 0.8, R - 7, BAIL + 4)
        g.stroke()
      }
      // The far side of the rim, seen through the open top.
      g.beginPath()
      g.ellipse(0, BAIL, R, RY, 0, 0, TAU)
      const well = g.createLinearGradient(0, BAIL - RY, 0, BAIL + RY)
      well.addColorStop(0, '#d2b890')
      well.addColorStop(0.45, '#9c7a5a')
      well.addColorStop(1, '#5e4032')
      g.fillStyle = well
      g.fill()
      // The inside, which is what shows through every window.
      bodyPath(g, 1.5)
      const dark = g.createLinearGradient(0, BAIL, 0, BAIL + SH)
      dark.addColorStop(0, '#a5825f')
      dark.addColorStop(1, '#6a4937')
      g.fillStyle = dark
      g.fill()
      if (light > 0.01) {
        const fy = BAIL + SH - 60
        const lit = g.createRadialGradient(0, fy, 8, 0, fy, 330)
        lit.addColorStop(0, '#fffbe2')
        lit.addColorStop(0.22, '#ffe98a')
        lit.addColorStop(0.6, '#ffc552')
        lit.addColorStop(1, '#f6a03c')
        g.globalAlpha = light * (0.9 + 0.1 * flick)
        g.fillStyle = lit
        g.fill()
        g.beginPath()
        g.ellipse(0, BAIL, R, RY, 0, 0, TAU)
        const lamp = g.createLinearGradient(0, BAIL - RY, 0, BAIL + RY)
        lamp.addColorStop(0, '#f6b458')
        lamp.addColorStop(0.5, '#ffdc86')
        lamp.addColorStop(1, '#fff7d0')
        g.fillStyle = lamp
        g.fill()
        g.globalAlpha = 1
      }
      if (candle >= 0) drawCandle(g, 0, BAIL + SH + RY - 12 - (1 - candle) * (SH - 20), 1.25, light, flick)
      g.drawImage(body, -R - PAD, BAIL - PAD, bw, bh)
      if (light > 0.01) {
        g.globalCompositeOperation = 'lighter'
        g.globalAlpha = 0.27 * light * (0.86 + 0.14 * flick)
        g.drawImage(glow, -R - PAD, BAIL - PAD, bw, bh)
        g.globalCompositeOperation = 'source-over'
        g.globalAlpha = 1
      }
      g.restore()
    },
    toSheet(lx, ly) {
      const s = lx / R
      if (Math.abs(s) > 1.02) return null
      const sc = clamp(s, -0.9, 0.9)
      const y = ly - BAIL - RY * Math.sqrt(1 - sc * sc)
      if (y < -6 || y > SH + 6) return null
      return { x: ((unmapS(sc) + 1) / 2) * SW, y }
    },
    front(hole) {
      const u = (hole.x / SW) * 2 - 1
      const s = mapS(u)
      return {
        x: R * s,
        y: BAIL + RY * Math.sqrt(Math.max(0, 1 - s * s)) + hole.y,
        squeeze: ((R * THM * Math.cos(u * THM)) / SIN_THM) * (2 / SW),
      }
    },
  }
  return self
}
