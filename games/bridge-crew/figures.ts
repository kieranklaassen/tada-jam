import { INK, SHADOW, pin, rule, string, wood, type Pen } from './look'
import type { ChiefPose } from './motion'

// The characters and the furniture of the sheet, drawn as small models made
// of the same stuff as the kit: balsa blocks, cut paper, pins and string, with
// faces in pencil. Positions and sizes are in pixels; `cell` is a grid cell.

/** A flat cut-out shape with its hard shadow. */
function cutOut(pen: Pen, cell: number, colour: string, path: () => void) {
  pen.save()
  pen.translate(SHADOW.x * cell, SHADOW.y * cell)
  pen.fillStyle = INK.shadow
  pen.beginPath(); path(); pen.fill()
  pen.restore()
  pen.fillStyle = colour
  pen.beginPath(); path(); pen.fill()
}

function pencil(pen: Pen, cell: number, width = 0.022) {
  pen.strokeStyle = INK.steelDark
  pen.lineWidth = Math.max(1, cell * width)
  pen.lineCap = 'round'
}

/** A balsa crate: one unit of load, a small cube with a framed panel and a nail in each corner. No brace crosses it: a crate stands beside a numeral, and two diagonals there would read as a sign. */
export function crate(pen: Pen, x: number, y: number, cell: number) {
  const s = cell * 0.4
  cutOut(pen, cell, INK.balsa, () => pen.rect(x, y - s, s, s))
  pencil(pen, cell, 0.016)
  pen.strokeStyle = INK.balsaEdge
  pen.beginPath()
  pen.rect(x, y - s, s, s)
  pen.rect(x + s * 0.2, y - s * 0.8, s * 0.6, s * 0.6)
  pen.stroke()
  pen.fillStyle = INK.balsaEdge
  for (const [nx, ny] of [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]] as const) { pen.beginPath(); pen.arc(x + s * nx, y - s * ny, Math.max(0.6, s * 0.035), 0, Math.PI * 2); pen.fill() }
}

function wheel(pen: Pen, x: number, y: number, r: number, cell: number) {
  cutOut(pen, cell, INK.paper, () => pen.arc(x, y, r, 0, Math.PI * 2))
  pencil(pen, cell, 0.02)
  pen.beginPath(); pen.arc(x, y, r, 0, Math.PI * 2); pen.stroke()
  pen.beginPath()
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3 + 0.4; pen.moveTo(x - Math.cos(a) * r * 0.8, y - Math.sin(a) * r * 0.8); pen.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8) }
  pen.globalAlpha = 0.45; pen.stroke(); pen.globalAlpha = 1
  pin(pen, x, y, cell * 0.8, false)
}

/**
 * The post van, standing with its front axle at (x, y) on the ground and
 * facing right: a balsa chassis and cab, paper wheels on pins, two crates and
 * a tower of parcels tied with string. Its face is drawn in pencil on the cab.
 */
export function postVan(pen: Pen, x: number, y: number, cell: number, random: () => number) {
  // The axles stand a cell apart, as the model has them; everything else is drawn large enough to read a face on.
  const r = cell * 0.33, back = x - cell, bed = y - r * 1.3
  wood(pen, 'plank', back - cell * 0.62, bed, x + cell * 0.5, bed, cell * 1.3, random)
  // The cab: a balsa block with a paper window.
  const cabX = x - cell * 0.3, cabW = cell * 0.92, cabH = cell * 1.05, cabTop = bed - cell * 0.09 - cabH
  cutOut(pen, cell, INK.balsa, () => pen.roundRect(cabX, cabTop, cabW, cabH, cell * 0.08))
  pen.strokeStyle = INK.balsaGrain
  pen.lineWidth = Math.max(0.75, cell * 0.016)
  pen.beginPath()
  for (let i = 1; i < 5; i++) { pen.moveTo(cabX + cell * 0.05, cabTop + (cabH * i) / 5); pen.lineTo(cabX + cabW - cell * 0.05, cabTop + (cabH * i) / 5 + cell * 0.012) }
  pen.stroke()
  pen.fillStyle = INK.paper
  pen.beginPath(); pen.roundRect(cabX + cabW * 0.2, cabTop + cabH * 0.1, cabW * 0.7, cabH * 0.52, cell * 0.06); pen.fill()
  // The face: two pencil dots that look ahead at the gap, a brow over each, and a short flat mouth.
  const eyeY = cabTop + cabH * 0.3
  pen.fillStyle = INK.steelDark
  for (const ex of [0.52, 0.76]) { pen.beginPath(); pen.arc(cabX + cabW * ex, eyeY, cell * 0.055, 0, Math.PI * 2); pen.fill() }
  pencil(pen, cell, 0.03)
  pen.beginPath()
  pen.moveTo(cabX + cabW * 0.44, eyeY - cell * 0.12); pen.lineTo(cabX + cabW * 0.58, eyeY - cell * 0.14)
  pen.moveTo(cabX + cabW * 0.7, eyeY - cell * 0.14); pen.lineTo(cabX + cabW * 0.84, eyeY - cell * 0.12)
  pen.moveTo(cabX + cabW * 0.54, eyeY + cell * 0.17); pen.lineTo(cabX + cabW * 0.76, eyeY + cell * 0.15)
  pen.stroke()
  // The load: two crates side by side, and a leaning tower of parcels on them.
  const big = cell * 1.25
  crate(pen, back - cell * 0.56, bed - cell * 0.09, big)
  crate(pen, back - cell * 0.02, bed - cell * 0.09, big)
  for (let i = 0; i < 3; i++) {
    const w = cell * (0.62 - i * 0.1), px = back - cell * 0.32 + (i % 2 ? cell * 0.08 : -cell * 0.04), py = bed - cell * (0.62 + i * 0.32)
    cutOut(pen, cell, INK.paper, () => pen.rect(px, py - cell * 0.29, w, cell * 0.29))
    pen.strokeStyle = INK.stringTwist
    pen.lineWidth = Math.max(1, cell * 0.026)
    // A paper label in one corner: no string crosses the parcel.
    pen.beginPath(); pen.rect(px + w * 0.52, py - cell * 0.23, w * 0.36, cell * 0.12); pen.stroke()
  }
  wheel(pen, x, y - r, r, cell)
  wheel(pen, back, y - r, r, cell)
}

/**
 * The crew chief: a heron cut from drawing paper, on two balsa legs, with a
 * pencil behind its ear. It stands with its feet at (x, y), facing the gap,
 * and is drawn from a pose (motion.ts): the view never decides how it moves.
 */
export function chief(pen: Pen, x: number, y: number, cell: number, pose: ChiefPose, random: () => number, hats = 0) {
  const tall = cell * 2.5
  x -= pose.hopX * cell; y -= pose.hopY * cell
  const sway = pose.lean * cell * 0.09, bodyX = x - cell * 0.05 + sway, bodyY = y - tall * 0.52 - pose.bob * cell
  // The legs: the back one draws up under the body when it stands on one.
  const backFoot = y - pose.tuck * tall * 0.3, knee = pose.tuck * cell * 0.22
  wood(pen, 'stick', x - cell * 0.1, backFoot, x - cell * 0.06 + knee, backFoot - tall * 0.2, cell * 0.55, random)
  wood(pen, 'stick', x - cell * 0.06 + knee, backFoot - tall * 0.2, bodyX - cell * 0.02, bodyY + cell * 0.2, cell * 0.55, random)
  wood(pen, 'stick', x + cell * 0.14, y, bodyX + cell * 0.1, bodyY + cell * 0.2, cell * 0.55, random)
  cutOut(pen, cell, INK.paper, () => pen.ellipse(bodyX, bodyY, cell * 0.52, cell * 0.3, -0.35, 0, Math.PI * 2))
  // A wing, as one pencil curve.
  pencil(pen, cell)
  pen.beginPath(); pen.moveTo(bodyX - cell * 0.37, bodyY + cell * 0.04); pen.quadraticCurveTo(bodyX, bodyY + cell * 0.22, bodyX + cell * 0.31, bodyY - cell * 0.1); pen.stroke()
  // Feathers on end: short strokes standing off its back.
  if (pose.crest > 0.05) {
    pen.beginPath()
    for (let i = 0; i < 5; i++) {
      const fx = bodyX - cell * (0.42 - i * 0.16), fy = bodyY - cell * (0.2 + 0.06 * Math.sin(i * 1.7))
      pen.moveTo(fx, fy); pen.lineTo(fx - cell * 0.1 * pose.crest, fy - cell * 0.26 * pose.crest)
    }
    pen.stroke()
  }
  // The head: where the neck's reach, the preening and the peck put it.
  const reach = 0.3 + pose.neck
  let headX = x + cell * (0.46 + 0.5 * reach) + sway * 0.5, headY = y - tall * (0.98 - 0.52 * Math.max(reach, 0)) - pose.bob * cell
  let look = 0.5 + 0.35 * Math.max(reach, 0) + pose.tilt
  if (pose.preen > 0) {
    headX += (bodyX - cell * 0.22 - headX) * pose.preen; headY += (bodyY - cell * 0.3 - headY) * pose.preen
    look += (2.6 - look) * pose.preen
  }
  headX += Math.cos(look) * pose.peck * cell * 0.16; headY += Math.sin(look) * pose.peck * cell * 0.16
  const neck = () => { pen.moveTo(bodyX + cell * 0.33, bodyY - cell * 0.12); pen.bezierCurveTo(bodyX + cell * 0.75, bodyY - cell * 0.5, bodyX + cell * 0.1, headY + cell * 0.2, headX - cell * 0.08, headY) }
  pen.lineCap = 'round'
  pen.lineWidth = cell * 0.15
  pen.strokeStyle = INK.shadow
  pen.save(); pen.translate(SHADOW.x * cell, SHADOW.y * cell); pen.beginPath(); neck(); pen.stroke(); pen.restore()
  pen.strokeStyle = INK.paper
  pen.beginPath(); neck(); pen.stroke()
  pen.save()
  pen.translate(headX, headY); pen.rotate(look - 0.5)
  cutOut(pen, cell, INK.paper, () => pen.ellipse(0, 0, cell * 0.2, cell * 0.155, 0.5, 0, Math.PI * 2))
  // The beak: a long sliver of balsa.
  cutOut(pen, cell, INK.balsa, () => { pen.moveTo(cell * 0.1, -cell * 0.02); pen.lineTo(cell * 0.62, cell * 0.36); pen.lineTo(cell * 0.04, cell * 0.12); pen.closePath() })
  // The eye: a pencil dot, or a short line while it blinks.
  pen.fillStyle = INK.steelDark
  pencil(pen, cell)
  if (pose.blink > 0.5) { pen.beginPath(); pen.moveTo(-cell * 0.01, -cell * 0.02); pen.lineTo(cell * 0.1, -cell * 0.02); pen.stroke() }
  else {
    pen.beginPath(); pen.arc(cell * 0.045, -cell * 0.02, cell * 0.042, 0, Math.PI * 2); pen.fill()
    // The lid half down: a paper flap over the top of the eye, and its edge in pencil.
    if (pose.lid > 0.1) {
      pen.fillStyle = INK.paper
      pen.fillRect(-cell * 0.01, -cell * 0.07, cell * 0.11, cell * 0.05 * pose.lid)
      pen.beginPath(); pen.moveTo(-cell * 0.012, -cell * 0.07 + cell * 0.05 * pose.lid); pen.lineTo(cell * 0.1, -cell * 0.07 + cell * 0.05 * pose.lid); pen.stroke()
    }
  }
  // The crest feather droops at rest and stands when its feathers do; and the pencil behind the ear, the one warm colour on the sheet.
  const up = pose.crest
  pen.beginPath(); pen.moveTo(-cell * 0.1, -cell * 0.08); pen.quadraticCurveTo(-cell * 0.4, -cell * (0.1 + 0.3 * up), -cell * (0.5 - 0.15 * up), cell * (0.12 - 0.6 * up)); pen.stroke()
  pen.lineWidth = cell * 0.07
  pen.strokeStyle = INK.pencil
  pen.beginPath(); pen.moveTo(-cell * 0.3, -cell * 0.22); pen.lineTo(cell * 0.12, -cell * 0.12); pen.stroke()
  pen.strokeStyle = INK.steelDark
  pen.beginPath(); pen.moveTo(cell * 0.12, -cell * 0.12); pen.lineTo(cell * 0.17, -cell * 0.108); pen.stroke()
  // A hat it plucked off a part of the bridge: a paper cone, worn until the next sheet.
  // One on another when it has plucked more than one: up to the bus's three.
  for (let i = 0; i < Math.min(3, hats); i++) cutOut(pen, cell, INK.paper, () => { const up = cell * 0.17 * i; pen.moveTo(-cell * 0.2, -cell * 0.1 - up); pen.lineTo(cell * 0.2, -cell * 0.16 - up); pen.lineTo(-cell * 0.04, -cell * 0.5 - up); pen.closePath() })
  pen.restore()
}

/** The model the chief is fiddling with: three offcuts pinned in a triangle, standing at (x, y). */
export function chiefModel(pen: Pen, x: number, y: number, cell: number, random: () => number) {
  const s = cell * 0.5
  const corners: [number, number][] = [[x, y - cell * 0.08], [x + s, y - cell * 0.08], [x + s / 2, y - cell * 0.08 - s * 0.8]]
  corners.forEach((from, i) => { const to = corners[(i + 1) % 3]; wood(pen, 'stick', from[0], from[1], to[0], to[1], cell * 0.5, random) })
  corners.forEach(([cx, cy]) => pin(pen, cx, cy, cell * 0.55, false))
}

/** The tray of parts under the gap: a drawn box with a pile of each kind in the kit, as many as the kit holds. */
export function tray(pen: Pen, x: number, y: number, wide: number, cell: number, kit: { plank: number; stick: number; tube: number; thread: number }, random: () => number) {
  const tall = cell * 2.1
  pen.fillStyle = INK.sheetDeep
  pen.globalAlpha = 0.55
  pen.beginPath(); pen.roundRect(x, y, wide, tall, cell * 0.12); pen.fill()
  pen.globalAlpha = 1
  const corners: [number, number][] = [[x, y], [x + wide, y], [x + wide, y + tall], [x, y + tall]]
  corners.forEach((from, i) => rule(pen, ...from, ...corners[(i + 1) % 4], cell * 0.04, 0.9, random))
  const bays = (['plank', 'stick', 'tube', 'thread'] as const).filter((kind) => kit[kind] > 0)
  const bay = wide / bays.length
  bays.forEach((kind, b) => {
    const left = x + b * bay
    if (b) rule(pen, left, y + cell * 0.2, left, y + tall - cell * 0.2, cell * 0.02, 0.5, random)
    const long = Math.min(bay - cell * 0.9, cell * 3.2), cx = left + (bay - long) / 2, base = y + tall - cell * 0.45
    const count = Math.min(kit[kind], 7)
    for (let i = 0; i < count; i++) {
      const lift = (i * cell * 1.15) / Math.max(count, 4), skew = (random() - 0.5) * cell * 0.1
      if (kind === 'plank') wood(pen, 'plank', cx + skew, base - lift, cx + long + skew, base - lift - cell * 0.02, cell, random)
      if (kind === 'stick') wood(pen, 'stick', cx + skew * 2, base - lift * 0.7, cx + long * 0.92 + skew, base - lift * 0.7 - (i % 3) * cell * 0.09, cell, random)
      if (kind === 'tube') wood(pen, 'tube', cx + skew, base - i * cell * 0.3, cx + long + skew, base - i * cell * 0.3, cell, random)
    }
    if (kind === 'thread') {
      // A spool: two balsa cheeks on a core wound with string, and a loose end.
      const mid = left + bay / 2, top = y + cell * 0.45, low = y + tall - cell * 0.45
      for (let i = 0; i < 9; i++) string(pen, mid - cell * 0.42, top + ((low - top) * (i + 0.6)) / 10, mid + cell * 0.42, top + ((low - top) * (i + 1)) / 10, cell * 1.6)
      wood(pen, 'plank', mid - cell * 0.62, top, mid + cell * 0.62, top, cell, random)
      wood(pen, 'plank', mid - cell * 0.62, low, mid + cell * 0.62, low, cell, random)
      string(pen, mid + cell * 0.42, low - cell * 0.12, mid + cell * 1.25, low - cell * 0.02, cell, 0.12)
    }
  })
}

/** The next sheet, waiting as a roll at the right edge: paper outside, blue inside, held by a paper band. */
export function roll(pen: Pen, x: number, y: number, tall: number, cell: number) {
  const wide = cell * 0.62
  cutOut(pen, cell, INK.paper, () => pen.roundRect(x - wide / 2, y - tall, wide, tall, wide * 0.3))
  pen.fillStyle = INK.paperShade
  pen.globalAlpha = 0.8
  pen.fillRect(x + wide * 0.12, y - tall + wide * 0.2, wide * 0.3, tall - wide * 0.4)
  pen.globalAlpha = 1
  // The end of the roll, where the blue inside shows as a spiral.
  pen.fillStyle = INK.sheetDeep
  pen.beginPath(); pen.ellipse(x, y - tall, wide / 2, wide * 0.2, 0, 0, Math.PI * 2); pen.fill()
  pen.strokeStyle = INK.paper
  pen.lineWidth = Math.max(1, cell * 0.025)
  pen.beginPath(); pen.ellipse(x, y - tall, wide * 0.32, wide * 0.12, 0, 0.6, Math.PI * 2 + 2.4); pen.stroke()
  pen.beginPath(); pen.ellipse(x, y - tall, wide * 0.15, wide * 0.05, 0, 0, Math.PI * 2); pen.stroke()
  // The band.
  pen.fillStyle = INK.balsa
  pen.fillRect(x - wide / 2, y - tall * 0.45, wide, cell * 0.2)
  pen.fillStyle = INK.balsaEdge
  pen.fillRect(x - wide / 2, y - tall * 0.45 + cell * 0.16, wide, cell * 0.04)
}
