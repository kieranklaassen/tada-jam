import { FOOT_OUTLINE, JOINTS, PART_SHAPES, PILOT_OUTLINE, drawFigures, drawPage, type Art, type Kit, type PartShape, type Sprite } from './art'
import type { Tier } from './config'
import { dodge, nearness } from './motion'
import { GRAPHITE, GRID_INK, Leads, type Ctx, type MakeCanvas } from './pencil'
import { fit, type Fit } from './stage'
import { TAKE, slotOf, type Crumb, type Frame, type Meal } from './toy'
import { BALLOON, BASKET, BERG, CATAPULT, CHICK, CRATE, DRIFT, ICE_Y, IGLOO, PARTS, PENGUIN, PUFFIN, SEALS, SEAL_NOSES, SEA_Y, SHELF_EDGE, SLOTS, SPOUT, SQUARE, WALRUS, WHALE_EYE, WHALE_TAIL, type Friend, type Part } from './world'

// The view: one frame of the toy, drawn. It stamps the figures of art.ts where
// the toy's frame puts them and draws the few lines that change every frame
// (the bands, the line of the flight, eyes and mouths, the whale's water).
// The printed squares go on last, over everything, as one stroke: the pencil
// is on the paper, so the paper's print shows through it.
// What it draws it counts: `drawCalls` is the stamps and the live strokes and
// fills of the last frame, which is this game's draw count.

/** A placing on the page: where a figure's own units land, as the six numbers of a transform. */
type Mat = { a: number; b: number; c: number; d: number; e: number; f: number }
const mat = (): Mat => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })

function place(out: Mat, x: number, y: number, rot = 0, sx = 1, sy = 1): Mat {
  const cos = Math.cos(rot), sin = Math.sin(rot)
  out.a = cos * sx; out.b = sin * sx; out.c = -sin * sy; out.d = cos * sy; out.e = x; out.f = y
  return out
}

/** A placing inside another: a part on its joint. */
function part(out: Mat, of: Mat, x: number, y: number, rot = 0, sx = 1, sy = 1): Mat {
  const cos = Math.cos(rot), sin = Math.sin(rot)
  const a = cos * sx, b = sin * sx, c = -sin * sy, d = cos * sy
  out.a = of.a * a + of.c * b; out.b = of.b * a + of.d * b
  out.c = of.a * c + of.c * d; out.d = of.b * c + of.d * d
  out.e = of.a * x + of.c * y + of.e; out.f = of.b * x + of.d * y + of.f
  return out
}

const px = (m: Mat, x: number, y: number): number => m.a * x + m.c * y + m.e
const py = (m: Mat, x: number, y: number): number => m.b * x + m.d * y + m.f
const clamp = (v: number, low: number, high: number): number => Math.min(high, Math.max(low, v))
const mix = (a: number, b: number, t: number): number => a + (b - a) * t

// --- Nothing bolted on is drawn in the ice or in a seal ----------------------------------------------------------
//
// The penguin is flown as a round, and the round is what the model keeps out of things. What is bolted to it
// reaches further than the round, so the view holds each part to the same rule by how it moves: lying on its
// belly, the penguin folds its lower wing back along its side and carries the rod over its back, and whatever
// else would meet the ice or a seal is turned about its joint by what it meets, by the least that frees it.

/** Whether a point of the page is in the ice of the shelf, in the iceberg or in a seal. */
function solidAt(x: number, y: number): boolean {
  if (y > ICE_Y && x <= SHELF_EDGE) return true
  if (y > BERG.y0 && x >= BERG.x0 && x <= BERG.x1) return true
  for (const seal of SEALS) {
    const dx = x - seal.x, dy = y - seal.y
    if (dx * dx + dy * dy < seal.r * seal.r) return true
  }
  return false
}

/** An outline with a point every few units along it, so that no edge is through a seal between two of its corners. */
function along(flat: readonly number[], every: number): number[] {
  const out: number[] = []
  for (let i = 0; i < flat.length; i += 2) {
    const x0 = flat[i], y0 = flat[i + 1], x1 = flat[(i + 2) % flat.length], y1 = flat[(i + 3) % flat.length]
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / every))
    for (let step = 0; step < steps; step++) out.push(x0 + ((x1 - x0) * step) / steps, y0 + ((y1 - y0) * step) / steps)
  }
  return out
}
const OUTLINES = Object.fromEntries(Object.entries(PART_SHAPES).map(([name, flat]) => [name, along(flat, 3)])) as Record<PartShape, number[]>
/** The penguin's own outline and the sole of its foot, the same way: what the chick stands on. */
const BODY_LINE = along(PILOT_OUTLINE, 3)
const SOLE_LINE = along(FOOT_OUTLINE, 3)

/** The top of an outline as it is placed, in the column `half` either side of `x` of the page: the least `y` there, or `top` if it has none higher. */
function topIn(m: Mat, outline: readonly number[], x: number, half: number, top: number): number {
  for (let i = 0; i < outline.length; i += 2) {
    if (Math.abs(px(m, outline[i], outline[i + 1]) - x) > half) continue
    const y = py(m, outline[i], outline[i + 1])
    if (y < top) top = y
  }
  return top
}

/** A placing turned about a point of the page, by `by` radians. */
function turned(out: Mat, m: Mat, by: number, ox: number, oy: number): Mat {
  const cos = Math.cos(by), sin = Math.sin(by)
  const a = cos * m.a - sin * m.b, b = sin * m.a + cos * m.b, c = cos * m.c - sin * m.d, d = sin * m.c + cos * m.d
  const e = ox + cos * (m.e - ox) - sin * (m.f - oy), f = oy + sin * (m.e - ox) + cos * (m.f - oy)
  out.a = a; out.b = b; out.c = c; out.d = d; out.e = e; out.f = f
  return out
}

/**
 * Which way what it meets turns a part about its joint: more than 0 one way, less the other, and 0 when the
 * part is in nothing. The ice pushes up and a seal pushes out from its middle, each point by how deep it is.
 */
function pushed(m: Mat, outline: readonly number[], ox: number, oy: number): number {
  let turn = 0, struck = false
  for (let i = 0; i < outline.length; i += 2) {
    const x = px(m, outline[i], outline[i + 1]), y = py(m, outline[i], outline[i + 1])
    if (!solidAt(x, y)) continue
    struck = true
    const dx = x - ox, dy = y - oy
    let nx = 0, ny = -1, deep = 1
    for (const seal of SEALS) {
      const sx = x - seal.x, sy = y - seal.y, far = Math.hypot(sx, sy)
      if (far < seal.r && far > 0) { nx = sx / far; ny = sy / far; deep = seal.r - far }
    }
    if (ny === -1) deep = y - (x >= BERG.x0 ? BERG.y0 : ICE_Y)
    turn += (dx * ny - dy * nx) * Math.max(deep, 0.5)
  }
  return struck ? (turn >= 0 ? 1 : -1) : 0
}

const SPARE = mat()
/** The least a part is turned by to look for its way out, in radians. */
const GIVES = 0.04

/**
 * Turns a part until none of it is in the ice or a seal: the way it is pushed, by the least that frees it, and
 * the other way round only if that way has no end. It turns about its joint, or about `about` when that is
 * given: the rocket is strapped round the penguin's middle, and what its back meets slides it round on its
 * strap. `way` names the way for a part that hangs or lies so that the push on it has no side of its own.
 * Returns whether the part is free; one that no turn frees is left as it was.
 */
function freed(m: Mat, shape: PartShape, way = 0, about: { e: number; f: number } = m): boolean {
  const outline = OUTLINES[shape]
  const ox = about.e, oy = about.f
  const push = pushed(m, outline, ox, oy)
  if (push === 0) return true
  const first = way !== 0 ? way : push
  for (const side of [first, -first]) for (let by = GIVES; by <= Math.PI; by += GIVES) {
    if (pushed(turned(SPARE, m, side * by, ox, oy), outline, ox, oy) !== 0) continue
    turned(m, m, side * by, ox, oy)
    return true
  }
  return false
}

/** Lying on its belly, the penguin folds the wing that is under it back along its side by this much, and carries the rod over its back by this much. */
const LYING = { wing: 1.9, rod: -4 } as const

/**
 * The chick on the penguin: how far either side of its middle its two feet reach, which is the column of the
 * penguin's outline it stands on the top of; how far along a lying penguin's back it stands; how deep its feet
 * are in the line they stand on; and how high its hop goes over the straight way from its doorway.
 */
const PERCH = { wide: 14, back: -8, in: 1.5, hop: 34 } as const
/** A fish is taken from where it was drawn on the rod if that was no longer ago than this, in seconds. */
const HUNG_LASTS = 1.5
/** The hoop of the puffin's net, from the hand that holds its cane. */
const NET_HOOP = { x: 13, y: -54, far: Math.hypot(13, 54) } as const

/** The umbrella as a bowl under a sitting penguin, from the middle of the penguin down: where the hand of its stick is, and where the cloth meets the snow. */
const BOWL = { hand: PENGUIN.r + 110, foot: PENGUIN.r + 8 } as const

/** The pilot flame leans to the last touch by no more than this, in radians. */
export const PILOT_LEANS = 0.6

/** How far above the nose the open umbrella's hand is, when it stands on the nose by its point: the umbrella's whole length, turned over. */
const NOSE_STICK = 149

/** The seal's ball: its size, where it rests on the nose, and how far a body's middle must be from the ball's. */
const BALL_R = 11 * (SEALS[0].r / 50)
export const BALL = { x: SEALS[0].x + JOINTS.nearSeal.nose[0] - 2, y: ICE_Y + JOINTS.nearSeal.nose[1] - BALL_R - 5, r: BALL_R, clear: PENGUIN.height / 2 + BALL_R + 3 } as const
/** The puffin is down behind the rim when a body's middle is this near its head, and starts down at the far one. */
export const PUFFIN_DUCKS = { near: 112, far: 170 } as const
/** Where the puffin stands in its basket: its chest is behind the rim. */
export const PUFFIN_AT = { x: PUFFIN.x, y: BASKET.y0 - 14, down: 56 } as const
/** The floor of the walrus's hollow, where it sits. */
export const WALRUS_FLOOR = SEA_Y - 14
/** A seal gives under a blow by no more than this share of its width and of its height. */
export const SEAL_GIVES = { wide: 0.016, high: 0.03, most: 1.5 } as const

/** 0 below `a`, 1 above `b`, and eased between. */
const eased = (p: number, a: number, b: number): number => {
  const t = clamp((p - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

/** The body the loose things keep clear of: the penguin when it is out of the pouch and in front of the things on the ice. */
export function bodyOf(f: Frame): { x: number; y: number } | null {
  const pose = f.pilot.pose
  return pose !== 'seat' && pose !== 'under' && pose !== 'gone' && !f.pilot.behind ? f.pilot : null
}

/**
 * Where the near seal has its ball while its nose is wanted for an umbrella: aside, on its belly, by its hind
 * flipper, clear of the cloth. It sees an open umbrella coming down from `sees` units off and has the ball out
 * of the way before the umbrella's point is on its nose; the ball goes `over` its face, not through it, and
 * takes `takes` seconds to get there or back.
 */
export const BALL_ASIDE = { x: SEALS[0].x + 40, y: ICE_Y - 58, over: 22, sees: 300, takes: 0.3 } as const

/** Whether the near seal wants its nose free: an umbrella stands on it, or an open one is coming down near. */
export function wantsNose(f: Frame): boolean {
  const p = f.pilot
  return f.nearSeal.hold > 0 || (p.pose === 'fly' && p.umbrella === 'open' && p.nose === null && Math.hypot(p.x - SEAL_NOSES[0].x, p.y - SEAL_NOSES[0].y) < BALL_ASIDE.sees)
}

/** Where the seal's ball is: riding the nose, knocked off it by whatever comes by, and `aside` (0 to 1) of the way to where it is kept while the nose is wanted for an umbrella. */
export function ballAt(f: Frame, out: { x: number; y: number }, aside = 0): { x: number; y: number } {
  const press = clamp(f.nearSeal.squash, -SEAL_GIVES.most, SEAL_GIVES.most)
  const gone = eased(aside, 0, 1)
  out.x = mix(BALL.x + 9 * f.nearSeal.ball + 2 * press, BALL_ASIDE.x, gone)
  out.y = mix(BALL.y + 3 * press - 2 * f.nearSeal.breath - 16 * f.nearSeal.bark - 30 * f.nearSeal.nosing, BALL_ASIDE.y, gone) - BALL_ASIDE.over * Math.sin(Math.PI * gone)
  return dodge(out, bodyOf(f), BALL.clear, out)
}

/** The whale's eye, pressed, rolls once right round in this share of its roll, and rests on the penguin for what is left of it. */
export const WHALE_TURNS = 0.5

/**
 * Where the whale's eye looks. With no flight to watch it watches the sky above its blowhole, and in a flight
 * whatever every eye follows. Pressed, it rolls: once right round, ending on the penguin, and it stays on the
 * penguin until the roll is over.
 */
export function whaleGaze(f: Frame, out: { x: number; y: number }): { x: number; y: number } {
  const roll = clamp(f.whale.roll, 0, 1)
  if (roll > 0) {
    const to = Math.atan2(f.pilot.y - WHALE_EYE.y, f.pilot.x - WHALE_EYE.x)
    const a = to + Math.PI * 2 * eased(1 - roll, 0, WHALE_TURNS)
    out.x = WHALE_EYE.x + 300 * Math.cos(a)
    out.y = WHALE_EYE.y + 300 * Math.sin(a)
  } else if (f.pilot.pose === 'seat') {
    out.x = SPOUT.x + 40 * f.whale.drift
    out.y = SPOUT.top
  } else {
    out.x = f.focus.x
    out.y = f.focus.y
  }
  return out
}

/** How far down behind the rim the puffin is, 0 to 1: it ducks when it is pressed, and whenever a body flies near. */
export function puffinDuck(f: Frame): number {
  const pressed = clamp(f.puffin.duck * 0.5, 0, 1)
  // A penguin that has arrived at the basket is a visitor: the puffin comes up to look at it.
  if (f.pilot.pose === 'perch') return pressed
  return Math.max(pressed, nearness(PUFFIN.x, PUFFIN.y - 16, bodyOf(f), PUFFIN_DUCKS.near, PUFFIN_DUCKS.far))
}

/** How a seal is stretched as it is drawn, about its place on the ice: a little wider and lower under a blow, and with its breath. */
export function sealScale(f: Frame, which: 0 | 1, out: { sx: number; sy: number }): { sx: number; sy: number } {
  const seal = which === 0 ? f.nearSeal : f.farSeal
  const press = clamp(seal.squash, -SEAL_GIVES.most, SEAL_GIVES.most)
  out.sx = 1 + SEAL_GIVES.wide * press + 0.006 * seal.breath
  out.sy = 1 - SEAL_GIVES.high * press + 0.012 * seal.breath
  return out
}

/** How a fish lies at a friend's: a place on the page, a turn, a size, and how much of its length is left (1 is the whole fish). */
export type Lie = { x: number; y: number; rot: number; size: number; tall: number }
/** Where the fish hung on the rod, and how it was turned, when it was last drawn there. */
export type Hung = { x: number; y: number; rot: number }
const NOWHERE: Hung = { x: 0, y: 0, rot: 0 }

/**
 * Where a friend holds its fish, and how the fish lies there. Each of the nine answers (three friends by fresh,
 * wet and frozen) moves the fish its own way, and no two share a motion:
 * - the chick swallows a fresh one whole, drops a wet one three times, and lifts a frozen one off its plate by the tongue that has stuck to it;
 * - the walrus raises a fresh one to its mouth in two measured halves, wrings a wet one, and bites a frozen one shorter three times, held up like a lolly;
 * - the puffin turns a fresh one crosswise in its bill, draws a wet one up into it like a noodle, and hammers with a frozen one.
 */
export function mealAt(who: Friend, meal: Meal, t: number, puffinWay: 1 | -1, puffinDown: number, out: Lie, from: Hung = NOWHERE): Lie {
  // How far through its answer the friend is: not begun while it takes the fish, and done once it eats.
  const p = meal.act === 'react' ? clamp(meal.p, 0, 1) : meal.act === 'take' ? 0 : 1
  const reacting = meal.act === 'react'
  out.tall = 1
  if (who === 'chick') {
    const plateY = ICE_Y + JOINTS.chick.plate[1] - 6
    if (meal.fish === 'fresh') {
      // Off the plate and down head first: swallowed whole, the shape of the fish goes down its front and stays there.
      const gone = Math.min(1, p * 1.6)
      const up = eased(p, 0, 0.12)
      out.x = CHICK.x + 20 * (1 - up)
      out.y = mix(plateY, mix(ICE_Y + JOINTS.chick.beak[1] + 16, ICE_Y - 14, gone), up)
      out.rot = mix(Math.PI / 2, Math.PI, up)
      out.size = mix(0.62, 0.42, up)
    } else if (meal.fish === 'wet') {
      // It slips out of its flippers three times.
      out.x = CHICK.x + 20
      out.y = plateY - (reacting ? 30 * Math.abs(Math.sin(p * Math.PI * 3)) : 0)
      out.rot = Math.PI / 2
      out.size = 0.62
    } else {
      // Licked, and the tongue sticks: when the chick pulls back, the block comes up off the plate with it and hangs there.
      const stuck = eased(p, 0.5, 0.75)
      out.x = CHICK.x + 20 - 8 * stuck
      out.y = plateY - 13 * stuck
      out.rot = Math.PI / 2 - 0.5 * stuck + 0.16 * stuck * Math.sin(t * 5)
      out.size = 0.62
    }
  } else if (who === 'walrus') {
    const tinX = WALRUS.x + 26, tinY = WALRUS_FLOOR + JOINTS.walrus.tin[1] - 14
    const mouthX = WALRUS.x + JOINTS.walrus.mouth[0], mouthY = WALRUS_FLOOR + JOINTS.walrus.mouth[1]
    if (meal.fish === 'fresh') {
      // With great manners: level, and to the mouth in two measured halves, a bite less each time.
      const rise = 0.5 * eased(p, 0.2, 0.36) + 0.5 * eased(p, 0.6, 0.76)
      out.x = mix(tinX, mouthX + 10, rise)
      out.y = mix(tinY, mouthY + 4, rise)
      out.rot = Math.PI / 2
      out.size = 0.85 - 0.25 * rise
    } else if (meal.fish === 'wet') {
      // Wrung out like a cloth: twisted one way and the other, and thinner at each twist.
      out.x = tinX
      out.y = tinY - 10 * eased(p, 0, 0.15)
      out.rot = Math.PI / 2 + (reacting ? 0.7 * Math.sin(p * Math.PI * 4) : 0)
      out.size = mix(0.85, 0.7, p)
      out.tall = reacting ? 1 - 0.35 * Math.abs(Math.sin(p * Math.PI * 4)) : 1
    } else {
      // Held up like an ice lolly, its far end at the mouth, and bitten shorter three times.
      const up = eased(p, 0, 0.14)
      const bites = eased(p, 0.17, 0.21) + eased(p, 0.45, 0.49) + eased(p, 0.74, 0.78)
      const jab = reacting ? Math.max(0, Math.sin(p * Math.PI * 7 - 0.9)) * (p > 0.14 ? 1 : 0) : 0
      out.x = mix(tinX, WALRUS.x + 30, up) - 3 * jab
      out.y = mix(tinY, WALRUS_FLOOR - 8, up) - 3 * jab
      out.rot = mix(Math.PI / 2, Math.PI * 0.78, up)
      out.size = 0.85
      out.tall = 1 - 0.2 * bites
    }
  } else {
    const billX = PUFFIN_AT.x + puffinWay * (JOINTS.puffin.bill[0] - 6), billY = PUFFIN_AT.y + puffinDown + JOINTS.puffin.bill[1]
    out.size = 0.6
    if (meal.fish === 'fresh') {
      // It hangs from the bill, and is turned crosswise in it with one swing that settles.
      const turn = eased(p, 0.15, 0.5) + (reacting ? 0.18 * Math.sin(eased(p, 0.5, 1) * Math.PI * 2) * (1 - p) : 0)
      out.x = billX + puffinWay * 14 * turn
      out.y = billY
      out.rot = (Math.PI / 2) * turn
    } else if (meal.fish === 'wet') {
      // Drawn up into the bill like a noodle: it hangs straight down, and less and less of it is left hanging.
      const slurped = eased(p, 0.18, 0.8)
      out.x = billX
      out.y = billY
      out.rot = reacting ? 0.22 * Math.sin(p * 46) * (1 - slurped) : 0
      out.tall = 1 - 0.82 * slurped
    } else {
      // Rapped on the rim twice, and then swung as a hammer twice.
      out.x = billX + puffinWay * 14
      out.y = billY
      out.rot = Math.PI / 2 + (reacting ? 0.9 * Math.abs(Math.sin(p * Math.PI * 4)) : 0)
    }
  }
  if (meal.act === 'take') {
    // It hangs where it hung on the rod until the friend's hand has come for it, and goes home in that hand.
    const along = eased(meal.p, TAKE.reach, TAKE.home)
    out.x = mix(from.x, out.x, along)
    out.y = mix(from.y, out.y, along)
    out.rot = mix(from.rot, out.rot, along)
    out.size = mix(1, out.size, along)
  } else if (meal.act === 'eat') {
    out.rot += 0.06 * Math.sin(t * (who === 'chick' ? 9 : who === 'puffin' ? 6 : 2.2))
  } else if (meal.act === 'gulp') out.size *= 1 - meal.p
  return out
}

const AT_REST: Meal = { fish: 'fresh', act: 'react', p: 0 }
const REST: Lie = { x: 0, y: 0, rot: 0, size: 1, tall: 1 }

/**
 * Where the hand is that takes a fish off the rod: the chick's plate, the walrus's flipper, the hoop of the
 * puffin's net. It leaves `home`, where it is kept, for the fish where it hangs; carries it to where the friend
 * has its fish; and goes home. The fish is in it from the moment it gets there (`mealAt`).
 */
export function handAt(who: Friend, meal: Meal, t: number, puffinWay: 1 | -1, puffinDown: number, home: { x: number; y: number }, out: { x: number; y: number }, from: Hung = NOWHERE): { x: number; y: number } {
  AT_REST.fish = meal.fish
  const rest = mealAt(who, AT_REST, t, puffinWay, puffinDown, REST)
  const fx = from.x, fy = from.y
  if (meal.act !== 'take') {
    out.x = home.x
    out.y = home.y
  } else if (meal.p < TAKE.reach) {
    const s = eased(meal.p, 0, TAKE.reach)
    out.x = mix(home.x, fx, s)
    out.y = mix(home.y, fy, s)
  } else if (meal.p < TAKE.home) {
    const s = eased(meal.p, TAKE.reach, TAKE.home)
    out.x = mix(fx, rest.x, s)
    out.y = mix(fy, rest.y, s)
  } else {
    const s = eased(meal.p, TAKE.home, 1)
    out.x = mix(rest.x, home.x, s)
    out.y = mix(rest.y, home.y, s)
  }
  return out
}

/** Where a friend has a fish before it does anything with it: the chick on its plate, the walrus in its tin, the puffin in its bill. */
export function restOf(who: Friend, fish: Meal['fish'], puffinWay: 1 | -1, puffinDown: number, out: { x: number; y: number }): { x: number; y: number } {
  AT_REST.fish = fish
  const rest = mealAt(who, AT_REST, 0, puffinWay, puffinDown, REST)
  out.x = rest.x
  out.y = rest.y
  return out
}

/** The chick's tongue, stuck to a frozen fish: from its beak to the block, or null when no tongue is out. `dx` and `dy` move a chick that rides. */
export function tongueOf(meal: Meal, lie: Lie, dx: number, dy: number, out: { x0: number; y0: number; x1: number; y1: number }): { x0: number; y0: number; x1: number; y1: number } | null {
  if (meal.fish !== 'frozen' || meal.act === 'take' || meal.act === 'gulp') return null
  // It comes out to lick, and stays out: it has stuck.
  const far = meal.act === 'react' ? eased(meal.p, 0.15, 0.3) : 1
  if (far <= 0) return null
  out.x0 = CHICK.x + JOINTS.chick.beak[0] + dx
  out.y0 = ICE_Y + JOINTS.chick.beak[1] + 2 + dy
  out.x1 = mix(out.x0, lie.x + dx + 2, far)
  out.y1 = mix(out.y0, lie.y + dy - 4, far)
  return out
}

const rgba = (c: readonly [number, number, number], a: number): string => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`

/** Where the three curtains of lights hang in the sky. */
const LIGHTS: readonly (readonly [number, number])[] = [[292, 40], [884, 262], [36, 250]]
/** No more holes than this are drawn in the cloud. */
const MOST_HOLES = 3

export class View {
  /** The stamps and live strokes of the last frame drawn. */
  drawCalls = 0
  private readonly make: MakeCanvas
  private readonly leads: Leads
  private art: Art | null = null
  private page: Sprite | null = null
  private by: Fit = { scale: 0, x: 0, y: 0 }
  private dpr = 1
  /** Pixels to a stage unit, and the stage's corner in pixels. */
  private k = 1
  private ox = 0
  private oy = 0
  private width = 0
  private height = 0
  private tier: Tier = { dpr: 2, grain: true, crumbs: 14 }
  private ink: string | CanvasPattern = rgba(GRAPHITE, 0.82)

  // What the view eases by itself: the scarf's tail, which follows the penguin late.
  private tailX = -0.2
  private tailY = 1
  private lastX = 0
  private lastY = 0
  /** 0 to 1: how far the penguin has laid its gear down for a slide on its belly. */
  private laid = 0
  /** 0 to 1: how far the near seal has put its ball aside. */
  private aside = 0

  private readonly m = mat()
  private readonly n = mat()
  private readonly o = mat()
  private readonly q = mat()
  /** The penguin's own placing, which its parts and whatever rides on it are placed in. */
  private readonly pm = mat()
  private readonly rod = mat()
  private readonly tube = mat()
  private readonly at = { x: 0, y: 0 }
  private readonly scale = { sx: 1, sy: 1 }
  private readonly lie: Lie = { x: 0, y: 0, rot: 0, size: 1, tall: 1 }
  private readonly tongue = { x0: 0, y0: 0, x1: 0, y1: 0 }
  /** Where the fish hung on the rod when it was last drawn there, and when: the friend who takes it takes it from there. */
  private readonly hung = { x: 0, y: 0, rot: 0, at: -Infinity }
  private readonly spare: Hung = { x: 0, y: 0, rot: 0 }
  private readonly hand = { x: 0, y: 0 }
  private readonly home = { x: 0, y: 0 }
  private pupils: number[] = []
  private lids: number[] = []

  constructor(make: MakeCanvas) {
    this.make = make
    this.leads = new Leads(make)
  }

  /** Whatever the tier sets besides the pixel ratio. */
  setTier(tier: Tier): void {
    this.tier = tier
  }

  /** The figures as they are drawn now, for a test that asks what was stamped. */
  get figures(): Art | null {
    return this.art
  }

  /** The fit in use, for touches. */
  get fit(): Fit {
    return this.by
  }

  /** Draws every figure and the page for a surface of `width` by `height` CSS pixels at pixel ratio `dpr`. */
  build(ctx: Ctx, width: number, height: number, dpr: number): void {
    this.by = fit(width, height)
    if (this.by.scale <= 0) return
    this.width = width
    this.height = height
    this.dpr = dpr
    this.k = dpr * this.by.scale
    this.ox = dpr * this.by.x
    this.oy = dpr * this.by.y
    const kit: Kit = { make: this.make, leads: this.leads, k: this.k }
    this.art = drawFigures(kit)
    // The page covers the whole surface, past the stage's edges.
    const x0 = -this.by.x / this.by.scale, y0 = -this.by.y / this.by.scale
    this.page = drawPage(kit, x0, y0, x0 + width / this.by.scale, y0 + height / this.by.scale)
    this.ink = this.leads.ink(ctx, 'graphite', this.k, true)
  }

  private world(ctx: Ctx): void {
    ctx.setTransform(this.k, 0, 0, this.k, this.ox, this.oy)
  }

  private stamp(ctx: Ctx, sprite: Sprite, m: Mat, alpha = 1): void {
    const k = this.k
    ctx.setTransform(k * m.a, k * m.b, k * m.c, k * m.d, k * m.e + this.ox, k * m.f + this.oy)
    ctx.globalAlpha = alpha
    ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h)
    this.drawCalls += 1
  }

  /** The lead for a live line: through the grain, or plain where the tier leaves the grain out. */
  private lead(ctx: Ctx, tone: number, width: number): void {
    ctx.strokeStyle = this.tier.grain ? this.ink : rgba(GRAPHITE, 0.82)
    ctx.globalAlpha = tone
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }

  /** An eye: a pupil that looks at `focus`, or a lid when it is shut. `m` places the eye's figure. */
  private eye(m: Mat, x: number, y: number, r: number, f: Frame, blink: number, wide = 0, atX = f.focus.x, atY = f.focus.y): void {
    const ex = px(m, x, y), ey = py(m, x, y)
    if (blink > 0.5) {
      this.lids.push(ex - r * 0.8, ey + r * 0.2, ex + r * 0.8, ey + r * 0.2)
      return
    }
    const dx = atX - ex, dy = atY - ey
    const far = Math.hypot(dx, dy)
    const look = far > 1 ? Math.min(1, far / 60) * r * 0.42 : 0
    this.pupils.push(ex + (far > 1 ? (dx / far) * look : 0), ey + (far > 1 ? (dy / far) * look : 0), r * (0.46 + 0.16 * wide))
  }

  /** A live stroke between two points of a figure, drawn with the lids. */
  private mark(m: Mat, x0: number, y0: number, x1: number, y1: number): void {
    this.lids.push(px(m, x0, y0), py(m, x0, y0), px(m, x1, y1), py(m, x1, y1))
  }

  /** A seal's whiskers: three, straight, or short and curled at the ends when a rocket has singed them. */
  private whiskers(m: Mat, x: number, y: number, way: number, singed: number, twitch: number): void {
    for (let i = -1; i <= 1; i++) {
      const lean = i * 0.38 + 0.2 * twitch
      const far = singed > 0.5 ? 9 : 22
      const ex = x + way * Math.cos(lean) * far, ey = y + Math.sin(lean) * far + 2
      this.mark(m, x, y + 2, ex, ey)
      // A negative third number is a round of that size: the curl at a singed whisker's end.
      if (singed > 0.5) this.lids.push(px(m, ex + way * 2.5, ey - 2.5), py(m, ex + way * 2.5, ey - 2.5), -2.6, 0)
    }
  }

  /**
   * Draws a frame. With no frame there is no state yet, and the bare page is drawn. `dt` is the seconds of play
   * this frame advances, 0 outside a frame.
   */
  draw(ctx: Ctx, f: Frame | null, dt: number): void {
    this.drawCalls = 0
    const art = this.art, page = this.page
    if (!art || !page || this.by.scale <= 0) return
    const m = this.m, n = this.n, o = this.o
    this.pupils.length = 0
    this.lids.length = 0

    // The page, pixel for pixel.
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.globalAlpha = 1
    ctx.drawImage(page.image, 0, 0)
    this.drawCalls += 1
    if (!f) return this.squares(ctx)
    const t = f.t
    const pilot = f.pilot
    const body = bodyOf(f)
    this.placePilot(f)

    // The lights in the sky: three curtains, each swaying by itself.
    for (let i = 0; i < art.lights.length; i++) {
      const glow = 0.5 + 0.5 * Math.sin(t * (0.23 + 0.07 * i) + i * 2.1)
      this.stamp(ctx, art.lights[i], place(m, LIGHTS[i][0] + 7 * Math.sin(t * 0.31 + i), LIGHTS[i][1], 0, 1, 1 + 0.08 * Math.sin(t * 0.47 + i * 1.7)), 0.3 + 0.5 * f.lights * (0.5 + 0.5 * glow))
    }

    // The lines of the last two flights, what this one scratched into the ice, and the ring where the pouch was last let go.
    this.world(ctx)
    this.path(ctx, f.older, 0.2, 1.7, 0)
    this.path(ctx, f.line, 0.6, 1.7, 0)
    this.path(ctx, f.furrow, 0.6, 4, -1.5)
    if (f.tips.length >= 4) {
      this.path(ctx, f.tips, 0.5, 1.4, -3)
      this.path(ctx, f.tips, 0.5, 1.4, 3)
    }
    if (f.ring) {
      // The tracing of the pouch where it was last let go, leaning along the bands as the pouch did there.
      const lean = Math.atan2(CATAPULT.fork.x - f.ring.x, -(CATAPULT.fork.y - f.ring.y))
      this.stamp(ctx, art.ring, place(m, f.ring.x, f.ring.y, lean * (0.35 + 0.65 * f.ring.stretch)), 0.8)
    }

    // The whale: its tail on its root, its breath, and its water when something is over the blowhole.
    this.stamp(ctx, art.fluke, place(m, WHALE_TAIL.x, WHALE_TAIL.y, clamp(f.whale.tail, -0.5, 0.5)))
    if (f.whale.tickle > 0.02) {
      // Its skin shivers where it was pressed: short strokes stand off its back and die away.
      for (let i = -1; i <= 1; i++) {
        const x = f.whale.tickleX + i * 22, from = 6 + 8 * (1 - f.whale.tickle)
        this.lids.push(x, f.whale.tickleY - from, x + i * 3, f.whale.tickleY - from - 8)
      }
    }
    if (f.whale.puff > 0.02) this.stamp(ctx, art.puff, place(m, SPOUT.x, SPOUT.bottom - 2 - 20 * f.whale.puff, 0, 0.5 + 0.6 * f.whale.puff, 0.5 + 0.6 * f.whale.puff), Math.min(1, f.whale.puff * 2))
    if (f.whale.blow > 0.02) this.spout(ctx, f)
    // With no flight to watch, the whale watches the sky above its blowhole; pressed, its eye rolls right round to the penguin.
    whaleGaze(f, this.at)
    this.eye(place(m, WHALE_EYE.x, WHALE_EYE.y), 0, 0, 15, f, f.whale.blink, f.whale.wide, this.at.x, this.at.y)

    // The walrus in its hollow.
    const sigh = f.walrus.sigh
    place(m, WALRUS.x, WALRUS_FLOOR, 0, 1 + 0.012 * f.walrus.breath + 0.03 * sigh, 1 + 0.015 * f.walrus.breath - 0.03 * sigh)
    this.stamp(ctx, art.walrus, m)
    const walrus = JOINTS.walrus
    this.eye(m, walrus.eyes[0][0], walrus.eyes[0][1], walrus.eye, f, f.walrus.blink)
    this.eye(m, walrus.eyes[1][0], walrus.eyes[1][1], walrus.eye, f, f.walrus.blink)
    // Two brows, and one of them goes up now and then.
    const brow = 5 * f.walrus.brow
    this.mark(m, walrus.brows[0][0], walrus.brows[0][1], walrus.brows[1][0], walrus.brows[1][1])
    this.mark(m, walrus.brows[2][0], walrus.brows[2][1] - brow, walrus.brows[3][0], walrus.brows[3][1] - brow * 1.6)
    this.stamp(ctx, art.moustache, part(n, m, walrus.moustache[0], walrus.moustache[1] - 3 * sigh, 0.09 * f.walrus.twitch * Math.sin(t * 31) + 0.1 * sigh * Math.sin(t * 24)))
    if (f.meal.walrus) {
      this.meal(ctx, art, f, 'walrus', f.meal.walrus, 1, 0)
      if (f.meal.walrus.act === 'take') {
        // It takes the fish with a flipper, on a long arm out of its hollow, and puts it in its tin.
        const sx = px(m, walrus.shoulder[0], walrus.shoulder[1]), sy = py(m, walrus.shoulder[0], walrus.shoulder[1])
        this.home.x = sx
        this.home.y = sy
        const hand = handAt('walrus', f.meal.walrus, t, 1, 0, this.home, this.hand, this.from(f))
        const dx = hand.x - sx, dy = hand.y - sy, far = Math.hypot(dx, dy)
        if (far > 3) {
          const nx = (-dy / far) * 3.5, ny = (dx / far) * 3.5
          this.lids.push(sx + nx * 1.6, sy + ny * 1.6, hand.x + nx, hand.y + ny, sx - nx * 1.6, sy - ny * 1.6, hand.x - nx, hand.y - ny)
          this.stamp(ctx, art.sealFlipper, place(n, hand.x - (dx / far) * 16, hand.y - (dy / far) * 16, Math.atan2(dy, dx) + Math.PI / 2, 1.2, 1.2))
        }
      }
    }

    // The balloon, the puffin with its glass and its net, and the basket in front of them.
    this.stamp(ctx, art.balloon, place(m, BALLOON.x, BALLOON.y, 0.045 * clamp(f.balloon, -1, 1)))
    const duck = puffinDuck(f)
    const way: 1 | -1 = f.focus.x < PUFFIN.x ? -1 : 1
    const down = PUFFIN_AT.down * duck - 2.5 * f.puffin.lean
    if (duck < 0.98) {
      place(m, PUFFIN_AT.x, PUFFIN_AT.y + down, 0.1 * way * f.puffin.lean, way, 1)
      part(n, m, JOINTS.puffin.net[0], JOINTS.puffin.net[1], -0.5 - 0.1 * f.puffin.lean)
      if (f.meal.puffin && f.meal.puffin.act === 'take') {
        // It takes the fish in its landing net: the hoop goes out to the fish on its cane, and brings it to the bill.
        const jx = n.e, jy = n.f
        this.home.x = px(n, NET_HOOP.x, NET_HOOP.y)
        this.home.y = py(n, NET_HOOP.x, NET_HOOP.y)
        const hoop = handAt('puffin', f.meal.puffin, t, way, down, this.home, this.hand, this.from(f))
        const dx = hoop.x - jx, dy = hoop.y - jy, far = Math.hypot(dx, dy) || 1
        const ax = hoop.x - (dx / far) * NET_HOOP.far, ay = hoop.y - (dy / far) * NET_HOOP.far
        // The cane is as long as the fish is far.
        if (far > NET_HOOP.far + 2) this.lids.push(jx, jy, ax, ay)
        place(n, ax, ay, Math.atan2(dy, dx) - Math.atan2(NET_HOOP.y, NET_HOOP.x))
      }
      this.stamp(ctx, art.net, n)
      this.stamp(ctx, art.puffin, m)
      this.eye(m, JOINTS.puffin.eye[0], JOINTS.puffin.eye[1], JOINTS.puffin.eyeSize, f, f.puffin.blink)
      if (duck < 0.05 && !f.meal.puffin) {
        // The glass points at what the puffin watches, and goes out and in; held up to a visitor it is as long as it goes.
        const gx = px(m, JOINTS.puffin.glass[0], JOINTS.puffin.glass[1]), gy = py(m, JOINTS.puffin.glass[0], JOINTS.puffin.glass[1])
        const aim = clamp(Math.atan2(f.focus.y - gy, (f.focus.x - gx) * way), -0.5, 1.1)
        this.stamp(ctx, art.glass, part(n, m, JOINTS.puffin.glass[0], JOINTS.puffin.glass[1], aim, 0.45 + 0.4 * f.puffin.glass + 0.5 * f.puffin.close, 1 + 0.3 * f.puffin.close))
      }
      if (f.meal.puffin) this.meal(ctx, art, f, 'puffin', f.meal.puffin, way, down)
    }
    this.stamp(ctx, art.basket, place(m, (BASKET.x0 + BASKET.x1) / 2, BASKET.y0))

    // On the way home the penguin goes behind whatever stands on the ice.
    const sunk = pilot.pose === 'buried' || pilot.pose === 'hung'
    if (pilot.behind || sunk) this.pilot(ctx, art, f, dt)

    // The far seal, asleep.
    const snooze = SEALS[1]
    const far = f.farSeal
    const away = 1 - nearness(snooze.x, ICE_Y - 20, body, 80, 170)
    sealScale(f, 1, this.scale)
    place(m, snooze.x, ICE_Y, 0, this.scale.sx, this.scale.sy)
    this.stamp(ctx, art.farSeal, m)
    const dream = far.flat > 0.02 ? 1.5 * far.flat : far.hold > 0.02 ? -0.5 : 0.55 * far.flipper * away
    this.stamp(ctx, art.sealFlipper, part(n, m, JOINTS.farSeal.flipper[0], JOINTS.farSeal.flipper[1], -1.35 + dream, 1.2, 1.2))
    const snore = JOINTS.farSeal
    if (far.awake > 0.5) {
      // Awake, and glaring at nobody: two eyes under two brows.
      for (const [ex, ey] of snore.eyes) {
        this.pupils.push(px(m, ex, ey), py(m, ex, ey), 3.4)
        this.mark(m, ex - 8, ey - 10, ex + 7, ey - 5)
      }
    } else for (const [ex, ey] of snore.eyes) this.mark(m, ex - 6, ey, ex + 6, ey + 1.5)
    const gape = Math.max(far.snort, far.chew)
    if (gape > 0.1) this.pupils.push(px(m, snore.mouth[0], snore.mouth[1]), py(m, snore.mouth[0], snore.mouth[1]), 1.5 + 4 * gape)
    else this.mark(m, snore.mouth[0] - 7, snore.mouth[1] - 1, snore.mouth[0] + 5, snore.mouth[1] + 2)
    this.whiskers(m, snore.nose[0] - 2, snore.nose[1] + 5, 1, far.singed, far.snort)
    const bubble = far.bubble * away
    if (bubble > 0.05) {
      // The bubble at its nose, which is gone the moment anything comes near.
      const r = 2 + 12 * bubble
      this.lids.push(px(m, snore.nose[0] + 4 + r, snore.nose[1] - 4 - r), py(m, snore.nose[0] + 4 + r, snore.nose[1] - 4 - r), -r, 0)
    }
    if (Math.abs(far.squash) > 0.25) this.jolt(snooze.x, ICE_Y - snooze.r + (snooze.y - ICE_Y), far.squash)

    this.stamp(ctx, art.drift, place(m, DRIFT.x, DRIFT.y, 0, 1 + 0.05 * f.slump, 1 - 0.12 * f.slump))
    if (pilot.pose === 'bowl') {
      // It sits in the umbrella, which stands on the top of the drift inside out, like a bowl: its stick is down in the snow.
      this.pilot(ctx, art, f, dt)
      if (pilot.umbrella !== 'none') {
        ctx.save()
        this.world(ctx)
        ctx.beginPath()
        ctx.rect(pilot.x - 320, pilot.y + BOWL.foot - 520, 640, 520)
        ctx.clip()
        this.stamp(ctx, art.parts.umbrellaFlipped, part(n, this.pm, 0, BOWL.hand))
        ctx.restore()
      }
    }
    this.stamp(ctx, art.igloo, place(m, IGLOO.x, ICE_Y, 0, 1 + 0.01 * clamp(f.igloo, -1.5, 1.5), 1 - 0.015 * clamp(f.igloo, -1.5, 1.5)))

    // The chick in the doorway, unless it is riding on the penguin.
    if (f.chick.ride === null) {
      let cx = CHICK.x, cy = ICE_Y
      if (f.meal.chick && f.meal.chick.act === 'take') {
        // It hops out to the fish with its plate, and hops home with the fish on it. It does not go into the ice for one that lies low.
        restOf('chick', f.meal.chick.fish, 1, 0, this.home)
        const plate = handAt('chick', f.meal.chick, t, 1, 0, this.home, this.hand, this.from(f))
        cx += plate.x - this.home.x
        cy += Math.min(0, plate.y - this.home.y)
      }
      this.chick(ctx, art, f, place(m, cx, cy - 3 * f.chick.bob - 6 * clamp(f.chick.hop, 0, 1), 0.06 * f.chick.tilt + 0.1 * f.chick.plate, 1, 1 + 0.03 * f.chick.bob))
    }
    // Its fish is where the chick is: with a chick that rides, it is drawn with the rider.
    if (f.meal.chick && f.chick.ride === null) this.meal(ctx, art, f, 'chick', f.meal.chick, 1, 0)

    // The near seal, its ball and its two flippers.
    const seal = SEALS[0]
    const near = f.nearSeal
    sealScale(f, 0, this.scale)
    place(m, seal.x, ICE_Y, 0, this.scale.sx, this.scale.sy)
    this.stamp(ctx, art.nearSeal, m)
    const joints = JOINTS.nearSeal
    this.eye(m, joints.eyes[0][0], joints.eyes[0][1], joints.eye, f, near.blink, near.flat)
    this.eye(m, joints.eyes[1][0], joints.eyes[1][1], joints.eye, f, near.blink, near.flat)
    const open = Math.max(near.bark, near.chew)
    if (open > 0.1) this.pupils.push(px(m, joints.mouth[0], joints.mouth[1]), py(m, joints.mouth[0], joints.mouth[1]), 2 + 5 * open)
    this.whiskers(m, joints.whiskers[0], joints.whiskers[1], -1, near.singed, near.nose - 3 * near.nosing)
    // Its flippers clap, go up to steady an umbrella, and lie flat out when the spring feet have landed on it.
    const clap = Math.max(near.clap, near.hold)
    const out = 1.2 + 0.5 * near.flat
    this.stamp(ctx, art.sealFlipper, part(n, m, joints.flippers[0][0], joints.flippers[0][1], -out + 1.75 * clap, 1.1, 1.1))
    this.stamp(ctx, art.sealFlipper, part(n, m, joints.flippers[1][0], joints.flippers[1][1], out - 1.75 * clap, -1.1, 1.1))
    if (Math.abs(near.squash) > 0.25) this.jolt(seal.x, ICE_Y - seal.r + (seal.y - ICE_Y), near.squash)
    // The ball rides the nose, and is knocked off it by whatever comes by.
    this.aside = clamp(this.aside + ((wantsNose(f) ? 1 : -1) * dt) / BALL_ASIDE.takes, 0, 1)
    ballAt(f, this.at, this.aside)
    this.stamp(ctx, art.ball, place(n, this.at.x, this.at.y, near.ball * 2.2))

    // The kit: an empty place where a part is out, and its lid, which rattles.
    for (const which of PARTS) if (f.kit.out[which]) this.stamp(ctx, art.empty, place(m, SLOTS[which].x0, SLOTS[which].y0))
    this.stamp(ctx, art.lid, place(m, CRATE.x0 + 3 * f.kit.lid, ICE_Y + 4, -0.024 * Math.abs(clamp(f.kit.lid, -1, 1)), 1, 0.55))

    // The catapult on its sledge.
    const heel = JOINTS.sledge.heel
    place(m, heel[0], heel[1], -f.sledge)
    this.stamp(ctx, art.sledge, m)
    const fork = part(o, m, JOINTS.sledge.foot[0], JOINTS.sledge.foot[1], f.fork + f.sledge)
    this.stamp(ctx, art.fork, fork)

    // The pouch, with the penguin in it or without.
    const seated = pilot.pose === 'seat'
    const hang = Math.atan2(CATAPULT.fork.x - f.pouch.x, -(CATAPULT.fork.y - f.pouch.y))
    if (seated) this.pilot(ctx, art, f, dt)
    place(m, f.pouch.x, f.pouch.y, seated ? pilot.rot : hang * 0.7, 1, seated ? 1 : 0.8)
    this.stamp(ctx, art.pouch, m)
    this.bands(ctx, f, fork, m)

    if (!seated && !pilot.behind && !sunk && pilot.pose !== 'bowl') this.pilot(ctx, art, f, dt)

    // A part on its way between the kit and the penguin.
    for (const moving of f.moving) this.mover(ctx, art, moving.part, moving.along)

    if (f.berg > 0.02) {
      // The iceberg rings: short strokes stand off its corner and die away.
      for (let i = 0; i < 3; i++) {
        const a = -2.6 + i * 0.45, from = 8 + 10 * (1 - f.berg), to = from + 9
        this.lids.push(BERG.x0 + Math.cos(a) * from, BERG.y0 + Math.sin(a) * from, BERG.x0 + Math.cos(a) * to, BERG.y0 + Math.sin(a) * to)
      }
    }
    this.faces(ctx)

    // The cloud is thin: what is in it shows through. A press parts the bank it lands on.
    const drift = 5 * f.cloud.drift
    const parted = 1 + 0.03 * clamp(f.cloud.part, -1, 1)
    const left = f.cloud.partX < 320
    this.stamp(ctx, art.cloud, left ? place(m, drift, 0) : place(m, drift + (1 - parted) * f.cloud.partX, (1 - parted) * f.cloud.partY, 0, parted, parted), 0.8)
    this.stamp(ctx, art.cloudLeft, left ? place(m, -drift + (1 - parted) * f.cloud.partX, (1 - parted) * f.cloud.partY, 0, parted, parted) : place(m, -drift, 0), 0.8)
    for (let i = Math.max(0, f.holes.length - 2 * MOST_HOLES); i < f.holes.length; i += 2) this.stamp(ctx, art.hole, place(m, f.holes[i] + drift, f.holes[i + 1]))
    if (f.gull) this.stamp(ctx, art.gull, place(m, f.gull.x, f.gull.y, 0.25 * f.gull.cry * Math.sin(t * 30), f.gull.face, 1))

    // Snow, water, rubbings and bubbles: the newest, as many as the tier draws.
    const crumbs = f.crumbs
    for (let i = Math.max(0, crumbs.length - this.tier.crumbs); i < crumbs.length; i++) this.crumb(ctx, art, crumbs[i])

    // The idle ladder: a glow round the penguin, and then a hand that pulls it back.
    if (f.glow > 0.01) this.stamp(ctx, art.glow, place(m, f.pouch.x, f.pouch.y + 2, 0.04 * Math.sin(t * 2.3), 1 + 0.04 * Math.sin(t * 4.1), 1 + 0.04 * Math.sin(t * 4.1)), f.glow * (0.7 + 0.3 * Math.sin(t * 4.1)))
    if (f.hand && f.hand.opacity > 0.01) this.stamp(ctx, art.hand, place(m, f.hand.x + 4, f.hand.y + 8 - 7 * (1 - f.hand.press), -0.3, 1 - 0.06 * f.hand.press, 1 - 0.06 * f.hand.press), f.hand.opacity * 0.92)

    this.squares(ctx)
  }

  /** Every eye and every open mouth, and then every lid, brow, whisker and bubble. */
  private faces(ctx: Ctx): void {
    this.world(ctx)
    if (this.pupils.length > 0) {
      ctx.globalAlpha = 0.95
      ctx.fillStyle = rgba(GRAPHITE, 1)
      ctx.beginPath()
      for (let i = 0; i < this.pupils.length; i += 3) {
        ctx.moveTo(this.pupils[i] + this.pupils[i + 2], this.pupils[i + 1])
        ctx.arc(this.pupils[i], this.pupils[i + 1], this.pupils[i + 2], 0, Math.PI * 2)
      }
      ctx.fill()
      this.drawCalls += 1
    }
    if (this.lids.length > 0) {
      this.lead(ctx, 0.9, 1.7)
      ctx.beginPath()
      for (let i = 0; i < this.lids.length; i += 4) {
        // A negative third number is a round of that size, not a line.
        if (this.lids[i + 2] < 0) {
          ctx.moveTo(this.lids[i] - this.lids[i + 2], this.lids[i + 1])
          ctx.arc(this.lids[i], this.lids[i + 1], -this.lids[i + 2], 0, Math.PI * 2)
        } else {
          ctx.moveTo(this.lids[i], this.lids[i + 1])
          ctx.lineTo(this.lids[i + 2], this.lids[i + 3])
        }
      }
      ctx.stroke()
      this.drawCalls += 1
    }
  }

  /** A blow on a seal's belly: short strokes stand off the top of it, more the harder it was. */
  private jolt(x: number, top: number, squash: number): void {
    const far = 6 + 5 * Math.min(1.5, Math.abs(squash))
    for (let i = -1; i <= 1; i++) {
      const a = -Math.PI / 2 + i * 0.5
      this.lids.push(x + Math.cos(a) * 8 + i * 26, top - 6 + Math.sin(a) * 4, x + Math.cos(a) * (8 + far) + i * 26, top - 6 + Math.sin(a) * (4 + far))
    }
  }

  private chick(ctx: Ctx, art: Art, f: Frame, m: Mat): void {
    this.stamp(ctx, art.chick, m)
    // Its plate, held out in front: turned over, it is lifted to its face, goes edge on, and shows its underside.
    const over = Math.cos(Math.PI * clamp(f.chick.plate, 0, 1))
    this.stamp(ctx, over < 0 ? art.plateUnder : art.plate, part(this.q, m, JOINTS.chick.plate[0], JOINTS.chick.plate[1] - 14 * f.chick.plate, 0.5 * Math.sin(Math.PI * f.chick.plate), 1, Math.max(0.12, Math.abs(over))))
    this.eye(m, JOINTS.chick.eyes[0][0], JOINTS.chick.eyes[0][1], JOINTS.chick.eye, f, f.chick.blink)
    this.eye(m, JOINTS.chick.eyes[1][0], JOINTS.chick.eyes[1][1], JOINTS.chick.eye, f, f.chick.blink)
    if (f.chick.peep > 0.1) this.pupils.push(px(m, JOINTS.chick.beak[0], JOINTS.chick.beak[1]), py(m, JOINTS.chick.beak[0], JOINTS.chick.beak[1]), 1.6 + 2.2 * f.chick.peep)
  }

  /** A friend's fish, where the friend has it. */
  private meal(ctx: Ctx, art: Art, f: Frame, who: Friend, meal: Meal, way: 1 | -1, down: number, dx = 0, dy = 0): void {
    const t = f.t
    const lie = mealAt(who, meal, t, way, down, this.lie, this.from(f))
    if (lie.size <= 0.02) return
    this.stamp(ctx, meal.fish === 'frozen' ? art.parts.frozen : art.parts.fish, place(this.n, lie.x + dx, lie.y + dy, lie.rot, lie.size, lie.size * lie.tall))
    // The chick's tongue, stuck to the ice: two strokes side by side, from its beak to the block.
    const tongue = who === 'chick' ? tongueOf(meal, lie, dx, dy, this.tongue) : null
    if (tongue) for (const off of [-1.3, 1.3]) this.lids.push(tongue.x0, tongue.y0 + off, tongue.x1, tongue.y1 + off)
  }

  /** Where a fish that is being taken hung on the rod: where it was drawn there a moment ago, or at the penguin, for a view that never drew it there. */
  private from(f: Frame): Hung {
    if (f.t >= this.hung.at && f.t - this.hung.at < HUNG_LASTS) return this.hung
    this.spare.x = f.pilot.x
    this.spare.y = f.pilot.y
    return this.spare
  }

  /**
   * Where the chick's feet are when it stands on the penguin: on the top of what is drawn under it. Stuck by
   * the beak the penguin has its feet in the air, and the chick stands on them (and on the coils, when those
   * are on); lying on its belly it has its back up, or the rocket strapped to it; standing, its head.
   */
  private perch(f: Frame, out: { x: number; y: number }): { x: number; y: number } {
    const p = f.pilot, m = this.pm, joints = JOINTS.pilot
    let top = Infinity
    if (f.chick.ride === 'feet') {
      out.x = px(m, 0, joints.feet[0][1])
      const tuck = p.springs ? joints.tuck : 0, kick = 0.45 * p.feet
      for (let side = 0; side < 2; side++) {
        const foot = joints.feet[side]
        top = topIn(part(this.q, m, foot[0], foot[1] - tuck, (side ? -1 : 1) * kick), SOLE_LINE, out.x, PERCH.wide, top)
        if (p.springs) top = topIn(part(this.q, m, foot[0] + 8, foot[1] - tuck + 8, 0, 1, clamp(1 - 0.05 * p.coil, 0.45, 1.5)), OUTLINES.springs, out.x, PERCH.wide, top)
      }
    } else {
      const lying = p.skid || p.pose === 'belly' || p.pose === 'toboggan'
      out.x = lying ? px(m, -PENGUIN.r, PERCH.back) : px(m, 0, joints.crown[1])
      top = topIn(m, BODY_LINE, out.x, PERCH.wide, top)
    }
    // The rocket goes round on its strap, and can be the highest thing under the chick whichever way the penguin lies.
    if (p.rocket) top = topIn(this.tube, OUTLINES.rocket, out.x, PERCH.wide, top)
    out.y = (top === Infinity ? py(m, 0, 0) : top) + PERCH.in
    return out
  }

  /** A part on its way: out of its place in the kit in an arc, growing to its size on the penguin. */
  private mover(ctx: Ctx, art: Art, which: Part, along: number): void {
    const from = slotOf(which)
    const joints = JOINTS.pilot
    const joint = which === 'rocket' ? joints.rocket : which === 'wings' ? joints.wings : which === 'umbrella' ? joints.umbrella : which === 'balloon' ? joints.balloon : which === 'springs' ? joints.feet[0] : joints.rodTip
    const tx = px(this.pm, joint[0], joint[1]), ty = py(this.pm, joint[0], joint[1])
    const p = along * along * (3 - 2 * along)
    const size = mix(0.45, 1, p)
    const sprite = which === 'umbrella' ? art.parts.umbrellaShut : art.parts[which]
    this.stamp(ctx, sprite, place(this.n, mix(from.x, tx, p), mix(from.y, ty, p) - 90 * Math.sin(Math.PI * p), (1 - p) * 0.6, size, size))
  }

  /** The printed squares of the paper, over everything, as one stroke. */
  private squares(ctx: Ctx): void {
    const scale = this.by.scale
    this.world(ctx)
    ctx.globalAlpha = 1
    ctx.strokeStyle = GRID_INK
    ctx.lineWidth = Math.max(1, this.dpr * 0.8) / this.k
    const x0 = -this.by.x / scale, y0 = -this.by.y / scale
    const x1 = x0 + this.width / scale, y1 = y0 + this.height / scale
    ctx.beginPath()
    for (let x = Math.ceil(x0 / SQUARE) * SQUARE; x <= x1; x += SQUARE) { ctx.moveTo(x, y0); ctx.lineTo(x, y1) }
    for (let y = Math.ceil(y0 / SQUARE) * SQUARE; y <= y1; y += SQUARE) { ctx.moveTo(x0, y); ctx.lineTo(x1, y) }
    ctx.stroke()
    this.drawCalls += 1
  }

  /** A pencil line through points, `dy` below where they lie. A point that is not a number breaks the line. */
  private path(ctx: Ctx, points: readonly number[], tone: number, width: number, dy: number): void {
    if (points.length < 4) return
    this.lead(ctx, tone, width)
    ctx.beginPath()
    let pen = false
    for (let i = 0; i < points.length; i += 2) {
      if (Number.isNaN(points[i])) { pen = false; continue }
      if (pen) ctx.lineTo(points[i], points[i + 1] + dy)
      else ctx.moveTo(points[i], points[i + 1] + dy)
      pen = true
    }
    ctx.stroke()
    this.drawCalls += 1
  }

  /** The whale's water: a few wavering strokes up from the blowhole, as high as it is blowing, leaning as the water leans. */
  private spout(ctx: Ctx, f: Frame): void {
    this.world(ctx)
    this.lead(ctx, 0.7, 1.6)
    const high = (SPOUT.bottom - SPOUT.top) * f.whale.blow
    const top = SPOUT.bottom - high
    const lean = (y: number): number => (SPOUT.lean * 0.5 * (SPOUT.bottom - y)) / (SPOUT.bottom - SPOUT.top)
    ctx.beginPath()
    for (let line = 0; line < 5; line++) {
      const x = SPOUT.x + (line - 2) * (SPOUT.half / 2.6)
      ctx.moveTo(x * 0.3 + SPOUT.x * 0.7, SPOUT.bottom)
      for (let y = SPOUT.bottom - 14; y > top; y -= 14) ctx.lineTo(x + lean(y) + 3 * Math.sin(y * 0.06 + f.t * 16 + line), y)
      // Each stroke curls over at the top.
      const side = line < 2 ? -1 : line > 2 ? 1 : 0
      ctx.quadraticCurveTo(x + lean(top) + side * 6, top - 12, x + lean(top) + side * 16, top + 6)
    }
    ctx.stroke()
    this.drawCalls += 1
  }

  /** The two bands, from the tips of the fork to the eyelets of the pouch. Past their reach they tremble. */
  private bands(ctx: Ctx, f: Frame, fork: Mat, pouch: Mat): void {
    this.world(ctx)
    this.lead(ctx, 0.95, 3.6 - 1.7 * f.stretch)
    ctx.beginPath()
    for (let side = 0; side < 2; side++) {
      const tip = JOINTS.fork.tips[side], tie = JOINTS.pouch.ties[side]
      const x0 = px(fork, tip[0], tip[1]), y0 = py(fork, tip[0], tip[1])
      const x1 = px(pouch, tie[0], tie[1]), y1 = py(pouch, tie[0], tie[1])
      const far = Math.hypot(x1 - x0, y1 - y0) || 1
      // A slack band bows; a band pulled past its reach shakes.
      const bow = (1 - f.stretch) * 5 * (side ? 1 : -1) + f.tremble * 3.5 * Math.sin(f.t * 95 + side * 2)
      ctx.moveTo(x0, y0)
      ctx.quadraticCurveTo((x0 + x1) / 2 - ((y1 - y0) / far) * bow, (y0 + y1) / 2 + ((x1 - x0) / far) * bow, x1, y1)
    }
    ctx.stroke()
    this.drawCalls += 1
  }

  /** Where the penguin is drawn in this frame: the placing its body, its parts and its riders share. */
  private placePilot(f: Frame): Mat {
    const p = f.pilot
    const x = p.x + 2.2 * p.shiver * Math.sin(f.t * 75)
    // In the sea it floats low, as a bath duck does, and bobs.
    const y = p.pose === 'bob' ? p.y + 24 + 3 * Math.sin(f.t * 3.1) : p.y
    const squash = clamp(p.squash, 0.6, 1.35)
    return place(this.pm, x, y, p.rot, p.face * (1 + (1 - squash) * 0.7), squash)
  }

  /** The penguin, part by part, from what is furthest from the eye to what is nearest, with whatever is bolted on. */
  private pilot(ctx: Ctx, art: Art, f: Frame, dt: number): void {
    const p = f.pilot, t = f.t
    if (p.pose === 'under' || p.pose === 'gone') return
    const m = this.pm, n = this.n
    const joints = JOINTS.pilot
    const kick = 0.45 * p.feet
    if (p.pose === 'buried') {
      // Only the feet show, out of the top of the drift, and they kick.
      const along = clamp((p.x - DRIFT.x) / DRIFT.rx, -0.8, 0.8)
      const top = DRIFT.y - DRIFT.ry * Math.sqrt(1 - along * along)
      place(this.m, DRIFT.x + along * DRIFT.rx, top + 46, Math.PI + 0.3 * along)
      const wild = kick * (0.6 + 0.8 * p.waggle)
      this.stamp(ctx, art.foot, part(n, this.m, joints.feet[0][0], joints.feet[0][1], -Math.PI / 2 + wild))
      this.stamp(ctx, art.foot, part(n, this.m, joints.feet[1][0], joints.feet[1][1], -Math.PI / 2 - wild))
      // The balloon stays above the drift, tugging at its string.
      if (p.balloon) this.stamp(ctx, art.parts.balloon, place(n, DRIFT.x + along * DRIFT.rx - 26, top + 4 - 5 * Math.abs(Math.sin(t * 7)), 0.1 * Math.sin(t * 7), 1, 1 + 0.04 * Math.sin(t * 14)))
      return
    }
    const x = m.e, y = m.f

    // What is under the ice or the water is not seen: the beak that is stuck in, and the tip of it that ploughs the snow when it lies on its belly.
    const lying = p.skid || p.pose === 'belly' || p.pose === 'toboggan'
    const cut = p.pose === 'beak' || p.pose === 'bob' || lying
    if (cut) {
      ctx.save()
      this.world(ctx)
      ctx.beginPath()
      ctx.rect(x - 320, (p.pose === 'bob' ? SEA_Y + 1 : p.y + PENGUIN.r) - 520, 640, 520)
      ctx.clip()
    }

    // The scarf's tail hangs when the penguin is still and streams behind it when it moves; the walrus's sigh blows it straight out.
    if (dt > 0) {
      const vx = clamp((x - this.lastX) / dt, -700, 700), vy = clamp((y - this.lastY) / dt, -700, 700)
      const wantX = mix(-vx / 260 - 0.2 * p.face, -1.6, p.blown), wantY = mix(-vy / 260 + 1, -0.1, p.blown)
      const ease = Math.min(1, dt * 9)
      this.tailX += (wantX - this.tailX) * ease
      this.tailY += (wantY - this.tailY) * ease
      this.laid += ((lying ? 1 : 0) - this.laid) * Math.min(1, dt * 14)
    }
    this.lastX = x
    this.lastY = y

    const flying = p.pose === 'fly'
    const spread = flying ? 1.5 + 0.45 * Math.sin(t * 21) : 0.25 + 1.5 * p.flap
    const wide = flying || p.pose === 'belly' || p.pose === 'toboggan' || p.pose === 'hung'
    // What is in the snow or the water, or behind the things on the ice, is where it is said to be: nothing there is turned out of anything.
    const loose = !p.behind && p.pose !== 'hung' && p.pose !== 'bowl' && p.pose !== 'bob'
    const free = (placed: Mat, shape: PartShape, way = 0, about?: Mat): Mat => {
      if (loose) freed(placed, shape, way, about)
      return placed
    }

    // The balloon floats straight up from its knot, whichever way the penguin is turned.
    if (p.balloon) {
      const kx = px(m, joints.balloon[0], joints.balloon[1]), ky = py(m, joints.balloon[0], joints.balloon[1])
      // A seal that has just nosed it: the balloon is squashed on the nose and leans back to it as the penguin goes up.
      const nosed = p.nosed ? Math.sin(Math.PI * p.nosed.p) : 0
      const lean = p.nosed ? clamp(Math.atan2(p.nosed.x - kx, -(p.nosed.y - ky)), -2.2, 2.2) * 0.8 * nosed : 0
      this.stamp(ctx, art.parts.balloon, free(place(n, kx, ky, 0.07 * Math.sin(t * 1.3) + lean, 1 + 0.12 * nosed, (p.dewy ? 0.9 : 1) * (1 - 0.3 * nosed)), 'balloon'))
      // Dew hangs under it.
      if (p.dewy) this.stamp(ctx, art.crumbs.drop, place(n, kx + 6 * Math.sin(t * 1.3), ky - 92, 0, 1.6, 1.6))
    }
    // The wings: one on either side. Soaked they droop, and with more than they hold they flutter.
    const droop = (p.soaked ? 0.5 : 0) + 0.3 * p.flutter * Math.sin(t * 60)
    // Lying down, the wing that is under it is folded back along its side, and trails.
    if (p.wings && wide) this.stamp(ctx, art.parts.wings, free(part(n, m, -joints.wings[0] - 14, joints.wings[1], droop + LYING.wing * this.laid, -1, 1), 'wings', p.face))
    if (p.rocket) {
      // The rocket, and its flame at its tail, wherever its strap has it.
      const tube = free(part(this.tube, m, joints.rocket[0], joints.rocket[1]), 'rocket', 0, m)
      const tailX = joints.flame[0] - joints.rocket[0], tailY = joints.flame[1] - joints.rocket[1]
      this.stamp(ctx, art.parts.rocket, tube)
      if (p.flame > 0.02) {
        if (p.flame > 0.9) this.stamp(ctx, art.flame, part(n, tube, tailX, tailY, 0.12 * Math.sin(t * 47), 1, p.flame * (0.8 + 0.3 * Math.abs(Math.sin(t * 31)))))
        else {
          // The pilot flame: small and narrow, sputtering, and leaning to where the last touch was.
          const fx = px(tube, tailX, tailY), fy = py(tube, tailX, tailY)
          const det = tube.a * tube.d - tube.b * tube.c || 1
          const tx = p.flameTo.x - fx, ty = p.flameTo.y - fy
          const lx = (tube.d * tx - tube.c * ty) / det, ly = (-tube.b * tx + tube.a * ty) / det
          const lean = clamp(Math.atan2(-lx, ly), -PILOT_LEANS, PILOT_LEANS)
          const sputter = 0.55 + 0.45 * Math.abs(Math.sin(t * 23)) * Math.abs(Math.sin(t * 7.3))
          this.stamp(ctx, art.flame, part(n, tube, tailX, tailY, lean + 0.08 * Math.sin(t * 41), 0.45 + 0.5 * p.flame, p.flame * sputter))
        }
      }
    }
    // Lying down, the rod is carried over the back and trails behind, the fish above the ice; stuck by the beak, it stands up out of the way.
    const lean = p.pose === 'beak' ? Math.PI * 0.6 : LYING.rod * this.laid
    const rod = free(part(this.rod, m, joints.rod[0], joints.rod[1], lean), 'rod')
    if (p.rod) this.stamp(ctx, art.parts.rod, rod)
    this.stamp(ctx, art.flipper, part(n, m, joints.farFlipper[0], joints.farFlipper[1], spread * 0.9 + 0.2))
    // The feet, on their coils when the spring feet are on.
    const tuck = p.springs ? joints.tuck : 0
    // Sat in the umbrella, its feet are down in the bowl.
    for (let side = 0; side < 2 && p.pose !== 'bowl'; side++) {
      const foot = joints.feet[side], way = side ? -1 : 1
      this.stamp(ctx, art.foot, part(n, m, foot[0], foot[1] - tuck, way * kick))
      if (p.springs) this.stamp(ctx, art.parts.springs, free(part(n, m, foot[0] + 8, foot[1] - tuck + 8, 0.5 * p.jangle * Math.sin(t * 40 + side * 2), 1, clamp(1 - 0.05 * p.coil, 0.45, 1.5)), 'springs'))
    }
    // The tail's direction on the page, turned into the body's own frame.
    const det = m.a * m.d - m.b * m.c || 1
    const lx = (m.d * this.tailX - m.c * this.tailY) / det, ly = (-m.b * this.tailX + m.a * this.tailY) / det
    this.stamp(ctx, art.scarf, part(n, m, joints.scarf[0], joints.scarf[1], Math.atan2(ly, lx) + 0.12 * Math.sin(t * 13) * Math.min(1, Math.hypot(this.tailX, this.tailY) - 0.9)))
    this.stamp(ctx, art.pilot, m)
    if (p.sooty) this.stamp(ctx, art.crumbs.soot, part(n, m, 12, 18, 0.4, 3.2, 3.6), 0.6)
    this.stamp(ctx, art.beak, part(n, m, joints.beak[0], joints.beak[1], 0.5 * p.beak))
    this.stamp(ctx, art.flipper, part(n, m, joints.flipper[0], joints.flipper[1], spread))
    if (p.wings) this.stamp(ctx, art.parts.wings, free(part(n, m, joints.wings[0], joints.wings[1], wide ? -droop : -1.25), 'wings'))
    if (p.nose && p.umbrella !== 'none') {
      // Balanced on a seal's nose: the open umbrella, turned over, stands on the nose by its point. Its cloth is a bowl and the penguin sits in it, beside the stick.
      const sway = 0.05 * Math.sin(t * 9)
      this.stamp(ctx, art.parts.umbrellaOpen, place(n, p.nose.x + NOSE_STICK * Math.sin(sway), p.nose.y - NOSE_STICK * Math.cos(sway), Math.PI + sway))
    } else if (p.umbrella !== 'none' && p.pose !== 'bowl') {
      let shape: PartShape = p.umbrella === 'open' ? 'umbrellaOpen' : p.umbrella === 'flipped' ? 'umbrellaFlipped' : 'umbrellaShut'
      const hand = part(n, m, joints.umbrella[0], joints.umbrella[1])
      // Where its cloth has no room to be open, between the shelf and the iceberg, what it meets knocks it shut.
      if (loose && !freed(hand, shape) && shape !== 'umbrellaShut') {
        shape = 'umbrellaShut'
        freed(hand, shape)
      }
      this.stamp(ctx, art.parts[shape], hand)
    }
    if (p.rod && p.fish) {
      // The fish hangs straight down from the end of the line, and swings.
      const hx = px(rod, joints.rodTip[0] - joints.rod[0], joints.rodTip[1] - joints.rod[1]), hy = py(rod, joints.rodTip[0] - joints.rod[0], joints.rodTip[1] - joints.rod[1])
      // On the ice it lies over, its tail behind.
      this.stamp(ctx, p.fish === 'frozen' ? art.parts.frozen : art.parts.fish, free(place(n, hx, hy, clamp(p.swing, -1.2, 1.2) * (p.fish === 'frozen' ? 0.4 : 1)), p.fish === 'frozen' ? 'frozen' : 'fish', p.face))
      this.hung.x = n.e
      this.hung.y = n.f
      this.hung.rot = Math.atan2(n.b, n.a)
      this.hung.at = t
      if (p.fish === 'wet') this.stamp(ctx, art.crumbs.drop, place(n, hx + 3 * Math.sin(t * 5), hy + 64 + ((t * 40) % 14), 0, 1, 1), 0.8)
    }
    if (p.misted) this.stamp(ctx, art.crumbs.mist, part(n, m, joints.chin[0], joints.chin[1], 0, 2, 2))
    if (p.shaving) this.stamp(ctx, art.shaving, part(n, m, joints.crown[0], joints.crown[1] + 8))
    if (cut) ctx.restore()

    // The chick, riding. It hops from its doorway onto what is drawn under it and stands on that: the penguin's head, its back when it lies, its feet when it stands on its beak. It hops home the same way.
    if (f.chick.ride !== null) {
      const on = this.perch(f, this.at)
      const s = clamp(f.chick.onto, 0, 1)
      const rx = mix(CHICK.x, on.x, s), ry = mix(ICE_Y - 3 * f.chick.bob, on.y, s) - PERCH.hop * Math.sin(Math.PI * s)
      this.chick(ctx, art, f, place(this.m, rx, ry, 0.06 * f.chick.tilt, 1, 1 + 0.03 * f.chick.bob))
      if (f.meal.chick) this.meal(ctx, art, f, 'chick', f.meal.chick, 1, 0, rx - CHICK.x, ry - ICE_Y)
    }

    // Its eyes, behind the goggles: wide in the hand and in the air, shut on its belly, fogged by the cloud, and under the ice when it lands on its beak.
    if (p.behind || p.misted || p.pose === 'beak') return
    const shut = p.pose === 'belly' ? 1 : p.blink
    for (const lens of joints.lenses) this.eye(m, lens[0], lens[1], joints.lens * 0.8, f, shut, p.wide)
  }

  private crumb(ctx: Ctx, art: Art, crumb: Crumb): void {
    const left = 1 - crumb.age / crumb.life
    const grow = crumb.kind === 'smudge' ? Math.min(1, crumb.age * 6) : crumb.kind === 'dot' ? 1 : crumb.size / 7
    const alpha = crumb.kind === 'smudge' ? Math.min(1, left * 3) : crumb.kind === 'dot' ? Math.min(1, left * 5) : Math.min(1, left * 2.5)
    this.stamp(ctx, art.crumbs[crumb.kind], place(this.n, crumb.x, crumb.y, crumb.kind === 'snow' ? crumb.age * 5 : 0, grow, grow), alpha)
  }
}
