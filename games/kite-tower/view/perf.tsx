import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { LOWEST_TIER, TIERS, type PerfRing, type TierGovernor } from '../quality'
import type { PerfHandle } from './stage'

// The grown-up perf readout. Triple-tap the invisible top-left corner (three
// taps inside 700 ms), or open the game with `?fps=1`, to see a bar graph of
// the last frames' CPU work (update plus render submit) against the 8 ms
// budget, one line of numbers, and buttons that pin a tier or hand it back to
// the governor. The corner is bare wall and takes three quick taps, so a
// child does not open it by accident.

const CORNER = 72
const TRIPLE_TAP_MS = 700
const BARS = 120
const WIDTH = 240
const HEIGHT = 64
const BUDGET_MS = 8

function p95(ring: PerfRing): number {
  const list = ring.ordered().sort((a, b) => a - b)
  return list.length ? list[Math.min(list.length - 1, Math.floor(list.length * 0.95))] : 0
}

const PANEL = { padding: '2px 6px', background: 'rgba(20,24,24,0.72)', borderRadius: 6 } as const

function readout(perf: PerfHandle, governor: TierGovernor) {
  return {
    fps: 1000 / governor.frameMs,
    frameMs: governor.frameMs,
    p95: p95(perf.ring),
    dropped: governor.lastDropped,
    frames: governor.lastFrames,
    tier: governor.tier,
    forced: governor.forced,
    dpr: Math.min(window.devicePixelRatio || 1, TIERS[governor.tier].dpr),
    calls: perf.render.calls,
    triangles: perf.render.triangles,
  }
}

function Readout({ perf, governor }: { perf: PerfHandle; governor: TierGovernor }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const [line, setLine] = useState(() => readout(perf, governor))

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
      setLine(readout(perf, governor))
    }, 300)
    return () => clearInterval(timer)
  }, [perf, governor])

  const pin = (tier: number | null) => (event: ReactPointerEvent) => {
    event.stopPropagation()
    governor.force(tier)
    setLine(readout(perf, governor))
  }
  const button = (active: boolean) =>
    ({
      ...PANEL,
      border: 'none',
      color: '#fff',
      font: 'inherit',
      padding: '4px 8px',
      background: active ? 'rgba(240,167,58,0.9)' : PANEL.background,
      cursor: 'pointer',
    }) as const

  return (
    <div data-perf-overlay style={{ position: 'absolute', top: 8, right: 8, zIndex: 3, font: '500 12px ui-monospace, Menlo, monospace', color: '#fff' }}>
      <canvas ref={canvas} width={WIDTH} height={HEIGHT} style={{ display: 'block', borderRadius: 6, pointerEvents: 'none' }} />
      <div style={{ ...PANEL, marginTop: 4, pointerEvents: 'none' }}>
        {/* wordless-ok: grown-up perf overlay, reached only by a triple tap in the corner or ?fps=1 */}
        {`${line.fps.toFixed(0)} fps · ${line.frameMs.toFixed(1)} ms · cpu p95 ${line.p95.toFixed(1)} ms · ${line.dropped}/${line.frames} dropped`}
      </div>
      <div style={{ ...PANEL, marginTop: 4, pointerEvents: 'none' }}>
        {/* wordless-ok: grown-up perf overlay, reached only by a triple tap in the corner or ?fps=1 */}
        {`${TIERS[line.tier].name} (${line.forced ? 'pinned' : 'auto'}) · dpr ${line.dpr} · ${line.calls} draws · ${(line.triangles / 1000).toFixed(0)}k tris`}
      </div>
      <div data-perf-tiers style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {TIERS.slice(0, LOWEST_TIER + 1).map((tier, i) => (
          <button key={tier.name} type="button" onPointerDown={pin(i)} style={button(line.forced && line.tier === i)}>
            {/* wordless-ok: grown-up tier buttons in the hidden overlay */}
            {tier.name}
          </button>
        ))}
        <button type="button" onPointerDown={pin(null)} style={button(!line.forced)}>
          {/* wordless-ok: grown-up tier buttons in the hidden overlay */}
          auto
        </button>
      </div>
    </div>
  )
}

export function GrownUpOverlay({ perf, governor, startOpen }: { perf: PerfHandle; governor: TierGovernor; startOpen: boolean }) {
  const [open, setOpen] = useState(startOpen)
  const taps = useRef<number[]>([])
  const onCorner = (event: ReactPointerEvent) => {
    event.stopPropagation()
    event.preventDefault()
    const now = performance.now()
    taps.current = [...taps.current.filter((t) => now - t < TRIPLE_TAP_MS), now]
    if (taps.current.length >= 3) {
      taps.current = []
      setOpen((shown) => !shown)
    }
  }
  return (
    <>
      <div data-grown-up-corner onPointerDown={onCorner} style={{ position: 'absolute', top: 0, left: 0, width: CORNER, height: CORNER, zIndex: 3, touchAction: 'none' }} />
      {open && <Readout perf={perf} governor={governor} />}
    </>
  )
}
