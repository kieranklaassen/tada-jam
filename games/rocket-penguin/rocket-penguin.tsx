// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { rocketPenguinManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { putAway } from './putAway'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { SceneGain } from './sceneGain'
import { seedOf } from './rng'
import { serialize } from './save'
import { toStage } from './stage'
import { found, type Toy } from './toy'
import { View } from './view'
import { tellSounds } from './telling'

// The Mount. It wires the toy (toy.ts), which is the whole of what happens,
// to the surface: the saved state, attention, the attended clock, touch,
// sound from the first touch, the idle ladder, adaptive quality, the grown-up
// performance handle and the grown-up overlay. The view (view.ts) draws the
// toy's frame, and the voices (voices.ts) are played in the frame that asks
// for them.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), touch = new ForgivingTouch(), clock = new AttendedClock(), ladder = new IdleLadder(0)
    // Every voice goes through the game's own gain, which is taken off the output at put-away (sceneGain.ts).
    const scene = new SceneGain()
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
    const pen = canvas.getContext('2d')
    const view = new View((w, h) => {
      const made = document.createElement('canvas')
      made.width = w; made.height = h
      return made
    })
    let toy: Toy | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // The finger that is down landed in the grown-up's corner: it works nothing, and is not the child playing.
    let cornered = false
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
    const cadence = new SaveCadence(() => { if (toy) ctxRef.current.storage.save(serialize(toy.save)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      view.setTier(governor.settings)
      canvas.dataset.tier = String(governor.tier)
    }

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
      if (!pen || width <= 0 || height <= 0) return
      view.draw(pen, toy ? toy.show(playing.guidance) : null, playing.step)
      drawn.drawCalls = view.drawCalls
    }

    // The toy is told how much of the paper the surface shows: on a surface wider than the stage the paper goes on
    // past the stage's edges, and a flight leaves it at the edge that is seen.
    const see = () => {
      const by = view.fit
      if (toy && by.scale > 0) toy.sees(-by.x / by.scale, (width - by.x) / by.scale)
    }

    // What the toy asked for since the last call: its sounds, as one voice, and a save when the ring moved.
    const tell = () => {
      if (!toy) return
      tellSounds(toy, scene, (voice) => audio.play(voice))
      if (toy.takeSave()) cadence.change(performance.now(), true)
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
      // Every figure and the page are drawn again at the new size, once.
      if (pen) view.build(pen, w, h, ratio)
      see()
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The blank surface only answers a touch with a sound (`tick`, which goes
    // with its import when the game plays its own voices). The points are in the surface's CSS pixels: a canvas
    // 2D game turns each into stage units first, with `toStage` and the one fit made from `width` and `height`.
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
      if (!toy || view.fit.scale <= 0) return
      for (const gesture of gestures) {
        switch (gesture.type) {
          case 'press': {
            // The grown-up's corner answers nobody.
            if (inCorner(gesture.at.x, gesture.at.y, width)) break
            const where = toStage(gesture.at, view.fit)
            toy.press(where.x, where.y)
            break
          }
          case 'dragStart':
            break
          case 'dragMove': {
            const where = toStage(gesture.at, view.fit)
            toy.drag(where.x, where.y)
            break
          }
          case 'tap':
            toy.tap()
            break
          // The lift is the act: the Mount ends the drag at once (`letGo`, in `onUp`), and the end is the release.
          case 'dragLift':
            break
          case 'dragEnd':
            toy.release()
            break
          // Neither of these is the child letting go: the pouch eases back and nothing is flung.
          case 'pressEnd':
          case 'dragCancel':
            toy.cancel()
            break
          default:
            // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
            gesture satisfies never
        }
      }
      tell()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      const gestures = touch.down(event.pointerId, where, event.timeStamp)
      // A press in the grown-up's corner is no play: it leaves the idle ladder where it is.
      if (touch.holds(event.pointerId)) cornered = inCorner(where.x, where.y, width)
      if (!cornered) ladder.touch(clock.seconds)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      act(gestures)
      // A second finger works nothing (input.ts), but on the penguin in its pouch it is answered with a poke.
      if (!touch.holds(event.pointerId) && toy && view.fit.scale > 0 && !inCorner(where.x, where.y, width)) {
        const also = toStage(where, view.fit)
        toy.also(also.x, also.y)
        tell()
      }
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
      // Letting go is the act, so a lifted drag does not wait for the finger to come back.
      act(touch.letGo())
      if (!touch.active) cornered = false
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) overlay.forget()
      act(touch.cancel(event.pointerId))
      if (!touch.active) cornered = false
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
      // A finger that is working is not idle, and neither is a flight, a landing or the way back: the ghost hand
      // never comes up over them.
      if ((touch.active && !cornered) || (toy && toy.phase !== 'loaded')) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The toy advances by the step, and its sounds are played now: the frame drawn below is the one they belong to.
      if (toy) toy.step(playing.step, playing.guidance)
      tell()
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
      cornered = false
      // Whatever was sounding is cut off, so no tail finishes when the game comes back, and the idle ladder is
      // taken back to the bottom: the game that comes back has just been opened (putAway.ts).
      putAway(scene, ladder, clock.seconds)
      cadence.settle(performance.now())
      // Put away is the same as closed: the game that comes back is the one a load of what was just saved would
      // give. A pull, a flight, a landing and the way back are not saved, so none of them is found again.
      if (toy) {
        toy = found(serialize(toy.save), ctxRef.current.childAge, seedOf(window.location.search))
        see()
        playing.guidance = null
        draw()
      }
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      // The toy is found as it was left: the penguin in the pouch, the ring where the pouch was last let go.
      // `seed=<n>` in the address pins its chance, so a still can be taken again.
      toy = found(value, ctxRef.current.childAge, seedOf(window.location.search))
      see()
      // The load draws the first frame itself: a game that is resting or parked when the slot comes back has no
      // frame coming.
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
      scene.close()
      audio.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={rocketPenguinManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const rocketPenguinCartridge: Cartridge = {
  manifest: rocketPenguinManifest,
  Mount,
}
