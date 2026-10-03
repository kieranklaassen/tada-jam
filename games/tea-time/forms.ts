// The shapes of the pottery, as numbers: each piece is a profile turned on a
// wheel (a list of radius and height pairs), and a cup also knows how high a
// given amount of tea stands in it. No renderer here: the view turns these on
// a lathe, and the rules read the same numbers, so the tea is drawn exactly
// where the model says it is.
//
// Lengths are in table units (a house cup is a little over one unit across).
// Amounts of tea are in cupfuls: a house cup filled to its rim holds 1.

export type ProfilePoint = { r: number; y: number }

/** The inside of a cup: a cone with its point cut off, wider at the rim. */
export type Bowl = {
  /** Radius of the inside at the bottom. */
  floorR: number
  /** Radius of the inside at the rim. */
  rimR: number
  /** Height of the floor of the inside above the cloth. */
  floorY: number
  /** Height of the rim above the cloth. */
  rimY: number
  /** Cupfuls it holds when the tea stands at the rim. */
  holds: number
}

/** A house cup: wide and open, so the tea in it can be seen from the child's side of the table. */
export const HOUSE_CUP: Bowl = { floorR: 0.34, rimR: 0.6, floorY: 0.1, rimY: 0.52, holds: 1 }

/** The three sizes of cup, by how much each holds: the Mouse's drop, half a cup, and a cup. */
export const CUP_HOLDS = { thimble: 0.15, small: 0.5, house: 1 } as const
export type CupSize = keyof typeof CUP_HOLDS

/** A cup of another size is the house cup scaled, so every cup is the same shape and only its size says how much it holds. */
export function bowlOf(size: CupSize): Bowl {
  const holds = CUP_HOLDS[size]
  const k = Math.cbrt(holds / HOUSE_CUP.holds)
  return { floorR: HOUSE_CUP.floorR * k, rimR: HOUSE_CUP.rimR * k, floorY: HOUSE_CUP.floorY * k, rimY: HOUSE_CUP.rimY * k, holds }
}

/** Volume of the inside up to `t` of the way from floor to rim, in units where the whole inside is 1. */
function shareBelow(bowl: Bowl, t: number): number {
  const a = bowl.floorR, d = bowl.rimR - bowl.floorR
  const part = (u: number) => a * a * u + a * d * u * u + (d * d * u * u * u) / 3
  return part(t) / part(1)
}

/**
 * How far up the inside the tea stands, 0 at the floor and 1 at the rim, for an
 * amount in cupfuls. A cup that flares holds more near the rim, so half a
 * cupful stands above the halfway height. More than the cup holds stands at 1.
 */
export function fillLevel(bowl: Bowl, amount: number): number {
  const share = Math.min(1, Math.max(0, amount / bowl.holds))
  if (share <= 0) return 0
  if (share >= 1) return 1
  let low = 0, high = 1
  for (let i = 0; i < 28; i++) {
    const mid = (low + high) / 2
    if (shareBelow(bowl, mid) < share) low = mid
    else high = mid
  }
  return (low + high) / 2
}

/** The amount that stands at a level, the other way round. */
export function amountAt(bowl: Bowl, level: number): number {
  return bowl.holds * shareBelow(bowl, Math.min(1, Math.max(0, level)))
}

/** Where the surface of the tea is: its height above the cloth and its radius. */
export function surfaceOf(bowl: Bowl, amount: number): { y: number; r: number } {
  const level = fillLevel(bowl, amount)
  return { y: bowl.floorY + (bowl.rimY - bowl.floorY) * level, r: bowl.floorR + (bowl.rimR - bowl.floorR) * level }
}

/** Rows of the inside wall between floor and rim, so a painted ring two rows high is a clean band. */
export const WALL_ROWS = 28
/** How thick the wall of a cup is at the lip. */
const LIP = 0.045

/**
 * A cup's whole profile from the middle of its foot, up the outside, over the
 * lip and down the inside to the middle of the floor. `insideFrom` is the index
 * of the first point of the inside wall (the lip's inner edge), and the inside
 * wall then runs down `WALL_ROWS` rows to the floor.
 */
export function cupProfile(bowl: Bowl): { points: ProfilePoint[]; insideFrom: number } {
  const k = bowl.rimR / HOUSE_CUP.rimR
  const lip = LIP * k
  const footR = bowl.floorR * 0.78
  const points: ProfilePoint[] = [
    { r: 0, y: 0 },
    { r: footR, y: 0 },
    { r: footR, y: bowl.floorY * 0.45 },
  ]
  // The outside swells a little between foot and lip, as a thrown cup does.
  const outside = 10
  for (let i = 0; i <= outside; i++) {
    const t = i / outside
    const r = bowl.floorR + lip + (bowl.rimR - bowl.floorR) * Math.sin((t * Math.PI) / 2) ** 0.9
    points.push({ r, y: bowl.floorY * 0.45 + (bowl.rimY - bowl.floorY * 0.45) * t })
  }
  points.push({ r: bowl.rimR + lip * 0.5, y: bowl.rimY + lip * 0.35 })
  const insideFrom = points.length
  for (let i = 0; i <= WALL_ROWS; i++) {
    const t = 1 - i / WALL_ROWS
    points.push({ r: bowl.floorR + (bowl.rimR - bowl.floorR) * t, y: bowl.floorY + (bowl.rimY - bowl.floorY) * t })
  }
  points.push({ r: 0, y: bowl.floorY })
  return { points, insideFrom }
}

/** The row of the inside wall (0 at the rim, `WALL_ROWS` at the floor) nearest to a level. */
export function wallRowAt(level: number): number {
  return Math.round((1 - Math.min(1, Math.max(0, level))) * WALL_ROWS)
}

/** A saucer: a shallow dish with a well that a cup's foot sits in. */
export type Dish = { wellR: number; rimR: number; rimY: number; holds: number }

export function dishOf(size: CupSize): Dish {
  const k = Math.cbrt(CUP_HOLDS[size])
  // A saucer catches about a fifth of what its cup holds before it runs over.
  return { wellR: 0.34 * k, rimR: 0.98 * k, rimY: 0.11 * k, holds: 0.2 * CUP_HOLDS[size] }
}

export function saucerProfile(dish: Dish): ProfilePoint[] {
  const points: ProfilePoint[] = [{ r: 0, y: 0 }, { r: dish.wellR * 1.15, y: 0 }]
  const rows = 8
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    points.push({ r: dish.wellR * 1.15 + (dish.rimR - dish.wellR * 1.15) * t, y: dish.rimY * t * t })
  }
  points.push({ r: dish.rimR, y: dish.rimY + 0.025 })
  for (let i = rows; i >= 0; i--) {
    const t = i / rows
    points.push({ r: dish.wellR + (dish.rimR - 0.03 - dish.wellR) * t, y: 0.035 + dish.rimY * t * t })
  }
  points.push({ r: 0, y: 0.035 })
  return points
}

/** The teapot's belly, from the foot up to the opening the lid sits in. */
export const POT = { bellyR: 1.0, height: 1.25, mouthR: 0.42, spoutReach: 1.55, spoutY: 1.05 } as const

export function potProfile(): ProfilePoint[] {
  const points: ProfilePoint[] = [{ r: 0, y: 0 }, { r: 0.6, y: 0 }, { r: 0.62, y: 0.06 }]
  const rows = 16
  for (let i = 0; i <= rows; i++) {
    const t = i / rows
    // A round belly, widest a little below the middle, drawn in to the mouth.
    const r = 0.62 + (POT.bellyR - 0.62) * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.5) - (POT.bellyR - POT.mouthR) * Math.max(0, t - 0.45) ** 1.6 * 2.6
    points.push({ r: Math.max(POT.mouthR, r), y: 0.06 + (POT.height - 0.06) * t })
  }
  points.push({ r: POT.mouthR + 0.05, y: POT.height + 0.05 })
  points.push({ r: POT.mouthR - 0.04, y: POT.height + 0.05 })
  return points
}

export function lidProfile(): ProfilePoint[] {
  const y = POT.height + 0.04
  return [
    { r: POT.mouthR + 0.02, y },
    { r: POT.mouthR + 0.03, y: y + 0.05 },
    { r: POT.mouthR * 0.8, y: y + 0.15 },
    { r: POT.mouthR * 0.4, y: y + 0.21 },
    { r: 0.09, y: y + 0.24 },
    { r: 0.08, y: y + 0.3 },
    { r: 0.15, y: y + 0.38 },
    { r: 0.13, y: y + 0.46 },
    { r: 0, y: y + 0.49 },
  ]
}
