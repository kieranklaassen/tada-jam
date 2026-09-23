// What a prototype's index.ts exports for the shell. The panel does not import
// this (or view.ts): it loads meta.ts and sim.ts only, so it stays Node-pure.

import type { CreateSim, ProtoMeta } from './sim.ts'

export interface Proto<Snapshot = unknown> {
  meta: ProtoMeta
  createSim: CreateSim<Snapshot>
  // Draws flat shapes from the snapshot. The context is already scaled so the
  // coordinates are the logical 1180 by 820 field.
  draw(ctx: CanvasRenderingContext2D, snapshot: Snapshot): void
}
