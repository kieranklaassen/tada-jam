// What an animal that needs nothing does with a thing it is given: the toy
// (ART.md, "The toy" and "The characters and their fixed tastes"). A reaction
// is a list of timed keys for the animal's whole sticker and for the thing,
// in beats, played in the animal's own beat and ease (motion.ts). Each animal
// has a reaction of its own to the thing it loves and to the thing it is wary
// of; every other pair plays one of two reactions to that thing, in that
// animal's timing, and never the same one twice running.
//
// No taste reaction uses the place and movement of a sign (a held-up paw, a
// shiver, a scratch, a droop, a hide), so a well animal never looks as if it
// had a need. Pure: no renderer, no DOM, no clock.

import { taste, type Species, type Taste } from './cast'
import { REST, beatSeconds, ease, type Face, type Pose } from './motion'
import type { Care } from './needs'

/** A place on the animal that a thing can be held to. `seat` is where it sits. */
export type Anchor = 'head' | 'mouth' | 'lap' | 'back' | 'seat'

/** The invented voice an animal answers with. */
export type CallMood = 'glad' | 'wow' | 'bliss' | 'wary' | 'hum'

type AnimalKey = { t: number } & Pose

export type ThingKey = {
  t: number
  at: Anchor
  dx: number
  dy: number
  rot: number
  size: number
  /** Drawn in front of the animal, or behind it. */
  front: boolean
  /** How much it moves with the animal's own offset and tilt, 0 or 1. */
  ride: number
}

export type Cue = { t: number; call?: CallMood; drops?: number; thump?: number }

/**
 * A paw the animal uses in a reaction of its own, as keys in beats: where its
 * wrist is from where a paw joins the body (the animal's side), and its turn.
 * It shows from its first key to its last. It is a paw doing something, at
 * the thing; no reaction holds a paw up at the animal's side as a sign does.
 */
export type PawKey = { t: number; x: number; y: number; rot: number }

export type Reaction = {
  id: string
  care: Care
  /** How many beats it lasts. */
  beats: number
  animal: readonly AnimalKey[]
  thing: readonly ThingKey[]
  /** Spans of beats in which the animal is out of sight under the thing. */
  hidden: readonly (readonly [number, number])[]
  /** The blanket is spread out, and until this beat it is as large as the animal it covers. */
  open: boolean
  coversUntil: number
  cues: readonly Cue[]
  paw: readonly PawKey[]
  /** With the bowl: the animal puts its mouth to the water in this reaction, so foam in the bowl leaves it a beard. */
  drinks: boolean
}

const a = (t: number, x: number, y: number, rot: number, sx: number, sy: number, face: Face): AnimalKey => ({ t, x, y, rot, sx, sy, face })
const rest = (t: number, face: Face = 'calm'): AnimalKey => ({ ...REST, t, face })
const k = (t: number, at: Anchor, dx: number, dy: number, rot = 0, size = 1, front = true, ride = 1): ThingKey => ({ t, at, dx, dy, rot, size, front, ride })
const TURN = Math.PI * 2, OVER = Math.PI

function reaction(id: string, care: Care, beats: number, animal: AnimalKey[], thing: ThingKey[], cues: Cue[], more: Partial<Pick<Reaction, 'hidden' | 'open' | 'coversUntil' | 'paw' | 'drinks'>> = {}): Reaction {
  return { id, care, beats, animal: [rest(0), ...animal, rest(beats)], thing, cues, hidden: more.hidden ?? [], open: more.open ?? false, coversUntil: more.coversUntil ?? 0, paw: more.paw ?? [], drinks: more.drinks ?? false }
}

/** The same reaction played in another number of beats, so that an animal's own scene lasts four to six seconds in its own beat. */
function over(beats: number, given: Reaction): Reaction {
  const by = beats / given.beats
  return {
    ...given,
    beats,
    animal: given.animal.map((key) => ({ ...key, t: key.t * by })),
    thing: given.thing.map((key) => ({ ...key, t: key.t * by })),
    cues: given.cues.map((cue) => ({ ...cue, t: cue.t * by })),
    hidden: given.hidden.map(([from, to]) => [from * by, to * by] as const),
    coversUntil: given.coversUntil * by,
    paw: given.paw.map((key) => ({ ...key, t: key.t * by })),
  }
}

/** The two reactions every animal has to each thing it neither loves nor distrusts. */
const PLAIN: Readonly<Record<Care, readonly [Reaction, Reaction]>> = {
  bowl: [
    reaction('bowl-sip-and-shake', 'bowl', 6,
      [a(0.6, 0, 10, 0.1, 1, 0.93, 'calm'), a(1.4, 0, 10, 0.1, 1, 0.93, 'bliss'), a(2.2, 0, 10, 0.1, 1, 0.93, 'bliss'), a(2.8, 0, -6, 0, 1, 1.05, 'glad'), a(3.4, 0, 0, -0.09, 1, 1, 'glad'), a(3.8, 0, 0, 0.09, 1, 1, 'glad'), a(4.2, 0, 0, -0.07, 1, 1, 'glad'), rest(5, 'glad')],
      [k(0, 'lap', 0, -10, 0, 1, true, 0)],
      [{ t: 1, call: 'bliss' }, { t: 2.9, call: 'glad' }, { t: 3.4, drops: 3 }],
      { drinks: true }),
    reaction('bowl-as-a-hat', 'bowl', 6.5,
      [a(0.8, 0, 0, 0, 1.04, 0.9, 'wow'), a(1.4, 0, 0, 0, 1, 1.03, 'wow'), a(2.2, 0, 0, 0.12, 1, 1, 'wow'), a(3, 0, 0, -0.12, 1, 1, 'glad'), a(3.6, 0, 0, 0.2, 1, 1, 'glad'), rest(4.6, 'glad')],
      [k(0, 'lap', 0, -10, 0, 1, true, 0), k(0.8, 'head', 0, -10, OVER), k(3.6, 'head', 0, -10, OVER), k(4.4, 'lap', 0, -10, TURN, 1, true, 0), k(4.4, 'lap', 0, -10, 0, 1, true, 0)],
      [{ t: 0.9, call: 'wow' }, { t: 1, drops: 4 }, { t: 3.7, call: 'glad' }]),
  ],
  blanket: [
    reaction('blanket-ghost-scoots-and-peeks', 'blanket', 7,
      [a(0.5, 0, 0, 0, 1, 0.9, 'calm'), a(1.2, -40, 0, -0.06, 1, 0.9, 'calm'), a(2, 40, 0, 0.06, 1, 0.9, 'calm'), a(2.8, -25, 0, 0, 1, 0.9, 'calm'), a(3.4, 0, 0, 0, 1, 0.85, 'calm'), a(3.9, 0, -26, 0, 1, 1.08, 'glad'), rest(4.8, 'glad')],
      [k(0, 'seat', 0, 0), k(3.6, 'seat', 0, 0), k(4.2, 'lap', 0, 30, 0, 0.62)],
      [{ t: 1.2, call: 'hum' }, { t: 4, call: 'glad' }],
      { hidden: [[0.5, 3.8]], open: true, coversUntil: 3.6 }),
    reaction('blanket-cape-two-hops', 'blanket', 6,
      [a(0.5, 0, 0, 0, 1, 0.92, 'calm'), a(1, 0, -34, 0, 1, 1.06, 'glad'), a(1.5, 0, 0, 0, 1, 0.92, 'glad'), a(2, 0, -34, 0, 1, 1.06, 'glad'), a(2.5, 0, 0, 0, 1, 0.94, 'glad'), a(3.2, 14, 0, 0.1, 1, 1, 'bliss'), a(4, -14, 0, -0.1, 1, 1, 'bliss'), rest(5, 'glad')],
      [k(0, 'back', 0, 0, 0, 0.8, false), k(4.2, 'back', 0, 0, 0, 0.8, false), k(5, 'lap', 0, 30, 0, 0.62)],
      [{ t: 1, call: 'glad' }, { t: 3.2, call: 'bliss' }],
      { open: true }),
  ],
  plaster: [
    reaction('plaster-on-the-nose-shaken-down-to-the-belly', 'plaster', 5.5,
      [a(0.3, 0, 0, 0, 1, 1.04, 'wow'), a(1.5, 0, 0, 0, 0.97, 1, 'wow'), a(2, 0, 0, 0.12, 1, 1, 'wow'), a(2.4, 0, 0, -0.12, 1, 1, 'wow'), a(2.8, 0, 0, 0.1, 1, 1, 'wow'), a(3.4, 0, -10, 0, 1, 1, 'glad'), rest(4.2, 'glad')],
      [k(0, 'mouth', 0, -8, 0.22), k(1.6, 'mouth', 0, -8, 0.22), k(2.2, 'mouth', 0, -8, 0.5), k(2.6, 'mouth', 0, -8, -0.3), k(3.2, 'lap', 0, -46, -0.3)],
      [{ t: 0.4, call: 'wow' }, { t: 3.4, call: 'glad' }]),
    reaction('plaster-badge-chest-out', 'plaster', 5,
      [a(0.5, 0, 6, 0, 1, 0.95, 'calm'), a(1.4, 0, 6, 0, 1, 0.95, 'calm'), a(2.2, 0, -6, 0, 1.08, 1.04, 'glad'), a(3.4, 0, -6, 0, 1.08, 1.04, 'glad'), rest(4.2, 'glad')],
      [k(0, 'lap', 0, -46, -0.3)],
      [{ t: 0.6, call: 'hum' }, { t: 2.3, call: 'glad' }]),
  ],
  brush: [
    reaction('brush-over-the-head-fluffed', 'brush', 6.5,
      [a(0.5, 0, 0, -0.07, 1, 1, 'bliss'), a(1, 0, 0, 0.07, 1, 1, 'bliss'), a(2, 0, 0, -0.07, 1, 1, 'bliss'), a(3, 0, 0, 0.07, 1, 1, 'bliss'), a(3.8, 0, 0, 0, 1.07, 1.03, 'bliss'), a(5.2, 0, 0, 0, 1.07, 1.03, 'glad'), rest(6, 'glad')],
      [k(0, 'head', -46, 10, -0.5), k(1, 'head', 46, 10, 0.5), k(2, 'head', -46, 10, -0.5), k(3, 'head', 46, 10, 0.5), k(4, 'lap', 0, 0, 0, 1, true, 0)],
      [{ t: 0.6, call: 'bliss' }, { t: 3.9, call: 'glad' }]),
    reaction('brush-moustache-wiggle', 'brush', 5,
      [a(0.4, 0, 0, 0, 1, 1.04, 'wow'), a(1.2, 0, 0, 0.1, 1, 1, 'glad'), a(1.8, 0, 0, -0.1, 1, 1, 'glad'), a(2.4, 0, 0, 0.08, 1, 1, 'glad'), a(3, 0, -12, 0, 1, 1.05, 'glad'), rest(3.8, 'glad')],
      [k(0, 'mouth', 0, -6), k(2.8, 'mouth', 0, -6), k(3.4, 'lap', 0, 0, 0, 1, true, 0)],
      [{ t: 0.5, call: 'wow' }, { t: 1.3, call: 'glad' }]),
  ],
  basket: [
    reaction('basket-hop-in-and-settle', 'basket', 6,
      [a(0.5, 0, 0, 0, 1, 0.9, 'calm'), a(1.1, 0, -44, 0, 1, 1.08, 'glad'), a(1.7, 0, 4, 0, 1, 0.88, 'glad'), a(2.3, 0, 0, 0, 1, 1, 'glad'), a(3, 0, 0, 0.08, 1, 1, 'bliss'), a(3.7, 0, 0, -0.08, 1, 1, 'bliss'), a(4.4, 0, 0, 0.05, 1, 1, 'bliss'), rest(5.2, 'bliss')],
      [k(0, 'seat', 0, 0, 0, 1, true, 0)],
      [{ t: 1.1, call: 'glad' }, { t: 1.7, thump: 1 }, { t: 3, call: 'bliss' }]),
    reaction('basket-over-the-eyes-peek', 'basket', 6.5,
      [a(0.4, 0, 0, 0, 1, 0.93, 'wow'), a(1.8, 0, 0, 0, 1, 0.93, 'wow'), a(2.6, 0, 0, 0, 1, 1.03, 'glad'), a(3.4, 0, 0, 0, 1, 0.97, 'wow'), a(4.2, 0, 0, 0, 1, 1.03, 'glad'), a(4.8, 0, 0, -0.14, 1, 1, 'glad'), rest(5.6, 'glad')],
      [k(0, 'head', 0, 20, OVER), k(1.8, 'head', 0, 20, OVER), k(2.6, 'head', 0, -30, OVER), k(3.4, 'head', 0, 20, OVER), k(4.2, 'head', 0, -30, OVER), k(5, 'seat', 0, 0, TURN, 1, true, 0), k(5, 'seat', 0, 0, 0, 1, true, 0)],
      [{ t: 0.5, call: 'wow' }, { t: 2.7, call: 'glad' }, { t: 4.3, call: 'glad' }]),
  ],
}

/** What each animal does with the one thing it loves. The same every time: a child can find it and show it. */
const LOVED: Readonly<Record<Species, Reaction>> = {
  bear: over(8, reaction('bear-wears-the-basket-as-trousers', 'basket', 9,
    [a(0.6, 0, 0, 0, 1, 0.88, 'glad'), a(1.4, 0, -30, 0, 1, 1.06, 'glad'), a(2, 0, 2, 0, 1, 0.9, 'glad'), a(2.8, 0, -40, 0, 1, 1.03, 'glad'), a(3.6, 22, -40, 0.1, 1, 1, 'glad'), a(4.4, -22, -40, -0.1, 1, 1, 'glad'), a(5.2, 22, -40, 0.1, 1, 1, 'glad'), a(6, 0, -40, 0, 1, 1, 'bliss'), a(6.8, 0, 3, 0, 1, 0.9, 'bliss'), rest(7.6, 'bliss')],
    [k(0, 'seat', 0, 0)],
    [{ t: 0.7, call: 'glad' }, { t: 2, thump: 1 }, { t: 2.9, call: 'glad' }, { t: 6.8, thump: 1 }, { t: 6.9, call: 'bliss' }])),
  rabbit: reaction('rabbit-tunnels-the-blanket-end-to-end', 'blanket', 8,
    [a(0.4, 0, 0, 0, 1, 0.8, 'calm'), a(2.2, 104, 0, 0, 1, 0.8, 'calm'), a(2.5, 108, -30, 0, 1, 1.1, 'glad'), a(3, 104, 0, 0, 1, 0.85, 'glad'), a(4.6, -104, 0, 0, 1, 0.8, 'calm'), a(4.9, -108, -30, 0, 1, 1.1, 'glad'), a(5.6, -60, 0, 0, 1, 1, 'glad'), a(6.4, 0, -16, 0, 1, 1, 'glad'), rest(7, 'bliss')],
    [k(0, 'seat', 0, 0), k(5.6, 'seat', 0, 0), k(6.6, 'lap', 0, 24, 0, 0.62)],
    [{ t: 0.5, call: 'hum' }, { t: 2.5, call: 'glad' }, { t: 4.9, call: 'glad' }, { t: 7, call: 'bliss' }],
    { hidden: [[0.4, 2.2], [3, 4.6]], open: true, coversUntil: 5.6 }),
  cat: reaction('cat-rubs-both-cheeks-along-the-brush', 'brush', 8,
    [a(0.8, 16, 0, 0.12, 1, 1, 'bliss'), a(1.6, 22, -6, 0.16, 1, 1, 'bliss'), a(2.4, 14, 4, 0.1, 1, 1, 'bliss'), a(3, 0, 0, 0, 1, 1, 'bliss'), a(4.2, -16, 0, -0.12, 1, 1, 'bliss'), a(5, -22, -6, -0.16, 1, 1, 'bliss'), a(5.8, -14, 4, -0.1, 1, 1, 'bliss'), rest(6.6, 'bliss')],
    [k(0, 'mouth', 58, 10, -0.25, 1, true, 0), k(3, 'mouth', 58, 10, -0.25, 1, true, 0), k(3.6, 'mouth', -58, 10, 0.25, 1, true, 0), k(6.4, 'mouth', -58, 10, 0.25, 1, true, 0), k(7, 'lap', 0, 0, 0, 1, true, 0)],
    [{ t: 1, call: 'bliss' }, { t: 4.4, call: 'bliss' }]),
  dog: reaction('dog-drinks-half-and-wears-the-rest', 'bowl', 8,
    [a(0.3, 0, 14, 0, 1, 0.88, 'glad'), a(0.7, 0, 8, 0, 1, 0.92, 'glad'), a(1.1, 0, 14, 0, 1, 0.88, 'glad'), a(1.5, 0, 8, 0, 1, 0.92, 'glad'), a(1.9, 0, 14, 0, 1, 0.88, 'glad'), a(2.5, 0, 0, 0, 1, 1, 'glad'), a(3.2, 0, 0, 0, 1.04, 0.9, 'wow'), a(3.8, 0, 0, 0, 1, 1.05, 'glad'), a(4.3, 0, 0, 0.12, 1, 1, 'glad'), a(4.6, 0, 0, -0.12, 1, 1, 'glad'), a(4.9, 0, 0, 0.12, 1, 1, 'glad'), a(5.2, 0, 0, -0.12, 1, 1, 'glad'), a(5.5, 0, -14, 0.1, 1, 1, 'glad'), rest(6.4, 'glad')],
    [k(0, 'lap', 0, -6, 0, 1, true, 0), k(2.6, 'lap', 0, -6, 0, 1, true, 0), k(3.2, 'head', 0, -4, OVER), k(5.4, 'head', 0, -4, OVER), k(6, 'lap', 30, 0, TURN + 0.5, 1, true, 0), k(6.4, 'lap', 30, 0, TURN, 1, true, 0), k(6.4, 'lap', 30, 0, 0, 1, true, 0)],
    [{ t: 0.4, call: 'hum' }, { t: 3.3, call: 'wow' }, { t: 3.3, drops: 5 }, { t: 3.9, call: 'glad' }, { t: 4.6, drops: 4 }],
    { drinks: true }),
  hedgehog: over(8.6, reaction('hedgehog-marches-and-spins-with-its-flag', 'plaster', 7,
    [a(0.4, 0, -10, 0, 1, 1, 'glad'), a(0.8, 0, 0, 0.08, 1, 1, 'glad'), a(1.2, 0, -10, 0, 1, 1, 'glad'), a(1.6, 0, 0, -0.08, 1, 1, 'glad'), a(2, 0, -10, 0, 1, 1, 'glad'), a(2.4, 0, 0, 0.08, 1, 1, 'glad'), a(2.8, 0, -10, 0, 1, 1, 'glad'), a(3.2, 0, 0, 0, 1, 1, 'glad'), a(4.6, 0, -8, TURN, 1, 1, 'glad'), a(4.6, 0, -8, 0, 1, 1, 'glad'), a(5, 0, 0, 0, 1, 1, 'bliss'), rest(6, 'bliss')],
    // Its flag stands up from its spines, leaning: never bolt upright.
    [k(0, 'head', 0, -18, -1.25)],
    [{ t: 0.4, call: 'glad' }, { t: 0.8, thump: 1 }, { t: 1.6, thump: 1 }, { t: 2.4, thump: 1 }, { t: 3.3, call: 'glad' }, { t: 5.1, call: 'bliss' }])),
  duck: reaction('duck-sails-the-bowl', 'bowl', 9,
    [a(0.5, 0, 0, 0, 1, 0.9, 'calm'), a(1.1, 0, -30, 0, 1, 1.08, 'glad'), a(1.7, 0, 8, 0, 1, 0.9, 'glad'), a(2.3, 0, 6, 0, 1, 1, 'bliss'), a(3.3, 40, 6, 0.12, 1, 1, 'bliss'), a(4.5, -40, 6, -0.12, 1, 1, 'bliss'), a(5.7, 30, 6, 0.1, 1, 1, 'bliss'), a(6.7, 0, 6, 0, 1, 1, 'bliss'), a(7.2, 0, 6, 0, 1, 0.93, 'glad'), a(7.6, 0, 6, 0, 1, 1.04, 'glad'), rest(8.2, 'glad')],
    [k(0, 'seat', 0, 6)],
    [{ t: 1.1, call: 'glad' }, { t: 1.8, drops: 3 }, { t: 2.4, call: 'bliss' }, { t: 6.8, call: 'bliss' }]),
}

/** What each animal does with the one thing it is wary of. Startled or cross at the thing, never hurt, never at the child. */
const WARY: Readonly<Record<Species, Reaction>> = {
  bear: reaction('bear-is-ticklish-a-giggle-rolls-down', 'brush', 8,
    [a(0.5, -8, 0, -0.08, 1, 1, 'wary'), a(1.2, -8, 0, -0.1, 1, 1, 'wary'), a(1.8, -4, 0, 0, 1.06, 0.95, 'glad'), a(2.2, -4, 0, 0, 0.96, 1.05, 'glad'), a(2.6, -4, 0, 0, 1.06, 0.95, 'glad'), a(3, -4, 0, 0, 0.96, 1.05, 'glad'), a(3.4, -2, 0, 0, 1.05, 0.96, 'glad'), a(3.8, -2, 0, 0, 0.97, 1.04, 'glad'), a(4.2, 0, 0, 0, 1.03, 0.98, 'glad'), a(4.6, 0, 0, 0, 0.99, 1.02, 'glad'), a(5.4, 0, 0, 0, 1, 1, 'glad'), rest(6.4, 'wary')],
    [k(0, 'lap', -30, -70, -0.4, 1, true, 0), k(0.8, 'lap', 30, -50, 0.4, 1, true, 0), k(1.6, 'lap', -30, -70, -0.4, 1, true, 0), k(2.4, 'lap', 30, -50, 0.4, 1, true, 0), k(3.2, 'lap', 0, 0, 0, 1, true, 0)],
    [{ t: 0.6, call: 'wary' }, { t: 1.9, call: 'glad' }, { t: 3, call: 'glad' }, { t: 6.4, call: 'hum' }]),
  rabbit: reaction('rabbit-thumps-at-the-basket-and-hops-over', 'basket', 8,
    [a(0.5, -20, 0, -0.1, 1, 1, 'wary'), a(1, -20, -8, -0.1, 1, 1, 'wary'), a(1.15, -20, 0, -0.1, 1, 1, 'wary'), a(1.4, -20, -8, -0.1, 1, 1, 'wary'), a(1.55, -20, 0, -0.1, 1, 1, 'wary'), a(2.2, -30, 0, 0, 1, 0.88, 'wary'), a(3, 70, -112, 0, 1, 1.1, 'wow'), a(3.8, 126, 0, 0, 1, 0.9, 'wow'), a(4.6, 126, 0, 0, 1, 1, 'wary'), a(5.2, 120, 0, 0, 1, 0.88, 'wary'), a(6, 70, -112, 0, 1, 1.1, 'wow'), a(6.8, 0, 0, 0, 1, 0.9, 'wary'), rest(7.4, 'wary')],
    [k(0, 'seat', 70, 0, 0, 1, true, 0)],
    [{ t: 0.6, call: 'wary' }, { t: 1.15, thump: 1 }, { t: 1.55, thump: 1 }, { t: 3, call: 'wow' }, { t: 3.8, thump: 1 }, { t: 6.8, thump: 1 }, { t: 6.9, call: 'wary' }]),
  cat: reaction('cat-dips-one-paw-and-shakes-it', 'bowl', 8,
    [a(0.8, 0, 0, 0.04, 1, 1, 'wary'), a(2.4, 14, 0, 0.12, 1, 1, 'wary'), a(2.7, 22, 0, 0.15, 1, 1, 'wary'), a(2.9, -34, -10, -0.14, 1, 1, 'wow'), a(3.3, -30, 0, -0.1, 1, 1, 'wow'), a(3.5, -30, 0, -0.02, 1, 1, 'wow'), a(3.65, -30, 0, -0.16, 1, 1, 'wow'), a(3.8, -30, 0, -0.02, 1, 1, 'wow'), a(3.95, -30, 0, -0.16, 1, 1, 'wow'), a(4.1, -30, 0, -0.02, 1, 1, 'wow'), a(4.25, -30, 0, -0.14, 1, 1, 'wow'), a(5, -26, 0, 0, 1, 1, 'wary'), a(6.6, -26, 0, 0, 1, 1, 'wary'), rest(7.4, 'wary')],
    [k(0, 'lap', 70, 0, 0, 1, true, 0)],
    [{ t: 1, call: 'wary' }, { t: 2.75, drops: 1 }, { t: 2.9, call: 'wow' }, { t: 3.5, drops: 4 }, { t: 5, call: 'wary' }],
    // The one paw: out over the bowl and down into the water, snatched back, and shaken dry in front of its chest.
    { paw: [{ t: 1.8, x: 96, y: -30, rot: 2.6 }, { t: 2.4, x: 110, y: -24, rot: 3 }, { t: 2.7, x: 106, y: -8, rot: 3.05 }, { t: 2.9, x: 84, y: -34, rot: 1.9 }, { t: 3.3, x: 74, y: -20, rot: 1.2 }, { t: 3.5, x: 74, y: -22, rot: 0.6 }, { t: 3.65, x: 74, y: -22, rot: 1.6 }, { t: 3.8, x: 74, y: -22, rot: 0.6 }, { t: 3.95, x: 74, y: -22, rot: 1.6 }, { t: 4.1, x: 74, y: -22, rot: 0.6 }, { t: 4.25, x: 74, y: -22, rot: 1.4 }, { t: 4.8, x: 60, y: 6, rot: 0.9 }] }),
  // The plaster lies on the table at the dog's side. It sniffs it at arm's length, sneezes it over, and then backs
  // right round it, keeping its distance: behind it, out past it, in front of it, and back to its place.
  dog: reaction('dog-sniffs-the-plaster-sneezes-and-backs-round-it', 'plaster', 9,
    [a(0.6, 6, 0, 0.1, 1, 1, 'wary'), a(1.6, 14, 6, 0.16, 1, 1, 'wary'), a(2.2, 18, 8, 0.18, 1, 1, 'wary'), a(2.5, 10, -6, 0.05, 1, 1.08, 'wow'), a(2.7, 14, 10, 0.2, 1.06, 0.8, 'wow'), a(3.4, 0, 0, 0, 1, 1, 'wary'), a(4.3, 44, -18, 0.08, 0.95, 0.95, 'wary'), a(5.1, 118, -12, 0.1, 0.97, 0.97, 'wary'), a(5.9, 136, 6, -0.04, 1, 1, 'wary'), a(6.7, 70, 16, -0.1, 1.03, 1.03, 'wary'), a(7.5, 0, 0, 0, 1, 1, 'wary'), rest(8.3, 'wary')],
    [k(0, 'lap', 66, 0, 0.3, 1, true, 0), k(2.6, 'lap', 66, 0, 0.3, 1, true, 0), k(2.8, 'lap', 66, -40, 1.2, 1, true, 0), k(3.2, 'lap', 74, 0, 2.2, 1, true, 0), k(5.9, 'lap', 74, 0, 2.2, 1, true, 0), k(6.1, 'lap', 74, 0, 2.2, 1, false, 0), k(7.3, 'lap', 74, 0, 2.2, 1, false, 0), k(7.5, 'lap', 74, 0, 2.2, 1, true, 0)],
    [{ t: 0.7, call: 'hum' }, { t: 2.7, call: 'wow' }, { t: 4.3, call: 'wary' }, { t: 5.1, thump: 1 }, { t: 6.7, thump: 1 }]),
  hedgehog: reaction('hedgehog-rolls-up-in-the-blanket-as-a-parcel', 'blanket', 8,
    [a(0.4, 0, 0, 0, 1, 0.9, 'calm'), a(1, 0, 0, 0, 1, 0.9, 'calm'), a(2.6, 120, 0, TURN, 1, 0.9, 'calm'), a(2.6, 120, 0, 0, 1, 0.9, 'calm'), a(3.2, 120, 0, 0, 1, 0.9, 'calm'), a(4.8, 0, 0, -TURN, 1, 0.9, 'calm'), a(4.8, 0, 0, 0, 1, 0.9, 'calm'), a(5.3, 0, -22, 0, 1, 1.1, 'wow'), a(6, 0, 0, 0, 1, 0.94, 'wary'), rest(7, 'wary')],
    [k(0, 'seat', 0, 0), k(5.2, 'seat', 0, 0), k(5.9, 'lap', 0, 16, 0, 0.6)],
    [{ t: 1, call: 'hum' }, { t: 5.3, call: 'wow' }, { t: 6, call: 'wary' }],
    { hidden: [[0.4, 5.2]], open: true, coversUntil: 5.2 }),
  duck: reaction('duck-has-its-feathers-brushed-the-wrong-way', 'brush', 8,
    [a(0.6, 0, 0, 0, 1.05, 1, 'wary'), a(1.2, 0, 0, 0, 1.15, 1.04, 'wary'), a(2.2, 0, 0, 0, 1.15, 1.04, 'wary'), a(2.6, 0, 0, -0.16, 1.15, 1.04, 'wary'), a(2.9, 0, 0, 0, 1.1, 1.03, 'wary'), a(3.5, 0, 0, -0.16, 1.1, 1.03, 'wary'), a(3.8, 0, 0, 0, 1.05, 1.02, 'wary'), a(4.4, 0, 0, -0.16, 1.05, 1.02, 'wary'), a(4.7, 0, 0, 0, 1, 1, 'wary'), a(5.6, 0, 0, 0, 1, 0.96, 'wary'), a(6, 0, 0, 0, 1, 1.03, 'wary'), rest(7, 'wary')],
    [k(0, 'back', 0, 40, 0.3, 1, true, 0), k(1.2, 'back', 0, -60, 0.3, 1, true, 0), k(1.8, 'lap', 0, 0, 0, 1, true, 0)],
    [{ t: 1.3, call: 'wary' }, { t: 3.5, call: 'wary' }, { t: 6, call: 'hum' }]),
}

/**
 * Where a thing lies on this animal once a reaction to it is over. It is the
 * same whichever reaction was played, so a thing on the animal is found on
 * load where it was left without the save holding more than "on the animal".
 */
export function wornAt(species: Species, care: Care): ThingKey {
  const { reaction: played } = reactionFor(species, care, null, 0)
  return played.thing[played.thing.length - 1]
}

/** Whether the animal is under the blanket at any moment of this reaction: then a crackling blanket leaves its fur on end. */
export function goesUnder(reaction: Reaction): boolean {
  return reaction.care === 'blanket' && reaction.hidden.length > 0
}

/** Whether the blanket lies spread out when it is worn: it always does. */
export function wornOpen(care: Care): boolean {
  return care === 'blanket'
}

/** Every reaction, for the tests and for the view's table. */
export function allReactions(): Reaction[] {
  return [...Object.values(PLAIN).flat(), ...Object.values(LOVED), ...Object.values(WARY)]
}

/**
 * The reaction this animal has to this thing. For the thing it loves or is
 * wary of there is one, always the same. For any other it is one of two, and
 * `last` (the id that played before for this thing) is never played again
 * straight away.
 */
export function reactionFor(species: Species, care: Care, last: string | null, flip: number): { reaction: Reaction; taste: Taste } {
  const manner = taste(species, care)
  if (manner === 'loves') return { reaction: LOVED[species], taste: manner }
  if (manner === 'wary') return { reaction: WARY[species], taste: manner }
  const [one, other] = PLAIN[care]
  const first = flip < 0.5 ? one : other
  return { reaction: last === first.id ? (first === one ? other : one) : first, taste: manner }
}

function lerp(from: number, to: number, by: number): number {
  return from + (to - from) * by
}

/** The pair of keys around beat `at`, and how far between them it is. Two keys at the same beat are a jump: the later one holds from there. */
function around<T extends { t: number }>(keys: readonly T[], at: number): { from: T; to: T; progress: number } {
  let index = 0
  while (index < keys.length - 1 && keys[index + 1].t <= at) index++
  const from = keys[index], to = keys[Math.min(keys.length - 1, index + 1)]
  const span = to.t - from.t
  return { from, to, progress: span > 0 ? Math.min(1, Math.max(0, (at - from.t) / span)) : 1 }
}

/** Where the thing is held: on its way from one key's place to the next one's, with the turn, size and layer it has now. */
export type Held = { from: ThingKey; to: ThingKey; by: number; rot: number; size: number; front: boolean; ride: number }

export type Sampled = {
  /** The reaction is over: the animal is back at rest and the thing lies where its last key left it. */
  done: boolean
  animal: Pose
  hidden: boolean
  thing: Held
  /** The blanket is as large as the animal it covers. */
  covers: boolean
  /** The paw it is using, or null. */
  paw: { x: number; y: number; rot: number } | null
}

/** Where the animal and the thing are `seconds` after the reaction began, in this animal's own beat and ease. */
export function sample(reaction: Reaction, species: Species, seconds: number): Sampled {
  const beat = Math.max(0, seconds) / beatSeconds(species)
  const at = Math.min(beat, reaction.beats)
  const body = around(reaction.animal, at)
  const by = ease(species, body.progress)
  const animal: Pose = {
    x: lerp(body.from.x, body.to.x, by),
    y: lerp(body.from.y, body.to.y, by),
    rot: lerp(body.from.rot, body.to.rot, by),
    sx: lerp(body.from.sx, body.to.sx, by),
    sy: lerp(body.from.sy, body.to.sy, by),
    // The face is the one it is moving into, so a look comes before the move it belongs to.
    face: body.progress > 0 ? body.to.face : body.from.face,
  }
  const held = around(reaction.thing, at)
  const along = ease(species, held.progress)
  const thing: Held = {
    from: held.from,
    to: held.to,
    by: along,
    rot: lerp(held.from.rot, held.to.rot, along),
    size: lerp(held.from.size, held.to.size, along),
    front: held.progress >= 0.5 ? held.to.front : held.from.front,
    ride: lerp(held.from.ride, held.to.ride, along),
  }
  let paw: Sampled['paw'] = null
  if (reaction.paw.length > 1 && at >= reaction.paw[0].t && at < reaction.paw[reaction.paw.length - 1].t) {
    const reach = around(reaction.paw, at), by = ease(species, reach.progress)
    paw = { x: lerp(reach.from.x, reach.to.x, by), y: lerp(reach.from.y, reach.to.y, by), rot: lerp(reach.from.rot, reach.to.rot, by) }
  }
  return {
    done: beat >= reaction.beats,
    animal,
    hidden: reaction.hidden.some(([from, to]) => at >= from && at < to),
    thing,
    covers: at < reaction.coversUntil,
    paw,
  }
}

/** How long the reaction lasts for this animal, in seconds. */
export function lasts(reaction: Reaction, species: Species): number {
  return reaction.beats * beatSeconds(species)
}

/** The cues whose beat was passed between two moments of the reaction, in order. */
export function cuesBetween(reaction: Reaction, species: Species, before: number, now: number): Cue[] {
  const beat = beatSeconds(species)
  return reaction.cues.filter((cue) => cue.t * beat >= before && cue.t * beat < now)
}
