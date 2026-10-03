// Every sound of the game as plain numbers: a voice is a short list of notes,
// each a wave or a band of noise with a pitch, a peak, an attack and a length.
// Nothing here touches Web Audio, so a test can hold every voice inside the
// ranges below, and someone who can hear tunes the numbers in one place.

export type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth' | 'noise'

export type Note = {
  wave: Wave
  /** Hz. For noise it is the middle of the band. */
  pitch: number
  /** Hz the pitch glides to by the end of the note. */
  glideTo?: number
  /** Gain at the top of the attack, before the master gain. */
  peak: number
  /** Seconds to the peak. */
  attack: number
  /** Seconds from the peak to silence. */
  length: number
  /** Seconds after the voice starts. */
  delay?: number
  /** How narrow a noise band is: higher is narrower and more pitched. */
  q?: number
}

export type VoiceSpec = readonly Note[]

/** The ranges every note stays inside. */
export const LIMITS = {
  pitch: [45, 7000],
  peak: [0.005, 0.3],
  attack: [0.002, 0.12],
  length: [0.02, 1.4],
  /** A whole voice, from its start to its last note's end. */
  seconds: 2.4,
  notes: 8,
} as const

const clamp = (v: number, [lo, hi]: readonly [number, number]): number => Math.min(hi, Math.max(lo, v))
/** `v` in 0..1 picks a place between two values. */
const between = (a: number, b: number, v: number): number => a + (b - a) * Math.min(1, Math.max(0, v))

function note(wave: Wave, pitch: number, peak: number, attack: number, length: number, more: Partial<Note> = {}): Note {
  const n: Note = { wave, pitch: clamp(pitch, LIMITS.pitch), peak: clamp(peak, LIMITS.peak), attack: clamp(attack, LIMITS.attack), length: clamp(length, LIMITS.length), ...more }
  if (n.glideTo !== undefined) n.glideTo = clamp(n.glideTo, LIMITS.pitch)
  return n
}

/** The sponge lifting mud or laying foam: a wet scrub with a squeak on top. `speed` 0..1 raises it; `variant` 0..3 changes its grain. */
export function scrub(speed: number, variant: number): VoiceSpec {
  const v = ((variant % 4) + 4) % 4
  return [
    note('noise', between(900, 2100, speed) + v * 130, 0.13, 0.012, 0.11 + v * 0.015, { q: 1.4 + v * 0.3, glideTo: between(1300, 2600, speed) }),
    note('sine', between(520, 980, speed) + v * 45, 0.05, 0.02, 0.09, { glideTo: between(700, 1250, speed) + v * 60 }),
  ]
}

/** Bubbles rising off new foam: three small blips climbing. */
export function foamUp(variant: number): VoiceSpec {
  const base = 620 + (((variant % 4) + 4) % 4) * 70
  return [0, 1, 2].map((i) => note('sine', base * (1 + i * 0.26), 0.05, 0.004, 0.05, { delay: 0.03 + i * 0.045, glideTo: base * (1.2 + i * 0.26) }))
}

/** The sponge on dried mud: a dry rasp in three scratches. */
export function rasp(variant: number): VoiceSpec {
  const v = ((variant % 4) + 4) % 4
  return [0, 1, 2].map((i) => note('noise', 1500 + v * 160 + i * 120, 0.1, 0.004, 0.045, { delay: i * 0.055, q: 2.2 }))
}

/** The hose: a hiss of spray. On dried mud it sinks to a gurgle. */
export function spray(variant: number, gurgle: boolean): VoiceSpec {
  const v = ((variant % 4) + 4) % 4
  const hiss = note('noise', 3400 + v * 260, 0.11, 0.015, 0.2, { q: 0.7, glideTo: gurgle ? 900 : 2900 + v * 200 })
  return gurgle ? [hiss, note('sine', 190, 0.07, 0.03, 0.22, { delay: 0.05, glideTo: 110 })] : [hiss]
}

/** Foam carried off: the hiss with a falling wash and two drips. */
export function rinse(variant: number): VoiceSpec {
  const v = ((variant % 4) + 4) % 4
  return [
    note('noise', 2800 + v * 200, 0.12, 0.015, 0.26, { q: 0.7, glideTo: 700 }),
    note('sine', 980 + v * 60, 0.05, 0.004, 0.06, { delay: 0.16, glideTo: 620 }),
    note('sine', 1240 + v * 60, 0.04, 0.004, 0.06, { delay: 0.25, glideTo: 760 }),
  ]
}

/** The cloth drying and shining: a squeak that climbs with each stroke of a rub. `rise` 0..1. */
export function shine(rise: number): VoiceSpec {
  return [
    note('sine', between(760, 1500, rise), 0.07, 0.012, 0.11, { glideTo: between(1150, 2300, rise) }),
    note('triangle', between(2300, 3600, rise), 0.03, 0.004, 0.2, { delay: 0.07 }),
  ]
}

/** The cloth on dried mud: a dry scratch and a puff. */
export function scratch(): VoiceSpec {
  return [note('noise', 2600, 0.08, 0.004, 0.06, { q: 1.8 }), note('noise', 900, 0.05, 0.03, 0.18, { delay: 0.04, q: 0.6 })]
}

/** The cloth on soft mud: a squelchy wipe. */
export function smear(): VoiceSpec {
  return [note('noise', 520, 0.12, 0.02, 0.16, { q: 1.2, glideTo: 300 }), note('sine', 300, 0.06, 0.02, 0.14, { glideTo: 190 })]
}

/** The cloth pushing foam about: a soft fizz. */
export function fizz(): VoiceSpec {
  return [note('noise', 4600, 0.07, 0.02, 0.2, { q: 0.8 }), note('sine', 1500, 0.03, 0.004, 0.04, { delay: 0.08 })]
}

/** A bubble pops: a blip, higher for a smaller bubble. `size` 0..1. */
export function pop(size: number): VoiceSpec {
  return [note('sine', between(2000, 950, size), 0.06, 0.003, 0.04, { glideTo: between(2600, 1300, size) })]
}

/** A drop or a blob reaches the floor. */
export function plip(size: number): VoiceSpec {
  return [note('sine', between(1250, 620, size), 0.05, 0.003, 0.06, { glideTo: between(760, 380, size) })]
}

/** A bare finger, by what it meets. */
export const poke = {
  /** Dried mud: a knock and trickling crumbs. */
  knock: (): VoiceSpec => [note('sine', 120, 0.16, 0.004, 0.12, { glideTo: 62 }), ...[0, 1, 2].map((i) => note('triangle', 1900 + i * 340, 0.03, 0.003, 0.025, { delay: 0.09 + i * 0.05 }))],
  /** Soft mud: a squelch. */
  squelch: (): VoiceSpec => [note('noise', 340, 0.14, 0.015, 0.16, { q: 1.5, glideTo: 130 }), note('sine', 150, 0.09, 0.02, 0.14, { glideTo: 72 })],
  /** Foam: see `pop`. Wet paint: a squeaky slide. */
  slide: (): VoiceSpec => [note('sine', 900, 0.06, 0.02, 0.07, { glideTo: 690 }), note('sine', 700, 0.05, 0.02, 0.08, { delay: 0.08, glideTo: 1040 })],
  /** Dull paint: the metal rings. */
  ring: (): VoiceSpec => [note('triangle', 1320, 0.09, 0.003, 0.3), note('sine', 2640, 0.035, 0.003, 0.2), note('sine', 96, 0.1, 0.004, 0.1, { glideTo: 60 })],
  /** Shiny paint: a small low squeak as the print is left. */
  print: (): VoiceSpec => [note('sine', 430, 0.07, 0.02, 0.1, { glideTo: 330 })],
} as const

/** A tool leaves the rack, or goes back. */
export const take = {
  sponge: (): VoiceSpec => [note('noise', 620, 0.1, 0.015, 0.09, { q: 1.3 }), note('sine', 300, 0.06, 0.015, 0.1, { glideTo: 390 })],
  hose: (): VoiceSpec => [note('triangle', 520, 0.08, 0.003, 0.08), note('triangle', 790, 0.06, 0.003, 0.1, { delay: 0.05 }), note('noise', 3600, 0.04, 0.02, 0.12, { delay: 0.08, q: 0.7 })],
  cloth: (): VoiceSpec => [note('noise', 1300, 0.08, 0.01, 0.06, { q: 0.8 }), note('noise', 1000, 0.06, 0.01, 0.07, { delay: 0.09, q: 0.8 })],
  back: (): VoiceSpec => [note('triangle', 420, 0.06, 0.004, 0.07, { glideTo: 330 })],
} as const
