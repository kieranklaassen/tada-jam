import type { Fired } from './gait'

// Every voice of the game, as plain numbers. Nobody on the machine that wrote
// them could hear them: each is written from the design sheet's words and
// held inside stated ranges by a test. The lead checks loudness on a real
// machine and the owner is the first to listen.

type Wave = 'sine' | 'triangle' | 'square' | 'sawtooth'
/** One enveloped oscillator: its pitch in Hz, where it glides to, its peak, its attack and decay in seconds, and its delay. */
export type Tone = { kind: 'tone'; wave: Wave; f: number; to?: number; peak: number; attack: number; decay: number; at: number }
/** One enveloped band of noise: its middle in Hz and how narrow it is. */
export type Hiss = { kind: 'noise'; f: number; q: number; to?: number; peak: number; attack: number; decay: number; at: number }
export type Note = Tone | Hiss

const t = (wave: Wave, f: number, peak: number, attack: number, decay: number, to?: number, at = 0): Tone => ({ kind: 'tone', wave, f, to, peak, attack, decay, at })
const n = (f: number, q: number, peak: number, attack: number, decay: number, to?: number, at = 0): Hiss => ({ kind: 'noise', f, q, to, peak, attack, decay, at })

/** The ranges every note stays inside. */
export const RANGE = { f: [60, 5000], peak: [0.005, 0.2], attack: [0.001, 0.3], decay: [0.02, 0.9], at: [0, 1.1], length: 1.6 } as const

export const VOICES = {
  // The finger lands: what lies under it answers.
  'land-tar': [n(2600, 2, 0.08, 0.002, 0.05)],
  'land-water': [t('sine', 900, 0.09, 0.004, 0.09, 1500)],
  'land-weed': [n(4200, 1, 0.04, 0.004, 0.08)],
  'land-engine': [t('triangle', 880, 0.09, 0.004, 0.08, 1250)],
  'land-line': [t('sine', 1760, 0.07, 0.002, 0.14)],
  // An empty wagon is a hollow wooden tub, and a stop's lamp is glass.
  'land-wagon': [t('triangle', 220, 0.1, 0.003, 0.09, 165), n(900, 3, 0.04, 0.002, 0.04)],
  'land-lamp': [t('sine', 2093, 0.07, 0.002, 0.16), t('sine', 3136, 0.025, 0.002, 0.1)],
  // Chalk coming out under the finger.
  scrape: [n(2100, 1.2, 0.045, 0.006, 0.09)],
  sleeper: [n(1300, 5, 0.035, 0.002, 0.03)],
  // The engine's own sounds.
  toot: [t('square', 523, 0.05, 0.01, 0.14), t('square', 659, 0.05, 0.01, 0.14)],
  chuff: [n(320, 0.8, 0.06, 0.006, 0.09)],
  clack: [n(1500, 6, 0.07, 0.002, 0.04), t('sine', 180, 0.06, 0.002, 0.05)],
  bump: [t('sine', 110, 0.1, 0.003, 0.09, 80), n(600, 1.5, 0.03, 0.002, 0.05)],
  // The engine's grumble at a bump on bare tar: low and short, and it sinks.
  grumble: [t('sawtooth', 98, 0.045, 0.02, 0.2, 78)],
  brake: [n(3000, 12, 0.05, 0.01, 0.22, 1900)],
  puff: [n(520, 0.7, 0.03, 0.02, 0.16)],
  // Bare tar.
  'tick-then-hoot': [t('triangle', 392, 0.09, 0.02, 0.22, 330)],
  'long-whistle': [t('sine', 1320, 0.07, 0.04, 0.6), t('sine', 1570, 0.05, 0.04, 0.6)],
  // Running away downhill: a whistle that rises.
  'rising-whistle': [t('sine', 880, 0.07, 0.03, 0.5, 1900), t('sine', 1100, 0.04, 0.03, 0.5, 2380)],
  'hiccup-toots': [t('square', 587, 0.05, 0.004, 0.05, 740)],
  'swoop-whistle': [t('sine', 900, 0.08, 0.03, 0.35, 2000), t('sine', 2000, 0.08, 0.02, 0.35, 850, 0.36)],
  'engine-sneeze': [n(900, 0.8, 0.04, 0.12, 0.05, 1400), n(2400, 0.7, 0.13, 0.004, 0.2, 700, 0.18)],
  // The engine.
  poot: [t('triangle', 196, 0.11, 0.008, 0.12, 150)],
  screech: [n(3600, 14, 0.07, 0.01, 0.35, 2300), t('sawtooth', 1900, 0.02, 0.01, 0.3, 1300)],
  'wheezy-steam-giggle': [n(1900, 3, 0.05, 0.01, 0.06), n(2300, 3, 0.05, 0.01, 0.06, undefined, 0.11), n(1700, 3, 0.05, 0.01, 0.06, undefined, 0.22), n(2500, 3, 0.05, 0.01, 0.07, undefined, 0.33)],
  'kettle-whistle': [t('sine', 2100, 0.07, 0.25, 0.5, 2900), n(2500, 9, 0.03, 0.2, 0.5, 3100)],
  'cough-puff': [n(450, 1, 0.12, 0.004, 0.09), n(380, 1, 0.08, 0.004, 0.12, undefined, 0.16)],
  // The puddle.
  plop: [t('sine', 320, 0.12, 0.004, 0.11, 760)],
  hiss: [n(3800, 0.7, 0.07, 0.03, 0.45, 2200)],
  'plip-plip': [t('sine', 1200, 0.08, 0.003, 0.06, 1750)],
  'echo-whistle': [t('sine', 1180, 0.07, 0.03, 0.3), t('sine', 1180, 0.03, 0.03, 0.3, undefined, 0.32), t('sine', 1180, 0.014, 0.03, 0.3, undefined, 0.64)],
  glug: [t('sine', 210, 0.11, 0.01, 0.1, 420), t('sine', 180, 0.1, 0.01, 0.1, 380, 0.16), t('sine', 160, 0.09, 0.01, 0.12, 330, 0.32)],
  // The dandelion.
  'soft-puff': [n(1400, 0.6, 0.05, 0.03, 0.2, 900)],
  twang: [t('triangle', 196, 0.11, 0.003, 0.3, 262)],
  'tick-tock-twangs': [t('triangle', 294, 0.09, 0.003, 0.12, 330)],
  'petal-rustle': [n(2600, 0.9, 0.035, 0.12, 0.4, 4600)],
  'muffled-toot': [t('square', 330, 0.035, 0.03, 0.2), n(700, 1, 0.04, 0.02, 0.2)],
  // A chalk line already there.
  bell: [t('sine', 1568, 0.09, 0.002, 0.5), t('sine', 3136, 0.03, 0.002, 0.3)],
  'double-clack': [n(1500, 6, 0.08, 0.002, 0.04), n(1300, 6, 0.08, 0.002, 0.04, undefined, 0.09), t('sine', 160, 0.07, 0.002, 0.05)],
  drumroll: [n(260, 3, 0.07, 0.002, 0.03), n(260, 3, 0.07, 0.002, 0.03, undefined, 0.05), n(260, 3, 0.07, 0.002, 0.03, undefined, 0.1), n(260, 3, 0.08, 0.002, 0.04, undefined, 0.15)],
  'whip-zip': [n(1200, 4, 0.06, 0.05, 0.12, 4600), n(4200, 2, 0.11, 0.002, 0.04, undefined, 0.17)],
  // A knot: the creak while the train squeezes through, and the cork as it pops out.
  'creak-cork': [t('sawtooth', 140, 0.05, 0.1, 0.3, 210)],
  cork: [t('sine', 520, 0.13, 0.003, 0.07, 240)],
  // The wagons rattling over a bump on bare tar.
  rattle: [n(1500, 6, 0.04, 0.002, 0.03), n(1750, 6, 0.04, 0.002, 0.03, undefined, 0.06), n(1400, 6, 0.035, 0.002, 0.03, undefined, 0.13)],
  // The train and a rider: a coupling closing, a rider landing in a wagon, a stub of chalk crumbling.
  'coupling-clunk': [t('sine', 140, 0.11, 0.003, 0.07, 95), n(900, 4, 0.05, 0.002, 0.04, undefined, 0.02)],
  thump: [t('sine', 90, 0.12, 0.004, 0.1, 62)],
  crumble: [n(1700, 1.5, 0.05, 0.004, 0.05), n(1300, 1.5, 0.04, 0.004, 0.05, undefined, 0.07), n(1000, 1.5, 0.03, 0.004, 0.06, undefined, 0.15)],
  // The frog: a croak that drops, a happy double croak, a flat grumble, a low hum, a croaked sneeze.
  'frog-call': [t('sawtooth', 190, 0.06, 0.01, 0.16, 120)],
  'frog-squeak': [t('sawtooth', 240, 0.055, 0.008, 0.08, 330), t('sawtooth', 280, 0.055, 0.008, 0.1, 380, 0.13)],
  'frog-grumble': [t('sawtooth', 130, 0.06, 0.03, 0.3, 105)],
  'frog-hum': [t('triangle', 150, 0.07, 0.08, 0.5, 170)],
  'frog-sneeze': [n(800, 1, 0.04, 0.1, 0.04, 1200), t('sawtooth', 210, 0.07, 0.004, 0.14, 110, 0.15)],
  // The chick: a peep, a rising trill, a falling cheep, a thin hum, a tiny sneeze.
  'chick-call': [t('sine', 2300, 0.07, 0.006, 0.08, 2900)],
  'chick-squeak': [t('sine', 2500, 0.06, 0.005, 0.05, 3100), t('sine', 2800, 0.06, 0.005, 0.05, 3400, 0.08), t('sine', 3100, 0.06, 0.005, 0.07, 3700, 0.16)],
  'chick-grumble': [t('sine', 2600, 0.06, 0.006, 0.18, 1700)],
  'chick-hum': [t('sine', 1900, 0.045, 0.06, 0.4, 2100)],
  'chick-sneeze': [n(3800, 2, 0.05, 0.05, 0.03), t('sine', 3000, 0.07, 0.003, 0.06, 2200, 0.09)],
  // The snail: a slow rising oo, a soft double coo, a long sinking sigh, a wavering hum, a wet little sneeze.
  'snail-call': [t('sine', 330, 0.07, 0.08, 0.3, 420)],
  'snail-squeak': [t('sine', 400, 0.06, 0.05, 0.16, 470), t('sine', 450, 0.06, 0.05, 0.2, 520, 0.26)],
  'snail-grumble': [t('sine', 360, 0.06, 0.06, 0.55, 230)],
  'snail-hum': [t('sine', 300, 0.06, 0.1, 0.6, 340), t('sine', 303, 0.03, 0.1, 0.6, 345)],
  'snail-sneeze': [n(1500, 1.2, 0.04, 0.12, 0.05), t('sine', 520, 0.07, 0.006, 0.12, 300, 0.18)],
  // The cat: a chirp that turns up, a short trill, a hiss, a purr, a spat sneeze.
  'cat-call': [t('triangle', 620, 0.07, 0.02, 0.16, 900)],
  'cat-squeak': [t('triangle', 700, 0.06, 0.01, 0.07, 950), t('triangle', 760, 0.06, 0.01, 0.09, 1050, 0.1)],
  'cat-grumble': [n(4200, 1.4, 0.08, 0.02, 0.3, 3000)],
  'cat-hum': [t('sawtooth', 70, 0.05, 0.05, 0.5), n(160, 3, 0.04, 0.05, 0.5)],
  'cat-sneeze': [n(3000, 1.6, 0.07, 0.03, 0.05), t('triangle', 800, 0.05, 0.004, 0.06, 500, 0.08)],
  // What each rider does at home: a dive, a settling in straw, a munch, a turn and a purr.
  'home-frog': [t('sine', 260, 0.12, 0.004, 0.12, 620), n(2400, 0.8, 0.05, 0.02, 0.25, 1200, 0.06)],
  'home-chick': [n(3000, 1, 0.04, 0.03, 0.12), n(2600, 1, 0.04, 0.03, 0.12, undefined, 0.18), t('sine', 2200, 0.04, 0.02, 0.2, 1800, 0.4)],
  'home-snail': [n(700, 3, 0.07, 0.004, 0.05), n(650, 3, 0.07, 0.004, 0.05, undefined, 0.22), n(720, 3, 0.07, 0.004, 0.05, undefined, 0.44)],
  'home-cat': [t('sawtooth', 62, 0.06, 0.1, 0.7), n(140, 3, 0.05, 0.1, 0.7)],
  // A home answering a touch.
  blip: [t('sine', 700, 0.08, 0.004, 0.07, 1100)],
  'straw-rustle': [n(3400, 1.1, 0.045, 0.01, 0.1), n(2900, 1.1, 0.035, 0.01, 0.09, undefined, 0.09)],
  flap: [n(500, 1, 0.07, 0.006, 0.07, 300)],
  sigh: [n(1100, 0.6, 0.04, 0.08, 0.35, 600)],
} as const satisfies Record<string, readonly Note[]>

export type VoiceKey = keyof typeof VOICES
export const isVoice = (key: string): key is VoiceKey => key in VOICES

/** A rider's own voices: its call, its squeak of delight, its grumble, its hum and its sneeze. */
export type OwnVoice = 'call' | 'squeak' | 'grumble' | 'hum' | 'sneeze'
export const ownVoice = (kind: 'frog' | 'chick' | 'snail' | 'cat', which: OwnVoice): VoiceKey => `${kind}-${which}`
/** The sounds the grid gives a rider's cells, which each rider makes in its own voice. */
export const OWN_SOUNDS: Record<string, OwnVoice> = { 'own-call': 'call', 'own-squeak': 'squeak', 'own-hum': 'hum', 'own-sneeze': 'sneeze' }

/** How long a voice lasts, in seconds. */
export const lengthOf = (key: VoiceKey): number => Math.max(...VOICES[key].map((note) => note.at + note.attack + note.decay))

/**
 * When the sound of a grid cell is heard. A mark that gives no ride is heard
 * the moment it is made; one that gives a ride is heard where the ride shows
 * it: as the engine sets off, at each happening of one kind, or as it arrives.
 */
export const CUES: Partial<Record<VoiceKey, 'made' | Fired['what']>> = {
  'tick-then-hoot': 'arrived',
  'long-whistle': 'fast',
  'hiccup-toots': 'corner',
  'swoop-whistle': 'loop',
  'engine-sneeze': 'arrived',
  poot: 'made',
  screech: 'set-off',
  'wheezy-steam-giggle': 'made',
  'kettle-whistle': 'made',
  'cough-puff': 'made',
  plop: 'made',
  hiss: 'splash',
  'plip-plip': 'splash',
  'echo-whistle': 'roundabout',
  glug: 'made',
  'soft-puff': 'made',
  twang: 'twang',
  'tick-tock-twangs': 'twang',
  'petal-rustle': 'made',
  'muffled-toot': 'arrived',
  bell: 'arrived',
  'double-clack': 'clack',
  drumroll: 'clack',
  'whip-zip': 'loop',
  'creak-cork': 'scribble',
  // Heard as the train is told of the rider it has come to, not at a happening of the line.
  'coupling-clunk': 'told',
}
