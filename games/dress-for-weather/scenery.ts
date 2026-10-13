import { GARMENT_ART } from './garmentArt'
import { DOOR, GARDEN, HANDLE, MIDDLE, ON_RACK, RACK, SASH_Y, SHEET, VANE, WINDOW } from './layout'
import { WEATHERS, type Weather } from './save'
import { KEY_LINE, PAPER, hatch, printed, ring, round, snip, sprite, type Pen, type Ring, type Sprite } from './paper'
import { makeRng } from './rng'
import { STAGE } from './stage'

// Everything that stands still, painted once when the surface is sized and
// stamped once a frame: the green cutting mat with what lies on it (scissors,
// snippets, the sheet the clothes were cut from), and on the mat the printed
// hall sheet, full to its edges. The hall is lower in contrast than the
// garments and the figures, and the rack board is the one plain surface in
// it, since the working pieces hang there.

const MAT = '#2f7b5d'
const MAT_LINE = 'rgba(214, 240, 222, 0.2)'
const WALL = '#d3d9ea'
const WALL_STRIPE = '#c6cee4'
const FLOOR = '#dcbf92'
const WOOD = '#b98b5a'
const DOOR_BLUE = '#4f7397'
const RACK_BOARD = '#fbf7ec'
/** Where the printed floor meets the printed wall. */
export const SKIRTING_Y = 578

const stroke = (g: Pen, width = 1.5, colour = KEY_LINE): void => {
  g.strokeStyle = colour
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.stroke()
}
const poly = (g: Pen, r: Ring): void => {
  g.moveTo(r[0], r[1])
  for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1])
  g.closePath()
}
const fill = (g: Pen, colour: string, ...rings: Ring[]): void => {
  g.beginPath()
  for (const r of rings) poly(g, r)
  g.fillStyle = colour
  g.fill()
}
const box = (x0: number, y0: number, x1: number, y1: number): Ring => ring(x0, y0, x1, y0, x1, y1, x0, y1)

function mat(g: Pen): void {
  g.fillStyle = MAT
  g.fillRect(-900, -700, STAGE.width + 1800, STAGE.height + 1400)
  // The mat's printed grid: lines only, and nothing written along them.
  g.beginPath()
  for (let x = -880; x <= STAGE.width + 880; x += 40) { g.moveTo(x + 10, -700); g.lineTo(x + 10, STAGE.height + 700) }
  for (let y = -680; y <= STAGE.height + 680; y += 40) { g.moveTo(-900, y + 10); g.lineTo(STAGE.width + 900, y + 10) }
  stroke(g, 1, MAT_LINE)
  g.beginPath()
  for (let x = -790; x <= STAGE.width + 880; x += 200) { g.moveTo(x, -700); g.lineTo(x, STAGE.height + 700) }
  for (let y = -590; y <= STAGE.height + 680; y += 200) { g.moveTo(-900, y); g.lineTo(STAGE.width + 900, y) }
  stroke(g, 1.6, 'rgba(214, 240, 222, 0.3)')
}

/** The sheet the clothes were cut from, with its holes, lying half under the hall sheet. */
function cutSheet(g: Pen): void {
  g.save()
  g.translate(640, 762)
  g.rotate(-0.035)
  g.shadowColor = 'rgba(20, 40, 30, 0.35)'
  const k = (g as CanvasRenderingContext2D).getTransform?.().a ?? 1
  g.shadowBlur = 4 * k
  g.shadowOffsetY = 3 * k
  g.beginPath()
  poly(g, box(0, -40, 470, 80))
  // The holes: a coat, a hat, a boot and a mitten, each a little bigger than the thing that came out of it.
  const hole = (r: Ring, x: number, y: number, s: number) => {
    g.moveTo(x + r[r.length - 2] * s, y + r[r.length - 1] * s)
    for (let i = r.length - 4; i >= 0; i -= 2) g.lineTo(x + r[i] * s, y + r[i + 1] * s)
    g.closePath()
  }
  hole(GARMENT_ART.raincoat.rings[0], 110, -2, 0.42)
  hole(GARMENT_ART.hat.rings[0], 250, 44, 0.5)
  hole(GARMENT_ART.boots.rings[0], 330, 8, 0.6)
  hole(GARMENT_ART.mittens.rings[0], 410, 12, 0.66)
  g.fillStyle = PAPER
  g.fill('evenodd')
  g.restore()
}

function scissors(g: Pen): void {
  g.save()
  g.translate(118, 786)
  g.rotate(-0.22)
  g.shadowColor = 'rgba(20, 40, 30, 0.35)'
  const k = (g as CanvasRenderingContext2D).getTransform?.().a ?? 1
  g.shadowBlur = 3 * k
  g.shadowOffsetY = 2 * k
  fill(g, '#c9ced6', ring(0, -3, 118, -9, 124, -5, 4, 5), ring(0, 3, 118, 9, 124, 5, 4, -5))
  g.beginPath()
  g.ellipse(-22, -15, 24, 13, -0.3, 0, Math.PI * 2)
  g.ellipse(-22, 15, 24, 13, 0.3, 0, Math.PI * 2)
  stroke(g, 8, '#e8793a')
  g.restore()
  g.beginPath()
  g.arc(118, 786, 3, 0, Math.PI * 2)
  g.fillStyle = '#7d828c'
  g.fill()
}

/** Offcuts on the mat, in the colours of the clothes. */
function snippets(g: Pen): void {
  const rng = makeRng(77)
  const colours = [PAPER, '#f3c63a', '#cf4a40', PAPER, '#7d5bbb', '#e25c92', PAPER, '#2aa39c', '#ef7f30']
  const spots: [number, number][] = [[300, 776], [352, 800], [398, 770], [470, 796], [520, 778], [566, 806], [26, 300], [1170, 420], [1166, 610], [30, 560], [240, 806], [8, 120]]
  spots.forEach(([x, y], i) => {
    g.save()
    g.translate(x, y)
    g.rotate(rng.next() * 3)
    g.shadowColor = 'rgba(20, 40, 30, 0.3)'
    const k = (g as CanvasRenderingContext2D).getTransform?.().a ?? 1
    g.shadowBlur = 2 * k
    g.shadowOffsetY = 1.5 * k
    const w = 8 + rng.next() * 12, h = 4 + rng.next() * 8
    fill(g, colours[i % colours.length], ring(-w, -h, w * 0.6, -h * 0.7, w, h * 0.4, -w * 0.4, h))
    g.restore()
  })
}

function wall(g: Pen): void {
  fill(g, WALL, box(SHEET.x0, SHEET.y0, SHEET.x1, SKIRTING_Y))
  // Striped paper, and a small leaf printed down every other stripe.
  g.beginPath()
  for (let x = SHEET.x0 + 22; x < SHEET.x1; x += 44) g.rect(x, SHEET.y0, 22, SKIRTING_Y - SHEET.y0)
  g.fillStyle = WALL_STRIPE
  g.fill()
  g.beginPath()
  for (let x = SHEET.x0 + 11; x < SHEET.x1; x += 44) {
    for (let y = SHEET.y0 + 30 + ((x / 44) % 2 > 1 ? 26 : 0); y < SKIRTING_Y - 20; y += 52) {
      g.moveTo(x, y - 6); g.quadraticCurveTo(x + 6, y, x, y + 6); g.quadraticCurveTo(x - 6, y, x, y - 6)
    }
  }
  g.fillStyle = 'rgba(122, 132, 178, 0.4)'
  g.fill()
  // The skirting board.
  fill(g, '#f7efe0', box(SHEET.x0, SKIRTING_Y - 20, SHEET.x1, SKIRTING_Y))
  g.beginPath()
  g.moveTo(SHEET.x0, SKIRTING_Y - 20); g.lineTo(SHEET.x1, SKIRTING_Y - 20)
  g.moveTo(SHEET.x0, SKIRTING_Y); g.lineTo(SHEET.x1, SKIRTING_Y)
  stroke(g, 1.3, 'rgba(74, 63, 58, 0.6)')
}

function floor(g: Pen): void {
  fill(g, FLOOR, box(SHEET.x0, SKIRTING_Y, SHEET.x1, SHEET.y1))
  g.beginPath()
  const rng = makeRng(5)
  for (let y = SKIRTING_Y + 30, row = 0; y < SHEET.y1; y += 30 + row * 6, row++) {
    g.moveTo(SHEET.x0, y); g.lineTo(SHEET.x1, y)
    for (let x = SHEET.x0 + 60 + rng.next() * 160; x < SHEET.x1; x += 150 + rng.next() * 160) { g.moveTo(x, y); g.lineTo(x, y - 30 - (row - 1) * 6) }
  }
  stroke(g, 1.2, 'rgba(120, 84, 48, 0.5)')
  hatch(g, SHEET.x0, SKIRTING_Y, SHEET.x1, SKIRTING_Y + 14, 'rgba(120, 84, 48, 0.35)', 5, 1)
  // A mouse hole in the skirting, with someone at home.
  g.beginPath()
  g.moveTo(690, SKIRTING_Y); g.quadraticCurveTo(692, SKIRTING_Y - 30, 712, SKIRTING_Y - 30); g.quadraticCurveTo(732, SKIRTING_Y - 30, 734, SKIRTING_Y); g.closePath()
  g.fillStyle = '#3d312c'
  g.fill()
  fill(g, '#fffdf7', round(704, SKIRTING_Y - 12, 4, 5, 8), round(718, SKIRTING_Y - 12, 4, 5, 8))
  fill(g, '#1f1a18', round(705, SKIRTING_Y - 11, 1.8, 2.2, 6), round(719, SKIRTING_Y - 11, 1.8, 2.2, 6))
  // The rug the one in the middle stands on.
  g.beginPath()
  g.ellipse(MIDDLE.x, MIDDLE.y - 4, 178, 30, 0, 0, Math.PI * 2)
  g.fillStyle = '#c96f4f'
  g.fill()
  stroke(g, 1.4)
  g.beginPath()
  g.ellipse(MIDDLE.x, MIDDLE.y - 4, 150, 23, 0, 0, Math.PI * 2)
  stroke(g, 5, '#f1dcb8')
  g.beginPath()
  g.ellipse(MIDDLE.x, MIDDLE.y - 4, 112, 15, 0, 0, Math.PI * 2)
  stroke(g, 3, '#8fb3a5')
}

/** The sky behind the door and in the window, by weather. */
export const SKY: Record<Weather, string> = { rain: '#a9bccb', snow: '#dde5ee', wind: '#bfd6e2', sun: '#a6d7f1' }

const DOOR_LEAF: Ring = ring(DOOR.x0, DOOR.y1, DOOR.x0, DOOR.y0 + 34, DOOR.x0 + 26, DOOR.y0, DOOR.x1 - 26, DOOR.y0, DOOR.x1, DOOR.y0 + 34, DOOR.x1, DOOR.y1)

/** The door's frame and the doormat. The leaf itself is a sprite, since it opens. */
function doorFrame(g: Pen): void {
  const { x0, y0, x1, y1 } = DOOR
  const frame = ring(x0 - 12, y1, x0 - 12, y0 + 30, x0 + 20, y0 - 14, x1 - 20, y0 - 14, x1 + 12, y0 + 30, x1 + 12, y1)
  fill(g, '#f7efe0', frame)
  g.beginPath()
  poly(g, frame)
  stroke(g, 1.4)
  // The doormat, bristly.
  fill(g, '#9a7648', box(x0 - 16, y1 - 4, x1 + 24, y1 + 16))
  hatch(g, x0 - 16, y1 - 4, x1 + 24, y1 + 16, 'rgba(70, 48, 24, 0.55)', 4, 1, 0.3)
}

/** The door's leaf, drawn round its hinge at the bottom right: an arched top, two panels, a round pane, the letter flap and the handle. */
function doorLeaf(g: Pen): void {
  const { x0, y0, x1, y1 } = DOOR
  g.save()
  g.translate(-x1, -y1)
  fill(g, DOOR_BLUE, DOOR_LEAF)
  g.save()
  g.beginPath()
  poly(g, DOOR_LEAF)
  g.clip()
  hatch(g, x0 + (x1 - x0) * 0.62, y0, x1 + 4, y1, 'rgba(48, 78, 108, 0.5)', 5, 1)
  g.restore()
  g.beginPath()
  poly(g, DOOR_LEAF)
  poly(g, box(x0 + 22, y0 + 294, x1 - 22, y0 + 396))
  poly(g, box(x0 + 22, y0 + 418, x1 - 22, y1 - 40))
  stroke(g, 1.6)
  // The pane is an arch of plain glass with one soft glint: no ring and no crossed bars, which a child could take for a sign.
  const cx = (x0 + x1) / 2 + 10
  const arch = (half: number, foot: number) => {
    g.beginPath()
    g.moveTo(cx - half, y0 + foot)
    g.lineTo(cx - half, y0 + 92)
    g.arc(cx, y0 + 92, half, Math.PI, 0)
    g.lineTo(cx + half, y0 + foot)
    g.closePath()
  }
  arch(42, 146)
  g.fillStyle = '#c9d8e2'
  g.fill()
  stroke(g, 5, '#f7efe0')
  arch(45, 149)
  stroke(g, 1.3)
  fill(g, 'rgba(255, 255, 255, 0.55)', ring(cx - 26, y0 + 96, cx - 8, y0 + 64, cx + 2, y0 + 66, cx - 16, y0 + 100))
  // A letter left half way through the flap: blank paper, so the flap is a flap and not a bar.
  fill(g, '#fbf9f0', ring(x0 + 80, y0 + 180, x0 + 88, y0 + 160, x0 + 118, y0 + 166, x0 + 112, y0 + 180))
  g.beginPath()
  poly(g, ring(x0 + 80, y0 + 180, x0 + 88, y0 + 160, x0 + 118, y0 + 166, x0 + 112, y0 + 180))
  stroke(g, 1.2)
  // The letter flap, and the handle: a big brass lever with its plate, the one bright thing on the door.
  fill(g, '#e2b84a', box(x0 + 62, y0 + 176, x1 - 32, y0 + 190), ring(HANDLE.x - 14, HANDLE.y - 30, HANDLE.x + 14, HANDLE.y - 30, HANDLE.x + 14, HANDLE.y + 30, HANDLE.x - 14, HANDLE.y + 30), ring(HANDLE.x - 6, HANDLE.y - 9, HANDLE.x + 52, HANDLE.y - 7, HANDLE.x + 56, HANDLE.y + 5, HANDLE.x - 6, HANDLE.y + 9))
  g.beginPath()
  poly(g, box(x0 + 62, y0 + 176, x1 - 32, y0 + 190))
  poly(g, ring(HANDLE.x - 14, HANDLE.y - 30, HANDLE.x + 14, HANDLE.y - 30, HANDLE.x + 14, HANDLE.y + 30, HANDLE.x - 14, HANDLE.y + 30))
  poly(g, ring(HANDLE.x - 6, HANDLE.y - 9, HANDLE.x + 52, HANDLE.y - 7, HANDLE.x + 56, HANDLE.y + 5, HANDLE.x - 6, HANDLE.y + 9))
  stroke(g, 1.3)
  g.restore()
}

/**
 * One window pane: a sash window, the garden under that weather's sky in its upper light, the shed's roof with
 * the pole the weather vane turns on, the meeting rail, a short curtain on a wire across most of the lower light
 * and the plant on the sill beside it. No upright bar: the rail and the curtain are all that cross the glass. The
 * cockerel and what falls or blows are drawn each frame.
 */
function windowPane(g: Pen, weather: Weather): void {
  const { x0, y0, x1, y1 } = WINDOW, snow = weather === 'snow', rail = SASH_Y
  fill(g, SKY[weather], box(x0, y0, x1, y1))
  g.save()
  g.beginPath()
  poly(g, box(x0, y0, x1, y1))
  g.clip()
  if (weather === 'sun') fill(g, '#ffd75a', round(x0 + 36, y0 + 40, 20, 20, 12))
  else {
    const cloud = weather === 'rain' ? '#8fa5b6' : weather === 'snow' ? '#f4f6f9' : '#e6eef2'
    const lean = weather === 'wind' ? 1.5 : 1
    fill(g, cloud, round(x0 + 36, y0 + 34, 40 * lean, 18 / lean, 12), round(x0 + 84, y0 + 26, 30 * lean, 20 / lean, 12), round(x0 + 60, y0 + 62, 30 * lean, 13 / lean, 10))
  }
  fill(g, snow ? '#f4f6f9' : weather === 'sun' ? '#a7d18c' : '#93b89a', round(x0 + 60, rail + 44, 120, 70, 16))
  fill(g, snow ? '#e3ebf2' : '#5f9a6c', ring(x0, rail - 12, x0 + 24, rail - 20, x0 + 50, rail - 10, x0 + 78, rail - 22, x0 + 104, rail - 12, x0 + 130, rail - 22, x1, rail - 12, x1, y1, x0, y1))
  // The shed's roof, and the pole from its ridge up to the cockerel.
  const roof = ring(VANE.x - 36, rail - 10, VANE.x, rail - 40, VANE.x + 36, rail - 10)
  fill(g, snow ? '#f4f6f9' : '#b6644a', roof)
  g.beginPath()
  poly(g, roof)
  stroke(g, 1.2)
  g.beginPath()
  g.moveTo(VANE.x, rail - 40); g.lineTo(VANE.x, VANE.y)
  stroke(g, 2.4)
  // The short curtain on its wire, gathered, with a scalloped hem: it covers the lower light but for the corner the plant stands in.
  const left = x0 + 54, hem: number[] = [left, rail + 4, x1, rail + 4, x1, y1 - 8]
  for (let x = x1; x > left; x -= 17) hem.push(x - 8.5, y1 - 1, x - 17, y1 - 8)
  fill(g, '#f6ecd6', hem)
  g.beginPath()
  for (let x = left + 12; x < x1; x += 24) {
    g.moveTo(x, rail + 20); g.quadraticCurveTo(x + 5, rail + 25, x, rail + 30); g.quadraticCurveTo(x - 5, rail + 25, x, rail + 20)
    g.moveTo(x + 12, rail + 40); g.quadraticCurveTo(x + 17, rail + 45, x + 12, rail + 50); g.quadraticCurveTo(x + 7, rail + 45, x + 12, rail + 40)
  }
  g.fillStyle = 'rgba(217, 139, 116, 0.75)'
  g.fill()
  g.beginPath()
  poly(g, hem)
  for (let x = left + 17; x < x1 - 4; x += 17) { g.moveTo(x, rail + 6); g.lineTo(x + 2, rail + 14) }
  stroke(g, 1.1, 'rgba(74, 63, 58, 0.6)')
  // The plant on the sill, leaning to the light.
  fill(g, '#c9764f', ring(x0 + 12, y1, x0 + 44, y1, x0 + 40, y1 - 22, x0 + 16, y1 - 22))
  fill(g, '#4f8f5c', ring(x0 + 26, y1 - 22, x0 + 8, y1 - 52, x0 + 24, y1 - 38), ring(x0 + 28, y1 - 22, x0 + 34, y1 - 66, x0 + 42, y1 - 34), ring(x0 + 30, y1 - 22, x0 + 54, y1 - 46, x0 + 42, y1 - 26))
  g.restore()
  // The sash: its outer frame and the one meeting rail.
  g.beginPath()
  poly(g, box(x0, y0, x1, y1))
  g.moveTo(x0, rail); g.lineTo(x1, rail)
  stroke(g, 7, '#f7efe0')
  g.beginPath()
  g.moveTo(x0 + 4, rail + 4); g.lineTo(x1 - 4, rail + 4)
  stroke(g, 1.1, 'rgba(74, 63, 58, 0.5)')
}

/** Round the window: its outline, the deep sill on its two brackets, and the curtains, which hang clear of the glass. */
function windowFrame(g: Pen): void {
  const { x0, y0, x1, y1 } = WINDOW
  fill(g, '#f7efe0', box(x0 - 4, y0 - 4, x1 + 4, y1 + 4))
  g.beginPath()
  poly(g, box(x0 - 4, y0 - 4, x1 + 4, y1 + 4))
  stroke(g, 1.4)
  // The sill stands out from the wall: a top, a front edge in shade, and a bracket under each end.
  const top = ring(x0 - 12, y1 + 4, x1 + 12, y1 + 4, x1 + 26, y1 + 20, x0 - 26, y1 + 20), front = box(x0 - 26, y1 + 20, x1 + 26, y1 + 30)
  const brackets = [ring(x0 - 10, y1 + 30, x0 + 12, y1 + 30, x0 - 6, y1 + 50), ring(x1 + 10, y1 + 30, x1 - 12, y1 + 30, x1 + 6, y1 + 50)]
  fill(g, '#f7efe0', top)
  fill(g, '#dfd3bd', front, ...brackets)
  g.beginPath()
  poly(g, top)
  poly(g, front)
  for (const bracket of brackets) poly(g, bracket)
  stroke(g, 1.3)
  for (const side of [-1, 1]) {
    const x = side < 0 ? x0 - 46 : x1 + 46
    const curtain = ring(x, y0 - 14, x - side * 40, y0 - 14, x - side * 34, y0 + 70, x - side * 26, y1 + 2, x + side * 4, y1 + 2)
    fill(g, '#d98b74', curtain)
    g.beginPath()
    poly(g, curtain)
    g.moveTo(x - side * 14, y0 - 10); g.lineTo(x - side * 10, y1 - 6)
    g.moveTo(x - side * 28, y0 - 10); g.lineTo(x - side * 22, y0 + 120)
    stroke(g, 1.3)
  }
  g.beginPath()
  g.moveTo(x0 - 56, y0 - 14); g.lineTo(x1 + 56, y0 - 14)
  stroke(g, 4, WOOD)
}

/** A picture on the wall: the dog, in a crown. */
function picture(g: Pen): void {
  const x = 544, y = 96
  fill(g, '#e2b84a', box(x, y, x + 74, y + 86))
  fill(g, '#f9f1dd', box(x + 9, y + 9, x + 65, y + 77))
  fill(g, '#d7a45f', round(x + 37, y + 50, 18, 16, 10), ring(x + 20, y + 40, x + 26, y + 60, x + 16, y + 62), ring(x + 54, y + 40, x + 48, y + 60, x + 58, y + 62))
  fill(g, '#e2b84a', ring(x + 22, y + 34, x + 22, y + 20, x + 30, y + 28, x + 37, y + 18, x + 44, y + 28, x + 52, y + 20, x + 52, y + 34))
  fill(g, '#3a2e2a', round(x + 30, y + 48, 2.4, 2.4, 6), round(x + 44, y + 48, 2.4, 2.4, 6), round(x + 37, y + 56, 3.4, 2.6, 6))
  g.beginPath()
  poly(g, box(x, y, x + 74, y + 86))
  poly(g, box(x + 9, y + 9, x + 65, y + 77))
  g.moveTo(x + 37, y); g.lineTo(x + 37, y - 14)
  stroke(g, 1.3)
}

/** A cuckoo clock with no figures on its face. Its pendulum is drawn each frame. */
export const CLOCK = { x: 684, y: 150 }
function clock(g: Pen): void {
  const { x, y } = CLOCK
  fill(g, '#8a5a3c', ring(x - 34, y, x - 34, y - 52, x, y - 84, x + 34, y - 52, x + 34, y))
  fill(g, '#6b4226', ring(x - 44, y - 46, x, y - 92, x + 44, y - 46, x + 38, y - 40, x, y - 80, x - 38, y - 40))
  fill(g, '#f9f1dd', round(x, y - 30, 20, 20, 14))
  fill(g, '#3d2a1c', box(x - 8, y - 68, x + 8, y - 54))
  g.beginPath()
  poly(g, ring(x - 34, y, x - 34, y - 52, x, y - 84, x + 34, y - 52, x + 34, y))
  g.moveTo(x + 20, y - 30); g.arc(x, y - 30, 20, 0, Math.PI * 2)
  stroke(g, 1.4)
  // Two hands cut from dark paper, a long leaf and a short one, far apart, on a brass boss: filled shapes, so that they are hands and not two strokes that meet.
  const leaf = (a: number, long: number, wide: number): Ring => {
    const cos = Math.cos(a), sin = Math.sin(a), cy = y - 30
    return ring(x - cos * 3, cy - sin * 3, x + cos * long * 0.45 - sin * wide, cy + sin * long * 0.45 + cos * wide, x + cos * long, cy + sin * long, x + cos * long * 0.45 + sin * wide, cy + sin * long * 0.45 - cos * wide)
  }
  fill(g, '#3d2a1c', leaf(-1.05, 15, 2.6), leaf(2.75, 9.5, 3))
  fill(g, '#e2b84a', round(x, y - 30, 3, 3, 8))
  g.beginPath()
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    g.moveTo(x + Math.cos(a) * 15.5, y - 30 + Math.sin(a) * 15.5)
    g.lineTo(x + Math.cos(a) * 17, y - 30 + Math.sin(a) * 17)
  }
  stroke(g, 1.6)
}

/** The rack: one plain pale board with two rails, a shelf and a bench, and a peg where each garment hangs. */
function rack(g: Pen): void {
  const { x0, y0, x1, y1 } = RACK
  g.save()
  g.shadowColor = 'rgba(70, 50, 30, 0.3)'
  const k = (g as CanvasRenderingContext2D).getTransform?.().a ?? 1
  g.shadowBlur = 4 * k
  g.shadowOffsetY = 2 * k
  g.beginPath()
  snip(g, box(x0, y0, x1 - 6, y1), makeRng(9), 10)
  g.fillStyle = RACK_BOARD
  g.fill()
  g.restore()
  g.beginPath()
  snip(g, box(x0, y0, x1 - 6, y1), makeRng(9), 10)
  stroke(g, 1.4, 'rgba(74, 63, 58, 0.7)')
  const rail = (y: number, from: number, to: number) => {
    fill(g, WOOD, box(from, y - 5, to, y + 5))
    g.beginPath()
    poly(g, box(from, y - 5, to, y + 5))
    stroke(g, 1.2)
  }
  const pegAt = (x: number, y: number) => {
    fill(g, '#8a5a3c', round(x, y, 7, 7, 10))
    g.beginPath()
    g.arc(x, y, 7, 0, Math.PI * 2)
    stroke(g, 1.2)
  }
  rail(ON_RACK.raincoat.y - 16, x0 + 10, 1006)
  rail(ON_RACK.duffel.y - 16, x0 + 10, 1006)
  pegAt(ON_RACK.raincoat.x, ON_RACK.raincoat.y - 16)
  pegAt(ON_RACK.duffel.x, ON_RACK.duffel.y - 16)
  // The hat's shelf, and a peg each for the scarf, the mittens and the umbrella.
  rail(ON_RACK.hat.y + 26, 1010, x1 - 14)
  pegAt(ON_RACK.scarf.x, ON_RACK.scarf.y - 22)
  pegAt(ON_RACK.mittens.x, ON_RACK.mittens.y - 10)
  pegAt(ON_RACK.umbrella.x + 12, ON_RACK.umbrella.y - 22)
  // The bench the boots stand on.
  rail(ON_RACK.boots.y + 78, x0 + 22, 990)
  g.beginPath()
  g.moveTo(x0 + 40, ON_RACK.boots.y + 83); g.lineTo(x0 + 36, y1 - 2)
  g.moveTo(972, ON_RACK.boots.y + 83); g.lineTo(976, y1 - 2)
  stroke(g, 4, WOOD)
}

/** The whole still scene, in stage units. The pen's transform already fits the stage into the surface. */
export function paintBackdrop(g: Pen): void {
  mat(g)
  cutSheet(g)
  // The hall sheet: one big piece of printed paper with scissor-cut corners.
  g.save()
  g.shadowColor = 'rgba(20, 40, 30, 0.4)'
  const k = (g as CanvasRenderingContext2D).getTransform?.().a ?? 1
  g.shadowBlur = 6 * k
  g.shadowOffsetX = 2 * k
  g.shadowOffsetY = 4 * k
  g.beginPath()
  snip(g, box(SHEET.x0, SHEET.y0, SHEET.x1, SHEET.y1), makeRng(3), 16)
  g.fillStyle = PAPER
  g.fill()
  g.restore()
  g.save()
  g.beginPath()
  snip(g, box(SHEET.x0, SHEET.y0, SHEET.x1, SHEET.y1), makeRng(3), 16)
  g.clip()
  g.translate(3, 3)
  wall(g)
  floor(g)
  doorFrame(g)
  windowFrame(g)
  picture(g)
  clock(g)
  rack(g)
  g.restore()
  scissors(g)
  snippets(g)
}

/** The garden on the back of the hall sheet, without its sky and its weather: hills, a shed, the hedge, a washing line and the lawn. The gate is its own piece (`gate`), since snow lies on the lawn behind it. */
function garden(g: Pen): void {
  const { x0, x1, y1 } = SHEET, ground = GARDEN.ground
  fill(g, '#a9cba0', round(300, ground + 60, 420, 190, 20), round(900, ground + 80, 460, 170, 20))
  // The shed, with the pole the weather vane turns on.
  fill(g, '#c9a071', box(70, ground - 190, 250, ground + 10))
  fill(g, '#b6644a', ring(46, ground - 184, 160, ground - 262, 274, ground - 184))
  fill(g, '#6f5136', box(132, ground - 110, 188, ground + 10))
  g.beginPath()
  poly(g, box(70, ground - 190, 250, ground + 10))
  poly(g, ring(46, ground - 184, 160, ground - 262, 274, ground - 184))
  poly(g, box(132, ground - 110, 188, ground + 10))
  for (let x = 100; x < 250; x += 30) { g.moveTo(x, ground - 184); g.lineTo(x, ground + 10) }
  g.moveTo(160, ground - 262); g.lineTo(160, ground - 310)
  stroke(g, 1.5)
  fill(g, '#d9a441', round(160, ground - 312, 5, 5, 8))
  // An apple tree behind the hedge, cut in one snip-cornered piece, and the cat that lives in it and watches.
  const crown = round(660, ground - 196, 96, 84, 11)
  fill(g, '#9a7650', box(650, ground - 130, 672, ground - 40))
  fill(g, '#78b274', crown)
  // Its shade: a band of short printed strokes down the far side, kept on the crown.
  g.beginPath()
  for (let y = ground - 250; y < ground - 150; y += 7) { g.moveTo(712, y); g.lineTo(738, y + 12) }
  stroke(g, 1.1, 'rgba(40, 90, 56, 0.4)')
  g.beginPath()
  poly(g, crown)
  stroke(g, 1.5)
  fill(g, '#cf5a48', round(604, ground - 214, 9, 9, 8), round(640, ground - 150, 9, 9, 8), round(716, ground - 168, 9, 9, 8), round(668, ground - 252, 9, 9, 8))
  const cat = ring(664, ground - 176, 660, ground - 214, 672, ground - 202, 692, ground - 202, 704, ground - 214, 700, ground - 176, 682, ground - 166)
  fill(g, '#8d8a94', cat)
  g.beginPath()
  poly(g, cat)
  stroke(g, 1.3)
  fill(g, '#fdfbf2', round(673, ground - 190, 5, 5, 8), round(691, ground - 190, 5, 5, 8))
  fill(g, '#3a2e2a', round(675, ground - 190, 2.4, 2.4, 6), round(693, ground - 190, 2.4, 2.4, 6))
  // The hedge, clipped into lumps.
  const hedge: number[] = [x0, ground + 20, x0, ground - 60]
  for (let x = x0, i = 0; x <= x1; x += 52, i++) hedge.push(x + 26, ground - 84 - (i % 3) * 12, x + 52, ground - 60)
  hedge.push(x1, ground + 20)
  fill(g, '#5f9a6c', hedge)
  g.beginPath()
  poly(g, hedge)
  stroke(g, 1.5)
  hatch(g, x0, ground - 60, x1, ground + 20, 'rgba(40, 90, 56, 0.4)', 9, 1.2, 0.4)
  // The lawn, a path of stepping stones from the door's side to the gate, and tufts.
  fill(g, '#8fc07c', box(x0, ground + 20, x1, y1))
  fill(g, '#e2d6bd', round(150, 734, 60, 14, 9), round(430, 724, 54, 13, 9), round(650, 732, 50, 12, 9), round(1020, 724, 40, 11, 9))
  g.beginPath()
  for (const [x, y] of [[90, 640], [360, 620], [540, 668], [700, 612], [990, 640], [760, 740], [560, 742]] as const) {
    g.moveTo(x - 8, y); g.lineTo(x - 4, y - 14); g.moveTo(x, y); g.lineTo(x, y - 18); g.moveTo(x + 8, y); g.lineTo(x + 5, y - 13)
  }
  stroke(g, 1.6, '#4f8f5c')
  // A washing line from the shed to the tall post by the gate, with the grandfather's other long underwear on it.
  g.beginPath()
  g.moveTo(250, ground - 160); g.quadraticCurveTo(650, ground - 116, GARDEN.post.x, ground - 172)
  stroke(g, 2, '#6f5136')
  fill(g, '#f1e6cc', ring(430, ground - 146, 520, ground - 138, 516, ground - 10, 486, ground - 12, 476, ground - 70, 462, ground - 14, 432, ground - 18))
  g.beginPath()
  poly(g, ring(430, ground - 146, 520, ground - 138, 516, ground - 10, 486, ground - 12, 476, ground - 70, 462, ground - 14, 432, ground - 18))
  stroke(g, 1.5)
  g.beginPath()
  for (let x = 440; x <= 512; x += 12) { g.moveTo(x, ground - 142); g.lineTo(x, ground - 20) }
  stroke(g, 1, 'rgba(201, 84, 72, 0.5)')
}

/** The box the gate's piece is cut to. */
const GATE_BOX = { x0: GARDEN.post.x - 34, y0: SHEET.y0 + 2, x1: SHEET.x1, y1: GARDEN.gate.y + 52 }

/**
 * The garden gate at the edge of the lawn, on the near side of it: a tall post with a bird box on its top, the
 * washing line tied to it, pointed pickets on two rails that run off the edge of the sheet, and a snail going nowhere. The post is tall
 * enough for a frozen scarf to knock at any height a scarf is worn.
 */
function gate(g: Pen): void {
  const post = GARDEN.post, at = GARDEN.gate, foot = at.y + 46, x1 = SHEET.x1
  const rails = [box(post.x + 16, at.y - 44, x1, at.y - 32), box(post.x + 16, at.y + 12, x1, at.y + 24)]
  fill(g, '#a57a4c', ...rails)
  g.beginPath()
  for (const rail of rails) poly(g, rail)
  stroke(g, 1.2)
  const pickets: Ring[] = []
  for (let i = 0; i < 3; i++) {
    const x = post.x + 34 + i * 26
    pickets.push(ring(x - 9, foot, x - 9, at.y - 66, x, at.y - 82, x + 9, at.y - 66, x + 9, foot))
  }
  const pole = box(post.x, post.top, post.x + 16, foot)
  fill(g, '#b98b5a', ...pickets, pole)
  // The shade down the post's far side: short printed strokes, kept on the post.
  g.beginPath()
  for (let y = post.top + 4; y < foot - 4; y += 5) { g.moveTo(post.x + 10, y); g.lineTo(post.x + 15, y + 4) }
  stroke(g, 1, 'rgba(110, 76, 40, 0.5)')
  g.beginPath()
  for (const picket of pickets) poly(g, picket)
  poly(g, pole)
  stroke(g, 1.4)
  // The knot of the washing line.
  fill(g, '#6f5136', round(post.x + 3, GARDEN.ground - 172, 5, 6, 8))
  // The bird box on the top of the post, and who lives in it.
  const house = box(post.x - 18, post.top - 44, post.x + 34, post.top + 2), roof = ring(post.x - 28, post.top - 40, post.x + 8, post.top - 56, post.x + 44, post.top - 40, post.x + 40, post.top - 34, post.x - 24, post.top - 34)
  fill(g, '#e9d9b0', house)
  fill(g, '#cf4a40', roof)
  fill(g, '#3d312c', round(post.x + 8, post.top - 20, 9, 9, 10))
  fill(g, '#f3c63a', ring(post.x + 6, post.top - 18, post.x + 16, post.top - 15, post.x + 6, post.top - 12))
  g.beginPath()
  poly(g, house)
  poly(g, roof)
  g.moveTo(post.x + 8, post.top - 6); g.lineTo(post.x + 8, post.top - 1)
  stroke(g, 1.3)
  // A snail on the ridge of the bird box, going nowhere.
  const sx = post.x + 10, sy = post.top - 55
  fill(g, '#e9d9b0', ring(sx - 16, sy, sx + 16, sy, sx + 22, sy - 13, sx + 16, sy - 4))
  fill(g, '#d9a441', round(sx - 2, sy - 9, 9, 9, 10))
  g.beginPath()
  g.arc(sx - 2, sy - 9, 9, 0, Math.PI * 2)
  stroke(g, 1.2)
}

export type ScenerySprites = {
  cockerel: Sprite
  pendulum: Sprite
  hand: Sprite
  /** The window's pane under each weather. */
  pane: Record<Weather, Sprite>
  /** The door's leaf, round its hinge. */
  door: Sprite
  /** The garden on the back of the hall sheet, and the gate that stands on the near side of its lawn. */
  garden: Sprite
  gate: Sprite
}

/** The things of the setting that move or change, each drawn once. */
export function makeScenerySprites(density: number): ScenerySprites {
  // The cockerel of the weather vane, perched on the ball that tops its pole: a ball, not a bar across the pole.
  const cockerel = sprite({ x0: -30, y0: -40, x1: 30, y1: 8 }, density, (g) => {
    printed(g, { rings: [ring(-24, -2, -16, -22, -4, -14, 6, -30, 18, -34, 26, -24, 16, -18, 14, -2), round(0, 1, 6, 6, 10)], colour: '#d9a441', shade: '#9a6f1c', corner: 3, flat: true }, 91, false)
    fill(g, '#cf4a40', ring(8, -32, 12, -40, 16, -34, 20, -40, 22, -32))
    fill(g, '#3a2e2a', round(18, -27, 1.8, 1.8, 6))
  }, 6)
  const pendulum = sprite({ x0: -12, y0: 0, x1: 12, y1: 74 }, density, (g) => {
    printed(g, { rings: [ring(-2, 0, 2, 0, 2, 54, -2, 54), round(0, 62, 11, 11, 10)], colour: '#e2b84a', shade: '#a8851f', corner: 2, flat: true }, 92)
  }, 8)
  // The ghost hand: a pale paper hand with one finger out, and a dark edge all round so it shows on white paper too.
  const HAND = ring(-8, 0, 8, 0, 10, 30, 28, 34, 30, 62, 20, 74, -14, 74, -26, 58, -24, 36, -10, 34)
  const hand = sprite({ x0: -30, y0: -6, x1: 34, y1: 76 }, density, (g) => {
    g.beginPath()
    poly(g, HAND)
    stroke(g, 7, 'rgba(58, 46, 42, 0.85)')
    printed(g, { rings: [HAND], colour: '#fffdf7', shade: '#b9b2a2', corner: 6, flat: true }, 93)
    g.beginPath()
    g.moveTo(0, 36); g.lineTo(0, 48); g.moveTo(12, 38); g.lineTo(12, 50); g.moveTo(-12, 40); g.lineTo(-12, 50)
    stroke(g, 1.4)
  }, 10)
  const pane = Object.fromEntries(WEATHERS.map((weather) => [weather, sprite(WINDOW, density, (g) => windowPane(g, weather), 4)])) as Record<Weather, Sprite>
  const door = sprite({ x0: DOOR.x0 - DOOR.x1, y0: DOOR.y0 - DOOR.y1, x1: 0, y1: 0 }, density, doorLeaf, 4)
  const gardenSprite = sprite({ x0: SHEET.x0, y0: GARDEN.ground - 324, x1: SHEET.x1, y1: SHEET.y1 }, density, garden, 0)
  return { cockerel, pendulum, hand, pane, door, garden: gardenSprite, gate: sprite(GATE_BOX, density, gate, 2) }
}
