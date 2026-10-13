import { STAGE } from './stage'
import { GRID } from './tray'

// Where everything stands, in stage units, and what a touch lands on. The
// wall is above `TABLE_Y` and the table below it; the tray lies on the table
// and the cat sits behind it with its chin on the rim. Everything a child
// touches is listed here with the box it is touched in, which is the box it
// is drawn in, and layout.test.ts holds that no two of them overlap.

export type Rect = { x: number; y: number; w: number; h: number }

export const TABLE_Y = 236

/** The tray as it lies, and the water inside its rim. */
export const TRAY = { x: 40, y: 262, w: 760, h: 538 } as const
export const POOL = { x: 66, y: 288, w: 708, h: 490 } as const

/** The three pots, top to bottom: 120 across, 140 apart, none in the bottom strip. */
export const POT = { x: 900, ys: [356, 496, 636], r: 60, reach: 6 } as const

/** The tools, in the order they come to the table, each where it lies on the cloth beside the pots. */
export const TOOL_IDS = ['comb', 'straw', 'soap'] as const
export type ToolId = (typeof TOOL_IDS)[number]
export const TOOL: Record<ToolId, Rect> = {
  comb: { x: 1014, y: 500, w: 144, h: 78 },
  straw: { x: 1014, y: 592, w: 144, h: 78 },
  soap: { x: 1014, y: 684, w: 144, h: 78 },
}
/** The cloth the tools lie on. */
export const MAT: Rect = { x: 1002, y: 484, w: 168, h: 292 }

/** The cat: its body behind the tray, its head with the chin on the rim, and its two paws on the rim. */
export const CAT = {
  body: { x: 300, y: 186, rx: 182, ry: 126 },
  head: { x: 372, y: 196, rx: 112, ry: 92 },
  paws: [{ x: 286, y: 272, rx: 34, ry: 14 }, { x: 458, y: 272, rx: 34, ry: 14 }],
  nose: { x: 372, y: 226 },
} as const

/** The corner of paper that sticks out from under the cat: a touch here takes a print. */
export const PAPER: Rect = { x: 10, y: 166, w: 106, h: 92 }

/** The window, and the sill the bird hops along. */
export const WINDOW = { x: 690, y: 30, w: 260, h: 176 } as const
export const SILL = { y: 206, from: 732, to: 912 } as const
export const BIRD_REACH = 38

/** The line across the room: how high it hangs at `x`. */
export function lineY(x: number): number {
  return 26 + 24 * Math.sin((Math.PI * Math.min(STAGE.width, Math.max(0, x))) / STAGE.width)
}

/** What hangs on the line from the start: where its middle is pegged, and how wide and long it is. */
export const CLOTHS = [
  { id: 'towel', x: 64, w: 92, h: 116 },
  { id: 'sock', x: 512, w: 40, h: 82 },
] as const
/** How far past its edge a cloth still takes a touch: the sock is narrow, and a small finger is not exact. */
export const CLOTH_REACH = 10

/** A print as it is held up, and the four pegs: where each is on the line, how large a print hangs there, how far it tilts and how far below the line it hangs. No two hang alike. */
export const PRINT = { w: 150, h: 104 } as const
export const PEGS = [
  { x: 694, size: 0.69, tilt: -0.07, drop: 6 },
  { x: 803, size: 0.59, tilt: 0.06, drop: 15 },
  { x: 908, size: 0.65, tilt: -0.035, drop: 4 },
  { x: 1016, size: 0.56, tilt: 0.085, drop: 11 },
] as const
/** Where the cat holds a print up: between its paws, under its chin, over the near edge of the tray. */
export const HELD: Rect = { x: CAT.head.x - PRINT.w / 2, y: 240, w: PRINT.w, h: PRINT.h }

/** Where the cat's paws hold a print: one at each side of it. They are drawn here and touched here. */
export const HOLD_PAWS = [{ x: HELD.x + 2, y: HELD.y + HELD.h * 0.55 }, { x: HELD.x + HELD.w - 2, y: HELD.y + HELD.h * 0.55 }] as const

/** The box a print hangs in on a peg. It covers its own peg and nothing else. */
export function hungRect(peg: number): Rect {
  const at = PEGS[peg], w = PRINT.w * at.size, h = PRINT.h * at.size
  return { x: at.x - w / 2, y: lineY(at.x) + at.drop, w, h }
}

/** The jam's home control over the game: a round control at the top centre, 48 across and 10 from the top, in the surface's own pixels. */
export const HOME = { size: 48, top: 10 } as const
/** The grown-up's corner at the top right, in the surface's own pixels (overlay.ts). */
export const CORNER = 72

export type Spot =
  | { kind: 'water'; x: number; y: number }
  | { kind: 'pot'; pot: number }
  | { kind: 'tool'; tool: ToolId }
  | { kind: 'paper' }
  | { kind: 'held' }
  | { kind: 'print'; peg: number }
  | { kind: 'cat'; part: 'paw' | 'head' | 'body'; paw: number }
  | { kind: 'bird' }
  | { kind: 'cloth'; cloth: number }
  | { kind: 'mat' }
  | { kind: 'rim' }
  | { kind: 'room' }

/** What is on the table and the line now, as far as a touch needs it. */
export type Laid = {
  birdX: number
  tools: readonly ToolId[]
  held: boolean
  hung: readonly boolean[]
  /** The cat's paws are at the sides of the print it holds, and not on the rim. */
  holding?: boolean
  /** How far the corner of paper is curled up off the pile, in stage units: 0 lying flat. */
  curl?: number
}

/**
 * A paw as it is touched: wider and taller than it is drawn, so it is 48 px each way at both sizes. On the rim its
 * target is set `up` over the cat's chest and takes nothing from the water. At the side of a held print it is
 * centred on the paw and asked before the print and the water, so the whole drawn paw answers as a paw.
 */
export const PAW_HIT = { rx: 40, ry: 28, up: 12 } as const

/** How far the corner of paper turns about the middle of its right edge for each unit it is curled. view.ts draws it so. */
export const PAPER_TURN = 0.022

/** The corner of paper as it is cut, from the top left of its box: art.ts draws this shape, and a touch on the curled tip is asked of it. */
export const PAPER_SHAPE = [{ x: PAPER.w + 20, y: 18 }, { x: 18, y: 4 }, { x: 2, y: PAPER.h - 26 }, { x: PAPER.w + 20, y: PAPER.h }] as const

/**
 * Whether a place is on the corner of paper. Lying flat it is touched in its box. Curled up by `curl`, its tip
 * stands above the box: there it is touched only where it is drawn, which is its cut shape turned about the
 * middle of its right edge and lifted, and never on the towel that hangs over it.
 */
export function onPaper(x: number, y: number, curl: number): boolean {
  if (inRect(x, y, PAPER)) return true
  if (curl <= 0 || y >= PAPER.y || x < PAPER.x || x >= PAPER.x + PAPER.w) return false
  const towel = CLOTHS[0], hem = lineY(towel.x) + towel.h
  if (Math.abs(x - towel.x) <= towel.w / 2 && y <= hem) return false
  const px = x - (PAPER.x + PAPER.w), py = y - (PAPER.y + PAPER.h / 2), turn = PAPER_TURN * curl
  // The place in the paper's own frame, from the top left of its box.
  const lx = px * Math.cos(turn) + py * Math.sin(turn) + PAPER.w, ly = py * Math.cos(turn) - px * Math.sin(turn) + PAPER.h / 2 + curl
  let inside = false
  for (let i = 0, j = PAPER_SHAPE.length - 1; i < PAPER_SHAPE.length; j = i++) {
    const a = PAPER_SHAPE[i], b = PAPER_SHAPE[j]
    if (a.y > ly !== b.y > ly && lx < ((b.x - a.x) * (ly - a.y)) / (b.y - a.y) + a.x) inside = !inside
  }
  return inside
}

const inEllipse = (x: number, y: number, e: { x: number; y: number; rx: number; ry: number }, grow = 0): boolean => {
  const dx = (x - e.x) / (e.rx + grow), dy = (y - e.y) / (e.ry + grow)
  return dx * dx + dy * dy <= 1
}
export const inRect = (x: number, y: number, r: Rect, grow = 0): boolean => x >= r.x - grow && x < r.x + r.w + grow && y >= r.y - grow && y < r.y + r.h + grow

/** A place on the stage as a place on the water's grid, in cells. */
export function toCells(x: number, y: number): { x: number; y: number } {
  return { x: ((x - POOL.x) / POOL.w) * GRID.w, y: ((y - POOL.y) / POOL.h) * GRID.h }
}

/** A place on the water's grid as a place on the stage. */
export function fromCells(x: number, y: number): { x: number; y: number } {
  return { x: POOL.x + (x / GRID.w) * POOL.w, y: POOL.y + (y / GRID.h) * POOL.h }
}

export function onWater(x: number, y: number): boolean {
  return x >= POOL.x && x < POOL.x + POOL.w && y >= POOL.y && y < POOL.y + POOL.h
}

/**
 * What a touch at this place of the stage lands on. A thing the game has set down is asked first, so a tap on a
 * held print, a hung print, the paper or a tool is never taken for what lies behind it.
 */
export function whatIsAt(x: number, y: number, laid: Laid): Spot {
  // The paws that hold a print lie on it and on the water: all of each drawn paw is the paw.
  if (laid.holding) for (let paw = 0; paw < HOLD_PAWS.length; paw++) if (inEllipse(x, y, { ...HOLD_PAWS[paw], rx: PAW_HIT.rx, ry: PAW_HIT.ry })) return { kind: 'cat', part: 'paw', paw }
  if (laid.held && inRect(x, y, HELD, 4)) return { kind: 'held' }
  for (let peg = 0; peg < PEGS.length; peg++) if (laid.hung[peg] && inRect(x, y, hungRect(peg), 4)) return { kind: 'print', peg }
  if (onPaper(x, y, laid.curl ?? 0)) return { kind: 'paper' }
  for (const tool of laid.tools) if (inRect(x, y, TOOL[tool])) return { kind: 'tool', tool }
  for (let pot = 0; pot < POT.ys.length; pot++) if (Math.hypot(x - POT.x, y - POT.ys[pot]) <= POT.r + POT.reach) return { kind: 'pot', pot }
  if (onWater(x, y)) {
    const cell = toCells(x, y)
    return { kind: 'water', x: cell.x, y: cell.y }
  }
  // The paws are touched where they rest now: on the rim, or at the sides of a print they hold.
  const paws = laid.holding ? HOLD_PAWS : CAT.paws
  for (let paw = 0; paw < paws.length; paw++) if (inEllipse(x, y, { x: paws[paw].x, y: paws[paw].y - PAW_HIT.up, rx: PAW_HIT.rx, ry: PAW_HIT.ry })) return { kind: 'cat', part: 'paw', paw }
  if (inEllipse(x, y, CAT.head)) return { kind: 'cat', part: 'head', paw: -1 }
  if (y < TRAY.y && inEllipse(x, y, CAT.body)) return { kind: 'cat', part: 'body', paw: -1 }
  if (Math.hypot(x - laid.birdX, y - (SILL.y - 20)) <= BIRD_REACH) return { kind: 'bird' }
  for (let cloth = 0; cloth < CLOTHS.length; cloth++) {
    const c = CLOTHS[cloth], top = lineY(c.x)
    if (Math.abs(x - c.x) <= c.w / 2 + CLOTH_REACH && y >= top - CLOTH_REACH && y <= top + c.h + CLOTH_REACH) return { kind: 'cloth', cloth }
  }
  if (inRect(x, y, MAT)) return { kind: 'mat' }
  if (x >= TRAY.x && x < TRAY.x + TRAY.w && y >= TRAY.y && y < TRAY.y + TRAY.h) return { kind: 'rim' }
  return { kind: 'room' }
}
