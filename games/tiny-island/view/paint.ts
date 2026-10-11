import * as THREE from 'three'

// The one paint of the look: milk paint on wood. Flat colour from the corner
// colours of the mesh, lit by a warm key and filled with a cool lilac instead
// of going dark, a warm rim from the sun behind, the hard edges worn pale,
// and a faint chalky unevenness. Faces marked as water glint one by one.
// Colours are authored as they are shown: the renderer writes them unchanged.

export type Paint = THREE.ShaderMaterial

const VERTEX = /* glsl */ `
attribute vec3 wear;
attribute float phase;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWear;
varying vec3 vWorld;
varying float vPhase;
void main() {
  vec4 local = vec4(position, 1.0);
  vec3 n = normal;
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
    n = mat3(instanceMatrix) * n;
  #endif
  vec4 world = modelMatrix * local;
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * n);
  vColor = color;
  #ifdef USE_INSTANCING_COLOR
    vColor *= instanceColor;
  #endif
  vWear = wear;
  vPhase = phase;
  gl_Position = projectionMatrix * viewMatrix * world;
}`

const FRAGMENT = /* glsl */ `
uniform vec3 uSun;
uniform vec3 uBehind;
uniform vec3 uLight;
uniform vec3 uShade;
uniform vec3 uRim;
uniform vec3 uPale;
uniform float uTime;
uniform float uGlint;
uniform float uWorn;
uniform vec3 uGlow;
varying vec3 vColor;
varying vec3 vNormal;
varying vec3 vWear;
varying vec3 vWorld;
varying float vPhase;
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
void main() {
  vec3 n = normalize(vNormal);
  vec3 toEye = normalize(cameraPosition - vWorld);
  // Half the light wraps round, so the shaded side is lilac and never dark.
  float lit = dot(n, uSun) * 0.5 + 0.5;
  vec3 paint = vColor;
  // Chalk: the paint is a little uneven from grain to grain.
  paint *= 0.975 + 0.05 * hash(floor(vWorld * 26.0));
  vec3 color = paint * mix(uShade, uLight, lit * lit * (3.0 - 2.0 * lit));
  // The sun stands behind the island: edges turned away from the eye and toward it catch a warm line.
  float edge = pow(1.0 - max(dot(n, toEye), 0.0), 2.5);
  color += uRim * edge * smoothstep(-0.25, 0.7, dot(n, uBehind)) * 0.6;
  // Hard edges are rubbed back to the pale wood, unevenly.
  float near = min(min(vWear.x, vWear.y), vWear.z);
  float rubbed = 1.0 - smoothstep(0.012, 0.05 + 0.03 * hash(floor(vWorld * 9.0)), near);
  color = mix(color, uPale, rubbed * 0.62 * uWorn);
  // Water: each facet brightens in its own time, and now and then one flashes.
  float wet = step(0.001, vPhase);
  color += wet * uGlint * (0.03 * sin(uTime * 0.8 + vPhase * 40.0) + 0.16 * pow(max(sin(uTime * 0.45 + vPhase * 90.0), 0.0), 160.0));
  gl_FragColor = vec4(color + uGlow, 1.0);
}`

/** The paint, and the values every copy of it shares: one clock, one sun. */
export function makePaint(): Paint {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    vertexColors: true,
    uniforms: {
      uSun: { value: new THREE.Vector3(-0.35, 0.8, 0.5).normalize() },
      uBehind: { value: new THREE.Vector3(-0.25, 0.35, -0.9).normalize() },
      uLight: { value: new THREE.Color(1.07, 1.03, 0.97) },
      uShade: { value: new THREE.Color(0.76, 0.79, 0.95) },
      uRim: { value: new THREE.Color(1.0, 0.82, 0.58) },
      uPale: { value: new THREE.Color(1.0, 0.975, 0.93) },
      uTime: { value: 0 },
      uGlint: { value: 1 },
      uWorn: { value: 1 },
      uGlow: { value: new THREE.Color(0, 0, 0) },
    },
  })
}

/**
 * A copy of the paint with a glow of its own (the lamp, the lit toy). It compiles to the same program and reads
 * the same clock and sun as the first.
 */
export function ownGlow(paint: Paint): Paint {
  const copy = paint.clone()
  for (const name of Object.keys(paint.uniforms)) if (name !== 'uGlow') copy.uniforms[name] = paint.uniforms[name]
  return copy
}

/** A flat, see-through colour for what is not painted wood: shadows, rings on the water, the lamp's beam. */
export function film(color: readonly [number, number, number], opacity: number, adds = false): THREE.MeshBasicMaterial {
  // The colour is given as it is shown, so it is set as plain numbers and not read as a web colour.
  return new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(color[0], color[1], color[2]), transparent: true, opacity, depthWrite: false, blending: adds ? THREE.AdditiveBlending : THREE.NormalBlending, side: THREE.DoubleSide })
}
