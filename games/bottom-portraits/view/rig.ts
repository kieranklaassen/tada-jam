import * as THREE from 'three'
import { STAND, type Id } from '../cast'
import type { Pose } from '../pose'
import { MAKERS } from './sitters'
import { tinMaterial } from './tin'

// One sitter's tin, hung on its pivots. The stand and its key are drawn with
// everybody's, in the stage; `root` is where they go.

export class Rig {
  readonly root = new THREE.Group()
  /** Everything above the stand. */
  private readonly tin = new THREE.Group()
  private readonly head = new THREE.Group()
  private readonly eyeline = new THREE.Group()
  private pupils: THREE.Mesh | null = null
  private lids: THREE.Mesh | null = null
  private readonly loose: { name: string; mesh: THREE.Mesh }[] = []
  readonly material: THREE.MeshMatcapMaterial
  private readonly made: THREE.BufferGeometry[] = []

  constructor(readonly id: Id, matcap: THREE.Texture) {
    const parts = MAKERS[id]()
    this.material = tinMaterial(matcap, parts.sheet)
    const mesh = (geometry: THREE.BufferGeometry, name: string): THREE.Mesh => {
      const made = new THREE.Mesh(geometry, this.material)
      made.name = `${id}-${name}`
      this.made.push(geometry)
      return made
    }
    this.root.name = id
    this.root.userData.jamObject = id
    this.tin.position.y = STAND.h
    this.root.add(this.tin)
    this.tin.add(mesh(parts.body, 'body'))
    this.head.position.set(...parts.neck)
    this.tin.add(this.head)
    if (parts.head) this.head.add(mesh(parts.head, 'head'))
    for (const piece of parts.loose) {
      const made = mesh(piece.geometry, piece.name)
      made.position.set(...piece.at)
      ;(piece.on === 'head' ? this.head : this.tin).add(made)
      this.loose.push({ name: piece.name, mesh: made })
    }
    if (parts.eyes) {
      this.eyeline.position.set(...parts.eyes.at)
      this.pupils = mesh(parts.eyes.pupils, 'pupils')
      this.lids = mesh(parts.eyes.lids, 'lids')
      this.eyeline.add(this.pupils, this.lids)
      this.head.add(this.eyeline)
    }
  }

  lay(p: Pose): void {
    this.root.position.set(p.x, p.y, p.z)
    this.root.rotation.y = p.yaw
    this.tin.position.y = STAND.h + p.hop
    const fat = 1 / Math.sqrt(p.squash)
    this.tin.scale.set(fat, p.squash, fat)
    this.tin.rotation.set(p.lean, p.twist, p.tilt, 'YXZ')
    this.head.rotation.set(p.nod, p.shake, p.cock, 'YXZ')
    if (this.pupils) this.pupils.rotation.set(-p.up * 0.45, p.look * 0.07, 0)
    if (this.pupils) this.pupils.position.x = p.look * 0.035
    if (this.lids) this.lids.rotation.x = p.lid * 2.1
    for (const { name, mesh } of this.loose) {
      switch (name) {
        case 'ear-left': mesh.rotation.set(p.b, -p.a, 0); break
        case 'ear-right': mesh.rotation.set(p.b, p.a, 0); break
        case 'trunk': mesh.rotation.set(-p.b * 1.1, 0, p.a * 0.2); break
        case 'wing-left': mesh.rotation.set(0, 0, -p.a); break
        case 'wing-right': mesh.rotation.set(0, 0, p.a); break
        case 'jaw': mesh.rotation.set(p.a, 0, 0); break
        case 'tail': mesh.rotation.set(0, p.b, p.b * 0.4); break
      }
    }
  }

  dispose(): void {
    for (const geometry of this.made) geometry.dispose()
    this.material.map?.dispose()
    this.material.dispose()
  }
}
