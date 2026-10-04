import { BufferAttribute, type BufferGeometry, Color, CylinderGeometry, Euler, Matrix4, Quaternion, SphereGeometry, Vector3 } from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// Every form of the look is a pillow: a sphere pulled into an ellipsoid, with
// its colour in the vertices and the number of welded panels beside it, which
// the vinyl material turns into seams. A toy is a handful of pillows merged
// into a few meshes, one per part that moves by itself.

export type Vec3 = readonly [number, number, number]

export type Pillow = {
  /** Centre, in the part's own space. */
  at: Vec3
  /** Half-sizes along x, y and z before turning. */
  size: Vec3
  /** Turn about x, y and z in radians, applied before placing. */
  turn?: Vec3
  colour: string
  /** Welded panels round the form: 0 for a smooth skin. The seams run from pole to pole along its own y axis. */
  panels?: number
  /** Segments round and along; small pillows need fewer. */
  detail?: readonly [number, number]
  /** How far it is lost in the haze of distance, 0 to 1: a part of the setting that stands far off, painted once. */
  haze?: number
}

const matrix = new Matrix4(), quaternion = new Quaternion(), euler = new Euler(), colour = new Color()

function finish(geometry: BufferGeometry, spec: { at: Vec3; turn?: Vec3; colour: string; panels?: number; haze?: number }, size: Vec3): BufferGeometry {
  const turn = spec.turn ?? [0, 0, 0]
  quaternion.setFromEuler(euler.set(turn[0], turn[1], turn[2]))
  matrix.compose(new Vector3(...spec.at), quaternion, new Vector3(...size))
  // Applying the matrix also carries the normals over correctly, so a squashed sphere is lit as an ellipsoid.
  geometry.applyMatrix4(matrix)
  const count = geometry.getAttribute('position').count
  const colours = new Float32Array(count * 3), panels = new Float32Array(count), haze = new Float32Array(count)
  colour.set(spec.colour)
  for (let i = 0; i < count; i++) {
    colours[i * 3] = colour.r; colours[i * 3 + 1] = colour.g; colours[i * 3 + 2] = colour.b
    panels[i] = spec.panels ?? 0
    haze[i] = spec.haze ?? 0
  }
  geometry.setAttribute('color', new BufferAttribute(colours, 3))
  geometry.setAttribute('panels', new BufferAttribute(panels, 1))
  geometry.setAttribute('haze', new BufferAttribute(haze, 1))
  return geometry
}

/** One pillow as a geometry. */
export function pillow(spec: Pillow): BufferGeometry {
  const [round, along] = spec.detail ?? [24, 16]
  return finish(new SphereGeometry(1, round, along), spec, spec.size)
}

/** A short capped cylinder along y: a valve, a stalk. */
export function peg(spec: { at: Vec3; radius: number; length: number; turn?: Vec3; colour: string; haze?: number }): BufferGeometry {
  return finish(new CylinderGeometry(1, 1, 1, 12, 1), spec, [spec.radius, spec.length, spec.radius])
}

/** Several pillows as one geometry, so a part is one draw. */
export function pillows(specs: readonly Pillow[], extra: readonly BufferGeometry[] = []): BufferGeometry {
  const parts = [...specs.map(pillow), ...extra]
  const merged = mergeGeometries(parts, false)
  for (const part of parts) part.dispose()
  return merged
}
