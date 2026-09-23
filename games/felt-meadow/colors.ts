// Seed and flower colours are pigment masks over the three felt dyes in the
// pouch: red, yellow, blue. The bee mixes by carrying pollen of both, and a
// mix holds every pigment of both parents, the way paint does. Two primaries
// make a secondary; anything holding all three is brown. Mixing a colour with
// one it already contains gives the same colour back.

export const RED = 1
export const YELLOW = 2
export const BLUE = 4

export type Hue = 1 | 2 | 3 | 4 | 5 | 6 | 7

export const ORANGE = 3
export const PURPLE = 5
export const GREEN = 6
export const BROWN = 7

export const PRIMARIES: readonly Hue[] = [RED, YELLOW, BLUE]
export const ALL_HUES: readonly Hue[] = [RED, ORANGE, YELLOW, GREEN, BLUE, PURPLE, BROWN]

export function isHue(value: unknown): value is Hue {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 7
}

export function isPrimary(hue: Hue): boolean {
  return hue === RED || hue === YELLOW || hue === BLUE
}

export function mix(a: Hue, b: Hue): Hue {
  return (a | b) as Hue
}

/** Each colour sings its own note when it blooms (a C-major pentatonic-ish ladder, brown lowest). */
export const HUE_NOTE: Readonly<Record<Hue, number>> = {
  1: 523.25,
  3: 587.33,
  2: 659.25,
  6: 783.99,
  4: 880,
  5: 1046.5,
  7: 392,
}
