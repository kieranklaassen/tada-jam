// The shape of the place: where the tree stands, where things can rest, where
// the sun sets. Pure numbers, shared by the painter and the play.

export const CX = 700

// The hollow at the foot of the tree: an arch.
export const HOLLOW = { x: CX, top: 388, bottom: 588, hw: 112 }

// The sun rides straight down the left-hand sky and sets behind the near hill.
export const SUN = { x: 205, top: 132, set: 364, r: 54 }

// The puddle on the forest floor.
export const PUDDLE = { x: 936, y: 726, rx: 90, ry: 34 }

// Two red mushrooms by the left roots.
export const MUSHROOMS = [
  { x: 372, y: 622, s: 1 },
  { x: 334, y: 640, s: 0.62 },
] as const

// Where the forest floor meets what is behind it.
export function floorBack(x: number): number {
  return 583 + 5 * Math.sin(x * 0.006 + 1)
}

export function hillY(x: number): number {
  return 342 - 30 * Math.exp(-(((x - 260) / 260) ** 2)) + 12 * Math.sin(x * 0.011)
}

export function farHillY(x: number): number {
  return 348 - 56 * Math.exp(-(((x - 1060) / 250) ** 2)) + 7 * Math.sin(x * 0.02)
}

// The trunk and its flare of roots, as a left and right edge for each height.
export function treeLeft(y: number): number {
  if (y <= 250) return 580 - 20 * (y / 250)
  return 560 - 190 * ((y - 250) / 332) ** 1.7
}

export function treeRight(y: number): number {
  if (y <= 250) return 820 + 28 * (y / 250)
  return 848 + 185 * ((y - 250) / 332) ** 1.7
}

// The highest point at x where a thing can rest on the roots; Infinity where
// there is no tree.
export function moundTop(x: number): number {
  if (x < 372 || x > 1031) return Infinity
  if (x < 560) return Math.max(300, 250 + 332 * ((560 - x) / 190) ** (1 / 1.7))
  if (x > 848) return Math.max(300, 250 + 332 * ((x - 848) / 185) ** (1 / 1.7))
  return 300
}

export function inHollow(x: number, y: number): boolean {
  const dx = Math.abs(x - HOLLOW.x)
  if (dx > HOLLOW.hw || y > HOLLOW.bottom + 6) return false
  const arch = HOLLOW.top + 95 * (1 - Math.sqrt(Math.max(0, 1 - (dx / HOLLOW.hw) ** 2)))
  return y > arch
}

export function inPuddle(x: number, y: number, pad = 0): boolean {
  const dx = (x - PUDDLE.x) / (PUDDLE.rx + pad)
  const dy = (y - PUDDLE.y) / (PUDDLE.ry + pad)
  return dx * dx + dy * dy < 1
}
