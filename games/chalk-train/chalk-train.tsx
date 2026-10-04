// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP, CYCLE_WIRED } from './config'
import { IdleLadder, handPose, type HandPose } from './guidance'
import { ForgivingTouch, TAP_SLOP, type Gesture, type Point } from './input'
import { chalkTrainManifest } from './manifest'
import { CORNER, Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { deserialize, serialize } from './save'
import { SaveCadence } from './saveCadence'
import { voiceOf } from './sound'
import { Toy } from './toy'
import { ToyView, type Shown } from './view'

// The Mount, showing the toy: a patch of tar, chalk under the finger, and an
// engine that rides whatever is drawn. Around it is everything from the
// template: the saved world, attention, the attended clock, touch, sound from
// the first touch, the idle ladder, adaptive quality, the grown-up
// performance handle and the grown-up overlay.

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
    // Grown-ups only: three quick taps in the top right corner while another finger rests in the top left, or
    // fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const view = new ToyView()
    // What the idle ladder shows this frame, kept for the draw.
    const shown: Shown = { glow: 0, hand: null }
    const hand: HandPose = { travel: 0, press: 0, opacity: 0 }
    // A fixed seed from the address makes every random stream the same, for stills; otherwise each visit draws its own.
    const asked = new URLSearchParams(window.location.search).get('seed')
    const seed = asked !== null && asked !== '' && Number.isFinite(Number(asked)) ? Number(asked) >>> 0 : Math.floor(Math.random() * 0xffffffff)
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let toy: Toy | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0, drawStep = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // What is saved is the toy's world, which is always at rest: a ride in progress is saved as where it ends.
    const cadence = new SaveCadence(() => { if (toy) ctxRef.current.storage.save(serialize(toy.world)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). A tier sets how many loose bits the tar holds and how often a resting figure is
    // drawn afresh; it never changes what happens. The canvas carries the tier, where a still or a probe can read it.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
      toy?.bits.setCap(governor.settings.bits)
    }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has been
    // read. With no toy yet it draws the bare tar.
    const draw = () => {
      view.resize(width, height, dpr)
      drawn.drawCalls = view.draw(canvas, toy, shown, drawStep)
      drawStep = 0
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

    // Sounds the toy has asked for are played here, inside the gesture handler right after the toy has answered
    // and again after its step in the loop, so the first sound falls inside the touch. A change to the world is
    // handed to storage in the same place, at the throttle: a mark is a small change that keeps coming.
    const sing = () => {
      if (!toy) return
      if (toy.asked.length > 0) {
        // Everything one answer asks for is one voice: before the sound is unlocked only the newest voice is
        // kept, and the tick of the first landing must not be lost to the toot that follows it.
        const voices = toy.asked.map((sound) => voiceOf(sound.key, sound.pitch, sound.level))
        audio.play(voices.length === 1 ? voices[0] : (context, out, at) => { for (const voice of voices) voice(context, out, at) })
        toy.asked.length = 0
      }
      if (toy.unsaved) {
        // A mark is a small change that keeps coming and is saved at the throttle. A rider home, a cycle judged
        // and a scene's outcome are saved at once, before any of the scene is seen.
        cadence.change(performance.now(), toy.saveNow)
        toy.unsaved = toy.saveNow = false
      }
    }

    // What the toy does with a gesture. The finger is the chalk: it lands, it moves, and it lifts. A finger lifted
    // mid-line may come back and carry on (`dragLift`), so the mark is made only when the drag is over. Every
    // press has one ending, and each of them makes the mark.
    const act = (gestures: Gesture[]) => {
      if (!toy) return
      for (const gesture of gestures) {
        if (gesture.type === 'press') toy.press(view.toTar(gesture.at.x, gesture.at.y))
        else if (gesture.type === 'dragMove') toy.move(view.toTar(gesture.at.x, gesture.at.y))
        else if (gesture.type === 'tap' || gesture.type === 'dragEnd' || gesture.type === 'pressEnd') toy.lift()
      }
      sing()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    /** The fingers on the glass now, each where it landed. */
    const fingers = new Map<number, Point>()
    /**
     * The finger the toy follows, and whether it has moved. A palm that lands first rests where it landed, so a
     * finger that then starts to draw takes over from it: nothing is laid for the palm.
     */
    let working: { id: number; moved: boolean } | null = null
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) {
        fingers.clear()
        working = null
        return
      }
      audio.touchDown()
      ladder.touch(clock.seconds)
      const where = at(event)
      // The grown-up's three taps take two hands: they count only while one other finger rests in the top left
      // corner, a hand's span away. Anything else starts the count again, so a child drumming in the corner, or
      // fingers and a palm landing together, never open the numbers.
      const others = [...fingers.values()]
      fingers.set(event.pointerId, where)
      if (others.length === 1 && others[0].x <= CORNER && others[0].y <= CORNER) overlay.press(where.x, where.y, width, event.timeStamp)
      else if (!(where.x <= CORNER && where.y <= CORNER)) overlay.press(0, CORNER + 1, width, event.timeStamp)
      // The corner is tar like the rest: a touch there is answered like any other.
      const landing = touch.down(event.pointerId, where, event.timeStamp)
      if (landing.some((gesture) => gesture.type === 'press')) working = { id: event.pointerId, moved: false }
      act(landing)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const id = event.pointerId, where = at(event), landed = fingers.get(id)
      if (working && working.id !== id && !working.moved && landed && Math.hypot(where.x - landed.x, where.y - landed.y) > TAP_SLOP) {
        touch.cancel(working.id, event.timeStamp)
        toy?.drop()
        working = { id, moved: false }
        act(touch.down(id, landed, event.timeStamp))
      }
      const gestures = touch.move(id, where)
      if (working && working.id === id && gestures.length > 0) working.moved = true
      act(gestures)
    }
    const onUp = (event: PointerEvent) => {
      if (working?.id === event.pointerId) working = null
      fingers.delete(event.pointerId)
      act(touch.up(event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      if (working?.id === event.pointerId) working = null
      fingers.delete(event.pointerId)
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
      // Advances the attended clock. It returns the step to play, in seconds: the toy and every animation advance by it.
      const step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // The toy plays its step, and what it asked for is played and saved.
      if (toy) {
        toy.step(step)
        sing()
      }
      drawStep += step
      // A finger that is working is not idle, and neither is a child watching the engine ride or a scene play.
      if (touch.active || toy?.journey.busy || toy?.company.playing) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on the bare spot to chalk on, then a ghost hand that taps it once, or,
      // when the train is wanted somewhere, draws a line to it from the engine.
      const guidance = ladder.update(clock.seconds)
      shown.glow = guidance.glow
      shown.hand = guidance.demo === null ? null : handPose(guidance.demo, toy?.wantFrom != null, hand)
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
      act(touch.clear())
      // No finger is on the glass for the grown-up's gesture either: a lift that never arrives must not leave it armed.
      fingers.clear()
      working = null
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // The toy is built when the slot has been read, as the world was left: nothing eases in and nothing replays.
      toy = new Toy(deserialize(value, ctxRef.current.childAge, seed, CYCLE_WIRED), seed)
      applyTier()
      // The load draws the first frame itself: a game that is resting or parked when the slot comes back has no
      // frame coming, and would go on showing the bare tar.
      draw()
    })
    applyTier()
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
      audio.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={chalkTrainManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const chalkTrainCartridge: Cartridge = {
  manifest: chalkTrainManifest,
  Mount,
}
