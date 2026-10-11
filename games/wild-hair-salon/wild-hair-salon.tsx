// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { fit } from './layout'
import { wildHairSalonManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { voiceOf } from './sound'
import { SPIKE_SEED, SpikeView, browserSheet } from './spike'
import { Sprites } from './sprites'
import { Play } from './play'
import { drawFrame } from './view'

// The Mount, showing the game: a customer under the cape whose lock is made
// as long as its friend's, by pulling it longer and snipping it shorter.
// Around it, from the template: the saved state, attention, the attended clock, touch, sound from
// the first touch, the idle ladder, adaptive quality, the grown-up
// performance handle and the grown-up overlay.
//
// In the address: `seed=<n>` fixes the stream the motion draws from, for a
// still; `spike=1` shows the painted look spike instead of the game.

/** How long the top right corner is held before its taps reach the grown-up's numbers, and for how long they do then, in ms. */
const CORNER_HOLD_MS = 1000, CORNER_ARMED_MS = 4000

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
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    const query = new URLSearchParams(window.location.search)
    // A fixed seed from the address, for the lead's stills; otherwise a new one for the visit.
    const asked = Number(query.get('seed'))
    const play = new Play(query.has('seed') && Number.isFinite(asked) ? asked : Math.floor(Math.random() * 0xffffffff))
    let guidance: Guidance | null = null
    // The grown-up's corner (overlay.ts): a press that lands there is not the game's.
    let cornered = false, cornerDownAt = 0, cornerArmedUntil = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    const cadence = new SaveCadence(() => { const saved = play.saved(); if (saved) ctxRef.current.storage.save(saved) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    // The painted pieces are made for the surface's size and pixel ratio, and made again when either changes.
    // Before the slot has been read there is no game, and the frame is the bare room.
    const spike = query.get('spike') === '1' ? new SpikeView(browserSheet) : null
    let sprites: Sprites | null = null, spritesFor = ''
    const draw = () => {
      const g = canvas.getContext('2d')
      if (!g || canvas.width <= 0 || canvas.height <= 0) return
      if (spike) { drawn.drawCalls = spike.draw(g, canvas.width, canvas.height); return }
      const size = `${canvas.width}x${canvas.height}`
      if (!sprites || spritesFor !== size) {
        sprites?.dispose()
        sprites = new Sprites(browserSheet, canvas.width, canvas.height, SPIKE_SEED)
        spritesFor = size
      }
      drawn.drawCalls = drawFrame(g, canvas.width, canvas.height, sprites, { play, guidance })
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

    // What the game does with a gesture: the finger's points go to scene units, the game answers, its notes are
    // played here, inside the handler, where audio.ts can hold the first one for the unlock, and a change is
    // handed to storage: a scene's outcome at once, a small change at the throttle.
    const toStage = (p: Point): Point => {
      const f = fit(width, height)
      return f.scale > 0 ? { x: (p.x - f.dx) / f.scale, y: (p.y - f.dy) / f.scale } : p
    }
    const staged = (gesture: Gesture): Gesture => {
      switch (gesture.type) {
        case 'press': case 'tap': case 'pressEnd': return { type: gesture.type, at: toStage(gesture.at) }
        case 'dragStart': return { type: gesture.type, from: toStage(gesture.from) }
        default: return { type: gesture.type, from: toStage(gesture.from), at: toStage(gesture.at) }
      }
    }
    const sound = () => {
      const notes = play.takeNotes()
      if (notes.length > 0) audio.play(voiceOf(notes))
      const save = play.takeSave()
      if (save) cadence.change(performance.now(), save === 'now')
    }
    const act = (gestures: Gesture[]) => {
      for (const gesture of gestures) {
        // The corner the grown-up's numbers open from answers a touch like any other part of the wall.
        if (gesture.type === 'press') cornered = gesture.at.x > width - 72 && gesture.at.y < 72
        if (!spike) play.gesture(staged(gesture))
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
      // The grown-up's numbers take three quick taps in the corner, and here only after the corner has been held
      // down for a second first: a child who drums on that corner does not open them.
      const inCorner = where.x > width - 72 && where.y < 72
      if (inCorner) cornerDownAt = event.timeStamp
      if (!inCorner || event.timeStamp <= cornerArmedUntil) overlay.press(where.x, where.y, width, event.timeStamp)
      act(touch.down(event.pointerId, where, event.timeStamp))
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)))
    const onUp = (event: PointerEvent) => {
      // The hold counts only if the finger also comes up in the corner: a slow swipe that began there does not.
      const up = at(event)
      if (cornered && cornerDownAt > 0 && up.x > width - 72 && up.y < 72 && event.timeStamp - cornerDownAt >= CORNER_HOLD_MS) cornerArmedUntil = event.timeStamp + CORNER_ARMED_MS
      cornerDownAt = 0
      act(touch.up(event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    // A finger the browser takes away, and a touch still down when the game is put away, let go of nothing and
    // press nothing: whatever was in the fingers is as it was, and a door or a knot under them is not touched.
    // The one exception is a drag the child has already let go of, whose end the tracker was still holding back for
    // a finger that might return: that let-go is the child's own, and it lands where it was made.
    const abandon = (ended: Gesture[]) => {
      if (ended.length === 0 || spike) return
      if (play.lifted) act(ended)
      else play.abandon()
    }
    const onCancel = (event: PointerEvent) => {
      // A drag the browser takes is not waited out as a lift is: it is given up at once.
      if (touch.cancel(event.pointerId, event.timeStamp).length > 0) { touch.clear(); if (!spike) play.abandon() }
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
      if (touch.active || play.inScene) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
      // The game plays the step: the scene, the puppets, the hair and what is in the air. The two in the salon do
      // things of their own only while no finger is working and no scene is playing.
      play.step(step, !touch.active)
      sound()
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
    // given up, since its lift will never arrive: it makes no move the child did not make. The newest state
    // is handed to storage.
    const attention = new Attention(document, (awake) => {
      audio.setActive(awake)
      if (awake) {
        if (!frame) frame = requestAnimationFrame(loop)
        return
      }
      cancelAnimationFrame(frame)
      frame = 0
      clock.rest()
      abandon(touch.clear())
      // A scene that was playing ends here, in the state it was saved in when it began, and is not gone on with later.
      if (!spike) play.putAway()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      play.open(value, ctxRef.current.childAge)
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
      // As on going to rest: a touch still down is given up before the last save, and makes no move of its own.
      abandon(touch.clear())
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
      sprites?.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={wildHairSalonManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const wildHairSalonCartridge: Cartridge = {
  manifest: wildHairSalonManifest,
  Mount,
}
