import { ARM_WIDE, armsOf, type Arm } from './gates'
import { BASKET, BOX, CAT, ROLLS, ROLL_RADIUS, RUG_TOP, SKIRTING, TAPE_WIDTH, type Kind, type ToyId } from './layout'
import { makeRng, type Rng } from './rng'
import { STAGE } from './stage'
import { along, angleOf, lengthOf, type Strip } from './tape'

// The painters: everything Tape Town draws, as plain canvas 2D paths in stage
// units. The look is washi tape on floorboards (the art guide is in ART.md):
// oiled oak seen from straight above, matte paper tape with torn fibrous
// ends, and chunky toys with eyes on top, looking up. Nothing here keeps
// state or knows the model. What stands still is painted once into a layer;
// each toy is painted once into a sprite; the view stamps them.

type G = CanvasRenderingContext2D
const TAU = Math.PI * 2

export const TAPE_COLOUR: Record<Kind, string> = { 0: '#99a1ab', 1: '#4a9bd8', 2: '#5cad55', 3: '#f3c62f' }
const TAPE_LIGHT: Record<Kind, string> = { 0: '#c3c9d0', 1: '#8ec6ee', 2: '#9bd494', 3: '#fbe184' }

const INK = '#3a2a22'

function blob(g: G, cx: number, cy: number, rx: number, ry: number, rotation = 0): void {
  g.beginPath()
  g.ellipse(cx, cy, rx, ry, rotation, 0, TAU)
}

function box(g: G, x: number, y: number, w: number, h: number, r: number): void {
  g.beginPath()
  g.roundRect(x, y, w, h, r)
}

// --- The room, painted once ------------------------------------------------------------------------------------

/** How far past the stage the room is painted, for a surface of another shape. */
const PAST = 700
const BOARD_COLOURS = ['#d3a26b', '#cc9960', '#d9ab76', '#c9955a', '#d6a56e']

function boards(g: G, rng: Rng): void {
  const board = 82
  g.fillStyle = '#c9955a'
  g.fillRect(-PAST, -PAST, STAGE.width + PAST * 2, STAGE.height + PAST * 2)
  for (let row = -9, y = -PAST - 18; y < STAGE.height + PAST; row++, y += board) {
    // Each row of boards is cut at its own places, so the butt joints never line up.
    let x = -PAST - rng.next() * 400
    while (x < STAGE.width + PAST) {
      const long = 380 + rng.next() * 420
      g.fillStyle = BOARD_COLOURS[Math.floor(rng.next() * BOARD_COLOURS.length)]
      g.fillRect(x, y, long, board)
      // Grain: long faint lines, a few to a board, and now and then a knot.
      g.strokeStyle = 'rgba(120, 78, 40, 0.16)'
      g.lineWidth = 1.2
      for (let line = 0; line < 4; line++) {
        const gy = y + 10 + rng.next() * (board - 20), bow = (rng.next() - 0.5) * 10
        g.beginPath()
        g.moveTo(x + 6, gy)
        g.bezierCurveTo(x + long * 0.3, gy + bow, x + long * 0.7, gy - bow, x + long - 6, gy + bow * 0.4)
        g.stroke()
      }
      if (rng.next() < 0.3) {
        const kx = x + 40 + rng.next() * (long - 80), ky = y + 18 + rng.next() * (board - 36)
        g.fillStyle = 'rgba(110, 66, 30, 0.5)'
        blob(g, kx, ky, 7, 4.5, 0.2)
        g.fill()
        g.strokeStyle = 'rgba(110, 66, 30, 0.22)'
        blob(g, kx, ky, 15, 9, 0.2)
        g.stroke()
      }
      // The butt joint at the board's end.
      g.fillStyle = 'rgba(92, 58, 28, 0.55)'
      g.fillRect(x + long - 1.5, y, 3, board)
      x += long
    }
    // The gap between this row and the next, with a hair of light on its far lip.
    g.fillStyle = 'rgba(86, 52, 24, 0.62)'
    g.fillRect(-PAST, y - 1.5, STAGE.width + PAST * 2, 3)
    g.fillStyle = 'rgba(255, 236, 200, 0.2)'
    g.fillRect(-PAST, y + 1.5, STAGE.width + PAST * 2, 1.5)
  }
}

function sunPatch(g: G): void {
  // Light from a window off to the top left, the way every shadow falls: a patch that slants down and to the right across the bare floor.
  g.fillStyle = 'rgba(255, 240, 200, 0.2)'
  g.beginPath()
  g.moveTo(250, SKIRTING)
  g.lineTo(670, SKIRTING)
  g.lineTo(980, 716)
  g.lineTo(470, 716)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(255, 244, 214, 0.12)'
  g.beginPath()
  g.moveTo(330, SKIRTING)
  g.lineTo(590, SKIRTING)
  g.lineTo(870, 716)
  g.lineTo(580, 716)
  g.closePath()
  g.fill()
}

function wall(g: G): void {
  // The wall seen from above is a strip, then the skirting board, then its shadow on the floor.
  g.fillStyle = '#e6dcc8'
  g.fillRect(-PAST, -PAST, STAGE.width + PAST * 2, PAST + 16)
  g.fillStyle = '#f7f1e3'
  g.fillRect(-PAST, 16, STAGE.width + PAST * 2, SKIRTING - 16)
  g.fillStyle = '#d9cdb6'
  g.fillRect(-PAST, 16, STAGE.width + PAST * 2, 3)
  g.fillStyle = '#cfc2a8'
  g.fillRect(-PAST, SKIRTING - 4, STAGE.width + PAST * 2, 4)
  const shade = g.createLinearGradient(0, SKIRTING, 0, SKIRTING + 22)
  shade.addColorStop(0, 'rgba(70, 40, 15, 0.34)')
  shade.addColorStop(1, 'rgba(70, 40, 15, 0)')
  g.fillStyle = shade
  g.fillRect(-PAST, SKIRTING, STAGE.width + PAST * 2, 22)
}

function rug(g: G, rng: Rng): void {
  const top = RUG_TOP + 14
  // Its shadow, the fringe, then the weave.
  g.fillStyle = 'rgba(70, 40, 15, 0.25)'
  g.fillRect(-PAST, top - 5, STAGE.width + PAST * 2, 12)
  g.strokeStyle = '#f2e6cf'
  g.lineWidth = 3
  g.lineCap = 'round'
  // The fringe: threads of no even spacing, lean or length, so that it is hair and not a row of equal marks.
  for (let x = -PAST; x < STAGE.width + PAST; x += 5 + rng.next() * 8) {
    g.beginPath()
    g.moveTo(x, top + 2)
    g.lineTo(x + (rng.next() - 0.5) * 11, top - 8 - rng.next() * 11)
    g.stroke()
  }
  g.fillStyle = '#b3475a'
  g.fillRect(-PAST, top, STAGE.width + PAST * 2, STAGE.height + PAST - top)
  // Ribs of the weave.
  g.strokeStyle = 'rgba(120, 34, 52, 0.35)'
  g.lineWidth = 1.5
  for (let y = top + 6; y < STAGE.height + PAST; y += 7) {
    g.beginPath()
    g.moveTo(-PAST, y)
    g.lineTo(STAGE.width + PAST, y)
    g.stroke()
  }
  // A border band, and a hand-knotted row: lozenges of no two sizes alike at no even spacing, some with a knot of another colour in them.
  g.fillStyle = '#f0dfc0'
  g.fillRect(-PAST, top + 12, STAGE.width + PAST * 2, 6)
  const dyes = ['#e9a13b', '#7f2c44', '#f0dfc0', '#d97a3a', '#3f6f7a']
  for (let x = -PAST + 20; x < STAGE.width + PAST;) {
    const wide = 22 + rng.next() * 40, tall = 12 + rng.next() * 16, y = top + 44 + (rng.next() - 0.5) * 12
    g.fillStyle = dyes[Math.floor(rng.next() * dyes.length)]
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + wide * (0.4 + rng.next() * 0.2), y - tall)
    g.lineTo(x + wide, y + (rng.next() - 0.5) * 6)
    g.lineTo(x + wide * (0.4 + rng.next() * 0.2), y + tall)
    g.closePath()
    g.fill()
    if (rng.next() < 0.45) {
      g.fillStyle = dyes[Math.floor(rng.next() * dyes.length)]
      blob(g, x + wide / 2, y, 3 + rng.next() * 4, 3 + rng.next() * 3, rng.next())
      g.fill()
    }
    x += wide + 14 + rng.next() * 52
  }
}

function softShadow(g: G, cx: number, cy: number, rx: number, ry: number, strength = 0.3): void {
  const shade = g.createRadialGradient(cx, cy, Math.min(rx, ry) * 0.3, cx, cy, Math.max(rx, ry))
  shade.addColorStop(0, `rgba(60, 34, 12, ${strength})`)
  shade.addColorStop(1, 'rgba(60, 34, 12, 0)')
  g.fillStyle = shade
  g.save()
  g.translate(cx, cy)
  g.scale(rx / Math.max(rx, ry), ry / Math.max(rx, ry))
  g.translate(-cx, -cy)
  blob(g, cx, cy, Math.max(rx, ry), Math.max(rx, ry))
  g.fill()
  g.restore()
}

function tray(g: G): void {
  // An enamel tray for the rolls: white with a dark blue rim, chipped at one corner.
  const x = 1022, y = 96, w = 142, h = 540
  g.fillStyle = 'rgba(60, 34, 12, 0.28)'
  box(g, x + 5, y + 8, w, h, 30)
  g.fill()
  g.fillStyle = '#31446b'
  box(g, x, y, w, h, 30)
  g.fill()
  g.fillStyle = '#f8f5ec'
  box(g, x + 7, y + 7, w - 14, h - 14, 24)
  g.fill()
  g.fillStyle = '#e7e2d4'
  box(g, x + 16, y + 16, w - 32, h - 32, 18)
  g.fill()
  g.fillStyle = '#f8f5ec'
  box(g, x + 19, y + 20, w - 36, h - 38, 16)
  g.fill()
  g.fillStyle = '#1d2a47'
  blob(g, x + 22, y + h - 14, 7, 4, -0.7)
  g.fill()
  // The ring each roll leaves where it stands.
  for (const roll of ROLLS) softShadow(g, roll.x + 3, roll.y + 5, ROLL_RADIUS + 6, ROLL_RADIUS + 6, 0.22)
}

function plant(g: G): void {
  // A pot plant by the wall, seen from above: the rim of the pot and a crown of big leaves. A sprite, so that it can sway when it is touched.
  softShadow(g, 5, 10, 60, 56, 0.3)
  g.fillStyle = '#b9643c'
  blob(g, 0, 0, 30, 30)
  g.fill()
  g.fillStyle = '#4a2f22'
  blob(g, 0, 0, 24, 24)
  g.fill()
  const leaves = [[-1.9, 50, 21], [-0.7, 46, 19], [0.5, 53, 21], [1.6, 49, 21], [2.7, 55, 22], [3.6, 46, 19], [-2.8, 42, 18]]
  for (const [angle, long, wide] of leaves) {
    g.save()
    g.rotate(angle)
    g.fillStyle = '#2f7d5b'
    g.beginPath()
    g.moveTo(5, 0)
    g.bezierCurveTo(long * 0.3, -wide, long * 0.9, -wide * 0.7, long, 0)
    g.bezierCurveTo(long * 0.9, wide * 0.7, long * 0.3, wide, 5, 0)
    g.fill()
    g.strokeStyle = '#1f5a40'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(7, 0)
    g.lineTo(long - 5, 0)
    g.stroke()
    g.fillStyle = 'rgba(255, 255, 255, 0.1)'
    g.beginPath()
    g.moveTo(9, -2)
    g.bezierCurveTo(long * 0.3, -wide * 0.8, long * 0.8, -wide * 0.6, long - 4, -2)
    g.closePath()
    g.fill()
    g.restore()
  }
}

function basket(g: G): void {
  // A wicker basket of wool against the wall. A sprite, so that it can give when it is touched.
  softShadow(g, 6, 12, 96, 58, 0.3)
  g.fillStyle = '#b07a3c'
  blob(g, 0, 0, BASKET.rx, BASKET.ry)
  g.fill()
  g.strokeStyle = '#8c5c28'
  g.lineWidth = 3
  for (let ring = 0; ring < 3; ring++) {
    blob(g, 0, 0, BASKET.rx - 4 - ring * 7, BASKET.ry - 4 - ring * 5)
    g.stroke()
  }
  g.fillStyle = '#5d3c1c'
  blob(g, 0, 0, 64, 33)
  g.fill()
  const balls: [number, number, number, string, string][] = [[-30, -2, 26, '#f1e6cf', '#d8c8a8'], [18, 4, 30, '#e3a63a', '#bf8423'], [50, -14, 18, '#d8798a', '#b65468']]
  for (const [dx, dy, r, colour, line] of balls) {
    g.fillStyle = colour
    blob(g, dx, dy, r, r)
    g.fill()
    g.strokeStyle = line
    g.lineWidth = 1.6
    for (let wrap = -2; wrap <= 2; wrap++) {
      g.beginPath()
      g.ellipse(dx, dy, r * 0.96, Math.abs(wrap) * r * 0.3 + 2, 0.5 + wrap * 0.1, 0, TAU)
      g.stroke()
    }
  }
}

function lid(g: G): void {
  // The shoebox lid lying where it was dropped, a ball of tissue paper, and one stripy sock.
  g.save()
  g.translate(118, 452)
  g.rotate(-0.16)
  g.fillStyle = 'rgba(60, 34, 12, 0.28)'
  box(g, -98, -66, 204, 148, 8)
  g.fill()
  g.fillStyle = '#5f9d96'
  box(g, -104, -74, 204, 148, 8)
  g.fill()
  g.fillStyle = '#79b8b0'
  box(g, -94, -64, 184, 128, 5)
  g.fill()
  g.fillStyle = '#f3ecdc'
  box(g, -34, -22, 68, 44, 6)
  g.fill()
  g.restore()
  softShadow(g, 70, 606, 50, 40, 0.28)
  g.fillStyle = '#fbf8f0'
  g.beginPath()
  g.moveTo(30, 596)
  for (const [x, y] of [[44, 566], [70, 574], [92, 560], [108, 586], [100, 618], [76, 634], [48, 628], [34, 612]]) g.lineTo(x, y)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(150, 140, 120, 0.5)'
  g.lineWidth = 1.5
  g.beginPath()
  // Three short folds of unequal length, none meeting another.
  g.moveTo(47, 574)
  g.lineTo(58, 596)
  g.moveTo(88, 570)
  g.quadraticCurveTo(76, 590, 94, 608)
  g.moveTo(46, 614)
  g.lineTo(72, 622)
  g.stroke()
  g.save()
  g.translate(168, 650)
  g.rotate(0.5)
  softShadow(g, 4, 8, 62, 30, 0.26)
  const stripes = ['#e9a13b', '#f7f1e3', '#3f8fbf', '#f7f1e3']
  g.beginPath()
  g.moveTo(-56, -16)
  g.lineTo(20, -18)
  g.bezierCurveTo(52, -20, 62, 6, 50, 26)
  g.bezierCurveTo(40, 40, 16, 40, 14, 22)
  g.lineTo(12, 14)
  g.lineTo(-56, 16)
  g.closePath()
  g.save()
  g.clip()
  for (let band = 0; band < 12; band++) {
    g.fillStyle = stripes[band % stripes.length]
    g.fillRect(-60 + band * 11, -30, 11, 80)
  }
  g.restore()
  g.fillStyle = '#c74e3e'
  box(g, -60, -17, 14, 34, 3)
  g.fill()
  g.restore()
}

/** The room with nothing on the bare floor: boards, wall, rug and everything that stands still round the edge. */
export function paintRoom(g: G): void {
  const rng = makeRng(20261011)
  boards(g, rng)
  sunPatch(g)
  wall(g)
  rug(g, rng)
  lid(g)
  tray(g)
}

// --- Tape ------------------------------------------------------------------------------------------------------

/** The outline of a strip lying along +x from 0 to `length`, with both ends torn: the tears are the strip's own, from its ends. */
function tornPath(g: G, length: number, seed: number, from = 0, to = length): void {
  const rng = makeRng(seed), half = TAPE_WIDTH / 2, teeth = 7
  const tear = (): number[] => Array.from({ length: teeth + 1 }, () => (rng.next() - 0.5) * 7)
  const first = tear(), last = tear()
  g.beginPath()
  g.moveTo(from, -half)
  g.lineTo(to, -half)
  if (to >= length) for (let i = 0; i <= teeth; i++) g.lineTo(length + last[i], -half + (TAPE_WIDTH * i) / teeth)
  g.lineTo(to, half)
  g.lineTo(from, half)
  if (from <= 0) for (let i = teeth; i >= 0; i--) g.lineTo(first[i], -half + (TAPE_WIDTH * i) / teeth)
  g.closePath()
}

const seedOfStrip = (strip: Strip): number => (strip.ax * 7919 + strip.ay * 104729 + strip.bx * 1299709 + strip.by * 15485863 + strip.kind) >>> 0

/**
 * A strip pressed flat on the boards, from `from` to `to` along it (the whole strip when left out): matte paper
 * laid over the wood and multiplied a little into it, so the gaps between the boards show faintly through.
 */
export function paintFlat(g: G, strip: Strip, fibres: boolean, from = 0, to = lengthOf(strip), plain = false, bands = true): number {
  const length = lengthOf(strip), seed = seedOfStrip(strip)
  if (to <= from) return 0
  let drawn = bands ? 5 : 3
  g.save()
  g.translate(strip.ax, strip.ay)
  g.rotate(angleOf(strip))
  // The hair of shadow that says the tape has a thickness.
  g.save()
  const turn = -angleOf(strip)
  g.translate(Math.cos(turn) * 1 - Math.sin(turn) * 2, Math.sin(turn) * 1 + Math.cos(turn) * 2)
  g.fillStyle = 'rgba(60, 34, 12, 0.22)'
  tornPath(g, length, seed, from, to)
  g.fill()
  g.restore()
  g.fillStyle = TAPE_COLOUR[strip.kind]
  g.globalAlpha = 0.86
  tornPath(g, length, seed, from, to)
  g.fill()
  g.globalAlpha = 0.3
  g.globalCompositeOperation = 'multiply'
  g.fill()
  g.globalCompositeOperation = 'source-over'
  g.globalAlpha = 1
  // A strip the press is still running along has no bands of light yet: they come as it is baked into the floor.
  if (!bands) { g.restore(); return drawn }
  // Paper: one soft band of light along it, and a few long fibres.
  g.save()
  tornPath(g, length, seed, from, to)
  g.clip()
  g.fillStyle = 'rgba(255, 255, 255, 0.13)'
  g.fillRect(from, -TAPE_WIDTH / 2, to - from, 9)
  g.fillStyle = 'rgba(0, 0, 0, 0.06)'
  g.fillRect(from, TAPE_WIDTH / 2 - 6, to - from, 6)
  const rng = makeRng(seed ^ 0x5bd1e995)
  g.strokeStyle = 'rgba(255, 255, 255, 0.12)'
  g.lineWidth = 1
  for (let line = 0; line < 5 && !plain; line++) {
    const y = -TAPE_WIDTH / 2 + 6 + rng.next() * (TAPE_WIDTH - 12), x = rng.next() * length
    g.beginPath()
    g.moveTo(x, y)
    g.lineTo(x + 30 + rng.next() * 90, y + (rng.next() - 0.5) * 3)
    g.stroke()
    drawn++
  }
  g.restore()
  if (fibres && !plain) {
    // The loose fibres of the tear.
    const tuft = makeRng(seed ^ 0x9e3779b9)
    g.strokeStyle = TAPE_LIGHT[strip.kind]
    g.lineWidth = 1.3
    g.lineCap = 'round'
    for (const [at, way, shown] of [[0, -1, from <= 0], [length, 1, to >= length]] as const) {
      for (let i = 0; i < 12; i++) {
        const y = -TAPE_WIDTH / 2 + 3 + tuft.next() * (TAPE_WIDTH - 6), long = 3 + tuft.next() * 6, bend = (tuft.next() - 0.5) * 4
        if (!shown) continue
        g.beginPath()
        g.moveTo(at - way * 2, y)
        g.lineTo(at + way * long, y + bend)
        g.stroke()
        drawn++
      }
    }
  }
  g.restore()
  return drawn
}

/** A length of a strip laid over something that stands on the floor (a toy stuck under it, a train in a hedge): the tape and its hair of shadow, and nothing finer. */
export function paintPatch(g: G, strip: Strip, from: number, to: number): number {
  const length = lengthOf(strip), seed = seedOfStrip(strip), a = Math.max(0, from), b = Math.min(length, to)
  if (b <= a) return 0
  g.save()
  g.translate(strip.ax, strip.ay)
  g.rotate(angleOf(strip))
  g.fillStyle = 'rgba(60, 34, 12, 0.22)'
  g.fillRect(a + 1, -TAPE_WIDTH / 2 + 3, b - a, TAPE_WIDTH)
  g.fillStyle = TAPE_COLOUR[strip.kind]
  g.globalAlpha = 0.9
  tornPath(g, length, seed, a, b)
  g.fill()
  g.globalAlpha = 1
  g.restore()
  return 2
}

/** Each tape as it looks pressed onto the boards: its colour with a little of the wood through it. */
const TAPE_ON_WOOD: Record<Kind, string> = { 0: '#8c8e90', 1: '#4888bd', 2: '#579945', 3: '#eab228' }

/** A stretch of a strip: from where to where along it. */
export type Stretch = { strip: Strip; from: number; to: number }

/**
 * Stretches of strips of one tape laid over whatever is there, opaque: the upper tape where two cross, and the
 * road or the rails over the toys that float under them. However many stretches, it is one fill for the tape,
 * one for its band of light, one for its band of shade, and one for the shadows if they throw any.
 */
export function paintOvers(g: G, stretches: readonly Stretch[], shadow = 0): number {
  const half = TAPE_WIDTH / 2
  const parts = stretches.map(({ strip, from, to }) => ({ strip, a: Math.max(0, from), b: Math.min(lengthOf(strip), to) })).filter((part) => part.b > part.a)
  if (!parts.length) return 0
  const each = (y: number, tall: number, grow = 0): void => {
    g.beginPath()
    for (const { strip, a, b } of parts) {
      g.save()
      g.translate(strip.ax, strip.ay)
      g.rotate(angleOf(strip))
      g.rect(a, y - grow, b - a, tall + grow * 2)
      g.restore()
    }
    g.fill()
  }
  let drawn = 3
  if (shadow > 0) {
    // What passes over water throws its shadow on it to both sides.
    g.fillStyle = 'rgba(24, 34, 58, 0.26)'
    each(-half, TAPE_WIDTH, shadow)
    drawn++
  }
  g.fillStyle = TAPE_ON_WOOD[parts[0].strip.kind]
  each(-half, TAPE_WIDTH)
  g.fillStyle = 'rgba(255, 255, 255, 0.13)'
  each(-half, 9)
  g.fillStyle = 'rgba(0, 0, 0, 0.06)'
  each(half - 6, 6)
  return drawn
}

/** One such stretch. */
export function paintOver(g: G, strip: Strip, from: number, to: number, shadow = 0): number {
  return paintOvers(g, [{ strip, from, to }], shadow)
}

/**
 * Where two tapes cross, the pair decides what lies on top, whichever was laid first: the road over the river
 * (a bridge), the rails over the road and over the river, the hedge over the road, over the river (reeds) and
 * over the rails (a tunnel, with a dark mouth to each side).
 */
export function paintCrossing(g: G, kind: string, low: Strip, high: Strip, dLow: number, dHigh: number, reachLow: number, reachHigh: number): number {
  const lowOver = kind === 'bridge' || kind === 'tunnel'
  const top = lowOver ? low : high, under = lowOver ? high : low
  const d = lowOver ? dLow : dHigh, reach = (lowOver ? reachLow : reachHigh) + 7
  const dUnder = lowOver ? dHigh : dLow, reachUnder = lowOver ? reachHigh : reachLow
  let drawn = 0
  if (kind === 'tunnel') {
    g.save()
    g.translate(under.ax, under.ay)
    g.rotate(angleOf(under))
    g.fillStyle = 'rgba(40, 28, 20, 0.6)'
    g.beginPath()
    for (const side of [-1, 1]) g.ellipse(dUnder + side * (reachUnder + 3), 0, 9, TAPE_WIDTH * 0.4, 0, 0, TAU)
    g.fill()
    g.restore()
    drawn++
  }
  drawn += paintOver(g, top, d - reach, d + reach, kind === 'bridge' || kind === 'trestle' ? 7 : kind === 'jam' ? 5 : 0)
  drawn += paintTrim(g, kind, top, d, reach)
  if (kind === 'level') drawn += paintGatePosts(g, armsOf({ kind, low, high, dLow, dHigh, reachLow, reachHigh, at: along(low, dLow) }))
  if (kind === 'jam') drawn += paintBushes(g, top, d, reach)
  if (kind === 'reeds') {
    // Blades of the hedge stand out over the water to both sides.
    const rng = makeRng(seedOfStrip(top) ^ 0x2f)
    g.save()
    g.translate(top.ax, top.ay)
    g.rotate(angleOf(top))
    g.fillStyle = '#3f8a3c'
    g.beginPath()
    for (const side of [-1, 1]) for (let k = 0; k < 5; k++) {
      const x = d - reach + ((k + 0.2 + rng.next() * 0.6) * reach * 2) / 5, tall = 12 + rng.next() * 12, lean = (rng.next() - 0.5) * 12
      g.moveTo(x - 4, side * (TAPE_WIDTH / 2 - 2))
      g.lineTo(x + lean, side * (TAPE_WIDTH / 2 + tall))
      g.lineTo(x + 4, side * (TAPE_WIDTH / 2 - 2))
    }
    g.fill()
    g.restore()
    drawn++
  }
  return drawn
}

/**
 * What makes a bridge, a trestle and a level crossing a built thing and not two bars: the bridge's parapets with a
 * post at each corner, the trestle's splayed timber legs standing in the water, the boards laid along the middle of the
 * rails for the road to cross on. Painted into the floor with the crossing, and again over a toy that floats under.
 */
export function paintTrim(g: G, kind: string, top: Strip, d: number, reach: number): number {
  return paintTrims(g, kind, [{ top, d, reach }])
}

/** The same for several crossings of one kind at once, in as many fills as for one. */
export function paintTrims(g: G, kind: string, places: readonly { top: Strip; d: number; reach: number }[]): number {
  if ((kind !== 'bridge' && kind !== 'trestle' && kind !== 'level') || !places.length) return 0
  const half = TAPE_WIDTH / 2
  /** One path over every place: `shape` adds to it in the frame of that place's upper strip. */
  const each = (shape: (a: number, b: number) => void): void => {
    g.beginPath()
    for (const { top, d, reach } of places) {
      g.save()
      g.translate(top.ax, top.ay)
      g.rotate(angleOf(top))
      shape(d - reach, d + reach)
      g.restore()
    }
  }
  if (kind === 'bridge') {
    g.fillStyle = '#5b6066'
    each((a, b) => {
      for (const side of [-1, 1]) {
        g.rect(a - 4, side * half - 3.5, b - a + 8, 7)
        for (const x of [a - 5, b + 5]) g.rect(x - 6.5, side * half - 6.5, 13, 13)
      }
    })
    g.fill()
    // The lit top of each parapet.
    g.fillStyle = 'rgba(255, 255, 255, 0.34)'
    each((a, b) => { for (const side of [-1, 1]) g.rect(a + 3, side * half - 2.5, b - a - 6, 2) })
    g.fill()
    return 2
  }
  if (kind === 'trestle') {
    // Three timber legs to each side, splayed: the outer two lean away from the middle one, and each narrows toward the water.
    g.fillStyle = '#7a5230'
    each((a, b) => {
      const legs = 3, step = (b - a) / legs
      for (const side of [-1, 1]) for (let k = 0; k < legs; k++) {
        const x = a + step * (k + 0.5), lean = (k - 1) * 6, near = side * (half - 1), far = side * (half + 14), wide = 7 - Math.abs(k - 1)
        g.moveTo(x - wide, near)
        g.lineTo(x + wide, near)
        g.lineTo(x + lean + wide - 3, far)
        g.lineTo(x + lean - wide + 3, far)
        g.closePath()
      }
    })
    g.fill()
    return 1
  }
  // Boards along the middle, the yellow left showing at each side as the two rails.
  g.fillStyle = '#a97a45'
  each((a, b) => g.rect(a + 5, -half + 13, b - a - 10, TAPE_WIDTH - 26))
  g.fill()
  g.strokeStyle = 'rgba(70, 44, 20, 0.5)'
  g.lineWidth = 1.5
  each((a, b) => { for (const y of [-9, 0, 9]) { g.moveTo(a + 5, y); g.lineTo(b - 5, y) } })
  g.stroke()
  return 2
}

/**
 * The posts of the two gates of a level crossing, painted into the floor: a square post beside the road to each
 * side of the rails, and on it the pale end of its arm, which stands straight up while the line is clear.
 */
function paintGatePosts(g: G, arms: readonly Arm[]): number {
  const each = (grow: number, dx: number, dy: number, long: number, wide: number): void => {
    g.beginPath()
    for (const arm of arms) {
      g.save()
      g.translate(arm.post.x + dx, arm.post.y + dy)
      g.rotate(arm.a)
      g.rect(-long / 2 - grow, -wide / 2 - grow, long + grow * 2, wide + grow * 2)
      g.restore()
    }
    g.fill()
  }
  g.fillStyle = 'rgba(60, 34, 12, 0.24)'
  each(0, 2, 4, 18, 18)
  g.fillStyle = '#6b4a2b'
  each(0, 0, 0, 18, 18)
  g.fillStyle = '#f6efe0'
  each(0, 0, 0, 10, ARM_WIDE)
  return 3
}

/**
 * The arms of the gates that are down or on their way: each lies from its post across the road, alongside the
 * rails, with two bands of unequal width. Seen from above, an arm that is part way up is shorter and its shadow
 * lies further from it. `down` is how far down each is, 0 to 1; an arm that is up is the pale end on its post.
 */
export function paintGateArms(g: G, arms: readonly Arm[], down: readonly number[]): number {
  if (!down.some((d) => d > 0)) return 0
  /** One path over every arm that is not up: `shape` adds to it in the arm's own frame, given how long the arm is seen. */
  const each = (lift: number, shape: (long: number) => void): void => {
    g.beginPath()
    arms.forEach((arm, k) => {
      if (down[k] <= 0) return
      const up = 1 - down[k]
      g.save()
      g.translate(arm.post.x + lift * (2 + up * 5), arm.post.y + lift * (4 + up * 9))
      g.rotate(arm.a)
      shape(Math.max(10, arm.long * Math.sin((down[k] * Math.PI) / 2)))
      g.restore()
    })
    g.fill()
  }
  const wide = ARM_WIDE
  g.fillStyle = 'rgba(60, 34, 12, 0.24)'
  each(1, (long) => g.rect(-5, -wide / 2, long + 5, wide))
  // The red of the arm, which shows as its edge and as its two bands of unequal width.
  g.fillStyle = '#c8452f'
  each(0, (long) => g.rect(-6.5, -wide / 2 - 1.5, long + 8, wide + 3))
  // The pale of it, laid on in three lengths with the bands left between them.
  g.fillStyle = '#f6efe0'
  each(0, (long) => {
    if (long < 30) return g.rect(-5, -wide / 2, long + 5, wide)
    g.rect(-5, -wide / 2, long * 0.36 + 5, wide)
    g.rect(long * 0.5, -wide / 2, long * 0.24, wide)
    g.rect(long * 0.81, -wide / 2, long * 0.19, wide)
  })
  return 3
}

/** A hedge where it stands across a road is a row of bushes that bulge out over the tarmac: the jam is at a real hedge. */
function paintBushes(g: G, hedge: Strip, d: number, reach: number): number {
  const half = TAPE_WIDTH / 2, rng = makeRng(seedOfStrip(hedge) ^ 0x71)
  g.save()
  g.translate(hedge.ax, hedge.ay)
  g.rotate(angleOf(hedge))
  // Bushes of unequal size down each side, so the edge of the hedge is a bumpy one.
  g.fillStyle = '#3f8a3c'
  g.beginPath()
  for (const side of [-1, 1]) for (let k = 0; k < 4; k++) {
    const x = d - reach + ((k + 0.2 + rng.next() * 0.6) * reach * 2) / 4, r = 9 + rng.next() * 9, y = side * (half - 4 + rng.next() * 5)
    g.moveTo(x + r, y)
    g.arc(x, y, r, 0, TAU)
  }
  g.fill()
  // A few lighter leaves, each its own size and lean, scattered and not in a row.
  g.fillStyle = '#7cc76f'
  g.beginPath()
  for (let k = 0; k < 5; k++) {
    const x = d - reach + rng.next() * reach * 2, y = (rng.next() - 0.5) * (TAPE_WIDTH + 6), long = 5 + rng.next() * 6, lean = rng.next() * Math.PI
    g.moveTo(x + Math.cos(lean) * long, y + Math.sin(lean) * long)
    g.ellipse(x, y, long, long * 0.45, lean, 0, TAU)
  }
  g.fill()
  g.restore()
  return 2
}

/**
 * Tape that is off the floor: between the stuck end and the roll while it is pulled, and the part of a new strip
 * the press has not reached yet. `lift` is how far off the boards it is, 0 to 1: the shadow parts from it.
 */
export function paintLoose(g: G, kind: Kind, ax: number, ay: number, bx: number, by: number, lift: number, tornEnd: boolean): number {
  const length = Math.hypot(bx - ax, by - ay)
  if (length < 1) return 0
  const angle = Math.atan2(by - ay, bx - ax), half = TAPE_WIDTH / 2
  g.save()
  g.translate(ax + 3 + lift * 5, ay + 5 + lift * 9)
  g.rotate(angle)
  g.fillStyle = `rgba(60, 34, 12, ${0.2 + 0.06 * lift})`
  g.fillRect(0, -half, length, TAPE_WIDTH)
  g.restore()
  g.save()
  g.translate(ax, ay)
  g.rotate(angle)
  g.fillStyle = TAPE_COLOUR[kind]
  if (tornEnd) tornPath(g, length, Math.round(ax * 31 + ay * 17) >>> 0, 0, length)
  else { g.beginPath(); g.rect(0, -half, length, TAPE_WIDTH) }
  g.fill()
  // The sheen of paper that is not stuck down yet.
  g.fillStyle = 'rgba(255, 255, 255, 0.22)'
  g.fillRect(0, -half + 3, length, 12)
  g.restore()
  return 3
}

/** The thumb of the press, running along a new strip. */
export function paintPressFronts(g: G, fronts: readonly { x: number; y: number; angle: number }[]): number {
  if (!fronts.length) return 0
  g.fillStyle = 'rgba(255, 255, 255, 0.4)'
  g.beginPath()
  for (const { x, y, angle } of fronts) {
    g.moveTo(x + Math.cos(angle) * 13, y + Math.sin(angle) * 13)
    g.ellipse(x, y, 13, TAPE_WIDTH / 2 + 3, angle, 0, Math.PI * 2)
  }
  g.fill()
  return 1
}

// --- Sprites: each painted once, about its own middle, nose along +x -------------------------------------------------

/** How much room a sprite takes, in stage units, with its margin. */
export const SPRITE_SIZE: Record<string, { w: number; h: number }> = {
  car: { w: 136, h: 96 }, bus: { w: 190, h: 108 }, duck: { w: 124, h: 104 }, train: { w: 190, h: 100 }, dog: { w: 150, h: 96 },
  pegA: { w: 84, h: 84 }, pegB: { w: 84, h: 84 }, pegC: { w: 84, h: 84 },
  roll0: { w: 184, h: 184 }, roll1: { w: 184, h: 184 }, roll2: { w: 184, h: 184 }, roll3: { w: 184, h: 184 },
  boxUp: { w: BOX.w + 24, h: BOX.h + 24 }, boxTipped: { w: BOX.w + 24, h: BOX.h + 24 },
  cat: { w: CAT.rx * 2 + 30, h: CAT.ry * 2 + 40 }, hand: { w: 96, h: 110 }, shadow: { w: 128, h: 128 },
  plant: { w: 136, h: 136 }, basket: { w: BASKET.rx * 2 + 44, h: BASKET.ry * 2 + 44 }, duckTail: { w: 64, h: 56 }, dogLying: { w: 164, h: 112 },
}

/** Where each toy's two eyes are, from its middle, and how big: the whites are in the sprite, and the view draws the pupils. */
export const EYES: Record<ToyId, { x: number; y: number; r: number; lid: string }> = {
  car: { x: 20, y: 13, r: 11, lid: '#d8402f' },
  bus: { x: 60, y: 17, r: 12.5, lid: '#7b62c9' },
  duck: { x: 26, y: 12, r: 7.5, lid: '#ffd84a' },
  train: { x: 62, y: 12, r: 10, lid: '#2c3e63' },
  dog: { x: 42, y: 11, r: 7.5, lid: '#f6f1e7' },
  pegA: { x: 5, y: 7.5, r: 5.5, lid: '#ecc99b' },
  pegB: { x: 5, y: 7.5, r: 5.5, lid: '#ecc99b' },
  pegC: { x: 5, y: 7.5, r: 5.5, lid: '#ecc99b' },
}

function whites(g: G, id: ToyId): void {
  const eye = EYES[id]
  for (const side of [-1, 1]) {
    g.fillStyle = '#fffdf6'
    blob(g, eye.x, eye.y * side, eye.r, eye.r)
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.stroke()
  }
}

function wheel(g: G, x: number, y: number, long: number, wide: number): void {
  g.fillStyle = '#2b2622'
  box(g, x - long / 2, y - wide / 2, long, wide, wide * 0.45)
  g.fill()
}

function outline(g: G, width = 3): void {
  g.strokeStyle = INK
  g.lineWidth = width
  g.lineJoin = 'round'
  g.stroke()
}

function car(g: G): void {
  for (const x of [-32, 32]) for (const y of [-32, 32]) wheel(g, x, y, 28, 14)
  g.fillStyle = '#d8402f'
  box(g, -56, -31, 112, 62, 20)
  g.fill()
  outline(g)
  // The bonnet's shine, the cream roof, and a windscreen that is a face.
  g.fillStyle = 'rgba(255, 255, 255, 0.2)'
  box(g, 30, -22, 20, 18, 8)
  g.fill()
  g.fillStyle = '#b7dff0'
  box(g, 4, -27, 32, 54, 12)
  g.fill()
  outline(g, 2.5)
  g.fillStyle = '#fbf1d8'
  box(g, -40, -24, 48, 48, 12)
  g.fill()
  outline(g, 2.5)
  g.fillStyle = '#9fcfe4'
  box(g, -50, -18, 9, 36, 4)
  g.fill()
  // Headlamps and a grin on the bumper.
  g.fillStyle = '#ffe9a0'
  for (const y of [-21, 21]) { blob(g, 51, y, 4.5, 6); g.fill() }
  g.strokeStyle = INK
  g.lineWidth = 2.5
  g.lineCap = 'round'
  g.beginPath()
  g.arc(36, 0, 14, -0.6, 0.6)
  g.stroke()
  whites(g, 'car')
}

function bus(g: G): void {
  for (const x of [-50, 46]) for (const y of [-38, 38]) wheel(g, x, y, 34, 14)
  g.fillStyle = '#7b62c9'
  box(g, -84, -37, 168, 74, 16)
  g.fill()
  outline(g)
  g.fillStyle = '#b7dff0'
  box(g, 44, -32, 34, 64, 12)
  g.fill()
  outline(g, 2.5)
  // A cream roof with three skylights, and a stripe down each side.
  g.fillStyle = '#fbf1d8'
  box(g, -76, -28, 118, 56, 10)
  g.fill()
  outline(g, 2.5)
  g.fillStyle = '#cfe7f2'
  for (const x of [-64, -30, 4]) {
    box(g, x, -14, 26, 28, 6)
    g.fill()
    outline(g, 2)
  }
  g.fillStyle = '#f2b23a'
  box(g, -82, -37, 124, 6, 3)
  g.fill()
  box(g, -82, 31, 124, 6, 3)
  g.fill()
  g.strokeStyle = INK
  g.lineWidth = 2.5
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(80, -9)
  g.quadraticCurveTo(84, 0, 80, 9)
  g.stroke()
  whites(g, 'bus')
}

function duck(g: G): void {
  // Tail, body, two folded wings, then the head with its beak.
  g.fillStyle = '#ffd84a'
  g.beginPath()
  g.moveTo(-30, -14)
  g.lineTo(-52, -4)
  g.lineTo(-44, 6)
  g.lineTo(-30, 14)
  g.closePath()
  g.fill()
  outline(g)
  blob(g, -8, 0, 36, 32)
  g.fill()
  outline(g)
  g.fillStyle = '#f4bf2c'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(8, 22 * side)
    g.bezierCurveTo(-6, 34 * side, -30, 30 * side, -36, 14 * side)
    g.bezierCurveTo(-22, 20 * side, -4, 16 * side, 8, 22 * side)
    g.fill()
    outline(g, 2)
  }
  g.fillStyle = '#f08a2b'
  g.beginPath()
  g.moveTo(40, -9)
  g.bezierCurveTo(56, -10, 60, -4, 60, 0)
  g.bezierCurveTo(60, 4, 56, 10, 40, 9)
  g.closePath()
  g.fill()
  outline(g, 2.5)
  g.fillStyle = '#ffd84a'
  blob(g, 24, 0, 23, 23)
  g.fill()
  outline(g)
  g.fillStyle = 'rgba(255, 255, 255, 0.3)'
  blob(g, 14, -8, 8, 5, -0.6)
  g.fill()
  whites(g, 'duck')
}

/** Where things sit along the train's boiler, nose toward +x: the funnel's ring, the one brass band, and the buffer beam. */
export const TRAIN_LOOK = { funnel: { x: 40, r: 13 }, band: { x: 58, wide: 6 }, beam: { x: 72 } } as const

function train(g: G): void {
  for (const x of [-52, -14, 30]) for (const y of [-31, 31]) wheel(g, x, y, 30, 12)
  g.fillStyle = '#c7372c'
  for (const y of [-34, 34]) { box(g, -60, y - 3, 96, 6, 3); g.fill() }
  // The cab at the back, the boiler in front of it, and the buffer beam.
  g.fillStyle = '#2c3e63'
  box(g, -80, -34, 62, 68, 8)
  g.fill()
  outline(g)
  g.fillStyle = '#4a628f'
  box(g, -72, -26, 46, 52, 6)
  g.fill()
  outline(g, 2)
  g.fillStyle = '#2c3e63'
  box(g, -22, -25, 98, 50, 22)
  g.fill()
  outline(g)
  // One brass band round the boiler, between the funnel and the buffer beam, clear of the funnel's ring.
  g.fillStyle = '#e2b13c'
  box(g, TRAIN_LOOK.band.x, -21, TRAIN_LOOK.band.wide, 42, 2)
  g.fill()
  g.fillStyle = '#c7372c'
  box(g, TRAIN_LOOK.beam.x, -30, 9, 60, 3)
  g.fill()
  outline(g, 2)
  g.fillStyle = '#b9bcc2'
  for (const y of [-20, 20]) { blob(g, 83, y, 5, 5); g.fill(); outline(g, 1.5) }
  // A brass dome, and the funnel with its dark mouth.
  g.fillStyle = '#e2b13c'
  blob(g, 8, 0, 10, 10)
  g.fill()
  outline(g, 2)
  g.fillStyle = '#c7372c'
  blob(g, TRAIN_LOOK.funnel.x, 0, TRAIN_LOOK.funnel.r, TRAIN_LOOK.funnel.r)
  g.fill()
  outline(g, 2.5)
  g.fillStyle = '#231a1a'
  blob(g, TRAIN_LOOK.funnel.x, 0, 7, 7)
  g.fill()
  whites(g, 'train')
}

function dog(g: G): void {
  // Four paws, a long white body with a brown saddle, a red collar, the head with its flop ears and a black nose.
  g.fillStyle = '#f6f1e7'
  for (const x of [-34, 12]) for (const y of [-24, 24]) { blob(g, x, y, 11, 8); g.fill(); outline(g, 2) }
  box(g, -50, -22, 84, 44, 22)
  g.fill()
  outline(g)
  g.fillStyle = '#9a643a'
  blob(g, -22, -4, 20, 15, 0.3)
  g.fill()
  g.fillStyle = '#d8402f'
  box(g, 16, -20, 8, 40, 3)
  g.fill()
  g.fillStyle = '#f6f1e7'
  blob(g, 38, 0, 24, 23)
  g.fill()
  outline(g)
  box(g, 50, -10, 20, 20, 9)
  g.fill()
  outline(g, 2.5)
  g.fillStyle = '#2b2622'
  blob(g, 68, 0, 5.5, 6.5)
  g.fill()
  g.fillStyle = '#9a643a'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(34, 18 * side)
    g.bezierCurveTo(20, 24 * side, 14, 40 * side, 28, 42 * side)
    g.bezierCurveTo(42, 42 * side, 46, 28 * side, 44, 20 * side)
    g.closePath()
    g.fill()
    outline(g, 2.5)
  }
  whites(g, 'dog')
}

function dogLying(g: G): void {
  // The dog lain down, from above: flat on its belly and wider for it, hind legs splayed out behind, forelegs stretched
  // out flat on the boards to each side of its chin, ears spread on the floor, and its tail curled round along its flank.
  g.lineCap = 'round'
  for (const [colour, wide] of [[INK, 13], ['#f6f1e7', 8]] as const) {
    g.strokeStyle = colour
    g.lineWidth = wide
    g.beginPath()
    g.moveTo(-50, 6)
    g.bezierCurveTo(-72, 14, -66, 40, -38, 38)
    g.stroke()
  }
  g.fillStyle = '#f6f1e7'
  // Hind legs, splayed.
  for (const side of [-1, 1]) { blob(g, -46, 28 * side, 19, 9, -0.5 * side); g.fill(); outline(g, 2) }
  // Forelegs, stretched out along the floor past the collar, a paw at the end of each.
  for (const side of [-1, 1]) {
    box(g, 6, 27 * side - 7, 58, 14, 7)
    g.fill()
    outline(g, 2)
    blob(g, 62, 27 * side, 9, 8.5)
    g.fill()
    outline(g, 2)
  }
  box(g, -56, -28, 92, 56, 27)
  g.fill()
  outline(g)
  g.fillStyle = '#9a643a'
  blob(g, -24, -5, 24, 18, 0.3)
  g.fill()
  g.fillStyle = '#d8402f'
  box(g, 16, -24, 8, 48, 3)
  g.fill()
  // Ears, spread flat on the boards.
  g.fillStyle = '#9a643a'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(32, 16 * side)
    g.bezierCurveTo(12, 22 * side, 2, 38 * side, 18, 44 * side)
    g.bezierCurveTo(34, 46 * side, 46, 32 * side, 44, 18 * side)
    g.closePath()
    g.fill()
    outline(g, 2.5)
  }
  g.fillStyle = '#f6f1e7'
  blob(g, 38, 0, 24, 23)
  g.fill()
  outline(g)
  box(g, 50, -10, 20, 20, 9)
  g.fill()
  outline(g, 2.5)
  g.fillStyle = '#2b2622'
  blob(g, 68, 0, 5.5, 6.5)
  g.fill()
  whites(g, 'dog')
}

function peg(g: G, id: ToyId): void {
  const body = id === 'pegA' ? '#58c2a8' : id === 'pegB' ? '#a983dc' : '#f2785c'
  // From above a peg person is its shoulders and, looking up, its face under a hat pushed back.
  g.fillStyle = body
  blob(g, 0, 0, 29, 29)
  g.fill()
  outline(g)
  g.fillStyle = id === 'pegA' ? '#e9a13b' : id === 'pegB' ? '#f6f1e7' : '#3f8fbf'
  blob(g, -9, 0, 17, 21)
  g.fill()
  outline(g, 2.5)
  if (id !== 'pegC') {
    g.fillStyle = id === 'pegA' ? '#f6f1e7' : '#d8402f'
    blob(g, -22, 0, 7, 7)
    g.fill()
    outline(g, 2)
  }
  g.fillStyle = '#ecc99b'
  blob(g, 3, 0, 18, 18)
  g.fill()
  outline(g, 2.5)
  g.fillStyle = 'rgba(232, 110, 100, 0.55)'
  for (const side of [-1, 1]) { blob(g, 10, 13 * side, 3.5, 3.5); g.fill() }
  g.strokeStyle = INK
  g.lineWidth = 2
  g.lineCap = 'round'
  g.beginPath()
  g.arc(9, 0, 7, -0.7, 0.7)
  g.stroke()
  whites(g, id)
}

/** Each roll is its own: how much is left on it, its core, and how its end hangs. Every core is a plain ring. */
export const ROLL_LOOK: Record<Kind, { rx: number; ry: number; core: number; hole: number; card: string; inside: string; tail: number; tailLong: number }> = {
  0: { rx: ROLL_RADIUS, ry: ROLL_RADIUS, core: 21, hole: 14, card: '#caa56f', inside: '#e9e4d6', tail: -1.1, tailLong: 26 },
  1: { rx: 45, ry: 45, core: 30, hole: 22, card: '#f4f1ea', inside: '#b9854c', tail: 0.7, tailLong: 34 },
  2: { rx: 48, ry: 46, core: 25, hole: 11, card: '#b5553f', inside: '#f0dfc0', tail: 2.5, tailLong: 16 },
  3: { rx: 42, ry: 40, core: 32, hole: 20, card: '#8b6a45', inside: '#5c4630', tail: -2.6, tailLong: 30 },
}

function roll(g: G, kind: Kind): void {
  // A roll seen from above: the wound tape, its core, the hole, and the loose end standing off it.
  const look = ROLL_LOOK[kind]
  softShadow(g, 5, 8, look.rx + 6, look.ry + 6, 0.34)
  // The loose end: a tab on one, a long curl on the next, a folded corner, a torn tail.
  g.save()
  g.rotate(look.tail)
  g.fillStyle = TAPE_COLOUR[kind]
  g.beginPath()
  g.moveTo(look.rx - 16, -4)
  if (kind === 1) g.bezierCurveTo(look.rx + 10, -22, look.rx + look.tailLong * 0.6, 6, look.rx + look.tailLong, -12)
  else g.lineTo(look.rx + look.tailLong, kind === 2 ? -8 : -16)
  g.lineTo(look.rx + look.tailLong - (kind === 3 ? 7 : 0), 2)
  g.lineTo(look.rx + look.tailLong + (kind === 3 ? 4 : 0), 9)
  if (kind === 1) g.bezierCurveTo(look.rx + look.tailLong * 0.6, 24, look.rx + 12, 2, look.rx - 14, 12)
  else g.lineTo(look.rx - 14, 12)
  g.closePath()
  g.fill()
  outline(g, 2)
  g.restore()
  g.fillStyle = TAPE_COLOUR[kind]
  blob(g, 0, 0, look.rx, look.ry, 0.4)
  g.fill()
  outline(g)
  g.strokeStyle = 'rgba(0, 0, 0, 0.1)'
  g.lineWidth = 1.2
  for (let r = look.rx - 5; r > look.core + 2; r -= 4) { blob(g, 0, 0, r, r * (look.ry / look.rx), 0.4); g.stroke() }
  g.fillStyle = 'rgba(255, 255, 255, 0.22)'
  g.beginPath()
  g.arc(0, 0, look.ry - 5, -2.6 + kind * 0.5, -1.2 + kind * 0.5)
  g.arc(0, 0, look.core + 4, -1.2 + kind * 0.5, -2.6 + kind * 0.5, true)
  g.closePath()
  g.fill()
  g.fillStyle = look.card
  blob(g, 0, 0, look.core, look.core)
  g.fill()
  outline(g, 2)
  g.fillStyle = look.inside
  blob(g, 0, 0, look.hole, look.hole)
  g.fill()
  outline(g, 2)
  // Nothing is drawn in a core: the four are told apart by how wide the card is, its colour, and the hole.
}

/** The duck's tail, which is all that shows of it in a nest or in the reeds. */
function duckTail(g: G): void {
  softShadow(g, 2, 4, 22, 18, 0.25)
  g.fillStyle = '#ffd84a'
  g.beginPath()
  g.moveTo(14, 0)
  g.bezierCurveTo(10, -16, -6, -20, -22, -12)
  g.lineTo(-12, -5)
  g.lineTo(-26, 0)
  g.lineTo(-12, 5)
  g.lineTo(-22, 12)
  g.bezierCurveTo(-6, 20, 10, 16, 14, 0)
  g.closePath()
  g.fill()
  outline(g, 2.5)
}

function tissue(g: G, points: readonly (readonly [number, number])[]): void {
  g.fillStyle = '#fbf8f0'
  g.beginPath()
  points.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(150, 140, 120, 0.55)'
  g.lineWidth = 1.5
  g.stroke()
}

function boxUp(g: G): void {
  const w = BOX.w, h = BOX.h
  g.fillStyle = 'rgba(60, 34, 12, 0.3)'
  box(g, -w / 2 + 6, -h / 2 + 9, w, h, 6)
  g.fill()
  g.fillStyle = '#a9d3cb'
  box(g, -w / 2, -h / 2, w, h, 6)
  g.fill()
  outline(g)
  g.fillStyle = '#5f8f89'
  box(g, -w / 2 + 11, -h / 2 + 11, w - 22, h - 22, 3)
  g.fill()
  outline(g, 2)
  tissue(g, [[-w / 2 + 12, -h / 2 + 12], [-30, -h / 2 + 12], [-52, -h / 2 + 44], [-w / 2 + 12, -h / 2 + 70]])
  tissue(g, [[w / 2 - 12, h / 2 - 12], [w / 2 - 12, h / 2 - 76], [w / 2 - 50, h / 2 - 40], [w / 2 - 80, h / 2 - 12]])
}

function boxTipped(g: G): void {
  // On its side: one long wall facing up, the dark mouth along its right edge and tissue paper spilling from it.
  const w = BOX.w, h = BOX.h, x = -w / 2
  g.fillStyle = 'rgba(60, 34, 12, 0.3)'
  box(g, x + 6, -h / 2 + 9, w, h, 6)
  g.fill()
  tissue(g, [[x + w - 12, -h / 2 + 34], [x + w + 6, -h / 2 + 26], [x + w + 8, -h / 2 + 70], [x + w + 3, -10], [x + w + 8, 44], [x + w + 4, h / 2 - 44], [x + w + 7, h / 2 - 18], [x + w - 12, h / 2 - 28]])
  g.fillStyle = '#a9d3cb'
  box(g, x, -h / 2, w, h, 6)
  g.fill()
  outline(g)
  g.fillStyle = '#93c2ba'
  box(g, x + 10, -h / 2 + 10, w - 46, h - 20, 3)
  g.fill()
  g.fillStyle = '#f3ecdc'
  box(g, x + 44, -34, 70, 68, 6)
  g.fill()
  outline(g, 2)
  g.fillStyle = '#3d5f5b'
  box(g, x + w - 30, -h / 2 + 8, 24, h - 16, 3)
  g.fill()
  outline(g, 2)
}

function cat(g: G): void {
  // A black and white cat curled asleep: back toward the room, head on its paws at the left.
  const rx = CAT.rx, ry = CAT.ry
  softShadow(g, 6, 12, rx + 8, ry + 10, 0.32)
  g.fillStyle = '#2a2a33'
  g.beginPath()
  g.moveTo(-rx + 34, -ry + 14)
  g.bezierCurveTo(-rx * 0.4, -ry - 12, rx * 0.6, -ry - 8, rx - 6, -ry * 0.2)
  g.bezierCurveTo(rx + 8, ry * 0.5, rx * 0.5, ry + 4, 0, ry)
  g.bezierCurveTo(-rx * 0.5, ry + 2, -rx + 10, ry - 4, -rx + 34, -ry + 14)
  g.closePath()
  g.fill()
  outline(g)
  // Haunch and shoulder, as two soft lines of lighter fur.
  g.strokeStyle = 'rgba(255, 255, 255, 0.14)'
  g.lineWidth = 3
  g.lineCap = 'round'
  g.beginPath()
  g.arc(rx * 0.42, 4, 34, -2.4, 0.3)
  g.stroke()
  g.beginPath()
  g.arc(-rx * 0.1, 6, 30, -2.6, -0.5)
  g.stroke()
  // White paws tucked under the chin.
  g.fillStyle = '#f6f1e7'
  for (const [x, y] of [[-rx + 62, ry - 12], [-rx + 92, ry - 8]]) { blob(g, x, y, 17, 10, 0.1); g.fill(); outline(g, 2) }
  // The head: two ears, a white blaze, shut eyes as two curved lashes, a pink nose.
  g.fillStyle = '#2a2a33'
  for (const [x, turn] of [[-rx + 26, -0.5], [-rx + 70, 0.4]] as const) {
    g.save()
    g.translate(x, -4)
    g.rotate(turn)
    g.beginPath()
    g.moveTo(-14, 0)
    g.lineTo(0, -28)
    g.lineTo(14, 0)
    g.closePath()
    g.fill()
    outline(g, 2.5)
    g.fillStyle = '#e99aa2'
    g.beginPath()
    g.moveTo(-6, -3)
    g.lineTo(0, -17)
    g.lineTo(6, -3)
    g.closePath()
    g.fill()
    g.restore()
    g.fillStyle = '#2a2a33'
  }
  blob(g, -rx + 48, 10, 36, 28)
  g.fill()
  outline(g)
  g.fillStyle = '#f6f1e7'
  g.beginPath()
  g.moveTo(-rx + 48, -8)
  g.bezierCurveTo(-rx + 34, 14, -rx + 28, 30, -rx + 48, 36)
  g.bezierCurveTo(-rx + 68, 30, -rx + 62, 14, -rx + 48, -8)
  g.fill()
  g.strokeStyle = '#f6f1e7'
  g.lineWidth = 3
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(-rx + 48 + side * 15, 6, 7, 0.25, Math.PI - 0.25)
    g.stroke()
  }
  g.fillStyle = '#e99aa2'
  blob(g, -rx + 48, 20, 4, 3)
  g.fill()
  // Whiskers.
  g.strokeStyle = 'rgba(246, 241, 231, 0.8)'
  g.lineWidth = 1.4
  for (const side of [-1, 1]) for (const tilt of [-0.25, 0.1, 0.45]) {
    g.beginPath()
    g.moveTo(-rx + 48 + side * 9, 24)
    g.lineTo(-rx + 48 + side * 38, 24 + tilt * 30)
    g.stroke()
  }
}

function hand(g: G): void {
  // The ghost hand: a mitten of a hand with one finger out, pointing up the screen.
  g.fillStyle = 'rgba(255, 255, 255, 0.92)'
  g.beginPath()
  g.moveTo(-9, -46)
  g.bezierCurveTo(-9, -56, 9, -56, 9, -46)
  g.lineTo(9, -8)
  g.bezierCurveTo(30, -10, 34, 6, 32, 20)
  g.bezierCurveTo(30, 40, 16, 48, 0, 48)
  g.bezierCurveTo(-18, 48, -30, 38, -30, 20)
  g.bezierCurveTo(-30, 8, -22, 2, -9, 4)
  g.closePath()
  g.fill()
  g.strokeStyle = 'rgba(58, 42, 34, 0.85)'
  g.lineWidth = 3
  g.lineJoin = 'round'
  g.stroke()
}

function shadow(g: G): void {
  const shade = g.createRadialGradient(0, 0, 14, 0, 0, 60)
  shade.addColorStop(0, 'rgba(60, 34, 12, 0.42)')
  shade.addColorStop(0.7, 'rgba(60, 34, 12, 0.2)')
  shade.addColorStop(1, 'rgba(60, 34, 12, 0)')
  g.fillStyle = shade
  blob(g, 0, 0, 60, 60)
  g.fill()
}

/** Paints one sprite about its own middle. */
export function paintSprite(g: G, name: string): void {
  switch (name) {
    case 'car': return car(g)
    case 'bus': return bus(g)
    case 'duck': return duck(g)
    case 'train': return train(g)
    case 'dog': return dog(g)
    case 'dogLying': return dogLying(g)
    case 'pegA': case 'pegB': case 'pegC': return peg(g, name)
    case 'roll0': return roll(g, 0)
    case 'roll1': return roll(g, 1)
    case 'roll2': return roll(g, 2)
    case 'roll3': return roll(g, 3)
    case 'boxUp': return boxUp(g)
    case 'boxTipped': return boxTipped(g)
    case 'cat': return cat(g)
    case 'hand': return hand(g)
    case 'plant': return plant(g)
    case 'basket': return basket(g)
    case 'duckTail': return duckTail(g)
    default: return shadow(g)
  }
}
