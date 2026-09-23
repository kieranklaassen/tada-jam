import { LOWEST_TIER } from '../quality'

// What a grown-up or a script can read about the frame budget (R13):
// `window.__jamPerf` (a rolling record of CPU time per frame, the tier, draw
// calls and triangles) and, behind `?fps=1`, a bar graph of frame times with
// no numerals. `?tier=N` pins a quality tier (0 full to 3 minimal).

export const BUFFER = 600

export type JamPerf = {
  cpuMs: number[]
  tier: number
  drawCalls: number
  triangles: number
  reset(): void
}

declare global {
  interface Window {
    __jamPerf?: JamPerf
  }
}

export function readOverrides(search: string): { tier: number | null; overlay: boolean } {
  const params = new URLSearchParams(search)
  const raw = params.get('tier')
  const n = raw === null ? NaN : Number(raw)
  return { tier: Number.isInteger(n) && n >= 0 && n <= LOWEST_TIER ? n : null, overlay: params.get('fps') === '1' }
}

/** The rolling record behind window.__jamPerf. Writes in place; nothing allocates per frame. */
export class PerfRecord implements JamPerf {
  cpuMs: number[] = []
  tier = 0
  drawCalls = 0
  triangles = 0
  private cursor = 0

  push(ms: number): void {
    if (this.cpuMs.length < BUFFER) this.cpuMs.push(ms)
    else this.cpuMs[this.cursor] = ms
    this.cursor = (this.cursor + 1) % BUFFER
  }

  reset(): void {
    this.cpuMs.length = 0
    this.cursor = 0
  }
}

/** A grown-up frame-time strip: one bar per frame, green under budget, amber over, red when a frame is missed. */
export class PerfOverlay {
  readonly canvas: HTMLCanvasElement
  private readonly ctx: CanvasRenderingContext2D
  private readonly bars = new Float32Array(120)
  private cursor = 0
  private frames = 0

  constructor() {
    this.canvas = document.createElement('canvas')
    this.canvas.width = 240
    this.canvas.height = 64
    Object.assign(this.canvas.style, { position: 'absolute', left: '8px', top: '8px', width: '240px', height: '64px', pointerEvents: 'none', background: 'rgba(0,0,0,0.35)', borderRadius: '6px' })
    this.ctx = this.canvas.getContext('2d')!
  }

  frame(intervalMs: number, cpuMs: number): void {
    this.bars[this.cursor] = intervalMs
    this.cursor = (this.cursor + 1) % this.bars.length
    if (++this.frames % 6 !== 0) return
    const { ctx } = this
    ctx.clearRect(0, 0, 240, 64)
    const scale = 64 / 50
    for (let i = 0; i < this.bars.length; i++) {
      const v = this.bars[(this.cursor + i) % this.bars.length]
      ctx.fillStyle = v <= 17.5 ? '#7fd17f' : v <= 25 ? '#f0c060' : '#f07060'
      const h = Math.min(64, v * scale)
      ctx.fillRect(i * 2, 64 - h, 1.5, h)
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillRect(0, 64 - 16.7 * scale, 240, 1)
    ctx.fillStyle = '#9fd0ff'
    ctx.fillRect(236, 64 - Math.min(64, cpuMs * scale * 2), 4, Math.min(64, cpuMs * scale * 2))
  }
}
