import * as THREE from 'three'
import { CREATURE_KINDS, HAT_KINDS, MOST, type CreatureKind, type HatKind } from '../kinds'
import { ROW_Z, holeX, spotX } from '../stage'
import { ARCH, CREATURE_DEPTH, HAND, SLAB, TILE_DEPTH } from '../sizes'
import { disc, laidFlat, merged, paint, roundedRect, slab } from './foam'
import { archOutline, creatureCut, earOutline, hatOutline, holeBase, matTileOutline, tileWidth, type Cut } from './shapes'

// The pieces of the scene, each built once from its outline. The colours are
// the look's palette (ART.md, "The look"): flat foam primaries, with the hats
// and their tile on a floor of a hue no piece uses.

export const PALETTE = {
  wall: '#f6efe2',
  room: '#eadfcd',
  matA: '#27a99a',
  matB: '#2fb8a8',
  spot: '#63d2c3',
  furniture: '#f6f1e4',
  white: '#fbfaf5',
  dot: '#22252e',
  shadow: '#0c4f48',
  glow: '#ff9a1f',
} as const

export const HAT_COLOUR: Record<HatKind, string> = { cone: '#e3382c', dome: '#2d6fe0', brim: '#f7c41d' }
export const CREATURE_COLOUR: Record<CreatureKind, string> = { bop: '#f58a1f', lanky: '#8b52d4', flop: '#f0609f', wig: '#a9d83c', pip: '#4b4f5c' }

/** The mat: columns by rows of jigsaw tiles `MAT_TILE` across, in two tones, its top at y = 0. */
export const MAT_TILE = 4.7
export const MAT_COLUMNS = 7
export const MAT_ROWS = 4
/** Where the mat's back left corner lies. */
export const MAT_LEFT = -14.9
export const MAT_BACK = -6.4

/** How wide a round spot of the row is, from its middle to its edge. */
export const SPOT_RADIUS = 1.3

export function buildMat(): THREE.BufferGeometry {
  const tiles: THREE.BufferGeometry[] = []
  for (let i = 0; i < MAT_COLUMNS; i++) for (let j = 0; j < MAT_ROWS; j++) {
    tiles.push(slab(matTileOutline(i, j, MAT_TILE), SLAB, (i + j) % 2 === 0 ? PALETTE.matA : PALETTE.matB, 4, false))
  }
  // Drawn with y towards the back wall and the mat's front left corner at the origin, then laid down and moved into place.
  const mat = laidFlat(merged(tiles))
  mat.translate(MAT_LEFT, -SLAB / 2, MAT_BACK + MAT_ROWS * MAT_TILE)
  // The five round spots of the row: discs of a lighter tone inlaid in the mat, flush with it, where a creature stands and a loose hat rests beside.
  const spots = Array.from({ length: MOST }, (_, spot) => paint(new THREE.CircleGeometry(SPOT_RADIUS, 40).rotateX(-Math.PI / 2).translate(spotX(spot), 0.006, ROW_Z + 0.25), PALETTE.spot))
  return merged([mat, ...spots])
}

/** The room the mat lies in: a pale floor and a pale wall, plain so the foam is all there is to look at. */
export function buildRoom(): THREE.BufferGeometry {
  const floor = paint(new THREE.PlaneGeometry(120, 80).rotateX(-Math.PI / 2).translate(0, -SLAB, 0), PALETTE.room)
  const wall = paint(new THREE.PlaneGeometry(120, 40).translate(0, 20 - SLAB, MAT_BACK - 4.5), PALETTE.wall)
  return merged([floor, wall])
}

/** The arch, standing on the origin: the view puts it at the mat's edge, and it squashes about its own feet. */
export function buildArch(): THREE.BufferGeometry {
  return slab(archOutline(), ARCH.depth, PALETTE.furniture)
}

/** The hat tile for this cycle: a slab with one hole for each hat, lying on the mat. The mat shows through an empty hole. */
export function buildTile(hats: readonly HatKind[]): THREE.BufferGeometry {
  const width = tileWidth(hats.length)
  const shape = roundedRect(-width / 2, -TILE_DEPTH / 2, width, TILE_DEPTH, 0.4)
  hats.forEach((kind, hole) => {
    const x = holeX(hole, hats.length), y = holeBase(kind)
    shape.holes.push(new THREE.Path(hatOutline(kind, 0.03).getPoints(10).map((p) => new THREE.Vector2(p.x + x, p.y + y))))
  })
  return laidFlat(slab(shape, SLAB, PALETTE.furniture)).translate(0, SLAB / 2, 0)
}

export type Pieces = {
  hats: Record<HatKind, THREE.BufferGeometry>
  bodies: Record<CreatureKind, THREE.BufferGeometry>
  cuts: Record<CreatureKind, Cut>
  ear: THREE.BufferGeometry
  hand: THREE.BufferGeometry
  dot: THREE.BufferGeometry
  blob: THREE.BufferGeometry
}

/** Every geometry a cycle can need, built once at mount: a hat of each kind and a body of each creature. */
export function buildPieces(): Pieces {
  const hats = {} as Pieces['hats'], bodies = {} as Pieces['bodies'], cuts = {} as Pieces['cuts']
  for (const kind of HAT_KINDS) hats[kind] = slab(hatOutline(kind), SLAB, HAT_COLOUR[kind])
  for (const kind of CREATURE_KINDS) {
    const cut = creatureCut(kind), colour = CREATURE_COLOUR[kind]
    const parts = [slab(cut.body, CREATURE_DEPTH, colour), ...cut.feet.map((foot) => slab(foot, CREATURE_DEPTH, colour))]
    // The whites of the eyes are thin slabs pressed onto the front; the pupils are drawn over them and move.
    for (const side of [-1, 1]) parts.push(slab(disc(cut.eyeSize, side * cut.eyeGap, cut.faceY), 0.16, PALETTE.white).translate(0, 0, CREATURE_DEPTH / 2))
    bodies[kind] = merged(parts)
    cuts[kind] = cut
  }
  return {
    hats, bodies, cuts,
    ear: slab(earOutline(), 0.3, CREATURE_COLOUR.flop),
    hand: slab(disc(HAND.radius), 0.34, '#ffffff'),
    dot: new THREE.CircleGeometry(1, 20),
    blob: new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
  }
}
