import type { CustomerId } from './tastes'

// The shape of each customer's head of hair, as numbers: how its nine tufts
// fan round the head, how long a tuft is drawn for a length in steps, how
// wide it is and how it hangs. Pure numbers, shared by the rules of touch and
// by the view, so the finger finds a tuft where it is drawn.

export type ManeKit = {
  /** The fan the tufts stand in, in degrees from straight up, from the first tuft to the last. */
  from: number
  to: number
  /** How long a tuft is drawn, in head units: `base` and then `step` for each step of length. */
  base: number
  step: number
  /** How much wider a tuft gets for each step of length: a pom swells as it grows, a plume does not. */
  swell: number
  /** How far a long tuft flops over, in radians at full length. */
  droop: number
  /** Each tuft's own lean off the fan, in degrees, its width and its hook. */
  own: readonly { lean: number; width: number; curl: number }[]
}

export const MANES: Record<CustomerId, ManeKit> = {
  // Flames in a wide fan: wild, and each one different.
  lion: {
    from: -108, to: 108, base: 40, step: 1.3, swell: 0, droop: 0.55,
    own: [
      { lean: -8, width: 92, curl: 0.3 }, { lean: 10, width: 86, curl: -0.25 }, { lean: -12, width: 98, curl: 0.35 },
      { lean: 6, width: 88, curl: -0.2 }, { lean: 0, width: 100, curl: 0.28 }, { lean: -9, width: 90, curl: -0.32 },
      { lean: 12, width: 96, curl: 0.22 }, { lean: -6, width: 86, curl: -0.3 }, { lean: 9, width: 94, curl: 0.26 },
    ],
  },
  // Poms: short, round, and rounder as they grow.
  poodle: {
    from: -96, to: 96, base: 34, step: 0.95, swell: 0.34, droop: 0.2,
    own: [
      { lean: 5, width: 70, curl: 0.1 }, { lean: -7, width: 76, curl: -0.12 }, { lean: 4, width: 68, curl: 0.08 },
      { lean: -3, width: 80, curl: -0.1 }, { lean: 0, width: 86, curl: 0.12 }, { lean: 6, width: 78, curl: -0.08 },
      { lean: -5, width: 70, curl: 0.1 }, { lean: 8, width: 74, curl: -0.11 }, { lean: -4, width: 72, curl: 0.09 },
    ],
  },
  // A heavy curtain: long straight hair that hangs far over as soon as it has any length.
  yak: {
    from: -118, to: 118, base: 46, step: 1.35, swell: 0, droop: 0.95,
    own: [
      { lean: -4, width: 78, curl: 0.12 }, { lean: -11, width: 84, curl: 0.16 }, { lean: -6, width: 80, curl: 0.1 },
      { lean: -14, width: 88, curl: 0.18 }, { lean: 3, width: 92, curl: -0.14 }, { lean: 13, width: 86, curl: -0.17 },
      { lean: 7, width: 82, curl: -0.1 }, { lean: 10, width: 86, curl: -0.15 }, { lean: 5, width: 76, curl: -0.12 },
    ],
  },
  // Angora fluff: wide soft tufts in a low halo, which leaves the top of the head free for the ears.
  rabbit: {
    from: -124, to: 124, base: 30, step: 1.05, swell: 0.18, droop: 0.35,
    own: [
      { lean: 9, width: 104, curl: 0.16 }, { lean: -6, width: 112, curl: -0.14 }, { lean: 12, width: 100, curl: 0.2 },
      { lean: -16, width: 96, curl: -0.18 }, { lean: 2, width: 90, curl: 0.15 }, { lean: 15, width: 98, curl: -0.2 },
      { lean: -11, width: 102, curl: 0.17 }, { lean: 7, width: 110, curl: -0.15 }, { lean: -8, width: 106, curl: 0.13 },
    ],
  },
}

/** A friend's hair is as it always is: these are the lengths its tufts are drawn at. The child cannot change them. */
export const FRIEND_MANE: Record<CustomerId, readonly number[]> = {
  lion: [52, 61, 47, 66, 58, 63, 49, 57, 54],
  poodle: [28, 34, 25, 38, 44, 36, 27, 33, 30],
  yak: [71, 78, 66, 83, 74, 81, 69, 76, 72],
  rabbit: [31, 26, 37, 22, 19, 24, 35, 28, 33],
}
