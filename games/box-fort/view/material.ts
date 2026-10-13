import * as THREE from 'three'
import { makeRng } from '../rng'

// The one board material: a matt surface in flat workshop daylight, a kraft
// tile multiplied by the paint of each corner, and flutes drawn along every
// cut edge. Nothing here is made when the module loads: the kit is built on
// first use, by the view.

const VERTEX = /* glsl */ `
attribute vec3 paint;
attribute float flute;
attribute float glow;
varying float vGlow;
#ifdef HOLES
attribute vec2 cell;
varying vec2 vCell;
#endif
varying vec3 vPaint;
varying vec2 vUv;
varying float vFlute;
varying vec3 vNormal;
void main() {
  vPaint = paint;
  vUv = uv;
  vFlute = flute;
  vGlow = glow;
  vNormal = normalize(mat3(modelMatrix) * normal);
  #ifdef HOLES
  vCell = cell;
  #endif
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const FRAGMENT = /* glsl */ `
uniform sampler2D kraft;
uniform vec3 sun;
uniform float dusk;
uniform float lit;
varying float vGlow;
#ifdef HOLES
uniform sampler2D holes;
varying vec2 vCell;
#endif
varying vec3 vPaint;
varying vec2 vUv;
varying float vFlute;
varying vec3 vNormal;
void main() {
  #ifdef HOLES
  // The grid of the face: board where it reads dark, gone where it reads light.
  if (texture2D(holes, vCell).r > 0.5) discard;
  #endif
  vec3 n = normalize(vNormal);
  float light = 0.66 + 0.3 * max(dot(n, sun), 0.0) + 0.08 * n.y;
  vec3 board = texture2D(kraft, vUv).rgb;
  float flutes = 0.7 + 0.3 * abs(sin(vUv.x * 3.14159));
  vec3 paint = vPaint;
  #ifdef CHECK
  // The blanket's check: two bands that cross.
  float bands = step(0.5, fract(vUv.x)) + step(0.5, fract(vUv.y));
  paint = bands > 1.5 ? vPaint * 0.72 : bands > 0.5 ? vPaint : vec3(0.95, 0.89, 0.78);
  #endif
  vec3 day = paint * mix(board, vec3(flutes), vFlute) * light;
  // With the switch off nothing is lit by a lamp: the room is painted over in dusk, and whatever shines is painted flat and pale.
  vec3 night = day * vec3(0.27, 0.31, 0.47);
  vec3 shine = vGlow > 1.5 ? paint * 1.12 : paint * 0.34 + vec3(1.0, 0.84, 0.5) * 0.7;
  gl_FragColor = vec4(mix(day, mix(night, shine, min(vGlow, 1.0) * lit), dusk), 1.0);
}`

/** How much darker each later hole of a face is written into its grid, out of 255, and how many holes are told apart: the light on the wall comes on hole by hole. */
export const HOLE_STEP = 4
export const HOLE_MOST = 16

const SPILL_VERTEX = /* glsl */ `
attribute vec2 cell;
varying vec2 vCell;
void main() {
  vCell = cell;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const SPILL_FRAGMENT = /* glsl */ `
uniform sampler2D holes;
uniform float blocked;
uniform float upTo;
varying vec2 vCell;
void main() {
  // The light of a box on the wall: flat and pale wherever its face is cut away.
  float gone = texture2D(holes, vCell).r;
  if (gone < 0.5) discard;
  // The holes light one after another: the grid holds, for each cell that is gone, which hole it belongs to.
  if ((1.0 - gone) * HOLE_STEPS > upTo - 0.5) discard;
  // A cushion in the box stands in the light's way: nothing falls on the wall below the cushion's top.
  if (vCell.y < blocked) discard;
  gl_FragColor = vec4(1.0, 0.9, 0.62, 1.0);
}`

const BLOB_VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const BLOB_FRAGMENT = /* glsl */ `
uniform vec3 tint;
uniform float strength;
varying vec2 vUv;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  gl_FragColor = vec4(tint, strength * (1.0 - smoothstep(0.25, 1.0, d)));
}`

/** A tile of kraft paper: fibres, speckle and the faint lines of the flutes under it. Near white, since paint multiplies it. */
function kraftTile(): THREE.DataTexture {
  const size = 128, data = new Uint8Array(size * size * 4), rng = makeRng(20261012)
  const value = new Float32Array(size * size).fill(0.93)
  for (let i = 0; i < value.length; i++) value[i] += (rng.next() - 0.5) * 0.05 + Math.sin(((i % size) / size) * Math.PI * 2 * 8) * 0.018
  // Short fibres lying across the sheet.
  for (let fibre = 0; fibre < 420; fibre++) {
    const x = Math.floor(rng.next() * size), y = Math.floor(rng.next() * size), length = 3 + Math.floor(rng.next() * 9), tone = (rng.next() - 0.6) * 0.09
    for (let step = 0; step < length; step++) value[y * size + ((x + step) % size)] += tone
  }
  for (let i = 0; i < value.length; i++) {
    const v = Math.round(Math.min(1, Math.max(0, value[i])) * 255)
    data[i * 4] = v; data[i * 4 + 1] = v; data[i * 4 + 2] = Math.round(v * 0.985); data[i * 4 + 3] = 255
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat)
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearMipmapLinearFilter
  texture.generateMipmaps = true
  texture.needsUpdate = true
  return texture
}

export type Kit = {
  kraft: THREE.DataTexture
  /** How dark the room is, 0 to 1: one value every board material reads. */
  dusk: { value: number }
  board: THREE.ShaderMaterial
  /** A board material with its own light: what is cut to glow shines by `uniforms.lit` once the room is dark. `sheet` is for a single sheet with no thickness (cloth, a card on a thread), which is drawn from both sides. */
  lit(check?: boolean, sheet?: boolean): THREE.ShaderMaterial
  /** The light a face with holes throws on the wall. */
  spill(grid: THREE.Texture): THREE.ShaderMaterial
  /** A board material for one face with holes: the grid of that face decides where the board is. */
  holed(grid: THREE.Texture): THREE.ShaderMaterial
  /** A soft round blob laid flat: dark for a shadow, light for the glow on what can be touched. */
  blob(tint: readonly [number, number, number], strength: number, additive?: boolean): THREE.ShaderMaterial
  dispose(): void
}

export function makeKit(): Kit {
  const kraft = kraftTile(), made: THREE.Material[] = []
  // Daylight from the upper left front.
  const sun = new THREE.Vector3(-0.45, 0.62, 0.64).normalize()
  const keep = <M extends THREE.Material>(material: M): M => { made.push(material); return material }
  const dusk = { value: 0 }
  const uniforms = (): Record<string, THREE.IUniform> => ({ kraft: { value: kraft }, sun: { value: sun }, dusk, lit: { value: 0 } })
  // Board has thickness: every piece is closed, so only the side turned to the eye is drawn, and two pieces that touch never show through each other.
  const board = keep(new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, uniforms: uniforms(), side: THREE.FrontSide }))
  return {
    kraft,
    dusk,
    board,
    lit: (check = false, sheet = false) => keep(new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, defines: check ? { CHECK: '' } : {}, uniforms: uniforms(), side: sheet ? THREE.DoubleSide : THREE.FrontSide })),
    spill: (grid) => keep(new THREE.ShaderMaterial({ vertexShader: SPILL_VERTEX, fragmentShader: SPILL_FRAGMENT, defines: { HOLE_STEPS: (255 / HOLE_STEP).toFixed(2) }, uniforms: { holes: { value: grid }, blocked: { value: 0 }, upTo: { value: 99 } }, side: THREE.DoubleSide })),
    holed: (grid) => keep(new THREE.ShaderMaterial({ vertexShader: VERTEX, fragmentShader: FRAGMENT, defines: { HOLES: '' }, uniforms: { ...uniforms(), holes: { value: grid } }, side: THREE.FrontSide })),
    blob: (tint, strength, additive = false) => keep(new THREE.ShaderMaterial({ vertexShader: BLOB_VERTEX, fragmentShader: BLOB_FRAGMENT, uniforms: { tint: { value: new THREE.Vector3(tint[0], tint[1], tint[2]) }, strength: { value: strength } }, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })),
    dispose: () => {
      kraft.dispose()
      for (const material of made) material.dispose()
    },
  }
}
