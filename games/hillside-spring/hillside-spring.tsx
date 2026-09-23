import { useEffect, useRef, useState } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { GardenAudio } from './audio'
import { GardenController } from './controller'
import type { Point } from './input'
import { hillsideSpringManifest } from './manifest'
import { QualityGovernor, startingTier } from './quality'
import { deserialize } from './state'
import { BACKDROP, GardenView } from './view/garden'
import { GrownUpOverlay } from './view/overlay'
import { PerfOverlay, PerfRecord, readOverrides } from './view/perf'

// A thin Mount around one owned frame loop (KTD1): load the saved garden,
// build the controller, then measure, step and draw. The hillside is the
// whole UI. Once the garden has rested a while, the loop draws every other
// display frame; it stops entirely while unattended or hidden.

/** Frames to leave unmeasured after a tier change (resized buffers, recompiled shaders). */
const SKIP_AFTER_CHANGE = 2

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => document.visibilityState === 'hidden')
  useEffect(() => {
    const update = () => setHidden(document.visibilityState === 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return hidden
}

function GardenCanvas({ garden, running }: { garden: GardenController; running: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const runningRef = useRef(running)
  runningRef.current = running
  const [loop, setLoop] = useState<{ start(): void; stop(): void } | null>(null)
  const [grownUp, setGrownUp] = useState<{ governor: QualityGovernor; perf: PerfRecord; onTier(): void } | null>(null)

  useEffect(() => {
    const host = hostRef.current
    const canvas = canvasRef.current
    if (!host || !canvas) return
    const overrides = readOverrides(window.location.search)
    const view = new GardenView(canvas)
    garden.setPicker(view.projector)
    const governor = new QualityGovernor(startingTier(window.matchMedia?.('(pointer: coarse)').matches ?? false))
    if (overrides.tier !== null) governor.force(overrides.tier)
    const perf = new PerfRecord()
    window.__jamPerf = perf
    let skip = 0
    const applyTier = () => {
      perf.tier = governor.tier
      view.applyTier(governor.settings)
      skip = SKIP_AFTER_CHANGE
    }
    applyTier()
    setGrownUp({ governor, perf, onTier: applyTier })
    const overlay = overrides.overlay ? new PerfOverlay() : null
    if (overlay) host.appendChild(overlay.canvas)

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box || box.width === 0 || box.height === 0) return
      view.resize(box.width, box.height)
    })
    observer.observe(host)

    const local = (event: PointerEvent): Point => {
      const rect = canvas.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const down = (event: PointerEvent) => {
      event.preventDefault()
      canvas.setPointerCapture?.(event.pointerId)
      garden.pointerDown(event.pointerId, local(event), event.timeStamp)
    }
    const move = (event: PointerEvent) => garden.pointerMove(event.pointerId, local(event))
    const up = (event: PointerEvent) => garden.pointerUp(event.pointerId, local(event), event.timeStamp)
    const cancel = (event: PointerEvent) => garden.pointerCancel(event.pointerId)
    const menu = (event: Event) => event.preventDefault()
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('pointermove', move)
    canvas.addEventListener('pointerup', up)
    canvas.addEventListener('pointercancel', cancel)
    canvas.addEventListener('contextmenu', menu)

    let frameId = 0
    let last = 0
    let paced = false
    let odd = false
    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick)
      const resting = garden.resting
      if (resting !== paced) {
        paced = resting
        governor.restart()
      }
      if (paced && (odd = !odd)) return
      const interval = last === 0 ? 16.7 : now - last
      last = now
      const start = performance.now()
      garden.step(Math.min(interval, 50) / 1000)
      view.frame(garden)
      const cpu = performance.now() - start
      perf.push(cpu)
      const info = view.renderer.info.render
      perf.drawCalls = info.calls
      perf.triangles = info.triangles
      if (skip > 0) skip--
      else if (!paced && governor.sample(interval, cpu)) applyTier()
      overlay?.frame(interval, cpu)
    }
    const controls = {
      start() {
        if (frameId) return
        last = 0
        frameId = requestAnimationFrame(tick)
      },
      stop() {
        cancelAnimationFrame(frameId)
        frameId = 0
      },
    }
    setLoop(controls)
    if (runningRef.current) controls.start()
    return () => {
      controls.stop()
      observer.disconnect()
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('pointermove', move)
      canvas.removeEventListener('pointerup', up)
      canvas.removeEventListener('pointercancel', cancel)
      canvas.removeEventListener('contextmenu', menu)
      overlay?.canvas.remove()
      view.dispose()
      setGrownUp(null)
      if (window.__jamPerf === perf) delete window.__jamPerf
    }
  }, [garden])

  useEffect(() => {
    if (!loop) return
    if (running) loop.start()
    else loop.stop()
  }, [loop, running])

  return (
    <div ref={hostRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      />
      {grownUp && <GrownUpOverlay governor={grownUp.governor} perf={grownUp.perf} onTier={grownUp.onTier} />}
    </div>
  )
}

function HillsideSpringMount({ ctx }: { ctx: CartridgeContext }) {
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

  return <div style={{ position: 'absolute', inset: 0, background: BACKDROP }}>{garden && <GardenCanvas garden={garden} running={running} />}</div>
}

export const hillsideSpringCartridge: Cartridge = {
  manifest: hillsideSpringManifest,
  Mount: HillsideSpringMount,
}
