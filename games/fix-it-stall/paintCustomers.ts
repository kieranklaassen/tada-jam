import { type Pose } from './folk'
import { disc, INK, type Ctx } from './paint'
import { FOLK_SCALE } from './stage'
import { type Who } from './tastes'

// The six customers, each drawn from its rig's channels in its own way
// (folk.ts). A customer stands in the lane beyond the counter and leans over
// it: `Behind` is drawn first, the counter is laid over it, and `Front` is
// whatever rests on the counter. Each is drawn about its own origin: the head
// is near (0, 30) and the counter's far edge is `edge` below the origin.
//
// Each has a face that says what it thinks of what is being done to its
// gadget: eyes that go where the hand goes, brows of its own kind (an owl's
// tufts, a moth's feelers, a wrinkle over a tortoise's eye), a beak or a
// mouth that opens, and at a pop every feather or hair it has on end.

/** What a face shows beyond the pose: where the eyes are turned, and how far everything stands on end. */
export type Face = { gx: number; gy: number; fright: number }
type Painter = { behind(c: Ctx, pose: Pose, breath: number, face: Face): void; front(c: Ctx, pose: Pose, edge: number): void }

const ellipse = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, turn = 0) => {
  c.beginPath()
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), turn, 0, Math.PI * 2)
  c.fillStyle = fill
  c.fill()
}
/** A round eye with a lid that comes down from above: `lids` 0 open, 1 shut, below 0 opened wide. The pupil goes where the face looks. */
function eye(c: Ctx, x: number, y: number, r: number, lids: number, iris: string, lid: string, face: Face, look = 0.12): void {
  const wide = 1 + Math.max(0, -lids) * 0.25 + face.fright * 0.2
  const px = x + face.gx * r * 0.4, py = y + r * look + face.gy * r * 0.34, pupil = r * (0.52 - face.fright * 0.2)
  disc(c, x, y, r * wide, iris)
  disc(c, px, py, pupil, INK.black)
  disc(c, px - r * 0.2, py - r * 0.2, r * 0.16, INK.white)
  const shut = Math.max(0, Math.min(1, lids))
  if (shut <= 0.02) return
  c.save()
  c.beginPath()
  c.arc(x, y, r * wide + 0.6, 0, Math.PI * 2)
  c.clip()
  c.fillStyle = lid
  c.fillRect(x - r * 1.3, y - r * 1.3, r * 2.6, r * 2.6 * shut)
  c.restore()
}

/** A ring of feathers or hair standing on end round an oval: one path, one fill. */
function bristle(c: Ctx, x: number, y: number, rx: number, ry: number, spikes: number, long: number, fill: string, from = 0, to = Math.PI * 2): void {
  c.beginPath()
  for (let i = 0; i <= spikes * 2; i++) {
    const a = from + ((to - from) * i) / (spikes * 2), out = i % 2 ? long : 0
    c.lineTo(x + Math.cos(a) * (rx + out), y + Math.sin(a) * (ry + out))
  }
  c.closePath()
  c.fillStyle = fill
  c.fill()
}
/** A brow: one stroke from its inner end to its outer. */
function brow(c: Ctx, x0: number, y0: number, x1: number, y1: number, width: number, colour: string): void {
  c.strokeStyle = colour
  c.lineWidth = width
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(x0, y0)
  c.lineTo(x1, y1)
  c.stroke()
}

const OWL = { feather: '#86705a', dark: '#6a5644', chest: '#d2c0a2', face: '#e2d3b8', eye: '#f2c23a', beak: '#d8962a', cap: '#27375c', capDark: '#1a2644' }
const owl: Painter = {
  behind(c, pose, breath, face) {
    c.translate(0, pose.lean * 12 - pose.hop * 12)
    if (face.fright > 0.04) bristle(c, 0, 86, 102, 64, 15, 14 * face.fright, OWL.dark, Math.PI, Math.PI * 2)
    ellipse(c, 0, 86, 104 + breath * 1.5, 66, OWL.dark)
    ellipse(c, 0, 96, 56, 48, OWL.chest)
    c.strokeStyle = OWL.feather
    c.lineWidth = 2.4
    // Two rows of breast feathers, each a round scallop.
    for (let row = 0; row < 2; row++) for (let i = -2; i <= 2; i++) {
      c.beginPath()
      c.arc(i * 17 + row * 8, 78 + row * 14, 6.5, 0.15, Math.PI - 0.15)
      c.stroke()
    }
    // The head turns on the neck: face on at 0, the back of the head at 1.
    const front = Math.cos(Math.min(1, Math.max(0, pose.turn)) * Math.PI), b = Math.max(-1, Math.min(1, pose.brow))
    c.save()
    c.translate(0, 30)
    c.scale(Math.max(0.12, Math.abs(front)), 1)
    // The tufts are its brows: up at a surprise, laid out sideways in worry.
    c.fillStyle = OWL.feather
    for (const side of [-1, 1]) {
      c.beginPath()
      c.moveTo(side * 34, -36)
      c.lineTo(side * (66 + Math.max(0, -b) * 14), -60 - Math.max(0, b) * 16 + Math.max(0, -b) * 22)
      c.lineTo(side * 64, -16)
      c.closePath()
      c.fill()
    }
    if (face.fright > 0.04) bristle(c, 0, 0, 70, 54, 18, 15 * face.fright, OWL.feather)
    ellipse(c, 0, 0, 72, 56, OWL.feather)
    if (front > 0) {
      for (const side of [-1, 1]) disc(c, side * 27, 6, 31, OWL.face)
      for (const side of [-1, 1]) eye(c, side * 27, 8, 18, 0.35 + pose.lids * 0.65 - face.fright * 0.6, OWL.eye, OWL.feather, face)
      for (const side of [-1, 1]) brow(c, side * 7, -9 - Math.abs(b) * 9, side * 46, -24 - Math.max(0, b) * 8 + Math.max(0, -b) * 9, 6, OWL.dark)
      // The beak: its lower half drops when it gapes.
      const gape = Math.max(0, pose.gape)
      c.fillStyle = '#b87a1e'
      c.beginPath()
      c.moveTo(-6, 22)
      c.lineTo(0, 34 + gape * 15)
      c.lineTo(6, 22)
      c.closePath()
      c.fill()
      if (gape > 0.12) {
        c.fillStyle = '#3a2428'
        c.beginPath()
        c.moveTo(-4, 24)
        c.lineTo(0, 30 + gape * 12)
        c.lineTo(4, 24)
        c.closePath()
        c.fill()
      }
      c.fillStyle = OWL.beak
      c.beginPath()
      c.moveTo(-8, 16)
      c.lineTo(0, 36 - gape * 6)
      c.lineTo(8, 16)
      c.closePath()
      c.fill()
    } else {
      // The back of the head: two rows of feather tips.
      c.strokeStyle = OWL.dark
      c.lineWidth = 3
      for (let i = -2; i <= 2; i++) { c.beginPath(); c.arc(i * 22, 6, 12, 0.2, Math.PI - 0.2); c.stroke() }
    }
    // The watchman's cap, pulled down over the eyes when the light is too much.
    // Pulled down, it covers the eyes; once the head has turned away it sits as a cap sits, seen from behind.
    // A fright lifts it clean off his head for a moment.
    const down = Math.max(0, pose.special) * 30 * Math.max(0, front) - face.fright * 20
    ellipse(c, 0, -38 + down, 56, 24, OWL.cap)
    ellipse(c, 0, -22 + down, 46, 10, OWL.capDark)
    if (front > 0) { disc(c, 0, -42 + down, 7, INK.steel); disc(c, -2, -44 + down, 2.4, INK.white) }
    c.restore()
  },
  front(c, pose, edge) {
    // Two wing tips on the counter; one reaches for the gadget.
    for (const side of [-1, 1]) {
      const reach = side === 1 ? Math.max(0, pose.arm) : 0
      c.fillStyle = OWL.dark
      for (let f = 0; f < 3; f++) {
        c.beginPath()
        c.ellipse(side * (96 + f * 13) - side * reach * 46, edge + 30 + f * 2 + reach * 16, 9, 22, side * (0.25 + f * 0.12) + reach * 0.8, 0, Math.PI * 2)
        c.fill()
      }
    }
  },
}

const MOTH = { wing: '#a8805a', hind: '#c29f74', band: '#ecdcbc', body: '#f3ead6', head: '#8f6c4c' }
const moth: Painter = {
  behind(c, pose, breath, face) {
    // It rides a blade round and round, is pinned flat by a wind, or droops in the dark.
    const spin = pose.turn * Math.PI * 2
    c.translate(Math.sin(spin) * 34 * Math.min(1, Math.abs(pose.turn) * 4), 20 + Math.max(0, pose.lean) * 22 - pose.hop * 30 + (1 - Math.cos(spin)) * 10)
    c.rotate(spin * 0.5 + Math.min(0, pose.lean) * 0.5)
    if (pose.lean < 0) c.scale(1 + -pose.lean * 0.2, 1 - -pose.lean * 0.18)
    // A fright shivers its wings.
    const spread = 0.35 + 0.65 * Math.max(0, Math.min(1, pose.special)) + breath * 0.03 + face.fright * 0.12 * Math.sin(face.fright * 40)
    for (const side of [-1, 1]) {
      c.save()
      c.scale(spread, 1 - Math.max(0, pose.lean) * 0.25)
      c.fillStyle = MOTH.wing
      c.beginPath()
      c.moveTo(side * 8, 6)
      c.quadraticCurveTo(side * 70, -52, side * 96, -14)
      c.quadraticCurveTo(side * 92, 30, side * 14, 34)
      c.closePath()
      c.fill()
      c.fillStyle = MOTH.hind
      c.beginPath()
      c.moveTo(side * 10, 30)
      c.quadraticCurveTo(side * 70, 34, side * 62, 70)
      c.quadraticCurveTo(side * 30, 80, side * 8, 52)
      c.closePath()
      c.fill()
      c.strokeStyle = MOTH.band
      c.lineWidth = 6
      c.beginPath()
      c.moveTo(side * 34, -14)
      c.quadraticCurveTo(side * 62, 4, side * 56, 26)
      c.stroke()
      disc(c, side * 72, -8, 10, MOTH.band)
      disc(c, side * 72, -8, 4.6, INK.black)
      c.restore()
      // A feathered feeler, combed forward when it is taken with something.
      c.save()
      c.translate(side * 6, -30)
      // The feelers are its brows: up and apart at a surprise, drawn in together in worry.
      c.rotate(side * (pose.arm * 0.7 - 0.1 - pose.brow * 0.3 - face.fright * 0.5))
      c.strokeStyle = MOTH.head
      c.lineWidth = 2.4
      c.beginPath()
      c.moveTo(0, 0)
      c.quadraticCurveTo(side * 12, -32, side * 34, -36)
      c.stroke()
      for (let i = 1; i <= 4; i++) {
        const t = i / 5, fx = side * (34 * t * t + 10 * t), fy = -36 * t - 4 * t * t
        // The comb of the feeler: one short tooth at a time, all leaning the same way.
        c.beginPath()
        c.moveTo(fx, fy)
        c.lineTo(fx + side * 2, fy - 7)
        c.stroke()
      }
      c.restore()
    }
    if (face.fright > 0.04) bristle(c, 0, 30, 21, 38, 14, 12 * face.fright, MOTH.body)
    for (let i = 0; i < 16; i++) disc(c, Math.cos((i / 16) * Math.PI * 2) * 19, 30 + Math.sin((i / 16) * Math.PI * 2) * 36, 6, MOTH.body)
    ellipse(c, 0, 30, 19, 36, MOTH.body)
    if (face.fright > 0.04) bristle(c, 0, -16, 18, 18, 12, 9 * face.fright, MOTH.head)
    disc(c, 0, -16, 19, MOTH.head)
    // Great dark eyes: it is the light in them that moves.
    for (const side of [-1, 1]) {
      const ex = side * 10, ey = -18, r = 9 * (1 + Math.max(0, -pose.lids) * 0.2 + face.fright * 0.25)
      disc(c, ex, ey, r, '#241d18')
      disc(c, ex + face.gx * 3.4 - 1.6, ey + face.gy * 3 - 2, 3, INK.white)
      disc(c, ex + face.gx * 3.4 + 2.4, ey + face.gy * 3 + 2.4, 1.3, 'rgba(255, 255, 255, 0.7)')
      const shut = Math.max(0, Math.min(1, pose.lids))
      if (shut > 0.02) {
        c.save()
        c.beginPath()
        c.arc(ex, ey, r + 0.6, 0, Math.PI * 2)
        c.clip()
        c.fillStyle = MOTH.head
        c.fillRect(ex - r - 1, ey - r - 1, r * 2 + 2, (r * 2 + 2) * shut)
        c.restore()
      }
    }
  },
  front() {},
}

const YAK = { hair: '#5d4634', dark: '#463325', horn: '#e8dcc0', muzzle: '#c9b396', nose: '#3a2c22' }
const yak: Painter = {
  behind(c, pose, breath, face) {
    c.translate(0, Math.max(0, pose.lean) * 26 - pose.hop * 10)
    c.rotate(pose.turn * 0.22)
    // A great shaggy shape: shoulders, then the head, hair hanging in hanks.
    if (face.fright > 0.04) bristle(c, 0, 92, 120, 68, 16, 18 * face.fright, YAK.dark, Math.PI, Math.PI * 2)
    ellipse(c, 0, 92, 122 + breath * 2, 70, YAK.dark)
    for (const side of [-1, 1]) {
      // A horn, sweeping out and up.
      c.strokeStyle = YAK.horn
      c.lineCap = 'round'
      c.lineWidth = 13
      c.beginPath()
      c.moveTo(side * 44, -2)
      c.quadraticCurveTo(side * 104, -6, side * 96, -52)
      c.stroke()
    }
    if (face.fright > 0.04) bristle(c, 0, 28, 76, 60, 18, 20 * face.fright, YAK.hair)
    ellipse(c, 0, 28, 78, 62, YAK.hair)
    const muzzle = 62 + Math.max(0, pose.arm) * 16 + Math.min(0, pose.arm) * 8
    ellipse(c, 0, muzzle, 40, 30, YAK.muzzle)
    for (const side of [-1, 1]) disc(c, side * 14, muzzle - 2, 6, YAK.nose)
    // A mouth under the nose: a line that turns up or down with the brow, and opens.
    const gape = Math.max(0, pose.gape), turn = Math.max(-1, Math.min(1, pose.brow))
    if (gape > 0.12) ellipse(c, 0, muzzle + 15, 9 + gape * 5, 2 + gape * 9, '#3a2428')
    else {
      c.strokeStyle = YAK.nose
      c.lineWidth = 3
      c.lineCap = 'round'
      c.beginPath()
      c.moveTo(-13, muzzle + 14 - turn * 3)
      c.quadraticCurveTo(0, muzzle + 14 + turn * 9, 13, muzzle + 14 - turn * 3)
      c.stroke()
    }
    for (const side of [-1, 1]) eye(c, side * 30, 22, 12, pose.lids, '#f0e6d2', YAK.hair, face, 0.1)
    // The fringe. At rest it hangs to the eyes. A wind in the face streams it back; a fan that sucks draws it out and down;
    // a fright stands it straight up.
    const f = Math.max(pose.special, face.fright * 1.15)
    c.strokeStyle = YAK.dark
    c.lineCap = 'round'
    c.lineWidth = 11
    for (let i = -4; i <= 4; i++) {
      const x = i * 15, top = -18
      c.beginPath()
      c.moveTo(x, top)
      if (f >= 0) c.quadraticCurveTo(x + f * 10, top + 18 * (1 - f) - f * 26, x + f * 4, top + 34 * (1 - f) - f * 44)
      else c.quadraticCurveTo(x * (1 + f * 0.3), top + 36, x * (1 + f * 0.75), top + 34 - f * 80)
      c.stroke()
    }
    // Her brows, heavy, over the hair.
    for (const side of [-1, 1]) brow(c, side * 19, 6 - Math.abs(turn) * 7, side * 44, 5 - Math.max(0, turn) * 9 + Math.max(0, -turn) * 7, 6, YAK.dark)
  },
  front() {},
}

const TORTOISE = { shell: '#6f7f4a', plate: '#55643a', rim: '#8c9a62', skin: '#a8a67c', dark: '#7d7c58' }
const tortoise: Painter = {
  behind(c, pose, breath, face) {
    c.translate(0, 30 - pose.hop * 14 - face.fright * 10 * Math.abs(Math.sin(face.fright * 14)))
    // The neck comes up out of the shell, over the counter, and goes back in: all the way in at -1.
    const out = pose.special
    if (out > -0.95) {
      const length = 34 + 30 * Math.max(-0.7, out)
      c.save()
      c.translate(0, 8)
      c.rotate(pose.turn * 0.5 + pose.lean * 0.12)
      c.strokeStyle = TORTOISE.skin
      c.lineCap = 'round'
      c.lineWidth = 30
      c.beginPath()
      c.moveTo(0, 14)
      c.lineTo(0, -length + 14)
      c.stroke()
      ellipse(c, 0, -length, 29, 24, TORTOISE.skin)
      for (const side of [-1, 1]) eye(c, side * 13, -length - 3, 9, pose.lids, '#f1ecd6', TORTOISE.skin, face, 0.1)
      // A wrinkle over each eye for a brow, and a wide slow mouth.
      const b = Math.max(-1, Math.min(1, pose.brow)), gape = Math.max(0, pose.gape)
      for (const side of [-1, 1]) brow(c, side * 5, -length - 15 - Math.abs(b) * 5, side * 22, -length - 14 - Math.max(0, b) * 6 + Math.max(0, -b) * 5, 2.6, TORTOISE.dark)
      if (gape > 0.12) ellipse(c, 0, -length + 13, 8 + gape * 3, 1.5 + gape * 6, '#3a2428')
      else {
        c.strokeStyle = TORTOISE.dark
        c.lineWidth = 2.6
        c.lineCap = 'round'
        c.beginPath()
        c.moveTo(-13, -length + 11 - b * 3)
        c.quadraticCurveTo(0, -length + 12 + b * 8 + 3, 13, -length + 11 - b * 3)
        c.stroke()
      }
      c.restore()
    }
    // The shell, domed, with its plates: it rises a hair with each slow breath.
    ellipse(c, 0, 44, 96, 70 + breath * 1.5, TORTOISE.rim)
    ellipse(c, 0, 40, 86, 62 + breath * 1.5, TORTOISE.shell)
    c.strokeStyle = TORTOISE.plate
    c.lineWidth = 4
    for (const [x, y, r] of [[0, 30, 26], [-44, 44, 20], [44, 44, 20], [-22, 0, 16], [22, 0, 16]] as const) {
      c.beginPath()
      for (let i = 0; i < 6; i++) c.lineTo(x + Math.cos((i / 6) * Math.PI * 2) * r, y + Math.sin((i / 6) * Math.PI * 2) * r * 0.86)
      c.closePath()
      c.stroke()
    }
  },
  front(c, pose, edge) {
    // Two blunt feet on the counter; one shifts.
    for (const side of [-1, 1]) {
      const lift = side === 1 ? pose.arm * 12 : 0
      if (pose.special <= -0.9) continue
      ellipse(c, side * 96, edge + 22 - lift, 20, 15, TORTOISE.skin)
      for (let t = -1; t <= 1; t++) disc(c, side * 96 + t * 10, edge + 33 - lift, 3.4, TORTOISE.dark)
    }
  },
}

const COCKATOO = { white: '#f5f3ec', shade: '#dcd9cc', crest: '#f2cf3c', beak: '#5a5e66', cheek: '#f3e19a' }
const cockatoo: Painter = {
  behind(c, pose, breath, face) {
    c.translate(0, -pose.hop * 16)
    // A wing lifts and beats time.
    c.save()
    c.translate(60, 84)
    c.rotate(-0.3 - pose.arm * 0.9)
    ellipse(c, 34, 0, 52, 24, COCKATOO.shade)
    c.restore()
    if (face.fright > 0.04) bristle(c, 0, 96, 72, 60, 14, 15 * face.fright, COCKATOO.white, Math.PI, Math.PI * 2)
    ellipse(c, 0, 96, 74 + breath * 1.5, 62, COCKATOO.white)
    // The head slumps forward in sleep, and rocks from side to side when it sings.
    c.save()
    c.translate(pose.turn * 14, 34 + Math.max(0, pose.lean) * 30 + Math.min(0, pose.lean) * 14)
    c.rotate(pose.turn * 0.35 + Math.max(0, pose.lean) * 0.5)
    // The crest is the gauge of its spirits: flat along the head at 0, fanned right up at 1, and at a fright bolt upright
    // and every feather apart.
    const up = Math.max(0, Math.min(1, Math.max(pose.special, face.fright)))
    for (let i = 0; i < 5; i++) {
      c.save()
      c.translate(-6 + i * 4, -34)
      c.rotate(-1.5 + up * (0.7 + i * 0.22) + i * 0.07 + face.fright * (i - 2) * 0.16)
      c.beginPath()
      c.ellipse(0, -(18 + i * 5), 7, 24 + i * 5, 0, 0, Math.PI * 2)
      c.fillStyle = COCKATOO.crest
      c.fill()
      c.restore()
    }
    if (face.fright > 0.04) bristle(c, 0, 0, 48, 44, 16, 13 * face.fright, COCKATOO.white)
    ellipse(c, 0, 0, 50, 46, COCKATOO.white)
    disc(c, 26, 12, 10, COCKATOO.cheek)
    for (const side of [-1, 1]) eye(c, side * 22, -4, 9.5, pose.lids, '#b9d3dc', COCKATOO.white, face, 0.05)
    const b = Math.max(-1, Math.min(1, pose.brow)), gape = Math.max(0, pose.gape)
    for (const side of [-1, 1]) brow(c, side * 13, -17 - Math.abs(b) * 6, side * 31, -18 - Math.max(0, b) * 7 + Math.max(0, -b) * 6, 3, COCKATOO.shade)
    // The beak: the lower half drops open, and there is a tongue in there.
    c.fillStyle = '#44474e'
    c.beginPath()
    c.moveTo(-8, 22)
    c.quadraticCurveTo(0, 30 + gape * 20, 8, 22)
    c.closePath()
    c.fill()
    if (gape > 0.12) ellipse(c, 0, 25 + gape * 6, 3.4, 2 + gape * 4, '#d98c8c')
    c.fillStyle = COCKATOO.beak
    c.beginPath()
    c.moveTo(-12, 6)
    c.quadraticCurveTo(0, 2, 12, 6)
    c.quadraticCurveTo(8, 34 - gape * 8, 0, 38 - gape * 10)
    c.quadraticCurveTo(-8, 34 - gape * 8, -12, 6)
    c.fill()
    c.restore()
  },
  front(c, _pose, edge) {
    for (const side of [-1, 1]) {
      c.strokeStyle = COCKATOO.beak
      c.lineWidth = 5
      c.lineCap = 'round'
      for (let t = -1; t <= 1; t++) { c.beginPath(); c.moveTo(side * 34 + t * 8, edge + 12); c.lineTo(side * 34 + t * 11, edge + 28); c.stroke() }
    }
  },
}

const MAGPIE = { black: '#20242b', white: '#f1f1ee', blue: '#2f4f8f', beak: '#6b7280' }
const magpie: Painter = {
  behind(c, pose, breath, face) {
    c.translate(0, -pose.hop * 22)
    // A long tail out to one side, which flicks.
    c.save()
    c.translate(-52, 80)
    c.rotate(-0.5 - pose.special * 0.7 + face.fright * 1.1)
    ellipse(c, -70, 0, 78, 12, MAGPIE.black)
    ellipse(c, -66, -3, 60, 5, MAGPIE.blue)
    c.restore()
    // A wing that snatches.
    c.save()
    c.translate(54, 80)
    c.rotate(0.3 + pose.arm * 0.9)
    ellipse(c, 26, 0, 44, 18, MAGPIE.blue)
    ellipse(c, 34, 4, 30, 10, MAGPIE.white)
    c.restore()
    if (face.fright > 0.04) bristle(c, 0, 94, 68, 56, 14, 15 * face.fright, MAGPIE.black, Math.PI, Math.PI * 2)
    ellipse(c, 0, 94, 70 + breath * 1.5, 58, MAGPIE.black)
    ellipse(c, 0, 108, 46, 40, MAGPIE.white)
    // The head pecks down at the counter and cocks to one side.
    c.save()
    c.translate(pose.turn * 10, 34 + Math.max(0, pose.lean) * 46 + Math.min(0, pose.lean) * 14)
    c.rotate(pose.turn * 0.6)
    if (face.fright > 0.04) bristle(c, 0, 0, 40, 38, 16, 14 * face.fright, MAGPIE.black)
    ellipse(c, 0, 0, 42, 40, MAGPIE.black)
    for (const side of [-1, 1]) eye(c, side * 19, -4, 9, pose.lids, '#f4f4f0', MAGPIE.black, face, 0.05)
    const b = Math.max(-1, Math.min(1, pose.brow)), gape = Math.max(0, pose.gape)
    for (const side of [-1, 1]) brow(c, side * 10, -16 - Math.abs(b) * 6, side * 28, -18 - Math.max(0, b) * 6 + Math.max(0, -b) * 7, 3, '#5d6470')
    // The beak opens like a pair of tongs.
    for (const half of [-1, 1]) {
      c.save()
      c.translate(0, 12)
      c.rotate(half * gape * 0.3)
      c.fillStyle = half < 0 ? MAGPIE.beak : '#585e69'
      c.beginPath()
      c.moveTo(half * 9, 0)
      c.lineTo(0, 34)
      c.lineTo(0, 0)
      c.closePath()
      c.fill()
      c.restore()
    }
    c.restore()
  },
  front(c, _pose, edge) {
    c.strokeStyle = MAGPIE.beak
    c.lineWidth = 4
    c.lineCap = 'round'
    for (const side of [-1, 1]) for (let t = -1; t <= 1; t++) { c.beginPath(); c.moveTo(side * 30 + t * 7, edge + 12); c.lineTo(side * 30 + t * 10, edge + 26); c.stroke() }
  },
}

const PAINTERS: Record<Who, Painter> = { owl, moth, yak, tortoise, cockatoo, magpie }

/** The part of a customer that stands beyond the counter. Draw the counter over it afterwards. */
export function paintCustomerBehind(c: Ctx, who: Who, x: number, y: number, size: number, pose: Pose, breath: number, face: Face): void {
  c.save()
  c.translate(x, y)
  c.scale(size * FOLK_SCALE, size * FOLK_SCALE)
  PAINTERS[who].behind(c, pose, breath, face)
  c.restore()
}

/** The part of a customer that rests on the counter. `edge` is how far below the customer's origin the counter's far edge is. */
export function paintCustomerFront(c: Ctx, who: Who, x: number, y: number, size: number, pose: Pose, edge: number): void {
  c.save()
  c.translate(x, y)
  c.scale(size * FOLK_SCALE, size * FOLK_SCALE)
  PAINTERS[who].front(c, pose, edge / (size * FOLK_SCALE))
  c.restore()
}
