import type { PerfRing } from './quality'

// Grown-up measurement only: the jam's perf probe reads `window.__jamPerf`.
// Every game that declares it on Window must use this exact type, or the
// merged program fails TS2717 (docs/solutions/build-errors/).
type JamPerf = { readonly cpuMs: number[]; readonly tier: number; readonly drawCalls: number; readonly triangles: number; reset(): void }

declare global {
  interface Window {
    __jamPerf?: JamPerf
  }
}

/** Publishes the handle; canvas 2D has no draw calls, so `drawCalls` counts the sprites and figures drawn. */
export function installJamPerf(ring: PerfRing, tier: () => number, draws: () => number): () => void {
  const perf: JamPerf = {
    get cpuMs() { return ring.ordered() },
    get tier() { return tier() },
    get drawCalls() { return draws() },
    triangles: 0,
    reset() { ring.reset() },
  }
  window.__jamPerf = perf
  return () => { if (window.__jamPerf === perf) delete window.__jamPerf }
}
