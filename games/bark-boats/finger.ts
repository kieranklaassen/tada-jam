import type { Who } from './acts'
import { bankAct, type Target } from './bankActs2'
import { MAKINGS, canTake, placeFor, weightOf, type Kind } from './build'
import { grabOnBrook, dropOnBrook, wake } from './journey'
import { EDDY, FROG, KINGFISHER, LAID_OUT, SEAT, SKY_BOTTOM, STONE, SUN, WASHED, WATER, clamp, distance, frameLeft, isBrook, isWater, shoreAt, type Spot } from './layout'
import { buildOf, freeSpot, hullShape, onBoat, placeOf, slotOf, type Piece } from './pieces'
import { FLY, fly, startAct } from './play'
import { blow, croak, hat, rattle } from './pokeActs'
import { finishScene, startAboard, startMorning } from './scenes'
import { EDDY_IN, HOLD_LIFT, MAX_PUFFS, MAX_RINGS, boatShown, buildNow, emit, fromGnome, homesOf, mark, newJourney, partShown, type World } from './world'

// The finger. Whatever it lands on answers in the same call, and a thing let
// go is the child's: the game never makes a move the child did not make.

export function ring(w: World, x: number, y: number, strength: number, own: boolean): void {
  if (w.rings.length >= MAX_RINGS) w.rings.shift()
  w.rings.push({ x, y, age: 0, strength, hitBoat: own, hitFrog: own })
}

/**
 * A tap on nothing in particular is answered as what it landed on, with a sight where it landed: the near
 * ground knocks and throws up petals, the far bank rustles and throws up a small puff of petals, smaller for being further away, and the sky gives
 * a whiff of wind and a short gust. Nothing above the water knocks like ground.
 */
function knock(w: World, x: number, y: number): void {
  if (w.puffs.length >= MAX_PUFFS) w.puffs.shift()
  const kind = y >= WATER.top ? 'ground' : y >= SKY_BOTTOM ? 'far' : 'sky'
  w.puffs.push({ x, y, age: 0, kind })
  if (kind === 'ground') emit(w, 'ground', 1.2 - (y / 820) * 0.35)
  else if (kind === 'far') emit(w, 'rustle', 1.25 + (x / 1180) * 0.3)
  else emit(w, 'whiff', 0.8 + (x / 1180) * 0.3)
}

/** The loose thing nearest the finger, within its reach: one lying on the bank or floating. */
export function looseAt(w: World, x: number, y: number): Piece | null {
  let best: Piece | null = null, nearest = Infinity
  for (const piece of w.pieces) {
    if (piece.place.on !== 'bank' || (piece.mode !== 'rest' && piece.mode !== 'float')) continue
    const facts = MAKINGS[piece.kind]
    // A long thing is measured to the nearest point along it.
    const far = distance(x, y, clamp(x, piece.x - facts.hw + 20, piece.x + facts.hw - 20), piece.y)
    if (far < facts.reach && far < nearest) { best = piece; nearest = far }
  }
  return best
}

/**
 * The room that is a deck thing's own, whatever stands beside it: within this of the middle of a load or a
 * blanket, the finger takes it, even at the foot of a mast. 56 units across is 48 px at 1024 by 768.
 */
const ROOM = 29

/** The part of the boat nearest the finger that can come off: a sail before the mast it is on. */
export function partAt(w: World, x: number, y: number): Piece | null {
  const build = buildNow(w)
  let best: Piece | null = null, nearest = Infinity, own: Piece | null = null, ownFar = ROOM
  for (const piece of w.pieces) {
    if (!onBoat(piece) || piece.place.on === 'hull' || piece.mode !== 'rest') continue
    const slot = slotOf(piece, w.pieces)
    if (!slot || !canTake(build, slot)) continue
    let far: number
    if (slot.on === 'mast') {
      // A mast is taken anywhere along it, from its top down to the rim of the hull, where it goes out of sight.
      // Below the rim the finger is on the hull, by which the boat is lifted.
      const shape = hullShape(build.hull), half = MAKINGS[piece.kind].length / 2
      const top = partShown(w, piece, half), foot = partShown(w, piece, shape.deck - shape.rim - half)
      const ax = foot.x - top.x, ay = foot.y - top.y
      const k = clamp(((x - top.x) * ax + (y - top.y) * ay) / (ax * ax + ay * ay), 0, 1)
      far = k >= 1 && y > foot.y + 8 ? Infinity : distance(x, y, top.x + ax * k, top.y + ay * k)
    } else {
      const at = partShown(w, piece)
      far = distance(x, y, at.x, at.y)
      // Within its own room a load or a blanket is taken before a mast that stands beside it.
      if (slot.on === 'deck' && far < ownFar) { own = piece; ownFar = far }
    }
    if (far < MAKINGS[piece.kind].reach && far < nearest) { best = piece; nearest = far }
  }
  return own ?? best
}

/** Whether a point is over the boat where it is drawn: its hull, and afloat or for a thing let go, everything that stands on it. */
export function overBoat(w: World, x: number, y: number, whole: boolean): boolean {
  const boat = w.boat
  if (boat.mode !== 'stone' && boat.mode !== 'afloat' && boat.mode !== 'brook') return false
  // While the view moves on, the boat is between two frames and is not to be caught.
  if (w.journey.phase === 'pan') return false
  const build = buildNow(w)
  if (!build.hull) return false
  const at = boatShown(w)
  const dx = x - at.x, dy = y - at.y
  if (Math.abs(dx) > MAKINGS[build.hull].hw + 16) return false
  const tall = build.masts.reduce((most, mast) => Math.max(most, mast ? MAKINGS[mast].length : 0), 0)
  const standing = tall > 0 ? tall + 70 : 130
  return dy < 22 && dy > -(whole ? Math.max(standing, 240) : boat.mode === 'stone' ? 84 : standing)
}

function lift(w: World, piece: Piece, x: number, y: number): void {
  piece.mode = 'held'
  piece.x = x
  piece.y = y - HOLD_LIFT
  piece.squash = -0.6
  piece.back = false
  piece.rider = null
  // On top of everything else that lies about.
  w.pieces.splice(w.pieces.indexOf(piece), 1)
  w.pieces.push(piece)
  emit(w, LIFT[piece.kind][0], LIFT[piece.kind][1])
}

const LIFT = {
  twig: ['lift-twig', 1], stalk: ['lift-twig', 0.8], stem: ['lift-twig', 1.3], birch: ['lift-birch', 1], maple: ['lift-maple', 1], feather: ['lift-birch', 1.45],
  berry: ['lift-berry', 1], cap: ['lift-berry', 0.7], pebble: ['lift-pebble', 1], bark: ['lift-boat', 1.1], walnut: ['lift-boat', 1.3], pod: ['lift-boat', 1.5],
} as const

function grabBoat(w: World, x: number, y: number): void {
  const boat = w.boat, at = boatShown(w)
  if (boat.mode === 'brook' && w.journey.phase === 'answer') {
    // A place is answering the boat. A finger on it does not stop the answer: the hull knocks and bobs under
    // the finger, and only a finger that pulls lifts it out (dragStart). A tap changes nothing.
    w.hand = { on: 'answer' }
    emit(w, 'thock', 1.6)
    boat.dipV += 46
    boat.leanV += x < at.x ? 0.5 : -0.5
    return
  }
  // It is taken from where it is drawn, which an answer of the brook may have moved from where the boat is.
  w.hand = { on: 'boat', dx: at.x - x, dy: at.y - y - 12 }
  emit(w, 'lift-boat', 1.3 - weightOf(buildNow(w), w.gnomeAt === 'aboard') / 28)
  if (boat.mode === 'brook') { w.hand.from = grabOnBrook(w, at); return }
  boat.mode = 'held'
  boat.y -= 12
  boat.vx = 0
  boat.squash = -0.5
  startAboard(w)
}

/** How far from the gnome's middle line, belt to hat tip, a finger still lands on him. */
export const GNOME_REACH = 50

const busy = (w: World, who: Who): boolean => w.acts.some((run) => run.brook && run.act.who.includes(who))

/** One of the folk in the frame, under the finger: each is touched where it is drawn. */
function folkAt(w: World, x: number, y: number): boolean {
  const homes = homesOf(w.frame), s = w.stage
  // One who is busy with the boat goes on with it: the touch falls through to the water or the ground under it.
  if (homes.frog && !busy(w, 'frog') && distance(x, y, homes.frog.x + s.frog.dx, homes.frog.y - 82 + s.frog.dy + s.frog.under * 60) < 92) {
    startAct(w, croak)
    ring(w, homes.frog.x + s.frog.dx, homes.frog.y + 14, 0.7, true)
    return true
  }
  if (homes.bird && !busy(w, 'bird') && distance(x, y, homes.bird.x + 4 + s.bird.dx, homes.bird.y - 72 + s.bird.dy) < 86) return startAct(w, rattle) !== null
  if (homes.sprite && !busy(w, 'sprite') && distance(x, y, homes.sprite.x - 4 + s.sprite.dx, homes.sprite.y - 86 + s.sprite.sink) < 96) return startAct(w, blow) !== null
  return false
}

/** The finger lands. Whatever it lands on answers in this call. `corner` is the grown-up's corner, which answers nothing. */
export function press(w: World, x: number, y: number, corner = false): void {
  w.hand = { on: 'other' }
  // The grown-up's corner: nothing answers, nobody looks, and nothing that waits for a touch is woken.
  if (corner) return
  w.finger.x = x; w.finger.y = y; w.finger.down = true
  // A touch ends a scene in its end state, and is then an ordinary touch.
  finishScene(w)
  wake(w)
  const boat = w.boat
  if (w.frame < 0) {
    const loose = looseAt(w, x, y)
    if (loose) {
      w.hand = { on: 'piece', piece: loose, pulled: true }
      return lift(w, loose, x, y)
    }
    // A part comes off wherever the boat waits at the bank: on its stone, and afloat in the eddy.
    if (boat.mode === 'stone' || boat.mode === 'afloat') {
      const part = partAt(w, x, y)
      if (part) {
        // A part of the boat wobbles under the finger, and comes off when it is pulled.
        w.hand = { on: 'piece', piece: part, pulled: false }
        part.squash = -0.45
        emit(w, LIFT[part.kind][0], LIFT[part.kind][1] * 1.12)
        return
      }
    }
  }
  if (w.where === 'pond' && w.finished && distance(x, y, SUN.x, SUN.pond - w.show.sun) < SUN.tap) {
    w.hand = { on: 'sun', y }
    w.show.sun = 8
    emit(w, 'chime', 0.8)
    return
  }
  // The gnome answers over the whole of him as drawn, his hat to its tip.
  if ((w.frame < 0 || w.gnomeAt !== 'stone') && !busy(w, 'gnome') && !w.scene && fromGnome(w, x, y) < GNOME_REACH) { startAct(w, hat); return }
  if (!w.finished && overBoat(w, x, y, false)) return grabBoat(w, x, y)
  if (folkAt(w, x, y)) return
  if (w.frame < 0 ? isWater(x, y) : isBrook(y)) {
    w.hand = { on: 'water', x, y }
    ring(w, x, y, 1, false)
    emit(w, 'ring', 0.84 + (x / 1180) * 0.34)
    return
  }
  knock(w, x, y)
}

/** Whatever is in the hand goes back where it came from, and makes no move. */
function release(w: World): void {
  const hand = w.hand
  w.hand = null
  w.finger.down = false
  w.boat.offer = null
  if (hand?.on === 'piece' && hand.pulled) {
    toItsFrame(w, hand.piece)
    hand.piece.back = true
    fly(hand.piece, hand.piece.place.on === 'bank' ? FLY.lie : FLY.seat)
  } else if (hand?.on === 'boat') {
    if (w.boat.mode === 'brook') dropOnBrook(w, false, hand.from)
    else settleBoat(w, w.boat.at, w.boat.restX)
  }
}

/** A thing leaves the hand, where it is measured in the frame the boat is in, for the frame it belongs to: the bank's. */
function toItsFrame(w: World, piece: Piece): void {
  if (piece.place.on === 'bank') piece.x += frameLeft(w.frame) - frameLeft(-1)
}

/** The press ended where it began: a thing lifted is set down again where it was. */
export const tap = release
/** The press was taken away, which is not a tap: the same thing happens, since nothing was moved. */
export const pressEnd = release
/** The drag was taken away and the child made no drop: the thing goes back where it came from. */
export const dragCancel = release

/** The finger has started to pull: a part of the boat under it comes off. */
export function dragStart(w: World): void {
  const hand = w.hand
  if (hand?.on === 'piece' && !hand.pulled) {
    hand.pulled = true
    lift(w, hand.piece, w.finger.x, w.finger.y)
    emit(w, 'pop', hand.piece.kind === 'pebble' ? 0.8 : 1)
    w.boat.leanV += 1.4
  } else if (hand?.on === 'answer') {
    // The finger pulls at a boat a place is answering: now it is lifted out of the answer, from where it is drawn.
    if (w.boat.mode !== 'brook' || w.journey.phase === 'pan') { w.hand = { on: 'other' }; return }
    const at = boatShown(w)
    w.hand = { on: 'boat', dx: at.x - w.finger.x, dy: at.y - w.finger.y - 12 }
    emit(w, 'lift-boat', 1.3 - weightOf(buildNow(w), w.gnomeAt === 'aboard') / 28)
    w.hand.from = grabOnBrook(w, at)
    w.boat.wet = 1.4
    emit(w, 'drip')
  } else if (hand?.on === 'boat' && (w.boat.at === 'eddy' || w.boat.mode === 'brook')) {
    w.boat.wet = 1.4
    emit(w, 'drip')
  }
}

export function dragMove(w: World, x: number, y: number): void {
  w.finger.x = x; w.finger.y = y
  const hand = w.hand
  if (hand?.on === 'water' && (w.frame < 0 ? isWater(x, y) : isBrook(y)) && distance(x, y, hand.x, hand.y) >= 58) {
    // A finger drawn through the water leaves a row of small rings.
    hand.x = x; hand.y = y
    ring(w, x, y, 0.5, false)
    emit(w, 'trickle', 0.84 + (x / 1180) * 0.34)
  } else if (hand?.on === 'sun') {
    w.show.sun = clamp(hand.y - y, 8, SUN.lift + 30)
    // Lifted: the morning starts, and the finger is let go of first.
    if (w.show.sun >= SUN.lift) {
      w.hand = null
      w.finger.down = false
      startMorning(w)
    }
  } else if (hand?.on === 'piece' && hand.pulled && MAKINGS[hand.piece.kind].part !== 'hull') {
    // Over the boat, the place the thing would go opens for it.
    const before = w.boat.offer
    const slot = w.frame < 0 && overBoat(w, x, y, true) ? placeFor(buildNow(w), hand.piece.kind as Kind, x - boatShown(w).x) : null
    w.boat.offer = slot
    if (slot?.on === 'deck' && before?.on !== 'deck') w.boat.dipV += 26
  }
}

/** The finger let go: the drop is the child's. */
export function dragEnd(w: World): void {
  const hand = w.hand
  w.hand = null
  w.finger.down = false
  w.boat.offer = null
  // What is in the hand hangs a little behind the finger. It is let go where the finger is, which is where the child put it.
  if (hand?.on === 'piece' && hand.pulled) {
    hand.piece.x = w.finger.x
    hand.piece.y = w.finger.y - HOLD_LIFT
    if (w.frame >= 0) {
      // The brook has taken the boat and the view with it: there is no bank in the frame for the thing to lie on
      // and nobody there to be given it. It flies back, in a seen arc, to where it was picked up from.
      toItsFrame(w, hand.piece)
      hand.piece.back = true
      fly(hand.piece, FLY.toss, 80)
      mark(w, true)
    } else letGo(w, hand.piece)
  } else if (hand?.on === 'boat') {
    w.boat.x = w.finger.x + hand.dx
    w.boat.y = w.finger.y + hand.dy
    if (w.boat.mode === 'brook' && w.frame < 0 && w.boat.y >= shoreAt(w.boat.x) - 10) {
      // Lifted as the brook took it and let go over the bank: it is back on its stone, like any boat let go there.
      w.where = 'bank'
      w.journey = newJourney()
      w.boat.mode = 'held'
      dropBoat(w)
    } else if (w.boat.mode === 'brook') dropOnBrook(w, true)
    else dropBoat(w)
  }
}

/** Where a thing the folk had, or that came off the boat, is set down: where it lay before, or where a fresh bank has it. */
const backSpot = (w: World, piece: Piece): Spot => freeSpot(piece.place.on === 'bank' ? piece.place : LAID_OUT[piece.kind], piece.kind, piece, w.pieces)

/** Further than this from where it was let go, a thing does not slip to its resting place: it hops there in an arc that is seen. */
const SLIP = 30

/**
 * A thing let go on the near bank lies where it was put. Where that spot is taken (another making lies there,
 * or it is the flat stone, which is kept for the boat) it comes to rest on the nearest free place, and goes
 * there in a hop the child sees, not in a blink.
 */
function layDown(w: World, piece: Piece, want: Spot): void {
  const spot = freeSpot(want, piece.kind, piece, w.pieces)
  piece.place = { on: 'bank', ...spot }
  if (distance(piece.x, piece.y + HOLD_LIFT, spot.x, spot.y) > SLIP) fly(piece, FLY.toss, 70)
  else fly(piece, FLY.lie)
}

/** A making let go at the finger: the frog, the kingfisher, the gnome, the boat, the water or the bank takes it. */
function letGo(w: World, piece: Piece): void {
  const x = piece.x, y = piece.y + HOLD_LIFT
  const facts = MAKINGS[piece.kind]
  const s = w.stage
  let target: Target | null = null
  if (facts.part === 'hull') {
    if (x > STONE.left && x < STONE.right && y > 500 && y < 690) return takeStone(w, piece)
  } else if (distance(x, y, FROG.mouth.x + s.frog.dx, FROG.mouth.y + s.frog.dy) < FROG.reach * 0.8) target = 'frog'
  else if (distance(x, y, KINGFISHER.tap.x + s.bird.dx, KINGFISHER.tap.y + s.bird.dy) < KINGFISHER.tap.r + 16) target = 'bird'
  // On the gnome as drawn, his hat to its tip, as a tap finds him.
  else if (fromGnome(w, x, y) < GNOME_REACH) target = 'gnome'
  else if (overBoat(w, x, y, true)) {
    if (!takeAboard(w, piece, x)) tipOff(w, piece)
    return mark(w, true)
  }
  if (!target && y <= WATER.top + 8) {
    // Let go over the far bank or the sky, where nothing can lie: it flies back to where it came from.
    piece.back = true
    fly(piece, FLY.toss, 80)
    return mark(w, true)
  }
  if (!target && y < shoreAt(x) - 4) target = 'water'
  if (!target) {
    layDown(w, piece, { x, y })
    return mark(w, true)
  }
  const wy = clamp(y, WATER.top + 30, shoreAt(x) - 20)
  const drop = target === 'water' ? { x, y: wy } : { x, y }
  if (target === 'water') {
    const wash = [...WASHED].sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0]
    piece.place = { on: 'bank', ...freeSpot(wash, piece.kind, piece, w.pieces) }
    ring(w, x, wy, 0.4 + facts.weight * 0.12, false)
    piece.squash = 0.5
  } else piece.place = { on: 'bank', ...backSpot(w, piece) }
  const act = bankAct(facts.family, target)
  if (act) {
    startAct(w, act, piece, drop)
    if (facts.family === 'leaf' && target === 'water') piece.rider = 'fly'
    if (facts.family === 'cap' && target === 'water') piece.rider = 'beetle'
  } else {
    // A hull in the water: it floats, and washes ashore like everything else.
    piece.x = x; piece.y = wy
    piece.mode = 'float'
    emit(w, 'plop-hull', piece.kind === 'bark' ? 1 : 1.3)
  }
  mark(w, true)
}

/** Puts a making on the boat where the boat has a place for it. Returns false when it has none. */
function takeAboard(w: World, piece: Piece, x: number): boolean {
  // On its stone or afloat, the boat takes what is put on it: no build is refused.
  const others = w.pieces.filter((other) => other !== piece)
  const slot = placeFor(buildOf(others), piece.kind as Kind, x - boatShown(w).x)
  if (!slot) return false
  piece.place = placeOf(slot, others)
  fly(piece, FLY.seat)
  // The first thing pressed on is answered by the gnome climbing aboard, and by nothing else.
  if (w.gnomeAt === 'stone') piece.back = true
  if (slot.on === 'mast') emit(w, 'creak', piece.kind === 'stalk' ? 0.8 : piece.kind === 'stem' ? 1.25 : 1)
  else if (slot.on === 'sail' && piece.kind !== 'feather') emit(w, 'rustle', piece.kind === 'maple' ? 0.85 : 1.1)
  startAboard(w)
  return true
}

/** No room on the boat: the thing tips off the far side, knocks on the stone and comes to lie on the moss beside it. The knock is seen and heard when it lands there. */
function tipOff(w: World, piece: Piece): void {
  const at = boatShown(w), side = piece.x < at.x ? 1 : -1
  piece.place = { on: 'bank', ...freeSpot({ x: at.x + side * 40, y: 700 }, piece.kind, piece, w.pieces) }
  piece.knock = w.boat.mode === 'stone' ? { x: clamp(at.x + side * 190, STONE.left + 30, STONE.right - 30), y: STONE.edge + 34 } : { x: at.x + side * 120, y: at.y - 26 }
  fly(piece, FLY.toss * 0.6, 70)
  w.boat.leanV += 1.2 * side
}

/** A hull let go over the flat stone stands on it. One that stood there, bare or built, gives it its place and everything on it, and goes to lie on the bank. */
function takeStone(w: World, piece: Piece): void {
  const old = w.pieces.find((each) => each.place.on === 'hull')
  if (old && w.boat.mode !== 'stone') {
    // The boat is away from its stone, afloat in the eddy: the stone is kept for it. The hull hops, in sight, to the moss in front of the stone.
    layDown(w, piece, { x: piece.x, y: 700 })
    return mark(w, true)
  }
  if (old) {
    old.x = w.boat.x; old.y = w.boat.y - 20
    old.place = { on: 'bank', ...freeSpot(LAID_OUT[old.kind], old.kind, old, w.pieces.filter((each) => each !== piece)) }
    fly(old, FLY.toss, 70)
    emit(w, 'pop', 0.7)
  }
  piece.place = { on: 'hull' }
  w.boat.x = SEAT.x; w.boat.y = SEAT.y
  w.boat.at = 'stone'; w.boat.restX = SEAT.x
  if (old) w.boat.mode = 'stone'
  fly(piece, FLY.seat)
  mark(w, true)
}

/** The boat let go: over the water it drops in, anywhere else it goes back on the stone. */
function dropBoat(w: World): void {
  const boat = w.boat
  if (boat.y < shoreAt(boat.x) - 10) settleBoat(w, 'eddy', clamp(boat.x, EDDY_IN, EDDY.right))
  else settleBoat(w, 'stone', SEAT.x)
  mark(w, true)
}

export function settleBoat(w: World, at: 'stone' | 'eddy', x: number): void {
  const boat = w.boat
  boat.at = at
  boat.restX = x
  if (at === 'stone') {
    boat.mode = 'glide'
    boat.fromX = boat.x; boat.fromY = boat.y
    boat.glide = 0
    return
  }
  boat.x = x
  boat.vy = 0
  boat.mode = 'fall'
}
