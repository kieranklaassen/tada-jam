import { useEffect, useRef, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { LanternAudio } from './audio'
import { TheatreController } from './controller'
import { shadowLanternManifest } from './manifest'
import { deserialize } from './state'
import { tierOverride } from './tiers'
import { TheatreView } from './view/game'
import { PALETTE } from './view/scenery'

// A thin Mount: load the saved theatre, build the controller and the raw
// three.js view on one host element, and forward attention. The theatre is
// the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

type Theatre = { controller: TheatreController; view: TheatreView }

function ShadowLanternMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const host = useRef<HTMLDivElement>(null)
  const [theatre, setTheatre] = useState<Theatre | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: Theatre | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        const element = host.current
        if (disposed || !element) return
        const controller = new TheatreController(deserialize(saved, childAge), {
          save: (state) => storage.save(state),
          sound: new LanternAudio(),
          childAge,
          everTouched: saved !== null && saved !== undefined,
        })
        const params = new URLSearchParams(window.location.search)
        const view = new TheatreView(element, controller, { overlay: params.get('fps') === '1', tierOverride: tierOverride(window.location.search) })
        created = { controller, view }
        setTheatre(created)
      })
    return () => {
      disposed = true
      created?.view.dispose()
      created?.controller.dispose()
    }
  }, [storage, childAge])

  useEffect(() => {
    theatre?.controller.setRunning(running)
    theatre?.view.setRunning(running)
  }, [theatre, running])

  return <div ref={host} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: PALETTE.night }} />
}

export const shadowLanternCartridge: Cartridge = {
  manifest: shadowLanternManifest,
  Mount: ShadowLanternMount,
}
