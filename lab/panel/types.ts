// Shared types for the persona panel. Node-pure: no DOM, no Vite globals.

import type { AffordanceKind, CreateSim, PointerInput, ProtoMeta } from '../kit/sim.ts'

export type Provenance = 'research' | 'default'

export interface Persona {
  id: string
  name: string
  // Whole years. Kaia's is documented; Tess's is assumed (see personas.ts).
  age: number
  // Standard deviation of the touch scatter, in logical pixels.
  touchJitter: number
  // Ticks of interest at the start of a session.
  attention: number
  // What pulls this persona: new things, or getting better at something.
  draw: { novelty: number; mastery: number }
  // 0 to 1: how readily a bored persona sets itself an aim.
  aimInvention: number
  // 0 to 1: how readily the persona comes back after a session.
  returnPropensity: number
  // `research` or `default` for each parameter (keys documented in
  // thresholds.ts).
  provenance: Record<string, Provenance>
}

// The prototype as the panel sees it: meta and sim only.
export interface PanelProto {
  meta: ProtoMeta
  createSim: CreateSim
}

// One pointer input, applied to the sim just before the step of `tick`.
export interface LogEntry {
  tick: number
  input: PointerInput
}

export interface KeyStat {
  tries: number
  changes: number
}

export type EndedBy = 'attention' | 'cap' | 'drift' | 'crash'

export interface AimRecord {
  feature: string
  dir: 'up' | 'down'
  adoptedTick: number
  windows: number
  progressWindows: number
  madeProgress: boolean
}

export interface CrashRecord {
  // `session <n>`, `clarity`, `self-play`, `hook arm <name>`
  where: string
  persona: string
  seedIndex: number
  tick: number
  message: string
}

export interface SessionSummary {
  index: number
  ticks: number
  endedBy: EndedBy
  // Gestures (taps, drags, holds) made.
  actions: number
  // Distinct gesture kinds used, sorted.
  kinds: AffordanceKind[]
  // Distinct signatures reached, sorted.
  signatures: string[]
  // Of those, how many this persona had never seen in any session.
  newSignatures: number
  aims: AimRecord[]
  // Interest gained per tick over the last stretch of the session.
  pull: number
  // How much learning progress and novelty were left when it ended, 0 to 1.
  left: number
  interestLeft: number
  aimedTouches: number
  aimedHits: number
  freeTouches: number
  // Change fingerprint (0 unless requested).
  fingerprint: number
}

export interface ReturnDecision {
  afterSession: number
  left: number
  probability: number
  returned: boolean
}

export interface RunResult {
  personaId: string
  seedIndex: number
  runSeed: number
  sessions: SessionSummary[]
  // Highest session the persona chose to start, 1 to 5. With fewer sessions
  // played than that, the last one was decided but not played.
  reached: number
  decisions: ReturnDecision[]
  crash: CrashRecord | null
}

export interface ClarityResult {
  personaId: string
  seedIndex: number
  mode: 'blind' | 'aimed'
  touches: number
  changed: number
  firstChangeTick: number | null
  kinds: AffordanceKind[]
  aimedTouches: number
  aimedHits: number
  crash: CrashRecord | null
}
