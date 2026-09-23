import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import type { ForestController } from '../controller'
import type { ScreenPoint } from '../input'
import { HOMES, type HomeKey } from '../layout'
import { FrameGovernor, perfOptions, Ring, TIERS, TOP_TIER } from '../perf'
import { ForestWorld } from './world'

// The canvas and its one frame hook. Each frame: tilt the camera, step the
// forest, pose and paint it, render, and time the whole of it (update plus
// render submit) into a ring the jam's perf probe reads from
// `window.__jamPerf`. The frame governor picks the quality tier from the
// measured frame interval; `?tier=N` pins one and `?fps=1` shows a
// wordless bar graph of recent frame times for grown-ups.

type PerfStats = { cpu: Ring; frames: Ring; tier: number; drawCalls: number; triangles: number }

/** Read-only positions for scripted walkthroughs (`?walk=1` only). */
type WalkHook = { animal(key: string): ScreenPoint | null; home(key: string): ScreenPoint | null; mode(key: string): string | null; phase(): string }

type JamPerf = { readonly cpuMs: number[]; readonly tier: number; readonly drawCalls: number; readonly triangles: number; reset(): void }

function screenDpr(): number {
  return typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1
}

function Loop({ forest, governor, stats, walk }: { forest: ForestController; governor: FrameGovernor; stats: PerfStats; walk: boolean }) {
  const gl = useThree((state) => state.gl)
  const size = useThree((state) => state.size)
  const setDpr = useThree((state) => state.setDpr)
  const world = useMemo(() => new ForestWorld(), [])
  const clock = useRef({ born: performance.now(), last: 0 })

  useEffect(() => {
    world.resize(size.width, size.height)
  }, [world, size])

  useEffect(() => {
    forest.setProjector(world.projector)
    return () => world.dispose()
  }, [forest, world])

  useEffect(() => {
    if (!walk) return
    const at = (x: number, y: number, z: number) => {
      const out = { x: 0, y: 0 }
      return world.projector.toScreen(x, y, z, out) ? out : null
    }
    const creature = (key: string) => forest.creatures.find((c) => c.key === key)
    const hook: WalkHook = {
      animal: (key) => {
        const c = creature(key)
        return c ? at(c.x, c.y + c.spec.size * 0.45, c.z) : null
      },
      home: (key) => {
        const spec = HOMES[key as HomeKey]
        return spec ? at(spec.mouth.x, spec.mouth.y, spec.mouth.z) : null
      },
      mode: (key) => creature(key)?.mode ?? null,
      phase: () => forest.cycle.phase,
    }
    const host = window as unknown as { __bedtimeForest?: WalkHook }
    host.__bedtimeForest = hook
    return () => {
      if (host.__bedtimeForest === hook) delete host.__bedtimeForest
    }
  }, [walk, forest, world])

  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])

  useEffect(() => {
    const element = gl.domElement
    const local = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const down = (event: PointerEvent) => {
      event.preventDefault()
      element.setPointerCapture?.(event.pointerId)
      forest.pointerDown(event.pointerId, local(event), event.timeStamp)
    }
    const move = (event: PointerEvent) => forest.pointerMove(event.pointerId, local(event))
    const up = (event: PointerEvent) => forest.pointerUp(event.pointerId, local(event), event.timeStamp)
    const cancel = (event: PointerEvent) => forest.pointerCancel(event.pointerId)
    const menu = (event: Event) => event.preventDefault()
    element.addEventListener('pointerdown', down)
    element.addEventListener('pointermove', move)
    element.addEventListener('pointerup', up)
    element.addEventListener('pointercancel', cancel)
    element.addEventListener('contextmenu', menu)
    return () => {
      element.removeEventListener('pointerdown', down)
      element.removeEventListener('pointermove', move)
      element.removeEventListener('pointerup', up)
      element.removeEventListener('pointercancel', cancel)
      element.removeEventListener('contextmenu', menu)
    }
  }, [gl, forest])

  useFrame((state, delta) => {
    const start = performance.now()
    const dt = Math.min(delta, 1 / 20)
    const settings = governor.settings
    gl.info.reset()
    world.aim(forest)
    forest.step(dt)
    world.update(forest, dt, settings)
    world.render(state.gl, settings.post)
    const end = performance.now()
    stats.cpu.push(end - start)
    stats.drawCalls = gl.info.render.calls
    stats.triangles = gl.info.render.triangles
    const c = clock.current
    if (c.last > 0) {
      stats.frames.push(start - c.last)
      if (governor.sample(start - c.last, (start - c.born) / 1000)) {
        stats.tier = governor.tier
        setDpr(Math.min(screenDpr(), governor.settings.dpr))
      }
    }
    c.last = start
  }, 1)

  return null
}

/** Frame times as bars (taller is slower; the line is 60 fps), with the tier as a row of dots. No numerals. */
function FrameGraph({ stats }: { stats: PerfStats }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const timer = setInterval(() => {
      const ctx = canvas.current?.getContext('2d')
      if (!ctx) return
      const w = 240
      const h = 64
      ctx.clearRect(0, 0, w, h)
      ctx.fillStyle = 'rgba(20, 16, 30, 0.6)'
      ctx.fillRect(0, 0, w, h)
      const n = Math.min(stats.frames.length, 120)
      for (let i = 0; i < n; i++) {
        const frame = stats.frames.recent(i)
        const cpu = stats.cpu.recent(i)
        const x = w - 2 - i * 2
        const fh = Math.min(h - 4, (frame / 50) * (h - 4))
        ctx.fillStyle = frame > 20 ? '#f28b6b' : '#9fd6a8'
        ctx.fillRect(x, h - 2 - fh, 1.5, fh)
        ctx.fillStyle = '#fff3cf'
        ctx.fillRect(x, h - 2 - Math.min(h - 4, (cpu / 50) * (h - 4)), 1.5, 1.5)
      }
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.fillRect(0, h - 2 - (16.7 / 50) * (h - 4), w, 1)
      for (let t = 0; t <= TOP_TIER; t++) {
        ctx.fillStyle = t <= stats.tier ? '#fff3cf' : 'rgba(255,255,255,0.2)'
        ctx.fillRect(6 + t * 10, 6, 6, 6)
      }
    }, 250)
    return () => clearInterval(timer)
  }, [stats])
  return <canvas ref={canvas} width={240} height={64} aria-hidden style={{ position: 'absolute', top: 8, right: 8, width: 240, height: 64, pointerEvents: 'none', zIndex: 2 }} />
}

export function ForestStage({ forest, running }: { forest: ForestController; running: boolean }) {
  const options = useMemo(() => perfOptions(typeof window === 'undefined' ? '' : window.location.search), [])
  const governor = useMemo(() => new FrameGovernor(options.tier ?? TOP_TIER, options.tier !== null), [options])
  const stats = useMemo<PerfStats>(() => ({ cpu: new Ring(600), frames: new Ring(600), tier: governor.tier, drawCalls: 0, triangles: 0 }), [governor])

  useEffect(() => {
    const perf: JamPerf = {
      get cpuMs() {
        return stats.cpu.values()
      },
      get tier() {
        return stats.tier
      },
      get drawCalls() {
        return stats.drawCalls
      },
      get triangles() {
        return stats.triangles
      },
      reset() {
        stats.cpu.reset()
        stats.frames.reset()
      },
    }
    const host = window as unknown as { __jamPerf?: JamPerf }
    host.__jamPerf = perf
    return () => {
      if (host.__jamPerf === perf) delete host.__jamPerf
    }
  }, [stats])

  return (
    <>
      <Canvas
        dpr={Math.min(screenDpr(), TIERS[governor.tier].dpr)}
        frameloop={running ? 'always' : 'never'}
        flat
        gl={{ antialias: false, alpha: false, stencil: false, powerPreference: 'high-performance' }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        <Loop forest={forest} governor={governor} stats={stats} walk={options.walk} />
      </Canvas>
      {options.overlay && <FrameGraph stats={stats} />}
    </>
  )
}
