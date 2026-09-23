import * as THREE from 'three'
import { PALETTE } from './palette'
import { blobTexture, ghostFrogTexture, handTexture, ringTexture, rippleTexture } from './textures'

// Flat helpers that lie on the water or float over it: toon blob shadows
// under the frogs and the firefly, breathing glow rings on what can be
// touched, expanding ripples, splash droplets, and the ghost hand with the
// ghost frog it carries during a drag demonstration. Each kind is one
// instanced draw.

function flatPlane(): THREE.PlaneGeometry {
  const geometry = new THREE.PlaneGeometry(1, 1)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

function instanced(material: THREE.Material, count: number, renderOrder: number): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(flatPlane(), material, count)
  mesh.frustumCulled = false
  mesh.renderOrder = renderOrder
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const black = new THREE.Color(0, 0, 0)
  for (let i = 0; i < count; i++) mesh.setColorAt(i, black)
  mesh.instanceColor!.setUsage(THREE.DynamicDrawUsage)
  return mesh
}

export const SHADOWS = 6
export const RINGS = 6
export const RIPPLE_SLOTS = 12
export const DROPS_PER_SPLASH = 8

export type Overlays = {
  shadows: THREE.InstancedMesh
  rings: THREE.InstancedMesh
  ripples: THREE.InstancedMesh
  /** A crown of droplets per frog that falls in the water; hidden (no draw) unless one is in the air. */
  droplets: THREE.InstancedMesh
  hand: THREE.Sprite
  ghost: THREE.Sprite
}

export function buildOverlays(frogs: number): Overlays {
  const shadows = new THREE.InstancedMesh(
    flatPlane(),
    new THREE.MeshBasicMaterial({ color: PALETTE.shadow, map: blobTexture(), transparent: true, opacity: 0.32, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -2 }),
    SHADOWS,
  )
  shadows.frustumCulled = false
  shadows.renderOrder = 2
  shadows.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  const additive = (map: THREE.Texture) => new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false })
  const rings = instanced(additive(ringTexture()), RINGS, 3)
  const ripples = instanced(additive(rippleTexture()), RIPPLE_SLOTS, 3)
  const droplets = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: PALETTE.splash }), frogs * DROPS_PER_SPLASH)
  droplets.frustumCulled = false
  droplets.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  droplets.visible = false

  const hand = new THREE.Sprite(new THREE.SpriteMaterial({ map: handTexture(), transparent: true, depthTest: false, depthWrite: false, fog: false }))
  hand.center.set(0.5, 0.955)
  hand.renderOrder = 20
  hand.visible = false
  const ghost = new THREE.Sprite(new THREE.SpriteMaterial({ map: ghostFrogTexture(), transparent: true, depthTest: false, depthWrite: false, fog: false }))
  ghost.center.set(0.5, 0.12)
  ghost.renderOrder = 19
  ghost.visible = false
  return { shadows, rings, ripples, droplets, hand, ghost }
}

const matrix = new THREE.Matrix4()
const position = new THREE.Vector3()
const quaternion = new THREE.Quaternion()
const scale = new THREE.Vector3()
const color = new THREE.Color()

/** Place one flat instance at (x, y, z), `size` wide, tinted `r g b` (additive: black is invisible). */
export function placeFlat(mesh: THREE.InstancedMesh, i: number, x: number, y: number, z: number, sx: number, sz: number, r = 1, g = 1, b = 1): void {
  position.set(x, y, z)
  scale.set(sx, 1, sz)
  matrix.compose(position, quaternion, scale)
  mesh.setMatrixAt(i, matrix)
  if (mesh.instanceColor) mesh.setColorAt(i, color.setRGB(r, g, b))
}

export function hideFlat(mesh: THREE.InstancedMesh, i: number): void {
  placeFlat(mesh, i, 0, -50, 0, 0.0001, 0.0001, 0, 0, 0)
}
