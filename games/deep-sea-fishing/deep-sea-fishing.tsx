// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { BACKDROP } from './config'
import { buildFrame } from './frame'
import { Game } from './game'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import type { Item } from './items'
import { deepSeaFishingManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { makeRng, seedOf } from './rng'
import { leftOf, load, store, type Saved } from './save'
import { toStage } from './stage'
import { Working, answer } from './touches'
import { beginCycle, finishCycle } from './state'
import { View } from './view'
import { partsFor } from './voices'

// The Mount. The game itself is in game.ts: the line, the baits, the nine
// creatures, the tub and the two scenes. Around it here are the saved state,
// attention, the attended clock, touch, sound from the first touch, the idle
// ladder, adaptive quality, the grown-up performance handle and the grown-up
// overlay.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), touch = new ForgivingTouch(), clock = new AttendedClock()
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
    const view = new View(canvas), items: Item[] = []
    let state: Saved | null = null, game: Game | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
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
    const cadence = new SaveCadence(() => { if (state) ctxRef.current.storage.save(store(state)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has
    // been read. Before the slot is read it draws the bare cloth, and it draws nothing while the surface has no
    // size. What it counts as draw calls is what the frame-budget test counts: sprite stamps plus live strokes.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      drawn.drawCalls = view.draw(game ? buildFrame(game, playing.guidance, items) : null)
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
      // The view is told the new size and ratio before it draws, and paints its sprites again at that density.
      view.size(w, h, ratio)
      draw()
      return true
    }
    // The game is set up from the saved state, as it was left: the bait on the hook, the hook where it was let
    // go, the catch on it, the train behind it and the tub, and nothing eases in or plays again. Its chance comes
    // from one stream, which `seed=<n>` in the address pins so that a still can be taken again. The load does
    // this once the slot has been read, and going to rest does it again, so that a game that was parked and one
    // that was loaded are the same game.
    const open = () => {
      if (!state) return
      audio.hush()
      game = new Game(leftOf(state), makeRng(seedOf(window.location.search)))
      ladder = new IdleLadder(clock.seconds)
      playing.guidance = null
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game set off since it was last asked. Its sounds are played as one voice, here inside the handler
    // and again after the step in the loop. What the child has left is handed to storage: a hook let go in a new
    // place at the throttle, and everything else at once (a bait taken, a bite, a theft, a follower, a catch
    // landed or tipped back, and the outcome of a scene at the moment the scene starts), so that a put-away in
    // the next moment finds it saved. The tip-out ends a trip: the cycle is finished with a mixed outcome, which
    // leaves the position where it is, and the child's next touch on the line begins the next one.
    const settle = () => {
      if (!game || !state) return
      // A scene or an answer that a touch ended stops sounding in this frame, before the touch's own sounds, and nothing else does.
      for (const tag of game.hushes) audio.hush(tag)
      game.hushes.length = 0
      if (game.cues.length > 0) {
        audio.playTagged(partsFor(game.cues).map((part) => ({ tag: part.tag, voice: voiceOf(part.notes) })))
        game.cues.length = 0
      }
      if (game.dirty === 0) return
      const atOnce = game.dirty === 2, left = game.snapshot()
      game.dirty = 0
      state = { ...state, bait: left.bait, hook: left.hook, hooked: left.hooked, following: left.following, tub: left.tub }
      if (left.finished && !state.finished) state = finishCycle(state, 'mixed')
      else if (!left.finished && state.finished) state = beginCycle(state)
      cadence.change(performance.now(), atOnce)
    }

    // What the game does with a gesture is in touches.ts. The points arrive in the surface's CSS pixels and go
    // to the game in stage units, through the one fit the view holds. The grown-up's corner answers no touch.
    const working = new Working()
    const cornered = (at: Point): boolean => inCorner(at.x, at.y, width)
    const act = (gestures: Gesture[]) => {
      if (!game) return
      for (const gesture of gestures) answer(game, gesture, (at) => toStage(at, view.fit), cornered)
      settle()
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
      // A finger in the grown-up's corner is not the child at work: the idle ladder is left as it is.
      if (touch.holds(event.pointerId)) working.at(where, cornered)
      if (working.counts(true)) ladder.touch(clock.seconds)
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
      if (touch.holds(event.pointerId)) { overlay.move(where.x, where.y, width); working.at(where, cornered) }
      act(touch.move(event.pointerId, where))
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (touch.holds(event.pointerId)) { overlay.lift(where.x, where.y, width, event.timeStamp); working.lifted() }
      act(touch.up(event.pointerId, where, event.timeStamp))
      // The lift is the act: the hook stays where the finger let it go, so a lifted drag ends here and now.
      act(touch.letGo())
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) { overlay.forget(); working.lifted() }
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
      if (working.counts(touch.active) || game?.playing) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The game plays the step, and its sounds are played.
      game?.step(playing.step)
      settle()
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
      // A parked game stays mounted, and comes back exactly as a load of what was just saved would: a scene or
      // an answer that was in play is over, nothing of it sounds on, and the idle ladder starts from the bottom.
      open()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      state = load(value, ctxRef.current.childAge)
      open()
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the bare cloth.
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
      <canvas ref={canvasRef} aria-label={deepSeaFishingManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const deepSeaFishingCartridge: Cartridge = {
  manifest: deepSeaFishingManifest,
  Mount,
}
