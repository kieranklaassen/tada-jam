import * as THREE from 'three'

// The mouth in the bumper: a flat plate on the vehicle's nose, drawn by its
// own small shader as cream enamel with a mouth in it. The mouth is a lens between
// two curves, so it can smile, turn down, open round, show its teeth and put
// its tongue out, all from four numbers. Nothing covers it: like the eyes,
// a mouth always shows.

const VERTEX = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv * 2.0 - 1.0;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const FRAGMENT = /* glsl */ `
uniform float uSmile;
uniform float uOpen;
uniform float uTongue;
uniform float uSkew;
varying vec2 vUv;
void main() {
  // The plate: polished zinc, lighter to the top, with a dark rim.
  // The plate: cream enamel, lighter to the top, with a zinc rim. Pale, so the mouth reads from across a room.
  vec3 zinc = vec3(0.99, 0.95, 0.84) * (0.8 + 0.2 * smoothstep(-1.0, 1.0, vUv.y));
  zinc += 0.1 * (1.0 - smoothstep(0.0, 0.1, abs(vUv.y - 0.7)));
  float rim = smoothstep(0.84, 0.95, max(abs(vUv.x), abs(vUv.y)));
  vec3 col = mix(zinc, vec3(0.62, 0.65, 0.69), rim);
  // The mouth spans most of the plate. Its middle line bends with the smile; a skew lifts one corner for a smirk.
  float x = vUv.x / 0.74;
  float within = max(0.0, 1.0 - x * x);
  float mid = -uSmile * 0.5 * within + uSmile * 0.22 + uSkew * 0.22 * x - 0.05;
  float halfOpen = (0.13 + uOpen * 0.5) * sqrt(within);
  float edge = abs(vUv.y - mid) - halfOpen;
  float mouth = (1.0 - smoothstep(-0.03, 0.03, edge)) * step(abs(x), 1.0);
  col = mix(col, vec3(0.17, 0.05, 0.07), mouth);
  // Teeth under the upper lip once it is open enough.
  float teeth = mouth * smoothstep(0.22, 0.4, uOpen) * step(mid + halfOpen - 0.17, vUv.y);
  col = mix(col, vec3(0.99, 0.98, 0.94), teeth);
  // The tongue lies in the bottom of an open mouth, and hangs out below it when it is out.
  vec2 t = vec2(vUv.x - 0.08, vUv.y - (mid - halfOpen * 0.5 - uTongue * 0.34));
  float tongue = 1.0 - smoothstep(0.85, 1.0, length(t / vec2(0.3, 0.2 + uTongue * 0.2)));
  tongue *= max(mouth * smoothstep(0.25, 0.5, uOpen), uTongue * step(vUv.y, mid + 0.02));
  col = mix(col, vec3(0.96, 0.4, 0.47) * (0.85 + 0.15 * smoothstep(-0.2, 0.2, t.x)), tongue);
  // The lips: a dark line round the opening.
  float lip = (1.0 - smoothstep(0.0, 0.055, abs(edge))) * step(abs(x), 1.03) * (1.0 - tongue);
  col = mix(col, vec3(0.2, 0.07, 0.08), lip * 0.85);
  gl_FragColor = vec4(col, 1.0);
}
`

export function mouthMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: { uSmile: { value: 0.3 }, uOpen: { value: 0 }, uTongue: { value: 0 }, uSkew: { value: 0 } },
  })
}
