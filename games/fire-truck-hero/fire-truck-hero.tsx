// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP, TIERS } from './config'
import { IdleLadder, handPose, type HandPose } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { fireTruckHeroManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { sound } from './sound'
import { Game } from './game'
import { createStage } from './stage'
import { KINDS } from './things'

// The Mount. Everything a game needs around its renderer is wired and
// running: the saved state, attention, the attended clock, touch, sound from
// the first touch, the idle ladder, adaptive quality, the grown-up performance
// handle and the grown-up overlay. The game is game.ts, which holds the rules,
// the scenes and the motion, and the renderer is the stage (stage.ts), which
// draws what the game holds.
//
// Two things in the address are for grown-ups taking stills: `seed=<n>` fixes
// the game's random stream, and `spike=1` shows the fullest yard the look has
// to carry, standing still but alive and taking no touch.

/** The saved state the look spike is shown from: the whole garden, with every kind already met so that nothing is shown. */
const SPIKE = { v: 1, position: 'whole-garden', finished: false, yard: { place: 'whole-garden', arrangement: 0 }, seen: [...KINDS] }

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
    // The yard as three.js draws it, made once. The game is made when the saved slot has been read.
    const query = new URLSearchParams(window.location.search)
    const spike = query.get('spike') === '1'
    const seed = Number(query.get('seed')) || Math.floor(Math.random() * 0x7fffffff) + 1
    const stage = createStage(canvas)
    const hand: HandPose = { travel: 0, press: 0, opacity: 0 }
    let game: Game | null = null
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    const cadence = new SaveCadence(() => { if (game && !spike) ctxRef.current.storage.save(game.snapshot()) })
    // What the game changed is handed to storage: at the throttle for water, at once for an outcome.
    const keep = () => {
      if (!game || game.needsSave === 'none') return
      cadence.change(performance.now(), game.needsSave === 'now')
      game.needsSave = 'none'
    }

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      stage.applyTier(governor.tier)
      if (game) game.dropsShare = TIERS[governor.tier].drops
      canvas.dataset.tier = String(governor.tier)
    }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    const draw = () => {
      if (game) stage.show(game)
      stage.draw()
      drawn.drawCalls = stage.counts.drawCalls
      drawn.triangles = stage.counts.triangles
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
      stage.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture: every touch is the hose. A press ends a scene that is playing and
    // then sends the first gulp in the frame the finger lands, a held or moving finger is a stream that follows
    // it, and a lift loses nothing. A finger that comes back to a drag it had let go takes the stream up again.
    const act = (gestures: Gesture[]) => {
      if (!game || spike) return
      for (const gesture of gestures) {
        if (gesture.type === 'press') game.press(stage.under(gesture.at.x, gesture.at.y), clock.seconds)
        else if (gesture.type === 'dragMove') {
          const under = stage.under(gesture.at.x, gesture.at.y)
          if (game.hose.holding) game.move(under.point)
          else if (!under.truck) game.press(under, clock.seconds)
        } else if (gesture.type !== 'dragStart') game.lift()
      }
      keep()
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
      if (touch.active || game?.sceneRunning || game?.leaving) ladder.touch(clock.seconds)
      // The game steps its rules, its scenes and its motion, and what they changed is handed to storage.
      if (game) {
        game.step(step, clock.seconds)
        keep()
        // What to show an idle child: a glow on what wants water, then one move, a single tap of the ghost hand.
        const guidance = ladder.update(clock.seconds)
        stage.guide(spike ? 0 : guidance.glow, spike || guidance.demo === null ? null : handPose(guidance.demo, false, hand), game.wants, game.wantsReach, game.wantsHigh, clock.seconds)
      }
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
      act(touch.clear())
      // A scene lands at its end and water in the air lands at once, silently, so nothing is lost.
      game?.rest()
      keep()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts. The game sets itself up from
      // the state as it was left: nothing eases in and no scene replays.
      game = new Game((voice) => sound(audio, voice), spike ? SPIKE : value, ctxRef.current.childAge, seed, clock.seconds)
      game.dropsShare = TIERS[governor.tier].drops
      // The load draws the first frame itself: a game that is resting or parked has no frame coming.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is put down before the last save.
      act(touch.clear())
      game?.rest()
      keep()
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
      stage.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={fireTruckHeroManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const fireTruckHeroCartridge: Cartridge = {
  manifest: fireTruckHeroManifest,
  Mount,
}
