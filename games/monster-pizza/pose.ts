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
  /** Where one eye alone looks on top of that, each -1 to 1: the eye that rolls right round while the other, if there is one, stays put. */
  rollX: number
  rollY: number
  /** 0 open to 1 shut. */
  blink: number
  /** 0 shut to 1 wide open. */
  mouth: number
  /** 0 in to 1 right out. */
  tongue: number
  /** The funniest part's own swing, -1 to 1: the stalk bends, the belly swells, the neck stretches, the ears lift. */
  part: number
  /** The brows: -1 pressed low to 1 raised high. */
  brow: number
  /** Their tilt: -1 worried, the inner ends up, to 1 cross, the inner ends down. */
  frown: number
  /** The shape of the mouth: -1 turned down to 1 a wide grin. */
  smile: number
  /** The mouth drawn in to a small round one, 0 to 1. */
  pucker: number
  /** Colour in the cheeks, 0 to 1. */
  cheeks: number
  /** How big the pupils are: 1 as they are, less for a fright, more for delight. */
  pupil: number
  /**
   * The kind it cannot stand is on its pizza, 0 to 1. Each customer shows it in the part of it that overdoes
   * everything: a knot in the stalk, steam from the ears and a belly lit like a lamp, a neck gone limp under
   * drooping antennae, every hair on end.
   */
  upset: number
  /** Ooze only: how far through gathering, hanging and falling one drop of itself is, 0 to 1; 0 for everyone else. */
  drip: number
  /** A drop of drool at the corner of its mouth, 0 none to 1 long: it wants what it is looking at. */
  drool: number
  /** Where each hand is, in the customer's own units, or null to let the arm hang. */
  handL: { x: number; y: number } | null
  handR: { x: number; y: number } | null
}

/**
 * Where a hand has to be, in the customer's own units, to be drawn at a spot
 * of the stage that is `dx`, `dy` from its feet, whatever its body is doing:
 * the lift, the lean and the squash of the pose are taken out again. So a
 * hand that holds the card stays on the card while the customer sways.
 */
export function handAt(pose: Pose, dx: number, dy: number): { x: number; y: number } {
  const y = dy + pose.lift, cos = Math.cos(pose.lean), sin = Math.sin(pose.lean)
  return { x: (dx * cos + y * sin) / pose.sx, y: (-dx * sin + y * cos) / pose.sy }
}

/** The other way: where a hand in the customer's own units is drawn, from its feet, in stage units. */
export function handOnStage(pose: Pose, hand: { x: number; y: number }): { x: number; y: number } {
  const x = hand.x * pose.sx, y = hand.y * pose.sy, cos = Math.cos(pose.lean), sin = Math.sin(pose.lean)
  return { x: x * cos - y * sin, y: x * sin + y * cos - pose.lift }
}

export function restPose(): Pose {
  return { sx: 1, sy: 1, lean: 0, lift: 0, lookX: 0, lookY: 0, rollX: 0, rollY: 0, blink: 0, mouth: 0, tongue: 0, part: 0, brow: 0, frown: 0, smile: 0.3, pucker: 0, cheeks: 0, pupil: 1, upset: 0, drip: 0, drool: 0, handL: null, handR: null }
}
