// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { teaTimeManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { openGame } from './host'
import { Play } from './play'
import { voiceOf } from './sound'
import { TableView } from './tableView'

// The Mount: the tea table, played. Everything around the renderer is the
// template's: the saved state, attention, the attended clock, touch, sound
// from the first touch, the idle ladder, adaptive quality, the grown-up
// performance handle and the grown-up overlay. The game itself is in play.ts
// (the finger, the rules and the sounds) and tableView.ts (the drawing).
// `seed=<n>` in the address fixes the game's random stream for a table that
// has never been played, for stills; like `tier` and `fps` it is for
// grown-ups.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), touch = new ForgivingTouch(), clock = new AttendedClock(), ladder = new IdleLadder(0)
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: three quick taps in the top right corner, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // The table. The pieces are built as the game shows them; a tier changes only how finely they are drawn.
    const view = new TableView(canvas, document, governor.tier)
    // The game, once the slot has been read. Until then the bare table is drawn.
    let play: Play | null = null
    // What the idle ladder says to show: a glow on the one thing to touch, then a ghost hand that shows one move.
    let shown: Guidance = ladder.update(0)
    // The game queues its voices and what it changed; they are taken here, inside the touch and after each step, so the
    // first sound falls inside the touch that unlocks it, and an outcome is saved at once.
    const settle = () => {
      if (!play) return
      for (const voice of play.takeVoices()) audio.play(voiceOf(voice))
      const change = play.takeChange()
      if (change > 0) cadence.change(performance.now(), change === 2)
    }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    const cadence = new SaveCadence(() => { if (play) ctxRef.current.storage.save(play.stored()) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame with the seconds that frame plays,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read; those two draw the table as it stands and play no time.
    const draw = (seconds = 0) => {
      const counts = play ? play.draw(seconds, shown) : view.blank()
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
      // Sizing the backing store wipes the surface, so it is redrawn at once: a resize lands after the frame's
      // own draw, or while the game rests and no frame is coming, and either would leave the surface blank.
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. A press first ends the scene that is playing (play.ts does that), then the
    // game answers, and its voices and its change are taken at once.
    const act = (gestures: Gesture[]) => {
      if (!play) return
      for (const gesture of gestures) play.gesture(gesture)
      settle()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      ladder.touch(clock.seconds)
      const where = at(event)
      overlay.press(where.x, where.y, width, event.timeStamp)
      act(touch.down(event.pointerId, where, event.timeStamp))
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)))
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      overlay.lift(where.x, where.y, width, event.timeStamp)
      act(touch.up(event.pointerId, where, event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      act(touch.cancel(event.pointerId, event.timeStamp))
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
      const seconds = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (touch.active || (play && play.busy)) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      shown = ladder.update(clock.seconds)
      // The game plays the frame's seconds: the pot, the tea, the guests and their scenes.
      if (play) play.step(seconds, clock.seconds)
      settle()
      // A tier change is applied ahead of the draw: whatever the game's tiers set in `applyTier`, then the pixel
      // ratio in `resize`. The interval just measured belongs to the frame before, so it is judged with that
      // frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw(seconds)
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // A touch in progress is called off, since its lift will never arrive: a pour stops, a thing in the hand goes
    // back where it was picked up, a led guest goes back to its seat. Nothing happens that the child did not do.
    const putAway = () => {
      touch.clear()
      if (play) play.cancel()
      settle()
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. The touch in progress is called
    // off, and the newest state is handed to storage.
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      putAway()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts. A table that was never played takes
      // the visit's own seed, or the one in the address.
      const asked = Number(new URLSearchParams(window.location.search).get('seed'))
      const seed = Number.isFinite(asked) && asked > 0 ? asked : 1 + Math.floor(Math.random() * 2147483000)
      // The game sets itself up from the slot here, as it was left: nothing eases in and no scene replays.
      play = new Play(view, openGame(value, ctxRef.current.childAge, seed))
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch is called off first, so what is saved last is the table at rest.
      putAway()
      cadence.settle(performance.now())
      cancelAnimationFrame(frame)
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
      <canvas ref={canvasRef} aria-label={teaTimeManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const teaTimeCartridge: Cartridge = {
  manifest: teaTimeManifest,
  Mount,
}
