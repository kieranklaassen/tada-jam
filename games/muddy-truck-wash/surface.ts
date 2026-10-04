// What is on the vehicle: a coarse grid of patches, each holding one thing.
// The whole wash is this table. Each tool does only its own job, the order of
// a wash follows from what the materials do, and no tool is ever refused.
// Pure: no renderer, no clock, no randomness.

export const GRID_W = 12
export const GRID_H = 7
export const CELLS = GRID_W * GRID_H

/**
 * One patch. The characters are what a save stores:
 * `.` no body here, `c` dried mud, `s` soft mud, `m` a smear (thin mud a
 * cloth has laid), `b` brown foam (mud lifted into suds), `f` white foam,
 * `w` wet paint, `d` dull paint, `p` shiny paint.
 *
 * A smear is mud to every tool but the cloth: the sponge lifts it into foam
 * and the hose leaves it clinging, as with soft mud. The cloth picks nothing
 * up from it, so a smear can never be spread further.
 */
export type Patch = '.' | 'c' | 's' | 'm' | 'b' | 'f' | 'w' | 'd' | 'p'
export const PATCHES: readonly Patch[] = ['.', 'c', 's', 'm', 'b', 'f', 'w', 'd', 'p']

export type Tool = 'sponge' | 'hose' | 'cloth'
/** What the finger holds: a tool, or nothing. */
export type Hand = Tool | 'finger'

/** What one touch of `hand` turns each patch into. A patch that maps to itself still answers, in sound and motion. */
export const TURNS: Readonly<Record<Hand, Readonly<Record<Patch, Patch>>>> = {
  // Soap lifts soft mud into foam, which stays on the vehicle. Dried mud does not lift until it has been wetted.
  sponge: { '.': '.', c: 'c', s: 'b', m: 'b', b: 'b', f: 'f', w: 'f', d: 'f', p: 'f' },
  // Water carries foam away and only softens dried mud. Soft mud clings.
  hose: { '.': '.', c: 's', s: 's', m: 'm', b: 'w', f: 'w', w: 'w', d: 'w', p: 'w' },
  // The cloth dries and shines. On mud and foam it changes nothing where it is; what it carries on from them is in `dab`.
  cloth: { '.': '.', c: 'c', s: 's', m: 'm', b: 'b', f: 'f', w: 'p', d: 'p', p: 'p' },
  // A bare finger leaves a print on a shine and changes nothing else.
  finger: { '.': '.', c: 'c', s: 's', m: 'm', b: 'b', f: 'f', w: 'w', d: 'd', p: 'd' },
}

const CLEAN: readonly Patch[] = ['w', 'd', 'p']
const FOAM: readonly Patch[] = ['b', 'f']
/** A cloth that has been on soft mud smears the next patches it moves onto, this many at most, and is then clean. */
export const SMEAR_PATCHES = 3

/**
 * What a cloth has on it from the patch it was last on.
 * - From soft mud it carries mud (`patch` is `m`): each of the next `left`
 *   patches it moves onto gets a smear if it is clean, and then the cloth is
 *   clean, whether it found clean paint or not.
 * - From foam it pushes that foam along (`patch` is the foam): when it moves
 *   onto clean paint the foam moves there with it, and the patch it came from
 *   is left wet. There is never more foam than before.
 * `at` is the patch the cloth was last on, so a second dab on the same patch
 * changes nothing.
 */
export type Carried = { patch: Patch; at: number; left: number }

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
  /** What the cloth carries on to its next dab, or null. Always null for the other hands. */
  carries: Carried | null
}

/**
 * One touch of `hand` at a patch. Off the body it meets nothing.
 *
 * The cloth alone carries anything from one dab to the next (see `Carried`).
 * It picks mud up only from soft mud, never from a smear it or an earlier
 * wipe has laid, and it only moves foam, so however long or often a cloth is
 * rubbed over a vehicle the mud on it grows by a few patches beside each
 * patch of soft mud and no more, and the foam not at all.
 */
export function dab(surface: Surface, hand: Hand, col: number, row: number, carried: Carried | null = null): Dab {
  const cells = dabCells(col, row).filter((cell) => surface[cell] !== '.')
  const met = cells.map((cell) => surface[cell])
  const next = surface.slice()
  for (const cell of cells) next[cell] = TURNS[hand][surface[cell]]
  let carries: Carried | null = null
  const under = cellAt(col, row)
  if (hand === 'cloth' && cells.includes(under)) {
    const here = surface[under]
    if (carried && carried.at === under) carries = carried
    else if (here === 's') carries = { patch: 'm', at: under, left: SMEAR_PATCHES }
    else if (FOAM.includes(here)) carries = { patch: here, at: under, left: 1 }
    else if (carried && carried.patch === 'm') {
      // A muddy cloth moved onto another patch: a smear if the paint is clean, and one patch nearer to being clean itself.
      if (CLEAN.includes(here)) next[under] = 'm'
      carries = carried.left > 1 ? { patch: 'm', at: under, left: carried.left - 1 } : null
    } else if (carried && CLEAN.includes(here) && surface[carried.at] === carried.patch) {
      // Foam pushed onto clean paint: it is here now, and where it was is wet.
      next[under] = carried.patch
      next[carried.at] = 'w'
      carries = { patch: carried.patch, at: under, left: 1 }
    }
  }
  // Every patch that changed: the ones under the dab, and the one a pushed foam left behind.
  const changed: number[] = []
  for (let cell = 0; cell < next.length; cell++) if (next[cell] !== surface[cell]) changed.push(cell)
  return { surface: changed.length ? next : surface, met, changed, carries }
}

/** Counts of each patch, and of body, of mud (dried, soft and smeared) and of foam. */
export type Tally = Record<Patch, number> & { body: number; mud: number; foam: number }

export function tally(surface: Surface): Tally {
  const t: Tally = { '.': 0, c: 0, s: 0, m: 0, b: 0, f: 0, w: 0, d: 0, p: 0, body: 0, mud: 0, foam: 0 }
  for (const patch of surface) t[patch] += 1
  t.body = CELLS - t['.']
  t.mud = t.c + t.s + t.m
  t.foam = t.b + t.f
  return t
}

/** Every patch of body is shiny. */
export function allShiny(surface: Surface): boolean {
  const t = tally(surface)
  return t.body > 0 && t.p === t.body
}

/** The patches each tool has work on: what it would take forward in a wash. */
export const WORK: Readonly<Record<Tool, readonly Patch[]>> = { hose: ['c', 'b', 'f'], sponge: ['s', 'm'], cloth: ['w', 'd'] }

/**
 * The tool a wash would take up next, or null when the vehicle is all shiny.
 * Mud comes before foam and foam before drying: dried mud wants the hose,
 * soft mud the sponge, foam the hose again, and clean paint the cloth.
 * The game never shows this to the child: it is the designed order written
 * down once, and the tests wash a vehicle by it.
 */
export function nextTool(surface: Surface): Tool | null {
  const has = (patches: readonly Patch[]): boolean => surface.some((patch) => patches.includes(patch))
  if (has(['c'])) return 'hose'
  if (has(['s', 'm'])) return 'sponge'
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
