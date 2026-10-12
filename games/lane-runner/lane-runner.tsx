// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { Game, type Sink } from './game'
import { HushBus } from './hush'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { serializeLap } from './lapState'
import { laneRunnerManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { SaveCadence } from './saveCadence'
import { TrailView } from './view/trailView'

// The Mount: it hands the game (game.ts) the finger and the frames, sounds
// what the game says to sound, saves what it says to save, and gives the
// frame to the view (view/trailView.ts). The rules are in lap.ts and the
// whole of play is in game.ts; nothing is decided here.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), bus = new HushBus(), touch = new ForgivingTouch(), clock = new AttendedClock()
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, copied from the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let game: Game | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    /** The seconds of play the frame being drawn advances: 0 outside a frame. */
    let step = 0
    /** When the finger last moved, in the event's own milliseconds: a flick is read against it. */
    let stamp = 0

    // Everything drawn is made here, at mount, and nothing when the module loads.
    const view = new TrailView(canvas)
    // Chance is only in the loose beads, from one seed: `seed=<n>` in the address pins it.
    const seed = seedOf(window.location.search)

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    const cadence = new SaveCadence(() => { if (game) ctxRef.current.storage.save(serializeLap(game.state)) })

    // What the game tells the outside. Every voice goes through the one bus, so a hush stops all of them.
    const sink: Sink = {
      play: (notes) => audio.play(bus.voice(notes)),
      hush: () => bus.hush(),
      save: (_state, urgent) => cadence.change(performance.now(), urgent),
    }

    // The one place a quality tier is applied, besides the pixel ratio: how far the trail is drawn, how sharp
    // the far beads are and how many loose beads fly.
    const applyTier = () => {
      view.setTier(governor.settings)
      game?.setLoose(governor.settings.loose)
      canvas.dataset.tier = String(governor.tier)
    }

    // The one place the frame is drawn. With no saved slot read yet it shows the bare backdrop.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      if (!game) {
        view.blank()
        return
      }
      view.update(step, clock.seconds, game.stage, game.lap.s, game.lap.x, game.lap.trail.puddle)
      view.render()
      const counts = view.counts
      drawn.drawCalls = counts.drawCalls
      drawn.triangles = counts.triangles
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
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // Every gesture goes to the game, read against the shot the child is looking at.
    const act = (gestures: Gesture[]) => {
      if (!game) return
      for (const gesture of gestures) game.gesture(gesture, width, height, stamp, view.shot)
    }
    // The touch reader follows one working finger. Every other finger on the glass (a thumb resting while the
    // other hand flicks) goes to the game by its own pointer: the fox runs while any finger is down, and each steers.
    const others = new Set<number>()
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      stamp = event.timeStamp
      const gestures = touch.down(event.pointerId, where, event.timeStamp)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      else if (game) {
        others.add(event.pointerId)
        game.press(where.x, where.y, width, height, stamp, view.shot, event.pointerId)
      }
      act(gestures)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      stamp = event.timeStamp
      // A hold in the grown-up's corner stays there: the working finger leaving it starts that gesture again.
      if (touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      if (others.has(event.pointerId)) game?.move(where.x, where.y, width, height, stamp, event.pointerId)
      act(touch.move(event.pointerId, where))
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      stamp = event.timeStamp
      if (touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      if (others.delete(event.pointerId)) game?.lift(event.pointerId)
      act(touch.up(event.pointerId, where, event.timeStamp))
      // The lift is the act: the fox stops on it, and the drag does not wait for the finger to come back.
      act(touch.letGo())
      audio.touchUp()
    }
    // The browser took the finger away: the fox stops as it does for a lift.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) overlay.forget()
      if (others.delete(event.pointerId)) game?.lift(event.pointerId)
      act(touch.cancel(event.pointerId))
      audio.touchUp()
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // Advances the attended clock. It returns the step to play, in seconds: the lap and every motion advance by it.
      step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      game?.frame(step, clock.seconds)
      // A tier change is applied ahead of the draw: the reach and the loose beads in `applyTier`, then the pixel ratio
      // in `resize`. The interval just measured belongs to the frame before, so it is judged with that frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      // The step has been drawn: a draw that comes outside a frame plays no time.
      step = 0
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // Put away: the touch ends, since its lift will never arrive, and the game settles into what a load of its
    // save would find, in silence, with the newest state handed to storage. It is drawn once like that, so the
    // surface a child comes back to is already the one a load would show.
    const park = () => {
      overlay.forget()
      act(touch.clear())
      others.clear()
      game?.park()
      bus.hush()
      cadence.settle(performance.now())
      step = 0
      draw()
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound.
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      park()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // Found as left: the fox where it stood, what it carried in its hands, a finished lap with the hand-over
      // over. Nothing moves and nothing sounds until the child touches. The age is asked each time it matters.
      game = new Game(value, () => ctxRef.current.childAge, seed, governor.settings.loose, sink)
      // The load draws the first frame itself: a game that is resting or parked has no frame coming.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the fox has stopped before the last save.
      cancelAnimationFrame(frame)
      park()
      observer.disconnect()
      attention.dispose()
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onCancel)
      uninstallPerf()
      overlay.dispose()
      audio.dispose()
      view.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={laneRunnerManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const laneRunnerCartridge: Cartridge = {
  manifest: laneRunnerManifest,
  Mount,
}
