import { CHALKS, LILAC, bare, box, chalkFill, chalkLine, chalkShape, ring, type Pt } from './chalk'
import { between, type Rng } from './rng'

// The train as a child might chalk it, side on: an engine with a face, and
// open wagons. Each figure is drawn about its own origin, which rests on the
// rail under its middle, facing right; the view places, turns and mirrors it.
// The parts that move by themselves are drawn apart, so the view can move them.

type G = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D
const [WHITE, YELLOW, PINK, BLUE, MINT] = CHALKS

/** Where the engine's eyes look, each in -1..1. */
export type Look = { x: number; y: number }

/** A chalk eye: a solid white ball, a pupil rubbed back to the tar, and a small glint. */
export function eye(g: G, rng: Rng, x: number, y: number, r: number, look: Look = { x: 0, y: 0 }) {
  const white = ring(rng, x, y, r, r * 1.08, 0.03, 18)
  g.save()
  g.globalAlpha = 0.96
  g.fillStyle = WHITE
  g.beginPath()
  white.forEach((p, i) => (i ? g.lineTo(p.x, p.y) : g.moveTo(p.x, p.y)))
  g.closePath()
  g.fill()
  g.restore()
  const px = x + look.x * r * 0.36, py = y + look.y * r * 0.36
  bare(g, ring(rng, px, py, r * 0.5, r * 0.54, 0.03, 14))
  g.save()
  g.fillStyle = WHITE
  g.beginPath()
  g.arc(px - r * 0.16, py - r * 0.2, r * 0.15, 0, Math.PI * 2)
  g.fill()
  g.restore()
}

/** How the engine's body is chalked: striped in a chalk or not, tinted by the puddle or not, or all in white dust. */
export type EngineLook = { stripes: string | null; tint: string | null; white?: boolean }

/**
 * The engine's body, about 150 wide and 110 high, without the parts that
 * move by themselves: its eyes, its mouth, its funnel cap, its wheels and
 * the rod between them.
 */
export function drawEngineBody(g: G, rng: Rng, look: EngineLook = { stripes: null, tint: null }) {
  const body = look.white ? WHITE : (look.tint ?? BLUE), cabFill = look.white ? WHITE : YELLOW, trim = look.white ? WHITE : PINK
  // The cab at the back, with a window.
  const cab = box(rng, -70, -100, 52, 72, 0.16)
  chalkShape(g, rng, cab, cabFill, WHITE, 6, -0.9)
  bare(g, box(rng, -60, -90, 30, 26, 0.25, 0.8))
  chalkLine(g, rng, box(rng, -60, -90, 30, 26, 0.25, 0.8), WHITE, 4, true)
  chalkLine(g, rng, [{ x: -78, y: -103 }, { x: -44, y: -108 }, { x: -10, y: -103 }], trim, 8)
  // The boiler, long and round at the front.
  const boiler: Pt[] = [
    { x: -20, y: -76 }, { x: 14, y: -78 }, { x: 46, y: -77 }, { x: 66, y: -68 }, { x: 74, y: -52 },
    { x: 66, y: -36 }, { x: 46, y: -29 }, { x: 14, y: -28 }, { x: -20, y: -29 }, { x: -22, y: -52 },
  ].map((p) => ({ x: p.x + between(rng, -1.2, 1.2), y: p.y + between(rng, -1.2, 1.2) }))
  chalkShape(g, rng, boiler, body, WHITE, 6.5, -0.35)
  if (look.stripes && !look.white) for (let i = 0; i < 4; i++) chalkLine(g, rng, [{ x: -10 + i * 17, y: -80 }, { x: -16 + i * 17, y: -27 }], look.stripes, 6)
  // The funnel without its cap, and a small dome.
  chalkShape(g, rng, box(rng, 22, -104, 20, 28, 0.1, 1), look.white ? WHITE : LILAC, WHITE, 5, 1.2)
  chalkShape(g, rng, ring(rng, -4, -80, 10, 8, 0.04, 14), trim, WHITE, 4)
  // The footplate, the buffer and the cow-catcher.
  chalkLine(g, rng, [{ x: -72, y: -27 }, { x: 0, y: -25 }, { x: 78, y: -27 }], WHITE, 6)
  // The cow-catcher: a filled wedge, which an open hook was not.
  chalkShape(g, rng, [{ x: 76, y: -27 }, { x: 94, y: -5 }, { x: 64, y: -5 }], trim, null, 4, 0.4)
}

/** The funnel cap, drawn about the middle of its own foot. On the engine it sits at `CAP_AT`. */
export function drawCap(g: G, rng: Rng) {
  chalkLine(g, rng, [{ x: -18, y: 0 }, { x: 0, y: -3 }, { x: 18, y: 0 }], PINK, 9)
  // A knob on top, so that off the funnel it is a lid and not a bare bar.
  chalkLine(g, rng, [{ x: 0, y: -9 }], PINK, 8)
}
export const CAP_AT = { x: 32, y: -107 } as const
/** Where the engine's own moving parts sit on its body: two eyes with their sizes, the mouth, the cheek, and three wheels. */
export const EYES = [{ x: 27, y: -57, r: 14.5 }, { x: 57, y: -56, r: 13.5 }] as const
export const MOUTH = { x: 43, y: -36 } as const
export const CHEEK = { x: 66, y: -38 } as const
export const WHEELS = [{ x: -44, r: 23 }, { x: 8, r: 15 }, { x: 46, r: 15 }] as const
export const WAGON_WHEELS = [{ x: -26, r: 13 }, { x: 26, r: 13 }] as const

/** An open wagon's back board: whoever rides is drawn in front of it and behind the tub. */
export function drawWagonBack(g: G, rng: Rng) {
  chalkLine(g, rng, [{ x: -44, y: -56 }, { x: 0, y: -58 }, { x: 44, y: -56 }], WHITE, 4)
  // Its two posts down to the tub, so that it is a back and not a bar in the air.
  chalkLine(g, rng, [{ x: -44, y: -56 }, { x: -46, y: -44 }], WHITE, 4)
  chalkLine(g, rng, [{ x: 44, y: -56 }, { x: 46, y: -44 }], WHITE, 4)
}

/** An open wagon's tub, about 96 wide, without its wheels. */
export function drawWagonBody(g: G, rng: Rng, colour: string) {
  const tub: Pt[] = [{ x: -48, y: -46 }, { x: 0, y: -47 }, { x: 48, y: -46 }, { x: 43, y: -20 }, { x: 0, y: -18 }, { x: -43, y: -20 }]
    .map((p) => ({ x: p.x + between(rng, -1, 1), y: p.y + between(rng, -1, 1) }))
  chalkShape(g, rng, tub, colour, WHITE, 5.5, 0.5)
  chalkLine(g, rng, [{ x: 48, y: -26 }, { x: 62, y: -25 }], WHITE, 4)
}

/** A wheel about its own middle: a rim, a hub and spokes. The view turns it. */
export function drawWheel(g: G, rng: Rng, r: number) {
  chalkLine(g, rng, ring(rng, 0, 0, r, r, 0.035, 20), WHITE, 5.5, true)
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4
    chalkLine(g, rng, [{ x: -Math.cos(a) * r * 0.8, y: -Math.sin(a) * r * 0.8 }, { x: Math.cos(a) * r * 0.8, y: Math.sin(a) * r * 0.8 }], WHITE, 2.6)
  }
  chalkLine(g, rng, [{ x: 0, y: 0 }], PINK, 5)
}

/** A ghost of a hand, pointing down with one finger: the idle ladder's way of showing a tap. */
export function drawHand(g: G, rng: Rng) {
  const hand: Pt[] = [
    { x: -8, y: 0 }, { x: -9, y: 34 }, { x: -26, y: 30 }, { x: -34, y: 46 }, { x: -30, y: 74 }, { x: -12, y: 92 }, { x: 16, y: 92 },
    { x: 32, y: 76 }, { x: 34, y: 50 }, { x: 22, y: 38 }, { x: 9, y: 36 }, { x: 8, y: 0 }, { x: 0, y: -6 },
  ]
  chalkShape(g, rng, hand, WHITE, WHITE, 5, 0.7)
}

/** One puff of smoke: a loose scribbled cloud. `age` 0 is just out of the funnel, 1 nearly gone. */
export function drawPuff(g: G, rng: Rng, x: number, y: number, age: number) {
  const r = 11 + age * 16
  g.save()
  g.globalAlpha = 1 - age * 0.6
  const cloud = ring(rng, x, y, r * 1.2, r, 0.16, 16)
  chalkFill(g, rng, cloud, WHITE, between(rng, -1, 1), 7, 4.5)
  chalkLine(g, rng, cloud, WHITE, 3.4, true)
  g.restore()
}

/** A stop: a slab to stand on and a post with a round lamp. Nothing is written on it. */
export function drawStop(g: G, rng: Rng) {
  chalkShape(g, rng, box(rng, -56, -10, 112, 16, 0.3, 1), WHITE, WHITE, 4.5, 0.2)
  chalkLine(g, rng, [{ x: -44, y: -10 }, { x: -45, y: -64 }, { x: -44, y: -112 }], WHITE, 6)
  chalkShape(g, rng, ring(rng, -44, -128, 17, 17, 0.04, 16), YELLOW, WHITE, 5)
  chalkLine(g, rng, [{ x: -44, y: -150 }, { x: -44, y: -158 }], YELLOW, 4)
  chalkLine(g, rng, [{ x: -66, y: -138 }, { x: -73, y: -142 }], YELLOW, 4)
  chalkLine(g, rng, [{ x: -22, y: -138 }, { x: -15, y: -142 }], YELLOW, 4)
  void MINT
}
