import type { BuiltCreature } from './creatures'
import { LAMP, PIN_HEIGHT, shadowScale, STAGE, type CardPose } from './projection'
import { SHAPES, type ShapeKind } from './shapes'

// How much of the sleeping outline the shadows fill, and how much shadow
// spills onto the rest of the screen. Coverage inverse-projects sample
// points into each card's own plane and asks the card's analytic inside test,
// so it is exact for cards parallel to the screen. A meter owns its scratch
// buffers and allocates nothing per evaluation.

export type Placed = { kind: ShapeKind; pose: CardPose }

export type CoverageResult = {
  /** Fraction of the outline's inside that is in shadow, 0..1. */
  fill: number
  /** Area of shadow outside the outline, as a fraction of the outline's area. */
  spill: number
}

export type WakeRule = { fill: number; spill: number }

/** Generous at the young end of the band; a little crisper for older children. */
export function wakeRuleForAge(childAge: number | null): WakeRule {
  const age = childAge ?? 7
  return age <= 7 ? { fill: 0.72, spill: 0.6 } : { fill: 0.8, spill: 0.55 }
}

export function wakes(result: CoverageResult, rule: WakeRule): boolean {
  return result.fill >= rule.fill && result.spill <= rule.spill
}

/** A little below the wake line the creature stirs in its sleep. */
export function stirLevel(result: CoverageResult, rule: WakeRule): number {
  return Math.max(0, Math.min(1, (result.fill - rule.fill * 0.55) / (rule.fill * 0.45)))
}

const MAX_SHAPES = 8

export class CoverageMeter {
  readonly creature: BuiltCreature
  /** Per outline dot: 1 when the dot sits in shadow. */
  readonly dotCovered: Uint8Array
  private readonly insideHits: Uint8Array
  private readonly outsideHits: Uint8Array
  private readonly k = new Float64Array(MAX_SHAPES)
  private readonly cos = new Float64Array(MAX_SHAPES)
  private readonly sin = new Float64Array(MAX_SHAPES)
  private readonly px = new Float64Array(MAX_SHAPES)
  private readonly bx0 = new Float64Array(MAX_SHAPES)
  private readonly bx1 = new Float64Array(MAX_SHAPES)
  private readonly by0 = new Float64Array(MAX_SHAPES)
  private readonly by1 = new Float64Array(MAX_SHAPES)
  private readonly tests: ((u: number, v: number) => boolean)[] = []

  constructor(creature: BuiltCreature) {
    this.creature = creature
    this.dotCovered = new Uint8Array(creature.dots.length)
    this.insideHits = new Uint8Array((creature.inside.length / 2) * MAX_SHAPES)
    this.outsideHits = new Uint8Array((creature.outside.length / 2) * MAX_SHAPES)
  }

  private prepare(placed: readonly Placed[]): number {
    const n = Math.min(MAX_SHAPES, placed.length)
    for (let i = 0; i < n; i++) {
      const { kind, pose } = placed[i]
      const spec = SHAPES[kind]
      const k = shadowScale(pose.z)
      this.k[i] = k
      this.cos[i] = Math.cos(pose.angle)
      this.sin[i] = Math.sin(pose.angle)
      this.px[i] = pose.x
      // Shadow bounds from the card's bounding circle.
      const c = this.cos[i]
      const s = this.sin[i]
      const cu = spec.center.x * c - spec.center.y * s
      const cv = spec.center.x * s + spec.center.y * c
      const sx = LAMP.x + (pose.x + cu - LAMP.x) * k
      const sy = LAMP.y + (PIN_HEIGHT + cv - LAMP.y) * k
      const r = spec.radius * k + 0.01
      this.bx0[i] = sx - r
      this.bx1[i] = sx + r
      this.by0[i] = sy - r
      this.by1[i] = sy + r
      this.tests[i] = spec.inside
    }
    return n
  }

  private covers(i: number, sx: number, sy: number): boolean {
    if (sx < this.bx0[i] || sx > this.bx1[i] || sy < this.by0[i] || sy > this.by1[i]) return false
    const k = this.k[i]
    const ru = LAMP.x + (sx - LAMP.x) / k - this.px[i]
    const rv = LAMP.y + (sy - LAMP.y) / k - PIN_HEIGHT
    const c = this.cos[i]
    const s = this.sin[i]
    return this.tests[i](ru * c + rv * s, -ru * s + rv * c)
  }

  private coveredByAny(n: number, sx: number, sy: number): boolean {
    for (let i = 0; i < n; i++) if (this.covers(i, sx, sy)) return true
    return false
  }

  /** Fill and spill for these placements; also refreshes `dotCovered`. */
  measure(placed: readonly Placed[], out: CoverageResult): CoverageResult {
    const n = this.prepare(placed)
    const { inside, outside, dots, area, outsideCell } = this.creature
    let hit = 0
    for (let s = 0; s < inside.length; s += 2) if (this.coveredByAny(n, inside[s], inside[s + 1])) hit++
    let spilled = 0
    for (let s = 0; s < outside.length; s += 2) if (this.coveredByAny(n, outside[s], outside[s + 1])) spilled++
    for (let d = 0; d < dots.length; d++) this.dotCovered[d] = this.coveredByAny(n, dots[d].x, dots[d].y) ? 1 : 0
    out.fill = inside.length > 0 ? (hit * 2) / inside.length : 0
    out.spill = (spilled * outsideCell * outsideCell) / Math.max(1, area)
    return out
  }

  /** Per-shape hit tables for the hint search. */
  private tabulate(placed: readonly Placed[]): number {
    const n = this.prepare(placed)
    const { inside, outside } = this.creature
    const ni = inside.length / 2
    const no = outside.length / 2
    for (let i = 0; i < n; i++) {
      for (let s = 0; s < ni; s++) this.insideHits[i * ni + s] = this.covers(i, inside[s * 2], inside[s * 2 + 1]) ? 1 : 0
      for (let s = 0; s < no; s++) this.outsideHits[i * no + s] = this.covers(i, outside[s * 2], outside[s * 2 + 1]) ? 1 : 0
    }
    return n
  }

  /**
   * Score of one shape standing at `pose` given where the others are: the
   * inside it alone would shade, minus a softer penalty for the spill it
   * alone would add. Sample tables come from `beginSearch`.
   */
  private soloScore(index: number, n: number, pose: CardPose): number {
    const kind = this.searchKinds[index]
    const spec = SHAPES[kind]
    const k = shadowScale(pose.z)
    const c = Math.cos(pose.angle)
    const s = Math.sin(pose.angle)
    const cu = spec.center.x * c - spec.center.y * s
    const cv = spec.center.x * s + spec.center.y * c
    const cx = LAMP.x + (pose.x + cu - LAMP.x) * k
    const cy = LAMP.y + (PIN_HEIGHT + cv - LAMP.y) * k
    const r = spec.radius * k
    const { inside, outside, insideCell, outsideCell } = this.creature
    const ni = inside.length / 2
    const no = outside.length / 2
    let gained = 0
    for (let q = 0; q < ni; q++) {
      const sx = inside[q * 2]
      const sy = inside[q * 2 + 1]
      if (Math.abs(sx - cx) > r || Math.abs(sy - cy) > r) continue
      let others = false
      for (let j = 0; j < n; j++) if (j !== index && this.insideHits[j * ni + q]) others = true
      if (others) continue
      const ru = LAMP.x + (sx - LAMP.x) / k - pose.x
      const rv = LAMP.y + (sy - LAMP.y) / k - PIN_HEIGHT
      if (spec.inside(ru * c + rv * s, -ru * s + rv * c)) gained++
    }
    let spilled = 0
    for (let q = 0; q < no; q++) {
      const sx = outside[q * 2]
      const sy = outside[q * 2 + 1]
      if (Math.abs(sx - cx) > r || Math.abs(sy - cy) > r) continue
      let others = false
      for (let j = 0; j < n; j++) if (j !== index && this.outsideHits[j * no + q]) others = true
      if (others) continue
      const ru = LAMP.x + (sx - LAMP.x) / k - pose.x
      const rv = LAMP.y + (sy - LAMP.y) / k - PIN_HEIGHT
      if (spec.inside(ru * c + rv * s, -ru * s + rv * c)) spilled++
    }
    return gained * insideCell * insideCell - SPILL_WEIGHT * spilled * outsideCell * outsideCell
  }

  private searchKinds: ShapeKind[] = []
  private searchPoses: CardPose[] = []
  private searchCount = 0
  private searchPreferDepth = false
  private cursor = 0
  private baseScore = 0
  private readonly trial: CardPose = { x: 0, z: 0, angle: 0, yaw: 0, lift: 0 }
  /** Best improving move found so far by the running search, or null. */
  best: HintMove | null = null
  searching = false

  /**
   * Snapshot the arrangement for a hint search that the game spreads over
   * several frames with `continueSearch`. `preferDepth` rewards moves that
   * change the distance to the lamp (the idea worth teaching).
   */
  beginSearch(placed: readonly Placed[], preferDepth = false): void {
    this.searchKinds = placed.map((p) => p.kind)
    this.searchPoses = placed.map((p) => ({ ...p.pose }))
    this.searchCount = this.tabulate(placed)
    this.searchPreferDepth = preferDepth
    this.cursor = 0
    this.best = null
    this.searching = true
  }

  /** Try candidate moves until `budgetMs` of wall time is spent. Returns true when the search is finished. */
  continueSearch(budgetMs: number, clock: () => number = () => performance.now()): boolean {
    if (!this.searching) return true
    const started = clock()
    const perShape = TURNS.length * DEPTHS.length * XS.length
    const total = perShape * this.searchCount
    let tried = 0
    while (this.cursor < total) {
      const index = Math.floor(this.cursor / perShape)
      const within = this.cursor % perShape
      const current = this.searchPoses[index]
      if (within === 0) this.baseScore = this.soloScore(index, this.searchCount, current)
      const turn = TURNS[Math.floor(within / (DEPTHS.length * XS.length))]
      const depth = DEPTHS[Math.floor(within / XS.length) % DEPTHS.length]
      const pose = this.trial
      pose.angle = current.angle + turn
      pose.z = depth
      pose.x = XS[within % XS.length]
      let gain = this.soloScore(index, this.searchCount, pose) - this.baseScore
      if (this.searchPreferDepth) gain += Math.min(6, Math.abs(pose.z - current.z) * 0.25) * 4
      gain -= (turn / TAP_TURN) * 6
      gain -= Math.hypot(pose.x - current.x, pose.z - current.z) * 0.15
      if (gain > 8 && (!this.best || gain > this.best.gain)) this.best = { index, x: pose.x, z: pose.z, angle: pose.angle, gain }
      this.cursor += 1
      tried += 1
      if ((tried & 7) === 0 && clock() - started >= budgetMs) return false
    }
    this.searching = false
    return true
  }
}

export type HintMove = { index: number; x: number; z: number; angle: number; gain: number }

const SPILL_WEIGHT = 0.35
/** A tap turns a shape an eighth of a turn counter-clockwise; hints ask for at most two taps. */
export const TAP_TURN = Math.PI / 4
const TURNS = [0, TAP_TURN, TAP_TURN * 2]
const DEPTHS = [9, 15, 21, 28, 35, 42, 47]
const XS: number[] = []
for (let x = STAGE.xMin + 4; x <= STAGE.xMax - 4; x += 4) XS.push(x)

/** Whole-arrangement search in one go (tests and tools; the game spreads it over frames). */
export function bestHint(meter: CoverageMeter, placed: readonly Placed[], preferDepth = false): HintMove | null {
  meter.beginSearch(placed, preferDepth)
  meter.continueSearch(Infinity)
  return meter.best
}
