import { useEffect, useState } from 'react'

// Kid-land is landscape-only. In portrait a wordless "turn me sideways"
// picture covers the game; the game stays mounted underneath, so nothing
// is lost when the iPad turns back.
export function PortraitOverlay() {
  const [portrait, setPortrait] = useState(false)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const query = window.matchMedia('(orientation: portrait)')
    const update = () => setPortrait(query.matches)
    update()
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  if (!portrait) return null

  return (
    <div className="jam-portrait" data-portrait-overlay aria-hidden>
      <div className="jam-portrait-device" />
      <div className="jam-portrait-arrow">↻</div>
    </div>
  )
}
