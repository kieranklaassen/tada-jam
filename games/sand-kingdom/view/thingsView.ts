import * as THREE from 'three'
import type { Play } from '../play'
import { BUCKET_HEIGHT, HANDLE_BOW, SHELL_SIZES } from '../things'
import { Lumps, type Rgb } from './shapes'

// The things the child picks up, as meshes: one bucket, three shells and two
// pieces of driftwood. Each is laid where the game says it is drawn, which is
// also where a touch finds it.

function mesh(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D): THREE.Mesh {
  const made = new THREE.Mesh(geometry, material)
  made.name = name
  parent.add(made)
  return made
}

/** The three shells: no two the same size or colour, so they read as shells and never as a count. */
const SHELLS: readonly { out: Rgb; rib: Rgb; inside: Rgb }[] = [
  { out: [1.0, 0.72, 0.62], rib: [0.93, 0.45, 0.42], inside: [1.0, 0.93, 0.86] },
  { out: [0.99, 0.86, 0.6], rib: [0.9, 0.6, 0.3], inside: [1.0, 0.95, 0.9] },
  { out: [0.86, 0.74, 0.9], rib: [0.62, 0.45, 0.72], inside: [0.98, 0.94, 1.0] },
]

export class ThingsView {
  readonly group = new THREE.Group()
  private readonly bucket = new THREE.Group()
  private readonly handle: THREE.Mesh
  private readonly sand: THREE.Mesh
  private readonly water: THREE.Mesh
  private readonly peeks: THREE.Mesh[] = []
  private readonly shells: THREE.Mesh[]
  private readonly wood: THREE.Mesh[]

  constructor(material: THREE.Material, hollow: THREE.Material) {
    this.group.name = 'things'
    // The bucket: a sea-green pail with a pale rim, open at the top.
    const green: Rgb = [0.12, 0.62, 0.6], deep: Rgb = [0.07, 0.42, 0.48], rim: Rgb = [1.0, 0.9, 0.55], grip: Rgb = [0.98, 0.95, 0.9]
    this.bucket.name = 'bucket'
    this.bucket.userData.jamObject = 'bucket'
    const pail = new Lumps()
      .tube(0.6, 0.44, BUCKET_HEIGHT, deep, { at: [0, BUCKET_HEIGHT / 2, 0], top: green })
      .disc(0.44, deep, { at: [0, 0.03, 0] })
      .arc(0.6, 0.045, Math.PI * 2, rim, { at: [0, BUCKET_HEIGHT, 0], turn: [Math.PI / 2, 0, 0] })
      .build()
    mesh('bucket-pail', pail, hollow, this.bucket)
    // The handle is a bow a little wider than the rim, so that swung right down it lies round the rim and is in
    // none of the pail: its inside is 0.66 out and the rim's outside 0.645.
    this.handle = mesh('bucket-handle', new Lumps().arc(HANDLE_BOW, 0.04, Math.PI, grip).build(), material, this.bucket)
    this.handle.position.set(0, BUCKET_HEIGHT - 0.02, 0)
    // What it holds: sand heaped over the rim, or water just under it.
    const sand: Rgb = [0.8, 0.6, 0.42], pale: Rgb = [0.95, 0.78, 0.58]
    this.sand = mesh('bucket-sand', new Lumps().ball(0.57, sand, { at: [0, BUCKET_HEIGHT - 0.06, 0], scale: [1, 0.42, 1], top: pale }, 16).build(), material, this.bucket)
    this.water = mesh('bucket-water', new Lumps().disc(0.56, [0.5, 0.66, 0.74], { at: [0, BUCKET_HEIGHT - 0.12, 0] }).build(), material, this.bucket)
    this.group.add(this.bucket)

    this.shells = SHELLS.map((look, index) => {
      // Three kinds of shell, each a low dome that is coloured outside and pearly inside, so the other way up it is
      // a dish. None has ribs or rows: a scallop with one blotch, a whelk with its whorl and tip, a long mussel.
      const shell = new Lumps()
      if (index === 0) {
        shell.ball(0.56, look.inside, { at: [0, 0.02, 0], scale: [1, 0.3, 0.86], top: look.out }, 18)
        shell.ball(0.3, look.rib, { at: [0.07, 0.1, -0.1], scale: [1.25, 0.3, 0.85] }, 12)
        shell.ball(0.13, look.rib, { at: [0, 0.07, 0.42], scale: [1.5, 0.7, 0.7] }, 8)
      } else if (index === 1) {
        shell.ball(0.46, look.inside, { at: [-0.1, 0.03, 0], scale: [0.95, 0.5, 0.82], top: look.out }, 18)
        shell.ball(0.27, look.rib, { at: [0.3, 0.1, 0.08], scale: [1, 0.72, 0.9] }, 12)
        shell.cone(0.15, 0.34, look.out, { at: [0.55, 0.1, 0.12], turn: [0, 0, -Math.PI / 2] }, 10)
      } else {
        shell.ball(0.56, look.inside, { at: [0, 0.02, 0], scale: [1.14, 0.27, 0.6], top: look.out }, 18)
        shell.ball(0.2, look.rib, { at: [-0.3, 0.09, 0.04], scale: [1.7, 0.4, 0.9] }, 10)
      }
      const shape = shell.build()
      // Scooped up, the same shell shows over the rim of the bucket, small and on its edge.
      const peek = mesh(`bucket-shell-${index}`, shape, material, this.bucket)
      peek.position.set(0.18, BUCKET_HEIGHT + 0.14, 0.2)
      peek.rotation.set(1.05, 0.3, 0)
      peek.scale.setScalar(0.5 * SHELL_SIZES[index])
      this.peeks.push(peek)
      const made = mesh(`shell-${index}`, shape, material, this.group)
      made.userData.jamObject = `shell-${index}`
      made.scale.setScalar(SHELL_SIZES[index])
      made.rotation.order = 'YXZ'
      return made
    })

    this.wood = [0, 1].map((index) => {
      // Driftwood: a grey-brown bough, bleached at the ends, with one stub of a branch. The two are not alike.
      const bark: Rgb = index === 0 ? [0.6, 0.47, 0.38] : [0.52, 0.42, 0.37], pale: Rgb = [0.84, 0.74, 0.62]
      const bough = new Lumps()
        .rod(0.18, 2.0, bark, { turn: [0, 0, Math.PI / 2] }, 10)
        .ball(0.2, pale, { at: [-1.12, 0, 0], scale: [0.7, 1, 1] }, 10)
        .ball(0.2, pale, { at: [1.12, 0, 0], scale: [0.7, 1, 1] }, 10)
        .rod(0.08, 0.3, bark, { at: index === 0 ? [0.45, 0.2, -0.05] : [-0.3, 0.17, 0.1], turn: [index === 0 ? -0.3 : 0.5, 0, index === 0 ? -0.5 : 0.7], top: pale }, 8)
        .build()
      const made = mesh(`driftwood-${index}`, bough, material, this.group)
      made.userData.jamObject = `driftwood-${index}`
      made.rotation.order = 'YXZ'
      return made
    })
  }

  update(play: Play): void {
    const things = play.things
    // The bucket: where it stands, hopping, on its side, or flying off the tower it has just turned out.
    const bucket = things.bucket, at = play.bucketPose()
    this.bucket.position.set(at.x, at.y, at.z)
    this.bucket.rotation.set(0, 0, at.turn)
    this.bucket.scale.set(at.wide, at.tall, at.wide)
    this.handle.rotation.x = at.handle
    this.sand.visible = bucket.holds === 'sand' && !bucket.side
    this.water.visible = bucket.holds === 'water' && !bucket.side
    const showing = play.peek()
    this.peeks.forEach((peek, index) => (peek.visible = index === showing))

    things.shells.forEach((shell, index) => {
      const view = this.shells[index]
      view.visible = shell.state !== 'bucket'
      if (!view.visible) return
      const lies = play.shellPose(index)
      view.position.set(lies.x, lies.y, lies.z)
      // Worn by the crab it sits on top of its eyes' stalks, tipped like a hat: the game says where and how.
      view.rotation.set(lies.tip, lies.spin, lies.roll)
      view.scale.set(lies.wide, lies.tall, lies.wide)
    })

    things.wood.forEach((_, index) => {
      const view = this.wood[index], lies = play.woodPose(index)
      view.position.set(lies.x, lies.y, lies.z)
      view.rotation.set(0, -lies.turn, lies.rock)
    })
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose()
    })
  }
}
