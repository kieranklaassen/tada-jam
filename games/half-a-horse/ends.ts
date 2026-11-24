// The eight ends that hang on the line, and the two performers inside.

export const ANIMALS = ['horse', 'hen', 'elephant', 'croc'] as const
export type Animal = (typeof ANIMALS)[number]
export type Part = 'head' | 'bottom'
/** 0 to 3 are the heads and 4 to 7 the bottoms, in the order of the animals. */
export type End = number
export const ENDS = 8

export function animalOf(end: End): Animal {
  return ANIMALS[end % 4]
}
export function partOf(end: End): Part {
  return end < 4 ? 'head' : 'bottom'
}
export function endOf(animal: Animal, part: Part): End {
  return ANIMALS.indexOf(animal) + (part === 'head' ? 0 : 4)
}

/** Which half: the goose's, in front, or the bear's, behind. */
export type Who = 0 | 1
export const GOOSE: Who = 0
export const BEAR: Who = 1

/** An act: how long it takes and when in it the yard feels it. The goose is quick and the bear is slow. */
export const ACTS: readonly { seconds: number; at: number }[] = [
  { seconds: 1.1, at: 0.3 }, // the horse head rears and whinnies
  { seconds: 1.2, at: 0.22 }, // the hen head pecks, three times
  { seconds: 1.4, at: 0.4 }, // the elephant head trumpets
  { seconds: 1.1, at: 0.5 }, // the crocodile head gapes, then snaps
  { seconds: 0.9, at: 0.35 }, // the horse bottom kicks
  { seconds: 1.2, at: 0.6 }, // the hen bottom lays an egg
  { seconds: 1.3, at: 0.35 }, // the elephant bottom sits
  { seconds: 1, at: 0.4 }, // the crocodile bottom sweeps
]
export function tempo(who: Who): number {
  return who === GOOSE ? 1.12 : 0.86
}

/** What an act does to the figure: offsets from rest, at 0 to 1 of it. */
export type Pose = { lift: number; tilt: number; squash: number; head: number; jaw: number; tail: number; kick: number; trunk: number }
export function restPose(): Pose {
  return { lift: 0, tilt: 0, squash: 0, head: 0, jaw: 0, tail: 0, kick: 0, trunk: 0 }
}
const hump = (t: number, a: number, b: number): number => (t <= a || t >= b ? 0 : Math.sin(((t - a) / (b - a)) * Math.PI))
const wave = (t: number, n: number): number => Math.sin(t * Math.PI * 2 * n) * (1 - t)

/**
 * `tilt` leans the figure out of the animal (positive lifts its outer side), `head` turns the neck or the rump,
 * `jaw` opens a mouth, `tail` swings, `kick` throws the outer leg, `trunk` raises a trunk.
 */
export function actPose(end: End, t: number, out: Pose): Pose {
  Object.assign(out, ZERO)
  switch (end) {
    case 0: {
      const up = hump(t, 0.05, 0.9)
      out.lift = up * 62; out.tilt = up * 0.34; out.head = wave(t, 4) * 0.22; out.jaw = hump(t, 0.2, 0.7); out.kick = wave(t, 3) * 0.7
      break
    }
    case 1: {
      const peck = Math.max(0, Math.sin(t * Math.PI * 6)) * (t < 0.98 ? 1 : 0)
      out.head = -peck * 0.95; out.tilt = -peck * 0.16; out.jaw = peck * 0.5; out.squash = peck * 0.06
      break
    }
    case 2: {
      const up = hump(t, 0.1, 0.95)
      out.trunk = up; out.squash = hump(t, 0, 0.3) * 0.2 - up * 0.08; out.jaw = up; out.head = up * 0.25; out.tilt = up * 0.08
      break
    }
    case 3: {
      const open = t < 0.5 ? Math.sin((t / 0.5) * Math.PI * 0.5) : Math.max(0, 1 - (t - 0.5) / 0.06)
      out.jaw = open * 1.5; out.head = open * 0.3 - hump(t, 0.5, 0.8) * 0.25; out.squash = hump(t, 0.5, 0.85) * 0.14
      break
    }
    case 4: {
      const kick = hump(t, 0.2, 0.75)
      out.lift = kick * 46; out.tilt = kick * 0.42; out.kick = kick * 1.7; out.tail = wave(t, 3) * 0.9; out.squash = hump(t, 0, 0.2) * 0.16
      break
    }
    case 5: {
      out.squash = hump(t, 0.3, 0.6) * 0.22 - hump(t, 0.58, 0.8) * 0.1; out.tail = wave(t, 7) * 0.7; out.head = wave(t, 6) * 0.16; out.tilt = hump(t, 0.5, 0.9) * 0.16
      break
    }
    case 6: {
      const down = t < 0.35 ? (t / 0.35) ** 2 : 1 - Math.max(0, (t - 0.7) / 0.3)
      out.squash = down * 0.42 + hump(t, 0.35, 0.5) * 0.16; out.lift = hump(t, 0, 0.34) * 40; out.tail = wave(t, 5) * 0.6
      break
    }
    default: {
      out.tail = -hump(t, 0, 0.3) * 0.7 + hump(t, 0.28, 0.75) * 1.5; out.head = hump(t, 0.28, 0.7) * 0.2; out.tilt = -hump(t, 0.2, 0.7) * 0.12; out.squash = hump(t, 0, 0.3) * 0.08
    }
  }
  return out
}
const ZERO = restPose()
