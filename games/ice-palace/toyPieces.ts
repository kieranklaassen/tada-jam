import { BALL, INTO_WATER, MOST_DENTS, ON_BANK_Y, SMALL_BALL, STUB, freeSpot, hangPlace, restOnBank, rollBall, settle, widthOf, type Rest } from './blocks'
import { DART_AHEAD, reactionOf, type Who } from './cast'
import { BLOCK_H, GROUND_Y, awayFromBar, awayFromHole, onPond, type Bar, type Point } from './ground'
import { below } from './rng'
import { STEP, type LiveHole, type Piece, type Toy } from './toy'
import { wallChanged } from './toyDay'
import { hatPlace, kingIsSeated, kingPointed, overKing } from './toyKing'
import type { Sound } from './voices'
import { noteOfLength, type SoundName } from './voices'

// How a thing moves: knocked, picked up, set down, landing, rolling, going
// under, and melting under a warm thumb. Each cell of the sheet's grid
// (ART.md) has its motion and its sound here, asked for in the step it is
// seen in.

/** How long a block takes to hop out of the pond and land. */
export const HOP_S = 0.42
/** How long a thing set in open water bobs before the ice starts to close over it, and how long the closing takes. */
export const BOB_S = 0.3
export const CLOSE_S = 0.5
/** A finger resting on a thing is a warm thumb once it has stayed this long: longer than the longest tap of the youngest child. */
export const WARM_AFTER = 0.5
/**
 * How long a thumb takes to change a thing once it is warm. Clear ice, which is then gone for good, takes three
 * times as long as the rest and shows it all the way: it sweats, drips and sinks, and a finger that lifts saves it.
 */
export const HEAT_S = 1.1
export const HEAT_CLEAR_S = 3.4
/** How long a clear block takes to sink into its puddle once it has gone. */
export const MELT_S = 0.6
/** A snowball afloat bubbles aloud this long after it lands, once in each stretch of `FIZZ_EVERY`. */
export const FIZZ_S = 2.4
export const FIZZ_EVERY = 0.8
const GRAVITY = 2600
/** A splash reaches a character from this far, and its drops travel this fast. */
const SPLASH_REACH = 560
const SPLASH_SPEED = 900

/**
 * A thing is touched this far outside its drawn edge, and as if it were at least `TOUCH_MIN` long: on the
 * narrowest surface the game is held to (820 px wide, where a stage unit is 0.69 px) a block's 46 units of
 * height would be a 32 px target, and with the margin it is 48.
 */
export const TOUCH_PAD = 12
export const TOUCH_MIN = 70

export const openHoles = (toy: Toy): LiveHole[] => toy.holes.filter((hole) => !hole.shut)
const live = (p: Piece): boolean => p.mode !== 'sink' && p.mode !== 'melt' && p.mode !== 'held'
const inWall = (p: Piece): boolean => p.rest.place === 'built' || p.rest.place === 'hung'
const asRest = (p: Piece): Rest => ({ kind: p.kind, len: p.len, x: p.rest.x, y: p.rest.y, place: p.rest.place, dent: p.dent, cap: p.cap })

/** Everything that lies below the bank, or will, as the saw and a thing looking for a place see it. */
export function lying(toy: Toy, but?: Piece): Rest[] {
  return toy.pieces.filter((p) => p !== but && live(p) && !inWall(p)).map(asRest)
}
/** What stops the saw: everything that lies on the ice. A thing afloat is in a hole already, which stops the saw by itself. */
export function bars(toy: Toy): Bar[] {
  return lying(toy).filter((b) => b.place !== 'afloat').map((b) => ({ x: b.x, y: b.y, len: widthOf(b) }))
}
/** The pieces that stand on the bank or hang in the wall, or will. */
export function wallPieces(toy: Toy, but?: Piece): Piece[] {
  return toy.pieces.filter((p) => p !== but && live(p) && inWall(p))
}
export function wall(toy: Toy, but?: Piece): Rest[] {
  return wallPieces(toy, but).map(asRest)
}

/** The thing under the finger: the one drawn last among those it is in, with a margin so a small thing is still a fair target. It is touched where it is drawn. */
export function pieceAt(toy: Toy, at: Point): Piece | null {
  let found: Piece | null = null, best = Infinity
  for (const piece of toy.pieces) {
    if (piece.mode === 'sink' || piece.mode === 'melt') continue
    // The thing the finger is in wins over one it is only near; of two it is in, the one drawn last.
    const inside = awayFromBar(piece.x, piece.y, widthOf(piece), at.x, at.y) === 0
    const away = inside ? 0 : Math.max(0.01, awayFromBar(piece.x, piece.y, Math.max(widthOf(piece), TOUCH_MIN - TOUCH_PAD * 2), at.x, at.y))
    if (away <= TOUCH_PAD && away <= best) (found = piece), (best = away)
  }
  return found
}

/** A character starts doing something now: it is seen and heard from this step. */
export function react(toy: Toy, who: Who, what: string): void {
  const actor = toy.cast[who]
  actor.what = what
  actor.age = 0
  const sound = reactionOf(who, what).sound
  if (sound) toy.say({ name: sound, lively: below(toy.chance, 5) / 4 })
}
export function dart(toy: Toy): void {
  if (toy.cast.fish.what === null) react(toy, 'fish', 'dart')
}
/** One step of a character: what waits for it starts when it is due, and what it is doing ends when it has lasted. */
export function act(toy: Toy, who: Who): void {
  const actor = toy.cast[who]
  for (const waiting of actor.next) waiting.inS -= STEP
  // What waits is counted in whole steps: half a step of slack keeps the sum of sixty small numbers from costing one.
  const due = actor.next.findIndex((waiting) => waiting.inS <= STEP / 2)
  if (due >= 0) {
    const [waiting] = actor.next.splice(due, 1)
    react(toy, who, waiting.what)
    return
  }
  if (actor.what === null) return
  actor.age += STEP
  if (actor.age >= reactionOf(who, actor.what).lasts) {
    if (who === 'fish') toy.fishAhead += DART_AHEAD
    actor.what = null
    actor.age = 0
  }
}

export function splash(toy: Toy, x: number, y: number): void {
  toy.show({ type: 'splash', x, y })
  dart(toy)
  const king = toy.king, peeper = toy.kids.peeper
  for (const [who, what, wx, wy] of [['king', 'wet', king.x, king.y - 60 * king.scale], ['peeper', 'soaked', peeper.x, peeper.y - 30 - peeper.up * 150]] as const) {
    const away = Math.hypot(wx - x, wy - y)
    // The peeper is soaked every time; King Winter when he is near. The drops are seen to fly there, and each answers in the step they land.
    if (who === 'king' && away > SPLASH_REACH) continue
    const inS = Math.max(STEP, Math.ceil(away / SPLASH_SPEED / STEP) * STEP)
    toy.cast[who].next.push({ what, inS })
    toy.show({ type: 'spray', from: { x, y }, to: { x: wx, y: wy }, lasts: inS })
  }
}

/** What a thing sounds like when it is knocked, by a fingertip or by King Winter's foot. */
export function knockSound(piece: Piece): Sound {
  const pitch = noteOfLength(piece.len)
  switch (piece.kind) {
    case 'clear': return { name: 'ring', pitch }
    case 'cloudy': return { name: 'tock', pitch }
    case 'snow': return { name: 'thup' }
    case 'ball': return { name: 'scrunch' }
    case 'icicle': return { name: 'ting' }
    case 'berry': return { name: 'boop' }
    default: return piece.kind satisfies never
  }
}

/** A fingertip on a thing: it sounds at once and moves, each kind in its own way. */
export function knock(toy: Toy, piece: Piece, at: Point): void {
  const pitch = noteOfLength(piece.len)
  piece.wobbleV += 9
  switch (piece.kind) {
    case 'clear': toy.say({ name: 'ring', pitch }); break
    case 'cloudy':
      toy.say({ name: 'tock', pitch })
      toy.show({ type: 'dust', x: piece.x, y: piece.y, len: piece.len })
      break
    case 'snow':
      // The fingertip leaves a dent that stays: the newest four are kept.
      toy.say({ name: 'thup' })
      piece.wobbleV -= 9
      piece.dent = [...piece.dent, Math.round(Math.max(-piece.len / 2 + 10, Math.min(piece.len / 2 - 10, at.x - piece.x)))].slice(-MOST_DENTS)
      toy.mark('now')
      break
    case 'ball':
      toy.say({ name: 'scrunch' })
      piece.wobbleV += 16
      break
    case 'icicle':
      toy.say({ name: 'ting' })
      piece.wobbleV += 20
      break
    case 'berry': toy.say({ name: 'boop' }); break
    default: piece.kind satisfies never
  }
}

/** The thing leaves where it was. What stood on it comes down. */
export function pickUp(toy: Toy, piece: Piece): void {
  const was = piece.mode
  Object.assign(piece, { mode: 'held', age: 0, turn: 0, vy: 0, path: [] })
  if (piece.kind === 'berry') {
    // The berry is taken from the water: the peeper has nothing left to watch bob.
    const peeper = toy.cast.peeper
    peeper.next = peeper.next.filter((waiting) => waiting.what !== 'watch')
    if (peeper.what === 'watch') Object.assign(peeper, { what: null, age: 0 })
  }
  if (was === 'hat') return
  // A thing caught in the air was on its way to `rest`, which is where it goes back to if the carry is taken away.
  if (!inWall(piece)) return
  comeDown(toy)
  // What it bore has come down into its place. From now on the save holds it where it would go back to: on top of what fell.
  const hang = piece.rest.place === 'hung' ? hangPlace(piece.rest.x, piece.rest.y, wall(toy, piece)) : null
  const back = hang ?? restOnBank(widthOf(piece), piece.rest.x, piece.rest.y, wall(toy, piece))
  if (back) piece.rest = { x: back.x, y: back.y, place: hang ? 'hung' : 'built' }
}

/** Everything in the wall with nothing to bear it falls to what will, and the night is worked out again. */
export function comeDown(toy: Toy): void {
  const standing = wallPieces(toy)
  const moved = settle(standing.map(asRest))
  for (const [index, to] of moved) {
    const piece = standing[index]
    piece.rest = { x: to.x, y: to.y, place: to.place }
    piece.on = Math.abs(to.y - ON_BANK_Y) < 0.5 ? 'snow' : 'block'
    if (piece.mode === 'rest') Object.assign(piece, { mode: 'fall', age: 0, vy: 0, from: { x: piece.x, y: piece.y, turn: 0 } })
  }
  toy.mark('now')
  wallChanged(toy)
}

/** The child lets a carried thing go: above the bank's line it falls to what bears it; below, it lies where it is put, and over open water the pond takes it. */
export function setDown(toy: Toy, piece: Piece): void {
  piece.from = { x: piece.x, y: piece.y, turn: 0 }
  piece.vy = 0
  piece.age = 0
  piece.mode = 'fall'
  toy.mark('now')
  const w = widthOf(piece)
  if (overKing(toy, piece.kind, piece.x, piece.y)) {
    // On King Winter, at his own place or on his seat: worn as a hat. The save holds it lying where it will come off to: the snow beside him.
    for (const other of toy.pieces) if (other.mode === 'hat') Object.assign(other, { mode: 'fall', age: 0, vy: 0 })
    const spot = freeSpot(w, toy.king.x + (kingIsSeated(toy) ? 0 : 60), GROUND_Y + 66, lying(toy, piece), openHoles(toy))
    piece.rest = { x: spot.x, y: spot.y, place: 'lying' }
    piece.on = 'snow'
    piece.mode = 'hat'
    toy.say({ name: 'hatOn' })
    react(toy, 'king', 'brows')
    return
  }
  if (piece.y < GROUND_Y + BLOCK_H / 2) {
    const built = wall(toy, piece)
    const hang = piece.kind === 'icicle' ? hangPlace(piece.x, piece.y, built) : null
    if (hang) {
      piece.rest = { x: hang.x, y: hang.y, place: 'hung' }
      piece.on = 'block'
      return
    }
    const path = piece.kind === 'ball' ? rollBall(w, piece.x, piece.y, built) : []
    const rest = piece.kind === 'ball' ? path[path.length - 1] : restOnBank(w, piece.x, piece.y, built)
    if (rest) {
      piece.rest = { x: rest.x, y: rest.y, place: 'built' }
      piece.on = path.length > 0 ? path[0].on : rest.on
      piece.path = path.map(({ x, y }) => ({ x, y }))
      if (piece.kind === 'icicle') kingPointed(toy, piece.rest)
      return
    }
  }
  const taken = (h: LiveHole): boolean => toy.pieces.some((p) => p !== piece && p.rest.place === 'afloat' && p.rest.x === h.x && p.rest.y === h.y)
  const hole = openHoles(toy).filter((h) => !taken(h) && awayFromHole(h, piece.x, piece.y) <= INTO_WATER).sort((a, b) => awayFromHole(a, piece.x, piece.y) - awayFromHole(b, piece.x, piece.y))[0]
  if (hole && (piece.kind === 'clear' || piece.kind === 'cloudy' || piece.kind === 'snow')) {
    // The outcome is certain from here: the block and its hole are out of every save.
    hole.shut = true
    Object.assign(piece, { mode: 'sink', into: hole })
    toy.say({ name: piece.kind === 'clear' ? 'plop' : piece.kind === 'cloudy' ? 'glug' : 'fizz' })
    if (piece.kind === 'snow') toy.show({ type: 'puff', x: piece.x, y: piece.y })
    else splash(toy, piece.x, piece.y)
    return
  }
  if (hole) {
    // The berry block and a snowball float; an icicle freezes in, and the pond closes round it.
    piece.rest = { x: hole.x, y: hole.y, place: piece.kind === 'icicle' ? 'frozen' : 'afloat' }
    piece.on = 'ice'
    if (piece.kind === 'icicle') hole.shut = true
    piece.into = hole
    return
  }
  const spot = freeSpot(w, piece.x, piece.y, lying(toy, piece), openHoles(toy))
  piece.rest = { x: spot.x, y: spot.y, place: 'lying' }
  piece.on = onPond(spot.x, spot.y) ? 'ice' : 'snow'
}

const LANDS: Record<Piece['kind'], SoundName> = { clear: 'clink', cloudy: 'thunk', snow: 'flump', ball: 'pat', icicle: 'tick', berry: 'roundKnock' }

/** A thing arrives where it rests: its landing is seen and heard in this step. */
export function land(toy: Toy, piece: Piece): void {
  const hopped = piece.mode === 'hop', rolled = piece.mode === 'roll'
  piece.x = piece.rest.x
  piece.y = piece.rest.y
  piece.turn = 0
  piece.squashV = -5 - Math.min(4, Math.abs(piece.vy) / 300)
  piece.vy = 0
  piece.mode = 'rest'
  piece.age = 0
  const pitch = noteOfLength(piece.len), into = piece.into
  piece.into = null
  if (piece.rest.place === 'afloat') {
    toy.say({ name: piece.kind === 'berry' ? 'bloop' : 'splosh' })
    splash(toy, piece.x, piece.y)
    if (piece.kind === 'ball') piece.fizz = FIZZ_S
    // The peeper is soaked and laughs, as at any splash; then it stretches its neck out to watch the berry bob. Its doing is with the thing, and it says nothing.
    if (piece.kind === 'berry') {
      const soak = toy.cast.peeper.next.find((waiting) => waiting.what === 'soaked')
      toy.cast.peeper.next.push({ what: 'watch', inS: (soak ? soak.inS : 0) + reactionOf('peeper', 'soaked').lasts })
    }
    return
  }
  if (piece.rest.place === 'frozen') {
    // In with a plip; the ice starts to close round it in this same step.
    toy.say({ name: 'plip', lively: 0.2 })
    toy.show({ type: 'ripple', x: piece.x, y: piece.y })
    piece.wobbleV += 18
    if (into) into.closing = STEP / CLOSE_S
    return
  }
  if (hopped) {
    // Fresh out of the pond it rings its own note, as a knock would.
    piece.wobbleV += 14
    toy.say(piece.kind === 'clear' ? { name: 'ring', pitch } : { name: 'tock', pitch })
    if (piece.kind === 'cloudy') toy.show({ type: 'dust', x: piece.x, y: piece.y, len: piece.len })
    return
  }
  if (rolled) toy.say({ name: 'pat' })
  else if (piece.kind === 'clear') toy.say({ name: piece.on === 'snow' ? 'crunch' : 'clink', pitch })
  else toy.say({ name: LANDS[piece.kind] })
  if (piece.kind === 'cloudy') toy.show({ type: 'dust', x: piece.x, y: piece.y, len: piece.len })
  if (piece.kind === 'snow') toy.show({ type: 'flakes', x: piece.x, y: piece.y + BLOCK_H / 2 })
  if (piece.kind === 'berry') piece.wobbleV += 16
  if (piece.on === 'snow') toy.show({ type: 'puff', x: piece.x, y: piece.y + BLOCK_H / 2 })
  if (inWall(piece)) {
    if (!toy.night) {
      react(toy, 'king', 'bounce')
      react(toy, 'lamp', 'lift')
    }
    wallChanged(toy)
  }
}

/** One step of a thing: its springs, and whatever it is doing besides resting. */
export function movePiece(toy: Toy, piece: Piece): void {
  piece.age += STEP
  piece.squashV += (-220 * piece.squash - 14 * piece.squashV) * STEP
  piece.squash += piece.squashV * STEP
  piece.wobbleV += (-300 * piece.wobble - 9 * piece.wobbleV) * STEP
  piece.wobble += piece.wobbleV * STEP
  if (toy.hand?.piece !== piece && piece.heat > 0) piece.heat = Math.max(0, piece.heat - STEP * (piece.kind === 'clear' ? 0.8 : 2))
  if (piece.cap && piece.capAge < 1 && toy.snowing > 0) piece.capAge = Math.min(1, piece.capAge + STEP / 0.7)
  if (piece.fizz > 0) {
    // A snowball afloat bubbles: three times after it lands, each seen and heard in its step.
    const before = piece.fizz
    piece.fizz = piece.mode === 'rest' && piece.rest.place === 'afloat' ? Math.max(0, piece.fizz - STEP) : 0
    if (Math.ceil(before / FIZZ_EVERY) > Math.ceil(piece.fizz / FIZZ_EVERY) && before < FIZZ_S) {
      toy.say({ name: 'bubble', lively: piece.fizz / FIZZ_S })
      toy.show({ type: 'bubbles', x: piece.x, y: piece.y })
    }
  }
  switch (piece.mode) {
    case 'hat': {
      const head = hatPlace(toy)
      piece.x += (head.x - piece.x) * 0.5
      piece.y += (head.y - piece.y) * 0.5
      return
    }
    case 'hop': {
      const p = Math.min(1, piece.age / HOP_S)
      piece.x = piece.from.x + (piece.rest.x - piece.from.x) * p
      piece.y = piece.from.y + (piece.rest.y - piece.from.y) * p - Math.sin(p * Math.PI) * 74
      piece.turn = piece.from.turn * (1 - p) * (1 - p)
      if (p >= 1) land(toy, piece)
      return
    }
    case 'fall': {
      const to = piece.path[0] ?? piece.rest
      piece.x += (to.x - piece.x) * 0.4
      if (to.y > piece.y + 0.5) {
        piece.vy += GRAVITY * STEP
        piece.y = Math.min(to.y, piece.y + piece.vy * STEP)
      } else piece.y += (to.y - piece.y) * 0.4
      if (Math.abs(piece.y - to.y) >= 0.6 || Math.abs(piece.x - to.x) >= 0.6) return
      if (piece.path.length <= 1) return land(toy, piece)
      // A snowball has come down on something it will roll off: it rumbles from this step.
      piece.path.shift()
      Object.assign(piece, { mode: 'roll', x: to.x, y: to.y, vy: 0 })
      toy.say({ name: 'rumble' })
      return
    }
    case 'roll': {
      const to = piece.path[0]
      const dx = to.x - piece.x
      if (Math.abs(dx) > 0.6) {
        const go = Math.sign(dx) * Math.min(Math.abs(dx), 240 * STEP)
        piece.x += go
        piece.spin += go / (piece.len / 2)
        return
      }
      piece.vy += GRAVITY * STEP
      piece.y = Math.min(to.y, piece.y + piece.vy * STEP)
      if (piece.y < to.y) return
      piece.vy = 0
      piece.path.shift()
      if (piece.path.length === 0) land(toy, piece)
      return
    }
    case 'sink': {
      const hole = piece.into!
      piece.x += (hole.x - piece.x) * 0.2
      piece.y = hole.y + Math.sin(Math.min(1, piece.age / BOB_S) * Math.PI * 2) * 5 + Math.max(0, piece.age - BOB_S) * 30
      if (hole.closing === 0 && piece.age >= BOB_S) {
        // The ice starts to close in this step, and this is the step it is heard in.
        hole.closing = STEP / CLOSE_S
        toy.say({ name: piece.kind === 'clear' ? 'crackle' : piece.kind === 'cloudy' ? 'creak' : 'slush' })
      }
      if (piece.age >= BOB_S + CLOSE_S * 0.6) toy.pieces.splice(toy.pieces.indexOf(piece), 1)
      return
    }
    case 'melt':
      if (piece.age < MELT_S) return
      // The puddle freezes flat and is gone into what is under it.
      toy.pieces.splice(toy.pieces.indexOf(piece), 1)
      toy.say({ name: 'sigh' })
      return
    default:
  }
}

/** One step of a warm thumb: a finger that rests on a thing warms it, and at full warmth the thing changes as its kind does. */
export function warmStep(toy: Toy): void {
  const hand = toy.hand
  if (!hand || hand.moved) return
  const piece = hand.piece, before = hand.held
  hand.held += STEP
  if (hand.held < WARM_AFTER) return
  if (before < WARM_AFTER && piece.kind === 'cloudy') toy.say({ name: 'hiss' })
  const was = piece.heat
  piece.heat = Math.min(1, piece.heat + STEP / (piece.kind === 'clear' ? HEAT_CLEAR_S : HEAT_S))
  // It sweats: a drip four times on the way, and nine times for clear ice, each heard as it falls.
  const drips = piece.kind === 'clear' ? 9.01 : 4.01
  if (Math.floor(piece.heat * drips) > Math.floor(was * drips) && piece.heat < 1) {
    toy.show({ type: 'drips', x: piece.x, y: piece.y + BLOCK_H / 2, many: 2 })
    if (piece.kind !== 'cloudy') toy.say({ name: piece.kind === 'icicle' ? 'plink' : 'drip', lively: piece.heat })
  }
  if (piece.heat < 1) return
  piece.heat = 0
  hand.held = WARM_AFTER
  switch (piece.kind) {
    case 'clear': {
      // It sinks into a puddle and leaves the save now; what stood on it comes down.
      const stood = inWall(piece)
      toy.hand = null
      Object.assign(piece, { mode: 'melt', age: 0 })
      toy.show({ type: 'drips', x: piece.x, y: piece.y + BLOCK_H / 2, many: 6 })
      if (stood) comeDown(toy)
      break
    }
    case 'cloudy':
      piece.kind = 'clear'
      piece.wobbleV += 12
      toy.say({ name: 'tingClear', pitch: noteOfLength(piece.len) })
      if (inWall(piece)) wallChanged(toy)
      break
    case 'snow': {
      Object.assign(piece, { kind: 'ball', len: BALL, dent: [], cap: false, squashV: -9 })
      toy.say({ name: 'squelch' })
      toy.show({ type: 'puff', x: piece.x, y: piece.y })
      if (inWall(piece)) comeDown(toy)
      break
    }
    case 'ball':
      if (piece.len > SMALL_BALL) piece.len = SMALL_BALL
      piece.wobbleV += 14
      toy.say({ name: 'fizzle' })
      // Its unlit spot on the snow is the ball as it is now.
      if (inWall(piece)) wallChanged(toy)
      break
    case 'icicle':
      if (piece.len > STUB) piece.len = STUB
      piece.wobbleV += 10
      toy.say({ name: 'plink', lively: 1 })
      if (inWall(piece)) wallChanged(toy)
      break
    case 'berry':
      // It does not melt, so the one berry is never lost: it blushes and squeaks.
      piece.wobbleV += 18
      piece.heat = 0.6
      toy.say({ name: 'blush' })
      break
    default: piece.kind satisfies never
  }
  toy.mark('now')
}
