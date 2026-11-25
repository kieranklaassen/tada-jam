import type { Note } from './audio'
import type { HostId } from './layout'
import { makeRng } from './rng'

// What can be on the string. A kind says how a thing looks asleep and awake
// (pictures.ts), what it lets out, how a body moves with it, and its tune. A
// host plays the tune in its own timbre, so kind times host is always new.

export type Kind = 'bulb' | 'boot' | 'pants' | 'sausage' | 'kettle' | 'uncle' | 'fish' | 'trumpet' | 'hen' | 'umbrella' | 'jelly'
export const SILLY: readonly Kind[] = ['boot', 'pants', 'sausage', 'kettle', 'uncle', 'fish', 'trumpet', 'hen', 'umbrella', 'jelly']
export const KINDS: readonly Kind[] = ['bulb', ...SILLY]

export const BULB_COLOURS = ['yellow', 'red', 'green', 'blue', 'orange', 'white'] as const

/** What a body does with a kind: the part that moves. */
export type Motion = 'glow' | 'stamp' | 'dance' | 'lick' | 'blow' | 'doze' | 'gulp' | 'toot' | 'strain' | 'open' | 'wobble'
export type Puff = 'spark' | 'dust' | 'bow' | 'sizzle' | 'steam' | 'snore' | 'bubble' | 'ring' | 'egg' | 'drop' | 'wobbleRing' | 'snow' | 'hatch'

type Nature = { motion: Motion; puff: Puff; tune: readonly number[]; gap: number; wave: OscillatorType; breath: boolean; glide: number }
export const NATURE: Readonly<Record<Kind, Nature>> = {
  bulb: { motion: 'glow', puff: 'spark', tune: [12, 19], gap: 0.08, wave: 'sine', breath: false, glide: 0 },
  boot: { motion: 'stamp', puff: 'dust', tune: [-12, -12, -17], gap: 0.2, wave: 'square', breath: true, glide: -7 },
  pants: { motion: 'dance', puff: 'bow', tune: [0, 7, 4, 7], gap: 0.16, wave: 'triangle', breath: false, glide: 3 },
  sausage: { motion: 'lick', puff: 'sizzle', tune: [5, 2], gap: 0.26, wave: 'sawtooth', breath: true, glide: -5 },
  kettle: { motion: 'blow', puff: 'steam', tune: [16, 21], gap: 0.22, wave: 'sine', breath: true, glide: 7 },
  uncle: { motion: 'doze', puff: 'snore', tune: [-7, -14], gap: 0.45, wave: 'sawtooth', breath: true, glide: -3 },
  fish: { motion: 'gulp', puff: 'bubble', tune: [3, 8, 12, 15], gap: 0.12, wave: 'sine', breath: false, glide: 8 },
  trumpet: { motion: 'toot', puff: 'ring', tune: [0, 0, 7], gap: 0.17, wave: 'square', breath: false, glide: 1 },
  hen: { motion: 'strain', puff: 'egg', tune: [9, 9, 9, 16], gap: 0.13, wave: 'sawtooth', breath: false, glide: 4 },
  umbrella: { motion: 'open', puff: 'drop', tune: [-5, 12], gap: 0.1, wave: 'triangle', breath: true, glide: 12 },
  jelly: { motion: 'wobble', puff: 'wobbleRing', tune: [4, 1, 4, 1, 4], gap: 0.1, wave: 'triangle', breath: false, glide: -4 },
}

export type Where = HostId | 'air'
const TIMBRE: Readonly<Record<Where, { base: number; wave: OscillatorType | null; peak: number; tail: number; slow: number }>> = {
  air: { base: 392, wave: null, peak: 0.11, tail: 0.16, slow: 1 },
  moose: { base: 98, wave: 'sawtooth', peak: 0.2, tail: 0.3, slow: 1.35 },
  house: { base: 165, wave: 'square', peak: 0.1, tail: 0.24, slow: 1.15 },
  tree: { base: 523, wave: 'sine', peak: 0.16, tail: 0.5, slow: 1.05 },
  dog: { base: 440, wave: 'triangle', peak: 0.2, tail: 0.1, slow: 0.75 },
}

/** The tune of a kind, as the place it hangs on plays it. */
export function tuneOf(kind: Kind, where: Where, loud = 1): Note[] {
  const nature = NATURE[kind], timbre = TIMBRE[where], notes: Note[] = []
  nature.tune.forEach((step, i) => {
    const frequency = clamp(timbre.base * 2 ** (step / 12)), delay = i * nature.gap * timbre.slow
    notes.push({ kind: 'tone', frequency, glideTo: clamp(frequency * 2 ** (nature.glide / 12)), wave: timbre.wave ?? nature.wave, peak: timbre.peak * loud, attack: 0.012, decay: timbre.tail, delay })
    if (nature.breath) notes.push({ kind: 'noise', frequency: clamp(frequency * 4), q: 1.2, peak: timbre.peak * loud * 0.7, attack: 0.02, decay: timbre.tail, delay })
  })
  return notes
}
const clamp = (hertz: number) => Math.min(3600, Math.max(55, hertz))

/** What hangs at each distance from the end of one boxful: a bulb first, then every other thing silly, each silly thing once before any comes again. */
export function contentsOf(seed: number, count: number): Kind[] {
  const rng = makeRng(seed), kinds: Kind[] = []
  let bag: Kind[] = []
  // The first boxful starts with what is funniest to pull out, in this order.
  const first: Kind[] = seed === 0 ? ['boot', 'pants', 'uncle', 'kettle', 'hen'] : []
  for (let i = 0; i < count; i++) {
    if (i % 2 === 0) { kinds.push('bulb'); continue }
    if (first.length) { const kind = first.shift()!; kinds.push(kind); if (!first.length) bag = shuffle(SILLY.filter((one) => !kinds.includes(one)), rng.next); continue }
    if (!bag.length) {
      bag = shuffle([...SILLY], rng.next)
      if (bag[0] === kinds[i - 2]) bag.push(bag.shift()!)
    }
    kinds.push(bag.shift()!)
  }
  return kinds
}
function shuffle<T>(items: T[], next: () => number): T[] {
  for (let i = items.length - 1; i > 0; i--) { const j = Math.floor(next() * (i + 1)); [items[i], items[j]] = [items[j], items[i]] }
  return items
}
