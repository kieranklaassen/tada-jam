// The things of the room that answer a touch: the tree's crown, and the ball
// and the brick that sit on the wall of blocks. Pure numbers: where each is,
// and how far a finger may be from its middle and still mean it. They are
// setting, not work: a touch makes one wobble and sound, and changes nothing
// in the world. They sit at the back, far from the hats and the heads.

export const PROPS = ['tree', 'ball', 'brick'] as const
export type PropName = (typeof PROPS)[number]

/** The low wall of soft blocks stands just behind the mat's back edge; the ball and the brick sit on two of its blocks. */
export const BLOCKS_Z = -7.75

/** Where the middle of each is, and its reach. */
export const PROP_AT: Record<PropName, { x: number; y: number; z: number; reach: number }> = {
  tree: { x: -9.9, y: 4.6, z: -4.9, reach: 2.2 },
  ball: { x: -4.8, y: 2.5, z: BLOCKS_Z, reach: 0.95 },
  brick: { x: -7.3, y: 3.15, z: BLOCKS_Z, reach: 0.95 },
}

export const BALL_RADIUS = 0.6
/** The tops of the two blocks the ball and the brick sit on. */
export const BALL_REST_Y = PROP_AT.ball.y - BALL_RADIUS
export const BRICK_REST_Y = 2.7

/** How far the ball rolls to one side when it is poked, how high the brick hops and how far the crown leans, for a wobble of 1. */
export const BALL_ROLL = 0.5
export const BRICK_HOP = 0.7
export const PROP_LEAN = 0.22

/**
 * What else of the room a finger can land on: a block of the low wall, a bead of the string, the cloud or the balloon
 * in the window, or the bare wall or window board. Each gives a small answer where the finger is, and none changes
 * anything. `n` says which block or which bead; x, y and z are where the answer is drawn.
 */
export type RoomThing = 'block' | 'bead' | 'cloud' | 'balloon' | 'wall'
export type RoomTouch = { what: RoomThing; x: number; y: number; z: number; n: number }

/** A balloon rises past the window now and then, outside, where no finger reaches: how often in seconds, how long it takes, and how far it sways. */
export const BALLOON = { every: 13, takes: 6.5, sway: 0.22 } as const

/** How far up the pane the balloon is at a time, from 0 (below it) to 1 (above it), or -1 when none is passing. */
export function balloonAt(time: number): number {
  const since = time % BALLOON.every
  return since < BALLOON.takes ? since / BALLOON.takes : -1
}

/** The cloud in the window drifts from side to side all the time and answers nothing: how far each way, which keeps all of it inside the pane, and how slowly. */
export const CLOUD_DRIFT = { far: 1.25, speed: 0.11 } as const
