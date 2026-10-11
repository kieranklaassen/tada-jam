import type { Note } from './audio'

// Every sound of the game as plain numbers, since nobody has heard it yet:
// a test holds each pitch, peak and length in range. A sound is one moment:
// no note waits inside a voice. Whatever is heard later than the touch (the
// honk after the twang, the bark after the bounce) is its own sound, asked for
// by the toy in the frame that shows it, so sight and sound run on one clock.
// `level` is 0 to 1: how hard, how fast or how far, by the sound.

export type SoundName =
  | 'grip' | 'creak' | 'twang' | 'ease' | 'honk' | 'squawk' | 'muffled'
  | 'thunk' | 'flop' | 'scrape' | 'boing' | 'bark' | 'deepBoing' | 'snort' | 'whump' | 'splash'
  | 'rush' | 'gargle' | 'hush' | 'sneeze'
  | 'knock' | 'slap' | 'pat' | 'bomp' | 'tink' | 'wicker'
  | 'pop' | 'shake' | 'slide' | 'swim' | 'hop' | 'sag' | 'pencil'
  | 'peep' | 'harrumph' | 'krr' | 'moan' | 'puff' | 'rumble' | 'swish' | 'rattle' | 'breath' | 'dot' | 'rub'
  // The kit.
  | 'pick' | 'bolt' | 'unbolt' | 'clank'
  // The rocket.
  | 'whoosh' | 'roar' | 'putt' | 'sputter' | 'sizzle' | 'hiss' | 'cough' | 'whistle' | 'fizzle' | 'pok'
  // The glider wings.
  | 'squeak' | 'flap' | 'canvas' | 'kite' | 'flutter' | 'squelch'
  // The umbrella.
  | 'fwip' | 'tap' | 'fwop' | 'rubber' | 'slither' | 'drum' | 'patter'
  // The balloon.
  | 'tiptoe' | 'hollow' | 'plop' | 'whirr' | 'wetsqueak'
  // The spring feet.
  | 'sproing' | 'deeptwang' | 'oof' | 'crunch' | 'mspring' | 'gurgle' | 'squirt' | 'jangle'
  // The fish on a rod.
  | 'wetslap' | 'snap' | 'burp' | 'clink' | 'flapslap' | 'gullcry' | 'plip'
  // The friends and the fish.
  | 'take' | 'gulp' | 'slip' | 'lick' | 'stuck' | 'munch' | 'wring' | 'groan' | 'dab' | 'mm' | 'slurp' | 'rap' | 'hammer' | 'clack' | 'plateflip' | 'lens' | 'clap'

export type Sound = { name: SoundName; level: number }

const tone = (frequency: number, glideTo: number | undefined, wave: OscillatorType, peak: number, attack: number, decay: number): Note => ({ kind: 'tone', frequency, glideTo, wave, peak, attack, decay })
const noise = (frequency: number, glideTo: number | undefined, q: number, peak: number, attack: number, decay: number): Note => ({ kind: 'noise', frequency, glideTo, q, peak, attack, decay })

/** Each sound's notes, for a level from 0 to 1. */
export const VOICES: Record<SoundName, (level: number) => Note[]> = {
  // The catapult.
  grip: () => [noise(900, 700, 6, 0.1, 0.005, 0.08), tone(190, 150, 'triangle', 0.08, 0.004, 0.09)],
  creak: (l) => [tone(210 + 520 * l, 190 + 480 * l, 'triangle', 0.07 + 0.04 * l, 0.003, 0.045), noise(1400 + 2600 * l, undefined, 9, 0.05, 0.002, 0.03)],
  twang: (l) => [tone(130 + 250 * l, 70 + 110 * l, 'triangle', 0.16 + 0.1 * l, 0.004, 0.34), tone(260 + 500 * l, 150 + 240 * l, 'sine', 0.08, 0.003, 0.16), noise(3200, 1200, 0.8, 0.07 + 0.08 * l, 0.002, 0.06)],
  ease: () => [tone(170, 120, 'triangle', 0.06, 0.02, 0.16), noise(600, 420, 5, 0.04, 0.02, 0.12)],
  // The pilot.
  honk: (l) => [tone(400 + 90 * l, 290 + 60 * l, 'sawtooth', 0.11, 0.012, 0.17), tone(610 + 130 * l, 440 + 90 * l, 'square', 0.04, 0.012, 0.14)],
  squawk: (l) => [tone(360 + 60 * l, 540 + 90 * l, 'sawtooth', 0.1, 0.008, 0.09), tone(730, 1050, 'square', 0.03, 0.008, 0.07)],
  muffled: (l) => [tone(215 + 30 * l, 160, 'sine', 0.13, 0.03, 0.22), noise(320, 240, 2, 0.06, 0.03, 0.2)],
  // Coming down.
  thunk: (l) => [tone(150, 68, 'sine', 0.18 + 0.1 * l, 0.003, 0.13), noise(2600, 1400, 3, 0.1, 0.002, 0.035), tone(1900, 1500, 'triangle', 0.04, 0.002, 0.05)],
  flop: (l) => [tone(120, 80, 'sine', 0.14 + 0.08 * l, 0.004, 0.1), noise(500, 300, 0.8, 0.08, 0.004, 0.09)],
  scrape: (l) => [noise(1500 + 900 * l, 650, 1.2, 0.07 + 0.09 * l, 0.02, 0.3 + 0.35 * l)],
  boing: (l) => [tone(150 + 60 * l, 400 + 160 * l, 'sine', 0.2, 0.01, 0.26), tone(75 + 30 * l, 200 + 80 * l, 'triangle', 0.1, 0.01, 0.2)],
  bark: (l) => [tone(320 + 40 * l, 245, 'sawtooth', 0.12, 0.008, 0.11), noise(950, 700, 2, 0.07, 0.006, 0.09)],
  deepBoing: (l) => [tone(105 + 40 * l, 270 + 90 * l, 'sine', 0.2, 0.012, 0.3), tone(52 + 20 * l, 135 + 45 * l, 'triangle', 0.1, 0.012, 0.24)],
  snort: () => [noise(230, 170, 4, 0.14, 0.02, 0.2), tone(85, 70, 'sawtooth', 0.05, 0.02, 0.16)],
  whump: (l) => [noise(190, 110, 0.8, 0.18 + 0.1 * l, 0.01, 0.28), tone(92, 50, 'sine', 0.16, 0.008, 0.2)],
  splash: (l) => [noise(1300, 380, 0.7, 0.16 + 0.1 * l, 0.01, 0.42), noise(4200, 2600, 1, 0.08, 0.004, 0.14), tone(180, 90, 'sine', 0.08, 0.006, 0.12)],
  // The whale's water, and the cloud.
  rush: () => [noise(650, 2500, 1.2, 0.2, 0.07, 0.5)],
  gargle: () => [tone(185, 265, 'square', 0.05, 0.03, 0.3), noise(520, 760, 6, 0.08, 0.03, 0.28)],
  hush: () => [noise(3000, 2200, 0.6, 0.07, 0.06, 0.3)],
  sneeze: () => [noise(2400, 5200, 1, 0.13, 0.09, 0.06), tone(520, 940, 'sawtooth', 0.05, 0.08, 0.05)],
  // The solid things.
  knock: (l) => [tone(195, 150, 'sine', 0.16 + 0.06 * l, 0.003, 0.1), tone(390, 300, 'triangle', 0.06, 0.003, 0.07)],
  slap: (l) => [noise(620, 380, 1, 0.14 + 0.08 * l, 0.003, 0.1), tone(112, 84, 'sine', 0.1, 0.004, 0.12)],
  pat: (l) => [noise(300, 210, 0.7, 0.12 + 0.06 * l, 0.006, 0.12)],
  bomp: (l) => [tone(122, 94, 'sine', 0.2 + 0.06 * l, 0.006, 0.22), tone(244, 188, 'triangle', 0.07, 0.006, 0.14)],
  tink: (l) => [tone(1900 + 300 * l, undefined, 'sine', 0.09, 0.002, 0.26), tone(2850 + 450 * l, undefined, 'sine', 0.04, 0.002, 0.16)],
  wicker: () => [noise(820, 640, 9, 0.12, 0.008, 0.1), tone(300, 250, 'triangle', 0.05, 0.006, 0.08)],
  // The way back.
  pop: () => [tone(300, 920, 'sine', 0.16, 0.004, 0.06), noise(2100, undefined, 2, 0.08, 0.002, 0.03)],
  shake: () => [noise(2500, 3100, 1, 0.08, 0.02, 0.14)],
  slide: (l) => [noise(1300, 2300, 1.5, 0.09, 0.08, 0.3 + 0.3 * l)],
  swim: () => [noise(620, 300, 1, 0.1, 0.04, 0.3), tone(240, 170, 'sine', 0.04, 0.03, 0.2)],
  hop: () => [tone(300, 640, 'sine', 0.12, 0.006, 0.12)],
  sag: () => [tone(142, 108, 'triangle', 0.1, 0.01, 0.16), noise(700, 520, 7, 0.07, 0.008, 0.12)],
  pencil: (l) => [tone(900 + 700 * l, 760 + 600 * l, 'triangle', 0.09, 0.002, 0.05), noise(3600, undefined, 4, 0.05, 0.002, 0.03)],
  // What a press on each thing gives.
  peep: (l) => [tone(1900 + 300 * l, 2550 + 300 * l, 'sine', 0.1, 0.006, 0.07)],
  harrumph: () => [tone(96, 68, 'sawtooth', 0.12, 0.03, 0.3), noise(210, 150, 1, 0.1, 0.03, 0.26)],
  krr: () => [tone(620, 540, 'square', 0.06, 0.006, 0.1), noise(1800, undefined, 12, 0.08, 0.004, 0.09)],
  moan: () => [tone(68, 112, 'sine', 0.22, 0.12, 0.5), tone(136, 224, 'sine', 0.06, 0.12, 0.4)],
  puff: () => [noise(900, 1500, 0.8, 0.1, 0.03, 0.2)],
  rumble: () => [tone(64, 52, 'sine', 0.2, 0.06, 0.5), noise(130, 95, 2, 0.08, 0.06, 0.4)],
  swish: () => [noise(500, 1400, 1.2, 0.12, 0.03, 0.26), tone(160, 110, 'sine', 0.05, 0.02, 0.2)],
  rattle: () => [noise(1200, 900, 3, 0.1, 0.004, 0.12), tone(240, 200, 'triangle', 0.07, 0.004, 0.08), tone(430, 760, 'sine', 0.05, 0.004, 0.1)],
  breath: () => [noise(2100, 1500, 0.5, 0.06, 0.08, 0.34)],
  dot: () => [tone(1400, 1100, 'triangle', 0.06, 0.002, 0.025), noise(5200, undefined, 3, 0.04, 0.001, 0.02)],
  rub: () => [noise(950, 800, 2, 0.06, 0.03, 0.12)],
  // The kit: a part lifted out, the ratchet that bolts it on, the catch let go, and a part dropped back in.
  pick: () => [tone(520, 700, 'triangle', 0.08, 0.004, 0.06), noise(1900, undefined, 4, 0.04, 0.003, 0.04)],
  bolt: () => [tone(980, 1240, 'square', 0.05, 0.002, 0.05), noise(3000, 3600, 8, 0.09, 0.002, 0.09), tone(310, 290, 'triangle', 0.08, 0.003, 0.07)],
  unbolt: () => [tone(1240, 900, 'square', 0.04, 0.002, 0.04), noise(2600, 2000, 8, 0.07, 0.002, 0.06)],
  clank: () => [tone(410, 380, 'square', 0.09, 0.002, 0.14), tone(1130, 1090, 'triangle', 0.07, 0.002, 0.2), noise(1700, 1200, 3, 0.1, 0.002, 0.08)],
  // The rocket.
  whoosh: () => [noise(500, 2400, 0.9, 0.2, 0.05, 0.3), tone(90, 150, 'sawtooth', 0.07, 0.04, 0.26)],
  roar: (l) => [noise(700 + 500 * l, 900 + 500 * l, 0.7, 0.13, 0.04, 0.22), tone(74, 82, 'sawtooth', 0.05, 0.04, 0.2)],
  clap: (l) => [noise(1500, 1100, 1.1, 0.1 + 0.05 * l, 0.003, 0.07), tone(330, 260, 'triangle', 0.05, 0.003, 0.05)],
  putt: () => [noise(700, 480, 2, 0.09, 0.005, 0.06), tone(180, 130, 'triangle', 0.05, 0.004, 0.05)],
  sputter: () => [noise(900, 300, 1.4, 0.12, 0.01, 0.2), tone(110, 60, 'sawtooth', 0.06, 0.01, 0.18)],
  sizzle: () => [noise(5200, 4200, 1.6, 0.11, 0.02, 0.26)],
  hiss: () => [noise(5400, 4700, 2.4, 0.14, 0.004, 0.07)],
  cough: () => [noise(700, 420, 1.6, 0.14, 0.01, 0.1), tone(260, 170, 'sawtooth', 0.07, 0.01, 0.09)],
  whistle: () => [tone(1500, 2900, 'sine', 0.11, 0.1, 0.5), noise(4300, 5300, 6, 0.05, 0.1, 0.4)],
  fizzle: () => [noise(3800, 900, 1.2, 0.15, 0.006, 0.34), tone(420, 160, 'triangle', 0.05, 0.006, 0.2)],
  pok: () => [tone(250, 520, 'sine', 0.13, 0.006, 0.07), noise(900, undefined, 1, 0.05, 0.004, 0.05)],
  // The glider wings.
  squeak: (l) => [tone(2300 + 500 * l, 2700 + 500 * l, 'sine', 0.07, 0.01, 0.08)],
  flap: () => [noise(420, 260, 0.6, 0.17, 0.01, 0.16), noise(1500, 700, 1, 0.07, 0.01, 0.1)],
  canvas: () => [tone(118, 100, 'sawtooth', 0.07, 0.04, 0.3), noise(380, 300, 7, 0.09, 0.04, 0.28)],
  kite: () => [noise(800, 2200, 2.2, 0.12, 0.1, 0.5), tone(330, 620, 'triangle', 0.05, 0.1, 0.44)],
  flutter: () => [noise(1100, 1000, 5, 0.1, 0.01, 0.05), noise(1250, 1150, 5, 0.08, 0.06, 0.05)],
  squelch: () => [noise(340, 620, 3, 0.15, 0.03, 0.16), tone(150, 230, 'sine', 0.07, 0.03, 0.14)],
  // The umbrella.
  fwip: () => [noise(1500, 3100, 1.4, 0.09, 0.01, 0.08)],
  tap: (l) => [tone(640 + 120 * l, 520, 'triangle', 0.1, 0.002, 0.04), noise(2300, undefined, 2, 0.05, 0.002, 0.03)],
  fwop: () => [noise(300, 1300, 0.7, 0.2, 0.008, 0.14), tone(170, 330, 'triangle', 0.09, 0.008, 0.1)],
  rubber: () => [tone(780, 880, 'sawtooth', 0.06, 0.05, 0.5), tone(1560, 1760, 'sine', 0.04, 0.05, 0.45)],
  slither: () => [noise(2600, 1300, 0.8, 0.07, 0.08, 0.5)],
  drum: (l) => [tone(150 + 50 * l, 120, 'sine', 0.11, 0.002, 0.06), noise(800, undefined, 1.4, 0.06, 0.002, 0.04)],
  patter: (l) => [noise(3400 + 1400 * l, undefined, 3, 0.06, 0.002, 0.03), tone(900 + 300 * l, undefined, 'triangle', 0.03, 0.002, 0.03)],
  // The balloon.
  tiptoe: (l) => [tone(1150 + 500 * l, 1500 + 500 * l, 'triangle', 0.07, 0.008, 0.07)],
  hollow: (l) => [tone(92, 70, 'sine', 0.22 + 0.06 * l, 0.008, 0.3), noise(260, 200, 4, 0.06, 0.008, 0.2)],
  plop: () => [tone(540, 170, 'sine', 0.15, 0.004, 0.11), noise(700, undefined, 1, 0.05, 0.004, 0.05)],
  whirr: () => [tone(210, 660, 'sawtooth', 0.06, 0.08, 0.5), noise(1600, 3000, 9, 0.06, 0.08, 0.44)],
  wetsqueak: () => [tone(980, 700, 'sawtooth', 0.06, 0.03, 0.22), noise(1300, 900, 6, 0.06, 0.03, 0.2)],
  // The spring feet.
  sproing: (l) => [tone(170 + 330 * l, 300 + 560 * l, 'triangle', 0.14, 0.004, 0.2), tone(340 + 660 * l, 600 + 1100 * l, 'sine', 0.05, 0.004, 0.14)],
  deeptwang: () => [tone(66, 150, 'triangle', 0.24, 0.006, 0.5), tone(132, 300, 'sine', 0.08, 0.006, 0.4), tone(99, 225, 'triangle', 0.06, 0.02, 0.44)],
  oof: () => [tone(190, 120, 'sawtooth', 0.11, 0.02, 0.16), noise(420, 300, 1.4, 0.07, 0.02, 0.14)],
  crunch: () => [noise(1700, 800, 0.9, 0.17, 0.004, 0.11), noise(520, 380, 1.2, 0.1, 0.004, 0.09)],
  mspring: () => [tone(120, 210, 'sine', 0.13, 0.02, 0.2), noise(300, 260, 2, 0.05, 0.02, 0.16)],
  gurgle: () => [tone(280, 190, 'sine', 0.09, 0.03, 0.12), tone(360, 250, 'sine', 0.07, 0.1, 0.12), noise(460, 620, 8, 0.06, 0.03, 0.26)],
  squirt: () => [noise(2100, 4600, 2, 0.12, 0.006, 0.14), tone(700, 1500, 'sine', 0.05, 0.006, 0.1)],
  jangle: (l) => [tone(1320 + 700 * l, undefined, 'triangle', 0.05, 0.002, 0.07), tone(1980 + 900 * l, undefined, 'sine', 0.035, 0.002, 0.09)],
  // The fish on a rod.
  wetslap: () => [noise(1150, 520, 1, 0.18, 0.003, 0.08), tone(230, 150, 'sine', 0.07, 0.003, 0.07)],
  snap: () => [noise(2500, 1500, 2, 0.14, 0.002, 0.04), tone(350, 210, 'square', 0.06, 0.002, 0.05)],
  burp: () => [tone(104, 150, 'sawtooth', 0.14, 0.02, 0.22), noise(240, 320, 3, 0.07, 0.02, 0.18)],
  clink: () => [tone(2500, undefined, 'sine', 0.1, 0.002, 0.18), tone(3740, undefined, 'sine', 0.05, 0.002, 0.12), noise(5200, undefined, 6, 0.04, 0.001, 0.02)],
  flapslap: (l) => [noise(950 + 500 * l, 600, 1.4, 0.1, 0.003, 0.05)],
  gullcry: () => [tone(900, 560, 'sawtooth', 0.09, 0.02, 0.26), tone(1350, 840, 'square', 0.03, 0.02, 0.22)],
  plip: () => [tone(880, 1320, 'sine', 0.08, 0.004, 0.06)],
  // The friends and the fish.
  take: () => [noise(1300, 900, 3, 0.07, 0.004, 0.05), tone(460, 610, 'triangle', 0.06, 0.004, 0.06)],
  gulp: () => [tone(250, 130, 'sine', 0.15, 0.01, 0.1), tone(140, 210, 'sine', 0.08, 0.08, 0.08)],
  slip: (l) => [tone(820 + 240 * l, 1500 + 300 * l, 'sine', 0.07, 0.006, 0.08)],
  lick: () => [noise(900, 1500, 3, 0.07, 0.02, 0.1)],
  stuck: () => [tone(300, 280, 'sawtooth', 0.07, 0.03, 0.2), noise(500, 460, 5, 0.05, 0.03, 0.18)],
  munch: (l) => [noise(1500 + 400 * l, 700, 1, 0.14, 0.004, 0.07), tone(2100, undefined, 'sine', 0.04, 0.002, 0.05)],
  wring: () => [noise(600, 1700, 4, 0.1, 0.06, 0.32), tone(180, 260, 'triangle', 0.04, 0.06, 0.28)],
  groan: () => [tone(118, 84, 'sawtooth', 0.11, 0.06, 0.34)],
  dab: () => [noise(700, 560, 0.9, 0.06, 0.01, 0.06)],
  mm: () => [tone(128, 124, 'triangle', 0.08, 0.05, 0.26)],
  slurp: () => [noise(700, 2600, 5, 0.12, 0.04, 0.34), tone(300, 760, 'sine', 0.06, 0.04, 0.3)],
  rap: () => [tone(700, 640, 'triangle', 0.1, 0.002, 0.04), noise(1500, undefined, 5, 0.06, 0.002, 0.03)],
  hammer: (l) => [tone(1700 + 380 * l, undefined, 'sine', 0.09, 0.002, 0.16), noise(2900, undefined, 4, 0.05, 0.002, 0.03)],
  clack: () => [tone(1000, 840, 'square', 0.06, 0.002, 0.03), noise(2200, undefined, 6, 0.06, 0.002, 0.03)],
  plateflip: () => [tone(1250, 1050, 'triangle', 0.07, 0.002, 0.09), noise(3300, undefined, 7, 0.05, 0.002, 0.05)],
  lens: () => [tone(1500, 1900, 'square', 0.04, 0.002, 0.03), noise(4200, undefined, 9, 0.05, 0.002, 0.03)],
}

/** The notes of everything asked for in one moment, as one list: one touch is one voice (audio.ts). */
export function notesOf(sounds: readonly Sound[]): Note[] {
  const notes: Note[] = []
  for (const sound of sounds) notes.push(...VOICES[sound.name](Math.min(1, Math.max(0, sound.level))))
  return notes
}
