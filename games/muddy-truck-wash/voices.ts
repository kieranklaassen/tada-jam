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

/** The cloth pushing foam about: a soft crackle of bubbles, six small ticks over a breath of hiss. */
export function fizz(): VoiceSpec {
  return [note('noise', 3800, 0.035, 0.03, 0.24, { q: 0.8 }), ...[0, 1, 2, 3, 4, 5].map((i) => note('triangle', 2500 + ((i * 5) % 4) * 380, 0.03, 0.002, 0.02, { delay: 0.02 + i * 0.036 }))]
}

/** A bubble pops: a blip, higher for a smaller bubble. `size` 0..1. */
export function pop(size: number): VoiceSpec {
  return [note('sine', between(2000, 950, size), 0.06, 0.003, 0.04, { glideTo: between(2600, 1300, size) })]
}

/** A crumb or a plate of dried mud reaches the floor: a dry clack. `size` 0..1. */
export function clack(size: number): VoiceSpec {
  return [note('triangle', between(1500, 820, size), 0.07, 0.002, 0.03), note('noise', between(2600, 1500, size), 0.05, 0.002, 0.025, { q: 1.6 })]
}

/** A splat of soft mud reaches the floor: a wet slap. `size` 0..1. */
export function slap(size: number): VoiceSpec {
  return [note('noise', between(900, 480, size), 0.09, 0.004, 0.07, { q: 1.1, glideTo: 260 }), note('sine', between(240, 150, size), 0.05, 0.004, 0.06, { glideTo: 90 })]
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
  /** Shiny paint: a soft pat as the print is left. */
  print: (): VoiceSpec => [note('sine', 230, 0.08, 0.008, 0.07, { glideTo: 150 }), note('noise', 900, 0.03, 0.004, 0.03, { q: 0.8 })],
} as const

/** A tool leaves the rack, or goes back. */
export const take = {
  sponge: (): VoiceSpec => [note('noise', 620, 0.1, 0.015, 0.09, { q: 1.3 }), note('sine', 300, 0.06, 0.015, 0.1, { glideTo: 390 })],
  hose: (): VoiceSpec => [note('triangle', 520, 0.08, 0.003, 0.08), note('triangle', 790, 0.06, 0.003, 0.1, { delay: 0.05 }), note('noise', 3600, 0.04, 0.02, 0.12, { delay: 0.08, q: 0.7 })],
  cloth: (): VoiceSpec => [note('noise', 1300, 0.08, 0.01, 0.06, { q: 0.8 }), note('noise', 1000, 0.06, 0.01, 0.07, { delay: 0.09, q: 0.8 })],
  back: (): VoiceSpec => [note('triangle', 420, 0.06, 0.004, 0.07, { glideTo: 330 })],
} as const

/** A vehicle's horn, from its own two pitches. The mood is what it is about. */
export function horn(low: number, high: number, hold: number, mood: 'call' | 'proud' | 'plain' | 'muddy' | 'bubbly' | 'wet'): VoiceSpec {
  const toot = (pitch: number, delay: number, length: number, peak = 0.07): Note[] => [note('square', pitch, peak, 0.012, length, { delay }), note('triangle', pitch * 2, peak * 0.6, 0.012, length, { delay })]
  if (mood === 'call') return [...toot(high, 0, hold * 0.45), ...toot(high, hold * 0.75, hold * 0.6)]
  if (mood === 'proud') return [...toot(low, 0, hold * 0.8), ...toot(high, hold * 0.85, hold * 1.6, 0.08)]
  // A horn with mud in it: its own toot, two blubs coming up through it, and a pip on its high note. Nothing in it falls or buzzes:
  // a vehicle that leaves muddy is pleased with its mud, and its horn says nothing about the wash.
  if (mood === 'muddy') {
    const blub = hold * 0.6
    return [
      ...toot(low, 0, hold * 0.5),
      note('sine', low * 0.9, 0.07, 0.01, 0.07, { delay: blub, glideTo: low * 1.3 }),
      note('sine', low, 0.07, 0.01, 0.07, { delay: blub + 0.1, glideTo: low * 1.45 }),
      note('noise', 420, 0.05, 0.015, 0.12, { delay: blub, q: 1.4, glideTo: 700 }),
      ...toot(high, blub + 0.24, hold * 0.7),
    ]
  }
  if (mood === 'bubbly') return [...toot(high, 0, hold * 0.7), ...[0, 1, 2].map((i) => note('sine', 900 + i * 260, 0.05, 0.004, 0.05, { delay: hold * 0.6 + i * 0.07 }))]
  if (mood === 'wet') return [...toot(low, 0, hold * 0.6), note('noise', 2600, 0.07, 0.02, 0.3, { delay: hold * 0.4, q: 0.7 })]
  return toot(low, 0, hold)
}

/** An engine picking up: a low growl that climbs. `size` 0..1, bigger is lower. */
export function rev(size: number): VoiceSpec {
  return [note('sawtooth', between(95, 58, size), 0.07, 0.05, 0.55, { glideTo: between(190, 120, size) }), note('noise', 160, 0.07, 0.05, 0.5, { q: 0.8, glideTo: 320 })]
}

/** Tyres stopping on wet concrete, and the body settling. */
export function brake(): VoiceSpec {
  return [note('sine', 1750, 0.05, 0.01, 0.16, { glideTo: 1180 }), note('sine', 88, 0.12, 0.004, 0.14, { delay: 0.14, glideTo: 55 })]
}

/** Into the puddle. */
export function splash(): VoiceSpec {
  return [note('noise', 760, 0.15, 0.01, 0.28, { q: 0.8, glideTo: 300 }), note('sine', 210, 0.08, 0.01, 0.16, { glideTo: 95 }), note('sine', 980, 0.04, 0.004, 0.05, { delay: 0.2, glideTo: 640 }), note('sine', 1180, 0.04, 0.004, 0.05, { delay: 0.3, glideTo: 720 })]
}

/** A wet body shaking itself off. */
export function shake(): VoiceSpec {
  return [0, 1, 2, 3].map((i) => note('noise', 2100 + (i % 2) * 500, 0.08, 0.01, 0.07, { delay: i * 0.09, q: 0.9 }))
}

/** A body settling with a breath out. */
export function settle(): VoiceSpec {
  return [note('noise', 1300, 0.05, 0.08, 0.5, { q: 0.6, glideTo: 600 })]
}

/** Lumps of dried mud dropping off behind. */
export function clods(): VoiceSpec {
  return [0, 1, 2].map((i) => note('sine', 150 - i * 22, 0.1, 0.004, 0.08, { delay: i * 0.13, glideTo: 70 }))
}

/** One drop, swelling and letting go. */
export function drip(): VoiceSpec {
  return [note('sine', 520, 0.07, 0.004, 0.09, { glideTo: 1150 })]
}

/** A vehicle finding something odd on its nose: two notes of surprise, low then high. */
export function puzzled(low: number, high: number): VoiceSpec {
  return [note('triangle', low * 2, 0.06, 0.02, 0.12, { glideTo: low * 1.8 }), note('triangle', high * 2, 0.06, 0.02, 0.2, { delay: 0.16, glideTo: high * 2.4 })]
}

/** What each vehicle sounds like when a touch meets its like or its dislike. Invented noises: no words. */
export const feel = {
  /** Tipper: a toot with bubbles in it. */
  foamToot: (low: number): VoiceSpec => [note('square', low * 2, 0.06, 0.012, 0.16), ...[0, 1, 2, 3].map((i) => note('sine', 780 + i * 210, 0.045, 0.004, 0.05, { delay: 0.1 + i * 0.06, glideTo: 980 + i * 210 }))],
  /** Tipper: a breath drawn in, and a sneeze. */
  sneeze: (): VoiceSpec => [note('noise', 700, 0.06, 0.1, 0.22, { q: 1.4, glideTo: 2600 }), note('noise', 1900, 0.2, 0.006, 0.2, { delay: 0.36, q: 0.6 }), note('sine', 130, 0.14, 0.006, 0.16, { delay: 0.36, glideTo: 60 })],
  /** The fire engine: a siren's whoop, up and down. */
  whoop: (): VoiceSpec => [note('sine', 620, 0.08, 0.02, 0.22, { glideTo: 1240 }), note('sine', 1240, 0.08, 0.02, 0.26, { delay: 0.22, glideTo: 640 }), note('noise', 3000, 0.06, 0.02, 0.25, { delay: 0.3, q: 0.7, glideTo: 1800 })],
  /** The fire engine: a raspberry of bubbles through the grille. */
  raspberry: (): VoiceSpec => [note('sawtooth', 112, 0.09, 0.01, 0.34, { glideTo: 88 }), ...[0, 1, 2].map((i) => note('sine', 1000 + i * 240, 0.04, 0.004, 0.045, { delay: 0.12 + i * 0.08 }))],
  /** The tractor: a purr in three chugs. */
  chugs: (): VoiceSpec => [0, 1, 2].flatMap((i) => [note('sine', 98, 0.13, 0.006, 0.09, { delay: i * 0.17, glideTo: 70 }), note('triangle', 1500, 0.025, 0.003, 0.03, { delay: i * 0.17 + 0.05 })]),
  /** The tractor: a cough, and the flap clacking. */
  cough: (): VoiceSpec => [note('noise', 520, 0.16, 0.006, 0.1, { q: 0.9 }), note('noise', 460, 0.13, 0.006, 0.12, { delay: 0.2, q: 0.9 }), note('triangle', 1700, 0.05, 0.003, 0.03, { delay: 0.34 }), note('triangle', 1500, 0.05, 0.003, 0.03, { delay: 0.44 })],
  /** The mixer: its drum rumbling round. */
  rumble: (): VoiceSpec => [note('noise', 240, 0.11, 0.05, 0.5, { q: 1.2, glideTo: 420 }), note('sine', 82, 0.08, 0.05, 0.5, { glideTo: 110 })],
  /** The mixer: a jammed drum, creaking. */
  creak: (): VoiceSpec => [note('sawtooth', 190, 0.06, 0.03, 0.3, { glideTo: 150 }), note('sawtooth', 240, 0.05, 0.03, 0.2, { delay: 0.3, glideTo: 205 })],
  /** The mixer: a giggle, up and down and up. */
  giggle: (high: number): VoiceSpec => [0, 1, 2, 3, 4].map((i) => note('triangle', high * (i % 2 ? 2.6 : 2.1) + i * 20, 0.06, 0.008, 0.06, { delay: i * 0.085 })),
} as const

/** The tap knocked on its arm: a small bright clink of metal. */
export function clink(): VoiceSpec {
  return [note('triangle', 2140, 0.07, 0.003, 0.16), note('sine', 3210, 0.03, 0.003, 0.1), note('triangle', 1820, 0.03, 0.003, 0.09, { delay: 0.12 })]
}

/**
 * The small noises that go with a face, pitched from the vehicle's own horn
 * so that no two vehicles make them alike. Invented noises: no words.
 */
export const face = {
  /** Scratchy: a quick wobbling squeal through shut teeth. */
  squirm: (high: number): VoiceSpec => [0, 1, 2, 3].map((i) => note('triangle', high * (i % 2 ? 2.9 : 2.5), 0.045, 0.006, 0.05, { delay: i * 0.07, glideTo: high * (i % 2 ? 2.5 : 2.9) })),
  /** Bleh: a low wobble with the tongue out, and a wet end. */
  yuck: (low: number): VoiceSpec => [note('sawtooth', low * 2.2, 0.05, 0.02, 0.22, { glideTo: low * 1.9 }), note('sawtooth', low * 2.0, 0.045, 0.02, 0.16, { delay: 0.2, glideTo: low * 2.3 }), note('noise', 700, 0.05, 0.03, 0.2, { q: 1.4, glideTo: 420 })],
  /** A dust sneeze: a breath in, then the blast. */
  snort: (): VoiceSpec => [note('noise', 900, 0.05, 0.06, 0.1, { q: 1.2, glideTo: 2200 }), note('noise', 1700, 0.16, 0.005, 0.12, { delay: 0.17, q: 0.7 }), note('sine', 150, 0.09, 0.005, 0.1, { delay: 0.17, glideTo: 80 })],
  /** Cold water: a squeak that jumps up and a shiver of quick notes. */
  brr: (high: number): VoiceSpec => [note('sine', high * 1.5, 0.07, 0.01, 0.1, { glideTo: high * 2.6 }), ...[0, 1, 2, 3, 4].map((i) => note('triangle', high * (i % 2 ? 2.2 : 1.9), 0.04, 0.005, 0.035, { delay: 0.14 + i * 0.055 }))],
  /** Sputter: three wet puffs blown off the lip. */
  sputter: (low: number): VoiceSpec => [0, 1, 2].flatMap((i) => [note('noise', 520 + i * 90, 0.1, 0.004, 0.05, { delay: i * 0.085, q: 1.0 }), note('square', low * 1.1, 0.03, 0.004, 0.04, { delay: i * 0.085 })]),
  /** Peek: a small rising hum, as at something on the end of its nose. */
  peek: (high: number): VoiceSpec => [note('sine', high * 1.4, 0.06, 0.02, 0.12), note('sine', high * 1.5, 0.06, 0.02, 0.2, { delay: 0.14, glideTo: high * 2.1 })],
  /** Relief: a long soft breath with a hum under it. */
  aah: (low: number): VoiceSpec => [note('sine', low * 2.2, 0.04, 0.06, 0.4, { glideTo: low * 1.8 }), note('noise', 1400, 0.03, 0.08, 0.35, { q: 0.6 })],
}

/** The pieces of the place, each with its own small sound when it is touched. */
export const place = {
  /** The roller brush spinning up: a soft whirr that climbs and a patter of wet flaps. */
  whirr: (): VoiceSpec => [note('noise', 420, 0.09, 0.08, 0.7, { q: 1.1, glideTo: 1500 }), note('sawtooth', 70, 0.035, 0.06, 0.6, { glideTo: 150 }), ...[0, 1, 2, 3].map((i) => note('noise', 2200 + i * 150, 0.035, 0.004, 0.03, { delay: 0.1 + i * 0.09, q: 0.9 }))],
  /** The pinwheel: paper vanes fluttering round, quick at first and slowing. */
  flutter: (): VoiceSpec => [0, 1, 2, 3, 4, 5].map((i) => note('noise', 1800 - i * 90, 0.05 - i * 0.004, 0.004, 0.035, { delay: i * 0.06 + i * i * 0.008, q: 0.8 })),
  /** What stands on the shelf jumping: glass and tin clinking, and a blup from the jar. */
  clinks: (): VoiceSpec => [note('triangle', 2350, 0.05, 0.003, 0.09), note('triangle', 3100, 0.04, 0.003, 0.07, { delay: 0.05 }), note('triangle', 1850, 0.045, 0.003, 0.1, { delay: 0.11 }), note('sine', 320, 0.06, 0.01, 0.09, { delay: 0.16, glideTo: 620 }), note('triangle', 2700, 0.035, 0.003, 0.08, { delay: 0.3 })],
  /** The lamp knocked: its enamel shade rings once, softly, and the rod ticks. */
  tink: (): VoiceSpec => [note('triangle', 1180, 0.06, 0.003, 0.28), note('sine', 2360, 0.025, 0.003, 0.16), note('triangle', 3300, 0.02, 0.002, 0.02, { delay: 0.02 })],
  /** A finger in a pool of standing water: a plop, and two drops after it. */
  plop: (): VoiceSpec => [note('sine', 420, 0.09, 0.004, 0.09, { glideTo: 760 }), note('sine', 980, 0.04, 0.003, 0.05, { delay: 0.12, glideTo: 1300 }), note('sine', 1150, 0.035, 0.003, 0.05, { delay: 0.19, glideTo: 1500 })],
  /** The drain: a glug going down, twice. */
  glug: (): VoiceSpec => [note('sine', 190, 0.1, 0.01, 0.1, { glideTo: 300 }), note('sine', 160, 0.1, 0.01, 0.12, { delay: 0.14, glideTo: 270 }), note('noise', 520, 0.04, 0.02, 0.22, { q: 1.6, glideTo: 240 })],
  /** A finger on the window: glass squeaking, up and up again. */
  squeak: (): VoiceSpec => [note('sine', 1500, 0.045, 0.02, 0.09, { glideTo: 1900 }), note('sine', 1650, 0.045, 0.02, 0.1, { delay: 0.12, glideTo: 2150 })],
  /** The pipe knocked: a hollow bonk that runs along it. */
  bonk: (): VoiceSpec => [note('triangle', 330, 0.1, 0.003, 0.2), note('sine', 660, 0.035, 0.003, 0.3), note('triangle', 495, 0.03, 0.003, 0.16, { delay: 0.07 })],
  /** The suds bucket: water slopping against its side, and suds popping. */
  slosh: (): VoiceSpec => [note('noise', 520, 0.09, 0.03, 0.2, { q: 0.9, glideTo: 880 }), note('sine', 230, 0.06, 0.02, 0.12, { glideTo: 310 }), note('sine', 1400, 0.03, 0.003, 0.03, { delay: 0.16 }), note('sine', 1750, 0.03, 0.003, 0.03, { delay: 0.22 })],
  /** A vehicle in the queue hopping where it stands: its tyres thump the dirt. */
  thump: (): VoiceSpec => [note('sine', 105, 0.13, 0.005, 0.12, { glideTo: 58 }), note('noise', 500, 0.05, 0.005, 0.06, { q: 0.8 })],
}

/** The sponge on foam and on clean paint, each kind of paint with its own sound. `variant` 0..3 changes its grain. */
export const lather = {
  /** On foam: a soft fizz, and two bubbles in it. */
  fizz: (variant: number): VoiceSpec => {
    const v = ((variant % 4) + 4) % 4
    return [note('noise', 5200 + v * 220, 0.06, 0.04, 0.28, { q: 0.7 }), note('sine', 1700 + v * 90, 0.025, 0.004, 0.035, { delay: 0.1 }), note('sine', 2150 + v * 90, 0.025, 0.004, 0.035, { delay: 0.18 })]
  },
  /** On wet paint: a wet slurp, low and rising. */
  slurp: (variant: number): VoiceSpec => {
    const v = ((variant % 4) + 4) % 4
    return [note('noise', 680 + v * 60, 0.11, 0.03, 0.2, { q: 1.6, glideTo: 1800 + v * 80 }), note('sine', 250 + v * 14, 0.06, 0.03, 0.16, { glideTo: 520 })]
  },
  /** On dull paint: a dry squeak that goes soft as the foam comes. */
  drySqueak: (variant: number): VoiceSpec => {
    const v = ((variant % 4) + 4) % 4
    return [note('sine', 1480 + v * 70, 0.06, 0.006, 0.09, { glideTo: 1240 + v * 50 }), note('noise', 1500, 0.07, 0.06, 0.22, { delay: 0.07, q: 0.9, glideTo: 800 })]
  },
  /** On shiny paint: a smooth slippery hush. */
  hush: (variant: number): VoiceSpec => {
    const v = ((variant % 4) + 4) % 4
    return [note('noise', 3000 + v * 150, 0.07, 0.1, 0.36, { q: 0.5, glideTo: 2200 })]
  },
}

/** The hose on clean paint, each kind of paint with its own sound over the hiss. */
export const water = {
  /** On wet paint: water sheeting off the sills, a steady drumming. */
  drum: (variant: number): VoiceSpec => {
    const v = ((variant % 4) + 4) % 4
    return [note('noise', 3000 + v * 200, 0.07, 0.015, 0.24, { q: 0.7 }), ...[0, 1, 2, 3, 4].map((i) => note('sine', 165 + v * 8, 0.075, 0.004, 0.035, { delay: 0.02 + i * 0.046, glideTo: 120 }))]
  },
  /** On dull paint: beads forming, a light patter. */
  patter: (variant: number): VoiceSpec => {
    const v = ((variant % 4) + 4) % 4
    return [note('noise', 3600 + v * 220, 0.06, 0.015, 0.2, { q: 0.7 }), ...[0, 1, 2, 3].map((i) => note('triangle', 1700 + ((i * 7 + v * 3) % 5) * 230, 0.03, 0.003, 0.025, { delay: 0.04 + i * 0.052 }))]
  },
  /** On shiny paint: fat drops racing off, a quick tinkle. */
  tinkle: (variant: number): VoiceSpec => {
    const v = ((variant % 4) + 4) % 4
    return [note('noise', 4200 + v * 200, 0.045, 0.01, 0.12, { q: 0.8 }), ...[0, 1, 2, 3].map((i) => note('sine', 2900 + i * 420 + v * 60, 0.04, 0.003, 0.05, { delay: 0.02 + i * 0.034 }))]
  },
}

/** The cloth on dull paint: one short low squeak. */
export function squeakLow(): VoiceSpec {
  return [note('sine', 610, 0.07, 0.012, 0.07, { glideTo: 760 })]
}
