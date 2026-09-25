import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Point } from '../layout'
import { toWorld2, type Vec3 } from '../physics3d'
import { PALETTE } from './clay'
import { ClayFinishEffect, installClayToneMapping } from './finish'
import type { QualityGovernor } from '../quality'
import { ClayProvider } from './models'
import { QualityProvider, useQuality } from './quality'

// The claymation stage: a fixed camera at a slight angle over the table, a
// warm key light with a cool bounce from the table, no shadow maps (blob
// shadows do that job), and at most one post pass. DPR, the post pass, and
// fur follow the adaptive quality tier; physics never does.

const TARGET = new THREE.Vector3(1, 0, 2)
const PITCH = (46 * Math.PI) / 180
const FOV = 27
const HALF_WIDTH = 82
const HALF_DEPTH = 46

/** Stands `camera` where the stage's stands for a view `aspect` (width over height) wide, the whole table in sight. */
export function placeCamera(camera: THREE.PerspectiveCamera, aspect: number): void {
  const vHalf = THREE.MathUtils.degToRad(FOV / 2)
  const hHalf = Math.atan(Math.tan(vHalf) * aspect)
  const distance = Math.max(HALF_WIDTH / Math.tan(hHalf), HALF_DEPTH / Math.tan(vHalf))
  camera.fov = FOV
  camera.aspect = aspect
  camera.near = 20
  camera.far = distance * 5
  camera.position.set(TARGET.x, TARGET.y + Math.sin(PITCH) * distance, TARGET.z + Math.cos(PITCH) * distance)
  camera.lookAt(TARGET)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}

function CameraRig() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return
    placeCamera(camera, size.width / size.height)
  }, [camera, size])
  return null
}

function Lights() {
  const scene = useThree((state) => state.scene)
  useEffect(() => {
    scene.background = new THREE.Color(PALETTE.backdrop)
    scene.fog = new THREE.Fog(PALETTE.backdrop, 320, 700)
  }, [scene])
  return (
    <>
      <ambientLight color="#ffe9cc" intensity={0.2} />
      <hemisphereLight args={['#fff0d8', '#6f8a88', 0.55]} />
      <directionalLight color="#ffd09a" intensity={3.7} position={[-110, 100, 70]} />
      <directionalLight color="#c9dcff" intensity={0.55} position={[110, 55, 30]} />
      <directionalLight color="#fff2dc" intensity={1.1} position={[-30, 70, -130]} />
    </>
  )
}

function Finish() {
  const dpr = useThree((state) => state.viewport.dpr)
  const gl = useThree((state) => state.gl)
  const { post } = useQuality()
  const effect = useMemo(() => new ClayFinishEffect({ focusCenter: 0.47, focusBand: 0.24, blurRadius: 2.4 * dpr, warmth: 0.3, vignette: 0.3 }), [dpr])
  useEffect(() => {
    effect.uniforms.get('blurRadius')!.value = post === 'full' ? 2.4 * dpr : 0
  }, [effect, post, dpr])
  useEffect(() => {
    if (post === 'off') installClayToneMapping()
    gl.toneMapping = post === 'off' ? THREE.CustomToneMapping : THREE.NoToneMapping
  }, [gl, post])
  useEffect(() => () => effect.dispose(), [effect])
  if (post === 'off') return <DirectRender />
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      <primitive object={effect} />
    </EffectComposer>
  )
}

/** Without a post pass the scene renders straight to the screen (a positive-priority frame hook turns off the automatic render). */
function DirectRender() {
  useFrame(({ gl, scene, camera }) => gl.render(scene, camera), 1)
  return null
}

export type ProjectorHandle = {
  toScreen(point: Vec3): Point | null
  toPlane(screen: Point, height: number): Point | null
}

/** Screen pixels (in a view `size` big) to and from the world, as `camera` sees it. */
export function cameraProjector(camera: THREE.Camera, size: { width: number; height: number }): ProjectorHandle {
  const raycaster = new THREE.Raycaster()
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  return {
    toScreen(point) {
      const v = new THREE.Vector3(point.x, point.y, point.z).project(camera)
      if (v.z > 1) return null
      return { x: ((v.x + 1) / 2) * size.width, y: ((1 - v.y) / 2) * size.height }
    },
    toPlane(screen, height) {
      raycaster.setFromCamera(new THREE.Vector2((screen.x / size.width) * 2 - 1, -(screen.y / size.height) * 2 + 1), camera)
      plane.constant = -height
      const point = raycaster.ray.intersectPlane(plane, hit)
      return point ? toWorld2(point) : null
    },
  }
}

/** Exposes the camera as a projector so game logic can hit-test in screen space. */
export function ProjectorBridge({ onReady }: { onReady: (projector: ProjectorHandle, element: HTMLCanvasElement) => void }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    onReady(cameraProjector(camera, size), gl.domElement)
  }, [camera, size, gl, onReady])
  return null
}

export function Stage({
  running,
  governor,
  restingFor,
  children,
}: {
  running: boolean
  governor: QualityGovernor
  restingFor: () => number
  children: ReactNode
}) {
  return (
    <Canvas
      dpr={Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, 2)}
      frameloop={running ? 'demand' : 'never'}
      flat
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: FOV, position: [0, 180, 120], near: 20, far: 1000 }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
    >
      <QualityProvider governor={governor} running={running} restingFor={restingFor}>
        <ClayProvider>
          <CameraRig />
          <Lights />
          {children}
          <Finish />
        </ClayProvider>
      </QualityProvider>
    </Canvas>
  )
}
