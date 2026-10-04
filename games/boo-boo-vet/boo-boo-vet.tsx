// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { booBooVetManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { deserializeClinic, differsFromSlot, serializeClinic } from './save'
import { voiceOf } from './sound'
import { busy, cancel, drag, drop, freshToy, lift, press, settle, step, takeSave, takeSounds, tap, type Toy } from './toy'
import { scene } from './toyScene'
import { drawSpike } from './view/spike'
import { roomFor, toRoom, type ToyRoom } from './view/toyRoom'
import { drawToy } from './view/toyView'

// The Mount, showing the game: an animal comes in and shows what it needs by
// how it looks and what it does, and the child gives it the thing that helps
// (toy.ts for what happens, toyScene.ts for the frame, view/toyView.ts for the
// drawing, clinic.ts and save.ts for the room that is saved). With `toy` in
// the address the animals need nothing and every give is play, which is the
// toy the game was built on; with `spike` it shows the look spike's fixed
// scene. Around them everything a game needs is wired and running: the saved
// room, attention, the attended clock, touch, sound from the first touch, the
// idle ladder, adaptive quality, the grown-up performance handle and the
// grown-up overlay.

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
    const query = new URLSearchParams(window.location.search)
    // The lead's stills ask for a seed in the address; a visit without one draws its own. A saved room keeps its seed.
    const asked = Number(query.get('seed'))
    const seed = Number.isInteger(asked) && asked > 0 ? asked : Math.floor(Math.random() * 0x7fffffff)
    const spike = query.has('spike'), asToy = query.has('toy')
    let toy: Toy | null = null, place: ToyRoom | null = null, guide: Guidance | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A thing in the hand or in the air is not in the room yet, so it is saved where it came from.
    const cadence = new SaveCadence(() => { if (toy) ctxRef.current.storage.save(serializeClinic(toy.clinic)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has
    // been read. Before the slot is read there is no toy yet, and the bare room is drawn.
    const g = canvas.getContext('2d')!
    const draw = () => {
      if (width <= 0 || height <= 0 || !place) return
      g.setTransform(1, 0, 0, 1, 0, 0)
      g.clearRect(0, 0, canvas.width, canvas.height)
      if (spike) drawn.drawCalls = drawSpike(g, width, height, dpr, clock.seconds)
      else drawn.drawCalls = drawToy(g, place.layout, width, height, dpr, toy ? scene(toy, place.room, place.garden, guide) : [], clock.seconds)
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
      // The room is laid out again for the new size before anything is drawn or touched in it.
      place = roomFor(w, h)
      // Sizing the backing store wipes the surface, so it is redrawn at once: a resize lands after the frame's
      // own draw, or while the game rests and no frame is coming, and either would leave the surface blank.
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the toy queued while it answered: its sounds are played here, inside the handler, so the first one
    // falls inside the touch and `audio.ts` can hold it for the unlock; and what it changed goes to storage, a
    // small change at the throttle and an outcome at once.
    const play = () => {
      if (!toy) return
      for (const notes of takeSounds(toy)) audio.play(voiceOf(notes))
      const need = takeSave(toy)
      if (need) cadence.change(performance.now(), need === 2)
    }

    // What the toy does with a gesture. The thing is taken on the press, so a drag has nothing to start, and
    // every press has one ending: a tap sends the thing, a drag's end lets it go, a press that ends otherwise
    // puts it back.
    const act = (gestures: Gesture[]) => {
      if (!toy || !place) return
      const here = (point: Point) => toRoom(place!.layout, point.x, point.y)
      for (const gesture of gestures) {
        if (gesture.type === 'press') press(toy, place.room, here(gesture.at))
        else if (gesture.type === 'tap') tap(toy)
        else if (gesture.type === 'dragMove') drag(toy, place.room, here(gesture.at))
        else if (gesture.type === 'dragLift') lift(toy)
        else if (gesture.type === 'dragEnd') { drag(toy, place.room, here(gesture.at)); drop(toy, place.room) }
        else if (gesture.type === 'pressEnd') cancel(toy)
      }
      play()
    }
    // At rest nothing is in the air: a thing in the hand goes back where it last lay and one in flight lands. The
    // touch in progress is dropped unplayed, since its lift will never arrive: a drag that was parked is not a drop,
    // so no give is made that the child did not make.
    const rest = () => {
      touch.clear()
      if (!toy) return
      if (place) settle(toy, place.room)
      takeSounds(toy)
      if (takeSave(toy)) cadence.change(performance.now(), true)
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
    // The browser took the finger away: that is not a lift. The touch is dropped unplayed and a thing in the hand
    // goes back where it last lay, so no drag ends where it happened to be and nothing is given that the child did
    // not give.
    const onCancel = () => {
      touch.clear()
      if (toy) { cancel(toy); play() }
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
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      if (touch.active) ladder.touch(clock.seconds)
      if (toy && place) {
        // A thing in the air, a cell, a reaction, a scene or the exchange at the door is not idleness either.
        if (busy(toy)) ladder.touch(clock.seconds)
        step(toy, place.room, seconds)
        play()
      }
      // What to show an idle child: a glow on what can be touched, then one move.
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
    // called off (`rest`), and the newest state is handed to storage.
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      rest()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      // A saved position wins; `childAge` only chooses where a first visit starts. The toy and the game keep the
      // same room in the same record.
      toy = freshToy(deserializeClinic(value, ctxRef.current.childAge, seed, undefined, asToy), asToy)
      // A first visit has its seed and its first patient from this moment, and they are saved at once: put away
      // before any touch, the game opens again with the same one waiting. A repaired save is written back likewise.
      if (differsFromSlot(value, toy.clinic)) cadence.change(performance.now(), true)
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
      // As on going to rest: the thing in the hand is back where it last lay before the last save.
      rest()
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
      <canvas ref={canvasRef} aria-label={booBooVetManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const booBooVetCartridge: Cartridge = {
  manifest: booBooVetManifest,
  Mount,
}
