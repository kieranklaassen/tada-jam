// The clearing, its six homes, and its six animals. World units: the
// clearing spans about 200 across; y is up; +z points toward the child.

export type Point = { x: number; z: number }
export type Vec3 = { x: number; y: number; z: number }

export const ANIMAL_KEYS = ['owl', 'fox', 'rabbit', 'bear', 'fish', 'songbird'] as const
export type AnimalKey = (typeof ANIMAL_KEYS)[number]

export const HOME_KEYS = ['hollow', 'den', 'burrow', 'cave', 'pond', 'nest'] as const
export type HomeKey = (typeof HOME_KEYS)[number]

export type Habitat = 'tree' | 'ground' | 'water'
export type Kind = 'mammal' | 'bird' | 'fish'

export type AnimalSpec = {
  key: AnimalKey
  home: HomeKey
  kind: Kind
  /** Standing height. */
  size: number
  /** How wide an entrance it needs. */
  girth: number
  /** Ground footprint, for spacing and touch. */
  radius: number
  /** 0 (feather) to 1 (bear): how much it lags and swings when carried. */
  weight: number
  walkSpeed: number
  /** How far below the finger the animal's feet hang when carried. */
  hang: number
}

export type HomeSpec = {
  key: HomeKey
  habitat: Habitat
  /** Where the home model stands. */
  at: Point
  /** The entrance: carried animals fly here, and the drop zone is centred on it. */
  mouth: Vec3
  dropRadius: number
  /** Where its sleeper rests. */
  bed: Vec3
  /** Where a turned-away animal lands, outside the entrance. */
  door: Point
  /** The girth that fits through the entrance. */
  entrance: number
  /** Facing of the opening (radians, 0 = toward the child). */
  facing: number
}

export const ANIMALS: Record<AnimalKey, AnimalSpec> = {
  owl: { key: 'owl', home: 'hollow', kind: 'bird', size: 12, girth: 11, radius: 6.5, weight: 0.35, walkSpeed: 9, hang: 11 },
  fox: { key: 'fox', home: 'den', kind: 'mammal', size: 12, girth: 13, radius: 8, weight: 0.5, walkSpeed: 17, hang: 11 },
  rabbit: { key: 'rabbit', home: 'burrow', kind: 'mammal', size: 11, girth: 9, radius: 6, weight: 0.3, walkSpeed: 15, hang: 10 },
  bear: { key: 'bear', home: 'cave', kind: 'mammal', size: 19, girth: 20, radius: 11, weight: 1, walkSpeed: 8, hang: 17 },
  fish: { key: 'fish', home: 'pond', kind: 'fish', size: 8, girth: 6, radius: 5.5, weight: 0.2, walkSpeed: 12, hang: 8 },
  songbird: { key: 'songbird', home: 'nest', kind: 'bird', size: 6.5, girth: 5, radius: 5, weight: 0.08, walkSpeed: 14, hang: 6 },
}

export const HOMES: Record<HomeKey, HomeSpec> = {
  hollow: {
    key: 'hollow',
    habitat: 'tree',
    at: { x: -78, z: -48 },
    mouth: { x: -77, y: 22, z: -38.5 },
    dropRadius: 13,
    bed: { x: -77, y: 16.2, z: -36.5 },
    door: { x: -64, z: -28 },
    entrance: 14,
    facing: 0.1,
  },
  cave: {
    key: 'cave',
    habitat: 'ground',
    at: { x: -2, z: -62 },
    mouth: { x: -2, y: 9, z: -45 },
    dropRadius: 17,
    bed: { x: -2, y: 0, z: -42 },
    door: { x: -2, z: -28 },
    entrance: 22,
    facing: 0,
  },
  nest: {
    key: 'nest',
    habitat: 'tree',
    at: { x: 74, z: -46 },
    mouth: { x: 74, y: 18, z: -38 },
    dropRadius: 12,
    bed: { x: 74, y: 16.2, z: -38 },
    door: { x: 62, z: -26 },
    entrance: 6,
    facing: -0.1,
  },
  den: {
    key: 'den',
    habitat: 'ground',
    at: { x: -100, z: 4 },
    mouth: { x: -86, y: 6, z: 14 },
    dropRadius: 14,
    bed: { x: -83, y: 0, z: 17 },
    door: { x: -68, z: 14 },
    entrance: 14,
    facing: 0.9,
  },
  burrow: {
    key: 'burrow',
    habitat: 'ground',
    at: { x: 98, z: 4 },
    mouth: { x: 88, y: 4, z: 11 },
    dropRadius: 13,
    bed: { x: 86, y: 0, z: 13 },
    door: { x: 72, z: 13 },
    entrance: 10,
    facing: -0.9,
  },
  pond: {
    key: 'pond',
    habitat: 'water',
    at: { x: -52, z: 46 },
    mouth: { x: -52, y: 0, z: 46 },
    dropRadius: 19,
    bed: { x: -51, y: -0.6, z: 46 },
    door: { x: -30, z: 34 },
    entrance: 99,
    facing: 0,
  },
}

export const POND_RADIUS = 17

/** Where animals wander: an ellipse in the middle of the clearing. */
export const CLEARING = { x: 4, z: 2, rx: 56, rz: 24 }

export function inClearing(p: Point, margin = 0): boolean {
  const dx = (p.x - CLEARING.x) / (CLEARING.rx - margin)
  const dz = (p.z - CLEARING.z) / (CLEARING.rz - margin)
  return dx * dx + dz * dz <= 1
}

/** Pull a point back inside the clearing (in place). */
export function clampToClearing(p: Point, margin = 0): Point {
  const dx = (p.x - CLEARING.x) / (CLEARING.rx - margin)
  const dz = (p.z - CLEARING.z) / (CLEARING.rz - margin)
  const d = Math.hypot(dx, dz)
  if (d > 1) {
    p.x = CLEARING.x + (dx / d) * (CLEARING.rx - margin)
    p.z = CLEARING.z + (dz / d) * (CLEARING.rz - margin)
  }
  return p
}

/** Where each animal first stands, spread across the clearing. */
export const START: Record<AnimalKey, Point> = {
  owl: { x: -30, z: -8 },
  fox: { x: -38, z: 12 },
  rabbit: { x: 30, z: 10 },
  bear: { x: 2, z: -6 },
  fish: { x: -8, z: 16 },
  songbird: { x: 34, z: -10 },
}

/** Dawn wakes them in this order: the songbird first, the bear last. */
export const WAKE_ORDER: readonly AnimalKey[] = ['songbird', 'rabbit', 'fox', 'fish', 'owl', 'bear']
