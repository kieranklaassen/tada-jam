// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { BACKDROP } from './config'
import { hand, lift } from './finger'
import type { Guidance } from './guidance'
import { Idleness, toRest } from './idle'
import { Hints } from './hint'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { mushroomVillageManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { deserialize, serialize } from './save'
import { SaveCadence } from './saveCadence'
import { fit, toStage } from './stage'
import { GladeView } from './view'
import { Village } from './village'

// The Mount of the glade. It wires the model (village.ts) and the view
// (view.ts) to what the template brings: the saved state, attention, the
// attended clock, touch, sound from the first touch, the idle ladder, adaptive
// quality, the grown-up performance handle and the grown-up overlay.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), touch = new ForgivingTouch(), clock = new AttendedClock(), idle = new Idleness(0)
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
    // The glade: null until the slot has been read, and the view paints the bare place until then.
    let village: Village | null = null
    const view = new GladeView(canvas, (w, h) => { const made = document.createElement('canvas'); made.width = w; made.height = h; return made })
    const hints = new Hints()
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
    const cadence = new SaveCadence(() => { if (village) ctxRef.current.storage.save(serialize(village.toSave())) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    // Here a tier sets how many glints run on the stream and how many specks are in the air at once.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
      if (village) village.maxSpecks = governor.settings.specks
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
      const glade = village
      // The hand shows the one next act the village has room for; its ghost mushroom never lies over a real one.
      const hint = glade ? hints.update(playing.guidance, (x, y) => glade.clearFor(x, y), glade.want()) : null
      const counts = view.draw(glade ? glade.show() : null, hint)
      // A canvas frame's draw count: the sprites stamped plus the live fills and lines.
      drawn.drawCalls = counts.stamps + counts.strokes
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
      // The view paints its backdrop for the new size before it draws, and its sprites when the fit changed.
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
    // A press in the grown-up's corner (`inCorner` in overlay.ts) never reaches this: it is the overlay's alone (`onDown`, below).
    // The model queues the notes of everything a touch or a step set off; they are played as one voice.
    // A scene's notes go through a gain of their own: the touch that ends the scene closes it, so nothing of the
    // scene rings on under the touch's own answer.
    const sound = () => {
      if (!village) return
      if (village.takeCut()) audio.cutScene()
      const notes = village.takeNotes(), scene = village.takeSceneNotes()
      if (notes.length > 0) audio.play(voiceOf(notes))
      if (scene.length > 0) audio.playScene(voiceOf(scene))
    }
    // A step of swelling is a small change; a mushroom that came, went or was let go of is saved at once.
    const keep = () => {
      const change = village ? village.takeChange() : 'none'
      if (change !== 'none') cadence.change(performance.now(), change === 'now')
    }
    const onStage = (point: Point): Point => toStage(point, fit(width, height))
    // What each gesture is to the glade is in finger.ts, where a test holds it; the sound and the save follow here.
    const act = (gestures: Gesture[]) => {
      if (!village) return
      hand(village, gestures, onStage)
      sound()
      keep()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    // The top right corner is the grown-up's: a finger that lands there is the overlay's alone. The glade does not
    // answer it, however long it stays or wherever it rubs, and it does not count as a touch on the idle ladder
    // (`Idleness.press` in idle.ts decides which of the two a press is, and a test holds it there).
    let cornerFinger: number | null = null
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      const where = at(event)
      idle.press(where, width, clock.seconds, () => {
        audio.touchDown()
        act(touch.down(event.pointerId, where, event.timeStamp))
      }, () => {
        if (cornerFinger === null && !touch.active) { cornerFinger = event.pointerId; overlay.press(where.x, where.y, width, event.timeStamp) }
      })
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      // A hold in the grown-up's corner stays there: the finger leaving it starts that gesture again.
      if (event.pointerId === cornerFinger) return overlay.move(where.x, where.y, width)
      act(touch.move(event.pointerId, where))
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (event.pointerId === cornerFinger) {
        cornerFinger = null
        return overlay.lift(where.x, where.y, width, event.timeStamp)
      }
      // Letting go is the act here (a mushroom comes out, a hold ends, a door is dropped), so a lifted drag ends at
      // the lift; only a stroke of pebbles waits the lift out, so that a path survives a lifted finger (`lift` in finger.ts).
      act(lift(touch, village?.drawing ?? false, event.pointerId, where, event.timeStamp))
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId === cornerFinger) {
        cornerFinger = null
        return overlay.forget()
      }
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
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom, and so does
      // whatever the child's touch set off while it is still going (`busy`). What a villager does by himself does not.
      // What to show an idle child: a glow on one place, then a hand that makes the one next move there.
      playing.guidance = idle.frame(clock.seconds, touch.active || (village?.busy ?? false))
      // The glade plays its step: springs, the beats of every answer, a mushroom swelling under a held finger.
      if (village) {
        village.step(playing.step)
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
      cornerFinger = null
      act(touch.clear())
      // Whatever was playing ends where its outcome was kept and the idle ladder is taken down, so what is found
      // on return is what a load would give, the ghost hand's wait included.
      toRest(clock.seconds, idle, village)
      keep()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved village wins; `childAge` only chooses what a first visit opens on.
      // The glade is set up as it was left: every mushroom stands at its size, and nothing eases in or replays.
      // `seed=<n>` in the address pins the stream its specks are thrown from, so a still can be taken again.
      village = new Village(deserialize(value, ctxRef.current.childAge), seedOf(window.location.search))
      village.maxSpecks = governor.settings.specks
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the bare place.
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
      <canvas ref={canvasRef} aria-label={mushroomVillageManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const mushroomVillageCartridge: Cartridge = {
  manifest: mushroomVillageManifest,
  Mount,
}
