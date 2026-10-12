import { extent, offTape, onFloor } from './floor'
import { decide, revShows, topUnder, waitFor, wake } from './going'
import { GRID, MOVERS, type Mover } from './habits'
import type { Point } from './input'
import { BOX_MOUTH, EDGE, FIELD, OUT_PLACE, RUG_TOP, SKIRTING, TAPE_WIDTH, TOY_SIZE, inBox, onBasket, onCat, onPlant, rollAt, type Kind, type Pose, type ToyId } from './layout'
import { PEGS, type PegId } from './save'
import { finishScene, roofOf } from './shoebox'
import { along, angleOf, isStub, lay, lengthOf, nearestOn, stripFrom, type Strip } from './tape'
import type { Town } from './town'
import { freePlace, grounded, layersOf, roomFrom } from './way'
import { LAND, TAPPED, boxRattle, creak, frond, hup, pat, peelOff, peelTick, pff, pickUp, pomf, prrp, rev, rip, rollPick, setDown, smallRip, stick, strain, ting, tock, tok, zip } from './voices'

// What a finger does. Whatever a touch starts, starts in the call that
// carries it. A touch taken away (a cancel) does nothing for the child: no
// strip is laid, no strip is peeled, and a toy in the hand is back where it
// was picked up.

/** A torn end lifted under the finger: not yet a peel, or a peel under way, `d` units of the strip already up. */
export type Grip = { strip: Strip; end: 0 | 1; at: Point; mode: 'lifted' | 'peel'; d: number; ticks: number }
/** A toy under the finger: tapped, and carried once the finger moves. */
export type Hold = { id: ToyId; from: Point; carried: boolean; /** Where the toy was from the finger when the finger landed: it is carried so, and never jumps under the finger. */ off: Point; /** Caught in the air on its way to take up a tape: if the touch is taken away, it takes that tape up where it would have landed. */ caught?: boolean }

/** How far a finger moves before a tap on a toy becomes carrying it. */
export const CARRY_AFTER = 14
/** How near a torn end a finger lands to lift it: 74 stage units across, which is 48 px or more on the narrowest surface the game is held to. */
export const END_REACH = TAPE_WIDTH * 0.6
/**
 * A strip shorter than three reaches of an end has no two ends a finger can tell apart: it is one thing. A finger
 * anywhere on it lifts it, and it comes off by a pull along it, either way, of its own length.
 */
export const isWhole = (strip: Strip): boolean => lengthOf(strip) < END_REACH * 3
/**
 * How far along a strip the finger must pull for the strip to come off: back from the end it lifted, the
 * strip's own length less the last tape-width under the finger; for a strip that is one thing, its whole
 * length from wherever the finger landed, and never less than a tape-width. A peel is always a pull that is seen.
 */
export const peelNeeds = (strip: Strip): number => (isWhole(strip) ? Math.max(TAPE_WIDTH, lengthOf(strip)) : Math.max(TAPE_WIDTH / 2, lengthOf(strip) - TAPE_WIDTH))
/** How much of a strip in the hand is up off the boards, from the end that was lifted. */
export function liftedOf(grip: Grip): number {
  const length = lengthOf(grip.strip)
  if (grip.mode !== 'peel') return Math.min(length, 24)
  return Math.min(length, isWhole(grip.strip) ? (length * grip.d) / peelNeeds(grip.strip) : grip.d + 14)
}
/** A finger just off a toy's edge is still on it. */
const TOUCH_MARGIN = 4
/** A pull within this of the line back along the strip peels it: cos of about 37 degrees. */
const PEEL_WITHIN = 0.8
/** Below this, left of the bare floor, lie the tissue paper and the sock. */
const SOFT_BELOW = 545
const isPeg = (id: ToyId): id is PegId => (PEGS as readonly string[]).includes(id)

/** The nearest place tape can be laid on this surface. */
function clampTo(town: Town, at: Point): Point {
  const f = town.field
  return { x: Math.min(f.x1 - EDGE, Math.max(f.x0 + EDGE, at.x)), y: Math.min(f.y1 - EDGE, Math.max(f.y0 + EDGE, at.y)) }
}
const onField = (town: Town, at: Point): boolean => at.x >= town.field.x0 && at.x <= town.field.x1 && at.y >= town.field.y0 && at.y <= town.field.y1

/**
 * Whether a finger is on a toy as it is drawn: its whole shape from above, a capsule along its heading, so that
 * the bus's nose, the train's eyes and the dog's snout are the toy as much as its middle is.
 */
export function onToy(pose: Pose, id: ToyId, at: Point): boolean {
  const size = TOY_SIZE[id], half = Math.max(0, (size.long - size.wide) / 2), cos = Math.cos(pose.a), sin = Math.sin(pose.a)
  const dx = at.x - pose.x, dy = at.y - pose.y, along = Math.max(-half, Math.min(half, dx * cos + dy * sin))
  return Math.hypot(dx - along * cos, dy - along * sin) <= size.wide / 2 + TOUCH_MARGIN
}

/**
 * The toy a finger meets: the one that is seen there. The toys are asked in the order the view paints them, top
 * first, so a tap on a car on a bridge gets the car, and whoever is under the bridge is met only where no toy is
 * seen on top of it: a finger on the road there lifts it out.
 */
export function toyAt(town: Town, at: Point): ToyId | null {
  if (!town.state.out) return null
  const layers = layersOf(town), order = [...layers.under, ...layers.floor, ...layers.riding, ...layers.aloft, ...layers.held]
  for (let i = order.length - 1; i >= 0; i--) if (onToy(town.poseOf(order[i]), order[i], at)) return order[i]
  return null
}

export function pressTouch(town: Town, at: Point): void {
  // A touch on or round the jam's home control is not the game's: it ends nothing, wakes nothing and answers nothing.
  if (town.onHome(at)) return
  // A touch ends a scene that is playing, and is then an ordinary touch.
  finishScene(town)
  town.touchedAt = town.time
  town.finger = at
  wake(town)
  const roll = rollAt(at)
  if (roll >= 0) {
    town.state.roll = roll as Kind
    town.rollPickedAt = town.time
    town.rollTurns[roll]++
    town.say(rollPick(roll as Kind))
    town.mark('soon')
    return
  }
  if (!town.state.out && inBox(at)) return town.tipOut()
  const id = toyAt(town, at)
  if (id) {
    const body = town.bodies[id]
    body.tappedAt = town.time
    body.cue = 1
    // A tap gets the dog up again.
    if (id === 'dog') body.asides = 0
    body.met = {}
    body.hopped = {}
    body.jamAt = null
    // And whoever tooted at it where it stands may toot at it there again.
    for (const mover of MOVERS) delete town.bodies[mover].met[id]
    town.say(TAPPED[id][0])
    // It stops where it is on this frame, and is carried from where it is.
    const pose = town.poseOf(id)
    town.hold = { id, from: at, carried: false, off: { x: pose.x - at.x, y: pose.y - at.y } }
    // Caught in the air it is in the hand at once, where it is: a hop does not hang under a finger, and nobody comes to stand where it would land.
    if (body.flight) { takeUp(town, town.hold); body.at = { x: pose.x, y: pose.y, a: pose.a } }
    return
  }
  if (town.state.out && inBox(at)) return town.callHome()
  if (onCat(at)) { town.catAt = town.time; town.say(prrp); return }
  if (onBasket(at)) { town.basketAt = town.time; town.say(pomf); return }
  if (onPlant(at)) { town.plantAt = town.time; town.say(frond); return }
  if (onField(town, at)) {
    // A torn end under the finger lifts in this frame. One finger lifts one end: the nearer.
    const flat = town.flat
    for (let i = flat.length - 1; i >= 0; i--) {
      const strip = flat[i], toA = Math.hypot(at.x - strip.ax, at.y - strip.ay), toB = Math.hypot(at.x - strip.bx, at.y - strip.by)
      // A strip too short to have two ends is lifted by a finger anywhere on it.
      if (isWhole(strip) ? nearestOn(strip, at).off > END_REACH : Math.min(toA, toB) > END_REACH) continue
      town.grip = { strip, end: toA <= toB ? 0 : 1, at, mode: 'lifted', d: 0, ticks: 0 }
      town.say(creak)
      return
    }
    // The free end is stuck down under the finger, and the roll is in the hand.
    town.pull = { kind: town.state.roll, ax: at.x, ay: at.y, bx: at.x, by: at.y, ticks: 0, speed: 0, moved: 0, revAt: -Infinity }
    town.say(stick)
    return
  }
  // Anything else in the room answers as itself: the rug with a puff of fluff, the wall and the boards with a knock.
  // The lid is hollow card, the tissue paper and the sock are soft, and the enamel tray rings.
  const soft = at.y >= RUG_TOP || (at.x < FIELD.x0 && at.y >= SOFT_BELOW)
  town.puff(soft ? 'dust' : 'knock', at.x, at.y)
  town.say(soft ? pff : at.y <= SKIRTING || at.x < FIELD.x0 ? tok : at.x > FIELD.x1 ? ting : tock)
}

/**
 * Up it comes: whatever it was doing, it is in the hand now. Caught in the air, it was already where it was going,
 * and that is where it goes back to if the touch is taken away.
 */
function takeUp(town: Town, hold: Hold): void {
  const body = town.bodies[hold.id]
  const from = body.flight ? body.at : town.poseOf(hold.id)
  hold.caught = body.flight?.then === 'decide'
  hold.carried = true
  body.flight = null
  body.hidden = false
  body.offFor = null
  body.rounds = 0
  body.asides = 0
  body.onto = body.calledTo = null
  body.wayFor = Infinity
  body.lookIn = 0
  body.roundAt = -Infinity
  body.doing = { is: 'held', before: body.doing, from: { x: from.x, y: from.y, a: from.a } }
  town.say(pickUp)
}

export function moveTouch(town: Town, at: Point): void {
  if (!town.finger) return
  town.finger = at
  const hold = town.hold
  if (hold) {
    const body = town.bodies[hold.id]
    if (!hold.carried && Math.hypot(at.x - hold.from.x, at.y - hold.from.y) > CARRY_AFTER) takeUp(town, hold)
    if (hold.carried) body.at = { x: at.x + hold.off.x, y: at.y + hold.off.y, a: body.at.a }
    return
  }
  const grip = town.grip
  if (grip) {
    const strip = grip.strip, length = lengthOf(strip) || 1, whole = isWhole(strip)
    let sign = grip.end === 0 ? 1 : -1, ux = ((strip.bx - strip.ax) / length) * sign, uy = ((strip.by - strip.ay) / length) * sign
    if (grip.mode === 'lifted') {
      const dx = at.x - grip.at.x, dy = at.y - grip.at.y, far = Math.hypot(dx, dy)
      if (far < TAPE_WIDTH / 2) return
      // A strip that is one thing comes up from whichever end the finger pulls away from.
      if (whole && dx * ux + dy * uy < 0) { grip.end = grip.end === 0 ? 1 : 0; sign = -sign; ux = -ux; uy = -uy }
      if ((dx * ux + dy * uy) / far >= PEEL_WITHIN) grip.mode = 'peel'
      else {
        // Pulled any other way, the end drops back and a new strip is laid from there like any other.
        town.grip = null
        town.say(pat)
        const from = clampTo(town, grip.at)
        town.pull = { kind: town.state.roll, ax: from.x, ay: from.y, bx: from.x, by: from.y, ticks: 0, speed: 0, moved: 0, revAt: -Infinity }
      }
    }
    if (grip.mode === 'peel') {
      // How far the finger has pulled: back from the end it lifted, or, for a strip that is one thing, from where it landed.
      const tip = whole ? grip.at : grip.end === 0 ? { x: strip.ax, y: strip.ay } : { x: strip.bx, y: strip.by }
      grip.d = Math.max(0, Math.min(Math.max(length, peelNeeds(strip)), (at.x - tip.x) * ux + (at.y - tip.y) * uy))
      const ticks = Math.floor(grip.d / (TAPE_WIDTH / 2))
      // The long rip, a tick for each half tape-width that comes up.
      if (ticks > grip.ticks) { grip.ticks = ticks; town.say(peelTick(Math.max(0, 1 - grip.d / length))) }
      return
    }
  }
  const pull = town.pull
  if (!pull) return
  const to = clampTo(town, at)
  pull.moved += Math.hypot(to.x - pull.bx, to.y - pull.by)
  pull.bx = to.x
  pull.by = to.y
  // One tick of the zip for each half tape-width that has come off. Tape that goes back onto the roll goes quietly.
  const ticks = Math.floor(Math.hypot(pull.bx - pull.ax, pull.by - pull.ay) / (TAPE_WIDTH / 2))
  if (ticks > pull.ticks) {
    town.say(zip(pull.speed))
    // The car revs at a grey strip as it is pulled.
    // No sound without sight: only where the rev shows on it.
    if (pull.ticks === 0 && pull.kind === 0 && pull.revAt === -Infinity && revShows(town)) { pull.revAt = town.time; town.say(rev) }
  }
  pull.ticks = ticks
}

export function liftTouch(town: Town): void {
  if (!town.finger) return
  town.finger = null
  const hold = town.hold, grip = town.grip
  town.hold = town.grip = null
  if (hold) { if (hold.carried) putDown(town, hold.id); return }
  if (grip?.mode === 'peel' && grip.d < peelNeeds(grip.strip)) {
    // Let go before it was off: what had come up lies down again with a pat, and the strip is as it was.
    town.say(pat)
    town.layer++
    return
  }
  if (grip?.mode === 'peel') {
    // Pulled off over its own length, it is gone when the finger lifts. Whoever stood on it stands where it stood.
    town.state.strips = town.state.strips.filter((strip) => strip !== grip.strip)
    town.say(peelOff)
    town.ripAt = town.time
    town.stripsChanged()
    town.mark('now')
    return
  }
  if (grip) {
    // Lifted with no pull: the end drops back with a pat, and a stub is laid there like any other.
    town.say(pat)
    const from = clampTo(town, grip.at)
    town.pull = { kind: town.state.roll, ax: from.x, ay: from.y, bx: from.x, by: from.y, ticks: 0, speed: 0, moved: 0, revAt: -Infinity }
  }
  const pull = town.pull
  if (!pull) return
  town.pull = null
  const strip = stripFrom(pull.kind, clampTo(town, { x: pull.ax, y: pull.ay }), clampTo(town, { x: pull.bx, y: pull.by }), (town.rng.next() - 0.5) * 0.7)
  const top = town.field.y0 + EDGE
  if (strip.ay < top || strip.by < top) { const down = top - Math.min(strip.ay, strip.by); strip.ay += down; strip.by += down }
  const laid = lay(town.state.strips, strip)
  town.state.strips = laid.strips
  if (laid.lifted) {
    // The floor is full: the oldest strip lifts by itself with its own small rip, and is seen going.
    const gone = laid.lifted
    town.pressings = town.pressings.filter((pressing) => pressing.strip !== gone)
    town.lifting.push({ strip: gone, t: 0 })
    town.say(smallRip)
    town.stripsChanged()
  }
  const length = lengthOf(strip)
  town.pressings.push({ strip, t: 0, lasts: 0.14 + Math.min(0.3, length / 2200) })
  town.say(rip(length))
  town.rollFrom = { x: pull.bx, y: pull.by }
  town.rollBackAt = town.time
  town.ripAt = town.time
  town.layer++
  town.mark('soon')
  // A strip pulled across a standing toy sticks it to the floor for a moment.
  let stuck = false
  if (town.state.out) for (const id of MOVERS) {
    const body = town.bodies[id]
    if (body.flight || body.doing.is !== 'stand' || offTape(strip, body.at, TOY_SIZE[id]) > -10) continue
    body.doing = { is: 'stuck', t: 0, strip }
    stuck = true
  }
  if (stuck) town.say(strain)
}

/**
 * A toy the child sets on a tape it travels is set along that tape, facing the way it was nearest to facing,
 * at the nearest place on it where nobody stands. Null where it does not travel, or where the tape is full.
 */
function alongItsTape(town: Town, id: ToyId, want: Pose): Pose | null {
  if (!(id in GRID)) return null
  const flat = town.flat, under = topUnder(town, id, flat, want)
  if (under < 0) return null
  const strip = flat[under], size = TOY_SIZE[id]
  if (isStub(strip) || !('ride' in GRID[id as Mover][strip.kind])) return null
  const length = lengthOf(strip), half = Math.min(size.long / 2, length / 2), d = nearestOn(strip, want).d, a = angleOf(strip)
  const turned = Math.cos(want.a - a) >= 0 ? a : a + Math.PI
  const others = grounded(town, id)
  for (let step = 0; step <= 8; step++) for (const side of step ? [1, -1] : [1]) {
    const at = along(strip, Math.min(length - half, Math.max(half, d + side * step * 20))), pose = { x: at.x, y: at.y, a: turned }
    if (onFloor(town.field, pose, size) && others.every((other) => roomFrom(town, pose, size, other) >= 6)) return pose
  }
  return null
}

/** A toy set down by the child: where the finger left it, on the floor, and at once it does what it does there. */
function putDown(town: Town, id: ToyId): void {
  const state = town.state, body = town.bodies[id], at = body.at
  body.landedAt = town.time
  town.mark('now')
  if (inBox(at)) {
    // Into the tipped box: it rolls straight out again with a rattle.
    if (isPeg(id)) state.riding[id] = false
    body.at = state.toys[id] = freePlace(town, id, { x: BOX_MOUTH.x + 150, y: BOX_MOUTH.y, a: 0.1 }, 900, 0) ?? { ...OUT_PLACE[id] }
    body.doing = { is: 'stand', as: 'plain', since: town.time }
    body.flight = { from: { x: BOX_MOUTH.x - 30, y: BOX_MOUTH.y, a: -1 }, wait: 0, t: 0, lasts: 0.45, started: true, scene: false, loud: true, off: boxRattle, land: LAND[id], then: 'decide' }
    town.say(boxRattle)
    town.boxAt = town.time
    return
  }
  const bus = town.poseOf('bus')
  if (isPeg(id) && town.bodies.bus.doing.is !== 'held' && onToy(bus, 'bus', at)) {
    // A peg set on the bus rides it.
    state.riding[id] = true
    body.doing = { is: 'stand', as: 'plain', since: town.time }
    body.at = state.toys[id] = roofOf(town, id)
    town.say(hup)
    return
  }
  if (isPeg(id)) { state.riding[id] = false; town.served.delete(id) }
  const { across, down } = extent(at, TOY_SIZE[id]), f = town.field
  const want = { x: Math.min(f.x1 - across, Math.max(f.x0 + across, at.x)), y: Math.min(f.y1 - down, Math.max(f.y0 + down, at.y)), a: at.a }
  // On whatever tape the child chose, and beside any toy that was already there.
  body.at = state.toys[id] = alongItsTape(town, id, want) ?? freePlace(town, id, want, 400, 0, undefined, false) ?? want
  body.doing = { is: 'stand', as: 'plain', since: town.time }
  town.say(setDown)
  decide(town, id, true)
  // A train set on a rail that is full stands beside it, and hops on as soon as there is room.
  if (id === 'train') {
    const flat = town.flat, under = topUnder(town, id, flat, want)
    if (under >= 0 && flat[under].kind === 3 && topUnder(town, id, flat, body.at) < 0) waitFor(town, flat[under])
  }
}

/** The touch was taken away, which is not the child letting go: nothing is laid, peeled or set down. */
export function cancelTouch(town: Town): void {
  town.finger = null
  const hold = town.hold
  town.hold = town.grip = null
  if (hold?.carried) {
    const body = town.bodies[hold.id], doing = body.doing
    if (doing.is === 'held') { body.at = { ...doing.from }; body.doing = doing.before }
    // Caught in the air on its way onto a tape, it is where it was going, and takes that tape up as a load would have it, in silence.
    if (hold.caught && town.state.out) decide(town, hold.id, false)
  }
  if (!town.pull) return
  town.rollFrom = { x: town.pull.bx, y: town.pull.by }
  town.pull = null
  town.rollBackAt = town.time
}
