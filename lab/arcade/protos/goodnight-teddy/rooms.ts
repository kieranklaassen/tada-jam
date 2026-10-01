// The two rooms, painted once into cached canvases: a bathroom in the last of
// the evening sun and a bedroom by lamplight. Everything that moves is drawn
// over these by index.ts.

import { TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import { blobPath, board, rgb, rng, softShadow, speckle, washBlot, wobblyRect } from './paint.ts'
import type { RGB } from './paint.ts'

// Bathroom.
export const MAT = { x: 165, y: 735 }
export const TUB = { cx: 590, rimY: 500, rx: 285, ry: 40, bottom: 705, seatY: 625 }
export const TAP = { hx: 372, hy: 286, sx: 396, sy: 378 }
export const SOAP_HOME = { x: 940, y: 590 }
export const JUG_HOME = { x: 1010, y: 613 }
export const TOWEL_HOME = { x: 975, y: 246 }
export const DOOR_A = { x: 1072, y: 205, w: 104, h: 457 }

// Bedroom.
export const DOOR_B = { x: 6, y: 205, w: 104, h: 437 }
export const CHEST = { x: 135, y: 470, w: 280, h: 265 }
export const DRAWER = { x: 150, y: 488, w: 250, h: 90 }
export const LAMP = { x: 200, y: 466 }
export const MBOX = { x: 284, y: 404, w: 94, h: 62, ax: 390, ay: 438 }
export const WIN = { x: 455, y: 100, w: 220, h: 270 }
export const RAIL = { x1: 425, x2: 705, y: 86 }
export const NIGHT = { x: 652, y: 346 }
export const RUG = { x: 550, y: 745 }
export const BED = { x: 722, y: 318, w: 416, h: 452, tx: 895, ty: 682, footY: 696, chinY: 482 }
export const SHELF = { x: 775, y: 205, w: 340 }

const WOOD: RGB = [198, 150, 96]
const WOOD_DARK: RGB = [150, 106, 64]
const WOOD_LIGHT: RGB = [222, 180, 124]
const BRASS: RGB = [202, 164, 84]

function lazure(g: CanvasRenderingContext2D, top: string, bottom: string, floorY: number, tints: readonly RGB[], rand: () => number): void {
  const wall = g.createLinearGradient(0, 0, 0, floorY)
  wall.addColorStop(0, top)
  wall.addColorStop(1, bottom)
  g.fillStyle = wall
  g.fillRect(0, 0, W, floorY)
  for (let i = 0; i < 60; i++) {
    const tint = tints[Math.floor(rand() * tints.length)]!
    washBlot(g, rand() * W, rand() * floorY, 70 + rand() * 170, tint, 0.07 + rand() * 0.09)
  }
  // Brush direction: long faint diagonal strokes.
  g.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    const x = rand() * W
    const y = rand() * floorY
    g.strokeStyle = rand() > 0.5 ? `rgba(255,248,230,${0.025 + rand() * 0.03})` : `rgba(200,130,90,${0.012 + rand() * 0.018})`
    g.lineWidth = 14 + rand() * 26
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + 40 + rand() * 60, y - 20 - rand() * 30, x + 110 + rand() * 90, y - 10 + rand() * 30)
    g.stroke()
  }
  speckle(g, 0, 0, W, floorY, 1400, rand, 0.045)
}

function floorBoards(g: CanvasRenderingContext2D, floorY: number, color: RGB, rand: () => number): void {
  const rows = [floorY, floorY + 38, floorY + 86, floorY + 142, H + 4]
  for (let r = 0; r < rows.length - 1; r++) {
    const y = rows[r]!
    const h = rows[r + 1]! - y
    let x = -40 - rand() * 200
    while (x < W) {
      const w = 260 + rand() * 240
      board(g, x, y, w, h, color, rand, false, 2)
      x += w
    }
  }
  // Shadow where the wall meets the floor.
  const sh = g.createLinearGradient(0, floorY, 0, floorY + 30)
  sh.addColorStop(0, 'rgba(90,55,30,0.22)')
  sh.addColorStop(1, 'rgba(90,55,30,0)')
  g.fillStyle = sh
  g.fillRect(0, floorY, W, 30)
  speckle(g, 0, floorY, W, H - floorY, 500, rand, 0.05)
}

function braidedRug(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, colors: readonly string[]): void {
  softShadow(g, cx, cy + 6, rx * 1.05, ry * 1.2, 0.2)
  const rings = colors.length
  for (let i = 0; i < rings; i++) {
    const k = 1 - i / rings
    blobPath(g, cx, cy, rx * k, ry * k, 0.012, i + 3, 18)
    g.fillStyle = colors[i]!
    g.fill()
  }
  // The braid: short slanted stitches round each ring.
  g.lineCap = 'round'
  for (let i = 0; i < rings; i++) {
    const k = 1 - (i + 0.5) / rings
    const n = Math.round(60 * k) + 8
    g.strokeStyle = 'rgba(90,55,40,0.16)'
    g.lineWidth = 1.6
    g.beginPath()
    for (let j = 0; j < n; j++) {
      const a = (j / n) * TAU
      const x = cx + Math.cos(a) * rx * k
      const y = cy + Math.sin(a) * ry * k
      g.moveTo(x - 3, y - 2)
      g.lineTo(x + 3, y + 2)
    }
    g.stroke()
  }
}

function doorway(g: CanvasRenderingContext2D, d: { x: number; y: number; w: number; h: number }, inside: (g: CanvasRenderingContext2D) => void, rand: () => number): void {
  g.save()
  g.beginPath()
  g.rect(d.x, d.y, d.w, d.h)
  g.clip()
  inside(g)
  g.restore()
  board(g, d.x - 12, d.y - 6, 14, d.h + 6, WOOD, rand, true)
  board(g, d.x + d.w - 2, d.y - 6, 14, d.h + 6, WOOD, rand, true)
  board(g, d.x - 18, d.y - 20, d.w + 36, 18, WOOD_LIGHT, rand)
}

export function paintBathroom(g: CanvasRenderingContext2D): void {
  const rand = rng(7)
  const floorY = 660
  lazure(
    g,
    '#f8e9c8',
    '#f3dab2',
    floorY,
    [
      [255, 244, 214],
      [248, 208, 160],
      [250, 226, 176],
      [240, 190, 150],
    ],
    rand,
  )
  // The last sun coming in low from the window.
  washBlot(g, 330, 300, 420, [255, 196, 120], 0.26)
  g.fillStyle = 'rgba(255,214,150,0.16)'
  g.beginPath()
  g.moveTo(262, 84)
  g.lineTo(262, 268)
  g.lineTo(760, 560)
  g.lineTo(900, 380)
  g.closePath()
  g.fill()

  // Wainscot: painted boards, sage with the brush marks left in.
  for (let x = -6; x < W; x += 62) board(g, x, 452, 62, floorY - 452, [198, 208, 176], rand, true, 2)
  board(g, -10, 438, W + 20, 18, [214, 222, 194], rand)

  floorBoards(g, floorY, [212, 168, 112], rand)

  // Window with the evening sky.
  const wx = 70
  const wy = 66
  const ww = 190
  const wh = 206
  const sky = g.createLinearGradient(0, wy, 0, wy + wh)
  sky.addColorStop(0, '#a99cc4')
  sky.addColorStop(0.45, '#e9a9a0')
  sky.addColorStop(0.8, '#f9c887')
  sky.addColorStop(1, '#fbe0a0')
  g.fillStyle = sky
  g.fillRect(wx, wy, ww, wh)
  g.save()
  g.beginPath()
  g.rect(wx, wy, ww, wh)
  g.clip()
  washBlot(g, wx + 120, wy + wh - 26, 90, [255, 236, 170], 0.9)
  g.fillStyle = '#ffdf9a'
  g.beginPath()
  g.arc(wx + 120, wy + wh - 22, 26, 0, TAU)
  g.fill()
  g.fillStyle = '#8f7a8f'
  g.beginPath()
  g.moveTo(wx, wy + wh)
  g.lineTo(wx, wy + wh - 30)
  g.quadraticCurveTo(wx + 50, wy + wh - 62, wx + 104, wy + wh - 28)
  g.quadraticCurveTo(wx + 150, wy + wh - 48, wx + ww, wy + wh - 22)
  g.lineTo(wx + ww, wy + wh)
  g.fill()
  g.fillStyle = 'rgba(255,255,255,0.4)'
  g.beginPath()
  g.ellipse(wx + 60, wy + 74, 44, 9, -0.1, 0, TAU)
  g.ellipse(wx + 130, wy + 52, 34, 7, 0.05, 0, TAU)
  g.fill()
  g.restore()
  board(g, wx - 14, wy - 14, ww + 28, 16, WOOD, rand)
  board(g, wx - 14, wy + wh - 2, ww + 28, 16, WOOD, rand)
  board(g, wx - 14, wy - 14, 16, wh + 28, WOOD, rand, true)
  board(g, wx + ww - 2, wy - 14, 16, wh + 28, WOOD, rand, true)
  board(g, wx + ww / 2 - 4, wy, 8, wh, WOOD, rand, true, 1)
  board(g, wx, wy + wh / 2 - 4, ww, 8, WOOD, rand, false, 1)
  board(g, wx - 24, wy + wh + 12, ww + 48, 14, WOOD_LIGHT, rand)

  // The way through to the bedroom, warm with lamplight.
  doorway(
    g,
    DOOR_A,
    (c) => {
      const glow = c.createRadialGradient(DOOR_A.x + 60, 420, 10, DOOR_A.x + 60, 420, 330)
      glow.addColorStop(0, '#ffe7b0')
      glow.addColorStop(1, '#eeb480')
      c.fillStyle = glow
      c.fillRect(DOOR_A.x, DOOR_A.y, DOOR_A.w, DOOR_A.h)
      c.fillStyle = '#d9a468'
      c.fillRect(DOOR_A.x, 618, DOOR_A.w, 60)
      // A corner of the bed and its blanket, far off.
      c.fillStyle = '#c6935c'
      c.fillRect(DOOR_A.x + 62, 500, 60, 130)
      c.fillStyle = '#93a6c6'
      c.fillRect(DOOR_A.x + 62, 546, 60, 84)
      c.fillStyle = '#f6ecd8'
      c.beginPath()
      c.ellipse(DOOR_A.x + 96, 532, 30, 14, 0, 0, TAU)
      c.fill()
    },
    rand,
  )
  // Lamplight spilling onto the bathroom floor.
  g.fillStyle = 'rgba(255,222,160,0.24)'
  g.beginPath()
  g.moveTo(DOOR_A.x, floorY + 2)
  g.lineTo(DOOR_A.x + DOOR_A.w, floorY + 2)
  g.lineTo(W, 800)
  g.lineTo(DOOR_A.x - 150, 800)
  g.closePath()
  g.fill()

  // Peg rail for the towel.
  board(g, 898, 226, 156, 20, WOOD, rand)
  for (const px of [925, 975, 1025]) {
    g.fillStyle = rgb(WOOD_DARK)
    g.beginPath()
    g.arc(px, 240, 8, 0, TAU)
    g.fill()
    g.fillStyle = rgb(WOOD_LIGHT)
    g.beginPath()
    g.arc(px - 2, 238, 4, 0, TAU)
    g.fill()
  }

  // A low bench for the soap and the jug.
  softShadow(g, 972, 742, 110, 18, 0.2)
  board(g, 908, 628, 16, 110, WOOD_DARK, rand, true)
  board(g, 1022, 628, 16, 110, WOOD_DARK, rand, true)
  board(g, 918, 690, 110, 12, WOOD_DARK, rand)
  board(g, 890, 612, 164, 20, WOOD_LIGHT, rand, false, 5)
  // Soap dish.
  g.fillStyle = '#b9c7c4'
  g.beginPath()
  g.ellipse(SOAP_HOME.x, 610, 40, 10, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#e8efe8'
  g.beginPath()
  g.ellipse(SOAP_HOME.x, 607, 40, 10, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#cfdcd6'
  g.beginPath()
  g.ellipse(SOAP_HOME.x, 608, 30, 6, 0, 0, TAU)
  g.fill()

  // Bath mat.
  braidedRug(g, MAT.x, MAT.y + 8, 152, 36, ['#d59484', '#f1e0c2', '#d9a25e', '#f1e0c2', '#d59484', '#e9c9a8'])

  // The tap: brass, from the wall.
  g.fillStyle = rgb([150, 118, 56])
  g.beginPath()
  g.arc(348, 334, 22, 0, TAU)
  g.fill()
  g.fillStyle = rgb(BRASS)
  g.beginPath()
  g.arc(346, 332, 20, 0, TAU)
  g.fill()
  g.lineCap = 'round'
  g.strokeStyle = rgb([150, 118, 56])
  g.lineWidth = 20
  g.beginPath()
  g.moveTo(350, 336)
  g.quadraticCurveTo(398, 330, TAP.sx, TAP.sy - 8)
  g.stroke()
  g.strokeStyle = rgb(BRASS)
  g.lineWidth = 15
  g.beginPath()
  g.moveTo(348, 333)
  g.quadraticCurveTo(396, 327, TAP.sx - 1, TAP.sy - 9)
  g.stroke()
  g.strokeStyle = 'rgba(255,246,210,0.6)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(354, 328)
  g.quadraticCurveTo(388, 324, TAP.sx - 6, 352)
  g.stroke()
  g.strokeStyle = rgb(BRASS)
  g.lineWidth = 9
  g.beginPath()
  g.moveTo(TAP.hx, 328)
  g.lineTo(TAP.hx, TAP.hy + 6)
  g.stroke()

  // The wooden tub, its inside and back rim. The front is a separate sprite.
  softShadow(g, TUB.cx, TUB.bottom + 22, TUB.rx * 1.05, 34, 0.26)
  const inside = g.createLinearGradient(0, TUB.rimY - TUB.ry, 0, TUB.rimY + TUB.ry)
  inside.addColorStop(0, '#a37c50')
  inside.addColorStop(1, '#7d5c3a')
  g.fillStyle = inside
  g.beginPath()
  g.ellipse(TUB.cx, TUB.rimY, TUB.rx, TUB.ry, 0, 0, TAU)
  g.fill()
  g.strokeStyle = 'rgba(70,45,25,0.25)'
  g.lineWidth = 1.5
  g.beginPath()
  for (let i = 1; i < 14; i++) {
    const x = TUB.cx - TUB.rx + (i / 14) * TUB.rx * 2
    const dy = TUB.ry * Math.sqrt(Math.max(0, 1 - ((x - TUB.cx) / TUB.rx) ** 2))
    g.moveTo(x, TUB.rimY - dy)
    g.lineTo(x + (x - TUB.cx) * -0.04, TUB.rimY + dy)
  }
  g.stroke()
  g.strokeStyle = rgb(WOOD_LIGHT)
  g.lineWidth = 11
  g.beginPath()
  g.ellipse(TUB.cx, TUB.rimY, TUB.rx - 3, TUB.ry, 0, Math.PI, TAU)
  g.stroke()
}

// The front of the tub: staves and two hoops. Drawn over Teddy and the water.
export const TUB_FRONT = { x: TUB.cx - TUB.rx - 16, y: TUB.rimY - 12, w: TUB.rx * 2 + 32, h: TUB.bottom - TUB.rimY + 50 }

export function paintTubFront(g: CanvasRenderingContext2D): void {
  const rand = rng(21)
  const { cx, rimY, rx, ry, bottom } = TUB
  const shape = () => {
    g.beginPath()
    g.moveTo(cx - rx, rimY)
    g.quadraticCurveTo(cx - rx - 4, (rimY + bottom) / 2, cx - rx + 30, bottom)
    g.quadraticCurveTo(cx, bottom + 34, cx + rx - 30, bottom)
    g.quadraticCurveTo(cx + rx + 4, (rimY + bottom) / 2, cx + rx, rimY)
    g.ellipse(cx, rimY, rx, ry, 0, 0, Math.PI)
    g.closePath()
  }
  shape()
  const wood = g.createLinearGradient(cx - rx, 0, cx + rx, 0)
  wood.addColorStop(0, '#b78a55')
  wood.addColorStop(0.35, '#dcb47c')
  wood.addColorStop(0.7, '#cfa46b')
  wood.addColorStop(1, '#a87c4a')
  g.fillStyle = wood
  g.fill()
  g.save()
  g.clip()
  // Staves.
  for (let i = 0; i <= 13; i++) {
    const k = i / 13
    const xt = cx - rx + k * rx * 2
    const xb = cx - rx + 30 + k * (rx * 2 - 60)
    if (i < 13) {
      g.fillStyle = rand() > 0.5 ? `rgba(255,236,200,${0.05 + rand() * 0.08})` : `rgba(110,70,35,${0.04 + rand() * 0.07})`
      g.beginPath()
      g.moveTo(xt, rimY - 10)
      g.lineTo(xt + (rx * 2) / 13, rimY - 10)
      g.lineTo(xb + (rx * 2 - 60) / 13, bottom + 40)
      g.lineTo(xb, bottom + 40)
      g.closePath()
      g.fill()
    }
    g.strokeStyle = 'rgba(96,60,30,0.38)'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(xt, rimY - 10)
    g.quadraticCurveTo((xt + xb) / 2 + (k - 0.5) * 6, (rimY + bottom) / 2, xb, bottom + 40)
    g.stroke()
  }
  // Grain.
  g.lineCap = 'round'
  for (let i = 0; i < 70; i++) {
    const x = cx - rx + rand() * rx * 2
    const y = rimY + rand() * (bottom - rimY)
    g.strokeStyle = `rgba(110,70,35,${0.05 + rand() * 0.08})`
    g.lineWidth = 1 + rand() * 1.5
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + (rand() - 0.5) * 4, y + 30 + rand() * 60)
    g.stroke()
  }
  // Shade towards the bottom.
  const shade = g.createLinearGradient(0, rimY, 0, bottom + 30)
  shade.addColorStop(0, 'rgba(80,45,20,0)')
  shade.addColorStop(1, 'rgba(80,45,20,0.28)')
  g.fillStyle = shade
  g.fillRect(cx - rx - 10, rimY, rx * 2 + 20, bottom - rimY + 40)
  // Hoops: dark iron, following the curve of the tub.
  for (const [off, squeeze] of [
    [62, 5],
    [158, 20],
  ] as const) {
    g.strokeStyle = '#5c5048'
    g.lineWidth = 15
    g.beginPath()
    g.ellipse(cx, rimY + off, rx - squeeze + 6, ry, 0, 0, Math.PI)
    g.stroke()
    g.strokeStyle = 'rgba(210,200,190,0.35)'
    g.lineWidth = 2.5
    g.beginPath()
    g.ellipse(cx, rimY + off - 4, rx - squeeze + 6, ry, 0, 0.3, Math.PI - 0.3)
    g.stroke()
  }
  g.restore()
  // The front of the rim.
  g.strokeStyle = '#e6c48e'
  g.lineWidth = 11
  g.lineCap = 'round'
  g.beginPath()
  g.ellipse(cx, rimY, rx - 3, ry, 0, 0, Math.PI)
  g.stroke()
  g.strokeStyle = 'rgba(255,246,220,0.55)'
  g.lineWidth = 3
  g.beginPath()
  g.ellipse(cx, rimY - 3, rx - 5, ry, 0, 0.5, Math.PI - 1.2)
  g.stroke()
}

export function paintBedroom(g: CanvasRenderingContext2D): void {
  const rand = rng(53)
  const floorY = 640
  lazure(
    g,
    '#f8d8b4',
    '#f2c49c',
    floorY,
    [
      [255, 226, 190],
      [244, 176, 150],
      [250, 206, 150],
      [240, 168, 140],
    ],
    rand,
  )
  floorBoards(g, floorY, [206, 160, 106], rand)

  // The doorway back to the bathroom. What shows through it is drawn live.
  doorway(
    g,
    DOOR_B,
    (c) => {
      const dim = c.createLinearGradient(0, DOOR_B.y, 0, DOOR_B.y + DOOR_B.h)
      dim.addColorStop(0, '#8a7f92')
      dim.addColorStop(0.75, '#9a8a90')
      dim.addColorStop(0.76, '#84766e')
      dim.addColorStop(1, '#7a6c64')
      c.fillStyle = dim
      c.fillRect(DOOR_B.x, DOOR_B.y, DOOR_B.w, DOOR_B.h)
      // The tub, left in the dusk.
      c.fillStyle = '#6f6260'
      c.beginPath()
      c.ellipse(DOOR_B.x + 30, 520, 62, 12, 0, 0, TAU)
      c.fill()
      c.fillStyle = '#77695f'
      c.fillRect(DOOR_B.x - 32, 520, 124, 70)
    },
    rand,
  )

  // Rug.
  braidedRug(g, RUG.x, RUG.y + 6, 190, 42, ['#e9d7b4', '#8fa2c0', '#f1e3c6', '#d6a25c', '#f1e3c6', '#c98b7c', '#f1e3c6'])

  // Chest of drawers.
  softShadow(g, CHEST.x + CHEST.w / 2, CHEST.y + CHEST.h + 8, CHEST.w * 0.6, 20, 0.24)
  board(g, CHEST.x + 8, CHEST.y + CHEST.h - 6, 16, 16, WOOD_DARK, rand, true)
  board(g, CHEST.x + CHEST.w - 24, CHEST.y + CHEST.h - 6, 16, 16, WOOD_DARK, rand, true)
  board(g, CHEST.x, CHEST.y, CHEST.w, CHEST.h, WOOD, rand, false, 8)
  // The top drawer's cavity; the drawer itself is drawn live.
  g.fillStyle = '#6f4e30'
  g.beginPath()
  g.roundRect(DRAWER.x, DRAWER.y, DRAWER.w, DRAWER.h, 6)
  g.fill()
  for (let i = 0; i < 2; i++) {
    const y = DRAWER.y + DRAWER.h + 10 + i * 72
    board(g, DRAWER.x, y, DRAWER.w, 62, WOOD_LIGHT, rand, false, 6)
    for (const kx of [DRAWER.x + 62, DRAWER.x + DRAWER.w - 62]) knob(g, kx, y + 31)
  }
  board(g, CHEST.x - 8, CHEST.y - 10, CHEST.w + 16, 18, WOOD_LIGHT, rand, false, 6)

  // Lamp base: turned wood.
  g.fillStyle = rgb(WOOD_DARK)
  g.beginPath()
  g.ellipse(LAMP.x, LAMP.y - 6, 30, 9, 0, 0, TAU)
  g.fill()
  g.fillStyle = rgb(WOOD)
  g.beginPath()
  g.ellipse(LAMP.x, LAMP.y - 10, 28, 8, 0, 0, TAU)
  g.fill()
  g.strokeStyle = rgb(WOOD_DARK)
  g.lineWidth = 15
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(LAMP.x, LAMP.y - 14)
  g.lineTo(LAMP.x, LAMP.y - 70)
  g.stroke()
  g.strokeStyle = rgb(WOOD)
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(LAMP.x - 1, LAMP.y - 15)
  g.lineTo(LAMP.x - 1, LAMP.y - 70)
  g.stroke()
  g.fillStyle = rgb(WOOD)
  g.beginPath()
  g.ellipse(LAMP.x, LAMP.y - 38, 13, 11, 0, 0, TAU)
  g.fill()

  // Window frame and sill; sky and curtains are live.
  g.fillStyle = '#3b4468'
  g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h)
  board(g, WIN.x - 14, WIN.y - 14, WIN.w + 28, 16, WOOD, rand)
  board(g, WIN.x - 14, WIN.y - 14, 16, WIN.h + 26, WOOD, rand, true)
  board(g, WIN.x + WIN.w - 2, WIN.y - 14, 16, WIN.h + 26, WOOD, rand, true)
  board(g, WIN.x - 26, WIN.y + WIN.h, WIN.w + 52, 16, WOOD_LIGHT, rand, false, 5)
  // Curtain rail.
  g.strokeStyle = rgb(WOOD_DARK)
  g.lineWidth = 9
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(RAIL.x1, RAIL.y)
  g.lineTo(RAIL.x2, RAIL.y)
  g.stroke()
  g.strokeStyle = rgb(WOOD_LIGHT)
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(RAIL.x1, RAIL.y - 2)
  g.lineTo(RAIL.x2, RAIL.y - 2)
  g.stroke()
  for (const x of [RAIL.x1 - 4, RAIL.x2 + 4]) {
    g.fillStyle = rgb(WOOD)
    g.beginPath()
    g.arc(x, RAIL.y, 9, 0, TAU)
    g.fill()
  }

  // Shelf for the friends.
  board(g, SHELF.x, SHELF.y, SHELF.w, 15, WOOD_LIGHT, rand, false, 4)
  for (const bx of [SHELF.x + 40, SHELF.x + SHELF.w - 40]) {
    g.fillStyle = rgb(WOOD_DARK)
    g.beginPath()
    g.moveTo(bx - 6, SHELF.y + 14)
    g.lineTo(bx + 6, SHELF.y + 14)
    g.lineTo(bx + 5, SHELF.y + 44)
    g.quadraticCurveTo(bx - 4, SHELF.y + 40, bx - 6, SHELF.y + 14)
    g.fill()
  }

  // The bed, seen as a picture book shows it: tipped up so we can tuck in.
  const bx = BED.x
  const bw = BED.w
  softShadow(g, bx + bw / 2, BED.y + BED.h + 22, bw * 0.62, 26, 0.26)
  // Headboard.
  wobblyRect(g, bx - 12, 268, bw + 24, 150, 40, 1.5, rand)
  g.fillStyle = rgb(WOOD)
  g.fill()
  g.save()
  g.clip()
  for (let i = 0; i < 26; i++) {
    g.strokeStyle = `rgba(110,70,35,${0.05 + rand() * 0.08})`
    g.lineWidth = 1 + rand() * 2
    const y = 272 + rand() * 140
    g.beginPath()
    g.moveTo(bx - 12, y)
    g.bezierCurveTo(bx + bw * 0.3, y + (rand() - 0.5) * 14, bx + bw * 0.7, y + (rand() - 0.5) * 14, bx + bw + 12, y)
    g.stroke()
  }
  g.restore()
  g.strokeStyle = 'rgba(90,55,25,0.25)'
  g.lineWidth = 2
  g.stroke()
  // A small heart cut out of the headboard, as on a country bed.
  g.fillStyle = 'rgba(110,70,40,0.45)'
  g.beginPath()
  const hx = bx + bw / 2
  g.moveTo(hx, 312)
  g.bezierCurveTo(hx - 22, 290, hx - 14, 278, hx, 290)
  g.bezierCurveTo(hx + 14, 278, hx + 22, 290, hx, 312)
  g.fill()
  for (const px of [bx - 12, bx + bw - 6]) {
    board(g, px, 286, 18, BED.y + BED.h - 262, WOOD_DARK, rand, true, 6)
    g.fillStyle = rgb(WOOD)
    g.beginPath()
    g.arc(px + 9, 280, 14, 0, TAU)
    g.fill()
  }
  // Mattress and sheet.
  wobblyRect(g, bx, BED.y, bw, BED.h, 18, 1.5, rand)
  g.fillStyle = '#f6ecd8'
  g.fill()
  g.save()
  g.clip()
  for (let i = 0; i < 14; i++) washBlot(g, bx + rand() * bw, BED.y + rand() * BED.h, 60 + rand() * 80, [226, 208, 180], 0.12)
  speckle(g, bx, BED.y, bw, BED.h, 320, rand, 0.05)
  g.restore()
  // The sheet falls away to the sides and is smoothed flat in the middle.
  const side = g.createLinearGradient(bx, 0, bx + bw, 0)
  side.addColorStop(0, 'rgba(150,120,90,0.22)')
  side.addColorStop(0.09, 'rgba(150,120,90,0)')
  side.addColorStop(0.91, 'rgba(150,120,90,0)')
  side.addColorStop(1, 'rgba(150,120,90,0.24)')
  g.fillStyle = side
  g.fillRect(bx, BED.y + 10, bw, BED.h - 10)
  g.strokeStyle = 'rgba(190,168,136,0.3)'
  g.lineWidth = 2
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(bx + 60, 520)
  g.quadraticCurveTo(bx + 120, 536, bx + 170, 524)
  g.moveTo(bx + bw - 70, 580)
  g.quadraticCurveTo(bx + bw - 130, 570, bx + bw - 190, 584)
  g.moveTo(bx + 90, 640)
  g.quadraticCurveTo(bx + 190, 628, bx + 260, 642)
  g.stroke()
  // Pillow.
  softShadow(g, bx + bw / 2, 412, 190, 62, 0.16)
  blobPath(g, bx + bw / 2, 392, 186, 62, 0.035, 5, 14)
  g.fillStyle = '#e6d9c0'
  g.fill()
  blobPath(g, bx + bw / 2 - 3, 388, 180, 57, 0.035, 5, 14)
  g.fillStyle = '#fbf4e4'
  g.fill()
  g.strokeStyle = 'rgba(190,170,140,0.35)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(bx + 46, 372)
  g.quadraticCurveTo(bx + 76, 392, bx + 50, 412)
  g.moveTo(bx + bw - 46, 372)
  g.quadraticCurveTo(bx + bw - 76, 392, bx + bw - 50, 412)
  g.stroke()
  // Footboard.
  board(g, bx - 14, BED.y + BED.h - 4, bw + 28, 24, WOOD, rand, false, 10)
}

function knob(g: CanvasRenderingContext2D, x: number, y: number): void {
  g.fillStyle = rgb(WOOD_DARK)
  g.beginPath()
  g.arc(x, y + 2, 10, 0, TAU)
  g.fill()
  g.fillStyle = rgb(WOOD)
  g.beginPath()
  g.arc(x, y, 9, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(255,240,210,0.5)'
  g.beginPath()
  g.arc(x - 3, y - 3, 3, 0, TAU)
  g.fill()
}

export function drawKnob(g: CanvasRenderingContext2D, x: number, y: number): void {
  knob(g, x, y)
}
