import type { Kind, Support } from './kinds'

// The grid of ART.md as numbers: seven things by five supports. A cell says
// how the thing lies there and how it comes to rest. What it sounds like is
// in voices.ts, keyed by the same two names. Nothing here draws.

/** How a thing is drawn in a cell. Each kind has a few forms of its own; the view has one sprite for each. */
export type Form =
  // leaf
  | 'flat' | 'sag' | 'ramp' | 'tent' | 'drape'
  // acorn cap
  | 'up' | 'tilted' | 'down' | 'hung'
  // pebble, bark, moss: one body, set by tilt, sink and squash
  | 'whole' | 'heaped' | 'draped' | 'pressed' | 'tipped' | 'slung'
  // twig and feather
  | 'upright' | 'across' | 'along' | 'lying' | 'nestled' | 'quill' | 'flag' | 'sail'

/**
 * What a cell does after the thing has touched down, until it lies still. The motion is made of turns: each end of
 * a swing is one. It dies away over its turns and stops with the last, so a cell that is heard at each turn sounds
 * for exactly as long as it is seen to move.
 */
export type Rock = {
  /**
   * What moves: a tilt about its underside, a swing from its top, a roll along its support, a spin on its rim
   * (it stands on one edge of its rim after the other, as a coin does), a stream (a flag that flies out level
   * and falls to hang), or a tip (a see-saw whose far end comes down to the ground).
   */
  axis: 'tilt' | 'swing' | 'roll' | 'spin' | 'stream' | 'tip'
  /** How far the first swing goes: degrees for a tilt, a swing or a spin, stage units for a roll. A stream and a tip start from level, whatever this says. */
  amp: number
  /** Swings a second at the start. */
  hz: number
  /** How many turns it makes before it is still. */
  turns: number
  /** How much faster it swings by the end, as a coin does when it settles. 0 keeps the pace. */
  quicken: number
  /** Whether each turn is heard as a knock. */
  heard: boolean
  /** Whether its stop is heard as a sound of its own: the bowl's closing tok, the rolling pin's tick. */
  stop: boolean
}

/** How long a rock lasts, in seconds. */
export function rockSeconds(r: Rock): number {
  // The pace rises evenly from hz to hz * (1 + quicken) over the turns. A see-saw makes half a turn: its far end comes down once.
  const turns = r.axis === 'tip' ? 0.5 : r.turns
  return r.quicken > 0 ? (turns * Math.log(1 + r.quicken)) / (2 * r.hz * r.quicken) : turns / (2 * r.hz)
}

export type Cell = {
  /** What the thing is here, in the game's own words. Never shown. */
  is: string
  form: Form
  /** The room it takes at rest, in stage units. */
  w: number
  h: number
  /** How far it sinks into what it rests on. */
  sink: number
  /** How it leans at rest, in degrees. A cell that leans to a side leans to the side it was set down on. */
  tilt: number
  /** Whether the lean follows the side it was set down on. */
  sided: boolean
  /** How far along its support it lies, as a share of its own width, to the side it was set down on. */
  shift: number
  /** How many times it hops after touching down. */
  bounces: number
  rock: Rock | null
  /** Dew in an acorn cap, or its light. */
  extra: 'water' | 'glow' | null
}

const still = null
const rock = (axis: Rock['axis'], amp: number, hz: number, turns: number, heard: boolean, more: Partial<Rock> = {}): Rock => ({ axis, amp, hz, turns, quicken: 0, heard, stop: false, ...more })

type Row = Record<Support, Cell>
const cell = (is: string, form: Form, w: number, h: number, sink: number, tilt: number, bounces: number, r: Rock | null, more: Partial<Cell> = {}): Cell => ({
  is, form, w, h, sink, tilt, sided: false, shift: 0, bounces, rock: r, extra: null, ...more,
})

export const CELLS: Record<Kind, Row> = {
  leaf: {
    ground: cell('rug', 'flat', 136, 14, 0, 0, 0, still),
    moss: cell('bed', 'sag', 128, 16, 14, 0, 1, still),
    pebble: cell('slide', 'ramp', 124, 54, 0, 24, 0, still, { sided: true }),
    twig: cell('roof', 'tent', 132, 34, 0, 0, 0, rock('tilt', 5, 4, 1, true)),
    bark: cell('tablecloth', 'drape', 140, 18, 2, 0, 0, still),
  },
  cap: {
    ground: cell('bath', 'up', 52, 34, 3, 0, 0, still, { extra: 'water' }),
    moss: cell('cradle', 'tilted', 52, 30, 12, 14, 0, rock('tilt', 16, 1.7, 5, true), { sided: true }),
    pebble: cell('lamp', 'down', 52, 30, 2, 0, 0, still, { extra: 'glow' }),
    twig: cell('bell', 'hung', 52, 12, 0, 0, 0, rock('swing', 26, 1.5, 6, true)),
    bark: cell('bowl', 'up', 52, 32, 0, 0, 0, rock('spin', 22, 2.4, 11, true, { quicken: 3, stop: true })),
  },
  pebble: {
    ground: cell('stool', 'whole', 64, 40, 4, 0, 0, still),
    moss: cell('pillow', 'whole', 64, 40, 20, 6, 0, still),
    pebble: cell('cairn', 'whole', 64, 42, 2, -4, 0, rock('tilt', 9, 3.2, 3, true)),
    twig: cell('knocker', 'whole', 64, 44, 0, 0, 0, rock('tilt', 9, 2.1, 4, true)),
    bark: cell('ball', 'whole', 64, 43, 1, 0, 0, rock('roll', 34, 1.3, 3, true)),
  },
  bark: {
    ground: cell('bench', 'whole', 156, 24, 2, 0, 0, still),
    moss: cell('sofa', 'whole', 156, 20, 12, 0, 2, still),
    pebble: cell('seesaw', 'tipped', 156, 30, 0, 0, 0, rock('tip', 0, 0.7, 1, true), { sided: true }),
    twig: cell('table', 'whole', 156, 22, 0, 0, 0, still),
    bark: cell('stairs', 'whole', 156, 23, 0, 0, 0, still, { shift: 0.5 }),
  },
  twig: {
    ground: cell('post', 'upright', 16, 108, 8, 0, 0, still),
    moss: cell('mast', 'upright', 16, 108, 12, 5, 0, rock('tilt', 14, 6.5, 5, false), { sided: true }),
    pebble: cell('drum', 'across', 96, 26, 0, 16, 3, still, { sided: true }),
    twig: cell('perch', 'across', 116, 12, 0, 0, 0, still),
    bark: cell('pin', 'along', 116, 15, 0, 0, 0, rock('roll', 22, 1.1, 2, true, { stop: true })),
  },
  moss: {
    ground: cell('cushion', 'whole', 100, 44, 3, 0, 0, still),
    moss: cell('mattress', 'heaped', 104, 40, 10, 0, 1, still),
    pebble: cell('tuffet', 'draped', 84, 32, 14, 0, 0, still),
    twig: cell('thatch', 'draped', 112, 36, 6, 0, 0, still),
    bark: cell('seat', 'pressed', 110, 34, 0, 0, 0, still),
  },
  feather: {
    ground: cell('broom', 'lying', 112, 12, 0, 0, 0, still),
    moss: cell('quilt', 'nestled', 104, 14, 12, -6, 0, still),
    pebble: cell('tickler', 'quill', 28, 96, 6, 12, 0, rock('tilt', 10, 9, 5, false), { sided: true }),
    twig: cell('flag', 'flag', 34, 10, 0, 0, 0, rock('stream', 0, 1.1, 1, true)),
    bark: cell('sail', 'sail', 40, 104, 0, -8, 0, rock('tilt', 6, 2.2, 1, false)),
  },
}

/** What makes two cells look different: how the thing is drawn and how it lies. */
export function lieOf(c: Cell): string {
  return [c.form, c.w, c.h, c.sink, c.tilt, c.shift, c.extra ?? '-'].join(' ')
}

/** What makes two cells move differently when the thing touches down. */
export function settleOf(c: Cell): string {
  return [c.bounces, c.rock ? [c.rock.axis, c.rock.amp, c.rock.hz, c.rock.turns, c.rock.heard, c.rock.stop].join('/') : 'still'].join(' ')
}
