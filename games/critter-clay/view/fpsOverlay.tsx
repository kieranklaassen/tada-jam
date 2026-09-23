import { useEffect, useRef } from 'react'
import type { PerfMonitor } from '../perf'
import { TIER_COUNT } from '../perf'

// A grown-up perf overlay behind `?fps=1`, off by default: bars of the last
// frames (whole-frame interval, with the CPU share drawn inside), guide lines
// at 60 and 30 fps, and one square per quality tier, lit up to the current
// one. No numerals, so there is nothing for a child to read.

const WIDTH = 240
const HEIGHT = 64
const BARS = 120
const SCALE_MS = 50

export function wantsFpsOverlay(search: string): boolean {
  return new URLSearchParams(search).get('fps') === '1'
}

export function FpsOverlay({ monitor }: { monitor: PerfMonitor }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const element = canvas.current
    if (!element) return
    const ratio = window.devicePixelRatio || 1
    element.width = WIDTH * ratio
    element.height = HEIGHT * ratio
    const g = element.getContext('2d')
    if (!g) return
    g.scale(ratio, ratio)
    const draw = () => {
      const intervals = monitor.intervals.snapshot().slice(-BARS)
      const cpu = monitor.cpu.snapshot().slice(-BARS)
      g.clearRect(0, 0, WIDTH, HEIGHT)
      g.fillStyle = 'rgba(16, 24, 40, 0.72)'
      g.fillRect(0, 0, WIDTH, HEIGHT)
      const w = (WIDTH - 36) / BARS
      const y = (ms: number) => HEIGHT - 4 - (Math.min(ms, SCALE_MS) / SCALE_MS) * (HEIGHT - 8)
      for (let i = 0; i < intervals.length; i++) {
        const ms = intervals[i]
        g.fillStyle = ms <= 17.5 ? '#7fd58b' : ms <= 34 ? '#f2c14e' : '#f07a6a'
        g.fillRect(4 + i * w, y(ms), Math.max(1, w - 0.4), HEIGHT - 4 - y(ms))
        const c = cpu[i - intervals.length + cpu.length]
        if (c !== undefined) {
          g.fillStyle = '#9cc7ff'
          g.fillRect(4 + i * w, y(c), Math.max(1, w - 0.4), HEIGHT - 4 - y(c))
        }
      }
      g.strokeStyle = 'rgba(255, 255, 255, 0.45)'
      g.lineWidth = 1
      for (const ms of [1000 / 60, 1000 / 30]) {
        g.beginPath()
        g.moveTo(4, y(ms))
        g.lineTo(WIDTH - 32, y(ms))
        g.stroke()
      }
      for (let tier = 0; tier < TIER_COUNT; tier++) {
        g.fillStyle = tier <= monitor.tiers.tier ? '#ffffff' : 'rgba(255, 255, 255, 0.2)'
        g.fillRect(WIDTH - 22, HEIGHT - 14 - tier * 13, 14, 10)
      }
    }
    const timer = window.setInterval(draw, 250)
    draw()
    return () => window.clearInterval(timer)
  }, [monitor])
  return <canvas ref={canvas} data-fps-overlay style={{ position: 'absolute', top: 10, left: 10, width: WIDTH, height: HEIGHT, borderRadius: 8, pointerEvents: 'none', zIndex: 2 }} />
}
