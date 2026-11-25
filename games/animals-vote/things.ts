// The animals, the things they can vote for, their tastes and the snacks.
// Nothing here changes while the game runs: a child can learn it and use it.

export const ANIMALS = ['pig', 'elephant', 'cat', 'mouse', 'goat', 'giraffe'] as const
export type Animal = (typeof ANIMALS)[number]

export const THINGS = ['bath', 'mud', 'dance', 'fly', 'sleep'] as const
export type Thing = (typeof THINGS)[number]

export const SNACKS = ['carrot', 'cheese', 'bun'] as const
export type Snack = (typeof SNACKS)[number]

/** Best first. The last is the one it cannot stand. */
export const TASTES: Record<Animal, readonly Thing[]> = {
  pig: ['mud', 'fly', 'dance', 'sleep', 'bath'],
  elephant: ['bath', 'dance', 'sleep', 'mud', 'fly'],
  cat: ['sleep', 'fly', 'dance', 'mud', 'bath'],
  giraffe: ['dance', 'fly', 'bath', 'sleep', 'mud'],
  goat: ['mud', 'sleep', 'bath', 'fly', 'dance'],
  mouse: ['fly', 'dance', 'mud', 'bath', 'sleep'],
}

export const LOVERS: Record<Snack, readonly Animal[]> = {
  carrot: ['giraffe', 'goat', 'pig'],
  cheese: ['mouse', 'cat', 'pig'],
  bun: ['elephant', 'pig'],
}

export const hates = (who: Animal, thing: Thing): boolean => TASTES[who][THINGS.length - 1] === thing

export type Coat = 'clean' | 'muddy' | 'bubbly' | 'fizzy'
export const COATS: readonly Coat[] = ['clean', 'muddy', 'bubbly', 'fizzy']

/** What a result leaves on somebody. A bath takes mud off; mud in the bath fizzes; foam falls off in anything else. */
export function coatAfter(coat: Coat, won: readonly Thing[]): Coat {
  const bath = won.includes('bath'), mud = won.includes('mud')
  if (bath && mud) return 'fizzy'
  if (bath) return 'bubbly'
  if (mud) return 'muddy'
  return coat === 'bubbly' ? 'clean' : coat
}

/** What the mole would like, and the town it is asked of. */
export type Wish = { id: string; count: number; ballot: readonly [Thing, Thing, Thing | null]; wish: readonly Thing[] }

export const WISHES: readonly Wish[] = [
  { id: 'mud-for-all', count: 4, ballot: ['bath', 'mud', null], wish: ['mud'] },
  { id: 'one-over', count: 5, ballot: ['dance', 'sleep', null], wish: ['sleep'] },
  { id: 'both-at-once', count: 6, ballot: ['fly', 'sleep', null], wish: ['fly', 'sleep'] },
  { id: 'make-a-tie', count: 6, ballot: ['bath', 'dance', null], wish: ['bath', 'dance'] },
  { id: 'third-column', count: 6, ballot: ['bath', 'mud', 'dance'], wish: ['mud'] },
  { id: 'all-three', count: 6, ballot: ['mud', 'fly', 'sleep'], wish: ['mud', 'fly', 'sleep'] },
  { id: 'from-the-top', count: 6, ballot: ['bath', 'fly', 'dance'], wish: ['bath'] },
  { id: 'one-of-three', count: 6, ballot: ['fly', 'dance', 'sleep'], wish: ['sleep'] },
  { id: 'level-all', count: 6, ballot: ['bath', 'mud', 'dance'], wish: ['bath', 'mud', 'dance'] },
  { id: 'pair-of-three', count: 6, ballot: ['bath', 'mud', 'fly'], wish: ['bath', 'mud'] },
]
/** Where the order goes on after its last. */
export const AROUND = 2

export const wishAt = (id: string): Wish => WISHES.find((w) => w.id === id) ?? WISHES[0]
export function nextWish(id: string): string {
  const at = WISHES.findIndex((w) => w.id === id)
  return WISHES[at + 1 < WISHES.length ? at + 1 : AROUND].id
}
/** Age is a hint: where a first visit starts. */
export const firstWish = (childAge: number | null): string => (childAge !== null && childAge >= 6 ? 'one-over' : 'mud-for-all')
