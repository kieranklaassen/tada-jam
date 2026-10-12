// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { Game } from './game'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { stagePoint } from './layout'
import { microMayhemManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { deserialize, houseOf, serialize, type Save } from './save'
import { SaveCadence } from './saveCadence'
import { Gate } from './sound'
import { GameView } from './view'
import { notesOf } from './voices'

// The Mount: a house of eight rooms on a pocket game's display. Around the
// view and the rules it wires the saved state, attention, the attended clock,
// touch, sound from the first touch, the idle ladder, adaptive quality, the
// grown-up performance handle and the grown-up overlay.

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
    // The saved record and the game made from it. Both are null until the slot has been read.
    let save: Save | null = null, game: Game | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // Every voice plays through one gate, so that sound can be cut in one frame.
    const gate = new Gate()
    const view = new GameView(canvas, (w, h) => {
      const made = document.createElement('canvas')
      made.width = w
      made.height = h
      return made
    })
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
    // The saved state is the wrapper's (save.ts): what state.ts holds, and the house. A scene's outcome is in
    // the house from the scene's first moment, so the record is taken as the house stands.
    const cadence = new SaveCadence(() => {
      if (!save || !game) return
      save = { ...save, ...game.house }
      ctxRef.current.storage.save(serialize(save))
    })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The view takes the segments' shadows and afterimages from the tier, and the
    // canvas is marked with the tier, where a still or a probe can read which one is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has
    // been read. With no game yet the view draws the bare look: the case, the printed card and the ghosts of the
    // unlit segments. The view makes the one fit of the stage from the surface's size in CSS pixels (`view.fit`),
    // and every touch comes back through that same fit. It reads `playing` for the idle guidance.
    // The draw count it hands back is what the frame-budget test counts: sprite stamps plus shapes drawn live.
    const draw = () => {
      const index = playing.guidance ? Math.max(0, playing.guidance.demoIndex) : 0
      const cost = view.draw(game ? game.show() : null, playing.guidance, game ? game.hint(index) : null, clock.seconds)
      drawn.drawCalls = cost.stamps + cost.strokes
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

    // The cues the game handed out are played at once, as one voice: inside the handler for a touch, where
    // audio.ts holds the first sound of a visit for the unlock, and after the step in the loop for a pose that
    // comes later. A sound is never scheduled ahead of its pose. A touch that ended a scene, and a put-away,
    // close every sound that is still ringing first, so the scene is silent from that frame.
    const sound = () => {
      if (!game) return
      if (game.hush()) gate.cut()
      const cues = game.cues()
      if (cues.length > 0) audio.play(gate.through(voiceOf(notesOf(cues))))
    }
    // A step of a thing and a scene's outcome are saved at once; the patches of the glass, which keep coming
    // under a rubbing finger, at the throttle.
    const keep = () => {
      const changed = game ? game.changed() : 'no'
      if (changed !== 'no') cadence.change(performance.now(), changed === 'now')
    }

    // What the game does with a gesture. The points are in the surface's CSS pixels and come back to stage
    // units through the view's fit. A press is answered in this call, with its pose and its sound. A press in
    // the grown-up's corner is answered by nothing (`stagePoint` in layout.ts), and returns false, so that it
    // does not take the idle ladder back either. A finger that stays down may rub the bathroom glass, pull the
    // weed or pull the lamp's cord, and it lets go on whichever ending the press has. A finger the browser took
    // away never acts for the child: whatever it held goes back without a sound (`game.cancel`).
    const act = (gestures: Gesture[]): boolean => {
      let answered = false
      for (const gesture of gestures) {
        if (!game) continue
        switch (gesture.type) {
          case 'press': {
            const on = stagePoint(gesture.at, width, view.fit)
            if (on) {
              game.press(on)
              answered = true
            }
            break
          }
          case 'dragMove': {
            const on = stagePoint(gesture.at, width, view.fit)
            if (on) game.move(on)
            break
          }
          case 'dragStart':
          case 'dragLift':
            break
          case 'tap':
          case 'dragEnd':
            game.release()
            break
          // The press or the drag was taken away, and the child did not let go.
          case 'pressEnd':
          case 'dragCancel':
            game.cancel()
            break
          default:
            // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
            gesture satisfies never
        }
        sound()
        keep()
        // A finger that has gone leaves nothing waiting for the throttle: the last patch it rubbed clear is written now.
        if (gesture.type === 'tap' || gesture.type === 'dragEnd' || gesture.type === 'pressEnd' || gesture.type === 'dragCancel') cadence.settle(performance.now())
      }
      return answered
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
      // Only a touch the game answered takes the idle ladder back to the bottom.
      if (act(gestures)) ladder.touch(clock.seconds)
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
      // The things of a room stand close together and nothing is carried from place to place, so a lift ends the
      // touch at once: every touch-down is then a touch of its own (input.ts).
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
      // A finger that holds something is not idle: a rub, a pull or a held button keeps the ladder at the bottom.
      // A scene that is playing is not idleness either, or the ghost hand comes up over the scene. What a
      // character does by itself never takes the ladder back.
      if (game && (game.holding || game.playing)) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The game plays the frame's seconds; the poses that came due are lit, their sounds are played now, and
      // whatever of it is saved goes to storage.
      if (game) {
        game.step(playing.step)
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
      // Put away, the game settles as a load would: a scene ends where it was going, everyone is at rest, every
      // sound is closed, and the idle ladder is taken back, so that what is found is what a load would show.
      if (game) game.park()
      gate.cut()
      ladder.touch(clock.seconds)
      playing.guidance = null
      cadence.settle(performance.now())
      draw()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // The age is not read: a first visit starts in the same room at every age.
      save = deserialize(value)
      // The house as it was left: the room that was on screen, every thing at its saved step, everyone at rest,
      // and no scene replayed. Its chance comes from one seed, and `seed=<n>` in the address pins it, so a still
      // can be taken again.
      game = new Game(houseOf(save), seedOf(window.location.search))
      // The idle ladder starts from the moment the house is on the glass.
      ladder.touch(clock.seconds)
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
      // The sprites are canvases, and a canvas keeps its pixels until its size is taken away.
      view.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={microMayhemManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const microMayhemCartridge: Cartridge = {
  manifest: microMayhemManifest,
  Mount,
}
