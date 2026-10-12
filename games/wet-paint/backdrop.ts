import { INKS, css, type Ink } from './colours'
import { CAT, MAT, POOL, POT, TABLE_Y, TRAY, WINDOW, lineY } from './layout'
import { STAGE } from './stage'

// Everything in the room that stands still, painted once onto one sheet and
// stamped each frame: the wall and the table in their marbled papers, the
// window, the line, the pile of paper the cat sits on, the tray with its
// plain water, the pots' bodies, the jug, the cloth the tools lie on and
// the sponge. The
// room is pale and low in contrast; the tray is the plainest thing in it.

import type { G } from './surface'

const tone = (r: number, g: number, b: number, darker = 12): Ink => ({ face: [r, g, b], edge: [Math.max(0, r - darker), Math.max(0, g - darker), Math.max(0, b - darker)] })

/** The tones of each paper in the room. */
export const WALL: readonly Ink[] = [tone(240, 231, 211, 9), tone(227, 230, 210, 9), tone(237, 220, 206, 9), tone(222, 228, 225, 9)]
export const TABLE: readonly Ink[] = [tone(150, 115, 86, 9), tone(140, 106, 78, 9), tone(159, 124, 94, 9), tone(132, 100, 73, 9)]
export const SKY: readonly Ink[] = [tone(190, 218, 232, 6), tone(204, 227, 237, 6), tone(179, 211, 229, 6)]
export const TOWEL: readonly Ink[] = [tone(128, 176, 174), tone(238, 234, 216), tone(100, 152, 154)]
export const SOCK: readonly Ink[] = [tone(224, 180, 74), tone(241, 216, 142)]

/** How far past the stage the room is painted, so a surface of another shape shows more room and no bare edge. */
export const BLEED = 140

const ENAMEL = '#f7f3e9'
const ENAMEL_LINE = '#4d6fa3'
export const WATER_FACE = '#e2ebe6'
const TABLE_SHADE = 'rgba(60, 40, 24, 0.22)'

function rounded(g: G, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath()
  g.moveTo(x + r, y)
  g.arcTo(x + w, y, x + w, y + h, r)
  g.arcTo(x + w, y + h, x, y + h, r)
  g.arcTo(x, y + h, x, y, r)
  g.arcTo(x, y, x + w, y, r)
  g.closePath()
}

export type RoomTiles = { wall: CanvasImageSource; table: CanvasImageSource; sky: CanvasImageSource }

/** Paints the room, in stage units, onto `g`, whose transform the caller has set. */
export function paintRoom(g: G, tiles: RoomTiles): void {
  const left = -BLEED, wide = STAGE.width + BLEED * 2
  g.lineJoin = 'round'
  g.lineCap = 'round'
  g.imageSmoothingEnabled = true
  g.drawImage(tiles.wall, left, -BLEED, wide, TABLE_Y + BLEED)
  g.drawImage(tiles.table, left, TABLE_Y, wide, STAGE.height + BLEED - TABLE_Y)
  g.fillStyle = '#bba98a'
  g.fillRect(left, TABLE_Y - 8, wide, 8)
  g.fillStyle = '#6b513a'
  g.fillRect(left, TABLE_Y, wide, 4)

  // The window: a frame, the sky in its own pale paper, and two hills. The cloud and the bird are drawn live.
  const win = WINDOW
  g.fillStyle = '#f4eddd'
  g.strokeStyle = '#b3a385'
  g.lineWidth = 3
  rounded(g, win.x - 14, win.y - 14, win.w + 28, win.h + 28, 8)
  g.fill()
  g.stroke()
  g.save()
  g.beginPath()
  g.rect(win.x, win.y, win.w, win.h)
  g.clip()
  g.drawImage(tiles.sky, win.x, win.y, win.w, win.h)
  g.fillStyle = '#b9d2a6'
  g.beginPath()
  g.ellipse(win.x + 70, win.y + win.h + 30, 150, 80, 0, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#a3c492'
  g.beginPath()
  g.ellipse(win.x + 230, win.y + win.h + 44, 130, 86, 0, 0, Math.PI * 2)
  g.fill()
  g.restore()
  g.fillStyle = '#f4eddd'
  g.strokeStyle = '#b3a385'
  rounded(g, win.x - 26, win.y + win.h, win.w + 52, 18, 5)
  g.fill()
  g.stroke()

  // The line across the room.
  g.strokeStyle = '#8a775e'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(left, lineY(0) - 6)
  for (let x = 0; x <= STAGE.width; x += 20) g.lineTo(x, lineY(x))
  g.lineTo(STAGE.width + BLEED, lineY(STAGE.width) - 6)
  g.stroke()

  // The pile of paper the cat sits on: its sheets stick out to both sides.
  const pile = ['#efe7d3', '#f6f0e0', '#e9dfc6', '#f3ecda', '#fbf7ec']
  for (let i = 0; i < pile.length; i++) {
    g.save()
    g.translate(CAT.body.x + 4, TABLE_Y + 22 - i * 4)
    g.rotate((i % 2 === 0 ? 1 : -1) * 0.012 * (i + 1))
    g.fillStyle = pile[i]
    g.strokeStyle = '#c9ba98'
    g.lineWidth = 1.5
    rounded(g, -214 - (i % 3) * 6, -5, 428 + (i % 2) * 14, 10, 2)
    g.fill()
    g.stroke()
    g.restore()
  }

  // The tray: white enamel with a blue line round its rim, and plain water in it.
  g.fillStyle = TABLE_SHADE
  rounded(g, TRAY.x + 8, TRAY.y + 12, TRAY.w, TRAY.h, 26)
  g.fill()
  g.fillStyle = ENAMEL
  g.strokeStyle = '#98a2aa'
  g.lineWidth = 3
  rounded(g, TRAY.x, TRAY.y, TRAY.w, TRAY.h, 26)
  g.fill()
  g.stroke()
  g.strokeStyle = ENAMEL_LINE
  g.lineWidth = 3
  rounded(g, TRAY.x + 7, TRAY.y + 7, TRAY.w - 14, TRAY.h - 14, 20)
  g.stroke()
  g.fillStyle = '#cfd9d6'
  rounded(g, POOL.x - 5, POOL.y - 5, POOL.w + 10, POOL.h + 10, 14)
  g.fill()
  g.fillStyle = WATER_FACE
  g.fillRect(POOL.x, POOL.y, POOL.w, POOL.h)

  // Beside the pots: a jug of water, the cloth the tools lie on, with three old daubs of no one size, and a sponge.
  g.fillStyle = TABLE_SHADE
  g.beginPath()
  g.ellipse(1088, 452, 62, 16, 0, 0, Math.PI * 2)
  g.fill()
  g.strokeStyle = '#aab7b3'
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(1128, 322)
  g.quadraticCurveTo(1172, 350, 1126, 396)
  g.stroke()
  g.fillStyle = '#d5dedb'
  g.strokeStyle = '#9fadaa'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(1040, 268)
  g.lineTo(1124, 268)
  g.quadraticCurveTo(1112, 310, 1134, 360)
  g.quadraticCurveTo(1150, 440, 1080, 452)
  g.quadraticCurveTo(1012, 440, 1028, 360)
  g.quadraticCurveTo(1050, 310, 1040, 268)
  g.closePath()
  g.fill()
  g.stroke()
  g.fillStyle = ENAMEL_LINE
  g.fillRect(1040, 276, 84, 5)

  g.fillStyle = '#dccdac'
  g.strokeStyle = '#b8a785'
  g.lineWidth = 2.5
  g.beginPath()
  g.moveTo(MAT.x + 4, MAT.y + 10)
  g.lineTo(MAT.x + MAT.w - 6, MAT.y)
  g.lineTo(MAT.x + MAT.w, MAT.y + MAT.h - 12)
  g.lineTo(MAT.x + MAT.w * 0.55, MAT.y + MAT.h)
  g.lineTo(MAT.x, MAT.y + MAT.h - 8)
  g.closePath()
  g.fill()
  g.stroke()
  const daubs = [[MAT.x + 30, MAT.y + 268, 1, 17, 9], [MAT.x + 142, MAT.y + 22, 2, 11, 8], [MAT.x + 150, MAT.y + 196, 3, 8, 13]] as const
  for (const [x, y, ink, rx, ry] of daubs) {
    g.fillStyle = css(INKS[ink].face)
    g.globalAlpha = 0.5
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0.4 * ink, 0, Math.PI * 2)
    g.fill()
    g.globalAlpha = 1
  }
  const sx = POT.x - 44, sy = 736
  g.fillStyle = '#e6c768'
  g.strokeStyle = '#c4a246'
  rounded(g, sx, sy, 92, 48, 14)
  g.fill()
  g.stroke()
  g.fillStyle = '#c9a84e'
  for (const [x, y, r] of [[sx + 20, sy + 14, 5], [sx + 48, sy + 32, 4], [sx + 70, sy + 13, 6.5], [sx + 30, sy + 36, 3]] as const) {
    g.beginPath()
    g.ellipse(x, y, r, r * 0.8, 0, 0, Math.PI * 2)
    g.fill()
  }

  // The pots: plain dark glaze. Their liquid and their sticks are drawn live.
  for (const y of POT.ys) {
    g.fillStyle = TABLE_SHADE
    g.beginPath()
    g.ellipse(POT.x + 7, y + 10, POT.r, POT.r, 0, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = '#414c5c'
    g.strokeStyle = '#2a323e'
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(POT.x, y, POT.r, POT.r, 0, 0, Math.PI * 2)
    g.fill()
    g.stroke()
    g.strokeStyle = '#66748a'
    g.lineWidth = 4
    g.beginPath()
    g.ellipse(POT.x, y, POT.r - 9, POT.r - 9, 0, 0, Math.PI * 2)
    g.stroke()
  }
}
