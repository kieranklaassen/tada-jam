import * as THREE from 'three'
import { PANEL } from '../layout'
import { GLOW_PASS } from './glow'
import { PALETTE, type GlassLook, type RGB } from './palette'

// Hand-written shaders, all authored in display space and written straight to
// the canvas (no tone mapping, no colour-space chunk). Glass is faked and
// opaque: a thick-centre tint, light shining up from the panel, an emissive
// core when light passes through, a soft overhead glint, and a bright opaque
// fresnel rim so a piece reads against the glowing panel. Nothing here uses
// transmission, so glass never needs sorting.

const vec3 = (c: RGB) => new THREE.Vector3(c[0], c[1], c[2])

const HASH = /* glsl */ `
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
`

/** Creature and piece part ids, shared with geometry.ts. */
export const PART = {
  rigid: 0,
  /** jelly bell / moth left wing / snail body front / fish tail */
  a: 1,
  /** jelly tentacles / moth right wing / snail left stalk / fish fins */
  b: 2,
  /** moth antennae / snail right stalk */
  c: 3,
  mirrorFace: 5,
  prismGlass: 6,
  knob: 9,
} as const

export const KIND = { piece: 0, jelly: 1, moth: 2, snail: 3, fish: 4 } as const

const GLASS_VERTEX = /* glsl */ `
attribute vec3 color;
attribute float aPart;
attribute float aGlow;
uniform float uKind;
uniform vec4 uAnim;
uniform float uTime;
uniform float uKnob;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vGlow;
varying float vPart;

vec3 rotX(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(p.x, c * p.y - s * p.z, s * p.y + c * p.z); }
vec3 rotY(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x + s * p.z, p.y, -s * p.x + c * p.z); }
vec3 rotZ(vec3 p, float a) { float c = cos(a), s = sin(a); return vec3(c * p.x - s * p.y, s * p.x + c * p.y, p.z); }

void deform(inout vec3 p, inout vec3 n) {
  int kind = int(uKind + 0.5);
  int part = int(aPart + 0.5);
  if (part == 9) {
    p.xz *= uKnob;
    p.y *= mix(0.2, 1.0, uKnob);
    return;
  }
  if (kind == 1) {
    // Jellyfish: a squeezes the bell narrow and tall, b sways the tentacles, c lets them droop and splay.
    float sq = uAnim.x;
    if (part == 1) {
      p.xz *= 1.0 - 0.3 * sq;
      p.y = 3.6 + (p.y - 3.6) * (1.0 + 0.45 * sq);
    } else if (part == 2) {
      float hang = max(0.0, 3.6 - p.y);
      p.xz *= (1.0 - 0.22 * sq) * (1.0 + hang * 0.28 * uAnim.z);
      p.y = 3.6 - hang * (1.0 - 0.4 * uAnim.z);
      float w = sin(hang * 1.5 - uTime * 2.4 + p.z * 1.7 + p.x);
      p.x += w * uAnim.y * hang * 0.22;
      p.z += cos(hang * 1.2 - uTime * 2.0 + p.x * 2.0) * uAnim.y * hang * 0.12;
    }
  } else if (kind == 2) {
    // Moth: a spreads the wings from folded-up to open, b flaps, c lifts the antennae.
    // At rest the wings fold back into a low tent over the body, the way moths sleep.
    float angle = mix(-0.32, 0.12, uAnim.x) + uAnim.y * 0.75;
    float sweep = (1.0 - uAnim.x) * 0.62;
    vec3 pivot = vec3(0.4, 2.35, 0.0);
    if (part == 1) {
      p = rotX(rotY(p - pivot, -sweep), -angle) + pivot;
      n = rotX(rotY(n, -sweep), -angle);
    } else if (part == 2) {
      p = rotX(rotY(p - pivot, sweep), angle) + pivot;
      n = rotX(rotY(n, sweep), angle);
    } else if (part == 3) {
      vec3 head = vec3(2.6, 2.8, 0.0);
      float lift = (uAnim.z - 0.5) * 0.8;
      p = rotZ(p - head, lift) + head;
      n = rotZ(n, lift);
    }
  } else if (kind == 3) {
    // Snail: a brings the body out of the shell, b and c stretch the two eye stalks.
    float ext = mix(0.28, 1.0, uAnim.x);
    if (part == 1 && p.x > -0.4) p.x = -0.4 + (p.x + 0.4) * ext;
    if (part == 2 || part == 3) {
      float side = part == 2 ? 1.0 : -1.0;
      vec3 root = vec3(2.7, 1.9, side * 0.42);
      float len = max(0.12, part == 2 ? uAnim.y : uAnim.z);
      vec3 moved = vec3(-0.4 + (root.x + 0.4) * ext, root.y, root.z);
      p = moved + (p - root) * vec3(len, len, 1.0);
    }
    // A slow wave travels along the foot.
    if (part == 1 || part == 0) p.y += sin(p.x * 1.8 - uTime * 3.0) * 0.07 * uAnim.x * step(p.y, 1.2);
  } else if (kind == 4) {
    // Fish: a beats the tail, b fans the fins, c bends the whole body into a C.
    vec3 pivot = vec3(-2.9, 2.5, 0.0);
    if (part == 1) {
      float beat = uAnim.x * 0.65;
      p = rotY(p - pivot, beat) + pivot;
      n = rotY(n, beat);
    } else if (part == 2) {
      float side = sign(p.z);
      float fan = uAnim.y * 0.6 * side;
      vec3 root = vec3(0.8, 2.2, side * 1.3);
      p = rotX(p - root, -fan) + root;
      n = rotX(n, -fan);
    }
    p.z += uAnim.z * p.x * p.x * 0.085;
  }
}

void main() {
  vec3 p = position;
  vec3 n = normal;
  deform(p, n);
  vec4 world = modelMatrix * vec4(p, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * n);
  vColor = color;
  vGlow = aGlow;
  vPart = aPart;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const GLASS_FRAGMENT = /* glsl */ `
uniform vec3 uTint;
uniform vec3 uRim;
uniform vec3 uCore;
uniform float uLit;
uniform float uGlow;
uniform float uDim;
uniform float uUnder;
uniform float uTime;
uniform float uKind;
uniform vec3 uRoom;
uniform vec3 uPanel;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vGlow;
varying float vPart;

vec3 hue(float h) {
  return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
}

void main() {
  vec3 N = normalize(vWorldNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(cameraPosition - vWorldPos);
  float ndv = clamp(dot(N, V), 0.0, 1.0);
  float fres = pow(1.0 - ndv, 2.2);
  vec3 R = reflect(-V, N);

  // A matcap-like environment: soft ceiling light above, the glowing panel below, the dim room between.
  vec3 env = R.y > 0.0 ? mix(uRoom * 1.6, vec3(0.78, 0.9, 0.9), pow(R.y, 1.6)) : mix(uRoom * 1.6, uPanel * 1.35, pow(-R.y, 0.7));
  vec3 L = normalize(vec3(-0.35, 0.82, 0.45));
  float lr = max(dot(R, L), 0.0);
  float soft = pow(lr, 10.0) * 0.32;
  float glint = pow(lr, 80.0) * 0.95;

  vec3 tint = uTint * vColor;
  vec3 col = tint * (0.54 + 0.38 * ndv) * uDim;
  // Frosted glass scatters the panel's light through its whole body, strongest near the panel.
  float under = exp(-max(vWorldPos.y, 0.0) * 0.5) * uUnder;
  col += tint * (under * 0.32 + 0.1 * uUnder);
  col += env * 0.12;
  int part = int(vPart + 0.5);
  // A snail's coil is pigment: waking light fills its soft body and stalks, and the shell keeps its amber and creases.
  float shell = int(uKind + 0.5) == 3 && part == 0 ? 1.0 : 0.0;
  // Light fills a filter slab with its colour; a prism only splits it, so its clear glass lights more gently.
  col += uCore * uLit * (part == 6 ? 0.4 : 1.0) * (1.0 - 0.7 * shell) * (0.22 + 0.78 * ndv * ndv);
  col += uCore * vGlow * (0.75 + 0.35 * uLit);

  float rimWeight = 0.82;
  if (part == 5) {
    // Silvered mirror face: a cool dark silver holding the room, with a bright streak sliding across as it turns.
    // Its reflection already shows the angle, so the glassy rim would only wash it white.
    float streak = smoothstep(0.3, 0.0, abs(fract(dot(vWorldPos.xz, vec2(0.05, 0.03)) + R.x * 0.35) - 0.5) - 0.1);
    col = mix(vec3(0.3, 0.38, 0.41), env, 0.45) + streak * 0.45 + uCore * uLit * 0.18;
    rimWeight = 0.15;
  } else if (part == 6) {
    // Clear glass: the broad top stays a cool pale tint so the rainbow edges and facets carry it, not a white slab.
    float top = smoothstep(0.75, 0.98, N.y);
    col = mix(col, tint * (0.62 + 0.18 * uUnder) + env * 0.1, top * 0.8);
    col += hue(fres * 1.3 + dot(vWorldPos.xz, vec2(0.04, 0.02)) + uTime * 0.03) * fres * (0.22 + 0.5 * uLit);
    col += hue(dot(vWorldPos.xz, vec2(0.11, 0.06)) - uTime * 0.04) * top * uLit * 0.16;
    rimWeight = 0.62;
  } else if (part == 9) {
    // The knob is a handle, not glass the light passes through: no core glow or panel scatter, and a lighter rim
    // (a small bead is nearly all rim from above), so it keeps the piece's colour instead of burning white.
    col = tint * (0.5 + 0.32 * ndv) + env * 0.1 + uCore * vGlow * 0.6;
    rimWeight = 0.35;
  }

  col = mix(col, uRim, smoothstep(0.32, 0.95, fres) * rimWeight);
  col += uRim * uGlow * (0.14 + 0.4 * fres) * (1.0 - 0.55 * shell);
  col += vec3(1.0, 0.98, 0.94) * (soft + glint);
  gl_FragColor = vec4(col, 1.0);
}
`

export type GlassUniforms = {
  uTint: { value: THREE.Vector3 }
  uRim: { value: THREE.Vector3 }
  uCore: { value: THREE.Vector3 }
  uLit: { value: number }
  uGlow: { value: number }
  uDim: { value: number }
  uUnder: { value: number }
  uTime: { value: number }
  uKind: { value: number }
  uAnim: { value: THREE.Vector4 }
  uKnob: { value: number }
  uRoom: { value: THREE.Vector3 }
  uPanel: { value: THREE.Vector3 }
}

export function glassMaterial(look: GlassLook, kind: number): THREE.ShaderMaterial & { uniforms: GlassUniforms } {
  const uniforms: GlassUniforms = {
    uTint: { value: vec3(look.tint) },
    uRim: { value: vec3(look.rim) },
    uCore: { value: vec3(look.core) },
    uLit: { value: 0 },
    uGlow: { value: 0 },
    uDim: { value: 1 },
    uUnder: { value: 1 },
    uTime: { value: 0 },
    uKind: { value: kind },
    uAnim: { value: new THREE.Vector4() },
    uKnob: { value: 1 },
    uRoom: { value: vec3(PALETTE.room) },
    uPanel: { value: vec3(PALETTE.panelCentre) },
  }
  return new THREE.ShaderMaterial({ uniforms, vertexShader: GLASS_VERTEX, fragmentShader: GLASS_FRAGMENT }) as THREE.ShaderMaterial & { uniforms: GlassUniforms }
}

const MATTE_VERTEX = /* glsl */ `
attribute vec3 color;
attribute float aGlow;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vGlow;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * normal);
  vColor = color;
  vGlow = aGlow;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const MATTE_FRAGMENT = /* glsl */ `
uniform vec4 uPanelRect;
uniform vec3 uSpill;
varying vec3 vWorldNormal;
varying vec3 vWorldPos;
varying vec3 vColor;
varying float vGlow;
${HASH}
void main() {
  vec3 N = normalize(vWorldNormal);
  float key = max(dot(N, normalize(vec3(-0.4, 0.8, 0.5))), 0.0);
  vec3 col = vColor * (0.62 + 0.38 * key);
  // The panel lights the slab around it; the light falls off into the room.
  vec2 d = max(max(uPanelRect.xy - vWorldPos.xz, vWorldPos.xz - uPanelRect.zw), 0.0);
  float spill = exp(-length(d) * 0.16) * (0.35 + 0.65 * max(N.y, 0.0));
  col += uSpill * spill * 0.4;
  col += vColor * vGlow;
  // A fine frosted speckle, so the slab reads as matte glass rather than flat paint.
  col *= 0.97 + 0.06 * hash12(floor(vWorldPos.xz * 6.0 + vWorldPos.y * 3.0));
  gl_FragColor = vec4(col, 1.0);
}
`

const PANEL_RECT = () => new THREE.Vector4(PANEL.minX, PANEL.minY, PANEL.maxX, PANEL.maxY)

export function matteMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uPanelRect: { value: PANEL_RECT() }, uSpill: { value: vec3(PALETTE.panelCentre) } },
    vertexShader: MATTE_VERTEX,
    fragmentShader: MATTE_FRAGMENT,
  })
}

const PANEL_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPos;
void main() {
  vUv = uv;
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorldPos = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const PANEL_FRAGMENT = /* glsl */ `
uniform vec3 uCentre;
uniform vec3 uEdge;
uniform vec3 uRimColour;
uniform float uTime;
uniform float uWave;
varying vec2 vUv;
varying vec3 vWorldPos;
${HASH}
void main() {
  vec2 p = vUv * 2.0 - 1.0;
  float r = length(p * vec2(1.0, 0.92));
  vec3 col = mix(uCentre, uEdge, smoothstep(0.05, 1.3, r));
  vec2 e = 1.0 - abs(p);
  float edge = min(e.x * 1.0, e.y * 1.76);
  col *= 0.84 + 0.16 * smoothstep(0.0, 0.1, edge);
  col += uRimColour * exp(-edge * 38.0) * 0.16;
  col += (hash12(floor(vWorldPos.xz * 5.0)) - 0.5) * 0.016;
  // All four awake: a slow soft wave of light rolls out from the middle, once.
  if (uWave > 0.0 && uWave < 5.0) {
    float front = uWave * 32.0;
    float d = length(vWorldPos.xz);
    float band = exp(-pow((d - front) * 0.08, 2.0)) * (1.0 - uWave / 5.0);
    vec3 rainbow = clamp(abs(mod(d * 0.012 + vec3(0.0, 0.66, 0.33), 1.0) * 6.0 - 3.0) - 1.0, 0.0, 1.0);
    col += mix(vec3(1.0), rainbow, 0.55) * band * 0.22;
  }
  gl_FragColor = vec4(col, 1.0);
}
`

export function panelMaterial(): THREE.ShaderMaterial & { uniforms: { uTime: { value: number }; uWave: { value: number } } } {
  return new THREE.ShaderMaterial({
    uniforms: {
      uCentre: { value: vec3(PALETTE.panelCentre) },
      uEdge: { value: vec3(PALETTE.panelEdge) },
      uRimColour: { value: vec3(PALETTE.panelRim) },
      uTime: { value: 0 },
      uWave: { value: -1 },
    },
    vertexShader: PANEL_VERTEX,
    fragmentShader: PANEL_FRAGMENT,
  }) as THREE.ShaderMaterial & { uniforms: { uTime: { value: number }; uWave: { value: number } } }
}

const ROOM_FRAGMENT = /* glsl */ `
uniform vec3 uRoom;
uniform vec3 uGlow;
varying vec2 vUv;
varying vec3 vWorldPos;
${HASH}
void main() {
  float d = length(vWorldPos.xz * vec2(0.8, 1.0) - vec2(0.0, 6.0));
  float glow = exp(-d * 0.011) * (vWorldPos.y < -5.0 ? 1.0 : exp(-max(vWorldPos.y, 0.0) * 0.012));
  vec3 col = mix(uRoom, uGlow, glow);
  col += (hash12(floor(gl_FragCoord.xy * 0.5)) - 0.5) * 0.01;
  gl_FragColor = vec4(col, 1.0);
}
`

export function roomMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uRoom: { value: vec3(PALETTE.room) }, uGlow: { value: vec3(PALETTE.roomGlow) } },
    vertexShader: PANEL_VERTEX,
    fragmentShader: ROOM_FRAGMENT,
  })
}

// --- instanced sprites ------------------------------------------------------

/** Sprite shapes (the fragment shader draws each procedurally). */
export const SHAPE = { glow: 0, ring: 1, sparkle: 2, caustic: 3, orb: 4, shadow: 5, mote: 6, eye: 7 } as const
/** How a sprite faces: billboard to the camera, flat on the panel, or billboard nudged toward the camera (eyes). */
export const FACING = { billboard: 0, flat: 1, front: 2 } as const

const SPRITE_VERTEX = /* glsl */ `
attribute vec4 iPos;
attribute vec4 iColour;
attribute vec4 iShape;
varying vec2 vUv;
varying vec4 vColour;
varying vec4 vShape;
void main() {
  vUv = position.xy * 2.0;
  vColour = iColour;
  vShape = iShape;
  float c = cos(iShape.z);
  float s = sin(iShape.z);
  float aspect = int(iShape.x + 0.5) == 5 ? max(iShape.w, 0.2) : 1.0;
  vec2 q = vec2(c * position.x * aspect - s * position.y, s * position.x * aspect + c * position.y) * iPos.w;
  vec4 mv;
  if (iShape.y > 0.5 && iShape.y < 1.5) {
    mv = viewMatrix * vec4(iPos.xyz + vec3(q.x, 0.0, q.y), 1.0);
  } else {
    mv = viewMatrix * vec4(iPos.xyz, 1.0);
    mv.xy += q;
    if (iShape.y > 1.5) mv.xyz += normalize(-mv.xyz) * 1.4;
  }
  gl_Position = projectionMatrix * mv;
}
`

const SPRITE_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uGlowPass;
varying vec2 vUv;
varying vec4 vColour;
varying vec4 vShape;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  int shape = int(vShape.x + 0.5);
  float a = 0.0;
  vec3 col = vColour.rgb;
  if (shape == 0) {
    a = exp(-r * r * 4.2) * (1.0 - r);
  } else if (shape == 1) {
    float ring = vShape.w;
    a = exp(-pow((r - ring) * 10.0, 2.0)) * (1.0 - ring) * 1.4;
  } else if (shape == 2) {
    float rays = max(exp(-abs(vUv.x) * 16.0) * exp(-abs(vUv.y) * 2.6), exp(-abs(vUv.y) * 16.0) * exp(-abs(vUv.x) * 2.6));
    a = rays * 0.8 + exp(-r * r * 12.0) * 0.9;
    col = mix(col, vec3(1.0), exp(-r * r * 30.0) * 0.7);
  } else if (shape == 3) {
    vec2 p = vUv * 2.6 + vShape.w * 7.0;
    float t = uTime * 0.9;
    float w = sin(p.x * 2.7 + t) + sin(dot(p, vec2(-0.5, 0.87)) * 3.1 - t * 1.2) + sin(dot(p, vec2(-0.5, -0.87)) * 2.5 + t * 0.7);
    float net = pow(1.0 - abs(w) / 3.0, 5.0);
    a = (0.3 + 0.9 * net) * exp(-r * r * 2.6) * (1.0 - r);
  } else if (shape == 4) {
    float body = smoothstep(1.0, 0.86, r);
    float rim = smoothstep(0.55, 0.92, r) * body;
    float shine = exp(-pow(length(vUv - vec2(-0.32, 0.36)) * 4.0, 2.0));
    a = body * 0.42 + rim * 0.5 + shine * 0.4;
    col = mix(col, vec3(1.0), shine * 0.6);
  } else if (shape == 6) {
    a = exp(-r * r * 9.0);
  }
  float bloom = shape == 2 || shape == 6 ? 1.0 : shape == 4 ? 0.6 : shape == 0 ? 0.3 : 0.0;
  a *= mix(1.0, bloom, uGlowPass);
  gl_FragColor = vec4(col * vColour.a * a, 1.0);
}
`

const SHADE_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec4 vColour;
varying vec4 vShape;
void main() {
  float r = length(vUv);
  if (r > 1.0) discard;
  int shape = int(vShape.x + 0.5);
  float a = 0.0;
  vec3 col = vColour.rgb;
  if (shape == 5) {
    a = exp(-r * r * 3.2) * (1.0 - r);
  } else if (shape == 7) {
    float open = vShape.w;
    vec2 p = vUv;
    float disc = smoothstep(0.95, 0.75, length(vec2(p.x, p.y / max(open, 0.05))));
    float arc = smoothstep(0.26, 0.1, abs(p.y + 0.1 - 0.45 * p.x * p.x)) * smoothstep(0.95, 0.6, abs(p.x));
    a = mix(arc, disc, smoothstep(0.12, 0.4, open));
    float glint = smoothstep(0.3, 0.16, length(p - vec2(-0.28, 0.3 * open))) * smoothstep(0.3, 0.6, open);
    col = mix(col, vec3(1.0), glint);
    a = max(a, glint);
  }
  gl_FragColor = vec4(col, a * vColour.a);
}
`

export function spriteMaterial(additive: boolean): THREE.ShaderMaterial & { uniforms: { uTime: { value: number } } } {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uGlowPass: GLOW_PASS },
    vertexShader: SPRITE_VERTEX,
    fragmentShader: additive ? SPRITE_FRAGMENT : SHADE_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: additive ? THREE.CustomBlending : THREE.NormalBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
  }) as THREE.ShaderMaterial & { uniforms: { uTime: { value: number } } }
}

// --- beams --------------------------------------------------------------------

const BEAM_VERTEX = /* glsl */ `
attribute vec3 aDir;
attribute vec2 aSide;
attribute vec2 aAlong;
attribute vec4 aColour;
varying float vSide;
varying float vKind;
varying vec2 vAlong;
varying vec4 vColour;
void main() {
  vec3 p = position;
  float kind = aSide.y;
  float width = kind < 0.5 ? 1.0 : kind < 1.5 ? 7.0 : 0.9;
  vec3 perp;
  if (kind < 0.5) {
    vec3 toCamera = normalize(cameraPosition - p);
    perp = normalize(cross(aDir, toCamera));
  } else {
    perp = normalize(vec3(-aDir.z, 0.0, aDir.x));
  }
  p += perp * aSide.x * width * 0.5;
  vSide = aSide.x;
  vKind = kind;
  vAlong = aAlong;
  vColour = aColour;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`

const BEAM_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uGlowPass;
varying float vSide;
varying float vKind;
varying vec2 vAlong;
varying vec4 vColour;
void main() {
  float s = vSide;
  float d = vAlong.x * vAlong.y;
  float flow = 0.86 + 0.14 * sin(d * 0.8 - uTime * 6.0);
  float a;
  vec3 col = vColour.rgb;
  if (vKind < 0.5) {
    // A slim core with a soft sheath; most of the light lands as a wide wash on the frosted panel below.
    float hot = exp(-s * s * 40.0);
    a = exp(-s * s * 6.0) * 0.5 + hot * 0.65;
    col = mix(col, vec3(1.0), hot * 0.35);
  } else if (vKind < 1.5) {
    a = exp(-s * s * 4.0) * 0.4 + exp(-s * s * 18.0) * 0.14;
  } else {
    float hot = exp(-s * s * 20.0);
    a = exp(-s * s * 6.0) * 0.7 + hot * 0.5;
    col = mix(col, vec3(1.0), hot * 0.4);
  }
  a *= mix(1.0, vKind < 0.5 ? 1.0 : vKind < 1.5 ? 0.5 : 0.0, uGlowPass);
  gl_FragColor = vec4(col * a * flow * vColour.a, 1.0);
}
`

export function beamMaterial(): THREE.ShaderMaterial & { uniforms: { uTime: { value: number } } } {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uGlowPass: GLOW_PASS },
    vertexShader: BEAM_VERTEX,
    fragmentShader: BEAM_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendEquation: THREE.AddEquation,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneFactor,
    side: THREE.DoubleSide,
  }) as THREE.ShaderMaterial & { uniforms: { uTime: { value: number } } }
}
