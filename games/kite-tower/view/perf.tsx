import { useEffect, useRef, useState } from 'react'
import { TIERS, type PerfRing, type TierGovernor } from '../quality'
import type { PerfHandle } from './stage'

// The grown-up perf readout, only with `?fps=1` in the address: a bar graph
// of the last frames' CPU work (update plus render submit) against the 8 ms
// budget, and one line of numbers. Children never reach it.

const BARS = 120
const WIDTH = 240
const HEIGHT = 64
const BUDGET_MS = 8

function p95(ring: PerfRing): number {
  const list = ring.ordered().sort((a, b) => a - b)
  return list.length ? list[Math.min(list.length - 1, Math.floor(list.length * 0.95))] : 0
}

export function PerfOverlay({ perf, governor }: { perf: PerfHandle; governor: TierGovernor }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [line, setLine] = useState({ fps: 0, p95: 0, tier: governor.tier, calls: 0, triangles: 0 })

  useEffect(() => {
    const timer = setInterval(() => {
      const context = canvas.current?.getContext('2d')
      if (context) {
        context.clearRect(0, 0, WIDTH, HEIGHT)
        context.fillStyle = 'rgba(20,24,24,0.72)'
        context.fillRect(0, 0, WIDTH, HEIGHT)
        const scale = HEIGHT / (BUDGET_MS * 2)
        context.fillStyle = 'rgba(255,255,255,0.35)'
        context.fillRect(0, HEIGHT - BUDGET_MS * scale, WIDTH, 1)
        for (let i = 0; i < BARS; i++) {
          const ms = perf.ring.recent(i)
          const h = Math.min(HEIGHT, ms * scale)
          context.fillStyle = ms > BUDGET_MS ? '#f08a2a' : '#8fd18a'
          context.fillRect(WIDTH - (i + 1) * (WIDTH / BARS), HEIGHT - h, WIDTH / BARS - 0.5, h)
        }
      }
      setLine({ fps: 1000 / governor.frameMs, p95: p95(perf.ring), tier: governor.tier, calls: perf.render.calls, triangles: perf.render.triangles })
    }, 300)
    return () => clearInterval(timer)
  }, [perf, governor])

  return (
    <div data-perf-overlay style={{ position: 'absolute', top: 8, right: 8, zIndex: 3, pointerEvents: 'none', font: '500 12px ui-monospace, Menlo, monospace', color: '#fff' }}>
      <canvas ref={canvas} width={WIDTH} height={HEIGHT} style={{ display: 'block', borderRadius: 6 }} />
      {/* wordless-ok: grown-up perf overlay, only with ?fps=1 in the address */}
      <div style={{ marginTop: 4, padding: '2px 6px', background: 'rgba(20,24,24,0.72)', borderRadius: 6 }}>{`${line.fps.toFixed(0)} fps · cpu p95 ${line.p95.toFixed(1)} ms · ${TIERS[line.tier].name} · ${line.calls} draws · ${(line.triangles / 1000).toFixed(0)}k tris`}</div>
    </div>
  )
}
