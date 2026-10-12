// template: cartridge/game.tsx v3
import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { AttendedClock, Attention } from './attention'
import { GameAudio } from './audio'
import { BACKDROP } from './config'
import { lanternWalkManifest } from './manifest'
import { Overlay } from './overlay'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { SaveCadence } from './saveCadence'
import { seedOf } from './rng'
import { Play } from './play'
import { RoomView } from './room'
import { deserialize, serialize } from './save'
import { speakerOf } from './speaker'
import { WoodView } from './view'

// The Mount: it joins the game to the shell and holds nothing of the game
// itself. Pointers go to play.ts in the surface's own pixels, and the frame's
// seconds with them; the rules are in game.ts, table.ts and wood.ts, the look
// in room.ts and view.ts, the sounds in voices.ts. There is one clock, the
// game's own seconds of play: what is seen is drawn at that time and what is
// heard is made from the game's events, so the Mount makes no sound of its
// own and keeps no time of its own.

function Mount({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const attendRef = useRef<(attended: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!
    const audio = new GameAudio(), speaker = speakerOf(audio), clock = new AttendedClock()
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    // Grown-ups only: a finger that rests a second in the top right corner and lifts there, then three taps
    // there, or fps=1 in the address (overlay.ts).
    const overlay = new Overlay(root, window.location.search)
    // What the last draw put on the surface, for the grown-up handle and the overlay: every stamp, stroke and fill.
    const drawn = { drawCalls: 0, triangles: 0 }
    const uninstallPerf = installJamPerf(work, () => ({ tier: governor.tier, ...drawn }))
    const wood = new WoodView(canvas), room = new RoomView(canvas)
    let play: Play | null = null, disposed = false, frame = 0, width = 0, height = 0, dpr = 0, lastWork = 0
    // A tier that changes what the layers hold has them scraped again, even where the size and the pixel ratio stay.
    let retier = false
    // The pointer the overlay's gesture follows: the first one down.
    let first: number | null = null

    // Nothing is saved until the slot has been read, so an early put-away cannot overwrite it. The game says
    // when its state changed and whether the change may wait (play.ts hands that on): a scene's outcome, a cut,
    // a paper, a lamp or the candle is written at once, a lantern that is being carried at the throttle.
    const cadence = new SaveCadence(() => {
      if (play) ctxRef.current.storage.save(serialize(play.game.toSave()))
    })

    // The one place the game applies a quality tier. A tier sets the pixel ratio and whether the wax grain and
    // the crumbs are drawn; lines, patches, creatures and every answer to a touch are the same on all of them.
    const applyTier = () => {
      canvas.dataset.tier = String(governor.tier)
      retier = true
    }

    // The one place the game draws its frame: the room or the wood. Before the slot is read neither place is
    // known, so neither is drawn: the surface is black wax until the load is in, and then the place saved.
    const draw = () => {
      if (width <= 0 || height <= 0) return
      if (!play) {
        wood.blank()
        drawn.drawCalls = wood.draws
        return
      }
      const game = play.game
      if (game.show.room) {
        room.draw(game.table, game.show, play.guidance, play.aim, game.time)
        drawn.drawCalls = room.draws
      } else {
        wood.draw(game.wood, game.show, play.guidance, play.aim, game.time)
        drawn.drawCalls = wood.draws
      }
    }

    // The shell can resize the surface without a window resize event, so the surface watches itself.
    // Returns whether it sized the surface, and so drew it.
    const resize = (): boolean => {
      const w = root.clientWidth, h = root.clientHeight
      // A parked surface measures 0×0; keep the last good size.
      if (w <= 0 || h <= 0) return false
      const ratio = Math.min(window.devicePixelRatio || 1, governor.settings.dpr)
      if (w === width && h === height && ratio === dpr && !retier) return false
      width = w; height = h; dpr = ratio; retier = false
      // Sizing the backing store wipes the surface, so it is redrawn at once.
      canvas.width = Math.round(w * ratio); canvas.height = Math.round(h * ratio)
      wood.resize(w, h, ratio, governor.settings)
      room.resize(w, h, ratio, governor.settings)
      play?.size(w, h)
      draw()
      return true
    }
    const observer = new ResizeObserver(resize)
    observer.observe(root)

    const at = (event: PointerEvent) => {
      const box = root.getBoundingClientRect()
      return { x: event.clientX - box.left, y: event.clientY - box.top }
    }
    const onDown = (event: PointerEvent) => {
      if (!attention.awake) return
      audio.touchDown()
      const where = at(event)
      // Only the first finger counts towards the grown-up's gesture: a palm or a second finger is no tap of the three.
      if (first === null) {
        first = event.pointerId
        overlay.press(where.x, where.y, width, event.timeStamp)
      }
      play?.down(event.pointerId, where.x, where.y)
      // Captured, so the lift is reported even when the finger has slid off the surface.
      root.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      const where = at(event)
      if (first === event.pointerId) overlay.move(where.x, where.y, width)
      play?.move(event.pointerId, where.x, where.y)
    }
    const onUp = (event: PointerEvent) => {
      const where = at(event)
      if (first === event.pointerId) {
        first = null
        overlay.lift(where.x, where.y, width, event.timeStamp)
      }
      play?.up(event.pointerId, where.x, where.y)
      audio.touchUp()
    }
    // The browser took the finger away, which is not the child letting go: nothing is dropped, hung, lit or cut by it.
    const onCancel = (event: PointerEvent) => {
      if (first === event.pointerId) {
        first = null
        overlay.forget()
      }
      play?.cancel(event.pointerId)
      audio.touchUp()
    }
    root.addEventListener('pointerdown', onDown)
    root.addEventListener('pointermove', onMove)
    root.addEventListener('pointerup', onUp)
    root.addEventListener('pointercancel', onCancel)

    const loop = (now: number) => {
      frame = 0
      if (!attention.awake || disposed) return
      // The attended clock gives the step to play, in seconds: the game's one clock advances by it and by nothing else.
      const step = clock.advance(now)
      const start = performance.now()
      play?.frame(step)
      // A tier change is applied ahead of the draw. The interval just measured belongs to the frame before, so
      // it is judged with that frame's work.
      const stepped = clock.intervalMs > 0 && governor.sample(clock.intervalMs, lastWork)
      if (stepped) applyTier()
      const sized = stepped && resize()
      if (!sized) draw()
      lastWork = performance.now() - start
      work.push(lastWork)
      overlay.frame(now, clock.intervalMs, lastWork, governor.tier, drawn.drawCalls, drawn.triangles)
      frame = requestAnimationFrame(loop)
    }

    // Everything stops while unattended or hidden: the loop, the clock and sound. Going to rest, the game is
    // parked: fingers are taken away, which drops nothing; a scene lands where its start saved it; all sound
    // closes; the idle ladder is taken back; and the newest state is handed to storage. What is found on coming
    // back is what a load of that state would give.
    const rest = () => {
      first = null
      overlay.forget()
      if (play) {
        play.rest()
        cadence.change(performance.now(), true)
      }
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
      draw()
    })
    attendRef.current = (attended) => attention.set(attended)

    ctxRef.current.storage.load<unknown>().catch(() => null).then((value) => {
      if (disposed) return
      // A saved position wins; `childAge` only chooses which sheet a first visit finds on the table.
      const save = deserialize(value, ctxRef.current.childAge)
      // The game as it was left: nothing eases in, nothing replays, nothing sounds, and nothing is in the air.
      play = new Play(save, seedOf(window.location.search), speaker, (urgent) => cadence.change(performance.now(), urgent))
      play.size(width, height)
      play.frame(0)
      // The load draws the first frame itself: a game that is resting when the slot comes back has no frame coming.
      draw()
    })
    applyTier()
    resize()
    attention.set(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      rest()
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
      <canvas ref={canvasRef} aria-label={lanternWalkManifest.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }} />
    </div>
  )
}

export const lanternWalkCartridge: Cartridge = {
  manifest: lanternWalkManifest,
  Mount,
}
