import type { Note } from './audio'
import type { Kind, Place } from './things'

// Every sound of the house as numbers. Each kind has a voice of its own, each
// place a splash of its own, and each character a laugh or a huff. Nothing
// cheers.

const t = (frequency: number, glideTo: number | undefined, peak: number, attack: number, decay: number, delay = 0, wave: OscillatorType = 'sine'): Note => ({ kind: 'tone', frequency, glideTo, wave, peak, attack, decay, delay })
const n = (frequency: number, glideTo: number | undefined, q: number, peak: number, attack: number, decay: number, delay = 0): Note => ({ kind: 'noise', frequency, glideTo, q, peak, attack, decay, delay })

/** A thing poked or picked up. `turn` picks the variant. */
export function pokeVoice(kind: Kind, turn: number): Note[] {
  const up = [1, 1.12, 0.92][turn % 3]
  switch (kind) {
    case 'sock': return [t(180 * up, 420 * up, 0.22, 0.01, 0.16, 0, 'triangle'), t(420 * up, 190 * up, 0.14, 0.01, 0.14, 0.12, 'triangle')]
    case 'hat': return [t(310 * up, 240 * up, 0.3, 0.004, 0.12, 0, 'triangle'), n(900, 500, 3, 0.1, 0.003, 0.06)]
    case 'teapot': return [t(1380 * up, 1370 * up, 0.16, 0.002, 0.5), t(2210 * up, 2200 * up, 0.07, 0.002, 0.34)]
    case 'cat': return [t(520 * up, 760 * up, 0.14, 0.05, 0.18, 0, 'sawtooth'), t(760 * up, 430 * up, 0.12, 0.02, 0.3, 0.2, 'sawtooth')]
    case 'hen': return [0, 0.1, 0.2, 0.33].map((at, i) => t((i === 3 ? 860 : 600) * up, (i === 3 ? 520 : 430) * up, 0.12, 0.006, i === 3 ? 0.22 : 0.07, at, 'square'))
    case 'piglet': return [0, 0.13, 0.3].map((at) => n(330 * up, 720 * up, 5, 0.3, 0.02, 0.1, at))
    case 'king': return [t(118 * up, 92 * up, 0.26, 0.03, 0.22, 0, 'sawtooth'), t(96 * up, 132 * up, 0.24, 0.03, 0.34, 0.24, 'sawtooth')]
    case 'queen': return [t(660 * up, 1180 * up, 0.16, 0.06, 0.3, 0, 'triangle'), t(1180 * up, 880 * up, 0.12, 0.02, 0.3, 0.3, 'triangle')]
    case 'gran': return [0, 0.11, 0.21, 0.3, 0.38].map((at, i) => t((620 - i * 34) * up, (480 - i * 30) * up, 0.13, 0.008, 0.08, at, 'sawtooth'))
    case 'butler': return [t(220 * up, 330 * up, 0.18, 0.03, 0.14, 0, 'triangle'), t(330 * up, 294 * up, 0.18, 0.02, 0.24, 0.16, 'triangle')]
  }
}

/** A thing landing in a place: the place's own sound, and what that kind adds to it. */
export function landVoice(kind: Kind, place: Place): Note[] {
  const heavy = kind === 'king' || kind === 'queen' || kind === 'gran' || kind === 'butler'
  const weight = heavy ? 0.6 : kind === 'cat' || kind === 'hen' || kind === 'piglet' ? 0.85 : 1.1
  const base: Note[] =
    place === 'soup' ? [t(300 * weight, 90 * weight, 0.34, 0.006, 0.26), n(700 * weight, 260, 1.4, 0.26, 0.01, heavy ? 0.7 : 0.32, 0.03)]
    : place === 'bath' ? [n(1500 * weight, 600, 0.9, 0.34, 0.006, heavy ? 0.8 : 0.4), t(520 * weight, 880 * weight, 0.14, 0.01, 0.2, 0.06)]
    : [t(150 * weight, 70, 0.34, 0.008, 0.2, 0, 'triangle'), t(240 * weight, 330 * weight, 0.14, 0.01, 0.3, 0.1, 'triangle'), n(420, 200, 0.8, 0.14, 0.01, 0.24)]
  const s = 0.16
  const own: Record<Place, Partial<Record<Kind, Note[]>>> = {
    soup: {
      sock: [n(2400, 900, 4, 0.1, 0.02, 0.24, s)], hat: [t(260, 250, 0.24, 0.003, 0.2, s, 'triangle')],
      teapot: [t(420, 250, 0.2, 0.02, 0.12, s), t(340, 200, 0.2, 0.02, 0.12, s + 0.16), t(260, 150, 0.2, 0.02, 0.16, s + 0.32)],
      cat: [t(880, 430, 0.15, 0.02, 0.5, s, 'sawtooth')], hen: [t(900, 500, 0.12, 0.01, 0.1, s, 'square'), t(960, 520, 0.12, 0.01, 0.2, s + 0.14, 'square')],
      piglet: [n(300, 640, 5, 0.3, 0.02, 0.1, s), n(300, 560, 5, 0.3, 0.02, 0.1, s + 0.16)], king: [t(90, 66, 0.3, 0.04, 0.6, s, 'sawtooth')],
      queen: [t(820, 1500, 0.15, 0.04, 0.3, s, 'triangle'), t(540, 600, 0.12, 0.03, 0.4, s + 0.5, 'triangle')], gran: [...pokeVoice('gran', 1).map((one) => ({ ...one, delay: (one.delay ?? 0) + s }))],
      butler: [t(196, 196, 0.22, 0.02, 0.2, s, 'triangle'), t(294, 294, 0.22, 0.02, 0.4, s + 0.2, 'triangle')],
    },
    bath: {
      sock: [n(1900, 3600, 2, 0.16, 0.06, 0.3, s)], hat: [0, 0.1, 0.18].map((at) => t(430, 400, 0.16, 0.003, 0.08, s + at, 'triangle')),
      teapot: [t(1500, 2400, 0.13, 0.1, 0.5, s)], cat: [t(520, 300, 0.15, 0.06, 0.6, s, 'sawtooth')],
      hen: [n(1200, 2600, 2, 0.2, 0.02, 0.24, s), t(700, 420, 0.12, 0.01, 0.16, s + 0.2, 'square')], piglet: [n(420, 900, 6, 0.3, 0.05, 0.34, s)],
      king: [t(131, 131, 0.22, 0.05, 0.3, s, 'sawtooth'), t(165, 165, 0.2, 0.05, 0.3, s + 0.3, 'sawtooth'), t(147, 131, 0.2, 0.05, 0.5, s + 0.6, 'sawtooth')],
      queen: [t(1320, 1760, 0.14, 0.02, 0.24, s, 'triangle')], gran: [n(1800, 900, 1, 0.22, 0.04, 0.3, s), ...pokeVoice('gran', 2).map((one) => ({ ...one, delay: (one.delay ?? 0) + s + 0.2 }))],
      butler: [t(900, 1300, 0.2, 0.02, 0.12, s, 'square'), t(1200, 800, 0.16, 0.02, 0.2, s + 0.16, 'square')],
    },
    bed: {
      sock: [n(800, 300, 1, 0.12, 0.02, 0.2, s)], hat: [n(900, 2200, 2, 0.14, 0.03, 0.14, s), t(300, 500, 0.12, 0.01, 0.1, s, 'triangle')],
      teapot: [n(200, 120, 3, 0.22, 0.14, 0.3, s), t(1700, 1300, 0.1, 0.1, 0.4, s + 0.4)], cat: [n(140, 120, 6, 0.3, 0.2, 0.5, s)],
      hen: [t(420, 360, 0.12, 0.1, 0.3, s, 'triangle'), t(360, 420, 0.1, 0.1, 0.3, s + 0.4, 'triangle')], piglet: [n(220, 420, 4, 0.26, 0.2, 0.3, s)],
      king: [n(90, 70, 2, 0.5, 0.3, 0.5, s), t(60, 52, 0.24, 0.2, 0.5, s, 'sawtooth')], queen: [t(1100, 1500, 0.1, 0.24, 0.3, s), t(1500, 900, 0.1, 0.1, 0.4, s + 0.5)],
      gran: [t(340, 300, 0.12, 0.1, 0.2, s, 'sawtooth'), t(460, 560, 0.1, 0.04, 0.1, s + 0.3, 'sawtooth'), t(420, 500, 0.1, 0.04, 0.1, s + 0.44, 'sawtooth')],
      butler: [t(170, 168, 0.22, 0.1, 0.7, s, 'triangle')],
    },
  }
  return [...base, ...(own[place][kind] ?? [])]
}

export const VOICES = {
  /** A thing lands on the shelf or the floor again. */
  home: [t(340, 200, 0.2, 0.004, 0.1, 0, 'triangle'), t(300, 220, 0.1, 0.004, 0.08, 0.13, 'triangle')],
  /** A person the child tugs at does not come. */
  strain: [t(120, 190, 0.14, 0.08, 0.2, 0, 'sawtooth'), t(1500, 1200, 0.04, 0.02, 0.16, 0.06)],
  /** He has seen it. */
  ah: [t(294, 588, 0.18, 0.02, 0.2, 0, 'triangle'), t(740, 740, 0.1, 0.01, 0.4, 0.22)],
  /** The thought settles on what they share. */
  idea: [t(523, 523, 0.14, 0.01, 0.2), t(659, 659, 0.14, 0.01, 0.2, 0.1), t(784, 784, 0.16, 0.01, 0.4, 0.2)],
  /** It is everything. */
  everything: [392, 494, 587, 698, 831, 988].map((f, i) => t(f, f, 0.12, 0.01, 0.4, i * 0.07, 'triangle')),
  grab: [t(260, 640, 0.14, 0.02, 0.14, 0, 'triangle')],
  toss: [n(600, 1900, 1.5, 0.14, 0.03, 0.2)],
  stepLeft: [t(150, 90, 0.1, 0.003, 0.06, 0, 'triangle')],
  stepRight: [t(178, 100, 0.1, 0.003, 0.06, 0, 'triangle')],
  worn: [t(392, 440, 0.16, 0.02, 0.14, 0, 'triangle'), t(494, 494, 0.16, 0.02, 0.24, 0.14, 'triangle')],
  bell: [t(1046, 1040, 0.24, 0.002, 1.1), t(2637, 2630, 0.08, 0.002, 0.6), t(1568, 1560, 0.1, 0.002, 0.8)],
  jingle: [t(1568, 1560, 0.1, 0.002, 0.3), t(2093, 2090, 0.08, 0.002, 0.3, 0.07)],
  dream: [t(440, 660, 0.1, 0.1, 0.3), t(660, 880, 0.1, 0.1, 0.4, 0.24)],
  cackle: [0, 0.12, 0.23, 0.33, 0.6, 0.72, 0.83, 0.93, 1.25, 1.36, 1.46, 1.55, 1.64].map((at, i) => t(700 - (i % 5) * 40 + i * 14, 520 - (i % 5) * 30 + i * 10, 0.14, 0.008, 0.09, at, 'sawtooth')),
  wall: [t(210, 170, 0.12, 0.004, 0.08, 0, 'triangle')],
  quack: [t(320, 220, 0.14, 0.01, 0.12, 0, 'square')],
} satisfies Record<string, Note[]>

export type VoiceName = keyof typeof VOICES
