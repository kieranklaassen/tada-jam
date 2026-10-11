import { COLS, ROWS, hasRails, type LaneKind } from './board'
import { paintFar, paintNear } from './ends'
import { BORDER, FOLD_X, LANES, ORIGIN, SLIDE, SQUARE, centreX, centreY } from './layout'
import { makeRng, type Rng } from './rng'
import type { Column, Print, Scenery } from './scenery'
import { STAGE } from './stage'

// Everything that stands still, painted once onto a canvas of its own and stamped as one draw a frame: the table,
// the long folding board of linen-covered card with its printed lanes and the small things printed on them, the
// fold, and what stands or lies on the table at the two ends of every lane. The look is a board game seen from
// above at a slight angle: flat bright print with no contour lines, a hard offset shadow under whatever stands
// up, and no numeral or letter anywhere on it.

type Ctx = CanvasRenderingContext2D

export const INK = {
  table: '#8a5a3c',
  tableDark: '#774a30',
  tableLight: '#9b6947',
  linen: '#eadfc6',
  linenThread: '#cdbf9f',
  print: '#b9a983',
  grass: ['#7ec65a', '#88cd63'],
  grassDark: '#5fae43',
  road: ['#586676', '#616f80'],
  roadLine: '#f4efe2',
  river: ['#36a3e4', '#41acea'],
  riverLight: '#c9ecff',
  clothRed: '#e2504c',
  clothWhite: '#fff4ea',
  bed: ['#c8b28c', '#d1bc97'],
  sleeper: '#8a5f3a',
  rail: '#a9b4bf',
  shadow: 'rgba(46, 26, 12, 0.32)',
} as const

/** The hard shadow every standing thing throws: down and to the right, never soft. */
export const SHADOW_OFFSET = { x: 10, y: 8 } as const
export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2)
  ctx.beginPath()
  ctx.moveTo(x + k, y)
  ctx.lineTo(x + w - k, y)
  ctx.quadraticCurveTo(x + w, y, x + w, y + k)
  ctx.lineTo(x + w, y + h - k)
  ctx.quadraticCurveTo(x + w, y + h, x + w - k, y + h)
  ctx.lineTo(x + k, y + h)
  ctx.quadraticCurveTo(x, y + h, x, y + h - k)
  ctx.lineTo(x, y + k)
  ctx.quadraticCurveTo(x, y, x + k, y)
  ctx.closePath()
}

export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, turn = 0): void {
  ctx.beginPath()
  ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), turn, 0, Math.PI * 2)
}

function table(ctx: Ctx, rng: Rng, grain: boolean): void {
  // Past the stage on every side, since a surface of another shape shows more of the table.
  ctx.fillStyle = INK.table
  ctx.fillRect(-2000, -2000, STAGE.width + 4000, STAGE.height + 4000)
  if (!grain) return
  // Planks with long grain streaks.
  for (let y = -40; y < STAGE.height + 40; y += 118) {
    ctx.fillStyle = INK.tableDark
    ctx.fillRect(-2000, y, STAGE.width + 4000, 3)
    for (let n = 0; n < 9; n++) {
      const x = -200 + rng.next() * (STAGE.width + 400), len = 160 + rng.next() * 420, at = y + 10 + rng.next() * 96
      ctx.fillStyle = rng.next() < 0.5 ? INK.tableLight : INK.tableDark
      ctx.globalAlpha = 0.35
      roundRect(ctx, x, at, len, 2 + rng.next() * 2.5, 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
}

/** The strip of linen-covered card. It runs on past both side edges; only the first leaf, with the burrow, has an end, just off the stage. */
function linen(ctx: Ctx, weave: boolean, firstLeaf: boolean): void {
  const x = firstLeaf ? LANES.x - BORDER : -2000, y = LANES.y - BORDER, w = LANES.x + LANES.w + 2000 - x, h = LANES.h + BORDER * 2
  ctx.fillStyle = INK.shadow
  roundRect(ctx, x + 12, y + 14, w, h, 12)
  ctx.fill()
  // The card's edge shows as a darker rim under the linen.
  ctx.fillStyle = INK.print
  roundRect(ctx, x, y + 4, w, h, 12)
  ctx.fill()
  ctx.fillStyle = INK.linen
  roundRect(ctx, x, y, w, h, 12)
  ctx.fill()
  if (!weave) return
  // The threads: fine lines both ways, a little uneven.
  ctx.save()
  roundRect(ctx, x, y, w, h, 12)
  ctx.clip()
  ctx.fillStyle = INK.linenThread
  ctx.globalAlpha = 0.34
  for (let at = y + 1; at < y + h; at += 3) ctx.fillRect(-40, at, STAGE.width + 80, 1)
  ctx.globalAlpha = 0.24
  for (let at = -39; at < STAGE.width + 40; at += 3) ctx.fillRect(at, y, 1, h)
  ctx.restore()
  ctx.globalAlpha = 1
}

/** One printed square: flat ink that stops short of its neighbours, so the linen shows between them as it does on a real board. */
function square(ctx: Ctx, c: number, r: number, fill: string): void {
  ctx.fillStyle = fill
  roundRect(ctx, ORIGIN.x + c * SQUARE.w + 2.5, ORIGIN.y + r * SQUARE.h + 2.5, SQUARE.w - 5, SQUARE.h - 5, 9)
  ctx.fill()
}

function daisy(ctx: Ctx, x: number, y: number, size: number, petal = '#ffffff'): void {
  ctx.fillStyle = petal
  for (let p = 0; p < 5; p++) {
    const a = (p / 5) * Math.PI * 2
    ellipse(ctx, x + Math.cos(a) * size, y + Math.sin(a) * size, size * 0.72, size * 0.72)
    ctx.fill()
  }
  ctx.fillStyle = '#ffd23f'
  ellipse(ctx, x, y, size * 0.7, size * 0.7)
  ctx.fill()
}

function tuft(ctx: Ctx, px: number, py: number): void {
  ctx.fillStyle = INK.grassDark
  for (let blade = -1; blade <= 1; blade++) {
    ctx.beginPath()
    ctx.moveTo(px + blade * 4 - 2, py + 9)
    ctx.lineTo(px + blade * 6, py)
    ctx.lineTo(px + blade * 4 + 2, py + 9)
    ctx.fill()
  }
}

function grass(ctx: Ctx, c: number, r: number, rng: Rng): void {
  square(ctx, c, r, INK.grass[(c + r) % 2])
  const x = ORIGIN.x + c * SQUARE.w, y = ORIGIN.y + r * SQUARE.h
  // Printed tufts along the edges, so the middle stays plain under a pawn.
  for (let n = 0; n < 2; n++) tuft(ctx, x + 14 + rng.next() * (SQUARE.w - 34), y + (rng.next() < 0.5 ? 9 : SQUARE.h - 22))
}

function road(ctx: Ctx, c: number, r: number): void {
  square(ctx, c, r, INK.road[r % 2])
  // A dashed line printed down the middle of the lane.
  ctx.fillStyle = INK.roadLine
  ctx.globalAlpha = 0.85
  const x = centreX(c) - 3, y = ORIGIN.y + r * SQUARE.h
  roundRect(ctx, x, y + 12, 6, 30, 3)
  ctx.fill()
  roundRect(ctx, x, y + SQUARE.h - 42, 6, 30, 3)
  ctx.fill()
  ctx.globalAlpha = 1
}

function river(ctx: Ctx, c: number, r: number, rng: Rng): void {
  square(ctx, c, r, INK.river[(c + r) % 2])
  // Printed wave curls.
  ctx.strokeStyle = INK.riverLight
  ctx.lineWidth = 3.2
  ctx.lineCap = 'round'
  ctx.globalAlpha = 0.75
  const x = ORIGIN.x + c * SQUARE.w, y = ORIGIN.y + r * SQUARE.h
  for (let n = 0; n < 3; n++) {
    const px = x + 14 + rng.next() * (SQUARE.w - 58), py = y + 18 + n * 30 + rng.next() * 8
    ctx.beginPath()
    ctx.moveTo(px, py)
    ctx.quadraticCurveTo(px + 8, py - 9, px + 16, py)
    ctx.quadraticCurveTo(px + 24, py + 9, px + 32, py)
    ctx.stroke()
  }
  ctx.globalAlpha = 1
}

function cloth(ctx: Ctx, c: number, r: number): void {
  square(ctx, c, r, INK.clothWhite)
  // Gingham: red bars both ways, darker where they cross.
  const x = ORIGIN.x + c * SQUARE.w + 2.5, y = ORIGIN.y + r * SQUARE.h + 2.5, w = SQUARE.w - 5, h = SQUARE.h - 5
  ctx.save()
  roundRect(ctx, x, y, w, h, 9)
  ctx.clip()
  ctx.fillStyle = INK.clothRed
  ctx.globalAlpha = 0.5
  const step = w / 6
  for (let n = 0; n < 6; n += 2) ctx.fillRect(x + n * step, y, step, h)
  const down = h / 6
  for (let n = 0; n < 6; n += 2) ctx.fillRect(x, y + n * down, w, down)
  ctx.restore()
  ctx.globalAlpha = 1
}

/** Two rails over sleepers, printed down the lane: on a gravel bed of their own, or let into a road. */
function rails(ctx: Ctx, c: number, r: number, inRoad: boolean): void {
  if (inRoad) square(ctx, c, r, INK.road[r % 2])
  else square(ctx, c, r, INK.bed[r % 2])
  const x = centreX(c), y = ORIGIN.y + r * SQUARE.h
  ctx.fillStyle = inRoad ? '#454f5c' : INK.sleeper
  for (let n = 0; n < 4; n++) {
    roundRect(ctx, x - 38, y + 8 + n * 25, 76, 11, 3)
    ctx.fill()
  }
  ctx.fillStyle = INK.rail
  ctx.fillRect(x - 27, y + 2.5, 7, SQUARE.h - 5)
  ctx.fillRect(x + 20, y + 2.5, 7, SQUARE.h - 5)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.fillRect(x - 27, y + 2.5, 2.2, SQUARE.h - 5)
  ctx.fillRect(x + 20, y + 2.5, 2.2, SQUARE.h - 5)
}

/** The bell plate: a round red plate with a brass boss in its middle, where the bell stands, and its cord, which runs along the lane's edge to both tunnel arches with one knot where it leaves the plate. */
function plate(ctx: Ctx, c: number, r: number, own: boolean): void {
  const x = centreX(c), y = centreY(r) + 6
  // The wire: from the plate to the edge of its rails, and along that edge to both ends.
  const edge = own ? ORIGIN.x + (c + 1) * SQUARE.w - 9 : ORIGIN.x + (c + 1) * SQUARE.w + 9
  ctx.fillStyle = '#d9a441'
  ctx.fillRect(x, y - 2, edge - x, 4)
  ctx.fillRect(edge - 2, LANES.y + 4, 4, LANES.h - 8)
  // One knot, where the cord from the plate meets the cord along the lane. Nothing on it is spaced in a row.
  ellipse(ctx, edge, y, 6.5, 6.5)
  ctx.fill()
  ctx.fillStyle = 'rgba(46, 26, 12, 0.3)'
  ellipse(ctx, x + 5, y + 6, 40, 30)
  ctx.fill()
  ctx.fillStyle = '#c0392f'
  ellipse(ctx, x, y + 4, 40, 30)
  ctx.fill()
  ctx.fillStyle = '#ef5d50'
  ellipse(ctx, x, y, 40, 30)
  ctx.fill()
  ctx.fillStyle = '#fff4ea'
  ellipse(ctx, x, y, 31, 22.5)
  ctx.fill()
  ctx.fillStyle = '#ef5d50'
  ellipse(ctx, x, y, 26, 18.5)
  ctx.fill()
  // The boss the bell stands on, so the plate is never an empty ring.
  ctx.fillStyle = '#b07b1f'
  ellipse(ctx, x, y + 1, 15, 9)
  ctx.fill()
  ctx.fillStyle = '#f4c542'
  ellipse(ctx, x, y - 1, 12, 7)
  ctx.fill()
}

/** A zebra crossing printed across one square of a road. */
function zebra(ctx: Ctx, c: number, r: number): void {
  const x = ORIGIN.x + c * SQUARE.w, y = ORIGIN.y + r * SQUARE.h
  ctx.fillStyle = INK.roadLine
  ctx.globalAlpha = 0.9
  for (let n = 0; n < 5; n++) {
    roundRect(ctx, x + 12 + n * 20.5, y + 14, 12, SQUARE.h - 28, 3)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

/** One small printed thing, drawn round (0, 0) in about thirty units. Flat ink, no shadow: it is print. */
function print(ctx: Ctx, what: Print['what'], turn: number): void {
  const dot = (x: number, y: number, rx: number, ry: number, fill: string) => {
    ctx.fillStyle = fill
    ellipse(ctx, x, y, rx, ry)
    ctx.fill()
  }
  switch (what) {
    case 'molehill':
      dot(0, 4, 17, 9, '#6f4a2c')
      dot(0, 0, 14, 9, '#8a5f3a')
      dot(-3, -3, 5, 3, '#a87a4e')
      break
    case 'mushrooms':
      for (const [dx, k] of [[-7, 1], [8, 0.7]] as const) {
        ctx.fillStyle = '#fff4ea'
        roundRect(ctx, dx - 3 * k, -2 * k, 6 * k, 11 * k, 3)
        ctx.fill()
        dot(dx, -3 * k, 10 * k, 6.5 * k, '#e2504c')
        dot(dx - 3 * k, -5 * k, 2 * k, 1.6 * k, '#fff4ea')
        dot(dx + 4 * k, -3 * k, 1.8 * k, 1.4 * k, '#fff4ea')
      }
      break
    case 'flowers':
      daisy(ctx, -7, -3, 3.6)
      daisy(ctx, 7, 4, 3.2, '#ffd7e6')
      daisy(ctx, 6, -8, 2.6)
      break
    case 'stone':
      dot(0, 2, 13, 8, '#9aa3a6')
      dot(-3, -1, 7, 4, '#b9c1c3')
      dot(12, 6, 5, 3.5, '#9aa3a6')
      break
    case 'clover':
      for (let n = 0; n < 3; n++) dot(Math.cos(n * 2.1 + turn) * 5, Math.sin(n * 2.1 + turn) * 5, 5, 5, '#4f9f3f')
      dot(11, 7, 3.4, 3.4, '#4f9f3f')
      break
    case 'puddle':
      dot(0, 0, 19, 10, '#7c8ea3')
      dot(9, 5, 10, 6, '#7c8ea3')
      dot(-5, -2, 8, 3, '#a9b9cb')
      break
    case 'manhole':
      dot(0, 0, 14, 11, '#3f4854')
      dot(0, 0, 10.5, 8, '#6d7886')
      ctx.fillStyle = '#3f4854'
      for (const dy of [-3.6, 0, 3.6]) ctx.fillRect(-7, dy - 1, 14, 2)
      break
    case 'patch':
      ctx.fillStyle = '#4a5562'
      roundRect(ctx, -16, -9, 30, 19, 5)
      ctx.fill()
      break
    case 'skid':
      // One curved smear where somebody braked and swerved.
      ctx.fillStyle = '#3f4854'
      ctx.rotate(turn * 0.6)
      ctx.beginPath()
      ctx.moveTo(-16, 10)
      ctx.quadraticCurveTo(-6, -12, 16, -9)
      ctx.quadraticCurveTo(18, -6, 15, -3)
      ctx.quadraticCurveTo(-2, -5, -10, 13)
      ctx.quadraticCurveTo(-14, 14, -16, 10)
      ctx.closePath()
      ctx.fill()
      break
    case 'leaf':
      ctx.fillStyle = '#d98b2b'
      ctx.beginPath()
      ctx.ellipse(0, 0, 11, 5.5, turn, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = '#c0621f'
      ctx.beginPath()
      ctx.ellipse(11, 7, 7, 3.5, turn + 1, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'lily':
      // Small and pale, printed under the waves: nothing to stand on.
      ctx.fillStyle = '#7fcfb4'
      ctx.beginPath()
      ctx.moveTo(0, 0)
      ctx.arc(0, 0, 12, turn + 0.4, turn + Math.PI * 2 - 0.2)
      ctx.closePath()
      ctx.fill()
      daisy(ctx, 3, -2, 2.6, '#ffd7e6')
      break
    case 'rushes':
      ctx.fillStyle = '#2f93b8'
      for (const dx of [-8, 0, 8]) {
        ctx.beginPath()
        ctx.moveTo(dx - 2.5, 10)
        ctx.quadraticCurveTo(dx - 3, -6, dx + 1, -13)
        ctx.quadraticCurveTo(dx + 3, -6, dx + 2.5, 10)
        ctx.fill()
      }
      break
    case 'ring':
      ctx.strokeStyle = 'rgba(201, 236, 255, 0.8)'
      ctx.lineWidth = 2.4
      // A ripple: broken arcs, never a closed ring.
      for (const [rx, ry, from, to] of [[13, 7, 0.25, 1.35], [13, 7, 3.4, 4.5], [6, 3, 1.9, 3.1], [6, 3, 5.1, 6.1]] as const) {
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, from, to)
        ctx.stroke()
      }
      break
    case 'pebbles':
      dot(-8, 2, 6, 4, '#2c8fd0')
      dot(4, -3, 7.5, 4.5, '#2c8fd0')
      dot(10, 6, 4, 2.8, '#2c8fd0')
      break
    case 'plate':
      dot(0, 0, 15, 10.5, '#ffffff')
      dot(0, 0, 10, 6.5, '#e9e2d6')
      dot(-2, -1, 5, 3, '#f2c9a0')
      break
    case 'sandwich':
      ctx.fillStyle = '#f2d7a0'
      ctx.beginPath()
      ctx.moveTo(-14, 8)
      ctx.lineTo(2, -11)
      ctx.lineTo(15, 8)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#6fbf5a'
      ctx.fillRect(-12, 3, 25, 3)
      ctx.fillStyle = '#b8743a'
      ctx.fillRect(-14, 7, 29, 3)
      break
    case 'apple':
      dot(0, 1, 9.5, 9, '#d7263d')
      dot(-3, -2, 3, 2.4, '#f08a8f')
      ctx.fillStyle = '#5a8f3a'
      ctx.beginPath()
      ctx.ellipse(5, -9, 5, 2.4, -0.6, 0, Math.PI * 2)
      ctx.fill()
      break
    case 'cup':
      dot(0, 5, 14, 5.5, '#ffffff')
      ctx.fillStyle = '#5b79c4'
      roundRect(ctx, -8, -8, 16, 13, 4)
      ctx.fill()
      dot(0, -8, 8, 3, '#8a5a3c')
      break
    case 'jam':
      ctx.fillStyle = '#b0304a'
      roundRect(ctx, -8, -6, 16, 16, 4)
      ctx.fill()
      ctx.fillStyle = '#f4c542'
      roundRect(ctx, -9.5, -11, 19, 6, 2.5)
      ctx.fill()
      break
    case 'grapes':
      for (const [dx, dy] of [[-6, -4], [3, -5], [-2, 3], [7, 3], [2, 10]]) dot(dx, dy, 5, 5, '#7a4fb0')
      break
    case 'carrot':
      ctx.fillStyle = '#ef8a2e'
      ctx.beginPath()
      ctx.moveTo(-13, 6)
      ctx.lineTo(9, -6)
      ctx.lineTo(11, 1)
      ctx.closePath()
      ctx.fill()
      ctx.fillStyle = '#4f9f3f'
      ellipse(ctx, 14, -6, 6, 3.5, -0.5)
      ctx.fill()
      break
    case 'prints':
      for (const [dx, dy] of [[-9, 4], [0, -4], [9, 4]]) {
        dot(dx, dy, 3.4, 5, '#5fae43')
        dot(dx, dy - 6.5, 2, 2, '#5fae43')
      }
      break
    case 'gravel':
      dot(-9, 2, 4, 3, '#a8946f')
      dot(1, -4, 5, 3.4, '#a8946f')
      dot(9, 5, 3.4, 2.6, '#a8946f')
      dot(-2, 8, 3, 2.2, '#a8946f')
      break
  }
}

function prints(ctx: Ctx, c: number, column: Column): void {
  for (const one of column.prints) {
    ctx.save()
    ctx.translate(centreX(c) + one.dx * (SQUARE.w / 2 - 24), centreY(one.r) + one.dy * (SQUARE.h / 2 - 20))
    print(ctx, one.what, one.turn)
    ctx.restore()
  }
}

/** A standing card on its little stand: the white die-cut edge, the hard shadow, and whatever `face` prints on it. */
export function card(ctx: Ctx, x: number, y: number, w: number, h: number, face: () => void): void {
  ctx.fillStyle = INK.shadow
  roundRect(ctx, x - w / 2 + SHADOW_OFFSET.x, y - h + SHADOW_OFFSET.y, w, h, 10)
  ctx.fill()
  ctx.fillStyle = '#fffaf0'
  roundRect(ctx, x - w / 2, y - h, w, h, 10)
  ctx.fill()
  face()
  // The stand it is slotted into.
  ctx.fillStyle = '#3d6fb0'
  roundRect(ctx, x - w * 0.36, y - 6, w * 0.72, 10, 5)
  ctx.fill()
}

const BLEED: Partial<Record<LaneKind, string>> = { road: INK.road[0], river: INK.river[0], rails: INK.bed[0], railroad: INK.road[0] }

/**
 * Paints everything that stands still, in stage units, onto a context whose transform is already set. The same
 * scenery gives the same picture, print for print. `weave` is the tier's: without it the linen and the table
 * are flat colour. With no scenery it paints the table and the bare linen, which is what shows before the slot
 * has been read.
 */
export function paintBackdrop(ctx: Ctx, scenery: Scenery | null, weave: boolean): void {
  const rng = makeRng(20261011)
  table(ctx, rng, weave)
  linen(ctx, weave, scenery !== null && scenery.columns[0].kind === 'bank')
  if (!scenery) return
  for (let c = 0; c < COLS; c++) {
    const column = scenery.columns[c], kind = column.kind
    const marks = makeRng(column.seed ^ 0x2f)
    for (let r = 0; r < ROWS; r++) {
      if (kind === 'road') road(ctx, c, r)
      else if (kind === 'river') river(ctx, c, r, marks)
      else if (kind === 'cloth') cloth(ctx, c, r)
      else if (hasRails(kind)) rails(ctx, c, r, kind === 'railroad')
      else grass(ctx, c, r, marks)
    }
    // Water, road and rails run off over the board's border at both ends, under the cards that stand there.
    const bleed = BLEED[kind]
    if (bleed) {
      ctx.fillStyle = bleed
      ctx.fillRect(ORIGIN.x + c * SQUARE.w + 2.5, LANES.y - BORDER + 3, SQUARE.w - 5, BORDER - 3)
      ctx.fillRect(ORIGIN.x + c * SQUARE.w + 2.5, LANES.y + LANES.h, SQUARE.w - 5, BORDER - 3)
    }
    if (column.zebra >= 0) zebra(ctx, c, column.zebra)
    prints(ctx, c, column)
  }
  // The plates and their wires lie over the prints.
  for (let c = 0; c < COLS; c++) if (scenery.columns[c].plate >= 0) plate(ctx, c, scenery.columns[c].plate, scenery.columns[c].plateOwn)
  // The folds: a crease with a dark side and a light side, where the cloth of each crossing begins.
  for (const x of [FOLD_X - SLIDE, FOLD_X]) {
    ctx.fillStyle = 'rgba(70, 50, 30, 0.28)'
    ctx.fillRect(x - 1.5, LANES.y - BORDER, 2, LANES.h + BORDER * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)'
    ctx.fillRect(x + 0.5, LANES.y - BORDER, 1.5, LANES.h + BORDER * 2)
  }
  // What stands at the far ends, and then what stands and lies at the near ends, in front of the board.
  for (let c = 0; c < COLS; c++) paintFar(ctx, scenery.columns[c].far, centreX(c), scenery.columns[c].seed)
  for (let c = 0; c < COLS; c++) paintNear(ctx, scenery.columns[c].near, centreX(c), scenery.columns[c].seed)
}

/**
 * The picture the board slides across: the crossing that is left on the left of the fold, and the next one from
 * the fold on, one slide's length further along. A context this much wider than the surface holds both.
 */
export function paintSlide(ctx: Ctx, from: Scenery, to: Scenery, weave: boolean): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(-4000, -4000, 4000 + FOLD_X, 8000 + STAGE.height)
  ctx.clip()
  paintBackdrop(ctx, from, weave)
  ctx.restore()
  ctx.save()
  ctx.translate(SLIDE, 0)
  ctx.beginPath()
  ctx.rect(FOLD_X - SLIDE, -4000, 8000, 8000 + STAGE.height)
  ctx.clip()
  paintBackdrop(ctx, to, weave)
  ctx.restore()
}
