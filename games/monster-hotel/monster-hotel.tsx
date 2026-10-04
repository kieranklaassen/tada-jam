// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder, type Guidance } from './guidance'
import { InkPage } from './ink'
import { PAPER } from './inkHatch'
import { demoScene } from './inkDemo'
import { layoutPage, type PageLayout } from './layout'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { monsterHotelManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { voiceOf } from './sound'
import { Play } from './play'
import { arrangementOf, readStay, writeStay } from './stay'

// The Mount, showing the game: touch a guest, and the page is drawn again from
// where it stands; give out the rooms until every guest is content (play.ts). Everything a game needs around its renderer is
// wired and running: the saved state, attention, the attended
// clock, touch, sound from the first touch, the idle ladder, adaptive quality,
// the grown-up performance handle and the grown-up overlay. The renderer, the
// rules and the sounds go in where the comments say.

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
    // Grown-ups only: a finger held a second in the top right corner and lifted there, then three taps there within three seconds, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let play: Play | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // What the idle ladder said last, kept for the draw so the glow and the ghost hand reach the page without a second call.
    let guidance: Guidance | null = null
    // A fixed seed from the address, for stills (`seed=<n>`); otherwise a new one for the visit. It only chooses fidgets:
    // which coach-load comes next is the designed order's, and never chance.
    const asked = Number(new URLSearchParams(window.location.search).get('seed'))
    const seed = Number.isInteger(asked) && asked > 0 ? asked : 1 + Math.floor(Math.random() * 0x7fffffff)
    // The look spike: the ink page and the 2D surface it draws its one fixed scene on. Nothing is playable behind it yet.
    const page = new InkPage(), surface = canvas.getContext('2d')

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // A guest in the hand is never in the saved house: the stay holds it where it came from until it is set down.
    const cadence = new SaveCadence(() => { if (play) ctxRef.current.storage.save(writeStay(play.stay)) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The page takes the tier with its size (`page.resize`), and the tier is marked on the
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => { canvas.dataset.tier = String(governor.tier); page.resize(width, height, dpr, governor.tier) }

    // The one place the game draws its frame. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    // Grown-ups and stills only: `demo=<name>` in the address draws one of the page's fixed scenes (inkDemo.ts) in place of the game.
    const demo = new URLSearchParams(window.location.search).get('demo')
    // The page's layout for the surface as it is now, for touches and for the game's scene.
    let laid: PageLayout | null = null
    const layout = (): PageLayout | null => {
      if (!play || width <= 0 || height <= 0) return null
      const shape = arrangementOf(play.stay).house.shape
      if (!laid || laid.width !== width || laid.height !== height || laid.shape !== shape) laid = layoutPage(width, height, shape)
      return laid
    }
    const draw = () => {
      if (!surface) return
      const where = layout()
      if (demo) drawn.drawCalls = page.draw(surface, demoScene(demo, clock.seconds), clock.seconds)
      else if (play && where) drawn.drawCalls = page.draw(surface, play.scene(where, guidance), clock.seconds)
      else {
        // Before the slot has been read there is no house to draw: the bare paper.
        surface.setTransform(1, 0, 0, 1, 0, 0)
        surface.fillStyle = PAPER
        surface.fillRect(0, 0, canvas.width, canvas.height)
        drawn.drawCalls = 0
      }
    }
    // The game queues its sounds and what it wants saved; both are taken here, right after it has answered, so the
    // first sound falls inside the touch. Everything one touch sets off is played as one voice: while the sound
    // is still locked `audio.ts` holds only the newest voice, and a grunt must not be lost to the pen that follows it.
    const settle = () => {
      if (!play) return
      const sounds = play.takeSounds()
      if (sounds.length > 0) audio.play(voiceOf(sounds.flat()))
      const save = play.takeSave()
      if (save !== 'none') cadence.change(performance.now(), save === 'now')
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
      page.resize(width, height, dpr, governor.tier)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture: the game answers it at once, and its sounds and its save follow in the same call.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    const act = (gestures: Gesture[]) => {
      const where = layout()
      if (!play || !where || demo) return
      for (const gesture of gestures) play.gesture(gesture, where)
      settle()
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
      const where = at(event)
      overlay.release(where.x, where.y, width, event.timeStamp)
      act(touch.up(event.pointerId, where, event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      // A touch that is taken away is no lift in the corner: it arms nothing.
      overlay.release(-1, -1, width, event.timeStamp)
      const gestures = touch.cancel(event.pointerId, event.timeStamp)
      act(gestures)
      // The working finger's touch was taken, which is not a finger letting go: what is in the hand goes back where it came from unless a finger comes back for it. A palm or a second finger that is taken away is none of the carry's business.
      if (gestures.length > 0) play?.takenAway()
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
      if (touch.active || play?.busy) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      guidance = ladder.update(clock.seconds)
      // The game plays the step: springs settle, lamps swing, the tuba keeps its beat. What it sounded is played here.
      if (play && !demo) {
        play.step(step)
        settle()
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
      // What is in the hand goes back where it came from, and only then is the touch ended: ended first, the drag
      // would set the guest or the thing down under the finger, a move the child did not make.
      play?.rest()
      act(touch.clear())
      settle()
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      play = new Play(readStay(value, ctxRef.current.childAge), seed)
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
      // As on going to rest: what is in the hand goes back where it came from, then the touch ends, then the last save.
      play?.rest()
      act(touch.clear())
      settle()
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
      <canvas ref={canvasRef} aria-label={monsterHotelManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const monsterHotelCartridge: Cartridge = {
  manifest: monsterHotelManifest,
  Mount,
}
