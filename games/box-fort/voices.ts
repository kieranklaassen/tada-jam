import type { Note } from './audio'

// Every sound of the game as plain numbers. Nobody has listened to them: they
// are written from the words of the sheet (ART.md), kept short, and held in
// range by the test beside this file. Each sound has a few variants, and the
// game picks one from its own seeded stream.

const tone = (frequency: number, glideTo: number, peak: number, attack: number, decay: number, delay = 0, wave: OscillatorType = 'sine'): Note => ({ kind: 'tone', frequency, glideTo, wave, peak, attack, decay, delay })
const noise = (frequency: number, q: number, peak: number, attack: number, decay: number, delay = 0, glideTo?: number): Note => ({ kind: 'noise', frequency, q, glideTo, peak, attack, decay, delay })

/** Two blades closing: a bright click and its darker echo off the board. */
const snip = (bright: number, dark: number): Note[] => [noise(bright, 2.6, 0.15, 0.002, 0.03), noise(dark, 1.4, 0.09, 0.002, 0.045, 0.012)]

export const VOICES = {
  /** The blades close once along a cut. */
  snip: [snip(5200, 2500), snip(5600, 2300), snip(4800, 2700)],
  /** The blades bite into the board when the finger lands: a snip with the box's hollow knock under it. */
  bite: [[...snip(4600, 2200), tone(170, 110, 0.16, 0.004, 0.09, 0, 'triangle')], [...snip(4900, 2000), tone(150, 100, 0.16, 0.004, 0.1, 0, 'triangle')]],
  /** A snip at nothing: two light clicks in the air. */
  air: [[noise(6400, 3, 0.09, 0.002, 0.025), noise(6000, 3, 0.08, 0.002, 0.025, 0.1)], [noise(6800, 3, 0.09, 0.002, 0.025), noise(6200, 3, 0.08, 0.002, 0.025, 0.12)]],
  /** A tap pokes a peep-hole: a cork pop. */
  pop: [[tone(540, 250, 0.22, 0.003, 0.07), noise(1800, 1, 0.08, 0.002, 0.03)], [tone(600, 280, 0.22, 0.003, 0.07), noise(2000, 1, 0.08, 0.002, 0.03)]],
  /** The cut piece lands flat on the rug. */
  slap: [[noise(700, 0.8, 0.22, 0.003, 0.11), tone(110, 80, 0.14, 0.004, 0.1)], [noise(620, 0.8, 0.22, 0.003, 0.12), tone(98, 74, 0.14, 0.004, 0.11)]],
  /** The small disc of a peep-hole rolls away on its edge. */
  roll: [[tone(1800, 1700, 0.06, 0.002, 0.02, 0, 'triangle'), tone(1700, 1600, 0.05, 0.002, 0.02, 0.09, 'triangle'), tone(1600, 1500, 0.04, 0.002, 0.02, 0.2, 'triangle')]],
  /** The scissors set themselves down on the rug. */
  clack: [[tone(1500, 1300, 0.07, 0.002, 0.03, 0, 'triangle'), noise(3000, 2, 0.05, 0.002, 0.03)]],
  /** The cat has seen something: a short rising chirp. */
  mrrp: [[tone(520, 800, 0.15, 0.02, 0.15), tone(1040, 1600, 0.04, 0.02, 0.12)], [tone(480, 760, 0.15, 0.02, 0.17), tone(960, 1520, 0.04, 0.02, 0.13)]],
  /** The cat is touched: up and then down. */
  mew: [[tone(620, 900, 0.14, 0.02, 0.09), tone(900, 560, 0.14, 0.01, 0.26, 0.09)], [tone(680, 960, 0.14, 0.02, 0.08), tone(960, 600, 0.14, 0.01, 0.24, 0.08)]],
  /** The cat lands inside the box. */
  thud: [[tone(95, 60, 0.26, 0.004, 0.16), noise(300, 0.7, 0.1, 0.003, 0.09)], [tone(88, 56, 0.26, 0.004, 0.17), noise(280, 0.7, 0.1, 0.003, 0.09)]],
  /** One eye comes to a peep-hole. */
  peep: [[tone(1250, 1500, 0.07, 0.01, 0.07), tone(1500, 1800, 0.06, 0.01, 0.07, 0.11)]],
  /** A paw pats the board from inside. */
  pat: [[noise(900, 1.2, 0.12, 0.003, 0.05), tone(300, 240, 0.07, 0.003, 0.05)], [noise(820, 1.2, 0.12, 0.003, 0.05), tone(270, 220, 0.07, 0.003, 0.05)], [noise(980, 1.2, 0.11, 0.003, 0.05), tone(330, 260, 0.07, 0.003, 0.05)]],
  /** The whole head comes through and the ears spring up. */
  boing: [[tone(300, 620, 0.16, 0.01, 0.14), tone(900, 1300, 0.07, 0.005, 0.06, 0.13), tone(1000, 1400, 0.07, 0.005, 0.06, 0.2)]],
  /** The cat jumps back up on top. */
  hop: [[tone(420, 660, 0.12, 0.01, 0.1), tone(120, 84, 0.16, 0.004, 0.11, 0.2)]],
  /** The baby squeals at what it sees. */
  squeal: [[tone(900, 1500, 0.12, 0.03, 0.2, 0, 'triangle'), tone(1300, 1700, 0.09, 0.02, 0.14, 0.18, 'triangle')], [tone(1000, 1600, 0.12, 0.03, 0.18, 0, 'triangle'), tone(1400, 1800, 0.09, 0.02, 0.14, 0.16, 'triangle')]],
  /** The baby shakes its rattle. */
  rattle: [[noise(4200, 4, 0.1, 0.002, 0.025), noise(4500, 4, 0.1, 0.002, 0.025, 0.06), noise(4100, 4, 0.1, 0.002, 0.025, 0.12), noise(4600, 4, 0.09, 0.002, 0.025, 0.19), noise(4300, 4, 0.08, 0.002, 0.03, 0.27)]],
  /** The grandmother is startled. */
  oh: [[tone(330, 440, 0.12, 0.03, 0.22, 0, 'triangle')], [tone(350, 470, 0.12, 0.03, 0.2, 0, 'triangle')]],
  /** The grandmother's needles. */
  click: [[tone(2400, 2300, 0.07, 0.001, 0.02, 0, 'triangle'), tone(2100, 2000, 0.07, 0.001, 0.02, 0.1, 'triangle'), tone(2400, 2300, 0.07, 0.001, 0.02, 0.2, 'triangle'), tone(2100, 2000, 0.06, 0.001, 0.02, 0.3, 'triangle')]],
  /** A sofa cushion is pressed and lets its air go. */
  puff: [[noise(520, 0.7, 0.18, 0.02, 0.22, 0, 260)], [noise(460, 0.7, 0.18, 0.02, 0.24, 0, 230)]],
  // --- The box ---------------------------------------------------------------
  /** A box dragged over the rug: a hollow scrape. */
  scrape: [[noise(240, 0.9, 0.1, 0.03, 0.16, 0, 200)], [noise(210, 0.9, 0.1, 0.03, 0.18, 0, 180)], [noise(270, 0.9, 0.09, 0.03, 0.15, 0, 220)]],
  /** A box lands: one deep thump. */
  thump: [[tone(96, 62, 0.3, 0.004, 0.2), noise(220, 0.7, 0.12, 0.003, 0.1)], [tone(88, 58, 0.3, 0.004, 0.22), noise(200, 0.7, 0.12, 0.003, 0.1)]],
  /** A box tips over an edge: one knock of three, each lower. */
  knock: [[tone(210, 150, 0.2, 0.003, 0.09, 0, 'triangle'), noise(500, 0.8, 0.08, 0.003, 0.05)]],
  /** A flat box springs open as it leaves the heap. */
  unfold: [[noise(900, 1, 0.12, 0.01, 0.08, 0, 1500), tone(160, 230, 0.12, 0.01, 0.1, 0.04, 'triangle')]],
  /** A box folds flat on the heap. */
  fold: [[noise(1300, 1, 0.12, 0.005, 0.1, 0, 600), noise(480, 0.8, 0.14, 0.003, 0.09, 0.1)]],
  /** A box with no hole is set down in the dark. */
  boom: [[tone(72, 52, 0.3, 0.01, 0.45), noise(120, 0.6, 0.1, 0.01, 0.3)]],
  /** The cat lands on a lid, which dips: a drum. */
  drum: [[tone(130, 96, 0.26, 0.004, 0.22, 0, 'triangle'), tone(260, 200, 0.07, 0.004, 0.1)]],
  /** A short purr: a slow flutter. */
  purr: [[0, 1, 2, 3, 4, 5, 6, 7].map((i) => tone(58, 54, 0.11, 0.012, 0.035, i * 0.055, 'triangle')), [0, 1, 2, 3, 4, 5, 6, 7].map((i) => tone(62, 57, 0.11, 0.012, 0.035, i * 0.05, 'triangle'))].map((notes) => notes),
  /** The same purr from under a blanket. */
  hush: [[0, 1, 2, 3, 4, 5].map((i) => tone(64, 56, 0.07, 0.015, 0.04, i * 0.06))].map((notes) => notes),
  /** The baby's palms slapping along the floor. */
  palms: [[noise(1100, 1, 0.12, 0.003, 0.04), noise(1000, 1, 0.12, 0.003, 0.04, 0.16), noise(1150, 1, 0.11, 0.003, 0.04, 0.32), noise(1050, 1, 0.11, 0.003, 0.04, 0.48)]],
  /** The baby giggles. */
  giggle: [[tone(700, 880, 0.1, 0.02, 0.07, 0, 'triangle'), tone(780, 960, 0.1, 0.02, 0.07, 0.12, 'triangle'), tone(860, 1040, 0.09, 0.02, 0.07, 0.24, 'triangle'), tone(760, 700, 0.08, 0.02, 0.1, 0.36, 'triangle')]],
  /** A long cardboard creak. */
  creak: [[tone(190, 260, 0.1, 0.05, 0.4, 0, 'sawtooth'), noise(1500, 6, 0.04, 0.05, 0.35, 0, 2100)]],
  /** The grandmother clucks. */
  cluck: [[tone(420, 300, 0.12, 0.005, 0.05, 0, 'triangle'), tone(440, 310, 0.12, 0.005, 0.05, 0.13, 'triangle')]],
  // --- The hole --------------------------------------------------------------
  /** Claws scrabbling on board. */
  claws: [[0, 1, 2, 3, 4, 5].map((i) => noise(2600 + (i % 3) * 300, 3, 0.08, 0.002, 0.03, i * 0.07))].map((notes) => notes),
  /** A toy tumbling down inside a box. */
  tumble: [[noise(3800, 4, 0.09, 0.002, 0.03), tone(240, 180, 0.12, 0.003, 0.07, 0.07, 'triangle'), noise(3600, 4, 0.07, 0.002, 0.03, 0.17), tone(200, 150, 0.1, 0.003, 0.07, 0.24, 'triangle')]],
  /** A toy too big for the hole springs back. */
  sproing: [[tone(240, 520, 0.16, 0.005, 0.1, 0, 'triangle'), tone(520, 300, 0.1, 0.005, 0.16, 0.1, 'triangle')]],
  /** The grandmother finds a door: a rising "ooh". */
  ooh: [[tone(300, 480, 0.13, 0.05, 0.36, 0, 'triangle')]],
  /** Her head meets the board. */
  bonk: [[tone(150, 110, 0.2, 0.004, 0.12), noise(380, 0.8, 0.07, 0.003, 0.06)]],
  /** A hole lights up in the dark: one soft bell. */
  bell: [[tone(880, 880, 0.1, 0.004, 0.5), tone(1760, 1760, 0.03, 0.004, 0.3)]],
  // --- The tape --------------------------------------------------------------
  /** Tape pulled off the roll: a long rising rip. */
  rip: [[noise(1200, 2.2, 0.14, 0.02, 0.34, 0, 3200)], [noise(1100, 2.2, 0.14, 0.02, 0.36, 0, 3000)]],
  /** A strip patted down. */
  press: [[noise(600, 0.9, 0.14, 0.003, 0.06), tone(180, 150, 0.08, 0.003, 0.05)]],
  /** A strip springs back to the roll. */
  zip: [[noise(3000, 3, 0.13, 0.004, 0.12, 0, 900)]],
  /** The roll spins. */
  whirr: [[noise(1700, 5, 0.08, 0.02, 0.4, 0, 700)]],
  /** A strip flaps on a shaken paw. */
  flap: [[noise(1500, 1.2, 0.12, 0.004, 0.06)], [noise(1700, 1.2, 0.12, 0.004, 0.06)]],
  /** The roll bowled along the rug: ticks, and a wobbling ring down. */
  trundle: [[...[0, 1, 2, 3, 4, 5].map((i) => tone(900, 860, 0.06, 0.002, 0.025, i * 0.11, 'triangle')), tone(700, 420, 0.1, 0.01, 0.5, 0.7, 'triangle')]].map((notes) => notes),
  /** A thumb pressed along a strip: a squeak. */
  squeak: [[tone(1500, 2100, 0.07, 0.02, 0.1)], [tone(1400, 2000, 0.07, 0.02, 0.11)]],
  /** Tape with light behind it: a dry paper crackle. */
  crackle: [[0, 1, 2, 3, 4].map((i) => noise(5200 + i * 300, 5, 0.06, 0.001, 0.015, i * 0.045 + (i % 2) * 0.02))].map((notes) => notes),
  /** A strip torn off the fort. */
  tear: [[noise(2400, 2, 0.16, 0.005, 0.2, 0, 900)], [noise(2200, 2, 0.16, 0.005, 0.22, 0, 800)]],
  // --- The blanket -----------------------------------------------------------
  /** The blanket billows: a whoomp of air. */
  whoomp: [[noise(160, 0.6, 0.22, 0.05, 0.3, 0, 90)]],
  /** It settles: a long hush. */
  settle: [[noise(900, 0.5, 0.07, 0.1, 0.6, 0, 400)]],
  /** It slides off: a long hiss. */
  hiss: [[noise(2600, 0.8, 0.07, 0.08, 0.55, 0, 1400)]],
  /** It heaps on the rug. */
  flump: [[noise(260, 0.7, 0.2, 0.01, 0.2, 0, 150)]],
  /** Needles under a blanket. */
  muffle: [[tone(900, 860, 0.05, 0.002, 0.03), tone(800, 760, 0.05, 0.002, 0.03, 0.12), tone(900, 860, 0.05, 0.002, 0.03, 0.24), tone(800, 760, 0.04, 0.002, 0.03, 0.36)]],
  /** A roof with light under it: a low warm hum. */
  warm: [[tone(110, 110, 0.07, 0.3, 0.9), tone(165, 165, 0.04, 0.3, 0.8)]],
  // --- The cushion -----------------------------------------------------------
  /** A cushion swells out inside a box. */
  whumpf: [[noise(300, 0.7, 0.2, 0.03, 0.18, 0, 190)], [noise(330, 0.7, 0.2, 0.03, 0.17, 0, 200)]],
  /** A full box stretches. */
  stretch: [[tone(150, 270, 0.1, 0.1, 0.34, 0, 'sawtooth')]],
  /** It fires the cushion back out. */
  poomf: [[noise(400, 0.7, 0.24, 0.004, 0.2, 0, 160), tone(120, 70, 0.14, 0.004, 0.14)]],
  /** The cat kneads: a slow tread of ticks. */
  tread: [[0, 1, 2, 3, 4, 5].map((i) => noise(700 + (i % 2) * 120, 1.4, 0.07, 0.004, 0.04, i * 0.28))].map((notes) => notes),
  /** The baby blows a raspberry. */
  raspberry: [[0, 1, 2, 3, 4, 5, 6].map((i) => tone(120, 100, 0.12, 0.004, 0.022, i * 0.04, 'sawtooth'))].map((notes) => notes),
  /** A cushion sat on lets its air go: a long wheeze, falling. */
  wheeze: [[noise(1300, 3, 0.1, 0.05, 0.9, 0, 380)]],
  /** A cushion shuts off the light of a hole. */
  mff: [[noise(200, 0.8, 0.14, 0.02, 0.14, 0, 120)]],
  // --- The string of lights ----------------------------------------------------
  /** A bulb settles: a small glass tink. */
  tink: [[tone(2300, 2300, 0.07, 0.002, 0.12)], [tone(2600, 2600, 0.07, 0.002, 0.12)], [tone(2050, 2050, 0.07, 0.002, 0.12)], [tone(2900, 2900, 0.06, 0.002, 0.12)]],
  /** The string dropped in a tangle: a glassy rattle. */
  glass: [[0, 1, 2, 3, 4, 5].map((i) => tone(2000 + ((i * 7) % 5) * 260, 1900 + ((i * 7) % 5) * 260, 0.06, 0.002, 0.07, i * 0.05))].map((notes) => notes),
  /** The tangle pulled straight: a slither. */
  slither: [[noise(3200, 1.5, 0.08, 0.04, 0.3, 0, 1800), tone(2300, 2300, 0.04, 0.002, 0.08, 0.2)]],
  /** Every bulb shaken at once: a run of small bells. */
  jingle: [[0, 1, 2, 3, 4, 5, 6, 7].map((i) => tone(1800 + ((i * 5) % 7) * 180, 1800 + ((i * 5) % 7) * 180, 0.06, 0.002, 0.1, i * 0.07))].map((notes) => notes),
  /** The grandmother is pleased: two notes. */
  hum: [[tone(392, 392, 0.1, 0.04, 0.22, 0, 'triangle'), tone(494, 494, 0.1, 0.04, 0.3, 0.26, 'triangle')]],
  /** A bulb comes on in the dark: one plink of a rising run. */
  plink: [[tone(1047, 1047, 0.09, 0.003, 0.22), tone(2094, 2094, 0.025, 0.003, 0.12)]],
  /** The wall switch. */
  flick: [[tone(1700, 1300, 0.1, 0.001, 0.03, 0, 'square'), noise(2400, 2, 0.06, 0.001, 0.03)]],
} as const satisfies Record<string, readonly (readonly Note[])[]>

export type SoundId = keyof typeof VOICES

export const SOUNDS = Object.keys(VOICES) as SoundId[]

/** How many variants a sound has. */
export const variantsOf = (sound: SoundId): number => VOICES[sound].length

/** The notes of one sound, with every pitch multiplied by `pitch` and every peak by `gain`. */
export function notesOf(sound: SoundId, variant = 0, pitch = 1, gain = 1): Note[] {
  const notes: readonly Note[] = VOICES[sound][variant % VOICES[sound].length]
  return notes.map((note) => ({ ...note, frequency: note.frequency * pitch, glideTo: note.glideTo === undefined ? undefined : note.glideTo * pitch, peak: note.peak * gain }))
}
