// The garden round the yard: the ground with its sand and grass, the picket
// fence at the back, the hedges at the sides and the trees beyond. All of it
// stands still, so the fence, hedges and trees are fused into one moulding and
// the ground is one plane with one small shader (ART.md, "The look").

import * as THREE from 'three'
import { COLS, ROWS } from './ground'
import { YARD_PITCH } from './layout'
import { GARDEN, SAND, rgbOf } from './look'
import { at, ball, box, mould, rod, type Part } from './mould'
import { HEIGHT, WIDTH, type WetPaint } from './wetPaint'

/** How far outside the yard's edge the side hedges stand. The gate hangs in the right one. */
export const HEDGE_OUT = 1.0

/** How far the ground runs beyond the yard on every side, in yard units. */
const BEYOND = 26

function vec(hex: number): THREE.Vector3 {
  const c = new THREE.Color(hex)
  return new THREE.Vector3(c.r, c.g, c.b)
}

const groundVertex = /* glsl */ `
varying vec2 vYard;
void main() {
  // The plane lies flat with the yard's far left corner at the origin.
  vYard = position.xz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`

const groundFragment = /* glsl */ `
precision mediump float;
varying vec2 vYard;
uniform sampler2D wet;
uniform vec2 yard;
uniform float slide;
uniform float pitch;
uniform vec3 sandDry, sandSpeck, sandDamp, sandMud, puddle, grass, grassDark;
uniform float detail;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float grain(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y);
}

void main() {
  // The yard is a sand pit with a soft wobbly edge; beyond it is grass. On the way to the next yard the pit
  // slides toward the child and the next one, a pitch behind it, slides in.
  vec2 here = vYard - vec2(0.0, slide);
  vec2 next = here + vec2(0.0, pitch);
  float wobble = (grain(here * 0.9) - 0.5) * 0.5;
  vec2 insetHere = min(here + 0.55, yard + 0.55 - here);
  vec2 insetNext = min(next + 0.55, yard + 0.55 - next);
  float sandShare = smoothstep(-0.08, 0.1, max(min(insetHere.x, insetHere.y), min(insetNext.x, insetNext.y)) + wobble);

  float speck = detail > 0.5 ? grain(here * 9.0) * 0.6 + grain(here * 31.0) * 0.4 : 0.5;
  // Raked sand: soft low ridges, lit from the upper left.
  float ridge = detail > 0.5 ? sin(here.y * 5.2 + grain(here * 0.7) * 5.0) * 0.5 + 0.5 : 0.5;
  vec3 sand = mix(sandDry, sandSpeck, speck * 0.55) * (0.955 + 0.07 * ridge);

  // The wet picture belongs to the yard that is here, and slides away with it.
  vec3 w = texture2D(wet, here / yard).rgb;
  float inYard = step(0.0, here.x) * step(here.x, yard.x) * step(0.0, here.y) * step(here.y, yard.y);
  w *= inYard;
  float damp = smoothstep(0.0, 0.34, w.r);
  sand = mix(sand, sandDamp * (0.92 + 0.12 * speck), damp);
  // Mud is dark and lumpy, with a wet shine on its lumps.
  float lumps = detail > 0.5 ? grain(here * 6.5) : 0.5;
  sand = mix(sand, sandMud * (0.8 + 0.5 * lumps) + smoothstep(0.72, 0.9, lumps) * 0.16, smoothstep(0.3, 0.6, w.b));
  // Standing water: a blue sheet with a pale rim where it meets the sand.
  float muddy = smoothstep(0.3, 0.6, w.b);
  float pool = smoothstep(0.4, 0.62, w.g) * (1.0 - muddy);
  float rim = smoothstep(0.4, 0.5, w.g) - smoothstep(0.5, 0.66, w.g);
  sand = mix(sand, puddle, pool * 0.82) + rim * (1.0 - muddy) * 0.1;

  float blades = detail > 0.5 ? grain(here * vec2(14.0, 5.0)) : 0.5;
  float patches = grain(here * 0.35);
  vec3 lawn = mix(grass, grassDark, blades * 0.45 + patches * 0.35);
  gl_FragColor = vec4(mix(lawn, sand, sandShare), 1.0);
  #include <colorspace_fragment>
}`

export type Ground3 = {
  mesh: THREE.Mesh
  /** Takes the picture of the wet sand to the screen when it has changed. */
  refresh: (paint: WetPaint) => void
  /** The speckle, ridges and blades of grass, which the lowest tier leaves out. */
  setDetail: (on: boolean) => void
  /** How far the yard has slid toward the child on the way to the next one, in yard units. */
  setSlide: (by: number) => void
  dispose: () => void
}

/** The ground: sand in the yard, grass round it, and the wet sand drawn from the picture. */
export function buildGround(paint: WetPaint): Ground3 {
  const texture = new THREE.DataTexture(paint.data, WIDTH, HEIGHT, THREE.RGBAFormat, THREE.UnsignedByteType)
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.needsUpdate = true
  const material = new THREE.ShaderMaterial({
    vertexShader: groundVertex,
    fragmentShader: groundFragment,
    uniforms: {
      wet: { value: texture },
      yard: { value: new THREE.Vector2(COLS, ROWS) },
      sandDry: { value: vec(SAND.dry) },
      sandSpeck: { value: vec(SAND.speck) },
      sandDamp: { value: vec(SAND.damp) },
      sandMud: { value: vec(SAND.mud) },
      puddle: { value: vec(SAND.puddle) },
      grass: { value: vec(GARDEN.grass) },
      grassDark: { value: vec(GARDEN.grassDark) },
      detail: { value: 1 },
      slide: { value: 0 },
      pitch: { value: YARD_PITCH },
    },
  })
  const plane = new THREE.PlaneGeometry(COLS + 2 * BEYOND, ROWS + 2 * BEYOND)
  plane.rotateX(-Math.PI / 2)
  plane.translate(COLS / 2, 0, ROWS / 2)
  const mesh = new THREE.Mesh(plane, material)
  mesh.name = 'ground'
  return {
    mesh,
    refresh: (picture) => {
      if (!picture.dirty) return
      picture.dirty = false
      texture.needsUpdate = true
    },
    setDetail: (on) => { material.uniforms.detail.value = on ? 1 : 0 },
    setSlide: (by) => { material.uniforms.slide.value = by },
    dispose: () => {
      plane.dispose()
      material.dispose()
      texture.dispose()
    },
  }
}

/** One picket of the fence: a slat with a rounded top. */
function picket(x: number, z: number): Part[] {
  return [at(box(0.52, 1.15, 0.16, 0.12, GARDEN.fence), x, 0.6, z)]
}

/** A lollipop tree: a toy's idea of a tree. */
function tree(x: number, z: number, size: number): Part[] {
  return [at(rod(0.22 * size, 0.3 * size, 1.9 * size, GARDEN.trunk, 10), x, 0.95 * size, z), at(ball(1.35 * size, GARDEN.hedge, [1, 0.92, 1], 16), x, 2.7 * size, z)]
}

/** A hedge as a row of fat green bumps, from one z to another along one x. */
function hedge(x: number, fromZ: number, toZ: number): Part[] {
  const parts: Part[] = []
  const count = Math.max(1, Math.round((toZ - fromZ) / HEDGE_STEP))
  for (let i = 0; i <= count; i++) {
    const z = fromZ + ((toZ - fromZ) * i) / count
    parts.push(at(ball(0.95, GARDEN.hedge, [0.8, i % 2 ? 0.92 : 1.06, 1], 12), x, 0.72, z))
  }
  return parts
}

/** Where the far fence stands, just beyond the yard's far edge. */
export const FENCE_Z = -0.85

/** How far apart the bumps of a hedge stand. A pitch of yards is a whole number of them, so a hedge that slides by a pitch looks as it did. */
export const HEDGE_STEP = 1.25

/**
 * The hedges down both sides, as one moulding. They run on past both ends of
 * the yard, so the stage can slide them with the ground on the way to the next
 * yard and wrap them round by one bump.
 */
export function buildHedges(plastic: THREE.Material): THREE.Mesh {
  const parts: Part[] = []
  for (const x of [-HEDGE_OUT, COLS + HEDGE_OUT]) parts.push(...hedge(x, FENCE_Z - 6 * HEDGE_STEP, FENCE_Z + 14 * HEDGE_STEP))
  const mesh = new THREE.Mesh(mould(parts), plastic)
  mesh.name = 'hedges'
  return mesh
}

/** The far side of a yard as one moulding: the picket fence, open from one x to another where the gate hangs, and two trees beyond it. Both yards on screen during a drive share it. */
export function buildFarSide(gateGap: readonly [number, number]): THREE.BufferGeometry {
  const parts: Part[] = []
  // The fence stops short of the hedges at both ends.
  const from = 0.12, to = COLS - 0.12
  for (let x = from; x <= to + 0.01; x += 0.78) {
    if (x > gateGap[0] - 0.45 && x < gateGap[1] + 0.45) continue
    parts.push(...picket(x, FENCE_Z))
  }
  // The two rails behind the pickets, broken at the gate.
  for (const [a, b] of [[from - 0.15, gateGap[0] - 0.2], [gateGap[1] + 0.2, to + 0.15]]) {
    for (const y of [0.42, 0.86]) parts.push(at(box(b - a, 0.13, 0.1, 0.05, GARDEN.fence), (a + b) / 2, y, FENCE_Z - 0.1))
  }
  parts.push(...tree(10.4, -3.3, 0.9), ...tree(14.2, -2.6, 0.78))
  return mould(parts)
}

/** The far colour behind everything: a pale sky. */
export function skyColour(): THREE.Color {
  const [r, g, b] = rgbOf(GARDEN.sky)
  return new THREE.Color().setRGB(r, g, b, THREE.SRGBColorSpace)
}
