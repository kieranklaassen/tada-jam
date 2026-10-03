// The small parts the eight figures share: an eye shut and an eye open, the
// way a glance goes, the bedclothes one sits up out of, a pair of legs, a bag.

import { PAPER, SPOT, type Pen } from './inkHatch'
import type { InkSide } from './inkScene'

/** How far the eyes go toward a side. */
export const glance = (looks: InkSide | null | undefined): [number, number] =>
  looks === 'left' ? [-1, 0] : looks === 'right' ? [1, 0] : looks === 'up' ? [0, -1] : looks === 'down' ? [0, 1] : [0, 0]

export const shut = (pen: Pen, x: number, y: number, r: number) => pen.line([x - r, y - r * 0.2, x, y + r * 0.5, x + r, y - r * 0.2], 1.4)
export const open = (pen: Pen, x: number, y: number, r: number, lookX = 0, lookY = 0) => {
  pen.ellipse(x, y, r, r, { fill: PAPER, w: 1.2 })
  pen.dot(x + lookX * r * 0.45, y + lookY * r * 0.45, r * 0.42)
}

/** The bedclothes a guest sits up out of: drawn over its lap, from its middle toward the foot of the bed on its left. */
export function bedclothes(pen: Pen): void {
  pen.shape([-74, -44, -52, -52, -30, -55, -8, -50, 16, -52, 22, -44, 20, -32, 8, -27, -2, -32, -14, -26, -26, -32, -38, -26, -50, -32, -62, -26, -74, -30], { fill: PAPER, tone: 1, angle: -0.7, w: 1.4 })
  pen.line([-60, -42, -40, -47, -22, -47], 0.7)
  pen.line([-6, -44, 8, -46], 0.7)
}

/** A guest's bag, stood by its feet in the lobby. */
export function bag(pen: Pen, x: number): void {
  pen.line([x - 7, -22, x - 5, -30, x + 5, -30, x + 7, -22], 1.5)
  pen.shape([x - 15, 0, x - 16, -18, x - 10, -24, x + 10, -24, x + 16, -18, x + 15, 0], { fill: SPOT, w: 1.7 })
  pen.line([x - 15, -15, x + 15, -15], 1, true)
  pen.rect(x - 3, -18, 6, 6, { fill: PAPER, w: 1 })
  pen.line([x - 9, -24, x - 9, 0], 0.8, true)
  pen.line([x + 9, -24, x + 9, 0], 0.8, true)
}

/** A guest's bag by itself, hanging from the top of its handle: what swings under a guest that is carried. */
export function drawBag(pen: Pen): void {
  const g = pen.ctx
  g.save()
  g.translate(0, 31)
  bag(pen, 0)
  g.restore()
}

/** Two short legs under a body that is up and about, and what it stands in. */
export function legs(pen: Pen, half: number, top: number, fill: string): void {
  for (const side of [-1, 1]) {
    pen.tube([side * half, top, side * (half + 1), -7], 10, fill, 1.5, true)
    pen.shape([side * (half - 8), 0, side * (half - 7), -8, side * (half + 4), -10, side * (half + 12), -6, side * (half + 13), 0], { fill: PAPER, w: 1.5 })
  }
}

