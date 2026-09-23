import * as THREE from 'three'

// The top tier's one glow pass. Only emissive things (beams and additive
// sprites, which also live on GLOW_LAYER) are drawn again into a target at
// half the CSS resolution, blurred there in two small separable steps, and
// added over the finished frame by a single full-screen composite. The
// target has no depth from the glass, so broad halos and caustics stay out
// of it (GLOW_PASS) or they would wash over the pieces. Lower tiers skip all
// of it; their sprite halos are simply larger.

export const GLOW_LAYER = 1

/** Shared by the beam and sprite materials: 1 while the glow layer is drawn, so only small hot light blooms. */
export const GLOW_PASS = { value: 0 }

const FULLSCREEN_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const BLUR_FRAGMENT = /* glsl */ `
uniform sampler2D uTexture;
uniform vec2 uStep;
varying vec2 vUv;
void main() {
  vec3 sum = texture2D(uTexture, vUv).rgb * 0.227027;
  sum += texture2D(uTexture, vUv + uStep * 1.384615).rgb * 0.316216;
  sum += texture2D(uTexture, vUv - uStep * 1.384615).rgb * 0.316216;
  sum += texture2D(uTexture, vUv + uStep * 3.230769).rgb * 0.070270;
  sum += texture2D(uTexture, vUv - uStep * 3.230769).rgb * 0.070270;
  gl_FragColor = vec4(sum, 1.0);
}
`

const COMPOSITE_FRAGMENT = /* glsl */ `
uniform sampler2D uTexture;
uniform float uStrength;
varying vec2 vUv;
void main() {
  gl_FragColor = vec4(texture2D(uTexture, vUv).rgb * uStrength, 1.0);
}
`

export class GlowPass {
  private readonly a: THREE.WebGLRenderTarget
  private readonly b: THREE.WebGLRenderTarget
  private readonly blur: THREE.ShaderMaterial
  private readonly composite: THREE.ShaderMaterial
  private readonly quad: THREE.Mesh
  private readonly scene = new THREE.Scene()
  private readonly camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly clearColour = new THREE.Color()
  private readonly black = new THREE.Color(0, 0, 0)
  private width = 1
  private height = 1

  constructor() {
    const options = { depthBuffer: true, stencilBuffer: false, type: THREE.UnsignedByteType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter }
    this.a = new THREE.WebGLRenderTarget(1, 1, options)
    this.b = new THREE.WebGLRenderTarget(1, 1, { ...options, depthBuffer: false })
    this.blur = new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: null }, uStep: { value: new THREE.Vector2() } },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: BLUR_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    })
    this.composite = new THREE.ShaderMaterial({
      uniforms: { uTexture: { value: null }, uStrength: { value: 0.7 } },
      vertexShader: FULLSCREEN_VERTEX,
      fragmentShader: COMPOSITE_FRAGMENT,
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
    })
    const triangle = new THREE.BufferGeometry()
    triangle.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
    this.quad = new THREE.Mesh(triangle, this.blur)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)
  }

  /** Size in CSS pixels; the glow target is half of it. */
  setSize(cssWidth: number, cssHeight: number): void {
    const width = Math.max(1, Math.round(cssWidth / 2))
    const height = Math.max(1, Math.round(cssHeight / 2))
    if (width === this.width && height === this.height) return
    this.width = width
    this.height = height
    this.a.setSize(width, height)
    this.b.setSize(width, height)
  }

  render(gl: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera): void {
    const autoClear = gl.autoClear
    const clearAlpha = gl.getClearAlpha()
    gl.getClearColor(this.clearColour)
    gl.setClearColor(this.black, 1)

    camera.layers.set(GLOW_LAYER)
    GLOW_PASS.value = 1
    gl.setRenderTarget(this.a)
    gl.clear(true, true, false)
    gl.render(scene, camera)
    GLOW_PASS.value = 0
    camera.layers.set(0)

    gl.autoClear = false
    this.quad.material = this.blur
    this.blur.uniforms.uTexture.value = this.a.texture
    this.blur.uniforms.uStep.value.set(1.5 / this.width, 0)
    gl.setRenderTarget(this.b)
    gl.render(this.scene, this.camera)
    this.blur.uniforms.uTexture.value = this.b.texture
    this.blur.uniforms.uStep.value.set(0, 1.5 / this.height)
    gl.setRenderTarget(this.a)
    gl.render(this.scene, this.camera)

    gl.setRenderTarget(null)
    this.quad.material = this.composite
    this.composite.uniforms.uTexture.value = this.a.texture
    gl.render(this.scene, this.camera)

    gl.autoClear = autoClear
    gl.setClearColor(this.clearColour, clearAlpha)
  }

  dispose(): void {
    this.a.dispose()
    this.b.dispose()
    this.blur.dispose()
    this.composite.dispose()
    this.quad.geometry.dispose()
  }
}
