import type { BuiltCreature } from './creatures'
import { LAMP, PIN_HEIGHT, shadowScale, STAGE, type CardPose } from './projection'
import { SHAPES, type ShapeKind } from './shapes'
import { slideReach, standBlocked, type Stand } from './stands'

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
  private searchStands: Stand[][] = [[]]
  private searchCount = 0
  private searchPreferDepth = false
  private cursor = 0
  private baseScore = 0
  private readonly trial: CardPose = { x: 0, z: 0, angle: 0, yaw: 0, lift: 0 }
  private clearBest: HintMove | null = null
  private coveringBest: HintMove | null = null
  searching = false

  /** Best improving move found so far by the running search, or null; one that keeps clear of the other cards if any does. */
  get best(): HintMove | null {
    return this.clearBest ?? this.coveringBest
  }

  /**
   * Snapshot the arrangement for a hint search that the game spreads over
   * several frames with `continueSearch`. `preferDepth` rewards moves that
   * change the distance to the lamp (the idea worth teaching).
   */
  beginSearch(placed: readonly Placed[], preferDepth = false): void {
    this.searchKinds = placed.map((p) => p.kind)
    this.searchPoses = placed.map((p) => ({ ...p.pose }))
    this.searchStands = [placed.map((p) => ({ kind: p.kind, pose: { x: p.pose.x, z: p.pose.z, angle: p.pose.angle, yaw: 0 } }))]
    this.searchCount = this.tabulate(placed)
    this.searchPreferDepth = preferDepth
    this.cursor = 0
    this.clearBest = null
    this.coveringBest = null
    this.searching = true
  }

  /**
   * How much a card at `pose` gets in another card's way: CROWDED side by
   * side at one depth (they cut through each other), COVERING close in front
   * of or behind one (seen from the seat the nearer card hides the other,
   * which is then out of a child's reach), or CLEAR. With `behindOnly`, only
   * nearer cards covering this one count. A place where the stand could not
   * stand at all (in another stand, or too near the screen) is CROWDED too.
   */
  private crowding(index: number, pose: CardPose, behindOnly = false): number {
    const r = SHAPES[this.searchKinds[index]].radius
    if (!behindOnly && standBlocked(this.probe(index, pose), this.searchStands[0], index, HINT_GAP)) return CROWDED
    let level = CLEAR
    for (let j = 0; j < this.searchCount; j++) {
      if (j === index) continue
      const other = this.searchPoses[j]
      if (behindOnly && other.z <= pose.z) continue
      const dz = Math.abs(other.z - pose.z)
      const dx = Math.abs(other.x - pose.x)
      const reach = r + SHAPES[this.searchKinds[j]].radius
      if (!behindOnly && dz < CROWD_DEPTH && dx < reach) return CROWDED
      if (dz < COVER_DEPTH && dx < reach * 0.5) level = COVERING
    }
    return level
  }

  /** Try candidate moves until `budgetMs` of wall time is spent. Returns true when the search is finished. */
  continueSearch(budgetMs: number, clock: () => number = () => performance.now()): boolean {
    if (!this.searching) return true
    const started = clock()
    const perShape = TURNS.length * DEPTHS.length * XS.length
    const total = perShape * this.searchCount
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
      if (within === 0 && this.crowding(index, current, true) !== CLEAR) {
        // Hidden behind a nearer card: no hint asks a child to reach for it.
        this.cursor += perShape
        continue
      }
      const level = this.crowding(index, pose)
      if (level === CROWDED) {
        this.cursor += 1
        continue
      }
      let gain = this.soloScore(index, this.searchCount, pose) - this.baseScore
      if (this.searchPreferDepth) gain += Math.min(6, Math.abs(pose.z - current.z) * 0.25) * 4
      gain -= (turn / TAP_TURN) * 6
      gain -= Math.hypot(pose.x - current.x, pose.z - current.z) * 0.15
      const kept = level === CLEAR ? this.clearBest : this.coveringBest
      if (gain > 8 && (!kept || gain > kept.gain) && this.reachable(index, current, pose)) {
        const move = { index, x: pose.x, z: pose.z, angle: pose.angle, gain }
        if (level === CLEAR) this.clearBest = move
        else this.coveringBest = move
      }
      this.cursor += 1
      // Every scored candidate: on a slow tablet one costs a sizeable slice of the budget.
      if (clock() - started >= budgetMs) return false
    }
    this.searching = false
    return true
  }

  /**
   * Can a child do the move the way the hint shows it: tap-turn the card
   * where it stands, then slide it straight to `to`, without it meeting
   * another stand on the way?
   */
  private reachable(index: number, from: CardPose, to: CardPose): boolean {
    const turning = this.turning
    turning.x = from.x
    turning.z = from.z
    const steps = Math.ceil(Math.abs(to.angle - from.angle) / 0.1)
    for (let i = 1; i <= steps; i++) {
      turning.angle = from.angle + ((to.angle - from.angle) * i) / steps
      if (standBlocked(this.probe(index, turning), this.searchStands[0], index)) return false
    }
    return slideReach(this.searchKinds[index], from.x, from.z, to.x, to.z, to.angle, this.searchStands, index, HINT_GAP) === 1
  }

  private readonly turning = { x: 0, z: 0, angle: 0, yaw: 0 }
  private readonly probed: { kind: ShapeKind; pose: { x: number; z: number; angle: number } } = { kind: 'square', pose: this.turning }

  private probe(index: number, pose: { x: number; z: number; angle: number }): Stand {
    this.probed.kind = this.searchKinds[index]
    this.probed.pose = pose
    return this.probed
  }
}

export type HintMove = { index: number; x: number; z: number; angle: number; gain: number }

const SPILL_WEIGHT = 0.35
/** Hints never put a card this close in depth to a card it would stand beside, */
const CROWD_DEPTH = 2
/** and only when nothing else helps this close in front of or behind one. */
const COVER_DEPTH = 8
/** Room a hinted place and slide leave around the stand: more than stands need, so its swing on the way has space. */
const HINT_GAP = 0.6
const CLEAR = 0
const COVERING = 1
const CROWDED = 2
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
