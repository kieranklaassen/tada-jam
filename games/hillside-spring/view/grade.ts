import * as THREE from 'three'

// The last thing drawn under the ghost hand: one full-screen quad that
// grades the finished frame the way a painter glazes a canvas. It blends as
// 2·src·dst, so mid-grey leaves a pixel alone; warmer than grey warms it,
// darker than grey deepens it. That one quad lays the afternoon's golden
// wash from the sun's corner, a soft vignette, and watercolour-paper grain,
// without a render target or a post pass.

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform sampler2D uPaper;
uniform vec2 uRepeat;
uniform vec3 uWarm;
uniform vec3 uCool;
varying vec2 vUv;
void main() {
  float sun = smoothstep(1.25, 0.0, length((vUv - vec2(-0.05, 1.08)) * vec2(0.85, 1.25)));
  float vignette = smoothstep(0.42, 1.0, length((vUv - vec2(0.5, 0.55)) * vec2(1.05, 1.0)));
  float grain = texture2D(uPaper, vUv * uRepeat).r - 0.5;
  vec3 tint = vec3(0.5) + uWarm * (0.35 + 0.65 * sun) - uCool * vignette;
  gl_FragColor = vec4(tint + grain * 0.14, 1.0);
}
`

export class Grade {
  readonly mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>

  constructor(paper: THREE.Texture) {
    const material = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      uniforms: {
        uPaper: { value: paper },
        uRepeat: { value: new THREE.Vector2(4, 3) },
        uWarm: { value: new THREE.Vector3(0.075, 0.035, -0.05) },
        uCool: { value: new THREE.Vector3(0.085, 0.075, 0.05) },
      },
      depthTest: false,
      depthWrite: false,
      transparent: true,
      blending: THREE.CustomBlending,
      blendEquation: THREE.AddEquation,
      blendSrc: THREE.DstColorFactor,
      blendDst: THREE.SrcColorFactor,
    })
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material)
    this.mesh.frustumCulled = false
    this.mesh.renderOrder = 15
  }

  /** Paper grain stays the same size on screen whatever the canvas shape. */
  resize(width: number, height: number): void {
    this.mesh.material.uniforms.uRepeat.value.set(width / 300, height / 300)
  }

  dispose(): void {
    this.mesh.geometry.dispose()
    this.mesh.material.uniforms.uPaper.value.dispose()
    this.mesh.material.dispose()
  }
}
