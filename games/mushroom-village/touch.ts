import { GATE_S, KNOCKED_S, RAFT_S, ROLL_S, RUN_REACH, RUN_STEP_S, SNEEZE_AT, SNEEZE_BACK_AFTER, backOnCart, beads, bloop, cartTouch, clack, comeOut, croak, doorIn, doorOff, doorOnDoor, doorOut, doorShuts, dropBack, full, gate, pathLoose, pathSits, shiftWeight, give, grumble, hatBack, hatBoing, hatFits, hatPop, hatStrain, hiccup, hopNote, hum, knock, loosen, knockEmpty, knockOnDoor, letGo, noMore, pat, peek, plop, poke, pokeGnome, raft, rattleCart, rollAway, rustle, seesawDown, seesawUp, setSwinging, shimmer, shuffle, slipBack, snapBack, sneezeBack, sneezeIndoors, softThump, splat, squashHat, startle, stepUnderDoor, stone, strain, stretch, sunBack, sunStrain, sunTouch, swell, ting, toffee, tighten, tremble, tuck, turnedOut, unpuff } from './answers'
import { FULL, MOST, STEP_S, TAP_S } from './config'
import { CART, POND, SEATS, SUN, SUN_DOWN_Y, atLog, footFor, inWater, onGnome, pebbleMay, stepOff, type GnomeId } from './ground'
import type { Point } from './input'
import { MOST_POINTS, countPoints, snapPoint, stepsBetween, wayRound } from './paths'
import { aWalk, cartComes, endScene, firstPebbles, morningComes, nightFalls, send, settleIn, stroll } from './scenes'
import { doorOf, doorstepped, onStage, shapeOf, stepAt } from './shapes'
import { clamp, settle, spring } from './spring'
import { hatStaysOut } from './tastes'
import { PUFF_NEAR, keyOf, type Hold, type Mushroom, type World } from './world'

// What a finger does in the glade. A press is answered in the call that
// brings it, and what the touch turns out to be (a tap, a hold, a pull, a
// stroke, a door carried off) follows from where the finger goes. Nothing a
// touch starts outlives it as a waiting flag: what is owed is read from the
// village itself when the finger lifts. A touch that is taken away (the game
// parked under it, the browser took the finger) does nothing in the child's
// name: what was in the hand goes back, and what was laid stays.

/** A foot nearer than this to another, as an ellipse, belongs to that mushroom: the finger is pressing it. */
export const ROOM = { x: 118, y: 52 } as const
/** A finger that strays this far from where it landed has stopped holding. */
export const DRIFT = 46
/**
 * A pull this long brings a mushroom loose, and a path let go from this high rolls away; a loose mushroom pulled
 * this much longer comes out in the hand.
 */
export const OUT = 56
export const OUT_AT_ONCE = 150
/**
 * Taking a mushroom out is a deliberate act and shows itself first. The cap follows a pulling finger at once, but
 * it comes loose only when the pull is past `OUT` and the touch has lasted longer than a tap: then the cap leans
 * over with a creak. Only a mushroom that has leaned for this long comes out when the finger lets go, or in the
 * hand; a finger that lifts earlier, or comes back down, leaves it standing. So a quick smear upward only
 * stretches it.
 */
export const LOOSE_S = 0.15
/** A loose mushroom that the finger brings back down by this much sits tight again. */
const TIGHT = 12
/** How far a loose cap leans over. */
const LEAN = 0.5
/** A finger that carries a door off has moved this far. */
const CARRY = 22
/** Once a pull has begun, the cap catches the finger up this many times as fast as the finger moves, so the stretch starts at nothing and never jumps. */
const CATCH_UP = 3
/** A pull strains once for each of these, in units. */
const NOTCH = 18
/**
 * Seconds between the squeaks of a full mushroom that is still held, the croaks of a frog, the grumbles of a gnome
 * and the hums of the sun. Before the first of each, a press that does not move is a tap for `TAP_S` (config.ts),
 * on everything: only after it does a mushroom that stood start to swell again, a gnome grumble, the sun hum, the
 * frog come up, a pebble count as held. What a finger that moves is doing (a pull, a door carried off, a stroke)
 * is decided by where it goes, never by how long it took.
 */
const TREMBLE_S = 0.45, CROAK_S = 0.55, GRUMBLE_S = 0.32, HUM_S = 0.5
/** How far the sun is pulled before it goes, down by day and up by night, and how far it travels between the two. */
export const SUN_PULL = { down: 60, up: 40 } as const
const SUN_WAY = SUN_DOWN_Y - SUN.y
/** The frog comes up no farther left than this in the pond: to the right of where the baker holds his bucket out. */
export const FROG_CLEAR = 846
/** A hat pulled this far up, and let go there, comes off; pulled this far, it comes off in the hand. */
export const HAT_OFF = 50
export const HAT_AT_ONCE = 110

/** A pebble this near a doorstep has reached the house. */
const ARRIVED = 34

const far = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)

/** The mushroom whose room a foot at this point would stand in. */
function crowding(w: World, x: number, y: number): Mushroom | null {
  let found: Mushroom | null = null, nearest = 1
  for (const m of w.mushrooms) {
    const d = ((m.x - x) / ROOM.x) ** 2 + ((m.y - y) / ROOM.y) ** 2
    if (d < nearest) { nearest = d; found = m }
  }
  return found
}

/** Whether a foot can stand at a point: on moss, out of the water, with room round it and the glade not full. */
export function hasRoom(w: World, x: number, y: number): boolean {
  const foot = footFor(x, y)
  return foot !== null && w.mushrooms.length < MOST && crowding(w, foot.x, foot.y) === null
}

// ---------------------------------------------------------------- the finger lands

/** A finger lands. Whatever is under it answers now, in this call. */
export function press(w: World, at: Point): void {
  release(w, false)
  // The touch ends the scene that is playing, and is then an ordinary touch. One touch does not: a finger on a
  // gnome who waits while another is on his way may be the tap that sends this one instead, so the move-in plays
  // on under it until the touch turns out to be something else.
  const first = w.hit(at.x, at.y)
  const instead = (w.scene?.running ?? false) && w.movingIn !== null && first.what === 'gnome' && first.who !== w.movingIn.who && w.homes[first.who] === null
  if (!instead) endScene(w)
  w.finger = at
  const hit = instead ? first : w.hit(at.x, at.y)
  switch (hit.what) {
    case 'gnome':
      // His hat and his body are two shapes: a touch that lands on the hat is the hat's to its end, and one that lands on his body is his.
      w.hold = { on: 'gnome', who: hit.who, hat: hit.hat, t: 0, count: 0, from: at, notch: 0, swap: instead }
      w.gnomes[hit.who].press.target = 0.55
      w.play(squashHat(hit.who), { gnome: hit.who })
      return
    case 'walker': {
      // On his way back to the log he is touched as himself: he stops under the finger, and the moss under him grows nothing.
      const walker = w.walkers.find((other) => other.who === hit.who)
      if (walker) walker.held = true
      w.hold = { on: 'walker', who: hit.who, t: 0, count: 0 }
      w.gnomes[hit.who].press.target = 0.55
      w.play(squashHat(hit.who), { gnome: hit.who })
      return
    }
    case 'sun':
      w.hold = { on: 'sun', t: 0, hums: 0, from: at, pulling: false, notch: 0 }
      w.play(sunTouch(), { sun: true })
      return
    case 'snail':
      w.hold = { on: 'nothing' }
      w.play(tuck(), { snail: true })
      return
    case 'cart':
      w.hold = { on: 'cart', from: at }
      w.play(cartTouch(), { cart: true })
      return
    case 'hat':
      w.hold = { on: 'nothing' }
      w.play(hatBoing(), { hat: true })
      return
    case 'door':
      return pressMushroom(w, hit.mushroom, at, true)
    case 'mushroom':
      return pressMushroom(w, hit.mushroom, at, false)
    case 'pebble': {
      const point = w.paths[hit.path][hit.index]
      w.hold = { on: 'pebble', path: hit.path, index: hit.index, t: 0, held: false, from: at, lifting: false, notch: 0, loose: false, looseFor: 0 }
      w.seesaw = { path: hit.path, index: hit.index, sink: 1, lift: 0, loose: false }
      w.play(seesawDown(), { pebble: point })
      return
    }
    case 'water':
      w.hold = { on: 'water', at, along: hit.along, t: 0, croaks: 0, notch: 0, drawn: false }
      w.play(bloop(hit.along), { at })
      return
    case 'log':
      w.hold = { on: 'ground', from: at }
      w.play(knock(), { everyGnome: true, at })
      return
    case 'leaves':
      w.hold = { on: 'ground', from: at }
      w.play(rustle(), { at })
      return
    case 'moss': {
      const foot = footFor(at.x, at.y)
      if (!foot) {
        w.hold = { on: 'ground', from: at }
        w.play(pat(), { at })
        return
      }
      w.dimple.x = foot.x
      w.dimple.y = foot.y
      w.dimple.depth.target = 1
      w.dimple.on = true
      const neighbour = crowding(w, foot.x, foot.y)
      if (neighbour) return pressMushroom(w, neighbour, at, false)
      if (w.mushrooms.length >= MOST) {
        // No room for one more: a cap peeks out, turns once and slips back.
        const cap = { what: 'peek' as const, x: foot.x, y: foot.y, age: 0, life: 0.8, phase: 'up', since: 0, kind: hit.kind }
        w.props.push(cap)
        w.hold = { on: 'ground', from: at }
        w.play(peek(), { prop: cap })
        return
      }
      // A button of a mushroom pops out with the first creak.
      const mushroom = w.grown({ id: w.nextId(), x: foot.x, y: foot.y, size: 1, door: false })
      settle(mushroom.seen, 0.2)
      mushroom.seen.target = 1
      w.mushrooms.push(mushroom)
      w.hold = { on: 'mushroom', id: mushroom.id, fresh: true, t: 0, age: 0, grew: true, steps: 0, from: at, pulling: false, loose: false, notch: 0, viaDoor: false }
      w.play(swell(mushroom.kind, 1), { mushroom: mushroom.id })
      watch(w, mushroom)
      w.touched('now')
    }
  }
}

function pressMushroom(w: World, mushroom: Mushroom, at: Point, viaDoor: boolean): void {
  w.hold = { on: 'mushroom', id: mushroom.id, fresh: false, t: 0, age: 0, grew: false, steps: 0, from: at, pulling: false, loose: false, notch: 0, viaDoor }
  // It gives under the finger at once; what the touch turns out to be (a poke, more swelling, a pull) follows.
  w.play(give(mushroom.size), { mushroom: mushroom.id })
  w.interest = { at: { x: mushroom.x, y: mushroom.y - 60 }, left: 2 }
}

// ---------------------------------------------------------------- the finger moves

/** The finger has moved off where it landed. */
export function drag(w: World, at: Point): void {
  w.finger = at
  const hold = w.hold
  if (!hold) return
  switch (hold.on) {
    case 'mushroom': {
      const mushroom = w.find(hold.id)
      if (!mushroom) return
      const up = hold.from.y - at.y, across = Math.abs(at.x - hold.from.x), gone = far(at, hold.from)
      // A mushroom that already stood is taken by its cap and stretched, however long the finger rested on it first:
      // the move decides. A finger that has swollen it a step may drift a finger's width and is still holding.
      // A finger that landed on the door never stretches the house: what it carries off is the door. On a house
      // too small for its door to be a finger high, the finger that goes up from the doorstep is on the house, and
      // stretches it: such a door comes off sideways or downwards, never by a pull up.
      // A finger that drifts a little while it holds is still holding, before the first step as after it: the pull
      // begins only past a finger's width, and the cap then catches the finger up within a few units.
      const byDoor = hold.viaDoor && mushroom.door && !doorstepped(mushroom.kind, mushroom.size)
      if (!hold.pulling && !hold.fresh && !byDoor && up > DRIFT && up > across * 1.1) {
        hold.pulling = true
        // A pulled thing does not finish the sound of an earlier tap.
        w.hush((on, tag) => on.mushroom === mushroom.id || tag === `of${mushroom.id}`)
      }
      if (hold.pulling) {
        mushroom.pull = clamp(Math.min(up, (up - DRIFT) * CATCH_UP), 0, OUT_AT_ONCE + 20)
        const notch = Math.min(8, Math.floor(mushroom.pull / NOTCH))
        if (notch > hold.notch) w.play(strain(mushroom.kind, notch), { mushroom: mushroom.id })
        // A puffball goes flat with one long parp, which is not started again by a finger that wavers.
        hold.notch = mushroom.kind === 'puff' ? Math.max(hold.notch, notch) : notch
        loosened(w, hold, mushroom)
        if (comesOut(w, hold) && mushroom.pull >= OUT_AT_ONCE) {
          w.hold = { on: 'nothing' }
          out(w, mushroom)
        }
        return
      }
      // A door is taken by the finger that landed on it and went off with it.
      if (hold.viaDoor && mushroom.door) {
        if (gone <= (hold.steps > 0 ? DRIFT : CARRY)) return
        // On a house too small for both, a finger going up from the doorstep is on its way to a pull, not off with the door.
        if (!byDoor && up > across * 1.1) return
        mushroom.doorSeen = false
        w.hush((on, tag) => on.mushroom === mushroom.id || tag === `of${mushroom.id}`)
        w.hold = { on: 'door', from: mushroom.id, at }
        w.doorInHand = at
        w.play(doorOut(), { mushroom: mushroom.id })
        return
      }
      if (gone <= DRIFT) return
      if (hold.fresh && mushroom.size < 3) {
        // A finger that ran off before the third step was drawing a path: the button slips back and the pebbles start where it landed.
        w.mushrooms = w.mushrooms.filter((other) => other !== mushroom)
        w.hush((on, tag) => on.mushroom === mushroom.id || tag === `of${mushroom.id}`)
        const cap = { what: 'slip' as const, x: mushroom.x, y: mushroom.y, age: 0, life: 0.35, phase: 'up', since: 0, kind: mushroom.kind }
        w.props.push(cap)
        w.play(slipBack(), { prop: cap })
        w.dimple.depth.target = 0
        w.touched('now')
        return startStroke(w, hold.from, at, null)
      }
      // A finger that ran off has stopped holding, and the mushroom stays as tall as it was.
      if (hold.fresh || hold.steps > 0) return release(w, true)
      w.dimple.depth.target = 0
      return startStroke(w, stepAt(mushroom), at, null)
    }
    case 'gnome': {
      const g = w.gnomes[hold.who], up = hold.from.y - at.y
      // A finger that moves on him is no tap that sends him: the move-in that played on under it ends, as under any other touch.
      if (hold.swap) { hold.swap = false; endScene(w) }
      if (hold.hat) {
        // The touch began on his hat, and wherever the finger goes it is the hat's: it stretches as far as the finger
        // has gone up, and it never lays a pebble, never sends him for a stroll and shows nobody the pebbles.
        g.press.target = 0
        g.hatPull = clamp(up, 0, HAT_AT_ONCE)
        const notch = Math.floor(g.hatPull / 14)
        if (notch > hold.notch) w.play(hatStrain(hold.who, notch), { gnome: hold.who })
        hold.notch = Math.max(hold.notch, notch)
        if (g.hatPull >= HAT_AT_ONCE) {
          // Pulled this far it comes off in the hand, with the cork's pop.
          g.hatPull = 0
          w.hold = { on: 'nothing' }
          w.play(hatPop(hold.who), { gnome: hold.who })
        }
        return
      }
      // The touch began on his body: a finger that leaves where it landed is drawing a path from him, whatever its
      // slope. Its first pebble lies at his feet, beside him where the moss shows.
      if (far(at, hold.from) > DRIFT) {
        g.press.target = 0
        startStroke(w, stepOff(hold.who), at, hold.who)
      }
      return
    }
    case 'walker':
      return
    case 'water': {
      const up = hold.at.y - at.y, across = Math.abs(at.x - hold.at.x)
      if (hold.drawn || (up > 12 && up > across)) {
        // A column of water is drawn up like toffee.
        hold.drawn = true
        if (w.frog) { w.frog.leaving = true; w.frog.up.target = 0 }
        const column = { x: hold.at.x, y: Math.min(hold.at.y, POND.y + 10), up: clamp(up, 0, 190) }
        w.column = column
        const notch = Math.min(8, Math.floor(column.up / 22))
        if (notch > hold.notch) w.play(toffee(notch), { at: { x: column.x, y: column.y - column.up } })
        hold.notch = notch
        return
      }
      if (far(at, hold.at) > DRIFT) {
        if (w.frog) { w.frog.leaving = true; w.frog.up.target = 0 }
        startStroke(w, hold.at, at, null)
      }
      return
    }
    case 'sun': {
      const way = w.night ? hold.from.y - at.y : at.y - hold.from.y, across = Math.abs(at.x - hold.from.x)
      if (!hold.pulling && !(way > 12 && way > across)) return
      hold.pulling = true
      w.sun.cheeks.target = 0
      w.sun.pull = clamp(way, 0, 110)
      const notch = Math.min(5, Math.floor(w.sun.pull / 20))
      if (notch > hold.notch) w.play(sunStrain(notch, !w.night), { sun: true })
      hold.notch = notch
      return
    }
    case 'pebble': {
      const seesaw = w.seesaw, path = w.paths[hold.path]
      if (!seesaw || !path) return
      const up = hold.from.y - at.y, across = Math.abs(at.x - hold.from.x)
      const last = hold.index === path.length - 1
      // Rolling a path away is as deliberate as taking a house out. Only a finger that has rested on a pebble for
      // longer than a tap lifts the path by it when it goes up; a finger that moves off a pebble sooner is drawing,
      // whichever way it goes. The last pebble laid is where a path goes on, held or not; a path of one pebble has
      // no other pebble to be lifted by, so it is lifted by that one, as any other path is by any other pebble.
      const mayLift = hold.held && (!last || path.length === 1)
      if (hold.lifting) {
        // A lift that runs on, far above the pebble or off to a side, was a drag: the path drops back and the
        // finger draws from that pebble.
        if (up > OUT_AT_ONCE || across > OUT) {
          w.seesaw = null
          w.play(dropBack(), { pebble: path[hold.index] })
          return strokeFromPebble(w, hold.path, hold.index, at)
        }
        seesaw.lift = clamp(up, 0, 170)
        const notch = Math.min(8, Math.floor(seesaw.lift / 16))
        if (notch > hold.notch) w.play(beads(notch), { pebble: path[hold.index] })
        hold.notch = notch
        pathLoosened(w, hold, path)
        return
      }
      if (mayLift && up > across) {
        if (up <= 12) return
        // The path lifts by that pebble like a string of beads.
        w.hush((_on, tag) => tag === 'run')
        hold.lifting = true
        seesaw.sink = 0
        seesaw.lift = clamp(up, 0, 170)
        pathLoosened(w, hold, path)
        return
      }
      if (last && far(at, hold.from) > CARRY / 2) {
        w.seesaw = null
        return strokeFromPebble(w, hold.path, hold.index, at)
      }
      if (far(at, hold.from) > DRIFT) {
        w.seesaw = null
        strokeFromPebble(w, hold.path, hold.index, at)
      }
      return
    }
    case 'cart':
      if (far(at, hold.from) <= CARRY) return
      w.hold = { on: 'door', from: 'cart', at }
      w.doorInHand = at
      w.play(doorOut(), { cart: true })
      return
    case 'door':
      hold.at = at
      w.doorInHand = at
      return
    case 'stroke':
      return lay(w, hold, at)
    case 'ground':
      if (far(at, hold.from) > DRIFT) startStroke(w, hold.from, at, null)
      return
    case 'nothing':
  }
}

// ---------------------------------------------------------------- a stroke of pebbles

type Stroke = Extract<Hold, { on: 'stroke' }>

function startStroke(w: World, from: Point, at: Point, gnome: GnomeId | null): void {
  const first = snapPoint(from)
  const stroke: Stroke = { on: 'stroke', path: -1, last: first, laid: first, blocked: false, gnome, arrived: [], met: [], walk: null }
  w.hold = stroke
  tryLay(w, stroke, first)
  if (w.hold === stroke) lay(w, stroke, at)
}

/** A stroke that starts on a pebble carries its path on from an end, or branches off it, which is a meeting. */
function strokeFromPebble(w: World, index: number, at: number, to: Point): void {
  const path = w.paths[index], point = path[at]
  const stroke: Stroke = { on: 'stroke', path: index, last: point, laid: point, blocked: false, gnome: null, arrived: [], met: [keyOf(point)], walk: null }
  if (at === 0 && path.length > 1) path.reverse()
  else if (at !== path.length - 1) {
    w.paths.push([{ ...point }])
    stroke.path = w.paths.length - 1
    w.play(shuffle(), { pebble: point })
    w.touched('small')
  }
  w.hold = stroke
  lay(w, stroke, to)
}

function lay(w: World, stroke: Stroke, at: Point): void {
  const to = snapPoint(at)
  for (const step of stepsBetween(stroke.last, to)) {
    stroke.last = step
    tryLay(w, stroke, step)
    // A pebble that made a house reachable ended the stroke.
    if (w.hold !== stroke) return
  }
}

/** The mushroom whose foot a pebble at this point would lie under. */
export function footAt(w: World, p: Point): Mushroom | undefined {
  return w.mushrooms.find((m) => Math.abs(p.x - m.x) < 30 && Math.abs(p.y - m.y) < 14)
}

function tryLay(w: World, stroke: Stroke, p: Point): void {
  if (!pebbleMay(p.x, p.y)) return
  // Pebbles never lie under a foot: the mushroom takes the path in its own way, and a stroke that goes on through
  // it comes out on the other side with its pebbles laid round the foot, so the path is whole and shows why.
  const stem = footAt(w, p)
  if (stem) {
    // A path that comes to a foot, from whichever side, ends at the doorstep: its last pebbles are laid round
    // the foot to it, so the step or the pile is drawn there and whoever can now reach the house comes.
    if (!stroke.blocked && !stroke.arrived.includes(stem.id)) {
      const free = (q: Point): boolean => pebbleMay(q.x, q.y) && !footAt(w, q)
      const step = doorstepPoint(w, stem)
      if (step) {
        stroke.blocked = true
        for (const round of [...wayRound(stroke.laid, step, free), step]) {
          place(w, stroke, round)
          if (w.hold !== stroke) return
        }
      }
    }
    stroke.blocked = true
    return arrive(w, stroke, stem)
  }
  if (stroke.blocked) {
    stroke.blocked = false
    for (const round of wayRound(stroke.laid, p, (q) => pebbleMay(q.x, q.y) && !footAt(w, q))) {
      place(w, stroke, round)
      if (w.hold !== stroke) return
    }
  }
  place(w, stroke, p)
}

/** The grid point a pebble can lie on that is nearest a mushroom's doorstep and counts as having reached it, or null when there is none. */
function doorstepPoint(w: World, m: Mushroom): Point | null {
  const step = stepAt(m), mid = snapPoint(step)
  let best: Point | null = null
  for (let dx = -40; dx <= 40; dx += 20) for (let dy = -20; dy <= 40; dy += 20) {
    const q = { x: mid.x + dx, y: mid.y + dy }
    if (far(q, step) > ARRIVED || !pebbleMay(q.x, q.y) || footAt(w, q)) continue
    if (!best || far(q, step) < far(best, step)) best = q
  }
  return best
}

function place(w: World, stroke: Stroke, p: Point): void {
  stroke.laid = p
  const key = keyOf(p), total = countPoints(w.paths)
  const there = lying(w, p)
  if (there && ((there.path === stroke.path && there.index >= w.paths[stroke.path].length - 3) || stroke.met.includes(key))) return
  if (total >= MOST_POINTS) {
    // No more can be laid: one hops up under the finger and drops back, so the finger is still answered.
    if (w.since.full < 0.5) return
    w.since.full = 0
    const loose = { what: 'loose' as const, x: p.x, y: p.y, age: 0, life: 0.5, phase: 'up', since: 0 }
    w.props.push(loose)
    w.play(noMore(), { prop: loose })
    return
  }
  if (stroke.path < 0) { w.paths.push([]); stroke.path = w.paths.length - 1 }
  w.paths[stroke.path].push({ x: p.x, y: p.y })
  if (!w.shown.includes('pebbles')) w.shown.push('pebbles')
  w.touched('small')
  if (there) {
    // Where two paths meet, the pebbles shuffle round into a small ring.
    stroke.met.push(key)
    w.play(shuffle(), { pebble: p })
  } else {
    const bell = w.mushrooms.filter((m) => m.kind === 'bell' && far(m, p) <= 160).sort((a, b) => far(a, p) - far(b, p))[0]
    const puff = w.mushrooms.find((m) => m.kind === 'puff' && far(stepAt(m), p) <= 44)
    if (inWater(p.x, p.y)) w.play(stone(), { pebble: p })
    else if (puff) { w.stirs.push({ x: p.x, y: p.y, move: 'land', age: 0 }); w.play(softThump(), { mushroom: puff.id }); stroke.arrived.push(puff.id) }
    else if (bell) { w.stirs.push({ x: p.x, y: p.y, move: 'land', age: 0 }); w.play(ting(bell.size, 1 - far(bell, p) / 160), { mushroom: bell.id }) }
    else w.play(clack(p.x, p.y), { pebble: p })
  }
  for (const m of w.mushrooms) if (!stroke.arrived.includes(m.id) && far(stepAt(m), p) <= ARRIVED) arrive(w, stroke, m)
  // A path drawn onto a gnome who waits.
  if (!stroke.gnome && atLog(p.x, p.y)) stroke.gnome = w.waiting().find((who) => w.gnomes[who].where === 'log' && (onGnome(who, p.x, p.y) || Math.abs(p.x - SEATS[who].x) <= 40)) ?? null
  // The pebble that joins a path to a door ends the stroke and starts the move.
  if (settleIn(w)) {
    w.hold = { on: 'nothing' }
    w.touched('now')
  }
}

/** The pebble that already lies at a grid point: the last one laid there. */
function lying(w: World, p: Point): { path: number; index: number } | null {
  for (let i = w.paths.length - 1; i >= 0; i--) for (let j = w.paths[i].length - 1; j >= 0; j--) if (w.paths[i][j].x === p.x && w.paths[i][j].y === p.y) return { path: i, index: j }
  return null
}

/** A path has reached a mushroom, and each kind takes it in its own way. */
function arrive(w: World, stroke: Stroke, m: Mushroom): void {
  if (stroke.arrived.includes(m.id)) return
  stroke.arrived.push(m.id)
  if (m.kind === 'red') w.play(m.door ? stepUnderDoor() : hiccup(), { mushroom: m.id })
  else if (m.kind === 'bell') w.play(setSwinging(m.size), { mushroom: m.id })
  else w.play(softThump(), { mushroom: m.id })
  const who = w.occupant(m)
  if (who && w.gnomes[who].where === 'home') stroke.walk = who
}

// ---------------------------------------------------------------- the finger lifts, or is taken away

/** The end of a touch. `byChild` is false when the touch was taken away: then nothing is done in the child's name. */
export function release(w: World, byChild: boolean): void {
  const hold = w.hold
  w.hold = null
  w.dimple.depth.target = 0
  w.finger = null
  if (!hold) return
  switch (hold.on) {
    case 'mushroom': {
      const mushroom = w.find(hold.id)
      if (!mushroom) break
      if (hold.pulling) {
        // A pull that was taken away is no pull, and neither is one that had not come loose: the mushroom stays.
        if (byChild && comesOut(w, hold)) { out(w, mushroom); break }
        mushroom.pull = 0
        mushroom.swing.target = 0
        if (byChild) w.play(snapBack(mushroom.size), { mushroom: mushroom.id })
        break
      }
      if (!byChild) break
      if (hold.grew) {
        w.play(letGo(mushroom.kind, mushroom.size), { mushroom: mushroom.id })
        grownTo(w, mushroom)
        // The size it was held to is kept at once: the next moment may be a put-away.
        w.touched('now')
      } else if (hold.viaDoor && mushroom.door) {
        // A tap on a door brings its gnome out to walk his path; with nobody behind it, it is a knock.
        const who = w.occupant(mushroom)
        if (who) aWalk(w, who)
        else w.play(knockEmpty(mushroom.kind), { mushroom: mushroom.id })
      } else {
        w.play(poke(mushroom.kind, mushroom.size), { mushroom: mushroom.id })
        // A puffball's sneeze sets the sneezy gnome off, a moment after it.
        if (mushroom.kind === 'puff') sneezeAnswered(w, mushroom)
      }
      break
    }
    case 'walker': {
      const walker = w.walkers.find((other) => other.who === hold.who)
      if (walker) walker.held = false
      w.gnomes[hold.who].press.target = 0
      // A tap is his poke and a hold was his grumble, as on the log; then he walks on.
      if (byChild) w.play(hold.count === 0 ? pokeGnome(hold.who) : hatBack(hold.who), { gnome: hold.who })
      break
    }
    case 'gnome': {
      const g = w.gnomes[hold.who]
      g.press.target = 0
      if (g.hatPull > 0) {
        // Far enough up, the hat comes off with a pop where the finger lets go, he covers his bare head, and it drops back on.
        const off = g.hatPull >= HAT_OFF
        g.hatPull = 0
        if (byChild) w.play(off ? hatPop(hold.who) : hatBack(hold.who), { gnome: hold.who })
      } else if (byChild) {
        w.play(hold.count === 0 ? pokeGnome(hold.who) : hatBack(hold.who), { gnome: hold.who })
        if (hold.count === 0 && hold.swap && w.scene?.running && w.movingIn) sendInstead(w, hold.who, w.movingIn)
      }
      break
    }
    case 'water':
      if (w.column) {
        const base = { x: w.column.x, y: w.column.y }
        w.column = null
        if (byChild) w.play(splat(), { at: base })
      } else if (w.frog) {
        w.frog.leaving = true
        w.frog.up.target = 0
        if (byChild) w.play(plop(hold.along), { at: { x: w.frog.x, y: w.frog.y } })
      }
      break
    case 'sun': {
      const pulled = w.sun.pull
      w.sun.pull = 0
      if (hold.pulling) {
        if (byChild && pulled >= (w.night ? SUN_PULL.up : SUN_PULL.down)) {
          // It goes on from where the finger left it.
          w.sun.drop = clamp(w.night ? 1 - pulled / SUN_WAY : pulled / SUN_WAY, 0, 1)
          if (w.night) morningComes(w)
          else nightFalls(w)
        } else if (byChild) w.play(sunBack(), { sun: true })
      } else if (!byChild) w.sun.cheeks.target = 0
      else if (hold.hums > 0) w.play(unpuff(), { sun: true })
      else {
        w.play(shimmer(), { sun: true })
        if (w.night) morningComes(w)
        else nightFalls(w)
      }
      break
    }
    case 'pebble': {
      const seesaw = w.seesaw, path = w.paths[hold.path]
      w.seesaw = null
      if (!path || !seesaw) break
      const point = path[hold.index]
      if (hold.lifting) {
        // Only a path that has been loose, and seen to be, for a moment rolls away; let go sooner it drops back.
        if (byChild && hold.loose && hold.looseFor >= LOOSE_S) rollPathAway(w, hold.path)
        else if (byChild) w.play(dropBack(), { pebble: point })
      } else if (byChild && hold.held) w.play(seesawUp(), { pebble: point })
      else if (byChild) {
        // The hop runs along the path both ways like a hammer along chime bars, every pebble its own note.
        path.forEach((p, i) => {
          const away = Math.abs(i - hold.index)
          if (away <= RUN_REACH) w.play([{ at: 0, kick: { pebble: 'hop' }, notes: hopNote(p.x, p.y, away) }], { pebble: p }, away * RUN_STEP_S, 'run')
        })
      }
      break
    }
    case 'cart': {
      if (!byChild) break
      // A tap on a door on the cart sends it to the nearest mushroom that has none.
      const nearest = w.mushrooms.filter((m) => !m.door).sort((a, b) => far(a, CART) - far(b, CART))[0]
      if (!nearest) { w.play(rattleCart(), { cart: true }); break }
      fitDoor(w, nearest)
      nearest.doorSeen = false
      w.touched('now')
      w.play(doorOut(), { cart: true })
      const door = onStage(nearest, doorOf(nearest.kind, nearest.size))
      w.props.push({ what: 'flight', x: CART.x, y: CART.top + 20, to: { x: (door.x0 + door.x1) / 2, y: (door.y0 + door.y1) / 2 }, age: 0, life: 0.3, phase: 'fly', since: 0 })
      w.after(0.3, () => {
        const m = w.find(nearest.id)
        if (!m || !m.door) return
        m.doorSeen = true
        w.play(doorIn(m.kind, m.size), { mushroom: m.id })
      })
      doorPutIn(w, nearest, 1.6)
      break
    }
    case 'door': {
      w.doorInHand = null
      const origin = hold.from === 'cart' ? undefined : w.find(hold.from)
      // Taken away, it is where it came from, and nothing has changed.
      if (!byChild) { if (origin) origin.doorSeen = origin.door; break }
      dropDoor(w, origin, hold.at)
      break
    }
    case 'stroke': {
      w.paths = w.paths.filter((path) => path.length > 0)
      // Every pebble laid stays laid, however the stroke ended.
      if (w.change !== 'none') w.touched('now')
      if (!byChild || w.scene?.running) break
      const laid = stroke(w, hold)
      if (hold.walk && w.homes[hold.walk] !== null) aWalk(w, hold.walk)
      else if (hold.gnome && w.homes[hold.gnome] === null && w.gnomes[hold.gnome].where === 'log' && laid) stroll(w, hold.gnome, laid)
      break
    }
    case 'ground':
    case 'nothing':
  }
  if (byChild) owed(w)
}

/**
 * The finger has lifted from a stroke of pebbles, which waits a moment for it to come back. The wait is seen: the
 * gnome the stroke was drawn from or onto, or the one whose door it has just reached, shifts his weight towards
 * where the finger left. The finger's last place stays the place everyone looks at until the stroke ends.
 */
export function pause(w: World, at: Point): void {
  const hold = w.hold
  if (!hold || hold.on !== 'stroke') return
  const who = hold.walk && w.homes[hold.walk] !== null ? hold.walk : hold.gnome && w.homes[hold.gnome] === null ? hold.gnome : null
  if (!who) return
  const g = w.gnomes[who]
  if (g.where === 'log') { g.lean.target = 0.1 * Math.sign(at.x - SEATS[who].x || 1); g.riseLeft = 0.45 }
  w.play(shiftWeight(who), { gnome: who })
}

/** The pebble of a stroke that lies nearest the gnome it was drawn onto. */
function stroke(w: World, hold: Stroke): Point | null {
  const who = hold.gnome
  if (!who) return null
  const from = stepOff(who)
  let nearest: Point | null = null
  for (const path of w.paths) for (const p of path) if (atLog(p.x, p.y) && (!nearest || far(p, from) < far(nearest, from))) nearest = p
  return nearest
}

/** The first showings that are owed: read from the village as it stands, so nothing waits in a flag. */
function owed(w: World): void {
  if (w.scene?.running) return
  if (w.mushrooms.length > 0 && !w.shown.includes('cart')) return cartComes(w)
  if (!w.shown.includes('pebbles')) {
    const house = w.mushrooms.filter((m) => m.door).sort((a, b) => b.id - a.id)[0]
    if (house) settleIn(w, 0, firstPebbles(w, house, 0.2))
  }
}

// ---------------------------------------------------------------- doors

/** A door has gone into a mushroom: the first one brings the snail's pebbles, and whoever can reach the house moves in. */
function doorPutIn(w: World, m: Mushroom, lead: number): void {
  settleIn(w, lead, w.shown.includes('pebbles') ? [] : firstPebbles(w, m, lead))
}

/** A door goes into a mushroom. By night its window lights at once, as a load would show it. */
function fitDoor(w: World, m: Mushroom): void {
  m.door = true
  if (w.night) m.glow.target = 1
}

/** A door comes off a house: its gnome walks back to the log with his bundle, unhurt. */
function removeDoor(w: World, m: Mushroom): void {
  const who = w.occupant(m)
  m.door = false
  m.doorSeen = false
  w.play(doorOff(), { mushroom: m.id })
  if (who) backToLog(w, who, stepAt(m))
  w.touched('now')
}

/**
 * A gnome has no house any more. In the kept village he waits on the log from this call; what is seen is that
 * he stands on the moss where his door was, turns, and walks back to the log.
 */
function backToLog(w: World, who: GnomeId, from: Point): void {
  w.homes[who] = null
  if (who === 'tall') { w.hatOff = false; w.hatSeen = false }
  w.walkBack(who, from)
  w.play(turnedOut(who), { gnome: who })
  w.touched('now')
}

/** A puffball has been poked, and the sneezy gnome answers its sneeze a moment after it, where he is. */
function sneezeAnswered(w: World, puff: Mushroom): void {
  const delay = SNEEZE_AT + SNEEZE_BACK_AFTER, tag = `of${puff.id}`, house = w.houseOf('sneezy')
  if (!house || w.gnomes.sneezy.where !== 'home') { w.play(sneezeBack(), { gnome: 'sneezy' }, delay, tag); return }
  // At home he answers only a puffball near his house or the one he lives in, and it is seen: his window jerks and his hat pops out of the top.
  if (house === puff || far(house, puff) <= PUFF_NEAR) w.play(sneezeIndoors(), { mushroom: house.id }, delay, tag)
}

/** The child let a door go: what it does depends on what it was dropped on. */
function dropDoor(w: World, origin: Mushroom | undefined, at: Point): void {
  const hit = w.hit(at.x, at.y)
  const home = (after: number) => w.after(after, () => w.play(backOnCart(), { cart: true }))
  if (hit.what === 'door' || hit.what === 'mushroom') {
    const m = hit.mushroom
    if (m === origin) {
      // Back in the house it was lifted from.
      m.doorSeen = true
      w.play(doorShuts(m.kind), { mushroom: m.id })
      return
    }
    if (m.door) {
      // Where a door already is, it clacks against the first and goes back.
      w.play(doorOnDoor(), { mushroom: m.id })
      if (origin) { origin.doorSeen = true; w.play(doorShuts(origin.kind), { mushroom: origin.id }, 0.15) }
      else home(0.15)
      return
    }
    if (origin) removeDoor(w, origin)
    fitDoor(w, m)
    m.doorSeen = true
    w.play(doorIn(m.kind, m.size), { mushroom: m.id })
    w.touched('now')
    return doorPutIn(w, m, 1.2)
  }
  if (origin) removeDoor(w, origin)
  if (hit.what === 'gnome') {
    // He holds it up, knocks on it twice, looks behind it and hands it back.
    const seat = SEATS[hit.who]
    const door = { what: 'knocked' as const, x: seat.x, y: seat.y - 170, age: 0, life: KNOCKED_S, phase: 'held', since: 0, who: hit.who }
    w.props.push(door)
    w.play(knockOnDoor(hit.who), { gnome: hit.who, prop: door })
    home(KNOCKED_S)
  } else if (hit.what === 'pebble') {
    const point = w.paths[hit.path][hit.index]
    const door = { what: 'gate' as const, x: point.x, y: point.y, age: 0, life: GATE_S, phase: 'up', since: 0 }
    w.props.push(door)
    w.play(gate(), { prop: door, at: point })
    home(GATE_S)
  } else if (hit.what === 'water') {
    const door = { what: 'raft' as const, x: at.x, y: at.y, age: 0, life: RAFT_S, phase: 'float', since: 0 }
    w.props.push(door)
    w.play(raft(), { prop: door, at })
    home(RAFT_S)
  } else w.play(backOnCart(), { cart: true })
  if (origin) settleIn(w, 0.6)
}

/**
 * A tap on a gnome who waits, while another is on his way to a house: this one goes instead, whatever his taste
 * and with or without pebbles to walk on, and the one who was on his way turns where he stands and walks back
 * to the log.
 */
function sendInstead(w: World, who: GnomeId, moving: { who: GnomeId; house: number }): void {
  const house = w.find(moving.house)
  if (!house || !house.door || w.homes[moving.who] !== house.id || w.homes[who] !== null) return
  const other = w.gnomes[moving.who]
  const stood = other.where === 'out' ? { ...other.at } : other.where === 'home' ? stepAt(house) : null
  endScene(w)
  if (stood) backToLog(w, moving.who, stood)
  else {
    // He had not left the log yet.
    w.homes[moving.who] = null
    if (moving.who === 'tall') { w.hatOff = false; w.hatSeen = false }
    other.where = 'log'
  }
  w.homes[who] = house.id
  if (who === 'tall') w.hatOff = hatStaysOut(house.size)
  w.touched('now')
  send(w, who, house, 0.5)
}

// ---------------------------------------------------------------- mushrooms and paths go

type OnMushroom = Extract<Hold, { on: 'mushroom' }>

/**
 * A pulled mushroom comes loose, and shows it: past `OUT`, and once the touch has lasted longer than a tap, its
 * cap leans over with a creak. Brought back down it sits tight again. `looseAt` is kept on the mushroom's spring
 * target and the hold, never anywhere that outlives the touch.
 */
function loosened(w: World, hold: OnMushroom, mushroom: Mushroom): void {
  if (!hold.loose && mushroom.pull >= OUT && hold.age >= TAP_S) {
    hold.loose = true
    hold.t = 0
    mushroom.swing.target = LEAN
    w.play(loosen(mushroom.kind, mushroom.size), { mushroom: mushroom.id })
  } else if (hold.loose && mushroom.pull < OUT - TIGHT) {
    hold.loose = false
    mushroom.swing.target = 0
    w.play(tighten(), { mushroom: mushroom.id })
  }
}

type OnPebble = Extract<Hold, { on: 'pebble' }>

/**
 * A lifted path comes loose, and shows it: past `OUT` every pebble of it leaves the moss and turns, with a rattle
 * down its whole length. Brought back down it sits again. Only a loose path rolls away when the finger lets go.
 */
function pathLoosened(w: World, hold: OnPebble, path: readonly Point[]): void {
  const seesaw = w.seesaw
  if (!seesaw) return
  if (!hold.loose && seesaw.lift >= OUT) {
    hold.loose = true
    hold.looseFor = 0
    seesaw.loose = true
    w.play(pathLoose(), { pebble: path[hold.index] })
    path.forEach((p, i) => { if (i !== hold.index) w.stirs.push({ x: p.x, y: p.y, move: 'turn', age: 0 }) })
  } else if (hold.loose && seesaw.lift < OUT - TIGHT) {
    hold.loose = false
    seesaw.loose = false
    w.play(pathSits(), { pebble: path[hold.index] })
  }
}

/** Whether a pulled mushroom comes out now: it has been loose, and seen to be, for a moment. `hold.t` counts from the loosening. */
function comesOut(_w: World, hold: OnMushroom): boolean {
  return hold.loose && hold.t >= LOOSE_S
}

/** A mushroom comes out with a pop and dives back into the earth; whoever lived in it is back on the log. */
function out(w: World, m: Mushroom): void {
  const who = w.occupant(m)
  w.hush((on, tag) => on.mushroom === m.id || tag === `of${m.id}`)
  w.mushrooms = w.mushrooms.filter((other) => other !== m)
  w.leaving.push({ kind: m.kind, size: m.size, x: m.x, y: m.y, flip: m.flip, pull: m.pull, age: 0 })
  const shape = shapeOf(m.kind, m.size)
  w.play(comeOut(m.kind, m.size), { at: { x: m.x + (m.flip ? -1 : 1) * shape.lean, y: m.y - shape.height * 0.8 - m.pull } })
  w.play(startle(), { gnome: 'sleepy' }, 0.08)
  if (who) backToLog(w, who, stepAt(m))
  w.touched('now')
  settleIn(w, 0.9)
}

/** A path let go from high enough: its pebbles roll away to the edge with a clatter. */
function rollPathAway(w: World, index: number): void {
  const points = w.paths[index]
  w.paths.splice(index, 1)
  w.hush((_on, tag) => tag === 'run')
  const rolling = { what: 'rolling' as const, x: points[0].x, y: points[0].y, age: 0, life: ROLL_S, phase: 'roll', since: 0, points }
  w.props.push(rolling)
  w.play(rollAway(), { at: points[Math.floor(points.length / 2)], prop: rolling })
  w.touched('now')
  // With no path to a door any more, the sleepy one may come over the moss.
  settleIn(w, 0.9)
}

// ---------------------------------------------------------------- the gnomes watch

/** A mushroom is swelling: the gnomes look at it, and each takes it in his own way. */
function watch(w: World, m: Mushroom): void {
  w.interest = { at: { x: m.x, y: m.y - shapeOf(m.kind, m.size).height * 0.7 }, left: 2.2 }
  // The tall one rises on his toes with it.
  const tall = w.gnomes.tall
  tall.rise.target = m.size / FULL
  tall.riseLeft = 1.6
  // The baker leans towards anything that comes up on the bank of the stream.
  const baker = w.gnomes.baker
  if (m.kind === 'bell') { baker.lean.target = 0.16 * Math.sign(m.x - SEATS.baker.x || 1); baker.riseLeft = 1.6; baker.rise.target = 0.4 }
}

/** The finger has lifted and the mushroom is as tall as it will be. */
function grownTo(w: World, m: Mushroom): void {
  const tall = w.gnomes.tall
  // He sags when it stays squat, and stays up on his toes for a tall one.
  tall.rise.target = m.size <= 4 ? -0.8 : m.size >= 9 ? 1 : 0
  tall.riseLeft = 1.5
  if (m.size >= 9) { tall.face = 'ooh'; tall.faceLeft = 1.2 }
}

// ---------------------------------------------------------------- while the finger stays

export function stepHold(w: World, dt: number): void {
  const hold = w.hold
  w.since.full += dt
  if (!hold) return
  switch (hold.on) {
    case 'mushroom': {
      hold.t += dt
      hold.age += dt
      const mushroom = w.find(hold.id)
      if (!mushroom) return
      // A finger that pulled far before the tap's time was up and stays there: the cap comes loose when that time is up.
      if (hold.pulling) return loosened(w, hold, mushroom)
      // A finger on a mushroom that already stood waits a moment, so that a tap stays a poke.
      if (!hold.grew) {
        if (hold.t < TAP_S) return
        // Longer than a tap: the cap begins to stretch, and the first step follows a step's time later.
        hold.t -= TAP_S
        hold.grew = true
        w.play(stretch(mushroom.kind, mushroom.size), { mushroom: mushroom.id })
      }
      if (mushroom.size >= FULL) {
        if (hold.t >= TREMBLE_S) { hold.t -= TREMBLE_S; w.play(tremble(), { mushroom: mushroom.id }) }
        return
      }
      while (hold.t >= STEP_S && mushroom.size < FULL) {
        hold.t -= STEP_S
        mushroom.size += 1
        hold.steps += 1
        w.play(swell(mushroom.kind, mushroom.size), { mushroom: mushroom.id })
        if (mushroom.size === FULL) { w.play(full(), { mushroom: mushroom.id }); hold.t = 0 }
        // Held tall enough, the tall gnome's hat goes back on.
        if (w.hatOff && w.homes.tall === mushroom.id && !hatStaysOut(mushroom.size)) { w.hatOff = false; w.hatSeen = false; w.play(hatFits(), { mushroom: mushroom.id }) }
        watch(w, mushroom)
        w.touched('small')
      }
      return
    }
    case 'gnome': {
      const g = w.gnomes[hold.who]
      if (g.hatPull > 0) return
      hold.t += dt
      // Up to a tap's length it may still be his poke; after it the finger is holding him down.
      while (hold.t >= (hold.count === 0 ? TAP_S : GRUMBLE_S)) {
        hold.t -= hold.count === 0 ? TAP_S : GRUMBLE_S
        if (hold.swap) { hold.swap = false; endScene(w) }
        hold.count += 1
        g.press.target = Math.min(1, 0.55 + 0.12 * hold.count)
        w.play(grumble(hold.who, hold.count), { gnome: hold.who })
      }
      return
    }
    case 'walker': {
      hold.t += dt
      while (hold.t >= (hold.count === 0 ? TAP_S : GRUMBLE_S)) {
        hold.t -= hold.count === 0 ? TAP_S : GRUMBLE_S
        hold.count += 1
        w.gnomes[hold.who].press.target = Math.min(1, 0.55 + 0.12 * hold.count)
        w.play(grumble(hold.who, hold.count), { gnome: hold.who })
      }
      return
    }
    case 'water': {
      if (hold.drawn) return
      hold.t += dt
      // A finger that stays in the water raises a frog on a dome of it, who croaks lower the longer it stays.
      if (!w.frog && hold.t >= TAP_S) {
        // In the pond it comes up clear of the baker's bucket, which hangs out over the near end.
        w.frog = { x: hold.at.y > POND.y - POND.ry ? Math.max(hold.at.x, FROG_CLEAR) : hold.at.x, y: Math.min(hold.at.y, POND.y + 10), along: hold.along, up: spring(0, 120, 9), squash: spring(0, 220, 10), leaving: false }
        w.frog.up.target = 1
        hold.t = CROAK_S
      }
      if (w.frog && !w.frog.leaving && hold.t >= CROAK_S) {
        hold.t -= CROAK_S
        w.play(croak(hold.croaks++), { frog: true })
      }
      return
    }
    case 'sun': {
      if (hold.pulling) return
      hold.t += dt
      // Held, it puffs out its cheeks and hums.
      const due = hold.hums === 0 ? TAP_S : HUM_S
      if (hold.t >= due) { hold.t -= due; w.play(hum(hold.hums++), { sun: true }) }
      return
    }
    case 'pebble': {
      hold.t += dt
      if (hold.loose) hold.looseFor += dt
      if (hold.t >= TAP_S) hold.held = true
      const path = w.paths[hold.path]
      if (hold.lifting && path) pathLoosened(w, hold, path)
      return
    }
    default:
  }
}
