import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { TIERS, type GovernorStats, type QualityGovernor } from '../quality'

// A hidden grown-up overlay: triple-tap the top-left corner to show frame
// rate, frame time, CPU work, and the quality tier, and to pin a tier while
// judging how the table looks and runs on this device. Children never see
// it by accident: the corner is backdrop, and it takes three quick taps.

const CORNER = 72
const TRIPLE_TAP_MS = 700

export function GrownUpOverlay({ governor }: { governor: QualityGovernor }) {
  const [open, setOpen] = useState(false)
  const [stats, setStats] = useState<GovernorStats>(governor.stats)
  const taps = useRef<number[]>([])

  useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setStats({ ...governor.stats, tier: governor.tier, forced: governor.forced }), 400)
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

  const button = (label: string, active: boolean, onPick: () => void) => (
    <button
      key={label}
      onPointerDown={(event) => {
        event.stopPropagation()
        onPick()
        setStats({ ...governor.stats, tier: governor.tier, forced: governor.forced })
      }}
      style={{
        font: '600 13px system-ui, sans-serif',
        padding: '8px 10px',
        minHeight: 36,
        borderRadius: 8,
        border: 'none',
        background: active ? '#2f5d5e' : 'rgba(255,255,255,0.14)',
        color: '#fff',
      }}
    >
      {label}
    </button>
  )

  return (
    <>
      <div data-grown-up-corner onPointerDown={onCorner} style={{ position: 'absolute', top: 0, left: 0, width: CORNER, height: CORNER, zIndex: 3, touchAction: 'none' }} />
      {open && (
        <div
          data-grown-up-overlay
          onPointerDown={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            top: 12,
            left: CORNER + 8,
            zIndex: 3,
            padding: 12,
            borderRadius: 12,
            background: 'rgba(20, 28, 28, 0.82)',
            color: '#fff',
            font: '500 14px ui-monospace, Menlo, monospace',
            display: 'grid',
            gap: 8,
          }}
        >
          {/* wordless-ok: grown-up performance overlay, reached only by a triple tap in the corner */}
          <div data-fps={stats.fps.toFixed(0)}>{`${stats.fps.toFixed(0)} fps · ${stats.frameMs.toFixed(1)} ms · cpu ${stats.workMs.toFixed(1)} ms · dropped ${stats.dropped}/40`}</div>
          {/* wordless-ok: grown-up performance overlay */}
          <div>{`tier ${TIERS[stats.tier].name} · dpr ${Math.min(window.devicePixelRatio || 1, TIERS[stats.tier].dpr)} · ${stats.forced ? 'pinned' : 'auto'} · ${governor.render.calls} draws · ${(governor.render.triangles / 1000).toFixed(0)}k tris`}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {button('auto', !stats.forced, () => governor.force(null))}
            {TIERS.map((tier, index) => button(tier.name, stats.forced && stats.tier === index, () => governor.force(index)))}
          </div>
        </div>
      )}
    </>
  )
}
