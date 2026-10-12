import { BEFORE_HOG, IN_WATER, NESTED, ON_BALL, ON_PATH, ON_STONE, PAIRED, STOLEN, TOUCHED, afloat, still, type Go } from './cells'
import { DOOR, HEDGEHOG, JAY, JAY_BANK, NEST_SLOTS, ON_SPINES, PUDDLE_SLOT, SPOTS, STONE_SPOT, TOAD_FOOT, TOAD_HOME, TUCKS, type P } from './layout'
import { bump, clamp01, coverPose, ease, helloPose, lerp, type CoverPose } from './motion'
import { BOWL_SLOT, PAIR_REACH, ROOM_DOOR, SILL, TABLE, TABLE_EDGE } from './room'
import type { Where } from './save'
import { acting, amount, homeOf, landed, seconds, stirOf, tuckAt, type Act, type Toy } from './toy'
import { THINGS, membersOf, pairOf, type PairId, type ThingId } from './wood'

// Where everything that moves about is at this moment of the model's clock:
// each of the six things, the toad, the jay in flight, the hedgehog on his
// walk. The view draws from these and a touch is tested against these, so a
// thing is touched where it is drawn, in every state.

const span = (s: number, a: number, b: number): number => clamp01((s - a) / (b - a))
const smooth = (s: number, a: number, b: number): number => ease(span(s, a, b))
const between = (a: P, b: P, u: number): P => ({ x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) })

/** From the jay's middle to where a thing hangs in his beak, and from a thing on the ground to his middle when he stands at it. */
export const BEAK: P = { x: -76, y: -62 }
export const STAND: P = { x: 74, y: -56 }
/** On top of the rolled-up hedgehog, and on the spine the feather sticks on. */
export const BALL_TOP: P = { x: HEDGEHOG.x - 47, y: HEDGEHOG.y - 95 }
export const SPINE: P = { x: HEDGEHOG.x + 33, y: HEDGEHOG.y - 98 }

/** Whether a place a thing is in belongs to the room at the table. */
export const indoors = (where: Where): boolean => where.at === 'table' || where.at === 'bowl'

/**
 * Where the leaf on the puddle (in winter the sheet of ice) is now: where its cover's motion has it, and, while
 * it sails its slow circle with the snail on it, round that circle. The view draws it here.
 */
export function leafNow(toy: Toy): CoverPose {
  const pose = coverPose('puddle', amount(toy, 'puddle'), stirOf(toy, 'puddle'), landed(toy, 'puddle'))
  const s = seconds(toy, 'cover:puddle', 'ferry')
  if (s === null) return pose
  const round = span(s, 0.5, 2.9) * Math.PI * 2
  return { ...pose, x: pose.x + Math.sin(round) * 24, y: pose.y + (Math.cos(round) - 1) * 8 }
}

/** From the middle of the leaf to where the snail sits on it: towards its tip, so the rest of the leaf can still be touched. */
const SEAT: P = { x: 38, y: -6 }

/** Where the snail sits on the leaf of the puddle: it goes where the leaf goes, shut, open or sailing. */
export function snailSeat(toy: Toy): P {
  const leaf = leafNow(toy), cos = Math.cos(leaf.turn), sin = Math.sin(leaf.turn)
  return { x: leaf.x + SEAT.x * cos - SEAT.y * sin, y: leaf.y + SEAT.x * sin + SEAT.y * cos }
}

/** Where a thing lies, in the frame it is in, when nothing moves it. Null when it is under no cover this season. */
export function restOf(toy: Toy, thing: ThingId): P | null {
  const where = toy.things[thing]
  switch (where.at) {
    case 'home': { const place = homeOf(toy, thing); return place ? SPOTS[place].find : null }
    case 'path': case 'table': return { x: where.x, y: where.y }
    case 'stone': return STONE_SPOT
    // The snail will not go under: it sits on the leaf. Everything else lies in the open water beside the leaf.
    case 'puddle': return thing === 'snail' ? snailSeat(toy) : PUDDLE_SLOT
    case 'bowl': return BOWL_SLOT
    case 'hedgehog': return ON_SPINES
    case 'nest': return NEST_SLOTS[THINGS.filter((other) => toy.things[other].at === 'nest').indexOf(thing)]
  }
}

// --- The pairs on the table -----------------------------------------------------------

export type Couple = { pair: PairId; first: ThingId; second: ThingId; side: number }

/** The pairs on the table: two things nearer than the reach, the nearest two first, each thing in one pair at most. A view of saved points. */
export function pairsOf(toy: Toy): Couple[] {
  const lying = THINGS.filter((thing) => toy.things[thing].at === 'table' && toy.hand?.thing !== thing)
  const near: { a: ThingId; b: ThingId; far: number }[] = []
  for (let i = 0; i < lying.length; i++) for (let j = i + 1; j < lying.length; j++) {
    const p = restOf(toy, lying[i])!, q = restOf(toy, lying[j])!, far = Math.hypot(p.x - q.x, p.y - q.y)
    if (far <= PAIR_REACH) near.push({ a: lying[i], b: lying[j], far })
  }
  near.sort((p, q) => p.far - q.far)
  const taken = new Set<ThingId>(), couples: Couple[] = []
  for (const { a, b } of near) {
    if (taken.has(a) || taken.has(b)) continue
    taken.add(a); taken.add(b)
    couples.push({ pair: pairOf(a, b), first: a, second: b, side: restOf(toy, b)!.x >= restOf(toy, a)!.x ? 1 : -1 })
  }
  return couples
}

export function coupleOf(toy: Toy, thing: ThingId): Couple | null {
  return pairsOf(toy).find((couple) => couple.first === thing || couple.second === thing) ?? null
}

// --- The hedgehog's walk, the jay's flights, the toad's leaps --------------------------

/** How far the hedgehog has stepped from where he sits: the small proud circle he walks with the apple on his back. */
export function hogShift(toy: Toy): P {
  const s = seconds(toy, 'hedgehog', 'hog:apple')
  if (s === null) return { x: 0, y: 0 }
  const round = span(s, 0.9, 2.4) * Math.PI * 2
  return { x: Math.sin(round) * 26, y: (Math.cos(round) - 1) * 7 }
}

type Flight = { down: readonly [number, number]; up: readonly [number, number]; stand: P }
const flight = (down: readonly [number, number], up: readonly [number, number], stand: P = STAND): Flight => ({ down, up, stand })

/** When the jay leaves his nest and when he is back, for each thing he flies down for, and where he stands by it. */
export const FLIGHTS: Readonly<Record<string, Flight>> = {
  'steal:button': flight([0.6, 1.5], [1.9, 3.2]), 'steal:worm': flight([0.6, 1.5], [1.9, 3.2]), 'steal:snail': flight([0.6, 1.5], [1.9, 3.2]), 'steal:feather': flight([0.6, 1.5], [1.9, 3.2]),
  'steal:acorn': flight([0.6, 1.5], [3.3, 4.2]), 'steal:apple': flight([0.6, 1.5], [3.5, 4.2]),
  'path:snail': flight([1.5, 2.1], [3.1, 3.8]), 'path:acorn': flight([1.2, 1.9], [2.3, 3]), 'path:apple': flight([1.3, 1.9], [3.4, 4], { x: 8, y: -112 }),
  'water:button': flight([0.2, 0.9], [2.6, 3.3], { x: 0, y: -78 }),
}

/** Where the jay's middle is: on the rim of his nest, or somewhere on his way to a thing and back. */
export function jayBody(toy: Toy): P {
  const act = acting(toy, 'jay'), plan = act ? FLIGHTS[act.kind] : undefined
  if (!act || !plan) return JAY
  const s = toy.time - act.since, k = smooth(s, plan.down[0], plan.down[1]) * (1 - smooth(s, plan.up[0], plan.up[1]))
  // The apple is dragged while he stands at it, so where he stands moves with it.
  const ground = act.kind === 'steal:apple' ? between(act.from, act.to, smooth(s, 1.6, 3.2)) : act.kind === 'water:button' ? JAY_BANK : act.to
  const at = between(JAY, { x: ground.x + plan.stand.x, y: ground.y + plan.stand.y }, k)
  at.x += Math.sin(k * Math.PI) * 44
  if (act.kind === 'steal:acorn' && s < 3.3) at.y -= 46 * STOLEN.acorn.pose(s).held * span(s, 1.62, 1.9)
  if (act.kind === 'path:apple') { at.x += 64 * smooth(s, 3, 3.2) * (1 - smooth(s, 3.4, 4)); at.y += 96 * smooth(s, 3, 3.25) * (1 - smooth(s, 3.4, 4)) }
  return at
}

/** How far off his nest the jay is, from 0 to 1. */
export function jayAway(toy: Toy): number {
  return clamp01(Math.hypot(jayBody(toy).x - JAY.x, jayBody(toy).y - JAY.y) / 60)
}

/** When in each of his acts the toad leaves the ground and when he lands, in seconds, and how high he goes. */
const LEAPS: readonly { kind: string; up: number; land: number; high: number }[] = [
  { kind: 'stone:apple', up: 0.4, land: 1.5, high: 300 }, { kind: 'stone:', up: 1.7, land: 2.6, high: 150 }, { kind: 'home', up: 0.1, land: 0.9, high: 150 },
]

/** Where the toad sits when nothing moves him, and in which frame. */
export function toadRest(toy: Toy): { feet: P; room: boolean } {
  const at = toy.toadAt
  switch (at.at) {
    case 'stone': return { feet: TOAD_HOME, room: false }
    case 'seat': return { feet: SPOTS[at.place].seat, room: false }
    case 'foot': return { feet: TOAD_FOOT, room: false }
    case 'path': return { feet: { x: at.x, y: at.y }, room: false }
    case 'table': return { feet: { x: at.x, y: at.y }, room: true }
  }
}

export type ToadNow = {
  feet: P
  /** Which frame he is seen in. */
  room: boolean
  /** How far through a leap he is, from 0 to 1, or null on the ground; and how high the leap goes. */
  leap: number | null
  high: number
  /** Seconds since he landed from the leap of his act, or null. */
  landed: number | null
}

/** Where the toad is now: where he sits, or in the air between where he sat and where he will sit. */
export function toadNow(toy: Toy): ToadNow {
  const act = acting(toy, 'toad'), rest = toadRest(toy)
  const plan = act ? LEAPS.find((leap) => act.kind === leap.kind || (leap.kind.endsWith(':') && act.kind.startsWith(leap.kind))) : undefined
  if (!act || !plan) return { ...rest, leap: null, high: 0, landed: null }
  const s = toy.time - act.since
  if (s >= plan.land) return { ...rest, leap: null, high: plan.high, landed: act.room === rest.room ? s - plan.land : null }
  const u = span(s, plan.up, plan.land)
  return { feet: between(act.from, act.to, ease(u)), room: act.room, leap: s < plan.up ? null : u, high: plan.high, landed: null }
}

/** The way out of a frame: where a leap or a roll that ends in the other frame goes out of sight. */
export const wayOut = (room: boolean): P => (room ? { x: ROOM_DOOR.x, y: ROOM_DOOR.y + 60 } : { x: DOOR.x, y: DOOR.y + 50 })

// --- The six things ---------------------------------------------------------------------

export type Drawn = {
  /** The middle of the thing, in the frame it is seen in. */
  at: P
  room: boolean
  pose: Go
  /** How large it is drawn, as a share of the size it was cut at. */
  scale: number
  /** It is in the hand. */
  inHand: boolean
}

/** How large a thing is drawn under its cover, where it is what the child came to see, and how large anywhere else. */
export const FOUND = 1.25
export const LYING = 1
/** How large a thing on the table at home shows through the door of the house, from the wood. */
export const MINI = 0.3

/**
 * Where a thing that is in the room shows through the door of the house: on the corner of the table that is seen
 * there, as far along it as it lies along the table, or over the bowl. Null for a thing that is not in the room.
 */
export function miniSpot(toy: Toy, thing: ThingId): P | null {
  const where = toy.things[thing]
  if (where.at === 'bowl') return { x: 1139, y: 446 }
  if (where.at !== 'table') return null
  const x = 1094 + ((where.x - TABLE.x0) / (TABLE.x1 - TABLE.x0)) * 66
  return { x, y: 459 - ((x - 1086) / 84) * 8 }
}

/** Whether the hole the snail has eaten in the apple shows yet: from its first rasp. */
export function biteShows(toy: Toy): boolean {
  return toy.bitten && toy.time >= toy.biteAt
}

const cellOf = (kind: string): ((s: number) => Go) | null => {
  const [family, thing] = kind.split(':') as [string, ThingId]
  switch (family) {
    case 'touched': return TOUCHED[thing].pose
    case 'hog': return BEFORE_HOG[thing].pose
    case 'ball': return thing === 'worm' ? null : ON_BALL[thing].pose
    case 'path': return thing === 'button' ? null : ON_PATH[thing].pose
    case 'stone': return ON_STONE[thing].pose
    case 'water': return IN_WATER[thing].pose
    default: return null
  }
}

/** A landing: a squash that rings out after the moment `at`. */
const thud = (s: number, at: number, depth: number): number => (s < at ? 0 : depth * Math.exp(-9 * (s - at)) * Math.cos(24 * (s - at)))

function inAct(toy: Toy, thing: ThingId, act: Act): Drawn {
  const s = toy.time - act.since, kind = act.kind, family = kind.split(':')[0]
  const drawn = (at: P, pose: Go, scale = LYING): Drawn => ({ at: { x: at.x + pose.dx, y: at.y + pose.dy }, room: act.room, pose, scale, inHand: false })
  if (family === 'steal') {
    const pose = STOLEN[thing].pose(s)
    if (s >= NESTED[thing]) return drawn(between({ x: JAY.x + BEAK.x, y: JAY.y + BEAK.y }, act.to, smooth(s, NESTED[thing], NESTED[thing] + 0.12)), { ...still(), show: 1 })
    const body = jayBody(toy), ground = thing === 'apple' ? between(act.from, act.to, pose.go) : act.from
    return drawn(between(ground, { x: body.x + BEAK.x, y: body.y + BEAK.y }, pose.held), pose)
  }
  if (family === 'pair') {
    const couple = { pair: kind.slice(5) as PairId, side: act.n }, [first] = membersOf(couple.pair)
    const pose = PAIRED[couple.pair].pose(s, couple.side)[thing === first ? 0 : 1]
    return drawn(between(act.from, act.to, pose.go), pose)
  }
  switch (kind) {
    // Tipped out of the nest: one arc down to the foot of the tree, and a landing.
    case 'tip': { const u = span(s, act.n, act.n + 0.6), q = thud(s, act.n + 0.6, 0.18); return drawn(between(act.from, act.to, u), { ...still(), dy: -70 * Math.sin(u * Math.PI) * (1 - u * 0.5), turn: u * 4 * (1 - span(s, act.n + 0.6, act.n + 0.8)), sx: 1 + q, sy: 1 - q }) }
    // Sent in through the door: it sails in, growing small with the distance, and lands on the table that shows through it.
    case 'sent': { const u = smooth(s, 0, 0.45), q = thud(s, 0.45, 0.2); return drawn(between(act.from, act.to, u), { ...still(), dy: -50 * Math.sin(u * Math.PI), sx: 1 + q, sy: 1 - q, turn: u * 3 * (1 - span(s, 0.3, 0.45)) }, lerp(LYING, MINI, u)) }
    // No room on the table: off the edge, across the floor and out through the door.
    case 'rolloff': { const u = span(s, 0, 0.5), v = span(s, 0.6, 1.5), at = v > 0 ? between(SILL, wayOut(true), v) : between(between(act.from, TABLE_EDGE, smooth(s, 0, 0.35)), SILL, span(s, 0.35, 0.5) ** 2); return drawn(at, { ...still(), turn: (u + v) * 7, dy: v > 0 ? -12 * Math.abs(Math.sin(v * 9)) * (1 - v) : 0, show: s >= 1.5 ? 0 : 1 }) }
    // Rocks once where it landed on the table's edge, when the child comes home.
    case 'rock': { const u = span(s, act.n, act.n + 0.6); return drawn(act.to, { ...still(), turn: Math.sin(u * Math.PI * 2) * 0.3 * (1 - u), dy: -6 * bump(u, 0, 0.5) }) }
    // Set down where nothing happens, or back into its own hollow.
    case 'set': case 'home': { const q = thud(s, 0.2, 0.14); return drawn(between(act.from, act.to, smooth(s, 0, 0.2)), { ...still(), sx: 1 + q, sy: 1 - q }, kind === 'home' ? lerp(LYING, FOUND, smooth(s, 0, 0.2)) : LYING) }
  }
  const cell = cellOf(kind)
  if (!cell) return drawn(act.to, still())
  // The snail set in the puddle climbs onto the leaf and is on it from then on: the leaf sails the circle, and the snail goes where the leaf is.
  if (kind === 'water:snail' && !act.room) { const pose = cell(s); return drawn(between(act.from, snailSeat(toy), pose.go), { ...pose, dx: 0, dy: 0 }) }
  // The worm's dive waits for him to unroll: `n` is how long that takes.
  let pose = cell(family === 'hog' && thing === 'worm' ? s - act.n : s)
  // The worm on the path turns to where it tucks its head in: the cell says how far it has turned, the act which way.
  if (kind === 'path:worm') pose = { ...pose, turn: pose.turn * act.n }
  // What he wears goes where he goes.
  const shift = family === 'hog' && thing === 'apple' ? hogShift(toy) : { x: 0, y: 0 }
  const at = between(act.from, act.to, pose.go)
  return drawn({ x: at.x + shift.x * pose.go, y: at.y + shift.y * pose.go }, pose, kind.startsWith('touched') && toy.things[thing].at === 'home' ? FOUND : LYING)
}

/** Where a thing is drawn now and how, or null when it cannot be seen in either frame. */
export function drawn(toy: Toy, thing: ThingId): Drawn | null {
  const hand = toy.hand
  if (hand && hand.thing === thing && hand.carried) {
    const sway = Math.sin(toy.time * 7) * 0.05
    return { at: hand.at, room: toy.room, pose: { ...still(), turn: sway, sy: 1.04 }, scale: 1.12, inHand: true }
  }
  const act = acting(toy, `thing:${thing}`)
  if (act) return inAct(toy, thing, act)
  const where = toy.things[thing], rest = restOf(toy, thing)
  if (!rest) return null
  const lying = (at: P, pose: Go, scale = LYING): Drawn => ({ at: { x: at.x + pose.dx, y: at.y + pose.dy }, room: indoors(where), pose, scale, inHand: false })
  switch (where.at) {
    case 'home': {
      const place = homeOf(toy, thing)!
      if (amount(toy, place) <= 0.3) return null
      const hello = seconds(toy, `find:${place}`, 'hello'), cover = toy.covers[place]
      const pose = hello !== null ? helloPose(hello / 0.4) : cover.open && !cover.greeted ? helloPose(0) : { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, own: 0 }
      return lying(rest, { ...still(), ...pose }, FOUND)
    }
    case 'puddle': case 'bowl': return lying(rest, thing === 'snail' && where.at === 'puddle' ? still() : afloat(thing, toy.time))
    case 'stone': return lying(rest, thing === 'feather' ? { ...still(), turn: -0.95 + Math.sin(toy.time * 3) * 0.06 } : still())
    case 'hedgehog': { const shift = hogShift(toy); return lying({ x: rest.x + shift.x, y: rest.y + shift.y }, { ...still(), turn: 0.5 }) }
    case 'nest': return lying(rest, still(), 0.8)
    case 'path':
      if (thing === 'snail' && toy.perch.snail) return lying(BALL_TOP, still())
      if (thing === 'feather' && toy.perch.feather) return lying(SPINE, { ...still(), turn: -0.9 })
      // The worm with its head tucked in lies turned the way its head went.
      if (thing === 'worm') { const tuck = tuckAt(toy, rest); if (tuck) return lying(rest, { ...still(), turn: TUCKS[tuck].turn }) }
      return lying(rest, still())
    case 'table': {
      const couple = coupleOf(toy, thing)
      if (!couple) return lying(rest, still())
      const pair = PAIRED[couple.pair]
      return lying(rest, pair.pose(pair.length, couple.side)[couple.first === thing ? 0 : 1])
    }
  }
}

/** The thing a finger at `at` lands on in the frame that is on screen: the nearest that can be picked up there. */
export function thingUnder(toy: Toy, at: P, reach: number): ThingId | null {
  let found: ThingId | null = null, nearest = reach
  for (const thing of THINGS) {
    // What is in the nest is the jay's until the nest is tipped; what is under a cover answers as what was found.
    if (toy.things[thing].at === 'nest' || toy.things[thing].at === 'home') continue
    const where = drawn(toy, thing)
    if (!where || where.room !== toy.room || where.pose.show <= 0 || where.inHand) continue
    const far = Math.hypot(where.at.x - at.x, where.at.y - at.y)
    if (far <= nearest) { nearest = far; found = thing }
  }
  return found
}
