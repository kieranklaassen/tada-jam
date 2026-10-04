// How a need shows in the body (ART.md, "The representation"). A sign has
// three parts, all in the animal: the place, the movement and the face. It
// is shown at one of three steps of plainness, the same need shown more
// fully: quiet (the movement alone, small), plain (the movement large, with
// the face) and open (the animal turned to the child, showing the place
// itself). No step points at a care thing, and nothing here is an icon.
//
// A character reacts with its whole sticker, so a sign is a pose of the whole
// figure plus a few parts laid on it: a paw held up, the arms round itself,
// the tongue, burrs in the fur, a puff of breath, the ears hanging, and for
// the one that hides, how deep it is in the dark under the table. Pure: game time in, numbers out.

import { CAST, type Species } from './cast'
import { REST, fixed, type Face, type Pose } from './motion'
import { OPEN, PLAIN, type Need, type Step } from './needs'

/** What of a sign shows on the animal, beyond the pose of its whole sticker. Every part is 0 when it does not show. */
export type Show = {
  /** A paw held up beside the body: 1 when it shows. For the one that limps it is the sore paw; for the one that scratches, the leg that scratches. */
  paw: number
  /** Where that paw is from its place at the animal's side, in design units, and its turn. */
  pawX: number
  pawY: number
  pawRot: number
  /** 0 to 1: the arms hugged round the body. */
  arms: number
  /** How far the tongue hangs: 0 not at all, 1 a little, 2 down to the table. */
  tongue: number
  /** How many burrs sit in the fur, 0 to 3. */
  burrs: number
  /** 0 to 1: a puff of breath in front of the mouth. */
  puff: number
  /** 0 to 1: how hard the whole sticker shivers or trembles. The view makes the fine shake from the time. */
  shake: number
  /** 1 when the animal is in its hiding place, in the dark under the table. */
  under: number
  /** 0 to 1: how far it leans out of the dark. */
  out: number
  /** How many of its ears hang, 0 to 2: both, on the one that droops. They come up one after the other, the one on the left of the screen first. */
  ears: number
  /** 0 to 1: its fur stands on end all round it. Never part of a sign: a cell or the crackling blanket does it. */
  fur: number
  /** 0 to 1: rings spread in the bowl it has in front of it. */
  rings: number
  /** 0 to 1 each: two eyes show in the dark, or the one eye that watches. `blink` above a half shuts the two. */
  eyes: number
  eye: number
  blink: number
  /** 0 to 1: the held-up paw is dipped in the bowl in the animal's lap. The view finds the bowl; a cell only says how far in. */
  dip: number
  /** 0 to 1: the held-up paw is laid in the hand, where the finger is. The view knows where that is; a cell only says how far. */
  reach: number
  /** A hind foot out at its side, thumping the table in bliss: 0 not shown, 1 flat on the table, 2 lifted. Never part of a sign. */
  foot: number
}

export const NO_SHOW: Readonly<Show> = { paw: 0, pawX: 0, pawY: 0, pawRot: 0, arms: 0, tongue: 0, burrs: 0, puff: 0, shake: 0, under: 0, out: 0, ears: 0, fur: 0, rings: 0, eyes: 0, eye: 0, blink: 0, dip: 0, reach: 0, foot: 0 }

export type Signed = { pose: Pose; show: Show }

/** The face that goes with each need. */
export const SIGN_FACE: Readonly<Record<Need, Face>> = { thirsty: 'worn', cold: 'miserable', sore: 'hurting', itchy: 'bothered', scared: 'afraid' }

const TAU = Math.PI * 2
/** How hard the one that hides trembles, at every step of its sign. */
export const TREMBLE = 0.4

/** 1 inside a burst that comes every `every` seconds and lasts `lasts`, 0 outside, with soft edges. */
function burst(t: number, every: number, lasts: number, offset: number): number {
  const into = (((t + offset * every) % every) + every) % every
  if (into >= lasts) return 0
  return Math.min(1, into / 0.12, (lasts - into) / 0.12)
}

/**
 * The sign of `need` at `step`, for this animal at game time `t`. The same
 * place and the same kind of movement for every animal; the tempo and the
 * weight are the animal's own.
 */
export function sign(species: Species, need: Need, step: Step, t: number, seed: number): Signed {
  const { tempo, weight } = CAST[species]
  const pace = 0.6 + tempo * 0.25
  const off = fixed(seed, 21)
  const face: Face = step >= PLAIN ? SIGN_FACE[need] : 'calm'
  const pose: Pose = { ...REST, face }
  const show: Show = { ...NO_SHOW }
  // At the open step the animal turns to the child: a lean forward and a little larger.
  const open = step === OPEN ? 1 : 0
  switch (need) {
    case 'thirsty': {
      // It droops: the whole body sags, the tongue hangs, and it pants slowly.
      const sag = [0.035, 0.1, 0.14][step]
      const pant = Math.sin(TAU * t * pace * [0.5, 0.75, 0.55][step])
      pose.sy = 1 - sag + pant * [0.006, 0.018, 0.024][step]
      pose.sx = 1 + sag * 0.35
      pose.y = sag * 70
      pose.rot = [0.02, 0.06, 0.03][step]
      show.tongue = step === 0 ? (burst(t, 3.1, 0.9, off) > 0.5 ? 1 : 0) : step
      // Its ears hang with the rest of it, at every step.
      show.ears = 2
      break
    }
    case 'cold': {
      // It shivers: the whole sticker shakes in gusts, harder at each step; at the open step it hugs itself and its breath shows.
      const gust = 0.55 + 0.45 * Math.sin(t * 1.9 + off * TAU) ** 2
      show.shake = [0.3, 0.75, 1][step] * gust
      // The hug belongs to the open step, with the breath: at the plain step the shiver is large and the face is on.
      show.arms = open
      show.puff = open * burst(t, 1.9, 0.8, off)
      pose.sy = 1 - [0.01, 0.03, 0.045][step]
      pose.sx = 1 - [0, 0.02, 0.03][step]
      break
    }
    case 'sore': {
      // It limps: one paw is held up, the weight is on the other side.
      const wobble = Math.sin(TAU * t * pace * 0.4)
      show.paw = 1
      show.pawY = -[8, 26, 34][step] + wobble * [1, 2.5, 4][step]
      show.pawX = open * (14 + 3 * wobble)
      show.pawRot = [0.1, 0.3, 0.45][step] + wobble * 0.05 * (1 + open)
      pose.rot = -[0.02, 0.05, 0.035][step]
      pose.x = -[1, 4, 3][step]
      // A wince now and then at the plain step and up: a small quick squash, never a cry.
      const wince = step >= PLAIN ? burst(t, 2.8 + weight, 0.3, off) : 0
      pose.sy = 1 - 0.03 * wince
      break
    }
    case 'itchy': {
      // It scratches: burrs sit in the fur, and a leg works at them in bursts that rock the whole body.
      const working = burst(t, [2.6, 1.9, 1.5][step], [0.6, 1, 1.1][step], off)
      const beat = Math.sin(TAU * t * (5 + tempo))
      // Three burrs sit in its fur at every step: what grows with the step is the scratching, the face and the turn.
      show.burrs = 3
      show.paw = working > 0 ? 1 : 0
      show.pawY = -18 + beat * 9 * working
      show.pawX = 6 * working
      show.pawRot = 0.5 + beat * 0.25
      pose.rot = [0.012, 0.04, 0.06][step] * beat * working + open * 0.1
      pose.x = open * 6
      break
    }
    case 'scared': {
      // It hides: it is in the dark under the table and trembles. It peeks, and at the open step puts a paw out and pulls it back.
      show.under = 1
      // Its trembling is the same at every step: a wrong care makes it show more of itself, never tremble more.
      show.shake = TREMBLE
      const peek = step === 0 ? 0 : burst(t, step === PLAIN ? 2.6 : 2.1, step === PLAIN ? 0.9 : 1.2, off)
      show.out = [0, 0.45, 0.7][step] * peek
      show.paw = open * (peek > 0.6 ? 1 : 0)
      show.pawX = -30
      show.pawY = 6
      show.pawRot = -1.2
      // Quick shallow breaths, also when nothing else of it moves.
      pose.sy = 0.95 + 0.012 * Math.sin(TAU * t * pace * 1.6)
      break
    }
  }
  return { pose, show }
}

/** One show eased toward another: every part moves `by` of the way. Parts that only switch (the paw, under) follow the nearer one. */
export function blend(from: Show, to: Show, by: number): Show {
  const mix = (a: number, b: number) => a + (b - a) * by
  return {
    paw: by < 0.5 ? from.paw : to.paw,
    pawX: mix(from.pawX, to.pawX),
    pawY: mix(from.pawY, to.pawY),
    pawRot: mix(from.pawRot, to.pawRot),
    arms: mix(from.arms, to.arms),
    tongue: mix(from.tongue, to.tongue),
    burrs: mix(from.burrs, to.burrs),
    puff: mix(from.puff, to.puff),
    shake: mix(from.shake, to.shake),
    under: by < 0.5 ? from.under : to.under,
    out: mix(from.out, to.out),
    ears: mix(from.ears, to.ears),
    fur: mix(from.fur, to.fur),
    rings: mix(from.rings, to.rings),
    eyes: mix(from.eyes, to.eyes),
    eye: mix(from.eye, to.eye),
    blink: mix(from.blink, to.blink),
    dip: mix(from.dip, to.dip),
    reach: mix(from.reach, to.reach),
    foot: mix(from.foot, to.foot),
  }
}
