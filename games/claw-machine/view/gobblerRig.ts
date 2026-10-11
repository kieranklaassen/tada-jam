import { Group, Mesh, MeshBasicMaterial, type ShaderMaterial } from 'three'
import { EYE, browsAt, eyeCentres, gobblerParts, tongueAt } from '../gobblerBuild'
import type { GobblerLook } from '../picture'
import { brickGeometry } from './plastic'

// One gobbler on the stage: its body, which squashes and stretches about its
// feet, the clear front of its belly, and its two pupils.

/** The angle above level at which the child looks in. */
const AHEAD = 0.6

const glass = new MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.2, depthWrite: false })

export class GobblerRig {
  readonly group = new Group()
  private readonly pupils: Mesh
  private readonly eyeY: number
  private readonly eyeZ: number
  /** Whether it was built in the shade of the parapet; the stage builds it again when that changes. */
  readonly waiting: boolean

  constructor(look: GobblerLook, plastic: ShaderMaterial) {
    this.waiting = look.waiting
    const parts = gobblerParts(look.shape)
    this.group.name = `gobbler-${look.who}`
    // It stands on studs, so it is built with its undersides: a stud under a foot is then a fifth of a stud
    // into the foot, and not somewhere inside a hollow shell.
    const body = new Mesh(brickGeometry(parts.body, true), plastic)
    body.name = `gobbler-${look.who}-body`
    this.group.add(body)
    const eye = eyeCentres(look.shape)[0]
    this.eyeY = eye.y; this.eyeZ = eye.z
    this.pupils = new Mesh(brickGeometry(parts.pupils), plastic)
    this.pupils.name = `gobbler-${look.who}-pupils`
    this.group.add(this.pupils)
    const over = browsAt(look.shape)
    this.browY = over.y; this.browZ = over.z
    this.brows = new Mesh(brickGeometry(parts.brows, true), plastic)
    this.brows.name = `gobbler-${look.who}-brows`
    this.group.add(this.brows)
    const tip = tongueAt(look.shape)
    if (parts.tongue && tip && !look.waiting) {
      this.tongue = new Mesh(brickGeometry(parts.tongue, true), plastic)
      this.tongue.name = `gobbler-${look.who}-tongue`
      this.tongue.position.set(tip.x, tip.y, tip.z)
      this.tongue.visible = false
      this.group.add(this.tongue)
    }
    // The ones who wait show no belly: they are seen from the eyes up.
    if (!look.waiting) {
      const window = new Mesh(brickGeometry(parts.window), glass)
      window.name = `gobbler-${look.who}-window`
      window.renderOrder = 2
      this.group.add(window)
    }
  }

  private readonly brows: Mesh
  private readonly browY: number
  private readonly browZ: number
  private readonly tongue: Mesh | null = null

  pose(look: GobblerLook): void {
    this.group.position.set(look.x, look.y, look.z)
    this.group.rotation.set(look.leanX, look.turn, look.leanZ)
    const wide = (1 / Math.sqrt(Math.max(0.2, look.squash))) * look.scale
    this.group.scale.set(wide, look.squash * look.scale, look.deep ? wide : look.scale)
    // The pupils ride on the balls of the eyes. Looking straight ahead they face the child, who looks in from
    // the front and above; the gaze turns them from there, and never round to the back.
    const across = look.gazeX * 0.75, lift = AHEAD + look.gazeY * 0.6, r = EYE / 2 - 0.12
    this.pupils.position.set(Math.sin(across) * Math.cos(lift) * r, this.eyeY + Math.sin(lift) * r, this.eyeZ + Math.cos(across) * Math.cos(lift) * r)
    this.pupils.scale.set(1, Math.max(0.1, 1 - look.blink), 1)
    // The brows rise off the eyes, or tip forward into a frown; they never come down onto them.
    this.brows.position.set(0, this.browY + 0.6 * Math.max(0, look.brow), this.browZ)
    this.brows.rotation.x = 0.5 * Math.max(0, -look.brow)
    // The tip of the tongue grows out over the rim and curls up; drawn in, it is not there at all.
    if (this.tongue) {
      this.tongue.visible = look.tongue > 0.03
      this.tongue.scale.z = Math.max(0.03, look.tongue)
      this.tongue.rotation.x = -0.32 * look.lick
    }
  }

  dispose(): void {
    this.group.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
  }
}
