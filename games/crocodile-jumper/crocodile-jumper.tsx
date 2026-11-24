// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { crocodileJumperManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { Play } from './play'
import { deserialize } from './save'
import type { Point } from './input'
import { toStage } from './stage'
import { ShopView } from './view'

// The Mount: the template's wiring round play.ts. Fingers go straight into the
// play in stage units, and what it heard and changed comes out after each.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), clock = new AttendedClock(), ladder = new IdleLadder(0)
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
    const view = new ShopView(canvas)
    let play: Play | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // What the loop hands the draw.
    const playing = { step: 0, guidance: null as Guidance | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    const cadence = new SaveCadence(() => { if (play) ctxRef.current.storage.save(play.saved()) })

    // The tier is marked on the canvas, where a probe can read it; the view reads its settings each draw.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    const draw = () => {
      if (width <= 0 || height <= 0) return
      view.draw(play, playing.guidance, governor.settings)
      drawn.drawCalls = view.tally
    }
    // What the play queued while it answered: played as one voice, so a first touch keeps all of it for the unlock.
    // Then whatever it changed is handed to storage, a scene's outcome at once.
    const settle = () => {
      if (!play) return
      if (play.heard.length > 0) {
        audio.play(voiceOf(play.heard))
        play.heard = []
      }
      if (play.changed) {
        cadence.change(performance.now(), play.urgent)
        play.changed = false
        play.urgent = false
      }
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
      // The view is told the new size and ratio before it draws, and bakes its pictures again at that density.
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    // One finger at a time may be making the grown-up's gesture: the one that landed first.
    let first: number | null = null
    const stage = (event: PointerEvent): Point => toStage(at(event), view.fit)
    const onDown = (event: PointerEvent) => {
      if (!attention.awake || play === null || view.fit.scale === 0) return
      audio.touchDown()
      ladder.touch(clock.seconds)
      const where = at(event)
      if (first === null) {
        first = event.pointerId
        overlay.press(where.x, where.y, width, event.timeStamp)
      }
      // Captured, so the lift is reported even when the finger has slid off the surface.
      try { root.setPointerCapture(event.pointerId) } catch { /* Gone already: its lift still arrives. */ }
      // The grown-up's corner answers nothing.
      if (inCorner(where.x, where.y, width)) return
      play.down(event.pointerId, stage(event), event.timeStamp)
      settle()
    }
    const onMove = (event: PointerEvent) => {
      if (play === null || view.fit.scale === 0) return
      const where = at(event)
      if (event.pointerId === first) overlay.move(where.x, where.y, width)
      play.move(event.pointerId, stage(event))
      settle()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (event.pointerId === first) { overlay.lift(where.x, where.y, width, event.timeStamp); first = null }
      if (play && view.fit.scale > 0) play.up(event.pointerId, stage(event), event.timeStamp)
      settle()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go. A lost capture is the same news when
    // no lift came first; after one the finger is already unknown.
    const onCancel = (event: PointerEvent) => {
      if (event.pointerId === first) { overlay.forget(); first = null }
      play?.cancel(event.pointerId)
      settle()
      if (event.type === 'pointercancel') audio.touchUp()
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)
    root.addEventListener('lostpointercapture', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // Advances the attended clock. It returns the step to play, in seconds: the rules, a scene and every animation advance by it.
      playing.step = clock.advance(now)
      const start = performance.now()
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (play?.busy) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      if (play) {
        play.advance(playing.step, now)
        settle()
      }
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
      first = null
      play?.clear()
      settle()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      play = new Play(deserialize(value, ctxRef.current.childAge)).settled()
      view.warm(play)
      // The game sets itself up from the state here, as it was left: nothing eases in and no scene replays.
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
      // The play as it is first drawn is written at once: a first visit put away before any touch opens on the same shop.
      settle()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back or down before the last save.
      first = null
      play?.clear()
      settle()
      cadence.settle(performance.now())
      cancelAnimationFrame(frame)
      observer.disconnect()
      attention.dispose()
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onCancel)
      root.removeEventListener('lostpointercapture', onCancel)
      uninstallPerf()
      overlay.dispose()
      audio.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={crocodileJumperManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const crocodileJumperCartridge: Cartridge = {
  manifest: crocodileJumperManifest,
  Mount,
}
