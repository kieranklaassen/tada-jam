import { disc, INK, lifted, roundRect, stream, type Ctx } from './paint'
import { GARAGE } from './mouse'
import { CLUTTER, HUNG, MAT_BOX, NOOK, PILLAR_LEFT, PRACTICE, STAGE, WINDOW_LEFT } from './stage'

// The stall as a place, painted once into the still layer. Along the far
// side: the back wall with its tool board and shelf, the corner post, and
// from there the open front with the awning over it and the lane beyond.
// Then the counter, and the bench: pale wood with the grey mat laid on it,
// and the old hand's own clutter in the corners she keeps.
//
// All of it is lower in contrast than anything a finger works with: pale
// plaster, pale wood, greyed colours. Nothing here is drawn with a letter, a
// numeral or a sign.

const SET = {
  plaster: '#ecdfc4',
  plasterPatch: '#e3d5b6',
  plinth: '#d9caa8',
  cobble: '#cdbd9a',
  cobbleDark: '#bfae8a',
  frame: '#d3c4a0',
  dark: '#8f9792',
  shutter: '#b9c7ab',
  shutterDark: '#a3b394',
  leaf: '#8fb07a',
  bloom: '#d98a7f',
  door: '#a9b6ab',
  doorDark: '#93a297',
  line: '#b9ab8a',
  wash: ['#e7b9a8', '#b7cbd9', '#f1e6c9', '#c9d8b6'],
  awning: '#d86d5e',
  awningPale: '#f6ecd6',
  awningShade: 'rgba(96, 70, 48, 0.13)',
  wall: '#d6ddd6',
  plank: '#c8d1c9',
  peg: '#c9d2ca',
  pegHole: '#b4bfb6',
  outline: '#bcc6bd',
  shelf: '#cdb88f',
  shelfEdge: '#b29a70',
  post: '#c8b28b',
  postDark: '#b09a72',
  wood: '#ded3ba',
  grain: '#d3c7ab',
  canvas: '#c9bb97',
  canvasDark: '#b3a37d',
} as const

/** The colours of the washing on the line across the lane, for the painter that draws it each frame. */
export const WASH = { cloth: SET.wash, cuff: SET.awningPale, spot: SET.bloom, peg: SET.shelfEdge } as const

/** How far down the awning's valance hangs: the strip that is stamped back over whoever stands under it. */
export const AWNING_BOTTOM = 32

/** The lane beyond the open front: the house across the way, its window and door, the washing, the cobbles. */
export function paintLaneFar(c: Ctx, bleed: number): void {
  const left = WINDOW_LEFT, right = STAGE.w + bleed, floor = STAGE.counterTop
  const random = stream(7)
  c.fillStyle = SET.plaster
  c.fillRect(left, -bleed, right - left, floor + bleed)
  c.fillStyle = SET.plasterPatch
  for (let i = 0; i < 26; i++) {
    roundRect(c, left + random() * (right - left), -10 + random() * 150, 40 + random() * 44, 16 + random() * 12, 8)
    c.fill()
  }
  // The foot of the wall, and the cobbles of the lane.
  c.fillStyle = SET.plinth
  c.fillRect(left, 152, right - left, floor - 152)
  for (let x = left - 10; x < right; x += 30) for (let row = 0; row < 2; row++) {
    roundRect(c, x + row * 15 + random() * 4, 180 + row * 12, 26, 10, 5)
    c.fillStyle = random() < 0.5 ? SET.cobble : SET.cobbleDark
    c.fill()
  }

  // A window with its shutters folded back and a box of geraniums on the sill.
  const wx = 502, wy = 58, ww = 74, wh = 84
  for (const side of [-1, 1]) {
    const sx = side < 0 ? wx - 30 : wx + ww + 2
    roundRect(c, sx, wy - 2, 28, wh + 4, 3)
    c.fillStyle = SET.shutter
    c.fill()
    c.fillStyle = SET.shutterDark
    for (let y = wy + 6; y < wy + wh - 4; y += 9) c.fillRect(sx + 4, y, 20, 3)
  }
  roundRect(c, wx - 4, wy - 4, ww + 8, wh + 8, 5)
  c.fillStyle = SET.frame
  c.fill()
  c.fillStyle = SET.dark
  c.fillRect(wx, wy, ww, wh)
  // A curtain drawn half across, and the bar of the casement.
  c.fillStyle = 'rgba(246, 236, 214, 0.75)'
  c.beginPath()
  c.moveTo(wx, wy)
  c.lineTo(wx + 34, wy)
  c.quadraticCurveTo(wx + 30, wy + 50, wx + 8, wy + wh)
  c.lineTo(wx, wy + wh)
  c.closePath()
  c.fill()
  c.fillStyle = SET.frame
  c.fillRect(wx + ww / 2 - 2, wy, 4, wh)
  roundRect(c, wx - 12, wy + wh + 2, ww + 24, 15, 4)
  c.fillStyle = '#c9a98a'
  c.fill()
  for (let i = 0; i < 9; i++) disc(c, wx - 6 + i * 11 + random() * 4, wy + wh - 2 - random() * 8, 7 + random() * 3, SET.leaf)
  for (let i = 0; i < 7; i++) disc(c, wx - 2 + i * 13 + random() * 5, wy + wh - 8 - random() * 9, 3.6, SET.bloom)

  // A doorway, its door standing ajar on the dark of the house.
  const dx = 838, dw = 66, dtop = 62
  c.fillStyle = SET.frame
  c.beginPath()
  c.moveTo(dx - 7, floor)
  c.lineTo(dx - 7, dtop + 30)
  c.quadraticCurveTo(dx + dw / 2, dtop - 22, dx + dw + 7, dtop + 30)
  c.lineTo(dx + dw + 7, floor)
  c.closePath()
  c.fill()
  c.fillStyle = SET.dark
  c.beginPath()
  c.moveTo(dx, floor)
  c.lineTo(dx, dtop + 32)
  c.quadraticCurveTo(dx + dw / 2, dtop - 12, dx + dw, dtop + 32)
  c.lineTo(dx + dw, floor)
  c.closePath()
  c.fill()
  c.fillStyle = SET.door
  c.beginPath()
  c.moveTo(dx + dw, floor)
  c.lineTo(dx + dw, dtop + 32)
  c.quadraticCurveTo(dx + dw - 8, dtop + 16, dx + dw - 22, dtop + 8)
  c.lineTo(dx + dw - 22, floor)
  c.closePath()
  c.fill()
  c.fillStyle = SET.doorDark
  c.fillRect(dx + dw - 18, dtop + 44, 12, 40)
  c.fillRect(dx + dw - 18, dtop + 92, 12, 40)
  disc(c, dx + dw - 19, dtop + 88, 2.6, SET.frame)
  // The step.
  roundRect(c, dx - 14, floor - 8, dw + 28, 12, 4)
  c.fillStyle = SET.cobbleDark
  c.fill()

  // The line the washing hangs on, across the lane. What hangs on it is drawn each frame (paintLife.ts): it swings.
  c.strokeStyle = SET.line
  c.lineWidth = 1.6
  c.beginPath()
  c.moveTo(left, 34)
  c.quadraticCurveTo((left + STAGE.w) / 2, 62, STAGE.w + 40, 30)
  c.stroke()

  // The awning's shade on the wall across the way.
  c.fillStyle = SET.awningShade
  c.beginPath()
  c.moveTo(left, -bleed)
  c.lineTo(right, -bleed)
  c.lineTo(right, 54)
  for (let x = STAGE.w; x >= left; x -= 28) c.quadraticCurveTo(x - 14, 78, x - 28, 60)
  c.closePath()
  c.fill()
}

/** One tool hanging on the board: drawn about the peg it hangs from. */
function tool(c: Ctx, x: number, y: number, what: 'pliers' | 'driver' | 'hammer' | 'fishbone'): void {
  c.save()
  c.translate(x, y)
  disc(c, 0, 0, 2.6, SET.pegHole)
  c.lineCap = 'round'
  if (what === 'pliers') {
    c.strokeStyle = '#c2847a'
    c.lineWidth = 6
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 2, 20); c.quadraticCurveTo(side * 12, 34, side * 7, 52); c.stroke() }
    c.strokeStyle = '#aab2b6'
    c.lineWidth = 5
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * 2, 20); c.lineTo(-side * 3, 2); c.stroke() }
    disc(c, 0, 19, 3.4, '#98a1a6')
  } else if (what === 'driver') {
    c.strokeStyle = '#aab2b6'
    c.lineWidth = 3.4
    c.beginPath()
    c.moveTo(0, 26)
    c.lineTo(0, 58)
    c.stroke()
    roundRect(c, -6.5, 0, 13, 28, 5)
    c.fillStyle = '#d9b45f'
    c.fill()
  } else if (what === 'hammer') {
    c.strokeStyle = SET.shelfEdge
    c.lineWidth = 6
    c.beginPath()
    c.moveTo(0, 8)
    c.lineTo(0, 54)
    c.stroke()
    // A claw hammer, hung by its head: the face to one side, the claw curling down on the other.
    c.fillStyle = '#98a1a6'
    c.beginPath()
    c.moveTo(-4, -3)
    c.lineTo(15, -3)
    c.lineTo(15, 11)
    c.lineTo(-4, 9)
    c.quadraticCurveTo(-13, 9, -17, 19)
    c.quadraticCurveTo(-18, 2, -4, -3)
    c.closePath()
    c.fill()
  } else {
    // Where a spanner should hang, by its painted outline, hangs what is left of somebody's lunch.
    c.strokeStyle = SET.outline
    c.lineWidth = 9
    c.beginPath()
    c.moveTo(0, 10)
    c.lineTo(0, 44)
    c.stroke()
    c.lineWidth = 4
    c.beginPath()
    c.arc(0, 4, 8, Math.PI * 0.75, Math.PI * 2.25)
    c.stroke()
    c.strokeStyle = '#f3efe2'
    c.lineWidth = 2.4
    c.beginPath()
    // The spine, and the ribs swept back from it on either side: none crosses it square.
    c.moveTo(0, 8)
    c.lineTo(0, 40)
    for (let i = 0; i < 5; i++) for (const side of [-1, 1]) { c.moveTo(0, 14 + i * 5); c.lineTo(side * (7 - i * 0.8), 19 + i * 5) }
    c.stroke()
    // A forked tail at the bottom, two strokes, and at the top a round skull with an eye: nothing with a point to it.
    c.beginPath()
    c.moveTo(0, 40)
    c.lineTo(-6, 50)
    c.moveTo(0, 40)
    c.lineTo(6, 50)
    c.stroke()
    disc(c, 0, 5, 6.5, '#f3efe2')
    disc(c, -2, 4, 1.6, SET.dark)
  }
  c.restore()
}

/** The back wall of the stall: planks, the old hand's tool board, the shelf with what has been waiting longest to be mended, and the corner post. */
export function paintWall(c: Ctx, bleed: number): void {
  const floor = STAGE.counterTop
  c.fillStyle = SET.wall
  c.fillRect(-bleed, -bleed, WINDOW_LEFT + bleed, floor + bleed)
  c.fillStyle = SET.plank
  for (let x = -bleed + ((bleed % 38) + 6); x < WINDOW_LEFT; x += 38) c.fillRect(x, -bleed, 2, floor + bleed)

  // The tool board behind her stool, with its row of holes.
  roundRect(c, 8, 6, 190, 96, 8)
  c.fillStyle = SET.peg
  c.fill()
  c.fillStyle = SET.pegHole
  for (let x = 20; x < 196; x += 16) for (let y = 16; y < 98; y += 16) c.fillRect(x - 1, y - 1, 2.4, 2.4)
  tool(c, 24, 14, 'pliers')
  tool(c, 56, 12, 'fishbone')
  tool(c, 152, 12, 'driver')
  tool(c, 182, 16, 'hammer')

  // The shelf: her practice board stands on it at the left, and to its right the things that have waited longest.
  const sy = PRACTICE.y + PRACTICE.h, sx = PRACTICE.x - 10, sw = WINDOW_LEFT - 22 - sx
  lifted(c, 4, () => {
    c.fillStyle = SET.shelf
    c.fillRect(sx, sy, sw, 7)
  })
  c.fillStyle = SET.shelfEdge
  c.fillRect(sx, sy + 5, sw, 2)
  // Where the board hangs, the wall is a shade paler than the rest: so the place is a place when nothing hangs there.
  roundRect(c, HUNG.x + 6, HUNG.y + 6, HUNG.w - 12, HUNG.h - 8, 8)
  c.fillStyle = 'rgba(255, 255, 255, 0.28)'
  c.fill()
  // The cords the hanging board hangs by, down from under the shelf.
  c.strokeStyle = SET.shelfEdge
  c.lineWidth = 2
  for (const hx of [HUNG.x + 46, HUNG.x + HUNG.w - 46]) { c.beginPath(); c.moveTo(hx, sy + 7); c.lineTo(hx, HUNG.y + 6); c.stroke() }

  // A toaster with a sticking plaster and its plug hanging over the edge.
  {
    const x = 340, y = sy
    roundRect(c, x, y - 38, 52, 38, 9)
    c.fillStyle = '#b9cfc4'
    c.fill()
    c.fillStyle = '#9db5a9'
    c.fillRect(x + 8, y - 38, 14, 4)
    c.fillRect(x + 30, y - 38, 14, 4)
    roundRect(c, x + 44, y - 26, 6, 14, 2)
    c.fillStyle = '#8fa69b'
    c.fill()
    // The plaster, stuck on crosswise.
    c.save()
    c.translate(x + 22, y - 18)
    c.rotate(-0.5)
    roundRect(c, -13, -4.5, 26, 9, 4)
    c.fillStyle = '#eccfb0'
    c.fill()
    c.fillStyle = '#f7ead8'
    c.fillRect(-4, -4.5, 8, 9)
    c.restore()
    c.strokeStyle = '#9aa3a0'
    c.lineWidth = 2.4
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(x + 4, y - 4)
    c.quadraticCurveTo(x - 12, y + 2, x - 8, y + 20)
    c.stroke()
    roundRect(c, x - 13, y + 18, 10, 9, 2)
    c.fillStyle = '#9aa3a0'
    c.fill()
  }
  // A radio whose aerial somebody has tied in a knot.
  {
    const x = 402, y = sy
    roundRect(c, x, y - 34, 56, 34, 7)
    c.fillStyle = '#e0b7a3'
    c.fill()
    disc(c, x + 18, y - 17, 11, '#c99c87')
    for (let i = -1; i <= 1; i++) { c.fillStyle = '#e0b7a3'; c.fillRect(x + 9, y - 18 + i * 6, 18, 2) }
    disc(c, x + 43, y - 23, 5, '#f3e6cf')
    disc(c, x + 43, y - 9, 3.4, '#c99c87')
    c.strokeStyle = '#a9b1b4'
    c.lineWidth = 2.2
    c.beginPath()
    c.moveTo(x + 50, y - 34)
    c.lineTo(x + 54, y - 46)
    c.bezierCurveTo(x + 68, y - 60, x + 40, y - 62, x + 52, y - 50)
    c.bezierCurveTo(x + 62, y - 44, x + 48, y - 58, x + 58, y - 66)
    c.stroke()
    disc(c, x + 58, y - 66, 2.6, '#a9b1b4')
  }

  // The pillar at the other side of the open front, and the stall's wall beyond it: plain boards, with nothing on
  // them. The lane is seen between the corner post and this, and whoever passes comes into view from behind it.
  c.fillStyle = SET.wall
  c.fillRect(PILLAR_LEFT, -bleed, STAGE.w - PILLAR_LEFT + bleed, floor + bleed)
  c.fillStyle = SET.plank
  for (let x = PILLAR_LEFT + 30; x < STAGE.w + bleed; x += 38) c.fillRect(x, -bleed, 2, floor + bleed)
  c.fillStyle = SET.post
  c.fillRect(PILLAR_LEFT - 2, -bleed, 18, floor + bleed)
  c.fillStyle = SET.postDark
  c.fillRect(PILLAR_LEFT - 2, -bleed, 2, floor + bleed)

  // The corner post of the open front, with a hank of flex on a nail.
  c.fillStyle = SET.post
  c.fillRect(WINDOW_LEFT - 16, -bleed, 18, floor + bleed)
  c.fillStyle = SET.postDark
  c.fillRect(WINDOW_LEFT, -bleed, 2, floor + bleed)
  disc(c, WINDOW_LEFT - 7, 92, 2.6, SET.dark)
  // A hank of old flex over the nail: three ends hanging, none of them a ring.
  c.lineWidth = 2.6
  c.lineCap = 'round'
  ;['#c9a36f', '#b9c7ab', '#d7a79b'].forEach((colour, i) => {
    c.strokeStyle = colour
    c.beginPath()
    c.moveTo(WINDOW_LEFT - 7, 92)
    c.quadraticCurveTo(WINDOW_LEFT - 13 + i * 5, 112 + i * 4, WINDOW_LEFT - 10 + i * 3, 128 + i * 9)
    c.stroke()
  })
}

/** The awning's valance over the open front: stripes and scallops. Whoever stands in the lane stands under it. */
export function paintAwning(c: Ctx, bleed: number): void {
  const left = WINDOW_LEFT - 20, right = STAGE.w + bleed, drop = 14
  lifted(c, 5, () => {
    c.fillStyle = SET.awningPale
    c.beginPath()
    c.moveTo(left, -bleed)
    c.lineTo(right, -bleed)
    c.lineTo(right, drop)
    for (let x = left + Math.ceil((right - left) / 30) * 30; x > left; x -= 30) c.quadraticCurveTo(x - 15, drop + 20, x - 30, drop)
    c.closePath()
    c.fill()
  })
  // Every other scallop is the awning's red, greyed by the sun.
  c.fillStyle = SET.awning
  for (let x = left, i = 0; x < right; x += 30, i++) {
    if (i % 2) continue
    c.beginPath()
    c.moveTo(x, -bleed)
    c.lineTo(x + 30, -bleed)
    c.lineTo(x + 30, drop)
    c.quadraticCurveTo(x + 15, drop + 20, x, drop)
    c.closePath()
    c.fill()
  }
  // The rail it hangs from.
  c.fillStyle = 'rgba(60, 44, 36, 0.14)'
  c.fillRect(left, 2, right - left, 2.4)
}

/** The counter along the far side of the bench: a pale strip with a metal edge and a row of screws, casting a little shade. */
export function paintCounter(c: Ctx, bleed: number): void {
  lifted(c, 7, () => {
    c.fillStyle = INK.counter
    c.fillRect(-bleed, STAGE.counterTop, STAGE.w + 2 * bleed, STAGE.counterBottom - STAGE.counterTop)
  })
  c.fillStyle = INK.counterEdge
  c.fillRect(-bleed, STAGE.counterBottom - 6, STAGE.w + 2 * bleed, 6)
  c.fillStyle = 'rgba(255, 255, 255, 0.6)'
  c.fillRect(-bleed, STAGE.counterTop, STAGE.w + 2 * bleed, 3)
  for (let x = 24; x < STAGE.w; x += 212) {
    disc(c, x, STAGE.counterTop + 15, 5, INK.steelDark)
    disc(c, x, STAGE.counterTop + 15, 3.4, INK.steel)
  }
}

/** The bench top: pale wood, and on it the grey mat with its stitched edge and printed squares. */
export function paintBenchTop(c: Ctx, bleed: number): void {
  const top = STAGE.counterBottom
  c.fillStyle = SET.wood
  c.fillRect(-bleed, top, STAGE.w + 2 * bleed, STAGE.h - top + bleed)
  const random = stream(11)
  c.strokeStyle = SET.grain
  c.lineWidth = 2
  c.lineCap = 'round'
  for (let i = 0; i < 46; i++) {
    const x = -bleed + random() * (STAGE.w + 2 * bleed), y = top + 8 + random() * (STAGE.h - top + bleed), long = 60 + random() * 160
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(x + long / 2, y + (random() - 0.5) * 6, x + long, y)
    c.stroke()
  }
  // The mat.
  const m = MAT_BOX
  lifted(c, 4, () => {
    roundRect(c, m.x, m.y, m.w, m.h, 20)
    c.fillStyle = INK.mat
    c.fill()
  })
  c.save()
  roundRect(c, m.x, m.y, m.w, m.h, 20)
  c.clip()
  c.fillStyle = INK.matSpeck
  for (let i = 0; i < 420; i++) c.fillRect(m.x + random() * m.w, m.y + random() * m.h, 2, 2)
  // Printed squares, as on a cutting mat, worn faint.
  c.strokeStyle = 'rgba(152, 160, 168, 0.34)'
  c.lineWidth = 1
  c.beginPath()
  for (let x = m.x + 46; x < m.x + m.w; x += 46) { c.moveTo(x, m.y); c.lineTo(x, m.y + m.h) }
  for (let y = m.y + 46; y < m.y + m.h; y += 46) { c.moveTo(m.x, y); c.lineTo(m.x + m.w, y) }
  c.stroke()
  // The marks along two edges, a long one at every fifth, and the slanting lines and the quarter rings a cutting mat has
  // for angles: all of it printed pale, and none of it a numeral.
  c.strokeStyle = 'rgba(236, 240, 243, 0.5)'
  c.lineWidth = 1.4
  c.beginPath()
  for (let i = 1, x = m.x + 46; x < m.x + m.w - 20; x += 9.2, i++) { c.moveTo(x, m.y + 20); c.lineTo(x, m.y + (i % 5 ? 26 : 32)) }
  for (let i = 1, y = m.y + 46; y < m.y + m.h - 20; y += 9.2, i++) { c.moveTo(m.x + 20, y); c.lineTo(m.x + (i % 5 ? 26 : 32), y) }
  c.stroke()
  c.strokeStyle = 'rgba(236, 240, 243, 0.34)'
  c.lineWidth = 1.6
  c.beginPath()
  for (const reach of [0.58, 1, 1.73]) { c.moveTo(m.x + 46, m.y + m.h - 46); c.lineTo(m.x + 46 + 420, m.y + m.h - 46 - 420 * reach) }
  for (const r of [138, 230, 322]) { c.moveTo(m.x + 46 + r, m.y + m.h - 46); c.arc(m.x + 46, m.y + m.h - 46, r, 0, -Math.PI / 2, true) }
  c.stroke()
  // What the years have left on it: the stain of a mug, a scorch, a few scores of a knife.
  // The stain where a mug stood and was knocked: a blot, darker at one side, with a splash off it. Not a ring.
  c.fillStyle = 'rgba(134, 106, 74, 0.1)'
  c.beginPath()
  c.ellipse(m.x + 90, m.y + 296, 30, 24, 0.5, 0, Math.PI * 2)
  c.fill()
  c.beginPath()
  c.ellipse(m.x + 100, m.y + 304, 20, 15, 0.9, 0, Math.PI * 2)
  c.fill()
  disc(c, m.x + 134, m.y + 318, 5, 'rgba(134, 106, 74, 0.12)')
  disc(c, m.x + 640, m.y + 430, 13, 'rgba(96, 88, 80, 0.16)')
  disc(c, m.x + 640, m.y + 430, 6, 'rgba(70, 62, 56, 0.2)')
  c.strokeStyle = 'rgba(152, 160, 168, 0.5)'
  c.lineWidth = 1.4
  for (const [x, y, dx, dy] of [[300, 120, 70, 26], [420, 150, 22, 58], [520, 470, -50, 44], [150, 500, 90, -12]]) {
    c.beginPath()
    c.moveTo(m.x + x, m.y + y)
    c.lineTo(m.x + x + dx, m.y + y + dy)
    c.stroke()
  }
  c.restore()
  c.strokeStyle = INK.matEdge
  c.lineWidth = 2
  c.setLineDash([10, 7])
  roundRect(c, m.x + 10, m.y + 10, m.w - 20, m.h - 20, 13)
  c.stroke()
  c.setLineDash([])
}

/** A screw lying on the bench, seen from above: a six-sided head with a glint on it, and no slot. */
function screw(c: Ctx, x: number, y: number, turn: number, r = 5): void {
  const head = (cx: number, cy: number, fill: string) => {
    c.fillStyle = fill
    c.beginPath()
    for (let i = 0; i < 6; i++) c.lineTo(cx + Math.cos(turn + (i * Math.PI) / 3) * r, cy + Math.sin(turn + (i * Math.PI) / 3) * r)
    c.closePath()
    c.fill()
  }
  head(x + 1, y + 1.6, 'rgba(28, 36, 44, 0.2)')
  head(x, y, '#b7bec4')
  disc(c, x - r * 0.25, y - r * 0.3, r * 0.26, 'rgba(255, 255, 255, 0.6)')
}

/** Where the clutter is drawn from: the corner of the box that is kept clear for it. */
const CORNER = { x: CLUTTER.x, y: CLUTTER.y } as const
/** Where the tip of the soldering iron rests in its stand: the wisp of smoke rises from here. */
export const IRON_TIP = { x: CORNER.x + 226, y: CORNER.y + 104 } as const
/** The jar of screws and the plate of biscuits, for whatever is shaken out of them. */
export const JAR = { x: CORNER.x + 204, y: CORNER.y + 48, r: 36 } as const
export const PLATE = { x: NOOK.x + 124, y: NOOK.y + 46, r: 27 } as const

/** The old hand's clutter in the near left corner of the bench: her roll of tools, a jar of screws, the soldering iron in its stand, a rag. */
export function paintClutter(c: Ctx): void {
  const { x, y } = CORNER
  const random = stream(31)
  // The roll of tools, half unrolled on the wood: canvas, a row of pockets, and a handle out of each.
  c.save()
  c.translate(x + 74, y + 98)
  c.rotate(-0.07)
  lifted(c, 5, () => {
    roundRect(c, -60, -84, 120, 168, 8)
    c.fillStyle = SET.canvas
    c.fill()
  })
  // The end still rolled up, and its tie.
  roundRect(c, -60, 60, 120, 26, 12)
  c.fillStyle = SET.canvasDark
  c.fill()
  c.strokeStyle = '#a8553f'
  c.lineWidth = 3
  c.beginPath()
  c.moveTo(-20, 60)
  c.lineTo(-20, 86)
  c.stroke()
  c.fillStyle = SET.canvasDark
  c.fillRect(-52, -8, 104, 58)
  c.strokeStyle = SET.canvas
  c.lineWidth = 2
  for (let i = 1; i < 5; i++) { c.beginPath(); c.moveTo(-52 + i * 20.8, -8); c.lineTo(-52 + i * 20.8, 50); c.stroke() }
  const handles = ['#d9685c', '#d9b45f', '#6f9fc4', '#7fae84', '#8d7fb0']
  handles.forEach((colour, i) => {
    const hx = -41.6 + i * 20.8, tall = 34 + ((i * 7) % 3) * 9
    c.fillStyle = '#aab2b6'
    c.fillRect(hx - 2, -8 - tall - 22, 4, 26)
    roundRect(c, hx - 6.5, -8 - tall, 13, tall + 6, 5)
    c.fillStyle = colour
    c.fill()
    c.fillStyle = 'rgba(255, 255, 255, 0.28)'
    c.fillRect(hx - 4, -4 - tall, 3, tall - 4)
  })
  c.restore()

  // The jar of screws, seen from above: glass, and what is in it.
  lifted(c, 6, () => disc(c, JAR.x, JAR.y, JAR.r, '#dfe9ec'))
  disc(c, JAR.x, JAR.y, JAR.r - 6, '#c9d6da')
  for (let i = 0; i < 16; i++) {
    const a = random() * Math.PI * 2, d = Math.sqrt(random()) * (JAR.r - 12)
    screw(c, JAR.x + Math.cos(a) * d, JAR.y + Math.sin(a) * d, random() * Math.PI, 4.2)
  }
  c.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  c.lineWidth = 3
  c.beginPath()
  c.arc(JAR.x, JAR.y, JAR.r - 3, 3.5, 4.6)
  c.stroke()
  c.strokeStyle = '#a9bcc7'
  c.lineWidth = 2
  c.beginPath()
  c.arc(JAR.x, JAR.y, JAR.r, 0, Math.PI * 2)
  c.stroke()
  // Its lid, beside it.
  lifted(c, 4, () => disc(c, x + 276, y + 30, 21, '#c9a66a'))
  disc(c, x + 276, y + 30, 15, '#d8b97f')
  // The ones that got away.
  screw(c, x + 164, y + 110, 0.4)
  screw(c, x + 258, y + 78, 2.1)
  screw(c, x + 306, y + 62, 1.2, 4)
  // A nut, six-sided, with the mat showing through its hole.
  c.fillStyle = '#98a1a8'
  c.beginPath()
  for (let i = 0; i < 6; i++) c.lineTo(x + 300 + Math.cos(i * Math.PI / 3) * 8, y + 174 + Math.sin(i * Math.PI / 3) * 8)
  c.closePath()
  c.fill()
  disc(c, x + 300, y + 174, 3, INK.mat)

  // The soldering iron in its stand: a base with a sponge, a coil of spring, and the iron laid in it.
  lifted(c, 6, () => {
    roundRect(c, x + 166, y + 122, 132, 58, 10)
    c.fillStyle = '#8f9aa3'
    c.fill()
  })
  roundRect(c, x + 176, y + 132, 42, 38, 6)
  c.fillStyle = '#e3c764'
  c.fill()
  for (const [px, py] of [[186, 142], [200, 150], [190, 160], [208, 140]]) disc(c, x + px, y + py, 2.2, '#c9ad4d')
  c.strokeStyle = '#c3c9cf'
  c.lineWidth = 3.4
  for (let i = 0; i < 6; i++) { c.beginPath(); c.ellipse(x + 234 + i * 8, y + 138 - i * 4.4, 5, 11, 1.06, 0, Math.PI * 2); c.stroke() }
  c.save()
  c.translate(IRON_TIP.x, IRON_TIP.y)
  c.rotate(-0.5)
  c.fillStyle = '#b7bec4'
  c.fillRect(-4, -2.5, 46, 5)
  roundRect(c, 40, -8, 70, 16, 7)
  c.fillStyle = '#5f86b0'
  c.fill()
  c.fillStyle = '#4b6f96'
  c.fillRect(46, -8, 8, 16)
  c.fillStyle = '#d9b45f'
  c.beginPath()
  c.moveTo(-4, -2.5)
  c.lineTo(-11, 0)
  c.lineTo(-4, 2.5)
  c.closePath()
  c.fill()
  c.restore()
  // Its flex, off over the edge of the bench.
  c.strokeStyle = '#4a4f55'
  c.lineWidth = 3.4
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(x + 322, y + 54)
  c.bezierCurveTo(x + 344, y + 60, x + 318, y + 120, x + 312, y + 150)
  c.bezierCurveTo(x + 308, y + 176, x + 280, y + 184, x + 268, y + 210)
  c.stroke()

  // A rag, folded anyhow, and a stub of pencil.
  lifted(c, 4, () => {
    c.fillStyle = '#d9c9a1'
    c.beginPath()
    c.moveTo(x + 180, y + 96)
    c.lineTo(x + 212, y + 92)
    c.lineTo(x + 216, y + 116)
    c.lineTo(x + 196, y + 124)
    c.lineTo(x + 178, y + 114)
    c.closePath()
    c.fill()
  })
  c.fillStyle = '#c9b78c'
  c.beginPath()
  c.moveTo(x + 196, y + 94)
  c.lineTo(x + 212, y + 92)
  c.lineTo(x + 216, y + 116)
  c.closePath()
  c.fill()
  c.save()
  c.translate(x + 150, y + 168)
  c.rotate(0.5)
  c.fillStyle = INK.pencil
  c.fillRect(-16, -3.4, 30, 6.8)
  c.fillStyle = INK.wood
  c.beginPath()
  c.moveTo(14, -3.4)
  c.lineTo(22, 0)
  c.lineTo(14, 3.4)
  c.closePath()
  c.fill()
  c.fillStyle = INK.rubber
  c.fillRect(-20, -3.4, 5, 6.8)
  c.restore()
}

/** The matchbox the clockwork mouse lives in: a sleeve of thin wood, open at the end that faces the mat. */
export function paintGarage(c: Ctx): void {
  const { x, y, w, h } = GARAGE
  lifted(c, 4, () => {
    roundRect(c, x, y, w, h, 4)
    c.fillStyle = '#d7c08f'
    c.fill()
  })
  // The dark of its open end, and on its top a round red label.
  roundRect(c, x + w - 13, y + 4, 11, h - 8, 3)
  c.fillStyle = '#5d5145'
  c.fill()
  disc(c, x + w * 0.38, y + h / 2, 10, '#c9675a')
  disc(c, x + w * 0.38, y + h / 2, 5, '#e3b0a5')
}

/** The plate of biscuits in her nook, with one already begun, and the crumbs. */
export function paintPlate(c: Ctx): void {
  lifted(c, 4, () => disc(c, PLATE.x, PLATE.y, PLATE.r, '#f4f1e8'))
  c.strokeStyle = '#c9d6e4'
  c.lineWidth = 2.4
  c.beginPath()
  c.arc(PLATE.x, PLATE.y, PLATE.r - 5, 0, Math.PI * 2)
  c.stroke()
  const biscuit = (x: number, y: number, bitten: boolean) => {
    disc(c, x + 1, y + 2, 11, 'rgba(60, 44, 30, 0.2)')
    c.fillStyle = '#d9a35e'
    c.beginPath()
    if (bitten) c.arc(x, y, 11, 0.9, Math.PI * 2 - 0.3)
    else c.arc(x, y, 11, 0, Math.PI * 2)
    if (bitten) { c.arc(x + 9, y + 2, 5, Math.PI * 1.6, Math.PI * 0.75, true) }
    c.closePath()
    c.fill()
    for (const [dx, dy] of [[-4, -3], [2, -5], [-2, 4], [-6, 2]]) disc(c, x + dx, y + dy, 1.5, '#b97f3f')
  }
  biscuit(PLATE.x - 8, PLATE.y + 5, false)
  biscuit(PLATE.x + 5, PLATE.y - 6, true)
  for (const [dx, dy] of [[30, 16], [24, 26], [36, 4], [-22, 30]]) disc(c, PLATE.x + dx, PLATE.y + dy, 1.4, '#c98f4c')
}
