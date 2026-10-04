import { TAU, curve, draw, halo, shape, type Print } from './lookCut'
import { INK } from './lookInk'

// The idle guidance in the look: a printed hand that shows one move, and the
// short cut marks that stand around the one thing a child would want next. A
// print cannot glow, so the marks are what a carver leaves round something to
// make it stand out: a ring of small wedges of bare paper.

/** The hand's box in reference units, and where its fingertip is inside it. */
export const HAND = { w: 100, h: 124, tipX: 30, tipY: 7 }

/** A pointing hand, as on a signpost: the first finger out, three knuckles curled beside it, the thumb tucked to one side. */
export function paintHand(p: Print): void {
  const hand = curve([[30, 5], [40, 11], [41, 46], [50, 42], [58, 49], [66, 46], [74, 53], [82, 51], [90, 61], [89, 92], [77, 113], [37, 115], [22, 105], [7, 87], [3, 73], [11, 66], [20, 75], [20, 12]])
  halo(p, hand, 5, 0.05)
  shape(p, hand, null, 2.5, 6.5)
  // The knuckles' gaps and the fold of the thumb, as short cuts of the knife.
  draw(p, curve([[58, 52], [59, 70]], false), 3, 0.2)
  draw(p, curve([[74, 56], [75, 72]], false), 3, 0.2)
  draw(p, curve([[21, 78], [30, 86], [34, 98]], false), 3, 0.15)
}

/**
 * The marks round a thing, drawn live: `count` wedges of bare paper pointing
 * away from an oval of half-axes `rx`, `ry`. `strength` 0..1 is how far the
 * idle ladder's glow has come; the wedges grow with it and breathe slowly.
 * Returns the number of paths drawn.
 */
export function drawMarks(g: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, strength: number, seconds: number, unit: number, count = 14): number {
  if (strength <= 0.02) return 0
  g.fillStyle = INK.paper
  g.beginPath()
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * TAU + 0.2, breath = 0.8 + 0.2 * Math.sin(seconds * 2.4 + i * 1.7)
    const length = unit * (i % 2 === 0 ? 40 : 26) * strength * breath, half = unit * 7 * Math.min(1, strength * 1.5)
    const ux = Math.cos(angle), uy = Math.sin(angle), x = cx + ux * (rx + unit * 14), y = cy + uy * (ry + unit * 14)
    g.moveTo(x - uy * half, y + ux * half)
    g.lineTo(x + ux * length, y + uy * length)
    g.lineTo(x + uy * half, y - ux * half)
    g.closePath()
  }
  g.fill()
  return 1
}
