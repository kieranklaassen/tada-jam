import type { Point } from './input'

// Where everything is, in stage units (1180 by 820). Nothing that matters to
// play lies in the bottom 50.

export type HostId = 'moose' | 'house' | 'tree' | 'dog'
export const HOST_IDS: readonly HostId[] = ['moose', 'house', 'tree', 'dog']

/** A place the string catches on. `side` is which way it goes when its host opens like an umbrella. */
export type Hook = { id: string; host: HostId; x: number; y: number; side: -1 | 0 | 1; /** On the part that rises when its host opens. */ lift?: number }

/** In the order a tap takes them: round the picture once, so the string crosses nobody's face by itself. */
export const HOOKS: readonly Hook[] = [
  { id: 'nose', host: 'moose', x: 470, y: 500, side: 0 },
  { id: 'branch-right', host: 'tree', x: 252, y: 318, side: 1 },
  { id: 'branch-left', host: 'tree', x: 66, y: 344, side: -1 },
  { id: 'tip', host: 'tree', x: 160, y: 72, side: 0 },
  { id: 'antler-outer-left', host: 'moose', x: 306, y: 196, side: -1 },
  { id: 'antler-inner-left', host: 'moose', x: 408, y: 152, side: -1 },
  { id: 'antler-inner-right', host: 'moose', x: 572, y: 152, side: 1 },
  { id: 'antler-outer-right', host: 'moose', x: 690, y: 186, side: 1 },
  { id: 'roof', host: 'house', x: 900, y: 176, side: 0, lift: 38 },
  { id: 'chimney', host: 'house', x: 1040, y: 158, side: 0 },
  { id: 'eave', host: 'house', x: 1108, y: 386, side: 0, lift: 38 },
  { id: 'dog-head', host: 'dog', x: 1072, y: 566, side: 0 },
  { id: 'dog-tail', host: 'dog', x: 926, y: 618, side: -1 },
]
export const HOOK = new Map(HOOKS.map((hook) => [hook.id, hook]))

/** How near the end or a pulled loop has to pass for a place to catch it, and how near a let-go end flies to one. */
export const CATCH = 62
export const FLY = 230
export const LOOP_FLY = 130

export const BOX = { left: 46, right: 290, top: 560, bottom: 756 } as const
export const MOUTH: Point = { x: 178, y: 556 }
/** Where the end hangs out of a full box, with the first thing jammed at the rim behind it. */
export const HOME: Point = { x: 258, y: 594 }
export const SWITCH = { x: 742, y: 640, r: 86 } as const
export const CRANK = { x: 52, y: 660, r: 52 } as const
export const GROUND = 738
/** Between these the end may lie in the snow: clear of the box and the switch. */
export const SNOW = { left: 350, right: 620 } as const

/** Where a host's body is, for a touch on it: ellipses of centre and radii. */
export const BODIES: Readonly<Record<HostId, readonly (readonly [number, number, number, number])[]>> = {
  dog: [[1020, 664, 110, 92]],
  moose: [[488, 400, 130, 190], [365, 205, 120, 85], [620, 205, 120, 85], [540, 590, 160, 150]],
  house: [[925, 430, 190, 270]],
  tree: [[160, 340, 130, 270]],
}

/** The point each host turns, hops and squashes about. */
export const PIVOT: Readonly<Record<HostId, Point>> = {
  moose: { x: 545, y: 738 },
  house: { x: 920, y: 712 },
  tree: { x: 160, y: 700 },
  dog: { x: 1015, y: 742 },
}

/** Where a host lets out what it lets out. */
export const OUTLETS: Readonly<Record<HostId, readonly Point[]>> = {
  moose: [{ x: 428, y: 516 }, { x: 512, y: 516 }],
  house: [{ x: 1040, y: 150 }],
  tree: [{ x: 160, y: 62 }],
  dog: [{ x: 1030, y: 590 }, { x: 1116, y: 590 }],
}
export const DOG_MOUTH: Point = { x: 1074, y: 668 }
/** Where a sleeper's one bubble comes from. */
export const NOSES: Readonly<Record<HostId, Point>> = { moose: { x: 470, y: 486 }, house: { x: 1040, y: 150 }, tree: { x: 160, y: 62 }, dog: { x: 1074, y: 640 } }
