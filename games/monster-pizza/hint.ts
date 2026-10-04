import { CUSTOMER, OVEN, OVEN_WAY, PIZZA, SERVE, TUB } from './layout'

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
  /** The customer is still tasting the pizza it pushed back and takes no other yet: the way to it is not pointed at. */
  tasting: boolean
  /** The child has laid or moved a piece with its own finger since this customer stepped up. Until then the way onward is not pointed at. */
  own: boolean
  /** Where each tub stands. */
  tubs: Spot[]
  /**
   * The one tub the hand shows a tap on: the tub of the kind this customer loves, which is on every card of its
   * own. The hand never taps the spare tub, whose kind is a secret for the child to find, and it shows one tub
   * whatever the card holds, so it gives away neither which kinds are wanted nor how many.
   */
  handTub: Spot | null
  /** Where each piece on the pizza lies, in stage units. */
  pieces: Spot[]
  /** Where the two at the door stand. */
  door: Spot[]
}

export type Hint = { move: 'tap'; at: Spot } | { move: 'drag'; from: Spot; to: Spot }

/** A thing that glows: where it is and how big. */
export type Glow = Spot & { r: number }

/** Where the hand takes the pizza to slide it: its crust on the child's side, outside the ring the pieces lie in. */
export const CRUST: Spot = { x: PIZZA.x, y: PIZZA.y + PIZZA.r * 0.95 }

const OVEN_GLOW: Glow = { x: OVEN.x, y: OVEN.y + 10, r: 150 }
/** The customer's ring sits round its mouth, where a pizza goes. */
const CUSTOMER_GLOW: Glow = { x: CUSTOMER.x, y: CUSTOMER.y - 170, r: 150 }

/** What can be touched to carry the job on, at this stage. */
export function glows(scene: Scene): Glow[] {
  if (scene.finished) return scene.door.map((d) => ({ x: d.x, y: d.y - 70, r: 72 }))
  // A tub's ring is drawn close round it: the tubs stand near each other, and two rings that met would lay their dashes side by side.
  const tubs = scene.tubs.map((t) => ({ x: t.x, y: t.y + TUB.r * 0.2, r: TUB.r + 4 }))
  if (scene.baked) return scene.tasting ? tubs : [...tubs, CUSTOMER_GLOW]
  return scene.pieces.length > 0 && scene.own ? [...tubs, OVEN_GLOW] : tubs
}

/**
 * The one move the hand shows on its `turn`th demonstration of an idle
 * stretch. The moves of a stage take turns, so a waiting child is shown each
 * kind of move that can be made, and never which of them is the right one now.
 */
export function chooseHint(scene: Scene, turn: number): Hint | null {
  if (scene.finished) return scene.door.length > 0 ? { move: 'tap', at: { x: scene.door[turn % scene.door.length].x, y: scene.door[turn % scene.door.length].y - 70 } } : null
  const moves: Hint[] = []
  const tub = scene.handTub
  const piece = scene.pieces.length > 0 ? scene.pieces[turn % scene.pieces.length] : null
  // The slide is shown from the pizza's near crust, where no piece lies: a press on the middle would pick a piece up.
  const onward: Hint = scene.baked ? { move: 'drag', from: CRUST, to: { x: CRUST.x + SERVE.x - PIZZA.x, y: CRUST.y + SERVE.y - PIZZA.y } } : { move: 'drag', from: CRUST, to: { x: CRUST.x + OVEN_WAY.x - PIZZA.x, y: CRUST.y + OVEN_WAY.y - PIZZA.y } }
  if (!scene.baked && (scene.pieces.length === 0 || !scene.own)) {
    if (tub) moves.push({ move: 'tap', at: tub })
  } else {
    // With something on the pizza there are three moves: one more on, the pizza onward, and one off.
    if (tub) moves.push({ move: 'tap', at: tub })
    if (!(scene.baked && scene.tasting)) moves.push(onward)
    if (piece) moves.push({ move: 'tap', at: piece })
  }
  return moves.length > 0 ? moves[turn % moves.length] : null
}
