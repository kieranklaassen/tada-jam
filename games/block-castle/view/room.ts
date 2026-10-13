import * as THREE from 'three'
import { BASKET, FOLK, RUG, WALL_Z } from '../layout'
import { ROOM, WALL, branchTexture, floorTexture, leafShadowTexture, outsideTexture, rugTexture, sunPatchTexture, wallTexture, wickerTexture } from './paint'

// The room: a corner of a playroom floor late in the afternoon. A wall with a
// window and a shelf, floorboards, a moss-green wool rug, a patch of low sun
// across it with the shadows of leaves moving in it, a basket and a stool.
// What stands still is painted once into a few textures, so the whole room
// costs a handful of draws.

/** The way the sun travels: in through the window at the back left, down across the rug toward the child's right. */
export const SUN_DIR = new THREE.Vector3(0.45, -0.5, 0.6).normalize()
/** The same on the floor, for shadows: a turn about y and how far a shadow runs for each unit of height. */
export const SHADOW = { x: 0.6, z: 0.8, reach: 0.85 }

export type Room = {
  group: THREE.Group
  /** The branch outside the window, swayed by the view. */
  branch: THREE.Mesh
  /** The shadows of leaves on the patch of sun. */
  leaves: THREE.Mesh
  basket: THREE.Group
}

const WALL_X0 = -WALL.wide / 2

function plane(width: number, depth: number): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(width, depth)
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/** A flat four-cornered patch on the floor, with its texture's corners at the four points given: far left, far right, near right, near left. */
function patch(corners: readonly [number, number][], y: number): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry()
  const [a, b, c, d] = corners
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([a[0], y, a[1], b[0], y, b[1], c[0], y, c[1], d[0], y, d[1]], 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2))
  geometry.setIndex([0, 3, 2, 0, 2, 1])
  return geometry
}

/** The basket: four woven walls that lean out a little, a bed the blocks stand on, a rim and two handles, as one mesh. */
function basketGeometry(): THREE.BufferGeometry {
  const { wide, deep, rim, bed } = BASKET
  const position: number[] = [], normal: number[] = [], uv: number[] = []
  const flare = 0.1, thick = 0.09
  const quad = (a: number[], b: number[], c: number[], d: number[], n: number[], us: number, vs: number): void => {
    for (const [p, u, v] of [[a, 0, 0], [b, us, 0], [c, us, vs], [a, 0, 0], [c, us, vs], [d, 0, vs]] as [number[], number, number][]) {
      position.push(p[0], p[1], p[2]); normal.push(n[0], n[1], n[2]); uv.push(u, v)
    }
  }
  const x0 = wide / 2, z0 = deep / 2, x1 = x0 + flare, z1 = z0 + flare
  // Outside faces.
  quad([-x0, 0, z0], [x0, 0, z0], [x1, rim, z1], [-x1, rim, z1], [0, 0.13, 1], 3, 1)
  quad([x0, 0, -z0], [-x0, 0, -z0], [-x1, rim, -z1], [x1, rim, -z1], [0, 0.13, -1], 3, 1)
  quad([x0, 0, z0], [x0, 0, -z0], [x1, rim, -z1], [x1, rim, z1], [1, 0.13, 0], 3.6, 1)
  quad([-x0, 0, -z0], [-x0, 0, z0], [-x1, rim, z1], [-x1, rim, -z1], [-1, 0.13, 0], 3.6, 1)
  // Inside faces, from the bed up to the rim.
  const xi = x1 - thick, zi = z1 - thick, xb = x0 - thick + flare * (bed / rim), zb = z0 - thick + flare * (bed / rim)
  quad([xb, bed, zb], [-xb, bed, zb], [-xi, rim, zi], [xi, rim, zi], [0, 0.13, -1], 3, 0.5)
  quad([-xb, bed, -zb], [xb, bed, -zb], [xi, rim, -zi], [-xi, rim, -zi], [0, 0.13, 1], 3, 0.5)
  quad([xb, bed, -zb], [xb, bed, zb], [xi, rim, zi], [xi, rim, -zi], [-1, 0.13, 0], 3.6, 0.5)
  quad([-xb, bed, zb], [-xb, bed, -zb], [-xi, rim, -zi], [-xi, rim, zi], [1, 0.13, 0], 3.6, 0.5)
  // The bed.
  quad([-xb, bed, zb], [xb, bed, zb], [xb, bed, -zb], [-xb, bed, -zb], [0, 1, 0], 3, 3.6)
  // The rim, flat on top.
  quad([-x1, rim, z1], [x1, rim, z1], [xi, rim, zi], [-xi, rim, zi], [0, 1, 0], 3, 0.12)
  quad([x1, rim, -z1], [-x1, rim, -z1], [-xi, rim, -zi], [xi, rim, -zi], [0, 1, 0], 3, 0.12)
  quad([x1, rim, z1], [x1, rim, -z1], [xi, rim, -zi], [xi, rim, zi], [0, 1, 0], 3.6, 0.12)
  quad([-x1, rim, -z1], [-x1, rim, z1], [-xi, rim, zi], [-xi, rim, -zi], [0, 1, 0], 3.6, 0.12)
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(position, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geometry.normalizeNormals()
  return geometry
}

export function buildRoom(): Room {
  const group = new THREE.Group()
  group.name = 'room'

  // What is seen through the window, and the branch that sways in front of it.
  const win = WALL.window
  const winX = WALL_X0 + (win.x0 + win.x1) / 2, winY = (win.y0 + win.y1) / 2
  const outside = new THREE.Mesh(new THREE.PlaneGeometry(win.x1 - win.x0 + 1.6, win.y1 - win.y0 + 1.2), new THREE.MeshBasicMaterial({ map: outsideTexture() }))
  outside.name = 'outside'
  outside.position.set(winX, winY, WALL_Z - 0.6)
  group.add(outside)
  const branchGeometry = new THREE.PlaneGeometry(3.4, 3.4)
  // It turns about the point it grows from, at its right edge.
  branchGeometry.translate(-1.7, 0, 0)
  const branch = new THREE.Mesh(branchGeometry, new THREE.MeshBasicMaterial({ map: branchTexture(), transparent: true, alphaTest: 0.4 }))
  branch.name = 'branch'
  branch.position.set(WALL_X0 + win.x1 + 0.5, winY + 0.5, WALL_Z - 0.3)
  group.add(branch)

  const wall = new THREE.Mesh(new THREE.PlaneGeometry(WALL.wide, WALL.tall), new THREE.MeshBasicMaterial({ map: wallTexture(), alphaTest: 0.5 }))
  wall.name = 'wall'
  wall.position.set(0, WALL.tall / 2, WALL_Z)
  group.add(wall)

  // The floor, with the shadows of what stands still painted in: the basket, the stool, and the edge of the rug.
  const span = { x0: -11, x1: 11, z0: WALL_Z, z1: 7.7 }
  const floor = new THREE.Mesh(plane(span.x1 - span.x0, span.z1 - span.z0), new THREE.MeshBasicMaterial({
    map: floorTexture(span, [
      { x: BASKET.x + 1.3, z: BASKET.z + 1.5, rx: 2.6, rz: 2.3, turn: 0.4, alpha: 0.6 },
      { x: FOLK.cook.x + 0.5, z: FOLK.cook.z + 0.6, rx: 1.1, rz: 0.75, turn: 0.9, alpha: 0.55 },
      { x: BASKET.x + 0.1, z: BASKET.z + BASKET.deep / 2 + 2.05, rx: 1.5, rz: 1.25, turn: 0.4, alpha: 0.5 },
      { x: (RUG.x0 + RUG.x1) / 2 + 0.25, z: RUG.z1 + 0.12, rx: (RUG.x1 - RUG.x0) / 2 + 0.2, rz: 0.4, turn: 0, alpha: 0.5 },
      { x: RUG.x1 + 0.14, z: (RUG.z0 + RUG.z1) / 2 + 0.2, rx: 0.4, rz: (RUG.z1 - RUG.z0) / 2 + 0.1, turn: 0, alpha: 0.5 },
    ]),
  }))
  floor.name = 'floor'
  floor.position.set((span.x0 + span.x1) / 2, -RUG.thick, (span.z0 + span.z1) / 2)
  group.add(floor)

  // The rug: its top is the level the blocks stand on, and it has a thick edge.
  const rugWide = RUG.x1 - RUG.x0, rugDeep = RUG.z1 - RUG.z0
  const rugMaterial = new THREE.MeshLambertMaterial({ map: rugTexture() })
  const rug = new THREE.Mesh(plane(rugWide, rugDeep), rugMaterial)
  rug.name = 'rug'
  rug.position.set((RUG.x0 + RUG.x1) / 2, 0, (RUG.z0 + RUG.z1) / 2)
  group.add(rug)
  const edge = new THREE.Mesh(new THREE.BoxGeometry(rugWide, RUG.thick, rugDeep), new THREE.MeshLambertMaterial({ color: ROOM.rugDark }))
  edge.name = 'rug-edge'
  edge.position.set(rug.position.x, -RUG.thick / 2 - 0.002, rug.position.z)
  group.add(edge)

  // The patch of sun: the window thrown down the way the sun travels. Its far edge is the top of the window.
  const reach = (y: number): [number, number] => [(-SUN_DIR.x / SUN_DIR.y) * y, (-SUN_DIR.z / SUN_DIR.y) * y]
  const wx0 = WALL_X0 + win.x0, wx1 = WALL_X0 + win.x1
  const [lowX, lowZ] = reach(win.y0), [highX, highZ] = reach(win.y1)
  const corners: [number, number][] = [[wx0 + lowX, WALL_Z + lowZ], [wx1 + lowX, WALL_Z + lowZ], [wx1 + highX, WALL_Z + highZ], [wx0 + highX, WALL_Z + highZ]]
  const sun = new THREE.Mesh(patch(corners, 0.004), new THREE.MeshBasicMaterial({ map: sunPatchTexture(), color: ROOM.sun, transparent: true, opacity: 0.42, blending: THREE.AdditiveBlending, depthWrite: false }))
  sun.name = 'sun-patch'
  sun.renderOrder = 1
  group.add(sun)
  const leafMap = leafShadowTexture()
  leafMap.repeat.set(1.6, 1.6)
  const leaves = new THREE.Mesh(patch(corners, 0.006), new THREE.MeshBasicMaterial({ map: leafMap, color: '#1d2a10', transparent: true, opacity: 0.3, depthWrite: false }))
  leaves.name = 'leaf-shadows'
  leaves.renderOrder = 2
  group.add(leaves)

  // The basket.
  const basket = new THREE.Group()
  basket.name = 'basket'
  basket.userData.jamObject = 'basket'
  basket.position.set(BASKET.x, 0, BASKET.z)
  const wicker = wickerTexture()
  const weave = new THREE.Mesh(basketGeometry(), new THREE.MeshLambertMaterial({ map: wicker, side: THREE.DoubleSide }))
  weave.name = 'basket-weave'
  basket.add(weave)
  const handleMaterial = new THREE.MeshLambertMaterial({ color: '#b98a4f' })
  for (const side of [-1, 1]) {
    const handle = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 14, Math.PI), handleMaterial)
    handle.name = 'basket-handle'
    handle.position.set(side * (BASKET.wide / 2 + 0.1), BASKET.rim - 0.02, 0)
    handle.rotation.set(0, Math.PI / 2, 0)
    handle.rotateX(side * -0.5)
    basket.add(handle)
  }
  group.add(basket)

  // The cook's stool: a round seat on three legs, stained dark so it is furniture and not a block.
  const stool = new THREE.Group()
  stool.name = 'stool'
  stool.userData.jamObject = 'stool'
  const stoolMaterial = new THREE.MeshLambertMaterial({ color: '#5a3d2a' })
  const seat = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.58, 0.12, 18), stoolMaterial)
  seat.name = 'stool-seat'
  seat.position.y = FOLK.cook.y - 0.06
  stool.add(seat)
  for (let leg = 0; leg < 3; leg++) {
    const angle = (leg / 3) * Math.PI * 2 + 0.5
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.07, FOLK.cook.y - 0.1, 8), stoolMaterial)
    stick.name = 'stool-leg'
    stick.position.set(Math.cos(angle) * 0.42, (FOLK.cook.y - 0.1) / 2, Math.sin(angle) * 0.42)
    stick.rotation.set(Math.sin(angle) * 0.14, 0, -Math.cos(angle) * 0.14)
    stool.add(stick)
  }
  stool.position.set(FOLK.cook.x, 0, FOLK.cook.z)
  group.add(stool)

  // The lid of the basket, set down on the floor in front of it, with what was gathered on the way home.
  const lid = new THREE.Group()
  lid.name = 'basket-lid'
  lid.userData.jamObject = 'basket-lid'
  const lidWicker = wicker.clone()
  lidWicker.repeat.set(2.2, 2.2)
  lidWicker.needsUpdate = true
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.24, 0.14, 22), new THREE.MeshLambertMaterial({ map: lidWicker }))
  disc.name = 'lid-weave'
  disc.position.y = 0.07
  lid.add(disc)
  const knob = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 12, Math.PI), handleMaterial)
  knob.name = 'lid-handle'
  knob.position.set(0.1, 0.14, -0.15)
  knob.rotation.y = 0.7
  lid.add(knob)
  const coneMaterial = new THREE.MeshLambertMaterial({ color: '#7a5233', flatShading: true })
  for (const [x, z, size, tip] of [[-0.62, 0.28, 0.3, 0.5], [0.58, 0.42, 0.24, -0.9], [0.5, -0.5, 0.2, 2.2]] as const) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(size, size * 2.4, 7, 3), coneMaterial)
    cone.name = 'lid-cone'
    // Lying on its side, each pointing its own way.
    cone.rotation.set(0, tip, Math.PI / 2 - 0.12)
    cone.position.set(x, 0.14 + size * 0.95, z)
    lid.add(cone)
  }
  lid.position.set(BASKET.x - 0.4, 0, BASKET.z + BASKET.deep / 2 + 1.75)
  group.add(lid)

  return { group, branch, leaves, basket }
}
