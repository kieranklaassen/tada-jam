import type { Note } from './audio'
import type { Kind, ToyId } from './layout'

// Every sound of the toy as plain numbers, written from the words of the
// design sheet (ART.md). Nobody has listened to them yet: a test holds every
// pitch, peak and length inside the ranges below.
//
// Sight and sound run on one clock. No note here carries a delay: a sound
// with two parts (the two squeaks of a three-point turn, the clap-clap of
// the bus's doors) is two sounds, each queued by the model on the frame its
// motion happens. A test steps the toy and holds each sound to that frame.

export type Sound = {
  name: string
  notes: readonly Note[]
  /** Part of a tipping-out or a calling-home: a touch that ends the scene silences it (mix.ts). */
  scene?: boolean
}

export const RANGES = {
  hz: [40, 5000],
  peak: [0.005, 0.25],
  attack: [0.001, 0.08],
  decay: [0.015, 0.6],
  /** The longest any one sound lasts, in seconds. */
  seconds: 0.7,
  /** The most the peaks of one sound add up to. */
  sum: 0.4,
} as const

const tone = (frequency: number, wave: OscillatorType, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'tone', frequency, wave, peak, attack, decay, ...(glideTo ? { glideTo } : {}) })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...(glideTo ? { glideTo } : {}) })

const clamp = (value: number, low: number, high: number): number => Math.max(low, Math.min(high, value))

// --- The tape --------------------------------------------------------------

/** The free end of the tape stuck down under the finger: a tick. */
export const stick: Sound = { name: 'stick', notes: [tone(1760, 'triangle', 0.09, 0.002, 0.035, 1320), hiss(3200, 2, 0.05, 0.002, 0.03)] }

/** One tick of the zip, for each half tape-width that comes off the roll: higher the faster the hand pulls. `speed` is in stage units a second. */
export function zip(speed: number): Sound {
  const pitch = 1300 + clamp(speed, 0, 2400) * 1.1
  return { name: 'zip', notes: [hiss(pitch, 6, 0.07, 0.002, 0.03, pitch * 1.15)] }
}

/** The tear at the lift: longer and lower for a longer strip. */
export function rip(length: number): Sound {
  const long = clamp(length / 700, 0, 1)
  return { name: 'rip', notes: [hiss(2900 - long * 700, 0.9, 0.17, 0.004, 0.11 + long * 0.16, 900), hiss(4200, 3, 0.05, 0.002, 0.03)] }
}

/** The end of the press along a strip: a pat of the hand. */
export const pat: Sound = { name: 'pat', notes: [tone(150, 'sine', 0.2, 0.004, 0.09, 85), hiss(520, 1, 0.08, 0.003, 0.05)] }

const ROLL_PITCH: Record<Kind, number> = { 0: 330, 1: 392, 2: 440, 3: 523 }

/** A roll picked: it turns a quarter with a creak, each roll at its own pitch. */
export function rollPick(kind: Kind): Sound {
  const pitch = ROLL_PITCH[kind]
  return { name: `roll-${kind}`, notes: [tone(pitch, 'triangle', 0.09, 0.01, 0.16, pitch * 1.12), hiss(2400, 4, 0.04, 0.002, 0.03)] }
}

// --- The car ---------------------------------------------------------------

/** The car sets off. */
export const brrm: Sound = { name: 'brrm', notes: [tone(92, 'sawtooth', 0.1, 0.02, 0.26, 184), hiss(300, 1, 0.04, 0.01, 0.16)] }

/** One beat of the engine's purr, quieter the longer the child has only watched. `level` runs from 0 to 1. */
export function purr(level: number): Sound {
  return { name: 'purr', notes: [tone(112, 'triangle', 0.012 + 0.04 * clamp(level, 0, 1), 0.006, 0.07, 96)] }
}

/** A wheel over a gap between two boards. */
export const clack: Sound = { name: 'clack', notes: [hiss(1250, 5, 0.08, 0.002, 0.03), tone(520, 'triangle', 0.05, 0.002, 0.035)] }

/** A tyre squeak into a turn, and the lower one of backing up in a three-point turn. */
export const squeak: Sound = { name: 'squeak', notes: [tone(1500, 'sine', 0.06, 0.01, 0.09, 2150)] }
export const squeakBack: Sound = { name: 'squeak-back', notes: [tone(1340, 'sine', 0.06, 0.01, 0.11, 980)] }

/** One turn of the car spinning on a stub like a top. */
export const whirr: Sound = { name: 'whirr', notes: [tone(300, 'sawtooth', 0.05, 0.03, 0.24, 720)] }

/** Parked. */
export const beep: Sound = { name: 'beep', notes: [tone(880, 'square', 0.04, 0.005, 0.1)] }

// --- A tap on a toy: each one's own sounds, one for each move it makes ------------------------------------------

export const TAPPED: Record<ToyId, readonly Sound[]> = {
  car: [{ name: 'parp', notes: [tone(311, 'square', 0.07, 0.008, 0.17), tone(392, 'square', 0.06, 0.008, 0.17)] }],
  bus: [
    { name: 'clap-open', notes: [hiss(1900, 1.5, 0.11, 0.002, 0.04)] },
    { name: 'clap-shut', notes: [hiss(1500, 1.5, 0.12, 0.002, 0.05)] },
    { name: 'ding', notes: [tone(1320, 'sine', 0.09, 0.003, 0.4), tone(2640, 'sine', 0.03, 0.003, 0.2)] },
  ],
  duck: [
    { name: 'squash', notes: [hiss(700, 1, 0.06, 0.004, 0.1, 380), tone(820, 'sine', 0.04, 0.004, 0.09, 480)] },
    { name: 'squeal', notes: [tone(1050, 'sine', 0.1, 0.05, 0.5, 2300), tone(2100, 'triangle', 0.02, 0.05, 0.4, 4500)] },
  ],
  train: [
    { name: 'toot', notes: [tone(587, 'sine', 0.08, 0.02, 0.32), tone(740, 'sine', 0.07, 0.02, 0.32)] },
    { name: 'puff', notes: [hiss(700, 0.8, 0.09, 0.02, 0.2, 420)] },
  ],
  dog: [
    { name: 'yap', notes: [tone(520, 'sawtooth', 0.08, 0.005, 0.09, 790)] },
    { name: 'yap-again', notes: [tone(600, 'sawtooth', 0.07, 0.005, 0.08, 900)] },
  ],
  pegA: [{ name: 'hee-a', notes: [tone(880, 'sine', 0.08, 0.01, 0.09, 1320)] }, { name: 'tok-a', notes: [tone(262, 'triangle', 0.09, 0.002, 0.05)] }],
  pegB: [{ name: 'hee-b', notes: [tone(990, 'triangle', 0.07, 0.01, 0.1, 1480)] }, { name: 'tok-b', notes: [tone(294, 'triangle', 0.09, 0.002, 0.05)] }],
  pegC: [{ name: 'hee-c', notes: [tone(784, 'sine', 0.08, 0.012, 0.11, 1175)] }, { name: 'tok-c', notes: [tone(233, 'triangle', 0.09, 0.002, 0.05)] }],
}

// --- A toy hopping aside, tumbling out or going home: its own take-off and its own landing ---------------------

export const HOP: Record<ToyId, Sound> = {
  car: { name: 'hop-car', notes: [tone(440, 'square', 0.035, 0.004, 0.05, 620)] },
  bus: { name: 'hop-bus', notes: [hiss(900, 0.8, 0.07, 0.01, 0.12, 2200)] },
  duck: { name: 'hop-duck', notes: [tone(1200, 'sine', 0.06, 0.01, 0.07, 1700)] },
  train: { name: 'hop-train', notes: [hiss(1600, 2, 0.06, 0.004, 0.09), tone(196, 'triangle', 0.04, 0.004, 0.06)] },
  dog: { name: 'hop-dog', notes: [tone(640, 'sawtooth', 0.045, 0.004, 0.05, 860)] },
  pegA: { name: 'hop-peg-a', notes: [tone(1047, 'sine', 0.05, 0.004, 0.05, 1400)] },
  pegB: { name: 'hop-peg-b', notes: [tone(1175, 'triangle', 0.05, 0.004, 0.05, 1560)] },
  pegC: { name: 'hop-peg-c', notes: [tone(932, 'sine', 0.05, 0.004, 0.05, 1240)] },
}

export const LAND: Record<ToyId, Sound> = {
  car: { name: 'land-car', notes: [tone(118, 'sine', 0.16, 0.003, 0.08, 80), hiss(900, 2, 0.04, 0.002, 0.03)] },
  bus: { name: 'land-bus', notes: [tone(70, 'sine', 0.22, 0.004, 0.16, 48), hiss(260, 0.8, 0.08, 0.004, 0.09)] },
  duck: { name: 'land-duck', notes: [tone(190, 'sine', 0.1, 0.003, 0.06, 140), tone(1500, 'sine', 0.04, 0.01, 0.06, 1900)] },
  train: { name: 'land-train', notes: [tone(84, 'triangle', 0.18, 0.003, 0.12, 60), hiss(2600, 6, 0.06, 0.002, 0.05)] },
  dog: { name: 'land-dog', notes: [tone(140, 'sine', 0.13, 0.003, 0.07, 100), hiss(1800, 3, 0.04, 0.002, 0.04)] },
  pegA: { name: 'land-peg-a', notes: [tone(262, 'triangle', 0.1, 0.002, 0.045)] },
  pegB: { name: 'land-peg-b', notes: [tone(294, 'triangle', 0.1, 0.002, 0.045)] },
  pegC: { name: 'land-peg-c', notes: [tone(233, 'triangle', 0.1, 0.002, 0.045)] },
}

// --- The shoebox, the cat and the room ---------------------------------------------------------------------------

/** The box going over onto its side, and being stood upright. */
export const boxThump: Sound = { name: 'box-thump', notes: [tone(96, 'sine', 0.2, 0.004, 0.2, 58), hiss(320, 0.7, 0.1, 0.004, 0.14)] }
export const boxKnock: Sound = { name: 'box-knock', notes: [tone(180, 'triangle', 0.14, 0.003, 0.08), hiss(800, 1, 0.07, 0.003, 0.05)] }

/** The cat, tapped. */
export const prrp: Sound = { name: 'prrp', notes: [tone(300, 'sine', 0.06, 0.03, 0.15, 455), hiss(210, 3, 0.03, 0.02, 0.16)] }

/** A finger on the boards outside the bare floor, on the rug, and on the skirting board. */
export const tock: Sound = { name: 'tock', notes: [tone(240, 'sine', 0.09, 0.002, 0.06, 200), hiss(1500, 3, 0.03, 0.002, 0.02)] }
export const pff: Sound = { name: 'pff', notes: [hiss(420, 0.6, 0.06, 0.008, 0.12)] }
export const tok: Sound = { name: 'tok', notes: [tone(420, 'triangle', 0.08, 0.002, 0.045), hiss(2200, 4, 0.03, 0.002, 0.02)] }

/** The wicker basket of wool and the pot plant, touched. */
/** The enamel tray under the rolls. */
export const ting: Sound = { name: 'ting', notes: [tone(1480, 'sine', 0.07, 0.002, 0.22), tone(2960, 'sine', 0.02, 0.002, 0.1)] }
export const pomf: Sound = { name: 'pomf', notes: [tone(170, 'sine', 0.1, 0.012, 0.16, 120), hiss(380, 0.7, 0.05, 0.01, 0.1)] }
export const frond: Sound = { name: 'frond', notes: [hiss(3300, 1.4, 0.07, 0.02, 0.22, 2300), hiss(1700, 2, 0.03, 0.03, 0.16)] }

// --- More of the tape ----------------------------------------------------------------------------------------------

/** A torn end lifted under the finger: a dry creak. */
export const creak: Sound = { name: 'creak', notes: [tone(620, 'sawtooth', 0.045, 0.012, 0.11, 840), hiss(2600, 3, 0.03, 0.004, 0.05)] }

/** One tick of a strip coming off the floor while the finger peels it. `left` runs from 1, just begun, to 0, nearly off. */
export function peelTick(left: number): Sound {
  const pitch = 1500 + clamp(left, 0, 1) * 900
  return { name: 'peel-tick', notes: [hiss(pitch, 1.6, 0.08, 0.003, 0.05, pitch * 0.8)] }
}

/** The strip off the floor and gone, at the lift that ends a peel. */
export const peelOff: Sound = { name: 'peel-off', notes: [hiss(1900, 0.8, 0.13, 0.006, 0.2, 3400), tone(210, 'sine', 0.05, 0.004, 0.06)] }

/** The oldest strip lifting by itself to make room: its own small rip. */
export const smallRip: Sound = { name: 'small-rip', notes: [hiss(3100, 1.1, 0.09, 0.004, 0.13, 1500)] }

/** A toy stuck under a new strip straining at it, and popping free. */
export const strain: Sound = { name: 'strain', notes: [tone(180, 'sawtooth', 0.05, 0.05, 0.3, 260), hiss(700, 2, 0.03, 0.03, 0.2)] }
export const thwip: Sound = { name: 'thwip', notes: [hiss(2200, 2.2, 0.13, 0.003, 0.07, 4600), tone(520, 'sine', 0.06, 0.003, 0.08, 980)] }

/** A toy lifted off the floor in the child's hand, set down again, and rolling straight back out of the tipped box. */
export const pickUp: Sound = { name: 'pick-up', notes: [tone(700, 'sine', 0.045, 0.006, 0.07, 1050)] }
export const setDown: Sound = { name: 'set-down', notes: [tone(160, 'sine', 0.1, 0.003, 0.07, 110), hiss(1200, 2, 0.03, 0.002, 0.03)] }
export const boxRattle: Sound = { name: 'box-rattle', notes: [hiss(900, 3, 0.09, 0.004, 0.18, 1500), tone(230, 'triangle', 0.06, 0.004, 0.12, 180)] }

/** A toy that cannot get out of the way shuffling where it stands. */
export const scuff: Sound = { name: 'scuff', notes: [hiss(1100, 1.2, 0.04, 0.01, 0.07)] }

const quiet = (level: number, low: number, high: number): number => low + (high - low) * clamp(level, 0, 1)

// --- The car on every tape -----------------------------------------------------------------------------------------

/** The car revving as a grey strip is pulled. */
export const rev: Sound = { name: 'rev', notes: [tone(120, 'sawtooth', 0.06, 0.03, 0.2, 230)] }
/** Afloat on blue tape: its engine glugs in bubbles. */
export function glug(level: number): Sound { return { name: 'glug', notes: [tone(190, 'sine', quiet(level, 0.012, 0.07), 0.012, 0.09, 330)] } }
/** Washed up at the end of the river, and shaking off the drops. */
export const splutter: Sound = { name: 'splutter', notes: [hiss(600, 1.5, 0.1, 0.01, 0.22, 240), tone(98, 'sawtooth', 0.06, 0.02, 0.2, 70)] }
export const shakeOff: Sound = { name: 'shake-off', notes: [hiss(3600, 2.5, 0.06, 0.006, 0.16), hiss(1400, 2, 0.04, 0.006, 0.12)] }
/** Stuck in the hedge: wheels spinning. And backing out of it. */
export const wheelSpin: Sound = { name: 'wheel-spin', notes: [tone(360, 'sawtooth', 0.055, 0.04, 0.4, 900), hiss(2800, 3, 0.03, 0.02, 0.3)] }
export const pop: Sound = { name: 'pop', notes: [tone(420, 'sine', 0.12, 0.003, 0.06, 900)] }
/** Juddering along between the rails. */
export function chatter(level: number): Sound { return { name: 'chatter', notes: [tone(240, 'square', quiet(level, 0.008, 0.035), 0.002, 0.03), hiss(1900, 5, quiet(level, 0.006, 0.03), 0.002, 0.02)] } }
/** A float snagged in the reeds. */
export const gulp: Sound = { name: 'gulp', notes: [tone(260, 'sine', 0.09, 0.02, 0.12, 120)] }
/** Honking at a hedge across the road, braking at a level crossing and idling there. */
export const honk: Sound = { name: 'honk', notes: [tone(330, 'square', 0.06, 0.008, 0.2), tone(415, 'square', 0.05, 0.008, 0.2)] }
export const brake: Sound = { name: 'brake', notes: [tone(1750, 'sine', 0.055, 0.008, 0.16, 1300)] }
export function putPut(level: number): Sound { return { name: 'put-put', notes: [tone(84, 'triangle', quiet(level, 0.012, 0.06), 0.004, 0.06, 70)] } }
/** Hollow boards under the wheels on a bridge: the car's drum and the bus's lower one. */
export const bom: Sound = { name: 'bom', notes: [tone(150, 'sine', 0.13, 0.004, 0.14, 110), hiss(420, 1.2, 0.03, 0.004, 0.06)] }
export const bomLow: Sound = { name: 'bom-low', notes: [tone(92, 'sine', 0.17, 0.005, 0.2, 68), hiss(300, 1, 0.04, 0.005, 0.08)] }
/** A short toot at a toy that cannot get out of the way. */
export const tootCar: Sound = { name: 'toot-car', notes: [tone(392, 'square', 0.045, 0.006, 0.09)] }

// --- The bus -------------------------------------------------------------------------------------------------------

export function drone(level: number): Sound { return { name: 'drone', notes: [tone(74, 'sawtooth', quiet(level, 0.01, 0.05), 0.03, 0.2, 66)] } }
export function rumble(level: number): Sound { return { name: 'rumble', notes: [tone(58, 'triangle', quiet(level, 0.012, 0.07), 0.02, 0.16, 52), hiss(180, 0.8, quiet(level, 0.005, 0.025), 0.02, 0.1)] } }
export const droneOff: Sound = { name: 'drone-off', notes: [tone(66, 'sawtooth', 0.08, 0.05, 0.3, 98)] }
export const pssh: Sound = { name: 'pssh', notes: [hiss(2400, 0.7, 0.1, 0.03, 0.4, 900)] }
export const doorHiss: Sound = { name: 'door-hiss', notes: [hiss(3800, 1.2, 0.08, 0.02, 0.26, 2100)] }
export const ding: Sound = { name: 'stop-ding', notes: [tone(1568, 'sine', 0.08, 0.003, 0.36), tone(3136, 'sine', 0.025, 0.003, 0.18)] }
export const boo: Sound = { name: 'boo', notes: [tone(98, 'sawtooth', 0.07, 0.08, 0.55), tone(147, 'sine', 0.06, 0.08, 0.55)] }
export const pushIn: Sound = { name: 'push-in', notes: [hiss(2000, 1, 0.08, 0.04, 0.34, 1300)] }
export const choo: Sound = { name: 'choo', notes: [hiss(2900, 2, 0.1, 0.004, 0.09), tone(1250, 'sine', 0.07, 0.01, 0.14, 2100)] }
export const beepBack: Sound = { name: 'beep-back', notes: [tone(988, 'square', 0.035, 0.005, 0.13)] }
export const honkLow: Sound = { name: 'honk-low', notes: [tone(165, 'square', 0.07, 0.01, 0.26), tone(208, 'square', 0.05, 0.01, 0.26)] }
/** A peg hopping aboard. */
export const hup: Sound = { name: 'hup', notes: [tone(660, 'triangle', 0.07, 0.008, 0.08, 990)] }

// --- The duck ------------------------------------------------------------------------------------------------------

export function patPat(level: number): Sound { return { name: 'pat-pat', notes: [hiss(820, 2, quiet(level, 0.008, 0.045), 0.003, 0.035)] } }
export function slap(level: number): Sound { return { name: 'slap', notes: [hiss(1500, 1.4, quiet(level, 0.01, 0.06), 0.002, 0.045), tone(210, 'sine', quiet(level, 0.005, 0.03), 0.002, 0.03)] } }
export function peep(level: number): Sound { return { name: 'peep', notes: [tone(2350, 'sine', quiet(level, 0.008, 0.04), 0.006, 0.05, 2700)] } }
export const quack: Sound = { name: 'quack', notes: [tone(640, 'sawtooth', 0.08, 0.008, 0.12, 430), hiss(1300, 4, 0.03, 0.006, 0.08)] }
export const preenSqueak: Sound = { name: 'preen', notes: [tone(1650, 'sine', 0.04, 0.02, 0.09, 1900)] }
export const bloop: Sound = { name: 'bloop', notes: [tone(240, 'sine', 0.11, 0.01, 0.13, 620)] }
export const rustle: Sound = { name: 'rustle', notes: [hiss(2700, 1.3, 0.06, 0.02, 0.2, 3500)] }
export const wek: Sound = { name: 'wek', notes: [tone(360, 'sawtooth', 0.05, 0.02, 0.16, 300)] }
export const duckSneeze: Sound = { name: 'duck-sneeze', notes: [hiss(3400, 3, 0.07, 0.003, 0.05), tone(1400, 'triangle', 0.05, 0.004, 0.07, 900)] }

// --- The train -----------------------------------------------------------------------------------------------------

export function chuff(level: number): Sound { return { name: 'chuff', notes: [hiss(520, 1, quiet(level, 0.012, 0.075), 0.008, 0.08, 330)] } }
/** Its chuff inside the hedge: muffled. */
export function chuffIn(level: number): Sound { return { name: 'chuff-in', notes: [hiss(190, 1.4, quiet(level, 0.01, 0.05), 0.015, 0.09, 150)] } }
export function clank(level: number): Sound { return { name: 'clank', notes: [tone(980, 'triangle', quiet(level, 0.006, 0.035), 0.002, 0.07), tone(1470, 'sine', quiet(level, 0.005, 0.015), 0.002, 0.05)] } }
export const hoot: Sound = { name: 'hoot', notes: [tone(494, 'sine', 0.08, 0.03, 0.4), tone(622, 'sine', 0.07, 0.03, 0.4)] }
export const whistle: Sound = { name: 'whistle', notes: [tone(1320, 'sine', 0.07, 0.015, 0.12, 1400)] }
export const huff: Sound = { name: 'huff', notes: [hiss(430, 0.8, 0.1, 0.03, 0.26, 260)] }
export const longHiss: Sound = { name: 'long-hiss', notes: [hiss(3000, 0.6, 0.12, 0.07, 0.6, 1500)] }
export const rollBack: Sound = { name: 'roll-back', notes: [tone(70, 'triangle', 0.08, 0.04, 0.34, 56), hiss(900, 4, 0.03, 0.02, 0.2)] }
export const clonk: Sound = { name: 'clonk', notes: [tone(196, 'triangle', 0.14, 0.003, 0.09, 150), hiss(700, 2, 0.05, 0.003, 0.05)] }
export const puffPop: Sound = { name: 'puff-pop', notes: [hiss(820, 1, 0.08, 0.01, 0.1), tone(560, 'sine', 0.09, 0.003, 0.05, 1100)] }
export const buffersRing: Sound = { name: 'buffers', notes: [tone(880, 'triangle', 0.09, 0.003, 0.3), tone(1318, 'sine', 0.05, 0.003, 0.22)] }
export const clatter: Sound = { name: 'clatter', notes: [hiss(1650, 4, 0.09, 0.002, 0.04), tone(310, 'triangle', 0.06, 0.002, 0.05)] }
export const tonk: Sound = { name: 'tonk', notes: [tone(262, 'sine', 0.11, 0.004, 0.16, 232), tone(524, 'sine', 0.03, 0.004, 0.08)] }

// --- The dog -------------------------------------------------------------------------------------------------------

export function sniff(level: number): Sound { return { name: 'sniff', notes: [hiss(2500, 2.4, quiet(level, 0.008, 0.045), 0.012, 0.045)] } }
export function claws(level: number): Sound { return { name: 'claws', notes: [tone(2900, 'triangle', quiet(level, 0.006, 0.028), 0.001, 0.016)] } }
export function pant(level: number): Sound { return { name: 'pant', notes: [hiss(980, 1.8, quiet(level, 0.008, 0.045), 0.02, 0.06)] } }
export const hmf: Sound = { name: 'hmf', notes: [hiss(330, 1, 0.07, 0.03, 0.2, 200), tone(125, 'sine', 0.04, 0.03, 0.16)] }
export const splash: Sound = { name: 'splash', notes: [hiss(1250, 0.8, 0.11, 0.004, 0.16, 2500)] }
export const shakeDry: Sound = { name: 'shake-dry', notes: [hiss(880, 3.5, 0.08, 0.004, 0.22, 1300), tone(150, 'square', 0.03, 0.004, 0.2)] }
export const tinkle: Sound = { name: 'tinkle', notes: [tone(2100, 'sine', 0.045, 0.005, 0.28, 2600), hiss(4300, 5, 0.02, 0.005, 0.2)] }
export const howl: Sound = { name: 'howl', notes: [tone(470, 'sine', 0.09, 0.08, 0.58, 730)] }
export const woof: Sound = { name: 'woof', notes: [tone(235, 'sawtooth', 0.1, 0.006, 0.1, 185), hiss(800, 1.5, 0.04, 0.006, 0.07)] }
export const whine: Sound = { name: 'whine', notes: [tone(1050, 'sine', 0.035, 0.03, 0.16, 1250)] }

/** What each of the five says to a toy that cannot get out of its way. */
export const TOOT: Record<'car' | 'bus' | 'duck' | 'train' | 'dog', Sound> = { car: tootCar, bus: honkLow, duck: quack, train: whistle, dog: whine }

/** A sound as loud as the town is: full after a touch, and softer the longer the child has only watched. */
export function soften(sound: Sound, level: number): Sound {
  if (level >= 1) return sound
  const by = 0.3 + 0.7 * clamp(level, 0, 1)
  return { ...sound, notes: sound.notes.map((note) => ({ ...note, peak: Math.max(0.005, note.peak * by) })) }
}

/** The same sound, marked as part of a scene. */
export function inScene(sound: Sound): Sound {
  return { ...sound, scene: true }
}

/** The sounds whose loudness follows how long the child has only watched, for the tests. */
export const LEVELLED: readonly ((level: number) => Sound)[] = [purr, glug, chatter, putPut, drone, rumble, patPat, slap, peep, chuff, chuffIn, clank, sniff, claws, pant]

/** Every fixed sound, for the tests. */
export const FIXED: readonly Sound[] = [
  stick, pat, brrm, clack, squeak, squeakBack, whirr, beep, boxThump, boxKnock, prrp, tock, pff, tok,
  pomf, frond, creak, peelOff, smallRip, strain, thwip, pickUp, setDown, boxRattle, scuff,
  rev, splutter, shakeOff, wheelSpin, pop, gulp, honk, brake, bom, bomLow, tootCar,
  droneOff, pssh, doorHiss, ding, boo, pushIn, choo, beepBack, honkLow, hup,
  quack, preenSqueak, bloop, rustle, wek, duckSneeze,
  hoot, whistle, huff, longHiss, rollBack, clonk, puffPop, buffersRing, clatter, tonk,
  hmf, splash, shakeDry, tinkle, howl, woof, whine,
  ...Object.values(TAPPED).flat(), ...Object.values(HOP), ...Object.values(LAND),
]

/** What the cat on the rug opens an eye at: anything that honks. */
export const HONKS: ReadonlySet<string> = new Set([honk.name, honkLow.name, tootCar.name, TAPPED.car[0].name])
