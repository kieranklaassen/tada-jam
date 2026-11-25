// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf as joined, type Note } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import type { Point } from './layout'
import { rollItAllUpManifest } from './manifest'
import { freshWorld, quiet, type World } from './world'
import { Overlay } from './overlay'
import { surface } from './paint'
import { installJamPerf } from './perf'
import { Play } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { fit, toStage, type Fit } from './stage'
import { deserialize, serialize } from './state'
import { View } from './view'
import { crunch, voiceOf } from './voices'

// The Mount: the surface, attention, the attended clock, sound, quality and the
// save around the rules (world.ts, through play.ts) and the drawing (view.ts).

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
    let play: Play | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0, turn = 0, rolled = 0, painted = ''
    let by: Fit = fit(0, 0)
    const pen = canvas.getContext('2d')!
    const view = new View()
    const bare: World = freshWorld()
    let guidance: Guidance | null = null, idleFrom = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    const cadence = new SaveCadence(() => { if (play) ctxRef.current.storage.save(serialize(play.world)) })

    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
    }

    const draw = () => {
      if (width <= 0) return
      const scale = dpr * by.scale
      // The still room is painted once for a size of the surface.
      const key = `${width} ${height} ${dpr}`
      if (key !== painted) {
        painted = key
        view.sized(surface.make, scale, -by.x / by.scale, -by.y / by.scale, width / by.scale, height / by.scale)
      }
      pen.setTransform(scale, 0, 0, scale, dpr * by.x, dpr * by.y)
      view.draw(pen, play?.world ?? bare, play?.robin ?? -1, guidance)
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
      for (const e of play.world.events.splice(0)) {
        if (e.type === 'crunch') {
          rolled += e.amount
          if (rolled > 46) { rolled = 0; notes.push(...crunch(play.world.ball?.r ?? 60, turn++)) }
          continue
        }
        view.notice(e, play.at)
        notes.push(...voiceOf(e, turn++))
      }
      for (const s of view.sounds.splice(0)) notes.push(...s)
      if (notes.length) audio.play(joined(notes))
      if (play.changed) { play.changed = false; cadence.change(performance.now(), true) }
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      ladder.touch(clock.seconds)
      idleFrom = clock.seconds
      const where = at(event)
      if (play) {
        play.down(event.pointerId, toStage(where, by))
        // Only the working finger counts towards the grown-up's gesture.
        if (play.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
        tell()
      }
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      if (play?.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      play?.move(event.pointerId, toStage(where, by))
      tell()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (play?.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      play?.up(event.pointerId)
      tell()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: the ball stops.
    const onCancel = (event: PointerEvent) => {
      if (play?.holds(event.pointerId)) overlay.forget()
      if (play?.holds(event.pointerId)) play.clear()
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
      // Advances the attended clock. It returns the step to play, in seconds: the rules, a scene and every animation advance by it.
      const step = clock.advance(now)
      const start = performance.now()
      if (play) {
        play.advance(step)
        // The whole round is shown once, when a first visit has had a moment without a touch.
        if (!play.world.shown && clock.seconds - idleFrom > 1.5) play.showRound()
        view.advance(play.world, play.at, play.robin, step)
        tell()
        // A finger at work, a thing under way and the robin's round are not idleness.
        if (play.active || !quiet(play.world)) idleFrom = clock.seconds
        if (play.active || !quiet(play.world) || play.robin >= 0) ladder.touch(clock.seconds)
      }
      guidance = ladder.update(clock.seconds)
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is ended,
    // since its lift will never arrive, and the newest state is handed to storage.
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
      play?.rest()
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
      // As on going to rest: the touch ends first, so the ball lies still before the last save.
      play?.rest()
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
      <canvas ref={canvasRef} aria-label={rollItAllUpManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const rollItAllUpCartridge: Cartridge = {
  manifest: rollItAllUpManifest,
  Mount,
}
