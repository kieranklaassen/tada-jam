// Saved state for Cosy Scarf: the scarf on the loom, every scarf each animal
// wears, who is standing by the loom, and whether the butterfly (mirror) is
// open. Small plain JSON, versioned, and read defensively: anything odd is
// dropped row by row instead of throwing, so an old or corrupt save still
// opens with every valid stitch in place.

export const ANIMALS = ['bunny', 'penguin', 'fox', 'bear'] as const
export type AnimalKey = (typeof ANIMALS)[number]

/** Stitches across one row of a scarf. */
export const WIDTH = 5
/** The loom's rod is only so tall. */
export const MAX_ROWS = 18
/** Scarves stack; beyond this the oldest one is folded away. */
export const MAX_SCARVES = 3
/** Yarn colours that exist; the basket shows a subset by age. */
export const COLOURS = 6

/** One row: a colour index per stitch. */
export type Row = number[]
export type Scarf = Row[]

export type GameState = {
  v: 1
  loom: Scarf
  mirror: boolean
  scarves: Record<AnimalKey, Scarf[]>
  atLoom: AnimalKey | null
}

/** How many yarn balls sit in the basket. Age is a dial for defaults, never a gate. */
export function ballsForAge(age: number | null): number {
  if (age === null) return 5
  if (age <= 5) return 4
  if (age <= 7) return 5
  return 6
}

/** How long a scarf is before the loom offers it. The child may always knit on. */
export function offerRowsForAge(age: number | null): number {
  if (age === null) return 10
  if (age <= 5) return 8
  if (age <= 7) return 10
  return 12
}

export function emptyScarves(): Record<AnimalKey, Scarf[]> {
  return { bunny: [], penguin: [], fox: [], bear: [] }
}

export function initialState(): GameState {
  return { v: 1, loom: [], mirror: false, scarves: emptyScarves(), atLoom: 'bunny' }
}

export function isAnimal(value: unknown): value is AnimalKey {
  return typeof value === 'string' && (ANIMALS as readonly string[]).includes(value)
}

function readRow(value: unknown): Row | null {
  if (!Array.isArray(value) || value.length !== WIDTH) return null
  const row: Row = []
  for (const stitch of value) {
    if (typeof stitch !== 'number' || !Number.isInteger(stitch) || stitch < 0 || stitch >= COLOURS) return null
    row.push(stitch)
  }
  return row
}

function readScarf(value: unknown): Scarf {
  if (!Array.isArray(value)) return []
  const scarf: Scarf = []
  for (const candidate of value) {
    const row = readRow(candidate)
    if (row) scarf.push(row)
    if (scarf.length >= MAX_ROWS) break
  }
  return scarf
}

/** The first animal with no scarf yet, in roster order. */
export function firstCold(scarves: Record<AnimalKey, Scarf[]>): AnimalKey | null {
  return ANIMALS.find((animal) => scarves[animal].length === 0) ?? null
}

export function deserialize(saved: unknown): GameState {
  const state = initialState()
  if (!saved || typeof saved !== 'object') return state
  const raw = saved as Record<string, unknown>
  state.loom = readScarf(raw.loom)
  state.mirror = raw.mirror === true
  const scarves = raw.scarves && typeof raw.scarves === 'object' ? (raw.scarves as Record<string, unknown>) : {}
  for (const animal of ANIMALS) {
    const list = Array.isArray(scarves[animal]) ? (scarves[animal] as unknown[]) : []
    state.scarves[animal] = list
      .map(readScarf)
      .filter((scarf) => scarf.length > 0)
      .slice(-MAX_SCARVES)
  }
  const cold = firstCold(state.scarves)
  state.atLoom = raw.atLoom === null ? cold : isAnimal(raw.atLoom) ? raw.atLoom : cold
  // A cold animal always waits at the loom; only a fully cosy hillside may leave it empty.
  if (state.atLoom === null && cold) state.atLoom = cold
  return state
}
