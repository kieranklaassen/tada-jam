import type { FriendId } from './world'

// How each friend moves like itself: its tempo, its weight, and the one part
// of it that follows through. Pure numbers; the motion model reads them and a
// test fails if two friends come to share a set.

export type Personality = {
  /** Idle breathing: cycles a second, and how far the body swells. */
  breatheRate: number
  breatheDepth: number
  /** Seconds between blinks, on average, and how long the eyes stay shut. */
  blinkEvery: number
  blinkLasts: number
  /** The body's squash spring: how stiff, and how quickly it stops wobbling. */
  springStiff: number
  springDamp: number
  /** Seconds it gathers itself before a hop, and how far it crouches (1 is not at all). */
  gather: number
  crouch: number
  /** How flat a landing presses it (1 is not at all). */
  landSquash: number
  /** How far it stretches when lifted by the finger. */
  heldStretch: number
  /** How much of the plank's throw it takes: light friends fly, Bo barely leaves the plank. */
  tossGain: number
  /** The lagging part (crown, ears, speckled back, belly): how stiff, how damped, how far it swings. */
  followStiff: number
  followDamp: number
  followReach: number
  /** How far it rocks from side to side to get a hop going, radians: Bo rocks, the others do not. */
  windUp: number
}

export const PERSONALITY: Readonly<Record<FriendId, Personality>> = {
  // Pim: quick, bouncy, springs back at once; the crown lags and overshoots.
  pim: { breatheRate: 0.62, breatheDepth: 0.03, blinkEvery: 2.6, blinkLasts: 0.09, springStiff: 420, springDamp: 13, gather: 0.07, crouch: 0.78, landSquash: 0.62, heldStretch: 1.16, tossGain: 1.45, followStiff: 90, followDamp: 5, followReach: 1.0, windUp: 0 },
  // Mog: smooth and unhurried, then sudden; goes long when lifted; lands softly, as a cat does.
  mog: { breatheRate: 0.34, breatheDepth: 0.024, blinkEvery: 5.2, blinkLasts: 0.22, springStiff: 250, springDamp: 20, gather: 0.2, crouch: 0.7, landSquash: 0.84, heldStretch: 1.34, tossGain: 1.1, followStiff: 160, followDamp: 14, followReach: 0.5, windUp: 0 },
  // Dot: small careful moves, a soft wobble that takes a while to die away.
  dot: { breatheRate: 0.46, breatheDepth: 0.018, blinkEvery: 3.4, blinkLasts: 0.13, springStiff: 190, springDamp: 9, gather: 0.1, crouch: 0.86, landSquash: 0.76, heldStretch: 1.1, tossGain: 1.0, followStiff: 120, followDamp: 7, followReach: 0.7, windUp: 0 },
  // Bo: slow and heavy; rocks to get going; lands flat and his belly goes on wobbling.
  bo: { breatheRate: 0.2, breatheDepth: 0.04, blinkEvery: 7.5, blinkLasts: 0.34, springStiff: 110, springDamp: 6.5, gather: 0.46, crouch: 0.82, landSquash: 0.55, heldStretch: 1.05, tossGain: 0.45, followStiff: 46, followDamp: 3.2, followReach: 1.3, windUp: 0.16 },
}
