import { useEffect, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { KiteAudio } from './audio'
import { KiteController } from './controller'
import { kiteTowerManifest } from './manifest'
import { deserialize } from './state'
import { GameView } from './view/game'
import { PALETTE } from './view/stage'

// A thin Mount: load the saved playroom, build the controller, render the
// 3D room, and forward attention. The playroom itself is the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function KiteTowerMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const [controller, setController] = useState<KiteController | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: KiteController | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        if (disposed) return
        created = new KiteController(deserialize(saved, childAge), { save: (state) => storage.save(state), sound: new KiteAudio() })
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

  return <div style={{ position: 'absolute', inset: 0, background: PALETTE.wall }}>{controller && <GameView controller={controller} running={running} />}</div>
}

export const kiteTowerCartridge: Cartridge = {
  manifest: kiteTowerManifest,
  Mount: KiteTowerMount,
}
