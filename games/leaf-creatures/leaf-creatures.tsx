// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { CanvasPen } from './canvasPen'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { leafCreaturesManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { read, write } from './save'
import { SaveCadence } from './saveCadence'
import { Bus } from './sound'
import { fit, toStage } from './stage'
import { Painter } from './painter'
import { Toy } from './toy'
import { holdsLadder, landing, liftOf, park, perform, show, touchClock } from './visit'

// The Mount. Everything round the toy is wired here: the saved clearing,
// attention, the attended clock, touch, sound from the first touch, the idle
// ladder, adaptive quality, the grown-up performance handle and the grown-up
// overlay. The toy itself is in toy.ts, and the frame is drawn by view.ts
// with the crayon pen of canvasPen.ts.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const pen = new CanvasPen(canvas.getContext('2d')!)
    const seed = seedOf(window.location.search)
    const audio = new GameAudio(), bus = new Bus(), touch = new ForgivingTouch(), clock = new AttendedClock()
    let ladder = new IdleLadder(0), painter = new Painter()
    // Whether the finger that is down landed in the grown-up's corner: such a finger is nobody playing.
    let cornered = false
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
    let toy: Toy | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
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
    // What is written is the clearing at rest: a part in the air lies where it will land, and one lifted from
    // the earth lies where it was (`saved` in toy.ts).
    const cadence = new SaveCadence(() => { if (toy) ctxRef.current.storage.save(write(toy.saved())) })
    // Plays what the toy asked for since the last call, as one voice, and hands what it changed to storage. It
    // is called inside every gesture handler and after every step, so a sound is heard in the frame of its motion.
    const flush = () => {
      if (!toy) return
      // A touch that ended a scene silences the scene from this call, before the touch's own sound.
      if (toy.hush) { bus.hush(); toy.hush = false }
      if (toy.asked.length > 0) { audio.play(bus.voice(toy.asked)); toy.asked = [] }
      if (toy.changed > 0) { cadence.change(performance.now(), toy.changed === 2); toy.changed = 0 }
    }

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      if (toy) toy.air.most = governor.settings.leaves
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
      if (width <= 0 || height <= 0) return
      const by = fit(width, height)
      // The pictures are kept at the sharpness of full quality on this screen, whatever the tier draws them on to.
      pen.prepare(by.scale * Math.min(window.devicePixelRatio || 1, 2), by)
      // When the pictures are new (a load, a put-away, a surface of another size) the place and every creature's
      // own picture are made with them, before the frame begins: a clearing is whole in its first frame (`show`).
      if (toy) show(pen, painter, toy, playing.guidance, governor.settings, () => pen.begin(by, dpr, width, height))
      // Before the slot is read there is no clearing to show yet: the place alone, with nobody in it.
      else { pen.begin(by, dpr, width, height); pen.stamp('scenery', 0, 0) }
      // Every stamp and stroke of the frame, those into the kept pictures included.
      drawn.drawCalls = pen.count
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
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The points are in the surface's CSS pixels: each is turned into stage
    // units first, with `toStage` and the one fit made from `width` and `height`.
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
      // What each gesture does is in visit.ts, where a test holds it.
      for (const gesture of gestures) perform(toy, gesture, (point) => toStage(point, fit(width, height)), (point) => inCorner(point.x, point.y, width))
      flush()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      // The grown-up's corner answers nothing, and a finger there does not take the idle ladder back either.
      // Only the finger that begins a press says so (`landing`): a second finger there changes nothing for the working one.
      const landed = landing(touch, event.pointerId, where, touchClock(toy), cornered, (point) => inCorner(point.x, point.y, width))
      const gestures = landed.gestures
      cornered = landed.cornered
      if (!cornered) ladder.touch(clock.seconds)
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
      // A carry survives a lifted finger: the part waits, seen to be letting go, for a grace that runs on the
      // toy's clock, and a finger that comes back near it carries on. Any other slide ends here (`liftOf`).
      act(liftOf(toy, touch, event.pointerId, where))
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
      act(touch.advance(touchClock(toy)))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (holdsLadder(touch.active, cornered, toy)) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      if (toy) {
        toy.step(playing.step)
        flush()
        // A creature that wanders by itself has changed where it stands: that is written when the game comes to rest.
        if (toy.creatures.length > 0) cadence.mark()
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
      cadence.settle(performance.now())
      // Put away: every sound is closed, and the clearing becomes exactly what a load of what was just saved
      // gives, so it is found as it would be found after the game was closed. The idle ladder starts again.
      bus.close()
      if (toy) {
        const parked = park(toy, ctxRef.current.childAge, seed, clock.seconds)
        toy = parked.toy; ladder = parked.ladder
        // What is in the slot is the clearing as it now stands, whatever the throttle still held.
        ctxRef.current.storage.save(write(toy.saved()))
        painter = new Painter()
        applyTier()
      }
      playing.guidance = null
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved clearing wins; `childAge` only chooses what lies on the earth on a first visit.
      toy = new Toy(read(value, ctxRef.current.childAge, seed), seed)
      applyTier()
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
      <canvas ref={canvasRef} aria-label={leafCreaturesManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const leafCreaturesCartridge: Cartridge = {
  manifest: leafCreaturesManifest,
  Mount,
}
