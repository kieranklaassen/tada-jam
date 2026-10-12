// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { fingerMoved, play } from './hands'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { inGrownUpCorner } from './layout'
import { glowPegsManifest } from './manifest'
import { Outlet, voiceFor } from './outlets'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { deserialize, serialize } from './save'
import { SaveCadence } from './saveCadence'
import { Toy } from './toy'
import { ToyView } from './view'

// The Mount of Glow Pegs. Around the toy (toy.ts) and its view (view.ts) it
// wires the saved state, attention, the attended clock, touch, sound from the
// first touch, the idle ladder, adaptive quality, the grown-up performance
// handle and the grown-up overlay.
//
// Two canvases lie one over the other: the still layer under the live one
// (view.ts says why), and over both a sheet of scan lines that takes no touch.

/** Dark lines across the picture, one in three stage rows, as on an old vector tube. */
const SCAN_LINES = 'repeating-linear-gradient(to bottom, rgba(0, 0, 0, 0.3) 0px, rgba(0, 0, 0, 0.3) 1px, rgba(0, 0, 0, 0) 1px, rgba(0, 0, 0, 0) 3px)'

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stillRef = useRef<HTMLCanvasElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const scanRef = useRef<HTMLDivElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!, still = stillRef.current!
    const audio = new GameAudio(), touch = new ForgivingTouch(), clock = new AttendedClock(), ladder = new IdleLadder(0)
    // Every sound goes out through one of two outlets (outlets.ts): the scenes' own, shut when a touch ends a scene, and the rest.
    const playOut = new Outlet(), sceneOut = new Outlet()
    // A finger that landed in the grown-up's corner: the game answers nothing of it, down, moved or lifted.
    let cornerFinger = -1
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the live layer, for the grown-up handle and the overlay: the sprites it stamped
    // and the lines it stroked and filled. A canvas 2D game has no triangles.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    const view = new ToyView(still, canvas, (w, h) => {
      const sprite = document.createElement('canvas')
      sprite.width = w
      sprite.height = h
      return sprite
    }, scanRef.current)
    // The toy, once the slot has been read.
    let toy: Toy | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // What the loop hands the draw: the seconds of play the frame advances (0 outside a frame, where `resize`
    // and the load draw the toy as it stands), and what the idle ladder shows now.
    const playing = { step: 0, guidance: null as Guidance | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it. Every change of
    // the toy is a small one that keeps coming (a peg, a colour, a button), so each goes at the throttle, and
    // going to rest writes whatever the throttle still holds. The board in a save is the truth as the finger
    // left it: nothing is saved in the air.
    const cadence = new SaveCadence(() => { if (toy) ctxRef.current.storage.save(serialize(toy.toSave())) })

    // The one place a quality tier is applied, besides the pixel ratio, which `resize` applies: the view takes
    // the trail, the halo and the shimmer from it. Both canvases carry the tier, where a still or a probe reads it.
    const applyTier = () => {
      canvas.dataset.tier = still.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    // The one place a frame is drawn. With no toy yet it is the bare cabinet; with no size it is nothing.
    const draw = () => {
      view.draw(toy, playing.step, playing.guidance)
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
      // Sizing a backing store wipes it, so both layers are redrawn at once, with sprites made again at the new density.
      for (const layer of [still, canvas]) { layer.width = Math.round(w * ratio); layer.height = Math.round(h * ratio) }
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // The toy queues what is to be heard on the frame it is seen. Everything one handler or one step set off is
    // played as one voice, so the first touch of a visit is held whole for the unlock.
    const sound = () => {
      if (!toy) return
      // A touch ended a scene: what was still sounding of it is silent from this frame.
      if (toy.hush) {
        toy.hush = false
        sceneOut.shut()
      }
      if (toy.sounds.length === 0) return
      audio.play(voiceFor(toy.sounds, playOut, sceneOut))
      toy.sounds.length = 0
    }
    // A scene's outcome is saved the moment the scene starts; everything else goes at the throttle.
    const keep = () => {
      if (!toy || !toy.dirty) return
      const now = toy.saveNow
      toy.dirty = toy.saveNow = false
      cadence.change(performance.now(), now)
    }

    // What the toy does with a gesture is in hands.ts; what it queued to be heard and to be saved follows in the same handler.
    const act = (gestures: Gesture[]) => {
      if (!toy) return
      play(toy, gestures, view.fit)
      sound()
      keep()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake || view.fit.scale <= 0) return
      const where = at(event)
      // The top right corner is the grown-up's: the game answers nothing there, and the idle ladder does not hear it.
      if (inGrownUpCorner(where.x, where.y, width)) {
        if (!touch.active) {
          cornerFinger = event.pointerId
          overlay.press(where.x, where.y, width, event.timeStamp)
          root.setPointerCapture(event.pointerId)
        }
        return
      }
      audio.touchDown()
      ladder.touch(clock.seconds)
      const gestures = touch.down(event.pointerId, where, event.timeStamp)
      // Only the working finger counts towards the grown-up's gesture.
      if (touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      act(gestures)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      if (event.pointerId === cornerFinger) return overlay.move(where.x, where.y, width)
      if (touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      if (!toy) return void touch.move(event.pointerId, where)
      // Every move of the working finger reaches the toy, the ones inside a tap's slack too: the lever's knob is under it from the first unit.
      fingerMoved(toy, touch, event.pointerId, where, view.fit)
      sound()
      keep()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (event.pointerId === cornerFinger) {
        cornerFinger = -1
        return overlay.lift(where.x, where.y, width, event.timeStamp)
      }
      if (touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      act(touch.up(event.pointerId, where, event.timeStamp))
      // The holes stand closer than a lifted drag reaches to take a finger back, so the lift ends the stroke:
      // the next touch-down is a touch of its own, and never a line drawn to it from the last one.
      act(touch.letGo())
      audio.touchUp()
    }
    // The browser took the finger away: the stroke ends, and the peg under the finger is let go.
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId === cornerFinger) {
        cornerFinger = -1
        return overlay.forget()
      }
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
      // Advances the attended clock. It returns the step to play, in seconds: the toy and every animation advance by it.
      playing.step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // Nor is a child who is watching the beam run or a scene play. A character's own act is not a reason: only the finger and the show are.
      if (touch.active || toy?.busy) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on the next empty holes, then one drag across them.
      playing.guidance = ladder.update(clock.seconds)
      if (toy) {
        toy.step(playing.step)
        sound()
        keep()
      }
      // A tier change is applied ahead of the draw: the view's part in `applyTier`, then the pixel ratio in
      // `resize`. The interval just measured belongs to the frame before, so it is judged with that frame's work.
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

    // Put away: the toy settles as a load would find it (the lever up, a scene at its end, nothing in the air),
    // every sound is shut, the idle ladder starts again from the bottom and the save is written. The picture
    // is drawn as it now stands, so the game is found exactly as it would load.
    const rest = () => {
      if (toy) {
        toy.putAway()
        toy.hush = false
        keep()
      }
      playOut.shut()
      sceneOut.shut()
      ladder.touch(clock.seconds)
      playing.guidance = null
      cadence.settle(performance.now())
      draw()
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is
    // ended, since its lift will never arrive, and the newest state is handed to storage.
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
      cornerFinger = -1
      act(touch.clear())
      rest()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved board wins; `childAge` only chooses what a first visit lays on it. The toy stands as it was
      // left: nothing eases in and nothing replays. `seed=<n>` in the address pins the watchers' idle chance,
      // so a still can be taken again.
      toy = new Toy(deserialize(value, ctxRef.current.childAge), seedOf(window.location.search))
      // The load draws the first frame itself: a game that is resting when the slot comes back has no frame coming.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, then the last save.
      act(touch.clear())
      rest()
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

  const layer = { position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' } as const
  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={stillRef} aria-hidden style={layer} />
      <canvas ref={canvasRef} aria-label={glowPegsManifest.name} style={layer} />
      <div ref={scanRef} aria-hidden style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: SCAN_LINES, opacity: 0.55 }} />
    </div>
  )
}

export const glowPegsCartridge: Cartridge = {
  manifest: glowPegsManifest,
  Mount,
}
