// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { limitsFor } from './layout'
import { brickBusterManifest } from './manifest'
import { Overlay, inCorner } from './overlay'
import { installJamPerf } from './perf'
import { keep as keepNow, putAway, voice } from './putaway'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { deserialize, serialize } from './save'
import { SaveCadence } from './saveCadence'
import { toStage } from './stage'
import { Table } from './table'
import { TableView } from './view'

// The Mount. It wires the table (the rules, table.ts) and its view (view.ts)
// to what the template gives every game: the saved state, attention, the
// attended clock, touch, sound from the first touch, the idle ladder, adaptive
// quality, the grown-up performance handle and the grown-up overlay.

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
    const view = new TableView(canvas)
    // The rules, once the slot has been read.
    let table: Table | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // The finger that is down landed in the grown-up's corner: it is no touch of the child's, and the idle ladder
    // goes on as if it were not there.
    let inGrownUpCorner = false
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
    // The table hands over its state with the ball at rest on the bumper: nothing is saved in the air.
    const cadence = new SaveCadence(() => { if (table) ctxRef.current.storage.save(serialize(table.toSave())) })

    // The one place the game applies a quality tier: what its tiers set besides the pixel ratio, which `resize`
    // applies. It runs once before the first frame and again each time the governor changes tier, ahead of
    // `resize`. The tier is also marked on the canvas, where a still or a probe can read which one is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has been
    // read. With no table yet it draws the bare board; with no size yet the view draws nothing.
    const draw = () => {
      if (table) view.draw(table, playing.guidance)
      else view.blank()
      drawn.drawCalls = view.draws
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
      // The view makes its one fit from the size in CSS pixels, and cuts its sprites again at the new density.
      view.resize(w, h, ratio)
      // The finger targets of the bricks and the ladybird's walk follow the size the table is shown at.
      table?.fitTo(limitsFor(w, h))
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the table does with a gesture. A touch-down is answered there and then: the bumper gives and starts
    // for the finger, or a toy, a brick, the bell or the ladybird answers a poke. A slide moves the bumper, and a
    // lift springs it. Two endings are not the child's doing and flick nothing: a press that is taken away and a
    // drag that is cancelled only let the bumper up. The bumper stays where it stood: it is not a piece in hand.
    const act = (gestures: Gesture[]) => {
      if (!table) return
      for (const gesture of gestures) {
        switch (gesture.type) {
          case 'press': {
            const p = toStage(gesture.at, view.fit)
            // The stage shrinks with the surface and the grown-up's corner does not, so the corner is asked in surface pixels.
            table.press(p.x, p.y, inCorner(gesture.at.x, gesture.at.y, width))
            break
          }
          case 'dragMove':
            table.slide(toStage(gesture.at, view.fit).x)
            break
          case 'tap':
          case 'dragLift':
            table.lift()
            break
          case 'pressEnd':
          case 'dragCancel':
            table.takenAway()
            break
          // The lift was the act: `letGo` ends the drag in the same handler, and nothing is left to do here.
          case 'dragStart':
          case 'dragEnd':
            break
          default:
            // No gesture is left once each has its case. One the game forgets arrives here and stops the typecheck.
            gesture satisfies never
        }
      }
      sound()
      keep()
    }
    // Everything the table set off since the last call is played as one voice, inside the handler that caused
    // it, so the first sound of a visit falls inside the touch, where audio.ts holds it for the unlock.
    // A touch that ended a scene cuts what was sounding first (`voice` in putaway.ts).
    const sound = () => {
      if (table) voice(table, audio)
    }
    // What the table changed goes to storage: where the bumper stands at the throttle, and every change to the
    // wall, the tray, the ball or the position at once, a crack as much as a fall (`keep` in putaway.ts).
    const keep = () => {
      if (table) keepNow(table, cadence, performance.now())
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      inGrownUpCorner = inCorner(where.x, where.y, width)
      if (!inGrownUpCorner) ladder.touch(clock.seconds)
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
      // The lift is the act: the bumper springs. So a lifted drag does not wait for the finger to come back.
      act(touch.letGo())
      inGrownUpCorner = false
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) overlay.forget()
      act(touch.cancel(event.pointerId))
      inGrownUpCorner = false
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
      // A scene the child's play set off, a clearing or an unfolding, is not idleness either: the ladder stays
      // down for as long as it runs, or the ghost hand comes up over the scene. A first showing is a toy's own
      // act and leaves the ladder alone.
      if ((touch.active && !inGrownUpCorner) || table?.holdsLadder) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      playing.guidance = ladder.update(clock.seconds)
      // The table plays the frame's step: its answers' beats, the ball, the poses. Then its notes are played and
      // what it changed is handed to storage.
      if (table) {
        table.step(playing.step)
        sound()
        keep()
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
      inGrownUpCorner = false
      // A game that is put away is the game its own save sets up: the ball at rest on the bumper, every scene at
      // its end, nothing in the air and nothing sounding. So a game that was parked and one that was closed and
      // opened again are found the same. The idle time before the put-away is taken back with it, so the ghost
      // hand does not show the moment the child returns; and `audio.setActive` above has cut whatever was sounding.
      if (table) table = putAway(table, ladder, clock.seconds, limitsFor(width, height))
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts. The table is set up as it was
      // left, with the ball at rest on the bumper: nothing eases in and nothing replays. Its chance comes from
      // one seed, which `seed=<n>` in the address pins, so a still can be taken again.
      const seed = seedOf(window.location.search)
      table = new Table(deserialize(value, ctxRef.current.childAge, seed), seed)
      if (width > 0 && height > 0) table.fitTo(limitsFor(width, height))
      // Then the load draws the first frame itself: a game that is resting or parked has no frame coming.
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
      <canvas ref={canvasRef} aria-label={brickBusterManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const brickBusterCartridge: Cartridge = {
  manifest: brickBusterManifest,
  Mount,
}
