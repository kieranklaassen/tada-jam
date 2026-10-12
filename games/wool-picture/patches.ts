import { DYE, chance, makeFleece, stampFleece, type Ctx, type Fleece, type Maker } from './felted'
import { CELL, COLS, FELT, ROWS } from './layout'
import { cling, motionOf, still, type Motion } from './life'
import type { Combed, Toy } from './toy'
import { BLUE, THICKEST, YELLOW, shapeById, type Join, type Laid, type Shape, type Sheet } from './wool'

// The laid wool as pictures. Each shape on the sheet has a canvas of its own,
// which holds one stamp of a fleece sprite for every level of wool on every
// cell: laid once when the wool is laid, and never drawn strand by strand in
// a frame. A frame draws each shape's canvas once, moved as the shape lives
// (life.ts). The same cell, level and way always give the same stamp, so the
// sheet laid again from a save is the sheet that was left.

/** Cells of room round a shape's wool, for the strands that stray past it, and how many more a canvas grows by. */
const MARGIN = 4
const GROW = 8
/** How far a wind pushes a cloud beside it, in stage units. */
export const PUSH = 30
/** The most lit things that get the second draw that brightens them, at every tier alike: brightening is what the veil does. */
export const LIT_COPIES = 4
/** How much thinner a cloud is drawn where it rains (at its darkest), and how much thinner again on the side a sun dries. */
const RAIN_THIN = 0.18
const SUN_THIN = 0.22

/**
 * How a cloud is drawn. `dark` is how far it has gathered to rain, 0 to 1. A sun thins it from the sun's own
 * side: `side` is -1 where the sun is to its left, 1 to its right and 0 with none, and `upTo` is the column
 * the thinning has come to from that side.
 */
export type CloudLook = { dark: number; side: number; upTo: number }

type Patch = { canvas: HTMLCanvasElement; c: Ctx; x0: number; y0: number; cols: number; rows: number }

const even = (n: number): number => Math.floor(n / 2) * 2

export class Patches {
  private patches = new Map<number, Patch>()
  private fleece: Fleece[] = []
  private scale = 0
  private move = still()
  private look: CloudLook = { dark: 0, side: 0, upTo: 0 }
  /** The second draws of running water and wind that the last frame's tier left out. */
  spared = 0
  /** Stamps made into the shapes' own canvases since this was last set to 0: what is baked, apart from what a frame draws. */
  baked = 0

  constructor(private make: Maker) {}

  /** Sets how many pixels of a shape's canvas one stage unit is. A change lays every shape again at the new fineness. */
  setScale(scale: number, sheet: Sheet | null): void {
    if (scale === this.scale) return
    this.scale = scale
    this.fleece = DYE.map((rgb, dye) => makeFleece(this.make, rgb, scale, 100 + dye))
    if (sheet) this.rebuild(sheet)
  }

  /** Lays every shape of the sheet again from its cells: on load, and when the fineness changes. */
  rebuild(sheet: Sheet): void {
    this.patches.clear()
    for (const shape of sheet.shapes) this.relay(shape)
  }

  /** Lays one shape again from its cells, exactly as a load would. */
  relay(shape: Shape): void {
    this.patches.delete(shape.id)
    if (shape.count === 0) return
    const patch = this.cover(undefined, shape.x0, shape.y0, shape.x1, shape.y1, 0)
    this.patches.set(shape.id, patch)
    // Level by level, so the first wool laid on a cell lies under the last.
    for (let level = 1; level <= THICKEST; level++) {
      for (let row = shape.y0; row <= shape.y1; row++) {
        for (let col = shape.x0; col <= shape.x1; col++) {
          const value = shape.cells[row * COLS + col]
          if (value >> 3 >= level) this.stamp(patch, shape.dye, col, row, level, value & 7)
        }
      }
    }
  }

  /**
   * Takes what the comb took off since the last frame: each level is rubbed out of its shape's picture with one
   * stamp, so the wool thins under the comb as it goes. When the comb lifts, each shape it touched is laid again
   * from its cells (`relaid`), and is then exactly what a load would lay.
   */
  comb(combed: Combed[], relaid: number[], sheet: Sheet): void {
    for (const one of combed) {
      const patch = this.patches.get(one.shape)
      if (!patch) continue
      patch.c.globalCompositeOperation = 'destination-out'
      for (let i = 0; i < one.levels; i++) this.stamp(patch, 0, one.col, one.row, 8 + i, Math.floor(chance(one.col, one.row, 77 + i) * 8))
      patch.c.globalCompositeOperation = 'source-over'
    }
    combed.length = 0
    for (const id of relaid) {
      const shape = shapeById(sheet, id)
      if (shape) this.relay(shape)
      else this.patches.delete(id)
    }
    relaid.length = 0
  }

  /** Takes what the toy laid and joined since the last frame: one stamp for each new level, and one draw for each shape taken into another. */
  take(laid: Laid[], joins: Join[]): void {
    for (const one of laid) {
      const patch = this.cover(this.patches.get(one.shape), one.col, one.row, one.col, one.row, GROW)
      this.patches.set(one.shape, patch)
      this.stamp(patch, one.dye, one.col, one.row, one.level, one.way)
    }
    laid.length = 0
    for (const join of joins) {
      const from = this.patches.get(join.from)
      if (!from) continue
      this.patches.delete(join.from)
      const into = this.cover(this.patches.get(join.into), from.x0 + MARGIN, from.y0 + MARGIN, from.x0 + from.cols - 1 - MARGIN, from.y0 + from.rows - 1 - MARGIN, 0)
      this.patches.set(join.into, into)
      into.c.setTransform(1, 0, 0, 1, 0, 0)
      into.c.drawImage(from.canvas, (from.x0 - into.x0) * CELL * this.scale, (from.y0 - into.y0) * CELL * this.scale)
      this.baked++
    }
    joins.length = 0
  }

  /** A canvas that holds these cells with room round them: the patch itself where it already does, or a larger one with the old picture in it. */
  private cover(patch: Patch | undefined, col0: number, row0: number, col1: number, row1: number, grow: number): Patch {
    if (patch && col0 - MARGIN >= patch.x0 && row0 - MARGIN >= patch.y0 && col1 + MARGIN < patch.x0 + patch.cols && row1 + MARGIN < patch.y0 + patch.rows) return patch
    const x0 = Math.max(-MARGIN, even(Math.min(patch ? patch.x0 : COLS, col0 - MARGIN - grow)))
    const y0 = Math.max(-MARGIN, even(Math.min(patch ? patch.y0 : ROWS, row0 - MARGIN - grow)))
    const x1 = Math.min(COLS + MARGIN, even(Math.max(patch ? patch.x0 + patch.cols : 0, col1 + MARGIN + grow + 2)))
    const y1 = Math.min(ROWS + MARGIN, even(Math.max(patch ? patch.y0 + patch.rows : 0, row1 + MARGIN + grow + 2)))
    const canvas = this.make(Math.ceil((x1 - x0) * CELL * this.scale), Math.ceil((y1 - y0) * CELL * this.scale))
    const c = canvas.getContext('2d')!
    if (patch) {
      c.drawImage(patch.canvas, (patch.x0 - x0) * CELL * this.scale, (patch.y0 - y0) * CELL * this.scale)
      this.baked++
    }
    return { canvas, c, x0, y0, cols: x1 - x0, rows: y1 - y0 }
  }

  /** One level of wool on one cell: one fleece sprite, a little off the cell's middle, turned the way the strands lie. */
  private stamp(patch: Patch, dye: number, col: number, row: number, level: number, way: number): void {
    const s = this.scale, salt = level * 8
    const base = [s, 0, 0, s, -patch.x0 * CELL * s, -patch.y0 * CELL * s]
    const x = (col + 0.5) * CELL + (chance(col, row, salt + 1) - 0.5) * 7, y = (row + 0.5) * CELL + (chance(col, row, salt + 2) - 0.5) * 7
    const turn = (way * Math.PI) / 8 + (chance(col, row, salt + 3) - 0.5) * 0.5
    stampFleece(patch.c, this.fleece[dye], x, y, turn, 0.85 + 0.4 * chance(col, row, salt + 4), Math.floor(chance(col, row, salt + 5) * 6), base)
    this.baked++
  }

  /** How one shape moves now, as what it is; a cloud a wind lies beside is pushed along as well. */
  motion(shape: Shape, toy: Toy): Motion {
    const m = this.move
    motionOf(shape.kind, toy.t, shape.id, shape.id === toy.heldId ? toy.calm : 0, m, shape.veil)
    if (shape.kind === 'cloud' && toy.weather.pushed.includes(shape.id)) m.dx += PUSH * (0.5 - 0.5 * Math.cos(toy.t * 0.9 + shape.id))
    return m
  }

  /** Sets `c` to draw one shape as it lives now: slid, stretched, leant and turned about its pivot. The caller restores. Leaves the motion in `this.move`. */
  place(c: Ctx, shape: Shape, toy: Toy): Motion {
    const m = this.motion(shape, toy)
    // The one squash as it clings, or as it shakes itself free of a veil: down and wide.
    const squash = cling(toy.t - (toy.clungAt.get(shape.id) ?? -10))
    const sx = m.sx * (1 + 0.035 * squash), sy = m.sy * (1 - 0.055 * squash)
    const px = FELT.x + (shape.x0 + m.px * (shape.x1 + 1 - shape.x0)) * CELL, py = FELT.y + (shape.y0 + m.py * (shape.y1 + 1 - shape.y0)) * CELL
    c.save()
    c.translate(px + m.dx, py + m.dy)
    if (m.rot !== 0) c.rotate(m.rot)
    c.transform(sx, 0, -m.skew * sy, sy, 0, 0)
    c.translate(-px, -py)
    return m
  }

  /**
   * Draws every shape of a sheet, oldest first, each moved as what it is. Some shapes are drawn a second time.
   * One under a lit veil has a copy that brightens it: the newest `LIT_COPIES` of them, at every tier, since
   * brightening is the veil's answer. A stream or a wind has a faint copy slid along itself: the newest
   * `seconds` of them, which is the tier's to set, and the rest are counted in `spared`. A shape under a wet
   * veil is drawn thinner, so the dark felt shows through and it darkens, and so is a cloud that rains; where
   * a sun dries its rain the cloud is drawn in two parts, the part on the sun's side thinner (`cloudOf`, which
   * the view reads from the weather). Returns how many draws it made.
   */
  draw(c: Ctx, toy: Toy, sheet: Sheet, seconds: number, cloudOf?: (shape: Shape, look: CloudLook) => void): number {
    let draws = 0, skip = -seconds, skipLit = -LIT_COPIES
    this.spared = 0
    for (const shape of sheet.shapes) {
      if (!this.patches.has(shape.id)) continue
      if (shape.veil === YELLOW) skipLit++
      else if (shape.kind === 'stream' || shape.kind === 'wind') skip++
    }
    for (const shape of sheet.shapes) {
      const patch = this.patches.get(shape.id)
      if (!patch) continue
      const m = this.place(c, shape, toy)
      const dx = FELT.x + patch.x0 * CELL, dy = FELT.y + patch.y0 * CELL, w = patch.cols * CELL, h = patch.rows * CELL
      let cut = -1
      if (shape.veil === BLUE) c.globalAlpha = 0.72
      else if (cloudOf && shape.kind === 'cloud') {
        const look = this.look
        cloudOf(shape, look)
        c.globalAlpha = 1 - RAIN_THIN * look.dark
        // How far the thinning has come across the cloud's own columns from the sun's side: none of it, all of it,
        // or a part, and then the cloud is cut there, at that share of its canvas from the left edge.
        const far = look.side > 0 ? shape.x1 + 1 - look.upTo : look.side < 0 ? look.upTo - shape.x0 : 0
        if (far >= shape.x1 + 1 - shape.x0) c.globalAlpha -= SUN_THIN
        else if (far > 0) cut = (look.upTo - patch.x0) / patch.cols
      }
      if (cut < 0) c.drawImage(patch.canvas, dx, dy, w, h)
      else {
        // In two parts, cut where the thinning has come to: the part on the sun's side is drawn thinner.
        const full = c.globalAlpha, pw = patch.canvas.width, ph = patch.canvas.height, side = this.look.side
        c.globalAlpha = side < 0 ? full - SUN_THIN : full
        c.drawImage(patch.canvas, 0, 0, pw * cut, ph, dx, dy, w * cut, h)
        c.globalAlpha = side > 0 ? full - SUN_THIN : full
        c.drawImage(patch.canvas, pw * cut, 0, pw * (1 - cut), ph, dx + w * cut, dy, w * (1 - cut), h)
        draws++
      }
      c.globalAlpha = 1
      draws++
      const runs = m.flow >= 0 && m.flowBy !== 0, lit = shape.veil === YELLOW, flows = !lit && (shape.kind === 'stream' || shape.kind === 'wind')
      // A copy the tier leaves out is counted, so that a test can hold that a tier leaves out nothing else.
      if (flows && runs && skip - 1 >= 0) this.spared++
      if (lit ? --skipLit < 0 : flows && --skip < 0 && runs) {
        if (lit) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = 0.22 + 0.1 * Math.sin(toy.t * 6 + shape.id) }
        else c.globalAlpha = 0.6 * Math.sin(m.flow * Math.PI)
        c.drawImage(patch.canvas, dx + (runs ? m.flowBy * (m.flow - 0.5) : 0), dy, w, h)
        c.globalAlpha = 1
        c.globalCompositeOperation = 'source-over'
        draws++
      }
      c.restore()
    }
    return draws
  }

  /** The whole sheet as it lies, unmoved, into one canvas the size of the felt: for the picture that swings up to its peg. */
  snapshot(sheet: Sheet, into: Ctx, scale: number): void {
    for (const shape of sheet.shapes) {
      const patch = this.patches.get(shape.id)
      if (!patch) continue
      into.drawImage(patch.canvas, patch.x0 * CELL * scale, patch.y0 * CELL * scale, patch.cols * CELL * scale, patch.rows * CELL * scale)
      this.baked++
    }
  }

  /** How many shapes have a canvas, for a test. */
  get count(): number {
    return this.patches.size
  }

  /** The cells one shape's canvas covers, for a test. */
  boxOf(shape: Shape): { x0: number; y0: number; cols: number; rows: number } | null {
    const patch = this.patches.get(shape.id)
    return patch ? { x0: patch.x0, y0: patch.y0, cols: patch.cols, rows: patch.rows } : null
  }
}
