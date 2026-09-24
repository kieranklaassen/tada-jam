import * as THREE from 'three'
import { describe, expect, it } from 'vitest'
import { DEFAULT_TOLERANCE, pairDepth, preparePiece, tolerance, type CameraInfo, type MaterialInfo, type Piece } from '../../scripts/intersections/core'
import { shoulderPitch } from './anatomy'
import { SILENT, TowerController } from './controller'
import { HEAD_PITCH, LANTERN_HALF_SWING, WandererMotion } from './motion'
import { TOWARD_CAMERA } from './projection'
import { ROOMS } from './rooms'
import { deserialize } from './state'
import { buildDoorGeometry, buildRoomGeometry, DOOR } from './view/build'
import { buildBird, buildWanderer } from './view/characters'
import { doorView, groupViews, HALO_DEPTH, MINI_DEPTH, poseDoor, poseGroup, SHADOW_DISC, toHaloDepth, type GroupView } from './view/view'
import { resolveRoom } from './world'

// The tower's blocks, segments and characters, posed from the controller's
// frame exactly as the view draws them, and checked the way the intersection
// audit measures a crossing: one piece may reach into another by 6% of the
// smaller one's middle extent, or a sliver of the view. The wanderer and the
// bird walk, ride, perch and fly through every room as the audit's script
// plays it (scripts/intersections/games/turning-tower.ts).

const W = 1180
const H = 820
const STEP = 33
const SAMPLE_EVERY = 3
const rooms = ROOMS.map(resolveRoom)

const OPAQUE: MaterialInfo = {
  type: 'ShaderMaterial',
  side: THREE.FrontSide,
  transparent: false,
  opacity: 1,
  depthTest: true,
  depthWrite: true,
  polygonOffset: false,
  colorWrite: true,
  customVertex: false,
  renderOrder: 0,
}

const CAMERA: CameraInfo = {
  position: [TOWARD_CAMERA[0] * 80, TOWARD_CAMERA[1] * 80, TOWARD_CAMERA[2] * 80],
  forward: [-TOWARD_CAMERA[0], -TOWARD_CAMERA[1], -TOWARD_CAMERA[2]],
  ortho: true,
  near: 0.1,
  far: 400,
  fov: 0,
  orthoHeight: 14,
  view: new THREE.Matrix4().toArray(),
  projection: new THREE.Matrix4().toArray(),
  viewport: [W, H],
  logDepth: false,
}

const v = new THREE.Vector3()

function piece(name: string, mesh: THREE.Mesh): Piece {
  mesh.updateWorldMatrix(true, false)
  const position = mesh.geometry.getAttribute('position')
  const positions = new Float32Array(position.count * 3)
  for (let i = 0; i < position.count; i++) v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(positions, i * 3)
  const index = mesh.geometry.getIndex()
  return preparePiece({ id: name, mesh: name, label: name, object: name, positions, index: index ? Uint32Array.from(index.array) : null, material: OPAQUE })
}

function shown(object: THREE.Object3D): boolean {
  for (let o: THREE.Object3D | null = object; o; o = o.parent) if (!o.visible) return false
  return true
}

function meshes(root: THREE.Object3D, names: readonly string[]): { name: string; mesh: THREE.Mesh }[] {
  return names.map((name) => {
    const mesh = root.getObjectByName(name)
    if (!(mesh instanceof THREE.Mesh)) throw new Error(`no ${name}`)
    return { name, mesh }
  })
}

type RoomPieces = { arch: Piece; groups: (GroupView | null)[]; cache: Map<string, Piece>[] }

/** The pieces the audit sees in the current room, posed from the controller's frame. */
class Scene {
  private readonly material = new THREE.MeshBasicMaterial()
  private readonly rooms: RoomPieces[] = []
  private readonly walkerShadow = new THREE.Mesh(SHADOW_DISC, this.material)
  private readonly birdShadow = new THREE.Mesh(SHADOW_DISC, this.material)
  private readonly walker = buildWanderer(this.material, new THREE.Object3D(), this.walkerShadow)
  private readonly bird = buildBird(this.material, this.birdShadow)
  private readonly walkerParts = meshes(this.walker.root, ['body', 'head', 'arm', 'staff', 'lantern']).map((p) => ({ ...p, name: `wanderer>${p.name}` }))
  private readonly birdParts = meshes(this.bird.root, ['body', 'head', 'tail', 'wing-left', 'wing-right']).map((p) => ({ ...p, name: `bird>${p.name}` }))
  private readonly door = doorView(this.material)
  private readonly doorParts = meshes(this.door.root, ['frame', 'leaf-left', 'leaf-right', 'light']).map((p) => ({ ...p, name: `door>${p.name}` }))

  constructor(private readonly tower: TowerController) {
    for (const info of tower.rooms) {
      const geometry = buildRoomGeometry(info)
      const root = new THREE.Object3D()
      const arch = new THREE.Mesh(geometry.static, this.material)
      root.add(arch)
      const groups = groupViews(info, geometry.groups, this.material, root)
      this.rooms.push({ arch: piece('architecture', arch), groups, cache: groups.map(() => new Map()) })
    }
  }

  /** Every pair that reaches deeper than the audit allows right now, as `a × b` → depth over its limit. */
  crossings(skip: (a: string, b: string) => boolean): { pair: string; depth: number; limit: number }[] {
    const frame = this.tower.frame
    const room = this.rooms[frame.room]
    const world: { name: string; piece: Piece }[] = [{ name: 'architecture', piece: room.arch }]
    room.groups.forEach((view, g) => {
      if (!view) return
      const key = `${frame.values[g].toFixed(4)} ${frame.dips[g].toFixed(4)}`
      let posed = room.cache[g].get(key)
      if (!posed) {
        poseGroup(view, frame.values[g], frame.dips[g])
        posed = piece(`segment-${g}`, view.object as THREE.Mesh)
        room.cache[g].set(key, posed)
      }
      world.push({ name: `segment-${g}`, piece: posed })
    })
    this.walker.apply(frame.walker)
    this.bird.apply(frame.bird)
    poseDoor(this.door, this.tower.rooms[frame.room].door, frame.door.open, frame.fade)
    const posedParts = (parts: { name: string; mesh: THREE.Mesh }[]) => parts.filter((p) => shown(p.mesh)).map((p) => ({ name: p.name, piece: piece(p.name, p.mesh) }))
    const walker = posedParts(this.walkerParts)
    const bird = posedParts(this.birdParts)
    const shadows = posedParts([
      { name: 'wanderer-shadow', mesh: this.walkerShadow },
      { name: 'bird-shadow', mesh: this.birdShadow },
    ])
    const door = posedParts(this.doorParts)
    const viewSize = W / this.tower.projector.scale
    const out: { pair: string; depth: number; limit: number }[] = []
    const check = (a: { name: string; piece: Piece }, b: { name: string; piece: Piece }) => {
      if (skip(a.name, b.name)) return
      const r = pairDepth(a.piece, b.piece, CAMERA)
      if (!r) return
      const limit = tolerance(a.piece, b.piece, viewSize, DEFAULT_TOLERANCE)
      if (r.depth > limit) out.push({ pair: `${a.name} × ${b.name}`, depth: r.depth, limit })
    }
    for (const part of [...walker, ...bird, ...shadows]) for (const w of [...world, ...door]) check(part, w)
    for (const d of door) for (const w of world) check(d, w)
    for (let i = 0; i < door.length; i++) for (let j = i + 1; j < door.length; j++) check(door[i], door[j])
    for (const w of walker) for (const b of bird) check(w, b)
    for (const s of shadows) for (const c of [...walker, ...bird]) check(s, c)
    for (const w of world) if (w.name !== 'architecture') check(w, world[0])
    return out
  }
}

/** The controller driven the way the audit's driver drives the page: taps, presses and moves in 33 ms steps. */
class Session {
  tower: TowerController
  t = 0
  /** Every room whose door the wanderer went through, in order. */
  readonly entered: string[] = []
  private now = 0
  private pointer: { x: number; y: number } | null = null
  private steps = 0

  constructor(private readonly onSample: (session: Session) => void) {
    this.tower = this.boot(null)
  }

  private boot(saved: unknown): TowerController {
    const tower = new TowerController(deserialize(saved, rooms), { save: () => {}, sound: SILENT, childAge: 7, now: this.now })
    tower.resize(W, H)
    return tower
  }

  room(key: string): void {
    this.tower.dispose()
    this.tower = this.boot({ v: 1, current: key, rooms: {} })
    this.wait(300)
  }

  wait(ms: number): void {
    for (let left = ms; left > 0; left -= STEP) {
      const step = Math.min(STEP, left)
      this.now += step / 1000
      this.t += step
      this.tower.update(step / 1000, this.now)
      const key = this.tower.rooms[this.tower.frame.room].spec.key
      if (this.tower.frame.phase === 'leave' && this.entered.at(-1) !== key) this.entered.push(key)
      if (++this.steps % SAMPLE_EVERY === 0) this.onSample(this)
    }
  }

  private px(p: readonly number[]): { x: number; y: number } {
    return this.tower.projector.toScreen(p[0], p[1], p[2], { x: 0, y: 0 })
  }

  press(p: readonly number[]): void {
    this.pointer = this.px(p)
    this.tower.pointerDown(1, this.pointer.x, this.pointer.y, this.t)
    this.wait(STEP * 2)
  }

  move(p: readonly number[], ms = 400): void {
    const from = this.pointer ?? this.px(p)
    const to = this.px(p)
    const steps = Math.max(1, Math.round(ms / STEP))
    for (let i = 1; i <= steps; i++) {
      const k = i / steps
      this.tower.pointerMove(1, from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, this.t)
      this.wait(STEP)
    }
    this.pointer = to
  }

  release(): void {
    const at = this.pointer ?? { x: 0, y: 0 }
    this.tower.pointerUp(1, at.x, at.y, this.t)
    this.pointer = null
    this.wait(STEP)
  }

  tap(p: readonly number[]): void {
    this.press(p)
    this.release()
  }

  /** Round a turning segment's wheel by `quarters`, as the audit's script circles it. */
  turn(pivot: readonly number[], axis: 'x' | 'y' | 'z', handle: readonly number[], quarters: number, ms: number): void {
    const i = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
    const s = pivot[i] - handle[i]
    const e = [handle[0] + s - pivot[0], handle[1] + s - pivot[1], handle[2] + s - pivot[2]]
    const [u, w] = axis === 'y' ? [e[0], e[2]] : axis === 'x' ? [e[1], e[2]] : [e[0], e[1]]
    const r = Math.max(0.6, Math.hypot(u, w))
    const a0 = axis === 'y' ? Math.atan2(u, w) : Math.atan2(w, u)
    const point = (a: number): number[] => {
      const c = r * Math.cos(a)
      const n = r * Math.sin(a)
      if (axis === 'y') return [pivot[0] + n, pivot[1], pivot[2] + c]
      if (axis === 'x') return [pivot[0], pivot[1] + c, pivot[2] + n]
      return [pivot[0] + c, pivot[1] + n, pivot[2]]
    }
    const sweep = quarters * (Math.PI / 2)
    const steps = Math.max(2, Math.ceil(Math.abs(sweep) / (Math.PI / 9)))
    this.press(point(a0))
    for (let k = 1; k <= steps; k++) this.move(point(a0 + (sweep * k) / steps), ms / steps)
    this.move(point(a0 + sweep), 200)
    this.release()
  }

  slide(grip: readonly number[], axis: 'x' | 'y' | 'z', from: number, to: number, ms: number): void {
    const i = axis === 'x' ? 0 : axis === 'y' ? 1 : 2
    const place = (value: number) => grip.map((g, k) => g + (k === i ? value : 0))
    this.press(place(from))
    this.move(place(to), ms)
    this.move(place(to), 200)
    this.release()
  }
}

const top = (x: number, y: number, z: number) => [x + 0.5, y + 1, z + 0.5]
const arch = (door: readonly number[]) => [door[0], door[1] + 0.55, door[2]]

/** The audit's script, moment by moment. */
function journey(s: Session): void {
  s.wait(7600)
  s.tap([0.5, 2.3, 2.5])
  s.wait(800)
  s.tap([0.5, 2.45, 3.5])
  s.wait(800)
  s.turn([3.5, 2.5, 2.5], 'y', [3.5, 1.75, 2.5], 5, 2200)
  s.wait(800)
  s.tap(arch([6.3, 3, 1.3]))
  s.wait(7200)

  s.room('ferry')
  s.slide([3.5, 2.5, 1.02], 'z', 4, 0, 900)
  s.wait(400)
  s.tap(top(3, 2, 0))
  s.wait(2300)
  s.slide([3.5, 2.5, 1.02], 'z', 0, 4, 900)
  s.wait(600)
  s.tap(arch([6.3, 3, 3.3]))
  s.wait(5200)

  s.room('impossible-stair')
  s.turn([7.5, 4.5, 6.5], 'y', [7.5, 3.72, 6.5], 5, 2200)
  s.wait(800)
  s.tap(arch([9.3, 5, 5.3]))
  s.wait(7300)

  s.room('bird-bridge')
  s.slide([3.5, 2.45, -1.5], 'z', 0, 3, 700)
  s.wait(1100)
  s.turn([5.5, 2.5, 1.5], 'y', [5.5, 1.72, 1.5], 2, 1000)
  s.wait(700)
  s.tap([3.5, 2.45, 1.5])
  s.wait(700)
  s.tap(arch([5.3, 3, -1.7]))
  s.wait(8500)

  s.room('crank')
  s.turn([3.5, 1.5, 3.5], 'x', [4.06, 1.5, 3.5], -1, 600)
  s.wait(600)
  s.slide([4.02, 1.5, 0.5], 'y', 3, 0, 800)
  s.wait(500)
  s.tap(top(3, 1, 0))
  s.wait(3200)
  s.slide([4.02, 1.5, 0.5], 'y', 0, 3, 800)
  s.wait(600)
  s.tap(arch([-1.7, 2, -2.7]))
  s.wait(3400)
}

/**
 * The raised drawbridge stands flush against the path block beside it, and
 * the paver on its hinge cell rests inside that block. The block is drawn
 * with its camera-facing faces only, so the depth is read against its far
 * side; lowering, the hinge cell turns in place inside the block's faces.
 * The audit allows the same pair for the same reason.
 */
const hidden = (a: string, b: string, room: string) => room === 'crank' && a === 'segment-0' && b === 'architecture'

describe('the tower, walked through as the audit plays it', () => {
  it('keeps the wanderer, the bird and their shadows out of the blocks, the segments, the door and each other, the door out of itself and the blocks, and every segment out of the blocks, through every door', () => {
    const worst = new Map<string, string>()
    const deepest = new Map<string, number>()
    let scene: Scene | null = null
    let sceneFor: TowerController | null = null
    const session = new Session((s) => {
      if (sceneFor !== s.tower) {
        scene = new Scene(s.tower)
        sceneFor = s.tower
      }
      const frame = s.tower.frame
      const room = s.tower.rooms[frame.room].spec.key
      for (const hit of scene!.crossings((a, b) => hidden(a, b, room) || hidden(b, a, room))) {
        const key = `${room}: ${hit.pair}`
        if (hit.depth - hit.limit <= (deepest.get(key) ?? 0)) continue
        deepest.set(key, hit.depth - hit.limit)
        worst.set(key, `${key} ${hit.depth.toFixed(3)} deep (limit ${hit.limit.toFixed(3)}) at ${(s.t / 1000).toFixed(2)} s, ${frame.phase}`)
      }
    })
    journey(session)
    expect(session.entered).toEqual(ROOMS.map((r) => r.key))
    expect([...worst.values()]).toEqual([])
  }, 240_000)
})

describe('the bird', () => {
  it('turns, pitches and tilts its head as far as it ever does without sinking it deeper into its body than it rests', () => {
    const tower = new TowerController(deserialize(null, rooms), { save: () => {}, sound: SILENT, childAge: 7, now: 0 })
    tower.resize(W, H)
    const viewSize = W / tower.projector.scale
    tower.dispose()
    const material = new THREE.MeshBasicMaterial()
    const rig = buildBird(material, new THREE.Object3D())
    const [body, head] = meshes(rig.root, ['body', 'head']).map((p) => p.mesh)
    const pose = { x: 0, y: 0, z: 0, heading: 0.4, alpha: 1, bob: 0, squash: 1, pitch: 0, headYaw: 0, headPitch: 0, headTilt: 0, wing: 0, wingLeft: 0, wingRight: 0, tail: 0, puff: 0, scale: 1, ground: 0 }
    let shallowest = Infinity
    let deepest = { depth: 0, at: '' }
    let limit = Infinity
    for (let yaw = -8; yaw <= 8; yaw++) {
      const headYaw = yaw * 0.2
      for (let headPitch = shoulderPitch(headYaw, HEAD_PITCH); headPitch <= HEAD_PITCH + 1e-9; headPitch += 0.1) {
        // A tap's ruffle kicks the tilt past the ±0.35 it picks at random.
        for (const headTilt of [-0.5, -0.35, 0, 0.35, 0.5]) {
          rig.apply({ ...pose, headYaw, headPitch, headTilt })
          rig.root.updateMatrixWorld(true)
          const a = piece('head', head)
          const b = piece('body', body)
          limit = Math.min(limit, tolerance(a, b, viewSize, DEFAULT_TOLERANCE))
          const depth = pairDepth(a, b, CAMERA)?.depth ?? 0
          shallowest = Math.min(shallowest, depth)
          if (depth > deepest.depth) deepest = { depth, at: `yaw ${headYaw.toFixed(1)}, pitch ${headPitch.toFixed(1)}, tilt ${headTilt}` }
        }
      }
    }
    expect(deepest.depth - shallowest, `deepest at ${deepest.at}`).toBeLessThanOrEqual(limit)
  }, 60_000)
})

describe('the wanderer', () => {
  it('swings its lantern in toward its hood as hard as a ride can swing it, from any side, without sinking it into its head or cloak', () => {
    const tower = new TowerController(deserialize(null, rooms), { save: () => {}, sound: SILENT, childAge: 7, now: 0 })
    tower.resize(W, H)
    const viewSize = W / tower.projector.scale
    tower.dispose()
    const rig = buildWanderer(new THREE.MeshBasicMaterial(), new THREE.Object3D(), new THREE.Object3D())
    const parts = meshes(rig.root, ['body', 'head', 'staff', 'lantern'])
    const [body, head, staff, lantern] = parts.map((p) => p.mesh)
    const worst = { over: -Infinity, at: '' }
    const check = (label: string, motion: WandererMotion) => {
      rig.apply(motion.pose)
      rig.root.updateMatrixWorld(true)
      for (const [a, b] of [
        [lantern, head],
        [lantern, body],
        [staff, head],
      ]) {
        const pa = piece(a.name, a)
        const pb = piece(b.name, b)
        const over = (pairDepth(pa, pb, CAMERA)?.depth ?? 0) - tolerance(pa, pb, viewSize, DEFAULT_TOLERANCE)
        if (over > worst.over) Object.assign(worst, { over, at: `${a.name} × ${b.name}, ${label}` })
      }
    }
    const dt = STEP / 1000
    for (let side = 0; side < 8; side++) {
      // The ferry's raft: 4 cells in under a second, then the far stop.
      const motion = new WandererMotion()
      motion.turnWith(side * (Math.PI / 4) - motion.pose.heading)
      let now = 0
      let x = 0
      for (let i = 0; i < 90; i++) {
        now += dt
        if (i >= 20 && i < 50) x += 4.4 * dt
        motion.update(dt, now, x, 0, 0, false, i >= 20)
        check(`heading ${side}/8, ridden to a stop`, motion)
      }
      // A segment settling on its spring rocks its rider; at the lantern's own beat, that swings it as far as it goes.
      const start = now
      for (let i = 0; i < 120; i++) {
        now += dt
        motion.update(dt, now, x + 0.2 * Math.sin(((now - start) * Math.PI) / LANTERN_HALF_SWING), 0, 0, false, true)
        check(`heading ${side}/8, rocked`, motion)
      }
      motion.greet(now, 'swing')
      for (let i = 0; i < 60; i++) {
        now += dt
        motion.update(dt, now, x, 0, 0, false, false)
        check(`heading ${side}/8, swinging it in greeting`, motion)
      }
    }
    expect(worst.over, worst.at).toBeLessThanOrEqual(0)
  }, 60_000)
})

describe('the glows', () => {
  it('float in front of every block of every room, however its segments turn, and behind the ring of little rooms', () => {
    let nearest = -Infinity
    const tower = new TowerController(deserialize(null, rooms), { save: () => {}, sound: SILENT, childAge: 7, now: 0 })
    for (const roomInfo of tower.rooms) {
      const geometry = buildRoomGeometry(roomInfo)
      const root = new THREE.Object3D()
      const staticMesh = new THREE.Mesh(geometry.static)
      root.add(staticMesh)
      const groups = groupViews(roomInfo, geometry.groups, new THREE.MeshBasicMaterial(), root)
      const depthOf = (mesh: THREE.Mesh) => {
        mesh.updateWorldMatrix(true, false)
        const position = mesh.geometry.getAttribute('position')
        for (let i = 0; i < position.count; i++) {
          v.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld)
          nearest = Math.max(nearest, v.x * TOWARD_CAMERA[0] + v.y * TOWARD_CAMERA[1] + v.z * TOWARD_CAMERA[2])
        }
      }
      depthOf(staticMesh)
      roomInfo.spec.groups.forEach((def, g) => {
        const view = groups[g]
        if (!view) return
        const [lo, hi] = def.kind === 'turn' ? (def.limit ?? [0, 3]) : [def.min, def.max]
        for (let value = lo; value <= hi + 1e-9; value += 0.125) {
          poseGroup(view, value)
          depthOf(view.object as THREE.Mesh)
        }
      })
      const door = new THREE.Mesh(buildDoorGeometry().frame)
      door.position.set(...roomInfo.door)
      door.rotation.y = Math.PI / 4
      depthOf(door)
    }
    tower.dispose()
    // The wanderer and the bird stand, ride and fly within a couple of blocks of the rooms' own reach.
    const characters = 2.5
    const halo = new THREE.Vector3(0, DOOR.height, 0)
    toHaloDepth(halo)
    expect(halo.dot(new THREE.Vector3(...TOWARD_CAMERA))).toBeCloseTo(HALO_DEPTH, 9)
    expect(nearest + characters).toBeLessThan(HALO_DEPTH)
    // The ring's farthest slot sits 3 behind MINI_DEPTH; its little rooms are under 2 deep at that size.
    expect(HALO_DEPTH).toBeLessThan(MINI_DEPTH - 3 - 2)
  })
})
