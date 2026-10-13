import type { Note } from './audio'
import { MUD, ROCK, SAND, STONE, isLump, type Kind } from './ground'
import type { KingdomEvent } from './kingdom'
import type { RaidEvent } from './raid'
import type { InvaderKind, Shot } from './habits'
import { SHOT_OF } from './machines'
import type { Mover } from './motion'
import type { ToyEvent } from './toy'

// Every sound of the game as plain numbers: pitch, peak, attack and length. Nobody has heard them: they are written
// from the design sheet's words (ART.md, the grid), kept short, and a test holds each inside a stated range. The
// Mount turns a list into one voice with `voiceOf` (audio.ts) and plays it inside the touch that caused it.

/** The ranges every note is held to. */
export const RANGE = {
  frequency: [40, 5000],
  peak: [0.02, 0.3],
  attack: [0.001, 0.08],
  decay: [0.03, 0.9],
  /** The longest a whole voice lasts, in seconds, and the most its peaks add up to. */
  length: 1.3,
  loudness: 0.62,
} as const

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const hiss = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, peak, attack, decay, ...more })

export type Material = Shot

/** How many steps of speed the dig's crunch has. Every voice that takes a number is made once, at load, a step at a time: playing one makes nothing new. */
export const DIG_STEPS = 12
const DIG: Note[][] = Array.from({ length: DIG_STEPS + 1 }, (_, n) => {
  const s = n / DIG_STEPS
  return [hiss(320 + 520 * s, 0.16, 0.003, 0.09, { q: 1.4, glideTo: 240 + 300 * s }), tone(96 - 20 * s, 0.1, 0.004, 0.08, { glideTo: 62 })]
})

/** A mouthful of earth: a crunch whose pitch follows the speed of the finger, from 0 (a tap) to 1 (a fast drag). */
export function digVoice(speed: number): Note[] {
  return DIG[Math.round(Math.max(0, Math.min(1, speed)) * DIG_STEPS)]
}

/** What the dig meets and cannot bite: sand trickles, mud squelches, a stone clinks, and the rock rings dull. */
export const MET: Record<Material | 'rock', Note[]> = {
  sand: [hiss(3200, 0.07, 0.01, 0.2, { q: 0.8 })],
  mud: [tone(180, 0.12, 0.012, 0.16, { glideTo: 92 }), hiss(520, 0.06, 0.01, 0.12, { q: 2.2, glideTo: 300 })],
  stone: [tone(1900, 0.12, 0.002, 0.07, { wave: 'triangle' }), tone(2850, 0.06, 0.002, 0.05)],
  rock: [tone(142, 0.12, 0.004, 0.2), hiss(220, 0.05, 0.004, 0.1, { q: 3 })],
}

/** Taking a lump in the jaws: sand patters, mud smacks wetly, a stone grinds. */
export const PICKED: Record<Material, Note[]> = {
  sand: [hiss(2400, 0.06, 0.002, 0.04, { q: 1.2 }), hiss(2700, 0.05, 0.002, 0.04, { q: 1.2, delay: 0.06 }), hiss(2200, 0.04, 0.002, 0.05, { q: 1.2, delay: 0.13 })],
  mud: [hiss(700, 0.1, 0.006, 0.12, { q: 1.8, glideTo: 300 }), tone(150, 0.1, 0.02, 0.14, { glideTo: 110 })],
  stone: [hiss(260, 0.12, 0.02, 0.3, { q: 3.2, glideTo: 200 }), tone(74, 0.07, 0.02, 0.2)],
}

/** Setting a lump down: sand lands with a puff, mud with a splat, a stone with a thud. */
export const SET_DOWN: Record<Material, Note[]> = {
  sand: [hiss(1800, 0.08, 0.02, 0.16, { q: 0.6 })],
  mud: [hiss(420, 0.14, 0.004, 0.11, { q: 1.6, glideTo: 180 }), tone(120, 0.1, 0.006, 0.12, { glideTo: 70 })],
  stone: [tone(85, 0.2, 0.003, 0.22, { glideTo: 50 }), hiss(160, 0.08, 0.003, 0.08, { q: 2 })],
}

/** A lump that fell comes to rest: sand hushes, mud plops, a stone thuds harder the further it fell (1 to 8 cells). */
export function landedVoice(material: Material, fell: number): Note[] {
  return LANDED[material][Math.max(1, Math.min(8, Math.round(fell))) - 1]
}
const landedAt = (material: Material, fell: number): Note[] => {
  const far = (fell - 1) / 7
  if (material === 'sand') return [hiss(2600, 0.05 + 0.03 * far, 0.02, 0.22, { q: 0.7 })]
  if (material === 'mud') return [tone(300, 0.1 + 0.04 * far, 0.004, 0.1, { glideTo: 120 })]
  return [tone(70, 0.18 + 0.1 * far, 0.003, 0.26 + 0.1 * far, { glideTo: 42 }), hiss(140, 0.06 + 0.04 * far, 0.003, 0.1, { q: 2 })]
}
const LANDED: Record<Material, Note[][]> = {
  sand: Array.from({ length: 8 }, (_, n) => landedAt('sand', n + 1)),
  mud: Array.from({ length: 8 }, (_, n) => landedAt('mud', n + 1)),
  stone: Array.from({ length: 8 }, (_, n) => landedAt('stone', n + 1)),
}

/** Sand on the move: a long hiss, fuller the more cells are pouring (1 to 12). */
export function pourVoice(cells: number): Note[] {
  return POUR[Math.max(1, Math.min(12, Math.round(cells))) - 1]
}
const POUR: Note[][] = Array.from({ length: 12 }, (_, n) => {
  const many = n / 11
  return [hiss(3600, 0.05 + 0.07 * many, 0.04, 0.34 + 0.2 * many, { q: 0.7, glideTo: 2800 })]
})

/** A lump let go where it cannot lie goes back with a small step down. */
export const BACK: Note[] = [tone(500, 0.08, 0.004, 0.07, { wave: 'triangle', glideTo: 380 })]

/** The dewdrop bell. */
export const BELL: Note[] = [tone(1320, 0.14, 0.003, 0.8), tone(1980, 0.07, 0.003, 0.5), tone(2640, 0.03, 0.003, 0.3)]

/** The hill, a toadstool or the log, poked: a soft boing. */
export const BOING: Note[] = [tone(220, 0.12, 0.006, 0.22, { glideTo: 440 })]

export type Speaker = Mover

/** Each creature's own voice when it is poked: invented babble, never a word. */
export const SPOKEN: Record<Speaker, Note[]> = {
  ant: [tone(880, 0.1, 0.004, 0.07, { wave: 'triangle', glideTo: 1180 }), tone(1320, 0.08, 0.004, 0.08, { wave: 'triangle', delay: 0.09 })],
  worker: [tone(360, 0.09, 0.01, 0.08, { glideTo: 300 }), tone(330, 0.08, 0.01, 0.08, { delay: 0.1, glideTo: 280 }), tone(300, 0.07, 0.01, 0.12, { delay: 0.2, glideTo: 240 })],
  queen: [tone(520, 0.1, 0.02, 0.16, { glideTo: 700 }), tone(700, 0.1, 0.02, 0.24, { delay: 0.16, glideTo: 430 })],
  raider: [tone(1500, 0.08, 0.003, 0.05, { wave: 'square' }), tone(1750, 0.07, 0.003, 0.05, { wave: 'square', delay: 0.07 })],
  beetle: [tone(110, 0.14, 0.03, 0.3, { wave: 'triangle', glideTo: 84 })],
  fly: [tone(196, 0.07, 0.01, 0.26, { wave: 'sawtooth', glideTo: 262 }), hiss(900, 0.03, 0.01, 0.2, { q: 4 })],
  dungBeetle: [tone(240, 0.11, 0.02, 0.12, { wave: 'triangle', glideTo: 200 }), tone(200, 0.1, 0.02, 0.18, { wave: 'triangle', delay: 0.14, glideTo: 150 })],
  dungFly: [tone(620, 0.08, 0.005, 0.06, { wave: 'sawtooth' }), tone(780, 0.08, 0.005, 0.06, { wave: 'sawtooth', delay: 0.08 }), tone(930, 0.08, 0.005, 0.2, { wave: 'sawtooth', delay: 0.16 })],
  dungBall: [tone(64, 0.14, 0.004, 0.16, { glideTo: 48 }), hiss(300, 0.04, 0.004, 0.06, { q: 2 })],
}

/** How long a voice lasts, in seconds. */
export const lengthOf = (notes: readonly Note[]): number => Math.max(0, ...notes.map((note) => (note.delay ?? 0) + note.attack + note.decay))

const materialOf = (kind: Kind): Material | null => (isLump(kind) ? SHOT_OF(kind) : null)

/** The voice of something the toy says happened, or null where it makes no sound. */
export function voiceFor(event: ToyEvent): Note[] | null {
  switch (event.type) {
    case 'dug':
      return digVoice(event.speed)
    case 'met': {
      const material = materialOf(event.kind)
      return material ? MET[material] : event.kind === ROCK ? MET.rock : null
    }
    case 'picked':
      return PICKED[materialOf(event.kind)!]
    case 'set':
      return SET_DOWN[materialOf(event.kind)!]
    case 'back':
      return BACK
    case 'landed':
      return landedVoice(materialOf(event.kind)!, event.fell)
    case 'pour':
      return pourVoice(event.cells)
    case 'buried':
      return SPOKEN.ant
    case 'tapped':
      return TAP
    case 'called':
      return CALLED
    case 'carrying':
      return CARRYING[materialOf(event.kind)!]
  }
}

/** The least time between two voices of the same kind of event, in seconds, so a fast drag crunches and does not roar. */
export const APART: Record<ToyEvent['type'], number> = { dug: 0.07, met: 0.12, picked: 0, set: 0, back: 0, landed: 0.09, pour: 0.28, buried: 0.5, tapped: 0.15, called: 0.1, carrying: 0.3 }

/** The ant taps a stone it passes: one small clink, higher and softer than a bite's. */
export const TAP: Note[] = [tone(2300, 0.07, 0.002, 0.05, { wave: 'triangle' })]
/** Mud that holds under a pusher: a slow, low creak that bends down and back, with a little grit in it. */
export const CREAK: Note[] = [tone(96, 0.1, 0.06, 0.5, { wave: 'sawtooth', glideTo: 78 }), tone(118, 0.06, 0.05, 0.4, { wave: 'sawtooth', glideTo: 132, delay: 0.3 }), hiss(380, 0.03, 0.05, 0.4, { q: 4, delay: 0.1 })]
/** A raider ant's feet going into mud: a short sucking pop, a wet tone that falls fast and a small click of air after it. */
export const SUCK: Note[] = [tone(420, 0.14, 0.004, 0.11, { glideTo: 110 }), hiss(900, 0.07, 0.003, 0.05, { q: 3, delay: 0.09 }), tone(260, 0.07, 0.003, 0.05, { glideTo: 520, delay: 0.14 })]
/** The ending opens with three soft notes going down, like the end of a lullaby. */
export const ENDING: Note[] = [tone(392, 0.09, 0.03, 0.5, { wave: 'triangle' }), tone(330, 0.08, 0.03, 0.5, { wave: 'triangle', delay: 0.3 }), tone(262, 0.09, 0.03, 0.6, { wave: 'triangle', delay: 0.6 })]
/** The ant called to a place already dug: a small patter of feet, three quick soft ticks. */
export const CALLED: Note[] = [hiss(1900, 0.05, 0.003, 0.04, { q: 2 }), hiss(1700, 0.05, 0.003, 0.04, { q: 2, delay: 0.06 }), hiss(1900, 0.04, 0.003, 0.04, { q: 2, delay: 0.12 })]
/** A beat of carrying: grains of sand patter, mud drips with a small wet smack, a stone scrapes along the floor. */
export const CARRYING: Record<Material, Note[]> = {
  sand: [hiss(3800, 0.035, 0.004, 0.05, { q: 1.2 }), hiss(3300, 0.03, 0.004, 0.05, { q: 1.2, delay: 0.08 })],
  mud: [tone(210, 0.07, 0.01, 0.07, { glideTo: 120 }), hiss(700, 0.035, 0.005, 0.05, { q: 3, delay: 0.05 })],
  stone: [hiss(420, 0.07, 0.02, 0.2, { q: 2.5 }), tone(96, 0.05, 0.02, 0.18, { wave: 'triangle' })],
}

/** The catapult's arm lets go with a twang, the cannon with a hollow pop; an empty machine turns with a click, and a machine set down knocks. */
export const TWANG: Note[] = [tone(330, 0.14, 0.003, 0.16, { wave: 'triangle', glideTo: 520 }), hiss(900, 0.05, 0.003, 0.06, { q: 2 })]
export const POP: Note[] = [tone(150, 0.2, 0.002, 0.12, { glideTo: 70 }), hiss(1200, 0.08, 0.002, 0.07, { q: 0.8 })]
export const CLICK: Note[] = [tone(1100, 0.08, 0.002, 0.04, { wave: 'square' })]
export const KNOCK: Note[] = [tone(210, 0.12, 0.003, 0.09, { wave: 'triangle', glideTo: 160 })]
/** A shot that goes nowhere: a small cough. */
export const FIZZLE: Note[] = [hiss(600, 0.07, 0.01, 0.12, { q: 1.5, glideTo: 300 })]
/** A wall gives: a sigh of sand and a soft bump. */
export const GAVE: Note[] = [hiss(2400, 0.1, 0.03, 0.4, { q: 0.7, glideTo: 1500 }), tone(92, 0.12, 0.006, 0.16, { glideTo: 60 })]
/** Giving up: a long step down. */
export const SIGH: Note[] = [tone(392, 0.08, 0.03, 0.3, { glideTo: 262 })]
/** The party sets off: three quick steps up. */
export const MARCH: Note[] = [tone(294, 0.09, 0.004, 0.08, { wave: 'triangle' }), tone(370, 0.09, 0.004, 0.08, { wave: 'triangle', delay: 0.1 }), tone(440, 0.09, 0.004, 0.12, { wave: 'triangle', delay: 0.2 })]

/** The army loses its way: the leader's three notes, falling apart. */
export const LOST: Note[] = [tone(930, 0.08, 0.005, 0.1, { wave: 'sawtooth', glideTo: 700 }), tone(620, 0.08, 0.005, 0.12, { wave: 'sawtooth', delay: 0.12, glideTo: 440 }), tone(392, 0.08, 0.01, 0.3, { wave: 'sawtooth', delay: 0.26, glideTo: 220 })]

const speakerOf = (kind: InvaderKind): Speaker => (kind === 'ant' ? 'raider' : kind)
/** Who speaks in each first showing of a kind. */
const SHOWN_BY: Record<string, Speaker> = { ant: 'raider', beetle: 'beetle', fly: 'fly', dungBeetle: 'dungBeetle', dungFly: 'dungFly' }
/** What a shot's meeting each material sounds like. */
export const SHOT_HIT: Record<Material, Note[]> = {
  sand: [hiss(3200, 0.1, 0.01, 0.3, { q: 0.8, glideTo: 1400 })],
  mud: [tone(170, 0.14, 0.01, 0.12, { glideTo: 90 }), tone(120, 0.1, 0.02, 0.14, { delay: 0.09, glideTo: 70 })],
  stone: [tone(1568, 0.12, 0.002, 0.5, { wave: 'triangle' }), tone(2349, 0.06, 0.002, 0.35, { wave: 'sine' })],
}
/** A rolling stone, and what stops it. */
export const RUMBLE: Note[] = [tone(70, 0.1, 0.01, 0.1, { wave: 'triangle', glideTo: 58 }), hiss(240, 0.04, 0.01, 0.08, { q: 1.5 })]
export const SCRUNCH: Note[] = [hiss(2600, 0.09, 0.01, 0.34, { q: 0.9, glideTo: 900 })]
export const SCHLUP: Note[] = [tone(150, 0.13, 0.015, 0.16, { glideTo: 60 }), hiss(500, 0.05, 0.01, 0.1, { q: 3 })]
export const CLACK: Note[] = [tone(1900, 0.13, 0.001, 0.05, { wave: 'square' }), tone(980, 0.08, 0.001, 0.07, { wave: 'triangle', delay: 0.02 })]

/** The voice of something the game says happened, or null where it makes no sound. */
export function voiceForGame(event: KingdomEvent): Note[] | null {
  switch (event.type) {
    case 'bell': return BELL
    case 'called': return MARCH
    case 'fired': return event.machine === 'catapult' ? TWANG : POP
    case 'fizzled': return FIZZLE
    case 'shotLanded': return SET_DOWN[event.shot]
    case 'loaded': return PICKED[event.shot]
    case 'turned': return CLICK
    case 'machineSet': case 'machineFell': return KNOCK
    case 'machineBack': return BACK
    // What stopped a shot answers: sand bursts with a whoosh, mud takes it with a glug, a stone rings.
    case 'shotHit': {
      const material = materialOf(event.kind)
      return material ? SHOT_HIT[material] : null
    }
    case 'tried': return event.machine === 'catapult' ? TWANG : POP
    // The queen complains as she is carried to a new room, the workers mutter as they put things back, the party
    // that came for nothing sighs, and a kind shown for the first time speaks up.
    case 'scene':
      if (event.is === 'moves') return SPOKEN.queen
      if (event.is === 'putBack') return SPOKEN.worker
      if (event.is === 'shrug') return SIGH
      if (event.is === 'ending') return ENDING
      if (event.is === 'showing' && event.who && event.who in SHOWN_BY) return SPOKEN[SHOWN_BY[event.who]]
      return null
    case 'judged': return null
  }
}

/** The voice of something a raid says happened, or null where it makes no sound. */
export function voiceForRaid(event: RaidEvent): Note[] | null {
  switch (event.type) {
    // Mud under an invader has two sounds of its own: a sucking pop where a raider ant sticks in it, and a slow creak
    // where it holds a pusher. At any other wall the pusher grunts.
    case 'stuck': return SUCK
    case 'strain': return event.on === MUD ? CREAK : SPOKEN.beetle
    case 'gave': return GAVE
    case 'inside': case 'acted': case 'hit': return SPOKEN[speakerOf(event.kind)]
    case 'widened': return SPOKEN.dungBall
    case 'lost': return LOST
    case 'givesUp': case 'held': case 'leftBall': return SIGH
    // The queen has something to say to a guest who makes itself at home in her room.
    case 'acts': return event.queens ? SPOKEN.queen : null
    // A stone rolls with a low rumble, and what stops it says so: sand scrunches, mud goes schlup, a stone clacks.
    case 'rolled': return RUMBLE
    case 'stopped': return event.by === SAND ? SCRUNCH : event.by === MUD ? SCHLUP : event.by === STONE ? CLACK : KNOCK
    case 'in': case 'home': case 'over': case 'waits': return null
  }
}
