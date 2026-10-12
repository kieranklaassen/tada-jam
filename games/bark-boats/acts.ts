import type { Spot } from './layout'
import type { Stage } from './rig'
import type { SoundName } from './voices'

// An answer: a short timed motion with its sounds, played on game time. The
// rules step it; on the step its time passes a cue the cue's sound is queued,
// so a sound is heard on the frame of its motion and never from a delay
// hidden in a voice. Its pose writes over the stage after the idle motion.

/** A sound of an act: seconds after the act starts, which sound, and how far its pitch is bent. */
export type Cue = readonly [at: number, name: SoundName, rate?: number]

/** The thing an answer is about, while the answer has it: where it is drawn, in stage units of its frame. */
export type Prop = { x: number; y: number; rot: number; scale: number; alpha: number; front: boolean }

/** Where everyone is while the act plays, in stage units of the frame. */
export type Anchors = {
  /** The frog's seat, the kingfisher's feet, the sprite's place in the water, the gnome's hips, the boat's keel point. */
  frog: Spot
  bird: Spot
  sprite: Spot
  gnome: Spot
  boat: Spot
  /** Where the thing was let go, and where it will come to rest. */
  drop: Spot
  home: Spot
  /** On the brook: how much of an act's travel the boat makes, 0 to 1, so that every answer of a place fits in its frame. */
  gain: number
}

/** Who an act keeps busy. A new act for one of them cuts the act that had it. */
export type Who = 'frog' | 'bird' | 'sprite' | 'gnome' | 'boat' | 'fly'

export type Act = {
  id: string
  /** Seconds. */
  length: number
  cues: readonly Cue[]
  who: readonly Who[]
  /** `k` runs 0 to 1 over the act, `t` is its seconds. */
  pose(k: number, t: number, stage: Stage, prop: Prop, at: Anchors): void
  /** How the thing leaves when the act is over: thrown in an arc to its place, or floating there along the shore. */
  leaves: 'arc' | 'float'
  /** The sound of its landing, when it is not the thing's own. */
  lands?: SoundName
}

export const newProp = (): Prop => ({ x: 0, y: 0, rot: 0, scale: 1, alpha: 1, front: true })

export const lerp = (a: number, b: number, k: number): number => a + (b - a) * k

/** Sets the prop at a spot. */
export function hold(prop: Prop, x: number, y: number, rot = 0, front = true): void {
  prop.x = x; prop.y = y; prop.rot = rot; prop.front = front; prop.scale = 1; prop.alpha = 1
}

/** Where the folk carry things, from each one's anchor. The view draws them from the same numbers. */
export const FROG_MOUTH = { x: 0, y: -108 } as const
export const FROG_HEAD = { x: 0, y: -196 } as const
/** The kingfisher's neck, where his head turns; the tip of his beak with his head level; and the tip with his head at a tilt. */
export const BIRD_NECK = { x: 14, y: -104 } as const
export const BIRD_BEAK = { x: 130, y: -132 } as const
export function beakTip(head: number): Spot {
  const x = BIRD_BEAK.x - BIRD_NECK.x, y = BIRD_BEAK.y - BIRD_NECK.y
  return { x: BIRD_NECK.x + x * Math.cos(head) - y * Math.sin(head), y: BIRD_NECK.y + x * Math.sin(head) + y * Math.cos(head) }
}
export const BIRD_HEAD = { x: 22, y: -176 } as const
export const BIRD_TAIL = { x: -84, y: -6 } as const
export const GNOME_HAND = { x: -44, y: -40 } as const
export const GNOME_NOSE = { x: -34, y: -96 } as const
export const GNOME_MOUTH = { x: -22, y: -76 } as const
export const GNOME_HAT_TIP = { x: 10, y: -222 } as const
export const GNOME_BACK = { x: 34, y: -70 } as const
