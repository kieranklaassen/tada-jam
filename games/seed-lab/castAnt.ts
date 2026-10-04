import type { Actor, Channels, Key } from './motion'

// The ant wants something it can carry off. Tireless, in straight lines: it
// goes at one even pace, there and back, and hardly swings at all. Funniest
// part: its strength (`part`, a load raised overhead; `part2`, its knees
// giving way under it).

const k = (at: number, set: Partial<Channels> = {}): Key => ({ at, set })

export const ANT: Actor = {
  pause: [1.0, 2.4],
  weight: 0.22,
  tempo: 0.55,
  funniest: 'its strength',
  idle: {
    // Picks up a grain of grit, holds it overhead, and puts it back exactly where it was.
    'lift-grit': { seconds: 1.7, keys: [k(0), k(0.2, { lean: -0.2, part2: 0.2 }), k(0.45, { part: 0.7 }), k(0.65, { part: 0.7, look: 0.4 }), k(0.85, { lean: -0.2 }), k(1)] },
    // Three knee bends, the last with its arms up, to keep in practice.
    'knee-bends': { seconds: 2.0, keys: [k(0), k(0.15, { part2: 0.6 }), k(0.3), k(0.45, { part2: 0.6 }), k(0.6), k(0.75, { part2: 0.6, part: 0.2 }), k(0.9, { breath: 0.8 }), k(1)] },
    // Patrols: a few straight steps out, a look, the same steps back, a look.
    patrol: { seconds: 2.4, keys: [k(0), k(0.25, { shift: -0.1, legs: 4 }), k(0.35, { shift: -0.1, look: 0.3 }), k(0.7, { shift: 0.1, legs: 4 }), k(0.8, { shift: 0.1, look: 0.3 }), k(0.95, { legs: 4 }), k(1)] },
    // Holds both arms up with nothing in them, to feel how strong that is.
    flex: { seconds: 1.45, keys: [k(0), k(0.3, { part: 0.5, lift: 0.05 }), k(0.6, { part: 0.5, lean: 0.1, breath: 1 }), k(0.8, { part: 0.1 }), k(1)] },
  },
  answer: {
    // Marches in at one pace, leaning into it, and halts with one dip of the knees.
    'come-in': { seconds: 1.25, keys: [k(0), k(0.15, { legs: 4, lean: -0.12 }), k(0.5, { legs: 4, lean: -0.12, breath: 0.5 }), k(0.85, { legs: 4, lean: -0.12 }), k(0.93, { part2: 0.3 }), k(1)] },
    // One dip of the knees, about turn, and off at the same pace it came.
    'go-off': { seconds: 1.35, keys: [k(0), k(0.1, { part2: 0.3 }), k(0.2, { legs: 4, lean: 0.12 }), k(0.9, { legs: 4, lean: 0.12 }), k(1)] },
    // Its knees dip, its hands come up empty.
    shrug: { seconds: 0.65, keys: [k(0), k(0.35, { part2: 0.6, lean: 0.15, look: -0.3 }), k(0.65, { lean: 0.1 }), k(1)] },
    // Pink: two hops on the spot, eyes on the flower.
    'like-colour': { seconds: 0.74, keys: [k(0), k(0.25, { lift: 0.35, look: 0.5, legs: 4 }), k(0.5, { look: 0.5, part: 0.3 }), k(0.75, { lift: 0.35, look: 0.5, legs: 4 }), k(1)] },
    // One joint: squats, hefts the air where it would be, and finds it will go.
    'like-height': { seconds: 0.82, keys: [k(0), k(0.25, { part: 0.6, look: 0.3 }), k(0.5, { part: 0.6, shift: -0.15, legs: 4 }), k(0.75, { part: 0.6, shift: -0.15, look: 0.6 }), k(1)] },
    // Round: drums on the leaf with both hands.
    'like-leaf': { seconds: 0.9, keys: [k(0), k(0.2, { part: 0.4, lean: -0.2 }), k(0.35, { part: 0.1, lean: -0.2 }), k(0.5, { part: 0.4, lean: -0.2 }), k(0.65, { part: 0.1, lean: -0.2 }), k(0.8, { part: 0.4, lean: -0.2, look: 0.3 }), k(1)] },
    // Plain: one straight step up to it, a look, one straight step back, like a guard.
    'like-petals': { seconds: 0.98, keys: [k(0), k(0.3, { shift: -0.2, legs: 4 }), k(0.5, { shift: -0.2, look: 0.5, breath: 0.6 }), k(0.8, { legs: 4, lean: 0.05 }), k(1)] },
    // Not pink: looks at it from this side, marches round to the other side, and raises its front legs a little as if to look underneath.
    'miss-colour': { seconds: 2.5, keys: [k(0), k(0.14, { shift: -1, legs: 4 }), k(0.25, { shift: -1, look: 0.7 }), k(0.4, { shift: -1.4, legs: 4, look: 0.5 }), k(0.5, { shift: -1.4, look: 0.7 }), k(0.62, { shift: -1, legs: 4 }), k(0.72, { shift: -1, part: 0.35, look: -0.6, lean: -0.2 }), k(0.82, { shift: -1, look: -0.6 }), k(0.95, { shift: -0.1, legs: 4 }), k(1)] },
    // Jagged: takes a leaf by its point to carry it off; the leaf springs back and lifts the ant, which marches on in the air.
    'miss-leaf': { seconds: 2.7, keys: [k(0), k(0.12, { shift: -1, legs: 4 }), k(0.25, { shift: -1, climb: 0.3, legs: 4 }), k(0.38, { shift: -0.8, climb: 0.35, part: 0.8, lean: 0.2 }), k(0.5, { shift: -0.6, climb: 0.35, part: 1, part2: 0.4, lean: 0.3, legs: 4 }), k(0.58, { shift: -0.9, climb: 0.5, lift: 0.8, part: 1, legs: 4 }), k(0.72, { shift: -0.9, climb: 0.5, lift: 0.7, part: 1, legs: 4 }), k(0.82, { shift: -0.9, part2: 0.6 }), k(0.95, { shift: -0.1, legs: 4 }), k(1)] },
    // Spotted: takes the spots for crumbs and picks at them, one after another, looking at its empty hands each time.
    'miss-petals': { seconds: 2.6, keys: [k(0), k(0.14, { shift: -1, legs: 4 }), k(0.26, { shift: -1, climb: 1, legs: 4 }), k(0.34, { shift: -1, climb: 1, lean: -0.25, part: 0.3 }), k(0.41, { shift: -1, climb: 1, look: -0.5 }), k(0.49, { shift: -1, climb: 1, lean: -0.25, part: 0.3 }), k(0.56, { shift: -1, climb: 1, look: -0.5 }), k(0.64, { shift: -1, climb: 1, lean: -0.25, part: 0.3 }), k(0.71, { shift: -1, climb: 1, look: -0.5, breath: 0.6 }), k(0.84, { shift: -1, climb: 0.1, legs: 4 }), k(1)] },
    // Any higher: lifts it anyway, staggers in a circle and is set down by the weight.
    'miss-height-higher': { seconds: 2.9, keys: [k(0), k(0.1, { shift: -1, legs: 4 }), k(0.2, { shift: -1, lean: -0.3, part2: 0.4 }), k(0.32, { shift: -1, part: 1, part2: 0.2 }), k(0.44, { shift: -0.7, part: 1, part2: 0.5, lean: 0.2, legs: 2 }), k(0.56, { shift: -1.3, part: 1, part2: 0.6, lean: -0.2, legs: 2 }), k(0.68, { shift: -0.8, part: 0.9, part2: 0.8, lean: 0.2, legs: 2 }), k(0.78, { shift: -1, part: 0.5, part2: 1 }), k(0.88, { shift: -1, part2: 0.3, look: 0.6 }), k(0.96, { shift: -0.1, legs: 4 }), k(1)] },
    // Takes hold of the plant: squats, grips, and hefts it a finger's width to be sure.
    take: { seconds: 0.86, keys: [k(0), k(0.3, { shift: -0.1, lean: -0.3, part2: 0.5 }), k(0.65, { shift: -0.1, part: 0.3, part2: 0.2 }), k(1)] },
    // Lifts the plant over its head and marches on the spot.
    use: { seconds: 3.4, keys: [k(0), k(0.1, { lean: -0.3, part2: 0.4 }), k(0.2, { part: 1, part2: 0.1 }), k(0.3, { part: 1, legs: 4, lift: 0.06 }), k(0.42, { part: 1, legs: 4 }), k(0.54, { part: 1, legs: 4, lift: 0.06 }), k(0.66, { part: 1, legs: 4, look: 0.4 }), k(0.78, { part: 1, legs: 4, lift: 0.06 }), k(0.9, { part: 0.3, part2: 0.3 }), k(1)] },
    // Sets its load down, sits on its heels beside it and breathes out.
    settle: { seconds: 1.05, keys: [k(0), k(0.3, { part: 0.4, part2: 0.2 }), k(0.55, { part2: 0.7, lean: 0.1 }), k(0.8, { part2: 0.5, breath: 1 }), k(1)] },
    // A pod: pumps it overhead like a weight, up, down, up, down, until it bursts and its knees go.
    rattle: { seconds: 1.9, keys: [k(0), k(0.1, { part: 1 }), k(0.2, { part: 0.4 }), k(0.3, { part: 1 }), k(0.4, { part: 0.4 }), k(0.5, { part: 1 }), k(0.6, { part: 0.4 }), k(0.7, { part: 1 }), k(0.76, { part: 0.2, part2: 1, lean: 0.2 }), k(0.9, { part2: 0.2, look: 0.5 }), k(1)] },
    // A seed: holds it overhead on one hand, walks a straight line under it and back, drops it, and goes on holding up nothing.
    balance: { seconds: 2.1, keys: [k(0), k(0.15, { part: 1 }), k(0.35, { part: 1, shift: -0.1, legs: 4 }), k(0.55, { part: 1, shift: 0.1, legs: 4 }), k(0.7, { part: 1, look: -0.6 }), k(0.85, { part: 1, look: 0.6 }), k(1)] },
    // A runner bud: hauls it over its shoulder, legs going and getting nowhere, and then goes anyway.
    tug: { seconds: 1.55, keys: [k(0), k(0.2, { lean: 0.35, legs: 4, part2: 0.3 }), k(0.5, { lean: 0.4, legs: 4, shift: 0.08, part2: 0.5 }), k(0.7, { lean: 0.3, legs: 4, shift: 0.35 }), k(0.85, { shift: 0.3, look: -0.3 }), k(1)] },
    // Bare soil: peers in over the rim, jumps straight up when the worm waves, and presents the pot back overhead.
    peer: { seconds: 2.2, keys: [k(0), k(0.2, { lean: -0.3, look: -0.8, part2: 0.3 }), k(0.45, { lean: -0.35, look: -0.9, part2: 0.3 }), k(0.52, { lift: 0.5, look: -0.4 }), k(0.62, { look: -0.4, part2: 0.4 }), k(0.78, { part: 0.8, lean: -0.1 }), k(0.9, { part: 0.3, lean: -0.2 }), k(1)] },
    // The beetle: a stiff bow with its knees locked, and a salute.
    bow: { seconds: 1.15, keys: [k(0), k(0.3, { lean: -0.6, part: 0.5 }), k(0.6, { lean: -0.6, part: 0.5 }), k(0.8, { part2: 0.4 }), k(1)] },
    // Poked: gives a step, braces, and pushes back against the finger with all it has.
    poked: { seconds: 0.95, keys: [k(0), k(0.15, { lean: 0.3, shift: 0.08, part2: 0.5 }), k(0.4, { lean: -0.25, shift: -0.02, part2: 0.3, legs: 4 }), k(0.7, { lean: -0.3, part: 0.4, legs: 4 }), k(0.85, { breath: 0.6 }), k(1)] },
  },
}
