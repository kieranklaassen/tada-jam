// How a customer holds itself in one frame. The motion writes it and the art
// draws it; nothing else passes between them.

export type Pose = {
  /** Squash and stretch about the feet. */
  sx: number
  sy: number
  /** Lean, in radians, about the feet. */
  lean: number
  /** How far it is off the ground, in its own units: a hop. */
  lift: number
  /** Where it looks, each -1 to 1. */
  lookX: number
  lookY: number
  /** 0 open to 1 shut. */
  blink: number
  /** 0 shut to 1 wide open. */
  mouth: number
  /** 0 in to 1 right out. */
  tongue: number
  /** The funniest part's own swing, -1 to 1: the stalk bends, the belly swells, the neck stretches, the ears lift. */
  part: number
  /** Where each hand is, in the customer's own units, or null to let the arm hang. */
  handL: { x: number; y: number } | null
  handR: { x: number; y: number } | null
}

export function restPose(): Pose {
  return { sx: 1, sy: 1, lean: 0, lift: 0, lookX: 0, lookY: 0, blink: 0, mouth: 0, tongue: 0, part: 0, handL: null, handR: null }
}
