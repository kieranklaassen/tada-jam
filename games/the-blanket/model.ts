import { PLACES, SEATS, SITTERS, headOf, headSpot, standAt, type PlaceId, type Spot, type Who } from './layout'
import type { Point } from './input'

// The rules of the parlour, with no clock, no chance and no drawing: what each
// sitter believes, and what it does about it.
//
// 1. Seated and uncovered, a sitter sees where the sausage goes. Under a
//    blanket, or out of its seat, it sees nothing.
// 2. Nobody sees the top of its own head.
// 3. When its blanket comes off, a sitter goes where it last saw the sausage,
//    without looking first.
// 4. Not knowing, it looks for a sausage in plain sight, and failing that it
//    copies the nearest seated, uncovered neighbour who believes something.
// 5. Who sees a place found empty stops believing in it. Who sees the sausage
//    eaten looks at the string.
//
// Time is fixed steps. What happens is told as events, which the view and the
// sound read; nothing is decided by them.

export const STEP = 1 / 60
export const BLANKETS = 4

export type Phase =
  | 'seat'
  /** Just uncovered: eyes shut, winding up. */
  | 'wind'
  | 'run'
  /** At the place, looking in it. */
  | 'hunt'
  | 'eat'
  /** There was nothing: the outrage. */
  | 'sulk'
  | 'home'
  /** Uncovered with nothing to go on: looks about and shrugs. */
  | 'lost'

export type Sitter = {
  covered: boolean
  /** The last place it saw the sausage, or null when it does not know. */
  belief: Spot | null
  phase: Phase
  /** Seconds in this phase. */
  t: number
  /** Where it is going or hunting. */
  target: Spot | null
  slot: number
  from: Point
  at: Point
}

export type Sausage = { kind: 'spot'; spot: Spot } | { kind: 'mouth'; who: Who }

/** What a blanket can lie on besides a sitter. */
export type Draped = PlaceId | 'fish'

export type Held = { kind: 'sausage'; origin: Spot } | { kind: 'blanket'; origin: 'basket' | { who: Who } | { on: Draped } }

export type Event =
  | { type: 'cover' | 'uncover' | 'wind' | 'run' | 'gulp' | 'seated' | 'lost' | 'copy' | 'squeak'; who: Who; spot?: Spot }
  | { type: 'hunt' | 'empty' | 'found' | 'miss'; who: Who; spot: Spot }
  | { type: 'gift' | 'bowled' | 'ghost'; who: Who }
  | { type: 'put'; spot: Spot; from: Spot }
  | { type: 'peek' | 'back'; spot: Spot }
  | { type: 'drape' | 'undrape'; on: Draped }
  | { type: 'pick'; what: 'sausage' | 'blanket' }
  | { type: 'flap' }
  | { type: 'bell' }
  | { type: 'down' }

export type World = {
  sitters: Record<Who, Sitter>
  sausage: Sausage
  draped: Draped[]
  held: Held | null
  events: Event[]
}

export function seated(who: Who, covered = false, belief: Spot | null = 'dish'): Sitter {
  const home = { x: SEATS[who].x, y: SEATS[who].y }
  return { covered, belief, phase: 'seat', t: 0, target: null, slot: 0, from: home, at: home }
}

/** The first visit: the sausage on the dish, and everybody looking at it. */
export function freshWorld(): World {
  return {
    sitters: { dog: seated('dog'), cat: seated('cat'), aunt: seated('aunt'), grandpa: seated('grandpa') },
    sausage: { kind: 'spot', spot: 'dish' },
    draped: [],
    held: null,
    events: [],
  }
}

export function sausageSpot(world: World): Spot | null {
  return world.sausage.kind === 'spot' ? world.sausage.spot : null
}

/** Whether a sitter sees what happens in the room. */
export function sees(world: World, who: Who): boolean {
  const s = world.sitters[who]
  return !s.covered && s.phase === 'seat'
}

/** Blankets left in the basket. */
export function inBasket(world: World): number {
  const used = SITTERS.filter((who) => world.sitters[who].covered).length + world.draped.length + (world.held?.kind === 'blanket' ? 1 : 0)
  return BLANKETS - used
}

/** The spot of a sausage that lies in plain sight of this sitter, or null. */
function plain(world: World, who: Who): Spot | null {
  const spot = sausageSpot(world)
  if (spot === null || world.held?.kind === 'sausage') return null
  if (spot === 'hook') return spot
  if (spot === 'dish') return world.draped.includes('dish') ? null : spot
  const head = headOf(spot)
  return head && head !== who ? spot : null
}

function look(world: World, who: Who): void {
  const s = world.sitters[who]
  if (s.belief === null && sees(world, who)) s.belief = plain(world, who)
}

/** Everyone who sees it learns that the sausage is there. Nobody sees its own head: such a one stops knowing. */
function show(world: World, spot: Spot): void {
  for (const who of SITTERS) {
    if (!sees(world, who)) continue
    const s = world.sitters[who]
    s.belief = headOf(spot) === who ? null : spot
  }
}

function enter(world: World, who: Who, phase: Phase): void {
  const s = world.sitters[who]
  s.phase = phase
  s.t = 0
  s.from = s.at
  if (phase === 'seat') {
    s.target = null
    s.slot = 0
    s.at = { x: SEATS[who].x, y: SEATS[who].y }
    s.from = s.at
    world.events.push({ type: 'seated', who })
    look(world, who)
  }
}

// --- What a child can do ------------------------------------------------------

/** A blanket on a sitter, wherever it is. False when there is no blanket to be had. */
export function cover(world: World, who: Who): boolean {
  const s = world.sitters[who]
  if (s.covered) return false
  if (inBasket(world) <= 0) {
    // Every blanket is out: one that lies on a thing comes over.
    const on = world.draped.pop()
    if (on === undefined) return false
    world.events.push({ type: 'undrape', on })
    allLook(world)
  }
  s.covered = true
  if (ownHead(who, s.belief)) s.belief = null
  world.events.push({ type: 'cover', who })
  // Out of its seat, it turns for home under the blanket. One that is eating finishes first.
  if (s.phase === 'wind' || s.phase === 'lost') enter(world, who, 'seat')
  else if (s.phase === 'run' || s.phase === 'hunt' || s.phase === 'sulk') enter(world, who, 'home')
  return true
}

export function uncover(world: World, who: Who): void {
  const s = world.sitters[who]
  if (!s.covered) return
  s.covered = false
  world.events.push({ type: 'uncover', who })
  if (s.phase === 'seat') dash(world, who, believer(world, who))
}

/** What a sitter goes on when its blanket comes off: its belief, else plain sight, else the nearest neighbour's. */
function believer(world: World, who: Who): Spot | null {
  const known = world.sitters[who].belief
  if (known !== null) return known
  const seen = plain(world, who)
  if (seen !== null) return seen
  let best: Who | null = null
  for (const other of SITTERS) {
    if (other === who) continue
    const s = world.sitters[other]
    const belief = s.belief
    if (s.covered || s.phase !== 'seat' || belief === null) continue
    if (best === null || Math.abs(SEATS[other].x - SEATS[who].x) < Math.abs(SEATS[best].x - SEATS[who].x)) best = other
  }
  if (best === null) return null
  world.events.push({ type: 'copy', who: best })
  return world.sitters[best].belief
}

function dash(world: World, who: Who, to: Spot | null): void {
  const s = world.sitters[who]
  s.belief = to
  if (to === null) {
    enter(world, who, 'lost')
    world.events.push({ type: 'lost', who })
    return
  }
  s.target = to
  const slots = SITTERS.filter((o) => o !== who && world.sitters[o].target === to && world.sitters[o].phase !== 'home').map((o) => world.sitters[o].slot)
  s.slot = 0
  while (slots.includes(s.slot)) s.slot++
  enter(world, who, 'wind')
  world.events.push({ type: 'wind', who, spot: to })
}

/** The bell: every blanket flies off, and all who are in their seats go, each on what it believed as it rang. */
export function ringBell(world: World): void {
  world.events.push({ type: 'bell' })
  for (const on of world.draped.splice(0)) world.events.push({ type: 'undrape', on })
  const goers: Who[] = []
  for (const who of SITTERS) {
    const s = world.sitters[who]
    if (s.covered) {
      s.covered = false
      world.events.push({ type: 'uncover', who })
    }
    if (s.phase === 'seat') goers.push(who)
  }
  // All of them before any goes, since a copied neighbour must still be seated.
  const aims = goers.map((who) => believer(world, who))
  goers.forEach((who, i) => dash(world, who, aims[i]))
}

/** Puts the sausage somewhere, seen by whoever sees. The string takes none back. False when it stays where it was. */
export function putSausage(world: World, spot: Spot): boolean {
  const from = sausageSpot(world)
  if (from === null || spot === 'hook' || spot === from) return false
  world.sausage = { kind: 'spot', spot }
  if (from === 'hook') world.events.push({ type: 'down' })
  world.events.push({ type: 'put', spot, from })
  show(world, spot)
  return true
}

/** The sausage handed to somebody: eaten when it can see it, set on its head under a blanket. False when it cannot take it. */
export function giveSausage(world: World, who: Who): boolean {
  const s = world.sitters[who]
  if (sausageSpot(world) === null || s.phase !== 'seat') return false
  if (s.covered) return putSausage(world, headSpot(who))
  world.events.push({ type: 'gift', who })
  s.target = null
  takes(world, who)
  return true
}

/** The sausage looks out of where it is, and everyone who sees learns it. */
export function peek(world: World): void {
  const spot = sausageSpot(world)
  if (spot === null) return
  world.events.push({ type: 'peek', spot })
  const wearer = headOf(spot)
  if (wearer) world.events.push({ type: 'squeak', who: wearer })
  for (const who of SITTERS) if (sees(world, who) && who !== wearer) world.sitters[who].belief = spot
}

/** A tap on the string: one comes down to the dish when there is none in the room. */
export function tapHook(world: World): boolean {
  if (sausageSpot(world) !== 'hook') return false
  return putSausage(world, 'dish')
}

export function drape(world: World, on: Draped): boolean {
  if (world.draped.includes(on) || inBasket(world) <= 0) return false
  world.draped.push(on)
  world.events.push({ type: 'drape', on })
  return true
}

function allLook(world: World): void {
  for (const who of SITTERS) look(world, who)
}

export function undrape(world: World, on: Draped): void {
  const i = world.draped.indexOf(on)
  if (i < 0) return
  world.draped.splice(i, 1)
  world.events.push({ type: 'undrape', on })
  allLook(world)
}

// --- Time -----------------------------------------------------------------------

export const PACE: Record<Who, number> = { dog: 880, cat: 660, aunt: 520, grandpa: 590 }
export const WIND = 0.6
export const HUNT = 1.2
export const SULK = 2
export const EAT = 3.2
export const LOST = 1.6

const far = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

/** Seconds a run takes; never so short that it cannot be seen. */
export function runSeconds(who: Who, from: Point, to: Point): number {
  return Math.max(0.35, far(from, to) / PACE[who])
}
export function homeSeconds(who: Who, from: Point, to: Point): number {
  return Math.max(0.6, far(from, to) / (PACE[who] * 0.62))
}

const ownHead = (who: Who, spot: Spot | null) => spot !== null && headOf(spot) === who

function destination(who: Who, s: Sitter): Point {
  return s.target === null || ownHead(who, s.target) ? { x: SEATS[who].x, y: SEATS[who].y } : standAt(s.target, s.slot)
}

function takes(world: World, who: Who): void {
  const s = world.sitters[who]
  world.sausage = { kind: 'mouth', who }
  s.belief = 'hook'
  for (const other of SITTERS) if (other !== who && sees(world, other)) world.sitters[other].belief = 'hook'
  enter(world, who, 'eat')
}

function finishHunt(world: World, who: Who): void {
  const s = world.sitters[who]
  const spot = s.target!
  const at = sausageSpot(world)
  if (spot !== 'hook' && world.draped.includes(spot as Draped)) {
    // It dived under the blanket, and it comes out wearing it.
    world.draped.splice(world.draped.indexOf(spot as Draped), 1)
    s.covered = true
    world.events.push({ type: 'ghost', who })
  }
  const owner = headOf(spot)
  if (spot !== 'hook' && at === spot && world.held?.kind !== 'sausage') {
    world.events.push({ type: 'found', who, spot })
    if (owner && owner !== who) world.events.push({ type: 'bowled', who: owner })
    takes(world, who)
    return
  }
  if (owner && owner !== who && world.sitters[owner].phase === 'seat') world.events.push({ type: 'bowled', who: owner })
  world.events.push({ type: spot === 'hook' ? 'miss' : 'empty', who, spot })
  const eaten = world.sausage.kind === 'mouth' && world.sitters[world.sausage.who].target === spot
  s.belief = eaten ? 'hook' : null
  if (spot !== 'hook') for (const other of SITTERS) {
    if (!sees(world, other) || world.sitters[other].belief !== spot) continue
    world.sitters[other].belief = null
    look(world, other)
  }
  enter(world, who, 'sulk')
}

/** One fixed step. */
export function step(world: World): void {
  for (const who of SITTERS) {
    const s = world.sitters[who]
    s.t += STEP
    switch (s.phase) {
      case 'seat':
        break
      case 'wind':
        if (s.t < WIND) break
        if (ownHead(who, s.target)) {
          enter(world, who, 'hunt')
          world.events.push({ type: 'hunt', who, spot: s.target! })
        } else {
          enter(world, who, 'run')
          world.events.push({ type: 'run', who })
        }
        break
      case 'run': {
        const to = destination(who, s)
        const k = Math.min(1, s.t / runSeconds(who, s.from, to))
        s.at = { x: s.from.x + (to.x - s.from.x) * k, y: s.from.y + (to.y - s.from.y) * k }
        if (k >= 1) {
          enter(world, who, 'hunt')
          world.events.push({ type: 'hunt', who, spot: s.target! })
        }
        break
      }
      case 'hunt':
        if (s.t >= HUNT) finishHunt(world, who)
        break
      case 'eat':
        if (s.t < EAT) break
        world.sausage = { kind: 'spot', spot: 'hook' }
        world.events.push({ type: 'gulp', who })
        enter(world, who, far(s.at, SEATS[who]) < 1 ? 'seat' : 'home')
        break
      case 'sulk':
        if (s.t >= SULK) enter(world, who, far(s.at, SEATS[who]) < 1 ? 'seat' : 'home')
        break
      case 'lost':
        if (s.t >= LOST) enter(world, who, 'seat')
        break
      case 'home': {
        const to = { x: SEATS[who].x, y: SEATS[who].y }
        const k = Math.min(1, s.t / homeSeconds(who, s.from, to))
        s.at = { x: s.from.x + (to.x - s.from.x) * k, y: s.from.y + (to.y - s.from.y) * k }
        if (k >= 1) enter(world, who, 'seat')
        break
      }
    }
  }
}

export function quiet(world: World): boolean {
  return SITTERS.every((who) => world.sitters[who].phase === 'seat')
}

/** A copy that shares nothing with the world. */
function copyOf(world: World): World {
  return structuredClone({ ...world, events: [] })
}

/** The room as it will be when nobody touches anything: what a save holds. A thing in the hand is where it came from. */
export function settled(world: World): World {
  const w = copyOf(world)
  putBack(w)
  for (let i = 0; i < 60 * 30 && !quiet(w); i++) {
    step(w)
    w.events.length = 0
  }
  w.events.length = 0
  return w
}

/** A thing taken out of the hand by no choice of the child's goes back where it came from. */
export function putBack(world: World): void {
  const held = world.held
  world.held = null
  if (held === null) return
  if (held.kind === 'sausage') {
    world.events.push({ type: 'back', spot: held.origin })
    return
  }
  if (held.origin === 'basket') world.events.push({ type: 'flap' })
  else if ('who' in held.origin) cover(world, held.origin.who)
  else if (!world.draped.includes(held.origin.on)) {
    world.draped.push(held.origin.on)
    world.events.push({ type: 'drape', on: held.origin.on })
  }
}

// --- Hands ----------------------------------------------------------------------

/** The sausage taken up. It is where it was, for everyone's belief, until it is let go somewhere. */
export function pickSausage(world: World): boolean {
  const spot = sausageSpot(world)
  if (spot === null || world.held) return false
  world.held = { kind: 'sausage', origin: spot }
  world.events.push({ type: 'pick', what: 'sausage' })
  return true
}

/** A blanket taken up, from the basket, off a sitter or off a thing. Taking it off a sitter uncovers it there and then. */
export function pickBlanket(world: World, origin: 'basket' | { who: Who } | { on: Draped }): boolean {
  if (world.held) return false
  if (origin === 'basket') {
    if (inBasket(world) <= 0) return false
  } else if ('who' in origin) {
    if (!world.sitters[origin.who].covered) return false
    uncover(world, origin.who)
  } else {
    if (!world.draped.includes(origin.on)) return false
    undrape(world, origin.on)
  }
  world.held = { kind: 'blanket', origin }
  world.events.push({ type: 'pick', what: 'blanket' })
  return true
}

export type DropOn = { who: Who } | { place: PlaceId } | 'fish' | 'elsewhere'

/** What is in the hand is let go. */
export function drop(world: World, on: DropOn): void {
  const held = world.held
  world.held = null
  if (held === null) return
  if (held.kind === 'sausage') {
    const done = on === 'fish' || on === 'elsewhere' ? false : 'who' in on ? giveSausage(world, on.who) : putSausage(world, on.place)
    if (!done) world.events.push({ type: 'back', spot: held.origin })
    return
  }
  const done = on === 'elsewhere' ? false : on === 'fish' ? drape(world, 'fish') : 'who' in on ? cover(world, on.who) : drape(world, on.place)
  if (!done) world.events.push({ type: 'flap' })
}

/** Every rule that must hold at any instant. Used by the tests on random play. */
export function faults(world: World): string[] {
  const out: string[] = []
  if (inBasket(world) < 0) out.push('more blankets than there are')
  if (new Set(world.draped).size !== world.draped.length) out.push('a thing draped twice')
  for (const on of world.draped) if (on !== 'fish' && !PLACES.includes(on)) out.push('a blanket on nothing')
  for (const who of SITTERS) if (ownHead(who, world.sitters[who].belief) && world.sitters[who].phase === 'seat') out.push(`${who} believes in its own head`)
  if (world.sausage.kind === 'mouth' && world.sitters[world.sausage.who].phase !== 'eat') out.push('a sausage in a mouth that is not eating')
  return out
}
