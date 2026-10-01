// The dusky wood and the way home. The wood is painted once into tiles, twice
// over: as the candle would show it (warm, full of leaves) and as the dusk
// leaves it (the same shapes, gone to indigo). The lantern's circle is the
// first, shaded off toward the second at its rim.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { blob, grain, hexRgb, leafDab, makeCanvas, mulberry, settle, soft, wobbly } from './art.ts'
import type { G } from './art.ts'

export const WORLD_W = 4860
export const TILE_W = 540
// Tiles overlap by this much so no seam shows when the field is scaled.
const LAP = 2
export const CAM_MAX = WORLD_W - W
export const HILL_Y = 330
export const HILL_PARALLAX = 0.15

// Places along the walk, in world coordinates.
export const OWL = { x: 1498, y: 256 }
export const SHROOMS = [
  { x: 846, dy: -24, h: 1 },
  { x: 890, dy: -16, h: 0.72 },
  { x: 812, dy: -14, h: 0.56 },
] as const
export const HOG = { x: 2090, from: 2030, to: 2190, dy: -22 }
export const FOX = { from: 2716, to: 3580, dy: -20 }
export const HOUSE_X = 4150
export const HOOK = { x: 4530, y: 300 }
export const HOME_DOOR = { x: 4212, y: 318, w: 150 }
export const HOME_WINDOW = { x: 4718, y: 356, w: 100, h: 110 }
export const CAT = { x: 4462, dy: -22 }
export const STICK_REST = { ax: 4668, ay: 322, bx: 4634, dy: -26 }

// The line the path follows: where a lantern set down would stand.
export function groundY(x: number): number {
  return 672 + 9 * Math.sin(x * 0.0041 + 0.5) + 5 * Math.sin(x * 0.0113 + 2)
}

function groundTop(x: number): number {
  return groundY(x) - 64 + 4 * Math.sin(x * 0.031) + 3 * Math.sin(x * 0.07 + 1)
}

// The ridge the far lanterns walk along, in the hill strip's own coordinates.
export function hillY(x: number): number {
  return 176 + 20 * Math.sin(x * 0.0052 + 1.2) + 8 * Math.sin(x * 0.013 + 0.4)
}

const LEAF = ['#d9772b', '#c2452d', '#e3a43a', '#a8582a', '#e8c25a', '#8f3b2a', '#b98a3a']
const CANOPY = ['#b5522a', '#d0832f', '#8f3b2a', '#c39a38', '#a34a28', '#7d4a2c'].map(hexRgb)

interface Trunk {
  x: number
  w: number
  lean: number
  base: number
  seed: number
  branch: { y: number; dir: number; len: number } | null
}

interface Dab {
  x: number
  y: number
  r: number
  rot: number
  c: number
  a: number
}

interface Layout {
  trunks: Trunk[]
  saplings: Trunk[]
  leaves: Dab[]
  earth: Dab[]
  pebbles: Dab[]
  canopy: Dab[]
  tufts: Dab[]
  ferns: Dab[]
  far: Dab[]
  toadstools: Dab[]
}

function layout(): Layout {
  const rng = mulberry(20261111)
  const trunks: Trunk[] = []
  const main = [150, 452, 742, 1065, 1350, 1705, 1975, 2340, 2625, 2905, 3430, 3705, 3975]
  for (const x of main) {
    const owl = x === 1350
    const w = owl ? 84 : 52 + rng() * 44
    const dir = rng() < 0.5 ? -1 : 1
    trunks.push({
      x,
      w,
      lean: (rng() - 0.5) * 0.1,
      base: groundTop(x) + 12 + rng() * 22,
      seed: Math.floor(rng() * 1e9),
      branch: owl ? { y: 270, dir: 1, len: 220 } : rng() < 0.7 ? { y: 130 + rng() * 240, dir, len: 90 + rng() * 90 } : null,
    })
  }
  const saplings: Trunk[] = []
  for (let i = 0; i < 26; i++) {
    const x = 40 + rng() * 4000
    if (x > 2980 && x < 3360 && rng() < 0.7) continue
    saplings.push({ x, w: 12 + rng() * 16, lean: (rng() - 0.5) * 0.16, base: groundTop(x) + 4 + rng() * 8, seed: Math.floor(rng() * 1e9), branch: null })
  }
  const leaves: Dab[] = []
  for (let i = 0; i < 4300; i++) {
    const x = -20 + rng() * (WORLD_W + 40)
    const top = groundTop(x) + 5
    const y = top + rng() ** 0.8 * (H - top)
    const onPath = Math.abs(y - (groundY(x) + 8)) < 30
    if (onPath && rng() < 0.72) continue
    if (x > HOUSE_X - 30 && y < groundY(x) - 26) continue
    leaves.push({ x, y, r: 5 + rng() * 8, rot: rng() * TAU, c: Math.floor(rng() * LEAF.length), a: 0.7 + rng() * 0.3 })
  }
  // A drift of leaves for the hedgehog to sleep in.
  for (let i = 0; i < 90; i++) {
    const a = rng() * TAU
    const d = rng() ** 0.6
    const x = HOG.x + Math.cos(a) * d * 92
    leaves.push({ x, y: groundY(x) + HOG.dy + 4 - Math.abs(Math.sin(a)) * d * 20 + rng() * 12, r: 7 + rng() * 8, rot: rng() * TAU, c: Math.floor(rng() * LEAF.length), a: 1 })
  }
  leaves.sort((p, q) => p.y - q.y)
  const earth: Dab[] = []
  for (let i = 0; i < 380; i++) {
    const x = rng() * WORLD_W
    earth.push({ x, y: groundTop(x) + rng() * 230, r: 40 + rng() * 90, rot: 0, c: Math.floor(rng() * 3), a: 0.1 + rng() * 0.16 })
  }
  const pebbles: Dab[] = []
  for (let i = 0; i < 330; i++) {
    const x = rng() * WORLD_W
    pebbles.push({ x, y: groundY(x) + 8 + (rng() - 0.5) * 50, r: 2 + rng() * 4.5, rot: rng() * 3, c: 0, a: 0.4 + rng() * 0.4 })
  }
  const canopy: Dab[] = []
  for (let x = -40; x < HOUSE_X + 60; x += 46 + rng() * 60) {
    const thin = (x > 2960 && x < 3380) || x > 4000
    const n = thin ? 1 : 2 + Math.floor(rng() * 3)
    for (let i = 0; i < n; i++) {
      canopy.push({ x: x + (rng() - 0.5) * 80, y: -30 + rng() * (thin ? 70 : 150), r: 46 + rng() * 70, rot: rng() * 100, c: Math.floor(rng() * CANOPY.length), a: 0.5 + rng() * 0.3 })
    }
  }
  const tufts: Dab[] = []
  for (let i = 0; i < 300; i++) {
    const x = rng() * WORLD_W
    const back = rng() < 0.6
    tufts.push({ x, y: back ? groundTop(x) + 3 + rng() * 6 : 760 + rng() * 60, r: back ? 8 + rng() * 9 : 16 + rng() * 22, rot: rng(), c: back ? 0 : 1, a: 1 })
  }
  const ferns: Dab[] = []
  for (const t of trunks) {
    if (rng() < 0.75) ferns.push({ x: t.x + (rng() < 0.5 ? -1 : 1) * (t.w * 0.6 + 14 + rng() * 26), y: t.base + 12, r: 36 + rng() * 26, rot: rng(), c: Math.floor(rng() * 2), a: 1 })
  }
  const far: Dab[] = []
  for (let x = -30; x < WORLD_W + 30; x += 30 + rng() * 74) {
    far.push({ x, y: 0, r: 7 + rng() * 15, rot: (rng() - 0.5) * 0.12, c: Math.floor(rng() * 2), a: 0.5 + rng() * 0.4 })
  }
  const toadstools: Dab[] = []
  for (let i = 0; i < 26; i++) {
    const x = 300 + rng() * 3600
    toadstools.push({ x, y: groundTop(x) + 26 + rng() * 26, r: 5 + rng() * 5, rot: (rng() - 0.5) * 0.4, c: Math.floor(rng() * 2), a: 1 })
  }
  return { trunks, saplings, leaves, earth, pebbles, canopy, tufts, ferns, far, toadstools }
}

function branchPath(t: Trunk): { sx: number; sy: number; cx: number; cy: number; ex: number; ey: number } | null {
  const b = t.branch
  if (!b) return null
  const sx = t.x + b.dir * (t.w / 2 - 4) + t.lean * (t.base - b.y)
  const ex = sx + b.dir * b.len
  return { sx, sy: b.y, cx: (sx + ex) / 2, cy: b.y - b.len * 0.02, ex, ey: b.y - b.len * 0.12 }
}

function paintTrunk(g: G, t: Trunk, thin: boolean): void {
  const rng = mulberry(t.seed)
  const half = (y: number) => (t.w / 2) * (0.82 + 0.18 * (y / t.base) + 0.95 * Math.exp(-(t.base - y) / (thin ? 14 : 34)))
  const mid = (y: number) => t.x + t.lean * (t.base - y)
  const br = branchPath(t)
  if (br && t.branch) {
    // A bough, thick at the trunk and tapering, with a twig or two.
    const b = t.branch
    const thick = Math.min(26, t.w * 0.3)
    g.beginPath()
    g.moveTo(br.sx - b.dir * 6, br.sy - thick / 2)
    g.quadraticCurveTo(br.cx, br.cy - thick * 0.42, br.ex, br.ey - 2)
    g.lineTo(br.ex, br.ey + 2)
    g.quadraticCurveTo(br.cx, br.cy + thick * 0.5, br.sx - b.dir * 6, br.sy + thick / 2 + 6)
    g.closePath()
    const bg = g.createLinearGradient(0, br.sy - thick / 2, 0, br.sy + thick / 2 + 4)
    bg.addColorStop(0, '#946642')
    bg.addColorStop(1, '#553726')
    g.fillStyle = bg
    g.fill()
    g.strokeStyle = '#6a452e'
    g.lineWidth = 4
    for (const k of [0.45, 0.78]) {
      const tx = br.sx + (br.ex - br.sx) * k
      const ty = br.sy + (br.ey - br.sy) * k - 2
      g.beginPath()
      g.moveTo(tx, ty)
      g.quadraticCurveTo(tx + b.dir * 16, ty - 26 - rng() * 14, tx + b.dir * (30 + rng() * 22), ty - 46 - rng() * 22)
      g.stroke()
    }
  }
  g.beginPath()
  g.moveTo(mid(t.base) - half(t.base), t.base + 4)
  for (let y = t.base; y >= -30; y -= 24) g.lineTo(mid(y) - half(y) + (rng() - 0.5) * 2.4, y)
  for (let y = -30; y <= t.base; y += 24) g.lineTo(mid(y) + half(y) + (rng() - 0.5) * 2.4, y)
  g.lineTo(mid(t.base) + half(t.base), t.base + 4)
  g.closePath()
  const grad = g.createLinearGradient(t.x - t.w / 2, 0, t.x + t.w / 2, 0)
  if (thin) {
    grad.addColorStop(0, '#5a4132')
    grad.addColorStop(0.5, '#8a6a4c')
    grad.addColorStop(1, '#5e4534')
  } else {
    grad.addColorStop(0, '#5a3a2a')
    grad.addColorStop(0.32, '#a57148')
    grad.addColorStop(0.56, '#bd8758')
    grad.addColorStop(1, '#633f2c')
  }
  g.fillStyle = grad
  g.fill()
  if (thin) return
  g.save()
  g.clip()
  // Bark: long broken furrows, darker than the trunk, and a few catching light.
  const n = Math.round(t.w / 3.4)
  for (let i = 0; i < n; i++) {
    const fx = (rng() - 0.5) * t.w * 0.94
    let y = rng() * t.base
    const len = 50 + rng() * 170
    const lightStroke = rng() < 0.3
    g.beginPath()
    g.moveTo(mid(y) + fx, y)
    for (let d = 0; d < len; d += 16) {
      y += 16
      g.lineTo(mid(y) + fx + (rng() - 0.5) * 3.6, y)
    }
    g.strokeStyle = lightStroke ? `rgba(214,170,120,${0.12 + rng() * 0.12})` : `rgba(44,24,16,${0.2 + rng() * 0.25})`
    g.lineWidth = 1 + rng() * 2.4
    g.stroke()
  }
  for (let i = 0; i < 5; i++) blob(g, t.x - t.w * 0.3 + rng() * t.w * 0.3, t.base - rng() * 90, 16 + rng() * 22, [104, 122, 60], 0.22)
  for (let i = 0; i < 3; i++) blob(g, t.x + (rng() - 0.5) * t.w, rng() * t.base * 0.8, 10 + rng() * 14, [176, 180, 150], 0.14)
  g.restore()
}

function paintFern(g: G, f: Dab): void {
  const rng = mulberry(Math.floor(f.x * 13 + f.r * 7))
  const col = f.c === 0 ? '#7d8a3c' : '#a9772f'
  const dark = f.c === 0 ? '#59682e' : '#7e5424'
  for (let k = 0; k < 6; k++) {
    const a = -Math.PI / 2 + (k - 2.5) * 0.36 + (rng() - 0.5) * 0.14
    const len = f.r * (0.72 + rng() * 0.4)
    const ex = f.x + Math.cos(a) * len
    const ey = f.y + Math.sin(a) * len * 0.8
    const cx = f.x + Math.cos(a) * len * 0.5
    const cy = f.y + Math.sin(a) * len * 0.92
    g.strokeStyle = dark
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(f.x, f.y)
    g.quadraticCurveTo(cx, cy, ex, ey)
    g.stroke()
    for (let s = 0.18; s < 1; s += 0.13) {
      const px = (1 - s) * (1 - s) * f.x + 2 * (1 - s) * s * cx + s * s * ex
      const py = (1 - s) * (1 - s) * f.y + 2 * (1 - s) * s * cy + s * s * ey
      const r = (1 - s) * f.r * 0.2 + 2
      leafDab(g, px + Math.cos(a + 1.3) * r * 0.7, py + Math.sin(a + 1.3) * r * 0.7, r, a + 1.1, col)
      leafDab(g, px + Math.cos(a - 1.3) * r * 0.7, py + Math.sin(a - 1.3) * r * 0.7, r, a - 1.1, col)
    }
  }
}

function paintFence(g: G, from: number, to: number): void {
  // A wattle fence: hazel rods woven between posts.
  const base = (x: number) => groundTop(x) + 30
  for (let r = 0; r < 5; r++) {
    g.beginPath()
    for (let x = from; x <= to; x += 6) {
      const y = base(x) - 12 - r * 11 + Math.sin(x * 0.16 + r * Math.PI) * 3.4
      if (x === from) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.strokeStyle = r % 2 === 0 ? '#8a6238' : '#74502e'
    g.lineWidth = 7
    g.stroke()
    g.strokeStyle = 'rgba(214,170,116,0.3)'
    g.lineWidth = 1.6
    g.stroke()
  }
  for (let x = from; x <= to + 1; x += 39) {
    g.strokeStyle = '#5e4028'
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(x, base(x) + 4)
    g.lineTo(x + 1, base(x) - 70)
    g.stroke()
  }
}

function paintHouse(g: G): void {
  const rng = mulberry(77123)
  const x0 = HOUSE_X
  const x1 = WORLD_W + 30
  const top = 142
  const base = groundY(4500) - 30
  // Plaster, washed warm, a mid tone so the lantern's windows can shine on it.
  g.fillStyle = '#cfae7e'
  g.fillRect(x0, top, x1 - x0, base - top)
  g.save()
  g.beginPath()
  g.rect(x0, top, x1 - x0, base - top)
  g.clip()
  const plaster = ['#dcc096', '#c39f6e', '#d8b888', '#c9a878'].map(hexRgb)
  for (let i = 0; i < 120; i++) blob(g, x0 + rng() * (x1 - x0), top + rng() * (base - top), 50 + rng() * 110, plaster[Math.floor(rng() * 4)]!, 0.12 + rng() * 0.12)
  grain(g, x0, top, x1 - x0, base - top, 5000, rng, 0.05, 0.05)
  // The eave's shadow.
  const eave = g.createLinearGradient(0, top, 0, top + 70)
  eave.addColorStop(0, 'rgba(70,40,30,0.4)')
  eave.addColorStop(1, 'rgba(70,40,30,0)')
  g.fillStyle = eave
  g.fillRect(x0, top, x1 - x0, 70)
  g.restore()
  // Timber frame.
  const beam = (bx: number, by: number, bw: number, bh: number) => {
    g.fillStyle = '#6b462d'
    g.beginPath()
    g.roundRect(bx, by, bw, bh, 2)
    g.fill()
    g.strokeStyle = 'rgba(40,22,12,0.3)'
    g.lineWidth = 1
    for (let i = 0; i < 5; i++) {
      g.beginPath()
      if (bw > bh) {
        const y = by + 3 + rng() * (bh - 6)
        g.moveTo(bx + 3, y)
        g.lineTo(bx + bw - 3, y + (rng() - 0.5) * 2)
      } else {
        const x = bx + 3 + rng() * (bw - 6)
        g.moveTo(x, by + 3)
        g.lineTo(x + (rng() - 0.5) * 2, by + bh - 3)
      }
      g.stroke()
    }
  }
  beam(x0 - 4, top, 22, base - top)
  beam(x0 - 4, top - 4, x1 - x0 + 4, 20)
  beam(4386, top, 18, base - top)
  beam(4684, top, 18, base - top)
  beam(4684, 300, x1 - 4684, 16)
  beam(4684, 500, x1 - 4684, 16)
  // Fieldstone footing.
  for (let x = x0 - 6; x < x1; x += 30 + rng() * 22) {
    wobbly(g, x + 16, base + 2, 19 + rng() * 6, 12 + rng() * 4, rng, 0.1, 9)
    g.fillStyle = ['#9a8f84', '#8a8078', '#a79b8c'][Math.floor(rng() * 3)]!
    g.fill()
    g.strokeStyle = 'rgba(60,50,46,0.3)'
    g.lineWidth = 1.4
    g.stroke()
  }
  // Thatch.
  g.beginPath()
  g.moveTo(x0 - 78, top + 6)
  g.quadraticCurveTo(x0 - 30, 60, x0 + 30, -20)
  g.lineTo(x1, -20)
  g.lineTo(x1, top + 2)
  for (let x = x1; x >= x0 - 78; x -= 14) g.lineTo(x, top + 2 + Math.sin(x * 0.6) * 3 + rng() * 5)
  g.closePath()
  const thatch = g.createLinearGradient(0, -20, 0, top)
  thatch.addColorStop(0, '#8a6a42')
  thatch.addColorStop(1, '#6a4c2e')
  g.fillStyle = thatch
  g.fill()
  g.save()
  g.clip()
  for (let i = 0; i < 520; i++) {
    const x = x0 - 80 + rng() * (x1 - x0 + 80)
    const y = -20 + rng() * (top + 20)
    g.strokeStyle = rng() < 0.5 ? `rgba(196,158,98,${0.2 + rng() * 0.3})` : `rgba(60,38,20,${0.2 + rng() * 0.25})`
    g.lineWidth = 1 + rng() * 1.4
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x - 4 + rng() * 3, y + 14 + rng() * 22)
    g.stroke()
  }
  g.restore()
  // The side window: lamplight and a curtain.
  const wn = HOME_WINDOW
  g.fillStyle = '#5e3d26'
  g.beginPath()
  g.roundRect(wn.x - 9, wn.y - 9, wn.w + 18, wn.h + 18, 4)
  g.fill()
  paintWindowGlass(g)
  g.fillStyle = '#6b462d'
  g.beginPath()
  g.roundRect(wn.x - 16, wn.y + wn.h + 6, wn.w + 32, 10, 3)
  g.fill()
  // The door: an arched frame, five planks, strap hinges, a ring to pull.
  const d = HOME_DOOR
  const dBottom = base + 2
  const arch = (inset: number) => {
    g.beginPath()
    g.moveTo(d.x + inset, dBottom)
    g.lineTo(d.x + inset, d.y + 60)
    g.quadraticCurveTo(d.x + inset, d.y + inset, d.x + d.w / 2, d.y + inset)
    g.quadraticCurveTo(d.x + d.w - inset, d.y + inset, d.x + d.w - inset, d.y + 60)
    g.lineTo(d.x + d.w - inset, dBottom)
    g.closePath()
  }
  arch(-12)
  g.fillStyle = '#5a3a25'
  g.fill()
  arch(0)
  const dg = g.createLinearGradient(d.x, 0, d.x + d.w, 0)
  dg.addColorStop(0, '#93633b')
  dg.addColorStop(1, '#7d5231')
  g.fillStyle = dg
  g.fill()
  g.save()
  g.clip()
  for (let i = 1; i < 5; i++) {
    const px = d.x + (d.w / 5) * i
    g.strokeStyle = 'rgba(50,28,14,0.55)'
    g.lineWidth = 2.2
    g.beginPath()
    g.moveTo(px, d.y)
    g.lineTo(px + (rng() - 0.5) * 2, dBottom)
    g.stroke()
  }
  for (let i = 0; i < 40; i++) {
    const px = d.x + rng() * d.w
    const py = d.y + rng() * (dBottom - d.y)
    g.strokeStyle = `rgba(50,28,14,${0.08 + rng() * 0.12})`
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(px, py)
    g.lineTo(px + (rng() - 0.5) * 2, py + 20 + rng() * 50)
    g.stroke()
  }
  g.restore()
  g.strokeStyle = '#2f2622'
  g.lineWidth = 7
  for (const hy of [d.y + 96, dBottom - 60]) {
    g.beginPath()
    g.moveTo(d.x + 2, hy)
    g.lineTo(d.x + 62, hy)
    g.stroke()
    g.beginPath()
    g.arc(d.x + 66, hy, 5, 0, TAU)
    g.fillStyle = '#2f2622'
    g.fill()
  }
  g.lineWidth = 4
  g.beginPath()
  g.arc(d.x + d.w - 26, d.y + 196, 11, 0, TAU)
  g.stroke()
  g.beginPath()
  g.arc(d.x + d.w - 26, d.y + 184, 4.5, 0, TAU)
  g.fillStyle = '#2f2622'
  g.fill()
  paintDoorPane(g)
  // The step.
  g.fillStyle = '#a89c8e'
  g.beginPath()
  g.roundRect(d.x - 22, dBottom - 2, d.w + 44, 20, 5)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.18)'
  g.fillRect(d.x - 18, dBottom, d.w + 36, 3)
  // The iron bracket for the lantern.
  g.strokeStyle = '#2f2622'
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(HOOK.x - 44, HOOK.y - 44)
  g.lineTo(HOOK.x - 44, HOOK.y - 6)
  g.stroke()
  g.lineWidth = 5
  g.beginPath()
  g.moveTo(HOOK.x - 44, HOOK.y - 34)
  g.lineTo(HOOK.x - 2, HOOK.y - 34)
  g.quadraticCurveTo(HOOK.x + 12, HOOK.y - 34, HOOK.x + 10, HOOK.y - 46)
  g.stroke()
  g.lineWidth = 3.4
  g.beginPath()
  g.moveTo(HOOK.x - 40, HOOK.y - 10)
  g.quadraticCurveTo(HOOK.x - 14, HOOK.y - 14, HOOK.x - 8, HOOK.y - 32)
  g.stroke()
  g.beginPath()
  g.moveTo(HOOK.x, HOOK.y - 34)
  g.lineTo(HOOK.x, HOOK.y - 10)
  g.arc(HOOK.x - 5, HOOK.y - 9, 5, 0, Math.PI * 0.9)
  g.stroke()
  // Pumpkins by the step.
  const pumpkin = (px: number, py: number, r: number, c: string) => {
    g.fillStyle = 'rgba(30,20,20,0.25)'
    g.beginPath()
    g.ellipse(px, py + r * 0.78, r * 1.1, r * 0.22, 0, 0, TAU)
    g.fill()
    for (const k of [-0.62, 0.62, -0.3, 0.3, 0]) {
      g.beginPath()
      g.ellipse(px + k * r, py, r * (0.56 - Math.abs(k) * 0.12), r * 0.8, 0, 0, TAU)
      g.fillStyle = c
      g.fill()
      g.strokeStyle = 'rgba(120,50,20,0.35)'
      g.lineWidth = 1.5
      g.stroke()
    }
    g.strokeStyle = '#5d6e33'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(px, py - r * 0.76)
    g.quadraticCurveTo(px + 2, py - r * 1.05, px + 8, py - r * 1.1)
    g.stroke()
  }
  pumpkin(4588, base + 10, 30, '#d9772b')
  pumpkin(4632, base + 18, 19, '#e3a43a')
}

// The lamplit panes, shared by the painted house and the glow drawn over the
// night version of it.
export function paintWindowGlass(g: G): void {
  const wn = HOME_WINDOW
  const glass = g.createLinearGradient(0, wn.y, 0, wn.y + wn.h)
  glass.addColorStop(0, '#ffe2a0')
  glass.addColorStop(1, '#f4b25c')
  g.fillStyle = glass
  g.fillRect(wn.x, wn.y, wn.w, wn.h)
  g.fillStyle = 'rgba(206,110,92,0.72)'
  g.beginPath()
  g.moveTo(wn.x, wn.y)
  g.lineTo(wn.x + wn.w * 0.46, wn.y)
  g.quadraticCurveTo(wn.x + wn.w * 0.3, wn.y + wn.h * 0.5, wn.x, wn.y + wn.h * 0.78)
  g.closePath()
  g.fill()
  g.beginPath()
  g.moveTo(wn.x + wn.w, wn.y)
  g.lineTo(wn.x + wn.w * 0.54, wn.y)
  g.quadraticCurveTo(wn.x + wn.w * 0.7, wn.y + wn.h * 0.5, wn.x + wn.w, wn.y + wn.h * 0.78)
  g.closePath()
  g.fill()
  g.fillStyle = '#5e3d26'
  g.fillRect(wn.x + wn.w / 2 - 3, wn.y, 6, wn.h)
  g.fillRect(wn.x, wn.y + wn.h / 2 - 3, wn.w, 6)
}

export function paintDoorPane(g: G): void {
  const d = HOME_DOOR
  const cx = d.x + d.w / 2
  const cy = d.y + 84
  g.beginPath()
  g.arc(cx, cy, 31, 0, TAU)
  g.fillStyle = '#5a3a25'
  g.fill()
  g.beginPath()
  g.arc(cx, cy, 25, 0, TAU)
  const glass = g.createRadialGradient(cx, cy + 6, 2, cx, cy, 26)
  glass.addColorStop(0, '#fff0be')
  glass.addColorStop(1, '#f2ad55')
  g.fillStyle = glass
  g.fill()
  g.strokeStyle = '#5a3a25'
  g.lineWidth = 4
  g.beginPath()
  g.moveTo(cx - 25, cy)
  g.lineTo(cx + 25, cy)
  g.moveTo(cx, cy - 25)
  g.lineTo(cx, cy + 25)
  g.stroke()
}

function paintNear(g: G, L: Layout, x0: number, x1: number): void {
  const inX = (x: number, m: number) => x > x0 - m && x < x1 + m
  // Autumn crowns: dabs of leaf colour high up, thinning at the fringe.
  for (const c of L.canopy) {
    if (!inX(c.x, 160)) continue
    const rng = mulberry(Math.floor(c.rot * 1000))
    wobbly(g, c.x, c.y, c.r * 1.25, c.r * 0.82, rng, 0.2, 11)
    const col = CANOPY[c.c]!
    g.fillStyle = `rgba(${col[0]},${col[1]},${col[2]},${c.a})`
    g.fill()
    for (let i = 0; i < 16; i++) {
      const a = rng() * TAU
      const d = 0.75 + rng() * 0.5
      const other = CANOPY[Math.floor(rng() * CANOPY.length)]!
      leafDab(g, c.x + Math.cos(a) * c.r * 1.25 * d, c.y + Math.sin(a) * c.r * 0.82 * d, 7 + rng() * 8, rng() * 6, `rgba(${other[0]},${other[1]},${other[2]},0.9)`)
    }
  }
  // The floor of the wood.
  g.beginPath()
  g.moveTo(x0 - 6, H + 4)
  for (let x = x0 - 6; x <= x1 + 12; x += 8) g.lineTo(x, groundTop(x))
  g.lineTo(x1 + 12, H + 4)
  g.closePath()
  const floor = g.createLinearGradient(0, 600, 0, H)
  floor.addColorStop(0, '#6f5236')
  floor.addColorStop(1, '#4a3424')
  g.fillStyle = floor
  g.fill()
  g.save()
  g.clip()
  const earthCols = [hexRgb('#8a6a40'), hexRgb('#4e3a28'), hexRgb('#6f6a38')]
  for (const e of L.earth) if (inX(e.x, 140)) blob(g, e.x, e.y, e.r, earthCols[e.c]!, e.a)
  // The path: paler, trodden earth, soft at its edges.
  soft(g, 'rgba(176,140,90,0.78)', 12, 1, () => {
    g.beginPath()
    for (let x = x0 - 40; x <= x1 + 40; x += 20) {
      const y = groundY(x) + 8 - (26 + 6 * Math.sin(x * 0.013))
      if (x === x0 - 40) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    for (let x = x1 + 40; x >= x0 - 40; x -= 20) g.lineTo(x, groundY(x) + 8 + (28 + 6 * Math.sin(x * 0.017 + 1)))
    g.closePath()
  })
  for (const p of L.pebbles) {
    if (!inX(p.x, 10)) continue
    g.beginPath()
    g.ellipse(p.x, p.y, p.r, p.r * 0.62, p.rot, 0, TAU)
    g.fillStyle = `rgba(214,196,160,${p.a})`
    g.fill()
  }
  g.restore()
  for (const t of L.tufts) {
    if (t.c !== 0 || !inX(t.x, 30)) continue
    g.strokeStyle = t.rot < 0.5 ? '#6b7a38' : '#8a7a3a'
    g.lineWidth = 1.8
    for (let k = -2; k <= 2; k++) {
      g.beginPath()
      g.moveTo(t.x + k * 2.4, t.y)
      g.quadraticCurveTo(t.x + k * 3.4, t.y - t.r * 0.6, t.x + k * 5.5 + (t.rot - 0.5) * 6, t.y - t.r)
      g.stroke()
    }
  }
  for (const s of L.saplings) if (inX(s.x, 60)) paintTrunk(g, s, true)
  if (x0 < 260) paintFence(g, -20, 138)
  if (x1 > 3900 && x0 < 4200) paintFence(g, 3990, 4146)
  for (const t of L.trunks) {
    if (!inX(t.x, 320)) continue
    // A patch of shade where each tree meets the ground.
    g.fillStyle = 'rgba(40,24,18,0.3)'
    g.beginPath()
    g.ellipse(t.x, t.base + 4, t.w * 1.25, 11, 0, 0, TAU)
    g.fill()
    paintTrunk(g, t, false)
  }
  if (x1 > HOUSE_X - 120) paintHouse(g)
  for (const f of L.ferns) if (inX(f.x, 80)) paintFern(g, f)
  for (const l of L.leaves) {
    if (!inX(l.x, 16)) continue
    g.globalAlpha = l.a
    leafDab(g, l.x, l.y, l.r, l.rot, LEAF[l.c]!, l.r > 9 ? 'rgba(80,36,18,0.4)' : undefined)
  }
  g.globalAlpha = 1
  for (const t of L.tufts) {
    if (t.c !== 1 || !inX(t.x, 40)) continue
    g.strokeStyle = t.rot < 0.5 ? '#5d6e33' : '#7c7a36'
    g.lineWidth = 2.4
    for (let k = -3; k <= 3; k++) {
      g.beginPath()
      g.moveTo(t.x + k * 3, t.y + 8)
      g.quadraticCurveTo(t.x + k * 4.5, t.y - t.r * 0.6, t.x + k * 8 + (t.rot - 0.5) * 12, t.y - t.r)
      g.stroke()
    }
  }
  grain(g, x0, 560, x1 - x0, H - 560, 1400, mulberry(Math.floor(x0) + 5), 0.05, 0.04)
}

// The wood further back, which the candle never reaches: painted the same in
// both versions, behind everything already there.
function paintFar(g: G, L: Layout, x0: number, x1: number): void {
  g.globalCompositeOperation = 'destination-over'
  // (destination-over: the first thing drawn ends up in front.)
  g.beginPath()
  g.moveTo(x0 - 6, H)
  for (let x = x0 - 6; x <= x1 + 12; x += 10) g.lineTo(x, groundTop(x) - 22 + 7 * Math.sin(x * 0.045) + 5 * Math.sin(x * 0.11 + 2))
  g.lineTo(x1 + 12, H)
  g.closePath()
  g.fillStyle = '#23224a'
  g.fill()
  for (const f of L.far) {
    if (f.x < x0 - 60 || f.x > x1 + 60) continue
    const base = groundTop(f.x) - 6
    g.beginPath()
    g.moveTo(f.x - f.r * 0.6, base)
    g.lineTo(f.x - f.r * 0.42 + f.rot * base, -10)
    g.lineTo(f.x + f.r * 0.42 + f.rot * base, -10)
    g.lineTo(f.x + f.r * 0.6, base)
    g.closePath()
    g.fillStyle = f.c === 0 ? `rgba(44,40,84,${f.a})` : `rgba(58,48,96,${f.a * 0.8})`
    g.fill()
  }
  g.globalCompositeOperation = 'source-over'
}

// Things only the lantern finds: small brown toadstools among the roots.
function paintSecrets(g: G, L: Layout, x0: number, x1: number): void {
  for (const m of L.toadstools) {
    if (m.x < x0 - 20 || m.x > x1 + 20) continue
    g.save()
    g.translate(m.x, m.y)
    g.rotate(m.rot)
    g.strokeStyle = '#eadcbc'
    g.lineWidth = m.r * 0.5
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, -m.r * 1.5)
    g.stroke()
    g.beginPath()
    g.ellipse(0, -m.r * 1.5, m.r * 1.5, m.r * 0.9, 0, Math.PI, 0)
    g.closePath()
    g.fillStyle = m.c === 0 ? '#b5763e' : '#d9b27a'
    g.fill()
    g.restore()
  }
}

function paintSky(g: G): void {
  const rng = mulberry(4401)
  const grad = g.createLinearGradient(0, 0, 0, 650)
  grad.addColorStop(0, '#22255e')
  grad.addColorStop(0.3, '#3d3475')
  grad.addColorStop(0.52, '#754883')
  grad.addColorStop(0.7, '#c2627f')
  grad.addColorStop(0.84, '#ee9668')
  grad.addColorStop(1, '#f7c47c')
  g.fillStyle = grad
  g.fillRect(0, 0, W, H)
  // Long thin evening clouds.
  for (let i = 0; i < 26; i++) {
    const x = rng() * W
    const y = 300 + rng() * 240
    const r = 60 + rng() * 120
    g.save()
    g.translate(x, y)
    g.scale(1, 0.16 + rng() * 0.1)
    blob(g, 0, 0, r, y < 420 ? [150, 96, 150] : [250, 190, 150], 0.22 + rng() * 0.16)
    g.restore()
  }
  for (let i = 0; i < 70; i++) {
    const y = rng() ** 1.6 * 330
    g.fillStyle = `rgba(255,246,222,${(0.75 - y / 480) * (0.4 + rng() * 0.6)})`
    g.beginPath()
    g.arc(rng() * W, y, 0.7 + rng() * 1.1, 0, TAU)
    g.fill()
  }
  // A thin new moon.
  blob(g, 936, 118, 80, [255, 240, 200], 0.16)
  g.save()
  g.translate(936, 118)
  g.rotate(-0.5)
  g.beginPath()
  g.arc(0, 0, 24, 0.915, TAU - 0.915, false)
  g.arc(12, 0, 19.2, -1.433, 1.433, true)
  g.closePath()
  g.fillStyle = '#fff3cf'
  g.fill()
  g.restore()
  grain(g, 0, 0, W, 650, 3000, rng, 0.03, 0.03)
}

function paintHills(g: G, w: number, h: number): void {
  const rng = mulberry(9917)
  const ridge = (fn: (x: number) => number, fill: string) => {
    g.beginPath()
    g.moveTo(-4, h)
    for (let x = -4; x <= w + 8; x += 8) g.lineTo(x, fn(x))
    g.lineTo(w + 8, h)
    g.closePath()
    g.fillStyle = fill
    g.fill()
  }
  ridge((x) => 120 + 26 * Math.sin(x * 0.0031 + 0.3) + 10 * Math.sin(x * 0.009 + 2), '#6c5894')
  for (let i = 0; i < 30; i++) blob(g, rng() * w, 150 + rng() * 40, 60 + rng() * 60, [200, 120, 130], 0.08)
  ridge(hillY, '#4a4079')
  // The village the far lanterns are walking home to.
  for (let i = 0; i < 7; i++) {
    const x = w - 250 + i * 26 + rng() * 8
    const y = hillY(x) + 2
    const hw = 9 + rng() * 5
    const hh = 9 + rng() * 6
    g.fillStyle = '#332d5c'
    g.beginPath()
    g.moveTo(x - hw, y)
    g.lineTo(x - hw, y - hh)
    g.lineTo(x, y - hh - hw * 0.8)
    g.lineTo(x + hw, y - hh)
    g.lineTo(x + hw, y)
    g.closePath()
    g.fill()
    g.fillStyle = '#ffd98a'
    g.fillRect(x - 2.5, y - hh * 0.72, 4, 4)
  }
  // The nearer treeline: round crowns.
  g.fillStyle = '#322e62'
  for (let x = -20; x < w + 30; x += 22 + rng() * 22) {
    g.beginPath()
    g.ellipse(x, 238 + Math.sin(x * 0.01) * 8 + rng() * 6, 22 + rng() * 16, 20 + rng() * 14, 0, 0, TAU)
    g.fill()
  }
  g.fillRect(0, 244, w, h - 244)
}

export interface Wood {
  sky: HTMLCanvasElement
  hills: HTMLCanvasElement
  lit: HTMLCanvasElement[]
  night: HTMLCanvasElement[]
}

export function buildWood(): Wood {
  const L = layout()
  const [sky, sg] = makeCanvas(W, H)
  paintSky(sg)
  settle(sg)
  const hillW = Math.ceil(W + CAM_MAX * HILL_PARALLAX + 20)
  const [hills, hg] = makeCanvas(hillW, 300)
  paintHills(hg, hillW, 300)
  settle(hg)
  const lit: HTMLCanvasElement[] = []
  const night: HTMLCanvasElement[] = []
  const tiles = Math.ceil(WORLD_W / TILE_W)
  for (let i = 0; i < tiles; i++) {
    const x0 = i * TILE_W
    const x1 = x0 + TILE_W + LAP
    const [c, g] = makeCanvas(TILE_W + LAP, H)
    g.translate(-x0, 0)
    paintNear(g, L, x0, x1)
    const [n, ng] = makeCanvas((TILE_W + LAP) / 2, H / 2)
    ng.drawImage(c, 0, 0, (TILE_W + LAP) / 2, H / 2)
    ng.globalCompositeOperation = 'source-atop'
    ng.fillStyle = 'rgba(21,22,56,0.9)'
    ng.fillRect(0, 0, n.width, n.height)
    ng.globalCompositeOperation = 'source-over'
    ng.scale(0.5, 0.5)
    ng.translate(-x0, 0)
    // The far wood goes only into the dusk version: it shows through the
    // gaps of the lit one, which is drawn over it.
    paintFar(ng, L, x0, x1)
    paintSecrets(g, L, x0, x1)
    settle(g)
    settle(ng)
    lit.push(c)
    night.push(n)
  }
  return { sky, hills, lit, night }
}

// Draw the tiles that cover screen x `from`..`to`.
export function drawTiles(g: G, tiles: readonly HTMLCanvasElement[], cam: number, from: number, to: number): void {
  const first = Math.max(0, Math.floor((cam + from) / TILE_W))
  const last = Math.min(tiles.length - 1, Math.floor((cam + to) / TILE_W))
  for (let i = first; i <= last; i++) g.drawImage(tiles[i]!, i * TILE_W - cam, 0, TILE_W + LAP, H)
}
