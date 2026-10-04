import { CHALKS, roughen } from './chalk'
import { drawCap, drawEngineBody, drawHand, drawPuff, drawStop, drawWagonBack, drawWagonBody, drawWheel, type EngineLook } from './figures'
import { HOME_FIGURES, RIDER_FIGURES } from './riderFigures'
import { RIDERS, type RiderKind } from './tastes'
import { makeRng } from './rng'

// The chalk figures as kept pictures. Each is drawn once at the surface's own
// density, with the tar's grain knocked out of it, in a few versions that
// differ only in the hand's small wobble. Showing one version after another
// is what makes a chalk drawing look alive, like a flip book.

type G = CanvasRenderingContext2D

/** A kept picture of a figure: its origin inside the picture and how many pixels one figure unit is. */
export type Sprite = { canvas: HTMLCanvasElement; ox: number; oy: number; k: number }

/** How many versions of each figure are kept. */
export const VERSIONS = 3

function make(k: number, x0: number, y0: number, x1: number, y1: number, grain: HTMLCanvasElement, grainSize: number, draw: (g: G) => void): Sprite {
  const pad = 6
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil((x1 - x0 + pad * 2) * k))
  canvas.height = Math.max(1, Math.ceil((y1 - y0 + pad * 2) * k))
  const g = canvas.getContext('2d')!
  g.setTransform(k, 0, 0, k, (pad - x0) * k, (pad - y0) * k)
  draw(g)
  g.setTransform(1, 0, 0, 1, 0, 0)
  roughen(g, grain, canvas.width, canvas.height, grainSize)
  return { canvas, ox: (pad - x0) * k, oy: (pad - y0) * k, k }
}

/** Draws a kept picture with its origin at the origin of `g`, in figure units. */
export function stamp(g: G, sprite: Sprite): void {
  g.drawImage(sprite.canvas, -sprite.ox / sprite.k, -sprite.oy / sprite.k, sprite.canvas.width / sprite.k, sprite.canvas.height / sprite.k)
}

export type Sprites = {
  engine: Sprite[]
  /** The engine all in white dust, laid over it while it is dusted. */
  dusted: Sprite
  cap: Sprite[]
  wheels: Record<number, Sprite[]>
  wagons: Sprite[][]
  wagonBack: Sprite[]
  puff: Sprite[]
  hand: Sprite
  riders: Record<RiderKind, Sprite[]>
  homes: Record<RiderKind, Sprite[]>
  stop: Sprite[]
}

const versions = (seed: number, makeOne: (seed: number) => Sprite): Sprite[] => Array.from({ length: VERSIONS }, (_, v) => makeOne(seed + v * 101))

const perRider = <T>(makeOne: (kind: RiderKind, index: number) => T): Record<RiderKind, T> =>
  Object.fromEntries(RIDERS.map((kind, i) => [kind, makeOne(kind, i)])) as Record<RiderKind, T>

/** The engine's body in its present look. Made again when its stripes or its tint change. */
export function engineSprites(k: number, grain: HTMLCanvasElement, grainSize: number, look: EngineLook): Sprite[] {
  return versions(11, (seed) => make(k, -92, -122, 102, 6, grain, grainSize, (g) => drawEngineBody(g, makeRng(seed), look)))
}

/** Every kept picture, at `k` pixels a figure unit. */
export function makeSprites(k: number, grain: HTMLCanvasElement, grainSize: number, look: EngineLook): Sprites {
  const wheel = (r: number, seed: number) => versions(seed, (s) => make(k, -r - 4, -r - 4, r + 4, r + 4, grain, grainSize, (g) => drawWheel(g, makeRng(s), r)))
  return {
    engine: engineSprites(k, grain, grainSize, look),
    dusted: make(k, -92, -122, 102, 6, grain, grainSize, (g) => drawEngineBody(g, makeRng(77), { stripes: null, tint: null, white: true })),
    cap: versions(21, (seed) => make(k, -26, -14, 26, 8, grain, grainSize, (g) => drawCap(g, makeRng(seed)))),
    wheels: { 23: wheel(23, 31), 15: wheel(15, 41), 13: wheel(13, 51) },
    wagons: [CHALKS[1], CHALKS[4]].map((colour, i) => versions(61 + i * 7, (seed) => make(k, -56, -54, 70, -10, grain, grainSize, (g) => drawWagonBody(g, makeRng(seed), colour)))),
    wagonBack: versions(75, (seed) => make(k, -52, -66, 52, -48, grain, grainSize, (g) => drawWagonBack(g, makeRng(seed)))),
    puff: versions(81, (seed) => make(k, -30, -26, 30, 26, grain, grainSize, (g) => drawPuff(g, makeRng(seed), 0, 0, 0.3))),
    hand: make(k, -40, -12, 40, 98, grain, grainSize, (g) => drawHand(g, makeRng(91))),
    riders: perRider((kind, i) => versions(101 + i * 11, (seed) => make(k, -64, -104, 64, 6, grain, grainSize, (g) => RIDER_FIGURES[kind](g, makeRng(seed))))),
    homes: perRider((kind, i) => versions(151 + i * 11, (seed) => make(k, -100, -106, 100, 8, grain, grainSize, (g) => HOME_FIGURES[kind](g, makeRng(seed))))),
    stop: versions(201, (seed) => make(k, -84, -166, 64, 12, grain, grainSize, (g) => drawStop(g, makeRng(seed)))),
  }
}
