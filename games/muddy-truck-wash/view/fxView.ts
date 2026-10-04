import * as THREE from 'three'
import { CAPACITY, type Particles } from '../fx'

// Draws the particle pool as one instanced set of camera-facing cards. Each
// kind is a small shape painted in the shader: a bubble with a rim and a
// glint, a drop, a crumb, a slanted gleam, a foam blob, a mud splat, dust,
// mist, a crack, a dent, a hanging bead and a ring of steam.

const VERTEX = /* glsl */ `
attribute vec4 aSpot;
attribute vec3 aLook;
varying vec2 vUv;
varying vec3 vLook;
void main() {
  vUv = position.xy * 2.0;
  vLook = aLook;
  vec4 centre = viewMatrix * vec4(aSpot.xyz, 1.0);
  centre.xy += position.xy * aSpot.w;
  // A little toward the eye, so a bubble on a panel is not cut by it.
  centre.z += 0.12;
  gl_Position = projectionMatrix * centre;
}
`

const FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec3 vLook;
void main() {
  float kind = vLook.x, fade = vLook.y, phase = vLook.z;
  float r = length(vUv);
  vec3 col = vec3(1.0);
  float alpha = 0.0;
  if (kind < 0.5) {
    // Bubble: a thin bright rim, a faint body, one sharp glint.
    float rim = smoothstep(0.72, 0.9, r) * (1.0 - smoothstep(0.92, 1.0, r));
    float glint = 1.0 - smoothstep(0.08, 0.16, length(vUv - vec2(-0.38, 0.4)));
    alpha = (rim * 0.85 + (1.0 - smoothstep(0.9, 1.0, r)) * 0.2 + glint) * fade;
    col = mix(vec3(0.8, 0.93, 1.0), vec3(1.0), glint + rim * 0.5);
  } else if (kind < 1.5) {
    alpha = (1.0 - smoothstep(0.55, 1.0, r)) * fade;
    col = mix(vec3(0.55, 0.8, 1.0), vec3(1.0), 1.0 - smoothstep(0.0, 0.5, length(vUv - vec2(-0.25, 0.3))));
  } else if (kind < 2.5) {
    alpha = (1.0 - smoothstep(0.7, 1.0, max(abs(vUv.x), abs(vUv.y) * 1.3))) * fade;
    col = mix(vec3(0.58, 0.46, 0.3), vec3(0.78, 0.66, 0.47), phase);
  } else if (kind < 3.5) {
    // A gleam that swells and goes: a soft round light with one long slanted flash through it, as on polished
    // metal. Not a star with crossed arms, which would read as a sign.
    vec2 g = vec2(vUv.x * 0.8 + vUv.y * 0.6, -vUv.x * 0.6 + vUv.y * 0.8);
    float flash = (1.0 - smoothstep(0.0, 1.0, abs(g.x))) * (1.0 - smoothstep(0.0, 0.16 * (1.0 - abs(g.x)), abs(g.y)));
    alpha = max(flash, (1.0 - smoothstep(0.0, 0.42, r)) * 0.85) * fade;
  } else if (kind < 4.5) {
    float lumpy = r + 0.05 * sin(atan(vUv.y, vUv.x) * 3.0 + phase * 30.0);
    alpha = (1.0 - smoothstep(0.75, 1.0, lumpy)) * fade;
    col = mix(vec3(0.8, 0.88, 0.96), vec3(1.0), 1.0 - smoothstep(0.0, 0.8, length(vUv - vec2(-0.2, 0.3))));
  } else if (kind < 5.5) {
    float lumpy = r + 0.09 * sin(atan(vUv.y, vUv.x) * 3.0 + phase * 30.0);
    alpha = (1.0 - smoothstep(0.75, 1.0, lumpy)) * fade;
    col = vec3(0.33, 0.2, 0.1) + 0.25 * (1.0 - smoothstep(0.0, 0.5, length(vUv - vec2(-0.25, 0.3))));
  } else if (kind < 6.5) {
    alpha = (1.0 - smoothstep(0.2, 1.0, r)) * fade * 0.5;
    col = vec3(0.8, 0.7, 0.54);
  } else if (kind < 7.5) {
    // Mist: a soft pale cloud, brighter on the side the light is.
    alpha = (1.0 - smoothstep(0.0, 1.0, r)) * fade * 0.3;
    col = mix(vec3(0.72, 0.86, 0.98), vec3(1.0), smoothstep(0.5, -0.6, vUv.x - vUv.y));
  } else if (kind < 8.5) {
    // A crack: one dark jagged line across dried mud. One stroke only: a second that met it could cross it and read as a sign.
    float line = abs(vUv.y - 0.24 * sin(vUv.x * 7.0 + phase * 30.0) - 0.12 * sin(vUv.x * 17.0 + phase * 11.0));
    float ends = 1.0 - smoothstep(0.75, 1.0, abs(vUv.x));
    alpha = (1.0 - smoothstep(0.035, 0.085, line)) * ends * fade;
    col = vec3(0.26, 0.19, 0.11);
  } else if (kind < 9.5) {
    // A dent in soft mud: a dark hollow with a wet lip below it.
    alpha = (1.0 - smoothstep(0.55, 1.0, r)) * fade * 0.7;
    col = mix(vec3(0.17, 0.1, 0.05), vec3(0.62, 0.5, 0.38), smoothstep(0.35, 0.8, r) * smoothstep(0.1, -0.7, vUv.y - vUv.x * 0.4));
  } else if (kind < 10.5) {
    // A bead: a drop still hanging, round below and drawn up to where it hangs from.
    float pear = length(vec2(vUv.x * (1.0 + 0.9 * smoothstep(-0.2, 1.0, vUv.y)), vUv.y));
    alpha = 1.0 - smoothstep(0.6, 0.95, pear);
    col = mix(vec3(0.55, 0.8, 1.0), vec3(1.0), 1.0 - smoothstep(0.0, 0.45, length(vUv - vec2(-0.2, -0.1))));
  } else {
    // A ring of steam, lying flat and seen from a little above it: a wide, thin, soft loop with the air showing through its middle.
    float loop = abs(length(vec2(vUv.x, vUv.y * 3.0)) - 0.72);
    alpha = (1.0 - smoothstep(0.05, 0.24, loop)) * fade * 0.8;
    col = vec3(0.94, 0.96, 0.98);
  }
  if (alpha < 0.01) discard;
  gl_FragColor = vec4(col, alpha);
}
`

export class FxView {
  readonly mesh: THREE.InstancedMesh
  private readonly spot: THREE.InstancedBufferAttribute
  private readonly look: THREE.InstancedBufferAttribute
  private readonly material: THREE.ShaderMaterial

  constructor() {
    const geometry = new THREE.PlaneGeometry(1, 1)
    this.spot = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 4), 4)
    this.look = new THREE.InstancedBufferAttribute(new Float32Array(CAPACITY * 3), 3)
    this.spot.setUsage(THREE.DynamicDrawUsage)
    this.look.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('aSpot', this.spot)
    geometry.setAttribute('aLook', this.look)
    this.material = new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, transparent: true, depthWrite: false })
    this.mesh = new THREE.InstancedMesh(geometry, this.material, CAPACITY)
    this.mesh.name = 'fx'
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 5
    this.mesh.count = 0
  }

  /** Copies the pool into the cards. All of it, on every tier: each of these things is heard when it lands or pops, so each is seen. */
  update(pool: Particles): void {
    const n = pool.count
    const spot = this.spot.array as Float32Array, look = this.look.array as Float32Array
    for (let i = 0; i < n; i++) {
      const t = pool.age[i] / pool.life[i]
      // In fast, out over the last third; a glint swells and shrinks.
      const kind = pool.kind[i]
      // A bead does not fade: it swells and then it is the drop that falls.
      const fade = kind === 10 ? 1 : Math.min(1, t * 12) * Math.min(1, (1 - t) * 3)
      spot[i * 4] = pool.x[i]; spot[i * 4 + 1] = pool.y[i]; spot[i * 4 + 2] = pool.z[i]
      // A glint swells and goes; dust and mist spread; a crack runs across; a dent fills.
      spot[i * 4 + 3] = pool.size[i] * (kind === 3 ? Math.sin(Math.min(1, t) * Math.PI) : kind === 8 ? Math.min(1, 0.25 + t * 6) : kind === 9 ? 1 - 0.75 * t : kind === 10 ? 0.25 + 0.75 * Math.min(1, t * 1.15) : kind === 11 ? 1 + t * 1.5 : kind >= 6 ? 1 + t * 2 : 1)
      look[i * 3] = kind; look[i * 3 + 1] = fade; look[i * 3 + 2] = pool.phase[i] % 1
    }
    this.mesh.count = n
    this.spot.needsUpdate = true
    this.look.needsUpdate = true
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.material.dispose()
  }
}
