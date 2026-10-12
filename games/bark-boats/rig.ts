import type { Spot } from './layout'
import type { Mood } from './traits'

// How each of the folk is posed, as plain numbers the view maps onto its
// drawing. The rules fill one `Stage` on every step: first what each does
// untouched (this file), then whatever answer is playing (the act files).
// Every one has its own tempo, its own weight and its own funniest part:
// - the frog is slow and heavy, and his throat and his two eyes do the work;
// - the kingfisher is quick and jerky: his head snaps to a tilt and holds;
// - the sprite has no weight: she sways like weed and her cheeks are the joke;
// - the gnome is springy, and his hat says what he thinks;
// - the dragonfly hangs still and then is somewhere else.
// Nothing here keeps state or reads a clock: time is passed in.

export const TAU = Math.PI * 2
export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
/** 0 before `a`, 1 after `b`, straight between. */
export const span = (t: number, a: number, b: number): number => clamp01((t - a) / (b - a))
/** A hump that is 0 at `a` and at `b` and 1 midway. */
export const bump = (t: number, a: number, b: number): number => Math.sin(span(t, a, b) * Math.PI)
/** 0 to 1 and held: an ease that starts and ends gently. */
export const ease = (t: number, a: number, b: number): number => {
  const k = span(t, a, b)
  return k * k * (3 - 2 * k)
}
/** A number from 0 up to 1 that is fixed for each whole `n`: the same every visit, with no stream to keep. */
export const hash = (n: number): number => {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}

export type FrogRig = {
  /** Moved off his seat, in stage units. */
  dx: number
  dy: number
  tilt: number
  /** Above 0 squashed flat and wide, below 0 stretched tall. */
  squash: number
  /** 0 his own size, 1 swollen to half as large again. */
  swell: number
  /** The throat sac, 0 flat to 1 full. */
  throat: number
  /** Each eye by itself, 0 shut to 1 wide. */
  lidL: number
  lidR: number
  lookX: number
  lookY: number
  /** 0 to 1: both eyes turned in to the nose. */
  cross: number
  mouth: number
  /** The tongue, 0 in to 1 at the spot it reaches for, which is `tongueX`, `tongueY` in stage units. */
  tongue: number
  tongueX: number
  tongueY: number
  cheek: number
  /** How far under the water he is, 0 to 1. */
  under: number
}

export type BirdRig = {
  dx: number
  dy: number
  /** The whole bird tipped forward, in radians. */
  tilt: number
  /** The tilt of the head, in radians. */
  head: number
  /** The feathers, 0 sleek to 1 on end. */
  ruffle: number
  beak: number
  tail: number
  /** 0 upright to 1 hanging upside down under his perch. */
  flip: number
  lookX: number
  lookY: number
  /** A wing, 0 folded to 1 spread. */
  wing: number
}

export type SpriteRig = {
  sway: number
  /** How far she sinks into the water, in stage units; below 0 she rises. */
  sink: number
  cheeks: number
  /** Cheeks gone dark with blowing, 0 to 1. */
  dark: number
  mouth: number
  lids: number
  lookX: number
  lookY: number
  /** Her near arm, 0 trailing in the water to 1 reached out to poke. */
  arm: number
  /** Moved toward what she is busy with, in stage units. */
  dx: number
  /** Her breath on its way: 0 none to 1 at full reach. */
  breath: number
}

export type GnomeRig = {
  dx: number
  dy: number
  lean: number
  squash: number
  /** 0 standing to 1 sat down. */
  sit: number
  /** Each arm: -1 folded tight, 0 at his side, 1 thrown up. */
  armL: number
  /** His downstream arm stretched out to point the way the brook runs, 0 to 1. */
  point: number
  armR: number
  hatTilt: number
  /** His hat off his head: how far, in stage units. */
  hatX: number
  hatY: number
  /** 0 a line, 1 a wide grin, -1 turned down. */
  mouth: number
  lids: number
  lookX: number
  lookY: number
  /** His beard red with berry, 0 to 1. */
  beard: number
  /** A leg that swings when he sits, a foot that taps when he stands, in radians. */
  leg: number
  /** How far he has ducked under a blanket, 0 to 1. */
  hide: number
  /** 0 facing the child to 1 turned to look behind him. */
  turn: number
  /** His hat blown out flat downwind, 0 to 1. */
  stream: number
}

export type BoatRig = {
  dx: number
  dy: number
  /** A lean on top of the hull's own, in radians. */
  tilt: number
  /** 1 bow downstream, -1 turned about; between, the hull is seen end on. */
  face: number
  /** The belly of the sails, 0 slack to 1 full, and below 0 filled from the other side. */
  billow: number
}

export type FlyRig = { x: number; y: number; wings: number }

/** A short-lived mark the pen draws: a splash, bubbles, drops, a puff. `k` runs 0 to 1 over its life. */
export type Fx = { kind: 'splash' | 'bubbles' | 'drops' | 'spout'; x: number; y: number; k: number; size: number }

/** What the place itself does: its reeds bent downstream (above 0) or parted (below 0), its lily pads pushed up in a pile, 0 to 1. */
export type PlaceRig = { bend: number; pile: number }

export type Stage = { frog: FrogRig; bird: BirdRig; sprite: SpriteRig; gnome: GnomeRig; boat: BoatRig; fly: FlyRig; place: PlaceRig; fx: Fx[] }

export function newStage(): Stage {
  return {
    frog: { dx: 0, dy: 0, tilt: 0, squash: 0, swell: 0, throat: 0, lidL: 1, lidR: 1, lookX: 0, lookY: 0, cross: 0, mouth: 0, tongue: 0, tongueX: 0, tongueY: 0, cheek: 0, under: 0 },
    bird: { dx: 0, dy: 0, tilt: 0, head: 0, ruffle: 0, beak: 0, tail: 0, flip: 0, lookX: 0, lookY: 0, wing: 0 },
    sprite: { sway: 0, sink: 0, cheeks: 0, dark: 0, mouth: 0, lids: 1, lookX: 0, lookY: 0, arm: 0, dx: 0, breath: 0 },
    gnome: { dx: 0, dy: 0, lean: 0, squash: 0, sit: 0, armL: 0, point: 0, armR: 0, hatTilt: 0, hatX: 0, hatY: 0, mouth: 0, lids: 1, lookX: 0, lookY: 0, beard: 0, leg: 0, hide: 0, turn: 0, stream: 0 },
    boat: { dx: 0, dy: 0, tilt: 0, face: 1, billow: 0 },
    fly: { x: 0, y: 0, wings: 0 },
    place: { bend: 0, pile: 0 },
    fx: [],
  }
}

/** Which way the eyes turn to look at `at` from `from`: each of x and y from -1 to 1. */
export function gaze(from: Spot, at: Spot | null): Spot {
  if (!at) return { x: 0, y: 0 }
  const dx = at.x - from.x, dy = at.y - from.y
  const far = Math.hypot(dx, dy)
  if (far < 1) return { x: 0, y: 0 }
  const pull = Math.min(1, far / 160)
  return { x: (dx / far) * pull, y: (dy / far) * pull }
}

const MOODS: Record<Mood, { arms: number; hatTilt: number; mouth: number; lean: number }> = {
  under: { arms: 0, hatTilt: 0.5, mouth: 0.4, lean: 0 },
  glum: { arms: -1, hatTilt: 0.7, mouth: -1, lean: -0.12 },
  itchy: { arms: 0.2, hatTilt: 0.3, mouth: -0.4, lean: -0.05 },
  glee: { arms: 0.6, hatTilt: -0.25, mouth: 1, lean: 0.1 },
  yum: { arms: 0.15, hatTilt: -0.05, mouth: 0.7, lean: 0.04 },
  plain: { arms: 0, hatTilt: 0.1, mouth: 0.15, lean: 0 },
}

const TILTS = [-0.32, 0.05, 0.34, -0.12, 0.22]

/** What everyone does untouched at `time`, written over `stage`. The gnome sits and shows his mood only once he is aboard. */
export function idle(stage: Stage, time: number, aboard: boolean, mood: Mood): void {
  const { frog, bird, sprite, gnome, boat, fly } = stage
  // The frog: slow breath, the throat filling over two seconds and falling in one; a lazy blink, one eye at a time.
  const breath = (time % 3.1) / 3.1
  frog.dx = frog.dy = frog.tilt = frog.swell = frog.cross = frog.tongue = frog.cheek = frog.under = 0
  frog.throat = 0.18 + 0.2 * (breath < 0.66 ? breath / 0.66 : 1 - (breath - 0.66) / 0.34)
  frog.squash = 0.03 * Math.sin((time * TAU) / 3.1)
  const beat = Math.floor(time / 2.3), lid = 1 - bump(time / 2.3 - beat, 0.04, 0.2), which = hash(beat)
  frog.lidL = which < 0.5 ? lid : 1
  frog.lidR = which >= 0.5 && which < 0.8 ? lid : 1
  const slot = Math.floor(time / 11)
  frog.mouth = hash(slot + 40) < 0.6 ? bump(time - slot * 11, 6, 7.6) * 0.8 : 0
  // The kingfisher: the head holds a tilt, then is at the next one within two frames; two pumps of the tail, then nothing.
  const step = Math.floor(time / 1.35)
  const hold = TILTS[Math.floor(hash(step + 7) * TILTS.length)], last = TILTS[Math.floor(hash(step + 6) * TILTS.length)]
  const cycle = time % 4.2, pump = bump(cycle, 0.3, 0.46) + bump(cycle, 0.52, 0.68)
  bird.dx = bird.tilt = bird.ruffle = bird.beak = bird.flip = bird.wing = 0
  bird.head = last + (hold - last) * span(time / 1.35 - step, 0, 0.04)
  bird.tail = 0.5 * pump
  bird.dy = 3 * pump
  // The sprite: no weight; cheeks half full, since she is always about to blow at something.
  sprite.sway = 0.07 * Math.sin(time * 0.83) + 0.03 * Math.sin(time * 1.37 + 1)
  sprite.sink = -5 * Math.sin(time * 0.6)
  sprite.cheeks = 0.3 + 0.08 * Math.sin(time * 0.83 + 2)
  sprite.lids = 1 - bump((time + 1.7) % 5.3, 0, 0.5)
  sprite.dark = sprite.mouth = sprite.arm = sprite.dx = sprite.breath = 0
  // The gnome: standing he rocks on his heels and taps a foot; sitting he swings a leg and wears his opinion.
  const settled = MOODS[aboard ? mood : 'plain']
  gnome.dx = gnome.dy = gnome.squash = gnome.hatX = gnome.hatY = gnome.beard = gnome.turn = gnome.stream = gnome.lookX = gnome.lookY = 0
  gnome.sit = aboard ? 1 : 0
  gnome.armL = gnome.armR = settled.arms
  // In his seat, with nothing else to do with his arms, he points downstream, the way he wants to go: he holds it, drops it, and points again.
  gnome.point = aboard && settled.arms >= 0 && settled.arms < 0.5 && mood !== 'under' ? span(time % 5.6, 0.3, 0.7) * (1 - span(time % 5.6, 3.4, 3.9)) : 0
  gnome.mouth = settled.mouth
  gnome.lean = settled.lean + 0.04 * Math.sin(time * 1.9)
  gnome.hatTilt = settled.hatTilt + 0.05 * Math.sin(time * 1.9 - 0.8)
  gnome.lids = 1 - bump((time + 0.6) % 4.1, 0, 0.3)
  gnome.leg = aboard ? 0.35 * Math.sin(time * 3.4) : 0.3 * Math.max(0, Math.sin(time * 5.2)) * (Math.sin(time * 0.9) > 0 ? 1 : 0)
  gnome.hide = aboard && mood === 'under' ? 1 : 0
  boat.dx = boat.dy = boat.tilt = boat.billow = 0
  boat.face = 1
  // The dragonfly hangs at one spot, then darts to the next in a tenth of a second.
  const at = Math.floor(time / 1.9), into = time / 1.9 - at, k = span(into, 0, 0.06)
  const spot = (n: number): Spot => ({ x: (hash(n + 90) - 0.5) * 420, y: (hash(n + 190) - 0.5) * 44 })
  const from = spot(at - 1), to = spot(at)
  fly.x = from.x + (to.x - from.x) * k + 2 * Math.sin(time * 31)
  fly.y = from.y + (to.y - from.y) * k + 1.5 * Math.sin(time * 37)
  fly.wings = Math.sin(time * 90)
  stage.place.bend = 0.06 * Math.sin(time * 1.1)
  stage.place.pile = 0
  stage.fx.length = 0
}
