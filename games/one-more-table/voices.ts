import type { Note } from './audio'
import type { DishId, GuestId } from './cast'
import type { SpotKey } from './layout'

// Every sound as plain numbers: reeds for the table, and a voice for each.

type Plain = 'creak' | 'clink' | 'clack' | 'pat' | 'dab' | 'plate' | 'slosh' | 'ring' | 'flop' | 'tonk' | 'refill' | 'bump' | 'jump' | 'forced' | 'plop' | 'popUp' | 'goHome' | 'scrape' | 'bell' | 'spoon' | 'sigh' | 'hiccup' | 'smack' | 'steps' | 'reedOut' | 'reedIn' | 'wheezeIn' | 'wheezeOut'
export type SoundName = Plain | GuestId | `${GuestId}Takes` | DishId | `${DishId}Eaten` | SpotKey

const t = (frequency: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak: 0.12, attack: 0.01, decay, ...more })
const n = (frequency: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, peak: 0.12, attack: 0.008, decay, q: 1.2, ...more })
/** A reed: two squares a little apart. */
const reed = (f: number, decay: number, peak = 0.045, delay = 0, glide?: number): Note[] => [
  { kind: 'tone', wave: 'sawtooth', frequency: f, glideTo: glide, peak, attack: 0.03, decay, delay },
  { kind: 'tone', wave: 'square', frequency: f * 1.006, glideTo: glide ? glide * 1.006 : undefined, peak: peak * 0.4, attack: 0.03, decay, delay },
]
const run = (count: number, gap: number, make: (i: number) => Note): Note[] => Array.from({ length: count }, (_, i) => { const note = make(i); return { ...note, delay: (note.delay ?? 0) + i * gap } })
const tri = (f: number, d: number, more: Partial<Note> = {}) => t(f, d, { wave: 'triangle', ...more })

export const VOICES: Readonly<Record<SoundName, readonly Note[]>> = {
  creak: [...reed(196, 0.12), n(320, 0.08)],
  clink: [t(1760, 0.2, { peak: 0.06 }), t(2637, 0.12, { peak: 0.03, delay: 0.03 })],
  clack: [tri(980, 0.06), tri(640, 0.08, { delay: 0.05 })],
  pat: [t(240, 0.09, { glideTo: 170 }), n(500, 0.05, { peak: 0.06 })],
  dab: [n(900, 0.1, { peak: 0.05 }), t(392, 0.14, { peak: 0.05, delay: 0.02 })],
  plate: [t(1320, 0.1, { peak: 0.06 }), tri(1980, 0.07, { peak: 0.03 })],
  slosh: [n(420, 0.25, { glideTo: 260 }), t(150, 0.2, { glideTo: 210 })],
  ring: [t(2093, 0.7, { peak: 0.05 }), t(2100, 0.7, { peak: 0.03 })],
  flop: [n(260, 0.16, { peak: 0.2 }), t(170, 0.16, { glideTo: 90 })],
  tonk: [tri(420, 0.2, { peak: 0.18 }), t(840, 0.1, { peak: 0.06 })],
  refill: [t(330, 0.12, { glideTo: 660 }), t(990, 0.2, { delay: 0.1, peak: 0.07 })],
  bump: [t(120, 0.16, { peak: 0.2, glideTo: 80 }), tri(880, 0.05, { delay: 0.08 }), tri(990, 0.05, { delay: 0.13 }), tri(860, 0.05, { delay: 0.18 })],
  jump: [t(260, 0.28, { glideTo: 620, wave: 'triangle' })],
  forced: [...reed(150, 0.5, 0.05, 0, 320), t(200, 0.3, { glideTo: 520 })],
  plop: [t(180, 0.22, { glideTo: 70, peak: 0.26 }), n(200, 0.14, { peak: 0.18 }), tri(520, 0.08, { delay: 0.05, peak: 0.06 })],
  popUp: [t(300, 0.1, { glideTo: 900, peak: 0.18 }), t(900, 0.6, { glideTo: 300, delay: 0.2, peak: 0.07 })],
  goHome: [...reed(392, 1.6, 0.05, 0, 98), ...reed(294, 1.6, 0.035, 0.1, 82)],
  scrape: [n(1400, 0.5, { glideTo: 700, peak: 0.1 }), t(700, 0.5, { glideTo: 1400, peak: 0.05, delay: 0.1 })],
  bell: [t(659, 1.8, { peak: 0.16 }), t(1318, 1.2, { peak: 0.08 }), t(1778, 0.8, { peak: 0.05 }), t(659, 1.6, { peak: 0.12, delay: 0.28 }), t(1318, 1, { peak: 0.06, delay: 0.28 })],
  spoon: [t(1500, 0.06, { peak: 0.05 }), t(1500, 0.06, { peak: 0.05, delay: 0.15 }), t(1500, 0.06, { peak: 0.05, delay: 0.3 })],
  sigh: [n(700, 1.1, { glideTo: 250, attack: 0.2 }), ...reed(175, 1.1, 0.03, 0.05, 116)],
  hiccup: [t(420, 0.07, { glideTo: 760, peak: 0.1 })],
  smack: [n(1200, 0.05), n(1100, 0.06, { delay: 0.16 }), t(300, 0.08, { delay: 0.17, glideTo: 480 })],
  steps: [t(130, 0.08, { peak: 0.14 }), t(140, 0.08, { peak: 0.14, delay: 0.17 }), t(125, 0.09, { peak: 0.16, delay: 0.34 })],
  reedOut: reed(247, 0.16),
  reedIn: reed(185, 0.16),
  wheezeIn: reed(330, 0.6, 0.04, 0, 165),
  wheezeOut: reed(147, 0.7, 0.04, 0, 247),

  granny: [t(520, 0.5, { glideTo: 1100, wave: 'triangle' })],
  grandpa: [n(160, 0.5, { attack: 0.3, peak: 0.22 }), n(2400, 0.5, { delay: 0.7, peak: 0.03, attack: 0.1 })],
  baby: [tri(780, 0.18, { glideTo: 1200 }), tri(1000, 0.3, { glideTo: 400, delay: 0.3, peak: 0.16 })],
  aunt: [t(420, 0.4, { glideTo: 760, peak: 0.14 }), t(760, 0.35, { glideTo: 560, delay: 0.35 })],
  uncle: [{ kind: 'tone', wave: 'sawtooth', frequency: 87, peak: 0.16, attack: 0.05, decay: 0.3 }, { kind: 'tone', wave: 'sawtooth', frequency: 65, peak: 0.18, attack: 0.05, decay: 0.5, delay: 0.36 }],
  dog: [n(700, 0.1, { peak: 0.18 }), t(340, 0.1, { glideTo: 220, peak: 0.16 }), n(900, 0.35, { delay: 0.3, glideTo: 1800 })],
  tall: [t(900, 0.9, { glideTo: 180, peak: 0.09 })],
  goose: [{ kind: 'tone', wave: 'sawtooth', frequency: 311, glideTo: 262, peak: 0.11, attack: 0.01, decay: 0.16 }, { kind: 'tone', wave: 'sawtooth', frequency: 349, glideTo: 247, peak: 0.13, attack: 0.01, decay: 0.22, delay: 0.3 }],
  little: [t(360, 0.06, { delay: 0.5, glideTo: 900, peak: 0.22 }), tri(880, 0.3, { delay: 0.55, glideTo: 660 })],
  cow: [{ kind: 'tone', wave: 'sawtooth', frequency: 130, glideTo: 98, peak: 0.12, attack: 0.15, decay: 0.8 }, n(500, 0.1, { delay: 0.5 })],
  bear: [{ kind: 'tone', wave: 'triangle', frequency: 92, glideTo: 74, peak: 0.26, attack: 0.2, decay: 0.8 }],
  moose: [{ kind: 'tone', wave: 'square', frequency: 104, glideTo: 164, peak: 0.07, attack: 0.1, decay: 0.45 }, { kind: 'tone', wave: 'square', frequency: 164, glideTo: 92, peak: 0.07, attack: 0.05, decay: 0.5, delay: 0.5 }],

  grannyTakes: [t(220, 0.3, { glideTo: 880, peak: 0.1 }), t(880, 0.2, { glideTo: 440, delay: 0.3, peak: 0.06 })],
  grandpaTakes: [tri(720, 0.07), tri(720, 0.09, { delay: 0.16 })],
  babyTakes: run(6, 0.1, (i) => tri(900 + (i % 2) * 260, 0.07)),
  auntTakes: [t(330, 0.6, { glideTo: 700, attack: 0.1 })],
  uncleTakes: run(5, 0.09, (i) => n(600 + i * 120, 0.07, { q: 6 })),
  dogTakes: [tri(760, 0.1, { glideTo: 1100 }), tri(820, 0.1, { glideTo: 1200, delay: 0.2 })],
  tallTakes: [tri(300, 0.12, { peak: 0.2 }), tri(300, 0.1, { delay: 0.22, peak: 0.1 })],
  gooseTakes: [t(400, 0.3, { glideTo: 1500, peak: 0.08 }), t(1500, 0.3, { glideTo: 400, delay: 0.3, peak: 0.08 })],
  littleTakes: [n(2200, 0.3, { attack: 0.25, peak: 0.05 }), n(1600, 0.16, { delay: 0.5, peak: 0.22 }), t(600, 0.1, { delay: 0.5, glideTo: 300 })],
  cowTakes: run(4, 0.14, (i) => ({ kind: 'tone', wave: 'sawtooth', frequency: 150 + (i % 2) * 24, peak: 0.08, attack: 0.02, decay: 0.12 })),
  bearTakes: [tri(440, 0.35, { glideTo: 520, peak: 0.1, attack: 0.08 })],
  mooseTakes: [t(1175, 0.9, { peak: 0.07 }), t(1480, 0.8, { peak: 0.05, delay: 0.04 })],

  corn: run(3, 0.08, (i) => tri(900 + i * 200, 0.04)),
  mash: [n(240, 0.2), t(120, 0.18, { glideTo: 180 })],
  milk: [t(300, 0.1, { glideTo: 420 }), t(340, 0.1, { glideTo: 480, delay: 0.14 })],
  jelly: run(5, 0.07, (i) => t(260 + (i % 2) * 90, 0.07)),
  sausages: [t(200, 0.16, { glideTo: 130 }), t(240, 0.16, { glideTo: 150, delay: 0.12 })],
  gravy: run(3, 0.12, (i) => t(140 + i * 30, 0.1, { glideTo: 230 + i * 30 })),
  pancakes: run(4, 0.07, (i) => n(340 + i * 60, 0.06, { peak: 0.16 })),
  rolls: [n(800, 0.06), t(330, 0.1, { glideTo: 500, delay: 0.04 })],
  pumpkin: [t(98, 0.2, { peak: 0.24 }), n(180, 0.1)],
  cheese: [t(380, 0.2, { glideTo: 300, wave: 'triangle' }), n(1500, 0.12, { delay: 0.1, peak: 0.05 })],
  honey: [t(180, 0.5, { glideTo: 120, peak: 0.14 })],
  pie: [n(3000, 0.4, { peak: 0.04, attack: 0.1 }), tri(500, 0.12)],

  cornEaten: run(12, 0.08, (i) => tri(1100 + (i % 3) * 80, 0.03)),
  mashEaten: [n(300, 0.3, { peak: 0.2 }), t(140, 0.4, { glideTo: 70, delay: 0.3, peak: 0.2 })],
  milkEaten: run(5, 0.2, (i) => t(280 + i * 24, 0.1, { glideTo: 430 + i * 24 })),
  jellyEaten: run(9, 0.09, (i) => t(220 + (i % 2) * 120, 0.09, { wave: 'triangle' })),
  sausagesEaten: [n(700, 0.8, { glideTo: 2600, attack: 0.1 }), t(300, 0.8, { glideTo: 1200, delay: 0.1 })],
  gravyEaten: run(6, 0.16, (i) => t(120 + (i % 3) * 26, 0.13, { glideTo: 240, peak: 0.16 })),
  pancakesEaten: run(5, 0.2, (i) => t(240 * 1.12 ** i, 0.14, { wave: 'triangle' })),
  rollsEaten: [...run(3, 0.14, (i) => n(620 + i * 90, 0.08)), t(200, 0.3, { glideTo: 340, delay: 0.5 })],
  pumpkinEaten: [n(160, 0.2, { peak: 0.24 }), t(82, 0.5, { delay: 0.2, peak: 0.24, glideTo: 110 })],
  cheeseEaten: [n(420, 0.2), t(240, 0.6, { delay: 0.3, glideTo: 150, wave: 'sawtooth', peak: 0.05 })],
  honeyEaten: [t(150, 0.8, { glideTo: 110, peak: 0.14 }), t(220, 0.35, { delay: 1.0, glideTo: 1200, peak: 0.16 })],
  pieEaten: [n(420, 0.25, { delay: 0.45, peak: 0.28 }), tri(1200, 0.05, { delay: 1.0 }), tri(1200, 0.05, { delay: 1.15 })],

  cuckoo: [t(784, 0.2, { wave: 'triangle' }), t(622, 0.32, { delay: 0.24, wave: 'triangle' })],
  cat: [t(560, 0.35, { glideTo: 820, peak: 0.1 }), t(820, 0.3, { glideTo: 480, delay: 0.3, peak: 0.08 })],
  pot: run(6, 0.1, (i) => t(180 + (i * 67) % 150, 0.09, { glideTo: 330 })),
  curtain: [n(900, 0.5, { glideTo: 1800, attack: 0.2 })],
  hen: run(4, 0.15, (i) => tri(i === 3 ? 760 : 480, i === 3 ? 0.3 : 0.08, { glideTo: i === 3 ? 540 : 440 })),
  sun: run(4, 0.14, (i) => t([523, 659, 784, 1047][i], 0.5, { peak: 0.06 })),
  tree: [n(1600, 0.6, { glideTo: 900, attack: 0.1 }), t(160, 0.12, { delay: 0.5, peak: 0.2 })],
  mice: run(6, 0.1, (i) => tri(1700 + ((i * 5) % 4) * 190, 0.05, { peak: 0.06 })),
}

/** A sound's notes, so many half steps up, starting so much later. */
export function notesOf(name: SoundName, steps = 0, delay = 0): Note[] {
  const k = 2 ** (steps / 12)
  return VOICES[name].map((note) => ({ ...note, frequency: note.frequency * k, glideTo: note.glideTo === undefined ? undefined : note.glideTo * k, delay: (note.delay ?? 0) + delay }))
}
