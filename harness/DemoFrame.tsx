import { useEffect, useState } from 'react'
import { CornerControl } from './CornerControl'
import { demoPlayerHref, findDemo, loadDemoCatalog } from './demos'
import { PortraitOverlay } from './PortraitOverlay'

// An old game in the jam's frame. The demo player is a separate page built from
// the lab, and the jam shares no code with it, so the old game is shown by
// framing that page without its rating strip. The home control is the same as
// over a game, but a held finger does nothing: there is nothing to set up.
export function DemoFrame({ demoKey, onExit }: { demoKey: string; onExit: () => void }) {
  const [name, setName] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    void loadDemoCatalog().then((groups) => {
      if (!alive) return
      const demo = findDemo(groups, demoKey)
      // A key the catalog does not hold (or no catalog at all) has nothing to show.
      if (demo) setName(demo.name)
      else onExit()
    })
    return () => {
      alive = false
    }
  }, [demoKey, onExit])

  return (
    <div className="jam-shell jam-demo">
      <CornerControl onHome={onExit} />
      <div className="jam-surface">{name !== null && <iframe className="jam-demo-frame" title={name} src={demoPlayerHref(demoKey)} allow="autoplay" />}</div>
      <PortraitOverlay />
    </div>
  )
}
