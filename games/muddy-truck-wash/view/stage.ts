import * as THREE from 'three'
import { LAMP_ROD, lampShape, pinwheelShape, placeShape, rollerShape, shelfShape } from '../place'
import { LAYOUT, bayShape, rackShape, tapShape, toolShape } from '../props'
import type { Tool } from '../surface'
import { enamelMaterial, type EnamelKit } from './enamel'
import { toGeometry } from './geometry'
import { FloorMarks, MARKS } from './marks'

// The wash bay: dark wet concrete with a painted pad, a tiled back wall with
// a shelf and a window, the door to a dirt yard with its puddle, a hill and a
// sky, the rack and the three tools. The floor, the wall and the sky are one
// flat shader each; everything else is enamel. What stands still is two
// meshes, built once.

export const FLOOR_COLOUR = [0.118, 0.137, 0.165] as const

const GROUND_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const POOL = LAYOUT.pools

const FLOOR_FRAGMENT = /* glsl */ `
uniform sampler2D uNoise;
uniform vec3 uFloor;
uniform vec4 uPad;
uniform float uYard;
uniform float uTime;
uniform vec4 uPuddle;
uniform sampler2D uMarks;
uniform vec4 uMarksBox;
varying vec3 vWorld;

float box(vec2 p, vec2 lo, vec2 hi, float soft) {
  vec2 d = smoothstep(lo - soft, lo + soft, p) * (1.0 - smoothstep(hi - soft, hi + soft, p));
  return d.x * d.y;
}

void main() {
  vec2 p = vWorld.xz;
  vec4 n = texture2D(uNoise, p * 0.11);
  vec4 f = texture2D(uNoise, p * 0.47 + 0.3);
  // Dry concrete: a mottled slate with fine speckle, laid in big slabs.
  vec3 col = uFloor * (1.25 + 0.5 * (n.r - 0.5) + 0.3 * (f.g - 0.5));
  vec2 slab = abs(fract(p / 2.6 + vec2(0.18, 0.4)) - 0.5);
  col *= 1.0 - 0.32 * smoothstep(0.486, 0.497, max(slab.x, slab.y));
  // Water standing on the open floor: two thin pools that give back the light of the window, with a slow shimmer.
  vec2 near = (p - vec2(${POOL[0].x.toFixed(3)}, ${POOL[0].z.toFixed(3)})) / vec2(${POOL[0].rx.toFixed(3)}, ${POOL[0].rz.toFixed(3)}), off = (p - vec2(${POOL[1].x.toFixed(3)}, ${POOL[1].z.toFixed(3)})) / vec2(${POOL[1].rx.toFixed(3)}, ${POOL[1].rz.toFixed(3)});
  float edge = (n.r - 0.5) * 0.5;
  float pool = max(1.0 - smoothstep(0.8, 0.9, length(near) + edge), 1.0 - smoothstep(0.8, 0.9, length(off) - edge));
  float shimmer = texture2D(uNoise, p * vec2(0.07, 0.25) + vec2(uTime * 0.006, 0.0)).r;
  vec3 poolCol = mix(uFloor * 0.8, vec3(0.3, 0.43, 0.5), 0.25 + 0.5 * smoothstep(0.35, 0.75, shimmer));
  col = mix(col, poolCol, pool * 0.85);
  // A kerb of worn stripes along the front of the pad.
  float kerb = box(p, vec2(uPad.x - 0.1, uPad.w + 0.26), vec2(uPad.y + 0.1, uPad.w + 0.56), 0.012);
  float stripe = smoothstep(0.47, 0.53, abs(fract((p.x + p.y) * 1.25) - 0.5) * 2.0);
  vec3 kerbCol = mix(vec3(0.1, 0.11, 0.13), vec3(0.8, 0.59, 0.07), stripe) * (0.75 + 0.3 * f.r);
  col = mix(col, kerbCol, kerb * smoothstep(0.16, 0.36, n.r * 0.7 + f.g * 0.5));
  // The wet pad: darker, with two long streaks of light lying in it and the wall's teal at its far edge.
  float pad = box(p, uPad.xz, uPad.yw, 0.25);
  float wet = pad * smoothstep(0.25, 0.6, n.r + 0.25);
  vec3 wetCol = uFloor * 0.5;
  float streak = exp(-pow((p.y - 1.25 + (n.r - 0.5) * 0.25) / 0.16, 2.0)) + 0.6 * exp(-pow((p.y + 0.9 + (n.g - 0.5) * 0.2) / 0.3, 2.0));
  wetCol += vec3(0.5, 0.6, 0.72) * streak * 0.26 * (0.6 + 0.8 * f.r);
  wetCol += vec3(0.05, 0.13, 0.14) * smoothstep(-0.6, -1.9, p.y);
  col = mix(col, wetCol, wet);
  // The pad's painted outline, worn where tyres cross it.
  float outer = box(p, uPad.xz - 0.1, uPad.yw + 0.1, 0.012), inner = box(p, uPad.xz + 0.04, uPad.yw - 0.04, 0.012);
  float line = (outer - inner) * smoothstep(0.22, 0.4, n.r * 0.7 + f.g * 0.5);
  col = mix(col, vec3(0.96, 0.72, 0.05) * (0.8 + 0.2 * f.r), line * 0.9);
  // The yard beyond the door: packed dirt with two ruts the queue has worn, pebbles, and grass far back.
  float yard = smoothstep(uYard - 0.05, uYard + 0.05, p.x + (n.g - 0.5) * 0.3);
  vec3 dirt = vec3(0.47, 0.35, 0.22) * (0.8 + 0.45 * (n.r - 0.5) + 0.25 * (f.g - 0.5) + 0.2);
  float rut = exp(-pow((abs(p.y + 0.6) - 0.72) / 0.17, 2.0));
  dirt *= 1.0 - 0.3 * rut * (0.5 + f.r);
  dirt = mix(dirt, vec3(0.62, 0.56, 0.46), smoothstep(0.88, 0.94, f.b) * 0.45);
  dirt = mix(dirt, vec3(0.25, 0.5, 0.27) * (0.8 + 0.4 * n.g), smoothstep(-11.0, -12.5, p.y + (n.r - 0.5) * 1.5));
  col = mix(col, dirt, yard);
  // Its puddle: thick brown water with a pale rim and a slice of sky in it.
  vec2 q = (p - uPuddle.xy) / uPuddle.zw;
  float r = length(q) + (n.r - 0.5) * 0.35;
  float puddle = 1.0 - smoothstep(0.86, 1.0, r);
  float rim = smoothstep(0.7, 0.95, r) * puddle;
  vec3 mudWater = vec3(0.27, 0.17, 0.09) + vec3(0.55, 0.6, 0.62) * 0.3 * smoothstep(0.2, -0.5, q.y + q.x * 0.4) * smoothstep(0.9, 0.3, r);
  col = mix(col, mix(mudWater, vec3(0.36, 0.25, 0.14), rim), puddle);
  // What the wash has dropped: water darkens and shines, soft mud lies brown, dried mud lies in pale clods, foam sits in white blobs.
  vec4 marks = texture2D(uMarks, (p - uMarksBox.xy) / uMarksBox.zw);
  float water = smoothstep(0.25, 0.5, marks.r + (f.r - 0.5) * 0.3);
  col = mix(col, col * 0.55 + vec3(0.35, 0.45, 0.55) * 0.16 * smoothstep(0.3, 0.9, f.b), water * 0.8);
  float mud = smoothstep(0.3, 0.5, marks.g + (f.r - 0.5) * 0.35);
  col = mix(col, vec3(0.3, 0.19, 0.1) * (0.8 + 0.4 * f.g), mud);
  // Clods of dried mud: pale and cracked, lying where they fell.
  float clods = smoothstep(0.3, 0.5, marks.a + (f.g - 0.5) * 0.4);
  col = mix(col, vec3(0.72, 0.6, 0.43) * (0.7 + 0.4 * f.r) * (0.6 + 0.4 * smoothstep(0.03, 0.12, texture2D(uNoise, p * 0.9).a)), clods);
  float foam = smoothstep(0.3, 0.48, marks.b + (f.b - 0.5) * 0.3);
  col = mix(col, mix(vec3(0.78, 0.86, 0.94), vec3(1.0), smoothstep(0.1, 0.5, f.b)), foam);
  gl_FragColor = vec4(col, 1.0);
}
`

const WALL_FRAGMENT = /* glsl */ `
uniform sampler2D uNoise;
uniform float uTime;
uniform vec4 uWindow;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xy;
  vec4 n = texture2D(uNoise, p * 0.09);
  vec4 f = texture2D(uNoise, p * 0.37 + 0.21);
  // Below: glazed teal tiles with dark joints, a gleam in the corner of each, over a darker skirting.
  vec2 tile = p / 0.65;
  vec2 within = fract(tile), cell = abs(within - 0.5);
  float joint = smoothstep(0.45, 0.485, max(cell.x, cell.y));
  float shade = fract(sin(dot(floor(tile), vec2(12.9, 78.2))) * 43758.5);
  vec3 teal = vec3(0.15, 0.3, 0.33) * (0.86 + 0.26 * shade) * (0.9 + 0.25 * (n.r - 0.5));
  teal += vec3(0.07, 0.1, 0.1) * smoothstep(0.5, 0.0, length(within - vec2(0.28, 0.72)));
  teal = mix(teal, vec3(0.09, 0.15, 0.18) * (0.9 + 0.2 * shade), 1.0 - smoothstep(0.62, 0.68, p.y));
  teal = mix(teal, vec3(0.07, 0.12, 0.14), joint);
  // A row of small tiles, cream and yellow by turns.
  vec2 small = p / 0.325, bit = abs(fract(small) - 0.5);
  vec3 trim = mix(vec3(0.74, 0.7, 0.58), vec3(0.78, 0.56, 0.1), mod(floor(small.x), 2.0)) * (0.82 + 0.22 * fract(sin(dot(floor(small), vec2(3.1, 17.7))) * 91.7));
  trim = mix(trim, vec3(0.09, 0.14, 0.16), smoothstep(0.42, 0.48, max(bit.x, bit.y)));
  // Above: painted plaster in sea green, warm where the lamp hangs in front of it.
  vec3 plaster = vec3(0.24, 0.4, 0.4) * (0.92 + 0.24 * (n.r - 0.5) + 0.08 * (f.g - 0.5));
  plaster += vec3(0.2, 0.17, 0.07) * exp(-(pow((p.x + 2.9) / 1.3, 2.0) + pow((p.y - 4.4) / 1.1, 2.0))) + vec3(0.1, 0.09, 0.04) * exp(-pow((p.x - 0.3) / 1.7, 2.0)) * smoothstep(3.2, 5.4, p.y);
  vec3 col = mix(teal, plaster, step(3.25, p.y));
  col = mix(col, trim, step(2.925, p.y) * step(p.y, 3.25));
  // The window: sky behind glass, a cloud going by, one streak of light on the pane.
  vec2 pane = (p - uWindow.xy) / (uWindow.zw - uWindow.xy);
  float inside = step(0.0, pane.x) * step(pane.x, 1.0) * step(0.0, pane.y) * step(pane.y, 1.0);
  vec3 sky = mix(vec3(0.72, 0.84, 0.88), vec3(0.4, 0.64, 0.84), pane.y);
  float cloud = smoothstep(0.5, 0.66, texture2D(uNoise, vec2(p.x * 0.11 + uTime * 0.005, p.y * 0.2 + 0.4)).r);
  sky = mix(sky, vec3(0.98, 0.97, 0.94), cloud * 0.9);
  sky += vec3(0.1) * smoothstep(0.07, 0.0, abs(pane.x - pane.y * 0.5 - 0.22));
  col = mix(col, sky, inside);
  gl_FragColor = vec4(col, 1.0);
}
`

const SKY_FRAGMENT = /* glsl */ `
uniform sampler2D uNoise;
uniform float uTime;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xy;
  vec4 n = texture2D(uNoise, p * vec2(0.03, 0.05));
  // A pale warm horizon under a blue sky, with slow clouds.
  vec3 col = mix(vec3(0.88, 0.89, 0.8), vec3(0.4, 0.65, 0.86), smoothstep(1.8, 9.4, p.y));
  float cloud = smoothstep(0.5, 0.64, texture2D(uNoise, vec2(p.x * 0.028 + uTime * 0.0022, p.y * 0.065 + 0.4)).r) * smoothstep(3.0, 4.9, p.y);
  col = mix(col, vec3(1.0, 0.99, 0.96), cloud * 0.9);
  // Two rows of hills and a hedge, each nearer and darker.
  float far = 3.9 + 0.8 * sin(p.x * 0.17 + 1.0) + 0.35 * sin(p.x * 0.41 + 2.0);
  col = mix(col, vec3(0.5, 0.68, 0.62), smoothstep(far + 0.05, far - 0.05, p.y));
  float mid = 2.6 + 0.65 * sin(p.x * 0.27 + 2.4) + 0.24 * sin(p.x * 0.72 + 0.5);
  col = mix(col, vec3(0.36, 0.6, 0.4) * (0.9 + 0.2 * n.g), smoothstep(mid + 0.05, mid - 0.05, p.y));
  float hedge = 1.2 + 0.24 * sin(p.x * 1.1) + 0.18 * sin(p.x * 2.5 + 1.0) + 0.45 * (n.r - 0.5);
  col = mix(col, vec3(0.17, 0.4, 0.22) * (0.8 + 0.4 * n.r), smoothstep(hedge + 0.05, hedge - 0.05, p.y));
  gl_FragColor = vec4(col, 1.0);
}
`

/** The corners of what the camera must keep in view, in world units. */
const FRAME = { x0: -5.0, x1: 5.15, y0: -0.75, y1: 4.35 }
const FOV = 26
const YAW = 0.5
const PITCH = 0.23

/** A camera for the bay. */
export function bayCamera(): THREE.PerspectiveCamera {
  return new THREE.PerspectiveCamera(FOV, 1, 4, 70)
}

/** Puts a camera where the whole bay is in view on a surface of this shape: it backs off until the frame fits both ways. */
export function frame(camera: THREE.PerspectiveCamera, width: number, height: number): void {
  camera.aspect = width / height
  const cx = (FRAME.x0 + FRAME.x1) / 2, cy = (FRAME.y0 + FRAME.y1) / 2
  const halfW = (FRAME.x1 - FRAME.x0) / 2, halfH = (FRAME.y1 - FRAME.y0) / 2
  const tan = Math.tan((FOV * Math.PI) / 360)
  const distance = Math.max(halfH / tan, halfW / (tan * camera.aspect)) + 0.4
  camera.position.set(cx - Math.sin(YAW) * Math.cos(PITCH) * distance, cy + Math.sin(PITCH) * distance, Math.cos(YAW) * Math.cos(PITCH) * distance)
  camera.lookAt(cx, cy, 0)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}

export class Stage {
  readonly scene = new THREE.Scene()
  readonly camera = bayCamera()
  readonly tools: Record<Tool, THREE.Mesh>
  /** The tap at the end of the rack's long arm. It swings about the point it hangs from. */
  readonly tap: THREE.Mesh
  /** The few pieces of the place that move: what stands on the shelf, the roller brush, the pinwheel and the lamp. */
  readonly bits: { shelf: THREE.Mesh; roller: THREE.Mesh; pinwheel: THREE.Mesh; lamp: THREE.Mesh }
  readonly marks = new FloorMarks()
  private readonly clock = { value: 0 }
  private readonly owned: { dispose(): void }[] = []

  constructor(kit: EnamelKit) {
    const uniforms = {
      uNoise: { value: kit.noise },
      uFloor: { value: new THREE.Vector3(...FLOOR_COLOUR) },
      uPad: { value: new THREE.Vector4(LAYOUT.pad.x0, LAYOUT.pad.x1, LAYOUT.pad.z0, LAYOUT.pad.z1) },
      uYard: { value: LAYOUT.yardFrom },
      uTime: this.clock,
      uWindow: { value: new THREE.Vector4(LAYOUT.window.x0, LAYOUT.window.y0, LAYOUT.window.x1, LAYOUT.window.y1) },
      uPuddle: { value: new THREE.Vector4(LAYOUT.puddle.x, LAYOUT.puddle.z, LAYOUT.puddle.rx, LAYOUT.puddle.rz) },
      uMarks: { value: this.marks.texture },
      uMarksBox: { value: new THREE.Vector4(MARKS.x0, MARKS.z0, MARKS.x1 - MARKS.x0, MARKS.z1 - MARKS.z0) },
    }
    const plane = new THREE.PlaneGeometry(1, 1)
    const floorMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: FLOOR_FRAGMENT, uniforms, depthWrite: false })
    const floor = new THREE.Mesh(plane, floorMaterial)
    floor.name = 'floor'
    floor.rotation.x = -Math.PI / 2
    floor.scale.set(60, 40, 1)
    floor.position.set(0, 0, 6)
    // Drawn first and without depth, so the copy under the floor shows through it.
    floor.renderOrder = -3
    const wallMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: WALL_FRAGMENT, uniforms })
    const wall = new THREE.Mesh(plane, wallMaterial)
    wall.name = 'wall'
    // The wall ends at the door; beyond it the yard runs back to a sky.
    wall.scale.set(30 + LAYOUT.yardFrom, 16, 1)
    wall.position.set((LAYOUT.yardFrom - 30) / 2, 8, LAYOUT.wall.z)
    wall.renderOrder = -2
    const skyMaterial = new THREE.ShaderMaterial({ vertexShader: GROUND_VERTEX, fragmentShader: SKY_FRAGMENT, uniforms })
    const sky = new THREE.Mesh(plane, skyMaterial)
    sky.name = 'sky'
    sky.scale.set(38, 20, 1)
    sky.position.set(25, 7, -22)
    sky.renderOrder = -2
    this.owned.push(plane, floorMaterial, wallMaterial, skyMaterial, this.marks)

    const fixed = enamelMaterial(kit, { gloss: 0.9 })
    this.owned.push(fixed)
    const add = (name: string, geometry: THREE.BufferGeometry): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, fixed)
      mesh.name = name
      this.owned.push(geometry)
      this.scene.add(mesh)
      return mesh
    }
    this.scene.add(floor, wall, sky)
    add('rack', toGeometry(rackShape()))
    add('bay', toGeometry(bayShape()))
    add('place', toGeometry(placeShape()))
    this.bits = { shelf: add('shelf-things', toGeometry(shelfShape())), roller: add('roller', toGeometry(rollerShape())), pinwheel: add('pinwheel', toGeometry(pinwheelShape())), lamp: add('lamp', toGeometry(lampShape())) }
    this.bits.lamp.position.set(LAYOUT.lamp.x, LAYOUT.lamp.y + LAMP_ROD, LAYOUT.lamp.z)
    this.bits.shelf.position.set(LAYOUT.shelf.x, LAYOUT.shelf.y + 0.04, LAYOUT.wall.z + 0.24)
    this.bits.roller.position.set(LAYOUT.roller.x, LAYOUT.roller.y0, LAYOUT.roller.z)
    this.bits.pinwheel.position.set(LAYOUT.pinwheel.x, LAYOUT.pinwheel.y, LAYOUT.pinwheel.z)
    // The pinwheel faces the bay's door, a little toward the child.
    this.bits.pinwheel.rotation.y = -0.45
    this.tap = add('tap', toGeometry(tapShape()))
    this.tap.position.set(LAYOUT.tap.x, LAYOUT.tap.hang, LAYOUT.tap.z)
    this.tools = { sponge: add('tool-sponge', toGeometry(toolShape('sponge'))), hose: add('tool-hose', toGeometry(toolShape('hose'))), cloth: add('tool-cloth', toGeometry(toolShape('cloth'))) }
    // Each tool has its own material, so each can glow by itself.
    for (const tool of ['sponge', 'hose', 'cloth'] as const) {
      const own = enamelMaterial(kit, { gloss: 0.9 })
      this.owned.push(own)
      this.tools[tool].material = own
    }
    this.fit(1180, 820)
  }

  /** Keeps the whole bay in view at any shape of surface: the camera backs off until the frame fits both ways. */
  fit(width: number, height: number): void {
    frame(this.camera, width, height)
  }

  /** Shows the moving pieces of the place: the roller and the pinwheel turned, the shelf's things off their board, the lamp swung. */
  place(roller: number, pinwheel: number, shelf: number, lamp: number): void {
    this.bits.lamp.rotation.z = lamp
    this.bits.roller.rotation.y = roller
    this.bits.pinwheel.rotation.z = pinwheel
    this.bits.shelf.position.y = LAYOUT.shelf.y + 0.04 + shelf
    this.bits.shelf.rotation.z = shelf * 0.25
  }

  /** The slow things of the place run on attended time: the clouds and the shimmer on the floor. */
  tick(seconds: number): void {
    this.clock.value = seconds
  }

  dispose(): void {
    for (const thing of this.owned) thing.dispose()
  }
}
