import { bears, widthOf, type Rest } from './blocks'
import { AT, AT_NIGHT, BOLT_S, DOZE_JERK, DOZE_S, HARE_EVERY, HARE_S, WHO, harePose, type Who } from './cast'
import { BLOCK_H, GROUND_Y, POND, SUN, onPond, sawable, type Point } from './ground'
import { MOST_LAMPS, hollows, nightOf, seatOf, type Tone } from './night'
import { STEP, type Piece, type Toy } from './toy'
import { lampLift, lampSettle, lampStep } from './toyKids'
import { hatsOff, kingHome, kingSees, kingSettle, kingStep } from './toyKing'
import { CLOSE_S, TOUCH_PAD, act, react, wallPieces } from './toyPieces'
import type { SoundName } from './voices'

// The day and the night as they are played: what the light does at each
// thing, where the bird perches, when the hare crosses, and who a finger
// lands on. King Winter is in toyKing.ts and the two frost children in
// toyKids.ts. All of it is worked out from what stands on the bank and from
// the clock of play; none of it is saved.

const landed = (toy: Toy): Piece[] => wallPieces(toy).filter((p) => p.mode === 'rest')
const asRest = (p: Piece): Rest => ({ kind: p.kind, len: p.len, x: p.rest.x, y: p.rest.y, place: p.rest.place, dent: p.dent, cap: p.cap })

const LIGHT: Record<Tone, SoundName> = { sharp: 'bell', soft: 'flute', red: 'reed', fan: 'glitter' }

/**
 * The light is worked out again from what has landed on the bank. With `heard`, each thing the light newly
 * reaches sounds what the light does there, one voice for each kind of answer.
 */
export function relight(toy: Toy, heard: boolean): void {
  const pieces = landed(toy), rests = pieces.map(asRest)
  const night = nightOf(rests, toy.lampsLit)
  toy.nightNow = night
  const lit = new Map<number, string>()
  for (const patch of night.patches) lit.set(pieces[patch.of].id, patch.tone === 'dark' ? (pieces[patch.of].kind === 'ball' ? 'thud' : 'drum') : patch.tone)
  if (heard) {
    const names = new Set<SoundName>()
    for (const [id, what] of lit) if (toy.lit.get(id) !== what) names.add(what === 'thud' || what === 'drum' ? what : LIGHT[what as Tone])
    for (const name of names) toy.say({ name })
  }
  toy.lit = lit
  const hollow = hollows(rests)[0]
  const tasted = (index: number): (Point & { id: number }) | null => (index >= 0 ? { x: rests[index].x, y: rests[index].y, id: pieces[index].id } : null)
  // More lamps are shut in than were: one has been shut in anew, and the lamp child owes it one rap, on the snow
  // that shuts it in. Taking one of two blocks that shut a lamp in lets nothing out, and is no such thing, even
  // where the lamp moves along its hollow.
  const lamps = night.shut.map((lamp) => `${lamp.x},${lamp.y}`)
  const more = lamps.length > toy.shutLamps.length
  const anew = more ? (night.shut.find((_, index) => !toy.shutLamps.includes(lamps[index])) ?? night.shut[0]) : undefined
  toy.shutLamps = lamps
  if (anew || lamps.length === 0) toy.knocked = 0
  toy.taste = { hollow: hollow ? { x: hollow.x, y: hollow.y } : null, shut: tasted(anew ? anew.snow : night.shutIn), clear: tasted(night.clearLit), highest: seatOf(rests).wanted }
}

/**
 * The bird's perch on a block is no nearer the jam's home control than this: the control is a round button of
 * 48 px at the top centre of the surface, 10 px down. In stage units it is largest on the shortest surface the
 * game is held to, 375 px high, where a stage unit is 0.457 px: 53 units to each side and 127 units deep.
 */
export const HOME_CONTROL = { x: 590, half: 56, foot: 130 } as const
/** How far the bird is touched from where it perches: to each side, above and below. */
export const BIRD_BOX = { side: 40, up: 50, down: 34 } as const
const underHome = (x: number, y: number): boolean => Math.abs(x - HOME_CONTROL.x) < HOME_CONTROL.half + BIRD_BOX.side + 6 && y - BIRD_BOX.up < HOME_CONTROL.foot + 8

/**
 * Where the bird perches: on the highest block that has its top free, is not King Winter's (the one he sits on
 * or is trying with his foot) and is not right under the home control; on its bush while there is none.
 */
export function perch(toy: Toy): Point {
  let high: Piece | null = null
  const all = landed(toy), king = toy.king
  for (const p of all) {
    const top = p.rest.y - BLOCK_H / 2
    if (p.rest.place !== 'built' || !bears(p.kind) || underHome(p.rest.x, top - 24)) continue
    if (p.id === king.seat && (king.where === 'seat' || king.where === 'try')) continue
    // Nothing stands where the bird would: neither on the block nor over it within the bird's own height.
    const taken = all.some((q) => q !== p && q.rest.y < p.rest.y && q.rest.y + BLOCK_H / 2 > top - BIRD_BOX.up - 24 && Math.abs(q.rest.x - p.rest.x) < widthOf(asRest(q)) / 2 + BIRD_BOX.side - 12)
    if (taken) continue
    if (!high || p.rest.y < high.rest.y) high = p
  }
  return high ? { x: high.rest.x, y: high.rest.y - BLOCK_H / 2 - 24 } : AT.bird
}

/** The bird goes to where it perches now, when that is somewhere else; `heard`, it tweets as it sets off. */
export function birdSees(toy: Toy, heard: boolean): void {
  const to = perch(toy), bird = toy.bird
  if (to.x === bird.toX && to.y === bird.toY) return
  Object.assign(bird, { fromX: bird.x, fromY: bird.y, toX: to.x, toY: to.y, flight: 0 })
  if (heard) toy.say({ name: 'tweet', lively: toy.chance.next() })
}

/** Something on the bank has changed: the light, the bird and, at night, King Winter answer. */
export function wallChanged(toy: Toy): void {
  relight(toy, true)
  kingSees(toy)
  birdSees(toy, true)
}

/**
 * Everything that is worked out is put where it belongs for the day or the night the clearing is in, at once
 * and without a sound: lamps lit, the king seated, the frost children and the bird in their places. This is
 * how a load finds the clearing, and how a put-away leaves it.
 */
export function settleNight(toy: Toy): void {
  toy.scene = null
  toy.skate = null
  toy.flood = toy.night ? 1 : 0
  toy.lampsLit = toy.night ? MOST_LAMPS : 0
  toy.king = { ...kingHome(), sent: toy.night }
  relight(toy, false)
  kingSettle(toy)
  const peeper = toy.night ? AT_NIGHT.peeper : AT.peeper
  toy.kids.peeper = { ...peeper, up: toy.night ? 1 : 0 }
  lampSettle(toy)
  const to = perch(toy)
  toy.bird = { x: to.x, y: to.y, fromX: to.x, fromY: to.y, toX: to.x, toY: to.y, flight: 1 }
}

/** Who a finger landing here touches: each where it is drawn now. The sun is the handle of the day and is asked for by itself. */
export function whoAt(toy: Toy, at: Point): Exclude<Who, 'fish' | 'sun'> | null {
  const within = (x0: number, y0: number, x1: number, y1: number): boolean => at.x >= x0 && at.x <= x1 && at.y >= y0 && at.y <= y1
  const { bird, king, kids } = toy
  if (within(bird.x - BIRD_BOX.side, bird.y - BIRD_BOX.up, bird.x + BIRD_BOX.side, bird.y + BIRD_BOX.down)) return 'bird'
  // Up on a seat he is touched down to where the seat's own touch shape begins, so that the block under him is a fair target too.
  const foot = king.where === 'seat' && king.path.length === 0 && king.y < GROUND_Y - 1 ? king.y - TOUCH_PAD : king.y + 4
  if (within(king.x - 118 * king.scale, king.y - (368 - king.sat * 90) * king.scale, king.x + 132 * king.scale, foot)) return 'king'
  const lift = lampLift(toy)
  // Behind the wall the lamp child is touched where it shows above the bank.
  if (within(kids.lamp.x - 90, kids.lamp.y - 230 - lift, kids.lamp.x + 100, kids.lamp.behind ? Math.min(kids.lamp.y + 70, 500) : kids.lamp.y + 70 - lift)) return 'lamp'
  // The peeper's nose reaches the pond's edge, and a cut may start right beside it: ice the saw can cut is never the peeper.
  if (!sawable(at.x, at.y) && (kids.peeper.up > 0.5 ? within(kids.peeper.x - 70, kids.peeper.y - 190, kids.peeper.x + 70, kids.peeper.y + 12) : within(0, 640, 226, 820))) return 'peeper'
  if (hareOut(toy)) {
    const hare = hareNow(toy)
    if (Math.hypot(at.x - hare.x, at.y - (hare.y - 24)) <= 46) return 'hare'
  }
  return null
}

/** Whether a thing lies over the peeper's view of the fish: on the ice in front of its nose. It leans round it. */
export function peeperBlocked(toy: Toy): boolean {
  if (toy.night) return false
  return toy.pieces.some((p) => p.mode === 'rest' && p.rest.place === 'lying' && p.rest.x - p.len / 2 < 330 && p.rest.x > 150 && p.rest.y > 640 && p.rest.y < 790)
}

/** The red thing the fish comes to look at: the berry block while it floats, lies on the pond's ice or is carried over it. */
export function redOnPond(toy: Toy): Piece | null {
  const berry = toy.pieces.find((p) => p.kind === 'berry')
  if (!berry || berry.mode === 'sink' || berry.mode === 'melt' || berry.mode === 'hat') return null
  return onPond(berry.x, berry.y) ? berry : null
}
/** Where the fish holds still to look at it: beside it and a little below, kept inside the pond. */
export function fishLooksFrom(red: Point): Point {
  const x = red.x - 62, y = red.y + 30
  const out = Math.hypot((x - POND.cx) / (POND.rx - 50), (y - POND.cy) / (POND.ry - 24))
  return out <= 1 ? { x, y } : { x: POND.cx + (x - POND.cx) / out, y: POND.cy + (y - POND.cy) / out }
}

/** Whether the hare is out from behind its firs now: for the seconds of its crossing, or of its dash for cover. */
export function hareOut(toy: Toy): boolean {
  return toy.time >= toy.hareAt && toy.time < toy.hareAt + HARE_S && (toy.hareBolt < 0 || toy.time - toy.hareBolt < BOLT_S)
}
/** The hare as it is now. */
export function hareNow(toy: Toy): ReturnType<typeof harePose> {
  return harePose(toy.time - toy.hareAt, toy.hareBolt < 0 ? -1 : toy.time - toy.hareBolt)
}
/** The hare is sent running for the nearer of its firs: by a poke, or by the dusk. */
export function hareBolts(toy: Toy): void {
  if (hareOut(toy) && toy.hareBolt < 0) toy.hareBolt = toy.time
}

/** One step of everything that is not a thing: the characters, the closing holes, the sun, the bird, the hare, the fish and a hat. */
export function dayStep(toy: Toy): void {
  for (const who of WHO) act(toy, who)
  for (const hole of toy.holes) if (hole.closing > 0 && hole.closing < 1) hole.closing = Math.min(1, hole.closing + STEP / CLOSE_S)
  for (let i = toy.holes.length - 1; i >= 0; i--) if (toy.holes[i].closing >= 1) toy.holes.splice(i, 1)

  // The sun goes back where it belongs when nothing holds it.
  if (!toy.sunHand && !toy.sceneRunning) {
    const home = toy.night ? SUN.night : SUN.day
    toy.sunV += ((home - toy.sunY) * 140 - toy.sunV * 16) * STEP
    toy.sunY += toy.sunV * STEP
    if (Math.abs(home - toy.sunY) < 0.05 && Math.abs(toy.sunV) < 1) Object.assign(toy, { sunY: home, sunV: 0 })
  }
  const sat = toy.king.sat, did = toy.cast.king.what, went = toy.king.where
  kingStep(toy)
  // The moment he has sat down on a block, the bird leaves it for the next highest; it is off a block before his foot comes down on it, and back when he has gone.
  if (toy.king.where === 'seat' && sat < 1 && toy.king.sat >= 1) birdSees(toy, false)
  if (toy.cast.king.what === 'foot' && did !== 'foot') birdSees(toy, true)
  if (toy.king.where !== went) birdSees(toy, false)
  lampStep(toy)

  const bird = toy.bird
  if (bird.flight < 1) {
    bird.flight = Math.min(1, bird.flight + STEP / 0.5)
    const p = bird.flight * bird.flight * (3 - 2 * bird.flight)
    bird.x = bird.fromX + (bird.toX - bird.fromX) * p
    bird.y = bird.fromY + (bird.toY - bird.fromY) * p - Math.sin(p * Math.PI) * 50
  }

  // The hare: poked, it dashes for the nearer fir; then the snow is bare for a while. It keeps to the day.
  if (toy.cast.hare.what === 'bolt') hareBolts(toy)
  const hidden = toy.hareBolt >= 0 && toy.time - toy.hareBolt >= BOLT_S
  if (toy.time >= toy.hareAt + HARE_S || hidden) {
    toy.hareAt = toy.time + HARE_EVERY
    toy.hareBolt = -1
  }
  if (toy.night && !hareOut(toy) && toy.hareAt < toy.time + 4) toy.hareAt = toy.time + 4

  // The fish comes to look at anything red on its pond: the berry block afloat, lying on the ice, or carried over it.
  const red = redOnPond(toy) !== null
  toy.fishStare = Math.max(0, Math.min(1, toy.fishStare + (red ? STEP : -STEP) / 0.9))

  // A hat comes off when he jerks awake from a doze, by day and by night: under a hat he dozes.
  const cycle = (toy.time % DOZE_S) / DOZE_S, was = ((toy.time - STEP) % DOZE_S) / DOZE_S
  if (was < DOZE_JERK && cycle >= DOZE_JERK && toy.cast.king.what === null && hatsOff(toy)) {
    toy.say({ name: 'hatOff' })
    react(toy, 'king', 'brows')
  }
  if (toy.snowing > 0) toy.snowing = Math.max(0, toy.snowing - STEP)
}
