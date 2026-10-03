import { RAIL, WHOLE } from './measure'
import { LANES, SHELF, inTin, onLane, onShelf, type Piece, type World } from './world'

// The stage: where everything on the page lies, in stage units, and what is
// under a point. The page is 1180 by 820 units, scaled whole to the surface
// and centred, so no pixel geometry is fixed anywhere else. Every length on
// the counter starts from one left edge at one scale, so lengths can be
// compared by eye across the lanes of the board and the rows of the shelf.
// Pure: no canvas, no DOM.

export type Point = { x: number; y: number }
export type Box = { x: number; y: number; w: number; h: number }

export const PAGE = { w: 1180, h: 820 } as const
/** Stage units a point of length takes: the rail, 2880 points, is 864 across. */
export const PX = 0.3
/** The left edge every length on the counter starts from. */
export const X0 = 96

/**
 * The panels of the page and the things on them. Above, the wall behind the stall under its awning: the
 * customer being served stands at the window on the left with its ticket, and the two who wait stand on the
 * right. Below, the counter from above: the tin on its rail, a bare strip to land a blade on, the board, the
 * shelf, and down the right-hand side the roller on its hook, the crate and the dog.
 */
export const WALL: Box = { x: 18, y: 18, w: 1144, h: 180 }
export const COUNTER: Box = { x: 18, y: 212, w: 1144, h: 590 }
/** The customer at the window, with its ticket: all of it answers a finger. */
export const WINDOW: Box = { x: 26, y: 28, w: 610, h: 164 }
/** The two who wait, each with its ticket. The second stops short of the top right corner, which is the grown-up's. */
export const QUEUE: readonly Box[] = [{ x: 660, y: 28, w: 236, h: 164 }, { x: 908, y: 28, w: 244, h: 164 }]
/** The rail the tin lies on: the lid, the body and the ruled strip under it, all from the same left edge as the board. */
export const RAIL_BOX: Box = { x: X0 - 12, y: 220, w: RAIL * PX + 24, h: 108 }
export const TIN = { lidY: 220, lidH: 38, bodyY: 258, bodyH: 52, pieceH: 42, rulerY: 312, rulerH: 16 } as const
export const BOARD: Box = { x: X0 - 16, y: 384, w: RAIL * PX + 32, h: 152 }
export const SHELF_BOX: Box = { x: X0 - 16, y: 552, w: RAIL * PX + 32, h: SHELF * 56 + 6 }
export const ROLLER: Box = { x: 1002, y: 222, w: 140, h: 104 }
export const CRATE: Box = { x: 1002, y: 384, w: 140, h: 152 }
/** Where the dog looks up over the edge of the counter: its head, as a box to touch. */
export const DOG: Box = { x: 1002, y: 600, w: 140, h: 140 }
/** A fruit on a lane or a row is this tall; the lane or row it lies in is taller, and all of that answers a finger. */
export const LANE_H = 56
export const ROW_H = 56
export const PIECE_H = { board: 48, shelf: 44, tin: TIN.pieceH } as const

/** The top of a lane of the board: lane 0 is the near one, lane 1 the far one, above it. */
export const laneTop = (lane: number): number => BOARD.y + BOARD.h - 12 - (lane + 1) * LANE_H - lane * 16
/** The top of a row of the shelf, 0 the oldest. */
export const rowTop = (slot: number): number => SHELF_BOX.y + 6 + slot * ROW_H

/** How the page sits in a surface: one scale, and the offset that centres it, in whole surface units. */
export type Fit = { k: number; ox: number; oy: number }

export function fit(width: number, height: number): Fit {
  const k = Math.max(0.0001, Math.min(width / PAGE.w, height / PAGE.h))
  return { k, ox: Math.round((width - PAGE.w * k) / 2), oy: Math.round((height - PAGE.h * k) / 2) }
}

/** A point of the surface, in stage units. */
export function toStage(at: Point, by: Fit): Point {
  return { x: (at.x - by.ox) / by.k, y: (at.y - by.oy) / by.k }
}

export const inside = (p: Point, box: Box): boolean => p.x >= box.x && p.x <= box.x + box.w && p.y >= box.y && p.y <= box.y + box.h

/** The tin at the window, as lengths on the rail: one compartment for most customers, two equal ones for the twins. */
export type TinShape = {
  /** Each compartment's left edge and width, in stage units. */
  parts: { x: number; w: number }[]
  /** The whole body, the lid behind it, and the strip under it that is ruled into the fruit's parts. */
  body: Box
  lid: Box
  ruler: Box
  /** Whether it has sprung open. A shut tin takes a piece anywhere along the rail, and then opens. */
  open: boolean
}

/** How wide the tin is while it is shut: folded up, it says nothing of how long the order is. */
export const SHUT_TIN = 104

/**
 * The shape of a tin whose compartments are these lengths, in points, and whose fruit is this long. Open, it
 * is exactly as long as the order. Shut, before the first piece is laid in it, it is folded small at the left
 * end of the rail and has no lid standing and no ruled strip: its true length is shown only when it springs open.
 */
export function tinShape(lengths: readonly number[], whole: number, open = true): TinShape {
  if (!open) {
    const body = { x: X0 - 8, y: TIN.bodyY, w: SHUT_TIN, h: TIN.bodyH }
    return { parts: [{ x: X0, w: SHUT_TIN - 16 }], body, lid: { ...body, y: TIN.bodyY, h: 0 }, ruler: { x: X0, y: TIN.rulerY, w: 0, h: 0 }, open: false }
  }
  let x = X0
  const parts = lengths.map((length) => {
    const part = { x, w: length * PX }
    x += part.w
    return part
  })
  const w = x - X0
  return {
    parts,
    body: { x: X0 - 8, y: TIN.bodyY, w: w + 16, h: TIN.bodyH },
    lid: { x: X0 - 8, y: TIN.lidY, w: w + 16, h: TIN.lidH },
    ruler: { x: X0, y: TIN.rulerY, w: Math.max(w, whole * PX), h: TIN.rulerH },
    open: true,
  }
}

/** Where a piece is drawn on the board or the shelf, or nothing for one that lies elsewhere. */
export function boxOf(piece: Piece): Box | null {
  const w = piece.length * PX
  if (piece.place.on === 'board') return { x: X0 + piece.place.x * PX, y: laneTop(piece.place.lane) + (LANE_H - PIECE_H.board) / 2, w, h: PIECE_H.board }
  if (piece.place.on === 'shelf') return { x: X0, y: rowTop(piece.place.slot) + (ROW_H - PIECE_H.shelf) / 2, w, h: PIECE_H.shelf }
  return null
}

/** Every piece that is drawn as a piece, with its box: the tin's from the left of each compartment, then the far lane, the near lane, and the shelf from the top. A piece inside a customer is not one of them. */
export function shown(world: World, tin: TinShape | null = null): { piece: Piece; box: Box }[] {
  const out: { piece: Piece; box: Box }[] = []
  if (tin) {
    // Each compartment's pieces lie end to end from its left edge. What sticks out of one compartment pushes what
    // lies in the next along, so nothing in a tin ever lies over anything else.
    let end = -Infinity
    tin.parts.forEach((part, index) => {
      let x = Math.max(part.x, end)
      for (const piece of inTin(world, index)) {
        out.push({ piece, box: { x, y: TIN.bodyY + (TIN.bodyH - TIN.pieceH) / 2, w: piece.length * PX, h: TIN.pieceH } })
        x += piece.length * PX
      }
      end = x
    })
  }
  for (let lane = LANES - 1; lane >= 0; lane--) for (const piece of onLane(world, lane)) out.push({ piece, box: boxOf(piece)! })
  for (const piece of onShelf(world)) out.push({ piece, box: boxOf(piece)! })
  return out
}

export type Under =
  | { thing: 'fruit' | 'piece'; piece: Piece; box: Box }
  /** The tin, and which compartment of it the point is over. */
  | { thing: 'tin'; part: number }
  /** One of the two who wait. */
  | { thing: 'waiting'; index: 0 | 1 }
  | { thing: 'customer' | 'roller' | 'crate' | 'dog' | 'board' | 'shelf' | 'wall' | 'counter' | 'nothing' }

/**
 * What is under a point of the stage. A piece answers over the whole height of its lane or row, which is
 * taller than it is drawn. `tin` is the tin at the window, when a customer stands there; `served` says whether
 * anyone stands at the window at all.
 */
export function under(world: World, p: Point, tin: TinShape | null = null, served = tin !== null): Under {
  for (const { piece, box } of shown(world, tin)) {
    const tall = piece.place.on === 'board' ? LANE_H : piece.place.on === 'shelf' ? ROW_H : TIN.bodyH
    if (p.x >= box.x && p.x <= box.x + box.w && Math.abs(p.y - (box.y + box.h / 2)) <= tall / 2) return { thing: piece.length === WHOLE[piece.fruit] ? 'fruit' : 'piece', piece, box }
  }
  if (tin && inside(p, RAIL_BOX)) {
    // Anywhere along the rail gives to the tin: the compartment under the point, or the nearest one.
    const at = tin.open ? tin.parts.findIndex((part) => p.x < part.x + part.w) : 0
    return { thing: 'tin', part: at < 0 ? tin.parts.length - 1 : at }
  }
  if (inside(p, ROLLER)) return { thing: 'roller' }
  if (inside(p, CRATE)) return { thing: 'crate' }
  if (inside(p, DOG)) return { thing: 'dog' }
  if (served && inside(p, WINDOW)) return { thing: 'customer' }
  if (inside(p, QUEUE[0])) return { thing: 'waiting', index: 0 }
  if (inside(p, QUEUE[1])) return { thing: 'waiting', index: 1 }
  if (inside(p, BOARD)) return { thing: 'board' }
  if (inside(p, SHELF_BOX)) return { thing: 'shelf' }
  if (inside(p, WALL)) return { thing: 'wall' }
  if (inside(p, COUNTER)) return { thing: 'counter' }
  return { thing: 'nothing' }
}
