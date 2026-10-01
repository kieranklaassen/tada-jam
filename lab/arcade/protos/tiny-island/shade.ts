// One small shader for everything on the island: flat low-poly facets (the
// normal comes from screen-space derivatives, so no normals are stored), a soft
// sky-and-bounce fill, one key light, a warm rim from the sun behind, a faint
// wood grain under the paint, window glow after dusk, and the lighthouse beam.
// Colours are plain display values: nothing here goes through colour management.

import * as THREE from 'three'

export interface Shared {
  uTime: { value: number }
  uSky: { value: THREE.Vector3 }
  uGround: { value: THREE.Vector3 }
  uKeyDir: { value: THREE.Vector3 }
  uKey: { value: THREE.Vector3 }
  uRimDir: { value: THREE.Vector3 }
  uRim: { value: THREE.Vector3 }
  uNight: { value: number }
  uGlowCol: { value: THREE.Vector3 }
  uBeamPos: { value: THREE.Vector3 }
  uBeamAng: { value: number }
  uBeamOn: { value: number }
  uHaze: { value: THREE.Vector3 }
  // Up to four warm pools of light by the doors after dusk: xyz world, w strength.
  uLamps: { value: THREE.Vector4[] }
}

export function sharedUniforms(): Shared {
  return {
    uTime: { value: 0 },
    uSky: { value: new THREE.Vector3(0.7, 0.74, 0.8) },
    uGround: { value: new THREE.Vector3(0.62, 0.54, 0.5) },
    uKeyDir: { value: new THREE.Vector3(-0.45, 0.75, 0.5).normalize() },
    uKey: { value: new THREE.Vector3(0.42, 0.38, 0.32) },
    uRimDir: { value: new THREE.Vector3(0.6, 0.35, -0.7).normalize() },
    uRim: { value: new THREE.Vector3(0.3, 0.2, 0.13) },
    uNight: { value: 0 },
    uGlowCol: { value: new THREE.Vector3(1.0, 0.84, 0.5) },
    uBeamPos: { value: new THREE.Vector3() },
    uBeamAng: { value: 0 },
    uBeamOn: { value: 0 },
    uHaze: { value: new THREE.Vector3(1, 0.93, 0.85) },
    uLamps: { value: [new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4(), new THREE.Vector4()] },
  }
}

const VERT = /* glsl */ `
attribute vec3 aColor;
attribute float aGlow;
uniform float uTime;
uniform float uSea;
uniform float uFar;
varying vec3 vColor;
varying float vGlow;
varying vec3 vWorld;
varying vec3 vLocal;
void main() {
  vColor = aColor;
  vGlow = aGlow;
  vLocal = position;
  vec4 lp = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    lp = instanceMatrix * lp;
  #endif
  vec4 wp = modelMatrix * lp;
  if (uSea > 0.5) {
    float calm = smoothstep(uFar, uFar + 3.0, wp.z);
    float w = sin(wp.x * 1.7 + uTime * 0.7) * 0.5 + sin(wp.z * 2.1 - uTime * 0.55 + wp.x * 0.6) * 0.5;
    wp.y += w * 0.05 * calm;
  }
  vWorld = wp.xyz;
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`

const FRAG = /* glsl */ `
uniform vec3 uSky;
uniform vec3 uGround;
uniform vec3 uKeyDir;
uniform vec3 uKey;
uniform vec3 uRimDir;
uniform vec3 uRim;
uniform vec3 uGlowCol;
uniform vec3 uBeamPos;
uniform vec3 uHaze;
uniform vec4 uLamps[4];
uniform float uNight;
uniform float uBeamAng;
uniform float uBeamOn;
uniform float uSea;
uniform float uGrain;
uniform float uFar;
varying vec3 vColor;
varying float vGlow;
varying vec3 vWorld;
varying vec3 vLocal;
void main() {
  vec3 N = normalize(cross(dFdx(vWorld), dFdy(vWorld)));
  vec3 V = normalize(cameraPosition - vWorld);
  if (dot(N, V) < 0.0) N = -N;
  // Calm water is nearly flat; lean its facets so they still catch the light.
  if (uSea > 0.5) N = normalize(N + (N - vec3(0.0, 1.0, 0.0)) * 3.5);

  // Wood grain under the paint: fine lines that run along the piece and wander a little.
  // A glow below zero marks earth and leaves, which have none.
  vec3 base = vColor;
  float wood = vGlow < -0.5 ? 0.0 : uGrain;
  float g = sin(vLocal.z * 46.0 + vLocal.y * 38.0 + sin(vLocal.x * 3.1 + vLocal.y * 2.0) * 2.2);
  base *= 1.0 + wood * 0.035 * g;

  vec3 hemi = mix(uGround, uSky, N.y * 0.5 + 0.5);
  float nl = max(dot(N, uKeyDir) * 0.8 + 0.2, 0.0);
  vec3 col = base * (hemi + uKey * nl);

  float fres = pow(1.0 - max(dot(N, V), 0.0), 1.2);
  float back = smoothstep(-0.3, 0.7, dot(N, uRimDir));
  col += uRim * fres * back * (0.35 + 0.65 * base);

  if (uBeamOn > 0.001) {
    vec2 d = vWorld.xz - uBeamPos.xz;
    float dist = length(d);
    float ang = atan(d.y, d.x);
    float diff = abs(mod(ang - uBeamAng + 3.14159265, 6.2831853) - 3.14159265);
    float cone = exp(-diff * diff * 16.0) * smoothstep(0.5, 1.8, dist) * (1.0 - smoothstep(7.0, 13.0, dist));
    float below = 1.0 - smoothstep(uBeamPos.y - 0.5, uBeamPos.y + 0.2, vWorld.y);
    col += (0.25 + 0.75 * base) * vec3(1.0, 0.84, 0.56) * cone * below * uBeamOn * 0.26;
  }

  for (int i = 0; i < 4; i++) {
    if (uLamps[i].w > 0.001) {
      vec3 d = vWorld - uLamps[i].xyz;
      float fall = exp(-dot(d, d) * 1.1);
      col += (0.2 + 0.8 * base) * vec3(1.0, 0.72, 0.4) * fall * uLamps[i].w;
    }
  }

  col = mix(col, uGlowCol, max(vGlow, 0.0) * uNight);

  if (uSea > 0.5) {
    // The far water pales into the haze at the horizon.
    float far = 1.0 - smoothstep(uFar, uFar + 4.5, vWorld.z);
    col = mix(col, uHaze, far * 0.6);
  }
  gl_FragColor = vec4(col, 1.0);
}
`

export function toyMaterial(shared: Shared, kind: 'toy' | 'sea' | 'plain', far = -10): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      ...shared,
      uSea: { value: kind === 'sea' ? 1 : 0 },
      uGrain: { value: kind === 'toy' ? 1 : 0 },
      uFar: { value: far },
    },
    vertexShader: VERT,
    fragmentShader: FRAG,
    side: THREE.DoubleSide,
  })
}
