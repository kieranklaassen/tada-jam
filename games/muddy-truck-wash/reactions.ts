import { KIND, type Kind } from './fx'
import type { Hand, Patch } from './surface'
import * as voices from './voices'
import type { VoiceSpec } from './voices'

// The object-by-action grid of the design sheet as data: what each touch sets
// loose for what it met. Every cell differs in what flies and what sounds.
// The surface table says what the patch becomes; this says how it answers.

export type Burst = {
  kind: Kind
  count: number
  /** Outward speed, upward push, size and life of each particle. */
  speed: number
  up: number
  size: number
  life: number
}

export type Reaction = {
  voices: VoiceSpec[]
  bursts: Burst[]
  /** How hard the touch presses the body down on its springs, and how hard it kicks it on landing. */
  force: number
  kick: number
}

/** What colours a moment: how fast the finger moves (0..1), which variant of a repeated sound, and how far into a rub the cloth is (0..1). */
export type Moment = { speed: number; variant: number; rise: number }

const burst = (kind: Kind, count: number, speed: number, up: number, size: number, life: number): Burst => ({ kind, count, speed, up, size, life })

export function react(hand: Hand, met: Patch, m: Moment): Reaction {
  if (hand === 'sponge') {
    // Dried mud does not lift: crumbs, dust and a dribble of suds that slides off.
    if (met === 'c') return { voices: [voices.rasp(m.variant)], bursts: [burst(KIND.crumb, 5, 1.1, 0.8, 0.07, 1.6), burst(KIND.dust, 2, 0.4, 0.3, 0.3, 0.7), burst(KIND.blob, 2, 0.3, -0.2, 0.11, 1.2)], force: 1, kick: 0.25 }
    // Soft mud lifts into foam: bubbles off the top and brown drips below.
    if (met === 's') return { voices: [voices.scrub(m.speed, m.variant), voices.foamUp(m.variant)], bursts: [burst(KIND.bubble, 5, 0.5, 0.5, 0.13, 1.5), burst(KIND.splat, 3, 0.4, -0.3, 0.09, 1.4)], force: 1, kick: 0.3 }
    // More foam on foam: taller, and more bubbles drift off.
    if (met === 'b' || met === 'f') return { voices: [voices.scrub(m.speed, m.variant)], bursts: [burst(KIND.bubble, 7, 0.6, 0.7, 0.15, 1.9)], force: 0.9, kick: 0.2 }
    return { voices: [voices.scrub(m.speed, m.variant), voices.foamUp(m.variant + 1)], bursts: [burst(KIND.bubble, 4, 0.5, 0.5, 0.12, 1.4)], force: 1, kick: 0.3 }
  }
  if (hand === 'hose') {
    // Dried mud darkens and drips: the hiss sinks to a gurgle.
    if (met === 'c') return { voices: [voices.spray(m.variant, true)], bursts: [burst(KIND.drop, 6, 1.6, 1.0, 0.07, 0.9), burst(KIND.splat, 3, 0.3, -0.4, 0.1, 1.5)], force: 0.55, kick: 0.15 }
    // Soft mud glistens, slumps and clings.
    if (met === 's') return { voices: [voices.spray(m.variant, false), voices.poke.squelch()], bursts: [burst(KIND.drop, 5, 1.6, 1.0, 0.07, 0.9), burst(KIND.splat, 5, 0.5, -0.5, 0.11, 1.5)], force: 0.55, kick: 0.15 }
    // Foam slides off in rafts.
    if (met === 'b' || met === 'f') return { voices: [voices.rinse(m.variant)], bursts: [burst(KIND.blob, 5, 0.7, -0.3, 0.17, 1.6), burst(KIND.drop, 6, 1.8, 1.2, 0.07, 0.9)], force: 0.6, kick: 0.2 }
    // Polished paint beads the water into fat drops that race off.
    if (met === 'p') return { voices: [voices.spray(m.variant, false)], bursts: [burst(KIND.drop, 5, 1.0, 0.2, 0.13, 1.1)], force: 0.5, kick: 0.15 }
    return { voices: [voices.spray(m.variant, false)], bursts: [burst(KIND.drop, 9, 2.0, 1.3, 0.07, 0.9)], force: 0.55, kick: 0.15 }
  }
  if (hand === 'cloth') {
    if (met === 'c') return { voices: [voices.scratch()], bursts: [burst(KIND.dust, 4, 0.7, 0.5, 0.34, 0.9), burst(KIND.crumb, 2, 0.8, 0.5, 0.06, 1.4)], force: 0.8, kick: 0.2 }
    if (met === 's') return { voices: [voices.smear()], bursts: [burst(KIND.splat, 2, 0.6, 0.1, 0.09, 1.2)], force: 0.9, kick: 0.2 }
    if (met === 'b' || met === 'f') return { voices: [voices.fizz()], bursts: [burst(KIND.blob, 3, 0.9, 0.3, 0.14, 1.3), burst(KIND.bubble, 2, 0.4, 0.4, 0.1, 1.1)], force: 0.8, kick: 0.2 }
    // Drying and shining: a squeak that climbs along the rub, and glints.
    if (met === 'w') return { voices: [voices.shine(m.rise)], bursts: [burst(KIND.glint, 2, 0.0, 0.0, 0.42, 0.55), burst(KIND.drop, 2, 0.8, 0.5, 0.05, 0.6)], force: 0.8, kick: 0.2 }
    if (met === 'd') return { voices: [voices.shine(m.rise)], bursts: [burst(KIND.glint, 1, 0.0, 0.0, 0.46, 0.6)], force: 0.8, kick: 0.2 }
    return { voices: [voices.shine(0.6 + m.rise * 0.4)], bursts: [burst(KIND.glint, 2, 0.0, 0.0, 0.5, 0.7)], force: 0.7, kick: 0.15 }
  }
  // A bare finger: a poke.
  if (met === 'c') return { voices: [voices.poke.knock()], bursts: [burst(KIND.crumb, 5, 0.9, 0.6, 0.07, 1.6)], force: 1, kick: 0.8 }
  if (met === 's') return { voices: [voices.poke.squelch()], bursts: [burst(KIND.splat, 2, 0.7, 0.6, 0.08, 1.0)], force: 1.2, kick: 0.6 }
  if (met === 'b' || met === 'f') return { voices: [voices.pop(0.5)], bursts: [burst(KIND.bubble, 4, 0.7, 0.3, 0.11, 0.35)], force: 0.8, kick: 0.5 }
  if (met === 'w') return { voices: [voices.poke.slide()], bursts: [burst(KIND.drop, 4, 1.2, 0.8, 0.06, 0.8)], force: 1, kick: 0.7 }
  if (met === 'p') return { voices: [voices.poke.print()], bursts: [], force: 1, kick: 0.7 }
  return { voices: [voices.poke.ring()], bursts: [], force: 1, kick: 1 }
}
