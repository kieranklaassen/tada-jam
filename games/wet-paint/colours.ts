// The eight values a cell of the water can hold, and what two of them make.
// Three pot colours, the three colours any two of them make, the brown all
// three make, and clear water. The numbers are what a save stores, three bits
// to a cell, so they never change.

export const WATER = 0
export const RED = 1
export const YELLOW = 2
export const BLUE = 3
export const ORANGE = 4
export const GREEN = 5
export const VIOLET = 6
export const BROWN = 7

/** How many values there are: a cell fits in three bits. */
export const VALUES = 8

/** The pots, in the order they stand, by the colour each holds. */
export const POTS: readonly number[] = [RED, YELLOW, BLUE]

export function isPot(colour: number): boolean {
  return colour === RED || colour === YELLOW || colour === BLUE
}

/** The two pot colours a mixed colour is made of, or null for anything else. */
export function parentsOf(colour: number): readonly [number, number] | null {
  if (colour === ORANGE) return [RED, YELLOW]
  if (colour === GREEN) return [YELLOW, BLUE]
  if (colour === VIOLET) return [RED, BLUE]
  return null
}

/**
 * What comes up by itself where the pot colour `carried` is pulled through `there`, or `WATER` when nothing does.
 * Two pot colours make their mix. A pot colour pulled through a mix that does not hold it makes brown. Clear
 * water, the same colour, a mix that already holds the pot colour, and brown itself make nothing.
 */
export function mixOf(carried: number, there: number): number {
  if (!isPot(carried) || there === WATER || there === BROWN || there === carried) return WATER
  if (isPot(there)) {
    const low = Math.min(carried, there), high = Math.max(carried, there)
    if (low === RED && high === YELLOW) return ORANGE
    if (low === YELLOW && high === BLUE) return GREEN
    return VIOLET
  }
  const parents = parentsOf(there)
  if (!parents) return WATER
  return parents[0] === carried || parents[1] === carried ? WATER : BROWN
}

/** One colour as it floats: its flat face, and the darker line at its edge. Red, green and blue, 0 to 255. */
export type Ink = { face: readonly [number, number, number]; edge: readonly [number, number, number] }

/** The inks by value. Clear water has no ink: the tray shows through. */
export const INKS: readonly Ink[] = [
  { face: [0, 0, 0], edge: [0, 0, 0] },
  { face: [214, 62, 56], edge: [146, 30, 36] },
  { face: [244, 196, 48], edge: [184, 128, 14] },
  { face: [44, 92, 178], edge: [22, 50, 112] },
  { face: [238, 134, 42], edge: [172, 80, 14] },
  { face: [76, 160, 84], edge: [36, 100, 52] },
  { face: [128, 78, 166], edge: [78, 40, 108] },
  { face: [122, 82, 58], edge: [70, 44, 30] },
]

export function css(rgb: readonly [number, number, number]): string {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`
}
