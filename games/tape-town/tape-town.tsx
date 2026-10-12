// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { Desk } from './desk'
import type { Guidance } from './guidance'
import type { Point } from './input'
import { tapeTownManifest } from './manifest'
import { Mix } from './mix'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { deserializeTown } from './save'
import { SaveCadence } from './saveCadence'
import { Town } from './town'
import { View } from './view'

// The Mount, showing the toy: a floor, four rolls of tape, a shoebox and its
// toys. Around it everything from the template is wired and running: the
// saved state, attention, the attended clock, touch, sound from the first
// touch, the idle ladder, adaptive quality, the grown-up performance handle
// and the grown-up overlay. Every rule is in town.ts and every picture in
// view.ts; what a finger and a frame mean is in desk.ts, where it is tested.
// The Mount only carries pointer events in, and sounds, saves and frames
// out.
//
// For whoever takes the stills: `seed=<n>` in the address fixes the game's
// random stream, `tier=<n>` pins a quality tier and `fps=1` shows the
// grown-up overlay.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), mix = new Mix(), desk = new Desk(), clock = new AttendedClock(), touch = desk.touch
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
    let town: Town | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const surface = canvas.getContext('2d'), view = new View(), seed = seedOf(window.location.search)
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
    // The town's record is the template's with the strips, the roll, the box and the toys' places round it
    // (save.ts). It is whole at every instant: a strip still on the roll is not in it, and a toy in the air is
    // in it where it will land.
    const cadence = new SaveCadence(() => { if (town) ctxRef.current.storage.save(town.saved()) })

    // The one place the game applies a quality tier. The pixel ratio is `resize`'s; the rest of a tier (how many
    // leaf shadows drift over the floor, whether torn ends show their fibres) the view reads from
    // `governor.settings` as it paints, so there is nothing to switch here but the mark on the canvas, where a
    // still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame, `resize` calls it after sizing,
    // which can be before the slot is read and while the game rests, and the load calls it once the slot has
    // been read. With no town yet it paints the empty room, and it paints nothing while the surface has no size.
    // The view makes one fit from the surface's size in CSS pixels, the same fit desk.ts uses for touches.
    const draw = () => {
      if (!surface || width <= 0 || height <= 0) return
      drawn.drawCalls = view.paint(surface, width, height, dpr, town, playing.guidance, governor.settings)
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
      // The town learns where the jam's home control lies on its stage, and keeps the bare floor short of it.
      desk.size(w, h)
      // Sizing the backing store wipes the surface, so it is redrawn at once: a resize lands after the frame's
      // own draw, or while the game rests and no frame is coming, and either would leave the surface blank.
      // A three.js game sizes through its renderer instead: `setPixelRatio(ratio)` and `setSize(w, h, false)`
      // take the place of these two assignments.
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // The town queues its sounds as it answers, and they are played here: inside the handler for a touch, where
    // audio.ts can hold the first one for the unlock, and after the step in the loop. Everything one call sets
    // off is joined into one voice, the scene's sounds on the scene's bus (mix.ts). A scene that a touch ended
    // is cut before the touch's own answer is played. A change is handed to storage at the throttle, and the
    // outcome of a scene (the box tipped, the toys called home, a peg aboard) at once.
    const voice = () => {
      if (!town) return
      const out = desk.take()
      if (out.cut) mix.cutScene()
      if (out.sounds.length) audio.play(mix.voice(out.sounds))
      if (out.changed !== 'no') cadence.change(performance.now(), out.changed === 'now')
      // Toys on the move are saved where they have got to when the game next comes to rest.
      else if (town.moving) cadence.mark()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      // The grown-up's corner answers nothing and is no touch for the idle ladder (desk.ts).
      desk.down(event.pointerId, where, event.timeStamp, clock.seconds)
      // Only the working finger counts towards the grown-up's gesture: a palm or a second finger landing is no
      // tap of the three, and does not undo a hold.
      if (touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      voice()
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      // A hold in the grown-up's corner stays there: the working finger leaving it starts that gesture again.
      if (touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      desk.move(event.pointerId, where)
      voice()
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      // The lift is the act: the tape tears when the finger lets go, so a lifted drag ends here and its rip
      // falls inside the touch.
      desk.up(event.pointerId, where, event.timeStamp)
      voice()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) overlay.forget()
      desk.cancel(event.pointerId)
      voice()
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
      // The frame, in desk.ts: a drag that outlasted its lift ends, the idle ladder says what to show (a glow on
      // what can be touched, then one move), and the town steps on the attended clock alone. A finger at work
      // or a scene keeps the ladder at the bottom; a toy going about its habit does not.
      playing.guidance = desk.frame(now, clock.seconds, playing.step)
      voice()
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
      putAway()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)
    // Parked, hidden or closed: the touch ends first (tape still on the roll goes back, and no strip is laid
    // that the finger had not torn off), then whatever is in the air is set down, so the save holds every
    // toy at rest. Nothing queued then is played: a resting game is silent.
    function putAway() {
      desk.putAway(clock.seconds)
      desk.take()
      // Nothing goes on sounding, and nothing is left in the graph to sound when the game is opened again.
      mix.closeAll()
      if (town) cadence.mark()
    }

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved town wins; `childAge` only chooses what a first visit opens on. The town is built as it was
      // left: every strip flat, the box as it lay, every toy where it stood, and no scene replays.
      town = new Town(deserializeTown(value, ctxRef.current.childAge), seed)
      desk.open(town)
      // Then the load draws the first frame itself. A game that is resting or parked when the slot comes back
      // has no frame coming, and would go on showing the empty room.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, so the tape is back on its roll before the last save.
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
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={tapeTownManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const tapeTownCartridge: Cartridge = {
  manifest: tapeTownManifest,
  Mount,
}
