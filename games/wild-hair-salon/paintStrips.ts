import { BENCH_GROUND, CAPE, CHAIR, COLLAR_Y, STEP, STRIP_W, capeHalfWidthAt, tipY } from './layout'
import type { Rng } from './rng'
import { blob, type Ctx, type Point, type Watercolour } from './wash'

// The pieces the child works with, and the plain surface they lie on. These
// are painted flat: one even coat each, a crisp edge and a pencil line, with
// no blooms, no grain and no pattern, so that a strip shows its length and
// nothing else (pack: game-design, working-objects-stay-plain.md).

export const PLAIN = {
  cape: '#aed8ec', capeEdge: '#6da9cc', collar: '#7fb8d8', knot: '#5c9fc8', knotEdge: '#3f7fa8',
} as const

/**
 * The spare cape at the bench: the ground the friend's lock is read against
 * when the friend sits across the room. One flat coat of the cape's own colour,
 * a little wider where it lies on the floor, with nothing on it: no fold line,
 * no stripe and no edge anywhere a strip can hang. Its own edge and its hook
 * are outside that.
 */
export function benchGroundOutline(): Point[] {
  const { x, y, w, h, flare } = BENCH_GROUND
  return [
    { x: x + 6, y }, { x: x + w - 6, y }, { x: x + w, y: y + 10 },
    { x: x + w + flare * 0.4, y: y + h * 0.6 }, { x: x + w + flare, y: y + h - 8 }, { x: x + w + flare - 10, y: y + h },
    { x: x - flare + 10, y: y + h }, { x: x - flare, y: y + h - 8 }, { x: x - flare * 0.4, y: y + h * 0.6 }, { x, y: y + 10 },
  ]
}

export function paintBenchGround(g: Ctx, paint: Watercolour): void {
  const outline = benchGroundOutline(), { x, y, w } = BENCH_GROUND
  // The hook it hangs from, on the wall above it.
  paint.pencil(g, [{ x: x + w / 2 - 8, y: y - 16 }, { x: x + w / 2, y: y - 24 }, { x: x + w / 2 + 8, y: y - 16 }, { x: x + w / 2, y: y + 2 }], false, 1)
  paint.wash(g, outline, { color: PLAIN.cape, edge: PLAIN.capeEdge, flat: true })
  paint.pencil(g, outline, true)
}

/** The cape as a bell from the collar to the hem. */
export function capeOutline(): Point[] {
  const left: Point[] = [], right: Point[] = []
  for (let i = 0; i <= 6; i++) {
    const y = COLLAR_Y + ((CAPE.hemY - COLLAR_Y) * i) / 6
    const half = capeHalfWidthAt(y)
    left.push({ x: CHAIR.x - half, y })
    right.push({ x: CHAIR.x + half, y })
  }
  // A hem that hangs in three soft folds.
  const hem: Point[] = [1, 2, 3, 4, 5].map((i) => ({ x: CHAIR.x + CAPE.hemHalf - (CAPE.hemHalf * 2 * i) / 6, y: CAPE.hemY + (i % 2 === 0 ? 10 : -2) }))
  return [...right, ...hem, ...left.reverse()]
}

export function paintCape(g: Ctx, paint: Watercolour, rng: Rng): void {
  const outline = capeOutline()
  paint.wash(g, outline, { color: PLAIN.cape, edge: PLAIN.capeEdge, flat: true })
  paint.pencil(g, outline, true)
  // The collar: the level line every strip hangs from.
  const collar: Point[] = [
    { x: CHAIR.x - CAPE.collarHalf - 4, y: COLLAR_Y - 9 }, { x: CHAIR.x, y: COLLAR_Y - 5 }, { x: CHAIR.x + CAPE.collarHalf + 4, y: COLLAR_Y - 9 },
    { x: CHAIR.x + CAPE.collarHalf + 8, y: COLLAR_Y + 7 }, { x: CHAIR.x, y: COLLAR_Y + 10 }, { x: CHAIR.x - CAPE.collarHalf - 8, y: COLLAR_Y + 7 },
  ]
  paint.wash(g, collar, { color: PLAIN.collar, edge: PLAIN.capeEdge, flat: true })
  paint.pencil(g, collar, true, 0.8)
  // The knot the cape is pulled off by: two loops and two tails, with a darker edge so it reads as a thing to take hold of.
  const kx = CHAIR.x - CAPE.collarHalf + 6, ky = COLLAR_Y + 4
  for (const side of [-1, 1]) {
    const loop = blob(rng, kx + side * 21, ky - 5, 19, 12, 0.05, 10)
    paint.wash(g, loop, { color: PLAIN.knot, edge: PLAIN.knotEdge, flat: true })
    paint.pencil(g, loop, true, 0.8)
    paint.wash(g, [{ x: kx + side * 3, y: ky + 4 }, { x: kx + side * 13, y: ky + 6 }, { x: kx + side * 24, y: ky + 44 }, { x: kx + side * 10, y: ky + 42 }], { color: PLAIN.knot, edge: PLAIN.knotEdge, flat: true, sharp: true })
  }
  paint.wash(g, blob(rng, kx, ky, 9, 9, 0.04, 8), { color: PLAIN.knotEdge, flat: true })
}

/** A strip that hangs from the collar: `steps` long, straight, one colour, with a rounded free end. */
export function stripOutline(x: number, steps: number): Point[] {
  const half = STRIP_W / 2, top = COLLAR_Y, tip = tipY(Math.max(0, steps))
  const round = Math.min(half, Math.max(0, tip - top))
  const out: Point[] = [{ x: x - half, y: top }, { x: x + half, y: top }]
  // The free end is half a circle, so the end of the strip is one clear point.
  for (let i = 0; i <= 8; i++) {
    const a = (i / 8) * Math.PI
    out.push({ x: x + Math.cos(a) * half, y: tip - round + Math.sin(a) * round })
  }
  return out
}

export function paintStrip(g: Ctx, paint: Watercolour, x: number, steps: number, color: string, edge: string): void {
  const outline = stripOutline(x, steps)
  paint.wash(g, outline, { color, edge, flat: true, sharp: true, strength: 1 })
  paint.pencil(g, outline, true, 0.9, true)
}

/** A cut piece lying on the floor: the same flat strip, as long as what was cut off, lying on its side. */
export function paintClipping(g: Ctx, paint: Watercolour, x: number, y: number, steps: number, turn: number, color: string, edge: string): void {
  const length = steps * STEP, half = STRIP_W / 2
  const c = Math.cos(turn), s = Math.sin(turn)
  const at = (u: number, v: number): Point => ({ x: x + u * c - v * s, y: y + u * s + v * c })
  const outline = [at(0, -half), at(length, -half), at(length, half), at(0, half)]
  paint.wash(g, outline, { color, edge, flat: true, sharp: true, strength: 1 })
  paint.pencil(g, outline, true, 0.8, true)
}
