import * as THREE from 'three'
import type { Lens, Posts } from '../camera'
import type { Tier } from '../config'
import type { Guide } from '../guide'
import type { Frame } from '../island'
import type { Sky } from '../pick'
import { C } from './models'
import { Diorama } from './scene3d'

// The diorama on a canvas: the one module that owns a renderer. The Mount
// sizes it, hands it a frame of the toy to draw and reads back what the draw
// cost. No shadow maps, no post pass, and colours written as authored.

export class View {
  private readonly renderer: THREE.WebGLRenderer
  private readonly diorama = new Diorama()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    // Beyond the round edge of the sea there is more sea.
    this.renderer.setClearColor(new THREE.Color().setRGB(C.sea[0], C.sea[1], C.sea[2]), 1)
    // Every material is compiled before the first frame, the ones of things that only show later too (the
    // puffs, the rings, the beam, the hand), so no touch pays for one.
    this.diorama.warm((scene, camera) => this.renderer.compile(scene, camera))
  }

  /** What a touch needs of the camera. */
  get lens(): Lens {
    return this.diorama.lens
  }

  /** What hangs in the sky of this surface and can be touched. */
  get sky(): Sky {
    return this.diorama.skyNow()
  }

  /** Where the residents of the sea are on this surface. */
  get posts(): Posts {
    return this.diorama.posts
  }

  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.diorama.resize(width, height)
  }

  /** Draws one frame, and says what it cost. With no frame of the toy yet, it draws the place as it stands. */
  draw(frame: Frame | null, guide: Guide, seconds: number, tier: Tier, drawn: { drawCalls: number; triangles: number }): void {
    if (frame) this.diorama.update(frame, guide, seconds, tier)
    this.renderer.render(this.diorama.scene, this.diorama.camera)
    drawn.drawCalls = this.renderer.info.render.calls
    drawn.triangles = this.renderer.info.render.triangles
  }

  dispose(): void {
    this.diorama.dispose()
    this.renderer.dispose()
  }
}
