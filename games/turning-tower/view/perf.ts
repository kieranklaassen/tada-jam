// Grown-up measurement only. `window.__jamPerf` exposes the CPU cost of each
// frame (controller update plus the render submit) so the jam's perf probe
// can compare games; `?fps=1`, or three quick taps in the top-left corner,
// shows a tiny bar graph of frame intervals there. Neither shows a word or a
// numeral.

const SAMPLES = 600
const BARS = 90

export const CORNER_PX = 72
const TRIPLE_TAP_MS = 700
/** Fingers of one resting hand land within a few milliseconds; separate taps do not. */
const TAP_GAP_MS = 50

/** Three taps on the empty corner within 700 ms: the grown-up's way to the bar graph on a device with no address bar. */
export class CornerTaps {
  private first = 0
  private last = 0
  private count = 0

  tap(x: number, y: number, t: number): boolean {
    if (x > CORNER_PX || y > CORNER_PX) {
      this.count = 0
      return false
    }
    if (this.count > 0 && t - this.last < TAP_GAP_MS) return false
    if (this.count === 0 || t - this.first > TRIPLE_TAP_MS) {
      this.first = t
      this.count = 0
    }
    this.last = t
    this.count += 1
    if (this.count < 3) return false
    this.count = 0
    return true
  }
}

export type JamPerf = {
  readonly cpuMs: number[]
  readonly tier: number
  readonly drawCalls: number
  readonly triangles: number
  reset(): void
}

declare global {
  interface Window {
    __jamPerf?: JamPerf
  }
}

export class PerfMonitor {
  tier = 0
  drawCalls = 0
  triangles = 0
  private readonly cpu = new Float32Array(SAMPLES)
  private cursor = 0
  private filled = 0
  private readonly intervals = new Float32Array(BARS)
  private barCursor = 0
  private overlay: { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } | null = null
  private frames = 0

  record(cpuMs: number, intervalMs: number): void {
    this.cpu[this.cursor] = cpuMs
    this.cursor = (this.cursor + 1) % SAMPLES
    this.filled = Math.min(SAMPLES, this.filled + 1)
    this.intervals[this.barCursor] = intervalMs
    this.barCursor = (this.barCursor + 1) % BARS
    this.frames += 1
    if (this.overlay && this.frames % 6 === 0) this.draw()
  }

  reset(): void {
    this.cursor = 0
    this.filled = 0
  }

  /** Oldest first. Allocates, so only the probe calls it. */
  samples(): number[] {
    const out: number[] = []
    const start = this.filled < SAMPLES ? 0 : this.cursor
    for (let i = 0; i < this.filled; i++) out.push(this.cpu[(start + i) % SAMPLES])
    return out
  }

  expose(): () => void {
    const monitor = this
    const api: JamPerf = {
      get cpuMs() {
        return monitor.samples()
      },
      get tier() {
        return monitor.tier
      },
      get drawCalls() {
        return monitor.drawCalls
      },
      get triangles() {
        return monitor.triangles
      },
      reset() {
        monitor.reset()
      },
    }
    window.__jamPerf = api
    return () => {
      if (window.__jamPerf === api) delete window.__jamPerf
    }
  }

  /** The bar graph: one bar per frame interval, a line at 60 Hz, one dot per quality tier step. */
  attachOverlay(parent: HTMLElement): () => void {
    const canvas = document.createElement('canvas')
    const ratio = Math.min(2, window.devicePixelRatio || 1)
    canvas.width = BARS * 2 * ratio
    canvas.height = 44 * ratio
    Object.assign(canvas.style, {
      position: 'absolute',
      top: '8px',
      left: '8px',
      width: `${BARS * 2}px`,
      height: '44px',
      pointerEvents: 'none',
      borderRadius: '6px',
      background: 'rgba(40, 30, 70, 0.55)',
      zIndex: '2',
    })
    parent.appendChild(canvas)
    const ctx = canvas.getContext('2d')
    if (!ctx) return () => canvas.remove()
    ctx.scale(ratio, ratio)
    this.overlay = { canvas, ctx }
    return () => {
      this.overlay = null
      canvas.remove()
    }
  }

  private draw(): void {
    const overlay = this.overlay
    if (!overlay) return
    const { ctx } = overlay
    const h = 36
    ctx.clearRect(0, 0, BARS * 2, 44)
    for (let i = 0; i < BARS; i++) {
      const value = this.intervals[(this.barCursor + i) % BARS]
      const k = Math.min(1, value / 50)
      ctx.fillStyle = value < 18 ? '#8fe3b0' : value < 26 ? '#ffd166' : '#ff7b7b'
      ctx.fillRect(i * 2, 4 + h * (1 - k), 1.5, h * k)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.7)'
    ctx.fillRect(0, 4 + h * (1 - 16.7 / 50), BARS * 2, 1)
    for (let t = 0; t <= this.tier; t++) {
      ctx.fillStyle = t === 0 ? '#ffffff' : '#ffd166'
      ctx.fillRect(BARS * 2 - 8 - t * 7, 38, 4, 4)
    }
  }
}
