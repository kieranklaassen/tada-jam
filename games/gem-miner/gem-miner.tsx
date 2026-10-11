// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { SoundBus } from './bus'
import { BACKDROP } from './config'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { gemMinerManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { Play } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { serialize, worldOf } from './save'
import { SaveCadence } from './saveCadence'
import { fit, toStage } from './stage'
import { isReadable } from './state'
import { HillView } from './view'

// The Mount of the game: hold a finger in the rock and the mole digs toward
// it. It wires the saved state, attention, the attended clock, touch, sound
// from the first touch, adaptive quality, the grown-up performance handle and
// the grown-up overlay round one visit of the game (play.ts) and its view
// (view.ts). Everything the game is and does is in play.ts and below it,
// without a screen; nothing here decides anything about the cave.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), bus = new SoundBus(), touch = new ForgivingTouch(), clock = new AttendedClock()
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
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // The visit: the game as the slot gave it, and everything that plays it. Null until the slot has been read.
    let play: Play | null = null
    // One seed a visit, for the hill of a first visit and for the streams the cast and the effects draw from:
    // `seed=<n>` in the address pins it, so a still can be taken again.
    const seed = seedOf(window.location.search)
    const view = new HillView(canvas, (w, h) => {
      const made = document.createElement('canvas')
      made.width = w; made.height = h
      return made
    })
    // The seconds of play the frame advances, for whatever the view eases by itself; it is 0 outside a frame,
    // where `resize` and the load draw the game as it stands. What the idle ladder shows is the visit's own.
    const playing = { step: 0 }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A game whose saved state is more than `state.ts` holds wraps it in a module of its own, as the header of
    // state.ts describes, and `serialize` and `deserialize` here become the wrapper's.
    // What a save holds is read off the visit: the hill as it stands, or, while a scene plays, what the scene
    // ends in. A mole on his way is saved in the block he last stood in, and nothing else of a frame is kept.
    const cadence = new SaveCadence(() => {
      if (play) ctxRef.current.storage.save(serialize(play.keeps))
    })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    // Besides the pixel ratio a tier sets how many chips a blow throws and whether dust rises, which the visit
    // reads as the events come.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      play?.setTier(governor.settings)
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
      view.draw(play ? { game: play.game, cast: play.cast, effects: play.effects, guidance: play.guidance, step: playing.step } : null)
      drawn.drawCalls = view.draws
    }

    // What the visit has just done is heard and saved here. A cut comes first: a scene that a touch has ended, or
    // a game put to rest, is silent before anything new sounds. Everything one touch or one step set off is one
    // voice. A change that keeps coming is handed to storage at the throttle, a scene's outcome at once.
    const emit = () => {
      if (!play) return
      const out = play.take()
      if (out.cut) bus.cut()
      if (out.notes.length > 0) audio.play(bus.voice(out.notes))
      if (out.save !== 'no') cadence.change(performance.now(), out.save === 'now')
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
    // A press knocks and sets the mole to work, or lifts a gem; a move is followed, or carries the gem. A tap
    // and a drop are the child's own; a press or a drag that was taken away makes no move, and a carried gem goes
    // back where it was. The lift of a drag is its end here (`letGo` below), so `dragLift` does nothing itself.
    const act = (gestures: Gesture[]) => {
      if (!play) return
      const by = fit(width, height)
      const corner = (at: Point): boolean => inCorner(at.x, at.y, width)
      for (const gesture of gestures) {
        switch (gesture.type) {
          case 'press':
            play.press(toStage(gesture.at, by), corner(gesture.at))
            break
          case 'dragMove':
            play.drag(toStage(gesture.at, by), corner(gesture.at))
            break
          case 'dragStart':
          case 'dragLift':
            break
          case 'tap':
            play.release('tap', toStage(gesture.at, by), corner(gesture.at))
            break
          case 'dragEnd':
            play.release('drop', toStage(gesture.at, by), corner(gesture.at))
            break
          case 'pressEnd':
          case 'dragCancel':
            play.release('cancel', undefined, false)
            break
          default:
            // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
            gesture satisfies never
        }
      }
      emit()
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
      // The lift is the end of the work, so a lifted drag does not wait for the finger to come back.
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
      // The visit plays the step: the rules, then what they did is heard, then everyone's motion, and the idle
      // ladder, which a working finger and anything still in motion keep at the bottom.
      if (play) {
        play.step(playing.step, touch.active)
        emit()
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
    // Then the visit is put to rest, which makes it what a load of its save would give and cuts whatever was
    // sounding, and the newest state is handed to storage.
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
      if (play) {
        play.park()
        emit()
      }
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    let unread = false
    ctxRef.current.storage.load<unknown>().catch(() => { unread = true; return null }).then((value) => {
      if (disposed) return
      // A saved game wins; `childAge` only chooses which hillside a first visit opens on: the youngest's for a
      // child of no age, and the same two for every age below and above the band.
      // The cave as it was left: the hill as dug, the mole at rest in his block or in the cage, whoever lives
      // there already in place. Nothing eases in and nothing replays.
      play = new Play(worldOf(value, ctxRef.current.childAge, seed), seed, governor.settings)
      // A first visit is saved as it opens, so the hillside a child looked at and left is the one that is found.
      // A slot that could not be read is not written over until the child has dug something.
      if (!unread && !isReadable(value)) cadence.change(performance.now(), true)
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
      bus.cut()
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
      <canvas ref={canvasRef} aria-label={gemMinerManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const gemMinerCartridge: Cartridge = {
  manifest: gemMinerManifest,
  Mount,
}
