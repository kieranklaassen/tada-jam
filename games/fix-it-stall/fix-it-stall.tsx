// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { Bench } from './bench'
import { BenchView } from './benchView'
import { Cast } from './cast'
import { suggest } from './ladder'
import { fixItStallManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { deserializeStall, serializeStall } from './save'
import { voice } from './sound'
import { Spike } from './spike'
import { fit, toStage } from './stage'

// The Mount, showing the stall: a customer at the bench with a gadget that has
// stopped, the mat, the tray, and a finger (bench.ts). Around it is everything
// the template wires: the saved state, attention, the attended clock, touch,
// sound from the first touch, the idle ladder, adaptive quality, the grown-up
// performance handle and the grown-up overlay.
//
// In the address: `seed=<n>` fixes the stream the folk's small motions are
// picked from, for stills; `spike=1` shows the look spike instead of the game.

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
    // Grown-ups only: a finger held a second in the top right corner and lifted there, then three taps; or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let bench: Bench | null = null, cast: Cast | null = null, guidance: Guidance | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const params = new URLSearchParams(window.location.search)
    const asked = Number(params.get('seed'))
    // A fixed seed from the address for the lead's stills; otherwise a new one for the visit.
    const seed = params.has('seed') && Number.isFinite(asked) ? asked >>> 0 : Math.floor(Math.random() * 0xffffffff)
    // Which seed this visit runs on, where a still or a probe can read it.
    canvas.dataset.seed = String(seed)

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // The stall is always at rest when it is serialized: a lead in the hand is in the circuit with its second clip
    // loose, and a lead fresh from the coil is in no circuit yet. Nothing is saved in the air.
    const cadence = new SaveCadence(() => { if (bench) ctxRef.current.storage.save(serializeStall(bench.stall)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    const spike = params.get('spike') === '1' ? new Spike() : null, surface = canvas.getContext('2d')
    const view = new BenchView()
    const draw = () => {
      if (!surface) return
      if (spike) drawn.drawCalls = spike.draw(surface, width, height, dpr, clock.seconds)
      else if (bench && cast) {
        // The hand's move is worked out only while the ladder shows something.
        const showing = guidance !== null && (guidance.glow > 0.01 || guidance.demo !== null)
        drawn.drawCalls = view.draw(surface, width, height, dpr, bench, cast, guidance, showing ? suggest(bench) : null, clock.seconds)
      } else {
        // Before the slot has been read: the bare mat.
        surface.setTransform(1, 0, 0, 1, 0, 0)
        surface.fillStyle = BACKDROP
        surface.fillRect(0, 0, canvas.width, canvas.height)
      }
    }

    // What the bench queued while it answered: its sounds are played here, inside the gesture's own handler or
    // right after a step, and a change is handed to storage: a small one at the throttle, the outcome of a scene
    // or the end of a cycle at once.
    const flush = () => {
      if (!bench) return
      for (const sound of bench.sounds) audio.play(voice(sound.voice, sound.pitch))
      bench.sounds.length = 0
      if (bench.marks.length > 0) {
        view.show(bench.marks)
        cast?.mark(bench.marks)
        bench.marks.length = 0
      }
      if (bench.dirty) {
        cadence.change(performance.now(), bench.dirty === 'now')
        bench.dirty = null
      }
    }

    // The shell can resize the surface without a window resize event, so the surface watches itself.
    // Returns whether it sized the surface, and so drew it.
    // The grown-up's corner is 72 surface pixels square at the top right. The bench is told where that is on the stage,
    // so that nothing of the game answers a touch there.
    const placeCorner = () => {
      if (!bench || width <= 0) return
      const stage = fit(width, height), size = 72 / stage.scale, corner = toStage(stage, { x: width, y: 0 })
      bench.grownUps = { x: corner.x - size, y: corner.y, w: size, h: size }
    }
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
      placeCorner()
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // A touch in progress when the game goes to rest or is put away: its lift will never arrive; or the browser took the pointer away. The touch is
    // forgotten, not ended as a lift, since a lift over a pad, a socket or the owner would be a move the child did
    // not make. Whatever was in the hand goes back where it came from (`letGo` in bench.ts).
    const putDown = () => {
      overlay.forget()
      touch.clear()
      bench?.letGo()
      flush()
    }

    // What the game does with a gesture. The blank surface only answers a touch with a sound.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    const act = (gestures: Gesture[]) => {
      if (!bench || spike) return
      const stage = fit(width, height)
      for (const gesture of gestures) {
        if (gesture.type === 'press') bench.press(toStage(stage, gesture.at))
        else if (gesture.type === 'dragStart') bench.move(toStage(stage, gesture.from))
        else if (gesture.type === 'dragMove') bench.move(toStage(stage, gesture.at))
        else if (gesture.type === 'dragLift') {
          bench.lift(toStage(stage, gesture.at), 'lift')
          // What was in the hand was put down on the lift, so this drag is over now. Left to wait out its grace, it
          // would swallow the next touch nearby as the same drag coming back, and two pads are that near each other.
          if (!bench.hand) touch.clear()
        }
        else bench.lift(toStage(stage, gesture.at), gesture.type === 'tap' ? 'tap' : 'end')
      }
      flush()
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
    // The browser took the pointer away. That is no lift: ending it as one over a pad, a socket or the owner would be a
    // move the child did not make. The touch is forgotten and whatever was in the hand goes back where it came from.
    const onCancel = () => {
      putDown()
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
      if (touch.active) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
      if (bench) {
        // A scene that is playing is not idleness.
        if (bench.scene) ladder.touch(clock.seconds)
        bench.step(step)
        cast?.step(step, bench)
        view.step(step)
        flush()
      }
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
    // forgotten and what was in the hand goes back where it came from, and the newest state is handed to storage.
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
      bench = new Bench(deserializeStall(value, ctxRef.current.childAge))
      cast = new Cast(seed, bench)
      placeCorner()
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
      <canvas ref={canvasRef} aria-label={fixItStallManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const fixItStallCartridge: Cartridge = {
  manifest: fixItStallManifest,
  Mount,
}
