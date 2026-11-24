import * as THREE from 'three'
import { MAESTRO } from '../layout'
import type { MaestroPose } from '../pose'
import { BODY, HEAD, Press, sheetOf, swatch, tinMaterial } from './tin'

// The painter: a round tin man in a teal smock, very sure of himself.

const S = { white: swatch(0), ink: swatch(1), skin: swatch(2), smock: swatch(3), red: swatch(4), brown: swatch(5), steel: swatch(6), gold: swatch(7), lid: swatch(8), shoe: swatch(9), cream: swatch(10), blue: swatch(11), green: swatch(12) }
const INK = '#2b2430'

export class MaestroRig {
  readonly root = new THREE.Group()
  private readonly man = new THREE.Group()
  private readonly head = new THREE.Group()
  private readonly arm = new THREE.Group()
  private readonly beret: THREE.Mesh
  private readonly pupils: THREE.Mesh
  private readonly lids: THREE.Mesh
  private readonly left: THREE.Mesh
  private readonly right: THREE.Mesh
  private readonly monocle: THREE.Mesh
  private readonly flap: THREE.Mesh
  private readonly material: THREE.MeshMatcapMaterial
  private readonly made: THREE.BufferGeometry[] = []

  constructor(matcap: THREE.Texture) {
    const sheet = sheetOf((p) => {
      p.fill('#1f8a8c').screen('#0f5a60', 10, -80, 0.5)
      p.path([[0, 80], [4, 0], [0, -80]], null, '#0f5a60', 4)
      for (let n = 0; n < 4; n++) p.oval(7, 46 - n * 24, 4, 4, '#f6e7c0', INK, 2)
      // A lifetime of wiped brushes.
      for (const [lon, lat, c] of [[-40, -10, '#d8443a'], [-28, 4, '#f2b84b'], [36, -22, '#f6ecd2'], [52, -6, '#e0707c'], [-56, -28, '#2d5fa8'], [28, 10, '#6fa84f'], [-16, -34, '#f2b84b']] as const) p.oval(lon, lat, 6, 5, c).oval(lon + 5, lat - 5, 2.4, 3, c)
      // Behind, under the smock: patched drawers.
      p.path([[112, -90], [112, 16], [180, 26], [248, 16], [248, -90]], '#fbf3df', undefined, 0, false)
      for (let lon = 116; lon < 246; lon += 13) p.patch(lon, lon + 5, -90, 14, '#7fa9d8')
      p.path([[196, 0], [226, 4], [224, -30], [198, -32], [196, 0]], '#e8b33c', INK, 4, false)
    }, (p) => {
      p.fill('#f3c6a0').screen('#d08b62', -20, -80, 0.4)
      for (const s of [-1, 1]) p.oval(s * 46, -10, 15, 14, '#e9857a')
      for (const s of [-1, 1]) p.path([[s * 18, 36], [s * 34, 48], [s * 52, 40]], null, '#4a2c1c', 11)
      p.path([[100, 40], [180, 20], [260, 40], [260, -8], [180, -18], [100, -8], [100, 40]], '#4a2c1c', undefined, 0, false)
    }, ['#fffaf0', INK, '#f3c6a0', '#1f8a8c', '#d33a32', '#4a2c1c', '#cfcac0', '#e8b33c', '#e2ab82', '#3a2a24', '#f6ecd2', '#2d5fa8', '#6fa84f'])
    this.material = tinMaterial(matcap, sheet)
    const mesh = (press: Press, name: string): THREE.Mesh => {
      const geometry = press.weld(), made = new THREE.Mesh(geometry, this.material)
      this.made.push(geometry)
      made.name = `maestro-${name}`
      return made
    }
    this.root.name = 'maestro'
    this.root.userData.jamObject = 'maestro'
    this.root.position.set(MAESTRO.x, MAESTRO.y, MAESTRO.z)
    this.root.scale.setScalar(1.12)

    const body = new Press().shell(BODY, [0, 1.15, 0], [1.0, 1.2, 0.84], undefined, 34).seam(S.steel, [0, 1.15, 0], [1.0, 1.21, 0.85])
    for (const s of [-1, 1]) body.shell(BODY, [s * 0.42, 0.62, -0.46], [0.5, 0.48, 0.46], undefined, 22)
    // The floppy bow at his neck.
    for (const s of [-1, 1]) body.shell(S.red, [s * 0.34, 2.14, 0.5], [0.32, 0.2, 0.12], [0, 0, s * 0.25], 18).shell(S.red, [s * 0.18, 1.86, 0.62], [0.13, 0.28, 0.08], [0, 0, -s * 0.2], 14)
    body.shell(S.red, [0, 2.12, 0.58], [0.14, 0.14, 0.12], undefined, 12)
    // His left arm, with the palette.
    body.tube(S.smock, [[0.8, 1.75, 0.1], [1.22, 1.3, 0.4], [0.95, 1.12, 0.9]], () => 0.25, 14, 12).shell(S.skin, [0.92, 1.14, 1.0], [0.2, 0.18, 0.2], undefined, 14)
    body.disc(S.cream, [1.06, 1.26, 1.16], 0.56, 0.06, [0.5, 0, -0.2], 0.56, 28)
    for (const [x, z, t] of [[-0.3, 0.1, S.red], [-0.1, 0.3, S.gold], [0.16, 0.32, S.blue], [0.34, 0.12, S.green], [0.3, -0.14, S.white]] as const) body.shell(t, [1.06 + x, 1.31 - z * 0.46 + x * -0.16, 1.16 + z * 0.86], [0.1, 0.07, 0.1], undefined, 10)
    this.man.add(mesh(body, 'body'))

    const head = new Press().shell(HEAD, [0, 0.62, 0], [0.74, 0.8, 0.7], undefined, 30).shell(S.skin, [0, 0.52, 0.72], [0.2, 0.24, 0.3], undefined, 20)
    for (const s of [-1, 1]) head.shell(S.skin, [s * 0.74, 0.58, -0.02], [0.13, 0.2, 0.1], undefined, 12)
    head.shell(S.brown, [0, -0.06, 0.6], [0.11, 0.24, 0.1], [0.2, 0, 0], 12)
    const pupils = new Press(), lids = new Press()
    for (const s of [-1, 1]) {
      head.shell(S.white, [s * 0.28, 0.8, 0.52], [0.2, 0.2, 0.2], undefined, 18)
      pupils.add(new THREE.SphereGeometry(0.208, 18, 8, 0, 7, 0, 0.46), S.ink, { at: [s * 0.28, 0, 0], turn: [Math.PI / 2, 0, -s * 0.12] })
      pupils.add(new THREE.SphereGeometry(0.213, 10, 5, 0, 7, 0, 0.14), S.white, { at: [s * 0.28, 0, 0], turn: [Math.PI / 2 - 0.2, 0, -s * 0.12 + 0.18] })
      lids.add(new THREE.SphereGeometry(0.218, 18, 9, 0, 7, 0, Math.PI / 2), S.lid, { at: [s * 0.28, 0, 0], turn: [-0.75, 0, 0] })
    }
    this.head.position.set(0, 2.3, 0.1)
    this.head.add(mesh(head, 'head'))
    this.pupils = mesh(pupils, 'pupils')
    this.lids = mesh(lids, 'lids')
    this.pupils.position.set(0, 0.8, 0.52)
    this.lids.position.set(0, 0.8, 0.52)
    this.beret = mesh(new Press().shell(S.red, [0.16, 0.08, 0], [0.92, 0.25, 0.82], [0, 0, -0.16], 28).disc(S.ink, [0, -0.06, 0], 0.62, 0.14).disc(S.red, [0.22, 0.36, 0], 0.05, 0.2), 'beret')
    this.beret.position.set(0, 1.28, -0.04)
    const whisker = (s: number): Press => new Press().tube(S.brown, [[0, 0, 0.02], [s * 0.32, -0.1, 0.04], [s * 0.64, 0.02, -0.06], [s * 0.82, 0.3, -0.14]], (t) => 0.14 * (1 - t) + 0.035, 16, 10)
    this.left = mesh(whisker(-1), 'moustache-left')
    this.right = mesh(whisker(1), 'moustache-right')
    this.left.position.set(-0.05, 0.3, 0.74)
    this.right.position.set(0.05, 0.3, 0.74)
    this.monocle = mesh(new Press().add(new THREE.TorusGeometry(0.235, 0.035, 8, 26), S.gold), 'monocle')
    this.head.add(this.pupils, this.lids, this.beret, this.left, this.right, this.monocle)
    this.man.add(this.head)

    // His right arm and the brush: held from the shoulder.
    this.arm.position.set(-0.84, 1.8, 0.1)
    const arm = new Press().tube(S.smock, [[0, 0, 0], [-0.4, -0.42, 0.3], [-0.2, -0.2, 0.92]], () => 0.25, 14, 12).shell(S.skin, [-0.18, -0.12, 1.02], [0.2, 0.2, 0.2], undefined, 14)
    arm.tube(S.gold, [[-0.18, -0.42, 1.04], [-0.18, 0.9, 1.04]], () => 0.045, 2, 8).tube(S.brown, [[-0.18, 0.9, 1.04], [-0.18, 1.2, 1.04]], (t) => 0.09 - t * 0.06, 6, 10)
    this.arm.add(mesh(arm, 'arm'))
    this.man.add(this.arm)

    // The button flap of his drawers, hinged at the waist.
    this.flap = mesh(new Press().shell(S.cream, [0, -0.36, -0.06], [0.46, 0.4, 0.06], undefined, 20).shell(S.red, [-0.36, -0.14, -0.1], [0.06, 0.06, 0.05], undefined, 10).shell(S.red, [0.36, -0.14, -0.1], [0.06, 0.06, 0.05], undefined, 10), 'flap')
    this.flap.position.set(0, 1.14, -0.94)
    this.man.add(this.flap)

    this.man.position.y = 0.9
    this.root.add(this.man)
    const stool = new Press().disc(S.red, [0, 0.8, 0], 0.72, 0.18).disc(S.gold, [0, 0.69, 0], 0.74, 0.05).disc(S.steel, [0, 0.0, 0], 0.16, 1.4).disc(S.smock, [0, -1.0, 0], 0.5, 0.9, undefined, 0.2)
    this.root.add(mesh(stool, 'stool'))
  }

  lay(p: MaestroPose): void {
    this.root.rotation.y = p.yaw
    this.man.position.y = 0.9 - p.duck
    const fat = 1 / Math.sqrt(p.squash)
    this.man.scale.set(fat, p.squash, fat)
    this.man.rotation.set(p.lean, 0, p.sway)
    this.head.rotation.set(p.nod, p.shake, p.cock, 'YXZ')
    this.arm.rotation.set(-p.arm * 0.75 + p.dab * 0.5, p.dab * 0.35, p.arm * 0.12)
    this.left.rotation.z = -p.moustache * 0.6
    this.right.rotation.z = p.moustache * 0.6
    this.beret.rotation.z = p.beret * 0.4
    this.beret.position.y = 1.28 + Math.max(0, p.beret) * 0.22
    this.pupils.rotation.x = -p.up * 0.45
    this.pupils.position.x = p.look * 0.06
    this.lids.rotation.x = p.lid * 1.95
    // Out of the eye it falls on its cord and hangs on his chest, clear of the bow.
    this.monocle.position.set(0.28 + p.monocle * 0.4, 0.8 - p.monocle * 1.25, 0.74 + Math.sin(Math.min(1, p.monocle) * Math.PI) * 0.3 + p.monocle * 0.2)
    this.monocle.rotation.set(0, 0.12, p.monocle * 1.2)
    this.flap.rotation.x = p.flap * 2.2
  }

  dispose(): void {
    for (const geometry of this.made) geometry.dispose()
    this.material.map?.dispose()
    this.material.dispose()
  }
}
