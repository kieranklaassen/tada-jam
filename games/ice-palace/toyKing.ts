import { bears, widthOf, type Rest } from './blocks'
import { AT, FOOT_LANDS, KING_REACH, kingPose, reactionOf } from './cast'
import { BLOCK_H, BUILD, FRONT_Y, GROUND_Y, type Point } from './ground'
import { lampsOf, openGapOf, overSeat, seatOf } from './night'
import { STEP, type Piece, type Toy } from './toy'
import { knockSound, react, wallPieces } from './toyPieces'

// Old King Winter as he is played: where he walks, where he sits, and what
// he does when his seat is touched. He never passes through the wall. The
// front snow is in front of it and the bank behind it is behind it; he
// changes side only at a gate, which is the widest gap at the foot of the
// wall where it is open to the sky, or else the end of the bank by his own
// place. Behind the wall he is drawn behind it, and he climbs to his seat
// from behind. None of it is saved: all of it follows from what stands.

/** One stretch of his way: where it ends, how large he is there, which side of the wall he is on while he walks it, and how narrow he makes himself for it. */
export type Leg = { x: number; y: number; scale: number; behind: boolean; narrow: number }

/** King Winter as he is now. `sat` runs from 0 standing to 1 sat down. */
export type KingNow = {
  x: number
  y: number
  scale: number
  sat: number
  /** Where he is, or is going: his own place by day, a seat on the wall, a block he means to try with one foot, or the snow at his own place with nothing to sit on. */
  where: 'home' | 'seat' | 'try' | 'snow'
  /** The block he sits on or is going to try, by its id, or 0. */
  seat: number
  /** The stretches he has still to walk. */
  path: Leg[]
  /** Seconds he stands and waits before he goes. */
  wait: number
  /** He has come in for the night: until morning he keeps finding himself a seat. */
  sent: boolean
  /** A seat with a point on it that he has already risen from, by its id. */
  tried: number
  /** The block he has already tried with one foot and found wanting, by its id. */
  tested: number
  /** He has yet to polish clear ice on his way in. */
  polish: boolean
  /** He is behind the wall: drawn behind what stands on the bank. */
  behind: boolean
  /** How narrow he has made himself, from 1 as he is down to `NARROWEST`: squeezing through a gap narrower than he is. */
  narrow: number
  /** His seat was pulled from under him and he is on his way down to the snow: how fast he falls. Zero when he is not falling. */
  fall: number
}

/** How large he is drawn once he has walked in to the wall, which stands further back than his own place. */
export const KING_FAR = 0.62
/** How wide and how tall he is at the wall, in stage units. */
export const KING_BODY = 144
export const KING_TALL = 232
/** How wide he is drawn at the wall, cushion and all: this is what has to go through a gap. */
export const KING_DRAWN = 2 * KING_REACH * KING_FAR
/** He squeezes through a gap down to this share of himself as he is drawn, and no gap narrower than that is a gate. */
export const NARROWEST = 0.255
const KING_SPEED = 300
const SIT_S = 0.4
const WAIT_S = 0.8
const GRAVITY = 2600

export function kingHome(): KingNow {
  return { x: AT.king.x, y: AT.king.y, scale: 1, sat: 0, where: 'home', seat: 0, path: [], wait: 0, sent: false, tried: 0, tested: 0, polish: false, behind: false, narrow: 1, fall: 0 }
}
/** Whether he stands at his own place by day, where a block let go over him lands on his head. */
export function kingIsHome(toy: Toy): boolean {
  return !toy.night && !toy.sceneRunning && toy.king.where === 'home' && toy.king.path.length === 0
}
/** Whether he is sat on his seat at night, where a block let go over him lands on his head as well. */
export function kingIsSeated(toy: Toy): boolean {
  const king = toy.king
  return toy.night && king.where === 'seat' && king.path.length === 0 && king.fall === 0 && king.wait <= 0 && king.sat >= 1 && toy.cast.king.what !== 'squawk'
}
/** Whether he is sat in the snow at his own place at night, with no seat: there too a block let go over him lands on his head. */
export function kingInSnow(toy: Toy): boolean {
  const king = toy.king
  return toy.night && king.where === 'snow' && king.path.length === 0 && king.fall === 0 && king.wait <= 0 && king.sat >= 1 && king.x === AT.king.x && king.y === AT.king.y
}
/** Whether he wears a hat. */
export const hatted = (toy: Toy): boolean => toy.pieces.some((piece) => piece.mode === 'hat')
/**
 * Whether he is kept from dozing: he is walking, a scene is playing, or the sun is down and he has come in.
 * Under a hat he dozes all the same, by day and by night, which is how the hat comes off: he nods it off.
 */
export function kingAwake(toy: Toy): boolean {
  const king = toy.king, walking = king.path.length > 0 && king.wait <= 0 && king.fall === 0
  return (toy.night || walking || toy.sceneRunning) && !hatted(toy)
}
/**
 * Whether a thing let go with its middle at `x`, `y` is over him where he is, so that it lands on his head: its
 * middle must be over him, however long it is. By night an icicle is no hat: on his seat it goes to the seat,
 * point up.
 */
export function overKing(toy: Toy, kind: Piece['kind'], x: number, y: number): boolean {
  const king = toy.king
  // At his own place he is touched from 118 units left of his middle to 132 right of it: the thing's middle is on him.
  if (kingIsHome(toy) || (kingInSnow(toy) && kind !== 'icicle')) return x > king.x - 118 && x < king.x + 132 && y < GROUND_Y + BLOCK_H / 2
  return kingIsSeated(toy) && kind !== 'icicle' && Math.abs(x - king.x) < KING_BODY / 2 && y < king.y
}
/** Where a hat sits: on his crown, which nods with his head, wherever he is and however large. */
export function hatPlace(toy: Toy): Point {
  const king = toy.king, nod = kingPose(toy.time, toy.cast.king, kingAwake(toy)).nod
  return { x: king.x + (12 + nod * 8) * king.scale, y: king.y - (372 - king.sat * 88 - nod * 18) * king.scale }
}
/** Whatever he wears on his head comes off and falls to where the save has it. */
export function hatsOff(toy: Toy): boolean {
  let any = false
  for (const piece of toy.pieces) if (piece.mode === 'hat') (any = true), Object.assign(piece, { mode: 'fall', age: 0, vy: 0 })
  return any
}

const landed = (toy: Toy): Piece[] => wallPieces(toy).filter((p) => p.mode === 'rest')
const asRest = (p: Piece): Rest => ({ kind: p.kind, len: p.len, x: p.rest.x, y: p.rest.y, place: p.rest.place, dent: p.dent, cap: p.cap })

/**
 * Where he changes sides: the widest gap at the foot of the wall that is open to the sky, where he makes himself
 * as narrow as the gap; a roofed gap is passed over for the next open one. Only when no gap is open does he go
 * round the end of the bank by his own place, where nothing is built.
 */
export function gateOf(things: readonly Rest[]): { x: number; narrow: number } {
  const gap = openGapOf(things)
  // As narrow as the gap less a finger of air each side, measured on all of him that is drawn.
  if (gap) return { x: gap.x, narrow: Math.max(NARROWEST, Math.min(1, (gap.w - 4) / KING_DRAWN)) }
  return { x: BUILD.x1 + 36 + KING_BODY / 2, narrow: 1 }
}

/** His way from where he is to a place: on top of a seat, which he climbs to from behind the wall, or on the front snow. */
function wayTo(toy: Toy, to: { x: number; y: number; scale: number; top: boolean }): Leg[] {
  const king = toy.king, gate = gateOf(landed(toy).map(asRest)), legs: Leg[] = []
  let behind = king.behind, x = king.x
  // Off a seat he steps down behind the wall.
  if (king.y < GROUND_Y - 1) {
    legs.push({ x, y: GROUND_Y, scale: KING_FAR, behind: true, narrow: 1 })
    behind = true
  }
  if (behind !== to.top) {
    if (behind) legs.push({ x: gate.x, y: GROUND_Y, scale: KING_FAR, behind: true, narrow: 1 }, { x: gate.x, y: FRONT_Y, scale: KING_FAR, behind: false, narrow: gate.narrow })
    else legs.push({ x: gate.x, y: FRONT_Y, scale: KING_FAR, behind: false, narrow: 1 }, { x: gate.x, y: GROUND_Y, scale: KING_FAR, behind: true, narrow: gate.narrow })
    x = gate.x
  }
  if (to.top) legs.push({ x: to.x, y: GROUND_Y, scale: KING_FAR, behind: true, narrow: 1 }, { x: to.x, y: to.y, scale: KING_FAR, behind: true, narrow: 1 })
  else legs.push({ x: to.x, y: to.y, scale: to.scale, behind: false, narrow: 1 })
  return legs.filter((leg, i) => i < legs.length - 1 || leg.x !== king.x || leg.y !== king.y)
}

const HOME = { x: AT.king.x, y: AT.king.y, scale: 1, top: false } as const

/** Where he stands to try a block with one foot: on the front snow beside its end that is nearer his own place, clear of it, so that the leg he puts out is seen against the snow. */
export function tryPlace(block: { x: number; y: number; kind: Piece['kind']; len: number }): { stand: Point; foot: Point } {
  const w = widthOf(block)
  return { stand: { x: Math.round(block.x + w / 2 + KING_BODY / 2 + 12), y: FRONT_Y }, foot: { x: block.x + Math.max(0, w / 2 - 16), y: block.y - BLOCK_H / 2 } }
}

/** Where he is to go now, from where he is. */
function setGoal(toy: Toy): void {
  const king = toy.king, pieces = landed(toy), rests = pieces.map(asRest)
  king.path = []
  if (!toy.night || !king.sent) {
    Object.assign(king, { where: 'home', seat: 0, tried: 0, tested: 0 })
    king.path = wayTo(toy, HOME)
    return
  }
  const found = seatOf(rests)
  const point = found.point >= 0 && pieces[found.point].id !== king.tried ? pieces[found.point] : null
  const seat = point ?? (found.seat >= 0 ? pieces[found.seat] : null)
  if (seat) {
    const top = seat.rest.y - BLOCK_H / 2
    if (king.where === 'seat' && king.seat === seat.id && king.x === seat.rest.x && king.y === top) return
    Object.assign(king, { where: 'seat', seat: seat.id })
    king.path = wayTo(toy, { x: seat.rest.x, y: top, scale: KING_FAR, top: true })
    return
  }
  // Nothing will bear him. The highest thing there is, he walks in and tries with one foot, once.
  const high = found.highest >= 0 ? pieces[found.highest] : null
  if (high && high.id !== king.tested) {
    const at = tryPlace({ x: high.rest.x, y: high.rest.y, kind: high.kind, len: high.len }).stand
    Object.assign(king, { where: 'try', seat: high.id })
    king.path = wayTo(toy, { x: at.x, y: at.y, scale: KING_FAR, top: false })
    return
  }
  Object.assign(king, { where: 'snow', seat: 0 })
  king.path = wayTo(toy, HOME)
}

/** He is sent in for the night, or home for the day, and sets off at once. In the morning he first stands on his seat and shakes, unless a touch is ending the scene: then nothing of it is seen or heard. */
export function kingSend(toy: Toy, sent: boolean, shown = true): void {
  const king = toy.king
  Object.assign(king, { sent, polish: sent, tried: 0, tested: 0, wait: 0 })
  if (!sent && !shown) hatsOff(toy)
  if (!sent && shown && (king.sat > 0 || king.where !== 'home')) {
    if (hatsOff(toy)) toy.say({ name: 'hatOff' })
    react(toy, 'king', 'shake')
    toy.show({ type: 'flakes', x: king.x, y: king.y - 150 * king.scale })
  }
  setGoal(toy)
}

/** He is where he was going, sat down, with no walk and no sound: how a load and a put-away find him. A point on the best seat he has already been up off, and a block that will not bear him he has already tried. */
export function kingSettle(toy: Toy): void {
  const king = toy.king, pieces = landed(toy)
  const found = seatOf(pieces.map(asRest))
  Object.assign(king, { wait: 0, polish: false, fall: 0, narrow: 1, behind: false })
  king.tried = found.point >= 0 ? pieces[found.point].id : 0
  king.tested = found.highest >= 0 ? pieces[found.highest].id : 0
  setGoal(toy)
  const last = king.path[king.path.length - 1]
  if (last) Object.assign(king, { x: last.x, y: last.y, scale: last.scale })
  king.path = []
  king.sat = king.where === 'home' ? 0 : 1
}

/** Whether the block he sits on is still under him, at rest. */
function seatHolds(toy: Toy): Piece | null {
  const king = toy.king, seat = toy.pieces.find((p) => p.id === king.seat)
  // A snow seat that a thumb has made a snowball of is no seat any more: it is gone from under him.
  if (!seat || seat.mode !== 'rest' || seat.rest.place !== 'built' || !bears(seat.kind)) return null
  return seat.rest.x === king.x && seat.rest.y - BLOCK_H / 2 === king.y ? seat : null
}

/**
 * Something on the bank has changed. Seated, he stirs only when his own seat is touched. Gone or fallen from
 * under him, it drops him onto the snow behind the wall. An icicle set on it sends him straight up. Anything
 * else set on it, or into the air he sits in, makes him step back off it, wait, and go to find another. Nothing
 * else moves him: not a block taken from under a seat that still stands. On his way somewhere, or sat in the
 * snow with no seat, he looks again at what stands.
 */
export function kingSees(toy: Toy): void {
  const king = toy.king
  if (!toy.night || !king.sent || king.fall > 0) return
  const up = king.where === 'seat' && king.path.length === 0 && king.y < GROUND_Y - 1
  if (!up) {
    if (king.wait <= 0 && toy.cast.king.what !== 'foot') setGoal(toy)
    return
  }
  const seat = seatHolds(toy)
  if (!seat) {
    // His seat is gone from under him: down he goes, behind the wall.
    if (hatsOff(toy)) toy.say({ name: 'hatOff' })
    Object.assign(king, { fall: 1, behind: true, wait: 0, path: [] })
    react(toy, 'king', 'brows')
    return
  }
  if (king.wait > 0) return
  const rests = landed(toy).map(asRest), mine = asRest(seat)
  const over = overSeat(mine, rests.filter((b) => !(b.x === mine.x && b.y === mine.y)), lampsOf(rests))
  // A lamp that has come to hang in the air he sits in counts as a block there does: no lamp ever hangs in his crown.
  if (over.things.length === 0 && !over.lamp) return
  if (hatsOff(toy)) toy.say({ name: 'hatOff' })
  king.wait = WAIT_S
  if (!over.lamp && over.things.every((b) => b.kind === 'icicle')) {
    // A point under him: straight up, and then he looks for another seat.
    king.tried = seat.id
    if (toy.cast.king.what !== 'squawk') react(toy, 'king', 'squawk')
    return
  }
  // He steps back off the front of his seat, behind what has been set on it or hung over it.
  king.behind = true
}

/** An icicle has been let go to stand on the seat he sits on: he is off it, straight up, before the point is under him. */
export function kingPointed(toy: Toy, at: { x: number; y: number }): void {
  const king = toy.king
  if (!kingIsSeated(toy) || Math.abs(at.y - (king.y - BLOCK_H / 2)) > 0.5 || Math.abs(at.x - king.x) > KING_BODY / 2) return
  react(toy, 'king', 'squawk')
}

/** How far his beard reaches a block from where he stands, to either side of him. */
export const POLISH_REACH = KING_BODY / 2 + 6
/** The clear block his beard reaches from where he stands on the ground, on either side of the wall: one in the four rows his beard hangs past. */
export function clearInReach(toy: Toy): Piece | null {
  const king = toy.king
  if (king.y < GROUND_Y - 0.5) return null
  return landed(toy).find((p) => p.kind === 'clear' && p.rest.place === 'built' && p.rest.y > GROUND_Y - 4 * BLOCK_H && Math.abs(p.rest.x - king.x) <= widthOf(p) / 2 + POLISH_REACH) ?? null
}

function onPoint(toy: Toy, seat: Piece): boolean {
  const pieces = landed(toy), found = seatOf(pieces.map(asRest))
  return found.point >= 0 && pieces[found.point] === seat
}

/** How narrow he is one step on, on his way to `to`: eased, and exactly there once he is near, so that a king at rest is as a load has him. */
const towards = (now: number, to: number): number => (Math.abs(to - now) < 0.005 ? to : now + (to - now) * 0.3)

/** One step of King Winter: falling, waiting, walking, trying a block, sitting down, and what he says when he has. */
export function kingStep(toy: Toy): void {
  const king = toy.king, doing = toy.cast.king.what
  const stand = (): void => {
    king.sat = Math.max(0, king.sat - STEP / SIT_S)
  }
  if (king.fall > 0) {
    king.sat = Math.min(1, king.sat + STEP / SIT_S)
    king.fall += GRAVITY * STEP
    king.y = Math.min(GROUND_Y, king.y + king.fall * STEP)
    if (king.y < GROUND_Y) return
    // Down on the snow behind the wall, sat, with a bump. Then he gets up and looks for a seat.
    Object.assign(king, { fall: 0, sat: 1, wait: WAIT_S * 1.5, where: 'snow', seat: 0 })
    react(toy, 'king', 'sit')
    toy.show({ type: 'puff', x: king.x, y: GROUND_Y - 6 })
    return
  }
  if (doing === 'foot') {
    // The foot lands on the block in this step: the block answers as it does to a knock, and rocks.
    const lasts = reactionOf('king', 'foot').lasts, age = toy.cast.king.age, block = toy.pieces.find((p) => p.id === king.seat)
    if (block && age >= lasts * FOOT_LANDS && age - STEP < lasts * FOOT_LANDS) {
      block.wobbleV += 16
      toy.say(knockSound(block))
    }
    return
  }
  if (king.where === 'try' && king.path.length === 0 && king.wait <= 0 && king.tested === king.seat) {
    // He has tried it, and it will not do: home, to sit in the snow.
    setGoal(toy)
    return
  }
  if (doing === 'shake') return stand()
  if (king.wait > 0) {
    stand()
    king.wait -= STEP
    if (king.wait <= 0) setGoal(toy)
    return
  }
  if (doing === 'polish' || doing === 'squawk') return
  const next = king.path[0]
  if (next) {
    stand()
    // He takes no hat with him: it comes off as he sets out.
    if (hatsOff(toy)) toy.say({ name: 'hatOff' })
    if (next.narrow < 1) {
      // A gap narrower than he is: he stops before it on the side he is on, on his feet, and makes himself as
      // narrow as the gap; only then does he step into it, and he stays that narrow until he is through.
      if (king.narrow !== next.narrow || king.sat > 0) {
        king.narrow = towards(king.narrow, next.narrow)
        return
      }
    } else king.narrow = towards(king.narrow, next.narrow)
    king.behind = next.behind
    const away = Math.hypot(next.x - king.x, next.y - king.y), go = KING_SPEED * STEP
    if (away <= go) {
      Object.assign(king, { x: next.x, y: next.y, scale: next.scale })
      king.path.shift()
      return
    }
    // On his way in he polishes clear ice with his beard: a clear block that stands where he passes, once.
    if (king.polish && king.sent && clearInReach(toy)) {
      king.polish = false
      react(toy, 'king', 'polish')
      return
    }
    king.x += ((next.x - king.x) / away) * go
    king.y += ((next.y - king.y) / away) * go
    king.scale += (next.scale - king.scale) * Math.min(1, go / away)
    return
  }
  king.narrow = towards(king.narrow, 1)
  if (king.where === 'home') return stand()
  if (king.where === 'try') {
    king.tested = king.seat
    react(toy, 'king', 'foot')
    return
  }
  // On top of his seat he is in front of it again.
  if (king.where === 'seat') king.behind = false
  if (king.sat >= 1) return
  king.sat = Math.min(1, king.sat + STEP / SIT_S)
  if (king.sat < 1) return
  if (king.where === 'snow') return react(toy, 'king', 'grumble')
  const seat = toy.pieces.find((p) => p.id === king.seat)
  if (seat && onPoint(toy, seat)) {
    // A point under him: straight up, and then he looks for another seat.
    king.tried = seat.id
    react(toy, 'king', 'squawk')
    king.wait = WAIT_S
    return
  }
  react(toy, 'king', 'sit')
}
