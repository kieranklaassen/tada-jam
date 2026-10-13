// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { Desk } from './desk'
import { loadFort } from './fort'
import { serializeFort } from './fortState'
import type { Guidance } from './guidance'
import { boxFortManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { Play } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { SaveCadence } from './saveCadence'
import { Toy } from './toy'
import { FortView } from './view/fortView'

// The Mount: the template's wiring (the saved state, attention, the attended
// clock, sound from the first touch, adaptive quality, the grown-up
// performance handle and the grown-up overlay) around the game's own parts.
// `Toy` is the game with no browser in it, `Play` is the path a touch takes
// into it, and `FortView` draws what it holds; this file passes pointer
// events in, and sounds, saves and frames out.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), desk = new Desk(), clock = new AttendedClock()
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts). The game itself answers nothing in that corner (play.ts).
    const overlay = new Overlay(root, window.location.search)
    // Everything drawn. Its counts are the renderer's own, of the last frame, for the grown-up handle and the overlay.
    const view = new FortView(canvas)
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...view.counts }))
    // The game itself, once the slot has been read. Until then the room stands empty.
    let play: Play | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    /** What the idle ladder shows now, for the draw; null until the first frame. */
    let guidance: Guidance | null = null
    /** The first finger of a touch, which alone counts towards the grown-up's gesture. */
    let first: number | null = null
    const fingers = new Set<number>()

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it. A cut is handed to
    // storage at the throttle; a scene's outcome is in the state when the scene starts and is handed over at once.
    const cadence = new SaveCadence(() => { if (play) ctxRef.current.storage.save(serializeFort(play.toy.state)) })
    // What the game queued since the last call goes out: first the hush, so that a scene a touch has ended is
    // silent from this frame, then every new sound as one voice, then the save.
    const flush = (all = false): void => {
      const game = play?.toy
      if (!game) return
      const voice = desk.take(game, all)
      if (voice) audio.play(voice)
      if (game.dirty) {
        cadence.change(performance.now(), game.urgent)
        game.dirty = game.urgent = false
      }
    }

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` after sizing, which can
    // be before the slot is read and while the game rests, and the load once the slot has been read. With no
    // game yet it draws the room with nobody in it.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      if (play) view.update(play.toy, guidance)
      view.render()
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
      play?.size(w, h)
      // Sizing the backing store wipes the surface, so it is redrawn at once: a resize lands after the frame's
      // own draw, or while the game rests and no frame is coming, and either would leave the surface blank.
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    const at = (event: PointerEvent): { x: number; y: number } => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    // Every pointer event goes to the game by its id: the landing, the move, the lift and the cancel. Which
    // finger works, and what a resting one gives up, is decided there (play.ts).
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      if (fingers.size === 0) first = event.pointerId
      fingers.add(event.pointerId)
      if (event.pointerId === first) overlay.press(where.x, where.y, width, event.timeStamp)
      play?.down(event.pointerId, where.x, where.y)
      flush()
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      if (event.pointerId === first) overlay.move(where.x, where.y, width)
      play?.move(event.pointerId, where.x, where.y)
      flush()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (event.pointerId === first) { overlay.lift(where.x, where.y, width, event.timeStamp); first = null }
      fingers.delete(event.pointerId)
      play?.up(event.pointerId, where.x, where.y)
      flush()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: nothing is cut and nothing is moved.
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId === first) { overlay.forget(); first = null }
      fingers.delete(event.pointerId)
      play?.cancel(event.pointerId)
      flush()
      audio.touchUp()
    }
    // The surface lost a finger it had captured, and neither its lift nor its cancel has come: no lift will come
    // now, so it is a cancel. After a lift or a cancel the capture is lost as well, and that is nothing more.
    const onLost = (event: PointerEvent) => {
      if (fingers.has(event.pointerId)) onCancel(event)
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)
    root.addEventListener('lostpointercapture', onLost)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // Advances the attended clock. It returns the step to play, in seconds: the game's one clock moves by it,
      // and everything seen and heard is stamped with that clock.
      const step = clock.advance(now)
      const start = performance.now()
      if (play) {
        guidance = play.step(step)
        flush()
      }
      // A tier change is applied ahead of the draw: whatever the game's tiers set in `applyTier`, then the pixel
      // ratio in `resize`. The interval just measured belongs to the frame before, so it is judged with that
      // frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, view.counts.drawCalls, view.counts.triangles)
      frame = requestAnimationFrame(loop)
    }

    // The game is put away, or the page is hidden. Every finger is gone, since its lift will never arrive: a
    // thing that hung after a lift is set down where it was let go, anything else in a finger is as if never
    // taken, and a scene lands where the save has it. Every sound is closed, the idle ladder starts again, the
    // newest state is handed to storage, and the picture is what a load would show.
    const rest = () => {
      fingers.clear()
      first = null
      overlay.forget()
      if (!play) return
      play.park()
      flush(true)
      guidance = null
    }
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      rest()
      cadence.settle(performance.now())
      // A parked surface has no frame coming: it is drawn once as it was left.
      draw()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved fort wins; `childAge` only chooses how a first visit is laid out. The game is set up as it was
      // left: nothing eases in, no scene replays and nothing sounds. Its chance comes from one seed, which
      // `seed=<n>` in the address pins, so a still can be taken again.
      play = new Play(new Toy(loadFort(value, ctxRef.current.childAge), seedOf(window.location.search)))
      play.size(width, height)
      // The load draws the first frame itself: a game that is resting or parked has no frame coming.
      draw()
      view.warm()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the fingers go first, so the thing in hand is back or down before the last save.
      rest()
      cadence.settle(performance.now())
      cancelAnimationFrame(frame)
      observer.disconnect()
      attention.dispose()
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onCancel)
      root.removeEventListener('lostpointercapture', onLost)
      uninstallPerf()
      overlay.dispose()
      view.dispose()
      audio.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={boxFortManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const boxFortCartridge: Cartridge = {
  manifest: boxFortManifest,
  Mount,
}
