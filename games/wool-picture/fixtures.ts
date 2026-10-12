import { BACKING, DYE, chance, css, fill, makeFelt, makeFleece, shade, stampFleece, type Ctx, type Felt, type Fleece, type Maker, type Rgb } from './felted'
import type { FolkArt } from './folkArt'
import type { Skin } from './folkDraw'
import { FELT, FRAME, LOOP, PICTURE } from './layout'
import { BEECH } from './room'
import { HALF_COLS, HALF_ROWS, veilAt } from './wall'
import { BLUE, WHITE, YELLOW } from './wool'

// The things of the room that are not always the same: a hung picture, the
// comb, the yarn loop, the wooden back of the felt that waits, and a figure's
// coat. Each is painted once into a canvas of its own and stamped after.

const YARN: Rgb = [206, 92, 74]
const BOARD: Rgb = [176, 148, 116]

/** How a cell of a hung picture is coloured in the evening: each thing takes its evening way. */
function eveningWay(dye: number, row: number, sunTop: number, sunFoot: number): { rgb: Rgb; alpha: number } {
  const third = row < HALF_ROWS / 3 ? 2 : row < (HALF_ROWS * 2) / 3 ? 1 : 0
  // A sun sinks to the lower edge of its own shape and reddens; a cloud blushes; a fire glows; a stream glints.
  if (dye === YELLOW && third === 2) return row > (sunTop + sunFoot) / 2 ? { rgb: [246, 112, 58], alpha: 1.25 } : { rgb: [150, 80, 70], alpha: 0.3 }
  if (dye === WHITE && third === 2) return { rgb: [246, 178, 172], alpha: 1 }
  if (dye === YELLOW && third === 1) return { rgb: [255, 204, 96], alpha: 1.4 }
  if (dye === BLUE && third === 1) return { rgb: row % 2 ? [206, 228, 252] : [96, 150, 214], alpha: 1.1 }
  return { rgb: shade(DYE[dye], -0.3), alpha: 0.9 }
}

/** A hung picture, in its small frame with the yarn it hangs by: the wool as it lay, or as it is in the evening. */
export function makePicture(make: Maker, scale: number, veils: string, evening: boolean): HTMLCanvasElement {
  const canvas = make(Math.ceil(PICTURE.w * scale), Math.ceil(PICTURE.h * scale)), c = canvas.getContext('2d')!
  c.setTransform(scale, 0, 0, scale, 0, 0)
  c.fillStyle = css(BEECH)
  c.beginPath()
  c.roundRect(0, 0, PICTURE.w, PICTURE.h, 4)
  c.fill()
  c.strokeStyle = css(shade(BEECH, -0.3), 0.7)
  c.lineWidth = 1
  c.strokeRect(0.5, 0.5, PICTURE.w - 1, PICTURE.h - 1)
  const x0 = 6, y0 = 6, w = PICTURE.w - 12, h = PICTURE.h - 12, cw = w / HALF_COLS, ch = h / HALF_ROWS
  c.fillStyle = css(BACKING)
  c.fillRect(x0, y0, w, h)
  let sunTop = HALF_ROWS, sunFoot = 0
  for (let row = 0; row < HALF_ROWS / 3; row++) for (let col = 0; col < HALF_COLS; col++) if (veilAt(veils, col, row).dye === YELLOW) { sunTop = Math.min(sunTop, row); sunFoot = Math.max(sunFoot, row) }
  c.save()
  c.beginPath()
  c.rect(x0, y0, w, h)
  c.clip()
  for (let row = 0; row < HALF_ROWS; row++) {
    for (let col = 0; col < HALF_COLS; col++) {
      const cell = veilAt(veils, col, row)
      if (cell.dye < 0) continue
      const way = evening ? eveningWay(cell.dye, row, sunTop, sunFoot) : { rgb: DYE[cell.dye], alpha: 1 }
      c.fillStyle = css(way.rgb, Math.min(1, (0.28 + 0.1 * cell.thickness) * way.alpha))
      // A soft dab a little larger than its cell, a little off its middle: wool, not tiles.
      c.beginPath()
      c.ellipse(x0 + (col + 0.5 + (chance(col, row, 1) - 0.5) * 0.5) * cw, y0 + (row + 0.5 + (chance(col, row, 2) - 0.5) * 0.5) * ch, cw * 0.95, ch * 0.8, chance(col, row, 3) * 3, 0, Math.PI * 2)
      c.fill()
    }
  }
  c.restore()
  // The yarn it hangs by, over its peg.
  c.strokeStyle = css(YARN)
  c.lineWidth = 2.4
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(PICTURE.w / 2 - 14, 3)
  c.quadraticCurveTo(PICTURE.w / 2, PICTURE.up + 6, PICTURE.w / 2 + 14, 3)
  c.stroke()
  return canvas
}

/** The comb: a beech back with a row of teeth, lying with its teeth toward the child. */
export function makeComb(make: Maker, scale: number): Felt {
  return makeFelt(make, scale, -44, -32, 44, 34, 95, (c) => {
    // A darker wood than the table it lies on, so that it is seen there.
    fill(c, shade(BEECH, -0.3), (p) => p.roundRect(-42, -30, 84, 22, 9))
    for (let i = 0; i < 9; i++) fill(c, shade(BEECH, -0.42), (p) => p.roundRect(-39 + i * 9.2, -12, 5, 44 - Math.abs(i - 4) * 2, 2.5))
  }, (c) => {
    c.strokeStyle = css(shade(BEECH, -0.6), 0.6)
    c.lineWidth = 1.4
    c.beginPath()
    c.moveTo(-34, -22)
    c.quadraticCurveTo(0, -17, 34, -22)
    c.stroke()
  })
}

/** Adds the yarn loop to `c`'s path with its foot at the frame's corner and its round end at (x, y): at rest it stands up from the corner, and dragged it stretches to the finger. */
export function loopPath(c: Ctx, x: number, y: number): void {
  const fx = LOOP.x, fy = LOOP.y + 24, dx = x - fx, dy = y - 26 - fy, far = Math.max(1, Math.hypot(dx, dy)), nx = -dy / far, ny = dx / far, wide = Math.max(8, 22 - far * 0.03)
  c.moveTo(fx, fy)
  c.bezierCurveTo(fx + dx * 0.5 + nx * wide, fy + dy * 0.5 + ny * wide, x + nx * wide, y - 26 + ny * wide - 4, x, y - 26)
  c.bezierCurveTo(x - nx * wide, y - 26 - ny * wide - 4, fx + dx * 0.5 - nx * wide, fy + dy * 0.5 - ny * wide, fx, fy)
}

export function strokeLoop(c: Ctx, x: number, y: number): void {
  c.strokeStyle = css(YARN)
  c.lineWidth = 5
  c.lineCap = 'round'
  c.lineJoin = 'round'
  c.beginPath()
  loopPath(c, x, y)
  c.stroke()
}

/** The wooden back of the felt that waits on the easel: boards inside the frame, the felt's edge folded over and tacked, and one brace. */
export function makeBack(make: Maker, scale: number): HTMLCanvasElement {
  const canvas = make(Math.ceil(FRAME.w * scale), Math.ceil(FRAME.h * scale)), c = canvas.getContext('2d')!
  c.setTransform(scale, 0, 0, scale, -FRAME.x * scale, -FRAME.y * scale)
  c.fillStyle = css(BEECH)
  c.beginPath()
  c.roundRect(FRAME.x, FRAME.y, FRAME.w, FRAME.h, 7)
  c.fill()
  c.fillStyle = css(BOARD)
  c.fillRect(FELT.x, FELT.y, FELT.w, FELT.h)
  // Boards: long faint lines of grain, and the gaps between four boards.
  c.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    const y = FELT.y + chance(i, 1, 1) * FELT.h, x = FELT.x + chance(i, 2, 1) * FELT.w * 0.8
    c.strokeStyle = css(shade(BOARD, chance(i, 3, 1) < 0.5 ? 0.2 : -0.2), 0.3)
    c.lineWidth = 1 + chance(i, 4, 1)
    c.beginPath()
    c.moveTo(x, y)
    c.quadraticCurveTo(x + 60, y + (chance(i, 5, 1) - 0.5) * 6, x + 90 + chance(i, 6, 1) * 80, y)
    c.stroke()
  }
  c.strokeStyle = css(shade(BOARD, -0.4), 0.55)
  c.lineWidth = 2
  c.beginPath()
  for (const u of [0.26, 0.5, 0.74]) { c.moveTo(FELT.x, FELT.y + FELT.h * u); c.lineTo(FELT.x + FELT.w, FELT.y + FELT.h * u) }
  c.stroke()
  // The dark felt's edge, folded over all round and tacked down.
  c.strokeStyle = css(BACKING)
  c.lineWidth = 18
  c.strokeRect(FELT.x + 9, FELT.y + 9, FELT.w - 18, FELT.h - 18)
  c.fillStyle = css(shade(BEECH, 0.3))
  for (let i = 0; i < 16; i++) for (const y of [FELT.y + 9, FELT.y + FELT.h - 9]) { c.beginPath(); c.arc(FELT.x + 30 + i * ((FELT.w - 60) / 15), y, 2.6, 0, Math.PI * 2); c.fill() }
  // One brace across, a hand's breadth below the middle.
  c.fillStyle = css(shade(BEECH, -0.1))
  c.beginPath()
  c.roundRect(FELT.x + 18, FELT.y + FELT.h * 0.58, FELT.w - 36, 34, 6)
  c.fill()
  c.strokeStyle = css(shade(BEECH, -0.4), 0.5)
  c.lineWidth = 1.2
  c.strokeRect(FELT.x + 18, FELT.y + FELT.h * 0.58, FELT.w - 36, 34)
  return canvas
}

type Piece = 'body' | 'head'
const PIECES = ['sheep', 'goose', 'shepherd', 'pig'] as const
/** The colour the pig goes under a sun, as a sixth coat. */
export const RED = 5

/** The figures in their coats: a figure's own body and head with wool of the coat's dye laid on them, made when first worn. */
export class Skins {
  private skins = new Map<number, Skin>()
  private fleeces: (Fleece | null)[] = [null, null, null, null, null]
  private scale = 0
  private art: FolkArt | null = null

  constructor(private make: Maker) {}

  reset(scale: number, art: FolkArt): void {
    this.scale = scale; this.art = art
    this.skins.clear()
    this.fleeces = [null, null, null, null, null]
  }

  /** The skin of this figure in this coat. A white coat lies over the whole head: a cloud on it. */
  get(who: number, coat: number): Skin | null {
    if (!this.art) return null
    let skin = this.skins.get(who * 8 + coat)
    if (!skin) {
      const art = this.art[PIECES[who]] as Record<Piece, Felt>
      skin = { body: this.coated(art.body, coat, who, 0.78), head: this.coated(art.head, coat, who + 4, coat === WHITE ? 1 : coat === RED ? 1 : 0.42) }
      this.skins.set(who * 8 + coat, skin)
    }
    return skin
  }

  /** A copy of a felt piece with wool over the top `share` of it. */
  private coated(piece: Felt, coat: number, seed: number, share: number): Felt {
    const k = this.scale, canvas = this.make(piece.canvas.width, piece.canvas.height), c = canvas.getContext('2d')!
    c.drawImage(piece.canvas, 0, 0)
    c.globalCompositeOperation = 'source-atop'
    if (coat === RED) {
      c.fillStyle = 'rgba(232,64,52,0.5)'
      c.fillRect(0, 0, canvas.width, canvas.height)
    } else {
      const fleece = (this.fleeces[coat] ??= makeFleece(this.make, DYE[coat], k, 500 + coat, 0.5, 14))
      const base = [k, 0, 0, k, 0, 0], stamps = Math.round((piece.w * piece.h * share) / 80)
      for (let i = 0; i < stamps; i++) stampFleece(c, fleece, chance(i, seed, 1) * piece.w, chance(i, seed, 2) * piece.h * share, (chance(i, seed, 3) - 0.5) * 2.4, 0.7 + 0.5 * chance(i, seed, 4), i, base)
    }
    c.globalCompositeOperation = 'source-over'
    return { canvas, ox: piece.ox, oy: piece.oy, w: piece.w, h: piece.h }
  }
}
