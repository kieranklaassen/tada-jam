import type { Note } from './audio'
import { KIND, type Kind } from './kinds'
import { bobSeconds } from './motion'
import { BOUNCE_SECONDS, isMarch, type Cause, type Cue } from './play'

// Every sound of the toy, as plain numbers: nobody has listened to them, so
// a test holds every pitch, peak and length in range (voices.test.ts). They
// are written from the words of the design sheet's grid.
// Size is heard as pitch: the bloop of a small thing is high and of a big one
// low, and so is the burp that gives it back.

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })

/** The pitch a thing's size gives: about 570 Hz for a pie down to about 260 Hz for the drummer. */
export function pitchOf(kind: Kind): number {
  return 620 / KIND[kind].width ** 0.9
}

/** The bloop: a round note that falls by more than an octave, longer for a bigger thing. */
function bloop(kind: Kind, delay: number): Note {
  const pitch = pitchOf(kind)
  return tone(pitch, 0.22, 0.01, 0.2 + 0.06 * KIND[kind].width, { glideTo: pitch * 0.42, delay })
}

/** How each thing goes in, and when its bloop comes. */
const DROP: Readonly<Record<Kind, { notes: readonly Note[]; bloopAt: number }>> = {
  // A splat.
  pie: { notes: [hiss(900, 0.8, 0.16, 0.005, 0.09)], bloopAt: 0.12 },
  // A hollow pop.
  hat: { notes: [tone(520, 0.16, 0.004, 0.07, { wave: 'triangle', glideTo: 380 })], bloopAt: 0.1 },
  // A long yelp that falls in pitch.
  dog: { notes: [tone(900, 0.07, 0.01, 0.32, { wave: 'square', glideTo: 420 })], bloopAt: 0.3 },
  // A squeal that slides up, then a pop.
  balloon: { notes: [tone(600, 0.1, 0.02, 0.3, { glideTo: 1500 }), hiss(2200, 2, 0.16, 0.003, 0.04, { delay: 0.33 })], bloopAt: 0.36 },
  // A honk that slides down, and its echo.
  tuba: { notes: [tone(140, 0.12, 0.02, 0.4, { wave: 'sawtooth', glideTo: 70 }), tone(160, 0.05, 0.02, 0.3, { glideTo: 110, delay: 0.62 })], bloopAt: 0.3 },
  // Boom, boom, boom, each more muffled.
  drummer: { notes: [tone(95, 0.3, 0.006, 0.16, { glideTo: 60 }), tone(92, 0.2, 0.006, 0.16, { glideTo: 58, delay: 0.22 }), tone(88, 0.12, 0.006, 0.16, { glideTo: 55, delay: 0.44 })], bloopAt: 0.6 },
}

/** How each thing wobbles on the rim. */
const TEETER: Readonly<Record<Kind, readonly Note[]>> = {
  // A plate rattle.
  pie: [hiss(3200, 6, 0.07, 0.003, 0.03), hiss(3400, 6, 0.06, 0.003, 0.03, { delay: 0.05 }), hiss(3000, 6, 0.05, 0.003, 0.03, { delay: 0.1 })],
  // Tok-tok.
  hat: [tone(430, 0.12, 0.004, 0.05, { wave: 'triangle', glideTo: 400 }), tone(410, 0.1, 0.004, 0.05, { wave: 'triangle', glideTo: 380, delay: 0.12 })],
  // A wheel whirr and a whimper.
  dog: [hiss(1400, 3, 0.05, 0.02, 0.12), tone(1250, 0.04, 0.008, 0.06, { wave: 'square', glideTo: 1500, delay: 0.08 })],
  // A rubber squeal.
  balloon: [hiss(900, 14, 0.1, 0.04, 0.16, { glideTo: 1500 })],
  // A ringing wobble.
  tuba: [tone(196, 0.1, 0.01, 0.3, { wave: 'triangle', glideTo: 185 }), tone(392, 0.04, 0.01, 0.2)],
  // Rat-a-tat-thud.
  drummer: [tone(180, 0.14, 0.004, 0.05, { glideTo: 120 }), tone(180, 0.12, 0.004, 0.05, { glideTo: 120, delay: 0.07 }), tone(90, 0.22, 0.006, 0.14, { glideTo: 55, delay: 0.16 })],
}

/** How each thing answers a finger. */
const POKE: Readonly<Record<Kind, readonly Note[]>> = {
  // A squelch.
  pie: [hiss(500, 2, 0.14, 0.01, 0.14, { glideTo: 250 })],
  // A hollow tok.
  hat: [tone(560, 0.14, 0.004, 0.08, { wave: 'triangle', glideTo: 500 })],
  // Squeak-squeak.
  dog: [tone(1100, 0.05, 0.006, 0.07, { wave: 'square', glideTo: 1400 }), tone(1150, 0.05, 0.006, 0.07, { wave: 'square', glideTo: 1450, delay: 0.13 })],
  // A boing.
  balloon: [tone(180, 0.16, 0.01, 0.25, { glideTo: 420 })],
  // Oom-pah.
  tuba: [tone(98, 0.12, 0.02, 0.2, { wave: 'sawtooth' }), tone(147, 0.1, 0.02, 0.16, { wave: 'sawtooth', delay: 0.26 })],
  // Boom-tish.
  drummer: [tone(100, 0.3, 0.006, 0.18, { glideTo: 60 }), hiss(6000, 1, 0.08, 0.004, 0.2, { delay: 0.14 })],
}

/** What each thing sounds like when it comes to sit on top of another. */
const TOP: Readonly<Record<Kind, readonly Note[]>> = {
  // The cherry lands last: a plip.
  pie: [tone(1500, 0.08, 0.003, 0.05, { glideTo: 2100, delay: 0.3 })],
  // A soft fwump.
  hat: [hiss(260, 0.9, 0.12, 0.02, 0.14, { glideTo: 160 })],
  // A yap.
  dog: [tone(980, 0.07, 0.006, 0.09, { wave: 'square', glideTo: 1300 })],
  // A high wavering hum.
  balloon: [tone(1180, 0.035, 0.08, 0.5, { glideTo: 1240 }), tone(1195, 0.03, 0.08, 0.5, { glideTo: 1150, delay: 0.04 })],
  // One note, as the thing below puffs.
  tuba: [tone(123, 0.11, 0.02, 0.24, { wave: 'sawtooth' })],
  // A steady boom from up high.
  drummer: [tone(105, 0.24, 0.006, 0.16, { glideTo: 65 })],
}

/** What each thing sounds like when it is pushed up underneath, to the bottom of a stack. */
const UNDER: Readonly<Record<Kind, readonly Note[]>> = {
  // A squish.
  pie: [hiss(420, 1.6, 0.14, 0.015, 0.2, { glideTo: 180 })],
  // A hollow clonk, as a bucket set down.
  hat: [tone(300, 0.14, 0.004, 0.1, { wave: 'triangle', glideTo: 240 })],
  // A squeak of springs.
  dog: [tone(700, 0.05, 0.01, 0.12, { wave: 'square', glideTo: 520 })],
  // Rubber creaking wide.
  balloon: [hiss(600, 10, 0.1, 0.03, 0.2, { glideTo: 380 })],
  // A parp from the bell on the ground.
  tuba: [tone(82, 0.13, 0.02, 0.22, { wave: 'sawtooth', glideTo: 74 })],
  // Two boots coming down.
  drummer: [tone(120, 0.2, 0.005, 0.08, { glideTo: 80 }), tone(115, 0.2, 0.005, 0.08, { glideTo: 76, delay: 0.1 })],
}

/** A sound that comes out through the tuba: an octave down and a little longer. */
function deep(notes: readonly Note[]): Note[] {
  return notes.map((note) => ({ ...note, frequency: Math.max(50, note.frequency / 2), ...(note.glideTo ? { glideTo: Math.max(46, note.glideTo / 2) } : {}), decay: note.decay * 1.3 }))
}

/** A note, and what it belongs to when it is one that waits (later.ts). */
export type Sound = Note & { cause?: Cause }

/** These notes belong to `cause`: those of them that wait are not heard once it is over. */
const while_ = (cause: Cause, notes: readonly Note[]): Sound[] => notes.map((note) => ({ ...note, cause }))

const later = (notes: readonly Note[], by: number, soft = 1): Note[] => notes.map((note) => ({ ...note, delay: (note.delay ?? 0) + by, peak: note.peak * soft }))

/** The mayor when his hat goes in: a wail that falls, then he calls down the hole through his hand and hears it come back muffled. */
const MAYOR_WAIL: readonly Note[] = [
  tone(300, 0.07, 0.04, 0.4, { wave: 'sawtooth', glideTo: 150, delay: 0.5 }),
  tone(250, 0.09, 0.03, 0.16, { wave: 'sawtooth', glideTo: 330, delay: 1.15 }), tone(250, 0.09, 0.03, 0.22, { wave: 'sawtooth', glideTo: 330, delay: 1.4 }),
  tone(125, 0.04, 0.05, 0.2, { glideTo: 165, delay: 2.0 }), tone(125, 0.03, 0.05, 0.26, { glideTo: 165, delay: 2.25 }),
]
/** When it comes out, or sits on top of something: a breath that rises. */
const MAYOR_AH: Note = tone(200, 0.07, 0.04, 0.22, { wave: 'sawtooth', glideTo: 400, delay: 0.45 })
/** His hat on the dog: ho, ho, ho. */
const MAYOR_HO: readonly Note[] = [0, 1, 2].map((beat) => tone(165 - beat * 8, 0.09, 0.02, 0.12, { wave: 'sawtooth', glideTo: 120, delay: 0.5 + beat * 0.2 }))
/** His hat underneath something: a moan that sinks. */
const MAYOR_MOAN: Note = tone(220, 0.07, 0.06, 0.55, { wave: 'sawtooth', glideTo: 110, delay: 0.45 })
/** His hat under a pie on top of everything: a gasp, and a small giggle as he peeks. */
const MAYOR_PEEK: readonly Note[] = [tone(260, 0.07, 0.03, 0.2, { wave: 'sawtooth', glideTo: 420, delay: 0.3 }), tone(520, 0.05, 0.01, 0.07, { delay: 1.6 }), tone(580, 0.05, 0.01, 0.07, { delay: 1.75 })]
/** The gate keeper fans a burp away: a puff. */
const KEEPER_PFF: Note = hiss(1500, 0.8, 0.04, 0.03, 0.15, { delay: 0.5 })

/**
 * The hole's growl, lower and longer for a bigger thing: the burp itself.
 */
function growl(kind: Kind): Note[] {
  const width = KIND[kind].width, low = 190 / width ** 0.6
  return [tone(low, 0.14, 0.02, 0.18 + 0.08 * width, { wave: 'sawtooth', glideTo: low * 0.6 }), hiss(300, 1, 0.06, 0.02, 0.14)]
}

/** How long after a thing has popped up its own sound comes, and the sound of what comes to sit on it: as long as it takes to shoot up into its place. */
const UP = { pop: 0.08, own: 0.22, under: 0.2, top: 0.34 } as const

/**
 * A thing comes up: the growl, then the thing popping up. Alone it gives its own first sound. Pushed up under
 * others it sounds as the bottom of a stack does, and the thing that rode at the bottom until now (`onto`) sounds
 * as it comes to sit on this one: deep, when this one is the tuba. One that waited down in the mouth (`late`) was
 * growled for at the tap, and pops in the frame it comes up. What follows the pop belongs to the stack on the breath.
 */
function burp(kind: Kind, onto: Kind | null, late: boolean): Sound[] {
  const pitch = pitchOf(kind), by = late ? -UP.pop : 0
  const notes: Sound[] = [...(late ? [] : growl(kind)), tone(pitch * 0.55, 0.12, 0.01, 0.12, { glideTo: pitch * 1.25, delay: UP.pop + by })]
  if (onto === null) return [...notes, ...while_('breath', [{ ...POKE[kind][0], delay: UP.own + by, peak: POKE[kind][0].peak * 0.7 }])]
  return [...notes, ...while_('breath', [...later(UNDER[kind], UP.under + by), ...later(kind === 'tuba' ? deep(TOP[onto]) : TOP[onto], UP.top + by)])]
}

/** How often the balloon's hum is taken up again, in seconds: each breath of it runs into the next. */
const HUM_EVERY = 0.5

/** One bob of a stack on the breath: whatever on it plays, plays. What sits in a tuba at the bottom sounds through it. */
function bob(parts: readonly Kind[]): Sound[] {
  const notes: Note[] = []
  let load = 0
  for (const kind of parts) load += KIND[kind].width
  for (let index = 1; index < parts.length; index++) {
    const below = KIND[parts[index - 1]].width, own: Note[] = []
    // The tuba honks one note, lower the bigger the thing that plays it.
    if (parts[index] === 'tuba') own.push(tone(230 / below ** 0.8, 0.1, 0.02, 0.22, { wave: 'sawtooth' }))
    // The drummer's boom is lighter the smaller the thing he sits on.
    // His sticks are down in the frame the bob begins, and the boom is in that frame.
    if (parts[index] === 'drummer') own.push(tone(105, 0.08 + 0.07 * below, 0.006, 0.16, { glideTo: 65 }))
    // A balloon on top hums without a break: the hum is taken up again and again until the next bob begins.
    if (parts[index] === 'balloon' && index === parts.length - 1) {
      for (let at = 0; at < bobSeconds(load) - 0.1; at += HUM_EVERY) own.push(...later(TOP.balloon, at))
    }
    notes.push(...(index === 1 && parts[0] === 'tuba' ? deep(own) : own))
  }
  return while_('breath', notes)
}

/**
 * The mouth tugs at the foot of a thing too wide for it: a creak that climbs as the lip stretches, lower for a
 * bigger thing, and a rubbery rub under it.
 */
function strain(kind: Kind): Note[] {
  const pitch = pitchOf(kind) * 0.45
  return [tone(pitch, 0.09, 0.06, 0.55, { wave: 'sawtooth', glideTo: pitch * 1.7 }), hiss(700, 9, 0.07, 0.08, 0.55, { glideTo: 1100 })]
}

/** The lip lets go of that foot: a puff, in the frame it does. */
function loose(kind: Kind): Note[] {
  const pitch = pitchOf(kind) * 0.45
  return [tone(pitch * 1.6, 0.08, 0.01, 0.12, { glideTo: pitch * 0.9 }), hiss(500, 1, 0.07, 0.01, 0.16, { glideTo: 250 })]
}

/** The march the dog, the tuba and the drummer play: one note of the tuba to a step. */
const MARCH: readonly number[] = [98, 123, 147, 123, 131, 165, 147, 196]

/** One step of a stack's walk, in its bottom thing's manner. `load` is the summed width of the stack. */
function step(parts: readonly Kind[], count: number): Note[] {
  let load = 0
  for (const kind of parts) load += KIND[kind].width
  if (isMarch(parts)) {
    // The whole march: the tuba's tune, the drum on every step, the wheels squeaking in time.
    return [tone(MARCH[count % MARCH.length], 0.13, 0.02, 0.2, { wave: 'sawtooth' }), tone(100, 0.2, 0.006, 0.14, { glideTo: 62 }), tone(1250, 0.03, 0.006, 0.05, { wave: 'square', glideTo: 1500, delay: 0.12 })]
  }
  switch (parts[0]) {
    // A wet scrape for each slide.
    case 'pie': return [hiss(700, 1.2, 0.09, 0.03, 0.2, { glideTo: 350 })]
    // Clop, as the hop lands.
    case 'hat': return [tone(360, 0.13, 0.004, 0.06, { wave: 'triangle', glideTo: 300 })]
    // A wheel squeak, and a pant before the next.
    case 'dog': return [tone(1250, 0.045, 0.006, 0.06, { wave: 'square', glideTo: 1500 }), hiss(1800, 1.2, 0.03, 0.02, 0.06, { delay: 0.1 })]
    // A boing as the bounce lands, lower the heavier the load.
    case 'balloon': return [tone(300 / (1 + 0.12 * load), 0.15, 0.01, 0.28, { glideTo: 620 / (1 + 0.12 * load) })]
    // A parp.
    case 'tuba': return [tone(count % 2 === 0 ? 87 : 98, 0.12, 0.02, 0.18, { wave: 'sawtooth' })]
    // A boom on every left foot.
    case 'drummer': return count % 2 === 0 ? [tone(98, 0.26, 0.006, 0.16, { glideTo: 60 })] : [hiss(2400, 2, 0.03, 0.004, 0.03)]
  }
}

/** How loud a step of the float's roll is, as a share of that thing's own step. */
export const ROLL_SOFT = 0.4

/** The most things a stack that is let down can hold: every thing of the fullest street but one (all of them go out as a float). */
const TALLEST = 12

/** A stack lands: a thud, lower for a taller stack, and the gate keeper's whistle, which starts in that frame and climbs one step for each thing in it. */
function setdown(parts: readonly Kind[]): Note[] {
  const count = Math.min(TALLEST, parts.length)
  const notes: Note[] = [tone(110 / (1 + 0.1 * count), 0.28, 0.006, 0.2, { glideTo: 55 })]
  for (let index = 0; index < count; index++) notes.push(tone(900 * 2 ** (index / 6), 0.05, 0.02, 0.09, { delay: 0.09 * index }))
  return notes
}

const BYSTANDER: Readonly<Record<'mayor' | 'keeper' | 'crowd' | 'gate', readonly Note[]>> = {
  // A harrumph in two steps, and two pats on a bald crown.
  mayor: [tone(120, 0.1, 0.03, 0.16, { wave: 'sawtooth', glideTo: 95 }), tone(110, 0.09, 0.03, 0.18, { wave: 'sawtooth', glideTo: 80, delay: 0.2 }), hiss(900, 1.5, 0.05, 0.004, 0.03, { delay: 0.25 }), hiss(900, 1.5, 0.05, 0.004, 0.03, { delay: 0.68 })],
  // A key jingle.
  keeper: [tone(1800, 0.05, 0.003, 0.05, { wave: 'triangle' }), tone(2200, 0.05, 0.003, 0.05, { wave: 'triangle', delay: 0.06 }), tone(2000, 0.05, 0.003, 0.06, { wave: 'triangle', delay: 0.12 })],
  // A squeak from under a big head, and a pop as it comes up again.
  crowd: [tone(800, 0.06, 0.006, 0.08, { glideTo: 1100 }), tone(600, 0.05, 0.004, 0.04, { glideTo: 900, delay: 0.5 })],
  // The bars rattle.
  gate: [0, 1, 2, 3].map((bar) => tone(520 + bar * 37, 0.05, 0.003, 0.04, { wave: 'triangle', delay: bar * 0.05 })),
}

/** A thing clacks down onto the one before it as the tower tips into a float: wood on wood, lower for a bigger thing. */
function clack(kind: Kind): Note[] {
  return [tone(pitchOf(kind) * 1.4, 0.13, 0.003, 0.045, { wave: 'triangle', glideTo: pitchOf(kind) * 1.1 }), hiss(2600, 2, 0.05, 0.003, 0.03)]
}

/** The gate: a creak that rises as it opens, one that falls as it shuts, and a clunk in the frame its leaves meet. */
const GATE_OPEN: readonly Note[] = [tone(210, 0.06, 0.05, 0.5, { wave: 'sawtooth', glideTo: 330 }), hiss(1200, 8, 0.04, 0.05, 0.45, { glideTo: 1700 })]
const GATE_SHUT: readonly Note[] = [tone(320, 0.06, 0.05, 0.36, { wave: 'sawtooth', glideTo: 200 })]
const GATE_CLUNK: readonly Note[] = [tone(90, 0.2, 0.005, 0.12, { glideTo: 60 })]

/** Three takes of every sound, a little apart in pitch, so the same touch never sounds twice the same in a row. */
export const TAKES: readonly number[] = [1, 1.06, 0.94]

function tuned(notes: readonly Sound[], take: number): Sound[] {
  const by = TAKES[take % TAKES.length]
  return notes.map((note) => ({ ...note, frequency: note.frequency * by, ...(note.glideTo ? { glideTo: note.glideTo * by } : {}) }))
}

/** The notes of one cue. `take` picks one of the three takes. */
export function notesOf(cue: Cue, take = 0): Sound[] {
  switch (cue.type) {
    case 'slide':
      // A low whoosh as the hole sets off.
      return tuned([hiss(220, 0.9, 0.06, 0.03, 0.2, { glideTo: 140 })], take)
    case 'pucker':
      // A short breath in.
      return tuned([hiss(400, 1.5, 0.05, 0.08, 0.05, { glideTo: 1200 })], take)
    case 'hiccup':
      return tuned([tone(500, 0.14, 0.005, 0.07, { glideTo: 900 }), hiss(2500, 2, 0.05, 0.004, 0.04, { delay: 0.05 })], take)
    case 'poke':
      return tuned(cue.deep ? deep(POKE[cue.kind]) : POKE[cue.kind], take)
    case 'strain':
      return tuned(strain(cue.kind), take)
    case 'loose':
      return tuned(loose(cue.kind), take)
    case 'teeter':
      return tuned(TEETER[cue.kind], take)
    case 'drop': {
      const drop = DROP[cue.kind]
      // What is heard of a thing going in belongs to its fall, and the mayor's wail to his hat being down there.
      return tuned([...while_('fall', [...drop.notes, bloop(cue.kind, drop.bloopAt)]), ...(cue.kind === 'hat' ? while_('wail', MAYOR_WAIL) : [])], take)
    }
    case 'burp': {
      // What the mayor makes of where his hat has come to be.
      const mayor: readonly Note[] = cue.kind === 'dog' && cue.onto === 'hat' ? MAYOR_HO : cue.onto === 'hat' || (cue.kind === 'hat' && cue.onto === null) ? [MAYOR_AH] : cue.kind === 'hat' ? [MAYOR_MOAN] : []
      return tuned([...burp(cue.kind, cue.onto, cue.late === true), KEEPER_PFF, ...mayor], take)
    }
    case 'growl':
      return tuned(growl(cue.kind), take)
    case 'bob':
      // The same stack plays the same note on every bob.
      return bob(cue.parts)
    case 'setdown':
      return tuned(setdown(cue.parts), take)
    case 'step':
      return step(cue.parts, cue.step)
    case 'secret':
      // The march opens with a cymbal; two balloons take one long boing up and down; the mayor gasps and peeks.
      if (cue.which === 'march') return [hiss(6000, 1, 0.08, 0.004, 0.3)]
      // The boing rises while the stack goes up and falls while it comes down: the bounce takes `BOUNCE_SECONDS`.
      if (cue.which === 'bounce') return [tone(150, 0.16, 0.02, BOUNCE_SECONDS / 2 - 0.04, { glideTo: 620 }), tone(620, 0.1, 0.02, BOUNCE_SECONDS / 2 - 0.04, { glideTo: 160, delay: BOUNCE_SECONDS / 2 })]
      return [...MAYOR_PEEK]
    case 'muffled':
      // The band plays on from inside: soft and low.
      return tuned([tone(80, 0.1, 0.02, 0.12, { glideTo: 60 }), ...(cue.tuba ? [tone(49, 0.05, 0.02, 0.15, { wave: 'triangle', delay: 0.15 }), tone(73, 0.05, 0.02, 0.13, { wave: 'triangle', delay: 0.32 })] : [])], take)
    case 'bystander':
      return tuned(BYSTANDER[cue.who], take)
    case 'float':
    case 'over':
      // The float's sounds are the cues of its scene, and an ending is only an ending.
      return []
    case 'thud':
      // The tower touches down on the street: a thud the size of all of it, and a creak as it sways from that frame.
      return [tone(70, 0.3, 0.006, 0.3, { glideTo: 42 }), hiss(500, 6, 0.05, 0.1, 0.4, { glideTo: 700 })]
    case 'clunk':
      return [...GATE_CLUNK]
    case 'clack':
      return tuned(clack(cue.kind), take)
    case 'pass':
    case 'arrive':
      // Each thing's own sound, the one it gives a finger.
      return [...POKE[cue.kind]]
    case 'roll':
      // The float goes out on its bottom thing's wheels or feet: that thing's own step, well under everything else.
      return step([cue.kind], cue.step).map((note) => ({ ...note, peak: note.peak * ROLL_SOFT }))
    case 'gate':
      return [...(cue.open ? GATE_OPEN : GATE_SHUT)]
  }
}

/** The most notes one touch may set off: a stack going in is heard as its first few things. */
export const MOST_NOTES = 24

/**
 * Everything one touch or one step set off, as one list of notes: each cue's notes, in order, with the next
 * take of that kind of cue. `takes` counts how often each kind of cue has sounded.
 */
export function notesFor(cues: readonly Cue[], takes: Map<string, number>): Sound[] {
  const notes: Sound[] = []
  for (const cue of cues) {
    const take = takes.get(cue.type) ?? 0
    takes.set(cue.type, take + 1)
    for (const note of notesOf(cue, take)) if (notes.length < MOST_NOTES) notes.push(note)
  }
  return notes
}
