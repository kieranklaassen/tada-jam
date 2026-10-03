import { LADDER } from './config'
import { sameSpan, type Kind, type Part } from './kit'
import type { Ending } from './run'
import { VARIANTS, site, type Idea } from './sites'
import type { CycleOutcome } from './state'

// The designed order as rules: how a cycle is judged, which sheet a position
// lays out, and when each idea gets its one showing (ART.md, "The designed
// order" and "The scenes"). Pure. Nothing here is ever shown to the child.

/** Failed runs of the job vehicle: up to `well` the cycle went well, up to `mixed` it was mixed, and at `badly` it is judged without a crossing. */
export const JUDGE = { well: 3, mixed: 7, badly: 8 } as const

/** How a cycle went when its job vehicle crossed after this many failed runs. */
export const crossedOutcome = (tries: number): CycleOutcome => (tries <= JUDGE.well ? 'well' : tries <= JUDGE.mixed ? 'mixed' : 'badly')

/** True when this many failed runs end the cycle without a crossing, so that a way back in arrives. */
export const givenUpOn = (tries: number): boolean => tries >= JUDGE.badly

/**
 * The sheet a position lays out now: its variants are taken in turn, by how
 * often the position has been laid out before. The free yard is the last
 * position, and it comes back each time in its next form.
 */
export function layOut(position: string, laid: Readonly<Record<string, number>>): { site: string; variant: number } {
  const site = LADDER.includes(position) ? position : LADDER[0]
  return { site, variant: (laid[site] ?? 0) % VARIANTS }
}

/** Ideas that get one showing: the eight of the kit, and the fair test. */
export type Showing = Idea | 'one-change'

/**
 * Whether the crew chief shows this sheet's idea now. The child tries first,
 * and every idea gets its one showing: it comes at the second failed run of
 * the job vehicle, when the run failed in the way the idea answers; or, if
 * the job vehicle crosses before that, at the end of that crossing, once the
 * vehicle has parked. It never comes twice. `tries` counts the job vehicle's
 * failed runs on this sheet, this one included; `byJob` says whose run it was.
 */
export function neatWayDue(idea: Idea | null, tries: number, ending: Ending, anyLoose: boolean, shown: readonly Showing[], byJob = true): boolean {
  if (idea === null || shown.includes(idea) || !byJob) return false
  if (ending.kind === 'crossed') return true
  if (tries < 2) return false
  switch (idea) {
    // A plank on edge answers a plank that cracked in bending.
    case 'profile': return ending.kind === 'gives' && ending.strain === 'bend'
    // A prop, a triangle, a row of triangles, a wide base and an arch all answer a shape that would not hold.
    case 'prop': case 'triangle': case 'row': case 'wide-base': case 'arch': return anyLoose || ending.kind === 'folds' || ending.kind === 'road-ends'
    // A tube answers a long part that bowed under squeeze.
    case 'tube': return ending.kind === 'gives' && ending.strain === 'bow'
    // A thread answers a part that gave with nothing above to hang from, or a shape that would not hold.
    case 'thread': return ending.kind === 'gives' || anyLoose || ending.kind === 'folds'
  }
}

const same = (p: Part, q: Part) => p.kind === q.kind && p.turned === q.turned && p.loose === q.loose && sameSpan(p, q)

/** How many parts two designs differ in: a part in one and not in the other, or the same part turned, counts once. */
export function differences(a: readonly Part[], b: readonly Part[]): number {
  const onlyA = a.filter((p) => !b.some((q) => same(p, q))), onlyB = b.filter((q) => !a.some((p) => same(p, q)))
  // The same span in both, of another kind or turned over, is one change and not two.
  const swapped = onlyA.filter((p) => onlyB.some((q) => sameSpan(p, q))).length
  return onlyA.length + onlyB.length - swapped
}

/** A comparison is fair when the two designs differ in one part: the same load at the same place then shows what that part does. */
export const isFairTest = (bridge: readonly Part[], tracing: readonly Part[]): boolean => differences(bridge, tracing) === 1

/** Whether the chief shows one clean comparison now: the child has just run a load over a bridge with a tracing that differs in more than one part. */
export const oneChangeDue = (bridge: readonly Part[], tracing: readonly Part[], shown: readonly Showing[]): boolean =>
  !shown.includes('one-change') && differences(bridge, tracing) > 1

/**
 * The two things the chief's two small models differ in, when it shows one
 * clean comparison: the kinds of part in which the child's bridge and tracing
 * differ, at most two of them. The models are never the child's bridge.
 */
export function differingKinds(bridge: readonly Part[], tracing: readonly Part[]): Kind[] {
  const kinds: Kind[] = []
  for (const part of [...bridge.filter((p) => !tracing.some((q) => same(p, q))), ...tracing.filter((q) => !bridge.some((p) => same(p, q)))]) {
    if (!kinds.includes(part.kind)) kinds.push(part.kind)
  }
  return kinds.slice(0, 2)
}

/**
 * The small model that stands in the margin of a sheet: once an idea has had
 * its showing, the model of it stands on every sheet of that position. It is
 * rebuilt from `shown` and the sheet's position id, so nothing more is saved.
 */
export function modelInMargin(position: string, shown: readonly Showing[]): Idea | null {
  const idea = site(position, 0).idea
  return idea !== null && shown.includes(idea) ? idea : null
}
