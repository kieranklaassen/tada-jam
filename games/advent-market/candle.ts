// The candle on the dipping stick, as the child's hand made it. A wick has
// twelve parts from the top to the tip, and each keeps its own thickness and
// the colour of its outer coat, so a shallow dip grows a club and a dip in
// another pot leaves a band. Pure numbers: no clock, no drawing.

/** Parts of the wick that can take wax, top to tip. */
export const PARTS = 12
/** The fattest a part can get, in stage units of radius. */
export const FATTEST = 46
/** One full coat on a cool part, and the thin coat a part takes while its last coat is still warm. */
export const COAT = 4
export const WARM_COAT = 2
/** The lowest parts take a little more with every coat, as wax runs down: a dipped candle is a teardrop. */
export const RUN_DOWN_FROM = 9
/** The wax pots, by the index a save keeps. */
export const COLOURS = ['gold', 'red', 'green'] as const
export type Colour = 0 | 1 | 2

export type Candle = {
  /** Thickness of each part, a whole number from 0 (bare wick) to FATTEST. */
  r: number[]
  /** The colour of each part's outer coat. */
  c: number[]
}

export function bareWick(): Candle {
  return { r: new Array<number>(PARTS).fill(0), c: new Array<number>(PARTS).fill(0) }
}

export function isBare(candle: Candle): boolean {
  return candle.r.every((r) => r === 0)
}

/**
 * One part comes out of the wax and takes a coat. `warmth` is 0 for a part that has cooled and 1 for one
 * straight out of the pot. Returns what was added; at the fattest it is 0, and the wax slides off instead.
 */
export function coatPart(candle: Candle, part: number, colour: Colour, warmth: number): number {
  const before = candle.r[part]
  const coat = (warmth > 0.5 ? WARM_COAT : COAT) + (part >= RUN_DOWN_FROM ? 1 : 0)
  candle.r[part] = Math.min(FATTEST, before + coat)
  candle.c[part] = colour
  return candle.r[part] - before
}

/** One part, left under the wax, loses a little. Returns whether there was anything to lose. */
export function meltPart(candle: Candle, part: number): boolean {
  if (candle.r[part] <= 0) return false
  candle.r[part] -= 1
  return true
}

/** How fat the candle is over its whole length, 0 to FATTEST. */
export function girth(candle: Candle): number {
  let sum = 0
  for (const r of candle.r) sum += r
  return sum / PARTS
}

/** Thin, middling or fat: what the candle-maker's fist and the bundle's mittens go by. */
export function sizeOf(candle: Candle): 0 | 1 | 2 {
  const g = girth(candle)
  return g < 12 ? 0 : g < 28 ? 1 : 2
}

/** Whether no part can take more. */
export function isFattest(candle: Candle): boolean {
  return candle.r.every((r) => r >= FATTEST)
}

export function copyCandle(candle: Candle): Candle {
  return { r: [...candle.r], c: [...candle.c] }
}

/** A saved candle is untrusted: each part is repaired by itself, and anything that is no candle gives a bare wick. */
export function readCandle(raw: unknown): Candle {
  const candle = bareWick()
  if (typeof raw !== 'object' || raw === null) return candle
  const { r, c } = raw as { r?: unknown; c?: unknown }
  for (let i = 0; i < PARTS; i++) {
    const thick = Array.isArray(r) ? r[i] : undefined
    const colour = Array.isArray(c) ? c[i] : undefined
    if (typeof thick === 'number' && Number.isInteger(thick) && thick >= 0 && thick <= FATTEST) candle.r[i] = thick
    if (typeof colour === 'number' && Number.isInteger(colour) && colour >= 0 && colour < COLOURS.length) candle.c[i] = colour
  }
  return candle
}
