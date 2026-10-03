// The object-by-action grid as a table: what water does to each of the seven
// things, for each of the five ways it can reach them. No renderer and no DOM.
// The cells follow the grid in ART.md one for one ("The object-by-action
// grid"). The rules (world.ts) say which cell happened, and the view and the
// audio key on its cues.
//
// Every cell is a use that works. The wrong use of a thing is its "too much"
// cell, and that has a result of its own like any other.

import { ACTIONS, KINDS, type Action, type Kind } from './things'

export type Cell = {
  /** A stable name for the result. */
  readonly id: string
  /** What the view shows. */
  readonly look: string
  /** What the audio plays. */
  readonly voice: string
}

function cell(id: string, look: string, voice: string): Cell {
  return { id, look, voice }
}

export const GRID: Readonly<Record<Kind, Readonly<Record<Action, Cell>>>> = {
  fire: {
    /** The flame ducks flat, puffs steam and stands up again smaller. */
    gulp: cell('fire-ducks', 'flame-ducks', 'hiss-short'),
    /** It goes out: one fat cloud of steam, and black wet logs that drip. */
    fill: cell('fire-out', 'steam-cloud', 'hiss-falling'),
    /** The wet logs float off on their own puddle and knock together. */
    'too-much': cell('fire-logs-float', 'logs-float', 'wood-knock'),
    /** The flame leans away from the stream and wobbles back. */
    sweep: cell('fire-leans', 'flame-leans', 'fft'),
    /** Flung drops make it spit. Run-off puts it out from below. */
    neighbour: cell('fire-spits', 'steam-pips', 'crackle'),
  },
  pool: {
    /** A puddle on the bottom and one ring of ripples. */
    gulp: cell('pool-bonk', 'ripple-ring', 'bonk'),
    /** The level has climbed to the rim, and what floats is afloat. */
    fill: cell('pool-full', 'level-at-rim', 'splash-deep'),
    /** Water runs over the low side of the rim in a dark tongue. */
    'too-much': cell('pool-runs-over', 'tongue-over-rim', 'pour-over'),
    /** A row of ripples, and what floats bobs. Dry, it rattles. */
    sweep: cell('pool-ripples', 'ripple-row', 'drum-rattle'),
    /** Flung drops patter rings on the surface. */
    neighbour: cell('pool-patters', 'patter-rings', 'patter'),
  },
  seed: {
    /** The soil turns dark and the plant comes up a step. */
    gulp: cell('seed-shoots', 'shoot-pokes', 'pluck'),
    /** The flower is open. */
    fill: cell('seed-flowers', 'flower-opens', 'pluck-high'),
    /** Water runs into the saucer, and the flower's cup fills, nods and tips. */
    'too-much': cell('seed-tips', 'cup-tips', 'trickle'),
    /** The leaves flutter and shake off drops. */
    sweep: cell('seed-flutters', 'leaves-flutter', 'rustle'),
    /** Run-off is soaked up from below and the plant grows one step, slowly. */
    neighbour: cell('seed-soaks', 'dark-climbs-pot', 'soak'),
  },
  patch: {
    /** A dark blot on the sand. */
    gulp: cell('patch-blot', 'dark-blot', 'pat'),
    /** The blot stops soaking in and stands as a shiny puddle. */
    fill: cell('patch-puddle', 'shiny-puddle', 'plip'),
    /** The puddle turns to mud and throws brown blobs. */
    'too-much': cell('patch-mud', 'mud-blobs', 'squelch'),
    /** A dark line as long as the sweep. */
    sweep: cell('patch-line', 'dark-line', 'swish'),
    /** The tongue of run-off creeps along the ground and darkens it. */
    neighbour: cell('patch-creeps', 'tongue-creeps', 'seep'),
  },
  boat: {
    /** It rocks on its keel and is pushed a hand's width. */
    gulp: cell('boat-rocks', 'rocks-on-keel', 'hollow-ring'),
    /** Full to the brim, it sits low. */
    fill: cell('boat-brims', 'sits-low', 'slosh'),
    /** Afloat it sinks, rolls over, empties and pops up. On sand it brims over and rocks. */
    'too-much': cell('boat-sinks', 'rolls-over', 'glug'),
    /** The stream pushes it along, nose first. */
    sweep: cell('boat-sails', 'nose-first', 'swoosh'),
    /** A rising pool lifts it. An overflow carries it over the rim. */
    neighbour: cell('boat-lifts', 'lifts-off', 'bob'),
  },
  wheel: {
    /** It turns part of the way round and slows. */
    gulp: cell('wheel-ticks', 'part-turn', 'ratchet'),
    /** It spins steadily and flings drops off its paddles in a ring. */
    fill: cell('wheel-spins', 'drop-ring', 'whirr-rising'),
    /** It spins to a blur and throws its ring so wide that every neighbour gets a gulp. */
    'too-much': cell('wheel-whistles', 'blur-wide-ring', 'whistle'),
    /** One flick: half a turn. */
    sweep: cell('wheel-flicks', 'half-turn', 'clack'),
    /** Run-off passing under it turns it slowly from below. */
    neighbour: cell('wheel-turns-slowly', 'slow-turn', 'tick-slow'),
  },
  cat: {
    /** She leaps straight up on four stiff legs, shakes one paw and glares at the truck. */
    gulp: cell('cat-leaps', 'stiff-leap', 'yowl'),
    /** Soaked. She shakes herself and stalks to the driest spot. */
    fill: cell('cat-soaked', 'shake-and-stalk', 'shake-spray'),
    /** She climbs onto the truck's roof and washes a paw with her back to the hose. */
    'too-much': cell('cat-to-roof', 'climbs-roof', 'huff'),
    /** Ears flat, she ducks under the stream. */
    sweep: cell('cat-ducks', 'ears-flat', 'hiss-cat'),
    /** A drop on her nose and she sneezes, or she lifts her paws and moves over. */
    neighbour: cell('cat-sneezes', 'nose-drop', 'sneeze'),
  },
}

export function cellOf(kind: Kind, action: Action): Cell {
  return GRID[kind][action]
}

/** Every cell with its row and column, row by row. */
export const CELLS: readonly (Cell & { readonly kind: Kind; readonly action: Action })[] = KINDS.flatMap((kind) =>
  ACTIONS.map((action) => ({ kind, action, ...GRID[kind][action] })),
)
