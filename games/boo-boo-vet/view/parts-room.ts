// The pet carrier: what a patient may come in. Shut, someone is inside (the
// view lays a pair of eyes at its window); open, it stands empty.

import { box, ell, fill, line, puff, tube, within, type Pen } from './paint'
import type { Bounds, Paint } from './sticker'

/** The carrier's colour is one the room does not use: an orchid pink. */
const SHELL = '#d884d0', DOOR = '#eaa6e2', TRIM = '#b45fb0', DARK = '#3d2a5c', LATCH = '#ffd23f'

/** Where the middle of the carrier's wire door is, from its origin: where the eyes of whoever is inside show. */
export const CARRIER = { window: { x: 0, y: -62 }, width: 180, height: 152 } as const

/** The wire door: the dark of the inside behind a frame and upright bars, all one way. Whoever is inside shows between them. */
function grille(pen: Pen, x: number, y: number, w: number, h: number): void {
  const frame = box(x, y, w, h, Math.min(18, w / 2))
  puff(pen, frame, DOOR, 0.7)
  const inside = box(x + 8, y + 8, w - 16, h - 16, Math.min(12, (w - 16) / 2))
  fill(pen, inside, DARK)
  pen.mute++
  within(pen, inside, () => {
    const bars = Math.max(1, Math.round(w / 26))
    for (let i = 1; i <= bars; i++) line(pen, [x + (w * i) / (bars + 1), y, x + (w * i) / (bars + 1), y + h], DOOR, Math.min(6, w * 0.16), false)
  })
  pen.mute--
}

/** Origin: the middle of its foot. */
export function carrier(open: boolean): { paint: Paint; bounds: Bounds } {
  const paint = (pen: Pen) => {
    // The handle and the shell on its two feet. Its sides are plain: the air comes in through the bars of the door.
    puff(pen, tube([-38, -124, -32, -146, 0, -152, 32, -146, 38, -124], 13, 13), TRIM, 0.6)
    for (const s of [-1, 1]) puff(pen, box(s * 58 - 16, -12, 32, 12, 6), TRIM, 0.5)
    puff(pen, box(-90, -134, 180, 126, 34), SHELL)
    if (!open) {
      grille(pen, -52, -112, 104, 92)
      pen.mute++
      fill(pen, ell(48, -66, 6.5, 6.5), LATCH)
      pen.mute--
      return
    }
    // The door open: the way in is dark and empty, with the floor of the carrier showing, and the door stands out to one side.
    const way = box(-52, -112, 104, 92, 18)
    fill(pen, way, DARK)
    within(pen, way, () => fill(pen, ell(0, -18, 62, 14), '#6a5296'))
    pen.g.save()
    pen.g.transform(1, -0.22, 0, 1, 54, 12)
    grille(pen, 0, -112, 40, 92)
    pen.g.restore()
  }
  return { paint, bounds: { x0: -90, y0: -152, x1: open ? 98 : 90, y1: 0 } }
}
