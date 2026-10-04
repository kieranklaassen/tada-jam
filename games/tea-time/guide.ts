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

/** What the guide marks: where the thing is (its top, for the hand), how wide it is, the move, and where a carry or a rub goes. */
export type Shown = { move: 'tap' | 'hold' | 'carry' | 'rub'; at: { x: number; y: number; z: number }; to: { x: number; y: number; z: number } | null; girth: number }

export class Guide {
  readonly group = new THREE.Group()
  private readonly glow: THREE.Mesh
  private readonly hand: THREE.Sprite
  private readonly steam: THREE.Points
  private readonly pose: HandPose = { travel: 0, press: 0, opacity: 0 }
  private pressing = false
  private time = 0
  /** A puff of steam from under the pot's lid: 1 as it is let out, 0 when it has gone. */
  private puff = 0

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
   * One frame. `shown` is the thing to touch and the move to show with it, or
   * null when nothing is hinted. `spout` is where steam leaves the pot, or
   * null while it pours or moves. Returns true on the frame the ghost hand
   * presses down, so the thing can squash under it as it will under the
   * child's finger.
   */
  /** The lid lets out a puff of steam. */
  toot(): void {
    this.puff = 1
  }

  update(dt: number, guidance: Guidance, shown: Shown | null, spout: THREE.Vector3 | null, lid: THREE.Vector3 | null = null): boolean {
    this.time += dt
    const glow = this.glow.material as THREE.MeshBasicMaterial
    glow.opacity = shown ? guidance.glow * (0.55 + 0.3 * Math.sin(this.time * 2.6)) : 0
    this.glow.visible = glow.opacity > 0.01
    let pressed = false
    const hand = this.hand.material
    if (shown) {
      // The glow is a ring on the cloth round the one thing to touch now, a little wider than the thing.
      const size = Math.max(0.55, shown.girth) * (1.75 + 0.08 * Math.sin(this.time * 2.6))
      this.glow.scale.set(size, 1, size)
      this.glow.position.set(shown.at.x, 0.012, shown.at.z)
    }
    if (!shown || guidance.demo === null) {
      hand.opacity = 0
      this.pressing = false
    } else {
      // A tap presses where it stands; a hold, a carry and a rub are one long press, and the last two travel.
      handPose(guidance.demo, shown.move !== 'tap', this.pose)
      hand.opacity = this.pose.opacity * 0.92
      const to = shown.to ?? shown.at
      const travel = shown.move === 'carry' ? this.pose.travel : shown.move === 'rub' ? 0.5 + 0.5 * Math.sin(this.pose.travel * Math.PI * 5) * this.pose.press : 0
      const from = shown.move === 'rub' ? { x: to.x - 0.5, y: to.y, z: to.z } : shown.at
      const end = shown.move === 'rub' ? { x: to.x + 0.5, y: to.y, z: to.z } : to
      this.hand.position.set(from.x + (end.x - from.x) * travel + 0.1, from.y + (end.y - from.y) * travel + 0.4 + (1 - this.pose.press) * 0.75, from.z + (end.z - from.z) * travel + 0.2)
      if (this.pose.press > 0.6 && !this.pressing) pressed = true
      this.pressing = this.pose.press > 0.6
    }
    this.hand.visible = hand.opacity > 0.01

    const position = this.steam.geometry.attributes.position as THREE.BufferAttribute
    this.puff = Math.max(0, this.puff - dt / 1.2)
    const material = this.steam.material as THREE.PointsMaterial
    if (this.puff > 0 && lid) {
      // A puff from under the lid when the pot is tapped: all five at once, big, spreading as they rise and thin out.
      const t = 1 - this.puff
      this.steam.visible = true
      for (let i = 0; i < position.count; i++) position.setXYZ(i, lid.x + Math.sin(i * 2.4) * 0.45 * t, lid.y + 0.1 + t * (0.9 + 0.12 * i), lid.z + Math.cos(i * 2.4) * 0.3 * t)
      position.needsUpdate = true
      material.size = 0.42 * (1.6 + 1.2 * t)
      material.opacity = Math.min(0.9, 1.3 * this.puff)
      return pressed
    }
    material.size = 0.42
    this.steam.visible = spout !== null
    if (spout) {
      for (let i = 0; i < position.count; i++) {
        // Each puff rises, drifts and starts again, a fifth of the way behind the last.
        const t = (this.time * 0.32 + i / position.count) % 1
        position.setXYZ(i, spout.x + Math.sin(t * 5 + i) * 0.1 * t, spout.y + 0.05 + t * 0.9, spout.z + Math.cos(t * 4 + i * 2) * 0.06 * t)
      }
      position.needsUpdate = true
      material.opacity = 0.3
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
