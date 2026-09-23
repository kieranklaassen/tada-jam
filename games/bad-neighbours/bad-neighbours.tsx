import { useEffect, useRef } from 'react'
import type { Cartridge, CartridgeContext } from '../types'
import { Sound } from './audio'
import { bindGameControls, DragGesture, type ControlAction } from './input'
import { badNeighboursManifest } from './manifest'
import { Game, paceForAge, type GameEvent } from './model'
import { installJamPerf } from './perf'
import { PerfRing, TierGovernor, startingTier, tierOverride } from './quality'
import { Renderer } from './renderer'
import { deserialize, serialize } from './snapshot'
import './bad-neighbours.css'

// Bad Neighbours for Tada: drop wobbly apartment buildings onto a construction
// slab and watch the neighbourhood live in them. No score, no lives. Buildings
// that settle lock into a solid foundation; ones that fall come back to the
// delivery queue with a parachuting resident. The street is saved as it grows.

const ICONS: Record<string, string> = {
  left: 'm14 6-6 6 6 6',
  right: 'm10 6 6 6-6 6',
  rotate: 'M4 9a8 8 0 1 1 0 6M4 3v6h6',
  drop: 'M12 3v13m-5-5 5 5 5-5M5 21h14',
  glue: 'M5 3v18M19 3v18M5 5h14M5 19h14M5 5l14 14M19 5 5 19',
  clear: 'M4 20h16M7 20l2-9h6l2 9M12 11V3',
}
const CLEAR_HOLD_MS = 800

function Icon({ name }: { name: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={ICONS[name]} />
    </svg>
  )
}

function BadNeighbours({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clearRef = useRef<HTMLButtonElement>(null)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const awakeRef = useRef<(awake: boolean) => void>(() => {})

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!, clearButton = clearRef.current!
    const renderer = new Renderer(canvas), sound = new Sound(), gesture = new DragGesture()
    const pinned = tierOverride(window.location.search)
    const governor = new TierGovernor(pinned ?? startingTier(window.matchMedia('(pointer: coarse)').matches), pinned !== null)
    const work = new PerfRing()
    renderer.setTier(governor.settings)
    const uninstallPerf = installJamPerf(work, () => governor.tier, () => renderer.draws)
    const seed = () => Math.floor(Math.random() * 2 ** 30) + 1
    let game: Game | null = null, disposed = false, softDrop = false, frame = 0, last = 0, awake = true

    const save = () => { if (game) ctxRef.current.storage.save(serialize(game.snapshot(), game.queue(), game.bondPairs())) }
    const onEvent = (event: GameEvent) => {
      const piece = event.piece
      if (event.type === 'rotate' && piece) { sound.play('rattle'); if (!renderer.reduced) renderer.neighbourhood.spill(piece, 3, true) }
      if (event.type === 'impact' && piece) {
        sound.play('land'); renderer.neighbourhood.react(piece, 1.2)
        renderer.burst(piece.body.position.x, piece.body.bounds.max.y, '#e9dcc1')
        if (!renderer.reduced && Math.abs(Math.sin(piece.body.angle)) > 0.2) renderer.neighbourhood.spill(piece, 2)
      }
      if (event.type === 'land' && piece) {
        if (event.level) { sound.play('level'); renderer.burst(piece.body.position.x, piece.body.bounds.min.y, '#f3c75f', true) }
        save()
      }
      if (event.type === 'secure') { sound.play('secure'); save() }
      if (event.type === 'lost') { sound.play('lost'); if (piece && !renderer.reduced) renderer.neighbourhood.rescue(piece); save() }
      if (event.type === 'glue') { sound.play('glue'); game?.pieces.filter(p => p.glued).slice(-8).forEach(p => renderer.burst(p.body.position.x, p.body.position.y, '#e8bb59')); save() }
    }
    const start = (restore?: ReturnType<typeof deserialize>) => {
      game?.dispose()
      renderer.camera = 0; renderer.particles = []; renderer.neighbourhood.reset()
      game = new Game(seed(), onEvent, { pace: paceForAge(ctxRef.current.childAge), restore: restore?.pieces, bonds: restore?.bonds, next: restore?.next })
    }

    const act = (action: ControlAction) => {
      if (!game || !awake) return
      if (action === 'left') game.move(-1)
      else if (action === 'right') game.move(1)
      else if (action === 'rotate') { if (!game.rotate()) sound.play('tap') }
      else if (action === 'drop') { if (game.active && !game.hardDropping) sound.play('drop'); game.drop() }
      else if (action === 'glue' && !game.glue()) sound.play('tap')
    }
    const controls = bindGameControls(root, act, () => sound.unlock())

    // Clearing the street is a deliberate hold, so a stray tap never wipes a tower.
    let clearTimer = 0
    const cancelClear = () => { window.clearTimeout(clearTimer); clearButton.classList.remove('is-holding') }
    const onClearDown = (event: PointerEvent) => {
      event.preventDefault(); sound.unlock(); clearButton.classList.add('is-holding')
      clearTimer = window.setTimeout(() => {
        clearButton.classList.remove('is-holding'); sound.play('lost'); start(); save()
      }, CLEAR_HOLD_MS)
    }
    clearButton.addEventListener('pointerdown', onClearDown)
    clearButton.addEventListener('pointerup', cancelClear)
    clearButton.addEventListener('pointerleave', cancelClear)
    clearButton.addEventListener('pointercancel', cancelClear)

    const onCanvasDown = (event: PointerEvent) => {
      sound.unlock()
      if (!game?.active) return
      if (gesture.begin(event.pointerId, event.clientX, event.clientY, renderer.worldX(event.clientX), renderer.scale)) canvas.setPointerCapture(event.pointerId)
    }
    const onCanvasMove = (event: PointerEvent) => { const x = gesture.move(event.pointerId, event.clientX, event.clientY); if (x !== undefined) game?.aim(x) }
    const onCanvasUp = (event: PointerEvent) => { const action = gesture.end(event.pointerId, event.clientX, event.clientY); if (action) act(action) }
    const onCanvasCancel = () => gesture.cancel()
    canvas.addEventListener('pointerdown', onCanvasDown)
    canvas.addEventListener('pointermove', onCanvasMove)
    canvas.addEventListener('pointerup', onCanvasUp)
    canvas.addEventListener('pointercancel', onCanvasCancel)

    const keys: Record<string, ControlAction> = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'rotate', KeyW: 'rotate', KeyR: 'rotate', Space: 'drop', KeyG: 'glue' }
    const onKeyDown = (event: KeyboardEvent) => {
      if (root.offsetParent === null) return
      const action = keys[event.code]
      if (action) { event.preventDefault(); sound.unlock(); if (!event.repeat || action === 'left' || action === 'right') act(action) }
      if (event.code === 'ArrowDown' || event.code === 'KeyS') { event.preventDefault(); softDrop = true }
    }
    const onKeyUp = (event: KeyboardEvent) => { if (event.code === 'ArrowDown' || event.code === 'KeyS') softDrop = false }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)

    const tick = (now: number) => {
      frame = 0
      if (!awake || disposed) return
      const interval = last ? now - last : 0
      const delta = Math.min(100, interval)
      last = now
      const start = performance.now()
      controls.advance(now)
      game?.advance(delta, softDrop, governor.settings.maxSteps)
      renderer.render(delta, game)
      const spent = performance.now() - start
      work.push(spent)
      if (interval > 0 && governor.sample(interval, spent)) renderer.setTier(governor.settings)
      frame = requestAnimationFrame(tick)
    }
    // Everything stops while unattended or hidden: physics, animation and sound.
    const setAwake = (next: boolean) => {
      next = next && !document.hidden
      if (next === awake && (frame || !next)) return
      awake = next
      sound.setAwake(next)
      if (next) { last = 0; if (!frame) frame = requestAnimationFrame(tick) }
      else { cancelAnimationFrame(frame); frame = 0; softDrop = false; controls.clear(); gesture.cancel(); cancelClear(); save() }
    }
    awakeRef.current = setAwake
    const onVisibility = () => setAwake(ctxRef.current.attention.attended)
    document.addEventListener('visibilitychange', onVisibility)

    ctxRef.current.storage.load<unknown>().then(
      (value) => { if (!disposed) start(deserialize(value)) },
      () => { if (!disposed) start() },
    )
    awake = false
    setAwake(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      save()
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', onCanvasDown)
      canvas.removeEventListener('pointermove', onCanvasMove)
      canvas.removeEventListener('pointerup', onCanvasUp)
      canvas.removeEventListener('pointercancel', onCanvasCancel)
      clearButton.removeEventListener('pointerdown', onClearDown)
      window.clearTimeout(clearTimer)
      controls.clear()
      uninstallPerf()
      renderer.dispose()
      sound.dispose()
      game?.dispose()
    }
  }, [])

  useEffect(() => { awakeRef.current(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} className="bn-root">
      <canvas ref={canvasRef} className="bn-world" aria-label="A street of wobbly buildings" />
      <button ref={clearRef} type="button" className="bn-clear" aria-label="Hold to start a new street">
        <Icon name="clear" />
      </button>
      <div className="bn-controls">
        <div className="bn-dock">
          <button type="button" className="bn-control" data-action="left" aria-label="Move left"><Icon name="left" /></button>
          <button type="button" className="bn-control" data-action="right" aria-label="Move right"><Icon name="right" /></button>
        </div>
        <div className="bn-actions">
          <div className="bn-dock">
            <button type="button" className="bn-control" data-action="rotate" aria-label="Turn building"><Icon name="rotate" /></button>
            <button type="button" className="bn-control bn-drop" data-action="drop" aria-label="Drop building"><Icon name="drop" /></button>
          </div>
          <button type="button" className="bn-control bn-glue" data-action="glue" aria-label="Add scaffolding"><Icon name="glue" /></button>
        </div>
      </div>
    </div>
  )
}

export const badNeighbours: Cartridge = {
  manifest: badNeighboursManifest,
  Mount: BadNeighbours,
}
