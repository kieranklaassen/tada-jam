import { useEffect, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { GardenAudio } from './audio'
import { GardenController } from './controller'
import { lightGardenManifest } from './manifest'
import { deserialize } from './state'
import { PALETTE } from './view/palette'
import { GardenStage } from './view/stage'

// A thin Mount: load the saved garden, build the controller, render the
// light table, and forward attention. The table itself is the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

const css = (c: readonly number[]) => `rgb(${c.map((v) => Math.round(v * 255)).join(' ')})`

function LightGardenMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const [garden, setGarden] = useState<GardenController | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: GardenController | null = null
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        if (disposed) return
        created = new GardenController(deserialize(saved, childAge), { save: (state) => storage.save(state), sound: new GardenAudio() })
        setGarden(created)
      })
    return () => {
      disposed = true
      created?.dispose()
    }
  }, [storage, childAge])

  useEffect(() => {
    garden?.setRunning(running)
  }, [garden, running])

  return <div style={{ position: 'absolute', inset: 0, background: css(PALETTE.room) }}>{garden && <GardenStage garden={garden} running={running} />}</div>
}

export const lightGardenCartridge: Cartridge = {
  manifest: lightGardenManifest,
  Mount: LightGardenMount,
}
