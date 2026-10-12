import { CAST, DIAL, DIAL_ENDS, LEDGE, PAVEMENT, RACK, RELEASE, RING, WINDOW } from './layout'
import { makeRng } from './rng'
import { STAGE } from './stage'
import { Can, PAINT, rounded, type Pen } from './stencil'

// The wall: everything that stands still, painted once. Rough brick, an old
// coat of blue-grey on its lower half, a patch rolled out in pale primer for
// the ring, the ring itself and the niche in its middle, a window, a
// drainpipe, the fixtures the controls hang from, older paint showing through,
// the pavement at its foot and the plank the pieces stand on. A frame stamps
// it whole.
//
// The ring is the course, so it is a ring; it is sprayed by hand in one line,
// with runs and overspray, and nothing on it is a mark at even steps. A beat
// is marked by what stands on it.

/** One course of brick, and one brick along it, with their joint of mortar. */
export const BRICK = { w: 76, h: 30, joint: 4 } as const

const BRICKS = ['#8b4c3c', '#7f4436', '#96553f', '#874a3d', '#7a4033', '#9a5b47', '#814838']
const MORTAR = '#5f3b33'
const PRIMER = '#dcd2ba'
const DADO = '#5b7481'

/** The part of the stage plane the surface shows, which is wider or taller than the stage on a surface of another shape. */
export type Bounds = { left: number; top: number; right: number; bottom: number }

function bricks(pen: Pen, chance: () => number, b: Bounds): void {
  pen.fillStyle = MORTAR
  pen.fillRect(b.left, b.top, b.right - b.left, b.bottom - b.top)
  const firstRow = Math.floor(b.top / BRICK.h), lastRow = Math.ceil(b.bottom / BRICK.h)
  for (let row = firstRow; row < lastRow; row++) {
    const offset = (((row % 2) + 2) % 2) * (BRICK.w / 2)
    const firstCol = Math.floor((b.left - offset) / BRICK.w), lastCol = Math.ceil((b.right - offset) / BRICK.w)
    for (let col = firstCol; col < lastCol; col++) {
      const x = col * BRICK.w + offset, y = row * BRICK.h
      pen.fillStyle = BRICKS[Math.floor(chance() * BRICKS.length)]
      pen.fillRect(x + BRICK.joint / 2, y + BRICK.joint / 2, BRICK.w - BRICK.joint, BRICK.h - BRICK.joint)
      // A worn face: a lighter edge at the top, a darker one at the foot, and a pit or two.
      pen.fillStyle = 'rgba(255, 226, 200, 0.07)'
      pen.fillRect(x + BRICK.joint / 2, y + BRICK.joint / 2, BRICK.w - BRICK.joint, 3)
      pen.fillStyle = 'rgba(30, 10, 8, 0.12)'
      pen.fillRect(x + BRICK.joint / 2, y + BRICK.h - BRICK.joint / 2 - 3, BRICK.w - BRICK.joint, 3)
      for (let i = 0; i < 3; i++) {
        pen.fillStyle = chance() < 0.5 ? 'rgba(30, 10, 8, 0.16)' : 'rgba(255, 226, 200, 0.08)'
        pen.fillRect(x + 4 + chance() * (BRICK.w - 14), y + 5 + chance() * (BRICK.h - 14), 2 + chance() * 5, 1.5 + chance() * 2)
      }
    }
  }
}

/** The mortar's grooves again, faintly, over paint that has gone on since: paint sinks into a joint. */
function grooves(pen: Pen, b: Bounds, alpha: number): void {
  pen.save()
  pen.fillStyle = `rgba(40, 22, 18, ${alpha})`
  const firstRow = Math.floor(b.top / BRICK.h), lastRow = Math.ceil(b.bottom / BRICK.h)
  for (let row = firstRow; row < lastRow; row++) {
    pen.fillRect(b.left, row * BRICK.h - 1, b.right - b.left, 2)
    const offset = (((row % 2) + 2) % 2) * (BRICK.w / 2)
    for (let x = Math.floor((b.left - offset) / BRICK.w) * BRICK.w + offset; x < b.right; x += BRICK.w) pen.fillRect(x - 1, row * BRICK.h, 2, BRICK.h)
  }
  pen.restore()
}

/** An old coat on the lower wall, flaked off brick by brick along its top edge and here and there below. */
function dado(pen: Pen, chance: () => number, b: Bounds): void {
  pen.save()
  pen.fillStyle = DADO
  for (let row = 19; row * BRICK.h < PAVEMENT.y; row++) {
    const offset = (row % 2) * (BRICK.w / 2)
    for (let x = Math.floor((b.left - offset) / BRICK.w) * BRICK.w + offset; x < b.right; x += BRICK.w) {
      const depth = row - 19
      // The top two courses are ragged; lower down a brick in fourteen has lost its paint.
      if (chance() < (depth === 0 ? 0.55 : depth === 1 ? 0.22 : 0.07)) continue
      pen.globalAlpha = 0.62 + chance() * 0.16
      pen.fillRect(x, row * BRICK.h, BRICK.w, BRICK.h)
    }
  }
  pen.globalAlpha = 0.16
  pen.fillStyle = '#1d2a30'
  pen.fillRect(b.left, PAVEMENT.y - 46, b.right - b.left, 46)
  pen.restore()
}

/** The patch of primer the ring is painted on: rolled out in upright strokes, ragged at both ends. */
function primer(can: Can, chance: () => number): void {
  const pen = can.pen, reach = RING.floor + 52, stroke = 54
  pen.save()
  pen.fillStyle = PRIMER
  for (let x = RING.x - reach; x < RING.x + reach; x += stroke - 6) {
    const mid = x + stroke / 2 - RING.x
    const half = Math.sqrt(Math.max(0, reach * reach - mid * mid))
    if (half < 40) continue
    const top = RING.y - half - chance() * 22 + 6, bottom = RING.y + half + chance() * 22 - 6
    pen.globalAlpha = 0.9 + chance() * 0.08
    pen.beginPath()
    rounded(pen, x, top, stroke, bottom - top, 10)
    pen.fill()
    // The roller ran dry at the ends.
    pen.globalAlpha = 0.35
    pen.fillRect(x + 6, top - 9, stroke - 16, 9)
    pen.fillRect(x + 10, bottom, stroke - 22, 8)
    if (chance() < 0.3) can.drip(PRIMER, x + 10 + chance() * (stroke - 20), bottom - 2, 14 + chance() * 46, 3)
  }
  pen.restore()
}

/** The course: one line sprayed by hand round the ring, and the round niche in its middle, whose rim is the ceiling. */
function ring(can: Can, chance: () => number): void {
  const pen = can.pen
  // The niche: a round recess in the wall, dark inside, where the pigeon lives.
  const inside = RING.hub - RING.rim / 2
  pen.save()
  const dark = pen.createRadialGradient(RING.x - 20, RING.y - 30, 20, RING.x, RING.y, inside)
  dark.addColorStop(0, '#3a2f33')
  dark.addColorStop(1, '#231c20')
  pen.fillStyle = dark
  pen.beginPath()
  pen.arc(RING.x, RING.y, inside, 0, Math.PI * 2)
  pen.fill()
  // The floor of the niche, where grit has gathered.
  pen.fillStyle = 'rgba(220, 210, 186, 0.16)'
  pen.beginPath()
  pen.ellipse(RING.x + 8, RING.y + inside - 9, 62, 7, 0, 0, Math.PI * 2)
  pen.fill()
  pen.restore()
  can.line(PAINT.black, RING.rim, (p) => p.arc(RING.x, RING.y, inside, 0, Math.PI * 2), 5)

  // The line: once round, its inner edge true, where the blob's feet go; its outer edge as a hand leaves it.
  can.line(PAINT.black, RING.line, (p) => p.arc(RING.x, RING.y, RING.floor + RING.line / 2, 0, Math.PI * 2), 7)
  // Where the can lingered or was held close the line is fatter, in stretches of no two lengths.
  let a = 0.4
  while (a < Math.PI * 2) {
    const long = 0.12 + chance() * 0.5, fat = 2 + chance() * 3.5
    can.line(PAINT.black, fat, (p) => p.arc(RING.x, RING.y, RING.floor + RING.line + fat / 2 - 1, a, a + long), 4)
    a += long + 0.1 + chance() * 0.7
  }
  // Runs of paint, where it was put on too wet. Under the ring they fall clear; elsewhere they are short.
  for (const [turn, long, wide] of [[1.96, 44, 2.8], [1.31, 24, 2.4], [1.02, 12, 2], [2.5, 16, 2.2], [0.35, 9, 2], [3.6, 7, 1.8], [5.4, 11, 2.2]] as const) {
    can.drip(PAINT.black, RING.x + (RING.floor + RING.line - 1) * Math.cos(turn), RING.y + (RING.floor + RING.line - 1) * Math.sin(turn), long, wide)
  }
  can.drip(PAINT.black, RING.x + 52, RING.y + RING.hub - 1, 13, 2.2)
  for (const [turn, spread, count] of [[2.4, 34, 46], [5.6, 30, 40], [4.1, 22, 26], [0.2, 18, 18]] as const) {
    can.specks(PAINT.black, RING.x + (RING.floor + RING.line + 10) * Math.cos(turn), RING.y + (RING.floor + RING.line + 10) * Math.sin(turn), spread, count)
  }
}

/** Paint from before: two swaths of mustard half rolled over, three leaves blown across the top right, and by the camera a burst that ran and the dustings of two cans that were nearly empty. */
function olderPaint(can: Can, chance: () => number): void {
  const pen = can.pen
  // Two swaths of mustard at the top left, rolled out long ago and mostly gone: one wide, over the camera, and one
  // narrow and lower, by the ring. The bare brick between them is where the ghost hand shows its tap, so that the
  // hand is not seen to press a patch of colour as if it were a button.
  pen.save()
  pen.fillStyle = '#c59a3a'
  pen.globalAlpha = 0.3
  pen.fillRect(44, 10, 150, 66)
  pen.globalAlpha = 0.22
  pen.fillRect(372, 30, 58, 44 + chance() * 12)
  pen.restore()
  // Leaves from a stencil used over and over, as if blown along the top right: three, of three sizes.
  for (const [x, y, size, lean, alpha] of [[742, 34, 1.5, 0.6, 0.3], [846, 22, 0.9, -0.9, 0.24], [928, 52, 1.15, 0.2, 0.2]] as const) {
    pen.save()
    pen.globalAlpha = alpha
    pen.translate(x, y)
    pen.rotate(lean)
    pen.scale(size, size)
    pen.fillStyle = '#d7e0d2'
    pen.beginPath()
    pen.moveTo(0, -16)
    pen.quadraticCurveTo(13, -4, 0, 16)
    pen.quadraticCurveTo(-13, -4, 0, -16)
    pen.fill()
    pen.restore()
  }
  // Between the camera and the rat, where somebody tried two cans: one burst held too close, which ran, and a
  // dusting from a can that was nearly empty. No stroke stands alone there: a lone wavy one read as a sign.
  pen.save()
  pen.globalAlpha = 0.5
  can.layer(PAINT.gold, (p) => {
    p.ellipse(120, 328, 27, 15, -0.2, 0, Math.PI * 2)
  }, 9)
  pen.restore()
  can.drip(PAINT.gold, 116, 340, 34, 3)
  can.drip(PAINT.gold, 131, 342, 15, 2.2)
  can.specks(PAINT.white, 176, 236, 30, 46)
  can.specks(PAINT.teal, 204, 268, 26, 24)
}

/** The window above the cat's ledge: an arched recess with a blind half down, a rail for the curtain and a stone sill. */
function windowAt(can: Can, b: Bounds): void {
  const pen = can.pen, w = WINDOW, right = w.x + w.w, foot = w.y + w.h, arch = w.w / 2
  const recess = (p: Pen, grow: number) => {
    p.moveTo(w.x - grow, foot)
    p.lineTo(w.x - grow, w.y + arch)
    p.arc(w.x + arch, w.y + arch, arch + grow, Math.PI, 0)
    p.lineTo(right + grow, foot)
    p.closePath()
  }
  // The stone round it, and the dark of the room.
  can.layer('#b9b2a6', (p) => recess(p, 9), 4)
  pen.save()
  pen.fillStyle = '#261f25'
  pen.beginPath()
  recess(pen, 0)
  pen.fill()
  // A lamp on somewhere inside.
  const lamp = pen.createRadialGradient(w.x + 86, foot - 60, 4, w.x + 86, foot - 60, 90)
  lamp.addColorStop(0, 'rgba(227, 162, 31, 0.38)')
  lamp.addColorStop(1, 'rgba(227, 162, 31, 0)')
  pen.fillStyle = lamp
  pen.beginPath()
  recess(pen, 0)
  pen.fill()
  // The blind, pulled down askew.
  pen.fillStyle = '#5b7481'
  pen.beginPath()
  pen.moveTo(w.x, w.y + arch)
  pen.arc(w.x + arch, w.y + arch, arch, Math.PI, 0)
  pen.lineTo(right, w.y + arch - 6)
  pen.lineTo(w.x, w.y + arch + 10)
  pen.closePath()
  pen.fill()
  // The rail the curtain hangs from.
  pen.fillStyle = '#15121a'
  pen.fillRect(w.x, w.y + arch + 12, w.w, 4)
  // The sill, standing out from the wall like the ledge below it.
  pen.fillStyle = 'rgba(20, 10, 8, 0.35)'
  pen.fillRect(w.x - 10, foot + 12, b.right - w.x + 10, 8)
  pen.fillStyle = '#a9a39a'
  pen.fillRect(w.x - 14, foot, b.right - w.x + 14, 12)
  pen.fillStyle = '#c4beb4'
  pen.fillRect(w.x - 14, foot, b.right - w.x + 14, 4)
  pen.restore()
}

/** The drainpipe down the left edge, held by brackets at three heights. */
function drainpipe(pen: Pen, b: Bounds): void {
  pen.save()
  pen.fillStyle = 'rgba(20, 10, 8, 0.3)'
  pen.fillRect(21, b.top, 5, PAVEMENT.y - b.top)
  pen.fillStyle = '#6f7a7c'
  pen.fillRect(6, b.top, 16, PAVEMENT.y - b.top)
  pen.fillStyle = '#8c989a'
  pen.fillRect(8, b.top, 4, PAVEMENT.y - b.top)
  pen.fillStyle = '#3d4446'
  for (const y of [118, 452, 690]) pen.fillRect(2, y, 24, 9)
  pen.restore()
}

/** The rack: a plank on two bricks on the pavement, under the ring. The six pieces stand on it. */
function rack(pen: Pen): void {
  const left = RACK.first - RACK.over, right = RACK.first + (RACK.slots - 1) * RACK.pitch + RACK.over
  pen.save()
  pen.fillStyle = 'rgba(20, 14, 12, 0.35)'
  pen.fillRect(left + 6, RACK.y + 18, right - left, 5)
  pen.fillStyle = '#7f4436'
  pen.fillRect(left + 26, RACK.y + 9, 46, 11)
  pen.fillRect(right - 86, RACK.y + 9, 46, 11)
  pen.fillStyle = '#b98a55'
  pen.fillRect(left, RACK.y, right - left, 10)
  pen.fillStyle = '#d2a871'
  pen.fillRect(left, RACK.y, right - left, 3)
  pen.fillStyle = 'rgba(60, 36, 18, 0.5)'
  // The grain of the wood, and a knot.
  pen.fillRect(left + 60, RACK.y + 5, 150, 1.4)
  pen.fillRect(left + 300, RACK.y + 6.5, 96, 1.2)
  pen.fillRect(left + 470, RACK.y + 4.5, 40, 1.4)
  pen.beginPath()
  pen.ellipse(left + 258, RACK.y + 5.5, 5, 2.4, 0, 0, Math.PI * 2)
  pen.fill()
  pen.restore()
}

/** What the controls and the cast hang from and sit on: the catch of the release, the dial's plate, the cat's ledge, the camera's bracket. */
function fixtures(can: Can, b: Bounds): void {
  const pen = can.pen
  // The cat's ledge: a course of stone that stands out from the wall, with its own shadow below.
  pen.save()
  pen.fillStyle = 'rgba(20, 10, 8, 0.35)'
  pen.fillRect(LEDGE.x + 4, LEDGE.y + LEDGE.h, b.right - LEDGE.x, 9)
  pen.fillStyle = '#a9a39a'
  pen.fillRect(LEDGE.x, LEDGE.y, b.right - LEDGE.x, LEDGE.h)
  pen.fillStyle = '#c4beb4'
  pen.fillRect(LEDGE.x, LEDGE.y, b.right - LEDGE.x, 5)
  pen.fillStyle = '#8c867e'
  pen.fillRect(LEDGE.x, LEDGE.y, 5, LEDGE.h)
  pen.restore()

  // The catch of the release: a plate bolted to the wall, with a spout the cord runs out of.
  can.layer(PAINT.white, (p) => rounded(p, RELEASE.x - 31, RELEASE.top - 43, 62, 46, 7), 5, [2, 2])
  can.layer(PAINT.black, (p) => {
    rounded(p, RELEASE.x - 29, RELEASE.top - 42, 58, 40, 6)
    rounded(p, RELEASE.x - 8, RELEASE.top - 6, 16, 12, 3)
  }, 5)
  // One bolt, and the scar where another was.
  can.layer(PAINT.gold, (p) => p.arc(RELEASE.x - 16, RELEASE.top - 24, 5, 0, Math.PI * 2), 0)
  can.cut(2, (p) => {
    p.moveTo(RELEASE.x + 12, RELEASE.top - 30)
    p.quadraticCurveTo(RELEASE.x + 20, RELEASE.top - 24, RELEASE.x + 15, RELEASE.top - 14)
  })

  // The dial's plate: one sweep of paint round it, thin at the slow end and fat at the fast end.
  can.layer(PAINT.white, (p) => p.arc(DIAL.x, DIAL.y, DIAL.r + 22, 0, Math.PI * 2), 6, [2, 3])
  can.layer(PAINT.black, (p) => p.arc(DIAL.x, DIAL.y, DIAL.r + 19, 0, Math.PI * 2), 6)
  can.layer(PAINT.white, (p) => {
    const steps = 40, mid = DIAL.r + 9.5
    const edge = (i: number, side: number) => {
      const t = i / steps, a = DIAL.from + (DIAL.to - DIAL.from) * t - Math.PI / 2, r = mid + side * (0.7 + 4.6 * t * t)
      return [DIAL.x + r * Math.cos(a), DIAL.y + r * Math.sin(a)] as const
    }
    p.moveTo(...edge(0, 1))
    for (let i = 1; i <= steps; i++) p.lineTo(...edge(i, 1))
    for (let i = steps; i >= 0; i--) p.lineTo(...edge(i, -1))
    p.closePath()
  }, 0)
  // A snail at the slow end and a hare at the fast end, stencilled on the wall beside the plate.
  const snail = DIAL_ENDS.snail, hare = DIAL_ENDS.hare
  can.line(PAINT.white, 5, (p) => {
    p.moveTo(snail.x - 16, snail.y + 8)
    p.quadraticCurveTo(snail.x, snail.y + 10, snail.x + 15, snail.y + 6)
    p.quadraticCurveTo(snail.x + 20, snail.y + 3, snail.x + 18, snail.y - 3)
  }, 2)
  can.line(PAINT.white, 2, (p) => {
    p.moveTo(snail.x + 18, snail.y - 3)
    p.lineTo(snail.x + 24, snail.y - 12)
    p.moveTo(snail.x + 17, snail.y - 3)
    p.lineTo(snail.x + 17, snail.y - 10)
  }, 0)
  // Its shell: a solid dome on its back with one band across it. Not a line wound in on itself, which read as a
  // letter, and not two bands side by side.
  can.layer(PAINT.white, (p) => {
    p.moveTo(snail.x - 15, snail.y + 6)
    p.bezierCurveTo(snail.x - 17, snail.y - 15, snail.x + 9, snail.y - 17, snail.x + 10, snail.y + 5)
    p.closePath()
  }, 2)
  can.cut(1.8, (p) => {
    p.moveTo(snail.x - 6, snail.y + 5)
    p.quadraticCurveTo(snail.x - 8, snail.y - 4, snail.x - 1, snail.y - 10)
  })
  can.layer(PAINT.white, (p) => {
    // The hare, at full stretch.
    p.ellipse(hare.x, hare.y, 14, 7, -0.25, 0, Math.PI * 2)
    p.moveTo(hare.x + 21, hare.y - 8)
    p.arc(hare.x + 15, hare.y - 8, 6, 0, Math.PI * 2)
    p.moveTo(hare.x - 10, hare.y + 1)
    p.arc(hare.x - 14, hare.y + 1, 4, 0, Math.PI * 2)
  }, 2)
  can.line(PAINT.white, 3, (p) => {
    p.moveTo(hare.x + 14, hare.y - 12)
    p.lineTo(hare.x + 6, hare.y - 26)
    p.moveTo(hare.x + 17, hare.y - 13)
    p.lineTo(hare.x + 15, hare.y - 22)
    p.moveTo(hare.x + 9, hare.y + 4)
    p.lineTo(hare.x + 22, hare.y + 9)
    p.moveTo(hare.x - 9, hare.y + 5)
    p.lineTo(hare.x - 24, hare.y + 11)
  }, 0)

  // The camera's bracket and its cable.
  const cam = CAST.camera
  can.line(PAINT.black, 4, (p) => {
    p.moveTo(cam.x - 60, cam.y - 26)
    p.bezierCurveTo(cam.x - 86, cam.y - 60, cam.x - 70, cam.y - 104, cam.x - 96, cam.y - 140)
  }, 3)
  can.layer(PAINT.white, (p) => rounded(p, cam.x - 76, cam.y - 30, 34, 60, 5), 4, [2, 2])
  can.layer(PAINT.black, (p) => {
    rounded(p, cam.x - 74, cam.y - 28, 30, 56, 4)
    rounded(p, cam.x - 48, cam.y - 7, 52, 14, 5)
  }, 4)
  can.drip(PAINT.black, cam.x - 64, cam.y + 26, 30, 2.2)
}

/** The pavement at the foot of the wall: slabs, a kerb of shadow, weeds in the joint, a puddle. */
function pavement(pen: Pen, chance: () => number, b: Bounds): void {
  pen.save()
  pen.fillStyle = '#77736f'
  pen.fillRect(b.left, PAVEMENT.y, b.right - b.left, b.bottom - PAVEMENT.y)
  pen.fillStyle = 'rgba(20, 14, 12, 0.4)'
  pen.fillRect(b.left, PAVEMENT.y, b.right - b.left, 7)
  pen.fillStyle = 'rgba(255, 250, 240, 0.1)'
  pen.fillRect(b.left, PAVEMENT.y + 7, b.right - b.left, 3)
  pen.strokeStyle = 'rgba(30, 24, 22, 0.45)'
  pen.lineWidth = 2
  for (let x = Math.floor(b.left / 168) * 168 + 40; x < b.right; x += 168) {
    pen.beginPath()
    pen.moveTo(x, PAVEMENT.y + 8)
    pen.lineTo(x - 12, b.bottom)
    pen.stroke()
  }
  for (let i = 0; i < 260; i++) {
    pen.fillStyle = chance() < 0.5 ? 'rgba(20, 16, 14, 0.2)' : 'rgba(255, 250, 240, 0.12)'
    pen.fillRect(b.left + chance() * (b.right - b.left), PAVEMENT.y + 9 + chance() * (b.bottom - PAVEMENT.y - 9), 1.5 + chance() * 3, 1.2 + chance() * 1.6)
  }
  // A puddle that holds a strip of the wall's colour.
  pen.fillStyle = 'rgba(38, 44, 52, 0.55)'
  pen.beginPath()
  pen.ellipse(986, PAVEMENT.y + 24, 62, 6, 0, 0, Math.PI * 2)
  pen.fill()
  pen.fillStyle = 'rgba(220, 210, 186, 0.3)'
  pen.beginPath()
  pen.ellipse(974, PAVEMENT.y + 23, 28, 2.2, 0, 0, Math.PI * 2)
  pen.fill()
  // Weeds in the joint between wall and pavement.
  for (const [x, size] of [[276, 1], [904, 0.7], [932, 1.1], [1154, 0.8], [36, 0.9]] as const) {
    for (let blade = 0; blade < 7; blade++) {
      const lean = (blade - 3) * 0.24 + (chance() - 0.5) * 0.2, tall = (14 + chance() * 20) * size
      pen.strokeStyle = blade % 2 ? '#5d7a3a' : '#7a9648'
      pen.lineWidth = 2.6
      pen.lineCap = 'round'
      pen.beginPath()
      pen.moveTo(x + blade * 2 - 6, PAVEMENT.y + 3)
      pen.quadraticCurveTo(x + blade * 2 - 6 + lean * 8, PAVEMENT.y - tall * 0.6, x + blade * 2 - 6 + lean * tall, PAVEMENT.y - tall)
      pen.stroke()
    }
  }
  pen.restore()
}

/** Paints the whole wall onto a pen whose units are stage units, out to `bounds`. */
export function paintWall(pen: Pen, density: number, bounds: Bounds): void {
  const stream = makeRng(20261011)
  const chance = () => stream.next()
  const can = new Can(pen, density, 7)
  bricks(pen, chance, bounds)
  dado(pen, chance, bounds)
  olderPaint(can, chance)
  primer(can, chance)
  grooves(pen, { left: RING.x - RING.floor - 80, top: RING.y - RING.floor - 80, right: RING.x + RING.floor + 80, bottom: PAVEMENT.y }, 0.07)
  ring(can, chance)
  windowAt(can, bounds)
  fixtures(can, bounds)
  drainpipe(pen, bounds)
  pavement(pen, chance, bounds)
  rack(pen)
  // The wall is darker towards its corners and its foot, as a wall in a lane is.
  const shade = pen.createRadialGradient(STAGE.width / 2, STAGE.height * 0.42, STAGE.height * 0.45, STAGE.width / 2, STAGE.height * 0.42, STAGE.width * 0.78)
  shade.addColorStop(0, 'rgba(20, 8, 10, 0)')
  shade.addColorStop(1, 'rgba(20, 8, 10, 0.34)')
  pen.fillStyle = shade
  pen.fillRect(bounds.left, bounds.top, bounds.right - bounds.left, bounds.bottom - bounds.top)
}
