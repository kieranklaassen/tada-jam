import { CAT, GATE, HIVE, HOME, PATH, ROBIN, SILL, TABLE, WALL, WINDOW } from './layout'
import { Brush, tone, type G } from './paint'
import { SOIL_Y } from './plants'
import { makeRng } from './rng'

// The garden, painted once for each size of the surface: a walled yard in the
// manner of a Dutch flower piece. A dark glazed ground of umber, daylight
// from one window at the left, a gateway to a sunlit street at the right, the
// bed along the front and a stone path before it. Everything here stands
// still, is lower in contrast than what can be touched, and answers no touch.

export type Bounds = { left: number; top: number; right: number; bottom: number }

const UMBER = '#2b1c11'

function wall(brush: Brush, b: Bounds): void {
  const g = brush.g
  g.fillStyle = UMBER
  g.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top)
  // A ground worked up from many broad pulls of dark paint, warmer near the window.
  const tones = ['#33210f', '#2d1c0f', '#372312', '#2a190d', '#39250f', '#2f2212']
  for (let i = 0; i < 190; i++) {
    const x = brush.vary(b.left - 60, b.right), y = brush.vary(b.top, 720)
    const long = brush.vary(60, 190), a = brush.vary(-0.5, 0.2)
    const warm = Math.max(0, 1 - Math.hypot(x - 300, y - 300) / 520)
    brush.stroke([x, y, x + Math.cos(a) * long * 0.5, y + Math.sin(a) * long * 0.5 + brush.vary(-8, 8), x + Math.cos(a) * long, y + Math.sin(a) * long], brush.vary(22, 44), tone(tones[i % tones.length], warm * 0.12 - 0.06, 0.6), 0.05)
  }
  // Courses of old brick showing through the glaze, low on the wall.
  for (let row = 0; row < 7; row++) {
    const y = 470 + row * 34
    for (let x = b.left - (row % 2) * 40; x < b.right; x += 82) {
      if (brush.vary(0, 1) < 0.45) continue
      brush.stroke([x + 4, y, x + 72, y + brush.vary(-1.5, 1.5)], 24, tone(['#44281a', '#4b2c19', '#3b2314'][Math.floor(brush.vary(0, 3))], brush.vary(-0.1, 0.04), 0.7), 0.08)
    }
  }
}

/** The window the light comes from, with its sill for the cat. */
function windowAndLight(brush: Brush): void {
  const g = brush.g
  const { left, right, top, bottom } = WINDOW
  // The shaft of daylight on the wall, falling down and across towards the bed.
  const shaft = g.createLinearGradient(right, top, 760, 640)
  shaft.addColorStop(0, 'rgba(255,214,150,0.17)')
  shaft.addColorStop(0.55, 'rgba(255,200,130,0.08)')
  shaft.addColorStop(1, 'rgba(255,200,130,0)')
  g.fillStyle = shaft
  g.beginPath()
  g.moveTo(right - 30, top + 20); g.lineTo(right, bottom - 6); g.lineTo(600, 720); g.lineTo(930, 720); g.lineTo(WALL.left + 4, WALL.top + 20)
  g.closePath(); g.fill()
  // The stone surround.
  brush.within(left - 24, top - 26, right + 24, bottom + 26).fill((p) => p.rect(left - 22, top - 24, right - left + 44, bottom - top + 44), '#6f5f4a', 22, 1.5, 0.7)
  // The panes: a pale sky, brightest at the top, with a far tree and a roof.
  const sky = g.createLinearGradient(0, top, 0, bottom)
  sky.addColorStop(0, '#e9eee4'); sky.addColorStop(0.6, '#c9d9d2'); sky.addColorStop(1, '#a9bfa8')
  g.fillStyle = sky
  g.fillRect(left, top, right - left, bottom - top)
  for (let i = 0; i < 12; i++) brush.stroke([left + brush.vary(4, 150), top + brush.vary(10, 120), left + brush.vary(30, 184), top + brush.vary(10, 120)], brush.vary(14, 26), tone('#d6e2dc', brush.vary(-0.04, 0.16), 0.7), 0)
  brush.dab(left + 128, bottom - 52, 46, 40, 0, '#7d9a6a', 0.4)
  brush.dab(left + 150, bottom - 78, 30, 26, 0, '#93ad78', 0.4)
  brush.within(left, bottom - 60, left + 90, bottom).fill((p) => { p.moveTo(left, bottom); p.lineTo(left, bottom - 34); p.lineTo(left + 44, bottom - 62); p.lineTo(left + 92, bottom - 30); p.lineTo(left + 92, bottom); }, '#b9826a', 5, 0.6, 0.4)
  // Glazing bars, and the deep sill.
  const mid = (left + right) / 2
  // Thin, and in the tone of the stone round them, so that they read as glazing in a lit window and as no dark sign on a pale ground.
  brush.stroke([mid, top, mid, bottom], 3, '#8f806a', 0.5)
  brush.stroke([left, top + 78, right, top + 78], 2.6, '#8f806a', 0.5)
  brush.stroke([left, top + 148, right, top + 148], 2.6, '#8f806a', 0.5)
  brush.within(left - 34, bottom, right + 34, bottom + 24).fill((p) => p.rect(left - 34, bottom, right - left + 68, 22), '#8d7b62', 8, 0, 0.9)
  brush.stroke([left - 30, bottom + 3, right + 30, bottom + 3], 4, '#c9b592', 0.6)
}

/** A pear tree trained flat against the wall under the coping, dim, in the glaze. */
function espalier(brush: Brush): void {
  const bark = '#4a321c'
  brush.stroke([470, 700, 476, 560, 466, 420, 470, 300], 13, bark, 0.4)
  for (let tier = 0; tier < 3; tier++) {
    const y = 306 + tier * 76
    brush.stroke([470, y + 16, 400, y, 322, y + 4], 8, bark, 0.4)
    brush.stroke([470, y + 16, 548, y - 2, 668, y + 6], 8, bark, 0.4)
    for (let i = 0; i < 12; i++) {
      const x = 318 + i * 30 + brush.vary(-8, 8)
      if (Math.abs(x - 470) < 16) continue
      brush.dab(x, y + brush.vary(-18, 12), brush.vary(11, 16), brush.vary(6, 8), brush.vary(-0.9, 0.9), ['#34481f', '#3f5524', '#2b3b1b'][i % 3], 0.45)
    }
  }
  // A few pears, ochre gone green, no brighter than the wall allows.
  for (const [x, y] of [[352, 350], [612, 420], [396, 500], [566, 342], [640, 496]]) {
    brush.dab(x, y + 9, 10, 12, 0, '#8a7a34', 0.6)
    brush.dab(x, y - 4, 6.5, 8, 0, '#93853a', 0.6)
    brush.stroke([x, y - 11, x + 2, y - 19], 1.6, bark, 0)
  }
}

/**
 * The street over the garden wall, in sun: house fronts across the way, the window the aunt lives at with a
 * small table beside it, and the bee-keeper's hive. The visitors stand out here between their turns, and
 * their bouquets with them.
 */
function street(brush: Brush, b: Bounds): void {
  const g = brush.g
  const { left, right, top } = WALL
  const sky = g.createLinearGradient(0, Math.min(0, b.top), 0, top)
  sky.addColorStop(0, '#93aebb'); sky.addColorStop(1, '#e6dcc0')
  g.fillStyle = sky
  g.fillRect(left, b.top, right - left, top - b.top)
  for (let i = 0; i < 9; i++) brush.stroke([left + brush.vary(0, 640), brush.vary(24, 90), left + brush.vary(80, 720), brush.vary(24, 90)], brush.vary(16, 30), tone('#dbe4dc', brush.vary(-0.05, 0.2), 0.5), 0)
  // House fronts: ochre and brick, glazed flat, each with its own roof line.
  const fronts: [number, number, string, number][] = [[left, 468, '#c39a6c', 78], [468, 640, '#b38a66', 118], [640, 800, '#caa272', 92], [800, 930, '#b9906a', 128], [930, right, '#c8a070', 100]]
  for (const [x0, x1, color, roof] of fronts) {
    brush.within(x0, roof, x1, top).fill((p) => p.rect(x0, roof, x1 - x0, top - roof + 2), color, 10, Math.PI / 2, 0.15)
    brush.within(x0 - 6, roof - 40, x1 + 6, roof + 4).fill((p) => { p.moveTo(x0 - 6, roof + 2); p.lineTo(x0 + 26, roof - 38); p.lineTo(x1 - 26, roof - 38); p.lineTo(x1 + 6, roof + 2); p.closePath() }, '#8f4c34', 6, 0, 0.2)
    for (let x = x0 + 34; x < x1 - 40; x += 62) {
      if (Math.abs(x + 17 - HOME.aunt.x) < 70 && x0 === left) continue
      brush.within(x, roof + 26, x + 34, roof + 70).fill((p) => p.rect(x, roof + 26, 34, 44), '#5e6e70', 2, 0, 0.1)
      brush.stroke([x - 3, roof + 72, x + 37, roof + 72], 4, '#e8dcc0', 0.2)
    }
  }
  // The aunt's window: a dark room behind a stone frame, shutters folded back, and her small table beside it.
  const ax = HOME.aunt.x
  brush.within(ax - 46, 104, ax + 46, top).fill((p) => p.rect(ax - 44, 106, 88, top - 104), '#2e2019', 3, 0, 0)
  brush.stroke([ax - 46, 104, ax + 46, 104], 8, '#e8dcc0', 0.4)
  for (const side of [-1, 1]) brush.within(ax + side * 60 - 13, 108, ax + side * 60 + 13, top).fill((p) => p.rect(ax + side * 60 - 12, 108, 24, top - 108), '#4f7a66', 4, Math.PI / 2, 0.3)
  // A table with a leg at each end and a cloth hung over its front.
  for (const side of [-1, 1]) brush.stroke([SILL.x + side * 25, SILL.top + 5, SILL.x + side * 27, top], 5, '#6a4c30', 0.4)
  brush.within(SILL.x - 24, SILL.top, SILL.x + 24, SILL.top + 22).fill((p) => { p.moveTo(SILL.x - 22, SILL.top + 2); p.lineTo(SILL.x + 22, SILL.top + 2); p.lineTo(SILL.x + 20, SILL.top + 17); p.lineTo(SILL.x, SILL.top + 21); p.lineTo(SILL.x - 20, SILL.top + 17); p.closePath() }, '#e9e2d0', 3, Math.PI / 2, 0.2)
  brush.stroke([SILL.x - 31, SILL.top + 3, SILL.x + 31, SILL.top + 3], 6, '#7a5a3a', 0.6)
  // The hive on its stand: coiled straw, with a door.
  brush.within(HIVE.x - 30, HIVE.top, HIVE.x + 30, top).fill((p) => { p.moveTo(HIVE.x - 30, top); p.lineTo(HIVE.x - 28, HIVE.top + 22); p.quadraticCurveTo(HIVE.x, HIVE.top - 12, HIVE.x + 28, HIVE.top + 22); p.lineTo(HIVE.x + 30, top); p.closePath() }, '#c79a4a', 0, 0, 0.7)
  for (let i = 0; i < 4; i++) brush.stroke([HIVE.x - 28, HIVE.top + 22 + i * 12, HIVE.x, HIVE.top + 26 + i * 12, HIVE.x + 28, HIVE.top + 22 + i * 12], 2.4, '#8d6a2c', 0.2)
  brush.dab(HIVE.x, top - 10, 7, 6, 0, '#3a2a14', 0)
  // The coping of the garden wall, under which the garden begins.
  brush.stroke([left - 2, top + 9, right + 2, top + 9], 18, '#6a5a46', 0.6)
  for (let x = left + 8; x < right; x += 58) brush.stroke([x, top + 2, x + brush.vary(-2, 2), top + 17], 2, '#3f3122', 0.2)
  brush.stroke([left, top + 2, right, top + 2], 3, '#b7a684', 0.4)
}

/** The gateway and the street beyond it, in sun. */
function gate(brush: Brush): void {
  const g = brush.g
  const { left, right, top, bottom } = GATE
  const mid = (left + right) / 2, half = (right - left) / 2
  const arch = (p: G, inset: number): void => {
    p.moveTo(left + inset, bottom)
    p.lineTo(left + inset, top + half)
    p.arc(mid, top + half, half - inset, Math.PI, 0)
    p.lineTo(right - inset, bottom)
    p.closePath()
  }
  brush.within(left - 26, top - 28, right + 26, bottom).fill((p) => arch(p, -22), '#6a5a46', 30, 1.4, 0.7)
  g.save()
  g.beginPath(); arch(g, 0); g.clip()
  const sky = g.createLinearGradient(0, top, 0, top + 190)
  sky.addColorStop(0, '#b9cfd6'); sky.addColorStop(1, '#e3dcc0')
  g.fillStyle = sky
  g.fillRect(left, top, right - left, bottom - top)
  // The far side of the street in sun, and the cobbles running up to the threshold.
  brush.within(left, top + 150, right, 470).fill((p) => p.rect(left - 4, top + 150, right - left + 8, 330), '#d2ac74', 12, 1.5, 0.2)
  g.fillStyle = '#b89f78'
  g.fillRect(left, 470, right - left, bottom - 470)
  for (let i = 0; i < 26; i++) brush.dab(left + brush.vary(4, right - left - 4), brush.vary(478, bottom - 6), brush.vary(8, 13), brush.vary(3.5, 5), 0, tone('#a88f68', brush.vary(-0.2, 0.25)), 0.4)
  // The doorstep: a pale worn slab in the sun, the ground of whoever waits here.
  brush.within(left, bottom - 30, right, bottom).fill((p) => p.rect(left - 2, bottom - 28, right - left + 4, 30), '#dccfae', 9, 0, 0.35)
  brush.stroke([left + 2, bottom - 29, right - 2, bottom - 29], 3, '#f1e8cc', 0.3)
  g.restore()
}

/** The bed along the front, its tile edging, the fork the robin sits on, and the path. */
function ground(brush: Brush, b: Bounds): void {
  const g = brush.g
  // The path: worn flags of warm stone.
  g.fillStyle = '#6f5c44'
  g.fillRect(b.left, PATH.top - 22, b.right - b.left, b.bottom - PATH.top + 22)
  for (let i = 0; i < 90; i++) {
    const x = brush.vary(b.left, b.right), y = brush.vary(PATH.top - 16, b.bottom)
    brush.stroke([x, y, x + brush.vary(50, 150), y + brush.vary(-3, 3)], brush.vary(10, 20), tone('#75614a', brush.vary(-0.22, 0.2)), 0.25)
  }
  for (let x = b.left + 30; x < b.right; x += 148) brush.stroke([x + brush.vary(-10, 10), PATH.top - 14, x + brush.vary(-24, 24), b.bottom], 3, '#3f3122', 0.4)
  brush.stroke([b.left, 796, (b.left + b.right) / 2, 800, b.right, 795], 3, '#3f3122', 0.4)
  // The earth of the bed, dark and turned, catching the light on its clods.
  const end = TABLE.left - 6
  brush.within(b.left, SOIL_Y - 14, end, PATH.top - 10).fill((p) => { p.moveTo(b.left, PATH.top - 8); p.lineTo(b.left, SOIL_Y - 4); p.quadraticCurveTo(end * 0.5, SOIL_Y - 20, end, SOIL_Y - 2); p.lineTo(end + 4, PATH.top - 8); p.closePath() }, '#2a180d', 40, 0.1, 0.5)
  for (let i = 0; i < 70; i++) brush.dab(brush.vary(b.left, end - 6), brush.vary(SOIL_Y - 8, PATH.top - 16), brush.vary(5, 12), brush.vary(3, 5), brush.vary(-0.3, 0.3), tone('#3a2212', brush.vary(-0.3, 0.35)), 0.6)
  // A row of scalloped tiles in front of it.
  for (let x = b.left - 10; x < end; x += 30) brush.dab(x + 15, PATH.top - 10, 15, 11, 0, tone('#8a4a2a', brush.vary(-0.18, 0.12)), 0.8)
  // The garden fork, stood in the earth at the window end.
  brush.stroke([ROBIN.x, SOIL_Y + 4, ROBIN.x + 1, ROBIN.y + 46], 7, '#8d6a3a', 0.8)
  brush.stroke([ROBIN.x - 15, ROBIN.y + 26, ROBIN.x + 15, ROBIN.y + 26], 7, '#7b5a2f', 0.8)
  brush.stroke([ROBIN.x - 14, ROBIN.y + 27, ROBIN.x - 10, ROBIN.y + 44, ROBIN.x, ROBIN.y + 48], 5, '#7b5a2f', 0.6)
  brush.stroke([ROBIN.x + 14, ROBIN.y + 27, ROBIN.x + 10, ROBIN.y + 44, ROBIN.x, ROBIN.y + 48], 5, '#7b5a2f', 0.6)
}

/** Old varnish: a net of fine cracks over the whole picture. */
function craquelure(brush: Brush, b: Bounds): void {
  const g = brush.g
  g.lineCap = 'round'
  for (let i = 0; i < 70; i++) {
    let x = brush.vary(b.left, b.right), y = brush.vary(b.top, b.bottom), a = brush.vary(0, Math.PI * 2)
    const steps = Math.floor(brush.vary(4, 12))
    for (const [dx, color, w] of [[0, 'rgba(12,7,3,0.3)', 0.9], [0.9, 'rgba(255,235,200,0.1)', 0.6]] as const) {
      let cx = x, cy = y, ca = a
      g.strokeStyle = color
      g.lineWidth = w
      g.beginPath()
      g.moveTo(cx + dx, cy + dx)
      for (let s = 0; s < steps; s++) {
        ca += Math.sin(i * 7.1 + s * 2.3) * 0.7
        cx += Math.cos(ca) * 16; cy += Math.sin(ca) * 16
        g.lineTo(cx + dx, cy + dx)
      }
      g.stroke()
    }
    x += 1; y += 1; a += 1
  }
}

/** The gilt edge of the frame, round the whole surface. */
function frame(brush: Brush, b: Bounds): void {
  const g = brush.g
  const w = 15
  // The corners darken first, as in an old picture.
  const dusk = g.createRadialGradient((b.left + b.right) / 2, (b.top + b.bottom) / 2, 380, (b.left + b.right) / 2, (b.top + b.bottom) / 2, 860)
  dusk.addColorStop(0, 'rgba(10,5,2,0)'); dusk.addColorStop(1, 'rgba(10,5,2,0.5)')
  g.fillStyle = dusk
  g.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top)
  const side = (x0: number, y0: number, x1: number, y1: number): void => {
    brush.stroke([x0, y0, x1, y1], w * 2, '#b78a2c', 1)
    const long = Math.hypot(x1 - x0, y1 - y0)
    for (let d = 14; d < long; d += 26) {
      const x = x0 + ((x1 - x0) * d) / long, y = y0 + ((y1 - y0) * d) / long
      const inX = x0 === x1 ? (x0 < 100 ? w * 0.55 : -w * 0.55) : 0, inY = y0 === y1 ? (y0 < 100 ? w * 0.55 : -w * 0.55) : 0
      brush.dab(x + inX, y + inY, 6, 3.6, x0 === x1 ? Math.PI / 2 : 0, '#e9c75a', 1)
    }
  }
  side(b.left, b.top, b.right, b.top)
  side(b.left, b.bottom, b.right, b.bottom)
  side(b.left, b.top, b.left, b.bottom)
  side(b.right, b.top, b.right, b.bottom)
  g.strokeStyle = 'rgba(30,16,6,0.75)'
  g.lineWidth = 3
  g.strokeRect(b.left + w, b.top + w, b.right - b.left - w * 2, b.bottom - b.top - w * 2)
}

/** Paints the whole still garden into `g`, which draws in stage units, out to the edges of the surface. */
export function paintScenery(g: G, b: Bounds): void {
  const brush = new Brush(g, makeRng(1648))
  wall(brush, b)
  street(brush, b)
  espalier(brush)
  windowAndLight(brush)
  gate(brush)
  ground(brush, b)
  craquelure(brush, b)
  frame(brush, b)
}

/** Where the cat lies, for the painter of the cat: the top of the sill. */
export const SILL_Y = WINDOW.bottom
export const CAT_AT = CAT
