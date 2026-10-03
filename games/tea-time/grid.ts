// The object-by-action grid, as data: six things on the table and five things
// a finger can do, and for each pair what happens, the motion the view plays
// and the sound it makes. It is the grid of the design sheet (ART.md) written
// down so that the view, the sounds and the tests read one list.
//
// Every cell is filled: there is no wrong use, only a use with its own answer.
// The ids are names for the view and the sounds to hang their work on. None is
// shown to the child, and no cell's motion or sound is shared with another.

export const OBJECTS = ['cup', 'saucer', 'spoon', 'pot', 'sponge', 'guest'] as const
export type GridObject = (typeof OBJECTS)[number]

/** A tap, a press that is held (the pot pours there), a carry across the cloth, a drag that ends on another thing, and a rub. */
export const ACTIONS = ['tap', 'hold', 'carry', 'put', 'rub'] as const
export type Action = (typeof ACTIONS)[number]

/** One cell: what happens, the motion that shows it and the sound that goes with it. */
export type Cell = { result: string; motion: string; voice: string }

const cell = (result: string, motion: string, voice: string): Cell => ({ result, motion, voice })

export const GRID: Record<GridObject, Record<Action, Cell>> = {
  cup: {
    // It rings lower the fuller it is, and one drop falls in from the pot.
    tap: cell('ring-and-drop', 'tea-ripples', 'small-bell'),
    // The tea climbs the white inside; past the rim it runs into the saucer.
    hold: cell('fill', 'tea-climbs', 'filling-note'),
    // A brimful cup leaves a dotted trail.
    carry: cell('slide-and-slosh', 'cup-slides', 'ceramic-hiss'),
    put: cell('seat-or-tip-or-hat', 'cup-sets-down', 'clink-or-glug'),
    rub: cell('whirlpool', 'cup-spins-on-foot', 'low-hum'),
  },
  saucer: {
    tap: cell('coin-spin', 'saucer-spins-down', 'coin-rattle'),
    // A shallow pool spreads to the edge, then spills.
    hold: cell('shallow-pool', 'pool-spreads', 'flat-patter'),
    // Fast and far, like a puck.
    carry: cell('skim-and-wobble', 'saucer-skims', 'skim-swish'),
    put: cell('stack-or-hop-on-or-flat-hat', 'saucer-claps-down', 'stack-clap'),
    rub: cell('polish', 'saucer-flashes', 'clean-squeak'),
  },
  spoon: {
    tap: cell('flip', 'spoon-flips', 'tinkle'),
    // The stream hits the bowl of the spoon and fans out in a sheet.
    hold: cell('fan-out', 'stream-fans', 'sheet-hiss'),
    carry: cell('drag-and-swing', 'spoon-swings-behind', 'thin-scrape'),
    put: cell('stir-or-rest-or-nose-balance', 'spoon-settles', 'ting-or-click'),
    rub: cell('rattle-in-place', 'spoon-jitters', 'table-rattle'),
  },
  pot: {
    tap: cell('lid-hop-and-steam', 'lid-hops', 'steam-toot'),
    // It tips where it stands and pours a puddle on the cloth.
    hold: cell('puddle-where-it-stands', 'pot-tips-in-place', 'cloth-patter'),
    // Heavy, and it stays where it is put.
    carry: cell('move-and-stay', 'pot-lumbers', 'inside-slosh'),
    put: cell('drink-from-spout-or-empty-bowl', 'pot-leans-over', 'gurgle'),
    // The painted fish on its side swims once round the belly.
    rub: cell('fish-swims-round', 'fish-circles-belly', 'water-trill'),
  },
  sponge: {
    // It squirts a drop if it holds tea.
    tap: cell('squelch-and-squirt', 'sponge-squashes', 'squelch'),
    hold: cell('swell-and-leak', 'sponge-swells', 'soft-slurp'),
    // A damp streak that fades; over a puddle it takes the tea up along the stroke.
    carry: cell('streak-and-soak', 'sponge-streaks', 'damp-drag'),
    put: cell('dab-or-wipe-face', 'sponge-presses', 'wet-pat'),
    rub: cell('scrub-up-puddle', 'sponge-scrubs', 'scrub-squeak'),
  },
  guest: {
    // Each guest has its own poke, its own way with the stream, its own walk and its own giggle.
    tap: cell('poke', 'guest-wobbles', 'poke-call'),
    hold: cell('gets-the-stream', 'guest-meets-stream', 'stream-on-guest'),
    carry: cell('follow-to-seat', 'guest-toddles', 'footsteps'),
    put: cell('swap-seats', 'guests-cross-over', 'two-walks'),
    rub: cell('tickle', 'guest-squirms', 'giggle'),
  },
}

/**
 * "Put it on another thing", target by target: what comes of setting each
 * thing down on each thing the sheet names. `stack` is the stack of saucers
 * on the tray and `bowl` the bowl that comes out with the first cup that is
 * too full. A target that is not listed is a plain setting down beside it.
 */
export const PUT_ONTO: Record<GridObject, Partial<Record<GridObject | 'stack' | 'bowl', string>>> = {
  cup: { saucer: 'seat', cup: 'tip-in', bowl: 'tip-in', pot: 'tip-in', guest: 'hat' },
  saucer: { stack: 'stack', cup: 'cup-hops-on', guest: 'flat-hat' },
  spoon: { cup: 'stir', saucer: 'rest', guest: 'nose-balance' },
  pot: { guest: 'drink-from-spout', bowl: 'empty-bowl' },
  sponge: { cup: 'dab', guest: 'wipe-face' },
  guest: { guest: 'swap-seats' },
}

export function cellOf(object: GridObject, action: Action): Cell {
  return GRID[object][action]
}
