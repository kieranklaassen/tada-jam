// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio, voiceOf } from './audio'
import { BACKDROP } from './config'
import type { Guidance } from './guidance'
import type { Point } from './input'
import { rainbowWorldManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { Play } from './play'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { seedOf } from './rng'
import { deserialize, placesOf, serialize, withPlaces, type Save } from './save'
import { SaveCadence } from './saveCadence'
import { SceneGain } from './sceneSound'
import { notesOf } from './sounds'
import { RainbowView } from './view'
import { World } from './world'

// The Mount. It wires the world (world.ts), what fingers and frames do to it (play.ts) and the view (view.ts)
// to the shell: the saved mat, attention, the attended clock, pointers, sound from the first touch, adaptive
// quality, the grown-up performance handle and the grown-up overlay.
//
// One clock for sight and sound. The attended clock's step is handed to `world.step`, and that is the only
// time the world or the view ever sees. The world asks for its sounds at its own moments, and they are played
// here straight after each gesture and each step. The wall clock is read in this file for three things that are
// not play: the save throttle, the frame's cost for the governor, and the grown-up's gesture.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), sceneGain = new SceneGain(), clock = new AttendedClock()
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface. For this canvas game a draw call is a sprite stamped or a fresh
    // fill or stroke, which is also what the frame-budget test counts.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    // The look's own chance (where the paper is creased) comes from one seed: `seed=<n>` in the address pins it.
    const view = new RainbowView(canvas, seedOf(window.location.search))
    let save: Save | null = null, world: World | null = null, play: Play | null = null
    let disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0, saved = 0, hushed = 0
    const playing = { step: 0, guidance: null as Guidance | null }

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it. The save takes
    // every thing at rest: a thing in hand where it came from, a thing in the air where it is going.
    const cadence = new SaveCadence(() => {
      if (!save || !world) return
      save = withPlaces(save, world.places(), world.basket)
      ctxRef.current.storage.save(serialize(save))
    })
    // A thing set down, sent back or turned over, and a scene's outcome at its start, is one whole change, so each is saved at once.
    const keep = () => {
      if (!world || world.changes === saved) return
      saved = world.changes
      cadence.change(performance.now(), true)
    }
    // Everything one moment set off is played as one voice, inside the handler when a touch set it off. A scene's
    // sounds go through the scene's own gain, which is shut the moment a touch or a put-away ends the scene.
    const sound = () => {
      if (!world) return
      if (world.hushes !== hushed) { hushed = world.hushes; sceneGain.hush() }
      const sounds = world.takeSounds()
      const scene = sounds.filter((each) => each.scene), plain = sounds.filter((each) => !each.scene)
      if (scene.length) audio.play(sceneGain.voice(notesOf(scene)))
      if (plain.length) audio.play(voiceOf(notesOf(plain)))
    }
    const after = () => { sound(); keep() }

    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      view.setTier(governor.settings)
    }

    // The one place the frame is drawn. With no world yet it draws the bare garden of the look.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      const cost = view.draw(world, playing.guidance)
      drawn.drawCalls = cost.stamps + cost.pen
    }

    // The shell can resize the surface without a window resize event, so the surface watches itself.
    const resize = (): boolean => {
      const w = root.clientWidth, h = root.clientHeight
      // A parked surface measures 0×0; keep the last good size.
      if (w <= 0 || h <= 0) return false
      const ratio = Math.min(window.devicePixelRatio || 1, governor.settings.dpr)
      if (w === width && h === height && ratio === dpr) return false
      width = w; height = h; dpr = ratio
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      // The view is told the new size and ratio before it draws: the paper is cut again at that density.
      view.resize(w, h, ratio)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    const at = (event: PointerEvent): Point => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake || !play) return
      audio.touchDown()
      const where = at(event)
      play.down(event.pointerId, where, event.timeStamp, width)
      // Only the working finger counts towards the grown-up's gesture.
      if (play.touch.holds(event.pointerId)) overlay.press(where.x, where.y, width, event.timeStamp)
      after()
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (!play) return
      const where = at(event)
      if (play.touch.holds(event.pointerId)) overlay.move(where.x, where.y, width)
      play.move(event.pointerId, where, width)
      after()
    }
    const onUp = (event: PointerEvent) => {
      if (!play) return
      const where = at(event)
      if (play.touch.holds(event.pointerId)) overlay.lift(where.x, where.y, width, event.timeStamp)
      play.up(event.pointerId, where, event.timeStamp, width)
      after()
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: a drag is cancelled, not dropped.
    const onCancel = (event: PointerEvent) => {
      if (!play) return
      if (play.touch.holds(event.pointerId)) overlay.forget()
      play.cancel(event.pointerId, width)
      after()
      audio.touchUp()
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // The attended clock's step is the only time the world is given.
      playing.step = clock.advance(now)
      const start = performance.now()
      if (play) {
        // The world and the idle ladder are given the same step, and nothing else moves them.
        playing.guidance = play.frame(playing.step)
        after()
      }
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      playing.step = 0
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. A touch in progress is
    // ended, since its lift will never arrive, nothing stays in hand, a scene ends at its saved outcome, and the
    // world is as a load would make it (play.ts). Then the mat is handed to storage.
    const rest = () => {
      overlay.forget()
      play?.rest(width)
      playing.guidance = null
      // Nothing of a scene rings on, and nothing that was about to sound does.
      sceneGain.hush()
      hushed = world ? world.hushes : 0
      keep()
      cadence.settle(performance.now())
    }
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
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved mat wins; `childAge` only chooses how the mat lies on a first visit.
      save = deserialize(value, ctxRef.current.childAge)
      // The world is set up as it was left: nothing eases in and nothing replays.
      world = new World(placesOf(save), save.basket)
      play = new Play(world, (where) => view.toStage(where))
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      // As on going to rest: the touch ends first, so the thing in hand is back or down before the last save.
      rest()
      disposed = true
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
      <canvas ref={canvasRef} aria-label={rainbowWorldManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const rainbowWorldCartridge: Cartridge = {
  manifest: rainbowWorldManifest,
  Mount,
}
