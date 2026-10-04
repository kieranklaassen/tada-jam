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
 * Whether the crew chief shows this sheet's idea now. The child tries first:
 * it comes at the first failed run of the job vehicle, from its second on,
 * whose failure is one the idea answers; or, if the job vehicle crosses before
 * any such run, at the end of that crossing, once the vehicle has parked. A
 * position whose one new thing is not an idea (a vehicle, the barge, the thin
 * kit, the longest gap, the free yard) has no neat way. An idea a cycle ends
 * without showing is still owed the next time its position is laid out, since
 * only a showing marks it shown. `tries` counts the job vehicle's failed runs
 * on this sheet, this one included; `byJob` says whose run it was.
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

/** One way two designs differ at one place: a part added, left out, moved, turned, or changed for another kind. */
export type Difference = { what: 'added' | 'left-out' | 'moved' | 'turned' | 'changed'; kind: Kind; at: readonly [number, number] }

const middle = (p: Part): [number, number] => [(p.a[0] + p.b[0]) / 2, (p.a[1] + p.b[1]) / 2]
const sharesPin = (p: Part, q: Part) => [p.a, p.b].some((e) => [q.a, q.b].some((f) => e[0] === f[0] && e[1] === f[1]))

/**
 * The two things the chief's two small models differ in, when it shows one
 * clean comparison: two of the differences between the child's bridge and the
 * tracing, the two nearest the trolley. The models are never the child's
 * bridge. `x` is where the trolley stands.
 */
export function nearestDifferences(bridge: readonly Part[], tracing: readonly Part[], x: number): Difference[] {
  const onlyBridge = bridge.filter((p) => !tracing.some((q) => same(p, q))), onlyTracing = tracing.filter((q) => !bridge.some((p) => same(p, q)))
  const found: Difference[] = [], used = new Set<Part>()
  for (const p of onlyBridge) {
    // The same span in both designs: the part was turned (or hangs loose), or was changed for another kind.
    const twin = onlyTracing.find((q) => !used.has(q) && sameSpan(p, q))
    if (twin) { used.add(twin); found.push({ what: twin.kind === p.kind ? 'turned' : 'changed', kind: p.kind, at: middle(p) }); continue }
    // The same kind on a neighbouring span, one end still on the same pin: the part was moved.
    const from = onlyTracing.find((q) => !used.has(q) && q.kind === p.kind && sharesPin(p, q) && !onlyBridge.some((other) => other !== p && sameSpan(other, q)))
    if (from) { used.add(from); found.push({ what: 'moved', kind: p.kind, at: middle(p) }); continue }
    found.push({ what: 'added', kind: p.kind, at: middle(p) })
  }
  for (const q of onlyTracing) if (!used.has(q)) found.push({ what: 'left-out', kind: q.kind, at: middle(q) })
  return found.sort((d, e) => Math.abs(d.at[0] - x) - Math.abs(e.at[0] - x)).slice(0, 2)
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

/**
 * Feedback thins with practice: once a sheet's own vehicle has crossed, only a
 * part within a fifth of its limit shows its strain. A change to the bridge
 * does not bring the fuller feedback back. What is saved names who has crossed
 * the bridge as it stands, so after a change this is read from the designed
 * order itself. The newest sheet: its cycle was judged and not badly, which
 * its count of failed runs still says. A sheet on the rack (`later` is how far
 * the position had moved when the next sheet was laid out, and whether it was
 * at an end of the order where it cannot move): it was crossed if the position
 * went up or stayed, and not if it went down; at an end of the order, where
 * staying says nothing, the fuller feedback is kept.
 */
export function strainThinned(job: string, sheet: { crossed: readonly string[]; home: boolean }, later: { moved: number; atEnd: boolean } | null, finished: boolean, tries: number): boolean {
  if (sheet.crossed.includes(job) || sheet.home) return true
  if (later === null) return finished && !givenUpOn(tries)
  return later.moved > 0 || (later.moved === 0 && !later.atEnd)
}

/** For a sheet on the rack: how far the position had moved when the sheet after it was laid out. Null for the newest sheet. */
export function movedAfter(sites: readonly string[], on: number): { moved: number; atEnd: boolean } | null {
  if (on >= sites.length - 1) return null
  const here = LADDER.indexOf(sites[on]), next = LADDER.indexOf(sites[on + 1])
  return { moved: next - here, atEnd: here <= 0 || here >= LADDER.length - 1 }
}
