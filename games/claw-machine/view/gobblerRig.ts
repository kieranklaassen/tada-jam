import { Group, Mesh, MeshBasicMaterial, SphereGeometry, type ShaderMaterial } from 'three'
import { PLATE } from '../bricks'
import { EYE, LEGS, eyeCentres, gobblerParts } from '../gobblerBuild'
import type { GobblerLook } from '../picture'
import { BLACK, WHITE } from '../palette'
import { brickGeometry, plain } from './plastic'

// One gobbler on the stage: its planted feet, the body that squashes and
// stretches above them, the clear front of its belly, two pupils and a tongue.

/** The angle above level at which the child looks in. */
const AHEAD = 0.6

const glass = new MeshBasicMaterial({ color: 0xcfe6ff, transparent: true, opacity: 0.2, depthWrite: false })

export class GobblerRig {
  readonly group = new Group()
  private readonly body = new Group()
  private readonly pupils: Mesh[] = []
  private readonly tongue: Mesh
  private readonly eyes: { x: number; y: number; z: number }[]
  private readonly travel: number
  /** Whether it was built in the shade of the parapet; the stage builds it again when that changes. */
  readonly waiting: boolean

  constructor(look: GobblerLook, plastic: ShaderMaterial) {
    this.waiting = look.waiting
    const parts = gobblerParts(look.shape)
    this.group.name = `gobbler-${look.id}`
    const base = new Mesh(brickGeometry(parts.base, true), plastic)
    base.name = `gobbler-${look.id}-base`
    this.group.add(base)
    this.body.position.y = LEGS * PLATE
    this.group.add(this.body)
    const bin = new Mesh(brickGeometry(parts.body, true), plastic)
    bin.name = `gobbler-${look.id}-body`
    this.body.add(bin)
    const window = new Mesh(brickGeometry(parts.window, true), glass)
    window.name = `gobbler-${look.id}-window`
    window.renderOrder = 2
    this.body.add(window)
    this.eyes = eyeCentres(look.shape)
    const ball = plain(new SphereGeometry(EYE / 2, 18, 12), WHITE)
    const pupil = plain(new SphereGeometry(EYE * 0.21, 12, 8), BLACK)
    for (let i = 0; i < 2; i++) {
      const white = new Mesh(ball, plastic)
      white.name = `gobbler-${look.id}-eye-${i}`
      white.position.set(this.eyes[i].x, this.eyes[i].y, this.eyes[i].z)
      this.body.add(white)
      const mesh = new Mesh(pupil, plastic)
      mesh.name = `gobbler-${look.id}-pupil-${i}`
      this.pupils.push(mesh)
      this.body.add(mesh)
    }
    this.tongue = new Mesh(brickGeometry(parts.tongue, true), plastic)
    this.tongue.name = `gobbler-${look.id}-tongue`
    this.body.add(this.tongue)
    this.travel = look.shape.belly * PLATE
  }

  pose(look: GobblerLook): void {
    this.group.position.set(look.x, look.y, look.z)
    this.group.rotation.set(look.leanX, 0, look.leanZ)
    const wide = 1 / Math.sqrt(Math.max(0.2, look.squash))
    this.body.scale.set(wide, look.squash, wide)
    // A pupil rides on the ball of its eye. Looking straight ahead it faces the child, who looks in from
    // the front and above; the gaze turns it from there, and never round to the back.
    const across = look.gazeX * 0.75, lift = AHEAD + look.gazeY * 0.6
    const dx = Math.sin(across) * Math.cos(lift), dy = Math.sin(lift), dz = Math.cos(across) * Math.cos(lift)
    for (let i = 0; i < 2; i++) {
      const eye = this.eyes[i], pupil = this.pupils[i], r = EYE / 2 - 0.12
      pupil.position.set(eye.x + dx * r, eye.y + dy * r, eye.z + dz * r)
      pupil.scale.set(1, Math.max(0.1, 1 - look.blink), 1)
    }
    this.tongue.position.y = PLATE + look.tongue * this.travel
  }

  dispose(): void {
    this.group.traverse((object) => {
      const mesh = object as Mesh
      if (mesh.isMesh) mesh.geometry.dispose()
    })
  }
}
