import type { GameEvent } from './events'
import type { GobblerId, LiftWay, WrongWay } from './gobblers'
import type { Kind } from './toys'

// Every voice of the game as plain numbers: pitch, peak, attack and length.
// Nothing here makes a sound; `sound.ts` plays these through Web Audio. The
// test beside this file holds every voice inside the ranges stated below.
// No voice is a verdict: a gulp and a spit are both what a gobbler sounds
// like, and neither is a right or a wrong sound.

export type Part = {
  /** A pitched tone, or a band of noise. */
  kind: 'tone' | 'noise'
  wave?: OscillatorType
  /** Pitch in Hz (the middle of the band for noise), and where it glides to. */
  freq: number
  to?: number
  /** How narrow a band of noise is. */
  q?: number
  /** Loudest point, 0 to 1 before the master gain. */
  peak: number
  /** Seconds to the peak, and seconds from the peak to silence. */
  attack: number
  decay: number
  /** Seconds after the voice starts. */
  delay?: number
}

/** The ranges every part stays inside. */
export const RANGE = { lowHz: 70, highHz: 4200, mostPeak: 0.3, leastAttack: 0.002, longest: 1.7 } as const

/** The notes the tray rings, one for each column from left to right: a scale with no wrong notes in it. */
export const TRAY_NOTES = [523.25, 587.33, 659.25, 783.99, 880] as const

const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value))
/** A pitch kept inside the range: a deep gobbler's lowest notes stop at the floor. */
const inRange = (hz: number) => clamp(hz, RANGE.lowHz, RANGE.highHz)
const ranged = (part: Part): Part => (part.to === undefined ? { ...part, freq: inRange(part.freq) } : { ...part, freq: inRange(part.freq), to: inRange(part.to) })
const tone = (freq: number, peak: number, decay: number, more: Partial<Part> = {}): Part => ranged({ kind: 'tone', wave: 'sine', freq, peak, attack: 0.004, decay, ...more })
const noise = (freq: number, q: number, peak: number, decay: number, more: Partial<Part> = {}): Part => ranged({ kind: 'noise', freq, q, peak, attack: 0.003, decay, ...more })
/** A step of the tray's scale above a note. */
const step = (note: number, steps: number) => note * Math.pow(2, steps / 6)

/** How high each gobbler's own voice is: the little one squeaks, the big one rumbles. */
const VOICE: { readonly [G in GobblerId]: number } = { red: 330, blue: 196, yellow: 440, duck: 294, car: 247, rocket: 392, big: 110, little: 587 }
/** The voice of each kind of toy when a belly is drummed. */
const KIND_WAVE: { readonly [K in Kind]: OscillatorType } = { duck: 'triangle', car: 'square', rocket: 'sine' }

function wrong(way: WrongWay): Part[] {
  switch (way) {
    case 'cannon': return [tone(700, 0.1, 0.32, { to: 1900, wave: 'triangle' }), noise(500, 0.8, 0.26, 0.14, { delay: 0.36 }), tone(150, 0.2, 0.2, { to: 80, delay: 0.36 })]
    case 'slow-slide': return [tone(260, 0.12, 0.5, { to: 180, wave: 'sawtooth', attack: 0.2 }), tone(220, 0.14, 0.5, { to: 110, wave: 'triangle', delay: 1.0, attack: 0.05 })]
    case 'hiccups': return [tone(500, 0.16, 0.08, { to: 800 }), tone(560, 0.18, 0.08, { to: 900, delay: 0.33 }), tone(640, 0.24, 0.12, { to: 1100, delay: 0.66 })]
    case 'head-shake': return [0, 1, 2, 3, 4].map((i) => noise(1200 + (i % 2) * 500, 2.5, 0.12, 0.05, { delay: i * 0.11 })).concat([tone(900, 0.16, 0.16, { to: 400, delay: 0.62 })])
    case 'reverse': return [tone(140, 0.14, 0.3, { to: 230, wave: 'sawtooth', attack: 0.05 }), tone(880, 0.1, 0.1, { wave: 'square', delay: 0.34 }), tone(880, 0.1, 0.1, { wave: 'square', delay: 0.56 })]
    case 'straight-up': return [noise(700, 1, 0.14, 0.36, { to: 2600, attack: 0.3 }), tone(300, 0.22, 0.5, { to: 1500, delay: 0.56, attack: 0.02 })]
    case 'falls-through': return [tone(1300, 0.12, 0.05), tone(1040, 0.12, 0.05, { delay: 0.12 }), tone(780, 0.12, 0.05, { delay: 0.24 }), tone(180, 0.14, 0.4, { to: 240, wave: 'triangle', delay: 0.6, attack: 0.15 })]
    case 'hat': return [tone(200, 0.18, 0.12, { wave: 'triangle' }), tone(320, 0.1, 0.5, { to: 240, wave: 'triangle', delay: 0.2, attack: 0.1 }), noise(1800, 2, 0.14, 0.2, { to: 600, delay: 1.1 })]
  }
}

function lifted(way: LiftWay): Part[] {
  switch (way) {
    case 'kicks-and-squeals': return [0, 1, 2, 3, 4].map((i) => tone(step(660, i * 2), 0.14, 0.1, { delay: i * 0.16, wave: 'triangle' }))
    case 'goes-rigid': return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => noise(2600, 6, 0.1, 0.02, { delay: i * 0.07 }))
    case 'hiccups': return [tone(520, 0.16, 0.07, { to: 860 }), tone(520, 0.16, 0.07, { to: 860, delay: 0.48 }), tone(520, 0.16, 0.07, { to: 860, delay: 0.96 })]
    case 'flaps': return [0, 1, 2, 3].map((i) => noise(500, 1, 0.16, 0.09, { delay: i * 0.17 }))
    case 'wheels-spin': return [tone(180, 0.12, 0.9, { to: 520, wave: 'sawtooth', attack: 0.1 })]
    case 'stretches-tall': return [tone(300, 0.14, 0.8, { to: 900, attack: 0.1 })]
    case 'thuds-back': return [tone(130, 0.16, 0.7, { to: 90, wave: 'triangle', attack: 0.3 })]
    case 'spins': return [tone(900, 0.1, 0.9, { to: 1500, wave: 'triangle', attack: 0.05 }), noise(3000, 3, 0.06, 0.9, { attack: 0.05 })]
  }
}

/** The voice for something that happened. */
export function voiceOf(event: GameEvent): Part[] {
  switch (event.type) {
    // --- The claw ---
    case 'chirp': {
      // The motor setting off: higher the further it has to go.
      const far = clamp(event.distance / 24, 0, 1)
      return [tone(300 + 380 * far, 0.07, 0.09, { to: 420 + 520 * far, wave: 'square' }), noise(2600, 1.2, 0.1, 0.035)]
    }
    case 'jaws': return [noise(3400, 6, 0.13, 0.018), tone(880, 0.05, 0.03, { to: 620, wave: 'square', attack: 0.002 })]
    case 'tick': return [tone(1500, 0.022, 0.022, { to: 1100, wave: 'square', attack: 0.002 })]
    case 'clack': return [noise(1800, 2, 0.2, 0.05), tone(220, 0.16, 0.08, { to: 140, wave: 'triangle' })]
    case 'bite': return [noise(2400, 3, 0.16, 0.03), noise(2000, 3, 0.12, 0.03, { delay: 0.07 })]
    case 'ratchet': {
      // Quicker and higher as the hoist climbs, a third lower under a load.
      const base = event.heavy > 1 ? 392 : 523.25
      return [tone(base * (1 + 0.9 * clamp(event.progress, 0, 1)), 0.1, 0.05, { wave: 'triangle', attack: 0.002 })]
    }
    case 'let-go': return [noise(900, 1.5, 0.1, 0.07, { to: 2400 })]
    // --- Toys on the tray ---
    case 'pop': {
      // A toy coming off its studs: lower for a big one, and a step higher for each toy it stood on.
      const up = 1 + 0.19 * clamp(event.level, 0, 2)
      return [tone((event.heavy > 1 ? 300 : 440) * up, 0.24, 0.11, { to: (event.heavy > 1 ? 720 : 1040) * up })]
    }
    case 'settle': return [noise(1500, 4, 0.07, 0.03, { delay: 0.12 }), noise(1250, 4, 0.055, 0.03, { delay: 0.21 })]
    case 'bonk': {
      const note = TRAY_NOTES[clamp(event.column, 0, TRAY_NOTES.length - 1)]
      return [tone(note, 0.24, 0.42, { wave: 'triangle' }), tone(note * 2, 0.07, 0.2)]
    }
    case 'click': {
      // Plastic onto studs: brighter higher up a stack, deeper for a big toy.
      const high = step(1 + 0.25 * clamp(event.level, 0, 2), clamp(event.note, 0, 4))
      return [noise((event.heavy > 1 ? 1300 : 2100) * high, 4, 0.22, 0.035), tone((event.heavy > 1 ? 150 : 250) * high, event.heavy > 1 ? 0.24 : 0.16, event.heavy > 1 ? 0.16 : 0.09, { to: (event.heavy > 1 ? 100 : 170) * high, wave: 'triangle' })]
    }
    case 'boing': return [tone(180, 0.2, 0.28, { to: 520, attack: 0.01 })]
    case 'teeter': return [tone(240, 0.12, 0.12, { to: 300, wave: 'triangle' }), tone(300, 0.12, 0.12, { to: 240, wave: 'triangle', delay: 0.14 })]
    case 'knock': return [0, 1, 2, 3].map((i) => noise(1700 - i * 200, 5, 0.14 - i * 0.02, 0.025, { delay: i * 0.045 }))
    case 'domino': return [noise(1400 + 260 * clamp(event.nth, 0, 4), 4, 0.2, 0.04, { delay: 0.1 * clamp(event.nth, 0, 4) })]
    // A stick along a fence: quicker and higher the faster the claw is going.
    case 'rattle': { const fast = clamp(event.speed / 40, 0, 1); return [0, 1, 2, 3, 4, 5].map((i) => noise(2200 + 1400 * fast, 8, 0.1, 0.018, { delay: i * (0.05 - 0.025 * fast) })) }
    // --- A gobbler and a toy ---
    case 'catch': return [noise(event.heavy > 1 ? 500 : 800, 1.5, 0.16, 0.06), tone(event.heavy > 1 ? 160 : 230, 0.12, 0.08)]
    case 'chomp': return [noise(event.heavy > 1 ? 700 : 1000, 2, 0.2, 0.05), tone(VOICE[event.who] * 0.75, 0.14, 0.07, { to: VOICE[event.who] * 0.5, wave: 'triangle' })]
    case 'gulp': return [tone(VOICE[event.who] * (event.heavy > 1 ? 1.2 : 1.6), 0.24, event.heavy > 1 ? 0.3 : 0.2, { to: VOICE[event.who] * 0.6, attack: 0.02 })]
    case 'plink': return [tone(step(1046.5, clamp(event.nth, 0, 6)), 0.12, 0.14)]
    case 'hmm': return [tone(VOICE[event.who], 0.14, 0.34, { to: VOICE[event.who] * 1.25, wave: 'triangle', attack: 0.06, delay: 0.16 })]
    case 'wrong': return wrong(event.way)
    // --- A gobbler and the claw ---
    case 'groan': return [tone(90, 0.16, 0.7, { to: 130, wave: 'sawtooth', attack: 0.15 })]
    case 'lifted': return lifted(event.way).map((part) => ({ ...part, delay: (part.delay ?? 0) + 0.3 }))
    case 'thud': return [tone(clamp(VOICE[event.who] * 0.4, 70, 200), 0.26, 0.2, { to: 70, wave: 'triangle' }), noise(300, 1, 0.16, 0.08)]
    case 'squeak': return [tone(VOICE[event.who] * 3, 0.12, 0.09, { to: VOICE[event.who] * 4 })]
    case 'snap': return [noise(3000, 5, 0.2, 0.02), noise(2600, 5, 0.14, 0.02, { delay: 0.06 })]
    case 'gargle': return [0, 1, 2, 3, 4, 5].map((i) => tone(VOICE[event.who] * (1 + i * 0.12), 0.1, 0.07, { wave: 'sawtooth', delay: i * 0.09 }))
    // --- The ledge ---
    case 'cork': return [tone(300, 0.2, 0.06, { to: 900, delay: 0.38 })]
    case 'clank': return [tone(620, 0.2, 0.3, { wave: 'square' }), tone(930, 0.1, 0.4), noise(2000, 2, 0.14, 0.04)]
    case 'slap': return [noise(1100, 1.2, 0.22, 0.04)]
    case 'whistle': return [tone(1800, 0.1, 0.5, { to: 600, delay: 0.1, attack: 0.03 })]
    case 'grunt': return [tone(120, 0.2, 0.2, { to: 95, wave: 'sawtooth' })]
    case 'huff': return [noise(600, 0.8, 0.16, 0.3, { delay: 0.75, attack: 0.08 })]
    case 'creak': return [tone(step(400, clamp(event.nth, 0, 4)), 0.08, 0.18, { wave: 'sawtooth', delay: 0.12 * clamp(event.nth, 0, 4), attack: 0.03 })]
    case 'stare': return [tone(440, 0.07, 0.7, { to: 494, attack: 0.2 }), tone(554, 0.05, 0.7, { to: 494, attack: 0.2 })]
    case 'gate-rattle': return [0, 1, 2, 3, 4].map((i) => tone(i % 2 ? 700 : 520, 0.1, 0.04, { wave: 'square', delay: i * 0.05 }))
    case 'ping': return [tone(step(1568, 2 - clamp(event.nth, 0, 2)), 0.14, 0.12)]
    case 'scrape': return [noise(400, 1.2, 0.2, 0.34, { to: 250, attack: 0.03 })]
    case 'comb': return [0, 1, 2, 3, 4, 5, 6].map((i) => tone(step(784, i), 0.08, 0.05, { wave: 'triangle', delay: i * 0.04 }))
    case 'gate-creak': return [tone(210, 0.1, 0.3, { to: 330, wave: 'sawtooth', attack: 0.1 }), tone(330, 0.08, 0.25, { to: 210, wave: 'sawtooth', delay: 0.45, attack: 0.05 })]
    // --- The end of the rail ---
    case 'giggle': return [0, 1, 2, 3].map((i) => tone(1500 - i * 110, 0.06, 0.05, { to: 1750 - i * 110, delay: i * 0.085 }))
    // A lamp: a glass ting, the bulbs along the string climbing a scale with no wrong notes in it.
    case 'ting': { const note = step(1047, [0, 1, 2, 3.5, 4.5][event.nth % 5] + 6 * (Math.floor(event.nth / 5) % 2)); return [tone(note, 0.12, 0.3, { attack: 0.002, wave: 'triangle' }), tone(note * 2, 0.04, 0.14, { attack: 0.002 })] }
    case 'peep': return [tone(1900, 0.11, 0.07, { to: 2700 }), tone(2500, 0.08, 0.06, { to: 3300, delay: 0.09 })]
    case 'bell': return [tone(1568, 0.2, 0.55, { attack: 0.002 }), tone(3136, 0.05, 0.25, { attack: 0.002 })]
    case 'double-ding': return [tone(1568, 0.18, 0.3, { attack: 0.002 }), tone(2093, 0.18, 0.5, { delay: 0.11, attack: 0.002 })]
    case 'zip': return [noise(1500, 6, 0.14, 0.2, { to: 3600 })]
    case 'rim-thud': return [tone(110, 0.26, 0.22, { to: 75, wave: 'triangle' }), noise(350, 1, 0.14, 0.1)]
    case 'bell-hum': return [tone(1568, 0.06, 0.9, { attack: 0.3 }), tone(1574, 0.06, 0.9, { attack: 0.3 })]
    // --- The claw waiting ---
    case 'jaw-hum': return [tone(160, 0.1, 0.5, { to: 320, wave: 'sawtooth', attack: 0.1 })]
    case 'jaw-click': return [noise(3200, 6, 0.08, 0.015), noise(3200, 6, 0.08, 0.015, { delay: 0.3 })]
    case 'wind': return [0, 1, 2, 3].map((i) => tone(step(180, i), 0.1, 0.06, { wave: 'sawtooth', delay: i * 0.13 }))
    // --- The scenes ---
    case 'show': return [tone(VOICE[event.who] * 1.5, 0.12, 0.16, { to: VOICE[event.who] * 2, wave: 'triangle' }), tone(VOICE[event.who] * 2, 0.12, 0.2, { to: VOICE[event.who] * 1.5, wave: 'triangle', delay: 0.3 })]
    case 'tip': return [noise(1200, 2, 0.14, 0.05), tone(step(523.25, clamp(event.nth, 0, 8) % 6), 0.12, 0.12, { wave: 'triangle' })]
    case 'waddle': return [0, 1, 2, 3, 4, 5].map((i) => tone(i % 2 ? 150 : 120, 0.1, 0.06, { wave: 'triangle', delay: i * 0.2 }))
    case 'hop-in': return [tone(step(262, clamp(event.nth, 0, 4) * 2), 0.14, 0.16, { to: step(523, clamp(event.nth, 0, 4) * 2), attack: 0.01 })]
    case 'grow': return [tone(400, 0.1, 0.3, { to: 1200, wave: 'triangle', delay: 0.2, attack: 0.02 })]
    case 'ring': {
      // A belly drummed: low for a big toy and high for a small one, with a voice for each kind.
      const note = step(event.size === 'big' ? 261.63 : 523.25, clamp(event.nth, 0, 5))
      return [tone(note, 0.2, 0.3, { wave: KIND_WAVE[event.kind], attack: 0.003 }), noise(event.size === 'big' ? 240 : 500, 1.5, 0.12, 0.05)]
    }
    case 'burp': return [tone(step(130, clamp(event.nth, 0, 2) * 2), 0.2, 0.34, { to: 80, wave: 'sawtooth', attack: 0.03, delay: 0.03 * clamp(event.nth, 0, 2) })]
    case 'slide-in': return [noise(260, 0.8, 0.14, 0.9, { to: 420, attack: 0.2 }), tone(196, 0.1, 0.3, { delay: 0.95, wave: 'triangle' })]
    case 'pour': return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => noise(1500 + ((i * 370) % 900), 4, 0.12, 0.03, { delay: 0.1 + i * 0.07 }))
  }
}
