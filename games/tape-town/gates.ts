import type { Crossing } from './crossings'
import { apart } from './floor'
import type { Point } from './input'
import { TAPE_WIDTH, TOY_IDS, TOY_SIZE, type Pose, type ToyId } from './layout'
import type { PegId } from './save'
import { lengthOf, type Strip } from './tape'
import type { Town } from './town'

// The two gates of a level crossing. Each is a banded arm on a post beside
// the road: up while the line is clear, and down across the road, alongside
// the rails, while a train is at the crossing. They are shut on the frame
// the train hoots at the crossing and opened on the frame of its second
// clack, when its last wheels are off the road. Whoever travels the road
// waits at a gate that is shut. An arm never comes down on anybody: it stays
// up, or lifts, while somebody is under it. Gates are worked out from the
// town as it runs and are never saved: on load a gate is shut only where the
// train's wheels are on the road (riding.ts, gatesAsFound), and a train that
// had hooted and is not there yet hoots again and shuts them.

/** A gate that is shut, or moving: the two strips of its crossing, when it was shut and when it was opened, and how far down each arm is. */
export type Gate = { low: Strip; high: Strip; shutAt: number; openAt: number; down: [number, number] }

/** How long an arm takes to come down or go up, in seconds. */
export const GATE_SWING = 0.3
/** How far before a crossing the train hoots at it, from its middle to the crossing's near edge. */
export const HOOT_AT = 190
/** How far from the middle of the rails an arm lies when it is down: clear of the widest thing on them. */
const ARM_OFF = TOY_SIZE.train.wide / 2 + 10
/** How far from the middle of the road a post stands: clear of the widest thing on it. */
const POST_OFF = TOY_SIZE.bus.wide / 2 + 6
export const ARM_WIDE = 9
const ARM_MOST = 130

/** One arm: the post it is hinged on, the way it points when it is down, and how long it is. */
export type Arm = { post: Point; a: number; long: number }

/** The two arms of a level crossing, one before the rails on one side of the road and one after them on the other. */
export function armsOf(crossing: Crossing): [Arm, Arm] {
  const road = crossing.low, rail = crossing.high, lr = lengthOf(road), lh = lengthOf(rail)
  const ux = (road.bx - road.ax) / lr, uy = (road.by - road.ay) / lr, rx = (rail.bx - rail.ax) / lh, ry = (rail.by - rail.ay) / lh
  const sin = ux * ry - uy * rx, cos = ux * rx + uy * ry
  const arm = (side: number): Arm => {
    // Along a line beside the rails, to where that line is clear of the road's edge.
    const t = (side * POST_OFF - side * ARM_OFF * cos) / sin
    const post = { x: crossing.at.x - side * ARM_OFF * ry + t * rx, y: crossing.at.y + side * ARM_OFF * rx + t * ry }
    const way = t > 0 ? -1 : 1
    return { post, a: Math.atan2(ry * way, rx * way), long: Math.min(ARM_MOST, (POST_OFF + TAPE_WIDTH / 2 + 4) / Math.abs(sin)) }
  }
  return [arm(1), arm(-1)]
}

/** How far short of the middle of a level crossing a toy on the road stops, so that its nose is clear of the arm. */
export function stopShort(crossing: Crossing, id: ToyId): number {
  const road = crossing.low, rail = crossing.high, lr = lengthOf(road), lh = lengthOf(rail)
  const sin = Math.abs(((road.bx - road.ax) * (rail.by - rail.ay) - (road.by - road.ay) * (rail.bx - rail.ax)) / (lr * lh))
  const cot = Math.sqrt(Math.max(0, 1 - sin * sin)) / sin
  return TOY_SIZE[id].long / 2 + (ARM_OFF + ARM_WIDE / 2) / sin + (TOY_SIZE[id].wide / 2) * cot + 4
}

/**
 * How far from the middle of a level crossing a toy on the road is when its nose comes to the rails: nearer than
 * this it is on them, and drives on whatever the gates do; further off it has not reached them, and waits.
 */
export function railsEdge(crossing: Crossing, id: ToyId): number {
  const road = crossing.low, rail = crossing.high, lr = lengthOf(road), lh = lengthOf(rail)
  const sin = Math.abs(((road.bx - road.ax) * (rail.by - rail.ay) - (road.by - road.ay) * (rail.bx - rail.ax)) / (lr * lh))
  const cot = Math.sqrt(Math.max(0, 1 - sin * sin)) / sin
  return TOY_SIZE[id].long / 2 + (TOY_SIZE.train.wide / 2 + 6) / sin + (TOY_SIZE[id].wide / 2) * cot
}

const near = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y)
const gateAt = (town: Town, crossing: Crossing): Gate | undefined => town.gates.find((gate) => gate.low === crossing.low && gate.high === crossing.high)

/** The train is on its rails and coming up to this crossing, or not yet clear of it. */
export function trainNear(town: Town, crossing: Crossing): boolean {
  const train = town.bodies.train, doing = train.doing
  if (train.flight) return false
  if (doing.is === 'act' && doing.after?.is === 'ride') return near(train.at, crossing.at) < 140
  if (doing.is !== 'ride' || doing.kind !== 3) return false
  const strip = town.nets[3].strips[doing.rider.s]
  if (crossing.high !== strip) return false
  const gap = (crossing.dHigh - doing.rider.d) * doing.rider.dir
  return gap < HOOT_AT + crossing.reachHigh + 40 && gap > -180
}

/** How far down the two arms of a crossing are: 0 up, 1 down across the road. */
export function gateOf(town: Town, crossing: Crossing): [number, number] {
  return gateAt(town, crossing)?.down ?? [0, 0]
}

/** Whether the gates are shut: whoever comes to them along the road waits. */
export function gateShut(town: Town, crossing: Crossing): boolean {
  const gate = gateAt(town, crossing)
  return gate !== undefined && gate.openAt === -Infinity
}

export function shutGate(town: Town, crossing: Crossing): void {
  if (crossing.kind !== 'level' || gateShut(town, crossing)) return
  const was = gateAt(town, crossing)
  town.gates = town.gates.filter((gate) => gate !== was)
  town.gates.push({ low: crossing.low, high: crossing.high, shutAt: town.time, openAt: -Infinity, down: was ? was.down : [0, 0] })
}

export function openGate(town: Town, crossing: Crossing): void {
  const gate = gateAt(town, crossing)
  if (gate && gate.openAt === -Infinity) gate.openAt = town.time
}

/** The toys that could be under an arm: all that stand or travel on the floor. */
function onTheFloor(town: Town): ToyId[] {
  return TOY_IDS.filter((id) => !town.state.riding[id as PegId] && town.bodies[id].doing.is !== 'held' && !town.bodies[id].flight)
}

/** How much room there is between an arm, were it down, and the nearest toy. */
export function armRoom(town: Town, arm: Arm): number {
  const pose: Pose = { x: arm.post.x + (Math.cos(arm.a) * arm.long) / 2, y: arm.post.y + (Math.sin(arm.a) * arm.long) / 2, a: arm.a }
  let least = Infinity
  for (const id of onTheFloor(town)) least = Math.min(least, apart(pose, { long: arm.long, wide: ARM_WIDE }, town.bodies[id].at, TOY_SIZE[id]))
  return least
}

/**
 * Once a step: a gate whose train is no longer coming (carried off, turned back, its rail peeled) opens; each
 * arm goes down while its gate is shut and nobody is under it, and up otherwise; and a gate that is open
 * again is forgotten.
 */
export function stepGates(town: Town, dt: number): void {
  if (!town.gates.length) return
  for (const gate of town.gates) {
    const crossing = town.crossings.find((one) => one.low === gate.low && one.high === gate.high)
    if (gate.openAt === -Infinity && (!crossing || !trainNear(town, crossing))) gate.openAt = town.time
    const arms = crossing ? armsOf(crossing) : null
    for (const k of [0, 1] as const) {
      const goesDown = gate.openAt === -Infinity && arms !== null && armRoom(town, arms[k]) >= 3
      gate.down[k] = Math.max(0, Math.min(1, gate.down[k] + ((goesDown ? 1 : -1) * dt) / GATE_SWING))
    }
  }
  town.gates = town.gates.filter((gate) => gate.openAt === -Infinity || gate.down[0] > 0 || gate.down[1] > 0)
}
