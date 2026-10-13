import type { Point } from './input'

// The lay of the sea, in stage units (stage.ts). Everything that has a place
// has it here: the waterline and the three layers, the boat and what stands
// on its deck, where each creature lives and how near the hook must come for
// it to answer, and where the eyes sit that follow the hook. The rules, the
// motion and the drawing all read this one module, so a thing is where it is
// drawn and is touched where it is.

export const WATERLINE = 180
/** The top of the sand. */
export const SEABED = 782

/** The three layers, top and bottom: sunlit, twilight and midnight water. */
export const LAYERS = {
  sunlit: { top: WATERLINE, bottom: 385 },
  twilight: { top: 385, bottom: 585 },
  midnight: { top: 585, bottom: SEABED },
} as const
export type Layer = keyof typeof LAYERS

/**
 * How much daylight reaches a depth, from 1 at the waterline down to a little at the seabed. Light fades with
 * depth: this is one of the things in the game that is meant as true, so whoever is drawn deeper is drawn dimmer.
 */
export function light(y: number): number {
  const depth = Math.min(1, Math.max(0, (y - WATERLINE) / (SEABED - WATERLINE)))
  return 1 - 0.5 * depth ** 0.85
}

/** How deep a point is, 0 at the waterline and above, 1 at the seabed. */
export function depthOf(y: number): number {
  return Math.min(1, Math.max(0, (y - WATERLINE) / (SEABED - WATERLINE)))
}

// --- The boat and its deck --------------------------------------------------

/** The point the boat rocks about. */
export const BOAT = { x: 355, y: 170 } as const
/** The tip of the rod, where the line leaves it, with the boat level. */
export const ROD_TIP = { x: 620, y: 96 } as const
/** Where the hook hangs when nothing has moved it: in the sunlit water under the rod, just under the boat. */
export const HOOK_REST = { x: 620, y: 246 } as const
/** The hook's place is the foot of its shank, where a bait hangs. Its eye, where the line is tied, is this far above. */
export const HOOK_EYE = 54
/** How far the hook can be drawn. Above the waterline it stays near the rod. */
export const HOOK_BOUNDS = { left: 34, right: 1146, top: 158, bottom: SEABED - 8, airReach: 64 } as const

export type Rect = { left: number; top: number; right: number; bottom: number }
export function inside(at: Point, rect: Rect): boolean {
  return at.x >= rect.left && at.x <= rect.right && at.y >= rect.top && at.y <= rect.bottom
}

/** The hull as the line and the creatures meet it: the part of the boat that lies in and just over the water, with the boat at rest. */
export const HULL: Rect = { left: 141, top: 150, right: 598, bottom: 199 }
/** Where the line turns to go under the boat: just clear of the bow, at the keel's depth. */
export const BOW = { x: 606, y: 204 } as const
/** The landing net off the stern: its hoop on the water and its bag below. Whoever bolts up with its middle between `left` and `right` is scooped. */
export const NET: Rect = { left: 57, top: 178, right: 149, bottom: 260 }

export const TUB = { x: 285, y: 128, halfWidth: 100, halfHeight: 28 } as const
/**
 * The tub holds four: where each catch stands, its middle above the rim. They are drawn large enough to be told
 * apart at arm's length, so they stand packed: the second and the fourth a little lower and in front, each over
 * the edge of its neighbours and never over a neighbour's middle, where its face is.
 */
export const TUB_HOLDS = 4
export const TUB_SLOTS: readonly Point[] = [{ x: 204, y: 80 }, { x: 250, y: 86 }, { x: 296, y: 80 }, { x: 342, y: 86 }]
/** The places of the tub from the front to the back: what is drawn last and touched first. */
export const TUB_FRONT_FIRST: readonly number[] = [1, 3, 0, 2]
export const CAT = { x: 446, y: 150, neck: { x: 438, y: 96 } } as const
/** Where the cat lies when it has curled up in the empty tub, from its seat: down among the staves, with its head over the rim. */
export const CAT_IN_TUB = { x: TUB.x - CAT.x + 6, y: -16 } as const
export const GULL = { x: 690, y: 40 } as const
/** The lantern on the stern post, lit when a trip is over. */
export const LANTERN = { x: 159, y: 60 } as const

/** The five baits on their pegs along the rope, left to right. The sixth choice is nothing at all: an empty hook. */
export const BAITS = ['worm', 'spoon', 'glow', 'cheese', 'boot'] as const
export type Bait = (typeof BAITS)[number] | 'none'
/** Where each bait hangs: the point of the peg it hangs from. */
export const PEGS: Record<Exclude<Bait, 'none'>, Point> = { worm: { x: 762, y: 85 }, spoon: { x: 830, y: 87 }, glow: { x: 898, y: 88 }, cheese: { x: 966, y: 88 }, boot: { x: 1034, y: 86 } }
/** Half the width of what answers on a peg. The pegs stand this close so that the last one is clear of the grown-up corner on a surface as small as 800 by 556. */
const PEG_REACH = 34
/** What answers a touch on a peg: the bait that hangs there, or the empty peg of the bait that is out. */
export function pegRect(bait: Exclude<Bait, 'none'>): Rect {
  const peg = PEGS[bait]
  return { left: peg.x - PEG_REACH, top: 76, right: peg.x + PEG_REACH, bottom: 162 }
}

/**
 * What answers a touch on deck. The tub is touched on its staved side, below the rim; the catches lie above the rim,
 * each in its own slot; the cat's paws rest on the rim beside them. None of them lies under the jam's home control
 * (566 to 614 across, down to 58) or in the grown-up's corner, and no two overlap.
 */
export const HIT: Record<'cat' | 'tub' | 'gull', Rect> = {
  cat: { left: 381, top: 62, right: 494, bottom: 156 },
  tub: { left: 188, top: 112, right: 380, bottom: 162 },
  gull: { left: 658, top: 8, right: 722, bottom: 72 },
}
/** Where the catch in a place of the tub is drawn, above the rim: what a touch on it falls in. */
export function slotRect(index: number): Rect {
  const at = TUB_SLOTS[index]
  return { left: at.x - 32, top: 16, right: at.x + 32, bottom: 111 }
}
/** The place of the tub a touch falls in: where two catches lie over each other, the one in front. Null above the rim beside them. */
export function slotAt(at: Point): number | null {
  for (const index of TUB_FRONT_FIRST) if (inside(at, slotRect(index))) return index
  return null
}
/** The jam's round home control, drawn over every game at the top centre: 48 across, 10 from the top edge of a stage 1180 wide. */
export const HOME_CONTROL = { x: 590, y: 34, radius: 24 } as const

/** Left of this the hook is under the boat, and its foot keeps this deep so that its eye clears the keel; nearer the stern it is under the net. */
export const UNDER_BOAT = BOW.x + 2, KEEL_DEPTH = HULL.bottom + 8 + HOOK_EYE
export const UNDER_NET = NET.right + 30, NET_DEPTH = NET.bottom + 6 + HOOK_EYE

/** Where a wished-for hook position ends up: inside the sea and clear of the hull and the net, or in the air close under the rod. */
export function clampHook(at: Point): Point {
  let y = Math.min(HOOK_BOUNDS.bottom, Math.max(HOOK_BOUNDS.top, at.y))
  if (y >= WATERLINE) {
    const x = Math.min(HOOK_BOUNDS.right, Math.max(HOOK_BOUNDS.left, at.x))
    // Under the boat the whole hook, eye and all, keeps below the keel, and at the stern below the bag of the net.
    if (x < UNDER_BOAT) y = Math.max(y, KEEL_DEPTH)
    if (x < UNDER_NET) y = Math.max(y, NET_DEPTH)
    return { x, y }
  }
  // Out of the water the line hangs from the rod, so the hook keeps near it; the nearer the rod, the less room.
  const room = HOOK_BOUNDS.airReach * (0.35 + 0.65 * ((y - HOOK_BOUNDS.top) / (WATERLINE - HOOK_BOUNDS.top)))
  return { x: Math.min(ROD_TIP.x + room, Math.max(ROD_TIP.x - room, at.x)), y }
}

/**
 * The line from the rod's tip to the eye of the hook, as the points it runs through. It never goes through the hull: a hook
 * drawn under the boat takes the line round the bow, down to the keel and along under it. `shift` is how far the
 * boat has been drawn along from where it lies.
 */
export function linePath(tip: Point, eye: Point, shift = 0): Point[] {
  const bow = BOW.x + shift, hook = eye
  if (hook.y <= HULL.top || hook.x >= bow) return [tip, hook]
  // Where the straight line would be at the keel's depth: left of the bow, it would have cut the hull.
  const u = (BOW.y - tip.y) / (hook.y - tip.y)
  if (u >= 1 || tip.x + (hook.x - tip.x) * u >= bow) return [tip, hook]
  return [tip, { x: bow, y: BOW.y }, hook]
}
/** How much line is out along that path. */
export function lineLength(tip: Point, hook: Point): number {
  const path = linePath(tip, { x: hook.x, y: hook.y - HOOK_EYE })
  let sum = 0
  for (let i = 1; i < path.length; i++) sum += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)
  return sum
}

// --- The nine creatures -----------------------------------------------------

export const CREATURE_IDS = ['shoal', 'puffer', 'turtle', 'squid', 'jelly', 'shark', 'angler', 'octopus', 'blobfish'] as const
export type CreatureId = (typeof CREATURE_IDS)[number]

export type CreatureSpot = {
  layer: Layer
  /** The middle of the stretch of its layer that it drifts along. The drifting is in motion.ts and is not saved. */
  home: Point
  /** The part of it the hook is brought to, from its middle, drawn facing right. */
  touch: Point
  /** How near that part the hook must come for it to answer. */
  reach: number
  /** Its eyes, from its middle, drawn facing right, with the radius of each. */
  eyes: readonly { x: number; y: number; r: number }[]
  /** The room its body takes, for keeping bodies apart: a box about a point of its own, as half its width and half its height. */
  body: { x: number; y: number; rx: number; ry: number }
  /** How far under the hook its middle hangs when it is on the hook, and how far behind the hook it keeps when it follows. */
  hang: number
}

export const CREATURES: Record<CreatureId, CreatureSpot> = {
  shoal: { layer: 'sunlit', home: { x: 905, y: 282 }, touch: { x: 0, y: 0 }, reach: 92, eyes: [], body: { x: 0, y: 0, rx: 96, ry: 42 }, hang: 60 },
  puffer: { layer: 'sunlit', home: { x: 205, y: 340 }, touch: { x: 0, y: 0 }, reach: 62, eyes: [{ x: 15, y: -9, r: 11 }], body: { x: 0, y: 0, rx: 42, ry: 38 }, hang: 46 },
  turtle: { layer: 'sunlit', home: { x: 472, y: 300 }, touch: { x: -10, y: -46 }, reach: 58, eyes: [{ x: 93, y: -5, r: 8 }], body: { x: 6, y: 4, rx: 114, ry: 60 }, hang: 96 },
  squid: { layer: 'twilight', home: { x: 122, y: 498 }, touch: { x: 0, y: 10 }, reach: 80, eyes: [{ x: -17, y: 24, r: 10 }, { x: 17, y: 24, r: 10 }], body: { x: 0, y: -8, rx: 52, ry: 100 }, hang: 150 },
  jelly: { layer: 'twilight', home: { x: 420, y: 462 }, touch: { x: 0, y: 40 }, reach: 74, eyes: [], body: { x: 0, y: 34, rx: 62, ry: 108 }, hang: 122 },
  shark: { layer: 'twilight', home: { x: 845, y: 492 }, touch: { x: 126, y: 22 }, reach: 78, eyes: [{ x: 112, y: -14, r: 10 }], body: { x: 10, y: -8, rx: 168, ry: 56 }, hang: 90 },
  angler: { layer: 'midnight', home: { x: 590, y: 684 }, touch: { x: 68, y: -74 }, reach: 60, eyes: [{ x: 40, y: -22, r: 12 }], body: { x: -10, y: 0, rx: 106, ry: 72 }, hang: 86 },
  octopus: { layer: 'midnight', home: { x: 208, y: 704 }, touch: { x: 30, y: -34 }, reach: 72, eyes: [{ x: -17, y: -26, r: 10 }, { x: 17, y: -26, r: 10 }], body: { x: -8, y: 2, rx: 80, ry: 94 }, hang: 120 },
  blobfish: { layer: 'midnight', home: { x: 978, y: 742 }, touch: { x: 60, y: -38 }, reach: 66, eyes: [{ x: 58, y: -20, r: 10 }, { x: 24, y: -25, r: 10 }], body: { x: 0, y: -4, rx: 112, ry: 46 }, hang: 62 },
}

/** The shark's teeth along its open jaw, from its middle, drawn facing right: the hook plays them one by one. */
export const SHARK_TEETH: readonly number[] = [98, 107, 116, 125, 134, 143, 152, 161]

/** Where the blobfish's bubble is bound: under the boat, below the cat. */
export const BUBBLE_POPS_AT = { x: 446, y: HULL.bottom + 12 } as const
