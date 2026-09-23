import * as THREE from 'three'
import { brushTexture, shared } from './gouache'
import { PALETTE, rgb } from './palette'

// The painted sky behind the trees: an apricot-to-violet dusk wash in soft
// gouache bands, a far treeline, the moon (with its ink ring) rising at
// nightfall, and hashed stars that come out one by one. It is a single
// full-screen triangle drawn after the opaque scene at the far plane, so
// it only paints the pixels the forest leaves uncovered. `lift` is how far
// the camera has tilted up (in screen heights), so the sky stays put in
// the world when the camera looks up at night.

function vec3(hex: string): THREE.Vector3 {
  const [r, g, b] = rgb(hex)
  return new THREE.Vector3(r, g, b)
}

export const skyUniforms = {
  moon: { value: 0 },
  stars: { value: 0 },
  lift: { value: 0 },
}

const VERTEX = /* glsl */ `
  void main() {
    gl_Position = vec4(position.xy, 0.99999, 1.0);
  }
`

const FRAGMENT = /* glsl */ `
  uniform sampler2D brush;
  uniform vec2 resolution;
  uniform float time;
  uniform float night;
  uniform float morning;
  uniform float moon;
  uniform float stars;
  uniform float lift;
  uniform vec3 ink;
  uniform vec3 top;
  uniform vec3 mid;
  uniform vec3 horizon;
  uniform vec3 topNight;
  uniform vec3 midNight;
  uniform vec3 horizonNight;
  uniform vec3 topMorning;
  uniform vec3 horizonMorning;
  uniform vec3 farTrees;
  uniform vec3 farTreesNight;
  uniform vec3 moonColor;
  uniform vec3 starColor;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  vec3 wash(float y, vec3 lo, vec3 m, vec3 hi) {
    return y < 0.5 ? mix(lo, m, smoothstep(0.0, 0.5, y)) : mix(m, hi, smoothstep(0.5, 1.0, y));
  }

  void main() {
    vec2 uv = gl_FragCoord.xy / resolution;
    float aspect = resolution.x / resolution.y;
    vec2 p = vec2(uv.x * aspect, uv.y + lift);
    vec3 b = texture2D(brush, vec2(p.x * 0.55, p.y * 2.2)).rgb;
    vec3 b2 = texture2D(brush, p * 1.7 + 0.37).rgb;

    // Gradient height: 0 at the painted treeline, 1 high overhead.
    float y = clamp((p.y - 0.58) / 0.8 + (b.r - 0.5) * 0.07, 0.0, 1.0);
    float band = floor(y * 7.0 + b.b * 0.8) / 7.0;
    y = mix(y, band, 0.35);
    vec3 dusk = wash(y, horizon, mid, top);
    vec3 deep = wash(y, horizonNight, midNight, topNight);
    vec3 dawn = mix(horizonMorning, topMorning, smoothstep(0.0, 0.8, y));
    vec3 col = mix(dusk, deep, night);
    col = mix(col, dawn, morning * (1.0 - night));
    col *= 0.94 + 0.12 * b2.g;
    // Long dry-brush clouds at dusk.
    float cloud = smoothstep(0.62, 0.8, b.r) * smoothstep(0.1, 0.4, y) * (1.0 - smoothstep(0.6, 0.9, y));
    col = mix(col, mix(vec3(1.0, 0.82, 0.72), vec3(0.3, 0.34, 0.55), night), cloud * 0.35);

    // Stars: one per cell at most, twinkling, more of them higher up.
    vec2 cell = floor(p * 34.0);
    float h = hash(cell);
    vec2 inCell = fract(p * 34.0) - vec2(hash(cell + 3.1), hash(cell + 7.7)) * 0.6 - 0.2;
    float star = step(0.9, h) * smoothstep(0.09, 0.0, length(inCell)) * (0.65 + 0.35 * sin(time * (1.2 + h * 3.0) + h * 40.0));
    float reveal = smoothstep(h * 0.9, h * 0.9 + 0.1, stars) * smoothstep(0.05, 0.25, y);
    col = mix(col, starColor, star * reveal);

    // The moon rises from behind the trees, gouache-cream with an ink ring.
    vec2 moonAt = vec2(aspect * 0.7, mix(0.5, 1.28, moon));
    float r = length((p - moonAt) * vec2(1.0, 1.0));
    float radius = 0.062;
    float glowRing = smoothstep(radius * 3.2, radius, r) * moon * 0.35;
    col = mix(col, mix(col, moonColor, 0.5), glowRing);
    float disc = smoothstep(radius + 0.002, radius - 0.002, r + (b2.r - 0.5) * 0.006);
    vec3 moonPaint = moonColor * (0.9 + 0.1 * b2.b) - vec3(0.08, 0.07, 0.03) * smoothstep(0.55, 0.8, texture2D(brush, (p - moonAt) * 3.0).b);
    col = mix(col, moonPaint, disc * step(0.001, moon));
    float line = smoothstep(0.006, 0.0, abs(r - radius) - 0.0015 * (0.6 + b2.r));
    col = mix(col, ink, line * step(0.001, moon) * 0.9);

    // The far treeline: rounded crowns and pointed firs painted flat, hazy.
    float x = p.x * 7.0;
    float crowns = 0.035 * (sin(x * 1.3) * 0.5 + 0.5) + 0.03 * abs(sin(x * 3.1 + 1.0)) + 0.02 * b.b;
    float firs = 0.07 * max(0.0, 1.0 - abs(fract(x * 0.9) - 0.5) * 5.0) * step(0.5, hash(floor(vec2(x * 0.9, 1.0))));
    float line2 = 0.6 + max(crowns, firs);
    float trees = smoothstep(line2 + 0.004, line2 - 0.004, p.y);
    vec3 far = mix(farTrees, farTreesNight, night) * (0.92 + 0.12 * b2.g);
    col = mix(col, far, trees);

    gl_FragColor = vec4(col, 1.0);
  }
`

export function createSky(): THREE.Mesh {
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3))
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthWrite: false,
    uniforms: {
      brush: { value: brushTexture() },
      resolution: shared.resolution,
      time: shared.time,
      night: shared.night,
      morning: shared.morning,
      ink: shared.ink,
      ...skyUniforms,
      top: { value: vec3(PALETTE.skyTop) },
      mid: { value: vec3(PALETTE.skyMid) },
      horizon: { value: vec3(PALETTE.skyHorizon) },
      topNight: { value: vec3(PALETTE.skyTopNight) },
      midNight: { value: vec3(PALETTE.skyMidNight) },
      horizonNight: { value: vec3(PALETTE.skyHorizonNight) },
      topMorning: { value: vec3(PALETTE.skyTopMorning) },
      horizonMorning: { value: vec3(PALETTE.skyHorizonMorning) },
      farTrees: { value: vec3(PALETTE.farTrees) },
      farTreesNight: { value: vec3(PALETTE.farTreesNight) },
      moonColor: { value: vec3(PALETTE.moon) },
      starColor: { value: vec3(PALETTE.star) },
    },
  })
  const mesh = new THREE.Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = 10
  return mesh
}
