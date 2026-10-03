import type { Kind } from './kinds'
import { CARD } from './layout'
import { makeRng } from './rng'

// How the pictured set is laid out on the customer's card. The picture is of
// the pieces themselves: one drawn piece for every piece wanted, and never a
// sign for an amount. In rows, a kind stands five to a row, so six to ten
// read as a full row of five and the rest beneath it. Pure: positions only.

export type Wanted = { kind: Kind; count: number }
export type Picture = 'rows' | 'scattered'

/** The radius of a pictured piece, in stage units. */
export const PICTURED_R = 21
const PITCH_X = 52
const PITCH_Y = 47

export type Pictured = { kind: Kind; x: number; y: number }

/** Where each pictured piece stands on the card, in stage units from the card's top left corner, in the order the card is read. */
export function layOut(wanted: readonly Wanted[], picture: Picture, seed = 1): Pictured[] {
  return picture === 'rows' ? rows(wanted) : scattered(wanted, seed)
}

function rows(wanted: readonly Wanted[]): Pictured[] {
  const lines: { kind: Kind; n: number }[] = []
  for (const w of wanted) for (let left = w.count; left > 0; left -= 5) lines.push({ kind: w.kind, n: Math.min(5, left) })
  const widest = lines.reduce((m, l) => Math.max(m, l.n), 0)
  // Every row starts at the same left edge, so the second row of a kind stands under the first.
  const x0 = CARD.w / 2 - ((widest - 1) * PITCH_X) / 2
  const y0 = CARD.h / 2 - ((lines.length - 1) * PITCH_Y) / 2
  const out: Pictured[] = []
  lines.forEach((l, row) => {
    for (let i = 0; i < l.n; i++) out.push({ kind: l.kind, x: x0 + i * PITCH_X, y: y0 + row * PITCH_Y })
  })
  return out
}

function scattered(wanted: readonly Wanted[], seed: number): Pictured[] {
  const rng = makeRng(seed)
  const kinds: Kind[] = []
  for (const w of wanted) for (let i = 0; i < w.count; i++) kinds.push(w.kind)
  const pad = PICTURED_R + 16, apart = PICTURED_R * 2 + 5
  const out: Pictured[] = []
  for (const kind of kinds) {
    let placed = false
    for (let i = 0; i < 400 && !placed; i++) {
      const x = rng.range(pad, CARD.w - pad), y = rng.range(pad, CARD.h - pad)
      if (out.every((p) => Math.hypot(p.x - x, p.y - y) >= apart)) {
        out.push({ kind, x, y })
        placed = true
      }
    }
    // No room found by chance: a grid has room for any ten.
    for (let gy = pad; gy <= CARD.h - pad && !placed; gy += 8) {
      for (let gx = pad; gx <= CARD.w - pad && !placed; gx += 8) {
        if (out.every((p) => Math.hypot(p.x - gx, p.y - gy) >= apart)) {
          out.push({ kind, x: gx, y: gy })
          placed = true
        }
      }
    }
  }
  return out
}
