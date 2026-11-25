import type { Patch, PhraseNote } from '@kieranklaassen/live-mix/render'

// What a piece of music is, as plain data: three stems (the ground, the song and the spark), three sections of eight
// bars, and the order they come in. The player (music.ts) plays it; nothing here knows a browser.

export const STEMS = ['ground', 'song', 'spark'] as const
export type Stem = (typeof STEMS)[number]
export const SECTIONS = ['a', 'b', 'c'] as const
export type Section = (typeof SECTIONS)[number]

/** One instrument of a stem, and what it plays in each section. */
export interface Part {
  patch: Patch
  /** Trim in dB, so the instruments of live-mix stand where they should beside each other. */
  gainDb: number
  notes: Record<Section, PhraseNote[]>
}

export interface Score {
  /** Seconds of one section. */
  sectionSec: number
  /** The order of the sections, and null for a section's length of nothing, so the music breathes before it comes round. */
  form: readonly (Section | null)[]
  stems: Record<Stem, Part[]>
}

/** Seconds a section rings on after its last bar, under the next one. */
export const TAIL_SEC = 2.5
export const RENDER_RATE = 32000

/** `[beat, pitch, beats]`, from the start of its bar. */
export type Beat = readonly [number, number, number]

/** Bars of beats as notes in seconds. A note that starts on the first beat is leaned on a little; no two notes are struck alike. */
export function bars(lines: readonly (readonly Beat[])[], beatsInBar: number, beatSec: number, gain: number, held = 0.92): PhraseNote[] {
  let n = 0
  return lines.flatMap((line, bar) => line.map(([beat, note, beats]) => {
    n += 1
    const lean = beat === 0 ? 1 : 0.86
    const hand = 1 + 0.05 * Math.sin(n * 2.4)
    // A player is never on the grid: up to 8 ms late, and never early.
    const late = 0.004 + 0.004 * Math.sin(n * 1.7)
    return { atSec: (bar * beatsInBar + beat) * beatSec + late, durSec: beats * beatSec * held, note, gain: gain * lean * hand }
  }))
}

/** A small room round an instrument, live-mix's plate. */
export const room = (mix: number, decay: number) => ({ deviceId: 'plate-reverb', params: { mix, decay, damping: 0.45, predelayMs: 12 } })

export const patch = (deviceId: string, preset: string, effects: Patch['effects']): Patch =>
  ({ id: deviceId, name: deviceId, category: 'keys', description: '', instrument: { deviceId, preset }, effects })
