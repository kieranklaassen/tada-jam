// Where everything in the oak is, in stage units (stage.ts): the landings a
// walker can stand on, the twelve places a piece can go, the four doors, the
// basket. Pure numbers, shared by the rules and by the picture. Nothing here
// changes while the game runs.

export type Pt = { x: number; y: number }

/** A landing: the meadow, or a flat pad on a limb. `y` is where feet stand, and walkers stand between `s0` and `s1`, clear of the foot of every rise that starts here. */
export type Landing = { id: string; x0: number; x1: number; y: number; s0: number; s1: number }

export const MEADOW = 0
export const LANDINGS: readonly Landing[] = [
  { id: 'meadow', x0: 120, x1: 1060, y: 704, s0: 330, s1: 850 },
  { id: 'lowL', x0: 290, x1: 480, y: 566, s0: 306, s1: 404 },
  { id: 'lowR', x0: 700, x1: 890, y: 566, s0: 776, s1: 874 },
  { id: 'midL', x0: 330, x1: 500, y: 428, s0: 388, s1: 488 },
  { id: 'midR', x0: 680, x1: 850, y: 428, s0: 692, s1: 792 },
  { id: 'farL', x0: 60, x1: 215, y: 428, s0: 74, s1: 170 },
  { id: 'farR', x0: 965, x1: 1120, y: 428, s0: 990, s1: 1100 },
  { id: 'highL', x0: 300, x1: 480, y: 290, s0: 366, s1: 466 },
  { id: 'highR', x0: 700, x1: 880, y: 290, s0: 714, s1: 814 },
]

/** A rise joins a landing to the one above it; a span joins two at one height. */
export type Fit = 'rise' | 'span'

/**
 * A place for one piece. `a` is its lower end on a rise and its left end on a
 * span; `from` and `to` are the landings those ends stand on, and `pa`, `pb`
 * the two pegs.
 */
export type Place = { fit: Fit; from: number; to: number; pa: Pt; pb: Pt }

const place = (fit: Fit, from: number, to: number, ax: number, bx: number): Place => ({
  fit, from, to, pa: { x: ax, y: LANDINGS[from].y }, pb: { x: bx, y: LANDINGS[to].y },
})

export const PLACES: readonly Place[] = [
  place('rise', 0, 1, 236, 300),
  place('rise', 0, 2, 944, 880),
  place('rise', 1, 3, 468, 443),
  place('rise', 2, 4, 712, 737),
  place('rise', 3, 7, 345, 345),
  place('rise', 4, 8, 835, 835),
  place('rise', 5, 7, 200, 302),
  place('span', 1, 2, 480, 700),
  place('span', 3, 4, 500, 680),
  place('span', 7, 8, 480, 700),
  place('span', 5, 3, 215, 330),
  place('span', 4, 6, 850, 965),
]

export const PLACE_COUNT = PLACES.length

/** The trunk, as its half width at a height: wide at the roots, narrower up to the fork. */
export const TRUNK_X = 590
export function trunkHalf(y: number): number {
  const t = Math.max(0, Math.min(1, (y - 150) / 560))
  return 44 + 34 * t + 46 * t * t * t
}

/** The crown as it is printed on the back of the oak: a touch inside any of these is a touch on the oak. */
export const CROWN: readonly { x: number; y: number; rx: number; ry: number }[] = [
  { x: 590, y: 36, rx: 170, ry: 136 }, { x: 420, y: 130, rx: 140, ry: 112 }, { x: 760, y: 130, rx: 140, ry: 112 },
  { x: 300, y: 214, rx: 104, ry: 83 }, { x: 880, y: 214, rx: 104, ry: 83 }, { x: 590, y: 150, rx: 150, ry: 120 },
]
/** The leaf cards of the crown: where each stands, how large it is, and how far it leans by itself. The first four stand behind the walkers, the rest in front of the crown. */
export const LEAF_CARDS: readonly { x: number; y: number; size: number; sway: number; pace: number }[] = [
  { x: 332, y: 258, size: 0.8, sway: 0.02, pace: 0.21 },
  { x: 452, y: 168, size: 1, sway: 0.016, pace: 0.17 },
  { x: 738, y: 166, size: 1, sway: 0.018, pace: 0.19 },
  { x: 968, y: 262, size: 1, sway: 0.022, pace: 0.23 },
  { x: 318, y: 74, size: 1, sway: 0.024, pace: 0.27 },
  { x: 866, y: 72, size: 1, sway: 0.026, pace: 0.25 },
]
/** Whether a point is on the trunk. */
export function onTrunk(at: Pt): boolean {
  return at.y >= 150 && at.y < 640 && Math.abs(at.x - TRUNK_X) < trunkHalf(at.y) + 10
}
/** Whether a point is on the oak: its trunk, or its crown. */
export function onOak(at: Pt): boolean {
  if (onTrunk(at)) return true
  return CROWN.some((leaf) => ((at.x - leaf.x) / leaf.rx) ** 2 + ((at.y - leaf.y) / leaf.ry) ** 2 <= 1) || LEAF_CARDS.some((card) => Math.abs(at.x - card.x) < 150 * card.size && Math.abs(at.y - card.y) < 90 * card.size)
}

/** The walkers. The twins are two walkers who go as a pair, and count as one here. */
export const FOLK = ['squirrel', 'owl', 'mice', 'beetle'] as const
export type Folk = (typeof FOLK)[number]

/** The landing each walker's door opens on, and where on it the walker stands when at home. */
export const HOME: Record<Folk, { landing: number; door: Pt }> = {
  squirrel: { landing: 3, door: { x: 552, y: 428 } },
  owl: { landing: 8, door: { x: 618, y: 290 } },
  mice: { landing: 2, door: { x: 650, y: 566 } },
  beetle: { landing: 0, door: { x: 590, y: 704 } },
}

/** Where a walker stands on a landing: each has its own spot, so no two stand on one another. */
const SPOT: Record<Folk, number> = { beetle: 0, squirrel: 0.34, mice: 0.67, owl: 1 }
const MEADOW_SPOT: Record<Folk, number> = { beetle: 428, squirrel: 340, mice: 760, owl: 846 }

export function standAt(folk: Folk, landing: number): Pt {
  const pad = LANDINGS[landing]
  if (landing === MEADOW) return { x: MEADOW_SPOT[folk], y: pad.y }
  return { x: pad.s0 + (pad.s1 - pad.s0) * SPOT[folk], y: pad.y }
}

/** The basket along the front of the page, and the slot each kind lies in. */
export const BASKET = { x0: 262, x1: 918, y0: 744, y1: 812 }
export const KIND_COUNT = 7
export function basketSlot(index: number): Pt {
  const step = (BASKET.x1 - BASKET.x0) / KIND_COUNT
  return { x: BASKET.x0 + step * (index + 0.5), y: (BASKET.y0 + BASKET.y1) / 2 - 2 }
}

/** The sun's pull tab on the back page: where the sun stands by day and the moon rests by night, how far down the tab goes, and the top of the hill it goes down behind. */
export const SUN: Pt = { x: 118, y: 112 }
export const SUN_R = 46
export const HILL_Y = 428
export const MOON_Y = 262
export const TAB_LOW = 504
/** Let go with the sun below `SET_Y`, the top of the hill, it is evening; let go with the moon above `RISE_Y`, half way up its slot, it is morning. */
export const SET_Y = HILL_Y
export const RISE_Y = (SUN.y + MOON_Y) / 2

/** Each walker's door on the oak, as the box a touch on its lit window lands in. */
export const DOOR: Record<Folk, { x: number; y: number; w: number; h: number }> = {
  squirrel: { x: 552, y: 392, w: 58, h: 68 },
  owl: { x: 618, y: 250, w: 56, h: 70 },
  mice: { x: 650, y: 534, w: 50, h: 62 },
  beetle: { x: 590, y: 666, w: 62, h: 78 },
}

/** The jam's home control and the grown-up's corner: nothing that answers a touch lies here. */
export const HOME_CONTROL = { x: 590, y: 34, r: 30 }
export const CORNER = 72

export const mid = (p: Place): Pt => ({ x: (p.pa.x + p.pb.x) / 2, y: (p.pa.y + p.pb.y) / 2 })
export const dist = (a: Pt, b: Pt): number => Math.hypot(a.x - b.x, a.y - b.y)

/** The distance from a point to a place's line between its pegs. */
export function toPlace(at: Pt, p: Place): number {
  const dx = p.pb.x - p.pa.x, dy = p.pb.y - p.pa.y
  const t = Math.max(0, Math.min(1, ((at.x - p.pa.x) * dx + (at.y - p.pa.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(at.x - (p.pa.x + dx * t), at.y - (p.pa.y + dy * t))
}

/** How near a piece must be let go for a place to take it, and how near a tap must land on a piece. */
export const SNAP_REACH = 96
export const PIECE_REACH = 34

/** How big each walker's card is, for a touch and for the picture. The twins are two small cards side by side. */
export const BODY: Record<Folk, { w: number; h: number }> = {
  squirrel: { w: 78, h: 104 },
  owl: { w: 84, h: 98 },
  mice: { w: 92, h: 60 },
  beetle: { w: 76, h: 90 },
}

/**
 * What is drawn of each walker outside that card, from its feet and facing right: a line and how far round it the
 * print reaches. A touch on any of it is a touch on the walker. The squirrel's tail and the letter in his paw,
 * the owl's ear tufts, the tail of the twin behind, the beetle's hat and his stick.
 */
export const OUTLINE: Record<Folk, readonly { line: Pt[]; r: number }[]> = {
  squirrel: [
    { line: [{ x: -28, y: -24 }, { x: -68, y: -52 }, { x: -56, y: -92 }, { x: -62, y: -122 }], r: 20 },
    { line: [{ x: 34, y: -50 }, { x: 54, y: -57 }], r: 18 },
  ],
  owl: [{ line: [{ x: -30, y: -96 }, { x: 30, y: -96 }], r: 14 }],
  mice: [{ line: [{ x: -34, y: -8 }, { x: -56, y: -22 }], r: 10 }],
  beetle: [{ line: [{ x: -10, y: -92 }, { x: 22, y: -92 }], r: 14 }, { line: [{ x: 38, y: 0 }, { x: 33, y: -52 }], r: 10 }],
}
