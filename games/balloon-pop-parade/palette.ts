// The colours of the look: inflatable vinyl toys in daylight. Pure data, so the
// rules and the tests can read it without a renderer.
//
// A friend is one hue all over and its balloons are exactly that hue, since
// colour is the one attribute the child sorts by. The four hues are spread
// round the wheel and differ in lightness as well, and none is the sky's.

export type Rgb = readonly [number, number, number]

/** One colour per kind of friend, and so per colour of balloon. */
export const KIND_COLOURS = {
  duck: '#ffcc1f',
  frog: '#1fc48d',
  hippo: '#8b5cf6',
  crab: '#ee3345',
} as const

export const PALETTE = {
  /** The open sky, top and horizon: paler than any balloon and no balloon's hue. */
  skyTop: '#aee4f4',
  skyLow: '#effbff',
  /** The inflatable hill the friends stand on, and the far one the parade goes round. */
  hill: '#ffd3df',
  hillSeam: '#f7a9c0',
  farHill: '#f3cde2',
  cloud: '#ffffff',
  /** Printed eyes. */
  ink: '#22203a',
  /** What is printed on the whale and the keeper, who live in the setting: an ink softer than the friends', so their faces sit below the friends' in contrast. */
  softInk: '#6f7aa6',
  /** Valves and the shine in an eye. */
  valve: '#ffffff',
  string: '#fffaf0',
  /** What a blob shadow is before it takes a tint of the toy above it. */
  shadow: '#b9668a',
  /** A drop from a cloud. */
  drop: '#7fc8ea',
  /** The breathing glow on what can be touched. */
  glow: '#fff3b0',
} as const

/**
 * The setting: a seaside of pool toys, painted once. Every colour here is paler than any balloon and is hazed
 * further by its distance, so the setting stands lower in contrast than what can be touched.
 */
export const SETTING_COLOURS = {
  sea: '#c4ecf3',
  lilacHill: '#e0d4f7',
  mintHill: '#d2f1e0',
  creamHill: '#fdeccb',
  peachHill: '#ffdfc8',
  sand: '#f3dcb8',
  leaf: '#b7e8cd',
  coral: '#ffb9a8',
  aqua: '#bfe9f5',
  water: '#9bd9ee',
  petal: '#ffffff',
  pollen: '#ffe9a6',
  /** The whale in the paddling pool, the keeper on the far hill, and the beach ball. */
  whale: '#b9c9f4',
  belly: '#f4f7ff',
  keeper: '#ffd9c2',
  ball: '#fff6dc',
  /** What is printed on a cloud: a pale ink, so a cloud's face is seen only when one looks for it. */
  cloudInk: '#b2c6da',
  /** A cheek. */
  blush: '#ffc2cf',
} as const

/** A hex colour as three sRGB numbers from 0 to 1. */
export function rgb(hex: string): Rgb {
  const n = Number.parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

/** The same hue a step darker (amount below 0) or lighter (above 0): a string, a tongue, a shadow, a balloon far off. Never a part of a friend, which is one flat colour all over. */
export function shade(hex: string, amount: number): string {
  const mix = amount < 0 ? 0 : 1
  const t = Math.abs(amount)
  const [r, g, b] = rgb(hex).map((c) => Math.round((c + (mix - c) * t) * 255))
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`
}

/** Relative luminance of an sRGB colour, 0 to 1. */
export function luminance(hex: string): number {
  const [r, g, b] = rgb(hex).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contrast ratio of two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const la = luminance(a), lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Hue in degrees, 0 to 360. */
export function hue(hex: string): number {
  const [r, g, b] = rgb(hex)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  if (max === min) return 0
  const d = max - min
  const h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4
  return (h * 60 + 360) % 360
}
