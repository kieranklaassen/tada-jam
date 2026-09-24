// What the panel measures, computed from runs (KTD5, KTD7, KTD9). Nothing here
// reads a clock: every measure comes from counts of signatures reached,
// actions taken, and aims pursued.

import type { ProtoMeta } from '../kit/sim.ts'
import { PERSONAS } from './personas.ts'
import type { ClarityResult, Persona, RunResult } from './types.ts'
import {
  CLARITY_MAX_FIRST_TICK,
  CLARITY_MIN_SHARE,
  GATE_SESSION,
  GATE_SHARE,
  HOOK_NEEDED_DROP,
  PANEL_MARGIN_YEARS,
  PANEL_MIN_PERSONAS,
} from './thresholds.ts'

// ---------------------------------------------------------------- utilities
export function shannonEntropy(counts: readonly number[]): number {
  const total = counts.reduce((a, b) => a + b, 0)
  if (total <= 0) return 0
  let h = 0
  for (const c of counts) {
    if (c <= 0) continue
    const p = c / total
    h -= p * Math.log2(p)
  }
  return h
}

export function round6(x: number): number {
  return Math.round(x * 1e6) / 1e6
}

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((a, b) => a + b, 0) / values.length
}

// -------------------------------------------------------------- target panel
// The personas whose age is within one year of the prototype's age band,
// widened to the nearest two personas by age distance when fewer fall in.
export function targetPanel(meta: Pick<ProtoMeta, 'ageBand'>, personas: readonly Persona[] = PERSONAS): Persona[] {
  const [lo, hi] = meta.ageBand
  const inside = personas.filter((p) => p.age >= lo - PANEL_MARGIN_YEARS && p.age <= hi + PANEL_MARGIN_YEARS)
  if (inside.length >= PANEL_MIN_PERSONAS) return inside
  const distance = (p: Persona): number => (p.age < lo ? lo - p.age : p.age > hi ? p.age - hi : 0)
  return personas
    .map((p, i) => ({ p, i }))
    .sort((a, b) => distance(a.p) - distance(b.p) || a.i - b.i)
    .slice(0, PANEL_MIN_PERSONAS)
    .map((r) => r.p)
    .sort((a, b) => personas.indexOf(a) - personas.indexOf(b))
}

// -------------------------------------------------------------------- return
// Share of runs that START the given session (1-based). A run that quit
// earlier counts as not starting it.
export function startedShare(runs: readonly RunResult[], session: number): number {
  if (runs.length === 0) return 0
  return runs.filter((r) => r.reached >= session).length / runs.length
}

export interface ReturnShares {
  s3: number
  s4: number
  s5: number
}

export function returnShares(runs: readonly RunResult[]): ReturnShares {
  return { s3: startedShare(runs, 3), s4: startedShare(runs, 4), s5: startedShare(runs, 5) }
}

// ---------------------------------------------------------------- the gate
export interface GateResult {
  pass: boolean
  share: number
  started: number
  runs: number
}

// A prototype passes when at least GATE_SHARE of its target-panel runs start
// session 3.
export function gate(runs: readonly RunResult[]): GateResult {
  const started = runs.filter((r) => r.reached >= GATE_SESSION).length
  const share = runs.length === 0 ? 0 : started / runs.length
  return { pass: runs.length > 0 && share >= GATE_SHARE, share, started, runs: runs.length }
}

// ------------------------------------------------------------ play 5 vs play 1
export interface Play5Change {
  newSignatures: number
  newSignaturesPer100Actions: number
  kindGrowth: number
  change: number
}

// The persona's LAST session against its FIRST: signatures reached in the last
// that were not reached in the first, per 100 actions, plus growth in distinct
// action kinds (floor 0). A persona that quit early is compared using its last
// session, and one that played a single session shows no change.
export function play5Change(run: RunResult): Play5Change {
  const first = run.sessions[0]
  const last = run.sessions[run.sessions.length - 1]
  if (!first || !last || run.sessions.length < 2) {
    return { newSignatures: 0, newSignaturesPer100Actions: 0, kindGrowth: 0, change: 0 }
  }
  const before = new Set(first.signatures)
  const newSignatures = last.signatures.filter((s) => !before.has(s)).length
  const per100 = last.actions > 0 ? (newSignatures / last.actions) * 100 : 0
  const kindGrowth = Math.max(0, last.kinds.length - first.kinds.length)
  return { newSignatures, newSignaturesPer100Actions: per100, kindGrowth, change: per100 + kindGrowth }
}

// --------------------------------------------------------------------- aims
export interface AimSummary {
  adopted: number
  madeProgress: number
  features: string[]
}

export function aimSummary(runs: readonly RunResult[]): AimSummary {
  let adopted = 0
  let madeProgress = 0
  const features = new Set<string>()
  for (const run of runs) {
    for (const session of run.sessions) {
      for (const aim of session.aims) {
        adopted += 1
        if (aim.madeProgress) madeProgress += 1
        features.add(`${aim.feature} ${aim.dir}`)
      }
    }
  }
  return { adopted, madeProgress, features: [...features].sort() }
}

// ------------------------------------------------------------------ clarity
export interface ClarityMeasure {
  touches: number
  changedShare: number
  // Mean tick of the first state change over runs that had one.
  ticksToFirstChange: number | null
  runsWithChange: number
  runs: number
  distinctKinds: number
  // Informational: the builder's own declaration, not the flag.
  aimedHitShare: number | null
  flag: 'ok' | 'low'
}

// The flag reads the cue-blind runs only; the share of aimed touches that hit
// a declared affordance comes from the aimed runs and is informational.
export function clarityMeasure(results: readonly ClarityResult[]): ClarityMeasure {
  const blind = results.filter((r) => r.mode === 'blind')
  const aimed = results.filter((r) => r.mode === 'aimed')
  const touches = blind.reduce((a, r) => a + r.touches, 0)
  const changed = blind.reduce((a, r) => a + r.changed, 0)
  const firsts = blind.flatMap((r) => (r.firstChangeTick === null ? [] : [r.firstChangeTick]))
  const kinds = new Set(blind.flatMap((r) => r.kinds))
  const aimedTouches = aimed.reduce((a, r) => a + r.aimedTouches, 0)
  const aimedHits = aimed.reduce((a, r) => a + r.aimedHits, 0)
  const changedShare = touches > 0 ? changed / touches : 0
  const ticks = firsts.length > 0 ? mean(firsts) : null
  const low = changedShare < CLARITY_MIN_SHARE || ticks === null || ticks > CLARITY_MAX_FIRST_TICK
  return {
    touches,
    changedShare,
    ticksToFirstChange: ticks,
    runsWithChange: firsts.length,
    runs: blind.length,
    distinctKinds: kinds.size,
    aimedHitShare: aimedTouches > 0 ? aimedHits / aimedTouches : null,
    flag: low ? 'low' : 'ok',
  }
}

// ------------------------------------------------------------- sub-signals
export interface SubSignals {
  // Mean of the shares of runs that start session 3, 4, and 5.
  returnScore: number
  // Mean per-run play 5 against play 1 change.
  changeScore: number
  // Mean per-run count of aims that made progress.
  aimScore: number
}

export function subSignals(runs: readonly RunResult[]): SubSignals {
  const shares = returnShares(runs)
  return {
    returnScore: (shares.s3 + shares.s4 + shares.s5) / 3,
    changeScore: mean(runs.map((r) => play5Change(r).change)),
    aimScore: mean(runs.map((r) => r.sessions.reduce((a, s) => a + s.aims.filter((x) => x.madeProgress).length, 0))),
  }
}

// -------------------------------------------------------------------- ranking
export interface RankEntry {
  key: string
  signals: SubSignals
  dominant?: boolean
}

export interface RankedEntry {
  key: string
  ranks: { returnRank: number; changeRank: number; aimRank: number }
  // Mean of the three ranks: higher is better, and 1 is the lowest possible.
  meanRank: number
  dominant: boolean
}

// Ascending ranks (1 = lowest value), ties sharing the mean of their places.
function rankValues(values: readonly number[]): number[] {
  const order = values.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v || a.i - b.i)
  const ranks = new Array<number>(values.length).fill(0)
  let i = 0
  while (i < order.length) {
    let j = i
    while (j + 1 < order.length && order[j + 1]!.v === order[i]!.v) j++
    const shared = (i + 1 + (j + 1)) / 2
    for (let k = i; k <= j; k++) ranks[order[k]!.i] = shared
    i = j + 1
  }
  return ranks
}

// Mean of the ranks on return through session 5, play 5 change, and aims that
// made progress. Ranks compare prototypes with each other; absolute values mean
// little. A dominant-strategy flag places an entry below an unflagged one of
// equal rank. Sorted best first, ties by key.
export function rankScore(entries: readonly RankEntry[]): RankedEntry[] {
  const returnRanks = rankValues(entries.map((e) => e.signals.returnScore))
  const changeRanks = rankValues(entries.map((e) => e.signals.changeScore))
  const aimRanks = rankValues(entries.map((e) => e.signals.aimScore))
  return entries
    .map((entry, i) => ({
      key: entry.key,
      ranks: { returnRank: returnRanks[i]!, changeRank: changeRanks[i]!, aimRank: aimRanks[i]! },
      meanRank: (returnRanks[i]! + changeRanks[i]! + aimRanks[i]!) / 3,
      dominant: entry.dominant === true,
    }))
    .sort(
      (a, b) =>
        b.meanRank - a.meanRank ||
        Number(a.dominant) - Number(b.dominant) ||
        (a.key < b.key ? -1 : a.key > b.key ? 1 : 0),
    )
}

// ------------------------------------------------------------ hook verdicts
export const VERDICT_NEEDED = 'needed'
export const VERDICT_NOT_NEEDED = 'not needed'
export const VERDICT_INCONCLUSIVE = 'inconclusive (the persona model has no reward response)'

// `drop` is the baseline session-3 return share minus the arm's, so a hook
// whose removal lowers return has a positive drop. `changed` is whether the
// removal changed affordances or signatures.
export function hookVerdict(drop: number, changed: boolean): string {
  if (drop > HOOK_NEEDED_DROP) return VERDICT_NEEDED
  if (!changed) return VERDICT_INCONCLUSIVE
  return VERDICT_NOT_NEEDED
}

export function notApplicable(reason: string): string {
  return `n/a: ${reason}`
}
