import type { Making } from './build'

// Where everything stands, in stage units (stage.ts: 1180 by 820). The rules
// and the view both read these, so a thing is touched where it is drawn.
// Nothing here draws, and nothing reads a clock.
//
// The brook is one long world. The bank is its first frame, and each of the
// six places downstream is one frame further to the left. A thing's place in
// the world is its place in its own frame plus that frame's left edge.

export type Spot = { x: number; y: number }

/** The paper margin round the print, and the frame line inside it. */
export const MARGIN = 14

/** One frame of the brook. */
export const FRAME = 1180

/** The brook as it crosses every frame: the far shore, and the near shore where the bank begins. */
export const WATER = { top: 338, bottom: 604 } as const
/** Above this line a tap is in the sky; from here down to the water it is on the far bank. */
export const SKY_BOTTOM = 236

/** Where the water line crosses a hull afloat. */
export const LINE = 500

/** The flat stone juts into the brook: between these the near shore is the stone's far edge. */
export const STONE = { left: 216, right: 676, edge: 566, top: 600 } as const

/** Where the near shore lies at `x` of the bank's frame: the stone's far edge where the stone juts out, the bank's edge elsewhere. */
export function shoreAt(x: number): number {
  return x >= STONE.left && x <= STONE.right ? STONE.edge : WATER.bottom
}

/** Open water a finger can be laid in, and a thing can float on. */
export function isWater(x: number, y: number): boolean {
  return y > WATER.top + 8 && y < shoreAt(x) - 4
}

/** Open water in a frame of the brook, where there is no stone. */
export function isBrook(y: number): boolean {
  return y > WATER.top + 8 && y < WATER.bottom - 4
}

/** The keel of a boat standing on the stone. */
export const SEAT: Spot = { x: 392, y: 606 }

/** Afloat in the eddy by the bank: how far the boat may ride, and past `out` the brook takes it. */
export const EDDY = { out: 430, left: 470, right: 800 } as const

/** The pale sand where the makings lie, plain and of another hue than the moss. Its near end runs as a low tongue under the foot of the stone, from `low` down. */
export const SAND = { left: 578, right: 1150, top: 626, bottom: 800, low: 678, step: 704 } as const

/** Where the bank may hold a thing: below the shore, inside the frame. */
export const BANK = { left: 22, right: 1158, bottom: 806 } as const

/** Where each making lies on a fresh bank, spread so that the small ones have a finger's room each (touch.test.ts measures it). The bark hull lies here only when it does not stand on the stone. */
export const LAID_OUT: Record<Making, Spot> = {
  bark: { x: 176, y: 712 },
  pod: { x: 180, y: 780 },
  walnut: { x: 446, y: 722 },
  maple: { x: 824, y: 672 },
  feather: { x: 672, y: 768 },
  berry: { x: 942, y: 640 },
  cap: { x: 1022, y: 642 },
  pebble: { x: 1096, y: 644 },
  stem: { x: 880, y: 750 },
  birch: { x: 1054, y: 724 },
  twig: { x: 672, y: 692 },
  stalk: { x: 1016, y: 786 },
}

/** Where a thing that floats is washed ashore: along the sand's wet edge. */
export const WASHED: readonly Spot[] = [730, 810, 890, 970, 1050, 1120].map((x) => ({ x, y: 652 }))

/** Where each of the folk is, in its own frame: its feet (or where the water meets it), and the circle that answers a tap. */
export type Home = { x: number; y: number; tap: { x: number; y: number; r: number } }

/** The frog: on his stone in the shallows by the bank, swimming among the reeds, and on a rock under the fall. */
export const FROG = { x: 150, y: 512, mouth: { x: 150, y: 404 }, reach: 150, tap: { x: 150, y: 430, r: 92 } } as const
export const FROG_AT_REEDS: Home = { x: 1052, y: 562, tap: { x: 1052, y: 500, r: 80 } }
export const FROG_AT_FALL: Home = { x: 236, y: 436, tap: { x: 236, y: 354, r: 92 } }

/** The kingfisher: on the pine by the bank, and on his low branch over the brook. */
export const KINGFISHER = { x: 236, y: 228, tap: { x: 240, y: 156, r: 86 } } as const
/** On the branch he is well to the left of the top centre, where the jam's home control lies over the print. */
export const BIRD_AT_BRANCH: Home = { x: 400, y: 214, tap: { x: 404, y: 142, r: 86 } }
/** The old tree stands at the bank's left edge; at the kingfisher's branch the same tree stands this much further into the frame. */
export const TREE_AT_BRANCH: Spot = { x: BIRD_AT_BRANCH.x - KINGFISHER.x, y: BIRD_AT_BRANCH.y - KINGFISHER.y }
/** The underside of the low branch: a mast that stands higher than this meets it. */
export const BRANCH = { y: 242, left: 260, right: 596 } as const

/** The water sprite among the rushes, and the mouth she blows from. She is in the same spot of her own frame as of the bank's. */
export const SPRITE = { x: 1058, y: 470, mouth: { x: 1004, y: 372 }, tap: { x: 1054, y: 384, r: 96 } } as const

/** The gnome on the stone, at its stern end, before he is aboard: where his feet are. */
export const GNOME = { x: 630, y: 612 } as const

/** The dragonfly's beat: low over the near water upstream of the stone, below every face. */
export const DRAGONFLY = { x: 930, y: 562 } as const

/** The six places downstream of the bank, in the order the brook meets them. */
export const PLACES = ['reeds', 'sprite', 'stones', 'branch', 'fall', 'pond'] as const
export type PlaceName = (typeof PLACES)[number]

/** Where, in its own frame, a place meets the boat, and where the thing it is named for stands. */
export const MEET: Record<PlaceName, { x: number; at: number }> = {
  reeds: { x: 600, at: 560 },
  sprite: { x: 660, at: 1010 },
  stones: { x: 690, at: 520 },
  branch: { x: 600, at: 520 },
  fall: { x: 700, at: 540 },
  pond: { x: 740, at: 360 },
}

/** How far the water drops at the fall: below the lip a hull floats this much lower. */
export const FALL_DROP = 46

/** The pond: where the boat moors among the lilies, where the boats sent before lie (further off, so drawn smaller), and the sun behind its hill. */
export const POND = {
  moor: { x: 360, y: LINE },
  pad: { x: 520, y: 540 },
  /** The pad the berry is set on, beside the gnome's. */
  berry: { x: 606, y: 560 },
  /**
   * Where the boats sent before lie, the newest first. No two are the same size, the same height or the same
   * step apart, so the row and its lamps do not read as a line of equal marks: `s` is how large each is drawn.
   * The three to the right of the gnome lie at three depths of the far water, 20 units and more apart, so their
   * lamps are not on one level. None lies behind the newest boat or the gnome on his pad: a lit lamp is stamped over the dusk, so one that
   * hung behind his hat or a sail would be drawn on it.
   */
  rows: [
    { x: 126, y: 420, s: 0.54 },
    { x: 676, y: 428, s: 0.58 },
    { x: 818, y: 384, s: 0.36 },
    { x: 1040, y: 408, s: 0.46 },
  ] as readonly (Spot & { s: number })[],
  /** The size a moored boat's sheet is printed at: the largest it is drawn. */
  scale: 0.58,
  lilies: { left: 60, right: 660 },
} as const

/** The sun: where it stands over the bank in the morning, and where it rests at the pond, where it is lifted to start the morning. */
export const SUN = { x: 872, morning: 196, pond: 248, r: 64, tap: 86, lift: 60 } as const

/** The left edge, in the world, of the frame of place `index`; the bank's frame starts at 0. */
export function frameLeft(index: number): number {
  return -(index + 1) * FRAME
}

/** The jam's home control: a round 48 px button at the top centre, 10 px from the top, at the still's size. */
export const HOME = { x: 590, y: 34, r: 24 } as const

/** The grown-up's corner at the top right (overlay.ts), in CSS pixels. */
export const CORNER = 72

/** The ghost hand, measured from its fingertip: how far it reaches each way. The whole of it stays inside the print. */
export const HAND = { left: 22, right: 54, up: 4, down: 108 } as const

/** Where the ghost hand's fingertip is drawn for a point: as near it as keeps the whole hand inside the print. */
export function handAt(x: number, y: number): Spot {
  return { x: clamp(x, MARGIN + HAND.left + 6, 1180 - MARGIN - HAND.right - 6), y: clamp(y, MARGIN + HAND.up + 6, 820 - MARGIN - HAND.down - 6) }
}

/** Whether the whole hand fits with its fingertip on a point. The hand shows a move that starts and ends at such a point. */
export function handFits(at: Spot): boolean {
  const there = handAt(at.x, at.y)
  return there.x === at.x && there.y === at.y
}

export function clamp(value: number, low: number, high: number): number {
  return Math.min(high, Math.max(low, value))
}

export function distance(ax: number, ay: number, bx: number, by: number): number {
  return Math.hypot(ax - bx, ay - by)
}

export const smooth = (k: number): number => k * k * (3 - 2 * k)
