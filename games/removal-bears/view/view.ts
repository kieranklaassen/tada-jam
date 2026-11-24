import * as THREE from 'three'
import type { Game } from '../game'
import { Stage, type Guide } from './stage3d'

/** The renderer around the stage: no shadow maps, no post pass. */
export class View {
  readonly stage = new Stage()
  private readonly renderer: THREE.WebGLRenderer

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.toneMapping = THREE.NeutralToneMapping
    this.renderer.toneMappingExposure = 1.12
  }

  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.stage.resize(width, height)
  }

  draw(game: Game | null, guide: Guide | null, step: number): { drawCalls: number; triangles: number } {
    this.stage.update(game, guide, step)
    this.renderer.render(this.stage.scene, this.stage.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  dispose(): void { this.stage.dispose(); this.renderer.dispose() }
}
