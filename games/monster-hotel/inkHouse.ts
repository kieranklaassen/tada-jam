// The building, drawn once for each size of page into one layer: the paper,
// the night or day sky, the roof, the cut walls and floors, each room's few
// sticks of furniture, the foundations with the boiler, the lobby with its
// cupboard, and the street. All of it is black line and hatching: nothing here
// can be touched, so nothing here has the spot colour.

import type { Phase } from './guests'
import { SHAPES, type House } from './hotel'
import { PAPER, mulberry32, type Pen } from './inkHatch'
import { drawBench, drawBoiler, drawCoach, drawLuggage, drawPalm } from './inkProps'
import type { PageLayout, Rect, RoomLayout } from './layout'

/** Runs `draw` in the drawing's own units, with the origin moved and, when asked, the picture mirrored. */
export function local(pen: Pen, x: number, y: number, scale: number, flip: boolean, draw: () => void): void {
  const g = pen.ctx
  g.save()
  g.translate(x, y)
  g.scale(flip ? -scale : scale, scale)
  draw()
  g.restore()
}

const corners = (r: Rect): number[] => [r.x, r.y, r.x + r.w, r.y, r.x + r.w, r.y + r.h, r.x, r.y + r.h]

/** The paper: flat cream, with a faint speck of fibre where the tier affords it. */
export function paintPaper(g: CanvasRenderingContext2D, width: number, height: number, speckle: boolean): void {
  g.fillStyle = PAPER
  g.fillRect(0, 0, width, height)
  if (!speckle) return
  const rng = mulberry32(7411)
  const count = Math.round((width * height) / 900)
  for (let i = 0; i < count; i++) {
    const x = rng() * width, y = rng() * height, dark = rng() < 0.6
    g.fillStyle = dark ? 'rgba(96, 78, 52, 0.07)' : 'rgba(255, 252, 240, 0.35)'
    g.fillRect(x, y, 0.6 + rng() * 1.6, 0.6 + rng() * 0.9)
  }
}

/** One room: its back wall, door, lamp and bed, in the room's own units from its top left corner. */
function paintRoom(pen: Pen, room: RoomLayout, u: number, seed: number): void {
  const r = room.rect, w = r.w / u, h = r.h / u
  const right = room.bedSide === 'right'
  pen.rect(r.x, r.y, r.w, r.h, { fill: PAPER, w: 0 })
  // Mirrored for a bed on the left, so the furniture is drawn once, for a bed on the right.
  local(pen, right ? r.x : r.x + r.w, r.y, u, !right, () => {
    // Shadow gathers under the ceiling and in the corners; the middle of the wall stays bare paper.
    pen.tone([0, 0, w, 0, w, 9, 0, 13], 2, -0.5)
    pen.tone([0, 0, 9, 0, 5, h, 0, h], 1, -1.0)
    pen.tone([w - 12, 0, w, 0, w, h, w - 6, h], 2, -1.1)
    // The dado rail and the skirting.
    pen.line([0, h - 62, w, h - 62], 0.9, true)
    pen.line([0, h - 58, w, h - 58], 0.6, true)
    for (let x = 14; x < w; x += 17) pen.line([x, h - 56, x + (pen.next() - 0.5), h - 12], 0.5, true)
    pen.line([0, h - 9, w, h - 9], 1, true)
    pen.tone([0, h - 9, w, h - 9, w, h, 0, h], 2, 0)
    // The door in the back wall, a little ajar on its shadow.
    const dx = 20, dw = 56, dh = 128, dy = h - dh
    pen.rect(dx - 4, dy - 5, dw + 8, dh + 5, { fill: PAPER, w: 1.3 })
    pen.rect(dx, dy, dw, dh, { fill: PAPER, w: 1.2 })
    pen.rect(dx + 7, dy + 9, dw - 14, 46, { tone: 1, angle: -1.2, w: 0.9 })
    pen.rect(dx + 7, dy + 64, dw - 14, 54, { tone: 1, angle: -1.2, w: 0.9 })
    pen.ellipse(dx + dw - 8, dy + 62, 3, 3, { fill: PAPER, w: 1.2 })
    pen.tone([dx + dw + 4, dy - 2, dx + dw + 11, dy + 6, dx + dw + 11, h - 9, dx + dw + 4, h - 9], 3, -0.4)
    // A picture, hung a little crooked.
    const px = 148 + (seed % 3) * 5, py = 58 + (seed % 2) * 6
    local(pen, px, py, 1, false, () => {
      pen.ctx.rotate(((seed % 5) - 2) * 0.02)
      pen.line([0, -16, 11, -1], 0.6, true)
      pen.line([0, -16, -11, -1], 0.6, true)
      pen.rect(-13, 0, 26, 30, { fill: PAPER, tone: 3, w: 1.3 })
      pen.ellipse(0, 15, 7, 10, { fill: PAPER, w: 0.9 })
      pen.dot(-2, 13, 0.9)
      pen.dot(2.5, 13, 0.9)
    })
    // The lamp on its flex.
    const lx = 108
    pen.line([lx, 0, lx + 0.5, 12], 1, true)
    pen.shape([lx - 4, 12, lx + 4, 12, lx + 14, 26, lx - 14, 26], { fill: PAPER, tone: 2, angle: -1.3, w: 1.3, sharp: true })
    pen.ellipse(lx, 28, 3.6, 3.6, { fill: PAPER, w: 1 })
    for (let i = 0; i < 5; i++) {
      const a = 0.45 + i * 0.56
      pen.line([lx + Math.cos(a) * 10, 30 + Math.sin(a) * 8, lx + Math.cos(a) * 15, 30 + Math.sin(a) * 13], 0.6, true)
    }
    // The bed, side on: an iron bedstead with its head to the wall.
    const bx = w - 3 - 100, by = h - 86
    local(pen, bx, by, 1, false, () => {
      pen.tone([6, 64, 94, 64, 94, 84, 6, 84], 4, -0.2)
      pen.rect(8, 44, 84, 15, { fill: PAPER, w: 1.2 })
      for (let x = 14; x < 90; x += 7) pen.line([x, 46, x, 57], 0.5, true)
      pen.rect(4, 58, 92, 6, { fill: PAPER, tone: 3, w: 1.2 })
      // The blanket, turned down, and the pillow.
      pen.shape([6, 42, 36, 39, 64, 42, 66, 60, 56, 66, 46, 61, 36, 67, 26, 61, 16, 67, 6, 62], { fill: PAPER, tone: 1, angle: -0.7, w: 1.2 })
      pen.line([10, 47, 62, 46], 0.6)
      pen.shape([68, 43, 70, 34, 81, 31, 92, 35, 93, 43, 81, 45], { fill: PAPER, w: 1.2 })
      // Foot post, head post and their knobs.
      pen.tube([5, 30, 5, 84], 3, PAPER, 1.1, true)
      pen.tube([95, 5, 95, 84], 3, PAPER, 1.1, true)
      pen.ellipse(5, 27, 3.4, 3.4, { fill: PAPER, w: 1.2 })
      pen.ellipse(95, 3, 3.6, 3.6, { fill: PAPER, w: 1.2 })
      pen.line([95, 14, 88, 16, 85, 30, 88, 42], 1.1)
    })
  })
  pen.box(r.x, r.y, r.w, r.h, 1.5 * u, 2.5 * u)
}

/** The whole still part of the page, for this house at this hour. */
export function paintHouse(pen: Pen, page: PageLayout, house: House, phase: Phase): void {
  const u = page.scale, g = pen.ctx
  const { cols } = SHAPES[house.shape]
  const night = phase === 'night'
  const plate = page.plate, bottom = plate.y + plate.h, right = plate.x + plate.w
  const ground = page.cellar.y, street = page.kerb.y + page.kerb.h
  pen.tremble = 0.7 * u
  const boilerCols = house.fixtures.filter((f) => f.kind === 'boiler').map((f) => f.col)
  const snowCols = house.fixtures.filter((f) => f.kind === 'snow').map((f) => f.col)

  // The sky: close hatching for the night, a few light strokes for the day.
  pen.inside(corners(plate), true, () => {
    if (night) {
      // Three depths of night: ruled once to the horizon, crossed over most of the sky, ruled again at the top.
      const horizon = page.canopy.y
      pen.tone(corners(plate), 2, -0.35)
      pen.tone([plate.x, plate.y, right, plate.y, right, plate.y + (horizon - plate.y) * 0.9, plate.x, plate.y + (horizon - plate.y) * 0.72], 2, 0.85)
      pen.tone([plate.x, plate.y, right, plate.y, right, plate.y + (horizon - plate.y) * 0.5, plate.x, plate.y + (horizon - plate.y) * 0.3], 1, -1.2)
      // Stars are left as bare paper.
      const rng = mulberry32(5099)
      for (let i = 0; i < 26; i++) {
        const x = plate.x + rng() * plate.w, y = plate.y + rng() * (horizon - plate.y) * 0.85, r = (1.6 + rng() * 2) * u
        g.fillStyle = PAPER
        g.beginPath()
        g.moveTo(x, y - r * 1.7); g.lineTo(x + r * 0.55, y - r * 0.4); g.lineTo(x + r * 1.5, y); g.lineTo(x + r * 0.55, y + r * 0.4)
        g.lineTo(x, y + r * 1.7); g.lineTo(x - r * 0.55, y + r * 0.4); g.lineTo(x - r * 1.5, y); g.lineTo(x - r * 0.55, y - r * 0.4)
        g.fill()
      }
    } else {
      pen.tone([plate.x, plate.y, right, plate.y, right, plate.y + plate.h * 0.22, plate.x, plate.y + plate.h * 0.1], 1, -0.2)
    }

    // A bare tree stands behind the lobby, against the sky.
    const tree = mulberry32(2203)
    const branch = (x: number, y: number, angle: number, length: number, weight: number, depth: number): void => {
      const bend = (tree() - 0.5) * 0.5
      const mx = x + Math.cos(angle + bend) * length * 0.5, my = y + Math.sin(angle + bend) * length * 0.5
      const ex = mx + Math.cos(angle - bend) * length * 0.5, ey = my + Math.sin(angle - bend) * length * 0.5
      pen.line([x, y, mx, my, ex, ey], weight)
      if (depth <= 0) return
      const forks = depth > 3 ? 2 : tree() < 0.7 ? 2 : 3
      for (let i = 0; i < forks; i++) branch(ex, ey, angle + (i - (forks - 1) / 2) * (0.75 + tree() * 0.3) + (tree() - 0.5) * 0.3, length * (0.62 + tree() * 0.16), Math.max(0.7 * u, weight * 0.62), depth - 1)
    }
    branch(page.lobby.x + page.lobby.w * 0.64, page.canopy.y + page.canopy.h, -Math.PI / 2 - 0.08, Math.min(92 * u, (page.canopy.y - plate.y) * 0.36), 7 * u, 5)

    // The earth under everything, and the street's back wall under the lobby.
    pen.rect(plate.x - 4, ground, page.house.x + page.house.w - plate.x + 4, bottom - ground + 4, { fill: PAPER, tone: 4, angle: -0.6, w: 0 })
    pen.line([plate.x, ground, page.house.x, ground], 1.6 * u, true)
    pen.rect(page.kerb.x, page.kerb.y, right - page.kerb.x + 4, page.kerb.h, { fill: PAPER, tone: 1, angle: -1.25, w: 0 })
    pen.tone([page.kerb.x, page.kerb.y, right, page.kerb.y, right, page.kerb.y + 12 * u, page.kerb.x, page.kerb.y + 20 * u], 3, -0.8)
    const course = 19 * u
    for (let y = page.kerb.y + course, row = 0; y < street - 4 * u; y += course, row++) {
      pen.line([page.kerb.x, y, right, y], 0.6 * u, true)
      for (let x = page.kerb.x + (row % 2 ? 14 : 38) * u; x < right; x += 48 * u) pen.line([x, y - course, x + (pen.next() - 0.5) * u, y], 0.6 * u, true)
    }
    // The pavement and the kerb stone, then earth again.
    pen.rect(page.kerb.x - 2 * u, street, right - page.kerb.x + 6 * u, bottom - street + 4, { fill: PAPER, tone: 4, angle: -0.6, w: 0 })
    pen.rect(page.kerb.x - 2 * u, street, right - page.kerb.x + 6 * u, 6 * u, { fill: PAPER, tone: 1, angle: 0.1, w: 1.3 * u })
    for (let x = page.kerb.x + 30 * u; x < right; x += 52 * u) pen.line([x, street, x - 2 * u, street + 6 * u], 0.8 * u, true)
  })

  // The steps from the front door down to the street.
  const st = page.steps, count = 7, rise = st.h / count, run = st.w / count
  const stair: number[] = [st.x + st.w, st.y]
  for (let i = 0; i < count; i++) stair.push(st.x + st.w - i * run, st.y + (i + 1) * rise, st.x + st.w - (i + 1) * run, st.y + (i + 1) * rise)
  stair.push(st.x + st.w, st.y + st.h)
  pen.shape(stair, { fill: PAPER, tone: 1, angle: -1.3, w: 1.3 * u, sharp: true })

  // The roof: shingles in courses, hatched close, with the chimney behind it.
  const roof = page.roof, eaves = roof.y + roof.h, inset = Math.min(page.roofInset, roof.w * 0.3)
  local(pen, page.chimney.x, page.chimney.y, u, false, () => {
    const cw = page.chimney.w / u, ch = page.chimney.h / u
    pen.rect(0, 8, cw, ch - 8, { fill: PAPER, tone: 3, angle: -1.2, w: 1.5 })
    for (let y = 18; y < ch; y += 9) pen.line([0, y, cw, y], 0.7, true)
    pen.rect(-4, 0, cw + 8, 9, { fill: PAPER, tone: 1, w: 1.5 })
    pen.rect(5, -9, 9, 9, { fill: PAPER, tone: 4, w: 1.2 })
    pen.rect(cw - 15, -12, 9, 12, { fill: PAPER, tone: 4, w: 1.2 })
  })
  const slope = [roof.x, eaves, roof.x + inset, roof.y, roof.x + roof.w - inset, roof.y, roof.x + roof.w, eaves]
  pen.shape(slope, { fill: PAPER, tone: 4, angle: -1.15, w: 0, sharp: true })
  pen.inside(slope, true, () => {
    const pitch = 12.5 * u
    for (let y = roof.y + pitch, row = 0; y < eaves; y += pitch, row++) {
      pen.line([roof.x, y, roof.x + roof.w, y], 1.3 * u, true)
      for (let x = roof.x + (row % 2 ? 6 : 15) * u; x < roof.x + roof.w; x += 18 * u) pen.line([x, y - pitch, x + (pen.next() - 0.5) * 2 * u, y], 0.9 * u, true)
    }
  })
  // A snow hole: broken through the shingles and through the ceiling under them.
  for (const col of snowCols) {
    const bay = page.roofBays[col]
    if (!bay) continue
    const cx = bay.x + bay.w * 0.5, cy = bay.y + bay.h * 0.56
    const hole: number[] = [], rng = mulberry32(88 + col)
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2, r = (i % 2 ? 0.74 : 1) * (0.85 + rng() * 0.3)
      hole.push(cx + Math.cos(a) * 36 * u * r, cy + Math.sin(a) * 27 * u * r)
    }
    pen.shape(hole, { fill: PAPER, tone: night ? 3 : 1, angle: -0.35, w: 2 * u, sharp: true })
    pen.line([cx - 30 * u, cy - 6 * u, cx - 8 * u, cy - 2 * u], 1.2 * u, true)
    pen.line([cx + 34 * u, cy + 5 * u, cx + 12 * u, cy + 9 * u], 1.2 * u, true)
    // Snow heaped on the lower lip, and the gap in the ceiling it falls through.
    pen.shape([cx - 34 * u, cy + 22 * u, cx - 22 * u, cy + 12 * u, cx - 8 * u, cy + 17 * u, cx + 6 * u, cy + 11 * u, cx + 22 * u, cy + 16 * u, cx + 34 * u, cy + 22 * u, cx + 20 * u, cy + 27 * u, cx - 18 * u, cy + 28 * u], { fill: PAPER, w: 1.2 * u })
    pen.shape([cx - 28 * u, eaves - 3 * u, cx - 22 * u, eaves + 5 * u, cx - 27 * u, eaves + 15 * u, cx + 25 * u, eaves + 15 * u, cx + 21 * u, eaves + 7 * u, cx + 27 * u, eaves - 3 * u], { fill: PAPER, w: 0, sharp: true })
  }
  pen.shape(slope, { w: 2.2 * u, sharp: true })
  pen.rect(roof.x - 3 * u, eaves - 3 * u, roof.w + 6 * u, 6 * u, { fill: PAPER, tone: 2, angle: 0, w: 1.4 * u })
  for (const col of snowCols) {
    const bay = page.roofBays[col]
    if (!bay) continue
    const cx = bay.x + bay.w * 0.5
    pen.shape([cx - 28 * u, eaves - 5 * u, cx - 22 * u, eaves + 5 * u, cx - 27 * u, eaves + 15 * u, cx + 25 * u, eaves + 15 * u, cx + 21 * u, eaves + 7 * u, cx + 27 * u, eaves - 5 * u], { fill: PAPER, w: 0, sharp: true })
    pen.line([cx - 28 * u, eaves - 4 * u, cx - 22 * u, eaves + 5 * u, cx - 27 * u, eaves + 14 * u], 1.4 * u, true)
    pen.line([cx + 27 * u, eaves - 4 * u, cx + 21 * u, eaves + 7 * u, cx + 25 * u, eaves + 14 * u], 1.4 * u, true)
  }
  // The spindle the wheel turns on, braced on the ridge.
  const wx = page.wheel.x + page.wheel.w / 2, wy = page.wheel.y + page.wheel.h / 2
  pen.tube([wx, roof.y + 4 * u, wx, wy], 5 * u, PAPER, 1.3 * u, true)
  pen.line([wx - 26 * u, roof.y, wx, roof.y - 24 * u, wx + 26 * u, roof.y], 1.6 * u, true)
  pen.rect(wx - 30 * u, roof.y - 3 * u, 60 * u, 6 * u, { fill: PAPER, tone: 3, w: 1.3 * u })

  // The house: everything cut through is hatched close, and each room is opened in it.
  const hs = page.house
  pen.rect(hs.x, hs.y, hs.w, hs.h, { fill: PAPER, tone: 4, angle: -0.8, w: 1.8 * u })
  page.rooms.forEach((room, index) => paintRoom(pen, room, u, index * 7 + 3))

  // The foundations, with stones in them, and a boiler in the bay under its column.
  const cellar = page.cellar
  pen.rect(cellar.x, cellar.y, cellar.w, cellar.h, { fill: PAPER, tone: 4, angle: -0.5, w: 1.6 * u })
  const rng = mulberry32(311)
  for (let i = 0; i < cols * 6; i++) {
    const x = cellar.x + (0.03 + rng() * 0.94) * cellar.w, y = cellar.y + (0.14 + rng() * 0.74) * cellar.h
    const a = (9 + rng() * 10) * u, b = (6 + rng() * 6) * u
    pen.shape([x - a, y + b * 0.4, x - a * 0.7, y - b * 0.8, x + a * 0.2, y - b, x + a, y - b * 0.3, x + a * 0.8, y + b * 0.8, x - a * 0.3, y + b], { fill: PAPER, tone: 3, angle: rng() * 3, w: 1.2 * u })
  }
  for (const col of boilerCols) {
    const bay = page.cellarBays[col]
    if (!bay) continue
    pen.rect(bay.x, bay.y, bay.w, bay.h, { fill: PAPER, w: 0 })
    local(pen, bay.x, bay.y, u, false, () => drawBoiler(pen, bay.w / u, bay.h / u))
    pen.box(bay.x, bay.y, bay.w, bay.h, 1.5 * u, 2.5 * u)
  }

  // The lobby: a lean-to against the house, with the cupboard as a loft over it under a glass roof.
  const lobby = page.lobby, canopy = page.canopy, floorY = lobby.y + lobby.h, cb = page.cupboard
  pen.rect(lobby.x, cb.y, lobby.w + 4 * u, page.kerb.y - cb.y, { fill: PAPER, tone: 4, angle: -0.8, w: 1.5 * u })
  pen.rect(lobby.x, lobby.y, lobby.w, lobby.h, { fill: PAPER, w: 0 })
  pen.tone([lobby.x, lobby.y, lobby.x + lobby.w, lobby.y, lobby.x + lobby.w, lobby.y + 7 * u, lobby.x, lobby.y + 12 * u], 2, -0.5)
  pen.tone([lobby.x, lobby.y, lobby.x + 10 * u, lobby.y, lobby.x + 5 * u, floorY, lobby.x, floorY], 2, -1)
  pen.tone([lobby.x + lobby.w - 10 * u, lobby.y, lobby.x + lobby.w, lobby.y, lobby.x + lobby.w, floorY, lobby.x + lobby.w - 5 * u, floorY], 1, -1.1)
  // A dado, as in the rooms.
  pen.line([lobby.x, floorY - 60 * u, lobby.x + lobby.w, floorY - 60 * u], 0.9 * u, true)
  pen.line([lobby.x, floorY - 56 * u, lobby.x + lobby.w, floorY - 56 * u], 0.6 * u, true)
  for (let x = lobby.x + 15 * u; x < lobby.x + lobby.w; x += 17 * u) pen.line([x, floorY - 54 * u, x + (pen.next() - 0.5) * u, floorY - 13 * u], 0.5 * u, true)
  // Floor tiles, in a band of light hatching.
  pen.line([lobby.x, floorY - 11 * u, lobby.x + lobby.w, floorY - 11 * u], 0.9 * u, true)
  pen.tone([lobby.x, floorY - 11 * u, lobby.x + lobby.w, floorY - 11 * u, lobby.x + lobby.w, floorY, lobby.x, floorY], 1, 0)
  for (let x = lobby.x + 12 * u; x < lobby.x + lobby.w; x += 22 * u) pen.line([x, floorY - 11 * u, x - 6 * u, floorY], 0.6 * u, true)
  // The ladder up to the loft, at the porter's end.
  const lx = lobby.x + 16 * u
  pen.tube([lx, floorY - 2 * u, lx + 20 * u, lobby.y - 2 * u], 2.6 * u, PAPER, 1 * u, true)
  pen.tube([lx + 17 * u, floorY - 2 * u, lx + 37 * u, lobby.y - 2 * u], 2.6 * u, PAPER, 1 * u, true)
  for (let k = 1; k < 10; k++) {
    const t = k / 10, x = lx + 20 * u * t, y = floorY - 2 * u - (floorY - lobby.y) * t
    pen.line([x, y, x + 17 * u, y], 1.5 * u, true)
  }
  // A rail of pegs by the door: somebody's bowler, somebody's overcoat, a lantern.
  local(pen, lobby.x + lobby.w - 150 * u, lobby.y + 40 * u, u, false, () => {
    pen.rect(-42, 0, 84, 5, { fill: PAPER, tone: 2, angle: 0, w: 1.2 })
    for (const x of [-30, 0, 30]) pen.line([x, 3, x, 9], 2, true)
    pen.shape([-41, 15, -39, 6, -30, 2, -21, 6, -19, 15], { fill: PAPER, tone: 4, angle: 0.3, w: 1.4 })
    pen.shape([-46, 15, -30, 13, -14, 15, -30, 18], { fill: PAPER, tone: 4, w: 1.3 })
    pen.shape([-9, 12, -3, 8, 3, 8, 9, 12, 13, 52, 5, 50, 0, 54, -5, 50, -13, 52], { fill: PAPER, tone: 3, angle: 1.2, w: 1.4 })
    pen.line([0, 12, 0, 50], 0.8)
    pen.line([-3, 8, 0, 14, 3, 8], 0.9)
    pen.line([26, 12, 30, 8, 34, 12], 1.1)
    pen.rect(24, 12, 12, 16, { fill: PAPER, tone: 1, angle: 1.2, w: 1.2 })
    pen.rect(22, 28, 16, 3, { fill: PAPER, tone: 4, w: 1 })
  })
  // The loft: five pigeonholes, each with shadow under its lid, and the trapdoor the ladder goes up to.
  for (const slot of page.slots) {
    pen.rect(slot.x - 2 * u, slot.y - 2 * u, slot.w + 4 * u, slot.h + 4 * u, { fill: PAPER, w: 1.3 * u })
    pen.tone([slot.x - 2 * u, slot.y - 2 * u, slot.x + slot.w + 2 * u, slot.y - 2 * u, slot.x + slot.w + 2 * u, slot.y + 6 * u, slot.x - 2 * u, slot.y + 12 * u], 2, -0.5)
    pen.tone([slot.x - 2 * u, slot.y - 2 * u, slot.x + 6 * u, slot.y - 2 * u, slot.x + 3 * u, slot.y + slot.h + 2 * u, slot.x - 2 * u, slot.y + slot.h + 2 * u], 1, -1)
  }
  pen.rect(lobby.x - 2 * u, cb.y + cb.h - 1 * u, lobby.w + 8 * u, 4 * u, { fill: PAPER, w: 1.2 * u })
  const glass = [canopy.x, canopy.y + canopy.h, canopy.x, canopy.y, canopy.x + canopy.w, canopy.y + canopy.h * 0.55, canopy.x + canopy.w, canopy.y + canopy.h]
  pen.shape(glass, { fill: PAPER, tone: 1, angle: -1.2, w: 1.5 * u, sharp: true })
  for (let x = canopy.x + 26 * u; x < canopy.x + canopy.w; x += 26 * u) pen.line([x, canopy.y + ((x - canopy.x) / canopy.w) * canopy.h * 0.55, x, canopy.y + canopy.h], 0.9 * u, true)
  // The front door, glazed, with the night behind it.
  const fd = page.frontDoor
  pen.rect(fd.x - 4 * u, fd.y - 4 * u, fd.w + 8 * u, fd.h + 4 * u, { fill: PAPER, w: 1.4 * u })
  pen.rect(fd.x, fd.y, fd.w, fd.h, { fill: PAPER, tone: 1, w: 1.2 * u })
  pen.rect(fd.x + 6 * u, fd.y + 8 * u, fd.w - 12 * u, fd.h * 0.52, { fill: PAPER, tone: night ? 4 : 1, angle: -0.35, w: 1 * u })
  pen.line([fd.x + fd.w / 2, fd.y + 8 * u, fd.x + fd.w / 2, fd.y + 8 * u + fd.h * 0.52], 0.9 * u, true)
  pen.rect(fd.x + 6 * u, fd.y + fd.h * 0.52 + 16 * u, fd.w - 12 * u, fd.h * 0.48 - 24 * u, { tone: 2, w: 0.9 * u })
  pen.ellipse(fd.x + 9 * u, fd.y + fd.h * 0.56 + 6 * u, 2.6 * u, 2.6 * u, { fill: PAPER, w: 1.1 * u })
  local(pen, fd.x - 24 * u, floorY, u, false, () => drawPalm(pen))

  // The street: the bench and its mountain of luggage, and the coach at the kerb.
  const lg = page.luggage, bn = page.bench, co = page.coach
  local(pen, lg.x, lg.y + lg.h, u, false, () => drawLuggage(pen, lg.w / u, lg.h / u))
  local(pen, bn.x, bn.y + bn.h, u, false, () => drawBench(pen, bn.w / u, bn.h / u))
  local(pen, co.x, co.y, u, false, () => drawCoach(pen, co.w / u, co.h / u, (page.coachDoor.x - co.x) / u, page.coachDoor.w / u))

  // The plate's own rule, drawn twice as an engraver does.
  pen.tremble = 0.9 * u
  pen.box(plate.x, plate.y, plate.w, plate.h, 2 * u, 3 * u)
  pen.box(plate.x - 4 * u, plate.y - 4 * u, plate.w + 8 * u, plate.h + 8 * u, 0.8 * u, 2 * u)
}
