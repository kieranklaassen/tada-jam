import { voiceOf, type Note, type Voice } from './audio'
import { PITCH, type Carrier, type Kind, type Sleeper } from './cast'
import { PLACES } from './garden'
import { Play, type Cue } from './play'

// Every sound as numbers. Who carries gives a light its note; the kind of
// place gives the note its colour.

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const air = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, peak, attack, decay, ...more })

/** The colour of a light's note at each kind of place. */
export function ring(kind: Kind, f: number, loud: number): Note[] {
  if (kind === 'pond') return [tone(f, 0.16 * loud, 0.01, 1.1), tone(f * 2.02, 0.05 * loud, 0.02, 0.6), tone(f * 0.94, 0.07 * loud, 0.004, 0.09, { glideTo: f * 1.5 })]
  if (kind === 'tree') return [tone(f, 0.17 * loud, 0.003, 0.55, { wave: 'triangle' }), tone(f * 4, 0.04 * loud, 0.002, 0.07), air(f * 3, 0.06 * loud, 0.002, 0.04, { q: 3 })]
  if (kind === 'burrow') return [tone(f, 0.14 * loud, 0.03, 0.9), tone(f / 2, 0.12 * loud, 0.04, 1.0), tone(f * 1.5, 0.03 * loud, 0.05, 0.5)]
  return [tone(f, 0.14 * loud, 0.002, 1.3), tone(f * 2.76, 0.05 * loud, 0.002, 0.5), tone(f * 5.4, 0.02 * loud, 0.002, 0.25)]
}

const CRY: Readonly<Record<Carrier, readonly Note[]>> = {
  gnome: [tone(196, 0.12, 0.02, 0.14, { wave: 'triangle', glideTo: 240 }), tone(175, 0.12, 0.02, 0.22, { wave: 'triangle', glideTo: 150, delay: 0.19 })],
  goose: [tone(330, 0.1, 0.01, 0.16, { wave: 'sawtooth', glideTo: 250 }), air(900, 0.05, 0.01, 0.13, { q: 2 })],
  hare: [tone(820, 0.09, 0.008, 0.1, { glideTo: 1300 }), tone(1150, 0.06, 0.008, 0.08, { glideTo: 1500, delay: 0.11 })],
  bear: [tone(98, 0.2, 0.06, 0.5, { wave: 'triangle', glideTo: 82 }), tone(147, 0.08, 0.1, 0.4, { glideTo: 110 })],
}

const STEP: Readonly<Record<Carrier, readonly Note[]>> = {
  gnome: [air(420, 0.07, 0.002, 0.05, { q: 1.5 }), tone(150, 0.05, 0.002, 0.05)],
  goose: [air(1300, 0.06, 0.002, 0.035, { q: 2 }), tone(260, 0.03, 0.002, 0.04, { wave: 'sawtooth' })],
  hare: [tone(240, 0.07, 0.004, 0.12, { glideTo: 480 })],
  bear: [tone(1250, 0.025, 0.001, 0.03), tone(72, 0.1, 0.003, 0.07)],
}

const JOKES: Readonly<Record<Sleeper, readonly Note[]>> = {
  toad: [tone(92, 0.2, 0.02, 0.5, { wave: 'sawtooth', glideTo: 60, delay: 0.82 }), tone(420, 0.06, 0.02, 0.3, { glideTo: 900, delay: 1.1 })],
  duckling: [tone(640, 0.08, 0.005, 0.08, { wave: 'square', glideTo: 520 }), tone(660, 0.08, 0.005, 0.08, { wave: 'square', glideTo: 520, delay: 0.14 }), air(1800, 0.05, 0.01, 0.5, { q: 1, delay: 0.3 })],
  pike: [air(700, 0.14, 0.01, 0.3, { glideTo: 2200 }), tone(300, 0.08, 0.02, 0.4, { glideTo: 700, delay: 0.1 }), tone(190, 0.14, 0.003, 0.08, { delay: 0.62 }), air(500, 0.16, 0.01, 0.35, { delay: 0.95 })],
  turtle: [tone(220, 0.1, 0.03, 0.16, { glideTo: 330 }), tone(294, 0.1, 0.03, 0.16, { glideTo: 440, delay: 0.3 }), tone(520, 0.1, 0.004, 0.12, { glideTo: 130, delay: 1.15 })],
  owl: [tone(392, 0.12, 0.05, 0.22), tone(330, 0.13, 0.05, 0.5, { delay: 0.35 }), air(2400, 0.02, 0.02, 0.6, { q: 8, glideTo: 1200, delay: 0.24 })],
  bat: [tone(2100, 0.05, 0.004, 0.06, { glideTo: 2700 }), tone(2300, 0.05, 0.004, 0.06, { glideTo: 1700, delay: 0.12 }), air(600, 0.1, 0.02, 0.16, { delay: 0.3 }), tone(1500, 0.04, 0.02, 0.2, { glideTo: 1100, delay: 0.95 })],
  squirrel: [air(2600, 0.07, 0.002, 0.04, { q: 3 }), air(2600, 0.07, 0.002, 0.04, { q: 3, delay: 0.14 }), air(2600, 0.07, 0.002, 0.04, { q: 3, delay: 0.28 }), air(2600, 0.07, 0.002, 0.04, { q: 3, delay: 0.42 }), tone(260, 0.2, 0.002, 0.1, { glideTo: 620, delay: 0.93 })],
  woodpecker: [0, 1, 2, 3, 4, 5].map((i) => tone(640, 0.14, 0.001, 0.04, { wave: 'triangle', glideTo: 480, delay: i * 0.1 })).concat([tone(900, 0.04, 0.05, 0.5, { glideTo: 1200, delay: 0.8 })]),
  mole: [air(300, 0.12, 0.05, 0.35), tone(520, 0.07, 0.01, 0.1, { glideTo: 640, delay: 0.5 }), tone(430, 0.07, 0.01, 0.14, { delay: 0.7 })],
  worm: [tone(180, 0.12, 0.1, 0.9, { glideTo: 720 }), tone(720, 0.1, 0.05, 0.4, { glideTo: 300, delay: 1.05 })],
  fox: [air(220, 0.09, 0.1, 0.3, { q: 2 }), tone(760, 0.08, 0.01, 0.09, { wave: 'triangle', glideTo: 560, delay: 0.45 }), tone(760, 0.08, 0.01, 0.09, { wave: 'triangle', glideTo: 560, delay: 0.6 })],
  badger: [tone(150, 0.16, 0.3, 0.5, { wave: 'triangle', glideTo: 330 }), tone(330, 0.15, 0.1, 0.8, { wave: 'triangle', glideTo: 105, delay: 0.8 })],
  snail: [tone(500, 0.1, 0.004, 0.1, { glideTo: 900, delay: 0.15 }), tone(600, 0.1, 0.004, 0.1, { glideTo: 1100, delay: 0.68 }), tone(900, 0.07, 0.02, 0.3, { glideTo: 300, delay: 1.05 })],
  caterpillar: [0, 1, 2, 3, 4, 5].map((i) => tone(i % 2 ? 1180 : 940, 0.08, 0.001, 0.05, { wave: 'triangle', delay: i * 0.2 })),
  hedgehog: [air(1200, 0.05, 0.1, 0.35, { glideTo: 2400 }), air(3000, 0.2, 0.003, 0.16, { delay: 0.64 }), tone(700, 0.12, 0.004, 0.14, { glideTo: 380, delay: 0.64 }), tone(200, 0.08, 0.004, 0.2, { delay: 1.05 })],
  mushroom: [tone(420, 0.12, 0.003, 0.1, { glideTo: 640, delay: 0.14 }), tone(840, 0.1, 0.003, 0.08, { glideTo: 1200, delay: 0.64 }), tone(640, 0.1, 0.003, 0.1, { glideTo: 420, delay: 1.4 })],
}

const MURMUR: Readonly<Record<Kind, readonly Note[]>> = {
  pond: [tone(240, 0.07, 0.03, 0.1, { glideTo: 380 }), tone(300, 0.06, 0.03, 0.1, { glideTo: 470, delay: 0.14 })],
  tree: [tone(196, 0.08, 0.08, 0.4, { wave: 'triangle', glideTo: 170 })],
  burrow: [air(180, 0.12, 0.12, 0.4, { q: 2, glideTo: 120 })],
  moss: [tone(520, 0.05, 0.04, 0.25, { glideTo: 430 }), air(2400, 0.02, 0.02, 0.2)],
}

/** The notes of everything one moment sets off, as one voice. */
export function notesOf(cues: readonly Cue[]): Note[] {
  const out: Note[] = []
  let steps = 0
  for (const one of cues) {
    switch (one.cue) {
      case 'cry': out.push(...CRY[one.who]); break
      case 'step': if (steps++ < 1) out.push(...STEP[one.who]); break
      case 'stumble': out.push(...STEP[one.who], tone(210, 0.1, 0.01, 0.16, { wave: 'triangle', glideTo: 130 })); break
      case 'hum': out.push(tone(PITCH[one.who] / 2, 0.06, 0.1, 0.4)); break
      case 'ring': out.push(...ring(PLACES[one.place].kind, Play.pitch(one.place, one.who), one.soft ? 0.7 : 1)); break
      case 'joke': out.push(...JOKES[one.sleeper]); break
      case 'open': {
        // A tinkle of glass, upward, and the light's note under it.
        for (let i = 0; i < 9; i++) out.push(tone(1174 * 2 ** ([0, 2, 4, 7, 9, 12, 14, 16, 19][i] / 12), 0.045, 0.002, 0.22, { delay: 0.06 + i * 0.085 }))
        out.push(air(5200, 0.03, 0.1, 0.7, { q: 2 }))
        break
      }
      case 'light':
        out.push(air(420, 0.2, 0.04, 0.4, { glideTo: 1500 }), tone(PITCH[one.who], 0.12, 0.03, 0.8), tone(PITCH[one.who] * 1.5, 0.07, 0.06, 0.7))
        out.push(...SNEEZE[one.who])
        break
      case 'set': out.push(...SETS[one.who]); break
      case 'home': out.push(...HOMES[one.who]); break
      case 'breath': out.push(air(500, 0.14, 0.6, 0.2, { glideTo: 1600 })); break
      case 'knock': out.push(air(1400, 0.24, 0.05, 1.7, { glideTo: 350 })); break
      case 'out': out.push(air(900, 0.1, 0.004, 0.12, { glideTo: 300 }), tone(330, 0.06, 0.004, 0.14, { glideTo: 130 })); break
      case 'flutter': for (let i = 0; i < 7; i++) out.push(air(700, 0.1, 0.01, 0.09, { delay: i * 0.16 })); break
      case 'stand': out.push(air(420, 0.16, 0.03, 0.5, { glideTo: 1400 }), tone(220, 0.1, 0.02, 0.9), tone(330, 0.08, 0.04, 0.9)); break
      case 'murmur': out.push(...MURMUR[PLACES[one.place].kind]); if (one.cold) out.push(air(260, 0.16, 0.02, 0.24, { q: 3, glideTo: 140, delay: 0.2 })); break
      case 'rustle': out.push(air(3400, 0.05, 0.01, 0.16), tone(1760, 0.02, 0.004, 0.2)); break
      case 'flame': out.push(tone(147, 0.12, 0.05, 0.7), tone(294, 0.05, 0.05, 0.5), air(600, 0.06, 0.01, 0.2)); break
      case 'chord': for (const f of [293.66, 440, 587.33]) out.push(tone(f, 0.06, 0.02, 1.5)); break
    }
  }
  return out
}

/** What each does at the flame, with the apple, and on the way home. */
const SNEEZE: Readonly<Record<Carrier, readonly Note[]>> = {
  gnome: [air(800, 0.06, 0.1, 0.1, { delay: 0.3 }), air(2600, 0.16, 0.004, 0.14, { delay: 0.5 }), tone(330, 0.1, 0.004, 0.12, { glideTo: 180, delay: 0.5 })],
  goose: [air(1500, 0.07, 0.05, 0.12, { q: 2, delay: 0.3 })],
  hare: [tone(1300, 0.09, 0.004, 0.16, { glideTo: 1900, delay: 0.15 })],
  bear: [air(350, 0.12, 0.08, 0.3, { delay: 0.25 })],
}
const SETS: Readonly<Record<Carrier, readonly Note[]>> = {
  gnome: [tone(220, 0.1, 0.003, 0.08), tone(247, 0.1, 0.003, 0.08, { delay: 0.18 }), tone(220, 0.1, 0.003, 0.08, { delay: 0.34 })],
  goose: [air(1700, 0.08, 0.02, 0.2, { q: 4, glideTo: 2400 }), tone(260, 0.1, 0.003, 0.1, { delay: 0.3 })],
  hare: [tone(600, 0.08, 0.004, 0.14, { glideTo: 200 }), tone(220, 0.12, 0.003, 0.08, { delay: 0.3 })],
  bear: [tone(1400, 0.04, 0.001, 0.04), tone(1700, 0.04, 0.001, 0.04, { delay: 0.14 }), tone(110, 0.14, 0.004, 0.16, { delay: 0.34 })],
}
const HOMES: Readonly<Record<Carrier, readonly Note[]>> = {
  gnome: [tone(260, 0.1, 0.05, 0.55, { wave: 'triangle', glideTo: 780 }), tone(120, 0.14, 0.004, 0.16, { delay: 0.82 })],
  goose: [0, 1, 2, 3, 4].map((i) => air(800, 0.08, 0.02, 0.1, { delay: i * 0.16 })).concat([tone(300, 0.08, 0.01, 0.15, { wave: 'sawtooth', glideTo: 230, delay: 0.82 })]),
  hare: [tone(300, 0.09, 0.01, 0.2, { glideTo: 720 }), tone(360, 0.09, 0.01, 0.2, { glideTo: 860, delay: 0.3 }), tone(420, 0.09, 0.01, 0.2, { glideTo: 1000, delay: 0.6 })],
  bear: [air(130, 0.2, 0.1, 0.65, { q: 2, glideTo: 90 }), tone(62, 0.2, 0.004, 0.25, { delay: 0.82 })],
}

export function voice(cues: readonly Cue[]): Voice {
  return voiceOf(notesOf(cues))
}

export { CRY, JOKES, STEP, SETS, HOMES, SNEEZE, MURMUR }
