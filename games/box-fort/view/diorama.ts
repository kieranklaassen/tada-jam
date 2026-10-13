import * as THREE from 'three'
import type { Tier } from '../config'
import { POKE, goneShare, labels } from '../face'
import { TAB_OUT, highest, rects, seamOf, tapeEnd, wornBox } from '../fort'
import { MAX_TAPES, ON_HEAP } from '../fortState'
import type { Guidance } from '../guidance'
import { demoHand, windowAt, type DemoHand, type HandAt } from '../guide'
import { BABY_HOME, BABY_SCALE, BOARD, BOX_COUNT, CELL, CUSHIONS, CUSHION_HALF, FLAP, FOLDED, FRONT_Z, SCISSORS_REST, SCISSORS_TURN, SWITCH, kindOf, type Vec } from '../layout'
import { babyDraw, catDraw, granDraw, handOf, rattleAt } from '../people'
import { BULBS, CLOTH_POINTS, CUSHION_TOP, PIECE_OUT, pieceRest } from '../rest'
import { flapShows, rollAt } from '../targets'
import { CURL_S, DISC_ROLL, HOME_S, MAX_PATH, PIECE_FALL, SWEPT_S, type Piece, type Toy } from '../toy'
import { Batch, Blobs, Ribbon } from './batch'
import { Board, FLUTE, HAIR, INSIDE, KRAFT, MARKER, oval, rect, rgb, type Outline, type Rgb } from './board'
import { makeCast, type Cast } from './cast'
import { HOLE_MOST, HOLE_STEP, makeKit, type Kit } from './material'
import { makeRoom, type Room } from './room'

// The cardboard model of the room, with everything in it: the room itself,
// the boxes with their cut faces, what the fort is built with, the scissors
// and the three who use it. It lays the toy on the board at the toy's own
// clock and decides nothing, and it holds no renderer, so a test can build
// it and count what it would draw.

const RED = rgb(0xd8402f), STEEL = rgb(0xcfd6da), HAND = rgb(0xfff7e6), TAPE = rgb(0xe6d6ab), BLANKET = rgb(0xc8463c), SEAM = rgb(0xb58a55)
const CUSHION_PAINTS = [rgb(0xf0d98a), rgb(0xe8806a), rgb(0x9cc7a0)]
const BULB_PAINTS = [rgb(0xe8574a), rgb(0xf2c84b), rgb(0x67b96f), rgb(0x5b8fd0)]
const RATTLE = rgb(0x4a7fd0), BALL = rgb(0xe8574a), BALL_SHINE = rgb(0xf4a79c), BLOCK = rgb(0x67b96f), BLOCK_DARK = rgb(0x4f9a58), WHITE = rgb(0xf4f0e8), MUSTARD = rgb(0xe9b83c)

/** A wobble that dies away, for a thing that was knocked `age` seconds ago. */
const ring = (age: number, hertz: number, fade: number): number => (age < 0 || age > 2 ? 0 : Math.sin(age * hertz * Math.PI * 2) * Math.exp(-age * fade))
const ease = (t: number): number => { const c = Math.min(1, Math.max(0, t)); return c * c * (3 - 2 * c) }
const mix = (a: number, b: number, t: number): number => a + (b - a) * t
const clamp01 = (t: number): number => Math.min(1, Math.max(0, t))
/** How deep a box lying on its side is drawn: never so deep that it reaches the sofa. */
const TUNNEL_DEPTH = 1.5
/** How far each bulb lies in front of the one before it along the string. */
const BULB_STEP = 0.004

type BoxView = {
  id: number
  group: THREE.Group
  shell: THREE.Mesh
  face: THREE.Mesh
  /** The top of the box: its own piece of board, so that a box the grandmother wears is open for her to stand up through. */
  top: THREE.Mesh
  flap: THREE.Mesh
  tunnel: THREE.Mesh
  spill: THREE.Mesh
  grid: THREE.DataTexture
  light: THREE.ShaderMaterial
  spilt: THREE.ShaderMaterial
  /** Whether its face has a hole. */
  holed: boolean
  geometries: THREE.BufferGeometry[]
}
type PieceView = { key: number; pivot: THREE.Group; mesh: THREE.Mesh; geometry: THREE.BufferGeometry; /** Where its lower edge left the board, and how tall it is. */ x: number; rise: number; tall: number; /** How small it lies on the rug. */ small: number }
/** Where a swept piece turns off the strip of rug in front of the boxes, and how far in under the sofa it slides. */
const SWEPT = { x: -2.6, z: -1.9, skim: 0.1, lies: 0.05 }
/** How high a fallen piece lies above the rug's level, and how far it tips to lie: not quite flat, so that it is in no plane the rug or another piece is in. */
/** How many points the strip of tape in the hand is drawn through: enough for it to curl. */
const STRIP_POINTS = 12
/** The lowest the middle of the tape strip is drawn: half its width and a little above the rug. */
const STRIP_LOW = 0.14
/** How far in front of the faces the pulled strip runs, in front of a head that looks out of a hole, and how much further out it is at the roll's end than at the finger's, so that where it doubles back it never lies in itself. */
export const STRIP_OUT = 0.22, STRIP_SLOPE = 0.08
/** How far in front of the faces the scissors are held while they cut and while they wait in the air. */
const BLADES_OUT = 0.1
/** How far a cushion that stands leans back, and for how much of its fall onto the sofa it slides down along that lean: from higher up it would be in the back of the sofa. */
export const CUSHION_LEAN = 0.16, SOFA_SLIDE = 0.55
/** How much shorter from front to back a cushion is drawn when it lies flat: it lies in front of the scissors that cut the face behind it, and short of where the grandmother walks. */
const FLOOR_SQUASH = 0.6
/** How long the scissors are from their tips to the ends of their handles as drawn, and the lowest any part of them is held off the rug when a finger holds them. */
const SCISSORS_LONG = 0.85, SCISSORS_LOW = 0.05
/** The block beside a baby that flops onto a cushion: how far the baby rises onto the cushion, which the block does not, and how far to the front and towards the baby the cushion nudges it as it lands beside it, clear of the cushion and of the tape roll. */
export const FLOP = { up: 0.3, front: 0.12, aside: 0.16 }
/** The furthest out from the faces the block is pushed beside the baby once the baby has left its place: short of where the roll stands and the scissors lie when no finger holds them. */
export const BLOCK_FRONT = SCISSORS_REST.z - 0.17
/** How long a fallen piece takes to slide out of someone's way. */
const PIECE_SLIDES = 0.25
/** Whoever is at the faces and within `reach` of the scissors has them `out` in front of where they are; `deep` is how far in front of the faces someone still counts as at them. */
const NEAR = { reach: 1.3, out: 0.45, deep: 0.5 }
/** How long the scrap a second finger flicks up is in the air. */
const DAB_S = 0.4
const PIECE_LIES = 0.07, FLAT = Math.PI / 2 - 0.04
/** How far apart two pieces that lie on each other are, and how far a piece lifts as it rocks, so that no edge of it dips under where it lies. */
const PIECE_GAP = 0.012, ROCK_LIFT = 0.045

export class Diorama {
  readonly scene = new THREE.Scene()
  readonly kit: Kit
  private readonly room: Room
  private readonly cast: Cast
  private readonly boxes: BoxView[] = []
  private readonly scissors = new THREE.Group()
  private readonly cutLine: Ribbon
  private readonly trail: Ribbon
  private readonly strip: Ribbon
  private readonly hand: THREE.Mesh
  private readonly ink: THREE.MeshBasicMaterial
  private readonly pale: THREE.MeshBasicMaterial
  private readonly tapeInk: THREE.MeshBasicMaterial
  private readonly made: THREE.BufferGeometry[] = []
  private readonly ground: Blobs
  private readonly cushions: THREE.Mesh[]
  private readonly toys: THREE.Mesh[]
  private readonly roll: THREE.Mesh
  private readonly knob: THREE.Mesh
  private readonly tapes: Batch
  private readonly cloth: Batch
  private readonly clothLight: THREE.ShaderMaterial
  private readonly bulbs: Batch
  private readonly pieces = new Map<number, PieceView>()
  /** Where the cat, the baby and the grandmother were drawn in the last frame, for what must keep clear of them. */
  private readonly atFaces: Vec[] = [{ x: 0, y: 0, z: 9 }, { x: 0, y: 0, z: 9 }, { x: 0, y: 0, z: 9 }]
  private rain = true
  private shadows = true
  private readonly handPlace = { window: {} as HandAt, from: { x: 0, y: 0, z: 0 } } as DemoHand
  private readonly spot = { x: 0, y: 0, z: 0 }

  constructor() {
    this.kit = makeKit()
    this.room = makeRoom(this.kit)
    this.scene.add(this.room.group)
    this.cast = makeCast(this.kit, this.scene)

    // The scissors: two blades of painted board on one pin. The group's origin is the tips.
    const blade = (flip: 1 | -1): THREE.Mesh => {
      const y = (v: number): number => v * flip
      const outline: Outline = [[-0.3, y(-0.01)], [0, y(0.004)], [-0.02, y(0.03)], [-0.3, y(0.055)]]
      const board = new Board()
        // Each blade is its own layer, clear of the other, and each piece of it ends at its own depth.
        .panel(outline, { front: STEEL, back: STEEL, rim: 0.008, t: 0.02 }, { at: [0, 0, flip * 0.026] })
        .panel(oval(0.25, 0.19, 18, -0.42, y(-0.07)), { front: RED, back: RED, rim: 0.012, t: 0.03 }, { at: [0, 0, flip * 0.026] })
        .panel(oval(0.12, 0.08, 14, -0.42, y(-0.07)), { front: INSIDE, back: INSIDE, t: 0.042 }, { at: [0, 0, flip * 0.026] })
        .panel([[-0.36, y(-0.02)], [-0.28, y(-0.012)], [-0.28, y(0.05)], [-0.34, y(0.03)]], { front: RED, back: RED, t: 0.036 }, { at: [0, 0, flip * 0.026] })
      return this.mesh(board, this.kit.board, `scissors-blade-${flip > 0 ? 'upper' : 'lower'}`)
    }
    const pin = new THREE.Group()
    pin.position.x = -0.3
    for (const mesh of [blade(1), blade(-1)]) { mesh.position.x = 0.3; const arm = new THREE.Group(); arm.add(mesh); pin.add(arm) }
    this.scissors.name = 'scissors'
    this.scissors.add(pin)
    this.scene.add(this.scissors)

    const basic = (paint: Rgb, over: boolean): THREE.MeshBasicMaterial => new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(paint[0], paint[1], paint[2], THREE.LinearSRGBColorSpace), side: THREE.DoubleSide, transparent: over, depthTest: !over, depthWrite: !over })
    this.ink = basic(MARKER, false)
    this.pale = basic(HAND, true)
    this.tapeInk = basic(TAPE, false)
    this.cutLine = new Ribbon(MAX_PATH + 4, this.ink, 'cut-line')
    this.trail = new Ribbon(48, this.pale, 'ghost-trail')
    this.trail.mesh.renderOrder = 7
    this.strip = new Ribbon(STRIP_POINTS, this.tapeInk, 'tape-strip')
    this.scene.add(this.cutLine.mesh, this.trail.mesh, this.strip.mesh)
    // The ghost hand: a pale mitten whose fingertip is its origin, drawn over everything.
    const mitten = new Board().panel(oval(0.11, 0.34, 14, 0.02, -0.17, 3), { front: HAND, back: HAND, t: 0.02 }).panel(oval(0.3, 0.3, 18, 0.1, -0.4, 2.6), { front: HAND, back: HAND, t: 0.02 }).panel(oval(0.11, 0.24, 12, -0.07, -0.36, 3), { front: HAND, back: HAND, t: 0.02 }, { rz: 0.5 })
    this.hand = this.mesh(mitten, this.pale, 'ghost-hand')
    this.hand.renderOrder = 8
    this.hand.visible = false
    this.scene.add(this.hand)

    // What the fort is built with. Each rests in the room as furniture until a finger takes it.
    this.ground = new Blobs(BOX_COUNT + 3, this.kit.blob([0.1, 0.12, 0.1], 0.3), 'ground-shadows')
    this.cushions = CUSHION_PAINTS.map((paint, i) => this.mesh(new Board().panel(oval(0.86, 0.74, 24, 0, 0, 4), { front: paint, back: paint, rim: 0.04, t: 0.09 }), this.kit.board, `cushion-${i}`))
    this.toys = [
      // The rattle: a ball on a stick. The ball the baby holds out. The block that lies by its knee.
      this.mesh(new Board().panel(rect(0.045, 0.2), { front: WHITE, back: WHITE, t: 0.012 }, { at: [0, 0.1, 0] }).panel(oval(0.2, 0.2, 14, 0, 0.26), { front: RATTLE, back: RATTLE, rim: 0.02, t: 0.03 }).panel(oval(0.07, 0.07, 8, 0, 0.26), { front: MUSTARD, back: MUSTARD, t: 0.04 }), this.kit.board, 'toy-rattle'),
      // The ball has a round shine to one side, and the block a sunk square face: neither carries a mark that could be read.
      this.mesh(new Board().panel(oval(0.13, 0.13, 14), { front: BALL, back: BALL, rim: 0.012, t: 0.03 }).panel(oval(0.045, 0.045, 10, -0.025, 0.025), { front: BALL_SHINE, back: BALL_SHINE, t: 0.04 }), this.kit.board, 'toy-ball'),
      this.mesh(new Board().panel(rect(0.2, 0.2), { front: BLOCK, back: BLOCK, rim: 0.02, t: 0.12 }).panel(rect(0.11, 0.11), { front: BLOCK_DARK, back: BLOCK_DARK, t: 0.13 }), this.kit.board, 'toy-block'),
    ]
    // The tape roll, seen on its flat side: a disc of tape round a plug of board.
    this.roll = this.mesh(new Board().panel(oval(0.34, 0.34, 20), { front: TAPE, back: TAPE, rim: 0.012, t: 0.11 }).panel(oval(0.13, 0.13, 6), { front: FLUTE, back: FLUTE, t: 0.116 }), this.kit.board, 'tape-roll')
    this.knob = this.mesh(new Board().panel(oval(0.13, 0.2, 14, 0, 0, 3), { front: RED, back: RED, rim: 0.015, t: 0.06 }), this.kit.board, 'switch-knob')
    const tapeLight = this.kit.lit(false, true), bulbLight = this.kit.lit(false, true)
    tapeLight.uniforms.lit.value = 1
    bulbLight.uniforms.lit.value = 1
    // The strips patted down, the loose end, and the scrap a second finger flicks up.
    this.tapes = new Batch(MAX_TAPES + 2, tapeLight, 'tape-strips')
    this.clothLight = this.kit.lit(true, true)
    this.cloth = new Batch((CLOTH_POINTS - 1) * 2, this.clothLight, 'blanket')
    this.bulbs = new Batch(BULBS * 2, bulbLight, 'string-of-lights')
    this.scene.add(this.ground.mesh, ...this.cushions, ...this.toys, this.roll, this.knob, this.tapes.mesh, this.cloth.mesh, this.bulbs.mesh)
    this.knob.position.set(SWITCH.x, SWITCH.y, SWITCH.z + 0.1)

    // Nobody and nothing of the fort is in the room until the slot has been read and the toy is laid on them.
    this.setShown(false)
  }

  private setShown(shown: boolean): void {
    for (const thing of [this.scissors, this.cast.cat.root, this.cast.baby.root, this.cast.gran.root, this.ground.mesh, ...this.cushions, ...this.toys, this.roll, this.knob]) thing.visible = shown
  }

  private mesh(board: Board, material: THREE.Material, name: string): THREE.Mesh {
    const geometry = board.geometry()
    this.made.push(geometry)
    const mesh = new THREE.Mesh(geometry, material)
    mesh.name = name
    return mesh
  }

  /** What a tier sets besides the pixel ratio. No answer to a touch is among it. */
  setTier(tier: Tier): void {
    this.rain = tier.rain
    this.shadows = tier.shadows
    this.room.shadows.visible = tier.shadows
  }

  /**
   * Builds a box. Its shell is three walls, its top a board of its own, and it has no bottom. Its face is one board of two layers a
   * board apart with its own cut edge round it, both layers cut by the face's grid, standing a hair in front of
   * the shell's edges so that nothing of it lies in a plane of the shell's. Then its lid flap, the tunnel it is
   * on its side, and its light on the wall.
   */
  private box(id: number): BoxView {
    const kind = kindOf(id), geometries: THREE.BufferGeometry[] = []
    const group = new THREE.Group()
    group.name = `box-${id}`
    const light = this.kit.lit()
    const named = (board: Board, material: THREE.Material, name: string): THREE.Mesh => {
      const geometry = board.geometry()
      geometries.push(geometry)
      const mesh = new THREE.Mesh(geometry, material)
      mesh.name = name
      return mesh
    }
    // The shell: its inside wall is what shines through the holes in the dark, and thin lines of light leak along the folds of the face.
    const w = kind.w / 2, z = kind.d / 2, deepShell = kind.d - BOARD - HAIR
    const shell = named(new Board().carton(kind.w, kind.h, deepShell, KRAFT, INSIDE, { at: [0, 0, -(BOARD + HAIR) / 2] }, false, 1, false)
      .panel(rect(0.014, kind.h - 0.06), { front: SEAM, t: 0.004, glow: 1 }, { at: [-w + 0.014, kind.h / 2, z + 0.006] })
      .panel(rect(0.014, kind.h - 0.06), { front: SEAM, t: 0.004, glow: 1 }, { at: [w - 0.014, kind.h / 2, z + 0.006] })
      .panel(rect(kind.w - 0.08, 0.014), { front: SEAM, t: 0.004, glow: 1 }, { at: [0, kind.h - 0.014, z + 0.006] }), light, `box-${id}-shell`)
    const grid = new THREE.DataTexture(new Uint8Array(kind.cols * kind.rows), kind.cols, kind.rows, THREE.RedFormat)
    grid.magFilter = grid.minFilter = THREE.LinearFilter
    // The face: the board, a liner in the colour of the flutes that shows as the cut edge, and the fluted strip round its outside.
    const face = new THREE.BufferGeometry()
    const corners = [[-w, 0], [w, 0], [w, kind.h], [-w, kind.h]] as const
    const positions: number[] = [], paints: number[] = [], uvs: number[] = [], cells: number[] = [], flutes: number[] = [], normals: number[] = [], index: number[] = []
    const cellOf = (x: number, y: number): [number, number] => [(x + w) / kind.w, y / kind.h]
    for (const [depth, paint, flute] of [[z - BOARD, FLUTE, 1], [z, KRAFT, 0]] as const) {
      const first = positions.length / 3
      for (const [x, y] of corners) {
        positions.push(x, y, depth); paints.push(...paint); normals.push(0, 0, 1); flutes.push(flute)
        uvs.push(flute ? x * 30 : x * 0.55 + id * 0.3, y * 0.55); cells.push(...cellOf(x, y))
      }
      index.push(first, first + 1, first + 2, first, first + 2, first + 3)
    }
    corners.forEach(([x1, y1], i) => {
      const [x2, y2] = corners[(i + 1) % 4], length = Math.hypot(x2 - x1, y2 - y1), nx = (y2 - y1) / length, ny = -(x2 - x1) / length, first = positions.length / 3
      for (const [x, y, depth, u] of [[x1, y1, z, 0], [x2, y2, z, length], [x2, y2, z - BOARD, length], [x1, y1, z - BOARD, 0]] as const) {
        positions.push(x, y, depth); paints.push(...FLUTE); normals.push(nx, ny, 0); flutes.push(1)
        // The frame of a face is never cut, so its edge is always board.
        uvs.push(u * 30, depth === z ? 1 : 0); cells.push((x1 + x2) / 2 > 0 ? 1 : (x1 + x2) / 2 < 0 ? 0 : 0.5, 0)
      }
      index.push(first, first + 3, first + 2, first, first + 2, first + 1)
    })
    face.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    face.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
    face.setAttribute('paint', new THREE.Float32BufferAttribute(paints, 3))
    face.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
    face.setAttribute('cell', new THREE.Float32BufferAttribute(cells, 2))
    face.setAttribute('flute', new THREE.Float32BufferAttribute(flutes, 1))
    face.setAttribute('glow', new THREE.Float32BufferAttribute(new Float32Array(positions.length / 3), 1))
    face.setIndex(index)
    geometries.push(face)
    const faceMesh = new THREE.Mesh(face, this.kit.holed(grid))
    faceMesh.name = `box-${id}-face`
    // The lid: a flap standing up along the back edge, with a finger hole. It is what a box is taken by.
    const flap = named(new Board().panel(rect(kind.w * 0.6, FLAP), { front: KRAFT, back: KRAFT, t: BOARD }).panel(oval(0.2, 0.09, 12, 0, 0.02, 3), { front: INSIDE, back: INSIDE, t: BOARD + 0.008 }), this.kit.board, `box-${id}-flap`)
    flap.position.set(0, kind.h + FLAP / 2 + 0.008, -z + 0.03)
    // On its side it is a tunnel: open to the child, dark inside.
    const deep = Math.min(kind.w, TUNNEL_DEPTH)
    const tunnel = named(new Board().carton(kind.h, kind.d, deep, KRAFT, INSIDE, { at: [0, 0, z - deep / 2] }), this.kit.board, `box-${id}-tunnel`)
    // The top is a piece of its own, lying between the walls. There is no bottom: a box stands open on the rug, so it lifts off whoever is under it.
    const top = named(new Board().panel(rect(kind.w - 2 * BOARD - 2 * HAIR, deepShell), { front: KRAFT, back: INSIDE, t: BOARD }, { at: [0, kind.h - BOARD / 2, -(BOARD + HAIR) / 2], rx: -Math.PI / 2 }), this.kit.board, `box-${id}-top`)
    group.add(shell, top, faceMesh, flap, tunnel)
    // Its light on the wall, flat and pale, in the shapes of its holes.
    const spilt = this.kit.spill(grid)
    const sheet = new THREE.BufferGeometry()
    sheet.setAttribute('position', new THREE.Float32BufferAttribute([-w, 0, 0, w, 0, 0, w, kind.h, 0, -w, kind.h, 0], 3))
    sheet.setAttribute('cell', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2))
    sheet.setIndex([0, 1, 2, 0, 2, 3])
    geometries.push(sheet)
    const spill = new THREE.Mesh(sheet, spilt)
    spill.name = `box-${id}-light`
    spill.visible = false
    this.scene.add(group, spill)
    return { id, group, shell, top, face: faceMesh, flap, tunnel, spill, grid, light, spilt, holed: false, geometries }
  }

  private regrid(box: BoxView, toy: Toy): void {
    const face = toy.kept.get(box.id) ?? toy.state.boxes[box.id].face, gone = face.gone, data = box.grid.image.data as Uint8Array
    // A cell that is gone is written a shade darker for each later hole, so that the light on the wall can come on hole by hole.
    const marks = labels(face)
    for (let i = 0; i < gone.length; i++) data[i] = gone[i] ? 255 - Math.min(HOLE_MOST - 1, marks[i] - 1) * HOLE_STEP : 0
    box.grid.needsUpdate = true
    box.holed = goneShare(face) > 0
    // A face with a hole in it is drawn under another name: whoever goes through a face goes through one that is cut, and the audit excuses nobody at a face that is whole.
    box.face.name = box.holed ? `box-${box.id}-face-cut` : `box-${box.id}-face`
  }

  private pieceView(piece: Piece, toy: Toy): PieceView {
    // It falls out of its face where the face is: for a box that was let go to tip, where it hung.
    const standing = piece.hung ?? toy.rect(piece.box), kind = kindOf(piece.box)
    const left = (standing?.x ?? 0) - kind.w / 2, foot = standing?.foot ?? 0
    // Where it lies and how small is the model's: the view only cuts the board.
    const rest = pieceRest(piece.path, piece.disc, left), low = rest.low
    // A cut of many points is thinned to an outline the board can be filled from. The disc of a peep-hole is drawn about its own middle, so that it can roll.
    const every = Math.max(1, Math.ceil(piece.path.length / 48))
    const outline: Outline = piece.disc ? oval(POKE * 2 * CELL, POKE * 2 * CELL, 14) : piece.path.filter((_, i) => i % every === 0).map((p) => [(p.x - rest.middle) * CELL, (p.y - low) * CELL])
    const geometry = new Board().panel(outline, { front: KRAFT, back: KRAFT, t: BOARD }).geometry()
    const mesh = new THREE.Mesh(geometry, this.kit.board)
    mesh.name = 'cut-piece'
    const pivot = new THREE.Group()
    pivot.add(mesh)
    const x = left + rest.middle * CELL
    pivot.position.set(x, foot + low * CELL, FRONT_Z + 0.03)
    this.scene.add(pivot)
    return { key: piece.key, pivot, mesh, geometry, x, rise: foot + low * CELL, tall: rest.tall, small: rest.small }
  }

  private dropPiece(view: PieceView): void {
    this.scene.remove(view.pivot)
    view.geometry.dispose()
    this.pieces.delete(view.key)
  }

  /** How far out in front of the faces the piece that is tipping out reaches now: what stands in front of it is pushed that far. */
  private pushOf(view: PieceView, piece: Piece, time: number): number {
    const p = Math.min(1, (time - piece.born) / PIECE_FALL), fall = p * p, since = time - piece.born - PIECE_FALL
    // The disc of a peep-hole drops on its edge: it only comes out as far as it lies.
    const reach = (piece.disc ? 0 : view.tall * mix(1, view.small, fall) * Math.sin(fall * FLAT)) + 0.03 + fall * (PIECE_OUT - 0.03) + BOARD
    // The disc is still on its edge while it rolls: what it pushed stays out until it has lain down.
    return reach * (1 - ease((since - (piece.disc ? DISC_ROLL.lasts + DISC_ROLL.topple : 0)) / 0.3))
  }

  /** Lays one fallen piece: tipping out of its face, lying on the rug, rocking under a finger, or sliding off under the sofa. */
  private layPiece(view: PieceView, piece: Piece, toy: Toy): void {
    const time = toy.time
    const p = Math.min(1, (time - piece.born) / PIECE_FALL), fall = p * p, pivot = view.pivot, since = time - piece.born - PIECE_FALL
    const small = mix(1, view.small, fall), lies = PIECE_LIES + piece.layer * (BOARD + PIECE_GAP)
    let x = mix(view.x, piece.from, fall), y = view.rise * (1 - fall) + lies, z = FRONT_Z + 0.03 + fall * (PIECE_OUT - 0.03), tip = fall * FLAT, roll = 0, squash = piece.landed && piece === toy.piece ? ring(toy.age('piece'), 6, 8) * 0.12 : 0
    if (piece.disc) {
      // The disc of a peep-hole drops on its edge, rolls a little way along the rug, and only then lies down.
      const radius = POKE * CELL * small, rolled = ease(since / DISC_ROLL.lasts), down = ease((since - DISC_ROLL.lasts) / DISC_ROLL.topple)
      x = mix(view.x, piece.from, fall) + (piece.lies - piece.from) * rolled
      roll = -((piece.lies - piece.from) * rolled) / Math.max(radius, 0.01)
      tip = down * FLAT
      view.mesh.position.y = radius / small
      y = view.rise * (1 - fall) + lies
      squash = 0
    }
    // Pushed out of someone's way, it slides along the rug to where it now lies.
    if (piece.slid) x = mix(piece.slid.from, piece.lies, ease((time - piece.slid.at) / PIECE_SLIDES))
    // Touched, it rocks where it lies.
    const rock = ring(toy.age(`piece:${piece.key}`), 5, 6)
    if (piece.swept !== null && time >= piece.swept) {
      // The tail has swept it: along the rug to the sofa, and in under it.
      const gone = (time - piece.swept) / SWEPT_S, along = ease(gone / 0.6), under = ease((gone - 0.6) / 0.4)
      x = mix(piece.lies, SWEPT.x, along)
      y = mix(lies, SWEPT.skim, Math.min(1, along * 4)) + (SWEPT.lies - SWEPT.skim) * under
      z = mix(z, SWEPT.z, under)
      roll += along * 2.4
    }
    pivot.position.set(x, y + Math.abs(rock) * ROCK_LIFT, z)
    pivot.rotation.set(tip - rock * 0.22, 0, piece.disc ? 0 : rock * 0.05)
    view.mesh.rotation.z = roll
    pivot.scale.set(small * (1 + squash), small * (1 + squash), 1 - squash)
  }

  /** Lays the toy as it stands onto everything drawn. `guidance` is what the idle ladder shows, or null. */
  update(toy: Toy, guidance: Guidance | null): void {
    const { time, state } = toy, age = (mover: string): number => toy.age(mover)
    this.setShown(true)
    const dusk = toy.dusk(), dark = state.dark, sinceSwitch = age('switch')
    this.kit.dusk.value = dusk
    /** Whether a light has come on: at once when the room was found dark, in its turn after the switch is flicked. */
    const on = (mover: string): boolean => dark && (toy.lit >= 99 || age(mover) <= sinceSwitch)

    // The boxes: built once, a face that was cut gets its grid again, a knock makes it shudder.
    if (this.boxes.length === 0) for (let id = 0; id < BOX_COUNT; id++) { const box = this.box(id); this.boxes.push(box); this.regrid(box, toy) }
    for (const id of toy.recut) this.regrid(this.boxes[id], toy)
    toy.recut.clear()
    const worn = wornBox(state), under = toy.shows.gran.stage === 'under'
    const standing = rects(state), carried = toy.hand?.kind === 'box' && toy.hand.lifted === null ? toy.hand.members : null
    // Whether the cat is on or at one of the boxes in the hand.
    const catOn = state.cat.at === 'top' ? highest(state)?.id ?? -1 : state.cat.at === 'rug' ? -1 : state.cat.box
    const ridden = carried !== null && carried.includes(catOn)
    // The lid flap of a box that has just lost its roof comes up once the blanket has gone from over it.
    const clothGone = toy.clothMoved() > 0.45
    for (const box of this.boxes) {
      const kind = kindOf(box.id), pose = toy.poseOf(`box:${box.id}`), rest = standing.find((entry) => entry.id === box.id)
      const knock = ring(age(`box:${box.id}`), 9, 9), dip = ring(age(`lid:${box.id}`), 5, 7) * 0.014
      const flat = pose.flat, side = pose.side, lies = side >= 0.5
      // It is drawn a hair smaller than it is and a hair above what it stands on, so that flush boxes share no wall plane and no box lies in the plane of the rug or of the box below.
      const wide = lies ? kind.h : kind.w, high = lies ? kind.d : kind.h
      // Tipped over, it rolls a quarter turn over its lower corner and is a tunnel: the corner stays on the rug, so nothing of it goes through the floor.
      const roll = lies ? (1 - side) * (Math.PI / 2) : -side * (Math.PI / 2)
      box.group.position.set(pose.x, pose.y + HAIR + (wide / 2) * Math.abs(Math.sin(roll)), FRONT_Z + pose.z - (kind.d / 2) * (1 - flat))
      // A knock makes it shudder smaller, never larger: it stays inside the room it has between its neighbours and under what stands on it.
      box.group.scale.set(mix(1, FOLDED, flat) * (1 - Math.abs(knock) * 0.004) * (1 - (2 * HAIR) / wide), mix(1, 0.06 / kind.h, flat) * (1 - Math.abs(knock) * 0.02 - Math.max(0, dip)) * (1 - (2 * HAIR) / high), mix(1, 0.45, flat))
      // Carried, it leans back in the hand and judders with every scrape; with someone on it or at it, it is carried level.
      const leans = carried?.includes(box.id) === true && !ridden
      box.group.rotation.set(leans ? -0.07 : 0, 0, (ridden ? 0 : knock * 0.004) + (leans ? ring(age('carry'), 11, 8) * 0.012 : 0) + roll)
      box.shell.visible = box.face.visible = !lies
      // The top is off a box that someone stands up through: the one the grandmother wears, and the one that is going over her head.
      box.top.visible = !lies && box.id !== worn && !(under && toy.shows.gran.box === box.id)
      box.tunnel.visible = lies
      box.flap.visible = !lies && flat < 0.3 && rest !== undefined && flapShows(toy, rest) && clothGone
      box.flap.rotation.x = -0.14 + (carried?.includes(box.id) ? Math.sin(time * 11) * 0.06 : 0)
      const lit = state.boxes[box.id].on !== ON_HEAP && on(`spill:${box.id}`)
      box.light.uniforms.lit.value = lit ? 1 : 0
      // On the wall above and behind it: the light it throws, in the shapes that were cut.
      const shows = lit && box.holed && !lies && rest !== undefined
      box.spill.visible = shows
      if (shows) {
        const pop = Math.min(1, 0.6 + ease(age(`spill:${box.id}`) / 0.25) * 0.4)
        box.spill.position.set(rest.x * 1.12 - 0.2, 2.05 + rest.foot * 0.55, -2.9)
        box.spill.scale.set(0.9 * pop, 0.9 * pop, 1)
        // A cushion in the box stands in the way of the light as high as the cushion reaches.
        box.spilt.uniforms.blocked.value = state.cushions.includes(box.id) ? Math.min(1, CUSHION_TOP / kind.h) : 0
        // After the switch the holes of a box light one after another, each with its bell.
        box.spilt.uniforms.upTo.value = toy.lit >= 99 ? 99 : toy.holesLit.get(box.id) ?? 0
      }
      this.ground.set(box.id, pose.x, FRONT_Z + pose.z - (kind.d / 2) * (1 - flat), this.shadows && flat < 0.5 ? (lies ? kind.h : kind.w) + 0.6 : 0, kind.d + 0.5)
    }

    // The line of a cut: the one the finger is making, or the one that waits for it. It is drawn on its box wherever the box is, and not at all on a box that lies on its side.
    // A line that is about to be run shut on a box that hangs is drawn there until the blades have come.
    const stroke = toy.stroke ?? toy.closing?.stroke ?? null, waits = stroke ? null : state.line, lineBox = stroke ? stroke.box : waits ? waits.box : -1
    const lineCount = stroke ? stroke.path.length : waits ? waits.path.length / 2 : 0
    // A box that hangs while its line is run shut is upright there, whatever the save already has it as: on its side, or on the heap.
    const hangs = toy.stroke === null && toy.closing !== null
    if (lineBox >= 0 && (hangs || (state.boxes[lineBox].on !== ON_HEAP && !state.boxes[lineBox].side))) {
      const pose = toy.poseOf(`box:${lineBox}`), left = pose.x - kindOf(lineBox).w / 2
      this.cutLine.lay(lineCount === 1 ? 2 : lineCount, (i, out) => {
        const k = Math.min(i, lineCount - 1)
        out.x = left + (stroke ? stroke.path[k].x : waits!.path[k * 2]) * CELL + (i >= lineCount ? 1.5 * CELL : 0)
        out.y = pose.y + HAIR + (stroke ? stroke.path[k].y : waits!.path[k * 2 + 1]) * CELL
        out.z = FRONT_Z + pose.z + 0.004
      }, 0.02)
    } else this.cutLine.mesh.visible = false

    // The pieces that fell: the newest, and those before it that wait on the rug for the cat's tail.
    const lying = toy.piece ? [...toy.olds, toy.piece] : toy.olds
    for (const view of [...this.pieces.values()]) if (!lying.some((piece) => piece.key === view.key)) this.dropPiece(view)
    for (const piece of lying) {
      let view = this.pieces.get(piece.key)
      if (!view) { view = this.pieceView(piece, toy); this.pieces.set(piece.key, view) }
      this.layPiece(view, piece, toy)
    }

    // The scissors: at the finger, waiting where they were let go, or hopping home to the rug. Idle, they wriggle where they lie.
    const scissors = toy.scissors, open = toy.bladeOpen()
    let at = scissors.at, turn = scissors.turn
    if (scissors.mode === 'home') {
      const p = ease((time - scissors.since) / HOME_S)
      at = { x: scissors.from.x + (SCISSORS_REST.x - scissors.from.x) * p, y: scissors.from.y + (SCISSORS_REST.y - scissors.from.y) * p + Math.sin(p * Math.PI) * 0.35, z: scissors.from.z + (SCISSORS_REST.z - scissors.from.z) * p }
      turn += (SCISSORS_TURN - turn) * p
    }
    const resting = scissors.mode === 'rest', wriggle = guidance && resting ? guidance.glow : 0
    const settle = resting ? ring(age('scissors'), 7, 9) * 0.08 : 0
    // Off the rug they are held a little in front of the faces, never in the board. The piece that tips out of a cut pushes them out in front of it as it comes, and they swing back once it has landed.
    const newest = toy.piece ? this.pieces.get(toy.piece.key) : undefined
    const pushed = newest && toy.piece && !resting && Math.abs(at.x - toy.piece.from) < toy.piece.half / Math.max(newest.small, 0.01) + 0.8 ? this.pushOf(newest, toy.piece, time) : 0
    // And they keep in front of whoever is at the faces near them: the cat's head out of a hole, the baby at a slot, the grandmother at a door.
    let crowd = 0
    for (const who of this.atFaces) if (who.z < FRONT_Z + NEAR.deep) crowd = Math.max(crowd, (who.z - FRONT_Z + NEAR.out) * clamp01((NEAR.reach - Math.hypot(at.x - who.x, at.y - who.y)) / 0.3))
    this.scissors.position.set(at.x, at.y + settle + Math.abs(Math.sin(time * 5)) * 0.06 * wriggle, Math.max(at.z, FRONT_Z + BLADES_OUT + Math.max(pushed, crowd) * (1 - ease((time - scissors.since) / HOME_S) * (scissors.mode === 'home' ? 1 : 0))))
    // Held low on a face and pointing up, their handles would hang into the rug: they lie over just far enough to clear it.
    if (!resting) { const most = Math.max(-1, Math.min(1, (this.scissors.position.y - SCISSORS_LOW) / SCISSORS_LONG)); if (Math.sin(turn) > most) turn = Math.cos(turn) >= 0 ? Math.asin(most) : Math.PI - Math.asin(most) }
    this.scissors.rotation.z = turn + Math.sin(time * 10) * 0.1 * wriggle
    // Every snip is a small jolt of the blades.
    this.scissors.scale.setScalar(1.25 + Math.max(0, 0.07 - age('cut')) * 0.9)
    const pin = this.scissors.children[0]
    pin.children[0].rotation.z = open * 0.4 + Math.sin(time * 10) * 0.12 * wriggle
    pin.children[1].rotation.z = -open * 0.4 - Math.sin(time * 10) * 0.12 * wriggle

    // The three, as people.ts has them.
    const cat = catDraw(toy), baby = babyDraw(toy), gran = granDraw(toy)
    this.cast.cat.pose(cat)
    this.cast.baby.pose(baby)
    this.cast.gran.pose(gran)
    Object.assign(this.atFaces[0], cat.body.show ? { x: cat.body.x, y: cat.body.y + 0.4, z: cat.body.z } : { x: cat.head.x, y: cat.head.y, z: cat.head.z })
    Object.assign(this.atFaces[1], { x: baby.x, y: baby.y + 0.4, z: baby.z })
    // Sitting in a box her knees and her knitting are out of its door: that is how far out she is.
    Object.assign(this.atFaces[2], { x: gran.x, y: gran.y + 0.9 * gran.scale, z: gran.z + (gran.sunk > 0.5 ? 0.8 * gran.scale : 0) })
    const soft = this.shadows ? 1 : 0
    this.ground.set(BOX_COUNT, cat.body.x, cat.body.z, cat.body.show && cat.body.y < 0.3 ? 0.9 * soft : 0, 0.5)
    this.ground.set(BOX_COUNT + 1, baby.x, baby.z - 0.1, baby.body ? 1.3 * soft : 0, 0.9)
    this.ground.set(BOX_COUNT + 2, gran.x, gran.z, gran.seated < 0.5 ? 1.2 * soft : 0, 0.8)
    this.ground.end()

    // The cushions: where the save has them, in the hand, or on their way; each puffs when it lands.
    this.cushions.forEach((cushion, i) => {
      const pose = toy.poseOf(`cushion:${i}`), puffed = age(`cushion:${i}`), puff = ring(puffed, 4, 6) * 0.16 - (puffed >= 0 && puffed < 0.12 ? 0.14 : 0)
      // Coming down onto the sofa it slides down the way it leans, so that it never comes down through the cushion in front of it.
      const home = pose.flat < 0.01 && Math.abs(pose.x - CUSHIONS[i].x) < 0.01 && Math.abs(pose.z - CUSHIONS[i].z) < 0.01
      cushion.position.set(pose.x, pose.y, pose.z - (home ? Math.min(SOFA_SLIDE, Math.max(0, pose.y - CUSHIONS[i].y)) * CUSHION_LEAN : 0))
      cushion.rotation.set(-CUSHION_LEAN * (1 - pose.flat) - pose.flat * 1.35, 0, i === 1 ? -0.04 : 0.05)
      // In a box lower than itself it is squeezed to the room there is.
      const inBox = state.cushions[i] >= 0 ? kindOf(state.cushions[i]) : null, fit = inBox ? Math.min(1, (inBox.h - 0.14) / 0.74, (inBox.w - 0.2) / 0.86) : 1
      const squeeze = mix(1, fit, toy.moving(`cushion:${i}`))
      // Flat on the rug it is pressed a little lower, so that it lies clear of the faces behind it.
      cushion.scale.set((1 - puff * 0.5) * squeeze, (1 + puff) * squeeze * mix(1, FLOOR_SQUASH, clamp01((pose.flat - 1) * 12)), 1)
    })

    // The toys: in the baby's hands while it has them, in the box they were posted into after that.
    this.toys.forEach((mesh, i) => {
      const held = baby.body && (toy.withBaby.has(i) || (state.toys[i] < 0 && toy.moving(`toy:${i}`) >= 1))
      const posting = toy.shows.baby.stage === 'post' && toy.shows.baby.n === i
      const busy = toy.shows.baby.stage === 'bowl' || toy.shows.baby.stage === 'shake'
      let place: Vec, spin = 0
      if (!held) { const pose = toy.poseOf(`toy:${i}`); place = { x: pose.x, y: pose.y + Math.max(0, ring(age(`toy:${i}`), 5, 7)) * 0.05, z: pose.z }; spin = (1 - toy.moving(`toy:${i}`)) * 5 }
      // The hand that bowls the roll or shakes the string has put the ball down beside its knee.
      else if (i === 1 && busy) place = { x: baby.x + 0.39 * BABY_SCALE, y: baby.y + 0.2 * BABY_SCALE, z: baby.z + 0.1 * BABY_SCALE }
      else if (posting || i === 1) { place = handOf(baby); spin = ring(age(`toy:${i}`), 6, 5) }
      else if (i === 0) { place = rattleAt(baby); spin = baby.armL - Math.PI + baby.tilt }
      // The block is pushed along the rug beside it, and close in beside it where it sits up to go down the side of a box.
      // Where the baby flops down onto a cushion the block stays on the rug and is nudged to the front of it.
      else {
        const flop = toy.shows.baby.stage === 'flop' ? clamp01(-baby.tilt / 1.45) : 0, crawls = toy.shows.baby.stage === 'crawl'
        // On all fours the baby is up off the rug; the block is not.
        place = { x: baby.x + (crawls ? mix(0.56, 0.2, clamp01((baby.tilt + 1.2) / 0.9)) : 0.56) - flop * 0.1, y: (crawls ? 0 : baby.y) + 0.1 - flop * FLOP.up, z: baby.z + 0.27 }
        let nudge = 0
        state.cushions.forEach((_, c) => { const lies = toy.poseOf(`cushion:${c}`); if (lies.flat > 0.8 && Math.abs(lies.x - place.x) < CUSHION_HALF + 0.12 && Math.abs(lies.z - place.z) < 0.5) nudge = Math.max(nudge, clamp01((0.4 - lies.y) / 0.2)) })
        place.x -= nudge * FLOP.aside
        place.z += nudge * FLOP.front
        // Away from where the baby sits it is pushed along close in, under the baby's chin: never as far out as the roll and the scissors, which lie along the front of the rug.
        const away = clamp01(Math.hypot(baby.x - BABY_HOME.x, baby.z - BABY_HOME.z) / 0.15)
        // Nudged to the front of a cushion the baby flops onto, it stays there: the cushion lies where it would be pushed.
        place.z = Math.min(place.z, mix(place.z, BLOCK_FRONT, away * (1 - nudge)))
      }
      mesh.position.set(place.x, place.y - (i === 0 && !posting && held ? 0.26 * BABY_SCALE * Math.cos(spin) : 0), place.z)
      if (i === 0 && held && !posting) mesh.position.x += 0.26 * BABY_SCALE * Math.sin(spin)
      mesh.rotation.z = spin
      mesh.scale.setScalar(BABY_SCALE)
    })

    // The tape: the roll, the strip the finger pulls or that springs back, the strips patted down, and the loose end.
    const roll = rollAt(toy), pulled = toy.hand?.kind === 'tape' ? toy.hand.at : null, sprung = toy.strip
    this.roll.position.set(roll.at.x, roll.at.y, roll.at.z)
    this.roll.rotation.set(-roll.flat * 1.4, 0, roll.spin)
    // Stuck to one box with no seam under it, the strip holds by its end and curls up before it springs back.
    const curl = sprung?.stuck ? clamp01((time - sprung.since) / CURL_S) : 0, back = sprung ? clamp01((time - sprung.since - (sprung.stuck ? CURL_S : 0)) / 0.18) : 0
    const end = pulled ?? (sprung ? { x: mix(sprung.from.x, roll.at.x, back), y: mix(sprung.from.y, roll.at.y, back), z: FRONT_Z + 0.1 } : null)
    if (end) this.strip.lay(STRIP_POINTS, (i, out) => {
      const u = i / (STRIP_POINTS - 1), wave = Math.sin(u * Math.PI * 3) * 0.09 * curl * (1 - back) * Math.sin(u * Math.PI)
      // It comes off the top of the roll, behind it, so that it is never in the roll.
      out.x = mix(roll.at.x, end.x, u) + wave
      // It never trails in the rug, and it comes over whatever lies between the roll and the faces.
      out.y = mix(roll.at.y + 0.19, Math.max(STRIP_LOW, end.y), u) + Math.abs(wave) * 0.6 + Math.sin(Math.min(1, u * 3) * Math.PI) * 0.22
      out.z = mix(roll.at.z - 0.09, FRONT_Z + STRIP_OUT + (1 - u) * STRIP_SLOPE, Math.min(1, u * 3))
    }, 0.1 + Math.max(0, ring(age('strip'), 7, 9)) * 0.04)
    else this.strip.mesh.visible = false
    this.tapes.begin()
    state.tapes.forEach((pair, n) => {
      const seam = seamOf(state, pair)
      if (!seam) return
      // Each strip is torn off by hand and laid a little crooked.
      const press = 1 - Math.max(0, ring(age(`tape:${n}`), 5, 9)) * 0.2, lean = (n % 2 ? -1 : 1) * (0.1 + (n % 3) * 0.05)
      this.tapes.card(seam.at, (seam.flat ? 0.27 : 0.06) * press, (seam.flat ? 0.06 : 0.27) / press, lean, TAPE, on(`tape:${n}`) ? 1 : 0)
    })
    const tab = tapeEnd(state)
    if (tab) {
      // The loose end stands out from the side of the fort like a little flag, and shines with the strips, so it is found in the dark too. Pinched, it jumps; pulled, it stretches after the finger.
      const edge = tab.x - TAB_OUT, held = toy.hand?.kind === 'tab' ? toy.hand.at : null
      const tip = held ? { x: Math.max(edge + 0.12, held.x), y: held.y } : { x: edge + 0.26, y: tab.y + Math.sin(time * 2.1) * 0.012 + ring(age('tab'), 6, 6) * 0.05 }
      const long = Math.hypot(tip.x - edge, tip.y - tab.y)
      this.tapes.card({ x: (edge + tip.x) / 2 + HAIR, y: (tab.y + tip.y) / 2, z: tab.z }, long / 2, 0.035, Math.atan2(tip.y - tab.y, tip.x - edge), TAPE, state.tapes.some((_, n) => on(`tape:${n}`)) ? 1 : 0)
    }
    // A second finger flicks a scrap of board up from where it lands.
    const dab = age('dab')
    if (dab < DAB_S) this.tapes.card({ x: toy.dab.x, y: toy.dab.y + Math.sin((dab / DAB_S) * Math.PI) * 0.16, z: toy.dab.z + 0.05 }, 0.04 * (1 - dab / DAB_S) + 0.01, 0.03 * (1 - dab / DAB_S) + 0.008, dab * 14, KRAFT)
    this.tapes.end()

    // The blanket: a strip of cloth from its back edge to its front edge, and its front edge hanging.
    const cloth = toy.cloth(), roof = state.blanket.length === 2
    this.clothLight.uniforms.lit.value = roof && on('cloth') ? 0.8 : 0
    const ripple = ring(age('cloth'), 4, 6) * 0.035
    this.cloth.begin()
    for (let i = 0; i + 1 < CLOTH_POINTS; i++) {
      // A ripple runs through the cloth whenever it is thrown, lands or lights up.
      const x1 = cloth.xs[i], x2 = cloth.xs[i + 1], y1 = cloth.ys[i] + ripple * Math.sin(i * 1.3), y2 = cloth.ys[i + 1] + ripple * Math.sin((i + 1) * 1.3), u1 = i * 0.5, u2 = (i + 1) * 0.5, deep = (cloth.front - cloth.back) * 3
      this.cloth.quad({ x: x1, y: y1, z: cloth.front }, { x: x2, y: y2, z: cloth.front }, { x: x2, y: y2 + 0.01, z: cloth.back }, { x: x1, y: y1 + 0.01, z: cloth.back }, BLANKET, 1, [u1, 0, u2, 0, u2, deep, u1, deep])
      this.cloth.quad({ x: x1, y: y1 - cloth.hang, z: cloth.front + 0.02 }, { x: x2, y: y2 - cloth.hang, z: cloth.front + 0.02 }, { x: x2, y: y2, z: cloth.front }, { x: x1, y: y1, z: cloth.front }, BLANKET, 1, [u1, -cloth.hang * 3, u2, -cloth.hang * 3, u2, 0, u1, 0])
    }
    this.cloth.end()

    // The string of lights: a dark thread and a bulb at each place along it, each in its own colour.
    const bulbs = toy.bulbs(), swing = ring(age('bulbs'), 3, 3) * 0.05
    this.bulbs.begin()
    for (let n = 0; n + 1 < bulbs.length; n++) {
      const a = bulbs[n], b = bulbs[n + 1]
      // Each stretch of thread and each bulb lies at its own depth, so the string never folds onto itself in one plane.
      const za = a.z + n * BULB_STEP, zb = b.z + (n + 1) * BULB_STEP
      this.bulbs.quad({ x: a.x, y: a.y - 0.008, z: za }, { x: b.x, y: b.y - 0.008, z: zb }, { x: b.x, y: b.y + 0.008, z: zb }, { x: a.x, y: a.y + 0.008, z: za }, MARKER)
    }
    bulbs.forEach((bulb, n) => {
      // Each bulb lights with its own plink, and jumps with its own tink as the string settles.
      const lit = dark && (toy.lit >= 99 || age(`bulb:${n}`) <= sinceSwitch), pop = 1 + Math.max(0, ring(age(`bulb:${n}`), 4, 8)) * 0.5
      this.bulbs.card({ x: bulb.x + swing * (n % 2 ? 1 : -1), y: bulb.y - 0.05, z: bulb.z + 0.012 + n * BULB_STEP }, 0.05 * pop, 0.065 * pop, 0.5 + n * 0.9, BULB_PAINTS[n % BULB_PAINTS.length], lit ? 2 : 0)
    })
    this.bulbs.end()

    // The wall switch: its knob sits up in the afternoon and down in the dark.
    this.knob.position.y = SWITCH.y + (dark ? -0.08 : 0.08) + ring(sinceSwitch, 8, 9) * 0.03
    this.room.rain.forEach((drops, i) => { drops.rotation.z = this.rain ? Math.sin(time * (0.9 + i * 0.35) + i * 2) * 0.045 : 0 })

    // The idle ladder's second step: the hand shows one thing. It takes the scissors round a window on a face, or carries a box by its lid, or presses the switch.
    const shown = guidance && guidance.demo !== null ? demoHand(toy, toy.demo, guidance.demo, this.handPlace) : null
    this.hand.visible = shown !== null
    this.trail.mesh.visible = false
    if (shown) {
      this.pale.opacity = shown.opacity * 0.85
      this.hand.position.set(shown.at.x, shown.at.y, shown.at.z)
      this.hand.scale.setScalar(1 - shown.press * 0.1)
      if (shown.trail === 'window') {
        const window = shown.window, steps = Math.round(window.round * 40)
        this.trail.lay(steps + 1, (i, out) => { windowAt(window.centre, window.radius, i / 40, this.spot); out.x = this.spot.x; out.y = this.spot.y; out.z = this.spot.z - 0.02 }, 0.03)
      } else if (shown.trail === 'line') {
        this.trail.lay(2, (i, out) => { const end = i ? shown.at : shown.from; out.x = end.x; out.y = end.y; out.z = end.z - 0.02 }, 0.03)
      }
    }
  }

  /** How many draw calls the frame would take now: one for each mesh that shows, and two for one that is see-through on both sides, which the renderer draws back and then front. */
  drawn(): number {
    let count = 0
    const visit = (object: THREE.Object3D): void => {
      if (!object.visible) return
      const mesh = object as THREE.Mesh
      if (mesh.isMesh) {
        const material = mesh.material as THREE.Material
        count += material.transparent && material.side === THREE.DoubleSide && !material.forceSinglePass ? 2 : 1
      }
      for (const child of object.children) visit(child)
    }
    visit(this.scene)
    return count
  }

  dispose(): void {
    for (const view of [...this.pieces.values()]) this.dropPiece(view)
    for (const box of this.boxes) { box.grid.dispose(); for (const geometry of box.geometries) geometry.dispose() }
    for (const geometry of this.made) geometry.dispose()
    for (const batch of [this.tapes, this.cloth, this.bulbs, this.ground, this.cutLine, this.trail, this.strip]) batch.dispose()
    this.ink.dispose()
    this.pale.dispose()
    this.tapeInk.dispose()
    this.cast.dispose()
    this.room.dispose()
    this.kit.dispose()
  }
}
