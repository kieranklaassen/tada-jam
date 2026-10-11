import type { Note } from './audio'
import type { CueName } from './grid'

// Every sound of the game, as plain numbers. Nobody has heard them: they are
// written from the words of the sheet (ART.md, the "What is heard" column of
// the grid, the toy and the scenes), kept short, and held in range by the test
// beside this file. A sound never lasts much longer than the moment it is
// drawn for, so an answer that is cut short does not sound on.
// One touch, one voice: the Mount joins the notes of everything a step set
// off and plays them as one (`voiceOf` in audio.ts).

/** What makes a sound outside the grid: the line, the deck, the tub, the cat's opinions and the two scenes. */
export type OtherCue =
  | 'click' | 'tooth' | 'mew' | 'splashIn' | 'splashOut' | 'drip' | 'knock' | 'snap' | 'pop' | 'slosh' | 'flinch' | 'squawk'
  | 'baitOn' | 'baitOff' | 'pegTok' | 'bump' | 'surface' | 'scoop' | 'land' | 'bounce' | 'tipBack' | 'railSplash' | 'scatter' | 'startle' | 'inkLost' | 'plip' | 'sleepy' | 'wake'
  | 'catDuck' | 'catPrick' | 'catLick' | 'catFrizz' | 'catPounce' | 'catSplash' | 'catPurr' | 'catSag' | 'catInked' | 'catSneeze'
  | 'towGulp' | 'towCreak' | 'towLurch' | 'towSlop' | 'towSpit' | 'towShake'
  | 'tipCreak' | 'tipSplash' | 'tipWave' | 'tipRock' | 'lantern'
export type CueId = CueName | OtherCue
/** One sound to play. `index` picks the variant where a cue has several; a click carries its depth and its direction instead. */
export type Cue = { name: CueId; index?: number; depth?: number; up?: boolean; by?: string }

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })
/** A short run of the same small note, each a step on from the last. */
const run = (count: number, gap: number, note: (index: number) => Note): Note[] => Array.from({ length: count }, (_, index) => ({ ...note(index), delay: index * gap }))
/** The pitch `steps` semitones above `from`. */
const up = (from: number, steps: number): number => from * 2 ** (steps / 12)

/** The reel: one dry click, lower the deeper the hook is, and higher and brighter when the line comes in. */
export function click(depth: number, rising: boolean): Note[] {
  const d = Math.min(1, Math.max(0, depth))
  const pitch = rising ? 1500 - 700 * d : 900 - 520 * d
  return [tone(pitch, 0.09, 0.002, 0.035, { wave: 'triangle' }), hiss(rising ? 3200 : 2200, 3, 0.03, 0.001, 0.02)]
}

/** The shark's teeth, low to high from the back of the jaw to the front: a five-note scale over two octaves. */
export const TOOTH_PITCH: readonly number[] = [523, 587, 659, 784, 880, 1047, 1175, 1319]
/** The shark's tooth `index`, plinked by the hook. */
export function tooth(index: number): Note[] {
  const pitch = TOOTH_PITCH[Math.min(TOOTH_PITCH.length - 1, Math.max(0, index))]
  return [tone(pitch, 0.14, 0.002, 0.3), tone(pitch * 2, 0.04, 0.002, 0.1, { wave: 'triangle' })]
}

/** The cat's three mews: a long one with a stretch, a short chirp with a tilt of the head, a yawn that falls. */
export const MEWS: readonly Note[][] = [
  [tone(700, 0.12, 0.08, 0.25, { wave: 'triangle', glideTo: 1040 }), tone(1040, 0.1, 0.03, 0.3, { wave: 'triangle', glideTo: 760, delay: 0.3 })],
  [tone(520, 0.12, 0.04, 0.12, { wave: 'triangle', glideTo: 790 }), tone(790, 0.08, 0.02, 0.1, { wave: 'triangle', glideTo: 830, delay: 0.14 })],
  [tone(880, 0.11, 0.15, 0.5, { wave: 'triangle', glideTo: 500 }), hiss(1800, 1.5, 0.03, 0.2, 0.4, { delay: 0.1 })],
]

type Sound = Note[] | ((index: number) => Note[])

/** The grid's sounds, cell by cell in the sheet's own words. Where a cue has variants, `index` is which. */
export const GRID_VOICES: Record<CueName, Sound> = {
  // --- The worm
  // The shoal nibbles: a fast run of tiny ticks that climbs, like rain on a tin.
  ticks: (index) => run(7, 0.05, (i) => tone(up(1400, index * 4 + i), 0.05, 0.002, 0.03, { wave: 'triangle' })),
  // The pufferfish: a long slurp, then a squeak that rises as it swells.
  slurp: [hiss(500, 4, 0.14, 0.05, 0.5, { glideTo: 1900 }), tone(240, 0.07, 0.05, 0.45, { glideTo: 520 })],
  swell: [tone(600, 0.14, 0.12, 0.16, { glideTo: 1500 })],
  // The turtle: three slow crunches and a swallow.
  crunch: (index) => [hiss(900 - index * 90, 2, 0.16, 0.004, 0.09), hiss(2600, 3, 0.07, 0.002, 0.05, { delay: 0.05 }), tone(150, 0.07, 0.004, 0.08)],
  swallow: [tone(300, 0.12, 0.03, 0.14, { glideTo: 130 }), tone(210, 0.07, 0.02, 0.1, { glideTo: 260, delay: 0.16 })],
  // The squid: a snap and a rush of water.
  snatch: [hiss(3000, 2, 0.14, 0.001, 0.03), tone(900, 0.08, 0.001, 0.03, { wave: 'square' })],
  rush: [hiss(700, 0.8, 0.18, 0.04, 0.4, { glideTo: 2200 })],
  // The jellyfish: a dry crackle, then a slide down.
  crackle: run(8, 0.035, (i) => hiss(3600 - (i % 3) * 500, 5, 0.09, 0.001, 0.015)),
  droop: [tone(880, 0.1, 0.02, 0.4, { wave: 'triangle', glideTo: 330 })],
  // The anglerfish: a click of the lamp, then a low chomp.
  lampClick: [tone(2100, 0.08, 0.001, 0.02, { wave: 'square' }), hiss(4000, 4, 0.04, 0.001, 0.02)],
  chomp: [tone(130, 0.2, 0.004, 0.12, { wave: 'square', glideTo: 80 }), hiss(600, 1.5, 0.12, 0.002, 0.06)],
  // The octopus: a cork pop and two soft pats.
  cork: [tone(420, 0.18, 0.002, 0.07, { glideTo: 980 }), hiss(1500, 2, 0.06, 0.001, 0.03)],
  pat: (index) => [tone(250 + index * 40, 0.09, 0.004, 0.06, { wave: 'triangle' }), hiss(900, 2, 0.05, 0.003, 0.04)],
  // The blobfish: a slow creaking yawn, then a gulp.
  creakYawn: [tone(120, 0.1, 0.2, 0.4, { wave: 'sawtooth', glideTo: 230 }), hiss(500, 9, 0.05, 0.2, 0.4, { glideTo: 800 })],
  gulp: [tone(260, 0.2, 0.02, 0.1, { glideTo: 110 }), tone(140, 0.1, 0.01, 0.1, { glideTo: 200, delay: 0.13 })],
  // --- The shiny spoon
  // The shoal: a shimmer of small bells, with one chime at each turn.
  bells: run(6, 0.06, (i) => tone([2093, 2637, 3136, 2349, 2794, 3520][i], 0.05, 0.002, 0.25)),
  chime: [tone(1760, 0.11, 0.002, 0.45), tone(3520, 0.04, 0.002, 0.2)],
  // The pufferfish: a squeak rising fast, then a rubbery bump at the top (the bump is `bump`, where it arrives).
  fright: [tone(700, 0.15, 0.03, 0.12, { glideTo: 2200 })],
  // The turtle: two slow, pleased hums, the second lower.
  hum: (index) => [tone(index === 0 ? 220 : 175, 0.14, 0.1, 0.4, { wave: 'triangle' }), tone(index === 0 ? 440 : 350, 0.04, 0.1, 0.35)],
  // The squid on a dull spoon: three small tings, as on a triangle.
  ting: (index) => [tone(up(1900, index * 2), 0.09, 0.001, 0.22), tone(up(1900, index * 2) * 2.76, 0.03, 0.001, 0.1)],
  // The squid when the spoon flashes: a wet puff and a whistle upward.
  inkPuff: [hiss(600, 1, 0.2, 0.01, 0.14, { glideTo: 250 })],
  whistle: [tone(900, 0.11, 0.03, 0.35, { glideTo: 3200 })],
  // The jellyfish: a ringing glass note that wavers.
  glass: (index) => [tone(1319 - index * 150, 0.09, 0.01, 0.6), tone(1326 - index * 150, 0.08, 0.01, 0.6), tone(2640 - index * 300, 0.03, 0.01, 0.3)],
  // The shark: a clang like a dropped pan, then a rattle.
  clang: [tone(410, 0.16, 0.001, 0.4, { wave: 'square' }), tone(1030, 0.1, 0.001, 0.3), tone(1570, 0.06, 0.001, 0.25), hiss(3000, 1, 0.08, 0.001, 0.05)],
  rattle: (index) => run(6, 0.045, (i) => tone(700 + ((i * 3 + index) % 4) * 160, 0.07, 0.001, 0.03, { wave: 'square' })),
  // The anglerfish: a pop like a flashbulb, then a wobbling slide down.
  flash: [hiss(4200, 1, 0.16, 0.001, 0.04), tone(1800, 0.08, 0.001, 0.05, { glideTo: 2600 })],
  dizzy: [tone(1100, 0.1, 0.02, 0.2, { wave: 'triangle', glideTo: 800 }), tone(900, 0.09, 0.02, 0.2, { wave: 'triangle', glideTo: 620, delay: 0.2 }), tone(700, 0.08, 0.02, 0.24, { wave: 'triangle', glideTo: 430, delay: 0.4 })],
  // The octopus: squeaky rubbing, then one bright ting.
  rub: (index) => [tone(1500 + index * 120, 0.07, 0.03, 0.08, { glideTo: 2000 + index * 120 }), tone(2000 + index * 120, 0.07, 0.03, 0.08, { glideTo: 1500 + index * 120, delay: 0.13 })],
  gleam: [tone(3136, 0.11, 0.001, 0.5), tone(4186, 0.05, 0.001, 0.3)],
  // The blobfish: in the dark a flat hum, by a light a long sigh that sinks.
  flat: [tone(155, 0.13, 0.08, 0.5, { wave: 'triangle' })],
  sigh: [hiss(1400, 1, 0.1, 0.1, 0.6, { glideTo: 400 }), tone(330, 0.07, 0.1, 0.55, { glideTo: 165 })],
  // --- The glow stick
  // The shoal: one dull knock.
  bonk: [tone(190, 0.16, 0.002, 0.07, { wave: 'triangle' }), hiss(500, 3, 0.06, 0.002, 0.03)],
  // The pufferfish: two springy boings.
  boing: (index) => [tone(index === 0 ? 300 : 360, 0.14, 0.004, 0.3, { glideTo: index === 0 ? 620 : 740 }), tone(index === 0 ? 606 : 727, 0.05, 0.004, 0.25, { glideTo: index === 0 ? 300 : 360 })],
  // The turtle: a whistling snore.
  snore: (index) => [hiss(700, 6, 0.08, 0.15, 0.2, { glideTo: 500 }), tone(1700 + index * 80, 0.06, 0.08, 0.3, { glideTo: 2300 + index * 80, delay: 0.3 })],
  // The squid: a bubbling warble, a question and then an answer.
  warble: (index) => run(5, 0.07, (i) => tone(index === 0 ? up(500, i * 2 + (i % 2) * 3) : up(830, -i * 2 - (i % 2) * 3), 0.08, 0.01, 0.06)),
  // The jellyfish: a slow swell of two notes, in and out like breathing.
  breathe: (index) => [tone(index === 0 ? 392 : 523, 0.1, 0.3, 0.35), tone(index === 0 ? 587 : 784, 0.05, 0.3, 0.3)],
  // The shark: a gulp, then a low glowing hum.
  gulpLow: [tone(180, 0.2, 0.02, 0.14, { glideTo: 75 }), hiss(400, 1, 0.08, 0.01, 0.08)],
  glowHum: [tone(98, 0.14, 0.15, 0.5, { wave: 'triangle' }), tone(147, 0.08, 0.15, 0.5), tone(196, 0.05, 0.2, 0.4)],
  // The anglerfish: two rising notes like a sigh, then a soft double thump.
  loveSigh: [tone(330, 0.11, 0.08, 0.2, { wave: 'triangle', glideTo: 392 }), tone(440, 0.1, 0.08, 0.26, { wave: 'triangle', glideTo: 523, delay: 0.26 })],
  thump: [tone(85, 0.2, 0.004, 0.1), tone(85, 0.16, 0.004, 0.12, { delay: 0.17 })],
  // The octopus: a hollow hum from inside the pot.
  potHum: (index) => [tone(index === 0 ? 146 : 164, 0.13, 0.1, 0.3, { wave: 'triangle' }), hiss(index === 0 ? 292 : 328, 12, 0.07, 0.1, 0.3)],
  // The blobfish: a low wobbling grumble.
  grumble: (index) => run(4, 0.09, (i) => tone((index === 0 ? 96 : 86) + (i % 2) * 14, 0.15, 0.02, 0.08, { wave: 'sawtooth' })).concat(tone(260, 0.03, 0.02, 0.3)),
  // --- The cheese
  // The shoal: a chorus of tiny spits.
  spits: (index) => run(5, 0.04, (i) => hiss(2400 + ((i * 2 + index) % 5) * 300, 4, 0.08, 0.001, 0.02)),
  // The pufferfish: three short breaths in, then a burst.
  sniffIn: (index) => [hiss(up(1200, index * 3), 5, 0.08, 0.05, 0.03, { glideTo: up(1700, index * 3) })],
  burst: [hiss(1800, 0.7, 0.24, 0.002, 0.2), tone(500, 0.1, 0.002, 0.14, { glideTo: 180 })],
  // The turtle: a wooden clunk and a hollow roll.
  clunk: [tone(200, 0.2, 0.002, 0.09, { wave: 'triangle', glideTo: 150 }), hiss(700, 5, 0.07, 0.002, 0.04)],
  roll: run(5, 0.11, (i) => tone(170 - i * 6, 0.11 - i * 0.015, 0.01, 0.07, { wave: 'triangle' })),
  // The squid: a wet thump.
  wetThump: [tone(110, 0.2, 0.004, 0.12, { glideTo: 70 }), hiss(380, 1, 0.14, 0.01, 0.2)],
  // The jellyfish: a rubbery twang that rises.
  twang: (index) => [tone(index === 0 ? 180 : 240, 0.15, 0.003, 0.4, { wave: 'sawtooth', glideTo: index === 0 ? 300 : 420 }), tone(index === 0 ? 360 : 480, 0.05, 0.003, 0.3, { glideTo: index === 0 ? 600 : 840 })],
  // The shark: a falling groan, then a splutter.
  groan: [tone(240, 0.16, 0.06, 0.45, { wave: 'sawtooth', glideTo: 90 })],
  splutter: run(6, 0.05, (i) => hiss(900 + (i % 3) * 500, 2, 0.13 - i * 0.012, 0.002, 0.03)),
  // The anglerfish: a plop and a smack of lips.
  plop: [tone(520, 0.15, 0.002, 0.09, { glideTo: 190 })],
  smack: [hiss(2000, 2, 0.14, 0.001, 0.03), tone(700, 0.08, 0.001, 0.05, { glideTo: 1100, delay: 0.06 })],
  // The octopus: a sliding note down, a silence, and a cork pop as it turns back (the pop is `cork`).
  slideDown: [tone(740, 0.12, 0.02, 0.45, { glideTo: 233 })],
  // The blobfish: three sniffs that climb, then a low happy hum.
  sniffUp: (index) => [hiss(up(700, index * 4), 4, 0.1, 0.06, 0.05, { glideTo: up(1000, index * 4) })],
  happyHum: [tone(131, 0.14, 0.1, 0.4, { wave: 'triangle' }), tone(165, 0.1, 0.15, 0.35, { wave: 'triangle' }), tone(196, 0.07, 0.2, 0.3)],
  // --- The old boot
  // The shoal: a hollow rushing with small pops.
  bootRush: (index) => [hiss(index === 0 ? 420 : 520, 7, 0.14, 0.1, 0.25, { glideTo: index === 0 ? 620 : 380 })],
  bootPop: (index) => [tone(index === 0 ? 900 : 1100, 0.09, 0.001, 0.04, { glideTo: index === 0 ? 1500 : 1700 }), tone(index === 0 ? 1200 : 1000, 0.07, 0.001, 0.04, { glideTo: 1900, delay: 0.09 })],
  // The pufferfish: leather creaking tighter, then a pop.
  leather: (index) => [tone(index === 0 ? 150 : 210, 0.11, 0.1, 0.18, { wave: 'sawtooth', glideTo: index === 0 ? 200 : 290 }), hiss(index === 0 ? 1200 : 1700, 9, 0.05, 0.1, 0.18)],
  popOff: [tone(300, 0.2, 0.001, 0.06, { glideTo: 1300 }), hiss(2400, 1, 0.14, 0.001, 0.05)],
  // The turtle: a flap and a thud, twice.
  flap: (index) => [hiss(index === 0 ? 1100 : 1300, 1.5, 0.13, 0.005, 0.07)],
  thud: (index) => [tone(index === 0 ? 100 : 92, 0.2, 0.003, 0.12), hiss(260, 2, 0.06, 0.003, 0.06)],
  // The squid: muffled thumps.
  muffled: (index) => [tone(140 - index * 12, 0.17, 0.008, 0.09, { wave: 'triangle' }), hiss(220, 3, 0.07, 0.008, 0.08)],
  // The jellyfish: a wet plop and a wobble.
  wetPlop: [tone(360, 0.16, 0.003, 0.12, { glideTo: 120 }), hiss(700, 1.5, 0.1, 0.004, 0.1)],
  wobbleLow: run(4, 0.1, (i) => tone(i % 2 ? 247 : 220, 0.1 - i * 0.015, 0.02, 0.09, { wave: 'triangle' })),
  // The shark: a growl that shakes, with flaps.
  growl: (index) => run(5, 0.06, (i) => tone((index === 0 ? 82 : 92) + (i % 2) * 9, 0.16, 0.01, 0.05, { wave: 'sawtooth' })).concat(tone(330, 0.03, 0.01, 0.3)),
  slipper: (index) => [hiss(index === 0 ? 800 : 950, 1, 0.14, 0.004, 0.08), hiss(index === 0 ? 950 : 800, 1, 0.1, 0.004, 0.08, { delay: 0.12 })],
  // The anglerfish: a hopeful note rising, then one falling.
  hopeUp: [tone(392, 0.11, 0.05, 0.4, { wave: 'triangle', glideTo: 587 })],
  hopeDown: [tone(440, 0.1, 0.05, 0.5, { wave: 'triangle', glideTo: 262 })],
  // The octopus: a squelch and a long slither.
  squelch: [hiss(500, 2, 0.17, 0.02, 0.12, { glideTo: 1400 }), tone(200, 0.07, 0.02, 0.12, { glideTo: 320 })],
  slither: [hiss(1500, 3, 0.09, 0.15, 0.4, { glideTo: 600 })],
  // The blobfish: a soft thud and a bubbling snore.
  pillow: [tone(92, 0.17, 0.01, 0.16), hiss(300, 1, 0.05, 0.01, 0.12)],
  bubbleSnore: (index) => run(5, 0.08, (i) => tone((index === 0 ? 200 : 180) + ((i * 5) % 7) * 22, 0.08, 0.008, 0.04)).concat(tone(110, 0.04, 0.02, 0.3)),
  // --- Nothing on the hook: the toy
  // The shoal parts: a soft sweep down and up again, like a hand across strings.
  sweep: [1568, 1319, 1175, 988, 880, 988, 1175, 1319, 1568].map((frequency, index) => tone(frequency, 0.055, 0.004, 0.25, { wave: 'triangle', delay: index * 0.045 })),
  // The pufferfish: a squeak up as it swells, then a long flutter down as it lets its air out.
  puff: [tone(420, 0.16, 0.22, 0.1, { glideTo: 1250 })],
  flutter: (index) => run(3, 0.085, (i) => hiss(270 - (index * 3 + i) * 14, 6, 0.11 - (index * 3 + i) * 0.008, 0.008, 0.055)).concat(tone(520 - index * 90, 0.03, 0.008, 0.2)),
  // The turtle: a rasp of hook on shell. Its knocks are `knock`.
  scratch: [hiss(2400, 2, 0.08, 0.03, 0.22), hiss(1700, 3, 0.05, 0.02, 0.16, { delay: 0.12 })],
  // The squid: a short squirt.
  squirt: [hiss(1300, 1.5, 0.18, 0.01, 0.16, { glideTo: 500 }), tone(700, 0.08, 0.01, 0.14, { glideTo: 250 })],
  // The jellyfish: a glassy chord whose notes beat against their neighbours, so it wobbles.
  wobble: (index) => [523, 529, 659, 666, 784, 791].map((frequency, i) => tone(frequency * (index === 0 ? 1 : 0.89), 0.045, 0.08, 0.7, { delay: Math.floor(i / 2) * 0.06 })),
  // The anglerfish pulls: a long creak as the lines stretch, and a twang when it lets go.
  creak: (index) => [tone(index === 0 ? 90 : 112, 0.08, 0.25, 0.35, { wave: 'sawtooth', glideTo: index === 0 ? 112 : 140 }), hiss(index === 0 ? 400 : 500, 8, 0.05, 0.2, 0.4, { glideTo: index === 0 ? 500 : 620 })],
  twangLine: [tone(180, 0.2, 0.004, 0.5, { wave: 'triangle', glideTo: 110 }), tone(360, 0.08, 0.004, 0.4, { glideTo: 220 })],
  // The octopus shakes the hook three times: three rubbery squeaks, each a little higher.
  squeak: (index) => [tone(620 + index * 40, 0.12, 0.05, 0.09, { glideTo: (620 + index * 40) * 1.42 })],
  // The blobfish yawns its bubble out. The pop is `pop`, a long while later.
  blorp: [tone(110, 0.22, 0.25, 0.35, { glideTo: 260 }), tone(70, 0.12, 0.25, 0.35, { glideTo: 150 })],
}

/** What sounds outside the grid. */
export const OTHER_VOICES: Record<Exclude<OtherCue, 'click' | 'tooth' | 'mew'>, Sound> = {
  // The hook goes into the water: a splash that sinks. And comes out: a splash that rises. Its three drips are sounds of their own (`drip`), one for each drop as the rules let it fall.
  splashIn: [hiss(900, 0.8, 0.24, 0.01, 0.32, { glideTo: 300 }), tone(300, 0.12, 0.005, 0.2, { glideTo: 120 })],
  splashOut: [hiss(500, 0.9, 0.2, 0.02, 0.28, { glideTo: 1800 })],
  drip: (index) => [tone([1400, 1250, 1500][index % 3], index === 0 ? 0.06 : 0.05, 0.002, 0.06, { glideTo: [900, 820, 980][index % 3] })],
  // One thump of the turtle's back flipper, as on wood.
  knock: [tone(220, 0.14, 0.003, 0.07, { wave: 'triangle', glideTo: 170 }), hiss(800, 4, 0.05, 0.002, 0.03)],
  // The shark shuts its mouth.
  snap: [hiss(1800, 1, 0.2, 0.002, 0.05), tone(160, 0.1, 0.002, 0.08, { wave: 'square', glideTo: 90 })],
  // The blobfish's bubble pops under the boat.
  pop: [tone(900, 0.12, 0.002, 0.06, { glideTo: 300 }), hiss(2200, 2, 0.08, 0.002, 0.04)],
  // The tub slops, and slops back; the cat gets wet: a sharp mew and a little hiss.
  slosh: [hiss(500, 1.2, 0.2, 0.05, 0.35, { glideTo: 250 }), hiss(700, 1.2, 0.12, 0.04, 0.3, { glideTo: 380, delay: 0.28 })],
  flinch: [tone(900, 0.1, 0.02, 0.1, { wave: 'triangle', glideTo: 1300, delay: 0.08 }), hiss(4000, 1, 0.04, 0.02, 0.2, { delay: 0.18 })],
  // The gull: two squawks, the second higher at the start.
  squawk: [tone(950, 0.1, 0.02, 0.14, { wave: 'sawtooth', glideTo: 700 }), tone(1050, 0.09, 0.02, 0.14, { wave: 'sawtooth', glideTo: 650, delay: 0.16 })],
  // A bait goes onto the hook, comes off it, or only swings on its peg because the hook is busy.
  baitOn: [tone(660, 0.12, 0.004, 0.08, { wave: 'triangle', glideTo: 990 }), hiss(2600, 3, 0.04, 0.002, 0.03, { delay: 0.07 })],
  baitOff: [tone(880, 0.11, 0.004, 0.08, { wave: 'triangle', glideTo: 520 }), tone(330, 0.06, 0.004, 0.06, { wave: 'triangle', delay: 0.09 })],
  pegTok: [tone(300, 0.1, 0.002, 0.05, { wave: 'triangle' }), hiss(1500, 4, 0.03, 0.002, 0.02)],
  // Whoever bolts up meets the hull with a rubbery bump, or breaks the surface, or is scooped by the net.
  bump: [tone(170, 0.2, 0.003, 0.12, { glideTo: 330 }), tone(330, 0.08, 0.003, 0.2, { glideTo: 170, delay: 0.05 })],
  surface: [hiss(1200, 1, 0.16, 0.01, 0.2, { glideTo: 2400 }), tone(800, 0.05, 0.002, 0.06, { glideTo: 500, delay: 0.14 })],
  scoop: [hiss(900, 2, 0.16, 0.02, 0.16, { glideTo: 2600 }), tone(520, 0.1, 0.01, 0.12, { wave: 'triangle', glideTo: 880, delay: 0.06 })],
  // A catch lands in the tub, bounces off a full one, or is tipped back over the rail. The splash of the last two is a cue of its own (`railSplash`), which the rules give in the step the ring is drawn on the water: one clock, and no delay written here.
  land: [hiss(450, 1.2, 0.2, 0.01, 0.2, { glideTo: 250 }), tone(180, 0.12, 0.004, 0.1)],
  bounce: [tone(260, 0.18, 0.003, 0.1, { glideTo: 520 })],
  tipBack: [tone(520, 0.1, 0.01, 0.1, { wave: 'triangle', glideTo: 300 })],
  railSplash: [hiss(760, 0.95, 0.17, 0.01, 0.26, { glideTo: 300 }), tone(210, 0.07, 0.004, 0.09, { glideTo: 150 })],
  // The shoal scatters before a hunter; the pufferfish and the squid start at one; a follower loses the line in ink.
  scatter: run(6, 0.03, (i) => tone(up(1800, (i * 5) % 9), 0.04, 0.002, 0.05, { wave: 'triangle' })),
  startle: [tone(500, 0.13, 0.02, 0.1, { glideTo: 1500 })],
  inkLost: [tone(400, 0.09, 0.03, 0.3, { wave: 'triangle', glideTo: 200 })],
  // The cat pats the water for the shoal; the cat asleep in the tub is touched; the cat wakes for the next trip.
  plip: [tone(1200, 0.08, 0.002, 0.05, { glideTo: 700 }), hiss(2000, 2, 0.05, 0.002, 0.04)],
  sleepy: [tone(330, 0.09, 0.1, 0.3, { wave: 'triangle', glideTo: 300 }), tone(300, 0.07, 0.1, 0.25, { wave: 'triangle', glideTo: 320, delay: 0.3 })],
  wake: [tone(600, 0.12, 0.1, 0.25, { wave: 'triangle', glideTo: 950 }), tone(950, 0.09, 0.03, 0.25, { wave: 'triangle', glideTo: 700, delay: 0.32 })],
  // A catch is coming up: the cat gets down with a short low mew that falls.
  catDuck: [tone(640, 0.1, 0.015, 0.11, { wave: 'triangle', glideTo: 400 }), hiss(1400, 2, 0.03, 0.01, 0.06, { delay: 0.04 })],
  // The cat's opinion of each catch.
  catPrick: [tone(1300, 0.14, 0.004, 0.1, { wave: 'triangle', glideTo: 1700 }), hiss(4200, 2, 0.05, 0.002, 0.05)],
  catLick: run(3, 0.16, () => hiss(2600, 6, 0.06, 0.03, 0.05)),
  catFrizz: run(9, 0.03, (i) => hiss(3400 + (i % 4) * 300, 5, 0.08, 0.001, 0.014)).concat(tone(1500, 0.08, 0.01, 0.2, { wave: 'triangle', glideTo: 1900 })),
  catPounce: [tone(500, 0.12, 0.03, 0.14, { wave: 'triangle', glideTo: 1200 })],
  catSplash: [hiss(700, 0.8, 0.24, 0.01, 0.3, { glideTo: 260 }), tone(1000, 0.08, 0.02, 0.12, { wave: 'triangle', glideTo: 1400, delay: 0.1 })],
  catPurr: run(8, 0.07, () => tone(52, 0.2, 0.01, 0.045, { wave: 'sawtooth' })).concat(tone(208, 0.05, 0.05, 0.5, { wave: 'triangle' })),
  catSag: [tone(520, 0.1, 0.1, 0.5, { wave: 'triangle', glideTo: 190 })],
  catInked: [hiss(700, 1, 0.2, 0.01, 0.18, { glideTo: 280 }), tone(260, 0.08, 0.01, 0.12, { glideTo: 140 })],
  catSneeze: [hiss(1500, 3, 0.06, 0.12, 0.04, { glideTo: 2200 }), hiss(2400, 0.8, 0.22, 0.002, 0.14, { delay: 0.2 }), tone(1100, 0.07, 0.004, 0.08, { wave: 'triangle', glideTo: 700, delay: 0.2 })],
  // The tow: the gulp, the line creaking tight, the lurch with the cat's yowl, the tub slopping, the hook spat out, the cat shaking itself.
  towGulp: [tone(150, 0.22, 0.02, 0.2, { glideTo: 60 }), hiss(350, 1, 0.1, 0.01, 0.12)],
  towCreak: [tone(105, 0.1, 0.2, 0.3, { wave: 'sawtooth', glideTo: 170 }), hiss(600, 10, 0.06, 0.2, 0.3, { glideTo: 950 })],
  towLurch: [hiss(500, 0.8, 0.18, 0.05, 0.4, { glideTo: 1500 }), tone(700, 0.11, 0.03, 0.3, { wave: 'triangle', glideTo: 1250, delay: 0.1 })],
  towSlop: (index) => [hiss(index % 2 ? 620 : 480, 1.2, 0.17, 0.05, 0.3, { glideTo: index % 2 ? 330 : 260 })],
  towSpit: [hiss(1800, 2, 0.16, 0.002, 0.06), tone(420, 0.14, 0.002, 0.1, { glideTo: 900, delay: 0.03 })],
  towShake: run(6, 0.05, (i) => hiss(i % 2 ? 2600 : 1900, 2, 0.08, 0.004, 0.03)),
  // The tip-out: the tub tips, each catch has its own splash, the cat rides the wave, the boat rocks, the lantern is lit.
  tipCreak: [tone(130, 0.11, 0.1, 0.3, { wave: 'sawtooth', glideTo: 90 }), hiss(450, 1.2, 0.16, 0.2, 0.3, { glideTo: 250, delay: 0.2 })],
  tipSplash: (index) => [hiss(700 + index * 220, 0.9, 0.2, 0.01, 0.28, { glideTo: 280 + index * 60 }), tone(240 + index * 70, 0.1, 0.005, 0.16, { glideTo: 110 + index * 30 })],
  tipWave: [hiss(600, 0.8, 0.16, 0.15, 0.4, { glideTo: 1100 }), tone(800, 0.1, 0.05, 0.35, { wave: 'triangle', glideTo: 1300, delay: 0.1 })],
  tipRock: [tone(95, 0.14, 0.02, 0.3, { wave: 'triangle' }), hiss(420, 1, 0.1, 0.05, 0.35, { glideTo: 300, delay: 0.1 })],
  lantern: [tone(1047, 0.08, 0.02, 0.5), tone(1568, 0.05, 0.05, 0.5, { delay: 0.08 }), hiss(3000, 3, 0.03, 0.002, 0.03)],
}

/** The notes of one cue. */
export function notesOf(cue: Cue): Note[] {
  if (cue.name === 'click') return click(cue.depth ?? 0, cue.up === true)
  if (cue.name === 'tooth') return tooth(cue.index ?? 0)
  if (cue.name === 'mew') return MEWS[Math.min(MEWS.length - 1, Math.max(0, cue.index ?? 0))]
  const sound: Sound = cue.name in GRID_VOICES ? GRID_VOICES[cue.name as CueName] : OTHER_VOICES[cue.name as keyof typeof OTHER_VOICES]
  return typeof sound === 'function' ? sound(cue.index ?? 0) : sound
}

/** Everything one step set off, sorted by whose it is (`by`: a creature, the scene, the cat; none for the rest), so that each can be stopped by itself. */
export function partsFor(cues: readonly Cue[]): { tag: string; notes: Note[] }[] {
  const parts: { tag: string; notes: Note[] }[] = []
  for (const cue of cues) {
    const tag = cue.by ?? ''
    let part = parts.find((each) => each.tag === tag)
    if (!part) parts.push((part = { tag, notes: [] }))
    part.notes.push(...notesOf(cue))
  }
  return parts
}

/** Everything one step set off, as one list of notes for one voice. */
export function notesFor(cues: readonly Cue[]): Note[] {
  return cues.flatMap(notesOf)
}
