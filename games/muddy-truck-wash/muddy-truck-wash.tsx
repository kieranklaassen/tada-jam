// template: cartridge/game.tsx v1
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { muddyTruckWashManifest } from './manifest'
import { TruckMotion } from './motion'
import { arrive } from './mud'
import { Play, type Target } from './play'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { silhouette } from './silhouette'
import { voiced } from './sound'
import { fireEngine } from './fireEngine'
import { LAYOUT } from './props'
import { deserialize, serialize, type GameState } from './state'
import { tipper } from './tipper'
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
    view.setTier(governor.settings)
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...view.counts }))
    // The toy: one muddy vehicle in the bay with a fixed seed, the three tools, and another vehicle at the door.
    const play = new Play({ def: tipper, surface: arrive(silhouette(tipper), 'dried-patches', 20261003), motion: new TruckMotion(tipper.moves, tipper.wheels.map((wheel) => wheel.x), 11) })
    const waiting = { def: fireEngine, surface: arrive(silhouette(fireEngine), 'fresh-splashes', 77), motion: new TruckMotion(fireEngine.moves, fireEngine.wheels.map((wheel) => wheel.x), 23) }
    waiting.motion.homeX = LAYOUT.door.x
    waiting.motion.homeZ = LAYOUT.door.z
    const poses = new Map([[tipper.id, play.bay.motion.pose], [fireEngine.id, waiting.motion.pose]])
    view.show([tipper.id, fireEngine.id])
    view.setSurface(fireEngine.id, waiting.surface, true)
    view.setSurface(tipper.id, play.bay.surface, true)
    let shown = play.bay.surface
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
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What a finger is on, from where it is on the surface.
    const targetAt = (at: Point): Target => {
      const bay = play.bay
      return view.picker.pick(at.x, at.y, width, height, { def: bay.def, x: bay.motion.homeX, z: bay.motion.homeZ, surface: bay.surface }, { def: waiting.def, x: waiting.motion.homeX, z: waiting.motion.homeZ, surface: waiting.surface })
    }
    // How fast the finger travels over the vehicle, in its units a second, smoothed over a few moves.
    let last: { x: number; y: number; at: number } | null = null, speed = 0
    // What the game does with a gesture. The answer starts on the press, when the finger lands, never on the lift.
    const act = (gestures: Gesture[]) => {
      for (const gesture of gestures) {
        if (gesture.type === 'press') {
          last = null
          speed = 0
          play.press(targetAt(gesture.at))
        } else if (gesture.type === 'dragMove') {
          const target = targetAt(gesture.at)
          if (target.kind === 'truck') {
            const now = clock.seconds
            if (last && now > last.at) speed += (Math.hypot(target.x - last.x, target.y - last.y) / (now - last.at) - speed) * 0.4
            if (!last || now > last.at) last = { x: target.x, y: target.y, at: now }
          } else last = null
          play.drag(target, speed)
        } else if (gesture.type !== 'dragStart') {
          // A tap's lift, a lift mid-rub, the end of a rub, or a press taken away: the tool stays in hand where it was let go.
          play.release()
        }
      }
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
      play.step(dt)
      waiting.motion.step(dt)
      for (const sound of play.sounds) audio.play(voiced(sound.spec, sound.gain))
      play.sounds.length = 0
      for (const mark of play.marks) view.stage.marks.land(mark)
      play.marks.length = 0
      if (play.bay.surface !== shown) {
        shown = play.bay.surface
        view.setSurface(play.bay.def.id, shown)
      }
      view.update(dt, clock.seconds, poses, play.particles, play.hand, play.tool)
      // A tier change is applied ahead of the draw: the pixel ratio now, and whatever else the game's tiers set.
      // The interval just measured belongs to the frame before, so it is judged with that frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      // A tier sets more than the pixel ratio, and on a display of ratio 1 the ratio never changes: apply the rest here.
      if (stepped) view.setTier(governor.settings)
      const sized = stepped && resize()
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
