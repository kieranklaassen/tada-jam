import * as THREE from 'three'

// The one full-screen pass: the rendered forest is laid on a sheet of
// watercolour paper. A static procedural grain (fibres and tooth) is
// multiplied in, and the image is nudged by a slow, static noise of about
// a pixel so painted edges wobble like a hand-cut line. No depth read, no
// time uniform: the paper never moves.

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = position.xy * 0.5 + 0.5;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D scene;
  uniform vec2 resolution;
  uniform float dpr;
  varying vec2 vUv;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  void main() {
    vec2 px = gl_FragCoord.xy / dpr;
    vec2 wobble = vec2(noise(px * 0.05), noise(px * 0.05 + 17.3)) - 0.5;
    vec3 col = texture2D(scene, vUv + wobble * 2.4 * dpr / resolution).rgb;
    float tooth = noise(px * 0.85);
    float fibre = noise(vec2(px.x * 0.12, px.y * 0.9) + 5.0);
    float cloud = noise(px * 0.012);
    float paper = 0.925 + 0.06 * tooth + 0.035 * fibre + 0.03 * cloud;
    col *= paper;
    vec2 q = vUv - 0.5;
    col *= 1.0 - dot(q, q) * 0.42;
    gl_FragColor = vec4(col, 1.0);
  }
`

export function createPost(): { scene: THREE.Scene; camera: THREE.Camera; material: THREE.ShaderMaterial } {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: { scene: { value: null }, resolution: { value: new THREE.Vector2(1, 1) }, dpr: { value: 1 } },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  const scene = new THREE.Scene()
  scene.add(mesh)
  return { scene, camera: new THREE.Camera(), material }
}
