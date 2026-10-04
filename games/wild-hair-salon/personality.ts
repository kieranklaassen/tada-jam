import type { Rng } from './rng'
import type { CustomerId } from './tastes'

// How each customer moves like itself. A personality is a tempo, a weight
// (the springs its body rides on), a gait, and a list of small bits of
// business, each a list of timed moves on the parts of a face and body. The
// lion is slow and heavy and his funniest part is his tail tuft; the poodle
// is quick and light, all tiptoe and tail pom; the yak is slow and soft and
// does everything with his nostrils; the rabbit is fast and twitchy and its
// ears say it all. No two share a bit. A director picks what each does next
// and never the same thing twice running.

/** The parts a bit can move. Each is one number the puppet eases towards. */
export const PARTS = ['blink', 'lookX', 'lookY', 'cross', 'wide', 'earL', 'earR', 'tail', 'mouthOpen', 'smile', 'brow', 'tilt', 'bob', 'sink', 'nose', 'lift', 'shift', 'spin', 'paw', 'pawX', 'pawY', 'paws', 'foot'] as const
export type Part = (typeof PARTS)[number]

// A paw comes out when `paw` is up, to the place `pawX` and `pawY` give in head widths from the middle of
// the face; with `paws` up the other paw does the same on the other side. `foot` is a hind foot, out and up.

/** One part driven to a value, from `at` seconds into the bit, for `hold` seconds; then it goes back to rest. */
export type Move = { part: Part; to: number; at: number; hold: number }
export type Bit = { id: string; moves: readonly Move[] }

const m = (part: Part, to: number, at: number, hold: number): Move => ({ part, to, at, hold })
const bit = (id: string, ...moves: Move[]): Bit => ({ id, moves })

/** What a customer has a reaction of its own to. Every personality has every one. */
export const REACTIONS = [
  // Touched under the cape.
  'caught', 'pulled', 'snipped', 'plucked', 'fluttered', 'maneTugged', 'manePoked', 'frizzed',
  'cheekPulled', 'airSnipped', 'noseTickled', 'earTickled', 'chinTickled', 'cheekTickled', 'rubLoved', 'rubHated',
  'wearing', 'floorWatched', 'blindfolded', 'bowLoved', 'bowHated',
  // As the friend, about its own lock.
  'friendPulled', 'friendSnipped', 'friendPoked', 'friendRuffled', 'holdsBreath',
  // When the cape comes off.
  'lockTooLong', 'stamps', 'lockTooShort', 'lockAsLong', 'maneLiked', 'maneHated',
  // Coming, going and waiting.
  'hatOff', 'sitsDown', 'wantsItSo', 'patsItsLock', 'ducksAndPeeks', 'looksAbout', 'hopsOver', 'showsAMove',
] as const
export type Reaction = (typeof REACTIONS)[number]

export type Personality = {
  /** Where each part rests. A part left out rests at 0. */
  rest: Partial<Record<Part, number>>
  /** Seconds one breath takes. */
  breath: number
  /** The spring of the head and body: lower is heavier and slower. */
  stiffness: number
  damping: number
  /** The springs of the quick parts: ears, eyelids. */
  quick: number
  /** Seconds of stillness between two idle bits, least and most. */
  gap: readonly [number, number]
  /** How it walks: how high each step hops, in scene units, and how many steps a second. */
  gait: { hop: number; steps: number }
  /** What it does when nobody touches it. */
  idle: readonly Bit[]
  /** What it does about each thing that happens to it. Where there are several, a different one each time. */
  reactions: Record<Reaction, readonly Bit[]>
}

const LION: Personality = {
  rest: { smile: 0.25 }, breath: 3.6, stiffness: 46, damping: 7.5, quick: 240, gap: [1.6, 3.4], gait: { hop: 10, steps: 1.6 },
  idle: [
    bit('lion-slow-blink', m('blink', 1, 0, 0.32)),
    bit('lion-two-blinks', m('blink', 1, 0, 0.12), m('blink', 1, 0.3, 0.12)),
    bit('lion-left-ear-flick', m('earL', 1, 0, 0.1), m('earL', -0.4, 0.14, 0.08)),
    bit('lion-right-ear-flick', m('earR', 1, 0, 0.1), m('earR', -0.4, 0.14, 0.08)),
    bit('lion-tail-swish', m('tail', 1, 0, 0.7), m('tail', -0.7, 0.8, 0.6)),
    bit('lion-tail-thump', m('tail', -1, 0, 0.25), m('tail', 0.5, 0.3, 0.2), m('bob', 0.15, 0.3, 0.12)),
    bit('lion-big-yawn', m('mouthOpen', 1, 0.2, 1.3), m('blink', 1, 0.3, 1.2), m('tilt', -0.5, 0.2, 1.3), m('earL', -0.6, 0.3, 1.1), m('earR', -0.6, 0.3, 1.1)),
    bit('lion-looks-up-at-his-mane', m('lookY', -1, 0, 1.1), m('cross', 0.5, 0.1, 0.9), m('brow', 0.6, 0, 1.1)),
    bit('lion-whisker-twitch', m('nose', 1, 0, 0.12), m('nose', -1, 0.16, 0.12), m('nose', 1, 0.32, 0.1)),
  ],
  reactions: {
    caught: [bit('lion-eyes-go-to-the-finger', m('wide', 0.6, 0, 0.5), m('brow', 0.7, 0, 0.5))],
    pulled: [bit('lion-leans-after-it', m('wide', 0.4, 0, 0.4), m('mouthOpen', 0.3, 0, 0.3))],
    snipped: [
      bit('lion-blinks-and-jumps', m('blink', 1, 0, 0.14), m('bob', -0.6, 0, 0.1), m('earL', 1, 0, 0.2), m('earR', 1, 0, 0.2)),
      bit('lion-slow-chuckle', m('smile', 1, 0, 0.9), m('mouthOpen', 0.5, 0.05, 0.2), m('mouthOpen', 0.5, 0.35, 0.2), m('bob', 0.3, 0.05, 0.15), m('bob', 0.3, 0.35, 0.15)),
    ],
    plucked: [bit('lion-ear-follows-the-note', m('earR', 1, 0, 0.3), m('lookX', 0.7, 0, 0.6), m('lookY', 0.8, 0, 0.6))],
    fluttered: [bit('lion-head-wobbles', m('tilt', 0.7, 0, 0.12), m('tilt', -0.7, 0.14, 0.12), m('tilt', 0.4, 0.28, 0.12), m('wide', 0.5, 0, 0.4))],
    maneTugged: [bit('lion-looks-up-cross-eyed', m('lookY', -1, 0, 0.7), m('cross', 0.8, 0, 0.7), m('brow', 0.8, 0, 0.7))],
    manePoked: [bit('lion-eyes-follow-the-ripple', m('lookY', -0.8, 0, 0.5), m('lookX', -0.8, 0, 0.25), m('lookX', 0.8, 0.25, 0.25))],
    frizzed: [bit('lion-eyes-wide-under-the-ball', m('wide', 1, 0, 1.1), m('mouthOpen', 0.6, 0, 0.7), m('earL', 1, 0, 0.9), m('earR', 1, 0, 0.9))],
    cheekPulled: [bit('lion-cheek-wobbles-back', m('blink', 1, 0, 0.2), m('tilt', -0.6, 0, 0.1), m('tilt', 0.5, 0.12, 0.1), m('mouthOpen', 0.7, 0, 0.25))],
    airSnipped: [bit('lion-cross-eyed-ducks-and-peeks', m('cross', 1, 0, 0.5), m('wide', 1, 0, 0.5), m('sink', 1, 0.2, 0.9), m('blink', 1, 0.3, 0.35), m('brow', 1, 0.7, 0.5), m('lookY', -0.6, 0.7, 0.5))],
    noseTickled: [bit('lion-snort-and-nose-wiggle', m('nose', 1, 0, 0.1), m('nose', -1, 0.12, 0.1), m('cross', 0.9, 0, 0.4), m('blink', 1, 0.42, 0.14), m('bob', -0.5, 0.42, 0.12), m('mouthOpen', 0.5, 0.42, 0.2))],
    earTickled: [bit('lion-ear-flaps-head-tips', m('earL', 1, 0, 0.08), m('earL', -1, 0.1, 0.08), m('earL', 1, 0.2, 0.08), m('earR', 1, 0.05, 0.08), m('earR', -1, 0.15, 0.08), m('tilt', 0.9, 0, 0.5), m('smile', 1, 0, 0.6))],
    chinTickled: [bit('lion-chin-up-rumbling', m('tilt', -0.3, 0, 0.8), m('bob', -0.8, 0, 0.8), m('blink', 1, 0.05, 0.8), m('smile', 1, 0, 0.9), m('tail', 1, 0, 0.4), m('tail', -1, 0.45, 0.4))],
    cheekTickled: [
      bit('lion-deep-giggle', m('smile', 1, 0, 0.7), m('mouthOpen', 0.6, 0, 0.18), m('mouthOpen', 0.6, 0.26, 0.18), m('bob', 0.4, 0, 0.14), m('bob', 0.4, 0.26, 0.14), m('blink', 1, 0, 0.5)),
      bit('lion-shy-giggle', m('smile', 1, 0, 0.8), m('lookX', -0.9, 0, 0.6), m('lookY', 0.6, 0, 0.6), m('tilt', 0.5, 0, 0.6), m('mouthOpen', 0.3, 0.1, 0.2)),
    ],
    // He loves a head rub: he purrs and melts down in the chair.
    rubLoved: [bit('lion-purrs-and-melts', m('blink', 1, 0, 0.9), m('smile', 1, 0, 0.9), m('sink', 0.55, 0, 0.9), m('tilt', 0.35, 0, 0.9), m('tail', 0.6, 0, 0.9), m('earL', -0.5, 0, 0.9), m('earR', -0.5, 0, 0.9))],
    rubHated: [bit('lion-shakes-it-off-slowly', m('tilt', 0.8, 0, 0.25), m('tilt', -0.8, 0.3, 0.25), m('brow', -0.8, 0, 0.6), m('smile', -0.6, 0, 0.6))],
    wearing: [bit('lion-squints-at-what-he-wears', m('cross', 1, 0.1, 0.9), m('lookY', 0.4, 0.1, 0.9), m('brow', 0.8, 0.1, 0.9), m('nose', 1, 0.5, 0.1), m('nose', -1, 0.62, 0.1))],
    floorWatched: [bit('lion-peers-over-the-cape', m('lookY', 1, 0, 0.7), m('tilt', 0.4, 0, 0.7), m('brow', 0.5, 0, 0.7))],
    blindfolded: [bit('lion-lifts-it-with-a-paw-and-oohs', m('tilt', -0.4, 0.3, 0.9), m('mouthOpen', 0.8, 0.5, 0.5), m('brow', 1, 0.4, 0.8), m('tail', 1, 0.5, 0.5))],
    bowLoved: [bit('lion-turns-to-show-it', m('tilt', 0.5, 0, 0.6), m('tilt', -0.5, 0.7, 0.6), m('smile', 1, 0, 1.3))],
    // He hates a bow: he goes cross-eyed and bats at it like a kitten. The paw's move is played about where the bow is (`Puppet.reaching`).
    bowHated: [bit('lion-goes-cross-eyed-and-bats-at-it', m('cross', 1, 0, 1.2), m('lookY', -1, 0, 1.2), m('bob', -0.7, 0.3, 0.12), m('bob', -0.7, 0.6, 0.12), m('bob', -0.7, 0.9, 0.12), m('brow', -0.7, 0, 1.2), m('paw', 1, 0.25, 0.85), m('pawX', -0.25, 0.25, 0.14), m('pawX', 0.25, 0.42, 0.14), m('pawX', -0.25, 0.59, 0.14), m('pawX', 0.25, 0.76, 0.14))],
    friendPulled: [bit('lion-eyes-cross-tail-stiffens', m('cross', 1, 0, 0.6), m('tail', 1, 0, 0.6), m('wide', 0.8, 0, 0.6))],
    friendSnipped: [bit('lion-shakes-like-a-wet-dog-slowly', m('tilt', 1, 0, 0.16), m('tilt', -1, 0.2, 0.16), m('tilt', 1, 0.4, 0.16), m('tilt', -0.6, 0.6, 0.16), m('blink', 1, 0, 0.7), m('tail', -1, 0.1, 0.6), m('earL', -0.7, 0, 0.7), m('earR', -0.7, 0, 0.7))],
    friendPoked: [bit('lion-deep-hum-ear-flick', m('earL', 1, 0.1, 0.12), m('smile', 0.8, 0, 0.5), m('mouthOpen', 0.25, 0, 0.45))],
    friendRuffled: [bit('lion-rumbling-chuckle', m('bob', 0.5, 0, 0.18), m('bob', 0.5, 0.3, 0.18), m('bob', 0.5, 0.6, 0.18), m('smile', 1, 0, 0.9), m('blink', 1, 0.1, 0.7), m('tail', 1, 0, 0.9))],
    holdsBreath: [bit('lion-chest-out-eyes-wide', m('wide', 0.7, 0, 1), m('smile', -0.3, 0, 1), m('lift', 0.25, 0, 1), m('brow', 0.6, 0, 1))],
    lockTooLong: [bit('lion-stamps-under-it-into-a-slow-bow', m('wide', 0.8, 0, 0.3), m('shift', 0.5, 0.1, 0.3), m('tilt', 1, 0.35, 0.9), m('sink', 0.5, 0.35, 0.9), m('blink', 1, 0.6, 0.6), m('tail', 1, 0.4, 0.8))],
    stamps: [bit('lion-plants-a-heavy-foot-under-it', m('foot', 1, 0, 0.3), m('lookY', 1, 0, 0.4))],
    lockTooShort: [bit('lion-pats-for-it-and-an-ear-flicks-out', m('lookY', 1, 0, 0.9), m('brow', 1, 0.1, 0.9), m('earR', 1, 0.5, 0.1), m('earR', -1, 0.62, 0.1), m('earR', 1, 0.74, 0.1), m('mouthOpen', 0.4, 0.3, 0.5), m('paw', 1, 0.35, 0.6), m('pawX', 0.52, 0.3, 0.7), m('pawY', 1, 0.35, 0.14), m('pawY', 0.86, 0.51, 0.1), m('pawY', 1, 0.63, 0.14), m('pawY', 0.86, 0.79, 0.1))],
    lockAsLong: [bit('lion-slow-head-toss', m('tilt', -0.8, 0, 0.5), m('tilt', 0.8, 0.55, 0.5), m('smile', 1, 0, 1.2), m('blink', 1, 0.2, 0.3))],
    maneLiked: [bit('lion-shakes-it-out-and-rumbles', m('tilt', 0.9, 0, 0.22), m('tilt', -0.9, 0.26, 0.22), m('tilt', 0.9, 0.52, 0.22), m('smile', 1, 0, 1.1), m('mouthOpen', 0.5, 0.2, 0.7), m('tail', 1, 0, 1))],
    maneHated: [bit('lion-sinks-right-down-and-peeks-sideways', m('sink', 1, 0, 1.1), m('blink', 1, 0, 0.5), m('lookX', 0.8, 0.6, 0.5), m('brow', -0.6, 0, 1.1), m('tail', -1, 0, 1.1))],
    hatOff: [bit('lion-shakes-his-mane-free', m('tilt', 0.7, 0, 0.2), m('tilt', -0.7, 0.24, 0.2), m('blink', 1, 0, 0.3))],
    sitsDown: [bit('lion-settles-with-a-thump', m('bob', 0.9, 0, 0.2), m('tail', -1, 0.1, 0.3), m('blink', 1, 0.1, 0.25))],
    wantsItSo: [bit('lion-looks-from-his-lock-to-the-other', m('lookX', 0.5, 0, 0.5), m('lookY', 1, 0, 0.5), m('lookX', 1, 0.55, 0.5), m('lookY', 0.8, 0.55, 0.5), m('lookX', 0.5, 1.1, 0.4), m('lookY', 1, 1.1, 0.4), m('brow', -0.5, 0, 1.5))],
    patsItsLock: [bit('lion-pats-his-lock-twice-slowly', m('paw', 1, 0.2, 1), m('pawX', 0.52, 0, 1.3), m('pawY', 1, 0.2, 0.3), m('pawY', 0.86, 0.5, 0.15), m('pawY', 1, 0.65, 0.25), m('pawY', 0.86, 0.9, 0.15))],
    looksAbout: [bit('lion-rocks-slowly-on-his-heels', m('tilt', 0.5, 0, 0.5), m('tilt', -0.5, 0.6, 0.5), m('lookX', -1, 0, 1.1))],
    ducksAndPeeks: [bit('lion-hat-down-one-eye-up', m('sink', 0.8, 0, 0.5), m('blink', 1, 0, 0.3), m('lookY', -0.7, 0.4, 0.4))],
    hopsOver: [bit('lion-lands-heavily', m('bob', 1, 0, 0.18), m('tail', 1, 0.05, 0.3))],
    showsAMove: [bit('lion-watches-his-own-paw', m('lookY', -0.9, 0, 1.2), m('cross', 0.4, 0, 1.2), m('brow', 0.5, 0, 1.2), m('smile', 0.8, 0.9, 0.5))],
  },
}

const POODLE: Personality = {
  rest: { smile: 0.4, brow: 0.2 }, breath: 2.2, stiffness: 120, damping: 11, quick: 320, gap: [1.0, 2.2], gait: { hop: 22, steps: 3.2 },
  idle: [
    bit('poodle-flutter-blink', m('blink', 1, 0, 0.07), m('blink', 1, 0.14, 0.07), m('blink', 1, 0.28, 0.07)),
    bit('poodle-nose-in-the-air', m('tilt', -0.4, 0, 0.6), m('lookY', -0.7, 0, 0.6), m('brow', 0.8, 0, 0.6)),
    bit('poodle-pom-wag', m('tail', 1, 0, 0.1), m('tail', -1, 0.12, 0.1), m('tail', 1, 0.24, 0.1), m('tail', -1, 0.36, 0.1)),
    bit('poodle-tiptoe-bounce', m('lift', 0.5, 0, 0.12), m('lift', 0.5, 0.24, 0.12)),
    bit('poodle-checks-her-reflection', m('lookX', -0.9, 0, 0.7), m('tilt', 0.3, 0, 0.7), m('smile', 1, 0.2, 0.5)),
    bit('poodle-ear-poms-shiver', m('earL', 0.6, 0, 0.06), m('earR', 0.6, 0.04, 0.06), m('earL', -0.6, 0.12, 0.06), m('earR', -0.6, 0.16, 0.06), m('tilt', -0.2, 0, 0.22), m('smile', 1, 0, 0.22)),
    bit('poodle-dainty-sniff', m('nose', 1, 0, 0.08), m('nose', 1, 0.16, 0.08), m('lookY', 0.5, 0, 0.3)),
    bit('poodle-little-sigh', m('lift', 0.2, 0, 0.3), m('blink', 1, 0.1, 0.4), m('smile', 0.8, 0, 0.5)),
  ],
  reactions: {
    caught: [bit('poodle-gasp', m('wide', 1, 0, 0.3), m('mouthOpen', 0.5, 0, 0.25), m('lift', 0.3, 0, 0.15))],
    pulled: [bit('poodle-on-tiptoe-after-it', m('lift', 0.4, 0, 0.4), m('brow', 1, 0, 0.4), m('lookY', 1, 0, 0.4))],
    snipped: [
      bit('poodle-squeak-and-hop', m('lift', 0.8, 0, 0.12), m('blink', 1, 0, 0.1), m('mouthOpen', 0.6, 0, 0.15)),
      bit('poodle-titter-behind-a-paw', m('smile', 1, 0, 0.5), m('blink', 1, 0.05, 0.08), m('blink', 1, 0.2, 0.08), m('tilt', 0.4, 0, 0.5)),
    ],
    plucked: [bit('poodle-ear-poms-ring', m('earL', 1, 0, 0.08), m('earR', -1, 0, 0.08), m('earL', -1, 0.1, 0.08), m('earR', 1, 0.1, 0.08), m('smile', 1, 0, 0.3))],
    fluttered: [bit('poodle-fans-herself', m('tilt', 0.3, 0, 0.1), m('tilt', -0.3, 0.1, 0.1), m('tilt', 0.3, 0.2, 0.1), m('tilt', -0.3, 0.3, 0.1), m('blink', 1, 0, 0.4))],
    maneTugged: [bit('poodle-pats-her-poms-in-alarm', m('lookY', -1, 0, 0.4), m('brow', -0.8, 0, 0.4), m('mouthOpen', 0.4, 0, 0.3))],
    manePoked: [bit('poodle-poms-bounce-she-counts-them', m('lookY', -0.8, 0, 0.5), m('lookX', 0.8, 0, 0.16), m('lookX', -0.8, 0.17, 0.16), m('lookX', 0.8, 0.34, 0.16))],
    frizzed: [bit('poodle-freezes-then-preens', m('wide', 1, 0, 0.5), m('lift', 0.4, 0, 0.5), m('tilt', 0.4, 0.55, 0.3), m('smile', 1, 0.55, 0.4))],
    cheekPulled: [bit('poodle-squeak-and-smooths-it', m('mouthOpen', 0.8, 0, 0.12), m('blink', 1, 0.15, 0.15), m('tilt', 0.5, 0.15, 0.3))],
    airSnipped: [bit('poodle-swoons-behind-the-cape', m('cross', 1, 0, 0.25), m('wide', 1, 0, 0.25), m('sink', 1, 0.2, 0.6), m('tilt', 0.8, 0.2, 0.6), m('blink', 1, 0.3, 0.5), m('lookX', 0.9, 0.85, 0.3))],
    noseTickled: [bit('poodle-three-tiny-sneezes', m('bob', -0.4, 0.1, 0.07), m('bob', -0.4, 0.28, 0.07), m('bob', -0.4, 0.46, 0.07), m('blink', 1, 0.1, 0.45), m('nose', 1, 0, 0.5))],
    earTickled: [bit('poodle-ear-pom-spins', m('earL', 1, 0, 0.06), m('earL', -1, 0.07, 0.06), m('earL', 1, 0.14, 0.06), m('earL', -1, 0.21, 0.06), m('lift', 0.3, 0, 0.3), m('smile', 1, 0, 0.4))],
    chinTickled: [bit('poodle-chin-up-eyes-shut', m('tilt', -0.5, 0, 0.5), m('blink', 1, 0, 0.5), m('tail', 1, 0, 0.1), m('tail', -1, 0.12, 0.1), m('tail', 1, 0.24, 0.1))],
    cheekTickled: [
      bit('poodle-trill', m('smile', 1, 0, 0.4), m('mouthOpen', 0.4, 0, 0.08), m('mouthOpen', 0.4, 0.12, 0.08), m('mouthOpen', 0.4, 0.24, 0.08), m('lift', 0.3, 0, 0.3)),
      bit('poodle-coy-turn-away', m('tilt', -0.6, 0, 0.4), m('lookX', 0.9, 0, 0.4), m('blink', 1, 0.1, 0.08), m('blink', 1, 0.24, 0.08)),
    ],
    rubLoved: [bit('poodle-leans-in-daintily', m('tilt', 0.4, 0, 0.5), m('blink', 1, 0, 0.5), m('smile', 1, 0, 0.5))],
    // She hates a head rub: she huffs and puts every curl back with a paw.
    rubHated: [bit('poodle-huffs-and-puts-each-curl-back', m('brow', -1, 0, 0.9), m('smile', -0.7, 0, 0.9), m('nose', 1, 0, 0.1), m('tilt', 0.3, 0.2, 0.15), m('tilt', -0.3, 0.4, 0.15), m('tilt', 0.3, 0.6, 0.15), m('lookY', -0.9, 0.2, 0.6), m('paw', 1, 0.15, 0.8), m('pawX', -0.6, 0.15, 0.2), m('pawY', -0.75, 0.15, 0.2), m('pawX', 0, 0.4, 0.2), m('pawY', -1, 0.4, 0.2), m('pawX', 0.6, 0.65, 0.3), m('pawY', -0.75, 0.65, 0.3))],
    wearing: [bit('poodle-admires-it-sideways', m('lookX', -1, 0, 0.6), m('lookY', 0.5, 0, 0.6), m('tilt', -0.3, 0, 0.6), m('smile', 1, 0.3, 0.4))],
    floorWatched: [bit('poodle-tuts-at-the-mess', m('lookY', 1, 0, 0.5), m('brow', -0.6, 0, 0.5), m('nose', 1, 0.1, 0.08), m('nose', 1, 0.25, 0.08))],
    blindfolded: [bit('poodle-peeks-under-with-a-squeal', m('lift', 0.4, 0.2, 0.2), m('tilt', 0.5, 0.2, 0.5), m('mouthOpen', 0.7, 0.35, 0.25), m('tail', 1, 0.3, 0.1), m('tail', -1, 0.42, 0.1), m('brow', 1, 0.25, 0.5))],
    // She loves a bow: she turns her head from side to side at the mirror.
    bowLoved: [bit('poodle-turns-her-head-at-the-mirror', m('lookY', -1, 0, 0.3), m('tilt', 0.6, 0, 0.3), m('tilt', -0.6, 0.35, 0.3), m('tilt', 0.6, 0.7, 0.3), m('smile', 1, 0, 1), m('lookX', -0.8, 0, 1), m('lift', 0.3, 0, 1))],
    bowHated: [bit('poodle-flicks-it-with-a-sniff', m('tilt', 0.9, 0, 0.1), m('nose', 1, 0.15, 0.1), m('brow', -0.7, 0, 0.5))],
    friendPulled: [bit('poodle-eyes-cross-pom-quivers', m('cross', 1, 0, 0.35), m('tail', 1, 0, 0.05), m('tail', -1, 0.06, 0.05), m('tail', 1, 0.12, 0.05), m('tail', -1, 0.18, 0.05), m('lift', 0.3, 0, 0.3))],
    friendSnipped: [bit('poodle-quick-shake-poms-bounce', m('tilt', 0.8, 0, 0.07), m('tilt', -0.8, 0.08, 0.07), m('tilt', 0.8, 0.16, 0.07), m('earL', 1, 0, 0.3), m('earR', -1, 0, 0.3), m('tail', 1, 0, 0.08), m('tail', -1, 0.1, 0.08))],
    friendPoked: [bit('poodle-bright-hum-ear-flick', m('earR', 1, 0, 0.08), m('smile', 1, 0, 0.3), m('lift', 0.15, 0, 0.2))],
    friendRuffled: [bit('poodle-squeaky-titter', m('lift', 0.3, 0, 0.08), m('lift', 0.3, 0.14, 0.08), m('lift', 0.3, 0.28, 0.08), m('blink', 1, 0, 0.35), m('smile', 1, 0, 0.4), m('tail', 1, 0, 0.1), m('tail', -1, 0.14, 0.1), m('tail', 1, 0.28, 0.1))],
    holdsBreath: [bit('poodle-on-tiptoe-not-breathing', m('lift', 0.6, 0, 1), m('wide', 1, 0, 1), m('brow', 1, 0, 1))],
    lockTooLong: [bit('poodle-trips-spins-out-and-holds-the-pose', m('shift', 0.6, 0, 0.15), m('spin', 1, 0.15, 0.5), m('lift', 0.5, 0.15, 0.4), m('tilt', -0.5, 0.7, 0.7), m('smile', 1, 0.7, 0.7), m('brow', 1, 0.7, 0.7))],
    stamps: [bit('poodle-stamps-under-it-twice-on-tiptoe', m('foot', 1, 0, 0.08), m('foot', 1, 0.16, 0.08), m('lift', 0.2, 0, 0.3))],
    lockTooShort: [bit('poodle-gasps-and-fans-herself', m('wide', 1, 0, 0.3), m('mouthOpen', 0.8, 0, 0.3), m('tilt', 0.3, 0.35, 0.1), m('tilt', -0.3, 0.47, 0.1), m('tilt', 0.3, 0.59, 0.1), m('tilt', -0.3, 0.71, 0.1), m('blink', 1, 0.35, 0.5), m('paw', 1, 0.3, 0.6), m('pawY', 0.25, 0.3, 0.6), m('pawX', 0.8, 0.3, 0.1), m('pawX', 1, 0.42, 0.1), m('pawX', 0.8, 0.54, 0.1), m('pawX', 1, 0.66, 0.1), m('pawX', 0.8, 0.78, 0.12))],
    lockAsLong: [bit('poodle-tiptoe-turn', m('lift', 0.5, 0, 0.7), m('spin', 1, 0.1, 0.5), m('smile', 1, 0, 0.9), m('tail', 1, 0.1, 0.1), m('tail', -1, 0.25, 0.1))],
    // She likes her poms snipped round: she prances on tiptoe, nose up.
    maneLiked: [bit('poodle-prances-on-tiptoe-nose-up', m('lift', 0.6, 0, 0.14), m('lift', 0.6, 0.28, 0.14), m('lift', 0.6, 0.56, 0.14), m('lift', 0.6, 0.84, 0.14), m('tilt', -0.5, 0, 1), m('smile', 1, 0, 1))],
    // She hates it long over her nose: three sneezes, each bigger, and the last blows it straight up.
    maneHated: [bit('poodle-three-sneezes-the-last-blows-it-up', m('bob', -0.3, 0.1, 0.08), m('bob', -0.6, 0.4, 0.1), m('bob', -1, 0.75, 0.14), m('lift', 0.8, 0.75, 0.14), m('blink', 1, 0.1, 0.8), m('nose', 1, 0, 0.75))],
    hatOff: [bit('poodle-fluffs-her-poms', m('lift', 0.3, 0, 0.1), m('tilt', 0.4, 0.05, 0.1), m('tilt', -0.4, 0.17, 0.1))],
    sitsDown: [bit('poodle-perches-and-arranges-herself', m('lift', 0.3, 0, 0.1), m('tail', 1, 0.12, 0.08), m('tail', -1, 0.22, 0.08), m('smile', 1, 0.1, 0.3))],
    wantsItSo: [bit('poodle-points-her-nose-at-each-in-turn', m('tilt', -0.3, 0, 0.3), m('lookX', 0.4, 0, 0.3), m('tilt', 0.3, 0.35, 0.3), m('lookX', 1, 0.35, 0.3), m('tilt', -0.3, 0.7, 0.25), m('lookX', 0.4, 0.7, 0.25), m('lookY', 0.9, 0, 0.95), m('brow', 1, 0, 0.95))],
    patsItsLock: [bit('poodle-dabs-her-lock-three-times', m('paw', 1, 0.1, 0.6), m('pawX', 0.52, 0, 0.8), m('pawY', 1, 0.1, 0.08), m('pawY', 0.9, 0.2, 0.08), m('pawY', 1, 0.3, 0.08), m('pawY', 0.9, 0.4, 0.08), m('pawY', 1, 0.5, 0.08), m('pawY', 0.9, 0.6, 0.08))],
    looksAbout: [bit('poodle-looks-about-on-tiptoe', m('lift', 0.4, 0, 0.5), m('lookX', -1, 0, 0.25), m('lookX', 1, 0.3, 0.25), m('tilt', 0.35, 0.55, 0.2), m('tilt', -0.35, 0.78, 0.2))],
    ducksAndPeeks: [bit('poodle-pops-down-and-up-twice', m('sink', 0.7, 0, 0.14), m('sink', 0.7, 0.3, 0.14), m('wide', 0.8, 0.14, 0.16))],
    hopsOver: [bit('poodle-lands-on-tiptoe', m('lift', 0.4, 0, 0.1), m('tail', 1, 0, 0.08))],
    showsAMove: [bit('poodle-shows-it-off-with-a-flourish', m('tilt', 0.4, 0, 0.4), m('lookY', -0.8, 0, 0.9), m('lift', 0.3, 0.9, 0.12), m('smile', 1, 0.8, 0.4))],
  },
}

const YAK: Personality = {
  rest: { smile: 0.1, brow: -0.15 }, breath: 4.4, stiffness: 34, damping: 8.5, quick: 170, gap: [2.2, 4.2], gait: { hop: 5, steps: 1.1 },
  idle: [
    bit('yak-long-blink', m('blink', 1, 0, 0.6)),
    bit('yak-nostrils-flare', m('nose', 1, 0, 0.5), m('nose', -0.3, 0.6, 0.3)),
    bit('yak-slow-snort', m('nose', 1, 0, 0.2), m('bob', 0.3, 0.05, 0.2), m('blink', 1, 0.1, 0.3)),
    bit('yak-chews', m('mouthOpen', 0.25, 0, 0.25), m('mouthOpen', 0.25, 0.5, 0.25), m('mouthOpen', 0.25, 1, 0.25), m('shift', 0.15, 0, 0.25), m('shift', -0.15, 0.5, 0.25)),
    bit('yak-looks-at-the-floor', m('lookY', 1, 0, 1.5), m('sink', 0.2, 0, 1.5)),
    bit('yak-rocks-a-little', m('shift', 0.3, 0, 0.7), m('shift', -0.3, 0.8, 0.7)),
    bit('yak-one-ear-droops', m('earL', -1, 0, 1.2), m('tilt', 0.2, 0, 1.2)),
    bit('yak-deep-sigh', m('lift', 0.2, 0, 0.6), m('sink', 0.3, 0.7, 0.8), m('nose', 1, 0.7, 0.4)),
  ],
  reactions: {
    caught: [bit('yak-slowly-looks-round', m('lookX', 0.8, 0.2, 0.8), m('brow', 0.5, 0.2, 0.8), m('nose', 0.6, 0.2, 0.4))],
    pulled: [bit('yak-plants-his-hooves', m('sink', 0.3, 0, 0.6), m('brow', -0.5, 0, 0.6), m('nose', 1, 0, 0.6))],
    snipped: [
      bit('yak-blinks-a-beat-late', m('blink', 1, 0.3, 0.4), m('nose', 1, 0.3, 0.3)),
      bit('yak-low-surprised-moo', m('mouthOpen', 0.7, 0.2, 0.6), m('wide', 0.6, 0.2, 0.6), m('nose', 1, 0.2, 0.5), m('sink', 0.2, 0.5, 0.4)),
    ],
    plucked: [bit('yak-hums-along-low', m('mouthOpen', 0.3, 0.1, 0.9), m('blink', 1, 0.1, 0.9), m('shift', 0.2, 0.1, 0.45), m('shift', -0.2, 0.55, 0.45))],
    fluttered: [bit('yak-blows-it-flat-through-his-nose', m('nose', 1, 0, 0.7), m('bob', 0.2, 0, 0.7), m('lookY', 1, 0, 0.7), m('tilt', 0.5, 0, 0.3), m('tilt', -0.5, 0.35, 0.3))],
    maneTugged: [bit('yak-rolls-his-eyes-up-slowly', m('lookY', -1, 0.2, 1), m('brow', 1, 0.2, 1), m('nose', 0.5, 0.4, 0.5))],
    manePoked: [bit('yak-waits-for-it-to-stop', m('blink', 1, 0, 0.3), m('lookY', -0.6, 0.4, 0.6), m('nose', 0.7, 0.5, 0.3))],
    frizzed: [bit('yak-disappears-into-it', m('sink', 0.5, 0, 1.2), m('blink', 1, 0, 0.6), m('nose', 1, 0.7, 0.5))],
    cheekPulled: [bit('yak-jowl-wobbles-for-a-long-time', m('shift', 0.25, 0, 0.3), m('shift', -0.2, 0.35, 0.3), m('shift', 0.12, 0.7, 0.3), m('blink', 1, 0, 0.5), m('nose', 1, 0, 0.3))],
    airSnipped: [bit('yak-sinks-until-only-the-horns-show', m('cross', 1, 0, 0.6), m('wide', 0.7, 0, 0.5), m('sink', 1, 0.3, 1.2), m('nose', 1, 0.3, 0.5), m('lookY', -1, 1.1, 0.4))],
    noseTickled: [bit('yak-enormous-slow-sneeze', m('nose', 1, 0, 0.7), m('tilt', -0.5, 0.1, 0.6), m('blink', 1, 0.7, 0.5), m('bob', -1, 0.75, 0.2), m('mouthOpen', 1, 0.75, 0.2))],
    earTickled: [bit('yak-ear-twitches-once-he-leans-into-it', m('earL', 1, 0.2, 0.15), m('tilt', 0.6, 0.3, 0.9), m('blink', 1, 0.4, 0.8))],
    chinTickled: [bit('yak-low-rumble-lips-flap', m('mouthOpen', 0.4, 0, 0.15), m('mouthOpen', 0.4, 0.3, 0.15), m('mouthOpen', 0.4, 0.6, 0.15), m('nose', 1, 0, 0.9), m('smile', 1, 0, 0.9))],
    cheekTickled: [
      bit('yak-snorting-laugh', m('nose', 1, 0, 0.14), m('bob', 0.4, 0, 0.14), m('nose', 1, 0.3, 0.14), m('bob', 0.4, 0.3, 0.14), m('smile', 1, 0, 0.8)),
      bit('yak-bashful-look-away', m('lookX', -1, 0.1, 1), m('sink', 0.3, 0.1, 1), m('smile', 0.8, 0.1, 1)),
    ],
    rubLoved: [bit('yak-leans-his-whole-weight-in', m('tilt', 0.7, 0, 1), m('shift', 0.4, 0, 1), m('blink', 1, 0, 1))],
    // He hates a head rub: he sinks into his hair with a long low groan until only the nose shows.
    rubHated: [bit('yak-sinks-down-with-a-long-low-groan', m('sink', 0.9, 0, 1.3), m('blink', 1, 0, 1.3), m('mouthOpen', 0.35, 0, 1.1), m('nose', 1, 0.9, 0.4), m('brow', -1, 0, 1.3))],
    wearing: [bit('yak-snuffles-at-it', m('nose', 1, 0, 0.2), m('nose', -1, 0.25, 0.2), m('nose', 1, 0.5, 0.2), m('cross', 0.8, 0, 0.8), m('lookY', 0.7, 0, 0.8))],
    floorWatched: [bit('yak-stares-at-it-for-a-while', m('lookY', 1, 0.2, 1.4), m('tilt', 0.2, 0.2, 1.4), m('nose', 0.5, 0.8, 0.3))],
    blindfolded: [bit('yak-stands-quite-still-then-noses-it-up', m('nose', 1, 0.7, 0.5), m('bob', -0.5, 0.7, 0.5), m('mouthOpen', 0.6, 0.9, 0.4), m('lookY', -0.6, 0.9, 0.4), m('brow', 1, 0.75, 0.6))],
    // He loves a bow: he tucks it under his hair and pats the place.
    bowLoved: [bit('yak-looks-up-at-it-and-pats-the-place', m('lookY', -1, 0, 0.6), m('sink', 0.25, 0.3, 0.2), m('sink', 0.25, 0.7, 0.2), m('smile', 1, 0.3, 1), m('blink', 1, 0.6, 0.6), m('paw', 1, 0.3, 0.9), m('pawY', -0.14, 0.3, 0.25), m('pawY', -0.14, 0.7, 0.2))],
    bowHated: [bit('yak-blows-at-it-until-it-turns', m('nose', 1, 0, 1), m('lookY', -1, 0, 1), m('brow', -0.6, 0, 1))],
    friendPulled: [bit('yak-eyes-cross-nostrils-flare', m('cross', 1, 0.1, 0.8), m('nose', 1, 0.1, 0.8), m('brow', 0.8, 0.1, 0.8))],
    friendSnipped: [bit('yak-slow-shudder-from-nose-to-tail', m('nose', 1, 0, 0.3), m('shift', 0.3, 0.2, 0.2), m('shift', -0.3, 0.45, 0.2), m('tail', 1, 0.6, 0.3), m('blink', 1, 0.2, 0.6))],
    friendPoked: [bit('yak-low-hum-ear-and-nostril-twitch', m('earL', 0.8, 0.15, 0.15), m('nose', 0.8, 0, 0.12), m('nose', 0.8, 0.3, 0.12), m('mouthOpen', 0.2, 0, 0.8))],
    friendRuffled: [bit('yak-snort-snort-snort', m('nose', 1, 0, 0.2), m('nose', 1, 0.35, 0.2), m('nose', 1, 0.7, 0.2), m('sink', 0.2, 0, 0.9), m('smile', 1, 0, 0.9))],
    holdsBreath: [bit('yak-nostrils-pinched-shut', m('nose', -1, 0, 1.2), m('wide', 0.5, 0, 1.2), m('brow', 0.4, 0, 1.2))],
    lockTooLong: [bit('yak-looks-down-at-it-and-chews', m('lookY', 1, 0, 0.4), m('mouthOpen', 0.5, 0.4, 0.2), m('mouthOpen', 0.5, 0.75, 0.2), m('mouthOpen', 0.5, 1.1, 0.2), m('shift', 0.2, 0.4, 0.3), m('shift', -0.2, 0.8, 0.3), m('lookY', -0.5, 0.5, 0.9), m('brow', 0.4, 0.5, 0.9))],
    stamps: [bit('yak-sets-a-hoof-down-under-it-slowly', m('foot', 1, 0, 0.5), m('nose', 0.6, 0.2, 0.3))],
    lockTooShort: [bit('yak-snorts-and-his-fringe-flies-up', m('lookY', 1, 0, 0.5), m('nose', 1, 0.5, 0.25), m('bob', -0.7, 0.5, 0.25), m('wide', 0.8, 0.55, 0.6), m('brow', 1, 0.55, 0.6))],
    lockAsLong: [bit('yak-low-hum-rocking-side-to-side', m('shift', 0.5, 0, 0.5), m('shift', -0.5, 0.55, 0.5), m('shift', 0.5, 1.1, 0.4), m('blink', 1, 0, 1.4), m('smile', 1, 0, 1.5), m('mouthOpen', 0.2, 0, 1.4))],
    // He likes it long over his eyes: he plays peekaboo through it with a low chuckle.
    maneLiked: [bit('yak-peekaboo-low-chuckle', m('blink', 1, 0, 0.5), m('wide', 0.8, 0.55, 0.25), m('blink', 1, 0.85, 0.4), m('wide', 0.8, 1.3, 0.25), m('smile', 1, 0, 1.6), m('nose', 0.6, 0.55, 0.25))],
    // He hates his eyes showing: he blushes and hides behind his hooves.
    maneHated: [bit('yak-hides-his-eyes-behind-his-hooves', m('sink', 0.6, 0, 1.4), m('blink', 1, 0.1, 1.2), m('lookX', -0.9, 0, 0.3), m('brow', -0.9, 0, 1.4), m('shift', -0.3, 0, 1.4), m('paw', 1, 0.1, 1.2), m('paws', 1, 0, 1.4), m('pawX', 0.34, 0, 1.4), m('pawY', -0.18, 0, 1.4))],
    hatOff: [bit('yak-lets-it-all-fall-down', m('sink', 0.2, 0, 0.5), m('blink', 1, 0, 0.5))],
    sitsDown: [bit('yak-lowers-himself-with-a-snort', m('sink', 0.4, 0, 0.5), m('nose', 1, 0.3, 0.3))],
    wantsItSo: [bit('yak-turns-his-whole-head-from-one-to-the-other', m('tilt', -0.3, 0, 0.8), m('lookX', 0.4, 0, 0.8), m('lookY', 1, 0, 2), m('tilt', 0.5, 0.85, 0.75), m('lookX', 1, 0.85, 0.75), m('nose', 0.7, 1.1, 0.4), m('tilt', -0.3, 1.65, 0.35), m('lookX', 0.4, 1.65, 0.35))],
    patsItsLock: [bit('yak-lays-a-hoof-on-his-lock', m('paw', 1, 0.3, 1.2), m('pawX', 0.52, 0, 1.6), m('pawY', 1, 0, 1.6), m('nose', 0.5, 0.6, 0.4))],
    looksAbout: [bit('yak-sways-and-looks-in', m('shift', 0.3, 0, 0.6), m('shift', -0.3, 0.7, 0.6), m('lookX', -1, 0.2, 1), m('nose', 0.6, 0.3, 0.4))],
    ducksAndPeeks: [bit('yak-sinks-below-the-glass-nose-last', m('sink', 1, 0, 1), m('nose', 1, 0.5, 0.4))],
    hopsOver: [bit('yak-arrives-and-the-floor-knows', m('bob', 0.7, 0, 0.3), m('nose', 1, 0.1, 0.3), m('sink', 0.2, 0.3, 0.3))],
    showsAMove: [bit('yak-does-it-very-slowly-so-you-see', m('lookY', -1, 0, 1.6), m('tilt', 0.3, 0, 1.6), m('nose', 0.6, 1.2, 0.4))],
  },
}

const RABBIT: Personality = {
  rest: { smile: 0.3, earL: 0.1, earR: 0.1 }, breath: 1.5, stiffness: 180, damping: 12, quick: 420, gap: [0.7, 1.7], gait: { hop: 34, steps: 4 },
  idle: [
    bit('rabbit-nose-twitches', m('nose', 1, 0, 0.05), m('nose', -1, 0.06, 0.05), m('nose', 1, 0.12, 0.05), m('nose', -1, 0.18, 0.05), m('nose', 1, 0.24, 0.05)),
    bit('rabbit-one-ear-swivels', m('earL', -1, 0, 0.25), m('lookX', -0.7, 0, 0.25)),
    bit('rabbit-other-ear-swivels', m('earR', -1, 0, 0.25), m('lookX', 0.7, 0, 0.25)),
    bit('rabbit-both-ears-up', m('earL', 1, 0, 0.3), m('earR', 1, 0, 0.3), m('wide', 0.7, 0, 0.3), m('lift', 0.2, 0, 0.3)),
    bit('rabbit-foot-thump', m('bob', 0.5, 0, 0.05), m('bob', 0.5, 0.1, 0.05), m('tail', 1, 0, 0.15)),
    bit('rabbit-quick-look-about', m('lookX', 1, 0, 0.12), m('lookX', -1, 0.14, 0.12), m('lookY', -0.8, 0.28, 0.12), m('earL', 1, 0, 0.12), m('earR', 1, 0.14, 0.12)),
    bit('rabbit-washes-a-cheek', m('tilt', 0.5, 0, 0.3), m('blink', 1, 0, 0.3), m('shift', 0.15, 0, 0.1), m('shift', 0.15, 0.2, 0.1)),
    bit('rabbit-little-hop-in-place', m('lift', 0.7, 0, 0.1), m('earL', -0.6, 0.05, 0.12), m('earR', -0.6, 0.05, 0.12)),
  ],
  reactions: {
    caught: [bit('rabbit-freezes-ears-straight-up', m('earL', 1, 0, 0.35), m('earR', 1, 0, 0.35), m('wide', 1, 0, 0.35))],
    pulled: [bit('rabbit-ears-pulled-flat-back', m('earL', -1, 0, 0.3), m('earR', -1, 0, 0.3), m('lookY', 1, 0, 0.3))],
    snipped: [
      bit('rabbit-jumps-ears-clap', m('lift', 1, 0, 0.1), m('earL', 1, 0, 0.06), m('earR', 1, 0, 0.06), m('earL', -1, 0.07, 0.06), m('earR', -1, 0.07, 0.06)),
      bit('rabbit-nose-goes-like-mad', m('nose', 1, 0, 0.04), m('nose', -1, 0.05, 0.04), m('nose', 1, 0.1, 0.04), m('nose', -1, 0.15, 0.04), m('nose', 1, 0.2, 0.04), m('nose', -1, 0.25, 0.04), m('smile', 1, 0, 0.3)),
    ],
    plucked: [bit('rabbit-ear-points-at-the-note', m('earR', 1, 0, 0.2), m('earL', -0.8, 0, 0.2), m('tilt', 0.4, 0, 0.2))],
    fluttered: [bit('rabbit-ears-flap-like-wings', m('earL', 1, 0, 0.05), m('earR', 1, 0, 0.05), m('earL', -1, 0.06, 0.05), m('earR', -1, 0.06, 0.05), m('earL', 1, 0.12, 0.05), m('earR', 1, 0.12, 0.05), m('lift', 0.3, 0, 0.18), m('tilt', 0.6, 0, 0.06), m('tilt', -0.6, 0.07, 0.06), m('tilt', 0.6, 0.14, 0.06))],
    maneTugged: [bit('rabbit-goes-with-it-on-tiptoe', m('lift', 0.6, 0, 0.3), m('lookY', -1, 0, 0.3), m('earL', -0.7, 0, 0.3))],
    manePoked: [bit('rabbit-ears-do-the-wave', m('earL', 1, 0, 0.08), m('earR', 1, 0.08, 0.08), m('earL', -0.5, 0.16, 0.08), m('earR', -0.5, 0.24, 0.08))],
    frizzed: [bit('rabbit-becomes-a-ball-with-two-ears', m('sink', 0.5, 0, 0.6), m('earL', 1, 0, 0.6), m('earR', 1, 0, 0.6), m('wide', 1, 0, 0.6), m('nose', 1, 0.3, 0.05), m('nose', -1, 0.36, 0.05))],
    cheekPulled: [bit('rabbit-teeth-show-ear-flops', m('mouthOpen', 0.6, 0, 0.2), m('earL', -1, 0, 0.25), m('blink', 1, 0.2, 0.1))],
    airSnipped: [bit('rabbit-vanishes-and-the-ears-come-up-first', m('cross', 1, 0, 0.15), m('sink', 1, 0.05, 0.3), m('earL', 1, 0.35, 0.4), m('earR', 1, 0.45, 0.3), m('wide', 1, 0.6, 0.3), m('lookY', -0.7, 0.6, 0.3))],
    noseTickled: [bit('rabbit-sneeze-flips-an-ear', m('bob', -0.8, 0.1, 0.06), m('earL', -1, 0.1, 0.3), m('blink', 1, 0.1, 0.12), m('nose', 1, 0, 0.1))],
    earTickled: [bit('rabbit-ear-kicks-leg-kicks', m('earR', 1, 0, 0.05), m('earR', -1, 0.06, 0.05), m('earR', 1, 0.12, 0.05), m('earR', -1, 0.18, 0.05), m('bob', 0.4, 0, 0.05), m('bob', 0.4, 0.1, 0.05), m('bob', 0.4, 0.2, 0.05), m('smile', 1, 0, 0.3))],
    chinTickled: [bit('rabbit-stretches-its-neck-out-long', m('lift', 0.5, 0, 0.4), m('tilt', -0.4, 0, 0.4), m('blink', 1, 0, 0.4), m('earL', -1, 0, 0.4), m('earR', -1, 0, 0.4))],
    cheekTickled: [
      bit('rabbit-chittering-giggle', m('mouthOpen', 0.4, 0, 0.04), m('mouthOpen', 0.4, 0.08, 0.04), m('mouthOpen', 0.4, 0.16, 0.04), m('mouthOpen', 0.4, 0.24, 0.04), m('nose', 1, 0, 0.3), m('smile', 1, 0, 0.3)),
      bit('rabbit-hops-a-half-turn-away', m('lift', 0.6, 0, 0.12), m('spin', 0.5, 0, 0.25), m('earL', 1, 0.1, 0.2)),
    ],
    // It loves a head rub: one hind leg kicks by itself and drums on the chair.
    rubLoved: [bit('rabbit-one-hind-leg-kicks-and-drums-on-the-chair', m('bob', 0.4, 0, 0.04), m('bob', 0.4, 0.09, 0.04), m('bob', 0.4, 0.18, 0.04), m('bob', 0.4, 0.27, 0.04), m('bob', 0.4, 0.36, 0.04), m('blink', 1, 0, 0.45), m('earL', -1, 0, 0.45), m('earR', -1, 0, 0.45), m('smile', 1, 0, 0.45), m('foot', 1, 0, 0.05), m('foot', 1, 0.09, 0.05), m('foot', 1, 0.18, 0.05), m('foot', 1, 0.27, 0.05), m('foot', 1, 0.36, 0.05))],
    rubHated: [bit('rabbit-ducks-out-from-under', m('sink', 0.6, 0, 0.15), m('shift', 0.5, 0.05, 0.2), m('earL', -1, 0, 0.3))],
    wearing: [bit('rabbit-tries-to-see-it-with-each-eye', m('tilt', 0.7, 0, 0.14), m('tilt', -0.7, 0.16, 0.14), m('tilt', 0.7, 0.32, 0.14), m('cross', 0.7, 0, 0.45))],
    floorWatched: [bit('rabbit-ear-points-down-at-it', m('earR', -1, 0, 0.3), m('lookY', 1, 0, 0.3), m('nose', 1, 0.1, 0.05), m('nose', -1, 0.16, 0.05))],
    blindfolded: [bit('rabbit-ears-search-the-room-then-it-peeks', m('earL', 1, 0, 0.12), m('earR', -1, 0, 0.12), m('earL', -1, 0.14, 0.12), m('earR', 1, 0.14, 0.12), m('lift', 0.4, 0.3, 0.12), m('mouthOpen', 0.6, 0.32, 0.15), m('brow', 1, 0.3, 0.4))],
    bowLoved: [bit('rabbit-wears-it-between-its-ears', m('earL', 0.6, 0, 0.5), m('earR', 0.6, 0, 0.5), m('smile', 1, 0, 0.5), m('lift', 0.3, 0, 0.1))],
    // It hates a bow: it thumps a hind foot until the bow slides off an ear.
    bowHated: [bit('rabbit-thumps-a-hind-foot-at-it', m('lookY', -1, 0, 0.3), m('bob', 0.6, 0, 0.05), m('bob', 0.6, 0.12, 0.05), m('bob', 0.6, 0.24, 0.05), m('bob', 0.6, 0.36, 0.05), m('earL', -1, 0.1, 0.5), m('brow', -0.8, 0, 0.6), m('tail', 1, 0, 0.5), m('foot', 1, 0, 0.07), m('foot', 1, 0.14, 0.07), m('foot', 1, 0.28, 0.07), m('foot', 1, 0.42, 0.07))],
    friendPulled: [bit('rabbit-eyes-cross-ears-knot', m('cross', 1, 0, 0.3), m('earL', 1, 0, 0.3), m('earR', -1, 0, 0.3))],
    friendSnipped: [bit('rabbit-twitchy-shake-ears-flap', m('tilt', 1, 0, 0.04), m('tilt', -1, 0.05, 0.04), m('tilt', 1, 0.1, 0.04), m('tilt', -1, 0.15, 0.04), m('earL', 1, 0, 0.1), m('earR', 1, 0.1, 0.1))],
    friendPoked: [bit('rabbit-tiny-hum-ear-flick-nose-wiggle', m('earR', -0.8, 0.05, 0.1), m('nose', 1, 0, 0.06), m('nose', -1, 0.07, 0.06), m('smile', 1, 0, 0.2))],
    friendRuffled: [bit('rabbit-chitters-and-drums', m('bob', 0.3, 0, 0.04), m('bob', 0.3, 0.08, 0.04), m('bob', 0.3, 0.16, 0.04), m('mouthOpen', 0.4, 0, 0.2), m('earL', 1, 0, 0.2))],
    holdsBreath: [bit('rabbit-even-the-nose-stops', m('wide', 1, 0, 0.8), m('earL', 1, 0, 0.8), m('earR', 1, 0, 0.8), m('lift', 0.2, 0, 0.8))],
    lockTooLong: [bit('rabbit-spins-like-a-spindle-and-unspins', m('spin', 1, 0, 0.35), m('lift', 0.3, 0, 0.35), m('spin', -1, 0.45, 0.35), m('earL', -1, 0, 0.8), m('wide', 1, 0.45, 0.4), m('cross', 0.8, 0.8, 0.3))],
    stamps: [bit('rabbit-stamps-under-it-three-times', m('foot', 1, 0, 0.05), m('foot', 1, 0.1, 0.05), m('foot', 1, 0.2, 0.05), m('earR', -1, 0, 0.3))],
    lockTooShort: [bit('rabbit-ears-shoot-up-and-one-droops', m('earL', 1, 0, 0.6), m('earR', 1, 0, 0.25), m('earR', -1, 0.3, 0.5), m('wide', 1, 0, 0.3), m('lookY', 1, 0.3, 0.4))],
    lockAsLong: [bit('rabbit-jump-with-a-twist', m('lift', 1, 0, 0.22), m('spin', 1, 0.02, 0.3), m('earL', 1, 0, 0.35), m('earR', 1, 0, 0.35), m('smile', 1, 0, 0.5))],
    // It likes its mane short so the ears stand free: the ears pop up and twirl.
    maneLiked: [bit('rabbit-ears-pop-up-and-twirl', m('earL', 1, 0, 0.1), m('earR', 1, 0.05, 0.1), m('earL', -1, 0.15, 0.1), m('earR', -1, 0.2, 0.1), m('earL', 1, 0.3, 0.1), m('earR', 1, 0.35, 0.1), m('lift', 0.4, 0, 0.45), m('smile', 1, 0, 0.5))],
    // It hates it long: the ears flop like wet socks and it hops in a circle.
    maneHated: [bit('rabbit-ears-flop-and-it-hops-in-a-circle', m('earL', -1, 0, 0.9), m('earR', -1, 0, 0.9), m('lift', 0.5, 0.1, 0.1), m('lift', 0.5, 0.35, 0.1), m('lift', 0.5, 0.6, 0.1), m('spin', 1, 0.1, 0.7), m('brow', -0.7, 0, 0.9))],
    hatOff: [bit('rabbit-ears-spring-out', m('earL', 1, 0, 0.12), m('earR', 1, 0.04, 0.12), m('lift', 0.3, 0, 0.1))],
    sitsDown: [bit('rabbit-lands-and-is-already-looking-round', m('bob', 0.4, 0, 0.06), m('lookX', -1, 0.08, 0.1), m('lookX', 1, 0.2, 0.1))],
    wantsItSo: [bit('rabbit-points-an-ear-at-each', m('earR', -0.8, 0, 0.2), m('lookX', 0.5, 0, 0.2), m('lookY', 1, 0, 0.7), m('earR', 1, 0.25, 0.2), m('lookX', 1, 0.25, 0.2), m('nose', 1, 0.3, 0.05), m('earR', -0.8, 0.5, 0.2), m('lookX', 0.5, 0.5, 0.2))],
    patsItsLock: [bit('rabbit-taps-its-lock-quick', m('paw', 1, 0.05, 0.4), m('pawX', 0.52, 0, 0.5), m('pawY', 1, 0.05, 0.05), m('pawY', 0.92, 0.12, 0.05), m('pawY', 1, 0.19, 0.05), m('pawY', 0.92, 0.26, 0.05), m('pawY', 1, 0.33, 0.05))],
    looksAbout: [bit('rabbit-rocks-quick-and-looks-about', m('bob', 0.5, 0, 0.08), m('bob', 0.5, 0.2, 0.08), m('lookX', -1, 0, 0.2), m('lookX', 1, 0.25, 0.2))],
    ducksAndPeeks: [bit('rabbit-gone-but-for-the-ears', m('sink', 1, 0, 0.5), m('earL', 1, 0, 0.5), m('earR', 1, 0, 0.5))],
    hopsOver: [bit('rabbit-two-bounces-and-there', m('lift', 0.5, 0, 0.06), m('lift', 0.3, 0.12, 0.06), m('earL', -0.6, 0, 0.18))],
    showsAMove: [bit('rabbit-does-it-in-a-blink-then-again', m('lookY', -1, 0, 0.5), m('earL', 1, 0.5, 0.1), m('earR', 1, 0.5, 0.1), m('smile', 1, 0.5, 0.3))],
  },
}

export const PERSONALITIES: Record<CustomerId, Personality> = { lion: LION, poodle: POODLE, yak: YAK, rabbit: RABBIT }

/** How long a bit lasts. */
export function bitLength(b: Bit): number {
  return b.moves.reduce((end, move) => Math.max(end, move.at + move.hold), 0)
}

/** Picks from a list, and never the one picked last from that list, so nothing is done twice running. */
export class Director {
  private readonly last = new Map<readonly Bit[], string>()
  private readonly rng: Rng

  constructor(rng: Rng) {
    this.rng = rng
  }

  pick(bits: readonly Bit[]): Bit {
    if (bits.length === 1) return bits[0]
    const before = this.last.get(bits)
    const choices = bits.filter((b) => b.id !== before)
    const picked = this.rng.pick(choices)
    this.last.set(bits, picked.id)
    return picked
  }
}
