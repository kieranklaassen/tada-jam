// What an animal does with the thing that helped it, in the well scene (ART.md,
// "The scenes", and "The characters and their fixed tastes"): it plays with
// it in the manner of its taste. Each animal has three of its own: one for
// the thing it loves, one for the thing it is wary of, and one for any other
// thing, each in the way that animal moves. No two animals share one.
//
// A flourish moves the whole sticker and never uses the place and movement of
// a sign, and its faces are those of an animal that is well.
// Pure: no renderer, no DOM, no clock.

import type { Species, Taste } from './cast'
import { REST, type Pose } from './motion'

const TAU = Math.PI * 2
const up = (p: number) => Math.sin(Math.PI * Math.min(1, Math.max(0, p)))
const smooth = (p: number) => { const c = Math.min(1, Math.max(0, p)); return c * c * (3 - 2 * c) }
/** A span of the flourish as its own progress, 0 before `from` and 1 after `to`. */
const span = (p: number, from: number, to: number) => Math.min(1, Math.max(0, (p - from) / (to - from)))

type Flourish = (p: number) => Pose

/** With any thing it neither loves nor distrusts: the way this animal moves, and nobody else. */
const PLAIN: Readonly<Record<Species, Flourish>> = {
  // Big, slow, heavy: one deep settle with the belly out, and a slow roll of the shoulders.
  bear: (p) => ({ ...REST, y: 5 * up(p), sx: 1 + 0.08 * up(p), sy: 1 - 0.05 * up(p), rot: 0.05 * Math.sin(TAU * p), face: 'glad' }),
  // Small and quick, starts and stops: two sharp hops, a dead stop, one more.
  rabbit: (p) => {
    const hop = p < 0.4 ? Math.abs(Math.sin(TAU * (p / 0.4))) : p > 0.7 ? up(span(p, 0.7, 1)) : 0
    return { ...REST, y: -34 * hop, sy: 1 + 0.07 * hop, face: p > 0.4 && p < 0.7 ? 'wow' : 'glad' }
  },
  // Smooth and exact: one long arch of the back, held, and let down without a wobble.
  cat: (p) => {
    const arch = smooth(span(p, 0, 0.35)) * (1 - smooth(span(p, 0.7, 1)))
    return { ...REST, y: -6 * arch, sy: 1 + 0.11 * arch, sx: 1 - 0.06 * arch, rot: -0.04 * arch, face: arch > 0.6 ? 'bliss' : 'glad' }
  },
  // Bouncy and eager, past every stop: three bounces, each smaller, wagging all the way.
  dog: (p) => ({ ...REST, y: -38 * Math.abs(Math.sin(Math.PI * 3 * p)) * (1 - p), rot: 0.1 * Math.sin(TAU * 4 * p) * (1 - p), sy: 1 + 0.05 * Math.abs(Math.sin(Math.PI * 3 * p)), face: 'glad' }),
  // Tiny and round, rolls when it can: one whole roll on the spot.
  hedgehog: (p) => ({ ...REST, rot: TAU * smooth(span(p, 0.1, 0.8)), y: -12 * up(span(p, 0.1, 0.8)), face: p > 0.8 ? 'bliss' : 'glad' }),
  // Waddling and top-heavy: it rocks from foot to foot and nearly tips.
  duck: (p) => ({ ...REST, x: 14 * Math.sin(TAU * 2 * p) * up(p), rot: 0.15 * Math.sin(TAU * 2 * p + 0.6) * up(p), sy: 1 - 0.03 * Math.abs(Math.sin(TAU * 2 * p)), face: 'glad' }),
}

/** With the thing it loves: a short piece of its own scene with that thing. */
const LOVES: Readonly<Record<Species, Flourish>> = {
  // The basket, worn as trousers: it stands up in it and sways.
  bear: (p) => ({ ...REST, y: -30 * up(p), x: 16 * Math.sin(TAU * p) * up(p), rot: 0.08 * Math.sin(TAU * p) * up(p), sy: 1 + 0.03 * up(p), face: 'bliss' }),
  // The blanket: down flat and along it one way and back, as through a tunnel.
  rabbit: (p) => ({ ...REST, x: 64 * Math.sin(TAU * p), sy: 1 - 0.16 * up(p), y: 4 * up(p), face: p > 0.85 ? 'bliss' : 'glad' }),
  // The brush: one cheek along it, then the other.
  cat: (p) => ({ ...REST, x: 18 * Math.sin(TAU * p), rot: 0.16 * Math.sin(TAU * p), y: -5 * Math.abs(Math.sin(TAU * p)), face: 'bliss' }),
  // The bowl: three laps head down, then a shake that sprays.
  dog: (p) => {
    const laps = p < 0.55 ? Math.abs(Math.sin(Math.PI * 3 * (p / 0.55))) : 0, shake = p >= 0.55 ? Math.sin(TAU * 4 * span(p, 0.55, 1)) * (1 - span(p, 0.55, 1)) : 0
    return { ...REST, y: 13 * laps, sy: 1 - 0.11 * laps, rot: 0.13 * shake, face: 'glad' }
  },
  // The plaster, its flag: it marches on the spot, four steps.
  hedgehog: (p) => ({ ...REST, y: -11 * Math.abs(Math.sin(TAU * 2 * p)), rot: 0.08 * Math.sign(Math.sin(TAU * 2 * p)) * up(p), face: p > 0.8 ? 'bliss' : 'glad' }),
  // The bowl, its boat: it sails a slow curve across and back.
  duck: (p) => ({ ...REST, x: 40 * Math.sin(TAU * p), y: 6 * up(p), rot: 0.12 * Math.cos(TAU * p) * up(p), face: 'bliss' }),
}

/** With the thing it is wary of, which helped all the same: startled or cross at the thing, never hurt. */
const WARY: Readonly<Record<Species, Flourish>> = {
  // The brush: ticklish, and a giggle rolls down the belly.
  bear: (p) => {
    const giggle = Math.sin(TAU * 5 * p) * (1 - p) * span(p, 0.15, 0.3)
    return { ...REST, x: -8 * (1 - span(p, 0.15, 0.3)) * up(span(p, 0, 0.3)), sx: 1 + 0.06 * giggle, sy: 1 - 0.05 * giggle, face: p < 0.25 ? 'wary' : 'glad' }
  },
  // The basket: two thumps of a foot at it, and a hop back.
  rabbit: (p) => {
    const thump = p < 0.5 ? Math.abs(Math.sin(TAU * (p / 0.5))) : 0, back = up(span(p, 0.5, 1))
    return { ...REST, y: -9 * thump - 30 * back, x: -26 * smooth(span(p, 0.5, 0.75)) * (1 - smooth(span(p, 0.85, 1))), rot: -0.1 * (thump > 0 ? 1 : 0) * up(span(p, 0, 0.5)), face: p < 0.5 ? 'wary' : 'wow' }
  },
  // The bowl: it leans in, starts back, and shakes a paw's worth of water off.
  cat: (p) => {
    const lean = smooth(span(p, 0, 0.35)) * (1 - span(p, 0.35, 0.42)), away = smooth(span(p, 0.35, 0.45)) * (1 - smooth(span(p, 0.85, 1)))
    const shake = p > 0.45 && p < 0.85 ? Math.sin(TAU * 5 * span(p, 0.45, 0.85)) : 0
    return { ...REST, x: 16 * lean - 28 * away, rot: 0.13 * lean - 0.08 * away + 0.07 * shake, face: p < 0.35 ? 'wary' : p < 0.85 ? 'wow' : 'wary' }
  },
  // The plaster: one long suspicious sniff at arm's length, held, and a sneeze.
  dog: (p) => {
    const sniff = smooth(span(p, 0, 0.3)) * (1 - smooth(span(p, 0.74, 0.8))), sneeze = up(span(p, 0.76, 0.92))
    return { ...REST, x: 26 * sniff, y: 6 * sniff + 8 * sneeze, rot: 0.17 * sniff + 0.012 * Math.sin(TAU * 9 * p) * sniff, sy: 1 - 0.18 * sneeze, sx: 1 + 0.06 * sneeze, face: p > 0.76 && p < 0.92 ? 'wow' : 'wary' }
  },
  // The blanket: the spines catch, and it goes over once like a parcel and comes up cross.
  hedgehog: (p) => ({ ...REST, x: 46 * up(span(p, 0, 0.8)), rot: TAU * smooth(span(p, 0, 0.4)) - TAU * smooth(span(p, 0.4, 0.8)), sy: 1 - 0.08 * up(span(p, 0, 0.8)), face: p > 0.8 ? 'wary' : 'wow' }),
  // The brush: puffed up the wrong way, and put right in three cross little jerks.
  duck: (p) => {
    const puffed = smooth(span(p, 0, 0.2)), jerks = Math.min(3, Math.floor(span(p, 0.3, 0.9) * 3 + 1e-9)), jerk = up((span(p, 0.3, 0.9) * 3) % 1) * (p > 0.3 && p < 0.9 ? 1 : 0)
    return { ...REST, sx: 1 + 0.15 * puffed * (1 - jerks / 3), sy: 1 + 0.04 * puffed * (1 - jerks / 3), rot: -0.16 * jerk, face: 'wary' }
  },
}

const BY_TASTE: Readonly<Record<Taste, Readonly<Record<Species, Flourish>>>> = { loves: LOVES, wary: WARY, plain: PLAIN }

/** Where this animal's whole sticker is, `p` of the way through its flourish with a thing it takes in this manner. */
export function flourishPose(species: Species, manner: Taste, p: number): Pose {
  if (p <= 0 || p >= 1) return { ...REST, face: manner === 'wary' ? 'wary' : manner === 'loves' ? 'bliss' : 'glad' }
  return BY_TASTE[manner][species](p)
}
