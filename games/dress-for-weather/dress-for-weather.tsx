// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { Hall } from './hall'
import type { Point } from './input'
import { homeControlOn } from './layout'
import { dressForWeatherManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { makeRng, seedOf } from './rng'
import { deserialize } from './save'
import { Sounding } from './sounding'
import { fit, type Fit } from './stage'
import { Touching } from './touching'
import { HallView } from './view'

// The Mount: the hall (hall.ts) drawn by the view (view.ts), with everything
// a game needs around it: the saved hall, attention, the attended
// clock, touch (touching.ts), sound from the first touch (sounding.ts), the
// idle ladder, adaptive quality, the grown-up performance handle and the
// grown-up overlay.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), sounding = new Sounding(), clock = new AttendedClock(), ladder = new IdleLadder(0)
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
    // The hall is made when the slot has been read, and is null until then.
    let hall: Hall | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    let by: Fit = fit(0, 0)
    // The finger: gestures on the stage for the hall, the grown-up's corner left alone, a drag that survives a
    // lifted finger (touching.ts).
    const touch = new Touching(ladder, () => hall, () => ({ width, by }))
    const view = new HallView(canvas.getContext('2d')!)
    // What the loop hands the draw, as `drawn` is what the draw hands back. `guidance` is what the idle ladder
    // shows now, and null until the first frame: the loop keeps what `ladder.update` returns, so the glow and the
    // ghost hand reach the renderer without a second call. `step` is the seconds of play the frame advances, for
    // springs and whatever else the view eases by itself; it is 0 outside a frame, where `resize` and the load
    // draw the game as it stands.
    const playing = { step: 0, guidance: null as Guidance | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The hall says when its save has changed and how soon it must be written (`settle`, below): at once for
    // an act that is certain, at the throttle for a change that keeps coming. Going to rest writes whatever the
    // throttle still holds.
    // What goes to storage is the hall's own save: every garment where it belongs, none in the air.
    const cadence = new SaveCadence(() => { if (hall) ctxRef.current.storage.save(hall.toSave()) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The hall's tiers set the pixel ratio and nothing else: it marks the tier on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame,
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
    const draw = () => { drawn.drawCalls = view.draw(hall, playing.guidance) }

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
      // One fit, from the size in CSS pixels, serves the draw and every touch.
      by = fit(w, h)
      view.resize(canvas.width, canvas.height, ratio, by)
      // Where the jam's home control lies on the stage now: no worn garment may lie under it.
      hall?.setControl(homeControlOn(w, by))
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // Plays what the hall has queued as one voice, a group silenced where the hall says so, and hands what it
    // changed to storage: at once for an act that is certain, at the throttle for a zip that is still being pulled.
    const settle = () => {
      if (!hall) return
      const heard = hall.takeSounds()
      if (heard.length > 0) audio.play(sounding.voice(heard))
      if (hall.dirty) {
        cadence.change(performance.now(), hall.dirty === 'now')
        hall.dirty = null
      }
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      touch.down(event.pointerId, where, event.timeStamp, clock.seconds)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      settle()
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      // A hold in the grown-up's corner stays there: the working finger leaving it starts that gesture again.
      if (touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      touch.move(event.pointerId, where)
      settle()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      // A garment let go over a spot goes on inside the touch; one let go over nothing waits for the finger (touching.ts).
      touch.up(event.pointerId, where, event.timeStamp)
      settle()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) overlay.forget()
      touch.cancel(event.pointerId)
      settle()
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
      // A lifted drag that has outlasted its grace ends here. A finger that is working is not idle: a hold or a
      // slow drag keeps the ladder at the bottom (touching.ts).
      touch.advance(now, clock.seconds)
      // The hall plays its answers, its flights and its scenes by the step, and their beats queue their own notes.
      if (hall) {
        hall.step(playing.step)
        settle()
        // A garment in the air, an answer still playing, a walk or a scene is not idleness.
        if (hall.busy) ladder.touch(clock.seconds)
      }
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
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
      if (awake) {
        audio.setActive(true)
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      overlay.forget()
      // The touch ends, and whatever was only on its way arrives, unseen and unheard, so the parked hall is the
      // hall a load would show: the idle ladder is back at the bottom too, and the hand is not on the surface.
      playing.guidance = touch.rest(clock.seconds)
      // Whatever was still sounding is closed before the sound is put to sleep, or it would finish on waking.
      settle()
      audio.setActive(false)
      draw()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved hall wins; `childAge` only chooses how a first visit finds it. The hall is set up as it was
      // left: nothing eases in and nothing is heard. `seed=<n>` in the address pins where the characters are in
      // their idle rounds, so a still can be taken again.
      hall = new Hall(deserialize(value, ctxRef.current.childAge), makeRng(seedOf(window.location.search)).next() * 60)
      if (width > 0) hall.setControl(homeControlOn(width, by))
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back or down before the last save.
      touch.end()
      settle()
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
      <canvas ref={canvasRef} aria-label={dressForWeatherManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const dressForWeatherCartridge: Cartridge = {
  manifest: dressForWeatherManifest,
  Mount,
}
