import { PARTS, type Candle } from './candle'
import { FREE, LENGTH, STEP } from './hall'
import { DARK, alpha, mix, trace, type Pen, type Ring } from './paint'
import { WAX, WAX_PALE } from './scenery'

// The candle as it is drawn: the wick, and round it the wax the child put
// there, part by part. It is the plainest thing in the hall: flat wax in its
// own colour, one pale strip where the light catches it and one dark one
// away from it, and nothing else. Drawn in the stick's units: the knot at
// the origin and the wick hanging down.

/** The outline of the wax from part `from` up to part `to`, which all hold wax of one colour. */
function waxRing(candle: Candle, from: number, to: number): Ring {
  const R = (i: number) => 2 + candle.r[i]
  const top = FREE + from * STEP, bottom = FREE + to * STEP
  const startsHere = from === 0 || candle.r[from - 1] === 0
  const endsHere = to === PARTS || candle.r[to] === 0
  const right: number[] = []
  // A shoulder where the wax begins, a flat join where another colour carries on.
  right.push(R(from) * (startsHere ? 0.5 : 1), top - (startsHere ? 3 : 2))
  for (let i = from; i < to; i++) right.push(R(i), top + (i - from + 0.5) * STEP)
  right.push(R(to - 1) * (endsHere ? 0.72 : 1), bottom + (endsHere ? 3 : 2))
  const ring: Ring = [...right]
  // The end of the candle hangs a little, where the last drop gathers.
  if (endsHere) ring.push(0, bottom + 7 + R(to - 1) * 0.1)
  for (let i = right.length - 2; i >= 0; i -= 2) ring.push(-right[i], right[i + 1])
  return ring
}

/** A strip down one side of the wax, between two shares of its radius. */
function strip(candle: Candle, inner: number, outer: number): Ring | null {
  const down: number[] = [], up: number[] = []
  for (let i = 0; i < PARTS; i++) {
    if (candle.r[i] === 0) continue
    const y = FREE + (i + 0.5) * STEP, r = 2 + candle.r[i]
    down.push(r * outer, y)
    up.push(r * inner, y)
  }
  if (down.length < 4) return null
  const ring: Ring = [...down]
  for (let i = up.length - 2; i >= 0; i -= 2) ring.push(up[i], up[i + 1])
  return ring
}

/** A ring added to the path that is open, closed through the middles of its sides as `trace` closes one. */
function addRing(g: Pen, ring: Ring): void {
  const n = ring.length / 2
  g.moveTo((ring[n * 2 - 2] + ring[0]) / 2, (ring[n * 2 - 1] + ring[1]) / 2)
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n
    g.quadraticCurveTo(ring[i * 2], ring[i * 2 + 1], (ring[i * 2] + ring[j * 2]) / 2, (ring[i * 2 + 1] + ring[j * 2 + 1]) / 2)
  }
  g.closePath()
}

/** The most a candle costs to draw: the wick, one fill for each colour of wax, the light strip and the dark one. */
export const CANDLE_OPS = 1 + WAX.length + 2

/**
 * Draws the candle and hands back how many strokes and fills it took. `wet` is how glossy each part is, 0 to
 * 1: a fresh coat is pale and shines, and goes matte as it cools. All the wax of one colour goes in one fill,
 * so a candle striped in every colour costs no more than a plain one.
 */
export function drawCandle(g: Pen, candle: Candle, wet: readonly number[] | null = null): number {
  let ops = 1
  g.lineCap = 'round'
  g.strokeStyle = '#efe4c8'
  g.lineWidth = 4.5
  g.beginPath()
  g.moveTo(0, 0)
  g.lineTo(0, LENGTH)
  // The knot that weights the end of the wick.
  g.moveTo(-3, LENGTH + 2)
  g.lineTo(3, LENGTH + 2)
  g.stroke()
  let shine = 0, coated = 0
  for (let colour = 0; colour < WAX.length; colour++) {
    let wetHere = 0, parts = 0, from = 0
    g.beginPath()
    while (from < PARTS) {
      if (candle.r[from] === 0 || candle.c[from] !== colour) { from += 1; continue }
      let to = from + 1
      while (to < PARTS && candle.r[to] > 0 && candle.c[to] === colour) to += 1
      for (let i = from; i < to; i++) wetHere += wet ? wet[i] : 0
      parts += to - from
      addRing(g, waxRing(candle, from, to))
      from = to
    }
    if (parts === 0) continue
    shine += wetHere
    coated += parts
    g.fillStyle = mix(WAX[colour], WAX_PALE[colour], (wetHere / parts) * 0.4)
    g.fill()
    ops += 1
  }
  if (coated === 0) return ops
  const gloss = shine / coated
  const light = strip(candle, -0.42, -0.74), shade = strip(candle, 0.5, 0.94)
  if (light) {
    trace(g, light)
    g.fillStyle = alpha('#fff6d6', 0.22 + gloss * 0.5)
    g.fill()
    ops += 1
  }
  if (shade) {
    trace(g, shade)
    g.fillStyle = alpha(DARK, 0.24)
    g.fill()
    ops += 1
  }
  return ops
}
