// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import type { Point } from './input'
import { blobDashManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { Play } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { deserialize, serialize, type Save } from './save'
import { SaveCadence } from './saveCadence'
import { View } from './view'

// The Mount. It wires one visit's play (play.ts: the loop of toy.ts, the
// fingers on it, the idle ladder and its sounds) and its view (view.ts) to
// what a game needs around them: the saved state, attention, the attended
// clock, the pointers, sound from the first touch, adaptive quality, the
// grown-up performance handle and the grown-up overlay. The rules about
// touches, scenes and put-aways are in play.ts, where the tests hold them.

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
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    // The wall and every sprite are painted when the surface is sized; a frame only stamps them.
    const view = new View(canvas, (w, h) => {
      const made = document.createElement('canvas')
      made.width = w
      made.height = h
      return made
    })
    // What the slot held, and the play made from it. Both are null until the slot has been read.
    let saved: Save | null = null, play: Play | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // What is saved is the loop as built: the tempo, the springs and the pieces. The run is a view of it and is
    // not saved.
    const cadence = new SaveCadence(() => { if (saved && play) ctxRef.current.storage.save(serialize({ ...saved, ...play.toy.toSave() })) })
    // Whatever the loop changed is handed to storage where it changed it: a spring laid, a piece set down or the
    // dial under a finger at the throttle; a clear-out or a dial let go at once.
    const keep = () => {
      if (!play || play.toy.changed === 0) return
      cadence.change(performance.now(), play.toy.changed === 2)
      play.toy.changed = 0
    }
    // Everything a touch or a frame set off is played as one voice, in that touch or that frame: the picture
    // and the sound are on one clock. Then what it changed is handed to storage.
    const answer = () => {
      if (!play) return
      const voice = play.voice()
      if (voice) audio.play(voice)
      keep()
    }

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read. So it has a case with no state (the bare backdrop of the look),
    // and it returns early while the surface has no size, which a parked surface has when the slot comes back.
    // It reads the idle guidance from the play.
    // A canvas 2D game takes `canvas.getContext('2d')` once, above, and makes one fit from the surface's size in
    // CSS pixels: here `frame(width, height)` (layout.ts), which is the plain `fit` of stage.ts on a tablet and sets
    // the stage smaller and lower on a short wide surface, so the jam's home control clears the top of the track.
    // The view makes it when it is sized. Touches go through `toStage` with that fit, and the draw sets
    // its transform to the pixel ratio times that fit:
    // `setTransform(dpr * scale, 0, 0, dpr * scale, dpr * x, dpr * y)`. The fit is never made from
    // `canvas.width` and `canvas.height`, which are that size times the pixel ratio: every touch would then
    // land off by the ratio on a tablet, and right on a display of ratio 1.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      const made = view.draw(play ? play.toy : null, play ? play.guidance : null)
      // A canvas 2D frame has no draw calls: what it reports as such is every sprite it stamped, every live
      // stroke and fill, and every draw it made into the set, which is what the frame-budget test counts.
      drawn.drawCalls = made.stamps + made.strokes + made.layer
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
      play?.size(view.fit, w, h)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // The pointers. What each does to the loop is in play.ts; a pointer play.ts calls the grown-up's goes to the
    // overlay and to nothing else. The points are in the surface's CSS pixels.
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake || !play) return
      const where = at(event)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
      if (play.down(event.pointerId, where, event.timeStamp, clock.seconds)) {
        overlay.press(where.x, where.y, width, event.timeStamp)
        return
      }
      audio.touchDown()
      answer()
    }
    const onMove = (event: PointerEvent) => {
      if (!play) return
      const where = at(event)
      // A hold in the grown-up's corner stays there: the finger leaving it starts that gesture again.
      if (play.move(event.pointerId, where)) overlay.move(where.x, where.y, width)
      else answer()
    }
    const onUp = (event: PointerEvent) => {
      if (!play) return
      const where = at(event)
      if (play.up(event.pointerId, where, event.timeStamp)) {
        overlay.lift(where.x, where.y, width, event.timeStamp)
        return
      }
      answer()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (!play) return
      if (play.cancel(event.pointerId)) {
        overlay.forget()
        return
      }
      answer()
      audio.touchUp()
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // Advances the attended clock. It returns the step to play, in seconds: the loop, a scene and every
      // animation advance by it.
      const step = clock.advance(now)
      const start = performance.now()
      // The loop runs by the step, and what it set off sounds in this frame.
      if (play) {
        play.frame(now, step, clock.seconds)
        answer()
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

    // Everything stops while unattended or hidden: the loop, the clock and sound. Going to rest is a put-away:
    // the touch in progress ends as a finger taken away ends it, the loop becomes what a load would find, the
    // idle ladder goes back to the bottom and every sound is closed (`rest` in play.ts). Then the newest state
    // is handed to storage, and the surface is drawn once as it will be found.
    const settle = () => {
      overlay.forget()
      if (play) {
        play.rest(clock.seconds)
        keep()
      }
      cadence.settle(performance.now())
    }
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      settle()
      draw()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved tempo wins; `childAge` only chooses the tempo a first visit starts at.
      saved = deserialize(value, ctxRef.current.childAge)
      // The loop as it was left: its springs and pieces stand where they were laid, the blob starts its lap, and
      // nothing eases in, replays or sounds. `seed=<n>` in the address pins the loop's chance, so a still can be
      // taken again.
      play = new Play({ tempo: saved.tempo, springs: saved.springs, pieces: saved.pieces }, seedOf(window.location.search), clock.seconds)
      play.size(view.fit, width, height)
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the bare wall.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back before the last save.
      settle()
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
      <canvas ref={canvasRef} aria-label={blobDashManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const blobDashCartridge: Cartridge = {
  manifest: blobDashManifest,
  Mount,
}
