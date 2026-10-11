import { useEffect, useState } from 'react'
import { CornerControl } from './CornerControl'
import { demoPlayerHref, findDemo, loadDemoCatalog } from './demos'
import { PortraitOverlay } from './PortraitOverlay'

// A demo in the jam's frame. The demo player is a separate page built from the
// lab, and the jam shares no code with it, so the demo is shown by framing
// that page without its rating strip. The corner control is the same as over
// a game: a tap goes home, and a held finger takes a grown-up to the demo's
// own page, where it can be rated.
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
      <CornerControl onHome={onExit} onHold={() => window.location.assign(demoPlayerHref(demoKey, true))} holdLabel="Hold to rate this demo" />
      <div className="jam-surface">{name !== null && <iframe className="jam-demo-frame" title={name} src={demoPlayerHref(demoKey, false)} allow="autoplay" />}</div>
      <PortraitOverlay />
    </div>
  )
}
