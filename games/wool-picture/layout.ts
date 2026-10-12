import type { Point } from './input'
import { CORNER } from './overlay'
import { STAGE, fit } from './stage'

// Where everything stands, in stage units (stage.ts). The sheet of felt is the
// large thing in the middle, on its easel; the bowls and the comb lie in a row
// on the table below it, and the four figures and the pegs fill the room to
// its right. Nothing that answers a touch lies under the jam's home control or
// in the grown-up's corner, at either size the stage is fitted to
// (layout.test.ts).

/** The sheet's grid: the wool is kept, saved and laid cell by cell. */
export const COLS = 72
export const ROWS = 48
export const CELL = 10

/** The felt a finger lays wool on. */
export const FELT = { x: 64, y: 96, w: COLS * CELL, h: ROWS * CELL } as const
/** The wooden frame round it. */
export const FRAME = { x: FELT.x - 24, y: FELT.y - 24, w: FELT.w + 48, h: FELT.h + 48 } as const
/** The back edge of the table: the figures at the back stand on it. */
export const TABLE_Y = 612

/** The five bowls, by dye. Each answers on a circle of `BOWL_REACH` round the middle of its heap. */
export const BOWL_REACH = 60
export const BOWLS: readonly Point[] = [0, 1, 2, 3, 4].map((i) => ({ x: 104 + i * 136, y: 716 }))
/** The comb lies beside the last bowl. As what the finger works with it is number 5, after the five dyes. */
export const COMB = { x: 772, y: 730, w: 96, h: 84 } as const
export const COMB_HAND = 5

export type Who = 0 | 1 | 2 | 3
export const SHEEP = 0, GOOSE = 1, SHEPHERD = 2, PIG = 3

/**
 * Where each figure stands in the dish: the middle of its feet, the box it fills, and how large it is drawn
 * there against its own pieces. In the order the save keeps: sheep, goose, shepherd, pig.
 */
export const FOLK: readonly { x: number; y: number; w: number; h: number; scale: number }[] = [
  { x: 913, y: 800, w: 174, h: 136, scale: 0.79 },
  { x: 1085, y: 608, w: 170, h: 280, scale: 1 },
  { x: 908, y: 608, w: 180, h: 336, scale: 1 },
  { x: 1090, y: 808, w: 172, h: 132, scale: 0.9 },
]
/** How large a figure is drawn on the sheet, against its own pieces: about half its size in the dish. */
export const ON_SHEET = 0.5
/** A figure's own size at scale 1: what its pieces fill, from its feet. */
export const FIGURE: readonly { w: number; h: number }[] = [{ w: 220, h: 170 }, { w: 170, h: 280 }, { w: 180, h: 336 }, { w: 190, h: 146 }]
/** The least box a figure on the sheet answers on. */
export const LEAST_FIGURE = 80

/** The three pegs on the wall, where hung pictures go, and the box a hung picture fills: it covers its own peg. */
export const PEGS: readonly Point[] = [{ x: 866, y: 110 }, { x: 980, y: 110 }, { x: 1094, y: 110 }]
export const PEG_REACH = 30
export const PICTURE = { w: 104, h: 76, up: 16 } as const
export function pictureBox(peg: number): Box {
  return { x: PEGS[peg].x - PICTURE.w / 2, y: PEGS[peg].y - PICTURE.up, w: PICTURE.w, h: PICTURE.h }
}

/** The yarn loop the frame hangs by, at its top right corner. */
export const LOOP = { x: 800, y: 60, w: 64, h: 64 } as const

/** Where the moth may sit: three corners of the frame (the fourth holds the loop). It is found on the first on every load. */
export const PERCHES: readonly Point[] = [{ x: 52, y: 70 }, { x: 52, y: 602 }, { x: 804, y: 602 }]
export const MOTH_REACH = 46
/** How far above its middle the moth is drawn, to the tips of its feelers (folkDraw.ts). */
export const MOTH_UP = 42
/** Where the moth sits on a hung picture: under the middle of its lower edge, low enough that not even its feelers lie over the picture, clear of the grown-up's corner. */
export function perchOn(peg: number): Point {
  return { x: PEGS[peg].x, y: PEGS[peg].y - PICTURE.up + PICTURE.h + MOTH_UP + 6 }
}

export type Spot =
  | { on: 'felt'; col: number; row: number }
  | { on: 'bowl'; dye: number }
  | { on: 'comb' }
  | { on: 'loop' }
  | { on: 'moth' }
  | { on: 'peg'; peg: number }
  | { on: 'room' }

/** A point of the stage as a place on the sheet's grid, in cells and parts of a cell. */
export function toCells(at: Point): Point {
  return { x: (at.x - FELT.x) / CELL, y: (at.y - FELT.y) / CELL }
}

export function onFelt(at: Point): boolean {
  return at.x >= FELT.x && at.x < FELT.x + FELT.w && at.y >= FELT.y && at.y < FELT.y + FELT.h
}

export type Box = { x: number; y: number; w: number; h: number }

export const inBox = (at: Point, box: Box): boolean => at.x >= box.x && at.x <= box.x + box.w && at.y >= box.y && at.y <= box.y + box.h

/** The box a figure answers a touch on in the dish. */
export function folkBox(who: number): Box {
  const f = FOLK[who]
  return { x: f.x - f.w / 2, y: f.y - f.h, w: f.w, h: f.h }
}

/** The box a figure answers on where it is drawn on the sheet, with its feet at (x, y): never less than 80 by 80. */
export function sheetBox(who: number, x: number, y: number): Box {
  const w = Math.max(LEAST_FIGURE, FIGURE[who].w * ON_SHEET), h = Math.max(LEAST_FIGURE, FIGURE[who].h * ON_SHEET)
  return { x: x - w / 2, y: y - h, w, h }
}

export const combBox = (): Box => ({ x: COMB.x - COMB.w / 2, y: COMB.y - COMB.h / 2, w: COMB.w, h: COMB.h })
export const loopBox = (): Box => ({ x: LOOP.x - LOOP.w / 2, y: LOOP.y - LOOP.h / 2, w: LOOP.w, h: LOOP.h })

/**
 * What a touch at this point of the stage lands on, among the things that keep their place. `moth` is where the
 * moth sits now, or null while it flies. The figures are not asked here: each is touched where it is drawn,
 * and the toy knows where that is.
 */
export function spotAt(at: Point, moth: Point | null): Spot {
  if (moth && Math.hypot(at.x - moth.x, at.y - moth.y) <= MOTH_REACH) return { on: 'moth' }
  if (inBox(at, loopBox())) return { on: 'loop' }
  if (onFelt(at)) {
    const cell = toCells(at)
    return { on: 'felt', col: Math.floor(cell.x), row: Math.floor(cell.y) }
  }
  for (let dye = 0; dye < BOWLS.length; dye++) if (Math.hypot(at.x - BOWLS[dye].x, at.y - (BOWLS[dye].y - 14)) <= BOWL_REACH) return { on: 'bowl', dye }
  if (inBox(at, combBox())) return { on: 'comb' }
  for (let peg = 0; peg < PEGS.length; peg++) if (inBox(at, pictureBox(peg)) || Math.hypot(at.x - PEGS[peg].x, at.y - PEGS[peg].y) <= PEG_REACH) return { on: 'peg', peg }
  return { on: 'room' }
}

/** Every box of the stage that answers a touch as a thing of its own, with a name for a test's message. */
export function touchables(): { name: string; box: Box }[] {
  const round = (name: string, at: Point, reach: number) => ({ name, box: { x: at.x - reach, y: at.y - reach, w: reach * 2, h: reach * 2 } })
  return [
    { name: 'the sheet inside its frame', box: { ...FELT } },
    ...BOWLS.map((bowl, dye) => round(`bowl ${dye}`, { x: bowl.x, y: bowl.y - 14 }, BOWL_REACH)),
    { name: 'the comb', box: combBox() },
    { name: 'the yarn loop', box: loopBox() },
    ...FOLK.map((_, who) => ({ name: `figure ${who} in the dish`, box: folkBox(who) })),
    ...PEGS.map((peg, i) => round(`peg ${i}`, peg, PEG_REACH)),
    ...PEGS.map((_, i) => ({ name: `the picture hung on peg ${i}`, box: pictureBox(i) })),
    ...PERCHES.map((perch, i) => round(`the moth on corner ${i}`, perch, MOTH_REACH)),
    ...PEGS.map((_, i) => round(`the moth on the picture on peg ${i}`, perchOn(i), MOTH_REACH)),
  ]
}

/** The jam's home control (48 px across, at the top centre, 10 px from the top) as a box of the stage, for a surface of this size. */
export function homeControl(width: number, height: number): Box {
  const by = fit(width, height)
  return { x: (width / 2 - 24 - by.x) / by.scale, y: (10 - by.y) / by.scale, w: 48 / by.scale, h: 48 / by.scale }
}

/** The grown-up's corner (overlay.ts) as a box of the stage, for a surface of this size. */
export function grownUpCorner(width: number, height: number): Box {
  const by = fit(width, height)
  return { x: (width - CORNER - by.x) / by.scale, y: (0 - by.y) / by.scale, w: CORNER / by.scale, h: CORNER / by.scale }
}

export function overlaps(a: Box, b: Box): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h
}

/** The stage's own size, for the view. */
export const ROOM = STAGE
