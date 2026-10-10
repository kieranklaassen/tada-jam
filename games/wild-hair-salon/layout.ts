// Where everything in the salon stands, in scene units. The scene is 1180 by
// 820 units and is fitted whole into whatever surface the shell gives it,
// centred, with paper around it. Pure numbers: the painter and, later, the
// touch rules both read them, and nothing here knows about a canvas.

export const SCENE = { w: 1180, h: 820 } as const

/** Where the wall meets the floor. */
export const FLOOR_Y = 640

/** The level line every strip hangs from: the collar of the cape. */
export const COLLAR_Y = 392

/** How many scene units one step of length is. A hundred steps reach from the collar to the floor. */
export const STEP = 2.6

/** How wide a strip is. The lock, the model and the ribbon share it, so only length differs. */
export const STRIP_W = 26

export const CHAIR = { x: 520 } as const
export const HEAD = { x: 520, y: 285, rx: 105, ry: 92 } as const

/** Where the customer's lock hangs, under the edge of its mane at the cheek, and where a strip held beside it hangs. */
export const LOCK_X = 588
export const BESIDE_X = 624

export const STOOL = { x: 712, seatY: 520 } as const
export const FRIEND_HEAD = { x: 708, y: 302, rx: 68, ry: 62 } as const

/** The bench is across the room from the lock, by the left wall; the door is on the right, past the stool. */
export const BENCH = { x: 30, w: 206, seatY: 560, backY: 470 } as const
/**
 * The plain ground at the bench: a spare cape that hangs from its hook over the end of the bench and lies out over
 * the floor. The friend's lock, and the ribbon when it is hung beside that lock, hang over it and over nothing else.
 */
export const BENCH_GROUND = { x: 168, y: 426, w: 126, h: 328, flare: 12 } as const
/** The door is glass from top to kick plate, and the street shows through it. */
export const DOOR = { x: 938, y: 150, w: 214, h: FLOOR_Y - 150, glass: { x: 958, y: 172, w: 174, h: 424 } } as const
/** The looking glass on the wall above the bench: it is turned to the chair, and the customer's face shows in it. */
export const LOOKING_GLASS = { x: 134, y: 196, rx: 84, ry: 108 } as const
/** The shelf above the ribbon's peg, and the trolley that stands under it. */
export const SHELF = { x: 724, y: 150, w: 200 } as const
export const TROLLEY = { x: 806, w: 104, top: 502 } as const
/** Where the panelling on the lower wall begins. */
export const DADO_Y = 506
export const MIRROR = { x: 520, top: 64, bottom: 470, w: 340 } as const
/** The peg the ribbon hangs from, on the wall between the stool and the door. */
export const PEG = { x: 868, y: 196 } as const

/** The cape: narrow at the collar, wide at the hem. */
export const CAPE = { collarHalf: 124, hemHalf: 232, hemY: FLOOR_Y - 6 } as const

/** Half the width of the cape at a height, for anything that has to lie over it. */
export function capeHalfWidthAt(y: number): number {
  const t = Math.max(0, Math.min(1, (y - COLLAR_Y) / (CAPE.hemY - COLLAR_Y)))
  // The cape falls like a bell: quickly wide, then nearly straight.
  return CAPE.collarHalf + (CAPE.hemHalf - CAPE.collarHalf) * Math.sqrt(t)
}

/** The y of the free end of a strip of `steps` that hangs from the collar. */
export function tipY(steps: number): number {
  return COLLAR_Y + steps * STEP
}

export type Fit = { scale: number; dx: number; dy: number }

/** Fits the whole scene into a surface, centred. A surface with no size gives a fit that draws nothing. */
export function fit(width: number, height: number): Fit {
  if (!(width > 0) || !(height > 0)) return { scale: 0, dx: 0, dy: 0 }
  const scale = Math.min(width / SCENE.w, height / SCENE.h)
  return { scale, dx: (width - SCENE.w * scale) / 2, dy: (height - SCENE.h * scale) / 2 }
}
