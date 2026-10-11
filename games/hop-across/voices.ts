import type { Note } from './audio'
import type { Bystander } from './bystanders'
import type { BoardEvent, Flattener, Landing, MoverKind, SpotReason } from './board'
import { HOP_SECONDS, LEAP_LONGER, LEAP_UNDER, PEEL_AFTER, ROLL_SECONDS, TRAIN_AFTER, TRAIN_SECONDS, UNDER_SECONDS, WORLD_AT, hopDelay } from './motion'

// Every sound of the game as plain numbers, and the one voice a hop sets off, put together from what the step did.
// Nobody has heard these: they are written from the design sheet's words, kept short, and the test holds every
// pitch, peak and length in range.

const tone = (frequency: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'tone', frequency, peak, attack, decay, ...more })
const hiss = (frequency: number, q: number, peak: number, attack: number, decay: number, more: Partial<Note> = {}): Note => ({ kind: 'noise', frequency, q, peak, attack, decay, ...more })
export const late = (notes: readonly Note[], by: number): Note[] => (by > 0 ? notes.map((note) => ({ ...note, delay: (note.delay ?? 0) + by })) : [...notes])

/** How much higher each of the family sounds than the rabbit: she is the lowest, the first small one squeaks highest. */
export const PITCH = [1, 2, 1.68, 1.5] as const
const LOUD = [1, 0.55, 0.55, 0.55] as const

/**
 * What a pawn sounds like landing on each thing: a thump and a rustle on grass, a wooden clack on the road, a
 * muffled flump on cloth, a hollow knock on a log, a tonk on the lorry's bed, a boing on a car's roof with its
 * honk, a tock on a turtle's shell, and a ting on the rails. The small ones land lighter: a tink on the bed, a
 * patter on the log.
 */
export function landingNotes(landing: Landing, who: number): Note[] {
  const p = PITCH[who], l = LOUD[who]
  switch (landing) {
    case 'bank':
    case 'grass':
      return [tone(150 * p, 0.3 * l, 0.004, 0.11, { glideTo: 90 * p }), hiss(2600, 0.8, 0.07 * l, 0.01, 0.12)]
    case 'road':
      return [tone(620 * p, 0.22 * l, 0.002, 0.05, { wave: 'triangle', glideTo: 480 * p }), hiss(1900, 3, 0.1 * l, 0.002, 0.04)]
    case 'cloth':
      return [tone(120 * p, 0.26 * l, 0.012, 0.16, { glideTo: 80 * p }), hiss(700, 0.6, 0.06 * l, 0.02, 0.14)]
    case 'log':
      if (who > 0) return [tone(392 * p, 0.14, 0.002, 0.06, { wave: 'triangle' }), tone(330 * p, 0.1, 0.002, 0.05, { wave: 'triangle', delay: 0.05 })]
      return [tone(196, 0.3, 0.003, 0.2, { wave: 'triangle', glideTo: 170 }), tone(392, 0.08, 0.003, 0.09), hiss(900, 1, 0.05, 0.03, 0.2, { delay: 0.05 })]
    case 'bed':
      if (who > 0) return [tone(1240 * p * 0.5, 0.13, 0.002, 0.12, { wave: 'triangle' })]
      return [tone(310, 0.24, 0.002, 0.16, { wave: 'square', glideTo: 290 }), tone(930, 0.05, 0.002, 0.2)]
    case 'roof':
      return [tone(240 * p, 0.26 * l, 0.004, 0.24, { glideTo: 520 * p }), tone(415, 0.14, 0.01, 0.14, { wave: 'square', delay: 0.09 }), tone(523, 0.14, 0.01, 0.14, { wave: 'square', delay: 0.09 })]
    case 'shell':
      return [tone(520 * p, 0.24 * l + 0.04, 0.002, 0.07, { wave: 'triangle', glideTo: 430 * p }), tone(1040 * p, 0.05, 0.002, 0.04)]
    case 'rails':
      return [tone(1480 * (1 + (who % 2) * 0.12), 0.12 * l + 0.03, 0.002, 0.42), tone(2217, 0.04, 0.002, 0.3), hiss(1800, 3, 0.06 * l, 0.002, 0.04)]
  }
}

/** A hop that came down where it went up. */
export function spotNotes(why: SpotReason, who: number): Note[] {
  const p = PITCH[who], l = LOUD[who]
  switch (why) {
    // A double thud.
    case 'self':
      return [tone(140 * p, 0.28 * l, 0.004, 0.09, { glideTo: 95 * p }), tone(120 * p, 0.2 * l, 0.004, 0.08, { glideTo: 85 * p, delay: 0.07 })]
    // A thunk on the board's rim.
    case 'rim':
      return [tone(110 * p, 0.3 * l, 0.003, 0.12, { wave: 'triangle' }), hiss(500, 2, 0.1 * l, 0.003, 0.06)]
    // Off the old rabbit's tummy, and its chuckle.
    case 'seat':
      return [tone(180, 0.28, 0.006, 0.26, { glideTo: 420 }), tone(210, 0.12, 0.02, 0.07, { wave: 'triangle', delay: 0.3 }), tone(190, 0.12, 0.02, 0.07, { wave: 'triangle', delay: 0.42 }), tone(170, 0.12, 0.02, 0.09, { wave: 'triangle', delay: 0.54 })]
    // Against the burrow: a thunk as at the rim, duller, with a little earth.
    case 'burrow':
      return [tone(96 * p, 0.3 * l, 0.003, 0.14, { wave: 'triangle' }), hiss(320, 1.2, 0.1 * l, 0.004, 0.1)]
    // A small one that hops on the spot behind the line.
    case 'wait':
      return [tone(170 * p, 0.12 * l, 0.004, 0.07, { glideTo: 120 * p })]
    // A small one at the water's edge: a peep.
    case 'dither':
      return [tone(1250 * p, 0.09, 0.01, 0.07, { glideTo: 1500 * p }), tone(170 * p, 0.1 * l, 0.004, 0.07, { delay: 0.02 })]
    // Down on the cab of a lorry whose bed is taken, and back off it: the tonk of the lorry, and a squeal as it slides.
    case 'cab':
      return [...landingNotes('bed', who), ...late(squealNotes(who), 0.03)]
  }
}

/** Each small one's own squeak as it hops: the eager one a quick high chirp, the dozy one a low yawn, the wobbly one a wavering two. */
export function squeakNotes(who: number): Note[] {
  if (who === 1) return [tone(1760, 0.07, 0.006, 0.05, { glideTo: 2200 })]
  if (who === 2) return [tone(880, 0.06, 0.03, 0.16, { glideTo: 620 })]
  if (who === 3) return [tone(1320, 0.06, 0.008, 0.05, { glideTo: 1500 }), tone(1180, 0.06, 0.008, 0.06, { glideTo: 1050, delay: 0.07 })]
  return []
}

/** A small one ducks as she leapfrogs it: a startled squeak that falls as it goes down. */
export function duckNotes(who: number): Note[] {
  const p = PITCH[who]
  return [tone(1100 * p, 0.09, 0.004, 0.12, { glideTo: 520 * p }), tone(1400 * p, 0.05, 0.004, 0.04, { delay: 0.13 })]
}

/** Down on the lorry's cab and back onto its bed: a squeal that slides down, in its own pitch. */
export function squealNotes(who: number): Note[] {
  const p = PITCH[who]
  return [tone(1500 * p * 0.8, 0.1, 0.01, 0.2, { glideTo: 760 * p * 0.8 }), hiss(2600, 3, 0.05, 0.01, 0.14, { glideTo: 1500 })]
}

/** One step of a mover: a creak of springs, a low rumble with a rattle and a puff, a lap of water. */
export function rollNotes(kind: MoverKind): Note[] {
  if (kind === 'car') return [hiss(320, 1.2, 0.07, 0.03, 0.14, { glideTo: 420 }), tone(760, 0.035, 0.02, 0.07, { wave: 'triangle', glideTo: 700, delay: 0.17 })]
  if (kind === 'lorry') return [hiss(110, 1, 0.14, 0.05, 0.26), tone(58, 0.16, 0.04, 0.26, { wave: 'sawtooth' }), hiss(2400, 4, 0.04, 0.004, 0.03, { delay: 0.2 }), hiss(2100, 4, 0.04, 0.004, 0.03, { delay: 0.27 }), hiss(600, 0.7, 0.05, 0.02, 0.1, { delay: 0.34 })]
  if (kind === 'log') return [hiss(520, 0.9, 0.06, 0.1, 0.28, { glideTo: 760 }), tone(330, 0.03, 0.03, 0.1, { glideTo: 440, delay: 0.2 })]
  return []
}

/** A turtle's count, heard: a slurp as the shell goes awash, a ring of bubbles that blub as it goes down, a pop as it comes up. Under a log it only gulps. */
export function turtleNotes(count: number, under: boolean): Note[] {
  if (under) return [tone(150, 0.14, 0.01, 0.09, { glideTo: 90 }), hiss(300, 2, 0.05, 0.01, 0.08)]
  if (count === 1) return [hiss(700, 4, 0.08, 0.06, 0.16, { glideTo: 1900 })]
  if (count === 2) return [tone(210, 0.1, 0.01, 0.06, { glideTo: 320 }), tone(260, 0.09, 0.01, 0.06, { glideTo: 390, delay: 0.09 }), tone(320, 0.08, 0.01, 0.06, { glideTo: 470, delay: 0.17 })]
  return [tone(480, 0.13, 0.004, 0.07, { glideTo: 960 })]
}

/** The lorry catches a car up: a clonk, and the driver in front toots twice. */
export const SHUNT: readonly Note[] = [
  tone(170, 0.28, 0.002, 0.1, { wave: 'square', glideTo: 120 }),
  hiss(1300, 2.5, 0.12, 0.002, 0.05),
  tone(466, 0.14, 0.01, 0.08, { wave: 'square', delay: 0.16 }),
  tone(466, 0.14, 0.01, 0.1, { wave: 'square', delay: 0.3 }),
]

/** A log rides up over a turtle's shell: a long wooden scrape, and a slap as it drops level on the water. */
export const OVER: readonly Note[] = [
  hiss(420, 5, 0.12, 0.05, 0.3, { glideTo: 900 }),
  tone(96, 0.1, 0.05, 0.28, { wave: 'sawtooth', glideTo: 130 }),
  hiss(2200, 0.7, 0.16, 0.003, 0.09, { delay: 0.42 }),
  tone(140, 0.14, 0.003, 0.08, { delay: 0.42 }),
]

/** A log scoops her off a turtle: a thump, and the turtle's stream of bubbles underneath. */
export function scoopNotes(who: number): Note[] {
  const p = PITCH[who]
  return [tone(180 * p, 0.2 * LOUD[who] + 0.04, 0.003, 0.12, { wave: 'triangle', glideTo: 130 * p }), tone(540, 0.05, 0.006, 0.04, { glideTo: 700, delay: 0.1 }), tone(620, 0.05, 0.006, 0.04, { glideTo: 800, delay: 0.17 }), tone(700, 0.04, 0.006, 0.04, { glideTo: 900, delay: 0.24 })]
}

/** Rolled over: a splat, long and rumbling under a lorry for the rabbit and the small ones alike; pressed into the sleepers by the train; a tiny squeak for a small one. */
export function flattenNotes(kind: Flattener, who: number): Note[] {
  const p = PITCH[who]
  // Under a lorry whatever it is goes flat with the long rumbling squelch, a small one's higher and lighter and after its squeak.
  if (kind === 'lorry' && who > 0) return [tone(1500 * p * 0.5, 0.1, 0.004, 0.09, { glideTo: 500 }), hiss(240 * Math.sqrt(p), 0.7, 0.16, 0.006, 0.34, { glideTo: 120 * Math.sqrt(p) }), tone(170 * Math.sqrt(p), 0.12, 0.006, 0.3, { glideTo: 60 * Math.sqrt(p) }), hiss(1400, 1.2, 0.06, 0.01, 0.2, { delay: 0.05 })]
  if (who > 0) return [tone(1500 * p * 0.5, 0.1, 0.004, 0.09, { glideTo: 500 }), hiss(900, 1, 0.1, 0.004, 0.08)]
  if (kind === 'lorry') return [hiss(240, 0.7, 0.26, 0.006, 0.34, { glideTo: 120 }), tone(170, 0.2, 0.006, 0.3, { glideTo: 60 }), hiss(1400, 1.2, 0.08, 0.01, 0.2, { delay: 0.05 })]
  if (kind === 'train') return [tone(98, 0.24, 0.004, 0.2, { wave: 'square', glideTo: 60 }), hiss(700, 1.5, 0.2, 0.004, 0.12), tone(784, 0.06, 0.004, 0.2, { delay: 0.05 })]
  return [hiss(480, 0.8, 0.26, 0.004, 0.16, { glideTo: 200 }), tone(260, 0.22, 0.004, 0.16, { glideTo: 80 })]
}

/** Peeling up by one ear: a long slurp, and a boing as it springs round. Off the sleepers it is a twang. Each small one peels as itself: a quick zip, a long yawn, a wavering one. */
export function peelNotes(who: number, sleepers = false): Note[] {
  const p = PITCH[who], l = LOUD[who]
  if (sleepers) return [tone(220 * p, 0.22 * l + 0.04, 0.003, 0.34, { wave: 'sawtooth', glideTo: 330 * p }), tone(440 * p, 0.08, 0.003, 0.3, { wave: 'triangle', glideTo: 660 * p }), tone(110 * p, 0.1, 0.003, 0.2)]
  if (who === 1) return [hiss(900, 5, 0.07, 0.03, 0.05, { glideTo: 3000 }), tone(700, 0.12, 0.004, 0.12, { glideTo: 1800, delay: 0.06 })]
  if (who === 2) return [hiss(400, 5, 0.06, 0.15, 0.3, { glideTo: 1200 }), tone(520, 0.08, 0.08, 0.4, { glideTo: 300, delay: 0.25 })]
  if (who === 3) return [hiss(500, 5, 0.06, 0.1, 0.1, { glideTo: 2000 }), tone(500, 0.1, 0.006, 0.1, { glideTo: 900, delay: 0.18 }), tone(820, 0.08, 0.006, 0.1, { glideTo: 600, delay: 0.3 })]
  return [hiss(500, 5, 0.12, 0.12, 0.1, { glideTo: 2400 }), tone(200, 0.24, 0.006, 0.26, { glideTo: 560, delay: 0.2 }), tone(400, 0.07, 0.006, 0.2, { glideTo: 1100, delay: 0.2 })]
}

/** Flat and tapped: a wriggle under the wheels with a squeak. */
export function stuckNotes(who: number): Note[] {
  const p = PITCH[who], l = LOUD[who]
  return [tone(110 * p, 0.12 * l, 0.02, 0.1, { wave: 'triangle', glideTo: 150 * p }), tone(120 * p, 0.1 * l, 0.02, 0.1, { wave: 'triangle', glideTo: 95 * p, delay: 0.11 }), tone(1400 * p * 0.6, 0.06, 0.01, 0.07, { glideTo: 1900 * p * 0.6, delay: 0.05 })]
}

/** Into the water: a splash with its plume. */
export function splashNotes(who: number): Note[] {
  const l = LOUD[who]
  return [hiss(1500, 0.6, 0.3 * l, 0.004, 0.3, { glideTo: 500 }), hiss(4200, 1, 0.1 * l, 0.02, 0.36), tone(190, 0.16 * l, 0.004, 0.14, { glideTo: 70 })]
}

/** Down with a turtle: a glug. */
export function glugNotes(who: number): Note[] {
  return [tone(240 * PITCH[who] * 0.7, 0.2, 0.01, 0.16, { glideTo: 90 }), hiss(500, 1.5, 0.08 * LOUD[who] + 0.03, 0.02, 0.2, { glideTo: 250 })]
}

/** Off the end of the board on a log: a falling whistle, and a plop. */
export function edgeNotes(who: number): Note[] {
  const p = PITCH[who]
  return [tone(1500 * p * 0.7, 0.1, 0.02, 0.26, { glideTo: 420 * p * 0.7 }), tone(300, 0.16, 0.004, 0.08, { glideTo: 110, delay: 0.3 }), hiss(1200, 1, 0.1, 0.004, 0.12, { delay: 0.3 })]
}

/** The fish's spit and the wet landing: ptoo, squelch. A small one gets a higher ptoo. */
export function spitNotes(who: number): Note[] {
  const p = PITCH[who], l = LOUD[who]
  return [
    hiss(900 * p, 6, 0.22, 0.004, 0.05),
    tone(340 * p, 0.2, 0.004, 0.2, { glideTo: 980 * p, delay: 0.02 }),
    hiss(650, 0.9, 0.16 * l, 0.01, 0.14, { glideTo: 300, delay: 0.42 }),
    tone(130 * p, 0.18 * l, 0.004, 0.1, { glideTo: 85 * p, delay: 0.42 }),
  ]
}

/** The car rolls out from under her and she sits down on the road: a bump. */
export function slideOffNotes(who: number): Note[] {
  return [hiss(1200, 2, 0.06 * LOUD[who], 0.03, 0.08, { glideTo: 500 }), tone(105 * PITCH[who], 0.26 * LOUD[who], 0.004, 0.13, { delay: 0.1 })]
}

/** The tunnel arch knocks her off the lorry: a clunk, and she sits down. */
export function knockNotes(who: number): Note[] {
  return [tone(230, 0.26, 0.002, 0.12, { wave: 'square', glideTo: 170 }), hiss(1500, 3, 0.1, 0.002, 0.05), tone(110 * PITCH[who], 0.2 * LOUD[who], 0.004, 0.12, { delay: 0.16 })]
}

/** The bell plate, stepped on: a ding, a note higher for each one down the line who lands on it. */
export function bellNotes(nth: number): Note[] {
  const f = 1047 * Math.pow(2, (Math.min(4, Math.max(1, nth)) - 1) * (2 / 12))
  return [tone(f, 0.24, 0.002, 0.5), tone(f * 2.76, 0.07, 0.002, 0.3), tone(f * 0.5, 0.05, 0.002, 0.2)]
}

/** The train wakes: a snort of steam and a peep. */
export const WAKE: readonly Note[] = [hiss(900, 0.8, 0.14, 0.01, 0.18, { glideTo: 2400 }), tone(1175, 0.14, 0.01, 0.1, { wave: 'square', delay: 0.2 }), tone(1397, 0.14, 0.01, 0.14, { wave: 'square', delay: 0.32 })]
/** The train asleep: one snore, and the bubble at its funnel pops. */
export const SNORE: readonly Note[] = [hiss(160, 3, 0.05, 0.12, 0.2, { glideTo: 110 }), tone(900, 0.03, 0.003, 0.03, { glideTo: 1500, delay: 0.42 })]
/** The train takes the lane: a roar, a clatter over the sleepers, and the wind after it. */
export const TRAIN: readonly Note[] = [
  hiss(180, 0.7, 0.3, 0.03, 0.4),
  tone(73, 0.24, 0.03, 0.4, { wave: 'sawtooth', glideTo: 98 }),
  hiss(2000, 5, 0.08, 0.002, 0.03, { delay: 0.06 }),
  hiss(2000, 5, 0.08, 0.002, 0.03, { delay: 0.14 }),
  hiss(2000, 5, 0.08, 0.002, 0.03, { delay: 0.22 }),
  hiss(2000, 5, 0.08, 0.002, 0.03, { delay: 0.3 }),
  hiss(3200, 0.6, 0.1, 0.1, 0.4, { glideTo: 900, delay: 0.3 }),
]
/** The train shoves what is in its lane out of it: a clang, and a run of clacks. */
export const SHOVE: readonly Note[] = [
  tone(392, 0.2, 0.002, 0.3, { wave: 'square', glideTo: 370 }),
  tone(1108, 0.08, 0.002, 0.3),
  hiss(1500, 4, 0.1, 0.002, 0.03, { delay: 0.1 }),
  hiss(1700, 4, 0.1, 0.002, 0.03, { delay: 0.17 }),
  hiss(1900, 4, 0.1, 0.002, 0.03, { delay: 0.24 }),
]
/** The train goes back to sleep: a yawn. */
export const YAWN: readonly Note[] = [tone(330, 0.07, 0.12, 0.4, { glideTo: 150 })]
/** The fish noses a log from below: a thud. */
export const NOSE: readonly Note[] = [tone(88, 0.26, 0.004, 0.14, { glideTo: 60 }), hiss(400, 1.5, 0.06, 0.02, 0.14)]
/** The fish's shadow comes nearer and one bubble rises: blip. */
export const BLIP: readonly Note[] = [tone(620, 0.1, 0.006, 0.07, { glideTo: 1400 })]

/** Which of the family the step found striped by the sleepers, so that its peel is a twang. */
export type Marks = { sleepers: readonly boolean[] }
const NO_MARKS: Marks = { sleepers: [] }

/**
 * Everything one hop set off, as the notes of one voice, each sound at the moment the view shows it: the rabbit's
 * landing first, the small ones a ripple behind her, the world's step as she lands, and what that step did after it.
 * A lane's movers roll together, so each kind of step is heard once however many take it.
 */
export function voiceFor(events: readonly BoardEvent[], marks: Marks = NO_MARKS): Note[] {
  const notes: Note[] = []
  const once = new Set<string>()
  const first = (key: string): boolean => (once.has(key) ? false : (once.add(key), true))
  for (const event of events) {
    switch (event.type) {
      case 'hop':
        // A small one she leapfrogs ducks with a squeak of its own as she comes over, and then scurries.
        if (event.leap && event.who > 0) notes.push(...duckNotes(event.who), ...late(landingNotes(event.landing, event.who), LEAP_UNDER + HOP_SECONDS[event.who]))
        else notes.push(...late(squeakNotes(event.who), hopDelay(event.who)), ...late(landingNotes(event.landing, event.who), hopDelay(event.who) + HOP_SECONDS[event.who] * (event.leap ? LEAP_LONGER : 1)))
        if (event.cab) notes.push(...late(squealNotes(event.who), hopDelay(event.who) + HOP_SECONDS[event.who]))
        break
      case 'spot':
        // A small one squeaks as it goes up, on the spot as in a hop; at the water's edge its peep is that squeak.
        if (event.who > 0 && event.why !== 'dither') notes.push(...late(squeakNotes(event.who), hopDelay(event.who)))
        notes.push(...late(spotNotes(event.why, event.who), hopDelay(event.who) + HOP_SECONDS[event.who] * (event.who === 0 ? 1 : 0.8)))
        break
      case 'stuck':
        notes.push(...late(stuckNotes(event.who), hopDelay(event.who)))
        break
      case 'spit': {
        const hopped = event.by === 'water' && (event.from.c !== event.at.c || event.from.r !== event.at.r)
        const at = hopped ? hopDelay(event.who) + HOP_SECONDS[event.who] : WORLD_AT + ROLL_SECONDS.log * 0.8
        const how = event.by === 'turtle' ? glugNotes(event.who) : event.by === 'edge' ? edgeNotes(event.who) : splashNotes(event.who)
        notes.push(...late(how, event.by === 'edge' ? at - 0.3 : at), ...late(spitNotes(event.who), at + UNDER_SECONDS))
        break
      }
      case 'roll':
        if (first(`roll ${event.kind}`)) notes.push(...late(rollNotes(event.kind), WORLD_AT))
        break
      case 'turtle':
        if (first(`turtle ${event.under ? 'under' : event.count}`)) notes.push(...late(turtleNotes(event.count, event.under), WORLD_AT + 0.04 * event.count))
        break
      case 'shunt':
        if (first('shunt')) notes.push(...late(SHUNT, WORLD_AT + ROLL_SECONDS.lorry * 0.5))
        break
      case 'over':
        if (first('over')) notes.push(...late(OVER, WORLD_AT))
        break
      case 'carry':
        break
      case 'scoop':
        notes.push(...late(scoopNotes(event.who), WORLD_AT + ROLL_SECONDS.log * 0.7))
        break
      case 'slideOff':
        notes.push(...late(slideOffNotes(event.who), WORLD_AT + 0.06))
        break
      case 'knock':
        notes.push(...late(knockNotes(event.who), WORLD_AT + ROLL_SECONDS.lorry * 0.6))
        break
      case 'flatten':
        notes.push(...late(flattenNotes(event.kind, event.who), WORLD_AT + (event.kind === 'train' ? TRAIN_AFTER + TRAIN_SECONDS * 0.5 : ROLL_SECONDS[event.kind] * 0.55)))
        break
      case 'peel':
        notes.push(...late(peelNotes(event.who, marks.sleepers[event.who] === true), WORLD_AT + PEEL_AFTER[event.who]))
        break
      case 'bell':
        notes.push(...late(bellNotes(event.nth), hopDelay(event.who) + HOP_SECONDS[event.who]))
        break
      case 'wake':
        if (first('wake')) notes.push(...late(WAKE, WORLD_AT + 0.12))
        break
      case 'snore':
        if (first('snore')) notes.push(...late(SNORE, WORLD_AT + 0.1))
        break
      case 'train':
        if (first('train')) notes.push(...late(TRAIN, WORLD_AT + TRAIN_AFTER), ...late(YAWN, WORLD_AT + TRAIN_AFTER + TRAIN_SECONDS + 0.2))
        if (event.shoved.length > 0 && first('shove')) notes.push(...late(SHOVE, WORLD_AT + TRAIN_AFTER + 0.05))
        break
      case 'nose':
        notes.push(...late(NOSE, WORLD_AT + 0.1))
        break
      case 'blip':
        notes.push(...late(BLIP, WORLD_AT + 0.16))
        break
      default:
        event satisfies never
    }
  }
  return notes
}

/** The cat at the table's edge, touched: a purr and one thump of its tail. */
export const PURR: readonly Note[] = [
  tone(52, 0.3, 0.08, 0.5, { wave: 'sawtooth' }),
  hiss(160, 3, 0.1, 0.1, 0.5),
  tone(58, 0.24, 0.08, 0.5, { wave: 'sawtooth', delay: 0.5 }),
  hiss(180, 3, 0.09, 0.1, 0.45, { delay: 0.5 }),
  tone(85, 0.2, 0.004, 0.1, { delay: 0.95 }),
]

// --- The bystanders, touched ------------------------------------------------

/** The hamper: its flap is thrown up with a wicker creak, and an apple hops out and drops back with a thump. */
export const HAMPER: readonly Note[] = [hiss(1200, 6, 0.09, 0.03, 0.14, { glideTo: 2200 }), tone(660, 0.08, 0.004, 0.12, { glideTo: 990, delay: 0.1 }), tone(150, 0.2, 0.004, 0.1, { glideTo: 100, delay: 0.52 })]
/** The old rabbit at the picnic, touched: two warm notes, ho ho. */
export const HO_HO: readonly Note[] = [tone(196, 0.2, 0.03, 0.16, { wave: 'triangle', glideTo: 175 }), tone(165, 0.2, 0.03, 0.22, { wave: 'triangle', glideTo: 147, delay: 0.24 })]
/** The old rabbit asleep, touched: a snort, a mumble, and it sleeps on. */
export const SNORT: readonly Note[] = [hiss(260, 2.5, 0.16, 0.01, 0.12, { glideTo: 520 }), tone(120, 0.1, 0.05, 0.2, { wave: 'triangle', glideTo: 100, delay: 0.3 }), tone(110, 0.08, 0.05, 0.24, { wave: 'triangle', glideTo: 90, delay: 0.55 })]
/** Each onlooker's own voice: the teddy a low growl that squeaks, the robot two square beeps, the giraffe a slide up and down, the doll a giggle. */
export function onlookerNotes(what: 'teddy' | 'robot' | 'giraffe' | 'doll'): Note[] {
  if (what === 'teddy') return [tone(92, 0.22, 0.03, 0.3, { wave: 'sawtooth', glideTo: 130 }), tone(700, 0.07, 0.01, 0.1, { glideTo: 900, delay: 0.3 })]
  if (what === 'robot') return [tone(880, 0.12, 0.004, 0.09, { wave: 'square' }), tone(1175, 0.12, 0.004, 0.12, { wave: 'square', delay: 0.18 })]
  if (what === 'giraffe') return [tone(300, 0.14, 0.02, 0.4, { glideTo: 1100 }), tone(1100, 0.1, 0.02, 0.36, { glideTo: 320, delay: 0.42 })]
  return [0, 1, 2, 3].map((n) => tone(1320 + (n % 2) * 240, 0.08, 0.006, 0.06, { delay: n * 0.11 }))
}

// --- The scenes ------------------------------------------------------------

/** The duck: a quack, and the pat of one waddle. */
export const QUACK: readonly Note[] = [tone(520, 0.2, 0.006, 0.09, { wave: 'sawtooth', glideTo: 400 }), hiss(1100, 3, 0.07, 0.006, 0.08)]
export const QUACK_CROSS: readonly Note[] = [...QUACK, ...late(QUACK, 0.16), ...late([tone(560, 0.22, 0.006, 0.16, { wave: 'sawtooth', glideTo: 380 })], 0.34)]
export const PAT: readonly Note[] = [hiss(1500, 2, 0.06, 0.003, 0.03), hiss(1300, 2, 0.06, 0.003, 0.03, { delay: 0.11 }), hiss(1500, 2, 0.06, 0.003, 0.03, { delay: 0.22 })]
/** The duck shaking itself. */
export const SHAKE: readonly Note[] = [hiss(2400, 1, 0.08, 0.02, 0.05), hiss(2800, 1, 0.08, 0.02, 0.05, { delay: 0.08 }), hiss(2400, 1, 0.07, 0.02, 0.05, { delay: 0.16 }), hiss(2800, 1, 0.06, 0.02, 0.05, { delay: 0.24 })]

/** The picnic: the old rabbit's ears shoot up. */
export const EARS_UP: readonly Note[] = [tone(300, 0.2, 0.006, 0.2, { glideTo: 900 }), tone(1200, 0.06, 0.004, 0.2, { delay: 0.16 })]
/** A slice handed over, a little higher for each one down the line. */
export function sliceNotes(nth: number): Note[] {
  const f = 660 * Math.pow(2, (nth * 2) / 12)
  return [tone(f, 0.14, 0.004, 0.14, { wave: 'triangle' }), tone(f * 1.5, 0.06, 0.004, 0.2, { delay: 0.06 })]
}
/** A wet guest is wrapped in the napkin: a flap of cloth. */
export const NAPKIN: readonly Note[] = [hiss(900, 0.7, 0.14, 0.03, 0.12, { glideTo: 2200 }), hiss(600, 0.7, 0.1, 0.03, 0.14, { delay: 0.14 })]
/** A tyre track is laughed at, and dusted off with an ear. */
export const LAUGH: readonly Note[] = [0, 1, 2, 3, 4].map((n) => tone(230 - n * 12, 0.13, 0.02, 0.06, { wave: 'triangle', delay: n * 0.1 }))
export const DUST_OFF: readonly Note[] = [hiss(3000, 1.5, 0.07, 0.02, 0.06), hiss(3400, 1.5, 0.07, 0.02, 0.06, { delay: 0.12 }), hiss(3000, 1.5, 0.06, 0.02, 0.06, { delay: 0.24 })]
/** They eat: a run of crunches, each bite in its eater's own pitch. */
export const CRUNCHES: readonly Note[] = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => hiss(1400 + PITCH[n % 4] * 500, 2.2, 0.1, 0.004, 0.05, { delay: n * 0.13 + (n % 2) * 0.03 }))

/** The tip: the leaf lifts with a creak, the small ones slide down in a squeaking heap, and it drops flat with a slap. */
export const LEAF_UP: readonly Note[] = [tone(140, 0.12, 0.1, 0.4, { wave: 'sawtooth', glideTo: 260 }), hiss(600, 6, 0.06, 0.1, 0.3, { glideTo: 1100 })]
export const HEAP: readonly Note[] = [1, 2, 3, 1, 2, 3].map((who, n) => tone(900 * PITCH[who], 0.07, 0.01, 0.07, { glideTo: 700 * PITCH[who], delay: n * 0.09 }))
export const LEAF_DOWN: readonly Note[] = [hiss(1800, 0.6, 0.26, 0.002, 0.1), tone(120, 0.24, 0.002, 0.14, { glideTo: 70 })]
/** The board slides on: linen over wood. */
export const SLIDE_ON: readonly Note[] = [hiss(900, 0.7, 0.07, 0.15, 0.6, { glideTo: 1500 }), tone(82, 0.06, 0.15, 0.6)]

/** What a touched bystander says: the duck quacks and shakes itself, and each of the others has its own voice above. */
export function bystanderNotes(by: Bystander): Note[] {
  if (by.who === 'duck') return [...QUACK, ...late(SHAKE, 0.3)]
  if (by.who === 'hamper') return [...HAMPER]
  if (by.who === 'old') return [...HO_HO]
  if (by.who === 'sleeper') return [...SNORT]
  return onlookerNotes(by.what)
}
