// The look of Fire Truck Hero as numbers: garden-toy plastic. Sun-faded
// primaries on pale sand and grass, each toy one fat rounded moulding with a
// darker seam. No renderer here: the colours are plain hex numbers that the
// models and the ground read, and a test holds them apart (ART.md, "The look").

/** The sand of the yard, from dry to wet. Working things stand on this plain pale surface. */
export const SAND = {
  dry: 0xeedcb2,
  speck: 0xdcc594,
  damp: 0xb18f61,
  mud: 0x6f4f35,
  puddle: 0x8ccfe6,
} as const

/** What lies round the yard. */
export const GARDEN = {
  grass: 0x8fca6b,
  grassDark: 0x79b659,
  sky: 0xcfeaf4,
  hedge: 0x5aa85c,
  fence: 0xfaf3e3,
  gate: 0xf2913d,
  trunk: 0xa87d58,
} as const

/** The truck. */
export const TRUCK_PAINT = {
  red: 0xe9574a,
  cream: 0xfaf1dc,
  yellow: 0xf8ca4a,
  glass: 0xa9dcee,
  tyre: 0x51555f,
  grey: 0xa9afb8,
  lightDome: 0x4a98dc,
  pupil: 0x34363d,
} as const

/** The seven things and the animals. Each has a hue of its own, so a two-year-old tells them apart by colour alone. */
export const THINGS_PAINT = {
  poolWall: 0x4fa6e0,
  poolFloor: 0xb5e2f5,
  duck: 0xffd447,
  beak: 0xf2863a,
  flameOuter: 0xff8d3a,
  flameInner: 0xffd95e,
  log: 0x9a6c4a,
  logWet: 0x4c3a30,
  pebble: 0xbdb7ac,
  cat: 0xb08ad8,
  catPale: 0xe9dcf6,
  pot: 0xe07a52,
  soil: 0x8a6a4c,
  shoot: 0x62b34f,
  petal: 0xf472a0,
  boat: 0x36b3a8,
  wheel: 0xf2b53a,
  snailShell: 0xe3a05c,
  snailBody: 0xd9c9a2,
  bee: 0xf4c53a,
} as const

/** Water in the air and on the ground. */
export const WATER = {
  body: 0x74c9f2,
  light: 0xe8f8ff,
} as const

/** What an idle child is shown: a ring and a ghost hand, in a blue that neither the sand nor the grass has. */
export const GUIDE_PAINT = {
  ring: 0x3f8fd8,
  hand: 0x4a8fe0,
  cuff: 0xfaf1dc,
} as const

/** How much darker a seam is than the moulding it runs round. */
export const SEAM_DARKEN = 0.8

/** A colour as three shares of red, green and blue from 0 to 1, as the eye sees them on a screen. */
export function rgbOf(hex: number): [number, number, number] {
  return [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255]
}

/** The same colour darker by a share, for a seam or a shaded part. */
export function darker(hex: number, share = SEAM_DARKEN): number {
  const [r, g, b] = rgbOf(hex)
  return (Math.round(r * share * 255) << 16) | (Math.round(g * share * 255) << 8) | Math.round(b * share * 255)
}

/** How light a colour looks, from 0 (black) to 1 (white). */
export function lightnessOf(hex: number): number {
  const [r, g, b] = rgbOf(hex).map((share) => (share <= 0.04045 ? share / 12.92 : ((share + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** How strongly two colours stand apart, from 1 (the same) to 21 (black on white). */
export function contrast(a: number, b: number): number {
  const [light, dark] = [lightnessOf(a), lightnessOf(b)].sort((x, y) => y - x)
  return (light + 0.05) / (dark + 0.05)
}

/** The hue of a colour in degrees round the colour wheel, or -1 for a grey. */
export function hueOf(hex: number): number {
  const [r, g, b] = rgbOf(hex)
  const most = Math.max(r, g, b), least = Math.min(r, g, b)
  if (most - least < 0.08) return -1
  const span = most - least
  const turn = most === r ? ((g - b) / span) % 6 : most === g ? (b - r) / span + 2 : (r - g) / span + 4
  return (turn * 60 + 360) % 360
}

/** How far apart two hues are, in degrees, the short way round. */
export function hueGap(a: number, b: number): number {
  const gap = Math.abs(hueOf(a) - hueOf(b)) % 360
  return gap > 180 ? 360 - gap : gap
}
