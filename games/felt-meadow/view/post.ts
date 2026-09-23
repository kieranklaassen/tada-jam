import { BufferAttribute, BufferGeometry, Mesh, OrthographicCamera, ShaderMaterial, Vector2, WebGLRenderTarget, type Camera, type Scene, type WebGLRenderer } from 'three'

// The one full-screen pass: a miniature's tilt-shift (top tier only), a warm
// grade like window light on wool, and a soft vignette. Colours are display
// values end to end, so skipping this pass on slower tiers only loses the
// blur and the vignette, never the palette.

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform sampler2D tScene;
uniform vec2 uTexel;
uniform float uBlur;
varying vec2 vUv;
void main() {
  vec3 color = texture2D(tScene, vUv).rgb;
  if (uBlur > 0.5) {
    float band = smoothstep(0.64, 0.98, vUv.y) + (1.0 - smoothstep(0.0, 0.16, vUv.y)) * 0.6;
    if (band > 0.02) {
      vec2 r = uTexel * band * 4.5;
      vec3 sum = color;
      sum += texture2D(tScene, vUv + r * vec2(1.0, 0.0)).rgb;
      sum += texture2D(tScene, vUv + r * vec2(-1.0, 0.0)).rgb;
      sum += texture2D(tScene, vUv + r * vec2(0.0, 1.0)).rgb;
      sum += texture2D(tScene, vUv + r * vec2(0.0, -1.0)).rgb;
      sum += texture2D(tScene, vUv + r * vec2(0.7, 0.7)).rgb;
      sum += texture2D(tScene, vUv + r * vec2(-0.7, 0.7)).rgb;
      sum += texture2D(tScene, vUv + r * vec2(0.7, -0.7)).rgb;
      sum += texture2D(tScene, vUv + r * vec2(-0.7, -0.7)).rgb;
      color = sum / 9.0;
    }
  }
  color = color * vec3(1.015, 1.0, 0.972) + vec3(0.012, 0.008, 0.0);
  vec2 d = (vUv - vec2(0.5, 0.47)) * vec2(1.1, 1.3);
  color *= 1.0 - 0.15 * smoothstep(0.38, 0.98, length(d));
  gl_FragColor = vec4(color, 1.0);
}
`

export class PostPass {
  private readonly target = new WebGLRenderTarget(1, 1, { depthBuffer: true, stencilBuffer: false })
  private readonly material: ShaderMaterial
  private readonly quad: Mesh
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

  constructor() {
    const geometry = new BufferGeometry()
    geometry.setAttribute('position', new BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3))
    geometry.setAttribute('uv', new BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2))
    this.material = new ShaderMaterial({
      uniforms: { tScene: { value: this.target.texture }, uTexel: { value: new Vector2(1, 1) }, uBlur: { value: 0 } },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })
    this.quad = new Mesh(geometry, this.material)
    this.quad.frustumCulled = false
  }

  setSize(width: number, height: number): void {
    this.target.setSize(width, height)
    this.material.uniforms.uTexel.value.set(1 / width, 1 / height)
  }

  /** Multisample the scene target (0 for none). three.js sets a target up once, so a change rebuilds it on its next use. */
  setSamples(samples: number): void {
    if (this.target.samples === samples) return
    this.target.samples = samples
    this.target.dispose()
  }

  render(renderer: WebGLRenderer, scene: Scene, camera: Camera, blur: boolean): void {
    renderer.setRenderTarget(this.target)
    renderer.render(scene, camera)
    renderer.setRenderTarget(null)
    this.material.uniforms.uBlur.value = blur ? 1 : 0
    renderer.render(this.quad, this.camera)
  }

  dispose(): void {
    this.target.dispose()
    this.material.dispose()
    this.quad.geometry.dispose()
  }
}
