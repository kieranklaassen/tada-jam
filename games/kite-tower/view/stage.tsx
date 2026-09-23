import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { Projector } from '../controller'
import { TRAY } from '../layout'
import type { Vec2 } from '../pieces'
import { TIERS, type PerfRing, type Tier, type TierGovernor } from '../quality'
import { fitCamera, FOV } from './camera'

// The playroom stage: the fixed camera from camera.ts, three lights (a soft
// daylight key, a warm window rim, a sky-and-rug fill) and no shadow maps. The canvas renders on demand, paced by requestAnimationFrame
// (half rate once the room has rested a while), and this file owns the
// render call so it can time each frame's CPU work for the tier governor and
// the grown-up perf readout.

export const PALETTE = {
  wall: '#f7f1e7',
  rug: '#f1e9d8',
  shadow: '#5a3a20',
}

const TierContext = createContext<Tier>(TIERS[0])

export function useTier(): Tier {
  return useContext(TierContext)
}

/** Seconds of stillness before rendering drops to every other display frame. */
const REST_BEFORE_PACING = 20

function CameraRig() {
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
    scene.background = new THREE.Color(PALETTE.wall)
  }, [scene])
  // Key: soft daylight from the room behind the viewer. Rim: warm sun from the window, behind and to the left. Fill: sky above, warm rug below.
  return (
    <>
      <hemisphereLight args={['#f6f4ff', '#ecd3ad', 1.55]} />
      <directionalLight color="#fff3e2" intensity={2.3} position={[-5, 10, 9]} />
      <directionalLight color="#ffdcaa" intensity={1.2} position={[-7, 7, -8]} />
    </>
  )
}

/**
 * The warm grade and vignette: one full-screen triangle multiplied over the
 * frame (no render target), drawn last. Only on the top tiers.
 */
function Grade() {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        depthTest: false,
        depthWrite: false,
        transparent: true,
        blending: THREE.CustomBlending,
        blendSrc: THREE.DstColorFactor,
        blendDst: THREE.ZeroFactor,
        uniforms: { aspect: { value: 1 } },
        vertexShader: 'varying vec2 vUv;\nvoid main() { vUv = position.xy * 0.5 + 0.5; gl_Position = vec4(position.xy, 0.0, 1.0); }',
        fragmentShader: `varying vec2 vUv;
uniform float aspect;
void main() {
  vec2 p = (vUv - vec2(0.5, 0.56)) * vec2(aspect, 1.0);
  float edge = smoothstep(0.42, 1.05, length(p));
  vec3 warm = mix(vec3(1.0, 0.995, 0.975), vec3(0.8, 0.72, 0.64), edge);
  gl_FragColor = vec4(warm, 1.0);
}`,
      }),
    [],
  )
  const geometry = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
    return g
  }, [])
  const size = useThree((state) => state.size)
  useEffect(() => {
    material.uniforms.aspect.value = size.width / Math.max(1, size.height)
  }, [material, size])
  useEffect(
    () => () => {
      material.dispose()
      geometry.dispose()
    },
    [material, geometry],
  )
  return <mesh geometry={geometry} material={material} frustumCulled={false} renderOrder={1000} />
}

export type PerfHandle = { ring: PerfRing; governor: TierGovernor; render: { calls: number; triangles: number } }

/** Paces rendering, times each frame, feeds the governor, applies the tier, and makes the one render call. */
function FrameLoop({ perf, running, restingFor, onTier }: { perf: PerfHandle; running: boolean; restingFor: () => number; onTier: (tier: number) => void }) {
  const gl = useThree((state) => state.gl)
  const invalidate = useThree((state) => state.invalidate)
  const frame = useRef({ start: 0, last: 0, work: 0, skip: 2 })

  useEffect(() => {
    if (!running) return
    let handle = 0
    let count = 0
    const loop = () => {
      count += 1
      const paced = restingFor() > REST_BEFORE_PACING
      if (paced) frame.current.skip = 2
      if (!paced || count % 2 === 0) invalidate()
      handle = requestAnimationFrame(loop)
    }
    handle = requestAnimationFrame(loop)
    frame.current.last = 0
    return () => cancelAnimationFrame(handle)
  }, [running, restingFor, invalidate])

  useEffect(() => {
    gl.info.autoReset = false
    return () => {
      gl.info.autoReset = true
    }
  }, [gl])

  useFrame(() => {
    gl.info.reset()
    const now = performance.now()
    const f = frame.current
    if (f.skip > 0) f.skip -= 1
    else if (f.last > 0 && perf.governor.sample(now - f.last, f.work)) onTier(perf.governor.tier)
    f.last = now
    f.start = now
  }, -3)

  useFrame(({ scene, camera }) => {
    gl.render(scene, camera)
    const f = frame.current
    f.work = performance.now() - f.start
    perf.ring.push(f.work)
    perf.render.calls = gl.info.render.calls
    perf.render.triangles = gl.info.render.triangles
  }, 1)
  return null
}

/** Exposes the camera to the controller for screen-space hit tests. */
export function ProjectorBridge({ onReady }: { onReady: (projector: Projector, element: HTMLCanvasElement) => void }) {
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const gl = useThree((state) => state.gl)
  useEffect(() => {
    const raycaster = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    const v = new THREE.Vector3()
    const hit = new THREE.Vector3()
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0)
    const c = Math.cos(TRAY.tilt)
    const s = Math.sin(TRAY.tilt)
    const trayNormal = new THREE.Vector3(0, c, s)
    const trayCenter = new THREE.Vector3(TRAY.center.x, TRAY.center.y, TRAY.center.z)
    const trayPlane = new THREE.Plane().setFromNormalAndCoplanarPoint(trayNormal, trayCenter)
    const cast = (screen: Vec2) => {
      ndc.set((screen.x / size.width) * 2 - 1, -(screen.y / size.height) * 2 + 1)
      raycaster.setFromCamera(ndc, camera)
    }
    onReady(
      {
        toScreen(p, out) {
          v.set(p.x, p.y, p.z).project(camera)
          if (v.z > 1) return null
          out.x = ((v.x + 1) / 2) * size.width
          out.y = ((1 - v.y) / 2) * size.height
          return out
        },
        toPlane(screen, z) {
          cast(screen)
          plane.constant = -z
          const point = raycaster.ray.intersectPlane(plane, hit)
          return point ? { x: point.x, y: point.y } : null
        },
        toTray(screen) {
          cast(screen)
          const point = raycaster.ray.intersectPlane(trayPlane, hit)
          if (!point) return null
          const dy = point.y - trayCenter.y
          const dz = point.z - trayCenter.z
          return { x: point.x - trayCenter.x, y: -dy * s + dz * c }
        },
      },
      gl.domElement,
    )
  }, [camera, size, gl, onReady])
  return null
}

export function Stage({
  running,
  perf,
  restingFor,
  onTier,
  children,
}: {
  running: boolean
  perf: PerfHandle
  restingFor: () => number
  onTier: (tier: Tier) => void
  children: ReactNode
}) {
  return (
    <Canvas
      dpr={Math.min(typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1, TIERS[perf.governor.tier].dpr)}
      frameloop={running ? 'demand' : 'never'}
      gl={{ antialias: false, powerPreference: 'high-performance', stencil: false }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.NeutralToneMapping
        gl.toneMappingExposure = 1.02
      }}
      camera={{ fov: FOV, position: [0, 6, 40], near: 1, far: 200 }}
      style={{ position: 'absolute', inset: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' }}
    >
      <TierProvider perf={perf} running={running} restingFor={restingFor} onTier={onTier}>
        <CameraRig />
        <Lights />
        {children}
      </TierProvider>
    </Canvas>
  )
}

function TierProvider({
  perf,
  running,
  restingFor,
  onTier,
  children,
}: {
  perf: PerfHandle
  running: boolean
  restingFor: () => number
  onTier: (tier: Tier) => void
  children: ReactNode
}) {
  const [tier, setTier] = useState(perf.governor.tier)
  const settings = TIERS[tier]
  const gl = useThree((state) => state.gl)
  const setDpr = useThree((state) => state.setDpr)
  useEffect(() => {
    setDpr(Math.min(window.devicePixelRatio || 1, settings.dpr))
    gl.domElement.dataset.quality = settings.name
    onTier(settings)
  }, [settings, gl, setDpr, onTier])
  return (
    <TierContext.Provider value={settings}>
      <FrameLoop perf={perf} running={running} restingFor={restingFor} onTier={setTier} />
      {children}
      {settings.grade && <Grade />}
    </TierContext.Provider>
  )
}
