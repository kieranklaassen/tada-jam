// The second half of the table in voices.ts: everything a mouth, a foot or a
// wing does at the hatch. First what any customer does with the thing it is
// handed (the last column of the grid), then each customer's own voice.
//
// A child should know who is at the hatch with eyes shut. So each animal has a
// register of its own, held in order by the test, and a timbre of its own: the
// wave of its loudest note, and whether breath or roughness (a band of noise)
// goes with it. No voice is a word, and none is a tune: delight is the
// animal's own sound said gladly, never a rising chord that says well done.

import type { Note, VoiceSpec } from './voices'

// The two rows of the table, in the order `tone` and `noise` take them, so a row reads like the call it becomes.
const t = (at: number, frequency: number, wave: OscillatorType, peak: number, attack: number, decay: number, glideTo?: number): Note =>
  glideTo === undefined ? { kind: 'tone', at, frequency, wave, peak, attack, decay } : { kind: 'tone', at, frequency, glideTo, wave, peak, attack, decay }
const n = (at: number, frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note =>
  glideTo === undefined ? { kind: 'noise', at, frequency, q, peak, attack, decay } : { kind: 'noise', at, frequency, glideTo, q, peak, attack, decay }
export { t as toneNote, n as noiseNote }

/** The customers, from the lowest voice to the highest. */
export const ANIMALS = ['bear', 'goat', 'crow', 'duck', 'dachshund', 'hen', 'mole', 'sparrows'] as const
export type Animal = (typeof ANIMALS)[number]
/** What each of them can say: delight, dislike, a question, and one footfall, hop or wingbeat. */
export const SAYS = ['yes', 'no', 'huh', 'step'] as const

export const CAST = {
  // ---- Handed over at the hatch (the last column of the grid) ----

  // Flour: the breath in, a beat, and the burst.
  'sneeze': [n(0, 900, 3, 0.07, 0.2, 0.04, 2600), n(0.26, 3000, 0.8, 0.2, 0.006, 0.15, 1300), t(0.26, 420, 'triangle', 0.08, 0.006, 0.1, 260)],
  // Water: one wave out and one back.
  'slosh': [n(0, 800, 1, 0.14, 0.03, 0.15, 1600), t(0.02, 260, 'sine', 0.08, 0.01, 0.1, 380), n(0.12, 1400, 1, 0.1, 0.03, 0.15, 600)],
  // The sour jar: a face puckering draws the air in, so the squeak climbs.
  'drawn-in-squeak': [t(0, 900, 'sine', 0.08, 0.05, 0.2, 2400), n(0, 2500, 6, 0.04, 0.05, 0.18, 4200)],
  // A seed in a tooth.
  'tongue-click': [t(0, 1300, 'sine', 0.13, 0.002, 0.03, 700), n(0, 2600, 3, 0.07, 0.002, 0.012)],
  // Batter: one drip, then it is sucked up.
  'drip-slurp': [t(0, 520, 'sine', 0.1, 0.004, 0.06, 800), n(0.1, 600, 5, 0.11, 0.03, 0.2, 2400)],
  // Raw dough, by how far it was worked: clumps smack, shreds are chewed, strings twang, a risen balloon squeaks and pops.
  'smack-pull': [n(0, 1800, 3, 0.12, 0.004, 0.07, 800), t(0.08, 240, 'sine', 0.08, 0.03, 0.14, 330)],
  'chew-pull': [t(0, 230, 'triangle', 0.11, 0.008, 0.06, 180), n(0.02, 900, 2, 0.07, 0.01, 0.06), t(0.12, 250, 'triangle', 0.1, 0.008, 0.06, 190), n(0.2, 1200, 3, 0.08, 0.02, 0.12, 600)],
  'stretch-twang': [t(0, 260, 'sine', 0.07, 0.08, 0.1, 420), t(0.2, 520, 'triangle', 0.14, 0.003, 0.16, 300), t(0.2, 1050, 'sine', 0.04, 0.003, 0.06)],
  'squeak-pop': [t(0, 1100, 'sine', 0.07, 0.04, 0.16, 2000), t(0.24, 420, 'sine', 0.16, 0.002, 0.04, 180), n(0.24, 2000, 1, 0.09, 0.002, 0.03)],
  // Toasted flour: a cough first, because it is dry, and then the sneeze.
  'cough-sneeze': [n(0, 700, 1.2, 0.14, 0.005, 0.06, 400), t(0, 240, 'triangle', 0.08, 0.005, 0.05, 180), n(0.16, 2800, 0.8, 0.18, 0.006, 0.14, 1200)],
  'crunch': [n(0, 2400, 1.5, 0.16, 0.002, 0.03), n(0.05, 1800, 1.5, 0.12, 0.002, 0.04), n(0.11, 2100, 2, 0.08, 0.002, 0.03)],
  // A pancake folds in the mouth: two soft closings.
  'soft-chew': [t(0, 300, 'sine', 0.1, 0.01, 0.07, 230), n(0, 700, 1.2, 0.05, 0.01, 0.06), t(0.14, 280, 'sine', 0.09, 0.01, 0.07, 215), n(0.14, 650, 1.2, 0.05, 0.01, 0.06)],
  // A crumbly loaf falls apart in the paws, and the breath goes in.
  'crumble-gasp': [n(0, 1900, 2, 0.1, 0.004, 0.05, 1400), n(0.06, 1500, 2, 0.07, 0.004, 0.05), n(0.14, 1200, 2.5, 0.08, 0.1, 0.05, 2600)],
  // A tooth on a brick: the knock is hard and short, and the tooth rings on two partials that are not in tune.
  'clonk-ring': [t(0, 700, 'triangle', 0.18, 0.002, 0.04, 560), n(0, 2500, 2, 0.06, 0.002, 0.015), t(0.01, 1850, 'sine', 0.08, 0.004, 0.32), t(0.01, 2790, 'sine', 0.03, 0.004, 0.18)],
  'chomp': [t(0, 210, 'triangle', 0.16, 0.004, 0.07, 150), n(0, 1300, 1.2, 0.12, 0.003, 0.05, 700)],

  // ---- The customers (ART.md, "The characters") ----

  // The bear: the lowest and the roundest, sines only. Its delight is a hum that settles and then lifts.
  'bear-yes': [t(0, 185, 'sine', 0.18, 0.04, 0.13, 165), t(0, 370, 'sine', 0.04, 0.04, 0.1, 330), t(0.2, 172, 'sine', 0.17, 0.04, 0.2, 220)],
  'bear-no': [t(0, 200, 'sine', 0.17, 0.02, 0.1, 175), t(0.11, 180, 'sine', 0.16, 0.02, 0.16, 150)],
  'bear-huh': [t(0, 165, 'sine', 0.16, 0.03, 0.2, 250)],
  'bear-step': [t(0, 150, 'sine', 0.1, 0.004, 0.06, 100), n(0, 500, 1, 0.04, 0.003, 0.03)],

  // The goat: reedy, and it never holds a note still.
  'goat-yes': [t(0, 340, 'sawtooth', 0.08, 0.015, 0.05), t(0.07, 362, 'sawtooth', 0.07, 0.015, 0.05), t(0.14, 338, 'sawtooth', 0.07, 0.015, 0.05), t(0.21, 366, 'sawtooth', 0.07, 0.015, 0.05), t(0.28, 345, 'sawtooth', 0.07, 0.015, 0.1, 380)],
  'goat-no': [t(0, 350, 'sawtooth', 0.08, 0.02, 0.1, 320), t(0.11, 318, 'sawtooth', 0.07, 0.02, 0.16, 250)],
  'goat-huh': [t(0, 315, 'sawtooth', 0.08, 0.02, 0.07), t(0.08, 330, 'sawtooth', 0.07, 0.02, 0.16, 440)],
  'goat-step': [t(0, 620, 'triangle', 0.09, 0.002, 0.03, 480), n(0, 2200, 3, 0.04, 0.002, 0.012)],

  // The crow: low for a bird, and rough. Every caw is a saw with noise over it.
  'crow-yes': [t(0, 430, 'sawtooth', 0.08, 0.01, 0.09, 390), n(0, 1300, 1.5, 0.07, 0.01, 0.09), t(0.15, 460, 'sawtooth', 0.07, 0.01, 0.12, 400), n(0.15, 1500, 1.5, 0.06, 0.01, 0.12)],
  'crow-no': [t(0, 420, 'sawtooth', 0.08, 0.015, 0.22, 300), n(0, 1100, 1.5, 0.07, 0.015, 0.2, 800)],
  'crow-huh': [t(0, 400, 'sawtooth', 0.08, 0.015, 0.15, 520), n(0, 1200, 1.5, 0.05, 0.015, 0.12)],
  'crow-step': [n(0, 1000, 1.5, 0.08, 0.004, 0.04, 700)],

  // The duck: nasal, and every quack falls.
  'duck-yes': [t(0, 560, 'square', 0.07, 0.008, 0.06, 470), t(0.1, 580, 'square', 0.08, 0.008, 0.06, 480), t(0.2, 555, 'square', 0.07, 0.008, 0.09, 450)],
  'duck-no': [t(0, 540, 'square', 0.08, 0.01, 0.2, 380)],
  'duck-huh': [t(0, 500, 'square', 0.08, 0.01, 0.05, 460), t(0.08, 510, 'square', 0.07, 0.01, 0.13, 680)],
  // A flat foot on the floor.
  'duck-step': [n(0, 1300, 1, 0.09, 0.003, 0.045, 800), t(0, 300, 'sine', 0.05, 0.003, 0.03, 220)],

  // The dachshund: a yappy middle, and every yap flicks up.
  'dachshund-yes': [t(0, 700, 'triangle', 0.14, 0.006, 0.05, 950), n(0, 1800, 2, 0.04, 0.004, 0.03), t(0.11, 760, 'triangle', 0.15, 0.006, 0.06, 1050)],
  'dachshund-no': [t(0, 720, 'triangle', 0.13, 0.02, 0.2, 480)],
  'dachshund-huh': [t(0, 660, 'triangle', 0.1, 0.01, 0.04), t(0.07, 680, 'triangle', 0.13, 0.015, 0.14, 960)],
  'dachshund-step': [t(0, 800, 'triangle', 0.07, 0.002, 0.03, 600), n(0, 2600, 3, 0.04, 0.002, 0.012)],

  // The hen: short clucks, said more than once.
  'hen-yes': [t(0, 900, 'triangle', 0.12, 0.004, 0.035, 760), t(0.08, 905, 'triangle', 0.12, 0.004, 0.035, 760), t(0.16, 920, 'triangle', 0.13, 0.004, 0.035, 780), t(0.24, 980, 'triangle', 0.12, 0.006, 0.1, 1250)],
  'hen-no': [t(0, 940, 'triangle', 0.12, 0.004, 0.04, 800), t(0.09, 880, 'triangle', 0.13, 0.006, 0.16, 620)],
  'hen-huh': [t(0, 860, 'triangle', 0.12, 0.004, 0.035, 760), t(0.09, 880, 'triangle', 0.11, 0.006, 0.12, 1180)],
  'hen-step': [t(0, 1000, 'triangle', 0.06, 0.002, 0.03, 850)],

  // The mole: small and soft, a sine with breath on it.
  'mole-yes': [t(0, 1400, 'sine', 0.09, 0.03, 0.1, 1550), n(0, 2600, 1, 0.03, 0.03, 0.2), t(0.16, 1500, 'sine', 0.08, 0.03, 0.14, 1350)],
  'mole-no': [t(0, 1350, 'sine', 0.09, 0.02, 0.18, 950), n(0, 2200, 1, 0.04, 0.02, 0.14)],
  'mole-huh': [t(0, 1250, 'sine', 0.09, 0.03, 0.15, 1750), n(0, 2400, 1, 0.03, 0.03, 0.1)],
  'mole-step': [n(0, 1900, 1, 0.05, 0.006, 0.04)],

  // The sparrows: the highest voices in the room, and a row of them, so delight is several birds at once.
  'sparrows-yes': [t(0, 3000, 'sine', 0.09, 0.004, 0.04, 3600), t(0.06, 3300, 'sine', 0.08, 0.004, 0.04, 3900), t(0.13, 2900, 'sine', 0.08, 0.004, 0.04, 3500), t(0.18, 3400, 'sine', 0.07, 0.004, 0.04, 4000), t(0.25, 3100, 'sine', 0.07, 0.004, 0.05, 3700)],
  'sparrows-no': [t(0, 3500, 'sine', 0.09, 0.004, 0.08, 2600), t(0.1, 3200, 'sine', 0.08, 0.004, 0.1, 2300)],
  'sparrows-huh': [t(0, 2800, 'sine', 0.09, 0.004, 0.05), t(0.08, 2900, 'sine', 0.08, 0.004, 0.1, 3800)],
  'sparrows-step': [n(0, 2000, 2, 0.06, 0.003, 0.03)],

  // One of the hen's chicks.
  'chick-peep': [t(0, 4200, 'sine', 0.06, 0.004, 0.05, 4800)],
} as const satisfies Record<string, VoiceSpec>
