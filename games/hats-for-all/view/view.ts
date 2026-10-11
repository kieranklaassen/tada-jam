import * as THREE from 'three'
import type { LetGo, Target } from '../game'
import type { Play } from '../play'
import { PALETTE } from './build'
import { FoamStage, type Guide } from './stage3d'

// The renderer around the foam scene. Everything that decides what is drawn
// is in stage3d.ts, which needs no renderer; this draws it.

export class FoamView {
  private readonly renderer: THREE.WebGLRenderer
  private readonly stage = new FoamStage()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, stencil: false, powerPreference: 'high-performance' })
    this.renderer.setClearColor(PALETTE.wall)
    this.renderer.toneMapping = THREE.NoToneMapping
  }

  setStipple(on: boolean): void {
    this.stage.setStipple(on)
  }

  /** Compiles everything a tier change can need, before the first frame. */
  warm(): void {
    this.stage.setStipple(false)
    this.renderer.compile(this.stage.scene, this.stage.camera)
    this.stage.setStipple(true)
    this.renderer.compile(this.stage.scene, this.stage.camera)
  }

  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.stage.resize(width, height)
  }

  /** Draws one frame: the theatre as it stands, or the bare mat before the save has been read. */
  draw(play: Play | null, guide: Guide | null): { drawCalls: number; triangles: number } {
    this.stage.update(play, guide)
    this.renderer.render(this.stage.scene, this.stage.camera)
    return { drawCalls: this.renderer.info.render.calls, triangles: this.renderer.info.render.triangles }
  }

  pick(x: number, y: number, play: Play): Target { return this.stage.pick(x, y, play) }
  floorAt(x: number, y: number): Target { return this.stage.floorAt(x, y) }
  letGoAt(x: number, y: number, play: Play, held: Target, from?: { x: number; y: number }): LetGo { return this.stage.letGoAt(x, y, play, held, from) }
  handPoint(x: number, y: number): { x: number; y: number; z: number } { return this.stage.handPoint(x, y) }

  dispose(): void {
    this.stage.dispose()
    this.renderer.dispose()
  }
}
