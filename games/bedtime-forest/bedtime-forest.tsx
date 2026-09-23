import { useEffect, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { ForestAudio } from './audio'
import { ForestController } from './controller'
import { bedtimeForestManifest } from './manifest'
import { deserialize } from './state'
import { PALETTE } from './view/palette'
import { ForestStage } from './view/stage'

// A thin Mount: load the saved forest, build the controller, render the
// clearing, and forward attention. The forest itself is the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function BedtimeForestMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const [forest, setForest] = useState<ForestController | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: ForestController | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        if (disposed) return
        created = new ForestController(deserialize(saved), { save: (state) => storage.save(state), sound: new ForestAudio(), childAge })
        setForest(created)
      })
    return () => {
      disposed = true
      created?.dispose()
    }
  }, [storage, childAge])

  useEffect(() => {
    forest?.setRunning(running)
  }, [forest, running])

  return <div style={{ position: 'absolute', inset: 0, background: PALETTE.skyMid }}>{forest && <ForestStage forest={forest} running={running} />}</div>
}

export const bedtimeForestCartridge: Cartridge = {
  manifest: bedtimeForestManifest,
  Mount: BedtimeForestMount,
}
