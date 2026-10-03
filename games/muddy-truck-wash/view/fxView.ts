import * as THREE from 'three'
import { CAPACITY, type Particles } from '../fx'

// Draws the particle pool as one instanced set of camera-facing cards. Each
// kind is a small shape painted in the shader: a bubble with a rim and a
// glint, a drop, a crumb, a four-point star, a foam blob, a mud splat, dust.

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
    // A four-point star that swells and goes.
    float star = max(0.0, 1.0 - (abs(vUv.x) * abs(vUv.y) * 26.0 + r * 0.9));
    alpha = (star + (1.0 - smoothstep(0.0, 0.3, r)) * 0.8) * fade;
  } else if (kind < 4.5) {
    float lumpy = r + 0.12 * sin(atan(vUv.y, vUv.x) * 5.0 + phase * 30.0);
    alpha = (1.0 - smoothstep(0.75, 1.0, lumpy)) * fade;
    col = mix(vec3(0.8, 0.88, 0.96), vec3(1.0), 1.0 - smoothstep(0.0, 0.8, length(vUv - vec2(-0.2, 0.3))));
  } else if (kind < 5.5) {
    float lumpy = r + 0.16 * sin(atan(vUv.y, vUv.x) * 4.0 + phase * 30.0);
    alpha = (1.0 - smoothstep(0.75, 1.0, lumpy)) * fade;
    col = vec3(0.33, 0.2, 0.1) + 0.25 * (1.0 - smoothstep(0.0, 0.5, length(vUv - vec2(-0.25, 0.3))));
  } else {
    alpha = (1.0 - smoothstep(0.2, 1.0, r)) * fade * 0.5;
    col = vec3(0.8, 0.7, 0.54);
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

  /** Copies the pool into the cards. `limit` is how many a tier draws. */
  update(pool: Particles, limit: number): void {
    const n = Math.min(pool.count, limit)
    const spot = this.spot.array as Float32Array, look = this.look.array as Float32Array
    for (let i = 0; i < n; i++) {
      const t = pool.age[i] / pool.life[i]
      // In fast, out over the last third; a glint swells and shrinks.
      const fade = Math.min(1, t * 12) * Math.min(1, (1 - t) * 3)
      const kind = pool.kind[i]
      spot[i * 4] = pool.x[i]; spot[i * 4 + 1] = pool.y[i]; spot[i * 4 + 2] = pool.z[i]
      spot[i * 4 + 3] = pool.size[i] * (kind === 3 ? Math.sin(Math.min(1, t) * Math.PI) : kind === 6 ? 1 + t * 2 : 1)
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
