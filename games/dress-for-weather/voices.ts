import type { Note } from './audio'
import type { Figure, Garment, Wearer } from './kinds'

// Every sound of the toy as plain numbers. Nobody on the machine that wrote
// them could hear them, so voices.test.ts holds each pitch, peak and length
// inside a stated range.
//
// A sound here is one instant: it has no delay of its own. Whatever happens
// later (the second swish, the next tab) is a later beat of an answer
// (answers.ts), which sets the pose and the notes together on the game's
// clock. So nothing is heard at a moment at which nothing is seen.

/** One part of a sound: a `Note` of audio.ts that starts when it is played. */
export type Sound = Omit<Note, 'delay'>

/** What every sound is held to. */
export const LIMITS = { minFrequency: 60, maxFrequency: 5000, maxPeak: 0.2, minAttack: 0.002, maxSeconds: 0.6 } as const

export const tone = (frequency: number, peak: number, attack: number, decay: number, wave: OscillatorType = 'sine', glideTo?: number): Sound => ({ kind: 'tone', frequency, peak, attack, decay, wave, ...(glideTo ? { glideTo } : {}) })
export const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, glideTo?: number): Sound => ({ kind: 'noise', frequency, q, peak, attack, decay, ...(glideTo ? { glideTo } : {}) })

/** Semitones above a base pitch. */
export const up = (base: number, semitones: number): number => base * 2 ** (semitones / 12)

/** A bigger piece of paper sounds lower when it moves. */
const SIZE: Record<Garment, number> = { raincoat: 300, duffel: 240, boots: 210, hat: 420, scarf: 380, mittens: 520, umbrella: 340 }

/** Touch-down on a garment: it flicks off its peg or lifts under the finger. */
export function flick(garment: Garment): Sound[] {
  return [hiss(3000, 1.5, 0.08, 0.003, 0.05, 4200), tone(SIZE[garment], 0.07, 0.004, 0.06, 'triangle', SIZE[garment] * 1.3)]
}

/** The steps the tabs climb: one for each tab that folds, whatever the garment. */
const TAB_STEPS = [0, 2, 4, 7, 9] as const

/** A tab folds over: a paper snap, a step higher for each tab of the garment. */
export function snap(index: number): Sound[] {
  const step = TAB_STEPS[Math.max(0, Math.min(TAB_STEPS.length - 1, index))]
  return [tone(up(587, step), 0.12, 0.002, 0.06, 'triangle'), hiss(4200, 4, 0.05, 0.002, 0.02)]
}

/** The tabs spring open as a garment is lifted off a wearer. */
export const riffle: Sound[] = [hiss(2400, 1, 0.09, 0.004, 0.12, 1200)]

/** A garment sails back to the rack. */
export const sail: Sound[] = [hiss(1800, 0.8, 0.05, 0.02, 0.2, 2600)]

/** Back on its peg: it knocks against the rail. */
export function peg(garment: Garment): Sound[] {
  return [tone(SIZE[garment] * 0.9, 0.1, 0.003, 0.08, 'sine', SIZE[garment] * 0.65), hiss(900, 2, 0.05, 0.002, 0.03)]
}

/** A garment landing where it belongs: the first sound, as it touches. */
export const LANDS: Record<Garment, Sound[]> = {
  raincoat: [hiss(3600, 3, 0.11, 0.002, 0.04)],
  duffel: [tone(120, 0.16, 0.006, 0.16, 'sine', 80), hiss(400, 0.7, 0.1, 0.006, 0.14)],
  boots: [tone(170, 0.13, 0.004, 0.1, 'sine', 110), hiss(700, 1.5, 0.07, 0.003, 0.06)],
  hat: [hiss(500, 0.8, 0.12, 0.008, 0.14), tone(260, 0.08, 0.006, 0.1, 'sine', 200)],
  scarf: [hiss(1500, 1.2, 0.09, 0.02, 0.12, 2600)],
  mittens: [tone(210, 0.1, 0.003, 0.05, 'sine', 170), hiss(600, 1, 0.08, 0.003, 0.04)],
  umbrella: [tone(1400, 0.05, 0.002, 0.03, 'square'), tone(700, 0.08, 0.002, 0.04, 'triangle')],
}

/** What the same garment does once its tabs are folded. */
export const SETTLES: Record<Garment, Sound[]> = {
  raincoat: [hiss(2900, 3, 0.09, 0.002, 0.05), hiss(4100, 4, 0.06, 0.002, 0.03)],
  duffel: [tone(96, 0.1, 0.01, 0.12, 'sine', 76)],
  boots: [tone(150, 0.11, 0.004, 0.09, 'sine', 100), hiss(600, 1.5, 0.06, 0.003, 0.05)],
  hat: [tone(320, 0.1, 0.005, 0.16, 'triangle', 640)],
  scarf: [hiss(1700, 1.2, 0.08, 0.02, 0.1, 2900), hiss(1100, 1, 0.06, 0.004, 0.06)],
  mittens: [tone(190, 0.1, 0.003, 0.05, 'sine', 150), hiss(560, 1, 0.08, 0.003, 0.04)],
  umbrella: [tone(520, 0.06, 0.003, 0.05, 'triangle', 460)],
}

/** A garment tabbed on where it does not belong: up to three sounds, one for each beat of what it does there. */
export const WRONGS: Record<Garment, readonly Sound[][]> = {
  // A long crinkle, in three crackles.
  raincoat: [[hiss(3200, 3, 0.11, 0.002, 0.05)], [hiss(3900, 3, 0.09, 0.002, 0.05)], [hiss(2700, 2.5, 0.09, 0.002, 0.07)]],
  // A low groan of cloth, then the buttons clack twice.
  duffel: [[tone(110, 0.08, 0.03, 0.3, 'sawtooth', 70)], [tone(900, 0.05, 0.002, 0.03, 'square')], [tone(840, 0.05, 0.002, 0.03, 'square')]],
  // A hollow bonk and two rubbery boings.
  boots: [[tone(320, 0.15, 0.003, 0.12, 'sine', 300)], [tone(180, 0.1, 0.01, 0.14, 'triangle', 360)], [tone(200, 0.09, 0.01, 0.14, 'triangle', 400)]],
  // Tick, tock, tick.
  hat: [[tone(880, 0.09, 0.002, 0.05, 'triangle')], [tone(660, 0.09, 0.002, 0.05, 'triangle')], [tone(880, 0.07, 0.002, 0.05, 'triangle')]],
  // A falling whistle as it unrolls.
  scarf: [[tone(900, 0.1, 0.01, 0.36, 'sine', 300)], [hiss(1200, 1, 0.07, 0.004, 0.06)]],
  // Slap, slap.
  mittens: [[hiss(1800, 1, 0.13, 0.002, 0.05), tone(300, 0.07, 0.002, 0.04)], [hiss(1600, 1, 0.12, 0.002, 0.05), tone(270, 0.07, 0.002, 0.04)]],
  // A rising whirr.
  umbrella: [[tone(200, 0.06, 0.02, 0.4, 'sawtooth', 700), hiss(800, 2, 0.06, 0.02, 0.36, 2400)]],
}

/** One tooth of the zip closing or opening: a tick a semitone higher for each tooth that is closed. */
export function zipTick(teeth: number): Sound[] {
  return [tone(up(620, teeth), 0.09, 0.002, 0.03, 'triangle'), hiss(4400, 5, 0.04, 0.002, 0.015)]
}

/** The finger lands on the slider. */
export const sliderPress: Sound[] = [tone(1200, 0.05, 0.002, 0.02, 'square'), hiss(3000, 3, 0.04, 0.002, 0.02)]
/** The last tooth: the collar snaps shut under the chin. */
export const collarSnap: Sound[] = [tone(1240, 0.12, 0.002, 0.07, 'triangle', 1320), hiss(3000, 2, 0.1, 0.002, 0.04)]
/** The zip is all the way down: the front falls open. */
export const frontOpens: Sound[] = [hiss(2000, 1, 0.1, 0.004, 0.14, 800)]

const BUTTON_PITCH = [520, 440, 370] as const

/** The finger lands on a button: the card of the slit creaks. */
export const buttonCreak: Sound[] = [hiss(900, 6, 0.07, 0.01, 0.06, 1300)]
/** A button goes through its slit with a pop; the three pops step down. */
export function buttonPop(index: number): Sound[] {
  const f = BUTTON_PITCH[Math.max(0, Math.min(2, index))]
  return [tone(f, 0.16, 0.002, 0.09, 'sine', f * 1.6)]
}
/** A button comes back out. */
export function buttonOut(index: number): Sound[] {
  const f = BUTTON_PITCH[Math.max(0, Math.min(2, index))]
  return [tone(f * 0.8, 0.1, 0.003, 0.08, 'sine', f * 0.5)]
}

/** One tug of the boots: a rubber squeak, higher at each tug. */
export function tugSqueak(step: number): Sound[] {
  const f = 380 * (1 + step * 0.25)
  return [tone(f, 0.1, 0.02, 0.12, 'sine', f * 1.5), hiss(2200, 8, 0.04, 0.01, 0.1)]
}
/** The heel goes home and the foot stamps. */
export const stamp: Sound[] = [tone(110, 0.18, 0.003, 0.14, 'sine', 70), hiss(300, 0.8, 0.12, 0.003, 0.08)]

/** The umbrella opens with a whup, and shuts with a clap. */
export const whup: Sound[] = [hiss(600, 0.9, 0.14, 0.004, 0.1, 1800), tone(220, 0.08, 0.004, 0.09, 'triangle', 330)]
export const clap: Sound[] = [hiss(2400, 1.5, 0.12, 0.002, 0.04), tone(500, 0.07, 0.002, 0.05, 'sine', 300)]

/** A tap on a garment that is worn and has no fastening to work: what that garment does. */
export const WORN_TAPS: Record<Garment, readonly Sound[][]> = {
  raincoat: [[hiss(3400, 2.5, 0.09, 0.002, 0.05)], [hiss(2800, 2.5, 0.07, 0.002, 0.05)]],
  duffel: [[hiss(500, 0.8, 0.09, 0.006, 0.1), tone(130, 0.08, 0.006, 0.1, 'sine', 100)]],
  boots: [[tone(140, 0.14, 0.003, 0.1, 'sine', 90), hiss(320, 0.8, 0.09, 0.003, 0.06)], [tone(128, 0.13, 0.003, 0.1, 'sine', 84), hiss(300, 0.8, 0.08, 0.003, 0.06)]],
  hat: [[tone(320, 0.1, 0.005, 0.16, 'triangle', 640)], [tone(280, 0.08, 0.005, 0.14, 'triangle', 520)]],
  scarf: [[hiss(1300, 1, 0.1, 0.004, 0.07)]],
  mittens: [[tone(240, 0.11, 0.003, 0.05, 'sine', 190), hiss(650, 1, 0.09, 0.003, 0.04)], [tone(225, 0.1, 0.003, 0.05, 'sine', 180), hiss(620, 1, 0.08, 0.003, 0.04)]],
  umbrella: [[tone(520, 0.06, 0.003, 0.05, 'triangle', 460)]],
}

/** A poke at a figure or the dog: each has its own voice, in two breaths. */
export const POKES: Record<Wearer, readonly Sound[][]> = {
  // A two-note giggle.
  child: [[tone(660, 0.1, 0.01, 0.09, 'triangle', 880)], [tone(740, 0.1, 0.01, 0.1, 'triangle', 990)]],
  // A harrumph, and a second one lower.
  grandfather: [[tone(130, 0.08, 0.02, 0.18, 'sawtooth', 110), hiss(400, 1, 0.05, 0.02, 0.14)], [tone(116, 0.07, 0.02, 0.2, 'sawtooth', 92)]],
  // A coo that rises and comes back down.
  baby: [[tone(520, 0.1, 0.03, 0.2, 'sine', 700)], [tone(700, 0.09, 0.03, 0.2, 'sine', 560)]],
  // Yip, yip.
  dog: [[tone(700, 0.06, 0.004, 0.07, 'square', 1000)], [tone(800, 0.06, 0.004, 0.07, 'square', 1100)]],
}

/** Each figure's small sound when someone else gets a garment: the watchers answer too. */
export const WATCHES: Record<Figure | 'dog', Sound[]> = {
  child: [tone(880, 0.05, 0.01, 0.06, 'triangle', 990)],
  grandfather: [tone(150, 0.05, 0.02, 0.1, 'sawtooth', 135)],
  baby: [tone(620, 0.06, 0.02, 0.1, 'sine', 760)],
  dog: [hiss(1400, 2, 0.05, 0.004, 0.05)],
}

/** A touch on the printed hall: a fingertip on paper. */
export const paperTap: Sound[] = [hiss(2600, 1.2, 0.06, 0.002, 0.03), tone(480, 0.04, 0.002, 0.03, 'triangle')]

/** Seconds a sound lasts. */
export function secondsOf(sound: readonly Sound[]): number {
  return sound.reduce((end, part) => Math.max(end, part.attack + part.decay), 0)
}
