import * as THREE from 'three'
import { EEL_NOSE, type Folk, eelShown } from '../folk'
import { GULL_SIZES, STAR_HOME } from '../layout'
import { STAR_SCALE, armAngle, armLength, eyeLean, starMiddle, starTilt } from '../solid'
import { Lumps, type Rgb } from './shapes'

// The sea folk as meshes: each one a handful of merged lumps, with its moving
// parts kept apart so the numbers from folk.ts can be laid on them. It shows
// what it is given and decides nothing.

const WHITE: Rgb = [0.97, 0.95, 0.9], BLACK: Rgb = [0.09, 0.07, 0.1], DARK: Rgb = [0.2, 0.1, 0.12]

function mesh(name: string, geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D): THREE.Mesh {
  const made = new THREE.Mesh(geometry, material)
  made.name = name
  parent.add(made)
  return made
}

/** Where the crab's legs leave its shell on either side, in its own frame: they swing about this. */
const HIP = { x: 0.84, y: 0.5 } as const
/** How far out from its middle its feet stand. */
const FOOT = 1.4

class CrabView {
  readonly group = new THREE.Group()
  private readonly body: THREE.Mesh
  private readonly legs: THREE.Mesh[]
  private readonly claws: THREE.Mesh[]
  private readonly eyes: THREE.Mesh[]
  private readonly mouth: THREE.Mesh

  constructor(material: THREE.Material) {
    const red: Rgb = [0.9, 0.27, 0.2], pale: Rgb = [0.98, 0.56, 0.38], deep: Rgb = [0.7, 0.16, 0.16]
    this.group.name = 'crab'
    this.group.userData.jamObject = 'crab'
    const body = new Lumps().ball(1, deep, { at: [0, 0.5, 0], scale: [0.92, 0.46, 0.64], top: red }, 20)
    // A few pale bumps on its back.
    for (const [x, z] of [[-0.4, -0.1], [0.38, -0.15], [0, -0.3]] as const) body.ball(0.09, pale, { at: [x, 0.9, z], scale: [1, 0.5, 1] }, 8)
    this.body = mesh('crab-body', body.build(), material, this.group)
    this.legs = [-1, 1].map((side) => {
      const legs = new Lumps()
      // Three legs a side, the front one set back clear of the arm of the claw, which leaves the shell beside it.
      for (let i = 0; i < 3; i++) {
        const z = -0.4 + i * 0.26
        legs.rod(0.075, 0.42, deep, { at: [side * (0.98 - HIP.x), 0.42 - HIP.y, z], turn: [0, 0, side * -1.05] })
        legs.rod(0.06, 0.4, red, { at: [side * (1.3 - HIP.x), 0.2 - HIP.y, z + 0.04], turn: [0, 0, side * 0.5] })
      }
      // They swing about where they leave the shell, so their roots stay set in its side as they step.
      const made = mesh(`crab-legs-${side < 0 ? 'left' : 'right'}`, legs.build(), material, this.group)
      made.position.set(side * HIP.x, HIP.y, 0)
      // Their place is set whole each frame (`update`): a leg that reaches down for the sand slopes down more
      // steeply from its hip, which a turn, a size and a place alone cannot say.
      made.matrixAutoUpdate = false
      return made
    })
    this.claws = [-1, 1].map((side) => {
      const claw = new Lumps()
      claw.rod(0.1, 0.3, deep, { at: [side * -0.26, -0.12, -0.12], turn: [0.5, 0, side * 0.9] })
      claw.ball(0.32, red, { scale: [1.0, 0.86, 0.7], top: pale }, 14)
      // The two fingers of the pincer stand up from it, the big one outside.
      claw.cone(0.17, 0.5, red, { at: [side * 0.12, 0.36, 0.02], turn: [0, 0, side * -0.22], top: pale }, 12)
      claw.cone(0.12, 0.38, pale, { at: [side * -0.14, 0.32, 0.02], turn: [0, 0, side * 0.5] }, 12)
      const made = mesh(`crab-claw-${side < 0 ? 'left' : 'right'}`, claw.build(), material, this.group)
      made.position.set(side * 1.02, 0.55, 0.5)
      return made
    })
    this.eyes = [-1, 1].map((side) => {
      const eye = new Lumps()
      // The stalk stands on the top of the shell, its foot just in it, and leans and shortens about that foot.
      eye.rod(0.055, 0.34, red, { at: [0, 0.16, 0] })
      eye.ball(0.2, WHITE, { at: [0, 0.46, 0] }, 14)
      eye.ball(0.1, BLACK, { at: [0, 0.48, 0.14] }, 10)
      const made = mesh(`crab-eye-${side < 0 ? 'left' : 'right'}`, eye.build(), material, this.group)
      made.position.set(side * 0.3, 0.9, 0.22)
      return made
    })
    this.mouth = mesh('crab-mouth', new Lumps().ball(1, DARK, {}, 10).build(), material, this.group)
    this.mouth.position.set(0, 0.36, 0.61)
  }

  update(folk: Folk, ground: number): void {
    const crab = folk.crab
    this.group.position.set(crab.x, ground + crab.lift * 0.35, crab.z)
    // It turns so that its side leads whichever way it goes, and leans into a run.
    this.group.rotation.set(0, crab.turn, crab.lean)
    // A flinch squashes the whole body down.
    this.body.scale.y = 1 + crab.lift * 0.5
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1
      // Its legs stand on the sand as the sand tips it, whatever its body does over them: where the body leans
      // into a run its hips go down on that side and up on the other, and the legs fold and stretch between the
      // hip and the foot, which stays where it stands.
      const own = crab.lean - crab.tilt, hipX = HIP.x * Math.cos(own) - side * HIP.y * Math.sin(own), hipY = side * HIP.x * Math.sin(own) + HIP.y * Math.cos(own)
      // Where the sand is lower under its feet than under its belly a leg reaches down for it: the foot goes
      // down and the hip stays where it is set in the shell, so the leg slopes more steeply. Stretching the
      // whole leg downward would swell its root in the shell's side, and that is not how a leg reaches.
      const wide = (FOOT - hipX) / (FOOT - HIP.x), tall = hipY / HIP.y, slope = crab.reach[i] / (FOOT - hipX)
      const swing = Math.sin(crab.stride * 3 + i * Math.PI) * 0.16 - own, cos = Math.cos(swing), sin = Math.sin(swing)
      // A turn about the hip, of the leg sloped by `slope` and sized by `wide` and `tall`.
      const ax = wide, ay = -side * slope * wide, by = tall
      this.legs[i].matrix.set(cos * ax - sin * ay, -sin * by, 0, side * HIP.x, sin * ax + cos * ay, cos * by, 0, HIP.y + Math.abs(Math.sin(crab.stride * 3 + i * Math.PI)) * 0.04, 0, 0, 1, 0, 0, 0, 0, 1)
      this.legs[i].matrixWorldNeedsUpdate = true
      const claw = crab.claws[i]
      this.claws[i].position.y = 0.55 + claw.raise * 0.5
      this.claws[i].rotation.z = side * (claw.raise * -0.5 + claw.shut * 0.3)
      this.claws[i].scale.set(1 + claw.shut * 0.04, 1 - claw.shut * 0.28, 1)
      const eye = crab.eyes[i]
      this.eyes[i].scale.set(1, 0.12 + 0.88 * eye.out, 1)
      // A stalk leans the way it looks: far to its own side, a little toward the other eye, and not at all once it
      // is pulled in (solid.ts).
      const lean = eyeLean(eye.across, eye.toward, side, eye.out, claw.raise)
      this.eyes[i].rotation.z = -lean.side
      this.eyes[i].rotation.x = lean.forward
    }
    this.mouth.scale.set(0.17 - crab.mouth * 0.06, 0.03 + crab.mouth * 0.1, 0.05)
  }
}

/** How far an arm of the starfish is curled in when nothing of its face is drawn any more: well before the arm is over an eye or the mouth. */
export const FOLDS_FROM = 0.1

class StarfishView {
  readonly group = new THREE.Group()
  private readonly body = new THREE.Group()
  private readonly arms: THREE.Mesh[] = []
  private readonly whites: THREE.Mesh
  private readonly pupils: THREE.Mesh
  private readonly lids: THREE.Mesh
  private readonly mouth: THREE.Mesh

  constructor(material: THREE.Material) {
    const orange: Rgb = [1.0, 0.56, 0.2], tip: Rgb = [1.0, 0.36, 0.22], spot: Rgb = [1.0, 0.82, 0.5]
    this.group.name = 'starfish'
    this.group.userData.jamObject = 'starfish'
    this.group.position.set(STAR_HOME.x, STAR_HOME.y, STAR_HOME.z)
    this.group.scale.setScalar(STAR_SCALE)
    this.group.add(this.body)
    // It leans back on its rock and faces the child.
    this.body.rotation.x = -0.3
    for (let i = 0; i < 5; i++) {
      const arm = new Lumps().ball(1, orange, { at: [0, 0.52, 0], scale: [0.25, 0.6, 0.17], top: tip }, 14)
      // A freckle or two on each arm, no two arms alike: they are skin, never a count.
      const freckles = [[0.05, 0.45, 0.06], [-0.04, 0.78, 0.04]].slice(0, 1 + (i % 2)) as [number, number, number][]
      for (const [x, y, r] of freckles) arm.ball(r + i * 0.004, spot, { at: [x * (i % 2 === 0 ? 1 : -1), y + i * 0.03, 0.15 - y * 0.05], scale: [1, 1.3, 1] }, 6)
      this.arms.push(mesh(`starfish-arm-${i}`, arm.build(), material, this.body))
    }
    mesh('starfish-middle', new Lumps().ball(1, orange, { scale: [0.44, 0.44, 0.22] }, 16).build(), material, this.body)
    // The whites of its eyes are their own mesh, so that a shut eye is not drawn at all.
    const whites = new Lumps()
    // They are low domes on the front of its middle, in front of where its arms join, so that an arm wheeling
    // round under them is not in them.
    for (const side of [-1, 1]) whites.ball(0.135, WHITE, { at: [side * 0.16, 0.08, 0.235], scale: [1, 1, 0.6] }, 12)
    this.whites = mesh('starfish-whites', whites.build(), material, this.body)
    const pupils = new Lumps()
    for (const side of [-1, 1]) pupils.ball(0.07, BLACK, { at: [side * 0.16, 0.08, 0.29] }, 10)
    this.pupils = mesh('starfish-pupils', pupils.build(), material, this.body)
    // Lids of its own skin come down over the eyes for a blink.
    const lids = new Lumps()
    for (const side of [-1, 1]) lids.ball(0.15, orange, { at: [side * 0.16, 0.08, 0.24], scale: [1, 1, 0.6] }, 12)
    this.lids = mesh('starfish-lids', lids.build(), material, this.body)
    this.mouth = mesh('starfish-mouth', new Lumps().ball(1, DARK, {}, 10).build(), material, this.body)
    this.mouth.position.set(0, -0.15, 0.2)
  }

  update(folk: Folk): void {
    const star = folk.starfish
    this.group.position.set(star.x, star.y, star.z)
    // On the crab's back it turns and leans with the crab; everywhere else it faces the child.
    this.group.rotation.set(0, star.yaw, star.roll)
    // Standing on its rock it leans back and faces the child; spread out on top of something it lies flat, face up.
    // The shape is the one the game rests on the rock, the sand and the crab (solid.ts).
    this.body.position.y = starMiddle(star)
    this.body.rotation.x = starTilt(star)
    this.body.rotation.z = star.sway
    this.body.scale.set(1 + star.squash * 0.22, 1 - star.squash * 0.3, 1)
    for (let i = 0; i < 5; i++) {
      // Arm 0 points up. Stretched, the two lower arms come together under it like legs.
      this.arms[i].rotation.z = armAngle(star, i)
      this.arms[i].rotation.x = star.arms[i] * 1.5
      this.arms[i].scale.y = armLength(star, i)
    }
    this.pupils.position.set(star.lookAcross * 0.05, star.lookUp * 0.04, 0)
    // Its lids come down over its eyes: while they are down the eyes under them are not drawn at all. An arm
    // that folds in over its face folds over a shut face: the lids are down from before the arm moves, and from
    // when the arm starts in until it is out again nothing of the face is drawn, neither eyes, lids nor mouth,
    // so an arm is never in any of them.
    const folded = Math.max(...star.arms) > FOLDS_FROM, down = star.blink > 0.5
    this.lids.visible = down && !folded
    this.whites.visible = !down && !folded
    this.pupils.visible = !down && !folded
    this.mouth.visible = !folded
    this.mouth.scale.set(0.15 - star.mouth * 0.07, 0.035 + star.mouth * 0.06, 0.04)
  }
}

class EelView {
  readonly group = new THREE.Group()
  private readonly pupils: THREE.Mesh
  private readonly lids: THREE.Mesh[]
  private readonly mouth: THREE.Mesh

  constructor(material: THREE.Material) {
    const green: Rgb = [0.3, 0.6, 0.42], belly: Rgb = [0.78, 0.86, 0.5], fin: Rgb = [0.2, 0.44, 0.4]
    this.group.name = 'eel'
    this.group.userData.jamObject = 'eel'
    this.group.scale.setScalar(1.25)
    this.group.rotation.order = 'YXZ'
    const head = new Lumps()
    head.ball(1, belly, { scale: [0.36, 0.31, 0.58], top: green }, 18)
    head.rod(0.27, 1.3, green, { at: [0, -0.02, -0.95], turn: [Math.PI / 2, 0, 0] }, 12)
    head.cone(0.1, 0.5, fin, { at: [0, 0.3, -0.25], turn: [-0.9, 0, 0], scale: [0.4, 1, 1] })
    for (const side of [-1, 1]) head.ball(0.15, WHITE, { at: [side * 0.19, 0.2, 0.26] }, 12)
    mesh('eel-head', head.build(), material, this.group)
    const pupils = new Lumps()
    for (const side of [-1, 1]) pupils.ball(0.075, BLACK, { at: [side * 0.19, 0.2, 0.38] }, 10)
    this.pupils = mesh('eel-pupils', pupils.build(), material, this.group)
    this.lids = [-1, 1].map((side) => mesh(`eel-lid-${side < 0 ? 'left' : 'right'}`, new Lumps().ball(0.165, green, { at: [side * 0.19, 0.2, 0.27] }, 12).build(), material, this.group))
    this.mouth = mesh('eel-mouth', new Lumps().ball(1, DARK, {}, 10).build(), material, this.group)
    this.mouth.position.set(0, -0.08, 0.53)
  }

  update(folk: Folk): void {
    const eel = folk.eel
    // Its head is where the game puts it: threading its rock, or in a groove, facing the way it goes.
    const push = eel.nose * EEL_NOSE
    // All the way inside its rock, or all the way under the water, it is not drawn at all.
    this.group.visible = eelShown(eel)
    this.group.position.set(eel.x + Math.sin(eel.yaw) * push, eel.y, eel.z + Math.cos(eel.yaw) * push)
    this.group.rotation.set(eel.pitch, eel.yaw, 0)
    this.pupils.position.set(eel.lookAcross * 0.055, eel.lookUp * 0.045, 0)
    this.lids[0].visible = eel.shut[0] > 0.5
    this.lids[1].visible = eel.shut[1] > 0.5
    this.mouth.scale.set(0.2, 0.025 + eel.mouth * 0.16, 0.08)
  }
}

/** A gull's duck: how far its head goes down and forward, and how far it nods. */
const DUCK = { down: 0.3, forward: 0.3, nod: 0.25 } as const

class GullView {
  readonly group = new THREE.Group()
  private readonly body: THREE.Mesh
  private readonly head = new THREE.Group()
  private readonly jaw: THREE.Mesh
  private readonly wings: THREE.Mesh[]

  constructor(index: number, material: THREE.Material) {
    const grey: Rgb = [0.62, 0.64, 0.72], yellow: Rgb = [1.0, 0.72, 0.16], beak: Rgb = [1.0, 0.55, 0.12]
    this.group.name = `gull-${index}`
    this.group.userData.jamObject = `gull-${index}`
    const body = new Lumps().ball(1, WHITE, { at: [0, 0.62, 0], scale: [0.32, 0.36, 0.4] }, 16)
    body.cone(0.16, 0.5, grey, { at: [0, 0.62, -0.42], turn: [-1.25, 0, 0], scale: [1, 1, 0.5] })
    for (const side of [-1, 1]) {
      body.rod(0.03, 0.28, yellow, { at: [side * 0.12, 0.16, 0.02] })
      body.ball(0.1, yellow, { at: [side * 0.12, 0.03, 0.08], scale: [1, 0.3, 1.5] }, 8)
    }
    this.body = mesh(`gull-${index}-body`, body.build(), material, this.group)
    this.group.add(this.head)
    this.head.position.set(0, 1.08, 0.12)
    const head = new Lumps().ball(0.22, WHITE, {}, 14)
    head.cone(0.085, 0.32, beak, { at: [0, 0.0, 0.3], turn: [Math.PI / 2, 0, 0] })
    for (const side of [-1, 1]) {
      head.ball(0.075, WHITE, { at: [side * 0.11, 0.07, 0.16] }, 10)
      head.ball(0.042, BLACK, { at: [side * 0.115, 0.07, 0.225] }, 8)
    }
    mesh(`gull-${index}-head`, head.build(), material, this.head)
    this.jaw = mesh(`gull-${index}-jaw`, new Lumps().cone(0.065, 0.26, yellow, { at: [0, 0, 0.13], turn: [Math.PI / 2, 0, 0] }).build(), material, this.head)
    this.jaw.position.set(0, -0.045, 0.15)
    this.wings = [-1, 1].map((side) => {
      const wing = new Lumps().ball(1, grey, { at: [0, -0.26, 0], scale: [0.07, 0.3, 0.3] }, 10).build()
      const made = mesh(`gull-${index}-wing-${side < 0 ? 'left' : 'right'}`, wing, material, this.group)
      made.position.set(side * 0.31, 0.86, -0.02)
      return made
    })
  }

  update(folk: Folk, index: number): void {
    const bird = folk.gulls.birds[index]
    // No two the same size, so the row reads as three birds and never as a count.
    const size = GULL_SIZES[index]
    this.group.position.set(bird.x, bird.y + bird.hop, bird.z)
    this.group.rotation.set(bird.pitch, 0, bird.lean)
    this.group.scale.set(size * (1 + bird.squash * 0.2), size * (1 - bird.squash * 0.28 - bird.duck * 0.12), size * (1 + bird.squash * 0.2))
    this.head.rotation.y = bird.head
    // Ducking, it stretches its neck forward and low: its head goes down in front of its breast, never into it,
    // so its beak is clear of its own body however far it ducks.
    this.head.rotation.x = bird.duck * DUCK.nod - bird.beak * 0.35
    this.head.position.set(0, 1.08 - bird.duck * DUCK.down, 0.12 + bird.duck * DUCK.forward)
    this.jaw.rotation.x = bird.beak * 0.6
    for (let i = 0; i < 2; i++) {
      const side = i === 0 ? -1 : 1
      this.wings[i].rotation.z = side * bird.wings[i] * 1.85
      this.wings[i].scale.y = 1 + bird.wings[i] * 0.9
    }
    this.body.scale.y = 1
  }
}

/** One of the bored small crabs: a body, two claws and two eyes on stalks, all one lump. */
class SmallCrabView {
  readonly mesh: THREE.Mesh

  constructor(index: number, material: THREE.Material) {
    const shell: Rgb = index === 1 ? [0.95, 0.5, 0.3] : [0.86, 0.34, 0.26], pale: Rgb = [0.99, 0.66, 0.46]
    const crab = new Lumps().ball(1, shell, { at: [0, 0.42, 0], scale: [0.8, 0.4, 0.56], top: pale }, 14)
    for (const side of [-1, 1]) {
      crab.ball(0.26, shell, { at: [side * 0.86, 0.5, 0.36], scale: [1, 0.8, 0.7], top: pale }, 10)
      crab.rod(0.07, 0.36, shell, { at: [side * 0.86, 0.26, -0.1], turn: [0, 0, side * -0.9] }, 6)
      crab.rod(0.05, 0.3, shell, { at: [side * 0.26, 0.86, 0.16] }, 6)
      crab.ball(0.17, WHITE, { at: [side * 0.26, 1.08, 0.16] }, 10)
      crab.ball(0.085, BLACK, { at: [side * 0.26, 1.1, 0.28] }, 8)
    }
    this.mesh = new THREE.Mesh(crab.build(), material)
    this.mesh.name = `small-crab-${index}`
    this.mesh.userData.jamObject = `small-crab-${index}`
  }

  update(folk: Folk, index: number, ground: number): void {
    const crab = folk.small.crabs[index]
    this.mesh.visible = crab.shown > 0.02
    if (!this.mesh.visible) return
    // It bobs from foot to foot as it goes sideways.
    this.mesh.position.set(crab.x, ground + crab.hop + Math.abs(Math.sin(crab.stride)) * 0.05 * crab.size, crab.z)
    this.mesh.rotation.z = Math.sin(crab.stride) * 0.12
    this.mesh.scale.setScalar(crab.size)
  }
}

export class FolkView {
  readonly group = new THREE.Group()
  private readonly crab: CrabView
  private readonly starfish: StarfishView
  private readonly eel: EelView
  private readonly gulls: GullView[]
  private readonly small: SmallCrabView[]

  constructor(material: THREE.Material) {
    this.crab = new CrabView(material)
    this.starfish = new StarfishView(material)
    this.eel = new EelView(material)
    this.gulls = [0, 1, 2].map((index) => new GullView(index, material))
    this.small = [0, 1, 2].map((index) => new SmallCrabView(index, material))
    this.group.add(this.crab.group, this.starfish.group, this.eel.group, ...this.gulls.map((gull) => gull.group), ...this.small.map((crab) => crab.mesh))
  }

  update(folk: Folk, groundAt: (x: number, z: number) => number): void {
    this.crab.update(folk, folk.crab.floor)
    this.starfish.update(folk)
    this.eel.update(folk)
    this.gulls.forEach((gull, index) => gull.update(folk, index))
    this.small.forEach((crab, index) => crab.update(folk, index, groundAt(folk.small.crabs[index].x, folk.small.crabs[index].z)))
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose()
    })
  }
}
