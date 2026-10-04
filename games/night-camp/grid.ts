// The object-by-action grid (ART.md, "The object-by-action grid"). Six objects
// by five actions, and every cell gives a result that looks and sounds
// different. Each supply has one right use, laying it in along its rod, and
// one right user. Every other cell is a wrong use: it works, it is funny, it
// costs nothing, and it never changes the plan. A supply dropped straight on
// its own user at dusk is a right use too: it is laid in, one more on the rod.
//
// This module is the table itself and the rule about the plan. What a result
// looks like is the view's, and what it sounds like is the voices' module's;
// both are keyed by the ids here, and a test holds that no two cells share one.

export const OBJECTS = ['log', 'flask', 'can', 'lantern', 'card', 'marshmallow'] as const
export const ACTIONS = ['pull', 'on-fire', 'on-lantern', 'on-camper', 'tap'] as const
export type Thing = (typeof OBJECTS)[number]
export type Action = (typeof ACTIONS)[number]
/** While the child plans, or while the night runs. */
export type When = 'dusk' | 'night'

/** What a cell changes of what the child set, if anything. */
export type Change = 'stock' | 'lantern-pin' | 'wick' | 'strip' | 'trail' | 'card-side' | null

export type Cell = {
  /** What happens, as the id the view and the voices are keyed by. */
  readonly result: string
  /** A different result while the night runs, where the sheet gives one. */
  readonly atNight?: string
  /** Its sound, as the id of a voice. */
  readonly voice: string
  /** The object's own proper use. */
  readonly right: boolean
  /** What it changes. A wrong use changes nothing. */
  readonly changes: Change
}

const right = (result: string, voice: string, changes: Change, atNight?: string): Cell => ({ result, voice, right: true, changes, ...(atNight ? { atNight } : {}) })
const funny = (result: string, voice: string, atNight?: string): Cell => ({ result, voice, right: false, changes: null, ...(atNight ? { atNight } : {}) })

export const GRID: Readonly<Record<Thing, Readonly<Record<Action, Cell>>>> = {
  log: {
    pull: right('row-of-logs-zips-out', 'wood-block-scale', 'stock'),
    // Dropped on its own user at dusk, a piece is laid in like any other: one more on the rod.
    'on-fire': right('ring-of-stones-bites-it-in', 'stone-shuffle', 'stock', 'fire-flares-and-the-eyes-jump-back'),
    'on-lantern': funny('lantern-tips-and-rolls-into-the-stream', 'plop-and-hiss'),
    'on-camper': funny('camper-uses-it-their-own-way', 'camper-grunt'),
    tap: funny('log-rolls-half-a-turn', 'wood-block-note'),
  },
  flask: {
    pull: right('amber-band-pours-out', 'gurgle-and-clink', 'stock'),
    'on-fire': funny('fireball-ring-blows-the-hats-back', 'whoosh'),
    'on-lantern': right('lantern-glugs-and-burps-a-smoke-ring', 'glug-and-burp', 'stock'),
    'on-camper': funny('camper-sniffs-and-the-mule-sneezes', 'sniff-and-sneeze'),
    tap: funny('flask-wobbles', 'glass-ting'),
  },
  can: {
    pull: right('blue-band-comes-out-slowly', 'slosh-and-clunk', 'stock'),
    'on-fire': funny('puddle-and-a-frog', 'splat-and-croak', 'steam-cloud-hides-a-patch-of-map'),
    'on-lantern': funny('lantern-gargles-a-bubble', 'gargle-and-pop'),
    'on-camper': funny('splash-and-the-camper-shakes-dry', 'splash-and-shake'),
    tap: funny('a-cup-hops-out-and-back', 'slosh'),
  },
  lantern: {
    pull: right('carried-with-its-pencil-circle', 'handle-squeak', 'lantern-pin'),
    'on-fire': funny('glows-red-whistles-and-hops-out', 'kettle-whistle'),
    'on-lantern': funny('two-stack-sway-and-the-top-one-hops-back-to-its-pin', 'tin-clatter'),
    'on-camper': funny('worn-as-a-hat', 'hat-clonk'),
    tap: right('wick-clicks-and-the-halo-changes', 'wick-click', 'wick'),
  },
  card: {
    pull: right('stamped-along-the-ruler-in-pencil', 'stamp-thud', 'strip'),
    'on-fire': funny('corner-curls-and-smokes', 'paper-crackle'),
    'on-lantern': funny('stuck-on-as-a-shade-the-light-goes-striped', 'paper-flap'),
    'on-camper': funny('the-dog-runs-a-lap-with-it', 'dog-patter'),
    tap: right('flips-between-single-and-doubled', 'card-flick', 'card-side'),
  },
  marshmallow: {
    pull: right('dotted-trail-the-raccoons-follow', 'soft-pop-run', 'trail'),
    'on-fire': funny('swells-to-the-size-of-a-tent-and-sags', 'puff-and-sag'),
    'on-lantern': funny('melts-on-the-glass-and-the-moths-stick', 'squelch'),
    'on-camper': funny('eaten-with-both-cheeks', 'munch'),
    tap: funny('lid-pops-and-one-jumps-out', 'tin-pop'),
  },
}

/** What a use does. Every pair of object and action has an answer: nothing is refused and nothing is silent. */
export function use(thing: Thing, action: Action, when: When = 'dusk'): { result: string; voice: string; right: boolean; changes: Change } {
  const cell = GRID[thing][action]
  // A result the sheet gives only for the night is a show: it changes nothing while the night runs.
  if (when === 'night' && cell.atNight) return { result: cell.atNight, voice: cell.voice, right: false, changes: null }
  return { result: cell.result, voice: cell.voice, right: cell.right, changes: cell.changes }
}

/**
 * Whether a use can change the plan a night is run from. Only the right uses
 * that set a stock (along its rod, or dropped on its own user at dusk), a
 * lantern's pin or its wick can. The strip, the trail and
 * the side of a card are the child's own marks and leave the night as it was.
 */
export function changesThePlan(thing: Thing, action: Action): boolean {
  const changes = GRID[thing][action].changes
  return changes === 'stock' || changes === 'lantern-pin' || changes === 'wick'
}
