// Where everything lies on the journal page, from the surface's width and
// height in CSS pixels. No DOM and no drawing: numbers in, places out.
//
// The page is laid out for 1180 by 820 and re-flows from the size it is given.
// On a wide surface the packets run down the left, the two rows of pots fill
// the middle and the visitors and the beetle have the right-hand column. On a
// tall surface the rows take the full width beside the packets and the
// visitors and the beetle move to a band under the tray.
//
// Every plant of the shelf and the tray is drawn at one scale, `k`, so a child
// can compare heights by eye across both rows.

import type { Joints } from './plant'

export type Rect = { x: number; y: number; w: number; h: number }
export type Circle = { x: number; y: number; r: number }

export const REFERENCE = { w: 1180, h: 820 } as const

/** The smallest a touch handle may be across, in CSS pixels, at any size. */
export const HANDLE = 48

/** A plant's measures at scale 1: the length of one stem joint, the stalk from the top joint to the flower, the flower's radius, the reach of a leaf from the stem, and the pot and the board it stands on. */
export const PLANT = { joint: 40, stalk: 38, flower: 26, leaf: 29, potW: 58, potH: 50, board: 12, headroom: 16 } as const

/**
 * The home control the shell lays over every game: round, this many CSS pixels across, in the middle of the top edge
 * and this far down from it. A tap on it goes home and never reaches the page. `clear` is the room left beside it.
 */
export const HOME = { size: 48, top: 10, clear: 6 } as const

export const POTS_PER_ROW = 6
export const BORDER_PLACES = 18
export const PACKET_PLACES = 4
export const KEPT_PLACES = 4
export const SKETCH_PLACES = 8

/** One pot of the shelf or the tray, with the two handles that do not depend on the plant in it. */
export type PotPlace = {
  /** The slot the pot, its plant and its runner bud keep to. */
  cell: Rect
  /** The middle of the pot, where the stem stands. */
  x: number
  /** The soil line: the top of the pot, where the stem starts. */
  soil: number
  /** The bottom of the pot, on the board. */
  foot: number
  /** The pot's handle: the pot itself, made up to the smallest handle where the pot is drawn smaller. */
  pot: Rect
  /** The runner bud's handle, beside the base. */
  bud: Circle
}

export type BorderPlace = { cell: Rect; x: number; ground: number }

export type Layout = {
  w: number
  h: number
  /** The one scale of every shelf and tray plant. */
  k: number
  /** The scale of a border plant and of a plant in a small drawing. */
  small: number
  wide: boolean
  shelf: PotPlace[]
  tray: PotPlace[]
  /** The plank the shelf pots stand on, and the tray under the tray pots. */
  shelfBoard: Rect
  trayBoard: Rect
  border: BorderPlace[]
  borderStrip: Rect
  packets: Rect[]
  /** The can and the blotter, under the packets. They arrive late in the order; their places are kept for them from the start. */
  tools: { can: Rect; blotter: Rect }
  /** The visitor on the page, and its wish sketch above it. */
  visitor: Rect
  wish: Rect
  /** The next visitor, at the right edge. */
  waiting: Rect
  beetle: Rect
  /** The top margin's small drawings of visitors that left with a plant. */
  kept: Rect[]
  /** The top margin's pencil sketches of plants the beetle carried off the page, oldest first. */
  sketches: Rect[]
  /** Where a plant offered to the visitor is set down while the visitor answers it: the foot of its stem, in front of the visitor. */
  offer: { x: number; y: number }
  /** Where the plants a visitor has kept so far stand, beside it: the foot of the first, and the step to the next. */
  given: { x: number; y: number; step: number }
}

/** From the soil line up to the middle of the flower, for a plant of that many joints. */
export function stemHeight(joints: Joints, k: number): number {
  return (joints * PLANT.joint + PLANT.stalk) * k
}

/** The flower's handle: a circle on the flower, which sits where the plant's height puts it. */
export function flowerHandle(place: PotPlace, joints: Joints, k: number): Circle {
  return { x: place.x, y: place.soil - stemHeight(joints, k), r: Math.max(HANDLE / 2, PLANT.flower * k) }
}

/** The height a row needs at scale 1: board, pot, a four-joint plant and its flower. */
const ROW_NEEDS = PLANT.board + PLANT.potH + 4 * PLANT.joint + PLANT.stalk + PLANT.flower + PLANT.headroom
/** The width a slot needs at scale 1: the pot, the bud beside it and air on both sides. */
const SLOT_NEEDS = 118

function row(x: number, y: number, slot: number, rowH: number, k: number): { places: PotPlace[]; board: Rect } {
  const potW = Math.max(HANDLE, PLANT.potW * k), potH = Math.max(HANDLE, PLANT.potH * k), bud = Math.max(HANDLE / 2, 22 * k)
  const board = PLANT.board * k, foot = y + rowH - board - 2, soil = foot - PLANT.potH * k
  const places: PotPlace[] = []
  for (let i = 0; i < POTS_PER_ROW; i++) {
    const cell = { x: x + i * slot, y, w: slot, h: rowH }
    const left = cell.x + (slot - (potW + 2 + bud * 2)) / 2
    places.push({
      cell,
      x: left + potW / 2,
      soil,
      foot,
      pot: { x: left, y: foot - potH, w: potW, h: potH },
      bud: { x: left + potW + 2 + bud, y: Math.min(soil + bud, y + rowH - bud), r: bud },
    })
  }
  return { places, board: { x: x + slot * 0.04, y: foot, w: slot * POTS_PER_ROW - slot * 0.08, h: board } }
}

export function layoutOf(width: number, height: number): Layout {
  const w = Math.max(1, width), h = Math.max(1, height)
  const wide = w / h >= 1.1
  const m = Math.min(w, h) * 0.02, gap = Math.min(w, h) * 0.012
  const top = wide ? h * 0.095 : h * 0.07
  const strip = wide ? h * 0.125 : h * 0.09
  const packetW = Math.max(84, w * (wide ? 0.085 : 0.11))
  // The side column is where the characters are: wide enough for a visitor and for the beetle at a size a child sees from across a table.
  const sideW = wide ? w * 0.27 : 0

  const rowsX = m + packetW + gap
  const rowsW = w - rowsX - m - (wide ? sideW + gap : 0)
  const slot = rowsW / POTS_PER_ROW
  const rowsY = m + top
  const borderY = h - m - strip
  const room = borderY - gap - rowsY
  const k = Math.min(((wide ? room / 2 : room * 0.3)) / ROW_NEEDS, slot / SLOT_NEEDS)
  const rowH = wide ? room / 2 : ROW_NEEDS * k + gap
  const shelf = row(rowsX, rowsY, slot, rowH, k)
  const tray = row(rowsX, rowsY + rowH, slot, rowH, k)
  const rowsEnd = rowsY + rowH * 2

  // The left column holds the four packets and, under them, the can and the blotter.
  const column = rowsEnd - rowsY - gap, packetsH = column * 0.7, toolH = Math.max(HANDLE, (column - packetsH - gap * 2) / 2)
  const packetH = Math.min(packetW * 1.3, packetsH / PACKET_PLACES - gap)
  const packets: Rect[] = []
  for (let i = 0; i < PACKET_PLACES; i++) {
    packets.push({ x: m, y: rowsY + gap + i * (packetsH / PACKET_PLACES), w: packetW, h: packetH })
  }
  const toolsY = rowsY + gap + packetsH
  const tools = { can: { x: m, y: toolsY, w: packetW, h: toolH }, blotter: { x: m, y: toolsY + toolH + gap, w: packetW, h: toolH } }

  const cellW = (w - m * 2) / BORDER_PLACES
  const border: BorderPlace[] = []
  for (let i = 0; i < BORDER_PLACES; i++) {
    border.push({ cell: { x: m + i * cellW, y: borderY, w: cellW, h: strip }, x: m + (i + 0.5) * cellW, ground: borderY + strip * 0.86 })
  }
  const small = Math.min((strip * 0.8) / (4 * PLANT.joint + PLANT.stalk + PLANT.flower), cellW / (PLANT.leaf * 2 + 6))

  let visitor: Rect, wish: Rect, waiting: Rect, beetle: Rect
  if (wide) {
    // Top: the label of the visitor on the page, and beside it, at the edge, the one who waits with its own sketch held
    // open. Middle, across the whole column: the visitor, with a plant offered to it on its left and the plants it has
    // kept on its right. Bottom: the beetle's corner.
    const x = w - m - sideW, colH = rowsEnd - rowsY, main = sideW * 0.58
    wish = { x, y: rowsY, w: main, h: colH * 0.34 }
    waiting = { x: x + main + gap, y: rowsY, w: sideW - main - gap, h: colH * 0.34 }
    visitor = { x, y: rowsY + colH * 0.35, w: sideW, h: colH * 0.29 }
    beetle = { x, y: rowsY + colH * 0.67, w: sideW, h: colH * 0.33 }
  } else {
    const y = rowsEnd + gap, bandH = borderY - gap - y, bandW = w - m * 2
    beetle = { x: m, y: y + bandH * 0.42, w: bandW * 0.34, h: bandH * 0.58 }
    wish = { x: m + bandW * 0.4, y, w: bandW * 0.34, h: bandH * 0.5 }
    visitor = { x: m + bandW * 0.4, y: y + bandH * 0.52, w: bandW * 0.34, h: bandH * 0.48 }
    waiting = { x: m + bandW * 0.78, y: y + bandH * 0.3, w: bandW * 0.22, h: bandH * 0.6 }
  }

  // The top margin, from the right: the kept drawings, newest first, and then the sketches. The shell's home control
  // (HOME) lies over the middle of it, so the cards stand on both sides of the control and none under it: as many to
  // its right as leaves the cards widest, and the rest to its left. The right-hand end keeps clear of the tape at the
  // plate's corner, and the left-hand cards leave the eight sketches their least room.
  const keptH = top - gap, marginX = rowsX + keptH * 1.1, marginEnd = rowsX + rowsW - 20 * k
  const homeLeft = w / 2 - HOME.size / 2 - HOME.clear, homeRight = w / 2 + HOME.size / 2 + HOME.clear
  const rightRoom = marginEnd - homeRight, leftRoom = homeLeft - marginX - gap - SKETCH_PLACES * 8
  let keptW = 0, onRight = 0
  for (let n = 0; n <= KEPT_PLACES; n++) {
    const left = KEPT_PLACES - n
    const fits = Math.min(keptH * 1.5, n > 0 ? (rightRoom - (n - 1) * gap) / n : Infinity, left > 0 ? (leftRoom - (left - 1) * gap) / left : Infinity)
    if (fits >= keptW) { keptW = fits; onRight = n }
  }
  const kept: Rect[] = []
  for (let i = 0; i < KEPT_PLACES; i++) {
    const from = i < onRight ? marginEnd : homeLeft, nth = i < onRight ? i : i - onRight
    kept.push({ x: from - (nth + 1) * keptW - nth * gap, y: m, w: keptW, h: keptH })
  }
  // The sketches fill the top margin from the rows' left edge up to the kept drawings, and stop short of the home control.
  const sketchRoom = Math.min(kept[KEPT_PLACES - 1].x - gap, homeLeft) - marginX, sketchW = Math.max(8, Math.min(keptH * 0.62, sketchRoom / SKETCH_PLACES))
  const sketches: Rect[] = []
  for (let i = 0; i < SKETCH_PLACES; i++) sketches.push({ x: marginX + i * sketchW, y: m, w: sketchW, h: keptH })
  // A plant offered stands at the left of the visitor's place and the plants it has kept at the right, the visitor between them (walker.ts).
  const offer = { x: visitor.x + visitor.w * (wide ? 0.2 : 0.12), y: visitor.y + visitor.h * 0.97 }
  const given = wide
    ? { x: visitor.x + visitor.w * 0.865, y: visitor.y + visitor.h * 0.97, step: Math.max(17 * k, visitor.w * 0.058) }
    : { x: visitor.x + visitor.w * 0.98, y: visitor.y + visitor.h * 0.97, step: Math.max(18 * k, visitor.w * 0.16) }

  return {
    w, h, k, small, wide,
    shelf: shelf.places, tray: tray.places, shelfBoard: shelf.board, trayBoard: tray.board,
    border, borderStrip: { x: m, y: borderY, w: w - m * 2, h: strip },
    packets, tools, visitor, wish, waiting, beetle, kept, sketches, offer, given,
  }
}

/** Every place of the page that must keep clear of every other, by name. */
export function placesOf(layout: Layout): { name: string; rect: Rect }[] {
  const named = (name: string, rects: Rect[]) => rects.map((rect, i) => ({ name: `${name} ${i}`, rect }))
  return [
    ...named('shelf', layout.shelf.map((place) => place.cell)),
    ...named('tray', layout.tray.map((place) => place.cell)),
    ...named('border', layout.border.map((place) => place.cell)),
    ...named('packet', layout.packets),
    { name: 'can', rect: layout.tools.can },
    { name: 'blotter', rect: layout.tools.blotter },
    ...named('sketch', layout.sketches),
    ...named('kept', layout.kept),
    { name: 'visitor', rect: layout.visitor },
    { name: 'wish', rect: layout.wish },
    { name: 'waiting', rect: layout.waiting },
    { name: 'beetle', rect: layout.beetle },
  ]
}
