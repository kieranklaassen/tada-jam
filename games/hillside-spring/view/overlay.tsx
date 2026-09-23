import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { TIERS, type GovernorStats, type QualityGovernor } from '../quality'
import type { JamPerf } from './perf'

// A hidden grown-up overlay: triple-tap the top-left corner (sky, never a
// piece or a plot) to see frame rate, frame time, CPU work and the quality
// tier, and to pin a tier while judging how the garden looks and runs on this
// device. It takes three quick taps, so a child does not open it by accident.

const CORNER = 72
const TRIPLE_TAP_MS = 700

type Props = {
  governor: QualityGovernor
  perf: JamPerf
  /** Called after a tier is pinned or released, so the view can apply it. */
  onTier: () => void
}

export function GrownUpOverlay({ governor, perf, onTier }: Props) {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<GovernorStats>(governor.stats)
  const taps = useRef<number[]>([])

  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setStats(governor.stats), 400)
    return () => clearInterval(timer)
  }, [open, governor])

  const onCorner = (event: ReactPointerEvent) => {
    event.stopPropagation()
    const now = event.timeStamp
    taps.current = [...taps.current.filter((t) => now - t < TRIPLE_TAP_MS), now]
    if (taps.current.length >= 3) {
      taps.current = []
      setOpen((value) => !value)
    }
  }

  const pin = (tier: number | null) => {
    governor.force(tier)
    onTier()
    setStats(governor.stats)
  }

  const button = (label: string, active: boolean, onPick: () => void) => (
    <button
      key={label}
      onPointerDown={(event) => {
        event.stopPropagation()
        onPick()
      }}
      style={{ font: '600 13px system-ui, sans-serif', padding: '8px 10px', minHeight: 36, borderRadius: 8, border: 'none', background: active ? '#4d6b3c' : 'rgba(255,255,255,0.16)', color: '#fff' }}
    >
      {label}
    </button>
  )

  const tier = TIERS[stats.tier]
  return (
    <>
      <div data-grown-up-corner onPointerDown={onCorner} style={{ position: 'absolute', top: 0, left: 0, width: CORNER, height: CORNER, zIndex: 3, touchAction: 'none' }} />
      {open && (
        <div
          data-grown-up-overlay
          onPointerDown={(event) => event.stopPropagation()}
          style={{ position: 'absolute', top: 12, left: CORNER + 8, zIndex: 3, padding: 12, borderRadius: 12, background: 'rgba(40, 34, 24, 0.84)', color: '#fff', font: '500 14px ui-monospace, Menlo, monospace', display: 'grid', gap: 8 }}
        >
          {/* wordless-ok: grown-up performance overlay, reached only by a triple tap in the corner */}
          <div data-fps={stats.fps.toFixed(0)}>{`${stats.fps.toFixed(0)} fps · ${stats.frameMs.toFixed(1)} ms · cpu ${stats.workMs.toFixed(1)} ms · dropped ${stats.dropped}/40`}</div>
          {/* wordless-ok: grown-up performance overlay */}
          <div>{`tier ${tier.name} · dpr ${Math.min(window.devicePixelRatio || 1, tier.dpr)} · ${stats.forced ? 'pinned' : 'auto'} · ${perf.drawCalls} draws · ${(perf.triangles / 1000).toFixed(0)}k tris`}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {button('auto', !stats.forced, () => pin(null))}
            {TIERS.map((t, index) => button(t.name, stats.forced && stats.tier === index, () => pin(index)))}
          </div>
        </div>
      )}
    </>
  )
}
