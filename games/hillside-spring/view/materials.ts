import * as THREE from 'three'

// Two ways of lighting, on purpose (R12). Painted scenery is unlit: its light
// is in the painting. Things that move or can be touched (bamboo, gates, the
// wheel, crops, creatures) get a half-Lambert term banded into two soft cel
// tones plus a dark rim, the way hand-drawn animation sits characters on a
// painted background. That split is also the clarity fix for this style:
// the touchable pieces are crisper and higher-contrast than the soft,
// textured hillside behind them.

export const SUN_DIR = new THREE.Vector3(-0.6, 0.72, 0.38).normalize()
export const SUN = new THREE.Color(1.0, 0.93, 0.78)
export const SHADE = new THREE.Color(0.66, 0.7, 0.84)
export const INK = new THREE.Color(0.16, 0.1, 0.08)
export const HAZE = new THREE.Color('#cfe0e4')

export const shared = {
  time: { value: 0 },
  wind: { value: 1 },
}

export function paintedMaterial(atlas: THREE.Texture): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true })
}

/** Unlit painted cards (grass, trees, bushes) that sway from the root in a slow breeze. */
export function foliageMaterial(atlas: THREE.Texture): THREE.MeshBasicMaterial {
  const material = new THREE.MeshBasicMaterial({ map: atlas, vertexColors: true, alphaTest: 0.5, side: THREE.DoubleSide })
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = shared.time
    shader.uniforms.uWind = shared.wind
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aSway;\nuniform float uTime;\nuniform float uWind;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nfloat gust = sin(uTime * 1.1 + position.x * 0.9 + position.z * 0.6) * 0.6 + sin(uTime * 2.3 + position.x * 2.1) * 0.4;\ntransformed.x += gust * 0.045 * aSway * uWind;\ntransformed.z += gust * 0.015 * aSway * uWind;',
      )
  }
  return material
}

const CEL_VERTEX = /* glsl */ `
attribute vec3 color;
varying vec2 vUv;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vUv = uv;
  vColor = color;
#ifdef USE_INSTANCING_COLOR
  vColor *= instanceColor;
#endif
  mat4 m = modelMatrix;
#ifdef USE_INSTANCING
  m = modelMatrix * instanceMatrix;
#endif
  vec4 world = m * vec4(position, 1.0);
  vNormal = normalize(mat3(m) * normal);
  vView = cameraPosition - world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`

const CEL_FRAGMENT = /* glsl */ `
uniform sampler2D map;
uniform vec3 uSunDir;
uniform vec3 uSun;
uniform vec3 uShade;
uniform vec3 uInk;
uniform float uOutline;
uniform float uLift;
varying vec2 vUv;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vView;
void main() {
#ifdef HAS_MAP
  vec3 albedo = texture2D(map, vUv).rgb * vColor;
#else
  vec3 albedo = vColor;
#endif
  vec3 n = normalize(vNormal);
  float hl = dot(n, uSunDir) * 0.5 + 0.5;
  hl *= hl;
  float band = smoothstep(0.3, 0.46, hl);
  vec3 light = mix(uShade, uSun, band) + vec3(0.12) * (hl - 0.5);
  vec3 col = albedo * light * (1.0 + uLift);
  float facing = max(dot(n, normalize(vView)), 0.0);
  col = mix(col, uInk, smoothstep(0.24, 0.06, facing) * uOutline);
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}
`

export type CelOptions = { outline?: number; map?: THREE.Texture; lift?: number }

/** Half-Lambert, banded into two soft cel tones, with a dark rim for a hand-inked silhouette. Without a map, vertex colour is the albedo. */
export function celMaterial({ outline = 1, map, lift = 0 }: CelOptions = {}): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CEL_VERTEX,
    fragmentShader: CEL_FRAGMENT,
    defines: map ? { HAS_MAP: '' } : {},
    uniforms: {
      map: { value: map ?? null },
      uSunDir: { value: SUN_DIR },
      uSun: { value: SUN },
      uShade: { value: SHADE },
      uInk: { value: INK },
      uOutline: { value: outline },
      uLift: { value: lift },
    },
  })
}
