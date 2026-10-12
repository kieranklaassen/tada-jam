import { PARTS } from './candle'

// Where everything stands that is the same at every place in the hall, and
// the candle stall's own pieces, in stage units (stage.ts: 1180 by 820). The
// other places are in places.ts. The rules, the view and the tests all read
// their places from these two, so what is drawn is what is touched.

/** The mouth of the wax pot: the ellipse of the wax surface at rest. */
export const POT = { x: 590, y: 585, rx: 150, ry: 34 } as const
/** The counter the pot is sunk into: its top, where a drop or a candle's tip comes to rest outside the pot. */
export const COUNTER = { back: 612, top: 648, front: 684 } as const

/** The dipping stick at rest on its two hooks, and how far the hand can take it. */
export const REST = { x: 590, y: 150 } as const
export const STICK = { half: 62, minX: 230, maxX: 960, minY: 112, maxY: 556 } as const
/** Bare wick between the stick and the first part, and the length of one part. */
export const FREE = 34
export const STEP = 20
export const LENGTH = FREE + PARTS * STEP

/** The basket on the counter: its mouth, and how many things it holds. */
export const BASKET = { x: 880, y: 590, rx: 96, ry: 24, bottom: 700, slots: 6 } as const

/** The jam's home control, drawn over every game, in the surface's own pixels: 48 across, its top 10 from the top edge, at the middle. */
export const HOME = { top: 10, size: 48 } as const

export type Who = 'tuba' | 'maker' | 'baker' | 'bundle' | 'goat'
export const WHO: readonly Who[] = ['tuba', 'maker', 'baker', 'bundle', 'goat']

/**
 * The five fair-goers round the stall. `x` and `foot` are where the body stands (the foot is hidden behind the
 * counter, or for the bundle sits on it), `eyes` is the middle of the face, and `touch` is the ellipse that
 * answers a poke.
 */
export const FOLK: Record<Who, { x: number; foot: number; eyes: { x: number; y: number }; touch: { x: number; y: number; rx: number; ry: number } }> = {
  tuba: { x: 158, foot: 640, eyes: { x: 190, y: 232 }, touch: { x: 150, y: 310, rx: 130, ry: 220 } },
  maker: { x: 322, foot: 640, eyes: { x: 330, y: 312 }, touch: { x: 322, y: 420, rx: 128, ry: 190 } },
  baker: { x: 846, foot: 640, eyes: { x: 838, y: 294 }, touch: { x: 846, y: 380, rx: 122, ry: 180 } },
  bundle: { x: 1078, foot: 664, eyes: { x: 1074, y: 498 }, touch: { x: 1078, y: 540, rx: 88, ry: 120 } },
  goat: { x: 150, foot: 700, eyes: { x: 168, y: 600 }, touch: { x: 160, y: 640, rx: 110, ry: 80 } },
}

/**
 * Where each one's want shows, outside or on its body: her open hand, his cupped hand, the goat's mouth, the
 * bell of the tuba and the bundle's two mittens. A thing let go there is given, as it is anywhere on the body.
 */
export const HANDS: Record<Who, { x: number; y: number; rx: number; ry: number }> = {
  maker: { x: 484, y: 480, rx: 52, ry: 52 },
  baker: { x: 680, y: 468, rx: 52, ry: 52 },
  goat: { x: 276, y: 656, rx: 48, ry: 44 },
  tuba: { x: 88, y: 170, rx: 76, ry: 76 },
  bundle: { x: 1078, y: 572, rx: 104, ry: 40 },
}

/** The two lit lanterns that hang over the bench, clear of the home control and of the grown-up's corner. */
export const LANTERNS: readonly { x: number; y: number }[] = [
  { x: 446, y: 78 },
  { x: 738, y: 78 },
]
/** The window with the snow behind it. */
export const WINDOW = { x: 938, y: 96, w: 176, h: 250 } as const
/** The flame of the candle on the candle-maker's hat, in her own body's units above her foot. */
export const HAT_FLAME = { x: 4, y: -438 } as const

export function inEllipse(px: number, py: number, e: { x: number; y: number; rx: number; ry: number }): boolean {
  const dx = (px - e.x) / e.rx, dy = (py - e.y) / e.ry
  return dx * dx + dy * dy <= 1
}
