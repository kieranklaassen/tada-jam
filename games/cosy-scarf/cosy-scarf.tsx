import { useEffect, useRef, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { ScarfAudio } from './audio'
import { ScarfController } from './controller'
import { cosyScarfManifest } from './manifest'
import { deserialize } from './state'
import { CosyScene } from './view/scene'
import { PALETTE } from './view/yarn'

// A thin Mount: load the saved knitting, build the controller, hand it to the
// three.js scene, and forward attention. The hillside is the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function CosyScarfMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const host = useRef<HTMLDivElement>(null)
  const [game, setGame] = useState<ScarfController | null>(null)
  const [scene, setScene] = useState<CosyScene | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: ScarfController | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        if (disposed) return
        created = new ScarfController(deserialize(saved), { save: (state) => storage.save(state), sound: new ScarfAudio(), childAge })
        setGame(created)
      })
    return () => {
      disposed = true
      created?.dispose()
    }
  }, [storage, childAge])

  useEffect(() => {
    const element = host.current
    if (!game || !element) return
    const made = new CosyScene(element, game, { search: window.location.search, coarse: window.matchMedia?.('(pointer: coarse)').matches ?? false })
    setScene(made)
    return () => {
      made.dispose()
      setScene(null)
    }
  }, [game])

  useEffect(() => {
    game?.setRunning(running)
    scene?.setRunning(running)
  }, [game, scene, running])

  return <div ref={host} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: PALETTE.backdrop }} />
}

export const cosyScarfCartridge: Cartridge = {
  manifest: cosyScarfManifest,
  Mount: CosyScarfMount,
}
