import { useEffect, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { TableAudio } from './audio'
import { TableController } from './controller'
import { pebbleTableManifest } from './manifest'
import { deserialize } from './state'
import { PALETTE } from './view/clay'
import { GameView } from './view/game'

/** Build the sound graph this long after load: past the first frames, well before a child's first tap usually lands. */
const AUDIO_PREPARE_MS = 1500

// A thin Mount: load the saved table, build the controller, render the 3D
// view, and forward attention. The table itself is the whole UI.

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function PebbleTableMount({ ctx }: { ctx: CartridgeContext }) {
  const { storage, childAge } = ctx
  const [table, setTable] = useState<TableController | null>(null)
  const hidden = useHidden()
  const running = ctx.attention.attended && !hidden

  useEffect(() => {
    let disposed = false
    let created: TableController | null = null
    let prepareTimer: ReturnType<typeof setTimeout> | undefined
    void storage
      .load<unknown>()
      .catch(() => null)
      .then((saved) => {
        if (disposed) return
        const sound = new TableAudio()
        created = new TableController(deserialize(saved, childAge), { save: (state) => storage.save(state), sound })
        setTable(created)
        prepareTimer = setTimeout(() => sound.prepare(), AUDIO_PREPARE_MS)
      })
    return () => {
      disposed = true
      clearTimeout(prepareTimer)
      created?.dispose()
    }
  }, [storage, childAge])

  useEffect(() => {
    table?.setRunning(running)
  }, [table, running])

  return (
    <div style={{ position: 'absolute', inset: 0, background: PALETTE.backdrop }}>
      {table && <GameView table={table} running={running} />}
    </div>
  )
}

export const pebbleTableCartridge: Cartridge = {
  manifest: pebbleTableManifest,
  Mount: PebbleTableMount,
}
