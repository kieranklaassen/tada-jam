import { BLUE, BOARD_EDGE, INK, PAPER, RED, TINT, WHITE, YELLOW, inked, oval, poly, rect, slab, type Screens } from './look'
import { BOARD, COUNTER, CRATE, DOG, LANE_H, QUEUE, RAIL_BOX, ROLLER, SHELF_BOX, TIN, WALL, WINDOW, X0, laneTop } from './stage'

// The place the game happens in, painted once onto the plate: a street of
// gabled houses behind the stall, in thin blue line and pale dots, the
// stall's own poles and bunting, and the counter as worn wood with the things
// a stall keeper leaves on it. Everything here stands still, costs nothing a
// frame, and is fainter than anything a finger can use: far things are drawn
// in blue line, never in ink, and nothing here carries a letter, a numeral or
// a sign. Windows are plain panes with no bars that cross.

type Ctx = CanvasRenderingContext2D
type Dots = Pick<Screens, 'of'>

/** The same number every time for the same seed, 0 to 1: the street is the same street on every plate. */
const chance = (seed: number): number => {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

/** A far thing: a flat fill, a pale screen, and a thin blue line where a near thing has a black one. */
function far(ctx: Ctx, path: (c: Ctx) => void, fill: string, screen?: CanvasPattern | string, line = 2.2): void {
  ctx.beginPath()
  path(ctx)
  ctx.fillStyle = fill
  ctx.fill()
  if (screen) {
    ctx.fillStyle = screen
    ctx.fill()
  }
  ctx.lineWidth = line
  ctx.strokeStyle = BLUE
  ctx.lineJoin = 'round'
  ctx.stroke()
}

/** The ground line of the street: where the sill is, and where every house stands. */
const GROUND = WALL.y + WALL.h - 10
/** The houses, left to right: how wide each is, how tall its front, what its gable is, and its wash of colour. */
const HOUSES: readonly { w: number; tall: number; gable: 'point' | 'step' | 'bell' | 'flat'; wash: 'red' | 'yellow' | 'blue' | 'none' }[] = [
  { w: 118, tall: 122, gable: 'step', wash: 'yellow' },
  { w: 96, tall: 150, gable: 'point', wash: 'none' },
  { w: 132, tall: 108, gable: 'bell', wash: 'red' },
  { w: 104, tall: 138, gable: 'step', wash: 'blue' },
  { w: 122, tall: 116, gable: 'point', wash: 'yellow' },
  { w: 92, tall: 156, gable: 'flat', wash: 'none' },
  { w: 128, tall: 124, gable: 'bell', wash: 'blue' },
  { w: 110, tall: 142, gable: 'step', wash: 'red' },
  { w: 100, tall: 112, gable: 'point', wash: 'none' },
  { w: 136, tall: 132, gable: 'bell', wash: 'yellow' },
]

/** The street behind the stall: a far skyline, a row of gabled houses with plain panes, two lamps. Returns the figures drawn. */
function street(ctx: Ctx, dots: Dots): number {
  let drawn = 0
  ctx.save()
  ctx.beginPath()
  ctx.rect(WALL.x + 3, WALL.y + 3, WALL.w - 6, WALL.h - 6)
  ctx.clip()
  // Far roofs and one tower, as a single flat shape of dots.
  ctx.beginPath()
  ctx.moveTo(WALL.x, GROUND)
  let x = WALL.x
  for (let i = 0; x < WALL.x + WALL.w; i++) {
    const w = 46 + 50 * chance(i + 40), top = WALL.y + 64 + 44 * chance(i + 80) - (i === 9 ? 34 : 0)
    ctx.lineTo(x, top + 14)
    ctx.lineTo(x + w / 2, top)
    ctx.lineTo(x + w, top + 14)
    x += w
  }
  ctx.lineTo(WALL.x + WALL.w, GROUND)
  ctx.closePath()
  ctx.fillStyle = dots.of(ctx, BLUE, 0.36)
  ctx.fill()
  drawn++
  // The houses of the near side of the street.
  x = WALL.x + 4
  HOUSES.forEach((house, index) => {
    const top = GROUND - house.tall, w = house.w, mid = x + w / 2
    const wash = house.wash === 'red' ? dots.of(ctx, RED, 0.16) : house.wash === 'yellow' ? dots.of(ctx, YELLOW, 0.3) : house.wash === 'blue' ? dots.of(ctx, BLUE, 0.12) : undefined
    const left = x
    far(ctx, (c) => {
      c.moveTo(left, GROUND + 12)
      c.lineTo(left, top)
      if (house.gable === 'point') {
        c.lineTo(mid, top - 46)
      } else if (house.gable === 'step') {
        for (let step = 0; step < 3; step++) {
          c.lineTo(left + (step + 1) * (w / 8), top - step * 14)
          c.lineTo(left + (step + 1) * (w / 8), top - (step + 1) * 14)
        }
        c.lineTo(left + w - 3 * (w / 8), top - 42)
        for (let step = 2; step >= 0; step--) {
          c.lineTo(left + w - (step + 1) * (w / 8), top - step * 14)
          if (step > 0) c.lineTo(left + w - step * (w / 8), top - step * 14)
        }
      } else if (house.gable === 'bell') {
        c.quadraticCurveTo(left + w * 0.22, top - 8, left + w * 0.3, top - 30)
        c.quadraticCurveTo(mid, top - 58, left + w * 0.7, top - 30)
        c.quadraticCurveTo(left + w * 0.78, top - 8, left + w, top)
      } else {
        c.lineTo(left, top - 12)
        c.lineTo(left + w, top - 12)
      }
      c.lineTo(left + w, top)
      c.lineTo(left + w, GROUND + 12)
      c.closePath()
    }, index % 2 ? PAPER : WHITE, wash)
    drawn++
    // Plain panes in rows: a pane with a pale sill under it, and no bars across. Not every place has one.
    const columns = 2, rows = Math.floor((house.tall - 30) / 50)
    for (let row = 0; row < rows; row++) {
      for (let column = 0; column < columns; column++) {
        const px = left + ((column + 0.5) * w) / columns - 9, py = top + 18 + row * 50
        if (chance(index * 31 + row * 7 + column * 3) < 0.22) continue
        const lit = chance(index * 17 + row * 5 + column) > 0.78
        far(ctx, rect(px, py, 18, 26), lit ? WHITE : PAPER, lit ? dots.of(ctx, YELLOW, 0.5) : dots.of(ctx, BLUE, 0.3), 1.6)
        ctx.fillStyle = WHITE
        ctx.fillRect(px - 3, py + 26, 24, 4)
        drawn++
      }
    }
    x += w
  })
  // Two street lamps, on thin posts.
  for (const at of [WALL.x + 318, WALL.x + 884]) {
    ctx.fillStyle = BLUE
    ctx.fillRect(at - 2, WALL.y + 96, 4, GROUND - WALL.y - 96)
    far(ctx, poly([[at - 9, WALL.y + 96], [at + 9, WALL.y + 96], [at + 6, WALL.y + 74], [at - 6, WALL.y + 74]]), WHITE, dots.of(ctx, YELLOW, 0.5))
    far(ctx, poly([[at - 11, WALL.y + 74], [at + 11, WALL.y + 74], [at, WALL.y + 64]]), PAPER, dots.of(ctx, BLUE, 0.5))
    drawn += 3
  }
  // The whole street stands back behind a veil of paper, so that whoever stands at the stall is the darkest thing in the panel.
  ctx.globalAlpha = 0.42
  ctx.fillStyle = PAPER
  ctx.fillRect(WALL.x, WALL.y, WALL.w, WALL.h)
  ctx.globalAlpha = 1
  ctx.restore()
  return drawn + 1
}

/** The stall's own front, near and in ink: a striped pole at each end, the sill, the rope the queue stands behind, and a line of bunting. */
function stallFront(ctx: Ctx, dots: Dots): number {
  let drawn = 0
  // Bunting under the awning, in three swags.
  const pins = [WALL.x + 14, WALL.x + 390, WALL.x + 770, WALL.x + WALL.w - 14]
  ctx.lineWidth = 2
  ctx.strokeStyle = INK
  for (let swag = 0; swag < 3; swag++) {
    const from = pins[swag], to = pins[swag + 1], y = WALL.y + 30
    ctx.beginPath()
    ctx.moveTo(from, y)
    ctx.quadraticCurveTo((from + to) / 2, y + 22, to, y)
    ctx.stroke()
    for (let flag = 1; flag < 12; flag++) {
      const t = flag / 12, fx = from + (to - from) * t, fy = y + 44 * t * (1 - t)
      inked(ctx, poly([[fx - 7, fy], [fx + 7, fy], [fx, fy + 15]]), [RED, WHITE, YELLOW, BLUE][(flag + swag) % 4], 2, (flag + swag) % 4 === 1 ? dots.of(ctx, RED, 0.3) : undefined)
      drawn++
    }
  }
  // The sill of the window, where the customer being served stands, and the rope the two who wait stand behind.
  inked(ctx, rect(WINDOW.x, WINDOW.y + WINDOW.h - 4, WINDOW.w, 10), WHITE, 3)
  ctx.fillStyle = INK
  ctx.fillRect(QUEUE[0].x - 12, WALL.y + 96, 6, WALL.h - 96)
  ctx.fillRect(QUEUE[0].x - 12, WALL.y + WALL.h - 12, QUEUE[1].x + QUEUE[1].w - QUEUE[0].x + 12, 6)
  // The post is capped with a rounded end of its own ink, and nothing sits on top of it.
  inked(ctx, slab(QUEUE[0].x - 14, WALL.y + 88, 10, 14, 5), INK, 0)
  // The poles that hold the awning up, one at each end, with a band of red dots wound round them.
  for (const px of [WALL.x + 3, WALL.x + WALL.w - 15]) {
    inked(ctx, rect(px, WALL.y + 3, 12, WALL.h - 6), WHITE, 3)
    for (let band = 0; band < 7; band++) {
      ctx.fillStyle = RED
      ctx.beginPath()
      ctx.moveTo(px + 1.5, WALL.y + 30 + band * 34)
      ctx.lineTo(px + 10.5, WALL.y + 18 + band * 34)
      ctx.lineTo(px + 10.5, WALL.y + 32 + band * 34)
      ctx.lineTo(px + 1.5, WALL.y + 44 + band * 34)
      ctx.closePath()
      ctx.fill()
    }
    drawn += 2
  }
  return drawn + 4
}

/** The counter as worn wood: plank seams and their joints, a few knots, and the pale stains of old juice. All of it fainter than the dots it lies on. */
function wood(ctx: Ctx): number {
  const seam = '#dcb23a'
  ctx.fillStyle = seam
  let drawn = 0
  for (let y = COUNTER.y + 62; y < COUNTER.y + COUNTER.h - 20; y += 78) {
    ctx.fillRect(COUNTER.x + 4, y, COUNTER.w - 8, 2.5)
    // Where two planks meet end to end: staggered from row to row.
    for (let joint = 0; joint < 3; joint++) ctx.fillRect(COUNTER.x + 90 + ((joint * 397 + y * 3) % (COUNTER.w - 180)), y - 78, 2.5, 78)
    drawn++
  }
  for (let knot = 0; knot < 9; knot++) {
    const kx = COUNTER.x + 30 + chance(knot + 3) * (COUNTER.w - 60), ky = COUNTER.y + 24 + chance(knot + 31) * (COUNTER.h - 48)
    ctx.beginPath()
    ctx.ellipse(kx, ky, 7, 3.5, 0, 0, Math.PI * 2)
    ctx.fill()
    drawn++
  }
  // Old juice, long dried: flat pale blots of the three fruit colours, round the edges of the board and under the crate.
  const blots: readonly [number, number, number, keyof typeof TINT][] = [
    [BOARD.x - 26, BOARD.y + 40, 16, 'long'], [BOARD.x + 300, BOARD.y - 18, 12, 'middle'], [BOARD.x + 640, BOARD.y - 22, 15, 'long'], [BOARD.x + BOARD.w + 12, SHELF_BOX.y + 30, 11, 'short'],
    [CRATE.x + 30, CRATE.y + CRATE.h + 14, 14, 'middle'], [BOARD.x - 30, SHELF_BOX.y + 150, 13, 'short'], [RAIL_BOX.x + RAIL_BOX.w + 20, RAIL_BOX.y + 60, 10, 'long'],
  ]
  for (const [bx, by, r, fruit] of blots) {
    ctx.fillStyle = TINT[fruit]
    ctx.beginPath()
    for (let i = 0; i < 9; i++) {
      const a = (i / 9) * Math.PI * 2, reach = r * (0.75 + 0.5 * chance(bx + i))
      ctx.lineTo(bx + Math.cos(a) * reach * 1.3, by + Math.sin(a) * reach * 0.8)
    }
    ctx.closePath()
    ctx.fill()
    drawn++
  }
  return drawn
}

/** The rail the tin runs on: a long shallow groove in the wood, from the edge every length starts at, with a stop at each end. It is there whether a tin is or not. */
function rail(ctx: Ctx): number {
  const y = TIN.bodyY + TIN.bodyH - 6, w = RAIL_BOX.w - 24
  ctx.fillStyle = '#e6c860'
  ctx.fillRect(X0, TIN.bodyY + 6, w, TIN.bodyH - 12)
  ctx.fillStyle = '#c99f2c'
  ctx.fillRect(X0, TIN.bodyY + 6, w, 3)
  ctx.fillRect(X0, y, w, 3)
  for (const stop of [X0 - 10, X0 + w + 2]) inked(ctx, rect(stop, TIN.bodyY + 2, 8, TIN.bodyH - 4), '#d9a441', 3)
  return 5
}

/** What a stall keeper leaves about: a cloth on a peg and a stack of paper bags down the left edge, and the dog's bone under its arch. */
function clutter(ctx: Ctx, dots: Dots): number {
  // A cloth hanging from a peg beside the rail, its lower part in red dots.
  const cx = COUNTER.x + 12, cy = RAIL_BOX.y + 6
  ctx.fillStyle = INK
  ctx.fillRect(cx + 16, cy - 6, 8, 10)
  inked(ctx, poly([[cx, cy], [cx + 40, cy], [cx + 42, cy + 86], [cx + 32, cy + 80], [cx + 22, cy + 88], [cx + 10, cy + 80], [cx - 2, cy + 86]]), WHITE, 3)
  ctx.save()
  ctx.beginPath()
  ctx.rect(cx - 2, cy + 52, 46, 40)
  ctx.clip()
  inked(ctx, poly([[cx, cy], [cx + 40, cy], [cx + 42, cy + 86], [cx + 32, cy + 80], [cx + 22, cy + 88], [cx + 10, cy + 80], [cx - 2, cy + 86]]), WHITE, 3, dots.of(ctx, RED, 0.45))
  ctx.restore()
  // Paper bags, stacked flat, beside the shelf.
  // An untidy heap of three, the top one folded over: not a neat stack of bars.
  const heap: readonly [number, number, number][] = [[10, 0, 46], [15, 15, 38], [8, 31, 42]]
  heap.forEach(([dx, up, w], bag) => {
    const by = SHELF_BOX.y + SHELF_BOX.h - 22 - up
    inked(ctx, poly([[COUNTER.x + dx, by], [COUNTER.x + dx + w, by - (bag === 2 ? 7 : 0)], [COUNTER.x + dx + w + 3, by + 16], [COUNTER.x + dx - 2, by + 16 + (bag === 1 ? 3 : 0)]]), PAPER, 3, bag === 2 ? dots.of(ctx, BLUE, 0.2) : undefined)
  })
  // The dog's bone, under the sill of its arch, clear of its tail and of anything that lands on its head.
  const ox = DOG.x + DOG.w / 2, oy = DOG.y + DOG.h + 28
  inked(ctx, slab(ox - 22, oy - 5, 44, 10, 5), WHITE, 3.5)
  for (const [ex, ey] of [[-22, -6], [-22, 6], [22, -6], [22, 6]] as const) inked(ctx, oval(ox + ex, oy + ey, 7, 6), WHITE, 3.5)
  ctx.fillStyle = WHITE
  ctx.fillRect(ox - 20, oy - 3, 40, 6)
  // A peg rail over the roller's hook.
  inked(ctx, rect(ROLLER.x - 4, COUNTER.y + 3, ROLLER.w + 8, 9), '#d9a441', 3)
  return 12
}

/** Nicks a blade has left in the board, as short pale scratches: the board is a board that has been used. Painted on the board, under everything that lies on it. */
export function paintWear(ctx: Ctx): number {
  ctx.fillStyle = BOARD_EDGE
  for (let nick = 0; nick < 16; nick++) {
    // Each nick lies wholly inside one lane: none reaches the line between the lanes, where it would make a cross.
    const tall = 9 + 10 * chance(nick + 110), top = laneTop(nick % 2)
    const nx = BOARD.x + 30 + chance(nick + 70) * (BOARD.w - 60), ny = top + 6 + chance(nick + 90) * (LANE_H - 12 - tall)
    ctx.fillRect(nx, ny, 1.6, tall)
  }
  return 1
}

/** The street, behind everything in the stall's panel. Painted before the stall's own front. */
export function paintStreet(ctx: Ctx, dots: Dots): number {
  return street(ctx, dots) + stallFront(ctx, dots)
}

/** The counter's wood and what lies about on it. Painted before the board, the shelf and the dog's arch. */
export function paintCounter(ctx: Ctx, dots: Dots): number {
  return wood(ctx) + rail(ctx) + clutter(ctx, dots)
}
