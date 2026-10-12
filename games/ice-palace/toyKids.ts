import { widthOf } from './blocks'
import { AT, AT_NIGHT, KID_SCALE, lampMitten, lampPose, reactionOf, type LampMood } from './cast'
import { BLOCK_H, BUILD, GROUND_Y, type Bar, type Point } from './ground'
import { lampsOf, rowOf } from './night'
import { FEET, along, clearance, lengthOf, wayTo, type InTheWay } from './route'
import { STEP, type Piece, type Toy } from './toy'
import { openHoles, react, wall } from './toyPieces'

// The two frost children as they are played: how they skate out at dusk and
// home at morning, and what the lamp child does at night about its two
// tastes. On their feet they go round open water and round everything that
// lies (route.ts). None of it is saved: where each stands follows from what
// is in the clearing.

/** A frost child's feet, from the point it is drawn about: the lamp child's hang below its hip, the peeper's are under it when it is up. */
export const LAMP_FEET = { x: 0, y: 72 } as const
export const PEEPER_FEET = { x: -24, y: 34 } as const
/** Its nose, from its hip: where the lamp child's hip is when its nose is flat on a block. */
export const NOSE_UP = 104 * KID_SCALE
/** Standing behind the wall on the bank, its hip is here; lower than this it has knelt down behind the bank's edge. */
const BEHIND_HIP = GROUND_Y - LAMP_FEET.y
/** Where it goes up onto the bank to get behind the wall: the bank's left end, clear of the stretch a palace is built on. */
const ROUND_END = { x: BUILD.x0 - 96, y: BEHIND_HIP } as const
/** Where it stands on the front snow to rap on a block: its hip, with its feet at the foot of the bank's face. */
const RAP_HIP = GROUND_Y + 4
/** How far its mitten reaches from its shoulder when it raps, in stage units, and how fast it walks. */
const RAP_REACH = 50 * KID_SCALE
const WALK = 380
/** It stands no higher than this to press its nose on a block: the row its nose reaches standing on the bank. */
export const NOSE_ROWS = 4

/** How far out over the pond each skates before it turns for where it is going: the place its feet make for. */
const LAMP_FAR = { x: 700, y: 610 } as const
const PEEPER_FAR = { x: 730, y: 700 } as const

/** What is in a skater's way: open water, and everything lying on the ice or the front snow that is at rest. */
export function inTheWay(toy: Toy): InTheWay {
  const bars: Bar[] = toy.pieces.filter((p) => p.mode !== 'held' && p.mode !== 'sink' && p.mode !== 'melt' && (p.rest.place === 'lying' || p.rest.place === 'frozen' || p.rest.place === 'afloat')).map((p) => ({ x: p.rest.x, y: p.rest.y, len: widthOf(p) }))
  return { holes: openHoles(toy), bars }
}

export const lampFeet = (at: Point): Point => ({ x: at.x + LAMP_FEET.x, y: at.y + LAMP_FEET.y })
export const peeperFeet = (at: Point): Point => ({ x: at.x + PEEPER_FEET.x, y: at.y + PEEPER_FEET.y })

/**
 * The skate of a scene, worked out when the scene starts: each child's way from where it is, out over the pond
 * and on to where it will stand. At dusk the lamp child comes in from the pond to the front of the wall and goes
 * along it, stopping under each lamp's place to hang it: `hang` is how far along its way it is at each stop.
 * `behindFor` is the share of the lamp child's way that is still behind the wall, when the morning finds it there.
 */
export type Skate = { lamp: Point[]; peeper: Point[]; behindFor: number; hang: number[] }

/** A way for feet from one place out towards `far` and on to another, as places of the point the child is drawn about. */
function tour(from: Point, far: Point, to: Point, feet: Point, way: InTheWay): Point[] {
  const off = (p: Point): Point => ({ x: p.x + feet.x, y: p.y + feet.y }), back = (p: Point): Point => ({ x: p.x - feet.x, y: p.y - feet.y })
  const out = wayTo(off(from), far, way)
  const home = wayTo(out[out.length - 1], off(to), way)
  return [...out, ...home.slice(1)].map(back)
}

/** Where the lamp child stands to hang a lamp: on the front snow at the foot of the bank, its shoulder under the lamp's place. */
export const hangFrom = (lamp: { x: number }): Point => ({ x: Math.max(60, Math.min(1040, Math.round(lamp.x - 26 * KID_SCALE))), y: RAP_HIP })

/** The ways the two skate: `out` at dusk, from where they sit by day to where they stand at night; home at morning, from wherever the night has left them. */
export function skateOf(toy: Toy, out: boolean): Skate {
  const way = inTheWay(toy), kid = toy.kids.lamp
  if (out) {
    // Out over the pond, then to the foot of the bank under each lamp's place in turn, then to where it stands by night.
    const feet = wayTo(lampFeet(AT.lamp), LAMP_FAR, way), reached: number[] = []
    for (const lamp of lampsOf(wall(toy))) {
      feet.push(...wayTo(feet[feet.length - 1], lampFeet(hangFrom(lamp)), way).slice(1))
      reached.push(lengthOf(feet))
    }
    feet.push(...wayTo(feet[feet.length - 1], lampFeet(AT_NIGHT.lamp), way).slice(1))
    const whole = Math.max(1, lengthOf(feet))
    return { lamp: feet.map((p) => ({ x: p.x - LAMP_FEET.x, y: p.y - LAMP_FEET.y })), peeper: tour(AT.peeper, PEEPER_FAR, AT_NIGHT.peeper, PEEPER_FEET, way), behindFor: 0, hang: reached.map((far) => far / whole) }
  }
  // From behind the wall it first comes round the bank's left end.
  const lead: Point[] = kid.behind ? [{ x: kid.x, y: kid.y }, { x: kid.x, y: BEHIND_HIP }, { ...ROUND_END }] : []
  const lamp = [...lead, ...tour(kid.behind ? ROUND_END : kid, LAMP_FAR, AT.lamp, LAMP_FEET, way).slice(kid.behind ? 1 : 0)]
  return { lamp, peeper: tour(toy.kids.peeper, PEEPER_FAR, AT.peeper, PEEPER_FEET, way), behindFor: lengthOf(lead) / Math.max(1, lengthOf(lamp)), hang: [] }
}

/** Where the two are `p` of the way through their skate. At its end each is exactly where a load would have it. */
export function skateAt(toy: Toy, skate: Skate, p: number, out: boolean): void {
  const up = out ? Math.min(1, p * 6) : Math.min(1, (1 - p) * 6)
  const lamp = p >= 1 ? (out ? AT_NIGHT.lamp : AT.lamp) : along(skate.lamp, p), peeper = p >= 1 ? (out ? AT_NIGHT.peeper : AT.peeper) : along(skate.peeper, p)
  toy.kids.lamp = { x: lamp.x, y: lamp.y, up, behind: p < skate.behindFor }
  toy.kids.peeper = { x: peeper.x, y: peeper.y, up }
  toy.lampWalk = []
  toy.lampErrand = ''
}

// --- The lamp child at night ---------------------------------------------------

/** The snow that shuts a lamp in, when it has one. */
function shutPiece(toy: Toy): Piece | null {
  return toy.taste.shut ? (toy.pieces.find((p) => p.id === toy.taste.shut?.id) ?? null) : null
}
/** The lit clear block it presses its nose on: the lowest one, when it stands low enough for its nose. */
function nosePiece(toy: Toy): Piece | null {
  const clear = toy.taste.clear
  if (!clear || toy.taste.shut) return null
  const piece = toy.pieces.find((p) => p.id === clear.id) ?? null
  return piece && rowOf(piece.rest) <= NOSE_ROWS ? piece : null
}

/** What the lamp child is about, which sets its face: by night a lamp shut in comes first, then lit clear ice; by day a hollow. */
export function lampMood(toy: Toy): LampMood {
  if (toy.night && !toy.sceneRunning) {
    if (toy.taste.shut) return 'frown'
    if (nosePiece(toy) && toy.kids.lamp.behind && toy.lampWalk.length === 0) return 'nose'
  }
  return toy.taste.hollow ? 'point' : 'seek'
}

/** Where it stands to rap on a block: on the front snow beside it, feet clear of water and of everything that lies; and how high it must jump for its mitten to land on the block. Null when no such place is free. */
export function rapPlace(toy: Toy, block: Piece): { at: Point; on: Point; jump: number } | null {
  const way = inTheWay(toy), w = widthOf(block), k = KID_SCALE
  for (let off = 0; off <= 240; off += 20) {
    for (const side of [-1, 1] as const) {
      // In front of the wall with its shoulder a little way off the block's end: off its left end first.
      const x = Math.round((side < 0 ? block.rest.x - w / 2 - 8 - off : block.rest.x + w / 2 + 8 + off) - 26 * k)
      if (x < 60 || x > 1040) continue
      const at = { x, y: RAP_HIP }
      if (clearance(lampFeet(at), way) < FEET) continue
      const shoulder = { x: x + 26 * k, y: RAP_HIP - 60 * k }
      const top = block.rest.y - BLOCK_H / 2, bottom = block.rest.y + BLOCK_H / 2
      const nearX = Math.max(block.rest.x - w / 2, Math.min(block.rest.x + w / 2, shoulder.x)), flat = Math.abs(nearX - shoulder.x)
      if (flat > RAP_REACH - 6) continue
      // Standing, its mitten reaches as high as its arm is long; any higher, it jumps the rest and raps the block's underside edge.
      const up = Math.sqrt(RAP_REACH * RAP_REACH - flat * flat)
      if (bottom < shoulder.y - up) return { at, on: { x: nearX, y: bottom }, jump: shoulder.y - up - bottom }
      return { at, on: { x: nearX, y: Math.max(top, Math.min(bottom, shoulder.y)) }, jump: 0 }
    }
  }
  return null
}

type Step = { x: number; y: number; behind: boolean }

/** Its way from where it is to a place: round the bank's left end when it changes sides of the wall, and on the front snow round whatever lies there. */
function walkTo(toy: Toy, to: Step): Step[] {
  const kid = toy.kids.lamp, steps: Step[] = []
  let from: Point = { x: kid.x, y: kid.y }
  if (kid.behind) {
    // Up on its feet behind the wall, and along it.
    if (!to.behind || to.x !== kid.x) steps.push({ x: kid.x, y: BEHIND_HIP, behind: true })
    if (!to.behind) {
      steps.push({ ...ROUND_END, behind: true })
      from = ROUND_END
    }
  }
  if (!to.behind) {
    const feet = wayTo(lampFeet(from), lampFeet(to), inTheWay(toy))
    for (const p of feet.slice(1)) steps.push({ x: p.x - LAMP_FEET.x, y: p.y - LAMP_FEET.y, behind: false })
    const last = steps[steps.length - 1]
    if (!last || last.x !== to.x || last.y !== to.y) steps.push({ ...to })
    return steps
  }
  if (!kid.behind) steps.push({ ...ROUND_END, behind: false })
  steps.push({ x: to.x, y: BEHIND_HIP, behind: true }, { ...to })
  return steps
}

/** What it is to do now, as a short name: the walk is planned again when this changes. */
function errand(toy: Toy): { key: string; to: Step; rap: ReturnType<typeof rapPlace> } {
  const home: Step = { ...AT_NIGHT.lamp, behind: false }
  const shut = shutPiece(toy)
  if (shut) {
    const rap = toy.knocked !== 0 ? null : rapPlace(toy, shut)
    if (rap) return { key: `rap ${shut.id} ${rap.at.x}`, to: { ...rap.at, behind: false }, rap }
    return { key: 'home', to: home, rap: null }
  }
  const nose = nosePiece(toy)
  if (nose) return { key: `nose ${nose.id} ${nose.rest.x} ${nose.rest.y}`, to: { x: nose.rest.x, y: nose.rest.y + NOSE_UP, behind: true }, rap: null }
  return { key: 'home', to: home, rap: null }
}

/** How far off the ground it is in the jump of a rap: up to the block and down again over the knock. */
export function lampLift(toy: Toy): number {
  const actor = toy.cast.lamp
  if (actor.what !== 'knock' || !toy.rap) return 0
  return Math.sin(Math.min(1, actor.age / reactionOf('lamp', 'knock').lasts) * Math.PI) * toy.rap.jump
}
/** Where its mitten is now, as the view draws it. */
export function mittenNow(toy: Toy): Point {
  const mood = lampMood(toy), pose = lampPose(toy.time, toy.cast.lamp, mood)
  return lampMitten(pose, toy.kids.lamp, lampAim(toy), lampLift(toy))
}
/** What its arm points at: the place on the snow block it raps on, the snow that shuts a lamp in, or a hollow. */
export function lampAim(toy: Toy): Point | null {
  if (toy.cast.lamp.what === 'knock' && toy.rap) return toy.rap.on
  const mood = lampMood(toy)
  return mood === 'frown' ? toy.taste.shut : mood === 'point' ? toy.taste.hollow : null
}

/** One step of the lamp child at night: it walks to where its taste takes it, and raps once on snow that shuts a lamp in. */
export function lampStep(toy: Toy): void {
  const kid = toy.kids.lamp
  if (!toy.night || toy.sceneRunning) return
  const actor = toy.cast.lamp
  if (actor.what === 'knock' && toy.rap) {
    // The mitten lands on the block in this step, at the top of the jump: the rap is heard now and the block rocks.
    const half = reactionOf('lamp', 'knock').lasts / 2
    if (actor.age >= half && actor.age - STEP < half) {
      const block = toy.pieces.find((p) => p.id === toy.rap?.id)
      if (block) block.wobbleV += 14
      toy.say({ name: 'rap' })
      toy.show({ type: 'puff', x: toy.rap.on.x, y: toy.rap.on.y })
      toy.knocked = toy.rap.id
    }
    return
  }
  const want = errand(toy)
  if (want.key !== toy.lampErrand) {
    toy.lampErrand = want.key
    toy.lampWalk = walkTo(toy, want.to)
    toy.rap = want.rap && toy.taste.shut ? { ...want.rap, id: toy.taste.shut.id } : null
  }
  const next = toy.lampWalk[0]
  if (!next) {
    if (toy.rap && toy.knocked === 0 && kid.x === toy.rap.at.x && kid.y === toy.rap.at.y) react(toy, 'lamp', 'knock')
    return
  }
  // Which side of the wall it is on belongs to the stretch it is walking.
  kid.behind = next.behind
  const away = Math.hypot(next.x - kid.x, next.y - kid.y), go = WALK * STEP
  if (away <= go) {
    Object.assign(kid, { x: next.x, y: next.y })
    toy.lampWalk.shift()
    return
  }
  kid.x += ((next.x - kid.x) / away) * go
  kid.y += ((next.y - kid.y) / away) * go
}

/** The lamp child is where its taste has it, at once and without a sound: how a load and a put-away find it. Snow that shuts a lamp in it has already rapped on. */
export function lampSettle(toy: Toy): void {
  toy.lampWalk = []
  toy.rap = null
  toy.knocked = toy.taste.shut?.id ?? 0
  if (!toy.night) {
    toy.lampErrand = ''
    toy.kids.lamp = { ...AT.lamp, up: 0, behind: false }
    return
  }
  const want = errand(toy)
  toy.lampErrand = want.key
  toy.kids.lamp = { x: want.to.x, y: want.to.y, up: 1, behind: want.to.behind }
}

/** How long a skate's way is, for a test to hold that it goes somewhere. */
export const skateLength = (skate: Skate): number => lengthOf(skate.lamp) + lengthOf(skate.peeper)
