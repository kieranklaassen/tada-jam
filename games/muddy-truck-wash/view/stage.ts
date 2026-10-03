import * as THREE from 'three'
import { LAYOUT, bayShape, rackShape, toolShape } from '../props'
import type { Tool } from '../surface'
import { enamelMaterial, type EnamelKit } from './enamel'
import { toGeometry } from './geometry'
import { FloorMarks, MARKS } from './marks'

// The wash bay: dark wet concrete with a painted pad, a tiled back wall, the
// door to a dirt yard with its puddle, the rack and the three tools. The
// floor and the wall are one flat shader each; everything else is enamel.

export const FLOOR_COLOUR = [0.118, 0.137, 0.165] as const

const GROUND_VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FLOOR_FRAGMENT = /* glsl */ `
uniform sampler2D uNoise;
uniform vec3 uFloor;
uniform vec4 uPad;
uniform float uYard;
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
  // Dry concrete: a mottled slate with fine speckle.
  vec3 col = uFloor * (1.25 + 0.5 * (n.r - 0.5) + 0.3 * (f.g - 0.5));
  // The wet pad: darker, with two long streaks of light lying in it.
  float pad = box(p, uPad.xz, uPad.yw, 0.25);
  float wet = pad * smoothstep(0.25, 0.6, n.r + 0.25);
  vec3 wetCol = uFloor * 0.5;
  float streak = exp(-pow((p.y - 1.25 + (n.r - 0.5) * 0.25) / 0.16, 2.0)) + 0.6 * exp(-pow((p.y + 0.9 + (n.g - 0.5) * 0.2) / 0.3, 2.0));
  wetCol += vec3(0.5, 0.6, 0.72) * streak * 0.2 * (0.6 + 0.8 * f.r);
  col = mix(col, wetCol, wet);
  // The pad's painted outline, worn where tyres cross it.
  float outer = box(p, uPad.xz - 0.1, uPad.yw + 0.1, 0.012), inner = box(p, uPad.xz + 0.04, uPad.yw - 0.04, 0.012);
  float line = (outer - inner) * smoothstep(0.22, 0.4, n.r * 0.7 + f.g * 0.5);
  col = mix(col, vec3(0.96, 0.72, 0.05) * (0.8 + 0.2 * f.r), line * 0.9);
  // The yard beyond the door: packed dirt.
  float yard = smoothstep(uYard - 0.05, uYard + 0.05, p.x + (n.g - 0.5) * 0.3);
  vec3 dirt = vec3(0.47, 0.35, 0.22) * (0.8 + 0.45 * (n.r - 0.5) + 0.25 * (f.g - 0.5) + 0.2);
  col = mix(col, dirt, yard);
  // Its puddle: thick brown water with a pale rim and a slice of sky in it.
  vec2 q = (p - uPuddle.xy) / uPuddle.zw;
  float r = length(q) + (n.r - 0.5) * 0.35;
  float puddle = 1.0 - smoothstep(0.86, 1.0, r);
  float rim = smoothstep(0.7, 0.95, r) * puddle;
  vec3 mudWater = vec3(0.27, 0.17, 0.09) + vec3(0.55, 0.6, 0.62) * 0.3 * smoothstep(0.2, -0.5, q.y + q.x * 0.4) * smoothstep(0.9, 0.3, r);
  col = mix(col, mix(mudWater, vec3(0.36, 0.25, 0.14), rim), puddle);
  // What the wash has dropped: water darkens and shines, mud lies brown, foam sits in white blobs.
  vec4 marks = texture2D(uMarks, (p - uMarksBox.xy) / uMarksBox.zw);
  float water = smoothstep(0.25, 0.5, marks.r + (f.r - 0.5) * 0.3);
  col = mix(col, col * 0.55 + vec3(0.35, 0.45, 0.55) * 0.16 * smoothstep(0.3, 0.9, f.b), water * 0.8);
  float mud = smoothstep(0.3, 0.5, marks.g + (f.r - 0.5) * 0.35);
  col = mix(col, vec3(0.3, 0.19, 0.1) * (0.8 + 0.4 * f.g), mud);
  float foam = smoothstep(0.3, 0.48, marks.b + (f.b - 0.5) * 0.3);
  col = mix(col, mix(vec3(0.78, 0.86, 0.94), vec3(1.0), smoothstep(0.1, 0.5, f.b)), foam);
  gl_FragColor = vec4(col, 1.0);
}
`

const WALL_FRAGMENT = /* glsl */ `
uniform sampler2D uNoise;
uniform float uYard;
varying vec3 vWorld;
void main() {
  vec2 p = vWorld.xy;
  vec4 n = texture2D(uNoise, p * 0.09);
  // Big glazed tiles, teal over a darker skirting, with thin dark joints.
  vec2 tile = p / vec2(1.3, 1.3);
  vec2 cell = abs(fract(tile) - 0.5);
  float joint = smoothstep(0.47, 0.49, max(cell.x, cell.y));
  float shade = 0.9 + 0.2 * fract(sin(dot(floor(tile), vec2(12.9, 78.2))) * 43758.5);
  vec3 col = vec3(0.16, 0.3, 0.33) * shade * (0.9 + 0.25 * (n.r - 0.5));
  col = mix(col, vec3(0.1, 0.17, 0.2), 1.0 - smoothstep(0.55, 0.7, p.y));
  col = mix(col, col * 0.55, joint);
  // A soft band of light high on the wall.
  col += vec3(0.05, 0.08, 0.09) * smoothstep(1.5, 4.5, p.y);
  // Through the door: a hedge under a pale sky.
  float yard = step(uYard + 0.08, p.x);
  vec3 outside = vec3(0.13, 0.3, 0.17) * (0.75 + 0.5 * n.r) * (0.8 + 0.25 * smoothstep(0.0, 5.0, p.y));
  col = mix(col, outside, yard);
  gl_FragColor = vec4(col, 1.0);
}
`

/** The corners of what the camera must keep in view, in world units. */
const FRAME = { x0: -5.0, x1: 4.75, y0: -0.75, y1: 4.35 }
const FOV = 26
const YAW = 0.3
const PITCH = 0.23

export class Stage {
  readonly scene = new THREE.Scene()
  readonly camera = new THREE.PerspectiveCamera(FOV, 1, 1, 80)
  readonly tools: Record<Tool, THREE.Mesh>
  readonly marks = new FloorMarks()
  private readonly owned: { dispose(): void }[] = []

  constructor(kit: EnamelKit) {
    const uniforms = {
      uNoise: { value: kit.noise },
      uFloor: { value: new THREE.Vector3(...FLOOR_COLOUR) },
      uPad: { value: new THREE.Vector4(LAYOUT.pad.x0, LAYOUT.pad.x1, LAYOUT.pad.z0, LAYOUT.pad.z1) },
      uYard: { value: LAYOUT.yardFrom },
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
    wall.scale.set(60, 16, 1)
    wall.position.set(0, 8, LAYOUT.wall.z)
    wall.renderOrder = -2
    this.owned.push(plane, floorMaterial, wallMaterial, this.marks)

    const fixed = enamelMaterial(kit, { gloss: 0.9 })
    this.owned.push(fixed)
    const add = (name: string, geometry: THREE.BufferGeometry): THREE.Mesh => {
      const mesh = new THREE.Mesh(geometry, fixed)
      mesh.name = name
      this.owned.push(geometry)
      this.scene.add(mesh)
      return mesh
    }
    this.scene.add(floor, wall)
    add('rack', toGeometry(rackShape()))
    add('bay', toGeometry(bayShape()))
    this.tools = { sponge: add('tool-sponge', toGeometry(toolShape('sponge'))), hose: add('tool-hose', toGeometry(toolShape('hose'))), cloth: add('tool-cloth', toGeometry(toolShape('cloth'))) }
    this.fit(1180, 820)
  }

  /** Keeps the whole bay in view at any shape of surface: the camera backs off until the frame fits both ways. */
  fit(width: number, height: number): void {
    const camera = this.camera
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

  dispose(): void {
    for (const thing of this.owned) thing.dispose()
  }
}
