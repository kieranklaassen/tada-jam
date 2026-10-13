import type { Note } from './audio'

// The two building blocks of every sound of the fair, as plain numbers.

export const tone = (frequency: number, peak: number, attack: number, decay: number, glideTo?: number, wave: OscillatorType = 'sine'): Note => ({ kind: 'tone', frequency, peak, attack, decay, glideTo, wave })
export const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, glideTo })
