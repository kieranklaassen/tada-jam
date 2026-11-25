// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf, type Note } from './audio'
import { BACKDROP, TIERS } from './config'
import { IdleLadder, type Guidance } from './guidance'
import type { Point } from './input'
import { wrapTheCatManifest } from './manifest'
import { freshWorld, quiet, tiedTo, type World } from './model'
import { Overlay } from './overlay'
import { surface } from './crepe'
import { installJamPerf } from './perf'
import { Play } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { fit, toStage, type Fit } from './stage'
import { deserialize, serialize } from './state'
import { View } from './view'
import { voiceOfEvent, voiceOfPoke } from './voices'

// The Mount: the surface, attention, the attended clock, sound, quality and the
// save around the rules (model.ts, through play.ts) and the drawing (view.ts).

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
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let play: Play | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0, turn = 0, painted = ''
    let by: Fit = fit(0, 0)
    const pen = canvas.getContext('2d')!
    const view = new View()
    const bare: World = freshWorld()
    let guidance: Guidance | null = null

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    const cadence = new SaveCadence(() => { if (play) ctxRef.current.storage.save(serialize(play.world)) })

    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    const draw = () => {
      if (width <= 0) return
      const scale = dpr * by.scale
      // The still room and the sprites are painted once for a size of the surface. A tier changes only the surface
      // they are drawn to, so a change of tier paints nothing.
      const full = Math.min(window.devicePixelRatio || 1, TIERS[0].dpr), key = `${width} ${height} ${full}`
      if (key !== painted) {
        painted = key
        view.sized(surface.make, full * by.scale, -by.x / by.scale, -by.y / by.scale, width / by.scale, height / by.scale)
      }
      pen.setTransform(scale, 0, 0, scale, dpr * by.x, dpr * by.y)
      view.draw(pen, play?.world ?? bare, play, guidance)
      drawn.drawCalls = view.stamps.stamped
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
      by = fit(w, h)
      // Sizing the backing store wipes the surface, so it is redrawn at once: a resize lands after the frame's
      // own draw, or while the game rests and no frame is coming, and either would leave the surface blank.
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What happened, shown and heard. Everything one touch sets off is one voice, so that the first touch of a
    // visit is heard whole when the browser lets sound start.
    const tell = () => {
      if (!play) return
      const notes: Note[] = []
      for (const p of play.pokes.splice(0)) { view.poke(p); notes.push(...voiceOfPoke(p, turn++)) }
      let whole = false
      const events = play.world.events.splice(0)
      // A quick circle lays many wedges in one move: the last few are heard, and everything else is.
      const lays = events.filter((e) => e.type === 'lay').slice(-5)
      for (const e of events) {
        view.notice(e, play.world)
        if (e.type === 'lay' && !lays.includes(e)) continue
        if (e.type !== 'lay' && e.type !== 'stir' && e.type !== 'tear') whole = true
        notes.push(...voiceOfEvent(e, turn++, e.type === 'tear' ? tiedTo(play.world, e.id) : null))
      }
      for (const s of view.sounds.splice(0)) notes.push(...s)
      if (notes.length) audio.play(voiceOf(notes))
      if (play.changed) { play.changed = false; cadence.change(performance.now(), whole) }
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
      if (play) {
        play.down(event.pointerId, toStage(where, by), event.timeStamp)
        // Only the working finger counts towards the grown-up's gesture.
        if (play.touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
        tell()
      }
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      if (play?.touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      play?.move(event.pointerId, toStage(where, by), event.timeStamp)
      tell()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (play?.touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      play?.up(event.pointerId, toStage(where, by), event.timeStamp)
      tell()
      // What a drag had still to hand over.
      cadence.settle(performance.now())
      audio.touchUp()
    }
    // The browser took the finger away, which loses nothing: what it laid or tore is laid or torn.
    const onCancel = (event: PointerEvent) => {
      if (play?.touch.holds(event.pointerId)) overlay.forget()
      play?.cancel(event.pointerId)
      tell()
      audio.touchUp()
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      frame = requestAnimationFrame(loop)
      // Advances the attended clock. It returns the step to play, in seconds: the rules, a scene and every animation advance by it.
      const step = clock.advance(now)
      const start = performance.now()
      if (play) {
        play.advance(step)
        view.advance(play.world, play, step)
        tell()
        // A finger at work, or somebody on the move, is not idleness.
        if (play.touch.active || !quiet(play.world)) ladder.touch(clock.seconds)
      }
      guidance = ladder.update(clock.seconds)
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is
    // ended, since its lift will never arrive; what it has laid or torn stays.
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
      play?.clear()
      tell()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      play = new Play(deserialize(value))
      // A game that is resting or parked when the slot comes back has no frame coming.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, then the last save.
      play?.clear()
      tell()
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
      <canvas ref={canvasRef} aria-label={wrapTheCatManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const wrapTheCatCartridge: Cartridge = {
  manifest: wrapTheCatManifest,
  Mount,
}
