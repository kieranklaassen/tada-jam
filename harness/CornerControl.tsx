import { useEffect, useRef, type PointerEvent } from 'react'

// The one piece of shell chrome over a game or a demo. A tap goes home. A
// finger held on it for HOLD_MS without leaving it is the grown-up gesture:
// a child who taps or brushes past it never gets the grown-up controls.

export const HOLD_MS = 1000

export function CornerControl({ onHome, onHold, holdLabel }: { onHome: () => void; onHold: () => void; holdLabel: string }) {
  const timer = useRef<number | null>(null)
  const held = useRef(false)

  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = null
  }
  useEffect(() => clear, [])

  const down = (event: PointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary) return
    held.current = false
    clear()
    timer.current = window.setTimeout(() => {
      timer.current = null
      held.current = true
      onHold()
    }, HOLD_MS)
  }
  // A finger that slides off or is cancelled neither goes home nor counts as a hold.
  const abandon = () => {
    clear()
    held.current = true
  }
  const click = () => {
    clear()
    if (!held.current) onHome()
    held.current = false
  }

  return (
    <button
      type="button"
      className="jam-corner"
      aria-label="Home"
      title={holdLabel}
      onPointerDown={down}
      onPointerLeave={abandon}
      onPointerCancel={abandon}
      onClick={click}
      onContextMenu={(event) => event.preventDefault()}
    >
      <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M3.5 11.5 12 4l8.5 7.5" />
        <path d="M6 10v9.5h4.2V14h3.6v5.5H18V10" />
      </svg>
    </button>
  )
}
