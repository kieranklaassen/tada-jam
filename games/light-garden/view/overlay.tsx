import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { TIERS, type QualityGovernor } from '../tiers'
import type { JamPerf, PerfStats } from './perf'

// A hidden grown-up overlay: triple-tap the top-left corner to show frame
// rate, frame time, CPU work, missed frames, the tier and its resolution,
// and the renderer budget, and to pin a tier while judging how the garden
// looks and runs on this device. A child never opens it by accident: the
// corner is backdrop, and it takes three quick taps.

const CORNER = 72
const TRIPLE_TAP_MS = 700

type Shown = PerfStats & { tier: number; pinned: boolean }

export function GrownUpOverlay({ perf, governor, onTier }: { perf: JamPerf; governor: QualityGovernor; onTier: (tier: number) => void }) {
  const [open, setOpen] = useState(false)
  const [shown, setShown] = useState<Shown | null>(null)
  const taps = useRef<number[]>([])

  useEffect(() => {
    if (!open) return
    const read = () => setShown({ ...perf.stats({ fps: 0, frameMs: 0, cpuMs: 0, dropped: 0, frames: 0 }), tier: governor.tier, pinned: governor.pinned })
    read()
    const timer = setInterval(read, 400)
    return () => clearInterval(timer)
  }, [open, perf, governor])

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
    onTier(governor.tier)
    setShown((value) => value && { ...value, tier: governor.tier, pinned: governor.pinned })
  }

  const button = (label: string, active: boolean, tier: number | null) => (
    <button
      key={label}
      onPointerDown={(event) => {
        event.stopPropagation()
        pin(tier)
      }}
      style={{
        font: '600 13px system-ui, sans-serif',
        padding: '8px 12px',
        minHeight: 36,
        borderRadius: 8,
        border: 'none',
        background: active ? '#2c6b68' : 'rgba(255,255,255,0.14)',
        color: '#fff',
      }}
    >
      {label}
    </button>
  )

  const dpr = shown ? Math.min(window.devicePixelRatio || 1, TIERS[shown.tier].dpr) : 1
  return (
    <>
      <div data-grown-up-corner onPointerDown={onCorner} style={{ position: 'absolute', top: 0, left: 0, width: CORNER, height: CORNER, zIndex: 3, touchAction: 'none' }} />
      {open && shown && (
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
            background: 'rgba(8, 22, 24, 0.84)',
            color: '#fff',
            font: '500 14px ui-monospace, Menlo, monospace',
            display: 'grid',
            gap: 8,
          }}
        >
          {/* wordless-ok: grown-up performance overlay, reached only by a triple tap in the corner */}
          <div data-fps={shown.fps.toFixed(0)}>{`${shown.fps.toFixed(0)} fps · ${shown.frameMs.toFixed(1)} ms · cpu p95 ${shown.cpuMs.toFixed(1)} ms · missed ${shown.dropped}/${shown.frames}${perf.paced ? ' · resting, half rate' : ''}`}</div>
          {/* wordless-ok: grown-up performance overlay */}
          <div>{`tier ${shown.tier}/${TIERS.length - 1} · dpr ${dpr} · ${shown.pinned ? 'pinned' : 'auto'} · ${perf.drawCalls} draws · ${(perf.triangles / 1000).toFixed(0)}k tris`}</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {/* wordless-ok: grown-up tier buttons */}
            {button('auto', !shown.pinned, null)}
            {TIERS.map((_, index) => button(String(index), shown.pinned && shown.tier === index, index))}
          </div>
        </div>
      )}
    </>
  )
}
