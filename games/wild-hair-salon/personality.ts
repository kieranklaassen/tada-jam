import type { Rng } from './rng'

// How a customer moves like itself. A personality is a tempo, a weight (the
// springs its body rides on) and a list of small bits of business, each a
// list of timed moves on the parts of a face and body. The lion is slow and
// heavy and his funniest part is his tail tuft; he is the one customer the
// toy shows, so his is the one personality here. A director picks what he
// does next from a list and never the same thing twice running.

/** The parts a bit can move. Each is one number the puppet eases towards. */
export const PARTS = ['blink', 'lookX', 'lookY', 'cross', 'wide', 'earL', 'earR', 'tail', 'mouthOpen', 'smile', 'brow', 'tilt', 'bob', 'sink', 'nose'] as const
export type Part = (typeof PARTS)[number]

/** One part driven to a value, from `at` seconds into the bit, for `hold` seconds; then it goes back to rest. */
export type Move = { part: Part; to: number; at: number; hold: number }
export type Bit = { id: string; moves: readonly Move[] }

const move = (part: Part, to: number, at: number, hold: number): Move => ({ part, to, at, hold })

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
  /** What it does when nobody touches it. */
  idle: readonly Bit[]
  /** What it does about each thing that happens to it. Where there are several, a different one each time. */
  reactions: Record<string, readonly Bit[]>
}

export const LION: Personality = {
  rest: { smile: 0.25 },
  breath: 3.6,
  stiffness: 46,
  damping: 7.5,
  quick: 240,
  gap: [1.6, 3.4],
  idle: [
    { id: 'slow-blink', moves: [move('blink', 1, 0, 0.32)] },
    { id: 'two-blinks', moves: [move('blink', 1, 0, 0.12), move('blink', 1, 0.3, 0.12)] },
    { id: 'left-ear-flick', moves: [move('earL', 1, 0, 0.1), move('earL', -0.4, 0.14, 0.08)] },
    { id: 'right-ear-flick', moves: [move('earR', 1, 0, 0.1), move('earR', -0.4, 0.14, 0.08)] },
    { id: 'tail-swish', moves: [move('tail', 1, 0, 0.7), move('tail', -0.7, 0.8, 0.6)] },
    { id: 'tail-thump', moves: [move('tail', -1, 0, 0.25), move('tail', 0.5, 0.3, 0.2), move('bob', 0.15, 0.3, 0.12)] },
    { id: 'big-yawn', moves: [move('mouthOpen', 1, 0.2, 1.3), move('blink', 1, 0.3, 1.2), move('tilt', -0.5, 0.2, 1.3), move('earL', -0.6, 0.3, 1.1), move('earR', -0.6, 0.3, 1.1)] },
    { id: 'looks-at-his-lock', moves: [move('lookX', 0.6, 0, 1.4), move('lookY', 1, 0, 1.4), move('brow', -0.4, 0.2, 1.0)] },
    { id: 'looks-up-at-his-mane', moves: [move('lookY', -1, 0, 1.1), move('cross', 0.5, 0.1, 0.9), move('brow', 0.6, 0, 1.1)] },
    { id: 'whisker-twitch', moves: [move('nose', 1, 0, 0.12), move('nose', -1, 0.16, 0.12), move('nose', 1, 0.32, 0.1)] },
  ],
  reactions: {
    // His hair is caught: he looks to see who has it.
    caught: [{ id: 'eyes-go-to-the-finger', moves: [move('wide', 0.6, 0, 0.5), move('brow', 0.7, 0, 0.5)] }],
    pulled: [{ id: 'leans-after-it', moves: [move('wide', 0.4, 0, 0.4), move('mouthOpen', 0.3, 0, 0.3)] }],
    snipped: [
      { id: 'blinks-and-jumps', moves: [move('blink', 1, 0, 0.14), move('bob', -0.6, 0, 0.1), move('earL', 1, 0, 0.2), move('earR', 1, 0, 0.2)] },
      { id: 'slow-chuckle', moves: [move('smile', 1, 0, 0.9), move('mouthOpen', 0.5, 0.05, 0.2), move('mouthOpen', 0.5, 0.35, 0.2), move('bob', 0.3, 0.05, 0.15), move('bob', 0.3, 0.35, 0.15)] },
    ],
    plucked: [{ id: 'ear-follows-the-note', moves: [move('earR', 1, 0, 0.3), move('lookX', 0.7, 0, 0.6), move('lookY', 0.8, 0, 0.6)] }],
    fluttered: [{ id: 'head-wobbles', moves: [move('tilt', 0.7, 0, 0.12), move('tilt', -0.7, 0.14, 0.12), move('tilt', 0.4, 0.28, 0.12), move('wide', 0.5, 0, 0.4)] }],
    maneTugged: [{ id: 'looks-up-cross-eyed', moves: [move('lookY', -1, 0, 0.7), move('cross', 0.8, 0, 0.7), move('brow', 0.8, 0, 0.7)] }],
    manePoked: [{ id: 'eyes-follow-the-ripple', moves: [move('lookY', -0.8, 0, 0.5), move('lookX', -0.8, 0, 0.25), move('lookX', 0.8, 0.25, 0.25)] }],
    frizzed: [{ id: 'eyes-wide-under-the-ball', moves: [move('wide', 1, 0, 1.1), move('mouthOpen', 0.6, 0, 0.7), move('earL', 1, 0, 0.9), move('earR', 1, 0, 0.9)] }],
    cheekPulled: [{ id: 'cheek-wobbles-back', moves: [move('blink', 1, 0, 0.2), move('tilt', -0.6, 0, 0.1), move('tilt', 0.5, 0.12, 0.1), move('mouthOpen', 0.7, 0, 0.25)] }],
    airSnipped: [{ id: 'cross-eyed-ducks-and-peeks', moves: [move('cross', 1, 0, 0.5), move('wide', 1, 0, 0.5), move('sink', 1, 0.2, 0.9), move('blink', 1, 0.3, 0.35), move('brow', 1, 0.7, 0.5), move('lookY', -0.6, 0.7, 0.5)] }],
    // A giggle is different on the nose, an ear and the chin.
    noseTickled: [{ id: 'snort-and-nose-wiggle', moves: [move('nose', 1, 0, 0.1), move('nose', -1, 0.12, 0.1), move('cross', 0.9, 0, 0.4), move('blink', 1, 0.42, 0.14), move('bob', -0.5, 0.42, 0.12), move('mouthOpen', 0.5, 0.42, 0.2)] }],
    earTickled: [{ id: 'ear-flaps-head-tips', moves: [move('earL', 1, 0, 0.08), move('earL', -1, 0.1, 0.08), move('earL', 1, 0.2, 0.08), move('earR', 1, 0.05, 0.08), move('earR', -1, 0.15, 0.08), move('tilt', 0.9, 0, 0.5), move('smile', 1, 0, 0.6)] }],
    chinTickled: [{ id: 'chin-up-rumbling', moves: [move('tilt', -0.3, 0, 0.8), move('bob', -0.8, 0, 0.8), move('blink', 1, 0.05, 0.8), move('smile', 1, 0, 0.9), move('tail', 1, 0, 0.4), move('tail', -1, 0.45, 0.4)] }],
    cheekTickled: [
      { id: 'deep-giggle', moves: [move('smile', 1, 0, 0.7), move('mouthOpen', 0.6, 0, 0.18), move('mouthOpen', 0.6, 0.26, 0.18), move('bob', 0.4, 0, 0.14), move('bob', 0.4, 0.26, 0.14), move('blink', 1, 0, 0.5)] },
      { id: 'shy-giggle', moves: [move('smile', 1, 0, 0.8), move('lookX', -0.9, 0, 0.6), move('lookY', 0.6, 0, 0.6), move('tilt', 0.5, 0, 0.6), move('mouthOpen', 0.3, 0.1, 0.2)] },
    ],
    // He loves a head rub: he purrs and melts down in the chair.
    rubbed: [{ id: 'purrs-and-melts', moves: [move('blink', 1, 0, 0.9), move('smile', 1, 0, 0.9), move('sink', 0.55, 0, 0.9), move('tilt', 0.35, 0, 0.9), move('tail', 0.6, 0, 0.9), move('earL', -0.5, 0, 0.9), move('earR', -0.5, 0, 0.9)] }],
    // A piece stuck on his face: he tries to look at it.
    wearing: [{ id: 'squints-at-what-he-wears', moves: [move('cross', 1, 0.1, 0.9), move('lookY', 0.4, 0.1, 0.9), move('brow', 0.8, 0.1, 0.9), move('nose', 1, 0.5, 0.1), move('nose', -1, 0.62, 0.1)] }],
    floorWatched: [{ id: 'peers-over-the-cape', moves: [move('lookY', 1, 0, 0.7), move('tilt', 0.4, 0, 0.7), move('brow', 0.5, 0, 0.7)] }],
  },
}

/** How long a bit lasts. */
export function bitLength(bit: Bit): number {
  return bit.moves.reduce((end, m) => Math.max(end, m.at + m.hold), 0)
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
    const choices = bits.filter((bit) => bit.id !== before)
    const bit = this.rng.pick(choices)
    this.last.set(bits, bit.id)
    return bit
  }
}
