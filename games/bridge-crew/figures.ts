import { INK, SHADOW, pin, rule, string, wood, type Pen } from './look'

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

/** A balsa crate: one unit of load, a small cube with its two pencil diagonals. */
export function crate(pen: Pen, x: number, y: number, cell: number) {
  const s = cell * 0.4
  cutOut(pen, cell, INK.balsa, () => pen.rect(x, y - s, s, s))
  pencil(pen, cell, 0.016)
  pen.strokeStyle = INK.balsaEdge
  pen.beginPath()
  pen.rect(x, y - s, s, s)
  pen.moveTo(x, y - s); pen.lineTo(x + s, y); pen.moveTo(x + s, y - s); pen.lineTo(x, y)
  pen.stroke()
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
    pen.beginPath(); pen.moveTo(px + w / 2, py - cell * 0.29); pen.lineTo(px + w / 2, py); pen.moveTo(px, py - cell * 0.145); pen.lineTo(px + w, py - cell * 0.145); pen.stroke()
  }
  wheel(pen, x, y - r, r, cell)
  wheel(pen, back, y - r, r, cell)
}

/**
 * The crew chief: a heron cut from drawing paper, on two balsa legs, with a
 * pencil behind its ear. It stands with its feet at (x, y) and looks down at
 * the small model in front of it.
 */
export function chief(pen: Pen, x: number, y: number, cell: number, random: () => number) {
  const tall = cell * 2.5
  wood(pen, 'stick', x - cell * 0.1, y, x - cell * 0.06, y - tall * 0.42, cell * 0.55, random)
  wood(pen, 'stick', x + cell * 0.14, y, x + cell * 0.06, y - tall * 0.42, cell * 0.55, random)
  const bodyY = y - tall * 0.52
  cutOut(pen, cell, INK.paper, () => pen.ellipse(x - cell * 0.05, bodyY, cell * 0.52, cell * 0.3, -0.35, 0, Math.PI * 2))
  // A wing, as one pencil curve, and three tail feathers.
  pencil(pen, cell)
  pen.beginPath(); pen.moveTo(x - cell * 0.42, bodyY + cell * 0.04); pen.quadraticCurveTo(x - cell * 0.05, bodyY + cell * 0.22, x + cell * 0.26, bodyY - cell * 0.1); pen.stroke()
  // The neck, an S of paper, and the head bent to the model.
  const headX = x + cell * 0.62, headY = y - tall * 0.9
  const neck = () => { pen.moveTo(x + cell * 0.28, bodyY - cell * 0.12); pen.bezierCurveTo(x + cell * 0.7, bodyY - cell * 0.5, x + cell * 0.05, headY + cell * 0.2, headX - cell * 0.08, headY) }
  pen.lineCap = 'round'
  pen.lineWidth = cell * 0.15
  pen.strokeStyle = INK.shadow
  pen.save(); pen.translate(SHADOW.x * cell, SHADOW.y * cell); pen.beginPath(); neck(); pen.stroke(); pen.restore()
  pen.strokeStyle = INK.paper
  pen.beginPath(); neck(); pen.stroke()
  cutOut(pen, cell, INK.paper, () => pen.ellipse(headX, headY, cell * 0.17, cell * 0.13, 0.5, 0, Math.PI * 2))
  // The beak: a long sliver of balsa, pointing down at the model.
  cutOut(pen, cell, INK.balsa, () => { pen.moveTo(headX + cell * 0.1, headY - cell * 0.02); pen.lineTo(headX + cell * 0.62, headY + cell * 0.36); pen.lineTo(headX + cell * 0.04, headY + cell * 0.12); pen.closePath() })
  pen.fillStyle = INK.steelDark
  pen.beginPath(); pen.arc(headX + cell * 0.04, headY - cell * 0.02, cell * 0.03, 0, Math.PI * 2); pen.fill()
  // A drooping crest feather, and the pencil behind the ear: the one warm colour on the sheet.
  pencil(pen, cell)
  pen.beginPath(); pen.moveTo(headX - cell * 0.1, headY - cell * 0.08); pen.quadraticCurveTo(headX - cell * 0.4, headY - cell * 0.1, headX - cell * 0.5, headY + cell * 0.12); pen.stroke()
  pen.lineWidth = cell * 0.07
  pen.strokeStyle = INK.pencil
  pen.beginPath(); pen.moveTo(headX - cell * 0.3, headY - cell * 0.22); pen.lineTo(headX + cell * 0.12, headY - cell * 0.12); pen.stroke()
  pen.strokeStyle = INK.steelDark
  pen.beginPath(); pen.moveTo(headX + cell * 0.12, headY - cell * 0.12); pen.lineTo(headX + cell * 0.17, headY - cell * 0.108); pen.stroke()
  // The model it is fiddling with: three offcuts pinned in a triangle.
  const mx = x + cell * 1.0, s = cell * 0.5
  const corners: [number, number][] = [[mx, y - cell * 0.08], [mx + s, y - cell * 0.08], [mx + s / 2, y - cell * 0.08 - s * 0.8]]
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
