// The six voices, as plain numbers. Nobody can hear on the machine this was
// written on, so every voice is defined here by pitch, peak, attack and
// length, and voices.test.ts holds each one inside the ranges below. The lead
// and the owner listen: the numbers are a first setting, the ranges and the
// differences between the voices are the design.
//
// Six kinds in three families of two. Two kinds of one family differ in one
// thing only. Two kinds of different families differ in how high and in how
// long at once (ART.md, "The object-by-action grid").

export const KINDS = ['pip', 'tok', 'hoom', 'brrl', 'wheep', 'dooo'] as const
export type Kind = (typeof KINDS)[number]

export const FAMILIES = ['high', 'low', 'glide'] as const
export type Family = (typeof FAMILIES)[number]

export type Voice = {
  family: Family
  /** Hz at which a note starts. */
  pitch: number
  /** Hz at which a note ends: the same as `pitch` for a steady note. */
  glideTo: number
  /** Peak gain of a note in the open, before the master gain. */
  peak: number
  /** Seconds a note takes to reach its peak. */
  attack: number
  /** Seconds one note lasts, its attack included. */
  length: number
  /** How many notes the call has. */
  notes: 1 | 2
  /** Seconds of silence between two notes. */
  gap: number
  /** Warbles a second; 0 for a note that does not warble. */
  warbleRate: number
  /** How far a warble swings either side of the pitch, in semitones. */
  warbleDepth: number
  wave: 'sine' | 'triangle'
}

/** What every voice stays inside. A tablet's speaker carries little under about 200 Hz, and a pure note far over 1500 Hz is shrill. */
export const RANGE = {
  pitch: [200, 1500],
  peak: [0.08, 0.3],
  attack: [0.003, 0.06],
  length: [0.08, 1.2],
  /** The whole call, gaps included. */
  call: [0.08, 1.2],
  warbleRate: [5, 12],
  warbleDepth: [1, 3],
} as const

/** Kinds of different families are at least this far apart in pitch, in semitones. */
export const FAR_SEMITONES = 12
/** ...and one's note is at least this many times as long as the other's. */
export const FAR_LENGTH_RATIO = 2

/** A voice is this much softer inside a hide, at the same pitch and length: half the peak, 6 dB. */
export const INSIDE = 0.5

// The peaks differ by family and not by kind: 0.14 for the high voices, 0.24 for the low ones, 0.18 for the
// gliders. That is meant to make all six about equally loud to the ear, not to make one kind louder: an ear, and a
// tablet's small speaker, give a note near 1200 Hz far more than a note near 220 Hz at the same gain, so the low
// voices are given more and the high ones less. Loudness then says one thing only, inside or out (INSIDE, below
// every kind's own peak by the same half). The numbers were set on a machine with no sound: whether the three
// families are in fact equally loud has to be heard, and REFINEMENT.md asks for that.
export const VOICES: Readonly<Record<Kind, Voice>> = {
  // High and short: one note, or the same note twice.
  pip: { family: 'high', pitch: 1175, glideTo: 1175, peak: 0.14, attack: 0.005, length: 0.12, notes: 1, gap: 0, warbleRate: 0, warbleDepth: 0, wave: 'sine' },
  tok: { family: 'high', pitch: 1175, glideTo: 1175, peak: 0.14, attack: 0.005, length: 0.12, notes: 2, gap: 0.1, warbleRate: 0, warbleDepth: 0, wave: 'sine' },
  // Low and long: steady, or the same note warbling.
  hoom: { family: 'low', pitch: 220, glideTo: 220, peak: 0.24, attack: 0.04, length: 0.9, notes: 1, gap: 0, warbleRate: 0, warbleDepth: 0, wave: 'triangle' },
  brrl: { family: 'low', pitch: 220, glideTo: 220, peak: 0.24, attack: 0.04, length: 0.9, notes: 1, gap: 0, warbleRate: 8, warbleDepth: 1.5, wave: 'triangle' },
  // Through the middle: a glide up, or the same glide down.
  wheep: { family: 'glide', pitch: 330, glideTo: 660, peak: 0.18, attack: 0.02, length: 0.4, notes: 1, gap: 0, warbleRate: 0, warbleDepth: 0, wave: 'sine' },
  dooo: { family: 'glide', pitch: 660, glideTo: 330, peak: 0.18, attack: 0.02, length: 0.4, notes: 1, gap: 0, warbleRate: 0, warbleDepth: 0, wave: 'sine' },
}

export function isKind(value: unknown): value is Kind {
  return typeof value === 'string' && (KINDS as readonly string[]).includes(value)
}

export function familyOf(kind: Kind): Family {
  return VOICES[kind].family
}

/** The other kind of the same family: the one voice that differs from this one in a single thing. */
export function nearOf(kind: Kind): Kind {
  return KINDS.find((other) => other !== kind && familyOf(other) === familyOf(kind))!
}

export function isNear(a: Kind, b: Kind): boolean {
  return a !== b && familyOf(a) === familyOf(b)
}

/** The pitch a call is heard at: the middle of a glide, on the ear's scale. */
export function centre(voice: Voice): number {
  return Math.sqrt(voice.pitch * voice.glideTo)
}

export function semitones(from: number, to: number): number {
  return 12 * Math.log2(to / from)
}

/** Seconds from the start of a call to the end of its last note. */
export function callSeconds(voice: Voice): number {
  return voice.notes * voice.length + (voice.notes - 1) * voice.gap
}

export type Property = 'pitch' | 'length' | 'notes' | 'warble' | 'direction'

/** Whether a note goes up, down or stays. */
export function direction(voice: Voice): -1 | 0 | 1 {
  return voice.glideTo > voice.pitch ? 1 : voice.glideTo < voice.pitch ? -1 : 0
}

/** The things two voices differ in. Pitch counts from one semitone, length from one part in ten. */
export function differsIn(a: Voice, b: Voice): Property[] {
  const out: Property[] = []
  if (Math.abs(semitones(centre(a), centre(b))) >= 1) out.push('pitch')
  if (Math.max(a.length, b.length) / Math.min(a.length, b.length) >= 1.1) out.push('length')
  if (a.notes !== b.notes) out.push('notes')
  if ((a.warbleRate > 0) !== (b.warbleRate > 0)) out.push('warble')
  if (direction(a) !== direction(b)) out.push('direction')
  return out
}

/** One note of a call, ready for an oscillator: every number the sound layer needs and nothing else. */
export type Note = {
  /** Seconds after the call starts. */
  at: number
  pitch: number
  glideTo: number
  peak: number
  attack: number
  /** Seconds from the peak to silence. */
  decay: number
  warbleRate: number
  warbleDepth: number
  wave: 'sine' | 'triangle'
}

/** The notes of a kind's call, in the open or from inside a hide. Inside changes the loudness and nothing else. */
export function callOf(kind: Kind, inside = false): Note[] {
  const voice = VOICES[kind]
  const notes: Note[] = []
  for (let i = 0; i < voice.notes; i++) {
    notes.push({
      at: i * (voice.length + voice.gap),
      pitch: voice.pitch,
      glideTo: voice.glideTo,
      peak: voice.peak * (inside ? INSIDE : 1),
      attack: voice.attack,
      decay: voice.length - voice.attack,
      warbleRate: voice.warbleRate,
      warbleDepth: voice.warbleDepth,
      wave: voice.wave,
    })
  }
  return notes
}

// --- The picture of a call ---------------------------------------------------

/**
 * How a body, or the egg around it, moves while its call sounds: the same
 * properties as the voice, seen at the moment they are heard.
 */
export type Shape = {
  /** How far off the ground, 0 to 1: higher for a higher voice. */
  lift: number
  /** How long the movement lasts: as long as the call. */
  seconds: number
  /** One movement for each note. */
  hops: 1 | 2
  /** A warble shivers. */
  shiver: boolean
  /** A glide tips the body up (1) or down (-1). */
  tip: -1 | 0 | 1
}

export function shapeOf(kind: Kind): Shape {
  const voice = VOICES[kind]
  const [low, high] = RANGE.pitch
  const lift = Math.log2(centre(voice) / low) / Math.log2(high / low)
  return { lift: Math.max(0, Math.min(1, lift)), seconds: callSeconds(voice), hops: voice.notes, shiver: voice.warbleRate > 0, tip: direction(voice) }
}

/**
 * What a leaf pile does whoever calls from it: the same rustle every time, and as long every time, which says
 * nothing about the voice. In the two leaf places a hide is told by ear alone. It is over before the
 * shortest voice has been answered (the call and the breath after it), so it is never still rustling into the next call.
 */
export const RUSTLE: Shape = { lift: 0.15, seconds: 0.36, hops: 1, shiver: true, tip: 0 }
