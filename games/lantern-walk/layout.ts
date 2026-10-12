// Where everything in the wood stands, in stage units, and how much room each
// thing takes. The model keeps the creatures inside these numbers, the view
// draws them there, and the overlap tests read the same boxes, so "nothing
// stands on anything" is one set of numbers and not three.

export const STAGE_W = 1180
export const STAGE_H = 820

/** A box on the stage. */
export type Box = { left: number; top: number; right: number; bottom: number }

export const box = (left: number, top: number, right: number, bottom: number): Box => ({ left, top, right, bottom })

/** How far apart two boxes are: 0 when they touch or overlap. */
export function gap(a: Box, b: Box): number {
  const dx = Math.max(0, a.left - b.right, b.left - a.right)
  const dy = Math.max(0, a.top - b.bottom, b.top - a.bottom)
  return Math.hypot(dx, dy)
}

/** Whether two boxes keep clear of each other: they may touch, and neither lies on the other. */
export const apart = (a: Box, b: Box): boolean => a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top
/** Whether one box lies wholly inside another. */
export const within = (inner: Box, outer: Box, slack = 0): boolean => inner.left >= outer.left - slack && inner.right <= outer.right + slack && inner.top >= outer.top - slack && inner.bottom <= outer.bottom + slack

/** The lantern hangs from the tip of its pole: where the tip is from the grip, and how long the wire is. */
export const POLE = { x: 40, y: -240 }
export const WIRE = 150
/** Where the grip may go. The top is kept low enough that the lantern never rests under the home control. */
export const REACH = { left: 30, right: 1120, top: 262, bottom: 800 }

/** The hook by the door: its tip, where the hung lantern's wire ends. */
export const HOOK = { x: 1090, y: 276 }
/** Where the grip is when the lantern hangs on the hook: the saved place of a hung lantern. */
export const HOOK_GRIP = { x: HOOK.x - POLE.x, y: HOOK.y - POLE.y }
/**
 * How near its place on the hook the grip must be let go for the lantern to be hung: the hook and a finger's width
 * round it, which is 104 px across at the smaller surface. A tap never hangs it.
 */
export const HOOK_NEAR = 60
/**
 * How near the hook itself, or the line from the hook down to where the grip hangs, a finger must be when it lets
 * the lantern go for the lantern to be hung: a child puts the finger where the hook is drawn, or holds the lantern
 * itself up to it, which is above where the grip hangs. A generous touch round, 111 px across at the smaller surface.
 */
export const HOOK_TOUCH = 64

export const PLACES = {
  /** The door step: where a walk begins. */
  lantern: { x: 1050, y: 730 },
  owl: { x: 236, y: 306 },
  mothTree: { x: 936, y: 250 },
  fox: { x: 464, y: 674 },
  hedgehog: { x: 896, y: 808 },
  badger: { x: 196, y: 784 },
  spider: { x: 664, y: 196 },
} as const

/**
 * Where the fox's feet may stand, and where it goes for the ending: as far right as leaves the width of a sitting
 * fox between its room and the moths' tree. The fox keeps to the left of the hedgehog, and neither comes nearer
 * the other than `BODY_APART`, so the two never stand one above the other. With the hedgehog at home the fox has
 * the whole of its lane, which is a leap long (`FOX_LEAP`): from its own home it can jump its own length.
 */
export const FOX_LANE = { left: 464, right: 670 }
/** How far the fox leaps, over a puddle or onto a mouse: its own length as it is drawn in the air, and a little. */
export const FOX_LEAP = 204
export const FOX_HOME_END = 640
/** Where the hedgehog's feet may stand (its home is at the right-hand end, a body's length past the end of the fox's lane), the roots that stop it rolling, and the mat it walks to in the ending. */
export const HEDGEHOG_LANE = { left: 690, right: 900 }
export const HEDGEHOG_MAT = 960
/** The least the hedgehog's feet stand to the right of the fox's: half the fox's room and half the hedgehog's. */
export const BODY_APART = 226
/** How wide the fox is as it sits, without its brush. */
export const FOX_SITS = 114

export const MOTHS = 8
export const WORMS = 5

/** Where each glow-worm sits on the fern, which arches from the moths' tree over the middle of the wood. */
export function wormPlace(i: number): { x: number; y: number } {
  const t = i / (WORMS - 1)
  return { x: 718 - t * 216, y: 356 - Math.sin(t * Math.PI) * 44 }
}

/** The ground under the fern, where a glow-worm that lost its hold lands. */
export const WORM_GROUND = 566

/**
 * Where each moth sits on the bark of its tree: two abreast at the top, two abreast at the foot, and four alone
 * between them, each to one side of the last. The two at the foot sit at the two sides of the trunk and low
 * enough for a light carried past at the height of the step, the yellow of a ready sheet, to reach them first
 * from either side; the ones the blue of a ready sheet passes over sit in the middle of the trunk.
 */
const PERCHES: readonly (readonly [number, number])[] = [[912, 168], [966, 182], [936, 242], [958, 300], [944, 364], [938, 422], [912, 484], [966, 500]]
export function perch(i: number): { x: number; y: number } {
  return { x: PERCHES[i][0], y: PERCHES[i][1] }
}

/** The ground at the foot of the moths' tree, where sleeping moths lie. */
export const MOTH_GROUND = 560

// --- The room each thing takes ---------------------------------------------

/** The fox, sitting or sneaking: it is never longer than this, whichever way it faces. */
export const foxBox = (x: number): Box => box(x - 120, PLACES.fox.y - 264, x + 120, PLACES.fox.y + 6)
export const hedgehogBox = (x: number): Box => box(x - 106, PLACES.hedgehog.y - 126, x + 106, PLACES.hedgehog.y + 2)
/** The badger, sitting up, lying back or blowing. Between its room and the owl's above it there is just room for a lantern to stand. */
export const BADGER_BOX = box(8, 528, 342, 818)
/** The badger's hole, at the foot of its mound beside it: clear of the badger as it sits, rocks and lies back, and below where the fox sits. */
export const BADGER_HOLE = box(320, 726, 378, 804)
/** The owl, with room for its ear tufts to go round as its head turns over; they pass the top of the stage. */
export const OWL_BOX = box(72, -34, 400, 364)
/** The fern and the worms on it, with their lamps. */
export const FERN_BOX = box(436, 262, 884, 410)
/** The trunk of the moths' tree, from side to side, and its foot. */
export const MOTH_TRUNK = { left: 884, right: 992, foot: 572 }
/** A moth with its wings half shut, as it sits on the bark or on a cold lantern, from its own middle. */
export const MOTH_BOX = box(-26, -36, 26, 22)
/** A moth on the yellow light, wings open, from its own middle. */
export const OPEN_MOTH_BOX = box(-33, -36, 33, 22)
/** A moth asleep on the ground, wings shut, from its own middle, with room for it to lean a little to either side. */
export const SLEEPER_BOX = box(-20, -54, 20, 23)
/** A glow-worm with its lamp held up, from where it sits. */
export const WORM_BOX = box(-64, -70, 38, 0)
/** The lantern's paper, from the lantern's middle, and the candle's flame over its rim: what nothing may sit on. */
export const PAPER_BOX = box(-46, -56, 46, 58)
export const FLAME_BOX = box(-14, -104, 14, -56)
/** A box moved to stand at a point. */
export const boxAt = (b: Box, x: number, y: number): Box => box(b.left + x, b.top + y, b.right + x, b.bottom + y)
/** A glow-worm lying on the ground on its back, lamp and all, from where it lies. */
export const FALLEN_WORM = box(-38, -70, 64, 0)
/** The stump with the snail on it, between the moths' tree and the step. */
export const STUMP_BOX = box(900, 580, 1008, 682)
/** The spider and its legs, from its middle. */
export const SPIDER_BOX = box(-36, -30, 36, 34)
/** The hung lantern, from the hook down to its foot. */
export const HUNG_BOX = box(HOOK.x - 50, HOOK.y, HOOK.x + 50, HOOK.y + WIRE + 62)
/** The lantern as it stands on the door step, pole and all. */
export const STEP_BOX = box(1034, 430, 1140, 806)

/** The round home control the jam draws over every game: 48 px across, 10 px from the top, at the top centre of the surface. */
export const HOME = { size: 48, top: 10 }
/** The grown-up's corner, in px of the surface. */
export const CORNER_PX = 72

/** The home control as a box on the stage, for a surface of `width` by `height` px. */
export function homeBox(width: number, height: number): Box {
  const scale = Math.min(width / STAGE_W, height / STAGE_H)
  const ox = (width - STAGE_W * scale) / 2, oy = (height - STAGE_H * scale) / 2
  return box((width / 2 - HOME.size / 2 - ox) / scale, (HOME.top - oy) / scale, (width / 2 + HOME.size / 2 - ox) / scale, (HOME.top + HOME.size - oy) / scale)
}

/** The two sizes kid-land is checked at. */
export const SURFACES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const
