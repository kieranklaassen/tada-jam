import type { CrewId, CrewPose } from './crew'
import { INK, SHADOW, pin, wood, type Pen } from './look'

// The crew drawn: two models of cut paper and balsa with faces in pencil, like
// everything else that is alive on the sheet, and large enough for the face to
// be read from across a table. Each is drawn with its feet at (x, y), facing
// the gap, from a pose (crew.ts): this file never decides how they move.

function cutOut(pen: Pen, c: number, colour: string, path: () => void) {
  pen.save()
  pen.translate(SHADOW.x * c, SHADOW.y * c)
  pen.fillStyle = INK.shadow
  pen.beginPath(); path(); pen.fill()
  pen.restore()
  pen.fillStyle = colour
  pen.beginPath(); path(); pen.fill()
}

/** A flat shape with no shadow: for what lies on the figure's own body, where a shadow would read as a mark on it. */
function flat(pen: Pen, colour: string, path: () => void) {
  pen.fillStyle = colour
  pen.beginPath(); path(); pen.fill()
}

function pencil(pen: Pen, c: number, width = 0.03) {
  pen.strokeStyle = INK.steelDark
  pen.fillStyle = INK.steelDark
  pen.lineWidth = Math.max(1, c * width)
  pen.lineCap = 'round'
  pen.lineJoin = 'round'
}

/** One eye: a white of the eye with a pencil pupil that looks where the pose says, under a lid that comes down from above. Shut, it is one curved line. */
function eye(pen: Pen, c: number, x: number, y: number, r: number, pose: CrewPose, rim = false) {
  const open = 1 - Math.min(1, pose.lids)
  if (open < 0.22) {
    pencil(pen, c, 0.03)
    pen.beginPath(); pen.moveTo(x - r, y); pen.quadraticCurveTo(x, y + r * 0.55, x + r, y); pen.stroke()
  } else {
    pen.fillStyle = '#ffffff'
    pen.beginPath(); pen.ellipse(x, y + r * (1 - open) * 0.5, r, r * open, 0, 0, Math.PI * 2); pen.fill()
    pen.save()
    pen.beginPath(); pen.ellipse(x, y + r * (1 - open) * 0.5, r, r * open, 0, 0, Math.PI * 2); pen.clip()
    pen.fillStyle = INK.steelDark
    pen.beginPath(); pen.arc(x + pose.lookX * r * 0.48, y - pose.lookY * r * 0.42, r * 0.46, 0, Math.PI * 2); pen.fill()
    pen.restore()
  }
  if (rim) { pencil(pen, c, 0.026); pen.beginPath(); pen.arc(x, y, r * 1.18, 0, Math.PI * 2); pen.stroke() }
}

/** The mouth: a pencil line that bows up or down with the mood, and a round open mouth over it when the pose has one. */
function mouth(pen: Pen, c: number, x: number, y: number, wide: number, pose: CrewPose) {
  pencil(pen, c, 0.03)
  pen.beginPath(); pen.moveTo(x - wide / 2, y); pen.quadraticCurveTo(x, y + wide * 0.45 * pose.mouth, x + wide / 2, y - wide * 0.08 * pose.mouth); pen.stroke()
  if (pose.gape > 0.08) { pen.beginPath(); pen.ellipse(x + wide * 0.1, y + c * 0.02, wide * 0.24 * pose.gape, wide * 0.3 * pose.gape, 0, 0, Math.PI * 2); pen.fill() }
}

/**
 * The beaver: an upright paper body on balsa feet, a balsa paddle of a tail
 * behind it, a balsa hard hat, two paper teeth, and a flag on a stick.
 */
function beaver(pen: Pen, x: number, y: number, c: number, pose: CrewPose, random: () => number) {
  y -= pose.hop * c
  const sag = pose.sag * c
  // The tail, flat on the floor behind it: it comes up off the floor and slaps down.
  pen.save()
  pen.translate(x - c * 0.3, y - c * 0.1); pen.rotate(0.75 * pose.own)
  cutOut(pen, c, INK.balsa, () => pen.ellipse(-c * 0.36, 0, c * 0.38, c * 0.15, 0, 0, Math.PI * 2))
  pen.strokeStyle = INK.balsaEdge
  pen.lineWidth = Math.max(0.75, c * 0.016)
  pen.beginPath()
  // Scales, as small filled dabs set in a stagger. Nothing on it crosses, and no row of it is a row of letters.
  pen.fillStyle = INK.balsaEdge
  for (let i = 0; i < 9; i++) { const sx = -c * (0.64 - i * 0.065), sy = (i % 2 ? 0.045 : -0.04) * c; pen.moveTo(sx + c * 0.03, sy); pen.ellipse(sx, sy, c * 0.03, c * 0.022, 0.5, 0, Math.PI * 2) }
  pen.fill()
  pen.restore()
  for (const fx of [-0.2, 0.24]) cutOut(pen, c, INK.balsa, () => pen.ellipse(x + c * fx, y - c * 0.06, c * 0.2, c * 0.08, 0, 0, Math.PI * 2))
  pen.save()
  pen.translate(x, y); pen.rotate(pose.lean)
  // The free arm at its side, behind the body, until it goes up over the eyes.
  const eyesY = -c * 1.56 + sag, hand: [number, number] = [-c * 0.34 + c * 0.42 * pose.cover, -c * 0.82 + sag + (eyesY + c * 0.82 - sag) * pose.cover]
  cutOut(pen, c, INK.paper, () => pen.ellipse(0, -c * 0.72 + sag, c * 0.46, c * 0.62, 0, 0, Math.PI * 2))
  pen.fillStyle = INK.paperShade
  pen.globalAlpha = 0.55
  pen.beginPath(); pen.ellipse(c * 0.1, -c * 0.6 + sag, c * 0.27, c * 0.4, 0, 0, Math.PI * 2); pen.fill()
  pen.globalAlpha = 1
  // The head, with two round ears and the hard hat between them.
  const hx = c * 0.06, hy = -c * 1.5 + sag
  for (const ex of [-0.3, 0.34]) cutOut(pen, c, INK.paper, () => pen.arc(hx + c * ex, hy - c * 0.36, c * 0.12, 0, Math.PI * 2))
  cutOut(pen, c, INK.paper, () => pen.arc(hx, hy, c * 0.46, 0, Math.PI * 2))
  flat(pen, INK.balsa, () => { pen.arc(hx - c * 0.02, hy - c * 0.26, c * 0.36, Math.PI, Math.PI * 2); pen.lineTo(hx + c * 0.56, hy - c * 0.24); pen.lineTo(hx + c * 0.56, hy - c * 0.18); pen.lineTo(hx - c * 0.38, hy - c * 0.18); pen.closePath() })
  pen.strokeStyle = INK.balsaEdge
  pen.lineWidth = Math.max(0.75, c * 0.02)
  // The brim's edge, and a short rib over the crown that stops well short of it.
  pen.beginPath(); pen.moveTo(hx - c * 0.38, hy - c * 0.185); pen.lineTo(hx + c * 0.56, hy - c * 0.185); pen.stroke()
  pen.beginPath(); pen.arc(hx - c * 0.02, hy - c * 0.26, c * 0.27, Math.PI * 1.15, Math.PI * 1.85); pen.stroke()
  // The muzzle, the nose, and the two teeth, which show more the harder it clenches.
  pen.fillStyle = INK.paperShade
  pen.beginPath(); pen.ellipse(hx + c * 0.17, hy + c * 0.17, c * 0.25, c * 0.17, 0, 0, Math.PI * 2); pen.fill()
  pencil(pen, c)
  pen.beginPath(); pen.ellipse(hx + c * 0.3, hy + c * 0.07, c * 0.075, c * 0.055, 0, 0, Math.PI * 2); pen.fill()
  const bite = c * (0.1 + 0.07 * Math.max(0, -pose.mouth))
  pen.fillStyle = '#ffffff'
  pen.fillRect(hx + c * 0.16, hy + c * 0.24, c * 0.15, bite)
  pencil(pen, c, 0.02)
  pen.strokeRect(hx + c * 0.16, hy + c * 0.24, c * 0.15, bite)
  pen.beginPath(); pen.moveTo(hx + c * 0.235, hy + c * 0.24); pen.lineTo(hx + c * 0.235, hy + c * 0.24 + bite); pen.stroke()
  mouth(pen, c, hx + c * 0.2, hy + c * 0.235, c * 0.3, pose)
  // The eyes and the brows, which pinch together and down when it cannot look.
  const eyes: [number, number][] = [[hx - c * 0.1, hy - c * 0.04], [hx + c * 0.22, hy - c * 0.06]]
  eyes.forEach(([ex, ey]) => eye(pen, c, ex, ey, c * 0.1, pose))
  pencil(pen, c, 0.034)
  pen.beginPath()
  const b = pose.brow * c * 0.07
  pen.moveTo(eyes[0][0] - c * 0.11, eyes[0][1] - c * 0.16 - b * 0.4); pen.lineTo(eyes[0][0] + c * 0.09, eyes[0][1] - c * 0.16 - b * 0.4 - (b < 0 ? b : b * 0.3))
  pen.moveTo(eyes[1][0] - c * 0.09, eyes[1][1] - c * 0.16 - b * 0.4 - (b < 0 ? b : b * 0.3)); pen.lineTo(eyes[1][0] + c * 0.11, eyes[1][1] - c * 0.16 - b * 0.4)
  pen.stroke()
  // The free hand: at its side, or flat over its eyes with a gap between two fingers.
  flat(pen, INK.paper, () => pen.ellipse(hand[0] + c * 0.04, hand[1], c * (0.13 + 0.15 * pose.cover), c * 0.12, -0.2 * pose.cover, 0, Math.PI * 2))
  pencil(pen, c, 0.022)
  pen.beginPath(); pen.ellipse(hand[0] + c * 0.04, hand[1], c * (0.13 + 0.15 * pose.cover), c * 0.12, -0.2 * pose.cover, 0, Math.PI * 2); pen.stroke()
  if (pose.cover > 0.3) {
    pencil(pen, c, 0.022)
    pen.beginPath()
    for (const fx of [-0.06, 0.06, 0.17]) { pen.moveTo(hand[0] + c * fx, hand[1] - c * 0.1); pen.lineTo(hand[0] + c * (fx + 0.02), hand[1] + c * 0.1) }
    pen.stroke()
  }
  // The flag: an arm, a balsa stick and a paper pennant. At ease it stands upright at its side; raised, the arm goes up and the flag tips forward.
  const turn = Math.PI * 0.72 - pose.raise * Math.PI * 0.62, sx = c * 0.3, sy = -c * 0.98 + sag
  const px = sx + Math.sin(turn) * c * 0.34, py = sy - Math.cos(turn) * c * 0.34
  const stick = 0.08 + 0.55 * pose.raise, tx = px + Math.sin(stick) * c * 0.86, ty = py - Math.cos(stick) * c * 0.86
  wood(pen, 'stick', px - Math.sin(stick) * c * 0.3, py + Math.cos(stick) * c * 0.3, tx, ty, c * 0.6, random)
  cutOut(pen, c, INK.paper, () => { pen.moveTo(tx, ty); pen.lineTo(tx + Math.cos(stick) * c * 0.36 + Math.sin(stick) * c * 0.14, ty + Math.sin(stick) * c * 0.36 + Math.cos(stick) * c * 0.14 - c * 0.1); pen.lineTo(tx - Math.sin(stick) * c * 0.3, ty + Math.cos(stick) * c * 0.3); pen.closePath() })
  pen.lineCap = 'round'
  pen.lineWidth = c * 0.13
  pen.strokeStyle = INK.paper
  pen.beginPath(); pen.moveTo(sx, sy); pen.lineTo(px, py); pen.stroke()
  flat(pen, INK.paper, () => pen.arc(px, py, c * 0.1, 0, Math.PI * 2))
  pencil(pen, c, 0.022)
  pen.beginPath(); pen.arc(px, py, c * 0.1, 0, Math.PI * 2); pen.moveTo(sx - c * 0.05, sy - c * 0.04); pen.lineTo(px - c * 0.07, py - c * 0.06); pen.stroke()
  pen.restore()
}

/**
 * The mole: a low round body of grey paper with a paper snout that ends in a
 * pin, round spectacles, two big paws, a clipboard under one arm and a
 * folding rule of balsa in the other paw.
 */
function mole(pen: Pen, x: number, y: number, c: number, pose: CrewPose, random: () => number) {
  y -= pose.hop * c
  const sag = pose.sag * c
  for (const fx of [-0.26, 0.26]) {
    cutOut(pen, c, INK.paper, () => pen.ellipse(x + c * fx, y - c * 0.05, c * 0.2, c * 0.075, 0, 0, Math.PI * 2))
    pencil(pen, c, 0.018)
    pen.beginPath()
    for (const t of [0.06, 0.12, 0.17]) { pen.moveTo(x + c * (fx + t), y - c * 0.09); pen.lineTo(x + c * (fx + t + 0.02), y - c * 0.02) }
    pen.stroke()
  }
  pen.save()
  pen.translate(x, y); pen.rotate(pose.lean)
  // The clipboard under its far arm.
  cutOut(pen, c, INK.balsa, () => pen.roundRect(-c * 0.68, -c * 0.98 + sag, c * 0.36, c * 0.5, c * 0.03))
  pen.fillStyle = INK.paper
  pen.fillRect(-c * 0.65, -c * 0.92 + sag, c * 0.3, c * 0.41)
  pencil(pen, c, 0.016)
  pen.beginPath()
  // A clean sheet: nothing is drawn or written on it.
  pen.stroke()
  cutOut(pen, c, INK.paperShade, () => pen.ellipse(0, -c * 0.62 + sag, c * 0.56, c * 0.62, 0, 0, Math.PI * 2))
  pen.fillStyle = INK.paper
  pen.globalAlpha = 0.75
  pen.beginPath(); pen.ellipse(c * 0.08, -c * 0.46 + sag, c * 0.33, c * 0.36, 0, 0, Math.PI * 2); pen.fill()
  pen.globalAlpha = 1
  // The snout, up and forward, with a pin for a nose and three whiskers.
  const tip: [number, number] = [c * 0.66, -c * 1.24 + sag]
  cutOut(pen, c, INK.paper, () => { pen.moveTo(c * 0.14, -c * 1.18 + sag); pen.quadraticCurveTo(c * 0.4, -c * 1.34 + sag, tip[0], tip[1]); pen.quadraticCurveTo(c * 0.5, -c * 0.98 + sag, c * 0.3, -c * 0.82 + sag); pen.closePath() })
  pencil(pen, c, 0.018)
  pen.beginPath()
  for (const w of [-0.16, -0.02, 0.12]) { pen.moveTo(c * 0.5, -c * 1.1 + sag); pen.lineTo(c * (0.8 + 0.05 * w), -c * (1.0 + w) + sag) }
  pen.stroke()
  pin(pen, tip[0], tip[1], c * 0.9, false)
  mouth(pen, c, c * 0.42, -c * 0.9 + sag, c * 0.2, pose)
  // The spectacles: two round glasses and the bar between them, with small eyes behind.
  const glasses: [number, number][] = [[-c * 0.06, -c * 1.0 + sag], [c * 0.23, -c * 1.07 + sag]]
  glasses.forEach(([gx, gy]) => eye(pen, c, gx, gy, c * 0.105, pose, true))
  pencil(pen, c, 0.026)
  pen.beginPath(); pen.moveTo(glasses[0][0] + c * 0.12, glasses[0][1] - c * 0.02); pen.lineTo(glasses[1][0] - c * 0.12, glasses[1][1] + c * 0.01)
  const b = pose.brow * c * 0.05
  pen.moveTo(glasses[0][0] - c * 0.09, glasses[0][1] - c * 0.19 - b); pen.lineTo(glasses[0][0] + c * 0.07, glasses[0][1] - c * 0.2 - b * 1.6)
  pen.moveTo(glasses[1][0] - c * 0.07, glasses[1][1] - c * 0.2 - b * 1.6); pen.lineTo(glasses[1][0] + c * 0.09, glasses[1][1] - c * 0.19 - b)
  pen.stroke()
  // The paw with the rule: at its side with the rule level, or held up; the rule itself turns upright for the second look.
  const turn = Math.PI * 0.72 - pose.raise * Math.PI * 0.5, sx = c * 0.38, sy = -c * 0.66 + sag
  const px = sx + Math.sin(turn) * c * 0.34, py = sy - Math.cos(turn) * c * 0.34
  const lie = -pose.own * Math.PI * 0.5, rx = Math.cos(lie), ry = Math.sin(lie)
  const a: [number, number] = [px - rx * c * 0.3, py - ry * c * 0.3], z: [number, number] = [px + rx * c * 0.62, py + ry * c * 0.62]
  wood(pen, 'stick', a[0], a[1], z[0], z[1], c * 0.75, random)
  pencil(pen, c, 0.016)
  pen.beginPath()
  for (let i = 1; i < 9; i++) { const t = i / 9, mx = a[0] + (z[0] - a[0]) * t, my = a[1] + (z[1] - a[1]) * t, tall = c * (i % 3 === 0 ? 0.045 : 0.025); pen.moveTo(mx, my); pen.lineTo(mx - ry * tall, my + rx * tall) }
  pen.stroke()
  pen.lineCap = 'round'
  pen.lineWidth = c * 0.14
  pen.strokeStyle = INK.paperShade
  pen.beginPath(); pen.moveTo(sx, sy); pen.lineTo(px, py); pen.stroke()
  flat(pen, INK.paper, () => pen.ellipse(px, py, c * 0.15, c * 0.12, lie, 0, Math.PI * 2))
  pencil(pen, c, 0.018)
  pen.beginPath()
  pen.ellipse(px, py, c * 0.15, c * 0.12, lie, 0, Math.PI * 2)
  for (const t of [-0.07, 0, 0.07]) { pen.moveTo(px + c * t, py - c * 0.1); pen.lineTo(px + c * (t + 0.01), py - c * 0.03) }
  pen.stroke()
  pen.restore()
}

/** One of the crew, standing with its feet at (x, y) in pixels, `c` pixels to a cell. */
export function crewFigure(pen: Pen, who: CrewId, x: number, y: number, c: number, pose: CrewPose, random: () => number) {
  if (who === 'beaver') beaver(pen, x, y, c, pose, random)
  else mole(pen, x, y, c, pose, random)
}
