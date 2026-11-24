import * as THREE from 'three'
import { CAST, STAND, type Id } from '../cast'
import type { Tier } from '../config'
import { CAMERA, EASEL, FLOOR_Y, HUNG, KEY, NAILS, PICTURE, SPOTS, fieldOfView } from '../layout'
import type { Arrangement } from '../table'
import { framing } from '../sight'
import { restPose, type MaestroPose, type Pose } from '../pose'
import { MaestroRig } from './maestro'
import { Studio, pictureGeometry } from './portrait'
import { Rig } from './rig'
import { FRAME, Room, frameGeometry } from './set'
import { Press, SHEET, canvas, lacquer, sheetOf, swatch, texture, tinMaterial } from './tin'

// Everything drawn. It is handed numbers and decides nothing.

export type Shown = {
  poses: Readonly<Record<Id, Pose>>
  /** Radians each key has been wound. */
  keys: Readonly<Record<Id, number>>
  maestro: MaestroPose
  tableYaw: number
  tableKey: { up: number; spin: number; squash: number }
  /** The picture in his hands or on the easel. `tile` is -1 for a bare canvas. */
  easel: { x: number; y: number; z: number; yaw: number; roll: number; size: number; tile: number }
  /** For each nail: whether something hangs there, how far it swings, how far it has dropped. */
  wall: readonly { hung: boolean; swing: number; drop: number }[]
  /** Paint flecks above the canvas: place, size, colour. */
  flecks: readonly { x: number; y: number; z: number; r: number; colour: string }[]
  /** Glow round what can be touched, and the ghost hand. */
  /** `flat` lies on the ground under whatever stands on it. */
  glow: readonly { x: number; y: number; z: number; r: number; k: number; flat: boolean }[]
  hand: { x: number; y: number; z: number; press: number; opacity: number } | null
}

const STANDS = CAST.length
const TINTS: Readonly<Record<Id, string>> = { elephant: '#e8b33c', hen: '#d33a32', hippo: '#f2c14a', pig: '#3f9aa0', giraffe: '#d3622e', crocodile: '#e79aa4', board: '#8a63a8' }
const MAX_FLECKS = 18, MAX_GLOW = 4

export class Stage {
  readonly counts = { drawCalls: 0, triangles: 0 }
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(31, 1, CAMERA.near, CAMERA.far)
  private readonly renderer: THREE.WebGLRenderer
  private readonly matcap: THREE.DataTexture
  private readonly rigs = new Map<Id, Rig>()
  private readonly maestro: MaestroRig
  private readonly room: Room
  private readonly studio = new Studio()
  private readonly stands: THREE.InstancedMesh
  private readonly keys: THREE.InstancedMesh
  private readonly shade: THREE.InstancedMesh
  private readonly flecks: THREE.InstancedMesh
  private readonly glow: THREE.InstancedMesh
  private readonly hand: THREE.Mesh
  private readonly easel = new THREE.Group()
  private readonly picture: THREE.Mesh
  private readonly tiles: THREE.PlaneGeometry[]
  private readonly hung: THREE.Group[] = []
  private readonly notPainted: THREE.Object3D[] = []
  private readonly bin: { dispose(): void }[] = []
  private readonly m = new THREE.Matrix4()
  private readonly q = new THREE.Quaternion()
  private readonly v = new THREE.Vector3()
  private readonly s = new THREE.Vector3()
  private readonly e = new THREE.Euler()
  private readonly colour = new THREE.Color()

  constructor(canvasEl: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: true, alpha: false, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.renderer.setClearColor(new THREE.Color().setRGB(0.87, 0.88, 0.78, THREE.LinearSRGBColorSpace))
    this.camera.position.set(CAMERA.at.x, CAMERA.at.y, CAMERA.at.z)
    this.camera.lookAt(CAMERA.to.x, CAMERA.to.y, CAMERA.to.z)
    const keep = <T extends { dispose(): void }>(thing: T): T => { this.bin.push(thing); return thing }
    this.matcap = keep(lacquer())
    this.room = keep(new Room(this.matcap))
    this.maestro = keep(new MaestroRig(this.matcap))
    this.scene.add(this.room.root, this.maestro.root)
    for (const id of CAST) {
      const rig = keep(new Rig(id, this.matcap))
      this.rigs.set(id, rig)
      this.scene.add(rig.root)
    }

    // Stands and their keys, everybody's in two draws.
    const plain = keep(sheetOf((p) => {
      p.fill('#ffffff')
      for (let lon = -180; lon < 180; lon += 30) p.patch(lon, lon + 15, -90, 90, '#fff6df')
    }, (p) => p.fill('#fff'), ['#fffaf0', '#2b2430', '#ffffff', '#e8b33c', '#cfcac0', '#e8b33c', '#efe3c8', '#b98a55', '#7a3f9a']))
    const tin = keep(tinMaterial(this.matcap, plain))
    const stand = new Press().disc([0, 0, 1024, 512], [0, STAND.h / 2, 0], STAND.r, STAND.h - 0.08, undefined, STAND.r - 0.07, 40)
    for (const y of [0.05, STAND.h - 0.05]) stand.add(new THREE.TorusGeometry(STAND.r - (y > 0.1 ? 0.07 : 0), 0.045, 8, 40), swatch(2), { at: [0, y, 0], turn: [Math.PI / 2, 0, 0] })
    this.stands = new THREE.InstancedMesh(keep(stand.weld()), tin, STANDS)
    const key = new Press().disc(swatch(3), [0, 0, 0.1], 0.035, 0.22, [Math.PI / 2, 0, 0])
    for (const s of [-1, 1]) key.add(new THREE.TorusGeometry(0.075, 0.028, 8, 18), swatch(3), { at: [s * 0.075, 0, 0.22] })
    this.keys = new THREE.InstancedMesh(keep(key.weld()), tin, STANDS)
    CAST.forEach((id, n) => this.stands.setColorAt(n, this.colour.set(TINTS[id]).convertLinearToSRGB()))
    this.stands.name = 'stands'
    this.keys.name = 'keys'
    for (const mesh of [this.stands, this.keys]) { mesh.userData.jamInstanceObjects = [...CAST]; mesh.frustumCulled = false; this.scene.add(mesh) }

    // Soft dark under everyone.
    const { sheet, pen } = canvas(128, 128), soft = pen.createRadialGradient(64, 64, 22, 64, 64, 64)
    soft.addColorStop(0, 'rgba(50,30,20,0.55)')
    soft.addColorStop(0.55, 'rgba(50,30,20,0.28)')
    soft.addColorStop(1, 'rgba(50,30,20,0)')
    pen.fillStyle = soft
    pen.fillRect(0, 0, 128, 128)
    const shadeMap = keep(texture(sheet)), shadeMat = keep(new THREE.MeshBasicMaterial({ map: shadeMap, transparent: true, depthWrite: false }))
    const flat = keep(new THREE.PlaneGeometry(1, 1))
    flat.rotateX(-Math.PI / 2)
    this.shade = new THREE.InstancedMesh(flat, shadeMat, STANDS + 3)
    this.shade.name = 'shade'
    this.shade.frustumCulled = false
    this.scene.add(this.shade)

    this.flecks = new THREE.InstancedMesh(keep(new THREE.SphereGeometry(1, 10, 8)), keep(tinMaterial(this.matcap, null)), MAX_FLECKS)
    this.flecks.setColorAt(0, this.colour.set('#fff'))
    this.flecks.name = 'flecks'
    this.flecks.frustumCulled = false
    this.scene.add(this.flecks)

    const glowPen = canvas(128, 128), ring = glowPen.pen.createRadialGradient(64, 64, 34, 64, 64, 64)
    ring.addColorStop(0, 'rgba(255,240,150,0)')
    ring.addColorStop(0.45, 'rgba(255,226,90,0.95)')
    ring.addColorStop(0.62, 'rgba(255,200,50,0.5)')
    ring.addColorStop(1, 'rgba(255,200,50,0)')
    glowPen.pen.fillStyle = ring
    glowPen.pen.fillRect(0, 0, 128, 128)
    const glowMat = keep(new THREE.MeshBasicMaterial({ map: keep(texture(glowPen.sheet)), transparent: true, depthWrite: false }))
    this.glow = new THREE.InstancedMesh(keep(new THREE.PlaneGeometry(1, 1)), glowMat, MAX_GLOW)
    this.glow.name = 'glow'
    this.glow.renderOrder = 8
    this.glow.frustumCulled = false
    this.scene.add(this.glow)
    this.hand = new THREE.Mesh(keep(new THREE.PlaneGeometry(1.5, 1.5)), keep(new THREE.MeshBasicMaterial({ map: keep(texture(handPrint())), transparent: true, depthTest: false, depthWrite: false })))
    this.hand.name = 'ghost-hand'
    this.hand.renderOrder = 10
    this.scene.add(this.hand)

    // The picture in hand, and six on the wall.
    const frame = keep(frameGeometry(new Press(), PICTURE.w, PICTURE.h, FRAME.gold, FRAME.back, FRAME.bar).weld())
    const gilt = keep(tinMaterial(this.matcap, keep(sheetOf((p) => p.fill('#fff'), (p) => p.fill('#fff'), ['#f6ead0', '#2b2430', '#dd7434', '#1f8a8c', '#c8362c', '#6b4528', '#cfcac0', '#f0bb3e', '#e9dcc0', '#2d5fa8', '#b98a55']))))
    const paint = keep(new THREE.MeshBasicMaterial({ map: this.studio.sheet.texture }))
    this.bare = keep(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.95, 0.92, 0.84) }))
    this.paint = paint
    this.tiles = NAILS.map((_, n) => keep(pictureGeometry(PICTURE.w, PICTURE.h, n)))
    const hang = (group: THREE.Group, name: string, tile: number): THREE.Mesh => {
      const border = new THREE.Mesh(frame, gilt), face = new THREE.Mesh(this.tiles[tile], paint)
      border.name = `${name}-frame`
      face.name = `${name}-face`
      face.position.z = 0.005
      group.userData.jamObject = name
      group.add(border, face)
      this.scene.add(group)
      return face
    }
    this.picture = hang(this.easel, 'picture', 0)
    NAILS.forEach((_, n) => {
      const group = new THREE.Group()
      hang(group, `hung-${n}`, n)
      this.hung.push(group)
    })
    this.notPainted.push(this.maestro.root, this.easel, ...this.hung, this.shade, this.flecks, this.glow, this.hand, this.room.key)
    for (const child of this.room.root.children) if (child !== this.room.table && child !== this.room.key) this.notPainted.push(child)
  }

  private readonly bare: THREE.MeshBasicMaterial
  private readonly paint: THREE.MeshBasicMaterial

  setTier(tier: Tier): void {
    this.shade.visible = tier.shadows
  }

  resize(width: number, height: number, ratio: number): void {
    this.renderer.setPixelRatio(ratio)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.fov = fieldOfView(width, height)
    this.camera.updateProjectionMatrix()
  }

  private put(mesh: THREE.InstancedMesh, n: number, x: number, y: number, z: number, sx: number, sy = sx, sz = sx, rx = 0, ry = 0, rz = 0): void {
    this.e.order = 'XYZ'
    this.m.compose(this.v.set(x, y, z), this.q.setFromEuler(this.e.set(rx, ry, rz)), this.s.set(sx, sy, sz))
    mesh.setMatrixAt(n, this.m)
    mesh.instanceMatrix.needsUpdate = true
  }

  private stand(n: number, p: Pose | null, wound: number): void {
    if (!p) { this.put(this.stands, n, 0, -50, 0, 0.0001); this.put(this.keys, n, 0, -50, 0, 0.0001); return }
    this.put(this.stands, n, p.x, p.y, p.z, 1, 1, 1, 0, p.yaw, 0)
    const out = STAND.r - 0.05, x = p.x + Math.sin(p.yaw) * out, z = p.z + Math.cos(p.yaw) * out
    this.m.compose(this.v.set(x, p.y + STAND.h / 2, z), this.q.setFromEuler(this.e.set(0, p.yaw, wound, 'YXZ')), this.s.set(1, 1, 1))
    this.keys.setMatrixAt(n, this.m)
  }

  /** Paints an arrangement into a tile, with everyone at rest. */
  portrait(arrangement: Arrangement, tile: number): void {
    const was = this.notPainted.map((thing) => thing.visible)
    for (const thing of this.notPainted) thing.visible = false
    const yaw = this.room.table.rotation.y
    this.room.table.rotation.y = 0
    CAST.forEach((id, n) => {
      const spot = arrangement.findIndex((entry) => entry?.[0] === id), rig = this.rigs.get(id)!
      rig.root.visible = spot >= 0
      if (spot < 0) { this.stand(n, null, 0); return }
      const pose = restPose()
      pose.x = SPOTS[spot].x
      pose.z = SPOTS[spot].z
      pose.yaw = (arrangement[spot]![1] * Math.PI) / 2
      rig.lay(pose)
      this.stand(n, pose, 0)
    })
    this.studio.paint(this.renderer, this.scene, framing(arrangement), tile)
    this.notPainted.forEach((thing, n) => { thing.visible = was[n] })
    this.room.table.rotation.y = yaw
    for (const rig of this.rigs.values()) rig.root.visible = true
  }

  update(shown: Shown): void {
    let n = 0
    for (const id of CAST) {
      const pose = shown.poses[id]
      this.rigs.get(id)!.lay(pose)
      this.stand(n, pose, shown.keys[id])
      const ground = Math.abs(pose.x) < 3 && Math.hypot(pose.x, pose.z) < 2.9 ? 0.012 : Math.abs(pose.x) > 3.2 && pose.z < 3.5 ? this.stepUnder(pose) : FLOOR_Y + 0.012
      const high = Math.max(0, pose.y - ground), size = (2.35 * Math.max(0.35, 1 - high * 0.14))
      this.put(this.shade, n++, pose.x, ground + n * 0.0009, pose.z, size)
    }
    this.put(this.shade, n++, 0, FLOOR_Y + 0.01, 0.2, 7.4, 1, 6.6)
    this.put(this.shade, n++, EASEL.x, FLOOR_Y + 0.013, EASEL.z, 2.6)
    this.put(this.shade, n++, 0, FLOOR_Y + 0.15, -5.6, 2.4)
    this.maestro.lay(shown.maestro)
    this.room.table.rotation.y = shown.tableYaw
    const key = this.room.key, up = shown.tableKey.up
    key.position.set(KEY.x, KEY.y, KEY.z)
    key.rotation.set((1 - up) * 1.35, shown.tableKey.spin, 0)
    key.scale.setScalar(0.3 + up * 0.55)
    key.scale.y *= shown.tableKey.squash
    key.visible = up > 0.02

    const easel = shown.easel
    this.easel.position.set(easel.x, easel.y, easel.z)
    this.easel.rotation.set(0, easel.yaw, easel.roll, 'YXZ')
    this.easel.scale.setScalar(easel.size)
    this.picture.material = easel.tile < 0 ? this.bare : this.paint
    this.picture.geometry = this.tiles[Math.max(0, easel.tile)]
    shown.wall.forEach((nail, i) => {
      const group = this.hung[i], at = NAILS[i]
      group.visible = nail.hung
      // It swings from its nail, above its top edge.
      const r = PICTURE.h * HUNG * 0.62
      group.position.set(at.x + Math.sin(nail.swing) * r, at.y + r - Math.cos(nail.swing) * r - nail.drop, at.z)
      group.rotation.z = nail.swing
      group.scale.setScalar(HUNG)
    })
    for (let i = 0; i < MAX_FLECKS; i++) {
      const fleck = shown.flecks[i]
      if (!fleck) { this.put(this.flecks, i, 0, -50, 0, 0.0001); continue }
      this.put(this.flecks, i, fleck.x, fleck.y, fleck.z, fleck.r)
      this.flecks.setColorAt(i, this.colour.set(fleck.colour).convertLinearToSRGB())
    }
    if (this.flecks.instanceColor) this.flecks.instanceColor.needsUpdate = true
    this.flecks.visible = shown.flecks.length > 0
    for (let i = 0; i < MAX_GLOW; i++) {
      const one = shown.glow[i]
      if (!one || one.k < 0.01) this.put(this.glow, i, 0, -50, 0, 0.0001)
      else this.put(this.glow, i, one.x, one.y, one.z, one.r * 2 * (0.9 + one.k * 0.1), one.r * 2 * (0.9 + one.k * 0.1), 1, one.flat ? -Math.PI / 2 : this.camera.rotation.x, 0, 0)
    }
    this.glow.visible = shown.glow.length > 0
    const glow = this.glow.material as THREE.MeshBasicMaterial
    glow.opacity = shown.glow[0]?.k ?? 0
    this.hand.visible = shown.hand !== null
    if (shown.hand) {
      const h = shown.hand, k = 1 - h.press * 0.14
      // The fingertip is the picture's upper left corner, and it is the point that is pressed.
      this.hand.quaternion.copy(this.camera.quaternion)
      this.v.set(0.5 * k, -0.5 * k - (1 - h.press) * 0.3, 0).applyQuaternion(this.camera.quaternion)
      this.hand.position.set(h.x, h.y, h.z).add(this.v)
      this.hand.scale.setScalar(k)
      ;(this.hand.material as THREE.MeshBasicMaterial).opacity = h.opacity
    }
  }

  private stepUnder(pose: Pose): number {
    return (pose.z > 0.65 ? -0.75 : pose.z > -2.15 ? -0.1 : 0.55) + 0.012
  }

  warm(): void {
    this.renderer.compile(this.scene, this.camera)
    this.studio.compile(this.renderer)
  }

  render(): void {
    this.renderer.render(this.scene, this.camera)
    this.counts.drawCalls = this.renderer.info.render.calls
    this.counts.triangles = this.renderer.info.render.triangles
  }

  dispose(): void {
    for (const thing of this.bin) thing.dispose()
    for (const mesh of [this.stands, this.keys, this.shade, this.flecks, this.glow]) mesh.dispose()
    this.studio.dispose()
    this.renderer.dispose()
  }
}

/** A pale tin hand, pointing up and to the left. */
function handPrint(): HTMLCanvasElement {
  const { sheet, pen } = canvas(SHEET / 4, SHEET / 4)
  pen.translate(60, 46)
  pen.rotate(-0.5)
  pen.lineJoin = 'round'
  pen.lineCap = 'round'
  const shape = (): void => {
    pen.beginPath()
    pen.roundRect(-18, 0, 38, 120, 19)
    pen.roundRect(16, 62, 34, 70, 17)
    pen.roundRect(44, 70, 32, 64, 16)
    pen.roundRect(70, 80, 30, 58, 15)
    pen.roundRect(-18, 90, 118, 86, 34)
    pen.ellipse(-26, 116, 20, 42, 0.5, 0, 7)
  }
  shape()
  pen.strokeStyle = '#5a3a2a'
  pen.lineWidth = 16
  pen.stroke()
  shape()
  pen.fillStyle = '#fff3dc'
  pen.fill()
  pen.fillStyle = '#1f8a8c'
  pen.beginPath()
  pen.roundRect(-14, 172, 112, 34, 12)
  pen.fill()
  return sheet
}
