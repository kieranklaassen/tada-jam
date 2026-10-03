// template: cartridge/game.tsx v1
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { ROSTER } from './cycle'
import { emptyHint, hintFor } from './guide'
import { IdleLadder } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { muddyTruckWashManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { Play, type Target } from './play'
import type { TruckPose } from './pose'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import type { VehicleId } from './roster'
import { SaveCadence } from './saveCadence'
import { voiced } from './sound'
import type { Surface } from './surface'
import { WashView } from './view/washView'
import { deserializeWash, serializeWash } from './washState'

// The Mount: the template's wiring (the saved state, attention, the attended
// clock, touch, sound from the first touch, the idle ladder, adaptive quality
// and the grown-up performance handle) around the game's own three parts.
// `Play` is the game with no browser in it, `WashView` draws what it holds,
// and this file passes touches in and sounds, saves and frames out.

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
    const view = new WashView(canvas, ROSTER)
    // Grown-ups only: three taps in the top right corner, or fps=1 in the address.
    const overlay = new Overlay(root, window.location.search)
    view.setTier(governor.settings)
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...view.counts }))
    // The game itself, once the slot has been read. Until then the bay stands empty.
    let play: Play | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const poses = new Map<VehicleId, TruckPose>(), shown = new Map<VehicleId, Surface>(), hint = emptyHint()

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    const cadence = new SaveCadence(() => { if (play) ctxRef.current.storage.save(serializeWash(play.state)) })

    // Shows the vehicles that are on stage, each with what is on it. `instant` skips the easing of a surface, as on load.
    const stage = (game: Play, instant: boolean): void => {
      const on = game.onStage
      poses.clear()
      for (const who of on) {
        poses.set(who.def.id, who.motion.pose)
        if (shown.get(who.def.id) !== who.surface) {
          shown.set(who.def.id, who.surface)
          view.setSurface(who.def.id, who.surface, instant || !view.isShown(who.def.id))
        }
      }
      view.show(on.map((who) => who.def.id))
    }

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

    // Hands a change to storage: at once when a scene's outcome has just been set, otherwise at the throttle.
    const save = (game: Play): void => {
      if (!game.dirty) return
      cadence.change(performance.now(), game.urgent)
      game.dirty = false
      game.urgent = false
    }
    // What a finger is on, from where it is on the surface.
    const targetAt = (game: Play, at: Point): Target => {
      const { bay, next } = game
      return view.picker.pick(at.x, at.y, width, height, { def: bay.def, x: bay.motion.homeX, z: bay.motion.homeZ, surface: bay.surface }, { def: next.def, x: next.motion.homeX, z: next.motion.homeZ, surface: next.surface })
    }
    // How fast the finger travels over the vehicle, in its units a second, smoothed over a few moves.
    let last: { x: number; y: number; at: number } | null = null, speed = 0
    // What the game does with a gesture. The answer starts on the press, when the finger lands, never on the lift.
    const act = (gestures: Gesture[]) => {
      const game = play
      if (!game) return
      for (const gesture of gestures) {
        if (gesture.type === 'press') {
          last = null
          speed = 0
          game.press(targetAt(game, gesture.at))
        } else if (gesture.type === 'dragMove') {
          const target = targetAt(game, gesture.at)
          if (target.kind === 'truck') {
            const now = clock.seconds
            if (last && now > last.at) speed += (Math.hypot(target.x - last.x, target.y - last.y) / (now - last.at) - speed) * 0.4
            if (!last || now > last.at) last = { x: target.x, y: target.y, at: now }
          } else last = null
          game.drag(target, speed)
        } else if (gesture.type !== 'dragStart') {
          // A tap's lift, a lift mid-rub, the end of a rub, or a press taken away: the tool stays in hand where it was let go.
          game.release()
        }
      }
      save(game)
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
      overlay.press(where.x, where.y, width, event.timeStamp)
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
      // A scene playing is not idleness either.
      if (play?.sceneRunning) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      const guidance = ladder.update(clock.seconds)
      // The game steps its rules here.
      const game = play
      if (game) {
        game.step(dt)
        for (const sound of game.sounds) audio.play(voiced(sound.spec, sound.gain))
        game.sounds.length = 0
        for (const mark of game.marks) view.stage.marks.land(mark)
        game.marks.length = 0
        stage(game, false)
        view.update(dt, clock.seconds, poses, game.particles, game.hand, game.tool, hintFor(game, guidance, hint))
        save(game)
      }
      // A tier change is applied ahead of the draw: the pixel ratio now, and whatever else the game's tiers set.
      // The interval just measured belongs to the frame before, so it is judged with that frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      // A tier sets more than the pixel ratio, and on a display of ratio 1 the ratio never changes: apply the rest here.
      if (stepped) view.setTier(governor.settings)
      const sized = stepped && resize()
      if (!sized) draw()
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, view.counts.drawCalls, view.counts.triangles)
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
      const game = new Play(deserializeWash(value, ctxRef.current.childAge))
      play = game
      // Found as left: the vehicles stand as the save has them, with no easing in and no scene.
      stage(game, true)
      view.update(0, clock.seconds, poses, game.particles, game.hand, game.tool, hint)
      draw()
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
      overlay.dispose()
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
