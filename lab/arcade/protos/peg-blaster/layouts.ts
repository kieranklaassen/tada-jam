// Peg layouts for Peg Blaster: where the pegs sit, which ones orbit, and where
// the bumpers are. Colours are dealt by the game, so a layout is only shape.

import { TAU } from '../../kit/math.ts'
import { W } from '../../kit/types.ts'

export interface Orbit {
  cx: number
  cy: number
  r: number
  a: number
  speed: number
}

export interface Spot {
  x: number
  y: number
  bumper?: boolean
  orbit?: Orbit
}

const MX = W / 2
const MY = 438
const MIN_X = 84
const MAX_X = W - 84
const MIN_Y = 212
const MAX_Y = 660
// Keep the cannon's mouth clear.
const CANNON_X = W / 2
const CANNON_Y = 96
const CANNON_CLEAR = 132

function ring(out: Spot[], cx: number, cy: number, r: number, n: number, a0 = 0, speed = 0): void {
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * TAU
    const spot: Spot = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r }
    if (speed !== 0) spot.orbit = { cx, cy, r, a, speed }
    out.push(spot)
  }
}

// Walk a polyline and drop a peg every `spacing` pixels.
function along(out: Spot[], points: ReadonlyArray<readonly [number, number]>, spacing: number): void {
  let carry = 0
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1]!
    const b = points[i]!
    const len = Math.hypot(b[0] - a[0], b[1] - a[1])
    let at = carry
    while (at <= len) {
      const t = len === 0 ? 0 : at / len
      out.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t })
      at += spacing
    }
    carry = at - len
  }
}

function curve(fn: (t: number) => readonly [number, number], from: number, to: number, steps = 240): Array<readonly [number, number]> {
  const pts: Array<readonly [number, number]> = []
  for (let i = 0; i <= steps; i++) pts.push(fn(from + ((to - from) * i) / steps))
  return pts
}

function gapTo(spot: Spot, x: number, y: number): number {
  if (spot.orbit) return Math.abs(Math.hypot(x - spot.orbit.cx, y - spot.orbit.cy) - spot.orbit.r)
  return Math.hypot(x - spot.x, y - spot.y)
}

// Drop anything out of bounds, under the cannon, or crowding an earlier peg.
function clean(spots: Spot[], minGap = 52): Spot[] {
  const kept: Spot[] = []
  // Bumpers first so pegs make room for them.
  const ordered = [...spots.filter((s) => s.bumper), ...spots.filter((s) => !s.bumper)]
  for (const s of ordered) {
    if (!s.orbit) {
      if (s.x < MIN_X || s.x > MAX_X || s.y < MIN_Y || s.y > MAX_Y) continue
      if (Math.hypot(s.x - CANNON_X, s.y - CANNON_Y) < CANNON_CLEAR) continue
      let ok = true
      for (const k of kept) {
        const need = k.bumper || s.bumper ? 92 : minGap
        if (gapTo(k, s.x, s.y) < need) {
          ok = false
          break
        }
      }
      if (!ok) continue
    }
    kept.push(s)
  }
  return kept
}

// Fill the empty side columns so a wide shot always finds something.
function sides(spots: Spot[], gap = 78): Spot[] {
  const out = [...spots]
  const tryAdd = (x: number, y: number) => {
    for (const s of out) if (gapTo(s, x, y) < gap) return
    out.push({ x, y })
  }
  for (let y = 232; y <= 660; y += 86) {
    tryAdd(100, y)
    tryAdd(W - 100, y)
    tryAdd(178, y + 43)
    tryAdd(W - 178, y + 43)
    tryAdd(256, y)
    tryAdd(W - 256, y)
  }
  return out
}

function waves(): Spot[] {
  const out: Spot[] = []
  for (let r = 0; r < 5; r++) {
    const odd = r % 2 === 1
    const cols = odd ? 12 : 13
    for (let c = 0; c < cols; c++) {
      const x = 100 + c * 81.6 + (odd ? 40.8 : 0)
      const y = 250 + r * 96 + Math.sin(x * 0.0125 + r * 0.9) * 26
      out.push({ x, y })
    }
  }
  return clean(out)
}

function smiley(): Spot[] {
  const out: Spot[] = []
  const cy = 452
  ring(out, MX, cy, 196, 19, -Math.PI / 2)
  ring(out, MX - 84, cy - 78, 37, 4, TAU / 8)
  ring(out, MX + 84, cy - 78, 37, 4, TAU / 8)
  for (let i = 0; i < 6; i++) {
    const a = (28 + (124 * i) / 5) * (Math.PI / 180)
    out.push({ x: MX + Math.cos(a) * 128, y: cy + 4 + Math.sin(a) * 128 })
  }
  out.push({ x: MX, y: cy + 30, bumper: true })
  return clean(sides(out, 100))
}

// Sloping shelves the ball rolls down, lighting every peg on the way.
function ramps(): Spot[] {
  const out: Spot[] = []
  const shelf = (x: number, y: number, dir: number, n: number) => {
    for (let i = 0; i < n; i++) out.push({ x: x + dir * i * 55, y: y + i * 17 })
  }
  shelf(150, 250, 1, 7)
  shelf(W - 150, 250, -1, 7)
  shelf(MX - 60, 395, -1, 7)
  shelf(MX + 60, 395, 1, 7)
  shelf(130, 540, 1, 7)
  shelf(W - 130, 540, -1, 7)
  out.push({ x: MX, y: 300, bumper: true })
  out.push({ x: MX, y: 600, bumper: true })
  for (const x of [100, W - 100]) for (const y of [400, 470]) out.push({ x, y })
  return clean(out)
}

function rings(): Spot[] {
  const out: Spot[] = []
  ring(out, MX, MY, 92, 6, 0, 0.55)
  ring(out, MX, MY, 165, 11, 0.2, -0.32)
  ring(out, MX, MY, 236, 17, 0.1, 0.2)
  out.push({ x: MX, y: MY, bumper: true })
  return clean(sides(out))
}

function heart(): Spot[] {
  const out: Spot[] = []
  const shape = (scale: number) => (t: number): readonly [number, number] => [
    MX + 16 * Math.sin(t) ** 3 * scale,
    MY - 20 - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * scale,
  ]
  along(out, curve(shape(15.5), 0.02, TAU - 0.02), 64)
  along(out, curve(shape(8.2), 0.02, TAU - 0.02), 66)
  out.push({ x: MX, y: MY - 20, bumper: true })
  return clean(sides(out, 84))
}

function diamond(): Spot[] {
  const out: Spot[] = []
  const rows = [5, 7, 9, 11, 9, 7, 5]
  rows.forEach((n, r) => {
    for (let c = 0; c < n; c++) out.push({ x: MX + (c - (n - 1) / 2) * 86, y: 236 + r * 70 })
  })
  out.push({ x: MX, y: 236 + 3 * 70, bumper: true })
  out.push({ x: MX - 258, y: 236 + 3 * 70, bumper: true })
  out.push({ x: MX + 258, y: 236 + 3 * 70, bumper: true })
  return clean(sides(out, 90))
}

function flower(): Spot[] {
  const out: Spot[] = []
  for (let p = 0; p < 5; p++) {
    const a = -Math.PI / 2 + (p / 5) * TAU
    ring(out, MX + Math.cos(a) * 168, MY + Math.sin(a) * 168, 60, 6, a, p % 2 === 0 ? 0.7 : -0.7)
  }
  out.push({ x: MX, y: MY, bumper: true })
  return clean(sides(out, 84))
}

function starShape(): Spot[] {
  const out: Spot[] = []
  const cy = MY + 22
  const at = (i: number): readonly [number, number] => {
    const a = -Math.PI / 2 + (i / 10) * TAU
    const r = i % 2 === 0 ? 226 : 100
    return [MX + Math.cos(a) * r, cy + Math.sin(a) * r]
  }
  for (let i = 0; i < 10; i += 2) {
    const tip = at(i)
    out.push({ x: tip[0], y: tip[1] })
    for (const side of [-1, 1]) {
      const inner = at((i + side + 10) % 10)
      const len = Math.hypot(inner[0] - tip[0], inner[1] - tip[1])
      for (const d of [76, 124]) out.push({ x: tip[0] + ((inner[0] - tip[0]) * d) / len, y: tip[1] + ((inner[1] - tip[1]) * d) / len })
    }
    const inner = at(i + 1)
    out.push({ x: inner[0], y: inner[1] })
  }
  ring(out, MX, cy, 50, 4, 0, 0.6)
  return clean(sides(out, 96), 42)
}

function chevrons(): Spot[] {
  const out: Spot[] = []
  for (let r = 0; r < 4; r++) {
    const up = r % 2 === 0
    for (let c = 0; c < 13; c++) {
      const fold = Math.abs(c - 6) * 9 - 27
      out.push({ x: 100 + c * 81.6, y: 264 + r * 108 + (up ? fold : -fold) })
    }
  }
  out.push({ x: MX - 204, y: 426, bumper: true })
  out.push({ x: MX + 204, y: 426, bumper: true })
  return clean(out)
}

function rainbow(): Spot[] {
  const out: Spot[] = []
  const counts = [6, 10, 14, 18]
  counts.forEach((n, i) => {
    const r = 128 + i * 92
    for (let k = 0; k <= n; k++) {
      const a = Math.PI + (k / n) * Math.PI
      out.push({ x: MX + Math.cos(a) * r, y: 650 + Math.sin(a) * r })
    }
  })
  out.push({ x: MX, y: 630, bumper: true })
  return clean(sides(out, 84))
}

export const LAYOUTS: ReadonlyArray<() => Spot[]> = [waves, smiley, ramps, rings, heart, flower, rainbow, diamond, starShape, chevrons]
