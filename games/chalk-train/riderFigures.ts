import { CHALKS, GREEN, LILAC, ORANGE, RED, bare, box, chalkFill, chalkLine, chalkShape, ring, type Pt } from './chalk'
import { eye, type Look } from './figures'
import { between, type Rng } from './rng'

// The four riders and their four homes, chalked. Each is drawn about its own
// origin: a rider's is under its feet, facing right, and a home's is the
// middle of its foot. The view places and mirrors them. The one part of each
// rider that is funniest is left out here and drawn by the view, which moves
// it: the frog's throat, the chick's wing, the snail's eye stalks, the cat's tail.

type G = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
const [WHITE, YELLOW, PINK, BLUE, MINT] = CHALKS
const shake = (rng: Rng, pts: Pt[], by = 1): Pt[] => pts.map((p) => ({ x: p.x + between(rng, -by, by), y: p.y + between(rng, -by, by) }))

/** A pupil-sized dot rubbed back to the tar, for small eyes on a filled body. */
function dot(g: G, rng: Rng, x: number, y: number, r: number) {
  bare(g, ring(rng, x, y, r, r * 1.1, 0.03, 10))
  g.save()
  g.fillStyle = WHITE
  g.beginPath()
  g.arc(x - r * 0.3, y - r * 0.35, r * 0.3, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** The frog: squat and wide, eyes on top, a long smile. About 80 wide and 66 high. */
export function drawFrog(g: G, rng: Rng, look: Look = { x: 0.4, y: -0.2 }) {
  chalkLine(g, rng, [{ x: -30, y: -12 }, { x: -44, y: -2 }, { x: -26, y: -2 }], GREEN, 7)
  chalkLine(g, rng, [{ x: 26, y: -12 }, { x: 42, y: -2 }, { x: 24, y: -2 }], GREEN, 7)
  chalkShape(g, rng, ring(rng, 0, -27, 36, 25, 0.04, 22), GREEN, WHITE, 5.5, -0.6)
  chalkShape(g, rng, ring(rng, 2, -17, 20, 11, 0.04, 16), YELLOW, null, 4, 0.2)
  eye(g, rng, -15, -53, 12, look)
  eye(g, rng, 15, -53, 12, look)
  chalkLine(g, rng, [{ x: -20, y: -33 }, { x: 0, y: -26 }, { x: 22, y: -34 }], WHITE, 3.6)
  chalkLine(g, rng, [{ x: 27, y: -27 }], PINK, 6)
  chalkLine(g, rng, [{ x: -25, y: -26 }], PINK, 6)
}

/** The chick: a ball with a beak, stub wings and a tuft. About 62 wide and 72 high. */
export function drawChick(g: G, rng: Rng, look: Look = { x: 0.4, y: 0 }) {
  chalkLine(g, rng, [{ x: -8, y: -8 }, { x: -9, y: 0 }, { x: -16, y: 0 }], ORANGE, 4.5)
  chalkLine(g, rng, [{ x: 8, y: -8 }, { x: 9, y: 0 }, { x: 16, y: 0 }], ORANGE, 4.5)
  chalkShape(g, rng, ring(rng, 0, -34, 29, 28, 0.04, 22), YELLOW, WHITE, 5.5, -0.4)
  chalkLine(g, rng, [{ x: -6, y: -62 }, { x: -9, y: -74 }], YELLOW, 4)
  chalkLine(g, rng, [{ x: 0, y: -63 }, { x: 1, y: -77 }], YELLOW, 4)
  chalkLine(g, rng, [{ x: 6, y: -62 }, { x: 11, y: -73 }], YELLOW, 4)
  chalkShape(g, rng, shake(rng, [{ x: 26, y: -42 }, { x: 44, y: -36 }, { x: 26, y: -30 }], 0.6), ORANGE, null, 4)
  dot(g, rng, 12 + look.x * 3, -44 + look.y * 3, 5.5)
  chalkLine(g, rng, [{ x: 17, y: -27 }], PINK, 6)
}

/** The snail: a spiral shell on a long soft foot, eyes on stalks. About 96 wide and 70 high. */
export function drawSnail(g: G, rng: Rng, look: Look = { x: 0.4, y: -0.2 }) {
  const foot = shake(rng, [{ x: -46, y: -3 }, { x: -30, y: -13 }, { x: 4, y: -15 }, { x: 34, y: -20 }, { x: 44, y: -36 }, { x: 54, y: -22 }, { x: 50, y: -5 }, { x: 10, y: -1 }])
  chalkShape(g, rng, foot, MINT, WHITE, 5, 0.3)
  chalkShape(g, rng, ring(rng, -8, -36, 27, 26, 0.04, 22), LILAC, WHITE, 5.5, -0.7)
  const spiral: Pt[] = []
  for (let i = 0; i <= 26; i++) {
    const a = i * 0.42, r = 21 - i * 0.74
    spiral.push({ x: -8 + Math.cos(a) * r, y: -36 + Math.sin(a) * r })
  }
  chalkLine(g, rng, spiral, PINK, 4)
  void look
  chalkLine(g, rng, [{ x: 42, y: -20 }, { x: 48, y: -17 }, { x: 53, y: -21 }], WHITE, 2.8)
}

/** The cat: sitting, tail curled up behind, ears pricked. About 78 wide and 96 high. */
export function drawCat(g: G, rng: Rng, look: Look = { x: 0.4, y: 0 }) {
  chalkShape(g, rng, ring(rng, -2, -30, 25, 30, 0.04, 22), ORANGE, WHITE, 5.5, -0.5)
  // Tabby stripes: curved, of three lengths and three slants, so that they do not read as bars.
  chalkLine(g, rng, [{ x: -24, y: -44 }, { x: -15, y: -47 }, { x: -6, y: -42 }], RED, 4)
  chalkLine(g, rng, [{ x: -23, y: -30 }, { x: -16, y: -34 }, { x: -11, y: -31 }], RED, 4)
  chalkLine(g, rng, [{ x: -18, y: -17 }, { x: -9, y: -22 }, { x: 1, y: -19 }], RED, 4)
  // Its ears are drawn by the view, which lays them back on a fast run.
  chalkShape(g, rng, ring(rng, 12, -66, 22, 19, 0.04, 20), ORANGE, WHITE, 5.5, 0.6)
  dot(g, rng, 6 + look.x * 2.5, -69 + look.y * 2.5, 4.6)
  dot(g, rng, 22 + look.x * 2.5, -69 + look.y * 2.5, 4.6)
  chalkLine(g, rng, [{ x: 15, y: -61 }], PINK, 4.5)
  chalkLine(g, rng, [{ x: 9, y: -56 }, { x: 15, y: -53 }, { x: 21, y: -56 }], WHITE, 2.6)
  // Three whiskers fanning out from one spot on its cheek.
  chalkLine(g, rng, [{ x: 27, y: -58 }, { x: 43, y: -70 }], WHITE, 2)
  chalkLine(g, rng, [{ x: 27, y: -58 }, { x: 47, y: -59 }], WHITE, 2)
  chalkLine(g, rng, [{ x: 27, y: -58 }, { x: 42, y: -48 }], WHITE, 2)
  chalkLine(g, rng, [{ x: 6, y: -6 }, { x: 8, y: 0 }], WHITE, 5)
  chalkLine(g, rng, [{ x: 16, y: -6 }, { x: 18, y: 0 }], WHITE, 5)
}

/** The frog's pond: scribbled blue water with a lily pad and one reed. */
export function drawPond(g: G, rng: Rng) {
  chalkShape(g, rng, ring(rng, 0, -22, 78, 30, 0.05, 26), BLUE, WHITE, 5.5, 0.15)
  chalkShape(g, rng, ring(rng, -26, -24, 20, 9, 0.05, 14), GREEN, null, 4, 0.8)
  chalkLine(g, rng, [{ x: -26, y: -26 }], PINK, 7)
  chalkLine(g, rng, [{ x: 50, y: -24 }, { x: 53, y: -58 }, { x: 52, y: -82 }], GREEN, 4.5)
  chalkLine(g, rng, [{ x: 52, y: -84 }, { x: 52, y: -98 }], ORANGE, 8)
  // A ripple on the water: a bowed arc, which a straight stroke was not.
  chalkLine(g, rng, [{ x: 6, y: -11 }, { x: 12, y: -16 }, { x: 21, y: -18 }, { x: 30, y: -16 }, { x: 36, y: -11 }], WHITE, 2.6)
}

/** The chick's nest: a bowl of straw with a leaf. */
export function drawNest(g: G, rng: Rng) {
  const bowl = shake(rng, [{ x: -58, y: -44 }, { x: -30, y: -34 }, { x: 0, y: -32 }, { x: 30, y: -34 }, { x: 58, y: -44 }, { x: 44, y: -12 }, { x: 0, y: -3 }, { x: -44, y: -12 }])
  chalkShape(g, rng, bowl, ORANGE, WHITE, 5, 0.9)
  for (let i = 0; i < 9; i++) {
    const x = -52 + i * 13
    // The straws fan outward and never cross: two that crossed would read as a sign.
    chalkLine(g, rng, [{ x, y: -40 + Math.abs(i - 4) * -1.5 }, { x: x + (i - 4) * 3.5 + between(rng, -2.5, 2.5), y: -56 - between(rng, 0, 10) }], YELLOW, 3.4)
  }
  chalkShape(g, rng, shake(rng, [{ x: 50, y: -52 }, { x: 70, y: -70 }, { x: 78, y: -50 }]), GREEN, null, 4, 0.3)
}

/** The snail's lettuce: one big ruffled leaf. */
export function drawLettuce(g: G, rng: Rng) {
  const leaf: Pt[] = []
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2, ruffle = 1 + (i % 2 ? 0.13 : -0.04)
    leaf.push({ x: Math.cos(a) * 62 * ruffle, y: -34 + Math.sin(a) * 32 * ruffle })
  }
  chalkShape(g, rng, shake(rng, leaf), GREEN, WHITE, 5, -0.2)
  chalkLine(g, rng, [{ x: -50, y: -30 }, { x: 0, y: -36 }, { x: 52, y: -32 }], MINT, 4.5)
  for (let i = -2; i <= 2; i++) if (i) chalkLine(g, rng, [{ x: i * 18, y: -35 }, { x: i * 24, y: -35 - 18 * Math.sign(i) * (i % 2 ? 1 : -1) }], MINT, 3)
}

/** The cat's cushion, lying in a patch of sun. */
export function drawCushion(g: G, rng: Rng) {
  chalkFill(g, rng, ring(rng, 0, -20, 92, 32, 0.05, 24), YELLOW, 0.1, 13, 6)
  const pad = box(rng, -50, -50, 100, 40, 0.42, 1.4)
  chalkShape(g, rng, pad, PINK, WHITE, 5.5, -0.7)
  chalkLine(g, rng, [{ x: 0, y: -30 }], WHITE, 5)
  for (const [x, y] of [[-54, -48], [54, -48], [-54, -12], [54, -12]] as const) chalkLine(g, rng, [{ x, y }, { x: x + Math.sign(x) * 10, y: y + (y < -30 ? -8 : 8) }], LILAC, 4)
}

/** The cat's two ears, each from its root on the head: pricked as drawn, laid back by the view. */
export const CAT_EARS = [
  { root: { x: 0, y: -80 }, pts: [{ x: -8, y: 4 }, { x: -4, y: -18 }, { x: 8, y: -4 }] },
  { root: { x: 24, y: -80 }, pts: [{ x: -8, y: -4 }, { x: 4, y: -18 }, { x: 7, y: 4 }] },
] as const

export const RIDER_FIGURES = { frog: drawFrog, chick: drawChick, snail: drawSnail, cat: drawCat } as const
export const HOME_FIGURES = { frog: drawPond, chick: drawNest, snail: drawLettuce, cat: drawCushion } as const

/** Where a rider's moving parts sit on its figure. Eyes with a white are balls; the others are dots on the body's own colour. */
export const RIDER_PARTS = {
  frog: { eyes: [{ x: -15, y: -53, r: 12 }, { x: 15, y: -53, r: 12 }], ball: true, body: GREEN, part: { x: 4, y: -16 }, high: 66 },
  chick: { eyes: [{ x: 12, y: -44, r: 5.5 }], ball: false, body: YELLOW, part: { x: -14, y: -32 }, high: 72 },
  snail: { eyes: [{ x: 36, y: -67, r: 7.5 }, { x: 57, y: -63, r: 7.5 }], ball: true, body: MINT, part: { x: 44, y: -33 }, high: 70 },
  cat: { eyes: [{ x: 6, y: -69, r: 4.6 }, { x: 22, y: -69, r: 4.6 }], ball: false, body: ORANGE, part: { x: -18, y: -8 }, high: 96 },
} as const
