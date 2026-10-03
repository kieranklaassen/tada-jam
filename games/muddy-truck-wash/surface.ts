// What is on the vehicle: a coarse grid of patches, each holding one thing.
// The whole wash is this table. Each tool does only its own job, the order of
// a wash follows from what the materials do, and no tool is ever refused.
// Pure: no renderer, no clock, no randomness.

export const GRID_W = 12
export const GRID_H = 7
export const CELLS = GRID_W * GRID_H

/**
 * One patch. The characters are what a save stores:
 * `.` no body here, `c` dried mud, `s` soft mud, `b` brown foam (mud lifted
 * into suds), `f` white foam, `w` wet paint, `d` dull paint, `p` shiny paint.
 */
export type Patch = '.' | 'c' | 's' | 'b' | 'f' | 'w' | 'd' | 'p'
export const PATCHES: readonly Patch[] = ['.', 'c', 's', 'b', 'f', 'w', 'd', 'p']

export type Tool = 'sponge' | 'hose' | 'cloth'
/** What the finger holds: a tool, or nothing. */
export type Hand = Tool | 'finger'

/** What one touch of `hand` turns each patch into. A patch that maps to itself still answers, in sound and motion. */
export const TURNS: Readonly<Record<Hand, Readonly<Record<Patch, Patch>>>> = {
  // Soap lifts soft mud into foam, which stays on the vehicle. Dried mud does not lift until it has been wetted.
  sponge: { '.': '.', c: 'c', s: 'b', b: 'b', f: 'f', w: 'f', d: 'f', p: 'f' },
  // Water carries foam away and only softens dried mud. Soft mud clings.
  hose: { '.': '.', c: 's', s: 's', b: 'w', f: 'w', w: 'w', d: 'w', p: 'w' },
  // The cloth dries and shines. On mud and foam it changes nothing where it is; see `SPREADS`.
  cloth: { '.': '.', c: 'c', s: 's', b: 'b', f: 'f', w: 'p', d: 'p', p: 'p' },
  // A bare finger leaves a print on a shine and changes nothing else.
  finger: { '.': '.', c: 'c', s: 's', b: 'b', f: 'f', w: 'w', d: 'd', p: 'd' },
}

/** What the cloth drags onto the clean paint around it: wet mud smears, foam is pushed along. Dried mud does not spread. */
const SPREADS: readonly Patch[] = ['s', 'b', 'f']
const CLEAN: readonly Patch[] = ['w', 'd', 'p']

export type Surface = Patch[]

export function cellAt(col: number, row: number): number {
  return row * GRID_W + col
}

/** The patches one dab covers: the one under the finger and the four beside it. Rows count up from the ground. */
export function dabCells(col: number, row: number): number[] {
  const cells: number[] = []
  for (const [dc, dr] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
    const c = col + dc, r = row + dr
    if (c >= 0 && c < GRID_W && r >= 0 && r < GRID_H) cells.push(cellAt(c, r))
  }
  return cells
}

export type Dab = {
  /** The surface after the dab: a new array, or the same one when nothing changed. */
  surface: Surface
  /** What was under the dab before it, one entry per covered patch of body, the finger's own patch first. */
  met: Patch[]
  /** The covered patches that changed. */
  changed: number[]
}

/** One touch of `hand` at a patch. Off the body it meets nothing. */
export function dab(surface: Surface, hand: Hand, col: number, row: number): Dab {
  const cells = dabCells(col, row).filter((cell) => surface[cell] !== '.')
  const met = cells.map((cell) => surface[cell])
  const next = surface.slice()
  for (const cell of cells) next[cell] = TURNS[hand][surface[cell]]
  if (hand === 'cloth') {
    // The first spreading thing the cloth meets is what it drags over the clean paint under it.
    const dragged = met.find((patch) => SPREADS.includes(patch))
    if (dragged) for (const cell of cells) if (CLEAN.includes(surface[cell])) next[cell] = dragged
  }
  const changed = cells.filter((cell) => next[cell] !== surface[cell])
  return { surface: changed.length ? next : surface, met, changed }
}

export type Tally = Record<Patch, number> & { body: number; mud: number; foam: number }

export function tally(surface: Surface): Tally {
  const t: Tally = { '.': 0, c: 0, s: 0, b: 0, f: 0, w: 0, d: 0, p: 0, body: 0, mud: 0, foam: 0 }
  for (const patch of surface) t[patch] += 1
  t.body = CELLS - t['.']
  t.mud = t.c + t.s
  t.foam = t.b + t.f
  return t
}

/** Every patch of body is shiny. */
export function allShiny(surface: Surface): boolean {
  const t = tally(surface)
  return t.body > 0 && t.p === t.body
}

/** The patches each tool has work on: what it would take forward in a wash. */
export const WORK: Readonly<Record<Tool, readonly Patch[]>> = { hose: ['c', 'b', 'f'], sponge: ['s'], cloth: ['w', 'd'] }

/**
 * The tool a wash would take up next, or null when the vehicle is all shiny.
 * Mud comes before foam and foam before drying: dried mud wants the hose,
 * soft mud the sponge, foam the hose again, and clean paint the cloth.
 */
export function nextTool(surface: Surface): Tool | null {
  const has = (patches: readonly Patch[]): boolean => surface.some((patch) => patches.includes(patch))
  if (has(['c'])) return 'hose'
  if (has(['s'])) return 'sponge'
  if (has(['b', 'f'])) return 'hose'
  if (has(['w', 'd'])) return 'cloth'
  return null
}

export function encode(surface: Surface): string {
  return surface.join('')
}

/** Reads a saved grid. Anything that is not a whole grid of known patches gives null. */
export function decode(raw: unknown): Surface | null {
  if (typeof raw !== 'string' || raw.length !== CELLS) return null
  const surface = raw.split('')
  return surface.every((patch) => (PATCHES as readonly string[]).includes(patch)) ? (surface as Surface) : null
}
