import type { Bait, CreatureId } from './sea'

// The object-by-action grid of the sheet (ART.md), as one timeline for each
// cell: how long the answer lasts, the moment its outcome lands, and the
// moments it sounds. The rules (game.ts) play a cell by this table, the
// figures (acts.ts) read their moments from it, and the notes (voices.ts) are
// named by it, so that nothing sounds at a moment other than the one it is
// drawn at. A test walks every cell and holds that.

export type Outcome = 'bites' | 'steals' | 'follows' | 'flees' | 'tows' | 'joke'

/** One sound of an answer, `at` seconds after it began. `index` picks the variant where a cue has several. */
export type Beat = { at: number; cue: CueName; index?: number }

export type Cell = {
  outcome: Outcome
  /** Seconds the answer lasts. */
  lasts: number
  /** Seconds in at which the outcome lands: the bait is gone, the creature is on the hook, follows or bolts. A joke has none. */
  at: number
  beats: readonly Beat[]
  /** The creature holds the bait or the hook while it answers, so the hook stays with it until it lets go. */
  grip?: true
  /** The answer goes with the hook or goes on by itself, and is not cut short when the hook is drawn away. */
  stays?: true
}

/** Every sound the grid can make. Each has its notes in voices.ts. */
export type CueName =
  | 'ticks' | 'slurp' | 'swell' | 'crunch' | 'swallow' | 'snatch' | 'rush' | 'crackle' | 'droop' | 'lampClick' | 'chomp' | 'cork' | 'pat' | 'creakYawn' | 'gulp'
  | 'bells' | 'chime' | 'fright' | 'hum' | 'ting' | 'inkPuff' | 'whistle' | 'glass' | 'clang' | 'rattle' | 'flash' | 'dizzy' | 'rub' | 'gleam' | 'flat' | 'sigh'
  | 'bonk' | 'boing' | 'snore' | 'warble' | 'breathe' | 'gulpLow' | 'glowHum' | 'loveSigh' | 'thump' | 'potHum' | 'grumble'
  | 'spits' | 'sniffIn' | 'burst' | 'clunk' | 'roll' | 'wetThump' | 'twang' | 'groan' | 'splutter' | 'plop' | 'smack' | 'slideDown' | 'sniffUp' | 'happyHum'
  | 'bootRush' | 'bootPop' | 'leather' | 'popOff' | 'flap' | 'thud' | 'muffled' | 'wetPlop' | 'wobbleLow' | 'growl' | 'slipper' | 'hopeUp' | 'hopeDown' | 'squelch' | 'slither' | 'pillow' | 'bubbleSnore'
  | 'sweep' | 'puff' | 'flutter' | 'scratch' | 'squirt' | 'wobble' | 'creak' | 'twangLine' | 'squeak' | 'blorp'

const cell = (outcome: Outcome, lasts: number, at: number, beats: readonly Beat[], more: Partial<Cell> = {}): Cell => ({ outcome, lasts, at, beats, ...more })
const joke = (lasts: number, beats: readonly Beat[], more: Partial<Cell> = {}): Cell => cell('joke', lasts, lasts, beats, more)
const b = (at: number, cue: CueName, index?: number): Beat => (index === undefined ? { at, cue } : { at, cue, index })

/**
 * The cells, by bait and creature. Three cells have a second form: the squid and the blobfish answer a spoon that
 * flashes otherwise than a dull one (`.lit`), and the blobfish's wait for the worm ends in a gulp when the worm is
 * lowered right into its mouth (`.gulp`). `glow.squid.bye` is the squid's wave when the stick leaves; it has no sound.
 */
export const CELLS = {
  // --- The worm
  'worm.shoal': cell('steals', 1.5, 1.2, [b(0, 'ticks', 0), b(0.4, 'ticks', 1), b(0.8, 'ticks', 2)], { stays: true }),
  'worm.puffer': cell('bites', 1.3, 0.9, [b(0, 'slurp'), b(0.75, 'swell')]),
  'worm.turtle': cell('steals', 2.3, 1.6, [b(0.2, 'crunch', 0), b(0.8, 'crunch', 1), b(1.4, 'crunch', 2), b(1.75, 'swallow')]),
  'worm.squid': cell('steals', 2, 0.3, [b(0.25, 'snatch'), b(0.4, 'rush')]),
  'worm.jelly': joke(1.4, [b(0.2, 'crackle'), b(0.8, 'droop')]),
  'worm.shark': cell('tows', 0, 0, []),
  'worm.angler': cell('bites', 1.3, 1, [b(0.3, 'lampClick'), b(1, 'chomp')]),
  'worm.octopus': cell('steals', 1.7, 0.7, [b(0.7, 'cork'), b(1.1, 'pat', 0), b(1.35, 'pat', 1)]),
  'worm.blobfish': joke(0.9, [b(0, 'creakYawn')]),
  'worm.blobfish.gulp': cell('bites', 0.5, 0.15, [b(0.1, 'gulp')], { stays: true }),
  // --- The shiny spoon
  'spoon.shoal': cell('follows', 1.1, 0.8, [b(0, 'bells'), b(0.5, 'chime')], { stays: true }),
  'spoon.puffer': cell('flees', 0.5, 0.35, [b(0.1, 'fright')]),
  'spoon.turtle': cell('follows', 1.5, 1.2, [b(0.2, 'hum', 0), b(0.8, 'hum', 1)]),
  'spoon.squid': joke(1.2, [b(0.2, 'ting', 0), b(0.5, 'ting', 1), b(0.8, 'ting', 2)]),
  'spoon.squid.lit': cell('flees', 0.5, 0.3, [b(0.05, 'inkPuff'), b(0.3, 'whistle')], { stays: true }),
  'spoon.jelly': joke(1.6, [b(0, 'glass', 0), b(0.8, 'glass', 1)]),
  'spoon.shark': joke(2, [b(0.3, 'clang'), b(0.6, 'rattle', 0), b(1, 'rattle', 1)], { grip: true }),
  'spoon.angler': joke(2.2, [b(0.1, 'flash'), b(0.5, 'dizzy')]),
  'spoon.octopus': joke(2, [b(0.7, 'rub', 0), b(1.05, 'rub', 1), b(1.8, 'gleam')], { grip: true }),
  'spoon.blobfish': joke(1, [b(0, 'flat')]),
  'spoon.blobfish.lit': joke(1.6, [b(0.3, 'sigh')]),
  // --- The glow stick
  'glow.shoal': joke(1.2, [b(0.5, 'bonk')], { stays: true }),
  'glow.puffer': joke(1.2, [b(0.25, 'boing', 0), b(0.7, 'boing', 1)]),
  'glow.turtle': joke(2.6, [b(0.8, 'snore', 0), b(1.6, 'snore', 1)]),
  'glow.squid': joke(1.6, [b(0, 'warble', 0), b(0.6, 'warble', 1)]),
  'glow.squid.bye': joke(0.8, [], { stays: true }),
  'glow.jelly': cell('follows', 1.4, 1, [b(0, 'breathe', 0), b(0.7, 'breathe', 1)], { stays: true }),
  'glow.shark': cell('steals', 1.2, 0.4, [b(0.3, 'gulpLow'), b(0.6, 'glowHum')]),
  'glow.angler': cell('follows', 1.4, 1, [b(0, 'loveSigh'), b(0.7, 'thump')]),
  'glow.octopus': joke(2.4, [b(0.8, 'potHum', 0), b(1.3, 'potHum', 1)], { grip: true }),
  'glow.blobfish': joke(2, [b(0.2, 'grumble', 0), b(0.7, 'grumble', 1)]),
  // --- The cheese
  'cheese.shoal': joke(1.4, [b(0.6, 'spits', 0), b(0.8, 'spits', 1)], { stays: true }),
  'cheese.puffer': joke(1.6, [b(0, 'sniffIn', 0), b(0.2, 'sniffIn', 1), b(0.4, 'sniffIn', 2), b(0.8, 'burst')]),
  'cheese.turtle': joke(2, [b(0.3, 'clunk'), b(0.6, 'roll')]),
  'cheese.squid': joke(1.4, [b(0.1, 'wetThump')], { stays: true }),
  'cheese.jelly': joke(1.6, [b(0.2, 'twang', 0), b(0.8, 'twang', 1)]),
  'cheese.shark': joke(2.2, [b(0.2, 'groan'), b(0.8, 'splutter')]),
  'cheese.angler': joke(1.6, [b(0.4, 'plop'), b(1, 'smack')]),
  'cheese.octopus': joke(2.4, [b(0, 'slideDown'), b(1.9, 'cork')]),
  'cheese.blobfish': cell('follows', 1.6, 1.2, [b(0, 'sniffUp', 0), b(0.25, 'sniffUp', 1), b(0.5, 'sniffUp', 2), b(1, 'happyHum')]),
  // --- The old boot
  'boot.shoal': joke(1.8, [b(0, 'bootRush', 0), b(0.4, 'bootPop', 0), b(0.8, 'bootRush', 1), b(1.2, 'bootPop', 1)], { stays: true }),
  'boot.puffer': joke(2, [b(0.6, 'leather', 0), b(0.95, 'leather', 1), b(1.4, 'popOff')], { grip: true }),
  'boot.turtle': joke(2.2, [b(0.5, 'flap', 0), b(0.8, 'thud', 0), b(1.3, 'flap', 1), b(1.6, 'thud', 1)], { grip: true }),
  'boot.squid': joke(2, [b(0.5, 'muffled', 0), b(0.9, 'muffled', 1), b(1.3, 'muffled', 2)], { grip: true }),
  'boot.jelly': cell('bites', 1.2, 0.8, [b(0.5, 'wetPlop'), b(0.8, 'wobbleLow')]),
  'boot.shark': joke(2, [b(0.2, 'growl', 0), b(0.6, 'slipper', 0), b(1, 'growl', 1), b(1.4, 'slipper', 1)], { grip: true }),
  'boot.angler': joke(2.2, [b(0.2, 'hopeUp'), b(1.5, 'hopeDown')]),
  'boot.octopus': cell('bites', 1.3, 1, [b(0.2, 'squelch'), b(0.6, 'slither')]),
  'boot.blobfish': joke(2.4, [b(0.4, 'pillow'), b(1, 'bubbleSnore', 0), b(1.7, 'bubbleSnore', 1)]),
  // --- Nothing on the hook: the toy
  'none.shoal': joke(0.9, [b(0, 'sweep')], { stays: true }),
  'none.puffer': joke(2.4, [b(0, 'puff'), b(1.2, 'flutter', 0), b(1.5, 'flutter', 1), b(1.8, 'flutter', 2)]),
  // The turtle's knocks and the shark's teeth are played by the hook as it rests or moves, so the rules sound them (game.ts).
  'none.turtle': joke(2.6, [b(0, 'scratch')]),
  'none.squid': joke(2.6, [b(0, 'squirt')], { stays: true }),
  'none.jelly': joke(3, [b(0, 'wobble', 0), b(1.1, 'wobble', 1)], { stays: true }),
  'none.shark': joke(6, []),
  'none.angler': joke(2.3, [b(0, 'creak', 0), b(0.6, 'creak', 1), b(1.3, 'twangLine')], { grip: true }),
  'none.octopus': joke(1.7, [b(0, 'squeak', 0), b(0.45, 'squeak', 1), b(0.9, 'squeak', 2)], { grip: true }),
  'none.blobfish': joke(2.4, [b(0, 'blorp')]),
} as const satisfies Record<string, Cell>

export type CellKey = keyof typeof CELLS

/** The cell a bait and a creature meet in. `lit` is whether the spoon flashes where it is. */
export function cellKey(bait: Bait, id: CreatureId, lit: boolean): CellKey {
  if (bait === 'spoon' && lit && (id === 'squid' || id === 'blobfish')) return `spoon.${id}.lit`
  return `${bait}.${id}`
}

export const cellOf = (key: CellKey): Cell => CELLS[key]

/** The moments an answer sounds, for the figures: `beatsOf(key)[n]` is when its n-th sound falls. */
export function beatsOf(key: CellKey): number[] {
  return CELLS[key].beats.map((beat) => beat.at)
}

/** The 54 cells of the sheet's grid, one for each bait and creature, in their plain form. */
export function gridKeys(baits: readonly Bait[], ids: readonly CreatureId[]): CellKey[] {
  return baits.flatMap((bait) => ids.map((id) => `${bait}.${id}` as CellKey))
}

/** Who gives a bait this outcome: who follows the spoon, who bites the boot. */
export function whoDoes(outcome: Outcome, bait: Bait, ids: readonly CreatureId[]): CreatureId[] {
  return ids.filter((id) => (Object.keys(CELLS) as CellKey[]).some((key) => key.startsWith(`${bait}.${id}`) && CELLS[key].outcome === outcome))
}
