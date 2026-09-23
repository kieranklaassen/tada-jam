import { useEffect, useRef } from 'react'
import { TOP_TIER } from '../tiers'

// Grown-up instrumentation. `window.__jamPerf` holds the CPU time of each
// frame's work (controller step, view update, and render submit) for the
// last 600 frames, plus the tier and the renderer budget. `?fps=1` shows a
// small bar graph of it with no numerals; the numbers live in the
// triple-tap grown-up overlay (`overlay.tsx`).

const FRAMES = 600
/** Frames summarised by `stats`, about a second at 60 Hz. */
const WINDOW = 60
/** An interval this long (ms) missed a 60 Hz vsync. */
const DROPPED_MS = 25

export type PerfStats = { fps: number; frameMs: number; cpuMs: number; dropped: number; frames: number }

export class JamPerf {
  readonly cpuMs: number[] = []
  readonly intervals: number[] = []
  tier = 0
  drawCalls = 0
  triangles = 0
  /** Rendering every other frame because the garden is resting. */
  paced = false
  private cursor = 0
  private readonly gaps: number[] = []
  private readonly work: number[] = []

  record(cpuMs: number, intervalMs: number, drawCalls: number, triangles: number, tier: number): void {
    if (this.cpuMs.length < FRAMES) {
      this.cpuMs.push(cpuMs)
      this.intervals.push(intervalMs)
    } else {
      this.cpuMs[this.cursor] = cpuMs
      this.intervals[this.cursor] = intervalMs
    }
    this.cursor = (this.cursor + 1) % FRAMES
    this.drawCalls = drawCalls
    this.triangles = triangles
    this.tier = tier
  }

  reset(): void {
    this.cpuMs.length = 0
    this.intervals.length = 0
    this.cursor = 0
  }

  /** Frame rate, mean interval, CPU p95, and missed vsyncs over the newest frames (a paced frame may take two). */
  stats(out: PerfStats): PerfStats {
    const n = this.recent(this.intervals, WINDOW, this.gaps)
    this.recent(this.cpuMs, WINDOW, this.work)
    let sum = 0
    let counted = 0
    let dropped = 0
    const late = DROPPED_MS * (this.paced ? 2 : 1)
    for (let i = 0; i < n; i++) {
      const gap = this.gaps[i]
      if (!(gap > 0)) continue
      sum += gap
      counted += 1
      if (gap > late) dropped += 1
    }
    const cpu = this.work.slice(0, n).sort((a, b) => a - b)
    out.frameMs = counted ? sum / counted : 0
    out.fps = out.frameMs > 0 ? 1000 / out.frameMs : 0
    out.cpuMs = n ? cpu[Math.min(n - 1, Math.floor(n * 0.95))] : 0
    out.dropped = dropped
    out.frames = n
    return out
  }

  /** The newest `count` samples of `list`, oldest first, into `out`. */
  recent(list: readonly number[], count: number, out: number[]): number {
    const size = list.length
    const n = Math.min(count, size)
    const end = size < FRAMES ? size : this.cursor
    for (let i = 0; i < n; i++) out[i] = list[(end - n + i + size) % size]
    return n
  }
}

type PerfWindow = Window & { __jamPerf?: JamPerf }

export function installJamPerf(perf: JamPerf): () => void {
  const target = window as PerfWindow
  target.__jamPerf = perf
  return () => {
    if (target.__jamPerf === perf) delete target.__jamPerf
  }
}

const BARS = 120
const WIDTH = 240
const HEIGHT = 84

/** Frame-time bars: grey for the interval between frames, teal for CPU work; guides at 8 ms and 16.7 ms; tier as dots. */
export function PerfOverlay({ perf }: { perf: JamPerf }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current
    const g = element?.getContext('2d')
    if (!element || !g) return
    const scale = window.devicePixelRatio || 1
    element.width = WIDTH * scale
    element.height = HEIGHT * scale
    g.scale(scale, scale)
    const cpu: number[] = []
    const gaps: number[] = []
    const y = (ms: number) => HEIGHT - 12 - Math.min(ms, 50) * ((HEIGHT - 16) / 50)
    const draw = () => {
      g.clearRect(0, 0, WIDTH, HEIGHT)
      g.fillStyle = 'rgba(8, 20, 22, 0.78)'
      g.fillRect(0, 0, WIDTH, HEIGHT)
      const n = perf.recent(perf.cpuMs, BARS, cpu)
      perf.recent(perf.intervals, BARS, gaps)
      const w = WIDTH / BARS
      for (let i = 0; i < n; i++) {
        const x = WIDTH - (n - i) * w
        g.fillStyle = gaps[i] > 25 ? 'rgba(255, 140, 110, 0.55)' : 'rgba(200, 215, 215, 0.35)'
        g.fillRect(x, y(gaps[i]), w - 0.5, HEIGHT - 12 - y(gaps[i]))
        g.fillStyle = cpu[i] > 8 ? 'rgba(255, 196, 90, 0.95)' : 'rgba(90, 230, 210, 0.95)'
        g.fillRect(x, y(cpu[i]), w - 0.5, HEIGHT - 12 - y(cpu[i]))
      }
      g.strokeStyle = 'rgba(90, 230, 210, 0.6)'
      g.beginPath()
      g.moveTo(0, y(8))
      g.lineTo(WIDTH, y(8))
      g.stroke()
      g.strokeStyle = 'rgba(255, 255, 255, 0.45)'
      g.beginPath()
      g.moveTo(0, y(16.7))
      g.lineTo(WIDTH, y(16.7))
      g.stroke()
      for (let t = 0; t <= TOP_TIER; t++) {
        g.fillStyle = t <= perf.tier ? 'rgba(90, 230, 210, 0.95)' : 'rgba(255, 255, 255, 0.2)'
        g.beginPath()
        g.arc(8 + t * 11, HEIGHT - 5, 3.5, 0, Math.PI * 2)
        g.fill()
      }
    }
    const timer = setInterval(draw, 250)
    return () => clearInterval(timer)
  }, [perf])
  return <canvas ref={canvas} data-perf-overlay style={{ position: 'absolute', top: 10, right: 10, width: WIDTH, height: HEIGHT, borderRadius: 8, pointerEvents: 'none', zIndex: 2 }} />
}
