import * as THREE from 'three'

// The enamel look in one shader: painted die-cast metal with a mirror gloss,
// lit from a small procedural matcap (a studio softbox, a sharp glint and a
// horizon), chipped to bare zinc on its edges, and carrying what the wash has
// left on it: mud, foam, water and shine, read from two small textures that
// the surface grid is written into. Colours are authored as they are shown
// (the renderer converts nothing).

const MATCAP = 128
const NOISE = 256

const smooth = (a: number, b: number, t: number): number => {
  const x = Math.min(1, Math.max(0, (t - a) / (b - a)))
  return x * x * (3 - 2 * x)
}

/** R: soft light from upper left. G: the glint and the softbox, for gloss. B: sky above a dark floor, for mirror surfaces. */
export function makeMatcap(): THREE.DataTexture {
  const data = new Uint8Array(MATCAP * MATCAP * 4)
  const light = [-0.45, 0.62, 0.64]
  for (let j = 0; j < MATCAP; j++) for (let i = 0; i < MATCAP; i++) {
    const x = ((i + 0.5) / MATCAP) * 2 - 1, y = ((j + 0.5) / MATCAP) * 2 - 1
    const rr = Math.min(1, x * x + y * y), z = Math.sqrt(1 - rr)
    const diffuse = Math.pow(Math.max(0, x * light[0] + y * light[1] + z * light[2]) * 0.5 + 0.5, 1.25)
    // What a mirror facing this way shows the eye.
    const rx = 2 * z * x, ry = 2 * z * y, rz = 2 * z * z - 1
    const glint = Math.pow(Math.max(0, rx * light[0] + ry * light[1] + rz * light[2]), 220)
    const softbox = smooth(-0.62, -0.5, rx) * (1 - smooth(-0.2, -0.08, rx)) * smooth(0.3, 0.4, ry) * (1 - smooth(0.62, 0.74, ry)) * smooth(0, 0.2, rz)
    const sky = smooth(-0.08, 0.1, ry) * (0.72 + 0.28 * smooth(0, 1, ry)) + (1 - smooth(-0.9, -0.2, ry)) * 0.12
    const k = (j * MATCAP + i) * 4
    data[k] = Math.round(255 * Math.min(1, diffuse))
    data[k + 1] = Math.round(255 * Math.min(1, glint + softbox * 0.8))
    data[k + 2] = Math.round(255 * Math.min(1, sky))
    data[k + 3] = 255
  }
  return finish(new THREE.DataTexture(data, MATCAP, MATCAP, THREE.RGBAFormat), false)
}

/** Tiling noise. R: broad blobs. G: fine grain. B: bubble cells. A: cracks. Seeded, so a still is the same every time. */
export function makeNoise(seed = 7): THREE.DataTexture {
  let s = seed >>> 0 || 1
  const random = (): number => {
    s ^= s << 13; s ^= s >>> 17; s ^= s << 5
    return (s >>> 0) / 2 ** 32
  }
  const lattice = (cells: number): ((u: number, v: number) => number) => {
    const grid = Float32Array.from({ length: cells * cells }, random)
    return (u, v) => {
      const x = u * cells, y = v * cells
      const x0 = Math.floor(x), y0 = Math.floor(y), fx = smooth(0, 1, x - x0), fy = smooth(0, 1, y - y0)
      const g = (a: number, b: number): number => grid[(((b % cells) + cells) % cells) * cells + (((a % cells) + cells) % cells)]
      return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy
    }
  }
  const points = (cells: number): ((u: number, v: number) => [number, number]) => {
    const px = Float32Array.from({ length: cells * cells }, random), py = Float32Array.from({ length: cells * cells }, random)
    // Distance to the nearest and second nearest point, in cells.
    return (u, v) => {
      const x = u * cells, y = v * cells, cx = Math.floor(x), cy = Math.floor(y)
      let d1 = 9, d2 = 9
      for (let b = cy - 1; b <= cy + 1; b++) for (let a = cx - 1; a <= cx + 1; a++) {
        const k = (((b % cells) + cells) % cells) * cells + (((a % cells) + cells) % cells)
        const d = Math.hypot(a + px[k] - x, b + py[k] - y)
        if (d < d1) { d2 = d1; d1 = d } else if (d < d2) d2 = d
      }
      return [d1, d2]
    }
  }
  const broad = lattice(6), mid = lattice(14), fine = lattice(64), bubbles = points(22), cracks = points(9)
  const data = new Uint8Array(NOISE * NOISE * 4)
  for (let j = 0; j < NOISE; j++) for (let i = 0; i < NOISE; i++) {
    const u = i / NOISE, v = j / NOISE, k = (j * NOISE + i) * 4
    const [b1] = bubbles(u, v), [c1, c2] = cracks(u, v)
    data[k] = Math.round(255 * (broad(u, v) * 0.65 + mid(u, v) * 0.35))
    data[k + 1] = Math.round(255 * fine(u, v))
    // Bright in the middle of each bubble, dark where two meet.
    data[k + 2] = Math.round(255 * Math.min(1, Math.max(0, 1 - b1 * 1.35)))
    // 0 on a crack line, rising away from it.
    data[k + 3] = Math.round(255 * Math.min(1, (c2 - c1) * 3))
  }
  return finish(new THREE.DataTexture(data, NOISE, NOISE, THREE.RGBAFormat), true)
}

function finish(texture: THREE.DataTexture, tile: boolean): THREE.DataTexture {
  texture.magFilter = THREE.LinearFilter
  texture.minFilter = THREE.LinearFilter
  texture.wrapS = texture.wrapT = tile ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  texture.needsUpdate = true
  return texture
}

const VERTEX = /* glsl */ `
attribute vec2 surface;
uniform mat4 uRest;
uniform vec4 uSide;
varying vec3 vNormal;
varying vec3 vPaint;
varying vec2 vSurface;
varying vec2 vMaskUv;
varying vec3 vRest;
varying vec3 vWorld;
varying vec3 vWorldNormal;
void main() {
  vec4 local = vec4(position, 1.0);
  vec3 n = normal;
  vec3 rest = (uRest * vec4(position, 1.0)).xyz;
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
    n = mat3(instanceMatrix) * n;
    rest = local.xyz;
  #endif
  vPaint = color;
  #ifdef USE_INSTANCING_COLOR
    // A wheel's tyre stays black; its hub takes the instance's paint.
    vPaint = mix(color, instanceColor, step(surface.x, 0.5));
  #endif
  vSurface = surface;
  vRest = rest;
  vMaskUv = (rest.xy - uSide.xy) / uSide.zw;
  vec4 world = modelMatrix * local;
  vWorld = world.xyz;
  vWorldNormal = normalize(mat3(modelMatrix) * n);
  vNormal = normalize(mat3(viewMatrix) * vWorldNormal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const FRAGMENT = /* glsl */ `
uniform sampler2D uMatcap;
uniform sampler2D uNoise;
uniform sampler2D uMaskA;
uniform sampler2D uMaskB;
uniform float uMasked;
uniform float uGloss;
uniform float uMirror;
uniform vec3 uFloor;
uniform float uYard;
uniform float uGlow;
uniform float uAlpha;
varying vec3 vNormal;
varying vec3 vPaint;
varying vec2 vSurface;
varying vec2 vMaskUv;
varying vec3 vRest;
varying vec3 vWorld;
varying vec3 vWorldNormal;

void main() {
  vec3 n = normalize(vNormal);
  vec3 lit = texture2D(uMatcap, n.xy * 0.49 + 0.5).rgb;
  float diffuse = lit.r, glint = lit.g, sky = lit.b;
  float mat = vSurface.x;
  float enamel = step(mat, 0.5), rubber = step(0.5, mat) * step(mat, 1.5), metal = step(1.5, mat) * step(mat, 2.5);
  float eye = step(4.5, mat);
  float lamp = step(2.5, mat) * step(mat, 3.5) + eye, soft = step(3.5, mat) * step(mat, 4.5);

  vec2 grain = vRest.xy * 0.23 + vRest.z * 0.11;
  vec4 noise = texture2D(uNoise, grain);
  vec4 fine = texture2D(uNoise, grain * 3.1 + 0.37);

  // What the wash has left here. Unmasked things are clean, dry and as glossy as uGloss says.
  // Nothing covers an eye.
  float masked = uMasked * (1.0 - eye);
  vec4 a = texture2D(uMaskA, vMaskUv) * masked;
  vec4 b = texture2D(uMaskB, vMaskUv) * masked;
  float mud = smoothstep(0.4, 0.56, a.r + (noise.r - 0.5) * 0.42);
  float softMud = a.g;
  float foam = smoothstep(0.34, 0.5, a.b + (noise.r - 0.5) * 0.3 + (fine.b - 0.5) * 0.14);
  float brown = a.a;
  float wet = smoothstep(0.35, 0.65, b.r + (noise.r - 0.5) * 0.3);
  float shine = smoothstep(0.35, 0.65, b.g + (noise.g - 0.5) * 0.2);
  float gloss = mix(uGloss, mix(mix(0.55, 0.8, wet), 1.0, shine), uMasked);

  // Enamel: deep paint, a softbox and a glint, and a little sky. Dull paint is hazy.
  vec3 paint = vPaint * (0.36 + 0.74 * diffuse);
  // Dull paint wears a film of dust: paler, greyer, faintly speckled.
  float dust = (1.0 - smoothstep(0.5, 0.8, gloss)) * uMasked;
  paint = mix(paint, vec3(dot(paint, vec3(0.33)) * 0.8 + 0.2) * (0.94 + 0.12 * fine.g), dust * 0.17);
  paint = mix(paint, vec3(dot(paint, vec3(0.33)) * 0.9 + 0.06), (1.0 - gloss) * 0.15);
  // Polished paint is deeper.
  paint *= 1.0 + 0.1 * smoothstep(0.85, 1.0, gloss) * uMasked;
  paint += sky * 0.07 * gloss * vPaint;
  paint = mix(paint, vec3(1.0), clamp(glint * (0.25 + 0.9 * gloss), 0.0, 1.0));
  // The mirror: a long light low on the far wall, given back by whatever faces up. It slides when the body rocks.
  vec3 back = reflect(normalize(vWorld - cameraPosition), normalize(vWorldNormal));
  float rise = back.y - 0.2;
  float bar = (1.0 - smoothstep(0.035, 0.05, abs(rise))) * 0.85 + exp(-rise * rise / 0.012) * 0.3;
  bar *= smoothstep(0.2, 0.6, -back.z) * smoothstep(0.5, 0.9, normalize(vWorldNormal).y);
  paint = mix(paint, vec3(1.0), clamp(bar * gloss * gloss, 0.0, 0.92));
  // The sheen of mirror gloss on a flat panel: two streaks of light lying across the side, crisp only on polished paint.
  float across = vRest.x * 0.62 + vRest.y - 0.55 * n.x;
  float lane = fract(across * 0.8);
  float streaks = smoothstep(0.1, 0.13, lane) * (1.0 - smoothstep(0.27, 0.3, lane)) + 0.7 * smoothstep(0.37, 0.39, lane) * (1.0 - smoothstep(0.43, 0.45, lane));
  paint = mix(paint, vec3(1.0), uMasked * streaks * smoothstep(0.82, 1.0, gloss) * 0.5 * smoothstep(0.3, 0.8, n.z));
  // Chips: bare zinc on the chamfers.
  float chip = enamel * step(0.5, vSurface.y) * smoothstep(0.69, 0.73, noise.r * 0.62 + fine.g * 0.5);
  vec3 zinc = vec3(0.62, 0.64, 0.66) * (0.5 + 0.6 * sky) + glint * 0.3;
  paint = mix(paint, zinc, chip);

  vec3 tyre = vPaint * (0.55 + 0.6 * diffuse) + glint * 0.05 + sky * 0.03;
  vec3 chrome = vPaint * (0.3 + 0.85 * sky) + glint * 0.85;
  vec3 glass = vPaint * (0.55 + 0.6 * diffuse) + sky * 0.12 + glint * 0.95;
  vec3 cloth = vPaint * (0.5 + 0.6 * diffuse);
  vec3 col = paint * enamel + tyre * rubber + chrome * metal + glass * lamp + cloth * soft;

  // Water: darker paint, beads that catch the light.
  vec4 drops = texture2D(uNoise, grain * 1.7 + 0.61);
  float bead = wet * (1.0 - shine) * smoothstep(0.8, 0.88, drops.b);
  col *= 1.0 - 0.16 * wet * (1.0 - shine);
  col = mix(col, col * 0.7, bead);
  col = mix(col, vec3(0.94, 0.98, 1.0), bead * smoothstep(0.9, 0.97, drops.b) * 0.9);
  // A wet sheen: thin runs of light down the panel.
  float run = wet * (1.0 - shine) * smoothstep(0.75, 0.9, texture2D(uNoise, vec2(vRest.x * 0.9, vRest.y * 0.06)).g) * smoothstep(0.3, 0.8, n.z);
  col = mix(col, vec3(0.9, 0.96, 1.0), run * 0.28);

  // Mud: pale and cracked when dry, dark and glistening when soft.
  float crack = 1.0 - smoothstep(0.03, 0.12, noise.a);
  vec3 caked = vec3(0.74, 0.62, 0.44) * (0.55 + 0.6 * diffuse) * (1.0 - 0.45 * crack) * (0.92 + 0.16 * fine.g);
  vec3 soaked = vec3(0.33, 0.2, 0.1) * (0.5 + 0.7 * diffuse) * (0.85 + 0.3 * fine.r) + (glint * 0.5 + sky * 0.1) * vec3(1.0, 0.92, 0.8);
  col = mix(col, mix(caked, soaked, softMud), mud);

  // Foam: white bubbles with blue shade between them, browned by the mud it lifted.
  float cell = fine.b;
  vec3 suds = mix(vec3(0.8, 0.88, 0.96), vec3(1.0), smoothstep(0.05, 0.4, cell)) * (0.8 + 0.26 * diffuse);
  suds = mix(suds, suds * vec3(0.78, 0.62, 0.44), brown * (0.55 + 0.45 * noise.g));
  col = mix(col, suds, foam);

  // The idle glow: a warm light on the edges that face away, so it reads on paint, mud and foam alike.
  col += uGlow * vec3(1.0, 0.9, 0.55) * (0.03 + 1.1 * pow(1.0 - clamp(n.z, 0.0, 1.0), 2.4));

  #ifdef REFLECTED
    // The copy under the floor: what wet concrete gives back, fading with depth.
    float fade = exp(vWorld.y * 1.5) * uMirror * (1.0 - smoothstep(uYard - 0.9, uYard - 0.2, vWorld.x));
    gl_FragColor = vec4(mix(uFloor, col, 0.55), fade);
  #else
    gl_FragColor = vec4(col, uAlpha);
  #endif
}
`

export type EnamelKit = {
  matcap: THREE.DataTexture
  noise: THREE.DataTexture
  /** A grey pixel for anything with no surface grid. */
  blank: THREE.DataTexture
  dispose(): void
}

export function makeKit(): EnamelKit {
  const matcap = makeMatcap(), noise = makeNoise()
  const blank = finish(new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1, THREE.RGBAFormat), false)
  return { matcap, noise, blank, dispose: () => { matcap.dispose(); noise.dispose(); blank.dispose() } }
}

export type EnamelOptions = {
  /** Surface textures, when the mesh carries the grid of a vehicle. */
  masks?: { a: THREE.Texture; b: THREE.Texture; side: { x0: number; x1: number; y0: number; y1: number } }
  gloss?: number
  reflected?: boolean
  floor?: readonly [number, number, number]
  /** The copy under the floor fades out where the wet pad ends. */
  yardFrom?: number
}

export function enamelMaterial(kit: EnamelKit, options: EnamelOptions = {}): THREE.ShaderMaterial {
  const side = options.masks?.side ?? { x0: 0, x1: 1, y0: 0, y1: 1 }
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    vertexColors: true,
    defines: options.reflected ? { REFLECTED: '' } : {},
    transparent: options.reflected === true,
    uniforms: {
      uMatcap: { value: kit.matcap },
      uNoise: { value: kit.noise },
      uMaskA: { value: options.masks?.a ?? kit.blank },
      uMaskB: { value: options.masks?.b ?? kit.blank },
      uMasked: { value: options.masks ? 1 : 0 },
      uGloss: { value: options.gloss ?? 0.9 },
      uMirror: { value: 0.7 },
      uGlow: { value: 0 },
      uAlpha: { value: 1 },
      uYard: { value: options.yardFrom ?? 1e6 },
      uFloor: { value: new THREE.Vector3(...(options.floor ?? [0.13, 0.15, 0.18])) },
      // Takes a vertex to where it rests on the vehicle's side, for reading the surface grid.
      uRest: { value: new THREE.Matrix4() },
      uSide: { value: new THREE.Vector4(side.x0, side.y0, side.x1 - side.x0, side.y1 - side.y0) },
    },
  })
}
