import type { Actor, Channels, Key } from './motion'

// The snail wants a meal it can reach. Slow and heavy: it eases into every
// move and swings well past the pose it was heading for. Funniest part: its
// eye-stalks (`part` the near one pulled in, `part2` the far one).

const k = (at: number, set: Partial<Channels> = {}): Key => ({ at, set })
const TAU = Math.PI * 2

export const SNAIL: Actor = {
  pause: [3.5, 7.5],
  weight: 0.85,
  tempo: 0.95,
  funniest: 'eye-stalks',
  idle: {
    // One stalk looks about while the other pulls in, then they swap.
    'stalks-apart': { seconds: 4.2, keys: [k(0), k(0.2, { part: 0.6, look: 0.3 }), k(0.45, { part2: 0.7, look: -0.2 }), k(0.7, { part: 0.3, part2: 0.3, breath: 0.6 }), k(1)] },
    // Draws right into its shell for a breath and comes out a stalk at a time.
    'tuck-in': { seconds: 5.0, keys: [k(0), k(0.25, { part: 0.9, part2: 0.9, lean: 0.12, breath: 1 }), k(0.5, { part: 0.9, part2: 0.2, lean: 0.08 }), k(0.75, { part: 0.1, look: 0.25 }), k(1)] },
    // Inches a hair forward on its foot, feels the paper with one stalk, inches back.
    'slime-inch': { seconds: 3.5, keys: [k(0), k(0.3, { shift: -0.1, lean: -0.14, legs: 0.3 }), k(0.6, { shift: -0.1, part: 0.6, look: -0.4 }), k(0.85, { shift: 0.03, legs: 0.3 }), k(1)] },
    // Both stalks up at the sky, one long breath, and one stalk gives up first.
    'sky-gaze': { seconds: 4.6, keys: [k(0), k(0.3, { look: 0.6, lean: 0.1, breath: 0.5 }), k(0.65, { look: 0.7, breath: 1, part2: 0.5 }), k(0.85, { look: 0.1 }), k(1)] },
  },
  answer: {
    // Glides in: its foot ripples, its body stretches and gathers, the stalks nod.
    'come-in': { seconds: 2.4, keys: [k(0), k(0.2, { lean: -0.14, legs: 0.5, part: 0.3 }), k(0.5, { lean: -0.06, legs: 0.5, breath: 0.8, part2: 0.3 }), k(0.8, { lean: -0.16, legs: 0.4, look: 0.2 }), k(1)] },
    // Folds its stalks half away, tips back the way it came and glides.
    'go-off': { seconds: 2.7, keys: [k(0), k(0.15, { part: 0.5, part2: 0.5, lean: 0.1 }), k(0.45, { lean: 0.16, legs: 0.5, look: -0.15 }), k(0.8, { lean: 0.08, legs: 0.5, breath: 0.6 }), k(1)] },
    // Both stalks dip in and out again, one late: a shrug with what it has.
    shrug: { seconds: 1.3, keys: [k(0), k(0.35, { part: 0.6, part2: 0.6, breath: 0.7, lean: 0.05 }), k(0.6, { part: 0.5, part2: 0.1 }), k(1)] },
    // Both stalks swing up to the flower and the body follows them.
    'like-colour': { seconds: 0.9, keys: [k(0), k(0.4, { look: 0.7, lean: -0.2 }), k(0.75, { look: 0.6, lean: -0.24, breath: 0.5 }), k(1)] },
    // Rises on its foot beside the stem: it comes exactly up to the flower.
    'like-height': { seconds: 0.76, keys: [k(0), k(0.4, { lift: 0.12, look: 0.4, breath: 1 }), k(0.7, { lift: 0.1, part: 0.3, part2: 0.3 }), k(1)] },
    // Pats the round leaf with one stalk and then the other.
    'like-leaf': { seconds: 1.04, keys: [k(0), k(0.3, { lean: -0.18, look: -0.2, part: 0.7 }), k(0.6, { lean: -0.18, look: -0.2, part2: 0.7 }), k(0.8, { lean: -0.1, part: 0.4 }), k(1)] },
    // The stalks go round the plain petal, one after the other, like a hand round a plate.
    'like-petals': { seconds: 0.84, keys: [k(0), k(0.3, { look: 0.5, part: 0.5 }), k(0.55, { look: 0.5, part2: 0.5, breath: 0.6 }), k(0.8, { look: 0.3, part: 0.3 }), k(1)] },
    // Not red: each stalk checks the flower in turn, both shoot in, and the empty shell rocks on its rim.
    'miss-colour': { seconds: 2.2, keys: [k(0), k(0.2, { look: 0.7, lean: -0.2 }), k(0.4, { look: 0.7, lean: -0.2, part: 0.8 }), k(0.55, { look: 0.7, lean: -0.1, part2: 0.8 }), k(0.75, { part: 0.9, part2: 0.9, turn: 0.4, lean: 0.1 }), k(0.9, { turn: -0.1, part: 0.3 }), k(1)] },
    // Jagged: pricks an eye-stalk on the leaf, pulls both in, peers out of one.
    'miss-leaf': { seconds: 2.6, keys: [k(0), k(0.2, { shift: -0.75, lean: -0.2, legs: 0.4, look: -0.2 }), k(0.3, { shift: -0.8, lean: -0.26, look: -0.2 }), k(0.36, { shift: -0.75, part: 1, part2: 1, lean: 0.1 }), k(0.62, { shift: -0.75, part: 1, part2: 1, breath: 0.6 }), k(0.78, { shift: -0.6, part: 1, part2: 0.2, look: 0.2 }), k(0.92, { shift: -0.1, part: 0.3, legs: 0.4 }), k(1)] },
    // Spotted: follows the spots with a stalk each, quicker and quicker, until the stalks cross and it has to lean back to undo them.
    'miss-petals': { seconds: 1.9, keys: [k(0), k(0.15, { look: 0.6, lean: -0.15 }), k(0.3, { look: 0.6, lean: -0.15, part: 0.7 }), k(0.42, { look: 0.6, lean: -0.15, part2: 0.7 }), k(0.54, { look: 0.6, lean: -0.15, part: 0.7 }), k(0.66, { look: 0.5, part: 0.6, part2: 0.6, lean: 0.2 }), k(0.85, { lean: 0.25, look: -0.3, breath: 1 }), k(1)] },
    // Too tall: stretches up the stem, overbalances, lands on its shell and turns slowly, rolling back to where it stood. It ends one whole turn round.
    'miss-height-higher': { seconds: 3.0, keys: [k(0), k(0.14, { shift: -1, legs: 0.4, lean: -0.1 }), k(0.36, { shift: -1, climb: 0.45, lean: -0.3, look: 0.8 }), k(0.48, { shift: -1, climb: 0.5, lean: 0.35, turn: 0.7, look: 0.8 }), k(0.56, { shift: -0.8, turn: 2.6, part: 0.8, part2: 0.8 }), k(0.66, { shift: -0.8, turn: 2.9, part: 0.8, part2: 0.3 }), k(0.92, { shift: -0.05, turn: 6, part: 0.3 }), k(1, { turn: TAU })] },
    // Too low: looks for the flower up where it ought to be, lowers a stalk at a time, and finds it at its own foot, folded double.
    'miss-height-lower': { seconds: 2.0, keys: [k(0), k(0.2, { look: 0.8, lift: 0.1 }), k(0.4, { look: 0.8, lift: 0.1, part: 0.4 }), k(0.6, { look: -0.5, lean: -0.3, part2: 0.4 }), k(0.8, { look: -0.8, lean: -0.4, breath: 0.8 }), k(1)] },
    // Takes hold of the plant: leans its whole front onto it.
    take: { seconds: 0.8, keys: [k(0), k(0.4, { lean: -0.3, shift: -0.1, part: 0.5, part2: 0.5 }), k(0.75, { lean: -0.2, shift: -0.1, breath: 0.6 }), k(1)] },
    // Eats the edge of one leaf: four slow bites, a stalk dipping with each, and a long look up.
    use: { seconds: 3.6, keys: [k(0), k(0.12, { lean: -0.28, look: -0.3 }), k(0.26, { lean: -0.34, look: -0.3, part: 0.5 }), k(0.4, { lean: -0.26, look: -0.3, part2: 0.5 }), k(0.54, { lean: -0.34, look: -0.3, part: 0.5 }), k(0.68, { lean: -0.26, look: -0.3, part2: 0.5 }), k(0.86, { lean: -0.1, look: 0.3, breath: 1 }), k(1)] },
    // Draws up close to its plant and lets out its breath.
    settle: { seconds: 1.14, keys: [k(0), k(0.35, { shift: -0.1, legs: 0.3, lean: -0.12 }), k(0.7, { shift: -0.06, lean: 0.06, breath: 1, look: -0.2 }), k(1)] },
    // A pod: the slowest rattle there is, side to side, until it bursts and both stalks vanish.
    rattle: { seconds: 2.3, keys: [k(0), k(0.15, { lean: -0.15, look: 0.2 }), k(0.28, { lean: 0.15 }), k(0.41, { lean: -0.15 }), k(0.54, { lean: 0.15 }), k(0.67, { lean: -0.15 }), k(0.72, { lean: 0.2, part: 0.9, part2: 0.9, lift: 0.15 }), k(0.88, { part: 0.5, look: 0.4 }), k(1)] },
    // A seed: balances it on the near stalk, sways under it, loses it and watches it go.
    balance: { seconds: 2.5, keys: [k(0), k(0.2, { look: 0.9, part2: 0.5 }), k(0.4, { look: 0.9, part2: 0.5, lean: -0.12, shift: -0.08 }), k(0.6, { look: 0.9, part2: 0.5, lean: 0.14, shift: 0.08 }), k(0.72, { look: 0.5, part: 0.8, lean: 0.05 }), k(0.86, { look: -0.7 }), k(1)] },
    // A runner bud: tugs it like a lead, away from the plants, and is twanged back.
    tug: { seconds: 2.1, keys: [k(0), k(0.25, { lean: 0.2, shift: 0.2, legs: 0.4 }), k(0.5, { lean: 0.3, shift: 0.3, legs: 0.5, breath: 1 }), k(0.6, { lean: -0.2, shift: 0.05, part: 0.6, part2: 0.6 }), k(0.8, { lean: 0.1, shift: 0.1, look: -0.3 }), k(1)] },
    // Bare soil: peers in with both stalks, starts when the worm waves, hands the pot back.
    peer: { seconds: 2.8, keys: [k(0), k(0.25, { lean: -0.3, look: -0.8 }), k(0.5, { lean: -0.34, look: -0.9, breath: 0.6 }), k(0.58, { lean: 0.2, part: 0.9, part2: 0.9, lift: 0.1 }), k(0.75, { lean: 0.1, part: 0.2, part2: 0.7, look: -0.4 }), k(0.9, { lean: -0.15, look: -0.2 }), k(1)] },
    // The beetle: a stiff bow from the foot, the stalks bowing a little after the rest.
    bow: { seconds: 1.7, keys: [k(0), k(0.35, { lean: -0.5, look: 0.3 }), k(0.65, { lean: -0.5, look: 0.3, part: 0.2, part2: 0.2 }), k(1)] },
    // Poked: gone into its shell, which rocks; one stalk comes out to see, then the other.
    poked: { seconds: 1.5, keys: [k(0), k(0.12, { part: 1, part2: 1, lean: 0.15 }), k(0.4, { part: 1, part2: 1, turn: 0.25 }), k(0.6, { part: 1, part2: 0.9, turn: -0.15 }), k(0.8, { part: 0.2, part2: 0.9, look: 0.3 }), k(1)] },
    // The secret: noses under a one-joint plant, wears it, parades a step each way with its stalks stiff under the brim, and sets it back.
    hat: { seconds: 5.2, keys: [k(0), k(0.1, { shift: -1, legs: 0.4, lean: -0.1 }), k(0.2, { shift: -1, lean: -0.45, look: -0.6 }), k(0.3, { shift: -1, lift: 0.15, part: 0.35, part2: 0.35, look: 0.2 }), k(0.45, { shift: -0.65, legs: 0.5, part: 0.35, part2: 0.35, look: 0.2, lean: 0.06 }), k(0.62, { shift: -1.3, legs: 0.5, part: 0.35, part2: 0.35, look: 0.2, lean: -0.06 }), k(0.74, { shift: -1, part: 0.35, part2: 0.35, look: 0.2 }), k(0.84, { shift: -1, lean: -0.45, look: -0.6 }), k(0.92, { shift: -0.5, legs: 0.4 }), k(1)] },
  },
}
