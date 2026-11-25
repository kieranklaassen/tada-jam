// Where everything is, in the village's own units: x to the right, y up, z
// towards the child, with x 0 and y 0 in the middle of the picture.

/** Half of what is always in the picture, whatever the surface's shape. */
export const HALF_W = 12.6
export const HALF_H = 8.75

/** Snow lies in this many strips over this stretch. */
export const COLUMNS = 120
export const LEFT = -14
export const RIGHT = 14
export const STRIP = (RIGHT - LEFT) / COLUMNS

/** The pond: open water where no snow bridges it. */
export const POND = { left: 5.5, right: 9.1, level: -6.8 }
/** Snow this deep over the pond bears a sled. */
export const BEARS = 0.34
/** The haystack's near face. */
export const HAY = 12.1

const KNOTS: readonly (readonly [number, number])[] = [
  [-16, -2.5], [-12, -2.6], [-8.4, -2.75], [-6.4, -3.05], [-4.4, -3.75], [-2, -4.65], [0, -5.4], [1.8, -6.0], [3, -6.28],
  [3.8, -6.15], [4.5, -5.7], [4.95, -5.62], [5.3, -6.2], [5.5, -6.8], [9.1, -6.8], [9.5, -6.45], [10, -6.35], [13, -6.3], [16, -6.3],
]
const SLOPES = (() => {
  const d = KNOTS.slice(1).map((k, i) => (k[1] - KNOTS[i][1]) / (k[0] - KNOTS[i][0]))
  return KNOTS.map((_, i) => (i === 0 ? d[0] : i === KNOTS.length - 1 ? d[i - 1] : d[i - 1] * d[i] <= 0 ? 0 : (2 * d[i - 1] * d[i]) / (d[i - 1] + d[i])))
})()

/** The height of the bare hill, the pond's water included. */
export function ground(x: number): number {
  const at = Math.min(KNOTS[KNOTS.length - 1][0], Math.max(KNOTS[0][0], x))
  let i = 0
  while (i < KNOTS.length - 2 && at > KNOTS[i + 1][0]) i++
  const [x0, y0] = KNOTS[i], [x1, y1] = KNOTS[i + 1]
  const w = x1 - x0, t = (at - x0) / w, t2 = t * t, t3 = t2 * t
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * w * SLOPES[i] + (3 * t2 - 2 * t3) * y1 + (t3 - t2) * w * SLOPES[i + 1]
}

export const IDS = ['walrus', 'granny', 'grandpa', 'cow', 'hen', 'mayor'] as const
export type Id = (typeof IDS)[number]
/** Those with a sled, in the order they come to the start. */
export const SLEDS = ['walrus', 'granny', 'grandpa', 'cow'] as const
export type SledId = (typeof SLEDS)[number]
export const isSled = (id: Id): id is SledId => (SLEDS as readonly Id[]).includes(id)

/** Half the width at the runners, how high the next one sits, and how high the whole of it stands. */
export const SIZE: Record<Id, { half: number; seat: number; tall: number }> = {
  walrus: { half: 1.8, seat: 2.75, tall: 2.9 },
  granny: { half: 1.6, seat: 3.0, tall: 3.2 },
  grandpa: { half: 1.35, seat: 2.6, tall: 2.75 },
  cow: { half: 1.4, seat: 2.4, tall: 2.8 },
  hen: { half: 0.68, seat: 1.2, tall: 1.45 },
  mayor: { half: 0.62, seat: 2.35, tall: 2.6 },
}

/** Where the next ones wait, in view behind the start, and where the two who stand about stand. */
export const WAITS: Record<Id, { x: number; z: number }> = {
  walrus: { x: -5.4, z: -3.3 },
  granny: { x: -9.0, z: -3.3 },
  grandpa: { x: -12.2, z: -3.3 },
  cow: { x: 0.6, z: -3.3 },
  hen: { x: 3.5, z: 0 },
  mayor: { x: 10.6, z: 0 },
}
/** Places at the top for whoever comes home, the front one first. */
export const SLOTS = [-5.1, -8.7, -11.4] as const
/** Left of this is the top. */
export const TOP = -3.4
/** Right of this is the bottom. */
export const BOTTOM = 3.6
/** The lane along the front in which they hop home, clear of the one they slide in. */
export const HOME_LANE = 2.6
/** The most who can sit on one another. */
export const MOST_HIGH = 4

/** The quilt: half of what snows, its lowest hem, and how far it can be carried. */
export const QUILT = { half: 1.75, hem: 1.0, left: -9.5, right: 10.5, start: -3.9 }
/** Everything the quilt holds, as snow: strip area, so a hill can be covered with some to spare. */
export const FEATHERS = 15
export const FEATHER = FEATHERS / 240
/** The sun's and the moon's place. */
export const SUN = { x: 10.6, y: 5.3, r: 1.25 }

/** The walkable stretch. */
export const EDGE = { left: -11.6, right: HAY - 0.2 }

/** The eye: straight on, this high and this far from the lane the sleds run in. What stands in that lane is drawn to one scale; what is behind it draws in towards the eye. */
export const EYE = { y: 7, z: 36 }
/** Where a place at depth z is seen, in the lane's own units. */
export function seen(x: number, y: number, z: number): { x: number; y: number; k: number } {
  const k = EYE.z / (EYE.z - z)
  return { x: x * k, y: EYE.y + (y - EYE.y) * k, k }
}
/** The place at depth z that is seen there. */
export function unseen(x: number, y: number, z: number): { x: number; y: number } {
  const k = (EYE.z - z) / EYE.z
  return { x: x * k, y: EYE.y + (y - EYE.y) * k }
}
