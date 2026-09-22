// World geometry for the table, in world units (KTD3). The world is always
// 1600 × 1000; the scene fits it into whatever box it is given.

export const WORLD = { w: 1600, h: 1000 } as const

export type Point = { x: number; y: number }
export type Rect = { x: number; y: number; w: number; h: number }
export type Circle = { x: number; y: number; r: number }

export const TABLE: Rect = { x: 30, y: 30, w: 1400, h: 940 }
export const SHELF: Rect = { x: 1450, y: 60, w: 130, h: 880 }
export const BAG: Circle = { x: 180, y: 815, r: 100 }
export const BAG_MOUTH: Point = { x: 250, y: 740 }
export const MAT: Rect = { x: 360, y: 170, w: 840, h: 600 }
export const MAT_CENTER: Point = { x: MAT.x + MAT.w / 2, y: MAT.y + MAT.h / 2 }

export const STONE_RADIUS = 30

/** Quarter-stone amounts: a whole stone is 4, a half 2, a quarter 1. */
export type Quarters = 1 | 2 | 4
export const RADIUS_BY_QUARTERS: Record<Quarters, number> = { 4: STONE_RADIUS, 2: 23, 1: 17 }

export const SCALE = {
  post: { x: MAT_CENTER.x, y: MAT_CENTER.y - 20 },
  beamHalf: 250,
  pans: [
    { x: MAT_CENTER.x - 250, y: MAT_CENTER.y + 60, r: 140 },
    { x: MAT_CENTER.x + 250, y: MAT_CENTER.y + 60, r: 140 },
  ] as const,
  maxTilt: 0.2,
  maxDrop: 44,
} as const

const SEAT_DIRECTIONS: readonly Point[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0.62, y: 0.78 },
  { x: -0.62, y: 0.78 },
  { x: -1, y: 0 },
]

/** Seats in clockwise dealing order: top, right, bottom-right, bottom-left, left. */
export const FEEDING = {
  bowl: { x: MAT_CENTER.x, y: MAT_CENTER.y, r: 105 },
  knifeRest: { x: MAT_CENTER.x + 150, y: MAT_CENTER.y - 85 },
  plateRadius: 78,
  seats: SEAT_DIRECTIONS.map((d) => {
    const plate = { x: MAT_CENTER.x + d.x * 285, y: MAT_CENTER.y + d.y * 205 }
    const guest = { x: plate.x + d.x * 118, y: plate.y + d.y * 100 }
    return { plate, guest, facing: d }
  }),
} as const

export const MAT_KEYS = ['feeding', 'scale'] as const
export type MatKey = (typeof MAT_KEYS)[number]

export function shelfSlot(index: number): Rect {
  return { x: SHELF.x + 12, y: SHELF.y + 40 + index * 150, w: SHELF.w - 24, h: 110 }
}

export function insideRect(p: Point, r: Rect): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h
}

export function insideCircle(p: Point, c: Circle, slop = 0): boolean {
  return Math.hypot(p.x - c.x, p.y - c.y) <= c.r + slop
}

export function clampToTable(p: Point, margin = STONE_RADIUS): Point {
  return {
    x: Math.min(TABLE.x + TABLE.w - margin, Math.max(TABLE.x + margin, p.x)),
    y: Math.min(TABLE.y + TABLE.h - margin, Math.max(TABLE.y + margin, p.y)),
  }
}

export type Fit = { scale: number; offsetX: number; offsetY: number; usable: boolean }

/** Letterbox the world into a box of CSS pixels, centered. */
export function fitWorld(width: number, height: number): Fit {
  if (!(width > 0) || !(height > 0)) return { scale: 1, offsetX: 0, offsetY: 0, usable: false }
  const scale = Math.min(width / WORLD.w, height / WORLD.h)
  return {
    scale,
    offsetX: (width - WORLD.w * scale) / 2,
    offsetY: (height - WORLD.h * scale) / 2,
    usable: true,
  }
}

export function toScreen(p: Point, fit: Fit): Point {
  return { x: p.x * fit.scale + fit.offsetX, y: p.y * fit.scale + fit.offsetY }
}

export function toWorld(p: Point, fit: Fit): Point {
  return { x: (p.x - fit.offsetX) / fit.scale, y: (p.y - fit.offsetY) / fit.scale }
}
