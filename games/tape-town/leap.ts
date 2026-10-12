import type { Crossing } from './crossings'
import { apart } from './floor'
import { WANT, type Mover } from './habits'
import { TAPE_WIDTH, TOY_SIZE, type Pose, type ToyId } from './layout'
import { along, angleOf, isStub, lengthOf, nearestOn, type Strip } from './tape'
import type { Town } from './town'
import { HOP, LAND } from './voices'
import { HOP_REACH, HOP_SECONDS, SAME_PAIR, WELL_CLEAR, atHome, freePlace, grounded, hopTo, roomFrom } from './way'

// A toy that cannot get to its tape on foot goes the rest of the way in one
// hop: over whoever stands between, through the air and never through
// anybody, to the nearest place on that tape where nobody stands. Whoever
// is on the tape there, or beside it, hops aside in the same moment and is
// down no later: a toy called to its own tape is the one the others make
// way for.

/** How long a leap lasts: a hop for a short one, and up to twice that for one right across the floor. */
const leapSeconds = (far: number): number => Math.min(HOP_SECONDS * 2, Math.max(HOP_SECONDS, far / 900))

/** How far whoever is in the way of a leap hops to be out of it: as far as it takes, on a floor this size. */
const LEAP_CLEARS = HOP_REACH * 4

/**
 * Whether somebody in the way of a leap can hop out of it: whoever stands, and whoever is travelling or crossing
 * the floor. Not one in the middle of a turn or some other business, in the air, or stuck under tape: for them
 * the newcomer waits. Not one who is on that tape as its own, the bus on the road the car is coming to: it was
 * there first. And not one the newcomer has sent hopping twice already.
 */
function canClear(town: Town, id: Mover, other: ToyId, strip: Strip): boolean {
  const theirs = town.bodies[other], doing = theirs.doing
  // Nor one a finger rests on: it stays under the finger.
  if (theirs.flight || town.stopped(other) || (theirs.hopped[id] ?? 0) >= SAME_PAIR) return false
  if (other in WANT && WANT[other as Mover] === strip.kind && (atHome(town, other) || (doing.is === 'ride' && doing.kind === strip.kind))) return false
  if (doing.is === 'stand') return doing.as !== 'dazed'
  return doing.is === 'ride' || doing.is === 'walk'
}

/** Whether a toy that hops out of the way of a leap was going somewhere, and goes on when the newcomer has gone by. */
function goesOn(town: Town, other: ToyId): boolean {
  const doing = town.bodies[other].doing
  return other !== 'dog' && (doing.is === 'ride' || (doing.is === 'walk' && !doing.follow))
}

/** Whether a place on a strip is where it goes under a road or a rail: nobody lands under there. */
function underSomething(town: Town, strip: Strip, at: { x: number; y: number }, reach: number): boolean {
  // The river goes under a bridge and a trestle, the rail through a tunnel of hedge.
  const goesUnder = (crossing: Crossing): boolean => (crossing.kind === 'trestle' ? crossing.low : crossing.kind === 'bridge' || crossing.kind === 'tunnel' ? crossing.high : null) === strip
  return town.crossings.some((crossing) => goesUnder(crossing) && Math.hypot(crossing.at.x - at.x, crossing.at.y - at.y) < reach)
}

/**
 * The place on a strip a toy would leap to: the nearest place along it to where the toy is, facing the way it
 * is nearest to facing, where nobody stands or where whoever stands can hop aside, which they then do. Null when
 * the tape is full.
 */
export function landingOn(town: Town, id: Mover, strip: Strip): Pose | null {
  const body = town.bodies[id], size = TOY_SIZE[id], length = lengthOf(strip), a = angleOf(strip)
  const turned = Math.cos(body.at.a - a) >= 0 ? a : a + Math.PI
  const half = isStub(strip) ? length / 2 : Math.min(size.long / 2, length / 2), d = Math.min(length - half, Math.max(half, nearestOn(strip, body.at).d))
  const steps = Math.ceil(length / 20)
  // First a place where nobody is; and only where there is none, one that somebody hops out of.
  for (const empty of [true, false]) {
    for (let step = 0; step <= steps; step++) {
      for (const side of step ? [1, -1] : [1]) {
        const here = d + side * step * 20
        if (here < half - 0.01 || here > length - half + 0.01) continue
        const at = along(strip, here), pose = { x: at.x, y: at.y, a: turned }
        if (underSomething(town, strip, at, size.long / 2 + TAPE_WIDTH)) continue
        const inTheWay = grounded(town, id).filter((other) => roomFrom(town, pose, size, other) < 6)
        if (empty ? inTheWay.length > 0 : !inTheWay.every((other) => canClear(town, id, other, strip))) continue
        // Each to a place of its own: where two of them would hop to the same place, this is no place to land.
        // Well clear of every tape where each has such a place, since the newcomer is about to travel this one;
        // and otherwise to the nearest free floor.
        let hops: { other: ToyId; to: Pose }[] = []
        for (const clear of [WELL_CLEAR, undefined]) {
          hops = []
          for (const other of inTheWay) {
            const theirs = town.bodies[other].at
            const to = freePlace(town, other, theirs, LEAP_CLEARS, Math.atan2(theirs.y - pose.y, theirs.x - pose.x), { id, lane: [{ ...pose, swing: false }] }, true, undefined, false, clear)
            if (!to || hops.some((hop) => apart(to, TOY_SIZE[other], hop.to, TOY_SIZE[hop.other]) < 6)) break
            hops.push({ other, to })
          }
          if (hops.length === inTheWay.length) break
        }
        if (hops.length < inTheWay.length) continue
        // Whoever was going somewhere goes on when the newcomer has gone by.
        for (const hop of hops) {
          const theirs = town.bodies[hop.other]
          theirs.hopped[id] = (theirs.hopped[id] ?? 0) + 1
          hopTo(town, hop.other, hop.to, goesOn(town, hop.other) ? id : undefined)
        }
        return pose
      }
    }
  }
  return null
}

/** One hop onto its tape. False when there is nowhere on it to land, and nothing is changed. */
export function leapOnto(town: Town, id: Mover, strip: Strip): boolean {
  if (!town.flat.includes(strip)) return false
  const body = town.bodies[id], pose = landingOn(town, id, strip)
  if (!pose) return false
  const far = Math.hypot(pose.x - body.at.x, pose.y - body.at.y)
  body.flight = { from: { ...body.at }, wait: 0, t: 0, lasts: leapSeconds(far), started: false, scene: false, loud: false, off: HOP[id], land: LAND[id], then: 'decide' }
  body.at = town.state.toys[id] = pose
  body.hidden = false
  body.doing = { is: 'stand', as: 'parked', since: town.time }
  town.mark('soon')
  return true
}
