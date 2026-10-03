// The stage: the game as three.js draws it. It owns the renderer, the camera,
// the lights and every model, and it knows nothing of the rules: the Mount
// hands it the game each frame and it shows what the game holds. Everything is
// built once here.
//
// The look is garden-toy plastic (ART.md, "The look"): one satin material with
// colours in the vertices, one sun, blob shadows, no shadow maps and no post
// pass.

import * as THREE from 'three'
import { TIERS } from './config'
import type { Game } from './game'
import { FENCE_Z, HEDGE_STEP, buildFarSide, buildGround, buildHedges, skyColour, type Ground3 } from './gardenModel'
import { COLS, ROWS } from './ground'
import type { HandPose } from './guidance'
import { buildGuideView } from './guideView'
import type { Ground2 } from './jet'
import { GATE, TRUCK, TRUCK_REACH, YARD_PITCH, type Place } from './layout'
import { WATER } from './look'
import { FACING_GATE, restChannels } from './scenes'
import { BARREL, buildTruck, poseTruck, type TruckModel } from './truckModel'
import { buildWaterView } from './waterView'
import { YardSet } from './yardView'

/** The truck stands turned a little toward the child, so its face shows. */
export const TRUCK_TURN = -0.25
/** The truck is the biggest toy in the yard. layout.ts places the nozzle for this size and turn. */
export const TRUCK_SCALE = 1.25

/** What the camera looks at, and from where: over the near edge of the yard, well above it. */
const LOOK_AT = new THREE.Vector3(COLS / 2, 0.5, ROWS / 2 - 0.6)
const CAMERA_PITCH = (55 * Math.PI) / 180
const CAMERA_FOV = 26

/** The corners the camera keeps in view at every size of surface. */
const KEEP_IN_VIEW: readonly THREE.Vector3[] = [
  // The sand, corner to corner. The hedges at the sides may run off the surface.
  new THREE.Vector3(-0.2, 0, 9.6), new THREE.Vector3(COLS + 0.2, 0, 9.6),
  new THREE.Vector3(-0.2, 0, 0), new THREE.Vector3(COLS + 0.2, 0, 0),
  // The top of the gate's tall post, and the truck's roof.
  new THREE.Vector3(GATE.x + GATE.half, 3.3, FENCE_Z), new THREE.Vector3(TRUCK.x - 1.6, 2.8, TRUCK.z),
]

export type StageCounts = { drawCalls: number; triangles: number }

/** What is under a point of the surface: the truck, or a place in the yard. A finger on a tall thing's picture is on the thing. */
export type Under = { truck: boolean; point: Ground2 }

export type Stage = {
  truck: TruckModel
  resize: (width: number, height: number, ratio: number) => void
  applyTier: (tier: number) => void
  /** Shows the game as it stands. */
  show: (game: Game) => void
  /** Shows an idle child where a touch could go: a glow, and the ghost hand when a demonstration plays. */
  guide: (glow: number, hand: HandPose | null, at: Place, now: number) => void
  /** Draws the frame. With no game yet it draws the bare yard. */
  draw: () => void
  under: (x: number, y: number) => Under
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

export function createStage(canvas: HTMLCanvasElement): Stage {
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

  let ground: Ground3 | null = null
  const blob = blobTexture()
  const shadowMaterial = new THREE.MeshBasicMaterial({ map: blob, transparent: true, depthWrite: false })
  const shadowPlane = new THREE.PlaneGeometry(2, 2)
  shadowPlane.rotateX(-Math.PI / 2)

  const truck = buildTruck(plastic)
  truck.root.scale.setScalar(TRUCK_SCALE)
  scene.add(truck.root)
  const truckShadow = new THREE.Mesh(shadowPlane, shadowMaterial)
  truckShadow.name = 'truck-shadow'
  truckShadow.renderOrder = 1
  scene.add(truckShadow)
  // The drop that hangs from the nozzle's tip while the truck rests and something wants water.
  const hanging = new THREE.Mesh(new THREE.IcosahedronGeometry(0.12, 1), water)
  hanging.name = 'hanging-drop'
  hanging.position.set(BARREL + 0.03, -0.17, 0)
  truck.nozzle.add(hanging)

  const hedges = buildHedges(plastic)
  scene.add(hedges)
  const farSide = buildFarSide([GATE.x - GATE.half, GATE.x + GATE.half])
  // Two yards: the one on screen, and the other for the way on. They swap after each drive.
  let here = new YardSet('yard-a', farSide, { plastic, glow, water }, shadowMaterial, shadowPlane)
  let other = new YardSet('yard-b', farSide, { plastic, glow, water }, shadowMaterial, shadowPlane)
  other.root.visible = false
  here.root.visible = false
  scene.add(here.root, other.root)
  let leavingWas = false
  const atRest = restChannels()
  const leftAs = restChannels()

  const drops = buildWaterView(water)
  scene.add(drops.mesh)
  const guide = buildGuideView()
  scene.add(guide.root)
  // Until the saved game has been read there is nothing to show but the sky: the truck and the hedges wait with the yard.
  const waiting = [truck.root, truckShadow, hedges]
  for (const object of waiting) object.visible = false

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
    for (let far = 14; far < 90; far *= 1.03) {
      camera.position.set(LOOK_AT.x, LOOK_AT.y + Math.sin(CAMERA_PITCH) * far, LOOK_AT.z + Math.cos(CAMERA_PITCH) * far)
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
  let driving = false

  // The lowest tier's plastic is compiled now, so a tier change never stalls a frame.
  renderer.compile(new THREE.Mesh(shadowPlane, matte), camera, scene)

  const counts: StageCounts = { drawCalls: 0, triangles: 0 }
  const everything = [satin, matte, glow, water, shadowMaterial]
  let paintOf: Game | null = null

  return {
    truck,
    resize: (w, h, ratio) => {
      width = w
      height = h
      renderer.setPixelRatio(ratio)
      renderer.setSize(w, h, false)
      frame()
    },
    applyTier: (tier) => {
      const settings = TIERS[Math.max(0, Math.min(TIERS.length - 1, tier))]
      ground?.setDetail(settings.detail)
      const next = settings.shine ? satin : matte
      if (next !== plastic) {
        scene.traverse((object) => {
          const mesh = object as THREE.Mesh
          if (mesh.isMesh && mesh.material === plastic) mesh.material = next
        })
        plastic = next
      }
    },
    show: (game) => {
      if (!ground) {
        ground = buildGround(game.paint)
        scene.add(ground.mesh)
        for (const object of waiting) object.visible = true
      }
      paintOf = game
      const way = game.way
      driving = way !== null
      // The drive begins: the yard on screen becomes the one that leaves, and the other set takes the new yard.
      if (driving && !leavingWas) [here, other] = [other, here]
      leavingWas = driving
      const slid = way?.slid ?? 0
      ground.setSlide(slid)
      // The hedges run on past both yards: they slide with the ground and wrap round by two bumps.
      hedges.position.z = slid % (2 * HEDGE_STEP)
      here.root.visible = true
      here.root.position.z = slid - (driving ? YARD_PITCH : 0)
      // The yard that slides in is at rest; the drive's own channels (the gate) belong to the yard that leaves.
      here.show(game.yard, game.motion, driving ? atRest : game.channels, game.wormAt, game.waits)
      other.root.visible = driving
      if (game.leaving) {
        other.root.position.z = slid
        Object.assign(leftAs, game.leaving.motion.ownChannels)
        leftAs.gate = game.channels.gate
        other.show(game.leaving.yard, game.leaving.motion, leftAs, null, null)
      }
      // The truck: in its place, or on its way up its lane to the next yard.
      const at = way?.at ?? TRUCK
      truck.root.position.set(at.x, 0, at.z)
      const faces = TRUCK_TURN + (FACING_GATE - TRUCK_TURN) * (way?.turned ?? 0)
      truck.root.rotation.y = faces
      poseTruck(truck, game.truck.pose, faces)
      const size = 2.6 * (1 - Math.min(0.4, game.truck.pose.lift * 0.9))
      truckShadow.position.set(at.x + size * 0.12, 0.018, at.z + size * 0.1)
      truckShadow.scale.set(size, 1, size * 0.86)
      truckBall.center.set(at.x, 1.2, at.z)
      hanging.visible = game.hangingDrop > 0.05
      hanging.scale.set(game.hangingDrop, game.hangingDrop * 1.35, game.hangingDrop)
      drops.show(game.drops)
    },
    guide: (glow, hand, at, now) => guide.show(glow, hand, at, now),
    draw: () => {
      if (paintOf) ground?.refresh(paintOf.paint)
      renderer.render(scene, camera)
      counts.drawCalls = renderer.info.render.calls
      counts.triangles = renderer.info.render.triangles
    },
    under: (x, y) => {
      pointer.set((x / Math.max(1, width)) * 2 - 1, 1 - (y / Math.max(1, height)) * 2)
      ray.setFromCamera(pointer, camera)
      if (ray.ray.intersectsSphere(truckBall)) return { truck: true, point: { x: TRUCK.x, z: TRUCK.z } }
      // A finger on a tall thing's picture is on the thing: the nearest such thing along the finger's ray wins.
      let nearest = Infinity
      let to: Place | null = null
      if (!driving) {
        for (let i = 0; i < here.proxyCount; i++) {
          const proxy = here.proxies[i]
          const point = ray.ray.intersectSphere(proxy.ball, hit)
          if (!point) continue
          const far = point.distanceToSquared(ray.ray.origin)
          if (far < nearest) {
            nearest = far
            to = proxy.to
          }
        }
      }
      if (to) return { truck: false, point: { x: to.x, z: to.z } }
      // A finger above the far fence points at the sky: the water goes as far as the yard does.
      if (!ray.ray.intersectPlane(floor, hit)) return { truck: false, point: { x: COLS / 2, z: 0 } }
      return { truck: false, point: { x: hit.x, z: hit.z } }
    },
    counts,
    dispose: () => {
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        if (mesh.isMesh) mesh.geometry.dispose()
      })
      here.dispose()
      other.dispose()
      ground?.dispose()
      drops.dispose()
      guide.dispose()
      blob.dispose()
      for (const material of everything) material.dispose()
      renderer.dispose()
    },
  }
}

