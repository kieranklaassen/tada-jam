// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, handPose, type Guidance, type HandPose } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { createLook } from './look'
import { breadDayManifest } from './manifest'
import { CORNER, Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { open, serialize } from './save'
import { SaveCadence } from './saveCadence'
import { Game } from './game'
import { VOICES, voiceOf, type VoiceName } from './voices'

/** A fixed seed from the address (`seed=7`) for stills that must come out the same, and otherwise a new one for the visit. */
function seedOf(search: string): number {
  const asked = Number(new URLSearchParams(search).get('seed'))
  return Number.isInteger(asked) && asked > 0 ? asked : 1 + Math.floor(Math.random() * 0x7fffffff)
}

// The Mount, showing the game: the bakery of game.ts, drawn by look.ts. Around
// it everything the template wires is running: the saved state, attention, the
// attended clock, touch, sound from the first touch, the idle ladder, adaptive
// quality, the grown-up performance handle and the grown-up overlay. No rule
// of the game is here: gestures go in, voices and a frame come out.

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
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    // The look prints its sprites once per size and pixel ratio (`resize`), and a frame only lays them down.
    const look = createLook()
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let game: Game | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const seed = seedOf(window.location.search)
    let guidance: Guidance | null = null
    const hand: HandPose = { travel: 0, press: 0, opacity: 0 }
    const shown = { x: 0, y: 0, press: 0, opacity: 0 }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    const cadence = new SaveCadence(() => { if (game) ctxRef.current.storage.save(serialize(game.bakery)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The game has nothing else to switch (the look scales its prints): it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has
    // been read.
    const draw = () => {
      const g = canvas.getContext('2d')
      if (!g) return
      // Until the slot has been read there is no game: the bare room of the look.
      if (!game) { drawn.drawCalls = look.draw(g, clock.seconds, null); return }
      const playing = game
      // The whole idle ladder: marks round the one thing that can be touched next, then a hand that shows one
      // possible move with it. The game says what and where; it never shows a recipe.
      const wants = guidance && (guidance.glow > 0 || guidance.demo !== null) ? playing.wants(Math.max(0, guidance.demoIndex)) : null
      let ghost: typeof shown | null = null
      if (wants && guidance && guidance.demo !== null) {
        const [x, y, w, h] = wants.box, from = { x: x + w / 2, y: y + h / 2 }
        handPose(guidance.demo, wants.to !== null, hand)
        shown.x = wants.to ? from.x + (wants.to.x - from.x) * hand.travel : from.x
        shown.y = wants.to ? from.y + (wants.to.y - from.y) * hand.travel : from.y
        shown.press = hand.press; shown.opacity = hand.opacity
        ghost = shown
      }
      drawn.drawCalls = look.draw(g, clock.seconds, {
        pose: (who) => playing.motion.pose(who),
        peel: playing.peel, place: playing.bakery.peel.at, doorShut: playing.doorShut,
        body: playing.body, form: playing.form,
        jar: playing.bakery.tools.jar, dish: playing.bakery.tools.seeds,
        figures: playing.figures(), things: playing.things(), specks: playing.specks, wisps: playing.wisps.list, floured: playing.floured, extras: playing.extras(),
        glow: wants ? guidance!.glow : 0, wanted: wants ? wants.box : null, hand: ghost,
      })
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
      look.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // The surface in the look's reference units: one scale and one offset, and their inverse for every touch.
    const toSheet = (at: Point): Point => {
      const plan = look.layout
      return plan ? { x: (at.x - plan.ox) / plan.scale, y: (at.y - plan.oy) / plan.scale } : at
    }
    // The game queues its voices by name; they are played here, inside the touch that caused them, where the
    // audio module can hold the first for the unlock, and again after each step of the loop. What the game
    // changed is handed to storage at one of two speeds: a small change at the throttle, and the outcome of a
    // scene or the end of a cycle at once.
    const sound = () => {
      if (!game) return
      for (const heard of game.voices()) if (heard.name in VOICES) audio.play(voiceOf(heard.name as VoiceName, heard.pitch, heard.gain))
      if (game.dirty) { cadence.change(performance.now(), game.dirty === 'now'); game.dirty = '' }
    }
    // What the game does with a gesture. One finger works at a time, a press is answered where it lands, and every
    // press has one ending: whichever arrives lifts the finger and puts down what was in the hand.
    const act = (gestures: Gesture[]) => {
      if (!game) return
      for (const gesture of gestures) {
        if (gesture.type === 'press') game.press(toSheet(gesture.at))
        else if (gesture.type === 'dragMove') game.moveTo(toSheet(gesture.at))
        else if (gesture.type === 'tap' || gesture.type === 'dragEnd' || gesture.type === 'pressEnd') game.lift()
      }
      sound()
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
      // The top right corner is the grown-up's: nothing of the game answers there.
      if (where.x > width - CORNER && where.y < CORNER) return
      act(touch.down(event.pointerId, where, event.timeStamp))
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)))
    const onUp = (event: PointerEvent) => {
      act(touch.up(event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      // The browser took the working finger away: the child did not let go anywhere, so nothing is dropped anywhere.
      // A second finger or a palm that is taken away is not the working finger, and changes nothing.
      const gestures = touch.cancel(event.pointerId, event.timeStamp)
      if (gestures.length > 0) game?.cancel()
      act(gestures)
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
      const seconds = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom. Nor is a scene.
      if (game?.playing) ladder.touch(clock.seconds)
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (touch.active) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
      // The game lives: dough rises and the oven bakes on attended time, a scene plays on, everyone moves.
      if (game) { game.step(seconds); sound() }
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
      // Put away with a thing in the hand: it goes back where it came from, and the lift that follows moves nothing.
      game?.cancel()
      act(touch.clear())
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      // The game sets itself up from the slot as it was left: nothing eases in and no scene replays. On a first
      // visit the first customer is already at the hatch and the badger is already showing how dough is made.
      game = new Game(open(value, ctxRef.current.childAge, seed), seed)
      sound()
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
      // As on going to rest: the thing in hand goes back where it came from before the last save.
      game?.cancel()
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
      <canvas ref={canvasRef} aria-label={breadDayManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const breadDayCartridge: Cartridge = {
  manifest: breadDayManifest,
  Mount,
}
