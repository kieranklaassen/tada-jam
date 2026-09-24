// The sim contract every mechanic prototype implements. A prototype's meta.ts
// and sim.ts are pure and Node-importable: no DOM, no Vite globals, no
// Math.random, Date.now, or performance.now. The panel plays them headlessly;
// the shell draws them from snapshot().

import type { Engine } from '../ideas/engines.ts'

// Logical field, landscape. The shell letterboxes it into any viewport.
export const FIELD_W = 1180
export const FIELD_H = 820
// One fixed step, in the browser and in the panel alike.
export const TICK_MS = 33
// A signature is a discrete outcome class; no prototype may declare more.
export const MAX_SIGNATURE_BOUND = 64

export type PointerPhase = 'down' | 'move' | 'up'

// Raw pointer input in logical field coordinates. The sim's own hit-test
// decides what was touched; nothing else does.
export interface PointerInput {
  id: number
  phase: PointerPhase
  x: number
  y: number
}

export type AffordanceKind = 'tap' | 'drag' | 'hold'

// What a child could be drawn to right now. Personas use it to choose where
// to aim; it never replaces the sim's hit-test. The rectangle is anchored at
// its TOP-LEFT corner like canvas fillRect: (x, y) is the corner and the
// centre is (x + w / 2, y + h / 2). Prototypes must report affordances this way.
export interface Affordance {
  x: number
  y: number
  w: number
  h: number
  kind: AffordanceKind
  // 0 to 1: how strongly it draws the eye.
  salience: number
}

export type SimEvent =
  // A declared hook fired (a score, a level, a timer, a win state, an unlock).
  | { kind: 'hook'; name: string }
  // Something in the world changed because of the child.
  | { kind: 'state'; name: string }

export interface Observation {
  // A short string naming a discrete outcome class only: never coordinates,
  // scores, or counters. Between 2 and meta.signatureBound (at most 64)
  // distinct values across one fuzz session.
  signature: string
  // Named numeric features; those meta.features marks with an objective are
  // what self-set aims and greedy self-play push on.
  features: Record<string, number>
  // Events since the last observe() call.
  events: SimEvent[]
}

export interface SimConfig {
  seed: number
  // Names of the hooks that are enabled, all enabled by default. An empty
  // list means no hook events and no hook behaviour.
  hooks: readonly string[]
  // Idle hints and demonstrations. Off for return and self-aim runs.
  hints: boolean
}

export interface Sim<Snapshot = unknown> {
  // Advance one fixed TICK_MS step.
  step(): void
  pointer(input: PointerInput): void
  affordances(): Affordance[]
  observe(): Observation
  // Plain data the view draws from.
  snapshot(): Snapshot
}

export type CreateSim<Snapshot = unknown> = (config: SimConfig) => Sim<Snapshot>

export interface FeatureSpec {
  name: string
  // Present when a direction is better for the prototype's own objective.
  objective?: 'up' | 'down'
}

export type HookAblation =
  | { supported: true }
  // A hook that is the loop itself cannot be removed; say why.
  | { supported: false; reason: string }

export type Lens = 'physical-toy' | 'other'

export interface ProtoMeta {
  // Kebab-case, equal to the folder name and to the catalog protoKey.
  key: string
  name: string
  // One lowercase word: what the child mostly does.
  verb: string
  engine: Engine
  lens: Lens
  // A toy id from lab/ideas/toys.ts; required when lens is 'physical-toy'.
  toy?: string
  // Whole years, at most four years wide, 2 to 12.
  ageBand: readonly [number, number]
  // Hook names the prototype leans on; may be empty.
  hooks: readonly string[]
  features: readonly FeatureSpec[]
  // Upper bound on distinct signatures, 2 to MAX_SIGNATURE_BOUND.
  signatureBound: number
  hookAblation: HookAblation
}
