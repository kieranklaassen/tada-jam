// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { BACKDROP } from './config'
import { compose } from './frame'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { eggHeistManifest } from './manifest'
import { Yard } from './model'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { StageView } from './render'
import { deserializeSave, serializeSave, type Save } from './save'
import { SaveCadence } from './saveCadence'
import { toStage } from './stage'
import { sendGesture } from './touch'
import { Bus, notesOfAll } from './voices'

// The Mount of the toy. The yard's rules are in model.ts, what a frame holds
// is in frame.ts and how it is drawn is in render.ts; this file wires them to
// the saved state, attention, the attended clock, touch, sound from the first
// touch, the idle ladder, adaptive quality, the grown-up performance handle
// and the grown-up overlay.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), bus = new Bus(), touch = new ForgivingTouch(), clock = new AttendedClock(), ladder = new IdleLadder(0)
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let state: Save | null = null, yard: Yard | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const view = new StageView(canvas)
    // What the loop hands the draw, as `drawn` is what the draw hands back. `guidance` is what the idle ladder
    // shows now, and null until the first frame: the loop keeps what `ladder.update` returns, so the glow and the
    // ghost hand reach the renderer without a second call. `step` is the seconds of play the frame advances, for
    // springs and whatever else the view eases by itself; it is 0 outside a frame, where `resize` and the load
    // draw the game as it stands.
    const playing = { step: 0, guidance: null as Guidance | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A game whose saved state is more than `state.ts` holds wraps it in a module of its own, as the header of
    // state.ts describes, and `serialize` and `deserialize` here become the wrapper's.
    // The yard is asked for its state at the moment of the save: it holds nothing in the air, whatever is seen flying.
    const cadence = new SaveCadence(() => { if (state && yard) ctxRef.current.storage.save(serializeSave(state, yard.toSave())) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read. So it has a case with no state (the bare backdrop of the look),
    // and it returns early while the surface has no size, which a parked surface has when the slot comes back.
    // It reads `playing` for the frame's step and the idle guidance.
    // A canvas 2D game takes `canvas.getContext('2d')` once, above, and makes one fit from the surface's size in
    // CSS pixels: `fit(width, height)` (stage.ts). Touches go through `toStage` with that fit, and the draw sets
    // its transform to the pixel ratio times that fit:
    // `setTransform(dpr * scale, 0, 0, dpr * scale, dpr * x, dpr * y)`. The fit is never made from
    // `canvas.width` and `canvas.height`, which are that size times the pixel ratio: every touch would then
    // land off by the ratio on a tablet, and right on a display of ratio 1.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      drawn.drawCalls = view.draw(compose(yard, playing.guidance))
    }

    // Plays what the yard queued, as one voice, and hands what it changed to storage.
    const settle = () => {
      if (!yard) return
      const cues = yard.takeCues()
      // Everything goes out through the bus, so a touch that ends a scene hushes what the scene still had sounding.
      if (cues.length) audio.play(bus.through(voiceOf(notesOfAll(cues)), cues.some((cue) => cue.name === 'hush')))
      const dirty = yard.takeDirty()
      if (dirty) cadence.change(performance.now(), dirty === 2)
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
      // A three.js game sizes through its renderer instead: `setPixelRatio(ratio)` and `setSize(w, h, false)`
      // take the place of these two assignments.
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      // The view is told the new size and ratio before it draws, and paints its cards again at that density.
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the toy does with a gesture. The points arrive in the surface's CSS pixels and go to the stage through
    // the view's one fit. The yard queues its voices as it answers, and `settle` plays them here, inside the
    // handler, and again after the step in the loop: the first sound of a visit then falls inside the touch,
    // where audio.ts holds it for the unlock. Everything one touch sets off is played as one voice.
    const act = (gestures: Gesture[]) => {
      if (!yard) return
      const onStage = (point: Point): Point => toStage(point, view.fit)
      // The grown-up's corner answers nothing: touch.ts keeps a touch that began there out of the yard.
      for (const gesture of gestures) sendGesture(yard, gesture, onStage, (point) => inCorner(point.x, point.y, width))
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
      const gestures = touch.down(event.pointerId, where, event.timeStamp)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      act(gestures)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      // A hold in the grown-up's corner stays there: the working finger leaving it starts that gesture again.
      if (touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      act(touch.move(event.pointerId, where))
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      act(touch.up(event.pointerId, where, event.timeStamp))
      // The lift is the act: the raccoon was led, and where the finger let go is where it was sent.
      act(touch.letGo())
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) overlay.forget()
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
      // Advances the attended clock. It returns the step to play, in seconds: the rules, a scene and every animation advance by it.
      playing.step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (touch.active) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The yard chooses which place the ghost hand shows as each showing comes up.
      yard?.showHand(playing.guidance.demoIndex)
      // The yard steps by the frame's seconds, and its sounds and changes follow. A pairing, a round, a punt or a
      // tidy that is playing is not idleness, so the ghost hand never comes up over one.
      if (yard) {
        yard.step(playing.step)
        if (yard.scene || yard.tidy.t >= 0 || yard.tidy.awake > 0 || yard.raccoon.mode !== 'still' || yard.goose.mode !== 'round') ladder.touch(clock.seconds)
        settle()
      }
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

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is
    // ended, since its lift will never arrive: a drag under a finger that is still down is cancelled and the
    // thing in hand goes back, a drag the finger had already let go is dropped, and a press ends without a tap.
    // Then the newest state is handed to storage.
    const attention = new Attention(document, (awake) => {
      if (awake) {
        audio.setActive(true)
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      overlay.forget()
      act(touch.clear())
      // Parked or put away: as after a load. A scene, a punt or a tidy that was playing is over, the farmer is
      // asleep, and the goose notices nothing until the child touches again. What was sounding is cut at once,
      // with no fade, before the sound goes to rest: no tail of it is left to sound when the game comes back.
      yard?.putAway()
      settle()
      bus.cut()
      audio.setActive(false)
      // The goose has walked on since the last save: where she is goes with the game to rest.
      cadence.mark()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      state = deserializeSave(value, ctxRef.current.childAge)
      // The yard is set up from the state as it was left: nothing eases in, no scene replays, and the goose
      // notices nothing until the child has touched the screen. The toy draws no chance, so a still taken with
      // any `seed` in the address comes out the same.
      yard = new Yard(state)
      // The load draws the first frame itself: a game that is resting or parked when the slot comes back has no
      // frame coming, and would go on showing the bare stage.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back or down before the last save.
      act(touch.clear())
      // Parked or put away: as after a load, the goose notices nothing until the child touches again.
      yard?.putAway()
      cadence.mark()
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
      <canvas ref={canvasRef} aria-label={eggHeistManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const eggHeistCartridge: Cartridge = {
  manifest: eggHeistManifest,
  Mount,
}
