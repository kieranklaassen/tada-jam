import * as THREE from 'three'
import type { Frame } from '../pose'
import { FRIEND_IDS, FRIENDS, PLANK, TRAY, type FriendId } from '../world'
import { handPose, type HandPose } from '../guidance'
import { buildFriend, poseFriend, type FriendView } from './friends'
import { RAKE_AT, RAKE_REACH, buildGrains, buildHand, buildRake } from './props'
import { LIGHT, Sand } from './sand'
import { SandMap } from './sandMap'

// The stage: a shallow wooden tray of pale sand on a cool cloth, a slate plank
// on a dark stone, and the four friends, under one low raking light. Raw
// three.js on the Mount's canvas. No shadow maps and no post pass.

export type Hit = { kind: 'friend'; id: FriendId } | { kind: 'plank'; along: number } | { kind: 'sand'; x: number; z: number } | { kind: 'rake' } | { kind: 'none' }

/** Everything the stage draws in one frame: the playground, and the small things round it. */
export type StageView = {
  frame: Frame
  /** 0 to 1 through the ghost hand's one tap on the friend the glow is on, or null. */
  hand: number | null
  rakeOut: boolean
  /** 0 to 1 while the rake crosses the tray, or null. */
  rakeSweep: number | null
  /** Grains are in the air. */
  grainsFlying: boolean
}

const CLOTH = '#6f8794'
/** The camera looks down the tray from the child's side. */
const EYE = new THREE.Vector3(0, 11.2, 11.6)
const AIM = new THREE.Vector3(0, 1.5, -0.35)
/** What must stay in frame: the tray with its rim, and room above for a toss. */
const FRAME_HALF_WIDTH = 6.9

export class Stage {
  readonly map = new SandMap()
  readonly drawn = { drawCalls: 0, triangles: 0 }
  private readonly renderer: THREE.WebGLRenderer
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.PerspectiveCamera(30, 1, 1, 80)
  private readonly sand: Sand
  private readonly plank: THREE.Mesh
  private readonly friends: Record<FriendId, FriendView>
  private readonly rake = buildRake()
  private readonly hand = buildHand()
  private readonly grains: THREE.Points
  private readonly handNow: HandPose = { travel: 0, press: 0, opacity: 0 }
  private rakeShown = false
  private warmed = false
  private readonly ray = new THREE.Raycaster()
  private readonly pointer = new THREE.Vector2()
  private readonly scratch = new THREE.Vector3()
  private width = 1
  private height = 1

  constructor(canvas: HTMLCanvasElement, grains: Float32Array) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.setClearColor(CLOTH)
    // Reading a program's log back waits for its compile; the game's programs are fixed, so the check is left out.
    this.renderer.debug.checkShaderErrors = false
    this.scene.add(new THREE.HemisphereLight('#eef2ff', '#d9c39a', 2.5))
    const sun = new THREE.DirectionalLight('#fff0d2', 2.6)
    sun.position.copy(LIGHT).multiplyScalar(20)
    this.scene.add(sun)

    this.sand = new Sand(this.map)
    this.scene.add(this.sand.mesh, tray(), stone())
    this.plank = plank()
    this.scene.add(this.plank)
    this.friends = Object.fromEntries(FRIEND_IDS.map((id) => [id, buildFriend(id)])) as Record<FriendId, FriendView>
    for (const id of FRIEND_IDS) {
      this.friends[id].group.visible = false
      this.scene.add(this.friends[id].group)
    }
    this.plank.visible = false
    this.grains = buildGrains(grains)
    this.grains.visible = false
    this.scene.add(this.rake, this.grains, this.hand)
  }

  /**
   * Draws one frame with everything shown, into a buffer that is then drawn over. Whatever first appears in play
   * (the grains at the first knock, the hand, the rake) has by then been compiled and drawn once, so its first
   * real frame costs what every later one does.
   */
  private warmUp(): void {
    const hidden: THREE.Object3D[] = []
    this.scene.traverse((object) => {
      if (!object.visible) {
        hidden.push(object)
        object.visible = true
      }
    })
    const range = this.grains.geometry.drawRange.count
    this.hand.material.opacity = 0.5
    this.renderer.compile(this.scene, this.camera)
    this.renderer.render(this.scene, this.camera)
    this.grains.geometry.setDrawRange(0, range)
    for (const object of hidden) object.visible = false
  }

  /** Sizes the drawing buffer. The Mount keeps the canvas's CSS size. */
  resize(width: number, height: number, dpr: number): void {
    this.width = width
    this.height = height
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    const aspect = width / height
    this.camera.aspect = aspect
    // Step back until the tray fits across, whatever the shape of the surface.
    const direction = this.scratch.copy(EYE).sub(AIM)
    const base = direction.length()
    const halfFov = THREE.MathUtils.degToRad(this.camera.fov / 2)
    const needed = FRAME_HALF_WIDTH / (Math.tan(halfFov) * aspect)
    const distance = Math.max(base, needed + 3.4)
    this.camera.position.copy(AIM).addScaledVector(direction.normalize(), distance)
    this.camera.lookAt(AIM)
    this.camera.updateProjectionMatrix()
    if (!this.warmed) {
      this.warmed = true
      this.warmUp()
    }
  }

  /** How much grain the sand shows: a cheaper tier draws less. */
  setGrain(grain: number): void {
    this.sand.material.uniforms.uGrain.value = grain
  }

  /** Draws a frame. With no view yet (the slot is still being read) it draws the bare tray: sand, rim and stone. */
  render(view: StageView | null): void {
    const frame = view?.frame ?? null
    this.plank.visible = frame !== null
    for (const id of FRIEND_IDS) this.friends[id].group.visible = frame !== null
    if (view && frame) this.lay(view, frame)
    this.sand.sync()
    this.renderer.render(this.scene, this.camera)
    this.drawn.drawCalls = this.renderer.info.render.calls
    this.drawn.triangles = this.renderer.info.render.triangles
  }

  private lay(view: StageView, frame: Frame): void {
    this.plank.rotation.z = -frame.tilt
    const reach = PLANK.halfLength * Math.cos(frame.tilt), drop = PLANK.halfLength * Math.sin(frame.tilt)
    // The plank's shadow: both ends thrown onto the sand along the light.
    const cast = (x: number, y: number, z: number, out: { x: number; z: number }) => {
      out.x = x - (LIGHT.x / LIGHT.y) * y * 0.45
      out.z = z - (LIGHT.z / LIGHT.y) * y * 0.45
    }
    const a = { x: 0, z: 0 }, b = { x: 0, z: 0 }
    cast(-reach, PLANK.pivotHeight + drop, PLANK.z, a)
    cast(reach, PLANK.pivotHeight - drop, PLANK.z, b)
    this.sand.setPlankShadow(a.x, a.z, b.x, b.z)
    FRIEND_IDS.forEach((id, index) => {
      const pose = frame.poses[id], spec = FRIENDS[id]
      poseFriend(this.friends[id], pose)
      cast(pose.x, pose.y, pose.z, a)
      // A friend high in the air throws a smaller, fainter shadow further off.
      const fade = 1 / (1 + pose.y * 0.22)
      this.sand.setShadow(index, a.x + spec.radius * 1.25, a.z + spec.radius * 0.42, spec.radius * (0.92 + pose.y * 0.03), 0.9 * fade)
    })
    const uniforms = this.sand.material.uniforms
    // The idle glow lies on the sand under a friend who stands in it. A friend sitting on the plank or on a head has
    // no sand under it to light, and a ring of light with nobody in it would be a ring: that friend glows itself instead.
    const glowOnSand = frame.glowOn !== null && frame.poses[frame.glowOn].y < 0.2
    uniforms.uGlow.value = glowOnSand ? frame.glow : 0
    for (const id of FRIEND_IDS) {
      const friend = this.friends[id]
      friend.body.material.emissive.copy(friend.full).multiplyScalar(id === frame.glowOn && !glowOnSand ? frame.glow * 0.45 : 0)
    }
    const hand = this.hand
    hand.visible = false
    if (frame.glowOn) {
      const pose = frame.poses[frame.glowOn], spec = FRIENDS[frame.glowOn]
      ;(uniforms.uGlowAt.value as THREE.Vector3).set(pose.x, pose.z, spec.radius)
      if (view.hand !== null) {
        // The ghost hand: it comes down onto the friend's head, presses once and lifts.
        const now = handPose(view.hand, false, this.handNow)
        hand.visible = now.opacity > 0.01
        hand.material.opacity = now.opacity * 0.92
        hand.position.set(pose.x + spec.radius * 0.3, pose.y + spec.halfHeight * 2 + 0.75 - now.press * 0.45, pose.z - spec.radius * 0.5)
      }
    }
    // The rake: out while the sand holds a mark, and across the tray when it is drawn.
    const rake = this.rake
    if (view.rakeOut !== this.rakeShown) {
      this.rakeShown = view.rakeOut
      rake.visible = view.rakeOut
    }
    if (view.rakeSweep !== null) {
      const x = -TRAY.halfWidth + view.rakeSweep * TRAY.halfWidth * 2
      // Drawn along the far rim from one side of the tray to the other; the sand is raked across its whole depth as it passes.
      rake.position.set(x * 0.8, RAKE_AT.y, RAKE_AT.z)
      this.map.rakeUpTo(x)
    } else if (rake.position.x !== RAKE_AT.x) {
      rake.position.set(RAKE_AT.x, RAKE_AT.y, RAKE_AT.z)
    }
    this.grains.visible = view.grainsFlying
    if (view.grainsFlying) this.grains.geometry.attributes.position.needsUpdate = true
  }

  /** What lies under a point of the surface, in CSS pixels: a friend first, then the rake, then the plank, then the sand. */
  pick(x: number, y: number, frame: Frame): Hit {
    this.aim(x, y)
    let best: FriendId | null = null, bestAt = Infinity
    const centre = this.scratch
    for (const id of FRIEND_IDS) {
      const pose = frame.poses[id], spec = FRIENDS[id]
      centre.set(pose.x, pose.y + spec.halfHeight, pose.z)
      // A small hand: the target is a good deal bigger than the body, most of all for the smallest.
      const reach = Math.max(spec.radius * 1.25, 0.82)
      const along = centre.clone().sub(this.ray.ray.origin).dot(this.ray.ray.direction)
      if (along > 0 && this.ray.ray.distanceSqToPoint(centre) < reach * reach && along < bestAt) {
        best = id
        bestAt = along
      }
    }
    if (best) return { kind: 'friend', id: best }
    if (this.rakeShown) {
      const at = this.onPlane(RAKE_AT.y + 0.2)
      if (at && Math.abs(at.x - this.rake.position.x) < RAKE_REACH && Math.abs(at.z - this.rake.position.z) < RAKE_REACH * 0.55) return { kind: 'rake' }
    }
    const plank = this.ray.intersectObject(this.plank, false)[0]
    if (plank) return { kind: 'plank', along: plank.point.x }
    const sand = this.onPlane(0)
    if (sand && Math.abs(sand.x) <= TRAY.halfWidth && Math.abs(sand.z) <= TRAY.halfDepth) return { kind: 'sand', x: sand.x, z: sand.z }
    return { kind: 'none' }
  }

  /** Where the finger is over the tray, on the level plane at `height`: where a carried friend hangs. */
  pointAt(x: number, y: number, height: number): { x: number; z: number } | null {
    this.aim(x, y)
    const at = this.onPlane(height)
    return at ? { x: at.x, z: at.z } : null
  }

  /** Where the finger is on the sand, or null when it is off the tray. */
  sandAt(x: number, y: number): { x: number; z: number } | null {
    this.aim(x, y)
    const at = this.onPlane(0)
    return at && Math.abs(at.x) <= TRAY.halfWidth && Math.abs(at.z) <= TRAY.halfDepth ? { x: at.x, z: at.z } : null
  }

  private aim(x: number, y: number): void {
    this.pointer.set((x / this.width) * 2 - 1, -(y / this.height) * 2 + 1)
    this.ray.setFromCamera(this.pointer, this.camera)
  }

  private onPlane(height: number): THREE.Vector3 | null {
    const { origin, direction } = this.ray.ray
    if (direction.y >= -1e-4) return null
    const t = (height - origin.y) / direction.y
    return new THREE.Vector3().copy(origin).addScaledVector(direction, t)
  }

  dispose(): void {
    this.sand.dispose()
    this.scene.traverse((object) => {
      const mesh = object as THREE.Mesh
      if (mesh.isMesh) {
        mesh.geometry.dispose()
        const material = mesh.material as THREE.Material | THREE.Material[]
        for (const one of Array.isArray(material) ? material : [material]) one.dispose()
      }
    })
    this.renderer.dispose()
  }
}

/** The tray: four walnut rails round the sand, one mesh. */
function tray(): THREE.Mesh {
  const { halfWidth: w, halfDepth: d, rimHeight: h, rimThick: t } = TRAY
  const shape = new THREE.Shape()
  shape.moveTo(-w - t, -d - t)
  shape.lineTo(w + t, -d - t)
  shape.lineTo(w + t, d + t)
  shape.lineTo(-w - t, d + t)
  shape.closePath()
  const hole = new THREE.Path()
  hole.moveTo(-w, -d)
  hole.lineTo(-w, d)
  hole.lineTo(w, d)
  hole.lineTo(w, -d)
  hole.closePath()
  shape.holes.push(hole)
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: h + 0.2, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 2 })
  geometry.rotateX(-Math.PI / 2)
  geometry.translate(0, -0.2, 0)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#5a3b2a', roughness: 0.6 }))
  mesh.name = 'tray'
  return mesh
}

/** The stone the plank rests on: a dark dome half sunk in the sand. */
function stone(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(PLANK.stoneRadius, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.5)
  geometry.scale(1.25, PLANK.pivotHeight / PLANK.stoneRadius, 1.05)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#2f3340', roughness: 0.5 }))
  mesh.position.z = PLANK.z
  mesh.name = 'stone'
  return mesh
}

/** The plank: a long flat slate, turning about the top of the stone. */
function plank(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(PLANK.halfLength * 2, PLANK.thickness, PLANK.halfWidth * 2, 1, 1, 1)
  geometry.translate(0, PLANK.thickness / 2, 0)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#56617a', roughness: 0.42 }))
  mesh.position.set(0, PLANK.pivotHeight, PLANK.z)
  mesh.name = 'plank'
  return mesh
}
