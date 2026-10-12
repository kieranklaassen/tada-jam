import * as THREE from 'three'
import type { Tier } from '../config'
import type { Guidance } from '../guidance'
import { CAMERA, fieldOfView } from '../layout'
import type { Toy } from '../toy'
import { Diorama } from './diorama'

// The one renderer, on the Mount's canvas, and the camera that layout.ts
// describes. What is drawn is the diorama; this file only shows it.

const DAY = [0.56, 0.69, 0.77] as const, NIGHT = [0.15, 0.2, 0.36] as const

export class FortView {
  readonly counts = { drawCalls: 0, triangles: 0 }
  private readonly renderer: THREE.WebGLRenderer
  private readonly camera = new THREE.PerspectiveCamera(32, 1, CAMERA.near, CAMERA.far)
  private readonly diorama = new Diorama()
  private readonly sky = new THREE.Color()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    // Colours are authored as they are shown.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.renderer.setClearColor(this.sky.setRGB(DAY[0], DAY[1], DAY[2], THREE.LinearSRGBColorSpace))
    this.camera.position.set(CAMERA.at.x, CAMERA.at.y, CAMERA.at.z)
    this.camera.lookAt(CAMERA.to.x, CAMERA.to.y, CAMERA.to.z)
  }

  /** What a tier sets besides the pixel ratio. */
  setTier(tier: Tier): void {
    this.diorama.setTier(tier)
  }

  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.fov = fieldOfView(width, height)
    this.camera.updateProjectionMatrix()
  }

  /** Lays the toy as it stands onto everything drawn. `guidance` is what the idle ladder shows, or null. */
  update(toy: Toy, guidance: Guidance | null): void {
    this.diorama.update(toy, guidance)
    const dusk = toy.dusk()
    this.renderer.setClearColor(this.sky.setRGB(DAY[0] + (NIGHT[0] - DAY[0]) * dusk, DAY[1] + (NIGHT[1] - DAY[1]) * dusk, DAY[2] + (NIGHT[2] - DAY[2]) * dusk, THREE.LinearSRGBColorSpace))
  }

  /** Compiles every material before the first frame, so the first touch does not stall on one. */
  warm(): void {
    this.renderer.compile(this.diorama.scene, this.camera)
  }

  render(): void {
    this.renderer.render(this.diorama.scene, this.camera)
    this.counts.drawCalls = this.renderer.info.render.calls
    this.counts.triangles = this.renderer.info.render.triangles
  }

  dispose(): void {
    this.diorama.dispose()
    this.renderer.dispose()
  }
}
