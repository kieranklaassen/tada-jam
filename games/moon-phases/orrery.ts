import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { PHASE_COUNT, TAU, litPath, phaseAngle } from './phase'
import { cloudCanvas, earthCanvases, glowCanvas, moonCanvases, scaleCanvas, sunCanvas, woodCanvas } from './textures'

// A brass orrery on a varnished table in a dim room at night. The sun lamp's
// light is parallel (a DirectionalLight), so the moon is always exactly half
// lit; what changes is how much of that lit half faces Earth. A second camera
// stands in a child's shoes on Earth.
//
// Layers: SPACE (0) is what exists in space: sun, Earth, moon. MODEL (1) is the
// model and the room around it, which the view from Earth leaves out. SKY (2)
// is the starfield, which only the view from Earth shows.

export const EARTH_R = 0.8
export const MOON_R = 0.34
export const ORBIT_R = 3.3
export const PLANE_Y = 1.7
const SUN_X = -7.3
const TABLE_R = 8.4
/** How far north the child stands; the moon then sits low over their horizon. */
const KID_LAT = 1.05
const MODEL = 1
const SKY = 2
const INTRO_SECONDS = 3.6
const SUN_DIR = new THREE.Vector3(-1, 0, 0)

export type Pin = { kind: 'sun' | 'earth' | 'moon'; x: number; y: number; visible: boolean }

const smooth = (t: number) => t * t * (3 - 2 * t)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

function canvasTexture(canvas: HTMLCanvasElement, color = true) {
  const texture = new THREE.CanvasTexture(canvas)
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** A spur gear as an extruded outline with square-ish teeth and spoked windows. */
function gearGeometry(teeth: number, radius: number, depth: number, hole: number) {
  const shape = new THREE.Shape()
  const tooth = TAU / teeth, inner = radius * 0.9
  for (let i = 0; i < teeth; i++) {
    const a = i * tooth
    const points: [number, number][] = [[a, inner], [a + tooth * 0.18, radius], [a + tooth * 0.5, radius], [a + tooth * 0.68, inner]]
    points.forEach(([angle, r], j) => {
      const x = Math.cos(angle) * r, y = Math.sin(angle) * r
      if (i === 0 && j === 0) shape.moveTo(x, y); else shape.lineTo(x, y)
    })
  }
  shape.closePath()
  const axle = new THREE.Path(); axle.absarc(0, 0, hole, 0, TAU, true); shape.holes.push(axle)
  // Six windows between spokes make it read as a real, machined gear.
  if (radius > 0.7) {
    for (let s = 0; s < 6; s++) {
      const a0 = (s / 6) * TAU + 0.14, a1 = ((s + 1) / 6) * TAU - 0.14, r0 = radius * 0.3, r1 = radius * 0.72
      const window = new THREE.Path()
      window.absarc(0, 0, r1, a0, a1, false); window.absarc(0, 0, r0, a1, a0, true)
      shape.holes.push(window)
    }
  }
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: 6 })
  geometry.rotateX(-Math.PI / 2)
  return geometry
}

/** A turned brass stand, like the foot of an old instrument. */
function latheStand(height: number, footRadius: number) {
  const profile: [number, number][] = [
    [0, 0], [footRadius, 0], [footRadius, 0.05], [footRadius * 0.92, 0.1], [footRadius * 0.7, 0.14], [footRadius * 0.45, 0.2],
    [footRadius * 0.3, 0.28], [0.12, 0.34], [0.09, 0.4], [0.075, height - 0.12], [0.11, height - 0.08], [0.11, height - 0.02], [0.06, height], [0, height],
  ]
  return new THREE.LatheGeometry(profile.map(([x, y]) => new THREE.Vector2(x, y)), 48)
}

function phaseMedallion(index: number) {
  const size = 256, r = 78
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.translate(size / 2, size / 2)
  const enamel = ctx.createRadialGradient(-30, -40, 10, 0, 0, 128)
  enamel.addColorStop(0, '#2a3a78'); enamel.addColorStop(1, '#0f1640')
  ctx.fillStyle = enamel; ctx.beginPath(); ctx.arc(0, 0, 128, 0, TAU); ctx.fill()
  ctx.fillStyle = '#3a4466'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill()
  const path = litPath(phaseAngle(index), r)
  if (path) { ctx.fillStyle = '#fff1c9'; ctx.fill(new Path2D(path)) }
  ctx.strokeStyle = '#e6be72'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, TAU); ctx.stroke()
  return canvasTexture(canvas)
}

// Vignette, a whisper of chromatic fringing and animated grain, applied after tone mapping.
const GradeShader = {
  uniforms: { tDiffuse: { value: null }, time: { value: 0 }, aspect: { value: 1 } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float time; uniform float aspect; varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 d = vUv - 0.5; d.x *= aspect;
      float r = dot(d, d);
      vec2 shift = (vUv - 0.5) * r * 0.012;
      vec3 c = vec3(texture2D(tDiffuse, vUv + shift).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - shift).b);
      c *= mix(1.0, 0.52, smoothstep(0.12, 0.62, r));
      c += (hash(vUv * 900.0 + fract(time) * 37.0) - 0.5) * 0.028;
      gl_FragColor = vec4(c, 1.0);
    }`,
}

/** Depth of field, without letting sprites and glows stamp square holes into the depth buffer. */
class SoftBokehPass extends BokehPass {
  hideFromDepth: THREE.Object3D[] = []
  render(...args: Parameters<BokehPass['render']>) {
    const shown = this.hideFromDepth.map(o => o.visible)
    this.hideFromDepth.forEach(o => { o.visible = false })
    super.render(...args)
    this.hideFromDepth.forEach((o, i) => { o.visible = shown[i] })
  }
}

export class Orrery {
  renderer: THREE.WebGLRenderer
  scene = new THREE.Scene()
  camera = new THREE.PerspectiveCamera(36, 1, 0.01, 300)
  eyeCamera = new THREE.PerspectiveCamera(13, 1, 0.01, 300)
  overheadCamera = new THREE.PerspectiveCamera(34, 1, 0.1, 300)
  /** Where the grown-up's view is heading; the camera eases after it. */
  view = { azimuth: 0.2, elevation: 0.46, distance: 15.5 }
  /** 0 = looking at the model, 1 = standing on Earth. */
  pov = 0
  showHalves = false
  showHint = true
  elongation = 0
  /** 0 → 1 while the opening camera flight plays. */
  intro = 0
  /** Set to false to drop depth of field on slower devices. */
  fancy = true
  moon: THREE.Mesh
  medallions: THREE.Mesh[] = []
  private composer: EffectComposer
  private bokeh: SoftBokehPass
  private bloom: UnrealBloomPass
  private grade: ShaderPass
  private current = { azimuth: 0.2, elevation: 0.46, distance: 15.5 }
  private earth: THREE.Mesh
  private clouds: THREE.Mesh
  private atmosphere: THREE.Mesh
  private sun: THREE.Mesh
  private sunGlow: THREE.Sprite[] = []
  private arm = new THREE.Group()
  private bigGear: THREE.Mesh
  private pinion: THREE.Group
  private kid = new THREE.Group()
  private kidArm: THREE.Object3D
  private halves = new THREE.Group()
  private seenHalf = new THREE.Group()
  private rays: THREE.LineSegments
  private rayMaterial: THREE.ShaderMaterial
  private hint: THREE.Sprite
  private stars: THREE.Points[] = []
  private disposables: { dispose(): void }[] = []
  private time = 0
  private halvesFade = 0
  private m = new THREE.Matrix4()

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping
    this.renderer.toneMappingExposure = 1.0
    this.renderer.setClearColor('#070a16')
    this.camera.layers.enable(MODEL)
    this.overheadCamera.layers.enable(MODEL)
    this.overheadCamera.position.set(0.6, 16, 5.8)
    this.overheadCamera.lookAt(-0.8, 0, 0)
    this.eyeCamera.layers.enable(SKY)

    const track = <T extends { dispose(): void }>(thing: T) => { this.disposables.push(thing); return thing }
    const inModel = <T extends THREE.Object3D>(object: T) => { object.traverse(child => child.layers.set(MODEL)); return object }

    // The room's reflections are given only to materials that want them (wood,
    // brass, enamel). Never scene.environment: that would light the moon's
    // night side and make every phase look nearly full.
    const pmrem = new THREE.PMREMGenerator(this.renderer)
    const room = new RoomEnvironment()
    const envMap = track(pmrem.fromScene(room, 0.04).texture)
    room.dispose(); pmrem.dispose()

    const brass = track(new THREE.MeshPhysicalMaterial({ color: '#d4a456', metalness: 1, roughness: 0.28, envMap, envMapIntensity: 0.56, clearcoat: 0.4, clearcoatRoughness: 0.2 }))
    const darkBrass = track(new THREE.MeshStandardMaterial({ color: '#8f6530', metalness: 1, roughness: 0.38, envMap, envMapIntensity: 0.455 }))
    const blackened = track(new THREE.MeshStandardMaterial({ color: '#1c1a1f', metalness: 0.6, roughness: 0.45, envMap, envMapIntensity: 0.35 }))

    // Light: parallel sunlight and the lamp's warm pool on the table. Nothing
    // else may light the moon, or its phases would lie; the room's own glow
    // comes from reflections, which Earth and moon ignore.
    const sunLight = new THREE.DirectionalLight('#fff2dc', 3.4)
    sunLight.position.set(SUN_X, PLANE_Y, 0); sunLight.target.position.set(0, PLANE_Y, 0)
    const lamp = new THREE.PointLight('#ffbf6b', 20, 13, 1.8)
    lamp.position.set(SUN_X + 0.5, PLANE_Y + 0.3, 0)
    this.scene.add(sunLight, sunLight.target, lamp, new THREE.AmbientLight('#8fa2ff', 0.035))

    // The room: a dusky wall and a garland of warm bulbs that melts into bokeh.
    const wall = new THREE.Mesh(track(new THREE.SphereGeometry(60, 48, 24)), track(new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false,
      uniforms: { top: { value: new THREE.Color('#0b1030') }, bottom: { value: new THREE.Color('#1a0f0b') } },
      vertexShader: 'varying vec3 vPos; void main() { vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vPos; void main() { float t = smoothstep(-8.0, 30.0, vPos.y); gl_FragColor = vec4(mix(bottom, top, t), 1.0); }',
    })))
    this.scene.add(inModel(wall))
    const bulbs = 46
    const garland = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.16, 12, 8)), track(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.1, 1.0), toneMapped: false })), bulbs)
    for (let i = 0; i < bulbs; i++) {
      const u = i / (bulbs - 1), x = -30 + u * 60, sag = Math.sin(u * Math.PI * 3) ** 2
      this.m.makeTranslation(x * 0.9, 8.2 - sag * 2.6 + Math.sin(i * 1.7) * 0.2, -19 - Math.cos(u * Math.PI) * 3)
      garland.setMatrixAt(i, this.m)
    }
    this.scene.add(inModel(garland))

    // The table: varnished planks, a brass band around the edge.
    const woodMap = track(canvasTexture(woodCanvas()))
    const top = track(new THREE.MeshPhysicalMaterial({ map: woodMap, roughness: 0.6, clearcoat: 0.45, clearcoatRoughness: 0.32, envMap, envMapIntensity: 0.158 }))
    const side = track(new THREE.MeshStandardMaterial({ color: '#3d2413', roughness: 0.6, envMap, envMapIntensity: 0.175 }))
    const table = new THREE.Mesh(track(new THREE.CylinderGeometry(TABLE_R, TABLE_R * 0.985, 0.5, 160)), [side, top, side])
    table.position.y = -0.25
    const band = new THREE.Mesh(track(new THREE.CylinderGeometry(TABLE_R + 0.012, TABLE_R + 0.012, 0.12, 160, 1, true)), brass)
    band.position.y = -0.1
    this.scene.add(inModel(table), inModel(band))

    // An engraved brass scale under the moon's path, with the eight phases set in enamel.
    const scaleInner = ORBIT_R - 0.22, scaleOuter = ORBIT_R + 0.22
    const scaleMap = track(canvasTexture(scaleCanvas(2048, scaleInner, scaleOuter)))
    const scaleGeometry = track(new THREE.RingGeometry(scaleInner, scaleOuter, 256, 1))
    const uv = scaleGeometry.attributes.uv as THREE.BufferAttribute, pos = scaleGeometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * scaleOuter) + 0.5, pos.getY(i) / (2 * scaleOuter) + 0.5)
    const scale = new THREE.Mesh(scaleGeometry, track(new THREE.MeshStandardMaterial({ map: scaleMap, metalness: 1, roughness: 0.32, envMap, envMapIntensity: 0.525 })))
    scale.rotation.x = -Math.PI / 2; scale.position.y = 0.006
    this.scene.add(inModel(scale))
    const medallionGeometry = track(new THREE.CylinderGeometry(0.5, 0.52, 0.06, 64))
    const medallionRim = track(new THREE.TorusGeometry(0.51, 0.035, 10, 64))
    for (let i = 0; i < PHASE_COUNT; i++) {
      const angle = Math.PI + phaseAngle(i), reach = ORBIT_R + 1.05
      const face = track(new THREE.MeshPhysicalMaterial({ map: track(phaseMedallion(i)), roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.12, emissive: '#ffffff', emissiveIntensity: 0, envMap, envMapIntensity: 0.105 }))
      face.emissiveMap = face.map
      const medallion = new THREE.Mesh(medallionGeometry, [darkBrass, face, darkBrass])
      // Picture top points away from Earth: read from the middle, it matches what the child sees.
      medallion.rotation.set(0, angle - Math.PI / 2, 0)
      medallion.position.set(reach * Math.cos(angle), 0.03, -reach * Math.sin(angle))
      const rim = new THREE.Mesh(medallionRim, brass)
      rim.rotation.x = Math.PI / 2; rim.position.y = 0.03
      medallion.add(rim)
      medallion.userData.phase = i
      this.medallions.push(medallion); this.scene.add(inModel(medallion))
    }

    // Clockwork under Earth: a big gear turns with the moon's arm and drives a pinion and its crank.
    this.bigGear = new THREE.Mesh(track(gearGeometry(64, 1.25, 0.1, 0.1)), brass)
    this.bigGear.position.y = 0.16
    this.pinion = new THREE.Group()
    const pinionGear = new THREE.Mesh(track(gearGeometry(20, 0.42, 0.1, 0.05)), darkBrass)
    const crank = new THREE.Mesh(track(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12)), brass)
    crank.position.y = 0.3
    const knob = new THREE.Mesh(track(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 32)), blackened)
    knob.position.y = 0.58
    const knurl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.125, 0.125, 0.1, 32, 1, true)), darkBrass)
    knurl.position.y = 0.58
    this.pinion.add(pinionGear, crank, knob, knurl)
    const mesh = 1.25 * 0.95 + 0.42 * 0.95
    this.pinion.position.set(Math.cos(-0.7) * mesh, 0.16, Math.sin(-0.7) * mesh)
    const plinth = new THREE.Mesh(track(new THREE.CylinderGeometry(1.45, 1.55, 0.14, 96)), blackened)
    plinth.position.y = 0.07
    const standHeight = PLANE_Y - EARTH_R - 0.2
    const stand = new THREE.Mesh(track(latheStand(standHeight, 0.5)), brass)
    stand.position.y = 0.26
    this.scene.add(inModel(plinth), inModel(this.bigGear), inModel(this.pinion), inModel(stand))

    // Earth: shiny oceans, matte land, drifting clouds, a thin blue atmosphere,
    // and town lights that come on only on the night side.
    const earthMaps = earthCanvases()
    const earthMaterial = track(new THREE.MeshStandardMaterial({
      map: track(canvasTexture(earthMaps.color)), roughnessMap: track(canvasTexture(earthMaps.rough, false)), roughness: 1, metalness: 0,
      emissive: '#ffffff', emissiveMap: track(canvasTexture(earthMaps.lights)), emissiveIntensity: 1.6,
    }))
    earthMaterial.onBeforeCompile = shader => {
      shader.uniforms.sunDir = { value: SUN_DIR }
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldNormalMP;')
        .replace('#include <beginnormal_vertex>', '#include <beginnormal_vertex>\nvWorldNormalMP = normalize(mat3(modelMatrix) * objectNormal);')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWorldNormalMP;\nuniform vec3 sunDir;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= smoothstep(0.12, -0.25, dot(normalize(vWorldNormalMP), sunDir));')
    }
    this.earth = new THREE.Mesh(track(new THREE.SphereGeometry(EARTH_R, 128, 96)), earthMaterial)
    this.earth.position.y = PLANE_Y; this.earth.rotation.order = 'ZYX'; this.earth.rotation.z = 0.41
    this.clouds = new THREE.Mesh(track(new THREE.SphereGeometry(EARTH_R * 1.015, 96, 64)), track(new THREE.MeshStandardMaterial({ map: track(canvasTexture(cloudCanvas())), transparent: true, depthWrite: false, roughness: 1, })))
    this.earth.add(this.clouds)
    this.atmosphere = new THREE.Mesh(track(new THREE.SphereGeometry(EARTH_R * 1.045, 96, 64)), track(new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { sunDir: { value: SUN_DIR } },
      vertexShader: 'varying vec3 vN; varying vec3 vView; varying vec3 vWorldN; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldN = normalize(mat3(modelMatrix) * normal); vN = normalize(normalMatrix * normal); vView = normalize(-(viewMatrix * wp).xyz); gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'uniform vec3 sunDir; varying vec3 vN; varying vec3 vView; varying vec3 vWorldN; void main() { float rim = pow(clamp(1.0 + dot(vN, vView), 0.0, 1.0), 5.0); float day = smoothstep(-0.3, 0.7, dot(vWorldN, sunDir)); gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * rim * (0.03 + 0.8 * day), 1.0); }',
    })))
    this.atmosphere.position.y = PLANE_Y
    this.scene.add(this.earth, this.atmosphere)

    // The moon rides a brass arm, so it keeps one face towards Earth. A
    // counterweight on the far side of the arm balances it, as on a real orrery.
    const [moonColor, moonBump] = moonCanvases()
    this.moon = new THREE.Mesh(
      track(new THREE.SphereGeometry(MOON_R, 128, 96)),
      track(new THREE.MeshStandardMaterial({ map: track(canvasTexture(moonColor)), bumpMap: track(canvasTexture(moonBump, false)), bumpScale: 2.4, roughness: 0.96, })),
    )
    this.moon.position.set(ORBIT_R, PLANE_Y, 0)
    const armHeight = 0.62
    const beam = new THREE.Mesh(track(new THREE.CylinderGeometry(0.04, 0.04, ORBIT_R + 0.9, 20)), brass)
    beam.rotation.z = Math.PI / 2; beam.position.set((ORBIT_R - 0.9) / 2, armHeight, 0)
    const riser = new THREE.Mesh(track(new THREE.CylinderGeometry(0.028, 0.034, PLANE_Y - MOON_R - armHeight, 20)), brass)
    riser.position.set(ORBIT_R, (PLANE_Y - MOON_R + armHeight) / 2, 0)
    const cradle = new THREE.Mesh(track(new THREE.SphereGeometry(MOON_R * 0.55, 32, 12, 0, TAU, Math.PI * 0.65, Math.PI * 0.35)), darkBrass)
    cradle.position.set(ORBIT_R, PLANE_Y - MOON_R * 0.6, 0)
    const collar = new THREE.Mesh(track(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 32)), darkBrass)
    collar.position.y = armHeight
    const counterweight = new THREE.Mesh(track(new THREE.SphereGeometry(0.16, 32, 24)), blackened)
    counterweight.position.set(-0.9, armHeight, 0)
    const ringCanvas = document.createElement('canvas')
    ringCanvas.width = ringCanvas.height = 128
    const rc = ringCanvas.getContext('2d')!
    rc.strokeStyle = 'rgba(255,244,210,0.95)'; rc.lineWidth = 4; rc.beginPath(); rc.arc(64, 64, 58, 0, TAU); rc.stroke()
    this.hint = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: track(canvasTexture(ringCanvas)), transparent: true, depthWrite: false })))
    this.hint.position.copy(this.moon.position)
    this.arm.add(this.moon, inModel(beam), inModel(riser), inModel(cradle), inModel(collar), inModel(counterweight), inModel(this.hint))
    this.scene.add(this.arm)

    // The sun lamp: a bulb bright enough to bloom, on a turned brass stand.
    this.sun = new THREE.Mesh(track(new THREE.SphereGeometry(0.85, 64, 40)), track(new THREE.MeshBasicMaterial({ map: track(canvasTexture(sunCanvas())), color: new THREE.Color(1.25, 1.05, 0.78), toneMapped: false })))
    this.sun.position.set(SUN_X, PLANE_Y, 0)
    const glowTexture = track(canvasTexture(glowCanvas('rgba(255,210,120,1)', 'rgba(255,160,60,0)')))
    // Two glows: over the model it ignores depth so the tabletop never cuts it off;
    // in the sky seen from Earth it respects depth, so the moon hides it at new moon.
    for (const [layer, depthTest] of [[MODEL, false], [SKY, true]] as const) {
      const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, depthTest, transparent: true, opacity: 0.42, toneMapped: false })))
      glow.scale.setScalar(3.2); glow.position.copy(this.sun.position); glow.userData.size = 3.2
      glow.layers.set(layer)
      this.sunGlow.push(glow); this.scene.add(glow)
    }
    const sunStand = new THREE.Mesh(track(latheStand(PLANE_Y - 0.72, 0.62)), brass)
    sunStand.position.set(SUN_X, 0, 0)
    const cup = new THREE.Mesh(track(new THREE.SphereGeometry(0.52, 48, 16, 0, TAU, Math.PI * 0.6, Math.PI * 0.4)), darkBrass)
    cup.position.set(SUN_X, PLANE_Y - 0.26, 0)
    this.scene.add(this.sun, inModel(sunStand), inModel(cup))

    // Soft contact shadows, since the lamp's light skims the tabletop.
    const shadowTexture = track(canvasTexture(glowCanvas('rgba(10,4,0,0.7)', 'rgba(10,4,0,0)')))
    for (const [x, size] of [[0, 3.6], [SUN_X, 2.4]] as const) {
      const blob = new THREE.Mesh(track(new THREE.PlaneGeometry(size, size)), track(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })))
      blob.rotation.x = -Math.PI / 2; blob.position.set(x, 0.004, 0)
      this.scene.add(inModel(blob))
    }

    // Rays of sunlight: fine lines from the lamp that stop where they hit Earth
    // or the moon, with pulses of light travelling along them.
    const rayCount = 26
    const rayGeometry = track(new THREE.BufferGeometry())
    rayGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rayCount * 6), 3))
    rayGeometry.setAttribute('along', new THREE.BufferAttribute(new Float32Array(rayCount * 2), 1))
    rayGeometry.setAttribute('seed', new THREE.BufferAttribute(new Float32Array(rayCount * 2).map((_, i) => (Math.floor(i / 2) * 0.618) % 1), 1))
    this.rayMaterial = track(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      uniforms: { time: { value: 0 }, strength: { value: 0.35 } },
      vertexShader: 'attribute float along; attribute float seed; varying float vAlong; varying float vSeed; void main() { vAlong = along; vSeed = seed; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: 'uniform float time; uniform float strength; varying float vAlong; varying float vSeed; void main() { float pulse = pow(fract(vAlong * 0.18 - time * 0.45 + vSeed), 10.0); float fade = smoothstep(0.0, 1.5, vAlong); gl_FragColor = vec4(vec3(1.0, 0.82, 0.5) * (0.22 + pulse * 2.6) * strength * fade, 1.0); }',
    }))
    this.rays = new THREE.LineSegments(rayGeometry, this.rayMaterial)
    this.rays.frustumCulled = false
    this.scene.add(inModel(this.rays))

    // Stars, only in the sky seen from Earth.
    for (let set = 0; set < 2; set++) {
      const count = 900, star = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const u = Math.random() * 2 - 1, theta = Math.random() * TAU, r = 120, s = Math.sqrt(1 - u * u)
        star[i * 3] = r * s * Math.cos(theta); star[i * 3 + 1] = r * u; star[i * 3 + 2] = r * s * Math.sin(theta)
      }
      const geometry = track(new THREE.BufferGeometry())
      geometry.setAttribute('position', new THREE.BufferAttribute(star, 3))
      const points = new THREE.Points(geometry, track(new THREE.PointsMaterial({ size: set ? 1.8 : 1.2, sizeAttenuation: false, color: set ? '#fff5da' : '#cbd6ff', transparent: true, depthWrite: false })))
      points.layers.set(SKY)
      this.stars.push(points); this.scene.add(points)
    }

    // A small child on Earth, pointing at the moon.
    const coat = track(new THREE.MeshStandardMaterial({ color: '#e0553d', roughness: 0.6, emissive: '#e0553d', emissiveIntensity: 0.3 }))
    const skin = track(new THREE.MeshStandardMaterial({ color: '#f0c29a', roughness: 0.7, emissive: '#f0c29a', emissiveIntensity: 0.3 }))
    const hat = track(new THREE.MeshStandardMaterial({ color: '#f2c14e', roughness: 0.6, emissive: '#f2c14e', emissiveIntensity: 0.3 }))
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

    // "Halves": the half of the moon facing Earth (blue glass) and the edge of its day side (gold).
    const seenMaterial = track(new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending,
      uniforms: { opacity: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vView; void main() { vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vView = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform float opacity; varying vec3 vN; varying vec3 vView; void main() { float rim = pow(1.0 - abs(dot(vN, vView)), 2.0); gl_FragColor = vec4(vec3(0.35, 0.7, 1.0) * (0.15 + rim * 0.9) * opacity, 1.0); }',
    }))
    const cap = new THREE.Mesh(track(new THREE.SphereGeometry(MOON_R * 1.14, 64, 32, 0, TAU, 0, Math.PI / 2)), seenMaterial)
    cap.rotation.z = Math.PI / 2
    const seenRing = new THREE.Mesh(track(new THREE.TorusGeometry(MOON_R * 1.14, 0.01, 8, 96)), track(new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 1.6, 3.0), transparent: true, toneMapped: false })))
    seenRing.rotation.y = Math.PI / 2
    this.seenHalf.add(cap, seenRing)
    const litRing = new THREE.Mesh(track(new THREE.TorusGeometry(MOON_R * 1.06, 0.012, 8, 96)), track(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.2, 0.8), transparent: true, toneMapped: false })))
    litRing.rotation.y = Math.PI / 2
    this.halves.add(this.seenHalf, litRing)
    this.scene.add(inModel(this.halves))

    // Post: bloom for the lamp and glowing edges, a shallow depth of field so it
    // reads as a miniature, then the film grade.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
    this.composer = new EffectComposer(this.renderer, target)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bokeh = new SoftBokehPass(this.scene, this.camera, { focus: 14, aperture: 0.00055, maxblur: 0.0085 })
    this.bokeh.hideFromDepth = [...this.sunGlow, this.rays, this.halves, this.hint, this.clouds, this.atmosphere]
    this.composer.addPass(this.bokeh)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.95)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.grade = new ShaderPass(GradeShader)
    this.composer.addPass(this.grade)

    this.setMoon(0)
  }

  setMoon(elongation: number) {
    this.elongation = elongation
    this.arm.rotation.y = Math.PI + elongation
  }

  /** Where the child stands: on the side of Earth facing the moon, well north. */
  private kidFrame() {
    const angle = Math.PI + this.elongation
    const toMoon = new THREE.Vector3(Math.cos(angle), 0, -Math.sin(angle))
    const up = toMoon.clone().multiplyScalar(Math.cos(KID_LAT)).add(new THREE.Vector3(0, Math.sin(KID_LAT), 0)).normalize()
    const feet = up.clone().multiplyScalar(EARTH_R * 1.005).add(new THREE.Vector3(0, PLANE_Y, 0))
    return { up, feet, toMoon }
  }

  moonWorld(target = new THREE.Vector3()) { return this.moon.getWorldPosition(target) }

  private pose(position: THREE.Vector3, target: THREE.Vector3, fov: number) {
    return { position, q: new THREE.Quaternion().setFromRotationMatrix(this.m.lookAt(position, target, THREE.Object3D.DEFAULT_UP)), fov, focus: position.distanceTo(target) }
  }

  private orreryPose() {
    const { azimuth, elevation, distance } = this.current
    const aspect = this.camera.aspect
    const d = distance * Math.max(1, 1.45 / aspect)
    const target = new THREE.Vector3(-1.2, aspect > 1.8 ? 0.35 : 0.95, 0)
    const position = new THREE.Vector3(
      target.x + d * Math.cos(elevation) * Math.sin(azimuth),
      target.y + d * Math.sin(elevation),
      target.z + d * Math.cos(elevation) * Math.cos(azimuth),
    )
    const pose = this.pose(position, target, 34)
    // Keep Earth and moon sharp; the lamp and the room soften around them.
    pose.focus = position.distanceTo(new THREE.Vector3(0, PLANE_Y, 0))
    return pose
  }

  /** The opening shot: low beside the lamp, looking along the light towards Earth. */
  private introPose() {
    return this.pose(new THREE.Vector3(-5.2, 1.25, 3.6), new THREE.Vector3(0, PLANE_Y, 0), 26)
  }

  private eyePose(fov: number, tilt = 0) {
    const { up, feet } = this.kidFrame()
    // Eye close to the ground: on a globe this small, standing any higher sinks the horizon out of view.
    const position = feet.clone().addScaledVector(up, 0.045)
    const pose = this.pose(position, this.moonWorld(new THREE.Vector3()), fov)
    // Tip the view down a little so the ground the child stands on shows at the bottom.
    if (tilt) pose.q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -tilt))
    return pose
  }

  update(dt: number) {
    this.time += dt
    const t = this.time
    this.intro = Math.min(1, this.intro + dt / INTRO_SECONDS)
    // The grown-up's view eases after its target, so drags feel weighty.
    const k = 1 - Math.exp(-dt * 6)
    this.current.azimuth += (this.view.azimuth - this.current.azimuth) * k
    this.current.elevation += (this.view.elevation - this.current.elevation) * k
    this.current.distance += (this.view.distance - this.current.distance) * k

    this.earth.rotation.y += dt * 0.1
    this.clouds.rotation.y += dt * 0.018
    this.sun.rotation.y += dt * 0.05
    for (const [i, glow] of this.sunGlow.entries()) glow.scale.setScalar(glow.userData.size * (1 + Math.sin(t * (1.3 + i * 0.4)) * 0.03))
    this.stars.forEach((points, i) => { (points.material as THREE.PointsMaterial).opacity = 0.65 + Math.sin(t * (0.9 + i * 0.7) + i * 2) * 0.3 })
    // The clockwork follows the arm: 64 teeth drive 20.
    this.bigGear.rotation.y = this.arm.rotation.y
    this.pinion.rotation.y = -this.arm.rotation.y * (64 / 20)

    // The child turns to face the moon and points at it.
    const { up, feet, toMoon } = this.kidFrame()
    this.kid.position.copy(feet)
    const forward = toMoon.clone().addScaledVector(up, -toMoon.dot(up)).normalize()
    const right = new THREE.Vector3().crossVectors(up, forward).normalize()
    this.kid.quaternion.setFromRotationMatrix(this.m.makeBasis(right, up, forward.clone().negate()))
    this.kid.position.addScaledVector(up, Math.abs(Math.sin(t * 3)) * 0.008)
    this.kidArm.rotation.set(-1.25 - Math.sin(t * 2) * 0.08, 0, -0.15)

    // Rays: parallel lines from the lamp, ending on whichever sphere they reach.
    const moon = this.moonWorld(new THREE.Vector3())
    const position = this.rays.geometry.getAttribute('position') as THREE.BufferAttribute
    const along = this.rays.geometry.getAttribute('along') as THREE.BufferAttribute
    const count = position.count / 2, n = Math.ceil(count / 2)
    for (let i = 0; i < count; i++) {
      // Alternate rays aim at the moon's disc and at Earth's, so both show their lit side.
      const onMoon = i % 2 === 0, j = Math.floor(i / 2)
      const a = j * 2.399963, rr = Math.sqrt((j + 0.5) / n) * 0.92
      const radius = onMoon ? MOON_R : EARTH_R, cx = onMoon ? moon.x : 0, cy = onMoon ? moon.y : PLANE_Y, cz = onMoon ? moon.z : 0
      const dy = Math.cos(a) * rr * radius, dz = Math.sin(a) * rr * radius
      let end = cx - Math.sqrt(Math.max(0, radius * radius - dy * dy - dz * dz))
      // Behind Earth, a ray meant for the moon is stopped by Earth first.
      const earthD = Math.hypot(cy + dy - PLANE_Y, cz + dz)
      if (onMoon && moon.x > 0 && earthD < EARTH_R) end = -Math.sqrt(EARTH_R * EARTH_R - earthD * earthD)
      const start = SUN_X + 0.8
      position.setXYZ(i * 2, start, cy + dy, cz + dz); position.setXYZ(i * 2 + 1, Math.max(start, end), cy + dy, cz + dz)
      along.setX(i * 2, 0); along.setX(i * 2 + 1, Math.max(0, end - start))
    }
    position.needsUpdate = true; along.needsUpdate = true
    this.rayMaterial.uniforms.time.value = t

    // Halves fade in and out; they sit on the moon, the blue half turned to Earth.
    this.halvesFade += ((this.showHalves ? 1 : 0) - this.halvesFade) * Math.min(1, dt * 6)
    this.rayMaterial.uniforms.strength.value = (0.28 + this.halvesFade * 0.5) * smooth(this.intro)
    this.halves.visible = this.halvesFade > 0.01
    this.halves.position.copy(moon)
    this.seenHalf.rotation.y = Math.PI + this.elongation
    this.halves.traverse(child => {
      const material = (child as THREE.Mesh).material as (THREE.Material & { uniforms?: { opacity?: { value: number } } }) | undefined
      if (!material) return
      if (material.uniforms?.opacity) material.uniforms.opacity.value = this.halvesFade
      else material.opacity = this.halvesFade
    })

    const pulse = (t * 0.7) % 1
    this.hint.visible = this.showHint && this.pov < 0.5 && this.intro >= 1
    this.hint.scale.setScalar(MOON_R * 2 * (1.25 + pulse * 0.9))
    ;(this.hint.material as THREE.SpriteMaterial).opacity = (1 - pulse) * 0.8

    // Medallions: the current phase rises out of the table and its enamel glows.
    const current = Math.round(this.elongation / (TAU / PHASE_COUNT)) % PHASE_COUNT
    this.medallions.forEach((m, i) => {
      const lift = (m.userData.lift ?? 0) + ((i === current ? 1 : 0) - (m.userData.lift ?? 0)) * Math.min(1, dt * 8)
      m.userData.lift = lift
      m.position.y = 0.03 + lift * 0.1
      m.scale.setScalar(1 + lift * 0.18)
      ;((m.material as THREE.Material[])[1] as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.18 + lift * 0.22
    })
  }

  resize(width: number, height: number, dpr: number) {
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(width, height, false)
    this.composer.setPixelRatio(dpr)
    this.composer.setSize(width, height)
    this.bloom.resolution.set(width / 2, height / 2)
    this.camera.aspect = width / height
    this.camera.updateProjectionMatrix()
    this.grade.uniforms.aspect.value = width / height
  }

  /** Screen positions (CSS px) for the little pins that mark each body. */
  pins(width: number, height: number): Pin[] {
    const project = (kind: Pin['kind'], world: THREE.Vector3, lift: number): Pin => {
      const p = world.clone().add(new THREE.Vector3(0, lift, 0)).project(this.camera)
      return { kind, x: (p.x * 0.5 + 0.5) * width, y: (-p.y * 0.5 + 0.5) * height, visible: p.z < 1 && this.pov < 0.2 && this.intro > 0.85 }
    }
    return [
      project('sun', this.sun.position, 1.25),
      project('earth', new THREE.Vector3(0, PLANE_Y, 0), EARTH_R + 0.38),
      project('moon', this.moonWorld(new THREE.Vector3()), MOON_R + 0.3),
    ]
  }

  /**
   * Renders the other point of view into a corner first and hands it to
   * `onInset` to copy into the round window, then paints the main view over it.
   */
  render(width: number, height: number, insetSize: number, onInset: (source: HTMLCanvasElement, size: number) => void) {
    const r = this.renderer
    if (insetSize > 0) {
      r.setRenderTarget(null)
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
      r.setViewport(0, 0, width, height)
    }

    // Main camera: the opening flight, then the model, blending into the child's eyes.
    const intro = easeInOut(this.intro)
    const model = this.orreryPose(), eye = this.eyePose(60, 0.3), start = this.introPose()
    const a = {
      position: start.position.clone().lerp(model.position, intro),
      q: start.q.clone().slerp(model.q, intro),
      fov: start.fov + (model.fov - start.fov) * intro,
      focus: start.focus + (model.focus - start.focus) * intro,
    }
    const k = smooth(this.pov)
    this.camera.position.lerpVectors(a.position, eye.position, k)
    this.camera.quaternion.slerpQuaternions(a.q, eye.q, k)
    this.camera.fov = a.fov + (eye.fov - a.fov) * k
    this.camera.updateProjectionMatrix()
    // Halfway into Earth-view the model falls away and the starry sky takes over.
    if (this.pov < 0.5) { this.camera.layers.enable(MODEL); this.camera.layers.disable(SKY) }
    else { this.camera.layers.disable(MODEL); this.camera.layers.enable(SKY) }
    this.kid.visible = this.pov < 0.35

    const uniforms = this.bokeh.uniforms as Record<string, { value: number }>
    uniforms.focus.value = a.focus + (eye.focus - a.focus) * k
    uniforms.aperture.value = 0.00055
    // Standing on Earth the whole sky is far away: no miniature blur there.
    this.bokeh.enabled = this.fancy && k < 0.5
    this.grade.uniforms.time.value = this.time
    this.composer.render()
  }

  /** What is under a point in normalised device coordinates. */
  pick(ndc: THREE.Vector2): { kind: 'moon' } | { kind: 'phase'; index: number } | null {
    if (this.pov >= 0.5 || this.intro < 0.6) return null
    const ray = new THREE.Raycaster()
    ray.layers.enableAll()
    ray.setFromCamera(ndc, this.camera)
    const moonHit = ray.intersectObject(this.moon, false)[0]
    // The moon is small on a phone; accept touches near it too.
    const moonScreen = this.moonWorld(new THREE.Vector3()).project(this.camera)
    if (moonHit || Math.hypot((moonScreen.x - ndc.x) * this.camera.aspect, moonScreen.y - ndc.y) < 0.14) return { kind: 'moon' }
    const hit = ray.intersectObjects(this.medallions, true)[0]
    let object: THREE.Object3D | null = hit?.object ?? null
    while (object && object.userData.phase === undefined) object = object.parent
    if (object) return { kind: 'phase', index: object.userData.phase as number }
    return null
  }

  /** The point on the orbit plane under the pointer, for dragging the moon. */
  orbitPlanePoint(ndc: THREE.Vector2) {
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, this.camera)
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANE_Y), new THREE.Vector3())
  }

  dispose() {
    for (const thing of this.disposables) thing.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}
