import { CHARACTERS, type Customer } from './customers'
import type { Kind } from './kinds'
import { CARD, CUSTOMER, OVEN, OVEN_MOUTH, PIZZA, SERVE } from './layout'
import type { Delta } from './motion'
import type { Beat } from './scene'
import { COUNTER_SPOT, calm, doorSpot, type Staging } from './staging'
import { RAW, type TastingPlan } from './tasting'
import { babble, bake, bite, burp, door, footstep, gulp, hiccup, lick, pat, rumble, slide, snap, stretch, tickOn, tooMany, unroll, wheeze, type VoiceSpec } from './voices'

// The short scenes, each a list of timed beats that move the staging (pack:
// game-design, endings-and-short-scenes.md). A scene is filled in from the
// state of play: which customer, which kinds, how many. Its outcome was saved
// before it started, so every beat here is only show: at progress 1 a beat
// leaves things where it was taking them, and a touch may jump there at once.

/** What a scene may ask of the kitchen while it plays. */
export type Stagehand = {
  /** Sounds a voice, unless the scene is being ended by a touch. */
  sound(spec: VoiceSpec): void
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
export function steppingUp(st: Staging, who: Customer, from: 'small' | 'big', leaving: Customer | null, counts: readonly number[], hand: Stagehand): Beat[] {
  const start = leaving ? 0.5 : 0
  const arrive = 1.3
  const door = doorSpot(from)
  const beats: Beat[] = [
    cue(0, () => {
      st.cardOpen = 0
      st.cardCount = 0
      st.tubsIn = 0
      st.pizzaY = 1040
      st.customer = { ...door }
    }),
  ]
  if (leaving) {
    beats.push(tween(0, 1, (u) => {
      st.leaving = u < 1 ? { who: leaving, x: mix(CUSTOMER.x, -260, ease(u)), y: CUSTOMER.y, size: 1, act: walk(leaving, u) } : null
    }), ...steps(leaving, 0, 1, hand))
  }
  beats.push(
    tween(start, arrive, (u) => {
      const e = ease(u)
      st.customer = u < 1 ? { x: mix(door.x, COUNTER_SPOT.x, e), y: mix(door.y, COUNTER_SPOT.y, e), size: mix(door.size, 1, e) } : null
      st.act = u < 1 ? walk(who, u) : {}
    }),
    ...steps(who, start, arrive, hand),
    cue(start + 0.8, () => hand.sound(slide)),
    tween(start + 0.8, 0.5, (u) => { st.pizzaY = mix(1040, PIZZA.y, ease(u)) }),
    cue(start + arrive, () => hand.sound(unroll)),
    tween(start + arrive, 0.4, (u) => { st.cardOpen = ease(u) }),
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
  const rest = { x: CUSTOMER.x + 150, y: CUSTOMER.y - 30 }
  return [
    tween(0, 0.8, (u) => {
      st.hand = { x: mix(rest.x, tub.x + 10, ease(u)), y: mix(rest.y, tub.y - 30, ease(u)) }
      st.act = { lean: -0.06 * ease(u), mouth: 0.3 * ease(u) }
      st.lookAt = tub
    }),
    cue(0.8, poke),
    tween(0.8, 0.25, (u) => { st.hand = { x: tub.x + 10, y: tub.y - 30 + 22 * hump(u) } }),
    tween(1.05, 0.8, (u) => {
      st.hand = { x: mix(tub.x + 10, rest.x, ease(u)), y: mix(tub.y - 30, rest.y, ease(u)) }
      st.act = { lean: -0.06 * (1 - ease(u)) }
    }),
    cue(1.9, () => calm(st)),
  ]
}

/** To the oven, shown once ever: the window lights and the customer nudges the board a hand's width towards the oven and lets it slide back. */
export function ovenShowing(st: Staging, hand: Stagehand): Beat[] {
  const rest = { x: CUSTOMER.x + 150, y: CUSTOMER.y - 30 }
  const edge = { x: PIZZA.x - 40, y: PIZZA.y - PIZZA.r * 0.9 }
  return [
    tween(0, 2, (u) => {
      st.ovenGlow = Math.min(ramp(u, 0, 0.2), 1 - ramp(u, 0.8, 1))
      st.lookAt = OVEN
    }),
    tween(0.1, 0.6, (u) => { st.hand = { x: mix(rest.x, edge.x, ease(u)), y: mix(rest.y, edge.y, ease(u)) } }),
    cue(0.7, () => hand.sound(slide)),
    tween(0.7, 0.8, (u) => {
      st.pizzaX = PIZZA.x + 46 * hump(u)
      st.hand = { x: edge.x + 46 * hump(u), y: edge.y }
    }),
    tween(1.5, 0.45, (u) => { st.hand = { x: mix(edge.x, rest.x, ease(u)), y: mix(edge.y, rest.y, ease(u)) } }),
    cue(2, () => {
      st.pizzaX = PIZZA.x
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
    tween(0.5, 1.8, (u) => { st.ovenGlow = Math.min(1, ramp(u, 0, 0.15)) * (u < 1 ? 1 : 0.4) }),
    ...kinds.map((kind, i) => cue(0.8 + i * (1.3 / Math.max(1, kinds.length)), () => hand.sound(bake(kind)))),
    cue(2.3, () => {
      st.pizzaHidden = false
      st.puffed = empty ? 1 : 0
      hand.sound(door)
    }),
    slidePizza(st, 2.3, 0.6, PIZZA, 1),
    tween(2.3, 0.6, (u) => { st.ovenGlow = 0.4 * (1 - u) }),
  ]
  if (empty) beats.push(cue(3.1, () => hand.sound(wheeze)), tween(3.1, 0.9, (u) => { st.puffed = 1 - ease(u) }))
  beats.push(cue(empty ? 4 : 2.9, () => calm(st)))
  return beats
}

/** A baked pizza baked again: the oven hiccups and hands it straight back. */
export function bakedAlready(st: Staging, hand: Stagehand): Beat[] {
  return [
    cue(0, () => hand.sound(slide)),
    slidePizza(st, 0, 0.4, { x: OVEN_MOUTH.x - 60, y: OVEN_MOUTH.y }, 0.6),
    cue(0.4, () => hand.sound(hiccup)),
    tween(0.4, 0.3, (u) => { st.ovenGlow = hump(u) }),
    slidePizza(st, 0.4, 0.55, PIZZA, 1),
    cue(0.95, () => calm(st)),
  ]
}

/** What the customer's body does for one piece too many, by kind: `u` through the beat, `big` for the one big version. */
export function manyAct(kind: Kind, u: number, big: boolean): Delta {
  const k = big ? 1.5 : 1
  switch (kind) {
    case 'pepper':
      return { mouth: hump(u), lean: -0.05 * k * hump(u), blink: 0.6 * hump(u), squash: -0.05 * hump(u) }
    case 'mushroom':
      return { lift: 30 * k * Math.abs(Math.sin(u * Math.PI * (big ? 4 : 1))), squash: -0.08 * hump(u), mouth: 0.4 * hump(ramp(u, 0, 0.3)) }
    case 'olive':
      return { lookX: Math.cos(u * TAU * (big ? 3 : 1)) * hump(u) * 1.6, lookY: Math.sin(u * TAU * (big ? 3 : 1)) * hump(u) * 1.6, lean: big ? 0.08 * Math.sin(u * TAU * 2) : 0 }
    case 'cheese':
      return { lean: -0.1 * k * hump(u), mouth: 0.6 * hump(u), squash: -0.04 * hump(u) }
    case 'sock':
      return { blink: hump(u), squash: 0.08 * k * hump(u), lean: -0.04 * hump(u), part: -0.8 * hump(u) }
    case 'worm':
      return { squash: 0.09 * k * Math.sin(u * TAU * (big ? 6 : 3)) * (1 - u), lean: 0.04 * Math.sin(u * TAU * (big ? 4 : 2)), mouth: 0.5 * hump(u), part: Math.sin(u * TAU * 4) }
  }
}

/** What its body does for one piece too few, by kind, while it pats the card and looks at that kind's tub. */
export function fewAct(kind: Kind, u: number): Delta {
  switch (kind) {
    case 'pepper':
      return { mouth: 0.9 * hump(u), part: 0.5 * Math.sin(u * TAU * 3) }
    case 'mushroom':
      return { lean: 0.07 * hump(u), squash: 0.03 * Math.sin(u * TAU * 5) * hump(u) }
    case 'olive':
      return { blink: 0.5 * hump(u), lean: -0.04 * hump(u), part: 0.7 * hump(u) }
    case 'cheese':
      return { mouth: 0.3 * hump(u), lean: -0.06 * hump(ramp(u, 0.3, 1)), squash: -0.03 * hump(u) }
    case 'sock':
      return { lift: 12 * hump(u), lean: -0.09 * hump(u), part: Math.sin(u * TAU * 4) * hump(u) }
    case 'worm':
      return { mouth: 0.5 * hump(u), tongue: hump(u) * (0.6 + 0.4 * Math.sin(u * TAU * 5)) }
  }
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
): Beat[] {
  const voice = CHARACTERS[who].voice
  const beats: Beat[] = [
    slidePizza(st, 0, 0.35, SERVE, 1),
    cue(0.5, () => hand.sound(lick)),
    tween(0, plan.lick.lasts, (u) => {
      st.lick = hump(ramp(u, 0.25, 1))
      st.act = { lean: 0.05 * hump(u), mouth: 0.7 * hump(u) }
      st.lookAt = SERVE
    }),
    tween(plan.lick.lasts, 0.5, (u) => {
      st.lick = 0
      st.act = { squash: 0.03 * Math.sin(u * TAU * 3), lookY: -0.7 * hump(u) }
      st.lookAt = null
    }),
  ]
  for (const taste of plan.tastes) {
    if (taste.way === 'many') {
      beats.push(
        cue(taste.at, () => hand.sound(tooMany(taste.kind, taste.big))),
        tween(taste.at, taste.lasts, (u) => {
          st.effect = u < 1 ? { kind: taste.kind, way: 'many', big: taste.big, t: u } : null
          st.sizzling = u < 1 ? extras(taste.kind, taste.index) : -1
          st.sizzle = hump(u)
          st.act = manyAct(taste.kind, u, taste.big)
          st.lookAt = null
          if (taste.big && taste.kind === 'pepper' && u > 0.6) st.soot = 1
        }),
      )
    } else {
      const spot = missing(taste.kind, taste.index)
      const at = { x: CARD.x + spot.x, y: CARD.y + spot.y }
      beats.push(
        cue(taste.at, () => {
          hand.sound(pat)
          hand.sound(rumble(taste.kind, voice, taste.big))
        }),
        tween(taste.at, taste.lasts, (u) => {
          st.effect = u < 1 ? { kind: taste.kind, way: 'few', big: taste.big, t: u } : null
          st.patted = u < 1 ? spot.index : -1
          st.pat = hump(u)
          st.hand = u < 1 ? { x: at.x + 8, y: at.y + 14 - 10 * hump(ramp(u, 0, 0.4)) } : null
          st.act = { ...fewAct(taste.kind, u), part: (fewAct(taste.kind, u).part ?? 0) + 0.8 * Math.sin(u * TAU * 4) * (1 - u) }
          st.lookAt = u < 1 ? tubOf(taste.kind) : null
        }),
      )
    }
  }
  beats.push(
    cue(plan.push.at, () => {
      hand.sound(slide)
      hand.sound(babble(voice, 'grumble'))
    }),
    tween(plan.push.at, plan.push.lasts, (u) => {
      st.act = { lean: 0.04 * hump(u) }
      st.hand = u < 1 ? { x: st.pizzaX + 30, y: st.pizzaY - PIZZA.r * 0.8 } : null
    }),
    slidePizza(st, plan.push.at, plan.push.lasts, PIZZA, 1),
    cue(plan.seconds, () => calm(st)),
  )
  return beats
}

/** A pizza served raw: the dough sticks to the tongue, stretches like gum and snaps back, and the customer looks at the oven. */
export function rawTasting(st: Staging, who: Customer, kind: Kind, hand: Stagehand): Beat[] {
  const t1 = RAW.lick, t2 = t1 + RAW.stretch, t3 = t2 + RAW.snap, t4 = t3 + RAW.look
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
    cue(t4, () => hand.sound(slide)),
    slidePizza(st, t4, RAW.push, PIZZA, 1),
    cue(RAW.seconds, () => calm(st)),
  ]
}

/** Each customer's own delight at a whole pizza eaten. */
export function delightAct(who: Customer, u: number): Delta {
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

/** Where the pizza is held to be bitten: in front of the customer's mouth. */
export function biteSpot(who: Customer): { x: number; y: number } {
  const c = CHARACTERS[who]
  return { x: CUSTOMER.x, y: CUSTOMER.y - c.mouthAt * c.height + 78 }
}

export const EATING_SECONDS = 7

/**
 * The eating, the ending of a cycle: three bites, each taking a third of the
 * pizza, the customer's own delight, a burp, and it settles back, full.
 * `eaten` runs when the last bite is gone.
 */
export function eating(st: Staging, who: Customer, kind: Kind, eaten: () => void, hand: Stagehand): Beat[] {
  const voice = CHARACTERS[who].voice
  const beats: Beat[] = [
    slidePizza(st, 0, 0.6, biteSpot(who), 0.62),
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
        st.act = { mouth: u < 0.4 ? 1 : 0.25 + 0.25 * Math.sin(u * TAU * 4), squash: u < 0.4 ? -0.05 * hump(u / 0.4) : 0.05 * Math.sin(u * TAU * 4), lean: 0.03 }
        st.lookAt = null
      }),
      cue(at + 0.34, () => hand.sound(bite(n))),
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
    cue(5.5, () => hand.sound(burp(voice))),
    tween(5.5, 0.8, (u) => {
      st.effect = u < 1 ? { kind, way: 'burp', big: false, t: u } : null
      st.act = { mouth: 0.9 * hump(u), squash: -0.08 * hump(ramp(u, 0, 0.3)) + 0.05 * hump(ramp(u, 0.3, 1)) }
    }),
    // It settles back, full, and the card is rolled away.
    tween(6.3, 0.7, (u) => {
      st.act = { squash: 0.06 * ease(u), blink: 0.5 * hump(u), part: 0.5 * ease(u) }
      st.cardOpen = 1 - ease(u)
    }),
    cue(EATING_SECONDS, () => calm(st)),
  )
  return beats
}

/** What its body does with a piece fed by hand, by kind. */
export function fedAct(kind: Kind, u: number): Delta {
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
  const beats: Beat[] = [
    cue(0, () => hand.sound(gulp(kind))),
    tween(0, 1.1, (u) => {
      st.effect = u < 1 ? { kind, way: 'fed', big: false, t: u } : null
      st.act = fedAct(kind, u)
    }),
  ]
  if (kind === taste.loves) {
    beats.push(cue(1.1, () => hand.sound(babble(taste.voice, 'glee'))), tween(1.1, 1.3, (u) => { st.act = u < 1 ? delightAct(who, u) : {} }), cue(2.4, () => calm(st)))
  } else if (kind === taste.cannotStand) {
    beats.push(
      cue(1.1, () => hand.sound(babble(taste.voice, 'grumble'))),
      tween(1.1, 0.5, (u) => { st.act = { squash: 0.14 * hump(u), blink: 1, mouth: 0.2 } }),
      cue(1.6, spit),
      tween(1.6, 0.4, (u) => { st.act = { mouth: hump(u), lean: 0.06 * hump(u), squash: -0.1 * hump(u) } }),
      cue(2, () => calm(st)),
    )
  } else beats.push(cue(1.1, () => calm(st)))
  return beats
}
