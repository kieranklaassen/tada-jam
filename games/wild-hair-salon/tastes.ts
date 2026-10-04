import { MANE_LONG, MANE_SHORT } from './rules'

// The four customers and their tastes, which never change, so a child can
// learn them and try them on purpose (pack: game-design,
// characters-with-opinions.md). Each is the same animal as the customer in the
// chair and as somebody's friend. The names of reactions are for the code that
// will act them out: nothing here is ever shown or spoken as a word.

export const CUSTOMERS = ['lion', 'poodle', 'yak', 'rabbit'] as const
export type CustomerId = (typeof CUSTOMERS)[number]

export function isCustomer(value: unknown): value is CustomerId {
  return typeof value === 'string' && (CUSTOMERS as readonly string[]).includes(value)
}

export type Liking = 'loves' | 'hates'

export type Taste = {
  tempo: 'slow' | 'quick'
  weight: 'heavy' | 'light' | 'soft'
  /** The part of the body the comedy goes through. */
  funniest: string
  /** The mane it likes; it hates the other. */
  mane: 'long' | 'short'
  bow: Liking
  rub: Liking
  /** What it does, in the chair, about the exact haircut it was given. */
  reactions: {
    maneLiked: string
    maneHated: string
    bow: string
    rub: string
    lockTooLong: string
    lockTooShort: string
    lockAsLong: string
  }
  /** What it does as the friend when its own lock is pulled, snipped, plucked or ruffled. */
  asFriend: { pulled: string; snipped: string; poked: string; ruffled: string }
  /** Its voice: the pitch its giggles and hums sit on, in Hz. */
  voiceHz: number
}

export const TASTES: Record<CustomerId, Taste> = {
  lion: {
    tempo: 'slow', weight: 'heavy', funniest: 'tail-tuft', mane: 'long', bow: 'hates', rub: 'loves',
    reactions: {
      maneLiked: 'shakes-it-out-and-rumbles',
      maneHated: 'sinks-right-down-and-peeks-sideways',
      bow: 'goes-cross-eyed-and-bats-at-it',
      rub: 'purrs-and-melts-down-in-the-chair',
      lockTooLong: 'treads-on-it-into-a-slow-bow',
      lockTooShort: 'pats-for-it-and-an-ear-flicks-out',
      lockAsLong: 'slow-head-toss',
    },
    asFriend: { pulled: 'eyes-cross-tail-stiffens', snipped: 'shakes-like-a-wet-dog-slowly', poked: 'deep-hum-ear-flick', ruffled: 'rumbling-chuckle' },
    voiceHz: 196,
  },
  poodle: {
    tempo: 'quick', weight: 'light', funniest: 'tail-pom', mane: 'short', bow: 'loves', rub: 'hates',
    reactions: {
      maneLiked: 'prances-on-tiptoe-nose-up',
      maneHated: 'three-sneezes-the-last-blows-it-up',
      bow: 'turns-her-head-at-the-mirror',
      rub: 'huffs-and-puts-each-curl-back',
      lockTooLong: 'trips-spins-out-and-holds-the-pose',
      lockTooShort: 'gasps-and-fans-herself',
      lockAsLong: 'tiptoe-turn',
    },
    asFriend: { pulled: 'eyes-cross-pom-quivers', snipped: 'quick-shake-poms-bounce', poked: 'bright-hum-ear-flick', ruffled: 'squeaky-titter' },
    voiceHz: 523,
  },
  yak: {
    tempo: 'slow', weight: 'soft', funniest: 'nostrils', mane: 'long', bow: 'loves', rub: 'hates',
    reactions: {
      maneLiked: 'peekaboo-low-chuckle',
      maneHated: 'hides-his-eyes-behind-his-hooves',
      bow: 'looks-up-at-it-and-pats-the-place',
      rub: 'sinks-down-with-a-long-low-groan',
      lockTooLong: 'looks-down-at-it-and-chews',
      lockTooShort: 'snorts-and-his-fringe-flies-up',
      lockAsLong: 'low-hum-rocking-side-to-side',
    },
    asFriend: { pulled: 'eyes-cross-nostrils-flare', snipped: 'slow-shudder-from-nose-to-tail', poked: 'low-hum-nostril-twitch', ruffled: 'snorting-laugh' },
    voiceHz: 131,
  },
  rabbit: {
    tempo: 'quick', weight: 'light', funniest: 'ears', mane: 'short', bow: 'hates', rub: 'loves',
    reactions: {
      maneLiked: 'ears-pop-up-and-twirl',
      maneHated: 'ears-flop-and-it-hops-in-a-circle',
      bow: 'thumps-a-hind-foot-at-it',
      rub: 'one-hind-leg-kicks-and-drums-on-the-chair',
      lockTooLong: 'spins-like-a-spindle-and-unspins',
      lockTooShort: 'ears-shoot-up-and-one-droops',
      lockAsLong: 'jump-with-a-twist',
    },
    asFriend: { pulled: 'eyes-cross-ears-knot', snipped: 'twitchy-shake-ears-flap', poked: 'tiny-hum-nose-wiggle', ruffled: 'chittering-giggle' },
    voiceHz: 392,
  },
}

export type ManeFeeling = 'liked' | 'hated' | 'plain'

/** How long a mane is, as its tufts average. */
export function maneKind(mane: readonly number[]): 'long' | 'short' | 'middling' {
  if (mane.length === 0) return 'short'
  const average = mane.reduce((sum, steps) => sum + steps, 0) / mane.length
  return average >= MANE_LONG ? 'long' : average <= MANE_SHORT ? 'short' : 'middling'
}

/** What a customer makes of its mane as it is: it likes one kind, hates the other, and has nothing to say about a middling one. */
export function maneFeeling(who: CustomerId, mane: readonly number[]): ManeFeeling {
  const kind = maneKind(mane)
  return kind === 'middling' ? 'plain' : kind === TASTES[who].mane ? 'liked' : 'hated'
}
