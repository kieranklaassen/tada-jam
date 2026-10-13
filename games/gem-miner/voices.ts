import type { Note } from './audio'
import type { Event } from './game'
import { cellOf, type Tool } from './layout'
import type { Colour, DwellerKind } from './world'

// Every sound of the game as plain numbers, written from the sheet's words.
// One list of notes for each thing that can happen (`Event` in game.ts), and
// nothing sounds that is not an event, so sight and sound share the game's
// clock. Nobody has heard them yet: the test beside this file holds each
// pitch, peak and length in range, and the lead listens.
//
// A note may start a little after its event (`delay`) only as part of the
// same sound: clods pattering after a crunch. Anything that is seen to happen
// later is an event of its own.

/** Five steps of a scale with no half tones in it, so any run of blocks is a tune and never a clash. */
const SCALE = [0, 2, 4, 7, 9]
const up = (base: number, steps: number): number => base * 2 ** (steps / 12)

/** The pitch a block's tinks start from: it follows the block's place in the hill, lower with depth. */
export function pitchOf(index: number): number {
  const { c, r } = cellOf(index)
  return up(880, SCALE[(c * 2 + r) % SCALE.length] - r)
}

/** The one clear note of each colour of gem: low for red, middle for green, high for blue. */
export const GLASS: Record<Colour, number> = { red: 523.25, green: 659.25, blue: 783.99 }

const t = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const n = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })

// --- The finger lands -------------------------------------------------------------------------------------------

const thump = [t(118, 0.3, 0.004, 0.13, { glideTo: 72 }), n(320, 0.8, 0.1, 0.003, 0.07)]
const tok = [t(540, 0.2, 0.002, 0.06, { glideTo: 470, wave: 'triangle' }), n(2100, 2, 0.07, 0.002, 0.09)]
const ting = [t(1980, 0.13, 0.002, 0.24), t(2970, 0.05, 0.002, 0.14)]
const echo = [t(233, 0.12, 0.02, 0.2, { glideTo: 220 }), t(233, 0.05, 0.02, 0.22, { glideTo: 220, delay: 0.19 })]
/** A hollow glug: a low note that dips and comes up again. */
const hollowGlug = [t(170, 0.24, 0.01, 0.1, { glideTo: 110 }), t(120, 0.2, 0.01, 0.14, { glideTo: 250, delay: 0.1 })]
/** A hollow hoot, like breath across a bottle. */
const hoot = [t(294, 0.16, 0.05, 0.3), n(300, 6, 0.14, 0.04, 0.3), n(900, 1, 0.03, 0.04, 0.2)]
const rustle = [n(2400, 0.7, 0.06, 0.01, 0.1), n(1500, 0.7, 0.04, 0.01, 0.12, { delay: 0.05 })]
const spray = [n(2600, 0.6, 0.1, 0.04, 0.26, { glideTo: 1900 }), t(150, 0.1, 0.004, 0.07, { glideTo: 110 })]

/** A gem's one clear glass note. */
function glass(colour: Colour, peak = 0.16, decay = 0.7): Note[] {
  const f = GLASS[colour]
  return [t(f, peak, 0.003, decay), t(f * 2, peak * 0.4, 0.003, decay * 0.6), t(f * 3.01, peak * 0.18, 0.002, decay * 0.3)]
}

// --- The pick ---------------------------------------------------------------------------------------------------

/** One blow on sandstone: the n-th tink of its three, each four half tones above the one before. */
function tink(index: number, blow: number): Note[] {
  const f = up(pitchOf(index), (blow - 1) * 4)
  return [t(f, 0.2, 0.002, 0.16, { wave: 'triangle' }), t(f * 2.76, 0.06, 0.002, 0.07), n(3200, 3, 0.05, 0.001, 0.03)]
}
const clatter = [n(900, 1.2, 0.2, 0.004, 0.26, { glideTo: 320 }), t(196, 0.14, 0.003, 0.08, { wave: 'triangle', delay: 0.07 }), t(147, 0.12, 0.003, 0.1, { wave: 'triangle', delay: 0.16 })]
/** Earth going at one blow: a soft crunch, lower with depth, and clods pattering after it. */
function crunch(index: number): Note[] {
  const deep = cellOf(index).r
  return [
    n(300 - deep * 14, 0.7, 0.28, 0.005, 0.2, { glideTo: 130 }), t(150 - deep * 6, 0.2, 0.004, 0.14, { glideTo: 70 }),
    n(950, 3, 0.06, 0.002, 0.04, { delay: 0.11 }), n(780, 3, 0.05, 0.002, 0.04, { delay: 0.17 }), n(640, 3, 0.04, 0.002, 0.05, { delay: 0.24 }),
  ]
}
const clang = [t(1245, 0.16, 0.001, 0.5, { wave: 'triangle' }), t(1661, 0.1, 0.001, 0.42, { wave: 'triangle' }), t(2217, 0.07, 0.001, 0.3), n(4200, 4, 0.08, 0.001, 0.05)]
/** A free gem struck: it chimes, its own note and the two above it. */
const chime = (colour: Colour): Note[] => [...glass(colour, 0.14, 0.9), t(GLASS[colour] * 1.5, 0.08, 0.003, 0.7, { delay: 0.06 }), t(GLASS[colour] * 2.5, 0.05, 0.003, 0.5, { delay: 0.12 })]
/** A gem springing out of its block: its note, rising. */
const ping = (colour: Colour): Note[] => [t(GLASS[colour], 0.18, 0.003, 0.3, { glideTo: GLASS[colour] * 2 }), t(GLASS[colour] * 2, 0.06, 0.003, 0.2, { glideTo: GLASS[colour] * 4 })]
const tik = [t(2600, 0.1, 0.001, 0.05), n(5200, 4, 0.05, 0.001, 0.03)]
const tock = [t(880, 0.14, 0.002, 0.07, { wave: 'triangle' }), n(1500, 2, 0.08, 0.002, 0.05)]

// --- The wedge ----------------------------------------------------------------------------------------------------

const squelch = [n(420, 1.4, 0.2, 0.03, 0.2, { glideTo: 180 }), t(140, 0.12, 0.02, 0.16, { glideTo: 90 })]
const pop = [t(300, 0.22, 0.002, 0.08, { glideTo: 760 }), n(1200, 1, 0.08, 0.002, 0.04)]
const sit = [t(96, 0.28, 0.004, 0.16, { glideTo: 60 }), n(240, 0.8, 0.12, 0.004, 0.1)]
const split = [n(2600, 2.2, 0.2, 0.001, 0.05), t(700, 0.18, 0.001, 0.07, { wave: 'triangle' }), n(700, 1, 0.12, 0.004, 0.22, { glideTo: 300, delay: 0.08 })]
/** A mallet blow on granite: each ring lower than the last. */
const ring = (blow: number): Note[] => {
  const f = up(1320, -(blow - 1) * 5)
  return [t(f, 0.18, 0.001, 0.45, { wave: 'triangle' }), t(f * 1.5, 0.07, 0.001, 0.3), n(3000, 3, 0.07, 0.001, 0.04)]
}
const boom = [t(82, 0.32, 0.006, 0.5, { glideTo: 44 }), n(160, 0.6, 0.2, 0.006, 0.4), n(900, 1, 0.08, 0.002, 0.12)]
/** A thin jet that squeaks. */
const jet = [t(2400, 0.08, 0.01, 0.4, { glideTo: 3300 }), n(5200, 3, 0.07, 0.01, 0.4), n(1800, 1, 0.04, 0.01, 0.5)]
/** One long whistle that falls like a kettle taken off the fire. The longest note of the game. */
const whistle = [t(2300, 0.1, 0.05, 1.8, { glideTo: 520 }), n(3200, 5, 0.05, 0.05, 1.8, { glideTo: 900 })]
const pock = [t(420, 0.22, 0.002, 0.07, { glideTo: 240, wave: 'triangle' }), n(900, 2, 0.1, 0.002, 0.05)]
const ding = [t(1568, 0.14, 0.002, 0.4), t(3136, 0.05, 0.002, 0.2)]

// --- The bucket ---------------------------------------------------------------------------------------------------

const scrape = [n(700, 1.2, 0.18, 0.02, 0.26, { glideTo: 1500 }), t(110, 0.1, 0.01, 0.16)]
const rasp = [n(3400, 1.5, 0.14, 0.03, 0.3, { glideTo: 2200 }), n(1200, 1, 0.06, 0.03, 0.25)]
const gong = [t(196, 0.26, 0.003, 0.9), t(277, 0.14, 0.003, 0.8), t(415, 0.08, 0.003, 0.6), n(1400, 1, 0.07, 0.002, 0.08)]
const teeth = [t(1900, 0.06, 0.001, 0.03, { wave: 'square' }), t(2100, 0.05, 0.001, 0.03, { wave: 'square', delay: 0.05 }), t(1900, 0.04, 0.001, 0.03, { wave: 'square', delay: 0.1 })]
const bloop = [t(220, 0.24, 0.01, 0.16, { glideTo: 520 }), n(500, 1, 0.06, 0.01, 0.1)]
const plip = [t(1400, 0.14, 0.002, 0.07, { glideTo: 2100 })]
const whump = [t(92, 0.3, 0.008, 0.22, { glideTo: 58 }), n(260, 0.7, 0.18, 0.006, 0.16)]
const sandHiss = [n(4200, 1.2, 0.12, 0.05, 0.9, { glideTo: 2600 })]
const splash = [n(1900, 0.7, 0.2, 0.006, 0.3, { glideTo: 800 }), t(260, 0.12, 0.006, 0.12, { glideTo: 140 })]
const fff = [n(2800, 1.6, 0.12, 0.08, 0.5, { glideTo: 1400 }), t(180, 0.05, 0.08, 0.4, { glideTo: 260 })]
const burp = [t(130, 0.22, 0.01, 0.18, { glideTo: 84, wave: 'sawtooth' }), n(300, 2, 0.08, 0.01, 0.14)]
const clink = [t(2093, 0.14, 0.001, 0.12), t(2637, 0.1, 0.001, 0.1, { delay: 0.07 }), t(2093, 0.07, 0.001, 0.08, { delay: 0.13 }), t(2349, 0.05, 0.001, 0.08, { delay: 0.18 })]

// --- The rope -----------------------------------------------------------------------------------------------------

const ropeHiss = [n(3000, 1, 0.1, 0.04, 0.35, { glideTo: 5000 })]
const zip = (k: number): Note[] => [n(k % 2 ? 3000 : 3800, 6, 0.14, 0.01, 0.12, { glideTo: k % 2 ? 4200 : 2800 }), t(k % 2 ? 1500 : 1900, 0.04, 0.01, 0.1)]
const twang = [t(147, 0.24, 0.002, 0.5, { glideTo: 139, wave: 'sawtooth' }), t(294, 0.1, 0.002, 0.3, { glideTo: 280 })]
const flop = [t(110, 0.26, 0.004, 0.14, { glideTo: 70 }), n(380, 0.8, 0.14, 0.004, 0.1)]
const creak = [t(310, 0.09, 0.02, 0.24, { glideTo: 420, wave: 'sawtooth' }), n(1200, 5, 0.06, 0.02, 0.22)]
const rumble = [n(110, 0.6, 0.3, 0.03, 0.3), t(62, 0.2, 0.03, 0.28), n(700, 1, 0.06, 0.03, 0.2)]
const strain = [t(160, 0.14, 0.04, 0.3, { glideTo: 190, wave: 'sawtooth' }), n(500, 2, 0.05, 0.04, 0.25)]
const thud = [t(70, 0.34, 0.004, 0.3, { glideTo: 40 }), n(180, 0.6, 0.2, 0.004, 0.2)]
// Earth patted back into the bucket with a flat paw: two soft pats.
const pat = [n(420, 0.8, 0.12, 0.004, 0.06), t(150, 0.12, 0.004, 0.06, { glideTo: 120 }), n(380, 0.8, 0.1, 0.004, 0.06, { delay: 0.14 }), t(140, 0.1, 0.004, 0.06, { glideTo: 112, delay: 0.14 })]
const clunk = [t(240, 0.18, 0.003, 0.08, { glideTo: 170, wave: 'triangle' }), n(800, 1.5, 0.08, 0.003, 0.05)]
const bip = (k: number): Note[] => [t(k === 1 ? 660 : 740, 0.14, 0.004, 0.09, { glideTo: k === 1 ? 880 : 990 })]
const trickle = [t(1500, 0.07, 0.003, 0.05, { glideTo: 1900 }), t(1300, 0.07, 0.003, 0.05, { glideTo: 1700, delay: 0.08 }), t(1650, 0.06, 0.003, 0.05, { glideTo: 2000, delay: 0.15 }), t(1200, 0.05, 0.003, 0.05, { glideTo: 1500, delay: 0.22 })]
const plap = [n(900, 1.2, 0.18, 0.003, 0.09), t(210, 0.12, 0.003, 0.07, { glideTo: 150 })]
const charm = [n(5200, 2.5, 0.09, 0.05, 0.3, { glideTo: 6400 }), t(880, 0.03, 0.05, 0.25, { glideTo: 932 })]

// --- The scenes ---------------------------------------------------------------------------------------------------

const whoomph = [t(90, 0.34, 0.01, 0.4, { glideTo: 38 }), n(240, 0.5, 0.3, 0.01, 0.35, { glideTo: 90 }), n(1800, 0.8, 0.1, 0.01, 0.2)]
/** The mole going up the shaft: a short whistle that rises as he goes. */
const shoot = [t(420, 0.12, 0.01, 0.16, { glideTo: 1500 }), n(1400, 1, 0.06, 0.01, 0.14, { glideTo: 3000 })]
const bump = [t(180, 0.26, 0.002, 0.1, { glideTo: 110, wave: 'triangle' }), n(600, 1, 0.14, 0.002, 0.08)]
/** The mole looking back over his shoulder: a small hum that goes up, as a question does. */
const hm = [t(294, 0.1, 0.02, 0.1, { glideTo: 310 }), t(330, 0.1, 0.02, 0.14, { glideTo: 415, delay: 0.11 })]
const grumble = [t(104, 0.14, 0.03, 0.14, { wave: 'sawtooth', glideTo: 92 }), t(98, 0.14, 0.03, 0.14, { wave: 'sawtooth', glideTo: 86, delay: 0.16 })]
const gush = [n(1200, 0.5, 0.26, 0.02, 0.4, { glideTo: 500 }), t(170, 0.14, 0.02, 0.3, { glideTo: 100 })]
/** How many glugs go down the scale before it begins again from the top. */
export const GLUG_SCALE = 15
/** The water passing one block: a glug a little lower than the last. After a long run the scale begins again from the top, so no two glugs that follow each other have one pitch. */
const glug = (k: number): Note[] => {
  const f = up(330, -(k % GLUG_SCALE))
  return [t(f, 0.2, 0.01, 0.09, { glideTo: f * 0.6 }), t(f * 0.6, 0.14, 0.01, 0.08, { glideTo: f * 1.1, delay: 0.07 })]
}
const soak = [n(1500, 0.6, 0.22, 0.01, 0.3, { glideTo: 600 }), t(700, 0.08, 0.01, 0.1, { glideTo: 900 })]
const lap = [t(250, 0.1, 0.04, 0.18, { glideTo: 330 }), n(900, 1, 0.05, 0.04, 0.18)]
const flap = (k: number): Note[] => [n(700 + k * 120, 1, 0.16, 0.01, 0.08), n(2600, 1, 0.06, 0.01, 0.07)]
const wash = [n(2200, 0.8, 0.1, 0.02, 0.25), t(990, 0.06, 0.01, 0.2, { glideTo: 1320 })]
const clack = [t(620, 0.2, 0.001, 0.05, { wave: 'square' }), n(1700, 2, 0.12, 0.001, 0.05)]
const squeal = (k: number): Note[] => [t(up(1175, k % 2 ? 2 : 0), 0.07, 0.03, 0.2, { glideTo: up(1397, k % 2 ? 2 : 0), wave: 'sawtooth' }), n(2400, 6, 0.04, 0.03, 0.18)]
const roll = (k: number): Note[] => [n(130 + (k % 3) * 14, 0.6, 0.24, 0.03, 0.24), t(58 + (k % 3) * 4, 0.16, 0.03, 0.22)]
const unroll = [n(600, 0.6, 0.16, 0.05, 0.4, { glideTo: 1400 }), t(96, 0.12, 0.03, 0.3, { glideTo: 130 })]
const slurp = [n(900, 3, 0.16, 0.06, 0.5, { glideTo: 2600 }), t(200, 0.08, 0.06, 0.45, { glideTo: 420 })]
const blow = [n(2600, 0.6, 0.2, 0.03, 0.45, { glideTo: 1500 }), t(196, 0.1, 0.03, 0.3, { glideTo: 262, wave: 'sawtooth' })]
const plink = [t(1760, 0.09, 0.002, 0.12, { glideTo: 2200 })]

// --- Steps, hands and tools ---------------------------------------------------------------------------------------

const pad = [n(190, 1, 0.05, 0.004, 0.05)]
const wade = [n(1300, 0.8, 0.1, 0.01, 0.12, { glideTo: 700 }), t(240, 0.05, 0.01, 0.08)]
const slop = [t(520, 0.05, 0.01, 0.07, { glideTo: 700 }), n(1700, 1.5, 0.04, 0.01, 0.06)]
const bonk = [t(392, 0.18, 0.003, 0.12, { glideTo: 262, wave: 'triangle' }), t(330, 0.08, 0.02, 0.16, { glideTo: 247, delay: 0.14 })]
const toot = [t(185, 0.1, 0.05, 0.34, { glideTo: 277, wave: 'sawtooth' }), t(92, 0.12, 0.05, 0.34, { glideTo: 139, wave: 'triangle' }), n(700, 1.5, 0.04, 0.05, 0.3)]
const rattle = [t(262, 0.14, 0.002, 0.06, { wave: 'triangle' }), t(233, 0.1, 0.002, 0.06, { wave: 'triangle', delay: 0.09 }), t(262, 0.07, 0.002, 0.06, { wave: 'triangle', delay: 0.17 })]
const TOOL_KNOCK: Record<Tool, Note[]> = {
  wedge: [t(480, 0.16, 0.002, 0.06, { wave: 'triangle' }), n(1100, 2, 0.06, 0.002, 0.04)],
  bucket: [t(330, 0.16, 0.002, 0.3), t(495, 0.07, 0.002, 0.2)],
  rope: [n(1600, 1.5, 0.1, 0.01, 0.08), t(220, 0.06, 0.01, 0.08)],
}
const takeUp = (tool: Tool): Note[] => [...TOOL_KNOCK[tool], t(520, 0.08, 0.004, 0.08, { glideTo: 780, delay: 0.06 })]
const putDown = (tool: Tool): Note[] => [...TOOL_KNOCK[tool], t(300, 0.1, 0.004, 0.08, { glideTo: 200, delay: 0.05 })]
const hang = [...creak, t(990, 0.06, 0.004, 0.12, { delay: 0.18 })]

// --- The dwellers: each kind's own start, and its own way of going ------------------------------------------------

const START: Record<DwellerKind, Note[]> = {
  bat: [t(3300, 0.05, 0.004, 0.06, { glideTo: 4300 }), t(3700, 0.05, 0.004, 0.06, { glideTo: 4700, delay: 0.1 })],
  newt: [t(620, 0.1, 0.01, 0.07, { glideTo: 930 }), n(1500, 1, 0.04, 0.01, 0.06)],
  lizard: [n(2600, 3, 0.07, 0.002, 0.03), n(2900, 3, 0.07, 0.002, 0.03, { delay: 0.05 }), n(3200, 3, 0.07, 0.002, 0.03, { delay: 0.1 }), n(3500, 3, 0.06, 0.002, 0.03, { delay: 0.15 })],
  mushroom: [t(880, 0.14, 0.002, 0.06, { glideTo: 1320 })],
  beetle: [t(240, 0.08, 0.005, 0.2, { wave: 'square' }), t(1200, 0.06, 0.001, 0.02, { delay: 0.02 })],
  fern: [t(196, 0.12, 0.01, 0.1, { glideTo: 147, wave: 'sawtooth' }), t(196, 0.12, 0.01, 0.12, { glideTo: 262, wave: 'sawtooth', delay: 0.14 })],
  glowworm: [t(2093, 0.06, 0.004, 0.2), t(2794, 0.05, 0.004, 0.2, { delay: 0.08 }), t(3136, 0.04, 0.004, 0.2, { delay: 0.16 })],
  snail: [n(700, 2, 0.08, 0.05, 0.25, { glideTo: 500 }), t(330, 0.05, 0.05, 0.2, { glideTo: 262 })],
  moth: [n(900, 1, 0.06, 0.004, 0.03), n(900, 1, 0.06, 0.004, 0.03, { delay: 0.05 }), n(900, 1, 0.05, 0.004, 0.03, { delay: 0.1 }), n(900, 1, 0.04, 0.004, 0.03, { delay: 0.15 })],
  dragonfly: [t(175, 0.08, 0.02, 0.22, { wave: 'sawtooth', glideTo: 233 }), n(2400, 5, 0.04, 0.02, 0.2)],
  spider: [t(660, 0.12, 0.002, 0.22, { wave: 'triangle' }), t(990, 0.05, 0.002, 0.16)],
  flower: [t(1047, 0.08, 0.02, 0.4), t(1319, 0.06, 0.02, 0.4, { delay: 0.1 }), t(1568, 0.05, 0.02, 0.4, { delay: 0.2 })],
}
/** How each kind sounds as it leaves a place that has changed. */
const LEAVE: Record<DwellerKind, Note[]> = {
  bat: [...START.bat, n(800, 1, 0.07, 0.01, 0.05, { delay: 0.04 }), n(800, 1, 0.06, 0.01, 0.05, { delay: 0.14 }), n(800, 1, 0.05, 0.01, 0.05, { delay: 0.24 })],
  newt: [t(700, 0.08, 0.01, 0.06, { glideTo: 400 }), n(1200, 1, 0.05, 0.01, 0.08)],
  lizard: START.lizard,
  mushroom: [t(1320, 0.12, 0.002, 0.06, { glideTo: 660 })],
  beetle: [t(240, 0.07, 0.005, 0.24, { wave: 'square', glideTo: 360 })],
  fern: [t(262, 0.1, 0.01, 0.1, { glideTo: 131, wave: 'sawtooth' }), n(1400, 1, 0.05, 0.01, 0.1, { delay: 0.1 })],
  glowworm: [t(3136, 0.05, 0.004, 0.15), t(2794, 0.04, 0.004, 0.15, { delay: 0.07 }), t(2093, 0.04, 0.004, 0.15, { delay: 0.14 })],
  snail: [n(600, 2, 0.07, 0.03, 0.2, { glideTo: 300 })],
  moth: START.moth,
  dragonfly: [t(233, 0.07, 0.02, 0.24, { wave: 'sawtooth', glideTo: 350 })],
  spider: [t(990, 0.08, 0.002, 0.14, { wave: 'triangle', glideTo: 660 })],
  flower: [t(1568, 0.05, 0.02, 0.25), t(1047, 0.05, 0.02, 0.3, { delay: 0.1 })],
}
const softer = (notes: readonly Note[], by: number): Note[] => notes.map((note) => ({ ...note, peak: note.peak * by }))

const KNOCK = { earth: thump, sandstone: tok, granite: ting, open: echo, water: hollowGlug, gas: hoot, grass: rustle } as const
const TIP = { earth: whump, sand: sandHiss, water: splash } as const

/** The notes one event sounds as. Every event has some. */
export function notesOf(event: Event): readonly Note[] {
  switch (event.type) {
    case 'knock': return event.kind === 'gem' ? glass(event.colour ?? 'red') : KNOCK[event.kind]
    case 'chip': return tink(event.index, event.n)
    case 'break': return event.kind === 'earth' ? crunch(event.index) : [...tink(event.index, event.n), ...clatter]
    case 'clang': return clang
    case 'step': return event.wade ? wade : event.slop ? [...pad, ...slop] : pad
    case 'print': return spray
    case 'poke': return event.who === 'mole' ? bonk : event.who === 'mammoth' ? toot : event.who === 'lift' ? rattle : event.who === 'wedge' || event.who === 'bucket' || event.who === 'rope' ? TOOL_KNOCK[event.who] : START[event.who]
    case 'take': return takeUp(event.tool)
    case 'put': return putDown(event.tool)
    case 'squelch': return squelch
    case 'pop': return pop
    case 'sit': return sit
    case 'split': return split
    case 'ring': return ring(event.n)
    case 'boom': return boom
    case 'jet': return jet
    case 'whistle': return whistle
    case 'prise': return pock
    case 'ding': return ding
    case 'scoop': return event.what === 'earth' ? scrape : rasp
    case 'gong': return gong
    case 'teeth': return teeth
    case 'bloop': return bloop
    case 'plip': return plip
    case 'tip': return TIP[event.what]
    case 'fff': return fff
    case 'burp': return burp
    case 'clink': return clink
    case 'ropehiss': return ropeHiss
    case 'worm': return plip
    case 'zip': return zip(event.n)
    case 'twang': return twang
    case 'flop': return flop
    case 'creak': return creak
    case 'rumble': return rumble
    case 'strain': return strain
    case 'thud': return thud
    case 'clunk': return clunk
    case 'pat': return pat
    case 'bip': return bip(event.n)
    case 'trickle': return trickle
    case 'plap': return plap
    case 'charm': return charm
    case 'hang': return hang
    case 'gemring': return glass(event.colour)
    case 'ping': return ping(event.colour)
    case 'chime': return chime(event.colour)
    case 'tik': return tik
    case 'tock': return tock
    case 'whoomph': return whoomph
    case 'bump': return bump
    case 'shoot': return shoot
    case 'grumble': return grumble
    case 'hm': return hm
    case 'gush': return gush
    case 'glug': return glug(event.n)
    case 'soak': return soak
    case 'lap': return lap
    case 'flap': return flap(event.n)
    case 'wash': return wash
    case 'clack': return clack
    case 'squeal': return squeal(event.n)
    case 'roll': return roll(event.n)
    case 'unroll': return unroll
    case 'show': return softer(START[event.kind], 0.7)
    case 'slurp': return slurp
    case 'spray': return blow
    case 'plink': return plink
    case 'leave': return softer(LEAVE[event.kind], 0.8)
  }
}

/** Everything a handful of events sound as, in order, as one list: one touch, one voice. */
export function notesFor(events: readonly Event[]): Note[] {
  const out: Note[] = []
  for (const event of events) out.push(...notesOf(event))
  return out
}

/** How long a list of notes goes on sounding after it starts, in seconds. */
export function lengthOf(notes: readonly Note[]): number {
  return notes.reduce((end, note) => Math.max(end, (note.delay ?? 0) + note.attack + note.decay), 0)
}
