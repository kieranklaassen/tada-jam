import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { SNAIL, type SnailPose } from '../visitor'

// The snail on the boards behind the tray: a banded shell on a pale foot,
// with two eyes on stalks. Its colours are the floor's own greys warmed a
// little, so it is plain to see and still quieter than anything in the tray.

export type SnailView = { group: THREE.Group; shell: THREE.Mesh; foot: THREE.Mesh; first: THREE.Mesh; second: THREE.Mesh; shade: THREE.Mesh }

const GROUND = -0.2
const FOOT_LONG = 1.8
const STALK = 0.5

/** The shell: a round disc on edge, banded along a coil from its middle. The coil is painted, not modelled. */
function shell(): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(SNAIL.shell, 28, 20)
  geometry.scale(1, 1, 0.56)
  const position = geometry.attributes.position, colour = new Float32Array(position.count * 3)
  const light = new THREE.Color('#e6cfb0'), dark = new THREE.Color('#8e6a58'), mixed = new THREE.Color()
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i), y = position.getY(i)
    const r = Math.hypot(x, y) / SNAIL.shell, angle = Math.atan2(y, x) / (Math.PI * 2)
    // A band that winds outward two and a half times: dark where the coil's seam runs.
    const coil = (((angle + r * 2.5) % 1) + 1) % 1
    const seam = Math.max(0, 1 - Math.abs(coil - 0.5) * 7)
    mixed.copy(light).lerp(dark, seam * 0.9)
    colour.set([mixed.r, mixed.g, mixed.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3))
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.38 }))
  mesh.name = 'snail-shell'
  return mesh
}

/** The foot: a long soft body lying on the boards, its head end a little raised. Built reaching forward from under the shell. */
function foot(): THREE.Mesh {
  const body = new THREE.CapsuleGeometry(0.2, FOOT_LONG - 0.4, 6, 14)
  body.rotateZ(Math.PI / 2)
  body.scale(1, 0.8, 1.15)
  body.translate(FOOT_LONG / 2 - 0.55, 0.16, 0)
  const head = new THREE.SphereGeometry(0.24, 16, 12)
  head.scale(1.1, 1, 1)
  head.translate(FOOT_LONG - 0.6, 0.3, 0)
  const mesh = new THREE.Mesh(mergeGeometries([body.toNonIndexed(), head.toNonIndexed()])!, new THREE.MeshStandardMaterial({ color: '#c3ccc6', roughness: 0.5 }))
  mesh.name = 'snail-foot'
  return mesh
}

/** One eye on its stalk, standing up from the head. It grows from its root, so a stalk that is in is simply short. */
function eye(name: string): THREE.Mesh {
  const stalk = new THREE.CylinderGeometry(0.04, 0.055, STALK, 8)
  stalk.translate(0, STALK / 2, 0)
  const ball = new THREE.SphereGeometry(0.105, 12, 10)
  ball.translate(0, STALK + 0.03, 0)
  const geometry = mergeGeometries([stalk.toNonIndexed(), ball.toNonIndexed()])!
  const colour = new Float32Array(geometry.attributes.position.count * 3), skin = new THREE.Color('#c3ccc6'), ink = new THREE.Color('#2b2f3c')
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const at = geometry.attributes.position.getY(i) > STALK - 0.04 ? ink : skin
    colour.set([at.r, at.g, at.b], i * 3)
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colour, 3))
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45 }))
  mesh.name = name
  return mesh
}

/** Its shadow on the boards: a soft dark patch, painted once. The floor is paint and takes no light, so the snail brings its own. */
function shade(): THREE.Mesh {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 64
  const ctx = canvas.getContext('2d')!
  const fall = ctx.createRadialGradient(32, 32, 4, 32, 32, 31)
  fall.addColorStop(0, 'rgba(22, 30, 40, 0.5)')
  fall.addColorStop(1, 'rgba(22, 30, 40, 0)')
  ctx.fillStyle = fall
  ctx.fillRect(0, 0, 64, 64)
  const geometry = new THREE.PlaneGeometry(1, 1)
  geometry.rotateX(-Math.PI / 2)
  const mesh = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }))
  mesh.name = 'snail-shade'
  mesh.renderOrder = 2
  return mesh
}

export function buildSnail(): SnailView {
  const group = new THREE.Group()
  group.name = 'snail'
  const view: SnailView = { group, shell: shell(), foot: foot(), first: eye('snail-eye-first'), second: eye('snail-eye-second'), shade: shade() }
  view.shell.position.set(0, SNAIL.shell * 0.94, 0)
  view.shade.position.y = 0.012
  group.add(view.shade, view.foot, view.shell, view.first, view.second)
  group.position.y = GROUND
  return view
}

export function poseSnail(view: SnailView, pose: SnailPose): void {
  const { group, shell, foot, first, second, shade } = view
  // The shadow lies along the light, to the right of the shell and toward the child, and reaches as far as the foot is out.
  shade.scale.set(SNAIL.shell * 3 + pose.out * 1.1, 1, SNAIL.shell * 2.3)
  // The same way whichever way the snail faces: the light does not turn with it.
  const cos = Math.cos(pose.heading), sin = Math.sin(pose.heading), fallX = 0.3, fallZ = 0.22
  shade.position.x = fallX * cos - fallZ * sin + pose.out * 0.4
  shade.position.z = fallX * sin + fallZ * cos
  group.position.x = pose.x
  group.position.z = pose.z
  group.rotation.y = pose.heading
  // The shell rocks on its foot where it stands; pulled in, it sits a little lower.
  shell.rotation.z = pose.rock
  shell.position.y = SNAIL.shell * (0.9 + 0.04 * pose.out)
  // The foot comes out forward from under the shell, and stretches and gathers as it creeps.
  const long = Math.max(0.02, pose.out) * (0.94 + 0.1 * pose.stretch)
  foot.visible = pose.out > 0.04
  foot.scale.set(long, 0.6 + 0.4 * pose.out, 1)
  // The eyes stand on the head, one a little nearer the tray than the other, and lean toward the tray to look.
  // Peeking, the eyes come out at the rim of the shell, never from inside it.
  const headX = Math.max((FOOT_LONG - 0.6) * long, SNAIL.shell * 0.95), headY = 0.46 * (0.6 + 0.4 * pose.out)
  for (const [stalk, out, side] of [[first, pose.first, 1], [second, pose.second, -1]] as const) {
    stalk.visible = out > 0.04
    stalk.position.set(headX, headY, side * 0.12)
    stalk.scale.set(1, Math.max(0.05, out), 1)
    stalk.rotation.set(side * 0.28 + pose.look * 0.45 * cos, 0, -0.25)
  }
}
