import { BACKING, DYE, chance, css, fill, makeFleece, oval, shade, stampFleece, type Ctx, type Maker, type Rgb } from './felted'
import { BOWLS, FELT, FOLK, FRAME, PEGS, PIG, ROOM, SHEEP, TABLE_Y } from './layout'
import { makeRng } from './rng'

// The room, painted once and stamped whole each frame. It is a fleece picture
// too: the wall and the table are veils of loose wool laid over dark felt, and
// only the things a hand could hold are firm (the frame, the bowls, the peg
// rail, the mat the figures stand on). It is lower in contrast than anything
// that answers a touch, and it is painted past the stage's edges, since a
// surface of another shape shows more of it at two sides.

export const WALL: Rgb = [77, 63, 85]
const WALL_VEILS: readonly Rgb[] = [[122, 100, 134], [140, 100, 116], [58, 46, 68], [104, 92, 132]]
const TABLE: Rgb = [196, 172, 134]
const TABLE_VEILS: readonly Rgb[] = [[224, 204, 168], [166, 138, 100], [208, 184, 140], [236, 222, 194]]
export const BEECH: Rgb = [226, 198, 152]
const MAT: Rgb = [132, 150, 132]
export const BOWL: Rgb = [108, 84, 96]

/** Lays `count` veils of loose wool over a band of the room: big, faint, and lying mostly one way. */
function veil(c: Ctx, make: Maker, base: readonly number[], colours: readonly Rgb[], seed: number, count: number, x0: number, y0: number, x1: number, y1: number, turn: number, wobble: number, size: number, pxScale: number): void {
  const rng = makeRng(seed)
  const fleeces = colours.map((rgb, i) => makeFleece(make, rgb, pxScale, seed + i * 31, 0.1, 12))
  for (let i = 0; i < count; i++) {
    const fleece = fleeces[Math.floor(rng.next() * fleeces.length)]
    stampFleece(c, fleece, x0 + rng.next() * (x1 - x0), y0 + rng.next() * (y1 - y0), turn + (rng.next() - 0.5) * wobble, size * (0.6 + 0.8 * rng.next()), Math.floor(rng.next() * 6), base)
  }
}

/**
 * Paints the room into `c`, whose transform `base` already maps stage units to pixels. `bleedX` and `bleedY`
 * are how far past the stage the surface reaches, in stage units, and `pxScale` how many pixels a unit is.
 */
export function paintRoom(c: Ctx, make: Maker, base: readonly number[], bleedX: number, bleedY: number, pxScale: number): void {
  const left = -bleedX - 2, right = ROOM.width + bleedX + 2, top = -bleedY - 2, bottom = ROOM.height + bleedY + 2
  const fleeceScale = Math.max(0.5, pxScale * 0.5)
  // The wall: dark heather felt under slanting veils.
  c.fillStyle = css(WALL)
  c.fillRect(left, top, right - left, TABLE_Y - top)
  veil(c, make, base, WALL_VEILS, 11, 520, left, top, right, TABLE_Y, -0.5, 0.5, 4.2, fleeceScale)
  // A dado of darker wool low on the wall, so the figures at the back stand against something.
  veil(c, make, base, [[52, 42, 62], [66, 52, 74]], 17, 150, left, TABLE_Y - 120, right, TABLE_Y, 0, 0.2, 3.6, fleeceScale)
  // The table: pale oat wool, lying along it.
  c.fillStyle = css(TABLE)
  c.fillRect(left, TABLE_Y, right - left, bottom - TABLE_Y)
  veil(c, make, base, TABLE_VEILS, 23, 420, left, TABLE_Y + 6, right, bottom, 0, 0.16, 4, fleeceScale)
  // Its back edge, in shade.
  const edge = c.createLinearGradient(0, TABLE_Y - 10, 0, TABLE_Y + 26)
  edge.addColorStop(0, 'rgba(30,20,36,0)')
  edge.addColorStop(0.4, 'rgba(30,20,36,0.5)')
  edge.addColorStop(1, 'rgba(30,20,36,0)')
  c.fillStyle = edge
  c.fillRect(left, TABLE_Y - 10, right - left, 36)

  garland(c, make, base, fleeceScale)

  // The shade the frame throws on the wall, then the frame and the felt in it.
  c.fillStyle = 'rgba(24,16,30,0.34)'
  c.beginPath()
  c.roundRect(FRAME.x + 6, FRAME.y + 10, FRAME.w + 4, FRAME.h + 6, 10)
  c.fill()
  c.fillStyle = css(BEECH)
  c.beginPath()
  c.roundRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h, 7)
  c.fill()
  // Grain along each side of the frame, and its mitred corners.
  c.save()
  c.beginPath()
  c.roundRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h, 7)
  c.clip()
  veil(c, make, base, [shade(BEECH, 0.3), shade(BEECH, -0.2), shade(BEECH, -0.1)], 29, 240, FRAME.x, FRAME.y, FRAME.x + FRAME.w, FRAME.y + FRAME.h, 0, 0.06, 2.4, fleeceScale)
  c.restore()
  c.strokeStyle = css(shade(BEECH, -0.35), 0.5)
  c.lineWidth = 1.4
  c.beginPath()
  for (const [fx, fy, dx, dy] of [[FRAME.x, FRAME.y, 1, 1], [FRAME.x + FRAME.w, FRAME.y, -1, 1], [FRAME.x, FRAME.y + FRAME.h, 1, -1], [FRAME.x + FRAME.w, FRAME.y + FRAME.h, -1, -1]]) {
    c.moveTo(fx + dx * 3, fy + dy * 3)
    c.lineTo(fx + dx * 24, fy + dy * 24)
  }
  c.stroke()
  // The felt: dark, with a mottled nap, and a soft shade under the frame's inner edge.
  c.fillStyle = css(BACKING)
  c.fillRect(FELT.x, FELT.y, FELT.w, FELT.h)
  c.save()
  c.beginPath()
  c.rect(FELT.x, FELT.y, FELT.w, FELT.h)
  c.clip()
  veil(c, make, base, [shade(BACKING, 0.16), shade(BACKING, -0.3), [52, 44, 70], [44, 40, 60]], 37, 520, FELT.x, FELT.y, FELT.x + FELT.w, FELT.y + FELT.h, 0.3, 3, 2.2, fleeceScale)
  const inner = c.createLinearGradient(0, FELT.y, 0, FELT.y + 22)
  inner.addColorStop(0, 'rgba(10,6,16,0.5)')
  inner.addColorStop(1, 'rgba(10,6,16,0)')
  c.fillStyle = inner
  c.fillRect(FELT.x, FELT.y, FELT.w, 22)
  const side = c.createLinearGradient(FELT.x, 0, FELT.x + 16, 0)
  side.addColorStop(0, 'rgba(10,6,16,0.4)')
  side.addColorStop(1, 'rgba(10,6,16,0)')
  c.fillStyle = side
  c.fillRect(FELT.x, FELT.y, 16, FELT.h)
  c.restore()

  // The peg rail on the wall, with its three pegs.
  c.shadowColor = 'rgba(20,12,28,0.5)'
  c.shadowBlur = 5 * pxScale
  c.shadowOffsetY = 3 * pxScale
  fillRound(c, BEECH, PEGS[0].x - 40, PEGS[0].y - 7, PEGS[2].x - PEGS[0].x + 80, 14, 7)
  for (const peg of PEGS) {
    c.fillStyle = css(shade(BEECH, -0.12))
    c.beginPath()
    c.arc(peg.x, peg.y, 11, 0, Math.PI * 2)
    c.fill()
  }
  c.shadowColor = 'rgba(0,0,0,0)'
  c.shadowBlur = 0
  c.shadowOffsetY = 0
  for (const peg of PEGS) {
    c.fillStyle = css(shade(BEECH, 0.35))
    c.beginPath()
    c.arc(peg.x - 3, peg.y - 3, 4.5, 0, Math.PI * 2)
    c.fill()
  }

  // The mat the sheep and the pig stand on, and the shade under the two at the back.
  c.shadowBlur = 4 * pxScale
  fill(c, shade(MAT, -0.25), (p) => oval(p, (FOLK[SHEEP].x + FOLK[PIG].x) / 2, 798, 182, 30))
  fill(c, MAT, (p) => oval(p, (FOLK[SHEEP].x + FOLK[PIG].x) / 2, 792, 178, 27))
  c.shadowBlur = 0
  c.shadowColor = 'rgba(0,0,0,0)'

  // The five bowls: firm felt, dark, each with a rim. The wool in them is drawn each frame, since it moves.
  for (let dye = 0; dye < BOWLS.length; dye++) bowl(c, BOWLS[dye].x, BOWLS[dye].y, pxScale, dye)
}

/** The wall alone over one box of the room, for what shows behind the frame while it turns round. */
export function paintWall(c: Ctx, make: Maker, base: readonly number[], x0: number, y0: number, x1: number, y1: number, pxScale: number): void {
  c.fillStyle = css(WALL)
  c.fillRect(x0, y0, x1 - x0, y1 - y0)
  veil(c, make, base, WALL_VEILS, 13, Math.round(((x1 - x0) * (y1 - y0)) / 1900), x0, y0, x1, y1, -0.5, 0.5, 4.2, Math.max(0.5, pxScale * 0.5))
}

function fillRound(c: Ctx, rgb: Rgb, x: number, y: number, w: number, h: number, r: number): void {
  c.fillStyle = css(rgb)
  c.beginPath()
  c.roundRect(x, y, w, h, r)
  c.fill()
}

function bowl(c: Ctx, x: number, y: number, pxScale: number, dye: number): void {
  // Its shade on the table.
  c.fillStyle = 'rgba(60,40,40,0.28)'
  c.beginPath()
  c.ellipse(x + 4, y + 50, 62, 12, 0, 0, Math.PI * 2)
  c.fill()
  c.shadowBlur = 3 * pxScale
  // The body: a deep round bowl, wider at the rim.
  fill(c, BOWL, (p) => {
    p.moveTo(x - 60, y + 4)
    p.bezierCurveTo(x - 58, y + 44, x - 34, y + 56, x, y + 56)
    p.bezierCurveTo(x + 34, y + 56, x + 58, y + 44, x + 60, y + 4)
    p.closePath()
  })
  // The dark inside, and the rim, with a stitch of the bowl's own dye round it.
  fill(c, shade(BOWL, -0.45), (p) => oval(p, x, y + 4, 58, 15))
  c.shadowBlur = 0
  c.shadowColor = 'rgba(0,0,0,0)'
  c.strokeStyle = css(shade(BOWL, 0.3))
  c.lineWidth = 3.5
  c.beginPath()
  c.ellipse(x, y + 4, 59, 15.5, 0, 0, Math.PI * 2)
  c.stroke()
  c.strokeStyle = css(DYE[dye], 0.9)
  c.lineWidth = 2.2
  c.setLineDash([7, 6])
  c.beginPath()
  c.ellipse(x, y + 26, 51, 20, 0, 0.12 * Math.PI, 0.88 * Math.PI)
  c.stroke()
  c.setLineDash([])
}

/** A length of yarn across the top of the wall, sagging between knots, with a small tuft of each dye hung from it. */
function garland(c: Ctx, make: Maker, base: readonly number[], pxScale: number): void {
  const from = -60, to = ROOM.width + 60, spans = 7, sag = 22, y0 = 16
  c.strokeStyle = css([214, 196, 170], 0.75)
  c.lineWidth = 2
  c.beginPath()
  for (let i = 0; i < spans; i++) {
    const x0 = from + ((to - from) * i) / spans, x1 = from + ((to - from) * (i + 1)) / spans
    c.moveTo(x0, y0)
    c.quadraticCurveTo((x0 + x1) / 2, y0 + sag * 2, x1, y0)
  }
  c.stroke()
  const fleeces = DYE.map((rgb, dye) => makeFleece(make, rgb, pxScale * 1.4, 300 + dye, 0.2, 14))
  let n = 0
  for (let i = 0; i < spans; i++) {
    const x0 = from + ((to - from) * i) / spans, x1 = from + ((to - from) * (i + 1)) / spans
    for (const u of [0.25, 0.5, 0.75]) {
      // The home control hangs at the top centre: no tuft is hung behind it.
      const x = x0 + (x1 - x0) * u, y = y0 + sag * 4 * u * (1 - u) + 10
      if (Math.abs(x - ROOM.width / 2) < 44) continue
      const fleece = fleeces[n % fleeces.length]
      for (let k = 0; k < 9; k++) stampFleece(c, fleece, x + (chance(n, k, 1) - 0.5) * 8, y + k * 1.6, Math.PI / 2 + (chance(n, k, 2) - 0.5) * 0.7, 0.42 + 0.02 * k, k + n, base)
      n++
    }
  }
}
