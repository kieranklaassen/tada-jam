import { COLS, ROWS, isSandText } from './field'
import { type GameState, deserialize, isReadable, serialize } from './state'
import type { SunHome } from './sun'
import { type Bucket, type Shell, type Wood, firstThings, readThings, writeThings } from './things'

// The saved beach: the template's fields (state.ts) and the game's own, each
// repaired by itself, so an old or damaged slot still opens as a beach.
// The sand and where its grooves began, the sun, and where the bucket, the
// shells and the driftwood lie. The water and the folk are not saved: they
// are where the sand and the sun put them.

/** How many grooves the water remembers the order of. */
export const MOST_GROOVES = 24

export type Kingdom = GameState & {
  /** The beach as text, two marks a cell (field.ts); empty for a smooth beach. */
  sand: string
  /** The cells where the grooves began, oldest first. */
  dug: number[]
  /** Where the sun is: up by day, down at evening. */
  sun: SunHome
  bucket: Bucket
  shells: Shell[]
  wood: Wood[]
}

/** What `ctx.storage` handed back, as a beach. Anything unreadable gives a first visit, with the bucket as the age has it. */
export function deserializeKingdom(raw: unknown, childAge: number | null): Kingdom {
  const state = deserialize(raw, childAge)
  if (!isReadable(raw)) return { ...state, finished: false, sand: '', dug: [], sun: 'up', ...firstThings(childAge) }
  const sand = isSandText(raw.sand) ? raw.sand : ''
  const cells = COLS * ROWS
  // The order of the grooves means nothing without the sand they were dug in.
  const dug = sand !== '' && Array.isArray(raw.dug) ? raw.dug.filter((cell): cell is number => Number.isInteger(cell) && cell >= 0 && cell < cells).slice(-MOST_GROOVES) : []
  // The sun says whether the day on screen is over, so it wins over the stored mark: the two never disagree.
  const sun: SunHome = raw.sun === 'down' ? 'down' : raw.sun === 'up' ? 'up' : state.finished ? 'down' : 'up'
  return { ...state, finished: sun === 'down', sand, dug, sun, ...readThings(raw, childAge) }
}

export function serializeKingdom(state: Kingdom): Kingdom {
  return { ...serialize({ ...state, finished: state.sun === 'down' }), sand: state.sand, dug: state.dug.slice(-MOST_GROOVES), sun: state.sun, ...writeThings(state) }
}
