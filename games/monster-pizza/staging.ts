import type { Customer } from './customers'
import type { Kind } from './kinds'
import { COUNTER_Y, CUSTOMER, DOOR, PIZZA } from './layout'
import type { Delta } from './motion'

// Everything a scene moves that is not a rule: where the pizza is on its way
// to the oven, how far the card has opened, what the customer's body is
// doing. A scene's beats write these, the kitchen reads them into the frame,
// and none of it is saved: a save holds the outcome, which the scene put
// into the state when it started.

/** A reaction being drawn on the customer: a puff of flame, a hiccup, a string of cheese. */
export type Effect = {
  kind: Kind
  /** Too many or too few at a tasting, fed by hand, or the raw dough stretching. */
  way: 'many' | 'few' | 'fed' | 'raw' | 'burp'
  big: boolean
  /** 0 to 1 through the effect. */
  t: number
}

/** A customer on the move: where its feet are, and how big it is drawn (0.44 at the door, 1 at the counter). */
export type Walker = { who: Customer; x: number; y: number; size: number; act: Delta }

export type Staging = {
  /** Where the pizza is, in stage units, and how big it is drawn. */
  pizzaX: number
  pizzaY: number
  pizzaSize: number
  /** The pizza is in the oven, out of sight. */
  pizzaHidden: boolean
  /** How much of the pizza has been bitten off: 0 to 3 bites. */
  bites: number
  /** A base baked with nothing on it puffs up: 0 flat to 1 like a pillow. */
  puffed: number
  /** 0 dark to 1 glowing. */
  ovenGlow: number
  /** The customer at the counter, when a scene has it somewhere else than standing there. */
  customer: { x: number; y: number; size: number } | null
  /** The customer who has eaten, on its way out. */
  leaving: Walker | null
  /** How far the roll has opened into the card, 0 to 1, and how many of its drawn pieces are there yet. */
  cardOpen: number
  cardCount: number
  /** How far the tubs have slid in, 0 to 1. */
  tubsIn: number
  /** What the scene adds to the customer's own motion. */
  act: Delta
  /** Where the scene has the customer's right hand, in stage units, or null to leave it. */
  hand: { x: number; y: number } | null
  /** The tongue reaching for the pizza: 0 in to 1 on it. */
  lick: number
  effect: Effect | null
  /** Which piece on the pizza is sizzling as its turn of a tasting plays (its id), and how strongly. */
  sizzling: number
  sizzle: number
  /** Which drawn piece on the card is being patted, and how strongly. */
  patted: number
  pat: number
  /** Soot on the face after one big flame: 0 to 1. */
  soot: number
  /** Where the scene has the customer look, in stage units, or null to leave its eyes alone. */
  lookAt: { x: number; y: number } | null
}

/** The door: where the one with the small roll stands, and the one with the big roll. */
export function doorSpot(which: 'small' | 'big'): { x: number; y: number; size: number } {
  return { x: DOOR.x + (which === 'small' ? -50 : 50), y: COUNTER_Y + 22, size: 0.44 }
}

export const COUNTER_SPOT = { x: CUSTOMER.x, y: CUSTOMER.y, size: 1 }

/** The kitchen at rest: the pizza on the board, the card open, the tubs in. */
export function restStaging(): Staging {
  return {
    pizzaX: PIZZA.x, pizzaY: PIZZA.y, pizzaSize: 1, pizzaHidden: false, bites: 0, puffed: 0, ovenGlow: 0,
    customer: null, leaving: null, cardOpen: 1, cardCount: 99, tubsIn: 1,
    act: {}, hand: null, lick: 0, effect: null, sizzling: -1, sizzle: 0, patted: -1, pat: 0, soot: 0, lookAt: null,
  }
}

/** Puts back everything a scene may have left moving, and leaves the outcome alone: where the pizza lies, whether the card is open. */
export function calm(s: Staging): void {
  s.act = {}
  s.hand = null
  s.lick = 0
  s.effect = null
  s.sizzling = -1
  s.sizzle = 0
  s.patted = -1
  s.pat = 0
  s.ovenGlow = 0
  s.lookAt = null
  s.customer = null
  s.leaving = null
}
