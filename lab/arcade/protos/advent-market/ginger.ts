// The gingerbread stall: a heart, a star and a little house on a board, and a
// piping bag of white icing. Drawing a finger across a biscuit squeezes a line
// of icing that sits up on it; almonds, raisins and sugar pearls press on.

import { clamp, damp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import { DYE, brush, candlelit, drawSnow, duskWindow, flame, flicker, garland, glow, grain, lazure, makeSnow, makeSprite, mulberry, planks, put, rgba } from './art.ts'
import type { G, Rng, Sprite } from './art.ts'
import { lanternBody } from './candle.ts'
import type { Made, Scene, World } from './shared.ts'

const TABLE_Y = 236
// The baking board, and the icing layers that lie over it.
const BOARD = { x: 246, y: 276, w: 770, h: 470 }
const ICING_TOTAL = 11000

type Topping = 'almond' | 'raisin' | 'pearl'
const BOWLS: { kind: Topping; x: number; y: number }[] = [
  { kind: 'almond', x: 1098, y: 356 },
  { kind: 'raisin', x: 1098, y: 506 },
  { kind: 'pearl', x: 1098, y: 656 },
]
const BOWL_R = 56
const PER_BOWL = 9

interface Biscuit {
  x: number
  y: number
  w: number
  h: number
  path: Path2D
}

interface Bit {
  kind: Topping
  x: number
  y: number
  rot: number
  settle: number
  // Which biscuit it is pressed into, or -1 if it lies on the board.
  on: number
}

function heartPath(cx: number, cy: number, r: number): Path2D {
  const p = new Path2D()
  p.moveTo(cx, cy + r * 0.98)
  p.bezierCurveTo(cx - r * 1.45, cy - r * 0.02, cx - r * 0.8, cy - r * 1.22, cx, cy - r * 0.42)
  p.bezierCurveTo(cx + r * 0.8, cy - r * 1.22, cx + r * 1.45, cy - r * 0.02, cx, cy + r * 0.98)
  p.closePath()
  return p
}

function starPath(cx: number, cy: number, r: number): Path2D {
  const p = new Path2D()
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const rr = i % 2 === 0 ? r : r * 0.52
    const x = cx + Math.cos(a) * rr
    const y = cy + Math.sin(a) * rr
    if (i === 0) p.moveTo(x, y)
    else p.lineTo(x, y)
  }
  p.closePath()
  return p
}

function housePath(cx: number, cy: number, w: number, h: number): Path2D {
  const p = new Path2D()
  const l = cx - w / 2
  const r = cx + w / 2
  const top = cy - h / 2
  const eave = top + h * 0.42
  const bottom = cy + h / 2
  p.moveTo(l, bottom)
  p.lineTo(l, eave)
  p.lineTo(l - 10, eave)
  p.lineTo(cx - w * 0.22, top + h * 0.15)
  // A chimney on the left slope.
  p.lineTo(cx - w * 0.22, top - 2)
  p.lineTo(cx - w * 0.04, top - 2)
  p.lineTo(cx - w * 0.04, top + h * 0.02)
  p.lineTo(cx, top)
  p.lineTo(r + 10, eave)
  p.lineTo(r, eave)
  p.lineTo(r, bottom)
  p.closePath()
  return p
}

function drawBit(g: G, b: { kind: Topping; rot: number }, x: number, y: number, s = 1): void {
  g.save()
  g.translate(x, y)
  g.rotate(b.rot)
  g.scale(s * 1.25, s * 1.25)
  if (b.kind === 'almond') {
    g.fillStyle = 'rgba(60,30,14,0.25)'
    g.beginPath()
    g.ellipse(1.5, 3, 14, 9, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#f1dfc0'
    g.beginPath()
    g.moveTo(-15, 0)
    g.quadraticCurveTo(-6, -11, 14, -1)
    g.quadraticCurveTo(-4, 11, -15, 0)
    g.fill()
    g.fillStyle = 'rgba(255,250,236,0.7)'
    g.beginPath()
    g.ellipse(-3, -2, 7, 2.6, 0.1, 0, TAU)
    g.fill()
  } else if (b.kind === 'raisin') {
    g.fillStyle = 'rgba(40,16,10,0.25)'
    g.beginPath()
    g.ellipse(1.5, 3, 10, 8, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#4a2634'
    g.beginPath()
    g.moveTo(-10, 1)
    g.quadraticCurveTo(-8, -9, 1, -7)
    g.quadraticCurveTo(11, -8, 9, 2)
    g.quadraticCurveTo(7, 9, -2, 8)
    g.quadraticCurveTo(-10, 8, -10, 1)
    g.fill()
    g.strokeStyle = 'rgba(160,100,120,0.5)'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(-5, -2)
    g.quadraticCurveTo(0, -5, 4, -1)
    g.moveTo(-3, 3)
    g.quadraticCurveTo(1, 1, 5, 4)
    g.stroke()
  } else {
    g.fillStyle = 'rgba(60,30,14,0.25)'
    g.beginPath()
    g.arc(1.5, 3, 8, 0, TAU)
    g.fill()
    g.fillStyle = '#eee8dc'
    g.beginPath()
    g.arc(0, 0, 8, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.95)'
    g.beginPath()
    g.arc(-2.5, -2.5, 3, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(150,140,160,0.3)'
    g.beginPath()
    g.arc(2.5, 3, 3.4, 0, TAU)
    g.fill()
  }
  g.restore()
}

function paintBiscuit(g: G, b: Biscuit, rng: Rng): void {
  // The shadow it casts on the board.
  g.save()
  g.translate(3, 6)
  g.fillStyle = 'rgba(50,24,10,0.3)'
  g.fill(b.path)
  g.restore()
  g.fillStyle = '#a4673a'
  g.fill(b.path)
  g.save()
  g.clip(b.path)
  // Baked darker at the edge, lighter and a little domed in the middle.
  const dome = g.createRadialGradient(b.x - b.w * 0.1, b.y - b.h * 0.12, 10, b.x, b.y, Math.max(b.w, b.h) * 0.62)
  dome.addColorStop(0, 'rgba(206,146,90,0.75)')
  dome.addColorStop(0.6, 'rgba(180,116,66,0.3)')
  dome.addColorStop(1, 'rgba(120,66,30,0.5)')
  g.fillStyle = dome
  g.fillRect(b.x - b.w, b.y - b.h, b.w * 2, b.h * 2)
  for (let i = 0; i < 90; i++) {
    g.fillStyle = rng() < 0.5 ? 'rgba(96,52,24,0.28)' : 'rgba(230,180,130,0.25)'
    g.beginPath()
    g.arc(b.x + (rng() - 0.5) * b.w, b.y + (rng() - 0.5) * b.h, 0.8 + rng() * 1.6, 0, TAU)
    g.fill()
  }
  g.strokeStyle = 'rgba(122,66,30,0.6)'
  g.lineWidth = 9
  g.lineJoin = 'round'
  g.stroke(b.path)
  g.restore()
}

export function createGingerStall(world: World): Scene {
  const { stage, snd } = world
  let backdrop: Sprite | null = null
  const snow = makeSnow(86, 24, 220, 176, 18, mulberry(46))
  let biscuits: Biscuit[] = []
  let body: HTMLCanvasElement | null = null
  let shadow: HTMLCanvasElement | null = null
  let bodyG: G | null = null
  let shadowG: G | null = null
  let probe: G | null = null
  let used = 0
  // Counts every change to a biscuit, so the pictures of them for the basket
  // are only painted again when something is different.
  let stamp = 0
  let shown = -1
  let shownMade: Made[] = []
  const iced: boolean[] = [false, false, false]
  let bits: Bit[] = []
  let stock: Record<Topping, number> = { almond: PER_BOWL, raisin: PER_BOWL, pearl: PER_BOWL }

  // The bag rests on the board until a finger starts a line, then its tip
  // goes where the finger is.
  const REST = { x: 330, y: 700 }
  let bagX = REST.x
  let bagY = REST.y
  let bagTilt = 1.25
  let squeeze = 0
  type Held = { type: 'none' } | { type: 'pipe'; id: number; on: number; x: number; y: number; px: number; py: number; ppx: number; ppy: number; w: number; run: number } | { type: 'bit'; id: number; bit: Bit; x: number; y: number; moved: number; fromBowl: boolean }
  let held: Held = { type: 'none' }
  let idle = 0

  const build = (): void => {
    const dpr = world.dpr
    biscuits = [
      { x: 404, y: 492, w: 250, h: 220, path: heartPath(404, 500, 110) },
      { x: 644, y: 478, w: 240, h: 230, path: starPath(644, 486, 124) },
      { x: 880, y: 500, w: 210, h: 250, path: housePath(880, 506, 196, 244) },
    ]
    backdrop = makeSprite(W, H, world.bg, paint)
    const layer = (): [HTMLCanvasElement, G] => {
      const c = document.createElement('canvas')
      c.width = Math.ceil(BOARD.w * dpr)
      c.height = Math.ceil(BOARD.h * dpr)
      const g = c.getContext('2d')
      if (!g) throw new Error('2D canvas is not available')
      g.setTransform(dpr, 0, 0, dpr, -BOARD.x * dpr, -BOARD.y * dpr)
      g.lineCap = 'round'
      g.lineJoin = 'round'
      return [c, g]
    }
    ;[body, bodyG] = layer()
    ;[shadow, shadowG] = layer()
    const pc = document.createElement('canvas')
    pc.width = 1
    pc.height = 1
    probe = pc.getContext('2d')
  }

  const fresh = (): void => {
    used = 0
    stamp++
    iced.fill(false)
    bits = []
    stock = { almond: PER_BOWL, raisin: PER_BOWL, pearl: PER_BOWL }
    held = { type: 'none' }
    bagX = REST.x
    bagY = REST.y
    for (const g of [bodyG, shadowG]) {
      if (!g) continue
      g.save()
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, g.canvas.width, g.canvas.height)
      g.restore()
    }
  }

  const biscuitAt = (x: number, y: number): number => {
    if (!probe) return -1
    for (let i = 0; i < biscuits.length; i++) if (probe.isPointInPath(biscuits[i]!.path, x, y)) return i
    return -1
  }

  // One more stretch of icing, from the last point to this one.
  const pipe = (h: Extract<Held, { type: 'pipe' }>, x: number, y: number, w: number): void => {
    if (!bodyG || !shadowG) return
    stamp++
    const b = biscuits[h.on]
    if (!b) return
    for (const g of [shadowG, bodyG]) {
      g.save()
      g.clip(b.path)
    }
    shadowG.strokeStyle = 'rgba(70,34,12,0.34)'
    shadowG.lineWidth = w + 1.5
    shadowG.beginPath()
    shadowG.moveTo(h.px + 1.5, h.py + 3.2)
    shadowG.lineTo(x + 1.5, y + 3.2)
    shadowG.stroke()
    bodyG.strokeStyle = '#fbf5e8'
    bodyG.lineWidth = w
    bodyG.beginPath()
    bodyG.moveTo(h.px, h.py)
    bodyG.lineTo(x, y)
    bodyG.stroke()
    // The light along its back, redrawn over the join with the last stretch.
    bodyG.strokeStyle = 'rgba(255,255,255,0.95)'
    bodyG.lineWidth = Math.max(1.4, w * 0.3)
    bodyG.beginPath()
    bodyG.moveTo(h.ppx - w * 0.14, h.ppy - w * 0.2)
    bodyG.lineTo(h.px - w * 0.14, h.py - w * 0.2)
    bodyG.lineTo(x - w * 0.14, y - w * 0.2)
    bodyG.stroke()
    shadowG.restore()
    bodyG.restore()
  }

  const dot = (on: number, x: number, y: number, r: number): void => {
    if (!bodyG || !shadowG) return
    stamp++
    const b = biscuits[on]
    if (!b) return
    for (const g of [shadowG, bodyG]) {
      g.save()
      g.clip(b.path)
    }
    shadowG.fillStyle = 'rgba(70,34,12,0.34)'
    shadowG.beginPath()
    shadowG.arc(x + 1.5, y + 3.2, r + 0.8, 0, TAU)
    shadowG.fill()
    bodyG.fillStyle = '#fbf5e8'
    bodyG.beginPath()
    bodyG.arc(x, y, r, 0, TAU)
    bodyG.fill()
    bodyG.fillStyle = 'rgba(255,255,255,0.95)'
    bodyG.beginPath()
    bodyG.arc(x - r * 0.3, y - r * 0.35, r * 0.36, 0, TAU)
    bodyG.fill()
    shadowG.restore()
    bodyG.restore()
  }

  function paint(g: G): void {
    const rng = mulberry(9920)
    lazure(g, 0, 0, W, TABLE_Y + 4, DYE.wall, [[238, 196, 146], [214, 152, 112], [228, 174, 124], [202, 136, 108]], rng, 110)
    duskWindow(g, 86, 24, 220, 176, rng, 0.1)
    planks(g, 68, 202, 256, 16, [170, 118, 72], rng, 1)
    garland(g, 340, 16, 760, 20, 26, rng, 32)
    garland(g, 760, 20, 1190, 12, 26, rng, 32)
    // Hearts on ribbons along the wall, iced by other hands.
    for (const [hx, hy, r] of [[470, 120, 30], [620, 136, 24], [790, 122, 32], [960, 138, 26], [1090, 118, 28]] as const) {
      g.strokeStyle = rgba(DYE.madder)
      g.lineWidth = 2.5
      g.beginPath()
      g.moveTo(hx, 36)
      g.lineTo(hx, hy - r * 0.4)
      g.stroke()
      const p = heartPath(hx, hy, r)
      g.fillStyle = '#a4673a'
      g.fill(p)
      g.strokeStyle = 'rgba(255,248,236,0.95)'
      g.lineWidth = 2.6
      g.setLineDash([5, 5])
      g.stroke(heartPath(hx, hy + 1, r * 0.72))
      g.setLineDash([])
    }
    g.strokeStyle = 'rgba(60,36,24,0.8)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(376, 30)
    g.lineTo(376, 84)
    g.stroke()
    lanternBody(g, 376, 128, 0.9)

    planks(g, 0, TABLE_Y, W, H - TABLE_Y, [170, 116, 70], rng, 6)
    const edge = g.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 24)
    edge.addColorStop(0, 'rgba(50,24,12,0.4)')
    edge.addColorStop(1, 'rgba(50,24,12,0)')
    g.fillStyle = edge
    g.fillRect(0, TABLE_Y, W, 24)
    // The board: pale beech, with baking parchment on it.
    g.fillStyle = 'rgba(40,20,12,0.25)'
    g.beginPath()
    g.roundRect(BOARD.x - 8, BOARD.y + 2, BOARD.w + 24, BOARD.h + 18, 18)
    g.fill()
    g.save()
    g.beginPath()
    g.roundRect(BOARD.x - 14, BOARD.y - 10, BOARD.w + 28, BOARD.h + 20, 18)
    g.clip()
    planks(g, BOARD.x - 14, BOARD.y - 10, BOARD.w + 28, BOARD.h + 20, [214, 172, 116], rng, 5)
    g.restore()
    g.fillStyle = 'rgba(240,228,204,0.9)'
    g.beginPath()
    g.moveTo(BOARD.x + 14, BOARD.y + 12)
    g.lineTo(BOARD.x + BOARD.w - 20, BOARD.y + 6)
    g.lineTo(BOARD.x + BOARD.w - 10, BOARD.y + BOARD.h - 76)
    g.lineTo(BOARD.x + 150, BOARD.y + BOARD.h - 66)
    g.lineTo(BOARD.x + 142, BOARD.y + 300)
    g.lineTo(BOARD.x + 8, BOARD.y + 306)
    g.closePath()
    g.fill()
    g.save()
    g.clip()
    brush(g, BOARD.x, BOARD.y, BOARD.w, BOARD.h, rng, 90, 0.05, 0.5, 90)
    g.restore()
    biscuits.forEach((b, i) => paintBiscuit(g, b, mulberry(60 + i)))

    // Three wooden bowls for the things that press on.
    for (const bowl of BOWLS) {
      g.fillStyle = 'rgba(40,20,12,0.28)'
      g.beginPath()
      g.ellipse(bowl.x + 4, bowl.y + 10, BOWL_R + 8, BOWL_R + 4, 0, 0, TAU)
      g.fill()
      g.fillStyle = '#9a6a3c'
      g.beginPath()
      g.arc(bowl.x, bowl.y, BOWL_R + 8, 0, TAU)
      g.fill()
      const inside = g.createRadialGradient(bowl.x - 10, bowl.y - 14, 8, bowl.x, bowl.y, BOWL_R)
      inside.addColorStop(0, '#c99a62')
      inside.addColorStop(1, '#8a5a30')
      g.fillStyle = inside
      g.beginPath()
      g.arc(bowl.x, bowl.y, BOWL_R, 0, TAU)
      g.fill()
      g.strokeStyle = 'rgba(255,226,170,0.3)'
      g.lineWidth = 3
      g.beginPath()
      g.arc(bowl.x, bowl.y, BOWL_R + 5, Math.PI * 1.05, Math.PI * 1.7)
      g.stroke()
    }

    candlelit(
      g,
      W,
      H,
      [
        { x: 640, y: 480, r: 560 },
        { x: 376, y: 130, r: 300 },
        { x: 1090, y: 500, r: 360, lift: 0.9 },
        { x: 200, y: 110, r: 230, lift: 0.5 },
        { x: 160, y: 520, r: 300, lift: 0.8 },
      ],
      'rgba(58,28,46,0.44)',
      0.1,
    )
    grain(g, 0, 0, W, H, 2400, rng, 0.03, 0.03)
  }

  // Where the i-th thing sits in a bowl.
  const inBowl = (bowl: { x: number; y: number }, i: number): [number, number, number] => {
    const a = i * 2.4
    const r = i === 0 ? 0 : 14 + ((i * 11) % 22)
    return [bowl.x + Math.cos(a) * r, bowl.y + Math.sin(a) * r * 0.9, a * 1.7]
  }

  const drawBag = (g: G, x: number, y: number, tilt: number, full: number, press: number): void => {
    g.save()
    g.translate(x, y)
    g.rotate(tilt)
    // The tip is at the origin; the bag lies back along -y.
    const fat = 30 + full * 26 - press * 5
    const len = 150
    g.fillStyle = 'rgba(40,20,12,0.2)'
    g.beginPath()
    g.ellipse(12, -len * 0.5 + 10, fat * 0.9, len * 0.5, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#efe6d2'
    g.beginPath()
    g.moveTo(-4, -8)
    g.quadraticCurveTo(-fat * 1.05, -len * 0.5, -fat * 0.42, -len)
    g.lineTo(fat * 0.42, -len)
    g.quadraticCurveTo(fat * 1.05, -len * 0.5, 4, -8)
    g.closePath()
    g.fill()
    g.save()
    g.clip()
    g.fillStyle = 'rgba(150,120,90,0.22)'
    g.fillRect(fat * 0.1, -len, fat, len)
    g.strokeStyle = 'rgba(150,120,90,0.3)'
    g.lineWidth = 2
    for (const k of [-0.3, 0.1, 0.4]) {
      g.beginPath()
      g.moveTo(k * fat, -len)
      g.quadraticCurveTo(k * fat * 1.6, -len * 0.6, k * fat * 0.3, -20)
      g.stroke()
    }
    g.restore()
    // The twist at the top, tied with string.
    g.fillStyle = '#e4d8be'
    g.beginPath()
    g.moveTo(-fat * 0.42, -len)
    g.quadraticCurveTo(0, -len - 8, -14, -len - 36)
    g.lineTo(16, -len - 34)
    g.quadraticCurveTo(4, -len - 8, fat * 0.42, -len)
    g.closePath()
    g.fill()
    g.strokeStyle = rgba(DYE.madder)
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(-fat * 0.4, -len)
    g.lineTo(fat * 0.4, -len - 2)
    g.stroke()
    // The metal nozzle and a bead of icing at its tip.
    g.fillStyle = '#b9b2a6'
    g.beginPath()
    g.moveTo(-7, -18)
    g.lineTo(7, -18)
    g.lineTo(2.5, 0)
    g.lineTo(-2.5, 0)
    g.closePath()
    g.fill()
    if (full > 0.01) {
      g.fillStyle = '#fbf5e8'
      g.beginPath()
      g.arc(0, 1, 3.2 + press * 1.5, 0, TAU)
      g.fill()
    }
    g.restore()
  }

  const renderBiscuit = (i: number): Sprite => {
    const b = biscuits[i]!
    const pad = 16
    const w = b.w + pad * 2
    const h = b.h + pad * 2
    const ox = b.x - w / 2
    const oy = b.y - h / 2 + 6
    return makeSprite(w, h, world.dpr, (g) => {
      g.translate(-ox, -oy)
      paintBiscuit(g, b, mulberry(60 + i))
      g.save()
      g.clip(b.path)
      if (shadow) g.drawImage(shadow, BOARD.x, BOARD.y, BOARD.w, BOARD.h)
      if (body) g.drawImage(body, BOARD.x, BOARD.y, BOARD.w, BOARD.h)
      g.restore()
      for (const bit of bits) if (bit.on === i) drawBit(g, bit, bit.x, bit.y)
    })
  }

  return {
    enter() {
      if (!backdrop) build()
      idle = 0
      // Anything still in the hand when the child stepped away is back in its place.
      if (held.type === 'bit') {
        if (held.fromBowl) stock[held.bit.kind]++
        else bits.push(held.bit)
      }
      held = { type: 'none' }
    },
    reset: fresh,
    made(): Made[] {
      if (shown === stamp) return shownMade
      const out: Made[] = []
      biscuits.forEach((b, i) => {
        if (!iced[i] && !bits.some((bit) => bit.on === i)) return
        const s = renderBiscuit(i)
        out.push({
          kind: 'biscuit',
          from: 'ginger',
          x: b.x,
          y: b.y,
          h: s.h,
          draw(g, x, y, scale) {
            g.drawImage(s.canvas, x - (s.w * scale) / 2, y - (s.h * scale) / 2, s.w * scale, s.h * scale)
          },
        })
      })
      shown = stamp
      shownMade = out
      return out
    },
    update(dt) {
      idle += dt
      squeeze = damp(squeeze, held.type === 'pipe' ? 1 : 0, 10, dt)
      for (const b of bits) b.settle = damp(b.settle, 0, 8, dt)
      if (held.type === 'pipe') {
        bagX = damp(bagX, held.x, 40, dt)
        bagY = damp(bagY, held.y, 40, dt)
        bagTilt = damp(bagTilt, 0.62, 12, dt)
      } else {
        bagX = damp(bagX, REST.x, 5, dt)
        bagY = damp(bagY, REST.y, 5, dt)
        bagTilt = damp(bagTilt, 1.25, 5, dt)
      }
      if (held.type === 'bit') {
        const p = stage.pointers.get(held.id)
        if (p && p.down) {
          held.x = damp(held.x, p.x, 28, dt)
          held.y = damp(held.y, p.y - 26, 28, dt)
        }
      }
    },
    draw(g) {
      const t = stage.time
      if (backdrop) put(g, backdrop, 0, 0)
      drawSnow(g, snow, t)
      const lf = flicker(t, 11)
      glow(g, world.halo, 376, 128, 88 + lf * 10, 0.9)
      flame(g, 376, 136, 20, lf)

      if (shadow) g.drawImage(shadow, BOARD.x, BOARD.y, BOARD.w, BOARD.h)
      if (body) g.drawImage(body, BOARD.x, BOARD.y, BOARD.w, BOARD.h)

      for (const bowl of BOWLS) {
        for (let i = 0; i < stock[bowl.kind]; i++) {
          const [x, y, rot] = inBowl(bowl, i)
          drawBit(g, { kind: bowl.kind, rot }, x, y)
        }
      }
      for (const b of bits) drawBit(g, b, b.x, b.y, 1 + b.settle * 0.25)

      const full = clamp(1 - used / ICING_TOTAL, 0, 1)
      const stir = held.type === 'none' && idle > 5 ? Math.sin(t * 1.6) * 0.03 : 0
      drawBag(g, bagX, bagY, bagTilt + stir, full, squeeze)
      if (held.type === 'bit') {
        g.fillStyle = 'rgba(40,20,12,0.16)'
        g.beginPath()
        g.ellipse(held.x + 6, held.y + 22, 13, 7, 0, 0, TAU)
        g.fill()
        drawBit(g, held.bit, held.x, held.y, 1.25)
      }
    },
    down(p: Pointer) {
      idle = 0
      if (held.type !== 'none') return
      // Something already lying on the board or pressed on: take it up again.
      for (let i = bits.length - 1; i >= 0; i--) {
        const b = bits[i]!
        if (Math.hypot(p.x - b.x, p.y - b.y) < 28) {
          bits.splice(i, 1)
          stamp++
          held = { type: 'bit', id: p.id, bit: b, x: b.x, y: b.y, moved: 20, fromBowl: false }
          snd.pat()
          return
        }
      }
      // A bowl: one almond, raisin or pearl comes up in the fingers.
      for (const bowl of BOWLS) {
        if (Math.hypot(p.x - bowl.x, p.y - bowl.y) < BOWL_R + 26) {
          if (stock[bowl.kind] <= 0) {
            snd.wood(0.6)
            return
          }
          stock[bowl.kind]--
          const [x, y, rot] = inBowl(bowl, stock[bowl.kind])
          held = { type: 'bit', id: p.id, bit: { kind: bowl.kind, x, y, rot, settle: 0, on: -1 }, x, y, moved: 0, fromBowl: true }
          snd.pat()
          return
        }
      }
      // A biscuit: the bag comes to the finger and the icing starts.
      const on = biscuitAt(p.x, p.y)
      if (on >= 0) {
        held = { type: 'pipe', id: p.id, on, x: p.x, y: p.y, px: p.x, py: p.y, ppx: p.x, ppy: p.y, w: 8, run: 0 }
        if (used < ICING_TOTAL) {
          dot(on, p.x, p.y, 5.5)
          iced[on] = true
          used += 12
          snd.squeeze()
        } else {
          snd.cloth()
        }
        return
      }
      world.quiet(p.x, p.y)
    },
    move(p: Pointer) {
      if (held.type === 'bit' && held.id === p.id) {
        held.moved += Math.abs(p.dx) + Math.abs(p.dy)
        return
      }
      if (held.type !== 'pipe' || held.id !== p.id) return
      const h = held
      h.x = p.x
      h.y = p.y
      const d = Math.hypot(p.x - h.px, p.y - h.py)
      if (d < 3) return
      const on = biscuitAt(p.x, p.y)
      if (on !== h.on) {
        // Off the edge: the line ends there, and begins again on the next biscuit.
        h.on = on
        h.px = p.x
        h.py = p.y
        h.ppx = p.x
        h.ppy = p.y
        if (on >= 0 && used < ICING_TOTAL) {
          dot(on, p.x, p.y, 5)
          iced[on] = true
        }
        return
      }
      if (on < 0 || used >= ICING_TOTAL) {
        h.px = p.x
        h.py = p.y
        return
      }
      // Slow hand, thick line; quick hand, thin line.
      const speed = Math.hypot(p.vx, p.vy)
      h.w = damp(h.w, clamp(10.5 - speed * 0.006, 5.5, 10.5), 12, 1 / 60)
      pipe(h, p.x, p.y, h.w)
      h.ppx = h.px
      h.ppy = h.py
      h.px = p.x
      h.py = p.y
      used += d
      h.run += d
      if (h.run > 90) {
        h.run = 0
        snd.squeeze()
      }
    },
    up(p: Pointer) {
      if (held.type === 'pipe' && held.id === p.id) {
        // The line ends in a small round bead.
        if (held.on >= 0 && used < ICING_TOTAL) dot(held.on, held.px, held.py, held.w * 0.56)
        held = { type: 'none' }
        return
      }
      if (held.type !== 'bit' || held.id !== p.id) return
      const h = held
      held = { type: 'none' }
      const bowl = BOWLS.find((b) => b.kind === h.bit.kind)!
      const overBowl = Math.hypot(h.x - bowl.x, h.y - bowl.y) < BOWL_R + 20
      if (overBowl && h.moved >= 16) {
        // Back where it came from.
        stock[h.bit.kind]++
        snd.pat()
        return
      }
      const b = h.bit
      if (overBowl) {
        // A plain touch on a bowl: it goes to a free place on a biscuit.
        const target = biscuits[(bits.length + (b.kind === 'almond' ? 0 : b.kind === 'raisin' ? 1 : 2)) % biscuits.length]!
        const a = bits.length * 2.39
        b.x = target.x + Math.cos(a) * 40
        b.y = target.y + 20 + Math.sin(a) * 36
      } else {
        b.x = h.x
        b.y = h.y
      }
      b.on = biscuitAt(b.x, b.y)
      b.settle = 1
      bits.push(b)
      stamp++
      if (b.on >= 0) snd.pat()
      else snd.wood(0.4)
    },
  }
}
