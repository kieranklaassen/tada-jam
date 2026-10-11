// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP, TOY_SHEET } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { stream } from './look'
import { bridgeCrewManifest } from './manifest'
import { CORNER, Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { deserialize, serialize } from './save'
import { SaveCadence } from './saveCadence'
import { seedFrom, voiceOf } from './sound'
import { drawSpike } from './spike'
import { Game } from './game'
import { View } from './view'

// The Mount, showing the game (game.ts on toy.ts, drawn by view.ts). Around it everything is the
// template's: the saved state, attention, the attended clock, touch, sound
// from the first touch, the idle ladder, adaptive quality, the grown-up
// performance handle and the grown-up overlay.
//
// In the address: `seed=<n>` fixes the visit's random stream for stills, and
// `spike=1` shows the still look spike of the first run in place of the toy.

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
    let toy: Game | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const seed = seedFrom(window.location.search, () => Math.random() * 2 ** 32)
    const spike = new URLSearchParams(window.location.search).get('spike') === '1'
    // The sheet is drawn from one fixed seed, so it is the same sheet on every visit; the visit's own seed moves the chief.
    const view = new View(20261003)
    let guidance: Guidance | null = null

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    const cadence = new SaveCadence(() => { if (toy) ctxRef.current.storage.save(serialize(toy.save)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      if (width > 0) view.size(width, height, dpr, governor.settings.grain)
    }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    // Before the slot has been read there is no toy yet: the bare sheet colour is drawn.
    let painted = ''
    const draw = () => {
      const pen = canvas.getContext('2d')
      if (!pen || width <= 0) return
      if (spike) {
        // The still spike is painted once for each size of the backing store.
        const stamp = `${canvas.width}x${canvas.height}`
        if (stamp !== painted) { painted = stamp; drawn.drawCalls = drawSpike(pen, width, height, dpr) }
      } else if (toy) drawn.drawCalls = view.draw(pen, toy, guidance)
      else view.backdrop(pen)
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
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      view.size(w, h, ratio, governor.settings.grain)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The blank surface only answers a touch with a sound.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    // The toy queues its voices as it answers; they are played here, inside the handler, so the first one falls
    // inside the touch, where the audio can hold it for the unlock. A change to what is saved goes to storage at the throttle.
    const afterToy = () => {
      if (!toy) return
      for (const voice of toy.takeVoices()) audio.play(voiceOf(voice))
      // The outcome of a scene or a cycle is saved at once; a change to the bridge at the throttle.
      const urgent = toy.takeUrgent()
      if (toy.takeChange() || urgent) cadence.change(performance.now(), urgent)
    }
    let lifted = false
    const act = (gestures: Gesture[]) => {
      if (!toy || spike) return
      for (const gesture of gestures) {
        lifted = gesture.type === 'dragLift'
        if (gesture.type === 'press') {
          // The top right corner is the grown-up's: nothing there answers a touch.
          if (gesture.at.x > width - CORNER && gesture.at.y < CORNER) continue
          toy.press(...view.toGrid(gesture.at.x, gesture.at.y))
        }
        if (gesture.type === 'tap') toy.tap()
        if (gesture.type === 'pressEnd') toy.pressEnd()
        if (gesture.type === 'dragStart') toy.dragStart()
        if (gesture.type === 'dragMove' || gesture.type === 'dragLift') toy.dragMove(...view.toGrid(gesture.at.x, gesture.at.y))
        // On lift the part drops: this game does not wait out the input's grace, in which a finger coming down again
        // nearby would carry the same part on. The next part is laid from where this one ended, by a new drag.
        if (gesture.type === 'dragLift') { toy.dragEnd(); touch.clear(); lifted = false }
        if (gesture.type === 'dragEnd') toy.dragEnd()
      }
      afterToy()
    }
    // Put away in the middle of a touch: whatever is in the hand goes back where it came from. A half-drawn part is
    // not laid, a carried part is not taken off, the trolley is not set down: no move is made that the child did not make.
    const putDown = () => {
      // A finger that had already lifted, inside the grace the input gives a lift, had let go: that drag is finished
      // as the child made it. A finger still down had not.
      const pending = touch.clear()
      if (lifted) act(pending)
      lifted = false
      if (!toy || spike) return
      // And a vehicle in the middle of a run is back at the near bank: a run is not saved.
      toy.putAway()
      afterToy()
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
      act(touch.up(event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      // The browser took the finger away (its own gesture, a palm, the surface going): the child did not let go. A
      // drag in the middle is abandoned, and whatever was in the hand is back where it came from: a half-drawn part
      // is not laid, a carried part not taken off, a pin not pulled.
      const gestures = touch.cancel(event.pointerId, event.timeStamp)
      if (gestures.some((gesture) => gesture.type === 'dragLift')) { touch.clear(); lifted = false; if (toy && !spike) { toy.pressEnd(); afterToy() } }
      else act(gestures)
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
      const step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (touch.active || toy?.playing) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
      if (toy) { toy.step(step); afterToy() }
      // The game steps its rules and its scene here, and hands what they changed to storage (`cadence`, above).
      // A tier change is applied ahead of the draw: whatever the game's tiers set in `applyTier`, then the pixel
      // ratio in `resize`. The interval just measured belongs to the frame before, so it is judged with that
      // frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is
    // ended, since its lift will never arrive (a drag is put down, a press ends without a tap), and the
    // newest state is handed to storage.
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      putDown()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      toy = new Game(deserialize(value, ctxRef.current.childAge, TOY_SHEET), stream(seed))
      // The game sets itself up from the state here, as it was left: nothing eases in and no scene replays.
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back where it came from before the last save.
      putDown()
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
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={bridgeCrewManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const bridgeCrewCartridge: Cartridge = {
  manifest: bridgeCrewManifest,
  Mount,
}
