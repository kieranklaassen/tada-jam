import type { Segment } from './flow'

// Water visibly runs (KTD3). When the build changes, new stretches fill from
// the point nearest the spring at a steady speed, and stretches that lost
// their water drain downstream the same way. Each segment carries the time
// its head arrives and the time its head departs; the shader derives every
// point along it from those two numbers, so nothing is animated on the CPU.

export const WATER_SPEED = 2.4
/** How long a drained segment lingers after its tail has gone, before it is dropped. */
export const DRAIN_LINGER = 0.4
export const NEVER = 1e6

export type TimedSegment = Segment & { tArrive: number; tDepart: number }

export type Retimed = {
  segments: TimedSegment[]
  /** Distance where new water starts running (Infinity if nothing new). */
  dFresh: number
  /** Distance where cut water starts draining (Infinity if nothing was cut). */
  dCut: number
}

export function arriveAt(segment: Pick<TimedSegment, 'tArrive' | 'd0'>, d: number, speed = WATER_SPEED): number {
  return segment.tArrive + (d - segment.d0) / speed
}

export function departAt(segment: Pick<TimedSegment, 'tDepart' | 'd0'>, d: number, speed = WATER_SPEED): number {
  return segment.tDepart >= NEVER ? NEVER : segment.tDepart + (d - segment.d0) / speed
}

export function drained(segment: TimedSegment, now: number, speed = WATER_SPEED): boolean {
  return segment.tDepart < NEVER && now > departAt(segment, segment.d1, speed) + DRAIN_LINGER
}

export function retime(previous: readonly TimedSegment[], next: readonly Segment[], now: number, speed = WATER_SPEED): Retimed {
  const live = new Map<string, TimedSegment>()
  for (const segment of previous) if (segment.tDepart >= NEVER) live.set(segment.key, segment)
  const nextKeys = new Set(next.map((segment) => segment.key))

  let dFresh = Infinity
  for (const segment of next) if (!live.has(segment.key)) dFresh = Math.min(dFresh, segment.d0)
  let dCut = Infinity
  for (const segment of live.values()) if (!nextKeys.has(segment.key)) dCut = Math.min(dCut, segment.d0)

  const segments: TimedSegment[] = next.map((segment) => {
    const kept = live.get(segment.key)
    return { ...segment, tArrive: kept ? kept.tArrive : now + (segment.d0 - dFresh) / speed, tDepart: NEVER }
  })
  for (const segment of previous) {
    if (nextKeys.has(segment.key)) continue
    if (segment.tDepart >= NEVER) segments.push({ ...segment, tDepart: now + (segment.d0 - dCut) / speed })
    else if (!drained(segment, now, speed)) segments.push(segment)
  }
  return { segments, dFresh, dCut }
}

/** Everything live, already arrived: used when a saved garden opens with its water running. */
export function settled(next: readonly Segment[], now: number): TimedSegment[] {
  return next.map((segment) => ({ ...segment, tArrive: now - 60, tDepart: NEVER }))
}
