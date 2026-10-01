// Everything in Flower Table that is painted once and kept: the garden and
// the room behind the table, the glass vases, the jug, the pail, the cat, the
// brush. Also where things stand.

import { H, W } from '../../kit/types.ts'
import { TAU, fillBlob, grain, makeSprite, mix, rgba, shade, tooth, wash } from './paint.ts'
import type { G, Sprite } from './paint.ts'
import type { Season } from './flora.ts'

// The post that divides the garden from the room.
export const POST_L = 396
export const POST_R = 420
// Where the two rows of plants root.
export const BACK_Y = 682
export const FRONT_Y = 700
export const TABLE_L = 436
export const TABLE_BACK = 610
export const TABLE_FRONT = 778
// Where a vase stands on the work table.
export const VASE_Y = 708
// How small a vase looks once it is in the room behind.
export const ROOM_S = 0.72
// The windowsill, the dining table, beside the cat.
export const PLACES = [
  { x: 598, y: 311 },
  { x: 842, y: 431 },
  { x: 984, y: 391 },
] as const
export const PAIL = { x: 1110, y: 706, rimY: 610, rx: 54 } as const
export const NAIL = { x: 408, y: 392 } as const
export const CAT = { x: 1098, y: 389 } as const
export const WINDOW = { l: 492, r: 704, t: 96, b: 296 } as const

interface Outdoors {
  skyTop: string
  skyBot: string
  hill: string
  hill2: string
  grass: string
  grass2: string
  crown: string[]
  trunk: string
  soil: string
}

const OUT: Record<Season, Outdoors> = {
  spring: { skyTop: '#bfe0ea', skyBot: '#f8f0d8', hill: '#c3d9a4', hill2: '#a6c98a', grass: '#b4d488', grass2: '#9cc474', crown: ['#f3b4c4', '#f8cdd6', '#fbe3e6'], trunk: '#8a644a', soil: '#6e4c34' },
  summer: { skyTop: '#a5d5ee', skyBot: '#f0f5dc', hill: '#b3d295', hill2: '#90bd78', grass: '#a5cf7c', grass2: '#8cbc68', crown: ['#5c9150', '#74a560', '#8dba70'], trunk: '#84603f', soil: '#6a4a33' },
  autumn: { skyTop: '#c2dbe2', skyBot: '#fbe8c6', hill: '#dccb8f', hill2: '#cdb06c', grass: '#c9c784', grass2: '#b5b56e', crown: ['#cf6a30', '#e08e3c', '#edb650'], trunk: '#7f5a3e', soil: '#6b4931' },
  winter: { skyTop: '#ccd8e6', skyBot: '#f4eee8', hill: '#eef1f3', hill2: '#e0e7eb', grass: '#edf0ee', grass2: '#dfe5e4', crown: [], trunk: '#7a6252', soil: '#75584a' },
}

const WOOD = '#c79c68'
const WOOD_DARK = '#a97d50'
const WOOD_PALE = '#dcbb8c'

function poly(g: G, pts: readonly number[], fill: string): void {
  g.beginPath()
  g.moveTo(pts[0]!, pts[1]!)
  for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i]!, pts[i + 1]!)
  g.closePath()
  g.fillStyle = fill
  g.fill()
}

function tree(g: G, src: Outdoors, rng: () => number, x: number, ground: number, size: number, fade = 0): void {
  const pal = fade > 0 ? { ...src, trunk: mix(src.trunk, src.hill, fade), crown: src.crown.map((c) => mix(c, src.hill, fade)) } : src
  g.fillStyle = pal.trunk
  g.beginPath()
  g.moveTo(x - size * 0.11, ground)
  g.quadraticCurveTo(x - size * 0.05, ground - size * 0.9, x - size * 0.07, ground - size * 1.5)
  g.lineTo(x + size * 0.07, ground - size * 1.5)
  g.quadraticCurveTo(x + size * 0.06, ground - size * 0.9, x + size * 0.14, ground)
  g.closePath()
  g.fill()
  g.strokeStyle = pal.trunk
  g.lineCap = 'round'
  const limbs: [number, number, number][] = [
    [-0.75, -2.0, 0.07],
    [0.8, -2.1, 0.07],
    [-0.3, -2.5, 0.06],
    [0.35, -2.55, 0.05],
    [-1.0, -1.55, 0.04],
    [1.05, -1.6, 0.04],
  ]
  for (const [dx, dy, wdt] of limbs) {
    g.lineWidth = size * wdt
    g.beginPath()
    g.moveTo(x, ground - size * 1.35)
    g.quadraticCurveTo(x + dx * size * 0.3, ground - size * 1.7, x + dx * size, ground + dy * size)
    g.stroke()
  }
  const cy = ground - size * 2.05
  if (pal.crown.length === 0) {
    // Winter: bare twigs with a little snow lying on them.
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (rng() - 0.5) * 2.6
      const r0 = size * (0.5 + rng() * 0.5)
      const r1 = r0 + size * (0.3 + rng() * 0.3)
      g.lineWidth = 2.2
      g.beginPath()
      g.moveTo(x + Math.cos(a) * r0, cy + size * 0.5 + Math.sin(a) * r0)
      g.lineTo(x + Math.cos(a + 0.2) * r1, cy + size * 0.5 + Math.sin(a + 0.2) * r1)
      g.stroke()
    }
    for (const [dx, dy] of limbs) fillBlob(g, x + dx * size * 0.8, ground + dy * size - 4, size * 0.2, 5, rng, 'rgba(255,255,255,0.85)', 0.2)
    return
  }
  for (let i = 0; i < 16; i++) {
    const a = rng() * TAU
    const r = Math.sqrt(rng()) * size * 0.95
    const color = pal.crown[i < 6 ? 0 : i < 11 ? 1 : 2]!
    fillBlob(g, x + Math.cos(a) * r * 1.15, cy + Math.sin(a) * r * 0.85, size * (0.42 + rng() * 0.26), size * (0.36 + rng() * 0.22), rng, rgba(color, 0.9), 0.12)
  }
  for (let i = 0; i < 26; i++) {
    const a = rng() * TAU
    const r = Math.sqrt(rng()) * size * 1.3
    fillBlob(g, x + Math.cos(a) * r, cy + Math.sin(a) * r * 0.8, 5 + rng() * 6, 4 + rng() * 4, rng, rgba(shade(pal.crown[2]!, 0.25), 0.5), 0.2, rng() * 3)
  }
}

function paintOutdoors(g: G, pal: Outdoors, season: Season, rng: () => number): void {
  g.save()
  g.beginPath()
  g.rect(0, 0, POST_R, H)
  g.clip()
  const sky = g.createLinearGradient(0, 0, 0, 560)
  sky.addColorStop(0, pal.skyTop)
  sky.addColorStop(1, pal.skyBot)
  g.fillStyle = sky
  g.fillRect(0, 0, POST_R, H)
  wash(g, 0, 0, POST_R, 420, rng, ['#ffffff', '#fff6dc'], 9, 50, 130, 0.5)
  const sun = g.createRadialGradient(300, 110, 0, 300, 110, 210)
  sun.addColorStop(0, 'rgba(255,246,205,0.85)')
  sun.addColorStop(1, 'rgba(255,246,205,0)')
  g.fillStyle = sun
  g.fillRect(60, -110, 440, 440)

  g.fillStyle = pal.hill
  g.beginPath()
  g.moveTo(-10, 470)
  g.bezierCurveTo(90, 396, 220, 418, 300, 450)
  g.bezierCurveTo(350, 468, 400, 440, 430, 428)
  g.lineTo(430, 640)
  g.lineTo(-10, 640)
  g.fill()
  wash(g, 0, 400, POST_R, 160, rng, [shade(pal.hill, 0.3), shade(pal.hill, -0.12)], 10, 30, 90, 0.4)

  tree(g, pal, rng, 318, 470, 36, 0.3)
  tree(g, pal, rng, 64, 478, 30, 0.38)
  tree(g, pal, rng, 150, 452, 22, 0.45)

  g.fillStyle = pal.hill2
  g.beginPath()
  g.moveTo(-10, 528)
  g.bezierCurveTo(120, 486, 280, 500, 430, 520)
  g.lineTo(430, 660)
  g.lineTo(-10, 660)
  g.fill()

  // A low wattle fence at the far side of the garden.
  for (let x = 196; x < POST_R + 20; x += 38) {
    g.strokeStyle = rgba('#8c6846', 0.75)
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(x, 494 + rng() * 5)
    g.lineTo(x + (rng() - 0.5) * 3, 552)
    g.stroke()
  }
  for (let row = 0; row < 4; row++) {
    g.strokeStyle = rgba(row % 2 === 0 ? '#a37a52' : '#93704a', 0.7)
    g.lineWidth = 4.5
    g.beginPath()
    const y = 506 + row * 11
    g.moveTo(186, y)
    for (let x = 196; x < POST_R + 20; x += 19) g.quadraticCurveTo(x - 9, y + ((x / 19 + row) % 2 < 1 ? -3 : 3), x, y)
    g.stroke()
  }

  const grass = g.createLinearGradient(0, 540, 0, H)
  grass.addColorStop(0, pal.grass)
  grass.addColorStop(1, pal.grass2)
  g.fillStyle = grass
  g.beginPath()
  g.moveTo(-10, 556)
  g.bezierCurveTo(120, 540, 300, 548, 430, 544)
  g.lineTo(430, H)
  g.lineTo(-10, H)
  g.fill()
  wash(g, 0, 545, POST_R, 280, rng, [shade(pal.grass, 0.25), shade(pal.grass2, -0.15)], 16, 30, 100, 0.35)
  for (let i = 0; i < 90; i++) {
    const x = rng() * POST_R
    const y = 560 + rng() * 110
    g.strokeStyle = rgba(shade(pal.grass2, rng() < 0.5 ? -0.25 : 0.3), 0.5)
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(x, y)
    g.quadraticCurveTo(x + (rng() - 0.5) * 6, y - 8, x + (rng() - 0.5) * 10, y - 12 - rng() * 8)
    g.stroke()
  }

  // The bed: dark crumbly earth.
  poly(g, [24, 656, 382, 656, 398, 716, 0, 716], pal.soil)
  g.save()
  g.beginPath()
  g.moveTo(24, 656)
  g.lineTo(382, 656)
  g.lineTo(398, 716)
  g.lineTo(0, 716)
  g.closePath()
  g.clip()
  for (let i = 0; i < 260; i++) {
    const light = rng() < 0.45
    fillBlob(g, rng() * 400, 656 + rng() * 60, 2 + rng() * 5, 1.5 + rng() * 3, rng, rgba(light ? shade(pal.soil, 0.22) : shade(pal.soil, -0.3), 0.55), 0.3)
  }
  if (season === 'winter') {
    for (let i = 0; i < 9; i++) fillBlob(g, rng() * 400, 660 + rng() * 50, 14 + rng() * 26, 4 + rng() * 5, rng, 'rgba(255,255,255,0.8)', 0.2)
  }
  g.restore()
  g.restore()
}

function paintWindow(g: G, pal: Outdoors, rng: () => number): void {
  const { l, r, t, b } = WINDOW
  g.save()
  g.beginPath()
  g.rect(l, t, r - l, b - t)
  g.clip()
  const sky = g.createLinearGradient(0, t, 0, b)
  sky.addColorStop(0, pal.skyTop)
  sky.addColorStop(1, pal.skyBot)
  g.fillStyle = sky
  g.fillRect(l, t, r - l, b - t)
  wash(g, l, t, r - l, 120, rng, ['#ffffff'], 5, 30, 70, 0.6)
  g.fillStyle = pal.hill
  g.beginPath()
  g.moveTo(l - 10, 250)
  g.bezierCurveTo(l + 60, 214, l + 150, 230, r + 10, 244)
  g.lineTo(r + 10, b + 10)
  g.lineTo(l - 10, b + 10)
  g.fill()
  g.fillStyle = pal.hill2
  g.beginPath()
  g.moveTo(l - 10, 276)
  g.bezierCurveTo(l + 80, 258, l + 160, 268, r + 10, 262)
  g.lineTo(r + 10, b + 10)
  g.lineTo(l - 10, b + 10)
  g.fill()
  tree(g, pal, rng, r - 34, 270, 38)
  g.restore()

  // Frame, glazing bars, sill.
  g.strokeStyle = WOOD
  g.lineWidth = 13
  g.strokeRect(l - 5, t - 5, r - l + 10, b - t + 10)
  g.strokeStyle = rgba(shade(WOOD, 0.3), 0.6)
  g.lineWidth = 2
  g.strokeRect(l - 9, t - 9, r - l + 18, b - t + 18)
  g.strokeStyle = rgba(shade(WOOD, -0.3), 0.45)
  g.strokeRect(l + 1, t + 1, r - l - 2, b - t - 2)
  g.fillStyle = WOOD
  g.fillRect((l + r) / 2 - 4, t, 8, b - t)
  g.fillRect(l, t + 92, r - l, 7)
  g.fillStyle = 'rgba(60,35,15,0.16)'
  g.fillRect(l - 26, b + 26, r - l + 52, 9)
  poly(g, [l - 22, b + 6, r + 22, b + 6, r + 30, b + 20, l - 30, b + 20], shade(WOOD, 0.22))
  poly(g, [l - 30, b + 20, r + 30, b + 20, r + 28, b + 29, l - 28, b + 29], WOOD_DARK)
  grain(g, l - 26, b + 7, r - l + 52, 12, rng, '#7a5530', 8)
  // Curtain rod.
  g.strokeStyle = WOOD_DARK
  g.lineWidth = 6
  g.beginPath()
  g.moveTo(l - 34, t - 20)
  g.lineTo(r + 34, t - 20)
  g.stroke()
  fillBlob(g, l - 36, t - 20, 7, 7, rng, WOOD_DARK)
  fillBlob(g, r + 36, t - 20, 7, 7, rng, WOOD_DARK)
}

function paintRoom(g: G, rng: () => number): void {
  const x0 = POST_R
  // A lazured wall: thin warm colour laid on in clouds.
  const wall = g.createLinearGradient(0, 0, 0, 510)
  wall.addColorStop(0, '#f6d9bd')
  wall.addColorStop(1, '#f7e8cf')
  g.fillStyle = wall
  g.fillRect(x0, 0, W - x0, 514)
  wash(g, x0, 0, W - x0, 514, rng, ['#f3bfa8', '#fae3ad', '#fdf3e0', '#f0b39f', '#fbe9c8'], 46, 70, 230, 0.26)

  // Floor.
  const floor = g.createLinearGradient(0, 514, 0, 620)
  floor.addColorStop(0, '#c0935f')
  floor.addColorStop(1, '#ad7f4e')
  g.fillStyle = floor
  g.fillRect(x0, 514, W - x0, H - 514)
  grain(g, x0, 514, W - x0, 100, rng, '#7a5530', 40)
  g.strokeStyle = 'rgba(100,65,30,0.25)'
  g.lineWidth = 1.5
  for (const y of [530, 550, 576]) {
    g.beginPath()
    g.moveTo(x0, y)
    g.lineTo(W, y)
    g.stroke()
  }
  // Skirting board.
  g.fillStyle = shade(WOOD_PALE, 0.1)
  g.fillRect(x0, 500, W - x0, 15)
  g.fillStyle = 'rgba(100,65,30,0.2)'
  g.fillRect(x0, 513, W - x0, 3)

  // Sunlight from the garden door, across wall and floor.
  poly(g, [x0, 70, x0 + 60, 70, x0 + 250, 500, x0, 500], 'rgba(255,240,190,0.2)')
  poly(g, [x0, 515, x0 + 256, 515, x0 + 330, 612, x0, 612], 'rgba(255,238,180,0.12)')
}

function paintFurniture(g: G, rng: () => number): void {
  // A stool under the window.
  g.strokeStyle = WOOD_DARK
  g.lineWidth = 7
  for (const [x1, x2] of [
    [686, 678],
    [706, 706],
    [726, 734],
  ] as const) {
    g.beginPath()
    g.moveTo(x1, 520)
    g.lineTo(x2, 590)
    g.stroke()
  }
  fillBlob(g, 706, 516, 38, 10, rng, WOOD, 0.04)
  fillBlob(g, 706, 513, 36, 8, rng, shade(WOOD, 0.2), 0.04)

  // The dining table under a linen cloth.
  g.save()
  g.translate(-14, 0)
  g.strokeStyle = WOOD_DARK
  g.lineWidth = 10
  for (const [x1, x2] of [
    [800, 794],
    [912, 918],
  ] as const) {
    g.beginPath()
    g.moveTo(x1, 470)
    g.lineTo(x2, 590)
    g.stroke()
  }
  g.fillStyle = '#eadfc8'
  g.beginPath()
  g.moveTo(740, 432)
  g.lineTo(746, 478)
  for (let i = 0; i < 6; i++) {
    const xa = 746 + (i * 220) / 6
    const xb = 746 + ((i + 1) * 220) / 6
    g.quadraticCurveTo((xa + xb) / 2, 492 + (i % 2) * 4, xb, 478)
  }
  g.lineTo(972, 432)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(150,120,80,0.2)'
  g.lineWidth = 1.5
  for (let i = 1; i < 6; i++) {
    const x = 746 + (i * 220) / 6
    g.beginPath()
    g.moveTo(x + (rng() - 0.5) * 6, 446)
    g.lineTo(x, 478)
    g.stroke()
  }
  fillBlob(g, 856, 432, 118, 23, rng, '#f8f1e0', 0.02)
  g.strokeStyle = 'rgba(214,150,140,0.5)'
  g.lineWidth = 2.5
  g.beginPath()
  g.ellipse(856, 432, 100, 18, 0, 0, TAU)
  g.stroke()
  g.strokeStyle = 'rgba(214,150,140,0.3)'
  g.lineWidth = 1.2
  g.beginPath()
  g.ellipse(856, 432, 92, 16, 0, 0, TAU)
  g.stroke()

  g.restore()

  // The sideboard with the cat's cushion.
  g.fillStyle = '#d4b083'
  g.fillRect(944, 398, 254, 200)
  grain(g, 944, 398, 254, 200, rng, '#7a5530', 34, true)
  g.strokeStyle = 'rgba(110,75,40,0.4)'
  g.lineWidth = 2.5
  g.strokeRect(958, 420, 100, 150)
  g.strokeRect(1070, 420, 100, 150)
  fillBlob(g, 1046, 486, 5, 5, rng, WOOD_DARK)
  fillBlob(g, 1082, 486, 5, 5, rng, WOOD_DARK)
  poly(g, [934, 400, W, 400, W, 380, 948, 380], '#e6cba0')
  g.fillStyle = 'rgba(110,75,40,0.3)'
  g.fillRect(934, 400, W - 934, 4)
  // Felted wool cushion.
  fillBlob(g, CAT.x, CAT.y + 5, 78, 13, rng, '#7d98a2', 0.03)
  fillBlob(g, CAT.x, CAT.y, 76, 12, rng, '#93adb5', 0.03)
  wash(g, CAT.x - 74, CAT.y - 12, 148, 24, rng, ['#b5c8cc', '#7d98a2'], 14, 6, 18, 0.35)

  // A small wet-on-wet painting above the cat.
  g.fillStyle = '#fbf3e2'
  g.fillRect(1066, 190, 100, 80)
  wash(g, 1066, 190, 100, 80, rng, ['#f2c94c', '#e98a7a', '#7fb0d8', '#f2c94c', '#e9a0b0'], 16, 18, 44, 0.6)
  g.strokeStyle = WOOD
  g.lineWidth = 7
  g.strokeRect(1066, 190, 100, 80)
  g.strokeStyle = rgba(shade(WOOD, -0.3), 0.35)
  g.lineWidth = 1.5
  g.strokeRect(1070, 194, 92, 72)

  // Little linen mats where a vase may stand.
  for (const p of PLACES) {
    fillBlob(g, p.x, p.y + 1, 30, 6.5, rng, 'rgba(222,200,160,0.9)', 0.03)
    g.strokeStyle = 'rgba(190,160,115,0.7)'
    g.lineWidth = 1.2
    g.beginPath()
    g.ellipse(p.x, p.y + 1, 25, 5, 0, 0, TAU)
    g.stroke()
  }
}

function paintTable(g: G, rng: () => number): void {
  g.fillStyle = 'rgba(70,40,15,0.16)'
  g.fillRect(TABLE_L - 4, TABLE_BACK - 7, W - TABLE_L, 8)
  poly(g, [TABLE_L, TABLE_BACK, W, TABLE_BACK, W, TABLE_FRONT, TABLE_L - 14, TABLE_FRONT], '#dfbd8a')
  g.save()
  g.beginPath()
  g.moveTo(TABLE_L, TABLE_BACK)
  g.lineTo(W, TABLE_BACK)
  g.lineTo(W, TABLE_FRONT)
  g.lineTo(TABLE_L - 14, TABLE_FRONT)
  g.closePath()
  g.clip()
  wash(g, TABLE_L - 14, TABLE_BACK, W - TABLE_L + 14, 170, rng, ['#ecd3a8', '#d2aa74'], 20, 60, 170, 0.35)
  grain(g, TABLE_L - 14, TABLE_BACK, W - TABLE_L + 14, 168, rng, '#8a6030', 90)
  g.strokeStyle = 'rgba(110,75,35,0.22)'
  g.lineWidth = 1.6
  for (const y of [652, 712]) {
    g.beginPath()
    g.moveTo(TABLE_L - 14, y)
    g.lineTo(W, y)
    g.stroke()
  }
  for (const [kx, ky] of [
    [640, 630],
    [930, 742],
    [1120, 668],
  ] as const) {
    g.strokeStyle = 'rgba(120,80,40,0.25)'
    g.lineWidth = 1.4
    g.beginPath()
    g.ellipse(kx, ky, 9, 4, 0, 0, TAU)
    g.stroke()
    g.beginPath()
    g.ellipse(kx, ky, 4.5, 2, 0, 0, TAU)
    g.stroke()
  }
  g.restore()
  g.strokeStyle = 'rgba(255,244,215,0.7)'
  g.lineWidth = 2
  g.beginPath()
  g.moveTo(TABLE_L, TABLE_BACK + 1)
  g.lineTo(W, TABLE_BACK + 1)
  g.stroke()
  // The edge of the top and the apron below it.
  poly(g, [TABLE_L - 14, TABLE_FRONT, W, TABLE_FRONT, W, TABLE_FRONT + 12, TABLE_L - 13, TABLE_FRONT + 12], '#cfa873')
  poly(g, [TABLE_L - 8, TABLE_FRONT + 12, W, TABLE_FRONT + 12, W, H, TABLE_L - 6, H], '#b88d5a')
  grain(g, TABLE_L - 8, TABLE_FRONT + 12, W - TABLE_L + 8, 30, rng, '#6a4520', 16)
  g.fillStyle = 'rgba(70,40,15,0.2)'
  g.fillRect(TABLE_L - 10, TABLE_FRONT + 12, W - TABLE_L + 10, 5)
}

export function paintBackground(season: Season, res: number, rng: () => number): Sprite {
  const pal = OUT[season]
  return makeSprite(W, H, 0, 0, res, (g) => {
    paintOutdoors(g, pal, season, rng)
    paintRoom(g, rng)
    paintWindow(g, pal, rng)
    paintFurniture(g, rng)
    // The eave beam over the room.
    g.fillStyle = WOOD_DARK
    g.fillRect(POST_L, 0, W - POST_L, 18)
    grain(g, POST_L, 0, W - POST_L, 18, rng, '#5a3a18', 14)
    g.fillStyle = 'rgba(70,40,15,0.14)'
    g.fillRect(POST_R, 18, W - POST_R, 7)
    paintTable(g, rng)
    tooth(g, 0, 0, W, H, rng, 5200)
  })
}

// The door post, drawn over the plants so they tuck behind it.
export function paintPost(res: number, rng: () => number): Sprite {
  const w = POST_R - POST_L + 8
  return makeSprite(w, H, 0, 0, res, (g) => {
    g.fillStyle = 'rgba(70,40,15,0.14)'
    g.fillRect(w - 8, 0, 8, H)
    g.fillStyle = '#b98d5c'
    g.fillRect(0, 0, w - 8, H)
    grain(g, 0, 0, w - 8, H, rng, '#6a4520', 50, true)
    g.fillStyle = 'rgba(255,240,210,0.35)'
    g.fillRect(1, 0, 3, H)
    g.fillStyle = 'rgba(80,50,20,0.25)'
    g.fillRect(w - 11, 0, 3, H)
    // The nail the scissors hang from.
    g.fillStyle = '#5c5550'
    g.beginPath()
    g.arc(NAIL.x - POST_L, NAIL.y, 3.6, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.5)'
    g.beginPath()
    g.arc(NAIL.x - POST_L - 1, NAIL.y - 1, 1.2, 0, TAU)
    g.fill()
  })
}

// The woven hurdle along the front of the bed. Top-left at (0, BED_FRONT_Y).
export const BED_FRONT_Y = 706
export function paintBedFront(season: Season, res: number, rng: () => number): Sprite {
  const w = POST_L + 4
  const h = H - BED_FRONT_Y
  return makeSprite(w, h, 0, 0, res, (g) => {
    g.fillStyle = '#8a6846'
    g.fillRect(0, 4, w, h)
    const rows = 10
    for (let row = 0; row < rows; row++) {
      const y = 9 + row * 11.5
      const color = mix('#b3895c', '#9a7149', rng())
      g.strokeStyle = color
      g.lineWidth = 10
      g.beginPath()
      g.moveTo(-6, y)
      for (let x = 0; x <= w + 44; x += 44) {
        const up = (x / 44 + row) % 2 < 1 ? -3.5 : 3.5
        g.quadraticCurveTo(x - 22, y + up, x, y - up * 0.2)
      }
      g.stroke()
      g.strokeStyle = 'rgba(70,45,20,0.28)'
      g.lineWidth = 1.4
      g.beginPath()
      g.moveTo(-6, y + 5)
      for (let x = 0; x <= w + 44; x += 44) {
        const up = (x / 44 + row) % 2 < 1 ? -3.5 : 3.5
        g.quadraticCurveTo(x - 22, y + up + 5, x, y - up * 0.2 + 5)
      }
      g.stroke()
      // Every other crossing, the stake shows in front of the withy.
      for (let k = 0; k * 44 + 22 < w; k++) {
        if ((k + row) % 2 === 0) continue
        g.fillStyle = '#7a5a3a'
        g.fillRect(k * 44 + 17, y - 6.5, 10, 13)
        g.fillStyle = 'rgba(255,235,200,0.18)'
        g.fillRect(k * 44 + 18, y - 6.5, 2.5, 13)
      }
    }
    // Stake tops.
    for (let k = 0; k * 44 + 22 < w; k++) fillBlob(g, k * 44 + 22, 4, 6, 4.5, rng, '#7a5a3a', 0.1)
    if (season === 'winter') {
      for (let i = 0; i < 7; i++) fillBlob(g, rng() * w, 3, 16 + rng() * 22, 4, rng, 'rgba(255,255,255,0.9)', 0.2)
    }
    tooth(g, 0, 0, w, h, rng, 500)
  })
}

// ---- Vases ----

export interface VaseSpec {
  h: number
  rim: number
  bot: number
  wide: number
  // How far a stem can lean, radians.
  amax: number
  // A stem showing more than this above the rim tips its head.
  droopAt: number
  // How much water it takes, in jug units.
  vol: number
  // Pentatonic step of its glass.
  step: number
  prof: readonly (readonly [number, number])[]
  back: Sprite
  front: Sprite
  water: Sprite
}

const PROFILES: readonly (readonly (readonly [number, number])[])[] = [
  [
    [0, 26],
    [-8, 35],
    [-34, 42],
    [-58, 31],
    [-68, 27],
    [-78, 31],
  ],
  [
    [0, 27],
    [-10, 35],
    [-44, 39],
    [-84, 27],
    [-106, 20],
    [-122, 25],
  ],
  [
    [0, 26],
    [-10, 30],
    [-70, 31],
    [-140, 28],
    [-158, 27],
    [-166, 30],
  ],
]

function vasePath(g: G, prof: readonly (readonly [number, number])[], inset = 0): void {
  const n = prof.length
  const hw = (i: number) => Math.max(2, prof[i]![1] - inset)
  const y = (i: number) => (i === 0 ? -inset : prof[i]![0])
  g.beginPath()
  g.moveTo(-hw(0) + 6, y(0))
  g.lineTo(hw(0) - 6, y(0))
  g.quadraticCurveTo(hw(0), y(0), (hw(0) + hw(1)) / 2, (y(0) + y(1)) / 2)
  for (let i = 1; i < n - 1; i++) g.quadraticCurveTo(hw(i), y(i), (hw(i) + hw(i + 1)) / 2, (y(i) + y(i + 1)) / 2)
  g.lineTo(hw(n - 1), y(n - 1))
  g.lineTo(-hw(n - 1), y(n - 1))
  g.lineTo(-(hw(n - 1) + hw(n - 2)) / 2, (y(n - 1) + y(n - 2)) / 2)
  for (let i = n - 2; i >= 1; i--) g.quadraticCurveTo(-hw(i), y(i), -(hw(i) + hw(i - 1)) / 2, (y(i) + y(i - 1)) / 2)
  g.quadraticCurveTo(-hw(0), y(0), -hw(0) + 6, y(0))
  g.closePath()
}

export function halfWidthAt(prof: readonly (readonly [number, number])[], y: number): number {
  for (let i = 0; i < prof.length - 1; i++) {
    const a = prof[i]!
    const b = prof[i + 1]!
    if (y <= a[0] && y >= b[0]) return a[1] + ((b[1] - a[1]) * (a[0] - y)) / (a[0] - b[0])
  }
  return prof[prof.length - 1]![1]
}

function buildVase(kind: number, res: number): VaseSpec {
  const prof = PROFILES[kind]!
  const h = -prof[prof.length - 1]![0]
  const rim = prof[prof.length - 1]![1]
  const wide = Math.max(...prof.map((p) => p[1]))
  const w = wide * 2 + 18
  const sh = h + 22
  const ax = w / 2
  const ay = sh - 9
  const tint = ['#cfe6dc', '#d6e4ee', '#dfe9d6'][kind]!
  const back = makeSprite(w, sh, ax, ay, res, (g) => {
    g.translate(ax, ay)
    vasePath(g, prof)
    g.fillStyle = rgba(tint, 0.5)
    g.fill()
    g.strokeStyle = 'rgba(120,150,150,0.5)'
    g.lineWidth = 1.5
    g.beginPath()
    g.ellipse(0, -h, rim, 5, 0, Math.PI, TAU)
    g.stroke()
  })
  const water = makeSprite(w, sh, ax, ay, res, (g) => {
    g.translate(ax, ay)
    vasePath(g, prof, 4)
    g.fillStyle = 'rgba(96,170,202,0.52)'
    g.fill()
  })
  const front = makeSprite(w, sh, ax, ay, res, (g) => {
    g.translate(ax, ay)
    vasePath(g, prof)
    g.fillStyle = rgba(tint, 0.16)
    g.fill()
    g.strokeStyle = 'rgba(96,128,130,0.6)'
    g.lineWidth = 2
    g.stroke()
    // Thick glass at the foot.
    g.fillStyle = 'rgba(255,255,255,0.4)'
    g.beginPath()
    g.ellipse(0, -4, prof[0]![1] - 3, 3.4, 0, 0, TAU)
    g.fill()
    // A long highlight down the left, a short one on the right.
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = 4
    g.beginPath()
    for (let i = 0; i <= 10; i++) {
      const y = -h * (0.16 + (i / 10) * 0.62)
      const x = -halfWidthAt(prof, y) * 0.66
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.4)'
    g.lineWidth = 2.5
    g.beginPath()
    for (let i = 0; i <= 5; i++) {
      const y = -h * (0.3 + (i / 5) * 0.22)
      const x = halfWidthAt(prof, y) * 0.72
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.85)'
    g.lineWidth = 2.2
    g.beginPath()
    g.ellipse(0, -h, rim, 5, 0, 0.1, Math.PI - 0.1)
    g.stroke()
  })
  return {
    h,
    rim,
    bot: prof[0]![1],
    wide,
    amax: [0.5, 0.32, 0.2][kind]!,
    droopAt: [118, 176, 999][kind]!,
    vol: [0.65, 1, 1.2][kind]!,
    step: [4, 2, 0][kind]!,
    prof,
    back,
    front,
    water,
  }
}

// ---- Jug ----

// Local frame: origin at the middle of the body. The spout is at the top left.
export const SPOUT = { x: -40, y: -50 } as const
export const JUG_HALF = 44

function jugPath(g: G, inset = 0): void {
  const k = inset
  g.beginPath()
  g.moveTo(-20 + k, 44 - k)
  g.lineTo(20 - k, 44 - k)
  g.quadraticCurveTo(31 - k, 44 - k, 32 - k, 24)
  g.quadraticCurveTo(34 - k, 0, 25 - k, -20)
  g.quadraticCurveTo(21 - k, -32, 26 - k, -44 + k)
  g.lineTo(-22, -44 + k)
  g.lineTo(SPOUT.x + k * 2, SPOUT.y + k)
  g.quadraticCurveTo(-25 + k, -38, -25 + k, -20)
  g.quadraticCurveTo(-34 + k, 0, -32 + k, 24)
  g.quadraticCurveTo(-31 + k, 44 - k, -20 + k, 44 - k)
  g.closePath()
}

export function clipJug(g: G): void {
  jugPath(g, 4)
  g.clip()
}

function buildJug(res: number): Sprite {
  return makeSprite(124, 116, 60, 60, res, (g) => {
    g.translate(60, 60)
    // Handle.
    g.strokeStyle = 'rgba(190,215,212,0.85)'
    g.lineWidth = 8
    g.beginPath()
    g.moveTo(27, -26)
    g.bezierCurveTo(60, -32, 60, 24, 31, 20)
    g.stroke()
    g.strokeStyle = 'rgba(96,128,130,0.5)'
    g.lineWidth = 1.5
    g.beginPath()
    g.moveTo(27, -30)
    g.bezierCurveTo(65, -37, 65, 29, 31, 24)
    g.stroke()
    jugPath(g)
    g.fillStyle = 'rgba(208,230,226,0.4)'
    g.fill()
    g.strokeStyle = 'rgba(96,128,130,0.6)'
    g.lineWidth = 2
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.75)'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(-19, -26)
    g.quadraticCurveTo(-25, 0, -22, 26)
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.4)'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(22, -6)
    g.quadraticCurveTo(25, 6, 23, 18)
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.4)'
    g.beginPath()
    g.ellipse(0, 40, 20, 3, 0, 0, TAU)
    g.fill()
  })
}

// ---- Pail ----

function buildPail(res: number, rng: () => number): { back: Sprite; front: Sprite } {
  const hgt = PAIL.y - PAIL.rimY
  const top = PAIL.rx
  const bot = 45
  const w = top * 2 + 30
  const sh = hgt + 60
  const ax = w / 2
  const ay = sh - 10
  const back = makeSprite(w, sh, ax, ay, res, (g) => {
    g.translate(ax, ay)
    // Rope handle lying behind.
    g.strokeStyle = '#c9ac78'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(-top + 2, -hgt)
    g.bezierCurveTo(-top - 6, -hgt - 46, top + 6, -hgt - 46, top - 2, -hgt)
    g.stroke()
    g.strokeStyle = 'rgba(120,90,50,0.45)'
    g.lineWidth = 1.2
    g.setLineDash([3, 4])
    g.stroke()
    g.setLineDash([])
    g.fillStyle = '#8a6540'
    g.beginPath()
    g.ellipse(0, -hgt, top, 13, 0, 0, TAU)
    g.fill()
    g.fillStyle = '#9cc7d6'
    g.beginPath()
    g.ellipse(0, -hgt + 5, top - 6, 9.5, 0, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.beginPath()
    g.ellipse(-12, -hgt + 3, 22, 3, -0.05, 0, TAU)
    g.fill()
  })
  const front = makeSprite(w, sh, ax, ay, res, (g) => {
    g.translate(ax, ay)
    const body = () => {
      g.beginPath()
      g.moveTo(-top, -hgt)
      g.lineTo(-bot, -6)
      g.quadraticCurveTo(0, 8, bot, -6)
      g.lineTo(top, -hgt)
      g.ellipse(0, -hgt, top, 13, 0, 0, Math.PI)
      g.closePath()
    }
    body()
    g.fillStyle = '#c59a66'
    g.fill()
    g.save()
    body()
    g.clip()
    wash(g, -top, -hgt, top * 2, hgt + 10, rng, ['#dab887', '#a97d50'], 12, 16, 46, 0.4)
    // Staves.
    for (let i = -3; i <= 3; i++) {
      g.strokeStyle = 'rgba(95,62,30,0.4)'
      g.lineWidth = 1.6
      g.beginPath()
      g.moveTo((i / 3.5) * top, -hgt + 12)
      g.lineTo((i / 3.5) * bot, 4)
      g.stroke()
    }
    grain(g, -top, -hgt, top * 2, hgt + 10, rng, '#6a4520', 26, true)
    // Two iron hoops.
    for (const f of [0.26, 0.78]) {
      const y = -hgt + (hgt - 4) * f + 12 * (1 - f)
      const half = top + (bot - top) * f + 1
      g.strokeStyle = '#6f6a66'
      g.lineWidth = 7
      g.beginPath()
      g.moveTo(-half, y - 8)
      g.quadraticCurveTo(0, y + 8, half, y - 8)
      g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.25)'
      g.lineWidth = 1.5
      g.beginPath()
      g.moveTo(-half, y - 10)
      g.quadraticCurveTo(0, y + 6, half, y - 10)
      g.stroke()
    }
    g.fillStyle = 'rgba(60,35,15,0.14)'
    g.fillRect(top * 0.45, -hgt, top, hgt + 10)
    g.restore()
    g.strokeStyle = 'rgba(255,240,210,0.6)'
    g.lineWidth = 2
    g.beginPath()
    g.ellipse(0, -hgt, top - 1, 12.5, 0, 0.15, Math.PI - 0.15)
    g.stroke()
  })
  return { back, front }
}

// ---- Cat ----

const GINGER = '#dba060'
const GINGER_DARK = '#c07f43'
const CREAM = '#f5e2c8'

function buildCat(res: number, rng: () => number): Sprite {
  return makeSprite(176, 104, 88, 98, res, (g) => {
    fillBlob(g, 96, 66, 66, 31, rng, GINGER, 0.03)
    fillBlob(g, 130, 68, 34, 27, rng, shade(GINGER, 0.08), 0.03)
    g.strokeStyle = rgba(GINGER_DARK, 0.75)
    g.lineWidth = 5
    for (let i = 0; i < 6; i++) {
      const x = 78 + i * 13
      g.beginPath()
      g.moveTo(x, 38 + Math.abs(i - 2.5) * 2)
      g.quadraticCurveTo(x + 5, 46, x + 3, 54 + (i % 2) * 4)
      g.stroke()
    }
    // Ears behind the head.
    for (const [ax, ay, bx, by, cx, cy] of [
      [25, 50, 28, 27, 43, 43],
      [46, 42, 60, 25, 65, 46],
    ] as const) {
      g.fillStyle = GINGER
      g.beginPath()
      g.moveTo(ax, ay)
      g.quadraticCurveTo(bx - 2, by + 6, bx, by)
      g.quadraticCurveTo(cx - 4, cy - 10, cx, cy)
      g.closePath()
      g.fill()
      g.fillStyle = '#e9b0a0'
      g.beginPath()
      g.moveTo(ax + 5, ay - 3)
      g.lineTo(bx + 2, by + 8)
      g.lineTo(cx - 5, cy - 1)
      g.closePath()
      g.fill()
    }
    fillBlob(g, 45, 64, 28, 23, rng, GINGER, 0.03)
    g.strokeStyle = rgba(GINGER_DARK, 0.7)
    g.lineWidth = 3
    for (const dx of [-7, 0, 7]) {
      g.beginPath()
      g.moveTo(45 + dx, 43)
      g.lineTo(45 + dx * 0.8, 50)
      g.stroke()
    }
    fillBlob(g, 45, 74, 13, 8, rng, CREAM, 0.05)
    fillBlob(g, 72, 90, 15, 7, rng, CREAM, 0.05)
    // Closed eyes, a small nose, a small mouth.
    g.strokeStyle = '#5a3d28'
    g.lineWidth = 2.2
    for (const ex of [35, 55]) {
      g.beginPath()
      g.arc(ex, 61, 5.5, 0.2, Math.PI - 0.2)
      g.stroke()
    }
    g.fillStyle = '#d98a80'
    g.beginPath()
    g.moveTo(42, 68)
    g.lineTo(48, 68)
    g.lineTo(45, 72)
    g.closePath()
    g.fill()
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(45, 72)
    g.quadraticCurveTo(42, 77, 39, 74)
    g.moveTo(45, 72)
    g.quadraticCurveTo(48, 77, 51, 74)
    g.stroke()
    g.strokeStyle = 'rgba(255,250,240,0.7)'
    g.lineWidth = 1
    for (const side of [-1, 1]) {
      for (const dy of [-2, 3]) {
        g.beginPath()
        g.moveTo(45 + side * 12, 72 + dy * 0.4)
        g.lineTo(45 + side * 30, 70 + dy)
        g.stroke()
      }
    }
  })
}

// The tail is drawn live so it can curl. Coordinates are relative to the
// cat's anchor (bottom centre of the sprite).
export function drawCatTail(g: G, x: number, y: number, k: number, flick: number): void {
  g.strokeStyle = GINGER
  g.lineWidth = 13 * k
  g.beginPath()
  g.moveTo(x + 66 * k, y - 26 * k)
  g.bezierCurveTo(x + 86 * k, y + 4 * k, x + 30 * k, y + 2 * k, x + (-2 + flick * 16) * k, y + (-6 - flick * 12) * k)
  g.stroke()
  g.strokeStyle = GINGER_DARK
  g.beginPath()
  g.moveTo(x + (6 + flick * 12) * k, y + (-4 - flick * 8) * k)
  g.lineTo(x + (-2 + flick * 16) * k, y + (-6 - flick * 12) * k)
  g.stroke()
}

// ---- Brush ----

function buildBrush(res: number, rng: () => number): Sprite {
  return makeSprite(132, 64, 44, 56, res, (g) => {
    // Bristles.
    for (let i = 0; i < 40; i++) {
      const x = 10 + (i / 39) * 68
      g.strokeStyle = mix('#e6cf96', '#c9a862', rng())
      g.lineWidth = 2.6
      g.beginPath()
      g.moveTo(x, 30)
      g.lineTo(x + (x - 44) * 0.08 + (rng() - 0.5) * 2, 54 + rng() * 2)
      g.stroke()
    }
    // Head block and handle.
    g.fillStyle = '#b98554'
    g.beginPath()
    g.roundRect(6, 14, 76, 18, 7)
    g.fill()
    g.strokeStyle = '#b98554'
    g.lineWidth = 12
    g.beginPath()
    g.moveTo(74, 21)
    g.quadraticCurveTo(100, 14, 122, 12)
    g.stroke()
    g.strokeStyle = 'rgba(255,235,200,0.45)'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(12, 18)
    g.lineTo(76, 18)
    g.quadraticCurveTo(100, 11, 120, 9)
    g.stroke()
    g.strokeStyle = 'rgba(90,55,25,0.3)'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(10, 29)
    g.lineTo(78, 29)
    g.stroke()
    // A leather loop to hang it by.
    g.strokeStyle = '#8a5a3a'
    g.lineWidth = 2.5
    g.beginPath()
    g.ellipse(124, 15, 5, 7, 0.3, 0, TAU)
    g.stroke()
  })
}

function buildGlow(res: number): Sprite {
  return makeSprite(300, 300, 150, 150, Math.min(1, res), (g) => {
    const grad = g.createRadialGradient(150, 150, 0, 150, 150, 150)
    grad.addColorStop(0, 'rgba(255,236,170,0.6)')
    grad.addColorStop(0.5, 'rgba(255,232,165,0.22)')
    grad.addColorStop(1, 'rgba(255,230,160,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 300, 300)
  })
}

// Scissors, drawn live. Origin at the pivot; blades point up at rot 0.
export function drawScissors(g: G, x: number, y: number, rot: number, open: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  for (const side of [-1, 1]) {
    g.save()
    g.rotate(side * open * 0.3)
    g.scale(side, 1)
    g.fillStyle = side < 0 ? '#9eabb0' : '#b9c4c8'
    g.beginPath()
    g.moveTo(-4, 8)
    g.lineTo(-5, -56)
    g.quadraticCurveTo(-2, -64, 2, -60)
    g.lineTo(6, 6)
    g.closePath()
    g.fill()
    g.strokeStyle = 'rgba(255,255,255,0.55)'
    g.lineWidth = 1.4
    g.beginPath()
    g.moveTo(-2, -4)
    g.lineTo(-3, -52)
    g.stroke()
    g.strokeStyle = '#b9553f'
    g.lineWidth = 6.5
    g.beginPath()
    g.moveTo(1, 6)
    g.lineTo(-11, 28)
    g.stroke()
    g.beginPath()
    g.ellipse(-17, 42, 10, 14.5, 0.35, 0, TAU)
    g.stroke()
    g.restore()
  }
  g.fillStyle = '#6f7b80'
  g.beginPath()
  g.arc(0, 2, 3.6, 0, TAU)
  g.fill()
  g.restore()
}

export interface Art {
  bg: Sprite
  post: Sprite
  bedFront: Sprite
  vases: VaseSpec[]
  jug: Sprite
  pailBack: Sprite
  pailFront: Sprite
  cat: Sprite
  brush: Sprite
  glow: Sprite
}

export function buildArt(season: Season, res: number, rng: () => number): Art {
  const pail = buildPail(res, rng)
  return {
    bg: paintBackground(season, res, rng),
    post: paintPost(res, rng),
    bedFront: paintBedFront(season, res, rng),
    vases: [buildVase(0, res), buildVase(1, res), buildVase(2, res)],
    jug: buildJug(res),
    pailBack: pail.back,
    pailFront: pail.front,
    cat: buildCat(res, rng),
    brush: buildBrush(res, rng),
    glow: buildGlow(res),
  }
}

// Leaf-and-petal shapes for the bits that fall on the table.
export function bitPath(g: G, kind: number, size: number): void {
  g.beginPath()
  if (kind === 0) {
    g.moveTo(-size, 0)
    g.quadraticCurveTo(0, -size * 0.7, size, 0)
    g.quadraticCurveTo(0, size * 0.5, -size, 0)
  } else {
    g.ellipse(0, 0, size * 0.75, size * 0.45, 0, 0, TAU)
  }
}
