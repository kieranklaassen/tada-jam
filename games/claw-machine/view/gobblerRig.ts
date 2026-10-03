import { Group, Mesh, MeshBasicMaterial, type ShaderMaterial } from 'three'
import { EYE, eyeCentres, gobblerParts, tongueTravel } from '../gobblerBuild'
import type { GobblerLook } from '../picture'
import { brickGeometry } from './plastic'

// One gobbler on the stage: its body, which squashes and stretches about its
// feet, the clear front of its belly, its two pupils and its tongue.

/** The angle above level at which the child looks in. */
const AHEAD = 0.6

const glass = new MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.2, depthWrite: false })

export class GobblerRig {
  readonly group = new Group()
  private readonly pupils: Mesh
  private readonly tongue: Mesh
  private readonly eyeY: number
  private readonly eyeZ: number
  private readonly travel: { floor: number; rise: number }
  /** Whether it was built in the shade of the parapet; the stage builds it again when that changes. */
  readonly waiting: boolean

  constructor(look: GobblerLook, plastic: ShaderMaterial) {
    this.waiting = look.waiting
    const parts = gobblerParts(look.shape)
    this.group.name = `gobbler-${look.who}`
    const body = new Mesh(brickGeometry(parts.body, true), plastic)
    body.name = `gobbler-${look.who}-body`
    this.group.add(body)
    const eye = eyeCentres(look.shape)[0]
    this.eyeY = eye.y; this.eyeZ = eye.z
    this.pupils = new Mesh(brickGeometry(parts.pupils, true), plastic)
    this.pupils.name = `gobbler-${look.who}-pupils`
    this.group.add(this.pupils)
    this.tongue = new Mesh(brickGeometry(parts.tongue, true), plastic)
    this.tongue.name = `gobbler-${look.who}-tongue`
    this.group.add(this.tongue)
    this.travel = tongueTravel(look.shape)
    // The ones who wait show no belly: they are seen from the eyes up.
    if (!look.waiting) {
      const window = new Mesh(brickGeometry(parts.window, true), glass)
      window.name = `gobbler-${look.who}-window`
      window.renderOrder = 2
      this.group.add(window)
    }
    this.tongue.visible = !look.waiting
  }

  pose(look: GobblerLook): void {
    this.group.position.set(look.x, look.y, look.z)
    this.group.rotation.set(look.leanX, look.turn, look.leanZ)
    const wide = (1 / Math.sqrt(Math.max(0.2, look.squash))) * look.scale
    this.group.scale.set(wide, look.squash * look.scale, wide)
    // The pupils ride on the balls of the eyes. Looking straight ahead they face the child, who looks in from
    // the front and above; the gaze turns them from there, and never round to the back.
    const across = look.gazeX * 0.75, lift = AHEAD + look.gazeY * 0.6, r = EYE / 2 - 0.12
    this.pupils.position.set(Math.sin(across) * Math.cos(lift) * r, this.eyeY + Math.sin(lift) * r, this.eyeZ + Math.cos(across) * Math.cos(lift) * r)
    this.pupils.scale.set(1, Math.max(0.1, 1 - look.blink), 1)
    this.tongue.position.y = this.travel.floor + look.tongue * this.travel.rise
  }

  dispose(): void {
    this.group.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
  }
}
