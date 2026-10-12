import type { Who } from './hall'
import type { Kick, Taste } from './natures'
import { eats, eatsOff, tasteOf } from './tastes'
import type { Craft, Thing } from './things'
import type { Sound } from './voices'

// What each fair-goer does with each thing: the twenty cells of the grid's
// second table and the ten tastes, as cues on the seconds of a meeting. A cue
// pushes that fair-goer's own body, makes one sound, and may show the mark
// the reaction leaves. None of it is turned to the child: each does its own
// thing with what it is given.

/** Small things that fly: crumbs, needles, flour, smoke, sparks from the embers. Short-lived views, gone on load. */
export type Puff = { kind: 'crumbs' | 'needles' | 'flour' | 'smoke' | 'sparks'; count: number; onto?: Who }

export type Cue = {
  /** Seconds after the thing is taken. */
  at: number
  sound?: Sound
  kick?: Kick
  /** The mark the reaction leaves shows from here. */
  mark?: true
  /** The thing is eaten or fired out here. */
  gone?: true
  puff?: Puff
  /** One eye goes huge. */
  eye?: true
  /** Something swells: a wax bubble at the goat's mouth, or a swallowed shape going down its neck. */
  swell?: 'bubble' | 'neck'
  /** Another fair-goer is caught up in it: the crumbs land on the goat. */
  also?: { who: Who; kick: Kick }
  /** The cue is about the thing on top of the one given, not the one under it. */
  top?: true
}

const s = (name: Sound['name']): Sound => ({ name } as Sound)

/** The plain reaction of each fair-goer to each craft. */
const CELLS: Record<Who, Record<Craft, (thing: Thing, taste: Taste) => Cue[]>> = {
  maker: {
    // Grips it in her fist.
    candle: () => [{ at: 0, sound: s('grip'), kick: { part: 14, dy: 60 } }],
    // The paper crumples in her fist and springs back creased.
    star: () => [{ at: 0, sound: s('crumple'), kick: { part: 18, squash: -0.8 }, mark: true }, { at: 0.5, sound: s('ping'), kick: { part: -12, brow: 8 } }],
    // A bracelet: she flexes and the twigs burst outward.
    wreath: () => [{ at: 0, sound: s('creak'), kick: { part: 10 } }, { at: 0.45, sound: s('shower'), kick: { part: -16, lean: -1 }, puff: { kind: 'needles', count: 8 } }],
    // Bites it in half with one chomp.
    biscuit: () => [{ at: 0.15, sound: s('crunch'), kick: { open: 14, dy: 120, squash: 1.2 }, mark: true, puff: { kind: 'crumbs', count: 8 } }],
  },
  baker: {
    // Fills his cheeks and blows it out: his moustache streams forward.
    candle: () => [{ at: 0.2, kick: { squash: 2.2, lean: 1 } }, { at: 0.7, sound: s('whoosh'), kick: { lean: -2.2, part: 16, squash: -2 }, mark: true, puff: { kind: 'smoke', count: 4 } }, { at: 1.25, sound: s('pf'), kick: { part: -8 } }],
    // A badge on his hat, and a salute in a puff of flour.
    star: () => [{ at: 0.1, sound: s('patHat'), kick: { part2: 9, dy: 90 } }, { at: 0.5, sound: s('pff'), kick: { dy: -200, lean: 0.8 }, puff: { kind: 'flour', count: 8 } }],
    // A crown, and a waddled two-step.
    wreath: () => [{ at: 0.5, sound: s('footfall'), kick: { lean: -2.4, dy: 80 } }, { at: 0.85, sound: s('footfall'), kick: { lean: 2.4, dy: 80 } }, { at: 1.2, sound: s('bounce'), kick: { dy: -260, squash: 2, part2: 8 } }],
    // Taps it on his teeth, one eye huge, and hums.
    biscuit: () => [{ at: 0.2, sound: s('tok'), kick: { use: 14, open: 6 }, eye: true }, { at: 0.5, sound: s('tok'), kick: { use: 14, open: 6 } }, { at: 0.95, sound: s('hum'), kick: { use: -6, part: 6 } }],
  },
  goat: {
    // Chews it: a wax bubble swells from its mouth and pops.
    candle: () => [{ at: 0.1, sound: s('chewSqueak'), kick: { open: 12, part2: 8 } }, { at: 0.5, sound: s('chewSqueak'), kick: { open: 12 }, swell: 'bubble' }, { at: 1, sound: s('pop'), kick: { dy: -80, part2: 20, lean: -1 }, mark: true }],
    // Eats it point by point; one corner hangs from its mouth.
    star: () => [{ at: 0.1, sound: s('rip'), kick: { lean: 2, open: 12 }, mark: true }, { at: 0.5, sound: s('munch'), kick: { open: 10 } }, { at: 0.9, sound: s('munch'), kick: { open: 10 } }],
    // Turns it in its teeth like a corn cob; needles fly.
    wreath: () => [{ at: 0.1, sound: s('ratchet'), kick: { use: 18, open: 8 }, mark: true, puff: { kind: 'needles', count: 10 } }, { at: 0.6, sound: s('ratchet'), kick: { use: 18 }, puff: { kind: 'needles', count: 6 } }],
    // Swallows it whole; its shape travels down the neck.
    biscuit: () => [{ at: 0.15, sound: s('gulp'), kick: { open: 14, dy: -60 }, gone: true, swell: 'neck' }, { at: 0.9, sound: s('hiccup'), kick: { dy: -200, part2: 18 } }],
  },
  tuba: {
    // Drops it into the bell: the next note comes out stopped, and the candle rattles round.
    candle: (_, taste) => [{ at: 0.2, sound: s('clonk'), kick: { part2: 8 } }, { at: 0.7, sound: { name: 'tune', holds: 'candle', taste, step: 0 }, kick: { part: 16, dy: -60 } }, { at: 1.1, sound: s('buzz'), kick: { use: 16, part2: 6 } }],
    // Hangs it on the rim of the bell: when he plays it spins like a windmill.
    star: (_, taste) => [{ at: 0.7, sound: { name: 'tune', holds: 'star', taste, step: 0 }, kick: { part: 16 } }, { at: 0.9, sound: s('whirr'), kick: { use: 30 } }],
    // Lays it over the bell: three soft round notes, a needle falling on each.
    wreath: (_, taste) => [0, 1, 2].map((step) => ({ at: 0.7 + step * 0.45, sound: { name: 'tune', holds: 'wreath', taste, step } as Sound, kick: { part: 10, brow: step === 0 ? 6 : 0 }, puff: { kind: 'needles', count: 2 } as Puff })),
    // Drops it into the bell: the honk fires it out in a cloud of crumbs that lands on the goat.
    biscuit: (_, taste) => [{ at: 0.2, sound: s('dunk'), kick: { part2: 8 } }, { at: 0.7, sound: { name: 'tune', holds: 'biscuit', taste, step: 0 }, kick: { part: 20, dy: -120, part2: 14 }, gone: true, puff: { kind: 'crumbs', count: 12, onto: 'goat' } }, { at: 1.3, sound: s('patter'), also: { who: 'goat', kick: { part2: 16, lean: 1 } } }],
  },
  bundle: {
    // A staff in both mittens. A thin one it twirls.
    candle: (_, taste) => [{ at: 0.1, sound: s('thump'), kick: { dy: 200, squash: -2 } }, ...(taste === 'like' ? [{ at: 0.5, sound: s('swish'), kick: { use: 20 } }, { at: 0.85, sound: s('swish'), kick: { use: 20 } }] : [])],
    // It sticks to the brow of the scarf and both eyes cross to look at it.
    star: () => [{ at: 0.15, sound: s('ting'), kick: { squash: -2, part2: -8 } }],
    // A crown that slides down over the eyes.
    wreath: () => [{ at: 0.15, sound: s('fump'), kick: { squash: -4, dy: 160 } }],
    // Nibbles it under the scarf, which bulges.
    biscuit: () => [0, 1, 2, 3].map((n) => ({ at: 0.2 + n * 0.2, sound: s('nibble'), kick: { squash: -1.5, part: 6 }, ...(n === 0 ? { mark: true as const } : {}) })),
  },
}

/** What a taste adds, once the plain reaction is over: the like and the dislike of each, in its own body and voice. The tuba's is in his tune. */
const TASTES: Record<Who, Record<'like' | 'dislike', Cue[]>> = {
  maker: {
    like: [{ at: 0, sound: s('proud'), kick: { dy: -260, brow: 6, part2: 10 } }],
    dislike: [{ at: 0, sound: s('droop'), kick: { lean: 1.2, brow: 5, use: 8 } }],
  },
  baker: {
    like: [{ at: 0, sound: s('mmm'), kick: { dy: -200, part2: 10, part: 8 } }],
    dislike: [{ at: 0, sound: s('bleh'), kick: { lean: 2.4, part: -14, squash: 1 } }],
  },
  goat: {
    like: [{ at: 0, sound: s('purr'), kick: { lean: -1, part2: -6 } }],
    // Gold makes it sneeze; it shakes its ears and goes on chewing.
    dislike: [{ at: 0, sound: s('sneeze'), kick: { lean: 6, dy: -200, part2: 30, open: 14 } }, { at: 0.45, sound: s('flap'), kick: { part2: -30 } }],
  },
  tuba: {
    like: [{ at: 0, kick: { brow: 5 } }],
    dislike: [{ at: 0, kick: { brow: -12, part2: 6 } }],
  },
  bundle: {
    like: [{ at: 0, sound: s('squee'), kick: { dy: -420, squash: -3, part2: 12 } }, { at: 0.3, sound: s('squee'), kick: { dy: -420, part2: 12 } }],
    // A large thing tips it over backwards; it rocks like a tumbler toy and comes up again.
    dislike: [{ at: 0, sound: s('whoa'), kick: { lean: 16 } }, { at: 0.5, sound: s('thud'), kick: { squash: -3 } }],
  },
}

/** Seconds from the moment a thing is let go on a fair-goer to the moment it has it in hand. */
export const TAKE_SECONDS = 0.35
/** Seconds the plain reaction of a cell has before the taste follows it. */
const CELL_SECONDS = 1.9
/** And the seconds the thing on top has, when a pair is given. */
const TOP_SECONDS = 1.3

/** The plain reaction to one craft, by itself. */
export function cellOf(who: Who, thing: Thing, taste: Taste): Cue[] {
  return CELLS[who][thing.craft](thing, taste)
}

/**
 * The whole reaction to a thing, as cues counted from the moment it is taken: the thing on top first, when
 * there is one, then the thing itself, then what the fair-goer's taste for it adds. The taste goes by the
 * thing itself.
 */
export function reactionOf(who: Who, thing: Thing): Cue[] {
  const taste = tasteOf(who, thing)
  const cues: Cue[] = []
  let from = 0
  if (thing.on) {
    // The goat eats a star off what it sits on: where the star alone would be left chewed, here it goes.
    const off = eatsOff(who, thing.on.craft) && !eats(who, thing.on.craft)
    for (const cue of cellOf(who, thing.on, 'plain')) if (cue.at < TOP_SECONDS) cues.push(off && cue.mark ? { ...cue, mark: undefined, gone: true, top: true } : { ...cue, top: true })
    from = TOP_SECONDS
  }
  for (const cue of cellOf(who, thing, taste)) cues.push({ ...cue, at: cue.at + from })
  if (taste !== 'plain') for (const cue of TASTES[who][taste]) cues.push({ ...cue, at: cue.at + from + CELL_SECONDS })
  return cues
}

/** Seconds a meeting lasts, from the thing let go to the settled pose. */
export function meetingSeconds(who: Who, thing: Thing): number {
  const last = reactionOf(who, thing).reduce((end, cue) => Math.max(end, cue.at), 0)
  return Math.max(2, TAKE_SECONDS + last + 0.9)
}
