import * as THREE from 'three'
import { GRAN, HEAP, HOOK, SWITCH } from '../layout'
import { Board, KRAFT, MARKER, oval, rect, rgb, type Outline } from './board'
import type { Kit } from './material'

// The living room, built as a cardboard model: everything that stands still
// is one piece of geometry and one draw. The room is painted cool and pale,
// so the bare kraft boxes on the rug are the warmest plain things in it.

const WALL = rgb(0x8fb0c4), SKIRTING = rgb(0x6f8ea6), FLOOR = rgb(0x9aa88f), RUG = rgb(0x5fa39a), RUG_LIGHT = rgb(0x7bb8ad)
const SKY = rgb(0xd5e0e4), CLOUD = rgb(0xf2f2ee), CLOUD_DARK = rgb(0xb9c4cc), RAIN = rgb(0x5b8fd0)
const SOFA = rgb(0xa79bb8), SOFA_DARK = rgb(0x8f84a3), CHAIR = rgb(0x8fa07a), CHAIR_DARK = rgb(0x79896a)
const TAPE = rgb(0xe6d6ab), PAPER = rgb(0xf4f0e8), FISH = rgb(0xe8873a)
const LEAF = rgb(0x5e9a5a), LEAF_DARK = rgb(0x4a8050), POT = rgb(0xd98a5a), DOOR = rgb(0xd9d2c0)
const BOOKS = [rgb(0x6f8ea6), rgb(0xe9b83c), rgb(0xb5645a), rgb(0x5fa39a)]

const FLAT = -Math.PI / 2
/** The top of the floor. The rug lies on it and ends a hair under y = 0, which is where everything in the room stands. */
const GROUND = -0.05
/** The window in the back wall. */
const WINDOW = { left: -0.5, right: 1.9, low: 1.55, high: 3.25, z: -3 }

function wall(b: Board): void {
  const { left, right, low, high, z } = WINDOW
  const slab = (x1: number, x2: number, y1: number, y2: number): void => { b.panel(rect(x2 - x1, y2 - y1), { front: WALL, t: 0.05 }, { at: [(x1 + x2) / 2, (y1 + y2) / 2, z] }) }
  // The wall goes down past the floor, so that its foot lies in no plane of the floor's.
  const foot = GROUND - 0.15
  slab(-9, left, foot, 6.5); slab(right, 9, foot, 6.5); slab(left, right, foot, low); slab(left, right, high, 6.5)
  b.panel(rect(18, 0.4), { front: SKIRTING, t: 0.03 }, { at: [0, 0.1, z + 0.045] })
  // Two sheets of wall, joined with torn tape.
  b.panel(rect(0.025, 5.9), { front: MARKER, t: 0.01 }, { at: [-3.05, 3.36, z + 0.032] })
  for (const [y, turn] of [[1.25, 0.12], [2.1, -0.09], [3.55, 0.05]] as const) b.panel(rect(0.52, 0.15), { front: TAPE, t: 0.01 }, { at: [-3.05, y, z + 0.047], rz: turn })
  // The window: a bare kraft frame, a sill, and the afternoon outside.
  const midX = (left + right) / 2, midY = (low + high) / 2, w = right - left, h = high - low
  b.panel(rect(w + 1.6, h + 1.4), { front: SKY, t: 0.02 }, { at: [midX, midY, z - 0.9] })
  b.panel(oval(1.5, 0.5, 18), { front: CLOUD_DARK, t: 0.03 }, { at: [midX - 0.5, high - 0.3, z - 0.6] })
  b.panel(oval(1.2, 0.46, 18), { front: CLOUD, t: 0.03 }, { at: [midX + 0.55, high - 0.42, z - 0.5] })
  b.panel(oval(0.9, 0.36, 16), { front: CLOUD, t: 0.03 }, { at: [midX - 0.7, high - 0.55, z - 0.45] })
  // The bar across lies a little behind the bar that stands, so the two that cross share no plane.
  for (const [x, y, pw, ph, out] of [[midX, high + 0.07, w + 0.28, 0.14, 0.06], [midX, low - 0.07, w + 0.28, 0.14, 0.06], [left - 0.07, midY, 0.14, h, 0.06], [right + 0.07, midY, 0.14, h, 0.06], [midX, midY, 0.07, h, 0.06], [midX, midY, w, 0.07, 0.05]] as const) b.panel(rect(pw, ph), { front: KRAFT, t: 0.06 }, { at: [x, y, z + out] })
  b.panel(rect(w + 0.5, 0.3), { front: KRAFT, t: 0.05 }, { at: [midX, low - 0.02, z + 0.16], rx: FLAT })
  // A picture, hung crooked by one strip of tape: a fish in fat marker.
  const px = -2.15, py = 2.85, pz = z + 0.06, tilt = 0.09
  b.panel(rect(1.05, 0.82), { front: KRAFT, t: 0.04 }, { at: [px, py, pz], rz: tilt })
  b.panel(rect(0.86, 0.63), { front: PAPER, t: 0.01 }, { at: [px, py, pz + 0.03], rz: tilt })
  b.panel(oval(0.44, 0.22, 16), { front: FISH, t: 0.01 }, { at: [px - 0.04, py, pz + 0.045], rz: tilt })
  b.panel([[0, 0], [0.16, 0.12], [0.16, -0.12]], { front: FISH, t: 0.01 }, { at: [px + 0.16, py + 0.015, pz + 0.042], rz: tilt })
  b.panel(oval(0.04, 0.04, 8), { front: MARKER, t: 0.01 }, { at: [px - 0.16, py + 0.02, pz + 0.055] })
  b.panel(rect(0.32, 0.11), { front: TAPE, t: 0.01 }, { at: [px + 0.03, py + 0.42, pz + 0.04], rz: 0.35 })
  // A shelf of books with nothing on their spines, and a door at the far left for a wide surface.
  b.panel(rect(1.5, 0.3), { front: KRAFT, t: 0.05 }, { at: [-3.95, 2.5, z + 0.2], rx: FLAT })
  ;[0.34, 0.5, 0.42, 0.56, 0.38].forEach((height, i) => { b.panel(rect(0.2, height), { front: BOOKS[i % BOOKS.length], rim: 0.015, t: 0.12 }, { at: [-4.5 + i * 0.27, 2.53 + height / 2, z + 0.2], rz: i === 3 ? -0.12 : 0 }) })
  // On the other side, a portrait of the cat in the same fat marker.
  const cx = 2.72, cy = 3.36
  b.panel(oval(0.9, 1.0, 24), { front: KRAFT, t: 0.04 }, { at: [cx, cy, z + 0.06], rz: -0.06 })
  b.panel(oval(0.72, 0.82, 24), { front: PAPER, t: 0.01 }, { at: [cx, cy, z + 0.09], rz: -0.06 })
  b.panel(oval(0.4, 0.34, 18), { front: FISH, t: 0.01 }, { at: [cx, cy - 0.05, z + 0.105] })
  for (const side of [-1, 1]) {
    b.panel([[side * 0.19, 0.06], [side * 0.05, 0.12], [side * 0.16, 0.3]], { front: FISH, t: 0.01 }, { at: [cx, cy - 0.05, z + 0.102] })
    b.panel(oval(0.05, 0.07, 8), { front: MARKER, t: 0.01 }, { at: [cx + side * 0.09, cy - 0.02, z + 0.115] })
  }
  b.panel(rect(0.3, 0.1), { front: TAPE, t: 0.01 }, { at: [cx - 0.05, cy + 0.5, z + 0.1], rz: -0.3 })
  // The hook the string of lights hangs from, and the plate of the wall switch.
  // The hook is a round peg of board on a round plate: a bent hook read as a drawn sign.
  b.panel(oval(0.26, 0.26, 16), { front: PAPER, rim: 0.03, t: 0.03 }, { at: [HOOK.x, HOOK.y, HOOK.z - 0.04] })
  b.panel(oval(0.12, 0.12, 12), { front: KRAFT, t: 0.1 }, { at: [HOOK.x, HOOK.y, HOOK.z + 0.02] })
  b.panel(oval(0.34, 0.46, 20, 0, 0, 5), { front: PAPER, rim: 0.03, t: 0.04 }, { at: [SWITCH.x, SWITCH.y, z + 0.05] })
  b.panel(rect(1.7, 4.1), { front: DOOR, rim: 0.05, t: 0.05 }, { at: [-7.2, 2.05, z + 0.05] })
  b.panel(oval(0.14, 0.14, 10), { front: MARKER, t: 0.05 }, { at: [-6.55, 2.0, z + 0.12] })
}

function floor(b: Board): void {
  b.panel(rect(20, 13), { front: FLOOR, t: 0.02 }, { at: [0, GROUND - 0.01, 1.2], rx: FLAT })
  // The rug the fort stands on: cool paint under warm board. Its three rings lie one on the other, each clear of the next, and the topmost ends a hair under y = 0.
  b.panel(oval(6.4, 3.3, 40), { front: RUG, rim: 0.07, t: 0.02 }, { at: [0.3, GROUND + 0.012, 0.75], rx: FLAT })
  b.panel(oval(5.4, 2.6, 40), { front: RUG_LIGHT, t: 0.008 }, { at: [0.3, GROUND + 0.032, 0.75], rx: FLAT })
  b.panel(oval(5.0, 2.3, 40), { front: RUG, t: 0.008 }, { at: [0.3, GROUND + 0.042, 0.75], rx: FLAT })
  // Where the flat boxes lie: a sheet of board on the rug at the front, held down with two strips of tape.
  b.panel(oval(1.5, 0.66, 20, 0, 0, 5), { front: KRAFT, t: 0.008 }, { at: [HEAP.x, 0.004, HEAP.z], rx: FLAT })
  b.panel(rect(0.3, 0.1), { front: TAPE, t: 0.006 }, { at: [HEAP.x - 0.7, 0.014, HEAP.z - 0.24], rx: FLAT, rz: 0.5 })
  b.panel(rect(0.3, 0.1), { front: TAPE, t: 0.006 }, { at: [HEAP.x + 0.7, 0.014, HEAP.z - 0.26], rx: FLAT, rz: -0.4 })
}

/** How high the sofa's seat stands off the floor. */
export const SOFA_GAP = 0.16

function sofa(b: Board): void {
  const x = -2.6, z = -1.95
  b.panel(oval(3.0, 1.9, 28, 0, 0, 6), { front: SOFA, rim: 0.05, t: 0.07 }, { at: [x, 0.95, z - 0.6] })
  // The seat stands on its two arms, clear of the floor: what the cat's tail sweeps off the rug slides in under it.
  b.carton(2.7, 0.52 - SOFA_GAP, 1.3, SOFA_DARK, SOFA_DARK, { at: [x, GROUND + SOFA_GAP, z] }, true)
  for (const side of [-1, 1]) b.panel(oval(1.4, 1.0, 20, 0, 0, 6), { front: SOFA, back: SOFA, rim: 0.04, t: 0.12 }, { at: [x + side * 1.4, 0.5, z], ry: side * Math.PI / 2 })
}

function armchair(b: Board): void {
  const x = GRAN.x, z = GRAN.z - 0.2
  b.panel(oval(1.75, 2.5, 28, 0, 0, 5), { front: CHAIR, rim: 0.05, t: 0.07 }, { at: [x, 1.25, z - 0.62] })
  b.carton(1.5, 0.62, 1.15, CHAIR_DARK, CHAIR_DARK, { at: [x, GROUND, z] }, true)
  for (const side of [-1, 1]) b.panel(oval(1.25, 1.05, 20, 0, 0, 6), { front: CHAIR, back: CHAIR, rim: 0.04, t: 0.12 }, { at: [x + side * 0.8, 0.52, z], ry: side * Math.PI / 2 })
}

function plant(b: Board): void {
  const x = 4.0, z = -2.2
  b.panel([[-0.3, 0], [0.3, 0], [0.4, 0.62], [-0.4, 0.62]], { front: POT, rim: 0.03, t: 0.05 }, { at: [x, GROUND + 0.004, z] })
  ;[-0.9, -0.45, 0, 0.45, 0.9].forEach((turn, i) => { b.panel(oval(0.34, 1.25, 14, 0, 0.62), { front: i % 2 ? LEAF : LEAF_DARK, rim: 0.025, t: 0.03 }, { at: [x + turn * 0.1, 0.6, z - 0.05 + i * 0.02], rz: -turn }) })
}

export type Room = {
  group: THREE.Group
  /** The rain on its threads, in two bunches that sway apart. */
  rain: THREE.Mesh[]
  shadows: THREE.Mesh
  dispose(): void
}

/** A flat blob on the ground at each place, as one geometry. */
function blobs(places: readonly (readonly [number, number, number, number])[]): THREE.BufferGeometry {
  const positions: number[] = [], uvs: number[] = [], index: number[] = []
  places.forEach(([x, z, w, d], i) => {
    const y = 0.05 + i * 0.001
    positions.push(x - w / 2, y, z + d / 2, x + w / 2, y, z + d / 2, x + w / 2, y, z - d / 2, x - w / 2, y, z - d / 2)
    uvs.push(0, 0, 1, 0, 1, 1, 0, 1)
    index.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3)
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geometry.setIndex(index)
  return geometry
}

const DROP: Outline = [[0, 0.1], [0.045, 0], [0.035, -0.05], [0, -0.07], [-0.035, -0.05], [-0.045, 0]]

export function makeRoom(kit: Kit): Room {
  const group = new THREE.Group(), made: THREE.BufferGeometry[] = []
  const mesh = (board: Board, name: string): THREE.Mesh => {
    const geometry = board.geometry()
    made.push(geometry)
    const result = new THREE.Mesh(geometry, kit.board)
    result.name = name
    group.add(result)
    return result
  }
  const still = new Board()
  wall(still); floor(still); sofa(still); armchair(still); plant(still)
  mesh(still, 'room')

  const top = WINDOW.high + 0.05
  const rain = [0, 1].map((bunch) => {
    const board = new Board()
    for (let i = bunch; i < 9; i += 2) {
      const x = -1.0 + i * 0.27, length = 0.35 + ((i * 7) % 5) * 0.21
      board.panel(rect(0.008, length), { front: MARKER, back: MARKER, t: 0.004 }, { at: [x, -length / 2, 0] })
      board.panel(DROP, { front: RAIN, back: RAIN, rim: 0.008, t: 0.02 }, { at: [x, -length - 0.07, 0] })
    }
    const drops = mesh(board, `rain-${bunch}`)
    drops.position.set((WINDOW.left + WINDOW.right) / 2, top, WINDOW.z - 0.3 - bunch * 0.12)
    return drops
  })

  const shadowGeometry = blobs([[GRAN.x, GRAN.z - 0.3, 2.3, 1.7], [-2.6, -1.95, 3.6, 2.0], [4.0, -2.2, 1.2, 0.8]])
  made.push(shadowGeometry)
  const shadows = new THREE.Mesh(shadowGeometry, kit.blob([0.1, 0.12, 0.1], 0.3))
  shadows.name = 'shadows'
  shadows.renderOrder = 1
  group.add(shadows)

  return { group, rain, shadows, dispose: () => { for (const geometry of made) geometry.dispose() } }
}
