import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useCallback, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Projector, WorkshopController } from '../controller'
import type { Screen } from '../input'
import { CAMERA, TRAY, traySlot, TURNTABLE, WALK, type Point } from '../layout'
import { PALETTE } from '../palette'
import type { PartKind } from '../parts'
import { jamPerf, tierFeatures, type JamPerf, type PerfMonitor } from '../perf'
import { displayBase } from '../rig'
import { BOIL_FPS, createClayMaterials, type ClayMaterials } from './clay'
import { WorkshopScene } from './scene'

// The workshop stage: a fixed camera looking down at the bench in cool
// daylight, no shadow maps (blob shadows do that), no render targets, and
// one frame hook that steps the controller, uploads the rig, renders, and
// measures. The quality tier (DPR, the finish overlay, the clay normal map)
// follows measured frame time.

declare global {
  interface Window {
    __jamPerf?: JamPerf
    __critterClayProbe?: CritterClayProbe
  }
}

/**
 * Behind `?probe=1` only: screen positions of what a scripted walkthrough
 * needs to touch (tray slots, noses, bodies, sockets), read-only.
 */
export type CritterClayProbe = {
  tray(kind: PartKind): Screen | null
  critters(): { id: number; mode: string; awake: boolean; parts: number; nose: Screen | null; body: Screen | null }[]
  socket(critterId: number, kind: PartKind): Screen | null
  turntable(): Screen | null
}

function wantsProbe(search: string): boolean {
  return new URLSearchParams(search).get('probe') === '1'
}

function probeFor(controller: WorkshopController, projector: Projector): CritterClayProbe {
  const screen = (x: number, y: number, z: number): Screen | null => {
    const out = { x: 0, y: 0 }
    return projector.toScreen(x, y, z, out) ? out : null
  }
  const matrix = new THREE.Matrix4()
  const v = new THREE.Vector3()
  return {
    tray(kind) {
      const slot = traySlot(kind)
      return screen(slot.x, TRAY.height + displayBase(kind), slot.z)
    },
    critters() {
      return controller.critters
        .filter((critter) => !critter.gone)
        .map((critter) => ({
          id: critter.save.id,
          mode: critter.mode,
          awake: critter.awake,
          parts: critter.save.parts.length,
          nose: screen(critter.world.nose[0], critter.world.nose[1], critter.world.nose[2]),
          body: screen(critter.world.body[0], critter.world.body[1], critter.world.body[2]),
        }))
    },
    socket(critterId, kind) {
      const critter = controller.critters.find((c) => c.save.id === critterId && !c.gone)
      if (!critter || !controller.rig.socket(critter, kind, matrix)) return null
      v.setFromMatrixPosition(matrix)
      return screen(v.x, v.y, v.z)
    },
    turntable() {
      return screen(TURNTABLE.x, TURNTABLE.height, TURNTABLE.z)
    },
  }
}

/** What the camera must always show: the walkable bench, the tray, and a critter standing at either edge. */
const FRAME = { minX: WALK.minX - 2, maxX: TRAY.x + TRAY.halfWidth, minZ: -TRAY.halfDepth, maxZ: WALK.maxZ + 4, top: 8 } as const
const FIT_NDC = 0.96

function fitCamera(camera: THREE.PerspectiveCamera, aspect: number): void {
  camera.fov = CAMERA.fov
  camera.aspect = aspect
  camera.near = 10
  const target = new THREE.Vector3(CAMERA.target.x, CAMERA.target.y, CAMERA.target.z)
  const corners: THREE.Vector3[] = []
  for (const x of [FRAME.minX, FRAME.maxX]) for (const y of [0, FRAME.top]) for (const z of [FRAME.minZ, FRAME.maxZ]) corners.push(new THREE.Vector3(x, y, z))
  const v = new THREE.Vector3()
  const aim = (distance: number) => {
    camera.position.set(target.x, target.y + Math.sin(CAMERA.pitch) * distance, target.z + Math.cos(CAMERA.pitch) * distance)
    camera.lookAt(target)
    camera.updateMatrixWorld()
    camera.far = distance * 4
    camera.updateProjectionMatrix()
  }
  const extent = () => {
    let minY = Infinity
    let maxY = -Infinity
    let maxX = 0
    for (const corner of corners) {
      v.copy(corner).project(camera)
      minY = Math.min(minY, v.y)
      maxY = Math.max(maxY, v.y)
      maxX = Math.max(maxX, Math.abs(v.x))
    }
    return { minY, maxY, maxX }
  }
  let distance = 150
  for (let pass = 0; pass < 3; pass++) {
    let lo = 30
    let hi = 1200
    for (let i = 0; i < 32; i++) {
      const mid = (lo + hi) / 2
      aim(mid)
      const e = extent()
      if (e.maxX <= FIT_NDC && e.maxY <= FIT_NDC && e.minY >= -FIT_NDC) hi = mid
      else lo = mid
    }
    distance = hi
    aim(distance)
    const e = extent()
    const center = (e.maxY + e.minY) / 2
    target.z -= (center * distance * Math.tan(THREE.MathUtils.degToRad(CAMERA.fov / 2))) / Math.sin(CAMERA.pitch)
  }
  aim(distance)
}

function CameraFit() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return
    fitCamera(camera, size.width / size.height)
  }, [camera, size])
  return null
}

function Lights() {
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    scene.background = new THREE.Color(PALETTE.backdrop)
  }, [scene])
  return (
    <>
      <hemisphereLight args={['#e8f0ff', '#4f627c', 0.75]} />
      <directionalLight color="#fbfdff" intensity={3.3} position={[-80, 120, 70]} />
      <directionalLight color="#bcd2ff" intensity={0.55} position={[120, 40, 40]} />
      <directionalLight color="#ffffff" intensity={1.2} position={[30, 70, -130]} />
    </>
  )
}

/** The camera as the controller's projector, plus pointer input on the canvas. */
function Input({ controller }: { controller: WorkshopController }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const gl = useThree((state) => state.gl)
  const sizeRef = useRef(size)
  sizeRef.current = size
  const projector = useMemo<Projector>(() => {
    const v = new THREE.Vector3()
    const ndc = new THREE.Vector2()
    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    return {
      toScreen(x: number, y: number, z: number, out: Screen) {
        v.set(x, y, z).project(camera)
        if (v.z > 1) return false
        out.x = ((v.x + 1) / 2) * sizeRef.current.width
        out.y = ((1 - v.y) / 2) * sizeRef.current.height
        return true
      },
      toPlane(screen: Screen, height: number, out: Point) {
        ndc.set((screen.x / sizeRef.current.width) * 2 - 1, -(screen.y / sizeRef.current.height) * 2 + 1)
        raycaster.setFromCamera(ndc, camera)
        plane.constant = -height
        if (!raycaster.ray.intersectPlane(plane, hit)) return false
        out.x = hit.x
        out.z = hit.z
        return true
      },
      scaleAt(x: number, y: number, z: number) {
        const perspective = camera as THREE.PerspectiveCamera
        v.set(x, y, z).applyMatrix4(perspective.matrixWorldInverse)
        const depth = Math.max(1, -v.z)
        return sizeRef.current.height / (2 * depth * Math.tan(THREE.MathUtils.degToRad(perspective.fov / 2)))
      },
    }
  }, [camera])

  useEffect(() => {
    controller.setProjector(projector)
  }, [controller, projector, size])

  useEffect(() => {
    if (!wantsProbe(window.location.search)) return
    window.__critterClayProbe = probeFor(controller, projector)
    return () => {
      delete window.__critterClayProbe
    }
  }, [controller, projector])

  useEffect(() => {
    const element = gl.domElement
    const local = (event: PointerEvent): Screen => {
      const rect = element.getBoundingClientRect()
      return { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const down = (event: PointerEvent) => {
      event.preventDefault()
      element.setPointerCapture?.(event.pointerId)
      controller.pointerDown(event.pointerId, local(event), event.timeStamp)
    }
    const move = (event: PointerEvent) => controller.pointerMove(event.pointerId, local(event), event.timeStamp)
    const up = (event: PointerEvent) => controller.pointerUp(event.pointerId, local(event), event.timeStamp)
    const cancel = (event: PointerEvent) => controller.pointerCancel(event.pointerId)
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
  }, [controller, gl])
  return null
}

/** The one frame hook: step, upload, render, measure, and adapt the tier. */
function Loop({ controller, scene, materials, monitor, running }: { controller: WorkshopController; scene: WorkshopScene; materials: ClayMaterials; monitor: PerfMonitor; running: boolean }) {
  const setDpr = useThree((state) => state.setDpr)
  const size = useThree((state) => state.size)
  const last = useRef(0)

  const apply = useCallback(() => {
    const features = tierFeatures(monitor.tiers.tier, window.devicePixelRatio || 1)
    setDpr(features.dpr)
    scene.setOverlay(features.overlay)
    materials.setNormalMaps(features.normalMap)
  }, [monitor, setDpr, scene, materials])

  useEffect(() => apply(), [apply])

  useEffect(() => {
    last.current = 0
  }, [running])

  useEffect(() => {
    const aspect = materials.overlay.uniforms.uAspect
    aspect.value = size.height > 0 ? size.width / size.height : 1
  }, [materials, size])

  useEffect(() => {
    const view = jamPerf(monitor)
    window.__jamPerf = view
    return () => {
      if (window.__jamPerf === view) delete window.__jamPerf
    }
  }, [monitor])

  useFrame((state, dt) => {
    const start = performance.now()
    if (last.current > 0) {
      const interval = start - last.current
      monitor.intervals.push(interval)
      if (monitor.tiers.frame(interval)) apply()
    }
    last.current = start
    controller.step(Math.min(dt, 1 / 20))
    scene.sync(controller)
    materials.boilStep.value = Math.floor(controller.t * BOIL_FPS)
    state.gl.render(state.scene, state.camera)
    monitor.cpu.push(performance.now() - start)
    monitor.drawCalls = state.gl.info.render.calls
    monitor.triangles = state.gl.info.render.triangles
  }, 1)
  return null
}

export function Stage({ controller, monitor, running }: { controller: WorkshopController; monitor: PerfMonitor; running: boolean }) {
  const materials = useMemo(() => createClayMaterials(), [])
  const scene = useMemo(() => new WorkshopScene(controller.rig, materials), [controller, materials])
  useEffect(() => () => scene.dispose(), [scene])
  useEffect(() => () => materials.dispose(), [materials])
  const dpr = tierFeatures(monitor.tiers.tier, typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1).dpr
  return (
    <Canvas
      dpr={dpr}
      frameloop={running ? 'always' : 'never'}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: CAMERA.fov, position: [0, 150, 120], near: 10, far: 1200 }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
    >
      <CameraFit />
      <Lights />
      <primitive object={scene.root} />
      <Input controller={controller} />
      <Loop controller={controller} scene={scene} materials={materials} monitor={monitor} running={running} />
    </Canvas>
  )
}
