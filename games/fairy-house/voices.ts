import type { Note } from './audio'
import { KINDS, SUPPORTS, type Kind, type Support } from './kinds'

// Every sound of the toy as plain numbers. Nothing here touches Web Audio, so
// a test can hold each voice inside a stated range on a machine that cannot
// hear (voices.test.ts), and audio.ts turns a list into nodes (`voiceOf`).
//
// Sight and sound run on one clock. No note here has a delay: a voice is what
// is heard at one instant, and it is queued in the step of play in which the
// thing it belongs to is seen to happen. What sounds twice (a roof's two
// sides, a bell's swings, a stone that wobbles) is queued twice, each time by
// the motion that knocks.

export type Voice = readonly Note[]

/** What every voice is held to. The attack is short, so a sound is heard in the frame it is queued in. */
export const LIMITS = { minFreq: 60, maxFreq: 7200, maxPeak: 0.2, minAttack: 0.002, maxAttack: 0.05, maxSeconds: 0.7 } as const

const t = (frequency: number, wave: OscillatorType, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'tone', frequency, wave, peak, attack, decay, ...(glideTo ? { glideTo } : {}) })
const n = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...(glideTo ? { glideTo } : {}) })

/** How long a voice sounds, in seconds. */
export function seconds(voice: Voice): number {
  return voice.reduce((end, note) => Math.max(end, note.attack + note.decay), 0)
}

/** A voice played softer, for a second knock or a light landing. */
export function softer(voice: Voice, by: number): Voice {
  return voice.map((note) => ({ ...note, peak: Math.max(0.004, note.peak * by) }))
}

/** A thing hops up under the finger. */
export const LIFT: Record<Kind, Voice> = {
  leaf: [n(3000, 1.5, 0.07, 0.003, 0.06, 4200)],
  cap: [t(700, 'triangle', 0.09, 0.003, 0.05, 980)],
  pebble: [t(1300, 'sine', 0.08, 0.002, 0.03), n(4200, 3, 0.03, 0.002, 0.015)],
  bark: [t(210, 'triangle', 0.1, 0.003, 0.07, 300)],
  twig: [t(1500, 'triangle', 0.07, 0.002, 0.035, 1900)],
  moss: [n(600, 0.9, 0.08, 0.006, 0.08, 900)],
  feather: [n(5600, 0.8, 0.04, 0.01, 0.1, 7000)],
}

/** A thing touches down. One voice for each cell of the grid in ART.md, in the grid's words. */
export const LAND: Record<Kind, Record<Support, Voice>> = {
  leaf: {
    ground: [n(2600, 1.2, 0.09, 0.004, 0.12), n(900, 0.8, 0.04, 0.01, 0.1)],
    moss: [n(380, 0.7, 0.12, 0.012, 0.2, 180), n(1500, 0.6, 0.04, 0.05, 0.3, 700)],
    pebble: [n(1200, 6, 0.09, 0.004, 0.16, 3600), t(700, 'sine', 0.05, 0.004, 0.12, 1400)],
    twig: [t(240, 'triangle', 0.13, 0.003, 0.12, 200), n(2400, 2, 0.05, 0.002, 0.04)],
    bark: [n(3400, 1.5, 0.12, 0.002, 0.045), t(190, 'triangle', 0.07, 0.003, 0.08)],
  },
  cap: {
    ground: [t(520, 'sine', 0.12, 0.004, 0.12, 1100), n(300, 5, 0.07, 0.03, 0.3, 700)],
    moss: [t(310, 'sawtooth', 0.045, 0.02, 0.14, 360), n(420, 0.8, 0.06, 0.01, 0.1)],
    pebble: [t(1760, 'sine', 0.11, 0.002, 0.5), t(2640, 'sine', 0.05, 0.002, 0.3)],
    twig: [t(1320, 'sine', 0.12, 0.002, 0.45), t(1980, 'triangle', 0.04, 0.002, 0.2)],
    bark: [t(640, 'triangle', 0.11, 0.002, 0.05), n(1800, 3, 0.05, 0.002, 0.04)],
  },
  pebble: {
    ground: [t(96, 'sine', 0.18, 0.004, 0.16, 62), n(700, 0.8, 0.06, 0.002, 0.04)],
    moss: [n(260, 0.8, 0.13, 0.008, 0.16, 150), t(120, 'sine', 0.08, 0.006, 0.1, 80)],
    pebble: [t(1150, 'sine', 0.14, 0.002, 0.045), n(3200, 2, 0.07, 0.002, 0.025)],
    twig: [t(520, 'triangle', 0.13, 0.002, 0.09, 470), t(1040, 'sine', 0.04, 0.002, 0.05)],
    bark: [n(140, 2, 0.12, 0.02, 0.3, 110), t(210, 'triangle', 0.08, 0.003, 0.07)],
  },
  bark: {
    ground: [t(150, 'triangle', 0.16, 0.004, 0.16, 120), n(500, 1, 0.05, 0.003, 0.05)],
    moss: [t(180, 'sine', 0.12, 0.006, 0.22, 330), t(290, 'sawtooth', 0.035, 0.02, 0.16, 330)],
    pebble: [t(260, 'sawtooth', 0.05, 0.03, 0.24, 340), t(700, 'sine', 0.06, 0.002, 0.04)],
    twig: [t(430, 'triangle', 0.14, 0.002, 0.07, 400), n(1500, 2, 0.04, 0.002, 0.03)],
    bark: [t(330, 'triangle', 0.13, 0.002, 0.06, 250), t(165, 'triangle', 0.08, 0.003, 0.09)],
  },
  twig: {
    ground: [n(1900, 2.5, 0.11, 0.002, 0.05, 900), t(140, 'sine', 0.08, 0.003, 0.06)],
    moss: [t(220, 'sawtooth', 0.07, 0.004, 0.4, 330), t(440, 'sine', 0.05, 0.004, 0.3, 660)],
    pebble: [t(880, 'triangle', 0.11, 0.002, 0.035), t(300, 'sine', 0.06, 0.002, 0.06)],
    twig: [t(1568, 'sine', 0.12, 0.002, 0.14), t(3136, 'sine', 0.03, 0.002, 0.06)],
    bark: [n(520, 3, 0.09, 0.01, 0.26, 380), t(260, 'triangle', 0.05, 0.004, 0.1)],
  },
  moss: {
    ground: [n(420, 0.8, 0.11, 0.012, 0.16, 300)],
    moss: [n(360, 0.7, 0.12, 0.02, 0.34, 220), t(110, 'sine', 0.09, 0.02, 0.2, 80)],
    pebble: [n(900, 1.5, 0.09, 0.003, 0.05), t(240, 'sine', 0.06, 0.003, 0.05)],
    twig: [n(3000, 0.8, 0.08, 0.02, 0.2, 1800)],
    bark: [n(480, 0.8, 0.09, 0.01, 0.12), t(160, 'triangle', 0.1, 0.003, 0.09)],
  },
  feather: {
    ground: [n(5200, 0.7, 0.045, 0.02, 0.16), n(7000, 4, 0.03, 0.002, 0.02)],
    moss: [n(2200, 0.5, 0.03, 0.04, 0.3)],
    pebble: [n(3800, 8, 0.06, 0.01, 0.24, 4400), n(1200, 10, 0.04, 0.01, 0.22)],
    twig: [n(900, 1.2, 0.1, 0.004, 0.07, 500), n(3000, 1, 0.04, 0.004, 0.05)],
    bark: [n(300, 1, 0.11, 0.03, 0.14, 600), t(130, 'sine', 0.05, 0.02, 0.1, 190)],
  },
}

/** How long a touch alone may sound, in seconds: anything longer is the sound of a motion. */
export const TOUCH_SECONDS = 0.12

/**
 * A cell that rolls, spins or rocks, set down where it lies still (on the slope of a see-saw): its touch alone. The
 * notes that sound its motion (a ball's rumble, a pin's purr) are left out, since nothing is seen to move.
 */
export function touchOnly(kind: Kind, on: Support): Voice {
  const short = LAND[kind][on].filter((note) => note.attack + note.decay <= TOUCH_SECONDS)
  return short.length > 0 ? short : LAND[kind][on].slice(0, 1).map((note) => ({ ...note, decay: TOUCH_SECONDS - note.attack }))
}

/** Cells whose later knocks are a sound of their own: the far end of the see-saw touching the ground, the cradle's creak, the ball's knock at each turn, a flag falling to hang. */
const KNOCK: Partial<Record<Kind, Partial<Record<Support, Voice>>>> = {
  bark: { pebble: [t(140, 'sine', 0.16, 0.003, 0.12, 100), n(600, 1, 0.05, 0.002, 0.04)] },
  cap: { moss: [t(330, 'sawtooth', 0.04, 0.02, 0.12, 290)] },
  pebble: { bark: [t(230, 'triangle', 0.1, 0.003, 0.06)] },
  feather: { twig: [n(700, 1.2, 0.06, 0.006, 0.09, 420)] },
}

/** The `nth` knock of a cell that hops after it has touched down. Each is softer than the one before. */
export function knock(kind: Kind, on: Support, nth: number): Voice {
  const own = KNOCK[kind]?.[on]
  return softer(own ?? LAND[kind][on].slice(0, 1), 0.78 ** nth)
}

/** A turn of a cell that rocks, rolls, swings or spins: as loud as the swing is still wide, from 1 at its first turn toward 0 at its last. */
export function turnKnock(kind: Kind, on: Support, wide: number): Voice {
  return softer(KNOCK[kind]?.[on] ?? LAND[kind][on].slice(0, 1), Math.max(0.3, Math.min(1, wide)))
}

/** Cells whose stop is a sound of its own: the bowl drops flat with a tok, the rolling pin ticks as it stops. */
export const STOP: Partial<Record<Kind, Partial<Record<Support, Voice>>>> = {
  cap: { bark: [t(300, 'triangle', 0.13, 0.002, 0.08, 220), n(900, 2, 0.05, 0.002, 0.03)] },
  twig: { bark: [t(1700, 'triangle', 0.07, 0.002, 0.03)] },
}

/** A touch on the tree's bark: a dry knock on wood. A touch on the open sky: a breath of air. Neither raises dust. */
export const WOOD: Voice = [t(310, 'triangle', 0.09, 0.002, 0.05, 250), n(1200, 2, 0.03, 0.002, 0.02)]
export const AIR: Voice = [n(2400, 0.7, 0.035, 0.02, 0.14, 3400)]
/** A root is thick wood: it knocks an octave under the bark, and something small scuttles under it. */
export const ROOT: Voice = [t(150, 'triangle', 0.11, 0.003, 0.09, 112), n(3200, 6, 0.02, 0.02, 0.1, 4400)]
/** A bush rustles: leaves against leaves. */
export const BUSH: Voice = [n(1900, 1.1, 0.07, 0.01, 0.18, 2900), n(820, 0.9, 0.03, 0.02, 0.12)]
/** The hill is far off: it answers small and soft. */
export const HILL: Voice = [t(660, 'sine', 0.025, 0.03, 0.22, 600)]

/** A thing is shed by what carries nothing, or topples off a pile that is too high. */
export const SHED: Record<'leaf' | 'cap' | 'feather' | 'arch' | 'out', Voice> = {
  leaf: [n(1000, 1.2, 0.11, 0.003, 0.08, 600), t(260, 'sine', 0.06, 0.004, 0.1, 420)],
  cap: [t(560, 'triangle', 0.13, 0.002, 0.07, 420)],
  feather: [n(1800, 1, 0.08, 0.02, 0.2, 4200)],
  arch: [t(200, 'triangle', 0.1, 0.003, 0.1, 140), n(900, 1, 0.04, 0.003, 0.05)],
  out: [n(1400, 1, 0.05, 0.01, 0.12, 2400)],
}

/** A thing bounces on the forest floor on its way home: its own voice over the earth. */
export function tumble(kind: Kind, nth: number): Voice {
  return softer([...LIFT[kind], t(110, 'sine', 0.1, 0.004, 0.09, 80)], 0.8 ** nth)
}

/** Bare ground under the finger: a pat, a little higher toward the top of the stage. */
export function pat(height: number): Voice {
  return [n(700, 0.9, 0.06, 0.004, 0.06), t(150 + 90 * Math.min(1, Math.max(0, height)), 'sine', 0.05, 0.004, 0.06)]
}

/** The sun, touched. */
export const SUN: Voice = [t(392, 'sine', 0.1, 0.01, 0.6), t(588, 'sine', 0.06, 0.01, 0.5)]

/** The three folk: what each sounds like when poked, when it likes what was set down, and at its own other moment. */
export const FOLK_VOICE = {
  fat: {
    poke: [t(110, 'sine', 0.16, 0.004, 0.22, 84), t(420, 'sine', 0.07, 0.01, 0.08, 640)],
    like: [t(196, 'sine', 0.08, 0.03, 0.22, 233)],
    other: [t(150, 'sawtooth', 0.04, 0.02, 0.12, 120)],
  },
  tidy: {
    poke: [n(2600, 3, 0.07, 0.01, 0.12, 3600), t(600, 'triangle', 0.07, 0.004, 0.12, 900)],
    like: [t(520, 'triangle', 0.07, 0.01, 0.1, 620)],
    other: [t(1900, 'triangle', 0.06, 0.002, 0.025)],
  },
  tiny: {
    poke: [t(1300, 'sine', 0.09, 0.01, 0.12, 1900)],
    like: [t(980, 'sine', 0.08, 0.01, 0.16, 1480)],
    other: [t(1100, 'triangle', 0.06, 0.006, 0.07, 1400)],
  },
} as const satisfies Record<string, Record<'poke' | 'like' | 'other', Voice>>

/** The three who have nothing to do with the house, poked. */
export const BYSTANDER: Record<'snail' | 'moth' | 'owl', Voice> = {
  snail: [t(740, 'sine', 0.07, 0.004, 0.08, 520)],
  moth: [n(4200, 5, 0.04, 0.006, 0.1)],
  owl: [t(330, 'sine', 0.1, 0.03, 0.26, 300)],
}

/** The sun pulled below the hill, and raised again. */
export const SUNSET: Voice = [t(392, 'sine', 0.1, 0.02, 0.6, 196), t(294, 'sine', 0.06, 0.03, 0.5, 147)]
export const SUNRISE: Voice = [t(294, 'sine', 0.1, 0.02, 0.6, 588), t(440, 'sine', 0.05, 0.03, 0.5, 880)]

/** A step of each of the three as it goes: the fat one thuds, the tidy one ticks, the tiny one pips. */
export const STEP: Record<'fat' | 'tidy' | 'tiny', Voice> = {
  fat: [t(82, 'sine', 0.13, 0.004, 0.12, 64), n(300, 0.8, 0.04, 0.004, 0.05)],
  tidy: [t(1500, 'triangle', 0.04, 0.002, 0.02), n(2600, 3, 0.02, 0.002, 0.02)],
  tiny: [t(900, 'sine', 0.05, 0.004, 0.04, 1250)],
}

/**
 * What the three do at evening, one name for each sound of each act of the
 * second grid in ART.md. A cell whose thing rocks or swings (a cradle, a
 * bell, a bowl) is heard through that thing's own knocks.
 */
export const EVENING = {
  // The fat one and its leaf.
  rugDown: [t(90, 'sine', 0.15, 0.004, 0.14, 66), n(2200, 1.2, 0.05, 0.004, 0.08)],
  rugHmpf: [t(170, 'sawtooth', 0.05, 0.02, 0.16, 110), n(500, 0.8, 0.04, 0.02, 0.1)],
  bedSink: [n(340, 0.7, 0.13, 0.014, 0.24, 160), t(120, 'sine', 0.08, 0.01, 0.2, 80)],
  snore: [t(98, 'sawtooth', 0.045, 0.05, 0.5, 78), n(260, 2, 0.04, 0.05, 0.4)],
  slideZip: [n(900, 6, 0.09, 0.006, 0.3, 4200), t(300, 'sine', 0.05, 0.006, 0.28, 900)],
  slideBump: [t(74, 'sine', 0.17, 0.004, 0.16, 60), n(600, 0.9, 0.06, 0.003, 0.05)],
  crack: [n(2800, 2, 0.14, 0.002, 0.04), t(900, 'square', 0.05, 0.002, 0.03, 300)],
  crackLow: [n(1900, 2, 0.14, 0.002, 0.05), t(620, 'square', 0.05, 0.002, 0.04, 200)],
  sitDown: [t(70, 'sine', 0.18, 0.004, 0.2, 60), n(380, 0.7, 0.07, 0.004, 0.08)],
  tableCreak: [t(210, 'sawtooth', 0.05, 0.03, 0.3, 300), t(160, 'triangle', 0.05, 0.03, 0.26, 120)],
  flump: [n(300, 0.6, 0.14, 0.01, 0.2, 150), n(2400, 1, 0.05, 0.004, 0.1)],
  shrug: [t(150, 'sine', 0.07, 0.03, 0.2, 190)],
  // The tiny one and its acorn cap.
  splash: [n(1800, 0.7, 0.13, 0.004, 0.22, 600), t(700, 'sine', 0.07, 0.004, 0.1, 1500)],
  scrub: [n(3600, 4, 0.06, 0.004, 0.05), n(3000, 4, 0.05, 0.004, 0.05)],
  spill: [n(700, 3, 0.11, 0.02, 0.45, 260), t(420, 'sine', 0.06, 0.02, 0.3, 240)],
  sigh: [n(1600, 0.6, 0.04, 0.05, 0.4, 700), t(1200, 'sine', 0.04, 0.04, 0.3, 800)],
  lampUp: [t(1760, 'sine', 0.08, 0.002, 0.3), t(880, 'sine', 0.04, 0.004, 0.2, 1320)],
  bonk: [t(260, 'triangle', 0.14, 0.002, 0.08, 180), t(1900, 'sine', 0.06, 0.002, 0.2)],
  lampBack: [t(1760, 'sine', 0.1, 0.002, 0.45), t(2640, 'sine', 0.04, 0.002, 0.25)],
  swing: [t(1200, 'sine', 0.06, 0.01, 0.12, 1700)],
  dizzy: [t(820, 'sine', 0.06, 0.03, 0.4, 520), t(1230, 'sine', 0.03, 0.03, 0.4, 780)],
  lick: [n(4800, 5, 0.05, 0.006, 0.07, 3000), t(1500, 'sine', 0.04, 0.006, 0.06, 1100)],
  // The tidy one and its feather.
  swish: [n(3200, 1.4, 0.09, 0.02, 0.14, 1400)],
  swishHigh: [n(5200, 1.6, 0.08, 0.02, 0.12, 3000)],
  swishHat: [n(1500, 1.2, 0.09, 0.02, 0.16, 700), t(500, 'triangle', 0.03, 0.01, 0.08)],
  quiltPat: [n(520, 0.8, 0.1, 0.006, 0.07), t(140, 'sine', 0.05, 0.004, 0.06)],
  stoneDust: [n(2400, 3, 0.07, 0.01, 0.1), t(1300, 'sine', 0.04, 0.004, 0.05)],
  tickle: [n(6000, 2, 0.04, 0.01, 0.12, 6800)],
  sneeze: [n(2000, 0.8, 0.14, 0.03, 0.14, 4200), t(640, 'triangle', 0.08, 0.02, 0.1, 900)],
  fatSneeze: [n(900, 0.7, 0.15, 0.04, 0.16, 2400), t(180, 'sawtooth', 0.06, 0.03, 0.12, 260)],
  flagDown: [n(2600, 1, 0.07, 0.006, 0.08), t(980, 'triangle', 0.04, 0.004, 0.05)],
  flagBack: [n(1500, 1, 0.1, 0.004, 0.1, 900), t(1320, 'triangle', 0.04, 0.004, 0.06)],
  squeak: [t(2100, 'sine', 0.06, 0.02, 0.1, 2900)],
  sailOff: [n(600, 1.5, 0.1, 0.03, 0.5, 1800), t(330, 'sine', 0.06, 0.03, 0.4, 500)],
  // The heap, and the morning.
  heap: [n(280, 0.6, 0.12, 0.01, 0.18, 150), t(100, 'sine', 0.08, 0.006, 0.12, 76)],
  snort: [n(700, 2, 0.1, 0.02, 0.16, 1500), t(140, 'sawtooth', 0.05, 0.02, 0.14, 220)],
  yawn: [t(240, 'sine', 0.08, 0.05, 0.6, 130)],
  snap: [t(1700, 'triangle', 0.06, 0.002, 0.03), t(2300, 'triangle', 0.04, 0.002, 0.03)],
  hop: [t(1050, 'sine', 0.08, 0.006, 0.12, 1600)],
} as const satisfies Record<string, Voice>

/** Every voice by a name, for the tests. */
export function allVoices(): [string, Voice][] {
  const named: [string, Voice][] = []
  for (const kind of KINDS) {
    named.push([`lift ${kind}`, LIFT[kind]], [`tumble ${kind}`, tumble(kind, 0)])
    for (const on of SUPPORTS) named.push([`land ${kind} on ${on}`, LAND[kind][on]], [`knock ${kind} on ${on}`, knock(kind, on, 1)])
  }
  for (const [by, voice] of Object.entries(SHED)) named.push([`shed ${by}`, voice])
  for (const [who, voices] of Object.entries(FOLK_VOICE)) for (const [when, voice] of Object.entries(voices)) named.push([`${who} ${when}`, voice])
  for (const [who, voice] of Object.entries(BYSTANDER)) named.push([`${who}`, voice])
  for (const [kind, row] of Object.entries(STOP)) for (const [on, voice] of Object.entries(row)) named.push([`stop ${kind} on ${on}`, voice])
  named.push(['pat low', pat(0)], ['pat high', pat(1)], ['wood', WOOD], ['air', AIR], ['root', ROOT], ['bush', BUSH], ['hill', HILL], ['sun', SUN], ['sunset', SUNSET], ['sunrise', SUNRISE])
  for (const [who, voice] of Object.entries(STEP)) named.push([`step ${who}`, voice])
  for (const [name, voice] of Object.entries(EVENING)) named.push([`evening ${name}`, voice])
  return named
}
