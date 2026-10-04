// template: cartridge/game.tsx v2
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { IdleLadder } from './guidance'
import { ForgivingTouch, type Gesture, type Point } from './input'
import { princessPlaygroundManifest } from './manifest'
import { CORNER, Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { Game, type Touched } from './game'
import { Grains } from './grains'
import { load } from './save'
import { voiceOf } from './sound'
import { Stage, type StageView } from './view/stage'
import { PLANK } from './world'

// The Mount, showing a blank surface. Everything a game needs around its
// renderer is wired and running: the saved state, attention, the attended
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
    // Grown-ups only: three quick taps in the top right corner, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay. A canvas 2D game counts the
    // sprites and figures it drew as drawCalls; a three.js game copies the renderer's own counts.
    // The game is made when the slot has been read. Until then the stage draws the bare tray.
    let game: Game | null = null
    // The grains' positions are one buffer the game writes and the stage draws; it is made here so both can hold it.
    const grainPool = new Grains()
    const stage = new Stage(canvas, grainPool.positions)
    const drawn = stage.drawn
    const view: StageView = { frame: null as never, hand: null, rakeOut: false, rakeSweep: null, grainsFlying: false }
    // A fixed seed for stills: `seed=<n>` in the address. Otherwise each visit draws its own, which only picks ordinary detail.
    const seedText = new URLSearchParams(window.location.search).get('seed')
    const seed = seedText !== null && Number.isFinite(Number(seedText)) ? Number(seedText) : Math.floor(Math.random() * 2 ** 31)
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it.
    // The game hands a change to storage where it makes it, at one of two speeds:
    //   cadence.change(performance.now())        a small change that keeps coming (a dab, a step of a drag, a
    //                                            piece set down): at most once per throttle window
    //   cadence.change(performance.now(), true)  a scene's outcome, a cycle judged, the position moved: at once,
    //                                            since a put-away in the next moment must find it saved
    // Going to rest writes whatever the throttle still holds (`cadence.settle`, below).
    // What is saved is who is where: never a friend in the air or in the hand (`game.saved`).
    const cadence = new SaveCadence(() => { if (game) ctxRef.current.storage.save(game.saved()) })

    // The one place the game applies a quality tier: whatever its tiers set besides the pixel ratio, which
    // `resize` applies. It runs once before the first frame and again each time the governor changes tier, ahead
    // of `resize`, since `resize` does nothing when the size and the pixel ratio stay as they were (on a display
    // of ratio 1 they always do). The blank surface has nothing to switch: it marks the tier it was given on its
    // canvas, where a still or a probe can read which tier is applied.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      stage.setGrain(governor.settings.grain)
    }

    // The one place the game draws its frame; the blank surface draws nothing. The loop calls it on every frame,
    // `resize` calls it after sizing, which can be before the slot is read and while the game rests, and the
    // load calls it once the slot has been read.
    const draw = () => {
      if (width <= 0) return
      if (!game) {
        stage.render(null)
        return
      }
      view.frame = game.frame
      view.hand = game.guide.hand
      view.rakeOut = game.rakeOut
      view.rakeSweep = game.rakeSweep
      view.grainsFlying = game.grains.flying > 0
      stage.render(view)
    }

    // What the game asks for after it has answered a touch or played a step: its sounds, its marks in the sand,
    // and a save at one of the two speeds. Called inside the gesture handler, so a first sound falls inside the
    // touch, and again after the game's step in the loop.
    const flush = () => {
      if (!game) return
      for (const cue of game.takeCues()) {
        if (cue.type === 'voice') audio.play(voiceOf(cue.parts))
        else if (cue.type === 'dimple') stage.map.dimple(cue.x, cue.z, cue.radius, cue.depth)
        else if (cue.type === 'groove') stage.map.groove(cue.x0, cue.z0, cue.x1, cue.z1, 0.2)
        else if (cue.type === 'bite') stage.map.bite(cue.x, PLANK.halfWidth, cue.strength)
        else if (cue.type === 'swirl') stage.map.swirl(cue.x, cue.z, cue.radius)
        else if (cue.type === 'raked') stage.map.fromMarks(game.world.marks)
        // The rake itself is drawn across by the stage, which rakes the sand behind it.
      }
      if (game.wantsSave !== 'no') {
        cadence.change(performance.now(), game.wantsSave === 'now')
        game.wantsSave = 'no'
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
      stage.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    // What the game does with a gesture. The blank surface only answers a touch with a sound.
    // A game with short scenes ends the one that is playing first thing in every press, before the press is
    // answered (`finish` in scene.ts). A gesture that changes the state hands it to storage here (`cadence`, above).
    // The step a carried friend keeps from the place the finger points at on the sand.
    let carry = { x: 0, z: 0 }
    const act = (gestures: Gesture[]) => {
      if (!game) return
      for (const gesture of gestures) {
        if (gesture.type === 'press') {
          const hit = stage.pick(gesture.at.x, gesture.at.y, game.frame)
          game.press(hit as Touched)
        } else if (gesture.type === 'tap') game.tap()
        else if (gesture.type === 'dragStart') {
          game.dragStart()
          // The friend rises from under the finger. Over the sand it keeps the step it stood from the place the finger
          // pointed at, so it does not jump as it is lifted.
          const id = game.play.held
          const under = id ? stage.groundAt(gesture.from.x, gesture.from.y, game.frame, id) : null
          carry = id && under ? { x: Math.max(-1.2, Math.min(1.2, game.frame.poses[id].x - under.x)), z: Math.max(-1.2, Math.min(1.2, game.frame.poses[id].z - under.z)) } : { x: 0, z: 0 }
        } else if (gesture.type === 'dragMove') {
          // What the finger points at is where the friend in the hand hangs, and so where it will come down: the
          // board when the finger is on the board's picture, a friend's place when it is on that friend, else the sand.
          const under = stage.groundAt(gesture.at.x, gesture.at.y, game.frame, game.play.held)
          const over = under ? (under.on === 'sand' ? { x: under.x + carry.x, z: under.z + carry.z } : { x: under.x, z: under.z }) : null
          game.dragTo(over, stage.sandAt(gesture.at.x, gesture.at.y))
        }
        else if (gesture.type === 'dragEnd') game.dragEnd()
        else if (gesture.type === 'dragAbort') game.dragAbort()
        else if (gesture.type === 'pressEnd') game.pressEnd()
        // A lifted finger mid-drag: the friend in hand hangs where it is and waits out the grace.
      }
      flush()
    }
    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    // The fingers on the surface now, for the overlay: a hand laid on the corner is not three taps.
    const fingers = new Set<number>()
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      ladder.touch(clock.seconds)
      const where = at(event)
      fingers.add(event.pointerId)
      overlay.press(where.x, where.y, width, event.timeStamp, fingers.size)
      // The grown-up corner is bare cloth and answers nothing: no sound, no mark, so nothing there invites a child to tap it.
      // It still ends a scene, as any touch does.
      if (width > 0 && where.x >= width - CORNER && where.y <= CORNER) {
        game?.touchNothing()
        return
      }
      const gestures = touch.down(event.pointerId, where, event.timeStamp)
      // A second finger beside the one that is working is no gesture, but it is a touch: it ends a scene.
      if (gestures.length === 0) game?.touchNothing()
      act(gestures)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => act(touch.move(event.pointerId, at(event)))
    const onUp = (event: PointerEvent) => {
      fingers.delete(event.pointerId)
      act(touch.up(event.pointerId, at(event), event.timeStamp))
      audio.touchUp()
    }
    const onCancel = (event: PointerEvent) => {
      fingers.delete(event.pointerId)
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
      if (touch.active || game?.sceneRunning) ladder.touch(clock.seconds)
      // What to show an idle child: a glow on what can be touched, then one move.
      const guidance = ladder.update(clock.seconds)
      if (game) {
        game.step(step, guidance)
        flush()
      }
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
    // ended, since its lift will never arrive (a carried friend goes back to where it was picked up from, a press
    // ends without a tap), and the
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
      // A finger that had already let go made the child's own drop, which is made now. A friend still in the hand
      // goes back to where it was picked up from: put away makes no move.
      if (touch.lifted) act(touch.clear())
      game?.putAway()
      fingers.clear()
      act(touch.clear())
      cadence.settle(performance.now())
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses where a first visit starts.
      const world = load(value, ctxRef.current.childAge)
      game = new Game(world, seed, grainPool)
      // The sand as it was left: each cell of the saved grid drawn from its digit.
      stage.map.fromMarks(world.marks)
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
      // As on going to rest: a drop already made is made, and a friend still in the hand goes back to where it was picked up from.
      if (touch.lifted) act(touch.clear())
      game?.putAway()
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
      stage.dispose()
      audio.dispose()
    }
  }, [])

  useEffect(() => { attendRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: BACKDROP, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
      <canvas ref={canvasRef} aria-label={princessPlaygroundManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const princessPlaygroundCartridge: Cartridge = {
  manifest: princessPlaygroundManifest,
  Mount,
}
