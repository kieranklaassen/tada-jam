// The found things, the hollow they are carried into and the forest floor
// they lie on, all in stage units (stage.ts). Nothing here draws or moves.

/** The seven kinds of found thing, in the order of the grid in ART.md. */
export const KINDS = ['leaf', 'cap', 'pebble', 'bark', 'twig', 'moss', 'feather'] as const
export type Kind = (typeof KINDS)[number]

/** What a thing can come to rest on: the ground, or one of the four kinds that carry. */
export const SUPPORTS = ['ground', 'moss', 'pebble', 'twig', 'bark'] as const
export type Support = (typeof SUPPORTS)[number]

/** A leaf, an acorn cap and a feather carry nothing: what is set on one is shed. */
export function carries(kind: Kind): kind is Exclude<Support, 'ground'> {
  return kind === 'moss' || kind === 'pebble' || kind === 'twig' || kind === 'bark'
}

/** How a thing is while it is carried or lies on the forest floor: its width, its height, and how heavily it falls (1 is a stone, 0.1 a feather). */
export const BODY: Record<Kind, { w: number; h: number; weight: number }> = {
  leaf: { w: 136, h: 20, weight: 0.35 },
  cap: { w: 52, h: 34, weight: 0.7 },
  pebble: { w: 64, h: 44, weight: 1 },
  bark: { w: 156, h: 24, weight: 0.85 },
  twig: { w: 16, h: 116, weight: 0.6 },
  moss: { w: 100, h: 44, weight: 0.5 },
  feather: { w: 112, h: 18, weight: 0.1 },
}

/** How many of each kind lie in the wood. */
const COUNT: Record<Kind, number> = { leaf: 3, cap: 2, pebble: 2, bark: 2, twig: 4, moss: 3, feather: 2 }

/** A thing's own place on the forest floor: where its underside lies, and how it is turned there, in radians. */
export type Home = { x: number; y: number; angle: number }

/** The two rows of the forest floor, the nearer one lower on the stage. Each kind is spread over both sides. */
const FLOOR: readonly { kind: Kind; x: number; y: number }[] = [
  { kind: 'twig', x: 262, y: 706 }, { kind: 'cap', x: 340, y: 706 }, { kind: 'leaf', x: 446, y: 706 }, { kind: 'pebble', x: 556, y: 706 },
  { kind: 'moss', x: 652, y: 706 }, { kind: 'twig', x: 742, y: 706 }, { kind: 'cap', x: 822, y: 706 }, { kind: 'feather', x: 916, y: 706 },
  { kind: 'bark', x: 100, y: 792 }, { kind: 'moss', x: 222, y: 792 }, { kind: 'twig', x: 318, y: 792 }, { kind: 'leaf', x: 432, y: 792 },
  { kind: 'pebble', x: 536, y: 792 }, { kind: 'bark', x: 662, y: 792 }, { kind: 'moss', x: 790, y: 792 }, { kind: 'twig', x: 884, y: 792 },
  { kind: 'leaf', x: 990, y: 792 }, { kind: 'feather', x: 1100, y: 792 },
]

/** A twig lies down on the forest floor; in the hollow it stands. */
const LYING: Partial<Record<Kind, number>> = { twig: 1.2 }

export type Found = { id: number; kind: Kind; home: Home }

/**
 * Every found thing, numbered. A save stores these numbers, so the order is
 * fixed: kind by kind as KINDS has them, and within a kind from left to right.
 */
export const FOUND: readonly Found[] = KINDS.flatMap((kind) =>
  FLOOR.filter((spot) => spot.kind === kind).sort((a, b) => a.x - b.x),
).map((spot, id) => ({
  id,
  kind: spot.kind,
  // A small turn of its own, so that no two lie alike. It comes from the number, never from chance.
  home: { x: spot.x, y: spot.y, angle: (LYING[spot.kind] ?? 0) + (((id * 37) % 11) - 5) * 0.018 },
}))

/** Which of its kind a found thing is, counted from the left of the forest floor: a twig is drawn as itself by this. */
export const NTH_OF_KIND: readonly number[] = FOUND.map((found) => FOUND.filter((thing) => thing.kind === found.kind && thing.id < found.id).length)

/** True when the table above holds the count of each kind. */
export const FOUND_COUNTS_HOLD = KINDS.every((kind) => FOUND.filter((thing) => thing.kind === kind).length === COUNT[kind])

/**
 * The hollow between the roots, seen from the front: a floor, a root step at
 * its left that stands higher, and an arch over both.
 */
export const HOLLOW = {
  left: 352,
  right: 852,
  /** The root step: from the left wall to here the ground is higher. */
  stepRight: 492,
  stepY: 522,
  floorY: 604,
  /** The arch is half an ellipse standing on the floor. */
  archX: 602,
  archRx: 262,
  archRy: 322,
} as const

/** The height of the ground under a point of the hollow. */
export function groundY(x: number): number {
  return x < HOLLOW.stepRight ? HOLLOW.stepY : HOLLOW.floorY
}

/** The underside of the arch above a point of the hollow. Outside the arch there is no room at all. */
export function ceilingY(x: number): number {
  const t = (x - HOLLOW.archX) / HOLLOW.archRx
  if (Math.abs(t) >= 1) return HOLLOW.floorY
  return HOLLOW.floorY - HOLLOW.archRy * Math.sqrt(1 - t * t)
}

/** Whether a thing let go at this point is let go over the hollow: under the arch, with a little grace all round. */
export function overHollow(x: number, y: number): boolean {
  if (x < HOLLOW.left - 24 || x > HOLLOW.right + 24) return false
  const inside = Math.min(HOLLOW.right, Math.max(HOLLOW.left, x))
  return y > ceilingY(inside) - 36 && y < HOLLOW.floorY + 44
}

/** The jam's round home control: 48 px across at the top centre of the surface, 10 px from the top. Nothing that answers a touch may lie under it. */
export const HOME_CONTROL = { x: 590, y: 34, r: 24 } as const

// --- The wood round the hollow, as it is drawn (art.ts draws from these) ------

/**
 * The underside of the tree, from far left to far right: where the earth begins under its roots. Left of the hollow
 * the left root has a knee, thick enough there for a finger between the snail on its top and the earth under it.
 */
const ROOT_UNDER: readonly number[] = [-420, 730, -60, 704, 60, 672, 200, 680, 330, 676, 480, 634, 700, 636, 880, 640, 1000, 656, 1140, 676, 1260, 700, 1600, 730]

/** The tree's trunk and its two roots, as one outline: x and y in turn. */
export const TREE: readonly number[] = [
  404, -420, 392, 120, 372, 250, 336, 420, 318, 566, 232, 596, 120, 614, 30, 640, -60, 668, -420, 700,
  ...ROOT_UNDER,
  1600, 702, 1260, 668, 1100, 628, 1000, 578, 918, 496, 850, 390, 815, 250, 800, 120, 790, -420,
]

/** Between these the outline is the trunk; left and right of them it is a root. */
export const ROOTS = { left: 322, right: 918 } as const

/** The underside of the tree's roots at a place along the stage: where the earth begins under them. */
export function rootUnder(x: number): number {
  const line = ROOT_UNDER
  for (let i = 2; i < line.length; i += 2) {
    if (x > line[i]) continue
    const t = (x - line[i - 2]) / (line[i] - line[i - 2])
    return line[i - 1] + (line[i + 1] - line[i - 1]) * Math.max(0, t)
  }
  return line[line.length - 1]
}

/** The bushes behind where the folk sit: the middle of each and how large it is. A clump is a quarter wider than that and a little less high. */
export const BUSHES: readonly (readonly [number, number, number])[] = [[70, 500, 96], [236, 470, 74], [-10, 600, 70], [1010, 530, 84], [1150, 500, 80], [1200, 610, 60]]

/**
 * The air over the back of the hill, from its crest to the right: a finger there is on the hill, which is far off and
 * low, so that by day the hill has a place a finger finds between the tidy one, the sun above and the bushes below.
 */
export const HILL_AIR = { fromX: 1010, fromY: 352 } as const

/** Where the forest floor begins: below this the page is earth, in front of everything that stands behind it. */
export const FLOOR_FROM = 606

/** The hill the sun stands over and sinks behind. `seen` is the part of the stage the surface shows. */
export function hillPoints(seen: { x: number; w: number }): number[] {
  const right = seen.x + seen.w
  // Up to the stage's right edge the hill is the same at every width of surface, so the sun sets on the same line everywhere.
  return [840, 500, 900, 440, 1010, 404, 1120, 410, 1220, 450, right + 80, 462, right + 80, 660, 840, 660]
}

/** How high the hill's top line is at a place along the stage, as it is drawn: the model's hill line is held to this. */
export function hillTop(x: number, seen: { x: number; w: number }): number {
  const points = hillPoints(seen)
  // The top runs through the middles of its sides, each bent toward the corner between them.
  for (let i = 1; i < 5; i++) {
    const [cx, cy] = [points[i * 2], points[i * 2 + 1]]
    const ax = (points[(i - 1) * 2] + cx) / 2, ay = (points[(i - 1) * 2 + 1] + cy) / 2
    const bx = (cx + points[(i + 1) * 2]) / 2, by = (cy + points[(i + 1) * 2 + 1]) / 2
    if (x < ax || x > bx) continue
    let low = 0, high = 1
    for (let step = 0; step < 30; step++) {
      const t = (low + high) / 2
      if ((1 - t) * (1 - t) * ax + 2 * t * (1 - t) * cx + t * t * bx < x) low = t
      else high = t
    }
    const t = (low + high) / 2
    return (1 - t) * (1 - t) * ay + 2 * t * (1 - t) * cy + t * t * by
  }
  return points[points.length - 1]
}
