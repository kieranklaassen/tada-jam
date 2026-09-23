import * as THREE from 'three'
import type { Vec3 } from '../choir'
import { POND } from '../layout'
import type { TierLook } from '../tiers'
import { BANK_Z } from './pond'
import { PALETTE } from './palette'
import { mergeParts, part, shapes, stick } from './parts'
import { haloTexture } from './textures'
import { outlineMaterial, toonMaterial, type SharedUniforms } from './toon'

// The firefly is the conductor and the pond's only lamp. Its body is tiny
// and dark; what reads is the glowing tail, a halo in stepped rings, and a
// trail of sparkles that drift down behind it. Its light is also the shared
// uniform that paints stepped light pools on the frogs, pads, and water.
// Distant fireflies blink around the edges; they move entirely in the
// vertex shader, so they cost nothing on the CPU.

const MAX_TRAIL = 24
const TRAIL_LIFE = 1.4
const TRAIL_EVERY = 0.055
const MAX_AMBIENT = 14

const TRAIL_VERTEX = /* glsl */ `
  attribute float aBirth;
  uniform float uTime;
  uniform float uLife;
  uniform float uSize;
  uniform float uScale;
  varying float vFade;
  void main() {
    float age = uTime - aBirth;
    float k = clamp(age / uLife, 0.0, 1.0);
    vec3 p = position;
    p.y -= age * 0.24;
    p.x += sin(aBirth * 17.0 + age * 2.5) * 0.08 * age;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float alive = step(0.0, age) * step(age, uLife);
    vFade = (1.0 - k) * alive;
    gl_PointSize = uSize * (1.0 - k * 0.55) * uScale / -mv.z * alive;
  }
`

const AMBIENT_VERTEX = /* glsl */ `
  attribute float aPhase;
  uniform float uTime;
  uniform float uSize;
  uniform float uScale;
  varying float vFade;
  void main() {
    float t = uTime + aPhase * 11.0;
    vec3 p = position + vec3(sin(t * 0.31) * 0.7, sin(t * 0.53 + aPhase * 3.0) * 0.28, cos(t * 0.27 + aPhase) * 0.5);
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    float blink = pow(0.5 + 0.5 * sin(t * 1.1 + aPhase * 7.0), 2.0);
    vFade = 0.4 + 0.6 * blink;
    gl_PointSize = uSize * (0.55 + 0.45 * blink) * uScale / -mv.z;
  }
`

const SPARKLE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  varying float vFade;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = step(d, 0.5) * 0.3 + step(d, 0.3) * 0.7;
    if (a <= 0.0) discard;
    gl_FragColor = vec4(uColor, a * vFade);
  }
`

export type FireflyView = {
  group: THREE.Group
  body: THREE.Group
  halo: THREE.Sprite
  trail: THREE.Points
  ambient: THREE.Points
  /** Sparkle size scale: the canvas height in device pixels over the frustum height at unit distance. */
  setPixelScale(scale: number): void
  update(position: Vec3, time: number, dt: number, flare: number, look: TierLook): void
}

export function buildFirefly(shared: SharedUniforms, gradient: THREE.Texture): FireflyView {
  const group = new THREE.Group()
  const body = new THREE.Group()
  const dark = PALETTE.fireflyBody
  const bodyParts = [
    part(shapes.sphere(1), dark, { position: [0, 0, 0.04], scale: [0.085, 0.08, 0.1] }),
    part(shapes.sphere(1), dark, { position: [0, 0.02, 0.15], scale: 0.07 }),
    part(shapes.tiny(), '#ffffff', { position: [-0.035, 0.05, 0.2], scale: 0.022 }, 0, false),
    part(shapes.tiny(), '#ffffff', { position: [0.035, 0.05, 0.2], scale: 0.022 }, 0, false),
    part(shapes.cylinder(), dark, stick([-0.03, 0.07, 0.17], [-0.08, 0.2, 0.26], 0.009)),
    part(shapes.cylinder(), dark, stick([0.03, 0.07, 0.17], [0.08, 0.2, 0.26], 0.009)),
    part(shapes.tiny(), dark, { position: [-0.08, 0.2, 0.26], scale: 0.022 }),
    part(shapes.tiny(), dark, { position: [0.08, 0.2, 0.26], scale: 0.022 }),
  ]
  const bodyGeometry = mergeParts(bodyParts)
  body.add(new THREE.Mesh(bodyGeometry, toonMaterial(shared, gradient)), new THREE.Mesh(mergeParts(bodyParts, { outlineOnly: true }), outlineMaterial(shared, 0.012)))
  const tail = new THREE.Mesh(shapes.sphere(1), new THREE.MeshBasicMaterial({ color: PALETTE.fireflyCore, fog: false }))
  tail.position.set(0, -0.02, -0.1)
  tail.scale.set(0.12, 0.11, 0.15)
  body.add(tail)
  const wingGeometry = shapes.sphere(0).clone()
  wingGeometry.translate(1, 0, 0)
  const wingMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.fireflyWing, transparent: true, opacity: 0.8, fog: false, depthWrite: false })
  const wings = [-1, 1].map((side) => {
    const wing = new THREE.Mesh(wingGeometry, wingMaterial)
    wing.position.set(side * 0.03, 0.07, 0.02)
    wing.scale.set(side * 0.1, 0.015, 0.05)
    body.add(wing)
    return wing
  })
  group.add(body)

  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({ map: haloTexture(), color: PALETTE.fireflyGlow, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, fog: false }),
  )
  group.add(halo)

  const trailGeometry = new THREE.BufferGeometry()
  const trailPositions = new Float32Array(MAX_TRAIL * 3)
  const births = new Float32Array(MAX_TRAIL).fill(-100)
  trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3).setUsage(THREE.DynamicDrawUsage))
  trailGeometry.setAttribute('aBirth', new THREE.BufferAttribute(births, 1).setUsage(THREE.DynamicDrawUsage))
  const trailUniforms = {
    uTime: shared.uTime,
    uLife: { value: TRAIL_LIFE },
    uSize: { value: 0.11 },
    uScale: { value: 800 },
    uColor: { value: new THREE.Color(PALETTE.fireflyGlow) },
  }
  const trail = new THREE.Points(
    trailGeometry,
    new THREE.ShaderMaterial({
      vertexShader: TRAIL_VERTEX,
      fragmentShader: SPARKLE_FRAGMENT,
      uniforms: trailUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  trail.frustumCulled = false

  const ambientGeometry = new THREE.BufferGeometry()
  const ambientPositions = new Float32Array(MAX_AMBIENT * 3)
  const phases = new Float32Array(MAX_AMBIENT)
  let seed = 11
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  // Two in three drift in front of the far bank, the rest by the side reeds,
  // all inside the frame, so even the few kept on the lowest tier are seen.
  for (let i = 0; i < MAX_AMBIENT; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const alongBank = i % 3 !== 0
    ambientPositions[i * 3] = alongBank ? POND.minX + 0.5 + random() * (POND.maxX - POND.minX - 1) : side * (POND.maxX - 0.6 + random() * 0.6)
    ambientPositions[i * 3 + 1] = 0.6 + random() * 1.3
    ambientPositions[i * 3 + 2] = alongBank ? BANK_Z + 1.3 + random() * 0.6 : POND.farZ + random() * (POND.nearZ - POND.farZ) * 0.7
    phases[i] = random()
  }
  ambientGeometry.setAttribute('position', new THREE.BufferAttribute(ambientPositions, 3))
  ambientGeometry.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))
  const ambientUniforms = { uTime: shared.uTime, uSize: { value: 0.13 }, uScale: trailUniforms.uScale, uColor: { value: new THREE.Color(PALETTE.glow) } }
  const ambient = new THREE.Points(
    ambientGeometry,
    new THREE.ShaderMaterial({
      vertexShader: AMBIENT_VERTEX,
      fragmentShader: SPARKLE_FRAGMENT,
      uniforms: ambientUniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  )
  ambient.frustumCulled = false

  let next = 0
  let sinceEmit = 0
  const last = new THREE.Vector3()
  let heading = 0
  const birthAttribute = trailGeometry.getAttribute('aBirth') as THREE.BufferAttribute
  const positionAttribute = trailGeometry.getAttribute('position') as THREE.BufferAttribute

  return {
    group,
    body,
    halo,
    trail,
    ambient,
    setPixelScale(scale) {
      trailUniforms.uScale.value = scale
    },
    update(position, time, dt, flare, look) {
      group.position.set(position.x, position.y, position.z)
      const vx = position.x - last.x
      const vz = position.z - last.z
      const vy = position.y - last.y
      if (vx * vx + vz * vz > 1e-8) {
        const target = Math.atan2(vx, vz)
        let delta = target - heading
        delta -= Math.round(delta / (Math.PI * 2)) * Math.PI * 2
        heading += delta * (1 - Math.exp(-dt * 8))
      }
      body.rotation.set(-Math.atan2(vy, Math.hypot(vx, vz) + 1e-4) * 0.6, heading, 0)
      last.set(position.x, position.y, position.z)
      const flap = Math.sin(time * 38) * 0.55
      wings[0].rotation.z = -flap
      wings[1].rotation.z = flap
      body.position.y = Math.sin(time * 3.1) * 0.03
      const pulse = 0.94 + 0.06 * Math.sin(time * 4.2)
      halo.scale.setScalar(1.8 * look.halo * pulse * (1 + 0.5 * flare))
      shared.uFirePos.value.set(position.x, position.y, position.z)
      // On each note the light pool on the singer brightens by about one band.
      shared.uFireStrength.value = 0.85 + 0.15 * pulse + 0.9 * flare

      sinceEmit += dt
      const count = look.trail
      if (sinceEmit >= TRAIL_EVERY) {
        sinceEmit = 0
        const i = next % count
        next = (next + 1) % count
        positionAttribute.setXYZ(i, position.x + Math.sin(time * 13) * 0.05, position.y - 0.03, position.z + Math.cos(time * 11) * 0.05)
        birthAttribute.setX(i, time)
        positionAttribute.needsUpdate = true
        birthAttribute.needsUpdate = true
      }
      trail.geometry.setDrawRange(0, count)
      ambient.geometry.setDrawRange(0, look.ambientFireflies)
      ambient.visible = look.ambientFireflies > 0
    },
  }
}
