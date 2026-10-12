import { type Tier } from './config'
import { blink, eye, now } from './figures'
import type { Guidance, HandPose } from './guidance'
import type { Box } from './layout'
import { PAST } from './setting'
import { PAPERS, type Paper, type SheetWindow } from './sheet'
import { Sketch, noise } from './sketch'
import { fit, type Fit } from './stage'
import { LIP, PAPER_RESTS, PILE, ROLLED, SHEET, TOP, UNDER, WICK, type Table } from './table'
import { CREAM, LINE, PAPER_COLOURS, RAINBOW, WAX, WHITE, band, crumble, drawGuide, dust, trace, type Aim, type Pen, type Surface } from './view'

// The room, in the same scratch card as the wood: black wax with scraped
// lines for the wall, the shelf, the window, the door, the floor and the cat,
// and one place where the wax is scraped clear, the table top. On it the
// working pieces lie plain: the sheet, three papers, the scissors, the candle
// and the pile are one flat colour each, with no face and no pattern, and
// they move only with the finger. The cat under the table holds the life.

export const TABLE_TOP = '#ead9b4'
export const SCISSORS = '#6e6488'
export const CANDLE = '#f6b48c'
export const GLOW = '#fff3b8'
/** What a scene is showing in the room. */
export type RoomShow = { dim: number; door: number; smoke: number }

const PI = Math.PI
const TOP_SHAPE = [TOP.left + 20, TOP.top, TOP.right - 20, TOP.top, TOP.right, TOP.bottom, TOP.left, TOP.bottom]
/** The cat's feet. */
export const CAT_GROUND = UNDER.bottom - 2
export const CAT_SIZE = 0.8

/** What hangs on the wall or stands against it, each with the room it takes: no stroke of plaster lies on one. */
export const WALL_THINGS: Record<string, Box> = {
  window: { left: 76, top: PAST.top, right: 468, bottom: 224 },
  coat: { left: 462, top: 46, right: 700, bottom: 220 },
  shelf: { left: 716, top: 60, right: 1056, bottom: 234 },
  picture: { left: 8, top: 206, right: 130, bottom: 364 },
  table: { left: 120, top: 214, right: 1060, bottom: 900 },
  basket: { left: -120, top: 290, right: 130, bottom: 900 },
}
/** The wall the plaster is on, and the cells it is laid out in. */
const WALL = { left: PAST.left, top: PAST.top, right: 1070, bottom: 590 }
const CELL = { wide: 58, high: 46 }

/**
 * The strokes of plaster, each x, y, x, y. The wall is ruled into cells, and a cell holds at most one stroke,
 * which lies wholly inside it with a margin: so no stroke can cross or touch another and make a sign of two.
 * A cell that any of `WALL_THINGS` reaches into is left bare, so no stroke lies on the window, a jar or the coat.
 * Fewer than half the cells are used, each stroke with its own turn and length.
 */
export function plasterStrokes(): number[][] {
  const out: number[][] = []
  const things = Object.values(WALL_THINGS)
  let k = 0
  for (let top = WALL.top; top + CELL.high <= WALL.bottom; top += CELL.high) {
    for (let left = WALL.left; left + CELL.wide <= WALL.right; left += CELL.wide) {
      k++
      if (noise(k, 41) > -0.1) continue
      if (things.some((thing) => left < thing.right && left + CELL.wide > thing.left && top < thing.bottom && top + CELL.high > thing.top)) continue
      const turn = noise(k, 43) * PI, long = 7 + 9 * (0.5 + 0.5 * noise(k, 44))
      const dx = Math.cos(turn) * long, dy = Math.sin(turn) * long
      // Its middle is put where both ends keep six units inside the cell.
      const roomX = CELL.wide - 12 - Math.abs(dx), roomY = CELL.high - 12 - Math.abs(dy)
      const cx = left + 6 + Math.abs(dx) / 2 + roomX * (0.5 + 0.5 * noise(k, 45)), cy = top + 6 + Math.abs(dy) / 2 + roomY * (0.5 + 0.5 * noise(k, 46))
      out.push([cx - dx / 2, cy - dy / 2, cx + dx / 2, cy + dy / 2])
    }
  }
  return out
}

/** The room that stands still: `lines` are scraped, `hide` is the table's own wood under its top. */
export function paintRoom(s: Sketch): void {
  // Where the wall meets the floor, at the two sides of the table.
  s.line([PAST.left, 604, -40, 600, 60, 606, 140, 602])
  s.line([1040, 604, 1074, 600])
  // Plaster: short strokes scattered over the bare wall.
  for (const stroke of plasterStrokes()) s.line(stroke)
  // The window, with the night in it: one upright bar, a branch and the moon behind a cloud.
  s.line([150, 196, 146, 30, 392, 24, 398, 192, 150, 196])
  // The sill is a board with ends, not two level strokes.
  s.line([132, 206, 414, 200, 410, 209, 136, 214, 132, 206])
  s.line([268, 28, 272, 194])
  s.arc(332, 86, 34, 34, PI * 0.72, PI * 2.2, 14)
  s.bend(296, 118, 330, 96, 372, 112, 6); s.bend(304, 128, 340, 112, 384, 124, 6)
  s.bend(152, 150, 210, 108, 262, 96, 7); s.line([206, 114, 214, 80]); s.line([232, 102, 252, 70]); s.line([180, 132, 172, 104])
  // Curtains, each fold its own width.
  for (const [x, lean] of [[96, -8], [116, 5], [142, -3], [404, 6], [428, -6], [446, 9]] as const) s.bend(x, 14, x + lean, 110, x - lean * 0.6, 204 + noise(x, 45) * 14, 6)
  s.bend(84, 12, 270, -6, 460, 12, 8)
  // Pegs with a coat and a scarf, under the middle of the wall.
  s.line([486, 60, 692, 54])
  s.line([520, 58, 520, 72]); s.line([640, 56, 640, 70])
  s.line([520, 72, 482, 100, 470, 206, 506, 212, 512, 150]); s.line([520, 72, 560, 100, 572, 204, 536, 212, 530, 150])
  s.line([520, 78, 520, 208]); s.oval('lines', 512, 120, 4, 4); s.oval('lines', 513, 156, 4, 4)
  s.bend(640, 70, 626, 130, 634, 196, 6); s.bend(640, 70, 658, 120, 650, 178, 6)
  for (let k = 0; k < 4; k++) s.line([628 + k * 4, 196, 626 + k * 5 + noise(k, 46) * 3, 208 + 8 * (0.5 + 0.5 * noise(k, 47))])
  // The shelf: a jug, jars of every size, a ball of string with its end hanging.
  s.line([724, 168, 1050, 160, 1048, 170, 726, 178, 724, 168])
  // Two brackets against the wall, each a closed wedge with a bowed side, the one smaller than the other.
  s.line([746, 178, 746, 214, 752, 212]); s.bend(746, 212, 770, 204, 780, 178, 5)
  s.line([1028, 171, 1028, 196, 1023, 195]); s.bend(1028, 195, 1012, 190, 1006, 172, 4)
  s.line([744, 166, 740, 104, 752, 92, 750, 78, 786, 76, 784, 92, 796, 104, 792, 164]); s.bend(796, 110, 826, 120, 794, 150, 6)
  s.line([820, 164, 818, 118, 852, 116, 850, 162]); s.line([814, 119, 818, 106, 834, 102, 851, 104, 856, 115])
  s.line([872, 162, 868, 86, 880, 70, 904, 70, 916, 84, 914, 160]); s.line([876, 70, 908, 68]); s.bend(874, 120, 892, 128, 912, 118, 4)
  // The smallest pot is squat and round-shouldered under a domed lid: no upright with a level stroke across its top.
  s.line([935, 160, 929, 144, 937, 133, 958, 131, 966, 142, 961, 159]); s.bend(937, 133, 947, 119, 958, 131, 5)
  s.oval('lines', 1004, 136, 26, 25); s.bend(984, 128, 1004, 116, 1026, 130, 5); s.bend(982, 142, 1004, 150, 1028, 140, 5); s.bend(996, 114, 1010, 136, 998, 158, 5)
  s.bend(1026, 150, 1044, 190, 1034, 226, 6)
  // The door, shut: planks of uneven width, a strap and a latch.
  s.line([1076, 804, 1080, 96, 1102, 78, PAST.right, 70])
  for (const [x, lean] of [[1120, 3], [1178, -4], [1226, 5], [1298, -3]] as const) s.line([x, 92, x + lean, 440, x - lean, 800])
  s.bend(1082, 250, 1150, 240, 1214, 262, 6); s.bend(1082, 268, 1150, 262, 1214, 262, 6)
  s.line([1098, 470, 1132, 464, 1136, 488, 1100, 492, 1098, 470]); s.bend(1132, 476, 1160, 470, 1166, 492, 5)
  // A picture on the wall by the window's side: a moth, wings wide. It hangs by a cord over a round-headed nail.
  s.line([20, 356, 16, 250, 118, 246, 122, 352, 20, 356]); s.bend(34, 248, 70, 214, 104, 246, 7); s.oval('lines', 70, 229, 4, 4, 0, 6)
  s.oval('lines', 69, 300, 6, 18)
  s.bend(66, 290, 30, 262, 30, 296, 5); s.bend(30, 296, 44, 318, 66, 306, 4)
  s.bend(72, 290, 108, 264, 108, 298, 5); s.bend(108, 298, 96, 320, 72, 306, 4)
  s.bend(66, 282, 58, 268, 50, 266, 3); s.bend(72, 282, 80, 266, 88, 266, 3)
  // The floor: boards that run away from the wall, each its own width.
  for (const [x0, x1] of [[-150, -168], [-52, -92], [34, -20], [118, 76], [1052, 1066], [1110, 1140]] as const) s.line([x0, 606, x1, PAST.bottom])
  for (const [x0, x1] of [[286, 270], [452, 446], [612, 618], [770, 786], [912, 938]] as const) s.line([x0, 672, x1, PAST.bottom])
  // The grain of the boards, each stroke along its own board: no joint crosses two boards, so no two posts carry a rung.
  for (let k = 0; k < 16; k++) {
    const x = 240 + k * 46 + noise(k, 56) * 16, y = 684 + 96 * (0.5 + 0.5 * noise(k, 57))
    const long = 16 + 26 * (0.5 + 0.5 * noise(k, 58))
    s.line([x, y, x + noise(k, 59) * 3 + (x - 600) * 0.012, y + long])
  }
  // A rug under the table with a ragged fringe.
  s.bend(214, 806, 590, 786, 968, 806, 10); s.bend(206, 840, 590, 862, 978, 840, 10)
  for (let k = 0; k < 9; k++) { const x = 206 - noise(k, 48) * 4, y = 808 + k * 3.6 + noise(k, 49) * 2; s.line([x, y, x - 10 - 9 * (0.5 + 0.5 * noise(k, 50)), y + noise(k, 51) * 5]) }
  // A basket of rolled sheets by the table's left end, and a broom against the wall.
  s.line([22, 800, 14, 660, 122, 656, 114, 800, 22, 800]); s.bend(14, 660, 68, 676, 122, 656, 6)
  for (let k = 0; k < 7; k++) s.bend(18 + noise(k, 52) * 3, 690 + k * 16, 68, 700 + k * 16 + noise(k, 53) * 5, 118, 688 + k * 16, 5)
  s.line([34, 664, 26, 520, 52, 516, 58, 662]); s.oval('lines', 39, 518, 13, 5)
  s.line([70, 662, 78, 470, 104, 474, 96, 660]); s.oval('lines', 91, 472, 13, 5)
  s.line([-64, 792, -30, 300]); s.line([-64, 792, -96, 800, -110, 742, -58, 720, -36, 760, -64, 792])
  for (let k = 0; k < 6; k++) s.line([-98 + k * 10, 760 + noise(k, 54) * 6, -104 + k * 11, 798 + noise(k, 55) * 4])
  // The table's own wood under the top: the apron and two legs.
  s.shape('hide', [TOP.left, TOP.bottom, TOP.right, TOP.bottom, TOP.right - 4, 664, TOP.left + 4, 664])
  s.line([TOP.left + 4, 664, TOP.right - 4, 664])
  for (const x of [154, 990]) {
    s.shape('hide', [x, 664, x + 36, 664, x + 32, 808, x + 4, 808])
    s.line([x, 664, x + 4, 808, x + 32, 808, x + 36, 664])
    s.line([x + 12, 690, x + 14, 760]); s.line([x + 24, 700, x + 22, 790])
  }
}

/** Where the stripes on the cat's back begin, from its own feet: no two gaps alike, so they are no tally. */
export const CAT_STRIPES: readonly number[] = [-88, -62, -40, -6]

/** The cat's two front paws as it sits, from its own feet: where each is, how wide and how high. */
export const CAT_PAWS: readonly (readonly [number, number, number])[] = [[19, 11, 7], [-21, 9, 5.5]]

/** The cat under the table: a loaf with a head as wide as its body, small in the leg, and never still. */
export function drawCat(s: Sketch, table: Table, t: number): void {
  const cat = table.cat
  const moving = Math.abs(cat.to - cat.x) > 1
  const facing = moving ? Math.sign(cat.to - cat.x) : cat.lookX >= cat.x ? 1 : -1
  s.push(cat.x, CAT_GROUND, 0, facing * CAT_SIZE, CAT_SIZE)
  const sway = Math.sin(t * 1.3) * 0.5 + Math.sin(t * 3.1) * 0.2
  let hx: number, hy: number
  if (moving) {
    // Running: long and low, its belly swinging, legs going.
    const leg = Math.sin(t * 24) * 20
    s.oval('hide', -10, -46, 96, 34)
    s.arc(-10, -46, 96, 34, PI * 0.95, PI * 2.05, 12)
    s.bend(-98, -34, -10, 2 + Math.sin(t * 24) * 5, 80, -34, 7)
    s.line([-70, -18, -70 - leg, 0]); s.line([-48, -12, -48 + leg, 0]); s.line([40, -12, 40 - leg, 0]); s.line([62, -18, 62 + leg, 0])
    s.bend(-104, -52, -150, -74, -168, -44 + sway * 10, 6)
    hx = 84; hy = -74
  } else {
    // Sitting: a loaf, with a tail that never stops.
    const breath = Math.sin(t * 1.9) * 2
    s.oval('hide', -24, -44, 92, 44 + breath)
    s.arc(-24, -44, 92, 44 + breath, PI * 0.12, PI * 1.66, 16)
    s.bend(-112, -30, -168, -18, -160, -66 + sway * 18, 7); s.bend(-160, -66 + sway * 18, -156, -90 + sway * 24, -140 + sway * 12, -94 + sway * 22, 4)
    // Stripes on its back, each its own length and no two the same way apart.
    for (let k = 0; k < CAT_STRIPES.length; k++) { const x = CAT_STRIPES[k]; s.bend(x, -84 + Math.abs(k - 1.5) * 4, x + 4 + noise(k, 62) * 4, -70, x - 2, -62 + noise(k, 63) * 6, 3) }
    // Two front paws under the loaf, each a low mound of its own width.
    for (const [x, wide, high] of CAT_PAWS) s.arc(x, 0, wide, high, PI, PI * 2, 5)
    // The paw that bats.
    const bat = cat.bat
    s.bend(44, -30, 60 + bat * 38, -30 - bat * 30, 56 + bat * 66, -4 - bat * 26, 5)
    s.oval('lines', 58 + bat * 68, -3 - bat * 26, 9, 6)
    hx = 40; hy = -84
  }
  s.push(hx, hy, moving ? 0.1 : Math.sin(t * 0.7) * 0.05)
  const perk = 1 + cat.ear * 0.5 + now(t, 5.2, 0.3, 2) * 0.3
  s.oval('hide', 0, 0, 58, 46)
  s.arc(0, 0, 58, 46, -PI * 0.14, PI * 1.14, 14)
  s.shape('hide', [-52, -22, -46, -36 - 22 * perk, -14, -42]); s.shape('hide', [52, -22, 46, -36 - 22 * perk, 14, -42])
  s.line([-54, -18, -46, -36 - 22 * perk, -14, -44]); s.line([54, -18, 46, -36 - 22 * perk, 14, -44]); s.bend(-14, -44, 0, -48, 14, -44, 3)
  // Its eyes go where the finger is, a little crossed.
  const far = Math.hypot(cat.lookX - cat.x, cat.lookY - (CAT_GROUND - 80)) || 1
  const gx = (((cat.lookX - cat.x) * facing) / far) * 8, gy = ((cat.lookY - (CAT_GROUND - 80)) / far) * 8
  const lid = blink(t, 4.3, 1)
  eye(s, -22, -6, 17, 18, lid, gx + 3, gy, 9)
  eye(s, 22, -6, 17, 18, lid, gx - 3, gy, 9)
  s.shape('lines', [-5, 14, 5, 14, 0, 20, -5, 14])
  s.bend(0, 20, -7, 30, -15, 25, 3); s.bend(0, 20, 7, 30, 15, 25, 3)
  for (let k = 0; k < 3; k++) {
    const long = 26 + 12 * (0.5 + 0.5 * noise(k, 61)), rise = (k - 1) * 9
    s.line([32, 20 + rise * 0.3, 32 + long, 18 + rise]); s.line([-32, 20 + rise * 0.3, -32 - long * 0.9, 19 + rise])
  }
  s.pop()
  s.pop()
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Where the sheet lies when it is rolled this far, 0 flat to 1 a tube: the box it is drawn in, and the box a finger finds it in. */
export function liesAt(rolled: number): Box {
  const e = rolled * rolled * (3 - 2 * rolled)
  const cx = lerp((SHEET.left + SHEET.right) / 2, (ROLLED.left + ROLLED.right) / 2, e), half = lerp((SHEET.right - SHEET.left) / 2, (ROLLED.right - ROLLED.left) / 2, e)
  return { left: cx - half, right: cx + half, top: lerp(SHEET.top, ROLLED.top + 14, e), bottom: lerp(SHEET.bottom, ROLLED.bottom - 12, e) }
}
/** The candle's shape round its own middle, wick and all. */
export const CANDLE_SHAPE: Box = { left: -20, top: -48, right: 20, bottom: 50 }
const middleX = (b: Box) => (b.left + b.right) / 2
const middleY = (b: Box) => (b.top + b.bottom) / 2

export class RoomView {
  /** Stamps, strokes and fills of the last frame. */
  draws = 0
  fullStamps = 0
  private readonly pen: Pen
  private still: Surface | null = null
  private ratio = 1
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private rainbow: CanvasGradient | string = RAINBOW[0]
  private papers: Record<Paper, CanvasGradient | string> = { red: PAPER_COLOURS.red[0], blue: PAPER_COLOURS.blue[0], yellow: PAPER_COLOURS.yellow[0] }
  private readonly cat = new Sketch()
  private readonly hand: HandPose = { travel: 0, press: 0, opacity: 0 }
  /** The sheet as it lies now, flat or part rolled: a box, and how far it is a tube. */
  private readonly lies = { left: 0, top: 0, right: 0, bottom: 0, tube: 0 }

  constructor(canvas: Surface, private readonly make: () => Surface = () => document.createElement('canvas')) {
    this.pen = canvas.getContext('2d')!
  }

  resize(width: number, height: number, ratio: number, tier: Tier): void {
    this.ratio = ratio
    this.by = fit(width, height)
    if (this.by.scale <= 0) return
    const pen = this.pen
    this.rainbow = band(pen, RAINBOW, 2)
    for (const paper of PAPERS) this.papers[paper] = band(pen, PAPER_COLOURS[paper], 1)
    const room = new Sketch()
    room.wobble = 1.7
    paintRoom(room)
    const surface = this.make()
    surface.width = Math.round(width * ratio); surface.height = Math.round(height * ratio)
    const layer = surface.getContext('2d')!
    layer.setTransform(1, 0, 0, 1, 0, 0)
    layer.fillStyle = WAX
    layer.fillRect(0, 0, surface.width, surface.height)
    this.place(layer)
    if (tier.grain) dust(layer)
    layer.lineCap = 'round'; layer.lineJoin = 'round'
    layer.fillStyle = WAX
    layer.beginPath(); trace(layer, room.hide, true); layer.fill()
    layer.strokeStyle = this.rainbow
    layer.lineWidth = LINE - 0.3
    layer.beginPath(); trace(layer, room.lines, false); layer.stroke()
    layer.globalAlpha = 0.5
    layer.lineWidth = 1.3
    layer.translate(1.7, 1.2)
    layer.beginPath(); trace(layer, room.lines, false); layer.stroke()
    layer.translate(-1.7, -1.2)
    if (tier.grain) {
      layer.globalAlpha = 0.75
      layer.lineWidth = 2
      layer.beginPath(); crumble(layer, room.lines); layer.stroke()
    }
    layer.globalAlpha = 1
    // The table top: the one place in the room where the wax is scraped clear.
    layer.fillStyle = TABLE_TOP
    layer.beginPath()
    for (let i = 0; i < TOP_SHAPE.length; i += 2) { if (i === 0) layer.moveTo(TOP_SHAPE[i], TOP_SHAPE[i + 1]); else layer.lineTo(TOP_SHAPE[i], TOP_SHAPE[i + 1]) }
    layer.closePath()
    layer.fill()
    layer.strokeStyle = WAX
    layer.lineWidth = LINE
    layer.stroke()
    if (tier.grain) {
      // The grain of the board: a few long faint strokes, none level with another.
      layer.globalAlpha = 0.12
      layer.lineWidth = 2
      layer.beginPath()
      for (let k = 0; k < 9; k++) {
        const y = TOP.top + 30 + k * 42 + noise(k, 31) * 12, x = TOP.left + 40 + (0.5 + 0.5 * noise(k, 32)) * 300
        layer.moveTo(x, y); layer.quadraticCurveTo(x + 150, y + noise(k, 33) * 10, x + 260 + noise(k, 34) * 120, y + noise(k, 35) * 6)
      }
      layer.stroke()
      layer.globalAlpha = 1
    }
    this.still = surface
  }

  private place(pen: Pen): void {
    const k = this.ratio * this.by.scale
    pen.setTransform(k, 0, 0, k, this.ratio * this.by.x, this.ratio * this.by.y)
  }

  /** A point of the sheet, in hundredths, where the sheet lies now. */
  private sx(x: number): number { return lerp(this.lies.left, this.lies.right, x / 100) }
  private sy(y: number): number { return lerp(this.lies.top, this.lies.bottom, y / 100) }

  private outline(window: SheetWindow, grow: number): void {
    const pen = this.pen, o = window.outline
    let mx = 0, my = 0
    for (let i = 0; i < o.length; i += 2) { mx += o[i]; my += o[i + 1] }
    mx /= o.length / 2; my /= o.length / 2
    for (let i = 0; i < o.length; i += 2) {
      const x = this.sx(mx + (o[i] - mx) * grow), y = this.sy(my + (o[i + 1] - my) * grow)
      if (i === 0) pen.moveTo(x, y); else pen.lineTo(x, y)
    }
    pen.closePath()
  }

  private slab(x: number, y: number, w: number, h: number, turn: number): void {
    const pen = this.pen, cos = Math.cos(turn), sin = Math.sin(turn)
    const corner = (dx: number, dy: number, first: boolean) => {
      const px = x + dx * cos - dy * sin, py = y + dx * sin + dy * cos
      if (first) pen.moveTo(px, py); else pen.lineTo(px, py)
    }
    corner(-w / 2, -h / 2, true); corner(w / 2, -h / 2, false); corner(w / 2, h / 2, false); corner(-w / 2, h / 2, false)
    pen.closePath()
  }

  private candleShape(x: number, y: number): void {
    const pen = this.pen
    pen.moveTo(x - 20, y + 50); pen.lineTo(x - 18, y - 30); pen.quadraticCurveTo(x, y - 40, x + 18, y - 30); pen.lineTo(x + 20, y + 50)
    pen.closePath()
  }

  /** Draws the table as it stands at `time` seconds of play. What it cost is in `draws`. */
  draw(table: Table, show: RoomShow, guidance: Guidance | null, aim: Aim | null, time: number): void {
    const pen = this.pen
    this.draws = 0
    this.fullStamps = 0
    if (this.by.scale <= 0 || !this.still) return
    pen.setTransform(1, 0, 0, 1, 0, 0)
    pen.globalAlpha = 1
    pen.drawImage(this.still, 0, 0)
    this.draws++; this.fullStamps++
    this.place(pen)
    pen.lineCap = 'round'; pen.lineJoin = 'round'
    if (show.door > 0.01) this.door(show.door)

    // The cat, under the table.
    this.cat.clear()
    this.cat.boil = Math.floor(time * 6)
    drawCat(this.cat, table, time)
    this.scrapeCat()

    const hand = table.hand
    const inside = table.made === 'candle' || table.made === 'lit' || (table.held && table.rolled > 0.5)
    // The sheet that was in hand, sliding off to the cat.
    if (table.gone.along < 1) {
      const a = table.gone.along
      pen.globalAlpha = 1 - Math.max(0, a - 0.7) / 0.3
      pen.fillStyle = WHITE
      pen.strokeStyle = WAX
      pen.lineWidth = LINE - 0.8
      pen.beginPath(); this.slab(middleX(SHEET) - a * 520, middleY(SHEET) + a * a * 420, SHEET.right - SHEET.left, SHEET.bottom - SHEET.top, -a * 0.8)
      pen.fill(); pen.stroke()
      this.draws += 2
      pen.globalAlpha = 1
    }
    if (inside) {
      pen.fillStyle = CANDLE
      pen.beginPath(); this.candleShape(table.candle.x, table.candle.y); pen.fill()
      this.draws++
    }
    this.sheet(table, time)

    // The pieces at rest, each one flat colour, and one stroke for all their edges.
    pen.strokeStyle = WAX
    pen.lineWidth = LINE - 0.8
    const edges: (() => void)[] = []
    if (table.papersOut) {
      for (const paper of PAPERS) {
        let x = middleX(PAPER_RESTS[paper]), y = middleY(PAPER_RESTS[paper]), turn = (PAPERS.indexOf(paper) - 1) * 0.03
        if (hand?.kind === 'paper' && hand.paper === paper) continue
        if (table.back.along < 1 && table.back.paper === paper) { x = lerp(table.back.x, x, table.back.along); y = lerp(table.back.y, y, table.back.along); turn += (1 - table.back.along) * 0.5 }
        const shape = () => this.slab(x, y, 140, 84, turn)
        pen.fillStyle = this.papers[paper]
        pen.beginPath(); shape(); pen.fill()
        this.draws++
        edges.push(shape)
      }
    }
    if (table.made === 'flat') {
      const pile = () => { for (let k = 0; k < 3; k++) this.slab(middleX(PILE) + (k - 1) * 5, middleY(PILE) + (1 - k) * 5, 132 - k * 3, 68, (k - 1) * 0.05) }
      pen.fillStyle = WHITE
      pen.beginPath(); pile(); pen.fill()
      this.draws++
      edges.push(pile)
    }
    if (!inside) {
      // Picked up, it hops under the finger.
      const cy = table.candle.y - table.hop * 10
      const shape = () => { this.candleShape(table.candle.x, cy); pen.moveTo(table.candle.x, cy - 36); pen.lineTo(table.candle.x + 2, cy - 48) }
      pen.fillStyle = CANDLE
      pen.beginPath(); shape(); pen.fill()
      this.draws++
      edges.push(shape)
    }
    pen.beginPath()
    for (const edge of edges) edge()
    pen.stroke()
    this.draws++
    this.scissors(table)

    // What is in the hand lies on top of everything.
    if (hand && (hand.kind === 'paper' || hand.kind === 'fresh')) {
      pen.fillStyle = hand.kind === 'paper' ? this.papers[hand.paper] : WHITE
      pen.beginPath(); this.slab(hand.x, hand.y, hand.kind === 'paper' ? 140 : 132, hand.kind === 'paper' ? 84 : 92, -0.08)
      pen.fill(); pen.stroke()
      this.draws += 2
    }
    else if (table.freshBack.along < 1) {
      // A fresh sheet let go short of the sheet's place slides back onto the pile.
      const back = table.freshBack, a = back.along
      pen.fillStyle = WHITE
      pen.beginPath(); this.slab(lerp(back.x, (PILE.left + PILE.right) / 2, a), lerp(back.y, (PILE.top + PILE.bottom) / 2, a), 132, 92, -0.08 * (1 - a))
      pen.fill(); pen.stroke()
      this.draws += 2
    }
    this.scraps(table)

    if (table.knock.pulse > 0.01) {
      // A knock on a bare place: a few ticks jump out from under the finger.
      const k = table.knock, out = (1 - k.pulse) * 26 + 12
      const onTop = k.x > TOP.left && k.x < TOP.right && k.y > TOP.top && k.y < TOP.bottom
      pen.globalAlpha = k.pulse
      pen.strokeStyle = onTop ? WAX : this.rainbow
      pen.lineWidth = LINE
      pen.beginPath()
      for (let i = 0; i < 5; i++) {
        const angle = i * 1.3 + noise(i, 21) * 0.4, long = 8 + 6 * (0.5 + 0.5 * noise(i, 22))
        pen.moveTo(k.x + Math.cos(angle) * out, k.y + Math.sin(angle) * out)
        pen.lineTo(k.x + Math.cos(angle) * (out + long), k.y + Math.sin(angle) * (out + long))
      }
      pen.stroke()
      this.draws++
      pen.globalAlpha = 1
    }
    if (show.smoke > 0.01 && show.smoke < 1) {
      // The curl of smoke from the pinched wick.
      const rise = show.smoke * 150
      pen.globalAlpha = 1 - show.smoke
      pen.strokeStyle = this.rainbow
      pen.lineWidth = LINE
      pen.beginPath()
      pen.moveTo(WICK.x, this.lies.top - 4)
      for (let i = 1; i <= 10; i++) pen.lineTo(WICK.x + Math.sin(i * 0.9 + time * 3) * (4 + i * 2.2), this.lies.top - 4 - (rise * i) / 10)
      pen.stroke()
      this.draws++
      pen.globalAlpha = 1
    }
    if (show.dim > 0.01) {
      // The room darkens round the lantern: wax comes back over everything but a rough round of it.
      const cx = middleX(ROLLED), cy = middleY(ROLLED) - 30
      pen.globalAlpha = show.dim * 0.86
      pen.fillStyle = WAX
      pen.beginPath()
      pen.rect(PAST.left, PAST.top, PAST.right - PAST.left, PAST.bottom - PAST.top)
      for (let i = 0; i <= 18; i++) {
        const angle = -(i / 18) * PI * 2, r = 196 + noise(i % 18, 23) * 9
        if (i === 0) pen.moveTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 1.08); else pen.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 1.08)
      }
      pen.closePath()
      pen.fill('evenodd')
      this.draws++
      pen.globalAlpha = 1
    }
    if (guidance && aim) {
      const onTop = middleX(aim.glow) > TOP.left && middleX(aim.glow) < TOP.right && middleY(aim.glow) > TOP.top && middleY(aim.glow) < TOP.bottom
      this.draws += drawGuide(pen, guidance, aim, time, onTop ? WAX : this.rainbow, this.hand)
    }
  }

  private scrapeCat(): void {
    const pen = this.pen, s = this.cat
    pen.fillStyle = WAX
    pen.beginPath(); trace(pen, s.hide, true); pen.fill()
    pen.strokeStyle = this.rainbow
    pen.lineWidth = LINE
    pen.beginPath(); trace(pen, s.lines, false); pen.stroke()
    pen.fillStyle = this.rainbow
    pen.beginPath(); trace(pen, s.whites, true); pen.fill()
    pen.fillStyle = WAX
    pen.beginPath(); trace(pen, s.pupils, true); pen.fill()
    this.draws += 4
  }

  /** The door standing open on the night. Two draws. */
  private door(open: number): void {
    const pen = this.pen
    const wide = 20 + open * 150
    pen.fillStyle = WAX
    pen.beginPath()
    pen.moveTo(1082, 800); pen.lineTo(1084, 100); pen.lineTo(1084 + wide, 100 - open * 8); pen.lineTo(1084 + wide, 800)
    pen.closePath()
    pen.fill()
    pen.strokeStyle = this.rainbow
    pen.lineWidth = LINE
    pen.beginPath()
    pen.moveTo(1084 + wide, 800); pen.lineTo(1084 + wide, 100 - open * 8)
    // A trunk and a tuft of the wood outside.
    pen.moveTo(1094 + wide * 0.3, 100); pen.quadraticCurveTo(1100 + wide * 0.36, 440, 1090 + wide * 0.3, 800)
    pen.moveTo(1090 + wide * 0.6, 800); pen.lineTo(1096 + wide * 0.62, 772); pen.moveTo(1098 + wide * 0.7, 800); pen.lineTo(1108 + wide * 0.72, 760)
    pen.stroke()
    this.draws += 2
  }

  /** The sheet: flat, rolling under the finger, or standing as the lantern. */
  private sheet(table: Table, time: number): void {
    const pen = this.pen, lies = this.lies
    const r = table.rolled, e = r * r * (3 - 2 * r)
    const land = 1 + table.landing * 0.05
    const at = liesAt(r), cx = (at.left + at.right) / 2, half = ((at.right - at.left) / 2) * land
    const lean = Math.sin(time * 19) * table.wobble * 9
    lies.left = cx - half + lean; lies.right = cx + half + lean
    lies.top = at.top; lies.bottom = at.bottom
    lies.tube = e
    const rim = e * 14
    // Flat, its right edge stands up in a lip: the one part of the sheet that is taken hold of to roll it.
    const lip = LIP * (1 - Math.min(1, r * 4))
    const body = () => {
      pen.moveTo(lies.left, lies.top); pen.lineTo(lies.right, lies.top); pen.lineTo(lies.right - lean, lies.bottom)
      pen.quadraticCurveTo(cx, lies.bottom + rim * 1.8, lies.left - lean, lies.bottom)
      pen.closePath()
      if (lip > 1) {
        pen.moveTo(lies.right, lies.top + 5)
        pen.quadraticCurveTo(lies.right + lip * 1.3, lies.top + 2, lies.right + lip, lies.top + 22)
        pen.lineTo(lies.right + lip, lies.bottom - 22)
        pen.quadraticCurveTo(lies.right + lip * 1.3, lies.bottom - 2, lies.right, lies.bottom - 5)
        pen.closePath()
      }
    }
    pen.fillStyle = WHITE
    pen.beginPath(); body(); pen.fill()
    this.draws++
    const tucked = table.tucked
    const grow = (i: number) => (tucked.window === i ? 1 + tucked.pulse * 0.16 : 1)
    // Holes with nothing behind them show what is behind the sheet: the table, the dark of the tube, or the candle's light.
    let any = false
    pen.beginPath()
    for (let i = 0; i < table.sheet.length; i++) if (table.sheet[i].paper === null) { any = true; this.outline(table.sheet[i], 1) }
    if (any) {
      pen.fillStyle = table.flame > 0.5 ? GLOW : e > 0.5 ? WAX : TABLE_TOP
      pen.fill()
      this.draws++
    }
    for (const paper of PAPERS) {
      any = false
      pen.beginPath()
      for (let i = 0; i < table.sheet.length; i++) if (table.sheet[i].paper === paper) { any = true; this.outline(table.sheet[i], grow(i)) }
      if (!any) continue
      pen.fillStyle = this.papers[paper]
      pen.fill()
      this.draws++
    }
    if (e > 0.3) {
      // The open top of the tube, with the wick in it when the candle is in.
      pen.fillStyle = WAX
      pen.beginPath(); pen.ellipse(cx + lean, lies.top, half, rim, 0, 0, PI * 2); pen.fill()
      this.draws++
    }
    pen.strokeStyle = WAX
    pen.lineWidth = LINE - 0.8
    pen.beginPath()
    body()
    for (let i = 0; i < table.sheet.length; i++) this.outline(table.sheet[i], grow(i))
    const hand = table.hand
    if (hand?.kind === 'cut') {
      // The cut so far, behind the scissors.
      for (let i = 0; i < hand.path.length; i += 2) { if (i === 0) pen.moveTo(this.sx(hand.path[0]), this.sy(hand.path[1])); else pen.lineTo(this.sx(hand.path[i]), this.sy(hand.path[i + 1])) }
    }
    if (table.closing.along < 1) {
      // A ninth cut closing again: what is left of it, shorter and shorter.
      const path = table.closing.path, from = Math.floor((path.length / 2) * table.closing.along) * 2
      for (let i = from; i < path.length; i += 2) { if (i === from) pen.moveTo(this.sx(path[i]), this.sy(path[i + 1])); else pen.lineTo(this.sx(path[i]), this.sy(path[i + 1])) }
    }
    pen.stroke()
    this.draws++
    const inside = table.made === 'candle' || table.made === 'lit' || (table.held && table.rolled > 0.5)
    if (inside && e > 0.3) {
      pen.strokeStyle = CREAM
      pen.lineWidth = LINE
      pen.beginPath(); pen.moveTo(cx + lean, lies.top + 9); pen.lineTo(cx + lean + 1, lies.top - 5); pen.stroke()
      this.draws++
      if (table.flame > 0.01) {
        const lick = table.flame * (1 + noise(Math.floor(time * 14), 77) * 0.12), bend = noise(Math.floor(time * 9), 78) * 4
        pen.fillStyle = GLOW
        pen.beginPath()
        pen.moveTo(cx + lean - 10 * lick, lies.top - 6); pen.quadraticCurveTo(cx + lean - 13 * lick, lies.top - 28 * lick, cx + lean + bend, lies.top - 6 - 46 * lick)
        pen.quadraticCurveTo(cx + lean + 13 * lick, lies.top - 28 * lick, cx + lean + 10 * lick, lies.top - 6)
        pen.closePath()
        pen.fill()
        pen.strokeStyle = WAX
        pen.lineWidth = LINE - 0.8
        pen.stroke()
        this.draws += 2
      }
    }
  }

  /** The scissors: two blades and two loops in one flat colour, at the finger while it cuts. */
  private scissors(table: Table): void {
    const pen = this.pen, sc = table.scissors
    const gape = 0.1 + sc.open * 0.42
    pen.fillStyle = SCISSORS
    pen.strokeStyle = SCISSORS
    pen.lineWidth = 8
    pen.beginPath()
    for (const side of [-1, 1]) {
      const a = sc.turn + side * gape, cos = Math.cos(a), sin = Math.sin(a)
      // A blade forward of the pivot.
      pen.moveTo(sc.x - sin * 8 * side, sc.y + cos * 8 * side)
      pen.lineTo(sc.x + cos * 66, sc.y + sin * 66)
      pen.lineTo(sc.x + sin * 6 * side, sc.y - cos * 6 * side)
      pen.closePath()
    }
    pen.fill()
    pen.beginPath()
    for (const side of [-1, 1]) {
      const a = sc.turn + PI - side * (gape + 0.34), cos = Math.cos(a), sin = Math.sin(a)
      pen.moveTo(sc.x, sc.y); pen.lineTo(sc.x + cos * 26, sc.y + sin * 26)
      pen.moveTo(sc.x + cos * 62, sc.y + sin * 62)
      pen.ellipse(sc.x + cos * 44, sc.y + sin * 44, 18, 13, a, 0, PI * 2)
    }
    pen.stroke()
    this.draws += 2
  }

  /** The scraps: on their way down, and where the cat left them. */
  private scraps(table: Table): void {
    if (table.scraps.length === 0) return
    const pen = this.pen
    pen.fillStyle = WHITE
    pen.strokeStyle = WAX
    pen.lineWidth = LINE - 1.3
    pen.beginPath()
    for (const scrap of table.scraps) {
      const cos = Math.cos(scrap.spin), sin = Math.sin(scrap.spin), o = scrap.outline
      for (let i = 0; i < o.length; i += 2) {
        const x = scrap.x + o[i] * cos - o[i + 1] * sin, y = scrap.y + o[i] * sin + o[i + 1] * cos
        if (i === 0) pen.moveTo(x, y); else pen.lineTo(x, y)
      }
      pen.closePath()
    }
    pen.fill(); pen.stroke()
    this.draws += 2
  }
}
