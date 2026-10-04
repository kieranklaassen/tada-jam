import { MANES } from './kits'
import { LOOKS } from './looks'
import { BENCH, CAPE, CHAIR, COLLAR_Y, DOOR, FLOOR_Y, HEAD, LOCK_X, BESIDE_X, PEG, STEP, STOOL, STRIP_W } from './layout'
import type { CustomerId } from './tastes'
import type { ClippingPlace, FaceSpot, Salon, Who } from './world'

// Where every touchable thing in the salon is, in scene units, at rest: the
// two in the salon, the lock and its model, the ribbon, the nine tufts of the
// customer's mane, the clippings, and the few things that are touched to move
// the game on (the door, the empty seat, the cape's knot, the chair). Pure
// geometry, shared by the rules of touch and by the view that draws, so the
// two can never disagree about where a thing is.

export type Point = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }

/** A finger is no point: a touch this near a thing is on it. */
export const SLOP = 16

// --- Who stands where --------------------------------------------------------

/** One of the two in the salon: where the middle of its head is, and how big it is drawn (1 is the customer in the chair). */
export type Actor = { x: number; y: number; s: number }
/** Where a strip hangs from, and how many scene units one step of its length is. */
export type Hang = { x: number; y: number; unit: number }

export const FRIEND_SIZE = 0.65
/** The friend on the stool, cheek to cheek with the customer, and on the bench across the room. */
const BESIDE: Actor = { x: 708, y: 302, s: FRIEND_SIZE }
// A little towards the room from the middle of the bench, so the biggest head of hair is all in the scene.
const ACROSS: Actor = { x: BENCH.x + BENCH.w / 2 + 16, y: 432, s: FRIEND_SIZE }
/** Where the friend's lock hangs when it sits across the room: at its cheek, on the side of the room. */
const ACROSS_MODEL: Hang = { x: ACROSS.x + 63, y: 470, unit: STEP }

export type Button = 'door' | 'stool' | 'bench' | 'knot' | 'chair'

export type Places = {
  customer: Actor | null
  friend: Actor | null
  lock: Hang | null
  model: Hang | null
  /** The seat the friend is not on, which a touch sends it to. Only while a customer is under the cape. */
  seatFree: 'stool' | 'bench' | null
  /** The cape's knot, while the cape is on. */
  knot: Point | null
  /** The chair answers a touch: the cape is off and the customer can go back under it. */
  chair: boolean
}

/**
 * Where everything is for a salon. With the cape off the pair stand cheek to
 * cheek whatever seat the friend had, and the two locks hang side by side from
 * one line, as they do when the friend is beside the chair.
 */
export function placesOf(salon: Salon): Places {
  if (salon.chair === null || salon.friend === null) return { customer: null, friend: null, lock: null, model: null, seatFree: null, knot: null, chair: false }
  const caped = salon.cape === 'on'
  const beside = !caped || salon.seat === 'beside'
  return {
    customer: { x: HEAD.x, y: HEAD.y, s: 1 },
    friend: beside ? BESIDE : ACROSS,
    lock: { x: LOCK_X, y: COLLAR_Y, unit: STEP },
    model: beside ? { x: BESIDE_X, y: COLLAR_Y, unit: STEP } : ACROSS_MODEL,
    seatFree: !caped ? null : salon.seat === 'beside' ? 'bench' : 'stool',
    knot: caped ? { x: CHAIR.x - CAPE.collarHalf + 8, y: COLLAR_Y + 4 } : null,
    chair: !caped,
  }
}

export const BUTTONS: Record<Exclude<Button, 'knot'>, Box> = {
  door: { x: DOOR.x, y: DOOR.y, w: DOOR.w, h: DOOR.h },
  stool: { x: STOOL.x - 56, y: STOOL.seatY - 60, w: 112, h: FLOOR_Y - STOOL.seatY + 70 },
  bench: { x: BENCH.x, y: BENCH.backY - 10, w: BENCH.w, h: FLOOR_Y - BENCH.backY + 14 },
  chair: { x: CHAIR.x - 150, y: 300, w: 300, h: FLOOR_Y - 300 },
}
/** How near the knot a touch is on it. */
export const KNOT_REACH = 44

const inBox = (p: Point, box: Box, grow = 0): boolean => p.x >= box.x - grow && p.x <= box.x + box.w + grow && p.y >= box.y - grow && p.y <= box.y + box.h + grow

// --- The mane ---------------------------------------------------------------

export type TuftPose = {
  /** Where it leaves the head, relative to the head's centre, in head units. */
  base: Point
  /** The way it points, in radians from straight up, clockwise. */
  angle: number
  /** How long it is drawn. */
  reach: number
  width: number
  curl: number
}

/** A long tuft is top-heavy and flops over, to the side it already leans or hooks to. In radians. */
export function droop(fan: number, curl: number, steps: number, most = 0.55): number {
  const heavy = Math.max(0, (steps - 55) / 45)
  const side = Math.abs(Math.sin(fan)) > 0.2 ? Math.sign(Math.sin(fan)) : Math.sign(curl || 1)
  return side * most * heavy * heavy
}

/** A tuft of this customer's mane at rest, relative to the head's centre: from the left cheek over the top to the right cheek. */
export function tuftPose(who: CustomerId, index: number, steps: number, count = 9): TuftPose {
  const kit = MANES[who], own = kit.own[index % kit.own.length]
  const t = count <= 1 ? 0.5 : index / (count - 1)
  const fan = (kit.from + t * (kit.to - kit.from)) * (Math.PI / 180)
  return {
    base: { x: Math.sin(fan) * HEAD.rx * 0.82, y: -Math.cos(fan) * HEAD.ry * 0.82 },
    angle: fan + own.lean * (Math.PI / 180) + droop(fan, own.curl, steps, kit.droop),
    reach: kit.base + steps * kit.step,
    width: own.width + steps * kit.swell,
    curl: own.curl,
  }
}

/** The free end of a tuft at rest, relative to the head's centre. */
export function tuftTip(pose: TuftPose): Point {
  return { x: pose.base.x + Math.sin(pose.angle) * pose.reach, y: pose.base.y - Math.cos(pose.angle) * pose.reach }
}

/** Where a bow sits, relative to the customer's head: the free end of the tuft it is tied on. Nothing when the ribbon is not a bow. */
export function bowOn(salon: Salon): Point | null {
  const ribbon = salon.ribbon
  if (!ribbon || ribbon.at !== 'mane' || salon.chair === null) return null
  return tuftTip(tuftPose(salon.chair, ribbon.tuft, salon.mane[ribbon.tuft] ?? 0, salon.mane.length))
}

/** A point given in an actor's head units, in the scene. */
export function onHead(actor: Actor, local: Point): Point {
  return { x: actor.x + local.x * actor.s, y: actor.y + local.y * actor.s }
}
const toHead = (actor: Actor, p: Point): Point => ({ x: (p.x - actor.x) / actor.s, y: (p.y - actor.y) / actor.s })

// --- The floor --------------------------------------------------------------

/** A place along the floor (0 to 100) as a scene x, and back. */
export function floorX(place: number): number {
  return 150 + place * 8.8
}
export function placeOnFloor(sceneX: number): number {
  return Math.max(0, Math.min(100, Math.round((sceneX - 150) / 8.8)))
}
/** Pieces lie in three loose rows, by where they are, so neighbours do not hide each other. */
export function floorY(place: number): number {
  return FLOOR_Y + 72 + ((Math.round(place) % 3) - 1) * 16
}

// --- The face ---------------------------------------------------------------

/** Where a worn piece sits, relative to the head's centre, in head units. */
export const SPOT_Y: Record<FaceSpot, number> = { brow: -44, lip: 42, chin: 80 }

export type FacePart = 'nose' | 'ear' | 'chin' | 'cheek'

/** Whether a point in head units is on the head, grown or shrunk by `grow`. */
function inHead(local: Point, grow = 1): boolean {
  const dx = local.x / (HEAD.rx * grow), dy = local.y / (HEAD.ry * grow)
  return dx * dx + dy * dy <= 1
}

/** Whether a point in head units is on one of this customer's ears, wherever its kind has them: on top, at the sides, or standing up above the head. */
export function onEar(who: CustomerId, local: Point): boolean {
  const ears = LOOKS[who].ears, cy = ears.y - (ears.kind === 'long' ? ears.ry * 0.8 : 0)
  return [-1, 1].some((side) => ((local.x - side * ears.x) / (ears.rx + 6)) ** 2 + ((local.y - cy) / (ears.ry + 6)) ** 2 <= 1)
}

/** Which part of the face a point in head units is on. With `who`, an ear is where that customer's ears are drawn. */
export function facePart(local: Point, who?: CustomerId): FacePart {
  if (Math.hypot(local.x, local.y - 24) <= 34) return 'nose'
  if (who ? onEar(who, local) : local.y < -52 && Math.abs(local.x) > 40) return 'ear'
  if (local.y > 50) return 'chin'
  return 'cheek'
}

/** Where a clipping let go at a point comes to lie: on the face under it, at the nearest spot, or on the floor below. */
export function dropPlace(salon: Salon, p: Point): ClippingPlace {
  const places = placesOf(salon)
  for (const who of ['chair', 'friend'] as const) {
    const actor = who === 'chair' ? places.customer : places.friend
    if (!actor) continue
    const local = toHead(actor, p)
    if (!inHead(local)) continue
    const spots = Object.keys(SPOT_Y) as FaceSpot[]
    return { on: 'face', who, spot: spots.reduce((best, s) => (Math.abs(SPOT_Y[s] - local.y) < Math.abs(SPOT_Y[best] - local.y) ? s : best), spots[0]) }
  }
  return { on: 'floor', x: placeOnFloor(p.x) }
}

/** The middle of a clipping and half its length, in scene units. Nothing, for a piece worn by somebody who is not there. */
export function clippingBox(salon: Salon, piece: { len: number } & ClippingPlace): { x: number; y: number; half: number } | null {
  if (piece.on === 'floor') return { x: floorX(piece.x), y: floorY(piece.x), half: (piece.len * STEP) / 2 }
  const places = placesOf(salon), actor = piece.who === 'chair' ? places.customer : places.friend
  if (!actor) return null
  const at = onHead(actor, { x: 0, y: SPOT_Y[piece.spot] })
  return { x: at.x, y: at.y, half: (piece.len * STEP * actor.s) / 2 }
}

// --- The ribbon -------------------------------------------------------------

export type RibbonShape =
  /** Hanging from a point: on its peg, or beside a lock with its top end level. */
  | { kind: 'hang'; root: Point; unit: number }
  /** Lying on the floor, from its clip to its free end. */
  | { kind: 'lie'; from: Point; unit: number }
  /** Tied as a bow at the end of a tuft, or round a face as a blindfold: a thing to pick up, with no length to see. */
  | { kind: 'worn'; at: Point; half: number; as: 'bow' | 'blindfold' }

/** Where the ribbon is and what shape it has there, or nothing while it is not in the salon. */
export function ribbonShape(salon: Salon): RibbonShape | null {
  const ribbon = salon.ribbon
  if (!ribbon) return null
  const places = placesOf(salon), peg: RibbonShape = { kind: 'hang', root: PEG, unit: STEP }
  switch (ribbon.at) {
    case 'peg': return peg
    case 'lock': return places.lock ? { kind: 'hang', root: { x: places.lock.x - STRIP_W - 10, y: places.lock.y }, unit: places.lock.unit } : peg
    case 'model': return places.model ? { kind: 'hang', root: { x: places.model.x + STRIP_W + 10, y: places.model.y }, unit: places.model.unit } : peg
    case 'floor': return { kind: 'lie', from: { x: floorX(ribbon.x) - 40, y: floorY(ribbon.x) + STRIP_W + 6 }, unit: STEP }
    case 'mane': {
      if (!places.customer || salon.chair === null) return peg
      const steps = salon.mane[ribbon.tuft] ?? 0
      return { kind: 'worn', at: onHead(places.customer, tuftTip(tuftPose(salon.chair, ribbon.tuft, steps, salon.mane.length))), half: 34, as: 'bow' }
    }
    case 'face': {
      const actor = ribbon.who === 'chair' ? places.customer : places.friend
      return actor ? { kind: 'worn', at: onHead(actor, { x: 0, y: -14 }), half: HEAD.rx * actor.s, as: 'blindfold' } : peg
    }
  }
}

// --- What is under a finger -------------------------------------------------

export type Touched =
  /** `along` is how far from its root the strip was touched, in steps. */
  | { object: 'lock'; along: number }
  | { object: 'model'; along: number }
  | { object: 'ribbon'; along: number }
  /** The ribbon's clip, or the whole of it while it is worn: the part it is carried by. */
  | { object: 'ribbonClip' }
  | { object: 'tuft'; index: number; along: number }
  | { object: 'face'; who: Who; part: FacePart }
  | { object: 'clipping'; index: number }
  | { object: 'button'; button: Button }

/** How far along a segment the nearest point to `p` is (0 to 1), and how far away it is. */
function nearestOn(a: Point, b: Point, p: Point): { t: number; distance: number } {
  const dx = b.x - a.x, dy = b.y - a.y, length = dx * dx + dy * dy
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length))
  return { t, distance: Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t)) }
}

/** Whether a point is on a strip that hangs from a root, and how far down it in steps. A stub is still as big a target as a fingertip. */
function onStrip(p: Point, hang: Hang, steps: number): number | null {
  const tip = hang.y + steps * hang.unit
  if (Math.abs(p.x - hang.x) > STRIP_W / 2 + SLOP || p.y < hang.y - 4 || p.y > Math.max(tip, hang.y + 34) + SLOP) return null
  return Math.max(0, Math.min(steps, (p.y - hang.y) / hang.unit))
}

/**
 * The thing under a finger, or nothing. What lies on top is found first: the
 * ribbon's clip, a clipping, the three strips, the knot, the customer's face
 * and the mane behind it, the friend, and last the things that are only
 * touched to move the game on.
 */
export function whatIsAt(salon: Salon, p: Point): Touched | null {
  const places = placesOf(salon), shape = ribbonShape(salon)
  if (shape) {
    const clip = shape.kind === 'hang' ? shape.root : shape.kind === 'lie' ? shape.from : shape.at
    const reach = shape.kind === 'worn' ? { x: shape.half + SLOP, y: 26 + SLOP } : { x: 24 + SLOP, y: 26 + SLOP }
    if (Math.abs(p.x - clip.x) <= reach.x && Math.abs(p.y - (shape.kind === 'hang' ? clip.y - 12 : clip.y)) <= reach.y) return { object: 'ribbonClip' }
  }
  for (let index = salon.clippings.length - 1; index >= 0; index--) {
    const box = clippingBox(salon, salon.clippings[index])
    if (box && Math.abs(p.x - box.x) <= box.half + SLOP && Math.abs(p.y - box.y) <= STRIP_W / 2 + SLOP) return { object: 'clipping', index }
  }
  if (shape && salon.ribbon) {
    if (shape.kind === 'hang') {
      const along = onStrip(p, { ...shape.root, unit: shape.unit }, salon.ribbon.len)
      if (along !== null) return { object: 'ribbon', along }
    } else if (shape.kind === 'lie') {
      const length = salon.ribbon.len * shape.unit
      if (p.x >= shape.from.x - SLOP && p.x <= shape.from.x + length + SLOP && Math.abs(p.y - shape.from.y) <= STRIP_W / 2 + SLOP) return { object: 'ribbon', along: Math.max(0, Math.min(salon.ribbon.len, (p.x - shape.from.x) / shape.unit)) }
    }
  }
  if (places.lock) {
    const along = onStrip(p, places.lock, salon.lock)
    if (along !== null) return { object: 'lock', along }
  }
  if (places.model) {
    const along = onStrip(p, places.model, salon.model)
    if (along !== null) return { object: 'model', along }
  }
  if (places.knot && Math.hypot(p.x - places.knot.x, p.y - places.knot.y) <= KNOT_REACH) return { object: 'button', button: 'knot' }
  if (places.customer && salon.chair !== null) {
    const local = toHead(places.customer, p)
    if (inHead(local) || onEar(salon.chair, local)) return { object: 'face', who: 'chair', part: facePart(local, salon.chair) }
  }
  // The friend stands in front of the customer's mane where the two meet.
  const friendAt = places.friend ? toHead(places.friend, p) : null
  if (friendAt && salon.friend && (inHead(friendAt) || onEar(salon.friend, friendAt))) return { object: 'face', who: 'friend', part: facePart(friendAt, salon.friend) }
  if (places.customer && salon.chair !== null) {
    let best: Touched | null = null, nearest = Infinity
    for (let index = 0; index < salon.mane.length; index++) {
      const pose = tuftPose(salon.chair, index, salon.mane[index], salon.mane.length)
      const hit = nearestOn(onHead(places.customer, pose.base), onHead(places.customer, tuftTip(pose)), p)
      // A tuft is widest near its root and comes to a point.
      const half = (pose.width / 2) * (1 - hit.t * 0.6) + SLOP
      if (hit.distance <= half && hit.distance < nearest) {
        nearest = hit.distance
        best = { object: 'tuft', index, along: hit.t * salon.mane[index] }
      }
    }
    if (best) return best
  }
  // The friend's hair is not the child's to cut: its whole head, hair and all, is its face.
  if (friendAt && inHead(friendAt, 1.3)) return { object: 'face', who: 'friend', part: facePart(friendAt, salon.friend ?? undefined) }
  if (places.seatFree && inBox(p, BUTTONS[places.seatFree])) return { object: 'button', button: places.seatFree }
  if (places.chair && inBox(p, BUTTONS.chair)) return { object: 'button', button: 'chair' }
  if (inBox(p, BUTTONS.door)) return { object: 'button', button: 'door' }
  return null
}

// --- What a stroke of the scissors crosses ----------------------------------

export type Crossed =
  /** `at` is how far from the root the strip was crossed, in steps. */
  | { object: 'lock' | 'model' | 'ribbon'; at: number; where: Point }
  | { object: 'tuft'; index: number; at: number; where: Point }
  | { object: 'clipping'; index: number; where: Point }
  | { object: 'face'; who: Who; where: Point }

/** Where two segments cross: how far along each (0 to 1), or nothing. */
function crossing(a: Point, b: Point, c: Point, d: Point): { u: number; v: number } | null {
  const rx = b.x - a.x, ry = b.y - a.y, sx = d.x - c.x, sy = d.y - c.y
  const denominator = rx * sy - ry * sx
  if (denominator === 0) return null
  const u = ((c.x - a.x) * sy - (c.y - a.y) * sx) / denominator, v = ((c.x - a.x) * ry - (c.y - a.y) * rx) / denominator
  return u >= 0 && u <= 1 && v >= 0 && v <= 1 ? { u, v } : null
}

/**
 * Everything the scissors cross on their way from `a` to `b`, in the order
 * they meet it. A strip is cut where its middle line is crossed, so blades
 * that only brush its edge cut nothing. A face is crossed, and never cut,
 * when the blades come in over the middle of it.
 */
export function crossedBy(salon: Salon, a: Point, b: Point): Crossed[] {
  const found: { u: number; hit: Crossed }[] = []
  const at = (u: number): Point => ({ x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u })
  const places = placesOf(salon), shape = ribbonShape(salon)
  salon.clippings.forEach((piece, index) => {
    if (piece.on !== 'floor') return
    const box = clippingBox(salon, piece)
    const hit = box && crossing(a, b, { x: box.x - box.half, y: box.y }, { x: box.x + box.half, y: box.y })
    if (hit) found.push({ u: hit.u, hit: { object: 'clipping', index, where: at(hit.u) } })
  })
  const strip = (object: 'lock' | 'model' | 'ribbon', from: Point, to: Point, steps: number): void => {
    const hit = crossing(a, b, from, to)
    if (hit) found.push({ u: hit.u, hit: { object, at: hit.v * steps, where: at(hit.u) } })
  }
  if (places.lock) strip('lock', places.lock, { x: places.lock.x, y: places.lock.y + salon.lock * places.lock.unit }, salon.lock)
  if (places.model) strip('model', places.model, { x: places.model.x, y: places.model.y + salon.model * places.model.unit }, salon.model)
  if (shape && salon.ribbon) {
    if (shape.kind === 'hang') strip('ribbon', shape.root, { x: shape.root.x, y: shape.root.y + salon.ribbon.len * shape.unit }, salon.ribbon.len)
    if (shape.kind === 'lie') strip('ribbon', shape.from, { x: shape.from.x + salon.ribbon.len * shape.unit, y: shape.from.y }, salon.ribbon.len)
  }
  if (places.customer && salon.chair !== null) {
    const customer = places.customer, who = salon.chair
    salon.mane.forEach((steps, index) => {
      const pose = tuftPose(who, index, steps, salon.mane.length)
      const cut = crossing(a, b, onHead(customer, pose.base), onHead(customer, tuftTip(pose)))
      // Only the part of a tuft that shows outside the face can be cut. It is cut where it was crossed: a tuft has a
      // root that is no part of its length, so how far along the blades were is turned back into steps.
      if (cut && !inHead(toHead(customer, at(cut.u)))) found.push({ u: cut.u, hit: { object: 'tuft', index, at: Math.max(0, (cut.v * pose.reach - MANES[who].base) / MANES[who].step), where: at(cut.u) } })
    })
  }
  for (const who of ['chair', 'friend'] as const) {
    const actor = who === 'chair' ? places.customer : places.friend
    if (actor && !inHead(toHead(actor, a), 0.6) && inHead(toHead(actor, b), 0.6)) found.push({ u: 1, hit: { object: 'face', who, where: b } })
  }
  return found.sort((x, y) => x.u - y.u).map((entry) => entry.hit)
}

/** Whether a point is over the middle of either face, for the scissors to know when they have left it. */
export function overAFace(salon: Salon, p: Point): boolean {
  const places = placesOf(salon)
  return [places.customer, places.friend].some((actor) => actor !== null && inHead(toHead(actor, p)))
}

/** The root a strip of this kind is pulled away from, and its length, for the finger that holds it. */
export function stripOf(salon: Salon, what: 'lock' | 'model' | 'ribbon'): { root: Point; unit: number; length: number } | null {
  const places = placesOf(salon)
  if (what === 'lock') return places.lock ? { root: places.lock, unit: places.lock.unit, length: salon.lock } : null
  if (what === 'model') return places.model ? { root: places.model, unit: places.model.unit, length: salon.model } : null
  const shape = ribbonShape(salon)
  if (!shape || !salon.ribbon || shape.kind === 'worn') return null
  return { root: shape.kind === 'hang' ? shape.root : shape.from, unit: shape.unit, length: salon.ribbon.len }
}

/** The root of a tuft of the customer's mane in the scene, for the finger that holds it. */
export function tuftRoot(salon: Salon, index: number): { root: Point; unit: number; length: number } | null {
  const places = placesOf(salon)
  if (!places.customer || salon.chair === null) return null
  const steps = salon.mane[index] ?? 0, pose = tuftPose(salon.chair, index, steps, salon.mane.length)
  return { root: onHead(places.customer, pose.base), unit: MANES[salon.chair].step * places.customer.s, length: steps }
}
