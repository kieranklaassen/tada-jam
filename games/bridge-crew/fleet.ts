import type { VehiclePose } from './acts'
import { crate } from './figures'
import { INK, SHADOW, pin, wood, type Pen } from './look'
import type { VehicleId } from './sites'
import { drawWhole } from './symbols'
import { VEHICLES } from './vehicles'

// The vehicles drawn: small models made of the kit's own stuff (balsa blocks,
// cut paper, pins for axles, string), with faces in pencil. Each is drawn in
// its own frame, with its front axle on the ground at the origin and the road
// running back along the negative x, from a pose (acts.ts): this file never
// decides how a vehicle moves.
//
// The numeral beside a vehicle's crates names how many crates it carries, the
// load the bridge is asked for. It is drawn through symbols.ts and nowhere else.

function cutOut(pen: Pen, c: number, colour: string, path: () => void) {
  pen.save()
  pen.translate(SHADOW.x * c, SHADOW.y * c)
  pen.fillStyle = INK.shadow
  pen.beginPath(); path(); pen.fill()
  pen.restore()
  pen.fillStyle = colour
  pen.beginPath(); path(); pen.fill()
}

function pencil(pen: Pen, c: number, width = 0.026) {
  pen.strokeStyle = INK.steelDark
  pen.fillStyle = INK.steelDark
  pen.lineWidth = Math.max(1, c * width)
  pen.lineCap = 'round'
}

function wheel(pen: Pen, x: number, y: number, r: number, c: number, spin: number) {
  cutOut(pen, c, INK.paper, () => pen.arc(x, y, r, 0, Math.PI * 2))
  pencil(pen, c, 0.02)
  pen.beginPath(); pen.arc(x, y, r, 0, Math.PI * 2); pen.stroke()
  pen.globalAlpha = 0.45
  pen.beginPath()
  for (let i = 0; i < 3; i++) { const a = (i * Math.PI) / 3 + spin; pen.moveTo(x - Math.cos(a) * r * 0.8, y - Math.sin(a) * r * 0.8); pen.lineTo(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8) }
  pen.stroke()
  pen.globalAlpha = 1
  pin(pen, x, y, c * 0.8, false)
}

/**
 * A face in pencil on a paper window: two eyes that look where the pose says,
 * brows, lids that come half down when it is unimpressed and shut to two arcs,
 * and a mouth that curves with the mood or comes open and round.
 */
function face(pen: Pen, x: number, y: number, c: number, pose: Pick<VehiclePose, 'face' | 'lookX' | 'lookY' | 'gasp' | 'lids' | 'fret'>) {
  const mood = pose.face
  pen.fillStyle = INK.paper
  pen.beginPath(); pen.roundRect(x - c * 0.3, y - c * 0.26, c * 0.6, c * 0.52, c * 0.06); pen.fill()
  pencil(pen, c, 0.03)
  for (const ex of [-0.1, 0.14]) {
    const cx = x + c * ex, cy = y - c * 0.055
    if (pose.lids > 0.8) { pen.beginPath(); pen.moveTo(cx - c * 0.055, cy); pen.quadraticCurveTo(cx, cy + c * 0.04 * (mood >= 0 ? -1 : 1), cx + c * 0.055, cy); pen.stroke(); continue }
    // The white of the eye, a pupil that moves in it, and a lid across the top when it is half down.
    pen.fillStyle = '#ffffff'
    pen.beginPath(); pen.arc(cx, cy, c * 0.07, 0, Math.PI * 2); pen.fill()
    pen.fillStyle = INK.steelDark
    pen.beginPath(); pen.arc(cx + pose.lookX * c * 0.03, cy - pose.lookY * c * 0.028, c * (0.036 + 0.012 * pose.gasp), 0, Math.PI * 2); pen.fill()
    if (pose.lids > 0.25) {
      pen.fillStyle = INK.paper
      pen.beginPath(); pen.rect(cx - c * 0.08, cy - c * 0.08, c * 0.16, c * 0.085 * Math.min(1, pose.lids * 2) * 0.95); pen.fill()
      pen.beginPath(); pen.moveTo(cx - c * 0.075, cy - c * 0.08 + c * 0.08 * Math.min(1, pose.lids * 2) * 0.95); pen.lineTo(cx + c * 0.075, cy - c * 0.08 + c * 0.08 * Math.min(1, pose.lids * 2) * 0.95); pen.stroke()
    }
  }
  // Brows tip inward when it is put out and lift when it is content, and go up in the middle when it is not sure; the
  // mouth curves with the mood, or is an open round.
  const tip = 0.04 * mood - 0.06 * pose.fret
  pen.beginPath()
  pen.moveTo(x - c * 0.18, y - c * (0.18 - tip)); pen.lineTo(x - c * 0.03, y - c * (0.18 + tip))
  pen.moveTo(x + c * 0.07, y - c * (0.18 + tip)); pen.lineTo(x + c * 0.22, y - c * (0.18 - tip))
  if (pose.gasp < 0.25) { pen.moveTo(x - c * 0.07, y + c * 0.12); pen.quadraticCurveTo(x + c * 0.03, y + c * (0.12 + 0.09 * mood), x + c * 0.13, y + c * 0.12) }
  pen.stroke()
  if (pose.gasp >= 0.25) { pen.beginPath(); pen.ellipse(x + c * 0.03, y + c * 0.13, c * 0.045 * (0.6 + 0.5 * pose.gasp), c * 0.06 * (0.5 + 0.6 * pose.gasp), 0, 0, Math.PI * 2); pen.fill() }
}

/** A balsa cab at the front of a vehicle, with its face, a roof that overhangs, a door, a lamp and a bumper. */
function cab(pen: Pen, back: number, bed: number, c: number, pose: VehiclePose, wide = 1.0, tall = 1.15) {
  cutOut(pen, c, INK.balsa, () => pen.roundRect(back, bed - c * tall, c * wide, c * tall, c * 0.08))
  pen.strokeStyle = INK.balsaGrain
  pen.lineWidth = Math.max(0.75, c * 0.016)
  pen.beginPath()
  for (let i = 1; i < 5; i++) { pen.moveTo(back + c * 0.05, bed - (c * tall * i) / 5); pen.lineTo(back + c * (wide - 0.05), bed - (c * tall * i) / 5 + c * 0.012) }
  pen.stroke()
  // The roof: a strip of balsa a little wider than the cab. The bumper: another, under its nose.
  cutOut(pen, c, INK.balsaEdge, () => pen.roundRect(back - c * 0.06, bed - c * (tall + 0.07), c * (wide + 0.16), c * 0.09, c * 0.03))
  cutOut(pen, c, INK.balsaEdge, () => pen.roundRect(back + c * (wide - 0.12), bed - c * 0.1, c * 0.24, c * 0.1, c * 0.03))
  // The door: a pencil line round the lower half, with a handle.
  pen.strokeStyle = INK.balsaEdge
  pen.lineWidth = Math.max(0.75, c * 0.02)
  pen.beginPath(); pen.roundRect(back + c * 0.1, bed - c * tall * 0.36, c * wide * 0.5, c * tall * 0.33, c * 0.03); pen.moveTo(back + c * wide * 0.46, bed - c * tall * 0.22); pen.lineTo(back + c * wide * 0.54, bed - c * tall * 0.22); pen.stroke()
  // The lamp: a paper disc on the nose, with a pin for its bulb.
  cutOut(pen, c, INK.paper, () => pen.arc(back + c * (wide - 0.02), bed - c * tall * 0.28, c * 0.1, 0, Math.PI * 2))
  pin(pen, back + c * (wide - 0.02), bed - c * tall * 0.28, c * 0.5, false)
  face(pen, back + c * wide * 0.56, bed - c * tall * 0.66, c * 1.12, pose)
}

/** A mudguard over a wheel: a strip of balsa bent round its top. */
function mudguard(pen: Pen, x: number, r: number, c: number) {
  pen.lineCap = 'round'
  pen.lineWidth = c * 0.07
  pen.strokeStyle = INK.shadow
  pen.beginPath(); pen.arc(x + SHADOW.x * c, -r + SHADOW.y * c, r * 1.22, Math.PI * 1.12, Math.PI * 1.88); pen.stroke()
  pen.strokeStyle = INK.balsaEdge
  pen.beginPath(); pen.arc(x, -r, r * 1.22, Math.PI * 1.12, Math.PI * 1.88); pen.stroke()
}

/** Puffs from the exhaust: three soft dabs of the drafting white that grow and thin as they fall behind, low at the tail. They are filled, never rings: a ring beside a numeral would read as a figure. */
function puffs(pen: Pen, x: number, y: number, c: number, seconds: number) {
  pen.fillStyle = INK.line
  for (let i = 0; i < 3; i++) {
    const t = (seconds * 1.4 + i / 3) % 1
    pen.globalAlpha = 0.42 * (1 - t)
    pen.beginPath(); pen.ellipse(x - c * (0.15 + 0.75 * t), y + c * (0.12 - 0.2 * t * t), c * (0.06 + 0.13 * t), c * (0.045 + 0.09 * t), 0, 0, Math.PI * 2); pen.fill()
  }
  pen.globalAlpha = 1
}

/** The numeral that names a vehicle's crates, laid beside them. `flip` undoes the mirror of a vehicle that faces home. */
function crateCount(pen: Pen, n: number, x: number, y: number, c: number, flip: boolean, counted = true) {
  if (!counted) return
  pen.save()
  pen.translate(x, y)
  if (flip) pen.scale(-1, 1)
  drawWhole(pen, n, 0, 0, c * 0.52, { fill: INK.line, edge: INK.sheetDeep, edgeWidth: c * 0.12 })
  pen.restore()
}

/**
 * One vehicle, in the frame the caller has set: front axle on the ground at
 * the origin, facing along +x, `c` pixels to a cell. `hats` is how many of the
 * bus's passengers still have theirs. `afloat` (0 to 1) sinks it to its crates
 * in the water. Returns nothing: every number it needs is in the pose.
 */
export function vehicle(pen: Pen, id: VehicleId, c: number, pose: VehiclePose, seconds: number, random: () => number, flip = false, hats = 3, counted = true) {
  const spec = VEHICLES[id], long = Math.max(...spec.axles), r = c * (id === 'caterpillar-bus' ? 0.2 : 0.31), bed = -r * 1.3
  const lift = -pose.bounce * c
  pen.save()
  pen.translate(0, lift)
  pen.rotate(-pose.pitch)
  const spin = seconds * 3
  switch (id) {
    case 'post-van': {
      wood(pen, 'plank', -c * (long + 0.62), bed, c * 0.5, bed, c * 1.3, random)
      cab(pen, -c * 0.3, bed - c * 0.09, c, pose)
      crate(pen, -c * (long + 0.56), bed - c * 0.09, c * 1.25)
      crate(pen, -c * (long + 0.02), bed - c * 0.09, c * 1.25)
      // The tower of parcels, each with its label: each sways or slides by its own channel of the pose.
      for (let i = 0; i < 3; i++) {
        const w = c * (0.62 - i * 0.1), slide = pose.cargo[i] * c, fallen = Math.max(0, -pose.cargo[i] - 0.6)
        const px = -c * (long + 0.32) + (i % 2 ? c * 0.08 : -c * 0.04) + slide, py = bed - c * (0.62 + i * 0.32) + fallen * c * (0.9 + 0.3 * i)
        cutOut(pen, c, INK.paper, () => pen.rect(px, py - c * 0.29, w, c * 0.29))
        pen.strokeStyle = INK.stringTwist
        pen.lineWidth = Math.max(1, c * 0.026)
        // A paper label in one corner. No string crosses a parcel: a cross there would read as a sign.
        pen.beginPath(); pen.rect(px + w * 0.52, py - c * 0.23, w * 0.36, c * 0.12); pen.stroke()
      }
      crateCount(pen, spec.crates, -c * (long + 0.98), bed - c * 0.36, c, flip, counted)
      // The driver is out of the cab: its window is bare paper.
      if (pose.upset > 0.08) { pen.fillStyle = INK.paper; pen.beginPath(); pen.roundRect(-c * 0.3 + c * 0.56 - c * 0.3 * 1.12, bed - c * 0.09 - c * 1.15 * 0.66 - c * 0.26 * 1.12, c * 0.6 * 1.12, c * 0.52 * 1.12, c * 0.07); pen.fill() }
      break
    }
    case 'jelly-truck': {
      wood(pen, 'plank', -c * (long + 0.75), bed, c * 0.5, bed, c * 1.3, random)
      cab(pen, -c * 0.3, bed - c * 0.09, c, pose)
      for (let i = 0; i < 3; i++) crate(pen, -c * (long + 0.7) + i * c * 0.52, bed - c * 0.09, c * 1.2)
      // The jelly on its plate: a dome of tracing paper that leans with its wave, or is up on the cab roof.
      const home: [number, number] = [-c * (long - 0.05), bed - c * 0.6], roof: [number, number] = [c * 0.15, bed - c * 1.2]
      const jx = home[0] + (roof[0] - home[0]) * pose.upset, jy = home[1] + (roof[1] - home[1]) * pose.upset - c * 0.8 * Math.sin(Math.PI * pose.upset)
      const lean = pose.cargo[0] * c
      pen.strokeStyle = INK.paperShade
      pen.lineWidth = Math.max(1.5, c * 0.05)
      pen.beginPath(); pen.moveTo(home[0] - c * 0.6, home[1]); pen.lineTo(home[0] + c * 0.6, home[1]); pen.stroke()
      pen.globalAlpha = 0.82
      cutOut(pen, c, '#dfeaf6', () => { pen.moveTo(jx - c * 0.5, jy); pen.bezierCurveTo(jx - c * 0.5 + lean, jy - c * 0.85, jx + c * 0.5 + lean, jy - c * 0.85, jx + c * 0.5, jy); pen.closePath() })
      pen.globalAlpha = 1
      pen.strokeStyle = INK.line
      pen.lineWidth = Math.max(1, c * 0.03)
      pen.beginPath(); pen.moveTo(jx - c * 0.25 + lean * 0.6, jy - c * 0.42); pen.quadraticCurveTo(jx - c * 0.1 + lean * 0.8, jy - c * 0.58, jx + c * 0.08 + lean * 0.8, jy - c * 0.56); pen.stroke()
      crateCount(pen, spec.crates, -c * (long + 1.1), bed - c * 0.36, c, flip, counted)
      break
    }
    case 'piano-mover': {
      wood(pen, 'plank', -c * (long + 2.1), bed, c * 0.5, bed, c * 1.3, random)
      cab(pen, -c * 0.3, bed - c * 0.09, c, pose)
      for (let i = 0; i < 4; i++) crate(pen, -c * (long + 0.72) + (i % 2) * c * 0.5, bed - c * 0.09 - Math.floor(i / 2) * c * 0.5, c * 1.2)
      // The piano at the back, on its own little wheels: it rolls back when it is upset, and its keys go down one by one.
      const px = -c * (long + 2.0) - pose.upset * c * 0.8, pw = c * 1.05, ph = c * 1.15
      cutOut(pen, c, INK.balsaEdge, () => pen.roundRect(px, bed - c * 0.14 - ph, pw, ph, c * 0.05))
      pen.fillStyle = INK.balsa
      pen.fillRect(px + c * 0.06, bed - c * 0.14 - ph + c * 0.08, pw - c * 0.12, ph * 0.42)
      for (let i = 0; i < 6; i++) {
        pen.fillStyle = INK.paper
        pen.fillRect(px + c * 0.08 + (i * (pw - c * 0.16)) / 6, bed - c * 0.14 - ph * 0.42 + pose.cargo[i] * c * 0.07, (pw - c * 0.2) / 6, c * 0.2)
      }
      pin(pen, px + c * 0.2, bed - c * 0.02, c * 0.7, false); pin(pen, px + pw - c * 0.2, bed - c * 0.02, c * 0.7, false)
      crateCount(pen, spec.crates, -c * (long + 0.22), bed - c * 1.45, c, flip, counted)
      break
    }
    case 'giraffe-bus': {
      // A long paper bus with a row of windows, and three passengers whose necks go up through the roof.
      const back = -c * (long + 0.7), wide = c * (long + 1.25), tall = c * 0.95, top = bed - c * 0.06 - tall
      cutOut(pen, c, INK.paper, () => pen.roundRect(back, top, wide, tall, c * 0.12))
      pencil(pen, c, 0.022)
      pen.strokeRect(back + c * 0.08, top + c * 0.1, wide - c * 0.16, tall - c * 0.2)
      face(pen, back + wide - c * 0.4, top + tall * 0.5, c * 1.15, pose)
      for (let i = 0; i < 3; i++) crate(pen, back + c * 0.14 + i * c * 0.46, bed - c * 0.2, c * 1.05)
      for (let i = 0; i < 3; i++) {
        const nx = back + c * (0.55 + i * 0.78), reach = c * (1.5 + 0.55 * pose.cargo[i]), sway = c * 0.12 * Math.sin(seconds * 1.1 + i * 2)
        const hx = nx + sway + c * 0.16, hy = top - reach
        pen.lineCap = 'round'
        pen.lineWidth = c * 0.16
        pen.strokeStyle = INK.shadow
        pen.beginPath(); pen.moveTo(nx + SHADOW.x * c, top + SHADOW.y * c); pen.quadraticCurveTo(nx + SHADOW.x * c, top - reach * 0.6, hx + SHADOW.x * c, hy + SHADOW.y * c); pen.stroke()
        pen.strokeStyle = INK.balsa
        pen.beginPath(); pen.moveTo(nx, top); pen.quadraticCurveTo(nx, top - reach * 0.6, hx, hy); pen.stroke()
        // Spots, as pencil dots up the neck.
        pencil(pen, c)
        for (let s = 1; s <= 3; s++) { pen.beginPath(); pen.arc(nx + (sway * s) / 5, top - (reach * s) / 4.4, c * 0.03, 0, Math.PI * 2); pen.fill() }
        cutOut(pen, c, INK.balsa, () => pen.ellipse(hx + c * 0.1, hy, c * 0.2, c * 0.12, 0.2, 0, Math.PI * 2))
        pencil(pen, c)
        pen.beginPath(); pen.arc(hx + c * 0.16, hy - c * 0.02, c * 0.028, 0, Math.PI * 2); pen.fill()
        // Its hat: a paper cone, lifted off as the neck ducks, and gone when it hangs on a part of the bridge.
        if (i < hats) {
          const off = pose.upset * c * 0.5
          cutOut(pen, c, INK.paper, () => { pen.moveTo(hx - c * 0.12, hy - c * 0.1 - off); pen.lineTo(hx + c * 0.26, hy - c * 0.1 - off); pen.lineTo(hx + c * 0.07, hy - c * 0.42 - off); pen.closePath() })
        }
      }
      crateCount(pen, spec.crates, back - c * 0.4, bed - c * 0.4, c, flip, counted)
      break
    }
    case 'caterpillar-bus': {
      // Six paper segments, each on its own foot, with a crate on the back of five of them and a face on the first.
      for (let i = 5; i >= 0; i--) {
        const sx = -c * 0.5 * i, sy = bed - c * 0.32 - (i % 2 ? c * 0.03 : 0)
        cutOut(pen, c, INK.paper, () => pen.ellipse(sx, sy, c * 0.34, c * 0.36, 0, 0, Math.PI * 2))
        pencil(pen, c, 0.02)
        pen.beginPath(); pen.arc(sx, sy, c * 0.34, -0.5, 1.4); pen.stroke()
        if (i > 0) crate(pen, sx - c * 0.2, sy - c * 0.3, c * 0.95)
      }
      face(pen, c * 0.05, bed - c * 0.36, c * 0.95, pose)
      // Two antennae of balsa.
      wood(pen, 'stick', -c * 0.02, bed - c * 0.66, c * 0.12, bed - c * 1.02, c * 0.5, random)
      wood(pen, 'stick', c * 0.16, bed - c * 0.64, c * 0.42, bed - c * 0.94, c * 0.5, random)
      crateCount(pen, spec.crates, -c * (long + 0.8), bed - c * 0.3, c, flip, counted)
      break
    }
  }
  // Behind it as it drives: puffs from the exhaust.
  if (pose.puff > 0) puffs(pen, -c * (long + (id === 'piano-mover' ? 2.2 : 0.8)), bed, c, seconds)
  pen.restore()
  // A mudguard over each wheel, on a vehicle that has wheels.
  if (id !== 'caterpillar-bus') spec.axles.forEach((behind) => mudguard(pen, -c * behind, r, c))
  // The wheels stay on the road whatever the body does. The caterpillar's are its feet, and each lifts in its turn.
  spec.axles.forEach((behind, i) => wheel(pen, -c * behind, -r - (id === 'caterpillar-bus' ? pose.cargo[i] * c * 0.14 : 0), r, c, spin + i))
  if (id === 'post-van' && pose.upset > 0.08) driver(pen, c, driverAt(long, pose.upset) * c, pose.upset)
}

/** Where the van's driver stands beside the van, in cells from its front axle: from the cab door to just ahead of the back wheels, which are still on the bank. */
export const driverAt = (long: number, out: number): number => -0.15 - (long - 0.4) * Math.min(1, out)

/** The van's driver on foot: a paper cut-out with a pencil face, standing on the ground. At the tail it reaches both arms up to the tower of parcels. */
function driver(pen: Pen, c: number, x: number, out: number) {
  const walking = out < 1 ? Math.abs(Math.sin(out * Math.PI * 5)) : 0, y = -c * 0.03 * walking, reach = Math.max(0, (out - 0.85) / 0.15)
  cutOut(pen, c, INK.paper, () => pen.roundRect(x - c * 0.11, y - c * 0.5, c * 0.22, c * 0.36, c * 0.05))
  cutOut(pen, c, INK.paper, () => pen.arc(x, y - c * 0.61, c * 0.12, 0, Math.PI * 2))
  pencil(pen, c, 0.03)
  // It looks at its parcels, toward the tail.
  for (const ex of [-0.07, -0.01]) { pen.beginPath(); pen.arc(x + c * ex, y - c * 0.63, c * 0.018, 0, Math.PI * 2); pen.fill() }
  pen.beginPath()
  pen.moveTo(x - c * 0.07, y - c * 0.44); pen.lineTo(x - c * (0.14 + 0.16 * reach), y - c * (0.3 + 0.42 * reach))
  pen.moveTo(x + c * 0.07, y - c * 0.44); pen.lineTo(x + c * (0.14 - 0.34 * reach), y - c * (0.3 + 0.46 * reach))
  // Two legs that step as it walks.
  pen.moveTo(x - c * 0.05, y - c * 0.14); pen.lineTo(x - c * (0.05 + 0.07 * walking), 0)
  pen.moveTo(x + c * 0.05, y - c * 0.14); pen.lineTo(x + c * (0.05 + 0.07 * walking), 0)
  pen.stroke()
}
