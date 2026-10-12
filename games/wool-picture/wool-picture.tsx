// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { Buses } from './buses'
import { BACKDROP } from './config'
import { Game } from './game'
import type { Guidance } from './guidance'
import { Hands } from './hands'
import type { Hint } from './hint'
import type { Point } from './input'
import { woolPictureManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { makeRng, seedOf } from './rng'
import { SaveCadence } from './saveCadence'
import { fit, toStage } from './stage'
import { View } from './view'

// The Mount. It carries the game's time and its notes and keeps no clock of its
// own for sight or sound: the attended clock hands the game its step, the view
// draws what the toy holds, and the notes the toy releases are played here.
// Around that it wires the saved state, attention, touch, the idle ladder,
// adaptive quality, the grown-up performance handle and the grown-up overlay.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), buses = new Buses(), clock = new AttendedClock()
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const surface = canvas.getContext('2d')!
    const view = new View((w, h) => {
      const made = document.createElement('canvas')
      made.width = w; made.height = h
      return made
    })
    let game: Game | null = null, by = fit(0, 0)
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // What the loop hands the draw, as `drawn` is what the draw hands back. `guidance` is what the idle ladder
    // shows now, and null until the first frame: the loop keeps what `ladder.update` returns, so the glow and the
    // ghost hand reach the renderer without a second call. `step` is the seconds of play the frame advances, for
    // springs and whatever else the view eases by itself; it is 0 outside a frame, where `resize` and the load
    // draw the game as it stands.
    const playing = { step: 0, guidance: null as Guidance | null, hint: null as Hint | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A game whose saved state is more than `state.ts` holds wraps it in a module of its own, as the header of
    // state.ts describes, and `serialize` and `deserialize` here become the wrapper's.
    const cadence = new SaveCadence(() => { if (game) ctxRef.current.storage.save(game.record()) })
    // What the toy changed goes to storage: wool that keeps coming under a moving finger at the throttle; a
    // touch that has ended, and a scene's outcome (a picture hung, a fresh felt turned round), at once.
    const keep = (atOnce: boolean) => {
      if (!game || !game.toy.changed) return
      const urgent = game.toy.urgent
      game.toy.changed = false; game.toy.urgent = false
      cadence.change(performance.now(), atOnce || urgent)
    }
    // The notes the toy has released are played as one voice, inside the handler or the frame that released them.
    // A touch that ended a scene silences the scene's way out first, so the scene is silent from that frame.
    const sing = () => {
      if (!game) return
      if (game.toy.takeHush()) buses.endScene()
      const notes = game.toy.takeSounds(), sceneNotes = game.toy.takeSceneSounds()
      if (notes || sceneNotes) audio.play(buses.voice(notes, sceneNotes))
    }

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings, game ? game.toy : null)
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
      view.draw(surface, game ? game.toy : null, playing.guidance, playing.hint)
      drawn.drawCalls = view.draws
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
      by = fit(w, h)
      view.resize(w, h, ratio, by)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture is in hands.ts, where each of the eight gestures has a case of its own,
    // so one left out does not compile. The points are in the surface's CSS pixels and are turned into stage
    // units there with `toStage` and the one fit made from `width` and `height`. Two endings are not the child's
    // doing and make no move: on `dragCancel` the thing in hand goes back where it came from, and a `pressEnd`
    // is not a tap. The game queues its voices as it answers, and they are played inside the handler and again
    // after the step in the loop, so the first sound of a visit falls inside the touch, where audio.ts holds it
    // for the unlock. A press in the grown-up's corner (`inCorner` in overlay.ts) is not answered.
    // The fingers go through hands.ts, which turns them into the game's press, move and end and keeps their time
    // on the toy's clock: a resting contact gives way to the next one, and a figure or the comb in the hand hangs
    // for a moment where a lifted finger left it. After each gesture the notes are played, and what a touch that
    // has ended changed is saved at once.
    const hands = new Hands(() => game, (point) => toStage(point, by), (point) => inCorner(point.x, point.y, width), (ended) => { sing(); keep(ended) })
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      hands.down(event.pointerId, where)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (hands.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      // A hold in the grown-up's corner stays there: the working finger leaving it starts that gesture again.
      if (hands.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      hands.move(event.pointerId, where)
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (hands.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      // For wool the lift is the act: it clings and wakes when the finger goes. A figure or the comb in the hand
      // hangs a moment where it was let go (hands.ts).
      hands.up(event.pointerId, where)
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (hands.holds(event.pointerId)) overlay.forget()
      hands.cancel(event.pointerId)
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
      // The game plays the step, a sixtieth at a time. Its clock is the only one the view, the sounds and the
      // idle ladder know: a finger at work or a scene keeps the ladder at the bottom (game.ts), and what it
      // shows an idle child, a glow and then one move, is handed to the draw.
      if (game) {
        game.advance(playing.step)
        playing.guidance = game.guidance
        playing.hint = game.hint
        sing()
        keep(false)
        // What has hung where a finger let it go for longer than the grace is set down, on the clock just played.
        hands.frame()
      }
      // The game steps its rules and its scene here by `playing.step`, plays the voices they queued, and hands
      // what they changed to storage (`cadence`, above).
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
      hands.clear()
      cadence.settle(performance.now())
      // Put away: the game settles as a load would, the idle ladder is taken back, and all sound is closed.
      if (game) { game.park(); view.load(game.toy); playing.hint = game.hint }
      buses.closeAll()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      game = new Game(value, ctxRef.current.childAge, makeRng(seedOf(window.location.search)))
      view.load(game.toy)
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
      hands.clear()
      cadence.settle(performance.now())
      buses.closeAll()
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
      <canvas ref={canvasRef} aria-label={woolPictureManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const woolPictureCartridge: Cartridge = {
  manifest: woolPictureManifest,
  Mount,
}
