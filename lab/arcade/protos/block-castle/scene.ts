// The toy room in three.js: a wooden floor in window light, a colour-washed
// wall, a wicker basket, a brass bell on its stand, and the wooden blocks. The
// camera never moves. There are no shadow maps: the blocks' shadows are
// painted on a small canvas laid over the floor whenever a block comes to rest.

import * as THREE from 'three'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { H, W } from '../../kit/types.ts'
import { WOODS, paintBark, paintBlob, paintEndGrain, paintFloor, paintLeaves, paintNight, paintPanes, paintWall, paintWeave, paintWood } from './tex.ts'
import { BASKET, POSES, WALL_Z, inBasket, sizeOf } from './world.ts'
import type { Block, Kind } from './world.ts'

// Light falls from the upper left, a little from the front. A shadow lies this
// far along the floor for each unit of height.
export const SHADOW_X = 0.58
export const SHADOW_Z = -0.2

export const BELL = { x: 3.45, z: 3.3 }

const SH = { x0: -5.5, x1: 9.5, z0: WALL_Z, z1: WALL_Z + 7.5, w: 512, h: 256 }

export interface Room {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  canvas: HTMLCanvasElement
  // Shared shapes, one per kind of block.
  geo: Record<Kind, THREE.BufferGeometry>
  // The swinging part of the bell.
  bell: THREE.Group
  // Lamplight for the evening. It is always in the room, dark by day, so
  // that lighting it does not make every material be built again.
  lamp: THREE.PointLight
  ghost: THREE.Mesh
  // Things made later (the castle) register here to be freed with the room.
  own<T extends { dispose(): void }>(thing: T): T
  texture(c: HTMLCanvasElement, repeat?: boolean): THREE.CanvasTexture
  blockMesh(b: Block): THREE.Group
  // Logical screen position of a point in the room.
  project(x: number, y: number, z: number): [number, number]
  ray(px: number, py: number): THREE.Ray
  pick(px: number, py: number, among: THREE.Object3D[]): THREE.Object3D | null
  paintShadows(blocks: readonly Block[]): void
  // 0 is afternoon, 1 is story-light.
  setDusk(d: number): void
  // The leaves' shadow stirs.
  breathe(t: number): void
  render(): void
  dispose(): void
}

// A wall swept round a rounded rectangle: the basket. `profile` is a list of
// [how far out from the path, how high, shade].
function sweep(hx: number, hz: number, corner: number, profile: readonly (readonly [number, number, number])[]): THREE.BufferGeometry {
  const path: [number, number, number, number][] = []
  const corners = [
    [hx - corner, hz - corner, 0],
    [-(hx - corner), hz - corner, Math.PI / 2],
    [-(hx - corner), -(hz - corner), Math.PI],
    [hx - corner, -(hz - corner), Math.PI * 1.5],
  ] as const
  for (const [cx, cz, a0] of corners) {
    for (let k = 0; k <= 6; k++) {
      const a = a0 + (k / 6) * (Math.PI / 2)
      path.push([cx + Math.cos(a) * corner, cz + Math.sin(a) * corner, Math.cos(a), Math.sin(a)])
    }
  }
  path.push(path[0]!)
  const pos: number[] = []
  const uv: number[] = []
  const col: number[] = []
  const idx: number[] = []
  let u = 0
  const rows = profile.length
  path.forEach((p, k) => {
    if (k > 0) u += Math.hypot(p[0] - path[k - 1]![0], p[1] - path[k - 1]![1])
    let v = 0
    profile.forEach((q, j) => {
      if (j > 0) v += Math.hypot(q[0] - profile[j - 1]![0], q[1] - profile[j - 1]![1])
      pos.push(p[0] + p[2] * q[0], q[1], p[1] + p[3] * q[0])
      uv.push(u * 0.5, v * 0.9)
      col.push(q[2], q[2], q[2])
    })
    if (k > 0) {
      for (let j = 0; j < rows - 1; j++) {
        const a = (k - 1) * rows + j
        const b = k * rows + j
        idx.push(a, b, a + 1, b, b + 1, a + 1)
      }
    }
  })
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
  geo.setIndex(idx)
  geo.computeVertexNormals()
  return geo
}

// Draw a shape as two runs instead of one per face: the first `count`
// corners with the first material, the rest with the second.
function regroup<T extends THREE.BufferGeometry>(geo: T, count: number): T {
  const total = geo.index ? geo.index.count : geo.getAttribute('position').count
  geo.clearGroups()
  geo.addGroup(0, count, 0)
  geo.addGroup(count, total - count, 1)
  return geo
}

function placed(geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, scale = 1): THREE.BufferGeometry {
  geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(scale, scale, scale)))
  return geo
}

function joined(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = mergeGeometries(parts, false)
  for (const p of parts) p.dispose()
  if (!out) throw new Error('could not merge')
  return out
}

function hull(points: [number, number][]): [number, number][] {
  const p = [...points].sort((a, b) => a[0] - b[0] || a[1] - b[1])
  const cross = (o: [number, number], a: [number, number], b: [number, number]) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])
  const lower: [number, number][] = []
  for (const q of p) {
    while (lower.length >= 2 && cross(lower[lower.length - 2]!, lower[lower.length - 1]!, q) <= 0) lower.pop()
    lower.push(q)
  }
  const upper: [number, number][] = []
  for (let i = p.length - 1; i >= 0; i--) {
    const q = p[i]!
    while (upper.length >= 2 && cross(upper[upper.length - 2]!, upper[upper.length - 1]!, q) <= 0) upper.pop()
    upper.push(q)
  }
  lower.pop()
  upper.pop()
  return lower.concat(upper)
}

export function createRoom(seed: number): Room {
  const owned: { dispose(): void }[] = []
  const own = <T extends { dispose(): void }>(thing: T): T => {
    owned.push(thing)
    return thing
  }
  const texture = (c: HTMLCanvasElement, repeat = false): THREE.CanvasTexture => {
    const t = own(new THREE.CanvasTexture(c))
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping
    return t
  }

  // The screenshot tool draws WebGL in software on a busy machine, so under
  // automation the picture is rendered at the size it is looked at, unsmoothed.
  const tool = typeof navigator !== 'undefined' && navigator.webdriver === true
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(W * (tool ? 1 : 1.5))
  canvas.height = Math.round(H * (tool ? 1 : 1.5))
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !tool, alpha: false, preserveDrawingBuffer: true })
  renderer.setPixelRatio(1)
  renderer.setSize(canvas.width, canvas.height, false)
  renderer.setClearColor('#f2d2aa')

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(20, W / H, 6, 80)
  const target = new THREE.Vector3(1.5, 2.1, 0)
  const yaw = 0.18
  const pitch = 0.48
  const far = 25
  camera.position.set(target.x + Math.sin(yaw) * Math.cos(pitch) * far, target.y + Math.sin(pitch) * far, target.z + Math.cos(yaw) * Math.cos(pitch) * far)
  camera.lookAt(target)
  camera.updateMatrixWorld()

  // ------------------------------------------------------------------ light
  const hemi = new THREE.HemisphereLight('#fff3df', '#e8c9a0', 1.9)
  scene.add(hemi)
  const sun = new THREE.DirectionalLight('#ffe9c6', 2.05)
  sun.position.set(-SHADOW_X * 20, 20, -SHADOW_Z * 20 + 3)
  scene.add(sun)
  const fill = new THREE.DirectionalLight('#ffe6cf', 0.8)
  fill.position.set(6, 5, 16)
  scene.add(fill)
  const lamp = new THREE.PointLight('#ffb866', 0, 9, 1.6)
  lamp.position.set(-1, 1.1, 2)
  scene.add(lamp)
  const dayCol = { sky: new THREE.Color('#fff3df'), ground: new THREE.Color('#e8c9a0'), sun: new THREE.Color('#ffe9c6') }
  const duskCol = { sky: new THREE.Color('#8b9be6'), ground: new THREE.Color('#3a3566'), sun: new THREE.Color('#aebcff') }

  // ------------------------------------------------------------------- room
  const floorMat = own(new THREE.MeshLambertMaterial({ map: texture(paintFloor(seed + 3)) }))
  const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(26, 10.4)), floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.set(1.5, 0, WALL_Z + 5.2)
  scene.add(floor)

  const wallMat = own(new THREE.MeshBasicMaterial({ map: texture(paintWall(seed + 5)) }))
  const wall = new THREE.Mesh(own(new THREE.PlaneGeometry(28, 14)), wallMat)
  wall.position.set(1.5, 7, WALL_Z)
  scene.add(wall)

  const skirtMat = own(new THREE.MeshLambertMaterial({ map: texture(paintWood('#ead7b6', seed + 7)) }))
  const skirt = new THREE.Mesh(own(new THREE.BoxGeometry(28, 0.55, 0.14)), skirtMat)
  skirt.position.set(1.5, 0.275, WALL_Z + 0.07)
  scene.add(skirt)

  const nightMat = own(new THREE.MeshBasicMaterial({ map: texture(paintNight(seed + 9)), transparent: true, opacity: 0, depthWrite: false }))
  const night = new THREE.Mesh(own(new THREE.PlaneGeometry(17.5, 8.6)), nightMat)
  night.position.set(2, 4.3, WALL_Z + 0.18)
  night.visible = false
  night.renderOrder = 1
  scene.add(night)

  // The window's light on the floor: a slanted patch of four panes.
  const panesGeo = own(new THREE.BufferGeometry())
  const o = [-4.9, -0.55]
  const along = [4.5, -1.5]
  const across = [0, 2.5]
  panesGeo.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([o[0]!, 0, o[1]!, o[0]! + along[0]!, 0, o[1]! + along[1]!, o[0]! + along[0]! + across[0]!, 0, o[1]! + along[1]! + across[1]!, o[0]! + across[0]!, 0, o[1]! + across[1]!], 3),
  )
  panesGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2))
  panesGeo.setIndex([0, 2, 1, 0, 3, 2])
  const panesMat = own(new THREE.MeshBasicMaterial({ map: texture(paintPanes()), transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, color: '#ffd9a0' }))
  const panes = new THREE.Mesh(panesGeo, panesMat)
  panes.position.y = 0.006
  panes.renderOrder = 2
  scene.add(panes)

  // And the same sun higher up, on the wall behind where the building grows.
  const wallPanesGeo = own(new THREE.BufferGeometry())
  wallPanesGeo.setAttribute('position', new THREE.Float32BufferAttribute([-3.7, 4.8, 0, -0.8, 4.1, 0, -0.8, 1.35, 0, -3.7, 2.05, 0], 3))
  wallPanesGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 0], 2))
  wallPanesGeo.setIndex([0, 2, 1, 0, 3, 2])
  const wallPanesMat = own(new THREE.MeshBasicMaterial({ map: panesMat.map, transparent: true, opacity: 0.17, blending: THREE.AdditiveBlending, depthWrite: false, color: '#ffe2b0' }))
  const wallPanes = new THREE.Mesh(wallPanesGeo, wallPanesMat)
  wallPanes.position.z = WALL_Z + 0.02
  scene.add(wallPanes)

  // A branch outside throws its leaves' shadow across a corner of each patch.
  const leafTex = texture(paintLeaves(seed + 11))
  const leafMat = own(new THREE.MeshBasicMaterial({ map: leafTex, transparent: true, opacity: 0.6, depthWrite: false, color: '#d2a06a' }))
  const wallLeafMat = own(new THREE.MeshBasicMaterial({ map: leafTex, transparent: true, opacity: 0.7, depthWrite: false, color: '#f6d6b0' }))
  const floorLeaves = new THREE.Mesh(panesGeo, leafMat)
  floorLeaves.position.y = 0.009
  floorLeaves.renderOrder = 2
  scene.add(floorLeaves)
  const wallLeaves = new THREE.Mesh(wallPanesGeo, wallLeafMat)
  wallLeaves.position.z = WALL_Z + 0.03
  scene.add(wallLeaves)

  // Shadows on the floor.
  const shadowCanvas = document.createElement('canvas')
  shadowCanvas.width = SH.w
  shadowCanvas.height = SH.h
  const shadowTex = own(new THREE.CanvasTexture(shadowCanvas))
  const shadowMat = own(new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, opacity: 0.5, depthWrite: false }))
  const shadows = new THREE.Mesh(own(new THREE.PlaneGeometry(SH.x1 - SH.x0, SH.z1 - SH.z0)), shadowMat)
  shadows.rotation.x = -Math.PI / 2
  shadows.position.set((SH.x0 + SH.x1) / 2, 0.012, (SH.z0 + SH.z1) / 2)
  shadows.renderOrder = 3
  scene.add(shadows)

  // Where the carried block will come down.
  const ghostMat = own(new THREE.MeshBasicMaterial({ map: texture(paintBlob()), transparent: true, opacity: 0, depthWrite: false }))
  const ghost = new THREE.Mesh(own(new THREE.PlaneGeometry(1, 1)), ghostMat)
  ghost.rotation.x = -Math.PI / 2
  ghost.renderOrder = 4
  ghost.visible = false
  scene.add(ghost)

  // ----------------------------------------------------------------- basket
  const bx = (BASKET.x0 + BASKET.x1) / 2
  const bz = (BASKET.z0 + BASKET.z1) / 2
  const bhx = (BASKET.x1 - BASKET.x0) / 2 + 0.1
  const bhz = (BASKET.z1 - BASKET.z0) / 2 + 0.1
  const weave = texture(paintWeave(seed + 13), true)
  const basketMat = own(new THREE.MeshLambertMaterial({ map: weave, vertexColors: true, side: THREE.DoubleSide }))
  const basketGeo = own(
    sweep(bhx, bhz, 0.5, [
      [0.03, 0, 0.8],
      [0.1, 0.2, 0.95],
      [0.17, 0.56, 1],
      [0.24, 0.61, 1.08],
      [0.25, 0.72, 1.12],
      [0.15, 0.78, 1.1],
      [0.03, 0.72, 0.8],
      [0, 0.58, 0.56],
      [0, 0.04, 0.4],
    ]),
  )
  const basket = new THREE.Mesh(basketGeo, basketMat)
  basket.position.set(bx, 0, bz)
  scene.add(basket)
  const matMat = own(new THREE.MeshLambertMaterial({ map: weave, color: '#8a6a48' }))
  const mat = new THREE.Mesh(own(new THREE.PlaneGeometry(bhx * 2, bhz * 2)), matMat)
  mat.rotation.x = -Math.PI / 2
  mat.position.set(bx, 0.03, bz)
  scene.add(mat)
  const handleMat = own(new THREE.MeshLambertMaterial({ color: '#b98a56' }))
  const handles = new THREE.Mesh(
    own(joined([-1, 1].map((side) => placed(new THREE.TorusGeometry(0.4, 0.065, 8, 18, Math.PI), bx + side * (bhx + 0.16), 0.66, bz, side * 0.5, Math.PI / 2, 0)))),
    handleMat,
  )
  scene.add(handles)

  // ------------------------------------------------------------------- bell
  const standMat = own(new THREE.MeshLambertMaterial({ map: texture(paintWood('#c99a6c', seed + 17)) }))
  const brass = own(new THREE.MeshPhongMaterial({ color: '#dba63f', specular: '#fff0b8', shininess: 55, emissive: '#3b2606' }))
  const stand = new THREE.Group()
  stand.position.set(BELL.x, 0, BELL.z)
  stand.add(
    new THREE.Mesh(
      own(
        joined([
          placed(new THREE.CylinderGeometry(0.5, 0.56, 0.16, 24), 0, 0.08, 0),
          placed(new THREE.CylinderGeometry(0.075, 0.09, 1.55, 12), -0.36, 0.875, 0),
          placed(new THREE.TorusGeometry(0.36, 0.07, 8, 14, Math.PI / 2), 0, 1.65, 0, 0, 0, Math.PI / 2),
          placed(new THREE.SphereGeometry(0.1, 12, 10), 0, 2.01, 0),
        ]),
      ),
      standMat,
    ),
  )
  const bell = new THREE.Group()
  bell.position.set(0, 1.97, 0)
  const profile = [
    [0.0, 0],
    [0.09, -0.01],
    [0.15, -0.07],
    [0.19, -0.2],
    [0.23, -0.4],
    [0.31, -0.56],
    [0.42, -0.66],
    [0.47, -0.7],
    [0.45, -0.73],
    [0.4, -0.71],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  brass.side = THREE.DoubleSide
  bell.add(new THREE.Mesh(own(joined([placed(new THREE.LatheGeometry(profile, 28), 0, -0.32, 0, 0, 0, 0, 1.22), placed(new THREE.SphereGeometry(0.085, 12, 10), 0, -1.14, 0)])), brass))
  bell.add(
    new THREE.Mesh(
      own(joined([placed(new THREE.CylinderGeometry(0.02, 0.02, 0.34, 6), 0, -0.17, 0), placed(new THREE.CylinderGeometry(0.018, 0.018, 0.36, 6), 0, -1.34, 0), placed(new THREE.SphereGeometry(0.11, 14, 10), 0, -1.58, 0)])),
      own(new THREE.MeshLambertMaterial({ color: '#c0503a' })),
    ),
  )
  stand.add(bell)
  scene.add(stand)
  // A little warmth round the bell so it can be found in the evening.
  const bellGlowMat = own(new THREE.SpriteMaterial({ map: texture(paintGlowLocal()), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }))
  const bellGlow = new THREE.Sprite(bellGlowMat)
  bellGlow.position.set(BELL.x, 1.2, BELL.z)
  bellGlow.scale.set(2.6, 2.6, 1)
  scene.add(bellGlow)

  // ----------------------------------------------------------------- blocks
  const edge = 0.045
  const extrude = (shape: THREE.Shape, depth: number): THREE.BufferGeometry => {
    const g = new THREE.ExtrudeGeometry(shape, { depth: depth - edge * 2, bevelEnabled: true, bevelThickness: edge, bevelSize: edge, bevelOffset: -edge, bevelSegments: 2, curveSegments: 18 })
    g.translate(0, 0, -(depth - edge * 2) / 2)
    return own(g)
  }
  const archShape = new THREE.Shape()
  archShape.moveTo(-1, -0.75)
  archShape.lineTo(-0.6, -0.75)
  archShape.lineTo(-0.6, -0.2)
  archShape.absarc(0, -0.2, 0.6, Math.PI, 0, true)
  archShape.lineTo(0.6, -0.75)
  archShape.lineTo(1, -0.75)
  archShape.lineTo(1, 0.75)
  archShape.lineTo(-1, 0.75)
  archShape.closePath()
  const triShape = (w: number, h: number) => {
    const s = new THREE.Shape()
    s.moveTo(-w / 2, -h / 2)
    s.lineTo(w / 2, -h / 2)
    s.lineTo(0, h / 2)
    s.closePath()
    return s
  }
  const branch = (h: number): THREE.BufferGeometry => {
    const g = new THREE.CylinderGeometry(0.5, 0.5, h, 26, 1)
    const p = g.getAttribute('position') as THREE.BufferAttribute
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i)
      const z = p.getZ(i)
      const a = Math.atan2(z, x)
      const k = 0.96 + Math.sin(a * 3 + 1) * 0.03 + Math.sin(a * 5 + 2.2) * 0.02
      p.setXYZ(i, x * k, p.getY(i), z * k)
    }
    g.computeVertexNormals()
    return own(g)
  }
  // Each block is drawn in two runs: the ends (or caps) and the rest.
  const boxed = (w: number, h: number, d: number) => {
    const g = new RoundedBoxGeometry(w, h, d, 3, edge)
    return own(regroup(g, g.getAttribute('position').count / 3))
  }
  const turned = (g: THREE.BufferGeometry) => regroup(g, g.groups[0]!.count)
  const geo: Record<Kind, THREE.BufferGeometry> = {
    cube: boxed(1, 1, 1),
    plank: boxed(3, 0.5, 1),
    column: turned(own(new THREE.CylinderGeometry(0.5, 0.5, 2, 30, 1))),
    arch: extrude(archShape, 1),
    tri: extrude(triShape(1, 0.75), 1),
    triL: extrude(triShape(2, 1), 1),
    cone: turned(own(new THREE.CylinderGeometry(0.035, 0.5, 1.25, 30, 1))),
    log: turned(branch(1.5)),
  }
  // One set of materials per wood.
  const woods = WOODS.map((base, i) => {
    const flat = texture(paintWood(base, seed + 31 + i * 7))
    const up = texture(paintWood(base, seed + 131 + i * 7))
    up.center.set(0.5, 0.5)
    up.rotation = Math.PI / 2
    const cut = texture(paintWood(base, seed + 231 + i * 7))
    cut.wrapS = cut.wrapT = THREE.MirroredRepeatWrapping
    cut.repeat.set(0.5, 0.6)
    const end = texture(paintEndGrain(base, seed + 331 + i * 7))
    return {
      long: own(new THREE.MeshLambertMaterial({ map: flat })),
      up: own(new THREE.MeshLambertMaterial({ map: up })),
      cut: own(new THREE.MeshLambertMaterial({ map: cut })),
      end: own(new THREE.MeshLambertMaterial({ map: end, color: '#f4e6d2' })),
    }
  })
  const bark = own(new THREE.MeshLambertMaterial({ map: texture(paintBark(seed + 41)) }))
  const barkEnd = own(new THREE.MeshLambertMaterial({ map: texture(paintEndGrain('#e2c79c', seed + 43, true)) }))

  const blockMesh = (b: Block): THREE.Group => {
    const wood = woods[b.tone % woods.length]!
    let material: THREE.Material | THREE.Material[]
    if (b.kind === 'cube' || b.kind === 'plank') material = [wood.end, wood.long]
    else if (b.kind === 'column' || b.kind === 'cone') material = [wood.up, wood.end]
    else if (b.kind === 'log') material = [bark, barkEnd]
    else material = wood.cut
    const mesh = new THREE.Mesh(geo[b.kind], material)
    const holder = new THREE.Group()
    holder.add(mesh)
    holder.userData.block = b
    return holder
  }

  // ---------------------------------------------------------------- helpers
  const v = new THREE.Vector3()
  const raycaster = new THREE.Raycaster()
  const ndc = new THREE.Vector2()
  const project = (x: number, y: number, z: number): [number, number] => {
    v.set(x, y, z).project(camera)
    return [((v.x + 1) / 2) * W, ((1 - v.y) / 2) * H]
  }
  const ray = (px: number, py: number): THREE.Ray => {
    ndc.set((px / W) * 2 - 1, 1 - (py / H) * 2)
    raycaster.setFromCamera(ndc, camera)
    return raycaster.ray
  }
  const pick = (px: number, py: number, among: THREE.Object3D[]): THREE.Object3D | null => {
    ray(px, py)
    const hits = raycaster.intersectObjects(among, true)
    return hits[0]?.object ?? null
  }

  const paintShadows = (blocks: readonly Block[]): void => {
    const g = shadowCanvas.getContext('2d')
    if (!g) return
    g.setTransform(1, 0, 0, 1, 0, 0)
    g.clearRect(0, 0, SH.w, SH.h)
    const kx = SH.w / (SH.x1 - SH.x0)
    const kz = SH.h / (SH.z1 - SH.z0)
    g.shadowColor = '#2e1a0c'
    g.shadowBlur = 4
    g.shadowOffsetX = 2000
    g.fillStyle = '#000'
    const cast = (low: [number, number][], y0: number, high: [number, number][], y1: number) => {
      const pts: [number, number][] = []
      for (const [x, z] of low) pts.push([x + y0 * SHADOW_X, z + y0 * SHADOW_Z])
      for (const [x, z] of high) pts.push([x + y1 * SHADOW_X, z + y1 * SHADOW_Z])
      const poly = hull(pts)
      g.beginPath()
      for (const [x, z] of poly) g.lineTo((x - SH.x0) * kx - 2000, (z - SH.z0) * kz)
      g.closePath()
      g.fill()
    }
    const rect = (x0: number, z0: number, x1: number, z1: number): [number, number][] => [
      [x0, z0],
      [x1, z0],
      [x1, z1],
      [x0, z1],
    ]
    const round = (cx: number, cz: number, r: number): [number, number][] => {
      const out: [number, number][] = []
      for (let i = 0; i < 10; i++) out.push([cx + Math.cos((i / 10) * Math.PI * 2) * r, cz + Math.sin((i / 10) * Math.PI * 2) * r])
      return out
    }
    for (const b of blocks) {
      if (inBasket(b)) continue
      const s = sizeOf(b)
      const cx = b.x + s[0] / 2
      const cz = b.z + s[2] / 2
      const y1 = b.y + s[1]
      const box = rect(b.x + 0.03, b.z + 0.03, b.x + s[0] - 0.03, b.z + s[2] - 0.03)
      if ((b.kind === 'column' || b.kind === 'log') && b.o === 0) cast(round(cx, cz, 0.48), b.y, round(cx, cz, 0.48), y1)
      else if (b.kind === 'cone') cast(round(cx, cz, 0.48), b.y, [[cx, cz]], y1)
      else if (b.kind === 'tri' || b.kind === 'triL') {
        const ridge: [number, number][] =
          POSES[b.kind][b.o]!.rot[1] === 0
            ? [
                [cx, b.z],
                [cx, b.z + s[2]],
              ]
            : [
                [b.x, cz],
                [b.x + s[0], cz],
              ]
        cast(box, b.y, ridge, y1)
      } else cast(box, b.y, box, y1)
    }
    // The basket and the bell stand.
    cast(rect(bx - bhx, bz - bhz, bx + bhx, bz + bhz), 0, rect(bx - bhx - 0.2, bz - bhz - 0.2, bx + bhx + 0.2, bz + bhz + 0.2), 0.7)
    cast(round(BELL.x, BELL.z, 0.52), 0, round(BELL.x, BELL.z, 0.4), 0.2)
    cast(round(BELL.x - 0.36, BELL.z, 0.08), 0, round(BELL.x - 0.36, BELL.z, 0.08), 1.65)
    cast(round(BELL.x, BELL.z, 0.34), 0.95, round(BELL.x, BELL.z, 0.3), 1.5)
    shadowTex.needsUpdate = true
  }

  const col = new THREE.Color()
  const setDusk = (d: number): void => {
    hemi.color.copy(dayCol.sky).lerp(duskCol.sky, d)
    hemi.groundColor.copy(dayCol.ground).lerp(duskCol.ground, d)
    hemi.intensity = 1.9 - d * 0.95
    sun.color.copy(dayCol.sun).lerp(duskCol.sun, d)
    sun.intensity = 2.05 - d * 1.3
    fill.intensity = 0.8 - d * 0.45
    wallMat.color.set('#ffffff').lerp(col.set('#5a5fa8'), d)
    wallPanesMat.opacity = 0.17 * (1 - d)
    wallPanes.visible = d < 0.99
    leafMat.opacity = 0.6 * (1 - d)
    wallLeafMat.opacity = 0.7 * (1 - d)
    floorLeaves.visible = wallLeaves.visible = d < 0.99
    fill.color.copy(col.set('#ffe6cf')).lerp(duskCol.sky, d)
    nightMat.opacity = d * d * (3 - 2 * d)
    night.visible = d > 0.005
    panesMat.opacity = 0.4 * (1 - d)
    panes.visible = d < 0.99
    shadowMat.opacity = 0.5 - d * 0.2
    bellGlowMat.opacity = d * 0.5
  }

  return {
    scene,
    camera,
    renderer,
    canvas,
    geo,
    bell,
    lamp,
    ghost,
    own,
    texture,
    blockMesh,
    project,
    ray,
    pick,
    paintShadows,
    setDusk,
    breathe(t) {
      const a = Math.sin(t * 0.7) * 0.6 + Math.sin(t * 1.9 + 1) * 0.4
      const b = Math.sin(t * 0.53 + 2) * 0.6 + Math.sin(t * 1.6) * 0.4
      floorLeaves.position.set(a * 0.07, 0.009, b * 0.05)
      wallLeaves.position.set(a * 0.05, b * 0.04, WALL_Z + 0.03)
    },
    render() {
      renderer.render(scene, camera)
    },
    dispose() {
      for (const thing of owned) thing.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}

// The bell's halo (kept here so the room needs nothing from the castle).
function paintGlowLocal(): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = 64
  c.height = 64
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32)
    grad.addColorStop(0, 'rgba(255,214,140,0.8)')
    grad.addColorStop(0.5, 'rgba(255,190,110,0.2)')
    grad.addColorStop(1, 'rgba(255,180,100,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 64, 64)
  }
  return c
}

