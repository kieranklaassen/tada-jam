import * as THREE from 'three'
import type { ForestController, Projector } from '../controller'
import type { ScreenPoint } from '../input'
import { ANIMAL_KEYS, HOME_KEYS, HOMES, type AnimalKey, type Point } from '../layout'
import type { Tier } from '../perf'
import { buildAnimal, PART_COUNT } from './animals'
import { fillMaterial, homeUniforms, inkMaterial, shared } from './gouache'
import { Overlays } from './overlays'
import { createPost } from './post'
import { Joints, POSE } from './rigs'
import { buildScenery } from './scenery'
import { createSky, skyUniforms } from './sky'

// The forest as three.js objects, built once: sky, meadow, scenery with its
// six homes (one merged fill and one merged ink draw), six animals (one fill
// and one ink draw each, posed by part matrices), and the overlays. Every
// frame it reads the controller, writes uniforms and matrices, and renders
// either straight to the screen or through the one paper pass. Nothing here
// allocates per frame.

const FOV = 34
const PITCH = THREE.MathUtils.degToRad(30)
/** How far the camera tilts up to show the sky at night. */
const NIGHT_TILT = THREE.MathUtils.degToRad(10)
/** The fit: the meadow reaches this far toward the child at the bottom edge… */
const BOTTOM_Z = 74
/** …and the homes at this depth fit within this half-width. */
const WIDTH_Z = 4
const HALF_WIDTH = 118

type AnimalView = { key: AnimalKey; fill: THREE.Mesh; ink: THREE.Mesh; joints: Joints }

const rotX = new THREE.Matrix4()
const rotZ = new THREE.Matrix4()
const ndc = new THREE.Vector3()
const pointer = new THREE.Vector2()
const hit = new THREE.Vector3()
const bufferSize = new THREE.Vector2()

function smooth(k: number): number {
  const u = k < 0 ? 0 : k > 1 ? 1 : k
  return u * u * (3 - 2 * u)
}

export class ForestWorld {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 20, 1600)
  readonly projector: Projector
  private readonly animals: AnimalView[] = []
  private readonly overlays = new Overlays()
  private readonly post = createPost()
  private target: THREE.WebGLRenderTarget | null = null
  private readonly glow = new Float32Array(HOME_KEYS.length)
  private cssWidth = 1
  private cssHeight = 1
  private tanHalf = Math.tan(THREE.MathUtils.degToRad(FOV / 2))
  private readonly disposables: { dispose(): void }[] = []

  constructor() {
    this.camera.rotation.order = 'YXZ'
    const sky = createSky()
    const scenery = buildScenery()
    const groundMaterial = fillMaterial({ brushScale: 0.045, hazeNear: 380, hazeFar: 720 })
    const ground = new THREE.Mesh(scenery.ground, groundMaterial)
    const sceneryFill = new THREE.Mesh(scenery.fill, fillMaterial({ homes: true, brushScale: 0.07 }))
    const sceneryInk = new THREE.Mesh(scenery.ink, inkMaterial({ homes: true }))
    for (const mesh of [ground, sceneryFill, sceneryInk]) {
      mesh.frustumCulled = false
      mesh.matrixAutoUpdate = false
      this.scene.add(mesh)
      this.disposables.push(mesh.geometry, mesh.material as THREE.Material)
    }
    this.scene.add(sky)
    this.disposables.push(sky.geometry, sky.material as THREE.Material)
    HOME_KEYS.forEach((key, h) => homeUniforms.homeBase.value[h].set(HOMES[key].at.x, 0, HOMES[key].at.z))

    for (const key of ANIMAL_KEYS) {
      const parts = PART_COUNT[key]
      const geometry = buildAnimal(key)
      const fillMat = fillMaterial({ parts, brushScale: 0.16, hazeNear: 400, hazeFar: 800 })
      const data = fillMat.uniforms.parts.value as Float32Array
      const inkMat = inkMaterial({ parts }, data)
      const fill = new THREE.Mesh(geometry.fill, fillMat)
      const ink = new THREE.Mesh(geometry.ink, inkMat)
      for (const mesh of [fill, ink]) {
        mesh.frustumCulled = false
        mesh.matrixAutoUpdate = false
        this.scene.add(mesh)
        this.disposables.push(mesh.geometry, mesh.material as THREE.Material)
      }
      this.animals.push({ key, fill, ink, joints: new Joints(parts, data) })
    }
    this.scene.add(this.overlays.group)

    const raycaster = new THREE.Raycaster()
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)
    const camera = this.camera
    this.projector = {
      toScreen: (x: number, y: number, z: number, out: ScreenPoint): boolean => {
        ndc.set(x, y, z).project(camera)
        if (ndc.z > 1) return false
        out.x = ((ndc.x + 1) / 2) * this.cssWidth
        out.y = ((1 - ndc.y) / 2) * this.cssHeight
        return true
      },
      toPlane: (sx: number, sy: number, height: number, out: Point): boolean => {
        pointer.set((sx / this.cssWidth) * 2 - 1, -(sy / this.cssHeight) * 2 + 1)
        raycaster.setFromCamera(pointer, camera)
        plane.constant = -height
        if (!raycaster.ray.intersectPlane(plane, hit)) return false
        out.x = hit.x
        out.z = hit.z
        return true
      },
    }
  }

  /** Fit the clearing and its homes to the canvas (CSS pixels). */
  resize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return
    this.cssWidth = width
    this.cssHeight = height
    const camera = this.camera
    const aspect = width / height
    const vHalf = THREE.MathUtils.degToRad(FOV / 2)
    const tanH = Math.tan(vHalf) * aspect
    // Camera at distance d back along the view ray from a ground target at z = T:
    // the bottom ray lands at BOTTOM_Z, and the half-width at WIDTH_Z is HALF_WIDTH.
    const cos = Math.cos(PITCH)
    const sin = Math.sin(PITCH)
    const k = cos - sin / Math.tan(PITCH + vHalf)
    const distance = Math.max(200, (HALF_WIDTH / tanH - (BOTTOM_Z - WIDTH_Z) * cos) / (1 - k * cos))
    const targetZ = BOTTOM_Z - distance * k
    this.tanHalf = Math.tan(vHalf)
    camera.aspect = aspect
    camera.fov = FOV
    camera.far = distance * 5
    camera.position.set(0, sin * distance, targetZ + cos * distance)
    camera.rotation.set(-PITCH, 0, 0)
    camera.updateProjectionMatrix()
    camera.updateMatrixWorld()
  }

  /** Before the controller steps: tilt the camera up toward the stars as night falls. */
  aim(forest: ForestController): void {
    const tilt = NIGHT_TILT * smooth(forest.cycle.sky.night)
    this.camera.rotation.set(-PITCH + tilt, 0, 0)
    this.camera.updateMatrixWorld()
    skyUniforms.lift.value = Math.tan(tilt) / (2 * this.tanHalf)
  }

  /** After the controller steps: pose every animal and paint the light. */
  update(forest: ForestController, dt: number, tier: Tier): void {
    const sky = forest.cycle.sky
    shared.time.value = forest.t
    shared.night.value = sky.night
    shared.morning.value = sky.morning
    skyUniforms.moon.value = sky.moon
    skyUniforms.stars.value = sky.stars

    const t = forest.t
    const shake = homeUniforms.homeShake.value
    const homeGlow = homeUniforms.homeGlow.value
    const ease = 1 - Math.exp(-dt * 4)
    for (let h = 0; h < HOME_KEYS.length; h++) {
      const since = t - forest.shook[h]
      shake[h] = since < 0.7 ? (1 - since / 0.7) ** 2 : 0
      const owner = forest.creatures[h]
      let want = owner.mode === 'asleep' ? 1 : owner.mode === 'settle' ? 0.9 : owner.mode === 'wake' ? 0.5 : 0
      for (let i = 0; i < forest.hovering.length; i++) if (forest.hovering[i] === h) want = Math.max(want, 0.6 + 0.25 * Math.sin(t * 7))
      if (forest.glowIndex === h && forest.glow > 0) want = Math.max(want, forest.glow * (0.35 + 0.2 * Math.sin(t * 3.2)))
      this.glow[h] += (want - this.glow[h]) * ease
      homeGlow[h] = this.glow[h]
    }

    for (let i = 0; i < this.animals.length; i++) {
      const view = this.animals[i]
      const c = forest.creatures[i]
      POSE[view.key](c, view.joints)
      view.joints.flush()
      const m = view.fill.matrix
      m.makeRotationY(c.yaw)
      if (c.swingX !== 0 || c.swingZ !== 0) {
        rotX.makeRotationX(c.swingZ)
        rotZ.makeRotationZ(-c.swingX)
        m.premultiply(rotX).premultiply(rotZ)
      }
      m.elements[12] = c.x
      m.elements[13] = c.y
      m.elements[14] = c.z
      view.ink.matrix.copy(m)
      view.fill.matrixWorldNeedsUpdate = true
      view.ink.matrixWorldNeedsUpdate = true
    }

    this.overlays.update(forest, dt, tier, sky.night, sky.morning)
  }

  render(gl: THREE.WebGLRenderer, post: boolean): void {
    gl.getDrawingBufferSize(bufferSize)
    shared.resolution.value.copy(bufferSize)
    shared.inkPx.value = 1.8 * gl.getPixelRatio()
    if (!post) {
      gl.setRenderTarget(null)
      gl.render(this.scene, this.camera)
      return
    }
    let target = this.target
    if (!target || target.width !== bufferSize.x || target.height !== bufferSize.y) {
      target?.dispose()
      target = new THREE.WebGLRenderTarget(bufferSize.x, bufferSize.y, { depthBuffer: true, stencilBuffer: false, samples: 0 })
      target.texture.colorSpace = THREE.NoColorSpace
      this.target = target
      this.post.material.uniforms.scene.value = target.texture
    }
    this.post.material.uniforms.resolution.value.copy(bufferSize)
    this.post.material.uniforms.dpr.value = gl.getPixelRatio()
    gl.setRenderTarget(target)
    gl.render(this.scene, this.camera)
    gl.setRenderTarget(null)
    gl.render(this.post.scene, this.post.camera)
  }

  dispose(): void {
    for (const item of this.disposables) item.dispose()
    this.target?.dispose()
    this.post.material.dispose()
  }
}
