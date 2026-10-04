import { type Who } from './tastes'
import { AT_BENCH, AT_WINDOW, type P } from './stage'

// Where each customer stands, and how much of the lane it hides. Whoever
// passes down the lane passes behind the customers and shows above and
// beside them: a finger there is on the one who passes, and a finger on the
// customer is on the customer. So the bench has to know each one's outline,
// roughly: these rows were measured from the painters (paintCustomers.ts)
// with each customer at rest, and are no part of any rule of the game.

/** How much lower than the rest a customer stands, at full size, so that what it has on top has room under the awning: a crest, a pair of feelers, a neck stretched right out. */
export const STAND: Record<Who, number> = { owl: 0, moth: 20, yak: 0, tortoise: 12, cockatoo: 16, magpie: 4 }
/** How big a customer is drawn at the window, against 1 at the bench: it stands a little further off. */
export const WINDOW_SIZE = 0.8

/**
 * Each customer's outline at the bench, about the place it stands at: from
 * `top` downwards, every ten units, its left and right edge. Below the last
 * row it is as wide as the counter lets it be.
 */
const OUTLINE: Record<Who, { top: number; rows: readonly (readonly [number, number])[] }> = {
  owl: { top: -40, rows: [[-28, 27], [-86, 85], [-85, 84], [-85, 84], [-84, 83], [-86, 85], [-91, 90], [-93, 92], [-94, 93], [-95, 94], [-108, 107], [-119, 118], [-126, 125], [-131, 130], [-134, 133], [-135, 134], [-135, 134]] },
  moth: { top: -60, rows: [[-44, 43], [-31, 30], [-21, 20], [-15, 14], [-12, 11], [-37, 36], [-42, 41], [-44, 43], [-43, 42], [-42, 40], [-39, 38], [-35, 34], [-31, 30], [-31, 30], [-30, 29], [-27, 26], [-29, 28], [-29, 28], [-23, 22]] },
  yak: { top: -70, rows: [[-133, 132], [-135, 134], [-135, 134], [-133, 132], [-130, 129], [-123, 122], [-112, 111], [-91, 90], [-96, 95], [-100, 99], [-101, 100], [-101, 100], [-104, 103], [-121, 120], [-134, 133], [-143, 142], [-150, 149], [-155, 154], [-158, 157], [-159, 158]] },
  tortoise: { top: -20, rows: [[-23, 22], [-33, 32], [-37, 36], [-42, 41], [-70, 69], [-87, 86], [-99, 98], [-108, 107], [-115, 114], [-120, 119], [-123, 122], [-125, 124], [-125, 124], [-123, 122], [-121, 119]] },
  cockatoo: { top: -30, rows: [[-82, -41], [-77, -15], [-70, 28], [-60, 44], [-54, 53], [-60, 59], [-64, 63], [-65, 64], [-65, 64], [-63, 157], [-71, 181], [-81, 185], [-87, 182], [-92, 174], [-95, 162], [-96, 144]] },
  magpie: { top: 0, rows: [[-30, 29], [-42, 41], [-49, 48], [-53, 52], [-55, 54], [-54, 53], [-53, 52], [-66, 65], [-76, 75], [-83, 105], [-87, 131], [-108, 146], [-129, 155]] },
}

/** Where the one at the bench and the one who waits stand when nobody is walking, and how large each is drawn. */
export function standing(place: 'owner' | 'waiting', who: Who): { at: P; size: number } {
  return place === 'owner' ? { at: { x: AT_BENCH.x, y: AT_BENCH.y + STAND[who] }, size: 1 } : { at: { x: AT_WINDOW.x, y: AT_WINDOW.y + STAND[who] * WINDOW_SIZE }, size: WINDOW_SIZE }
}

/** Whether a finger at `p` is on that customer as it is drawn at rest, with a finger's width to spare. */
export function covers(place: 'owner' | 'waiting', who: Who, p: P): boolean {
  const { at, size } = standing(place, who), outline = OUTLINE[who]
  const dx = (p.x - at.x) / size, dy = (p.y - at.y) / size, row = Math.round((dy - outline.top) / 10)
  if (row < -1) return false
  const [left, right] = outline.rows[Math.max(0, Math.min(outline.rows.length - 1, row))]
  return dx >= left - 12 && dx <= right + 12
}
