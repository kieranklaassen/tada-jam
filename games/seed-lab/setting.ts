// The setting: what the page is painted with before anything is set on it.
//
// A field journal's page is not bare: its keeper washed in a sky and far
// hills behind the shelf, the earth and grass of the border, the ground the
// visitors stand on and the stepping stones they come in by. It is one
// painting on the paper, lower in contrast than anything a finger can move,
// and it is painted once, into the kept paper: a frame lays down nothing for
// it.
//
// Nothing here is a thing. Every wash runs out into the paper, no shape has an
// outline that closes, and nothing stands on a line of its own or under tape:
// what looks like an object on this page answers a touch, and the setting does
// not look like one.

import { WASH, curve, fadeWash, hash, oval, pen, pencil, type Ctx, type Pt } from './ink'
import type { Layout } from './layout'

/** The washes of the setting: thin, and paler than the washes of the things on the page. */
export const SETTING = { sky: '#5fa4dc', far: '#7d9db0', near: '#86a86a', grass: '#8fb04a', earth: '#b98a4e' } as const

/** A tuft of grass at a point: a few blades in pen from one root, fanned, none upright and none crossing another. */
function tuft(ctx: Ctx, x: number, y: number, k: number, seed: number, blades = 4): void {
  for (let i = 0; i < blades; i++) {
    const lean = (i - (blades - 1) / 2) * 0.46 + (hash(seed, i) - 0.5) * 0.2, long = (13 + 12 * hash(seed + 1, i)) * k
    const tip: Pt = [x + Math.sin(lean) * long, y - Math.cos(lean) * long]
    pen(ctx, curve([[x + (i - (blades - 1) / 2) * 2 * k, y], [x + Math.sin(lean) * long * 0.4, y - Math.cos(lean) * long * 0.6], tip]), { w: 1, seed: seed + 10 + i, taper: 0.5, alpha: 0.5 })
  }
}

/** A flat stone: a low wash that runs out downwards, with a pencil stroke under one side. No outline goes round it. */
function stone(ctx: Ctx, x: number, y: number, rx: number, ry: number, seed: number): void {
  fadeWash(ctx, oval(x, y, rx, ry, (hash(seed, 1) - 0.5) * 0.3, 14), WASH.zinc, { alpha: 0.75, from: y - ry, to: y + ry * 2.2, seed, loose: 0.8 })
  pencil(ctx, curve([[x - rx * 0.2, y + ry * 0.95], [x + rx * 0.5, y + ry * 0.9], [x + rx * 0.95, y + ry * 0.3]]), { seed: seed + 1, w: 0.9, alpha: 0.4 })
}

/** Trodden ground under a line of feet: earth that runs out downwards and a little grass along it, from `x0` to `x1` at the height `y`. */
function ground(ctx: Ctx, x0: number, x1: number, y: number, k: number, seed: number): void {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2
  const patch: Pt[] = [...curve([[x0 - 6 * k, y + 3 * k], [mid - half * 0.4, y - 2 * k], [mid + half * 0.5, y - 1 * k], [x1 + 6 * k, y + 4 * k]], false, 10), [x1 + 2 * k, y + 30 * k], [x0 - 2 * k, y + 30 * k]]
  fadeWash(ctx, patch, SETTING.earth, { alpha: 0.5, from: y - 2 * k, to: y + 26 * k, seed, loose: 2.5 })
  fadeWash(ctx, patch, SETTING.grass, { alpha: 0.3, from: y + 4 * k, to: y + 30 * k, seed: seed + 1, loose: 4 })
}

/**
 * Paints the setting on the paper, under the plate's pencil edge and everything else. The sky and the far hills run
 * behind the shelf, across the whole page; the border is a bed of earth and grass; the visitors have ground to stand
 * on and stepping stones from the edge they wait at; the beetle's corner is trodden earth.
 */
export function paintSetting(ctx: Ctx, layout: Layout): void {
  const { w, h, k, shelf, tray, borderStrip, border, visitor, waiting, beetle, wide } = layout
  const soil = shelf[0].soil, page: Pt[] = [[0, 0], [w, 0], [w, h], [0, h]]
  // The sky: strongest at the top of the page, gone by the shelf's pots.
  fadeWash(ctx, page, SETTING.sky, { alpha: 0.5, from: -h * 0.05, to: soil - 6 * k, seed: 501, loose: 0 })
  // The far hills, two ranges, each a tone with a soft top that runs out before the shelf's board.
  // Each runs from one edge of the page to the other and beyond, so that no end of a hill stands in the frame.
  const range = (crest: number, peak: number, seed: number): Pt[] => {
    const tops: Pt[] = []
    for (let i = 0; i <= 12; i++) {
      const t = i / 12, lift = Math.exp(-((t - peak) ** 2) / 0.07) * 0.6 + 0.4 * Math.sin(t * 5 + seed) ** 2
      tops.push([-40 + (w + 80) * t, soil - crest * (0.3 + 0.7 * lift * (0.75 + 0.25 * hash(seed, i)))])
    }
    return [[-40, soil + 30 * k], ...curve(tops, false, 12), [w + 40, soil + 30 * k]]
  }
  fadeWash(ctx, range(150 * k, 0.4, 503), SETTING.far, { alpha: 0.34, from: soil - 150 * k, to: soil + 4 * k, seed: 503, loose: 3 })
  fadeWash(ctx, range(112 * k, 0.78, 504), SETTING.near, { alpha: 0.34, from: soil - 112 * k, to: soil + 8 * k, seed: 504, loose: 3 })

  // Under the tray: the grass of the garden coming up the page behind the border, strongest at the foot of the page.
  const foot = border[0].ground, low = tray[0].foot
  fadeWash(ctx, page, SETTING.grass, { alpha: 0.5, from: h * 1.02, to: low - 40 * k, seed: 505, loose: 0 })
  // The border: a bed of earth along its ground, with tufts and a few flat stones between the places plants stand in.
  const bed: Pt[] = [[borderStrip.x - 4, foot + 2], ...curve([[borderStrip.x - 4, foot + 2], [w / 2, foot], [borderStrip.x + borderStrip.w + 4, foot + 2]], false, 40), [borderStrip.x + borderStrip.w + 4, h], [borderStrip.x - 4, h]]
  fadeWash(ctx, bed, SETTING.earth, { alpha: 0.42, from: foot, to: h + 10, seed: 506, loose: 1.5 })
  for (let i = 0; i < border.length - 1; i++) {
    // Between two places, never where a plant stands: a tuft, or now and then a stone.
    const x = (border[i].x + border[i + 1].x) / 2 + (hash(506, i) - 0.5) * 8 * k, y = foot + (7 + 5 * hash(507, i)) * k
    if (hash(508, i) < 0.28) stone(ctx, x, y + 2 * k, (7 + 4 * hash(509, i)) * k, 3 * k, 510 + i * 3)
    else tuft(ctx, x, y, k * 0.7, 540 + i * 9, 3 + Math.floor(hash(541, i) * 2))
  }

  // The visitors' ground, across their place, with tufts at its ends, and stepping stones down to it from the edge where the next one waits.
  const feet = visitor.y + visitor.h * 0.97, vx0 = visitor.x + visitor.w * 0.03, vx1 = visitor.x + visitor.w * 0.99
  ground(ctx, vx0, vx1, feet, k, 560)
  tuft(ctx, vx0 + 2 * k, feet + 5 * k, k, 563)
  tuft(ctx, vx1 - 4 * k, feet + 6 * k, k * 0.9, 572, 3)
  if (wide) {
    const from: Pt = [waiting.x + waiting.w * 0.72, waiting.y + waiting.h + 16 * k], to: Pt = [vx1 - 20 * k, feet + 12 * k]
    const way = curve([from, [from[0] + 14 * k, from[1] + (to[1] - from[1]) * 0.4], [to[0] + 26 * k, to[1] - 40 * k], to], false, 4)
    for (let i = 0; i < 5; i++) {
      const at = way[Math.round(((i + 0.5) / 5) * (way.length - 1))]
      stone(ctx, at[0] + (hash(580, i) - 0.5) * 6 * k, at[1], (9 + 4 * hash(581, i)) * k, 3.6 * k, 582 + i * 3)
    }
    // Ground under the one who waits, so that it stands somewhere.
    ground(ctx, waiting.x + waiting.w * 0.06, waiting.x + waiting.w * 0.98, waiting.y + waiting.h * 0.97, k * 0.7, 590)
  }

  // The beetle's corner: earth it has walked flat, and a tuft at the far end of its line.
  const line = beetle.y + beetle.h * 0.9
  ground(ctx, beetle.x + beetle.w * 0.04, beetle.x + beetle.w * 0.99, line, k, 600)
  tuft(ctx, beetle.x + beetle.w * 0.975, line + 4 * k, k, 602)
}
