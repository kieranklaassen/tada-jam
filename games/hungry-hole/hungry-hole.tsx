// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { Bystanders } from './bystanders'
import { BACKDROP, TAP_PRESSES } from './config'
import { IdleLadder, handPose, type Guidance, type HandPose } from './guidance'
import { hintOf } from './guide'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { Later, heard } from './later'
import { hungryHoleManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { pick, streetPoint } from './pick'
import { Play, type Target } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { makeRng, seedOf } from './rng'
import { deserialize, serialize, type Saved } from './save'
import { SaveCadence } from './saveCadence'
import { Scene } from './scene'
import { Stage, enterBeats, enterOutcome, floatBeats, floatOutcome, showWaiting, waitingOf } from './scenes'
import { Carnival, type Guide } from './view/carnival'

// The Mount. It owns what touches the browser: the renderer, the pointer, the
// sound, the save and the frame loop. The toy itself is `Play` (play.ts), the
// bystanders are `Bystanders`, the two scenes are lists of beats (scenes.ts)
// and the street is drawn by `Carnival` (view/carnival.ts); each is built and
// tested with no browser.

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
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let state: Saved | null = null, play: Play | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // One seed for the visit, `seed=<n>` in the address pinning it. The street is laid from it on a first visit,
    // and the bystanders' fidgets and the scraps in the air each draw from a stream of their own, so a pinned seed
    // gives the same fidgets in the same order on every run.
    const seed = seedOf(window.location.search)
    const bystanders = new Bystanders(makeRng(seed + 1)), carnival = new Carnival(makeRng(seed + 2))
    // What the two scenes show on their way to what they saved when they started, and the one that is playing.
    const stage = new Stage()
    let scene: Scene | null = null
    // A device that gives no WebGL context shows the backdrop and still plays its sounds.
    let renderer: THREE.WebGLRenderer | null = null
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    } catch {
      renderer = null
    }
    // How often each kind of sound has played, so the same touch never sounds the same twice in a row.
    const takes = new Map<string, number>()
    // The notes that start a while after their cue wait here on the game's clock, and are dropped when what they
    // belong to is over before their time (later.ts).
    const later = new Later()
    const guide: Guide = { hint: { thing: null, gate: false, hand: null }, glow: 0, press: 0, opacity: 0 }
    const hand: HandPose = { travel: 0, press: 0, opacity: 0 }
    // A press in the grown-up's corner is not the child's: the gesture it starts is passed over.
    let passedOver = false
    // What the loop hands the draw, as `drawn` is what the draw hands back. `guidance` is what the idle ladder
    // shows now, and null until the first frame: the loop keeps what `ladder.update` returns, so the glow and the
    // ghost hand reach the renderer without a second call. `step` is the seconds of play the frame advances, for
    // springs and whatever else the view eases by itself; it is 0 outside a frame, where `resize` and the load
    // draw the game as it stands.
    const playing = { step: 0, guidance: null as Guidance | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A game whose saved state is more than `state.ts` holds wraps it in a module of its own, as the header of
    // state.ts describes, and `serialize` and `deserialize` here become the wrapper's.
    const cadence = new SaveCadence(() => { if (state && play) ctxRef.current.storage.save(serialize({ ...state, ...play.world() })) })

    // A finger on the gate keeper or the gate of a bare, finished street: the next street comes in. The save holds
    // the new street from this moment, every thing on its spot and the hole where it will lie; the scene shows
    // them coming. The first thing waits until the hole has glided out of its way.
    const letIn = (target: Target) => {
      if (!state || !play) return
      play.touched(target)
      const fromX = play.x, fromZ = play.z
      state = enterOutcome(state, play)
      const to = play.world().hole
      scene = new Scene(enterBeats(stage, play, Math.hypot(to.x - fromX, to.z - fromZ) / 13 + 0.3))
      scene.start(clock.seconds, () => cadence.change(performance.now(), true))
    }

    // A scene that is playing ends whole: every beat where it was going, the hole at its place on the street
    // that was coming in, and no note of it still to come.
    const endScene = () => {
      if (!scene?.running) return
      scene.finish()
      play?.arrive()
      later.drop()
    }

    // What the toy queued since it was last asked: each cue is shown to the bystanders, the gate and the view,
    // and all of them are played as one voice: the notes that start at once now, and each later note in the
    // frame its time comes on the game's clock. Then whatever the save holds and has changed is handed to
    // storage: at once when a thing went in, came out or was let down, and at the throttle while the hole only moves.
    const settle = () => {
      if (!play) return
      if (play.cues.length > 0) {
        for (const cue of play.cues) {
          bystanders.react(cue)
          stage.hear(cue)
          carnival.cue(cue, play)
          // The hole went out from under a stack that holds the whole street: the float goes out. The street is
          // finished in the save from this moment, and the scene only shows it.
          if (cue.type === 'float' && state) {
            const next = floatOutcome(state)
            scene = new Scene(floatBeats(stage, play, cue.parts, { x: cue.x, z: cue.z }, waitingOf(next.position, next.seed)))
            scene.start(clock.seconds, () => {
              state = next
              cadence.change(performance.now(), true)
            })
          }
        }
      }
      // A first touch whose sound still waits for the unlock waits whole, its later notes with it (audio.ts).
      const notes = heard(play.cues, takes, later, clock.seconds, audio.running)
      play.cues.length = 0
      if (notes.length > 0) audio.play(voiceOf(notes))
      if (play.dirty) {
        cadence.change(performance.now(), play.urgent)
        play.dirty = play.urgent = false
      }
    }

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      carnival.setTier(governor.settings)
    }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read. So it has a case with no state (the bare backdrop of the look),
    // and it returns early while the surface has no size, which a parked surface has when the slot comes back.
    // It reads `playing` for the frame's step and the idle guidance.
    // A canvas 2D game takes `canvas.getContext('2d')` once, above, and makes one fit from the surface's size in
    // CSS pixels: `fit(width, height)` (stage.ts). Touches go through `toStage` with that fit, and the draw sets
    // its transform to the pixel ratio times that fit:
    // `setTransform(dpr * scale, 0, 0, dpr * scale, dpr * x, dpr * y)`. The fit is never made from
    // `canvas.width` and `canvas.height`, which are that size times the pixel ratio: every touch would then
    // land off by the ratio on a tablet, and right on a display of ratio 1.
    const draw = () => {
      if (!renderer || width <= 0 || height <= 0) return
      // Before the slot is read the street is shown bare: the setting, with no hole and nobody on it.
      if (play) {
        const guidance = playing.guidance
        guide.glow = guidance ? guidance.glow : 0
        guide.opacity = 0
        if (guidance && (guidance.glow > 0 || guidance.demo !== null)) {
          guide.hint = hintOf(play, state !== null && state.finished)
          if (guidance.demo !== null && guide.hint.hand) {
            // On the hole the hand taps once: a second tap would burp a second thing. On the gate keeper too: one tap lets the street in.
            handPose(guidance.demo, false, hand, guide.hint.hand.on === 'hole' || guide.hint.hand.on === 'keeper' ? 1 : TAP_PRESSES)
            guide.press = hand.press
            guide.opacity = hand.opacity
          }
        }
        carnival.update(play, bystanders, stage, guide, playing.step)
      }
      renderer.render(carnival.scene, carnival.camera)
      drawn.drawCalls = renderer.info.render.calls
      drawn.triangles = renderer.info.render.triangles
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
      // A three.js game sizes through its renderer instead: `setPixelRatio(ratio)` and `setSize(w, h, false)`
      // take the place of these two assignments.
      renderer?.setPixelRatio(ratio)
      renderer?.setSize(w, h, false)
      carnival.resize(w, h)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The blank surface only answers a touch with a sound (`tick`, which goes
    // with its import when the game plays its own voices). The points are in the surface's CSS pixels: a canvas
    // 2D game turns each into stage units first, with `toStage` and the one fit made from `width` and `height`.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    // Two endings are not the child's doing, and neither makes a move: on `dragCancel` the thing in hand goes
    // back where it came from, and a `pressEnd` lets go of what the press lit and is not a tap. Every gesture has
    // a case of its own, so a game that leaves one out, a cancelled drag above all, does not compile.
    // The game queues its voices as it answers, and they are played here, inside the handler, and again after
    // the step in the loop: the first sound of a visit then falls inside the touch, where audio.ts holds it for
    // the unlock. Everything one touch sets off is played as one voice (`voiceOf` in audio.ts).
    // A press in the grown-up's corner (`inCorner` in overlay.ts) is not answered at all: the corner is asked
    // first, so a touch there ends no scene, calls nothing and does not count as the child's for the idle ladder.
    const act = (gestures: Gesture[]) => {
      for (const gesture of gestures) {
        if (!play) continue
        switch (gesture.type) {
          // The finger landed: the hole is called, or puckers under it, in this same frame.
          // A scene that is playing ends first, with everything where it was going, and the press is then an ordinary one.
          case 'press': {
            passedOver = inCorner(gesture.at.x, gesture.at.y, width)
            if (passedOver) break
            endScene()
            const target = pick(carnival.ray(gesture.at.x, gesture.at.y, width, height), play, bystanders.mayor.x)
            if (state?.finished && play.bare && (target.on === 'keeper' || target.on === 'gate')) letIn(target)
            else play.press(target)
            break
          }
          // Lifted where it landed: on the hole that is the burp.
          case 'tap':
            if (!passedOver) play.tap()
            break
          // The press was taken away and is not a tap: the hole lets go of its pucker and burps nothing.
          case 'pressEnd':
            if (!passedOver) play.letGo()
            break
          case 'dragStart':
            break
          // The hole follows the finger, or is carried by it when the finger landed on the hole.
          case 'dragMove': {
            if (passedOver) break
            const point = streetPoint(carnival.ray(gesture.at.x, gesture.at.y, width, height))
            if (point) play.drag(point.x, point.z)
            break
          }
          // A finger that slips off for a moment may come back: the hole glides on to where it was last called.
          case 'dragLift':
            break
          case 'dragEnd':
            if (!passedOver) play.letGo()
            break
          // The drag was taken away and the child made no move: the hole stops where it is.
          case 'dragCancel':
            if (!passedOver) play.halt()
            break
          default:
            // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
            gesture satisfies never
        }
      }
      settle()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      // A touch in the grown-up's corner is not the child's: the idle ladder goes on as if it had not landed.
      if (!inCorner(where.x, where.y, width)) ladder.touch(clock.seconds)
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
      act(touch.up(event.pointerId, where, event.timeStamp))
      // A lifted drag waits a moment for the finger to come back. A game whose lift is the act, or whose targets
      // stand close together, ends it here instead: `act(touch.letGo())` (input.ts).
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
      if ((touch.active && !passedOver) || scene?.running) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      if (play) {
        play.step(playing.step)
        stage.step(playing.step)
        scene?.update(clock.seconds)
        bystanders.step(playing.step, play, stage)
        settle()
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
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // Put away equals loaded. A scene that is playing ends whole and unheard, whatever was on its way in the
    // street arrives (`Play.rest`), no reaction of a bystander is left running and no note waits. A float that
    // goes out in that moment is saved as gone, and the street is found bare with the next things behind the gate.
    const putAway = () => {
      endScene()
      later.drop()
      if (!play) return
      const float = play.rest()
      play.cues.length = 0
      if (float && state) state = floatOutcome(state)
      if (state?.finished && play.bare) showWaiting(stage, state.position, state.seed)
      stage.rattle = 0
      bystanders.settle(play, stage)
      carnival.settle()
      // The idle ladder starts again from the bottom, as it does on a load.
      ladder.touch(clock.seconds)
      playing.guidance = null
      cadence.change(performance.now(), true)
      play.dirty = play.urgent = false
      draw()
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is
    // ended, since its lift will never arrive: a drag under a finger that is still down is cancelled and the
    // thing in hand goes back, a drag the finger had already let go is dropped, and a press ends without a tap.
    // Then the game is left as a load would find it (`putAway`), and the newest state is handed to storage.
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
      putAway()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      state = deserialize(value, ctxRef.current.childAge, seed)
      // The street as it was left: the hole where it lay, what it had eaten, what rode on its breath and every
      // thing where it stood. Nothing eases in.
      play = new Play(state)
      // A street whose float has gone out is found bare, the gate shut and the next things waiting behind it.
      if (state.finished) showWaiting(stage, state.position, state.seed)
      bystanders.settle(play, stage)
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the thing in hand is back or down before the last save.
      act(touch.clear())
      putAway()
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
      carnival.dispose()
      renderer?.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={hungryHoleManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const hungryHoleCartridge: Cartridge = {
  manifest: hungryHoleManifest,
  Mount,
}
