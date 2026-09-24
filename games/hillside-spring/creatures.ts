import type { FlowResult } from './flow'
import { COLS, PLOTS, ROWS, type Cell } from './layout'

// Who comes to the garden, and when (Δ2 world-time events). Each creature
// has a reason to be here drawn from the water: the frog likes the wet rice
// paddy, the sparrow likes flowers in bloom, and the tanuki naps to the hum
// of a turning waterwheel (or, failing that, against a ripe pumpkin). They
// arrive a moment after their reason appears and wander off a while after
// it goes. Time only runs while the garden is attended, so nobody leaves
// because the child did.

export type CreatureKind = 'frog' | 'sparrow' | 'tanuki'
export const CREATURES: readonly CreatureKind[] = ['frog', 'sparrow', 'tanuki']

export type Phase = 'away' | 'arriving' | 'here' | 'leaving'

export const ARRIVE_DELAY: Record<CreatureKind, number> = { frog: 1.2, sparrow: 0.8, tanuki: 2.5 }
export const TRAVEL_SECONDS: Record<CreatureKind, number> = { frog: 2.8, sparrow: 2.2, tanuki: 6 }
export const LEAVE_DELAY = 4

/** The tanuki naps on the meadow at the left end of a spot's terrace (the middle column's too), else at the right. */
export function napsLeft(spot: Cell): boolean {
  return spot.c <= 3
}

// Asked for every visitor every frame, so the answers are shared cells, never built fresh (and never mutated).
const PLOT_SPOT: readonly Cell[] = PLOTS.map((plot) => ({ c: plot.c, r: plot.r }))
const CELL_SPOT: readonly Cell[] = Array.from({ length: COLS * ROWS }, (_, i) => ({ c: i % COLS, r: Math.floor(i / COLS) }))
const RICE = PLOTS.find((plot) => plot.kind === 'rice')!
const PUMPKIN = PLOTS.find((plot) => plot.kind === 'pumpkin')!

/** Where a creature wants to be (a cell), or null if it has no reason to be here. */
export function wantedSpot(kind: CreatureKind, flow: FlowResult, growth: readonly number[], wheelCells: readonly number[]): Cell | null {
  switch (kind) {
    case 'frog': {
      return flow.plotFlow[RICE.id] > 0 ? PLOT_SPOT[RICE.id] : null
    }
    case 'sparrow': {
      let best: Cell | null = null
      let bestGrowth = 0.7
      for (let i = 0; i < PLOTS.length; i++) {
        const plot = PLOTS[i]
        if ((plot.kind === 'sunflower' || plot.kind === 'cosmos') && growth[plot.id] >= bestGrowth) {
          best = PLOT_SPOT[plot.id]
          bestGrowth = growth[plot.id]
        }
      }
      return best
    }
    case 'tanuki': {
      for (let i = 0; i < wheelCells.length; i++) {
        const index = wheelCells[i]
        if ((flow.wheelFlow.get(index) ?? 0) > 0) return CELL_SPOT[index]
      }
      return growth[PUMPKIN.id] >= 1 ? PLOT_SPOT[PUMPKIN.id] : null
    }
    default: {
      const never: never = kind
      return never
    }
  }
}

/** One creature's comings and goings. */
export class Presence {
  readonly kind: CreatureKind
  phase: Phase = 'away'
  /** When the current phase began. */
  since = 0
  spot: Cell | null = null
  private wantSince: number | null = null
  private unwantSince: number | null = null

  constructor(kind: CreatureKind) {
    this.kind = kind
  }

  /** 0..1 through arriving or leaving; 1 while here. */
  progress(now: number): number {
    if (this.phase === 'here') return 1
    if (this.phase === 'away') return 0
    return Math.min(1, (now - this.since) / TRAVEL_SECONDS[this.kind])
  }

  /** Arrive at once, already settled (a saved garden reopening). */
  settle(spot: Cell | null, now: number): void {
    this.spot = spot
    this.phase = spot ? 'here' : 'away'
    this.since = now
  }

  update(now: number, wanted: Cell | null): void {
    if (wanted) {
      this.unwantSince = null
      this.wantSince ??= now
    } else {
      this.wantSince = null
      this.unwantSince ??= now
    }
    const moved = wanted !== null && this.spot !== null && (wanted.c !== this.spot.c || wanted.r !== this.spot.r)
    switch (this.phase) {
      case 'away':
        if (wanted && now - (this.wantSince ?? now) >= ARRIVE_DELAY[this.kind]) this.go('arriving', now, wanted)
        break
      case 'arriving':
        if (now - this.since >= TRAVEL_SECONDS[this.kind]) this.go('here', now, this.spot)
        break
      case 'here':
        if (!wanted && now - (this.unwantSince ?? now) >= LEAVE_DELAY) this.go('leaving', now, this.spot)
        // For the other end of the terraces the tanuki goes off round its own side and comes back round that one,
        // never across the garden through the beds and walls.
        else if (moved && this.kind === 'tanuki' && napsLeft(wanted) !== napsLeft(this.spot!)) this.go('leaving', now, this.spot)
        else if (moved) this.go('arriving', now, wanted)
        break
      case 'leaving':
        if (now - this.since >= TRAVEL_SECONDS[this.kind]) this.go('away', now, null)
        break
      default: {
        const never: never = this.phase
        return never
      }
    }
  }

  private go(phase: Phase, now: number, spot: Cell | null): void {
    this.phase = phase
    this.since = now
    this.spot = spot
  }
}
