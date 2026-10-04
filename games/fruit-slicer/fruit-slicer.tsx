// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { fruitSlicerManifest } from './manifest'
import { CORNER, Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { deserialize, serialize } from './save'
import { voiceFor } from './sound'
import { SpikePlate } from './spike'
import { fit, toStage } from './stage'
import { GameCanvas } from './gameCanvas'
import { GameRun } from './gameRun'

// The Mount, showing the game. Everything around it is the template's: the
// saved state, attention, the attended clock, touch, sound from the first
// touch, the idle ladder, adaptive quality, the grown-up performance handle
// and the grown-up overlay. The game itself runs in gameRun.ts and is drawn
// by gameCanvas.ts; this file only joins them to the surface.
//
// Two things in the address are for grown-ups taking stills: `seed=<n>` fixes
// the random streams of the visit, and `spike=1` shows the look spike's still
// in place of the toy.

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
    let run: GameRun | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const query = new URLSearchParams(window.location.search)
    const asked = query.get('seed')
    // A seed from the address makes a visit the same every time; without one each visit draws its own.
    const seed = asked !== null && /^\d{1,9}$/.test(asked) ? Number(asked) : Math.floor(Math.random() * 2 ** 32)
    const view = new GameCanvas()
    const spike = query.get('spike') === '1' ? new SpikePlate() : null
    // What the idle ladder returned for this frame: kept, and handed to the draw.
    let guidance: Guidance = { glow: 0, demo: null, demoIndex: -1 }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A touch changes the game at once, and nothing saved is ever in the air: what moves afterwards, a scene
    // included, only shows what has already happened. So the game can be written at any instant as it stands.
    const cadence = new SaveCadence(() => { if (run) ctxRef.current.storage.save(serialize(run.game)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    // Before the slot has been read there is no game yet: the bare page of the look is drawn.
    const draw = () => { drawn.drawCalls = spike ? spike.draw(canvas) : view.draw(canvas, run ? run.frame(clock.seconds, guidance) : null) }

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
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The blank surface only answers a touch with a sound.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    // The sounds the game has queued are played here, inside the handler that caused them, so the first one falls
    // inside the touch, where audio.ts can hold it for the unlock. A change to the game is handed to storage: at
    // the throttle for a small one, at once for the outcome of a scene or a customer stepping up.
    const flush = () => {
      if (!run) return
      for (const sound of run.takeSounds()) audio.play(voiceFor(sound.id, sound.length, sound.count, sound.delay))
      if (run.dirty) {
        cadence.change(performance.now(), run.urgent)
        run.dirty = run.urgent = false
      }
    }
    const act = (gestures: Gesture[], timeMs = performance.now()) => {
      if (!run || gestures.length === 0) return
      const by = fit(width, height)
      for (const gesture of gestures) {
        // Whatever starts on a press (the blade and its ring, a piece taken hold of) starts there and then, and a
        // scene that is playing ends first. A press has one ending: a tap, the lift of its drag, or a press that
        // was taken away. The lift comes twice, as `dragLift` and then `dragEnd`; the second finds nothing to do.
        if (gesture.type === 'press') run.press(toStage(gesture.at, by), timeMs / 1000)
        else if (gesture.type === 'dragMove') run.move(toStage(gesture.at, by), timeMs / 1000)
        else if (gesture.type === 'tap') run.tap(toStage(gesture.at, by))
        else if (gesture.type === 'dragLift' || gesture.type === 'dragEnd') run.lift()
        else if (gesture.type === 'pressEnd') run.end()
      }
      flush()
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
      // The top right corner is the grown-up's: nothing of the toy answers a touch there.
      if (where.x >= width - CORNER && where.y <= CORNER) return
      act(touch.down(event.pointerId, where, event.timeStamp), event.timeStamp)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)), event.timeStamp)
    const onUp = (event: PointerEvent) => {
      act(touch.up(event.pointerId, at(event), event.timeStamp), event.timeStamp)
      audio.touchUp()
    }
    // The touch ends without the child having lifted the finger: the browser took the pointer away, or the game
    // goes to rest or is put away. That is not a lift, so it makes no move: the blade goes, and a piece or the
    // roller in the hand stays where it was in the game, which is where it is saved.
    const drop = () => {
      touch.clear()
      run?.end()
      flush()
    }
    const onCancel = () => {
      drop()
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
      if (touch.active || run?.playing) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
      // What moves is played by the step: the effects of the last touch, and the dog. The game does not change with time.
      run?.step(step)
      flush()
      // The game steps its rules and its scene here, and hands what they changed to storage (`cadence`, above).
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
      drop()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      run = new GameRun(deserialize(value, ctxRef.current.childAge, seed), seed)
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
      // As on going to rest: the touch ends first, with no move made, before the last save.
      drop()
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
      <canvas ref={canvasRef} aria-label={fruitSlicerManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const fruitSlicerCartridge: Cartridge = {
  manifest: fruitSlicerManifest,
  Mount,
}
