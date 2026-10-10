// template: cartridge/perf.ts v3 (frozen: do not edit; tune through config.ts)
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

/** Publishes the handle. A canvas 2D game has no draw calls or triangles: it reports the sprites and figures it drew as `drawCalls`, and 0 triangles. */
export function installJamPerf(ring: PerfRing, read: () => { tier: number; drawCalls: number; triangles: number }): () => void {
  const perf: JamPerf = {
    get cpuMs() { return ring.ordered() },
    get tier() { return read().tier },
    get drawCalls() { return read().drawCalls },
    get triangles() { return read().triangles },
    reset() { ring.reset() },
  }
  window.__jamPerf = perf
  return () => { if (window.__jamPerf === perf) delete window.__jamPerf }
}
