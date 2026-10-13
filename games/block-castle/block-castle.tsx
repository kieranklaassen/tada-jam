// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf, type Note } from './audio'
import { deserialize, serialize, type CastleState } from './castleState'
import * as evening from './eveningVoices'
import { BACKDROP } from './config'
import { ChildsTouch } from './corner'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { blockCastleManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { Play, type PlayEvent } from './play'
import { seedOf } from './rng'
import { SaveCadence } from './saveCadence'
import { SceneSound } from './sceneSound'
import { CastleView } from './view/castleView'
import * as voices from './voices'

// The Mount of the toy: blocks carried out of a basket and set down on a rug.
// The toy itself is play.ts, which knows nothing of the screen; the picture is
// view/castleView.ts, which decides nothing. This file joins them to the
// touch, the sound, the saved state, attention, the idle ladder, adaptive
// quality, and the grown-up's handle and overlay.

/** Everything the toy says happened, as the notes of one voice. */
function notesOf(events: readonly PlayEvent[]): Note[] {
  const notes: Note[] = []
  for (const event of events) {
    switch (event.type) {
      case 'lift': notes.push(...voices.lift(event.kind)); break
      case 'land': notes.push(...voices.land(event.kind, event.tier, event.wood, event.variant, event.air, event.soft)); break
      case 'shed': notes.push(...voices.shed(event.why)); break
      case 'flip': notes.push(...voices.flip); break
      case 'basket': notes.push(...voices.intoBasket(event.kind)); break
      case 'rise': notes.push(...voices.rise(event.kind)); break
      case 'creak': notes.push(...voices.creak); break
      case 'pat': notes.push(...voices.pat(event.surface)); break
      case 'poke': notes.push(...voices.folk(event.who)); break
      // The one whose taste a block is to says the start of his sound, after the knock.
      case 'taste': for (const note of voices.folk(event.who, true)) notes.push({ ...note, delay: (note.delay ?? 0) + 0.22 }); break
      // The evening: the bell, each thing becoming itself and answering a tap, and the folk about the castle.
      case 'bell': notes.push(...evening.bell); break
      case 'dusk': notes.push(...evening.dusk); break
      case 'dawn': notes.push(...evening.dawn); break
      case 'become': notes.push(...evening.become(event.what, event.capped, event.tier)); break
      case 'unbecome': notes.push(...voices.land(event.kind, event.tier, true, 0, false, true)); break
      case 'act': notes.push(...evening.act(event.what, event.clang)); break
      case 'peek': for (const note of voices.folk(event.who, true)) notes.push({ ...note, delay: (note.delay ?? 0) + 0.05 }); break
      case 'puff': notes.push(...evening.puff); break
      case 'shake': notes.push(...evening.shake); break
      case 'step': notes.push(...evening.step(event.who, event.n)); break
      case 'boing': notes.push(...evening.boing(event.who)); break
      // The board dips under him without a sound of its own: the boing follows.
      case 'bend': break
      case 'whee': notes.push(...evening.whee(event.who)); break
      case 'bump': notes.push(...evening.bump(event.who)); break
      case 'splash': notes.push(...evening.splash); break
      case 'door': notes.push(...evening.door); break
      case 'window': notes.push(...evening.squeeze); break
      case 'home': notes.push(...evening.home); break
      case 'hup': notes.push(...evening.hup); break
      case 'tip': notes.push(...evening.tip); break
      case 'tipped': notes.push(...evening.tipped); break
      default: event satisfies never
    }
  }
  return notes
}

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), touch = new ForgivingTouch(), clock = new AttendedClock()
    const sceneSound = new SceneSound(), childs = new ChildsTouch()
    let ladder = new IdleLadder(0)
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
    const view = new CastleView(canvas)
    let play: Play | null = null
    // The rug as storage last had it, so only a rug that changed is handed over.
    let saved = ''
    let state: CastleState | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
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
    const cadence = new SaveCadence(() => { if (state) ctxRef.current.storage.save(serialize(state)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.applyTier(governor.settings)
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
      const counts = view.draw(play, playing.guidance, playing.step)
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
      // A three.js game sizes through its renderer instead: `setPixelRatio(ratio)` and `setSize(w, h, false)`
      // take the place of these two assignments.
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
    // A touch that landed in the grown-up's corner (`ChildsTouch` in corner.ts) is not answered at all.
    // What the toy says happened becomes one voice and the marks in the air, and a rug that changed is saved.
    const answer = () => {
      if (!play || !state) return
      const events = play.take()
      if (events.length > 0) {
        view.mark(events)
        // What a scene sounds goes through the scene's own gain, which a touch that ends the scene closes.
        const voice = voiceOf(notesOf(events))
        audio.play(play.sceneRunning ? sceneSound.through(voice) : voice)
      }
      // A scene's outcome is saved the moment the scene starts: a put-away in the next moment finds it there,
      // and nothing replays on load. A block in the hand counts as where it came from, so the rug otherwise
      // only changes when one is set down or put back.
      const atOnce = play.takeSaveNow()
      if (play.hand && !atOnce) return
      const rug = play.rug()
      const now = JSON.stringify([rug, play.finished])
      if (now === saved) return
      saved = now
      state.blocks = rug
      state.finished = play.finished
      cadence.change(performance.now(), atOnce)
    }
    const ray = (point: Point) => view.rayAt(point.x, point.y, width, height)
    const act = (gestures: Gesture[]) => {
      if (!play || gestures.length === 0) return
      for (const gesture of gestures) {
        // The grown-up's corner is not the child's: a touch that landed there is not answered, press or drag.
        if (!childs.takes(gesture, width)) continue
        switch (gesture.type) {
          case 'press': {
            // A press that ends a scene ends its sounds with it: what was still ringing is silent from this frame.
            const scene = play.sceneRunning
            play.press(ray(gesture.at))
            if (scene) sceneSound.drop()
            break
          }
          case 'tap':
            play.tap()
            break
          case 'pressEnd':
            play.pressEnd()
            break
          case 'dragStart':
            play.carry(ray(gesture.from))
            break
          case 'dragMove':
            play.carry(ray(gesture.at))
            break
          // The lift is the act: the block lands where the finger let it go (`letGo` in onUp).
          case 'dragLift':
            break
          case 'dragEnd':
            play.drop()
            break
          // The drag was taken away and the child made no drop: the block goes back where it came from.
          case 'dragCancel':
            play.cancel()
            break
          default:
            // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
            gesture satisfies never
        }
      }
      answer()
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
      // The lift is the act, and the places of the rug stand close together: a lifted drag ends here.
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
      // Nor is a block in the air or one still settling.
      if (touch.active || (play && (play.hand || play.busy))) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The toy plays the frame's time in fixed steps; what happened in them is heard and saved.
      if (play) play.advance(playing.step)
      answer()
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
        // Back from being put away, the idle guidance starts as it does on load: from the bottom of its ladder,
        // with nothing the hand goes by that is not saved.
        ladder = new IdleLadder(clock.seconds)
        play?.asLoaded()
        // A scene that was playing is over, as on a load: so are its sounds.
        sceneSound.drop()
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      overlay.forget()
      act(touch.clear())
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      state = deserialize(value, ctxRef.current.childAge)
      // The rug as it was left: every block stands where it stood, nothing eases in and nothing sounds.
      // `seed=<n>` in the address pins the toy's chance, so a still can be taken again.
      play = new Play(state.blocks, seedOf(window.location.search), state.finished)
      saved = JSON.stringify([play.rug(), play.finished])
      // The load draws the first frame itself: a game that is resting or parked when the slot comes back has no
      // frame coming, and would go on showing the bare room.
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
      view.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={blockCastleManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const blockCastleCartridge: Cartridge = {
  manifest: blockCastleManifest,
  Mount,
}
