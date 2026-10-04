import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { REGIONS, paintAtlas, uvOf, type Region } from './atlas'
import { WALL_ROWS, cupProfile, dishOf, fillLevel, saucerProfile, wallRowAt, type Bowl, type CupSize, type ProfilePoint } from './forms'
import { COBALT, GILT, TEA, paintMatcap } from './glaze'

// The pottery as meshes. Every glazed piece is a profile turned on a lathe and
// drawn with one material: a matcap for the tin glaze, the brushwork atlas as
// its map, and vertex colours for a ring, a gilt lip or a warm knob. Geometry
// is built once and shared; the look is in this file and atlas.ts, and the
// numbers of every form are in forms.ts.

/** How many slices a lathe turns a form into, by quality tier: the lowest tier is still round. */
export const TURN_SEGMENTS = [40, 32, 24, 20] as const

export type Kit = {
  /** Fired and glazed: everything made of pottery. */
  glaze: THREE.MeshMatcapMaterial
  /** Unglazed and soft: the sponge. */
  matte: THREE.MeshMatcapMaterial
  /** The tea, in a cup, in a saucer, falling and on the cloth. */
  tea: THREE.MeshBasicMaterial
  teaSkin: THREE.MeshBasicMaterial
  dispose(): void
}

/** Keeps the hot spot of the matcap white over whatever is painted under the glaze, as a fired glaze does. */
function glazed(material: THREE.MeshMatcapMaterial): THREE.MeshMatcapMaterial {
  material.onBeforeCompile = (shader) => {
    shader.fragmentShader = shader.fragmentShader.replace(
      'vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;',
      'float hot = smoothstep( 0.86, 0.99, min( matcapColor.r, min( matcapColor.g, matcapColor.b ) ) );\n\tvec3 outgoingLight = mix( diffuseColor.rgb * matcapColor.rgb, vec3( 1.0 ), hot );',
    )
  }
  return material
}

function textureOf(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/** The surface of tea seen from above: amber, darker where it meets the wall, with the window lying on it. */
function paintTeaSkin(doc: Document): HTMLCanvasElement {
  const canvas = doc.createElement('canvas')
  canvas.width = canvas.height = 128
  const ctx = canvas.getContext('2d')!
  const body = ctx.createRadialGradient(58, 54, 6, 64, 64, 64)
  body.addColorStop(0, '#d98a34')
  body.addColorStop(0.7, TEA)
  body.addColorStop(1, '#8c4a12')
  ctx.fillStyle = body
  ctx.fillRect(0, 0, 128, 128)
  ctx.fillStyle = 'rgba(255, 246, 225, 0.75)'
  ctx.beginPath()
  ctx.ellipse(44, 40, 15, 6, -0.6, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}

export function makeKit(doc: Document): Kit {
  const atlas = textureOf(paintAtlas(doc))
  const glazeCap = textureOf(paintMatcap(doc, '#eef1f6', '#8d9dbb', 1))
  const matteCap = textureOf(paintMatcap(doc, '#e9e2d2', '#a79a84', 0.12))
  const skin = textureOf(paintTeaSkin(doc))
  const glaze = glazed(new THREE.MeshMatcapMaterial({ matcap: glazeCap, map: atlas, vertexColors: true }))
  const matte = new THREE.MeshMatcapMaterial({ matcap: matteCap, vertexColors: true })
  const tea = new THREE.MeshBasicMaterial({ color: TEA })
  const teaSkin = new THREE.MeshBasicMaterial({ map: skin })
  return {
    glaze, matte, tea, teaSkin,
    dispose() {
      for (const texture of [atlas, glazeCap, matteCap, skin]) texture.dispose()
      for (const material of [glaze, matte, tea, teaSkin]) material.dispose()
    },
  }
}

/** The atlas carries the glaze's own white, so a vertex that adds nothing is pure white. */
const WHITE = new THREE.Color(1, 1, 1)
export const INK = new THREE.Color(COBALT)
export const GOLD = new THREE.Color(GILT)
const PLAIN = uvOf(REGIONS.plain, 0.5, 0.5)

export type Paint = {
  /** The colour of a profile point, by its index; white where it gives nothing. */
  color?: (index: number) => THREE.Color | null
  /** The atlas region a stretch of the profile is painted from, by height: `from` and `to` are profile indices. */
  region?: { area: Region; from: number; to: number }
}

/** Turns a profile on the lathe. The seam is at the back, so a painted front is whole. */
export function turn(points: readonly ProfilePoint[], segments: number, paint: Paint = {}): THREE.BufferGeometry {
  const geometry = new THREE.LatheGeometry(points.map((p) => new THREE.Vector2(Math.max(p.r, 1e-4), p.y)), segments, Math.PI)
  const count = points.length
  const uv = geometry.attributes.uv as THREE.BufferAttribute
  const colors = new Float32Array(uv.count * 3)
  const region = paint.region
  const ends = region ? [points[region.from].y, points[region.to].y] : [0, 1]
  const low = Math.min(ends[0], ends[1]), high = Math.max(ends[0], ends[1])
  for (let i = 0; i <= segments; i++) {
    for (let j = 0; j < count; j++) {
      const at = i * count + j
      const color = paint.color?.(j) ?? WHITE
      color.toArray(colors, at * 3)
      if (region) {
        // Every row of a painted form stays inside its region, the rows beyond the painted stretch at its bare top or
        // bottom edge: a face that ran from the region to the plain patch would drag every painting between them across it.
        const [u, v] = uvOf(region.area, i / segments, Math.min(1, Math.max(0, (points[j].y - low) / Math.max(1e-6, high - low))))
        uv.setXY(at, u, v)
      } else uv.setXY(at, PLAIN[0], PLAIN[1])
    }
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.computeVertexNormals()
  return geometry
}

/** Gives a whole geometry one colour and no brushwork, so it can be merged into a glazed piece. */
export function plain(geometry: THREE.BufferGeometry, color: THREE.Color = WHITE): THREE.BufferGeometry {
  const count = geometry.attributes.position.count
  const colors = new Float32Array(count * 3), uv = new Float32Array(count * 2)
  for (let i = 0; i < count; i++) {
    color.toArray(colors, i * 3)
    uv[i * 2] = PLAIN[0]
    uv[i * 2 + 1] = PLAIN[1]
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
  return geometry
}

export function merged(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const geometry = mergeGeometries(parts.map((part) => (part.index ? part.toNonIndexed() : part)))
  for (const part of parts) part.dispose()
  return geometry
}

/**
 * A cup: plain white inside, a gilt lip (it can be touched), an ear, and at
 * most one cobalt ring painted round the inside at the height `ring` cupfuls
 * of tea reach. Nothing else is inside it: the tea is what the child reads.
 */
export function cupGeometry(bowl: Bowl, ring: number | null, segments: number): THREE.BufferGeometry {
  const { points, insideFrom } = cupProfile(bowl)
  const ringRow = ring === null ? -1 : insideFrom + Math.min(WALL_ROWS - 1, Math.max(1, wallRowAt(fillLevel(bowl, ring))))
  const body = turn(points, segments, {
    color: (j) => (j === insideFrom - 1 || j === insideFrom ? GOLD : j === ringRow || j === ringRow - 1 ? INK : null),
  })
  const k = bowl.rimR / 0.6
  const ear = plain(new THREE.TorusGeometry(0.19 * k, 0.045 * k, 8, 14, Math.PI * 1.25))
  // The ear is on the child's side, clear of the pot beside the cup and of the cup's neighbours.
  ear.rotateZ(-Math.PI * 0.62)
  ear.rotateY(-Math.PI / 2)
  ear.translate(0, bowl.rimY * 0.56, bowl.rimR * 0.93)
  return merged([body, ear])
}

/** A saucer, with dabs of cobalt round its rim and a gilt edge. */
export function saucerGeometry(size: CupSize, segments: number): THREE.BufferGeometry {
  const points = saucerProfile(dishOf(size))
  // The rim is the eleventh point from the end; after it the profile runs back in over the top face.
  const rim = points.length - 11
  return turn(points, segments, {
    color: (j) => (j === rim || j === rim - 1 ? GOLD : null),
    region: { area: REGIONS.saucer, from: rim + 1, to: points.length - 2 },
  })
}

/** The surface of the tea in a cup: a flat disc the view scales and lifts to where the model says the tea stands. */
export function teaDiscGeometry(segments: number): THREE.BufferGeometry {
  const disc = new THREE.CircleGeometry(1, segments)
  disc.rotateX(-Math.PI / 2)
  return disc
}

/** The pool in a saucer: a flat ring round the cup's foot, scaled outward as the saucer fills. */
export function poolGeometry(segments: number): THREE.BufferGeometry {
  const ring = new THREE.RingGeometry(0.34, 1, segments)
  ring.rotateX(-Math.PI / 2)
  return ring
}
