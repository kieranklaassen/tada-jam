import { useEffect, useMemo, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { WorkshopAudio } from './audio'
import { WorkshopController } from './controller'
import { critterClayManifest } from './manifest'
import { PALETTE } from './palette'
import { PerfMonitor, TierController, tierOverride, TOP_TIER } from './perf'
import { deserialize } from './state'
import { FpsOverlay, wantsFpsOverlay } from './view/fpsOverlay'
import { Stage } from './view/stage'

// A thin Mount: load the saved workshop, build the controller, render the
// bench, and forward attention. The bench is the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function CritterClayMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const [controller, setController] = useState<WorkshopController | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden
  const monitor = useMemo(() => {
    const pinned = tierOverride(window.location.search)
    return new PerfMonitor(new TierController(pinned ?? TOP_TIER, pinned !== null))
  }, [])
  const showFps = useMemo(() => wantsFpsOverlay(window.location.search), [])

  useEffect(() => {
    let disposed = false
    let created: WorkshopController | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        if (disposed) return
        created = new WorkshopController(deserialize(saved), { save: (state) => storage.save(state), sound: new WorkshopAudio(), childAge })
        setController(created)
      })
    return () => {
      disposed = true
      created?.dispose()
    }
  }, [storage, childAge])

  useEffect(() => {
    controller?.setRunning(running)
  }, [controller, running])

  return (
    <div style={{ position: 'absolute', inset: 0, background: PALETTE.backdrop }}>
      {controller && <Stage controller={controller} monitor={monitor} running={running} />}
      {showFps && <FpsOverlay monitor={monitor} />}
    </div>
  )
}

export const critterClayCartridge: Cartridge = {
  manifest: critterClayManifest,
  Mount: CritterClayMount,
}
