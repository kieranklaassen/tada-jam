// The things of Hats for All, by name. No renderer and no DOM: the rules, the
// tastes and the layout all read these, and the view gives each its shape.

/** The three kinds of hat. A hat is a working piece: one flat colour and one plain outline (ART.md, "The representation"). */
export const HAT_KINDS = ['cone', 'dome', 'brim'] as const
export type HatKind = (typeof HAT_KINDS)[number]

/** The five foam creatures (ART.md, "The characters and their fixed tastes"). */
export const CREATURE_KINDS = ['bop', 'lanky', 'flop', 'wig', 'pip'] as const
export type CreatureKind = (typeof CREATURE_KINDS)[number]

/** The most heads on the mat and the most hats in a tile: sets stay at five or fewer (pack: game-design, ages-2-to-4.md). */
export const MOST = 5

/** A tower of this many hats on one head falls, every time. */
export const TOWER_FALLS_AT = 3

export function isHatKind(value: unknown): value is HatKind {
  return typeof value === 'string' && (HAT_KINDS as readonly string[]).includes(value)
}

export function isCreatureKind(value: unknown): value is CreatureKind {
  return typeof value === 'string' && (CREATURE_KINDS as readonly string[]).includes(value)
}
