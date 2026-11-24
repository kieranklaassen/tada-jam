import { BUTLER, type Place, type ThingId, type Where } from './things'
import type { House } from './house'

// What the grandmother dreams of. A wish says who must be where, and who must
// be at home and dry. It is a picture over her chair and nothing more: no one
// reminds the child of it, and any wish can be ignored for ever.
// The order adds one thing at a time: someone by their colour, then someone
// spared, the butler himself, two at once, and the whole family.

export type Wish = { readonly id: string; readonly who: Readonly<Record<ThingId, Where>> }

const FAMILY = ['king', 'queen', 'gran'] as const
const family = (where: Where) => Object.fromEntries(FAMILY.map((id) => [id, where]))

export const WISHES: readonly Wish[] = [
  { id: 'king-soup', who: { king: 'soup' } },
  { id: 'queen-bath', who: { queen: 'bath' } },
  { id: 'gran-bed', who: { gran: 'bed' } },
  { id: 'queen-soup', who: { queen: 'soup', king: 'home' } },
  { id: 'butler-bath', who: { butler: 'bath' } },
  { id: 'king-soup-queen-bath', who: { king: 'soup', queen: 'bath' } },
  { id: 'all-bed', who: family('bed') },
  { id: 'king-bath-hat-dry', who: { king: 'bath', 'red-hat': 'home' } },
  { id: 'all-soup-gran-dry', who: { king: 'soup', queen: 'soup', gran: 'home' } },
  { id: 'three-ways', who: { gran: 'soup', king: 'bath', queen: 'bed' } },
]

/** Where a first visit starts. Age only chooses the first picture; every wish is reached by play. */
export function firstWish(childAge: number | null): number {
  return childAge !== null && childAge >= 6 ? 3 : 0
}

export function whereIs(house: House, id: ThingId): Where {
  return id === BUTLER.id ? (house.butler ?? 'home') : house.at[id]
}

export function isMet(wish: Wish, house: House): boolean {
  return Object.entries(wish.who).every(([id, where]) => whereIs(house, id) === where)
}

/** The first wish from `index` on, round and round, that the house does not already meet. */
export function nextWish(index: number, house: House): number {
  for (let step = 0; step < WISHES.length; step++) {
    const at = (index + step) % WISHES.length
    if (!isMet(WISHES[at], house)) return at
  }
  return index % WISHES.length
}

export function wishPlaces(wish: Wish): Place[] {
  return [...new Set(Object.values(wish.who).filter((where): where is Place => where !== 'home'))]
}
