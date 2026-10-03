import type { CellVoiceId } from './voices'

// The object-by-action grid of the design sheet as data: six objects by five
// actions, and for each cell what happens, what it sounds like and what it
// changes in the world. Every cell works, the wrong uses included, and no two
// look or sound alike. The names of results are for the code that will act
// them out and are never shown.

export const OBJECTS = ['lock', 'model', 'tuft', 'ribbon', 'clipping', 'face'] as const
export const ACTIONS = ['pull', 'snip', 'poke', 'ruffle', 'ribbon'] as const
export type ObjectId = (typeof OBJECTS)[number]
export type ActionId = (typeof ACTIONS)[number]

/** What a cell does to the world that is saved. A cell that changes nothing saved still looks and sounds. */
export type Change =
  | 'nothing'
  | 'longer'
  | 'shorter'
  | 'piece-falls'
  | 'ribbon-hung'
  | 'clipping-moved'
  | 'clipping-split'
  | 'clipping-gone'

export type Cell = {
  /** What is seen. */
  result: string
  voice: CellVoiceId
  changes: Change
  /** A use a grown-up would call wrong. It works like any other. */
  wrongUse: boolean
}

const cell = (result: string, voice: CellVoiceId, changes: Change, wrongUse = false): Cell => ({ result, voice, changes, wrongUse })

export const GRID: Record<ObjectId, Record<ActionId, Cell>> = {
  lock: {
    pull: cell('stretches-longer-and-stays', 'lock/pull', 'longer'),
    snip: cell('cut-where-crossed-piece-drops-stump-twangs', 'lock/snip', 'shorter'),
    poke: cell('plucked-like-a-string-one-slow-swing', 'lock/poke', 'nothing'),
    ruffle: cell('fans-out-flutters-and-falls-straight', 'lock/ruffle', 'nothing', true),
    ribbon: cell('ribbon-clips-on-beside-it-with-a-wooden-clack-tops-level', 'lock/ribbon', 'ribbon-hung'),
  },
  model: {
    pull: cell('stretches-and-snaps-back-eyes-cross', 'model/pull', 'nothing', true),
    snip: cell('piece-pops-off-friend-shakes-lock-is-back', 'model/snip', 'piece-falls', true),
    poke: cell('hums-in-the-friends-voice-ear-flicks', 'model/poke', 'nothing'),
    ruffle: cell('friend-squirms-and-laughs', 'model/ruffle', 'nothing', true),
    ribbon: cell('friend-holds-the-clip-and-its-breath-with-a-small-gulp', 'model/ribbon', 'ribbon-hung'),
  },
  tuft: {
    pull: cell('grows-into-a-plume-that-flops-over', 'tuft/pull', 'longer'),
    snip: cell('becomes-a-pom-fluff-floats-up', 'tuft/snip', 'shorter'),
    poke: cell('bobs-with-a-wiry-sproing-and-its-neighbours-ripple', 'tuft/poke', 'nothing'),
    ruffle: cell('whole-mane-frizzes-into-a-ball-and-sinks-back', 'tuft/ruffle', 'nothing', true),
    ribbon: cell('ribbon-ties-into-a-bow-customer-looks-up', 'tuft/ribbon', 'ribbon-hung', true),
  },
  ribbon: {
    pull: cell('runs-longer-off-its-roll-and-stays', 'ribbon/pull', 'longer'),
    snip: cell('cut-offcut-spirals-down-like-a-leaf', 'ribbon/snip', 'shorter'),
    poke: cell('snaps-with-a-flat-thwap-curls-up-and-uncurls', 'ribbon/poke', 'nothing'),
    ruffle: cell('spins-into-a-corkscrew-then-hangs-straight', 'ribbon/ruffle', 'nothing', true),
    ribbon: cell('winds-back-onto-its-peg', 'ribbon/ribbon', 'ribbon-hung'),
  },
  clipping: {
    pull: cell('comes-along-wriggling-with-a-dry-scritch-and-sticks-on-a-face-with-a-soft-smack', 'clipping/pull', 'clipping-moved', true),
    snip: cell('cut-in-two-with-a-small-snick-halves-hop-apart', 'clipping/snip', 'clipping-split', true),
    poke: cell('hops-like-a-flea-with-a-tiny-pip', 'clipping/poke', 'clipping-moved'),
    ruffle: cell('rolls-into-a-fluff-ball-and-away-with-a-low-trundle', 'clipping/ruffle', 'clipping-gone'),
    ribbon: cell('ribbon-lies-down-beside-it-with-a-soft-flop-ends-level', 'clipping/ribbon', 'ribbon-hung', true),
  },
  face: {
    pull: cell('cheek-stretches-like-dough-and-snaps-back', 'face/pull', 'nothing', true),
    snip: cell('scissors-snip-the-air-customer-ducks-and-peeks', 'face/snip', 'nothing', true),
    poke: cell('giggle-in-its-own-voice', 'face/poke', 'nothing'),
    ruffle: cell('head-rub-answered-by-its-taste', 'face/ruffle', 'nothing'),
    ribbon: cell('ribbon-wraps-round-as-a-blindfold-with-a-silky-swish-and-is-lifted-to-peek-with-an-ooh', 'face/ribbon', 'ribbon-hung', true),
  },
}

export function cellOf(object: ObjectId, action: ActionId): Cell {
  return GRID[object][action]
}
