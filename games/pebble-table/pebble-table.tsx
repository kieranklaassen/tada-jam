import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { pebbleTableManifest } from './manifest'
import { PebbleScene } from './scene'
import { deserialize } from './state'

// A thin Mount: load the saved table, hand the canvas to the scene, forward
// attention, and let go on unmount. The table itself is the whole UI.

function PebbleTableMount({ ctx }: { ctx: CartridgeContext }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const sceneRef = useRef<PebbleScene | null>(null)
  const attendedRef = useRef(ctx.attention.attended)
  attendedRef.current = ctx.attention.attended

  const { storage, childAge } = ctx

  useEffect(() => {
    let disposed = false
    void storage.load<unknown>().then((saved) => {
      const canvas = canvasRef.current
      if (disposed || !canvas) return
      const scene = new PebbleScene(canvas, { state: deserialize(saved, childAge), save: (state) => storage.save(state) })
      scene.setAttended(attendedRef.current)
      sceneRef.current = scene
    })
    return () => {
      disposed = true
      sceneRef.current?.dispose()
      sceneRef.current = null
    }
  }, [storage, childAge])

  useEffect(() => {
    sceneRef.current?.setAttended(ctx.attention.attended)
  }, [ctx.attention.attended])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        display: 'block',
        touchAction: 'none',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none',
        background: '#231b16',
      }}
    />
  )
}

export const pebbleTableCartridge: Cartridge = {
  manifest: pebbleTableManifest,
  Mount: PebbleTableMount,
}
