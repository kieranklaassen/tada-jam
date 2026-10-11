import type { Note } from './audio'
import type { ThingId, WashId } from './room'

// Every sound of the game as plain numbers. Nobody has heard them on the machine they were written on, so each
// is written from the design sheet's words, kept short and quiet, and held in range by the test beside this file.
// `v` picks one of a few variants, so the same touch does not sound the same twice running, `speed` is how fast
// the finger moves, from 0 to 1, and `step` climbs with each stroke of a thing that rises in pitch.

type Varied =
  // Teddy and the room.
  | 'giggle' | 'shudder' | 'pop' | 'puff' | 'thud' | 'squeak' | 'purr' | 'chirp' | 'drip' | 'shuffle'
  // The duck.
  | 'duckRub' | 'patter' | 'paddle' | 'lap'
  // The cat.
  | 'crackleFur' | 'step'
  // The lamp and the bath.
  | 'glassSqueak' | 'glassRub' | 'plip' | 'plink' | 'puddle'
type Plain =
  | 'sneeze' | 'shake' | 'thump' | 'lampDown' | 'lampUp' | 'mew' | 'flump' | 'grunt' | 'whump' | 'sigh' | 'chatter' | 'flutter'
  | 'blurp' | 'squirt' | 'plop' | 'muffSqueak' | 'tinySqueak' | 'snore' | 'bloop' | 'boom' | 'blub'
  | 'fizz' | 'chirrup' | 'spit' | 'splat' | 'hiss' | 'yowl' | 'rattle' | 'warble' | 'muffMew' | 'bump'
  | 'tinkle' | 'sizzle' | 'waver' | 'ting' | 'glassHum' | 'warmHum'
  | 'glop' | 'crackle' | 'slosh' | 'slurp' | 'splosh'
  | 'swishOpen' | 'swishShut' | 'nightlight' | 'flop' | 'stretch' | 'door' | 'sitBump'
type Stepped = 'hum' | 'polish' | 'fill'

export type Sound =
  | { id: 'grab' | 'home'; thing: ThingId }
  | { id: 'stroke'; thing: WashId; speed: number; v: number }
  | { id: Varied; v: number }
  | { id: Stepped; step: number }
  | { id: 'yawn'; size: 1 | 2 | 3 }
  | { id: Plain }

const VARIED: readonly Varied[] = ['giggle', 'shudder', 'pop', 'puff', 'thud', 'squeak', 'purr', 'chirp', 'drip', 'shuffle', 'duckRub', 'patter', 'paddle', 'lap', 'crackleFur', 'step', 'glassSqueak', 'glassRub', 'plip', 'plink', 'puddle']
const PLAIN: readonly Plain[] = ['sneeze', 'shake', 'thump', 'lampDown', 'lampUp', 'mew', 'flump', 'grunt', 'whump', 'sigh', 'chatter', 'flutter', 'blurp', 'squirt', 'plop', 'muffSqueak', 'tinySqueak', 'snore', 'bloop', 'boom', 'blub', 'fizz', 'chirrup', 'spit', 'splat', 'hiss', 'yowl', 'rattle', 'warble', 'muffMew', 'bump', 'tinkle', 'sizzle', 'waver', 'ting', 'glassHum', 'warmHum', 'glop', 'crackle', 'slosh', 'slurp', 'splosh', 'swishOpen', 'swishShut', 'nightlight', 'flop', 'stretch', 'door', 'sitBump']
const STEPPED: readonly Stepped[] = ['hum', 'polish', 'fill']

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })

/** A pentatonic step above a root, so whatever sounds together sits well. */
const step = (root: number, n: number): number => root * 2 ** ([0, 2, 4, 7, 9][((n % 5) + 5) % 5] / 12 + Math.floor(n / 5))
/** The same note several times in a row. */
const row = (count: number, gap: number, make: (n: number, delay: number) => Note): Note[] => Array.from({ length: count }, (_, n) => make(n, n * gap))

export function notesOf(sound: Sound): Note[] {
  switch (sound.id) {
    // Landing in the hand: a slippery squeak for the soap, a hollow knock for the jug, a soft flap for the cloths.
    case 'grab':
      if (sound.thing === 'soap') return [tone(720, 0.1, 0.01, 0.12, { glideTo: 1180 })]
      if (sound.thing === 'jug') return [tone(196, 0.14, 0.004, 0.16, { wave: 'triangle', glideTo: 170 }), hiss(900, 3, 0.05, 0.004, 0.06)]
      if (sound.thing === 'towel') return [hiss(520, 0.8, 0.1, 0.02, 0.14, { glideTo: 320 })]
      if (sound.thing === 'pyjamas') return [hiss(760, 0.9, 0.08, 0.015, 0.12, { glideTo: 480 }), tone(392, 0.03, 0.01, 0.08)]
      return [hiss(340, 0.7, 0.11, 0.03, 0.18, { glideTo: 220 })]
    case 'home':
      if (sound.thing === 'soap') return [tone(520, 0.07, 0.006, 0.09, { glideTo: 380 })]
      if (sound.thing === 'jug') return [tone(160, 0.12, 0.004, 0.13, { wave: 'triangle' }), tone(320, 0.04, 0.004, 0.08)]
      if (sound.thing === 'towel') return [hiss(300, 0.8, 0.07, 0.02, 0.16)]
      if (sound.thing === 'pyjamas') return [hiss(600, 0.9, 0.06, 0.015, 0.12), tone(330, 0.03, 0.006, 0.06)]
      return [hiss(240, 0.7, 0.08, 0.03, 0.2)]
    // One stroke. Soap squeaks higher the faster it goes; water gurgles and plinks, brighter the faster the jug sweeps; the towel is a dry soft brush.
    case 'stroke': {
      const s = Math.min(1, Math.max(0, sound.speed)), v = sound.v % 4
      if (sound.thing === 'soap') return [tone(step(520, v) * (1 + s * 0.5), 0.07, 0.012, 0.09, { glideTo: step(520, v + 1) * (1 + s * 0.6) }), hiss(2600, 1.2, 0.025, 0.01, 0.07)]
      if (sound.thing === 'jug') return [hiss(700 + v * 90 + s * 520, 1.4, 0.07, 0.03, 0.16, { glideTo: 420 + s * 220 }), tone(step(784, v) * (1 + s * 0.26), 0.035, 0.003, 0.07, { delay: 0.05, glideTo: step(784, v) * (1.3 + s * 0.3) })]
      return [hiss(1500 + s * 900, 0.7, 0.06 + s * 0.03, 0.03, 0.11, { glideTo: 900 })]
    }

    // Teddy's own voice, with no words: a giggle that rises, a shudder that wobbles downward, a hum that climbs.
    case 'giggle': {
      const root = 392 + (sound.v % 3) * 30
      return [0, 1, 2].map((n) => tone(step(root, n + 1), 0.09, 0.012, 0.08, { wave: 'triangle', delay: n * 0.09, glideTo: step(root, n + 2) }))
    }
    case 'shudder': {
      const root = 330 - (sound.v % 3) * 20
      return [0, 1, 2, 3].map((n) => tone(root * (1 - n * 0.07) * (n % 2 ? 1.09 : 1), 0.08, 0.01, 0.07, { wave: 'triangle', delay: n * 0.075 }))
    }
    case 'hum':
      return [tone(step(196, Math.min(9, sound.step)), 0.085, 0.06, 0.26, { wave: 'triangle' }), tone(step(196, Math.min(9, sound.step)) * 2, 0.02, 0.06, 0.2)]
    case 'thump':
      return [tone(92, 0.16, 0.004, 0.12, { glideTo: 64 })]
    // A yawn is longer and falls further the wider it is.
    case 'yawn':
      return [tone(300 + sound.size * 30, 0.06 + sound.size * 0.01, 0.12 + sound.size * 0.04, 0.34 + sound.size * 0.1, { wave: 'triangle', glideTo: 220 - sound.size * 22 })]
    case 'sneeze':
      return [tone(520, 0.07, 0.07, 0.05, { wave: 'triangle', glideTo: 760 }), hiss(2400, 0.8, 0.14, 0.008, 0.2, { delay: 0.13, glideTo: 900 }), tone(300, 0.06, 0.004, 0.1, { delay: 0.13, glideTo: 180 })]
    case 'shake':
      return row(6, 0.075, (n, delay) => hiss(n % 2 ? 1500 : 950, 1, 0.09, 0.012, 0.055, { delay }))
    case 'grunt':
      return [tone(132, 0.1, 0.03, 0.16, { wave: 'triangle', glideTo: 118 }), hiss(300, 0.8, 0.04, 0.02, 0.12), tone(140, 0.08, 0.03, 0.14, { wave: 'triangle', delay: 0.22, glideTo: 176 })]
    case 'sigh':
      return [hiss(900, 0.6, 0.05, 0.12, 0.42, { glideTo: 500 }), tone(262, 0.045, 0.1, 0.4, { wave: 'triangle', glideTo: 196 })]
    case 'chatter':
      return row(7, 0.055, (n, delay) => tone(n % 2 ? 1250 : 1100, 0.045, 0.002, 0.02, { wave: 'square', delay }))
    case 'stretch':
      return [tone(196, 0.07, 0.2, 0.5, { wave: 'triangle', glideTo: 330 }), tone(392, 0.03, 0.2, 0.3, { delay: 0.3, glideTo: 440 })]
    case 'shuffle':
      return [hiss(380 + (sound.v % 3) * 50, 0.7, 0.08, 0.02, 0.12, { glideTo: 260 }), tone(98, 0.07, 0.004, 0.07, { delay: 0.04 })]
    case 'flop':
      return [tone(86, 0.16, 0.004, 0.2, { glideTo: 58 }), hiss(320, 0.6, 0.1, 0.01, 0.26, { glideTo: 180 })]
    case 'sitBump':
      return [tone(104, 0.16, 0.004, 0.14, { glideTo: 70 }), tone(208, 0.04, 0.004, 0.06)]

    // The room's small sounds.
    case 'pop':
      return [tone(step(880, sound.v % 5), 0.06, 0.002, 0.045, { glideTo: step(880, sound.v % 5) * 1.6 })]
    case 'puff':
      return [hiss(1900, 0.6, 0.045, 0.02, 0.12, { glideTo: 3200 }), tone(step(660, sound.v % 5), 0.03, 0.01, 0.1)]
    case 'thud':
      return [tone(118 + (sound.v % 3) * 14, 0.11, 0.004, 0.09, { glideTo: 84 }), hiss(500, 0.7, 0.03, 0.004, 0.07)]
    case 'drip':
      return [tone(step(1047, sound.v % 3), 0.04, 0.002, 0.07, { glideTo: step(1047, sound.v % 3) * 0.7 })]
    // The cloths: the pyjamas land with a light flump, the blanket with a heavy whump, and either flutters back.
    case 'flump':
      return [hiss(640, 0.7, 0.11, 0.012, 0.16, { glideTo: 380 }), tone(147, 0.06, 0.006, 0.08)]
    case 'whump':
      return [tone(74, 0.17, 0.006, 0.22, { glideTo: 52 }), hiss(260, 0.6, 0.11, 0.02, 0.3, { glideTo: 150 })]
    case 'flutter':
      return row(3, 0.07, (n, delay) => hiss(900 - n * 160, 0.9, 0.06, 0.012, 0.06, { delay }))

    // The duck: two notes for a squeeze, rubbery pairs under the soap, a patter under water, squeaks that climb
    // under the towel.
    case 'squeak': {
      const root = 1040 + (sound.v % 3) * 70
      return [tone(root, 0.09, 0.008, 0.07, { wave: 'square', glideTo: root * 0.8 }), tone(root * 1.34, 0.08, 0.02, 0.11, { wave: 'square', delay: 0.11, glideTo: root * 1.5 })]
    }
    case 'duckRub': {
      const root = 660 + (sound.v % 3) * 50
      return [tone(root, 0.07, 0.02, 0.06, { wave: 'square', glideTo: root * 1.25 }), tone(root * 0.9, 0.07, 0.02, 0.06, { wave: 'square', delay: 0.1, glideTo: root * 1.2 })]
    }
    case 'blurp':
      return [tone(170, 0.11, 0.02, 0.1, { glideTo: 330 }), tone(360, 0.05, 0.004, 0.05, { delay: 0.1, glideTo: 520 })]
    case 'patter':
      return row(3, 0.05, (n, delay) => tone(360 + ((sound.v + n) % 3) * 44, 0.06, 0.002, 0.04, { wave: 'triangle', delay }))
    case 'squirt':
      return [tone(620, 0.08, 0.02, 0.26, { glideTo: 1560 }), hiss(2400, 1.4, 0.05, 0.02, 0.24, { glideTo: 3600 })]
    case 'polish':
      return [tone(step(784, Math.min(8, sound.step)), 0.07, 0.015, 0.08, { wave: 'square', glideTo: step(784, Math.min(8, sound.step) + 1) })]
    case 'plop':
      return [tone(300, 0.12, 0.004, 0.11, { glideTo: 120 }), tone(880, 0.04, 0.003, 0.06, { delay: 0.08, glideTo: 1320 })]
    case 'muffSqueak':
      return [tone(520, 0.05, 0.02, 0.09, { wave: 'triangle', glideTo: 420 }), tone(640, 0.045, 0.02, 0.1, { wave: 'triangle', delay: 0.12, glideTo: 700 })]
    case 'paddle':
      return [hiss(820 + (sound.v % 3) * 80, 1.2, 0.06, 0.01, 0.08, { glideTo: 500 }), hiss(700, 1.2, 0.05, 0.01, 0.08, { delay: 0.14, glideTo: 460 })]
    case 'tinySqueak':
      return [tone(1480, 0.04, 0.01, 0.07, { wave: 'square', glideTo: 1700 })]
    case 'snore':
      return [tone(900, 0.03, 0.2, 0.2, { wave: 'square', glideTo: 1180 }), tone(1180, 0.025, 0.08, 0.3, { wave: 'square', delay: 0.45, glideTo: 820 })]
    case 'bloop':
      return [tone(130, 0.13, 0.02, 0.16, { glideTo: 250 }), tone(250, 0.05, 0.004, 0.08, { delay: 0.16, glideTo: 400 })]
    case 'lap':
      return [hiss(520 + (sound.v % 3) * 60, 0.9, 0.05, 0.08, 0.2, { glideTo: 340 })]
    case 'boom':
      return [tone(66, 0.18, 0.01, 0.34, { glideTo: 52 }), hiss(180, 0.6, 0.08, 0.03, 0.3)]
    case 'blub':
      return [tone(110, 0.11, 0.05, 0.5, { glideTo: 290 }), tone(220, 0.05, 0.004, 0.06, { delay: 0.5, glideTo: 520 })]

    // The cat: a rolling purr and a chirp for the hand, and its own words for soap, water, the towel and cloth.
    case 'purr':
      return row(7, 0.055, (_, delay) => tone(58 + (sound.v % 2) * 6, 0.12, 0.012, 0.04, { wave: 'sawtooth', delay }))
    case 'chirp':
      return [tone(620 + (sound.v % 3) * 60, 0.07, 0.015, 0.1, { wave: 'triangle', glideTo: 930 })]
    case 'mew':
      return [tone(740, 0.08, 0.02, 0.2, { wave: 'triangle', glideTo: 520 })]
    case 'fizz':
      return [hiss(3400, 0.8, 0.06, 0.02, 0.34, { glideTo: 4200 })]
    case 'chirrup':
      return [tone(560, 0.06, 0.02, 0.07, { wave: 'triangle', glideTo: 700 }), tone(700, 0.06, 0.02, 0.1, { wave: 'triangle', delay: 0.1, glideTo: 880 })]
    case 'spit':
      return [hiss(3000, 1.6, 0.1, 0.004, 0.07), tone(240, 0.05, 0.004, 0.06, { delay: 0.02, glideTo: 180 })]
    case 'splat':
      return [hiss(700, 0.6, 0.14, 0.004, 0.16, { glideTo: 300 }), tone(150, 0.08, 0.004, 0.09)]
    case 'hiss':
      return [hiss(4000, 1.1, 0.07, 0.03, 0.32)]
    case 'yowl':
      return [tone(820, 0.08, 0.04, 0.46, { wave: 'triangle', glideTo: 330 })]
    case 'crackleFur':
      return row(4, 0.035, (n, delay) => hiss(3200 + ((sound.v + n) % 3) * 400, 2, 0.045, 0.002, 0.02, { delay }))
    case 'rattle':
      return row(10, 0.045, (n, delay) => tone(74 + (n % 2) * 8, 0.15, 0.008, 0.035, { wave: 'sawtooth', delay }))
    case 'warble':
      return row(4, 0.09, (n, delay) => tone(n % 2 ? 690 : 560, 0.07, 0.02, 0.07, { wave: 'triangle', delay, glideTo: n % 2 ? 560 : 690 }))
    case 'step':
      return [tone(240 + (sound.v % 2) * 30, 0.06, 0.002, 0.03, { wave: 'triangle' }), hiss(1800, 2, 0.03, 0.002, 0.02)]
    case 'muffMew':
      return [tone(420, 0.05, 0.03, 0.2, { wave: 'triangle', glideTo: 330 }), hiss(400, 0.7, 0.03, 0.03, 0.16)]
    case 'bump':
      return [tone(124, 0.15, 0.003, 0.1, { wave: 'triangle', glideTo: 96 }), hiss(900, 1.2, 0.04, 0.003, 0.04)]

    // The lamp: a wooden tock with a hum that falls or rises, and glass under soap, water, towel and cloth.
    case 'lampDown':
      return [tone(240, 0.13, 0.003, 0.05, { wave: 'triangle' }), tone(440, 0.06, 0.03, 0.42, { delay: 0.03, glideTo: 220 })]
    case 'lampUp':
      return [tone(260, 0.13, 0.003, 0.05, { wave: 'triangle' }), tone(220, 0.06, 0.03, 0.42, { delay: 0.03, glideTo: 440 })]
    case 'glassSqueak':
      return [tone(1320 + (sound.v % 3) * 110, 0.05, 0.02, 0.1, { glideTo: 1760 + (sound.v % 3) * 110 })]
    case 'tinkle':
      return row(4, 0.06, (n, delay) => tone(step(1568, (n * 2) % 5), 0.03, 0.002, 0.07, { delay }))
    case 'sizzle':
      return [hiss(4000, 0.7, 0.08, 0.01, 0.5, { glideTo: 2600 })]
    case 'waver':
      return row(4, 0.12, (n, delay) => tone(n % 2 ? 233 : 220, 0.045, 0.04, 0.1, { delay }))
    case 'glassRub':
      return [tone(980 + (sound.v % 3) * 70, 0.045, 0.03, 0.09, { wave: 'triangle', glideTo: 1100 + (sound.v % 3) * 70 }), hiss(2000, 1, 0.025, 0.02, 0.08)]
    case 'ting':
      return [tone(1976, 0.07, 0.002, 0.4), tone(2960, 0.025, 0.002, 0.3)]
    case 'glassHum':
      return [tone(349, 0.05, 0.1, 0.5), tone(523, 0.025, 0.1, 0.4)]
    case 'warmHum':
      return [tone(147, 0.08, 0.14, 0.6, { wave: 'triangle' }), tone(220, 0.03, 0.14, 0.5)]

    // The bath.
    case 'glop':
      return [tone(96, 0.14, 0.02, 0.16, { glideTo: 150 }), tone(190, 0.06, 0.006, 0.08, { delay: 0.12, glideTo: 260 })]
    case 'crackle':
      return row(6, 0.05, (n, delay) => hiss(3000 + (n % 3) * 500, 2.4, 0.035, 0.002, 0.02, { delay }))
    case 'fill':
      return [hiss(520 + Math.min(8, sound.step) * 70, 1.4, 0.07, 0.03, 0.16, { glideTo: 620 + Math.min(8, sound.step) * 80 }), tone(step(330, Math.min(8, sound.step)), 0.035, 0.01, 0.09, { glideTo: step(330, Math.min(8, sound.step) + 1) })]
    case 'slosh':
      return [hiss(600, 0.6, 0.1, 0.08, 0.3, { glideTo: 320 }), hiss(480, 0.6, 0.07, 0.08, 0.3, { delay: 0.3, glideTo: 280 })]
    case 'slurp':
      return [hiss(1100, 1.6, 0.09, 0.05, 0.16, { glideTo: 2100 }), tone(180, 0.06, 0.03, 0.14, { glideTo: 300 })]
    case 'plip':
      return [tone(step(1319, sound.v % 3), 0.04, 0.002, 0.09, { glideTo: step(1319, sound.v % 3) * 0.8 })]
    case 'splosh':
      return [hiss(820, 0.6, 0.13, 0.006, 0.2, { glideTo: 380 }), tone(210, 0.08, 0.004, 0.1, { glideTo: 130 })]
    case 'plink':
      return [tone(step(1760, sound.v % 5), 0.035, 0.002, 0.06)]

    // The curtain, the night-light, the door and the puddle outside.
    case 'swishOpen':
      return [hiss(1400, 0.8, 0.08, 0.05, 0.26, { glideTo: 2600 }), tone(1568, 0.02, 0.002, 0.05, { delay: 0.2 })]
    case 'swishShut':
      return [hiss(2400, 0.8, 0.08, 0.05, 0.26, { glideTo: 1200 }), tone(1175, 0.02, 0.002, 0.05, { delay: 0.2 })]
    case 'nightlight':
      return [tone(784, 0.04, 0.06, 0.5), tone(1175, 0.03, 0.06, 0.6, { delay: 0.18 })]
    case 'door':
      return [tone(186, 0.05, 0.08, 0.3, { wave: 'sawtooth', glideTo: 262 }), tone(120, 0.1, 0.003, 0.08, { wave: 'triangle', delay: 0.36 })]
    case 'puddle':
      return [hiss(560 + (sound.v % 3) * 60, 0.6, 0.05, 0.006, 0.16, { glideTo: 300 }), tone(150, 0.03, 0.004, 0.08)]
  }
}

/** A sample of every sound there is, for the range test and for anyone who wants to read them through. */
export function everySound(): Sound[] {
  const out: Sound[] = []
  for (const thing of ['soap', 'jug', 'towel', 'pyjamas', 'blanket'] as const) out.push({ id: 'grab', thing }, { id: 'home', thing })
  for (const thing of ['soap', 'jug', 'towel'] as const) for (const speed of [0, 0.5, 1]) for (let v = 0; v < 4; v++) out.push({ id: 'stroke', thing, speed, v })
  for (const id of VARIED) for (let v = 0; v < 5; v++) out.push({ id, v })
  for (const id of STEPPED) for (let n = 0; n < 12; n++) out.push({ id, step: n })
  for (const size of [1, 2, 3] as const) out.push({ id: 'yawn', size })
  for (const id of PLAIN) out.push({ id })
  return out
}
