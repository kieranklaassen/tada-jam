import type { Customer } from './customers'
import type { Kind } from './kinds'
import { COUNTER_Y, CUSTOMER, DOOR, DOOR_APART, DOOR_SIZE, PIZZA } from './layout'
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
  way: 'many' | 'few' | 'fed' | 'raw' | 'burp' | 'crumbs'
  /** Whose reaction it is: it is drawn in that customer's manner. */
  who?: Customer
  /** For a burp: every kind that was eaten, each with a puff in its own colour. */
  kinds?: readonly Kind[]
  big: boolean
  /** 0 to 1 through the effect. */
  t: number
}

/** A customer on the move: where its feet are, how big it is drawn (small at the door, 1 at the counter), and where it has one hand, in its own units, or null to let it hang. */
export type Walker = { who: Customer; x: number; y: number; size: number; act: Delta; hand: { x: number; y: number } | null }

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
  /** The oven's door: 0 open to 1 shut. */
  door: number
  /** How far a customer has nudged the board from its place, in stage units. */
  boardX: number
  /** How far the pieces are through their baking move as the pizza slides out, 0 to 1; 0 when none plays. */
  baking: number
  /** The customer at the counter, when a scene has it somewhere else than standing there. */
  customer: { x: number; y: number; size: number } | null
  /** The customer who has eaten, on its way out. */
  leaving: Walker | null
  /** The newcomer at the door comes up from behind the counter once its place is free: which place, and how far up, 0 to 1. */
  arriving: { which: 'small' | 'big'; up: number } | null
  /** The roll the customer who was called carries from the door to the counter, where it opens into the card: where it is, in stage units, which roll, how much of it is left as the card opens out of it, and how it is turned: held as it was at the door, and stood upright along the card's edge before the card opens, so that the card widens out of its side and never lies across it. */
  roll: { x: number; y: number; fat: boolean; left: number; turn: number } | null
  /** How far the roll has opened into the card, 0 to 1, and how many of its drawn pieces are there yet. */
  cardOpen: number
  cardCount: number
  /** How far the tubs have slid in, 0 to 1. */
  tubsIn: number
  /** What the scene adds to the customer's own motion. */
  act: Delta
  /** Where the scene has the customer's free hand, the one on the tubs' side, in stage units, or null to leave it at rest. */
  hand: { x: number; y: number } | null
  /** Where the scene has the hand that holds the card, when it pats a drawn piece, or null to leave it holding. */
  cardHand: { x: number; y: number } | null
  /** The tongue reaching for the pizza: 0 in to 1 on it. */
  lick: number
  effect: Effect | null
  /** Which pieces on the pizza are sizzling as their turn of a tasting plays (their ids), and how strongly: one, or in a big version every one that has no partner. */
  sizzling: readonly number[]
  sizzle: number
  /** The pieces and pictures that bob just now are partners being shown together, pair by pair, and not pieces with no partner. */
  pairing: boolean
  /** Which drawn pieces on the card are being patted, and how strongly: one, or in a big version every one that has no partner. */
  patted: readonly number[]
  pat: number
  /** Soot on the face after one big flame: 0 to 1. It is shaken off as the tasting ends. */
  soot: number
  /** The kind it cannot stand is on its pizza and being tasted: 0 to 1, shown in the customer's own way (pose.ts). */
  upset: number
  /** A sock fed by hand is being worn, until the customer next moves. Never saved. */
  wearing: boolean
  /** Where the scene has the customer look, in stage units, or null to leave its eyes alone. */
  lookAt: { x: number; y: number } | null
}

/** No piece and no picture. */
export const NONE: readonly number[] = []

/** The door: where the one with the small roll stands, and the one with the big roll. */
export function doorSpot(which: 'small' | 'big'): { x: number; y: number; size: number } {
  return { x: DOOR.x + (which === 'small' ? -DOOR_APART : DOOR_APART), y: COUNTER_Y + 22, size: DOOR_SIZE }
}

export const COUNTER_SPOT = { x: CUSTOMER.x, y: CUSTOMER.y, size: 1 }

/** The kitchen at rest: the pizza on the board, the card open, the tubs in. */
export function restStaging(): Staging {
  return {
    pizzaX: PIZZA.x, pizzaY: PIZZA.y, pizzaSize: 1, pizzaHidden: false, bites: 0, puffed: 0, ovenGlow: 0, door: 0, boardX: 0, baking: 0,
    customer: null, leaving: null, arriving: null, roll: null, cardOpen: 1, cardCount: 99, tubsIn: 1,
    act: {}, hand: null, cardHand: null, lick: 0, effect: null, sizzling: NONE, sizzle: 0, pairing: false, patted: NONE, pat: 0, soot: 0, upset: 0, wearing: false, lookAt: null,
  }
}

/** Puts back everything a scene may have left moving, and leaves the outcome alone: where the pizza lies, whether the card is open. */
export function calm(s: Staging): void {
  s.act = {}
  s.hand = null
  s.cardHand = null
  s.lick = 0
  s.effect = null
  s.sizzling = NONE
  s.sizzle = 0
  s.patted = NONE
  s.pat = 0
  s.ovenGlow = 0
  s.door = 0
  s.boardX = 0
  s.pairing = false
  s.baking = 0
  s.soot = 0
  s.upset = 0
  s.lookAt = null
  s.customer = null
  s.leaving = null
  s.arriving = null
  s.roll = null
}
