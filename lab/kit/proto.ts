// What a prototype's index.ts exports for the shell. The panel does not import
// this (or view.ts): it loads meta.ts and sim.ts only, so it stays Node-pure.

import type { CreateSim, ProtoMeta, Sim } from './sim.ts'

export interface Proto<Snapshot = unknown> {
  meta: ProtoMeta
  createSim: CreateSim<Snapshot>
  // Draws flat shapes from the snapshot. The context is already scaled so the
  // coordinates are the logical 1180 by 820 field.
  draw(ctx: CanvasRenderingContext2D, snapshot: Snapshot): void
}

// Watch mode: the shell shows a seeded persona driving a prototype's sim. The
// panel builds the real watcher (lab/shell/watch.ts) from the same driver it
// measures with, so what Kieran watches is what the panel measured. The shell
// only advances it by real elapsed time and draws sim.snapshot().
export interface Watcher {
  sim: Sim
  // Advance by real elapsed milliseconds; runs whole TICK_MS steps, feeding
  // the persona's pointer input into sim.pointer() between steps.
  advance(dtMs: number): void
}

export interface WatchOptions {
  proto: { meta: ProtoMeta; createSim: CreateSim }
  seed: number
  personaId: string
}

export type CreateWatcher = (options: WatchOptions) => Watcher
