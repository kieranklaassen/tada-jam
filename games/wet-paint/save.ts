import { POTS, WATER } from './colours'
import { LADDER } from './config'
import { PEGS, TOOL_IDS, type ToolId } from './layout'
import { pack, unpack } from './marble'
import { deserialize as readPlace, isReadable, isRecord, serialize as writePlace, type GameState } from './state'
import { CELLS, GRID } from './tray'

// What the game saves on top of state.ts: every field the sheet in ART.md
// lists. Each field is repaired by itself, so a damaged water still keeps the
// pot, the prints and the place, and the other way round. A record from the
// toy, which had the water and the pot and nothing else, reads as a game
// with the stick in hand and no prints.

/** What the hand holds: the dipped stick, or a tool. */
export type InHand = 'finger' | ToolId

/** A print is the water at one cell for every four each way. */
export const PRINT_BY = 4
export const PRINT_GRID = { w: GRID.w / PRINT_BY, h: GRID.h / PRINT_BY } as const
export const PRINT_CELLS = PRINT_GRID.w * PRINT_GRID.h
/** The most prints that are kept. */
export const MOST_PRINTS = PEGS.length

export type Print = {
  /** The picture: 52 by 36 cells of the same eight values, as 936 characters. */
  cells: string
  /** The peg it hangs on, or null while the cat holds it up. */
  peg: number | null
}

export type Save = GameState & {
  /** The water: 208 by 144 cells of eight values, three bits to a cell, as 14,976 characters. Saved at rest. */
  tray: string
  /** The pot the stick was last dipped in: 0, 1 or 2. */
  pot: number
  /** What the hand holds. */
  tool: InHand
  /** The tools that have touched this tray's water. */
  used: ToolId[]
  /** The last four prints, oldest first. */
  prints: Print[]
  /** The tools whose first showing has started. */
  shown: ToolId[]
}

/** Plain water, as text. */
export const PLAIN = pack(new Uint8Array(CELLS))

/** The tools that lie on the table at a place of the designed order: every tool up to the one the place is named for. */
export function toolsAt(position: string): ToolId[] {
  const at = LADDER.indexOf(position)
  return TOOL_IDS.filter((tool) => LADDER.indexOf(tool) <= at)
}

const isTool = (value: unknown): value is ToolId => typeof value === 'string' && (TOOL_IDS as readonly string[]).includes(value)

/** The lowest peg nothing hangs on, or -1. */
export function freePeg(prints: readonly Print[]): number {
  for (let peg = 0; peg < PEGS.length; peg++) if (!prints.some((print) => print.peg === peg)) return peg
  return -1
}

function readPrints(raw: unknown): Print[] {
  if (!Array.isArray(raw)) return []
  const prints: Print[] = []
  for (const item of raw) {
    if (!isRecord(item) || !unpack(item.cells, PRINT_CELLS)) continue
    const peg = item.peg
    prints.push({ cells: item.cells as string, peg: typeof peg === 'number' && Number.isInteger(peg) && peg >= 0 && peg < PEGS.length ? peg : null })
  }
  const kept = prints.slice(-MOST_PRINTS)
  // Only the newest print can be in the cat's paws, and no two hang on one peg: any other is hung on the lowest free peg.
  const taken = new Set<number>()
  kept.forEach((print, index) => {
    if (print.peg !== null && taken.has(print.peg)) print.peg = null
    if (print.peg !== null) taken.add(print.peg)
    else if (index < kept.length - 1) print.peg = -1
  })
  for (const print of kept) {
    if (print.peg !== -1) continue
    print.peg = null
    print.peg = freePeg(kept)
  }
  return kept
}

export function deserialize(raw: unknown, childAge: number | null = null): Save {
  const place = readPlace(raw, childAge)
  if (!isReadable(raw)) return { ...place, tray: PLAIN, pot: 0, tool: 'finger', used: [], prints: [], shown: [] }
  const pot = raw.pot, onTable = toolsAt(place.position)
  const tray = unpack(raw.tray, CELLS) ? (raw.tray as string) : PLAIN
  const used: ToolId[] = []
  if (Array.isArray(raw.used)) for (const id of raw.used) if (isTool(id) && onTable.includes(id) && !used.includes(id)) used.push(id)
  const shown: ToolId[] = []
  if (Array.isArray(raw.shown)) for (const id of raw.shown) if (isTool(id) && !shown.includes(id)) shown.push(id)
  // The water says whether the cycle on screen is over: a finished cycle is plain water that nothing has touched.
  const finished = place.finished && tray === PLAIN
  return {
    ...place,
    finished,
    tray,
    pot: typeof pot === 'number' && Number.isInteger(pot) && pot >= 0 && pot < POTS.length ? pot : 0,
    tool: isTool(raw.tool) && onTable.includes(raw.tool) ? raw.tool : 'finger',
    used: finished ? [] : used,
    prints: readPrints(raw.prints),
    shown,
  }
}

export function serialize(save: Save): Save {
  return {
    ...writePlace(save),
    tray: save.tray,
    pot: save.pot,
    tool: save.tool,
    used: [...save.used],
    prints: save.prints.map((print) => ({ cells: print.cells, peg: print.peg })),
    shown: [...save.shown],
  }
}

/** Whether a packed grid holds no colour. */
export function isBlank(cells: string): boolean {
  const grid = unpack(cells, cells.length * 2)
  return !grid || grid.every((cell) => cell === WATER)
}
