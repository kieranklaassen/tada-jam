// template: cartridge/game.tsx v1
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, tick } from './audio'
import { BACKDROP } from './config'
import { IdleLadder } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { muddyTruckWashManifest } from './manifest'
import { arrive } from './mud'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { silhouette } from './silhouette'
import { fireEngine } from './fireEngine'
import { LAYOUT } from './props'
import { deserialize, serialize, type GameState } from './state'
import { tipper } from './tipper'
import { restPose } from './view/truck'
import { WashView } from './view/washView'

// The Mount, showing a blank surface. Everything a game needs around its
// renderer is wired and running: the saved state, attention, the attended
// clock, touch, sound from the first touch, the idle ladder, adaptive quality
// and the grown-up performance handle. The renderer, the rules and the sounds
// go in where the comments say.

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
    // A canvas 2D game reports the sprites and figures it drew as drawCalls; a three.js game reports the renderer's own counts.
    const view = new WashView(canvas, [tipper, fireEngine])
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...view.counts }))
    // The look spike: the game's real scene with a fixed seed, before any play.
    const pose = restPose(), waiting = { ...restPose(), x: LAYOUT.door.x, z: LAYOUT.door.z }
    const poses = new Map([[tipper.id, pose], [fireEngine.id, waiting]])
    view.show([tipper.id, fireEngine.id])
    view.setSurface(fireEngine.id, arrive(silhouette(fireEngine), 'fresh-splashes', 77), true)
    view.setSurface(tipper.id, arrive(silhouette(tipper), 'dried-patches', 20261003), true)
    let state: GameState | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    const cadence = new SaveCadence(() => { if (state) ctxRef.current.storage.save(serialize(state)) })

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame
    // and `resize` calls it after sizing, which can be before the slot is read and while the game rests.
    const draw = () => view.render()

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
      view.setTier(governor.settings)
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The blank surface only answers a touch with a sound.
    const act = (gestures: Gesture[]) => {
      for (const gesture of gestures) if (gesture.type === 'press') audio.play(tick)
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      ladder.touch(clock.seconds)
      act(touch.down(event.pointerId, at(event), event.timeStamp))
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
      const dt = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      if (touch.active) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      ladder.update(clock.seconds)
      // The game steps its rules here.
      pose.lift = Math.sin(clock.seconds * 1.7) * 0.012
      view.update(dt, poses)
      // A tier change is applied ahead of the draw: the pixel ratio now, and whatever else the game's tiers set.
      // The interval just measured belongs to the frame before, so it is judged with that frame's work.
      const sized = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork) && resize()
      if (!sized) draw()
      lastWork = performance.now() - start
      work.push(lastWork)
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
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      state = deserialize(value, ctxRef.current.childAge)
    })
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is put down before the last save.
      act(touch.clear())
      cadence.settle(performance.now())
      cancelAnimationFrame(frame)
      observer.disconnect()
      attention.dispose()
      root.removeEventListener('pointerdown', onDown)
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerup', onUp)
      root.removeEventListener('pointercancel', onCancel)
      uninstallPerf()
      view.dispose()
      audio.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={muddyTruckWashManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const muddyTruckWashCartridge: Cartridge = {
  manifest: muddyTruckWashManifest,
  Mount,
}
