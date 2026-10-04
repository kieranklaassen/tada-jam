import * as THREE from 'three'
import { TRAY } from '../world'
import { MAP_HEIGHT, MAP_WIDTH, type SandMap } from './sandMap'

// The sand: one flat plane lit in the fragment shader from the slope of the
// height canvas (two taps each way), under a low raking light. Grains are a
// hash, soft shadows of the friends and the plank are a few uniforms, so the
// whole tray floor is one draw with no shadow map.

export const MAX_SHADOWS = 6
/** Points from the sand toward the light: low, from the left and a little behind. */
export const LIGHT = new THREE.Vector3(-0.78, 0.44, -0.44).normalize()

const vertex = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorld;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const fragment = /* glsl */ `
precision highp float;
uniform sampler2D uHeight;
uniform vec2 uTexel;
uniform vec3 uLight;
uniform vec3 uSand;
uniform vec3 uShade;
uniform vec3 uSun;
uniform float uGrain;
uniform vec4 uShadows[${MAX_SHADOWS}];
uniform vec4 uPlank;
uniform float uPlankHalf;
uniform float uGlow;
uniform vec3 uGlowAt;
varying vec2 vUv;
varying vec3 vWorld;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float segment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  float hl = texture2D(uHeight, vUv - vec2(uTexel.x, 0.0)).r;
  float hr = texture2D(uHeight, vUv + vec2(uTexel.x, 0.0)).r;
  float hd = texture2D(uHeight, vUv - vec2(0.0, uTexel.y)).r;
  float hu = texture2D(uHeight, vUv + vec2(0.0, uTexel.y)).r;
  float h = texture2D(uHeight, vUv).r;
  vec3 n = normalize(vec3((hl - hr) * 5.5, 1.0, (hd - hu) * 5.5));

  // Grains: a fine speckle in the albedo and a tilt of the normal, so the light catches single grains.
  vec2 g = floor(vWorld.xz * 70.0);
  float speck = hash(g);
  n = normalize(n + (vec3(hash(g + 3.1), 0.0, hash(g + 7.7)) - 0.5) * 0.12 * uGrain);

  float lit = max(dot(n, uLight), 0.0);
  // A furrow's own floor lies in shadow: lower sand is a little darker.
  float hollow = smoothstep(0.50, 0.24, h);

  float shadow = 0.0;
  for (int i = 0; i < ${MAX_SHADOWS}; i++) {
    vec4 s = uShadows[i];
    vec2 d = (vWorld.xz - s.xy) / vec2(s.z * 2.1, s.z);
    shadow = max(shadow, s.w * (1.0 - smoothstep(0.55, 1.15, length(d))));
  }
  float plank = segment(vWorld.xz, uPlank.xy, uPlank.zw);
  shadow = max(shadow, 0.62 * (1.0 - smoothstep(uPlankHalf * 0.7, uPlankHalf * 1.5, plank)));

  vec3 albedo = uSand * (0.96 + 0.07 * speck * uGrain);
  vec3 colour = albedo * (uShade + uSun * lit * 1.9 * (1.0 - shadow * 0.85));
  colour *= 1.0 - hollow * 0.22;
  colour = mix(colour, colour * vec3(0.55, 0.6, 0.88), shadow * 0.8);
  // A few grains flash.
  colour += uSun * step(0.992, speck) * lit * 0.35 * uGrain * (1.0 - shadow);
  // The idle glow: a warm ring of light on the sand under what can be touched.
  float ring = length(vWorld.xz - uGlowAt.xy) / max(uGlowAt.z, 0.001);
  colour += vec3(1.0, 0.86, 0.42) * uGlow * smoothstep(1.7, 1.05, ring) * smoothstep(0.75, 1.05, ring) * 0.55;
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}`

export class Sand {
  readonly mesh: THREE.Mesh
  readonly material: THREE.ShaderMaterial
  private readonly texture: THREE.CanvasTexture

  constructor(private readonly map: SandMap) {
    this.texture = new THREE.CanvasTexture(map.canvas)
    this.texture.colorSpace = THREE.NoColorSpace
    this.texture.minFilter = THREE.LinearFilter
    this.texture.magFilter = THREE.LinearFilter
    this.texture.generateMipmaps = false
    this.texture.flipY = false
    this.material = new THREE.ShaderMaterial({
      vertexShader: vertex,
      fragmentShader: fragment,
      uniforms: {
        uHeight: { value: this.texture },
        uTexel: { value: new THREE.Vector2(1.6 / MAP_WIDTH, 1.6 / MAP_HEIGHT) },
        uLight: { value: LIGHT },
        uSand: { value: new THREE.Color('#e9d3a9') },
        uShade: { value: new THREE.Color('#8f8aa0') },
        uSun: { value: new THREE.Color('#ffe9c4') },
        uGrain: { value: 1 },
        uShadows: { value: Array.from({ length: MAX_SHADOWS }, () => new THREE.Vector4(0, 0, 1, 0)) },
        uPlank: { value: new THREE.Vector4(-3, 0, 3, 0) },
        uPlankHalf: { value: 0.7 },
        uGlow: { value: 0 },
        uGlowAt: { value: new THREE.Vector3(0, 0, 1) },
      },
    })
    const geometry = new THREE.PlaneGeometry(TRAY.halfWidth * 2, TRAY.halfDepth * 2)
    geometry.rotateX(-Math.PI / 2)
    // After the turn, v runs from the child (0) to the far rim (1); the canvas has the far rim in its first row.
    const uv = geometry.attributes.uv
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - uv.getY(i))
    this.mesh = new THREE.Mesh(geometry, this.material)
    this.mesh.name = 'sand'
  }

  /** Sends the height canvas again if anything was drawn on it. */
  sync(): void {
    if (!this.map.dirty) return
    this.map.dirty = false
    this.texture.needsUpdate = true
  }

  setShadow(index: number, x: number, z: number, radius: number, strength: number): void {
    if (index < MAX_SHADOWS) (this.material.uniforms.uShadows.value as THREE.Vector4[])[index].set(x, z, radius, strength)
  }

  setPlankShadow(ax: number, az: number, bx: number, bz: number): void {
    (this.material.uniforms.uPlank.value as THREE.Vector4).set(ax, az, bx, bz)
  }

  dispose(): void {
    this.texture.dispose()
    this.material.dispose()
    this.mesh.geometry.dispose()
  }
}
