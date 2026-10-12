import { BALL, ICICLE, ICICLE_W, freeSpot, restOf, restOnBank, widthOf, type Rest } from './blocks'
import { POKED } from './cast'
import { BLOCK_H, BOUGH, MAX_LEN, MIN_LEN, SAW_KEEP, SCOOPS, SUN, SUN_PULL, awayFromBar, awayFromHole, cutReach, freeIce, holeOf, iceAt, nearestInHole, onDrift, onPond, sawable, type Point } from './ground'
import { MOST_BLOCKS, MOST_HOLES } from './limits'
import type { LiveHole, Toy } from './toy'
import { wallChanged, whoAt } from './toyDay'
import { dusk, morning } from './toyScenes'
import { TOUCH_PAD, bars, dart, knock, lying, openHoles, pickUp, pieceAt, react, setDown, wall } from './toyPieces'

// What a finger does. Every touch is answered in the call that brings it.
// Two endings are not the child's doing and make no move: a press that is
// taken away, and a drag that is cancelled.

/** How far the finger goes before the cut's direction is settled. Until then the scratch points at the finger. */
export const AIM_AFTER = 28
/** One grain of scraping for each stretch of line this long, and one shuffle of snow for each stretch of scoop. */
export const SCRAPE_EVERY = 24
export const SHUFFLE_EVERY = 30
/** How near the sun's middle a finger takes hold of it. */
const SUN_HOLD = 78

const full = (toy: Toy): boolean => toy.pieces.length >= MOST_BLOCKS

/** The finger lands. Everything it can land on answers here, in this call. */
export function press(toy: Toy, at: Point): void {
  toy.finger = at
  toy.lastCut = null
  const who = whoAt(toy, at)
  const piece = pieceAt(toy, at)
  // At night the seated king is over his seat: a touch on him is never taken for the block under him. Behind the wall he is behind it, and the wall is touched first. The hat on his head is on him, and is touched first too.
  if (who === 'king' && toy.night && !toy.king.behind && piece?.mode !== 'hat') return react(toy, 'king', POKED.king)
  if (piece) {
    knock(toy, piece, at)
    toy.hand = { piece, dx: piece.x - at.x, dy: piece.y - at.y, moved: false, held: 0 }
    return
  }
  if (Math.hypot(at.x - SUN.x, at.y - toy.sunY) <= SUN_HOLD && (!toy.night || at.y < toy.sunY + 4)) {
    react(toy, 'sun', POKED.sun)
    toy.sunHand = { dy: toy.sunY - at.y }
    return
  }
  const icicle = icicleAt(toy, at)
  if (icicle >= 0) {
    const root = BOUGH[icicle]
    if (full(toy)) {
      // The clearing gives no more: it only drips.
      toy.say({ name: 'drip', lively: 1 })
      toy.show({ type: 'drips', x: root.x, y: root.y + ICICLE, many: 2 })
      return
    }
    // It comes away where it is pressed. Until it is set somewhere, the save has it standing on what is under the bough.
    toy.icicles.push(icicle)
    toy.iciclesShown.push(icicle)
    const taken = toy.newPiece('icicle', ICICLE, root.x, root.y + ICICLE / 2, 'built')
    const under = restOnBank(ICICLE_W, root.x, root.y, wall(toy, taken))
    taken.rest = under ? { x: under.x, y: under.y, place: 'built' } : { ...freeSpot(ICICLE_W, root.x, 560, lying(toy, taken), openHoles(toy)), place: 'lying' }
    taken.wobbleV += 20
    toy.say({ name: 'snap' })
    toy.show({ type: 'chips', x: root.x, y: root.y, angle: Math.PI / 2, many: 3 })
    toy.hand = { piece: taken, dx: taken.x - at.x, dy: taken.y - at.y, moved: false, held: 0 }
    toy.mark('now')
    return
  }
  if (who) return react(toy, who, POKED[who])
  if (onDrift(at.x, at.y)) {
    toy.say({ name: 'puff', lively: toy.chance.next() })
    toy.show({ type: 'puff', x: at.x, y: at.y })
    // A used-up drift, or a full clearing, gives a puff of snow and no more.
    if (toy.drift < SCOOPS && !full(toy)) toy.scoop = { at, len: 0, shuffled: 0 }
    return
  }
  if (onPond(at.x, at.y)) {
    // Open water is touched a little outside its edge too, so a short hole is a fair target.
    const holes = openHoles(toy)
    const water = nearest(holes, (hole) => awayFromHole(hole, at.x, at.y), TOUCH_PAD)
    if (water) {
      const wet = nearestInHole(water, at.x, at.y)
      toy.say({ name: 'plip', lively: toy.chance.next() })
      toy.show({ type: 'ripple', x: wet.x, y: wet.y })
      return
    }
    dart(toy)
    if (freeIce(at.x, at.y, holes, bars(toy))) {
      // The saw bites: the start of a line.
      toy.cut = { from: at, angle: 0, aimed: false, len: 0, stopped: false, scraped: 0 }
      react(toy, 'peeper', 'look')
      toy.say({ name: 'bite' })
      toy.show({ type: 'chips', x: at.x, y: at.y, angle: -Math.PI / 2, many: 5 })
      return
    }
    // No line can start here, and the answer shows what is in the way: the block the saw knocks against rocks,
    // the water the ice is too thin beside ripples, and the pond's snowed-over rim gives a puff of snow.
    const block = nearest(toy.pieces.filter((p) => p.mode === 'rest' && p.rest.place === 'lying'), (p) => awayFromBar(p.x, p.y, widthOf(p), at.x, at.y), SAW_KEEP)
    const thin = nearest(holes, (hole) => awayFromHole(hole, at.x, at.y), SAW_KEEP)
    if (block) {
      block.wobbleV += 14
      toy.say({ name: 'clonk' })
      toy.show({ type: 'chips', x: at.x, y: at.y, angle: Math.atan2(at.y - block.y, at.x - block.x), many: 3 })
    } else if (thin) {
      const wet = nearestInHole(thin, at.x, at.y)
      toy.say({ name: 'plip', lively: toy.chance.next() })
      toy.show({ type: 'ripple', x: wet.x, y: wet.y })
    } else if (!sawable(at.x, at.y)) {
      toy.say({ name: 'puff', lively: toy.chance.next() })
      toy.show({ type: 'puff', x: at.x, y: at.y })
    } else {
      toy.say({ name: 'bite' })
      toy.show({ type: 'chips', x: at.x, y: at.y, angle: -Math.PI / 2, many: 5 })
    }
    return
  }
  if (at.y > 236) {
    toy.say({ name: 'puff', lively: toy.chance.next() })
    toy.show({ type: 'puff', x: at.x, y: at.y })
    return
  }
  toy.say({ name: 'flake', lively: toy.chance.next() })
  toy.show({ type: 'flakes', x: at.x, y: at.y })
}

/** The nearest of `things` by `away`, when it is no further than `within`. */
function nearest<T>(things: readonly T[], away: (thing: T) => number, within: number): T | null {
  let found: T | null = null, best = within
  for (const thing of things) {
    const d = away(thing)
    if (d <= best) (found = thing), (best = d)
  }
  return found
}

/** How far to each side of its root, and how far above and below its length, an icicle on the bough is touched. */
export const ICICLE_REACH = { x: 35, y: 13 } as const

/** The icicle on the bough under the finger: the nearest one still hanging, in a touch shape wider than it is drawn. */
export function icicleAt(toy: Toy, at: Point): number {
  let found = -1, best: number = ICICLE_REACH.x
  BOUGH.forEach((root, index) => {
    if (toy.icicles.includes(index) || at.y < root.y - ICICLE_REACH.y || at.y > root.y + ICICLE + ICICLE_REACH.y) return
    const away = Math.abs(at.x - root.x)
    if (away <= best) (found = index), (best = away)
  })
  return found
}

/** The finger moves, already past the slop of a tap. */
export function drag(toy: Toy, at: Point): void {
  toy.finger = at
  const hand = toy.hand
  if (hand) {
    if (!hand.moved) pickUp(toy, hand.piece)
    hand.moved = true
    hand.piece.x = at.x + hand.dx
    hand.piece.y = at.y + hand.dy
    return
  }
  if (toy.sunHand) {
    toy.sunY = Math.max(SUN.day - 24, Math.min(SUN.night + 24, at.y + toy.sunHand.dy))
    toy.sunV = 0
    return
  }
  const scoop = toy.scoop
  if (scoop) {
    scoop.len += Math.hypot(at.x - scoop.at.x, at.y - scoop.at.y)
    scoop.at = at
    while (scoop.len - scoop.shuffled >= SHUFFLE_EVERY) {
      scoop.shuffled += SHUFFLE_EVERY
      toy.say({ name: 'shuffle', lively: Math.min(1, scoop.len / MAX_LEN) })
      toy.show({ type: 'flakes', x: at.x, y: at.y })
    }
    return
  }
  // A finger that skipped and came straight back carries its line on: the block that cracked out goes back in.
  const last = toy.lastCut
  if (!toy.cut && last) {
    toy.lastCut = null
    if (last.piece) toy.pieces.splice(toy.pieces.indexOf(last.piece), 1)
    if (last.hole) toy.holes.splice(toy.holes.indexOf(last.hole), 1)
    toy.cut = last.cut
    toy.mark('now')
  }
  const cut = toy.cut
  if (!cut) return
  const dx = at.x - cut.from.x, dy = at.y - cut.from.y
  if (!cut.aimed) {
    if (Math.hypot(dx, dy) < AIM_AFTER) return
    cut.angle = Math.atan2(dy, dx)
    cut.aimed = true
  }
  if (cut.stopped) return
  const asked = dx * Math.cos(cut.angle) + dy * Math.sin(cut.angle)
  if (asked <= cut.len) return
  const reach = cutReach(cut.from, cut.angle, asked, openHoles(toy), bars(toy))
  const grew = reach.len - cut.len
  cut.len = reach.len
  while (cut.len - cut.scraped >= SCRAPE_EVERY) {
    cut.scraped += SCRAPE_EVERY
    toy.say({ name: 'scrape', lively: Math.min(1, grew / 40) })
    toy.show({ type: 'chips', x: cut.from.x + Math.cos(cut.angle) * cut.scraped, y: cut.from.y + Math.sin(cut.angle) * cut.scraped, angle: cut.angle + Math.PI, many: 2 })
  }
  if (reach.stopped) {
    cut.stopped = true
    toy.say({ name: 'clonk' })
  }
}

/** The line gives its block, in this call. A line too short for one, or a clearing that holds all it can, gives chips and a squeak. */
function crackOut(toy: Toy): void {
  const cut = toy.cut
  toy.cut = null
  if (!cut) return
  if (cut.len < MIN_LEN || full(toy) || openHoles(toy).length >= MOST_HOLES) {
    const to = { x: cut.from.x + Math.cos(cut.angle) * cut.len, y: cut.from.y + Math.sin(cut.angle) * cut.len }
    if (cut.len > 0) {
      toy.say({ name: 'squeak' })
      toy.show({ type: 'scratch', from: cut.from, to })
      toy.show({ type: 'chips', x: to.x, y: to.y, angle: cut.angle + Math.PI, many: 8 })
    } else {
      // A stroke too short to set a direction is a very short line all the same: the tooth's nick, chips and a squeak. No finger's move goes unanswered.
      nick(toy, cut.from)
      toy.say({ name: 'squeak' })
      toy.show({ type: 'chips', x: cut.from.x, y: cut.from.y, angle: -Math.PI / 2, many: 8 })
    }
    toy.lastCut = { cut, piece: null, hole: null }
    return
  }
  const hole: LiveHole = { ...holeOf(cut.from, cut.angle, cut.len), closing: 0, shut: false }
  toy.holes.push(hole)
  const kind = iceAt(hole.x, hole.y)
  const piece = toy.newPiece(kind, hole.len, hole.x, hole.y, 'lying')
  // It comes to lie beside its hole, and at night clear of the lamps' light, which it would cover.
  const spot = freeSpot(hole.len, hole.x, hole.y - BLOCK_H - 14, [...lying(toy, piece), ...lightBars(toy)], openHoles(toy))
  // Turned the short way to level.
  let turn = hole.angle
  while (turn > Math.PI / 2) turn -= Math.PI
  while (turn < -Math.PI / 2) turn += Math.PI
  Object.assign(piece, { mode: 'hop', age: 0, turn, from: { x: hole.x, y: hole.y, turn }, rest: { x: spot.x, y: spot.y, place: 'lying' }, on: onPond(spot.x, spot.y) ? 'ice' : 'snow' })
  toy.say({ name: 'crack' })
  toy.show({ type: 'chips', x: hole.x, y: hole.y, angle: -Math.PI / 2, many: 14 })
  react(toy, 'king', 'brows')
  react(toy, 'bird', 'hop')
  dart(toy)
  toy.lastCut = { cut, piece, hole }
  toy.mark('now')
}

/** Where the lamps' light lies on the ground at night, as things a freshly cut block keeps clear of. */
export function lightBars(toy: Toy): Rest[] {
  if (!toy.night) return []
  return toy.nightNow.patches.map((patch) => restOf('clear', patch.x1 - patch.x0, (patch.x0 + patch.x1) / 2, (patch.y0 + patch.y1) / 2, 'lying'))
}

/** The finger lifts mid-drag. A line cracks out now; the tracker says later whether the drag is over. */
export function lift(toy: Toy): void {
  toy.finger = null
  if (toy.cut) crackOut(toy)
}

/** The drag is over and the child let go: a carried thing is set down, a scoop is packed, the sun goes where it was let go, and a line can no longer be carried on. */
export function drop(toy: Toy): void {
  toy.finger = null
  if (toy.cut) crackOut(toy)
  toy.lastCut = null
  const hand = toy.hand
  toy.hand = null
  if (hand) {
    if (hand.moved) setDown(toy, hand.piece)
    return
  }
  const scoop = toy.scoop
  toy.scoop = null
  if (scoop) {
    // A short scoop packs into a snowball, a long one into a snow block of the scoop's length.
    const long = scoop.len >= MIN_LEN
    const packed = toy.newPiece(long ? 'snow' : 'ball', long ? Math.min(MAX_LEN, Math.round(scoop.len)) : BALL, scoop.at.x, scoop.at.y, 'lying')
    toy.drift += 1
    toy.driftShown = toy.drift
    toy.say({ name: 'pack' })
    setDown(toy, packed)
    return
  }
  if (toy.sunHand) {
    toy.sunHand = null
    if (!toy.night && toy.sunY > SUN_PULL.down) dusk(toy)
    else if (toy.night && toy.sunY < SUN_PULL.up) morning(toy)
  }
}

/** The nick of the saw's tooth, left where a line started and went nowhere. */
function nick(toy: Toy, at: Point): void {
  toy.show({ type: 'scratch', from: { x: at.x - 9, y: at.y + 4 }, to: { x: at.x + 10, y: at.y - 3 } })
}

/** The child's tap: a press and a lift with no move between. A tap on free ice leaves the nick of the saw's tooth for a moment, the start of a line that a moving finger would have carried on. */
export function tap(toy: Toy): void {
  const cut = toy.cut
  if (cut && cut.len === 0) nick(toy, cut.from)
  release(toy)
}

/** A press that ended without a drag. What the press started is let go. */
export function release(toy: Toy): void {
  toy.finger = null
  const hand = toy.hand
  toy.hand = null
  toy.cut = null
  toy.scoop = null
  toy.sunHand = null
  // An icicle that came away under the finger falls from the bough when the finger lets it go.
  if (hand && hand.piece.kind === 'icicle' && hand.piece.y < hand.piece.rest.y - BLOCK_H && hand.piece.mode === 'rest') setDown(toy, hand.piece)
}

/** The touch was taken away with the finger still down, which is no drop: a carried thing goes back where it came from, a line gives no block, a scoop gives nothing and the sun goes back. */
export function cancel(toy: Toy): void {
  toy.finger = null
  const hand = toy.hand
  toy.hand = null
  toy.cut = null
  toy.lastCut = null
  toy.scoop = null
  toy.sunHand = null
  if (!hand) return
  const piece = hand.piece
  if (!hand.moved && piece.mode !== 'rest') return
  if (piece.rest.place === 'built') {
    const rest = restOnBank(widthOf(piece), piece.rest.x, piece.rest.y, wall(toy, piece))
    if (rest) piece.rest = { x: rest.x, y: rest.y, place: 'built' }
  }
  Object.assign(piece, { mode: 'rest', age: 0, x: piece.rest.x, y: piece.rest.y, vy: 0, turn: 0, path: [] })
  wallChanged(toy)
}
