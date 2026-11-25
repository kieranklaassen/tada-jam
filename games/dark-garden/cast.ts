// Who there is: four who carry, four kinds of place, sixteen who sleep. Which
// sleeper wakes is fixed by who set the light and what kind of place it is,
// so what a child finds out stays true.

export type Carrier = 'gnome' | 'goose' | 'hare' | 'bear'
export type Kind = 'pond' | 'tree' | 'burrow' | 'moss'
export type Sleeper =
  | 'toad' | 'duckling' | 'pike' | 'turtle'
  | 'owl' | 'bat' | 'squirrel' | 'woodpecker'
  | 'mole' | 'worm' | 'fox' | 'badger'
  | 'snail' | 'caterpillar' | 'hedgehog' | 'mushroom'

export const CARRIERS: readonly Carrier[] = ['gnome', 'goose', 'hare', 'bear']

const WAKES: Readonly<Record<Kind, Readonly<Record<Carrier, Sleeper>>>> = {
  pond: { gnome: 'toad', goose: 'duckling', hare: 'pike', bear: 'turtle' },
  tree: { gnome: 'owl', goose: 'bat', hare: 'squirrel', bear: 'woodpecker' },
  burrow: { gnome: 'mole', goose: 'worm', hare: 'fox', bear: 'badger' },
  moss: { gnome: 'snail', goose: 'caterpillar', hare: 'hedgehog', bear: 'mushroom' },
}

export const KINDS = Object.keys(WAKES) as readonly Kind[]

export function wakes(kind: Kind, carrier: Carrier): Sleeper {
  return WAKES[kind][carrier]
}

/** The glass of each carrier's apple. */
export const APPLE: Readonly<Record<Carrier, string>> = { gnome: '#e2382f', goose: '#f4bd2a', hare: '#7fc447', bear: '#e0629a' }

/** The pitch each carrier leaves behind, in hertz: four notes that sound well in any order. */
export const PITCH: Readonly<Record<Carrier, number>> = { bear: 293.66, gnome: 369.99, goose: 440, hare: 587.33 }

/** Seconds a sleeper's joke lasts. */
export const JOKE: Readonly<Record<Sleeper, number>> = {
  toad: 1.5, duckling: 1.2, pike: 1.3, turtle: 1.8,
  owl: 1.6, bat: 1.5, squirrel: 1.5, woodpecker: 1.5,
  mole: 1.4, worm: 1.9, fox: 1.4, badger: 1.8,
  snail: 1.5, caterpillar: 1.6, hedgehog: 1.4, mushroom: 1.7,
}
