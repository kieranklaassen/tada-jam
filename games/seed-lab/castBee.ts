import type { Actor, Channels, Key } from './motion'

// The bee wants a mark to land on. Fast and jittery: it snaps into every move
// and ticks a little past it. Funniest part: its rump (`part`, swung to a
// side; `part2` is its nose tipped down to land). `legs` is its wings.

const k = (at: number, set: Partial<Channels> = {}): Key => ({ at, set })

export const BEE: Actor = {
  pause: [0.7, 1.9],
  weight: 0.35,
  tempo: 0.2,
  funniest: 'rump',
  idle: {
    // Looks back at its own rump, swings it out to see it, then the other side.
    'rump-check': { seconds: 1.4, keys: [k(0), k(0.2, { part: 0.6, look: -0.3 }), k(0.45, { part: 0.6, look: -0.4, lean: 0.1 }), k(0.65, { part: -0.5, look: -0.3 }), k(0.85, { part: 0.2 }), k(1)] },
    // Tries its wings in two short bursts without going anywhere.
    'wing-test': { seconds: 1.1, keys: [k(0), k(0.2, { legs: 9, lift: 0.08 }), k(0.4, { part: 0.3 }), k(0.6, { legs: 9, lift: 0.12, part: -0.3 }), k(0.8, { legs: 2 }), k(1)] },
    // Lifts off and flies a small eight over its own place.
    'figure-eight': { seconds: 2.0, keys: [k(0), k(0.15, { lift: 0.2, legs: 8 }), k(0.35, { lift: 0.25, shift: -0.1, legs: 8, turn: 0.3, part: 0.4 }), k(0.55, { lift: 0.15, shift: 0.1, legs: 8, turn: -0.3, part: -0.4 }), k(0.75, { lift: 0.25, shift: -0.05, legs: 8, part: 0.3 }), k(0.9, { lift: 0.05, legs: 5, part2: 0.6 }), k(1)] },
    // Tips its nose down and scrubs its face with its front feet.
    'nose-wipe': { seconds: 1.6, keys: [k(0), k(0.2, { part2: 0.7, lean: -0.1 }), k(0.35, { part2: 0.8, lean: -0.16, legs: 1.5 }), k(0.5, { part2: 0.7, lean: -0.08, legs: 1.5 }), k(0.65, { part2: 0.8, lean: -0.16, legs: 1.5 }), k(0.8, { part2: 0.2, breath: 0.8 }), k(1)] },
  },
  answer: {
    // Flies in on a bobbing line, rump swinging behind, and tips its nose to land.
    'come-in': { seconds: 1.3, keys: [k(0), k(0.15, { lift: 0.5, legs: 9, lean: -0.2 }), k(0.4, { lift: 0.3, legs: 9, lean: -0.2, part: 0.3 }), k(0.65, { lift: 0.55, legs: 9, lean: -0.15, part: -0.3 }), k(0.85, { lift: 0.2, legs: 7, part2: 0.8, lean: 0.1 }), k(1)] },
    // Jumps into the air, tips away and zigzags off.
    'go-off': { seconds: 1.45, keys: [k(0), k(0.12, { lift: 0.4, legs: 9 }), k(0.3, { lift: 0.6, legs: 9, lean: 0.2, part: -0.4 }), k(0.55, { lift: 0.45, legs: 9, lean: 0.25, part: 0.4 }), k(0.8, { lift: 0.6, legs: 9, lean: 0.2 }), k(1)] },
    // One flick of the rump and half a buzz.
    shrug: { seconds: 0.6, keys: [k(0), k(0.3, { part: 0.5, lift: 0.06, legs: 5 }), k(0.6, { part: -0.2, breath: 0.5 }), k(1)] },
    // White: bobs up at the flower twice, looking right at it.
    'like-colour': { seconds: 0.7, keys: [k(0), k(0.25, { lift: 0.4, legs: 9, look: 0.4 }), k(0.5, { lift: 0.2, legs: 9, look: 0.4 }), k(0.75, { lift: 0.4, legs: 9, look: 0.4, lean: -0.15 }), k(1)] },
    // Four joints: zips level to the flower and back without having to climb.
    'like-height': { seconds: 0.8, keys: [k(0), k(0.3, { shift: -0.5, lift: 0.3, legs: 9, lean: -0.25 }), k(0.5, { shift: -0.5, lift: 0.3, legs: 9, breath: 0.6 }), k(0.8, { shift: -0.1, lift: 0.3, legs: 9, lean: 0.2 }), k(1)] },
    // Round: drums on the leaf with its nose, twice.
    'like-leaf': { seconds: 0.9, keys: [k(0), k(0.22, { part2: 0.8, lean: -0.15 }), k(0.41, { part2: 0.4 }), k(0.6, { part2: 0.8, lean: -0.15 }), k(0.79, { part2: 0.4, breath: 0.6 }), k(1)] },
    // Spotted: hangs over a spot, nose down, and waggles its rump at it.
    'like-petals': { seconds: 1.0, keys: [k(0), k(0.12, { part2: 0.5, lift: 0.15, legs: 6 }), k(0.34, { part2: 0.5, part: 0.5, lift: 0.15, legs: 6 }), k(0.56, { part2: 0.5, part: -0.5, lift: 0.15, legs: 6 }), k(0.78, { part2: 0.5, part: 0.5, lift: 0.15, legs: 6 }), k(1)] },
    // Not white: flies at it, stops short in the air, backs up, comes again from above, backs up past where it started and has to fly back.
    'miss-colour': { seconds: 1.8, keys: [k(0), k(0.22, { shift: -0.8, climb: 0.8, lift: 0.1, legs: 9, lean: -0.3 }), k(0.34, { shift: -0.6, climb: 0.8, legs: 9, lean: 0.2, part: 0.5 }), k(0.5, { shift: -0.85, climb: 1, lift: 0.5, legs: 9, part2: 0.7 }), k(0.66, { shift: -0.4, climb: 0.6, lift: 0.4, legs: 9, lean: 0.3, part: -0.5 }), k(0.84, { shift: 0.2, lift: 0.2, legs: 9, look: 0.3 }), k(0.94, { shift: 0.05, legs: 6 }), k(1)] },
    // Jagged: lands on the leaf, tiptoes from point to point, and the last point springs it into the air.
    'miss-leaf': { seconds: 2.1, keys: [k(0), k(0.2, { shift: -0.8, climb: 0.4, legs: 8, part2: 0.8 }), k(0.32, { shift: -0.85, climb: 0.4, lift: 0.12 }), k(0.42, { shift: -0.9, climb: 0.4, part: 0.4 }), k(0.52, { shift: -0.95, climb: 0.4, lift: 0.12, part: -0.4 }), k(0.62, { shift: -1, climb: 0.4 }), k(0.72, { shift: -0.9, climb: 0.5, lift: 1.2, turn: 0.8, legs: 9 }), k(0.9, { shift: -0.2, lift: 0.3, legs: 9, look: -0.4 }), k(1)] },
    // Plain: comes in to land, finds no mark, skids across the petal and off the far side.
    'miss-petals': { seconds: 2.6, keys: [k(0), k(0.2, { shift: -0.75, climb: 1, lift: 0.5, legs: 9, part2: 0.9 }), k(0.3, { shift: -0.85, climb: 1, lift: 0.05, legs: 3, part2: 0.9, look: -0.5 }), k(0.4, { shift: -0.9, climb: 1, look: -0.6, part: 0.5 }), k(0.52, { shift: -1.3, climb: 1, lean: 0.4, part: -0.6 }), k(0.62, { shift: -1.5, climb: 0.8, lift: -0.3, turn: 1.2 }), k(0.73, { shift: -1.4, climb: 0.5, lift: 0.2, legs: 9, turn: 0.2 }), k(0.88, { shift: -0.65, lift: 0.4, legs: 9, look: -0.3 }), k(1)] },
    // Too low: flies over it twice, out and back, looking down the whole way, without finding it.
    'miss-height-lower': { seconds: 3.0, keys: [k(0), k(0.12, { lift: 0.9, legs: 9 }), k(0.29, { shift: -0.8, lift: 0.9, legs: 9, look: -0.5, lean: -0.25 }), k(0.45, { shift: -1.6, lift: 0.95, legs: 9, look: -0.5, lean: -0.25 }), k(0.55, { shift: -1.6, lift: 1, legs: 9, part: 0.6, look: 0.2 }), k(0.7, { shift: -0.7, lift: 0.9, legs: 9, look: -0.5, lean: 0.25 }), k(0.83, { shift: 0.15, lift: 0.9, legs: 9, look: -0.5, lean: 0.25 }), k(0.9, { shift: 0.15, lift: 0.95, legs: 9, part: -0.6, look: 0.1 }), k(1)] },
    // Takes hold of the plant: all its feet on it and the wings flat out.
    take: { seconds: 0.75, keys: [k(0), k(0.35, { lean: -0.25, shift: -0.1, part2: 0.8, legs: 4 }), k(0.7, { lean: -0.2, shift: -0.1, legs: 9, lift: 0.05 }), k(1)] },
    // Lands on the flower and waggles: five swings of the rump, and off.
    use: { seconds: 2.9, keys: [k(0), k(0.17, { shift: -1, climb: 1, lift: 0.4, legs: 9, part2: 0.9 }), k(0.25, { shift: -1, climb: 1, part2: 0.5 }), k(0.33, { shift: -1, climb: 1, part2: 0.5, part: 0.5 }), k(0.41, { shift: -1, climb: 1, part2: 0.5, part: -0.5 }), k(0.49, { shift: -1, climb: 1, part2: 0.5, part: 0.5 }), k(0.57, { shift: -1, climb: 1, part2: 0.5, part: -0.5 }), k(0.65, { shift: -1, climb: 1, part: 0.5, breath: 0.8 }), k(0.76, { shift: -1, climb: 1, lift: 0.3, legs: 9 }), k(0.93, { shift: -0.15, climb: 0.15, lift: 0.2, legs: 9 }), k(1)] },
    // Drops beside its plant, folds its wings and gives its rump one last shake.
    settle: { seconds: 0.95, keys: [k(0), k(0.3, { lift: 0.2, legs: 6, part2: 0.7 }), k(0.55, { part: 0.3, breath: 0.8 }), k(0.8, { part: -0.2, breath: 0.4 }), k(1)] },
    // A pod: shakes it in short hard bursts, hovering, until it bursts and blows the bee back.
    rattle: { seconds: 1.7, keys: [k(0), k(0.12, { lift: 0.2, legs: 9, lean: -0.18 }), k(0.24, { lift: 0.2, legs: 9, lean: 0.12 }), k(0.36, { lift: 0.2, legs: 9, lean: -0.18 }), k(0.48, { lift: 0.2, legs: 9, lean: 0.12 }), k(0.6, { lift: 0.2, legs: 9, lean: -0.18 }), k(0.72, { lift: 0.5, shift: 0.2, legs: 9, lean: 0.3, turn: 0.5 }), k(0.88, { shift: 0.05, lift: 0.1, legs: 6 }), k(1)] },
    // A seed: balances it on its rump, backing under it, and bucks it off.
    balance: { seconds: 1.9, keys: [k(0), k(0.2, { part2: 0.9, look: -0.5 }), k(0.4, { part2: 0.9, shift: 0.06, part: 0.2 }), k(0.55, { part2: 0.9, shift: -0.06, part: -0.2 }), k(0.7, { part2: 0.9, shift: 0.08, part: 0.3 }), k(0.8, { part2: 0.2, lift: 0.25, legs: 9, turn: -0.4 }), k(0.92, { look: -0.6 }), k(1)] },
    // A runner bud: takes off with it like a kite string and is jerked back at the end of it.
    tug: { seconds: 1.5, keys: [k(0), k(0.2, { lift: 0.3, shift: 0.15, legs: 9, lean: 0.2 }), k(0.45, { lift: 0.5, shift: 0.4, legs: 9, lean: 0.25 }), k(0.57, { lift: 0.3, shift: 0.15, legs: 9, lean: -0.15, part: 0.6 }), k(0.75, { lift: 0.4, shift: 0.3, legs: 9, lean: 0.2 }), k(0.9, { lift: 0.1, legs: 6 }), k(1)] },
    // Bare soil: hovers over the pot nose down, shoots up when the worm waves, hands it back.
    peer: { seconds: 2.2, keys: [k(0), k(0.2, { lift: 0.3, legs: 8, part2: 1, look: -0.8 }), k(0.45, { lift: 0.15, legs: 8, part2: 1, look: -0.9 }), k(0.55, { lift: 1.1, legs: 9, part: 0.5, look: -0.4 }), k(0.75, { lift: 0.6, legs: 9, look: -0.6, lean: 0.15 }), k(0.9, { lift: 0.1, legs: 6, lean: -0.2 }), k(1)] },
    // The beetle: a stiff bow, nose down and rump straight up, wings shut.
    bow: { seconds: 1.2, keys: [k(0), k(0.3, { part2: 1, lean: -0.35 }), k(0.7, { part2: 1, lean: -0.35, breath: 0.5 }), k(1)] },
    // Poked: bounced into the air like a ball, spins once, and buzzes back down. It ends one whole turn round.
    poked: { seconds: 0.85, keys: [k(0), k(0.22, { lift: 0.6, turn: 1.6, legs: 9 }), k(0.5, { lift: 0.8, turn: 4.4, legs: 9, part: 0.4 }), k(0.8, { lift: 0.3, turn: Math.PI * 2, legs: 9 }), k(1, { turn: Math.PI * 2 })] },
  },
}
