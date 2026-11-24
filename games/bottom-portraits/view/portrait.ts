import * as THREE from 'three'
import type { View } from '../layout'

// The picture: the same tin, seen from where the painter's eye is, and put
// through oil once. Each picture has its own tile of one sheet.

export const TILE_W = 640, TILE_H = 480, COLS = 3, ROWS = 2

const VERT = /* glsl */ `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`
// Four quarters round each point: the calmest one is the colour. It leaves
// edges and melts what lies between into dabs. Then backdrop, weave, varnish.
const FRAG = /* glsl */ `
precision highp float;
uniform sampler2D seen; uniform vec2 texel; varying vec2 vUv;
float rnd(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233)))*43758.5453); }
float smoothNoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(rnd(i),rnd(i+vec2(1,0)),f.x), mix(rnd(i+vec2(0,1)),rnd(i+vec2(1,1)),f.x), f.y); }
vec3 backdrop(vec2 uv){
  float d = distance(uv, vec2(0.52,0.56));
  float stroke = smoothNoise(vec2(uv.x*9.0+uv.y*7.0, uv.y*38.0-uv.x*30.0))*0.6 + smoothNoise(uv*vec2(24.0,18.0))*0.4;
  vec3 c = mix(vec3(0.66,0.57,0.36), vec3(0.28,0.22,0.15), smoothstep(0.05,0.75,d+stroke*0.16-0.06));
  return c + (stroke-0.5)*0.09;
}
vec4 tap(vec2 uv){ vec4 s = texture2D(seen, uv); return vec4(mix(backdrop(uv), s.a>0.0 ? s.rgb/max(s.a,0.001) : s.rgb, s.a), 1.0); }
void main(){
  vec2 wob = (vec2(smoothNoise(vUv*70.0), smoothNoise(vUv*70.0+31.0))-0.5)*texel*3.5;
  vec2 uv = vUv + wob; vec3 best = vec3(0.0); float calm = 1e9;
  for (int q=0;q<4;q++){
    vec2 s = vec2(q==0||q==2?-1.0:1.0, q<2?-1.0:1.0); vec3 m=vec3(0.0), m2=vec3(0.0);
    for (int i=0;i<5;i++) for (int j=0;j<5;j++){ vec3 c = tap(uv + s*vec2(float(i),float(j))*texel*1.2).rgb; m+=c; m2+=c*c; }
    m/=25.0; m2=abs(m2/25.0-m*m); float v=m2.r+m2.g+m2.b; if(v<calm){calm=v;best=m;}
  }
  float ridge = smoothNoise(vec2(vUv.x*150.0+best.r*40.0, vUv.y*90.0-best.g*30.0)) - smoothNoise(vec2(vUv.x*150.0+best.r*40.0+0.8, vUv.y*90.0-best.g*30.0+0.8));
  float weave = sin(vUv.x*640.0*1.4)*sin(vUv.y*480.0*1.4);
  vec3 c = best + ridge*0.07 + weave*0.012;
  c = mix(c, c*vec3(1.04,0.97,0.82), 0.65);
  c = (c-0.5)*1.08+0.5;
  float e = smoothstep(0.82,0.35,distance(vUv,vec2(0.5)));
  gl_FragColor = vec4(c*mix(0.74,1.0,e)*1.06, 1.0);
}`

export class Studio {
  readonly sheet: THREE.WebGLRenderTarget
  private readonly seen: THREE.WebGLRenderTarget
  private readonly eye = new THREE.PerspectiveCamera(30, 4 / 3, 2, 30)
  private readonly flat = new THREE.Scene()
  private readonly over = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
  private readonly oil: THREE.ShaderMaterial
  private readonly quad: THREE.Mesh

  constructor() {
    this.sheet = new THREE.WebGLRenderTarget(TILE_W * COLS, TILE_H * ROWS, { depthBuffer: false })
    this.seen = new THREE.WebGLRenderTarget(TILE_W, TILE_H, { samples: 4 })
    this.oil = new THREE.ShaderMaterial({ vertexShader: VERT, fragmentShader: FRAG, uniforms: { seen: { value: this.seen.texture }, texel: { value: new THREE.Vector2(1 / TILE_W, 1 / TILE_H) } }, depthTest: false, depthWrite: false })
    this.quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.oil)
    this.quad.frustumCulled = false
    this.flat.add(this.quad)
  }

  /** Paints what the scene shows from the painter's eye into a tile. The caller has cleared the scene of everything he is not painting. */
  paint(renderer: THREE.WebGLRenderer, scene: THREE.Scene, view: View, tile: number): void {
    this.eye.position.set(view.at.x, view.at.y, view.at.z)
    this.eye.lookAt(view.to.x, view.to.y, view.to.z)
    this.eye.fov = view.fov
    this.eye.aspect = view.aspect
    this.eye.updateProjectionMatrix()
    const clear = new THREE.Color(), alpha = renderer.getClearAlpha(), auto = renderer.autoClear
    renderer.getClearColor(clear)
    renderer.setClearColor(0x000000, 0)
    renderer.setRenderTarget(this.seen)
    renderer.clear()
    renderer.render(scene, this.eye)
    renderer.autoClear = false
    const x = (tile % COLS) * TILE_W, y = Math.floor(tile / COLS) * TILE_H
    this.sheet.viewport.set(x, y, TILE_W, TILE_H)
    this.sheet.scissor.set(x, y, TILE_W, TILE_H)
    this.sheet.scissorTest = true
    renderer.setRenderTarget(this.sheet)
    renderer.render(this.flat, this.over)
    renderer.setRenderTarget(null)
    renderer.autoClear = auto
    renderer.setClearColor(clear, alpha)
  }

  compile(renderer: THREE.WebGLRenderer): void { renderer.compile(this.flat, this.over) }

  dispose(): void {
    this.sheet.dispose()
    this.seen.dispose()
    this.oil.dispose()
    this.quad.geometry.dispose()
  }
}

/** A picture's surface, showing one tile. */
export function pictureGeometry(w: number, h: number, tile: number): THREE.PlaneGeometry {
  const plane = new THREE.PlaneGeometry(w, h), uv = plane.getAttribute('uv') as THREE.BufferAttribute
  const c = tile % COLS, r = Math.floor(tile / COLS)
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (c + uv.getX(i)) / COLS, (r + uv.getY(i)) / ROWS)
  return plane
}
