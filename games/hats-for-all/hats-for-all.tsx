// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { Game, type Target } from './game'
import { hint } from './guide'
import { IdleLadder, handPose, type Guidance, type HandPose } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { hatsForAllManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { deserialize, serialize, type Saved } from './save'
import { SaveCadence } from './saveCadence'
import { sounding } from './sound'
import type { Guide } from './view/stage3d'
import { FoamView } from './view/view'

// The Mount. Everything that decides anything is in pure modules: the rules
// (rules.ts), the cycle and what is saved (cycle.ts, save.ts), the game that
// plays them (game.ts) on a theatre of numbers (play.ts). The view draws the
// theatre (view/). This file joins them to the shell: the saved slot,
// attention and the attended clock, touch, sound from the first touch, the
// idle ladder, adaptive quality, and the grown-up handle and overlay.

/** A finger that has slid less than this far, in pixels of the surface, is still tapping: at two a tap is often a small smear. */
const SMEAR = 44
/** How far a finger pulls a creature before it is stretched as far as it goes, in pixels. */
const PULL = 130

/** A fixed seed from the address, `?seed=<n>`, so a still can be taken again; otherwise a new one for a first visit. */
function firstSeed(search: string): number {
  const asked = Number(new URLSearchParams(search).get('seed'))
  return Number.isInteger(asked) && asked > 0 ? asked >>> 0 : Math.floor(Math.random() * 2 ** 32) >>> 0
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
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let state: Saved | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const view = new FoamView(canvas)
    // The game is made when the slot has been read, and not before: until then the surface shows the bare mat.
    let game: Game | null = null
    // What the finger that is down landed on and where, and whether it has slid far enough to be dragging.
    let held: Target | null = null, from: Point = { x: 0, y: 0 }, dragging = false
    // What the idle ladder shows this frame, kept from the loop for `draw`.
    let guidance: Guidance | null = null
    const hand: HandPose = { travel: 0, press: 0, opacity: 0 }
    const guide: Guide = { hint: { glow: [], hand: null }, glow: 0, press: 0, opacity: 0 }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    const cadence = new SaveCadence(() => { if (state) ctxRef.current.storage.save(serialize(state)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`. A slower tier sheds the foam's stipple; both materials are compiled at mount (`view.warm`).
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setStipple(governor.settings.stipple)
    }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has
    // been read.
    const draw = () => {
      if (width <= 0) return
      if (game && guidance) {
        guide.hint = hint(game.saved)
        guide.glow = guidance.glow
        if (guidance.demo === null) guide.opacity = 0
        else {
          handPose(guidance.demo, false, hand)
          guide.press = hand.press
          guide.opacity = hand.opacity
        }
      }
      const counts = view.draw(game ? game.play : null, game && guidance ? guide : null)
      drawn.drawCalls = counts.drawCalls
      drawn.triangles = counts.triangles
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
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. A scene that is playing ends first thing in every press, inside
    // `game.press`, and the press is then an ordinary touch. The answer starts on `press`, when the finger
    // lands. A finger that slides only a little is still tapping; further, it drags: a hat comes away in the
    // hand, a creature stretches after the finger. Every press has one ending.
    const act = (gestures: Gesture[]) => {
      if (!game) return
      for (const gesture of gestures) {
        if (gesture.type === 'press') {
          held = view.pick(gesture.at.x, gesture.at.y, game.play)
          from = gesture.at
          dragging = false
          game.press(held)
        } else if (!held) continue
        else if (gesture.type === 'tap') { game.tap(); held = null }
        else if (gesture.type === 'pressEnd') { game.pressEnd(); held = null }
        else if (gesture.type === 'dragMove' || gesture.type === 'dragLift') {
          if (!dragging && Math.hypot(gesture.at.x - from.x, gesture.at.y - from.y) < SMEAR) continue
          if (!dragging) { dragging = true; game.dragStart() }
          const point = view.handPoint(gesture.at.x, gesture.at.y)
          game.dragTo(point.x, point.y, point.z, (gesture.at.x - from.x) / PULL, (from.y - gesture.at.y) / PULL)
        } else if (gesture.type === 'dragEnd') {
          if (dragging) game.letGo(view.letGoAt(gesture.at.x, gesture.at.y, game.play, held))
          else game.tap()
          held = null
        }
      }
      sound()
      keep()
    }
    // Plays what the game has asked to be heard since the last call: inside the gesture, so the first sound
    // falls within the touch, and again after each step of the loop.
    const sound = () => {
      if (!game) return
      for (const cue of game.play.cues) audio.play(sounding(cue.voice, cue.delay))
      game.play.cues.length = 0
    }
    // Hands a change to storage: a move at the throttle, a scene's outcome at once.
    const keep = () => {
      if (!game || !game.dirty) return
      state = game.saved
      cadence.change(performance.now(), game.dirty === 'now')
      game.dirty = null
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
      const step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (touch.active) ladder.touch(clock.seconds)
      // The game plays the step: the theatre, a scene, and whatever falls due once the crew has been left alone.
      if (game) {
        game.step(step)
        sound()
        keep()
        // A scene that is playing is not idleness.
        if (game.sceneRunning) ladder.touch(clock.seconds)
      }
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
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
      held = null
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      state = deserialize(value, ctxRef.current.childAge, undefined, firstSeed(window.location.search))
      // The game sets itself up from the state, as it was left: nothing eases in and no scene replays. Only the
      // first showing, which plays once ever, starts by itself, and its outcome is saved as it starts.
      game = new Game(state)
      game.begin()
      keep()
      ladder.touch(clock.seconds)
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
    })
    applyTier()
    resize()
    view.warm()
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
      view.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={hatsForAllManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const hatsForAllCartridge: Cartridge = {
  manifest: hatsForAllManifest,
  Mount,
}
