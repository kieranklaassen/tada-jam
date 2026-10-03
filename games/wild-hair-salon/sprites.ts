import { HEAD, fit } from './layout'
import { LION, plume } from './paintAnimals'
import { paintBench, paintChair, paintMirror, paintWalls } from './paintRoom'
import { PLAIN, capeOutline } from './paintStrips'
import { tuftPose } from './poses'
import { makeRng } from './rng'
import { Watercolour, blob, boxOf, type Box, type Ctx, type MakeSheet, type Point, type Sheet } from './wash'

// The painted pieces of the toy. Each is painted once into a sheet of its
// own and afterwards only moved, turned and stretched: a wash never blurs or
// blooms again while it moves. A tuft of the mane is painted again only when
// its length has changed enough to show. Every piece is painted over bare
// paper of its own, so it keeps its colour and its white halo whatever it
// passes in front of.

/** A painted piece: its sheet, and the box of scene units it covers around its own origin. */
export type Sprite = { sheet: Sheet; box: Box }

/** While a tuft is held it is only stretched; it is painted again once it is this much longer or shorter than its sheet. */
const REPAINT = { shorter: 0.8, longer: 1.3 }

export class Sprites {
  private readonly makeSheet: MakeSheet
  private readonly seed: number
  /** Device pixels to a scene unit. */
  readonly scale: number
  private readonly paint: Watercolour
  private tufts: ({ steps: number; sprite: Sprite } | undefined)[] = []
  /** How many times a tuft has been painted, for a test and for the grown-up overlay. */
  repaints = 0

  /** The whole surface behind everything: paper, wall, floor, mirror, chair and bench. */
  readonly backdrop: Sheet
  readonly ruff: Sprite
  readonly face: Sprite
  readonly ear: Sprite
  readonly cape: Sprite
  readonly tailTuft: Sprite
  readonly glow: Sprite

  constructor(makeSheet: MakeSheet, width: number, height: number, seed: number) {
    this.makeSheet = makeSheet
    this.seed = seed
    const f = fit(width, height)
    this.scale = f.scale
    this.paint = new Watercolour(makeSheet, makeRng(seed), Math.max(f.scale, 0.01))

    this.backdrop = makeSheet(Math.max(1, width), Math.max(1, height))
    if (f.scale > 0) {
      const g = this.backdrop.g, rng = makeRng(seed + 1)
      this.paint.from(rng).paper(g, width, height)
      g.setTransform(f.scale, 0, 0, f.scale, f.dx, f.dy)
      paintWalls(g, this.paint, rng)
      paintMirror(g, this.paint, rng)
      paintBench(g, this.paint, rng)
      paintChair(g, this.paint, rng)
      g.setTransform(1, 0, 0, 1, 0, 0)
    }

    this.ruff = this.piece(2, (rng) => blob(rng, 0, 4, HEAD.rx + 30, HEAD.ry + 24, 0.09, 22), (g, paint, outline) => {
      paint.wash(g, outline, { color: LION.mane, edge: LION.maneEdge, blooms: [LION.maneGlow, LION.maneBloom], strength: 0.78, reserve: true })
    })
    this.face = this.piece(3, (rng) => blob(rng, 0, 0, HEAD.rx, HEAD.ry, 0.035, 18), (g, paint, outline, rng) => {
      paint.wash(g, outline, { color: LION.fur, edge: LION.furEdge, blooms: [LION.blush, LION.maneGlow], strength: 0.9, grain: 0.14, reserve: true })
      paint.pencil(g, outline, true)
      for (const side of [-1, 1]) paint.wash(g, blob(rng, side * 66, 22, 20, 14, 0.06, 8), { color: LION.blush, bleed: 6, strength: 0.5 })
    })
    // One ear, painted for the right side; the left is the same sheet turned over.
    this.ear = this.piece(4, (rng) => blob(rng, 0, -14, 30, 28, 0.05, 10), (g, paint, outline) => {
      paint.wash(g, outline, { color: LION.fur, edge: LION.furEdge, blooms: [LION.blush], reserve: true })
      paint.pencil(g, outline, true, 0.8)
    })
    this.cape = this.piece(5, () => capeOutline(), (g, paint, outline) => {
      paint.wash(g, outline, { color: PLAIN.cape, edge: PLAIN.capeEdge, flat: true })
      paint.pencil(g, outline, true)
      const top = outline[0].y, half = 96
      const collar: Point[] = [{ x: HEAD.x - half, y: top - 9 }, { x: HEAD.x, y: top - 5 }, { x: HEAD.x + half, y: top - 9 }, { x: HEAD.x + half + 4, y: top + 7 }, { x: HEAD.x, y: top + 10 }, { x: HEAD.x - half - 4, y: top + 7 }]
      paint.wash(g, collar, { color: PLAIN.collar, edge: PLAIN.capeEdge, flat: true })
      paint.pencil(g, collar, true, 0.8)
    })
    this.tailTuft = this.piece(6, () => plume(0, 0, 0, 66, 52, 0.3), (g, paint, outline) => {
      paint.wash(g, outline, { color: LION.mane, edge: LION.maneEdge, blooms: [LION.maneBloom], reserve: true })
    })
    this.glow = this.makeGlow()
  }

  /** Paints one piece on a sheet of its own, from a stream of its own. */
  private piece(n: number, shape: (rng: ReturnType<typeof makeRng>) => Point[], paintIt: (g: Ctx, paint: Watercolour, outline: Point[], rng: ReturnType<typeof makeRng>) => void): Sprite {
    const rng = makeRng(this.seed * 31 + n)
    const outline = shape(rng), box = boxOf(outline, 14), s = Math.max(this.scale, 0.01)
    const sheet = this.makeSheet(Math.max(1, Math.ceil(box.w * s)), Math.max(1, Math.ceil(box.h * s)))
    sheet.g.setTransform(s, 0, 0, s, -box.x * s, -box.y * s)
    paintIt(sheet.g, this.paint.from(rng), outline, rng)
    sheet.g.setTransform(1, 0, 0, 1, 0, 0)
    return { sheet, box }
  }

  /** The soft warm light behind the thing a child could touch next: a round patch that fades to nothing at its rim. */
  private makeGlow(): Sprite {
    const box: Box = { x: -60, y: -60, w: 120, h: 120 }, s = Math.max(this.scale, 0.01)
    const sheet = this.makeSheet(Math.max(1, Math.ceil(box.w * s)), Math.max(1, Math.ceil(box.h * s)))
    const g = sheet.g
    g.setTransform(s, 0, 0, s, -box.x * s, -box.y * s)
    const fade = g.createRadialGradient(0, 0, 0, 0, 0, 60)
    fade.addColorStop(0, 'rgba(255,196,46,0.95)')
    fade.addColorStop(0.55, 'rgba(255,196,46,0.6)')
    fade.addColorStop(1, 'rgba(255,196,46,0)')
    g.fillStyle = fade
    g.fillRect(-60, -60, 120, 120)
    g.setTransform(1, 0, 0, 1, 0, 0)
    return { sheet, box }
  }

  /**
   * A tuft of the mane, painted pointing straight up from its root at the
   * origin. `held` says it is in the fingers: then the sheet it has is kept
   * and stretched until the length is far enough off to show. Returns the
   * sprite and the length it was painted at.
   */
  tuft(index: number, steps: number, count: number, held: boolean): { sprite: Sprite; steps: number } {
    const have = this.tufts[index]
    if (have) {
      const ratio = tuftPose(index, steps, count).reach / tuftPose(index, have.steps, count).reach
      if (have.steps === steps || (held && ratio >= REPAINT.shorter && ratio <= REPAINT.longer)) return have
    }
    const pose = tuftPose(index, steps, count)
    const sprite = this.piece(20 + index, () => plume(0, 0, 0, pose.reach, pose.width, pose.curl), (g, paint, outline) => {
      paint.wash(g, outline, { color: LION.mane, edge: LION.maneEdge, blooms: [LION.maneBloom, LION.maneGlow], strength: 0.82, reserve: true })
      // Two strands in pencil up from the root, either side of the middle.
      const mid = (a: Point, b: Point, t = 0.5): Point => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t })
      paint.pencil(g, [mid(outline[0], outline[8], 0.25), mid(outline[1], outline[7], 0.25), mid(outline[2], outline[6], 0.25)], false, 0.55)
      paint.pencil(g, [mid(outline[0], outline[8], 0.75), mid(outline[1], outline[7], 0.75), mid(outline[2], outline[6], 0.75)], false, 0.55)
    })
    this.repaints++
    this.tufts[index] = { steps, sprite }
    return this.tufts[index]!
  }
}
