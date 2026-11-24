import type { Gait } from './lineage'

// How things move. An act is a function from time to a pose: the model plays
// it, the view draws it, and a chick copies its mother by playing the same
// act late and small. No character shares an act with another.

export type Pose = {
  /** Sideways in the way it faces, and up from the ground, in stage units. */
  dx: number; lift: number
  /** Turned toward the way it faces, in radians. */
  rot: number
  sx: number; sy: number
  /** 0 shut to 1 wide open. */
  mouth: number
  /** 0 eyes open to 1 shut. */
  shut: number
  /** Wings, lid, tongue, ears or arms, whatever the body has: -1 to 1. */
  flap: number
  /** Where the eyes are turned by the act, from -1 to 1 each way. */
  gazeX: number; gazeY: number
  /** The head turned on the neck, for a body whose head turns by itself. */
  head: number
}

export const REST: Pose = { dx: 0, lift: 0, rot: 0, sx: 1, sy: 1, mouth: 0, shut: 0, flap: 0, gazeX: 0, gazeY: 0, head: 0 }

export type Act = { lasts: number; at(t: number): Partial<Pose> }

const { PI, sin, cos, abs, max, min } = Math
const clamp = (t: number) => min(1, max(0, t))
/** Up and down once between a and b. */
const hump = (t: number, a: number, b: number) => (t <= a || t >= b ? 0 : sin(((t - a) / (b - a)) * PI))
/** Up over a..b, held, down over c..d. */
const hold = (t: number, a: number, b: number, c: number, d: number) => {
  const ease = (v: number) => v * v * (3 - 2 * v)
  return ease(clamp((t - a) / (b - a))) * (1 - ease(clamp((t - c) / (d - c))))
}
const wob = (t: number, n: number) => sin(t * PI * 2 * n)
/** A wobble that dies away. */
const ring = (t: number, n: number) => wob(t, n) * (1 - t)

const act = (lasts: number, at: (t: number) => Partial<Pose>): Act => ({ lasts, at })

export const ACTS = {
  // --- the boot: stiff, heavy, its top is its mouth
  bootStomp: act(1.05, (t) => { const s = hump(t, 0, 0.3) + hump(t, 0.33, 0.63) + hump(t, 0.66, 0.96); const thud = hump(t, 0.28, 0.38) + hump(t, 0.61, 0.71) + hump(t, 0.93, 1); return { lift: s * 46, rot: -s * 0.3, sy: 1 - thud * 0.16, sx: 1 + thud * 0.1, flap: thud } }),
  bootFlop: act(0.6, (t) => ({ rot: -0.22 * (1 - clamp(t / 0.3)), flap: ring(t, 2), sy: 1 - hump(t, 0.2, 0.5) * 0.14 })),
  bootSquelch: act(0.7, (t) => ({ sx: 1 + ring(t, 2) * 0.12, sy: 1 - ring(t, 2) * 0.12, mouth: hump(t, 0, 0.6) })),
  bootSpurt: act(1.1, (t) => ({ sx: 1 - hump(t, 0.1, 0.5) * 0.2 + hump(t, 0.5, 0.9) * 0.1, sy: 1 + hump(t, 0.1, 0.5) * 0.1, rot: hump(t, 0.35, 0.8) * -0.25, mouth: hump(t, 0.1, 0.8) })),
  bootKick: act(0.8, (t) => ({ rot: -hump(t, 0, 0.45) * 0.5 + hump(t, 0.4, 0.75) * 0.85, dx: -hump(t, 0, 0.45) * 22 + hump(t, 0.4, 0.8) * 34, lift: hump(t, 0.38, 0.8) * 18 })),
  bootHop: act(1.3, (t) => ({ lift: abs(wob(t, 2)) * 34, rot: wob(t, 2) * 0.16, flap: wob(t, 6), gazeY: 0.8 })),
  bootKickHop: act(1.6, (t) => ({ rot: -hump(t, 0, 0.22) * 0.5 + hump(t, 0.2, 0.38) * 0.85 + (t > 0.4 ? wob(t, 4) * 0.14 : 0), dx: hump(t, 0.2, 0.4) * 30, lift: t > 0.42 ? abs(wob((t - 0.42) / 0.58, 1.5)) * 30 : 0, flap: t > 0.42 ? wob(t, 6) : 0 })),
  bootFill: act(1.4, (t) => ({ sx: 1 + hold(t, 0, 0.4, 0.6, 1) * 0.1 + ring(t, 9) * 0.03, mouth: hold(t, 0, 0.2, 0.7, 1), shut: hold(t, 0.4, 0.5, 0.9, 1) })),
  bootSeen: act(0.9, (t) => ({ flap: wob(t, 3) * (1 - t), rot: hold(t, 0, 0.2, 0.6, 1) * 0.14, mouth: hump(t, 0, 0.5) })),
  // --- the teapot: round, fussy, bows from the waist
  teapotPour: act(1.4, (t) => ({ rot: hold(t, 0.05, 0.35, 0.7, 1) * 0.95, lift: hold(t, 0, 0.3, 0.75, 1) * 26, dx: t * 4, flap: hump(t, 0.3, 0.75) * 0.5 })),
  teapotRattle: act(0.6, (t) => ({ flap: abs(ring(t, 5)), sy: 1 - hump(t, 0, 0.25) * 0.1 })),
  teapotLid: act(0.8, (t) => ({ flap: hold(t, 0, 0.15, 0.6, 1), sy: 1 + ring(t, 2) * 0.09, sx: 1 - ring(t, 2) * 0.07 })),
  teapotBlub: act(1.3, (t) => ({ lift: wob(t, 3) * 5, sx: 1 + abs(wob(t, 3)) * 0.07, mouth: abs(wob(t, 3)), flap: abs(wob(t, 3)) * 0.5 })),
  teapotSteam: act(1.7, (t) => ({ sx: 1 + hold(t, 0, 0.35, 0.8, 1) * 0.12, sy: 1 + hold(t, 0, 0.35, 0.8, 1) * 0.06 + ring(t, 14) * 0.02, flap: hold(t, 0.1, 0.3, 0.8, 1) * abs(wob(t, 8)), shut: hold(t, 0.1, 0.3, 0.8, 1), mouth: hold(t, 0.1, 0.2, 0.8, 1) })),
  teapotTink: act(1.5, (t) => ({ flap: hump(t, 0, 0.18) + hump(t, 0.36, 0.54) + hump(t, 0.72, 0.9), rot: wob(t, 1.4) * -0.12 })),
  teapotSeen: act(1, (t) => ({ rot: -hold(t, 0, 0.25, 0.6, 1) * 0.3, flap: hump(t, 0, 0.4), mouth: hump(t, 0.1, 0.6) })),
  // --- the pig: soft, low, all bottom
  pigTrot: act(1.1, (t) => ({ lift: abs(wob(t, 3)) * 12, rot: wob(t, 3) * 0.1, sx: 1 + wob(t, 6) * 0.05, flap: wob(t, 3) })),
  pigFlat: act(0.8, (t) => ({ sy: 1 - hold(t, 0, 0.12, 0.35, 1) * 0.34, sx: 1 + hold(t, 0, 0.12, 0.35, 1) * 0.2, mouth: hump(t, 0.3, 0.8) })),
  pigGiggle: act(1, (t) => ({ sy: 1 + ring(t, 6) * 0.05, shut: 1 - clamp((t - 0.8) / 0.2), mouth: 0.4 + abs(wob(t, 3)) * 0.4 * (1 - t), flap: wob(t, 4) })),
  pigWallow: act(2.1, (t) => ({ rot: hold(t, 0, 0.22, 0.8, 1) * (PI + wob(t, 3) * 0.28), lift: hold(t, 0, 0.22, 0.8, 1) * 10, flap: wob(t, 5), shut: hold(t, 0.2, 0.3, 0.8, 0.9), mouth: 0.6 * hold(t, 0.1, 0.3, 0.8, 1) })),
  pigFaint: act(2.4, (t) => ({ dx: hump(t, 0, 0.25) * 18, rot: -hold(t, 0.28, 0.4, 0.86, 1) * 2.8, lift: hold(t, 0.28, 0.4, 0.86, 1) * 10 + hump(t, 0.4, 0.48) * 8, shut: hold(t, 0.22, 0.3, 0.86, 1), flap: hold(t, 0.3, 0.4, 0.8, 1) * wob(t, 6), mouth: hump(t, 0.2, 0.45) })),
  pigSlurp: act(1.9, (t) => ({ dx: hold(t, 0, 0.12, 0.6, 0.7) * 12, rot: hold(t, 0, 0.12, 0.6, 0.7) * 0.2, sx: 1 + hold(t, 0.1, 0.6, 0.72, 0.8) * 0.16, mouth: hold(t, 0.1, 0.16, 0.58, 0.62) * 0.4 + hump(t, 0.72, 0.95), sy: 1 + hump(t, 0.7, 0.86) * 0.12 })),
  pigLick: act(1.5, (t) => ({ dx: hold(t, 0, 0.15, 0.7, 1) * 22, rot: -abs(wob(t, 2)) * 0.16, mouth: abs(wob(t, 2)), flap: 0.5 })),
  pigNose: act(0.9, (t) => ({ rot: hump(t, 0, 0.4) * 0.3 - hump(t, 0.38, 0.8) * 0.25, dx: hump(t, 0.2, 0.7) * 32 })),
  pigDance: act(2, (t) => ({ lift: abs(wob(t, 4)) * 22, rot: wob(t, 2) * 0.24, flap: wob(t, 4), shut: 0.6, mouth: 0.5 })),
  pigSit: act(2.8, (t) => ({ sy: 1 - hold(t, 0.1, 0.2, 0.85, 1) * 0.1, sx: 1 + wob(t, 2) * 0.03, shut: hold(t, 0.2, 0.3, 0.85, 1), rot: wob(t, 2) * 0.05 })),
  pigSeen: act(1, (t) => ({ lift: hump(t, 0, 0.3) * 22, flap: 1 - t, mouth: hump(t, 0.1, 0.7), gazeX: -0.6 })),
  // --- the farmer: everything happens to him asleep
  farmerLurch: act(1.1, (t) => ({ rot: -hold(t, 0, 0.2, 0.5, 0.9) * 0.16, lift: hump(t, 0.6, 0.85) * 10, mouth: abs(wob(t, 3)) * 0.8, dx: hump(t, 0.1, 0.7) * 10 })),
  farmerSmack: act(1, (t) => ({ sy: 1 - hump(t, 0, 0.2) * 0.1, mouth: hump(t, 0.25, 0.45) * 0.6 + hump(t, 0.5, 0.7) * 0.6 })),
  farmerBelly: act(1.9, (t) => ({ flap: abs(wob(t, 1.5)), mouth: hump(t, 0.3, 0.9) * 0.6 })),
  farmerKick: act(1.6, (t) => ({ rot: wob(t, 5) * 0.06, flap: wob(t, 5), mouth: 0.5 + wob(t, 9) * 0.4 })),
  farmerHug: act(2.4, (t) => ({ dx: hold(t, 0.05, 0.25, 0.75, 1) * -16, rot: hold(t, 0.05, 0.25, 0.75, 1) * -0.1, flap: hold(t, 0.05, 0.25, 0.75, 1), mouth: 0.2 })),
  farmerSip: act(2.1, (t) => ({ rot: -hold(t, 0.1, 0.25, 0.6, 0.75) * 0.14, mouth: hold(t, 0.05, 0.12, 0.5, 0.6) * 0.5, sy: 1 + hump(t, 0.62, 0.9) * 0.08, flap: hump(t, 0.6, 0.95) })),
  farmerGiggle: act(1.7, (t) => ({ lift: abs(ring(t, 6)) * 6, rot: ring(t, 6) * 0.05, mouth: abs(wob(t, 4)) * (1 - t) })),
  farmerSnore: act(2.6, (t) => ({ flap: hump(t, 0, 0.45) - hump(t, 0.5, 0.95) * 0.5, mouth: hump(t, 0.45, 0.95), sy: 1 + hump(t, 0, 0.45) * 0.06 })),
  farmerWakes: act(3, (t) => ({ lift: hold(t, 0.05, 0.2, 0.8, 1) * 10, gazeX: hold(t, 0.2, 0.3, 0.75, 0.85) * sin((t - 0.25) * PI * 3.4), gazeY: -0.2, shut: -hold(t, 0.08, 0.16, 0.8, 0.95), rot: -hold(t, 0.05, 0.2, 0.8, 1) * 0.08 })),
  farmerPillow: act(2.8, (t) => ({ dx: hold(t, 0.1, 0.25, 0.85, 1) * -14, flap: hold(t, 0.1, 0.3, 0.8, 1), mouth: hump(t, 0.3, 0.9) * 0.3, rot: wob(t, 1) * 0.03 })),
  farmerSeen: act(1.1, (t) => ({ flap: hump(t, 0, 0.5) * 0.6, mouth: hump(t, 0.3, 0.9) * 0.4, sy: 1 + hump(t, 0, 0.4) * 0.05 })),
  // --- the ball: all spring
  ballBoing: act(1, (t) => ({ lift: abs(wob(t, 1.5)) * 54 * (1 - t * 0.6), sy: 1 + cos(t * PI * 6) * 0.14 * (1 - t), sx: 1 - cos(t * PI * 6) * 0.1 * (1 - t) })),
  ballDrop: act(1.1, (t) => ({ lift: hump(t, 0.08, 0.45) * 60 + hump(t, 0.45, 0.75) * 30 + hump(t, 0.75, 0.95) * 12, sy: 1 - (hump(t, 0, 0.1) + hump(t, 0.42, 0.5) + hump(t, 0.72, 0.79)) * 0.2 })),
  ballWobble: act(1.1, (t) => ({ dx: wob(t, 2.5) * 12, rot: wob(t, 2.5) * 0.3, sx: 1 + abs(wob(t, 2.5)) * 0.05 })),
  ballBob: act(1.8, (t) => ({ lift: wob(t, 3) * 9 * (1 - t * 0.5), rot: wob(t, 1.5) * 0.2 })),
  ballHover: act(2.3, (t) => ({ lift: hold(t, 0, 0.25, 0.75, 1) * (64 + wob(t, 4) * 8), rot: t * 2.4 })),
  ballBounceOff: act(0.9, (t) => ({ dx: hump(t, 0, 0.4) * 26 - hump(t, 0.35, 1) * 30, lift: hump(t, 0.3, 0.95) * 30, sx: 1 - hump(t, 0.28, 0.42) * 0.22 })),
  ballSeen: act(0.8, (t) => ({ sy: 1 + ring(t, 3) * 0.16, sx: 1 - ring(t, 3) * 0.14, gazeY: -0.4 })),
  // --- the bell: hangs from its handle and swings
  bellSwing: act(1.6, (t) => ({ rot: wob(t, 2) * 0.46 * (1 - t * 0.7), dx: wob(t, 2) * 8, flap: wob(t + 0.04, 2), mouth: abs(wob(t, 2)) * 0.6 })),
  bellClank: act(0.6, (t) => ({ sy: 1 - hump(t, 0, 0.2) * 0.12, flap: ring(t, 4), rot: ring(t, 1) * 0.1 })),
  bellJingle: act(1, (t) => ({ rot: ring(t, 7) * 0.13, flap: ring(t, 9) })),
  bellDroop: act(1.5, (t) => ({ rot: hold(t, 0, 0.5, 0.6, 1) * 0.4, sy: 1 - hold(t, 0, 0.5, 0.6, 1) * 0.1, sx: 1 + hold(t, 0, 0.5, 0.6, 1) * 0.06, shut: hold(t, 0.1, 0.5, 0.6, 1) * 0.7 })),
  bellStruck: act(1.3, (t) => ({ rot: ring(t, 2.5) * -0.6, flap: ring(t, 5), mouth: hump(t, 0, 0.5) })),
  bellTurns: act(1.5, (t) => ({ rot: (hump(t, 0.18, 0.36) - hump(t, 0.54, 0.72)) * 0.34, flap: wob(t, 2.8), mouth: hump(t, 0.18, 0.36) + hump(t, 0.54, 0.72) })),
  bellSeen: act(1, (t) => ({ flap: ring(t, 6), gazeX: 0.4, mouth: hump(t, 0, 0.4) * 0.7, rot: hump(t, 0, 0.5) * -0.14 })),
  // --- eggs
  eggRock: act(0.9, (t) => ({ rot: ring(t, 2.5) * 0.28 })),
  eggKnock: act(0.9, (t) => ({ rot: (hump(t, 0, 0.12) + hump(t, 0.25, 0.37) + hump(t, 0.5, 0.62)) * 0.13, flap: hold(t, 0, 0.1, 0.7, 1) })),
  eggSpin: act(1.7, (t) => ({ rot: sin(t * PI * 4) * 0.12, sx: 1 - abs(sin(t * PI * 3)) * 0.1, lift: wob(t, 2) * 3 })),
  eggTok: act(0.5, (t) => ({ dx: -hump(t, 0, 0.3) * 8, rot: -ring(t, 1.5) * 0.2 })),
  eggSquash: act(0.4, (t) => ({ sy: 1 - hump(t, 0, 0.5) * 0.16, sx: 1 + hump(t, 0, 0.5) * 0.12 })),
  // --- chicks
  chickHop: act(0.7, (t) => ({ lift: hump(t, 0, 0.6) * 34, flap: wob(t, 4), mouth: hump(t, 0.05, 0.6), sy: 1 - hump(t, 0.58, 0.8) * 0.2 })),
  chickFlap: act(0.7, (t) => ({ flap: wob(t, 6), mouth: hump(t, 0, 0.5) * 0.6, sy: 1 - hump(t, 0.1, 0.35) * 0.22, sx: 1 + hump(t, 0.1, 0.35) * 0.16 })),
  chickPaddle: act(1.5, (t) => ({ lift: wob(t, 3) * 3, rot: wob(t, 4) * 0.16, flap: wob(t, 8), shut: 0.5, mouth: 0.4 })),
  chickPerch: act(0.8, (t) => ({ rot: ring(t, 3) * 0.2, flap: ring(t, 5), mouth: hump(t, 0, 0.4) })),
  chickDown: act(0.6, (t) => ({ lift: hump(t, 0, 0.7) * 22, flap: 1 - t, shut: hump(t, 0, 0.6) })),
  chickCry: act(0.6, (t) => ({ mouth: hold(t, 0, 0.15, 0.6, 1), sy: 1 + hump(t, 0, 0.7) * 0.14, sx: 1 - hump(t, 0, 0.7) * 0.06, flap: hump(t, 0, 0.5) })),
  // --- the hen: every look of hers belongs to one mother
  henGasp: act(1.7, (t) => ({ sy: 1 + hold(t, 0, 0.1, 0.5, 1) * 0.1, mouth: hold(t, 0, 0.08, 0.6, 0.9), flap: hold(t, 0.1, 0.25, 0.75, 1), gazeX: -1 })),
  henTurn: act(2, (t) => ({ head: hold(t, 0.05, 0.3, 0.75, 1) * -PI, gazeX: -0.6, mouth: hump(t, 0.4, 0.8) * 0.3 })),
  henFaint: act(2.3, (t) => ({ rot: -hold(t, 0.12, 0.24, 0.8, 1) * 0.5, dx: -hold(t, 0.12, 0.24, 0.8, 1) * 14, shut: hold(t, 0.1, 0.2, 0.82, 0.95), mouth: hold(t, 0, 0.1, 0.8, 0.9), flap: -hold(t, 0.1, 0.2, 0.8, 1) })),
  henTut: act(1.8, (t) => ({ dx: wob(t, 2.5) * 5 * (1 - t), head: wob(t, 2.5) * 0.3 * (1 - t), shut: 0.5 * (1 - t), gazeX: wob(t, 2.5), mouth: abs(wob(t, 2.5)) * 0.3 })),
  henRound: act(2.1, (t) => ({ gazeX: cos(t * PI * 6), gazeY: sin(t * PI * 6), head: sin(t * PI * 6) * 0.14, mouth: 0.4 })),
  henNod: act(2, (t) => ({ head: abs(wob(t, 1.5)) * 0.4, sy: 1 - abs(wob(t, 1.5)) * 0.06, gazeX: -0.7, shut: 0.35 })),
  henSmug: act(2, (t) => ({ sx: 1 + hold(t, 0, 0.3, 0.7, 1) * 0.12, sy: 1 + hold(t, 0, 0.3, 0.7, 1) * 0.07, shut: hold(t, 0.1, 0.3, 0.75, 1) })),
  henCompare: act(2.4, (t) => ({ gazeX: hold(t, 0, 0.1, 0.25, 0.32) * -1 + hold(t, 0.32, 0.4, 0.55, 0.62) * 0.5 - hold(t, 0.62, 0.7, 0.85, 1), gazeY: 0.5, head: wob(t, 1.5) * 0.2 })),
  henTwice: act(1.7, (t) => ({ gazeX: t < 0.3 ? -0.7 : t < 0.5 ? 0.9 : -1, lift: hump(t, 0.5, 0.7) * 16, mouth: hold(t, 0.5, 0.6, 0.8, 1) * 0.8 })),
  henLean: act(2.1, (t) => ({ dx: hold(t, 0, 0.3, 0.75, 1) * 16, rot: hold(t, 0, 0.3, 0.75, 1) * 0.12, head: hold(t, 0, 0.3, 0.75, 1) * 0.5, gazeX: -0.6, gazeY: 1 })),
  henLay: act(1.2, (t) => ({ sy: 1 - hold(t, 0, 0.35, 0.5, 0.6) * 0.14 + hump(t, 0.55, 0.85) * 0.14, sx: 1 + hold(t, 0, 0.35, 0.5, 0.6) * 0.1, shut: hold(t, 0, 0.2, 0.5, 0.6), mouth: hump(t, 0.5, 0.9), lift: hump(t, 0.55, 0.9) * 20 })),
  henWing: act(0.8, (t) => ({ flap: 1, sx: 1 + hump(t, 0, 0.5) * 0.05, mouth: hump(t, 0, 0.6) * 0.5 })),
  henStretch: act(1.1, (t) => ({ lift: hold(t, 0, 0.2, 0.55, 0.75) * 34, sy: 1 + hold(t, 0, 0.2, 0.55, 0.75) * 0.1 - hump(t, 0.75, 0.95) * 0.14, mouth: hold(t, 0.05, 0.15, 0.5, 0.7), flap: -0.5 * hump(t, 0, 0.7) })),
  henFluff: act(1.9, (t) => ({ sx: 1 + hold(t, 0.2, 0.35, 0.6, 0.75) * 0.13 + ring(t, 10) * 0.02, sy: 1 - hold(t, 0.45, 0.6, 0.66, 0.72) * 0.12, shut: hold(t, 0.3, 0.45, 0.66, 0.75), flap: hump(t, 0, 0.35), mouth: hump(t, 0.66, 0.9) * 0.6 })),
  henCoo: act(1.6, (t) => ({ sx: 1 + hold(t, 0.1, 0.35, 0.5, 0.7) * 0.14, sy: 1 + hold(t, 0.1, 0.35, 0.5, 0.7) * 0.08 - hump(t, 0.68, 0.85) * 0.1, shut: hold(t, 0.1, 0.3, 0.6, 0.75), mouth: hump(t, 0.1, 0.6) * 0.3, gazeY: hold(t, 0.75, 0.85, 0.95, 1) })),
  henFoot: act(2.8, (t) => ({ lift: abs(wob(t, 3)) * 40 * hold(t, 0, 0.1, 0.85, 1), rot: wob(t, 3) * 0.12, flap: wob(t, 7), mouth: abs(wob(t, 3)) })),
  henLaunched: act(2.8, (t) => ({ lift: hold(t, 0.15, 0.25, 0.75, 0.95) * (90 + wob(t, 5) * 8), flap: hold(t, 0.1, 0.2, 0.8, 1) * wob(t, 9), mouth: hold(t, 0.12, 0.2, 0.7, 0.9), gazeY: 1 })),
  henUnder: act(2.8, (t) => ({ sy: 1 - hold(t, 0.06, 0.14, 0.8, 0.95) * 0.3, sx: 1 + hold(t, 0.06, 0.14, 0.8, 0.95) * 0.2, gazeY: -1, mouth: hold(t, 0.1, 0.2, 0.75, 0.9) * 0.4 })),
  henHugged: act(2.8, (t) => ({ sx: 1 - hold(t, 0.1, 0.3, 0.8, 1) * 0.14, sy: 1 + hold(t, 0.1, 0.3, 0.8, 1) * 0.1, gazeX: -1, mouth: hump(t, 0.3, 0.6) * 0.5 })),
  henCircus: act(2.8, (t) => ({ lift: hold(t, 0.08, 0.18, 0.82, 1) * 78, rot: wob(t, 2.5) * 0.16 * hold(t, 0.1, 0.2, 0.8, 1), flap: hold(t, 0.1, 0.2, 0.8, 1) * wob(t, 5), dx: wob(t, 2.5) * 14 })),
  henEcho: act(2.8, (t) => ({ rot: wob(t, 2) * 0.1, mouth: abs(wob(t, 1.5)), gazeY: -0.9, sy: 1 - hump(t, 0, 0.15) * 0.1 })),
} as const satisfies Record<string, Act>

export type ActName = keyof typeof ACTS
const TABLE: Record<ActName, Act> = ACTS

export function actLasts(name: ActName): number {
  return TABLE[name].lasts
}

/** The pose `seconds` into an act, `amount` of it. Written into `out`, on top of what is there. */
export function addAct(out: Pose, name: ActName, seconds: number, amount = 1): Pose {
  const t = clamp(seconds / TABLE[name].lasts)
  return add(out, TABLE[name].at(t), amount)
}

export function add(out: Pose, p: Partial<Pose>, amount = 1): Pose {
  out.dx += (p.dx ?? 0) * amount
  out.lift += (p.lift ?? 0) * amount
  out.rot += (p.rot ?? 0) * amount
  out.sx *= 1 + ((p.sx ?? 1) - 1) * amount
  out.sy *= 1 + ((p.sy ?? 1) - 1) * amount
  out.mouth = max(out.mouth, (p.mouth ?? 0))
  out.shut += p.shut ?? 0
  out.flap += (p.flap ?? 0)
  out.gazeX += p.gazeX ?? 0
  out.gazeY += p.gazeY ?? 0
  out.head += (p.head ?? 0) * amount
  return out
}

/** Back to rest. */
export function reset(out: Pose): Pose {
  return Object.assign(out, REST)
}

/**
 * How a chick goes along, by what its mother is. `phase` counts steps, and
 * `go` is how much it is moving, 0 to 1. The walks are as unlike as the
 * mothers are.
 */
export const WALKS: Record<Gait, (phase: number, go: number) => Partial<Pose>> = {
  boot: (p, g) => { const s = max(0, sin(p * PI)); return { lift: s * 30 * g, rot: -s * 0.3 * g, sy: 1 - max(0, -sin(p * PI * 2)) * 0.2 * g, flap: -0.6 * g } },
  teapot: (p, g) => ({ rot: sin(p * PI * 0.7) * 0.85 * g, lift: abs(sin(p * PI * 0.7)) * 10 * g, mouth: abs(sin(p * PI * 0.7)) * g }),
  pig: (p, g) => ({ rot: (0.5 + sin(p * PI * 2) * 0.14) * g, lift: abs(sin(p * PI * 2)) * 7 * g, sx: 1 + sin(p * PI * 2) * 0.1 * g }),
  farmer: (p, g) => ({ rot: -1.5 * g, lift: 12 * g, sx: 1 + sin(p * PI * 0.5) * 0.1 * g, shut: 0.4 * g, mouth: max(0, sin(p * PI * 0.5)) * g }),
  ball: (p, g) => ({ rot: p * PI * 1.1 * (g > 0.05 ? 1 : 0), lift: g * 4 + abs(sin(p * PI)) * 10 * g, sx: 1 - 0.06 * g, sy: 1 - 0.1 * g }),
  bell: (p, g) => ({ rot: sin(p * PI) * 0.55 * g, dx: sin(p * PI) * 16 * g, lift: 10 * g, flap: sin(p * PI) * g }),
  hen: (p, g) => ({ dx: sin(p * PI * 2) * 8 * g, lift: max(0, sin(p * PI * 2)) * 6 * g, rot: max(0, sin(p * PI * 0.5) - 0.7) * 2.4 * g, flap: -0.3 * g, mouth: max(0, sin(p * PI * 0.5) - 0.7) * 3 * g }),
  egg: (p, g) => ({ rot: sin(p * PI * 0.8) * 0.3 * g, sy: 1 - 0.14 * g, sx: 1 + 0.08 * g }),
  self: (p, g) => ({ rot: 0.3 * g, lift: abs(sin(p * PI * 2)) * 8 * g, flap: sin(p * PI * 4) * g, gazeX: -1 * g, mouth: 0.5 * g }),
  lost: (p, g) => ({ rot: sin(p * PI * 2) * 0.22 * g, lift: abs(sin(p * PI * 2)) * 12 * g, flap: sin(p * PI * 2) * 0.6 * g }),
}

/** What a chick keeps doing once it stands by its mother, so that it is told from the others standing still. */
export const STANCES: Record<Gait, (time: number) => Partial<Pose>> = {
  boot: (t) => ({ sy: 1 + sin(t * 2) * 0.02, flap: -0.5, lift: (t % 3.4 < 0.5 ? sin((t % 3.4) * 2 * PI) : 0) * 10 }),
  teapot: (t) => ({ rot: sin(t * 1.3) * 0.18, flap: 0.5 }),
  pig: (t) => ({ rot: 0.2 + sin(t * 2.6) * 0.06, sx: 1 + sin(t * 5.2) * 0.02 }),
  farmer: (t) => ({ rot: -1.5, lift: 12, sx: 1 + sin(t * 1.6) * 0.07, shut: 0.4, mouth: max(0, -sin(t * 1.6)) * 0.6 }),
  ball: (t) => ({ sy: 1 + sin(t * 5) * 0.07, sx: 1 - sin(t * 5) * 0.05 }),
  bell: (t) => ({ rot: sin(t * 2.4) * 0.2, flap: sin(t * 2.4) * 0.3 }),
  hen: (t) => ({ rot: max(0, sin(t * 1.4) - 0.6) * 1.2, sy: 1 + sin(t * 2.2) * 0.02 }),
  egg: (t) => ({ rot: sin(t * 1.9) * 0.1, sy: 0.88, sx: 1.07, mouth: max(0, sin(t * 1.9)) * 0.25 }),
  self: (t) => ({ rot: 0.15 + sin(t * 3) * 0.1, gazeX: -0.8 }),
  lost: (t) => ({ rot: sin(t * 2.1) * 0.12, sy: 1 + sin(t * 2.1) * 0.02 }),
}
