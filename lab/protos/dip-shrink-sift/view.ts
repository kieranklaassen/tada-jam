// The view: flat shapes from the snapshot, nothing else. It holds no state and
// forwards no input (the shell maps pointer events and calls sim.pointer).

import { circle, clear, label, line, rect, roundRect } from '../../kit/draw.ts'
import { BIN_Y, BOARD_X, COLS, COL_W, KINDS, PAINTS, ROWS, ROW_H, START_COL, binRect, cellRect, trayRect } from './sim.ts'
import type { Color, DipSnapshot, Kind, Piece, Rect, Size, Want } from './sim.ts'

const PAINT: Record<Color, string> = { gray: '#9b9b9b', red: '#d64545', blue: '#3b6fd6', yellow: '#e8b830' }
const TINT: Record<Kind, string> = { slope: '#d9cdb4', fork: '#cfe0c8', dip: '#f1d7c4', shrinker: '#d3d0ea', sieve: '#c9e0e6', bell: '#efe3a8' }
const RADIUS: Record<Size, number> = { 1: 11, 2: 17, 3: 25 }
const SIZE_WORD: Record<Size, string> = { 1: 'small', 2: 'medium', 3: 'large' }

const marble = (ctx: CanvasRenderingContext2D, x: number, y: number, color: Color, size: Size) => {
  circle(ctx, x, y, RADIUS[size], { fill: PAINT[color], stroke: '#2b2620', width: 2 })
  circle(ctx, x - RADIUS[size] * 0.3, y - RADIUS[size] * 0.3, RADIUS[size] * 0.22, 'rgba(255,255,255,0.6)')
}

const wantText = (w: Want) => [w.size ? SIZE_WORD[w.size] : '', w.color ?? '', 'marbles'].filter(Boolean).join(' ').replace(/^./, (c) => c.toUpperCase())

// What a piece says about itself, from its own setting.
function pieceText(p: Piece): string[] {
  const color = PAINTS[p.setting % 3]!
  switch (p.kind) {
    case 'slope':
      return [p.setting === 0 ? '< slope' : 'slope >']
    case 'fork':
      return [`fork ${color}`, `matches go ${p.flip ? 'right >' : '< left'}`]
    case 'dip':
      return [`dip ${color}`, 'plain ones only']
    case 'shrinker':
      return ['shrinker', 'one size down']
    case 'sieve':
      return [`sieve ${p.setting === 0 ? 'small' : 'small+medium'}`, `rest go ${p.flip ? '< left' : 'right >'}`]
    case 'bell':
      return ['bell', 'rings']
  }
}

function drawPiece(ctx: CanvasRenderingContext2D, r: Rect, p: Piece, alpha = 1) {
  ctx.globalAlpha = alpha
  roundRect(ctx, r.x + 6, r.y + 6, r.w - 12, r.h - 12, 14, { fill: TINT[p.kind], stroke: '#6d6252', width: 3 })
  if (p.kind === 'dip' || p.kind === 'fork') circle(ctx, r.x + 24, r.y + 22, 9, PAINT[PAINTS[p.setting % 3]!])
  const lines = pieceText(p)
  lines.forEach((t, i) => label(ctx, t, r.x + r.w / 2 + 6, r.y + (lines.length === 1 ? 50 : 38 + i * 24), { align: 'center', size: i === 0 ? 22 : 17 }))
  ctx.globalAlpha = 1
}

export function draw(ctx: CanvasRenderingContext2D, s: DipSnapshot): void {
  clear(ctx, '#f6f1e6')
  label(ctx, 'Drag pieces onto the board, or pick one and tap cells. Tap a piece to change it, hold to flip it.', 24, 30, { size: 19, color: '#5d5443' })
  label(ctx, 'Marbles meet the pieces top to bottom: order matters.', 24, 56, { size: 19, color: '#5d5443' })

  // The tray.
  KINDS.forEach((kind, i) => {
    const r = trayRect(i)
    const on = s.brush === kind
    roundRect(ctx, r.x, r.y, r.w, r.h, 16, { fill: TINT[kind], stroke: on ? '#2b2620' : '#8a7f6a', width: on ? 7 : 3 })
    label(ctx, kind, r.x + r.w / 2, r.y + 50, { align: 'center', size: 28 })
  })
  label(ctx, `Order ${s.level}`, 30, 690, { size: 30 })
  if (s.orders !== null) label(ctx, `${s.orders} done`, 30, 726, { size: 24, color: '#5d5443' })

  // The pegboard.
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const r = cellRect(row, col)
      rect(ctx, r.x + 1, r.y + 1, r.w - 2, r.h - 2, { stroke: col === START_COL ? '#cdbf9f' : '#e4dccb', width: 2 })
      circle(ctx, r.x + r.w / 2, r.y + r.h / 2, 4, '#cdbf9f')
    }
  }
  s.cells.forEach((cells, row) => cells.forEach((p, col) => p && drawPiece(ctx, cellRect(row, col), p)))
  for (const ring of s.rings) {
    const r = cellRect(ring.row, ring.col)
    circle(ctx, r.x + r.w / 2, r.y + r.h / 2, 30 + (24 - ring.ttl) * 2, { stroke: PAINT[ring.color], width: 5 })
  }

  // The dispenser and the marbles coming next.
  const top = cellRect(0, START_COL)
  roundRect(ctx, top.x + 4, 40, top.w - 8, 50, 14, { fill: '#c9bfa8' })
  for (let i = 0; i < 3; i++) {
    const t = s.bag[(s.bagIndex + i) % s.bag.length]!
    marble(ctx, top.x + 32 + i * 53, 65, t.color, t.size)
  }
  for (const m of s.marbles) marble(ctx, m.x, m.y, m.color, m.size)

  // The bins.
  for (let col = 0; col < COLS; col++) {
    const r = binRect(col)
    const bin = s.bins[col]!
    roundRect(ctx, r.x, r.y, r.w, r.h, 18, { fill: bin.content ? '#cfe9c8' : '#ece3d0', stroke: bin.want ? '#2b2620' : '#c9bfa8', width: bin.want ? 4 : 2 })
    if (!bin.want) {
      label(ctx, 'anything', r.x + r.w / 2, r.y + 70, { align: 'center', size: 20, color: '#a89e88' })
      continue
    }
    label(ctx, wantText(bin.want), r.x + r.w / 2, r.y + 28, { align: 'center', size: 19 })
    marble(ctx, r.x + r.w / 2, r.y + 68, bin.want.color ?? 'gray', bin.want.size ?? 2)
    for (let i = 0; i < 3; i++) {
      const v = bin.recent[i]
      circle(ctx, r.x + r.w / 2 - 24 + i * 24, r.y + 112, 8, { fill: v === undefined ? '#ddd3bf' : v ? '#3fa66b' : '#d64545' })
    }
  }
  line(ctx, BOARD_X, BIN_Y - 6, BOARD_X + COLS * COL_W, BIN_Y - 6, '#cdbf9f', 3)

  if (s.hint) {
    const pulse = (s.tick % 30) / 30
    circle(ctx, s.hint.from.x, s.hint.from.y, 44 + pulse * 30, { stroke: `rgba(43,38,32,${1 - pulse})`, width: 5 })
    if (s.hint.to) line(ctx, s.hint.from.x, s.hint.from.y, s.hint.to.x, s.hint.to.y, 'rgba(43,38,32,0.35)', 4)
  }
  if (s.carrying) drawPiece(ctx, { x: s.carrying.x - COL_W / 2, y: s.carrying.y - ROW_H / 2, w: COL_W, h: ROW_H }, { kind: s.carrying.kind, setting: 0, flip: false }, 0.8)
}
