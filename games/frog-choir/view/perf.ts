// Performance instruments for grown-ups and the jam's probe. The last 600
// frames of CPU time (update plus render submit) are kept in a ring and
// exposed as `window.__jamPerf`. `?fps=1` adds a small bar graph of frame
// intervals in the corner: bars and a 60 fps line, no numbers.

const FRAMES = 600
const BARS = 120

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

export class PerfMeter {
  tier = 0
  drawCalls = 0
  triangles = 0
  private readonly cpu = new Float32Array(FRAMES)
  private count = 0
  private head = 0
  private readonly intervals = new Float32Array(BARS)
  private barHead = 0
  private graph: CanvasRenderingContext2D | null = null
  private element: HTMLCanvasElement | null = null
  private readonly api: JamPerf

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
        meter.count = 0
        meter.head = 0
      },
    }
  }

  install(container: HTMLElement, showGraph: boolean): void {
    window.__jamPerf = this.api
    if (!showGraph) return
    const element = document.createElement('canvas')
    element.width = BARS * 2
    element.height = 64
    Object.assign(element.style, { position: 'absolute', right: '8px', top: '8px', width: `${BARS * 2}px`, height: '64px', pointerEvents: 'none', borderRadius: '6px' })
    container.appendChild(element)
    this.element = element
    this.graph = element.getContext('2d')
  }

  uninstall(): void {
    if (window.__jamPerf === this.api) delete window.__jamPerf
    this.element?.remove()
    this.element = null
    this.graph = null
  }

  record(cpuMs: number, intervalMs: number): void {
    this.cpu[this.head] = cpuMs
    this.head = (this.head + 1) % FRAMES
    this.count = Math.min(FRAMES, this.count + 1)
    this.intervals[this.barHead] = intervalMs
    this.barHead = (this.barHead + 1) % BARS
    if (this.graph) this.draw(this.graph)
  }

  private samples(): number[] {
    const out: number[] = []
    for (let i = 0; i < this.count; i++) out.push(this.cpu[(this.head - this.count + i + FRAMES) % FRAMES])
    return out
  }

  private draw(g: CanvasRenderingContext2D): void {
    const h = 64
    const msToPx = h / 50
    g.fillStyle = 'rgba(40, 28, 60, 0.55)'
    g.fillRect(0, 0, BARS * 2, h)
    for (let i = 0; i < BARS; i++) {
      const ms = this.intervals[(this.barHead + i) % BARS]
      g.fillStyle = ms > 20 ? '#ff8f8f' : ms > 17.5 ? '#ffd27a' : '#9ff0c8'
      const bar = Math.min(h, ms * msToPx)
      g.fillRect(i * 2, h - bar, 1.5, bar)
    }
    g.fillStyle = 'rgba(255, 255, 255, 0.7)'
    g.fillRect(0, h - (1000 / 60) * msToPx, BARS * 2, 1)
    const tierWidth = (BARS * 2) / 4
    g.fillStyle = 'rgba(255, 255, 255, 0.85)'
    g.fillRect(this.tier * tierWidth, 0, tierWidth, 3)
  }
}
