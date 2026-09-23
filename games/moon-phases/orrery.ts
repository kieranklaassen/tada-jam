import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { PHASE_COUNT, TAU, litPath, phaseAngle } from './phase'
import { cloudCanvas, earthCanvas, glowCanvas, moonCanvases, sunCanvas, woodCanvas } from './textures'

// A tabletop orrery: a lamp for the sun, Earth on a brass post, and the moon on
// a brass arm. Light from the sun is parallel (a DirectionalLight), so the moon
// is always exactly half lit, and what changes is how much of that lit half
// faces Earth. A second camera stands in a child's shoes on Earth.
//
// Layer 0 holds what exists "in space" (sun, Earth, moon, stars). Layer 1 holds
// the model around it (table, brass, the child, light specks, helpers), which
// the view from Earth leaves out.

export const EARTH_R = 0.8
export const MOON_R = 0.34
export const ORBIT_R = 3.3
export const PLANE_Y = 1.7
const SUN_X = -7.3
const TABLE_R = 8.4
/** How far north the child stands; the moon then sits low over their horizon. */
const KID_LAT = 1.05
const MODEL = 1

type Photon = { lane: THREE.Vector2; x: number; speed: number }

const ease = (t: number) => t * t * (3 - 2 * t)

function canvasTexture(canvas: HTMLCanvasElement, color = true) {
  const texture = new THREE.CanvasTexture(canvas)
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

function phaseMedallion(index: number) {
  const size = 160, r = 52
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.translate(size / 2, size / 2)
  ctx.fillStyle = '#f3e3bf'; ctx.beginPath(); ctx.arc(0, 0, 76, 0, TAU); ctx.fill()
  ctx.strokeStyle = '#b8894a'; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(0, 0, 72, 0, TAU); ctx.stroke()
  ctx.fillStyle = '#1b2446'; ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.fill()
  ctx.fillStyle = '#34405f'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill()
  const path = litPath(phaseAngle(index), r)
  if (path) { ctx.fillStyle = '#fff4d2'; ctx.fill(new Path2D(path)) }
  return canvasTexture(canvas)
}

export class Orrery {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(36, 1, 0.01, 200)
  eyeCamera = new THREE.PerspectiveCamera(13, 1, 0.01, 200)
  overheadCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 200)
  /** Orbit of the grown-up's view around the model. */
  view = { azimuth: 0.18, elevation: 0.5, distance: 16 }
  /** 0 = looking at the model, 1 = standing on Earth. */
  pov = 0
  showHalves = false
  elongation = 0
  moon: THREE.Mesh
  medallions: THREE.Mesh[] = []
  private earth: THREE.Mesh
  private clouds: THREE.Mesh
  private arm = new THREE.Group()
  private kid = new THREE.Group()
  private kidArm: THREE.Object3D
  private sunGlow: THREE.Sprite[] = []
  private sun!: THREE.Mesh
  private halves = new THREE.Group()
  private seenHalf = new THREE.Group()
  private litRing: THREE.Mesh
  private sight: THREE.Line
  private photons: Photon[] = []
  private photonPoints: THREE.Points
  private stars: THREE.Points[] = []
  private disposables: { dispose(): void }[] = []
  private time = 0
  private halvesFade = 0
  /** A pulsing ring that invites the first drag; cleared once the child grabs the moon. */
  showHint = true
  private hint: THREE.Sprite
  private temp = { a: new THREE.Vector3(), b: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4() }

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.05
    this.renderer.setClearColor('#0b1230')
    this.camera.layers.enable(MODEL)
    this.overheadCamera.layers.enable(MODEL)
    this.overheadCamera.position.set(0.6, 15, 5.4)
    this.overheadCamera.lookAt(-0.6, 0, 0)

    const track = <T extends { dispose(): void }>(thing: T) => { this.disposables.push(thing); return thing }
    const inModel = (object: THREE.Object3D) => { object.traverse(child => child.layers.set(MODEL)); return object }

    // Brass only reflects a soft studio; the environment is not a light, so the
    // moon's night side stays dark.
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    const envMap = track(pmrem.fromScene(room, 0.04).texture)
    room.dispose(); pmrem.dispose()
    const brass = track(new THREE.MeshStandardMaterial({ color: '#c8964a', metalness: 0.9, roughness: 0.32, envMap, envMapIntensity: 1.1 }))
    const darkBrass = track(new THREE.MeshStandardMaterial({ color: '#8a6232', metalness: 0.85, roughness: 0.4, envMap, envMapIntensity: 0.8 }))

    // Light: parallel sun rays, a warm lamp glow for the tabletop, faint earthshine.
    const sunLight = new THREE.DirectionalLight('#fff3dc', 3.2)
    sunLight.position.set(SUN_X, PLANE_Y, 0); sunLight.target.position.set(0, PLANE_Y, 0)
    this.scene.add(sunLight, sunLight.target)
    const lamp = new THREE.PointLight('#ffc978', 40, 16, 1.6)
    lamp.position.set(SUN_X + 0.4, PLANE_Y + 0.2, 0)
    this.scene.add(lamp, new THREE.AmbientLight('#9fb2ff', 0.07))

    // The table and its lamp-lit wood. Emissive keeps the far edge readable
    // without adding a light that would reach the moon's dark side.
    const woodMap = track(canvasTexture(woodCanvas()))
    const table = new THREE.Mesh(
      track(new THREE.CylinderGeometry(TABLE_R, TABLE_R * 0.98, 0.4, 128)),
      [
        track(new THREE.MeshStandardMaterial({ color: '#6b3f22', roughness: 0.7, emissive: '#2a170b', emissiveIntensity: 0.6 })),
        track(new THREE.MeshStandardMaterial({ map: woodMap, roughness: 0.55, emissive: '#ffffff', emissiveMap: woodMap, emissiveIntensity: 0.3 })),
        track(new THREE.MeshStandardMaterial({ color: '#4a2a16' })),
      ],
    )
    table.position.y = -0.2
    const rim = new THREE.Mesh(track(new THREE.TorusGeometry(TABLE_R, 0.06, 12, 160)), brass)
    rim.rotation.x = Math.PI / 2
    this.scene.add(inModel(table), inModel(rim))

    // A groove for the moon's path, with the eight phases set into the table.
    const groove = new THREE.Mesh(track(new THREE.RingGeometry(ORBIT_R - 0.03, ORBIT_R + 0.03, 160)), track(new THREE.MeshBasicMaterial({ color: '#f1d9a8', transparent: true, opacity: 0.45 })))
    groove.rotation.x = -Math.PI / 2; groove.position.y = 0.004
    this.scene.add(inModel(groove))
    const medallionGeometry = track(new THREE.CircleGeometry(0.5, 48))
    for (let i = 0; i < PHASE_COUNT; i++) {
      const angle = Math.PI + phaseAngle(i)
      const material = track(new THREE.MeshBasicMaterial({ map: track(phaseMedallion(i)), toneMapped: false, transparent: true, color: '#d9ccb4' }))
      const medallion = new THREE.Mesh(medallionGeometry, material)
      // Lie flat, then turn so the picture's top points away from Earth: read
      // from the middle of the table, it matches what the child sees.
      medallion.rotation.set(-Math.PI / 2, angle - Math.PI / 2, 0, 'YXZ')
      const reach = ORBIT_R + 1.05
      medallion.position.set(reach * Math.cos(angle), 0.012, -reach * Math.sin(angle))
      medallion.userData.phase = i
      this.medallions.push(medallion); this.scene.add(inModel(medallion))
    }

    // Earth on its post, with drifting clouds.
    const earthMap = track(canvasTexture(earthCanvas()))
    this.earth = new THREE.Mesh(track(new THREE.SphereGeometry(EARTH_R, 96, 64)), track(new THREE.MeshStandardMaterial({ map: earthMap, roughness: 0.75, metalness: 0 })))
    this.earth.position.y = PLANE_Y; this.earth.rotation.order = 'ZYX'; this.earth.rotation.z = 0.41
    this.clouds = new THREE.Mesh(track(new THREE.SphereGeometry(EARTH_R * 1.018, 96, 64)), track(new THREE.MeshStandardMaterial({ map: track(canvasTexture(cloudCanvas())), transparent: true, depthWrite: false, roughness: 1 })))
    this.earth.add(this.clouds)
    const post = new THREE.Mesh(track(new THREE.CylinderGeometry(0.07, 0.09, PLANE_Y - EARTH_R + 0.05, 24)), brass)
    post.position.y = (PLANE_Y - EARTH_R) / 2
    const foot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.5, 0.62, 0.14, 48)), darkBrass)
    foot.position.y = 0.07
    this.scene.add(this.earth, inModel(post), inModel(foot))

    // The moon rides a brass arm, so it keeps one face towards Earth.
    const [moonColor, moonBump] = moonCanvases()
    this.moon = new THREE.Mesh(
      track(new THREE.SphereGeometry(MOON_R, 96, 64)),
      track(new THREE.MeshStandardMaterial({ map: track(canvasTexture(moonColor)), bumpMap: track(canvasTexture(moonBump, false)), bumpScale: 2.2, roughness: 0.95 })),
    )
    this.moon.position.set(ORBIT_R, PLANE_Y, 0)
    const armHeight = 0.62
    const beam = new THREE.Mesh(track(new THREE.CylinderGeometry(0.035, 0.035, ORBIT_R, 16)), brass)
    beam.rotation.z = Math.PI / 2; beam.position.set(ORBIT_R / 2, armHeight, 0)
    const riser = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, PLANE_Y - MOON_R - armHeight, 16)), brass)
    riser.position.set(ORBIT_R, (PLANE_Y - MOON_R + armHeight) / 2, 0)
    const collar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.13, 0.13, 0.12, 24)), darkBrass)
    collar.position.y = armHeight
    const knob = new THREE.Mesh(track(new THREE.SphereGeometry(0.07, 16, 12)), darkBrass)
    knob.position.set(ORBIT_R, armHeight, 0)
    const ringCanvas = document.createElement('canvas')
    ringCanvas.width = ringCanvas.height = 128
    const rc = ringCanvas.getContext('2d')!
    rc.strokeStyle = 'rgba(255,244,210,0.95)'; rc.lineWidth = 5; rc.beginPath(); rc.arc(64, 64, 58, 0, TAU); rc.stroke()
    this.hint = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: track(canvasTexture(ringCanvas)), transparent: true, depthWrite: false })))
    this.hint.position.copy(this.moon.position)
    this.arm.add(this.moon, inModel(beam), inModel(riser), inModel(collar), inModel(knob), inModel(this.hint))
    this.scene.add(this.arm)

    // The sun lamp: a glowing bulb on a brass stand at the edge of the table.
    const sun = new THREE.Mesh(track(new THREE.SphereGeometry(0.85, 64, 40)), track(new THREE.MeshBasicMaterial({ map: track(canvasTexture(sunCanvas())), toneMapped: false })))
    this.sun = sun
    sun.position.set(SUN_X, PLANE_Y, 0)
    const glowTexture = track(canvasTexture(glowCanvas('rgba(255,214,120,1)', 'rgba(255,170,60,0)')))
    for (const [size, opacity] of [[4.2, 0.9], [11, 0.35]] as const) {
      // Glow is light in the lens, not an object: it must not be cut off by the tabletop.
      const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, transparent: true, opacity, toneMapped: false })))
      glow.scale.setScalar(size); glow.position.copy(sun.position); glow.userData.size = size
      this.sunGlow.push(glow); this.scene.add(glow)
    }
    const stand = new THREE.Mesh(track(new THREE.CylinderGeometry(0.08, 0.1, PLANE_Y - 0.8, 24)), brass)
    stand.position.set(SUN_X, (PLANE_Y - 0.8) / 2, 0)
    const standFoot = new THREE.Mesh(track(new THREE.CylinderGeometry(0.55, 0.66, 0.14, 48)), darkBrass)
    standFoot.position.set(SUN_X, 0.07, 0)
    const cup = new THREE.Mesh(track(new THREE.SphereGeometry(0.5, 32, 16, 0, TAU, Math.PI * 0.62, Math.PI * 0.38)), darkBrass)
    cup.position.set(SUN_X, PLANE_Y - 0.28, 0)
    this.scene.add(sun, inModel(stand), inModel(standFoot), inModel(cup))

    // Soft shadows under each stand, since the lamp's light skims the table.
    const shadowTexture = track(canvasTexture(glowCanvas('rgba(20,8,0,0.55)', 'rgba(20,8,0,0)')))
    for (const [x, size] of [[0, 2.2], [SUN_X, 2.2]] as const) {
      const blob = new THREE.Mesh(track(new THREE.PlaneGeometry(size, size)), track(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })))
      blob.rotation.x = -Math.PI / 2; blob.position.set(x, 0.006, 0)
      this.scene.add(inModel(blob))
    }

    // Specks of sunlight streaming across the table, stopped by whatever they hit.
    const photonCount = 110
    const positions = new Float32Array(photonCount * 3), colors = new Float32Array(photonCount * 3)
    for (let i = 0; i < photonCount; i++) {
      this.photons.push({ lane: new THREE.Vector2((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 8), x: SUN_X + Math.random() * 14, speed: 2.2 + Math.random() * 1.4 })
    }
    const photonGeometry = track(new THREE.BufferGeometry())
    photonGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    photonGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    this.photonPoints = new THREE.Points(photonGeometry, track(new THREE.PointsMaterial({ size: 0.17, map: glowTexture, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })))
    this.photonPoints.frustumCulled = false
    this.scene.add(inModel(this.photonPoints))

    // Stars on a far sphere, in two sets that twinkle out of step.
    for (let set = 0; set < 2; set++) {
      const count = 700, star = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const u = Math.random() * 2 - 1, theta = Math.random() * TAU, r = 80
        const s = Math.sqrt(1 - u * u)
        star[i * 3] = r * s * Math.cos(theta); star[i * 3 + 1] = r * u; star[i * 3 + 2] = r * s * Math.sin(theta)
      }
      const geometry = track(new THREE.BufferGeometry())
      geometry.setAttribute('position', new THREE.BufferAttribute(star, 3))
      const points = new THREE.Points(geometry, track(new THREE.PointsMaterial({ size: set ? 1.6 : 1.1, sizeAttenuation: false, color: set ? '#fff5da' : '#cbd6ff', transparent: true, depthWrite: false })))
      this.stars.push(points); this.scene.add(points)
    }

    // A small child on Earth, pointing at the moon.
    const coat = track(new THREE.MeshStandardMaterial({ color: '#e0553d', roughness: 0.6, emissive: '#e0553d', emissiveIntensity: 0.25 }))
    const skin = track(new THREE.MeshStandardMaterial({ color: '#f0c29a', roughness: 0.7, emissive: '#f0c29a', emissiveIntensity: 0.25 }))
    const hat = track(new THREE.MeshStandardMaterial({ color: '#f2c14e', roughness: 0.6, emissive: '#f2c14e', emissiveIntensity: 0.25 }))
    const body = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.045, 0.07, 6, 12)), coat)
    body.position.y = 0.085
    const head = new THREE.Mesh(track(new THREE.SphereGeometry(0.042, 20, 14)), skin)
    head.position.y = 0.19
    const beanie = new THREE.Mesh(track(new THREE.SphereGeometry(0.045, 20, 10, 0, TAU, 0, Math.PI / 2)), hat)
    beanie.position.y = 0.2
    const pom = new THREE.Mesh(track(new THREE.SphereGeometry(0.016, 10, 8)), hat)
    pom.position.y = 0.25
    this.kidArm = new THREE.Group()
    const sleeve = new THREE.Mesh(track(new THREE.CapsuleGeometry(0.014, 0.08, 4, 8)), coat)
    sleeve.position.y = 0.055
    this.kidArm.add(sleeve); this.kidArm.position.set(0.04, 0.13, 0)
    this.kid.add(body, head, beanie, pom, this.kidArm)
    this.kid.scale.setScalar(1.7)
    this.scene.add(inModel(this.kid))

    // "Halves" helpers: the half of the moon that faces Earth (blue) and the
    // edge between its day and night (gold).
    const seenMaterial = track(new THREE.MeshBasicMaterial({ color: '#6fb6ff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide }))
    const cap = new THREE.Mesh(track(new THREE.SphereGeometry(MOON_R * 1.12, 48, 24, 0, TAU, 0, Math.PI / 2)), seenMaterial)
    cap.rotation.z = Math.PI / 2
    const seenRing = new THREE.Mesh(track(new THREE.TorusGeometry(MOON_R * 1.12, 0.012, 8, 64)), track(new THREE.MeshBasicMaterial({ color: '#8cc8ff', transparent: true })))
    seenRing.rotation.y = Math.PI / 2
    this.seenHalf.add(cap, seenRing)
    this.litRing = new THREE.Mesh(track(new THREE.TorusGeometry(MOON_R * 1.05, 0.014, 8, 64)), track(new THREE.MeshBasicMaterial({ color: '#ffd46e', transparent: true })))
    this.litRing.rotation.y = Math.PI / 2
    const sightGeometry = track(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(1, 0, 0)]))
    this.sight = new THREE.Line(sightGeometry, track(new THREE.LineDashedMaterial({ color: '#8cc8ff', dashSize: 0.08, gapSize: 0.06, transparent: true })))
    this.halves.add(this.seenHalf, this.litRing, this.sight)
    this.scene.add(inModel(this.halves))

    this.setMoon(0)
  }

  setMoon(elongation: number) {
    this.elongation = elongation
    this.arm.rotation.y = Math.PI + elongation
  }

  /** Where the child stands: on the side of Earth facing the moon, a little north. */
  private kidFrame() {
    const angle = Math.PI + this.elongation
    const toMoon = this.temp.a.set(Math.cos(angle), 0, -Math.sin(angle))
    const up = new THREE.Vector3().copy(toMoon).multiplyScalar(Math.cos(KID_LAT)).add(new THREE.Vector3(0, Math.sin(KID_LAT), 0)).normalize()
    const feet = up.clone().multiplyScalar(EARTH_R * 1.005).add(new THREE.Vector3(0, PLANE_Y, 0))
    return { up, feet, toMoon: toMoon.clone() }
  }

  moonWorld(target = new THREE.Vector3()) { return this.moon.getWorldPosition(target) }

  private orreryPose() {
    const { azimuth, elevation, distance } = this.view
    const aspect = this.camera.aspect
    const d = distance * Math.max(1, 1.45 / aspect)
    const target = new THREE.Vector3(-1.4, aspect > 1.8 ? 0.2 : 0.9, 0)
    const position = new THREE.Vector3(
      target.x + d * Math.cos(elevation) * Math.sin(azimuth),
      target.y + d * Math.sin(elevation),
      target.z + d * Math.cos(elevation) * Math.cos(azimuth),
    )
    const q = new THREE.Quaternion().setFromRotationMatrix(this.temp.m.lookAt(position, target, THREE.Object3D.DEFAULT_UP))
    return { position, q, fov: 36 }
  }

  private eyePose(fov: number, tilt = 0) {
    const { up, feet } = this.kidFrame()
    // Eye close to the ground: on a globe this small, standing any higher sinks the horizon out of view.
    const position = feet.clone().addScaledVector(up, 0.045)
    const moon = this.moonWorld(new THREE.Vector3())
    const q = new THREE.Quaternion().setFromRotationMatrix(this.temp.m.lookAt(position, moon, THREE.Object3D.DEFAULT_UP))
    // Tip the view down a little so the ground the child stands on shows at the bottom.
    if (tilt) q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -tilt))
    return { position, q, fov }
  }

  update(dt: number) {
    this.time += dt
    const t = this.time
    this.earth.rotation.y += dt * 0.12
    this.clouds.rotation.y += dt * 0.02
    this.sun.rotation.y += dt * 0.05
    for (const [i, glow] of this.sunGlow.entries()) glow.scale.setScalar(glow.userData.size * (1 + Math.sin(t * (1.3 + i * 0.4)) * 0.035))
    this.stars.forEach((points, i) => { (points.material as THREE.PointsMaterial).opacity = 0.65 + Math.sin(t * (0.9 + i * 0.7) + i * 2) * 0.3 })

    // The child turns to face the moon and points at it.
    const { up, feet, toMoon } = this.kidFrame()
    this.kid.position.copy(feet)
    const forward = toMoon.clone().addScaledVector(up, -toMoon.dot(up)).normalize()
    const right = new THREE.Vector3().crossVectors(up, forward).normalize()
    this.kid.quaternion.setFromRotationMatrix(this.temp.m.makeBasis(right, up, forward.clone().negate()))
    this.kid.position.addScaledVector(up, Math.abs(Math.sin(t * 3)) * 0.008)
    this.kidArm.rotation.set(-1.25 - Math.sin(t * 2) * 0.08, 0, -0.15)

    // Light specks travel from the lamp until they reach Earth, the moon, or the far edge.
    const moon = this.moonWorld(this.temp.b)
    const positions = this.photonPoints.geometry.getAttribute('position') as THREE.BufferAttribute
    const colors = this.photonPoints.geometry.getAttribute('color') as THREE.BufferAttribute
    this.photons.forEach((p, i) => {
      const y = PLANE_Y + p.lane.x, z = p.lane.y
      let stop = TABLE_R - 0.6
      const earthD = Math.hypot(y - PLANE_Y, z)
      if (earthD < EARTH_R) stop = Math.min(stop, -Math.sqrt(EARTH_R * EARTH_R - earthD * earthD))
      const moonD = Math.hypot(y - moon.y, z - moon.z)
      if (moonD < MOON_R) stop = Math.min(stop, moon.x - Math.sqrt(MOON_R * MOON_R - moonD * moonD))
      p.x += p.speed * dt
      if (p.x > stop) { p.x = SUN_X + 0.9; p.lane.set((Math.random() - 0.5) * 2.4, (Math.random() - 0.5) * 8) }
      const fade = Math.min(1, (p.x - SUN_X - 0.9) * 1.5, (stop - p.x) * 2.5) * 0.85
      positions.setXYZ(i, p.x, y, z)
      colors.setXYZ(i, fade * 1.3, fade * 1.05, fade * 0.6)
    })
    positions.needsUpdate = true; colors.needsUpdate = true

    // Halves fade in and out; they sit on the moon, the blue half turned to Earth.
    this.halvesFade += ((this.showHalves ? 1 : 0) - this.halvesFade) * Math.min(1, dt * 6)
    this.halves.visible = this.halvesFade > 0.01
    this.halves.position.copy(moon)
    this.seenHalf.rotation.y = Math.PI + this.elongation
    this.halves.traverse(child => {
      const material = (child as THREE.Mesh).material as THREE.Material & { opacity: number } | undefined
      if (material && 'opacity' in material) material.opacity = (child === this.seenHalf.children[0] ? 0.22 : 0.9) * this.halvesFade
    })
    const head = feet.clone().addScaledVector(up, 0.34).sub(moon)
    const sight = this.sight.geometry.getAttribute('position') as THREE.BufferAttribute
    sight.setXYZ(0, head.x, head.y, head.z); sight.setXYZ(1, 0, 0, 0); sight.needsUpdate = true
    this.sight.computeLineDistances()

    const pulse = (t * 0.7) % 1
    this.hint.visible = this.showHint && this.pov < 0.5
    this.hint.scale.setScalar(MOON_R * 2 * (1.25 + pulse * 0.9))
    ;(this.hint.material as THREE.SpriteMaterial).opacity = (1 - pulse) * 0.9

    // Medallions: the current phase lifts and glows a little.
    const current = Math.round(this.elongation / (TAU / PHASE_COUNT)) % PHASE_COUNT
    this.medallions.forEach((m, i) => {
      const target = i === current ? 1 : 0
      m.userData.lift = (m.userData.lift ?? 0) + (target - (m.userData.lift ?? 0)) * Math.min(1, dt * 8)
      m.position.y = 0.012 + m.userData.lift * 0.06
      m.scale.setScalar(1 + m.userData.lift * 0.22)
      ;(m.material as THREE.MeshBasicMaterial).color.setScalar(0.82 + m.userData.lift * 0.18)
    })
  }

  resize(width: number, height: number, dpr: number) {
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
  }

  /**
   * Renders the other point of view into a corner first and hands it to
   * `onInset` to copy into the round window, then paints the main view over it.
   */
  render(width: number, height: number, insetSize: number, onInset: (source: HTMLCanvasElement, size: number) => void) {
    const r = this.renderer
    if (insetSize > 0) {
      r.setScissorTest(true)
      r.setScissor(0, 0, insetSize, insetSize)
      r.setViewport(0, 0, insetSize, insetSize)
      if (this.pov < 0.5) {
        const eye = this.eyePose(13)
        this.eyeCamera.position.copy(eye.position); this.eyeCamera.quaternion.copy(eye.q)
        this.eyeCamera.aspect = 1; this.eyeCamera.updateProjectionMatrix()
        this.kid.visible = false
        r.render(this.scene, this.eyeCamera)
      } else {
        this.overheadCamera.aspect = 1; this.overheadCamera.updateProjectionMatrix()
        this.kid.visible = true
        r.render(this.scene, this.overheadCamera)
      }
      onInset(r.domElement, insetSize)
      r.setScissorTest(false)
    }
    const k = ease(this.pov)
    const a = this.orreryPose(), b = this.eyePose(60, 0.3)
    this.camera.position.lerpVectors(a.position, b.position, k)
    this.camera.quaternion.slerpQuaternions(a.q, b.q, k)
    this.camera.fov = a.fov + (b.fov - a.fov) * k
    this.camera.updateProjectionMatrix()
    // Halfway into Earth-view the model falls away and only space remains.
    if (this.pov < 0.5) this.camera.layers.enable(MODEL); else this.camera.layers.disable(MODEL)
    this.kid.visible = this.pov < 0.35
    r.setViewport(0, 0, width, height)
    r.render(this.scene, this.camera)
  }

  /** What is under a point in normalised device coordinates. */
  pick(ndc: THREE.Vector2): { kind: 'moon' } | { kind: 'phase'; index: number } | null {
    if (this.pov >= 0.5) return null
    const ray = new THREE.Raycaster()
    ray.layers.enableAll()
    ray.setFromCamera(ndc, this.camera)
    const moonHit = ray.intersectObject(this.moon, false)[0]
    // The moon is small on a phone; accept touches near it too.
    const moonScreen = this.moonWorld(new THREE.Vector3()).project(this.camera)
    if (moonHit || Math.hypot((moonScreen.x - ndc.x) * this.camera.aspect, moonScreen.y - ndc.y) < 0.14) return { kind: 'moon' }
    const hit = ray.intersectObjects(this.medallions, false)[0]
    if (hit) return { kind: 'phase', index: hit.object.userData.phase as number }
    return null
  }

  /** The point on the orbit plane under the pointer, for dragging the moon. */
  orbitPlanePoint(ndc: THREE.Vector2) {
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, this.camera)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANE_Y)
    return ray.ray.intersectPlane(plane, new THREE.Vector3())
  }

  dispose() {
    for (const thing of this.disposables) thing.dispose()
    this.renderer.dispose()
  }
}
