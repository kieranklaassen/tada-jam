import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import type { Cartridge, CartridgeContext } from '../types'
import { Sound } from './audio'
import { homeForCountry } from './geo'
import { moonPhasesManifest } from './manifest'
import { Orrery } from './orrery'
import { PHASE_COUNT, TAU, elongationAt, litPath, phaseAngle, phaseIndex, shortestTurn, wrap } from './phase'
import { deserialize, serialize } from './snapshot'
import './moon-phases.css'

// Moon Phases: a tabletop orrery that shows why the moon changes shape.
// The sun lamp always lights exactly half of the moon. The child lives at a
// real place on the turning Earth (their profile's country; tap the globe to
// move), and the round window shows their sky: day or night, the moon up or
// set. Drag the moon, turn the day/night dial, or tap the window to stand
// there yourself. Wordless throughout.

// While nobody is touching: a day passes every 24 seconds, and the moon moves
// on by one phase per day, so each night shows the next phase.
const DAY_SECONDS = 24
const AUTO_SPEED = TAU / (PHASE_COUNT * DAY_SECONDS)
const IDLE_RESUME_MS = 6000
const POV_SECONDS = 1.2

function MoonIcon({ elongation, size }: { elongation: number; size: number }) {
  const path = litPath(elongation, 24)
  return (
    <svg viewBox="-30 -30 60 60" width={size} height={size} aria-hidden="true">
      <circle r="27" fill="#141b3a" />
      <circle r="24" fill="#3a4466" />
      {path && <path d={path} fill="#fff1c9" />}
    </svg>
  )
}

function ModelIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="7" cy="16" r="4.5" fill="#ffd46e" />
      <circle cx="18" cy="16" r="4" fill="#4e8fd0" />
      <ellipse cx="18" cy="16" rx="11" ry="5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeDasharray="2.5 2.5" />
      <circle cx="28.5" cy="15" r="2.2" fill="#e8e2d0" />
    </svg>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <path d="M3 16c3.5-6 8.2-9 13-9s9.5 3 13 9c-3.5 6-8.2 9-13 9S6.5 22 3 16Z" fill="#fff8e6" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="16" cy="16" r="5.2" fill="#3a6fb0" />
      <circle cx="16" cy="16" r="2.4" fill="#141b3a" />
      <circle cx="17.6" cy="14.4" r="1.1" fill="#fff" />
    </svg>
  )
}

function SunGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="4.2" fill="#ffd46e" />
      <g stroke="#ffd46e" strokeWidth="1.6" strokeLinecap="round">
        {Array.from({ length: 8 }, (_, i) => {
          const a = (i / 8) * TAU, c = Math.cos(a), s = Math.sin(a)
          return <line key={i} x1={10 + c * 6.6} y1={10 + s * 6.6} x2={10 + c * 8.6} y2={10 + s * 8.6} />
        })}
      </g>
    </svg>
  )
}

function EarthGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="#3a7fd0" />
      <path d="M5 8c2-2 4 0 5-1s2-2 4-1-1 3 1 4 1 3-1 4-3-1-4 0-3 1-4-1 1-3-1-5Z" fill="#6cc070" />
    </svg>
  )
}

function MoonGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" fill="#3a4466" />
      <path d="M10 2.5a7.5 7.5 0 0 1 0 15a4 7.5 0 0 0 0-15Z" fill="#fff1c9" />
    </svg>
  )
}

function HalvesIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="10" fill="#3a4466" />
      <path d="M16 6a10 10 0 0 0 0 20Z" fill="#fff1c9" />
      <circle cx="16" cy="16" r="12.5" fill="none" stroke="#8cc8ff" strokeWidth="2" strokeDasharray="3 2.4" />
      <path d="M16 3v26" stroke="#ffd46e" strokeWidth="2" />
    </svg>
  )
}

function MoonPhases({ ctx }: { ctx: CartridgeContext }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const windowRef = useRef<HTMLCanvasElement>(null)
  const pinRefs = useRef<(HTMLDivElement | null)[]>([])
  const dialRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLDivElement>(null)
  const [ready, setReady] = useState(false)
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx
  const api = useRef<{ setPov(on: boolean): void; setHalves(on: boolean): void; goTo(index: number): void; awake(on: boolean): void } | null>(null)
  const [pov, setPovState] = useState(false)
  const [halves, setHalvesState] = useState(false)
  const [phase, setPhase] = useState(0)

  useEffect(() => {
    const root = rootRef.current!, canvas = canvasRef.current!, windowCanvas = windowRef.current!
    const windowCtx = windowCanvas.getContext('2d')!
    const orrery = new Orrery(canvas), sound = new Sound()
    let width = 0, height = 0, dpr = 1, frame = 0, last = 0, awake = false, disposed = false
    // Nothing is saved until the slot has been read, so an early unmount can't overwrite it.
    let loaded = false
    let povTarget = 0, lastTouch = -Infinity, autoBlend = 1, currentPhase = -1
    // One finger at a time: dragging the moon, turning the model, or tapping a phase.
    let dragging: { id: number; mode: 'moon' | 'look' | 'spin' | 'phase' | 'earth'; x: number; y: number; moved: boolean; phase?: number; point?: THREE.Vector3 } | null = null
    let shown = false, maxDpr = 2
    const slow = { sum: 0, frames: 0 }
    let tween: { from: number; turn: number; start: number; duration: number } | null = null

    const save = () => loaded && ctxRef.current.storage.save(serialize(orrery.elongation, povTarget === 1, orrery.showHalves, orrery.home, orrery.hours))
    const touched = () => { lastTouch = performance.now(); autoBlend = 0 }

    const setPov = (on: boolean) => {
      if ((povTarget === 1) === on) return
      povTarget = on ? 1 : 0; setPovState(on); sound.unlock(); sound.whoosh(on); save()
    }
    const setHalves = (on: boolean) => {
      orrery.showHalves = on; setHalvesState(on); sound.unlock(); sound.tick(); save()
    }
    const goTo = (index: number) => {
      sound.unlock(); touched()
      const turn = shortestTurn(orrery.elongation, phaseAngle(index))
      tween = { from: orrery.elongation, turn, start: performance.now(), duration: 500 + Math.abs(turn) * 380 }
    }

    const resize = () => {
      const w = root.clientWidth, h = root.clientHeight
      if (w <= 0 || h <= 0) return
      // Sharp on phones, bounded on big tablets.
      const ratio = Math.max(1, Math.min(window.devicePixelRatio || 1, maxDpr, Math.sqrt(2_400_000 / (w * h))))
      if (w === width && h === height && ratio === dpr) return
      width = w; height = h; dpr = ratio
      orrery.resize(w, h, dpr)
      const size = Math.round(windowCanvas.clientWidth * dpr)
      windowCanvas.width = windowCanvas.height = size
      draw()
    }
    const draw = () => {
      if (!width) return
      const inset = Math.round(windowCanvas.clientWidth)
      orrery.render(width, height, inset, (source, size) => {
        const px = Math.round(size * dpr)
        windowCtx.drawImage(source, 0, source.height - px, px, px, 0, 0, windowCanvas.width, windowCanvas.height)
      })
    }

    const tick = (now: number) => {
      frame = 0
      if (!awake || disposed) return
      const dt = last ? Math.min(0.1, (now - last) / 1000) : 0
      last = now
      // The moon keeps going on its own, easing back in after the child lets go.
      if (tween) {
        const k = Math.min(1, (now - tween.start) / tween.duration), e = k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2
        orrery.setMoon(wrap(tween.from + tween.turn * e))
        if (k >= 1) { tween = null; save() }
      } else if (!dragging && now - lastTouch > IDLE_RESUME_MS) {
        autoBlend = Math.min(1, autoBlend + dt * 0.5)
        orrery.setMoon(wrap(orrery.elongation + AUTO_SPEED * autoBlend * dt))
        if (!dialDrag) orrery.hours = (orrery.hours + (24 / DAY_SECONDS) * autoBlend * dt) % 24
      }
      // The dial's knob follows the clock: midnight at the bottom, noon at the top.
      const turn = (orrery.hours / 24) * TAU
      knobRef.current?.style.setProperty('transform', `rotate(${turn}rad)`)
      knobRef.current?.classList.toggle('is-day', orrery.hours >= 6 && orrery.hours < 18)
      orrery.pov += Math.sign(povTarget - orrery.pov) * Math.min(Math.abs(povTarget - orrery.pov), dt / POV_SECONDS)
      const index = phaseIndex(orrery.elongation)
      if (index !== currentPhase) {
        if (currentPhase !== -1) sound.bell(index)
        currentPhase = index; setPhase(index)
      }
      orrery.update(dt)
      draw()
      if (!shown) { shown = true; setReady(true) }
      // Pins ride along with the sun, Earth and moon.
      orrery.pins(width, height).forEach((pin, i) => {
        const el = pinRefs.current[i]
        if (!el) return
        el.style.transform = `translate3d(${pin.x}px, ${pin.y}px, 0) translate(-50%, -100%)`
        el.classList.toggle('is-visible', pin.visible)
      })
      // Slower devices first lose depth of field, then drop to one pixel per point.
      if (orrery.intro >= 1 && dt > 0) {
        slow.sum += dt; slow.frames++
        if (slow.frames === 90) {
          if (slow.sum / slow.frames > 0.026) {
            if (orrery.fancy) orrery.fancy = false
            else if (dpr > 1) { maxDpr = 1; width = 0; resize() }
          }
          slow.sum = 0; slow.frames = 0
        }
      }
      frame = requestAnimationFrame(tick)
    }

    // Everything stops while unattended or hidden: animation and sound.
    const setAwake = (on: boolean) => {
      on = on && !document.hidden
      if (on === awake) return
      awake = on
      sound.setAwake(on)
      if (on) { last = 0; frame = requestAnimationFrame(tick) }
      else { cancelAnimationFrame(frame); frame = 0; dragging = null; save() }
    }

    // Pointer: drag the moon, tap a phase on the table, or turn the model.
    const ndc = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect()
      return new THREE.Vector2(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1)
    }
    const onDown = (event: PointerEvent) => {
      if (dragging) return
      sound.unlock(); touched()
      const hit = orrery.pick(ndc(event))
      const mode = orrery.pov >= 0.5 ? 'spin' : hit?.kind === 'moon' ? 'moon' : hit?.kind === 'phase' ? 'phase' : hit?.kind === 'earth' ? 'earth' : 'look'
      dragging = { id: event.pointerId, mode, x: event.clientX, y: event.clientY, moved: false, phase: hit?.kind === 'phase' ? hit.index : undefined, point: hit?.kind === 'earth' ? hit.point : undefined }
      if (mode === 'moon') { orrery.showHint = false; tween = null; sound.tick() }
      canvas.setPointerCapture(event.pointerId)
    }
    const onMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragging.id) return
      touched()
      const dx = event.clientX - dragging.x, dy = event.clientY - dragging.y
      if (Math.hypot(dx, dy) > 6) dragging.moved = true
      if (dragging.mode === 'moon') {
        const point = orrery.orbitPlanePoint(ndc(event))
        if (point && Math.hypot(point.x, point.z) > 0.5) orrery.setMoon(elongationAt(point.x, point.z))
      } else if (dragging.mode === 'spin') {
        orrery.setMoon(wrap(orrery.elongation + dx * 0.006))
      } else if (dragging.mode === 'look' || ((dragging.mode === 'phase' || dragging.mode === 'earth') && dragging.moved)) {
        dragging.mode = 'look'
        orrery.view.azimuth -= dx * 0.005
        orrery.view.elevation = Math.max(0.12, Math.min(1.25, orrery.view.elevation + dy * 0.004))
      }
      dragging.x = event.clientX; dragging.y = event.clientY
    }
    const onUp = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragging.id) return
      if (dragging.mode === 'phase' && !dragging.moved && dragging.phase !== undefined) goTo(dragging.phase)
      // Tapping the globe moves the child's home there.
      if (dragging.mode === 'earth' && !dragging.moved && dragging.point) { orrery.setHomeFrom(dragging.point); sound.bell(2, 0.04); save() }
      if (dragging.mode === 'moon' || dragging.mode === 'spin') save()
      dragging = null
    }
    const onCancel = () => { dragging = null }
    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      orrery.view.distance = Math.max(10, Math.min(24, orrery.view.distance * Math.exp(event.deltaY * 0.001)))
    }
    canvas.addEventListener('pointerdown', onDown)
    canvas.addEventListener('pointermove', onMove)
    canvas.addEventListener('pointerup', onUp)
    canvas.addEventListener('pointercancel', onCancel)
    canvas.addEventListener('wheel', onWheel, { passive: false })

    // The day/night dial: drag round it to change the time at home.
    const dial = dialRef.current!
    let dialDrag: number | null = null
    const dialTime = (event: PointerEvent) => {
      const rect = dial.getBoundingClientRect()
      const dx = event.clientX - (rect.left + rect.width / 2), dy = event.clientY - (rect.top + rect.height / 2)
      // Angle measured clockwise from the bottom (midnight).
      orrery.hours = ((wrap(Math.atan2(-dx, dy)) / TAU) * 24) % 24
    }
    const onDialDown = (event: PointerEvent) => {
      event.preventDefault(); sound.unlock(); touched(); sound.tick()
      dialDrag = event.pointerId; dial.setPointerCapture(event.pointerId); dialTime(event)
    }
    const onDialMove = (event: PointerEvent) => { if (event.pointerId === dialDrag) { touched(); dialTime(event) } }
    const onDialUp = (event: PointerEvent) => { if (event.pointerId === dialDrag) { dialDrag = null; save() } }
    dial.addEventListener('pointerdown', onDialDown)
    dial.addEventListener('pointermove', onDialMove)
    dial.addEventListener('pointerup', onDialUp)
    dial.addEventListener('pointercancel', onDialUp)

    const onKey = (event: KeyboardEvent) => {
      if (root.offsetParent === null) return
      if (event.code === 'ArrowLeft' || event.code === 'ArrowRight') {
        event.preventDefault(); sound.unlock(); touched(); tween = null; orrery.showHint = false
        orrery.setMoon(wrap(orrery.elongation + (event.code === 'ArrowRight' ? 1 : -1) * TAU / 64))
      }
      if (event.code === 'Space') { event.preventDefault(); setPov(povTarget !== 1) }
      if (event.code === 'KeyH') setHalves(!orrery.showHalves)
      if (/^Digit[1-8]$/.test(event.code)) goTo(Number(event.code.slice(5)) - 1)
      if (event.code === 'BracketLeft' || event.code === 'BracketRight') { touched(); orrery.hours = (orrery.hours + (event.code === 'BracketRight' ? 1 : 23)) % 24 }
    }
    window.addEventListener('keydown', onKey)

    const observer = new ResizeObserver(resize)
    observer.observe(root)
    const onVisibility = () => setAwake(ctxRef.current.attention.attended)
    document.addEventListener('visibilitychange', onVisibility)

    api.current = { setPov, setHalves, goTo, awake: setAwake }
    resize()
    ctxRef.current.storage.load<unknown>().then(
      (value) => {
        if (disposed) return
        loaded = true
        const saved = deserialize(value)
        const age = ctxRef.current.childAge
        orrery.setMoon(saved?.elongation ?? phaseAngle(2))
        orrery.home = saved?.home ?? homeForCountry(ctxRef.current.childCountry)
        // Start in the evening, when a first-quarter moon is high.
        orrery.hours = saved?.hours ?? 20
        orrery.showHalves = saved ? saved.halves : age !== null && age >= 7
        setHalvesState(orrery.showHalves)
        if (saved?.pov) { povTarget = 1; orrery.pov = 1; setPovState(true) }
      },
      () => { loaded = true },
    )
    setAwake(ctxRef.current.attention.attended)

    return () => {
      disposed = true
      save()
      cancelAnimationFrame(frame)
      observer.disconnect()
      window.removeEventListener('keydown', onKey)
      document.removeEventListener('visibilitychange', onVisibility)
      canvas.removeEventListener('pointerdown', onDown)
      canvas.removeEventListener('pointermove', onMove)
      canvas.removeEventListener('pointerup', onUp)
      canvas.removeEventListener('pointercancel', onCancel)
      canvas.removeEventListener('wheel', onWheel)
      dial.removeEventListener('pointerdown', onDialDown)
      dial.removeEventListener('pointermove', onDialMove)
      dial.removeEventListener('pointerup', onDialUp)
      dial.removeEventListener('pointercancel', onDialUp)
      api.current = null
      sound.dispose()
      orrery.dispose()
    }
  }, [])

  useEffect(() => { api.current?.awake(ctx.attention.attended) }, [ctx.attention.attended])

  return (
    <div ref={rootRef} className="mp-root">
      <canvas ref={canvasRef} className="mp-world" aria-label="A model of the sun, Earth and moon" />
      <div className="mp-pins" aria-hidden>
        {[<SunGlyph key="s" />, <EarthGlyph key="e" />, <MoonGlyph key="m" />].map((glyph, i) => (
          <div key={i} ref={el => { pinRefs.current[i] = el }} className="mp-pin">
            <span className="mp-pin-chip">{glyph}</span>
            <span className="mp-pin-stem" />
          </div>
        ))}
      </div>
      <div className={`mp-curtain${ready ? ' is-open' : ''}`} aria-hidden />

      <div className="mp-toolbar mp-glass">
        <div className="mp-segmented" role="group" aria-label="Point of view">
          <button type="button" className={pov ? '' : 'is-on'} aria-pressed={!pov} aria-label="Look at the model" onClick={() => api.current?.setPov(false)}><ModelIcon /></button>
          <button type="button" className={pov ? 'is-on' : ''} aria-pressed={pov} aria-label="Stand on Earth" onClick={() => api.current?.setPov(true)}><EyeIcon /></button>
        </div>
        <button type="button" className={`mp-round ${halves ? 'is-on' : ''}`} aria-pressed={halves} aria-label="Show the two halves" onClick={() => api.current?.setHalves(!halves)}>
          <HalvesIcon />
        </button>
      </div>

      <button type="button" className="mp-window" aria-label={pov ? 'Look at the model' : 'Stand on Earth'} onClick={() => api.current?.setPov(!pov)}>
        <canvas ref={windowRef} />
        <span className="mp-window-badge">{pov ? <ModelIcon /> : <EyeIcon />}</span>
      </button>

      <div ref={dialRef} className="mp-dial mp-glass" role="slider" aria-label="Time of day at home" aria-valuemin={0} aria-valuemax={24}>
        <div className="mp-dial-face" />
        <div ref={knobRef} className="mp-dial-arm">
          <span className="mp-dial-knob">
            <span className="mp-dial-sun"><SunGlyph /></span>
            <span className="mp-dial-moon"><MoonGlyph /></span>
          </span>
        </div>
      </div>

      <div className="mp-strip mp-glass" role="group" aria-label="Moon phases">
        {Array.from({ length: PHASE_COUNT }, (_, i) => (
          <button key={i} type="button" className={i === phase ? 'is-on' : ''} aria-label={`Phase ${i + 1} of ${PHASE_COUNT}`} onClick={() => api.current?.goTo(i)}>
            <MoonIcon elongation={phaseAngle(i)} size={40} />
          </button>
        ))}
      </div>
    </div>
  )
}

export const moonPhases: Cartridge = {
  manifest: moonPhasesManifest,
  Mount: MoonPhases,
}
