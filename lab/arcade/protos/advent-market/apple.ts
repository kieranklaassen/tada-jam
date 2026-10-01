// The apple-candle table: a bowl of red apples, a corer, a tin of small
// beeswax candles, a little heap of green. Take an apple to the board, core it
// with a twist of the finger, stand a candle in it, and tuck a sprig beside.
// These are the holders the candles stand in on the advent spiral.

import { damp, ease, lerp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import { DYE, apple, brush, candlelit, drawSnow, duskWindow, flame, flicker, garland, glow, grain, lazure, makeSnow, makeSprite, mulberry, planks, put, rgba, sprig } from './art.ts'
import type { G, Sprite } from './art.ts'
import { lanternBody } from './candle.ts'
import type { Made, Scene, World } from './shared.ts'

const TABLE_Y = 250
const BOWL = { x: 262, y: 452, r: 118 }
const BOARD = { x: 600, y: 610 }
const R = 72
const TIN = { x: 944, y: 470 }
const GREEN = { x: 1010, y: 664 }
const SHELF = { x: 470, y: 372, pitch: 118 }
const REST = { x: 800, y: 648 }
const COUNT = 4
// Radians of finger travel round the apple that it takes to core it.
const TURNS = 9.5

interface Holder {
  x: number
  y: number
  // 0 whole .. 1 cored.
  core: number
  cored: boolean
  candle: boolean
  green: boolean
  tone: number
  settle: number
  // Hopping from one place to another.
  fx: number
  fy: number
  tx: number
  ty: number
  t: number
}

// A short beeswax candle standing with its foot on (x, y).
function stub(g: G, x: number, y: number, s: number): void {
  const grad = g.createLinearGradient(x - 11 * s, 0, x + 11 * s, 0)
  grad.addColorStop(0, '#d79a36')
  grad.addColorStop(0.32, '#f6cf72')
  grad.addColorStop(1, '#b77a24')
  g.fillStyle = grad
  g.beginPath()
  g.moveTo(x - 11 * s, y)
  g.lineTo(x - 10 * s, y - 84 * s)
  g.quadraticCurveTo(x, y - 94 * s, x + 10 * s, y - 84 * s)
  g.lineTo(x + 11 * s, y)
  g.closePath()
  g.fill()
  g.strokeStyle = '#efe2c2'
  g.lineWidth = 2 * s
  g.beginPath()
  g.moveTo(x, y - 88 * s)
  g.lineTo(x, y - 100 * s)
  g.stroke()
}

export function createAppleTable(world: World): Scene {
  const { stage, snd } = world
  let backdrop: Sprite | null = null
  let twig: Sprite | null = null
  const snow = makeSnow(74, 26, 220, 190, 18, mulberry(27))

  let bowl = COUNT
  let tin = COUNT
  let green = COUNT
  let cur: Holder | null = null
  let done: Holder[] = []
  type Held = { type: 'none' } | { type: 'twist'; id: number; last: number; moved: number } | { type: 'candle' | 'green'; id: number; x: number; y: number; moved: number }
  let held: Held = { type: 'none' }
  // The corer: its turn, and where it is (0 at rest .. 1 standing in the apple).
  let turn = 0
  let over = 0
  let lift = 0
  let crumbs: { x: number; y: number }[] = []
  let idle = 0

  const fresh = (): void => {
    bowl = COUNT
    tin = COUNT
    green = COUNT
    cur = null
    done = []
    held = { type: 'none' }
    crumbs = []
    over = 0
  }

  // The apple with whatever is in it, standing on (x, y). `bare` leaves the
  // small candle out, for when a dipped candle is to stand there instead.
  const drawHolder = (g: G, h: { core: number; cored: boolean; candle: boolean; green: boolean; tone: number }, x: number, y: number, s: number, time: number, lit: number, bare = false): void => {
    const r = R * s
    if (h.green && twig) {
      g.save()
      g.translate(x + r * 0.12, y - r * 1.5)
      g.rotate(-0.5)
      g.scale(s, s)
      put(g, twig, -8, -30)
      g.restore()
    }
    apple(g, x, y, r, h.tone)
    // The stalk, until it is cored away.
    if (!h.cored && h.core < 0.2) {
      g.strokeStyle = '#5a3a22'
      g.lineWidth = 4 * s
      g.beginPath()
      g.moveTo(x, y - r * 1.55)
      g.quadraticCurveTo(x + 4 * s, y - r * 1.8, x + 12 * s, y - r * 1.9)
      g.stroke()
    }
    if (h.cored || h.core > 0.05) {
      g.fillStyle = '#3a1a14'
      g.beginPath()
      g.ellipse(x, y - r * 1.56, r * 0.2, r * 0.07, 0, 0, TAU)
      g.fill()
    }
    if (h.candle && !bare) {
      stub(g, x, y - r * 1.5, s)
      if (lit > 0.02) flame(g, x, y - r * 1.5 - 98 * s, 30 * s * lit, flicker(time, x * 0.01))
      // The lip of the apple in front of the candle's foot.
      g.fillStyle = rgba([176, 52, 44])
      g.beginPath()
      g.ellipse(x, y - r * 1.5, r * 0.22, r * 0.06, 0, 0, Math.PI)
      g.fill()
    }
  }

  const madeFrom = (h: Holder): Made => ({
    kind: 'apple',
    from: 'apple',
    x: h.x,
    y: h.y - R,
    h: R * 2 + (h.candle ? 96 : 0),
    draw(g, x, y, scale, time, lit = 0) {
      drawHolder(g, h, x, y, scale, time, lit)
    },
    bare(g, x, y, scale) {
      drawHolder(g, h, x, y, scale, 0, 0, true)
    },
  })

  const hop = (h: Holder, x: number, y: number): void => {
    h.fx = h.x
    h.fy = h.y
    h.tx = x
    h.ty = y
    h.t = 0
  }

  const paint = (g: G): void => {
    const rng = mulberry(6204)
    lazure(g, 0, 0, W, TABLE_Y + 4, DYE.wall, [[238, 196, 146], [214, 152, 112], [228, 174, 124], [202, 136, 108]], rng, 110)
    duskWindow(g, 74, 26, 220, 190, rng, 0.1)
    planks(g, 56, 218, 256, 16, [170, 118, 72], rng, 1)
    garland(g, 330, 18, 760, 22, 28, rng, 34)
    garland(g, 760, 22, 1190, 12, 28, rng, 34)
    for (const lx of [520, 960]) {
      g.strokeStyle = 'rgba(60,36,24,0.8)'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(lx, 30)
      g.lineTo(lx, 92)
      g.stroke()
      lanternBody(g, lx, 136, 0.9)
    }
    // Apples threaded on a string along the wall.
    g.strokeStyle = 'rgba(90,60,40,0.7)'
    g.lineWidth = 1.5
    g.beginPath()
    g.moveTo(560, 96)
    g.quadraticCurveTo(740, 150, 920, 96)
    g.stroke()
    for (let i = 0; i < 5; i++) {
      const t = (i + 0.5) / 5
      apple(g, 560 + 360 * t, 96 + Math.sin(t * Math.PI) * 27 + 34, 17, 0.9 + (i % 2) * 0.12)
    }

    planks(g, 0, TABLE_Y, W, H - TABLE_Y, [174, 120, 72], rng, 6)
    const edge = g.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 24)
    edge.addColorStop(0, 'rgba(50,24,12,0.4)')
    edge.addColorStop(1, 'rgba(50,24,12,0)')
    g.fillStyle = edge
    g.fillRect(0, TABLE_Y, W, 24)
    // A strip of linen along the back, where finished holders stand.
    g.fillStyle = 'rgba(226,206,172,0.9)'
    g.beginPath()
    g.moveTo(402, 340)
    g.lineTo(886, 334)
    g.lineTo(896, 402)
    g.lineTo(392, 408)
    g.closePath()
    g.fill()
    g.save()
    g.clip()
    brush(g, 390, 330, 510, 80, rng, 30, 0.02, 0.6, 80)
    g.restore()
    // The bowl of apples (the apples themselves are drawn live).
    g.fillStyle = 'rgba(40,20,12,0.28)'
    g.beginPath()
    g.ellipse(BOWL.x + 6, BOWL.y + 20, BOWL.r + 14, BOWL.r * 0.84, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#9a6a3c'
    g.beginPath()
    g.ellipse(BOWL.x, BOWL.y, BOWL.r + 12, BOWL.r * 0.84, 0, 0, TAU)
    g.fill()
    const inside = g.createRadialGradient(BOWL.x - 20, BOWL.y - 24, 10, BOWL.x, BOWL.y, BOWL.r)
    inside.addColorStop(0, '#c99a62')
    inside.addColorStop(1, '#86562e')
    g.fillStyle = inside
    g.beginPath()
    g.ellipse(BOWL.x, BOWL.y, BOWL.r, BOWL.r * 0.72, 0, 0, TAU)
    g.fill()
    // The cutting board.
    g.fillStyle = 'rgba(40,20,12,0.25)'
    g.beginPath()
    g.roundRect(BOARD.x - 174, BOARD.y - 74, 364, 174, 20)
    g.fill()
    g.save()
    g.beginPath()
    g.roundRect(BOARD.x - 180, BOARD.y - 84, 364, 174, 20)
    g.clip()
    planks(g, BOARD.x - 180, BOARD.y - 84, 364, 174, [216, 176, 120], rng, 3)
    g.restore()
    // The candle tin.
    g.fillStyle = 'rgba(40,20,12,0.25)'
    g.beginPath()
    g.ellipse(TIN.x + 6, TIN.y + 12, 96, 26, 0, 0, TAU)
    g.fill()
    // A bed of sacking for the greens.
    g.fillStyle = '#c9b089'
    g.beginPath()
    g.ellipse(GREEN.x, GREEN.y, 124, 62, 0, 0, TAU)
    g.fill()
    g.save()
    g.clip()
    brush(g, GREEN.x - 130, GREEN.y - 70, 260, 140, rng, 40, 0.6, 0.7, 50)
    g.restore()

    candlelit(
      g,
      W,
      H,
      [
        { x: BOARD.x, y: BOARD.y - 60, r: 520 },
        { x: 520, y: 136, r: 300 },
        { x: 960, y: 136, r: 300 },
        { x: 230, y: 470, r: 340, lift: 0.9 },
        { x: 990, y: 560, r: 360, lift: 0.9 },
      ],
      'rgba(58,28,46,0.44)',
      0.1,
    )
    grain(g, 0, 0, W, H, 2400, rng, 0.03, 0.03)
  }

  // The corer: a steel tube on a wooden handle, drawn upright at (x, y) where
  // y is the mouth of the tube. `angle` turns the handle.
  const drawCorer = (g: G, x: number, y: number, angle: number, tilt: number): void => {
    g.save()
    g.translate(x, y)
    g.rotate(tilt)
    const steel = g.createLinearGradient(-9, 0, 9, 0)
    steel.addColorStop(0, '#8e8a86')
    steel.addColorStop(0.4, '#d9d6d0')
    steel.addColorStop(1, '#77736f')
    g.fillStyle = steel
    g.fillRect(-9, -112, 18, 112)
    g.fillStyle = '#4e4a48'
    g.beginPath()
    g.ellipse(0, 0, 9, 3, 0, 0, TAU)
    g.fill()
    // The handle swings round as it is twisted.
    const half = 46 * Math.abs(Math.cos(angle)) + 13
    g.fillStyle = '#8a5a30'
    g.beginPath()
    g.roundRect(-half, -136, half * 2, 26, 12)
    g.fill()
    g.fillStyle = 'rgba(255,226,170,0.3)'
    g.beginPath()
    g.roundRect(-half + 4, -133, half * 2 - 8, 7, 4)
    g.fill()
    g.restore()
  }

  const onApple = (x: number, y: number): boolean => cur !== null && cur.t >= 1 && Math.abs(x - cur.x) < R + 46 && y > cur.y - R * 2 - 150 && y < cur.y + 40

  const finished = (h: Holder): boolean => h.cored && h.candle

  return {
    enter() {
      if (!backdrop) {
        backdrop = makeSprite(W, H, world.bg, paint)
        twig = makeSprite(80, 60, world.dpr, (g) => {
          const rng = mulberry(5)
          sprig(g, 8, 30, 58, 0.25, rng, 1.05, true)
          sprig(g, 8, 30, 48, -0.3, rng, 0.9, false)
        })
      }
      idle = 0
      // Anything still in the hand when the child stepped away is back in its place.
      if (held.type === 'candle') tin++
      else if (held.type === 'green') green++
      held = { type: 'none' }
    },
    reset: fresh,
    made(): Made[] {
      const all = cur && finished(cur) ? [...done, cur] : done
      return all.map(madeFrom)
    },
    update(dt) {
      idle += dt
      for (const h of cur ? [...done, cur] : done) {
        h.settle = damp(h.settle, 0, 7, dt)
        if (h.t < 1) {
          h.t = Math.min(1, h.t + dt / 0.42)
          const k = ease.inOutCubic(h.t)
          h.x = lerp(h.fx, h.tx, k)
          h.y = lerp(h.fy, h.ty, k) - Math.sin(k * Math.PI) * 70
          if (h.t >= 1) {
            h.settle = 1
            snd.wood(0.6)
          }
        }
      }
      // The corer stands over an apple that still wants coring.
      const wants = cur !== null && cur.t >= 1 && !cur.cored
      over = damp(over, wants ? 1 : 0, 6, dt)
      lift = damp(lift, 0, 5, dt)
      if (held.type === 'twist') {
        const p = stage.pointers.get(held.id)
        const h = cur
        if (!p || !p.down || !h || h.cored) held = { type: 'none' }
        else {
          const cx = h.x
          const cy = h.y - R
          const d = Math.hypot(p.x - cx, p.y - cy)
          if (d > 10) {
            const ang = Math.atan2(p.y - cy, p.x - cx)
            let da = ang - held.last
            while (da > Math.PI) da -= TAU
            while (da < -Math.PI) da += TAU
            held.last = ang
            const before = h.core
            h.core = Math.min(1, h.core + Math.abs(da) / TURNS)
            turn += da
            held.moved += Math.abs(da)
            // The corer bites through the apple a little at a time.
            if (Math.floor(h.core * 9) > Math.floor(before * 9)) {
              stage.sfx.noise({ dur: 0.06, freq: 1700 + Math.random() * 500, vol: 0.05, q: 1.5 })
              stage.fx.burst(h.x, h.y - R * 1.56, { count: 2, color: ['#f3e6c0', '#e8d6a8'], speed: 60, life: 0.5, size: 3, gravity: 300, angle: -Math.PI / 2, spread: 1.6 })
            }
          }
        }
      } else if (held.type === 'candle' || held.type === 'green') {
        const p = stage.pointers.get(held.id)
        if (p && p.down) {
          held.x = damp(held.x, p.x, 26, dt)
          held.y = damp(held.y, p.y - 24, 26, dt)
        }
      }
      const h = cur
      if (h && !h.cored && h.core >= 1) {
        // Through: the corer lifts out with the core in it.
        h.cored = true
        h.settle = 1
        lift = 1
        crumbs.push({ x: REST.x - 70 + crumbs.length * 22, y: REST.y + 34 })
        snd.bloop(0.5)
        stage.after(0.25, () => snd.wood(0.5))
        if (held.type === 'twist') held = { type: 'none' }
      }
    },
    draw(g) {
      const t = stage.time
      if (backdrop) put(g, backdrop, 0, 0)
      drawSnow(g, snow, t)
      for (const [lx, seed] of [[520, 14], [960, 15]] as const) {
        const f = flicker(t, seed)
        glow(g, world.halo, lx, 136, 90 + f * 10, 0.9)
        flame(g, lx, 144, 20, f)
      }

      // Finished holders at the back.
      for (const h of done) drawHolder(g, h, h.x, h.y, 0.62 * (1 + h.settle * 0.05), t, 0)

      // The apples still in the bowl.
      const spots = [[-52, -4], [50, -10], [-6, 34], [0, -44]] as const
      for (let i = 0; i < bowl; i++) {
        const sp = spots[i]!
        const stir = i === bowl - 1 && cur === null && idle > 5 ? Math.max(0, Math.sin(t * 1.5)) * 4 : 0
        apple(g, BOWL.x + sp[0], BOWL.y + sp[1] + 40 - stir, 46, 0.92 + (i % 3) * 0.08)
        g.strokeStyle = '#5a3a22'
        g.lineWidth = 3
        g.beginPath()
        g.moveTo(BOWL.x + sp[0], BOWL.y + sp[1] + 40 - stir - 71)
        g.lineTo(BOWL.x + sp[0] + 6, BOWL.y + sp[1] + 40 - stir - 84)
        g.stroke()
      }

      // The tin of candles.
      g.fillStyle = '#6f6a62'
      g.beginPath()
      g.ellipse(TIN.x, TIN.y - 4, 84, 20, 0, 0, TAU)
      g.fill()
      for (let i = 0; i < tin; i++) stub(g, TIN.x - 54 + i * 36, TIN.y - 2 - (i % 2) * 4, 1)
      const front = g.createLinearGradient(TIN.x - 88, 0, TIN.x + 88, 0)
      front.addColorStop(0, '#8e8880')
      front.addColorStop(0.3, '#b8b2a8')
      front.addColorStop(1, '#6a655e')
      g.fillStyle = front
      g.beginPath()
      g.moveTo(TIN.x - 86, TIN.y - 4)
      g.lineTo(TIN.x - 80, TIN.y + 26)
      g.quadraticCurveTo(TIN.x, TIN.y + 46, TIN.x + 80, TIN.y + 26)
      g.lineTo(TIN.x + 86, TIN.y - 4)
      g.quadraticCurveTo(TIN.x, TIN.y + 22, TIN.x - 86, TIN.y - 4)
      g.fill()

      // The greens.
      if (twig) {
        for (let i = 0; i < green; i++) {
          g.save()
          g.translate(GREEN.x - 60 + i * 34, GREEN.y + (i % 2) * 14)
          g.rotate(-0.4 + i * 0.5)
          g.scale(1.25, 1.25)
          put(g, twig, -8, -30)
          g.restore()
        }
      }

      // Cores that have come out.
      for (const c of crumbs) {
        g.fillStyle = '#ead9a8'
        g.beginPath()
        g.roundRect(c.x - 7, c.y - 26, 14, 30, 5)
        g.fill()
        g.fillStyle = '#5a3a22'
        g.beginPath()
        g.ellipse(c.x - 2, c.y - 12, 2, 3.5, 0, 0, TAU)
        g.ellipse(c.x + 3, c.y - 8, 2, 3.5, 0.3, 0, TAU)
        g.fill()
        g.fillStyle = rgba([176, 52, 44])
        g.fillRect(c.x - 7, c.y - 28, 14, 5)
      }

      const h = cur
      if (h) {
        g.fillStyle = 'rgba(40,20,12,0.25)'
        g.beginPath()
        g.ellipse(h.x + 6, h.y + 4, R * 0.9, 14, 0, 0, TAU)
        g.fill()
        const squash = 1 + h.settle * 0.05
        g.save()
        g.translate(h.x, h.y)
        g.scale(1 + h.settle * 0.04, 1 / squash)
        drawHolder(g, h, 0, 0, 1, t, 0)
        g.restore()
      }

      // The corer: lying by the board, or standing in the apple.
      const cx = lerp(REST.x, h ? h.x : BOARD.x, over)
      const top = h ? h.y - R * 1.56 : BOARD.y - R * 1.56
      const deep = h ? h.core * 84 : 0
      const cy = lerp(REST.y, top + deep - lift * 150, over)
      const tilt = lerp(1.2, 0, over)
      if (h && over > 0.5 && !h.cored) {
        // The tube goes down into the apple: only what is above the skin shows.
        g.save()
        g.beginPath()
        g.rect(cx - 80, 0, 160, top)
        g.clip()
        drawCorer(g, cx, cy, turn, tilt)
        g.restore()
      } else {
        drawCorer(g, cx, cy, turn, tilt)
      }

      if (held.type === 'candle') stub(g, held.x, held.y + 46, 1.05)
      else if (held.type === 'green' && twig) {
        g.save()
        g.translate(held.x, held.y)
        g.rotate(-0.4)
        g.scale(1.3, 1.3)
        put(g, twig, -8, -30)
        g.restore()
      }
    },
    down(p: Pointer) {
      idle = 0
      if (held.type !== 'none') return
      const h = cur
      // Twisting the corer into the apple.
      if (h && !h.cored && onApple(p.x, p.y)) {
        held = { type: 'twist', id: p.id, last: Math.atan2(p.y - (h.y - R), p.x - h.x), moved: 0 }
        // Even a plain touch gives it a small turn.
        h.core = Math.min(1, h.core + 0.07)
        turn += 0.7
        h.settle = 0.5
        stage.sfx.noise({ dur: 0.06, freq: 1800, vol: 0.05, q: 1.5 })
        return
      }
      // The bowl: the next apple comes to the board.
      if (Math.hypot(p.x - BOWL.x, (p.y - BOWL.y) * 1.2) < BOWL.r + 40) {
        if (bowl <= 0 || (h && !finished(h))) {
          if (h) h.settle = 1
          snd.wood(0.6)
          return
        }
        if (h) {
          hop(h, SHELF.x + done.length * SHELF.pitch, SHELF.y)
          done.push(h)
        }
        bowl--
        const spots = [[-52, -4], [50, -10], [-6, 34], [0, -44]] as const
        const sp = spots[bowl]!
        cur = { x: BOWL.x + sp[0], y: BOWL.y + sp[1] + 40, core: 0, cored: false, candle: false, green: false, tone: 0.92 + (bowl % 3) * 0.08, settle: 0, fx: 0, fy: 0, tx: 0, ty: 0, t: 1 }
        hop(cur, BOARD.x, BOARD.y)
        snd.pat()
        return
      }
      // A candle from the tin.
      if (tin > 0 && Math.abs(p.x - TIN.x) < 110 && p.y > TIN.y - 130 && p.y < TIN.y + 60) {
        tin--
        held = { type: 'candle', id: p.id, x: p.x, y: p.y - 24, moved: 0 }
        snd.wood(0.5)
        return
      }
      // A sprig of green.
      if (green > 0 && Math.hypot(p.x - GREEN.x, (p.y - GREEN.y) * 1.5) < 150) {
        green--
        held = { type: 'green', id: p.id, x: p.x, y: p.y - 24, moved: 0 }
        snd.fir()
        return
      }
      if (h && onApple(p.x, p.y)) {
        h.settle = 1
        snd.pat()
        return
      }
      world.quiet(p.x, p.y)
    },
    move(p: Pointer) {
      if ((held.type === 'candle' || held.type === 'green') && held.id === p.id) held.moved += Math.abs(p.dx) + Math.abs(p.dy)
    },
    up(p: Pointer) {
      if (held.type === 'twist' && held.id === p.id) {
        held = { type: 'none' }
        return
      }
      if ((held.type !== 'candle' && held.type !== 'green') || held.id !== p.id) return
      const was = held
      held = { type: 'none' }
      const h = cur
      // Let go over the apple (or with a plain touch) and it goes in.
      const near = h !== null && h.t >= 1 && (was.moved < 16 || (Math.abs(was.x - h.x) < R + 70 && was.y > h.y - R * 2 - 170 && was.y < h.y + 60))
      if (was.type === 'candle') {
        if (h && near && h.cored && !h.candle) {
          h.candle = true
          h.settle = 1
          snd.wood(0.7)
        } else {
          tin++
          snd.wood(0.4)
        }
      } else {
        if (h && near && !h.green) {
          h.green = true
          h.settle = 0.7
          snd.fir()
        } else {
          green++
        }
      }
    },
  }
}

// Whether a made thing is an apple holder with room for a dipped candle.
export function holderOf(items: readonly Made[]): Made | null {
  for (const m of items) if (m.kind === 'apple' && m.bare) return m
  return null
}
