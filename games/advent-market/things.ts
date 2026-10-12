import { COLOURS, FATTEST, PARTS, bareWick, isBare, readCandle, sizeOf as candleSize } from './candle'

// The four things a child makes at the fair, as plain numbers: what a save
// keeps of each, how big it counts as and which colour it counts as (which is
// what the fair-goers' tastes go by), and how a saved one is read back. No
// clock, no drawing.

export type Craft = 'candle' | 'star' | 'wreath' | 'biscuit'
export const CRAFTS: readonly Craft[] = ['candle', 'star', 'wreath', 'biscuit']

/** What another stall left on a thing: nothing, a wax coat, a paper wrap, or a ring cut. `tint` is the wax's or the paper's colour. */
export const LEFT = { nothing: 0, wax: 1, wrap: 2, ring: 3 } as const
/** The mark a fair-goer's reaction left: none, blown out, chewed, crumpled or bitten. */
export const MARK = { none: 0, blown: 1, chewed: 2, crumpled: 3, bitten: 4 } as const

type Extra = {
  left: number
  tint: number
  mark: number
  /** At most one other thing on it, which carries none itself. */
  on: Thing | null
}

export type CandleThing = { craft: 'candle'; r: number[]; c: number[] } & Extra
/** A window star: its sheet (small, middling, large), its paper's colour, and how many of its points are folded. */
export type Star = { craft: 'star'; size: number; colour: number; points: number } & Extra
/** A wreath: which of the twelve places round the ring hold a twig (1 or 0), and the ribbon's colour. */
export type Wreath = { craft: 'wreath'; twigs: number[]; colour: number } & Extra
/** A biscuit: whether it is cut and with which tin, the icing's colour, and the icing as seven rows of seven cells, each row one number. */
export type Biscuit = { craft: 'biscuit'; cut: boolean; tin: number; colour: number; icing: number[] } & Extra
export type Thing = CandleThing | Star | Wreath | Biscuit

/** How many points a sheet has to fold, by its size: a larger sheet is more work. */
export const POINTS = [5, 7, 9] as const
/** Places round the ring that can take a twig. */
export const RING_PLACES = 12
/** The icing grid is this many cells each way. */
export const GRID = 7

const plain = (): Extra => ({ left: LEFT.nothing, tint: 0, mark: MARK.none, on: null })

/** The piece a bench starts with: a bare wick, an unfolded sheet, a bare ring, a sheet of dough. `size` and `colour` are what the bench had out last. */
export function fresh(craft: Craft, size = 1, colour = 0): Thing {
  switch (craft) {
    case 'candle':
      return { craft, ...bareWick(), ...plain() }
    case 'star':
      return { craft, size, colour, points: 0, ...plain() }
    case 'wreath':
      return { craft, twigs: new Array<number>(RING_PLACES).fill(0), colour, ...plain() }
    case 'biscuit':
      return { craft, cut: false, tin: size, colour, icing: new Array<number>(GRID).fill(0), ...plain() }
  }
}

export function twigCount(wreath: Wreath): number {
  return wreath.twigs.reduce((sum, twig) => sum + (twig ? 1 : 0), 0)
}

export function icedCells(biscuit: Biscuit): number {
  let cells = 0
  for (const row of biscuit.icing) for (let bit = 0; bit < GRID; bit++) if (row & (1 << bit)) cells += 1
  return cells
}

/** Whether a hand has made anything of it. A bench's untouched piece is no thing: it is not laid in the basket and not given away. */
export function isMade(thing: Thing): boolean {
  if (thing.on || thing.left !== LEFT.nothing) return true
  switch (thing.craft) {
    case 'candle':
      return !isBare(thing)
    case 'star':
      return thing.points > 0
    case 'wreath':
      return twigCount(thing) > 0
    case 'biscuit':
      return thing.cut
  }
}

/** Small, middling or large (0, 1, 2): a candle by its coats, a star by its sheet, a wreath by its twigs, a biscuit by its tin. */
export function sizeOf(thing: Thing): 0 | 1 | 2 {
  const three = (n: number): 0 | 1 | 2 => (n <= 0 ? 0 : n >= 2 ? 2 : 1)
  switch (thing.craft) {
    case 'candle':
      return candleSize(thing)
    case 'star':
      return three(thing.size)
    case 'wreath': {
      const twigs = twigCount(thing)
      return twigs <= 4 ? 0 : twigs <= 8 ? 1 : 2
    }
    case 'biscuit':
      return three(thing.tin)
  }
}

/** Gold, red or green (0, 1, 2): a candle by the wax there is most of, the others by their paper, ribbon and icing. */
export function colourOf(thing: Thing): number {
  if (thing.craft !== 'candle') return thing.colour
  const wax = [0, 0, 0]
  for (let i = 0; i < PARTS; i++) wax[thing.c[i]] += thing.r[i]
  return wax[1] > wax[0] && wax[1] >= wax[2] ? 1 : wax[2] > wax[0] ? 2 : 0
}

export function copyThing<T extends Thing>(thing: T): T {
  const on = thing.on ? copyThing(thing.on) : null
  switch (thing.craft) {
    case 'candle':
      return { ...thing, r: [...thing.r], c: [...thing.c], on }
    case 'wreath':
      return { ...thing, twigs: [...thing.twigs], on }
    case 'biscuit':
      return { ...thing, icing: [...thing.icing], on }
    default:
      return { ...thing, on }
  }
}

const whole = (value: unknown, lo: number, hi: number, otherwise: number): number =>
  typeof value === 'number' && Number.isInteger(value) && value >= lo && value <= hi ? value : otherwise

/**
 * A saved thing is untrusted. Each field is repaired by itself; what names no craft gives null. `craft` asks
 * for one craft, as a bench does, and anything else then gives null. A thing on another carries none itself.
 */
export function readThing(raw: unknown, craft: Craft | null = null, mayCarry = true): Thing | null {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return null
  const record = raw as Record<string, unknown>
  const named = CRAFTS.find((c) => c === record.craft)
  if (!named || (craft && named !== craft)) return null
  const colours = COLOURS.length - 1
  const extra: Extra = {
    left: whole(record.left, 0, 3, LEFT.nothing),
    tint: whole(record.tint, 0, colours, 0),
    mark: whole(record.mark, 0, 4, MARK.none),
    on: mayCarry ? readThing(record.on, null, false) : null,
  }
  // Nothing stands on a candle, and a thing never carries one of its own craft.
  if (named === 'candle' || extra.on?.craft === named) extra.on = null
  switch (named) {
    case 'candle':
      return { craft: named, ...readCandle(record), ...extra }
    case 'star': {
      const size = whole(record.size, 0, 2, 1)
      return { craft: named, size, colour: whole(record.colour, 0, colours, 0), points: whole(record.points, 0, POINTS[size], 0), ...extra }
    }
    case 'wreath': {
      const twigs = new Array<number>(RING_PLACES).fill(0)
      if (Array.isArray(record.twigs)) for (let i = 0; i < RING_PLACES; i++) twigs[i] = record.twigs[i] === 1 ? 1 : 0
      return { craft: named, twigs, colour: whole(record.colour, 0, colours, 0), ...extra }
    }
    case 'biscuit': {
      const icing = new Array<number>(GRID).fill(0)
      if (Array.isArray(record.icing)) for (let i = 0; i < GRID; i++) icing[i] = whole(record.icing[i], 0, (1 << GRID) - 1, 0)
      return { craft: named, cut: record.cut === true, tin: whole(record.tin, 0, 2, 1), colour: whole(record.colour, 0, colours, 0), icing, ...extra }
    }
  }
}

/** A candle at its fattest in one wax: what a test and a still start from. */
export function fatCandle(colour = 0): CandleThing {
  return { craft: 'candle', r: new Array<number>(PARTS).fill(FATTEST), c: new Array<number>(PARTS).fill(colour), ...plain() }
}
