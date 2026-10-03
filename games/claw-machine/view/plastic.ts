import { BufferAttribute, BufferGeometry, ShaderMaterial, Vector3 } from 'three'
import { buildMesh, type Brick, type Rgb } from '../bricks'

// Moulded plastic: one material for every brick in the world. The colour is
// in the vertices, so a whole build is one draw. The light is fixed to the
// camera, as a matcap would be, with a hard white gloss and a soft sheen from
// a window above; the seam where two bricks meet is drawn at the edge of each
// face from the face's own size. No texture, no light and no shadow map.

const VERTEX = /* glsl */ `
attribute vec3 brickColor;
attribute vec4 face;
varying vec3 vColor;
varying vec4 vFace;
varying vec3 vNormal;
varying vec3 vView;
varying float vUp;
void main() {
  vColor = brickColor;
  vFace = face;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = view.xyz;
  vUp = normalize(mat3(modelMatrix) * normal).y;
  gl_Position = projectionMatrix * view;
}`

const FRAGMENT = /* glsl */ `
precision highp float;
uniform vec3 uKey;
uniform float uSeams;
uniform float uTint;
uniform vec3 uTintColor;
uniform float uOpacity;
varying vec3 vColor;
varying vec4 vFace;
varying vec3 vNormal;
varying vec3 vView;
varying float vUp;
void main() {
  vec3 n = normalize(vNormal);
  vec3 toEye = normalize(-vView);
  float lambert = max(dot(n, uKey), 0.0);
  // Plastic keeps its colour in the shade: the dark side is the same hue, a little deeper.
  float shade = 0.62 + 0.38 * lambert + 0.10 * vUp;
  vec3 base = vColor * shade;
  // The seam: a thin dark line at the edge of every brick face, and a lighter bevel just inside it.
  float edge = min(min(vFace.x, vFace.z - vFace.x), min(vFace.y, vFace.w - vFace.y));
  float seam = (1.0 - smoothstep(0.012, 0.045, edge)) * uSeams;
  float bevel = smoothstep(0.03, 0.06, edge) * (1.0 - smoothstep(0.06, 0.12, edge)) * uSeams;
  base *= 1.0 - 0.42 * seam;
  base += 0.05 * bevel;
  // Hard gloss: a small white highlight, and a broad pale sheen where the surface mirrors the light above.
  vec3 halfway = normalize(uKey + toEye);
  float gloss = pow(max(dot(n, halfway), 0.0), 90.0);
  vec3 mirrored = reflect(-toEye, n);
  float sheen = smoothstep(0.55, 0.98, dot(mirrored, uKey));
  vec3 lit = base + vec3(0.85) * gloss + vec3(0.16) * sheen;
  lit = mix(lit, uTintColor, uTint);
  gl_FragColor = vec4(lit, uOpacity);
}`

/** The light, fixed to the camera: from above, a little to the left and toward the eye. */
const KEY = new Vector3(-0.35, 0.78, 0.52).normalize()

export function plasticMaterial(seams = true): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uKey: { value: KEY },
      uSeams: { value: seams ? 1 : 0 },
      uTint: { value: 0 },
      uTintColor: { value: new Vector3(1, 1, 1) },
      uOpacity: { value: 1 },
    },
  })
}

/** A build as one geometry. */
export function brickGeometry(bricks: readonly Brick[], withBottoms = false): BufferGeometry {
  const mesh = buildMesh(bricks, withBottoms)
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(mesh.position, 3))
  geometry.setAttribute('normal', new BufferAttribute(mesh.normal, 3))
  geometry.setAttribute('brickColor', new BufferAttribute(mesh.color, 3))
  geometry.setAttribute('face', new BufferAttribute(mesh.face, 4))
  geometry.setIndex(new BufferAttribute(mesh.index, 1))
  geometry.computeBoundingSphere()
  geometry.computeBoundingBox()
  return geometry
}

/** Gives a round part made by three.js what the plastic needs: one colour all over and no seam. */
export function plain(geometry: BufferGeometry, colour: Rgb): BufferGeometry {
  const count = geometry.getAttribute('position').count
  const color = new Float32Array(count * 3), face = new Float32Array(count * 4)
  for (let i = 0; i < count; i++) {
    color.set(colour, i * 3)
    face.set([500, 500, 1000, 1000], i * 4)
  }
  geometry.setAttribute('brickColor', new BufferAttribute(color, 3))
  geometry.setAttribute('face', new BufferAttribute(face, 4))
  return geometry
}
