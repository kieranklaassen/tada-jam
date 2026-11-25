// Who comes to the table, how wide they are, what they bring and what they
// think of every dish. Nothing here changes while the game is played.

export const GUESTS = ['granny', 'grandpa', 'baby', 'aunt', 'uncle', 'dog', 'tall', 'goose', 'little', 'cow', 'bear', 'moose'] as const
export type GuestId = (typeof GUESTS)[number]

export const DISHES = ['corn', 'mash', 'milk', 'jelly', 'sausages', 'gravy', 'pancakes', 'rolls', 'pumpkin', 'cheese', 'honey', 'pie'] as const
export type DishId = (typeof DISHES)[number]

/** One seat, in world units, for someone of width 1. */
export const SEAT = 108

type Guest = {
  /** World units along the table. */
  width: number
  /** From the table's top up to the middle of the head. */
  tall: number
  brings: DishId
  likes: readonly DishId[]
  hates: DishId
  /** How quick this one is: what it does takes 1 / tempo as long. */
  tempo: number
}

export const CAST: Readonly<Record<GuestId, Guest>> = {
  granny: { width: 1.0 * SEAT, tall: 128, brings: 'corn', likes: ['rolls'], hates: 'honey', tempo: 1.2 },
  grandpa: { width: 1.05 * SEAT, tall: 142, brings: 'mash', likes: ['mash'], hates: 'cheese', tempo: 0.7 },
  baby: { width: 0.95 * SEAT, tall: 112, brings: 'milk', likes: ['jelly'], hates: 'corn', tempo: 1.5 },
  aunt: { width: 1.6 * SEAT, tall: 152, brings: 'jelly', likes: ['mash'], hates: 'rolls', tempo: 0.95 },
  uncle: { width: 1.35 * SEAT, tall: 146, brings: 'sausages', likes: ['sausages'], hates: 'milk', tempo: 0.9 },
  dog: { width: 0.95 * SEAT, tall: 108, brings: 'gravy', likes: ['sausages', 'gravy'], hates: 'pumpkin', tempo: 1.6 },
  tall: { width: 0.85 * SEAT, tall: 232, brings: 'pancakes', likes: ['corn'], hates: 'jelly', tempo: 0.75 },
  goose: { width: 0.9 * SEAT, tall: 176, brings: 'rolls', likes: ['corn'], hates: 'gravy', tempo: 1.4 },
  little: { width: 0.95 * SEAT, tall: 118, brings: 'pumpkin', likes: ['pancakes'], hates: 'sausages', tempo: 1.3 },
  cow: { width: 1.45 * SEAT, tall: 158, brings: 'cheese', likes: ['pumpkin'], hates: 'pie', tempo: 0.65 },
  bear: { width: 1.5 * SEAT, tall: 168, brings: 'honey', likes: ['honey'], hates: 'corn', tempo: 0.8 },
  moose: { width: 1.6 * SEAT, tall: 178, brings: 'pie', likes: ['pie'], hates: 'pumpkin', tempo: 0.7 },
}

/** Those who are always at home. */
export const HOME: readonly GuestId[] = ['granny', 'grandpa']

const MIDDLE: readonly GuestId[] = ['aunt', 'uncle', 'dog', 'tall', 'goose', 'little', 'cow', 'bear']

/** The order in which they come, after so many visits ended: the baby first and the moose last, and between them another at the door each time. */
export function arrivals(rounds: number): GuestId[] {
  const by = (rounds * 3) % MIDDLE.length
  return ['baby', ...MIDDLE.slice(by), ...MIDDLE.slice(0, by), 'moose']
}

export function dishOf(id: GuestId): DishId {
  return CAST[id].brings
}

export function ownerOf(dish: DishId): GuestId {
  return GUESTS[DISHES.indexOf(dish)]
}
