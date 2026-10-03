import { CUSTOMER, OVEN, OVEN_MOUTH, PIZZA, SERVE, TUB } from './layout'

// What the idle ladder shows: which things glow, and the one move the ghost
// hand performs. It shows how a thing is picked up or where things can go.
// It never shows the answer: nothing here knows what the card asks for or
// whether the pizza matches it, so a hint cannot give that away.

export type Spot = { x: number; y: number }

/** What the hint may know of the kitchen: where things are, and what stage the job is at. */
export type Scene = {
  /** The customer at the counter has eaten, and the next ones wait at the door. */
  finished: boolean
  baked: boolean
  /** Where each tub stands. */
  tubs: Spot[]
  /** Where each piece on the pizza lies, in stage units. */
  pieces: Spot[]
  /** Where the two at the door stand. */
  door: Spot[]
}

export type Hint = { move: 'tap'; at: Spot } | { move: 'drag'; from: Spot; to: Spot }

/** A thing that glows: where it is and how big. */
export type Glow = Spot & { r: number }

const OVEN_GLOW: Glow = { x: OVEN.x, y: OVEN.y + 10, r: 150 }
const CUSTOMER_GLOW: Glow = { x: CUSTOMER.x, y: CUSTOMER.y - 150, r: 170 }

/** What can be touched to carry the job on, at this stage. */
export function glows(scene: Scene): Glow[] {
  if (scene.finished) return scene.door.map((d) => ({ x: d.x, y: d.y - 50, r: 62 }))
  const tubs = scene.tubs.map((t) => ({ x: t.x, y: t.y + TUB.r * 0.2, r: TUB.r + 24 }))
  if (scene.pieces.length === 0 && !scene.baked) return tubs
  return scene.baked ? [...tubs, CUSTOMER_GLOW] : [...tubs, OVEN_GLOW]
}

/**
 * The one move the hand shows on its `turn`th demonstration of an idle
 * stretch. The moves of a stage take turns, so a waiting child is shown each
 * thing that can be done, and never which of them is the right one now.
 */
export function chooseHint(scene: Scene, turn: number): Hint | null {
  if (scene.finished) return scene.door.length > 0 ? { move: 'tap', at: { x: scene.door[turn % scene.door.length].x, y: scene.door[turn % scene.door.length].y - 50 } } : null
  const moves: Hint[] = []
  const tub = scene.tubs.length > 0 ? scene.tubs[Math.floor(turn / 2) % scene.tubs.length] : null
  const piece = scene.pieces.length > 0 ? scene.pieces[turn % scene.pieces.length] : null
  const onward: Hint = scene.baked ? { move: 'drag', from: PIZZA, to: SERVE } : { move: 'drag', from: PIZZA, to: OVEN_MOUTH }
  if (scene.pieces.length === 0 && !scene.baked) {
    if (tub) moves.push({ move: 'tap', at: tub })
  } else {
    // With something on the pizza there are three moves: one more on, the pizza onward, and one off.
    if (tub) moves.push({ move: 'tap', at: tub })
    moves.push(onward)
    if (piece) moves.push({ move: 'tap', at: piece })
  }
  return moves.length > 0 ? moves[turn % moves.length] : null
}
