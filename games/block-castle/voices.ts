import type { Note } from './audio'
import type { Kind } from './blocks'
import type { Who } from './layout'
import { NOD_CREAK, SECOND_KNOCK } from './motion'

// Every sound of the toy as plain numbers, written from the sheet's words:
// nobody on the machine that built this could listen. The test beside this
// file holds every pitch, peak and length in range.
//
// The blocks are a set of wood blocks tuned to one five-note scale. Each kind
// has its own knock, and a knock is one step of the scale higher for every
// level it lands on (every block that stands under it, one on another), so a
// tower plays a tune as it grows.

/** The pitch of each kind's knock on the rug, in hertz: the bigger the block, the lower. */
export const PITCH: Record<Kind, number> = { long: 196, arch: 262, round: 165, cube: 392, slope: 330, thin: 784 }

/** Semitones above the kind's own pitch for each level: a five-note scale over two octaves. */
export const SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21] as const

/** Three variants of every knock: a slightly different tuning and click, so no two landings sound alike. */
const VARIANTS = [
  { detune: 1, click: 2100 },
  { detune: 1.012, click: 2600 },
  { detune: 0.99, click: 1700 },
] as const
export const VARIANT_COUNT = VARIANTS.length

function pitchAt(kind: Kind, tier: number, variant: number): number {
  const step = SCALE[Math.max(0, Math.min(SCALE.length - 1, tier))]
  return PITCH[kind] * 2 ** (step / 12) * VARIANTS[variant % VARIANTS.length].detune
}

/** One knock of wood: a short pitched body and a click. On wool the click is duller and a soft thud sits under it. */
function knockAt(f: number, wood: boolean, variant: number, delay: number, peak: number): Note[] {
  const click = VARIANTS[variant % VARIANTS.length].click
  const notes: Note[] = [
    { kind: 'tone', wave: 'sine', frequency: f, peak, attack: 0.002, decay: wood ? 0.16 : 0.1, delay },
    { kind: 'tone', wave: 'triangle', frequency: f * 2.76, peak: peak * (wood ? 0.35 : 0.15), attack: 0.002, decay: 0.05, delay },
    { kind: 'noise', frequency: wood ? click : click * 0.45, q: wood ? 3 : 1.2, peak: peak * (wood ? 0.5 : 0.3), attack: 0.001, decay: 0.025, delay },
  ]
  if (!wood) notes.push({ kind: 'tone', wave: 'sine', frequency: 92, glideTo: 60, peak: peak * 0.7, attack: 0.003, decay: 0.09, delay })
  return notes
}

/**
 * A block lands. `tier` is how many blocks stand under it (0 is the rug), `wood`
 * whether it lands on another block, `air` whether a long one has air under
 * it and rings on, and `soft` a block that only dropped a level when the one
 * under it was pulled out.
 */
export function land(kind: Kind, tier: number, wood: boolean, variant: number, air = false, soft = false, delay = 0): Note[] {
  const f = pitchAt(kind, tier, variant)
  const peak = soft ? 0.14 : 0.26
  const notes = knockAt(f, wood, variant, delay, peak)
  const second = SECOND_KNOCK[kind]
  switch (kind) {
    case 'long':
      // The other end: clack-clock, the second a little lower.
      notes.push(...knockAt(f * 0.94, wood, variant + 1, delay + second!, peak * 0.8))
      // With air under it the plank rings on like a bar.
      if (air) notes.push({ kind: 'tone', wave: 'sine', frequency: f * 2, peak: 0.12, attack: 0.004, decay: 0.7, delay: delay + second! }, { kind: 'tone', wave: 'sine', frequency: f * 4.02, peak: 0.04, attack: 0.004, decay: 0.35, delay: delay + second! })
      break
    case 'arch':
      // Hollow: a fifth above sounds inside it, and the other foot answers, softer. On a block the knock comes back out of its hole.
      notes.push({ kind: 'tone', wave: 'sine', frequency: f * 1.5, peak: peak * 0.5, attack: 0.004, decay: 0.2, delay })
      notes.push(...knockAt(f * (wood ? 1 : 0.97), wood, variant + 1, delay + second!, peak * (wood ? 0.35 : 0.55)))
      break
    case 'round':
      // The deepest knock, and a short rumble as it turns on its end.
      notes.push({ kind: 'tone', wave: 'sine', frequency: f * 0.5, peak: peak * 0.8, attack: 0.004, decay: 0.2, delay })
      notes.push({ kind: 'noise', frequency: 140, q: 1.5, peak: 0.1, attack: 0.06, decay: 0.38, glideTo: 90, delay: delay + 0.04 })
      break
    case 'thin':
      // A tick, and three fainter ticks as it sways.
      for (let i = 1; i <= 3; i++) notes.push({ kind: 'tone', wave: 'triangle', frequency: f * (1 + 0.02 * i), peak: peak * 0.5 * 0.55 ** i, attack: 0.001, decay: 0.03, delay: delay + 0.185 * i })
      break
    case 'cube':
      // One dry knock: nothing after it.
      break
    case 'slope':
      if (wood) {
        // Set on a block its toe comes down on air and nods: no slap, a small creak that rises and falls.
        notes.push({ kind: 'noise', frequency: 520, glideTo: 760, q: 9, peak: peak * 0.45, attack: 0.03, decay: 0.12, delay: delay + NOD_CREAK })
        notes.push({ kind: 'tone', wave: 'sawtooth', frequency: f * 0.5, glideTo: f * 0.62, peak: peak * 0.12, attack: 0.03, decay: 0.12, delay: delay + NOD_CREAK })
        notes.push({ kind: 'noise', frequency: 700, glideTo: 480, q: 9, peak: peak * 0.25, attack: 0.03, decay: 0.14, delay: delay + NOD_CREAK + 0.26 })
        break
      }
      // On the rug the toe slaps down after the heel.
      notes.push({ kind: 'noise', frequency: 1300, q: 0.8, peak: peak * 0.7, attack: 0.001, decay: 0.05, delay: delay + second! })
      notes.push({ kind: 'tone', wave: 'triangle', frequency: f * 1.33, peak: peak * 0.4, attack: 0.002, decay: 0.06, delay: delay + second! })
      break
  }
  return notes
}

/** A block comes up into the hand, each kind with its own lift. */
export function lift(kind: Kind): Note[] {
  const f = PITCH[kind]
  switch (kind) {
    case 'long':
      // whup: a low swoop up.
      return [{ kind: 'noise', frequency: 260, glideTo: 620, q: 2, peak: 0.16, attack: 0.02, decay: 0.09 }, { kind: 'tone', wave: 'sine', frequency: f, glideTo: f * 1.5, peak: 0.1, attack: 0.01, decay: 0.08 }]
    case 'arch':
      // pop: a cork.
      return [{ kind: 'tone', wave: 'sine', frequency: f * 1.2, glideTo: f * 2.6, peak: 0.24, attack: 0.002, decay: 0.05 }, { kind: 'noise', frequency: 900, q: 4, peak: 0.08, attack: 0.001, decay: 0.03 }]
    case 'round':
      // thrum: a low string, twisted.
      return [{ kind: 'tone', wave: 'triangle', frequency: f, glideTo: f * 1.12, peak: 0.2, attack: 0.004, decay: 0.16 }, { kind: 'tone', wave: 'sine', frequency: f * 2.01, peak: 0.07, attack: 0.004, decay: 0.12 }]
    case 'thin':
      // twang: up and back down.
      return [{ kind: 'tone', wave: 'triangle', frequency: f * 0.75, glideTo: f * 1.1, peak: 0.16, attack: 0.002, decay: 0.07 }, { kind: 'tone', wave: 'triangle', frequency: f * 1.1, glideTo: f * 0.8, peak: 0.1, attack: 0.002, decay: 0.14, delay: 0.07 }]
    case 'cube':
      // tup.
      return [{ kind: 'tone', wave: 'triangle', frequency: f, glideTo: f * 1.25, peak: 0.2, attack: 0.002, decay: 0.06 }]
    case 'slope':
      // shff: a scrape.
      return [{ kind: 'noise', frequency: 2400, glideTo: 3600, q: 0.9, peak: 0.14, attack: 0.02, decay: 0.1 }, { kind: 'tone', wave: 'sine', frequency: f, peak: 0.06, attack: 0.004, decay: 0.05 }]
  }
}

/** A block that could not stay: it zips down a slope, or glances off a tip with a tink. */
export function shed(why: 'slope' | 'tip'): Note[] {
  if (why === 'slope') return [{ kind: 'noise', frequency: 3200, glideTo: 900, q: 2.5, peak: 0.16, attack: 0.01, decay: 0.2 }, { kind: 'tone', wave: 'sine', frequency: 880, glideTo: 392, peak: 0.07, attack: 0.01, decay: 0.2 }]
  return [{ kind: 'tone', wave: 'sine', frequency: 2093, peak: 0.16, attack: 0.001, decay: 0.12 }, { kind: 'tone', wave: 'sine', frequency: 3136, peak: 0.07, attack: 0.001, decay: 0.07 }]
}

/** A slope in the hand turns round as it crosses the middle of the rug: a soft whup. */
export const flip: Note[] = [{ kind: 'noise', frequency: 420, glideTo: 950, q: 1.6, peak: 0.1, attack: 0.02, decay: 0.07 }]

/** A block goes back into the basket: a knock on wicker, dull and dry, with a creak of cane. */
export function intoBasket(kind: Kind): Note[] {
  return [
    { kind: 'tone', wave: 'triangle', frequency: PITCH[kind] * 0.75, peak: 0.16, attack: 0.002, decay: 0.06 },
    { kind: 'noise', frequency: 700, q: 1, peak: 0.14, attack: 0.002, decay: 0.05 },
    { kind: 'noise', frequency: 1500, glideTo: 2300, q: 9, peak: 0.05, attack: 0.03, decay: 0.12, delay: 0.04 },
  ]
}

/** The next block of a kind comes up in the basket: a small knock of wood on wood. */
export function rise(kind: Kind): Note[] {
  return [{ kind: 'tone', wave: 'sine', frequency: PITCH[kind] * 1.5, peak: 0.07, attack: 0.002, decay: 0.05, delay: 0.12 }, { kind: 'noise', frequency: 1800, q: 3, peak: 0.04, attack: 0.001, decay: 0.02, delay: 0.12 }]
}

/** The wicker of the basket, touched: it creaks. */
export const creak: Note[] = [
  { kind: 'noise', frequency: 520, glideTo: 880, q: 11, peak: 0.16, attack: 0.05, decay: 0.16 },
  { kind: 'noise', frequency: 900, glideTo: 620, q: 11, peak: 0.1, attack: 0.04, decay: 0.14, delay: 0.2 },
]

/** A finger on the room itself: a pat on wool, a tap on a floorboard, a dull knock on plaster. */
export function pat(surface: 'rug' | 'floor' | 'wall'): Note[] {
  if (surface === 'rug') return [{ kind: 'noise', frequency: 240, q: 0.8, peak: 0.2, attack: 0.004, decay: 0.07 }, { kind: 'tone', wave: 'sine', frequency: 110, glideTo: 70, peak: 0.12, attack: 0.004, decay: 0.08 }]
  if (surface === 'floor') return [{ kind: 'tone', wave: 'sine', frequency: 147, peak: 0.2, attack: 0.002, decay: 0.09 }, { kind: 'noise', frequency: 1200, q: 2, peak: 0.1, attack: 0.001, decay: 0.02 }]
  return [{ kind: 'tone', wave: 'sine', frequency: 98, peak: 0.16, attack: 0.003, decay: 0.06 }, { kind: 'noise', frequency: 400, q: 0.7, peak: 0.08, attack: 0.002, decay: 0.04 }]
}

/**
 * The folk have invented voices, one each. A poke gets the whole of it; a
 * knock on the rug gets the short start of it, quieter (`startled`).
 */
export function folk(who: Who, startled = false): Note[] {
  const quiet = startled ? 0.45 : 1
  switch (who) {
    case 'king':
      // hrmph: two low grumbles, the second lower.
      return [
        { kind: 'tone', wave: 'sawtooth', frequency: 147, glideTo: 131, peak: 0.1 * quiet, attack: 0.02, decay: 0.14 },
        ...(startled ? [] : [{ kind: 'tone' as const, wave: 'sawtooth' as const, frequency: 123, glideTo: 98, peak: 0.1, attack: 0.02, decay: 0.24, delay: 0.2 }, { kind: 'noise' as const, frequency: 300, q: 1, peak: 0.05, attack: 0.03, decay: 0.2, delay: 0.2 }]),
      ]
    case 'cook':
      // A squeak, and the spoon on the pot.
      return [
        { kind: 'tone', wave: 'sine', frequency: 880, glideTo: 1320, peak: 0.14 * quiet, attack: 0.01, decay: 0.09 },
        ...(startled ? [] : [{ kind: 'tone' as const, wave: 'sine' as const, frequency: 1320, peak: 0.12, attack: 0.001, decay: 0.3, delay: 0.14 }, { kind: 'tone' as const, wave: 'sine' as const, frequency: 1973, peak: 0.07, attack: 0.001, decay: 0.22, delay: 0.14 }, { kind: 'tone' as const, wave: 'sine' as const, frequency: 2861, peak: 0.04, attack: 0.001, decay: 0.12, delay: 0.14 }]),
      ]
    case 'dragon':
      // A long yawn: up a little, then far down, with breath in it.
      return [
        { kind: 'tone', wave: 'triangle', frequency: 196, glideTo: startled ? 220 : 262, peak: 0.1 * quiet, attack: 0.08, decay: startled ? 0.12 : 0.2 },
        ...(startled ? [] : [{ kind: 'tone' as const, wave: 'triangle' as const, frequency: 262, glideTo: 110, peak: 0.12, attack: 0.05, decay: 0.6, delay: 0.26 }, { kind: 'noise' as const, frequency: 800, glideTo: 300, q: 0.8, peak: 0.07, attack: 0.2, decay: 0.6, delay: 0.1 }]),
      ]
  }
}

/** The longest any one voice may sound, in seconds, and the loudest any one note may be. The test holds every voice to both. */
export const LIMITS = { seconds: 1.4, peak: 0.3, lowest: 55, highest: 4500 } as const
