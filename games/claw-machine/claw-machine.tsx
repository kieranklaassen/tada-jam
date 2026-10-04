// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { aimAt, asideAt } from './aim'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import type { Game } from './game'
import { barePicture, gamePicture } from './gamePicture'
import { newGame } from './gameScenes'
import { shapeOf } from './gobblers'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { headTop } from './layout'
import { clawMachineManifest } from './manifest'
import { CORNER, Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { deserializeWorld, serializeWorld } from './save'
import { SaveCadence } from './saveCadence'
import { voice } from './sound'
import { Stage } from './view/stage'
import { voiceOf } from './voices'
import { newWorld } from './world'

// The Mount. Around the stage it wires the saved state, attention, the
// attended clock, touch, sound from the first touch, the idle ladder, adaptive
// quality, the grown-up performance handle and the grown-up overlay.

/** The most voices one frame starts: a busy moment is still a few sounds, not a wall of them. */
const VOICES_A_FRAME = 6
/** How long a finger has to stay off the glass before its lift is the drop: a finger that skips for less than this carries on. */
const DROPS_AFTER_MS = 125

/** `?seed=<n>` in the address lays the first crate out from that seed, so a still can be taken again. */
function seedFrom(search: string): number | null {
  const value = new URLSearchParams(search).get('seed')
  return value !== null && /^\d{1,9}$/.test(value) ? Number(value) : null
}

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
    // Grown-ups only: three quick taps in the top right corner, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    const stage = new Stage(canvas)
    // The game is built when the saved state has been read, and not before.
    let game: Game | null = null
    // What the idle ladder last said, and whether the drop of this drag has been made.
    let guidance: Guidance | null = null, dropped = false, poked = false
    // When the finger of a drag left the glass, by the loop's clock, or -1: the drop that lift stands for is still to be made.
    let liftedAt = -1
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    const cadence = new SaveCadence(() => { if (game) ctxRef.current.storage.save(serializeWorld(game.world)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has
    // been read.
    const draw = () => {
      if (width <= 0) return
      // Before the saved state has been read there is the bare cabinet, in the look.
      const counts = stage.draw(game ? gamePicture(game, guidance) : barePicture())
      drawn.drawCalls = counts.drawCalls; drawn.triangles = counts.triangles
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
      stage.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The blank surface only answers a touch with a sound.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    // A finger on the glass points at the first thing on its line of sight, and the claw goes there.
    /** The crew as a finger sees it: where each gobbler stands, how wide it is and how tall. */
    const standing = (playing: Game) => playing.crew.map((actor) => ({ x: actor.x, width: shapeOf(actor.id).width, height: headTop(actor.id) }))
    const aim = (at: Point, landing: boolean) => {
      if (!game) return
      game.point(aimAt(stage.ray(at.x / Math.max(1, width), at.y / Math.max(1, height)), standing(game), game.held >= 0), landing)
    }
    // What the game says happened is heard at once, and what it changed is handed to storage: the outcome of a
    // scene and the end of a cycle at once, a toy set down at the throttle.
    const hear = () => {
      if (!game) return
      let ticks = 0, voices = 0
      for (const event of game.takeEvents()) {
        // A fast run crosses several studs in one frame; one tick stands for them.
        if (event.type === 'tick' && ticks++ > 0) continue
        if (voices++ < VOICES_A_FRAME) audio.play(voice(voiceOf(event)))
      }
      if (game.save !== 'none') { cadence.change(performance.now(), game.save === 'now'); game.save = 'none' }
    }
    const act = (gestures: Gesture[]) => {
      if (!game) return
      for (const gesture of gestures) {
        // The claw answers when the finger lands: the jaws snap open and the trolley sets off. A landing also
        // ends a scene that is playing, and is then an ordinary touch.
        // A finger that lands on the watcher or on a lamp is that thing's: it answers, and the claw stays where it is
        // until the finger has left.
        if (gesture.type === 'press') {
          const apart = asideAt(stage.ray(gesture.at.x / Math.max(1, width), gesture.at.y / Math.max(1, height)), standing(game), game.held >= 0)
          if (apart) { if (apart.on === 'watcher') game.poke(); else game.light(apart.lamp); poked = true; continue }
        }
        if (poked) { if (gesture.type === 'tap' || gesture.type === 'dragEnd' || gesture.type === 'pressEnd') poked = false; continue }
        if (gesture.type === 'press') { aim(gesture.at, true); dropped = false }
        else if (gesture.type === 'tap') { aim(gesture.at, false); game.lift() }
        else if (gesture.type === 'dragMove') { aim(gesture.at, false); dropped = false; liftedAt = -1 }
        // Lifting is the drop, so it does not wait for the drag to be given up. But a finger that only skips off
        // the glass has not let go: the drop is made when the finger has stayed away for a moment (`loop`), and
        // a finger that is back before that carries on pointing. Its next lift drops again.
        else if (gesture.type === 'dragLift') liftedAt = performance.now()
        else if (gesture.type === 'dragEnd') { if (!dropped) game.lift(); dropped = false; liftedAt = -1 }
        else if (gesture.type === 'pressEnd') game.cancel()
      }
      // Heard inside the touch, where the first sound can be held for the audio to unlock.
      hear()
    }
    // A touch that is cut off (the game put away or closed under the finger) is ended and nothing is done with
    // it: the claw stays as it is, with whatever it holds. A lift that was already made stands.
    const endTouch = () => {
      if (touch.clear().length === 0) return
      game?.cancel()
      dropped = false; poked = false; liftedAt = -1
    }
    // Touches in the corner kept for the grown-up overlay are no part of the game: nothing answers them, so a
    // child is given no reason to tap there (the overlay's header asks for this).
    const aside = new Set<number>()
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      const where = at(event)
      // The overlay counts single fingers: a touch that lands while another finger is down (a flat hand) is no tap.
      if (aside.size === 0 && !touch.active) overlay.press(where.x, where.y, width, event.timeStamp)
      if (width > 0 && where.x >= width - CORNER && where.y <= CORNER) { aside.add(event.pointerId); return }
      audio.touchDown()
      ladder.touch(clock.seconds)
      act(touch.down(event.pointerId, where, event.timeStamp))
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)))
    const onUp = (event: PointerEvent) => {
      if (aside.delete(event.pointerId)) return
      act(touch.up(event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      if (aside.delete(event.pointerId)) return
      // The system took the finger away. That is no lift: the touch is ended and nothing is done with it.
      if (touch.cancel(event.pointerId, event.timeStamp).length > 0) { endTouch(); game?.cancel(); poked = false; hear() }
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
      act(touch.advance(now))
      // A finger that left the glass in a drag and has stayed away: that was the lift, and the claw drops.
      if (game && liftedAt >= 0 && now - liftedAt >= DROPS_AFTER_MS) { liftedAt = -1; game.lift(); dropped = true }
      // The game plays the step in fixed parts, and what happened in it is heard at once.
      if (game) { game.advance(step); hear() }
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (touch.active || game?.scene || (game && game.claw.phase !== 'ready')) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
      // The game steps its rules and its scene here, and hands what they changed to storage (`cadence`, above).
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
      // The touch is ended and nothing is done with it: the claw stays as it is, with whatever it holds, so that
      // putting the game away never makes a move the child did not make.
      endTouch()
      hear()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    // A read that fails is played as a first visit, but is not one: nothing is written over the slot for it.
    let unread = false
    ctxRef.current.storage.load<unknown>().catch(() => { unread = true; return null }).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts. A first visit lays its one
      // crate out from the seed in the address, or from a seed drawn for the visit.
      const childAge = ctxRef.current.childAge
      const world = value === null || value === undefined ? newWorld(childAge, seedFrom(window.location.search) ?? Math.floor(Math.random() * 0x7fffffff) + 1) : deserializeWorld(value, childAge)
      game = newGame(world)
      // A first visit is written down at once, so that the crate that waits is the same one however often the
      // game is closed and opened before the first move.
      if ((value === null || value === undefined) && !unread) { game.save = 'now'; hear() }
      // The game sets itself up from the state here, as it was left: nothing eases in and no scene replays.
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, and makes no move.
      endTouch()
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
      stage.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={clawMachineManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const clawMachineCartridge: Cartridge = {
  manifest: clawMachineManifest,
  Mount,
}
