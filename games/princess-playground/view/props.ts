import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { MAX_GRAINS } from '../grains'
import { TRAY } from '../world'

// The small things beside the friends: the rake, the grains a landing throws,
// and the ghost hand of the idle ladder. None is a working piece, and the
// grains and the hand have no body.

/** Where the rake lies when it is out: on top of the far rim, in the middle, where nothing ever stands in front of it. */
export const RAKE_AT = { x: 0, y: TRAY.rimHeight + 0.02, z: -TRAY.halfDepth - TRAY.rimThick * 0.5 } as const
/** How near the rake a touch counts as on it, in tray units. */
export const RAKE_REACH = 1.5

/** A small wooden rake: a handle along the rim and a head with five tines. */
export function buildRake(): THREE.Mesh {
  const parts: THREE.BufferGeometry[] = []
  // Built lying flat, as it rests on the rim: the handle along the rim, the head across its end, the tines beyond the head like a comb.
  const handle = new THREE.CylinderGeometry(0.1, 0.1, 2.3, 10)
  handle.rotateZ(Math.PI / 2)
  handle.translate(-0.2, 0.12, 0)
  parts.push(handle)
  const head = new THREE.BoxGeometry(0.2, 0.18, 1.5)
  head.translate(1.05, 0.12, 0)
  parts.push(head)
  for (let i = 0; i < 6; i++) {
    const tine = new THREE.BoxGeometry(0.4, 0.1, 0.09)
    tine.translate(1.05 + 0.28, 0.1, -0.62 + i * 0.25)
    parts.push(tine)
  }
  const mesh = new THREE.Mesh(mergeGeometries(parts.map((part) => part.toNonIndexed()))!, new THREE.MeshStandardMaterial({ color: '#c0603a', roughness: 0.55 }))
  mesh.name = 'rake'
  mesh.position.set(RAKE_AT.x, RAKE_AT.y, RAKE_AT.z)
  mesh.visible = false
  return mesh
}

/** The grains in the air: one draw of points, a little lighter than the sand so they read against it. */
export function buildGrains(positions: Float32Array): THREE.Points {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setDrawRange(0, MAX_GRAINS)
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 20)
  const points = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#fff1cf', size: 0.11, sizeAttenuation: true }))
  points.name = 'grains'
  points.frustumCulled = false
  return points
}

/** The ghost hand: a pale mitten with one finger out, drawn once on a canvas. A picture of a hand, not a symbol to read. */
export function buildHand(): THREE.Sprite {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 160
  const ctx = canvas.getContext('2d')!
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const shape = () => {
    ctx.beginPath()
    // The pointing finger, then the fist below it.
    ctx.moveTo(50, 70)
    ctx.lineTo(50, 22)
    ctx.quadraticCurveTo(64, 2, 78, 22)
    ctx.lineTo(78, 62)
    ctx.quadraticCurveTo(112, 62, 112, 96)
    ctx.quadraticCurveTo(112, 146, 66, 146)
    ctx.quadraticCurveTo(22, 146, 22, 104)
    ctx.quadraticCurveTo(22, 78, 50, 70)
    ctx.closePath()
  }
  shape()
  ctx.lineWidth = 10
  ctx.strokeStyle = 'rgba(40, 34, 60, 0.85)'
  ctx.stroke()
  ctx.fillStyle = '#fffaf0'
  ctx.fill()
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false, depthWrite: false }))
  sprite.name = 'ghost-hand'
  sprite.center.set(0.5, 0.94)
  sprite.scale.set(1.2, 1.5, 1)
  // Tilted, so the hand comes in from the side and does not cover the face it taps.
  sprite.material.rotation = -0.6
  sprite.renderOrder = 10
  sprite.visible = false
  return sprite
}
