import type { Note } from './audio'
import type { PartyEvent } from './party'
import { COATS, EFFECTS, outcomeOf, type Act, type Antic, type Guest, type Mood, type Thing } from './rules'

// Every sound as numbers. A thing is an instrument and an act is how it is
// played; a coat is a material and an effect is what strikes it; a guest has
// a voice and a mood is its tune. Nothing here is praise: each sound is the
// thing itself.

const t = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const n = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, peak, attack, decay, ...more })
const run = (count: number, gap: number, make: (i: number) => Note): Note[] => Array.from({ length: count }, (_, i) => ({ ...make(i), delay: (make(i).delay ?? 0) + i * gap }))

export const ACT_SOUNDS: Record<Thing, Record<Act, Note[]>> = {
  teapot: {
    tip: run(6, 0.1, (i) => t(260 + i * 46, 0.13, 0.02, 0.1, { glideTo: 360 + i * 46 })),
    dab: [n(900, 0.16, 0.05, 0.3, { q: 3, glideTo: 2600 }), t(300, 0.08, 0.02, 0.2, { glideTo: 620 })],
    wave: run(5, 0.06, (i) => n(2400 + i * 300, 0.13, 0.004, 0.06, { q: 4 })),
    show: [t(1250, 0.07, 0.3, 0.7, { glideTo: 1900 }), n(4200, 0.05, 0.2, 0.8, { q: 2 }), ...run(6, 0.09, () => t(2100, 0.04, 0.002, 0.04, { wave: 'square' }))],
    self: run(4, 0.22, (i) => t(170 - i * 8, 0.18, 0.03, 0.12, { glideTo: 110 })),
  },
  glue: {
    tip: [t(150, 0.2, 0.05, 0.5, { glideTo: 60 }), n(420, 0.16, 0.06, 0.4, { q: 2, glideTo: 160, delay: 0.16 })],
    dab: [n(700, 0.16, 0.01, 0.14, { q: 5 }), t(200, 0.14, 0.02, 0.3, { glideTo: 520, delay: 0.14 }), n(1500, 0.2, 0.002, 0.05, { delay: 0.46 })],
    wave: run(4, 0.13, (i) => t(140 + i * 52, 0.15, 0.01, 0.26, { wave: 'triangle', glideTo: 330 + i * 60 })),
    show: [t(420, 0.13, 0.02, 0.4, { glideTo: 120 }), n(300, 0.22, 0.004, 0.16, { delay: 0.42 })],
    self: run(3, 0.24, (i) => t(128 + (i % 2) * 22, 0.18, 0.06, 0.2, { wave: 'sawtooth' })),
  },
  fan: {
    tip: [n(600, 0.2, 0.2, 0.6, { q: 0.8, glideTo: 220 })],
    dab: [t(920, 0.18, 0.002, 0.08, { wave: 'triangle' }), n(1800, 0.12, 0.002, 0.04)],
    wave: run(5, 0.1, (i) => n(900 - (i % 2) * 320, 0.19, 0.03, 0.09, { q: 1.2 })),
    show: run(9, 0.04, (i) => n(1200 + i * 320, 0.09, 0.003, 0.04, { q: 6 })),
    self: run(7, 0.07, (i) => n(1500 + (i % 2) * 500, 0.08, 0.01, 0.05, { q: 2 })),
  },
  fish: {
    tip: [n(1600, 0.17, 0.02, 0.4, { q: 6, glideTo: 3200 }), t(700, 0.06, 0.02, 0.3, { glideTo: 1200 })],
    dab: [t(330, 0.2, 0.01, 0.08, { glideTo: 780 }), n(2200, 0.1, 0.002, 0.05, { delay: 0.08 })],
    wave: [...run(3, 0.15, (i) => n(1100 + i * 130, 0.28, 0.002, 0.1, { q: 0.8 })), ...run(3, 0.15, () => t(180, 0.16, 0.002, 0.1, { glideTo: 90 }))],
    show: run(8, 0.07, (i) => t(110 + (i % 3) * 22, 0.17, 0.003, 0.06, { glideTo: 70 })),
    self: run(4, 0.17, (i) => t(420 + i * 40, 0.16, 0.006, 0.07, { glideTo: 880 })),
  },
  duster: {
    tip: run(8, 0.06, (i) => n(5200 - i * 260, 0.06, 0.02, 0.09, { q: 1.5 })),
    dab: run(7, 0.055, (i) => t(1100 + (i % 2) * 190, 0.07, 0.004, 0.05, { wave: 'triangle' })),
    wave: [...run(3, 0.12, () => n(700, 0.15, 0.02, 0.1, { q: 0.7 })), n(3000, 0.05, 0.1, 0.4)],
    show: run(5, 0.15, (i) => t(2300 + (i % 2) * 260, 0.09, 0.006, 0.06, { glideTo: 2900 })),
    self: [n(900, 0.07, 0.6, 0.1, { glideTo: 2600 }), n(1400, 0.34, 0.004, 0.3, { q: 0.6, delay: 0.72, glideTo: 400 }), t(520, 0.16, 0.004, 0.24, { glideTo: 160, delay: 0.72 })],
  },
  horn: {
    tip: [t(1500, 0.12, 0.02, 0.7, { glideTo: 300 }), ...run(4, 0.09, () => t(2600, 0.05, 0.003, 0.04, { delay: 0.75 }))],
    dab: [t(185, 0.26, 0.01, 0.34, { wave: 'sawtooth', glideTo: 170 }), t(370, 0.12, 0.01, 0.3, { wave: 'square', glideTo: 345 })],
    wave: [t(220, 0.2, 0.02, 0.2, { wave: 'sawtooth' }), t(330, 0.2, 0.02, 0.26, { wave: 'sawtooth', delay: 0.26 })],
    show: [t(196, 0.18, 0.06, 0.4, { wave: 'sawtooth' }), t(294, 0.18, 0.06, 0.5, { wave: 'sawtooth', delay: 0.42 }), t(392, 0.14, 0.08, 0.7, { wave: 'sawtooth', delay: 0.86, glideTo: 380 })],
    self: run(4, 0.2, (i) => t(660 - i * 70, 0.1 - i * 0.02, 0.01, 0.16)),
  },
}

/** How each guest sounds: the pitch of the voice, its wave, and how long it holds a note. */
const THROAT: Record<Guest, { pitch: number; wave: OscillatorType; hold: number }> = {
  walrus: { pitch: 105, wave: 'sawtooth', hold: 0.3 },
  dog: { pitch: 420, wave: 'triangle', hold: 0.13 },
  goose: { pitch: 290, wave: 'square', hold: 0.18 },
  pig: { pitch: 240, wave: 'sawtooth', hold: 0.15 },
}

/** Each mood's tune, as steps of pitch: where a note starts and where it goes. */
const TUNE: Record<Mood, readonly (readonly [number, number])[]> = {
  delight: [[1, 1.35], [1.25, 1.7]],
  outrage: [[1.7, 1.2], [1.8, 1.1], [1.6, 0.9]],
  puzzled: [[1, 0.94], [1.05, 1.5]],
  giggle: [[1.5, 1.65], [1.6, 1.75], [1.5, 1.65], [1.7, 1.9]],
  sneeze: [[1, 1.8], [2.2, 0.7]],
  sing: [[1, 1.02], [1.5, 1.52], [2, 1.9]],
  salute: [[1.2, 1.2], [1.2, 1.2], [1.6, 1.6]],
  chase: [[1.4, 1.1], [1.4, 1.1], [1.4, 1.1], [1.7, 1.2]],
  faint: [[2, 0.6]],
}

export function guestSound(guest: Guest, mood: Mood): Note[] {
  const { pitch, wave, hold } = THROAT[guest]
  return TUNE[mood].map(([from, to], i) => t(pitch * from, wave === 'triangle' ? 0.14 : 0.075, 0.02, hold * (mood === 'faint' ? 4 : mood === 'sing' ? 1.8 : 1), { wave, glideTo: pitch * to, delay: 0.16 + i * hold * 1.25 }))
}

const MATERIAL: readonly { base: number; tone: boolean; wave: OscillatorType; decay: number }[] = [
  { base: 300, tone: true, wave: 'sine', decay: 0.16 }, { base: 900, tone: false, wave: 'sine', decay: 0.2 }, { base: 170, tone: true, wave: 'triangle', decay: 0.34 }, { base: 3400, tone: false, wave: 'sine', decay: 0.24 },
  { base: 480, tone: true, wave: 'sine', decay: 0.4 }, { base: 1250, tone: true, wave: 'triangle', decay: 0.22 }, { base: 760, tone: true, wave: 'sine', decay: 0.12 },
]
const STRIKE: readonly { to: number; count: number; gap: number }[] = [
  { to: 0.6, count: 2, gap: 0.07 }, { to: 0.45, count: 1, gap: 0 }, { to: 1.25, count: 3, gap: 0.05 }, { to: 1.6, count: 1, gap: 0 }, { to: 0.8, count: 2, gap: 0.12 }, { to: 2, count: 4, gap: 0.045 },
]

/** What a guest's body sounds like as it answers: one sound for each coat by effect. */
export const ANTIC_SOUNDS: Record<Antic, Note[]> = Object.fromEntries(COATS.flatMap((coat, c) => EFFECTS.map((effect, e) => {
  const m = MATERIAL[c], s = STRIKE[e]
  const base = m.base * (1 + e * 0.11)
  return [outcomeOf(coat, effect).antic, run(s.count, s.gap, (i) => m.tone
    ? t(base * (1 + i * 0.12), 0.13, 0.006, m.decay, { wave: m.wave, glideTo: base * s.to * (1 + i * 0.12), delay: 0.06 })
    : n(base * (1 + i * 0.12), 0.15, 0.006, m.decay, { q: 1.6, glideTo: base * s.to * (1 + i * 0.12), delay: 0.06 }))]
}))) as Record<Antic, Note[]>

const SQUEAK: Record<Thing, Note[]> = {
  teapot: [t(1500, 0.08, 0.003, 0.09)],
  glue: [t(240, 0.12, 0.006, 0.12, { glideTo: 320 })],
  fan: [n(2600, 0.1, 0.003, 0.06, { q: 3 })],
  fish: [t(520, 0.1, 0.004, 0.08, { glideTo: 760 })],
  duster: [n(4800, 0.07, 0.01, 0.08)],
  horn: [t(300, 0.1, 0.006, 0.1, { wave: 'triangle' })],
}

export function soundOf(event: PartyEvent): Note[] {
  switch (event.type) {
    case 'press':
      return SQUEAK[event.thing]
    case 'extra':
      return [t(880, 0.05, 0.004, 0.07)]
    case 'act':
      return ACT_SOUNDS[event.thing][event.act]
    case 'answer':
      return [...ANTIC_SOUNDS[event.antic], ...guestSound(event.guest, event.mood)]
    case 'pick':
      return [...SQUEAK[event.thing], t(660, 0.06, 0.004, 0.06)]
    case 'take':
      return [...SQUEAK[event.thing], t(390, 0.1, 0.006, 0.1, { glideTo: 590 }), n(1600, 0.08, 0.004, 0.06, { delay: 0.08 })]
    case 'back':
      return [t(590, 0.09, 0.006, 0.14, { glideTo: 330 }), n(700, 0.12, 0.003, 0.07, { delay: 0.2 })]
    case 'pane':
      return [n(2100, 0.1, 0.002, 0.04), n(2100, 0.1, 0.002, 0.04, { delay: 0.1 })]
    case 'arrive':
      return [n(500, 0.14, 0.004, 0.14, { delay: 0.42 }), ...guestSound(event.guest, 'puzzled')]
    case 'pendulum':
      return event.tapped ? [t(740, 0.1, 0.003, 0.08), t(1110, 0.1, 0.003, 0.1, { delay: 0.1 })] : [t(740, 0.1, 0.003, 0.08)]
    case 'bell':
      return event.rung ? run(3, 0.16, () => t(1760, 0.12, 0.003, 0.5)) : [t(1760, 0.09, 0.003, 0.35)]
    case 'miss':
      return [n(1000, 0.18, 0.002, 0.06, { q: 0.7 })]
    case 'cat':
      return [...run(4, 0.07, () => n(160, 0.2, 0.02, 0.05, { q: 3 })), t(520, 0.06, 0.04, 0.2, { glideTo: 690 })]
    case 'notice':
      return [t(330, 0.07, 0.04, 0.16, { wave: 'triangle', glideTo: 440 })]
    case 'scene':
      return []
    case 'cue':
      return cueSound(event)
  }
}

function cueSound(event: Extract<PartyEvent, { type: 'cue' }>): Note[] {
  switch (event.kind) {
    case 'trade':
      return event.cue === 0 ? [t(1900, 0.1, 0.002, 0.3), n(3000, 0.08, 0.002, 0.06)] : [t(330, 0.09, 0.04, 0.3, { glideTo: 470, wave: 'triangle' }), t(220, 0.09, 0.04, 0.3, { glideTo: 310, wave: 'triangle', delay: 0.2 })]
    case 'birds':
      return run(3, 0.1, (i) => t([620, 780, 930, 780, 620, 500][event.cue] * (1 + i * 0.08), 0.1, 0.008, 0.08, { wave: 'triangle', glideTo: [760, 900, 1080, 900, 760, 420][event.cue] }))
    case 'statues':
      return event.cue === 0 || event.cue === 2 ? run(2, 0.16, () => t(430, 0.1, 0.05, 0.14, { glideTo: 340 })) : run(6, 0.06, () => n(1500, 0.06, 0.01, 0.04, { q: 1.5 }))
    case 'bubbles':
      return event.cue === 1 ? [t(240, 0.16, 0.004, 0.3, { glideTo: 480 })] : [t(360, 0.1, 0.1, 0.5, { glideTo: 620 })]
    case 'tidy':
      return event.cue < 4 ? run(3, 0.08, (i) => n(1800 + i * 500 + event.cue * 120, 0.1, 0.02, 0.07, { q: 3 })) : [t(294, 0.09, 0.05, 0.3, { wave: 'triangle', glideTo: 262 }), n(800, 0.08, 0.05, 0.3)]
  }
}
