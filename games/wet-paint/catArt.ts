import type { CatPose } from './cat'
import { BLUE, INKS, css, type Ink } from './colours'
import { CAT, TRAY } from './layout'
import { bake, type G, type MakeSheet, type Pen, type Sprite } from './surface'

// The cat as it is drawn: cut from one sheet of combed orange paper, whose
// feathered bands are its tabby stripes. Its parts are drawn once each and
// stamped after; only what changes shape (the tail, the lids, the whiskers)
// is drawn with the pen. Every number that moves comes from the pose in
// cat.ts, and every number of the pose is read here; nothing here keeps time.

/** The tones of the cat's paper: orange, cream, rust, pale orange. */
export const FUR: readonly Ink[] = [
  { face: [233, 146, 58], edge: [201, 112, 38] },
  { face: [247, 219, 170], edge: [226, 186, 128] },
  { face: [203, 108, 36], edge: [170, 84, 24] },
  { face: [241, 174, 92], edge: [214, 138, 60] },
]
const FUR_LINE = '#9c4f18'
const ORANGE_FUR = css(FUR[0].face)
const RUST = css(FUR[2].face)
const CREAM = '#f9e6c4'
const PINK = '#eb9d92'
const PINK_LINE = '#c8736a'
const DARK = '#33251f'
const IRIS = '#dfe58c'
const LID = '#e08a36'
const TAU = Math.PI * 2

export type CatSprites = { body: Sprite; combed: Sprite; head: Sprite; muzzle: Sprite; ear: Sprite; iris: Sprite; pupil: Sprite; paw: Sprite; tongue: Sprite; bubble: Sprite }

/** The body's middle, measured from where it is stamped: the far rim of the tray, a little way down. */
const BODY_Y = CAT.body.y - TRAY.y - 40

/** Draws each part of the cat once. `fur` is its sheet of combed paper, 540 by 360 stage units. */
export function bakeCat(make: MakeSheet, k: number, fur: CanvasImageSource): CatSprites {
  const body = CAT.body, head = CAT.head
  const furred = (g: G, x: number, y: number): void => {
    g.save()
    g.clip()
    g.drawImage(fur, x, y, 540, 360)
    g.restore()
  }
  const outline = (g: G, width: number): void => {
    g.strokeStyle = FUR_LINE
    g.lineWidth = width
    g.stroke()
  }
  return {
    body: bake(make, k, { x: -body.rx - 4, y: BODY_Y - body.ry - 4, w: body.rx * 2 + 8, h: body.ry * 2 + 8 }, (g) => {
      g.beginPath()
      g.ellipse(0, BODY_Y, body.rx, body.ry, 0, 0, TAU)
      furred(g, -body.rx - 4, BODY_Y - body.ry - 4)
      outline(g, 3)
    }),
    // Combed: the same back in neat stripes that run down from a parting.
    combed: bake(make, k, { x: -150, y: BODY_Y - body.ry, w: 300, h: 92 }, (g) => {
      g.beginPath()
      g.ellipse(0, BODY_Y, body.rx - 5, body.ry - 4, 0, 0, TAU)
      g.clip()
      g.fillStyle = ORANGE_FUR
      g.fillRect(-150, BODY_Y - body.ry, 300, 92)
      g.strokeStyle = RUST
      g.lineWidth = 5
      g.beginPath()
      for (let i = -9; i <= 9; i++) {
        if (i === 0) continue
        const x = i * 15 + (i < 0 ? -4 : 4)
        g.moveTo(x, BODY_Y - body.ry - 4)
        g.quadraticCurveTo(x + i * 2.4, BODY_Y - body.ry + 40, x + i * 5, BODY_Y - body.ry + 96)
      }
      g.stroke()
      g.strokeStyle = CREAM
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(0, BODY_Y - body.ry)
      g.lineTo(0, BODY_Y - body.ry + 92)
      g.stroke()
    }),
    head: bake(make, k, { x: -head.rx - 4, y: -head.ry - 4, w: head.rx * 2 + 8, h: head.ry * 2 + 8 }, (g) => {
      g.beginPath()
      g.ellipse(0, 0, head.rx, head.ry, 0, 0, TAU)
      furred(g, -head.rx - 160, -head.ry - 120)
      outline(g, 3)
      // A dab of blue it has not noticed.
      g.beginPath()
      g.ellipse(52, -60, 13, 8, -0.3, 0, TAU)
      g.fillStyle = css(INKS[BLUE].face)
      g.fill()
    }),
    muzzle: bake(make, k, { x: -52, y: 2, w: 104, h: 70 }, (g) => {
      g.beginPath()
      g.ellipse(0, 36, 48, 31, 0, 0, TAU)
      g.fillStyle = CREAM
      g.fill()
      g.beginPath()
      g.moveTo(-10, 15)
      g.lineTo(10, 15)
      g.lineTo(0, 27)
      g.closePath()
      g.fillStyle = PINK
      g.fill()
      g.beginPath()
      g.moveTo(0, 27)
      g.lineTo(0, 31)
      g.moveTo(-18, 30)
      g.quadraticCurveTo(-9, 40, 0, 31)
      g.quadraticCurveTo(9, 40, 18, 30)
      g.strokeStyle = DARK
      g.lineWidth = 2.5
      g.stroke()
    }),
    ear: bake(make, k, { x: -34, y: -58, w: 68, h: 76 }, (g) => {
      g.beginPath()
      g.moveTo(-30, 14)
      g.quadraticCurveTo(-12, -30, 0, -54)
      g.quadraticCurveTo(14, -30, 30, 14)
      g.closePath()
      furred(g, -200, -150)
      outline(g, 3)
      g.beginPath()
      g.moveTo(-15, 8)
      g.lineTo(0, -34)
      g.lineTo(15, 8)
      g.closePath()
      g.fillStyle = PINK
      g.fill()
    }),
    iris: bake(make, k, { x: -31, y: -31, w: 62, h: 62 }, (g) => {
      g.beginPath()
      g.ellipse(0, 0, 28, 28, 0, 0, TAU)
      g.fillStyle = IRIS
      g.fill()
      g.strokeStyle = DARK
      g.lineWidth = 3
      g.stroke()
    }),
    pupil: bake(make, k, { x: -21, y: -23, w: 42, h: 46 }, (g) => {
      g.beginPath()
      g.ellipse(0, 0, 20, 22, 0, 0, TAU)
      g.fillStyle = DARK
      g.fill()
      g.beginPath()
      g.ellipse(-6, -9, 4.5, 4.5, 0, 0, TAU)
      g.fillStyle = '#ffffff'
      g.fill()
    }),
    paw: bake(make, k, { x: -37, y: -17, w: 74, h: 34 }, (g) => {
      g.beginPath()
      g.ellipse(0, 0, 34, 14, 0, 0, TAU)
      g.fillStyle = CREAM
      g.fill()
      outline(g, 2.5)
      g.beginPath()
      g.moveTo(-10, 3)
      g.lineTo(-10, 11)
      g.moveTo(10, 3)
      g.lineTo(10, 11)
      outline(g, 2)
    }),
    tongue: bake(make, k, { x: -9, y: -1, w: 18, h: 33 }, (g) => {
      g.beginPath()
      g.moveTo(-7, 0)
      g.lineTo(-7, 22)
      g.quadraticCurveTo(0, 32, 7, 22)
      g.lineTo(7, 0)
      g.closePath()
      g.fillStyle = PINK
      g.fill()
      g.strokeStyle = PINK_LINE
      g.lineWidth = 1.5
      g.stroke()
    }),
    // A soap bubble: a pale skin with a sickle of light on it, so it is a bubble and not a ring.
    bubble: bake(make, k, { x: -25, y: -25, w: 50, h: 50 }, (g) => {
      g.beginPath()
      g.ellipse(0, 0, 22, 22, 0, 0, TAU)
      g.fillStyle = 'rgba(214, 236, 246, 0.72)'
      g.fill()
      g.beginPath()
      g.ellipse(-7, -8, 9, 5, -0.7, 0, TAU)
      g.fillStyle = '#ffffff'
      g.fill()
      g.beginPath()
      g.ellipse(9, 10, 4, 2.5, -0.7, 0, TAU)
      g.fillStyle = 'rgba(190, 150, 210, 0.7)'
      g.fill()
    }),
  }
}

/** The cat behind the tray: tail, body and head. Its paws are drawn later, over the rim and whatever they hold. */
export function drawCat(pen: Pen, pose: CatPose, sprites: CatSprites): void {
  const g = pen.g
  const leanIn = Math.max(0, pose.lean), leanAway = Math.max(0, -pose.lean)
  g.lineJoin = 'round'
  g.lineCap = 'round'

  // The tail lies along the back of the table and keeps its own time: an orange line with rust bands.
  const sweep = pose.tail, tip = pose.tailTip
  g.beginPath()
  g.moveTo(446, 250)
  g.bezierCurveTo(520, 262 + 10 * sweep, 590, 232 - 24 * sweep, 636, 246 - 10 * sweep)
  g.quadraticCurveTo(660, 250 - 8 * sweep, 664 + 9 * tip, 214 - 5 * Math.abs(tip))
  pen.line(FUR_LINE, 31)
  pen.line(ORANGE_FUR, 26)
  g.setLineDash([9, 17])
  g.lineCap = 'butt'
  pen.line(RUST, 26)
  g.setLineDash([])
  g.lineCap = 'round'

  // The body, behind the tray. It wiggles when the cat hunts, and hops.
  const body = CAT.body, squash = pose.squash
  g.save()
  // All but its top is hidden by the tray's far rim.
  g.beginPath()
  g.rect(-200, -200, 1600, TRAY.y + 203)
  g.clip()
  g.translate(body.x - 10 * leanAway + 5 * pose.wiggle, TRAY.y + 40 - pose.hop)
  g.scale(1 - 0.35 * squash, 1 + 0.5 * squash + 0.014 * pose.breath)
  pen.stamp(sprites.body)
  if (pose.parting >= 0.5) pen.stamp(sprites.combed)
  // Fur stroked the wrong way stands up along the back.
  if (pose.ruffle > 0.03) {
    g.beginPath()
    for (let i = 0; i < 6; i++) {
      const angle = Math.PI * (1.08 + 0.085 * i), ex = Math.cos(angle) * body.rx, ey = BODY_Y + Math.sin(angle) * body.ry
      const tall = (14 + 5 * (i % 2)) * pose.ruffle
      g.moveTo(ex - 9, ey + 4)
      g.lineTo(ex - 7 - tall * 0.5, ey - tall)
      g.lineTo(ex + 9, ey + 2)
    }
    pen.fill(RUST)
  }
  g.restore()

  // The head, with its chin on the rim. Leaning in it comes nearer; leaning away it draws back and up; smug, it lifts its chin.
  const head = CAT.head, turn = pose.turn
  const near = 1 + 0.06 * leanIn - 0.06 * leanAway
  g.save()
  g.translate(head.x + 15 * turn, head.y + head.ry - 16 * leanAway - pose.hop - 12 * pose.smug)
  g.rotate(0.24 * pose.tilt)
  g.scale(near * (1 - 0.1 * squash), near * (1 + 0.22 * squash))
  g.translate(0, -head.ry - 1.5 * pose.breath)

  for (const side of [-1, 1]) {
    const lay = side < 0 ? pose.earLeft : pose.earRight
    g.save()
    g.translate(side * 66 - 5 * turn, -56)
    g.rotate(side * (0.3 + 0.95 * lay))
    pen.stamp(sprites.ear)
    g.restore()
  }
  pen.stamp(sprites.head)
  const face = 11 * turn
  pen.stamp(sprites.muzzle, face, -4 * pose.wrinkle)

  // The eyes: a little cross-eyed always, and right in at the nose when a bubble sits on it.
  const lid = pose.lid
  for (const side of [-1, 1]) {
    const ex = side * 47 + face, ey = -12
    pen.stamp(sprites.iris, ex, ey)
    const px = ex + 9 * pose.lookX * (1 - pose.cross) - side * (3 + 11 * pose.cross), py = ey + 8 * pose.lookY * (1 - pose.cross) + 9 * pose.cross
    g.save()
    g.translate(px, py)
    g.scale((5 + 15 * pose.pupil) / 20, 1)
    pen.stamp(sprites.pupil)
    g.restore()
  }
  if (lid > 0.02) {
    // Each lid comes down over its eye as far as it is shut: the part of the eye's round above one level line.
    const shut = -26.5 + 53 * Math.min(1, lid), half = Math.sqrt(Math.max(0, 26.5 * 26.5 - shut * shut)), from = Math.atan2(shut, -half), to = Math.atan2(shut, half)
    g.beginPath()
    for (const side of [-1, 1]) {
      const ex = side * 47 + face, ey = -12
      g.moveTo(ex - half, ey + shut)
      g.arc(ex, ey, 26.5, from, to, false)
      g.closePath()
    }
    pen.fill(LID)
    // The lid's own edge and nothing more: a level line that bows as it comes down, and the curve of a shut eye
    // at the end. An eye that is shut is never a dark ring.
    const edge = Math.min(shut, 12), wide = Math.sqrt(26.5 * 26.5 - edge * edge), bow = 13 * Math.min(1, lid) * Math.min(1, lid)
    g.beginPath()
    for (const side of [-1, 1]) {
      const ex = side * 47 + face, ey = -12
      g.moveTo(ex - wide, ey + edge)
      g.quadraticCurveTo(ex, ey + edge + bow, ex + wide, ey + edge)
    }
    pen.line(DARK, 3)
  }

  if (pose.wind > 0.05) {
    // Blown at: the fur streams off the side of its head in three wisps of no one length.
    g.globalAlpha = Math.min(1, pose.wind)
    g.beginPath()
    for (const [y, long, bend] of [[-58, 44, -12], [-34, 62, 7], [-6, 36, -7]] as const) {
      g.moveTo(-104, y)
      g.quadraticCurveTo(-104 - long * 0.5, y + bend, -104 - long * pose.wind, y + bend * 0.4 - 10)
    }
    pen.line(RUST, 4.5)
    g.globalAlpha = 1
  }

  if (pose.wrinkle > 0.05) {
    const ny = 16 - 4 * pose.wrinkle
    g.globalAlpha = Math.min(1, pose.wrinkle)
    g.beginPath()
    for (const side of [-1, 1]) {
      g.moveTo(face + side * 7, ny - 8)
      g.quadraticCurveTo(face + side * 14, ny - 13, face + side * 21, ny - 8)
      g.moveTo(face + side * 9, ny - 15)
      g.quadraticCurveTo(face + side * 15, ny - 19, face + side * 20, ny - 15)
    }
    pen.line(FUR_LINE, 2.5)
    g.globalAlpha = 1
  }
  if (pose.mouth > 0.05) {
    g.beginPath()
    g.ellipse(face, 40, 13, 4 + 15 * pose.mouth, 0, 0, TAU)
    pen.fill(DARK)
  }
  if (pose.tongue > 0.03) {
    g.save()
    g.translate(face, 33)
    g.scale(1, (5 + 24 * pose.tongue) / 29)
    pen.stamp(sprites.tongue)
    g.restore()
  }

  // Whiskers: thrown wide at a start, streaming back in the wind.
  g.beginPath()
  for (const side of [-1, 1]) {
    for (let i = -1; i <= 1; i++) {
      const wide = Math.max(0, pose.whiskers), back = Math.max(0, -pose.whiskers)
      const angle = i * 0.2 * (1 + 1.1 * wide) * (1 - 0.7 * back) - 0.06 - 0.5 * back
      g.moveTo(face + side * 30, 38 + i * 5)
      g.lineTo(face + side * (30 + 70 * Math.cos(angle)), 38 + i * 5 + 70 * Math.sin(angle))
    }
  }
  pen.line('#fffaf0', 2)

  if (pose.bubble > 0.02) {
    g.save()
    g.translate(face, 12)
    g.scale(0.25 + 0.9 * pose.bubble, 0.25 + 0.9 * pose.bubble)
    pen.stamp(sprites.bubble)
    g.restore()
  }
  g.restore()
}

/** Its paws: on the rim, or wherever they have reached, each on the end of a foreleg when it is off the rim. */
export function drawPaws(pen: Pen, pose: CatPose, sprites: CatSprites): void {
  const g = pen.g, sink = 4 * Math.max(0, -pose.squash)
  const paws = [{ x: pose.pawLX, y: pose.pawLY, home: CAT.paws[0] }, { x: pose.pawRX, y: pose.pawRY, home: CAT.paws[1] }]
  g.lineCap = 'round'
  paws.forEach((paw, index) => {
    const away = Math.hypot(paw.x - paw.home.x, paw.y - paw.home.y)
    if (away > 8) {
      g.beginPath()
      g.moveTo(paw.home.x, paw.home.y - 26 - pose.hop)
      g.lineTo(paw.x, paw.y)
      pen.line(ORANGE_FUR, 26)
    }
    pen.stamp(sprites.paw, paw.x, paw.y + sink - (away > 8 ? 0 : pose.hop))
    if (pose.tint !== 0 && pose.tintPaw === index) {
      g.beginPath()
      g.ellipse(paw.x, paw.y + sink, 27, 10, 0, 0, TAU)
      pen.fill(css(INKS[pose.tint].face))
    }
  })
  // Two claws, one on each paw, hooked over the top edge of a print the cat holds away from itself.
  if (pose.claws > 0.05) {
    g.beginPath()
    paws.forEach((paw, index) => {
      const in1 = index === 0 ? 1 : -1, long = 17 * pose.claws
      g.moveTo(paw.x + in1 * 6, paw.y + 9)
      g.quadraticCurveTo(paw.x + in1 * 13, paw.y + 9 + long * 0.7, paw.x + in1 * 3, paw.y + 9 + long)
    })
    pen.line(DARK, 3.6)
  }
}
