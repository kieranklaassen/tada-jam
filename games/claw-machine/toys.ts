// The toys: the working pieces of the game. A toy has exactly three visible
// properties and nothing else about it varies (ART.md, "The representation").

export const COLOURS = ['red', 'blue', 'yellow'] as const
export const KINDS = ['duck', 'car', 'rocket'] as const
export const SIZES = ['small', 'big'] as const

export type Colour = (typeof COLOURS)[number]
export type Kind = (typeof KINDS)[number]
export type Size = (typeof SIZES)[number]

export type Toy = { colour: Colour; kind: Kind; size: Size }

/** The three ways a load can be sorted. */
export const ATTRIBUTES = ['colour', 'kind', 'size'] as const
export type Attribute = (typeof ATTRIBUTES)[number]

/** Every value an attribute can take, in a fixed order. */
export const VALUES: { readonly [A in Attribute]: readonly Toy[A][] } = { colour: COLOURS, kind: KINDS, size: SIZES }

export function sameToy(a: Toy, b: Toy): boolean {
  return a.colour === b.colour && a.kind === b.kind && a.size === b.size
}

/** A toy read from untrusted data, or null when it is not one. */
export function readToy(raw: unknown): Toy | null {
  if (typeof raw !== 'object' || raw === null) return null
  const { colour, kind, size } = raw as Record<string, unknown>
  if (!COLOURS.includes(colour as Colour) || !KINDS.includes(kind as Kind) || !SIZES.includes(size as Size)) return null
  return { colour: colour as Colour, kind: kind as Kind, size: size as Size }
}
