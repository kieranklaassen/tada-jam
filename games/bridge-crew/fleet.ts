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

/** A face in pencil on a paper window: two dots that look ahead, and a mouth that says how the driver is taking it. */
function face(pen: Pen, x: number, y: number, c: number, mood: number, blink = false) {
  pen.fillStyle = INK.paper
  pen.beginPath(); pen.roundRect(x - c * 0.3, y - c * 0.26, c * 0.6, c * 0.52, c * 0.06); pen.fill()
  pencil(pen, c, 0.03)
  for (const ex of [-0.08, 0.14]) {
    pen.beginPath()
    if (blink) { pen.moveTo(x + c * (ex - 0.04), y - c * 0.06); pen.lineTo(x + c * (ex + 0.04), y - c * 0.06); pen.stroke() }
    else { pen.arc(x + c * ex, y - c * 0.06, c * 0.045, 0, Math.PI * 2); pen.fill() }
  }
  // Brows tip inward when it is put out and lift when it is content; the mouth curves with them.
  pen.beginPath()
  pen.moveTo(x - c * 0.15, y - c * (0.17 - 0.04 * mood)); pen.lineTo(x - c * 0.02, y - c * (0.17 + 0.04 * mood))
  pen.moveTo(x + c * 0.08, y - c * (0.17 + 0.04 * mood)); pen.lineTo(x + c * 0.21, y - c * (0.17 - 0.04 * mood))
  pen.moveTo(x - c * 0.07, y + c * 0.11); pen.quadraticCurveTo(x + c * 0.03, y + c * (0.11 + 0.09 * mood), x + c * 0.13, y + c * 0.11)
  pen.stroke()
}

/** A balsa cab at the front of a vehicle, with its face. */
function cab(pen: Pen, back: number, bed: number, c: number, mood: number, wide = 0.92, tall = 1.05) {
  cutOut(pen, c, INK.balsa, () => pen.roundRect(back, bed - c * tall, c * wide, c * tall, c * 0.08))
  pen.strokeStyle = INK.balsaGrain
  pen.lineWidth = Math.max(0.75, c * 0.016)
  pen.beginPath()
  for (let i = 1; i < 5; i++) { pen.moveTo(back + c * 0.05, bed - (c * tall * i) / 5); pen.lineTo(back + c * (wide - 0.05), bed - (c * tall * i) / 5 + c * 0.012) }
  pen.stroke()
  face(pen, back + c * wide * 0.56, bed - c * tall * 0.62, c, mood)
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
      cab(pen, -c * 0.3, bed - c * 0.09, c, pose.face)
      crate(pen, -c * (long + 0.56), bed - c * 0.09, c * 1.25)
      crate(pen, -c * (long + 0.02), bed - c * 0.09, c * 1.25)
      // The tower of parcels: each sways or slides by its own channel of the pose.
      for (let i = 0; i < 3; i++) {
        const w = c * (0.62 - i * 0.1), slide = pose.cargo[i] * c, fallen = Math.max(0, -pose.cargo[i] - 0.6)
        const px = -c * (long + 0.32) + (i % 2 ? c * 0.08 : -c * 0.04) + slide, py = bed - c * (0.62 + i * 0.32) + fallen * c * (0.9 + 0.3 * i)
        cutOut(pen, c, INK.paper, () => pen.rect(px, py - c * 0.29, w, c * 0.29))
        pen.strokeStyle = INK.stringTwist
        pen.lineWidth = Math.max(1, c * 0.026)
        pen.beginPath(); pen.moveTo(px + w / 2, py - c * 0.29); pen.lineTo(px + w / 2, py); pen.moveTo(px, py - c * 0.145); pen.lineTo(px + w, py - c * 0.145); pen.stroke()
      }
      crateCount(pen, spec.crates, -c * (long + 0.98), bed - c * 0.36, c, flip, counted)
      break
    }
    case 'jelly-truck': {
      wood(pen, 'plank', -c * (long + 0.75), bed, c * 0.5, bed, c * 1.3, random)
      cab(pen, -c * 0.3, bed - c * 0.09, c, pose.face)
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
      cab(pen, -c * 0.3, bed - c * 0.09, c, pose.face)
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
      face(pen, back + wide - c * 0.36, top + tall * 0.5, c * 0.9, pose.face)
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
      face(pen, c * 0.05, bed - c * 0.36, c * 0.85, pose.face)
      // Two antennae of balsa.
      wood(pen, 'stick', -c * 0.02, bed - c * 0.66, c * 0.12, bed - c * 1.02, c * 0.5, random)
      wood(pen, 'stick', c * 0.16, bed - c * 0.64, c * 0.42, bed - c * 0.94, c * 0.5, random)
      crateCount(pen, spec.crates, -c * (long + 0.8), bed - c * 0.3, c, flip, counted)
      break
    }
  }
  pen.restore()
  // The wheels stay on the road whatever the body does. The caterpillar's are its feet, and each lifts in its turn.
  spec.axles.forEach((behind, i) => wheel(pen, -c * behind, -r - (id === 'caterpillar-bus' ? pose.cargo[i] * c * 0.14 : 0), r, c, spin + i))
}
