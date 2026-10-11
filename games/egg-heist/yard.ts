// The farmyard as it stands on the stage, in stage units (stage.ts), and the
// little geometry the sneaking needs: the grooves figures slide in, where the
// places and bushes stand, what a tap lands on, the goose's round and what
// she can see from it. Pure numbers: no drawing, no clock, no chance.

export type Spot = { x: number; row: number }
export type Rect = { x: number; y: number; w: number; h: number }

/** Where the feet of a figure stand in each groove, back to front. */
export const ROWS = [470, 550, 635, 725] as const
/** How large a figure is drawn in each groove: a little larger towards the front. */
export const ROW_SCALE = [0.86, 0.93, 1, 1.07] as const
export const LAST_ROW = ROWS.length - 1

/**
 * How the stage is layered, back to front. Figures stand in the grooves. A thing that lies about lies on the
 * boards in front of a groove, never in it, so a figure sliding along that groove passes behind the thing and a
 * figure in the next groove passes in front of it: no card ever passes through another. A bush is a flat that
 * stands just in front of its groove, which is how it hides a raccoon. The scarecrow and the nest stand in a
 * slot of their own behind the back groove. Two cards overlap as paper only when they share a layer, and the
 * model keeps those apart (yard.test.ts, model.test.ts).
 */
export const STRIP = 14

/** The boards of the stage floor. A tap below `top` is a tap on the floor. */
export const FLOOR = { top: 428, bottom: 772, left: 64, right: 1116 } as const

export const THINGS = ['ball', 'potato', 'clock', 'boot', 'cabbage', 'egg'] as const
export type ThingId = (typeof THINGS)[number]
export const PLACE_IDS = ['nest', 'pond', 'scarecrow', 'bowl', 'line'] as const
export type PlaceId = (typeof PLACE_IDS)[number]

/** Where a thing is: lying in a groove, in the raccoon's paws, or in one of the five places. */
export type Loc = { at: 'floor'; x: number; row: number } | { at: 'paws' } | { at: PlaceId }

export type Place = {
  /** Where the raccoon stands to reach it. */
  stand: Spot
  /** What a tap on it covers. */
  hit: Rect
  /** Where a thing it holds is drawn. */
  holds: { x: number; y: number }
}

export const PLACES: Record<PlaceId, Place> = {
  scarecrow: { stand: { x: 352, row: 0 }, hit: { x: 150, y: 150, w: 180, h: 300 }, holds: { x: 250, y: 176 } },
  // The line's own patch is the head of its prop, where the rope lies in the fork: the rest of it is touched on the
  // rope, the washing and the prop as they hang (looks.ts), not on the sky above or the hills under.
  line: { stand: { x: 440, row: 0 }, hit: { x: 380, y: 240, w: 48, h: 60 }, holds: { x: 567, y: 336 } },
  nest: { stand: { x: 520, row: 0 }, hit: { x: 580, y: 372, w: 140, h: 96 }, holds: { x: 650, y: 442 } },
  pond: { stand: { x: 640, row: 3 }, hit: { x: 300, y: 672, w: 280, h: 96 }, holds: { x: 404, y: 734 } },
  bowl: { stand: { x: 770, row: 3 }, hit: { x: 846, y: 590, w: 270, h: 176 }, holds: { x: 884, y: 722 } },
}

/** The barn's half-door, where the farmer dozes. */
export const DOOR: Rect = { x: 944, y: 262, w: 112, h: 176 }

// --- The setting, as it is drawn ---------------------------------------------------
// Each of these follows the shape art.ts paints, so a finger on a drawing gets that drawing's answer.

/** The sun on its pin, out to the tips of its rays. */
export const SUN = { x: 384, y: 128, r: 58 } as const
/** The apple tree behind the scarecrow: its five rounds of leaves and its trunk. */
const CROWN: readonly (readonly [number, number, number])[] = [[90, 210, 70], [210, 190, 76], [150, 150, 78], [70, 150, 50], [250, 250, 46]]
export function onTree(x: number, y: number): boolean {
  for (const [cx, cy, r] of CROWN) if (((x - cx) / r) ** 2 + ((y - cy) / (r * 0.86)) ** 2 <= 1) return true
  return x >= 108 && x <= 210 && y >= 250 && y < FENCE.top
}
/** The picket fence along the back of the yard, as far as the barn. */
export const FENCE = { top: 372, bottom: 428, right: 880 } as const
/** Whether a point is on the barn: under the two slopes of its roof down to the floor, or on its weathercock. */
export function onBarn(x: number, y: number): boolean {
  if (x >= 980 && x <= 1020 && y >= 66 && y < 124) return true
  // Under the two slopes of the roof: the wall between its corner posts, and the eaves that reach out past them.
  if (y >= FLOOR.top || y < 122 + Math.abs(x - 998) * 0.924) return false
  return (x >= 880 && x <= 1120) || y < 258
}
/** The ridge of the far hills, as the backdrop draws it, and the farmhouse with its smoke that stands on them. */
const RIDGE: readonly (readonly [number, number])[] = [[0, 318], [150, 286], [330, 322], [480, 292], [640, 312], [800, 282], [980, 310], [1220, 290]]
const FARMHOUSE: Rect = { x: 588, y: 236, w: 66, h: 80 }
/** Whether a point is on the hills behind the fence: below their ridge, on the round trees and haystacks that stand a little over it, or on the farmhouse. */
export function onHills(x: number, y: number): boolean {
  if (y >= FENCE.top) return false
  if (inRect(x, y, FARMHOUSE)) return true
  for (let i = 1; i < RIDGE.length; i++) {
    const [x0, y0] = RIDGE[i - 1], [x1, y1] = RIDGE[i]
    if (x <= x1) return y >= y0 + ((y1 - y0) * (x - x0)) / (x1 - x0) - 20
  }
  return false
}

/** The gilt frame: the pelmet's board and its eight swags along the top, and the apron below the floor. */
const SWAG = 1180 / 8
export function onPelmet(x: number, y: number): boolean {
  if (y < 40) return true
  const p = (x % SWAG) / SWAG
  if (y < 38 + 132 * p * (1 - p)) return true
  // The gilt knobs where two swags meet.
  const knob = Math.round(x / SWAG) * SWAG
  return ((x - knob) / 9) ** 2 + ((y - 42) / 12) ** 2 <= 1
}
/** The apron's gilt edge, with the tops of its shell footlights. */
export const APRON_TOP = 764
/**
 * How far in from the side of the stage a curtain's cloth reaches at height `y`: wide at the rod, gathered at
 * the tie, wide again where it flares over the floor. The two curves are the ones the curtain card is cut to.
 */
export function curtainEdge(y: number): number {
  const v = y - 46
  if (v < 0 || v > 738) return 0
  // Each half is a curve through three points; `t` is how far along it the height lies.
  const along = (y0: number, yc: number, y1: number): number => {
    const a = y0 - 2 * yc + y1, b = 2 * (yc - y0), c = y0 - v
    return Math.abs(a) < 1e-6 ? -c / b : (-b + Math.sqrt(Math.max(0, b * b - 4 * a * c))) / (2 * a)
  }
  const bend = (t: number, x0: number, xc: number, x1: number): number => (1 - t) * (1 - t) * x0 + 2 * t * (1 - t) * xc + t * t * x1
  return v <= 392 ? bend(along(0, 220, 392), 126, 112, 70) : bend(along(392, 560, 738), 70, 100, 120)
}
export function onCurtain(x: number, y: number): boolean {
  // The gilt tie and its tassel stand a little proud of the cloth.
  const edge = y >= 420 && y <= 466 ? 90 : curtainEdge(y)
  return x < edge || x > 1180 - edge
}

/** The raccoon's own bush, and where it lands when it is punted. */
export const HOME: Spot = { x: 150, row: 2 }
/** Every bush hides a raccoon that stands in it. The first is home. */
export const BUSHES: readonly Spot[] = [HOME, { x: 330, row: 1 }, { x: 1024, row: 1 }, { x: 836, row: 0 }]
/** How near the middle of a bush a figure must stand to be hidden. */
export const BUSH_HIDES = 36
/** A tap this near a bush means the bush. */
export const BUSH_SNAP = 62

/** Where each thing is on a first visit, and where the farmer puts it back. */
export const START: Record<ThingId, Loc> = {
  ball: { at: 'floor', x: 196, row: 3 },
  potato: { at: 'floor', x: 300, row: 2 },
  clock: { at: 'floor', x: 190, row: 0 },
  boot: { at: 'floor', x: 410, row: 2 },
  cabbage: { at: 'floor', x: 968, row: 0 },
  egg: { at: 'nest' },
}

/** The stretches of each groove a figure can stand in. The pond lies across the front groove. */
const SPANS: readonly (readonly [number, number])[][] = [[[92, 1090]], [[92, 1090]], [[92, 950]], [[92, 282], [600, 770]]]

/** The nearest place in a groove a figure can stand to `x`. */
export function clampToRow(row: number, x: number): number {
  let best = x, gap = Infinity
  for (const [from, to] of SPANS[row]) {
    const at = Math.min(to, Math.max(from, x)), d = Math.abs(at - x)
    if (d < gap) { gap = d; best = at }
  }
  return best
}

/** Which stretch of a groove `x` lies in: the front groove has one on each side of the pond. */
export function stretchOf(row: number, x: number): number {
  const spans = SPANS[row]
  for (let i = 0; i < spans.length; i++) if (x <= spans[i][1] + 1) return i
  return spans.length - 1
}

/** The groove a tap at height `y` means: a child taps where the body should be, a little above the feet. */
export function rowAt(y: number): number {
  let best = 0, gap = Infinity
  for (let row = 0; row < ROWS.length; row++) {
    const d = Math.abs(ROWS[row] - 34 - y)
    if (d < gap) { gap = d; best = row }
  }
  return best
}

export function inRect(x: number, y: number, r: Rect): boolean {
  return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h
}

/** The bush a spot is hidden in, or -1. */
export function bushAt(x: number, row: number, within = BUSH_HIDES): number {
  for (let i = 0; i < BUSHES.length; i++) if (BUSHES[i].row === row && Math.abs(BUSHES[i].x - x) <= within) return i
  return -1
}

// --- Laying a thing down ----------------------------------------------------

/** How far each side of its middle a bush covers what lies in its groove. */
export const BUSH_COVERS = 128
/** How far each side of the spot it stands at to reach a place the raccoon's card reaches: no thing lies there, in front of it. */
export const STAND_CLEAR = 100
/** How far apart two things lie in one groove, at the least. */
export const THING_GAP = 84
/** Stretches of each groove where no thing is laid: the bushes, and where the raccoon stands to reach a place. */
const KEPT_CLEAR: readonly (readonly [number, number])[][] = ROWS.map((_, row) => {
  const clear: [number, number][] = []
  // A bush is a wide flat in front of its groove: a thing laid within its width would lie half behind it.
  for (const bush of BUSHES) if (bush.row === row) clear.push([bush.x - BUSH_COVERS, bush.x + BUSH_COVERS])
  for (const id of PLACE_IDS) if (PLACES[id].stand.row === row) clear.push([PLACES[id].stand.x - STAND_CLEAR, PLACES[id].stand.x + STAND_CLEAR])
  return clear
})
/** Things lie a little inside the ends of a groove, clear of the curtains. */
const LAY = { from: 112, to: 1070 } as const

function mayLie(x: number, row: number, others: readonly Spot[]): boolean {
  if (x < LAY.from || x > LAY.to || Math.abs(clampToRow(row, x) - x) > 0.5) return false
  for (const [from, to] of KEPT_CLEAR[row]) if (x > from && x < to) return false
  // The ends of the goose's two lanes, where she stops to look about and hops across.
  if ((row === 1 || row === 2) && (Math.abs(x - LANE.from) < 44 || Math.abs(x - LANE.to) < 44)) return false
  for (const other of others) if (other.row === row && Math.abs(other.x - x) < THING_GAP) return false
  return true
}

/**
 * The nearest free spot to lay a thing at: in the groove asked for if it has one, and otherwise in the next
 * groove. Never on a bush, on the spot the raccoon stands at to reach a place, on an end of the goose's lanes,
 * or on another thing.
 */
export function freeSpot(x: number, row: number, others: readonly Spot[]): Spot {
  const rows = [row, row - 1, row + 1, row - 2, row + 2, row - 3, row + 3].filter((r) => r >= 0 && r <= LAST_ROW)
  for (const r of rows) {
    for (let step = 0; step <= 60; step++) {
      for (const side of step === 0 ? [0] : [1, -1]) {
        const at = x + side * step * 22
        if (mayLie(at, r, others)) return { x: at, row: r }
      }
    }
  }
  return { x: clampToRow(row, x), row }
}

// --- The goose's round ------------------------------------------------------

export const GOOSE_SPEED = 105
/** Her lanes lie clear of every bush, and no thing starts in them. */
const LANE = { from: 500, to: 850 } as const
const WALK = (LANE.to - LANE.from) / GOOSE_SPEED
export const LANE_ENDS = LANE

type Leg = { seconds: number; from: Spot; to: Spot; faceFrom: 1 | -1; faceTo: 1 | -1; kind: 'walk' | 'look' | 'hop' | 'nest' }

/** Where she stops on her way along the second groove, beside the nest, and how long she looks into it. */
export const NEST_LOOK = { x: 716, seconds: 1.5 } as const
const walk = (from: number, to: number, row: number, face: 1 | -1): Leg => ({ kind: 'walk', seconds: Math.abs(to - from) / GOOSE_SPEED, from: { x: from, row }, to: { x: to, row }, faceFrom: face, faceTo: face })

/**
 * Her fixed round: along the second groove to the left with a stop to look into the nest, a look about, a hop
 * forward, back along the third groove, a look about, a hop back.
 */
export const ROUND: readonly Leg[] = [
  walk(LANE.to, NEST_LOOK.x, 1, -1),
  { kind: 'nest', seconds: NEST_LOOK.seconds, from: { x: NEST_LOOK.x, row: 1 }, to: { x: NEST_LOOK.x, row: 1 }, faceFrom: -1, faceTo: -1 },
  walk(NEST_LOOK.x, LANE.from, 1, -1),
  { kind: 'look', seconds: 1, from: { x: LANE.from, row: 1 }, to: { x: LANE.from, row: 1 }, faceFrom: -1, faceTo: -1 },
  { kind: 'hop', seconds: 0.45, from: { x: LANE.from, row: 1 }, to: { x: LANE.from, row: 2 }, faceFrom: -1, faceTo: 1 },
  { kind: 'walk', seconds: WALK, from: { x: LANE.from, row: 2 }, to: { x: LANE.to, row: 2 }, faceFrom: 1, faceTo: 1 },
  { kind: 'look', seconds: 1, from: { x: LANE.to, row: 2 }, to: { x: LANE.to, row: 2 }, faceFrom: 1, faceTo: 1 },
  { kind: 'hop', seconds: 0.45, from: { x: LANE.to, row: 2 }, to: { x: LANE.to, row: 1 }, faceFrom: 1, faceTo: -1 },
]
/** The legs of her round by name, for the model and the tests. */
export const LEG = { toNest: 0, nest: 1, left: 2, lookLeft: 3, hopFront: 4, right: 5, lookRight: 6, hopBack: 7 } as const

export type GooseAt = {
  x: number
  /** Where her feet are on the stage, which is between two grooves in a hop. */
  y: number
  /** The groove she looks along: the one she left until she is halfway through a hop. */
  row: number
  face: 1 | -1
  kind: Leg['kind']
  /** 0..1 through a hop, and 0 on any other leg. */
  hop: number
}

/** Where the goose is on her round. */
export function gooseAt(leg: number, along: number): GooseAt {
  const l = ROUND[leg], t = Math.min(1, Math.max(0, along))
  const late = t >= 0.5
  return {
    x: l.from.x + (l.to.x - l.from.x) * t,
    y: ROWS[l.from.row] + (ROWS[l.to.row] - ROWS[l.from.row]) * t,
    row: late ? l.to.row : l.from.row,
    face: late ? l.faceTo : l.faceFrom,
    kind: l.kind,
    hop: l.kind === 'hop' ? t : 0,
  }
}

// --- What she sees ----------------------------------------------------------

/** How far in front of her she sees. */
export const SIGHT = 380
/** Nearer than this she sees only along her own groove: the gaze opens out like a fan. */
export const SIGHT_OPENS = 90

/** How far above its groove the point of a figure lies that her sight is tested against: the middle of its base. */
export const FEET = 14

/** Whether a stage point lies inside a shape given as points in order round it. */
export function inside(shape: readonly { x: number; y: number }[], x: number, y: number): boolean {
  let within = false
  for (let i = 0, j = shape.length - 1; i < shape.length; j = i++) {
    const a = shape[i], b = shape[j]
    if ((a.y > y) !== (b.y > y) && x < ((b.x - a.x) * (y - a.y)) / (b.y - a.y) + a.x) within = !within
  }
  return within
}

/**
 * Whether a figure at `x` in `row` is in the gaze of a goose standing at `gx` in `grow` and facing `face`.
 * There is no second rule: she sees a figure when the middle of its base lies inside the wedge that is drawn
 * (`gazeShape`), so what the child sees on the floor is what she sees.
 */
export function inGaze(gx: number, grow: number, face: 1 | -1, x: number, row: number): boolean {
  return inside(gazeShape(gx, ROWS[grow], grow, face), x, ROWS[row] - FEET)
}

/** The gaze as a shape on the floor, as stage points in order round it. */
export function gazeShape(gx: number, gy: number, grow: number, face: 1 | -1): { x: number; y: number }[] {
  const up = Math.max(0, grow - 1), down = Math.min(LAST_ROW, grow + 1)
  const top = ROWS[up] - 44, bottom = ROWS[down] + 10
  const beak = gx + face * 46, opens = gx + face * SIGHT_OPENS, far = gx + face * SIGHT
  return [
    { x: beak, y: gy - 34 }, { x: opens, y: top }, { x: far, y: top },
    { x: far + face * 14, y: (top + bottom) / 2 },
    { x: far, y: bottom }, { x: opens, y: bottom }, { x: beak, y: gy + 6 },
  ]
}

/**
 * The patch of floor she looks down at before she hops to her other lane and while she hops: where she will
 * land, as wide as she and a raccoon need to stand clear of each other. It is drawn like the wedge, and seen like it.
 */
export function landingShape(x: number, row: number): { x: number; y: number }[] {
  const reach = NEAR + 12, top = ROWS[row] - 40, bottom = ROWS[row] + 8, cut = 18
  return [
    { x: x - reach + cut, y: top }, { x: x + reach - cut, y: top }, { x: x + reach, y: top + cut }, { x: x + reach, y: bottom - cut },
    { x: x + reach - cut, y: bottom }, { x: x - reach + cut, y: bottom }, { x: x - reach, y: bottom - cut }, { x: x - reach, y: top + cut },
  ]
}

/** Where the raccoon stands to pluck her tail: its paws reach her tail feathers from there. */
export const TAIL_GAP = 168
/** Nearer than this in one groove the two cards would be paper on paper: the raccoon never slides nearer, and she never lands nearer. */
export const NEAR = 160

// --- The ring ----------------------------------------------------------------

/** A place holds one thing, and a newcomer sends the thing that was there on to the next place of this ring. */
export const RING: Record<PlaceId, PlaceId> = { nest: 'pond', pond: 'bowl', bowl: 'line', line: 'scarecrow', scarecrow: 'nest' }

/** Where a thing that comes round to the place a round began at is set down: on the floor beside that place. */
export const BESIDE: Record<PlaceId, Spot> = {
  nest: { x: 600, row: 0 }, pond: { x: 250, row: 3 }, bowl: { x: 700, row: 3 }, line: { x: 396, row: 0 }, scarecrow: { x: 300, row: 0 },
}

/** The clouds on their wires, for a tap on the sky. */
export const CLOUDS: readonly { x: number; y: number; scale: number; reach: number; pace: number }[] = [
  { x: 520, y: 116, scale: 0.9, reach: 70, pace: 0.11 },
  { x: 730, y: 150, scale: 0.72, reach: 56, pace: 0.16 },
  { x: 664, y: 100, scale: 0.5, reach: 90, pace: 0.07 },
]
