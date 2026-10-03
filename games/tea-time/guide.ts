import * as THREE from 'three'
import type { Guidance } from './guidance'
import { handPose, type HandPose } from './guidance'

// What an idle child is shown, without a word: a warm glow breathing on the
// cloth round the thing that can be touched now, and after a while a ghost
// hand that presses it and holds, once. Both come from the template's idle
// ladder and vanish on any touch. The hand shows the move, never an amount:
// it pours nothing. Also here: the wisp of steam at the spout, which is the
// pot being alive while nobody touches it.

function ringTexture(doc: Document): THREE.CanvasTexture {
  const canvas = doc.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const glow = ctx.createRadialGradient(64, 64, 20, 64, 64, 64)
  glow.addColorStop(0, 'rgba(255, 214, 130, 0)')
  glow.addColorStop(0.55, 'rgba(255, 214, 130, 0.0)')
  glow.addColorStop(0.78, 'rgba(255, 214, 130, 0.85)')
  glow.addColorStop(1, 'rgba(255, 214, 130, 0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, 128, 128)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

/** A soft white hand with one finger out, seen from above the wrist: drawn, never a picture from a file. */
function handTexture(doc: Document): THREE.CanvasTexture {
  const canvas = doc.createElement('canvas')
  canvas.width = 128
  canvas.height = 160
  const ctx = canvas.getContext('2d')!
  ctx.lineJoin = ctx.lineCap = 'round'
  const shape = () => {
    ctx.beginPath()
    // The pointing finger, then the curled knuckles, the heel of the hand and the thumb.
    ctx.moveTo(40, 78)
    ctx.lineTo(40, 26)
    ctx.arc(52, 26, 12, Math.PI, 0)
    ctx.lineTo(64, 66)
    ctx.arc(74, 68, 10, Math.PI, 0)
    ctx.arc(92, 74, 9, Math.PI * 1.1, 0)
    ctx.lineTo(102, 112)
    ctx.arc(72, 112, 30, 0, Math.PI * 0.8)
    ctx.lineTo(30, 108)
    ctx.arc(26, 92, 12, Math.PI * 0.7, Math.PI * 1.7)
    ctx.closePath()
  }
  shape()
  ctx.strokeStyle = 'rgba(24, 44, 110, 0.55)'
  ctx.lineWidth = 9
  ctx.stroke()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.96)'
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  return texture
}

export class Guide {
  readonly group = new THREE.Group()
  private readonly glow: THREE.Mesh
  private readonly hand: THREE.Sprite
  private readonly steam: THREE.Points
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  private pressing = false
  private time = 0

  constructor(doc: Document) {
    const ring = new THREE.PlaneGeometry(2, 2)
    ring.rotateX(-Math.PI / 2)
    this.glow = new THREE.Mesh(ring, new THREE.MeshBasicMaterial({ map: ringTexture(doc), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }))
    this.glow.renderOrder = 4
    this.glow.name = 'guide-glow'
    this.hand = new THREE.Sprite(new THREE.SpriteMaterial({ map: handTexture(doc), transparent: true, opacity: 0, depthTest: false }))
    this.hand.center.set(0.36, 0.86)
    this.hand.scale.set(1.5, 1.9, 1)
    this.hand.renderOrder = 10
    this.hand.name = 'guide-hand'
    const puffs = new THREE.BufferGeometry()
    puffs.setAttribute('position', new THREE.BufferAttribute(new Float32Array(5 * 3), 3))
    const soft = doc.createElement('canvas')
    soft.width = soft.height = 32
    const ctx = soft.getContext('2d')!
    const puff = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    puff.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
    puff.addColorStop(1, 'rgba(255, 255, 255, 0)')
    ctx.fillStyle = puff
    ctx.fillRect(0, 0, 32, 32)
    this.steam = new THREE.Points(puffs, new THREE.PointsMaterial({ map: new THREE.CanvasTexture(soft), size: 0.42, transparent: true, opacity: 0.32, depthWrite: false }))
    this.steam.frustumCulled = false
    this.steam.renderOrder = 5
    this.steam.name = 'steam'
    this.group.add(this.glow, this.hand, this.steam)
  }

  /**
   * One frame. `at` is the thing to touch (the pot): where it stands, how wide
   * it is and how high its top is. `spout` is where steam leaves it, or null
   * while it pours or moves. Returns true on the frame the ghost hand presses
   * down, so the pot can squash under it as it will under the child's finger.
   */
  update(dt: number, guidance: Guidance, at: { x: number; z: number; girth: number; top: number }, spout: THREE.Vector3 | null): boolean {
    this.time += dt
    const glow = this.glow.material as THREE.MeshBasicMaterial
    glow.opacity = guidance.glow * (0.55 + 0.3 * Math.sin(this.time * 2.6))
    this.glow.visible = glow.opacity > 0.01
    const size = at.girth * (1.75 + 0.08 * Math.sin(this.time * 2.6))
    this.glow.scale.set(size, 1, size)
    this.glow.position.set(at.x, 0.012, at.z)

    let pressed = false
    const hand = this.hand.material
    if (guidance.demo === null) {
      hand.opacity = 0
      this.pressing = false
    } else {
      // One long press, as a hold is: the hand comes down on the pot and stays.
      handPose(guidance.demo, true, this.pose)
      hand.opacity = this.pose.opacity * 0.92
      this.hand.position.set(at.x + 0.1, at.top + 0.9 - this.pose.press * 0.75, at.z + 0.2)
      if (this.pose.press > 0.6 && !this.pressing) pressed = true
      this.pressing = this.pose.press > 0.6
    }
    this.hand.visible = hand.opacity > 0.01

    const position = this.steam.geometry.attributes.position as THREE.BufferAttribute
    this.steam.visible = spout !== null
    if (spout) {
      for (let i = 0; i < position.count; i++) {
        // Each puff rises, drifts and starts again, a fifth of the way behind the last.
        const t = (this.time * 0.32 + i / position.count) % 1
        position.setXYZ(i, spout.x + Math.sin(t * 5 + i) * 0.1 * t, spout.y + 0.05 + t * 0.9, spout.z + Math.cos(t * 4 + i * 2) * 0.06 * t)
      }
      position.needsUpdate = true
      ;(this.steam.material as THREE.PointsMaterial).opacity = 0.3
    }
    return pressed
  }

  dispose(): void {
    for (const node of [this.glow, this.hand, this.steam]) {
      const material = node.material as THREE.Material & { map?: THREE.Texture | null }
      material.map?.dispose()
      material.dispose()
      if (!(node instanceof THREE.Sprite)) node.geometry.dispose()
    }
  }
}
