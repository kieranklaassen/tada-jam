import type { Actor, Channels, Key } from './motion'

// The moth wants a flower it can find in the dark. Soft and fluttering, never
// straight: every flight wavers and it drifts past where it meant to stop.
// Funniest part: its feathered feelers, which have no channel of their own:
// they sweep with `look`. `part` is its wings folded over itself, `part2` its
// tongue unrolled, `legs` its wings.

const k = (at: number, set: Partial<Channels> = {}): Key => ({ at, set })

export const MOTH: Actor = {
  pause: [1.6, 3.8],
  weight: 0.55,
  tempo: 0.75,
  funniest: 'feathered feelers',
  idle: {
    // Draws one feeler down through a foreleg and lets it spring up, then the other.
    'feeler-comb': { seconds: 2.6, keys: [k(0), k(0.2, { look: -0.5, lean: -0.08 }), k(0.4, { look: 0.5 }), k(0.6, { look: -0.4, lean: 0.08, part: 0.2 }), k(0.8, { look: 0.4, breath: 0.6 }), k(1)] },
    // Folds its wings slowly over itself, feelers sticking out on top, and shakes them open.
    'wing-fan': { seconds: 3.1, keys: [k(0), k(0.3, { part: 0.8, breath: 0.5 }), k(0.55, { part: 0.9, look: 0.3, lean: 0.06 }), k(0.8, { part: 0.1, legs: 1.5, lift: 0.06 }), k(1)] },
    // Lets go of the page, drifts up in a wobble and sinks back.
    'drift-up': { seconds: 3.4, keys: [k(0), k(0.2, { lift: 0.15, legs: 3, turn: 0.15, look: 0.3 }), k(0.45, { lift: 0.25, shift: 0.08, legs: 3, turn: -0.15, look: -0.2 }), k(0.7, { lift: 0.12, shift: -0.06, legs: 2.5, turn: 0.1, look: 0.4 }), k(0.88, { lift: 0.03, part: 0.3 }), k(1)] },
    // Unrolls its tongue a little way to see that it still works; the feelers jump as it rolls back.
    'tongue-test': { seconds: 2.3, keys: [k(0), k(0.3, { part2: 0.5, look: -0.2 }), k(0.5, { part2: 0.7, look: 0.5, lean: -0.05 }), k(0.7, { part2: 0.1, look: 0.2 }), k(1)] },
  },
  answer: {
    // Flutters in on a line that is never straight: up, down, tipping each way.
    'come-in': { seconds: 2.2, keys: [k(0), k(0.15, { lift: 0.5, legs: 4, turn: 0.2, lean: -0.1 }), k(0.35, { lift: 0.8, legs: 4, turn: -0.2, look: 0.3 }), k(0.55, { lift: 0.45, legs: 4, turn: 0.25, lean: -0.12 }), k(0.75, { lift: 0.7, legs: 4, turn: -0.15, look: -0.3 }), k(0.9, { lift: 0.15, legs: 3, part: 0.3 }), k(1)] },
    // Rises in a wobble that gets higher each time and wanders off.
    'go-off': { seconds: 2.45, keys: [k(0), k(0.15, { lift: 0.3, legs: 4, look: 0.4 }), k(0.4, { lift: 0.9, legs: 4, turn: -0.3, lean: 0.15 }), k(0.65, { lift: 0.6, legs: 4, turn: 0.3, lean: 0.1, look: -0.2 }), k(0.85, { lift: 1, legs: 4, turn: -0.1, lean: 0.15 }), k(1)] },
    // The wings half close and open, and the feelers droop and lift.
    shrug: { seconds: 1.15, keys: [k(0), k(0.35, { part: 0.5, look: -0.4 }), k(0.65, { part: 0.1, look: 0.2, breath: 0.6 }), k(1)] },
    // White: drawn to it as to a lamp, in a small arc, feelers up.
    'like-colour': { seconds: 0.78, keys: [k(0), k(0.35, { shift: -0.25, lift: 0.3, legs: 4, turn: 0.2, look: 0.6 }), k(0.7, { shift: -0.2, lift: 0.2, legs: 4, turn: -0.15, look: 0.6 }), k(1)] },
    // Four joints: wavers up to look across at the flower and hangs there for a breath.
    'like-height': { seconds: 0.88, keys: [k(0), k(0.3, { lift: 0.6, legs: 4, turn: -0.2 }), k(0.55, { lift: 0.7, legs: 4, turn: 0.2, look: 0.2, breath: 1 }), k(0.8, { lift: 0.3, legs: 3, turn: -0.1 }), k(1)] },
    // Jagged: hangs on a point of the leaf and folds its wings, at home.
    'like-leaf': { seconds: 0.98, keys: [k(0), k(0.3, { lean: -0.2, part: 0.7, turn: 0.5, lift: 0.1 }), k(0.6, { lean: -0.25, part: 0.8, turn: 0.6, look: 0.3 }), k(0.8, { lean: -0.1, part: 0.2, turn: 0.1 }), k(1)] },
    // Plain: the tongue flicks out at the petal, twice, of its own accord.
    'like-petals': { seconds: 1.08, keys: [k(0), k(0.25, { part2: 0.6, look: 0.4, lean: -0.1 }), k(0.45, { part2: 0.2, look: 0.5 }), k(0.65, { part2: 0.7, look: 0.4, lean: -0.14 }), k(0.85, { part2: 0.1 }), k(1)] },
    // Red or pink: circles where the flower is, once and a half round, and lands on the plant's root ball instead.
    'miss-colour': { seconds: 2.9, keys: [k(0), k(0.1, { shift: -0.7, climb: 0.9, legs: 4, turn: 0.2 }), k(0.2, { shift: -1, climb: 1, lift: 0.35, legs: 4, turn: -0.2 }), k(0.3, { shift: -1.3, climb: 0.9, legs: 4, turn: 0.25 }), k(0.4, { shift: -1, climb: 0.8, lift: -0.3, legs: 4, turn: -0.2 }), k(0.5, { shift: -0.7, climb: 0.9, legs: 4, turn: 0.2 }), k(0.6, { shift: -1, climb: 1, lift: 0.35, legs: 4 }), k(0.72, { shift: -1, lift: 0.1, legs: 2, part: 0.5 }), k(0.84, { shift: -1, part: 0.9, look: 0.5 }), k(0.94, { shift: -0.3, lift: 0.3, legs: 4, turn: 0.15 }), k(1)] },
    // Round: finds no point to hang from, slips round the edge of the leaf and hangs under it upside down.
    'miss-leaf': { seconds: 2.5, keys: [k(0), k(0.15, { shift: -0.85, climb: 0.4, lift: 0.2, legs: 4, turn: 0.15 }), k(0.3, { shift: -0.9, climb: 0.4, lean: -0.2, look: -0.3 }), k(0.45, { shift: -0.9, climb: 0.4, turn: 1.4, legs: 3 }), k(0.6, { shift: -0.9, climb: 0.35, turn: 3.1, part: 0.6, look: 0.4 }), k(0.72, { shift: -0.9, climb: 0.3, turn: 3.1, part: 0.8, lift: -0.2 }), k(0.84, { shift: -0.5, climb: 0.1, turn: 0.6, lift: 0.3, legs: 4 }), k(0.94, { shift: -0.1, lift: 0.15, legs: 4, turn: -0.15 }), k(1)] },
    // Spotted: takes the spots for eyes, hides behind its own wings, peeps out and hides again.
    'miss-petals': { seconds: 2.0, keys: [k(0), k(0.15, { shift: -0.5, lift: 0.3, legs: 4, look: 0.5 }), k(0.25, { shift: -0.45, lift: 0.35, look: 0.8, turn: 0.2 }), k(0.35, { shift: -0.2, lift: 0.05, part: 1, look: -0.3 }), k(0.6, { shift: -0.2, part: 1, breath: 1 }), k(0.75, { shift: -0.2, part: 0.6, look: 0.5 }), k(0.85, { shift: -0.15, part: 1, look: -0.3 }), k(0.95, { part: 0.3 }), k(1)] },
    // Too low: flutters up to where the flower ought to be, unrolls its tongue into empty air, and drifts down like a leaf.
    'miss-height-lower': { seconds: 2.75, keys: [k(0), k(0.15, { shift: -0.9, lift: 1, legs: 4, turn: 0.2 }), k(0.3, { shift: -1, lift: 1.1, legs: 4, part2: 0.9, look: 0.3 }), k(0.45, { shift: -1, lift: 1, legs: 4, part2: 1, look: -0.6 }), k(0.52, { shift: -1, lift: 1, legs: 4, turn: -0.3 }), k(0.66, { shift: -0.7, lift: 0.6, legs: 2, turn: 0.4 }), k(0.8, { shift: -0.4, lift: 0.3, legs: 2, turn: -0.4 }), k(0.92, { shift: -0.1, lift: 0.1, legs: 2, turn: 0.2 }), k(1)] },
    // Takes hold of the plant: floats down onto it, feet first.
    take: { seconds: 0.82, keys: [k(0), k(0.35, { lift: 0.25, legs: 4, shift: -0.1, turn: 0.15 }), k(0.7, { shift: -0.1, lean: -0.2, legs: 1, part2: 0.3 }), k(1)] },
    // Hangs at the flower and unrolls its tongue all the way in, bobbing as it drinks.
    use: { seconds: 3.8, keys: [k(0), k(0.12, { shift: -1, climb: 0.95, lift: 0.2, legs: 4, turn: 0.2 }), k(0.22, { shift: -1, climb: 1, legs: 3, turn: -0.1, look: 0.3 }), k(0.4, { shift: -1, climb: 1, legs: 3, part2: 0.6, lift: 0.05 }), k(0.55, { shift: -1, climb: 1, legs: 3, part2: 1, lift: -0.05, breath: 0.6 }), k(0.72, { shift: -1, climb: 1, legs: 3, part2: 1, lift: 0.05, breath: 1, look: -0.2 }), k(0.84, { shift: -1, climb: 1, legs: 3, part2: 0.1, turn: 0.15 }), k(0.94, { shift: -0.3, climb: 0.2, lift: 0.3, legs: 4, turn: -0.15 }), k(1)] },
    // Lands beside its plant and lays its wings flat, a little at a time.
    settle: { seconds: 1.2, keys: [k(0), k(0.3, { lift: 0.15, legs: 3, turn: 0.1 }), k(0.6, { part: 0.6, breath: 1 }), k(0.85, { part: 0.35, look: 0.3, breath: 0.4 }), k(1)] },
    // A pod: carries it up and down in the air, which is all the shaking it can do, and wraps itself up when it bursts.
    rattle: { seconds: 2.15, keys: [k(0), k(0.12, { lift: 0.3, legs: 4 }), k(0.24, { lift: 0.1, legs: 4, turn: 0.2 }), k(0.36, { lift: 0.35, legs: 4, turn: -0.2 }), k(0.48, { lift: 0.1, legs: 4, turn: 0.2 }), k(0.6, { lift: 0.35, legs: 4, turn: -0.2 }), k(0.68, { lift: 0.1, part: 1, turn: 0.5, shift: 0.15 }), k(0.86, { part: 0.5, look: 0.5, shift: 0.05 }), k(1)] },
    // A seed: balances it on the tip of its tongue, which rolls up by itself and tosses it.
    balance: { seconds: 2.35, keys: [k(0), k(0.2, { part2: 0.5, look: 0.5 }), k(0.4, { part2: 0.6, look: 0.5, lean: -0.1, lift: 0.08, legs: 2 }), k(0.58, { part2: 0.4, look: 0.5, lean: 0.1, lift: 0.04, legs: 2 }), k(0.7, { part2: 0.9, look: 0.7 }), k(0.78, { look: 0.9, lean: 0.15 }), k(0.9, { look: -0.5 }), k(1)] },
    // A runner bud: flies off with it and is swung round on it like a moth on a thread.
    tug: { seconds: 1.85, keys: [k(0), k(0.25, { shift: 0.25, lift: 0.3, legs: 4, lean: 0.2 }), k(0.45, { shift: 0.3, lift: 0.7, legs: 4, turn: -0.5 }), k(0.65, { shift: 0.1, lift: 0.5, legs: 4, turn: 0.5, lean: -0.15 }), k(0.85, { shift: 0.05, lift: 0.15, legs: 3, look: -0.3 }), k(1)] },
    // Bare soil: feels into the pot with both feelers, is blown up into the air when the worm waves, hands it back.
    peer: { seconds: 2.55, keys: [k(0), k(0.25, { lean: -0.3, look: -0.8 }), k(0.45, { lean: -0.34, look: -0.9, part2: 0.3 }), k(0.53, { lift: 0.6, legs: 4, part: 0.4, turn: 0.4, look: -0.3 }), k(0.72, { lift: 0.4, legs: 4, turn: -0.2, look: -0.6 }), k(0.88, { lift: 0.05, lean: -0.2, legs: 2 }), k(1)] },
    // The beetle: a stiff bow, wings spread flat and both feelers sweeping the paper.
    bow: { seconds: 1.6, keys: [k(0), k(0.35, { lean: -0.4, look: -0.7 }), k(0.7, { lean: -0.4, look: -0.7, part: 0.2 }), k(1)] },
    // Poked: knocked into a soft tumble, this way and that, and flutters itself level again.
    poked: { seconds: 1.4, keys: [k(0), k(0.15, { lift: 0.4, turn: 0.9, legs: 4, part: 0.3 }), k(0.4, { lift: 0.6, turn: -0.6, shift: 0.1, legs: 4 }), k(0.65, { lift: 0.35, turn: 0.4, shift: -0.05, legs: 4, look: 0.5 }), k(0.85, { lift: 0.1, turn: -0.1, legs: 3 }), k(1)] },
  },
}
