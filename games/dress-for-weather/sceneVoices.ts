import type { Figure } from './kinds'
import type { Weather } from './save'
import { hiss, tone, up, type Sound } from './voices'

// The sounds of the hall's own things and of its scenes: the door, the vane,
// the weather, the walks, the ending and the two showings. Plain numbers, as
// in voices.ts; the hall plays each at the moment of the beat that shows it.

/** A knuckle on the door. */
export const knock: Sound[] = [tone(180, 0.14, 0.002, 0.08, 'sine', 120), hiss(700, 1.5, 0.07, 0.002, 0.04)]
/** The door swings open. */
export const doorCreak: Sound[] = [tone(210, 0.07, 0.03, 0.3, 'sawtooth', 330), hiss(900, 6, 0.04, 0.03, 0.26, 1300)]
/** The door shuts. */
export const doorShut: Sound[] = [tone(96, 0.17, 0.003, 0.14, 'sine', 70), hiss(420, 1, 0.1, 0.003, 0.06)]
/** The hall sheet turns over, and turns back. */
export const sheetOver: Sound[] = [hiss(700, 0.7, 0.13, 0.03, 0.4, 2600)]
export const sheetBack: Sound[] = [hiss(2400, 0.7, 0.12, 0.03, 0.36, 600)]
/** The vane is pushed round to the next weather. */
export const vaneTurn: Sound[] = [tone(820, 0.08, 0.004, 0.16, 'triangle', 1180), hiss(3000, 5, 0.04, 0.004, 0.1)]
/** A finger rests on the vane. */
export const vaneTouch: Sound[] = [tone(1180, 0.06, 0.003, 0.06, 'triangle')]
/** What each weather sounds like for a moment, as the vane arrives at it or the door opens on it. */
export const WEATHER_VOICE: Record<Weather, Sound[]> = {
  rain: [hiss(3200, 1.2, 0.08, 0.02, 0.4), tone(1400, 0.04, 0.003, 0.07, 'sine', 1900)],
  snow: [hiss(700, 0.5, 0.06, 0.12, 0.45, 400), tone(1568, 0.04, 0.01, 0.4, 'sine')],
  wind: [hiss(500, 2.5, 0.11, 0.1, 0.45, 1500)],
  sun: [tone(523, 0.06, 0.03, 0.4, 'sine'), tone(659, 0.05, 0.05, 0.4, 'sine'), tone(784, 0.04, 0.07, 0.4, 'sine')],
}
/** One step of each figure as it changes places, `i` steps in: a skip, a shuffle, a rock. */
export function footstep(who: Figure, i: number): Sound[] {
  switch (who) {
    case 'child':
      return [tone(up(330, (i % 3) * 2), 0.07, 0.003, 0.05, 'triangle'), hiss(1600, 2, 0.05, 0.003, 0.03)]
    case 'grandfather':
      return [hiss(800, 1, 0.08, 0.03, 0.14, 500)]
    case 'baby':
      return [tone(i % 2 ? 150 : 170, 0.09, 0.006, 0.09, 'sine', 120)]
  }
}
/** One paw of the dog's strut. */
export function paw(i: number): Sound[] {
  return [hiss(2900, 4, 0.05, 0.002, 0.025), tone(i % 2 ? 620 : 700, 0.03, 0.002, 0.02, 'triangle')]
}
/** A wet or snowy garment shakes itself dry on its peg; the dog shakes after rain. */
export const shakeOff: Sound[] = [hiss(3400, 3, 0.08, 0.004, 0.12), tone(1600, 0.03, 0.004, 0.05, 'sine', 1100)]
export const dogShake: Sound[] = [hiss(2400, 1.5, 0.1, 0.01, 0.3, 3400), tone(300, 0.05, 0.01, 0.2, 'triangle', 380)]
/** Wet socks are wrung out on the mat. */
export const sockWring: Sound[] = [hiss(520, 3, 0.1, 0.02, 0.2, 300)]
/** The ending: a stretch, the sit, a breath out, and the two at the window turning to look. */
export const stretch: Sound[] = [tone(196, 0.07, 0.1, 0.5, 'sine', 294)]
export const sitDown: Sound[] = [hiss(300, 0.7, 0.12, 0.008, 0.16), tone(98, 0.1, 0.008, 0.14, 'sine', 74)]
export const breath: Sound[] = [hiss(1200, 0.6, 0.08, 0.14, 0.45, 500)]
export const headsTurn: Sound[] = [tone(440, 0.04, 0.02, 0.2, 'sine', 392)]
/** The showing of the door: the lead dropped, a scratch at the wood, the lead picked up. */
export const leadDrop: Sound[] = [hiss(1500, 2, 0.08, 0.003, 0.05), tone(240, 0.06, 0.003, 0.06, 'triangle', 180)]
export const scratch: Sound[] = [hiss(2000, 5, 0.1, 0.006, 0.12, 2800)]
export const leadUp: Sound[] = [tone(520, 0.06, 0.004, 0.07, 'triangle', 700)]
/** The showing of the vane: a knuckle on the glass, the cockerel spinning, and a tick as the weather changes. */
export const glassRap: Sound[] = [tone(1760, 0.1, 0.002, 0.05, 'sine'), tone(2640, 0.04, 0.002, 0.04, 'sine')]
export const vaneSpin: Sound[] = [tone(400, 0.07, 0.05, 0.5, 'triangle', 1100), hiss(2600, 6, 0.03, 0.05, 0.4)]
/** The figure who was waiting sets off for the middle. */
export const setsOff: Sound[] = [tone(392, 0.07, 0.01, 0.12, 'sine', 587)]
/** A garment caught out of the air. */
export const caught: Sound[] = [hiss(2600, 2, 0.07, 0.002, 0.04)]

/** Every sound here, for the test that holds each in range. */
export function everySceneVoice(): { name: string; sound: Sound[] }[] {
  const all: { name: string; sound: Sound[] }[] = []
  const add = (name: string, sound: Sound[]) => all.push({ name, sound })
  add('knock', knock); add('doorCreak', doorCreak); add('doorShut', doorShut); add('sheetOver', sheetOver); add('sheetBack', sheetBack)
  add('vaneTurn', vaneTurn); add('vaneTouch', vaneTouch)
  for (const [weather, sound] of Object.entries(WEATHER_VOICE)) add(`weather ${weather}`, sound)
  for (const who of ['child', 'grandfather', 'baby'] as const) for (let i = 0; i < 3; i++) add(`footstep ${who} ${i}`, footstep(who, i))
  add('paw 0', paw(0)); add('paw 1', paw(1)); add('shakeOff', shakeOff); add('dogShake', dogShake); add('sockWring', sockWring)
  add('stretch', stretch); add('sitDown', sitDown); add('breath', breath); add('headsTurn', headsTurn)
  add('leadDrop', leadDrop); add('scratch', scratch); add('leadUp', leadUp); add('glassRap', glassRap); add('vaneSpin', vaneSpin); add('setsOff', setsOff); add('caught', caught)
  return all
}
