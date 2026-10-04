import { clamp01, easeInOut, lerp, overshoot, scatter } from './fx'

// How each character moves: its own tempo, its own weight, its own funniest
// part, and its own actions. No two characters share an action and no action
// is a copy of another with the numbers nudged (motion.test.ts holds both).
// The plants are not here: a plant bends when touched, set, growing or
// carried, and that is a spring in toyFx.ts; at rest it does not move.
//
// An action is a few poses over a few seconds; the view joins them. All
// values are plain numbers, and each actor uses only its own channels.

export type Channels = {
  /** A lean about the feet, in radians: negative towards the plants. */
  lean: number
  /** Where the eyes look, in radians: positive upwards. For the worm, -1 left to 1 right. */
  look: number
  /** 0 to 1: how full the breath is. */
  breath: number
  /** A step sideways: negative towards the plants. For the beetle, in body lengths. For a visitor, in units of the way to the plant it was offered: -1 puts its feet at the foot of that plant. */
  shift: number
  /** 0 on its feet, 1 on its back. */
  flip: number
  /** 0 to 1: how far it has reared back for a sneeze. */
  sneeze: number
  /** How far the loupe has rolled, in radians. */
  loupe: number
  /** 0 hidden, 1 fully out: how far the worm has risen from the soil. */
  rise: number
  /** How fast the legs or the wings go, in turns a second. */
  legs: number
  /** How high it is off its line, in body heights: a hop, a flight. */
  lift: number
  /** A turn of the whole body about its middle, in radians: positive tips it backwards, towards its back. */
  turn: number
  /** 0 to 1: how far up the plant it was offered it has gone, from the soil to the flower. The game turns it into a place. */
  climb: number
  /**
   * Its funniest part, from rest at 0. The snail: its near eye-stalk pulled in, 0 to 1. The bee: its rump swung to
   * a side, -1 to 1. The moth: its wings folded over itself, 0 to 1. The ladybird: its wing cases popped open,
   * 0 to 1. The ant: its load raised overhead, 0 to 1. The beetle: its wing cases opened and held up, 0 to 1.
   */
  part: number
  /**
   * A second part. The snail: its far eye-stalk pulled in, 0 to 1. The bee: its nose tipped down to land, 0 to 1.
   * The moth: its tongue unrolled, 0 to 1. The ladybird: reared up on its back legs, 0 to 1. The ant: its knees
   * giving way, 0 to 1. The beetle: dug into the soil it stands on, 0 to 1.
   */
  part2: number
}

export const AT_REST: Channels = { lean: 0, look: 0, breath: 0, shift: 0, flip: 0, sneeze: 0, loupe: 0, rise: 0, legs: 0, lift: 0, turn: 0, climb: 0, part: 0, part2: 0 }

/** One pose of an action: when it is reached, as a share of the action's length, and the channels it sets. Channels left out are at rest. */
export type Key = { at: number; set: Partial<Channels> }
export type Action = { seconds: number; keys: readonly Key[] }

export type Actor = {
  /** Seconds between two idle actions: the least and the most. */
  pause: readonly [number, number]
  /** How it gets from pose to pose: 0 arrives and stops, towards 1 swings past and settles. */
  weight: number
  /** How it starts a move: 1 eases in slowly, towards 0 snaps. */
  tempo: number
  funniest: string
  /** What it does by itself while the child watches, one at a time, never the same twice running. */
  idle: Record<string, Action>
  /** What it does in answer to a touch. */
  answer: Record<string, Action>
}

const key = (at: number, set: Partial<Channels> = {}): Key => ({ at, set })

/** The beetle keeps the journal. Slow, deliberate and top-heavy: it leans into things and swings past where it meant to stop. Funniest part: its back legs. */
const BEETLE: Actor = {
  pause: [2.4, 5.5],
  weight: 0.7,
  tempo: 0.8,
  funniest: 'back legs',
  idle: {
    // Smooths the strip of tape that will not lie flat: walks to it (a shift of -1 is all the way: toyFx.ts), leans in, presses its free end with its forefeet, steps back to look, and goes home. Halfway through it is pressing: that is where the page opens.
    'smooth-tape': { seconds: 3.4, keys: [key(0), key(0.2, { lean: -0.2, shift: -1, legs: 0.6 }), key(0.56, { lean: -0.26, shift: -1, breath: 1 }), key(0.78, { lean: 0.06, shift: -0.62, look: 0.2, legs: 0.4 }), key(1)] },
    // Rolls the loupe a little way and loses it: it rolls back on its own.
    'roll-loupe': { seconds: 2.8, keys: [key(0), key(0.3, { lean: -0.1, loupe: 0.9, legs: 0.8 }), key(0.5, { lean: 0.1, loupe: 1.3, look: -0.2 }), key(0.8, { lean: 0.04, loupe: -0.2 }), key(1)] },
    // Squares itself up to the page and looks the plants over, one long breath.
    'look-over': { seconds: 3.0, keys: [key(0), key(0.25, { look: 0.45, breath: 0.6 }), key(0.6, { look: 0.3, breath: 1, lean: -0.05 }), key(0.85, { look: -0.1 }), key(1)] },
    // Polishes one wing case with a back leg, which is the leg it stands on.
    'polish': { seconds: 2.2, keys: [key(0), key(0.25, { lean: 0.16, legs: 1.6 }), key(0.6, { lean: 0.2, legs: 1.6, breath: 0.4 }), key(0.8, { lean: -0.08 }), key(1)] },
  },
  answer: {
    // Poked: over onto its back in a blink, pedals, and rights itself.
    flip: { seconds: 2.0, keys: [key(0), key(0.11, { flip: 1, legs: 0 }), key(0.2, { flip: 1, legs: 3 }), key(0.72, { flip: 1, legs: 2.4 }), key(0.86, { flip: 0, lean: -0.14 }), key(1)] },
    // Dusted: rears back by degrees, lets go all at once, and is thrown forward by it.
    sneeze: { seconds: 1.5, keys: [key(0), key(0.25, { sneeze: 0.4, lean: 0.1 }), key(0.5, { sneeze: 0.8, lean: 0.18, breath: 1 }), key(0.62, { sneeze: 1, lean: 0.24, breath: 1 }), key(0.66, { sneeze: 0, lean: -0.3, shift: -0.1 }), key(1)] },
    // Walks its dust off: a few stiff steps away from the page and its loupe, and back.
    'walk-off': { seconds: 2.6, keys: [key(0), key(0.45, { shift: 0.5, legs: 2, lean: 0.05 }), key(0.55, { shift: 0.5, look: 0.3 }), key(0.95, { shift: 0, legs: 2, lean: -0.05 }), key(1)] },
    // A touch somewhere on the bare page: it looks up at it and back down.
    notice: { seconds: 0.9, keys: [key(0), key(0.3, { look: 0.5, lean: -0.06 }), key(0.7, { look: 0.4 }), key(1)] },
    // Watered: its wing cases go up as an umbrella, it waits under them, and shakes them shut.
    umbrella: { seconds: 2.1, keys: [key(0), key(0.2, { part: 1, lean: 0.06 }), key(0.7, { part: 1, lean: 0.04, look: 0.5 }), key(0.82, { part: 0.3 }), key(0.9, { part: 0.6 }), key(1)] },
    // A pot has run over: it paddles a little way past and back, rocking as if afloat, legs going.
    paddle: { seconds: 2.4, keys: [key(0), key(0.2, { lean: 0.12, legs: 2.6, shift: -0.2 }), key(0.5, { lean: -0.12, legs: 2.6, shift: -0.5 }), key(0.8, { lean: 0.1, legs: 2.6, shift: -0.2 }), key(1)] },
    // Set down on a pot: it digs itself in like a seed, waits, and climbs out affronted when nothing grows.
    dig: { seconds: 3.6, keys: [key(0), key(0.2, { part2: 1, legs: 3 }), key(0.62, { part2: 1, look: 0.3 }), key(0.7, { part2: 1, look: 0.6 }), key(0.82, { part2: 0, lean: 0.22, legs: 2 }), key(0.9, { lean: 0.26, look: 0.5 }), key(1)] },
    // Brought to a visitor: a stiff bow from the middle.
    bow: { seconds: 1.4, keys: [key(0), key(0.3, { lean: -0.5 }), key(0.62, { lean: -0.5, look: -0.3 }), key(1)] },
    // A plant has left the page from the border: it sketches it, nose down, the pencil going.
    sketch: { seconds: 1.7, keys: [key(0), key(0.2, { lean: -0.16, look: -0.5, legs: 3.4 }), key(0.72, { lean: -0.18, look: -0.5, legs: 3.4 }), key(0.88, { look: 0.2 }), key(1)] },
    // A plant has hopped onto its back to be carried off the page: its knees give under the load, it finds its feet and trudges out with it, looking up at what it carries.
    lug: { seconds: 2.3, keys: [key(0), key(0.16, { lean: 0.24, breath: 0.6, legs: 0.4 }), key(0.32, { lean: 0.08, look: 0.5, legs: 1.2, breath: 0.9 }), key(0.6, { lean: 0.16, look: 0.35, legs: 1.7, breath: 0.6 }), key(0.9, { lean: 0.1, look: 0.4, legs: 1.7 }), key(1)] },
    // Showing a runner: it reaches a back leg into the bud, the runner takes hold, and it is towed off on its tail, legs going, looking back at what has got it.
    towed: { seconds: 1.9, keys: [key(0), key(0.14, { lean: -0.2, legs: 1 }), key(0.24, { flip: 0.3, lean: 0.3, legs: 3, look: 0.6 }), key(0.8, { flip: 0.26, lean: 0.34, legs: 3, look: 0.45 }), key(0.9, { lean: -0.1, look: 0.2 }), key(1)] },
    // Brought to a visitor whose sketch is still up, after its bow: it reaches up, puts the visitor's sketch straight, and steps back to see that it is.
    straighten: { seconds: 1.2, keys: [key(0), key(0.25, { lean: -0.3, look: 0.55, legs: 0.8 }), key(0.55, { lean: -0.34, look: 0.6, breath: 0.7 }), key(0.8, { lean: 0.09, look: 0.3, breath: 0.3 }), key(1)] },
    // A plant has been set in its corner: it squares the plant up, fences it in with tape and stands guard, looking each way.
    guard: { seconds: 5, keys: [key(0), key(0.1, { shift: -0.35, lean: -0.16, legs: 1.5 }), key(0.24, { shift: -0.35, lean: -0.22 }), key(0.4, { shift: -0.2, legs: 2 }), key(0.5, { shift: -0.2, lean: 0.1, breath: 1 }), key(0.64, { shift: -0.2, lean: 0.1, look: 0.6, breath: 1 }), key(0.8, { shift: -0.2, lean: 0.1, look: -0.4, breath: 1 }), key(0.92, { shift: -0.1, legs: 1.5 }), key(1)] },
  },
}

/** The worm lives in the soil and only looks out. Slow to come up, gone in a blink. Funniest part: the way it looks round. */
const WORM: Actor = {
  pause: [3.5, 8],
  weight: 0.15,
  tempo: 1,
  funniest: 'how it looks round',
  idle: {
    'peek-left': { seconds: 2.6, keys: [key(0), key(0.4, { rise: 0.55, look: -0.8 }), key(0.8, { rise: 0.55, look: -0.6 }), key(0.9)] },
    'peek-right': { seconds: 2.2, keys: [key(0), key(0.5, { rise: 0.4, look: 0.9 }), key(0.78, { rise: 0.45, look: 0.3 }), key(0.86)] },
    periscope: { seconds: 3.6, keys: [key(0), key(0.3, { rise: 1 }), key(0.45, { rise: 1, look: -1 }), key(0.65, { rise: 1, look: 1 }), key(0.85, { rise: 0.9, look: 0 }), key(0.93)] },
  },
  answer: {
    // Its pot was poked: straight up, a look each way, and back in.
    poked: { seconds: 1.9, keys: [key(0), key(0.12, { rise: 0.9 }), key(0.35, { rise: 0.85, look: -1 }), key(0.6, { rise: 0.85, look: 1 }), key(0.8, { rise: 0.8, look: 0 }), key(0.88)] },
    // Dust fell on its soil: it comes up slowly, wearing it.
    capped: { seconds: 2.8, keys: [key(0), key(0.35, { rise: 0.7 }), key(0.55, { rise: 0.75, look: 0.5 }), key(0.75, { rise: 0.75, look: -0.5 }), key(0.9, { rise: 0.6 }), key(0.97)] },
  },
}

export const ACTORS = { beetle: BEETLE, worm: WORM } as const
export type ActorId = keyof typeof ACTORS

export function actionOf(who: ActorId, name: string): Action | undefined {
  const actor: Actor = ACTORS[who]
  return actor.idle[name] ?? actor.answer[name]
}

const CHANNELS = Object.keys(AT_REST) as (keyof Channels)[]

/**
 * An actor's pose `t` seconds into one of its actions. Between two poses it
 * moves in its own way: `tempo` shapes how it sets off and `weight` how far
 * it swings past the pose it is heading for. Before the first pose and after
 * the last it is at rest.
 */
export function poseOf(actor: Actor, name: string, t: number, out: Channels = { ...AT_REST }): Channels {
  const action = actor.idle[name] ?? actor.answer[name]
  for (const channel of CHANNELS) out[channel] = 0
  if (!action || !(t > 0) || t >= action.seconds) return out
  const at = t / action.seconds, keys = action.keys
  const next = keys.findIndex((one) => one.at > at)
  // Before the first pose, or past the last one: at rest.
  if (next <= 0) return out
  const from = keys[next - 1], to = keys[next]
  const u = clamp01((at - from.at) / (to.at - from.at))
  // Tempo: an actor that eases in spends the start of every move barely moving; one that snaps is half way at once.
  const shaped = lerp(1 - (1 - u) * (1 - u), easeInOut(u), actor.tempo)
  // Weight: a heavy actor swings past the pose and comes back to it.
  const swing = overshoot(shaped, actor.weight * 2)
  for (const channel of CHANNELS) out[channel] = lerp(from.set[channel] ?? 0, to.set[channel] ?? 0, channel === 'legs' ? shaped : swing)
  return out
}

/** The pose of the beetle or the worm. */
export function poseAt(who: ActorId, name: string, t: number, out: Channels = { ...AT_REST }): Channels {
  return poseOf(ACTORS[who], name, t, out)
}

/**
 * Picks what each actor does next while idle, and how long it waits first.
 * It never picks the same idle action twice running, and its choices depend
 * only on the seed it was made with, so a walkthrough can be replayed.
 */
export class Director {
  private readonly last: Record<string, string> = {}
  private picks = 0

  constructor(private readonly seed: number) {}

  /** Seconds the actor waits before its next idle action. */
  pause(who: ActorId): number {
    return this.pauseOf(ACTORS[who])
  }

  /** The actor's next idle action: any but the last one it did. */
  next(who: ActorId): string {
    return this.nextOf(who, ACTORS[who])
  }

  /** The same two for any actor, by a name to remember its last action under. */
  pauseOf(actor: Actor): number {
    const [least, most] = actor.pause
    return lerp(least, most, scatter(this.seed, this.picks++))
  }

  nextOf(who: string, actor: Actor): string {
    const names = Object.keys(actor.idle).filter((name) => name !== this.last[who])
    const name = names[Math.min(names.length - 1, Math.floor(scatter(this.seed, this.picks++) * names.length))]
    this.last[who] = name
    return name
  }
}
