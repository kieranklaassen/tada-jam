import { BLUE, COLOURS, GREEN, PEG_RADIUS, RED, WHITE, YELLOW, centreOf } from './board'
import { PEG_INK, dashes, glow, ring, type Ctx } from './pen'
import { WHITE_BREATH, type Bloom } from './toy'

// The light that runs out from a new peg. Each colour blooms in its own way
// (the design sheet's grid, first column): red in two quick rings with
// sparks, blue in slow rings that run twice as far, yellow as two rings, one
// inside the other, that close into one, green as a ring that bounces in and out twice,
// white after hanging dark for a breath. The blooms of one colour are one path
// and at most two strokes, the bright ones and the fading ones; the phosphor
// trail does the rest. Their dashes are unequal and unevenly spread.

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const ease = (t: number) => 1 - (1 - clamp01(t)) ** 3

/**
 * One bloom: how bright it is now, 0 when it is over, and, given a context, its rings and dashes added to the
 * path. Asked without a context it only says how bright.
 */
function trace(ctx: Ctx | null, bloom: Bloom): number {
  const { colour, age } = bloom
  const { x, y } = centreOf(bloom.hole)
  const r = PEG_RADIUS
  if (bloom.closing) {
    // The light that closes in behind a pulled peg: blue's rings run back in to the hole, and yellow's two rings, one inside the other, close into one there.
    if (colour === BLUE) {
      const u = age / 0.6
      if (u >= 1) return 0
      if (ctx) {
        ring(ctx, x, y, r + 70 * (1 - ease(u)))
        if (age > 0.12) ring(ctx, x, y, r + 70 * (1 - ease((age - 0.12) / 0.6)))
      }
      return 0.75 * (1 - u * 0.5)
    }
    const u = age / 0.22
    if (u >= 1) return 0
    // One ring inside the other, both round the hole, closing into one: never two rings side by side.
    const apart = 1 - ease(u)
    if (ctx) {
      ring(ctx, x, y, r - 2 + 30 * apart)
      ring(ctx, x, y, r - 2 - 14 * apart)
    }
    return 1 - u * 0.4
  }
  switch (colour) {
    case RED: {
      const u = age / 0.4
      if (u >= 1) return 0
      if (ctx) {
        ring(ctx, x, y, r + 58 * ease(u))
        if (age > 0.08) ring(ctx, x, y, r + 58 * ease((age - 0.08) / 0.4))
        dashes(ctx, x, y, r + 50 * ease(u), 14, 6, 0.3)
      }
      return 1 - u
    }
    case BLUE: {
      const u = age / 1.1
      if (u >= 1) return 0
      if (ctx) {
        ring(ctx, x, y, r + 118 * ease(u))
        if (age > 0.25) ring(ctx, x, y, r + 118 * ease((age - 0.25) / 1.1))
      }
      return (1 - u) * 0.9
    }
    case YELLOW: {
      const u = age / 0.5
      if (u >= 1) return 0
      // Two rings round the peg, one inside the other, that close into one as they run out.
      const apart = 1 - ease(age / 0.34)
      if (ctx) {
        ring(ctx, x, y, r + 20 * ease(u) + 26 * apart)
        ring(ctx, x, y, r + 20 * ease(u) - 12 * apart)
        dashes(ctx, x, y, r + 26 * ease(u), 10, 7, 0)
      }
      return 1 - u
    }
    case GREEN: {
      const u = age / 0.6
      if (u >= 1) return 0
      if (ctx) ring(ctx, x, y, r + 4 + 36 * Math.abs(Math.sin((age / 0.3) * Math.PI)) * (1 - u))
      return 1 - u * 0.6
    }
    case WHITE: {
      const lit = age - WHITE_BREATH, u = lit / 0.5
      if (lit < 0 || u >= 1) return 0
      if (ctx) {
        ring(ctx, x, y, r + 46 * ease(u))
        ring(ctx, x, y, r + 78 * ease(u))
        dashes(ctx, x, y, r + 8 + 30 * ease(u), 16, 7, Math.PI / 8)
      }
      return 1 - u
    }
  }
}

/** A bloom brighter than this is drawn with the bright ones of its colour, and one fainter with the fading ones. */
const BRIGHT = 0.5

/** Draws every bloom: for each colour, the bright ones as one stroke and the fading ones as another. */
export function drawBlooms(ctx: Ctx, blooms: readonly Bloom[]): void {
  if (blooms.length === 0) return
  for (const colour of COLOURS) {
    for (const bright of [true, false]) {
      let most = 0
      ctx.beginPath()
      for (const bloom of blooms) {
        if (bloom.colour !== colour) continue
        const alpha = trace(null, bloom)
        if (alpha <= 0 || alpha > BRIGHT !== bright) continue
        trace(ctx, bloom)
        most = Math.max(most, alpha)
      }
      if (most > 0) glow(ctx, PEG_INK[colour], 2.4, 0, most)
    }
  }
}
