import { FILTER_HALF, LAMP_BODY, LAMP_LENS, MIRROR_HALF, onPanel, PANEL, PRISM_RADIUS, specOf, type PieceId, type Point } from './layout'
import { OpticsScene, type Source } from './optics'

// Turns what stands on the panel into optical elements. Pieces in the tray
// or held over the frame take no part; the view hands in displayed poses
// (mid-turn, mid-wobble), so beams sweep with the glass.

export type OpticPiece = { id: PieceId; x: number; y: number; angle: number; active: boolean }
export type OpticCreature = { x: number; y: number; r: number; absorbs: boolean }

export const PIECE_OWNER: Readonly<Record<PieceId, number>> = { lampA: 0, lampB: 1, prism: 2, mirror1: 3, mirror2: 4, filterR: 5, filterG: 6, filterB: 7 }

/** Fill `scene` and `sources` (both reused) from the table. Returns the number of sources written. */
export function buildScene(pieces: readonly OpticPiece[], creatures: readonly OpticCreature[], scene: OpticsScene, sources: Source[]): number {
  scene.clear()
  scene.bounds.minX = PANEL.minX
  scene.bounds.maxX = PANEL.maxX
  scene.bounds.minY = PANEL.minY
  scene.bounds.maxY = PANEL.maxY
  let sourceCount = 0
  for (const piece of pieces) {
    if (!piece.active || !onPanel(piece)) continue
    const spec = specOf(piece.id)
    switch (spec.kind) {
      case 'lamp': {
        scene.addCircle(piece.x, piece.y, LAMP_BODY, -1)
        const source = sources[sourceCount]
        if (!source) break
        source.x = piece.x + Math.cos(piece.angle) * LAMP_LENS
        source.y = piece.y + Math.sin(piece.angle) * LAMP_LENS
        source.angle = piece.angle
        source.mask = spec.mask
        sourceCount++
        break
      }
      case 'mirror':
        scene.addMirror(piece.x, piece.y, piece.angle, MIRROR_HALF)
        break
      case 'prism':
        scene.addPrism(piece.x, piece.y, piece.angle, PRISM_RADIUS, PIECE_OWNER[piece.id])
        break
      case 'filter':
        scene.addFilter(piece.x, piece.y, piece.angle, FILTER_HALF, spec.mask, PIECE_OWNER[piece.id])
        break
      default: {
        const never: never = spec.kind
        return never
      }
    }
  }
  creatures.forEach((creature, index) => {
    if (creature.absorbs) scene.addCircle(creature.x, creature.y, creature.r, index)
  })
  return sourceCount
}

export function makeSources(count: number): Source[] {
  return Array.from({ length: count }, () => ({ x: 0, y: 0, angle: 0, mask: 0 }))
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}
