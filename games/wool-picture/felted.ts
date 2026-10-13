import { makeRng } from './rng'

// What the look is made of. Two materials, and nothing else:
// - loose fleece: a handful of small sprites for each colour, each a faint
//   haze with fine strands in it. Wool is laid by stamping them, so a veil is
//   never drawn strand by strand in a frame;
// - firm felt: a flat shape with a fuzzy edge and a nap of short fibres, for
//   the things a finger can take hold of (the figures, the bowls, the frame).
// Everything here is drawn once into canvases of its own and stamped after.

export type Ctx = CanvasRenderingContext2D
/** Makes a canvas of this many pixels. The view is handed one, so a test can hand it a stand-in. */
export type Maker = (width: number, height: number) => HTMLCanvasElement

export type Rgb = readonly [number, number, number]

/** The five dyes, by bowl: moss green, undyed white, woad blue, weld yellow, madder russet. */
export const DYE: readonly Rgb[] = [[122, 176, 82], [244, 238, 224], [86, 148, 214], [244, 196, 62], [204, 104, 62]]
/** The dark felt the wool is laid on. */
export const BACKING: Rgb = [38, 34, 48]

export const css = (rgb: Rgb, alpha = 1): string => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`
/** A colour made lighter (above 0) or darker (below 0) by a share of the way to white or black. */
export const shade = (rgb: Rgb, by: number): Rgb => {
  const to = by > 0 ? 255 : 0, k = Math.abs(by)
  return [Math.round(rgb[0] + (to - rgb[0]) * k), Math.round(rgb[1] + (to - rgb[1]) * k), Math.round(rgb[2] + (to - rgb[2]) * k)]
}

/** The size of one fleece sprite, in stage units, and how many there are of each colour. */
export const TUFT_W = 48
export const TUFT_H = 20
export const TUFT_KINDS = 6

export type Fleece = { sprites: HTMLCanvasElement[]; scale: number }

/**
 * The fleece sprites of one colour at `scale` pixels a unit: each a faint haze, longer than it is high, with
 * strands of the colour's lighter and darker shades running through it and a few straying past its ends.
 * `body` is how dense the haze is at its middle and `strands` how many strands a sprite holds.
 */
export function makeFleece(make: Maker, rgb: Rgb, scale: number, seed: number, body = 0.06, strands = 9): Fleece {
  const rng = makeRng(seed), sprites: HTMLCanvasElement[] = []
  const w = Math.ceil(TUFT_W * scale), h = Math.ceil(TUFT_H * scale)
  for (let kind = 0; kind < TUFT_KINDS; kind++) {
    const canvas = make(w, h), c = canvas.getContext('2d')!
    c.setTransform(scale, 0, 0, scale, 0, 0)
    // The haze: a soft oval, densest in the middle.
    c.save()
    c.translate(TUFT_W / 2, TUFT_H / 2)
    c.scale(1, TUFT_H / TUFT_W)
    const haze = c.createRadialGradient(0, 0, 0, 0, 0, TUFT_W / 2)
    haze.addColorStop(0, css(rgb, body))
    haze.addColorStop(0.55, css(rgb, body * 0.55))
    haze.addColorStop(1, css(rgb, 0))
    c.fillStyle = haze
    c.beginPath()
    c.arc(0, 0, TUFT_W / 2, 0, Math.PI * 2)
    c.fill()
    c.restore()
    // The strands: fine curved lines, most inside the haze and a few longer than it.
    c.lineCap = 'round'
    for (let i = 0; i < strands; i++) {
      const stray = rng.next() < 0.25
      const y = TUFT_H * (0.2 + 0.6 * rng.next()), reach = TUFT_W * (stray ? 0.48 : 0.2 + 0.2 * rng.next())
      const x0 = TUFT_W / 2 - reach * (0.6 + 0.4 * rng.next()), x1 = TUFT_W / 2 + reach * (0.6 + 0.4 * rng.next())
      const bend = (rng.next() - 0.5) * TUFT_H * 0.7
      c.strokeStyle = css(shade(rgb, (rng.next() - 0.35) * 0.5), stray ? 0.2 : 0.16 + 0.2 * rng.next())
      c.lineWidth = 0.5 + 0.5 * rng.next()
      c.beginPath()
      c.moveTo(x0, y)
      c.quadraticCurveTo(TUFT_W / 2, y + bend, x1, y + (rng.next() - 0.5) * 4)
      c.stroke()
    }
    sprites.push(canvas)
  }
  return { sprites, scale }
}

/** A number from 0 up to 1 that is always the same for the same three whole numbers. */
export function chance(a: number, b: number, c: number): number {
  let h = (Math.imul(a, 374761393) + Math.imul(b, 668265263) + Math.imul(c, 1274126177)) | 0
  h = Math.imul(h ^ (h >>> 13), 1103515245)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

/**
 * Stamps one fleece sprite with its middle at (x, y), in the units of `c`'s own transform, turned by `turn`
 * radians and `size` times its own size. `pick` chooses the sprite. The caller's transform is `base`, the six
 * numbers of a matrix, and is put back after.
 */
export function stampFleece(c: Ctx, fleece: Fleece, x: number, y: number, turn: number, size: number, pick: number, base: readonly number[]): void {
  const cos = Math.cos(turn) * size, sin = Math.sin(turn) * size
  const [a, b, cc, d, e, f] = base
  c.setTransform(a * cos + cc * sin, b * cos + d * sin, cc * cos - a * sin, d * cos - b * sin, a * x + cc * y + e, b * x + d * y + f)
  c.drawImage(fleece.sprites[pick % TUFT_KINDS], -TUFT_W / 2, -TUFT_H / 2, TUFT_W, TUFT_H)
  c.setTransform(a, b, cc, d, e, f)
}

/** A piece of firm felt: its canvas, and where its own (0, 0) lies in it, in stage units. */
export type Felt = { canvas: HTMLCanvasElement; ox: number; oy: number; w: number; h: number }

/** The room round a felt piece's shape for its fuzzy edge, in stage units. */
const FUZZ = 7

/**
 * Makes a piece of firm felt. `paint` draws its flat shapes in its own units, with (0, 0) wherever suits it,
 * inside the box from (x0, y0) to (x1, y1). Each shape it fills gets a soft fuzzy edge; the whole then gets a
 * nap of short fibres and a little shading toward its foot, laid only where the piece is.
 */
export function makeFelt(make: Maker, scale: number, x0: number, y0: number, x1: number, y1: number, seed: number, paint: (c: Ctx) => void, detail?: (c: Ctx) => void): Felt {
  const w = x1 - x0 + FUZZ * 2, h = y1 - y0 + FUZZ * 2
  const canvas = make(Math.ceil(w * scale), Math.ceil(h * scale)), c = canvas.getContext('2d')!
  const ox = FUZZ - x0, oy = FUZZ - y0
  c.setTransform(scale, 0, 0, scale, ox * scale, oy * scale)
  // The fuzzy edge: every fill throws a soft halo of its own colour.
  c.shadowBlur = 3.2 * scale
  paint(c)
  c.shadowBlur = 0
  c.shadowColor = 'rgba(0,0,0,0)'
  // The nap and the shading, only on the felt itself.
  c.globalCompositeOperation = 'source-atop'
  const rng = makeRng(seed)
  c.lineCap = 'round'
  const fibres = Math.round((w * h) / 26)
  for (let i = 0; i < fibres; i++) {
    const x = x0 + rng.next() * (x1 - x0), y = y0 + rng.next() * (y1 - y0), turn = rng.next() * Math.PI, long = 2 + rng.next() * 5
    c.strokeStyle = rng.next() < 0.5 ? `rgba(255,255,255,${0.05 + 0.09 * rng.next()})` : `rgba(0,0,0,${0.04 + 0.07 * rng.next()})`
    c.lineWidth = 0.5 + 0.5 * rng.next()
    c.beginPath()
    c.moveTo(x, y)
    c.lineTo(x + Math.cos(turn) * long, y + Math.sin(turn) * long)
    c.stroke()
  }
  const fall = c.createLinearGradient(0, y0, 0, y1)
  fall.addColorStop(0, 'rgba(255,255,255,0.07)')
  fall.addColorStop(0.5, 'rgba(0,0,0,0)')
  fall.addColorStop(1, 'rgba(20,10,30,0.2)')
  c.fillStyle = fall
  c.fillRect(x0 - FUZZ, y0 - FUZZ, w, h)
  c.globalCompositeOperation = 'source-over'
  // What sits on the felt and takes no nap: an eye, a stitch.
  if (detail) detail(c)
  return { canvas, ox, oy, w, h }
}

/** Fills the path `shape` draws with this colour, with the fuzzy edge of firm felt when `c` is a felt piece being made. */
export function fill(c: Ctx, rgb: Rgb, shape: (c: Ctx) => void): void {
  c.fillStyle = css(rgb)
  c.shadowColor = css(rgb, 0.9)
  c.beginPath()
  shape(c)
  c.fill()
}

export const oval = (c: Ctx, x: number, y: number, rx: number, ry: number, turn = 0): void => {
  c.moveTo(x + rx * Math.cos(turn), y + rx * Math.sin(turn))
  c.ellipse(x, y, rx, ry, turn, 0, Math.PI * 2)
}
