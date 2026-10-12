import type { Note } from './audio'
import { FOLK_VOICES, pokeOf, takeOf, tuneOf, type FolkSound } from './folkVoices'
import type { Who } from './hall'
import { hiss, tone } from './notes'
import type { Taste } from './natures'
import type { Craft } from './things'

// Every sound of the fair, as plain numbers. Nobody on the machine that wrote
// them could hear them: they are written from the sheet's words (thick, slow
// and warm for the wax; small and bright for a drop; dry for paper; one voice
// for each fair-goer), kept short, and held in range by voices.test.ts.
// No note waits: a sound with a second part is two sounds, each started by
// the game's own clock (the sheet, "One clock"). This file holds the sounds
// of the hall and the benches; folkVoices.ts holds the fair-goers'.

/** The sounds that are always the same. */
export type HallSound =
  // The candle stall and what is the same at every place.
  | 'knock' | 'tick' | 'blob' | 'bare' | 'hang' | 'stand' | 'pot' | 'basketIn' | 'basketFull' | 'basketPoke' | 'flutter' | 'lantern' | 'window' | 'hop' | 'lick' | 'proud' | 'droop'
  | 'pour' | 'cloth' | 'source' | 'thingHop' | 'thingUp' | 'thingBack' | 'bench'
  // The star, the wreath and the biscuit at their own benches.
  | 'crease' | 'fft' | 'paper' | 'sheet' | 'rustle' | 'vrrp' | 'brush' | 'zip' | 'chk' | 'squeak' | 'pat' | 'squirt'
  // A thing used at another stall.
  | 'crackle' | 'plipHigh' | 'hiss' | 'glub' | 'plop' | 'hookCreak' | 'glassTap' | 'crinkle' | 'tp' | 'needles' | 'thock' | 'paperFlutter' | 'clack' | 'snap' | 'fwip' | 'squelch'
  // The walk, the door and the ending.
  | 'walkLight' | 'shuffle' | 'arrive' | 'door' | 'gust' | 'snowSet' | 'glow' | 'hookOn'

export type Sound = (
  /** `variant` is which of its three sneezes the goat sneezes; no other sound of these reads it. */
  | { name: HallSound | FolkSound; variant?: number }
  | { name: 'gloop' | 'lift'; fat: number }
  | { name: 'plip'; size: number; variant: number }
  | { name: 'bubble'; variant: number }
  /** A fair-goer poked, and a fair-goer taking a thing: each in its own voice. The tuba's honk is shaped by what lies in its bell. */
  | { name: 'poke' | 'take'; who: Who; holds?: Craft | null }
  /** The star lit as a lantern: a glassy chime, pitched by the paper's colour. */
  | { name: 'chime'; colour: number }
  /** A note of the tuba, as the thing in its bell has made it, and as his taste for its colour turns it. */
  | { name: 'tune'; holds: Craft | null; taste: Taste; step: number }
) & {
  /** Part of a scene that is being watched: a touch that ends the scene cuts it. */
  scene?: boolean
}

const HALL: Record<HallSound, Note[]> = {
  knock: [tone(520, 0.2, 0.002, 0.07, 380, 'triangle'), hiss(1800, 2, 0.09, 0.002, 0.03)],
  tick: [tone(2100, 0.08, 0.001, 0.03, 1800, 'triangle'), hiss(3000, 4, 0.05, 0.001, 0.03)],
  blob: [tone(142, 0.34, 0.01, 0.23, 70), tone(300, 0.1, 0.01, 0.14, 120)],
  // The last of the wax slipping off the wick: a soft flat tick, not a falling tone.
  bare: [hiss(5000, 6, 0.05, 0.004, 0.08, 4200), tone(660, 0.04, 0.004, 0.06, 660)],
  hang: [tone(612, 0.1, 0.002, 0.05, 560, 'triangle')],
  stand: [tone(182, 0.16, 0.003, 0.08, 120), hiss(600, 1.4, 0.06, 0.003, 0.05)],
  // A dull copper bell.
  pot: [tone(196, 0.22, 0.004, 0.9), tone(541, 0.07, 0.004, 0.4), tone(392, 0.05, 0.004, 0.5, undefined, 'triangle')],
  basketIn: [tone(300, 0.2, 0.003, 0.08, 240, 'triangle'), hiss(900, 2, 0.12, 0.004, 0.1)],
  basketFull: [hiss(700, 8, 0.1, 0.08, 0.26, 1100), tone(220, 0.08, 0.05, 0.2, 180)],
  basketPoke: [hiss(800, 9, 0.08, 0.02, 0.2, 950), tone(1250, 0.07, 0.002, 0.1, undefined, 'triangle'), tone(1480, 0.05, 0.002, 0.08, undefined, 'triangle')],
  flutter: [hiss(900, 0.7, 0.07, 0.06, 0.3, 500)],
  lantern: [hiss(1500, 12, 0.07, 0.05, 0.3, 1100), tone(2400, 0.03, 0.002, 0.12)],
  window: [tone(1900, 0.1, 0.001, 0.12), tone(2850, 0.04, 0.001, 0.08), hiss(6000, 1, 0.03, 0.05, 0.4)],
  hop: [tone(920, 0.05, 0.004, 0.07, 1320)],
  lick: [tone(700, 0.04, 0.002, 0.03, 500, 'triangle')],
  // Her low hum for a fat thing, and the falling whistle for one gone thin.
  proud: [tone(147, 0.08, 0.1, 0.5), tone(220, 0.05, 0.1, 0.45)],
  droop: [tone(520, 0.08, 0.02, 0.4, 200)],
  // One wax poured into the big pot: a glug that falls.
  pour: [tone(260, 0.2, 0.02, 0.3, 120), hiss(500, 2, 0.08, 0.02, 0.3, 240)],
  cloth: [hiss(420, 0.8, 0.14, 0.03, 0.26, 900), tone(110, 0.1, 0.01, 0.12, 80)],
  source: [tone(240, 0.1, 0.004, 0.09, 200, 'triangle')],
  thingHop: [tone(660, 0.09, 0.003, 0.06, 820, 'triangle')],
  thingUp: [hiss(1200, 1.4, 0.07, 0.01, 0.09, 2000), tone(430, 0.06, 0.004, 0.06, 560)],
  thingBack: [tone(380, 0.08, 0.004, 0.07, 300, 'triangle'), hiss(700, 1.6, 0.05, 0.004, 0.06)],
  bench: [tone(150, 0.12, 0.004, 0.1, 110), hiss(400, 1.2, 0.05, 0.004, 0.07)],
  // Paper: a crease, the dry fft of a point pressed flat, a flutter, a sheet slid off its pile.
  crease: [hiss(3600, 3, 0.1, 0.002, 0.05, 2200), tone(1400, 0.04, 0.002, 0.03, 900, 'triangle')],
  fft: [hiss(5200, 1.2, 0.09, 0.004, 0.07, 3000)],
  paper: [hiss(2600, 0.9, 0.07, 0.02, 0.16, 3400)],
  sheet: [hiss(1900, 1.1, 0.09, 0.03, 0.2, 2800), hiss(4200, 2, 0.04, 0.03, 0.12)],
  // Fir and ribbon: a rustle, the wound vrrp of the ribbon, a brushed twig, a ribbon pulled through.
  rustle: [hiss(1500, 0.8, 0.1, 0.01, 0.12, 2300), hiss(3800, 2, 0.04, 0.01, 0.08)],
  vrrp: [tone(210, 0.1, 0.01, 0.13, 520, 'sawtooth'), hiss(1100, 5, 0.05, 0.01, 0.12, 2400)],
  brush: [hiss(2200, 1.4, 0.06, 0.01, 0.1)],
  zip: [hiss(900, 7, 0.1, 0.005, 0.12, 3600), tone(500, 0.04, 0.005, 0.1, 1500)],
  // Dough and icing: the tin's chk, an icing squeak, a pat, a bag squeezed.
  chk: [tone(1700, 0.14, 0.001, 0.035, 1300, 'square'), tone(240, 0.16, 0.002, 0.07, 150)],
  squeak: [tone(1250, 0.07, 0.01, 0.06, 1650)],
  pat: [tone(170, 0.14, 0.003, 0.06, 130), hiss(500, 1, 0.05, 0.003, 0.05)],
  squirt: [hiss(1400, 3, 0.09, 0.02, 0.14, 700), tone(900, 0.05, 0.02, 0.1, 600)],
  // Used at another stall.
  crackle: [hiss(4400, 4, 0.1, 0.002, 0.09, 2600), hiss(2000, 3, 0.05, 0.03, 0.08)],
  plipHigh: [tone(2300, 0.09, 0.002, 0.06, 3100)],
  hiss: [hiss(5400, 0.8, 0.09, 0.02, 0.3, 3200)],
  glub: [tone(118, 0.3, 0.03, 0.3, 74), hiss(260, 1.4, 0.07, 0.03, 0.24, 160)],
  plop: [tone(180, 0.26, 0.006, 0.16, 96), tone(360, 0.07, 0.006, 0.1, 190)],
  hookCreak: [hiss(820, 11, 0.09, 0.06, 0.2, 1200), tone(410, 0.04, 0.06, 0.18, 590, 'sawtooth')],
  glassTap: [tone(2700, 0.1, 0.001, 0.08), tone(4050, 0.04, 0.001, 0.05)],
  crinkle: [hiss(3000, 2.4, 0.09, 0.004, 0.1, 4600), hiss(1700, 3, 0.05, 0.02, 0.07)],
  tp: [tone(820, 0.1, 0.002, 0.03, 620, 'triangle')],
  needles: [hiss(2600, 1.1, 0.1, 0.004, 0.2, 1500), hiss(5000, 3, 0.04, 0.004, 0.16)],
  thock: [tone(330, 0.2, 0.002, 0.08, 250, 'triangle'), hiss(1200, 2, 0.06, 0.002, 0.04)],
  paperFlutter: [hiss(2400, 1, 0.07, 0.01, 0.22, 3900), tone(1500, 0.03, 0.01, 0.2, 2100, 'triangle')],
  clack: [tone(900, 0.14, 0.001, 0.045, 760, 'square'), hiss(1500, 2, 0.05, 0.001, 0.04)],
  snap: [hiss(3300, 5, 0.14, 0.001, 0.04), tone(1900, 0.08, 0.001, 0.03, 1100, 'square')],
  fwip: [hiss(1300, 2, 0.07, 0.03, 0.09, 2900), tone(640, 0.05, 0.03, 0.08, 980)],
  squelch: [hiss(380, 2.4, 0.13, 0.03, 0.18, 210), tone(130, 0.14, 0.03, 0.16, 95)],
  // The walk, the door and the ending.
  walkLight: [hiss(1500, 2, 0.08, 0.03, 0.1, 3200), tone(1760, 0.07, 0.004, 0.24)],
  shuffle: [hiss(520, 1, 0.06, 0.02, 0.09, 380)],
  arrive: [tone(294, 0.08, 0.01, 0.3), tone(440, 0.05, 0.01, 0.26)],
  door: [hiss(560, 12, 0.1, 0.1, 0.5, 900), tone(280, 0.05, 0.1, 0.45, 420, 'sawtooth')],
  gust: [hiss(700, 0.6, 0.12, 0.2, 0.7, 1500)],
  snowSet: [hiss(900, 0.9, 0.12, 0.01, 0.2, 500), tone(140, 0.14, 0.01, 0.14, 100)],
  glow: [tone(880, 0.06, 0.2, 0.7), tone(1320, 0.04, 0.2, 0.6), tone(1760, 0.02, 0.2, 0.5)],
  hookOn: [tone(700, 0.1, 0.002, 0.06, 560, 'triangle'), hiss(1000, 8, 0.07, 0.03, 0.16, 800)],
}

/** The notes of one sound. All of them start together. */
export function notesOf(sound: Sound): Note[] {
  switch (sound.name) {
    case 'gloop': {
      // Thick and slow, and lower the fatter the candle is.
      const f = 196 - sound.fat * 92
      return [tone(f, 0.32, 0.03, 0.26, f * 0.6), hiss(300, 1.5, 0.08, 0.03, 0.2, 180)]
    }
    case 'lift': {
      const f = 150 - sound.fat * 40
      return [hiss(520, 3, 0.12, 0.03, 0.17, 1400), tone(f, 0.12, 0.03, 0.15, f * 1.7)]
    }
    case 'plip': {
      // Small and bright; a bigger drop is lower, and no two in a row are the same.
      const f = 1560 - sound.size * 105 + sound.variant * 135
      return [tone(f, 0.14, 0.002, 0.085, f * 1.5)]
    }
    case 'bubble': {
      const f = 240 + sound.variant * 72
      return [tone(f, 0.12, 0.012, 0.09, f * 1.7)]
    }
    case 'chime': {
      const f = [1568, 1175, 1976][sound.colour] ?? 1568
      return [tone(f, 0.12, 0.002, 0.6), tone(f * 2.01, 0.04, 0.002, 0.3), tone(f * 1.5, 0.03, 0.002, 0.4)]
    }
    case 'sneeze': {
      // Three sneezes, one drawn by chance each time: the plain one, a higher one, a lower one.
      const k = [1, 1.22, 0.82][sound.variant ?? 0] ?? 1
      return [hiss(2400 * k, 0.7, 0.2, 0.01, 0.2, 5200 * k), tone(520 * k, 0.1, 0.01, 0.12, 760 * k, 'sawtooth')]
    }
    case 'poke':
      return pokeOf(sound.who, sound.holds ?? null)
    case 'take':
      return takeOf(sound.who)
    case 'tune':
      return tuneOf(sound.holds, sound.taste, sound.step)
    default:
      return HALL[sound.name as HallSound] ?? FOLK_VOICES[sound.name as FolkSound]
  }
}

/** Everything queued in one step or one touch, as the notes of one voice (audio.ts: one touch, one voice). */
export function notesOfAll(sounds: readonly Sound[]): Note[] {
  const notes: Note[] = []
  for (const sound of sounds) notes.push(...notesOf(sound))
  return notes
}

export const HALL_SOUNDS = Object.keys(HALL) as HallSound[]
