import { useEffect, useRef, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { FeltAudio } from './audio'
import { MeadowController } from './controller'
import { feltMeadowManifest } from './manifest'
import { deserialize } from './meadow'
import { seasonFor } from './season'
import { hexCss, PALETTE } from './view/felt'
import { MeadowView } from './view/view'

// A thin Mount: load the saved meadow, build the controller and the 3D view
// inside one host div, and forward attention. The hillside is the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function FeltMeadowMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge, childCountry } = ctx
  const host = useRef<HTMLDivElement>(null)
  const [meadow, setMeadow] = useState<{ controller: MeadowController; view: MeadowView } | null>(null)
  const [failure, setFailure] = useState<{ error: unknown } | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: { controller: MeadowController; view: MeadowView } | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        const element = host.current
        if (disposed || !element) return
        let controller: MeadowController | null = null
        try {
          controller = new MeadowController(deserialize(saved), { save: (state) => storage.save(state), sound: new FeltAudio(), childAge })
          const view = new MeadowView(element, controller, { search: window.location.search, season: seasonFor(new Date(), childCountry) })
          created = { controller, view }
          setMeadow(created)
        } catch (error) {
          controller?.dispose()
          setFailure({ error })
        }
      })
    return () => {
      disposed = true
      created?.view.dispose()
      created?.controller.dispose()
      setMeadow(null)
    }
  }, [storage, childAge, childCountry])

  useEffect(() => {
    meadow?.controller.setRunning(running)
    meadow?.view.setRunning(running)
  }, [meadow, running])

  // A meadow that could not be built (no WebGL context) fails in render while it runs, so the shell remounts it and
  // parks it if it keeps failing. The shell keeps remounting a parked cartridge, so parked (unattended) it waits instead.
  if (failure && running) throw failure.error

  return <div ref={host} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: hexCss(PALETTE.wallLow) }} />
}

export const feltMeadowCartridge: Cartridge = {
  manifest: feltMeadowManifest,
  Mount: FeltMeadowMount,
}
