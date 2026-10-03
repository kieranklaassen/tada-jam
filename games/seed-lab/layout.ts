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
export const PLANT = { joint: 44, stalk: 14, flower: 26, leaf: 29, potW: 58, potH: 50, board: 12, headroom: 8 } as const

export const POTS_PER_ROW = 6
export const BORDER_PLACES = 18
export const PACKET_PLACES = 4
export const KEPT_PLACES = 4

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
  /** The pot's handle. */
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
  /** The visitor on the page, and its wish sketch above it. */
  visitor: Rect
  wish: Rect
  /** The next visitor, at the right edge. */
  waiting: Rect
  beetle: Rect
  /** The top margin's small drawings of visitors that left with a plant. */
  kept: Rect[]
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
const SLOT_NEEDS = 128

function row(x: number, y: number, slot: number, rowH: number, k: number): { places: PotPlace[]; board: Rect } {
  const potW = Math.max(HANDLE, PLANT.potW * k), potH = Math.max(HANDLE, PLANT.potH * k), bud = Math.max(HANDLE / 2, 22 * k)
  const board = PLANT.board * k, foot = y + rowH - board - 2
  const places: PotPlace[] = []
  for (let i = 0; i < POTS_PER_ROW; i++) {
    const cell = { x: x + i * slot, y, w: slot, h: rowH }
    const left = cell.x + (slot - (potW + 2 + bud * 2)) / 2
    places.push({
      cell,
      x: left + potW / 2,
      soil: foot - potH,
      foot,
      pot: { x: left, y: foot - potH, w: potW, h: potH },
      bud: { x: left + potW + 2 + bud, y: foot - potH + bud, r: bud },
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
  const sideW = wide ? w * 0.215 : 0

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

  const packetH = Math.min(packetW * 1.3, (rowsEnd - rowsY) / PACKET_PLACES - gap)
  const packets: Rect[] = []
  for (let i = 0; i < PACKET_PLACES; i++) {
    packets.push({ x: m, y: rowsY + gap + i * ((rowsEnd - rowsY - gap) / PACKET_PLACES), w: packetW, h: packetH })
  }

  const cellW = (w - m * 2) / BORDER_PLACES
  const border: BorderPlace[] = []
  for (let i = 0; i < BORDER_PLACES; i++) {
    border.push({ cell: { x: m + i * cellW, y: borderY, w: cellW, h: strip }, x: m + (i + 0.5) * cellW, ground: borderY + strip * 0.86 })
  }
  const small = Math.min((strip * 0.8) / (4 * PLANT.joint + PLANT.stalk + PLANT.flower), cellW / (PLANT.leaf * 2 + 6))

  let visitor: Rect, wish: Rect, waiting: Rect, beetle: Rect
  if (wide) {
    const x = w - m - sideW, colH = rowsEnd - rowsY, main = sideW * 0.68
    wish = { x, y: rowsY, w: main, h: colH * 0.33 }
    visitor = { x, y: rowsY + colH * 0.34, w: main, h: colH * 0.3 }
    waiting = { x: x + main + gap, y: rowsY + colH * 0.2, w: sideW - main - gap, h: colH * 0.44 }
    beetle = { x, y: rowsY + colH * 0.67, w: sideW, h: colH * 0.33 }
  } else {
    const y = rowsEnd + gap, bandH = borderY - gap - y, bandW = w - m * 2
    beetle = { x: m, y: y + bandH * 0.42, w: bandW * 0.34, h: bandH * 0.58 }
    wish = { x: m + bandW * 0.4, y, w: bandW * 0.34, h: bandH * 0.5 }
    visitor = { x: m + bandW * 0.4, y: y + bandH * 0.52, w: bandW * 0.34, h: bandH * 0.48 }
    waiting = { x: m + bandW * 0.78, y: y + bandH * 0.3, w: bandW * 0.22, h: bandH * 0.6 }
  }

  const keptH = top - gap, keptW = Math.min(keptH * 1.5, (rowsW - gap * 3) / KEPT_PLACES)
  const kept: Rect[] = []
  for (let i = 0; i < KEPT_PLACES; i++) kept.push({ x: rowsX + rowsW - (i + 1) * keptW - i * gap, y: m, w: keptW, h: keptH })

  return {
    w, h, k, small, wide,
    shelf: shelf.places, tray: tray.places, shelfBoard: shelf.board, trayBoard: tray.board,
    border, borderStrip: { x: m, y: borderY, w: w - m * 2, h: strip },
    packets, visitor, wish, waiting, beetle, kept,
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
    ...named('kept', layout.kept),
    { name: 'visitor', rect: layout.visitor },
    { name: 'wish', rect: layout.wish },
    { name: 'waiting', rect: layout.waiting },
    { name: 'beetle', rect: layout.beetle },
  ]
}
