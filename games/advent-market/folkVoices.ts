import type { Note } from './audio'
import type { Who } from './hall'
import type { Taste } from './natures'
import { hiss, tone } from './notes'
import type { Craft } from './things'

// The sounds the five fair-goers make with what they are given: one for each
// part of each reaction of the grid, one for each taste, and the tuba's tune.
// Each fair-goer keeps to its own register: the tuba lowest, then her, the
// baker, the goat, and the bundle highest.

export type FolkSound =
  // The candle-maker.
  | 'grip' | 'crumple' | 'ping' | 'creak' | 'shower' | 'crunch' | 'heft'
  // The baker.
  | 'whoosh' | 'pf' | 'patHat' | 'pff' | 'footfall' | 'bounce' | 'tok' | 'hum' | 'mmm' | 'bleh'
  // The goat.
  | 'chewSqueak' | 'pop' | 'rip' | 'munch' | 'ratchet' | 'gulp' | 'hiccup' | 'purr' | 'sneeze' | 'flap'
  // The tuba player.
  | 'clonk' | 'dunk' | 'buzz' | 'whirr' | 'patter'
  // The bundle.
  | 'thump' | 'swish' | 'ting' | 'fump' | 'nibble' | 'squee' | 'whoa' | 'thud' | 'wave'

export const FOLK_VOICES: Record<FolkSound, Note[]> = {
  grip: [tone(118, 0.16, 0.01, 0.12, 96), hiss(380, 1.2, 0.06, 0.01, 0.1)],
  crumple: [hiss(2800, 1.6, 0.13, 0.004, 0.16, 1500), hiss(5200, 3, 0.05, 0.004, 0.1)],
  ping: [tone(1320, 0.1, 0.002, 0.16, 1500, 'triangle')],
  creak: [hiss(640, 10, 0.1, 0.05, 0.22, 980), tone(160, 0.06, 0.05, 0.2, 230, 'sawtooth')],
  shower: [hiss(4800, 2, 0.09, 0.004, 0.32, 3000), tone(2500, 0.03, 0.004, 0.2, 1900, 'triangle')],
  crunch: [hiss(1700, 1.2, 0.2, 0.002, 0.12, 900), tone(210, 0.12, 0.002, 0.08, 150, 'square')],
  heft: [tone(104, 0.14, 0.04, 0.3, 139, 'sawtooth'), hiss(300, 1, 0.05, 0.04, 0.2)],
  // His breath is one long whoosh and a pf at the end of it.
  whoosh: [hiss(1100, 0.7, 0.16, 0.08, 0.5, 2400)],
  pf: [hiss(2600, 1.4, 0.1, 0.004, 0.06), tone(250, 0.05, 0.004, 0.05, 190)],
  patHat: [tone(205, 0.14, 0.003, 0.07, 160), hiss(900, 1, 0.05, 0.003, 0.05)],
  pff: [hiss(1900, 0.6, 0.1, 0.02, 0.22, 1200)],
  footfall: [tone(96, 0.16, 0.004, 0.09, 78), hiss(260, 1, 0.07, 0.004, 0.07)],
  bounce: [tone(190, 0.14, 0.01, 0.2, 330)],
  tok: [tone(980, 0.13, 0.001, 0.035, 860, 'square')],
  hum: [tone(294, 0.09, 0.06, 0.34), tone(370, 0.04, 0.06, 0.3)],
  mmm: [tone(262, 0.1, 0.08, 0.4, 349), tone(524, 0.03, 0.08, 0.34, 698)],
  bleh: [tone(233, 0.12, 0.03, 0.34, 165, 'sawtooth'), hiss(700, 1, 0.04, 0.03, 0.2)],
  chewSqueak: [tone(690, 0.09, 0.02, 0.1, 930), hiss(1600, 6, 0.04, 0.02, 0.08)],
  pop: [tone(540, 0.2, 0.001, 0.05, 1500), hiss(3000, 1, 0.08, 0.001, 0.04)],
  rip: [hiss(2100, 1, 0.14, 0.002, 0.14, 4200)],
  munch: [hiss(950, 1.6, 0.12, 0.006, 0.08, 620), tone(330, 0.05, 0.006, 0.06, 280, 'square')],
  ratchet: [tone(420, 0.1, 0.002, 0.2, 380, 'square'), hiss(2300, 4, 0.1, 0.002, 0.2, 1700)],
  gulp: [tone(390, 0.18, 0.02, 0.14, 150)],
  hiccup: [tone(470, 0.14, 0.004, 0.08, 940, 'triangle')],
  purr: [tone(392, 0.07, 0.1, 0.5, 370, 'triangle'), tone(196, 0.05, 0.1, 0.5)],
  sneeze: [hiss(2400, 0.7, 0.2, 0.01, 0.2, 5200), tone(520, 0.1, 0.01, 0.12, 760, 'sawtooth')],
  flap: [hiss(600, 1, 0.09, 0.01, 0.08), hiss(1300, 2, 0.05, 0.03, 0.08)],
  clonk: [tone(165, 0.16, 0.002, 0.12, 131, 'triangle'), tone(660, 0.05, 0.002, 0.07)],
  // A biscuit lands softer in the bell than a candle does.
  dunk: [tone(247, 0.14, 0.004, 0.1, 147), hiss(520, 1, 0.05, 0.004, 0.06)],
  buzz: [tone(98, 0.1, 0.01, 0.22, 92, 'square'), hiss(1500, 9, 0.06, 0.01, 0.2, 1250)],
  whirr: [hiss(1000, 5, 0.09, 0.05, 0.4, 2500), tone(330, 0.03, 0.05, 0.36, 620, 'triangle')],
  patter: [hiss(2000, 1.4, 0.1, 0.004, 0.28, 1300), tone(1500, 0.03, 0.004, 0.1, 1100, 'triangle')],
  thump: [tone(128, 0.16, 0.003, 0.08, 98), hiss(420, 1, 0.05, 0.003, 0.05)],
  swish: [hiss(1500, 1.6, 0.09, 0.03, 0.12, 3300)],
  ting: [tone(2640, 0.09, 0.001, 0.22)],
  fump: [hiss(340, 0.8, 0.13, 0.01, 0.14, 240), tone(1050, 0.03, 0.01, 0.08, 900)],
  nibble: [hiss(2700, 3, 0.07, 0.002, 0.035), tone(1250, 0.03, 0.002, 0.03, 1100, 'square')],
  squee: [tone(1180, 0.1, 0.01, 0.1, 1880)],
  whoa: [tone(1400, 0.1, 0.02, 0.3, 880)],
  thud: [tone(92, 0.2, 0.003, 0.12, 70), hiss(240, 1, 0.07, 0.003, 0.08)],
  wave: [hiss(1800, 2.2, 0.07, 0.03, 0.1, 2600), tone(1320, 0.04, 0.01, 0.08, 1560)],
}

const POKES: Record<Who, Note[]> = {
  // A deep hmf out of a big chest.
  maker: [tone(122, 0.15, 0.03, 0.24, 94, 'sawtooth'), hiss(420, 1.2, 0.05, 0.02, 0.18)],
  // The tuba honks, flat and offended.
  tuba: [tone(87, 0.2, 0.02, 0.46, 82, 'sawtooth'), tone(174, 0.06, 0.02, 0.4, 165, 'square')],
  // A puff of flour and a rising oo.
  baker: [hiss(1250, 0.8, 0.12, 0.01, 0.16), tone(330, 0.12, 0.08, 0.26, 446)],
  // A squeak from inside the scarf.
  bundle: [tone(1120, 0.12, 0.01, 0.13, 1720)],
  // Meh.
  goat: [tone(424, 0.13, 0.02, 0.33, 356, 'sawtooth'), tone(848, 0.04, 0.02, 0.3, 700, 'square')],
}

/** A fair-goer poked. The tuba's honk comes out as the thing in its bell has made it. */
export function pokeOf(who: Who, holds: Craft | null): Note[] {
  return who === 'tuba' && holds ? tuneOf(holds, 'plain', 3) : POKES[who]
}

const TAKES: Record<Who, Note[]> = {
  maker: [tone(131, 0.1, 0.03, 0.14, 156, 'sawtooth')],
  tuba: [tone(98, 0.08, 0.02, 0.1, 104, 'square')],
  baker: [tone(311, 0.09, 0.03, 0.12, 392)],
  bundle: [tone(990, 0.08, 0.01, 0.07, 1320)],
  goat: [tone(404, 0.09, 0.02, 0.1, 452, 'sawtooth')],
}

/** A fair-goer takes a thing: a short sound in its own voice. */
export function takeOf(who: Who): Note[] {
  return TAKES[who]
}

/** The four notes of his tune, low. */
const TUNE = [87.3, 98, 110, 73.4]

/**
 * A note of the tuba. An empty bell or a star on its rim honks open; a candle in the bell stops the note; a
 * wreath over it makes it soft and round; a biscuit is fired out on a loud one. Gold rings it clear with a
 * fifth on top, and red sours it with the note a half step off.
 */
export function tuneOf(holds: Craft | null, taste: Taste, step: number): Note[] {
  const f = TUNE[((step % TUNE.length) + TUNE.length) % TUNE.length]
  const body: Note[] =
    holds === 'candle' ? [tone(f, 0.16, 0.01, 0.12, f * 0.97), tone(f * 2, 0.03, 0.01, 0.08, undefined, 'square')]
    : holds === 'wreath' ? [tone(f, 0.2, 0.09, 0.5), tone(f * 2, 0.04, 0.09, 0.4)]
    : holds === 'biscuit' ? [tone(f, 0.26, 0.01, 0.34, f * 0.94, 'sawtooth'), hiss(900, 1, 0.1, 0.01, 0.12)]
    : [tone(f, 0.2, 0.02, 0.4, f * 0.96, 'sawtooth'), tone(f * 2, 0.06, 0.02, 0.34, f * 1.92, 'square')]
  if (taste === 'like') return [body[0], tone(f * 3, 0.05, 0.02, 0.4)]
  if (taste === 'dislike') return [body[0], tone(f * 2.12, 0.07, 0.02, 0.34, f * 2.05, 'sawtooth')]
  return body
}

export const FOLK_SOUNDS = Object.keys(FOLK_VOICES) as FolkSound[]
