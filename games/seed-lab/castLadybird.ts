import type { Actor, Channels, Key } from './motion'

// The ladybird wants a plant that matches its coat. Brisk and tidy: it sets
// off at once and stops dead, with no swing at all, and stands stock still
// between moves. Funniest part: its wing cases (`part`), which pop open when
// it is startled; `part2` is how far it has reared up on its back legs.

const k = (at: number, set: Partial<Channels> = {}): Key => ({ at, set })

/** In `vanish`: the share of the action at which the beetle walks into it. The cases pop right after. */
export const VANISH_BUMP_AT = 0.6

export const LADYBIRD: Actor = {
  pause: [1.8, 3.4],
  weight: 0.04,
  tempo: 0.35,
  funniest: 'wing cases',
  idle: {
    // Opens its wing cases a crack to see that they shut properly. They do. It checks again.
    'case-check': { seconds: 1.9, keys: [k(0), k(0.15, { part: 0.45, part2: 0.3 }), k(0.3, { part2: 0.3 }), k(0.5, { part: 0.45, part2: 0.3, look: -0.4 }), k(0.65, { part2: 0.3, look: -0.4 }), k(0.8, { part: 0.25, lean: 0.06 }), k(0.9), k(1)] },
    // Looks back along its own coat and counts its spots: one, two, three.
    'spot-count': { seconds: 2.5, keys: [k(0), k(0.2, { look: -0.3, lean: 0.08 }), k(0.35, { look: -0.5, lean: 0.08 }), k(0.5, { look: -0.7, lean: 0.1, part: 0.15 }), k(0.7, { look: -0.7, lean: 0.1, part: 0.15 }), k(0.8, { look: 0.2 }), k(1)] },
    // Two neat steps to stand exactly square, and one back because it was square before.
    'square-up': { seconds: 2.15, keys: [k(0), k(0.2, { shift: -0.05, legs: 2.5 }), k(0.4, { shift: -0.05 }), k(0.6, { shift: 0.03, legs: 2.5 }), k(0.8, { part2: 0.3, breath: 0.6 }), k(1)] },
    // Rears a little and brushes its front feet together.
    'leg-brush': { seconds: 1.55, keys: [k(0), k(0.25, { part2: 0.5 }), k(0.45, { part2: 0.5, legs: 3 }), k(0.65, { part2: 0.5, legs: 3, look: 0.2 }), k(0.8, { part2: 0.1 }), k(1)] },
  },
  answer: {
    // Marches in at one even pace, stops dead and gives its cases a tidying twitch.
    'come-in': { seconds: 1.6, keys: [k(0), k(0.15, { legs: 3, lean: -0.1 }), k(0.45, { legs: 3, lean: -0.06, lift: 0.04 }), k(0.75, { legs: 3, lean: -0.1 }), k(0.9, { part: 0.25, look: 0.2 }), k(1)] },
    // Draws itself up, turns on the spot and marches off.
    'go-off': { seconds: 1.75, keys: [k(0), k(0.12, { part2: 0.4 }), k(0.25, { legs: 3, lean: 0.1 }), k(0.6, { legs: 3, lean: 0.08, look: -0.2 }), k(0.85, { legs: 3, lean: 0.1 }), k(1)] },
    // The cases lift a crack and click shut.
    shrug: { seconds: 0.7, keys: [k(0), k(0.3, { part: 0.5, lift: 0.12, lean: 0.12 }), k(0.55, { look: -0.4, lean: 0.12 }), k(1)] },
    // Red: holds one wing case out against the flower. The same.
    'like-colour': { seconds: 0.72, keys: [k(0), k(0.3, { part: 0.6, lean: -0.15 }), k(0.65, { part: 0.6, lean: -0.15, look: 0.4 }), k(1)] },
    // Two joints: rears up beside it and is exactly as tall.
    'like-height': { seconds: 0.8, keys: [k(0), k(0.3, { part2: 1, look: 0.3 }), k(0.7, { part2: 1, look: 0.3, breath: 0.8 }), k(1)] },
    // Jagged: nods along the points of the leaf, one, two, three.
    'like-leaf': { seconds: 0.92, keys: [k(0), k(0.2, { lean: -0.2, look: -0.3 }), k(0.35, { lean: -0.12, look: -0.3 }), k(0.5, { lean: -0.2, look: -0.3 }), k(0.65, { lean: -0.12, look: -0.3 }), k(0.8, { lean: -0.2, look: -0.3, breath: 0.5 }), k(1)] },
    // Spotted: looks at the flower's spots, at its own, at the flower's, and gives one tidy hop.
    'like-petals': { seconds: 1.02, keys: [k(0), k(0.25, { look: 0.5 }), k(0.45, { look: -0.5, part: 0.2 }), k(0.65, { look: 0.5 }), k(0.8, { look: 0.5, lift: 0.15 }), k(1)] },
    // Not red: lines itself up beside the flower, steps back, tries half a step further in as if that were the trouble, holds a wing case out to it and snaps it shut.
    'miss-colour': { seconds: 2.4, keys: [k(0), k(0.12, { shift: -0.6, legs: 3 }), k(0.25, { shift: -0.6, look: 0.5 }), k(0.35, { shift: -0.4, legs: 3, look: 0.5 }), k(0.45, { shift: -0.7, legs: 3, look: 0.5 }), k(0.55, { shift: -0.7, part: 0.8, look: 0.5, lean: -0.1 }), k(0.7, { shift: -0.7, part: 0.8, look: -0.5 }), k(0.76, { shift: -0.7, look: -0.5 }), k(0.9, { shift: -0.1, legs: 3 }), k(1)] },
    // Round leaves: climbs one, slides down it with its legs still going and off the tip.
    'miss-leaf': { seconds: 2.8, keys: [k(0), k(0.12, { shift: -1, legs: 3 }), k(0.3, { shift: -1, climb: 0.4, legs: 3, lean: -0.2 }), k(0.42, { shift: -0.8, climb: 0.45, legs: 3 }), k(0.5, { shift: -0.8, climb: 0.45, look: 0.3 }), k(0.62, { shift: -0.55, climb: 0.3, turn: -0.5, legs: 3, part2: 0.3 }), k(0.7, { shift: -0.45, climb: 0.05, lift: 0.1, part: 1, turn: -0.2 }), k(0.78, { shift: -0.45 }), k(0.86, { shift: -0.45, look: 0.5 }), k(0.95, { shift: -0.05, legs: 3 }), k(1)] },
    // Plain: stands beside it, looks at its own spots, looks back.
    'miss-petals': { seconds: 2.05, keys: [k(0), k(0.15, { shift: -0.8, legs: 3 }), k(0.3, { shift: -0.8, look: 0.5 }), k(0.45, { shift: -0.8, look: -0.7, part: 0.2 }), k(0.6, { shift: -0.8, look: -0.7, part: 0.2 }), k(0.72, { shift: -0.8, look: 0.5 }), k(0.84, { shift: -0.8, look: 0.5, breath: 0.5 }), k(0.95, { shift: -0.1, legs: 3 }), k(1)] },
    // Too tall: rears up to match it, and further, topples over backwards as stiff as a board, and its cases pop and flip it back up.
    'miss-height-higher': { seconds: 2.6, keys: [k(0), k(0.15, { shift: -1, legs: 3 }), k(0.27, { shift: -1, part2: 0.6, look: 0.6 }), k(0.4, { shift: -1, part2: 1, look: 0.8, lean: 0.1 }), k(0.5, { shift: -0.9, part2: 1, turn: 2.6, look: 0.8 }), k(0.64, { shift: -0.9, turn: 2.6, legs: 3 }), k(0.7, { shift: -0.9, turn: 2.6, part: 1, lift: 0.3 }), k(0.78, { shift: -0.85, lift: 0.1, part: 0.3 }), k(0.84, { shift: -0.85 }), k(0.96, { shift: -0.05, legs: 3 }), k(1)] },
    // Too low: marches straight past it looking up, stops dead, looks round, marches back and trips over it.
    'miss-height-lower': { seconds: 2.95, keys: [k(0), k(0.2, { shift: -1.6, legs: 3, look: 0.3 }), k(0.32, { shift: -1.6, look: 0.5 }), k(0.42, { shift: -1.6, look: -0.2, part2: 0.5 }), k(0.55, { shift: -1.2, legs: 3 }), k(0.62, { shift: -0.95, lift: 0.35, part: 1, turn: -0.4 }), k(0.7, { shift: -0.7 }), k(0.8, { shift: -0.7, look: -0.6 }), k(0.94, { shift: -0.05, legs: 3 }), k(1)] },
    // Takes hold of the plant: two feet on it, and holds.
    take: { seconds: 0.78, keys: [k(0), k(0.35, { shift: -0.1, lean: -0.2, part2: 0.4 }), k(0.7, { shift: -0.1, lean: -0.2, part2: 0.4, breath: 0.5 }), k(1)] },
    // Climbs to the flower, fits itself against the petals and stands dead still: where they are red and spotted, all but gone. One look out, and still again.
    use: { seconds: 3.6, keys: [k(0), k(0.14, { shift: -1, legs: 3 }), k(0.27, { shift: -1, climb: 1, legs: 3 }), k(0.34, { shift: -1, climb: 1, part2: 0.7, turn: 0.2 }), k(0.6, { shift: -1, climb: 1, part2: 0.7, turn: 0.2, breath: 0.3 }), k(0.67, { shift: -1, climb: 1, part2: 0.7, turn: 0.2, look: 0.5 }), k(0.72, { shift: -1, climb: 1, part2: 0.7, turn: 0.2 }), k(0.8, { shift: -1, climb: 1, part2: 0.7, turn: 0.2 }), k(0.89, { shift: -1, climb: 0.15, legs: 3 }), k(1)] },
    // Shakes its cases out once, shuts them and sits.
    settle: { seconds: 0.96, keys: [k(0), k(0.3, { part: 0.4, lean: 0.05 }), k(0.5, { part2: 0.2 }), k(0.75, { breath: 1 }), k(1)] },
    // A pod: stands up and shakes it at arm's length, very exactly, until it bursts and its cases fly open.
    rattle: { seconds: 1.8, keys: [k(0), k(0.12, { part2: 0.6 }), k(0.24, { part2: 0.6, lean: -0.12 }), k(0.34, { part2: 0.6, lean: 0.12 }), k(0.44, { part2: 0.6, lean: -0.12 }), k(0.54, { part2: 0.6, lean: 0.12 }), k(0.64, { part2: 0.6, lean: -0.12 }), k(0.7, { part: 1, lift: 0.25, part2: 0.2 }), k(0.82, { look: -0.3 }), k(1)] },
    // A seed: balances it on the top of its dome, stepping under it, until a case twitches and tips it off behind.
    balance: { seconds: 2.25, keys: [k(0), k(0.2, { look: 0.4, part2: 0.2 }), k(0.35, { shift: 0.05, legs: 3 }), k(0.45, { shift: 0.05 }), k(0.6, { shift: -0.04, legs: 3 }), k(0.7, { shift: -0.04, part: 0.5, look: -0.5 }), k(0.85, { look: -0.7 }), k(1)] },
    // A runner bud: marches off with it in a straight line and is stopped dead at the end of the lead.
    tug: { seconds: 1.65, keys: [k(0), k(0.3, { shift: 0.3, legs: 3, lean: 0.15 }), k(0.55, { shift: 0.3, legs: 3, lean: 0.25 }), k(0.65, { shift: 0.12, part: 0.6, lean: -0.1 }), k(0.8, { shift: 0.12, look: -0.4 }), k(1)] },
    // Bare soil: stands up on the rim to peer in, pops its cases when the worm waves, hands the pot back.
    peer: { seconds: 2.3, keys: [k(0), k(0.2, { part2: 0.5, lean: -0.25, look: -0.7 }), k(0.45, { part2: 0.5, lean: -0.3, look: -0.9 }), k(0.52, { part: 1, lift: 0.3, lean: 0.15, look: -0.5 }), k(0.62, { part: 1, look: -0.5 }), k(0.7, { look: -0.5 }), k(0.88, { lean: -0.2, shift: -0.05 }), k(1)] },
    // The beetle: a bow from the middle, held dead still, the cases lifting behind like coat tails.
    bow: { seconds: 1.35, keys: [k(0), k(0.2, { part2: 0.6 }), k(0.45, { lean: -0.45, part: 0.25 }), k(0.75, { lean: -0.45, part: 0.25 }), k(1)] },
    // Poked: its cases pop open, it stands frozen, shuts them, and takes one tidy step as if nothing had happened.
    poked: { seconds: 1.1, keys: [k(0), k(0.1, { part: 1, lift: 0.2 }), k(0.35, { part: 1, look: 0.5 }), k(0.5, { look: 0.5 }), k(0.7, { shift: 0.04, legs: 3 }), k(0.85), k(1)] },
    // The secret: steps against a red spotted flower and holds dead still, cases shut tight; the beetle walks into it, the cases pop in fright, and it steps out.
    vanish: { seconds: 4.8, keys: [k(0), k(0.08, { shift: -1, legs: 3 }), k(0.2, { shift: -1, climb: 1, legs: 3 }), k(0.27, { shift: -1, climb: 1, part2: 0.7, turn: 0.2 }), k(VANISH_BUMP_AT, { shift: -1, climb: 1, part2: 0.7, turn: 0.2 }), k(0.63, { shift: -1, climb: 1, part: 1, lift: 0.4, part2: 0.2 }), k(0.72, { shift: -1, climb: 1, part: 1, look: -0.6 }), k(0.78, { shift: -1, climb: 1, look: -0.6 }), k(0.9, { shift: -0.6, climb: 0.2, legs: 3 }), k(0.96, { shift: -0.1, legs: 3, part: 0.2 }), k(1)] },
  },
}
