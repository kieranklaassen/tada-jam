import { ellipse, flat, makeCanvas, mix, poly, round, soft, type Canvas, type G, type Sprites } from './litho'
import { SHELF_ORDER, SHELF_STEP, SHELF_X0, SHELF_Y, VESSELS } from './layout'
import { makeRng } from './rng'
import type { Place } from './things'

// The chart itself: a house cut open, printed on a sheet with a rail along the
// top and one along the bottom. It is painted once for each size of the
// surface and never again until the size changes. The three places to put
// things are painted in two layers, with what is in them between the two.

type Box = readonly [number, number, number, number]
export type Frame = { x0: number; y0: number; x1: number; y1: number }

const WALL = { bed: '#9aa98c', kitchen: '#bda584', bath: '#93aeac' } as const
const TIMBER = '#56402f', PLANK = '#8d6a48', EARTH = '#5e4636', RAIL = '#6d4a30'
const LEFT = 46, RIGHT = 1150, TOP = 94, FLOOR = 520, GROUND = 786
const BAYS = [[LEFT, 400], [400, 790], [790, RIGHT]] as const

const box = (x: number, y: number, w: number, h: number): Box => [x, y, w, h]

function block(g: G, x: number, y: number, w: number, h: number, colour: string, shade = 0.5, angle = 0.5): void {
  flat(g, round(x, y, w, h, 0), colour, box(x, y, w, h), shade, angle)
}

export function paintChart(frame: Frame, ratio: number): Canvas {
  const w = frame.x1 - frame.x0, h = frame.y1 - frame.y0
  const canvas = makeCanvas(w * ratio, h * ratio), g = canvas.getContext('2d')!
  g.scale(ratio, ratio)
  g.translate(-frame.x0, -frame.y0)
  const rng = makeRng(41)
  // Sky, hills and the ground the house stands on, to the edges of the sheet.
  block(g, frame.x0, frame.y0, w, h, '#b9c7b4', 0.35, -1.3)
  for (const [x, y, rx, ry] of [[-120, 560, 300, 150], [1310, 590, 320, 190]]) flat(g, ellipse(x, y, rx, ry), '#7d9272', box(x - rx, y - ry, rx * 2, ry * 2), 0.6)
  for (const x of [-90, 12, 1172, 1290]) {
    block(g, x - 9, 500, 18, 300, '#57432f', 0.6)
    for (const [dx, dy, r] of [[0, -70, 62], [-34, -10, 52], [36, -16, 50], [2, 40, 46]]) flat(g, ellipse(x + dx, 430 + dy, r, r * 0.9), '#5f7a56', box(x + dx - r, 430 + dy - r, r * 2, r * 2), 0.75)
  }
  block(g, frame.x0, GROUND - 60, w, 60, '#6d8458', 0.5, 1.5)
  block(g, frame.x0, GROUND, w, Math.max(40, frame.y1 - GROUND), EARTH, 0.7, 1.4)
  for (let i = 0; i < 60; i++) {
    const x = frame.x0 + rng.next() * w, y = GROUND + 14 + rng.next() * Math.max(20, frame.y1 - GROUND - 20)
    flat(g, ellipse(x, y, 5 + rng.next() * 12, 3 + rng.next() * 6, rng.next()), i % 3 ? '#49352a' : '#7c6450', box(0, 0, 1, 1), 0)
  }
  // The roof, cut open, with the attic under it.
  flat(g, poly([10, TOP + 8], [130, 8], [1066, 8], [1186, TOP + 8]), '#8a4f3d', box(10, 8, 1176, 90), 0.8)
  flat(g, poly([66, TOP + 4], [148, 26], [1048, 26], [1130, TOP + 4]), '#4d3a38', box(66, 26, 1064, 70), 0.7)
  for (let x = 190; x < 1030; x += 120) flat(g, poly([x, 26], [x + 12, 26], [x + 2, TOP], [x - 12, TOP]), '#6a4d3a', box(x - 12, 26, 24, 68), 0.5)
  attic(g)
  // Walls.
  BAYS.forEach(([a, b], i) => block(g, a, TOP, b - a, FLOOR - TOP, [WALL.bed, WALL.kitchen, WALL.bath][i], 0.55, 1.2))
  bedroom(g)
  kitchen(g)
  bathroom(g)
  // Floor, running to the front.
  flat(g, poly([LEFT, FLOOR], [RIGHT, FLOOR], [RIGHT, GROUND], [LEFT, GROUND]), '#8f7355', box(LEFT, FLOOR, RIGHT - LEFT, GROUND - FLOOR), 0.6, 1.4)
  g.save()
  g.beginPath(); g.rect(LEFT, FLOOR, RIGHT - LEFT, GROUND - FLOOR); g.clip()
  g.strokeStyle = 'rgba(58,40,30,0.35)'
  g.lineWidth = 2.5
  for (let i = -9; i <= 9; i++) { g.beginPath(); g.moveTo(598 + i * 62, FLOOR); g.lineTo(598 + i * 104, GROUND); g.stroke() }
  flat(g, ellipse(596, 628, 250, 34), '#7a4a4d', box(346, 594, 500, 68), 0.6)
  flat(g, ellipse(596, 628, 222, 26), '#a5756a', box(346, 594, 500, 68), 0.5)
  flat(g, ellipse(596, 628, 196, 19), '#7a4a4d', box(346, 594, 500, 68), 0.5)
  g.restore()
  block(g, LEFT, FLOOR - 12, RIGHT - LEFT, 14, '#6b4e38', 0.5)
  // Timbers: two outer walls and two between the rooms.
  for (const [x, t] of [[LEFT - 22, 24], [392, 16], [782, 16], [RIGHT - 2, 24]] as const) block(g, x, TOP, t, (x < 60 || x > 1100 ? GROUND : FLOOR) - TOP, TIMBER, 0.75)
  block(g, LEFT - 22, TOP - 6, RIGHT - LEFT + 44, 14, TIMBER, 0.7, 1.4)
  block(g, LEFT - 22, GROUND - 4, RIGHT - LEFT + 44, 12, TIMBER, 0.7, 1.4)
  // The shelf, with a place for each thing.
  const sx = SHELF_X0 - 74, sw = SHELF_STEP * 8 + 148
  for (const x of [sx + 40, sx + sw / 2 - 160, sx + sw / 2 + 160, sx + sw - 40]) flat(g, poly([x - 6, SHELF_Y + 10], [x + 6, SHELF_Y + 10], [x + 6, SHELF_Y + 48], [x, SHELF_Y + 48]), TIMBER, box(x - 6, SHELF_Y, 12, 48), 0.5)
  block(g, sx, SHELF_Y - 2, sw, 16, PLANK, 0.6, 1.4)
  block(g, sx, SHELF_Y + 12, sw, 6, mix(PLANK, '#2b1a10', 0.45), 0)
  SHELF_ORDER.forEach((_, i) => flat(g, ellipse(SHELF_X0 + i * SHELF_STEP, SHELF_Y + 1, 38, 5), 'rgba(50,32,20,0.35)', box(0, 0, 1, 1), 0))
  wear(g, frame, rng)
  // The rails the sheet hangs from.
  for (const [y, dir] of [[frame.y0, 1], [frame.y1, -1]] as const) {
    const top = dir > 0 ? y : y - 16
    block(g, frame.x0, top, w, 16, RAIL, 0.8, 1.5)
    g.fillStyle = 'rgba(255,236,200,0.22)'
    g.fillRect(frame.x0, top + 3, w, 2.5)
    g.fillStyle = 'rgba(40,22,16,0.3)'
    g.fillRect(frame.x0, dir > 0 ? y + 16 : y - 20, w, 4)
  }
  return canvas
}

function attic(g: G): void {
  // Sleeping bats, a trunk, a rocking horse's head, a ball and an old bath.
  for (const x of [236, 292, 884]) {
    flat(g, soft([x - 13, 28], [x + 13, 28], [x + 10, 54], [x, 68], [x - 10, 54]), '#6f6070', box(x - 13, 28, 26, 40), 0.6)
    flat(g, ellipse(x, 66, 9, 9), '#86748a', box(x - 9, 57, 18, 18), 0.4)
    g.strokeStyle = '#33272b'; g.lineWidth = 2; g.lineCap = 'round'
    for (const s of [-1, 1]) { g.beginPath(); g.arc(x + s * 4, 66, 2.6, Math.PI, 0); g.stroke() }
  }
  block(g, 350, 60, 86, 34, '#7d5f3f', 0.7)
  block(g, 346, 54, 94, 12, '#93714c', 0.6)
  for (const x of [366, 412]) block(g, x, 54, 8, 40, '#4c3a30', 0.3)
  flat(g, soft([706, 94], [700, 62], [724, 46], [752, 58], [750, 70], [728, 72], [736, 94]), '#9c8a73', box(700, 46, 52, 48), 0.7)
  flat(g, ellipse(728, 58, 3, 3), '#33272b', box(0, 0, 1, 1), 0)
  flat(g, ellipse(786, 78, 17, 17), '#6f8a86', box(769, 61, 34, 34), 0.7)
  block(g, 952, 54, 58, 40, '#8a7a62', 0.7)
  block(g, 960, 60, 42, 28, '#b5a98e', 0.5)
}

function bedroom(g: G): void {
  g.fillStyle = 'rgba(74,92,68,0.28)'
  for (let x = LEFT + 18; x < 392; x += 34) g.fillRect(x, SHELF_Y + 18, 11, FLOOR - SHELF_Y - 30)
  g.save()
  g.translate(-72, 0)
  // A window with the moon in it.
  block(g, 268, 258, 100, 128, '#6b4e38', 0.6)
  block(g, 277, 267, 82, 110, '#4d6072', 0.5)
  flat(g, ellipse(330, 300, 19, 19), '#ead9a8', box(311, 281, 38, 38), 0.3)
  flat(g, ellipse(338, 295, 16, 16), '#4d6072', box(0, 0, 1, 1), 0)
  block(g, 315, 262, 6, 120, '#6b4e38', 0.3)
  block(g, 272, 318, 92, 6, '#6b4e38', 0.3)
  for (const s of [-1, 1]) flat(g, soft([318 + s * 46, 246], [318 + s * 66, 250], [318 + s * 70, 392], [318 + s * 46, 388], [318 + s * 40, 320]), '#8c6770', box(250, 246, 140, 146), 0.7)
  block(g, 244, 244, 148, 8, TIMBER, 0.4)
  g.restore()
}

function kitchen(g: G): void {
  // Tiles along the lower wall, and a stove behind the butler.
  for (let y = 372; y < FLOOR - 12; y += 34) for (let x = 408; x < 782; x += 34) {
    const even = ((x - 408) / 34 + (y - 372) / 34) % 2 === 0
    g.fillStyle = even ? '#a48e74' : '#b39c80'
    g.fillRect(x, y, 33, 33)
  }
  block(g, 524, 366, 166, FLOOR - 372, '#4b4347', 0.75)
  block(g, 512, 352, 190, 18, '#5d5358', 0.6, 1.4)
  block(g, 548, 398, 118, 78, '#3a3338', 0.5)
  flat(g, round(562, 410, 90, 44, 20), '#8d5a3c', box(562, 410, 90, 44), 0.7)
  block(g, 586, 240, 42, 114, '#564c50', 0.7)
  flat(g, poly([566, 352], [648, 352], [628, 300], [586, 300]), '#564c50', box(566, 300, 82, 52), 0.7)
  // Pans on the wall.
  for (const [x, r] of [[440, 23], [484, 17], [744, 22]] as const) {
    block(g, x - 3, 238, 6, 44, '#6f6258', 0.3)
    flat(g, ellipse(x, 290, r, r), '#8b7767', box(x - r, 290 - r, r * 2, r * 2), 0.75)
    flat(g, ellipse(x, 290, r * 0.68, r * 0.68), '#76655a', box(x - r, 290 - r, r * 2, r * 2), 0.5)
  }
}

function bathroom(g: G): void {
  for (let y = 360; y < FLOOR - 12; y += 30) for (let x = 798; x < 1146; x += 30) {
    g.fillStyle = ((x - 798) / 30 + (y - 360) / 30) % 2 ? '#86a3a2' : '#a3bab5'
    g.fillRect(x, y, 29, 29)
  }
  block(g, 790, 350, 358, 10, '#6f8d8c', 0.4)
  // A mirror, a towel and a sponge on a string.
  flat(g, ellipse(1004, 300, 44, 54), '#7a5f45', box(960, 246, 88, 108), 0.6)
  flat(g, ellipse(1004, 300, 36, 46), '#c5d2c9', box(968, 254, 72, 92), 0.5)
  block(g, 846, 262, 92, 8, TIMBER, 0.4)
  flat(g, soft([852, 266], [932, 266], [930, 352], [890, 360], [856, 350]), '#b49a8a', box(852, 266, 80, 94), 0.6)
  g.fillStyle = 'rgba(96,66,64,0.5)'
  for (const y of [320, 334]) g.fillRect(855, y, 76, 6)
}

/** Where the sheet was folded, the print is worn off and the canvas shows. */
function wear(g: G, frame: Frame, rng: { next(): number }): void {
  const w = frame.x1 - frame.x0, h = frame.y1 - frame.y0
  g.fillStyle = '#ded0ae'
  const line = (x: number, y: number, dx: number, dy: number, long: number) => {
    for (let t = 0; t < long; t += 3) {
      const deep = Math.sin(t * 0.013) + Math.sin(t * 0.031 + x)
      if (rng.next() > 0.36 + deep * 0.2) continue
      g.globalAlpha = 0.14 + rng.next() * 0.3
      const r = 0.6 + rng.next() * (1.4 + Math.max(0, deep) * 0.9)
      g.fillRect(x + dx * t + (rng.next() - 0.5) * 5, y + dy * t + (rng.next() - 0.5) * 5, r * 1.8, r * 1.4)
    }
  }
  for (const p of [1 / 3, 2 / 3]) {
    line(frame.x0 + w * p, frame.y0, 0, 1, h)
    line(frame.x0, frame.y0 + h * p, 1, 0, w)
  }
  g.globalAlpha = 1
}

// --- The bed, the soup and the bath -------------------------------------------

const POT = '#5a5f66', TUB = '#e2dac4', WOOD = '#7a563a', QUILT = '#77597a'

export function vesselBack(g: G, s: Sprites, place: Place, tint: string): void {
  const { x, half, rim, foot } = VESSELS[place]
  g.save()
  g.translate(x, rim)
  s.stamp(g, `${place}-back`, [-half - 34, -170, half * 2 + 68, 280], (c) => {
    if (place === 'bed') {
      for (const side of [-1, 1]) {
        block(c, side * (half + 2) - 11, -96, 22, foot - rim + 96, WOOD, 0.7)
        flat(c, ellipse(side * (half + 2), -104, 15, 15), mix(WOOD, '#ffffff', 0.12), box(side * half - 15, -119, 34, 30), 0.7)
      }
      flat(c, round(-half + 8, -84, half * 2 - 16, 120, 34), '#936a49', box(-half, -84, half * 2, 110), 0.7)
      for (const dx of [-82, 82]) flat(c, soft([dx - 74, -46], [dx + 74, -46], [dx + 82, 4], [dx, 14], [dx - 82, 4]), '#ece2cb', box(dx - 80, -46, 160, 60), 0.5)
    } else if (place === 'soup') {
      flat(c, ellipse(0, 4, half + 4, 34), mix(POT, '#ffffff', 0.2), box(-half, -30, half * 2, 68), 0.5)
      flat(c, ellipse(0, 6, half - 12, 26), '#34373b', box(-half, -20, half * 2, 52), 0.4)
    } else {
      flat(c, ellipse(0, 4, half + 4, 34), '#efe7d2', box(-half, -30, half * 2, 68), 0.4)
      flat(c, ellipse(0, 6, half - 12, 26), '#8d978f', box(-half, -20, half * 2, 52), 0.4)
      // Two taps at the end.
      block(c, half - 34, -70, 12, 74, '#a08a5c', 0.6)
      flat(c, soft([half - 34, -74], [half - 22, -78], [half - 18, -62], [half - 56, -58], [half - 62, -44], [half - 70, -46], [half - 64, -66]), '#a08a5c', box(half - 70, -78, 52, 34), 0.5)
      flat(c, ellipse(half - 27, -80, 18, 7), '#b59e6c', box(half - 45, -87, 36, 14), 0.5)
    }
  })
  if (place !== 'bed') {
    g.fillStyle = tint
    g.beginPath(); g.ellipse(0, 10, half - 14, 22, 0, 0, Math.PI * 2); g.fill()
  }
  g.restore()
}

/** The front half: what is in it lies behind this. `tint` is what the soup has turned, and `lap` how high the surface stands just now. */
export function vesselFront(g: G, s: Sprites, place: Place, tint: string, lap: number): void {
  const { x, half, rim, foot } = VESSELS[place]
  const deep = foot - rim
  g.save()
  g.translate(x, rim)
  if (place !== 'bed') {
    g.fillStyle = tint
    g.beginPath()
    g.moveTo(-half + 14, 12)
    for (let i = 0; i <= 12; i++) {
      const p = i / 12, dx = -half + 14 + (half * 2 - 28) * p
      g.lineTo(dx, 12 + Math.sin(Math.PI * p) * 2 + Math.sin(p * 13 + lap) * 3.4 + Math.sin(p * Math.PI * 2) * lap * 2.2)
    }
    g.lineTo(half - 30, 58)
    g.lineTo(-half + 30, 58)
    g.fill()
  }
  s.stamp(g, `${place}-front`, [-half - 34, -20, half * 2 + 68, deep + 40], (c) => {
    if (place === 'bed') {
      block(c, -half - 6, 60, half * 2 + 12, 30, WOOD, 0.7, 1.4)
      flat(c, soft([-half - 4, 12], [-60, 2], [60, 2], [half + 4, 12], [half + 10, 92], [0, 100], [-half - 10, 92]), QUILT, box(-half - 10, 2, half * 2 + 20, 96), 0.7)
      for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) if ((row + i) % 2) flat(c, round(-half + 14 + i * 40, 32 + row * 30, 36, 26, 6), '#9a7a94', box(-half + 14 + i * 40, 32 + row * 30, 36, 26), 0.4)
      flat(c, soft([-half - 6, 8], [-60, -4], [60, -4], [half + 6, 8], [half, 30], [0, 24], [-half, 30]), '#ece2cb', box(-half, -4, half * 2, 34), 0.5)
    } else if (place === 'soup') {
      flat(c, soft([-half + 12, 20], [0, 48], [half - 12, 20], [half + 2, 60], [half - 46, deep + 4], [0, deep + 12], [-half + 46, deep + 4], [-half - 2, 60]), POT, box(-half, 10, half * 2, deep), 0.85)
      c.fillStyle = mix(POT, '#ffffff', 0.26)
      c.beginPath(); c.ellipse(0, 4, half + 4, 36, 0, 0, Math.PI); c.ellipse(0, 4, half - 9, 25, 0, Math.PI, 0, true); c.fill()
      for (const side of [-1, 1]) { c.strokeStyle = '#43474c'; c.lineWidth = 10; c.beginPath(); c.arc(side * (half + 4), 48, 17, -Math.PI / 2, Math.PI / 2, side < 0); c.stroke() }
    } else {
      for (const side of [-1, 1]) flat(c, soft([side * 96, deep - 22], [side * 130, deep - 26], [side * 140, deep + 4], [side * 108, deep + 6]), '#a08a5c', box(side * 120 - 24, deep - 26, 48, 32), 0.6)
      flat(c, soft([-half + 8, 18], [0, 46], [half - 8, 18], [half + 2, 48], [half - 34, deep - 14], [0, deep - 6], [-half + 34, deep - 14], [-half - 2, 48]), TUB, box(-half, 10, half * 2, deep), 0.6)
      c.fillStyle = '#f2ead6'
      c.beginPath(); c.ellipse(0, 4, half + 4, 36, 0, 0, Math.PI); c.ellipse(0, 4, half - 9, 25, 0, Math.PI, 0, true); c.fill()
    }
  })
  g.restore()
}
