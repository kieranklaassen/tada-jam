import * as THREE from 'three'

// The ghost hand that demonstrates one move: a soft pale hand, pointing
// down, drawn once onto a small canvas (no image assets). It always faces
// the camera and draws over everything, with its fingertip on the spot.

const WIDTH = 128
const HEIGHT = 168
/** Height of the hand in table centimetres. */
const SIZE = 12

function drawHand(): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = WIDTH
  canvas.height = HEIGHT
  const g = canvas.getContext('2d')!
  const shape = () => {
    g.beginPath()
    g.roundRect(30, 18, 70, 76, 26)
    g.roundRect(51, 60, 25, 102, 12.5)
    g.ellipse(30, 70, 11, 21, -0.5, 0, Math.PI * 2)
    for (let i = 0; i < 3; i++) g.ellipse(86 - i * 4, 84 + i * 1.5, 11, 13, 0, 0, Math.PI * 2)
  }
  g.fillStyle = 'rgba(14, 44, 48, 0.55)'
  g.save()
  g.translate(4, 5)
  shape()
  g.fill()
  g.restore()
  const fill = g.createLinearGradient(0, 18, 0, 162)
  fill.addColorStop(0, 'rgba(250, 255, 253, 0.97)')
  fill.addColorStop(1, 'rgba(226, 244, 240, 0.97)')
  g.fillStyle = fill
  shape()
  g.fill()
  g.strokeStyle = 'rgba(40, 96, 100, 0.55)'
  g.lineWidth = 3
  g.beginPath()
  g.roundRect(51, 60, 25, 102, 12.5)
  g.stroke()
  g.beginPath()
  g.ellipse(63.5, 146, 7, 5, 0, 0, Math.PI * 2)
  g.fillStyle = 'rgba(255, 236, 228, 0.9)'
  g.fill()
  return canvas
}

export class GhostHand {
  readonly mesh: THREE.Mesh
  private readonly material: THREE.MeshBasicMaterial
  private readonly texture: THREE.CanvasTexture

  constructor() {
    this.texture = new THREE.CanvasTexture(drawHand())
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.material = new THREE.MeshBasicMaterial({ map: this.texture, transparent: true, depthTest: false, depthWrite: false, opacity: 0 })
    const geometry = new THREE.PlaneGeometry((SIZE * WIDTH) / HEIGHT, SIZE)
    // Put the fingertip (bottom middle of the picture) at the mesh origin.
    geometry.translate(0, SIZE / 2 - SIZE * 0.02, 0)
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.renderOrder = 10
    this.mesh.frustumCulled = false
    this.mesh.visible = false
  }

  update(visible: boolean, x: number, z: number, press: number, opacity: number, camera: THREE.Camera): void {
    this.mesh.visible = visible && opacity > 0.01
    if (!this.mesh.visible) return
    this.material.opacity = opacity * 0.92
    this.mesh.position.set(x, 1.2 + (1 - press) * 3.6, z)
    this.mesh.quaternion.copy(camera.quaternion)
    const s = 1 - press * 0.08
    this.mesh.scale.set(s, s, s)
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.material.dispose()
    this.texture.dispose()
  }
}
