import { useEffect, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { TableAudio } from './audio'
import { TableController } from './controller'
import { pebbleTableManifest } from './manifest'
import { physicsReady } from './physics3d'
import { seededRandom } from './random'
import { deserialize } from './state'
import { PALETTE } from './view/clay'
import { GameView } from './view/game'

/** Build the sound graph this long after load: past the first frames, well before a child's first tap usually lands. */
const AUDIO_PREPARE_MS = 1500
/** Longest the first idle moment may be waited for before Rapier starts loading anyway (ms). */
const PHYSICS_PRELOAD_MS = 2000

// Rapier's WebAssembly loads in the first idle moment on the jam's home,
// while a child is still choosing a game, so opening the table does not wait
// for it; a table opened straight from a link waits for it with its save.
// Another game already playing is left alone: loading it there could cost
// that game a frame.
if (typeof window !== 'undefined') {
  const choosing = () => !window.location.hash.startsWith('#/play/')
  const preload = () => {
    if (choosing()) void physicsReady()
  }
  const idle = window as { requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number }
  if (choosing()) {
    if (idle.requestIdleCallback) idle.requestIdleCallback(preload, { timeout: PHYSICS_PRELOAD_MS })
    else setTimeout(preload, PHYSICS_PRELOAD_MS)
  }
}

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
    void Promise.all([storage.load<unknown>().catch(() => null), physicsReady()])
      .then(([saved]) => {
        if (disposed) return
        const sound = new TableAudio()
        // Sound and three.js draw from Math.random at moments the audio clock and shader compiles decide, so how a spill is flung keeps a stream of its own.
        created = new TableController(deserialize(saved, childAge), { save: (state) => storage.save(state), sound, random: seededRandom(Math.random() * 2 ** 32) })
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
