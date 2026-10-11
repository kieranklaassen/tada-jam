import { BACK_JARS, BACK_SHELF, BAG, COUNTER_Y, HANDLE, JAR, JAR_MID, PLACES, RAIL, SHELF, STAGE, STOOL, WINDOW } from './layout'

// The sweet shop and the glass jar, as painters (ART.md, "The look"). What
// stands still is painted once into a sprite: the whole room in one, the jar
// in two (the back, and the glass with its reflections that lies over the
// sweets), the window's bars, the bag and the lamp. Matt, low in contrast and
// a little greyed, so the sweets are the most saturated things in the frame.
// Stage units throughout; `grain` is a fixed stream of numbers from 0 to 1.

type C = CanvasRenderingContext2D
const TAU = Math.PI * 2
/** How far past the stage the room is painted, for a surface of another shape. */
const PAST = 1600

export const WALL = '#f6e7d3'
const STRIPE = '#eccdbf'
const WOOD = '#d9a875', WOOD_DARK = '#b98556'

function roundRect(c: C, x: number, y: number, w: number, h: number, r: number): void {
  c.beginPath()
  c.roundRect(x, y, w, h, r)
}

/** The room behind everything: wall, window, shelves, rail and counter. */
export function paintRoom(c: C, grain: () => number): void {
  const W = STAGE.width
  // The wall, in stripes, with a panelled foot.
  c.fillStyle = WALL
  c.fillRect(-PAST, -PAST, W + 2 * PAST, PAST + COUNTER_Y)
  c.fillStyle = STRIPE
  for (let x = -PAST + 14; x < W + PAST; x += 64) c.fillRect(x, 26, 26, COUNTER_Y - 26)
  c.fillStyle = '#ead4c1'
  c.fillRect(-PAST, 572, W + 2 * PAST, COUNTER_Y - 572)
  c.fillStyle = 'rgba(185, 133, 86, 0.28)'
  for (let x = -PAST + 30; x < W + PAST; x += 128) {
    roundRect(c, x, 584, 104, 52, 6)
    c.fill()
  }
  c.fillStyle = '#cfa27a'
  c.fillRect(-PAST, 560, W + 2 * PAST, 12)
  c.fillStyle = 'rgba(255, 255, 255, 0.35)'
  c.fillRect(-PAST, 560, W + 2 * PAST, 3)
  // The cornice.
  c.fillStyle = '#d9a79a'
  c.fillRect(-PAST, -PAST, W + 2 * PAST, PAST + 26)
  c.fillStyle = 'rgba(120, 60, 50, 0.22)'
  c.fillRect(-PAST, 22, W + 2 * PAST, 4)
  // The lamp's pool of light on the wall.
  const pool = c.createRadialGradient(330, 170, 20, 330, 170, 470)
  pool.addColorStop(0, 'rgba(255, 246, 214, 0.75)')
  pool.addColorStop(1, 'rgba(255, 246, 214, 0)')
  c.fillStyle = pool
  c.fillRect(-140, 26, 940, COUNTER_Y - 26)

  backShelf(c, grain)
  windowBack(c)
  wallShelf(c)
  rail(c)
  stool(c)
  counter(c, grain)
}

/** The tall stool behind the counter, where whoever is at the jar sits. */
function stool(c: C): void {
  const { x, y, half } = STOOL
  c.strokeStyle = WOOD_DARK
  c.lineCap = 'round'
  c.lineWidth = 12
  c.beginPath()
  for (const side of [-1, 1]) {
    c.moveTo(x + side * (half - 22), y + 10)
    c.lineTo(x + side * (half - 4), COUNTER_Y + 10)
  }
  c.moveTo(x - half + 12, y + 120)
  c.lineTo(x + half - 12, y + 120)
  c.stroke()
  // A round cushion on a wooden seat.
  c.fillStyle = WOOD
  roundRect(c, x - half, y, 2 * half, 18, 9)
  c.fill()
  c.fillStyle = '#d98f9a'
  c.beginPath()
  c.ellipse(x, y - 4, half - 6, 13, 0, 0, TAU)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.3)'
  c.beginPath()
  c.ellipse(x - 12, y - 8, half - 30, 5, 0, 0, TAU)
  c.fill()
}

const MUTED = ['#dba6ad', '#aecba6', '#e6d394', '#aac2da', '#d9b4d2', '#e3bd97', '#b9dad1'] as const

function backShelf(c: C, grain: () => number): void {
  const board = BACK_SHELF.bottom - 8
  // Stoppered jars of sweets, greyed so they stay behind.
  for (let i = 0; i < BACK_JARS.count; i++) {
    const x = BACK_SHELF.left + BACK_JARS.inset + i * BACK_JARS.step, w = BACK_JARS.width, top = board - 60
    c.fillStyle = 'rgba(255, 255, 255, 0.5)'
    roundRect(c, x, top, w, 60, 9)
    c.fill()
    c.save()
    roundRect(c, x + 3, top + 14, w - 6, 43, 6)
    c.clip()
    c.fillStyle = MUTED[i % MUTED.length]
    c.globalAlpha = 0.9
    for (let n = 0; n < 16; n++) {
      c.beginPath()
      c.arc(x + 6 + grain() * (w - 12), top + 24 + grain() * 34, 5.5, 0, TAU)
      c.fill()
    }
    c.restore()
    c.strokeStyle = 'rgba(255, 255, 255, 0.85)'
    c.lineWidth = 2
    roundRect(c, x, top, w, 60, 9)
    c.stroke()
    c.fillStyle = '#c9a26a'
    roundRect(c, x + 7, top - 9, w - 14, 11, 4)
    c.fill()
  }
  c.fillStyle = WOOD_DARK
  c.fillRect(BACK_SHELF.left - 8, board, STAGE.width + PAST, 12)
  c.fillStyle = 'rgba(255, 255, 255, 0.3)'
  c.fillRect(BACK_SHELF.left - 8, board, STAGE.width + PAST, 3)
}

function windowBack(c: C): void {
  const { left, right, top, bottom } = WINDOW
  c.fillStyle = 'rgba(120, 70, 50, 0.18)'
  roundRect(c, left - 16, top - 12, right - left + 36, bottom - top + 34, 10)
  c.fill()
  c.fillStyle = '#fffaf0'
  roundRect(c, left - 14, top - 14, right - left + 28, bottom - top + 28, 10)
  c.fill()
  // The street: sky, three houses, a lamp post.
  const sky = c.createLinearGradient(0, top, 0, bottom)
  sky.addColorStop(0, '#bfe3f5')
  sky.addColorStop(1, '#ecf6f4')
  c.fillStyle = sky
  c.fillRect(left, top, right - left, bottom - top)
  const houses: readonly (readonly [number, number, number, string])[] = [[left - 6, 86, 92, '#e7c9b0'], [left + 84, 84, 120, '#d6b9c9'], [left + 166, 96, 76, '#c9d6b9']]
  for (const [x, w, h, colour] of houses) {
    c.fillStyle = colour
    c.beginPath()
    c.moveTo(x, bottom)
    c.lineTo(x, bottom - h)
    c.lineTo(x + w / 2, bottom - h - 34)
    c.lineTo(x + w, bottom - h)
    c.lineTo(x + w, bottom)
    c.fill()
    c.fillStyle = 'rgba(255, 255, 255, 0.55)'
    c.fillRect(x + w * 0.2, bottom - h + 16, 16, 20)
    c.fillRect(x + w * 0.6, bottom - h + 16, 16, 20)
  }
  // The sill.
  c.fillStyle = '#fffaf0'
  roundRect(c, left - 24, bottom + 6, right - left + 48, 14, 6)
  c.fill()
  c.fillStyle = 'rgba(120, 70, 50, 0.2)'
  c.fillRect(left - 20, bottom + 20, right - left + 40, 4)
}

/** The window's bars and its glass, which lie over whoever looks in. */
export function paintWindowFront(c: C): void {
  const { left, right, top, bottom } = WINDOW
  const sheen = c.createLinearGradient(left, top, right, bottom)
  sheen.addColorStop(0, 'rgba(255, 255, 255, 0.34)')
  sheen.addColorStop(0.4, 'rgba(255, 255, 255, 0.04)')
  sheen.addColorStop(1, 'rgba(255, 255, 255, 0.16)')
  c.fillStyle = sheen
  c.fillRect(left, top, right - left, bottom - top)
  c.fillStyle = '#fffaf0'
  c.fillRect((left + right) / 2 - 5, top, 10, bottom - top)
  c.fillRect(left, (top + bottom) / 2 - 5, right - left, 10)
  c.fillStyle = 'rgba(120, 70, 50, 0.16)'
  c.fillRect((left + right) / 2 + 5, top, 3, bottom - top)
  c.fillRect(left, (top + bottom) / 2 + 5, right - left, 3)
  // A scalloped blind along the top.
  c.fillStyle = '#e9b3a6'
  c.fillRect(left, top, right - left, 12)
  for (let x = left; x < right; x += 31) {
    c.beginPath()
    c.arc(x + 15.5, top + 12, 15.5, 0, Math.PI)
    c.fill()
  }
}

function wallShelf(c: C): void {
  for (const y of [434, 562]) {
    c.fillStyle = 'rgba(120, 70, 50, 0.16)'
    c.fillRect(22, y + 10, 280, 8)
    c.fillStyle = WOOD
    roundRect(c, 16, y, 288, 12, 4)
    c.fill()
    c.fillStyle = 'rgba(255, 255, 255, 0.35)'
    c.fillRect(20, y + 1, 280, 3)
    c.fillStyle = WOOD_DARK
    for (const x of [40, 280]) {
      c.beginPath()
      c.moveTo(x - 8, y + 12)
      c.lineTo(x + 8, y + 12)
      c.lineTo(x - 8, y + 34)
      c.fill()
    }
  }
  // A fluted paper cup under each thing.
  for (const place of SHELF) {
    const top = place.y + 14, bottom = place.y + 42
    c.save()
    c.beginPath()
    c.moveTo(place.x - 44, top)
    c.lineTo(place.x + 44, top)
    c.lineTo(place.x + 32, bottom)
    c.lineTo(place.x - 32, bottom)
    c.closePath()
    c.fillStyle = '#fffaf2'
    c.fill()
    c.clip()
    c.fillStyle = '#f1c9c2'
    for (let i = -5; i <= 5; i += 2) {
      c.beginPath()
      c.moveTo(place.x + i * 8.8 - 4.4, top)
      c.lineTo(place.x + i * 8.8 + 4.4, top)
      c.lineTo(place.x + i * 6.4 + 3.2, bottom)
      c.lineTo(place.x + i * 6.4 - 3.2, bottom)
      c.fill()
    }
    c.restore()
  }
}

function rail(c: C): void {
  // Two rods from the ceiling and the brass rail the claw runs on.
  c.fillStyle = '#b98b3a'
  for (const x of [RAIL.left + 8, RAIL.right - 8]) c.fillRect(x - 4, -PAST, 8, PAST + RAIL.y - 4)
  const brass = c.createLinearGradient(0, RAIL.y - 7, 0, RAIL.y + 7)
  brass.addColorStop(0, '#f6dc8a')
  brass.addColorStop(0.5, '#d9aa48')
  brass.addColorStop(1, '#a87a26')
  c.fillStyle = brass
  roundRect(c, RAIL.left, RAIL.y - 7, RAIL.right - RAIL.left, 14, 7)
  c.fill()
  c.fillStyle = '#a87a26'
  for (const x of [RAIL.left + 8, RAIL.right - 8]) {
    c.beginPath()
    c.arc(x, RAIL.y, 10, 0, TAU)
    c.fill()
  }
}

function counter(c: C, grain: () => number): void {
  const W = STAGE.width, H = STAGE.height
  const top = c.createLinearGradient(0, COUNTER_Y, 0, H)
  top.addColorStop(0, '#e6bd8c')
  top.addColorStop(1, '#d3a26c')
  c.fillStyle = top
  c.fillRect(-PAST, COUNTER_Y, W + 2 * PAST, H - COUNTER_Y + PAST)
  c.fillStyle = 'rgba(255, 255, 255, 0.4)'
  c.fillRect(-PAST, COUNTER_Y, W + 2 * PAST, 4)
  c.strokeStyle = 'rgba(150, 100, 55, 0.2)'
  c.lineWidth = 2
  for (let i = 0; i < 9; i++) {
    const y = COUNTER_Y + 16 + i * 19 + grain() * 6
    c.beginPath()
    c.moveTo(-PAST, y)
    c.bezierCurveTo(W * 0.3, y + grain() * 12 - 6, W * 0.7, y + grain() * 12 - 6, W + PAST, y + grain() * 8 - 4)
    c.stroke()
  }
  // A paper doily on each place where a burped snack lands.
  for (const place of PLACES) {
    c.fillStyle = 'rgba(255, 252, 244, 0.6)'
    c.beginPath()
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU, wave = 1 + 0.05 * Math.sin(a * 14)
      const x = place.x + Math.cos(a) * 54 * wave, y = place.y + 30 + Math.sin(a) * 19 * wave
      if (i === 0) c.moveTo(x, y)
      else c.lineTo(x, y)
    }
    c.fill()
    c.strokeStyle = 'rgba(214, 170, 130, 0.5)'
    c.lineWidth = 1.5
    c.beginPath()
    c.ellipse(place.x, place.y + 30, 40, 13, 0, 0, TAU)
    c.stroke()
  }
  // Where the jar stands, and spilt sugar.
  c.fillStyle = 'rgba(120, 70, 30, 0.2)'
  c.beginPath()
  c.ellipse(JAR_MID, JAR.floor + 16, 216, 15, 0, 0, TAU)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.8)'
  for (let i = 0; i < 70; i++) c.fillRect(300 + grain() * 560, COUNTER_Y + 30 + grain() * 26, 1.6, 1.6)
}

/** The jar, behind the sweets: the glass's faint tint, its floor and its handle. Painted about the jar's own middle and foot. */
export function paintJarBack(c: C): void {
  const { left, right, rim, floor, glass } = JAR
  const tint = c.createLinearGradient(left - glass, 0, right + glass, 0)
  tint.addColorStop(0, 'rgba(176, 214, 204, 0.5)')
  tint.addColorStop(0.2, 'rgba(236, 248, 244, 0.26)')
  tint.addColorStop(0.8, 'rgba(236, 248, 244, 0.22)')
  tint.addColorStop(1, 'rgba(176, 214, 204, 0.46)')
  c.fillStyle = tint
  roundRect(c, left - glass, rim - 12, right - left + 2 * glass, floor - rim + 12 + glass, 34)
  c.fill()
  c.fillStyle = 'rgba(120, 170, 155, 0.26)'
  c.beginPath()
  c.ellipse(JAR_MID, floor + 2, (right - left) / 2 - 6, 9, 0, 0, TAU)
  c.fill()
  // The handle: a loop of thick glass.
  const loop = () => {
    c.beginPath()
    c.moveTo(left - glass + 4, HANDLE.top + 18)
    c.bezierCurveTo(HANDLE.left - 20, HANDLE.top - 6, HANDLE.left - 20, HANDLE.bottom + 6, left - glass + 4, HANDLE.bottom - 18)
  }
  c.lineCap = 'round'
  c.strokeStyle = 'rgba(126, 176, 164, 0.85)'
  c.lineWidth = 26
  loop()
  c.stroke()
  c.strokeStyle = 'rgba(214, 240, 233, 0.9)'
  c.lineWidth = 15
  loop()
  c.stroke()
  c.strokeStyle = 'rgba(255, 255, 255, 0.85)'
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(HANDLE.left + 16, HANDLE.top + 44)
  c.quadraticCurveTo(HANDLE.left + 2, (HANDLE.top + HANDLE.bottom) / 2, HANDLE.left + 14, HANDLE.bottom - 50)
  c.stroke()
}

/** The glass that lies over the sweets: dark edges, a heavy foot, a rolled rim and the jar's own bright reflections. */
export function paintJarGlass(c: C): void {
  const { left, right, rim, floor, glass } = JAR
  // The walls: the glass is thickest where it turns away.
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? left - glass : right + glass, x1 = side < 0 ? left + 26 : right - 26
    const edge = c.createLinearGradient(x0, 0, x1, 0)
    edge.addColorStop(0, 'rgba(84, 140, 126, 0.85)')
    edge.addColorStop(0.36, 'rgba(127, 165, 154, 0.5)')
    edge.addColorStop(1, 'rgba(160, 200, 190, 0)')
    c.fillStyle = edge
    c.fillRect(Math.min(x0, x1), rim, Math.abs(x1 - x0), floor - rim + glass)
  }
  // The foot.
  const foot = c.createLinearGradient(0, floor - 4, 0, floor + glass + 2)
  foot.addColorStop(0, 'rgba(127, 165, 154, 0)')
  foot.addColorStop(0.4, 'rgba(110, 160, 146, 0.75)')
  foot.addColorStop(1, 'rgba(84, 140, 126, 0.9)')
  c.fillStyle = foot
  roundRect(c, left - glass, floor - 4, right - left + 2 * glass, glass + 6, 10)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.7)'
  roundRect(c, left + 30, floor + 5, right - left - 60, 3, 1.5)
  c.fill()
  // The rolled rim, and two turns of thread under it.
  c.fillStyle = 'rgba(206, 234, 227, 0.92)'
  roundRect(c, left - glass - 8, rim - 20, right - left + 2 * glass + 16, 24, 12)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.9)'
  roundRect(c, left - glass, rim - 16, right - left + 2 * glass - 10, 5, 2.5)
  c.fill()
  c.fillStyle = 'rgba(84, 140, 126, 0.5)'
  roundRect(c, left - glass - 4, rim, right - left + 2 * glass + 8, 4, 2)
  c.fill()
  c.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  c.lineWidth = 3
  for (const y of [rim + 14, rim + 26]) {
    c.beginPath()
    c.moveTo(left - 2, y + 4)
    c.quadraticCurveTo(JAR_MID, y - 6, right + 2, y + 4)
    c.stroke()
  }
  // The reflections: two long streaks, a short one, and the shop window in four panes.
  c.fillStyle = 'rgba(255, 255, 255, 0.5)'
  roundRect(c, left + 20, rim + 46, 17, floor - rim - 96, 8.5)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.34)'
  roundRect(c, left + 46, rim + 70, 6, 150, 3)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.26)'
  roundRect(c, right - 34, rim + 120, 9, floor - rim - 210, 4.5)
  c.fill()
  c.save()
  c.translate(right - 122, rim + 66)
  c.transform(1, 0.1, 0, 1, 0, 0)
  c.fillStyle = 'rgba(255, 255, 255, 0.24)'
  for (const [x, y] of [[0, 0], [30, 0], [0, 38], [30, 38]]) {
    roundRect(c, x, y, 26, 34, 4)
    c.fill()
  }
  c.restore()
}

/** The paper bag at the end of the counter, painted about the middle of its foot. */
export function paintBag(c: C): void {
  const w = (BAG.right - BAG.left) / 2, h = BAG.bottom - BAG.top
  c.fillStyle = 'rgba(120, 70, 30, 0.2)'
  c.beginPath()
  c.ellipse(0, 0, w + 10, 9, 0, 0, TAU)
  c.fill()
  // The dark of its open mouth.
  c.fillStyle = '#b08c84'
  c.beginPath()
  c.ellipse(0, -h + 22, w - 2, 14, 0, 0, TAU)
  c.fill()
  c.save()
  c.beginPath()
  c.moveTo(-w + 6, 0)
  c.lineTo(w - 6, 0)
  c.lineTo(w, -h + 22)
  // A pinked edge.
  for (let i = 0; i < 9; i++) {
    const x0 = w - (i * 2 * w) / 9, x1 = w - ((i + 1) * 2 * w) / 9
    c.lineTo((x0 + x1) / 2, -h + 34)
    c.lineTo(x1, -h + 22)
  }
  c.closePath()
  c.fillStyle = '#fff7ee'
  c.fill()
  c.clip()
  c.fillStyle = '#efb9b3'
  for (let x = -w + 8; x < w; x += 26) c.fillRect(x, -h, 12, h)
  const shade = c.createLinearGradient(-w, 0, w, 0)
  shade.addColorStop(0, 'rgba(120, 70, 50, 0)')
  shade.addColorStop(1, 'rgba(120, 70, 50, 0.2)')
  c.fillStyle = shade
  c.fillRect(-w, -h, 2 * w, h)
  c.restore()
}

/** The lamp's shade and its bulb, painted about the point where the cord meets it. */
export function paintLamp(c: C): void {
  const glow = c.createRadialGradient(0, 34, 4, 0, 34, 70)
  glow.addColorStop(0, 'rgba(255, 244, 190, 0.9)')
  glow.addColorStop(1, 'rgba(255, 244, 190, 0)')
  c.fillStyle = glow
  c.fillRect(-70, -36, 140, 140)
  c.fillStyle = '#fff3c4'
  c.beginPath()
  c.arc(0, 30, 13, 0, TAU)
  c.fill()
  c.fillStyle = '#e2806c'
  c.beginPath()
  c.moveTo(-12, 0)
  c.lineTo(12, 0)
  c.quadraticCurveTo(40, 6, 44, 30)
  c.lineTo(-44, 30)
  c.quadraticCurveTo(-40, 6, -12, 0)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.4)'
  c.beginPath()
  c.ellipse(-18, 13, 12, 5, -0.5, 0, TAU)
  c.fill()
  c.fillStyle = '#b98b3a'
  roundRect(c, -6, -8, 12, 10, 3)
  c.fill()
}

/** The claw's trolley on the rail, painted about the middle of the rail under it. */
export function paintTrolley(c: C): void {
  c.fillStyle = '#8f6a2a'
  for (const x of [-15, 15]) {
    c.beginPath()
    c.arc(x, -9, 7, 0, TAU)
    c.fill()
  }
  const brass = c.createLinearGradient(0, -6, 0, 20)
  brass.addColorStop(0, '#f6dc8a')
  brass.addColorStop(1, '#c2903a')
  c.fillStyle = brass
  roundRect(c, -26, -4, 52, 24, 8)
  c.fill()
  c.fillStyle = 'rgba(255, 255, 255, 0.55)'
  roundRect(c, -20, 0, 26, 4, 2)
  c.fill()
  c.fillStyle = '#e2806c'
  c.beginPath()
  c.arc(14, 9, 5, 0, TAU)
  c.fill()
}
