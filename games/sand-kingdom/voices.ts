import type { Note } from './audio'

// Every sound of the beach as plain numbers: lists of tones and bands of
// noise, played through `voiceOf` in audio.ts. Nobody has listened to them:
// they are written from the sheet's words, kept short and quiet, and a test
// holds every pitch, peak and length in range.

/** A finger lands on level sand: a soft thud with a puff, of four pitches. */
export const THUD_PITCHES = [98, 110, 123, 131] as const
export function thud(variant: number): Note[] {
  const pitch = THUD_PITCHES[variant % THUD_PITCHES.length]
  return [
    { kind: 'tone', frequency: pitch, glideTo: pitch * 0.64, peak: 0.3, attack: 0.004, decay: 0.11 },
    { kind: 'noise', frequency: 620 + variant * 60, q: 0.8, peak: 0.13, attack: 0.002, decay: 0.07 },
  ]
}

/** The voices that last: the slow sounds of the sun and the tide. Every other voice is over in three quarters of a second. */
export const LONG_VOICES: readonly string[] = ['chimeSecond', 'fizz', 'hush', 'wave']

/** The top speed the hiss follows, in world units a second. */
export const HISS_TOP_SPEED = 12
/** One grain of the gritty hiss of a finger drawn through sand: higher and louder the faster the finger goes. */
export function hiss(speed: number): Note[] {
  const pace = Math.min(HISS_TOP_SPEED, Math.max(0, speed))
  return [{ kind: 'noise', frequency: 900 + 225 * pace, q: 1.4, peak: 0.05 + 0.009 * pace, attack: 0.012, decay: 0.1 }]
}

/** A grain lands: a small tick, of five pitches. */
export function tick(variant: number): Note[] {
  return [{ kind: 'noise', frequency: 3600 + (variant % 5) * 400, q: 6, peak: 0.045, attack: 0.001, decay: 0.025 }]
}

export type VoiceName =
  | 'slap' | 'squelch' | 'gurgle' | 'plip' | 'wake' | 'crunch' | 'crumble' | 'trickle'
  | 'clack' | 'squeak' | 'squawk' | 'bloop' | 'plop' | 'flap' | 'knock' | 'breath' | 'puff'
  // The bucket.
  | 'clink' | 'scoop' | 'glug' | 'scrape' | 'slurp' | 'rasp' | 'slop' | 'rumble' | 'rattle' | 'clonk' | 'clang'
  | 'whump' | 'pop' | 'glop' | 'creakTier' | 'slump' | 'sploosh' | 'splosh'
  // The shells and the wood.
  | 'dampSqueak' | 'tock' | 'clickScrape' | 'shellRattle' | 'ping' | 'skitter' | 'bubbles'
  | 'seesaw' | 'woodRumble' | 'bridge' | 'thudCrack' | 'woodCreak' | 'softKnock'
  // The tide and the sun.
  | 'fizz' | 'climb' | 'whoosh' | 'plops' | 'hush' | 'chimeFirst' | 'chimeSecond' | 'hum' | 'wave' | 'hollow'
  // The folk at evening.
  | 'stamp' | 'slip' | 'drop' | 'swish' | 'scuttle' | 'sniff' | 'burrow'

export const VOICES: Record<VoiceName, readonly Note[]> = {
  /** A pat on raised sand. */
  slap: [
    { kind: 'noise', frequency: 1500, q: 0.7, peak: 0.28, attack: 0.001, decay: 0.05 },
    { kind: 'tone', frequency: 180, glideTo: 120, peak: 0.2, attack: 0.002, decay: 0.07 },
  ],
  /** The finger goes deeper into a groove and water wells up. */
  squelch: [
    { kind: 'noise', frequency: 500, glideTo: 250, q: 3, peak: 0.22, attack: 0.01, decay: 0.16 },
    { kind: 'tone', frequency: 240, glideTo: 420, peak: 0.08, attack: 0.02, decay: 0.08, delay: 0.05 },
  ],
  /** The sea comes in along a groove dug down to it. */
  gurgle: [
    { kind: 'tone', frequency: 320, glideTo: 520, peak: 0.12, attack: 0.01, decay: 0.07 },
    { kind: 'tone', frequency: 380, glideTo: 640, peak: 0.12, attack: 0.01, decay: 0.07, delay: 0.07 },
    { kind: 'tone', frequency: 450, glideTo: 760, peak: 0.11, attack: 0.01, decay: 0.07, delay: 0.15 },
  ],
  /** A finger lands in water. */
  plip: [
    { kind: 'tone', frequency: 900, glideTo: 1500, peak: 0.16, attack: 0.003, decay: 0.07 },
    { kind: 'noise', frequency: 3000, q: 2, peak: 0.06, attack: 0.002, decay: 0.05 },
  ],
  /** A finger drawn through water. */
  wake: [{ kind: 'noise', frequency: 700, glideTo: 1100, q: 1, peak: 0.1, attack: 0.03, decay: 0.16 }],
  /** A new groove drops into an old one: two steps. */
  crunch: [
    { kind: 'noise', frequency: 1100, q: 1.2, peak: 0.2, attack: 0.002, decay: 0.045 },
    { kind: 'noise', frequency: 700, q: 1.2, peak: 0.22, attack: 0.002, decay: 0.07, delay: 0.085 },
  ],
  /** Raised sand cut through: its sides slump in a run of small ticks. */
  crumble: [
    { kind: 'noise', frequency: 2600, q: 5, peak: 0.07, attack: 0.001, decay: 0.03 },
    { kind: 'noise', frequency: 2300, q: 5, peak: 0.07, attack: 0.001, decay: 0.03, delay: 0.06 },
    { kind: 'noise', frequency: 2900, q: 5, peak: 0.06, attack: 0.001, decay: 0.03, delay: 0.11 },
    { kind: 'noise', frequency: 2100, q: 5, peak: 0.06, attack: 0.001, decay: 0.035, delay: 0.19 },
    { kind: 'noise', frequency: 2500, q: 5, peak: 0.05, attack: 0.001, decay: 0.035, delay: 0.3 },
  ],
  /** The crab snaps a claw shut: one click for each snap, in the frame the claw shuts. */
  clack: [
    { kind: 'noise', frequency: 2400, q: 5, peak: 0.2, attack: 0.001, decay: 0.03 },
    { kind: 'tone', frequency: 1300, wave: 'triangle', peak: 0.08, attack: 0.001, decay: 0.02 },
  ],
  /** The starfish curls up. */
  squeak: [
    { kind: 'tone', frequency: 1300, glideTo: 1900, peak: 0.12, attack: 0.01, decay: 0.09 },
    { kind: 'tone', frequency: 1700, glideTo: 1400, peak: 0.09, attack: 0.01, decay: 0.08, delay: 0.1 },
  ],
  /** A gull, poked: two syllables. */
  squawk: [
    { kind: 'tone', frequency: 620, glideTo: 480, wave: 'sawtooth', peak: 0.09, attack: 0.01, decay: 0.14 },
    { kind: 'tone', frequency: 930, glideTo: 720, wave: 'triangle', peak: 0.08, attack: 0.01, decay: 0.14 },
    { kind: 'tone', frequency: 700, glideTo: 520, wave: 'sawtooth', peak: 0.08, attack: 0.01, decay: 0.12, delay: 0.17 },
  ],
  /** The eel shoots back into its hole. */
  bloop: [
    { kind: 'tone', frequency: 420, glideTo: 140, peak: 0.22, attack: 0.005, decay: 0.16 },
    { kind: 'tone', frequency: 700, glideTo: 1000, peak: 0.07, attack: 0.005, decay: 0.05, delay: 0.2 },
  ],
  /** The starfish flops back onto its rock. */
  plop: [
    { kind: 'noise', frequency: 300, q: 1, peak: 0.12, attack: 0.002, decay: 0.06 },
    { kind: 'tone', frequency: 150, glideTo: 95, peak: 0.12, attack: 0.003, decay: 0.08 },
  ],
  /** A gull lands and folds its wings. */
  flap: [
    { kind: 'noise', frequency: 800, q: 0.8, peak: 0.08, attack: 0.01, decay: 0.05 },
    { kind: 'noise', frequency: 650, q: 0.8, peak: 0.06, attack: 0.01, decay: 0.05, delay: 0.09 },
  ],
  /** A knock on a rock or the log. */
  knock: [
    { kind: 'tone', frequency: 520, glideTo: 470, wave: 'triangle', peak: 0.16, attack: 0.002, decay: 0.05 },
    { kind: 'noise', frequency: 1800, q: 4, peak: 0.08, attack: 0.001, decay: 0.02 },
  ],
  /** A touch on the open sky: a breath of wind. */
  breath: [{ kind: 'noise', frequency: 500, glideTo: 900, q: 0.6, peak: 0.07, attack: 0.18, decay: 0.5 }],
  /** A touch on a cloud: it is pushed, with a soft puff. */
  puff: [
    { kind: 'noise', frequency: 350, glideTo: 600, q: 0.8, peak: 0.09, attack: 0.08, decay: 0.3 },
    { kind: 'tone', frequency: 260, glideTo: 330, peak: 0.04, attack: 0.06, decay: 0.25 },
  ],
  /** A wall between two grooves crumbles: a dry trickle. */
  trickle: [
    { kind: 'noise', frequency: 3200, glideTo: 2200, q: 2.5, peak: 0.06, attack: 0.02, decay: 0.22 },
  ],
  /** A finger lands on the bucket: its handle clinks. */
  clink: [
    { kind: 'tone', frequency: 1900, wave: 'triangle', peak: 0.09, attack: 0.001, decay: 0.05 },
    { kind: 'tone', frequency: 2500, wave: 'triangle', peak: 0.05, attack: 0.001, decay: 0.04, delay: 0.05 },
  ],
  /** The bucket fills where it stands: a scoop and a crunch. */
  scoop: [
    { kind: 'noise', frequency: 800, glideTo: 1500, q: 1.5, peak: 0.16, attack: 0.03, decay: 0.12 },
    { kind: 'noise', frequency: 1000, q: 1.2, peak: 0.2, attack: 0.002, decay: 0.06, delay: 0.17 },
  ],
  /** The bucket fills with water where it stands. */
  glug: [
    { kind: 'tone', frequency: 210, glideTo: 330, peak: 0.16, attack: 0.01, decay: 0.08 },
    { kind: 'tone', frequency: 190, glideTo: 310, peak: 0.15, attack: 0.01, decay: 0.08, delay: 0.13 },
  ],
  /** The empty bucket dragged over level sand: a low grinding scrape. */
  scrape: [{ kind: 'noise', frequency: 260, q: 2.2, peak: 0.13, attack: 0.02, decay: 0.12 }],
  /** A groove scooped into a basin: a heavy wet slurp. */
  slurp: [
    { kind: 'noise', frequency: 380, glideTo: 900, q: 4, peak: 0.2, attack: 0.05, decay: 0.2 },
    { kind: 'tone', frequency: 150, glideTo: 260, peak: 0.1, attack: 0.04, decay: 0.16 },
  ],
  /** Raised sand shaved level: a dry rasp. */
  rasp: [
    { kind: 'noise', frequency: 3000, q: 1.5, peak: 0.1, attack: 0.005, decay: 0.05 },
    { kind: 'noise', frequency: 3400, q: 1.5, peak: 0.1, attack: 0.005, decay: 0.05, delay: 0.07 },
    { kind: 'noise', frequency: 2800, q: 1.5, peak: 0.09, attack: 0.005, decay: 0.07, delay: 0.14 },
  ],
  /** Water in the bucket, slopping as it goes. */
  slop: [
    { kind: 'noise', frequency: 600, glideTo: 380, q: 3, peak: 0.12, attack: 0.03, decay: 0.12 },
    { kind: 'tone', frequency: 480, glideTo: 620, peak: 0.05, attack: 0.02, decay: 0.07, delay: 0.08 },
  ],
  /** The full bucket dragged: a heavy rumble. */
  rumble: [{ kind: 'tone', frequency: 70, glideTo: 62, wave: 'triangle', peak: 0.2, attack: 0.03, decay: 0.14 }],
  /** And the rattle of its handle. */
  rattle: [
    { kind: 'tone', frequency: 2100, wave: 'triangle', peak: 0.04, attack: 0.001, decay: 0.025 },
    { kind: 'tone', frequency: 1750, wave: 'triangle', peak: 0.04, attack: 0.001, decay: 0.025, delay: 0.045 },
  ],
  /** The bucket is stood up again. */
  clonk: [
    { kind: 'tone', frequency: 300, glideTo: 240, wave: 'triangle', peak: 0.2, attack: 0.002, decay: 0.09 },
    { kind: 'noise', frequency: 900, q: 2, peak: 0.08, attack: 0.001, decay: 0.03 },
  ],
  /** The bucket tips onto its side over the driftwood. */
  clang: [
    { kind: 'tone', frequency: 780, wave: 'triangle', peak: 0.16, attack: 0.001, decay: 0.3 },
    { kind: 'tone', frequency: 1170, wave: 'triangle', peak: 0.1, attack: 0.001, decay: 0.24 },
    { kind: 'noise', frequency: 1500, q: 1, peak: 0.1, attack: 0.001, decay: 0.04 },
  ],
  /** A tower is turned out: a hollow whump. */
  whump: [
    { kind: 'tone', frequency: 88, glideTo: 62, peak: 0.32, attack: 0.004, decay: 0.2 },
    { kind: 'noise', frequency: 240, q: 0.8, peak: 0.14, attack: 0.003, decay: 0.1 },
  ],
  /** The bucket lifts off its tower: a sucking pop. */
  pop: [
    { kind: 'noise', frequency: 500, glideTo: 1400, q: 5, peak: 0.1, attack: 0.05, decay: 0.03 },
    { kind: 'tone', frequency: 330, glideTo: 880, peak: 0.2, attack: 0.002, decay: 0.05, delay: 0.07 },
  ],
  /** A tower lands in a groove and plugs it. */
  glop: [
    { kind: 'tone', frequency: 130, glideTo: 80, peak: 0.26, attack: 0.006, decay: 0.16 },
    { kind: 'noise', frequency: 420, glideTo: 200, q: 3.5, peak: 0.16, attack: 0.01, decay: 0.2, delay: 0.03 },
  ],
  /** A second tier lands on the first: a whump and then a creak. */
  creakTier: [
    { kind: 'tone', frequency: 104, glideTo: 70, peak: 0.28, attack: 0.004, decay: 0.16 },
    { kind: 'tone', frequency: 410, glideTo: 560, wave: 'triangle', peak: 0.07, attack: 0.05, decay: 0.2, delay: 0.2 },
  ],
  /** The whole stack comes down: a long slump. */
  slump: [
    { kind: 'noise', frequency: 420, glideTo: 150, q: 0.9, peak: 0.26, attack: 0.03, decay: 0.6 },
    { kind: 'tone', frequency: 82, glideTo: 60, peak: 0.2, attack: 0.02, decay: 0.4 },
  ],
  /** A bucket of water turned out: one sploosh that soaks away. */
  sploosh: [
    { kind: 'noise', frequency: 1300, glideTo: 380, q: 0.8, peak: 0.24, attack: 0.01, decay: 0.34 },
    { kind: 'tone', frequency: 520, glideTo: 240, peak: 0.07, attack: 0.01, decay: 0.2 },
  ],
  /** A tower lands in water: a splosh, and it fizzes. */
  splosh: [
    { kind: 'noise', frequency: 900, glideTo: 500, q: 1, peak: 0.24, attack: 0.004, decay: 0.2 },
    { kind: 'noise', frequency: 5200, q: 1.2, peak: 0.07, attack: 0.1, decay: 0.5, delay: 0.12 },
  ],
  /** A shell pressed half into the sand: a damp squeak. */
  dampSqueak: [
    { kind: 'tone', frequency: 760, glideTo: 540, peak: 0.12, attack: 0.02, decay: 0.1 },
    { kind: 'noise', frequency: 900, q: 6, peak: 0.07, attack: 0.02, decay: 0.08 },
  ],
  /** A shell pops out again. */
  tock: [
    { kind: 'tone', frequency: 980, glideTo: 1240, wave: 'triangle', peak: 0.2, attack: 0.001, decay: 0.045 },
    { kind: 'noise', frequency: 2000, q: 3, peak: 0.07, attack: 0.001, decay: 0.02 },
  ],
  /** A shell pulled through the sand: a clicking scrape. */
  clickScrape: [
    { kind: 'tone', frequency: 1500, wave: 'triangle', peak: 0.06, attack: 0.001, decay: 0.015 },
    { kind: 'noise', frequency: 1700, q: 2, peak: 0.06, attack: 0.01, decay: 0.06, delay: 0.02 },
  ],
  /** A shell rattles into the bucket. */
  shellRattle: [
    { kind: 'tone', frequency: 1250, wave: 'triangle', peak: 0.12, attack: 0.001, decay: 0.03 },
    { kind: 'tone', frequency: 1100, wave: 'triangle', peak: 0.1, attack: 0.001, decay: 0.03, delay: 0.07 },
    { kind: 'tone', frequency: 1320, wave: 'triangle', peak: 0.08, attack: 0.001, decay: 0.03, delay: 0.12 },
    { kind: 'tone', frequency: 1180, wave: 'triangle', peak: 0.06, attack: 0.001, decay: 0.03, delay: 0.16 },
  ],
  /** A shell shoots out from under a tower. */
  ping: [{ kind: 'tone', frequency: 2350, glideTo: 2900, peak: 0.16, attack: 0.001, decay: 0.2 }],
  /** And skitters to a stop. */
  skitter: [
    { kind: 'noise', frequency: 4200, q: 4, peak: 0.06, attack: 0.001, decay: 0.02 },
    { kind: 'noise', frequency: 4000, q: 4, peak: 0.05, attack: 0.001, decay: 0.02, delay: 0.07 },
    { kind: 'noise', frequency: 3800, q: 4, peak: 0.04, attack: 0.001, decay: 0.02, delay: 0.16 },
  ],
  /** A shell fills with a glug and lets go a string of bubbles. */
  bubbles: [
    { kind: 'tone', frequency: 260, glideTo: 380, peak: 0.13, attack: 0.01, decay: 0.07 },
    { kind: 'tone', frequency: 700, glideTo: 1000, peak: 0.06, attack: 0.004, decay: 0.035, delay: 0.14 },
    { kind: 'tone', frequency: 840, glideTo: 1200, peak: 0.06, attack: 0.004, decay: 0.035, delay: 0.22 },
    { kind: 'tone', frequency: 990, glideTo: 1400, peak: 0.05, attack: 0.004, decay: 0.035, delay: 0.29 },
    { kind: 'tone', frequency: 1180, glideTo: 1650, peak: 0.04, attack: 0.004, decay: 0.035, delay: 0.35 },
  ],
  /** Driftwood rocks like a see-saw: two hollow knocks. */
  seesaw: [
    { kind: 'tone', frequency: 196, glideTo: 180, wave: 'triangle', peak: 0.2, attack: 0.002, decay: 0.09 },
    { kind: 'tone', frequency: 147, glideTo: 135, wave: 'triangle', peak: 0.2, attack: 0.002, decay: 0.1, delay: 0.22 },
  ],
  /** Driftwood pulled over the sand: a low woody rumble. */
  woodRumble: [
    { kind: 'tone', frequency: 110, glideTo: 98, wave: 'triangle', peak: 0.08, attack: 0.02, decay: 0.1 },
    { kind: 'noise', frequency: 330, q: 2, peak: 0.06, attack: 0.02, decay: 0.1 },
  ],
  /** Driftwood let go across a groove: it lies as a bridge, with a clack. */
  bridge: [
    { kind: 'tone', frequency: 440, wave: 'triangle', peak: 0.2, attack: 0.001, decay: 0.05 },
    { kind: 'tone', frequency: 370, wave: 'triangle', peak: 0.16, attack: 0.001, decay: 0.05, delay: 0.06 },
  ],
  /** A tower lands across driftwood: a muffled thud and a crack. */
  thudCrack: [
    { kind: 'tone', frequency: 80, glideTo: 60, peak: 0.26, attack: 0.006, decay: 0.12 },
    { kind: 'noise', frequency: 2600, q: 3, peak: 0.14, attack: 0.001, decay: 0.03, delay: 0.1 },
  ],
  /** Driftwood lifts on the water with a creak. */
  woodCreak: [{ kind: 'tone', frequency: 300, glideTo: 440, wave: 'triangle', peak: 0.08, attack: 0.08, decay: 0.26 }],
  /** And bumps the side of its groove. */
  softKnock: [{ kind: 'tone', frequency: 230, glideTo: 205, wave: 'triangle', peak: 0.08, attack: 0.004, decay: 0.06 }],
  /** The tide slides up over level sand with a fizz of foam. */
  fizz: [{ kind: 'noise', frequency: 5600, q: 0.9, peak: 0.06, attack: 0.25, decay: 0.7 }],
  /** Water runs along a groove: a gurgle that climbs as it fills. */
  climb: [
    { kind: 'tone', frequency: 240, glideTo: 330, peak: 0.1, attack: 0.02, decay: 0.09 },
    { kind: 'tone', frequency: 300, glideTo: 420, peak: 0.1, attack: 0.02, decay: 0.09, delay: 0.14 },
    { kind: 'tone', frequency: 380, glideTo: 540, peak: 0.1, attack: 0.02, decay: 0.09, delay: 0.28 },
    { kind: 'tone', frequency: 480, glideTo: 690, peak: 0.09, attack: 0.02, decay: 0.09, delay: 0.42 },
    { kind: 'tone', frequency: 610, glideTo: 880, peak: 0.08, attack: 0.02, decay: 0.1, delay: 0.56 },
  ],
  /** A pool and the sea become one: a small wave runs back along the pool with a low whoosh. */
  whoosh: [{ kind: 'noise', frequency: 300, glideTo: 620, q: 0.7, peak: 0.14, attack: 0.2, decay: 0.4 }],
  /** Grains slide into the water with small plops. */
  plops: [
    { kind: 'tone', frequency: 520, glideTo: 760, peak: 0.07, attack: 0.004, decay: 0.04 },
    { kind: 'tone', frequency: 610, glideTo: 880, peak: 0.06, attack: 0.004, decay: 0.04, delay: 0.13 },
    { kind: 'tone', frequency: 470, glideTo: 700, peak: 0.06, attack: 0.004, decay: 0.04, delay: 0.3 },
  ],
  /** Raised sand under the water sinks to a mound: a long hush. */
  hush: [{ kind: 'noise', frequency: 1200, glideTo: 500, q: 0.6, peak: 0.08, attack: 0.3, decay: 0.9 }],
  /** The sun: the first and the second note of its slow chime. */
  chimeFirst: [{ kind: 'tone', frequency: 392, peak: 0.14, attack: 0.02, decay: 0.7 }],
  chimeSecond: [{ kind: 'tone', frequency: 294, peak: 0.14, attack: 0.02, decay: 0.9 }],
  /** The sun goes back to where it set out from: a soft hum. */
  hum: [{ kind: 'tone', frequency: 196, glideTo: 185, peak: 0.1, attack: 0.12, decay: 0.6 }],
  /** The one long wave: a rising hush. */
  wave: [
    { kind: 'noise', frequency: 350, glideTo: 2400, q: 0.5, peak: 0.16, attack: 1.6, decay: 1.4 },
    { kind: 'noise', frequency: 5000, q: 0.8, peak: 0.05, attack: 1.6, decay: 1.2, delay: 0.6 },
  ],
  /** A finger on the gulls' log: a deep hollow knock. */
  hollow: [
    { kind: 'tone', frequency: 104, glideTo: 92, wave: 'triangle', peak: 0.3, attack: 0.002, decay: 0.2 },
    { kind: 'tone', frequency: 208, peak: 0.08, attack: 0.002, decay: 0.1 },
  ],
  /** The crab stamps at a gap. */
  stamp: [
    { kind: 'tone', frequency: 150, glideTo: 110, peak: 0.16, attack: 0.002, decay: 0.05 },
    { kind: 'tone', frequency: 150, glideTo: 110, peak: 0.16, attack: 0.002, decay: 0.05, delay: 0.16 },
  ],
  /** A gull slides off a lumpy top. */
  slip: [{ kind: 'tone', frequency: 880, glideTo: 330, wave: 'triangle', peak: 0.08, attack: 0.01, decay: 0.22 }],
  /** The starfish lets go and drops with a slap. */
  drop: [
    { kind: 'noise', frequency: 1100, q: 0.8, peak: 0.2, attack: 0.001, decay: 0.06 },
    { kind: 'tone', frequency: 120, glideTo: 80, peak: 0.14, attack: 0.002, decay: 0.07 },
  ],
  /** The eel swims a groove: a quick swish. */
  swish: [{ kind: 'noise', frequency: 1500, glideTo: 2600, q: 1.5, peak: 0.07, attack: 0.04, decay: 0.12 }],
  /** Small crabs walk sideways along the water's edge. */
  scuttle: [
    { kind: 'noise', frequency: 3300, q: 6, peak: 0.035, attack: 0.001, decay: 0.015 },
    { kind: 'noise', frequency: 3500, q: 6, peak: 0.035, attack: 0.001, decay: 0.015, delay: 0.05 },
    { kind: 'noise', frequency: 3100, q: 6, peak: 0.03, attack: 0.001, decay: 0.015, delay: 0.1 },
  ],
  /** The eel pokes its nose at driftwood. */
  sniff: [{ kind: 'tone', frequency: 560, glideTo: 700, peak: 0.07, attack: 0.01, decay: 0.05 }],
  /** The crab digs itself into the sand: four scrapes, each lower than the last. */
  burrow: [
    { kind: 'noise', frequency: 1500, glideTo: 900, q: 1.6, peak: 0.12, attack: 0.01, decay: 0.07 },
    { kind: 'noise', frequency: 1250, glideTo: 750, q: 1.6, peak: 0.12, attack: 0.01, decay: 0.07, delay: 0.17 },
    { kind: 'noise', frequency: 1000, glideTo: 600, q: 1.6, peak: 0.11, attack: 0.01, decay: 0.07, delay: 0.34 },
    { kind: 'noise', frequency: 800, glideTo: 480, q: 1.6, peak: 0.1, attack: 0.01, decay: 0.08, delay: 0.51 },
  ],
}
