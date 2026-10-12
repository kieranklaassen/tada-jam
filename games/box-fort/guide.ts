import { goneShare } from './face'
import { rects } from './fort'
import type { FortState } from './fortState'
import { handPose, type HandPose } from './guidance'
import { FRONT_Z, SCISSORS_REST, SWITCH, type Vec } from './layout'
import { flapShows, lidSpot } from './targets'
import type { Toy } from './toy'

// What the idle ladder shows: the scissors wriggle where they lie, and then a
// ghost hand takes them to a box and goes once round a window on its face. It
// shows how a cut is made and where one can go, never a shape to copy: the
// window is a square with soft corners, as a hand draws one, and nothing is
// cut by it. Two more moves are shown once each in a visit, in place of the
// window, and only until the child has made them: once a hole is cut, the
// hand takes a box by its lid and carries it a little way, which is how a
// child tells carrying from cutting; and once two boxes stand with a hole in
// one, the hand presses the wall switch. The blanket, the cushions, the tape
// and the lights are furniture until the child finds them. The ladder backs
// off and stops (guidance.ts), so it never nags.

export type HandAt = { at: Vec; /** How far round the window the hand has gone, 0 to 1. */ round: number; centre: Vec; radius: number }

/** The share of the hand's travel spent getting from the scissors to the face. */
export const REACH = 0.3

/** The standing box with the most board left, or null when no face has room for a cut. */
export function roomiest(state: FortState): number | null {
  let best: number | null = null, least = 0.6
  for (const rect of rects(state)) {
    if (rect.side) continue
    const gone = goneShare(state.boxes[rect.id].face)
    if (gone < least) { least = gone; best = rect.id }
  }
  return best
}

/** A place on the window the hand draws, `round` of the way round it (0 to 1): a closed shape, a square with soft corners. */
export function windowAt(centre: Vec, radius: number, round: number, out: Vec): Vec {
  const angle = round * Math.PI * 2, c = Math.cos(angle), s = Math.sin(angle)
  out.x = centre.x + Math.sign(c) * Math.sqrt(Math.abs(c)) * radius
  out.y = centre.y + Math.sign(s) * Math.sqrt(Math.abs(s)) * radius * 0.86
  out.z = centre.z
  return out
}

/** Where the ghost hand is at `travel` (0 to 1) of its move, or null when there is no board to show it on. */
export function handAt(state: FortState, travel: number, out: HandAt): HandAt | null {
  const id = roomiest(state)
  if (id === null) return null
  const rect = rects(state).find((box) => box.id === id)!
  out.radius = rect.h * 0.24
  out.centre = { x: rect.x + rect.w * 0.18, y: rect.foot + rect.h * 0.52, z: FRONT_Z + 0.06 }
  const start = windowAt(out.centre, out.radius, 0, { x: 0, y: 0, z: 0 })
  if (travel < REACH) {
    const t = travel / REACH, s = t * t * (3 - 2 * t)
    out.round = 0
    out.at = { x: SCISSORS_REST.x + (start.x - SCISSORS_REST.x) * s, y: SCISSORS_REST.y + (start.y - SCISSORS_REST.y) * s + Math.sin(s * Math.PI) * 0.25, z: SCISSORS_REST.z + (start.z - SCISSORS_REST.z) * s }
    return out
  }
  out.round = (travel - REACH) / (1 - REACH)
  out.at = windowAt(out.centre, out.radius, out.round, { x: 0, y: 0, z: 0 })
  return out
}

/** What a demonstration shows. */
export type Demo = 'cut' | 'carry' | 'switch'

const holed = (state: FortState): boolean => rects(state).some((rect) => goneShare(state.boxes[rect.id].face) > 0)

/** The box the hand would carry: the smallest that shows its lid, or null. */
export function carriable(toy: Toy): number | null {
  const free = rects(toy.state).filter((rect) => flapShows(toy, rect) && !(toy.state.gran.at === 'in' && toy.state.gran.box === rect.id))
  return free.length > 0 ? free.sort((a, b) => a.w - b.w || b.id - a.id)[0].id : null
}

/** What the next demonstration shows: the carry once after the first hole, the switch once when two boxes stand with a hole in one, and the cut otherwise. */
export function nextDemo(toy: Toy): Demo {
  const state = toy.state
  if (holed(state) && !toy.shown.has('carry') && !toy.taken.has('box') && carriable(toy) !== null) return 'carry'
  if (holed(state) && rects(state).length >= 2 && !state.dark && !toy.shown.has('switch') && !toy.taken.has('switch')) return 'switch'
  return 'cut'
}

export type DemoHand = { at: Vec; press: number; opacity: number; /** What is drawn behind the hand: the window it has gone round so far, the way it has carried, or nothing. */ trail: 'window' | 'line' | 'none'; from: Vec; window: HandAt }

const poseOut: HandPose = { travel: 0, press: 0, opacity: 0 }

/** Where the ghost hand is `progress` (0 to 1) of the way through a demonstration, or null when there is nothing to show it on. */
export function demoHand(toy: Toy, demo: Demo, progress: number, out: DemoHand): DemoHand | null {
  if (demo === 'switch') {
    // One press on the switch.
    const pose = handPose(progress, false, poseOut, 1)
    Object.assign(out, { at: { x: SWITCH.x, y: SWITCH.y - 0.02, z: SWITCH.z + 0.2 }, press: pose.press, opacity: pose.opacity, trail: 'none' })
    return out
  }
  const pose = handPose(progress, true, poseOut)
  out.press = pose.press
  out.opacity = pose.opacity
  if (demo === 'carry') {
    const id = carriable(toy)
    if (id === null) return null
    // It takes the box by its lid and carries it up and a little to the side. Nothing is moved by it.
    const lid = lidSpot(toy, id).at, way = lid.x > 0.4 ? -1 : 1
    out.from = { x: lid.x, y: lid.y, z: lid.z + 0.06 }
    out.at = { x: lid.x + way * 0.55 * pose.travel, y: lid.y + Math.sin(pose.travel * Math.PI * 0.5) * 0.4, z: lid.z + 0.06 }
    out.trail = 'line'
    return out
  }
  const window = handAt(toy.state, pose.travel, out.window)
  if (!window) return null
  out.at = window.at
  out.trail = 'window'
  return out
}
