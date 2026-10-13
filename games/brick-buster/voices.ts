import type { Note } from './audio'

// Every sound of the game as plain numbers. Nothing here touches Web Audio,
// so a test can hold each sound inside a stated range on a machine that
// cannot hear (voices.test.ts).
//
// A sound here has no delay inside it: every part starts at the moment the
// sound is played. Whatever comes later is a later beat of an answer
// (answers.ts), which sets a pose and plays its notes at one moment, so sight
// and sound share one clock.

/** One part of a sound: a `Note` of audio.ts without its `delay`. */
export type Tone = Omit<Note, 'delay'>
export type Sound = readonly Tone[]

/** What every sound is held to. */
export const LIMITS = { minFreq: 50, maxFreq: 5200, maxPeak: 0.22, minAttack: 0.002, maxSeconds: 1.3 } as const

/** How long a sound lasts, in seconds. */
export function seconds(sound: Sound): number {
  return sound.reduce((end, tone) => Math.max(end, tone.attack + tone.decay), 0)
}

const sine = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number): Tone => ({ kind: 'tone', wave: 'sine', frequency, peak, attack, decay, glideTo })
const wave = (shape: OscillatorType, frequency: number, peak: number, attack: number, decay: number, glideTo?: number): Tone => ({ kind: 'tone', wave: shape, frequency, peak, attack, decay, glideTo })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Tone => ({ kind: 'noise', frequency, q, peak, attack, decay, glideTo })

/** The wall's scale: one step for each column, left to right, five notes that never sound sour together, and the first again an octave up. */
const STEPS = [0, 2, 4, 7, 9, 12] as const
const MIDDLE_C = 261.63

/** The note of a place in the wall: its column is the step, and each row up the wall is an octave higher. `rowFromFoot` is 0 for the lowest row. */
export function wallNote(col: number, rowFromFoot: number): number {
  const step = STEPS[Math.max(0, Math.min(STEPS.length - 1, col))]
  return MIDDLE_C * 2 ** (step / 12 + Math.max(0, Math.min(2, rowFromFoot)))
}

// --- The bumper --------------------------------------------------------------

/** The finger lands: rubber gives. */
export const creak: Sound = [sine(190, 0.1, 0.004, 0.09, 120), hiss(340, 3, 0.05, 0.004, 0.07)]

/** The bumper lets go. `aim` is -1 to 1, where on the bumper the ball stood: a ball sprung from an end sounds a little higher. */
export function boing(aim: number): Sound {
  const f = 150 * (1 + 0.25 * Math.abs(aim))
  return [wave('triangle', f, 0.2, 0.004, 0.2, f * 2.1), sine(f * 0.5, 0.12, 0.004, 0.12, f * 0.8)]
}

/** The bumper slid into a low ball. */
export const bonk: Sound = [sine(250, 0.14, 0.003, 0.08, 150), hiss(700, 2, 0.05, 0.002, 0.03)]

// --- The ball on the table ---------------------------------------------------

/** The drum-skin floor under a plain ball, at its loudest. A boom of a ball left bouncing is this, softer (`softer`). */
export const doom: Sound = [sine(118, 0.2, 0.004, 0.3, 72), hiss(210, 1, 0.08, 0.003, 0.06)]

/** A sound at `size` of its loudness, from 1 down towards 0. A part too quiet to hear is left out. */
export function softer(sound: Sound, size: number): Sound {
  const k = Math.max(0, Math.min(1, size))
  return sound.map((tone) => ({ ...tone, peak: tone.peak * k })).filter((tone) => tone.peak >= 0.004)
}

/** A ball that came to rest on the wall rolls off it: one turn of its rumble. `speed` is 0 to 1. */
export function rollTick(speed: number): Sound {
  const k = Math.max(0, Math.min(1, speed))
  return [hiss(260 + 240 * k, 1.2, 0.035 + 0.035 * k, 0.012, 0.1), sine(84 + 40 * k, 0.03 + 0.02 * k, 0.012, 0.09)]
}

/** A chrome rail. `speed` is 0 to 1. */
export function railTick(speed: number): Sound {
  return [wave('triangle', 1250, 0.05 + 0.07 * speed, 0.002, 0.045), sine(2500, 0.03 + 0.03 * speed, 0.002, 0.03)]
}

/** The roof rail: wood behind chrome. */
export function roofTok(speed: number): Sound {
  return [wave('triangle', 520, 0.07 + 0.08 * speed, 0.002, 0.06, 400), hiss(1500, 2, 0.04, 0.002, 0.03)]
}

// --- Glass -------------------------------------------------------------------

/** A glass brick rings its own note like a tapped tumbler. */
export function ring(col: number, rowFromFoot: number): Sound {
  const f = wallNote(col, rowFromFoot)
  return [sine(f, 0.18, 0.003, 0.5), sine(Math.min(LIMITS.maxFreq, f * 2.76), 0.05, 0.002, 0.18)]
}

/** The crack that a first hit leaves. */
export const crack: Sound = [hiss(4200, 6, 0.09, 0.002, 0.035), hiss(2600, 3, 0.05, 0.002, 0.05)]

/** One shard of the tinkle: the `index`th of a brick's fall, each a little lower than the last. */
export function tinkle(index: number): Sound {
  const f = 3900 - 310 * (index % 5)
  return [sine(f, 0.07, 0.002, 0.09), sine(f * 1.31, 0.035, 0.002, 0.05)]
}

/** The shards come to rest as a heap of rubble. */
export const settle: Sound = [hiss(3000, 1.5, 0.06, 0.003, 0.12), sine(1480, 0.05, 0.002, 0.07)]

/** A fingernail on glass, and one breath that fogs it. */
export const tink: Sound = [sine(2350, 0.1, 0.002, 0.07), hiss(650, 0.6, 0.04, 0.05, 0.2)]

// --- The bell and the folded wall -------------------------------------------

/** The bell, rung by the ball. */
export const bell: Sound = [sine(784, 0.16, 0.003, 1.0), sine(1568, 0.07, 0.003, 0.6), sine(2105, 0.04, 0.002, 0.35)]

/** The bell under a finger: a small clear note. */
export const ting: Sound = [sine(1568, 0.1, 0.003, 0.4), sine(2105, 0.03, 0.002, 0.2)]

/** The folded wall rustles and stays folded. */
export const rustle: Sound = [hiss(2400, 0.8, 0.06, 0.02, 0.16, 3200)]

/** One row of the concertina drops open. */
export function flap(row: number): Sound {
  return [hiss(900 - 150 * row, 1.2, 0.08, 0.004, 0.09), sine(200 - 30 * row, 0.08, 0.004, 0.08, 140 - 20 * row)]
}

/** A brick stands up in its place with its own note, softer than when it is struck. */
export function standUp(col: number, rowFromFoot: number): Sound {
  return [sine(wallNote(col, rowFromFoot), 0.09, 0.004, 0.22)]
}

// --- The three large toys ------------------------------------------------------

/** The walrus's whiskers twang. */
export const twang: Sound = [wave('triangle', 150, 0.13, 0.004, 0.3, 300), wave('triangle', 226, 0.06, 0.004, 0.22, 420)]
/** The walrus slaps its belly: wet and wide. */
export const slap: Sound = [hiss(620, 0.8, 0.14, 0.003, 0.1), sine(95, 0.12, 0.004, 0.14, 70)]
/** The walrus goes under to its eyes. */
export const under: Sound = [sine(210, 0.1, 0.01, 0.16, 420), sine(140, 0.06, 0.01, 0.12, 300)]

/** The dragon's hiccup. */
export const hic: Sound = [wave('square', 520, 0.06, 0.003, 0.07, 800), sine(520, 0.08, 0.003, 0.07, 800)]
/** The smoke ring leaves its mouth. */
export const puff: Sound = [hiss(1000, 1.5, 0.09, 0.02, 0.22, 500)]
/** The flame at the dragon's nostril flares. */
export const flare: Sound = [hiss(1900, 1, 0.06, 0.01, 0.14, 2800)]

/** The elephant's short raspberry. */
export const toot: Sound = [wave('sawtooth', 96, 0.1, 0.01, 0.24, 78), hiss(420, 1.2, 0.06, 0.01, 0.2)]
/** One flap of the elephant's ears. `size` is 0 to 1. */
export function earFlap(size: number): Sound {
  return [hiss(260, 0.7, 0.03 + 0.07 * size, 0.02, 0.12)]
}
/** The elephant folds its ears over its eyes. */
export const hush: Sound = [sine(132, 0.09, 0.03, 0.22, 100), hiss(300, 0.7, 0.05, 0.03, 0.16)]

/** The ladybird opens its wings. */
export const whirr: Sound = [hiss(3300, 8, 0.07, 0.02, 0.26), wave('triangle', 236, 0.04, 0.02, 0.24)]
/** The ladybird sets down again. */
export const tap: Sound = [sine(1100, 0.04, 0.002, 0.04)]

/** A finger pats the drum skin. */
export const dum: Sound = [sine(156, 0.11, 0.004, 0.16, 110)]

// --- The ball on the bumper, with no finger and when it is heavy ----------------

/** A ball lands on a bumper no finger is on and sinks into the rubber. */
export const pfff: Sound = [hiss(900, 0.7, 0.07, 0.02, 0.24, 300), sine(110, 0.05, 0.01, 0.16, 80)]
/** A heavy ball squashes the bumper flat. */
export const groan: Sound = [wave('sawtooth', 82, 0.09, 0.02, 0.3, 58), sine(64, 0.1, 0.02, 0.28)]

// --- The gates ----------------------------------------------------------------

/** The dragon takes the ball into its mouth. */
export const gulp: Sound = [sine(330, 0.1, 0.006, 0.12, 150), sine(160, 0.07, 0.006, 0.1, 90)]
/** The ball drops into the walrus's tub. */
export const plunge: Sound = [hiss(700, 0.8, 0.12, 0.004, 0.2, 300), sine(180, 0.09, 0.005, 0.16, 90)]
/** The walrus spits the ball out in a spout of water. */
export const spout: Sound = [hiss(1500, 1, 0.11, 0.01, 0.3, 3200), sine(420, 0.07, 0.01, 0.2, 900)]
/** The elephant's trunk sucks the ball up. */
export const suck: Sound = [hiss(500, 2.5, 0.09, 0.03, 0.3, 1700), sine(120, 0.06, 0.03, 0.26, 260)]
/** The elephant blows the ball out, heavy. */
export const blow: Sound = [wave('sawtooth', 110, 0.08, 0.01, 0.22, 70), hiss(380, 1, 0.1, 0.01, 0.2)]
/** The same gate again: the walrus rubs the ball dry. */
export const rubDry: Sound = [sine(1900, 0.07, 0.01, 0.09, 2500), sine(2300, 0.05, 0.03, 0.1, 1700)]
/** The dragon blows the ball cool. */
export const wheeze: Sound = [hiss(1300, 2, 0.09, 0.04, 0.34, 600), sine(240, 0.04, 0.04, 0.3, 170)]
/** The elephant shakes the ball empty: one shake of the rattle. */
export function rattle(index: number): Sound {
  return [hiss(2600 - 300 * (index % 3), 4, 0.08, 0.003, 0.05), sine(300 + 40 * (index % 3), 0.04, 0.003, 0.04)]
}

// --- Glass, under the other balls -------------------------------------------------

/** A wet ball wipes the glass like a window. */
export const squeak: Sound = [sine(1500, 0.09, 0.01, 0.16, 2600), sine(3000, 0.03, 0.01, 0.12, 4600)]
/** A hot ball: the glass sags, a glass-blower's low note. */
export const bwoom: Sound = [sine(150, 0.16, 0.03, 0.5, 86), sine(300, 0.05, 0.03, 0.3, 170)]
/** The drip pops like a bubble. */
export const pock: Sound = [sine(520, 0.14, 0.002, 0.06, 1500), hiss(2400, 3, 0.05, 0.002, 0.03)]
/** A heavy ball goes straight through. */
export const crash: Sound = [hiss(3400, 0.7, 0.16, 0.002, 0.26), hiss(900, 0.8, 0.1, 0.002, 0.2), sine(90, 0.12, 0.003, 0.18, 60)]

// --- Jelly ----------------------------------------------------------------------

/**
 * The jelly wobbles and throws the ball: the note of its place, an octave down, with a wet wobble under it.
 * `count` is 0, 1 or 2: each throw wobbles a little longer.
 */
export function jellyBlub(count: number, col: number, rowFromFoot: number): Sound {
  const f = wallNote(col, rowFromFoot) / 2
  return [sine(f, 0.14, 0.008, 0.2 + 0.04 * count), hiss(Math.min(LIMITS.maxFreq, f * 3), 2.5, 0.05, 0.008, 0.14 + 0.03 * count, f * 1.5)]
}
/** It lands in the rubble. */
export const splat: Sound = [hiss(500, 0.7, 0.14, 0.003, 0.14), sine(140, 0.1, 0.004, 0.14, 80)]
/** A wet ball slips round it. */
export const slurp: Sound = [sine(300, 0.1, 0.03, 0.26, 950), hiss(1100, 3, 0.05, 0.03, 0.2, 2300)]
/** It melts and runs. */
export const glorp: Sound = [sine(210, 0.13, 0.02, 0.3, 90), sine(125, 0.08, 0.05, 0.3, 190)]
/** The sticky thread snaps. */
export const threadTwang: Sound = [wave('triangle', 620, 0.09, 0.003, 0.2, 1240)]
/** One bound of the long spring that flings a heavy ball: the `index`th of three, each higher. */
export function boi(index: number): Sound {
  const f = 110 * (1 + 0.35 * index)
  return [wave('triangle', f, 0.17, 0.006, 0.2, f * 1.8), sine(f * 0.5, 0.08, 0.006, 0.16)]
}
/** The thud up in the roof. */
export const roofThud: Sound = [sine(96, 0.18, 0.003, 0.2, 64), hiss(520, 1, 0.08, 0.003, 0.08)]
/** One wobble under a finger. */
export function bwub(index: number): Sound {
  const f = index % 2 ? 190 : 165
  return [sine(f, 0.11, 0.01, 0.13, f * 1.5)]
}
/** The bubbling titter that goes with it. */
export function titter(index: number): Sound {
  return [sine(880 + 140 * (index % 3), 0.05, 0.004, 0.05, 1200 + 140 * (index % 3))]
}

// --- Ice ----------------------------------------------------------------------

/** A plain ball skates off. */
export const tsk: Sound = [hiss(4600, 5, 0.1, 0.002, 0.04), hiss(3000, 2, 0.05, 0.002, 0.08)]
/** The ice chinks as it does, on the note of its place, an octave up: thin and short. */
export function chink(col: number, rowFromFoot: number): Sound {
  return [sine(Math.min(LIMITS.maxFreq, wallNote(col, rowFromFoot) * 2), 0.05, 0.002, 0.16)]
}
/** The water on a wet ball freezes: a rising crackle, one part of three. */
export function freeze(index: number): Sound {
  return [hiss(2200 + 800 * index, 6, 0.08, 0.003, 0.07), sine(1300 + 500 * index, 0.04, 0.003, 0.06)]
}
/** A hot ball melts it. */
export const meltHiss: Sound = [hiss(3600, 0.8, 0.1, 0.03, 0.9, 1200)]
/** It stops a heavy ball dead, like an anvil. */
export const donk: Sound = [sine(410, 0.2, 0.002, 0.3), sine(1090, 0.07, 0.002, 0.16), sine(205, 0.1, 0.002, 0.2)]
/** A finger on ice. */
export const coldSqueak: Sound = [sine(2500, 0.07, 0.01, 0.14, 3300)]

// --- A seed -------------------------------------------------------------------

/** A plain ball knocks on it like a wooden block, tuned to the note of its place. */
export function tock(col: number, rowFromFoot: number): Sound {
  return [wave('triangle', wallNote(col, rowFromFoot), 0.17, 0.002, 0.08), hiss(1400, 3, 0.05, 0.002, 0.03)]
}
/** A vine uncurls, or lifts a ball. */
export const vineCreak: Sound = [wave('sawtooth', 170, 0.06, 0.03, 0.3, 300), hiss(800, 5, 0.04, 0.03, 0.24, 1400)]
/** The vine shoots to the roof. */
export const slideWhistle: Sound = [sine(420, 0.13, 0.02, 0.6, 2100)]
/** A hot ball pops it like popcorn. */
export const popBang: Sound = [hiss(1800, 0.7, 0.2, 0.002, 0.1), sine(190, 0.14, 0.002, 0.1, 90)]
/** A heavy ball drives it in like a peg. */
export const thunk: Sound = [sine(120, 0.2, 0.003, 0.16, 70), wave('triangle', 320, 0.08, 0.002, 0.06)]
/** The sprout comes up through the rubble. */
export const pip: Sound = [sine(980, 0.1, 0.004, 0.08, 1500)]
/** A finger rattles it like a maraca: one shake. */
export function maraca(index: number): Sound {
  return [hiss(3800 - 500 * (index % 2), 3, 0.08, 0.003, 0.05)]
}
/** A hot ball curls the vine's leaves brown. */
export const brownCrackle: Sound = [hiss(2900, 4, 0.08, 0.003, 0.06), hiss(1700, 3, 0.06, 0.02, 0.12)]

// --- A sleepy brick ---------------------------------------------------------------

/** The two halves of a yawn. */
export const yawnAah: Sound = [sine(300, 0.1, 0.06, 0.3, 380), wave('triangle', 150, 0.04, 0.06, 0.3, 190)]
export const yawnOm: Sound = [sine(340, 0.1, 0.03, 0.34, 150), wave('triangle', 170, 0.04, 0.03, 0.3, 80)]
/** Under its yawn or its stirring a sleepy brick hums the note of its place, an octave down. */
export function hum(col: number, rowFromFoot: number): Sound {
  return [sine(wallNote(col, rowFromFoot) / 2, 0.08, 0.03, 0.36)]
}
/** One snore. `deep` is twice as deep. */
export function snore(deep: boolean): Sound {
  const f = deep ? 66 : 132
  return [wave('sawtooth', f, 0.07, 0.08, 0.4, f * 0.8), hiss(deep ? 260 : 420, 1.5, 0.05, 0.08, 0.36)]
}
/** A wet ball wakes it. */
export const splutter: Sound = [hiss(1600, 1, 0.11, 0.004, 0.08), sine(480, 0.07, 0.004, 0.09, 720)]
/** It shakes itself dry: one shake. */
export function shakeDry(index: number): Sound {
  return [hiss(2100 + 300 * (index % 2), 2, 0.07, 0.004, 0.06)]
}
/** A hot ball: it snuggles. */
export const mmm: Sound = [sine(196, 0.11, 0.06, 0.4, 174), sine(392, 0.03, 0.06, 0.3)]
/** A heavy ball tips it out of bed onto the row below. */
export const whumpf: Sound = [sine(84, 0.17, 0.006, 0.2, 56), hiss(320, 0.7, 0.1, 0.006, 0.14)]
/** A heavy ball tips it out of bed: the bedsprings. */
export const bedSpring: Sound = [wave('triangle', 380, 0.09, 0.004, 0.12, 620), wave('triangle', 570, 0.05, 0.004, 0.1, 930)]
/** A finger: it grumbles. */
export const hrmf: Sound = [wave('sawtooth', 132, 0.07, 0.01, 0.16, 104), hiss(520, 2, 0.05, 0.01, 0.12)]
/** A deep sleeper stirs back to ordinary sleep. */
export const snrk: Sound = [hiss(700, 3, 0.08, 0.004, 0.07), wave('sawtooth', 150, 0.05, 0.004, 0.08, 210)]

// --- The drum-skin floor under the other balls ----------------------------------

/** A wet ball: a slap. */
export const wetSlap: Sound = [hiss(1100, 0.7, 0.15, 0.002, 0.09), sine(128, 0.13, 0.004, 0.24, 80)]
/** A hot ball: a sizzle, and the skin tightens so that the bounce sounds a note higher. */
export const sizzle: Sound = [hiss(4300, 1.2, 0.08, 0.004, 0.3), sine(133, 0.16, 0.004, 0.28, 86)]
/** A heavy ball: a deep boom. */
export const deepBoom: Sound = [sine(68, 0.22, 0.004, 0.6, 50), sine(136, 0.08, 0.004, 0.3, 80), hiss(180, 0.8, 0.09, 0.004, 0.12)]

// --- The pool -------------------------------------------------------------------

export const plip: Sound = [sine(880, 0.11, 0.003, 0.08, 1500)]
export const splash: Sound = [hiss(1900, 0.7, 0.14, 0.004, 0.26), sine(300, 0.07, 0.004, 0.14, 150)]
export const pshh: Sound = [hiss(3000, 0.8, 0.11, 0.01, 0.6, 5000)]
export const sploosh: Sound = [hiss(700, 0.6, 0.17, 0.004, 0.4, 300), sine(92, 0.14, 0.004, 0.3, 60)]

// --- The bell, in the ball's manner ------------------------------------------------

/** A wet ball: the bell gurgles. */
export const bellWet: Sound = [sine(784, 0.13, 0.003, 0.6, 700), sine(830, 0.07, 0.02, 0.5, 760), sine(392, 0.05, 0.01, 0.3, 520)]
/** A hot ball: a tone higher. */
export const bellHot: Sound = [sine(880, 0.16, 0.003, 1.0), sine(1760, 0.07, 0.003, 0.6), sine(2360, 0.04, 0.002, 0.35)]
/** A heavy ball: a low gong. */
export const gong: Sound = [sine(196, 0.2, 0.004, 1.2), sine(294, 0.08, 0.004, 0.9), sine(520, 0.04, 0.004, 0.5)]

// --- What the three large toys love and cannot stand --------------------------------

/** The walrus snorts through its whiskers. */
export const snort: Sound = [hiss(520, 2.5, 0.11, 0.012, 0.18, 300), wave('sawtooth', 108, 0.06, 0.012, 0.15, 80)]
/** The walrus wallows, and the water slops over the rim of its tub. */
export const slosh: Sound = [hiss(820, 0.7, 0.1, 0.03, 0.32, 420), sine(160, 0.06, 0.03, 0.26, 110)]
/** The dragon's tail whips out over the table. */
export const tailWhip: Sound = [hiss(1800, 2, 0.09, 0.008, 0.16, 4600), sine(380, 0.04, 0.008, 0.12, 900)]
/** Its tail curls round the ball. */
export const tailCurl: Sound = [sine(640, 0.07, 0.004, 0.07, 980), hiss(2200, 4, 0.03, 0.004, 0.05)]
/** The elephant's trunk stretches out over the table, slowly. */
export const trunkStretch: Sound = [wave('sawtooth', 92, 0.07, 0.05, 0.42, 150), hiss(430, 1.5, 0.05, 0.05, 0.38, 860)]
/** Its trunk takes hold of the ball with a small suck. */
export const trunkHold: Sound = [hiss(600, 3, 0.08, 0.01, 0.12, 1500), sine(150, 0.05, 0.01, 0.1, 230)]
/** The dragon's flame goes out. */
export const fizzle: Sound = [hiss(3600, 1.5, 0.09, 0.004, 0.3, 900)]
/** The dragon strikes a spark and fails. */
export const spark: Sound = [hiss(4200, 8, 0.06, 0.002, 0.03)]
/** The elephant lands after a jump. */
export const stomp: Sound = [sine(74, 0.18, 0.004, 0.22, 52), hiss(240, 0.7, 0.08, 0.004, 0.1)]
/** The dragon coughs up its spare ball. */
export const cough: Sound = [hiss(900, 2, 0.12, 0.004, 0.1), wave('square', 300, 0.05, 0.004, 0.08, 200)]
/** A scorched ring is left on the board. */
export const scorch: Sound = [hiss(3900, 2, 0.06, 0.01, 0.4, 2200)]
/** A drip off the walrus's spare ball. */
export const drip: Sound = [sine(1300, 0.06, 0.003, 0.05, 700)]
/** The frost cap lets go of the ball. */
export const frostTick: Sound = [hiss(4800, 8, 0.04, 0.002, 0.03)]
