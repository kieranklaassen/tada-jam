import { BOARD, MOTH_TOUCH, holeUnder, type Colour, type Mirror } from './board'
import { STAGE, type Fit } from './stage'

// Where everything that is not a hole stands, in stage units, and what a
// touch landed on. The board is in board.ts. Pure numbers: the model asks
// `whatIsAt`, the view draws at the same places, and tests hold the targets
// apart from each other, from the jam's home control and from the grown-up's
// corner at each surface size.

/** The tray under the board: five wells in the order of the colours, each as wide as its target. */
export const WELL = { x: 238, y: 624, width: 120, height: 176 } as const
/** The middle of a well's mouth, where a peg that comes back lands. */
export function wellMouth(colour: Colour): { x: number; y: number } {
  return { x: WELL.x + (colour - 0.5) * WELL.width, y: 706 }
}
/** Where the peg that shows the colour in hand stands up out of its pile: inside its well's target, below the board. */
export function handPlace(colour: Colour): { x: number; y: number } {
  return { x: wellMouth(colour).x, y: 652 }
}
/** The tray's rim, which a green peg hops along and a red one strikes on its way out. */
export const RIM_Y = 600

/** The three mirror keys in the bottom left, each a fat square key: none on top, two ways and four ways under it. */
export const BUTTON_HALF = 34
export const BUTTONS: readonly { mirror: Mirror; x: number; y: number }[] = [
  { mirror: 0, x: 111, y: 660 },
  { mirror: 1, x: 62, y: 752 },
  { mirror: 2, x: 160, y: 752 },
]

/** The marks on a key. */
export type KeyMarks = {
  /** The peg that is pushed: the one solid thing on the key, in the same place on all three and drawn as a peg on the board is. */
  peg: { x: number; y: number; r: number }
  /** Its echoes: hollow outlines, clearly smaller, and large enough that their line cannot fill them in. */
  echoes: { x: number; y: number; r: number }[]
  /** The lines the board is folded along. Each runs into the key's rim at both ends, so two of them make four panes and no free cross. */
  folds: [number, number, number, number][]
}

/** The corner radius of a key's rim: a fold meets the rim on its straight part. */
export const BUTTON_CORNER = 13
/** The widest line an echo is drawn with, at rest and lit: thin enough that the hole in it is seen at pixel ratio 1 on the smallest surface a child has. */
export const ECHO_LINE = 2.6

/**
 * What a key shows: the peg that is pushed, solid, up and left of the middle on every key; each echo it gets,
 * a hollow outline on the far side of a fold; and the fold itself, a line that ends on the rim. No key shows two
 * solid things and the first key's peg is off its middle, so no key reads as a face of a die.
 */
export function keyMarks(mirror: Mirror): KeyMarks {
  const button = BUTTONS[mirror], h = BUTTON_HALF
  const at = (dx: number, dy: number, r: number) => ({ x: button.x + dx, y: button.y + dy, r })
  const upright: [number, number, number, number] = [button.x + 2, button.y - h, button.x + 2, button.y + h]
  const level: [number, number, number, number] = [button.x - h, button.y + 3, button.x + h, button.y + 3]
  const peg = at(-16, -15, 13)
  if (mirror === 0) return { peg, echoes: [], folds: [] }
  if (mirror === 1) return { peg, echoes: [at(19, -15, 7)], folds: [upright] }
  return { peg, echoes: [at(19, -15, 7), at(-16, 20, 7), at(19, 20, 7)], folds: [upright, level] }
}

/** The lever on the right wall: a slot and a knob that is up at rest and down while the show runs. */
export const LEVER = { x: 1138, top: 338, bottom: 520, knob: 38, left: 1098, right: 1178, boxTop: 296, boxBottom: 562 } as const
/** Where the knob's middle is: `down` runs from 0, up, to 1, down. */
export function knobAt(down: number): { x: number; y: number } {
  return { x: LEVER.x, y: LEVER.top + (LEVER.bottom - LEVER.top) * down }
}

/**
 * The tray's handle, between the tray and the loudspeaker: pulled down to its stop it drops every peg. Its
 * target ends `stop` and a finger's room above the stage's lower edge, so that wherever it is grabbed the pull
 * can be finished on the surface. Below the target the slot is bare backdrop.
 */
export const HANDLE = { x: 908, y: 664, half: 40, stop: 76, left: 868, right: 948, top: 620, bottom: 724 } as const

/** The spider at rest on its thread, and how near its middle a touch must land to poke it. */
export const SPIDER = { x: 102, y: 318, anchorY: 96, reach: 76 } as const
/** The spider's own place, from side to side: the stage's left edge to just outside the board's frame. No leg of it is drawn outside, in any act. */
export const SPIDER_PLACE = { left: 2, right: BOARD.x - 12 } as const
/** Where the spider's middle is, hanging `drop` lower and swung by `swing` radians about its anchor. */
export function spiderAt(drop: number, swing: number): { x: number; y: number } {
  const length = SPIDER.y - SPIDER.anchorY + drop
  return { x: SPIDER.x + Math.sin(swing) * length, y: SPIDER.anchorY + Math.cos(swing) * length }
}
/** The gecko on the right wall, head up: its middle line, and the box a touch pokes it in when it has not slid. */
export const GECKO = { x: 1012, y: 330, left: 958, right: 1066, top: 128, bottom: 572 } as const
/** The loudspeaker's cone in the bottom right. */
export const SPEAKER = { x: 1066, y: 706, radius: 88 } as const
/** The valve on the right wall, which only flickers. */
export const VALVE = { x: 1136, y: 196 } as const

/** The marquee's bulbs along the top: no two share a size and no two hang at the same height. The gap in the middle is under the jam's home control. */
export const BULBS: readonly { x: number; y: number; r: number }[] = [
  { x: 248, y: 54, r: 12 }, { x: 304, y: 49, r: 8 }, { x: 352, y: 57, r: 14 }, { x: 410, y: 51, r: 10 }, { x: 455, y: 56, r: 13 }, { x: 512, y: 50, r: 9 },
  { x: 664, y: 52, r: 10.5 }, { x: 720, y: 59, r: 15 }, { x: 768, y: 47, r: 7 }, { x: 824, y: 55, r: 11.5 }, { x: 872, y: 53, r: 9.5 }, { x: 928, y: 58, r: 13.5 },
]
/** The marquee's two rails, and the cradle the upper one makes under the jam's home control: a half ring that hangs clear of it at every surface size. */
export const RAILS = { top: 16, bottom: 88 } as const
export const CRADLE = { x: 590, y: 34, r: 50 } as const
/** The height the moth rides a trapped beam at: along the board's lower edge, far from the home control. */
export const RIDE_Y = BOARD.y + BOARD.height + 22

/** The moth's own bulb, and where it clings to the underside of it when no peg holds it: above the bezel. */
export const MOTH_BULB = 9
export const MOTH_HOME = { x: BULBS[MOTH_BULB].x, y: BULBS[MOTH_BULB].y + 17 } as const

/** The jam's round home control: 48 pixels across, 10 from the top, in the middle of the surface. */
export const HOME_CONTROL = { size: 48, top: 10 } as const
/** The grown-up's corner at the top right of the surface, in pixels. */
export const GROWN_UP_CORNER = 72

/** Whether a point of the surface, in its own pixels, is in the grown-up's corner. The game answers nothing there. */
export function inGrownUpCorner(x: number, y: number, surfaceWidth: number): boolean {
  return x >= surfaceWidth - GROWN_UP_CORNER && y < GROWN_UP_CORNER
}

type Box = { left: number; right: number; top: number; bottom: number }

/** The home control and the grown-up's corner as boxes in stage units, for a surface of a size and its fit. */
export function keptClear(surfaceWidth: number, by: Fit): { home: Box; corner: Box } {
  const toX = (x: number) => (x - by.x) / by.scale, toY = (y: number) => (y - by.y) / by.scale
  return {
    home: { left: toX(surfaceWidth / 2 - HOME_CONTROL.size / 2), right: toX(surfaceWidth / 2 + HOME_CONTROL.size / 2), top: toY(HOME_CONTROL.top), bottom: toY(HOME_CONTROL.top + HOME_CONTROL.size) },
    corner: { left: toX(surfaceWidth - GROWN_UP_CORNER), right: toX(surfaceWidth), top: toY(0), bottom: toY(GROWN_UP_CORNER) },
  }
}

export type Target =
  | { kind: 'hole'; hole: number }
  | { kind: 'well'; colour: Colour }
  | { kind: 'button'; mirror: Mirror }
  | { kind: 'lever' }
  | { kind: 'handle' }
  | { kind: 'moth' }
  | { kind: 'spider' }
  | { kind: 'gecko' }
  | { kind: 'speaker' }
  | { kind: 'bare' }

/** Where the things that move are now. The moth is null while it cannot be touched: in the air, or in a caper. */
export type Places = {
  moth: { x: number; y: number } | null
  /** The spider's middle, wherever its thread has taken it. */
  spider: { x: number; y: number }
  /** How far the gecko has slid down the wall. */
  geckoSlide: number
}

export const AT_REST: Places = { moth: null, spider: { x: SPIDER.x, y: SPIDER.y }, geckoSlide: 0 }

/**
 * What a touch at a point of the stage landed on. Each thing that moves is touched where it is drawn now. A
 * touch on the sitting moth is the moth's, never the hole's behind it: where the two overlap the moth wins.
 */
export function whatIsAt(x: number, y: number, places: Places): Target {
  const moth = places.moth
  if (moth && Math.hypot(x - moth.x, y - moth.y) <= MOTH_TOUCH) return { kind: 'moth' }
  const hole = holeUnder(x, y)
  if (hole >= 0) return { kind: 'hole', hole }
  if (y >= WELL.y && y < WELL.y + WELL.height && x >= WELL.x && x < WELL.x + WELL.width * 5) {
    return { kind: 'well', colour: (Math.floor((x - WELL.x) / WELL.width) + 1) as Colour }
  }
  for (const button of BUTTONS) if (Math.abs(x - button.x) <= BUTTON_HALF && Math.abs(y - button.y) <= BUTTON_HALF) return { kind: 'button', mirror: button.mirror }
  if (x >= LEVER.left && x <= LEVER.right && y >= LEVER.boxTop && y <= LEVER.boxBottom) return { kind: 'lever' }
  if (x >= HANDLE.left && x <= HANDLE.right && y >= HANDLE.top && y <= HANDLE.bottom) return { kind: 'handle' }
  if (Math.hypot(x - places.spider.x, y - places.spider.y) <= SPIDER.reach) return { kind: 'spider' }
  if (x >= GECKO.left && x <= GECKO.right && y >= GECKO.top + places.geckoSlide && y <= GECKO.bottom + places.geckoSlide) return { kind: 'gecko' }
  if (Math.hypot(x - SPEAKER.x, y - SPEAKER.y) <= SPEAKER.radius) return { kind: 'speaker' }
  return { kind: 'bare' }
}

/** The boxes of everything that answers a touch as a control or a character, at rest, for the tests that hold them apart. */
export function targetBoxes(): ({ name: string } & Box)[] {
  const round = (name: string, x: number, y: number, r: number) => ({ name, left: x - r, right: x + r, top: y - r, bottom: y + r })
  return [
    { name: 'board', left: BOARD.x, right: BOARD.x + BOARD.width, top: BOARD.y, bottom: BOARD.y + BOARD.height },
    { name: 'wells', left: WELL.x, right: WELL.x + WELL.width * 5, top: WELL.y, bottom: WELL.y + WELL.height },
    ...BUTTONS.map((button) => round(`button ${button.mirror}`, button.x, button.y, BUTTON_HALF)),
    { name: 'lever', left: LEVER.left, right: LEVER.right, top: LEVER.boxTop, bottom: LEVER.boxBottom },
    { name: 'handle', left: HANDLE.left, right: HANDLE.right, top: HANDLE.top, bottom: HANDLE.bottom },
    round('spider', SPIDER.x, SPIDER.y, SPIDER.reach),
    { name: 'gecko', left: GECKO.left, right: GECKO.right, top: GECKO.top, bottom: GECKO.bottom },
    round('speaker', SPEAKER.x, SPEAKER.y, SPEAKER.radius),
    round('moth at home', MOTH_HOME.x, MOTH_HOME.y, MOTH_TOUCH),
  ]
}

/** The stage as a box, for the tests. */
export const STAGE_BOX: Box = { left: 0, right: STAGE.width, top: 0, bottom: STAGE.height }
