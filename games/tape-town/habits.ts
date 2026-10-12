import type { Kind } from './layout'
import {
  beep, beepBack, bloop, boo, brrm, buffersRing, chatter, choo, chuff, clack, claws, clonk, ding, doorHiss, drone, droneOff, duckSneeze, glug, gulp, hmf,
  honk, honkLow, howl, huff, longHiss, pant, patPat, peep, pop, preenSqueak, pssh, puffPop, purr, pushIn, quack, rollBack, rumble, rustle, shakeDry,
  shakeOff, slap, sniff, splash, splutter, squeak, squeakBack, tinkle, wek, wheelSpin, whirr, whistle, woof, type Sound,
} from './voices'

// The fixed habits of the five toys, as numbers: how each travels, and what
// each does where it stands. The model (town.ts) reads the speeds and queues
// each sound on the frame its cue falls; the motion (motion.ts) reads the
// same cues, so that sight and sound run on one clock.
//
// The grid of the design sheet is five toys by four tapes and the bare
// floor. A cell is a way of travelling (a gait) or something done on the
// spot (an act), and no two cells share a sound.

export type Mover = 'car' | 'bus' | 'duck' | 'train' | 'dog'
export const MOVERS: readonly Mover[] = ['train', 'bus', 'duck', 'car', 'dog']
/** Who gives way to whom: the train to nobody, the dog to everybody. */
export const RANK: Record<Mover, number> = { train: 5, bus: 4, duck: 3, car: 2, dog: 1 }

/** What each toy wants: the tape it goes to by itself. The dog wants company and the train will not cross bare floor. */
export const WANT: Record<Mover, Kind | null> = { car: 0, bus: 0, duck: 1, train: 3, dog: null }

/** What falls out of a toy as it travels, for the view. */
export type FxKind = 'leaf' | 'drop' | 'spot' | 'puff' | 'cloud' | 'bubble' | 'wake' | 'dust' | 'drip'

export type Gait = {
  /** Stage units a second. */
  speed: number
  /** Stage units between two beats of its sound. */
  every: number
  /** The beat, at the town's loudness (0 to 1). */
  beat: (level: number) => Sound
  /** What it leaves behind at each beat. */
  fx?: FxKind
  /** How fast its nose comes round to the way it goes, in radians a second. */
  turn: number
}

export const GAITS = {
  // The car: over bare boards, on road, afloat, and between the rails.
  scoot: { speed: 430, every: 82, beat: () => clack, turn: 17 },
  drive: { speed: 150, every: 48, beat: purr, turn: 7 },
  float: { speed: 60, every: 40, beat: glug, fx: 'bubble', turn: 2.5 },
  judder: { speed: 90, every: 22, beat: chatter, turn: 6 },
  // The bus: over bare boards, on road, and as a ferry.
  lumber: { speed: 110, every: 60, beat: drone, turn: 3 },
  rumble: { speed: 90, every: 60, beat: rumble, turn: 3 },
  sail: { speed: 55, every: 9999, beat: () => boo, fx: 'wake', turn: 1.6 },
  // The duck: over bare boards, down the middle of a road, on the water, and along one rail.
  waddle: { speed: 70, every: 26, beat: patPat, turn: 5 },
  slap: { speed: 50, every: 24, beat: slap, turn: 5 },
  swim: { speed: 80, every: 50, beat: () => quack, fx: 'wake', turn: 4 },
  rope: { speed: 40, every: 20, beat: peep, turn: 5 },
  // The train: on its rails, and nowhere else.
  chuff: { speed: 120, every: 36, beat: chuff, fx: 'puff', turn: 5 },
  // The dog: after somebody over bare boards, on road and between the rails, and nosing along a tape by itself.
  follow: { speed: 210, every: 60, beat: sniff, turn: 9 },
  tick: { speed: 210, every: 20, beat: claws, turn: 9 },
  trot: { speed: 210, every: 30, beat: pant, turn: 9 },
  nose: { speed: 60, every: 50, beat: sniff, turn: 6 },
  railTrot: { speed: 90, every: 30, beat: pant, turn: 6 },
} satisfies Record<string, Gait>
export type GaitName = keyof typeof GAITS

/** How often the swimming duck quacks: one beat of its wake in this many. */
export const QUACK_EVERY = 5
/** How far the ferry sails between two blasts of its horn. */
export const BOO_EVERY = 320

export type Cue = {
  /** Seconds into the act. A cue at the act's last second falls on the frame the act ends. */
  at: number
  sound?: Sound
  fx?: FxKind
  /** Something the model does on this frame: a peg hops off, a hat comes on. */
  mark?: string
}

export type Act = {
  lasts: number
  cues: readonly Cue[]
  /** From this second on the toy moves from where it acted to where the act leaves it. Left out, it stays. */
  leaveAt?: number
  /** How long the move takes. */
  leaveFor?: number
}

export const ACTS = {
  // --- The car ---
  /** A three-point turn at the end of the road: a squeak in, a lower squeak as it starts back. */
  uturn: { lasts: 1.1, cues: [{ at: 0, sound: squeak }, { at: 0.275, sound: squeakBack }] },
  /** On a grey stub it spins like a top, a whirr for each turn, and parks with a beep. */
  spin: { lasts: 1.4, cues: [{ at: 0, sound: whirr }, { at: 0.7, sound: whirr }, { at: 1.4, sound: beep }] },
  /** With no road at all: one doughnut, and parked with a beep. */
  doughnut: { lasts: 1, cues: [{ at: 0, sound: brrm }, { at: 1, sound: beep }] },
  /** Washed up at the end of the river with a splutter, shaking off drops. */
  washed: { lasts: 1.5, cues: [{ at: 0, sound: splutter, fx: 'drop' }, { at: 0.7, sound: shakeOff, fx: 'drop' }], leaveAt: 0, leaveFor: 0.6 },
  /** Nosed into the hedge and stuck: wheels spinning, leaves flying out behind, and out backwards with a pop. */
  hedge: { lasts: 2.2, cues: [{ at: 0, sound: rustle }, { at: 0.3, sound: wheelSpin, fx: 'leaf' }, { at: 0.9, sound: wheelSpin, fx: 'leaf' }, { at: 1.6, sound: pop }], leaveAt: 1.6, leaveFor: 0.5 },
  /** Snagged in the reeds as it floats by: two bobs and a gulp. */
  snag: { lasts: 1, cues: [{ at: 0.3, sound: gulp, fx: 'bubble' }] },
  /** At a hedge across the road: it honks, and honks again. */
  jamCar: { lasts: 2, cues: [{ at: 0, sound: honk, mark: 'honk' }, { at: 0.7, sound: honk, mark: 'honk' }, { at: 1.4, sound: honk, mark: 'honk' }] },
  // --- The bus ---
  /** The end of the road: it swings its whole length round, slowly, beeping. */
  busTurn: { lasts: 1.8, cues: [{ at: 0, sound: pssh }, { at: 0.9, sound: beepBack }] },
  /** With no road: it sinks on its springs. */
  sink: { lasts: 0.9, cues: [{ at: 0.1, sound: pssh }] },
  /** A stop beside a peg person: a hiss of doors, whoever rides hops off, the one who waits hops aboard, a ding. */
  stop: { lasts: 2.2, cues: [{ at: 0, sound: doorHiss }, { at: 0.5, mark: 'off' }, { at: 1, mark: 'on' }, { at: 1.6, sound: ding }] },
  /** Into the hedge and out again in a hat of leaves, sneezed off on the frame it is out. */
  leafHat: { lasts: 2.6, cues: [{ at: 0, sound: pushIn }, { at: 0.9, fx: 'leaf', mark: 'hat' }, { at: 1.9, sound: choo, fx: 'leaf', mark: 'hatOff' }], leaveAt: 1.3, leaveFor: 0.6 },
  /** Dead across the rails: it looks both ways, dings twice and backs off, beeping. */
  look: { lasts: 2.8, cues: [{ at: 1.2, sound: ding }, { at: 1.5, sound: ding }, { at: 1.9, sound: beepBack }, { at: 2.3, sound: beepBack }], leaveAt: 1.9, leaveFor: 0.8 },
  /** Behind a hedge across the road: it honks lower, in its turn. */
  jamBus: { lasts: 2.2, cues: [{ at: 0.35, sound: honkLow, mark: 'honk' }, { at: 1.05, sound: honkLow, mark: 'honk' }, { at: 1.75, sound: honkLow, mark: 'honk' }] },
  // --- The duck ---
  /** With no blue anywhere: it sits and preens. */
  preen: { lasts: 1.4, cues: [{ at: 0.5, sound: preenSqueak }] },
  /** The end of the river: bottom up. */
  bottomUp: { lasts: 1.3, cues: [{ at: 0.3, sound: bloop, fx: 'drop' }] },
  /** Into the hedge to nest, until only its tail shows. */
  nest: { lasts: 1.6, cues: [{ at: 0, sound: rustle, fx: 'leaf' }, { at: 1.3, sound: wek }] },
  /** Into the reeds, tail up. */
  hide: { lasts: 0.6, cues: [{ at: 0.1, sound: rustle, fx: 'leaf' }] },
  /** Out of the reeds, or from under a bridge, at whoever passes. */
  popOut: { lasts: 0.5, cues: [{ at: 0, sound: quack, fx: 'drop' }] },
  /** A puff of steam on the head under the trestle. */
  sneeze: { lasts: 0.8, cues: [{ at: 0.25, sound: duckSneeze, fx: 'puff' }] },
  // --- The train ---
  /** One wheel on the road, a sniff of a whistle, and off again with a huff. */
  sniffRoad: { lasts: 2, cues: [{ at: 0.6, sound: whistle }, { at: 1.2, sound: huff, fx: 'puff' }], leaveAt: 1.2, leaveFor: 0.7 },
  /** In the river: all its steam at once, a cloud, and it rolls back out. */
  steam: { lasts: 2.8, cues: [{ at: 0.2, sound: longHiss, fx: 'cloud' }, { at: 1.8, sound: rollBack }], leaveAt: 1.8, leaveFor: 0.9 },
  /** Into the hedge with its buffers, a leaf on its funnel, blown off. */
  buffer: { lasts: 2.4, cues: [{ at: 0.3, sound: clonk, fx: 'leaf', mark: 'leaf' }, { at: 1.5, sound: puffPop, fx: 'leaf', mark: 'leafOff' }], leaveAt: 1.7, leaveFor: 0.6 },
  /** The end of the line: its buffers ring, and it runs back. */
  ring: { lasts: 0.7, cues: [{ at: 0, sound: buffersRing }] },
  // --- The dog ---
  /** Nobody to follow: three turns round and down. */
  circle: { lasts: 2.2, cues: [{ at: 2, sound: hmf }] },
  /** In the river: it paddles, climbs out and shakes itself dry, spotting the boards. */
  paddle: { lasts: 2.6, cues: [{ at: 0, sound: splash, fx: 'drop' }, { at: 0.45, sound: splash, fx: 'drop' }, { at: 0.9, sound: splash, fx: 'drop' }, { at: 1.6, sound: shakeDry, fx: 'spot' }], leaveAt: 0.9, leaveFor: 0.6 },
  /** At a hedge: a sniff, a leg, and on, pleased. */
  leg: { lasts: 2, cues: [{ at: 0, sound: rustle }, { at: 0.9, sound: tinkle, fx: 'drip' }], leaveAt: 1.4, leaveFor: 0.5 },
  /** The train hoots: it sits and howls along. */
  howl: { lasts: 1.6, cues: [{ at: 0.2, sound: howl }] },
  /** After the howl it stays sitting and watches the train by: at most this long, and no longer than the train takes. */
  watch: { lasts: 9, cues: [] },
  /** Halfway over a bridge: it woofs over the edge at the water. */
  woof: { lasts: 1.2, cues: [{ at: 0.3, sound: woof }, { at: 0.7, sound: woof }] },
} satisfies Record<string, Act>
export type ActName = keyof typeof ACTS

/** What a toy does on a tape it is set on: travels it, or does something there and leaves it. */
export type Cell = { ride: GaitName } | { act: ActName }

/** The grid, toy by tape (grey, blue, green, yellow). The dog's row is what it does there with nobody to follow. */
export const GRID: Record<Mover, Record<Kind, Cell>> = {
  car: { 0: { ride: 'drive' }, 1: { ride: 'float' }, 2: { act: 'hedge' }, 3: { ride: 'judder' } },
  bus: { 0: { ride: 'rumble' }, 1: { ride: 'sail' }, 2: { act: 'leafHat' }, 3: { act: 'look' } },
  duck: { 0: { ride: 'slap' }, 1: { ride: 'swim' }, 2: { act: 'nest' }, 3: { ride: 'rope' } },
  train: { 0: { act: 'sniffRoad' }, 1: { act: 'steam' }, 2: { act: 'buffer' }, 3: { ride: 'chuff' } },
  dog: { 0: { ride: 'nose' }, 1: { act: 'paddle' }, 2: { act: 'leg' }, 3: { ride: 'railTrot' } },
}

/** How each toy gets over bare boards to the tape it wants, and what it says as it sets off. */
export const CROSS: Record<'car' | 'bus' | 'duck', { gait: GaitName; off: Sound }> = {
  car: { gait: 'scoot', off: brrm },
  bus: { gait: 'lumber', off: droneOff },
  duck: { gait: 'waddle', off: quack },
}

/** What each does on bare floor with nothing of its own tape anywhere. */
export const NOTHING: Record<'car' | 'bus' | 'duck' | 'dog', ActName> = { car: 'doughnut', bus: 'sink', duck: 'preen', dog: 'circle' }

/** How each turns back at the end of its own tape. */
export const TURN: Record<Mover, ActName | null> = { car: 'uturn', bus: 'busTurn', duck: 'bottomUp', train: 'ring', dog: null }
