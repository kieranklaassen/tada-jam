import { CHARACTERS, type Customer } from './customers'
import type { Kind } from './kinds'
import { eyes } from './monsterArt'
import { CARD, CUSTOMER, OVEN, OVEN_MOUTH, PIZZA, ROLL, SERVE, STAGE_W } from './layout'
import { WORN } from './effects'
import type { Delta } from './motion'
import { followedBy, type Beat } from './scene'
import { COUNTER_SPOT, NONE, calm, doorSpot, type Staging } from './staging'
import { RAW, type TastingPlan } from './tasting'
import { babble, bake, bite, burp, cannotStandVoice, door, inManner, mannerLength, footstep, gulp, hiccup, lick, pat, rumble, slide, snap, stretch, tickOn, tooMany, unroll, wheeze, type VoiceSpec } from './voices'

// The short scenes, each a list of timed beats that move the staging (pack:
// game-design, endings-and-short-scenes.md). A scene is filled in from the
// state of play: which customer, which kinds, how many. Its outcome was saved
// before it started, so every beat here is only show: at progress 1 a beat
// leaves things where it was taking them, and a touch may jump there at once.

/** What a scene may ask of the kitchen while it plays. */
export type Stagehand = {
  /** Sounds a voice, unless the scene is being ended by a touch. */
  sound(spec: VoiceSpec): void
  /** The two who wait at the door react to what they have just seen, each in its own way. */
  crowd?(): void
  /** A puff of flour or smoke at a spot, in stage units. */
  puff?(at: { x: number; y: number }): void
}

const TAU = Math.PI * 2
const hump = (t: number): number => Math.sin(Math.min(1, Math.max(0, t)) * Math.PI)
const ease = (t: number): number => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const ramp = (t: number, a: number, b: number): number => Math.min(1, Math.max(0, (t - a) / (b - a)))

function cue(at: number, run: () => void): Beat {
  return { at, lasts: 0, play: () => run() }
}

function tween(at: number, lasts: number, play: (u: number) => void): Beat {
  return { at, lasts, play }
}

/** A roll stood on its end. */
const UPRIGHT = Math.PI / 2

/** How long the customer who has eaten pats its belly before it leaves. */
const PAT = 0.5

/** How many steps each customer takes from the door to the counter. */
const STEPS: Record<Customer, number> = { bim: 5, grum: 3, fizz: 9, mops: 4, ooze: 3 }

/** Each customer's own walk, `u` from 0 to 1 along the way. */
export function walk(who: Customer, u: number): Delta {
  const s = Math.sin(u * Math.PI * STEPS[who])
  switch (who) {
    case 'bim':
      return { lift: 34 * Math.abs(s), squash: -0.08 * Math.abs(s), part: 0.8 * s }
    case 'grum':
      return { lean: 0.07 * s, squash: 0.04 * Math.abs(s), part: 0.9 * Math.cos(u * Math.PI * STEPS.grum) }
    case 'fizz':
      return { lean: 0.03 * Math.sin(u * TAU * STEPS.fizz), lift: 6 * Math.abs(s), part: 0.5 * Math.sin(u * TAU * 11) }
    case 'mops':
      return { squash: 0.05 * s * s, lean: 0.04 * s, part: -0.6 * Math.sin(u * Math.PI * STEPS.mops - 0.9), blink: 0.3 }
    case 'ooze':
      return { squash: 0.18 * s * s - 0.05, lean: 0.02 * s }
  }
}

function steps(who: Customer, at: number, lasts: number, hand: Stagehand): Beat[] {
  const n = STEPS[who]
  return Array.from({ length: n }, (_, i) => cue(at + ((i + 0.5) / n) * lasts, () => hand.sound(footstep(CHARACTERS[who].voice))))
}

/**
 * A customer steps up: the one who has eaten leaves, the one touched comes to
 * the counter, a fresh base slides onto the board, the roll opens into the
 * card with its pieces appearing one at a time, and the tubs slide in.
 * `counts` is the step each drawn piece ticks on, in the card's order.
 */
export function steppingUp(st: Staging, who: Customer, from: 'small' | 'big', leaving: Customer | null, counts: readonly number[], hand: Stagehand, fat = false): Beat[] {
  const c = CHARACTERS[who]
  // The roll goes with its holder: at the door where it was held, then at its side, and up to where the card will hang.
  const held = fat ? ROLL.big : ROLL.small
  const hang = { x: CARD.x + 10, y: CARD.y + CARD.h / 2 }
  const carried = (at: { x: number; y: number; size: number }, e: number) => {
    const side = { x: at.x + mix(held.x, c.halfWidth * 0.8 * at.size, e), y: at.y + mix(held.y, -c.height * 0.45 * at.size, e) }
    const up = ramp(e, 0.6, 1)
    // As it comes up to where the card will hang it is stood upright, along the card's near edge.
    return { x: mix(side.x, hang.x, ease(up)), y: mix(side.y, hang.y, ease(up)), fat, left: 1, turn: mix(fat ? -0.06 : -0.5, UPRIGHT, ease(up)) }
  }
  // The one who has eaten pats its belly twice, then leaves; the one called sets off while it goes.
  const start = leaving ? PAT + 0.4 : 0
  const arrive = 1.3
  const door = doorSpot(from)
  const beats: Beat[] = [
    cue(0, () => {
      st.cardOpen = 0
      st.cardCount = 0
      st.tubsIn = 0
      st.pizzaY = 1040
      st.customer = { ...door }
      st.roll = carried(door, 0)
      // The newcomer takes the place at the door only when the one called has left it.
      st.arriving = { which: from, up: 0 }
    }),
    tween(start + arrive * 0.6, 0.6, (u) => { st.arriving = u < 1 ? { which: from, up: ease(u) } : null }),
  ]
  if (leaving) {
    const c = CHARACTERS[leaving]
    beats.push(
      tween(0, PAT, (u) => {
        // Two pats on its front, high enough to show over the counter, and the belly answers each.
        const down = Math.abs(Math.sin(u * Math.PI * 2))
        st.leaving = { who: leaving, x: CUSTOMER.x, y: CUSTOMER.y, size: 1, act: { squash: 0.05 * down, part: 0.9 * down, smile: 0.8, blink: 0.6 * hump(u), cheeks: 0.5 }, hand: { x: -c.halfWidth * 0.18, y: -c.height * 0.36 - 26 * (1 - down) } }
      }),
      cue(PAT * 0.25, () => hand.sound(pat)),
      cue(PAT * 0.75, () => hand.sound(pat)),
      tween(PAT, 1, (u) => {
        st.leaving = u < 1 ? { who: leaving, x: mix(CUSTOMER.x, STAGE_W + 260, ease(u)), y: CUSTOMER.y, size: 1, act: walk(leaving, u), hand: null } : null
      }),
      ...steps(leaving, PAT, 1, hand),
    )
  }
  beats.push(
    tween(start, arrive, (u) => {
      const e = ease(u)
      const at = { x: mix(door.x, COUNTER_SPOT.x, e), y: mix(door.y, COUNTER_SPOT.y, e), size: mix(door.size, 1, e) }
      st.customer = u < 1 ? at : null
      st.roll = carried(at, e)
      st.act = u < 1 ? walk(who, u) : {}
    }),
    ...steps(who, start, arrive, hand),
    cue(start + 0.8, () => hand.sound(slide)),
    tween(start + 0.8, 0.5, (u) => { st.pizzaY = mix(1040, PIZZA.y, ease(u)) }),
    cue(start + arrive, () => hand.sound(unroll)),
    // The roll opens into the card: as the card widens out of it, the roll is used up.
    tween(start + arrive, 0.4, (u) => {
      st.cardOpen = ease(u)
      st.roll = u < 1 ? { ...hang, fat, left: 1 - ease(u), turn: UPRIGHT } : null
    }),
    cue(start + arrive, () => hand.sound(babble(CHARACTERS[who].voice, 'ask'))),
  )
  const firstPiece = start + arrive + 0.4
  counts.forEach((count, i) => {
    beats.push(cue(firstPiece + i * 0.12, () => {
      st.cardCount = Math.max(st.cardCount, i + 1)
      hand.sound(tickOn(count))
    }))
  })
  beats.push(
    tween(firstPiece, 0.5, (u) => { st.tubsIn = ease(u) }),
    cue(firstPiece + Math.max(0.5, counts.length * 0.12), () => {
      st.cardCount = 99
      calm(st)
    }),
  )
  return beats
}

/** The first showing, once ever: the customer pokes a tub and one piece hops onto the pizza. `poke` is the moment the finger lands. */
export function firstShowing(st: Staging, tub: { x: number; y: number }, poke: () => void): Beat[] {
  const rest = { x: CUSTOMER.x - 230, y: CUSTOMER.y - 64 }
  return [
    tween(0, 0.8, (u) => {
      st.hand = { x: mix(rest.x, tub.x + 10, ease(u)), y: mix(rest.y, tub.y - 30, ease(u)) }
      st.act = { lean: -0.05 * ease(u), mouth: 0.3 * ease(u) }
      st.lookAt = tub
    }),
    cue(0.8, poke),
    tween(0.8, 0.25, (u) => { st.hand = { x: tub.x + 10, y: tub.y - 30 + 22 * hump(u) } }),
    tween(1.05, 0.8, (u) => {
      st.hand = { x: mix(tub.x + 10, rest.x, ease(u)), y: mix(tub.y - 30, rest.y, ease(u)) }
      st.act = { lean: -0.05 * (1 - ease(u)) }
    }),
    cue(1.9, () => calm(st)),
  ]
}

/** To the oven, shown once ever: the window lights and the customer nudges the board a hand's width towards the oven and lets it slide back. */
export function ovenShowing(st: Staging, hand: Stagehand): Beat[] {
  const rest = { x: CUSTOMER.x - 230, y: CUSTOMER.y - 64 }
  // The hand takes the board by its near edge, on the side away from the oven, and pushes.
  const edge = { x: PIZZA.x - PIZZA.r * 0.8, y: PIZZA.y - PIZZA.r * 0.66 }
  return [
    tween(0, 2, (u) => {
      st.ovenGlow = Math.min(ramp(u, 0, 0.2), 1 - ramp(u, 0.8, 1))
      st.lookAt = OVEN
    }),
    tween(0.1, 0.6, (u) => { st.hand = { x: mix(rest.x, edge.x, ease(u)), y: mix(rest.y, edge.y, ease(u)) } }),
    cue(0.7, () => hand.sound(slide)),
    tween(0.7, 0.8, (u) => {
      // The board goes a hand's width towards the oven and back, with the pizza on it.
      st.boardX = 46 * hump(u)
      st.pizzaX = PIZZA.x + st.boardX
      st.hand = { x: edge.x + st.boardX, y: edge.y }
    }),
    tween(1.5, 0.45, (u) => { st.hand = { x: mix(edge.x, rest.x, ease(u)), y: mix(edge.y, rest.y, ease(u)) } }),
    cue(2, () => {
      st.pizzaX = PIZZA.x
      st.boardX = 0
      calm(st)
    }),
  ]
}

/** Slides the pizza from where it is to a spot, in `lasts` seconds. */
function slidePizza(st: Staging, at: number, lasts: number, to: { x: number; y: number }, size: number): Beat {
  let from: { x: number; y: number; size: number } | null = null
  return tween(at, lasts, (u) => {
    from ??= { x: st.pizzaX, y: st.pizzaY, size: st.pizzaSize }
    const e = ease(u)
    st.pizzaX = mix(from.x, to.x, e)
    st.pizzaY = mix(from.y, to.y, e)
    st.pizzaSize = mix(from.size, size, e)
  })
}

/**
 * Baking: the pizza goes in, the window glows and each kind on it makes its
 * baking sound, and it slides out. A base with nothing on it puffs up like a
 * pillow and sinks with a wheeze.
 */
export function baking(st: Staging, kinds: readonly Kind[], hand: Stagehand): Beat[] {
  const empty = kinds.length === 0
  const beats: Beat[] = [
    cue(0, () => hand.sound(slide)),
    slidePizza(st, 0, 0.5, OVEN_MOUTH, 0.42),
    cue(0.5, () => {
      st.pizzaHidden = true
      hand.sound(door)
    }),
    // The door comes up and shuts behind it, and opens again before it slides out; its window glows while it bakes.
    tween(0.5, 0.2, (u) => { st.door = ease(u) }),
    tween(0.5, 1.8, (u) => { st.ovenGlow = Math.min(1, ramp(u, 0, 0.15)) * (u < 1 ? 1 : 0.4) }),
    tween(2.1, 0.2, (u) => { st.door = 1 - ease(u) }),
    ...kinds.map((kind, i) => cue(0.8 + i * (1.3 / Math.max(1, kinds.length)), () => hand.sound(bake(kind)))),
    cue(2.3, () => {
      st.pizzaHidden = false
      st.puffed = empty ? 1 : 0
      hand.sound(door)
    }),
    slidePizza(st, 2.3, 0.6, PIZZA, 1),
    // As it slides out each kind does its baking move once (pieceMotion.ts), and then lies still.
    tween(2.3, 0.6, (u) => {
      st.ovenGlow = 0.4 * (1 - u)
      st.baking = u < 1 ? u : 0
    }),
  ]
  if (empty) beats.push(cue(3.1, () => hand.sound(wheeze)), tween(3.1, 0.9, (u) => { st.puffed = 1 - ease(u) }))
  beats.push(cue(empty ? 4 : 2.9, () => calm(st)))
  return beats
}

/** A baked pizza baked again: the oven hiccups and hands it straight back with a puff. */
export function bakedAlready(st: Staging, hand: Stagehand): Beat[] {
  return [
    cue(0, () => hand.sound(slide)),
    slidePizza(st, 0, 0.4, { x: OVEN_MOUTH.x - 60, y: OVEN_MOUTH.y }, 0.6),
    cue(0.4, () => {
      hand.sound(hiccup)
      // Handed straight back with a puff out of the oven's mouth.
      hand.puff?.({ x: OVEN_MOUTH.x - 70, y: OVEN_MOUTH.y - 50 })
    }),
    tween(0.4, 0.3, (u) => { st.ovenGlow = hump(u) }),
    slidePizza(st, 0.4, 0.55, PIZZA, 1),
    cue(0.95, () => calm(st)),
  ]
}

/** What the customer's body does for one piece too many, by kind: `u` through the beat, `big` for the one big version. */
function manyBody(kind: Kind, u: number, big: boolean): Delta {
  const k = big ? 1.5 : 1
  switch (kind) {
    case 'pepper':
      return { mouth: hump(u), lean: -0.05 * k * hump(u), blink: 0.6 * hump(u), squash: -0.05 * hump(u) }
    case 'mushroom':
      return { lift: 30 * k * Math.abs(Math.sin(u * Math.PI * (big ? 4 : 1))), squash: -0.08 * hump(u), mouth: 0.4 * hump(ramp(u, 0, 0.3)) }
    case 'olive':
      // One eye rolls right round, once for the piece, and the other stays where it was looking.
      return { rollX: Math.cos(u * TAU * (big ? 3 : 1)) * hump(u) * 1.6, rollY: Math.sin(u * TAU * (big ? 3 : 1)) * hump(u) * 1.6, lean: big ? 0.08 * Math.sin(u * TAU * 2) : 0 }
    case 'cheese':
      return { lean: -0.1 * k * hump(u), mouth: 0.6 * hump(u), squash: -0.04 * hump(u) }
    case 'sock':
      return { blink: hump(u), squash: 0.08 * k * hump(u), lean: -0.04 * hump(u), part: -0.8 * hump(u) }
    case 'worm':
      // It giggles through a shut grin: an open mouth would hang down into the wriggle's way.
      return { squash: 0.09 * k * Math.sin(u * TAU * (big ? 6 : 3)) * (1 - u), lean: 0.04 * Math.sin(u * TAU * (big ? 4 : 2)), mouth: u > 0 && u < 1 ? -1 : 0, part: Math.sin(u * TAU * 4) }
  }
}

/**
 * A kind it cannot stand, on its pizza: each customer's own answer, on top of
 * what that kind does to anyone. Bim's eye stalk ties itself in a knot, steam
 * drives Grum's belly out like a lamp, Fizz's neck goes limp, every hair on
 * Mops stands on end, and Ooze melts into a puddle and pulls itself together.
 */
export function cannotStandAct(who: Customer, u: number): Delta {
  switch (who) {
    case 'bim':
      return { part: 2.2 * Math.sin(u * TAU * 3) * (1 - u) + 1.4 * hump(u), lookX: Math.sin(u * TAU * 3), lift: 10 * hump(u) }
    case 'grum':
      return { part: 2 * hump(u), squash: -0.06 * hump(u), blink: 0.8 * hump(ramp(u, 0.2, 0.8)) }
    case 'fizz':
      return { squash: 0.3 * hump(u), part: -1.4 * hump(u), lean: 0.08 * Math.sin(u * TAU) * hump(u) }
    case 'mops':
      return { part: 1.7 * hump(ramp(u, 0, 0.7)), squash: -0.12 * hump(ramp(u, 0, 0.5)), blink: -0.4 * hump(u) }
    case 'ooze':
      return { squash: 0.46 * hump(ramp(u, 0, 0.6)) - 0.12 * hump(ramp(u, 0.6, 1)), blink: hump(ramp(u, 0.1, 0.5)) }
  }
}

/**
 * Every reaction is played in the customer's own manner, which changes its
 * size, speed and shape and never the number of beats, since one beat is one
 * piece: Bim's is quick with one hop, Grum's slow and late with his belly following,
 * Fizz's with a shiver through it, Mops's with her ears a moment behind, and
 * Ooze's with a sag. This is added to what the kind does.
 */
export function mannerAct(who: Customer, u: number): Delta {
  switch (who) {
    case 'bim':
      return { lift: 22 * hump(ramp(u, 0, 0.5)), part: 0.7 * Math.sin(u * TAU) * (1 - u) }
    case 'grum':
      return { part: 1.1 * hump(ramp(u, 0.3, 1)), squash: 0.03 * hump(ramp(u, 0.4, 1)) }
    case 'fizz':
      return { lean: 0.025 * Math.sin(u * TAU * 7) * (1 - u), part: 0.7 * Math.sin(u * TAU * 7) * (1 - u) }
    case 'mops':
      return { part: -0.7 * hump(ramp(u, 0, 0.4)) + 0.9 * hump(ramp(u, 0.4, 1)), blink: 0.35 * hump(u), lean: 0.04 * hump(u) }
    case 'ooze':
      return { squash: 0.09 * hump(ramp(u, 0.2, 1)), lean: 0.03 * Math.sin(u * TAU) }
  }
}

/** Adds one set of pose changes to another. */
function plus(a: Delta, b: Delta): Delta {
  const out: Delta = { ...a }
  for (const key of Object.keys(b) as (keyof Delta)[]) out[key] = (out[key] ?? 0) + (b[key] ?? 0)
  return out
}

/** What its body does for one piece too few, by kind, while it pats the card and looks at that kind's tub. */
function fewBody(kind: Kind, u: number): Delta {
  switch (kind) {
    case 'pepper':
      return { mouth: 0.9 * hump(u), part: 0.5 * Math.sin(u * TAU * 3) }
    case 'mushroom':
      // Nose down to the board, snuffling along it.
      return { lean: 0.1 * hump(u), squash: 0.16 * hump(u) + 0.03 * Math.sin(u * TAU * 5) * hump(u), lookY: hump(u) }
    case 'olive':
      return { lean: -0.04 * hump(u), part: 0.7 * hump(u) }
    case 'cheese':
      return { mouth: 0.3 * hump(u), lean: -0.06 * hump(ramp(u, 0.3, 1)), squash: -0.03 * hump(u) }
    case 'sock':
      return { lift: 12 * hump(u), lean: -0.09 * hump(u), part: Math.sin(u * TAU * 4) * hump(u) }
    case 'worm':
      // The tongue that wriggles towards the tub is drawn with the reaction (effects.ts).
      return { mouth: 0.6 * hump(u), lean: 0.03 * Math.sin(u * TAU * 3) }
  }
}

/** How far to its tub side the string that is not there hangs. */
export const STRING_OUT = 40

/**
 * Where its free hand goes for a piece that is missing, in stage units, or
 * null when that kind is mimed with the hand at rest: it fans its open mouth
 * for a pepper, holds a ring of fingers to its eye for an olive, plucks a
 * string that is not there for cheese, and puts its hand on its hip while it
 * lifts a foot for a sock.
 */
export function fewHand(who: Customer, kind: Kind, u: number): { x: number; y: number } | null {
  const c = CHARACTERS[who]
  const mouth = { x: CUSTOMER.x, y: CUSTOMER.y - c.mouthAt * c.height }
  switch (kind) {
    case 'pepper':
      return { x: mouth.x - 64 + 30 * Math.sin(u * TAU * 5), y: mouth.y + 14 }
    case 'olive': {
      const eye = eyes(who)[0]
      return { x: CUSTOMER.x + eye.x - eye.r - 16, y: CUSTOMER.y + eye.y + eye.r * 0.7 }
    }
    case 'cheese': {
      // Out to the string, a pull, and a let go: three plucks a beat.
      const pull = (u * 3) % 1
      return { x: CUSTOMER.x - c.halfWidth * 0.3 - STRING_OUT + 26 * (pull < 0.7 ? pull / 0.7 : 0), y: CUSTOMER.y - c.height * 0.5 }
    }
    case 'sock':
      // On its hip, inside its own outline, out of the way of the leg it lifts on that side.
      return { x: CUSTOMER.x - c.halfWidth * 0.5, y: CUSTOMER.y - c.height * 0.34 }
    default:
      return null
  }
}

/** Its nose, for a hand to pinch: just over its mouth. */
function nose(who: Customer): { x: number; y: number } {
  const c = CHARACTERS[who]
  return { x: CUSTOMER.x - 6, y: CUSTOMER.y - c.mouthAt * c.height - 20 }
}

/**
 * A customer's own answer to the kind it cannot stand, from `from` for
 * `lasts` seconds: its sound, the part of it that shows it (`upset`, drawn in
 * monsterArt.ts), and Bim's other hand, the one that holds its card, which
 * unpicks the knot in its own stalk before the answer is over. With `body`, what its whole body does is
 * added to whatever the scene has it doing: the beats of this answer must
 * then come after the beats that set `st.act`. It is the same answer on a
 * baked pizza and on a raw one.
 */
function cannotStandAnswer(st: Staging, who: Customer, from: number, lasts: number, hand: Stagehand, body: boolean): Beat[] {
  const knot = { x: CUSTOMER.x, y: CUSTOMER.y - CHARACTERS[who].height - 44 }
  return [
    cue(from, () => hand.sound(cannotStandVoice(who))),
    tween(from, lasts, (u) => {
      st.upset = u < 1 ? Math.min(ramp(u, 0, 0.2), 1 - ramp(u, 0.72, 1)) : 0
      if (body && u < 1) st.act = plus(st.act, cannotStandAct(who, u))
      // Bim unpicks it with the hand that holds its card, which stays up by itself for that long: its free hand is on its nose for as long as a cloud hangs there.
      if (who === 'bim') st.cardHand = u > 0.55 && u < 1 ? { x: knot.x + 20 + 12 * Math.sin(u * TAU * 5), y: knot.y } : null
    }),
  ]
}

/**
 * The tasting: the lean and the lick, then the difference between the card
 * and the pizza played out one piece at a time, then the push back to the
 * board. `extras` gives, for a kind with too many, the ids of the pieces on
 * the pizza that have no partner; `missing` gives, for a kind with too few,
 * where on the card the drawn pieces with no partner stand, and the index of
 * each on the card.
 */
export function tasting(
  st: Staging,
  plan: TastingPlan,
  who: Customer,
  extras: (kind: Kind, index: number) => number,
  missing: (kind: Kind, index: number) => { index: number; x: number; y: number },
  tubOf: (kind: Kind) => { x: number; y: number } | null,
  hand: Stagehand,
  pairs: readonly Pair[] = [],
): Beat[] {
  const voice = CHARACTERS[who].voice
  const beats: Beat[] = [
    slidePizza(st, 0, 0.35, SERVE, 1),
    cue(0.9, () => hand.sound(lick)),
    tween(0, plan.lick.lasts, (u) => {
      // The tongue comes down slowly and is on the pizza as the lick ends: the reaction starts at that touch.
      st.lick = ease(ramp(u, 0.3, 1))
      st.act = { lean: 0.05 * ease(u), mouth: 0.7 * ease(u), smile: 0.8 * hump(u), brow: 0.5 * hump(u), blink: 0.7 * hump(ramp(u, 0.4, 1)) }
      st.lookAt = SERVE
    }),
    // The tongue goes back in while the first reaction plays. Before a wriggle runs down the body it is in at once, so the two never cross.
    tween(plan.lick.lasts, plan.tastes[0]?.kind === 'worm' && plan.tastes[0].way === 'many' ? 0 : 0.3, (u) => { st.lick = 1 - ease(u) }),
  ]
  // While it leans in and licks, every piece that has a partner is shown with it, pair by pair. What is played after is what was left over.
  beats.push(...pairing(st, pairs, 0.4, plan.lick.lasts - 0.7, hand))
  for (const taste of plan.tastes) {
    if (taste.way === 'many') {
      let hot: number[] | null = null
      beats.push(
        cue(taste.at, () => {
          hand.sound(inManner(tooMany(taste.kind, taste.big), who))
          // The two at the door see it too.
          hand.crowd?.()
        }),
        tween(taste.at, taste.lasts, (u) => {
          st.effect = u < 1 ? { kind: taste.kind, way: 'many', big: taste.big, t: u, who } : null
          // One piece sizzles for its beat; in a big version every piece with no partner sizzles at once.
          st.sizzling = u < 1 ? (hot ??= Array.from({ length: taste.count }, (_, i) => extras(taste.kind, taste.index + i))) : NONE
          st.sizzle = hump(u)
          st.pairing = false
          const body = plus(manyAct(taste.kind, u, taste.big), u < 1 ? mannerAct(who, u) : {})
          st.act = taste.kind === CHARACTERS[who].cannotStand && u < 1 ? plus(body, cannotStandAct(who, u)) : body
          // A stink cloud has its nose pinched for as long as it hangs there.
          if (taste.kind === 'sock') st.hand = u < 1 ? nose(who) : null
          st.lookAt = null
          if (taste.big && taste.kind === 'pepper' && u > 0.6) st.soot = 1
        }),
      )
    } else {
      // One drawn piece is patted for its beat; in a big version the hand goes along every one that has no partner.
      const spots = Array.from({ length: taste.count }, (_, i) => missing(taste.kind, taste.index + i))
      const indexes = spots.map((spot) => spot.index)
      beats.push(
        cue(taste.at, () => {
          hand.sound(pat)
          hand.sound(rumble(taste.kind, voice, taste.big))
        }),
        tween(taste.at, taste.lasts, (u) => {
          st.effect = u < 1 ? { kind: taste.kind, way: 'few', big: taste.big, t: u, who } : null
          st.patted = u < 1 ? indexes : NONE
          st.pat = hump(u)
          st.pairing = false
          const spot = spots[Math.min(spots.length - 1, Math.floor(u * spots.length))]
          const each = (u * spots.length) % 1
          st.cardHand = u < 1 ? { x: CARD.x + spot.x + 8, y: CARD.y + spot.y + 14 - 10 * hump(ramp(each, 0, 0.4)) } : null
          st.act = u < 1 ? plus(plus(fewAct(taste.kind, u, taste.big), mannerAct(who, u)), { part: 0.8 * Math.sin(u * TAU * 4) * (1 - u), squash: taste.big ? 0.12 * hump(u) : 0 }) : {}
          st.hand = u < 1 ? fewHand(who, taste.kind, u) : null
          st.lookAt = u < 1 ? tubOf(taste.kind) : null
        }),
      )
    }
  }
  // The kind it cannot stand gets this customer's own answer, over all of that kind's beats: it comes on as the
  // first one starts and is gone as the last one ends. Each of those beats adds the body's share itself.
  const hated = plan.tastes.filter((t) => t.way === 'many' && t.kind === CHARACTERS[who].cannotStand)
  if (hated.length > 0) beats.push(...cannotStandAnswer(st, who, hated[0].at, hated[hated.length - 1].at + hated[hated.length - 1].lasts - hated[0].at, hand, false))
  beats.push(
    // The push back has the board's sound and no voice: nothing here is a sound that means wrong.
    cue(plan.push.at, () => hand.sound(slide)),
    tween(plan.push.at, plan.push.lasts, (u) => {
      // It shakes off whatever the tasting left on it: soot is gone by the time the pizza is back.
      st.act = st.soot > 0 ? { lean: 0.07 * Math.sin(u * TAU * 3) * (1 - u), blink: hump(u) } : { lean: 0.04 * hump(u) }
      if (u > 0.5) st.soot = 0
      st.hand = u < 1 ? { x: st.pizzaX - 40, y: st.pizzaY - PIZZA.r * 0.8 } : null
    }),
    slidePizza(st, plan.push.at, plan.push.lasts, PIZZA, 1),
    cue(plan.seconds, () => calm(st)),
  )
  return beats
}

/**
 * A pizza served raw: the dough sticks to the tongue, stretches like gum and
 * snaps back, and the customer looks at the oven. With the kind it cannot
 * stand on it (`hated`), its own answer to that kind plays while the dough
 * stretches: raw or baked, that reaction comes every time.
 */
export function rawTasting(st: Staging, who: Customer, kind: Kind, hand: Stagehand, hated = false): Beat[] {
  const t1 = RAW.lick, t2 = t1 + RAW.stretch, t3 = t2 + RAW.snap, t4 = t3 + RAW.look
  // After the beats it adds to: while the dough stretches and snaps, the whole of its answer plays, body and all.
  const answer = hated ? cannotStandAnswer(st, who, t1, RAW.stretch + RAW.snap, hand, true) : []
  return [
    slidePizza(st, 0, 0.35, SERVE, 1),
    cue(0.4, () => hand.sound(lick)),
    tween(0, t1, (u) => {
      st.lick = ease(ramp(u, 0.25, 1))
      st.act = { lean: 0.05 * hump(u), mouth: 0.7 * ease(u) }
      st.lookAt = SERVE
    }),
    cue(t1, () => hand.sound(stretch)),
    tween(t1, RAW.stretch, (u) => {
      st.lick = 1
      st.effect = { kind, way: 'raw', big: false, t: u }
      st.act = { lean: -0.12 * ease(u), mouth: 0.8, squash: -0.06 * ease(u) }
    }),
    cue(t2, () => hand.sound(snap)),
    tween(t2, RAW.snap, (u) => {
      st.lick = 1 - u
      st.effect = null
      st.act = { squash: 0.2 * hump(u), blink: 1 }
    }),
    cue(t3, () => hand.sound(babble(CHARACTERS[who].voice, 'ask'))),
    tween(t3, RAW.look, (u) => {
      st.lick = 0
      st.lookAt = OVEN
      st.ovenGlow = 0.8 * hump(u)
      st.act = { lean: 0.06 * hump(u), mouth: 0.2 }
    }),
    ...answer,
    cue(t4, () => hand.sound(slide)),
    slidePizza(st, t4, RAW.push, PIZZA, 1),
    cue(RAW.seconds, () => calm(st)),
  ]
}

/** Each customer's own delight at a whole pizza eaten. */
function delightBody(who: Customer, u: number): Delta {
  switch (who) {
    case 'bim':
      return { lift: 40 * Math.abs(Math.sin(u * Math.PI * 4)), part: 1.6 * Math.sin(u * TAU * 3), mouth: 0.6 }
    case 'grum':
      return { part: 1.8 * Math.sin(u * TAU * 3) * hump(u), lean: 0.08 * Math.sin(u * TAU), squash: 0.05 * hump(u), mouth: 0.5 }
    case 'fizz':
      return { squash: -0.2 * hump(u), part: 1.4 * Math.sin(u * TAU * 7), lean: 0.03 * Math.sin(u * TAU * 5), mouth: 0.7 }
    case 'mops':
      return { part: 1.2 * Math.abs(Math.sin(u * Math.PI * 3)), squash: -0.07 * hump(u), blink: 0.8 * hump(u), mouth: 0.6 * hump(u) }
    case 'ooze':
      return { squash: 0.3 * hump(ramp(u, 0, 0.5)) - 0.18 * hump(ramp(u, 0.5, 1)), tongue: hump(ramp(u, 0.4, 1)), mouth: 0.6, lean: 0.1 * Math.sin(u * TAU) }
  }
}

/** A piece on the pizza and the drawn piece on the card it pairs off with: the piece's id, and the picture's place on the card. */
export type Pair = { id: number; index: number }

/**
 * The pairing, shown: each piece that has a partner bobs together with its
 * drawn piece on the card, pair by pair along the card, each with one step of
 * the tune the card ticked when it opened. It starts at `from` and is over
 * within `span` seconds, however many pairs there are. What is left over
 * when it ends had no partner.
 */
export function pairing(st: Staging, pairs: readonly Pair[], from: number, span: number, hand: Stagehand): Beat[] {
  const step = Math.min(0.16, span / Math.max(1, pairs.length))
  return pairs.flatMap((pair, k) => [
    cue(from + k * step, () => hand.sound(tickOn(k + 1))),
    tween(from + k * step, step, (u) => {
      st.pairing = u < 1
      st.sizzling = u < 1 ? [pair.id] : NONE
      st.patted = u < 1 ? [pair.index] : NONE
      st.sizzle = st.pat = 0.7 * hump(u)
    }),
  ])
}

/** How long the pairing takes before an eating: a breath, and a step for each pair. */
export function pairingSeconds(pairs: number): number {
  return pairs === 0 ? 0 : 0.2 + pairs * Math.min(0.16, PAIRING_SPAN / pairs)
}
const PAIRING_SPAN = 1.2

/** Where the pizza is held to be bitten: in front of the customer's mouth. */
export function biteSpot(who: Customer): { x: number; y: number } {
  const c = CHARACTERS[who]
  return { x: CUSTOMER.x, y: CUSTOMER.y - c.mouthAt * c.height + 124 }
}

export const EATING_SECONDS = 7

/**
 * The eating, the ending of a cycle: three bites, each taking a third of the
 * pizza with the crunch of the kinds on it, the customer's own delight, a burp
 * in the colours of what it ate, and it settles back, full.
 * `eaten` runs when the last bite is gone. `byBite` is the kinds that lie in
 * the third each bite takes, so each bite has the crunch of what is in it.
 * Before the first bite every piece is shown with its partner on the card
 * (`pairs`): none is left over, which is why the pizza is eaten.
 */
export function eating(st: Staging, who: Customer, kinds: readonly Kind[], eaten: () => void, hand: Stagehand, byBite: readonly (readonly Kind[])[] = [kinds, kinds, kinds], pairs: readonly Pair[] = []): Beat[] {
  const paired = pairing(st, pairs, 0.1, PAIRING_SPAN, hand)
  return paired.length === 0 ? bites(st, who, kinds, eaten, hand, byBite) : followedBy([...paired, cue(pairingSeconds(pairs.length), () => {})], bites(st, who, kinds, eaten, hand, byBite))
}

function bites(st: Staging, who: Customer, kinds: readonly Kind[], eaten: () => void, hand: Stagehand, byBite: readonly (readonly Kind[])[]): Beat[] {
  const voice = CHARACTERS[who].voice
  const kind = kinds[0]
  const beats: Beat[] = [
    slidePizza(st, 0, 0.6, biteSpot(who), 0.8),
    tween(0, 0.6, (u) => {
      st.act = { mouth: ease(u), lean: 0.03 * ease(u) }
      st.lookAt = { x: st.pizzaX, y: st.pizzaY }
    }),
  ]
  for (let n = 0; n < 3; n++) {
    const at = 0.7 + n * 0.8
    beats.push(
      tween(at, 0.8, (u) => {
        st.bites = Math.max(st.bites, n + ramp(u, 0.3, 0.45))
        // A huge bite, then chewing with its cheeks full and its eyes shut in bliss, crumbs flying.
        st.act = { mouth: u < 0.4 ? 1 : 0.12 + 0.12 * Math.sin(u * TAU * 4), squash: u < 0.4 ? -0.07 * hump(u / 0.4) : 0.06 * Math.sin(u * TAU * 4), lean: 0.03, cheeks: u < 0.4 ? 0 : 1, blink: u < 0.4 ? 0 : 0.8, brow: u < 0.4 ? 0.9 : 0.3, smile: 0.9, pupil: u < 0.4 ? 0.3 : 0 }
        st.effect = u > 0.34 && u < 1 ? { kind, way: 'crumbs', big: false, t: ramp(u, 0.34, 1) } : null
        st.lookAt = null
      }),
      cue(at + 0.34, () => hand.sound(bite(n, byBite[n] ?? []))),
    )
  }
  beats.push(
    cue(3.1, () => {
      st.bites = 3
      st.pizzaHidden = true
      eaten()
      hand.sound(babble(voice, 'glee'))
    }),
    tween(3.2, 2.2, (u) => { st.act = u < 1 ? delightAct(who, u) : {} }),
    cue(5.5, () => {
      hand.sound(burp(voice))
      hand.crowd?.()
    }),
    tween(5.5, 0.8, (u) => {
      st.effect = u < 1 ? { kind, way: 'burp', big: false, t: u, kinds } : null
      // The burp surprises it more than anyone: eyes wide, then a hand to its mouth and red cheeks.
      st.act = { mouth: 0.9 * hump(ramp(u, 0, 0.5)), squash: -0.1 * hump(ramp(u, 0, 0.3)) + 0.05 * hump(ramp(u, 0.3, 1)), brow: hump(u), pupil: -0.35 * hump(u), pucker: ramp(u, 0.5, 0.8), cheeks: ramp(u, 0.4, 0.8) }
      st.hand = u > 0.5 && u < 1 ? { x: CUSTOMER.x - 40, y: st.pizzaHidden ? CUSTOMER.y - CHARACTERS[who].mouthAt * CHARACTERS[who].height + 20 : CUSTOMER.y } : null
    }),
    // It settles back, full, and the card is rolled away.
    tween(6.3, 0.7, (u) => {
      st.act = { squash: 0.06 * ease(u), blink: 0.5 * hump(u), part: 0.5 * ease(u), cheeks: 1 - u, smile: 0.6 }
      st.cardOpen = 1 - ease(u)
    }),
    cue(EATING_SECONDS, () => calm(st)),
  )
  return beats
}

/** Where the free hand is as it pulls a sock on, `on` 0 at the mouth to 1 with the sock where it is worn, in stage units. */
export function wornSpot(who: Customer, on: number): { x: number; y: number } {
  const c = CHARACTERS[who]
  // Up the tubs' side of its head, outside its eyes, to where the sock is worn (`WORN` in effects.ts).
  const from = { x: CUSTOMER.x - c.halfWidth * 0.8, y: CUSTOMER.y - c.mouthAt * c.height + 10 }, eye = eyes(who)[0], to = { x: CUSTOMER.x + Math.min(-c.halfWidth * WORN.x, eye.x - eye.r - WORN.clear) - 4, y: CUSTOMER.y - c.height * WORN.y + 10 }
  return { x: mix(from.x, to.x, ease(on)), y: mix(from.y, to.y, ease(on)) }
}

/** How long a kind's own scene takes when it is fed by hand, before its owner's manner makes it quicker or slower. */
export const FED_SECONDS = 1.1

/** When, through a piece of cheese fed by hand, each note of its harp is plucked: with the plucks of `gulp('cheese')`. The scene and the sound are stretched alike by the customer's manner, so the shares are the same for everyone. */
export const PLUCKS: readonly number[] = [0.3, 0.46, 0.62, 0.78].map((at) => at / FED_SECONDS)

/**
 * The two hands for cheese fed by hand, `u` through it, in stage units: the
 * free hand pulls the piece out from the mouth into a long string towards
 * the tubs' side and holds it there, and the other hand comes over from the
 * card and plucks the string in the middle, dipping at each note.
 */
export function harpHands(who: Customer, u: number): { pull: { x: number; y: number }; pluck: { x: number; y: number } } {
  const c = CHARACTERS[who]
  const mouth = { x: CUSTOMER.x, y: CUSTOMER.y - c.mouthAt * c.height + 10 }
  const out = ease(ramp(u, 0, 0.24))
  const pull = { x: mouth.x - 30 - (c.halfWidth + 40) * out, y: mouth.y + 10 + 34 * out }
  const dip = PLUCKS.reduce((most, at) => Math.max(most, hump(ramp(u, at - 0.035, at + 0.035))), 0)
  const pluck = { x: (mouth.x + pull.x) / 2 + 14, y: (mouth.y + pull.y) / 2 + 4 + 22 * dip }
  return { pull, pluck }
}

/** What its body does with a piece fed by hand, by kind. */
function fedBody(kind: Kind, u: number): Delta {
  switch (kind) {
    case 'pepper':
      return { squash: 0.1 * hump(ramp(u, 0, 0.3)), blink: hump(ramp(u, 0.2, 0.7)), part: 1.2 * hump(ramp(u, 0.5, 1)) }
    case 'mushroom':
      return { squash: 0.05 * Math.sin(u * TAU * 3), mouth: 0.2, lookY: -0.8 * hump(ramp(u, 0.4, 1)) }
    case 'olive':
      return { squash: -0.08 * hump(ramp(u, 0, 0.3)) + 0.1 * hump(ramp(u, 0.3, 1)), lookY: 0.9 * ramp(u, 0.2, 0.9) * (u < 1 ? 1 : 0) }
    case 'cheese':
      return { lean: -0.08 * hump(u), mouth: 0.5 * hump(u), part: 0.6 * Math.sin(u * TAU * 5) * (1 - u) }
    case 'sock':
      return { part: 1.1 * hump(u), lean: 0.05 * Math.sin(u * TAU * 2), mouth: 0.4 * hump(u) }
    case 'worm':
      return { mouth: 0.6 * (1 - u), tongue: 0.6 * hump(u), squash: 0.04 * Math.sin(u * TAU * 4), blink: hump(ramp(u, 0.7, 1)) }
  }
}

/**
 * A piece fed by hand: the gulp, the kind's own little scene, and then the
 * customer's own answer. The kind it loves gets its dance; the kind it cannot
 * stand is spat neatly back into its tub (`spit`).
 */
export function handFed(st: Staging, who: Customer, kind: Kind, spit: () => void, hand: Stagehand): Beat[] {
  const taste = CHARACTERS[who]
  const spatSock = kind === 'sock' && kind === taste.cannotStand
  // A sock it cannot stand goes into its mouth like anything else, to be spat back: it is not pulled on and worn first, and makes no snap.
  const voice = spatSock ? gulp(kind).slice(0, 1) : gulp(kind)
  // The kind's own little scene takes as long as its sound does in this customer's manner: quick for the quick
  // ones and slow for the slow ones, so that what is heard and what is drawn stay together all through it.
  const lasts = FED_SECONDS * mannerLength(voice, who)
  const beats: Beat[] = [
    cue(0, () => hand.sound(inManner(voice, who))),
    tween(0, lasts, (u) => {
      st.effect = u < 1 && !spatSock ? { kind, way: 'fed', big: false, t: u, who } : null
      // Its own manner goes into this as into every reaction.
      st.act = u < 1 ? plus(fedAct(kind, u), mannerAct(who, u)) : fedAct(kind, u)
      // Cheese is pulled out into a string with one hand and plucked with the other. A sock is pulled on by hand.
      const harp = kind === 'cheese' && u < 1 ? harpHands(who, u) : null
      st.hand = harp ? harp.pull : kind === 'sock' && !spatSock && u > 0.15 && u < 0.85 ? wornSpot(who, ramp(u, 0.15, 0.5)) : null
      st.cardHand = harp ? harp.pluck : null
    }),
  ]
  if (kind === taste.loves) {
    beats.push(cue(lasts, () => hand.sound(babble(taste.voice, 'glee'))), tween(lasts, 1.3, (u) => { st.act = u < 1 ? delightAct(who, u) : {} }), cue(lasts + 1.3, () => calm(st)))
  } else if (kind === taste.cannotStand) {
    beats.push(
      cue(lasts, () => hand.sound(babble(taste.voice, 'grumble'))),
      tween(lasts, 0.5, (u) => { st.act = { squash: 0.14 * hump(u), blink: 1, mouth: 0.2 } }),
      cue(lasts + 0.5, spit),
      tween(lasts + 0.5, 0.4, (u) => { st.act = { mouth: hump(u), lean: 0.06 * hump(u), squash: -0.1 * hump(u) } }),
      cue(lasts + 0.9, () => calm(st)),
    )
  } else beats.push(cue(lasts, () => calm(st)))
  // A sock is pulled on and worn until the customer next moves; one it cannot stand is spat back instead.
  if (kind === 'sock' && kind !== taste.cannotStand) beats.push(cue(lasts, () => { st.wearing = true }))
  return beats
}

// --- Faces ---------------------------------------------------------------------
// Every result a child causes is a small joke, and the joke is on the face.

/** The face for one piece too many, by kind. */
function manyFace(kind: Kind, u: number, big: boolean): Delta {
  const h = hump(u), k = big ? 1 : 0.8
  switch (kind) {
    case 'pepper':
      // Too hot: eyes like pinheads, brows in its hairline, a face going red.
      return { brow: k * h, pupil: -0.45 * h, cheeks: h }
    case 'mushroom':
      // A hiccup takes it by surprise every time.
      return { brow: 0.9 * hump(u * 2), pucker: 0.9 * hump(u * 2), pupil: -0.2 * h }
    case 'olive':
      // Dizzy, and rather enjoying it.
      return { smile: 0.5 * h, brow: 0.5 * Math.sin(u * TAU * 2) * h, frown: -0.4 * h }
    case 'cheese':
      // Stuck: it pulls, cross-eyed with effort.
      return { frown: 0.8 * h, brow: -0.6 * h, smile: -0.4 * h, cheeks: 0.6 * h }
    case 'sock':
      // The smell: everything screwed up tight.
      return { frown: h, brow: -0.9 * h, smile: -1.2 * h, pucker: 0.3 * h }
    case 'worm':
      // It tickles.
      return { smile: 1.2 * h, cheeks: 0.9 * h, brow: 0.6 * h }
  }
}

/** The face for a piece that is missing: big pleading eyes at the tub, a mouth gone small. */
function fewFace(kind: Kind, u: number, big: boolean): Delta {
  const h = hump(u), k = big ? 1.4 : 1
  // Its eyes are wide open for this, whoever it is: the look at the tub is what the beat is for, and a sleepy lid would hide it.
  const longing: Delta = { frown: -0.9 * h * k, brow: 0.5 * h, pupil: 0.3 * h * k, smile: -0.7 * h, blink: u > 0 && u < 1 ? -1 : 0 }
  // Each kind is missed in its own way.
  const own: Record<Kind, Delta> = {
    pepper: { cheeks: 0.5 * h },
    mushroom: { pucker: 0.6 * h },
    olive: { blink: 0.2 * h, brow: 0.3 * h },
    cheese: { smile: -0.4 * h },
    sock: { smile: 0.5 * h, cheeks: 0.4 * h },
    worm: { pucker: 0.4 * h, brow: 0.2 * h },
  }
  return plus(longing, own[kind])
}

/** The face for a piece fed by hand, by kind. */
function fedFace(kind: Kind, u: number): Delta {
  const h = hump(u)
  switch (kind) {
    case 'pepper':
      return { cheeks: h, brow: 0.8 * h, pupil: -0.3 * h, pucker: 0.5 * hump(ramp(u, 0.3, 1)) }
    case 'mushroom':
      return { smile: 0.6 * h, brow: 0.6 * hump(ramp(u, 0.4, 1)) }
    case 'olive':
      return { pucker: 0.9 * hump(ramp(u, 0, 0.5)), brow: 0.7 * h, pupil: 0.2 * h }
    case 'cheese':
      return { smile: 0.8 * h, brow: -0.3 * h }
    case 'sock':
      return { smile: 1.1 * h, cheeks: 0.7 * h, brow: 0.5 * h }
    case 'worm':
      return { pucker: 0.8 * hump(ramp(u, 0, 0.7)), cheeks: 0.5 * h, smile: 0.8 * hump(ramp(u, 0.7, 1)) }
  }
}

/** One piece too many: what its body does, and its face. */
export function manyAct(kind: Kind, u: number, big: boolean): Delta {
  const act = plus(manyBody(kind, u, big), manyFace(kind, u, big))
  // Far too many is past a joke: the whole face goes with it.
  return big ? plus(act, { cheeks: 0.6 * hump(u), brow: 0.4 * hump(u), pupil: -0.2 * hump(u) }) : act
}

/** One piece too few: what its body does, and its face. `big` is the one who gets none of what it wanted. */
export function fewAct(kind: Kind, u: number, big = false): Delta {
  return plus(fewBody(kind, u), fewFace(kind, u, big))
}

/** A piece fed by hand: what its body does, and its face. */
export function fedAct(kind: Kind, u: number): Delta {
  return plus(fedBody(kind, u), fedFace(kind, u))
}

/** Each customer's own delight at a whole pizza eaten: its dance, and a face that cannot grin any wider. */
export function delightAct(who: Customer, u: number): Delta {
  const h = hump(u)
  return plus(delightBody(who, u), { smile: 1.2 * h, cheeks: 0.9 * h, pupil: 0.3 * h, brow: 0.6 * h })
}
