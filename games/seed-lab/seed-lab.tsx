// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { CAST } from './cast'
import { BACKDROP } from './config'
import { Game } from './game'
import { IdleLadder, type Guidance } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { drawPage } from './journal'
import { deserializeLab, serializeLab, slotIsEmpty } from './lab'
import { letGo } from './lift'
import { layoutOf, type Layout } from './layout'
import { poseLive, poseView } from './livePoses'
import { seedLabManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { voiceOf } from './sound'
import { spikePage, type PageView } from './spikePage'

// The Mount, showing the game: the journal page, a finger's dab and what
// answers it, the visitors and the beetle's scenes. Around it the template's
// wiring is as it came: the saved state,
// attention, the attended clock, touch, sound from the first touch, the idle
// ladder, adaptive quality, the grown-up performance handle and overlay.
//
// In the address: `seed=<n>` fixes the page's chance for a new page, so a
// still can be taken twice; `spike=1` shows the look spike's fixed page
// instead of the toy, and `pose=<name>` one named moment of it in motion.

/** The page before the slot has been read: the paper and its furniture, with nothing on it. */
const BARE: PageView = { seed: 20261003, plants: [], dry: [], packets: [], buds: false, pods: [], visitor: null, waiting: null, kept: [], beetle: { at: 'corner' }, worm: null }

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
    const params = new URLSearchParams(window.location.search), pose = params.get('pose'), spike = params.get('spike') === '1' || pose !== null ? spikePage() : null
    // The seed a new page takes: the address's, for the lead's stills, or a new one for this visit. A saved page keeps its own.
    const asked = params.has('seed') ? Number(params.get('seed')) : NaN
    const freshSeed = Number.isInteger(asked) && asked >= 0 ? asked >>> 0 : Math.floor(Math.random() * 0x100000000)
    let toy: Game | null = null, guidance: Guidance | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // The page the toy holds is always at rest (a plant in the hand still stands, in the page, in its pot), so it is saved as it is.
    const cadence = new SaveCadence(() => { if (toy) ctxRef.current.storage.save(serializeLab(toy.state)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    // Before the slot is read there is no page yet, and it draws the bare paper of the look.
    const pen = canvas.getContext('2d')!
    let laid: Layout | null = null
    const draw = () => {
      if (width <= 0 || height <= 0) return
      // The view is told the new size before it draws, and the toy with it.
      if (!laid || laid.w !== width || laid.h !== height) {
        laid = layoutOf(width, height)
        toy?.resize(laid)
      }
      pen.setTransform(dpr, 0, 0, dpr, 0, 0)
      if (spike) drawn.drawCalls = drawPage(pen, poseView(pose, spike), laid, clock.seconds, governor.tier, undefined, poseLive(pose, spike, laid, clock.seconds))
      else if (toy) drawn.drawCalls = drawPage(pen, toy.view(), laid, clock.seconds, governor.tier, undefined, toy.motion)
      else drawn.drawCalls = drawPage(pen, BARE, laid, 0, governor.tier)
    }

    // What the toy has to say is played here, and what it changed is handed to storage: at once for a pod set,
    // a pod burst or a seed sown, at the throttle for a plant or a pot carried. Both are called in the gesture
    // handler right after the toy has answered, so the first sound falls inside the touch, and again after the
    // toy's step in the loop.
    const hear = () => {
      if (!toy) return
      const sounds = toy.fx.sounds
      for (let i = 0; i < sounds.length; ) {
        if (sounds[i].after <= 0) audio.play(voiceOf(sounds.splice(i, 1)[0].parts))
        else i++
      }
      if (toy.changed) {
        cadence.change(performance.now(), toy.changed === 2)
        toy.changed = 0
      }
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

    // What the game does with a gesture: one finger, answered where it lands. A press ends a scene that is
    // playing first thing, before it is answered (the game does that itself, in `gesture`).
    const act = (gestures: Gesture[]) => {
      if (!toy || spike || gestures.length === 0) return
      for (const gesture of gestures) toy.gesture(gesture)
      hear()
    }
    // Going to rest or being put away mid-touch: the touch is dropped and what was in the hand goes back where
    // it came from. The game makes no move the child did not finish.
    const putAway = () => {
      // A finger that was still down did not finish, and its gestures are thrown away. A drop is taken at the lift
      // (`lift.ts`), so none is waiting here; were one ever waiting, it would be taken now and not lost.
      const finished = touch.lifted, gestures = touch.clear()
      if (!toy || spike) return
      if (finished) for (const gesture of gestures) toy.gesture(gesture)
      toy.putAway()
      hear()
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
      // Only a first finger counts towards the grown-up's gesture in the corner: a whole hand set down there is one.
      if (event.isPrimary) overlay.down(where.x, where.y, width, event.timeStamp)
      act(touch.down(event.pointerId, where, event.timeStamp))
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)))
    const onUp = (event: PointerEvent) => {
      if (event.isPrimary) { const where = at(event); overlay.up(where.x, where.y, width, event.timeStamp) }
      // The drop is taken at the lift, and its sound falls inside the touch.
      act(letGo(touch, event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    // The browser took the working pointer away: the finger never let go, so no move is made, and what it held goes
    // back. A palm or a second finger taken away is nothing to the finger that is working.
    const onCancel = (event: PointerEvent) => {
      if (touch.holds(event.pointerId)) putAway()
      audio.touchUp()
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // Advances the attended clock. It returns the step to play, in seconds: the toy and every animation advance by it.
      const step = clock.advance(now)
      const start = performance.now()
      act(touch.advance(now))
      // A finger that is working is not idle: a hold or a slow drag keeps the ladder at the bottom.
      // A scene that is playing is not idleness either. A game with short scenes makes the same call for as long
      // as one runs (`if (scene.running) ladder.touch(clock.seconds)`), or the ghost hand comes up over the scene.
      // Nor is a brood on its way, or a scene that is playing: while anything is still in motion that the child
      // set off, or that the beetle is showing, the ladder stays at the bottom.
      if (touch.active || toy?.fx.busy || toy?.sceneRunning) ladder.touch(clock.seconds)
      // What to show an idle child: a ring on what can be touched, then one move. The toy places both.
      guidance = ladder.update(clock.seconds)
      if (toy && !spike) {
        toy.step(step, guidance)
        hear()
      }
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
    // ended, since its lift will never arrive (what a drag held goes back where it came from, a press ends without a tap), and the
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
      putAway()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    // A read that failed is not an empty slot: the page is fresh, but nothing is written over the slot until the child changes it.
    let read = true
    ctxRef.current.storage.load<unknown>().catch(() => { read = false; return null }).then((value) => {
      if (disposed) return
      // A saved page wins over the age and over the seed: `childAge` only chooses where a first visit starts.
      const state = deserializeLab(value, ctxRef.current.childAge, freshSeed)
      // The toy is built from the page as it was left: every plant grown, a pod that was set waiting on its
      // plant, nothing easing in and nothing replayed. Then the load draws the first frame itself. A game that
      // is resting or parked when the slot comes back has no frame coming, and would go on showing bare paper.
      toy = new Game(state, laid ?? layoutOf(Math.max(1, width), Math.max(1, height)), state.seed, CAST)
      toy.step(0, null)
      // A page made for an empty slot is saved just now, seed and all: opened, looked at and put away, it is the same page
      // next time, with the same animal waiting. A slot that could not be read, or holds what this build cannot read, is left as it is.
      if (read && slotIsEmpty(value) && !spike) cadence.change(performance.now(), true)
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      // As on going to rest: the touch ends first, and the thing in hand is back where it came from before the last save.
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
      <canvas ref={canvasRef} aria-label={seedLabManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const seedLabCartridge: Cartridge = {
  manifest: seedLabManifest,
  Mount,
}
