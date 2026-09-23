import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { GardenController, Projector } from '../controller'
import type { Point } from '../layout'
import { parseTierOverride, QualityGovernor, TIERS, TOP_TIER, wantsPerfOverlay } from '../tiers'
import { GardenView } from './garden'
import { GlowPass } from './glow'
import { PALETTE } from './palette'
import { installJamPerf, JamPerf, PerfOverlay } from './perf'

// The stage: a fixed camera looking down over the light table from the
// child's side, one frame hook that steps the garden, updates the view, and
// renders (timed as one span for window.__jamPerf), the top tier's glow
// pass, and direct touch. The loop stops whenever the garden is put away.

const TARGET = new THREE.Vector3(0, 0, 12)
const PITCH = (55 * Math.PI) / 180
const FOV = 28
const HALF_WIDTH = 73
const HALF_DEPTH = 51

function fitCamera(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  const aspect = width / height
  const vHalf = THREE.MathUtils.degToRad(FOV / 2)
  const hHalf = Math.atan(Math.tan(vHalf) * aspect)
  const distance = Math.max(HALF_WIDTH / Math.tan(hHalf), HALF_DEPTH / Math.tan(vHalf))
  camera.fov = FOV
  camera.near = 20
  camera.far = distance * 6
  camera.position.set(TARGET.x, TARGET.y + Math.sin(PITCH) * distance, TARGET.z + Math.cos(PITCH) * distance)
  camera.lookAt(TARGET)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}

function makeProjector(camera: THREE.Camera, width: number, height: number): Projector {
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  const ndc = new THREE.Vector2()
  const v = new THREE.Vector3()
  return {
    toPlane(screen, height_, out) {
      ndc.set((screen.x / width) * 2 - 1, -(screen.y / height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
      plane.constant = -height_
      if (!raycaster.ray.intersectPlane(plane, hit)) return null
      const point = out ?? { x: 0, y: 0 }
      point.x = hit.x
      point.y = hit.z
      return point
    },
    toScreen(x, y, h) {
      v.set(x, h, y).project(camera)
      if (v.z > 1) return null
      return { x: ((v.x + 1) / 2) * width, y: ((1 - v.y) / 2) * height }
    },
  }
}

function bindInput(garden: GardenController, element: HTMLCanvasElement): () => void {
  const local = (event: PointerEvent): Point => {
    const rect = element.getBoundingClientRect()
    return { x: event.clientX - rect.left, y: event.clientY - rect.top }
  }
  const down = (event: PointerEvent) => {
    event.preventDefault()
    element.setPointerCapture?.(event.pointerId)
    garden.pointerDown(event.pointerId, local(event), event.timeStamp)
  }
  const move = (event: PointerEvent) => garden.pointerMove(event.pointerId, local(event))
  const up = (event: PointerEvent) => garden.pointerUp(event.pointerId, local(event), event.timeStamp)
  const cancel = (event: PointerEvent) => garden.pointerCancel(event.pointerId)
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
}

function Garden3D({ garden, governor, perf, tier, onTier, running }: { garden: GardenController; governor: QualityGovernor; perf: JamPerf; tier: number; onTier: (tier: number) => void; running: boolean }) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)
  const view = useMemo(() => new GardenView(garden), [garden])
  const glow = useMemo(() => new GlowPass(), [])
  const last = useRef(0)
  const glowOn = useRef(TIERS[tier].glowPass)

  useEffect(() => {
    scene.add(view.root)
    return () => {
      scene.remove(view.root)
      view.dispose()
    }
  }, [scene, view])
  useEffect(() => () => glow.dispose(), [glow])
  useEffect(() => {
    gl.setClearColor(new THREE.Color(...PALETTE.room), 1)
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])
  useEffect(() => {
    view.setTier(TIERS[tier])
    glowOn.current = TIERS[tier].glowPass
  }, [view, tier])
  useEffect(() => {
    last.current = 0
  }, [running])

  useEffect(() => {
    // The canvas's ResizeObserver reports 0×0 while the window is parked; keep the last good camera.
    if (size.width === 0 || size.height === 0) return
    fitCamera(camera, size.width, size.height)
    glow.setSize(size.width, size.height)
    garden.setProjector(makeProjector(camera, size.width, size.height))
  }, [camera, size, glow, garden])

  useEffect(() => bindInput(garden, gl.domElement), [garden, gl])

  useFrame((_, delta) => {
    const start = performance.now()
    const interval = last.current > 0 ? start - last.current : 0
    last.current = start
    if (interval > 0 && governor.sample(interval)) onTier(governor.tier)
    garden.step(Math.min(delta, 1 / 20))
    view.update(garden, camera)
    gl.info.reset()
    gl.render(scene, camera)
    if (glowOn.current) glow.render(gl, scene, camera)
    perf.record(performance.now() - start, interval, gl.info.render.calls, gl.info.render.triangles, governor.tier)
  }, 1)

  return null
}

function startingTier(): number {
  // Touch devices start one tier down so the first seconds never stutter while the governor learns.
  const coarse = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches
  return coarse ? TOP_TIER - 1 : TOP_TIER
}

export function GardenStage({ garden, running }: { garden: GardenController; running: boolean }) {
  const [options] = useState(() => {
    const href = window.location.href
    const pinned = parseTierOverride(href)
    return { governor: new QualityGovernor(pinned ?? startingTier(), pinned !== null), overlay: wantsPerfOverlay(href) }
  })
  const perf = useMemo(() => new JamPerf(), [])
  const [tier, setTier] = useState(options.governor.tier)
  useEffect(() => installJamPerf(perf), [perf])
  const dpr = Math.min(window.devicePixelRatio || 1, TIERS[tier].dpr)
  return (
    <>
      <Canvas
        dpr={dpr}
        frameloop={running ? 'always' : 'never'}
        flat
        gl={{ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false }}
        camera={{ fov: FOV, position: [0, 200, 150], near: 20, far: 2000 }}
        style={{ position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
      >
        <Garden3D garden={garden} governor={options.governor} perf={perf} tier={tier} onTier={setTier} running={running} />
      </Canvas>
      {options.overlay && <PerfOverlay perf={perf} />}
    </>
  )
}
