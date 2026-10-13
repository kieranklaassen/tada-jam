import { BOARD, type Colour } from './board'
import { BULBS, BUTTONS, BUTTON_CORNER, BUTTON_HALF, CRADLE, ECHO_LINE, HANDLE, LEVER, RAILS, SPEAKER, VALVE, WELL, handPlace, keyMarks, wellMouth } from './layout'
import { INK, pegCap, ring, still, type Ctx } from './pen'
import { makeRng } from './rng'

// The still layer: the inside of an old arcade cabinet at night, drawn once
// as thin lines on black from edge to edge of whatever surface it is given,
// wide or tall. A floor grid running off to a far point, walls of circuit
// traces and cables, the marquee's lamps, a web in the top left, the tray and
// its five wells, the three keys, the lever's slot, the loudspeaker and the
// valve. Above the marquee the cabinet goes on up: hanging lamps on cords and
// more wiring. The setting is dimmer than anything that answers a touch, and
// the board itself stays bare black.
//
// Nothing here is a row of equal marks or a lone ring: the lamps differ in
// size and height, the traces end in unequal blobs, the loudspeaker's cone is
// seen from a little to one side.
//
// The transform is already set to stage units. The painted look draws from a
// stream of its own with a fixed seed, so the cabinet is the same on every visit.

const LEFT = -520, RIGHT = 1700, TOP = -470, BOTTOM = 1300

function line(ctx: Ctx, points: readonly (readonly [number, number])[]): void {
  ctx.moveTo(points[0][0], points[0][1])
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1])
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function floor(ctx: Ctx): void {
  const horizon = 590, far = { x: 590, y: 452 }
  ctx.save()
  ctx.beginPath()
  ctx.rect(LEFT, horizon, RIGHT - LEFT, BOTTOM - horizon)
  ctx.clip()
  ctx.beginPath()
  for (let x = -6200; x <= 7400; x += 105) line(ctx, [[far.x, far.y], [far.x + (x - far.x) * 2.3, far.y + (830 - far.y) * 2.3]])
  for (let k = 0; k <= 16; k++) {
    const y = horizon + 232 * (k / 8) ** 1.9
    line(ctx, [[LEFT, y], [RIGHT, y]])
  }
  still(ctx, INK.grid, 1.3, 0.75)
  ctx.restore()
}

/** Circuit traces down a wall: runs of line with 45 degree jogs, each ending in a blob of solder, no two the same size. */
function traces(ctx: Ctx, left: number, right: number, top: number, bottom: number, count: number, seed: number): void {
  const chance = makeRng(seed)
  const blobs: [number, number, number][] = []
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    let x = left + ((i + 0.5) / count) * (right - left), y = top + chance.next() * 30
    const end = bottom - 12 - chance.next() * 46
    ctx.moveTo(x, y)
    while (y < end - 30) {
      y += 30 + chance.next() * 70
      ctx.lineTo(x, Math.min(y, end))
      const jog = (chance.next() < 0.5 ? -1 : 1) * (10 + chance.next() * 14)
      if (x + jog > left + 4 && x + jog < right - 4 && y < end - 50) {
        x += jog
        y += Math.abs(jog)
        ctx.lineTo(x, y)
      }
    }
    blobs.push([x, Math.min(y, end), 2.5 + chance.next() * 4])
  }
  still(ctx, INK.far, 1.4, 0.9)
  ctx.beginPath()
  for (const [x, y, r] of blobs) ring(ctx, x, y, r)
  ctx.fillStyle = INK.far
  ctx.fill()
}

/** One lamp of the marquee: a glass bulb hanging from its socket. The lit middle is drawn live. */
function lamp(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.moveTo(x - r * 0.45, y - r * 1.25)
  ctx.lineTo(x + r * 0.45, y - r * 1.25)
  ctx.lineTo(x + r * 0.5, y - r * 0.8)
  ctx.arc(x, y, r, -1.05, Math.PI + 1.05)
  ctx.closePath()
}

function marquee(ctx: Ctx): void {
  ctx.beginPath()
  // The upper rail stops either side of the middle and hangs a cradle there, a half ring that passes under the
  // jam's home control and clear of it at every surface size. The lower rail runs straight on beneath.
  line(ctx, [[LEFT, RAILS.top], [CRADLE.x - CRADLE.r, RAILS.top], [CRADLE.x - CRADLE.r, CRADLE.y]])
  ctx.arc(CRADLE.x, CRADLE.y, CRADLE.r, Math.PI, 0, true)
  line(ctx, [[CRADLE.x + CRADLE.r, CRADLE.y], [CRADLE.x + CRADLE.r, RAILS.top], [RIGHT, RAILS.top]])
  line(ctx, [[LEFT, RAILS.bottom], [RIGHT, RAILS.bottom]])
  still(ctx, INK.wall, 2)
  // The flex that feeds the lamps sags from one to the next.
  ctx.beginPath()
  const left = BULBS.slice(0, 6), right = BULBS.slice(6)
  for (const run of [[{ x: -60, y: 44 }, ...left, { x: 536, y: 40 }], [{ x: 644, y: 40 }, ...right, { x: 1240, y: 44 }]]) {
    for (let i = 0; i < run.length - 1; i++) {
      const a = run[i], b = run[i + 1], ay = 'r' in a ? a.y - a.r * 1.25 : a.y - 14, by = 'r' in b ? b.y - b.r * 1.25 : b.y - 14
      ctx.moveTo(a.x, ay)
      ctx.quadraticCurveTo((a.x + b.x) / 2, Math.max(ay, by) + 9, b.x, by)
    }
  }
  still(ctx, INK.far, 1.4)
  ctx.beginPath()
  for (const bulb of BULBS) lamp(ctx, bulb.x, bulb.y, bulb.r)
  ctx.fillStyle = '#000000'
  ctx.fill()
  still(ctx, INK.bulb, 1.6, 0.5)
}

/** Above the marquee, where a tall surface shows it: the cabinet's upper part, with big lamps on cords and wiring down the back. */
function loft(ctx: Ctx): void {
  traces(ctx, LEFT, RIGHT, TOP, 4, 34, 21)
  const lamps: [number, number, number][] = [[150, -150, 34], [395, -260, 22], [640, -120, 40], [870, -300, 26], [1050, -170, 30]]
  ctx.beginPath()
  for (const [x, y, r] of lamps) {
    line(ctx, [[x, TOP], [x, y - r * 1.25]])
    lamp(ctx, x, y, r)
  }
  ctx.fillStyle = '#000000'
  ctx.fill()
  still(ctx, INK.wall, 1.8, 0.9)
  ctx.beginPath()
  for (const [x, y, r] of lamps) {
    ctx.moveTo(x - r * 0.35, y + r * 0.1)
    ctx.quadraticCurveTo(x, y - r * 0.6, x + r * 0.35, y + r * 0.1)
  }
  still(ctx, INK.bulb, 1.6, 0.55)
}

function web(ctx: Ctx): void {
  const angles = [3, 17, 31, 45, 59, 73, 87].map((deg) => (deg * Math.PI) / 180)
  const reach = [310, 292, 270, 300, 268, 286, 318]
  ctx.beginPath()
  angles.forEach((a, i) => line(ctx, [[0, 0], [Math.cos(a) * reach[i], Math.sin(a) * reach[i]]]))
  // The web's anchor threads run on up and out of the frame.
  line(ctx, [[0, 0], [-260, -470]])
  line(ctx, [[0, 0], [60, -470]])
  line(ctx, [[0, 0], [-520, 40]])
  for (const r of [54, 98, 142, 186, 230, 266]) {
    for (let i = 0; i < angles.length - 1; i++) {
      const a = angles[i], b = angles[i + 1], mid = (a + b) / 2
      ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r)
      // Each rung sags towards the corner.
      ctx.quadraticCurveTo(Math.cos(mid) * r * 0.9, Math.sin(mid) * r * 0.9, Math.cos(b) * r, Math.sin(b) * r)
    }
  }
  still(ctx, INK.web, 1.2, 0.85)
}

/** The pile in a well: small caps of unequal size, tumbled, never in rows, heaped up to where the peg in hand stands out of it. The same pile on every visit. */
function pileOf(colour: Colour): [number, number, number][] {
  const chance = makeRng(31 + colour * 7)
  const mouth = wellMouth(colour), hand = handPlace(colour)
  const caps: [number, number, number][] = []
  for (let i = 0; i < 17; i++) {
    const level = i / 16
    const spread = 30 - 14 * level
    caps.push([mouth.x + (chance.next() * 2 - 1) * spread, 780 - level * (780 - hand.y - 26) + (chance.next() - 0.5) * 8, 0.3 + chance.next() * 0.16])
  }
  return caps
}

/** The box a well's pile is drawn in, for the drawing of it that is stamped while it rattles. */
export function pileBox(colour: Colour): { x: number; y: number; width: number; height: number } {
  return { x: wellMouth(colour).x - 40, y: 646, width: 80, height: 144 }
}

/**
 * A well's pile. `solid` fills the inside of the bin black first, for the drawing that is stamped over the
 * still pile while the pile rattles: the whole pile then moves as one.
 */
export function paintPile(ctx: Ctx, colour: Colour, solid: boolean): void {
  if (solid) {
    const box = pileBox(colour)
    ctx.beginPath()
    roundRect(ctx, box.x, box.y, box.width, box.height, 14)
    ctx.fillStyle = '#000000'
    ctx.fill()
  }
  for (const [x, y, scale] of pileOf(colour)) pegCap(ctx, colour, x, y, scale)
}

function tray(ctx: Ctx): void {
  ctx.beginPath()
  roundRect(ctx, WELL.x - 12, 606, WELL.width * 5 + 24, 204, 18)
  ctx.fillStyle = '#000000'
  ctx.fill()
  still(ctx, INK.touch, 2, 0.5)
  for (let colour = 1 as Colour; colour <= 5; colour = (colour + 1) as Colour) {
    const mouth = wellMouth(colour)
    // A well: an open bin, wider at its mouth, with a pile that brims.
    ctx.beginPath()
    line(ctx, [[mouth.x - 50, 668], [mouth.x - 42, 792], [mouth.x + 42, 792], [mouth.x + 50, 668]])
    still(ctx, INK.touch, 2.5, 0.8)
    paintPile(ctx, colour, false)
  }
}

/**
 * The three keys. Each shows what the next push gives: one solid peg, a cap with its glint as a peg on the board
 * is, up and left of the middle on every key; its echoes, hollow outlines on the far side of each fold, drawn
 * with one thin line and no glow so the hole in each stays open; and the folds themselves, lines that run into
 * the rim. The key that is down has its own drawn lit, live.
 */
function keys(ctx: Ctx): void {
  ctx.beginPath()
  roundRect(ctx, 12, 614, 198, 190, 20)
  still(ctx, INK.wall, 1.6)
  ctx.beginPath()
  for (const button of BUTTONS) roundRect(ctx, button.x - BUTTON_HALF, button.y - BUTTON_HALF, BUTTON_HALF * 2, BUTTON_HALF * 2, BUTTON_CORNER)
  ctx.fillStyle = '#000000'
  ctx.fill()
  still(ctx, INK.touch, 2.5, 0.8)
  ctx.beginPath()
  for (const button of BUTTONS) for (const fold of keyMarks(button.mirror).folds) line(ctx, [[fold[0], fold[1]], [fold[2], fold[3]]])
  still(ctx, INK.touch, 1.5, 0.6)
  ctx.beginPath()
  for (const button of BUTTONS) for (const echo of keyMarks(button.mirror).echoes) ring(ctx, echo.x, echo.y, echo.r)
  ctx.strokeStyle = INK.touch
  ctx.globalAlpha = 0.75
  ctx.lineWidth = ECHO_LINE * 0.6
  ctx.stroke()
  ctx.globalAlpha = 1
  // The pegs on the keys, unlit: caps of dim amber, each with its glint.
  for (const button of BUTTONS) {
    const peg = keyMarks(button.mirror).peg, r = peg.r
    const body = ctx.createRadialGradient(peg.x - r * 0.34, peg.y - r * 0.4, r * 0.05, peg.x, peg.y, r)
    body.addColorStop(0, '#c98a3c')
    body.addColorStop(0.45, '#7a4d18')
    body.addColorStop(1, '#2e1c08')
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.arc(peg.x, peg.y, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.globalAlpha = 0.55
    ctx.beginPath()
    ctx.ellipse(peg.x - r * 0.42, peg.y - r * 0.5, r * 0.26, r * 0.14, -0.7, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = 1
  }
}

/** The loudspeaker: a cone seen from a little to the left, so each fold of it sits off the middle of the one outside it. */
function speaker(ctx: Ctx): void {
  ctx.beginPath()
  roundRect(ctx, SPEAKER.x - 100, SPEAKER.y - 100, 200, 200, 18)
  still(ctx, INK.wall, 1.6)
  ctx.beginPath()
  for (const [dx, dy, r] of [[-86, -86, 3], [86, -86, 4.5], [-86, 86, 4], [86, 86, 2.5]]) ring(ctx, SPEAKER.x + dx, SPEAKER.y + dy, r)
  ctx.fillStyle = INK.wall
  ctx.fill()
  ctx.beginPath()
  const folds: [number, number, number][] = [[0, SPEAKER.radius, 1], [5, 70, 0.96], [11, 49, 0.9], [16, 30, 0.84]]
  for (const [shift, r, squeeze] of folds) {
    ctx.moveTo(SPEAKER.x + shift + r * squeeze, SPEAKER.y)
    ctx.ellipse(SPEAKER.x + shift, SPEAKER.y, r * squeeze, r, 0, 0, Math.PI * 2)
  }
  still(ctx, INK.wall, 2, 0.9)
  // The dust cap in the middle is solid.
  ctx.beginPath()
  ctx.ellipse(SPEAKER.x + 19, SPEAKER.y, 11, 14, 0, 0, Math.PI * 2)
  ctx.fillStyle = INK.far
  ctx.fill()
}

/** A bundle of cables from the marquee down to the loudspeaker, behind the lever's plate. */
function cables(ctx: Ctx): void {
  ctx.beginPath()
  for (let i = 0; i < 3; i++) {
    const x = 1104 + i * 9
    ctx.moveTo(x, 88)
    ctx.bezierCurveTo(x + 30, 260, x - 30, 430, x - 20 + i * 4, 606)
  }
  still(ctx, INK.wall, 1.5, 0.8)
}

/** The valve: a glass bulb on a base with pins. Its glowing coil is drawn live. */
function valve(ctx: Ctx): void {
  ctx.beginPath()
  roundRect(ctx, VALVE.x - 22, VALVE.y - 44, 44, 78, 20)
  ctx.fillStyle = '#000000'
  ctx.fill()
  line(ctx, [[VALVE.x - 26, VALVE.y + 34], [VALVE.x + 26, VALVE.y + 34], [VALVE.x + 22, VALVE.y + 50], [VALVE.x - 22, VALVE.y + 50], [VALVE.x - 26, VALVE.y + 34]])
  line(ctx, [[VALVE.x - 12, VALVE.y + 50], [VALVE.x - 13, VALVE.y + 63]])
  line(ctx, [[VALVE.x + 2, VALVE.y + 50], [VALVE.x + 2, VALVE.y + 58]])
  line(ctx, [[VALVE.x + 13, VALVE.y + 50], [VALVE.x + 15, VALVE.y + 66]])
  still(ctx, INK.wall, 1.8)
}

/** The lever's plate and slot. The knob is drawn live. */
function leverPlate(ctx: Ctx): void {
  ctx.beginPath()
  roundRect(ctx, LEVER.left + 4, LEVER.boxTop, LEVER.right - LEVER.left - 6, LEVER.boxBottom - LEVER.boxTop, 22)
  ctx.fillStyle = '#000000'
  ctx.fill()
  still(ctx, INK.wall, 1.8)
  ctx.beginPath()
  roundRect(ctx, LEVER.x - 9, LEVER.top - 16, 18, LEVER.bottom - LEVER.top + 32, 9)
  still(ctx, INK.touch, 2.2, 0.75)
}

/** The slot the tray's handle is pulled down in, joined to the tray by a rod. The handle's bob is drawn live. */
function handleGuide(ctx: Ctx): void {
  ctx.beginPath()
  line(ctx, [[WELL.x + WELL.width * 5 + 6, HANDLE.top + 22], [HANDLE.x - 18, HANDLE.top + 22], [HANDLE.x - 9, HANDLE.top + 12]])
  still(ctx, INK.wall, 1.8, 0.9)
  ctx.beginPath()
  roundRect(ctx, HANDLE.x - 8, HANDLE.top + 4, 16, HANDLE.y - HANDLE.top + HANDLE.stop + 44, 8)
  ctx.fillStyle = '#000000'
  ctx.fill()
  still(ctx, INK.touch, 2, 0.7)
}

function bezel(ctx: Ctx): void {
  const x = BOARD.x - 14, y = BOARD.y - 14, w = BOARD.width + 28, h = BOARD.height + 28
  ctx.beginPath()
  roundRect(ctx, x, y, w, h, 22)
  ctx.fillStyle = '#000000'
  ctx.fill()
  still(ctx, INK.bezel, 3)
  ctx.beginPath()
  roundRect(ctx, x + 8, y + 8, w - 16, h - 16, 15)
  still(ctx, INK.bezel, 1.2, 0.6)
}

/** Paints the whole setting, without the holes and the pegs, which the view stamps. */
export function paintBackdrop(ctx: Ctx): void {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  floor(ctx)
  loft(ctx)
  traces(ctx, 8, 204, 404, 596, 7, 11)
  traces(ctx, LEFT, -8, 100, 596, 14, 14)
  traces(ctx, 1190, RIGHT, 100, 596, 14, 15)
  cables(ctx)
  marquee(ctx)
  web(ctx)
  tray(ctx)
  keys(ctx)
  speaker(ctx)
  valve(ctx)
  leverPlate(ctx)
  handleGuide(ctx)
  bezel(ctx)
}
