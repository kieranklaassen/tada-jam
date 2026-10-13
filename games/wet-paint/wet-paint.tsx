// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf, type Voice } from './audio'
import { Bus } from './bus'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { Hands } from './hands'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { Overlay } from './overlay'
import { wetPaintManifest } from './manifest'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { seedOf } from './rng'
import { deserialize, serialize } from './save'
import { fit } from './stage'
import { Toy } from './toy'
import { View } from './view'

// The Mount. It wires the game (toy.ts) and its view (view.ts) to what the
// shell gives: the saved state, attention, the attended clock, touch, sound
// from the first touch, the idle ladder, adaptive quality, the grown-up
// performance handle and the grown-up overlay. The game is played by the
// attended clock's step alone, and everything seen and heard comes out of
// that step. What a touch does is in hands.ts, where it is tested.

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
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    const view = new View(canvas.getContext('2d')!)
    const hands = new Hands()
    // Every sound goes through one bus, and a scene's sounds through a second inside it (bus.ts).
    const everySound = new Bus(), sceneSound = new Bus(everySound)
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
    // The save is the water at rest, the pot, the tool, the prints and the place (save.ts).
    const cadence = new SaveCadence(() => { if (toy) ctxRef.current.storage.save(serialize(toy.toSave())) })

    // The one place a quality tier is applied: the view takes what the tier sets besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`. The tier is also marked on the canvas, where a still or a probe can read it.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    // The one place the frame is drawn. The loop calls it on every frame, `resize` calls it after sizing, which
    // can be before the slot is read and while the game rests, and the load calls it once the slot has been
    // read. With no toy yet the view draws the room alone, and it draws nothing while the surface has no size.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      view.draw(toy, playing.guidance)
      // A canvas 2D frame has no draw calls: what is counted is the sprites stamped plus the pen strokes and fills.
      drawn.drawCalls = view.drawn.stamps + view.drawn.pen
    }
    // The notes the game queued, joined into one voice: the first sound of a visit then waits whole for the
    // unlock. A scene that a touch ended is cut off first, so nothing of it is heard from this frame on.
    const sound = () => {
      if (!toy) return
      const sounds = toy.takeSounds(), voices: Voice[] = []
      if (sounds.hush) sceneSound.close()
      if (sounds.plain.length > 0) voices.push(everySound.through(voiceOf(sounds.plain)))
      if (sounds.scene.length > 0) voices.push(sceneSound.through(voiceOf(sounds.scene)))
      if (voices.length > 0) audio.play((context, out, at) => { for (const voice of voices) voice(context, out, at) })
    }
    const keep = () => {
      const changed = toy ? toy.takeChanged() : 0
      if (changed > 0) cadence.change(performance.now(), changed === 2)
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

    // What the game does with a touch is in hands.ts: a press is answered at once, a touch that is taken away
    // makes no move for the child, and a press in the grown-up's corner is not answered at all. The notes the
    // game queued are played here, inside the handler, and again after the step in the loop.
    const act = (gestures: Gesture[]) => {
      if (!toy) return
      hands.take(gestures, toy, ladder, fit(width, height), width, clock.seconds)
      sound()
      keep()
    }
    // Going to rest, parked or put away: the touch is taken away, the game settles as a load would find it, all
    // sound is cut, the idle ladder is taken back, and the newest state is handed to storage.
    const putAway = () => {
      act(touch.clear())
      if (toy) {
        // A park and a load give the same game: the same road in the toy, a seed drawn as a load draws it, and
        // the hand's turns begun again in the view.
        hands.putAway(toy, ladder, clock.seconds, seedOf(window.location.search))
        view.rest()
        toy.takeSounds()
        keep()
      }
      sceneSound.close()
      everySound.close()
      cadence.settle(performance.now())
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      // A whole hand is one finger, but a contact that only rests hands the work to the next one that lands
      // (hands.ts).
      const gestures = hands.down(touch, event.pointerId, where, event.timeStamp, toy)
      // A contact that rested in the grown-up's corner and lost the work is no hold any more.
      if (hands.handedOver) overlay.forget()
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
      // The lift ends a pull at once: the water coasts from where the finger let go.
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
      // A finger that is working is not idle, and neither is a child watching a scene it set off (hands.ts).
      if (toy) hands.idle(toy, ladder, touch.active, clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The toy plays the frame's step, the voices it queued are played, and what changed goes to storage. Once
      // the water has come to rest, whatever the throttle still holds is written.
      if (toy) {
        toy.step(playing.step)
        sound()
        keep()
        if (!toy.moving && !touch.active) cadence.settle(performance.now())
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
    // taken away, since its lift will never arrive, and the game is left as a load would find it (`putAway`).
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
      putAway()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      toy = new Toy(deserialize(value, ctxRef.current.childAge), seedOf(window.location.search))
      // The game is as it was left: nothing eases in. Its chance comes from one seed, which `seed=<n>` in the
      // address pins, so a still can be taken again. The load draws the first frame itself, since a game that
      // is resting or parked when the slot comes back has no frame coming.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest.
      putAway()
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
      <canvas ref={canvasRef} aria-label={wetPaintManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const wetPaintCartridge: Cartridge = {
  manifest: wetPaintManifest,
  Mount,
}
