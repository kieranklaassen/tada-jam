// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { BACKDROP } from './config'
import type { Guidance } from './guidance'
import type { Point } from './input'
import { icePalaceManifest } from './manifest'
import { Overlay } from './overlay'
import { Play } from './play'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { deserializeClearing, serializeClearing, type Saved } from './save'
import { seedOf } from './rng'
import { Toy } from './toy'
import { View } from './view'
import { notesOfAll } from './voices'

// The Mount. It shows the clearing as it was left (save.ts), played by the
// rules in toy.ts and drawn by view.ts. What a finger, a frame and a put-away
// do is in play.ts, which knows nothing of the browser; around it the Mount
// wires the saved state, attention, the attended clock, sound from the first
// touch, adaptive quality, the grown-up performance handle and the grown-up
// overlay.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), clock = new AttendedClock()
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. The count is what the view
    // counted: one for each stamp of a painted layer, each fill and each stroke (print.ts).
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    // The record as it was read, and the toy that plays it. Both are null until the slot has been read.
    let saved: Saved | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const g2d = canvas.getContext('2d')
    // The view paints its still layer and its fleck tiles on canvases of its own, made here.
    const view = new View((w, h) => {
      const layer = document.createElement('canvas')
      layer.width = w
      layer.height = h
      return layer
    })
    // What the loop hands the draw, as `drawn` is what the draw hands back. `guidance` is what the idle ladder
    // shows now, and null until the first frame: the loop keeps what `ladder.update` returns, so the glow and the
    // ghost hand reach the renderer without a second call. `step` is the seconds of play the frame advances, for
    // springs and whatever else the view eases by itself; it is 0 outside a frame, where `resize` and the load
    // draw the game as it stands.
    const playing = { step: 0, guidance: null as Guidance | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The toy says what a step changed, and the play hands it on at one of two speeds: a change that keeps
    // coming at most once per throttle window, and an outcome (a block cut, set down or sunk, the sun pulled
    // down) at once, since a put-away in the next moment must find it saved.
    // What is saved is the clearing at rest (`world` in toy.ts): a block in the hand is where it came from.
    const cadence = new SaveCadence(() => { if (saved && play.toy) ctxRef.current.storage.save(serializeClearing({ ...saved, ...play.toy.world() })) })
    // Everything one touch or one step sets off is one voice (`voiceOf` in audio.ts). What a scene sounds goes
    // through a gain of its own, which is cut in the frame a touch ends the scene; at rest every sound is cut.
    const play = new Play({
      speak: (sounds, scene) => audio.play(voiceOf(notesOfAll(sounds)), scene),
      hush: () => audio.hush(),
      save: (now) => cadence.change(performance.now(), now),
      settle: () => view.settle(),
    })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). Besides the pixel ratio a tier sets how many snowflakes drift, which the draw
    // reads from the governor, so there is nothing to switch here: the tier is marked on the canvas, where a
    // still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has
    // been read. So the view has a case with no toy (the still clearing alone), and the draw returns early while
    // the surface has no size, which a parked surface has when the slot comes back. It reads `playing` for the
    // frame's step and the idle guidance, and keeps the count the view hands back: stamps, fills and strokes.
    // The view makes one fit from the surface's size in CSS pixels (`fit` in stage.ts), as `act` does for a
    // touch. The fit is never made from `canvas.width` and `canvas.height`, which are that size times the pixel
    // ratio: every touch would then land off by the ratio on a tablet, and right on a display of ratio 1.
    const draw = () => {
      if (!g2d || width <= 0 || height <= 0) return
      drawn.drawCalls = view.paint(g2d, width, height, dpr, play.toy, playing.guidance, playing.step, governor.settings)
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
      play.width = w; play.height = h
      // Sizing the backing store wipes the surface, so it is redrawn at once: a resize lands after the frame's
      // own draw, or while the game rests and no frame is coming, and either would leave the surface blank.
      // A three.js game sizes through its renderer instead: `setPixelRatio(ratio)` and `setSize(w, h, false)`
      // take the place of these two assignments.
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // The points a pointer gives are in the surface's CSS pixels; the play turns each into stage units with the
    // one fit made from `width` and `height`. The toy queues its sounds as it answers and the play hands them
    // over inside the handler, so the first sound of a visit falls inside the touch, where audio.ts holds it
    // for the unlock. A touch in the grown-up's corner reaches nothing in the game (play.ts).
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      play.down(event.pointerId, where, event.timeStamp, clock.seconds)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (play.touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      // A hold in the grown-up's corner stays there: the working finger leaving it starts that gesture again.
      if (play.touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      play.move(event.pointerId, where)
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (play.touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      play.up(event.pointerId, where, event.timeStamp)
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (play.touch.holds(event.pointerId)) overlay.forget()
      play.cancel(event.pointerId)
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
      // The play ends a lift that has outlasted its grace, reads the idle ladder (a working finger is not idle,
      // nor is a scene that is playing) and lets the toy play the frame's step in its own fixed steps.
      playing.guidance = play.frame(now, playing.step, clock.seconds)
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

    // Everything stops while unattended or hidden: the loop, the clock and sound. The play comes to rest as a
    // load would find it: a touch in progress is ended, since its lift will never arrive, a scene lands every
    // beat, whatever is in the air is where the save has it, the idle ladder goes back to the bottom and every
    // sound is cut. Then the newest state is handed to storage, and the surface is drawn as it now stands.
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
      play.rest(clock.seconds)
      audio.setActive(false)
      cadence.settle(performance.now())
      playing.guidance = null
      draw()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      saved = deserializeClearing(value, ctxRef.current.childAge)
      // The toy's chance (which of a sound's variants) comes from one seed: `seed=<n>` in the address pins it.
      play.toy = new Toy(saved, seedOf(window.location.search))
      // The clearing is set up as it was left: nothing eases in and no scene replays.
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
      play.rest(clock.seconds)
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
      <canvas ref={canvasRef} aria-label={icePalaceManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const icePalaceCartridge: Cartridge = {
  manifest: icePalaceManifest,
  Mount,
}
