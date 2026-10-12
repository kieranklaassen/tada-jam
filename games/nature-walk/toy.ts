import type { Cue } from './cells'
import { TUCKS, type P, type Tuck } from './layout'
import { COVERS } from './motion'
import { makeRng, type Rng } from './rng'
import type { ToadAt, Where, World } from './save'
import type { Scene } from './scene'
import { partsOf, type SoundId } from './voices'
import { PLACES, THINGS, UNDER, isCarried, placeOf, type FindId, type PlaceId, type Season, type ThingId } from './wood'

// The model: the wood and the room at the table, answering one finger. It
// holds everything that moves, on one clock of its own (`time`, in seconds of
// attended play), and nothing here draws or makes a sound.
//
// One clock for sight and sound. Every motion is an `Act` that started at a
// moment of this clock, and a sound is a cue of an act: each part of it is put
// in the queue when the clock reaches that moment of the motion, never by a
// timer of its own, never by a delay inside a voice, and never without the
// motion. The view reads the same acts to draw, so what is heard is what is
// seen, in the same frame.
//
// What is saved and what is seen are two things. `things`, `toadAt`, `season`
// and the rest hold where everything is the moment a touch is answered; an
// act shows it getting there. Take every act away and the picture is the
// save: that is what a touch does to a scene, and what a put-away does to
// everything.

export type Mover = `cover:${PlaceId}` | `find:${PlaceId}` | `thing:${ThingId}` | 'hedgehog' | 'jay' | 'toad' | 'wheel' | 'nest' | 'knock' | 'view' | 'slab' | 'water'

/** One part of a sound, due at a moment of the act it belongs to. */
export type Due = { after: number; id: SoundId; part: number; pitch: number }

/**
 * One motion of one mover: what it is, when it began on the model's clock, how long it runs, and the sounds along
 * it. `from` and `to` are where it starts and ends when it goes somewhere, `n` is one number of its own, and
 * `room` says which of the two frames it is seen in.
 */
export type Act = { kind: string; since: number; length: number; cues: Due[]; fired: number; scene: boolean; from: P; to: P; n: number; room: boolean }

/** A sound the model asks for: which part of which sound, when on the model's clock, whose motion it is, and whether that motion is a scene's. */
export type SoundEvent = { id: SoundId; part: number; at: number; mover: Mover; pitch: number; scene: boolean }

export type Cover = {
  open: boolean
  /** How far open it was when it last set off, from 0 to 1. */
  from: number
  /** The season of what lies under it. It changes only while the cover hides it. */
  shows: Season
  /** What was found has come up since the cover last opened. */
  greeted: boolean
}

/** A thing in the hand: where it is, and whether the finger is on it or has let it go a moment ago. */
export type Hand = {
  thing: ThingId
  /** Where the thing is, in the frame that is on screen. */
  at: P
  /** From the finger to the middle of the thing. */
  grab: P
  /** When the finger landed on it, on the model's clock. */
  since: number
  /** The finger is down on it. */
  down: boolean
  /** When the finger let it go, on the model's clock. */
  letGoAt: number
  /** It has been carried, not only touched. */
  carried: boolean
}

export type IdleVariant = { name: string; length: number }
export type Animal = 'hedgehog' | 'jay' | 'toad'

/** Each animal's own tempo: how often it does a small thing of its own, and which things. No two share one. */
export const IDLE: Readonly<Record<Animal, { gap: readonly [number, number]; variants: readonly IdleVariant[] }>> = {
  hedgehog: { gap: [1.6, 3.2], variants: [{ name: 'nose-twitch', length: 0.5 }, { name: 'ear-flick', length: 0.35 }, { name: 'scratch', length: 0.9 }] },
  jay: { gap: [2.2, 4.4], variants: [{ name: 'head-tilt', length: 0.7 }, { name: 'tail-flick', length: 0.3 }, { name: 'preen', length: 1.1 }] },
  toad: { gap: [3.8, 7], variants: [{ name: 'throat-pulse', length: 1.4 }, { name: 'slow-wink', length: 1.2 }, { name: 'shift', length: 1.6 }] },
}

/** The turn of the year: how long the wheel takes over its quarter, its three clacks, and the whole scene with the wave of pieces that flip. */
export const TURN = { length: 4, clacks: [0, 0.6, 1.2], stop: 1.8, wave: 2.4, flip: 0.7 } as const

/** How long a thing let go hangs where it was let go before it is set down, on the model's clock. */
export const HANG = 0.3

export const NEVER = Number.NEGATIVE_INFINITY

export type Toy = {
  /** The model's clock: seconds of attended play since this visit began. */
  time: number
  seed: number
  season: Season
  /** The season the wheel last turned from, for the wave of pieces that flip over. */
  turnedFrom: Season
  covers: Record<PlaceId, Cover>
  rolled: boolean
  things: Record<ThingId, Where>
  wet: ThingId[]
  bitten: boolean
  toadAt: ToadAt
  /** The room at the table is on screen: the save's `finished`. */
  room: boolean
  acts: Partial<Record<Mover, Act>>
  /** Each animal's small thing of its own, when it has no act: which, since when, and when the next is due. */
  idle: Record<Animal, { variant: number; since: number; next: number }>
  /** The shut cover that stirs now, as if something moved under it, and when the next stirs. */
  stir: { place: PlaceId | null; since: number; next: number }
  hand: Hand | null
  /** The last thing that happened, which the animals turn to look at. */
  look: { at: P; since: number; room: boolean }
  /** The last knock: where, when, and the hanging piece near enough to swing from it (-1 when none is). */
  knock: { at: P; since: number; hanger: number }
  /** What does not outlast a put-away: the snail on the ball, the feather on a spine. Each lies where the save has it on load. */
  perch: { snail: boolean; feather: boolean }
  /** When the hole the snail eats in the apple first shows: with the first rasp. Long past once it is saved. */
  biteAt: number
  /** On this visit a thing has been carried, and the room has been seen: what the idle ladder shows the door by. */
  carried: boolean
  roomSeen: boolean
  /** The things sent in through the door on this walk, which rock once when the child comes home. */
  arrivals: ThingId[]
  /** The snail's silver trail: from, to, and when it was laid. */
  trail: { from: P; to: P; since: number } | null
  /** The scene that is playing, and which. */
  scene: Scene | null
  sceneKind: string
  sounds: SoundEvent[]
  /** Sound to be stopped now: a scene's, when a touch ends it, or all of it, at a put-away. */
  cut: { scene: boolean; all: boolean }
  /** Something a save holds has changed since `savedOf` was last taken. */
  dirty: boolean
  rng: Rng
}

export type ToySave = World & { finished: boolean }

const between = (rng: Rng, [low, high]: readonly [number, number]): number => low + rng.next() * (high - low)

/**
 * The model as a save has it: every cover, thing and animal where it was left, nothing easing in, nothing
 * replayed, nothing sounding and no timer already due. `now` is where the clock stands.
 */
export function createToy(saved: ToySave, seed: number, now = 0): Toy {
  const covers = {} as Record<PlaceId, Cover>
  for (const place of PLACES) {
    const open = saved.open.includes(place)
    covers[place] = { open, from: open ? 1 : 0, shows: saved.season, greeted: true }
  }
  const things = {} as Record<ThingId, Where>
  for (const thing of THINGS) things[thing] = { ...saved.things[thing] }
  const rng = makeRng(seed)
  const idle = (who: Animal) => ({ variant: -1, since: NEVER, next: now + between(rng, IDLE[who].gap) })
  return {
    time: now, seed, season: saved.season, turnedFrom: saved.season, covers, rolled: saved.rolled,
    things, wet: [...saved.wet], bitten: saved.bitten, toadAt: { ...saved.toad }, room: saved.finished,
    acts: {}, idle: { hedgehog: idle('hedgehog'), jay: idle('jay'), toad: idle('toad') },
    stir: { place: null, since: NEVER, next: now + 2 + rng.next() * 2 },
    hand: null, look: { at: { x: 590, y: 500 }, since: NEVER, room: saved.finished }, knock: { at: { x: 0, y: 0 }, since: NEVER, hanger: -1 },
    perch: { snail: false, feather: false }, biteAt: NEVER, carried: false, roomSeen: saved.finished, arrivals: [], trail: null, scene: null, sceneKind: '',
    sounds: [], cut: { scene: false, all: false }, dirty: false, rng,
  }
}

export function savedOf(toy: Toy): ToySave {
  const things = {} as Record<ThingId, Where>
  for (const thing of THINGS) things[thing] = { ...toy.things[thing] }
  return { season: toy.season, open: PLACES.filter((place) => toy.covers[place].open), rolled: toy.rolled, things, wet: THINGS.filter((thing) => toy.wet.includes(thing)), bitten: toy.bitten, toad: { ...toy.toadAt }, finished: toy.room }
}

export const gap = between

// --- Acts and their sounds ----------------------------------------------------------

const ORIGIN: P = { x: 0, y: 0 }

/** The parts of the sounds of an act, each at its own moment of the motion, in order. */
export function dueOf(cues: readonly Cue[]): Due[] {
  const due: Due[] = []
  for (const cue of cues) for (const [part, { at }] of partsOf(cue.sound).entries()) due.push({ after: cue.after + at, id: cue.sound, part, pitch: cue.pitch ?? 1 })
  return due.sort((a, b) => a.after - b.after)
}

export type Starting = { cues?: readonly Cue[]; scene?: boolean; from?: P; to?: P; n?: number; room?: boolean }

/** Starts a motion of a mover now, in place of whatever it was doing, and plays the parts of its sounds that are due at its start. */
export function begin(toy: Toy, mover: Mover, kind: string, length: number, more: Starting = {}): Act {
  const act: Act = { kind, since: toy.time, length, cues: dueOf(more.cues ?? []), fired: 0, scene: more.scene ?? false, from: more.from ?? ORIGIN, to: more.to ?? more.from ?? ORIGIN, n: more.n ?? 0, room: more.room ?? toy.room }
  toy.acts[mover] = act
  fire(toy, mover, act)
  return act
}

export function fire(toy: Toy, mover: Mover, act: Act): void {
  // `at` is the moment of the motion the part belongs to; it is asked for in the frame that moment falls in.
  while (act.fired < act.cues.length && toy.time + 1e-9 >= act.since + act.cues[act.fired].after) {
    const due = act.cues[act.fired++]
    toy.sounds.push({ id: due.id, part: due.part, at: act.since + due.after, mover, pitch: due.pitch, scene: act.scene })
  }
}

/** Takes a mover's motion away: it is where the model has it, and the rest of its sound is never asked for. */
export function drop(toy: Toy, mover: Mover): void {
  delete toy.acts[mover]
}

/** Whether a mover is in a motion at this moment of the model's clock. */
export function moving(toy: Toy, mover: Mover): boolean {
  const act = toy.acts[mover]
  return act !== undefined && toy.time < act.since + act.length
}

/** The act a mover is in, if it is of that kind (or starts with it, for a family of kinds) and still running. */
export function acting(toy: Toy, mover: Mover, kind?: string): Act | null {
  const act = toy.acts[mover]
  if (!act || toy.time >= act.since + act.length) return null
  if (kind !== undefined && act.kind !== kind && !(kind.endsWith(':') && act.kind.startsWith(kind))) return null
  return act
}

/** How far through its act a mover is, from 0 to 1, or null when it has none of that kind running. */
export function progress(toy: Toy, mover: Mover, kind?: string): number | null {
  const act = acting(toy, mover, kind)
  if (!act) return null
  return act.length > 0 ? (toy.time - act.since) / act.length : 1
}

/** The seconds a mover has been in its act of that kind, or null. */
export function seconds(toy: Toy, mover: Mover, kind?: string): number | null {
  const act = acting(toy, mover, kind)
  return act ? toy.time - act.since : null
}

/** Takes the sounds that are due. Whoever plays them plays each in the frame it is handed over. */
export function drain(toy: Toy): SoundEvent[] {
  if (toy.sounds.length === 0) return []
  const due = toy.sounds
  toy.sounds = []
  return due
}

// --- The covers and what is under them -----------------------------------------------

/** How far open a cover is: 0 shut, 1 open, and a little past either while it springs. */
export function amount(toy: Toy, place: PlaceId): number {
  const cover = toy.covers[place], act = toy.acts[`cover:${place}`], target = cover.open ? 1 : 0
  if (!act || (act.kind !== 'open' && act.kind !== 'shut')) return target
  const motion = COVERS[place], travel = act.kind === 'open' ? motion.open : motion.shut
  const u = (toy.time - act.since) / travel
  return u >= 1 ? target : cover.from + (target - cover.from) * motion.curve(u, cover.open)
}

/** Seconds since a cover arrived where it was going; large once it has long been there. */
export function landed(toy: Toy, place: PlaceId): number {
  const act = toy.acts[`cover:${place}`]
  if (!act || (act.kind !== 'open' && act.kind !== 'shut')) return 99
  const travel = act.kind === 'open' ? COVERS[place].open : COVERS[place].shut
  return toy.time >= act.since + travel ? toy.time - act.since - travel : 99
}

/** Whether what is under a cover can be seen and touched. */
export function inTheOpen(toy: Toy, place: PlaceId): boolean {
  return toy.covers[place].open && amount(toy, place) > 0.6
}

/** What the season puts under a cover. */
export function findAt(toy: Toy, place: PlaceId): FindId {
  return UNDER[place][toy.covers[place].shows]
}

/** Who is under a cover now: what the season puts there, or the woodlouse that moved in when that was carried off. */
export function dwellerAt(toy: Toy, place: PlaceId): FindId | 'woodlouse' {
  const find = findAt(toy, place)
  return isCarried(find) && toy.things[find].at !== 'home' ? 'woodlouse' : find
}

/** The place a thing is under, when it is at home and has a place in the season its cover shows. */
export function homeOf(toy: Toy, thing: ThingId): PlaceId | null {
  if (toy.things[thing].at !== 'home') return null
  for (const place of PLACES) if (findAt(toy, place) === thing) return place
  return null
}

/** Where the worm lies in this season when it is at home, which is where the hedgehog's nose points through the cover. */
export function wormPlace(toy: Toy): PlaceId {
  return placeOf('worm', toy.season) ?? 'stone'
}

export function lookAt(toy: Toy, at: P): void {
  toy.look = { at: { x: at.x, y: at.y }, since: toy.time, room: toy.room }
}

// --- Where the worm tucks its head in -------------------------------------------------

/** The cover the worm on the path makes for: the stone while it is shut, then the long grass while that is shut, and with both open the blades at the front. */
export function tuckFor(toy: Toy): Tuck {
  return !toy.covers.stone.open ? 'stone' : !toy.covers.grass.open ? 'grass' : 'front'
}

/** Which tuck a point of the ground is, if it is one where the worm's head is under something now: the stone and the long grass only while they are shut. */
export function tuckAt(toy: Toy, at: P): Tuck | null {
  for (const tuck of Object.keys(TUCKS) as Tuck[]) {
    if (Math.hypot(TUCKS[tuck].x - at.x, TUCKS[tuck].y - at.y) >= 0.5) continue
    return tuck !== 'front' && toy.covers[tuck].open ? null : tuck
  }
  return null
}

export function isWet(toy: Toy, thing: ThingId): boolean {
  return toy.wet.includes(thing)
}

export function setWet(toy: Toy, thing: ThingId, wet: boolean): void {
  if (wet === toy.wet.includes(thing)) return
  toy.wet = wet ? [...toy.wet, thing] : toy.wet.filter((other) => other !== thing)
  toy.dirty = true
}

/** The share of an animal's idle variant that has played, with its name, or null between two. */
export function idleOf(toy: Toy, who: Animal): { name: string; u: number } | null {
  const idle = toy.idle[who]
  if (idle.variant < 0 || moving(toy, who)) return null
  const variant = IDLE[who].variants[idle.variant], u = (toy.time - idle.since) / variant.length
  return u >= 0 && u < 1 ? { name: variant.name, u } : null
}

/** How strongly the shut cover that stirs is stirring, from 0 to 1. */
export function stirOf(toy: Toy, place: PlaceId): number {
  if (toy.stir.place !== place || toy.covers[place].open) return 0
  const u = (toy.time - toy.stir.since) / 0.5
  return u >= 0 && u < 1 ? Math.sin(u * Math.PI) * Math.abs(Math.cos(u * Math.PI * 3)) : 0
}
