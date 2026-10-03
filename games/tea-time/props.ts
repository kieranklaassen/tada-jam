import * as THREE from 'three'
import { REGIONS, TILE_COLS, TILE_ROWS, paintTiles } from './atlas'
import { POT, lidProfile, potProfile } from './forms'
import { CLOTH as CLOTH_COLOR } from './glaze'
import { CLOTH } from './layout'
import { GOLD, INK, merged, plain, turn } from './pieces'

// The pieces that are not turned whole on the lathe, and the setting: the
// pot with its spout and cane handle, the spoon, the sponge, the cloth, the
// tiled wall and the soft shadow under every piece.

/** A tube along a curve whose radius changes from one end to the other, for a spout or a tail. */
export function taperedTube(curve: THREE.Curve<THREE.Vector3>, from: number, to: number, along = 14, around = 9): THREE.BufferGeometry {
  const tube = new THREE.TubeGeometry(curve, along, 1, around, false)
  const position = tube.attributes.position as THREE.BufferAttribute
  const centre = new THREE.Vector3(), vertex = new THREE.Vector3()
  for (let i = 0; i <= along; i++) {
    curve.getPointAt(i / along, centre)
    const radius = from + (to - from) * (i / along)
    for (let j = 0; j <= around; j++) {
      const at = i * (around + 1) + j
      vertex.fromBufferAttribute(position, at).sub(centre).multiplyScalar(radius).add(centre)
      position.setXYZ(at, vertex.x, vertex.y, vertex.z)
    }
  }
  tube.computeVertexNormals()
  return tube
}

/** Where the tea leaves the spout, in the pot's own space: the spout points along +x. */
export const SPOUT_TIP = new THREE.Vector3(POT.spoutReach, POT.spoutY + 0.1, 0)

/** The pot's body, spout and handle as one piece, and its lid as another, so the lid can rattle. */
export function potGeometry(segments: number): { body: THREE.BufferGeometry; lid: THREE.BufferGeometry } {
  const profile = potProfile()
  const belly = turn(profile, segments, { region: { area: REGIONS.pot, from: 2, to: profile.length - 3 }, color: (j) => (j >= profile.length - 2 ? GOLD : null) })
  const spoutCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0.78, 0.42, 0),
    new THREE.Vector3(1.12, 0.5, 0),
    new THREE.Vector3(1.32, 0.82, 0),
    new THREE.Vector3(POT.spoutReach - 0.02, POT.spoutY + 0.1, 0),
  ])
  const spout = plain(taperedTube(spoutCurve, 0.24, 0.09))
  // The handle is cane wound over the top, warm because it is where a hand goes.
  const cane = plain(new THREE.TorusGeometry(0.62, 0.065, 8, 20, Math.PI), GOLD)
  cane.translate(0, POT.height - 0.02, 0)
  const lugs = [-1, 1].map((side) => {
    const lug = plain(new THREE.SphereGeometry(0.1, 8, 6), INK)
    lug.translate(side * 0.62, POT.height - 0.02, 0)
    return lug
  })
  const lidPoints = lidProfile()
  const lid = turn(lidPoints, segments, { region: { area: REGIONS.lid, from: 0, to: 3 }, color: (j) => (j >= 5 ? GOLD : null) })
  return { body: merged([belly, spout, cane, ...lugs]), lid }
}

/** A porcelain spoon lying flat: a shallow bowl and a handle with a gilt tip. Its bowl is at the origin and the handle runs along +z. */
export function spoonGeometry(): THREE.BufferGeometry {
  const bowl = plain(new THREE.SphereGeometry(0.2, 12, 8, 0, Math.PI * 2, Math.PI * 0.5, Math.PI * 0.5))
  bowl.scale(1, 0.45, 1.3)
  bowl.translate(0, 0.09, 0)
  const handle = plain(new THREE.BoxGeometry(0.11, 0.035, 0.7))
  handle.translate(0, 0.085, 0.56)
  const stripe = plain(new THREE.BoxGeometry(0.115, 0.037, 0.09), INK)
  stripe.translate(0, 0.086, 0.5)
  const tip = plain(new THREE.SphereGeometry(0.075, 8, 6), GOLD)
  tip.scale(1, 0.4, 1)
  tip.translate(0, 0.085, 0.93)
  return merged([bowl, handle, stripe, tip])
}

/** A natural sponge: a soft rounded block, lumpy, in the warm colour of a thing that can be picked up. */
export function spongeGeometry(): THREE.BufferGeometry {
  const block = new THREE.BoxGeometry(0.9, 0.34, 0.62, 6, 3, 5)
  const position = block.attributes.position as THREE.BufferAttribute
  const vertex = new THREE.Vector3()
  for (let i = 0; i < position.count; i++) {
    vertex.fromBufferAttribute(position, i)
    // Rounded toward a pillow, with lumps that depend only on where the vertex is, so the seams stay closed.
    const round = 1 - 0.16 * ((vertex.x / 0.45) ** 2 * (vertex.z / 0.31) ** 2 + (vertex.y / 0.17) ** 2 * 0.3)
    const lump = 1 + 0.035 * Math.sin(vertex.x * 23.1 + vertex.z * 17.3) * Math.cos(vertex.y * 31.7 + vertex.x * 9.2)
    vertex.multiplyScalar(round * lump)
    position.setXYZ(i, vertex.x, vertex.y + 0.17, vertex.z)
  }
  block.computeVertexNormals()
  return plain(block, new THREE.Color('#e6b545'))
}

/** The plain cloth: one colour, a faint weave, a little lighter in the middle of the table. */
export function clothMesh(doc: Document): THREE.Mesh {
  const canvas = doc.createElement('canvas')
  canvas.width = canvas.height = 256
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = CLOTH_COLOR
  ctx.fillRect(0, 0, 256, 256)
  // A linen weave so faint that it reads as cloth and never as a pattern.
  for (let i = 0; i < 256; i += 2) {
    ctx.fillStyle = `rgba(255, 255, 255, ${0.018 + 0.014 * Math.sin(i * 1.7)})`
    ctx.fillRect(i, 0, 1, 256)
    ctx.fillStyle = `rgba(10, 20, 60, ${0.02 + 0.014 * Math.cos(i * 2.3)})`
    ctx.fillRect(0, i, 256, 1)
  }
  const weave = new THREE.CanvasTexture(canvas)
  weave.colorSpace = THREE.SRGBColorSpace
  weave.wrapS = weave.wrapT = THREE.RepeatWrapping
  weave.repeat.set(10, 6)
  const width = (CLOTH.maxX - CLOTH.minX) * 2.4, depth = (CLOTH.maxZ - CLOTH.minZ) * 2.2
  const geometry = new THREE.PlaneGeometry(width, depth, 8, 6)
  geometry.rotateX(-Math.PI / 2)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const far = Math.hypot(position.getX(i) / (width * 0.5), position.getZ(i) / (depth * 0.5))
    const light = 1.06 - 0.26 * Math.min(1, far) ** 1.6
    colors.set([light, light, light], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: weave, vertexColors: true }))
  mesh.name = 'cloth'
  return mesh
}

/** The wall of tiles behind the table, shaded a little toward the table so the guests stand clear of it. */
export function wallMesh(doc: Document): THREE.Mesh {
  const tiles = new THREE.CanvasTexture(paintTiles(doc))
  tiles.colorSpace = THREE.SRGBColorSpace
  tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping
  tiles.anisotropy = 4
  const width = 34, height = 9, tile = 1.6
  tiles.repeat.set(width / (tile * TILE_COLS), height / (tile * TILE_ROWS))
  const geometry = new THREE.PlaneGeometry(width, height, 1, 6)
  const position = geometry.attributes.position as THREE.BufferAttribute
  const colors = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) {
    const up = (position.getY(i) + height / 2) / height
    const light = 0.74 + 0.26 * Math.min(1, up * 2.2)
    colors.set([light * 0.97, light * 0.985, light], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: tiles, vertexColors: true }))
  mesh.position.set(0, height / 2 - 0.05, CLOTH.minZ - 1.5)
  mesh.name = 'wall'
  return mesh
}

/** Soft round shadows on the cloth, all in one draw: no shadow maps (the quality bar). Each piece moves its own. */
export function shadowBlobs(doc: Document, capacity: number): THREE.InstancedMesh {
  const canvas = doc.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const fall = ctx.createRadialGradient(32, 32, 4, 32, 32, 32)
  fall.addColorStop(0, 'rgba(14, 26, 70, 0.5)')
  fall.addColorStop(0.6, 'rgba(14, 26, 70, 0.22)')
  fall.addColorStop(1, 'rgba(14, 26, 70, 0)')
  ctx.fillStyle = fall
  ctx.fillRect(0, 0, 64, 64)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const geometry = new THREE.PlaneGeometry(2, 2)
  geometry.rotateX(-Math.PI / 2)
  const blobs = new THREE.InstancedMesh(geometry, new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false }), capacity)
  blobs.count = 0
  blobs.renderOrder = 1
  blobs.frustumCulled = false
  blobs.name = 'shadows'
  return blobs
}
