// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import type { Note } from './audio'
import { paintBackdrop, paintSlide } from './backdrop'
import { hopToward } from './board'
import { bystanderAt } from './bystanders'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { stampStill } from './frame'
import { SLIDE, askedAt, onCat } from './layout'
import { hopAcrossManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { answerTouch, hop, owedOnLoad, startShowing, type TouchAnswer } from './play'
import { seedOf } from './rng'
import { boardOf, deserialize, serialize, type Saved } from './save'
import { SaveCadence } from './saveCadence'
import { Scene } from './scene'
import { sceneryOf, type Scenery } from './scenery'
import { picnic, showing, slide, type Theatre } from './scenes'
import { fit, toStage } from './stage'
import { BoardView } from './view'
import { PURR, bystanderNotes, voiceFor } from './voices'

// The Mount: the board, the rabbit and her three small ones, and a tap that hops her one square and steps
// everything else once. The rules are in board.ts and play.ts, which know nothing of time; the view (view.ts)
// turns each step into motion on the attended clock, the voices (voices.ts) into one sound for the touch, and
// the three short scenes (scenes.ts) play what a hop has already settled and saved.

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
    // The surface, and a canvas of its own for everything that stands still, stamped once a frame.
    const surface = canvas.getContext('2d')
    const still = document.createElement('canvas'), stillSurface = still.getContext('2d')
    const view = new BoardView()
    let state: Saved | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // The scene that is playing, if one is. `owed` says the duck's showing is to be tried: at the first touch
    // after a load, a first visit included, so that the duck is heard, and when a slide has ended.
    let scene = new Scene([]), owed = false
    // What the still picture shows, which is the crossing on screen; and while the board slides, the crossing it
    // leaves, when the picture is the wide one that holds both.
    let shown: Scenery | null = null, leaving: Scenery | null = null
    // Everything one touch sets off is one voice: the scenes add to the touch's notes while it is being answered.
    let answering: Note[] | null = null
    const sound = (notes: readonly Note[]) => {
      if (answering) answering.push(...notes)
      else audio.play(voiceOf(notes))
    }
    const theatre: Theatre = {
      view,
      now: () => clock.seconds,
      sound,
      // The slide is over: the wide picture gives way to the still one of the new crossing.
      slideOver: () => {
        if (!leaving) return
        leaving = null
        paintStill()
      },
    }
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
    const cadence = new SaveCadence(() => { if (state) ctxRef.current.storage.save(serialize(state)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    // The tier's `weave` is painted into the still canvas, so a tier change paints it again; its `gloss` is read
    // by each frame's draw.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      paintStill()
    }

    // Everything that stands still, at the surface's own size and pixel ratio. Before the slot is read it is the
    // table and the bare linen board, which is the look's backdrop; after, the lanes are printed on it.
    // While the board slides it is one slide's length wider and holds the crossing that is left and the next one.
    const paintStill = () => {
      if (!stillSurface || width <= 0 || height <= 0) return
      const by = fit(width, height)
      still.width = canvas.width + (leaving ? Math.ceil(SLIDE * by.scale * dpr) : 0); still.height = canvas.height
      stillSurface.setTransform(dpr * by.scale, 0, 0, dpr * by.scale, dpr * by.x, dpr * by.y)
      if (leaving && shown) paintSlide(stillSurface, leaving, shown, governor.settings.weave)
      else paintBackdrop(stillSurface, shown, governor.settings.weave)
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
    // The still picture is stamped first (frame.ts), and the figures are painted over it.
    const draw = () => {
      if (!surface || width <= 0 || height <= 0) return
      const by = fit(width, height), k = dpr * by.scale
      surface.setTransform(1, 0, 0, 1, 0, 0)
      drawn.drawCalls = stampStill(surface, still, { w: canvas.width, h: canvas.height, k, x: dpr * by.x, y: dpr * by.y }, state ? view.leaf : 0, leaving ? view.slid : 0, BACKDROP)
      if (!state) return
      surface.setTransform(k, 0, 0, k, dpr * by.x, dpr * by.y)
      view.draw(surface, clock.seconds, playing.step, playing.guidance, governor.settings.gloss)
      // The stamps of what stands still, and every figure painted over them.
      drawn.drawCalls += view.figures
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
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      paintStill()
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
    // A press in the grown-up's corner (`inCorner` in overlay.ts) is answered as bare backdrop is, or not at all.
    // The duck goes first, if a thing on this crossing has not been shown and a lane holds it where none of the
    // family stands. What the showing ends in is saved as it starts.
    const show = (started: Pick<TouchAnswer, 'saved' | 'show'> | null): void => {
      if (!state || !started || !started.show) return
      const lanes = boardOf(state).lanes
      state = started.saved
      scene = new Scene(showing(started.show, lanes[started.show.col], theatre))
      scene.start(clock.seconds, () => cadence.change(performance.now(), true))
    }

    const act = (gestures: Gesture[]) => {
      for (const gesture of gestures) {
        switch (gesture.type) {
          // The answer starts when the finger lands: the press is the hop. One hop is one whole step of the board,
          // saved at once, so a put-away in the next moment finds it. A press in the grown-up's corner is not
          // answered, and one on the cat or on a bystander is answered by that character and makes no hop.
          case 'press': {
            const by = fit(width, height)
            if (!state || by.scale <= 0 || inCorner(gesture.at.x, gesture.at.y, width)) break
            // A touch ends the scene that is playing, with everything where the save has it, and is then an
            // ordinary touch.
            const cut = leaving !== null
            scene.finish()
            const where = toStage(gesture.at, by)
            if (onCat(where.x, where.y)) {
              view.purr(clock.seconds)
              audio.play(voiceOf(PURR))
              break
            }
            // The duck's showing, if one is owed: it starts at this touch, and the touch makes no hop. A touch that
            // cut the tip or the slide short is an ordinary hop: the slide has ended, so the showing starts, and
            // the same touch ends it with its lane where the save has it.
            // The decision is `answerTouch` in play.ts.
            const answer = answerTouch(state, owed, cut)
            owed = false
            show(answer)
            if (answer.show && !answer.watched) scene.finish()
            if (!answer.hops) break
            // A bystander answers as itself: its own move and its own sound, and no hop and no step.
            const met = shown ? bystanderAt(where.x, where.y, shown, boardOf(state)) : null
            if (met) {
              view.poke(met, clock.seconds)
              audio.play(voiceOf(bystanderNotes(met)))
              break
            }
            const square = askedAt(where.x, where.y)
            const before = shown
            const turn = hop(state, hopToward(boardOf(state), square.c, square.r))
            state = turn.saved
            // One hop is one whole step, and whatever it ends or begins is in the same save, at once.
            cadence.change(performance.now(), true)
            answering = voiceFor(turn.events, { sleepers: view.striped() })
            view.apply(turn.board, turn.events, clock.seconds)
            if (turn.slide) {
              // The board slides on: the picture becomes the wide one, and the next crossing waits in it.
              shown = sceneryOf(state)
              leaving = before
              paintStill()
              scene = new Scene(slide(turn.slide.tipped, turn.slide.board, shown, theatre))
              scene.start(clock.seconds, () => {})
              owed = true
            } else if (turn.picnic) {
              const arrived = turn.board.family.map((_, who) => view.arrival(who))
              scene = new Scene(picnic(arrived, theatre))
              scene.start(clock.seconds, () => {})
            }
            audio.play(voiceOf(answering))
            answering = null
            break
          }
          // The hop was made on the press, so the lift and a drag that follows it change nothing.
          case 'tap':
          case 'pressEnd':
          case 'dragStart':
          case 'dragMove':
          case 'dragLift':
          case 'dragEnd':
            break
          // Nothing is ever in the hand, so there is nothing to put back.
          case 'dragCancel':
            break
          default:
            // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
            gesture satisfies never
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
      const where = at(event)
      const gestures = touch.down(event.pointerId, where, event.timeStamp)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      // The tracker gives a second finger no gesture. Here every finger that lands is a hop, so that two hands
      // drumming on the board get a hop for each beat: the sheet promises every tap an answer.
      act(gestures.length > 0 ? gestures : [{ type: 'press', at: where }])
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
      // A finger that slid as it tapped has started a drag, which would wait a moment for the finger to come back
      // and take the next tap near it for the same drag, with no press. The squares stand close together, so the
      // lift ends it here and every touch-down is a hop of its own.
      act(touch.letGo())
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
      if (touch.active || view.busy(clock.seconds) || scene.running) ladder.touch(clock.seconds)
      const was = scene.running
      scene.update(clock.seconds)
      // The slide has ended by itself: the duck's showing follows it, if one is owed.
      if (was && !scene.running && owed) {
        owed = false
        if (state) show(startShowing(state))
      }
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The game steps its rules and its scene here by `playing.step`, plays the voices they queued, and hands
      // what they changed to storage (`cadence`, above).
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
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts. The seed lays the crossings
      // of a first visit, and `seed=<n>` in the address pins it.
      state = deserialize(value, ctxRef.current.childAge, seedOf(window.location.search))
      shown = sceneryOf(state)
      view.reset(boardOf(state), shown, state.finished)
      if (state.finished) view.served()
      paintStill()
      // Nothing plays by itself on a load. A showing that is owed, on a first visit too, starts at the first
      // touch, where sound can begin, and that touch makes no hop. It is owed only where the family has not set
      // out (`owedOnLoad` in play.ts): opened again in the middle of a crossing, the first touch is a hop.
      owed = owedOnLoad(state)
      // The game sets itself up from the state here, as it was left: nothing eases in and no scene replays.
      // Its chance comes from streams it makes here from one seed, `seedOf(window.location.search)` in rng.ts:
      // `seed=<n>` in the address pins it, so a still can be taken again.
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
      <canvas ref={canvasRef} aria-label={hopAcrossManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const hopAcrossCartridge: Cartridge = {
  manifest: hopAcrossManifest,
  Mount,
}
