// The object-by-action grid (ART.md, "The object-by-action grid"): six
// objects by five needs, thirty cells, each with its own motion and its own
// voice. One cell in each column helps. Every other cell works, is funny, and
// shows the need again in the place the wrong thing landed. Then the five
// pairs of things that always give the same result.
//
// Pure data. The view plays a cell's `motion` in the manner of the animal on
// the table (cast.ts) and the sound module plays its `voice`.

import { CARES, FITS, NEEDS, type Care, type Need } from './needs'

/** What can be given: a care thing, or the child's own hand. */
export type Given = Care | 'hand'
export const GIVEN: readonly Given[] = [...CARES, 'hand']

export type Cell = {
  /** The name of what the animal and the thing do. No two cells share one. */
  motion: string
  /** The name of what is heard. No two cells share one. */
  voice: string
}

export const GRID: Readonly<Record<Given, Readonly<Record<Need, Cell>>>> = {
  plaster: {
    sore: { motion: 'plaster-on-paw-stamp-strut', voice: 'pat-two-stamps' },
    cold: { motion: 'plaster-flaps-off-in-shiver', voice: 'papery-flutter' },
    itchy: { motion: 'leg-sticks-to-plaster-hop-circle', voice: 'stretchy-creak-pop' },
    thirsty: { motion: 'plaster-on-tongue-sour-face', voice: 'wet-slap-bleh' },
    scared: { motion: 'plaster-on-peeking-nose-pulls-in', voice: 'tick-sniff' },
  },
  blanket: {
    sore: { motion: 'tucked-in-paw-sticks-out-waves', voice: 'whump-rising-whine' },
    cold: { motion: 'wrap-shiver-stops-head-pops-out', voice: 'whump-chatter-to-hum' },
    itchy: { motion: 'lump-scratches-blanket-kicked-off', voice: 'muffled-thumps' },
    thirsty: { motion: 'too-warm-oozes-out-flat', voice: 'panting-speeds-up' },
    scared: { motion: 'blanket-over-hiding-place-trembles', voice: 'whump-endless-rustle' },
  },
  brush: {
    sore: { motion: 'fur-fluffed-paw-lifted-away', voice: 'dry-strokes-eep' },
    cold: { motion: 'static-puff-shivers', voice: 'crackle-chatter' },
    itchy: { motion: 'burrs-fly-out-foot-thumps', voice: 'three-pops-thumping-purr' },
    thirsty: { motion: 'brushed-flat-like-a-rug', voice: 'strokes-sinking' },
    scared: { motion: 'brush-stops-short-fur-bristles', voice: 'one-stroke-then-quiet' },
  },
  bowl: {
    sore: { motion: 'paw-dipped-shaken-held-up', voice: 'plop-drips' },
    cold: { motion: 'one-lap-bigger-shiver-bowl-rattles', voice: 'lap-rattle' },
    itchy: { motion: 'leg-kicks-bowl-splash-shake', voice: 'splash-spraying-shake' },
    thirsty: { motion: 'long-drink-ears-lift-hiccup', voice: 'gulps-rising-hiccup' },
    scared: { motion: 'tongue-from-hiding-water-trembles', voice: 'one-lap-ripple' },
  },
  basket: {
    sore: { motion: 'climbs-in-three-legs-paw-over-rim', voice: 'wicker-three-steps' },
    cold: { motion: 'curled-up-basket-walks-with-shiver', voice: 'rattling-wicker-walk' },
    itchy: { motion: 'scratches-inside-basket-spins', voice: 'creak-creak-whirr' },
    thirsty: { motion: 'hangs-over-rim-like-a-towel', voice: 'long-creak-sigh' },
    scared: { motion: 'creeps-in-lamp-dims-breathes-steps-out', voice: 'hush-slow-breaths-yawn' },
  },
  hand: {
    sore: { motion: 'leans-in-lays-paw-in-hand', voice: 'soft-hum' },
    cold: { motion: 'presses-to-warm-hand-shiver-eases', voice: 'chatter-thins' },
    itchy: { motion: 'turns-itchy-place-leg-thumps', voice: 'quick-thumps' },
    thirsty: { motion: 'licks-finger-dry-tongue', voice: 'raspy-lick' },
    scared: { motion: 'sniffs-finger-creeps-one-step', voice: 'sniff-soft-steps' },
  },
}

export function cell(given: Given, need: Need): Cell {
  return GRID[given][need]
}

/** Whether this cell is the one in its column that helps. The hand never is: it is concern, not a care that is judged. */
export function helps(given: Given, need: Need): boolean {
  return given !== 'hand' && FITS[need] === given
}

// --- The pairs --------------------------------------------------------------

/** What a pair of things makes. Each works every time and is never hinted at. */
export type Secret = 'den' | 'foam' | 'boat' | 'crackle' | 'patch'

const PAIRS: readonly { of: readonly [Care, Care]; makes: Secret }[] = [
  { of: ['blanket', 'basket'], makes: 'den' },
  { of: ['brush', 'bowl'], makes: 'foam' },
  { of: ['plaster', 'bowl'], makes: 'boat' },
  { of: ['brush', 'blanket'], makes: 'crackle' },
  { of: ['plaster', 'blanket'], makes: 'patch' },
]

export const SECRETS: readonly Secret[] = PAIRS.map((pair) => pair.makes)

/** What two things make together, in either order, or null where one simply comes to rest on the other. */
export function pairOf(one: Care, other: Care): Secret | null {
  if (one === other) return null
  return PAIRS.find((pair) => pair.of.includes(one) && pair.of.includes(other))?.makes ?? null
}

/** Every cell with where it sits, for the tests and for the view's table of motions. */
export function allCells(): { given: Given; need: Need; cell: Cell; helps: boolean }[] {
  return GIVEN.flatMap((given) => NEEDS.map((need) => ({ given, need, cell: cell(given, need), helps: helps(given, need) })))
}
