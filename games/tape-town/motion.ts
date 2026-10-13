import type { ToyId } from './layout'

// How each toy moves, as numbers the view lays onto its sprite. Every toy
// has its own tempo, its own weight and one part of it that is the funny
// one, and no two share a curve: a test samples them all and fails on a copy.
// Nothing here knows the model or the canvas. Time is the model's seconds.

export type Move = {
  /** How far off the floor, 0 to 1: the shadow parts from the toy and the toy is drawn a little larger. */
  lift: number
  /** Stretch along the toy and across it; 1 is at rest. */
  sx: number
  sy: number
  /** A turn added to its heading, in radians. */
  da: number
  /** The toy's own part, 0 to 1 or -1 to 1: the car's bonnet shiver, the bus's doors, the duck's head, the train's smoke, the dog's tail, a peg's hat. */
  part: number
}

const REST: Move = { lift: 0, sx: 1, sy: 1, da: 0, part: 0 }
const TAU = Math.PI * 2

const clamp01 = (t: number): number => Math.max(0, Math.min(1, t))
const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
/** A bump from 0 up to 1 and back over a to b. */
const bump = (t: number, a: number, b: number): number => Math.sin(span(t, a, b) * Math.PI)
/** A spring let go from 1: it rings down to 0. */
const ring = (t: number, hz: number, damp: number): number => (t <= 0 ? 0 : Math.exp(-t * damp) * Math.cos(t * hz * TAU))

/** What each toy does while it stands and nothing touches it. */
export function idle(id: ToyId, t: number): Move {
  switch (id) {
    // Light and quick: the engine shivers the whole car, in fits.
    case 'car': {
      const fit = Math.max(0, Math.sin(t * 1.9)) ** 2
      return { lift: 0, sx: 1 + 0.012 * fit * Math.sin(t * 61), sy: 1 + 0.02 * fit * Math.sin(t * 47), da: 0, part: fit * Math.sin(t * 53) }
    }
    // Heavy and slow: it sinks on its springs and comes up again, like breathing.
    case 'bus': {
      const breath = Math.sin(t * 0.85)
      return { lift: 0, sx: 1 + 0.012 * breath, sy: 1 - 0.022 * breath, da: 0.012 * Math.sin(t * 0.43), part: 0 }
    }
    // Bobs as if it were afloat, and its head looks about by itself.
    case 'duck': {
      const bob = Math.abs(Math.sin(t * 1.55))
      return { lift: 0.05 * bob, sx: 1, sy: 1, da: 0.05 * Math.sin(t * 0.7), part: Math.sin(t * 0.6) * Math.sin(t * 0.23 + 1) }
    }
    // Chuffs where it stands: one swell for each puff, sharp up and slow down.
    case 'train': {
      const beat = (t * 1.25) % 1
      const chuff = beat < 0.15 ? beat / 0.15 : 1 - (beat - 0.15) / 0.85
      return { lift: 0, sx: 1 + 0.02 * chuff, sy: 1, da: 0, part: beat }
    }
    // Wags in bursts, and the wag takes the back half of it along.
    case 'dog': {
      const burst = clamp01(Math.sin(t * 0.9) * 2)
      const wag = Math.sin(t * 13.5) * burst
      return { lift: 0, sx: 1, sy: 1, da: 0.035 * wag, part: wag }
    }
    // Rocks on its round foot like a skittle that never falls.
    case 'pegA':
      return { lift: 0, sx: 1 + 0.03 * Math.sin(t * 2.3), sy: 1 - 0.03 * Math.sin(t * 2.3), da: 0.22 * Math.sin(t * 1.15), part: Math.sin(t * 1.15) }
    // Bounces on the spot in little jumps of three.
    case 'pegB': {
      const phrase = (t * 0.5) % 1
      const jump = phrase < 0.45 ? Math.abs(Math.sin(phrase / 0.45 * 3 * Math.PI)) : 0
      return { lift: 0.3 * jump, sx: 1, sy: 1, da: 0, part: jump }
    }
    // Turns slowly right round, looking at everything, then back.
    default: {
      const turn = Math.sin(t * 0.37) * 2.6
      return { lift: 0, sx: 1, sy: 1, da: turn, part: Math.cos(t * 0.37) }
    }
  }
}

/** How long each toy's answer to a tap lasts, in seconds, and when in it each of its sounds falls (voices.ts, in the same order). */
export const TAPPED_MOVE: Record<ToyId, { lasts: number; cues: readonly number[] }> = {
  car: { lasts: 0.55, cues: [0] },
  bus: { lasts: 0.95, cues: [0, 0.24, 0.52] },
  duck: { lasts: 1, cues: [0, 0.3] },
  train: { lasts: 0.85, cues: [0, 0.32] },
  dog: { lasts: 0.8, cues: [0, 0.3] },
  pegA: { lasts: 0.62, cues: [0, 0.42] },
  pegB: { lasts: 0.66, cues: [0, 0.46] },
  pegC: { lasts: 0.7, cues: [0, 0.5] },
}

/** A toy's answer to a tap, `u` seconds after the finger landed. */
export function tapped(id: ToyId, u: number): Move {
  const { lasts, cues } = TAPPED_MOVE[id]
  if (u < 0 || u >= lasts) return REST
  switch (id) {
    // Honks and hops on its tyres: flattened under the finger, up, and a short bounce.
    case 'car': {
      const up = bump(u, 0.04, 0.34)
      const down = ring(u - 0.34, 7, 9)
      return { lift: up, sx: 1 + 0.1 * (1 - span(u, 0, 0.05)) - 0.08 * down, sy: 1 + 0.14 * (1 - span(u, 0, 0.05)) + 0.1 * down, da: 0, part: up }
    }
    // Its doors flap open and shut, and the whole bus jumps a hair at the ding.
    case 'bus': {
      const open = span(u, cues[0], cues[0] + 0.1) * (1 - span(u, cues[1], cues[1] + 0.07))
      const jolt = ring(u - cues[2], 5, 8)
      return { lift: 0, sx: 1 + 0.02 * jolt, sy: 1 + 0.05 * open - 0.03 * jolt, da: 0.02 * ring(u, 3, 5), part: open }
    }
    // Squashed flat under the finger, then it fills again past its shape and settles.
    case 'duck': {
      const flat = span(u, 0, 0.08) * (1 - span(u, cues[1], cues[1] + 0.3))
      const fill = ring(u - cues[1] - 0.3, 3.2, 5)
      return { lift: 0, sx: 1 + 0.3 * flat - 0.1 * fill, sy: 1 + 0.26 * flat - 0.1 * fill, da: 0, part: -flat }
    }
    // Stiffens for the toot, then lets a ring of smoke go.
    case 'train': {
      const stiff = bump(u, 0, cues[1])
      return { lift: 0, sx: 1 + 0.06 * stiff, sy: 1 - 0.04 * stiff, da: 0, part: span(u, cues[1], lasts) }
    }
    // Yaps, and wags so hard its back end swings.
    case 'dog': {
      const wag = Math.sin(u * 30) * (1 - span(u, 0.5, lasts))
      return { lift: 0.25 * bump(u, 0, 0.16) + 0.2 * bump(u, cues[1], cues[1] + 0.14), sx: 1, sy: 1, da: 0.22 * wag, part: wag }
    }
    // A peg jumps and spins once round, each at its own height, and lands with a tok.
    default: {
      const land = cues[1]
      const high = id === 'pegA' ? 0.8 : id === 'pegB' ? 1 : 0.6
      const settle = ring(u - land, 9, 12)
      return { lift: high * bump(u, 0, land), sx: 1 - 0.1 * settle, sy: 1 + 0.1 * settle, da: TAU * span(u, 0, land) * (id === 'pegC' ? -1 : 1), part: bump(u, 0, land) }
    }
  }
}

/** How each toy takes a landing, `u` seconds after it: its own tempo, how fast it settles and how deep it goes. */
const LANDING: Record<ToyId, { hz: number; damp: number; deep: number }> = {
  car: { hz: 6.5, damp: 9, deep: 0.12 },
  bus: { hz: 2.4, damp: 4.5, deep: 0.1 },
  duck: { hz: 5, damp: 4, deep: 0.2 },
  train: { hz: 3.4, damp: 9, deep: 0.07 },
  dog: { hz: 7.5, damp: 7, deep: 0.13 },
  pegA: { hz: 9, damp: 12, deep: 0.12 },
  pegB: { hz: 10, damp: 11, deep: 0.14 },
  pegC: { hz: 8, damp: 13, deep: 0.1 },
}

export function landed(id: ToyId, u: number): Move {
  const { hz, damp, deep } = LANDING[id]
  if (u < 0 || u > 1.2) return REST
  switch (id) {
    // The dog lands running: it skids, stretched out along its way, and then shakes itself from nose to tail.
    case 'dog': {
      const skid = Math.exp(-u * 7), shake = Math.sin(u * 40) * bump(u, 0.3, 0.9)
      return { lift: 0, sx: 1 + 0.16 * skid, sy: 1 - 0.07 * skid, da: 0.2 * shake, part: shake }
    }
    // A peg lands on its round foot and rolls round on it like a skittle, each its own way, until it stands.
    case 'pegA': case 'pegB': case 'pegC': {
      const way = id === 'pegB' ? -1 : 1, settle = Math.exp(-u * damp * 0.35), round = u * hz * 0.5 * TAU
      return { lift: 0, sx: 1 + deep * settle * Math.cos(round), sy: 1 - deep * settle * Math.cos(round), da: way * 6 * deep * settle * Math.sin(round), part: settle * Math.sin(round) }
    }
    // The rest take it on their springs: heavy ones sink once, light ones ring.
    default: {
      const squash = deep * ring(u, hz, damp)
      return { lift: 0, sx: 1 + squash, sy: 1 + squash * 0.8, da: id === 'duck' ? 0.1 * ring(u, 2.5, 4) : 0, part: 0 }
    }
  }
}

/** The arc of a hop or a tumble, over its progress from 0 to 1: how far off the floor the toy is. */
export function arc(progress: number): number {
  return Math.sin(clamp01(progress) * Math.PI)
}

/** Two moves laid over each other. */
export function blend(a: Move, b: Move): Move {
  return { lift: Math.max(a.lift, b.lift), sx: a.sx * b.sx, sy: a.sy * b.sy, da: a.da + b.da, part: Math.abs(b.part) > 0.001 ? b.part : a.part }
}

/** When each toy blinks: its own period, so the room never blinks together. Returns 0 open to 1 shut. */
const BLINK: Record<ToyId, { every: number; at: number }> = {
  car: { every: 3.7, at: 0.4 }, bus: { every: 5.3, at: 2.1 }, duck: { every: 2.9, at: 1.3 }, train: { every: 6.1, at: 3 },
  dog: { every: 3.1, at: 0.9 }, pegA: { every: 4.3, at: 1.7 }, pegB: { every: 4.9, at: 0.2 }, pegC: { every: 3.4, at: 2.6 },
}

export function blink(id: ToyId, t: number): number {
  const { every, at } = BLINK[id]
  const phase = (((t + at) % every) + every) % every
  return phase < 0.14 ? Math.sin((phase / 0.14) * Math.PI) : 0
}

/** The cat: its side rises and falls as it sleeps, and its tail tip flicks now and then. */
export function catBreath(t: number): number {
  return Math.sin(t * 1.05) * 0.5 + 0.5
}

export function catTail(t: number, startled: number): number {
  const flick = Math.max(0, Math.sin(t * 0.63)) ** 6 * Math.sin(t * 9)
  return flick * 0.5 + startled * Math.sin(t * 24) * 0.6
}

// --- What a toy does on a tape: the acts and gaits of habits.ts, as moves ---------------------------------------

const quick = (u: number, hz: number): number => Math.sin(u * hz * TAU)
/** A short pulse that starts at `at`: up at once and gone in `lasts`. */
const pulse = (u: number, at: number, lasts = 0.3): number => (u < at || u > at + lasts ? 0 : 1 - (u - at) / lasts)

/**
 * A toy's move `u` seconds into something it does on the spot. `cues` are the seconds its sounds fall on
 * (habits.ts), so that each jolt lands with its sound. An act that has no move of its own here leaves the toy
 * at rest: the model moves or turns it.
 */
export function acting(name: string, u: number, cues: readonly number[]): Move {
  const hit = cues.reduce((most, at) => Math.max(most, pulse(u, at)), 0)
  switch (name) {
    // Wheels spinning in the hedge: the whole car shivers, and jumps as it pops out.
    case 'hedge': return { lift: 0.5 * bump(u, 1.6, 2), sx: 1 + 0.03 * quick(u, 17) * span(u, 0.2, 0.5), sy: 1 - 0.03 * quick(u, 17), da: 0.05 * quick(u, 11) * (1 - span(u, 1.5, 1.7)), part: 1 }
    case 'washed': return { lift: 0, sx: 1, sy: 1, da: 0.3 * quick(u, 7) * span(u, 0.6, 0.8) * (1 - span(u, 1.2, 1.5)), part: 0 }
    case 'snag': return { lift: 0.35 * Math.abs(Math.sin(span(u, 0, 1) * 2 * Math.PI)), sx: 1, sy: 1, da: 0.12 * quick(u, 2), part: 0 }
    // A honk swells the one who honks.
    case 'jamCar': case 'jamBus': return { lift: 0, sx: 1 + 0.07 * hit, sy: 1 + 0.1 * hit, da: 0, part: hit }
    case 'sink': return { lift: 0, sx: 1 + 0.03 * bump(u, 0.1, 0.9), sy: 1 - 0.08 * span(u, 0.1, 0.5) * (1 - 0.4 * span(u, 0.5, 0.9)), da: 0, part: 0 }
    case 'stop': return { lift: 0, sx: 1, sy: 1 - 0.04 * bump(u, 0, 0.5) + 0.03 * hit, da: 0.02 * quick(u, 1.2), part: 0 }
    // Into the hedge, and the sneeze throws the hat off.
    case 'leafHat': return { lift: 0.4 * pulse(u, 1.9, 0.35), sx: 1 - 0.06 * bump(u, 0, 0.9) + 0.1 * pulse(u, 1.9, 0.25), sy: 1 + 0.05 * bump(u, 0, 0.9), da: 0.04 * quick(u, 6) * span(u, 1.4, 1.9) * (1 - span(u, 1.9, 2.1)), part: 0 }
    // It looks one way, then the other, and jumps a hair at each ding.
    case 'look': return { lift: 0, sx: 1, sy: 1 + 0.04 * hit, da: 0.5 * Math.sin(span(u, 0.1, 1.2) * TAU), part: 0 }
    case 'preen': return { lift: 0, sx: 1 - 0.05 * bump(u, 0.3, 1.1), sy: 1 + 0.04 * bump(u, 0.3, 1.1), da: 0.5 * bump(u, 0.2, 1.2), part: quick(u, 5) * bump(u, 0.3, 1.1) }
    case 'bottomUp': return { lift: 0.3 * bump(u, 0.2, 1), sx: 1 - 0.3 * bump(u, 0.2, 1.1), sy: 1 + 0.08 * bump(u, 0.2, 1.1), da: 0.1 * quick(u, 4) * bump(u, 0.3, 1), part: -1 }
    case 'nest': case 'hide': return { lift: 0, sx: 1 - 0.3 * span(u, 0, 1.2), sy: 1 - 0.3 * span(u, 0, 1.2), da: 0.25 * quick(u, 5) * (1 - span(u, 0.8, 1.3)), part: 0 }
    case 'popOut': return { lift: 0.7 * bump(u, 0, 0.4), sx: 1 + 0.12 * bump(u, 0, 0.3), sy: 1 + 0.12 * bump(u, 0, 0.3), da: 0, part: 1 }
    case 'sneeze': return { lift: 0.3 * pulse(u, 0.25, 0.3), sx: 1 + 0.2 * pulse(u, 0.25, 0.2), sy: 1 - 0.1 * pulse(u, 0.25, 0.2), da: 0, part: -pulse(u, 0.25, 0.3) }
    // One wheel on, a sniff, and off again.
    case 'sniffRoad': return { lift: 0, sx: 1 + 0.07 * bump(u, 0.1, 1.1), sy: 1 - 0.03 * bump(u, 0.1, 1.1), da: 0.06 * quick(u, 3) * bump(u, 0.3, 1), part: 0 }
    case 'steam': return { lift: 0, sx: 1 + 0.08 * bump(u, 0.2, 1.6), sy: 1 + 0.08 * bump(u, 0.2, 1.6), da: 0.03 * quick(u, 13) * bump(u, 0.2, 1.6), part: span(u, 0.2, 1.8) }
    case 'buffer': return { lift: 0.3 * pulse(u, 1.5, 0.3), sx: 1 - 0.1 * pulse(u, 0.3, 0.35) + 0.06 * pulse(u, 1.5, 0.25), sy: 1 + 0.06 * pulse(u, 0.3, 0.35), da: 0, part: 0 }
    case 'ring': return { lift: 0, sx: 1 - 0.08 * ring(u, 9, 7), sy: 1 + 0.04 * ring(u, 9, 7), da: 0, part: 0 }
    // Three turns (the model turns it) and down: flat on the boards with a sigh.
    case 'circle': return { lift: 0, sx: 1 + 0.06 * span(u, 1.9, 2.1), sy: 1 + 0.12 * span(u, 1.9, 2.1) - 0.05 * ring(u - 2.1, 3, 6), da: 0, part: quick(u, 6) * (1 - span(u, 1.8, 2)) }
    case 'paddle': return { lift: 0.25 * bump(u, 0.9, 1.5), sx: 1, sy: 1, da: (u < 0.9 ? 0.2 * quick(u, 2.2) : 0.3 * quick(u, 12) * span(u, 1.55, 1.65) * (1 - span(u, 2.2, 2.6))), part: quick(u, 9) }
    case 'leg': return { lift: 0, sx: 1, sy: 1, da: 0.35 * bump(u, 0.6, 1.4), part: bump(u, 1.4, 2) * quick(u, 8) }
    case 'howl': return { lift: 0, sx: 1 + 0.12 * bump(u, 0.1, 1.5), sy: 1 - 0.07 * bump(u, 0.1, 1.5), da: 0, part: 0.3 * quick(u, 3) }
    // Sat up to watch the train by: shorter from above, and a slow sweep of the tail.
    case 'watch': return { lift: 0, sx: 1 - 0.08 * span(u, 0, 0.25), sy: 1 + 0.04 * span(u, 0, 0.25), da: 0, part: 0.6 * quick(u, 1.2) }
    case 'woof': return { lift: 0.3 * hit, sx: 1 + 0.08 * hit, sy: 1, da: 0, part: hit }
    default: return REST
  }
}

/** How each way of travelling moves the toy, `odo` units along and `t` seconds in. Each beat of the gait (every `every` units) is one cycle, so the bob lands with the sound. */
export function travelling(gait: string, odo: number, every: number, t: number): Move {
  const p = (odo / every) % 1, beat = Math.sin(p * Math.PI)
  switch (gait) {
    case 'scoot': return { lift: 0.12 * (1 - beat), sx: 1.04, sy: 0.97, da: 0, part: 0 }
    case 'drive': return { lift: 0, sx: 1 + 0.012 * Math.sin(p * TAU), sy: 1, da: 0, part: Math.sin(t * 40) * 0.5 }
    // Afloat it bobs and wallows; between the rails it judders, and its eyes with it.
    case 'float': return { lift: 0.08 * beat, sx: 1, sy: 1, da: 0.12 * Math.sin(t * 2.1), part: 0 }
    case 'judder': return { lift: 0.06 * beat, sx: 1, sy: 1 + 0.03 * Math.sin(p * TAU), da: 0.04 * Math.sin(p * TAU), part: Math.sin(p * TAU) }
    case 'lumber': return { lift: 0, sx: 1, sy: 1 - 0.02 * beat, da: 0.05 * Math.sin(p * TAU), part: 0 }
    case 'rumble': return { lift: 0, sx: 1, sy: 1 - 0.015 * beat, da: 0.012 * Math.sin(p * TAU), part: 0 }
    case 'sail': return { lift: 0.05 * Math.sin(t * 1.3) ** 2, sx: 1, sy: 1, da: 0.05 * Math.sin(t * 0.9), part: 0 }
    case 'waddle': case 'slap': return { lift: 0.05 * beat, sx: 1, sy: 1, da: 0.2 * Math.sin((odo / every) * Math.PI), part: Math.sin((odo / every) * Math.PI) }
    case 'swim': return { lift: 0, sx: 1 + 0.04 * Math.sin(p * TAU), sy: 1, da: 0.05 * Math.sin(p * TAU), part: 0.4 * Math.sin(t * 1.1) }
    // One rail like a tightrope: it wobbles further than it should and catches itself.
    case 'rope': return { lift: 0.04 * beat, sx: 1, sy: 1, da: 0.32 * Math.sin((odo / every) * Math.PI) * (0.6 + 0.4 * Math.sin(t * 1.7)), part: Math.sin((odo / every) * Math.PI) }
    case 'chuff': return { lift: 0, sx: 1 + 0.03 * (1 - p), sy: 1, da: 0, part: p }
    case 'follow': case 'nose': return { lift: 0, sx: 1.03, sy: 1, da: 0.06 * Math.sin(p * TAU), part: Math.sin(t * 9) * 0.6 }
    case 'tick': case 'trot': case 'railTrot': return { lift: 0.07 * beat, sx: 1, sy: 1, da: 0.04 * Math.sin(p * TAU), part: Math.sin(t * 14) }
    default: return REST
  }
}

/** Lying down: flat, slow breathing, no wag. Stuck under tape: straining. Just popped free: swaying, bewildered. */
export function lying(t: number): Move {
  return { lift: 0, sx: 1.05, sy: 1.1 + 0.02 * Math.sin(t * 1.3), da: 0, part: 0 }
}

export function strained(u: number): Move {
  return { lift: 0, sx: 1 + 0.05 * Math.sin(u * 31) * Math.min(1, u * 3), sy: 1 - 0.04 * Math.sin(u * 31), da: 0.04 * Math.sin(u * 23), part: Math.sin(u * 31) }
}

export function dazed(u: number): Move {
  return { lift: 0, sx: 1, sy: 1, da: 0.18 * ring(u, 2.2, 3), part: ring(u, 2.2, 3) }
}
