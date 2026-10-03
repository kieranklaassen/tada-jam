import { Color, DoubleSide, FrontSide, ShaderMaterial, Vector3 } from 'three'
import { PALETTE } from './palette'

// The one material of the look: inflated vinyl in daylight. Nothing is lit by
// a three.js light and nothing is really see-through. A fragment gets
// - a soft wrapped shade that stays in the toy's own hue,
// - a broad pale sheen with a small bright core, the pool-toy highlight,
// - a lighter rim where the skin turns away, which reads as light coming
//   through the edge,
// - welded seams: thin ridges along the panels of a form, drawn from its UVs,
// and the vertex shader breathes the skin a little, as air under vinyl does.
// The base colour comes from the vertex colours, times the instance colour for
// the balloons. No texture, no light, no post pass.

export type VinylUniforms = {
  uTime: { value: number }
  /** How far the skin breathes along its normal, in world units. */
  uWobble: { value: number }
  /** 0 flat, 1 full sheen: a lower quality tier turns the small bright core off. */
  uGloss: { value: number }
  /** Extra light on the whole form, 0 to 1: the breathing glow on what can be touched. */
  uGlow: { value: number }
  uKey: { value: Vector3 }
  uSky: { value: Color }
  uGlowColour: { value: Color }
}

const VERTEX = /* glsl */ `
attribute float panels;
uniform float uTime;
uniform float uWobble;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vColour;
varying vec2 vUv;
varying float vPanels;

void main() {
  vec3 colour = vec3(1.0);
  #ifdef USE_COLOR
    colour *= color;
  #endif
  #ifdef USE_INSTANCING_COLOR
    colour *= instanceColor;
  #endif
  mat4 world = modelMatrix;
  #ifdef USE_INSTANCING
    world = modelMatrix * instanceMatrix;
  #endif
  float breath = sin(uTime * 2.1 + position.y * 2.7 + position.x * 1.9 + world[3].x * 0.7) * uWobble;
  vec4 seen = viewMatrix * world * vec4(position + normal * breath, 1.0);
  // The normal of a squashed form: each axis is divided by its scale squared.
  mat3 turn = mat3(viewMatrix * world);
  vec3 scale2 = vec3(dot(turn[0], turn[0]), dot(turn[1], turn[1]), dot(turn[2], turn[2]));
  vNormal = normalize(turn * (normal / scale2));
  vView = -seen.xyz;
  vColour = colour;
  vUv = uv;
  vPanels = panels;
  gl_Position = projectionMatrix * seen;
}
`

const FRAGMENT = /* glsl */ `
uniform float uGloss;
uniform float uGlow;
uniform vec3 uKey;
uniform vec3 uSky;
uniform vec3 uGlowColour;
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vColour;
varying vec2 vUv;
varying float vPanels;

void main() {
  vec3 n = normalize(vNormal);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(vView);
  vec3 key = normalize(uKey);
  float wrap = dot(n, key) * 0.5 + 0.5;
  // The shaded side keeps its hue: darker and a little towards the sky, never grey.
  vec3 dark = vColour * mix(vec3(0.58, 0.52, 0.66), uSky, 0.18);
  vec3 lit = vColour * 1.04 + 0.03;
  vec3 colour = mix(dark, lit, smoothstep(0.18, 0.82, wrap));

  // Welded seams along the panels, a darker groove with a pale lip beside it.
  if (vPanels > 0.5) {
    float along = vUv.x * vPanels;
    float groove = abs(fract(along) - 0.5);
    float wide = fwidth(along) * 1.5 + 0.012;
    float line = 1.0 - smoothstep(wide * 0.5, wide * 1.5, groove);
    float lip = 1.0 - smoothstep(wide * 1.5, wide * 4.0, groove);
    // The seams run together at the two poles of a form; fade them there.
    float poles = smoothstep(0.04, 0.16, vUv.y) * (1.0 - smoothstep(0.84, 0.96, vUv.y));
    colour = mix(colour, colour * 0.8, line * poles);
    colour += (lip - line) * poles * 0.05;
  }

  vec3 half_ = normalize(key + v);
  float facing = max(dot(n, half_), 0.0);
  float sheen = smoothstep(0.78, 0.985, facing);
  float core = smoothstep(0.986, 0.996, facing) * uGloss;
  colour = mix(colour, vec3(1.0), sheen * 0.32 + core * 0.55);

  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.6);
  colour = mix(colour, mix(vColour, uSky, 0.35) * 0.5 + 0.5, rim * 0.62);

  colour = mix(colour, uGlowColour, uGlow * (0.22 + rim * 0.5));
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`

/** The light comes from up, left and in front, in view space: the same for every form, wherever it turns. */
const KEY = new Vector3(-0.42, 0.74, 0.52).normalize()

/** The uniforms every vinyl material shares, so one write moves the time or the gloss for all of them. */
export function sharedVinyl(): VinylUniforms {
  return {
    uTime: { value: 0 },
    uWobble: { value: 0.012 },
    uGloss: { value: 1 },
    uGlow: { value: 0 },
    uKey: { value: KEY },
    uSky: { value: new Color(PALETTE.skyTop) },
    uGlowColour: { value: new Color(PALETTE.glow) },
  }
}

/**
 * A vinyl material. `own` lists the uniforms this material keeps to itself (its own glow, a stiller skin); the
 * others are the shared objects, which is what keeps one write enough.
 */
export function vinylMaterial(shared: VinylUniforms, own: Partial<{ uGlow: number; uWobble: number }> = {}, bothSides = false): ShaderMaterial {
  const uniforms: VinylUniforms = { ...shared }
  if (own.uGlow !== undefined) uniforms.uGlow = { value: own.uGlow }
  if (own.uWobble !== undefined) uniforms.uWobble = { value: own.uWobble }
  return new ShaderMaterial({ uniforms, vertexShader: VERTEX, fragmentShader: FRAGMENT, vertexColors: true, side: bothSides ? DoubleSide : FrontSide })
}
