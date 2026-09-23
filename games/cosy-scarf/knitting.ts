import { ANIMALS, firstCold, MAX_ROWS, MAX_SCARVES, WIDTH, type AnimalKey, type GameState, type Row, type Scarf } from './state'

// The rules of the loom. Knitting adds a row at the scarf's free end;
// unravelling takes the newest row back, so nothing is ever lost that the
// child did not pull out themselves. Painting re-colours stitches (duplicate
// stitch) and, with the butterfly open, mirrors across the scarf's width.
// These functions mutate the one state object the controller owns.

export function knitRow(state: GameState, colour: number): boolean {
  if (state.loom.length >= MAX_ROWS) return false
  state.loom.push(new Array<number>(WIDTH).fill(colour))
  return true
}

export function unravelRow(state: GameState): Row | null {
  return state.loom.pop() ?? null
}

export function mirrorColumn(column: number): number {
  return WIDTH - 1 - column
}

/** Re-colour one stitch (and its mirror when the butterfly is open). Returns the stitches that changed. */
export function paintStitch(state: GameState, row: number, column: number, colour: number): [number, number][] {
  const target = state.loom[row]
  if (!target || column < 0 || column >= WIDTH) return []
  const changed: [number, number][] = []
  const columns = state.mirror ? [column, mirrorColumn(column)] : [column]
  for (const c of columns) {
    if (target[c] === colour) continue
    target[c] = colour
    changed.push([row, c])
  }
  return changed
}

export function canOffer(state: GameState, offerRows: number): boolean {
  return state.loom.length >= offerRows
}

export function isFull(state: GameState): boolean {
  return state.loom.length >= MAX_ROWS
}

/** Who gets the next scarf: the first cold animal, otherwise whoever wears the fewest (roster order breaks ties). */
export function chooseRecipient(state: GameState): AnimalKey {
  const cold = firstCold(state.scarves)
  if (cold) return cold
  let best: AnimalKey = ANIMALS[0]
  for (const animal of ANIMALS) if (state.scarves[animal].length < state.scarves[best].length) best = animal
  return best
}

/** When the hillside is all cosy, a finished scarf calls someone down to the loom. */
export function summonIfReady(state: GameState, offerRows: number): AnimalKey | null {
  if (state.atLoom !== null || !canOffer(state, offerRows)) return null
  state.atLoom = chooseRecipient(state)
  return state.atLoom
}

export type Gift = { to: AnimalKey; scarf: Scarf; next: AnimalKey | null; folded: Scarf | null }

/** Cast off and hand the loom's scarf to the animal at the loom. */
export function give(state: GameState, offerRows: number): Gift | null {
  const to = state.atLoom
  if (!to || !canOffer(state, offerRows)) return null
  const scarf = state.loom
  state.loom = []
  const worn = state.scarves[to]
  worn.push(scarf)
  const folded = worn.length > MAX_SCARVES ? (worn.shift() ?? null) : null
  const next = firstCold(state.scarves)
  state.atLoom = next
  return { to, scarf, next, folded }
}
