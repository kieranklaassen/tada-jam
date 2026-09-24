import * as THREE from 'three'
import { BALL_SWELL, ballStretch } from '../balls'
import { POWDER_PUFF, type ScarfController } from '../controller'
import { BALL_RADIUS, BASKET, BUTTERFLY, CELL_H, CELL_W, groundY, LOOM, LOOPS, NEEDLE_BAR } from '../layout'
import { clamp01, smooth } from '../springs'
import { ANIMALS, WIDTH } from '../state'
import type { Tier } from '../tiers'
import { ball, beadEye, capsule, cone, cylinder, merge, part } from './shapes'
import { PALETTE, YARN, type BallGlow, type YarnMaterials } from './yarn'

// Everything that moves but is not an animal or a scarf: the yarn balls,
// the strand feeding the needles, the needles, the butterfly that opens the
// mirror, blob shadows, glow rings, woolly puffs, snowfall and the ghost
// hand. Instanced where there are many; every per-frame write goes into
// preallocated matrices and attributes.

const SHADOWS = 20
const GLOWS = 10
const PUFFS = 32
const FLAKES = 220
const THREAD_BEADS = 40
/** How far behind a yarn ball its glow ring sits: just past the basket's back row (`ballRest`). */
const GLOW_BACK = BALL_RADIUS * 2.2

/** A per-instance fade (`aFade`) multiplied into alpha: one draw call, many opacities. */
function withFade(material: THREE.MeshBasicMaterial, key: string): void {
  material.customProgramCacheKey = () => key
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;')
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vFade;')
      .replace('#include <alphamap_fragment>', '#include <alphamap_fragment>\ndiffuseColor.a *= vFade;')
  }
}

function fadeQuads(material: THREE.Material, capacity: number, flat: boolean): { mesh: THREE.InstancedMesh; fade: THREE.InstancedBufferAttribute } {
  const geometry = new THREE.PlaneGeometry(1, 1)
  if (flat) geometry.rotateX(-Math.PI / 2)
  const fade = new THREE.InstancedBufferAttribute(new Float32Array(capacity), 1)
  fade.setUsage(THREE.DynamicDrawUsage)
  geometry.setAttribute('aFade', fade)
  const mesh = new THREE.InstancedMesh(geometry, material, capacity)
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
  mesh.frustumCulled = false
  mesh.count = 0
  return { mesh, fade }
}

const STRAND_HEAD = /* glsl */ `
uniform vec3 uFrom;
uniform vec3 uMid;
uniform vec3 uTo;
uniform float uRadius;
`
const STRAND_SHAPE = /* glsl */ `
float st = position.y + 0.5;
vec3 sp = mix(mix(uFrom, uMid, st), mix(uMid, uTo, st), st);
vec3 sd = normalize(2.0 * (1.0 - st) * (uMid - uFrom) + 2.0 * st * (uTo - uMid) + vec3(1e-4));
vec3 sside = normalize(cross(sd, vec3(0.0, 0.0, 1.0)) + vec3(0.0, 1e-4, 0.0));
vec3 sup = cross(sside, sd);
vec3 radial = sside * position.x + sup * position.z;
vec3 objectNormal = radial;
`

/**
 * A wing turns about the body's middle, so each part of it keeps its distance
 * from it however far the wing folds: sewn on this far out, no part of it
 * comes near the head and bead eyes, and folded shut it meets the other wing
 * edge to edge.
 */
const WING_OUT = 0.85
/** The wings fold between lying flat open and shut (radians about the body's middle), never past either. */
export const WING_OPEN = 0.12
export const WING_SHUT = 1.25
/** The butterfly's bob, its hop when tapped, its sway, and how big it swells as it pops in. */
export const BUTTERFLY_MOTION = { bob: 0.25, hop: 2, sway: 0.05, biggest: 1.15 }

export function butterflyWing(): THREE.BufferGeometry {
  const pink = PALETTE.butterfly
  return merge([
    part(ball(4.2, 1, 16), { color: pink, at: [4.4 + WING_OUT, 2.6, 0], scale: [1, 0.85, 0.22], rot: [0, 0, 0.35] }),
    part(ball(3, 1, 14), { color: pink, at: [3.4 + WING_OUT, -2.6, 0], scale: [1, 0.85, 0.22], rot: [0, 0, -0.45] }),
    part(ball(1.35, 1, 10), { color: PALETTE.thread, at: [5.2 + WING_OUT, 3, 0.7], scale: [1, 1, 0.3] }),
    part(ball(0.9, 1, 8), { color: PALETTE.thread, at: [3.6 + WING_OUT, -2.7, 0.55], scale: [1, 1, 0.3] }),
  ])
}

export function butterflyBody(): THREE.BufferGeometry {
  return merge([
    part(capsule(1.05, 6.5, 0.7), { color: PALETTE.butterflyBody }),
    part(ball(1.5, 0.7, 12), { color: PALETTE.butterflyBody, at: [0, 4.6, 0.2] }),
    ...beadEye([-0.62, 4.9, 1.2], 0.42, [0, 0, 1]),
    ...beadEye([0.62, 4.9, 1.2], 0.42, [0, 0, 1]),
    part(cylinder(0.18, 0.18, 3.4, 0.5, 5), { color: PALETTE.butterflyBody, at: [-0.9, 7.2, 0], rot: [0, 0, 0.35] }),
    part(cylinder(0.18, 0.18, 3.4, 0.5, 5), { color: PALETTE.butterflyBody, at: [0.9, 7.2, 0], rot: [0, 0, -0.35] }),
    part(ball(0.5, 0.5, 8), { color: PALETTE.butterfly, at: [-1.5, 8.8, 0], bead: true }),
    part(ball(0.5, 0.5, 8), { color: PALETTE.butterfly, at: [1.5, 8.8, 0], bead: true }),
  ])
}

/** How far the wings are folded: shut until the mirror opens them, breathing, fluttering after a tap `since` seconds ago. */
export function wingFold(open: number, since: number, t: number): number {
  const flap = since < 1 ? Math.sin(since * 26) * (1 - since) * 0.6 : 0
  const breathe = Math.sin(t * 1.4) * 0.08
  return THREE.MathUtils.clamp(THREE.MathUtils.lerp(WING_SHUT, WING_OPEN, open) + breathe + flap, WING_OPEN, WING_SHUT)
}

export class Props {
  readonly group = new THREE.Group()
  private readonly balls: THREE.InstancedMesh
  private readonly ballGlow: BallGlow
  private readonly strand: THREE.Mesh
  private readonly strandMaterial: THREE.MeshStandardMaterial
  private readonly strandUniforms = { uFrom: { value: new THREE.Vector3() }, uMid: { value: new THREE.Vector3() }, uTo: { value: new THREE.Vector3() }, uRadius: { value: 0.45 } }
  private readonly needles: THREE.Mesh
  private readonly loops: THREE.InstancedMesh
  private readonly loopFrames: THREE.Matrix4[] = []
  private loopsFor = -1
  private readonly cream = new THREE.Color(PALETTE.thread)
  private readonly butterfly = new THREE.Group()
  private readonly wingL: THREE.Mesh
  private readonly wingR: THREE.Mesh
  private readonly thread: THREE.InstancedMesh
  private readonly shadows: ReturnType<typeof fadeQuads>
  private readonly glows: ReturnType<typeof fadeQuads>
  private readonly puffs: ReturnType<typeof fadeQuads>
  private readonly puffMaterial: THREE.MeshBasicMaterial
  private readonly flakes: THREE.Points
  private readonly flakeMaterial: THREE.ShaderMaterial
  private readonly hand: THREE.Sprite
  private readonly owned: { dispose(): void }[] = []
  private readonly m = new THREE.Matrix4()
  private readonly n = new THREE.Matrix4()
  private readonly p = new THREE.Vector3()
  private readonly q = new THREE.Quaternion()
  private readonly s = new THREE.Vector3()
  private readonly e = new THREE.Euler()
  private readonly v = new THREE.Vector3()
  private readonly colour = new THREE.Color()
  private readonly yarn = YARN.map((hex) => new THREE.Color(hex))
  private readonly white = new THREE.Color('#ffffff')
  private readonly powder = new THREE.Color(PALETTE.powder)

  constructor(materials: YarnMaterials, ballCount: number) {
    const ballGeometry = new THREE.SphereGeometry(BALL_RADIUS, 26, 18)
    this.balls = new THREE.InstancedMesh(ballGeometry, materials.balls, ballCount)
    this.balls.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.balls.frustumCulled = false
    this.balls.name = 'yarn-balls'
    for (let i = 0; i < ballCount; i++) this.balls.setColorAt(i, this.yarn[i])
    this.ballGlow = materials.ballGlow
    this.owned.push(ballGeometry)
    this.group.add(this.balls)

    const strandGeometry = new THREE.CylinderGeometry(1, 1, 1, 6, 36, true)
    this.strandMaterial = new THREE.MeshStandardMaterial({ color: YARN[0], roughness: 0.95 })
    const strandUniforms = this.strandUniforms
    this.strandMaterial.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, strandUniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${STRAND_HEAD}`)
        .replace('#include <beginnormal_vertex>', STRAND_SHAPE)
        .replace('#include <begin_vertex>', 'vec3 transformed = sp + radial * uRadius;')
    }
    this.strandMaterial.customProgramCacheKey = () => 'cosy-strand'
    this.strand = new THREE.Mesh(strandGeometry, this.strandMaterial)
    this.strand.name = 'strand'
    this.strand.frustumCulled = false
    this.strand.matrixAutoUpdate = false
    this.owned.push(strandGeometry, this.strandMaterial)
    this.group.add(this.strand)

    const { radius: needleRadius, length: needleLength, tip, bead, beadAt, apart } = NEEDLE_BAR
    const tipAt = needleLength / 2 + tip / 2
    const needleGeometry = merge([
      ...[-1, 1].flatMap((side) => {
        const tilt = side * NEEDLE_BAR.tilt
        const dz = side * apart
        const dx = Math.cos(tilt)
        const dy = Math.sin(tilt)
        return [
          part(cylinder(needleRadius, needleRadius, needleLength, 0.8, 8), { color: PALETTE.needle, at: [0, 0, dz], rot: [0, 0, Math.PI / 2 + tilt] }),
          part(cone(needleRadius, tip, 0.8, 8), { color: PALETTE.needle, at: [side * tipAt * dx, side * tipAt * dy, dz], rot: [0, 0, side > 0 ? -Math.PI / 2 + tilt : Math.PI / 2 + tilt] }),
          part(ball(bead, 1, 12), { color: side > 0 ? YARN[5] : YARN[2], at: [-side * beadAt * dx, -side * beadAt * dy, dz], bead: true }),
        ]
      }),
    ])
    this.needles = new THREE.Mesh(needleGeometry, materials.crochet)
    this.needles.name = 'needles'
    this.needles.matrixAutoUpdate = false
    this.owned.push(needleGeometry)
    this.group.add(this.needles)

    // The live stitches riding on the needles: cream cast-on loops on an empty loom, then the last row's colours.
    // Each hangs upright from between the two needles, so neither needle runs through its yarn.
    const loopGeometry = new THREE.TorusGeometry(LOOPS.radius, LOOPS.tube, 6, 14)
    this.loops = new THREE.InstancedMesh(loopGeometry, materials.stitches, WIDTH)
    this.loops.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.loops.name = 'needle-loops'
    this.loops.frustumCulled = false
    for (let i = 0; i < WIDTH; i++) {
      this.q.identity()
      this.loopFrames.push(new THREE.Matrix4().compose(new THREE.Vector3((i + 0.5 - WIDTH / 2) * CELL_W, LOOPS.y, 0), this.q, new THREE.Vector3(1, LOOPS.stretch, 1)))
      this.loops.setColorAt(i, this.cream)
    }
    this.owned.push(loopGeometry)
    this.group.add(this.loops)

    const bodyGeometry = butterflyBody()
    const wingGeometry = butterflyWing()
    const body = new THREE.Mesh(bodyGeometry, materials.crochet)
    body.name = 'body'
    this.butterfly.add(body)
    this.wingR = new THREE.Mesh(wingGeometry, materials.crochet)
    this.wingR.name = 'wing-r'
    this.wingL = new THREE.Mesh(wingGeometry, materials.crochet)
    this.wingL.name = 'wing-l'
    this.wingL.scale.x = -1
    this.butterfly.add(this.wingR, this.wingL)
    this.butterfly.position.set(BUTTERFLY.x, BUTTERFLY.y, BUTTERFLY.z)
    this.butterfly.name = 'butterfly'
    this.butterfly.userData.jamObject = 'butterfly'
    this.owned.push(bodyGeometry, wingGeometry)
    this.group.add(this.butterfly)

    const beadGeometry = new THREE.SphereGeometry(0.42, 8, 6)
    this.thread = new THREE.InstancedMesh(beadGeometry, materials.flakes, THREAD_BEADS)
    this.thread.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.thread.name = 'mirror-thread'
    this.thread.frustumCulled = false
    this.thread.count = 0
    this.owned.push(beadGeometry)
    this.group.add(this.thread)

    withFade(materials.shadow, 'cosy-fade-shadow')
    withFade(materials.glow, 'cosy-fade-glow')
    this.shadows = fadeQuads(materials.shadow, SHADOWS, true)
    this.shadows.mesh.name = 'blob-shadows'
    this.shadows.mesh.renderOrder = 1
    this.glows = fadeQuads(materials.glow, GLOWS, false)
    this.glows.mesh.name = 'glow-rings'
    this.glows.mesh.renderOrder = 2
    this.puffMaterial = new THREE.MeshBasicMaterial({ map: materials.textures.blob, transparent: true, depthWrite: false, toneMapped: false })
    withFade(this.puffMaterial, 'cosy-fade-puff')
    this.puffs = fadeQuads(this.puffMaterial, PUFFS, false)
    this.puffs.mesh.name = 'puffs'
    this.puffs.mesh.renderOrder = 3
    for (let i = 0; i < PUFFS; i++) this.puffs.mesh.setColorAt(i, this.white)
    this.owned.push(this.shadows.mesh.geometry, this.glows.mesh.geometry, this.puffs.mesh.geometry, this.puffMaterial)
    this.group.add(this.shadows.mesh, this.glows.mesh, this.puffs.mesh)

    const seeds = new Float32Array(FLAKES * 4)
    for (let i = 0; i < FLAKES; i++) {
      const a = Math.sin(i * 12.9898) * 43758.5453
      const b = Math.sin(i * 78.233) * 12345.6789
      seeds[i * 4] = ((a - Math.floor(a)) * 2 - 1) * 170
      seeds[i * 4 + 1] = -230 + (b - Math.floor(b)) * 235
      seeds[i * 4 + 2] = (i * 0.618) % 1
      seeds[i * 4 + 3] = ((a * 7) % 1 + 1) % 1
    }
    const flakeGeometry = new THREE.BufferGeometry()
    flakeGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(FLAKES * 3), 3))
    flakeGeometry.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 4))
    this.flakeMaterial = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uScale: { value: 400 } },
      vertexShader: /* glsl */ `
        attribute vec4 aSeed;
        uniform float uTime;
        uniform float uScale;
        varying float vAlpha;
        void main() {
          float speed = 4.0 + aSeed.w * 4.0;
          float fall = mod(aSeed.z * 140.0 - uTime * speed, 140.0) - 12.0;
          vec3 p = vec3(aSeed.x + sin(uTime * 0.5 + aSeed.z * 6.28) * 4.0, fall, aSeed.y + cos(uTime * 0.4 + aSeed.z * 9.0) * 2.5);
          vec4 mv = modelViewMatrix * vec4(p, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = uScale * (0.7 + aSeed.w * 0.9) / -mv.z;
          vAlpha = smoothstep(-12.0, 4.0, fall) * (1.0 - smoothstep(110.0, 128.0, fall));
        }`,
      fragmentShader: /* glsl */ `
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - 0.5);
          if (d > 0.5) discard;
          gl_FragColor = vec4(1.0, 1.0, 1.0, smoothstep(0.5, 0.15, d) * 0.85 * vAlpha);
        }`,
      transparent: true,
      depthWrite: false,
    })
    this.flakes = new THREE.Points(flakeGeometry, this.flakeMaterial)
    this.flakes.frustumCulled = false
    this.flakes.name = 'snowfall'
    this.flakes.renderOrder = 4
    this.owned.push(flakeGeometry, this.flakeMaterial)
    this.group.add(this.flakes)

    this.hand = new THREE.Sprite(materials.hand)
    this.hand.center.set(0.5, 1)
    this.hand.name = 'ghost-hand'
    this.hand.renderOrder = 10
    this.hand.visible = false
    this.group.add(this.hand)
  }

  setTier(tier: Tier, pixelHeight: number, fovDeg: number): void {
    this.flakes.geometry.setDrawRange(0, Math.round(FLAKES * tier.flakes))
    this.flakeMaterial.uniforms.uScale.value = (1.6 * pixelHeight) / (2 * Math.tan(THREE.MathUtils.degToRad(fovDeg / 2)))
  }

  update(game: ScarfController, camera: THREE.Camera, loomHang: THREE.Matrix4, t: number): void {
    this.updateBalls(game)
    this.updateStrand(game, loomHang)
    this.updateNeedles(game, loomHang, t)
    this.updateButterfly(game, t)
    this.updateThread(game, loomHang)
    this.updateShadows(game)
    this.updateGlows(game, camera, loomHang, t)
    this.updatePuffs(game, camera)
    this.updateHand(game)
    this.flakeMaterial.uniforms.uTime.value = t
  }

  private updateBalls(game: ScarfController): void {
    const g = game.guidance
    this.ballGlow.index.value = -1
    this.ballGlow.strength.value = g.glowBalls ? g.frame.glow : 0
    for (let i = 0; i < game.balls.length; i++) {
      const ball = game.balls[i]
      const squash = Math.max(-0.8, Math.min(1.2, ball.squash.x))
      // The suggested ball swells and lights its rim with the glow's breath: the cue is on the ball itself, not only on its ring.
      const suggested = g.glowBalls && ball.colour === g.glowBall
      if (suggested) this.ballGlow.index.value = i
      const swell = suggested ? 1 + (BALL_SWELL - 1) * g.frame.glow : 1
      // The spin turns the wound yarn; the squash and the carry's stretch act in the world's axes, so a landing flattens the ball straight down however it has turned.
      this.e.set(ball.spin, i * 1.3, i * 0.7)
      this.m.makeRotationFromEuler(this.e)
      this.m.premultiply(this.n.makeScale((1 + squash * 0.12) * swell, (1 - squash * 0.2) * swell, (1 + squash * 0.12) * swell))
      this.stretchAlong(ball.carry.x.v, ball.carry.y.v)
      this.m.setPosition(ball.pos.x, ball.pos.y - squash * BALL_RADIUS * 0.2, ball.pos.z)
      this.balls.setMatrixAt(i, this.m)
    }
    this.balls.instanceMatrix.needsUpdate = true
  }

  /** Stretches `m` along a carried ball's path in the screen plane, keeping its volume: the faster it moves, the longer it pulls. */
  private stretchAlong(vx: number, vy: number): void {
    const stretch = ballStretch(vx, vy)
    if (stretch === 0) return
    const speed = Math.hypot(vx, vy)
    const a = 1 + stretch
    const b = 1 / Math.sqrt(a)
    const c = vx / speed
    const s = vy / speed
    const shear = (a - b) * c * s
    this.m.premultiply(this.n.set(a * c * c + b * s * s, shear, 0, 0, shear, a * s * s + b * c * c, 0, 0, 0, 0, b, 0, 0, 0, 0, 1))
  }

  /** The stitch being knitted, in world space, from the loom scarf's hang frame. */
  private stitchPoint(game: ScarfController, loomHang: THREE.Matrix4, row: number, column: number, out: THREE.Vector3): THREE.Vector3 {
    const rows = Math.max(1, game.loom.rows.length)
    return out.set((column + 0.5 - WIDTH / 2) * CELL_W, -(row + 1 - rows / 2) * CELL_H, 0.8).applyMatrix4(loomHang)
  }

  private updateStrand(game: ScarfController, loomHang: THREE.Matrix4): void {
    const strand = game.strand
    this.strand.visible = strand.alpha > 0.04
    if (!this.strand.visible) return
    const from = this.strandUniforms.uFrom.value
    const to = this.strandUniforms.uTo.value
    const ball = strand.ball >= 0 ? game.balls[strand.ball] : null
    if (ball) from.set(ball.pos.x - BALL_RADIUS * 0.6, ball.pos.y + BALL_RADIUS * 0.3, ball.pos.z)
    else from.set(BASKET.x, BASKET.rimY + 2, BASKET.z)
    this.stitchPoint(game, loomHang, strand.row, strand.column, to)
    const mid = this.strandUniforms.uMid.value
    mid.copy(from).lerp(to, 0.5)
    mid.y = Math.min(from.y, to.y) - 4 - from.distanceTo(to) * 0.12
    mid.z += 3
    this.strandUniforms.uRadius.value = 0.5 * Math.min(1, strand.alpha * 1.2)
    this.strandMaterial.color.copy(this.yarn[strand.colour] ?? this.yarn[3])
  }

  private updateNeedles(game: ScarfController, loomHang: THREE.Matrix4, t: number): void {
    const pose = game.needlePose
    const rows = Math.max(1, game.loom.rows.length)
    const castOff = t - game.needles.castOffAt
    let scale = 1
    if (castOff >= 0.35 && castOff < 0.9) scale = 0
    else if (castOff >= 0.9 && castOff < 1.4) scale = clamp01((castOff - 0.9) / 0.5)
    this.needles.visible = scale > 0.01
    this.p.set(pose.x, pose.y + (rows * CELL_H) / 2, NEEDLE_BAR.z)
    this.e.set(0, 0, pose.click)
    this.q.setFromEuler(this.e)
    this.s.setScalar(scale < 1 ? smooth(scale) : 1)
    this.m.compose(this.p, this.q, this.s).premultiply(loomHang)
    this.needles.matrix.copy(this.m)
    this.updateLoops(game, castOff >= 0.9)
  }

  private updateLoops(game: ScarfController, on: boolean): void {
    this.loops.visible = on && this.needles.visible
    if (!this.loops.visible) return
    for (let i = 0; i < WIDTH; i++) this.loops.setMatrixAt(i, this.n.multiplyMatrices(this.needles.matrix, this.loopFrames[i]))
    this.loops.instanceMatrix.needsUpdate = true
    const rows = game.loom.rows
    const shown = Math.min(rows.length, Math.floor(game.loom.reveal / WIDTH + 1e-6))
    const key = (game.loom.id * 4096 + game.loom.version) * 32 + shown
    if (key === this.loopsFor) return
    this.loopsFor = key
    for (let i = 0; i < WIDTH; i++) this.loops.setColorAt(i, shown > 0 ? (this.yarn[rows[shown - 1][i]] ?? this.cream) : this.cream)
    if (this.loops.instanceColor) this.loops.instanceColor.needsUpdate = true
  }

  private updateButterfly(game: ScarfController, t: number): void {
    const show = Math.max(0, game.butterfly.show.x)
    this.butterfly.visible = show > 0.02
    if (!this.butterfly.visible) return
    this.butterfly.scale.setScalar(Math.min(BUTTERFLY_MOTION.biggest, show))
    const since = t - game.butterfly.flapAt
    const fold = wingFold(game.butterfly.open.x, since, t)
    this.wingR.rotation.y = -fold
    this.wingL.rotation.y = fold
    this.butterfly.position.y = BUTTERFLY.y + Math.sin(t * 1.1) * BUTTERFLY_MOTION.bob + (since < 1 ? Math.sin(since * Math.PI) * BUTTERFLY_MOTION.hop : 0)
    this.butterfly.rotation.z = Math.sin(t * 0.7) * BUTTERFLY_MOTION.sway
  }

  private updateThread(game: ScarfController, loomHang: THREE.Matrix4): void {
    const open = game.butterfly.open.x
    const rows = Math.max(1, game.loom.rows.length)
    const length = (game.loom.reveal / WIDTH) * CELL_H
    const count = open > 0.05 ? Math.min(THREAD_BEADS, Math.floor(length / 1.4)) : 0
    this.thread.count = count
    if (count === 0) return
    this.q.identity()
    this.s.setScalar(Math.min(1, open))
    for (let i = 0; i < count; i++) {
      this.p.set(0, rows * CELL_H * 0.5 - 0.7 - i * 1.4, 1.1)
      this.m.compose(this.p, this.q, this.s).premultiply(loomHang)
      this.thread.setMatrixAt(i, this.m)
    }
    this.thread.instanceMatrix.needsUpdate = true
  }

  private shadow(index: number, x: number, z: number, size: number, strength: number): number {
    if (index >= SHADOWS) return index
    this.p.set(x, groundY(x, z) + 0.45, z)
    this.q.identity()
    this.s.set(size, 1, size * 0.8)
    this.m.compose(this.p, this.q, this.s)
    this.shadows.mesh.setMatrixAt(index, this.m)
    this.shadows.fade.setX(index, strength)
    return index + 1
  }

  private updateShadows(game: ScarfController): void {
    let n = 0
    n = this.shadow(n, BASKET.x, BASKET.z + 1, BASKET.radius * 2.9, 0.4)
    n = this.shadow(n, LOOM.x - LOOM.postX, LOOM.z + 1, 9, 0.35)
    n = this.shadow(n, LOOM.x + LOOM.postX, LOOM.z + 1, 9, 0.35)
    for (const ball of game.balls) {
      if (ball.held === null && ball.returning < 0 && ball.hopY < 0.5) continue
      const height = Math.max(0, ball.pos.y - BALL_RADIUS)
      n = this.shadow(n, ball.pos.x, ball.pos.z, BALL_RADIUS * 2.4 * (1 - Math.min(0.5, height / 80)), 0.3 * (1 - Math.min(0.7, height / 70)))
    }
    for (const animal of ANIMALS) {
      const actor = game.actors[animal]
      if (!actor.visible) continue
      n = this.shadow(n, actor.x, actor.z + 1, animal === 'bear' ? 26 : animal === 'penguin' ? 22 : 20, 0.42)
    }
    this.shadows.mesh.count = n
    this.shadows.mesh.instanceMatrix.needsUpdate = true
    this.shadows.fade.needsUpdate = true
  }

  private billboard(target: ReturnType<typeof fadeQuads>, index: number, camera: THREE.Camera, x: number, y: number, z: number, size: number, fade: number): number {
    this.p.set(x, y, z)
    this.s.set(size, size, size)
    this.m.compose(this.p, camera.quaternion, this.s)
    target.mesh.setMatrixAt(index, this.m)
    target.fade.setX(index, fade)
    return index + 1
  }

  private updateGlows(game: ScarfController, camera: THREE.Camera, loomHang: THREE.Matrix4, t: number): void {
    const g = game.guidance
    const strength = g.frame.glow
    let n = 0
    if (strength > 0.01) {
      if (g.glowBalls) {
        for (const ball of game.balls) {
          const suggested = ball.colour === g.glowBall
          // Straight behind the ball as the camera sees it and behind its neighbours, so no ring is drawn across the ball next to it.
          const toward = this.v.set(ball.pos.x, ball.pos.y, ball.pos.z).sub(camera.position)
          const distance = toward.length()
          const back = (distance + GLOW_BACK) / distance
          toward.multiplyScalar(back).add(camera.position)
          n = this.billboard(this.glows, n, camera, toward.x, toward.y, toward.z, BALL_RADIUS * (suggested ? 3.4 : 2.7) * back, strength * (suggested ? 0.95 : 0.4))
        }
      }
      if (g.glowScarf && n < GLOWS - 1) {
        this.v.set(0, 0, -0.6).applyMatrix4(loomHang)
        const rows = game.loom.rows.length
        n = this.billboard(this.glows, n, camera, this.v.x, this.v.y, this.v.z, rows * CELL_H * 1.25, strength * 0.7)
        const animal = game.state.atLoom
        if (animal) {
          const actor = game.actors[animal]
          n = this.billboard(this.glows, n, camera, actor.x, groundY(actor.x, actor.z) + 14, actor.z - 3, 34 + Math.sin(t * 2.4) * 1.5, strength * 0.6)
        }
      }
    }
    this.glows.mesh.count = n
    this.glows.mesh.instanceMatrix.needsUpdate = true
    this.glows.fade.needsUpdate = true
  }

  private updatePuffs(game: ScarfController, camera: THREE.Camera): void {
    let n = 0
    const puffMesh = this.puffs.mesh
    for (const puff of game.puffs) {
      const age = (game.t - puff.t0) / 0.75
      if (age < 0 || age >= 1) continue
      const k = smooth(age)
      n = this.billboard(this.puffs, n, camera, puff.x, puff.y + k * 2.5 * puff.size, puff.z, puff.size * (2.2 + k * 5), (1 - age) * (1 - age) * 0.85)
      puffMesh.setColorAt(n - 1, this.puffColour(puff.colour))
    }
    puffMesh.count = n
    puffMesh.instanceMatrix.needsUpdate = true
    if (puffMesh.instanceColor) puffMesh.instanceColor.needsUpdate = true
    this.puffs.fade.needsUpdate = true
  }

  private puffColour(colour: number): THREE.Color {
    if (colour === POWDER_PUFF) return this.powder
    if (colour < 0) return this.white
    return this.colour.copy(this.yarn[colour] ?? this.white).lerp(this.white, 0.25)
  }

  private updateHand(game: ScarfController): void {
    const g = game.guidance
    this.hand.visible = g.handVisible && g.hand.opacity > 0.01
    if (!this.hand.visible) return
    const press = g.hand.press
    this.hand.position.set(g.hand.x + 1.5, g.hand.y - press * 1.4, g.hand.z + 6)
    this.hand.scale.set(12 * (1 - press * 0.08), 15 * (1 - press * 0.08), 1)
    const material = this.hand.material
    material.opacity = g.hand.opacity * 0.92
    material.rotation = -0.28 + press * 0.06
  }

  dispose(): void {
    for (const thing of this.owned) thing.dispose()
  }
}
