// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf, type Note } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { shesCopyingMeManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { Party } from './party'
import { seedOf } from './rng'
import { fit, toStage, type Point } from './stage'
import { deserialize, serialize } from './state'
import { View } from './view'
import { soundOf } from './voices'

// The Mount: the saved state, attention, the attended clock, fingers, sound
// from the first touch, the idle ladder, adaptive quality and the grown-up
// handles, wired round one tea party and its view.

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
    const g = canvas.getContext('2d', { alpha: false })
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    const view = new View(seedOf(window.location.search), (w, h) => {
      const sheet = document.createElement('canvas')
      sheet.width = w
      sheet.height = h
      return { canvas: sheet, g: sheet.getContext('2d')! }
    })
    let party: Party | null = null, guidance: Guidance | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    const cadence = new SaveCadence(() => { if (party) ctxRef.current.storage.save(serialize(party.state)) })

    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    const draw = () => {
      if (!g || width <= 0 || height <= 0) return
      view.draw(g, width, height, dpr, party, guidance)
      drawn.drawCalls = view.drawn
    }

    /** Plays and shows what just happened, and hands what changed to storage. */
    const answer = () => {
      if (!party) return
      const events = party.take()
      if (events.length) {
        view.hear(events, party)
        const notes: Note[] = events.flatMap(soundOf)
        if (notes.length) audio.play(voiceOf(notes))
      }
      if (party.dirty) {
        cadence.change(performance.now(), true)
        party.dirty = false
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
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      ladder.touch(clock.seconds)
      const where = at(event)
      // The grown-up's corner is bare: it answers as the wall does.
      party?.down(event.pointerId, toStage(where, fit(width, height)), inCorner(where.x, where.y, width))
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (party?.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      answer()
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      // A hold in the grown-up's corner stays there: the working finger leaving it starts that gesture again.
      if (party?.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      party?.move(event.pointerId, toStage(where, fit(width, height)))
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (party?.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      party?.up(event.pointerId, toStage(where, fit(width, height)))
      answer()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (party?.holds(event.pointerId)) overlay.forget()
      party?.cancel(event.pointerId)
      answer()
      audio.touchUp()
    }
    const onLost = (event: PointerEvent) => { if (party?.holds(event.pointerId)) onCancel(event) }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('lostpointercapture', onLost)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      const step = clock.advance(now)
      const start = performance.now()
      // A hand at work, a copy on its way and a scene are not idleness.
      if (party && (party.touching || party.scene || party.hands[0].busy || party.hands[1].busy)) ladder.touch(clock.seconds)
      guidance = ladder.update(clock.seconds)
      if (party) {
        party.step(step)
        answer()
        view.step(step)
      }
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
      party?.clear()
      view.bits.clear()
      answer()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      party = new Party(deserialize(value, ctxRef.current.childAge))
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back or down before the last save.
      party?.clear()
      view.bits.clear()
      answer()
      cadence.settle(performance.now())
      cancelAnimationFrame(frame)
      observer.disconnect()
      attention.dispose()
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('lostpointercapture', onLost)
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
      <canvas ref={canvasRef} aria-label={shesCopyingMeManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const shesCopyingMeCartridge: Cartridge = {
  manifest: shesCopyingMeManifest,
  Mount,
}
