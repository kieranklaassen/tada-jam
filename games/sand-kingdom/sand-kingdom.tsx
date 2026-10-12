// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, type Note, voiceOf } from './audio'
import { type Camera, cameraFor } from './camera'
import { beachOf } from './beaches'
import { BACKDROP } from './config'
import { emptyHint, hintFor } from './guide'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { deserializeKingdom, serializeKingdom } from './kingdom'
import { act as answer, answers, frameFor, lifted, rested } from './hand'
import { sandKingdomManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { Play } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { SaveCadence } from './saveCadence'
import { ShoreView } from './view/shoreView'

// The Mount: the template's wiring (the saved state, attention, the attended
// clock, touch, sound from the first touch, the idle ladder, adaptive quality,
// the grown-up performance handle and the grown-up overlay) around the game's
// own two parts. `Play` is the beach with no browser in it, `ShoreView` draws
// what it holds, and this file passes touches in and sounds, saves and frames
// out.

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
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // The view owns the renderer on the Mount's canvas, and reports the renderer's own counts of what it drew.
    const view = new ShoreView(canvas)
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...view.counts }))
    // The game itself, once the slot has been read. Until then the beach lies bare and smooth.
    let play: Play | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // Whether the finger that is down landed where the game answers.
    let mine = false
    // The camera as numbers for the surface as it is sized now: every touch is brought back to the beach through it.
    let camera: Camera | null = null
    // What the loop hands the draw. `guidance` is what the idle ladder shows now, and null until the first frame.
    // `step` is the seconds of play the frame advances; it is 0 outside a frame, where `resize` and the load draw
    // the game as it stands.
    const playing = { step: 0, guidance: null as Guidance | null }
    const hint = emptyHint()
    // The seed of this visit's chance: which variant sounds, where a grain flies, which idle move one of the folk
    // makes. `seed=<n>` in the address pins it, so a still can be taken again. Nothing saved depends on it.
    const seed = seedOf(window.location.search)
    // Grown-ups only: `beach=<name>` in the address opens the visit on a beach that is already built
    // (beaches.ts), in place of the saved one, so any state can be looked at without playing up to it.
    const built = beachOf(window.location.search)

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it. The sand is a
    // change that keeps coming, so it goes to storage at the throttle, and going to rest writes what is held.
    const cadence = new SaveCadence(() => { if (play) ctxRef.current.storage.save(serializeKingdom(play.toState())) })

    // The one place the game applies a quality tier: how many grains are drawn and whether the fine ripples and
    // the glitter are, besides the pixel ratio, which `resize` applies. The canvas carries the tier it was given,
    // where a still or a probe can read it.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` after sizing, which can
    // be before the slot is read and while the game rests, and the load once the slot has been read. With no game
    // yet it draws the bare beach; with no size yet it draws nothing.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      if (play) view.update(play, hintFor(playing.guidance, play.field, hint, play.things))
      view.render()
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
      camera = cameraFor(w, h)
      if (play) frameFor(play, camera)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // Everything one touch set off is played as one voice, inside the handler, so the first sound of a visit falls
    // inside the touch, where audio.ts holds it for the unlock. The loop calls this again after the game's step.
    const sound = (game: Play) => {
      // A touch ended a scene: whatever the scene was still sounding stops with it.
      if (game.hush) {
        game.hush = false
        audio.hush()
      }
      if (game.sceneVoices.length > 0) {
        // A scene's voices pass through a gain of their own, which that touch closes.
        const notes: Note[] = []
        for (const voice of game.sceneVoices) notes.push(...voice)
        game.sceneVoices.length = 0
        audio.playScene(voiceOf(notes))
      }
      if (game.voices.length === 0) return
      const notes: Note[] = []
      for (const voice of game.voices) notes.push(...voice)
      game.voices.length = 0
      audio.play(voiceOf(notes))
    }
    // Hands a change to storage at the throttle: the sand changes for as long as the finger moves. The outcome
    // of a scene is saved when the scene starts, and goes to storage at once.
    const save = (game: Play) => {
      if (!game.dirty) return
      game.dirty = false
      cadence.change(performance.now(), game.urgent)
      game.urgent = false
    }

    // What the game does with a gesture is in hand.ts, where a test can reach it. Here its sounds are played and
    // what it changed goes to storage.
    const act = (gestures: Gesture[]) => {
      const game = play
      if (!game || !camera) return
      answer(game, camera, gestures)
      sound(game)
      save(game)
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      // A finger in the grown-up's corner or on the home control is not the child playing: the idle ladder stays where it is.
      mine = camera !== null && answers(camera, where.x, where.y)
      if (mine) ladder.touch(clock.seconds)
      const gestures = touch.down(event.pointerId, where, event.timeStamp)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      act(gestures)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      // A hold in the grown-up's corner stays there: the working finger leaving it starts that gesture again.
      if (touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      act(touch.move(event.pointerId, where))
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      // The lift is the act: the thing in hand is down, the bridge laid and the sun let go in this frame (hand.ts).
      act(play ? lifted(play, touch, event.pointerId, where, event.timeStamp) : touch.up(event.pointerId, where, event.timeStamp))
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) overlay.forget()
      act(touch.cancel(event.pointerId))
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
      playing.step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if ((touch.active && mine) || play?.playing || play?.sun.travelling) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The game steps here by the frame's seconds, its voices are played, and what changed goes to storage.
      if (play) {
        play.step(playing.step)
        sound(play)
        save(play)
      }
      // A tier change is applied ahead of the draw: whatever the game's tiers set in `applyTier`, then the pixel
      // ratio in `resize`. The interval just measured belongs to the frame before, so it is judged with that
      // frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      // The step has been drawn: a draw that comes outside a frame plays no time.
      playing.step = 0
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, view.counts.drawCalls, view.counts.triangles)
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
      act(touch.clear())
      cadence.settle(performance.now())
      // Parked is loaded: the game that comes back is the one a load of what was just saved would make, so
      // nothing goes on by itself behind the child's back: no sun arrives and no wave runs with no touch.
      if (play) play = rested(play, camera, seed)
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // The beach is found as it was left: the sand as it was dug, nothing easing in and nothing replayed.
      play = new Play(built ? built(ctxRef.current.childAge) : deserializeKingdom(value, ctxRef.current.childAge), seed)
      if (camera) frameFor(play, camera)
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the bare beach.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back or down before the last save.
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
      <canvas ref={canvasRef} aria-label={sandKingdomManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const sandKingdomCartridge: Cartridge = {
  manifest: sandKingdomManifest,
  Mount,
}
