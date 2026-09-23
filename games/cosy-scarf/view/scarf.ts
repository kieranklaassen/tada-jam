import * as THREE from 'three'
import { CELL_H, CELL_W } from '../layout'
import { MAX_ROWS, WIDTH, type Scarf } from '../state'
import { patchYarn, YARN, type YarnTextures } from './yarn'

// A scarf is one draw call. The geometry is built once for the longest scarf
// the loom can hold: every stitch cell is its own little pillow of quads, so
// stitches can plump in one by one as they are knitted. The colours live in
// a tiny data texture (one texel per cell). Everything else happens in the
// vertex shader: the reveal, hanging from the rod, the flight over the
// animal's head, and wrapping round its neck with two tails down the front.
// Nothing about the shape is rebuilt on the CPU, ever.

const SUB_X = 2
const SUB_Y = 3
const FRINGE_SEGMENTS = 4
/** Fringe length in cells while it hangs on the loom. */
export const FRINGE_CELLS = 1.3
/** How far round the neck (radians) the scarf's middle sits from straight behind; the knot is opposite it. */
const KNOT_SHIFT = 0.3

function buildGeometry(): THREE.BufferGeometry {
  const cells: number[] = []
  const corners: number[] = []
  const positions: number[] = []
  const index: number[] = []
  let vertex = 0
  for (let row = 0; row < MAX_ROWS; row++) {
    for (let column = 0; column < WIDTH; column++) {
      const order = row * WIDTH + (row % 2 === 0 ? column : WIDTH - 1 - column)
      for (let j = 0; j <= SUB_Y; j++) {
        for (let i = 0; i <= SUB_X; i++) {
          cells.push(column, row, order)
          corners.push(i / SUB_X, j / SUB_Y, 0)
          positions.push(column + i / SUB_X, row + j / SUB_Y, 0)
        }
      }
      for (let j = 0; j < SUB_Y; j++) {
        for (let i = 0; i < SUB_X; i++) {
          const a = vertex + j * (SUB_X + 1) + i
          const b = a + 1
          const c = a + SUB_X + 1
          const d = c + 1
          index.push(a, c, b, b, c, d)
        }
      }
      vertex += (SUB_X + 1) * (SUB_Y + 1)
    }
  }
  // One tassel per column at each end; it grows when the scarf is cast off.
  for (const end of [1, 2]) {
    for (let column = 0; column < WIDTH; column++) {
      for (let j = 0; j <= FRINGE_SEGMENTS; j++) {
        for (let i = 0; i <= 1; i++) {
          cells.push(column, end === 1 ? 0 : MAX_ROWS - 1, -1)
          corners.push(i, (j / FRINGE_SEGMENTS) * FRINGE_CELLS, end)
          positions.push(column + i, 0, 0)
        }
      }
      for (let j = 0; j < FRINGE_SEGMENTS; j++) {
        const a = vertex + j * 2
        index.push(a, a + 2, a + 1, a + 1, a + 2, a + 3)
      }
      vertex += (FRINGE_SEGMENTS + 1) * 2
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(positions.length).fill(0).map((_, i) => (i % 3 === 2 ? 1 : 0)), 3))
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(new Array((positions.length / 3) * 2).fill(0), 2))
  geometry.setAttribute('aCell', new THREE.Float32BufferAttribute(cells, 3))
  geometry.setAttribute('aCorner', new THREE.Float32BufferAttribute(corners, 3))
  geometry.setIndex(index)
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5)
  return geometry
}

const VERTEX_HEAD = /* glsl */ `
attribute vec3 aCell;
attribute vec3 aCorner;
uniform float uReveal;
uniform float uRows;
uniform float uFringe;
uniform float uWrap;
uniform float uNeckR;
uniform float uTime;
uniform float uKnitRows;
uniform float uDrape;
uniform float uLayer;
uniform float uSeed;
uniform vec2 uWrapSize;
uniform mat4 uHang;
uniform mat4 uNeck;
varying float vShow;
varying float vFresh;
varying float vTassel;
`

const VERTEX_SHAPE = /* glsl */ `
float tassel = aCorner.z;
float order = aCell.z;
float rows = max(uRows, 1.0);
float local = tassel > 0.5 ? uFringe : clamp(uReveal - order, 0.0, 1.0);
float pop = (1.0 - pow(1.0 - local, 3.0)) * (1.0 + 0.45 * sin(local * 3.14159));
vShow = tassel > 0.5 ? (uFringe > 0.01 ? 1.0 : 0.0) : local;
vFresh = tassel > 0.5 ? 0.0 : 1.0 - clamp((uReveal - order) / 7.0, 0.0, 1.0);
vTassel = tassel > 0.5 ? 1.0 : 0.0;
float u;
float v;
float beyond = 0.0;
float bulge;
if (tassel < 0.5) {
  u = aCell.x + 0.5 + (aCorner.x - 0.5) * mix(0.5, 1.0, min(pop, 1.0));
  v = aCell.y + aCorner.y * pop;
  bulge = sin(3.14159 * aCorner.x) * sin(3.14159 * aCorner.y) * 0.5 * min(pop, 1.0);
} else {
  float strand = aCell.x + 0.5 + (aCorner.x - 0.5) * 0.46;
  float sway = sin(uTime * 2.1 + aCell.x * 1.7 + uSeed) * 0.12 * aCorner.y;
  u = strand + sway;
  beyond = aCorner.y * pop;
  v = tassel < 1.5 ? -beyond : rows + beyond;
  bulge = 0.3;
}
vNormalMapUv = tassel < 0.5 ? vec2(u * 2.0, v * uKnitRows) : vec2(aCorner.x * 0.8, aCorner.y * 3.0);
#ifdef USE_MAP
vMapUv = vec2((aCell.x + 0.5) / ${WIDTH.toFixed(1)}, ((tassel > 1.5 ? rows - 1.0 : aCell.y) + 0.5) / ${MAX_ROWS.toFixed(1)});
#endif

// Hanging (on the rod, and in flight): centred on the scarf's middle.
vec3 hangLocal = vec3((u - ${(WIDTH / 2).toFixed(1)}) * ${CELL_W.toFixed(3)}, -(v - rows * 0.5) * ${CELL_H.toFixed(3)}, bulge);
hangLocal.z += sin(v * 0.9 + uTime * 1.3 + uSeed) * 0.16;
vec3 hangPos = (uHang * vec4(hangLocal, 1.0)).xyz;
vec3 hangNormal = normalize(mat3(uHang) * vec3(0.0, 0.0, 1.0));

// Wrapped: the middle behind the neck, one whole turn round it (so the band
// crosses the front, under the chin), and two tails from a knot just off centre.
// The second half rides a little proud of the first into the knot and its tail
// lies over the other one, so the two never fight for the same pixels.
float band = uWrapSize.x;
float lw = uWrapSize.y;
float vb = clamp(v, 0.0, rows);
float s = (vb / rows - 0.5) * lw + (v - vb) * 1.4;
float w = (u / ${WIDTH.toFixed(1)} - 0.5) * band;
float side = s < 0.0 ? -1.0 : 1.0;
float loopEnd = 3.14159 * uNeckR;
float as = abs(s);
float r = uNeckR + (side < 0.0 ? 0.55 * smoothstep(loopEnd - 1.4 * uNeckR, loopEnd, as) : 0.0);
vec3 wrapPos;
vec3 wrapNormal;
if (as <= loopEnd) {
  float th = s / uNeckR + ${KNOT_SHIFT.toFixed(2)};
  wrapNormal = vec3(sin(th), 0.0, -cos(th));
  wrapPos = vec3(r * sin(th), w, -r * cos(th)) + wrapNormal * bulge * 0.6;
} else {
  float e = as - loopEnd;
  float ph = smoothstep(0.0, 1.1 * uNeckR, e);
  float th = 3.14159 + ${KNOT_SHIFT.toFixed(2)};
  vec3 startNormal = vec3(sin(th), 0.0, -cos(th));
  vec3 centre = vec3(r * sin(th) * (1.0 - 0.25 * ph) + side * ph * (0.3 * uNeckR + e * 0.06), -e * 0.94, -r * cos(th) + ph * (0.35 + uLayer) + e * uDrape);
  float phi = ph * 1.4;
  vec3 dirW = vec3(side * sin(phi), cos(phi), 0.0);
  wrapNormal = normalize(mix(startNormal, vec3(side * 0.12, 0.15, 1.0), ph));
  wrapPos = centre + dirW * w + wrapNormal * bulge * 0.6;
  wrapPos.x += sin(uTime * 1.6 + e * 0.35 + side + uSeed) * 0.25 * ph * min(e, 6.0) / 6.0;
}
vec3 neckPos = (uNeck * vec4(wrapPos, 1.0)).xyz;
vec3 neckNormal = normalize(mat3(uNeck) * wrapNormal);
float prog = smoothstep(0.0, 1.0, clamp(uWrap * 1.3 - as / lw * 0.6, 0.0, 1.0));
vec3 scarfPos = mix(hangPos, neckPos, prog);
vec3 scarfNormal = normalize(mix(hangNormal, neckNormal, prog));
`

export type ScarfUniforms = {
  uReveal: { value: number }
  uRows: { value: number }
  uFringe: { value: number }
  uWrap: { value: number }
  uNeckR: { value: number }
  uTime: { value: number }
  uKnitRows: { value: number }
  uDrape: { value: number }
  uLayer: { value: number }
  uSeed: { value: number }
  uWrapSize: { value: THREE.Vector2 }
  uHang: { value: THREE.Matrix4 }
  uNeck: { value: THREE.Matrix4 }
}

let shared: THREE.BufferGeometry | null = null

/** The scarf geometry, built once per page and shared by every scarf. */
export function scarfGeometry(): THREE.BufferGeometry {
  shared ??= buildGeometry()
  return shared
}

/** sRGB bytes straight from the palette: the texture is tagged sRGB, so no conversion here. */
const bytes = YARN.map((hex) => [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16)))

export class ScarfMesh {
  readonly mesh: THREE.Mesh
  readonly uniforms: ScarfUniforms
  private readonly data = new Uint8Array(WIDTH * MAX_ROWS * 4)
  private readonly texture: THREE.DataTexture
  private readonly material: THREE.MeshStandardMaterial
  /** Which controller scarf this mesh shows, and which version of its rows. */
  id = -1
  version = -1

  constructor(textures: YarnTextures, seed: number) {
    this.texture = new THREE.DataTexture(this.data, WIDTH, MAX_ROWS, THREE.RGBAFormat)
    this.texture.magFilter = THREE.NearestFilter
    this.texture.minFilter = THREE.NearestFilter
    this.texture.colorSpace = THREE.SRGBColorSpace
    this.texture.generateMipmaps = false
    this.texture.needsUpdate = true
    this.material = new THREE.MeshStandardMaterial({
      map: this.texture,
      roughness: 0.9,
      normalMap: textures.knitNormal,
      normalScale: new THREE.Vector2(1.15, 1.15),
      side: THREE.DoubleSide,
    })
    patchYarn(this.material, { shade: textures.knitShade, shadeAmount: 0.62, rim: 0.3 })
    this.uniforms = {
      uReveal: { value: 0 },
      uRows: { value: 1 },
      uFringe: { value: 0 },
      uWrap: { value: 0 },
      uNeckR: { value: 6 },
      uTime: { value: 0 },
      uKnitRows: { value: 2 },
      uDrape: { value: 0.1 },
      uLayer: { value: 0 },
      uSeed: { value: seed },
      uWrapSize: { value: new THREE.Vector2(8, 40) },
      uHang: { value: new THREE.Matrix4() },
      uNeck: { value: new THREE.Matrix4() },
    }
    const yarn = this.material.onBeforeCompile
    const uniforms = this.uniforms
    this.material.onBeforeCompile = (shader, renderer) => {
      yarn.call(this.material, shader, renderer)
      Object.assign(shader.uniforms, uniforms)
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${VERTEX_HEAD}`)
        .replace('#include <beginnormal_vertex>', `${VERTEX_SHAPE}\nvec3 objectNormal = scarfNormal;\n#ifdef USE_TANGENT\nvec3 objectTangent = vec3(tangent.xyz);\n#endif`)
        .replace('#include <begin_vertex>', 'vec3 transformed = scarfPos;')
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying float vShow;\nvarying float vFresh;\nvarying float vTassel;')
        .replace('#include <clipping_planes_fragment>', 'if (vShow < 0.02) discard;\n#include <clipping_planes_fragment>')
        .replace('#include <color_fragment>', '#include <color_fragment>\ndiffuseColor.rgb *= 1.0 + vFresh * 0.22 - vTassel * 0.06;')
    }
    this.material.customProgramCacheKey = () => 'cosy-scarf'
    this.mesh = new THREE.Mesh(scarfGeometry(), this.material)
    this.mesh.frustumCulled = false
    this.mesh.matrixAutoUpdate = false
    this.mesh.visible = false
  }

  /** Copy the scarf's colours into the texture. Only called when the rows change. */
  write(rows: Scarf): void {
    for (let r = 0; r < rows.length && r < MAX_ROWS; r++) {
      for (let c = 0; c < WIDTH; c++) {
        const colour = bytes[rows[r][c]] ?? bytes[3]
        const i = (r * WIDTH + c) * 4
        this.data[i] = colour[0]
        this.data[i + 1] = colour[1]
        this.data[i + 2] = colour[2]
        this.data[i + 3] = 255
      }
    }
    this.texture.needsUpdate = true
  }

  dispose(): void {
    this.texture.dispose()
    this.material.dispose()
  }
}
