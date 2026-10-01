// The three materials of the beach: sand (the height field, lit by a low sun
// with its shadows baked per vertex), water (one flat sheet that knows how
// deep the sand under it is, so it thins to foam at every shore), and a soft
// matte material for everything carried, found or alive.

import * as THREE from 'three'
import { DRY_Z, POOL, X0, X1, Z0, Z1 } from './terrain.ts'

export interface Light {
  uSun: { value: THREE.Vector3 }
  uSunCol: { value: THREE.Color }
  uAmb: { value: THREE.Color }
  uFill: { value: THREE.Color }
  uSkyTop: { value: THREE.Color }
  uSkyHor: { value: THREE.Color }
  uDeep: { value: THREE.Color }
  uShallow: { value: THREE.Color }
  uGlint: { value: THREE.Vector3 }
  uCam: { value: THREE.Vector3 }
  uLevel: { value: number }
  uTime: { value: number }
  uDusk: { value: number }
  uNoise: { value: THREE.Texture | null }
}

export function createLight(): Light {
  return {
    uSun: { value: new THREE.Vector3(0.5, 0.7, -0.5) },
    uSunCol: { value: new THREE.Color() },
    uAmb: { value: new THREE.Color() },
    uFill: { value: new THREE.Color() },
    uSkyTop: { value: new THREE.Color() },
    uSkyHor: { value: new THREE.Color() },
    uDeep: { value: new THREE.Color() },
    uShallow: { value: new THREE.Color() },
    uGlint: { value: new THREE.Vector3(0.4, 0.5, -0.8) },
    uCam: { value: new THREE.Vector3() },
    uLevel: { value: -0.25 },
    uTime: { value: 0 },
    uDusk: { value: 0 },
    uNoise: { value: noiseTexture() },
  }
}

// A 256 by 256 tiling noise: r and a are soft blotches (16 texel cells), g is
// finer (4 texel cells), b is white grain.
function noiseTexture(): THREE.DataTexture {
  const N = 256
  const data = new Uint8Array(N * N * 4)
  let seed = 9173
  const rand = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const layer = (cells: number): Float32Array => {
    const lattice = new Float32Array(cells * cells)
    for (let i = 0; i < lattice.length; i++) lattice[i] = rand()
    const out = new Float32Array(N * N)
    const size = N / cells
    for (let y = 0; y < N; y++) {
      const fy = y / size
      const y0 = Math.floor(fy)
      let ty = fy - y0
      ty = ty * ty * (3 - 2 * ty)
      for (let x = 0; x < N; x++) {
        const fx = x / size
        const x0 = Math.floor(fx)
        let tx = fx - x0
        tx = tx * tx * (3 - 2 * tx)
        const a = lattice[(y0 % cells) * cells + (x0 % cells)]
        const b = lattice[(y0 % cells) * cells + ((x0 + 1) % cells)]
        const c = lattice[((y0 + 1) % cells) * cells + (x0 % cells)]
        const d = lattice[((y0 + 1) % cells) * cells + ((x0 + 1) % cells)]
        out[y * N + x] = (a + (b - a) * tx) * (1 - ty) + (c + (d - c) * tx) * ty
      }
    }
    return out
  }
  const r = layer(16)
  const g = layer(64)
  const a = layer(16)
  const r2 = layer(32)
  for (let i = 0; i < N * N; i++) {
    data[i * 4] = Math.round((r[i] * 0.7 + r2[i] * 0.3) * 255)
    data[i * 4 + 1] = Math.round(g[i] * 255)
    data[i * 4 + 2] = Math.round(rand() * 255)
    data[i * 4 + 3] = Math.round(a[i] * 255)
  }
  const tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  tex.magFilter = THREE.LinearFilter
  tex.minFilter = THREE.LinearMipmapLinearFilter
  tex.generateMipmaps = true
  tex.needsUpdate = true
  return tex
}

// Noise comes from one small tiling texture (see noiseTexture): r and a are
// soft blotches, g is finer, b is grain. Looking it up is far cheaper than
// computing it per pixel.
const SAND_VERT = /* glsl */ `
attribute float aBase;
attribute vec2 aLight;
varying vec3 vN;
varying vec3 vP;
varying float vRise;
varying vec2 vLight;
void main() {
  vN = normal;
  vP = position;
  vRise = position.y - aBase;
  vLight = aLight;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SAND_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uNoise;
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uAmb;
uniform vec3 uFill;
uniform vec3 uSkyHor;
uniform float uLevel;
uniform float uDusk;
uniform vec4 uPoolAt;
varying vec3 vN;
varying vec3 vP;
varying float vRise;
varying vec2 vLight;
void main() {
  vec3 n = normalize(vN);
  vec4 soft = texture2D(uNoise, vP.xz * 0.106);
  vec4 fine = texture2D(uNoise, vP.xz * 0.37 + 0.31);
  float n1 = soft.r;
  float damp = 1.0 - smoothstep(${(DRY_Z - 0.4).toFixed(2)}, ${(DRY_Z + 0.5).toFixed(2)}, vP.z + (n1 - 0.5) * 0.6);
  // Ripple marks the last tide left on the flat damp sand.
  float flatness = smoothstep(0.82, 0.995, n.y) * (1.0 - smoothstep(0.015, 0.06, abs(vRise)));
  float rip = sin(vP.z * 10.5 + n1 * 5.0 + sin(vP.x * 1.3) * 1.6);
  n.z += rip * 0.13 * flatness * damp;
  // Soft footprints of dry sand.
  vec2 dune = texture2D(uNoise, vP.xz * 0.2 + 0.6).ra - 0.5;
  n.xz += dune * 0.5 * (1.0 - damp) * (1.0 - 0.65 * uDusk);
  n = normalize(n);

  float grain = fine.b * 0.55 + fine.g * 0.45;
  vec3 dry = vec3(0.985, 0.90, 0.735);
  vec3 dampc = vec3(0.90, 0.745, 0.53);
  vec3 dug = vec3(0.70, 0.535, 0.36);
  vec3 built = vec3(0.955, 0.80, 0.56);
  vec3 alb = mix(dry, dampc, damp);
  alb = mix(alb, dug, smoothstep(-0.008, -0.16, vRise));
  alb = mix(alb, built, smoothstep(0.07, 0.3, vRise));
  // Pigment pooling, as in a wash of paint.
  alb *= 0.93 + 0.14 * soft.a;

  float pd = length((vP.xz - uPoolAt.xy) * vec2(1.0, 1.25));
  float lvl = max(uLevel, pd < uPoolAt.z * 1.35 ? uPoolAt.w : -9.0);
  float wet = 1.0 - smoothstep(lvl + 0.012, lvl + 0.11, vP.y);
  alb *= mix(1.0, 0.76, wet);
  alb *= 0.925 + 0.15 * grain;

  float ndl = max(dot(n, uSun), 0.0);
  float ao = vLight.y;
  float sh = vLight.x;
  vec3 lit = uAmb * (0.74 + 0.26 * n.y) * ao;
  lit += uSunCol * ndl * sh * mix(1.0, ao, 0.4);
  lit += uFill * max(dot(n, vec3(-0.25, 0.3, 0.92)), 0.0) * ao;
  // Low light skims along steep sand facing the sun and makes it glow.
  lit += uSunCol * uDusk * 0.16 * sh * (1.0 - n.y) * smoothstep(-0.2, 0.6, dot(n, uSun));
  vec3 col = alb * lit;
  col = mix(col, uSkyHor, wet * 0.14 * n.y);
  col += uSunCol * step(0.972, fine.b) * step(0.6, fine.g) * sh * (0.25 + ndl) * 0.22;
  // Broken shell and grit: pale and dark flecks.
  vec4 fleck = texture2D(uNoise, vP.xz * 0.2 + 0.77);
  col *= 1.0 + 0.16 * step(0.988, fleck.b) - 0.2 * step(fleck.b, 0.012);
  gl_FragColor = vec4(col, 1.0);
}
`

const WATER_VERT = /* glsl */ `
uniform float uLevel;
varying vec3 vP;
void main() {
  vec3 p = vec3(position.x, uLevel, position.z);
  vP = p;
  gl_Position = projectionMatrix * viewMatrix * vec4(p, 1.0);
}
`

const WATER_FRAG = /* glsl */ `
precision highp float;
uniform sampler2D uHeight;
uniform sampler2D uNoise;
uniform vec4 uDomain;
uniform float uLevel;
uniform float uTime;
uniform float uDusk;
uniform float uPool;
uniform vec3 uSkyTop;
uniform vec3 uSkyHor;
uniform vec3 uSunCol;
uniform vec3 uDeep;
uniform vec3 uShallow;
uniform vec3 uGlint;
uniform vec3 uCam;
varying vec3 vP;
void main() {
  vec2 q = vP.xz;
  vec2 uv = (q - uDomain.xy) * uDomain.zw;
  float ground = texture2D(uHeight, clamp(uv, 0.0, 1.0)).r;
  // Past the far edge of the sand the sea bed just keeps falling away.
  ground -= max(0.0, uDomain.y - q.y) * 0.8;
  float t = uTime;
  float lap = sin(q.x * 1.7 + t * 0.8 + sin(q.y * 1.3 + t * 0.31) * 2.0) * 0.006;
  float depth = uLevel + lap - ground;
  if (depth <= 0.0) discard;

  // Long low swells, seen from the shore.
  vec4 w1 = texture2D(uNoise, q * vec2(0.032, 0.15) + t * vec2(0.004, 0.012));
  vec4 w2 = texture2D(uNoise, q * vec2(0.085, 0.36) - t * vec2(0.006, 0.016));
  // Shallow water lies still; the open sea moves more.
  float open = 0.3 + 0.7 * smoothstep(0.0, 0.5, depth);
  vec3 n = normalize(vec3((w1.r - 0.5 + (w2.a - 0.5) * 0.6) * 0.34 * open, 1.0, (w1.a - 0.5 + (w2.r - 0.5) * 0.6) * 0.5 * open));

  vec3 v = normalize(uCam - vP);
  vec3 r = reflect(-v, n);
  float fres = 1.0 - max(dot(v, n), 0.0);
  fres = fres * fres * fres;
  vec3 sky = mix(uSkyHor, uSkyTop, clamp(r.y * 1.25 - 0.1, 0.0, 1.0));
  vec3 body = mix(uShallow, uDeep, smoothstep(0.0, 0.42, depth));
  vec3 col = mix(body, sky, clamp(0.42 + 0.9 * fres + 0.2 * uDusk, 0.0, 1.0));
  // The sun's road across the water.
  float rd = max(dot(r, uGlint), 0.0);
  float rd2 = rd * rd;
  float rd8 = rd2 * rd2 * rd2 * rd2;
  float rd32 = rd8 * rd8 * rd8 * rd8;
  col += uSunCol * (rd32 * 0.8 + rd8 * 0.13) * (0.35 + 0.65 * uDusk) * (1.0 - uPool);

  float a = smoothstep(0.0, 0.03, depth) * mix(0.46, 0.93, smoothstep(0.0, 0.3, depth));
  // Foam where it thins onto the sand.
  float edge = 1.0 - smoothstep(0.0, 0.03 + 0.012 * sin(t * 1.2 + q.x * 2.3 + q.y), depth);
  float foam = edge * (0.5 + 0.5 * w2.g);
  foam += (1.0 - smoothstep(0.03, 0.085, depth)) * 0.22 * step(0.56, texture2D(uNoise, q * 0.3 + t * 0.004).g);
  foam = clamp(foam, 0.0, 1.0) * (1.0 - 0.6 * uPool);
  col = mix(col, mix(vec3(1.0, 0.985, 0.95), uSkyHor, 0.25 * uDusk), foam * 0.8);
  a = max(a, foam * 0.85) * smoothstep(0.0, 0.006, depth);

  // The far sea is all water and goes hazy toward the sky.
  float far = smoothstep(uDomain.y + 1.1, uDomain.y + 0.3, q.y) * (1.0 - uPool);
  a = mix(a, 1.0, far);
  float haze = smoothstep(-4.1, -5.3, q.y) * (1.0 - uPool);
  col = mix(col, uSkyHor, haze * 0.45);
  gl_FragColor = vec4(col, a);
}
`

const PROP_VERT = /* glsl */ `
attribute vec3 aColor;
varying vec3 vN;
varying vec3 vC;
varying vec3 vW;
void main() {
  vec4 w = modelMatrix * vec4(position, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vC = aColor;
  gl_Position = projectionMatrix * viewMatrix * w;
}
`

const PROP_FRAG = /* glsl */ `
precision highp float;
uniform vec3 uSun;
uniform vec3 uSunCol;
uniform vec3 uAmb;
uniform vec3 uFill;
uniform vec3 uCam;
uniform vec3 uSkyHor;
uniform float uDusk;
varying vec3 vN;
varying vec3 vC;
varying vec3 vW;
void main() {
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(uCam - vW);
  float ndl = dot(n, uSun);
  // Wrapped light: nothing here has a hard dark side.
  float wrap = clamp(ndl * 0.6 + 0.4, 0.0, 1.0);
  vec3 lit = uAmb * (0.8 + 0.2 * n.y) + uSunCol * wrap * wrap * 0.85;
  lit += uFill * max(dot(n, normalize(vec3(-0.25, 0.3, 0.92))), 0.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 2.5) * smoothstep(-0.3, 0.5, ndl);
  lit += uSunCol * rim * (0.12 + 0.4 * uDusk);
  lit += uSkyHor * max(n.y, 0.0) * 0.22 * uDusk;
  gl_FragColor = vec4(vC * lit, 1.0);
}
`

export function sandMaterial(light: Light): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...light, uPoolAt: { value: new THREE.Vector4(POOL.x, POOL.z, POOL.r, POOL.level) } },
    vertexShader: SAND_VERT,
    fragmentShader: SAND_FRAG,
  })
}

export function waterMaterial(light: Light, heights: THREE.Texture, pool: boolean): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...light,
      uLevel: pool ? { value: POOL.level } : light.uLevel,
      uPool: { value: pool ? 1 : 0 },
      uHeight: { value: heights },
      uDomain: { value: new THREE.Vector4(X0, Z0, 1 / (X1 - X0), 1 / (Z1 - Z0)) },
    },
    vertexShader: WATER_VERT,
    fragmentShader: WATER_FRAG,
    transparent: true,
    depthWrite: false,
  })
}

export function propMaterial(light: Light): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { ...light },
    vertexShader: PROP_VERT,
    fragmentShader: PROP_FRAG,
    side: THREE.DoubleSide,
  })
}
