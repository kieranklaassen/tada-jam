// The stage: the yard as three.js draws it. It owns the renderer, the camera,
// the lights and every model, and it knows nothing of the rules: the Mount
// tells it what happened and it shows it. Everything is built once here.
//
// The look is garden-toy plastic (ART.md, "The look"): one satin material with
// colours in the vertices, one sun, blob shadows, no shadow maps and no post
// pass.

import * as THREE from 'three'
import { TIERS } from './config'
import { FENCE_Z, buildGround, buildSurround, skyColour, type Ground3 } from './gardenModel'
import { COLS, ROWS } from './ground'
import type { Ground2 } from './jet'
import { BELL, SPOTS, TRUCK, TRUCK_REACH, type Place } from './layout'
import { WATER } from './look'
import { GATE_HALF, POOL, SCALE, buildCat, buildDuck, buildFire, buildGate, buildPool, buildPot } from './thingModels'
import { buildTruck, type TruckModel } from './truckModel'
import type { WetPaint } from './wetPaint'

/** The truck stands turned a little toward the child, so its face shows. */
export const TRUCK_TURN = -0.25
/** The truck is the biggest toy in the yard. layout.ts places the nozzle for this size and turn. */
export const TRUCK_SCALE = 1.25

/** What the camera looks at, and from where: over the near edge of the yard, well above it. */
const LOOK_AT = new THREE.Vector3(COLS / 2, 0.5, ROWS / 2 - 0.6)
const CAMERA_PITCH = (55 * Math.PI) / 180
const CAMERA_FOV = 26

/** The corners the camera keeps in view at every size of surface: the yard, and the fence and hedges round it. */
const KEEP_IN_VIEW: readonly THREE.Vector3[] = [
  // The sand, corner to corner. The hedges at the sides may run off the surface.
  new THREE.Vector3(-0.2, 0, 9.6), new THREE.Vector3(COLS + 0.2, 0, 9.6),
  new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(COLS + 0.2, 0, 0),
  // The top of the gate's tall post, and the truck's roof.
  new THREE.Vector3(BELL.x, 3.3, FENCE_Z), new THREE.Vector3(TRUCK.x - 1.6, 2.8, TRUCK.z),
]

export type StageCounts = { drawCalls: number; triangles: number }

/** What is under a point of the surface: the truck, or a place on the ground of the yard. */
export type Under = { truck: boolean; point: Ground2 }

export type Stage = {
  truck: TruckModel
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  plastic: THREE.Material
  glow: THREE.Material
  water: THREE.Material
  /** Sizes the drawing surface. Returns nothing: the Mount draws afterwards. */
  resize: (width: number, height: number, ratio: number) => void
  applyTier: (tier: number) => void
  /** Moves what moves by itself, by `seconds` of game time. */
  idle: (seconds: number, now: number) => void
  draw: (paint: WetPaint) => void
  under: (x: number, y: number) => Under
  /** A blob shadow for something that stands at a place; returns a handle to move or resize it. */
  shadow: (place: Place, radius: number) => (place: Place, radius: number) => void
  counts: StageCounts
  dispose: () => void
}

/** A soft round shadow, drawn once. */
function blobTexture(): THREE.CanvasTexture {
  const size = 64
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const g = canvas.getContext('2d')!
  const fade = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  fade.addColorStop(0, 'rgba(70,52,30,0.5)')
  fade.addColorStop(0.55, 'rgba(70,52,30,0.3)')
  fade.addColorStop(1, 'rgba(70,52,30,0)')
  g.fillStyle = fade
  g.fillRect(0, 0, size, size)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

const MAX_SHADOWS = 24

export function createStage(canvas: HTMLCanvasElement, paint: WetPaint, spike: boolean): Stage {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
  renderer.toneMapping = THREE.NoToneMapping
  const scene = new THREE.Scene()
  scene.background = skyColour()
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 1, 120)

  // One sun from the upper left, and the sky and the warm sand lighting what the sun does not.
  const sky = new THREE.HemisphereLight(0xffffff, 0xf3dfb4, 2.1)
  const sun = new THREE.DirectionalLight(0xfff3dc, 2.2)
  sun.position.set(-7, 14, 9)
  scene.add(sky, sun)

  // The one satin plastic, and its plain form for the lowest tier.
  const satin = new THREE.MeshPhongMaterial({ vertexColors: true, shininess: 42, specular: 0x3a3a3a })
  const matte = new THREE.MeshLambertMaterial({ vertexColors: true })
  let plastic: THREE.Material = satin
  // What gives its own light: flames. Unlit, so a flame never has a shaded side.
  const glow = new THREE.MeshBasicMaterial({ vertexColors: true })
  const water = new THREE.MeshPhongMaterial({ color: WATER.body, shininess: 90, specular: 0x9fd8f0, transparent: true, opacity: 0.86 })

  const ground: Ground3 = buildGround(paint)
  scene.add(ground.mesh)

  const blob = blobTexture()
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false })
  const shadowPlane = new THREE.PlaneGeometry(2, 2)
  shadowPlane.rotateX(-Math.PI / 2)
  const shadows = new THREE.InstancedMesh(shadowPlane, shadowMaterial, MAX_SHADOWS)
  shadows.name = 'shadows'
  shadows.count = 0
  shadows.frustumCulled = false
  shadows.renderOrder = 1
  scene.add(shadows)
  const matrix = new THREE.Matrix4()
  const shadow = (place: Place, radius: number) => {
    const index = Math.min(MAX_SHADOWS - 1, shadows.count)
    shadows.count = index + 1
    const set = (at: Place, size: number) => {
      matrix.makeScale(size, 1, size * 0.86).setPosition(at.x + size * 0.12, 0.02 + index * 0.0006, at.z + size * 0.1)
      shadows.setMatrixAt(index, matrix)
      shadows.instanceMatrix.needsUpdate = true
    }
    set(place, radius)
    return set
  }

  const truck = buildTruck(plastic)
  truck.root.position.set(TRUCK.x, 0, TRUCK.z)
  truck.root.rotation.y = TRUCK_TURN
  truck.root.scale.setScalar(TRUCK_SCALE)
  scene.add(truck.root)
  shadow(TRUCK, 2.6)

  const gate = spike ? buildGate(plastic) : null
  // The bell hangs from the gate's left post, so the gate's middle is that far to the right of the bell.
  const gateX = BELL.x + GATE_HALF
  scene.add(buildSurround(plastic, gate ? [gateX - GATE_HALF, gateX + GATE_HALF] : null))

  // The spike: the fullest yard the look has to carry, standing still. The toy's yard is empty.
  const alive: ((now: number) => void)[] = []
  if (gate) {
    gate.root.position.set(gateX, 0, FENCE_Z)
    scene.add(gate.root)
    shadow(BELL, 0.5)
    alive.push((now) => { gate.bell.rotation.z = Math.sin(now * 1.3) * 0.05 })

    const fire = buildFire(plastic, glow)
    fire.root.position.set(SPOTS[0].x, 0, SPOTS[0].z)
    fire.root.scale.setScalar(SCALE.fire)
    scene.add(fire.root)
    shadow(SPOTS[0], 1.35)
    alive.push((now) => {
      fire.flames.scale.set(1 + Math.sin(now * 9.1) * 0.05, 1 + Math.sin(now * 6.3) * 0.09 + Math.sin(now * 13.7) * 0.04, 1 + Math.cos(now * 7.7) * 0.05)
      fire.flames.rotation.y = Math.sin(now * 2.2) * 0.5
    })

    const cat = buildCat(plastic)
    cat.root.position.set(SPOTS[1].x, 0, SPOTS[1].z)
    cat.root.rotation.y = -2.0
    cat.root.scale.setScalar(SCALE.cat)
    scene.add(cat.root)
    shadow(SPOTS[1], 1.15)
    alive.push((now) => { cat.head.rotation.z = Math.sin(now * 0.9) * 0.07; cat.head.rotation.y = Math.sin(now * 0.37) * 0.25 })

    const pool = buildPool(plastic, water)
    pool.root.position.set(SPOTS[2].x, 0, SPOTS[2].z)
    pool.root.scale.setScalar(SCALE.pool)
    scene.add(pool.root)
    shadow(SPOTS[2], 1.8)
    const duck = buildDuck(plastic)
    const duckFloor = POOL.floor * SCALE.pool
    duck.position.set(SPOTS[2].x - 0.15, duckFloor, SPOTS[2].z + 0.1)
    duck.rotation.y = -0.6
    duck.scale.setScalar(SCALE.duck)
    scene.add(duck)
    alive.push((now) => { duck.rotation.z = Math.sin(now * 1.7) * 0.06; duck.position.y = duckFloor + Math.abs(Math.sin(now * 1.7)) * 0.03 })

    const pot = buildPot(plastic)
    pot.root.position.set(SPOTS[3].x, 0, SPOTS[3].z)
    pot.root.scale.setScalar(SCALE.seed)
    scene.add(pot.root)
    shadow(SPOTS[3], 1.2)
    alive.push((now) => { pot.plant.rotation.z = Math.sin(now * 1.1) * 0.05 })
  }

  let width = 0, height = 0
  const projected = new THREE.Vector3()
  const fits = (): boolean => {
    camera.updateMatrixWorld()
    for (const corner of KEEP_IN_VIEW) {
      projected.copy(corner).project(camera)
      if (Math.abs(projected.x) > 0.97 || projected.y > 0.95 || projected.y < -0.99) return false
    }
    return true
  }
  const frame = () => {
    camera.aspect = width / Math.max(1, height)
    camera.updateProjectionMatrix()
    // Back off until the whole yard is in view. A wide surface is bound by its height, a tall one by its width.
    for (let distance = 14; distance < 90; distance *= 1.03) {
      camera.position.set(LOOK_AT.x, LOOK_AT.y + Math.sin(CAMERA_PITCH) * distance, LOOK_AT.z + Math.cos(CAMERA_PITCH) * distance)
      camera.lookAt(LOOK_AT)
      if (fits()) break
    }
  }

  const ray = new THREE.Raycaster()
  const pointer = new THREE.Vector2()
  const floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
  const hit = new THREE.Vector3()
  // A child touches the picture of the truck, which stands taller than the ground under it.
  const truckBall = new THREE.Sphere(new THREE.Vector3(TRUCK.x, 1.2, TRUCK.z), TRUCK_REACH)

  // The lowest tier's plastic is compiled now, so a tier change never stalls a frame.
  const warm = new THREE.Mesh(shadowPlane, matte)
  renderer.compile(warm, camera, scene)

  const counts: StageCounts = { drawCalls: 0, triangles: 0 }
  const everything = [satin, matte, glow, water, shadowMaterial]

  return {
    truck,
    scene,
    camera,
    get plastic() { return plastic },
    glow,
    water,
    resize: (w, h, ratio) => {
      width = w
      height = h
      renderer.setPixelRatio(ratio)
      renderer.setSize(w, h, false)
      frame()
    },
    applyTier: (tier) => {
      const settings = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))]
      ground.setDetail(settings.detail)
      const next = settings.shine ? satin : matte
      if (next !== plastic) {
        scene.traverse((object) => {
          const mesh = object as THREE.Mesh
          if (mesh.isMesh && mesh.material === plastic) mesh.material = next
        })
        plastic = next
      }
    },
    idle: (_seconds, now) => {
      for (const move of alive) move(now)
    },
    draw: (picture) => {
      ground.refresh(picture)
      renderer.render(scene, camera)
      counts.drawCalls = renderer.info.render.calls
      counts.triangles = renderer.info.render.triangles
    },
    under: (x, y) => {
      pointer.set((x / Math.max(1, width)) * 2 - 1, 1 - (y / Math.max(1, height)) * 2)
      ray.setFromCamera(pointer, camera)
      if (ray.ray.intersectsSphere(truckBall)) return { truck: true, point: { x: TRUCK.x, z: TRUCK.z } }
      // A finger above the far fence points at the sky: the water goes as far as the yard does.
      if (!ray.ray.intersectPlane(floor, hit)) return { truck: false, point: { x: COLS / 2, z: 0 } }
      return { truck: false, point: { x: hit.x, z: hit.z } }
    },
    shadow,
    counts,
    dispose: () => {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.isMesh) mesh.geometry.dispose()
      })
      ground.dispose()
      blob.dispose()
      for (const material of everything) material.dispose()
      renderer.dispose()
    },
  }
}
