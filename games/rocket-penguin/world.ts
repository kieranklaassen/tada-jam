// The landscape, which is fixed. Every number is in stage units (stage.ts):
// x to the right, y down, the page 1180 by 820 with squares of 20. The model
// (flight.ts) flies through these shapes and the view draws them where they
// are, so what is drawn is what is struck.

/** One square of the paper. */
export const SQUARE = 20

/** The top of the ice shelf, and where it ends on the right: beyond is open water. */
export const ICE_Y = 640
export const SHELF_EDGE = 892
/** The shelf as a solid: beyond its edge its corner and its face are struck like any wall. */
export const SHELF: Box = { x0: -1e6, y0: ICE_Y, x1: SHELF_EDGE, y1: 1e6 }
/** The water's surface, a little below the top of the shelf. */
export const SEA_Y = 652

/** The penguin as the model flies it: a round body. It is drawn a little taller than it is wide: its head and its feet stand that little way past the round. */
export const PENGUIN = { r: 54, width: 108, height: 132 } as const

/** The catapult: where the fork ends and the bands are tied, where the pouch hangs at rest, and how far it stretches. */
export const CATAPULT = {
  fork: { x: 260, y: 384 },
  rest: { x: 250, y: 434 },
  /** The foot of the post, on the sledge, which stands a step back from the front of the ice. */
  foot: { x: 260, y: 626 },
  /** The longest the bands go, from the fork to the pouch. */
  reach: 200,
  /** The bands' length at rest, a hair more than from the fork to the pouch at rest: a pouch nearer the fork than this is not stretched at all. */
  slack: 51.3,
  /** The pouch stays above the ice and on the page. */
  floor: 572,
  wall: 58,
  /** How near the pouch a finger takes hold of the penguin. */
  grip: 78,
} as const

export type Circle = { x: number; y: number; r: number }
export type Box = { x0: number; y0: number; x1: number; y1: number }

/** The two seals, as the round bellies the penguin bounces off. */
export const SEALS: readonly Circle[] = [
  { x: 392, y: 652, r: 70 },
  { x: 851, y: 652, r: 62 },
]

/** The tip of each seal's nose, where it balances what it balances. The near seal lies nose towards the catapult, the far one nose out over the water. */
export const SEAL_NOSES: readonly { x: number; y: number }[] = [
  { x: 337, y: 616 },
  { x: 905, y: 626 },
]
/** The near seal's ball as it rides the nose, as the round a finger finds: the whole ball answers as the seal. */
export const SEAL_BALL: Circle = { x: 335, y: 596, r: 16 }

/** The igloo's dome. The chick stands in its doorway, inside the dome's outline. */
export const IGLOO: Circle = { x: 659, y: 604, r: 62 }

/** The snowdrift, blown up against the igloo's far side and higher than it: half an ellipse lying on the ice. */
export const DRIFT = { x: 750, y: ICE_Y, rx: 50, ry: 92 } as const
/** How far into the heap a body sinks before the snow has it. */
export const DRIFT_TAKES = 22

/** The whale's head where it comes up for air, and its blowhole. The rest of the whale lies under the shelf. */
export const WHALE: Circle = { x: 1010, y: 704, r: 60 }
export const SPOUT = {
  x: 1010,
  /** Half the width of the column of water. */
  half: 32,
  /** From the blowhole up to where the water has spent itself. */
  bottom: 644,
  top: 240,
  /** The water's own speed at the blowhole: up, less the higher it has climbed and none at the top, and leaning back towards the shelf. */
  up: 480,
  lean: -15,
  /** How hard the water drags whatever is in it to its own speed, as a share of the difference a second. */
  grip: 2,
} as const

/** The iceberg, cut off by the edge of the page. The walrus sits in a hollow in its face, inside this outline. */
export const BERG: Box = { x0: 1044, y0: 500, x1: 1400, y1: 900 }

/** The weather balloon: its round skin, and the basket with the puffin in it. It hangs wholly to the right of the home control. */
export const BALLOON: Circle = { x: 800, y: 108, r: 94 }
export const BASKET: Box = { x0: 750, y0: 272, x1: 850, y1: 344 }

/** The thin cloud: two banks of puffs. Inside any of them the air is wet and a little thicker. */
export const CLOUD: readonly Circle[] = [
  // Over the seal and the igloo.
  { x: 420, y: 236, r: 48 },
  { x: 478, y: 200, r: 62 },
  { x: 556, y: 188, r: 70 },
  { x: 628, y: 214, r: 58 },
  { x: 672, y: 250, r: 40 },
  { x: 590, y: 250, r: 50 },
  { x: 500, y: 254, r: 46 },
  { x: 440, y: 262, r: 34 },
  // Over the catapult.
  { x: 70, y: 120, r: 46 },
  { x: 128, y: 96, r: 56 },
  { x: 196, y: 112, r: 50 },
  { x: 244, y: 140, r: 32 },
  { x: 150, y: 146, r: 40 },
  { x: 90, y: 150, r: 34 },
]
/** How many of the puffs are the first bank's. */
export const FIRST_BANK = 8

/** A flight whose body is wholly past the left or the right edge of the paper has left it. These are the edges of the stage. */
export const OFF_PAGE = { left: -56, right: 1236 } as const
/** The edges a body has left the paper by, for a surface that shows the paper from `x0` to `x1` in stage units: never nearer than the stage's own. */
export function offPage(x0: number, x1: number): { left: number; right: number } {
  return { left: Math.min(OFF_PAGE.left, x0 - PENGUIN.r - 2), right: Math.max(OFF_PAGE.right, x1 + PENGUIN.r + 2) }
}

/** Whether a point is inside the cloud. */
export function inCloud(x: number, y: number): boolean {
  for (const puff of CLOUD) if ((x - puff.x) ** 2 + (y - puff.y) ** 2 < puff.r * puff.r) return true
  return false
}

/** Whether a point is inside the snowdrift, or within `pad` of it. */
export function inDrift(x: number, y: number, pad = 0): boolean {
  if (y > DRIFT.y) return false
  const dx = (x - DRIFT.x) / (DRIFT.rx + pad), dy = (y - DRIFT.y) / (DRIFT.ry + pad)
  return dx * dx + dy * dy < 1
}

/** Whether a point is in the column of water over the blowhole. */
export function inSpout(x: number, y: number): boolean {
  return Math.abs(x - SPOUT.x) < SPOUT.half && y < SPOUT.bottom && y > SPOUT.top
}

/** What a press can land on besides the penguin and the kit's parts: each answers as itself. */
export type Thing = 'nearSeal' | 'farSeal' | 'chick' | 'igloo' | 'walrus' | 'berg' | 'puffin' | 'balloon' | 'whale' | 'whaleEye' | 'whaleBack' | 'whaleTail' | 'cloud' | 'crate' | 'drift' | 'paper'

/** The flat tops a body can come down on: the shelf, the iceberg and the crate. */
export type Floor = { x0: number; x1: number; top: number; of: 'ice' | 'berg' | 'crate' }

/**
 * The kit: a crate sunk into the shelf behind the catapult, drawn cut through like the shelf. Its lid lies level
 * with the ice and is a floor like the ice; its six compartments are below it, where nothing flies.
 */
export const CRATE: Box = { x0: 2, y0: ICE_Y, x1: 218, y1: ICE_Y + 6 }

/** The six parts of the kit, in the order they lie in it. */
export const PARTS = ['rocket', 'wings', 'umbrella', 'balloon', 'springs', 'fish'] as const
export type Part = (typeof PARTS)[number]

/** A part's place is 70 units each way: 48 pixels and a little more on the smallest surface the game is held to, where the stage is drawn at 0.695. */
export const SLOT = { x0: CRATE.x0 + 2, y0: CRATE.y1 + 2, w: 70, h: 70, gap: 1 } as const
/** Where each part lies in the kit: three to a row, two rows. */
export const SLOTS: Record<Part, Box> = Object.fromEntries(PARTS.map((part, i) => {
  const x0 = SLOT.x0 + (i % 3) * (SLOT.w + SLOT.gap), y0 = SLOT.y0 + Math.floor(i / 3) * (SLOT.h + SLOT.gap)
  return [part, { x0, y0, x1: x0 + SLOT.w, y1: y0 + SLOT.h }]
})) as Record<Part, Box>
/** Where a finger rattles the crate: its lid and a finger's width above it, down to where the compartments begin. A box of 48 pixels each way on the smallest surface. */
export const LID: Box = { x0: CRATE.x0, y0: SLOT.y0 - 72, x1: CRATE.x1, y1: SLOT.y0 }
/** The whole of the crate as it is drawn: the lid and the compartments under it. */
export const KIT: Box = { x0: CRATE.x0, y0: CRATE.y0, x1: CRATE.x1, y1: SLOT.y0 + 2 * SLOT.h + SLOT.gap + 4 }

/** The chick in the igloo's doorway, the walrus in its hollow and the puffin over the rim of its basket, as the rounds a finger finds. */
export const CHICK: Circle = { x: 652, y: 603, r: 36 }
export const WALRUS: Circle = { x: 1112, y: 572, r: 68 }
export const PUFFIN: Circle = { x: 800, y: 238, r: 42 }
/** The whale's eye, under the water, as the round a finger finds; the eye is drawn smaller, in its middle. */
export const WHALE_EYE: Circle = { x: 962, y: 748, r: 36 }
/**
 * The whale as it is drawn, from its head by the iceberg to the root of its tail under the shelf: its outline, as
 * x and y in turn. A finger finds the whale wherever it is drawn. Its tail is drawn apart (it moves), from this root.
 */
export const WHALE_BODY: readonly number[] = [
  1040, 716, 1044, 690, 1036, 664, WHALE.x + 14, WHALE.y - WHALE.r + 1, WHALE.x - 14, WHALE.y - WHALE.r + 1, 978, 660, 952, 692, 900, 712, 800, 722, 690, 726, 600, 736, 548, 748,
  548, 770, 620, 792, 720, 806, 840, 808, 940, 800, 1010, 776, 1036, 746,
]
/** Where the tail joins the body, and the box round its flukes that a finger finds it in. */
export const WHALE_TAIL = { x: 548, y: 759, box: { x0: 478, y0: 722, x1: 604, y1: 800 } as Box } as const
/** Where the head ends and the back begins. */
const WHALE_NECK = 900

/** How far round a low thing a finger still finds it. */
const FINGER = 10

const within = (x: number, y: number, c: Circle, pad = 0): boolean => (x - c.x) ** 2 + (y - c.y) ** 2 < (c.r + pad) ** 2
const inside = (x: number, y: number, b: Box, pad = 0): boolean => x >= b.x0 - pad && x <= b.x1 + pad && y >= b.y0 - pad && y <= b.y1 + pad

/** Whether a point is inside an outline given as x and y in turn. */
export function inPolygon(x: number, y: number, outline: readonly number[]): boolean {
  let odd = false
  for (let i = 0, j = outline.length - 2; i < outline.length; j = i, i += 2) {
    const xi = outline[i], yi = outline[i + 1], xj = outline[j], yj = outline[j + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) odd = !odd
  }
  return odd
}

/** The part whose place in the kit is under a point, if any. */
export function partAt(x: number, y: number): Part | null {
  for (const part of PARTS) if (inside(x, y, SLOTS[part])) return part
  return null
}

/** The thing under a point of the page, nearest the eye first; bare paper when nothing is. */
export function thingAt(x: number, y: number): Thing {
  if (within(x, y, CHICK)) return 'chick'
  if (within(x, y, WALRUS)) return 'walrus'
  if (within(x, y, PUFFIN, 4) || inside(x, y, BASKET)) return 'puffin'
  // The whale answers wherever it is drawn, and each part of it as itself: its eye, its head, its back and its tail.
  if (within(x, y, WHALE_EYE)) return 'whaleEye'
  if (within(x, y, WHALE) && y < SEA_Y + 20) return 'whale'
  if (inside(x, y, WHALE_TAIL.box)) return 'whaleTail'
  if (inPolygon(x, y, WHALE_BODY)) return x >= WHALE_NECK ? 'whale' : 'whaleBack'
  // The seals and the igloo stand low, so a finger finds them a little way round them too, and on the ice at their feet.
  if ((within(x, y, SEALS[0], FINGER) && y < ICE_Y + 12) || within(x, y, SEAL_BALL, FINGER)) return 'nearSeal'
  // The snowdrift stands behind the igloo and in front of the far seal: it is the igloo's only where the igloo is drawn, and the drift's before it is the seal's.
  if (within(x, y, IGLOO, 0.5) && y < ICE_Y + 12) return 'igloo'
  if (inDrift(x, y)) return 'drift'
  if (within(x, y, SEALS[1], FINGER) && y < ICE_Y + 12) return 'farSeal'
  if (inside(x, y, LID) || inside(x, y, KIT, 6)) return 'crate'
  if (within(x, y, IGLOO, 4) && y < ICE_Y + 12) return 'igloo'
  if (inside(x, y, BERG)) return 'berg'
  if (within(x, y, BALLOON)) return 'balloon'
  if (inCloud(x, y)) return 'cloud'
  return 'paper'
}

/** The jam's home control: a round of 48 at the top centre of the surface, 10 from the top. Nothing that answers a press lies under it. */
export const HOME_CONTROL: Circle = { x: 590, y: 34, r: 24 }
/** The grown-up corner: the top right 72 by 72 of the surface. */
export const CORNER = 72

export const FLOORS: readonly Floor[] = [
  { x0: CRATE.x0, x1: CRATE.x1, top: ICE_Y, of: 'crate' },
  { x0: -Infinity, x1: SHELF_EDGE, top: ICE_Y, of: 'ice' },
  { x0: BERG.x0, x1: Infinity, top: BERG.y0, of: 'berg' },
]

/** The three friends who want a fish. */
export type Friend = 'chick' | 'walrus' | 'puffin'

/** How far either side of the igloo the ice is the chick's place. */
const DOORSTEP = { left: 190, right: 100 } as const

/**
 * Whose place a penguin has come to rest at, if anyone's: the ice round the igloo for the chick, the flat top of
 * the iceberg for the walrus, and the side of the basket for the puffin.
 */
export function friendAt(on: Floor['of'] | 'basket' | null, x: number): Friend | null {
  if (on === 'basket') return 'puffin'
  if (on === 'berg') return 'walrus'
  if (on === 'ice' && x > IGLOO.x - DOORSTEP.left && x < IGLOO.x + DOORSTEP.right) return 'chick'
  return null
}
