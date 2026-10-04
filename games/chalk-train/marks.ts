import { WORK, lengths, resample } from './path'
import { onTar, type Pt } from './yard'

// A chalk mark, and what kind of mark it is. The child never picks a kind:
// it is read from the shape after the mark is made. A mark is kept as it was
// drawn, only evened out to points a fixed step apart in whole tar units.

/** One chalk mark: its colour, an index into the five pastels, and its points. */
export type Mark = { c: number; p: Pt[] }

export const KINDS = ['tap', 'line', 'zigzag', 'loop', 'scribble'] as const
export type MarkKind = (typeof KINDS)[number]

/** The gap between a mark's points, in tar units. */
export const STEP = 12
/** How much chalk the tar holds: this many marks and this many points in all. */
export const MAX_MARKS = 14
export const MAX_POINTS = 1200
/** One mark holds this many points; a finger that keeps going starts another mark where this one ended. */
export const MAX_MARK_POINTS = 160
export const CHALK_COUNT = 5

/** Shorter than this, a mark is a tap. */
const TAP_LENGTH = 18
/** A turn this sharp, in radians, over two steps each side is a corner. */
const CORNER = (70 * Math.PI) / 180
/** A scribble is at least this long, and this many times longer than the box it fits in is across. */
const SCRIBBLE_LENGTH = 160
const SCRIBBLE_CROWD = 3.3
/** A mark whose turning is this much one way goes round and round; one wider than a spot, corner to corner, is then no scribble. */
const ONE_WAY = 0.8
const SPOT = 200
/** A stretch counts as a straight run from this length, when it is this close to its own chord. */
const RUN_STEPS = 14
const RUN_TRUE = 0.97
/** A line whose two ends are this close, having gone round, is a ring. */
const RING_GAP = 45
const RING_LENGTH = 200
const ROUND = (250 * Math.PI) / 180
const LOOP_ROUND = (200 * Math.PI) / 180

/** A stretch of a mark, by distance along it. */
export type Span = { from: number; to: number }

/** What a mark's shape says. Distances are along the mark from its first point. */
export type Reading = {
  kind: MarkKind
  length: number
  /** Where the sharp corners are. */
  corners: number[]
  /** Where the line crosses itself going round. */
  loops: Span[]
  /** The long straight stretches. */
  runs: Span[]
  /** The two ends meet after going round. */
  ring: boolean
}

/** The mark as it is kept: on the tar, evened to the step, in whole units, and no longer than one mark may be. */
export function tidy(raw: readonly Pt[]): Pt[] {
  const even = resample(raw.map(onTar), STEP).slice(0, MAX_MARK_POINTS)
  return even.map((p) => ({ x: Math.round(p.x), y: Math.round(p.y) }))
}

const wrap = (a: number): number => {
  let t = a
  while (t > Math.PI) t -= Math.PI * 2
  while (t < -Math.PI) t += Math.PI * 2
  return t
}

function crosses(a: Pt, b: Pt, c: Pt, d: Pt): boolean {
  const side = (p: Pt, q: Pt, r: Pt) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)
  const d1 = side(c, d, a), d2 = side(c, d, b), d3 = side(a, b, c), d4 = side(a, b, d)
  return d1 > 0 !== d2 > 0 && d3 > 0 !== d4 > 0
}

/** Reads a tidied mark. */
export function readMark(p: readonly Pt[]): Reading {
  const { each, total } = lengths(p)
  const reading: Reading = { kind: 'tap', length: total, corners: [], loops: [], runs: [], ring: false }
  if (total < TAP_LENGTH) return reading
  const along: number[] = [0]
  for (const d of each) along.push(along[along.length - 1] + d)
  const heading = each.map((_, i) => Math.atan2(p[i + 1].y - p[i].y, p[i + 1].x - p[i].x))
  const n = p.length

  // Corners: the sharpest point of each sharp turn, with the way it turns.
  const turns: { at: number; sharp: number }[] = []
  let best: { i: number; sharp: number; turn: number } | null = null
  for (let i = 2; i < n - 2; i++) {
    const turn = wrap(Math.atan2(p[i + 2].y - p[i].y, p[i + 2].x - p[i].x) - Math.atan2(p[i].y - p[i - 2].y, p[i].x - p[i - 2].x))
    const sharp = Math.abs(turn)
    if (sharp >= CORNER) {
      if (!best || sharp > best.sharp) best = { i, sharp, turn }
    } else if (best) {
      turns.push({ at: along[best.i], sharp: Math.sign(best.turn) })
      best = null
    }
  }
  if (best) turns.push({ at: along[best.i], sharp: Math.sign(best.turn) })
  reading.corners = turns.map((t) => t.at)

  // Loops: the line crosses a stretch it drew earlier, having turned most of the way round between.
  for (let i = 0; i < n - 3; i++) {
    for (let j = i + 2; j < n - 1; j++) {
      WORK.pairs++
      if (!crosses(p[i], p[i + 1], p[j], p[j + 1])) continue
      let round = 0
      for (let k = i + 1; k <= j; k++) round += wrap(heading[k] - heading[k - 1])
      if (Math.abs(round) >= LOOP_ROUND) {
        reading.loops.push({ from: along[i], to: along[j + 1] })
        i = j
      }
      break
    }
  }

  // Straight runs: windows that hardly leave their own chord, joined where they overlap.
  for (let i = 0; i + RUN_STEPS < n; i++) {
    const chord = Math.hypot(p[i + RUN_STEPS].x - p[i].x, p[i + RUN_STEPS].y - p[i].y)
    if (chord / (along[i + RUN_STEPS] - along[i]) < RUN_TRUE) continue
    const last = reading.runs[reading.runs.length - 1]
    if (last && along[i] <= last.to) last.to = along[i + RUN_STEPS]
    else reading.runs.push({ from: along[i], to: along[i + RUN_STEPS] })
  }

  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity
  for (const q of p) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y) }
  const across = Math.max(1, Math.hypot(x1 - x0, y1 - y0))
  let whole = 0, turning = 0
  for (let k = 1; k < heading.length; k++) {
    const turn = wrap(heading[k] - heading[k - 1])
    whole += turn
    turning += Math.abs(turn)
  }
  // A lot of chalk in a small place is a scribble. Round and round on one spot is one too; but a mark that goes
  // round and round one way and is wider than a spot is a ring gone round more than once, however much chalk it
  // took, and is read as a loop.
  const roundAndRound = across > SPOT && Math.abs(whole) >= ROUND && Math.abs(whole) >= turning * ONE_WAY
  const scribble = total >= SCRIBBLE_LENGTH && total / across >= SCRIBBLE_CROWD && !roundAndRound
  const ends = Math.hypot(p[n - 1].x - p[0].x, p[n - 1].y - p[0].y)
  reading.ring = !scribble && total >= RING_LENGTH && ends <= RING_GAP && Math.abs(whole) >= ROUND

  // A zigzag has at least two corners, and turns one way and then the other.
  let back = 0
  for (let k = 1; k < turns.length; k++) if (turns[k].sharp !== turns[k - 1].sharp) back++
  reading.kind = scribble ? 'scribble' : reading.loops.length > 0 || reading.ring ? 'loop' : back >= 1 && turns.length >= 2 ? 'zigzag' : 'line'
  return reading
}

/** Sleepers lie this far apart along a mark, from this far in, and stop this short of its end. */
export const SLEEPER_GAP = 34
export const SLEEPER_FIRST = 18
export const SLEEPER_END = 8
/** While a line is being drawn, its sleepers tick into place this far behind the chalk. */
export const SLEEPERS_BEHIND = 40
/** How many sleepers lie on `total` units of a mark: three or more, which is a rail, or none. */
export const sleepersOn = (total: number): number => (total - SLEEPER_END > SLEEPER_FIRST + SLEEPER_GAP * 2 ? Math.ceil((total - SLEEPER_END - SLEEPER_FIRST) / SLEEPER_GAP) : 0)

/** The colour the mark after this one takes. */
export const nextChalk = (c: number): number => (c + 1) % CHALK_COUNT

/** Lays a mark on the tar. Past the cap the oldest marks are rubbed out, oldest first. */
export function addMark(marks: readonly Mark[], mark: Mark): Mark[] {
  const next = [...marks, mark]
  const points = () => next.reduce((sum, m) => sum + m.p.length, 0)
  while (next.length > 1 && (next.length > MAX_MARKS || points() > MAX_POINTS)) next.shift()
  return next
}

/**
 * How strongly a mark shows, 1 for fresh chalk. The oldest mark grows paler
 * in two steps as the last marks before a cap are made, so the one that goes
 * next is the palest on the tar, and no other mark changes as chalk is added.
 * There are two caps, and it pales toward whichever is nearer: the count of
 * marks, and the points on the tar, where `points` is how many there are now
 * and a long mark more would push the oldest off.
 */
export function strength(index: number, count: number, points = 0): number {
  const newer = count - 1 - index, spare = MAX_POINTS - points
  const byCount = newer >= MAX_MARKS - 1 ? 0.45 : newer === MAX_MARKS - 2 ? 0.7 : 1
  const byPoints = index !== 0 || count < 2 ? 1 : spare < MAX_MARK_POINTS ? 0.45 : spare < MAX_MARK_POINTS * 2 ? 0.7 : 1
  return Math.min(byCount, byPoints)
}
