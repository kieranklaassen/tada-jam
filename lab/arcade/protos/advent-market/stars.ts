// The window-star stall: squares of coloured kite paper. Take a square, fold
// its two side corners in to the middle crease so it becomes a kite, and lay
// it in the ring, each one overlapping the last. Then lift the star to the
// window, where the afternoon light comes through it, darker where the paper
// lies double.

import { clamp, damp, ease, lerp, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Pointer } from '../../kit/types.ts'
import { DYE, brush, candlelit, drawSnow, duskWindow, flame, flicker, garland, glow, grain, lazure, makeSnow, makeSprite, mix, mulberry, paperStar, planks, put, rgba } from './art.ts'
import type { G, Rgb, Sprite } from './art.ts'
import { lanternBody } from './candle.ts'
import type { Made, Scene, World } from './shared.ts'

// Half the diagonal of a paper square.
const D = 80
const K = 0.5858 * D
// Kite paper, as the light comes through one sheet of it.
const PAPER: Rgb[] = [
  [255, 230, 110],
  [255, 188, 104],
  [246, 136, 124],
  [246, 164, 198],
  [196, 164, 234],
  [146, 194, 244],
  [150, 220, 176],
  [214, 234, 132],
]

const TABLE_Y = 442
const WIN = { x: 430, y: 34, w: 690, h: 372 }
const MAT = { x: 512, y: 600 }
const RING = { x: 892, y: 606 }
const RING_SCALE = 0.9
const HANG = { x: 775, y: 214 }
const PILE = { x: 96, y: 500, pitch: 46 }

// The folded kite with its right-angled corner at the origin and its sharp
// point straight up at (0, -2D).
function kitePath(g: G): void {
  g.beginPath()
  g.moveTo(0, -2 * D)
  g.lineTo(K, -K)
  g.lineTo(0, 0)
  g.lineTo(-K, -K)
  g.closePath()
}

// The part of a folded kite where the paper lies double.
function doublePath(g: G): void {
  g.beginPath()
  g.moveTo(0, -2 * D)
  g.lineTo(K, -K)
  g.lineTo(-K, -K)
  g.closePath()
}

// A star of `colours.length` kites, drawn round the origin. Against the
// light the layers multiply, as kite paper does; lying on the table they are
// only soft pastel.
function paintStar(g: G, colours: readonly number[], lit: boolean): void {
  g.save()
  g.globalCompositeOperation = lit ? 'multiply' : 'source-over'
  colours.forEach((c, i) => {
    const col = PAPER[c % PAPER.length]!
    g.save()
    g.rotate((i * TAU) / 8)
    if (lit) {
      g.fillStyle = rgba(col)
      kitePath(g)
      g.fill()
      doublePath(g)
      g.fill()
    } else {
      const soft = mix(col, [255, 250, 240], 0.25)
      g.fillStyle = rgba(soft, 0.74)
      kitePath(g)
      g.fill()
      g.fillStyle = rgba(mix(col, [120, 70, 40], 0.12), 0.34)
      doublePath(g)
      g.fill()
      g.strokeStyle = 'rgba(120,80,60,0.22)'
      g.lineWidth = 1
      g.beginPath()
      g.moveTo(0, -2 * D)
      g.lineTo(0, -K)
      g.moveTo(-K, -K)
      g.lineTo(K, -K)
      g.stroke()
    }
    g.restore()
  })
  g.restore()
}

const STAR_PX = 2 * D * 2 + 16

export function createStarStall(world: World): Scene {
  const { stage, snd } = world
  let backdrop: Sprite | null = null
  const snow = makeSnow(WIN.x, WIN.y, WIN.w, WIN.h, 40, mulberry(52))

  // The squares still in the pile, each with its own place in the fan.
  interface Sheet {
    colour: number
    x: number
    y: number
    rot: number
    lift: number
  }
  // The square being folded, or carried to the ring.
  interface Piece {
    colour: number
    // Position of the kite's right-angled corner, and its turn.
    x: number
    y: number
    rot: number
    scale: number
    // 0 flat .. 1 folded, each side.
    left: number
    right: number
    leftDone: boolean
    rightDone: boolean
    state: 'sliding' | 'mat' | 'carry' | 'rest' | 'toRing'
    t: number
    fromX: number
    fromY: number
    fromRot: number
    fromScale: number
  }
  let pile: Sheet[] = []
  let piece: Piece | null = null
  let ring: number[] = []
  let flat: Sprite | null = null
  let glowing: Sprite | null = null
  // The star: lying in the ring, in the hand, or in the window.
  let starAt: 'ring' | 'hand' | 'window' | 'back' | 'up' = 'ring'
  let sx = RING.x
  let sy = RING.y
  let starT = 0
  let starFromX = 0
  let starFromY = 0
  let press = 0
  let sway = 0
  let swayV = 0
  let drag: { kind: 'none' } | { kind: 'fold'; side: -1 | 1; id: number; x0: number; moved: number } | { kind: 'carry'; id: number; dx: number; dy: number; moved: number } | { kind: 'star'; id: number; dx: number; dy: number } = { kind: 'none' }
  let idle = 0
  let touched = false

  const fresh = (): void => {
    const rng = mulberry(600 + world.visit.n * 17)
    pile = []
    for (let i = 0; i < 8; i++) {
      pile.push({ colour: (i + world.visit.n * 3) % 8, x: PILE.x + i * PILE.pitch, y: PILE.y + (i % 2) * 8 + (rng() - 0.5) * 6, rot: (rng() - 0.5) * 0.3, lift: 0 })
    }
    piece = null
    ring = []
    flat = null
    glowing = null
    starAt = 'ring'
    sx = RING.x
    sy = RING.y
    drag = { kind: 'none' }
    touched = false
  }
  fresh()

  const renderStar = (): void => {
    flat = makeSprite(STAR_PX, STAR_PX, world.dpr, (g) => {
      g.translate(STAR_PX / 2, STAR_PX / 2)
      paintStar(g, ring, false)
    })
    glowing = makeSprite(STAR_PX, STAR_PX, world.dpr, (g) => {
      g.translate(STAR_PX / 2, STAR_PX / 2)
      paintStar(g, ring, true)
    })
  }

  const drawStar = (g: G, x: number, y: number, scale: number, lit: number, rot = 0): void => {
    if (!flat || !glowing) return
    g.save()
    g.translate(x, y)
    g.rotate(rot)
    g.scale(scale, scale)
    if (lit < 0.99) put(g, flat, -STAR_PX / 2, -STAR_PX / 2)
    if (lit > 0.01) {
      g.globalAlpha *= lit
      put(g, glowing, -STAR_PX / 2, -STAR_PX / 2)
    }
    g.restore()
  }

  const made = (): Made[] => {
    if (ring.length < 2 || !flat || !glowing) return []
    const a = flat
    const b = glowing
    return [
      {
        kind: 'star',
        from: 'stars',
        x: sx,
        y: sy,
        h: 2 * 2 * D * RING_SCALE,
        draw(g, x, y, scale, _time, lit = 0) {
          g.save()
          g.translate(x, y)
          g.scale(scale * RING_SCALE, scale * RING_SCALE)
          if (lit < 0.99) put(g, a, -STAR_PX / 2, -STAR_PX / 2)
          if (lit > 0.01) {
            g.globalAlpha *= lit
            put(g, b, -STAR_PX / 2, -STAR_PX / 2)
          }
          g.restore()
        },
      },
    ]
  }

  // One square on the mat, part folded. (x, y) is where the kite's
  // right-angled corner sits; the square's centre is D above it.
  const drawPiece = (g: G, p: Piece): void => {
    const col = PAPER[p.colour % PAPER.length]!
    const soft = mix(col, [255, 250, 240], 0.25)
    g.save()
    g.translate(p.x, p.y)
    g.rotate(p.rot)
    g.scale(p.scale, p.scale)
    // A little shadow so it lies on the table, not in it.
    g.fillStyle = 'rgba(60,30,20,0.12)'
    g.beginPath()
    g.moveTo(3, -2 * D + 5)
    g.lineTo(D * (1 - p.right) + K * p.right + 3, -D * (1 - p.right) - K * p.right + 5)
    g.lineTo(3, 5)
    g.lineTo(-D * (1 - p.left) - K * p.left + 3, -D * (1 - p.left) - K * p.left + 5)
    g.closePath()
    g.fill()
    g.fillStyle = rgba(soft, 0.78)
    kitePath(g)
    g.fill()
    for (const side of [-1, 1] as const) {
      const f = side < 0 ? p.left : p.right
      // The corner travels straight across its crease to the middle line.
      const k = (1 - Math.cos(Math.PI * f)) / 2
      const cx = lerp(side * D, 0, k)
      const cy = lerp(-D, -K, k)
      const liftUp = Math.sin(Math.PI * f) * 16
      if (liftUp > 0.5) {
        g.fillStyle = `rgba(60,30,20,${0.1 * Math.sin(Math.PI * f)})`
        g.beginPath()
        g.moveTo(0, -2 * D)
        g.lineTo(cx, cy + 6)
        g.lineTo(side * K, -K)
        g.closePath()
        g.fill()
      }
      g.fillStyle = rgba(f > 0.5 ? mix(soft, [120, 70, 40], 0.08) : soft, 0.78)
      g.beginPath()
      g.moveTo(0, -2 * D)
      g.lineTo(cx, cy - liftUp)
      g.lineTo(side * K, -K)
      g.closePath()
      g.fill()
      // The crease, once it has been pressed.
      if (f > 0.9) {
        g.strokeStyle = 'rgba(120,80,60,0.22)'
        g.lineWidth = 1
        g.beginPath()
        g.moveTo(0, -2 * D)
        g.lineTo(0, -K)
        g.stroke()
      }
    }
    // The middle crease every square comes with.
    g.strokeStyle = 'rgba(120,80,60,0.16)'
    g.lineWidth = 1
    g.beginPath()
    g.moveTo(0, -2 * D)
    g.lineTo(0, 0)
    g.stroke()
    g.restore()
  }

  const toRing = (p: Piece): void => {
    p.state = 'toRing'
    p.t = 0
    p.fromX = p.x
    p.fromY = p.y
    p.fromRot = p.rot
    p.fromScale = p.scale
    drag = { kind: 'none' }
  }

  const paint = (g: G): void => {
    const rng = mulberry(3318)
    lazure(g, 0, 0, W, TABLE_Y + 4, DYE.wall, [[238, 196, 146], [214, 152, 112], [228, 174, 124], [202, 136, 108]], rng, 150)
    // The big window the stars are held up to.
    duskWindow(g, WIN.x, WIN.y, WIN.w, WIN.h, rng, 0.72, false, false)
    // Its glazing bars.
    g.strokeStyle = rgba(DYE.woodDark)
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(WIN.x + WIN.w / 2, WIN.y)
    g.lineTo(WIN.x + WIN.w / 2, WIN.y + WIN.h)
    g.stroke()
    // Stars other children made, already in the panes.
    for (const [ox, oy, sc, cols, rot] of [
      [WIN.x + 606, WIN.y + 92, 0.36, [0, 1, 0, 1, 0, 1, 0, 1], 0.2],
      [WIN.x + 624, WIN.y + 262, 0.3, [3, 4, 3, 4, 3, 4, 3, 4], 0],
      [WIN.x + 84, WIN.y + 286, 0.28, [5, 6, 5, 6, 5, 6, 5, 6], 0.3],
    ] as const) {
      // Painted apart, so their layers darken each other and not the sky.
      const s = makeSprite(STAR_PX, STAR_PX, world.dpr, (sg) => {
        sg.translate(STAR_PX / 2, STAR_PX / 2)
        paintStar(sg, cols, true)
      })
      g.save()
      g.translate(ox, oy)
      g.rotate(rot)
      g.scale(sc, sc)
      g.globalAlpha = 0.92
      put(g, s, -STAR_PX / 2, -STAR_PX / 2)
      g.restore()
    }
    garland(g, 380, 22, 1180, 14, 26, rng, 34)
    // The sill.
    planks(g, WIN.x - 30, WIN.y + WIN.h + 6, WIN.w + 60, 22, [170, 118, 72], rng, 1)
    // Paper stars on threads, and a lantern, on the wall to the left.
    for (const [px, py, pr, ca, cb] of [[96, 150, 26, [246, 206, 110], [228, 160, 84]], [372, 120, 20, [232, 140, 120], [210, 110, 130]], [160, 300, 18, [150, 180, 214], [160, 200, 170]]] as const) {
      g.strokeStyle = 'rgba(240,226,200,0.6)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(px, 0)
      g.lineTo(px, py - pr)
      g.stroke()
      paperStar(g, px, py, pr, ca, cb, px * 0.01)
    }
    g.strokeStyle = 'rgba(60,36,24,0.8)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(246, 40)
    g.lineTo(246, 150)
    g.stroke()
    lanternBody(g, 246, 196)

    // The table, with a linen cloth to fold on.
    planks(g, 0, TABLE_Y, W, H - TABLE_Y, [178, 124, 74], rng, 4)
    const edge = g.createLinearGradient(0, TABLE_Y, 0, TABLE_Y + 24)
    edge.addColorStop(0, 'rgba(50,24,12,0.4)')
    edge.addColorStop(1, 'rgba(50,24,12,0)')
    g.fillStyle = edge
    g.fillRect(0, TABLE_Y, W, 24)
    // The folding board.
    g.fillStyle = 'rgba(40,20,12,0.2)'
    g.beginPath()
    g.roundRect(MAT.x - 124, MAT.y - 2 * D - 14, 256, 2 * D + 2 * D + 44, 12)
    g.fill()
    g.fillStyle = '#e9dcc0'
    g.beginPath()
    g.roundRect(MAT.x - 128, MAT.y - 2 * D - 22, 256, 2 * D + 2 * D + 44, 12)
    g.fill()
    g.save()
    g.clip()
    brush(g, MAT.x - 128, MAT.y - 2 * D - 22, 256, 4 * D + 44, rng, 40, 0.1, 0.6, 70)
    g.restore()
    // The round of felt where the star is put together.
    g.fillStyle = 'rgba(40,20,12,0.2)'
    g.beginPath()
    g.ellipse(RING.x + 4, RING.y + 8, 166, 166, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#7d5a6a'
    g.beginPath()
    g.ellipse(RING.x, RING.y, 164, 164, 0, 0, TAU)
    g.fill()
    g.save()
    g.clip()
    brush(g, RING.x - 170, RING.y - 170, 340, 340, rng, 80, 0.5, 0.8, 60)
    g.restore()
    g.strokeStyle = 'rgba(255,230,200,0.25)'
    g.lineWidth = 2
    g.setLineDash([3, 9])
    g.beginPath()
    g.arc(RING.x, RING.y, 152, 0, TAU)
    g.stroke()
    g.setLineDash([])

    candlelit(
      g,
      W,
      H,
      [
        { x: WIN.x + WIN.w / 2, y: WIN.y + 200, r: 560 },
        { x: 246, y: 200, r: 320 },
        { x: 700, y: 620, r: 520, lift: 0.9 },
        { x: 240, y: 560, r: 380, lift: 0.85 },
      ],
      'rgba(58,28,46,0.42)',
      0.1,
    )
    grain(g, 0, 0, W, H, 2400, rng, 0.03, 0.03)
  }

  const sheetAt = (x: number, y: number): number => {
    for (let i = pile.length - 1; i >= 0; i--) {
      const s = pile[i]!
      if (Math.abs(x - s.x) < 62 && Math.abs(y - s.y) < 66) return i
    }
    return -1
  }

  const SIDE = D * Math.SQRT2

  return {
    enter() {
      if (!backdrop) backdrop = makeSprite(W, H, world.bg, paint)
      idle = 0
      // Anything still in the hand when the child stepped away is set down.
      drag = { kind: 'none' }
      if (piece && piece.state === 'carry') piece.state = 'rest'
      if (starAt === 'hand') {
        starAt = sy < TABLE_Y - 30 ? 'up' : 'back'
        starT = 0
        starFromX = sx
        starFromY = sy
      }
    },
    reset: fresh,
    made,
    update(dt) {
      idle += dt
      press = damp(press, 0, 7, dt)
      swayV += (-18 * sway - 1.4 * swayV) * dt
      sway += swayV * dt
      for (const s of pile) s.lift = damp(s.lift, 0, 8, dt)
      // The invitation: the top sheet's corner stirs.
      if (!touched && idle > 5 && pile.length > 0 && Math.sin(stage.time * 1.5) > 0.98) pile[pile.length - 1]!.lift = 0.5

      const p = piece
      if (p) {
        if (p.state === 'sliding') {
          p.t = Math.min(1, p.t + dt / 0.42)
          const k = ease.outCubic(p.t)
          p.x = lerp(p.fromX, MAT.x, k)
          p.y = lerp(p.fromY, MAT.y + D, k) - Math.sin(k * Math.PI) * 30
          p.rot = lerp(p.fromRot, 0, k)
          if (p.t >= 1) p.state = 'mat'
        } else if (p.state === 'mat' || p.state === 'rest') {
          if (drag.kind !== 'fold' || drag.side !== -1) p.left = damp(p.left, p.leftDone ? 1 : 0, 12, dt)
          if (drag.kind !== 'fold' || drag.side !== 1) p.right = damp(p.right, p.rightDone ? 1 : 0, 12, dt)
        } else if (p.state === 'carry' && drag.kind === 'carry') {
          const ptr = stage.pointers.get(drag.id)
          if (ptr && ptr.down) {
            p.x = damp(p.x, ptr.x + drag.dx, 24, dt)
            p.y = damp(p.y, ptr.y + drag.dy, 24, dt)
          }
        } else if (p.state === 'toRing') {
          p.t = Math.min(1, p.t + dt / 0.4)
          const k = ease.inOutCubic(p.t)
          const slot = ring.length
          p.x = lerp(p.fromX, RING.x, k)
          p.y = lerp(p.fromY, RING.y, k) - Math.sin(k * Math.PI) * 26
          let turn = (slot * TAU) / 8 - p.fromRot
          while (turn > Math.PI) turn -= TAU
          while (turn < -Math.PI) turn += TAU
          p.rot = p.fromRot + turn * k
          p.scale = lerp(p.fromScale, RING_SCALE, k)
          if (p.t >= 1) {
            ring.push(p.colour)
            renderStar()
            piece = null
            press = 1
            snd.pat()
            snd.paper(0.6)
          }
        }
      }

      if (starAt === 'hand' && drag.kind === 'star') {
        const ptr = stage.pointers.get(drag.id)
        if (ptr && ptr.down) {
          const px = sx
          sx = damp(sx, ptr.x + drag.dx, 22, dt)
          sy = damp(sy, ptr.y + drag.dy, 22, dt)
          swayV += (sx - px) * 0.02
        }
      } else if (starAt === 'up' || starAt === 'back') {
        starT = Math.min(1, starT + dt / 0.45)
        const k = ease.outCubic(starT)
        const to = starAt === 'up' ? HANG : RING
        sx = lerp(starFromX, to.x, k)
        sy = lerp(starFromY, to.y, k)
        if (starT >= 1) {
          if (starAt === 'up') {
            starAt = 'window'
            swayV += 1.2
            snd.chime(2, 0.6)
          } else {
            starAt = 'ring'
            press = 1
            snd.paper()
          }
        }
      }
    },
    draw(g) {
      const t = stage.time
      if (backdrop) put(g, backdrop, 0, 0)
      drawSnow(g, snow, t, 0, 0.7)
      const lf = flicker(t, 6)
      glow(g, world.halo, 246, 196, 96 + lf * 10, 0.9)
      flame(g, 246, 204, 22, lf)

      // How much the light is coming through the star: all the way in the
      // window, not at all on the table.
      const lit = clamp((TABLE_Y - 40 - sy) / 140, 0, 1)

      // The coloured light the star throws on the table.
      if (lit > 0.05 && glowing) {
        g.save()
        g.globalAlpha = 0.09 * lit
        g.translate(sx - 60, 548)
        g.scale(1.3, 0.42)
        put(g, glowing, -STAR_PX / 2, -STAR_PX / 2)
        g.restore()
      }

      // The pile of squares, fanned out.
      for (const s of pile) {
        g.save()
        g.translate(s.x, s.y - s.lift * 10)
        g.rotate(s.rot + s.lift * 0.08)
        g.fillStyle = 'rgba(60,30,20,0.12)'
        g.fillRect(-SIDE / 2 + 3, -SIDE / 2 + 4, SIDE, SIDE)
        g.fillStyle = rgba(mix(PAPER[s.colour % PAPER.length]!, [255, 250, 240], 0.25), 0.82)
        g.fillRect(-SIDE / 2, -SIDE / 2, SIDE, SIDE)
        g.restore()
      }

      // The star in the ring (under the piece that is coming to join it).
      if (starAt === 'ring' || starAt === 'back') drawStar(g, sx, sy, RING_SCALE * (1 + press * 0.03), lit)

      if (piece) drawPiece(g, piece)

      if (starAt === 'hand' || starAt === 'window' || starAt === 'up') {
        if (starAt === 'window') {
          g.strokeStyle = 'rgba(240,230,210,0.75)'
          g.lineWidth = 1.2
          g.beginPath()
          g.moveTo(sx, WIN.y + 4)
          g.lineTo(sx + sway * 6, sy - 2 * D * RING_SCALE + 8)
          g.stroke()
          glow(g, world.halo, sx, sy, 210, 0.35)
        }
        drawStar(g, sx + (starAt === 'window' ? sway * 6 : 0), sy, RING_SCALE, lit, sway * 0.05)
      }
    },
    down(p: Pointer) {
      idle = 0
      touched = true
      const pc = piece
      // The piece on the board: fold a side, or once folded carry it.
      if (pc && (pc.state === 'mat' || pc.state === 'rest')) {
        const cx = pc.x
        const cy = pc.y - D * pc.scale
        if (Math.abs(p.x - cx) < D + 50 && Math.abs(p.y - cy) < D + 50) {
          if (pc.leftDone && pc.rightDone) {
            pc.state = 'carry'
            drag = { kind: 'carry', id: p.id, dx: pc.x - p.x, dy: pc.y - p.y, moved: 0 }
            snd.paper(0.7)
            return
          }
          let side: -1 | 1 = p.x < cx ? -1 : 1
          if (side === -1 && pc.leftDone) side = 1
          else if (side === 1 && pc.rightDone) side = -1
          drag = { kind: 'fold', side, id: p.id, x0: p.x, moved: 0 }
          // The corner lifts under the finger straight away.
          if (side === -1) pc.left = Math.max(pc.left, 0.14)
          else pc.right = Math.max(pc.right, 0.14)
          snd.paper(0.8)
          return
        }
      }
      // The star: pick it up to hold it to the window, or bring it back down.
      const onStar = Math.hypot(p.x - sx, p.y - sy) < 2 * D * RING_SCALE + 10
      if (onStar && ring.length >= 2 && (starAt === 'ring' || starAt === 'window') && (!pc || pc.state !== 'toRing')) {
        starAt = 'hand'
        drag = { kind: 'star', id: p.id, dx: sx - p.x, dy: sy - p.y }
        snd.paper()
        return
      }
      if (onStar && starAt === 'ring') {
        press = 1
        snd.pat()
        return
      }
      // A square from the pile, if the board is free.
      const i = sheetAt(p.x, p.y)
      if (i >= 0) {
        const s = pile[i]!
        if (pc) {
          s.lift = 1
          snd.paper(0.5)
          return
        }
        pile.splice(i, 1)
        piece = { colour: s.colour, x: s.x, y: s.y + D, rot: s.rot + Math.PI / 4, scale: 1, left: 0, right: 0, leftDone: false, rightDone: false, state: 'sliding', t: 0, fromX: s.x, fromY: s.y + D, fromRot: s.rot + Math.PI / 4, fromScale: 1 }
        snd.paper()
        return
      }
      world.quiet(p.x, p.y)
    },
    move(p: Pointer) {
      const pc = piece
      if (drag.kind === 'fold' && drag.id === p.id && pc) {
        drag.moved += Math.abs(p.dx) + Math.abs(p.dy)
        // Dragging the corner toward the middle folds it over.
        // Any good long drag will do it too: small hands do not aim.
        const along = clamp(((p.x - drag.x0) * -drag.side) / 78, 0, 1)
        const f = Math.max(0.14, along, clamp((drag.moved - 40) / 120, 0, 1))
        if (drag.side === -1) pc.left = f
        else pc.right = f
      } else if (drag.kind === 'carry' && drag.id === p.id) {
        drag.moved += Math.abs(p.dx) + Math.abs(p.dy)
      }
    },
    up(p: Pointer) {
      const pc = piece
      if (drag.kind === 'fold' && drag.id === p.id && pc) {
        const f = drag.side === -1 ? pc.left : pc.right
        if (f > 0.42) {
          if (drag.side === -1) pc.leftDone = true
          else pc.rightDone = true
          snd.crease()
        } else {
          snd.paper(0.4)
        }
        drag = { kind: 'none' }
      } else if (drag.kind === 'carry' && drag.id === p.id && pc) {
        // Let go near the ring and it joins the star; a plain touch sends it
        // there too. Anywhere else it simply waits where it was put.
        const near = Math.hypot(pc.x - RING.x, pc.y - D - RING.y) < 250 || pc.x > 700
        if (near || drag.moved < 14) toRing(pc)
        else {
          pc.state = 'rest'
          drag = { kind: 'none' }
          snd.paper(0.5)
        }
      } else if (drag.kind === 'star' && drag.id === p.id) {
        const inWindow = sy < TABLE_Y - 30
        starAt = inWindow ? 'up' : 'back'
        starT = 0
        starFromX = sx
        starFromY = sy
        drag = { kind: 'none' }
      }
    },
  }
}
