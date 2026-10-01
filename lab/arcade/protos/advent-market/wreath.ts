// The wreath-binding stall: a straw ring, a heap of fir sprigs, a spool of
// red ribbon. Lay a sprig on the ring, wind the ribbon over its stem by
// circling a finger there, and work round until the ring is green. Then dress
// it as you like: four candles, cones, dried orange, berries, a bow.

import { clamp, damp, ease, lerp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import { DYE, brush, candlelit, drawSnow, duskWindow, flame, flicker, garland, glow, grain, lazure, makeSnow, makeSprite, mulberry, planks, put, rgba, shade, sprig } from './art.ts'
import type { G, Rng, Sprite } from './art.ts'
import { lanternBody } from './candle.ts'
import type { Made, Scene, World } from './shared.ts'

const TABLE_Y = 286
const RING = { x: 590, y: 528, r: 132, band: 27 }
const PILE = { x: 232, y: 436 }
const SPOOL = { x: 352, y: 704 }
const SPRIGS = 10
const SPRIG = { w: 176, h: 116, ax: 16, ay: 58 }

type DecoKind = 'candle' | 'cone' | 'orange' | 'berry' | 'bow'
const STOCK: Record<DecoKind, { x: number; y: number; pitch: number; count: number }> = {
  candle: { x: 934, y: 418, pitch: 56, count: 4 },
  cone: { x: 930, y: 506, pitch: 56, count: 4 },
  orange: { x: 930, y: 586, pitch: 56, count: 4 },
  berry: { x: 918, y: 668, pitch: 44, count: 4 },
  bow: { x: 1118, y: 664, pitch: 0, count: 1 },
}
const KINDS = Object.keys(STOCK) as DecoKind[]

interface Laid {
  a: number
  variant: number
  wraps: number
  wind: number
  // 1 just laid or just bound, easing to 0: a little spring.
  settle: number
}

interface Deco {
  kind: DecoKind
  // Relative to the ring's centre.
  x: number
  y: number
  rot: number
  settle: number
}

interface Flier {
  draw: (g: G, x: number, y: number, k: number) => void
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  done: () => void
}

function drawDeco(g: G, kind: DecoKind, x: number, y: number, rot: number, s: number, time: number, lit = 0): void {
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  if (kind === 'candle') {
    // A red beeswax candle standing in a small tin cup.
    g.fillStyle = 'rgba(30,14,10,0.25)'
    g.beginPath()
    g.ellipse(2, 3, 15, 6, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#8a6a3a'
    g.beginPath()
    g.ellipse(0, 0, 13, 5.5, 0, 0, TAU)
    g.fill()
    const grad = g.createLinearGradient(-8, 0, 8, 0)
    grad.addColorStop(0, '#a23428')
    grad.addColorStop(0.35, '#cc5240')
    grad.addColorStop(1, '#84261e')
    g.fillStyle = grad
    g.beginPath()
    g.moveTo(-8, 0)
    g.lineTo(-7, -58)
    g.quadraticCurveTo(0, -64, 7, -58)
    g.lineTo(8, 0)
    g.quadraticCurveTo(0, 4, -8, 0)
    g.fill()
    g.strokeStyle = '#efe2c2'
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(0, -60)
    g.lineTo(0, -68)
    g.stroke()
    if (lit > 0.02) flame(g, 0, -66, 20 * lit, flicker(time, x * 0.1))
  } else if (kind === 'cone') {
    g.rotate(rot)
    g.fillStyle = '#6e4a30'
    g.beginPath()
    g.ellipse(0, 0, 14, 19, 0, 0, TAU)
    g.fill()
    g.strokeStyle = 'rgba(226,180,130,0.55)'
    g.lineWidth = 2
    for (let k = -3; k <= 3; k++) {
      g.beginPath()
      g.arc(0, k * 5.2 + 6, 12 - Math.abs(k) * 1.4, Math.PI * 1.15, Math.PI * 1.85)
      g.stroke()
    }
  } else if (kind === 'orange') {
    g.rotate(rot)
    g.fillStyle = '#c9721f'
    g.beginPath()
    g.arc(0, 0, 18, 0, TAU)
    g.fill()
    g.fillStyle = '#f0a842'
    g.beginPath()
    g.arc(0, 0, 14.5, 0, TAU)
    g.fill()
    g.strokeStyle = 'rgba(255,236,190,0.75)'
    g.lineWidth = 1.6
    for (let k = 0; k < 8; k++) {
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(Math.cos((k / 8) * TAU) * 14, Math.sin((k / 8) * TAU) * 14)
      g.stroke()
    }
    g.fillStyle = 'rgba(255,240,200,0.8)'
    g.beginPath()
    g.arc(0, 0, 2.6, 0, TAU)
    g.fill()
  } else if (kind === 'berry') {
    g.rotate(rot)
    g.fillStyle = '#4e6a3c'
    g.beginPath()
    g.ellipse(-10, -6, 11, 5, -0.6, 0, TAU)
    g.fill()
    for (const [bx, by] of [[0, 0], [10, -6], [7, 8], [-4, 9]] as const) {
      g.fillStyle = '#b02f2a'
      g.beginPath()
      g.arc(bx, by, 6.5, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(255,200,180,0.6)'
      g.beginPath()
      g.arc(bx - 2, by - 2, 1.8, 0, TAU)
      g.fill()
    }
  } else {
    g.rotate(rot)
    g.fillStyle = rgba(DYE.madder)
    g.beginPath()
    g.moveTo(-4, 2)
    g.lineTo(-20, 44)
    g.lineTo(-8, 36)
    g.lineTo(-2, 6)
    g.moveTo(4, 2)
    g.lineTo(20, 44)
    g.lineTo(8, 36)
    g.lineTo(2, 6)
    g.fill()
    g.beginPath()
    g.ellipse(-19, 0, 20, 12, 0.35, 0, TAU)
    g.ellipse(19, 0, 20, 12, -0.35, 0, TAU)
    g.fill()
    g.fillStyle = rgba(shade(DYE.madder, 0.72))
    g.beginPath()
    g.ellipse(-17, 0, 9, 5, 0.35, 0, TAU)
    g.ellipse(17, 0, 9, 5, -0.35, 0, TAU)
    g.fill()
    g.beginPath()
    g.arc(0, 0, 8, 0, TAU)
    g.fill()
  }
  g.restore()
}

function paintStraw(g: G, rng: Rng): void {
  g.strokeStyle = '#cda85c'
  g.lineWidth = RING.band * 2
  g.beginPath()
  g.arc(0, 0, RING.r, 0, TAU)
  g.stroke()
  // Strands of straw running round, and the twine that binds them.
  for (let i = 0; i < 150; i++) {
    const a = rng() * TAU
    const r = RING.r + (rng() - 0.5) * RING.band * 1.8
    g.strokeStyle = rng() < 0.5 ? `rgba(240,214,150,${0.4 + rng() * 0.3})` : `rgba(150,110,50,${0.3 + rng() * 0.3})`
    g.lineWidth = 1.2 + rng() * 1.6
    g.beginPath()
    g.arc(0, 0, r, a, a + 0.18 + rng() * 0.3)
    g.stroke()
  }
  g.strokeStyle = 'rgba(120,84,40,0.5)'
  g.lineWidth = 1.6
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * TAU
    g.beginPath()
    g.moveTo(Math.cos(a) * (RING.r - RING.band), Math.sin(a) * (RING.r - RING.band))
    g.lineTo(Math.cos(a + 0.08) * (RING.r + RING.band), Math.sin(a + 0.08) * (RING.r + RING.band))
    g.stroke()
  }
  // Round, not flat: shade toward the inside and outside edges.
  for (const [r, w, col] of [[RING.r - RING.band + 4, 9, 'rgba(90,56,24,0.3)'], [RING.r + RING.band - 4, 9, 'rgba(90,56,24,0.34)'], [RING.r - 4, 10, 'rgba(255,240,196,0.22)']] as const) {
    g.strokeStyle = col
    g.lineWidth = w
    g.beginPath()
    g.arc(0, 0, r, 0, TAU)
    g.stroke()
  }
}

export function createWreathStall(world: World): Scene {
  const { stage, snd } = world
  let backdrop: Sprite | null = null
  let straw: Sprite | null = null
  const sprigs: Sprite[] = []
  const snow = makeSnow(70, 28, 230, 214, 20, mulberry(64))

  let laid: Laid[] = []
  let decos: Deco[] = []
  let pile = SPRIGS
  let stock: Record<DecoKind, number> = { candle: 4, cone: 4, orange: 4, berry: 4, bow: 1 }
  const fliers: Flier[] = []
  type Held =
    | { type: 'none' }
    | { type: 'sprig'; id: number; x: number; y: number; variant: number; moved: number }
    | { type: 'deco'; id: number; x: number; y: number; kind: DecoKind; moved: number; rot: number }
    | { type: 'wind'; id: number; sprig: Laid; last: number }
  let held: Held = { type: 'none' }
  let spin = 0
  let idle = 0
  let pileStir = 0

  const fresh = (): void => {
    laid = []
    decos = []
    pile = SPRIGS
    stock = { candle: 4, cone: 4, orange: 4, berry: 4, bow: 1 }
    fliers.length = 0
    held = { type: 'none' }
  }

  const build = (): void => {
    const dpr = world.dpr
    backdrop = makeSprite(W, H, world.bg, paint)
    straw = makeSprite(360, 360, dpr, (g) => {
      g.translate(180, 180)
      paintStraw(g, mulberry(19))
    })
    for (let v = 0; v < 3; v++) {
      sprigs.push(
        makeSprite(SPRIG.w, SPRIG.h, dpr, (g) => {
          const rng = mulberry(200 + v * 11)
          sprig(g, SPRIG.ax, SPRIG.ay, 96, 0.36, rng, 0.82, true)
          sprig(g, SPRIG.ax, SPRIG.ay, 96, -0.36, rng, 0.88, true)
          sprig(g, SPRIG.ax, SPRIG.ay, 138, (rng() - 0.5) * 0.1, rng, 1.08, true)
        }),
      )
    }
  }

  const stemOf = (l: Laid): [number, number] => [RING.x + Math.cos(l.a) * RING.r, RING.y + Math.sin(l.a) * RING.r]

  const drawSprig = (g: G, variant: number, x: number, y: number, rot: number, scale = 1): void => {
    const s = sprigs[variant % sprigs.length]
    if (!s) return
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.scale(scale, scale)
    put(g, s, -SPRIG.ax, -SPRIG.ay)
    g.restore()
  }

  // The wreath as it stands, drawn round (0, 0): for the table here, the
  // basket, and the table at home.
  const drawWreath = (g: G, time: number, lit: number, loose: boolean): void => {
    if (straw) put(g, straw, -180, -180)
    for (const l of laid) {
      const x = Math.cos(l.a) * RING.r
      const y = Math.sin(l.a) * RING.r
      const bound = l.wraps >= 3
      const lift = bound || !loose ? 0 : 1
      // Each sprig lies back over the stem of the one before, as a binder lays them.
      const rot = l.a - Math.PI / 2 - 0.34 + (lift ? Math.sin(time * 1.3 + l.a * 3) * 0.03 : 0)
      if (lift) {
        g.save()
        g.globalAlpha = 0.16
        g.translate(5, 8)
        drawSprig(g, l.variant, x, y, rot, 1.04)
        g.restore()
      }
      drawSprig(g, l.variant, x, y, rot, 1 + l.settle * 0.06 + lift * 0.03)
      // The ribbon over its stem, one turn beside the next.
      for (let k = 0; k < l.wraps; k++) {
        const a = l.a - (k * 7 + 5) / RING.r
        g.strokeStyle = rgba(DYE.madder)
        g.lineWidth = 3.6
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(Math.cos(a - 0.03) * (RING.r - RING.band - 2), Math.sin(a - 0.03) * (RING.r - RING.band - 2))
        g.lineTo(Math.cos(a + 0.03) * (RING.r + RING.band + 2), Math.sin(a + 0.03) * (RING.r + RING.band + 2))
        g.stroke()
        g.strokeStyle = 'rgba(255,190,170,0.4)'
        g.lineWidth = 1.2
        g.stroke()
      }
    }
    const flatFirst = [...decos].sort((p, q) => (p.kind === 'candle' ? 1 : 0) - (q.kind === 'candle' ? 1 : 0) || p.y - q.y)
    for (const d of flatFirst) drawDeco(g, d.kind, d.x, d.y, d.rot, 1 + d.settle * 0.12, time, lit)
  }

  const nextAngle = (): number => {
    if (laid.length === 0) return -Math.PI / 2
    return laid[laid.length - 1]!.a + TAU / SPRIGS
  }

  const lay = (a: number, variant: number): void => {
    laid.push({ a, variant, wraps: 0, wind: 0, settle: 1 })
    snd.fir()
  }

  const freeSpot = (kind: DecoKind): [number, number] => {
    // Candles go to the four quarters; the rest wherever there is room.
    const tries = kind === 'candle' ? [-0.25, 0.25, 0.75, 1.25].map((k) => k * Math.PI) : Array.from({ length: 16 }, (_, i) => ((i * 7 + 2) % 16) * (TAU / 16) + 0.2)
    if (kind === 'bow') tries.unshift(Math.PI / 2)
    for (const a of tries) {
      const x = Math.cos(a) * RING.r
      const y = Math.sin(a) * RING.r
      if (!decos.some((d) => Math.hypot(d.x - x, d.y - y) < 40)) return [x, y]
    }
    const a = Math.random() * TAU
    return [Math.cos(a) * RING.r, Math.sin(a) * RING.r]
  }

  const place = (kind: DecoKind, x: number, y: number, rot: number): void => {
    decos.push({ kind, x, y, rot, settle: 1 })
    if (kind === 'candle') snd.wood(0.7)
    else if (kind === 'bow') snd.cloth()
    else snd.pat()
  }

  const stockPos = (kind: DecoKind, i: number): [number, number] => [STOCK[kind].x + i * STOCK[kind].pitch, STOCK[kind].y]

  const onBand = (x: number, y: number): boolean => {
    const d = Math.hypot(x - RING.x, y - RING.y)
    return d > RING.r - 78 && d < RING.r + 86
  }

  function paint(g: G): void {
    const rng = mulberry(7741)
    lazure(g, 0, 0, W, TABLE_Y + 4, DYE.wall, [[238, 196, 146], [214, 152, 112], [228, 174, 124], [202, 136, 108]], rng, 120)
    duskWindow(g, 70, 28, 230, 214, rng, 0.1)
    planks(g, 52, 244, 266, 18, [170, 118, 72], rng, 1)
    garland(g, 330, 20, 760, 22, 30, rng, 34)
    garland(g, 760, 22, 1190, 14, 30, rng, 34)
    // A wreath someone finished, hanging on the wall.
    g.save()
    g.translate(1010, 158)
    for (let i = 0; i < 22; i++) {
      const a = (i / 22) * TAU
      sprig(g, Math.cos(a) * 62, Math.sin(a) * 62, 54, a + Math.PI / 2 + 0.4, rng, 0.9 + rng() * 0.3, true)
    }
    g.restore()
    drawDeco(g, 'bow', 1010, 226, 0, 0.9, 0)
    for (const a of [0.4, 1.9, 3.3, 4.6]) drawDeco(g, 'berry', 1010 + Math.cos(a) * 62, 158 + Math.sin(a) * 62, a, 0.8, 0)
    for (const lx of [520]) {
      g.strokeStyle = 'rgba(60,36,24,0.8)'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(lx, 30)
      g.lineTo(lx, 110)
      g.stroke()
      lanternBody(g, lx, 156)
    }

    planks(g, 0, TABLE_Y, W, H - TABLE_Y, [176, 122, 72], rng, 6)
    const edge = g.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 24)
    edge.addColorStop(0, 'rgba(50,24,12,0.4)')
    edge.addColorStop(1, 'rgba(50,24,12,0)')
    g.fillStyle = edge
    g.fillRect(0, TABLE_Y, W, 24)
    // A round of sacking under the ring, to catch the needles.
    g.fillStyle = 'rgba(40,20,12,0.18)'
    g.beginPath()
    g.ellipse(RING.x + 4, RING.y + 8, 226, 226, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#c9b089'
    g.beginPath()
    g.ellipse(RING.x, RING.y, 224, 224, 0, 0, TAU)
    g.fill()
    g.save()
    g.clip()
    brush(g, RING.x - 230, RING.y - 230, 460, 460, rng, 110, 0.6, 0.7, 60)
    brush(g, RING.x - 230, RING.y - 230, 460, 460, rng, 110, -0.9, 0.7, 60)
    g.restore()
    // Loose needles where the heap of fir lies.
    for (let i = 0; i < 60; i++) {
      const a = rng() * TAU
      const r = rng() * 150
      const x = PILE.x + Math.cos(a) * r
      const y = PILE.y + Math.sin(a) * r * 0.7
      const na = rng() * TAU
      g.strokeStyle = `rgba(60,96,62,${0.4 + rng() * 0.4})`
      g.lineWidth = 1.6
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(na) * 9, y + Math.sin(na) * 9)
      g.stroke()
    }
    // Wooden trays for the trimmings.
    for (const [y, h] of [[372, 62], [476, 62], [556, 62], [636, 66]] as const) {
      g.fillStyle = 'rgba(40,20,12,0.22)'
      g.beginPath()
      g.roundRect(886, y + 5, 276, h, 12)
      g.fill()
      g.fillStyle = '#b98852'
      g.beginPath()
      g.roundRect(884, y, 276, h, 12)
      g.fill()
      g.fillStyle = '#a2713e'
      g.beginPath()
      g.roundRect(892, y + 7, 260, h - 14, 8)
      g.fill()
    }
    // The spool's stand.
    g.fillStyle = 'rgba(40,20,12,0.22)'
    g.beginPath()
    g.ellipse(SPOOL.x + 4, SPOOL.y + 26, 44, 12, 0, 0, TAU)
    g.fill()

    candlelit(
      g,
      W,
      H,
      [
        { x: RING.x, y: RING.y - 40, r: 520 },
        { x: 520, y: 160, r: 320 },
        { x: 1020, y: 520, r: 380, lift: 0.9 },
        { x: 200, y: 480, r: 360, lift: 0.85 },
        { x: 190, y: 140, r: 240, lift: 0.5 },
      ],
      'rgba(58,28,46,0.46)',
      0.11,
    )
    grain(g, 0, 0, W, H, 2400, rng, 0.03, 0.03)
  }

  const fly = (f: Omit<Flier, 't'>): void => {
    fliers.push({ ...f, t: 0 })
  }

  const drawSpool = (g: G): void => {
    g.save()
    g.translate(SPOOL.x, SPOOL.y)
    g.fillStyle = '#b98852'
    g.beginPath()
    g.ellipse(0, 22, 36, 11, 0, 0, TAU)
    g.fill()
    g.fillStyle = rgba(DYE.madder)
    g.beginPath()
    g.roundRect(-26, -22, 52, 44, 6)
    g.fill()
    g.strokeStyle = 'rgba(90,24,18,0.45)'
    g.lineWidth = 1.5
    for (let i = 0; i < 6; i++) {
      const y = -18 + ((i * 7 + spin * 14) % 40)
      g.beginPath()
      g.moveTo(-26, y)
      g.lineTo(26, y + 3)
      g.stroke()
    }
    g.fillStyle = '#c99558'
    g.beginPath()
    g.ellipse(0, -22, 36, 11, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#8a5a30'
    g.beginPath()
    g.ellipse(0, -22, 8, 3, 0, 0, TAU)
    g.fill()
    g.restore()
  }

  return {
    enter() {
      if (!backdrop) build()
      idle = 0
      // Anything still in the hand when the child stepped away is back in its place.
      if (held.type === 'sprig') pile++
      else if (held.type === 'deco') stock[held.kind]++
      held = { type: 'none' }
    },
    reset: fresh,
    made(): Made[] {
      if (laid.length === 0 && decos.length === 0) return []
      return [
        {
          kind: 'wreath',
          from: 'wreath',
          x: RING.x,
          y: RING.y,
          h: 2 * (RING.r + 62),
          draw(g, x, y, scale, time, lit = 0) {
            g.save()
            g.translate(x, y)
            g.scale(scale, scale)
            drawWreath(g, time, lit, false)
            g.restore()
          },
        },
      ]
    },
    update(dt) {
      idle += dt
      pileStir = damp(pileStir, 0, 5, dt)
      for (const l of laid) l.settle = damp(l.settle, 0, 7, dt)
      for (const d of decos) d.settle = damp(d.settle, 0, 7, dt)
      for (let i = fliers.length - 1; i >= 0; i--) {
        const f = fliers[i]!
        f.t += dt / 0.36
        if (f.t >= 1) {
          fliers.splice(i, 1)
          f.done()
        }
      }
      if (held.type === 'sprig' || held.type === 'deco') {
        const p = stage.pointers.get(held.id)
        if (p && p.down) {
          held.x = damp(held.x, p.x, 26, dt)
          held.y = damp(held.y, p.y - 20, 26, dt)
        }
      } else if (held.type === 'wind') {
        const p = stage.pointers.get(held.id)
        const l = held.sprig
        if (!p || !p.down) held = { type: 'none' }
        else {
          const [sx, sy] = stemOf(l)
          const dx = p.x - sx
          const dy = p.y - sy
          const d = Math.hypot(dx, dy)
          if (d > 170) held = { type: 'none' }
          else if (d > 12) {
            const ang = Math.atan2(dy, dx)
            let turn = ang - held.last
            while (turn > Math.PI) turn -= TAU
            while (turn < -Math.PI) turn += TAU
            held.last = ang
            const before = l.wind
            l.wind += Math.abs(turn)
            spin += Math.abs(turn) * 0.4
            // Every half turn of the finger lays one turn of ribbon.
            if (l.wraps < 3 && Math.floor(l.wind / 2.6) > Math.floor(before / 2.6)) {
              l.wraps++
              snd.wire(l.wraps)
              if (l.wraps === 3) {
                l.settle = 1
                stage.after(0.08, () => snd.fir())
              }
            }
          }
        }
      }
      // The invitation: the heap of fir stirs.
      if (laid.length === 0 && idle > 5 && Math.sin(stage.time * 1.4) > 0.985) pileStir = 1
    },
    draw(g) {
      const t = stage.time
      if (backdrop) put(g, backdrop, 0, 0)
      drawSnow(g, snow, t)
      const lf = flicker(t, 8)
      glow(g, world.halo, 520, 156, 96 + lf * 10, 0.9)
      flame(g, 520, 164, 22, lf)

      // The heap of fir.
      for (let i = 0; i < pile; i++) {
        const a = i * 2.4
        const top = i === pile - 1 ? pileStir : 0
        drawSprig(g, i, PILE.x + Math.cos(a) * 34 - 30, PILE.y + Math.sin(a * 1.3) * 26 + i * 2 - top * 8, -0.5 + ((i * 37) % 10) * 0.11 + top * 0.06)
      }

      // Trimmings still on their trays.
      for (const kind of KINDS) {
        for (let i = 0; i < stock[kind]; i++) {
          const [x, y] = stockPos(kind, i)
          drawDeco(g, kind, x, kind === 'candle' ? y + 8 : y, kind === 'cone' ? 0.4 + i : i * 0.7, 1, t)
        }
      }

      drawSpool(g)

      g.save()
      g.translate(RING.x, RING.y)
      drawWreath(g, t, 0, true)
      g.restore()

      // The ribbon running from the spool to the stem being bound.
      if (held.type === 'wind') {
        const [sx, sy] = stemOf(held.sprig)
        const p = stage.pointers.get(held.id)
        const ex = p ? p.x : sx
        const ey = p ? p.y : sy
        g.strokeStyle = rgba(DYE.madder)
        g.lineWidth = 5
        g.lineCap = 'round'
        g.beginPath()
        g.moveTo(SPOOL.x + 20, SPOOL.y - 8)
        g.quadraticCurveTo((SPOOL.x + ex) / 2, Math.max(SPOOL.y, ey) + 30, ex, ey)
        g.lineTo(sx, sy)
        g.stroke()
      }

      for (const f of fliers) {
        const k = ease.inOutCubic(clamp(f.t, 0, 1))
        f.draw(g, lerp(f.x0, f.x1, k), lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * 60, k)
      }
      if (held.type === 'sprig') {
        g.save()
        g.globalAlpha = 0.16
        drawSprig(g, held.variant, held.x + 8, held.y + 14, -0.3, 1.06)
        g.restore()
        drawSprig(g, held.variant, held.x, held.y, -0.3, 1.06)
      } else if (held.type === 'deco') {
        drawDeco(g, held.kind, held.x, held.y, held.rot, 1.12, t)
      }
    },
    down(p: Pointer) {
      idle = 0
      if (held.type !== 'none') return
      // A trimming already on the wreath comes off again in the hand.
      for (let i = decos.length - 1; i >= 0; i--) {
        const d = decos[i]!
        const dy = d.kind === 'candle' ? d.y - 30 : d.y
        if (Math.hypot(p.x - RING.x - d.x, p.y - RING.y - dy) < 34) {
          decos.splice(i, 1)
          held = { type: 'deco', id: p.id, x: RING.x + d.x, y: RING.y + d.y, kind: d.kind, moved: 30, rot: d.rot }
          snd.pat()
          return
        }
      }
      // A loose stem: wind the ribbon round it.
      let loose: Laid | null = null
      let best = 104
      for (const l of laid) {
        if (l.wraps >= 3) continue
        const [sx, sy] = stemOf(l)
        const d = Math.hypot(p.x - sx, p.y - sy)
        if (d < best) {
          best = d
          loose = l
        }
      }
      if (loose) {
        const [sx, sy] = stemOf(loose)
        held = { type: 'wind', id: p.id, sprig: loose, last: Math.atan2(p.y - sy, p.x - sx) }
        loose.settle = 0.6
        snd.wire(0)
        return
      }
      // The heap of fir.
      if (pile > 0 && Math.abs(p.x - PILE.x) < 170 && Math.abs(p.y - PILE.y) < 120) {
        pile--
        held = { type: 'sprig', id: p.id, x: p.x, y: p.y - 20, variant: pile, moved: 0 }
        snd.fir()
        return
      }
      // The trays.
      for (const kind of KINDS) {
        const n = stock[kind]
        if (n <= 0) continue
        const row = STOCK[kind]
        const x1 = row.x + Math.max(0, n - 1) * row.pitch
        if (p.x > row.x - 44 && p.x < x1 + 44 && Math.abs(p.y - (kind === 'candle' ? row.y - 22 : row.y)) < 50) {
          stock[kind]--
          const [sx, sy] = stockPos(kind, stock[kind])
          held = { type: 'deco', id: p.id, x: sx, y: sy, kind, moved: 0, rot: kind === 'cone' ? 0.4 : 0 }
          snd.pat()
          return
        }
      }
      // The spool turns under a finger.
      if (Math.hypot(p.x - SPOOL.x, p.y - SPOOL.y) < 60) {
        spin += 0.6
        snd.wire(1)
        return
      }
      if (Math.hypot(p.x - RING.x, p.y - RING.y) < RING.r + 60) {
        for (const l of laid) l.settle = Math.max(l.settle, 0.5)
        snd.fir()
        return
      }
      world.quiet(p.x, p.y)
    },
    move(p: Pointer) {
      if ((held.type === 'sprig' || held.type === 'deco') && held.id === p.id) held.moved += Math.abs(p.dx) + Math.abs(p.dy)
    },
    up(p: Pointer) {
      if (held.type === 'sprig' && held.id === p.id) {
        const h = held
        held = { type: 'none' }
        if (onBand(h.x, h.y)) {
          lay(Math.atan2(h.y - RING.y, h.x - RING.x), h.variant)
        } else if (h.moved < 16) {
          // A plain touch on the heap: the sprig goes to the next place round.
          const a = nextAngle()
          fly({
            draw: (g, x, y, k) => drawSprig(g, h.variant, x, y, lerp(-0.3, a - Math.PI / 2 - 0.34, k)),
            x0: h.x,
            y0: h.y,
            x1: RING.x + Math.cos(a) * RING.r,
            y1: RING.y + Math.sin(a) * RING.r,
            done: () => lay(a, h.variant),
          })
        } else {
          // Let go somewhere else: back on the heap.
          fly({ draw: (g, x, y) => drawSprig(g, h.variant, x, y, -0.3), x0: h.x, y0: h.y, x1: PILE.x, y1: PILE.y, done: () => void pile++ })
        }
      } else if (held.type === 'deco' && held.id === p.id) {
        const h = held
        held = { type: 'none' }
        if (onBand(h.x, h.y)) {
          const a = Math.atan2(h.y - RING.y, h.x - RING.x)
          place(h.kind, Math.cos(a) * RING.r, Math.sin(a) * RING.r, h.rot)
        } else if (h.moved < 16) {
          const [x, y] = freeSpot(h.kind)
          fly({ draw: (g, fx, fy) => drawDeco(g, h.kind, fx, fy, h.rot, 1.1, stage.time), x0: h.x, y0: h.y, x1: RING.x + x, y1: RING.y + y, done: () => place(h.kind, x, y, h.rot) })
        } else {
          const [x, y] = stockPos(h.kind, stock[h.kind])
          fly({ draw: (g, fx, fy) => drawDeco(g, h.kind, fx, fy, h.rot, 1, stage.time), x0: h.x, y0: h.y, x1: x, y1: y, done: () => void stock[h.kind]++ })
        }
      }
    },
  }
}
