// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { Bus } from './bus'
import { BACKDROP } from './config'
import type { Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { barkBoatsManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { SaveCadence } from './saveCadence'
import { Session } from './session'
import { toStage } from './stage'
import { BrookView } from './view'
import { lengthOf, notesOf, type Sound } from './voices'

// The Mount: one visit (session.ts) drawn by the view (view.ts), with
// storage, attention, the attended clock, touch, sound from the first touch,
// adaptive quality, the grown-up performance handle and the grown-up overlay
// wired round them. The rules, the idle ladder and what a put-away does are
// the session's, where they are tested without a browser.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), bus = new Bus(), touch = new ForgivingTouch(), clock = new AttendedClock()
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
    const view = new BrookView(canvas)
    // The visit, once the slot has been read.
    let game: Session | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
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
    // The toy hands over where everything rests or will rest: nothing is saved in the hand or in the air.
    const cadence = new SaveCadence(() => { if (game) ctxRef.current.storage.save(game.save()) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). Here a tier sets how many sheets of water lines are stamped, and the tier is
    // marked on the canvas, where a still or a probe can read which one is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.waterLayers = governor.settings.waterLayers
    }

    // The one place the game draws its frame. The loop calls it on every frame,
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
      // The boats moored at the pond are printed when their list has changed, which is at a load and when a boat comes in.
      if (game) view.sync(game.w)
      view.draw(game ? game.w : null, playing.guidance)
      drawn.drawCalls = view.stamps + view.pen
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
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The points are in the surface's CSS pixels, and each is turned into
    // stage units first, with `toStage` and the view's one fit.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    // Two endings are not the child's doing, and neither makes a move: on `dragCancel` the thing in hand goes
    // back where it came from, and a `pressEnd` lets go of what the press lit and is not a tap. Every gesture has
    // a case of its own, so a game that leaves one out, a cancelled drag above all, does not compile.
    // The game queues its voices as it answers, and they are played here, inside the handler, and again after
    // the step in the loop: the first sound of a visit then falls inside the touch, where audio.ts holds it for
    // the unlock. Everything one touch sets off is played as one voice (`voiceOf` in audio.ts).
    // A press in the grown-up's corner (`inCorner` in overlay.ts) is answered as bare backdrop is, or not at all.
    const act = (gestures: Gesture[]) => {
      if (!game) return
      for (const gesture of gestures) {
        switch (gesture.type) {
          case 'press': {
            const p = toStage(gesture.at, view.fit)
            // The stage shrinks with the surface and the corner does not, so the corner is tested in the surface's own pixels.
            game.press(p.x, p.y, inCorner(gesture.at.x, gesture.at.y, width))
            break
          }
          case 'tap':
            game.tap()
            break
          case 'pressEnd':
            game.pressEnd()
            break
          case 'dragStart':
            game.dragStart()
            break
          case 'dragMove': {
            const p = toStage(gesture.at, view.fit)
            game.dragMove(p.x, p.y)
            break
          }
          // The lift is the act: `letGo` in the lift's handler ends the drag at once, so nothing waits here.
          case 'dragLift':
            break
          case 'dragEnd':
            game.dragEnd()
            break
          // The drag was taken away and the child made no drop: the thing in hand goes back where it came from.
          case 'dragCancel':
            game.dragCancel()
            break
          default:
            // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
            gesture satisfies never
        }
      }
      sound()
      keep()
    }
    // Everything one handler or one frame set off is played as one voice, inside that handler or that frame.
    // A scene's sounds go through a line of their own: the touch that ends the scene shuts it in this same call,
    // before the touch's own sound is played.
    const voice = (sounds: readonly Sound[], scene: boolean) => {
      const notes = notesOf(sounds)
      audio.play(bus.through(voiceOf(notes), lengthOf(notes), scene))
    }
    const sound = () => {
      if (!game) return
      const heard = game.heard()
      if (heard.cut) bus.cutScene()
      if (heard.scene.length > 0) voice(heard.scene, true)
      if (heard.plain.length > 0) voice(heard.plain, false)
    }
    // What the game changed goes to storage: a thing moved about at the throttle, a change to the boat, the
    // journey or a scene's outcome at once.
    const keep = () => {
      if (!game) return
      const dirty = game.changed()
      if (dirty !== 'no') cadence.change(performance.now(), dirty === 'now')
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      // The session takes the idle ladder back when the press is the child's: one in the grown-up's corner is not.
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
      // Letting go is the act: a carried thing is dropped in this handler, and every touch-down is a touch of its own.
      act(touch.letGo())
      // A lifted drag waits a moment for the finger to come back. A game whose lift is the act, or whose targets
      // stand close together, ends it here instead: `act(touch.letGo())` (input.ts).
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
      // Here that is a thing still in the air or floating home, the boat on its way, or a scene (session.ts).
      // The game plays the step, and its sounds are played on the frame of the motion they belong to. What to show
      // an idle child comes back from it: a glow on what can be touched, then one move.
      if (game) {
        playing.guidance = game.frame(playing.step, clock.seconds, touch.active)
        sound()
        keep()
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
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      overlay.forget()
      act(touch.clear())
      // Put away: every sound is closed, and the game settles into what a load of its own save would find.
      bus.cutAll()
      if (game) {
        game.park()
        game.heard()
        game.changed()
      }
      cadence.settle(performance.now())
      draw()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      // The game is set up as it was left: nothing eases in, nothing sounds and nothing replays. `seed=<n>` in the
      // address pins its chance.
      game = new Session(value, ctxRef.current.childAge, seedOf(window.location.search))
      // The game sets itself up from the state here, as it was left: nothing eases in and no scene replays.
      // Its chance comes from streams it makes here from one seed, `seedOf(window.location.search)` in rng.ts:
      // `seed=<n>` in the address pins it, so a still can be taken again.
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back or down before the last save.
      act(touch.clear())
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
      <canvas ref={canvasRef} aria-label={barkBoatsManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const barkBoatsCartridge: Cartridge = {
  manifest: barkBoatsManifest,
  Mount,
}
