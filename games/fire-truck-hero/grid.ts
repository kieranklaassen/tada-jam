// The object-by-action grid as a table: what water does to each of the seven
// things, for each of the five ways it can reach them. No renderer and no DOM.
// The cells follow the grid in ART.md one for one ("The object-by-action
// grid"). The rules (world.ts) say which cell happened, and the view and the
// audio key on its cues.
//
// Every cell is a use that works. The wrong use of a thing is its "too much"
// cell, and that has a result of its own like any other. Every cell looks
// different from every other and sounds different from every other: no look
// and no voice is used twice in the whole grid.

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
    /** Water runs over the low side of the rim with a gurgle, in a dark tongue. */
    'too-much': cell('pool-runs-over', 'tongue-over-rim', 'gurgle-over'),
    /** A row of ripples with a run of light slaps, and what floats bobs. Dry, it rattles like a drum. */
    sweep: cell('pool-ripples', 'ripple-row', 'light-slaps'),
    /** Flung drops patter rings on the surface. */
    neighbour: cell('pool-patters', 'patter-rings', 'patter'),
  },
  seed: {
    /** The soil turns dark and the plant comes up a step. */
    gulp: cell('seed-shoots', 'shoot-pokes', 'pluck'),
    /** The flower is open. */
    fill: cell('seed-flowers', 'flower-opens', 'pluck-high'),
    /** Water dribbles into the saucer with a thin tinkle, and the flower's cup fills, nods and tips with a "bloop". */
    'too-much': cell('seed-tips', 'cup-tips', 'tinkle-bloop'),
    /** The leaves flutter with a papery rustle and shake off drops. */
    sweep: cell('seed-flutters', 'leaves-flutter', 'papery-rustle'),
    /** Run-off is soaked up from below with a long quiet slurp, and the plant grows one step, slowly. */
    neighbour: cell('seed-soaks', 'dark-climbs-pot', 'quiet-slurp'),
  },
  patch: {
    /** A dark blot on the sand. */
    gulp: cell('patch-blot', 'dark-blot', 'pat'),
    /** The blot stops soaking in and stands as a shiny puddle. */
    fill: cell('patch-puddle', 'shiny-puddle', 'plip'),
    /** The puddle turns to mud and throws brown blobs. */
    'too-much': cell('patch-mud', 'mud-blobs', 'squelch'),
    /** A dark line as long as the sweep, laid down with a whisper of sand drinking that follows the finger. */
    sweep: cell('patch-line', 'dark-line', 'sand-whisper'),
    /** The tongue of run-off creeps along the ground with a faint trickle and darkens it. */
    neighbour: cell('patch-creeps', 'tongue-creeps', 'faint-trickle'),
  },
  boat: {
    /** It rocks on its keel and is pushed a hand's width. */
    gulp: cell('boat-rocks', 'rocks-on-keel', 'hollow-ring'),
    /** Water gathers in it with a drumming that deepens gulp by gulp, until it is full to the brim and sits low. */
    fill: cell('boat-brims', 'sits-low', 'drumming-deeper'),
    /** Afloat it sinks, rolls over, empties and pops up. On sand it brims over and rocks. */
    'too-much': cell('boat-sinks', 'rolls-over', 'glug'),
    /** The stream pushes it along with a slap on its side, nose first. On sand it slides with a scrape. */
    sweep: cell('boat-sails', 'nose-first', 'side-slap'),
    /** A rising pool lifts it with a wooden knock. An overflow carries it over the rim and leaves it aground with a bump. */
    neighbour: cell('boat-lifts', 'lifts-off', 'hull-knock'),
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
    /** Run-off passing under it turns it slowly from below with a slow wooden creak. */
    neighbour: cell('wheel-turns-slowly', 'slow-turn', 'slow-creak'),
  },
  cat: {
    /** She leaps straight up on four stiff legs with a squeak, shakes one paw and glares at the truck. */
    gulp: cell('cat-leaps', 'stiff-leap', 'squeak'),
    /** Soaked. She shakes herself with a rattle of flying drops and stalks to the driest spot with a low grumble. */
    fill: cell('cat-soaked', 'shake-and-stalk', 'rattle-and-grumble'),
    /** She climbs onto the truck's roof with a scrabble of claws and washes a paw with her back to the hose. */
    'too-much': cell('cat-to-roof', 'climbs-roof', 'claws-scrabble'),
    /** Ears flat, she ducks under the stream with a hiss. */
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
