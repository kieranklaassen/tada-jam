import { REST, WEIGHT, type Move } from './motion'
import { TAU, hops, hump, ramp, ring, unit } from './motionKinds'
import { TASTES, type Reaction } from './tastes'
import { type Kind, VOICES, callSeconds } from './voices'

// What everybody does on hearing a voice (ART.md, "The characters and their
// fixed tastes"), as numbers and nothing else: no renderer, no clock and no
// dice. A reaction is to the voice just heard, it never changes, and it is the
// kind's own, so a child can learn it and bring it about on purpose:
//
//   in-step    its own voice: the kind's own picture of two who sound as
//              one (the second column of the grid in ART.md), laid over the
//              picture of the call (`calling` in motion.ts)
//   puzzled    its near voice: a slow double take, the second look the longer
//   delighted  the family it loves: the move TASTES names
//   startled   the family it shies from: at once, away from the voice, and
//              over within the move. Surprise, never hurt.
//
// A figure's eyes slide with its face, and its neck is one piece that cannot
// get shorter by itself, so two things are told through the body: the face
// swinging for eyes that swing, and the whole figure pressed short and wide,
// neck and all, for one that shrinks down.

/** How far a move may go and still be on its own spot. Falling over backwards leans further than anything in motion.ts. */
const between = (value: number, low: number, high: number, rest: number) => (Number.isFinite(value) ? Math.max(low, Math.min(high, value)) + 0 : rest)

function fit(part: Partial<Move>): Move {
  const m = { ...REST, ...part }
  return {
    dx: between(m.dx, -0.5, 0.5, 0), dy: between(m.dy, -1, 0.05, 0),
    sx: between(m.sx, 0.2, 1.8, 1), sy: between(m.sy, 0.2, 1.8, 1),
    lean: between(m.lean, -1.2, 1.2, 0),
    wings: between(m.wings, 0, 1, 0), reach: between(m.reach, -1, 1, 0), turn: between(m.turn, -1, 1, 0), blink: between(m.blink, 0, 1, 0),
    face: between(m.face, -1, 1, 1),
  }
}

/** Held for a while: eased in between `a` and `b`, and out again between `c` and `d`. */
const held = (t: number, a: number, b: number, c: number, d: number) => ramp(t, a, b) * (1 - ramp(t, c, d))

/** Seconds for a kind of the weight given, between what a thing of no weight would take and what the heaviest takes. */
const took = (kind: Kind, lightest: number, heaviest: number) => Math.round((lightest + (heaviest - lightest) * WEIGHT[kind]) * 100) / 100
// The heavier, the longer over everything, as in motion.ts. Startled is the shortest of the three: it is over before it can worry anyone.
const seconds = (kind: Kind): Readonly<Record<Reaction, number>> => ({ 'in-step': took(kind, 0.5, 1.2), puzzled: took(kind, 0.96, 1.4), delighted: took(kind, 0.9, 1.36), startled: took(kind, 0.88, 1.3) })

/** How long each kind takes over each reaction, in seconds: a heavier kind takes longer, and no two kinds the same for the same reaction. */
export const REACT_SECONDS: Readonly<Record<Kind, Readonly<Record<Reaction, number>>>> = {
  pip: seconds('pip'), tok: seconds('tok'), hoom: seconds('hoom'), brrl: seconds('brrl'), wheep: seconds('wheep'), dooo: seconds('dooo'),
}

/**
 * How long two who sound as one stay in step after their call is over, in seconds. An in-step move lasts the call
 * and this much more (plays.ts), which is how a kind knows where in the move its notes are.
 */
export const IN_STEP_TAIL = 0.4
/** Where a moment `seconds` into the call is in the in-step move of a kind, 0 to 1. */
const sung = (kind: Kind, seconds: number) => seconds / (callSeconds(VOICES[kind]) + IN_STEP_TAIL)

/**
 * One reaction, `t` from 0 to 1. `s` is the side away from the voice, -1 or 1: a startle goes to `s`, and a look, or
 * a lean towards the other of a pair, goes to `-s`. `much` is how big an in-step move is, 0 to 1: only `wheep`
 * uses it, for a pair that bounces higher on every glide.
 */
type Heard = (t: number, s: number, much: number) => Partial<Move>

const REACTIONS: Readonly<Record<Kind, Readonly<Record<Reaction, Heard>>>> = {
  pip: {
    // The little one has landed on the other's head (plays.ts), and the two rock from side to side as one, three times, as fast as a ball can.
    'in-step': (t) => { const rock = Math.sin(TAU * 3 * t) * hump(t, 0, 1); return { lean: 0.2 * rock, dx: 0.07 * rock } },
    // A flick of a look, a little hop of doubt with the eyes shut, and then it rolls right over to that side to look again.
    puzzled: (t, s) => { const one = held(t, 0.16, 0.23, 0.3, 0.38), two = held(t, 0.5, 0.6, 0.84, 0.97); return { turn: -s * (0.7 * one + two), lean: -s * 0.3 * two, dx: -s * 0.14 * two, dy: -0.12 * hump(t, 0.36, 0.54), blink: hump(t, 0.4, 0.5) } },
    // bounces-on-the-note: three even bounces, as on a drum skin. Flat and wide at every landing, wings out in the air.
    delighted: (t) => {
      const air = hops(t, 0.1, 0.9, 3, 1), land = hump(t, 0, 0.12, 0.7) + hump(t, 0.31, 0.43) + hump(t, 0.57, 0.7) + hump(t, 0.86, 1, 0.35)
      return { dy: -0.5 * air, sy: 1 + 0.08 * air - 0.3 * land, sx: 1 - 0.04 * air + 0.26 * land, wings: air }
    },
    // stiff-as-a-brush: off the ground and to the side in one go, and it lands tall, thin and stiff as a brush, quivering, before it goes soft again.
    startled: (t, s) => {
      const stiff = held(t, 0.02, 0.09, 0.45, 0.85)
      return { sy: 1 + 0.5 * stiff + 0.06 * ring(t, 0.8, 1.5), sx: 1 - 0.35 * stiff + 0.04 * Math.sin(TAU * 14 * t) * stiff, wings: stiff, dx: s * 0.25 * held(t, 0.02, 0.2, 0.6, 0.95), dy: -0.3 * hump(t, 0.02, 0.3, 0.3), lean: s * 0.12 * stiff }
    },
  },
  tok: {
    // The two jab their beaks at each other on the double note: turned to each other, a jab for each note, at its peak on the note.
    'in-step': (t, s) => {
      const second = VOICES.tok.length + VOICES.tok.gap, jab = hump(t, 0, sung('tok', 0.2), 0.3) + hump(t, sung('tok', second), sung('tok', second + 0.2), 0.3)
      return { lean: -s * 0.5 * jab, dx: -s * 0.14 * jab, turn: -s * 0.9 * held(t, 0, 0.04, 0.62, 0.85), sy: 1 - 0.05 * jab }
    },
    // All jerks: the beak snaps round, snaps away past the front, and snaps back to stay, taller, head cocked the other way, blinking twice.
    puzzled: (t, s) => {
      const one = held(t, 0.17, 0.2, 0.29, 0.32), off = held(t, 0.33, 0.36, 0.45, 0.48), two = held(t, 0.5, 0.53, 0.88, 0.95)
      return { turn: -s * (0.8 * one - 0.5 * off + two), lean: s * 0.22 * two, sy: 1 + 0.1 * two, blink: hump(t, 0.6, 0.67) + hump(t, 0.71, 0.78) }
    },
    // pecks-along: turns to the voice and pecks towards it four times, a step taller at each peck, as the glide goes.
    delighted: (t, s) => {
      const jab = hops(t, 0.1, 0.9, 4, 1), on = held(t, 0.04, 0.12, 0.88, 0.97), climb = held(t, 0.1, 0.8, 0.88, 1)
      return { turn: -s * 0.7 * on, lean: -s * 0.5 * jab, sy: 1 + 0.22 * climb - 0.08 * jab, dx: -s * 0.05 * jab, wings: 0.4 * jab }
    },
    // falls-over-backwards: flat on its back at once, wings flung out, eyes shut at the bump, and then up again with a hop as if nothing had been.
    startled: (t, s) => {
      const over = held(t, 0.03, 0.14, 0.5, 0.72)
      return { lean: s * (1.1 * over - 0.1 * ring(t, 0.72, 1.5)), dx: s * 0.28 * over, sy: 1 - 0.1 * over, wings: over, blink: hump(t, 0.1, 0.3, 0.3), dy: -0.3 * hump(t, 0.5, 0.8) }
    },
  },
  hoom: {
    // The two hum belly to belly: each comes over to the other and swells, the bellies meet and shake with the hum, eyes half shut.
    'in-step': (t, s) => { const full = held(t, 0.04, 0.28, 0.7, 0.97); return { dx: -s * 0.16 * full, sx: 1 + 0.12 * full + 0.03 * Math.sin(TAU * 7 * t) * full, lean: s * 0.05 * full, blink: 0.6 * full } },
    // Looks, thinks it over with one slow blink, and then the whole dome settles down wide towards the voice for a long second look.
    puzzled: (t, s) => {
      const one = held(t, 0.15, 0.3, 0.34, 0.48), two = held(t, 0.52, 0.68, 0.86, 0.99)
      return { turn: -s * (0.6 * one + two), sx: 1 + 0.1 * two, sy: 1 - 0.08 * two, lean: -s * 0.12 * two, blink: hump(t, 0.38, 0.58) }
    },
    // belly-giggles: the belly out and shaking up and down, eyes shut, wings on it, rocking a little with each breath.
    delighted: (t) => {
      const full = held(t, 0.04, 0.2, 0.75, 0.97), shake = Math.sin(TAU * 7 * t) * full
      return { sx: 1 + 0.16 * full - 0.09 * shake, sy: 1 + 0.07 * shake, lean: 0.1 * Math.sin(TAU * 1.5 * t) * full, wings: 0.6 * full, blink: full }
    },
    // eyes-swing-after-the-glide: draws its belly in and tips away, eyes wide, and the face with its eyes swings from side to side after the glide.
    startled: (t, s) => {
      const drawn = held(t, 0.02, 0.12, 0.5, 0.95), round = TAU * 3 * t
      return { turn: Math.sin(round) * drawn, sx: 1 - 0.2 * drawn, sy: 1 + 0.08 * drawn + 0.05 * Math.cos(round) * drawn, lean: s * 0.18 * drawn, dx: s * 0.06 * drawn }
    },
  },
  brrl: {
    // The two warble with their necks swaying side by side: both necks go up long and sway the same way at the same moment, twice
    // over and back, each head turned to the other. Side by side they never cross: two bars that cross are a sign.
    'in-step': (t, s) => { const far = held(t, 0.03, 0.25, 0.75, 0.98), sway = Math.sin(TAU * 2 * t) * far; return { lean: 0.26 * sway, dx: 0.08 * sway, sy: 1 + 0.22 * far, sx: 1 - 0.08 * far, turn: -s * 0.7 * far } },
    // A look, and then the neck goes out long and thin towards the voice to look again from nearer.
    puzzled: (t, s) => {
      const one = held(t, 0.16, 0.26, 0.32, 0.42), two = held(t, 0.5, 0.64, 0.86, 0.98)
      return { turn: -s * (0.6 * one + two), sy: 1 + 0.3 * two, sx: 1 - 0.14 * two, dx: -s * 0.12 * two }
    },
    // neck-sways: the neck long, and swaying like a reed with the glide, the head a little behind it, eyes half shut.
    delighted: (t) => {
      const far = hump(t, 0.02, 0.98), sway = Math.sin(TAU * 1.5 * t) * far
      return { lean: 0.3 * sway, dx: 0.15 * sway, turn: 0.6 * Math.sin(TAU * 1.5 * t - 1) * far, sy: 1 + 0.18 * far, sx: 1 - 0.06 * far, blink: 0.5 * far }
    },
    // shrinks-down: the whole of it is short and wide at once, neck and all, eyes shut tight. Then it peeks one way and the other while the neck comes back out, shivering.
    startled: (t, s) => {
      const shrunk = held(t, 0.03, 0.12, 0.45, 0.9), peek = hump(t, 0.4, 0.95)
      return { sy: 1 - 0.45 * shrunk, sx: 1 + 0.2 * shrunk, lean: s * 0.15 * shrunk, dx: s * (0.08 * shrunk + 0.03 * Math.sin(TAU * 9 * t) * peek), blink: held(t, 0.04, 0.12, 0.34, 0.46), turn: 0.6 * Math.sin(TAU * 2 * t) * peek }
    },
  },
  wheep: {
    // The two bounce with the glide, and higher on every glide: down on the springs, up as high as `much` says, and a flat landing.
    // Never higher than a lighter kind goes: at its highest as far off the ground as `tok` when it falls over.
    'in-step': (t, _s, much) => {
      const down = hump(t, 0, 0.26, 0.6), air = hump(t, 0.14, 0.8, 0.45), land = hump(t, 0.74, 0.92)
      return { dy: -0.3 * much * air, sy: 1 - (0.1 + 0.2 * much) * down + 0.35 * much * air - 0.15 * much * land + 0.06 * much * ring(t, 0.88, 1.5), sx: 1 + 0.15 * down - 0.14 * much * air + 0.1 * much * land, wings: much * air }
    },
    // A look, and then a little jump round to look again, where it stays, jiggling on its springs.
    puzzled: (t, s) => {
      const one = held(t, 0.15, 0.22, 0.3, 0.38), two = held(t, 0.46, 0.56, 0.84, 0.96)
      return { turn: -s * (0.7 * one + two), dy: -0.2 * hump(t, 0.42, 0.6), sy: 1 + 0.1 * Math.sin(TAU * 6 * t) * two, lean: -s * 0.2 * two }
    },
    // stretches-tall: down on the springs first, then up on tiptoe as tall as it goes, wings up, quivering, and down with a bounce.
    delighted: (t) => {
      const down = hump(t, 0, 0.2, 0.6), tall = held(t, 0.14, 0.34, 0.74, 0.9)
      return { sy: 1 - 0.22 * down + 0.55 * tall + 0.04 * Math.sin(TAU * 8 * t) * tall + 0.08 * ring(t, 0.86, 1.5), sx: 1 + 0.14 * down - 0.2 * tall, dy: -0.1 * tall, wings: tall }
    },
    // ducks: down flat under its wings at once and a step away, eyes shut. Then the springs throw it back up, too far, and it bounces to a stop.
    startled: (t, s) => {
      const duck = held(t, 0.02, 0.1, 0.4, 0.56), up = hump(t, 0.5, 0.78, 0.35)
      return { sy: 1 - 0.5 * duck + 0.2 * up + 0.08 * ring(t, 0.74, 2), sx: 1 + 0.3 * duck - 0.1 * up, dy: -0.2 * up, wings: duck, blink: duck, lean: s * 0.2 * duck, dx: s * 0.15 * held(t, 0.02, 0.1, 0.6, 0.9) }
    },
  },
  dooo: {
    // The two glide down in step, sliding side by side: both sink with the glide and slide the same way, and come back up late.
    'in-step': (t) => { const low = held(t, 0.06, sung('dooo', 0.4), 0.7, 0.97); return { dx: 0.3 * low, sy: 1 - 0.35 * low, sx: 1 + 0.15 * low, lean: 0.18 * low, turn: 0.5 * low, reach: 0.5 * low } },
    // Slow to look and slower to look again: the second time it sinks, head right over on one side, one ear up.
    puzzled: (t, s) => {
      const one = held(t, 0.18, 0.34, 0.36, 0.5), two = held(t, 0.54, 0.74, 0.88, 0.99)
      return { turn: -s * (0.55 * one + two), sy: 1 - 0.15 * two, lean: -s * 0.3 * two, reach: -s * two, wings: 0.5 * two }
    },
    // stands-straight-and-its-ears-flick: for once it is quick. Up straight, ears up, eyes wide, one ear flicking and then the other; then it sinks back slowly.
    delighted: (t) => {
      const up = held(t, 0.06, 0.16, 0.5, 0.98)
      return { sy: 1 - 0.06 * hump(t, 0, 0.1) + 0.32 * up, sx: 1 - 0.1 * up, wings: up, turn: 0.6 * Math.sin(TAU * 3 * t) * hump(t, 0.16, 0.7), reach: 0.5 * Math.sin(TAU * 3 * t) * hump(t, 0.16, 0.7) }
    },
    // melts-flat: a puddle at once, wide and flat and a little way off, eyes shut. Then it rises again as slowly as it does everything.
    startled: (t, s) => {
      const flat = held(t, 0.03, 0.18, 0.36, 0.97)
      return { sy: 1 - 0.65 * flat, sx: 1 + 0.5 * flat, dx: s * 0.12 * flat, lean: s * 0.1 * flat, blink: held(t, 0.05, 0.18, 0.4, 0.6) }
    },
  },
}

/**
 * What `kind` does on hearing a voice it takes as `how`, at `t` from 0 to 1: at rest at both ends. A taste takes
 * REACT_SECONDS; an in-step move takes the call and IN_STEP_TAIL more. `away` is the side the voice did not come
 * from, -1 or 1: a startle leans or jumps that way, a puzzled double take looks the other way, twice, and two in
 * step lean the other way, towards each other. `much` is how big an in-step move is.
 */
export function react(kind: Kind, how: Reaction, t: number, away: -1 | 1 = 1, much = 1): Move {
  const u = unit(t)
  return u <= 0 || u >= 1 ? { ...REST } : fit(REACTIONS[kind][how](u, away < 0 ? -1 : 1, Number.isFinite(much) ? Math.max(0, Math.min(1, much)) : 1))
}

/** The name of the move, for a test and for the art guide: the same string `moveOf` in tastes.ts gives. */
export function reactionName(kind: Kind, how: Reaction): string {
  return how === 'delighted' ? TASTES[kind].delight : how === 'startled' ? TASTES[kind].startle : `${kind}-${how}`
}
