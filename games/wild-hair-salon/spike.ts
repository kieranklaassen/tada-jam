import { BESIDE_X, FLOOR_Y, LOCK_X, fit } from './layout'
import { LION, POODLE, paintLion, paintPoodle } from './paintAnimals'
import { paintRoom } from './paintRoom'
import { paintCape, paintClipping, paintStrip } from './paintStrips'
import { makeRng } from './rng'
import { Watercolour, type Ctx, type MakeSheet, type Sheet } from './wash'

// The look spike: the game's real scene in wet watercolour, painted once from
// a fixed seed and shown by the Mount at load. Nothing in it can be played.
// It is the first position of the designed order: the lion in the chair, the
// poodle beside him as his model, his lock plainly the longer of the two,
// and the next pair at the door under their rain hats.

export const SPIKE_SEED = 20261003

/** The state the spike shows: nine tuft lengths, the two lock lengths, and two pieces on the floor. All in steps. */
export const SPIKE = {
  mane: [58, 22, 84, 40, 96, 30, 72, 16, 64],
  lock: 78,
  model: 50,
  clippings: [{ x: 386, y: FLOOR_Y + 66, steps: 22, turn: 0.12 }, { x: 640, y: FLOOR_Y + 84, steps: 13, turn: -0.2 }],
} as const

/** Paints the whole salon on a surface of `width` by `height` device pixels. Returns how many pieces it laid down. */
export function paintSalon(g: Ctx, makeSheet: MakeSheet, width: number, height: number, seed: number = SPIKE_SEED): number {
  const f = fit(width, height)
  if (f.scale <= 0) return 0
  const rng = makeRng(seed)
  const paint = new Watercolour(makeSheet, rng, f.scale)
  g.setTransform(1, 0, 0, 1, 0, 0)
  paint.paper(g, width, height)
  g.setTransform(f.scale, 0, 0, f.scale, f.dx, f.dy)
  paintRoom(g, paint, rng)
  paintCape(g, paint, rng)
  paintStrip(g, paint, LOCK_X, SPIKE.lock, LION.lock, LION.lockEdge)
  paintStrip(g, paint, BESIDE_X, SPIKE.model, POODLE.lock, POODLE.lockEdge)
  paintLion(g, paint, rng, SPIKE.mane)
  paintPoodle(g, paint, rng)
  for (const piece of SPIKE.clippings) paintClipping(g, paint, piece.x, piece.y, piece.steps, piece.turn, LION.lock, LION.lockEdge)
  g.setTransform(1, 0, 0, 1, 0, 0)
  return paint.laid
}

/** Keeps the painted salon on a sheet of its own and copies it to the surface: painting happens once for each size, never per frame. */
export class SpikeView {
  private readonly makeSheet: MakeSheet
  private sheet: Sheet | null = null
  private laid = 0

  constructor(makeSheet: MakeSheet) {
    this.makeSheet = makeSheet
  }

  /** Draws the salon on `g`, whose surface is `width` by `height` device pixels. Returns the draws this frame cost. */
  draw(g: Ctx, width: number, height: number): number {
    if (!(width > 0) || !(height > 0)) return 0
    if (!this.sheet || this.sheet.canvas.width !== width || this.sheet.canvas.height !== height) {
      this.sheet = this.makeSheet(width, height)
      this.laid = paintSalon(this.sheet.g, this.makeSheet, width, height)
    }
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.globalCompositeOperation = 'source-over'
    g.globalAlpha = 1
    g.drawImage(this.sheet.canvas, 0, 0)
    return 1
  }

  /** How many washes and lines the painted salon is made of. */
  get pieces(): number {
    return this.laid
  }
}

/** Sheets from the browser. Kept out of the painter so a test can pass its own. */
export function browserSheet(width: number, height: number): Sheet {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  return { canvas, g: canvas.getContext('2d')! }
}
