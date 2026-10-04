// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { deserializeCamp } from './camp'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { Game } from './game'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { Look } from './look'
import { nightCampManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { voiceOf } from './sound'

// The Mount, showing the game: the camp of one site on its map, the kit to
// plan the night with, and the night itself under the cursor. Around it
// everything from the template is wired and running: the saved state,
// attention, the attended clock, touch, sound from the first touch, the idle
// ladder, adaptive quality, the grown-up performance handle and the grown-up
// overlay. Every rule is in the pure modules; the Mount only carries
// gestures in, and sounds, saves and frames out.
//
// For whoever takes the stills: `seed=<n>` in the address fixes the cast's
// random stream, and `night=1` forces the night film on.

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
    // Grown-ups only: three quick taps in the top right corner, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let game: Game | null = null, guidance: Guidance | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const query = new URLSearchParams(window.location.search), fixed = Number(query.get('seed'))
    // A fixed seed from the address for the lead's stills; otherwise a new one for the visit.
    const seed = query.has('seed') && Number.isFinite(fixed) ? Math.trunc(fixed) : window.crypto.getRandomValues(new Uint32Array(1))[0]
    const shown = { night: query.get('night') === '1' }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // What the game saves is whole at every instant: a row in the hand is saved as the count where it lies, a card
    // or a lantern in the hand where it came from, and a running night not at all.
    const cadence = new SaveCadence(() => { if (game) ctxRef.current.storage.save(game.saved()) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    // Before the slot has been read there is no game, and the look paints its bare backdrop: the map.
    const look = new Look()
    const draw = () => {
      const surface = canvas.getContext('2d')
      if (surface) drawn.drawCalls = look.paint(surface, width, height, dpr, game ? game.board : null, game ? game.frame : null, shown)
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
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      game?.resize(w, h)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The blank surface only answers a touch with a sound.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    // The game queues its voices as it answers, and they are played here, inside the touch, where audio.ts can
    // hold the first one for the unlock. A small change is handed to storage at the throttle; the outcome of a
    // scene, or a site laid out, at once, since a put-away in the next moment must find it saved.
    const voice = () => {
      if (!game) return
      for (const notes of game.takeSounds()) audio.play(voiceOf(notes))
      const changed = game.takeChanged()
      if (changed !== 'no') cadence.change(performance.now(), changed === 'now')
    }
    // Parked, hidden or closed. Whatever the finger held is let go, and nothing it had not done is done for it: a
    // corner pulled over does not turn the sheet, a card in the hand is not dropped on anything. A scene is finished
    // and a night on its way ends, so the camp is found as a load would find it.
    const putAway = () => {
      touch.clear()
      if (!game) return
      game.rest()
      voice()
    }
    const act = (gestures: Gesture[]) => {
      if (!game) return
      for (const gesture of gestures) {
        // A press ends a scene that is playing and is then an ordinary press (the game does both). Whatever starts
        // on a press starts there and then. A drag that is waiting out a lifted finger keeps hold of its thing,
        // and every other ending of a press lets it go.
        if (gesture.type === 'press') game.press(gesture.at)
        else if (gesture.type === 'dragMove') game.move(gesture.at)
        else if (gesture.type === 'tap' || gesture.type === 'dragEnd') game.lift()
        // A press that was taken away is not a tap: the thing is let go and nothing is done with it.
        else if (gesture.type === 'pressEnd') game.drop()
      }
      voice()
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
      overlay.press(where.x, where.y, width, event.timeStamp)
      act(touch.down(event.pointerId, where, event.timeStamp))
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)))
    const onUp = (event: PointerEvent) => {
      act(touch.up(event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      act(touch.cancel(event.pointerId, event.timeStamp))
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
      const step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      // A scene that is playing, or a night on its way, is not idleness either.
      if (touch.active || (game && (game.playing || game.running))) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
      // The game steps on the attended clock alone, writes its frame, and its voices are played after the step.
      if (game) { game.step(step, guidance); voice() }
      // A tier change is applied ahead of the draw: whatever the game's tiers set in `applyTier`, then the pixel
      // ratio in `resize`. The interval just measured belongs to the frame before, so it is judged with that
      // frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is
    // ended, since its lift will never arrive (a drag is put down, a press ends without a tap), and the
    // newest state is handed to storage.
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      putAway()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      // A saved position wins; `childAge` only chooses where a first visit starts. The game is built when the slot
      // has been read, as it was left: the rows lie whole, a morning stands finished, nothing eases in.
      game = new Game(width || 1180, height || 820, deserializeCamp(value, ctxRef.current.childAge), seed)
      // The game sets itself up from the state here, as it was left: nothing eases in and no scene replays.
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is let go before the last save.
      putAway()
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
      <canvas ref={canvasRef} aria-label={nightCampManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const nightCampCartridge: Cartridge = {
  manifest: nightCampManifest,
  Mount,
}
