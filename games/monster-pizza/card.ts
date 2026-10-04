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
/** How far to the side the rows of every second kind are set: a third of the pitch, which fits beside a full row of five. */
export const KIND_STEP = 17

export type Pictured = { kind: Kind; x: number; y: number }

/** Where each pictured piece stands on the card, in stage units from the card's top left corner, in the order the card is read. */
export function layOut(wanted: readonly Wanted[], picture: Picture, seed = 1): Pictured[] {
  return picture === 'rows' ? rows(wanted) : scattered(wanted, seed)
}

function rows(wanted: readonly Wanted[]): Pictured[] {
  const lines: { kind: Kind; n: number; step: number }[] = []
  wanted.forEach((w, k) => { for (let left = w.count; left > 0; left -= 5) lines.push({ kind: w.kind, n: Math.min(5, left), step: k % 2 }) })
  const widest = lines.reduce((m, l) => Math.max(m, l.n), 0)
  const stepped = lines.some((l) => l.step === 1)
  // The rows of one kind start at the same left edge, so its second row stands under its first. The rows of the
  // next kind are set a step to the side: two of one kind over two of another are then not one thing with four
  // parts, such as a face, but two sets.
  // A third of a picture's pitch: a piece of one kind stands neither under a piece of the other nor under the
  // middle of two, so no pair with a third under it lines up as a face.
  const step = KIND_STEP
  const x0 = CARD.w / 2 - ((widest - 1) * PITCH_X + (stepped ? step : 0)) / 2
  const y0 = CARD.h / 2 - ((lines.length - 1) * PITCH_Y) / 2
  const out: Pictured[] = []
  lines.forEach((l, row) => {
    for (let i = 0; i < l.n; i++) out.push({ kind: l.kind, x: x0 + l.step * step + i * PITCH_X, y: y0 + row * PITCH_Y })
  })
  return out
}

/**
 * A scattered card always shows one picture for every piece wanted. Chance
 * finds room for ten nearly always; when one try leaves a piece with no
 * room, the whole card is thrown again from the next seed, and if that ever
 * failed a number of times the pieces take spots from a fixed uneven set
 * that holds any ten.
 */
function scattered(wanted: readonly Wanted[], seed: number): Pictured[] {
  const kinds: Kind[] = []
  for (const w of wanted) for (let i = 0; i < w.count; i++) kinds.push(w.kind)
  for (let attempt = 0; attempt < 24; attempt++) {
    const out = thrown(kinds, (seed + attempt * 7919) >>> 0)
    if (out.length === kinds.length) return out
  }
  const rng = makeRng(seed)
  const spots = [...UNEVEN]
  return kinds.map((kind) => {
    const [x, y] = spots.splice(Math.floor(rng.next() * spots.length), 1)[0]
    return { kind, x, y }
  })
}

/** Eleven spots on the card, in no row and no column, every two of them further apart than two pictures are wide. */
export const UNEVEN: readonly (readonly [number, number])[] = [[45, 45], [105, 48], [160, 42], [225, 50], [70, 105], [135, 108], [195, 102], [255, 110], [50, 165], [120, 168], [240, 165]]

/** One throw of the pictures: each at a spot found by chance that is clear of the others. Shorter than `kinds` if one found no room. */
function thrown(kinds: readonly Kind[], seed: number): Pictured[] {
  const rng = makeRng(seed)
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
    // No room found by chance: any gap on a fine grid will do.
    for (let gy = pad; gy <= CARD.h - pad && !placed; gy += 8) {
      for (let gx = pad; gx <= CARD.w - pad && !placed; gx += 8) {
        if (out.every((p) => Math.hypot(p.x - gx, p.y - gy) >= apart)) {
          out.push({ kind, x: gx, y: gy })
          placed = true
        }
      }
    }
    if (!placed) return out
  }
  return out
}
