// Self-play (KTD7): three fixed policies play a prototype so the report can say
// how varied its outcomes are and whether one strategy dominates. The policies
// are random, repeat-one (always the most salient affordance), and greedy on
// the prototype's declared objective feature. Greedy forks by REPLAYING the
// input log into a fresh sim of the same seed, which deterministic sims allow,
// so no prototype writes a `clone`.

import { createRng, deriveSeed, int } from '../kit/rng.ts'
import type { Rng } from '../kit/rng.ts'
import { FIELD_H, FIELD_W } from '../kit/sim.ts'
import type { Affordance, FeatureSpec, Observation, PointerInput, Sim, SimConfig } from '../kit/sim.ts'
import { affordanceCenter, clampToField, dragScript, holdScript, tapScript } from './driver.ts'
import type { Point, Script } from './driver.ts'
import { shannonEntropy } from './metrics.ts'
import type { CrashRecord, LogEntry, PanelProto } from './types.ts'
import {
  DOMINANT_COLLAPSE,
  DOMINANT_MARGIN,
  GREEDY_CANDIDATES,
  NOISE_SEEDS,
  SELFPLAY_DECISION_TICKS,
  SELFPLAY_EPISODE_TICKS,
} from './thresholds.ts'
import { masterRunSeed, sessionSeed } from './session.ts'

export type PolicyName = 'random' | 'repeat-one' | 'greedy'
export const POLICIES: readonly PolicyName[] = ['random', 'repeat-one', 'greedy']

export function objectiveOf(features: readonly FeatureSpec[]): { name: string; dir: 'up' | 'down' } | null {
  for (const f of features) if (f.objective) return { name: f.name, dir: f.objective }
  return null
}

// ------------------------------------------------------------------- replay
function groupByTick(log: readonly LogEntry[]): Map<number, PointerInput[]> {
  const byTick = new Map<number, PointerInput[]>()
  for (const entry of log) {
    const list = byTick.get(entry.tick)
    if (list) list.push(entry.input)
    else byTick.set(entry.tick, [entry.input])
  }
  return byTick
}

// One tick, exactly as a direct run does it: inputs, then step, then observe.
function advance(sim: Sim, inputs: readonly PointerInput[] | undefined): Observation {
  if (inputs) for (const input of inputs) sim.pointer(input)
  sim.step()
  return sim.observe()
}

// A fresh sim of the same config with the log applied for ticks [0, untilTick).
export function replayLog(
  proto: PanelProto,
  config: SimConfig,
  log: readonly LogEntry[],
  untilTick: number,
): { sim: Sim; last: Observation | null } {
  const sim = proto.createSim(config)
  const byTick = groupByTick(log)
  let last: Observation | null = null
  for (let t = 0; t < untilTick; t++) last = advance(sim, byTick.get(t))
  return { sim, last }
}

// -------------------------------------------------------------- the gestures
// Self-play touches are exact: no jitter. It is probing the design, not a child.
function destinationFor(a: Affordance, all: readonly Affordance[]): Point {
  const from = affordanceCenter(a)
  const other = all.find((b) => b !== a)
  if (other) return affordanceCenter(other)
  return clampToField({ x: from.x + 150, y: from.y })
}

function scriptFor(a: Affordance, all: readonly Affordance[], id: number): Script {
  const from = affordanceCenter(a)
  if (a.kind === 'tap') return tapScript(id, from)
  if (a.kind === 'hold') return holdScript(id, from, SELFPLAY_DECISION_TICKS - 5)
  return dragScript(id, from, destinationFor(a, all), 3)
}

// Salience order, ties kept in list order.
function bySalience(affs: readonly Affordance[]): Affordance[] {
  return affs
    .map((a, i) => ({ a, i }))
    .sort((p, q) => q.a.salience - p.a.salience || p.i - q.i)
    .map((r) => r.a)
}

// ------------------------------------------------------------------ episodes
export interface EpisodeResult {
  policy: PolicyName
  seedIndex: number
  ticks: number
  // The objective feature at the end, signed so that larger is better; null
  // when the prototype declares no objective.
  objective: number | null
  // Signature counts sampled at each decision point.
  signatureCounts: Record<string, number>
  log: LogEntry[]
  finalSignature: string
  finalFeatures: Record<string, number>
  replayedTicks: number
  crash: string | null
}

export interface EpisodeOptions {
  ticks?: number
  hooks?: readonly string[]
}

export function playEpisode(proto: PanelProto, policy: PolicyName, runSeed: number, options: EpisodeOptions = {}): EpisodeResult {
  const total = options.ticks ?? SELFPLAY_EPISODE_TICKS
  const hooks = options.hooks ?? proto.meta.hooks
  const config: SimConfig = { seed: sessionSeed(runSeed, 0), hooks: [...hooks], hints: false }
  const objective = objectiveOf(proto.meta.features)
  const sign = objective?.dir === 'down' ? -1 : 1
  const rng: Rng = createRng(deriveSeed(runSeed, 0x51))
  const sim = proto.createSim(config)
  const log: LogEntry[] = []
  const counts: Record<string, number> = {}
  let replayedTicks = 0
  let script: Script = []
  let scriptStart = 0
  let nextId = 1
  let signature = ''
  let features: Record<string, number> = {}
  let crash: string | null = null
  let tick = 0

  const valueOf = (obs: Observation | null): number => {
    if (!obs || !objective) return 0
    const v = obs.features[objective.name]
    return (typeof v === 'number' && Number.isFinite(v) ? v : 0) * sign
  }

  const decide = (): Script => {
    const affs = sim.affordances()
    if (affs.length === 0) {
      // Nothing declared: poke somewhere at random so the sim still gets input.
      return tapScript(nextId++, { x: int(rng, 0, FIELD_W), y: int(rng, 0, FIELD_H) })
    }
    const ranked = bySalience(affs)
    if (policy === 'random') return scriptFor(affs[int(rng, 0, affs.length - 1)]!, affs, nextId++)
    if (policy === 'repeat-one') return scriptFor(ranked[0]!, affs, nextId++)
    // Greedy: try each of the most salient candidates in a fork and keep the best.
    const candidates = ranked.slice(0, GREEDY_CANDIDATES)
    let best = candidates[0]!
    let bestValue = Number.NEGATIVE_INFINITY
    for (const candidate of candidates) {
      const trial = scriptFor(candidate, affs, nextId)
      const fork = replayLog(proto, config, log, tick)
      replayedTicks += tick
      let obs: Observation | null = fork.last
      for (let offset = 0; offset < SELFPLAY_DECISION_TICKS; offset++) {
        obs = advance(fork.sim, trial[offset])
        replayedTicks += 1
      }
      const value = valueOf(obs)
      if (value > bestValue) {
        bestValue = value
        best = candidate
      }
    }
    return scriptFor(best, affs, nextId++)
  }

  try {
    let obs: Observation | null = null
    for (tick = 0; tick < total; tick++) {
      if (tick % SELFPLAY_DECISION_TICKS === 0) {
        if (obs) counts[obs.signature] = (counts[obs.signature] ?? 0) + 1
        script = decide()
        scriptStart = tick
      }
      const inputs = script[tick - scriptStart]
      if (inputs) for (const input of inputs) log.push({ tick, input })
      obs = advance(sim, inputs)
      signature = obs.signature
      features = obs.features
    }
    if (obs) counts[obs.signature] = (counts[obs.signature] ?? 0) + 1
  } catch (error) {
    crash = error instanceof Error ? error.message : String(error)
  }
  return {
    policy,
    seedIndex: -1,
    ticks: tick,
    objective: objective && crash === null ? (features[objective.name] ?? 0) * sign : null,
    signatureCounts: counts,
    log,
    finalSignature: signature,
    finalFeatures: features,
    replayedTicks,
    crash,
  }
}

// ---------------------------------------------------------------- the report
export interface PolicySummary {
  meanObjective: number | null
  variety: number
  episodes: number
}

export interface SelfPlayResult {
  objective: { name: string; dir: 'up' | 'down' } | null
  policies: Record<string, PolicySummary>
  // Entropy, in bits, of signatures pooled across every policy and seed.
  overallVariety: number
  dominant: { flagged: boolean; by: PolicyName | null; note: string }
  replayedTicks: number
  crashes: CrashRecord[]
}

function pooled(episodes: readonly EpisodeResult[]): number {
  const counts = new Map<string, number>()
  for (const e of episodes) for (const [sig, n] of Object.entries(e.signatureCounts)) counts.set(sig, (counts.get(sig) ?? 0) + n)
  return shannonEntropy([...counts.values()])
}

export function runSelfPlay(proto: PanelProto, masterSeed: number): SelfPlayResult {
  const objective = objectiveOf(proto.meta.features)
  const crashes: CrashRecord[] = []
  const byPolicy = new Map<PolicyName, EpisodeResult[]>()
  let replayedTicks = 0
  for (const policy of POLICIES) {
    if (policy === 'greedy' && !objective) continue
    const list: EpisodeResult[] = []
    for (let k = 0; k < NOISE_SEEDS; k++) {
      const episode = playEpisode(proto, policy, masterRunSeed(masterSeed, k))
      episode.seedIndex = k
      replayedTicks += episode.replayedTicks
      if (episode.crash) {
        crashes.push({ where: `self-play ${policy}`, persona: '-', seedIndex: k, tick: episode.ticks, message: episode.crash })
      } else {
        list.push(episode)
      }
    }
    byPolicy.set(policy, list)
  }
  const all = [...byPolicy.values()].flat()
  const policies: Record<string, PolicySummary> = {}
  for (const [policy, list] of byPolicy) {
    const objectives = list.flatMap((e) => (e.objective === null ? [] : [e.objective]))
    policies[policy] = {
      meanObjective: objectives.length > 0 ? objectives.reduce((a, b) => a + b, 0) / objectives.length : null,
      variety: pooled(list),
      episodes: list.length,
    }
  }
  const dominant = judgeDominant(policies, all, objective !== null)
  return { objective, policies, overallVariety: pooled(all), dominant, replayedTicks, crashes }
}

// Repeat-one or greedy beats random on the objective by a margin of the
// objective's spread, while its own outcome variety collapses.
export function judgeDominant(
  policies: Record<string, PolicySummary>,
  episodes: readonly EpisodeResult[],
  hasObjective: boolean,
): { flagged: boolean; by: PolicyName | null; note: string } {
  if (!hasObjective) return { flagged: false, by: null, note: 'no objective declared: variety only' }
  const random = policies['random']
  if (!random || random.meanObjective === null) return { flagged: false, by: null, note: 'no random baseline' }
  const values = episodes.flatMap((e) => (e.objective === null ? [] : [e.objective]))
  const spread = values.length > 0 ? Math.max(...values) - Math.min(...values) : 0
  if (spread <= 0) return { flagged: false, by: null, note: 'the objective never varied' }
  for (const name of ['repeat-one', 'greedy'] as const) {
    const summary = policies[name]
    if (!summary || summary.meanObjective === null) continue
    const advantage = (summary.meanObjective - random.meanObjective) / spread
    if (advantage > DOMINANT_MARGIN && summary.variety <= DOMINANT_COLLAPSE * random.variety) {
      return { flagged: true, by: name, note: `${name} beats random on the objective while its variety collapses` }
    }
  }
  return { flagged: false, by: null, note: 'no policy dominates' }
}
