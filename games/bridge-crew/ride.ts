import type { Answer } from './frame'
import type { Strain } from './frame'
import type { Part } from './kit'
import type { Run, Step, Train } from './run'
import type { Site } from './sites'

// A run as it is watched: where the vehicle is at each moment, how the bridge
// lies under it, and how it sits on the road. Pure. The model's answer is
// computed once for the whole run (run.ts); this only reads it out in time.

/** How fast a vehicle drives, in cells a second. The same for every vehicle: nothing hurries. */
export const SPEED = 2.2
/** Where a waiting vehicle's front axle stands, in cells before the near lip, and how far behind it the next one waits. */
export const WAIT = { before: 0.8, apart: 3.4 } as const
/** Where a vehicle that has crossed parks: its front axle this far past the far lip, plus its own length. */
export const PARK = 1.1

/** The leading axle's x at a moment of the drive, which starts where the vehicle waited: at the near bank, or, homeward, in the lay-by on the far bank. */
export const frontAt = (at: Site, seconds: number, homeward = false): number => (homeward ? at.right[0] + PARK - SPEED * seconds : at.left[0] - WAIT.before + SPEED * seconds)

/** How far along a run's steps the leading axle at x is, before any limit: each half cell past the lip it set out from is a step. */
const along = (at: Site, x: number, homeward: boolean): number => (homeward ? at.right[0] - x : x - at.left[0]) / 0.5

/** How far a run got along its steps when the leading axle is at x: a whole number is a step, and the last step is the end of the run. */
export function stepAt(at: Site, run: Run, x: number, homeward = false): number {
  return Math.max(0, Math.min(run.steps.length - 1, along(at, x, homeward)))
}

/** True once the run's ending has been reached: the wheels are past the last step the model computed. */
export const ended = (at: Site, run: Run, x: number, homeward = false): boolean => along(at, x, homeward) >= run.steps.length - 1

/**
 * The bridge at a moment between two steps of a run: every node's
 * displacement and every part's strain, as the frame model answered them,
 * blended between the step before and the step after. After a crossing the
 * load is off the bridge and it lies as it does at rest (step 0).
 */
export function between(run: Run, progress: number): Answer & { use: number[]; strain: Strain[] } {
  // A step at which the build folded has no shape to read: a stay went slack and nothing holds. The bridge is read up
  // to the step before it, and what it folds into is the game's to show (it settles the bridge without the slack stays).
  if (run.ending.kind === 'folds') progress = Math.max(0, Math.min(progress, run.steps.length - 2))
  const low = Math.floor(progress), high = Math.min(run.steps.length - 1, low + 1), t = progress - low
  const a: Step = run.steps[low], b: Step = run.steps[high]
  const use = Array.from(a.use, (value, index) => value + (b.use[index] - value) * t)
  const strain = t < 0.5 ? a.strain : b.strain
  return {
    moved: (node) => [a.moved[2 * node] + (b.moved[2 * node] - a.moved[2 * node]) * t, a.moved[2 * node + 1] + (b.moved[2 * node + 1] - a.moved[2 * node + 1]) * t],
    parts: use.map((value, index) => ({ force: a.force[index] + (b.force[index] - a.force[index]) * t, bending: 0, use: value, strain: strain[index], spot: [0, 0] as const })),
    held: true,
    use, strain,
  }
}

/** The height of the way under a wheel at x, in cells: the bank's top off the bridge, and on it the road as it lies now, with the dip drawn larger by `drawn`. */
export function roadHeight(at: Site, run: Run, answer: Pick<Answer, 'moved'>, x: number, drawn: number): number {
  const { frame, road } = run
  if (x <= at.left[0] || road.nodes.length < 2) return at.left[1]
  if (x >= at.right[0] && road.complete) return at.right[1]
  for (let r = 0; r + 1 < road.nodes.length; r++) {
    const from = frame.nodes[road.nodes[r]], to = frame.nodes[road.nodes[r + 1]]
    if (x < from.x || x > to.x) continue
    const y0 = from.y + answer.moved(road.nodes[r])[1] * drawn, y1 = to.y + answer.moved(road.nodes[r + 1])[1] * drawn
    return y0 + ((y1 - y0) * (x - from.x)) / (to.x - from.x)
  }
  // Past the end of a road that reaches the far lip, the far bank; past the end of one that stops short, its last height.
  const last = frame.nodes[road.nodes[road.nodes.length - 1]]
  return road.complete ? at.right[1] : last.y + answer.moved(road.nodes[road.nodes.length - 1])[1] * drawn
}

/**
 * How a vehicle sits on the road: its front axle's place, each axle's height,
 * and the tilt of its body between the first axle and the last. `rail` and
 * `kerb` say what is under its wheels when the road is no flat plank: on a
 * stick it rides a rail, most of all with a wheel half way between two pins
 * (0 at a pin, 1 from a quarter of a cell in), and on a plank on edge a kerb.
 */
export type Seat = { x: number; y: number; tilt: number; axles: { x: number; y: number }[]; rail: number; kerb: number }

/** The part of the way a wheel at x stands on, and how far it is from the nearer of that piece's two pins: 0 on a pin, which counts as the piece before it. Null on a bank or off the way. */
function under(at: Site, run: Run, x: number): { part: number; in: number } | null {
  const { frame, road } = run
  if (x <= at.left[0] || x >= at.right[0]) return null
  for (let r = 0; r + 1 < road.nodes.length; r++) {
    const x0 = frame.nodes[road.nodes[r]].x, x1 = frame.nodes[road.nodes[r + 1]].x
    if (x >= x0 && x <= x1) return { part: road.parts[r], in: Math.min(x - x0, x1 - x) }
  }
  return null
}

export function seat(at: Site, run: Run, answer: Pick<Answer, 'moved'>, train: Train, x: number, drawn: number, homeward = false, parts: readonly Part[] = []): Seat {
  const axles = train.map((axle) => { const ax = homeward ? x + axle.behind : x - axle.behind; return { x: ax, y: roadHeight(at, run, answer, ax, drawn) } })
  const first = axles[0], last = axles[axles.length - 1]
  const tilt = axles.length > 1 && first.x !== last.x ? Math.atan2(first.y - last.y, first.x - last.x) : 0
  let rail = 0, kerb = 0
  for (const axle of axles) {
    const on = under(at, run, axle.x), part = on ? parts[on.part] : undefined
    if (!on || !part) continue
    if (part.kind === 'stick') rail = Math.max(rail, Math.min(1, on.in * 4))
    if (part.kind === 'plank' && part.turned) kerb = 1
  }
  return { x, y: first.y, tilt, axles, rail, kerb }
}

/** How long a crossing drive lasts from the bank to the lay-by on the far side, in seconds. */
export function crossingTime(at: Site, train: Train): number {
  const long = Math.max(...train.map((axle) => axle.behind))
  return (at.right[0] + PARK + long - (at.left[0] - WAIT.before)) / SPEED
}

/**
 * The share of its strength a part has in use at which it is first heard to
 * creak, and again, and again, before it gives: each part creaks once as its
 * strain passes each of these on the way up.
 */
export const CREAK_AT = [0.15, 0.5, 0.75, 0.9] as const

/** The creaks due between two moments of a run: for each part whose strain rose past a threshold, the share it has reached. */
export function creaks(before: readonly number[], now: readonly number[]): { part: number; use: number }[] {
  const due: { part: number; use: number }[] = []
  now.forEach((use, part) => { if (CREAK_AT.some((threshold) => (before[part] ?? 0) < threshold && use >= threshold)) due.push({ part, use }) })
  return due
}

/** One computed step read as the frame model's answer, for whatever lies under a standing load. */
export function answerOf(step: Step): Answer & { use: number[] } {
  const use = Array.from(step.use)
  return {
    moved: (node) => [step.moved[2 * node], step.moved[2 * node + 1]],
    parts: use.map((value, index) => ({ force: step.force[index], bending: 0, use: value, strain: step.strain[index], spot: [0, 0] as const })),
    held: true,
    use,
  }
}
