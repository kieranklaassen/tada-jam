import { ant, dog, pelican, shrew } from './figures'
import { BLUE, BOARD, BOARD_EDGE, FLESH, INK, PAPER, RED, RIND, Screens, TINT, WHITE, YELLOW, burst, inked, panel, poly, rect, slab, speedLines } from './look'
import { RAIL, WHOLE, type Fruit, type Share } from './measure'
import { tinParts, wanted, type Customer } from './orders'
import { spikeScene, type SpikeScene } from './spikeScene'
import { drawFraction } from './symbols'
import { SHELF, inTin, onLane, onShelf, type Piece } from './world'

// The look spike: the game's real scene in comic-book halftone, painted once
// as a still. Nothing here moves or answers a touch; the toy replaces it. The
// scene is laid out in design units on a page of 1180 by 820 and scaled to
// whatever surface it is given, so no pixel geometry is fixed.

export const PAGE = { width: 1180, height: 820 } as const
/** Design units a point of length takes: the rail, 2880 points, is 864 across. */
const PX = 0.3
/** The left edge every length on the counter starts from. */
const X0 = 96
const LANE_Y = [566, 494] as const
const TIN_Y = 372
const SHELF_Y = 648

type Ctx = CanvasRenderingContext2D

/** The dog as the still shows it: looking up at the board, tongue out. */
const STILL_DOG = { lift: 0, tilt: 0, earLeft: 0, earRight: 0, eyeX: 0, eyeY: -0.7, lids: 0, jaw: 0.2, tongue: 0.6, cheeks: 0, spin: 0, sniff: 0, tail: 0 }

/** A fruit or a piece of one: a flat colour, square ends and a thin darker line. Nothing else is ever drawn on it. */
function bar(ctx: Ctx, fruit: Fruit, x: number, y: number, length: number, height: number): void {
  ctx.fillStyle = FLESH[fruit]
  ctx.fillRect(x, y, length * PX, height)
  ctx.lineWidth = 3
  ctx.strokeStyle = RIND[fruit]
  ctx.strokeRect(x + 1.5, y + 1.5, length * PX - 3, height - 3)
}

/** A ticket: a card with a small strip of the fruit, the ordered share filled in, and the fraction laid over that share. */
function ticket(ctx: Ctx, customer: Customer, x: number, y: number, s: number): void {
  const longest = Math.max(...customer.shares.map((share) => Math.max(1, share.num / share.den)))
  const whole = (WHOLE[customer.fruit] / WHOLE.long) * 190 * s
  const rows = customer.shares.length
  const w = whole * longest + 56 * s, h = (customer.written ? 124 : 70) * s * rows + 16 * s
  ctx.fillStyle = INK
  ctx.fillRect(x + 5, y + 5, w, h)
  inked(ctx, rect(x, y, w, h), WHITE, 4)
  customer.shares.forEach((share: Share, row) => {
    const left = x + 28 * s, top = y + (customer.written ? 86 : 30) * s + row * 124 * s, tall = 30 * s
    const filled = (whole * share.num) / share.den
    ctx.fillStyle = WHITE
    ctx.fillRect(left, top, whole * longest, tall)
    ctx.fillStyle = FLESH[customer.fruit]
    ctx.fillRect(left, top, filled, tall)
    ctx.lineWidth = 3 * s
    ctx.strokeStyle = INK
    ctx.strokeRect(left, top, whole, tall)
    if (customer.lined) {
      ctx.beginPath()
      for (let part = 1; part < share.den; part++) {
        ctx.moveTo(left + (whole * part) / share.den, top)
        ctx.lineTo(left + (whole * part) / share.den, top + tall)
      }
      ctx.lineWidth = 2 * s
      ctx.stroke()
    }
    if (customer.written) {
      // A bracket over the filled share, and the fraction on the bracket: the symbol names that length.
      ctx.beginPath()
      ctx.moveTo(left, top - 6 * s)
      ctx.lineTo(left, top - 14 * s)
      ctx.lineTo(left + filled, top - 14 * s)
      ctx.lineTo(left + filled, top - 6 * s)
      ctx.lineWidth = 3 * s
      ctx.stroke()
      drawFraction(ctx, share, left + filled / 2, top - 50 * s, 30 * s, { fill: INK })
    }
  })
}

/** The open tin with what lies in it, its lid standing behind it, and the whole ruled into its parts on the rail under it. */
function tin(ctx: Ctx, screens: Screens, scene: SpikeScene): void {
  const customer = scene.window, share = wanted(customer)
  const ordered = tinParts(customer).reduce((sum, part) => sum + part, 0) * PX
  // The lid, open, as long as the tin, with the fraction on it.
  inked(ctx, poly([[X0 - 8, TIN_Y], [X0 + 10, TIN_Y - 62], [X0 + ordered + 26, TIN_Y - 62], [X0 + ordered + 8, TIN_Y]]), '#c9d6e6', 5, screens.of(ctx, BLUE, 0.3))
  if (customer.written) drawFraction(ctx, share, X0 + ordered / 2 + 9, TIN_Y - 31, 25, { fill: INK, edge: WHITE, edgeWidth: 6 })
  // The body, and the sprung jaw at its end.
  inked(ctx, rect(X0 - 8, TIN_Y, ordered + 16, 64), '#eef3f8', 5)
  let x = X0
  for (const piece of inTin(scene.world, 0)) {
    bar(ctx, piece.fruit, x, TIN_Y + 8, piece.length, 48)
    x += piece.length * PX
  }
  // The jaw: a thick wall where the order ends.
  ctx.fillStyle = INK
  ctx.fillRect(X0 + ordered - 3, TIN_Y + 8, 6, 48)
  // The gap between the piece's loose end and the jaw is left bare: marks of motion stacked there would read as a sign just where
  // the piece is held against the order.
  // The rail: the whole fruit ruled into its equal parts, the ordered ones in the fruit's tint.
  const whole = WHOLE[customer.fruit] * PX, top = TIN_Y + 70
  ctx.fillStyle = WHITE
  ctx.fillRect(X0, top, whole, 22)
  ctx.fillStyle = TINT[customer.fruit]
  ctx.fillRect(X0, top, ordered, 22)
  ctx.lineWidth = 3
  ctx.strokeRect(X0, top, whole, 22)
  ctx.beginPath()
  for (let part = 1; part < share.den; part++) {
    ctx.moveTo(X0 + (whole * part) / share.den, top - 4)
    ctx.lineTo(X0 + (whole * part) / share.den, top + 26)
  }
  ctx.stroke()
}

/** The counter: the tin on its rail, the board with its two lanes, the shelf, the crate, the roller and the dog. */
function counter(ctx: Ctx, screens: Screens, scene: SpikeScene): void {
  panel(ctx, 18, 296, 1144, 506, PAPER, screens.of(ctx, YELLOW, 0.22))
  tin(ctx, screens, scene)
  // The board: a plain pale slab, with a hard shadow, and nothing on it but fruit.
  ctx.fillStyle = INK
  ctx.fillRect(X0 - 10, 484, RAIL * PX + 32, 144)
  inked(ctx, rect(X0 - 16, 478, RAIL * PX + 32, 144), BOARD, 5)
  ctx.fillStyle = BOARD_EDGE
  ctx.fillRect(X0 - 14, 554, RAIL * PX + 28, 3)
  const drawOn = (piece: Piece, y: number, height: number, x: number) => bar(ctx, piece.fruit, X0 + x * PX, y, piece.length, height)
  for (const lane of [1, 0]) for (const piece of onLane(scene.world, lane)) drawOn(piece, LANE_Y[lane], 48, piece.place.on === 'board' ? piece.place.x : 0)
  // Where the last stroke fell: the burst, the drops and the lines the blade left.
  const cutX = X0 + scene.cutAt * PX
  // They stay clear of the cut end itself, which is the thing to be read.
  speedLines(ctx, cutX - 44, LANE_Y[0] - 70, Math.PI / 2 - 0.5, 0.5, 0, 74, 4)
  burst(ctx, cutX - 40, LANE_Y[0] + 2, 13, 30, 9, 3, WHITE, 4)
  burst(ctx, cutX - 40, LANE_Y[0] + 2, 6, 15, 7, 5, FLESH[scene.window.fruit], 3)
  for (const [dx, dy, r] of [[-86, -22, 8], [-98, 26, 5], [-64, 44, 6], [-30, -50, 5]] as const) inked(ctx, (c) => c.arc(cutX + dx, LANE_Y[0] + dy, r, 0, Math.PI * 2), FLESH[scene.window.fruit], 3)
  // The shelf: leftovers, one to a row, all from the same left edge.
  inked(ctx, rect(X0 - 16, SHELF_Y - 6, RAIL * PX + 32, SHELF * 36 + 8), BOARD, 5)
  const kept = onShelf(scene.world)
  for (let row = 0; row < SHELF; row++) {
    ctx.fillStyle = BOARD_EDGE
    if (row < SHELF - 1) ctx.fillRect(X0 - 14, SHELF_Y + row * 36 + 32, RAIL * PX + 28, 3)
    if (kept[row]) bar(ctx, kept[row].fruit, X0, SHELF_Y + row * 36, kept[row].length, 30)
  }
  // The roller on its hook, a tool that looks like a tool.
  ctx.lineWidth = 5
  ctx.strokeStyle = INK
  // It hangs on two cords, each a run of dashes: no upright here meets a crossbar.
  ctx.fillStyle = INK
  for (const cord of [1040, 1100]) for (let dash = 0; dash < 5; dash++) ctx.fillRect(cord - 2.5, 316 + dash * 14, 5, 9)
  inked(ctx, slab(1018, 384, 104, 44, 10), WHITE, 5, screens.of(ctx, BLUE, 0.4))
  // A dark cap at each end, and no ridges across it.
  inked(ctx, slab(1018, 384, 14, 44, 6), INK, 0)
  inked(ctx, slab(1108, 384, 14, 44, 6), INK, 0)
  // The crate of fresh fruit: slats, and the ends of three fruits showing.
  inked(ctx, rect(1000, 478, 140, 144), '#d9a441', 5, screens.of(ctx, RED, 0.3))
  ;(['long', 'middle', 'short'] as const).forEach((fruit, i) => {
    ctx.fillStyle = FLESH[fruit]
    ctx.fillRect(1014 + i * 40, 462, 32, 40)
    ctx.lineWidth = 3
    ctx.strokeStyle = RIND[fruit]
    ctx.strokeRect(1015.5 + i * 40, 463.5, 29, 37)
  })
  ctx.strokeStyle = INK
  for (const y of [502, 542, 582]) inked(ctx, rect(1000, y, 140, 40), null, 4)
  dog(ctx, screens, 1070, 664, 0.95, STILL_DOG)
}

/** The window, where the customer being served stands with its ticket. */
function windowPanel(ctx: Ctx, screens: Screens, scene: SpikeScene): void {
  panel(ctx, 18, 18, 770, 262, PAPER, screens.of(ctx, BLUE, 0.2))
  // The awning: scallops of red and white along the top.
  for (let i = 0; i < 11; i++) inked(ctx, (c) => { c.moveTo(18 + i * 70, 18); c.lineTo(88 + i * 70, 18); c.lineTo(88 + i * 70, 30); c.ellipse(53 + i * 70, 30, 35, 24, 0, 0, Math.PI); c.closePath() }, i % 2 ? WHITE : RED, 4)
  // Juice on the wall from the last stroke.
  burst(ctx, 716, 206, 12, 34, 8, 7, FLESH[scene.window.fruit], 3)
  pelican(ctx, screens, 128, 196, 0.54, 0.25)
  ticket(ctx, scene.window, 372, 104, 1.15)
}

/** The queue: the two who wait, each with its ticket showing, doing nothing about it. */
function queuePanel(ctx: Ctx, screens: Screens, scene: SpikeScene): void {
  panel(ctx, 806, 18, 356, 262, PAPER, screens.of(ctx, YELLOW, 0.45))
  ticket(ctx, scene.queue[0], 818, 30, 0.6)
  ticket(ctx, scene.queue[1], 1006, 30, 0.6)
  shrew(ctx, screens, 850, 208, 0.6, 1, '#9aa6b8')
  shrew(ctx, screens, 968, 208, 0.6, -1, '#9aa6b8')
  for (let i = 0; i < 3; i++) ant(ctx, 1042 + i * 42, 240, 0.46, i === 1 ? 0.35 : 0)
}

/** Paints the whole still onto a surface of any size, the page scaled to fit and centred. Returns how many figures it drew. */
export function paintSpike(ctx: Ctx, width: number, height: number, scene: SpikeScene = spikeScene()): number {
  const k = Math.min(width / PAGE.width, height / PAGE.height)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = PAPER
  ctx.fillRect(0, 0, width, height)
  // Whole device pixels, so the dot screens and the panel borders stay crisp.
  ctx.setTransform(k, 0, 0, k, Math.round((width - PAGE.width * k) / 2), Math.round((height - PAGE.height * k) / 2))
  const screens = new Screens(k)
  windowPanel(ctx, screens, scene)
  queuePanel(ctx, screens, scene)
  counter(ctx, screens, scene)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return 1
}

/**
 * The still, kept: painted once for a size of surface and copied to it on every frame after, which is one draw.
 * The Mount owns the canvas and its size; this only fills it.
 */
export class SpikePlate {
  private plate: HTMLCanvasElement | null = null
  private key = ''

  /** Draws the still on the canvas as it is sized now. Returns the draws it made. */
  draw(canvas: HTMLCanvasElement): number {
    const ctx = canvas.getContext('2d')
    if (!ctx || canvas.width <= 0 || canvas.height <= 0) return 0
    const key = `${canvas.width}x${canvas.height}`
    if (!this.plate || this.key !== key) {
      const plate = document.createElement('canvas')
      plate.width = canvas.width
      plate.height = canvas.height
      const to = plate.getContext('2d')
      if (!to) return 0
      paintSpike(to, plate.width, plate.height)
      this.plate = plate
      this.key = key
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.drawImage(this.plate, 0, 0)
    return 1
  }
}
