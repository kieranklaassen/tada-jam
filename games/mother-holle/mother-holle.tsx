// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { BACKDROP } from './config'
import type { Guidance } from './guidance'
import { motherHolleManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { Play } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { makeRng, seedOf } from './rng'
import { deserialize } from './save'
import { SaveCadence } from './saveCadence'
import { View } from './view/view'
import { notesOf } from './voices'
import { Village } from './village'

// The Mount: the surface, the fingers, the loop and the save round the village.
// What a finger does is decided in play.ts and village.ts, which know no browser.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), clock = new AttendedClock()
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    // Everything drawn is made here, at mount, and nothing when the module loads.
    const view = new View(canvas)
    let game: Play | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    let corner: number | null = null
    const playing = { step: 0, guidance: null as Guidance | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    const cadence = new SaveCadence(() => { if (game) ctxRef.current.storage.save(game.village.toState()) })

    const applyTier = () => { view.setTier(governor.settings); canvas.dataset.tier = String(governor.tier) }

    const draw = () => {
      if (width <= 0 || height <= 0) return
      if (!game) { view.blank(); return }
      view.draw(game.village, playing.guidance, playing.step)
      drawn.drawCalls = view.counts.drawCalls
      drawn.triangles = view.counts.triangles
    }

    // The shell can resize the surface without a window resize event, so the surface watches itself.
    // Returns whether it sized the surface, and so drew it.
    const resize = (): boolean => {
      const w = root.clientWidth, h = root.clientHeight
      // A parked surface measures 0×0; keep the last good size.
      if (w <= 0 || h <= 0) return false
      const ratio = Math.min(window.devicePixelRatio || 1, governor.settings.dpr)
      if (w === width && h === height && ratio === dpr) return false
      width = w; height = h; dpr = ratio
      game?.size(w, h)
      // Sizing the backing store wipes the surface, so it is redrawn at once.
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the village queued is played inside the handler, so the first sound of a visit falls inside the touch, where
    // audio.ts holds it for the unlock. Everything one touch sets off is one voice.
    const settle = () => {
      if (!game) return
      const village = game.village
      if (village.events.length > 0) {
        const notes = village.events.flatMap((e) => notesOf(e))
        for (const e of village.events) view.on(e, village)
        village.events.length = 0
        if (notes.length > 0) audio.play(voiceOf(notes))
      }
      if (village.changed !== 'no' && !village.waiting) {
        const now = village.changed === 'now'
        village.changed = 'no'
        cadence.change(performance.now(), now)
      }
    }
    const at = (event: PointerEvent): { x: number; y: number } => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake || !game) return
      audio.touchDown()
      const where = at(event)
      game.down(event.pointerId, where.x, where.y)
      // The grown-up's gesture: a finger in the corner, which the game leaves alone. A palm elsewhere does not undo it.
      if (inCorner(where.x, where.y, width)) corner = event.pointerId
      if (corner === event.pointerId || game.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      settle()
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      if (corner === event.pointerId) overlay.move(where.x, where.y, width)
      game?.move(event.pointerId, where.x, where.y)
      settle()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (corner === event.pointerId) { overlay.lift(where.x, where.y, width, event.timeStamp); corner = null }
      game?.up(event.pointerId, where.x, where.y)
      settle()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: what it carried goes back.
    const onCancel = (event: PointerEvent) => {
      if (corner === event.pointerId) { overlay.forget(); corner = null }
      game?.cancel(event.pointerId)
      settle()
      audio.touchUp()
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // Advances the attended clock. It returns the step to play, in seconds: the rules, a scene and every animation advance by it.
      playing.step = clock.advance(now)
      const start = performance.now()
      if (game) playing.guidance = game.step(playing.step)
      settle()
      // A tier change is applied ahead of the draw: whatever the game's tiers set in `applyTier`, then the pixel
      // ratio in `resize`. The interval just measured belongs to the frame before, so it is judged with that
      // frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      // The step has been drawn: a draw that comes outside a frame plays no time.
      playing.step = 0
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is ended (park in play.ts). Then the newest state is handed to storage.
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      overlay.forget()
      game?.park()
      settle()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      const chance = makeRng(seedOf(window.location.search))
      game = new Play(new Village(deserialize(value, ctxRef.current.childAge), () => chance.next()))
      game.size(width, height)
      // The load draws the first frame itself: a game that is resting when the slot comes back has no frame coming.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      game?.park()
      settle()
      cadence.settle(performance.now())
      cancelAnimationFrame(frame)
      observer.disconnect()
      attention.dispose()
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onCancel)
      uninstallPerf()
      view.dispose()
      overlay.dispose()
      audio.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={motherHolleManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const motherHolleCartridge: Cartridge = {
  manifest: motherHolleManifest,
  Mount,
}
