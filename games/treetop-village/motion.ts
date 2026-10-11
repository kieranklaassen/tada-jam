import type { Folk } from './tree'

// How each walker moves, as plain numbers the view lays onto its card. Every
// walker has its own tempo, its own weight and its own funniest part, and no
// two share a curve: the squirrel darts and stops dead, the owl rocks from
// foot to foot like a skittle, the twins scurry in a tumble, the beetle plods
// and dips. A card does not bend: weight is in the hop, the tilt, the squash
// of the whole card on its fold, and the one hinged part each walker has.

export type Pose = {
  /** Offset from where the walker stands, in stage units. */
  dx: number
  dy: number
  /** Lean of the whole card, in radians. */
  tilt: number
  /** Squash of the card on its fold: 1 is at rest, and width is the inverse. */
  squash: number
  /** A whole turn of the card, head over heels, in radians. */
  spin: number
  /** The card turned about its upright, as on a twisting rope, in radians: its width closes and opens. */
  yaw: number
  /** The hinged part, -1 to 1 and beyond: the squirrel's tail, the owl's head, the beetle's hat. */
  part: number
  /** How puffed up the card is, 1 at rest. */
  puff: number
  /** The eyes: 0 open, 1 both shut, 0.5 only the near eye shut, -0.5 only the far one. */
  lid: number
  /** The squirrel's letter: 0 in his paw, 1 dropped at his feet. Above a half, the beetle's wing cases are open and the twins point at each other. */
  prop: number
  /** The twins only: how much further apart they are (less is closer), how far the twin behind is moved down the page (less than 0 is higher), and how far the twin in front tips forward. */
  pair: number
  stack: number
  flip: number
}

export const REST: Pose = { dx: 0, dy: 0, tilt: 0, squash: 1, spin: 0, yaw: 0, part: 0, puff: 1, lid: 0, prop: 0, pair: 0, stack: 0, flip: 0 }

/** What a piece does under a walker or a finger. Everything is 0 at rest. */
export type PiecePose = {
  /** The piece swung sideways about the line between its pegs. */
  sway: number
  /** The piece bowed or bounced away from that line. */
  bounce: number
  /** The whole piece jogged about its middle, in radians. */
  rattle: number
  /** A bucket's cup or a swing's seat swung about its pin, in radians, and sunk under a weight, in stage units. */
  swing: number
  sag: number
}

export const STILL: PiecePose = { sway: 0, bounce: 0, rattle: 0, swing: 0, sag: 0 }

/**
 * A walker on a piece. `along` is how far along the piece its feet are, 0 at
 * the end it came from. `hang` is how far below the piece it hangs, `sink`
 * how far it has sunk into it (what is below the piece's edge is not drawn),
 * and `seat` whether it goes with the swing's seat or the bucket's cup.
 */
export type On = { along: number; hang: number; sink: number; seat: boolean; pose: Pose; piece: PiecePose }

export const makeOn = (): On => ({ along: 0, hang: 0, sink: 0, seat: false, pose: { ...REST }, piece: { ...STILL } })

export type Personality = {
  /** Stage units a second along a landing. */
  speed: number
  /** Steps a second. */
  cadence: number
  /** How high a step lifts the card, and how far it leans into it. */
  lift: number
  lean: number
  /** Seconds of one breath at rest, and how deep it is. */
  breath: number
  depth: number
}

export const PERSONALITY: Record<Folk, Personality> = {
  squirrel: { speed: 300, cadence: 9, lift: 9, lean: 0.2, breath: 1.3, depth: 0.03 },
  owl: { speed: 92, cadence: 2.2, lift: 3, lean: 0.13, breath: 3.4, depth: 0.05 },
  mice: { speed: 190, cadence: 6.5, lift: 6, lean: 0.1, breath: 0.9, depth: 0.04 },
  beetle: { speed: 74, cadence: 1.6, lift: 4, lean: 0.05, breath: 2.6, depth: 0.025 },
}

export const TAU = Math.PI * 2
/** A whole wave a unit: 0, up, 0, down, 0. */
export const wave = (t: number): number => Math.sin(t * TAU)
/** Up and back over 0 to 1. */
export const bump = (u: number): number => Math.sin(Math.max(0, Math.min(1, u)) * Math.PI)
/** A soft start and a soft stop over 0 to 1. */
export const ease = (u: number): number => { const t = Math.max(0, Math.min(1, u)); return t * t * (3 - 2 * t) }

/** Standing still: each breathes at its own pace, and its hinged part has a life of its own. */
export function idlePose(folk: Folk, t: number, out: Pose): Pose {
  const p = PERSONALITY[folk]
  Object.assign(out, REST)
  out.squash = 1 + p.depth * wave(t / p.breath)
  switch (folk) {
    case 'squirrel':
      // Cannot stand still: a twitch of the tail every breath and a quick look to the side now and then.
      out.part = 0.25 * wave(t * 1.9) + (t % 3.1 < 0.18 ? 0.7 : 0)
      out.tilt = t % 4.3 < 0.3 ? 0.08 : 0
      break
    case 'owl':
      // Stands like a skittle; only the head turns, slowly, a little too far.
      out.part = 0.5 * wave(t / 5.2)
      break
    case 'mice':
      // One tugs the other's tail in turn.
      out.part = wave(t / 1.4)
      out.dy = -2 * Math.max(0, wave(t * 1.3))
      break
    case 'beetle':
      // Leans on his stick and nods off, then catches himself.
      out.tilt = 0.06 * ease((t % 6) / 4.5) - (t % 6 > 4.5 ? 0.06 * ease((t % 6 - 4.5) / 0.3) : 0)
      out.part = 0.3 * out.tilt / 0.06
      break
  }
  return out
}

/** Walking along a landing. `phase` counts steps. */
export function gaitPose(folk: Folk, phase: number, out: Pose): Pose {
  const p = PERSONALITY[folk]
  Object.assign(out, REST)
  const step = phase % 1
  switch (folk) {
    case 'squirrel':
      // Low fast bounds, stretched forward, tail streaming.
      out.dy = -p.lift * bump(step)
      out.tilt = p.lean
      out.squash = 0.9 + 0.12 * bump(step)
      out.part = -0.8 + 0.2 * wave(phase)
      break
    case 'owl':
      // Rocks from one foot to the other and hardly rises.
      out.tilt = p.lean * wave(phase / 2)
      out.dy = -p.lift * Math.abs(wave(phase / 2))
      out.part = -0.4 * wave(phase / 2)
      break
    case 'mice':
      // A scurry that tumbles: every fourth step is a little hop of both.
      out.dy = -p.lift * bump(step) - (Math.floor(phase) % 4 === 3 ? 7 * bump(step) : 0)
      out.tilt = p.lean * wave(phase * 0.5)
      out.part = wave(phase * 0.5)
      break
    case 'beetle':
      // A plod: the card dips at each step and comes up slowly.
      out.dy = p.lift * (1 - ease(step * 1.6))
      out.tilt = p.lean
      out.squash = 1 - 0.04 * (1 - ease(step * 2))
      out.part = 0.2 * (1 - ease(step * 2))
      break
  }
  return out
}
