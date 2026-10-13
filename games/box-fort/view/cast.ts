import * as THREE from 'three'
import { BABY, BABY_SCALE, GRAN, type Vec } from '../layout'
import { BABY_LAYERS, HUNCH, seatOf, type BabyDraw, type CatDraw, type GranDraw } from '../people'
import { Board, MARKER, oval, rect, rgb, type Outline, type PanelLook, type Place } from './board'
import type { Kit } from './material'

// The cat, the baby and the grandmother, each cut from painted board in a
// few flat parts that slot together. A part is one mesh; what people.ts says
// of each part is laid on it here and nothing is decided. Faces are fat marker:
// eyes whose pupils follow the scissors, brows, and mouths cut as a few
// shapes that are swapped.

const GINGER = rgb(0xe8873a), GINGER_DARK = rgb(0xc96a22), CREAM = rgb(0xf6e6cf), PINK = rgb(0xe89aa8), CAT_EYE = rgb(0xdfe77a)
const MUSTARD = rgb(0xe9b83c), SKIN = rgb(0xf0c3a0), SKIN_DARK = rgb(0xdfa685), WHITE = rgb(0xf4f0e8), MOUTH = rgb(0x8a2f2a), TONGUE = rgb(0xe8707a)
const PLUM = rgb(0x7d4a78), STEEL = rgb(0xcfd6da), LENS = rgb(0xe6f0f2), SCARF = rgb(0x5fa39a), BAG = rgb(0x4a7fd0), BAG_DARK = rgb(0x2f5ea8), TAPE = rgb(0xe6d6ab)

type Part = readonly [Outline, PanelLook, Place?]

class Maker {
  readonly made: THREE.BufferGeometry[] = []
  constructor(readonly kit: Kit) {}

  /** One mesh of several pieces of board, added to `parent`. */
  mesh(parent: THREE.Object3D, name: string, parts: readonly Part[], material: THREE.Material = this.kit.board): THREE.Mesh {
    const board = new Board()
    for (const [outline, look, place] of parts) board.panel(outline, look, place)
    const geometry = board.geometry()
    this.made.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name
    parent.add(mesh)
    return mesh
  }

  group(parent: THREE.Object3D, name: string): THREE.Group {
    const group = new THREE.Group()
    group.name = name
    parent.add(group)
    return group
  }
}

const thin = (front: PanelLook['front']): PanelLook => ({ front, back: front, t: 0.012 })
const show = (meshes: readonly THREE.Mesh[], which: number): void => { meshes.forEach((mesh, i) => { mesh.visible = i === which }) }
/** A mouth as the lower half of an oval: a smile. */
const smile = (w: number, h: number): Outline => [[-w / 2, 0], ...Array.from({ length: 9 }, (_, i): [number, number] => { const a = Math.PI + (i / 8) * Math.PI; return [Math.cos(a) * w / 2, Math.sin(a) * h] })]

/** A strap in an arch, standing on y = 0: the handle of a bag. */
const arch = (w: number, h: number, thick: number): Outline => [
  ...Array.from({ length: 9 }, (_, i): [number, number] => { const a = (i / 8) * Math.PI; return [Math.cos(a) * w / 2, Math.sin(a) * h] }),
  ...Array.from({ length: 9 }, (_, i): [number, number] => { const a = Math.PI - (i / 8) * Math.PI; return [Math.cos(a) * (w / 2 - thick), Math.sin(a) * (h - thick)] }),
]

/** Where the pupils go: towards `target` from a head at `head`, at most `reach` from the middle of the eye. */
function gaze(pupils: THREE.Object3D, head: THREE.Vector3, target: Vec, reach: number): void {
  const dx = target.x - head.x, dy = target.y - head.y, far = Math.hypot(dx, dy) || 1, pull = Math.min(1, far / 0.6) * reach
  pupils.position.x = (dx / far) * pull
  pupils.position.y = (dy / far) * pull
}

// --- The cat ----------------------------------------------------------------

export class CatView {
  readonly root: THREE.Group
  private readonly sit: THREE.Group
  private readonly tail: THREE.Mesh
  private readonly paw: THREE.Mesh
  private readonly legs: THREE.Mesh[]
  private readonly strip: THREE.Mesh
  private readonly head: THREE.Group
  private readonly ears: THREE.Mesh
  private readonly eyes: THREE.Mesh
  private readonly pupils: THREE.Mesh
  private readonly mouths: THREE.Mesh[]
  private readonly reach: THREE.Mesh
  private readonly shine: THREE.ShaderMaterial
  private readonly at = new THREE.Vector3()

  constructor(make: Maker, parent: THREE.Object3D) {
    this.root = make.group(parent, 'cat')
    this.sit = make.group(this.root, 'cat-sit')
    const arc: [number, number][] = []
    for (let i = 0; i <= 12; i++) { const a = -1.5 + (i / 12) * 3.3; arc.push([0.02 + Math.cos(a) * 0.3, 0.3 + Math.sin(a) * 0.3]) }
    for (let i = 12; i >= 0; i--) { const a = -1.5 + (i / 12) * 3.3; arc.push([0.02 + Math.cos(a) * 0.2, 0.3 + Math.sin(a) * 0.2]) }
    this.tail = make.mesh(this.sit, 'cat-tail', [[arc, { front: GINGER, back: GINGER, rim: 0.015 }]])
    this.tail.position.set(0.24, 0.02, -0.04)
    // Its back legs, which only show when it is stuck in a hole and pedals.
    this.legs = [-1, 1].map((side) => {
      const leg = make.mesh(this.sit, `cat-leg-${side < 0 ? 'left' : 'right'}`, [[oval(0.15, 0.4, 14, 0, -0.16, 3), { front: GINGER, back: GINGER, rim: 0.015 }], [oval(0.15, 0.12, 10, 0, -0.33), thin(CREAM), { at: [0, 0, 0.022] }]])
      leg.position.set(side * 0.17, 0.2, 0.05)
      return leg
    })
    make.mesh(this.sit, 'cat-body', [
      [oval(0.64, 0.7, 24, 0, 0.35, 2.6), { front: GINGER, rim: 0.03 }],
      [oval(0.3, 0.4, 16, 0, 0.3), thin(CREAM), { at: [0, 0, 0.03] }],
      [oval(0.17, 0.12, 12, 0.13, 0.06), thin(CREAM), { at: [0, 0, 0.05] }],
    ])
    this.paw = make.mesh(this.sit, 'cat-paw', [[oval(0.17, 0.12, 12), thin(CREAM)]])
    // A strip of tape stuck to the paw.
    this.strip = make.mesh(this.paw, 'cat-strip', [[[[-0.04, 0], [0.05, 0.01], [0.09, -0.3], [0.0, -0.32]], { front: TAPE, back: TAPE, t: 0.008 }, { at: [0, 0, 0.02] }]])
    this.head = make.group(this.root, 'cat-head')
    this.ears = make.mesh(this.head, 'cat-ears', [
      [[[-0.25, 0], [-0.06, 0.06], [-0.2, 0.3]], { front: GINGER, rim: 0.02 }],
      [[[0.25, 0], [0.2, 0.3], [0.06, 0.06]], { front: GINGER, rim: 0.02 }],
      [[[-0.2, 0.06], [-0.11, 0.08], [-0.185, 0.22]], thin(PINK), { at: [0, 0, 0.028] }],
      [[[0.2, 0.06], [0.185, 0.22], [0.11, 0.08]], thin(PINK), { at: [0, 0, 0.028] }],
    ])
    // Behind the face by more than a board, so that an ear laid flat or turned never lies in the face.
    this.ears.position.set(0, 0.12, -0.056)
    make.mesh(this.head, 'cat-face', [
      [oval(0.54, 0.46, 24, 0, 0, 2.4), { front: GINGER, rim: 0.03 }],
      [oval(0.28, 0.19, 14, 0, -0.1), thin(CREAM), { at: [0, 0, 0.022] }],
      [[[-0.03, -0.035], [0.03, -0.035], [0, -0.07]], thin(PINK), { at: [0, 0, 0.03] }],
      ...[-1, 0, 1].map((i): Part => [rect(0.03, 0.09), thin(GINGER_DARK), { at: [i * 0.06, 0.17 + (i === 0 ? 0.012 : 0), 0.022], rz: i * -0.3 }]),
      ...[[-1, 0.12], [-1, -0.1], [1, 0.12], [1, -0.1]].map(([side, turn]): Part => [rect(0.2, 0.012), thin(MARKER), { at: [side * 0.21, -0.09 + turn * 0.2, 0.03], rz: side * turn }]),
    ])
    // Its eyes shine once the room is dark.
    this.shine = make.kit.lit()
    this.eyes = make.mesh(this.head, 'cat-eyes', [[oval(0.15, 0.16, 14, -0.115), { ...thin(CAT_EYE), glow: 2 }], [oval(0.15, 0.16, 14, 0.115), { ...thin(CAT_EYE), glow: 2 }]], this.shine)
    this.eyes.position.set(0, 0.045, 0.03)
    this.pupils = make.mesh(this.eyes, 'cat-pupils', [[oval(0.07, 0.13, 12, -0.115), thin(MARKER)], [oval(0.07, 0.13, 12, 0.115), thin(MARKER)]])
    this.pupils.position.z = 0.012
    this.mouths = [
      make.mesh(this.head, 'cat-mouth-shut', [[[[-0.035, -0.103], [0.035, -0.103], [0, -0.122]], thin(MARKER), { at: [0, 0, 0.035] }]]),
      make.mesh(this.head, 'cat-mouth-mew', [[oval(0.09, 0.1, 12, 0, -0.125), thin(MOUTH), { at: [0, 0, 0.035] }], [oval(0.05, 0.04, 8, 0, -0.15), thin(TONGUE), { at: [0, 0, 0.045] }]]),
      make.mesh(this.head, 'cat-mouth-yawn', [[oval(0.17, 0.2, 14, 0, -0.14), thin(MOUTH), { at: [0, 0, 0.035] }], [oval(0.09, 0.07, 10, 0, -0.2), thin(TONGUE), { at: [0, 0, 0.045] }]]),
    ]
    this.reach = make.mesh(this.root, 'cat-reach', [[oval(0.13, 0.44, 14, 0, -0.2, 3), { front: GINGER, back: GINGER, rim: 0.015 }], [oval(0.15, 0.13, 12, 0, -0.38), thin(CREAM), { at: [0, 0, 0.022] }]])
  }

  pose(draw: CatDraw): void {
    const { sit, head } = this, { body } = draw
    sit.visible = body.show
    sit.position.set(body.x, body.y, body.z)
    sit.scale.set(body.sx, body.sy, 1)
    sit.rotation.z = body.rz
    this.tail.rotation.z = draw.tail
    this.paw.position.set(-0.13 - draw.paw * 0.03, 0.06 + draw.paw * 0.62, 0.06 + draw.paw * 0.04)
    this.paw.rotation.z = -draw.paw * 0.9
    this.strip.visible = draw.strip
    this.strip.rotation.z = Math.sin(draw.paw * 9) * 0.5
    this.legs.forEach((leg, i) => { leg.visible = draw.legs.show; leg.rotation.z = (i ? 1 : -1) * (0.5 + draw.legs.pedal * 0.6) })
    head.visible = draw.head.show
    head.position.set(draw.head.x, draw.head.y, draw.head.z)
    head.rotation.z = draw.head.rz
    this.ears.scale.y = draw.ears
    this.ears.rotation.z = draw.earTurn
    this.eyes.scale.y = 1 - draw.blink * 0.92
    this.pupils.scale.x = draw.dilate
    this.shine.uniforms.lit.value = draw.shine
    gaze(this.pupils, head.getWorldPosition(this.at), draw.look, 0.03)
    show(this.mouths, draw.mouth)
    this.reach.visible = draw.reach.show
    this.reach.position.set(draw.reach.x, draw.reach.y, draw.reach.z)
    this.reach.scale.setScalar(draw.reach.scale)
    this.reach.rotation.z = draw.reach.rot
  }
}

// --- The baby ---------------------------------------------------------------

export class BabyView {
  readonly root: THREE.Group
  private readonly body: THREE.Mesh
  private readonly legs: THREE.Mesh
  private readonly armL: THREE.Mesh
  private readonly armR: THREE.Mesh
  private readonly head: THREE.Group
  private readonly eyes: THREE.Mesh
  private readonly pupils: THREE.Mesh
  private readonly mouths: THREE.Mesh[]
  private readonly at = new THREE.Vector3()

  constructor(make: Maker, parent: THREE.Object3D) {
    this.root = make.group(parent, 'baby')
    this.root.scale.setScalar(BABY_SCALE)
    const arm = (side: number): Part[] => [[oval(0.17, 0.44, 14, 0, -0.18, 3), { front: MUSTARD, rim: 0.02 }], [oval(0.15, 0.15, 12, side * 0.01, -0.4), thin(SKIN), { at: [0, 0, 0.022] }]]
    // The arm away from the fort holds the rattle up; the rattle itself is one of the toys (things.ts).
    this.armL = make.mesh(this.root, 'baby-arm-left', arm(-1))
    // Each part of the baby is its own layer: body, the arm that posts, legs, head, and in front of them all the arm with the rattle.
    this.armL.position.set(-0.34, 0.6, BABY_LAYERS.rattleArm)
    this.body = make.mesh(this.root, 'baby-body', [[oval(0.8, 0.72, 24, 0, 0.37, 2.8), { front: MUSTARD, rim: 0.035 }], [oval(0.32, 0.22, 14, 0, 0.44), thin(WHITE), { at: [0, 0, 0.025] }]])
    this.legs = make.mesh(this.root, 'baby-legs', [-1, 1].flatMap((side): Part[] => [[oval(0.27, 0.34, 14, side * 0.25, 0.13, 2.6), { front: MUSTARD, rim: 0.02 }, { at: [0, 0, BABY_LAYERS.legs] }], [oval(0.2, 0.25, 12, side * 0.27, 0.1), thin(SKIN), { at: [0, 0, BABY_LAYERS.legs + 0.026] }]]))
    this.armR = make.mesh(this.root, 'baby-arm-right', arm(1))
    this.armR.position.set(0.34, 0.6, BABY_LAYERS.arm)
    this.head = make.group(this.root, 'baby-head')
    make.mesh(this.head, 'baby-face', [
      [oval(0.12, 0.14, 10, -0.31, -0.02), thin(SKIN_DARK), { at: [0, 0, -0.02] }], [oval(0.12, 0.14, 10, 0.31, -0.02), thin(SKIN_DARK), { at: [0, 0, -0.02] }],
      [oval(0.64, 0.6, 26, 0, 0, 2.3), { front: SKIN, rim: 0.03 }],
      [oval(0.13, 0.09, 10, -0.2, -0.09), thin(PINK), { at: [0, 0, 0.022] }], [oval(0.13, 0.09, 10, 0.2, -0.09), thin(PINK), { at: [0, 0, 0.022] }],
      // One curl of hair, cut as a leaf.
      [[[-0.02, 0.24], [0.05, 0.25], [0.12, 0.33], [0.04, 0.37], [-0.03, 0.31]], thin(MARKER), { at: [0, 0, 0.022] }],
    ])
    this.eyes = make.mesh(this.head, 'baby-eyes', [[oval(0.15, 0.17, 14, -0.125), thin(WHITE)], [oval(0.15, 0.17, 14, 0.125), thin(WHITE)]])
    this.eyes.position.set(0, 0.03, 0.03)
    this.pupils = make.mesh(this.eyes, 'baby-pupils', [[oval(0.08, 0.09, 12, -0.125), thin(MARKER)], [oval(0.08, 0.09, 12, 0.125), thin(MARKER)]])
    this.pupils.position.z = 0.012
    this.mouths = [
      make.mesh(this.head, 'baby-mouth-smile', [[smile(0.18, 0.08), thin(MOUTH), { at: [0, -0.12, 0.03] }]]),
      make.mesh(this.head, 'baby-mouth-open', [[oval(0.17, 0.18, 14, 0, -0.16), thin(MOUTH), { at: [0, 0, 0.03] }], [oval(0.1, 0.07, 10, 0, -0.21), thin(TONGUE), { at: [0, 0, 0.04] }]]),
      make.mesh(this.head, 'baby-mouth-o', [[oval(0.07, 0.08, 10, 0, -0.15), thin(MOUTH), { at: [0, 0, 0.03] }]]),
      make.mesh(this.head, 'baby-mouth-frown', [[smile(0.16, 0.07), thin(MOUTH), { at: [0, -0.2, 0.03], rz: Math.PI }]]),
    ]
  }

  pose(draw: BabyDraw): void {
    this.root.position.set(draw.x, draw.y + draw.bounce, draw.z)
    this.root.rotation.set(0, 0, draw.tilt)
    this.body.visible = draw.body
    this.armL.visible = this.armR.visible = draw.arms
    this.legs.visible = draw.legs
    this.armL.rotation.z = draw.armL
    this.armL.scale.y = draw.armLength
    this.armR.rotation.z = draw.armR
    this.legs.rotation.z = draw.kick * 0.3
    this.legs.position.y = Math.abs(draw.kick) * 0.05
    this.head.visible = draw.head.show
    this.head.position.set(draw.head.dx, BABY.y + draw.head.dy, BABY_LAYERS.head)
    this.head.rotation.z = draw.head.tilt
    this.eyes.scale.y = 1 - draw.blink * 0.92
    gaze(this.pupils, this.head.getWorldPosition(this.at), draw.look, 0.032)
    show(this.mouths, draw.mouth)
  }
}

// --- The grandmother --------------------------------------------------------

/** How far behind her body her skirt hangs when she stands, and how much further behind it lies when she is on her knees. */
export const SKIRT = { behind: 0.045, kneels: 0.06 }

export class GranView {
  readonly root: THREE.Group
  private readonly lap: THREE.Mesh
  private readonly legs: THREE.Mesh
  private readonly out: THREE.Mesh
  private readonly torso: THREE.Group
  private readonly knit: THREE.Group
  private readonly head: THREE.Group
  private readonly glasses: THREE.Mesh
  private readonly pupils: THREE.Mesh
  private readonly brows: THREE.Mesh
  private readonly hands: THREE.Mesh[]
  private readonly mouths: THREE.Mesh[]
  private readonly hat: THREE.Mesh
  /** Her hat when it is left outside a hole her head went into. */
  private readonly left: THREE.Mesh
  private readonly at = new THREE.Vector3()

  constructor(make: Maker, parent: THREE.Object3D) {
    this.root = make.group(parent, 'gran')
    // What stays on the chair: her lap, with her handbag on her knees.
    this.lap = make.mesh(this.root, 'gran-lap', [
      [rect(0.8, 0.5), { front: PLUM, back: PLUM, t: 0.05 }, { at: [0, 0.74, 0.3], rx: -Math.PI / 2 }],
      // Her handbag: a soft round bag, its strap flopped over to one side.
      [oval(0.36, 0.27, 18, 0, 0.135, 2.6), { front: BAG, back: BAG, rim: 0.015, t: 0.08 }, { at: [0.27, 0.775, 0.42] }],
      [arch(0.3, 0.1, 0.03), { front: BAG_DARK, back: BAG_DARK, t: 0.02 }, { at: [0.39, 0.93, 0.42], rz: -1.05 }],
    ])
    // Her skirt hanging from her knees, and her slippers.
    this.legs = make.mesh(this.root, 'gran-legs', [
      [[[-0.44, 0.14], [0.44, 0.14], [0.38, 0.74], [-0.38, 0.74]], { front: PLUM, rim: 0.03 }, { at: [0, 0, 0.56] }],
      [oval(0.22, 0.13, 12, -0.19, 0.07), { front: PINK, rim: 0.015 }, { at: [0, 0, 0.62] }], [oval(0.22, 0.13, 12, 0.19, 0.07), { front: PINK, rim: 0.015 }, { at: [0, 0, 0.62] }],
    ])
    // Sitting on the floor of a box: her legs straight out in front, slippers up.
    this.out = make.mesh(this.root, 'gran-legs-out', [
      [rect(0.7, 0.62), { front: PLUM, back: PLUM, t: 0.05 }, { at: [0, 0.07, 0.42], rx: -Math.PI / 2 }],
      [oval(0.2, 0.26, 12, -0.17, 0.15), { front: PINK, rim: 0.015 }, { at: [0, 0, 0.75] }], [oval(0.2, 0.26, 12, 0.17, 0.15), { front: PINK, rim: 0.015 }, { at: [0, 0, 0.75] }],
    ])
    this.torso = make.group(this.root, 'gran-torso')
    make.mesh(this.torso, 'gran-body', [
      [[[-0.38, 0], [0.38, 0], [0.33, 0.95], [0.12, 1.06], [-0.12, 1.06], [-0.33, 0.95]], { front: PLUM, rim: 0.03 }],
      // Her cardigan is cut a little smaller than the body it lies on, so that no edge of it lies in an edge of the body.
      [[[-0.362, 0.014], [-0.1, 0.014], [-0.06, 0.965], [-0.316, 0.938]], thin(PINK), { at: [0, 0, 0.022] }],
      [[[0.362, 0.014], [0.316, 0.938], [0.06, 0.965], [0.1, 0.014]], thin(PINK), { at: [0, 0, 0.022] }],
      ...[0.3, 0.55, 0.8].map((y): Part => [oval(0.045, 0.045, 8, 0, y), thin(WHITE), { at: [0, 0, 0.025] }]),
    ])
    // Her knitting, held out over her lap: her two hands with the needles, and the scarf that hangs from them, its stripes cut slanting.
    this.knit = make.group(this.torso, 'gran-knitting')
    make.mesh(this.knit, 'gran-scarf', [
      [rect(0.24, 0.62), { front: SCARF, back: SCARF, rim: 0.015, t: 0.02 }, { at: [-0.04, 0.08, 0.58] }],
      ...[-0.12, 0.08, 0.28].map((y, i): Part => [rect(0.2, 0.05), thin(WHITE), { at: [-0.04, y, 0.6], rz: i % 2 ? -0.22 : 0.2 }]),
    ])
    this.hands = [-1, 1].map((side) => {
      const hand = make.mesh(this.knit, `gran-hand-${side < 0 ? 'left' : 'right'}`, [
        [rect(0.02, 0.62), { front: STEEL, back: STEEL, t: 0.012 }, { at: [0, 0.12, 0.03] }],
        [oval(0.17, 0.5, 14, side * 0.06, 0.2, 3), { front: PINK, rim: 0.02 }, { rz: side * 0.5 }],
        [oval(0.15, 0.14, 12), thin(SKIN), { at: [0, 0, 0.022] }],
      ])
      // One hand a little in front of the other, so the needles cross without lying in each other.
      hand.position.set(side * 0.13, 0.36, side < 0 ? 0.42 : 0.485)
      return hand
    })
    this.head = make.group(this.torso, 'gran-head')
    make.mesh(this.head, 'gran-face', [
      [oval(0.3, 0.24, 14, 0, 0.36), { front: WHITE, rim: 0.015 }, { at: [0, 0, -0.03] }],
      [oval(0.52, 0.58, 24, 0, 0, 2.3), { front: SKIN, rim: 0.03 }],
      [oval(0.56, 0.3, 20, 0, 0.2, 2.4), thin(WHITE), { at: [0, 0, 0.022] }],
      [oval(0.12, 0.08, 10, -0.17, -0.11), thin(PINK), { at: [0, 0, 0.022] }], [oval(0.12, 0.08, 10, 0.17, -0.11), thin(PINK), { at: [0, 0, 0.022] }],
      [oval(0.07, 0.09, 10, 0, -0.06), thin(SKIN_DARK), { at: [0, 0, 0.03] }],
    ])
    this.glasses = make.mesh(this.head, 'gran-glasses', [
      [oval(0.22, 0.2, 16, -0.12), thin(MARKER)], [oval(0.22, 0.2, 16, 0.12), thin(MARKER)], [rect(0.014, 0.02), thin(MARKER)],
      [oval(0.17, 0.15, 16, -0.12), thin(LENS), { at: [0, 0, 0.012] }], [oval(0.17, 0.15, 16, 0.12), thin(LENS), { at: [0, 0, 0.012] }],
    ])
    this.pupils = make.mesh(this.head, 'gran-pupils', [[oval(0.06, 0.07, 10, -0.12), thin(MARKER)], [oval(0.06, 0.07, 10, 0.12), thin(MARKER)]])
    this.brows = make.mesh(this.head, 'gran-brows', [[rect(0.15, 0.028), thin(WHITE), { at: [-0.12, 0, 0], rz: 0.12 }], [rect(0.15, 0.028), thin(WHITE), { at: [0.12, 0, 0], rz: -0.12 }]])
    this.mouths = [
      make.mesh(this.head, 'gran-mouth-smile', [[smile(0.15, 0.04), thin(MOUTH), { at: [0, -0.17, 0.03] }]]),
      make.mesh(this.head, 'gran-mouth-o', [[oval(0.08, 0.1, 10, 0, -0.19), thin(MOUTH), { at: [0, 0, 0.03] }]]),
      make.mesh(this.head, 'gran-mouth-hum', [[oval(0.11, 0.045, 10, 0, -0.18), thin(MOUTH), { at: [0, 0, 0.03] }]]),
    ]
    // Her hat: a small plum pot with a flower, pinned to her bun.
    const hat: Part[] = [[oval(0.36, 0.2, 16, 0, 0.08, 3), { front: PLUM, back: PLUM, rim: 0.02 }], [oval(0.5, 0.07, 14, 0, 0), { front: PLUM, back: PLUM, t: 0.03 }], [oval(0.1, 0.1, 8, 0.12, 0.1), thin(MUSTARD), { at: [0, 0, 0.022] }]]
    this.hat = make.mesh(this.head, 'gran-hat', hat)
    this.hat.position.set(0.02, 0.44, 0.032)
    this.hat.rotation.z = -0.1
    this.left = make.mesh(parent, 'gran-hat-left', hat)
  }

  pose(draw: GranDraw): void {
    // Her lap is there only once she is sat right down: while she sits down or gets up her skirt swings through where it lies.
    const sitting = draw.seated > 0.995 && draw.sunk < 0.5, seat = seatOf(draw)
    this.root.position.set(draw.x, draw.y, draw.z)
    // In her chair she is turned a little to the fort; on her feet, to where she walks.
    this.root.rotation.y = -0.28 * draw.seated * (1 - draw.sunk) + draw.turn
    this.root.scale.setScalar(draw.scale)
    this.lap.visible = sitting
    this.legs.visible = draw.sunk < 0.5
    // Standing, her skirt hangs straight down from her middle.
    // Standing, it hangs a little behind her body, never in its plane; on her knees, where it is as high as her middle, it lies well behind.
    this.legs.position.z = (-0.48 - SKIRT.behind - SKIRT.kneels * Math.min(1, Math.max(0, (0.3 * 0.74 - seat) / 0.05))) * (1 - draw.seated)
    this.legs.scale.y = Math.max(0.3, seat / 0.74)
    this.out.visible = draw.sunk >= 0.5
    this.torso.position.set(0, seat, 0.08)
    this.torso.rotation.x = draw.lean
    this.torso.scale.y = 1 - (1 - HUNCH.short) * draw.hunch
    // On her knees, bent over forwards or bobbing down under a box she gathers her knitting up against her chest, so that it neither swings out in front of her nor trails on the floor.
    const gathered = Math.min(1, Math.max(0, -draw.lean / 0.6, draw.hunch * 2, draw.gathers))
    this.knit.scale.z = 1 - 0.85 * gathered
    this.knit.position.y = 0.45 * gathered
    this.head.visible = draw.headShow
    this.head.rotation.x = draw.headNod
    this.head.rotation.z = draw.headTilt
    this.head.position.set(0, GRAN.y - 0.74 - draw.headNod * 0.12, 0.04)
    this.glasses.position.set(0, 0.03 + draw.glasses, 0.046)
    this.glasses.rotation.z = draw.glasses * 0.8
    this.pupils.scale.y = 1 - draw.blink * 0.9
    this.pupils.position.z = 0.076
    gaze(this.pupils, this.head.getWorldPosition(this.at), draw.look, 0.03)
    this.pupils.position.y += 0.03
    this.brows.position.set(0, 0.17 + draw.brow * 0.06, 0.092)
    this.hands[0].rotation.z = -0.75 + draw.needleL
    this.hands[1].rotation.z = 0.75 + draw.needleR
    show(this.mouths, draw.mouth)
    this.hat.visible = !draw.hat.show
    this.left.visible = draw.hat.show
    this.left.position.set(draw.hat.x, draw.hat.y, draw.hat.z)
    this.left.rotation.z = 0.5
  }
}

export type Cast = { cat: CatView; baby: BabyView; gran: GranView; dispose(): void }

export function makeCast(kit: Kit, parent: THREE.Object3D): Cast {
  const make = new Maker(kit)
  return { cat: new CatView(make, parent), baby: new BabyView(make, parent), gran: new GranView(make, parent), dispose: () => { for (const geometry of make.made) geometry.dispose() } }
}
