import type { Note } from './audio'
import type { Kind } from './toys'

// Every sound of the game as plain numbers: lists of tones and bands of
// noise that `voiceOf` in audio.ts turns into sound. They were written from
// the words of the design sheet on a machine that cannot hear, so a test
// (voices.test.ts) holds every pitch, peak and length in range, and no two
// voices are the same list.

const t = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const n = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })

/** A bleat: a reedy tone cut into quick pulses, since a sheep's voice trembles. */
const bleat = (pitch: number, pulses: number, peak: number, start = 0): Note[] =>
  Array.from({ length: pulses }, (_, i) => t(pitch * (i % 2 === 0 ? 1 : 0.94), peak, 0.012, 0.075, { wave: 'sawtooth', delay: start + i * 0.07, glideTo: pitch * 0.9 }))

export const VOICES = {
  // --- The hand -------------------------------------------------------------
  /** A toy hops out of its slot: a dry wooden "tok". */
  tok: [t(520, 0.2, 0.002, 0.07, { wave: 'triangle', glideTo: 360 }), n(1800, 2, 0.08, 0.001, 0.03)],
  /** A toy in the hand spins once: "whip". */
  whip: [n(900, 3, 0.12, 0.03, 0.16, { glideTo: 3200 }), t(700, 0.06, 0.02, 0.12, { glideTo: 1300 })],
  /** A toy goes back into its slot: a soft "clack". */
  clack: [t(300, 0.14, 0.002, 0.06, { wave: 'triangle', glideTo: 240 }), n(1200, 2, 0.05, 0.001, 0.025)],
  /** A toy comes down. Played lower the heavier the toy is. */
  knock: [t(220, 0.34, 0.002, 0.16, { wave: 'triangle', glideTo: 150 }), t(440, 0.1, 0.002, 0.06), n(900, 1.2, 0.12, 0.001, 0.05)],
  /** A toy comes down in the water. */
  splash: [n(700, 0.8, 0.22, 0.004, 0.32, { glideTo: 300 }), t(260, 0.16, 0.004, 0.14, { glideTo: 120 }), n(2600, 1.5, 0.07, 0.02, 0.2, { delay: 0.05 })],
  /** A toy lands beside another: "clack", and both rock. */
  bump: [t(410, 0.16, 0.002, 0.05, { wave: 'square', glideTo: 330 }), t(330, 0.1, 0.002, 0.07, { wave: 'triangle', delay: 0.06 })],

  // --- The island, the sea and the sky ----------------------------------------
  /** Bare land thumped like a drum. */
  thump: [t(110, 0.4, 0.003, 0.26, { glideTo: 62 }), n(240, 0.9, 0.12, 0.002, 0.08)],
  /** Bare sea: a plop and a ring. */
  plop: [t(380, 0.2, 0.004, 0.11, { glideTo: 920 }), n(1500, 2, 0.05, 0.01, 0.12, { delay: 0.03 })],
  /** A finger takes hold of the rim. */
  clunk: [t(150, 0.24, 0.002, 0.09, { wave: 'triangle', glideTo: 110 }), n(500, 1.5, 0.08, 0.001, 0.04)],
  /** A peg goes by. */
  peg: [t(980, 0.09, 0.001, 0.035, { wave: 'triangle', glideTo: 760 })],
  /** One grain of the turntable's rumble. Played lower and softer as the island slows. */
  rumble: [n(120, 0.7, 0.2, 0.02, 0.14), t(58, 0.1, 0.02, 0.12)],
  /** Bare sky: a breath of wind. */
  wind: [n(600, 0.6, 0.07, 0.12, 0.45, { glideTo: 1100 })],

  // --- The lighthouse -----------------------------------------------------------
  ding: [t(1320, 0.16, 0.003, 0.5), t(1980, 0.06, 0.003, 0.3)],
  /** The beam comes round: a hum up and down. */
  hum: [t(196, 0.07, 0.25, 0.5, { glideTo: 262 }), t(262, 0.05, 0.3, 0.5, { delay: 0.6, glideTo: 196 })],
  foghorn: [t(98, 0.2, 0.08, 0.75, { wave: 'sawtooth', glideTo: 92 }), t(147, 0.09, 0.1, 0.7, { wave: 'triangle' })],
  /** Tapped: one blink of the lamp, "ting". It blinks three times (TAP, below). */
  blink: [t(1560, 0.13, 0.002, 0.09)],

  // --- The boat -------------------------------------------------------------------
  /** On land: one wet slap of the hull. */
  slap: [n(420, 1.2, 0.2, 0.002, 0.07, { glideTo: 260 }), t(170, 0.1, 0.002, 0.05, { glideTo: 120 })],
  /** In the sea: the sail fills with a creak and the wake hisses. */
  sail: [t(310, 0.07, 0.05, 0.22, { wave: 'sawtooth', glideTo: 370 }), n(3200, 0.8, 0.06, 0.1, 0.6, { delay: 0.12 })],
  bell: [t(2090, 0.12, 0.002, 0.4), t(3140, 0.04, 0.002, 0.25)],
  /** Tapped on land: it springs up. */
  spring: [t(300, 0.06, 0.02, 0.26, { glideTo: 620 })],
  /** And belly-flops: "splat". */
  splat: [n(520, 0.7, 0.26, 0.002, 0.13, { glideTo: 180 }), t(140, 0.18, 0.002, 0.1, { glideTo: 80 })],
  /** Tapped in the sea: one "toot". It toots twice (TAP, below). */
  toot: [t(466, 0.16, 0.015, 0.13, { wave: 'square' })],
  /** And it darts ahead, leaving foam. */
  foam: [n(2400, 0.9, 0.06, 0.08, 0.5)],
  /** The boat afloat: the hiss of its wake, with the creak. */
  wake: [n(3200, 0.8, 0.05, 0.1, 0.6)],

  // --- The sheep ------------------------------------------------------------------
  /** Set down: a soft thud and a "baa". */
  baa: [t(170, 0.16, 0.003, 0.09, { glideTo: 120 }), ...bleat(390, 5, 0.11, 0.1)],
  /** Tapped: one pulse of its "BAA!". Seven of them make the bleat (TAP, below). */
  bigBaa: bleat(470, 1, 0.17),
  /** In the sea: "blub-baa". */
  blub: [t(210, 0.12, 0.01, 0.07, { glideTo: 520 }), t(250, 0.1, 0.01, 0.07, { delay: 0.11, glideTo: 610 }), ...bleat(350, 3, 0.07, 0.24)],
  /** Asked of a tree it cannot reach: "baa?", rising. */
  baaAsk: bleat(360, 4, 0.09).map((note, i) => ({ ...note, frequency: note.frequency * (1 + i * 0.07), glideTo: undefined })),
  /** Grass or leaves between the teeth. */
  munch: [n(1900, 2.2, 0.1, 0.004, 0.05), n(1500, 2.2, 0.09, 0.004, 0.06, { delay: 0.13 })],
  crunch: [n(2600, 3, 0.13, 0.002, 0.04), n(900, 1.5, 0.08, 0.002, 0.05, { delay: 0.02 }), n(2100, 3, 0.1, 0.002, 0.05, { delay: 0.15 })],
  hic: [t(540, 0.13, 0.004, 0.05, { glideTo: 1080 })],

  // --- The tree -------------------------------------------------------------------
  /** Set down: the crown shakes itself out. */
  rustle: [n(3800, 1.1, 0.09, 0.03, 0.2), n(2900, 1.1, 0.07, 0.03, 0.24, { delay: 0.16 })],
  /** In the sea: a hollow log rolls over, "glonk". */
  glonk: [t(175, 0.2, 0.004, 0.2, { wave: 'triangle', glideTo: 131 }), t(350, 0.05, 0.004, 0.1)],
  /** Tapped: one "shake". It shakes twice (TAP, below). */
  shake: [n(3300, 1.4, 0.12, 0.01, 0.09)],
  /** And every leaf flies off. */
  flutter: [n(4200, 0.8, 0.09, 0.02, 0.3)],
  /** The leaves pop back on. */
  pop: [t(300, 0.2, 0.002, 0.07, { glideTo: 900 }), n(2400, 2, 0.06, 0.001, 0.03)],
  /** The eaten tree shivers: "brrr". */
  brrr: Array.from({ length: 6 }, (_, i) => n(700, 3, 0.07, 0.004, 0.03, { delay: i * 0.045 })),

  // --- The house ------------------------------------------------------------------
  /** Set down: the door pops open and shut. */
  door: [t(620, 0.1, 0.002, 0.04, { wave: 'square', delay: 0.18 }), t(480, 0.12, 0.002, 0.05, { wave: 'square', delay: 0.32 })],
  /** One smoke ball leaves the chimney. */
  whoomp: [n(260, 0.9, 0.12, 0.03, 0.2, { glideTo: 520 }), t(120, 0.07, 0.02, 0.16, { glideTo: 180 })],
  /** In the sea the chimney blows a bubble. */
  blop: [t(240, 0.14, 0.008, 0.08, { glideTo: 760 })],
  /** Tapped: the roof lifts like a lid. */
  lid: [t(260, 0.1, 0.02, 0.16, { wave: 'triangle', glideTo: 520 })],
  /** And claps down: "clap!". */
  clap: [n(1600, 0.8, 0.26, 0.001, 0.06), t(230, 0.14, 0.002, 0.08, { wave: 'triangle' })],

  // --- The residents ----------------------------------------------------------------
  /** The cat is landed on: "mrrOW!". */
  mrow: [t(420, 0.07, 0.03, 0.1, { wave: 'sawtooth', glideTo: 520 }), t(560, 0.2, 0.04, 0.3, { wave: 'sawtooth', delay: 0.1, glideTo: 1180 }), t(1180, 0.12, 0.01, 0.22, { wave: 'sawtooth', delay: 0.42, glideTo: 640 })],
  /** The cat is tapped: a purring chirp. */
  prrp: [...Array.from({ length: 7 }, (_, i) => t(150 + i * 14, 0.07, 0.004, 0.022, { wave: 'sawtooth', delay: i * 0.028 })), t(520, 0.11, 0.02, 0.14, { delay: 0.2, glideTo: 880 })],
  /** The cat pats the bare ground. */
  pat: [t(190, 0.1, 0.002, 0.05, { glideTo: 140 }), n(800, 1.4, 0.04, 0.001, 0.03)],
  /** The gull sees a toy land: "kwuk?". */
  kwuk: [t(700, 0.11, 0.008, 0.06, { wave: 'square', glideTo: 560 }), t(620, 0.12, 0.008, 0.1, { wave: 'square', delay: 0.1, glideTo: 930 })],
  /** The gull is tapped: "KYAH!". */
  kyah: [t(1250, 0.2, 0.01, 0.3, { wave: 'sawtooth', glideTo: 760 }), n(2300, 2, 0.08, 0.01, 0.26)],
  /** Its buoy rocks and clangs under it. */
  clang: [t(830, 0.13, 0.002, 0.7), t(1245, 0.06, 0.002, 0.5)],
  /** The gull is lifted by a smoke ball: "wheee". */
  whee: [t(900, 0.07, 0.05, 0.3, { glideTo: 1500 })],
  /** The whale blows, and the drops come down. */
  spout: [n(1400, 0.7, 0.2, 0.04, 0.5, { glideTo: 3000 }), ...Array.from({ length: 5 }, (_, i) => t(1500 + ((i * 370) % 900), 0.04, 0.002, 0.04, { delay: 0.6 + i * 0.09 }))],
  /** The wave wakes and rears: a long rising "hwooo", as long as its rearing. */
  yawn: [t(140, 0.14, 0.35, 0.95, { glideTo: 360 }), n(480, 0.6, 0.09, 0.4, 0.9, { glideTo: 1300 })],
  /** The wave is called off and sinks back: a short yawn going down. */
  yawnDown: [t(320, 0.12, 0.06, 0.6, { glideTo: 130 }), n(1000, 0.6, 0.06, 0.05, 0.5, { glideTo: 400 })],
  /** The wave rolls over the island: a long "shhhhh". */
  roll: [n(900, 0.5, 0.2, 0.5, 1.5, { glideTo: 420 }), n(2800, 0.7, 0.07, 0.6, 1.3, { delay: 0.2 })],
  /** The wave is back at its edge: a sigh. */
  sigh: [n(700, 0.5, 0.1, 0.1, 0.7, { glideTo: 300 }), t(230, 0.05, 0.1, 0.5, { glideTo: 150 })],

  // --- The island spun ------------------------------------------------------------
  /** The lamp's beam whips once round: "whoosh", up. */
  whoosh: [n(700, 1.2, 0.13, 0.12, 0.3, { glideTo: 2600 })],
  /** And down again as it comes back round. */
  whooshDown: [n(2600, 1.2, 0.08, 0.02, 0.2, { glideTo: 900 })],
  /** The beam smeared to a ribbon: a whirr, played higher the faster the island turns. */
  whirr: [t(330, 0.06, 0.03, 0.2, { wave: 'triangle', glideTo: 420 }), n(2400, 3, 0.03, 0.03, 0.18)],
  /** The boat slides round on its keel: "skreee". */
  skree: [t(1700, 0.05, 0.02, 0.2, { wave: 'sawtooth', glideTo: 2300 }), n(3200, 4, 0.05, 0.02, 0.2)],
  /** The boat surfs backward on the turning water: "whee", and a splash. */
  surf: [t(700, 0.08, 0.04, 0.3, { glideTo: 1250 }), n(900, 0.8, 0.12, 0.004, 0.2, { delay: 0.28 })],
  /** The sheep slides stiff-legged: a wobbling "baa-aa-aa". */
  slideBaa: bleat(430, 9, 0.11).map((note, i) => ({ ...note, frequency: note.frequency * (1 + 0.07 * Math.sin(i * 2.1)) })),
  /** The tree's crown whips round after its trunk: "swish". */
  swish: [n(2600, 1.3, 0.11, 0.05, 0.22, { glideTo: 5000 })],
  /** The house's door and shutters bang: "clack-clack-clack". */
  clackclack: [0, 0.09, 0.18].map((delay, i) => t(560 + i * 70, 0.1, 0.002, 0.035, { wave: 'square', delay, glideTo: 400 })),
  /** The cat dragged with its claws in: "skrrrt". */
  skrrt: [n(2100, 5, 0.09, 0.01, 0.2, { glideTo: 1300 }), t(240, 0.04, 0.01, 0.16, { wave: 'sawtooth' })],
  /** The cat staggers when the island stops: "mrr-rr-ow". */
  stagger: [t(380, 0.08, 0.02, 0.1, { wave: 'sawtooth' }), t(350, 0.08, 0.02, 0.1, { wave: 'sawtooth', delay: 0.16 }), t(330, 0.1, 0.03, 0.26, { wave: 'sawtooth', delay: 0.32, glideTo: 520 })],
  /** The gull's wound-up neck spins back: "wrrrip, kyuk". */
  wrrrip: [...Array.from({ length: 8 }, (_, i) => n(1500 + i * 220, 4, 0.06, 0.003, 0.025, { delay: i * 0.035 })), t(760, 0.12, 0.008, 0.09, { wave: 'square', delay: 0.36, glideTo: 600 })],

  // --- The pairs and the other cells ----------------------------------------------
  /** The boat afloat: a creak of its mast. */
  creak: [t(210, 0.05, 0.05, 0.16, { wave: 'sawtooth', glideTo: 260 }), t(250, 0.04, 0.05, 0.14, { wave: 'sawtooth', delay: 0.2, glideTo: 215 })],
  /** The sheep aboard the boat, once a lap: a long bleat like a ship's horn. */
  horn: bleat(250, 13, 0.13),
  /** The flapping boat bounces the sheep: "boing-baa". */
  boingBaa: [t(260, 0.12, 0.004, 0.14, { glideTo: 620 }), ...bleat(500, 3, 0.1, 0.14)],
  /** The boat ducks under a toy set down on it: "bloop". */
  bloop: [t(420, 0.16, 0.006, 0.12, { glideTo: 170 }), t(200, 0.12, 0.006, 0.1, { delay: 0.16, glideTo: 520 })],
  /** The sheep's fleece settles: "poof". */
  poof: [n(900, 0.7, 0.11, 0.03, 0.2, { glideTo: 420 })],
  /** One big smoke ball bursts from the chimney: "PUFF". */
  bigPuff: [n(380, 0.8, 0.24, 0.01, 0.3, { glideTo: 150 }), t(120, 0.12, 0.01, 0.2, { glideTo: 80 })],
  /** The cat pounces on the lamp's light: "pat-pat-thump". */
  patpat: [t(210, 0.09, 0.002, 0.04, { glideTo: 150 }), t(230, 0.09, 0.002, 0.04, { delay: 0.17, glideTo: 160 }), t(120, 0.2, 0.003, 0.14, { delay: 0.45, glideTo: 80 }), n(500, 1, 0.06, 0.002, 0.06, { delay: 0.45 })],
  /** The cat shakes a wet paw: "fft". */
  fft: [n(3600, 2, 0.09, 0.004, 0.06)],
  /** The cat hisses at the water: "kssh". */
  kssh: [n(4200, 1.2, 0.13, 0.03, 0.4, { glideTo: 3000 })],
  /** The cat, puffed up on the rim: "FFFT!". */
  ffft: [n(3000, 0.9, 0.22, 0.004, 0.24, { glideTo: 4600 }), t(300, 0.06, 0.004, 0.1, { wave: 'sawtooth' })],
  /** The cat let go after a pull: "boing-mrrp". */
  boingMrrp: [t(180, 0.14, 0.004, 0.2, { glideTo: 520 }), ...Array.from({ length: 5 }, (_, i) => t(190 + i * 16, 0.06, 0.004, 0.022, { wave: 'sawtooth', delay: 0.22 + i * 0.028 })), t(560, 0.09, 0.02, 0.12, { delay: 0.36, glideTo: 820 })],
  /** The buoy's bell clinks under the gull's feet. */
  clink: [t(1660, 0.07, 0.002, 0.3), t(2490, 0.03, 0.002, 0.2)],
  /** The gull dives after a splash and comes up with nothing: "splish, kwaa". */
  splish: [n(1300, 0.8, 0.16, 0.004, 0.16, { glideTo: 500 }), t(880, 0.13, 0.02, 0.3, { wave: 'sawtooth', delay: 0.5, glideTo: 520 }), n(2600, 2, 0.05, 0.01, 0.1, { delay: 0.74 })],
  /** A bubble tickles the gull: "kya-hi-hi". */
  kyahihi: [t(1100, 0.1, 0.01, 0.08, { wave: 'sawtooth', glideTo: 900 }), t(1500, 0.09, 0.008, 0.06, { wave: 'sawtooth', delay: 0.13 }), t(1500, 0.09, 0.008, 0.07, { wave: 'sawtooth', delay: 0.24 })],
  /** The gull surfs the swell: "kya-ha-ha". */
  kyahaha: [t(1150, 0.12, 0.01, 0.1, { wave: 'sawtooth', glideTo: 900 }), t(980, 0.11, 0.008, 0.09, { wave: 'sawtooth', delay: 0.16 }), t(980, 0.11, 0.008, 0.12, { wave: 'sawtooth', delay: 0.3, glideTo: 760 })],
  /** A cloud squeezes out a few drops: "pit-pat". */
  pitpat: [0, 0.11, 0.2, 0.33].map((delay, i) => t(1900 - i * 210, 0.07, 0.002, 0.05, { delay, glideTo: 1300 - i * 150 })),
  /** The sun bounces: "bong". */
  bong: [t(196, 0.22, 0.004, 0.7), t(392, 0.08, 0.004, 0.45), t(588, 0.04, 0.004, 0.3)],

  // --- On the wave ---------------------------------------------------------------
  /** The lighthouse bobs like a bottle: "glug, glug". */
  glug: [t(190, 0.14, 0.008, 0.09, { glideTo: 300 }), t(170, 0.13, 0.008, 0.09, { delay: 0.2, glideTo: 280 })],
  /** The boat takes the crest: "swoosh", and its bell. */
  swoosh: [n(1100, 0.8, 0.14, 0.08, 0.3, { glideTo: 3000 }), t(2090, 0.09, 0.002, 0.35, { delay: 0.22 })],
  /** The sheep on its back: "baa-glub". */
  baaGlub: [...bleat(430, 4, 0.11), t(200, 0.13, 0.008, 0.09, { delay: 0.32, glideTo: 320 })],
  /** The tree spins like a top: "whirr". */
  topWhirr: [t(260, 0.07, 0.05, 0.4, { wave: 'triangle', glideTo: 520 }), n(3000, 3, 0.04, 0.05, 0.35)],
  /** The house floats roof down: "gloop". */
  gloop: [t(150, 0.17, 0.01, 0.2, { glideTo: 95 }), t(110, 0.12, 0.01, 0.16, { delay: 0.2, glideTo: 240 })],
  /** The tree is stood in its slot: "plunk". */
  plunk: [t(330, 0.16, 0.003, 0.1, { wave: 'triangle', glideTo: 210 }), t(660, 0.05, 0.002, 0.05)],
} satisfies Record<string, Note[]>

export type VoiceName = keyof typeof VOICES

/**
 * One sound the game asks for: a voice, how much higher or lower than written, how loud, and how long after the
 * others of its touch. `wash` marks a sound of the wave at work, which is cut when the wash is ended (hush.ts).
 */
export type Sound = { name: VoiceName; pitch?: number; gain?: number; delay?: number; wash?: boolean }

/** One sound of a toy's answer to a tap: the voice, how many seconds after the tap its pose arrives, and its pitch. */
export type Cue = { name: VoiceName; at: number; pitch?: number }

/** The seven pulses of the sheep's "BAA!", the second of each pair a little lower: a sheep's voice trembles. Lower in the sea. */
const baa = (pitch: number): Cue[] => Array.from({ length: 7 }, (_, i) => ({ name: 'bigBaa' as const, at: i * 0.07, pitch: pitch * (i % 2 === 0 ? 1 : 0.94) }))

/**
 * Each toy's answer to a tap where it stands, on the land and in the sea, as a row of sounds. Each is said in the
 * frame its pose arrives, on the game's clock, so a toy that is lifted in the middle of its answer sounds no more
 * of it. No voice named here holds a note that starts later than the voice does (voices.test.ts).
 */
export const TAP: Record<Kind, { land: readonly Cue[]; sea: readonly Cue[] }> = (() => {
  const lighthouse: Cue[] = [{ name: 'blink', at: 0 }, { name: 'blink', at: 0.14 }, { name: 'blink', at: 0.28 }, { name: 'whoosh', at: 0.36 }, { name: 'whooshDown', at: 0.74 }]
  const tree: Cue[] = [{ name: 'shake', at: 0 }, { name: 'shake', at: 0.14 }, { name: 'flutter', at: 0.28 }, { name: 'pop', at: 1.1 }]
  const house: Cue[] = [{ name: 'lid', at: 0 }, { name: 'clap', at: 0.22 }, { name: 'bigPuff', at: 0.24 }]
  return {
    lighthouse: { land: lighthouse, sea: lighthouse },
    boat: { land: [{ name: 'spring', at: 0 }, { name: 'splat', at: 0.34 }], sea: [{ name: 'toot', at: 0 }, { name: 'toot', at: 0.19 }, { name: 'foam', at: 0.3 }] },
    sheep: { land: [...baa(1), { name: 'poof', at: 0.6 }], sea: [...baa(0.86), { name: 'poof', at: 0.6 }] },
    tree: { land: tree, sea: tree },
    house: { land: house, sea: house },
  }
})()

export const tapOf = (kind: Kind, sea: boolean): readonly Cue[] => TAP[kind][sea ? 'sea' : 'land']

/** The notes of everything one touch or one step set off, as one list: one voice, so the first touch of a visit loses none of it. */
export function notesOf(sounds: readonly Sound[]): Note[] {
  const notes: Note[] = []
  for (const sound of sounds) {
    const pitch = sound.pitch ?? 1, gain = sound.gain ?? 1, delay = sound.delay ?? 0
    for (const note of VOICES[sound.name] as Note[]) {
      notes.push({ ...note, frequency: note.frequency * pitch, glideTo: note.glideTo ? note.glideTo * pitch : undefined, peak: note.peak * gain, delay: (note.delay ?? 0) + delay })
    }
  }
  return notes
}
