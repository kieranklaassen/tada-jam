import { CHALKS, LILAC, ORANGE, bare, box, chalkFill, chalkLine, chalkShape, ring, type Pt } from './chalk'
import { between, type Rng } from './rng'

// The train as a child might chalk it, side on: an engine with a face, and
// open wagons. Each figure is drawn about its own origin, which rests on the
// rail under its middle, facing right; the caller places, turns and mirrors it.

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

/** A wheel resting on the rail at x: a rim, a hub and spokes turned by `spin`. */
export function wheel(g: G, rng: Rng, x: number, r: number, spin = 0, colour: string = WHITE) {
  const cy = -r
  chalkLine(g, rng, ring(rng, x, cy, r, r, 0.035, 20), colour, 5.5, true)
  for (let i = 0; i < 4; i++) {
    const a = spin + (i * Math.PI) / 4
    chalkLine(g, rng, [{ x: x - Math.cos(a) * r * 0.8, y: cy - Math.sin(a) * r * 0.8 }, { x: x + Math.cos(a) * r * 0.8, y: cy + Math.sin(a) * r * 0.8 }], colour, 2.6)
  }
  chalkLine(g, rng, [{ x, y: cy }], PINK, 5)
}

export type EnginePose = {
  look?: Look
  /** How far the wheels have turned, in radians. */
  spin?: number
  /** 0 is a resting mouth, 1 a wide open toot. */
  toot?: number
  /** Chalk stripes laid across it, or none. */
  stripes?: string | null
}

/** The engine: about 150 wide and 110 high. */
export function drawEngine(g: G, rng: Rng, pose: EnginePose = {}) {
  const look = pose.look ?? { x: 0.5, y: 0 }, spin = pose.spin ?? 0.3
  // The cab at the back, with a window.
  const cab = box(rng, -70, -100, 52, 72, 0.16)
  chalkShape(g, rng, cab, YELLOW, WHITE, 6, -0.9)
  bare(g, box(rng, -60, -90, 30, 26, 0.25, 0.8))
  chalkLine(g, rng, box(rng, -60, -90, 30, 26, 0.25, 0.8), WHITE, 4, true)
  chalkLine(g, rng, [{ x: -78, y: -103 }, { x: -44, y: -108 }, { x: -10, y: -103 }], PINK, 8)
  // The boiler, long and round at the front.
  const boiler: Pt[] = [
    { x: -20, y: -76 }, { x: 14, y: -78 }, { x: 46, y: -77 }, { x: 66, y: -68 }, { x: 74, y: -52 },
    { x: 66, y: -36 }, { x: 46, y: -29 }, { x: 14, y: -28 }, { x: -20, y: -29 }, { x: -22, y: -52 },
  ].map((p) => ({ x: p.x + between(rng, -1.2, 1.2), y: p.y + between(rng, -1.2, 1.2) }))
  chalkShape(g, rng, boiler, BLUE, WHITE, 6.5, -0.35)
  if (pose.stripes) for (let i = 0; i < 4; i++) chalkLine(g, rng, [{ x: -10 + i * 17, y: -80 }, { x: -16 + i * 17, y: -27 }], pose.stripes, 6)
  // The funnel and its cap, and a small dome.
  chalkShape(g, rng, box(rng, 22, -104, 20, 28, 0.1, 1), LILAC, WHITE, 5, 1.2)
  chalkLine(g, rng, [{ x: 14, y: -107 }, { x: 32, y: -110 }, { x: 50, y: -107 }], PINK, 9)
  chalkShape(g, rng, ring(rng, -4, -80, 10, 8, 0.04, 14), PINK, WHITE, 4)
  // The footplate, the buffer and the cow-catcher.
  chalkLine(g, rng, [{ x: -72, y: -27 }, { x: 0, y: -25 }, { x: 78, y: -27 }], WHITE, 6)
  chalkLine(g, rng, [{ x: 78, y: -27 }, { x: 92, y: -6 }, { x: 70, y: -6 }], PINK, 5.5)
  // The face on the side of the boiler: two eyes, a cheek and a mouth.
  eye(g, rng, 27, -57, 14.5, look)
  eye(g, rng, 57, -56, 13.5, look)
  chalkLine(g, rng, [{ x: 66, y: -38 }], PINK, 7)
  const open = pose.toot ?? 0
  if (open > 0.3) {
    bare(g, ring(rng, 43, -37, 5 + open * 3, 3 + open * 4, 0.03, 12))
    chalkLine(g, rng, ring(rng, 43, -37, 5 + open * 3, 3 + open * 4, 0.03, 12), WHITE, 3, true)
  } else {
    bare(g, [{ x: 31, y: -39 }, { x: 43, y: -31 }, { x: 55, y: -38 }, { x: 43, y: -35 }])
    chalkLine(g, rng, [{ x: 31, y: -39 }, { x: 43, y: -32 }, { x: 55, y: -38 }], WHITE, 3.4)
  }
  wheel(g, rng, -44, 23, spin)
  wheel(g, rng, 8, 15, spin * 1.5)
  wheel(g, rng, 46, 15, spin * 1.5 + 0.5)
  // The rod that joins the wheels.
  chalkLine(g, rng, [{ x: -44 + Math.cos(spin) * 12, y: -23 + Math.sin(spin) * 12 }, { x: 46 + Math.cos(spin) * 8, y: -15 + Math.sin(spin) * 8 }], ORANGE, 4.5)
}

/** An open wagon, about 96 wide: the rider sits in it, drawn by the caller before the front board. */
export function drawWagon(g: G, rng: Rng, colour: string, spin = 0.3, rider?: () => void) {
  // The back board first, the rider in front of it, then the front board over the rider's feet.
  chalkLine(g, rng, [{ x: -44, y: -56 }, { x: 0, y: -58 }, { x: 44, y: -56 }], WHITE, 4)
  rider?.()
  const tub: Pt[] = [{ x: -48, y: -46 }, { x: 0, y: -47 }, { x: 48, y: -46 }, { x: 43, y: -20 }, { x: 0, y: -18 }, { x: -43, y: -20 }]
    .map((p) => ({ x: p.x + between(rng, -1, 1), y: p.y + between(rng, -1, 1) }))
  chalkShape(g, rng, tub, colour, WHITE, 5.5, 0.5)
  chalkLine(g, rng, [{ x: 48, y: -26 }, { x: 62, y: -25 }], WHITE, 4)
  wheel(g, rng, -26, 13, spin)
  wheel(g, rng, 26, 13, spin + 0.6)
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
