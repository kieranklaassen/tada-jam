import type { Dye, DyeBy } from './puff'
import type { Print } from './fabric'

export const C = {
  sky: 0x9fd0f0, skyB: 0xb4dcf5, cloud: 0xffffff, cloudB: 0xeaf0ff, grass: 0x86b050, grassB: 0x9cc25f, grassC: 0x74a148, earth: 0x9a7a52,
  snow: 0xffffff, water: 0x3f8fc0, red: 0xcb4338, rust: 0xc9622f, mustard: 0xe6ac34, teal: 0x2f8d87, navy: 0x35507f, cream: 0xf5e9cf, rose: 0xde8199, plum: 0x7d4f7a,
  walrus: 0x93707c, walrusB: 0xa5808a, tusk: 0xfff6e0, tub: 0xe9f0f3, gold: 0xd6a23a, skin: 0xf2c6a4, skinB: 0xe9b18c, hair: 0xf7f4ee, ink: 0x2a2430, wood: 0xa9774a, pan: 0x4c4d5c, white: 0xffffff, brown: 0x8a5a3c,
} as const

export const d = (color: number, print: Print = 'plain'): Dye => ({ color, print })
/** Patches taken in turn, as if from a scrap basket. */
export const scraps = (...dyes: Dye[]): DyeBy => (i, j) => dyes[(i * 3 + j * 5 + (i * j) % 2) % dyes.length]
