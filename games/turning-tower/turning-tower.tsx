import { useEffect, useRef, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { TowerAudio } from './audio'
import { TowerController } from './controller'
import { turningTowerManifest } from './manifest'
import { ROOMS } from './rooms'
import { deserialize } from './state'
import { PALETTE } from './view/palette'
import { TowerView } from './view/view'
import { resolveRoom } from './world'

// A thin Mount: load the saved tower, build the controller, hand it a view,
// and forward attention. Looking away puts everything down where it stands
// and saves; the dioramas themselves are the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function TurningTowerMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const host = useRef<HTMLDivElement>(null)
  const [tower, setTower] = useState<TowerController | null>(null)
  const [view, setView] = useState<TowerView | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: TowerController | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        if (disposed) return
        const state = deserialize(saved, ROOMS.map(resolveRoom))
        created = new TowerController(state, { save: (next) => storage.save(next), sound: new TowerAudio(), childAge, now: performance.now() / 1000 })
        setTower(created)
      })
    return () => {
      disposed = true
      if (created) {
        created.setRunning(false)
        created.dispose()
        void storage.flush().catch(() => undefined)
      }
    }
  }, [storage, childAge])

  useEffect(() => {
    const element = host.current
    if (!tower || !element) return
    const created = new TowerView(element, tower, window.location.search)
    setView(created)
    return () => {
      setView(null)
      created.dispose()
    }
  }, [tower])

  useEffect(() => {
    tower?.setRunning(running)
    view?.setRunning(running)
  }, [tower, view, running])

  return <div ref={host} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: PALETTE.backdrop, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} />
}

export const turningTowerCartridge: Cartridge = {
  manifest: turningTowerManifest,
  Mount: TurningTowerMount,
}
