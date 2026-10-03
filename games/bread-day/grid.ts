// The object-by-action grid (ART.md, "The object-by-action grid"): for every
// thing that can lie on the peel and every act of the child, the motion and
// the sound that answer it. A table of names and nothing more: the view draws
// the motion and the audio module plays the voice of that name. It lives here,
// as rules, so that a test can hold three things: no act lands in silence on a
// still screen, no two cells of the sheet's grid answer alike, and the wrong
// use of a thing answers as fully as the right one.

import { kindOf, textureOf, type Load } from './stuff'

/** What lies on the peel, as a child would tell it apart by looking and touching. */
export type What =
  | 'dust' | 'puddle' | 'loose-seeds' | 'froth' | 'batter' | 'streaky' | 'shaggy' | 'smooth' | 'risen'
  | 'toasted-dust' | 'toasted-seeds' | 'pancake' | 'crumbly' | 'brick' | 'airy'

export const WHATS: readonly What[] = ['dust', 'puddle', 'loose-seeds', 'froth', 'batter', 'streaky', 'shaggy', 'smooth', 'risen', 'toasted-dust', 'toasted-seeds', 'pancake', 'crumbly', 'brick', 'airy']

/** Dough counts as risen once a push would let air out of it. */
export function whatIs(load: Load): What | null {
  if (!load) return null
  if (!load.raw) return load.crumb === 'dust' ? 'toasted-dust' : load.crumb === 'seeds' ? 'toasted-seeds' : load.crumb === 'dense' ? 'brick' : load.crumb
  const kind = kindOf(load)
  if (kind === 'nothing') return null
  if (kind === 'dust' || kind === 'puddle') return kind
  if (kind === 'seeds') return 'loose-seeds'
  if (kind === 'batter') return load.flour === 0 && load.water === 0 ? 'froth' : 'batter'
  return load.rise > 0 ? 'risen' : textureOf(load)
}

/** The five acts of the grid: set it down on the peel, push it, carry it to the warm nook, carry it into the oven, hand it over at the hatch. */
export type Act = 'put' | 'push' | 'warm' | 'bake' | 'hand'
export const ACTS: readonly Act[] = ['put', 'push', 'warm', 'bake', 'hand']

/** The name of a motion and the name of a voice. */
export type Cue = { motion: string; voice: string }

const row = (...cells: [string, string][]): Record<Act, Cue> =>
  Object.fromEntries(ACTS.map((act, at) => [act, { motion: cells[at][0], voice: cells[at][1] }])) as Record<Act, Cue>

export const GRID: Record<What, Record<Act, Cue>> = {
  //                  put                               push                              warm                              bake                              hand
  'dust':          row(['heap-slumps', 'flour-hiss'],   ['furrows', 'dust-brush'],        ['badger-shrugs', 'small-hm'],    ['toasts-brown', 'smoke-wisp'],   ['white-sneeze', 'sneeze']),
  'puddle':        row(['puddle-spreads', 'gurgle'],    ['rings', 'plip'],                ['steam-curl', 'faint-hiss'],     ['steam-cloud', 'long-hiss'],     ['splashed-shake', 'splash']),
  'froth':         row(['blob-plops', 'burp'],          ['slimy-strings', 'bubble-pops'], ['froths-over', 'big-burp'],      ['holey-crisp', 'crisp-crackle'], ['sour-pucker', 'sniff-yelp']),
  'loose-seeds':   row(['seeds-scatter', 'seed-ticks'], ['seeds-skitter', 'seed-rattle'], ['one-seed-rolls', 'single-tick'], ['seeds-hop', 'seed-crackle'],   ['seed-in-tooth', 'tooth-pick']),
  'batter':        row(['batter-creeps', 'glug'],       ['closes-over', 'slap-ripple'],   ['skin-bubbles', 'slow-blips'],   ['sets-flat', 'sizzle'],          ['drips-off', 'drip-slurp']),
  'streaky':       row(['clod-drops', 'wet-clod'],      ['smears', 'sticky-smack'],       ['goes-shiny', 'soft-tick'],      ['sets-rough', 'dry-crackle'],    ['gooey-clumps', 'smack-pull']),
  'shaggy':        row(['lump-flops', 'dull-flop'],     ['rips-short', 'tear'],           ['sweats', 'low-hum'],            ['cracks-open', 'crack'],         ['gooey-shreds', 'chew-pull']),
  'smooth':        row(['slaps-jiggles', 'dough-slap'], ['dents-bulges', 'squish'],       ['warm-sheen', 'soft-hum'],       ['turns-gold', 'oven-whoosh'],    ['gooey-strings', 'stretch-snap']),
  'risen':         row(['wobbles-down', 'soft-pat'],    ['air-out', 'long-sigh'],         ['swells-domes', 'bubble-ticks'], ['springs-gold', 'crust-sing'],   ['gooey-balloon', 'squeak-pop']),
  'toasted-dust':  row(['dust-patters', 'dry-patter'],  ['brown-puff', 'puff'],           ['warm-dust', 'tiny-tick'],       ['dust-darkens', 'scorch'],       ['brown-sneeze', 'cough-sneeze']),
  'toasted-seeds': row(['seeds-bounce', 'bright-ticks'], ['seeds-roll', 'rattle-roll'],   ['seeds-sit', 'one-pop'],         ['seeds-blacken', 'pop-crackle'], ['crunch-pick', 'crunch']),
  'pancake':       row(['flaps-down', 'flap'],          ['flops-over', 'floppy-slap'],    ['edges-curl', 'steam-sigh'],     ['crisps-darker', 'crisp-snap'],  ['folds-in-mouth', 'soft-chew']),
  'crumbly':       row(['lands-shedding', 'crumb-patter'], ['sheds-crumbs', 'crumble'],   ['crumbs-settle', 'dry-tick'],    ['crust-darkens', 'toast-crackle'], ['falls-apart', 'crumble-gasp']),
  'brick':         row(['thunk-jumps', 'thunk'],        ['does-not-give', 'knock'],       ['stays-hard', 'stone-tick'],     ['brick-darkens', 'kiln-ping'],   ['tooth-clonk', 'clonk-ring']),
  'airy':          row(['soft-bounce', 'bounce-sigh'],  ['squash-springs', 'wheeze'],     ['steam-rises', 'warm-sigh'],     ['loaf-darkens', 'crust-crackle'], ['big-bite', 'chomp']),
}

/** The six rows of the grid in the design sheet, each by the thing a child meets first. */
export const SHEET_ROWS: Record<'flour' | 'water' | 'bubbly' | 'seeds' | 'dough' | 'bread', What> = {
  flour: 'dust', water: 'puddle', bubbly: 'froth', seeds: 'loose-seeds', dough: 'smooth', bread: 'airy',
}

/** The cue that answers an act on what lies there, or none when nothing lies there. */
export function cueFor(load: Load, act: Act): Cue | null {
  const what = whatIs(load)
  return what ? GRID[what][act] : null
}
