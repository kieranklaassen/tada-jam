import { useEffect, useRef, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { PondAudio } from './audio'
import { PondController } from './controller'
import { frogChoirManifest } from './manifest'
import { deserialize } from './state'
import { PALETTE } from './view/palette'
import { PondView } from './view/pondView'

// A thin Mount: load the saved arrangement, build the controller and the 3D
// pond, and forward attention. The pond itself is the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function FrogChoirMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const host = useRef<HTMLDivElement>(null)
  const [view, setView] = useState<PondView | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: PondView | null = null
    let controller: PondController | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        if (disposed || !host.current) return
        controller = new PondController(deserialize(saved), { save: (state) => storage.save(state), sound: new PondAudio(), childAge })
        created = new PondView(host.current, controller, {
          search: window.location.search,
          deviceDpr: window.devicePixelRatio || 1,
          coarsePointer: window.matchMedia?.('(pointer: coarse)').matches ?? false,
        })
        setView(created)
      })
    return () => {
      disposed = true
      created?.dispose()
      controller?.dispose()
    }
  }, [storage, childAge])

  useEffect(() => {
    view?.setRunning(running)
  }, [view, running])

  return <div ref={host} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: PALETTE.fog, touchAction: 'none', userSelect: 'none' }} />
}

export const frogChoirCartridge: Cartridge = {
  manifest: frogChoirManifest,
  Mount: FrogChoirMount,
}
