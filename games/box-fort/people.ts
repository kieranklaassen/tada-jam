import { BABY, BABY_SCALE, BOARD, FRONT_Z, GRAN, GRAN_STAND, type Vec } from './layout'
import { babyPose, catPose, granPose, type BabyIn, type BabyPose, type CatIn, type CatPose, type GranIn, type GranPose } from './motion'
import { highest } from './fort'
import { LOAF_FROM } from './rest'
import type { Toy } from './toy'

// The cat, the baby and the grandmother as they are drawn now: where each
// part is and how it is turned, from the stage each is shown at (toy.ts) and
// the game's one clock. The view lays these numbers on cardboard and decides
// nothing; a touch finds each of them at the same numbers.

const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
const ease = (t: number): number => { const c = clamp01(t); return c * c * (3 - 2 * c) }
const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const snap = (t: number): number => 1 - (1 - clamp01(t)) ** 4
const pulse = (age: number, length: number): number => (age <= 0 || age >= length ? 0 : Math.sin((age / length) * Math.PI))
const between = (a: Vec, b: Vec, t: number, arc = 0): Vec => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t + Math.sin(clamp01(t) * Math.PI) * arc, z: a.z + (b.z - a.z) * t })

/** A place a share `t` of the way along a path of straight legs. */
function along(path: readonly Vec[], t: number): Vec {
  const lengths = path.slice(1).map((b, i) => Math.hypot(b.x - path[i].x, b.z - path[i].z)), whole = lengths.reduce((sum, length) => sum + length, 0)
  let left = clamp01(t) * whole
  for (let i = 0; i < lengths.length; i++) {
    if (left <= lengths[i] || i === lengths.length - 1) return between(path[i], path[i + 1], lengths[i] > 0 ? Math.min(1, left / lengths[i]) : 1)
    left -= lengths[i]
  }
  return path[path.length - 1]
}

type Part = { show: boolean; x: number; y: number; z: number }

/** What everyone watches: their own business, drawn towards the finger's work while it goes on. Never the child. */
function gaze(toy: Toy, own: Vec): Vec {
  const w = toy.watching, f = toy.focus
  return { x: own.x + (f.x - own.x) * w, y: own.y + (f.y - own.y) * w, z: own.z + (f.z - own.z) * w }
}

// --- The cat ------------------------------------------------------------------

export type CatDraw = {
  body: Part & { sx: number; sy: number; rz: number }
  head: Part & { rz: number }
  /** The paw that reaches out through a hole. */
  reach: Part & { rot: number; scale: number }
  tail: number
  paw: number
  ears: number
  earTurn: number
  blink: number
  mouth: 0 | 1 | 2
  /** How wide its pupils are. */
  dilate: number
  /** Its back legs, which pedal when it is stuck in a hole. */
  legs: { show: boolean; pedal: number }
  /** A strip of tape stuck to its raised paw. */
  strip: boolean
  /** Its eyes shine in the dark, 0 to 1. */
  shine: number
  look: Vec
}

/** How high over its seat the cat jumps to clear the lid that stands up behind it. */
export const OVER_LID = 0.5
/** How high the cat sits while a cushion lies under it. */
export const KNEADS = 0.2
/** How far through a hop up onto a box the cat has reached the height of its lid. */
export const HOP_UP = 0.74
/** The `n` of a hop that goes out in front of the faces and back in although it ends where it began: the cat getting off its lid while the blanket comes down on it, or is pulled off it. */
export const HOP_ROUND = 7
/** How far out in front of the faces that hop takes it. */
export const HOP_FRONT = 0.75
/** The cat's hop down off a box: how far in front of the faces it comes down, the share of the hop by which it is out there, the share of that by which it is clear of the lid and begins to come down, the share of the hop by which it is down, how far it ducks its head once its head is past the lid, high up, so that it stays inside the frame, and the furthest a long hop along the rug swings it out beyond that: short of where the baby sits. */
export const HOP_DOWN = { front: 0.25, out: 0.2, clear: 0.75, down: 0.72, ducks: 0.3, wide: 0.35 }
/** The cat's head, from its middle: half its width with the ears, how far down its chin is, how far up its face goes, and where its ears start and how long they are. */
/** The furthest down the cat's tail turns where it sits on the rug: further, and it is in the rug. */
export const TAIL_LOW = -0.2
/** The cat under the blanket: how narrow it is drawn in, how far over its tail lies, and how far the tail flicks either way from there. */
export const UNDER_CAT = { narrow: 0.8, tail: -0.25, flicks: 0.05 }
export const CAT_HEAD = { half: 0.29, chin: 0.25, brow: 0.25, ear: 0.12, earLong: 0.32 }

/** How far in behind the board the cat's head draws back from a hole too small for it. */
export const DRAWS_IN = 0.2
/** How far above the cloth it sits on the cat's feet are, and how high over its feet the cloth may be for the cat to be sitting on it rather than under it. */
export const ON_CLOTH = { clear: 0.02, within: 0.15 }

/** How high the top of the blanket is at a place, as it is drawn now; null where it does not lie. */
export function clothTop(toy: Toy, x: number, z: number): number | null {
  const cloth = toy.cloth(), last = cloth.xs.length - 1
  if (z > cloth.front || z < cloth.back || x < cloth.xs[0] || x > cloth.xs[last]) return null
  let i = 0
  while (i + 1 < last && cloth.xs[i + 1] < x) i++
  const t = (x - cloth.xs[i]) / Math.max(1e-6, cloth.xs[i + 1] - cloth.xs[i])
  // A ripple runs through it when it is thrown or lands: whoever sits on it rides the ripple.
  const age = toy.age('cloth'), ripple = age < 0 || age > 2 ? 0 : Math.abs(Math.sin(age * 8 * Math.PI) * Math.exp(-age * 6)) * 0.035
  // Its back edge is drawn a little higher than its front edge.
  return cloth.ys[i] + (cloth.ys[i + 1] - cloth.ys[i]) * t + 0.01 + ripple
}

const catIn = {} as CatIn, catOut = {} as CatPose
const SIT_STAGES = ['top', 'rug', 'prick', 'crouch', 'tapePaw', 'under', 'knead', 'swat', 'sweep']

/** The middle of the cat as a finger finds it: its head at a hole, or its body where it sits. */
export function catMiddle(draw: CatDraw): Vec {
  return draw.body.show ? { x: draw.body.x, y: draw.body.y + 0.45 * draw.body.sy, z: draw.body.z } : { x: draw.head.x, y: draw.head.y, z: draw.head.z }
}

export function catDraw(toy: Toy): CatDraw {
  const show = toy.shows.cat, { stage, p } = show, time = toy.time
  const fit = show.fit === 'body' ? 'head' : show.fit
  const atHole = stage === 'rise' || stage === 'look' || stage === 'back'
  Object.assign(catIn, { time, idle: toy.directors.cat.current, idleAt: toy.idleAt.cat, stage: atHole || stage === 'prick' ? stage : stage === 'drop' ? 'drop' : 'top', p, fit,
    tapped: toy.age('cat:tap'), shown: toy.age('cat:show'), patted: Math.min(toy.age('cat:pat'), fit === 'paw' ? toy.age('cat:show') : 1e9), watching: toy.watching })
  const pose = catPose(catIn, catOut)
  const hole = show.hole, to = show.to, from = show.from
  const body = { show: false, x: to.x, y: to.y, z: to.z, sx: 1, sy: 1, rz: 0 }
  const head = { show: true, x: 0, y: 0, z: 0, rz: pose.headRoll }
  let earRoom = 9, tunnelled = false
  let headDip = pose.headDip, paw = pose.paw, tail = pose.tail, legs = { show: false, pedal: 0 }, strip = false, blink = pose.blink
  const sit = (at: Vec, sy = 1, sx = 1): void => { Object.assign(body, { show: true, x: at.x, y: at.y, z: at.z, sx, sy }) }
  const landed = toy.age('cat:land'), land = landed < 0.5 ? -pulse(landed, 0.3) * 0.14 : 0
  if (SIT_STAGES.includes(stage)) {
    // High up it lies down, so that it stays under the home control; on the rug it lies down too, so that it hides nothing behind it.
    const loaf = ((stage === 'top' || stage === 'prick') && to.y >= LOAF_FROM) || stage === 'rug'
    sit(to, loaf ? 0.5 : 1, loaf ? 1.2 : 1)
    // On the highest fort its ears stay as they are cut: pricked further they would be out of the frame.
    if (loaf && to.y >= LOAF_FROM) earRoom = 1
    if (stage === 'crouch') body.sy = 1 - snap(p) * 0.22
    if (stage === 'tapePaw') { paw = 0.8 + Math.sin(time * 30) * 0.2 * Math.exp(-toy.age('cat:shake') * 3); strip = true }
    // Under the blanket it lies low and drawn in, with its paws in; its tail lies over to the side, out from under the edge, and flicks there, clear of the lid and of the cloth.
    if (stage === 'under') { body.sy = 0.42; body.sx = UNDER_CAT.narrow; head.show = false; paw = 0; tail = UNDER_CAT.tail + (toy.age('cat:tail') < 5 ? Math.sin(time * 6) : Math.max(-1, Math.min(1, tail * 6))) * UNDER_CAT.flicks }
    if (stage === 'knead') {
      const turned = toy.age('cat:turn')
      body.y += KNEADS
      if (toy.age('cat:knead') < 1.8) paw = Math.abs(Math.sin(time * 7)) * 0.35
      // It turns round twice, and curls up.
      if (turned < 1.1) { const turn = Math.cos((turned / 1.1) * Math.PI * 4); body.sx = Math.sign(turn || 1) * Math.max(0.2, Math.abs(turn)) }
      if (turned >= 1.1 && turned < 9) { body.sy = 0.62; headDip += 0.3; blink = 1 }
    }
    if (stage === 'swat') paw = Math.max(paw, pulse(toy.age('cat:swat'), 0.3))
    // It turns its back on the piece and flicks its tail across it.
    if (stage === 'sweep') { body.sx = -1; tail = 0.5 + TAIL_LOW - pulse(toy.age('sweep'), 0.3) * 0.5 }
  } else if (stage === 'drop' || stage === 'over') {
    // Off the back of the box in one hop over its lid, and down behind it, where it crouches out of sight; and back up the same way.
    const seat = stage === 'drop' ? from : to, behind = stage === 'drop' ? to : from, d = stage === 'drop' ? ease(p) : 1 - ease(p)
    // It is clear of the lid, which stands up along the back edge, before it comes down.
    const up = Math.sin(Math.min(1, d * 2.2) * Math.PI * 0.5), down = clamp01((d - 0.55) / 0.45), loaf = seat.y >= LOAF_FROM
    sit({ x: seat.x, y: seat.y + up * OVER_LID - down * down * (seat.y + OVER_LID - behind.y), z: seat.z + (behind.z - seat.z) * clamp01(d / 0.75) }, (loaf ? 0.5 : 1) * (1 - down * 0.6), loaf ? 1.2 : 1)
    body.show = d < 0.98
    head.show = d < 0.98
  } else if (stage === 'hop' || stage === 'pop') {
    // It goes round by the front, so that it passes through no box on the way.
    // Up on a high box it jumps low and long, lying out flat, so that it stays inside the frame.
    const high = Math.max(from.y, to.y) >= LOAF_FROM, onto = to.y - from.y > 0.3 || show.n === HOP_ROUND
    if (onto) {
      // Up onto a box, one that is coming down where it sat or one set down further along its lid: it jumps well out
      // in front of the faces, is as high as the lid while it is still out there, and comes in over the lid from the
      // front. It is never where the box comes down, and never in the face of the box it jumps onto.
      const up = ease(clamp01(p / HOP_UP)), e = ease(p)
      sit({ x: from.x + (to.x - from.x) * e, y: from.y + (to.y - from.y) * up, z: from.z + (to.z - from.z) * e }, high ? 0.5 : 1, high ? 1.2 : 1)
      body.z += Math.sin(clamp01(p) * Math.PI) * HOP_FRONT
      // High up its ears go flat for the jump, so that it stays inside the frame while it is out in front.
      if (high) earRoom = 1 - 0.75 * Math.sin(clamp01(p) * Math.PI) ** 0.5
    } else if (stage === 'hop' && from.y - to.y > 0.3) {
      // Down off a box: it is out in front of the faces before it comes down at all, comes down out there, and only
      // then goes in to where it lands. It never sinks through the lid it leaves, or through the edge of a blanket on it.
      const out = ease(clamp01(p / HOP_DOWN.out)), fall = ease(clamp01((p - HOP_DOWN.out * HOP_DOWN.clear) / (HOP_DOWN.down - HOP_DOWN.out * HOP_DOWN.clear))), back = ease(clamp01((p - HOP_DOWN.down) / (1 - HOP_DOWN.down)))
      const front = FRONT_Z + HOP_DOWN.front + Math.sin(clamp01(p) * Math.PI) * Math.min(HOP_DOWN.wide, Math.abs(to.x - from.x) * 0.25)
      sit({ x: from.x + (to.x - from.x) * ease(p), y: from.y + (to.y - from.y) * fall, z: p < HOP_DOWN.down ? from.z + (front - from.z) * out : front + (to.z - front) * back }, high ? 0.5 : 1, high ? 1.2 : 1)
      // High up its ears go flat while it is out in front and has not come down, so that it stays inside the frame.
      if (high) { earRoom = 1 - 0.75 * Math.sin(clamp01(p / HOP_DOWN.down) * Math.PI) ** 0.5; headDip += HOP_DOWN.ducks * ease(clamp01((out - 0.5) / 0.5)) * (1 - back) }
    } else {
      // High up it jumps low and long; where it comes down as high as it left, on the spot or along a lid, it never dips below that lid.
      sit(between(from, to, ease(p), high ? (Math.abs(to.y - from.y) < 0.05 ? 0 : -0.12) : 0.5 + Math.abs(to.y - from.y) * 0.3), high ? 0.5 : 1, high ? 1.2 : 1)
      body.z += Math.sin(clamp01(p) * Math.PI) * Math.min(1.1, 0.25 + Math.abs(to.x - from.x) * 0.4)
      if (high) earRoom = 1
    }
    if (stage === 'pop') body.rz = (1 - p) * -1.2
  } else if (stage === 'walk') {
    sit(between(from, to, p), 1, to.x > from.x ? -1 : 1)
    body.y += Math.abs(Math.sin(p * 14)) * 0.05
  } else if (stage === 'enter' || stage === 'through' || stage === 'stuck') {
    const mouth = { x: hole.x, y: hole.y - 0.3, z: FRONT_Z + 0.1 }
    if (stage === 'enter') { sit(between(from, mouth, ease(p), 0.25), 1 - p * 0.12); head.show = p < 0.45 }
    else if (stage === 'through') { sit(mouth, (1 - p) * 0.88, 1 - p * 0.7); body.show = p < 0.95; head.show = false }
    else {
      // Stuck: its back end outside, legs pedalling in the air.
      sit(mouth, 0.88)
      head.show = false
      legs = { show: true, pedal: Math.sin(time * 19) * (0.25 + 0.75 * Math.exp(-toy.age('cat:claws') * 1.1)) }
      tail = 0.9 + Math.sin(time * 9) * 0.3
    }
  } else if (stage === 'in' && toy.state.boxes[show.box].side) {
    // In a box on its side it sits in the open end.
    sit({ x: hole.x, y: hole.y - toy.rect(show.box)!.h / 2 + 0.04, z: FRONT_Z - 0.5 }, 0.7, 0.7)
    tunnelled = true
  }
  // On a lid the blanket lies over, it sits on the cloth, not in it.
  if (body.show && stage !== 'under') {
    const top = clothTop(toy, body.x, body.z)
    if (top !== null && top + ON_CLOTH.clear > body.y && top < body.y + ON_CLOTH.within) {
      // On the highest fort its ears lie flatter by as much as the cloth lifts it, so that it stays inside the frame.
      if (earRoom <= 1) earRoom = Math.max(0.1, earRoom - ((top + ON_CLOTH.clear - body.y) * 1.5) / CAT_HEAD.earLong)
      body.y = top + ON_CLOTH.clear
    }
  }
  // A purr is seen: its whole body trembles. A jump stretches it as it leaves the ground, and it squeezes itself narrow to go in at a hole.
  body.sy *= 1 + pose.squash + land + (toy.age('cat:purr') < 0.6 ? Math.sin(time * 40) * 0.012 : 0) + pulse(Math.min(toy.age('cat:hop'), toy.age('cat:pop')), 0.3) * 0.16
  body.sx *= 1 - pulse(toy.age('cat:enter'), 0.5) * 0.18
  if (body.show || stage === 'drop') {
    const lying = body.sy < 0.56 && body.sx > 1.1
    // On the rug at the left of the room its head stays over its paws, inside the frame.
    head.x = body.x - (lying ? (body.y < 0.3 ? 0.1 : 0.22) : 0)
    // Lying down its chin is on its paws: the head sits low and does not lift, so the cat on the highest fort is inside the frame.
    head.y = body.y + (lying ? 0.38 - Math.max(0, headDip) : 0.86 * body.sy - headDip)
    head.z = body.z + (lying ? 0.14 : 0.06)
    // In a tunnel its ears lie as flat as the board over them asks.
    const over = tunnelled ? toy.rect(show.box) : null
    if (over) earRoom = Math.max(0.1, (over.foot + over.h - BOARD - 0.03 - head.y - CAT_HEAD.ear) / CAT_HEAD.earLong)
  } else if (atHole || stage === 'in') {
    // At a hole from inside: an eye pressed to it, a nose behind it, or the whole head through it.
    const out = stage === 'in' ? 0.35 : pose.out, back = 1 - out
    // It draws back down and a little way in: never as far in as the cushions that lie in the box, which are behind it (`CUSHION_CAT`).
    if (fit === 'eye') Object.assign(head, { x: hole.x + 0.115, y: hole.y - 0.045 - back * 0.4, z: FRONT_Z - 0.12 - back * DRAWS_IN })
    else if (fit === 'paw') Object.assign(head, { x: hole.x, y: hole.y + 0.07 - back * 0.4, z: FRONT_Z - 0.15 - back * DRAWS_IN })
    else Object.assign(head, { x: hole.x, y: hole.y - 0.02 - back * 0.25, z: FRONT_Z - 0.3 + out * 0.4 })
    head.show = out > 0.02
    // Behind the board its head is inside the box: clear of both walls, of the floor and of the lid. An eye at a
    // peep-hole near a wall is the eye on the side that has room, and under a low lid its ears lie flat.
    const rect = toy.rect(show.box)
    if (rect && head.z < FRONT_Z - 0.05) {
      const wall = BOARD + 0.03, left = rect.x - rect.w / 2 + wall + CAT_HEAD.half, right = rect.x + rect.w / 2 - wall - CAT_HEAD.half
      if (fit === 'eye' && hole.x + 0.115 > right) head.x = hole.x - 0.115
      head.x = Math.max(left, Math.min(right, head.x))
      head.y = Math.max(rect.foot + wall + CAT_HEAD.chin, Math.min(rect.foot + rect.h - wall - CAT_HEAD.brow, head.y))
      earRoom = Math.max(0.1, (rect.foot + rect.h - wall - head.y - CAT_HEAD.ear) / CAT_HEAD.earLong)
    }
  }
  const reach = atHole ? pose.reach : 0
  const own = atHole || stage === 'in' ? { x: hole.x, y: hole.y - 0.6, z: 1.5 } : { x: toy.scissors.at.x, y: toy.scissors.at.y, z: toy.scissors.at.z }
  const look = toy.wary && stage === 'rug' ? toy.wary : gaze(toy, own)
  const paws = { show: reach > 0.02, x: hole.x + 0.03, y: hole.y - 0.03, z: FRONT_Z - 0.1 + reach * 0.16, rot: 0.5 + pose.pat * 0.55, scale: 0.35 + reach * 0.65 }
  // Sitting, it follows what it watches with its whole head: the head turns and leans that way, and with a bulb it swats, with the swing.
  if (body.show && SIT_STAGES.includes(stage) && stage !== 'under') {
    const swing = stage === 'swat' ? Math.sin(toy.age('cat:swat') * 5) * Math.exp(-toy.age('cat:swat') * 1.2) * 0.5 : 0
    const turn = Math.max(-1, Math.min(1, (look.x - head.x) / 2.5)) * toy.watching - swing
    head.rz += turn * -0.22
    head.x += turn * 0.05
  }
  // On or in a box that a finger carries, it rides with the box.
  const sits = stage === 'top' || stage === 'prick' ? highest(toy.state)?.id ?? -1 : stage === 'look' || stage === 'stuck' || stage === 'in' || stage === 'rise' || stage === 'back' ? show.box : -1
  const ride = sits >= 0 ? toy.rideBy?.(sits) ?? null : null
  if (ride) for (const part of [body, head, paws]) { part.x += ride.x; part.y += ride.y; part.z += ride.z }
  return {
    body, head, tail, paw, legs, strip, blink,
    reach: paws,
    ears: Math.min(earRoom, pose.ears + pulse(toy.age('cat:prick'), 0.35) * 0.3), earTurn: pose.earTurn, mouth: pose.mouth, dilate: 0.75 + toy.watching * 0.7,
    shine: toy.state.dark && toy.lit >= 99 ? 1 : 0,
    // After it has stuck in a hole it looks at that hole from a distance.
    look,
  }
}

// --- The baby ------------------------------------------------------------------

export type BabyDraw = {
  x: number
  y: number
  z: number
  /** Leaning over: on all fours it leans the way it crawls, and flopped it lies face down. */
  tilt: number
  bounce: number
  body: boolean
  arms: boolean
  legs: boolean
  armL: number
  /** How long the left arm is drawn, against its cut length: it folds to bring the rattle to the mouth. */
  armLength: number
  armR: number
  kick: number
  head: { show: boolean; dx: number; dy: number; tilt: number }
  blink: number
  /** 0 smiling, 1 wide open, 2 a small round o, 3 a frown. */
  mouth: 0 | 1 | 2 | 3
  look: Vec
}

const babyIn = {} as BabyIn, babyOut = {} as BabyPose
/** How far the rattle arm leans out at rest, and how far the rattle is from the shoulder: the view cuts the arm to these. */
/** How far the baby leans when it sits up to shuffle down the side of a box (radians). */
export const CRAWL_UP = -0.3
/** The legs of the baby's way round a box, as `n` of its crawl: on all fours; sitting up to go down the side; down on all fours again behind the box; and the same coming back. */
export const CRAWL = { flat: 0, sitsUp: 1, liesDown: 2, getsUp: 3, sitsDown: 4 }

/** The rattle at the baby's mouth: how far the arm is turned in and how short it is drawn, and the share of the reveal for which it stays there. */
export const GUMS = { turn: 1.3, length: 0.58, until: 0.3 }
export const RATTLE_ARM = { rest: -2.9, pivot: { x: -0.34, y: 0.6 }, reach: 0.78 }

/** How far in front of its body each part of the baby is cut, in its own measure: the view lays the parts at these, and what it holds is placed in front of the hand that holds it. */
export const BABY_LAYERS = { arm: 0.055, legs: 0.115, head: 0.17, rattleArm: 0.24, ball: 0.215, rattle: 0.3 }

/** Where the rattle is, from where the baby sits: for the rattle itself, and for the test that keeps it in the frame. */
export function rattleAt(draw: BabyDraw): Vec {
  const cos = Math.cos(draw.tilt), sin = Math.sin(draw.tilt), length = RATTLE_ARM.reach * draw.armLength
  const lx = RATTLE_ARM.pivot.x + Math.sin(draw.armL) * length, ly = RATTLE_ARM.pivot.y - Math.cos(draw.armL) * length
  return { x: draw.x + (lx * cos - ly * sin) * BABY_SCALE, y: draw.y + draw.bounce + (lx * sin + ly * cos) * BABY_SCALE, z: draw.z + BABY_LAYERS.rattle * BABY_SCALE }
}

/** Where the baby's other hand is, which holds a toy out towards the fort. */
export function handOf(draw: BabyDraw): Vec {
  const cos = Math.cos(draw.tilt), sin = Math.sin(draw.tilt)
  const lx = 0.34 + Math.sin(draw.armR) * 0.4, ly = 0.6 - Math.cos(draw.armR) * 0.4
  return { x: draw.x + (lx * cos - ly * sin) * BABY_SCALE, y: draw.y + draw.bounce + (lx * sin + ly * cos) * BABY_SCALE, z: draw.z + BABY_LAYERS.ball * BABY_SCALE }
}

export function babyMiddle(draw: BabyDraw): Vec {
  return draw.body ? { x: draw.x, y: draw.y + 0.5 * BABY_SCALE, z: draw.z } : { x: draw.x, y: draw.y + 0.14, z: draw.z }
}

export function babyDraw(toy: Toy): BabyDraw {
  const show = toy.shows.baby, { stage, p, from, to } = show, time = toy.time
  Object.assign(babyIn, { time, idle: toy.directors.baby.current, idleAt: toy.idleAt.baby, tapped: toy.age('baby:tap'), squealed: Math.min(toy.age('baby:squeal'), toy.age('baby:reveal')), watching: toy.watching })
  const pose = babyPose(babyIn, babyOut), sitting = stage === 'sit'
  const draw: BabyDraw = {
    x: to.x, y: to.y, z: to.z, tilt: sitting ? pose.rock : 0, bounce: pose.bounce, body: true, arms: true, legs: true,
    armL: RATTLE_ARM.rest + pose.armL * 0.1 - pose.gum * 1.3, armLength: 1 - pose.gum * 0.42, armR: 0.1 + pose.armR, kick: pose.kick,
    head: { show: true, dx: 0, dy: 0, tilt: pose.headTilt }, blink: Math.max(pose.blink, pulse(toy.age('baby:blink') % 0.5, 0.25) * (toy.age('baby:blink') < 1 ? 1 : 0)), mouth: pose.mouth,
    // The squeal is at the cat, never at the child.
    look: toy.age('baby:squeal') < 2.5 ? catPlace(toy) : gaze(toy, { x: to.x + 1.2, y: 0.9, z: FRONT_Z }),
  }
  // The giggle as it sits back down is seen: it bounces where it sits, and the arm it points with goes up.
  if (sitting) { const glee = pulse(toy.age('baby:giggle'), 0.7); draw.bounce += Math.abs(Math.sin(toy.age('baby:giggle') * 14)) * 0.05 * glee; draw.armR += glee * 0.8; if (glee > 0.05) draw.mouth = 1 }
  if (stage === 'crawl') {
    // It always faces the fort: on its way back to its place it shuffles backwards.
    const at = between(from, to, p)
    // On all fours it leans right over. Down the side of a box it sits up and shuffles, so that it is no wider than the gap there.
    const n = show.n, up = n === CRAWL.sitsUp ? ease(p / 0.25) : n === CRAWL.liesDown ? 1 - ease(p / 0.5) : n === CRAWL.getsUp ? ease((p - 0.5) / 0.5) : n === CRAWL.sitsDown ? 1 - ease((p - 0.75) / 0.25) : 0
    // Its palms slap down as it sets off.
    Object.assign(draw, { x: at.x, y: at.y + 0.4 + Math.abs(Math.sin(p * 16)) * 0.04 - pulse(toy.age('baby:crawl'), 0.2) * 0.05, z: at.z, tilt: mix(-1.2, CRAWL_UP, up), armL: RATTLE_ARM.rest + 0.3 + Math.sin(p * 16) * 0.3, armR: 0.3 - Math.sin(p * 16) * 0.3, kick: Math.sin(p * 16) * 0.5, mouth: 0 })
  } else if (stage === 'in') {
    // Only its feet show, and now and then it peeps out.
    const side = toy.state.boxes[show.box].side, peep = Math.max(pulse(toy.age('baby:giggle'), 1.6), toy.directors.baby.current === 'crane' ? pulse(toy.idleAt.baby, 1) : 0)
    // Behind the box its head is towards the box, so it peeps out past the wall its feet stick out at.
    const out = side ? 0 : Math.sign(to.x - (toy.rect(show.box)?.x ?? to.x)) || -1
    Object.assign(draw, { body: false, arms: false, tilt: 0, kick: Math.sin(time * 3) * 0.25, mouth: 0 })
    draw.head = { show: peep > 0.05, dx: side ? 0 : out * (0.1 + peep * 0.1), dy: (side ? -0.4 : -0.45) + peep * 0.12, tilt: side ? 0 : -out * 0.5 }
  } else if (stage === 'post') {
    const frown = toy.age('baby:frown') < 0.7
    Object.assign(draw, { armR: 1.9 + pulse(p, 1) * 0.6, mouth: frown ? 3 : 2, tilt: -0.1 })
    draw.look = show.hole
  } else if (stage === 'pat') {
    Object.assign(draw, { armR: 1.7 + Math.sin(time * 14) * 0.5 * Math.max(0.3, Math.exp(-toy.age('baby:pat') * 1.5)), armL: RATTLE_ARM.rest + 0.5 + Math.sin(time * 14 + 1.6) * 0.3, mouth: 3, tilt: -0.12 })
  } else if (stage === 'bowl') {
    Object.assign(draw, { armR: p < 0.2 ? 0.1 - snap(p * 5) * 0.9 : -0.8 + snap((p - 0.2) * 5) * 2.6, mouth: 1 })
  } else if (stage === 'hide') {
    // Under the blanket it has its rattle at its mouth: the rattle is under the cloth with it, not up through it.
    Object.assign(draw, { armR: 2.4, armL: RATTLE_ARM.rest - GUMS.turn, armLength: GUMS.length, mouth: 2, tilt: 0 })
  } else if (stage === 'reveal') {
    // The rattle comes back up once the blanket is off and away.
    const up = ease(clamp01((p - GUMS.until) / 0.4))
    Object.assign(draw, { armR: 2.6, armL: mix(RATTLE_ARM.rest - GUMS.turn, draw.armL, up), armLength: mix(GUMS.length, draw.armLength, up), mouth: 1 })
  } else if (stage === 'flop') {
    // Face down on the cushion, arms and legs out: one arm stretched past its head, the rattle arm up in the air.
    const down = snap(p * 4)
    Object.assign(draw, { tilt: -1.45 * down, y: to.y + 0.3 * down, x: to.x + 0.1 * down, armR: 0.1 - down * 1.3, armL: RATTLE_ARM.rest + down * 0.9, kick: Math.sin(time * 9) * 0.5 * down * Math.max(0.25, Math.exp(-toy.age('baby:flop') * 1.2)), mouth: 0 })
  } else if (stage === 'shake') {
    Object.assign(draw, { armR: 1.3 + Math.sin(time * 26) * 0.45, mouth: 1 })
  }
  return draw
}

/** Where the cat is, for the eyes that follow it. */
function catPlace(toy: Toy): Vec {
  const show = toy.shows.cat
  return show.stage === 'look' || show.stage === 'rise' || show.stage === 'stuck' || show.stage === 'enter' || show.stage === 'in' ? show.hole : { x: show.to.x, y: show.to.y + 0.6, z: show.to.z }
}

/** What the baby and the grandmother are looking at, for the test that neither ever looks at the child. */
export const catWatched = catPlace

// --- The grandmother -------------------------------------------------------------

export type GranDraw = {
  /** Hunched over on her knees, 0 to 1: her body is drawn that much shorter. */
  hunch: number
  x: number
  y: number
  z: number
  /** Turned towards where she walks. */
  turn: number
  /** 1 sitting, 0 standing. */
  seated: number
  /** 1 sitting on the floor of a box with her legs out in front, 0 otherwise. */
  sunk: number
  /** How far she is lifted: by a cushion under her, by a step. */
  rise: number
  scale: number
  lean: number
  /** How far she has gathered her knitting up against her chest where she does it without bending over: bobbing down under a box. 0 to 1. */
  gathers: number
  headNod: number
  headTilt: number
  headShow: boolean
  glasses: number
  brow: number
  needleL: number
  needleR: number
  blink: number
  mouth: 0 | 1 | 2
  /** Her hat: on her head, or left outside a hole her head went into. */
  hat: Part
  look: Vec
}

const granIn = {} as GranIn, granOut = {} as GranPose
/** How much taller she stands than she sits, and how large she is drawn sitting in a box. */
export const STANDS = 0.22
export const IN_BOX = 0.74
/** How far she bobs down, knees bent, to step under the rim of a box that is lifted over her head: her hat clears the rim and her skirt stays on the rug. */
export const UNDER_RIM = 0.5
/** The part of a box's way over her head in which she leans back to step under its rim: from where the lean begins, to where it begins to end, and how long it takes to come and to go, each as a share of the whole. */
export const UNDER_LEANS = { from: 0.28, to: 0.64, over: 0.08 }
/** How far she gathers her knitting up as she bobs down under a box. */
export const UNDER_GATHERS = 0.58
/** How far she turns the way she walks, in radians. */
export const WALK_TURN = 0.12
/** Going in at a door she fits: how long it takes, how far through it she is down on her knees, bent over, inside, and how far over she bends (radians). */
export const DUCK = { lasts: 1.1, down: 0.25, bent: 0.42, inside: 0.78, lean: 0.9 }
/** Her try at a door too small: how long it lasts, and how far through it she is down on her knees, at the board, away from it again and up. */
export const HEAD_AT = { lasts: 1.2, down: 0.3, board: 0.45, away: 0.7, up: 0.85 }
/** Her body from where it bends: how far up the middle of her head and the tip of her hat are, and how far in front of where she stands it is. */
export const TORSO = { head: 1.38, hat: 2.02, out: 0.08 }
/**
 * Bent to a door too small: how short she hunches (against her height), how far over she bends where her head will go
 * in and where it will not (radians), how far back from her lane she kneels, and how far inside the face the middle of
 * her head ends up.
 */
export const HUNCH = { short: 0.55, in: 1.25, bump: 0.8, back: 0.14, inside: 0.29 }
/** How far in front of where she sits in her chair she stands: her feet are in front of the seat, and standing she is over them. */
export const STOOD = 0.5

/** How high her seat is: in her chair, standing, or on the floor of a box. */
/** How long the grandmother's eyes stay on her knitting after she is turned out of a box or handed a thing she has no hand for, in seconds. */
export const KNITS = 1.6

export const seatOf = (draw: GranDraw): number => (0.74 + (1 - draw.seated) * STANDS) * (1 - draw.sunk) + 0.02 * draw.sunk + draw.rise

export function granMiddle(draw: GranDraw): Vec {
  return { x: draw.x, y: draw.y + (seatOf(draw) + 0.76) * draw.scale, z: draw.z }
}

export function granDraw(toy: Toy): GranDraw {
  const show = toy.shows.gran, { stage, p, from, to } = show, time = toy.time
  Object.assign(granIn, { time, idle: toy.directors.gran.current, idleAt: toy.idleAt.gran, tapped: toy.age('gran:tap'), startled: toy.age('gran:start'), watching: toy.watching })
  const pose = granPose(granIn, granOut)
  const draw: GranDraw = {
    x: to.x, y: to.y, z: to.z, turn: 0, seated: 1, sunk: 0, rise: 0, scale: 1, hunch: 0, lean: pose.lean, gathers: 0, headNod: pose.headNod, headTilt: pose.headTilt, headShow: true,
    glasses: pose.glasses, brow: pose.brow, needleL: pose.needleL, needleR: pose.needleR, blink: pose.blink, mouth: pose.mouth,
    // Left outside a door her head went into; otherwise on her head.
    hat: { show: false, x: 0, y: 0, z: 0 },
    // Her start is at the cat, never at the child.
    look: toy.age('gran:start') < 2.5 ? catPlace(toy) : gaze(toy, { x: GRAN.x - 1.4, y: 0.9, z: FRONT_Z }),
  }
  // She is a flat figure: turned far, her width would sweep through what lies in front of her lane. She turns a little the way she goes.
  const walking = (at: Vec, towards: Vec): void => { Object.assign(draw, { x: at.x, y: at.y, z: at.z, seated: 0, turn: Math.abs(towards.x - at.x) < 0.05 ? 0 : towards.x > at.x ? WALK_TURN : -WALK_TURN, rise: Math.abs(Math.sin(time * 7)) * 0.035 }) }
  if (stage === 'stand') {
    // Up out of the chair: her feet stay where they were, in front of the seat, and she comes up over them. Then she
    // walks out past the end of the boxes to where she stands, and on to the start of her lane.
    const up = clamp01(p / 0.3), stood = { x: from.x, y: from.y, z: from.z + STOOD }
    walking(along([stood, GRAN_STAND, to], ease((p - 0.3) / 0.7)), to)
    Object.assign(draw, { seated: 1 - up, rise: 0, z: draw.z - STOOD * (1 - up) })
  }
  else if (stage === 'walk') walking(between(from, to, p), to)
  else if (stage === 'pressing') {
    // Along the fort with her thumb out: she bends to each strip as she comes level with it.
    const press = pulse(toy.age('gran:thumb'), 0.3)
    walking(between(from, to, p), to)
    Object.assign(draw, { lean: 0.2 + press * 0.3, needleR: -0.9 - press * 0.6 })
  } else if (stage === 'under') {
    // A box goes over her head: she bobs down, steps under its rim while it is up, and straightens inside it. Taking it off is the same the other way.
    const duck = Math.min(clamp01((p - 0.08) / 0.14), 1 - clamp01((p - 0.74) / 0.16))
    walking(between(from, to, ease((p - 0.27) / 0.43)), to)
    // She bobs straight down over her own feet: her knees do not come forward as they do when she sits. She leans back
    // only while she steps under the rim, when the box is up above her head: leaning as she bobbed, her head and her
    // glasses went back through the wall of the box that was rising round her.
    const leans = Math.min(clamp01((p - UNDER_LEANS.from) / UNDER_LEANS.over), 1 - clamp01((p - UNDER_LEANS.to) / UNDER_LEANS.over))
    // Her knitting is gathered up for as long as she is down, so that it does not trail on the rug in front of her.
    Object.assign(draw, { turn: 0, seated: 0, rise: -(UNDER_RIM + STANDS) * duck, lean: -0.35 * Math.min(duck, leans), gathers: UNDER_GATHERS * duck })
  }
  // What she says as she sets off, or as she finds she is wearing a box, shows on her mouth and her brows.
  if (Math.min(toy.age('gran:walk'), toy.age('gran:wear')) < 0.45) { draw.mouth = 2; draw.brow = 0.9 }
  if (stage === 'sitdown') {
    // Back to the chair the way she came, and down into it.
    const down = ease((p - 0.6) / 0.4), at = along([from, GRAN_STAND, { x: to.x, y: to.y, z: to.z + STOOD }], ease(p / 0.6))
    Object.assign(draw, { x: at.x, y: at.y, z: at.z - STOOD * down, seated: down })
  } else if (stage === 'duck' || stage === 'unduck') {
    // Through a door she fits. She goes down on her knees in front of it and hunches right over before she bends, so
    // that her hat is under the top of the door when it comes to the board; she shuffles in bent like that, and only
    // inside does she straighten and sit down on the floor of the box. She comes out the same way, backwards in time.
    const q = stage === 'duck' ? p : 1 - p, inside = stage === 'duck' ? to : from, outside = stage === 'duck' ? from : to
    const down = ease(q / DUCK.down), bent = ease((q - DUCK.down * 0.8) / (DUCK.bent - DUCK.down * 0.8)), into = ease((q - DUCK.bent) / (DUCK.inside - DUCK.bent)), up = ease((q - DUCK.inside) / (1 - DUCK.inside))
    const sunk = ease((q - DUCK.inside + 0.1) / 0.2), stands = 0.74 + STANDS, seat = mix(stands, 0.02, down)
    walking(between(outside, inside, into), inside)
    Object.assign(draw, { turn: 0, seated: 0, sunk, rise: seat - (stands * (1 - sunk) + 0.02 * sunk), scale: 1 - into * (1 - IN_BOX), hunch: down * (1 - up), lean: mix(-DUCK.lean * bent, 0.12, up) })
  } else if (stage === 'in') Object.assign(draw, { sunk: 1, scale: IN_BOX, lean: 0.12 + pose.lean * 0.3 })
  else if (stage === 'head') {
    // A door too small. She goes down on her knees a step back from it, hunched and bent right over, and only then
    // shuffles up to the board: so her head comes at the hole from in front of it, level with it, and through no board.
    // Where the hole takes her head it goes in, and her hat, knocked off as she bent, stays outside. Where it does not,
    // the brim of her hat meets the board and stops her.
    const fits = show.n > 0, lean = fits ? HUNCH.in : HUNCH.bump
    const down = ease(clamp01(p / HEAD_AT.down)) * (1 - ease(clamp01((p - HEAD_AT.up) / (1 - HEAD_AT.up))))
    const reach = ease(clamp01((p - HEAD_AT.down) / (HEAD_AT.board - HEAD_AT.down))) * (1 - ease(clamp01((p - HEAD_AT.away) / (HEAD_AT.up - HEAD_AT.away))))
    const forward = TORSO.head * HUNCH.short * Math.sin(lean), up = TORSO.head * HUNCH.short * Math.cos(lean)
    // Her seat comes down until her head is level with the hole, or, where it will not go in, with the board just over it.
    const seat = Math.max(0.02, show.hole.y + (fits ? 0 : 0.1) - up), stands = 0.74 + STANDS
    // At the board: her head inside the hole, or the tip of her hat a hair short of the face.
    const near = fits ? FRONT_Z - HUNCH.inside + forward - TORSO.out : FRONT_Z + 0.04 + (TORSO.hat * HUNCH.short * Math.sin(lean)) - TORSO.out
    walking(to, to)
    Object.assign(draw, { rise: -(stands - seat) * down, turn: 0, lean: -lean * down, hunch: down, z: mix(to.z + HUNCH.back * down, near, reach) })
    // The bump knocks her glasses askew.
    draw.glasses = Math.max(draw.glasses, pulse(toy.age('gran:head'), 0.4))
    if (fits && down > 0.5) draw.hat = { show: true, x: show.hole.x + 0.02, y: show.hole.y + 0.34 + pulse(toy.age('gran:head'), 0.2) * 0.1, z: FRONT_Z + 0.2 }
  } else if (stage === 'sitinto') { walking(from, from); draw.rise = 0; draw.seated = Math.sin(clamp01(p) * Math.PI) * 0.45; draw.turn = 0 }
  else if (stage === 'skirt') { walking(to, to); draw.lean = 0 }
  else if (stage === 'thumb') {
    if (show.n >= 0) { walking(to, to); draw.turn = -0.5; draw.lean = 0.45 + pulse(p, 1) * 0.2 }
    draw.needleR = -0.9 - pulse(p, 1) * 0.5 - pulse(toy.age('gran:thumb'), 0.25) * 0.3
  } else if (stage === 'covered') { const busy = toy.age('gran:covered') < 0.5 ? 1 : 0.35; draw.needleL = Math.sin(time * 16) * 0.22 * busy; draw.needleR = Math.sin(time * 16 + 2.1) * 0.22 * busy }
  else if (stage === 'cushionSit') { draw.rise = 0.04 + 0.16 * Math.exp(-toy.age('gran:sit') * 1.1); draw.headTilt = Math.sin(time * 2.2) * 0.22; draw.brow = 0.8 }
  else if (stage === 'necklace') { draw.headNod = 0.22; draw.mouth = 2; draw.headTilt = toy.age('gran:hum') < 0.7 ? Math.sin(toy.age('gran:hum') * 9) * 0.12 : 0 }
  // Turned out of a box that was moved, or handed a thing while she has no hand free for it, she looks at nobody: her eyes go down to her knitting and her head a little with them, and her brows stay down.
  if (toy.age('gran:knit') < KNITS) {
    const hands = onTorso(draw, 0.3)
    draw.look = { x: hands.x, y: hands.y, z: hands.z + 0.25 }
    draw.headNod = Math.max(draw.headNod, 0.14)
    draw.brow = Math.min(draw.brow, 0.2)
  }
  return draw
}

/** How high the middle of each head is, for the eyes of the others. */
export const HEADS = { baby: BABY.y, gran: GRAN.y }

/** A round part of one of the three as it is drawn: its middle and how far it reaches from there, in metres. */
/** A place on the grandmother's body as it is drawn, `up` above her seat when she is upright: bent over and hunched, it is lower and further forward. */
export function onTorso(gran: GranDraw, up: number): Vec {
  const long = up * (1 - (1 - HUNCH.short) * gran.hunch)
  return { x: gran.x, y: gran.y + (seatOf(gran) + long * Math.cos(gran.lean)) * gran.scale, z: gran.z + (TORSO.out + long * Math.sin(gran.lean)) * gran.scale }
}

export type Reach = { part: string; at: Vec; r: number; /** How far it reaches sideways, where that is not `r`. */ rx?: number }

/**
 * How far each of the three reaches as drawn now, as a few circles that hold every board of them: for the test
 * that keeps all of them inside the frame through every motion. The sizes are those the view cuts in cast.ts.
 */
export function reaches(toy: Toy): Reach[] {
  const cat = catDraw(toy), baby = babyDraw(toy), gran = granDraw(toy), all: Reach[] = []
  if (cat.body.show) {
    const { x, y, z, sx, sy } = cat.body
    all.push({ part: 'the cat', at: { x, y: y + 0.35 * sy, z }, r: 0.36 * sy, rx: 0.34 * Math.abs(sx) }, { part: "the cat's tail", at: { x: x + 0.5 * sx, y: y + 0.45 * sy, z }, r: 0.1 })
  }
  // Its face with its whiskers, and its two ears above.
  if (cat.head.show) all.push({ part: "the cat's head", at: { x: cat.head.x, y: cat.head.y, z: cat.head.z }, r: 0.31 }, { part: "the cat's left ear", at: { x: cat.head.x - 0.2, y: cat.head.y + 0.3 * cat.ears, z: cat.head.z }, r: 0.12 }, { part: "the cat's right ear", at: { x: cat.head.x + 0.2, y: cat.head.y + 0.3 * cat.ears, z: cat.head.z }, r: 0.12 })
  if (cat.reach.show) all.push({ part: "the cat's paw", at: { x: cat.reach.x, y: cat.reach.y - 0.2 * cat.reach.scale, z: cat.reach.z }, r: 0.24 * cat.reach.scale })
  const S = BABY_SCALE, cos = Math.cos(baby.tilt), sin = Math.sin(baby.tilt)
  const own = (lx: number, ly: number): Vec => ({ x: baby.x + (lx * cos - ly * sin) * S, y: baby.y + baby.bounce + (lx * sin + ly * cos) * S, z: baby.z })
  if (baby.body) all.push({ part: 'the baby', at: own(0, 0.37), r: 0.42 * S })
  if (baby.legs) all.push({ part: "the baby's left foot", at: own(-0.26, 0.12), r: 0.19 * S }, { part: "the baby's right foot", at: own(0.26, 0.12), r: 0.19 * S })
  if (baby.head.show) all.push({ part: "the baby's head", at: own(baby.head.dx, BABY.y + baby.head.dy + 0.03), r: 0.36 * S })
  if (baby.arms && baby.body) all.push({ part: 'the rattle', at: rattleAt(baby), r: 0.12 * S }, { part: "the baby's other hand", at: handOf(baby), r: 0.09 * S })
  const seat = seatOf(gran), up = (h: number, dx = 0): Vec => ({ x: gran.x + dx * gran.scale, y: gran.y + h * gran.scale, z: gran.z })
  all.push({ part: 'the grandmother', at: up(seat + 0.5), r: 0.5 * gran.scale, rx: 0.45 * gran.scale }, gran.sunk < 0.5
    ? { part: "the grandmother's skirt and slippers", at: up(seat / 2), r: (seat / 2 + 0.02) * gran.scale, rx: 0.46 * gran.scale }
    : { part: "the grandmother's legs, out in front", at: { x: gran.x, y: gran.y + 0.15 * gran.scale, z: gran.z + 0.75 * gran.scale }, r: 0.16 * gran.scale, rx: 0.37 * gran.scale })
  if (gran.headShow) all.push({ part: "the grandmother's head", at: up(seat + 1.38), r: 0.32 * gran.scale }, { part: "the grandmother's hat", at: up(seat + 1.9), r: 0.14 * gran.scale })
  if (gran.hat.show) all.push({ part: 'the hat she left outside', at: gran.hat, r: 0.26 })
  return all
}
