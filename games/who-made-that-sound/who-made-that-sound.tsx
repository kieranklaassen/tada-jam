// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { whoMadeThatSoundManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { callsDue, moveToShow } from './guide'
import { whatIsAt } from './picture'
import { BREATHLESS, bareSound, callSound, direct, directRound, joinSound, notesOf, roundWith, withGulp } from './plays'
import { deserializeWorld, serializeWorld } from './save'
import { Show } from './show'
import { puffsOf, together, voiceOf } from './sound'
import { SpikeScene, wantsSpike } from './spikeScene'
import { bareAt, placeFrom, seedFrom, toStage } from './stage'
import { GameView } from './view'
import type { Kind } from './voices'
import { act as tap, freshWorld, type Action, type World } from './world'

// The Mount, showing the game. Around it everything a game needs is wired and
// running: the saved state, attention, the attended clock, touch, sound from
// the first touch, the idle ladder, adaptive quality, the grown-up performance
// handle and the grown-up overlay. Nothing of the game is decided here: the
// rules are in world.ts, where things stand in picture.ts, what a tap looks
// and sounds like in plays.ts, what moves in show.ts and what is drawn in
// view.ts.

/** The page is painted from this seed, so it is the same page on every visit. */
const PAGE_SEED = 0x7155e5

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
    // Grown-ups only: a finger held a second in the top right corner and lifted there, then three quick taps, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let world: World | null = null, show: Show | null = null, guide: Guidance | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0, way = 0
    // Since when the child has done nothing, and how often the one who asks has called again by itself since then.
    let idleSince = 0, called = 0
    // How often the one who asks has been tapped, one tap straight after the other.
    let asked = 0
    // The one on the hill who was tapped last, if nothing else has been touched since: two of one family sing a
    // round when they are tapped one straight after the other, with any wait between the two taps.
    let poked: { kind: Kind; place: number } | null = null
    // How many fingers are on the surface.
    let fingers = 0
    // A touch that landed before the slot was read.
    let early: Gesture | null = null
    // `seed=<n>` in the address starts a fresh world from that seed, for stills that come out the same every time.
    const seed = seedFrom(window.location.search)

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A world started from `seed=` is for stills and is never written, so that it cannot overwrite what a child left.
    const cadence = new SaveCadence(() => { if (world && seed === null) ctxRef.current.storage.save(serializeWorld(world)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has been
    // read. Before the slot has been read there is no world yet, and the frame is the bare page. Everything that
    // moves follows the attended clock, so it stands still while the game rests. `spike=1` in the address shows
    // the look spike in place of the game.
    const spike = wantsSpike(window.location.search) ? new SpikeScene(canvas, window.location.search) : null
    const view = new GameView(canvas, PAGE_SEED)
    const draw = () => {
      if (spike) { drawn.drawCalls = spike.draw(width, height, dpr, clock.seconds); return }
      // A surface of another shape shows another part of the page, so who waits at its edge stands elsewhere.
      if (view.fit(width, height, dpr) && world && show) show.retarget(world, view.view)
      // The one thing to touch next, for the idle ladder: never an attempt while someone asks (guide.ts).
      const move = world && !show?.playing ? moveToShow(world) : null
      drawn.drawCalls = view.draw(width, height, dpr, show, guide, move ? (move.on === 'slot' ? `slot:${move.slot}` : move.on) : null)
    }

    // Whatever is due to sound in the next moment, as one voice: inside the touch right after the game has
    // answered it, where audio.ts can hold it for the unlock, and again after each step of the loop.
    const sound = (horizon: number) => {
      const due = show ? show.due(horizon) : []
      if (due.length > 0) audio.play(together(due.map((one) => ({ after: one.after, voice: 'call' in one ? voiceOf(notesOf(one.call)) : puffsOf(one.puffs) }))))
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

    // What the game does with a gesture. It answers when the finger lands, so only `press` matters. A touch
    // ends whatever play is running, which lands everything where the saved world has it, and is then an
    // ordinary touch: the model says what the tap did, the play for it starts, and its outcome is saved at
    // once, before anything of it is shown (scene.ts).
    // A touch on nothing that can be tapped is answered where it landed, by what it landed on: leaves and
    // a swish on the hill, chips and a tick on the stone, scraps of paper and a flick on the bare page.
    const bare = (on: Point, across: number) => {
      if (!show) return
      const of = bareAt(on.x, on.y, show.picture.stone)
      show.flick(on.x, on.y, of)
      show.sound(bareSound(of, across))
    }
    const act = (gestures: Gesture[]) => {
      for (const gesture of gestures) {
        // A touch that lands before the saved world has been read is kept, and answered as soon as it has.
        if (gesture.type === 'press' && !show && !spike) early = gesture
        if (gesture.type !== 'press' || !world || !show || spike) continue
        const where = toStage(width, height, gesture.at.x, gesture.at.y), across = gesture.at.x / Math.max(1, width)
        // A figure of the scene that is playing, on its way to the hill, is the one it will be there: a tap on it
        // is a tap on that one. Anywhere else the finger lands on what the saved world has under it.
        const bound = show.bound(where.x, where.y, world.hill), arriving = bound === null ? -1 : world.hill.findIndex((one) => one.place === bound)
        const action: Action | null = arriving >= 0 ? { type: 'resident', resident: arriving } : whatIsAt(show.picture, world, where.x, where.y)
        const resident = action?.type === 'resident' ? world.hill[action.resident] : undefined
        // The play gives way to the touch, but a voice that has begun is heard to its end: whoever is tapped on
        // the hill while someone else's call of that play sounds joins in with it.
        const heard = resident ? show.sounding(resident.place, world.hill) : null
        show.finish()
        idleSince = clock.seconds; called = 0
        if (action?.type !== 'asker') asked = 0
        if (!resident) poked = null
        if (!action) {
          bare(where, across)
        } else if (resident) {
          // Two of one family, tapped one straight after the other, sing a round. Anyone else calls and does a trick.
          const first = roundWith(world, poked, resident)
          if (first) {
            show.start(directRound(first, resident, world, view.view), () => {})
            show.squash(resident.place)
            // The one tapped now is the one tapped last, so the other of the family, tapped next, sings again.
            poked = { kind: resident.kind, place: resident.place }
          } else {
            // While another one calls, on the hill or anywhere else, it joins in, in its own way; otherwise it calls and does a trick.
            let joined: ReturnType<typeof joinSound> | null = null
            show.poke(resident.place, (remaining, since) => (remaining === null ? 0.03 : (joined = joinSound(resident.kind, remaining, since)).callsAfter), heard)
            show.sound(joined ? (joined as ReturnType<typeof joinSound>).sounds : callSound(resident.kind))
            poked = { kind: resident.kind, place: resident.place }
          }
        } else {
          // Tapped again and again, the one who asks runs out of breath: it takes one huge gulp of air before it
          // calls this time, and the count starts again.
          const breathless = action.type === 'asker' && world.cycle?.asker != null && asked + 1 >= BREATHLESS
          asked = action.type === 'asker' && !breathless ? asked + 1 : 0
          const before = world, step = tap(world, action)
          world = step.world
          if (action.type === 'slot') show.press(`slot:${action.slot}`)
          show.retarget(world, view.view)
          // Never the same crack or burst twice running.
          way = (way + 1 + (step.happened.length % 2)) % 3
          const changed = step.happened.some((one) => !['rollCall', 'peeks', 'basket', 'calls', 'nothing'].includes(one.type))
          const save = () => { if (changed) cadence.change(performance.now(), true) }
          const play = direct(step.happened, action, before, world, view.view, way)
          if (play) show.start(breathless ? withGulp(play) : play, save)
          else {
            save()
            bare(where, across)
          }
        }
        sound(0.25)
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
      fingers += 1
      // The grown-up overlay counts taps of one finger alone: a palm or several fingers landing together are not three taps.
      overlay.press(fingers === 1 ? where.x : -1, where.y, width, event.timeStamp)
      const gestures = touch.down(event.pointerId, where, event.timeStamp)
      // The game has no drag, so a finger that lands is a tap whatever the finger before it did. A tap that slid
      // a little counts as a drag in input.ts, and a finger landing near it within the grace of a lift would
      // only carry that drag on: it is a tap here, with any wait between two taps, long or short.
      act(gestures.length > 0 && !gestures.some((one) => one.type === 'press') ? [...gestures, { type: 'press', at: where }] : gestures)
      // A second finger or a palm while one finger is down makes no move in the game, and is answered all the
      // same, as a touch on the bare page is: a scene that is playing gives way to it as to any touch, and two
      // scraps of paper hop up where it landed, with a soft flick.
      if (gestures.length === 0 && show && !spike) {
        const on = toStage(width, height, where.x, where.y)
        show.finish()
        bare(on, where.x / Math.max(1, width))
        sound(0.25)
      }
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)))
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      // Only a finger that was alone on the surface can have made the grown-up's hold.
      overlay.release(fingers === 1 ? where.x : -1, where.y, width, event.timeStamp)
      fingers = Math.max(0, fingers - 1)
      act(touch.up(event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      overlay.release(-1, 0, width, event.timeStamp)
      fingers = Math.max(0, fingers - 1)
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
      // The show moves on by the step. While something the child set going is still playing the child is
      // watching, not idle. Left alone, the one who asks calls again by itself, and those still hidden answer:
      // soon, then at longer gaps, three times at most (guide.ts). That is the scene's want, not the child's
      // doing, so the ladder is not told of it.
      if (show && world) {
        show.step(step)
        if (show.moving) { ladder.touch(clock.seconds); idleSince = clock.seconds; called = 0 }
        else if (!show.playing && world.cycle?.asker && !world.finished && callsDue(clock.seconds - idleSince) > called) {
          called += 1
          const again = tap(world, { type: 'asker' })
          const play = direct(again.happened, { type: 'asker' }, world, world, view.view, way)
          if (play) show.start(play, () => {}, true)
        }
        sound(0.08)
      }
      // What to show an idle child: a glow on the one thing to touch next, then a ghost hand tapping it once.
      guide = ladder.update(clock.seconds)
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
      fingers = 0
      act(touch.clear())
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // The world is read defensively, and found as it was left: a saved place wins, and `childAge` only chooses
      // where a first visit starts. The show is built standing still, so nothing eases in and no scene replays.
      world = seed === null ? deserializeWorld(value, ctxRef.current.childAge) : freshWorld(ctxRef.current.childAge, seed, placeFrom(window.location.search))
      view.fit(width, height, dpr)
      show = new Show(world, view.view)
      idleSince = clock.seconds
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the surface as it was before the read.
      draw()
      // Every touch is answered: one that came before the read is answered now, where it landed, as a touch on the
      // bare page is. The page showed nothing yet, so it is never a move in the game.
      if (early && early.type === 'press') {
        const kept = early.at, on = toStage(width, height, kept.x, kept.y)
        early = null
        bare(on, kept.x / Math.max(1, width))
        sound(0.25)
        draw()
      }
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
      <canvas ref={canvasRef} aria-label={whoMadeThatSoundManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const whoMadeThatSoundCartridge: Cartridge = {
  manifest: whoMadeThatSoundManifest,
  Mount,
}
