import { apart } from './floor'
import type { Point } from './input'
import { OUT_PLACE, TOY_IDS, TOY_SIZE, type Kind, type Pose, type ToyId } from './layout'
import { deserializeTown, freshTown, type TownState } from './save'
import type { Strip } from './tape'
import { Town } from './town'
import { grounded, passesUnder } from './way'

// What the tests of the model share: a town with a given floor, a clock to
// run it by, and a way to write down everything it is at one moment. Used by
// the tests only; the game imports nothing from here.

export const DT = 1 / 60

export const strip = (kind: Kind, ax: number, ay: number, bx: number, by: number): Strip => ({ kind, ax, ay, bx, by })

/** Along the bottom of the bare floor, out of the way of whatever a test lays above. */
export const SHELF: Record<ToyId, Pose> = {
  car: { x: 330, y: 650, a: 0 }, dog: { x: 490, y: 655, a: 0 }, duck: { x: 630, y: 645, a: 0 }, pegA: { x: 730, y: 655, a: 0 },
  pegB: { x: 815, y: 655, a: 0 }, pegC: { x: 900, y: 655, a: 0 }, bus: { x: 370, y: 540, a: 0 }, train: { x: 860, y: 540, a: 0 },
}

/** A town with the box tipped, these strips down and these toys where they are put; the rest stand on the shelf. */
export function townWith(strips: Strip[] = [], toys: Partial<Record<ToyId, Pose>> = {}, seed = 1): Town {
  const state: TownState = { ...freshTown(9), strips: strips.map((s) => ({ ...s })) }
  for (const id of TOY_IDS) state.toys[id] = { ...(toys[id] ?? SHELF[id]) }
  const town = new Town(state, seed)
  // Whoever the test did not place sits still on the shelf, whatever tape is laid.
  for (const id of TOY_IDS) if (!toys[id]) town.bodies[id].doing = { is: 'stand', as: 'bath', since: 0 }
  return town
}

export type Heard = { name: string; frame: number; scene: boolean }

/** Runs the town and writes down every sound with the frame it was queued in. */
export function run(town: Town, seconds: number, log: Heard[] = [], each?: () => void): Heard[] {
  for (const sound of town.takeSounds()) log.push({ name: sound.name, frame: town.frames, scene: sound.scene === true })
  for (let i = Math.round(seconds / DT); i > 0; i--) {
    town.step(DT)
    for (const sound of town.takeSounds()) log.push({ name: sound.name, frame: town.frames, scene: sound.scene === true })
    each?.()
  }
  return log
}

export const names = (log: Heard[]): string[] => log.map((heard) => heard.name)

/** A finger that lands, goes somewhere in steps and lifts. */
export function drag(town: Town, from: Point, to: Point, steps = 8): void {
  town.press(from)
  for (let k = 1; k <= steps; k++) town.move({ x: from.x + ((to.x - from.x) * k) / steps, y: from.y + ((to.y - from.y) * k) / steps })
  town.lift()
}

/** The child picks a toy up and sets it down. */
export function carry(town: Town, id: ToyId, to: Point): void {
  const from = town.poseOf(id)
  drag(town, { x: from.x, y: from.y }, to)
}

/** The least room between any two toys that take up floor: below zero when two overlap. */
export function leastRoom(town: Town): { room: number; pair: string } {
  const ids = grounded(town).filter((id) => !town.bodies[id].flight)
  let least = { room: Infinity, pair: '' }
  for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) {
    // The duck under a bridge or a trestle is under whatever crosses it.
    if (passesUnder(town, ids[i], ids[j]) || passesUnder(town, ids[j], ids[i])) continue
    const room = apart(town.poseOf(ids[i]), TOY_SIZE[ids[i]], town.poseOf(ids[j]), TOY_SIZE[ids[j]])
    if (room < least.room) least = { room, pair: `${ids[i]}/${ids[j]}` }
  }
  return least
}

const whole = (pose: Pose): string => `${Math.round(pose.x)},${Math.round(pose.y)},${Math.round((pose.a * 180) / Math.PI)}`

/** Everything the town is at this moment, written down so that two towns can be compared. */
export function written(town: Town): Record<string, unknown> {
  return {
    saved: town.saved(),
    toys: Object.fromEntries(TOY_IDS.map((id) => {
      const body = town.bodies[id], doing = body.doing
      const what = doing.is === 'stand' ? `stand ${doing.as}` : doing.is === 'ride' ? `ride ${doing.kind} ${doing.gait} ${doing.rider.s} ${Math.round(doing.rider.d)} ${doing.rider.dir}` : doing.is === 'walk' ? `walk ${doing.gait} ${Math.round(doing.to.x)},${Math.round(doing.to.y)}` : doing.is === 'act' ? `act ${doing.name}` : doing.is
      return [id, { what, pose: whole(town.poseOf(id)), flight: body.flight !== null, hidden: body.hidden, hat: body.hatAt > -Infinity, leaf: body.leafAt > -Infinity, tapped: body.tappedAt > -Infinity, landed: body.landedAt > -Infinity }]
    })),
    hand: [town.pull !== null, town.grip !== null, town.hold !== null, town.finger !== null],
    short: [town.pressings.length, town.lifting.length, town.fx.length, town.playing, town.leader !== null, town.level],
    times: [town.rollPickedAt, town.rollBackAt, town.boxAt, town.catAt, town.basketAt, town.plantAt, town.ripAt, town.honkAt, town.bumpAt].map((at) => at > -Infinity),
    rolls: [...town.rollTurns],
    cut: false,
    sounds: town.takeSounds().map((sound) => sound.name),
  }
}

/** The town a load would make of what this one has saved. */
export function loaded(town: Town, seed = 1): Town {
  return new Town(deserializeTown(JSON.parse(JSON.stringify(town.saved())), 9), seed)
}

export { OUT_PLACE }

/** A touch that changes nothing on the floor: the cat on the rug. The town is as loud as it gets after it. */
export function nudge(town: Town): void {
  town.press({ x: 884, y: 762 })
  town.lift()
  town.takeSounds()
}

/**
 * A child at play, from a seed: pulls of every tape, toys carried about, taps, peels and the box, one thing
 * every second and a half. `each` is called after every frame.
 */
export function storm(town: Town, seed: number, seconds: number, each: () => void, withBox = true): void {
  let s = seed >>> 0
  const next = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
  const spot = (): Point => ({ x: town.field.x0 + 30 + next() * (town.field.x1 - town.field.x0 - 60), y: town.field.y0 + 30 + next() * (town.field.y1 - town.field.y0 - 60) })
  const frames = Math.round(seconds / DT)
  for (let f = 0; f < frames; f++) {
    if (f % 90 === 0) {
      const what = next()
      if (what < 0.12) { town.press({ x: 1092, y: 170 + Math.floor(next() * 4) * 130 }); town.lift() }
      else if (what < 0.5) drag(town, spot(), spot(), 6)
      else if (what < 0.75 && town.state.out) carry(town, TOY_IDS[Math.floor(next() * TOY_IDS.length)], spot())
      else if (what < 0.85 && town.state.out) { const at = town.poseOf(TOY_IDS[Math.floor(next() * TOY_IDS.length)]); town.press({ x: at.x, y: at.y }); town.lift() }
      else if (what < 0.9 && town.state.strips.length) { const strip = town.state.strips[Math.floor(next() * town.state.strips.length)]; drag(town, { x: strip.ax, y: strip.ay }, { x: strip.bx, y: strip.by }, 6) }
      else if (what < 0.94 && withBox) { town.press({ x: 120, y: 220 }); town.lift() }
      else { const at = spot(); town.press(at); town.lift() }
    }
    town.step(DT)
    each()
  }
}
