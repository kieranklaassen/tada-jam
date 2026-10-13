import { NEST, SPOTS, type P } from './layout'
import { HELLO } from './motion'
import { below, pick } from './rng'
import { TABLE } from './room'
import { finishScene, letGo } from './rules'
import { drawn, indoors, restOf } from './things'
import { HANG, IDLE, acting, amount, begin, createToy, dwellerAt, fire, gap, lookAt, moving, savedOf, wormPlace, type Animal, type Mover, type Toy } from './toy'
import { SOUNDS } from './voices'
import { PLACES, THINGS, type FindId, type PlaceId, type ThingId } from './wood'

// Time passing, a put-away, and what the idle ladder shows.

/** How high a find's small note of arrival is: small things high, heavy things low. */
const HELLO_PITCH: Record<FindId | 'woodlouse', number> = { worm: 1.12, snail: 1, feather: 1.5, acorn: 0.94, button: 1.68, apple: 0.7, ladybird: 1.6, mushroom: 0.84, sleeper: 0.76, tadpole: 1.34, skater: 1.78, leafboat: 1.06, bubble: 1.42, caterpillar: 0.9, beetle: 1.26, moth: 1.19, woodlouse: 1.3 }

/** Plays `dt` seconds. A first frame plays none. Everything due by the new moment of the clock happens at it. */
export function step(toy: Toy, dt: number): void {
  toy.time += Math.max(0, dt)
  if (toy.scene) { toy.scene.update(toy.time); if (!toy.scene.running) { toy.scene = null; toy.sceneKind = '' } }
  for (const mover of Object.keys(toy.acts) as Mover[]) {
    const act = toy.acts[mover]!
    fire(toy, mover, act)
    // A motion that is over is gone; a cover keeps its last one, which says how long ago it landed.
    if (toy.time >= act.since + act.length && !mover.startsWith('cover:')) delete toy.acts[mover]
  }
  // A thing let go hangs where it was let go for a moment, and is then set down there. Let go while the view
  // still slides, it hangs until the view is at rest, so it is set down where it was let go as it is seen: it
  // does not jump with the frame, and nothing answers it while that is partly off screen.
  if (toy.hand && !toy.hand.down && toy.time - toy.hand.letGoAt >= HANG && !acting(toy, 'view')) letGo(toy)
  for (const place of PLACES) {
    const cover = toy.covers[place], a = amount(toy, place)
    // Hidden: what lies under it is the season's.
    if (!cover.open && a < 0.15) cover.shows = toy.season
    // Clear: what is under it comes up to be seen, and the animals turn to it.
    if (cover.open && !cover.greeted && a > 0.6) {
      cover.greeted = true
      const who = dwellerAt(toy, place)
      begin(toy, `find:${place}`, 'hello', HELLO, { cues: [{ after: 0, sound: 'hello', pitch: HELLO_PITCH[who] }], room: false })
      lookAt(toy, SPOTS[place].find)
      if (who === 'worm') {
        if (toy.rolled) { toy.rolled = false; toy.dirty = true; begin(toy, 'hedgehog', 'unroll', SOUNDS.hogUnroll.rides, { cues: [{ after: 0, sound: 'hogUnroll' }], room: false }) }
        else if (!moving(toy, 'hedgehog')) begin(toy, 'hedgehog', 'sniff', SOUNDS.hogSniff.rides, { cues: [{ after: 0, sound: 'hogSniff' }], room: false })
      }
      if (who === 'button' && !moving(toy, 'jay')) begin(toy, 'jay', 'ooh', SOUNDS.jayOoh.rides, { cues: [{ after: 0, sound: 'jayOoh' }], room: false })
    }
  }
  // What sat on the ball lies before him once he has unrolled; the silver trail dries.
  if (!toy.rolled) { toy.perch.snail = false; toy.perch.feather = false }
  if (toy.trail && toy.time - toy.trail.since > 7) toy.trail = null
  // Something stirs under a shut cover now and then. It makes no sound.
  if (toy.time >= toy.stir.next) {
    const shut = PLACES.filter((place) => !toy.covers[place].open && !moving(toy, `cover:${place}`))
    toy.stir = { place: shut.length ? pick(toy.rng, shut) : null, since: toy.time, next: toy.time + 2.4 + toy.rng.next() * 2.6 }
  }
  // Each animal does a small thing of its own in its own time, never the one it did last, and only when it has no act.
  for (const who of ['hedgehog', 'jay', 'toad'] as const satisfies readonly Animal[]) {
    const idle = toy.idle[who]
    if (toy.time < idle.next) continue
    if (moving(toy, who)) { idle.next = toy.time + 1; continue }
    const count = IDLE[who].variants.length
    let variant = below(toy.rng, idle.variant < 0 ? count : count - 1)
    if (idle.variant >= 0 && variant >= idle.variant) variant += 1
    idle.variant = variant
    idle.since = toy.time
    idle.next = toy.time + IDLE[who].variants[idle.variant].length + gap(toy.rng, IDLE[who].gap)
  }
}

/**
 * A put-away: the game settles as a load would find it. A scene is at its end; a thing under a finger that is
 * still carrying goes back where it came from, and a thing that hangs where it was let go is set down there;
 * then every motion is gone, all sound is closed, and the model is the one its own save gives.
 */
export function settle(toy: Toy): void {
  finishScene(toy)
  if (toy.hand) {
    if (toy.hand.down) toy.hand = null
    else { letGo(toy); finishScene(toy) }
  }
  const dirty = toy.dirty
  Object.assign(toy, createToy(savedOf(toy), toy.seed, toy.time), { dirty, cut: { scene: true, all: true } })
}

// --- The idle ladder --------------------------------------------------------------------------

export type Invitation = {
  /** The shut covers that glow. */
  covers: PlaceId[]
  /** Whatever else glows: the wheel, the things at the table's edge, the door of the room. */
  spots: (P & { r: number })[]
  /** What the ghost hand shows: one tap, or one thing picked up and moved a short way, to no one. */
  hand: { tap: P } | { carry: ThingId; from: P; to: P }
}

/** A thing that lies in the open in the frame on screen, where a hand could pick it up. */
function carriable(toy: Toy): { thing: ThingId; at: P } | null {
  for (const thing of THINGS) {
    const where = toy.things[thing]
    if (where.at === 'nest' || indoors(where) !== toy.room) continue
    const seen = drawn(toy, thing)
    if (seen && seen.room === toy.room && seen.pose.show > 0 && restOf(toy, thing)) return { thing, at: seen.at }
  }
  return null
}

/**
 * What the idle ladder shows. In the wood the shut covers glow and the hand taps the one the hedgehog's nose
 * points at (the nest or the door of the house when the worm is there); once a thing lies in the open the hand shows a carry instead; with every cover open and nothing to
 * carry, both are on the wheel. `showing` is which showing of the hand this is in the idle stretch. In the room the things on the table and the door glow, and the hand moves one
 * thing a little way along the table. The hand shows a move and never where a thing should go.
 */
export function invitation(toy: Toy, wheel: P & { r: number }, door: P & { r: number }, showing = -1, house: (P & { r: number }) | null = null): Invitation {
  const found = carriable(toy)
  if (toy.room) {
    const spots = THINGS.filter((thing) => toy.things[thing].at === 'table').map((thing) => ({ ...restOf(toy, thing)!, r: 44 }))
    if (!found) return { covers: [], spots: [...spots, door], hand: { tap: door } }
    const along = found.at.x < (TABLE.x0 + TABLE.x1) / 2 ? 70 : -70
    return { covers: [], spots: [...spots, door], hand: { carry: found.thing, from: found.at, to: { x: found.at.x + along, y: found.at.y - 26 } } }
  }
  // Once a thing has been carried and the room has not been seen on this visit, the second showing of an idle
  // stretch is the door of the house: it glows, and the hand taps it once.
  if (house && showing === 1 && toy.carried && !toy.roomSeen) return { covers: [], spots: [house], hand: { tap: house } }
  const shut = PLACES.filter((place) => !toy.covers[place].open)
  if (found) return { covers: shut, spots: [], hand: { carry: found.thing, from: found.at, to: { x: found.at.x + (found.at.x < 700 ? 76 : -76), y: found.at.y - 30 } } }
  if (shut.length === 0) return { covers: [], spots: [wheel], hand: { tap: wheel } }
  // The hand shows what the hedgehog's nose points at (`wormSpot` in poses.ts): the cover the worm is under, or,
  // with the worm in the jay's nest or in the house, the nest or the door of the house.
  const where = toy.things.worm.at
  if (where === 'nest') return { covers: shut, spots: [NEST], hand: { tap: NEST } }
  if (house && (where === 'table' || where === 'bowl')) return { covers: shut, spots: [house], hand: { tap: house } }
  const worm = wormPlace(toy)
  return { covers: shut, spots: [], hand: { tap: SPOTS[shut.includes(worm) ? worm : shut[0]].shut } }
}

