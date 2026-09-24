import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { DEFAULT_HOME, altitude, earthAngle, homeAt, horizonDip, viewPitch, zenith, type Home } from './geo'
import { PHASE_COUNT, TAU, phaseAngle } from './phase'

// A brass orrery on a varnished table in a dim room at night. The sun lamp's
// light is parallel (a DirectionalLight), so the moon is always exactly half
// lit; what changes is how much of that lit half faces Earth. A child lives
// at a real place on the turning Earth, and a second camera shows their sky:
// day or night, with the moon up or set, and upside down south of the equator.
//
// Layers: SPACE (0) is what exists in space: sun, Earth, moon. MODEL (1) is the
// model and the room around it, which the view from Earth leaves out. SKY (2)
// is the starfield, which only the view from Earth shows.

export const EARTH_R = 0.8
export const MOON_R = 0.34
export const ORBIT_R = 3.3
export const PLANE_Y = 1.7
const SUN_X = -7.3
const SUN_R = 0.85
/** The engraved scale under the moon's path. */
export const SCALE_INNER = ORBIT_R - 0.22
export const SCALE_OUTER = ORBIT_R + 0.22
const TABLE_R = 8.4
const MODEL = 1
const SKY = 2
const INTRO_SECONDS = 3.6
const SUN_DIR = new THREE.Vector3(-1, 0, 0)

export type Pin = { kind: 'sun' | 'earth' | 'moon'; x: number; y: number; visible: boolean }
/** Where the round window sits over the canvas, in CSS pixels from its top-left, and how far it has faded in. */
export type Porthole = { x: number; y: number; size: number; opacity: number }

const smooth = (t: number) => t * t * (3 - 2 * t)
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)

/**
 * Parts that never move relative to each other and share a material are merged into one geometry: each mesh is a
 * draw call, and on a slow device draw calls are most of a frame's work.
 */
function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts)
  for (const part of parts) part.dispose()
  return geometry
}

/** Gives every vertex one colour, so differently coloured parts can share a `vertexColors` material. */
function tinted(geometry: THREE.BufferGeometry, hex: string): THREE.BufferGeometry {
  const color = new THREE.Color(hex), count = geometry.attributes.position.count, rgb = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) color.toArray(rgb, i * 3)
  geometry.setAttribute('color', new THREE.BufferAttribute(rgb, 3))
  return geometry
}

/**
 * Everything painted on a canvas, plus the room's reflections. The view paints them for real; a test can pass
 * blank textures, so the scene and its per-frame logic run without a browser.
 */
export type OrreryAssets = {
  envMap: THREE.Texture | null
  wood: THREE.Texture
  scale: THREE.Texture
  /** The eight phase pictures, four across and two down. */
  medallions: THREE.Texture
  earthColor: THREE.Texture
  earthRough: THREE.Texture
  earthLights: THREE.Texture
  clouds: THREE.Texture
  moonColor: THREE.Texture
  moonBump: THREE.Texture
  ring: THREE.Texture
  sun: THREE.Texture
  glow: THREE.Texture
  shadow: THREE.Texture
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

/**
 * The orrery's world: the scene graph, the cameras and their poses, and everything that moves each frame. No
 * renderer lives here (see `Orrery`), so a test can drive it headless.
 */
export class OrreryScene {
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
  /** Where the child lives, and the local solar time there (hours). */
  home: Home = DEFAULT_HOME
  hours = 21
  /** 0 → 1 while the opening camera flight plays. */
  intro = 0
  moon: THREE.Mesh
  private medallionPoses: THREE.Object3D[] = []
  private medallionBodies: THREE.InstancedMesh
  private medallionFaces: THREE.InstancedMesh
  private medallionGlow = new THREE.InstancedBufferAttribute(new Float32Array(PHASE_COUNT), 1).setUsage(THREE.DynamicDrawUsage)
  private current = { azimuth: 0.2, elevation: 0.46, distance: 15.5 }
  private earth: THREE.Mesh
  protected clouds: THREE.Mesh
  protected atmosphere: THREE.Mesh
  private sun: THREE.Mesh
  protected sunGlow: THREE.Sprite[] = []
  private arm = new THREE.Group()
  private bigGear: THREE.Mesh
  private pinion: THREE.Group
  private kid = new THREE.Group()
  private kidArm: THREE.Object3D
  protected halves = new THREE.Group()
  private seenHalf = new THREE.Group()
  protected rays: THREE.LineSegments
  private rayMaterial: THREE.ShaderMaterial
  protected hint: THREE.Sprite
  private stars: THREE.Points[] = []
  private sky: THREE.Mesh
  private skyMaterial: THREE.ShaderMaterial
  private moonMaterial!: THREE.MeshStandardMaterial
  private moonDaylight = { value: 0 }
  private kidHop = 0
  protected disposables: { dispose(): void }[] = []
  protected time = 0
  private halvesFade = 0
  private raysFor = new THREE.Vector3(Infinity, 0, 0)
  private kidCache: ReturnType<OrreryScene['placeKid']> | null = null
  private windowMaterials: [THREE.Mesh, THREE.Material, THREE.Material][] = []
  private m = new THREE.Matrix4()

  constructor(assets: OrreryAssets) {
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
    const envMap = assets.envMap

    // All the metalwork (bright brass, dark brass, blackened steel) is one lacquered material coloured per part.
    // Every distinct material costs a full uniform upload each frame, which on a slow device outweighs the draws.
    const metal = track(new THREE.MeshPhysicalMaterial({ vertexColors: true, metalness: 1, roughness: 0.3, envMap, envMapIntensity: 0.52, clearcoat: 0.4, clearcoatRoughness: 0.2 }))
    const BRASS = '#d4a456', DARK_BRASS = '#8f6530', BLACKENED = '#1c1a1f'

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
    wall.name = 'room'
    this.scene.add(inModel(wall))
    const bulbs = 46
    const garland = new THREE.InstancedMesh(track(new THREE.SphereGeometry(0.16, 12, 8)), track(new THREE.MeshBasicMaterial({ color: new THREE.Color(3.2, 2.1, 1.0), toneMapped: false })), bulbs)
    for (let i = 0; i < bulbs; i++) {
      const u = i / (bulbs - 1), x = -30 + u * 60, sag = Math.sin(u * Math.PI * 3) ** 2
      this.m.makeTranslation(x * 0.9, 8.2 - sag * 2.6 + Math.sin(i * 1.7) * 0.2, -19 - Math.cos(u * Math.PI) * 3)
      garland.setMatrixAt(i, this.m)
    }
    garland.name = 'garland'
    this.scene.add(inModel(garland))

    // The table: varnished planks, a brass band around the edge.
    const woodMap = assets.wood
    const top = track(new THREE.MeshPhysicalMaterial({ map: woodMap, roughness: 0.6, clearcoat: 0.45, clearcoatRoughness: 0.32, envMap, envMapIntensity: 0.158 }))
    const side = track(new THREE.MeshStandardMaterial({ color: '#3d2413', roughness: 0.6, envMap, envMapIntensity: 0.175 }))
    const tableGeometry = track(new THREE.CylinderGeometry(TABLE_R, TABLE_R * 0.985, 0.5, 160))
    // Nobody sees under the table: its bottom cap is not drawn.
    tableGeometry.groups = tableGeometry.groups.filter(group => group.materialIndex !== 2)
    const table = new THREE.Mesh(tableGeometry, [side, top])
    table.position.y = -0.25
    table.name = 'table'
    this.scene.add(inModel(table))
    // Metal that never moves (the table's band, Earth's plinth and stand, the lamp's stand and cup) is one draw;
    // the rest of it joins below.
    const fixedMetal: THREE.BufferGeometry[] = [tinted(new THREE.CylinderGeometry(TABLE_R + 0.012, TABLE_R + 0.012, 0.12, 160, 1, true).translate(0, -0.1, 0), BRASS)]

    // An engraved brass scale under the moon's path, with the eight phases set in enamel.
    const scaleInner = SCALE_INNER, scaleOuter = SCALE_OUTER
    const scaleMap = assets.scale
    const scaleGeometry = track(new THREE.RingGeometry(scaleInner, scaleOuter, 256, 1))
    const uv = scaleGeometry.attributes.uv as THREE.BufferAttribute, pos = scaleGeometry.attributes.position as THREE.BufferAttribute
    for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / (2 * scaleOuter) + 0.5, pos.getY(i) / (2 * scaleOuter) + 0.5)
    const scale = new THREE.Mesh(scaleGeometry, track(new THREE.MeshStandardMaterial({ map: scaleMap, metalness: 1, roughness: 0.32, envMap, envMapIntensity: 0.525 })))
    scale.rotation.x = -Math.PI / 2; scale.position.y = 0.006
    scale.name = 'scale'
    this.scene.add(inModel(scale))
    // All eight medallion bodies (dark brass side, bright rim) are one instanced draw, and all eight enamel faces
    // are another: the pictures share an atlas, and each instance reads its own cell and glows by its own amount.
    this.medallionBodies = new THREE.InstancedMesh(
      track(merged([
        tinted(new THREE.CylinderGeometry(0.5, 0.52, 0.06, 64, 1, true), DARK_BRASS),
        tinted(new THREE.TorusGeometry(0.51, 0.035, 10, 64).rotateX(Math.PI / 2).translate(0, 0.03, 0), BRASS),
      ])),
      // Its own copy: instancing is a different program, and one material switching programs costs more.
      track(metal.clone()),
      PHASE_COUNT,
    )
    const faceGeometry = track(new THREE.CylinderGeometry(0.5, 0.52, 0.06, 64))
    const enamelTop = faceGeometry.groups.find(group => group.materialIndex === 1)!
    faceGeometry.setIndex(Array.from(faceGeometry.index!.array.slice(enamelTop.start, enamelTop.start + enamelTop.count)))
    faceGeometry.clearGroups()
    const tiles = new Float32Array(PHASE_COUNT * 2)
    for (let i = 0; i < PHASE_COUNT; i++) { tiles[i * 2] = (i % 4) * 0.25; tiles[i * 2 + 1] = (1 - Math.floor(i / 4)) * 0.5 }
    faceGeometry.setAttribute('tile', new THREE.InstancedBufferAttribute(tiles, 2))
    faceGeometry.setAttribute('glow', this.medallionGlow)
    const faceMaterial = track(new THREE.MeshPhysicalMaterial({ map: assets.medallions, emissiveMap: assets.medallions, emissive: '#ffffff', emissiveIntensity: 1, roughness: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.12, envMap, envMapIntensity: 0.105 }))
    faceMaterial.onBeforeCompile = shader => {
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nattribute vec2 tile;\nattribute float glow;\nvarying float vGlow;')
        .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vMapUv * vec2(0.25, 0.5) + tile;\nvEmissiveMapUv = vEmissiveMapUv * vec2(0.25, 0.5) + tile;\nvGlow = glow;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vGlow;')
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vGlow;')
    }
    this.medallionFaces = new THREE.InstancedMesh(faceGeometry, faceMaterial, PHASE_COUNT)
    for (const instanced of [this.medallionBodies, this.medallionFaces]) {
      instanced.frustumCulled = false
      instanced.name = instanced === this.medallionBodies ? 'medallion-bodies' : 'medallion-faces'
      this.scene.add(inModel(instanced))
    }
    for (let i = 0; i < PHASE_COUNT; i++) {
      const angle = Math.PI + phaseAngle(i), reach = ORBIT_R + 1.05
      const medallion = new THREE.Object3D()
      // Picture top points away from Earth: read from the middle, it matches what the child sees.
      medallion.rotation.set(0, angle - Math.PI / 2, 0)
      medallion.position.set(reach * Math.cos(angle), 0.03, -reach * Math.sin(angle))
      medallion.updateMatrix()
      this.medallionBodies.setMatrixAt(i, medallion.matrix)
      this.medallionFaces.setMatrixAt(i, medallion.matrix)
      this.medallionGlow.setX(i, 0.18)
      this.medallionPoses.push(medallion)
    }

    // Clockwork under Earth: a big gear turns with the moon's arm and drives a pinion and its crank.
    this.bigGear = new THREE.Mesh(track(tinted(gearGeometry(64, 1.25, 0.1, 0.1), BRASS)), metal)
    this.bigGear.position.y = 0.16
    // The pinion, its crank, knob and knurled grip turn together: one draw, coloured per part.
    this.pinion = new THREE.Group()
    this.pinion.add(new THREE.Mesh(track(merged([
      tinted(gearGeometry(20, 0.42, 0.1, 0.05), DARK_BRASS),
      tinted(new THREE.CylinderGeometry(0.03, 0.03, 0.5, 12).toNonIndexed().translate(0, 0.3, 0), BRASS),
      tinted(new THREE.CylinderGeometry(0.12, 0.12, 0.16, 32).toNonIndexed().translate(0, 0.58, 0), BLACKENED),
      tinted(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 32, 1, true).toNonIndexed().translate(0, 0.58, 0), DARK_BRASS),
    ])), metal))
    // Tooth tips just touch: the teeth are not phased to interleave, so any closer and they would pass through
    // each other on the same plane.
    const mesh = 1.25 + 0.42 + 0.004
    this.pinion.position.set(Math.cos(-0.7) * mesh, 0.16, Math.sin(-0.7) * mesh)
    fixedMetal.push(tinted(new THREE.CylinderGeometry(1.45, 1.55, 0.14, 96).translate(0, 0.07, 0), BLACKENED))
    const standHeight = PLANE_Y - EARTH_R - 0.2
    fixedMetal.push(tinted(latheStand(standHeight, 0.5).translate(0, 0.26, 0), BRASS))
    this.bigGear.name = 'big-gear'
    this.pinion.name = 'pinion'
    this.scene.add(inModel(this.bigGear), inModel(this.pinion))

    // Earth: shiny oceans, matte land, drifting clouds, a thin blue atmosphere,
    // and town lights that come on only on the night side.
    const earthMaterial = track(new THREE.MeshStandardMaterial({
      map: assets.earthColor, roughnessMap: assets.earthRough, roughness: 1, metalness: 0,
      emissive: '#ffffff', emissiveMap: assets.earthLights, emissiveIntensity: 1.6,
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
    // The axis stands straight up: always an equinox, so day and night stay easy to read.
    this.earth.name = 'earth'
    this.earth.position.y = PLANE_Y
    this.clouds = new THREE.Mesh(track(new THREE.SphereGeometry(EARTH_R * 1.015, 96, 64)), track(new THREE.MeshStandardMaterial({ map: assets.clouds, transparent: true, depthWrite: false, roughness: 1, })))
    this.clouds.name = 'clouds'
    this.earth.add(this.clouds)
    this.atmosphere = new THREE.Mesh(track(new THREE.SphereGeometry(EARTH_R * 1.045, 96, 64)), track(new THREE.ShaderMaterial({
      side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { sunDir: { value: SUN_DIR } },
      vertexShader: 'varying vec3 vN; varying vec3 vView; varying vec3 vWorldN; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorldN = normalize(mat3(modelMatrix) * normal); vN = normalize(normalMatrix * normal); vView = normalize(-(viewMatrix * wp).xyz); gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: 'uniform vec3 sunDir; varying vec3 vN; varying vec3 vView; varying vec3 vWorldN; void main() { float rim = pow(clamp(1.0 + dot(vN, vView), 0.0, 1.0), 5.0); float day = smoothstep(-0.3, 0.7, dot(vWorldN, sunDir)); gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * rim * (0.03 + 0.8 * day), 1.0); }',
    })))
    this.atmosphere.name = 'atmosphere'
    this.atmosphere.position.y = PLANE_Y
    this.scene.add(this.earth, this.atmosphere)

    // The moon rides a brass arm, so it keeps one face towards Earth. A
    // counterweight on the far side of the arm balances it, as on a real orrery.
    this.moon = new THREE.Mesh(
      track(new THREE.SphereGeometry(MOON_R, 128, 96)),
      this.moonMaterial = track(new THREE.MeshStandardMaterial({ map: assets.moonColor, bumpMap: assets.moonBump, bumpScale: 2.4, roughness: 0.96, transparent: true })),
    )
    // Against a daytime sky only the sunlit part of the moon shows; its night
    // side lets the blue through, as it does in the real sky.
    this.moonMaterial.onBeforeCompile = shader => {
      shader.uniforms.daylight = this.moonDaylight
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform float daylight;')
        .replace('#include <dithering_fragment>', '#include <dithering_fragment>\ngl_FragColor.a = mix(1.0, clamp(dot(gl_FragColor.rgb, vec3(0.33)) * 5.0, 0.0, 1.0), daylight);')
    }
    this.moon.position.set(ORBIT_R, PLANE_Y, 0)
    const armHeight = 0.62
    const cradleRadius = MOON_R + 0.01
    // The arm turns as one piece: beam, riser, cradle, collar and counterweight are one draw.
    const armMetal = new THREE.Mesh(track(merged([
      tinted(new THREE.CylinderGeometry(0.04, 0.04, ORBIT_R + 0.9, 20).rotateZ(Math.PI / 2).translate((ORBIT_R - 0.9) / 2, armHeight, 0), BRASS),
      tinted(new THREE.CylinderGeometry(0.028, 0.034, PLANE_Y - cradleRadius - armHeight, 20).translate(ORBIT_R, (PLANE_Y - cradleRadius + armHeight) / 2, 0), BRASS),
      // A shallow cradle just outside the moon, so the moon rests in it rather than through it.
      tinted(new THREE.SphereGeometry(cradleRadius, 32, 8, 0, TAU, Math.PI * 0.78, Math.PI * 0.22).translate(ORBIT_R, PLANE_Y, 0), DARK_BRASS),
      tinted(new THREE.CylinderGeometry(0.15, 0.15, 0.14, 32).translate(0, armHeight, 0), DARK_BRASS),
      tinted(new THREE.SphereGeometry(0.16, 32, 24).translate(-0.9, armHeight, 0), BLACKENED),
    ])), metal)
    this.hint = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: assets.ring, transparent: true, depthWrite: false })))
    this.hint.position.copy(this.moon.position)
    this.arm.name = 'moon-arm'
    this.moon.name = 'moon'
    armMetal.name = 'arm-metal'
    this.hint.name = 'moon-hint'
    this.arm.add(this.moon, inModel(armMetal), inModel(this.hint))
    this.scene.add(this.arm)

    // The sun lamp: a bulb bright enough to bloom, on a turned brass stand.
    this.sun = new THREE.Mesh(track(new THREE.SphereGeometry(SUN_R, 64, 40)), track(new THREE.MeshBasicMaterial({ map: assets.sun, color: new THREE.Color(1.25, 1.05, 0.78), toneMapped: false })))
    // The round window draws to the screen and the main view into the post target, and three builds a
    // different program for each; a material drawn in both would switch programs twice a frame. So Earth, its
    // clouds and air, the moon and the sun have a copy for the window, sharing their textures and uniforms.
    for (const mesh of [this.earth, this.clouds, this.atmosphere, this.moon, this.sun]) {
      const main = mesh.material as THREE.Material
      const copy = track(main.clone())
      copy.onBeforeCompile = main.onBeforeCompile
      this.windowMaterials.push([mesh, main, copy])
    }
    this.sun.position.set(SUN_X, PLANE_Y, 0)
    const glowTexture = assets.glow
    // Two glows: over the model it ignores depth so the tabletop never cuts it off;
    // in the sky seen from Earth it respects depth, so the moon hides it at new moon.
    for (const [layer, depthTest] of [[MODEL, false], [SKY, true]] as const) {
      const glow = new THREE.Sprite(track(new THREE.SpriteMaterial({ map: glowTexture, blending: THREE.AdditiveBlending, depthWrite: false, depthTest, transparent: true, opacity: 0.42, toneMapped: false })))
      glow.scale.setScalar(3.2); glow.position.copy(this.sun.position); glow.userData.size = 3.2
      glow.name = 'sun-glow'
      glow.layers.set(layer)
      this.sunGlow.push(glow); this.scene.add(glow)
    }
    // The lamp's stand ends where the bulb begins, so its tip meets the sun instead of running up into it.
    fixedMetal.push(tinted(latheStand(PLANE_Y - SUN_R - 0.002, 0.62).translate(SUN_X, 0, 0), BRASS))
    this.sun.name = 'sun'
    const fixed = new THREE.Mesh(track(merged(fixedMetal)), metal)
    fixed.name = 'fixed-metal'
    this.scene.add(this.sun, inModel(fixed))

    // Soft contact shadows, since the lamp's light skims the tabletop: both blobs in one draw.
    const shadowTexture = assets.shadow
    const blobs = new THREE.Mesh(
      track(merged([[0, 3.6], [SUN_X, 2.4]].map(([x, size]) => new THREE.PlaneGeometry(size, size).rotateX(-Math.PI / 2).translate(x, 0.004, 0)))),
      track(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false })),
    )
    blobs.name = 'contact-shadows'
    this.scene.add(inModel(blobs))

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
    this.rays.name = 'sun-rays'
    this.scene.add(inModel(this.rays))

    // The sky seen from home: blue by day, glowing at sunrise and sunset, starry at night.
    this.skyMaterial = track(new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, depthTest: false,
      uniforms: { eye: { value: new THREE.Vector3() }, up: { value: new THREE.Vector3(0, 1, 0) }, sunDir: { value: SUN_DIR.clone() }, sunAlt: { value: -1 } },
      vertexShader: 'varying vec3 vWorld; void main() { vec4 wp = modelMatrix * vec4(position, 1.0); vWorld = wp.xyz; gl_Position = projectionMatrix * viewMatrix * wp; }',
      fragmentShader: `
        uniform vec3 eye; uniform vec3 up; uniform vec3 sunDir; uniform float sunAlt; varying vec3 vWorld;
        void main() {
          vec3 d = normalize(vWorld - eye);
          float h = dot(d, up), toSun = max(dot(d, sunDir), 0.0);
          float day = smoothstep(-0.12, 0.2, sunAlt);
          vec3 night = mix(vec3(0.015, 0.02, 0.06), vec3(0.03, 0.05, 0.12), smoothstep(0.4, -0.05, h));
          vec3 blue = mix(vec3(0.36, 0.56, 0.8), vec3(0.08, 0.24, 0.62), smoothstep(-0.05, 0.55, h));
          vec3 c = mix(night, blue, day);
          float dusk = exp(-abs(sunAlt) * 9.0) * exp(-abs(h) * 5.0) * (0.35 + pow(toSun, 3.0));
          c += vec3(1.0, 0.45, 0.18) * dusk * 0.8;
          c += vec3(1.0, 0.9, 0.7) * pow(toSun, 60.0) * day * 0.35;
          gl_FragColor = vec4(c, 1.0);
        }`,
    }))
    this.sky = new THREE.Mesh(track(new THREE.SphereGeometry(100, 48, 24)), this.skyMaterial)
    this.sky.renderOrder = -1
    this.sky.name = 'sky'
    this.sky.layers.set(SKY)
    this.scene.add(this.sky)

    // Stars, only in the sky seen from Earth.
    for (let set = 0; set < 2; set++) {
      const count = 900, star = new Float32Array(count * 3)
      for (let i = 0; i < count; i++) {
        const u = Math.random() * 2 - 1, theta = Math.random() * TAU, r = 90, s = Math.sqrt(1 - u * u)
        star[i * 3] = r * s * Math.cos(theta); star[i * 3 + 1] = r * u; star[i * 3 + 2] = r * s * Math.sin(theta)
      }
      const geometry = track(new THREE.BufferGeometry())
      geometry.setAttribute('position', new THREE.BufferAttribute(star, 3))
      const points = new THREE.Points(geometry, track(new THREE.PointsMaterial({ size: set ? 1.8 : 1.2, sizeAttenuation: false, color: set ? '#fff5da' : '#cbd6ff', transparent: true, depthWrite: false })))
      points.name = 'stars'
      points.layers.set(SKY)
      this.stars.push(points); this.scene.add(points)
    }

    // A small child on Earth, pointing at the moon.
    // Coat, face and hat are one draw coloured per part, and the pointing arm another; each part glows a little
    // in its own colour so the child reads on the night side too.
    const clothes = track(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, emissive: '#ffffff', emissiveIntensity: 0.3 }))
    clothes.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\ntotalEmissiveRadiance *= vColor.rgb;')
    }
    const body = new THREE.Mesh(track(merged([
      tinted(new THREE.CapsuleGeometry(0.045, 0.07, 6, 12).translate(0, 0.085, 0), '#e0553d'),
      tinted(new THREE.SphereGeometry(0.042, 20, 14).translate(0, 0.19, 0), '#f0c29a'),
      tinted(new THREE.SphereGeometry(0.045, 20, 10, 0, TAU, 0, Math.PI / 2).translate(0, 0.2, 0), '#f2c14e'),
      tinted(new THREE.SphereGeometry(0.016, 10, 8).translate(0, 0.25, 0), '#f2c14e'),
    ])), clothes)
    this.kidArm = new THREE.Group()
    const sleeve = new THREE.Mesh(track(tinted(new THREE.CapsuleGeometry(0.014, 0.08, 4, 8).translate(0, 0.055, 0), '#e0553d')), clothes)
    // The shoulder sits just outside the coat, so the arm swings clear of the body when it drops to the side.
    this.kidArm.add(sleeve); this.kidArm.position.set(0.062, 0.13, 0)
    this.kid.name = 'child'
    body.name = 'child-body'
    sleeve.name = 'child-arm'
    this.kid.add(body, this.kidArm)
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
    this.halves.name = 'halves'
    this.scene.add(inModel(this.halves))

    this.setMoon(0)
  }

  setMoon(elongation: number) {
    this.elongation = elongation
    this.arm.rotation.y = Math.PI + elongation
  }

  get spin() { return earthAngle(this.hours, this.home.lon) }

  /**
   * Where the child stands: at home, carried round as Earth turns. Worked out once per `update` and shared by
   * both views; callers only read the vectors.
   */
  private kidFrame() {
    return (this.kidCache ??= this.placeKid())
  }

  private placeKid() {
    const z = zenith(this.home, this.spin)
    const up = new THREE.Vector3(z.x, z.y, z.z)
    const feet = up.clone().multiplyScalar(EARTH_R * 1.005).add(new THREE.Vector3(0, PLANE_Y, 0))
    const eye = feet.clone().addScaledVector(up, 0.045)
    const moon = this.moonWorld(new THREE.Vector3())
    return { up, feet, eye, moon, moonAlt: altitude(eye, up, moon), sunAlt: altitude(eye, up, this.sun.position) }
  }

  /** Moves home to the place on Earth under a world-space point. */
  setHomeFrom(point: THREE.Vector3) {
    this.home = homeAt({ x: point.x, y: point.y - PLANE_Y, z: point.z }, this.spin)
    this.kidHop = 1
  }

  moonWorld(target = new THREE.Vector3()) { return this.moon.getWorldPosition(target) }

  private pose(position: THREE.Vector3, target: THREE.Vector3, fov: number, up = THREE.Object3D.DEFAULT_UP) {
    return { position, q: new THREE.Quaternion().setFromRotationMatrix(this.m.lookAt(position, target, up)), fov, focus: position.distanceTo(target) }
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

  /**
   * The child's view: facing the moon's direction along the ground, tipped up
   * to frame it (or, once it has set, the empty sky over the horizon). "Up"
   * is the child's own zenith, which is why the moon looks upside down from
   * the southern hemisphere.
   */
  private eyePose(fov: number) {
    // Eye close to the ground: on a globe this small, standing any higher sinks the horizon out of view.
    const { up, eye, moon, moonAlt } = this.kidFrame()
    const toMoon = moon.clone().sub(eye).normalize()
    const ground = toMoon.clone().addScaledVector(up, -toMoon.dot(up))
    if (ground.lengthSq() < 1e-6) ground.set(1, 0, 0).addScaledVector(up, -up.x)
    ground.normalize()
    const pitch = viewPitch(moonAlt, (fov * Math.PI) / 180, horizonDip(EARTH_R, 0.049))
    const look = ground.multiplyScalar(Math.cos(pitch)).addScaledVector(up, Math.sin(pitch))
    const pose = this.pose(eye, eye.clone().add(look), fov, up)
    pose.focus = eye.distanceTo(moon)
    return pose
  }

  /** Points the sky shader and the moon at the view from home. */
  private skyFor(active: boolean) {
    const { up, eye, sunAlt } = this.kidFrame()
    const u = this.skyMaterial.uniforms
    ;(u.eye.value as THREE.Vector3).copy(eye)
    ;(u.up.value as THREE.Vector3).copy(up)
    ;(u.sunDir.value as THREE.Vector3).copy(this.sun.position).sub(eye).normalize()
    u.sunAlt.value = sunAlt
    this.moonDaylight.value = active ? Math.min(1, Math.max(0, (sunAlt + 0.12) / 0.32)) : 0
  }

  update(dt: number) {
    this.kidCache = null
    this.time += dt
    const t = this.time
    this.intro = Math.min(1, this.intro + dt / INTRO_SECONDS)
    // The grown-up's view eases after its target, so drags feel weighty.
    const k = 1 - Math.exp(-dt * 6)
    this.current.azimuth += (this.view.azimuth - this.current.azimuth) * k
    this.current.elevation += (this.view.elevation - this.current.elevation) * k
    this.current.distance += (this.view.distance - this.current.distance) * k

    this.earth.rotation.y = this.spin
    this.clouds.rotation.y += dt * 0.03
    this.sun.rotation.y += dt * 0.05
    for (const [i, glow] of this.sunGlow.entries()) glow.scale.setScalar(glow.userData.size * (1 + Math.sin(t * (1.3 + i * 0.4)) * 0.03))
    // Stars fade out as the sun comes up over home.
    const { up, feet, moon: moonPos, moonAlt, sunAlt } = this.kidFrame()
    const dark = 1 - Math.min(1, Math.max(0, (sunAlt + 0.1) / 0.25))
    this.stars.forEach((points, i) => { (points.material as THREE.PointsMaterial).opacity = (0.65 + Math.sin(t * (0.9 + i * 0.7) + i * 2) * 0.3) * dark })
    // The clockwork follows the arm: 64 teeth drive 20.
    this.bigGear.rotation.y = this.arm.rotation.y
    this.pinion.rotation.y = -this.arm.rotation.y * (64 / 20)

    // The child stands at home, faces the moon's direction and points at it
    // while it is up; after moving house they give a little hop.
    const toMoon = moonPos.clone().sub(feet)
    const forward = toMoon.addScaledVector(up, -toMoon.dot(up)).normalize()
    const right = new THREE.Vector3().crossVectors(up, forward).normalize()
    this.kid.quaternion.setFromRotationMatrix(this.m.makeBasis(right, up, forward.clone().negate()))
    this.kidHop = Math.max(0, this.kidHop - dt * 2.5)
    this.kid.position.copy(feet).addScaledVector(up, Math.abs(Math.sin(t * 3)) * 0.008 + Math.sin(this.kidHop * Math.PI) * 0.12)
    // Arm rotation about x: moonAlt − π/2 aims it at the moon's height; with the moon set, it rests at their side.
    const pointing = moonAlt > 0 ? moonAlt - Math.PI / 2 : Math.PI - 0.15
    this.kidArm.rotation.set(pointing - Math.sin(t * 2) * 0.06, 0, -0.15)

    // Rays: parallel lines from the lamp, ending on whichever sphere they reach. They are laid again only once
    // the moon has moved by more than a pixel's worth; their pulses run on the shader's clock every frame.
    const moon = this.moonWorld(new THREE.Vector3())
    if (moon.distanceToSquared(this.raysFor) > 1e-4) this.layRays(moon)
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
    let rising = false
    this.medallionPoses.forEach((m, i) => {
      const was = m.userData.lift ?? 0
      const lift = was + ((i === current ? 1 : 0) - was) * Math.min(1, dt * 8)
      // Settled medallions are left alone, so nothing is uploaded while the moon rests on a phase.
      if (Math.abs(lift - was) < 1e-4) return
      rising = true
      m.userData.lift = lift
      m.position.y = 0.03 + lift * 0.1
      m.scale.setScalar(1 + lift * 0.18)
      m.updateMatrix()
      this.medallionBodies.setMatrixAt(i, m.matrix)
      this.medallionFaces.setMatrixAt(i, m.matrix)
      this.medallionGlow.setX(i, 0.18 + lift * 0.22)
    })
    if (rising) {
      this.medallionBodies.instanceMatrix.needsUpdate = true
      this.medallionFaces.instanceMatrix.needsUpdate = true
      this.medallionGlow.needsUpdate = true
    }
  }

  /** Lays each ray from the lamp to where it first meets the moon or Earth. */
  private layRays(moon: THREE.Vector3) {
    this.raysFor.copy(moon)
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

  /** What is under a point in normalised device coordinates. */
  pick(ndc: THREE.Vector2): { kind: 'moon' } | { kind: 'phase'; index: number } | { kind: 'earth'; point: THREE.Vector3 } | null {
    if (this.pov >= 0.5 || this.intro < 0.6) return null
    const ray = new THREE.Raycaster()
    ray.layers.enableAll()
    ray.setFromCamera(ndc, this.camera)
    // Earth and the moon are spheres, so they are hit-tested exactly as spheres: testing their 24,000-triangle
    // meshes cost a dropped frame per touch on a slow device.
    const moonCentre = this.moonWorld(new THREE.Vector3())
    const moonHit = ray.ray.intersectsSphere(new THREE.Sphere(moonCentre, MOON_R))
    // The moon is small on a phone; accept touches near it too.
    const moonScreen = moonCentre.clone().project(this.camera)
    if (moonHit || Math.hypot((moonScreen.x - ndc.x) * this.camera.aspect, moonScreen.y - ndc.y) < 0.14) return { kind: 'moon' }
    const earthPoint = ray.ray.intersectSphere(new THREE.Sphere(new THREE.Vector3(0, PLANE_Y, 0), EARTH_R), new THREE.Vector3())
    if (earthPoint) return { kind: 'earth', point: earthPoint }
    const face = ray.intersectObject(this.medallionFaces, false)[0]
    if (face?.instanceId !== undefined) return { kind: 'phase', index: face.instanceId }
    return null
  }

  /** The point on the orbit plane under the pointer, for dragging the moon. */
  orbitPlanePoint(ndc: THREE.Vector2) {
    const ray = new THREE.Raycaster()
    ray.setFromCamera(ndc, this.camera)
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -PLANE_Y), new THREE.Vector3())
  }

  /** Swaps in the window's own copies of the materials both views draw, or back to the main view's. */
  useWindowMaterials(on: boolean) {
    for (const [mesh, main, copy] of this.windowMaterials) mesh.material = on ? copy : main
  }

  /** Points the round window's camera at its view (the child's sky, or the model from above) and returns it. */
  aimWindow(): THREE.PerspectiveCamera {
    if (this.pov < 0.5) {
      this.skyFor(true)
      const eye = this.eyePose(24)
      this.eyeCamera.position.copy(eye.position); this.eyeCamera.quaternion.copy(eye.q)
      this.eyeCamera.aspect = 1; this.eyeCamera.updateProjectionMatrix()
      this.kid.visible = false
      return this.eyeCamera
    }
    this.skyFor(false)
    this.overheadCamera.aspect = 1; this.overheadCamera.updateProjectionMatrix()
    this.kid.visible = true
    return this.overheadCamera
  }

  /**
   * Points the main camera: the opening flight, then the model, blending into the child's eyes. Returns the
   * distance to keep in focus and how far into the child's view it is (0 to 1).
   */
  aimMain(): { focus: number; standing: number } {
    const intro = easeInOut(this.intro)
    const model = this.orreryPose(), eye = this.eyePose(60), start = this.introPose()
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
    // A near plane far from the eye keeps the depth buffer precise over the model; it closes in only as the
    // camera walks into the child's eyes, a few hundredths above the ground.
    this.camera.near = 0.3 + (0.01 - 0.3) * k
    this.camera.updateProjectionMatrix()
    // Halfway into Earth-view the model falls away and the starry sky takes over.
    if (this.pov < 0.5) { this.camera.layers.enable(MODEL); this.camera.layers.disable(SKY) }
    else { this.camera.layers.disable(MODEL); this.camera.layers.enable(SKY) }
    this.kid.visible = this.pov < 0.35
    this.skyFor(this.pov >= 0.5)
    return { focus: a.focus + (eye.focus - a.focus) * k, standing: k }
  }

  /** Sprites, glows and see-through shells, which must not stamp holes into a depth-of-field depth pass. */
  get depthless(): THREE.Object3D[] {
    return [...this.sunGlow, this.rays, this.halves, this.hint, this.clouds, this.atmosphere]
  }

  disposeScene() {
    for (const thing of this.disposables) thing.dispose()
  }
}
