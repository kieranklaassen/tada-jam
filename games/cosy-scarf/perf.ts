// Grown-up performance instruments, invisible to children. `window.__jamPerf`
// carries the CPU cost of each frame (update plus render submission) for the
// jam's perf probe, and `?fps=1` shows a small bar graph of frame intervals:
// bars, not numerals, with guide lines at 60 fps and at the 8 ms CPU budget.

export type JamPerf = {
  readonly cpuMs: number[]
  readonly tier: number
  readonly drawCalls: number
  readonly triangles: number
  reset(): void
}

const FRAMES = 600
const BARS = 120

declare global {
  interface Window {
    __jamPerf?: JamPerf
  }
}

export class PerfMeter {
  private readonly cpu = new Float32Array(FRAMES)
  private readonly intervals = new Float32Array(BARS)
  private readonly cpuBars = new Float32Array(BARS)
  private head = 0
  private count = 0
  private barHead = 0
  private overlay: CanvasRenderingContext2D | null = null
  private overlayCanvas: HTMLCanvasElement | null = null
  private sinceDraw = 0
  private tier = 0
  private drawCalls = 0
  private triangles = 0
  readonly api: JamPerf

  constructor() {
    const meter = this
    this.api = {
      get cpuMs() {
        return meter.samples()
      },
      get tier() {
        return meter.tier
      },
      get drawCalls() {
        return meter.drawCalls
      },
      get triangles() {
        return meter.triangles
      },
      reset() {
        meter.head = 0
        meter.count = 0
      },
    }
  }

  install(): void {
    window.__jamPerf = this.api
  }

  uninstall(): void {
    if (window.__jamPerf === this.api) delete window.__jamPerf
    this.overlayCanvas?.remove()
    this.overlayCanvas = null
    this.overlay = null
  }

  /** The hidden bar graph (`?fps=1`), drawn into `parent`. */
  showOverlay(parent: HTMLElement): void {
    const canvas = document.createElement('canvas')
    canvas.width = BARS * 2
    canvas.height = 64
    Object.assign(canvas.style, { position: 'absolute', left: '8px', top: '8px', width: `${BARS * 2}px`, height: '64px', pointerEvents: 'none', borderRadius: '6px' })
    canvas.dataset.perfOverlay = ''
    parent.appendChild(canvas)
    this.overlayCanvas = canvas
    this.overlay = canvas.getContext('2d')
  }

  record(cpuMs: number, intervalMs: number, tier: number, drawCalls: number, triangles: number): void {
    this.cpu[this.head] = cpuMs
    this.head = (this.head + 1) % FRAMES
    this.count = Math.min(FRAMES, this.count + 1)
    this.intervals[this.barHead] = intervalMs
    this.cpuBars[this.barHead] = cpuMs
    this.barHead = (this.barHead + 1) % BARS
    this.tier = tier
    this.drawCalls = drawCalls
    this.triangles = triangles
    if (this.overlay && ++this.sinceDraw >= 6) {
      this.sinceDraw = 0
      this.draw(this.overlay)
    }
  }

  private samples(): number[] {
    const out: number[] = []
    const start = (this.head - this.count + FRAMES) % FRAMES
    for (let i = 0; i < this.count; i++) out.push(this.cpu[(start + i) % FRAMES])
    return out
  }

  private draw(g: CanvasRenderingContext2D): void {
    const h = 64
    const scale = h / 50
    g.clearRect(0, 0, BARS * 2, h)
    g.fillStyle = 'rgba(20, 28, 36, 0.72)'
    g.fillRect(0, 0, BARS * 2, h)
    for (let i = 0; i < BARS; i++) {
      const index = (this.barHead + i) % BARS
      const interval = Math.min(50, this.intervals[index])
      const cpu = Math.min(50, this.cpuBars[index])
      g.fillStyle = interval > 20 ? '#f08a5d' : '#8fd6a0'
      g.fillRect(i * 2, h - interval * scale, 1.5, interval * scale)
      g.fillStyle = cpu > 8 ? '#ffd166' : '#6fb7ff'
      g.fillRect(i * 2, h - cpu * scale, 1.5, cpu * scale)
    }
    g.fillStyle = 'rgba(255,255,255,0.7)'
    g.fillRect(0, h - 16.7 * scale, BARS * 2, 1)
    g.fillStyle = 'rgba(255,209,102,0.7)'
    g.fillRect(0, h - 8 * scale, BARS * 2, 1)
  }
}
