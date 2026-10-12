// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { legalised } from './ground'
import { BACKDROP } from './config'
import type { Point } from './input'
import { natureWalkManifest } from './manifest'
import { Overlay } from './overlay'
import { ENDS, Play } from './play'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { deserialize, serialize, type Saved } from './save'
import { SaveCadence } from './saveCadence'
import { Bus } from './sound'
import { createToy, savedOf } from './toy'
import { View } from './view'

// The Mount. Around the view and the model it wires the saved state,
// attention, the attended clock, sound from the first touch, adaptive
// quality, the grown-up performance handle and the grown-up overlay.
// It decides nothing about the game. Every pointer event, every frame's step
// and every put-away goes to `Play` (play.ts), which holds the contact rules
// and the idle ladder and moves the model's one clock; what is seen is drawn
// from that clock, and what is heard is what the model asked for at it, sent
// out through the two gains of sound.ts. The Mount makes no sound of its own.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), clock = new AttendedClock(), play = new Play(new Bus(audio))
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
    let state: Saved | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const g = canvas.getContext('2d')!
    // Every cut piece is painted once into a small canvas of its own and stamped from there.
    const view = new View((w, h) => {
      const sheet = document.createElement('canvas')
      sheet.width = w; sheet.height = h
      return { image: sheet, g: sheet.getContext('2d')! }
    })
    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A game whose saved state is more than `state.ts` holds wraps it in a module of its own, as the header of
    // state.ts describes, and `serialize` and `deserialize` here become the wrapper's.
    const cadence = new SaveCadence(() => { if (state && play.toy) ctxRef.current.storage.save(serialize({ ...state, ...savedOf(play.toy) })) })
    // Whatever the game saves changes on single touches (a cover, a thing set down, the year), so each is saved at once.
    const keep = () => { if (play.toy?.dirty) { play.toy.dirty = false; cadence.change(performance.now(), true) } }

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    // The tier's grain and dust reach the view with each draw; the pieces are painted again when the grain changes.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read. So it has a case with no state (the bare backdrop of the look),
    // and it returns early while the surface has no size, which a parked surface has when the slot comes back.
    // A canvas 2D game takes `canvas.getContext('2d')` once, above, and makes one fit from the surface's size in
    // CSS pixels: `fit(width, height)` (stage.ts). Touches go through `toStage` with that fit, and the draw sets
    // its transform to the pixel ratio times that fit:
    // `setTransform(dpr * scale, 0, 0, dpr * scale, dpr * x, dpr * y)`. The fit is never made from
    // `canvas.width` and `canvas.height`, which are that size times the pixel ratio: every touch would then
    // land off by the ratio on a tablet, and right on a display of ratio 1.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      drawn.drawCalls = view.draw(g, width, height, dpr, { toy: play.toy, guidance: play.guidance, tier: governor.settings })
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
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // The pointer events, handed on as they come. The points are in the surface's CSS pixels; `Play` turns each
    // into stage units with the one fit made from `width` and `height`. Whatever a touch sets off is played
    // inside its handler, so the first sound of a visit falls inside the touch, where audio.ts holds it for the unlock.
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    // The contacts the overlay's gesture may follow: the grown-up's corner is not the game's, so it has its own.
    let grownUp: number | null = null
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      const works = play.down(event.pointerId, where, width, height)
      if (works || grownUp === null) { grownUp = event.pointerId; overlay.press(where.x, where.y, width, event.timeStamp) }
      keep()
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      if (grownUp === event.pointerId) overlay.move(where.x, where.y, width)
      play.move(event.pointerId, where, width, height)
      keep()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (grownUp === event.pointerId) { overlay.lift(where.x, where.y, width, event.timeStamp); grownUp = null }
      play.up(event.pointerId)
      keep()
      audio.touchUp()
    }
    // The browser took the finger away, or the surface lost its capture of it, which is not the child letting
    // go: the thing in the hand goes back. A capture is also lost after every ordinary lift, when the contact is
    // no longer anyone's: then there is nothing to put back and no touch to end.
    const onCancel = (event: PointerEvent) => {
      if (grownUp === event.pointerId) { overlay.forget(); grownUp = null }
      const worked = play.cancel(event.pointerId)
      keep()
      if (worked || event.type === 'pointercancel') audio.touchUp()
    }
    const ends = (Object.keys(ENDS) as (keyof typeof ENDS)[]).map((name) => ({ name, handle: ENDS[name] === 'up' ? onUp : onCancel }))
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    for (const end of ends) root.addEventListener(end.name, end.handle)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // Advances the attended clock. It returns the step to play, in seconds: the rules, a scene and every animation advance by it.
      const seconds = clock.advance(now)
      const start = performance.now()
      // The model's clock moves by the frame's step; what falls due on it is heard in this frame, and the idle
      // ladder is read at the new moment.
      play.step(seconds)
      keep()
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

    // Everything stops while unattended or hidden: the loop, the clock and sound. The game settles as a load
    // would find it (`park`): a scene is at its end, a thing a finger was still carrying is back where it came
    // from, a thing that hung where it was let go is set down there, and all sound is closed. Then the newest
    // state is handed to storage, and the settled game is drawn, since no frame is coming.
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
      grownUp = null
      play.park()
      keep()
      cadence.settle(performance.now())
      draw()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      state = deserialize(value, ctxRef.current.childAge)
      // The toy is set up as it was left: every cover where it stood, nothing easing in, nothing replayed.
      // `seed=<n>` in the address pins its chance, so a still can be taken again.
      // A save is untrusted: every point it holds is put where the game itself would have put a thing (ground.ts).
      play.load(createToy(legalised(state), seedOf(window.location.search)))
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the game settles first, so the thing in hand is back or down before the last save.
      play.park()
      keep()
      cadence.settle(performance.now())
      cancelAnimationFrame(frame)
      observer.disconnect()
      attention.dispose()
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      for (const end of ends) root.removeEventListener(end.name, end.handle)
      uninstallPerf()
      overlay.dispose()
      audio.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={natureWalkManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const natureWalkCartridge: Cartridge = {
  manifest: natureWalkManifest,
  Mount,
}
