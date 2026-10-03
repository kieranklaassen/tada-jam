import { CHALKS, GREEN, LILAC, ORANGE, RED, bare, box, chalkFill, chalkLine, chalkShape, ring, type Pt } from './chalk'
import { eye, type Look } from './figures'
import { between, type Rng } from './rng'

// The four riders and their four homes, chalked. Each is drawn about its own
// origin: a rider's is under its feet, facing right, and a home's is the
// middle of its foot. The caller places and mirrors them.

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
  chalkShape(g, rng, shake(rng, [{ x: -24, y: -38 }, { x: -6, y: -34 }, { x: -18, y: -20 }]), ORANGE, WHITE, 3.5, 0.9)
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
  chalkLine(g, rng, [{ x: 40, y: -34 }, { x: 37, y: -52 }, { x: 36, y: -62 }], MINT, 4.5)
  chalkLine(g, rng, [{ x: 48, y: -32 }, { x: 52, y: -50 }, { x: 56, y: -58 }], MINT, 4.5)
  eye(g, rng, 36, -67, 7.5, look)
  eye(g, rng, 57, -63, 7.5, look)
  chalkLine(g, rng, [{ x: 42, y: -20 }, { x: 48, y: -17 }, { x: 53, y: -21 }], WHITE, 2.8)
}

/** The cat: sitting, tail curled up behind, ears pricked. About 78 wide and 96 high. */
export function drawCat(g: G, rng: Rng, look: Look = { x: 0.4, y: 0 }) {
  chalkLine(g, rng, [{ x: -18, y: -8 }, { x: -38, y: -14 }, { x: -44, y: -36 }, { x: -34, y: -52 }, { x: -40, y: -62 }], ORANGE, 8)
  chalkShape(g, rng, ring(rng, -2, -30, 25, 30, 0.04, 22), ORANGE, WHITE, 5.5, -0.5)
  for (let i = 0; i < 3; i++) chalkLine(g, rng, [{ x: -22 + i * 3, y: -40 + i * 11 }, { x: -9 + i * 2, y: -37 + i * 11 }], RED, 4)
  chalkShape(g, rng, shake(rng, [{ x: -8, y: -76 }, { x: -4, y: -98 }, { x: 8, y: -84 }], 0.6), ORANGE, WHITE, 4)
  chalkShape(g, rng, shake(rng, [{ x: 16, y: -84 }, { x: 28, y: -98 }, { x: 31, y: -76 }], 0.6), ORANGE, WHITE, 4)
  chalkShape(g, rng, ring(rng, 12, -66, 22, 19, 0.04, 20), ORANGE, WHITE, 5.5, 0.6)
  dot(g, rng, 6 + look.x * 2.5, -69 + look.y * 2.5, 4.6)
  dot(g, rng, 22 + look.x * 2.5, -69 + look.y * 2.5, 4.6)
  chalkLine(g, rng, [{ x: 15, y: -61 }], PINK, 4.5)
  chalkLine(g, rng, [{ x: 9, y: -56 }, { x: 15, y: -53 }, { x: 21, y: -56 }], WHITE, 2.6)
  chalkLine(g, rng, [{ x: 28, y: -60 }, { x: 44, y: -64 }], WHITE, 2)
  chalkLine(g, rng, [{ x: 28, y: -56 }, { x: 44, y: -54 }], WHITE, 2)
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
  chalkLine(g, rng, [{ x: 8, y: -14 }, { x: 22, y: -16 }, { x: 34, y: -13 }], WHITE, 2.6)
}

/** The chick's nest: a bowl of straw with a leaf. */
export function drawNest(g: G, rng: Rng) {
  const bowl = shake(rng, [{ x: -58, y: -44 }, { x: -30, y: -34 }, { x: 0, y: -32 }, { x: 30, y: -34 }, { x: 58, y: -44 }, { x: 44, y: -12 }, { x: 0, y: -3 }, { x: -44, y: -12 }])
  chalkShape(g, rng, bowl, ORANGE, WHITE, 5, 0.9)
  for (let i = 0; i < 9; i++) {
    const x = -52 + i * 13
    chalkLine(g, rng, [{ x, y: -40 + Math.abs(i - 4) * -1.5 }, { x: x + between(rng, -14, 14), y: -56 - between(rng, 0, 10) }], YELLOW, 3.4)
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

export const RIDER_FIGURES = { frog: drawFrog, chick: drawChick, snail: drawSnail, cat: drawCat } as const
export const HOME_FIGURES = { frog: drawPond, chick: drawNest, snail: drawLettuce, cat: drawCushion } as const
