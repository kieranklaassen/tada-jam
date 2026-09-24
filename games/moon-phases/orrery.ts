import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js'
import { PHASE_COUNT, TAU, litPath, phaseAngle } from './phase'
import { postPasses, type Post } from './quality'
import { OrreryScene, SCALE_INNER, SCALE_OUTER, type OrreryAssets, type Porthole } from './scene'
import { cloudCanvas, earthCanvases, glowCanvas, moonCanvases, scaleCanvas, sunCanvas, woodCanvas } from './textures'

// The orrery on screen: the renderer, the post chain, and the round window's
// view. The world itself (scene, cameras, what moves) is `OrreryScene`.

function canvasTexture(canvas: HTMLCanvasElement, color = true) {
  const texture = new THREE.CanvasTexture(canvas)
  if (color) texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 8
  return texture
}

/** The eight phase medallions' enamel pictures in one atlas, four across and two down, 256 px each. */
function medallionAtlas() {
  const size = 256, r = 78
  const canvas = document.createElement('canvas')
  canvas.width = size * 4; canvas.height = size * 2
  const ctx = canvas.getContext('2d')!
  for (let index = 0; index < PHASE_COUNT; index++) {
    ctx.save()
    ctx.translate((index % 4) * size + size / 2, Math.floor(index / 4) * size + size / 2)
    // The enamel fills the cell to its edges, so neighbouring cells blur into the same colour.
    ctx.fillStyle = '#0f1640'; ctx.fillRect(-size / 2, -size / 2, size, size)
    const enamel = ctx.createRadialGradient(-30, -40, 10, 0, 0, 128)
    enamel.addColorStop(0, '#2a3a78'); enamel.addColorStop(1, '#0f1640')
    ctx.fillStyle = enamel; ctx.beginPath(); ctx.arc(0, 0, 128, 0, TAU); ctx.fill()
    ctx.fillStyle = '#3a4466'; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill()
    const path = litPath(phaseAngle(index), r)
    if (path) { ctx.fillStyle = '#fff1c9'; ctx.fill(new Path2D(path)) }
    ctx.strokeStyle = '#e6be72'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, r + 8, 0, TAU); ctx.stroke()
    ctx.restore()
  }
  return canvasTexture(canvas)
}

function ringTexture() {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = 128
  const rc = canvas.getContext('2d')!
  rc.strokeStyle = 'rgba(255,244,210,0.95)'; rc.lineWidth = 4; rc.beginPath(); rc.arc(64, 64, 58, 0, TAU); rc.stroke()
  return canvasTexture(canvas)
}

/** Paints every procedural texture, and the room's reflections. Nothing is downloaded. */
function paintAssets(renderer: THREE.WebGLRenderer): OrreryAssets {
  const pmrem = new THREE.PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const envMap = pmrem.fromScene(room, 0.04).texture
  room.dispose(); pmrem.dispose()
  const earth = earthCanvases()
  const [moonColor, moonBump] = moonCanvases()
  return {
    envMap,
    wood: canvasTexture(woodCanvas()),
    scale: canvasTexture(scaleCanvas(2048, SCALE_INNER, SCALE_OUTER)),
    medallions: medallionAtlas(),
    earthColor: canvasTexture(earth.color),
    earthRough: canvasTexture(earth.rough, false),
    earthLights: canvasTexture(earth.lights),
    clouds: canvasTexture(cloudCanvas()),
    moonColor: canvasTexture(moonColor),
    moonBump: canvasTexture(moonBump, false),
    ring: ringTexture(),
    sun: canvasTexture(sunCanvas()),
    glow: canvasTexture(glowCanvas('rgba(255,210,120,1)', 'rgba(255,160,60,0)')),
    shadow: canvasTexture(glowCanvas('rgba(10,4,0,0.7)', 'rgba(10,4,0,0)')),
  }
}

function assetTextures(assets: OrreryAssets): THREE.Texture[] {
  const { envMap, ...rest } = assets
  return [...(envMap ? [envMap] : []), ...Object.values(rest)]
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

export class Orrery extends OrreryScene {
  renderer: THREE.WebGLRenderer
  /** The post chain the quality tier allows. */
  post: Post = 'full'
  /** Draw calls and triangles submitted in the last frame, every pass included. */
  drawCalls = 0
  triangles = 0
  private composer: EffectComposer
  private bokeh: SoftBokehPass
  private bloom: UnrealBloomPass
  private grade: ShaderPass
  private windowTexture = new THREE.FramebufferTexture(1, 1)
  private disc = new THREE.Scene()
  private discCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private discMaterial: THREE.ShaderMaterial
  private textures: THREE.Texture[]
  private drawn = false

  constructor(canvas: HTMLCanvasElement) {
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    const assets = paintAssets(renderer)
    super(assets)
    this.textures = assetTextures(assets)
    this.renderer = renderer
    renderer.info.autoReset = false
    renderer.outputColorSpace = THREE.SRGBColorSpace
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.0
    renderer.setClearColor('#070a16')

    // Post: bloom for the lamp and glowing edges, a shallow depth of field so it
    // reads as a miniature, then the film grade.
    const target = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: 4 })
    this.composer = new EffectComposer(renderer, target)
    this.composer.addPass(new RenderPass(this.scene, this.camera))
    this.bokeh = new SoftBokehPass(this.scene, this.camera, { focus: 14, aperture: 0.00055, maxblur: 0.0085 })
    this.bokeh.hideFromDepth = this.depthless
    this.composer.addPass(this.bokeh)
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.6, 0.5, 0.95)
    this.composer.addPass(this.bloom)
    this.composer.addPass(new OutputPass())
    this.grade = new ShaderPass(GradeShader)
    this.composer.addPass(this.grade)

    // The round window's view, laid into the canvas as a disc with a soft edge. Its pixels were copied from the
    // screen, so they are already final: no tone mapping or colour conversion here.
    this.discMaterial = new THREE.ShaderMaterial({
      transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
      uniforms: { map: { value: this.windowTexture }, opacity: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `
        uniform sampler2D map; uniform float opacity; varying vec2 vUv;
        void main() {
          float r = length(vUv - 0.5) * 2.0;
          float edge = 1.0 - smoothstep(1.0 - 2.0 * fwidth(r), 1.0, r);
          if (edge <= 0.0) discard;
          gl_FragColor = vec4(texture2D(map, vUv).rgb, edge * opacity);
        }`,
    })
    const disc = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.discMaterial)
    disc.frustumCulled = false
    this.disc.add(disc)
  }

  /** Switches the post chain. Without bloom the lamp's glow comes from its sprites alone, so they burn brighter. */
  setPost(post: Post) {
    this.post = post
    for (const glow of this.sunGlow) (glow.material as THREE.SpriteMaterial).opacity = post === 'plain' ? 0.62 : 0.42
  }

  /**
   * Blurs the bloom through five levels or three. Three skips four of its passes; the two widest levels are
   * left unrendered and tinted black, since the composite still reads them.
   */
  setBloomMips(mips: 3 | 5) {
    const tints = this.bloom.compositeMaterial.uniforms.bloomTintColors.value as THREE.Vector3[]
    this.bloom.nMips = mips
    for (let i = 0; i < tints.length; i++) tints[i].setScalar(i < mips ? 1 : 0)
  }

  /** Multisamples the post target, or not; the buffers are rebuilt on the next frame. */
  setSamples(samples: number) {
    for (const target of [this.composer.renderTarget1, this.composer.renderTarget2]) {
      if (target.samples === samples) continue
      target.samples = samples
      target.dispose()
    }
  }

  /**
   * Uploads every texture and links every program a tier change could need, before the child can see it: the
   * scene as each camera sees it, every pass of the full chain, and the window's disc. The first frames then
   * run smooth, and a tier change never stalls on a shader compile, which would fail the very upgrade the
   * governor just made.
   */
  prewarm(width: number, height: number) {
    const r = this.renderer
    for (const texture of this.textures) r.initTexture(texture)
    // The main view renders into the post target; the window's views render to the screen. Three builds a
    // different variant of each material for each.
    r.setRenderTarget(this.composer.readBuffer)
    r.compile(this.scene, this.camera)
    r.setRenderTarget(null)
    this.useWindowMaterials(true)
    r.compile(this.scene, this.eyeCamera)
    r.compile(this.scene, this.overheadCamera)
    this.useWindowMaterials(false)
    const post = this.post
    for (const mode of ['full', 'bloom', 'plain'] as const) {
      this.post = mode
      this.render(width, height, { x: 0, y: 0, size: 1, opacity: 0.01 }, true)
    }
    this.setPost(post)
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

  /**
   * Draws a frame. The round window's view (the other point of view) is refreshed when `refreshWindow` is set,
   * and every frame it is laid into the main canvas as a disc under the porthole's brass ring. It never leaves
   * the GPU: copying the canvas out to another element would stall on the GPU each time.
   */
  render(width: number, height: number, porthole: Porthole | null, refreshWindow: boolean) {
    const r = this.renderer
    r.info.reset()
    // The very first frame draws only the main view (the window has not popped in yet): tools that watch this
    // renderer, such as the jam's intersection audit, take the first scene and camera drawn as the child's.
    const first = !this.drawn
    this.drawn = true
    if (porthole && refreshWindow && !first) {
      // The view is drawn straight to the screen in a corner, exactly as it looks there, then copied into a
      // texture on the GPU before the main view paints over the corner.
      const size = Math.max(1, Math.round(porthole.size))
      const pixels = Math.round(size * r.getPixelRatio())
      if (this.windowTexture.image.width !== pixels) {
        this.windowTexture.dispose()
        this.windowTexture = new THREE.FramebufferTexture(pixels, pixels)
        this.discMaterial.uniforms.map.value = this.windowTexture
      }
      r.setRenderTarget(null)
      r.setScissorTest(true)
      r.setScissor(0, 0, size, size)
      r.setViewport(0, 0, size, size)
      this.useWindowMaterials(true)
      r.render(this.scene, this.aimWindow())
      this.useWindowMaterials(false)
      r.copyFramebufferToTexture(this.windowTexture)
      r.setScissorTest(false)
      r.setViewport(0, 0, width, height)
    }

    const { focus, standing } = this.aimMain()
    const uniforms = this.bokeh.uniforms as Record<string, { value: number }>
    uniforms.focus.value = focus
    uniforms.aperture.value = 0.00055
    const passes = postPasses(this.post, standing)
    this.bokeh.enabled = passes.depthOfField
    this.bloom.enabled = passes.bloom
    this.grade.enabled = passes.grade
    this.grade.uniforms.time.value = this.time
    this.composer.render()
    if (porthole && porthole.opacity > 0) {
      // Viewports are in CSS pixels from the bottom-left; three scales them by the pixel ratio.
      this.discMaterial.uniforms.opacity.value = porthole.opacity
      r.setRenderTarget(null)
      r.setViewport(porthole.x, height - porthole.y - porthole.size, porthole.size, porthole.size)
      r.autoClear = false
      r.render(this.disc, this.discCamera)
      r.autoClear = true
      r.setViewport(0, 0, width, height)
    }
    this.drawCalls = r.info.render.calls
    this.triangles = r.info.render.triangles
  }

  dispose() {
    this.disposeScene()
    for (const texture of this.textures) texture.dispose()
    this.windowTexture.dispose()
    this.discMaterial.dispose()
    ;(this.disc.children[0] as THREE.Mesh).geometry.dispose()
    this.composer.dispose()
    this.renderer.dispose()
  }
}
