// The six plants and the twelve stems of the bed, as plain numbers in stage
// units. Nothing here draws: the view paints a stem from these sizes, and the
// garden cuts, carries and stands pieces of them.

export const KINDS = ['sunflower', 'poppy', 'onion', 'thistle', 'ivy', 'dandelion'] as const
export type Kind = (typeof KINDS)[number]

export type Plant = {
  /** How tall the first stem of the plant stands, from the earth to the top of its flower. */
  full: number
  /** How much of that height is flower. */
  head: number
  /** Half the width of the flower. */
  headR: number
  /** A bee rides on the flower for as long as the piece has it. */
  bee: boolean
}

export const PLANTS: Record<Kind, Plant> = {
  sunflower: { full: 372, head: 104, headR: 54, bee: true },
  poppy: { full: 246, head: 62, headR: 36, bee: false },
  onion: { full: 318, head: 76, headR: 38, bee: true },
  thistle: { full: 288, head: 66, headR: 27, bee: true },
  ivy: { full: 300, head: 58, headR: 28, bee: false },
  dandelion: { full: 176, head: 62, headR: 31, bee: false },
}

/** Where the earth of the bed is: every stem stands on this line. */
export const SOIL_Y = 700

export type StemSpot = {
  kind: Kind
  /** Where the stem stands in the bed. */
  x: number
  /** The second stem of each plant is the same plant a little smaller. */
  scale: number
}

/** The bed from the window end to the table end: two stems of each plant. */
export const BED: readonly StemSpot[] = [
  { kind: 'sunflower', x: 116, scale: 1 },
  { kind: 'sunflower', x: 176, scale: 0.86 },
  { kind: 'poppy', x: 234, scale: 1 },
  { kind: 'poppy', x: 280, scale: 0.84 },
  { kind: 'onion', x: 330, scale: 1 },
  { kind: 'onion', x: 382, scale: 0.87 },
  { kind: 'thistle', x: 436, scale: 1 },
  { kind: 'thistle', x: 484, scale: 0.85 },
  { kind: 'ivy', x: 536, scale: 1 },
  { kind: 'ivy', x: 584, scale: 0.86 },
  { kind: 'dandelion', x: 628, scale: 1 },
  { kind: 'dandelion', x: 664, scale: 0.85 },
]

/** The full height of the stem at `index` of the bed. */
export function fullOf(index: number): number {
  const spot = BED[index]
  return Math.round(PLANTS[spot.kind].full * spot.scale)
}

/** How much of that stem's height is flower. */
export function headOf(index: number): number {
  const spot = BED[index]
  return Math.round(PLANTS[spot.kind].head * spot.scale)
}

/** The shortest stalk a cut leaves standing in the earth. */
export const MIN_STALK = 16
/** The shortest piece a cut makes. */
export const MIN_PIECE = 22
