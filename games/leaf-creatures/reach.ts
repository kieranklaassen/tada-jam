import { CORNER, HOME, ontoGround } from './clearing'
import { STAGE } from './stage'

// Where a creature may stand, by its own reach. Two places are never to be
// under any part of a creature: the jam's round home control at the top
// centre, and the grown-up's corner at the top right. A creature turns about
// its middle, so it is kept as far from both as its longest part reaches,
// squashed, stretched and leaning as it may be; and a hop or a leap is drawn
// only as high, and as much nearer, as leaves that room. Nothing here draws.

/** How much longer than its parts a creature can be drawn: stretched in a squash, and nearer in nothing here (a hop is reckoned by `liftFor`). */
export const STRETCH = 1.15
/** Room for a lean into a stroke, and for the crayon edge of a part beyond what of it touches. */
export const SLACK = 30
/** The corner as the stage sees it on the narrowest surface the game is shown on (1024 by 768), where 72 pixels are 83 stage units. */
export const CORNER_FROM = { x: STAGE.width - Math.ceil(CORNER / 0.86), y: CORNER } as const
/** How much larger a creature is drawn for each unit it is off the ground. */
export const NEARER = 1 / 260

/** How far a point is from the nearer of the two places: from the rim of the home control, and from the corner. */
export function roomAt(x: number, y: number): number {
  const home = Math.hypot(x - HOME.x, y - HOME.y) - HOME.r
  const cx = Math.max(x, CORNER_FROM.x), cy = Math.min(y, CORNER_FROM.y)
  return Math.min(home, Math.hypot(x - cx, y - cy))
}

/** The room a creature that reaches `span` from its middle needs round that middle while it is on the ground. */
export function needOf(span: number): number {
  return span * STRETCH + SLACK
}

/** The nearest place to x, y where a creature of this reach may stand: clear of both places and, with `onGround`, on the walking ground. */
export function keepIn(x: number, y: number, span: number, onGround = true, out: { x: number; y: number } = { x: 0, y: 0 }): { x: number; y: number } {
  const need = needOf(span)
  out.x = x; out.y = y
  for (let pass = 0; pass < 6; pass++) {
    const dx = out.x - HOME.x, dy = out.y - HOME.y, d = Math.hypot(dx, dy)
    if (d < need + HOME.r) {
      // Straight away from the control; from right under it, down the page.
      const ux = d > 1 ? dx / d : 0, uy = d > 1 ? dy / d : 1
      out.x = HOME.x + ux * (need + HOME.r); out.y = HOME.y + uy * (need + HOME.r)
    }
    const cx = Math.max(out.x, CORNER_FROM.x), cy = Math.min(out.y, CORNER_FROM.y), c = Math.hypot(out.x - cx, out.y - cy)
    if (c < need) {
      const ux = c > 1 ? (out.x - cx) / c : -0.7, uy = c > 1 ? (out.y - cy) / c : 0.7
      out.x = cx + ux * need; out.y = cy + uy * need
    }
    if (!onGround) { if (roomAt(out.x, out.y) >= need - 0.5) break; continue }
    const on = ontoGround(out.x, out.y, 18)
    const moved = Math.hypot(on.x - out.x, on.y - out.y)
    out.x = on.x; out.y = on.y
    if (moved < 0.01) break
  }
  return out
}

/** How high a creature of this reach may be drawn off the ground at x, y, up to `lift`: as high as leaves it clear, drawn nearer as it rises. */
export function liftFor(x: number, y: number, span: number, lift: number): number {
  if (lift <= 0) return 0
  const fits = (up: number): boolean => roomAt(x, y - up) >= span * (1 + up * NEARER) * STRETCH + SLACK
  if (fits(lift)) return lift
  let low = 0, high = lift
  for (let i = 0; i < 9; i++) { const mid = (low + high) / 2; if (fits(mid)) low = mid; else high = mid }
  return low
}
