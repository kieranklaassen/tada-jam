// Home: the windowsill where the basket is unpacked. Each touch on the basket
// lifts the next thing out to its place: the star into the window, candles
// along the sill, the wreath on the table, gingerbread on the plate. Then the
// empty basket goes back on its hook, and the room is quiet for as long as the
// child likes. Taking the basket down from the hook begins a new visit.

import { damp, ease, lerp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import { BASKET, DYE, brush, candlelit, drawSnow, duskWindow, flame, flicker, garland, glow, grain, lazure, makeSnow, makeSprite, mulberry, planks, put, rgba, shade } from './art.ts'
import type { G, Sprite } from './art.ts'
import { lanternBody } from './candle.ts'
import type { Made, Scene, World } from './shared.ts'

const WIN = { x: 300, y: 44, w: 580, h: 380 }
const SILL_Y = 452
const TABLE_Y = 540
const BASKET_TABLE = { x: 150, y: 654 }
const HOOK = { x: 1062, y: 166 }
const BASKET_HUNG = { x: HOOK.x, y: HOOK.y + BASKET.handle * 1.25 - 26 }
const PLATE = { x: 858, y: 690 }
const ORDER = ['star', 'wreath', 'biscuit', 'candle', 'apple', 'crystal'] as const

interface Placed {
  made: Made
  x: number
  y: number
  scale: number
  // 0..1 as it travels from the basket to its place.
  t: number
  fromX: number
  fromY: number
  fromScale: number
  // Candles: whether the child has lit it, and how tall the flame stands.
  lit: boolean
  flame: number
  settle: number
}

function paintHome(g: G): void {
  const rng = mulberry(8812)
  lazure(g, 0, 0, W, TABLE_Y + 6, [206, 150, 112], [[232, 186, 140], [198, 132, 108], [220, 164, 120], [186, 120, 100]], rng, 160)
  grain(g, 0, 0, W, TABLE_Y, 3200, rng, 0.03, 0.04)

  // The window: the last of the afternoon, snow coming down.
  duskWindow(g, WIN.x, WIN.y, WIN.w, WIN.h, rng, 0.3)
  // A thin moon.
  g.fillStyle = 'rgba(255,246,220,0.92)'
  g.beginPath()
  g.arc(WIN.x + WIN.w - 120, WIN.y + 76, 20, -Math.PI * 0.42, Math.PI * 0.62)
  g.arc(WIN.x + WIN.w - 129, WIN.y + 72, 17, Math.PI * 0.5, -Math.PI * 0.3, true)
  g.closePath()
  g.fill()

  // Linen curtains drawn back to either side.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? WIN.x - 74 : WIN.x + WIN.w - 26
    g.save()
    g.beginPath()
    g.moveTo(x0, WIN.y - 24)
    g.lineTo(x0 + 100, WIN.y - 24)
    g.quadraticCurveTo(x0 + (side < 0 ? 96 : 4), WIN.y + 220, x0 + (side < 0 ? 40 : 60), WIN.y + WIN.h + 4)
    g.lineTo(x0 + (side < 0 ? 0 : 100), WIN.y + WIN.h + 4)
    g.lineTo(x0 + (side < 0 ? 0 : 100), WIN.y - 24)
    g.closePath()
    g.fillStyle = rgba([226, 208, 176])
    g.fill()
    g.clip()
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = i % 2 === 0 ? 'rgba(120,84,60,0.2)' : 'rgba(255,244,220,0.3)'
      g.lineWidth = 7
      g.beginPath()
      g.moveTo(x0 + 8 + i * 16, WIN.y - 24)
      g.quadraticCurveTo(x0 + 14 + i * 15, WIN.y + 200, x0 + (side < 0 ? 4 + i * 8 : 52 + i * 8), WIN.y + WIN.h)
      g.stroke()
    }
    brush(g, x0, WIN.y - 24, 100, WIN.h + 30, rng, 30, Math.PI / 2, 0.7, 50)
    g.restore()
  }
  // The curtain pole and a small swag of fir on it.
  g.strokeStyle = rgba(DYE.woodDark)
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(WIN.x - 96, WIN.y - 24)
  g.lineTo(WIN.x + WIN.w + 96, WIN.y - 24)
  g.stroke()
  garland(g, WIN.x + 60, WIN.y - 26, WIN.x + WIN.w - 60, WIN.y - 26, 14, rng, 26, 0.95)

  // The sill: a wide board.
  planks(g, WIN.x - 60, SILL_Y - 8, WIN.w + 120, 34, [176, 122, 74], rng, 1)
  g.fillStyle = 'rgba(40,20,12,0.3)'
  g.fillRect(WIN.x - 54, SILL_Y + 26, WIN.w + 108, 9)
  g.fillStyle = 'rgba(255,226,170,0.25)'
  g.fillRect(WIN.x - 60, SILL_Y - 8, WIN.w + 120, 4)

  // The peg the basket hangs from.
  g.fillStyle = rgba(shade(DYE.wood, 0.9))
  g.beginPath()
  g.roundRect(HOOK.x - 40, HOOK.y - 22, 80, 30, 7)
  g.fill()
  g.fillStyle = rgba(DYE.woodDark)
  g.beginPath()
  g.arc(HOOK.x, HOOK.y - 4, 9, 0, TAU)
  g.fill()
  g.fillStyle = rgba(DYE.woodLight)
  g.beginPath()
  g.arc(HOOK.x - 1.5, HOOK.y - 5.5, 6.5, 0, TAU)
  g.fill()

  // The table under the window.
  planks(g, 0, TABLE_Y, W, H - TABLE_Y, [170, 116, 70], rng, 4)
  const edge = g.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 24)
  edge.addColorStop(0, 'rgba(50,24,12,0.42)')
  edge.addColorStop(1, 'rgba(50,24,12,0)')
  g.fillStyle = edge
  g.fillRect(0, TABLE_Y, W, 24)
  // A linen runner down the middle.
  g.fillStyle = 'rgba(226,206,172,0.9)'
  g.beginPath()
  g.moveTo(292, TABLE_Y + 28)
  g.lineTo(700, TABLE_Y + 28)
  g.lineTo(726, H)
  g.lineTo(262, H)
  g.closePath()
  g.fill()
  g.save()
  g.clip()
  brush(g, 250, TABLE_Y, 500, 300, rng, 70, 0.02, 0.7, 90)
  g.restore()
  // The plate for the gingerbread.
  g.fillStyle = 'rgba(40,20,12,0.25)'
  g.beginPath()
  g.ellipse(PLATE.x + 4, PLATE.y + 8, 134, 60, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#efe6d2'
  g.beginPath()
  g.ellipse(PLATE.x, PLATE.y, 130, 58, 0, 0, TAU)
  g.fill()
  g.strokeStyle = rgba(DYE.dusk, 0.8)
  g.lineWidth = 4
  g.beginPath()
  g.ellipse(PLATE.x, PLATE.y, 120, 52, 0, 0, TAU)
  g.stroke()
  g.fillStyle = 'rgba(190,176,150,0.4)'
  g.beginPath()
  g.ellipse(PLATE.x, PLATE.y + 2, 92, 38, 0, 0, TAU)
  g.fill()

  candlelit(
    g,
    W,
    H,
    [
      { x: WIN.x + WIN.w / 2, y: WIN.y + 190, r: 430, lift: 0.8 },
      { x: 240, y: 420, r: 330 },
      { x: 590, y: 690, r: 460, lift: 0.7 },
      { x: 960, y: 560, r: 330, lift: 0.6 },
    ],
    'rgba(46,24,52,0.52)',
    0.12,
  )
  grain(g, 0, 0, W, H, 2400, rng, 0.03, 0.03)
}

export function createHome(world: World): Scene {
  const { stage, snd } = world
  let room: Sprite | null = null
  const snow = makeSnow(WIN.x, WIN.y, WIN.w, WIN.h, 44, mulberry(71))
  let queue: Made[] = []
  let placed: Placed[] = []
  // The basket: on the table, on its way to the hook, hanging, or in hand.
  let where: 'table' | 'rising' | 'hung' | 'hand' = 'table'
  let rise = 0
  let bx = BASKET_TABLE.x
  let by = BASKET_TABLE.y
  let swing = 0
  let swingV = 0
  let bounce = 0
  let bounceV = 0
  let hand = -1
  let handDx = 0
  let handDy = 0
  let pulled = 0

  const target = (m: Made, counts: Record<string, number>): { x: number; y: number; scale: number } => {
    const i = counts[m.kind] ?? 0
    counts[m.kind] = i + 1
    if (m.kind === 'star') return { x: WIN.x + 150, y: WIN.y + 150, scale: 200 / m.h }
    if (m.kind === 'wreath') return { x: 494, y: 688, scale: 236 / m.h }
    if (m.kind === 'biscuit') {
      const spots = [[-58, -4], [50, -12], [-4, 16]] as const
      const sp = spots[i % 3]!
      return { x: PLATE.x + sp[0], y: PLATE.y + sp[1] - Math.floor(i / 3) * 10, scale: 96 / m.h }
    }
    if (m.kind === 'candle') return { x: WIN.x + 330 + i * 74, y: SILL_Y + 6, scale: 0.72 }
    if (m.kind === 'apple') return { x: WIN.x + 40 + i * 82, y: SILL_Y + 10, scale: 0.48 }
    return { x: WIN.x + 262 - i * 30, y: SILL_Y + 8, scale: 1 }
  }

  const unpack = (): void => {
    const m = queue.shift()
    if (!m) return
    const counts: Record<string, number> = {}
    for (const p of placed) target(p.made, counts)
    const to = target(m, counts)
    const flat = m.kind === 'star' || m.kind === 'wreath' || m.kind === 'biscuit'
    placed.push({ made: m, x: to.x, y: to.y, scale: to.scale, t: 0, fromX: bx, fromY: by - 30, fromScale: flat ? 110 / m.h : m.kind === 'apple' ? 0.36 : 0.56, lit: false, flame: 0, settle: 0 })
    world.visit.basket = world.visit.basket.filter((b) => b !== m)
    bounceV -= 3
    if (m.kind === 'star') snd.paper()
    else if (m.kind === 'wreath') snd.fir()
    else snd.cloth()
  }

  const nearTableBasket = (x: number, y: number): boolean => Math.abs(x - bx) < 118 && y > by - 150 && y < by + 120

  return {
    enter() {
      if (!room) room = makeSprite(W, H, world.bg, paintHome)
      queue = [...world.visit.basket].sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
      placed = []
      where = 'table'
      rise = 0
      bx = BASKET_TABLE.x
      by = BASKET_TABLE.y
      swing = 0
      swingV = 0
      hand = -1
    },
    update(dt) {
      for (const p of placed) {
        if (p.t < 1) {
          p.t = Math.min(1, p.t + dt / 0.62)
          if (p.t >= 1) {
            p.settle = 1
            if (p.made.kind === 'biscuit') snd.clink()
            else if (p.made.kind === 'star') snd.chime(1, 0.6)
            else snd.wood(0.6)
          }
        }
        p.settle = damp(p.settle, 0, 6, dt)
        p.flame = damp(p.flame, p.lit ? 1 : 0, 3.5, dt)
      }
      bounceV += (-130 * bounce - 12 * bounceV) * dt
      bounce += bounceV * dt
      swingV += (-22 * swing - 1.6 * swingV) * dt
      swing += swingV * dt
      if (where === 'rising') {
        rise = Math.min(1, rise + dt / 0.9)
        const k = ease.inOutCubic(rise)
        bx = lerp(BASKET_TABLE.x, BASKET_HUNG.x, k)
        by = lerp(BASKET_TABLE.y, BASKET_HUNG.y, k) - Math.sin(k * Math.PI) * 90
        if (rise >= 1) {
          where = 'hung'
          swingV = 1.4
          snd.wood(0.8)
        }
      } else if (where === 'hand') {
        const p = stage.pointers.get(hand)
        if (p && p.down) {
          bx = damp(bx, p.x + handDx, 22, dt)
          by = damp(by, p.y + handDy, 22, dt)
          pulled = Math.hypot(bx - BASKET_HUNG.x, by - BASKET_HUNG.y)
        }
      } else if (where === 'hung') {
        bx = damp(bx, BASKET_HUNG.x, 9, dt)
        by = damp(by, BASKET_HUNG.y, 9, dt)
      }
    },
    draw(g) {
      const t = stage.time
      if (room) put(g, room, 0, 0)
      drawSnow(g, snow, t, 0, 0.8)

      // A lantern at the end of the sill, always lit.
      const lf = flicker(t, 2)
      glow(g, world.halo, 240, 420, 110 + lf * 10, 0.9)
      flame(g, 240, 430, 20, lf)
      lanternBody(g, 240, 422, 0.9)

      const drawPlaced = (p: Placed): void => {
        const k = ease.inOutCubic(p.t)
        const x = lerp(p.fromX, p.x, k)
        const y = lerp(p.fromY, p.y, k) - Math.sin(k * Math.PI) * 130
        const s = lerp(p.fromScale, p.scale, k) * (1 + p.settle * 0.06)
        if (p.made.kind === 'star' && p.t >= 1) {
          // It hangs in the window on a thread, and the last light comes through.
          g.strokeStyle = 'rgba(240,230,210,0.7)'
          g.lineWidth = 1.2
          g.beginPath()
          g.moveTo(x, WIN.y + 6)
          g.lineTo(x, y - (p.made.h * s) / 2 + 6)
          g.stroke()
        }
        if (p.made.kind === 'candle') {
          // A small brass saucer for it to stand in.
          g.fillStyle = 'rgba(40,20,12,0.25)'
          g.beginPath()
          g.ellipse(x + 3, y + 4, 26 * k + 2, 7, 0, 0, TAU)
          g.fill()
          g.fillStyle = '#b98a3e'
          g.beginPath()
          g.ellipse(x, y + 1, 24, 6.5, 0, 0, TAU)
          g.fill()
          g.fillStyle = 'rgba(255,230,160,0.45)'
          g.beginPath()
          g.ellipse(x - 4, y, 14, 3, 0, 0, TAU)
          g.fill()
          if (p.flame > 0.02) glow(g, world.halo, x, y - p.made.h * s, 120 * p.flame + lf * 8, 0.9 * p.flame)
        }
        if (p.made.kind === 'wreath' && p.flame > 0.02) glow(g, world.halo, x, y - 30, 250 * p.flame, 0.5 * p.flame)
        if (p.made.kind === 'apple' && p.flame > 0.02) glow(g, world.halo, x, y - p.made.h * s, 100 * p.flame + lf * 8, 0.9 * p.flame)
        p.made.draw(g, x, y, s, t, p.made.kind === 'star' ? k : p.flame)
      }
      // The window first, then the sill, then the table; things in flight last.
      const rank = (p: Placed): number => (p.t < 1 ? 9 : p.made.kind === 'star' ? 0 : p.made.kind === 'wreath' || p.made.kind === 'biscuit' ? 2 : 1)
      for (const p of [...placed].sort((a, b) => rank(a) - rank(b))) if (rank(p) < 9) drawPlaced(p)

      // The basket.
      if (where === 'table') {
        g.fillStyle = 'rgba(24,10,8,0.3)'
        g.beginPath()
        g.ellipse(bx + 6, by + BASKET.depth + 4, BASKET.rx * 0.92, 13, 0, 0, TAU)
        g.fill()
      }
      g.save()
      g.translate(bx, by - (where === 'table' ? 0 : BASKET.handle * 1.25 - 26))
      if (where !== 'table') g.rotate(swing * 0.2)
      g.translate(0, where === 'table' ? 0 : BASKET.handle * 1.25 - 26)
      world.basket(g, 0, 0, queue, bounce)
      g.restore()

      for (const p of placed) if (p.t < 1) drawPlaced(p)
    },
    down(p: Pointer) {
      if (where === 'table' && nearTableBasket(p.x, p.y)) {
        if (queue.length > 0) unpack()
        else {
          // Empty: back on its hook.
          where = 'rising'
          rise = 0
          snd.cloth()
        }
        return
      }
      if (where === 'hung' && Math.abs(p.x - bx) < 120 && Math.abs(p.y - (by - 20)) < 150) {
        where = 'hand'
        hand = p.id
        handDx = bx - p.x
        handDy = by - p.y
        pulled = 0
        swingV += 0.8
        snd.cloth()
        return
      }
      // A candle on the sill: a touch lights it, another puts it out.
      for (const c of placed) {
        if ((c.made.kind !== 'candle' && c.made.kind !== 'apple') || c.t < 1) continue
        if (Math.abs(p.x - c.x) < 40 && p.y < c.y + 30 && p.y > c.y - c.made.h * c.scale - 70) {
          c.lit = !c.lit
          if (c.lit) snd.breath()
          else {
            stage.fx.burst(c.x, c.y - c.made.h * c.scale, { count: 4, color: 'rgba(230,226,220,0.5)', speed: 22, life: 1.1, size: 5, gravity: -46, angle: -Math.PI / 2, spread: 0.7, drag: 0.97 })
            snd.cloth()
          }
          return
        }
      }
      for (const c of placed) {
        if (c.t < 1 || c.made.kind === 'candle' || c.made.kind === 'apple') continue
        const half = (c.made.h * c.scale) / 2 + 20
        const cy = c.made.kind === 'star' || c.made.kind === 'wreath' || c.made.kind === 'biscuit' ? c.y : c.y - half
        if (Math.abs(p.x - c.x) < half && Math.abs(p.y - cy) < half) {
          c.settle = 1
          if (c.made.kind === 'star') snd.paper()
          else if (c.made.kind === 'wreath') {
            // Its candles, if it has any, are lit or put out together.
            c.lit = !c.lit
            snd.fir()
            if (c.lit) snd.breath()
          }
          else if (c.made.kind === 'biscuit') snd.clink()
          else snd.chime(3, 0.5)
          return
        }
      }
      world.quiet(p.x, p.y)
    },
    up(p: Pointer) {
      if (where !== 'hand' || p.id !== hand) return
      hand = -1
      if (pulled > 80) {
        // Basket in hand: off to the market again.
        world.again()
      } else {
        where = 'hung'
        swingV += 1.2
        snd.wood(0.6)
      }
    },
  }
}
