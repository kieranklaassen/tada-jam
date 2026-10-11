import { CELL, EARTH, MUD, OPEN, ROCK, SAND, STONE, at, type Ground, type Kind } from '../ground'
import * as P from './palette'

// The ground as one cached sheet. A cell is painted inside its own square from its kind, its depth and the kinds
// round it, so a change repaints that cell and the eight round it and nothing else. The whole grid is painted
// once, at load and when the surface changes size; never in a frame.

/** The few calls of a 2D context the sheet uses, so a test can stand in for it. */
export type SheetPen = Pick<
  CanvasRenderingContext2D,
  'fillStyle' | 'fillRect' | 'beginPath' | 'moveTo' | 'lineTo' | 'quadraticCurveTo' | 'arcTo' | 'closePath' | 'fill'
>

/** The most cells the sheet repaints in one frame; a larger change is spread over the frames that follow. */
export const REPAINTS_A_FRAME = 24

const mix = (a: string, b: string, t: number): string => {
  const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16)
  const part = (shift: number) => Math.round(((pa >> shift) & 255) + (((pb >> shift) & 255) - ((pa >> shift) & 255)) * t)
  return `rgb(${part(16)},${part(8)},${part(0)})`
}

/** A small fixed scatter for a cell: the same cell always gets the same specks. */
const speck = (x: number, y: number, n: number): number => {
  let h = (x * 374761393 + y * 668265263 + n * 2147483647) >>> 0
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

const depthOf = (ground: Ground, y: number) => (ground.rows <= 2 ? 0 : (y - 1) / (ground.rows - 2))

/** The earth lies in three strata with wavy edges, each a little darker towards its foot. */
function earthAt(ground: Ground, x: number, y: number): string {
  const wave = Math.round(Math.sin(x * 0.55) * 1.1 + Math.sin(x * 0.17 + 2) * 0.9)
  const row = y + wave, third = Math.max(4, (ground.rows - 2) / 3)
  const band = Math.max(0, Math.min(2, Math.floor((row - 1) / third)))
  const within = Math.max(0, Math.min(1, ((row - 1) % third) / third))
  return mix(P.EARTH.strata[band], P.EARTH.deep, 0.08 + within * 0.2 + band * 0.06)
}
const openAt = (ground: Ground, y: number) => mix(P.EARTH.open, P.EARTH.openLow, depthOf(ground, y))

/** The flat colour a kind shows, for its own cell and for the rounding of the open cells beside it. */
function fillOf(ground: Ground, kind: Kind, x: number, y: number): string {
  if (kind === EARTH) return earthAt(ground, x, y)
  if (kind === SAND) return P.SAND.fill
  if (kind === MUD) return P.MUD.fill
  if (kind === STONE) return P.STONE.fill
  if (kind === ROCK) return y === 0 ? P.ROCK.turf : P.ROCK.bed
  return openAt(ground, y)
}

/** A square with a radius for each corner, clockwise from the top left. */
function rounded(pen: SheetPen, x: number, y: number, s: number, r: readonly [number, number, number, number]): void {
  pen.beginPath()
  pen.moveTo(x + r[0], y)
  pen.arcTo(x + s, y, x + s, y + s, r[1])
  pen.arcTo(x + s, y + s, x, y + s, r[2])
  pen.arcTo(x, y + s, x, y, r[3])
  pen.arcTo(x, y, x + s, y, r[0])
  pen.closePath()
  pen.fill()
}

/** Paints one cell into the sheet, at `scale` sheet pixels a stage unit. */
export function paintCell(pen: SheetPen, ground: Ground, x: number, y: number, scale = 1): void {
  const s = CELL * scale, px = x * s, py = y * s, u = scale
  const kind = at(ground, x, y)
  const up = at(ground, x, y - 1), down = at(ground, x, y + 1), left = at(ground, x - 1, y), right = at(ground, x + 1, y)
  const dark = openAt(ground, y)

  if (kind === OPEN) {
    pen.fillStyle = dark
    pen.fillRect(px, py, s, s)
    // A roof casts a shadow into the tunnel and a floor catches a little light.
    if (up !== OPEN) { pen.fillStyle = 'rgba(0,0,0,0.28)'; pen.fillRect(px, py, s, 5 * u) }
    if (down !== OPEN && down !== ROCK) { pen.fillStyle = 'rgba(255,225,170,0.10)'; pen.fillRect(px, py + s - 3 * u, s, 3 * u) }
    // Where two firm sides meet, the corner is filled in, so a tunnel is round and not a row of boxes.
    const r = 9 * u
    const corner = (cx: number, cy: number, dx: number, dy: number, a: Kind, b: Kind, row: number) => {
      if (a === OPEN || b === OPEN) return
      pen.fillStyle = fillOf(ground, a, x, row)
      pen.beginPath()
      pen.moveTo(cx, cy)
      pen.lineTo(cx + r * dx, cy)
      pen.quadraticCurveTo(cx, cy, cx, cy + r * dy)
      pen.closePath()
      pen.fill()
    }
    corner(px, py, 1, 1, up, left, y - 1)
    corner(px + s, py, -1, 1, up, right, y - 1)
    corner(px, py + s, 1, -1, down, left, y + 1)
    corner(px + s, py + s, -1, -1, down, right, y + 1)
    return
  }

  if (kind === EARTH || kind === ROCK) {
    pen.fillStyle = fillOf(ground, kind, x, y)
    pen.fillRect(px, py, s, s)
    if (kind === EARTH) {
      // Grain: a few fixed specks, darker and lighter, so the earth is ground and not a flat panel.
      for (let n = 0; n < 4; n++) {
        const w = (2 + Math.floor(speck(x, y, n + 9) * 3)) * u
        pen.fillStyle = n % 2 === 0 ? 'rgba(60,34,16,0.30)' : 'rgba(255,214,150,0.16)'
        pen.fillRect(px + speck(x, y, n) * (s - w), py + speck(x, y, n + 4) * (s - w), w, w * 0.7)
      }
      // Fine roots hang into the top of the earth.
      if (y <= 2 && speck(x, y, 20) < 0.5 - y * 0.15) {
        pen.fillStyle = P.GRASS.root
        const rx = px + (4 + speck(x, y, 21) * 18) * u
        pen.fillRect(rx, py, 1.5 * u, (8 + speck(x, y, 22) * 16) * u)
        pen.fillRect(rx + 3 * u, py, 1.2 * u, (4 + speck(x, y, 23) * 9) * u)
      }
    } else if (y === 0) {
      pen.fillStyle = P.GRASS.dark
      pen.fillRect(px, py + s - 6 * u, s, 6 * u)
      pen.fillStyle = P.GRASS.root
      for (let n = 0; n < 3; n++) pen.fillRect(px + (3 + speck(x, y, n) * 20) * u, py + s - 6 * u, 1.5 * u, 6 * u)
    } else {
      pen.fillStyle = P.ROCK.bedEdge
      pen.fillRect(px, py, s, 3 * u)
      pen.fillRect(px + speck(x, y, 1) * (s - 8 * u), py + 9 * u, 8 * u, 2 * u)
      pen.fillRect(px + speck(x, y, 2) * (s - 6 * u), py + 19 * u, 6 * u, 2 * u)
    }
    return
  }

  // A lump. It is as plain as it can be: one flat colour, rounded only where it stands free, with one small
  // mark of what it is. In a seam it lies in the earth; beside open ground it lies on the dark of the dug ground.
  const buried = up !== OPEN && down !== OPEN && left !== OPEN && right !== OPEN
  pen.fillStyle = buried ? earthAt(ground, x, y) : dark
  pen.fillRect(px, py, s, s)
  const free = (a: Kind, b: Kind, r: number) => (a === OPEN && b === OPEN ? r * u : 0)
  if (kind === STONE) {
    pen.fillStyle = P.STONE.edge
    rounded(pen, px + 1 * u, py + 1 * u, s - 2 * u, [11 * u, 11 * u, 9 * u, 9 * u])
    pen.fillStyle = P.STONE.fill
    rounded(pen, px + 2 * u, py + 1 * u, s - 5 * u, [10 * u, 10 * u, 9 * u, 9 * u])
    pen.fillStyle = P.STONE.shine
    rounded(pen, px + 7 * u, py + 5 * u, 7 * u, [3 * u, 3 * u, 3 * u, 3 * u])
    return
  }
  pen.fillStyle = kind === SAND ? P.SAND.fill : P.MUD.fill
  rounded(pen, px, py, s, [free(up, left, 10), free(up, right, 10), free(down, right, 4), free(down, left, 4)])
  if (kind === SAND) {
    pen.fillStyle = P.SAND.edge
    for (let n = 0; n < 3; n++) pen.fillRect(px + (4 + speck(x, y, n) * 18) * u, py + (5 + speck(x, y, n + 3) * 17) * u, 2 * u, 2 * u)
  } else {
    pen.fillStyle = P.MUD.shine
    rounded(pen, px + 6 * u, py + 6 * u, 5 * u, [2.5 * u, 2.5 * u, 2.5 * u, 2.5 * u])
  }
}

/** Paints the whole grid. For the load and a resize only. */
export function paintAll(pen: SheetPen, ground: Ground, scale = 1): void {
  for (let y = 0; y < ground.rows; y++) for (let x = 0; x < ground.cols; x++) paintCell(pen, ground, x, y, scale)
}

/** The cells to repaint when these cells changed: each one and the eight round it, once each. */
export function touchedBy(ground: Ground, changed: readonly number[]): number[] {
  const seen = new Set<number>()
  for (const i of changed) {
    const cx = i % ground.cols, cy = Math.floor(i / ground.cols)
    for (let y = cy - 1; y <= cy + 1; y++) for (let x = cx - 1; x <= cx + 1; x++) {
      if (x >= 0 && y >= 0 && x < ground.cols && y < ground.rows) seen.add(y * ground.cols + x)
    }
  }
  return [...seen]
}

/**
 * Repaints the cells that wait, at most `REPAINTS_A_FRAME` of them, and gives back the ones still waiting.
 * The caller keeps the list nearest the finger first.
 */
export function repaint(pen: SheetPen, ground: Ground, waiting: readonly number[], scale = 1, most = REPAINTS_A_FRAME): number[] {
  const now = waiting.slice(0, most)
  for (const i of now) paintCell(pen, ground, i % ground.cols, Math.floor(i / ground.cols), scale)
  return waiting.slice(most)
}
