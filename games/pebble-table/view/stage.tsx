import { Canvas, useThree } from '@react-three/fiber'
import { EffectComposer, ToneMapping } from '@react-three/postprocessing'
import { ToneMappingMode } from 'postprocessing'
import { useEffect, useMemo, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Point } from '../layout'
import { toWorld2, type Vec3 } from '../physics3d'
import { PALETTE } from './clay'
import { ClayFinishEffect } from './finish'
import { ClayProvider } from './models'

// The claymation stage: a fixed camera at a slight angle over the table, a
// warm key light with a cool bounce from the table, no shadow maps (blob
// shadows do that job), and one post pass. DPR is capped at 2.

const TARGET = new THREE.Vector3(1, 0, 4)
const PITCH = (56 * Math.PI) / 180
const FOV = 30
const HALF_WIDTH = 82
const HALF_DEPTH = 54

function CameraRig() {
  const camera = useThree((state) => state.camera) as THREE.PerspectiveCamera
  const size = useThree((state) => state.size)
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return
    const aspect = size.width / size.height
    const vHalf = THREE.MathUtils.degToRad(FOV / 2)
    const hHalf = Math.atan(Math.tan(vHalf) * aspect)
    const distance = Math.max(HALF_WIDTH / Math.tan(hHalf), HALF_DEPTH / Math.tan(vHalf))
    camera.fov = FOV
    camera.near = 20
    camera.far = distance * 5
    camera.position.set(TARGET.x, TARGET.y + Math.sin(PITCH) * distance, TARGET.z + Math.cos(PITCH) * distance)
    camera.lookAt(TARGET)
    camera.updateProjectionMatrix()
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
      <ambientLight color="#fff0dc" intensity={0.28} />
      <hemisphereLight args={['#fff1dc', '#7f9696', 0.7]} />
      <directionalLight color="#ffd6a8" intensity={3.3} position={[-110, 105, 70]} />
      <directionalLight color="#cfe0ff" intensity={0.5} position={[110, 60, 30]} />
    </>
  )
}

function Finish() {
  const dpr = useThree((state) => state.viewport.dpr)
  const effect = useMemo(() => new ClayFinishEffect({ focusCenter: 0.52, focusBand: 0.2, blurRadius: 2.6 * dpr, warmth: 0.5, vignette: 0.26 }), [dpr])
  return (
    <EffectComposer multisampling={dpr >= 2 ? 0 : 4} enableNormalPass={false}>
      <primitive object={effect} />
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
    </EffectComposer>
  )
}

export type ProjectorHandle = {
  toScreen(point: Vec3): Point | null
  toPlane(screen: Point, height: number): Point | null
}

/** Exposes the camera as a projector so game logic can hit-test in screen space. */
export function ProjectorBridge({ onReady }: { onReady: (projector: ProjectorHandle, element: HTMLCanvasElement) => void }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const hit = new THREE.Vector3()
    onReady(
      {
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
      },
      gl.domElement,
    )
  }, [camera, size, gl, onReady])
  return null
}

export function Stage({ running, children }: { running: boolean; children: ReactNode }) {
  return (
    <Canvas
      dpr={[1, 2]}
      frameloop={running ? 'always' : 'never'}
      flat
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      camera={{ fov: FOV, position: [0, 180, 120], near: 20, far: 1000 }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
    >
      <ClayProvider>
        <CameraRig />
        <Lights />
        {children}
        <Finish />
      </ClayProvider>
    </Canvas>
  )
}
