import { isRecord } from './state'

// The sheet the lantern is rolled from: up to eight windows, each an outline
// in whole hundredths of the sheet, the paper behind it, and whether the
// child cut it. Pure numbers: the table cuts into it, the wood throws light
// through it, and the save holds it as it is.

export type Paper = 'red' | 'blue' | 'yellow'
export const PAPERS: readonly Paper[] = ['red', 'blue', 'yellow']

export type SheetWindow = {
  /** x, y, x, y in whole hundredths of the sheet, at most twenty points. */
  outline: number[]
  paper: Paper | null
  /** The child cut it; the windows a sheet comes with are not the child's. */
  cut: boolean
}

export const MOST_WINDOWS = 8
export const MOST_POINTS = 20
/** Cuts keep this far inside the sheet's edge, in hundredths. */
export const MARGIN = 3

function ring(cx: number, cy: number, rx: number, ry: number, corners: number, pinch: number): number[] {
  const out: number[] = []
  for (let i = 0; i < MOST_POINTS; i++) {
    const angle = (Math.PI * 2 * i) / MOST_POINTS - Math.PI / 2
    const r = 1 - pinch * (0.5 - 0.5 * Math.cos(angle * corners))
    out.push(Math.round(cx + Math.cos(angle) * rx * r), Math.round(cy + Math.sin(angle) * ry * r))
  }
  return out
}

/** Where the yellow window of both ready sheets sits. */
const YELLOW_AT = { x: 53, y: 84 }

/** The sheet each position of the designed order lays ready: three windows backed in three colours, one yellow window, or none. */
export function sheetOf(position: string): SheetWindow[] {
  if (position === 'three-windows') {
    // Where a window sits decides where its light falls (wood.ts). These three are placed so that what a straight
    // carry does first is each creature's own rule. From the door step no light lies on a creature or runs off the
    // frame. The red falls level to the left of the lantern, so along the ground it is the first light on the fox
    // and on the badger. The yellow falls up and a little to the right, wide, so that carried past the moths'
    // tree at the height of the step it is the first light on the bark from either side, and a lantern whose pole
    // is on the hook lays it on no moth. The blue falls above the yellow and is narrower, so it comes first to
    // the fern when the lantern is lifted under it. The red is cut last and lies on top: where the red and
    // another light are both on the fox, it is the red the fox answers.
    return [
      { outline: ring(YELLOW_AT.x, YELLOW_AT.y, 9.5, 10, 1, 0), paper: 'yellow', cut: false },
      { outline: ring(53, 14, 7, 9.6, 1, 0), paper: 'blue', cut: false },
      { outline: ring(25, 42, 10, 11, 3, 0.3), paper: 'red', cut: false },
    ]
  }
  if (position === 'one-window') return [{ outline: ring(YELLOW_AT.x, YELLOW_AT.y, 9.5, 10, 1, 0), paper: 'yellow', cut: false }]
  return []
}

/** The middle of an outline. */
export function middleOf(outline: readonly number[]): { x: number; y: number } {
  let x = 0, y = 0
  for (let i = 0; i < outline.length; i += 2) { x += outline[i]; y += outline[i + 1] }
  const count = Math.max(1, outline.length / 2)
  return { x: x / count, y: y / count }
}

/** Whether a point of the sheet lies inside an outline. */
export function within(outline: readonly number[], x: number, y: number): boolean {
  let inside = false
  for (let i = 0, j = outline.length - 2; i < outline.length; j = i, i += 2) {
    const xi = outline[i], yi = outline[i + 1], xj = outline[j], yj = outline[j + 1]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

/** The window a point of the sheet lies in, the one cut last on top, or -1. */
export function windowAt(sheet: readonly SheetWindow[], x: number, y: number): number {
  for (let i = sheet.length - 1; i >= 0; i--) if (within(sheet[i].outline, x, y)) return i
  return -1
}

/**
 * The outline a traced cut leaves: the path the scissors took, in hundredths, thinned to twenty points at most
 * and kept inside the sheet. A path that encloses nothing (fewer than three different points) gives null: the
 * scissors snipped and no hole was made.
 */
export function outlineOf(path: readonly number[]): number[] | null {
  const count = path.length / 2
  if (count < 3) return null
  const keep = Math.min(MOST_POINTS, count)
  const out: number[] = []
  for (let k = 0; k < keep; k++) {
    const i = Math.floor((k * count) / keep) * 2
    const x = Math.round(Math.min(100 - MARGIN, Math.max(MARGIN, path[i]))), y = Math.round(Math.min(100 - MARGIN, Math.max(MARGIN, path[i + 1])))
    const n = out.length
    if (n >= 2 && out[n - 2] === x && out[n - 1] === y) continue
    out.push(x, y)
  }
  if (out.length >= 4 && out[0] === out[out.length - 2] && out[1] === out[out.length - 1]) out.length -= 2
  if (out.length < 6) return null
  // A line cut there and back encloses nothing.
  let area = 0
  for (let i = 0, j = out.length - 2; i < out.length; j = i, i += 2) area += out[j] * out[i + 1] - out[i] * out[j + 1]
  return Math.abs(area) / 2 >= 2 ? out : null
}

/** A sheet as a save may hold it, repaired window by window: a damaged window is dropped and the rest are kept. */
export function readSheet(raw: unknown): SheetWindow[] | null {
  if (!Array.isArray(raw)) return null
  const sheet: SheetWindow[] = []
  for (const item of raw) {
    if (sheet.length >= MOST_WINDOWS) break
    if (!isRecord(item) || !Array.isArray(item.outline)) continue
    const outline: number[] = []
    for (const value of item.outline.slice(0, MOST_POINTS * 2)) {
      if (typeof value !== 'number' || !Number.isFinite(value)) break
      outline.push(Math.min(100, Math.max(0, Math.round(value))))
    }
    if (outline.length % 2 === 1) outline.pop()
    if (outline.length < 6) continue
    const paper = PAPERS.includes(item.paper as Paper) ? (item.paper as Paper) : null
    sheet.push({ outline, paper, cut: item.cut === true })
  }
  return sheet
}

export function copySheet(sheet: readonly SheetWindow[]): SheetWindow[] {
  return sheet.map((w) => ({ outline: [...w.outline], paper: w.paper, cut: w.cut }))
}
