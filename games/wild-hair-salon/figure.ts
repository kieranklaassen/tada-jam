import { STRIP_W } from './layout'
import { LOOKS, RIBBON, hueOf, type Look } from './looks'
import { tuftPose, type Point } from './poses'
import type { Puppet } from './puppet'
import type { Hair } from './hair'
import type { Sprite, Sprites } from './sprites'
import type { Shown } from './staging'
import type { CustomerId } from './tastes'
import { GRAPHITE, PAPER, type Ctx } from './wash'

// How one customer is drawn: its painted pieces stamped where its puppet's
// parts put them, and its face's features drawn fresh each frame in pencil
// and a few dark dots. The same drawing serves the customer in the chair,
// whose mane is nine tufts that change, and a friend, whose whole head of
// hair is one sheet. Each function returns how many pieces it drew.

const INK = '#3b3136'

export function stamp(g: Ctx, sprite: Sprite): number {
  g.drawImage(sprite.sheet.canvas, sprite.box.x, sprite.box.y, sprite.box.w, sprite.box.h)
  return 1
}

/** A pencil line through some points. */
export function pencil(g: Ctx, points: readonly Point[], weight = 1.2, alpha = 0.6): void {
  g.save()
  g.strokeStyle = GRAPHITE
  g.globalAlpha *= alpha
  g.lineWidth = weight
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  g.moveTo(points[0].x, points[0].y)
  for (let i = 1; i < points.length - 1; i++) g.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2)
  g.lineTo(points[points.length - 1].x, points[points.length - 1].y)
  g.stroke()
  g.restore()
}

export type Wears = {
  /** The spots on the face where a piece is stuck, each with half its length in head units and its colour. */
  pieces: readonly { y: number; half: number; hue: string }[]
  blindfold: boolean
  /** A rain hat, hair tucked under: 0 off, 1 on. */
  hat: number
}

export type Figure = {
  who: CustomerId
  puppet: Puppet
  at: Shown
  /** The customer's own mane, as long as the model has it, with the hair's springs; nothing for a friend, whose hair is one sheet. */
  mane: { steps: readonly number[]; hair: Hair } | null
  /** Its body shows: it is out of the cape. 0 to 1. */
  body: number
  wears: Wears
  time: number
}

/**
 * One customer, from its body up. The whole figure hops, shifts and turns as
 * its puppet says; its head leans, sinks and tilts; everything on the head
 * goes with it.
 */
export function drawFigure(g: Ctx, sprites: Sprites, figure: Figure): number {
  const { who, puppet, at } = figure
  if (at.seen <= 0 || at.s <= 0) return 0
  const look = LOOKS[who], animal = sprites.animal(who)
  const breath = Math.sin(puppet.breath * Math.PI * 2)
  let drawn = 0
  g.save()
  g.globalAlpha *= at.seen
  g.translate(at.x + puppet.at('shift') * 40 * at.s, at.y - at.lift - puppet.at('lift') * 46 * at.s)
  // A turn on the spot is seen as the figure narrowing and widening again.
  g.scale(at.s * Math.cos(puppet.at('spin') * Math.PI * 2), at.s)

  if (figure.body > 0) {
    g.save()
    g.globalAlpha *= figure.body
    drawn += stamp(g, animal.body)
    g.restore()
  }

  g.translate(puppet.lean.x.x + puppet.cheek.x.x * 0.3, puppet.lean.y.x + puppet.cheek.y.x * 0.3 + puppet.at('sink') * 64 + puppet.at('bob') * 12 + breath * 1.6)
  g.rotate(puppet.at('tilt') * 0.17)

  const hatted = figure.wears.hat > 0.5
  if (!hatted) {
    if (figure.mane) {
      const { steps, hair } = figure.mane, count = steps.length
      steps.forEach((length, index) => {
        const tuft = hair.tufts[index]
        if (!tuft) return
        const pose = tuftPose(who, index, length, count)
        const painted = sprites.tuft(who, index, length, count, hair.holds === index || tuft.rest !== 1)
        const frizz = 1 + tuft.frizz * 0.22
        g.save()
        g.translate(pose.base.x, pose.base.y)
        g.rotate(pose.angle + tuft.lean.x + tuft.frizz * 0.25 * Math.sin(figure.time * 31 + index * 2.3))
        // A tuft that is longer or shorter than its sheet is stretched along itself until it is painted again.
        g.scale(frizz, (pose.reach / tuftPose(who, index, painted.steps, count).reach) * Math.max(0.1, tuft.stretch.x) * frizz)
        drawn += stamp(g, painted.sprite)
        g.restore()
      })
      drawn += stamp(g, animal.ruff)
    }
  }
  const ears = (): void => {
    for (const side of [-1, 1]) {
      g.save()
      g.translate(side * look.ears.x, look.ears.y)
      g.scale(side, 1)
      g.rotate(puppet.at(side < 0 ? 'earL' : 'earR') * look.ears.swing + (look.ears.kind === 'long' ? 0.12 : 0))
      drawn += stamp(g, animal.ear)
      g.restore()
    }
  }
  // Long ears and horns stand behind the face; poms and round ears sit on it.
  if (!hatted && look.ears.kind === 'long') ears()

  // A pulled cheek draws the whole face out like dough.
  const cx = puppet.cheek.x.x, cy = puppet.cheek.y.x
  g.save()
  g.transform(1 + Math.abs(cx) / 230, 0, 0, 1 + Math.abs(cy) / 230 - breath * 0.006, cx * 0.25, cy * 0.25)
  if (figure.mane || hatted) drawn += stamp(g, animal.face)
  else drawn += stamp(g, sprites.friendHead(who))
  drawn += features(g, puppet, look, at.s < 0.5)
  for (const piece of figure.wears.pieces) drawn += strip(g, 0, piece.y, piece.half, 0, piece.hue)
  if (figure.wears.blindfold) drawn += blindfold(g, puppet.at('brow') > 0.5 ? 1 : 0)
  g.restore()
  if (!hatted && look.ears.kind !== 'long') ears()

  if (figure.wears.hat > 0) {
    g.save()
    g.globalAlpha *= Math.min(1, figure.wears.hat * 2)
    g.translate(0, -30 - (1 - figure.wears.hat) * 260)
    g.rotate((1 - figure.wears.hat) * 1.4)
    drawn += stamp(g, sprites.hat)
    g.restore()
  }
  g.restore()
  return drawn
}

/** A flat strip lying about a point: a clipping, or a worn piece. One colour and a darker rim. */
export function strip(g: Ctx, x: number, y: number, half: number, turn: number, hue: string): number {
  const colour = hueOf(hue), h = STRIP_W / 2
  g.save()
  g.translate(x, y)
  g.rotate(turn)
  g.fillStyle = colour.fill
  g.strokeStyle = colour.edge
  g.lineWidth = 2.4
  g.beginPath()
  g.rect(-half, -h, half * 2, h * 2)
  g.fill()
  g.stroke()
  g.restore()
  return 2
}

/** The ribbon round a head as a blindfold: a flat band over the eyes with a knot at the side. Lifted a little when its wearer peeks. */
function blindfold(g: Ctx, lifted: number): number {
  g.save()
  g.translate(0, -14 - lifted * 22)
  g.rotate(lifted * -0.12)
  g.fillStyle = RIBBON.fill
  g.strokeStyle = RIBBON.edge
  g.lineWidth = 2.4
  g.beginPath()
  g.rect(-110, -15, 220, 30)
  g.moveTo(104, -4)
  g.lineTo(140, -26)
  g.lineTo(134, 4)
  g.lineTo(146, 30)
  g.lineTo(104, 8)
  g.closePath()
  g.fill()
  g.stroke()
  g.restore()
  return 2
}

/** Several pencil lines in one stroke. */
function lines(g: Ctx, all: readonly (readonly Point[])[], weight: number, alpha: number): void {
  if (all.length === 0) return
  g.save()
  g.strokeStyle = GRAPHITE
  g.globalAlpha *= alpha
  g.lineWidth = weight
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  for (const points of all) {
    g.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length - 1; i++) g.quadraticCurveTo(points[i].x, points[i].y, (points[i].x + points[i + 1].x) / 2, (points[i].y + points[i + 1].y) / 2)
    g.lineTo(points[points.length - 1].x, points[points.length - 1].y)
  }
  g.stroke()
  g.restore()
}

/**
 * The face: eyes, brows, nose, mouth and whiskers, in pencil and a few dark
 * dots, where the puppet's parts put them. Both eyes are one mark, and so are
 * their glints, the brows, and the whiskers. A figure drawn small, behind the
 * door's pane, has only its eyes.
 */
function features(g: Ctx, puppet: Puppet, look: Look, small: boolean): number {
  const blink = Math.max(0, Math.min(1, puppet.at('blink'))), wide = puppet.at('wide'), cross = puppet.at('cross')
  const lookX = puppet.at('lookX') * 9, lookY = puppet.at('lookY') * 8, brow = puppet.at('brow')
  const { apart, size, y } = look.eyes
  const shut = blink > 0.75, r = size * (1 + wide * 0.3)
  const eye = (side: number): Point => ({ x: side * apart + lookX - side * cross * 15, y: y + lookY })
  const pencilled: Point[][] = []
  let drawn = 0
  if (!shut) {
    g.fillStyle = INK
    g.beginPath()
    for (const side of [-1, 1]) { const e = eye(side); g.moveTo(e.x + r, e.y + blink * 4); g.ellipse(e.x, e.y + blink * 4, r, r * (1 - blink * 0.85), 0, 0, Math.PI * 2) }
    g.fill()
    g.fillStyle = PAPER
    g.beginPath()
    for (const side of [-1, 1]) { const e = eye(side); g.moveTo(e.x - 4 + size * 0.32, e.y - 4); g.arc(e.x - 4, e.y - 4, size * 0.32, 0, Math.PI * 2) }
    g.fill()
    drawn += 2
  } else for (const side of [-1, 1]) { const e = eye(side); pencilled.push([{ x: e.x - 15, y: e.y }, { x: e.x, y: e.y + 7 }, { x: e.x + 15, y: e.y }]) }
  if (small) { lines(g, pencilled, 2.4, 0.9); return drawn + (shut ? 1 : 0) }
  // Brows: the inner end goes up when it wonders and down when it is cross.
  for (const side of [-1, 1]) pencilled.push([{ x: side * apart - 19, y: y - 30 - brow * 7 + side * 2 - side * brow * 5 }, { x: side * apart, y: y - 37 - brow * 12 }, { x: side * apart + 19, y: y - 30 - brow * 7 - side * 2 + side * brow * 5 }])
  lines(g, pencilled, 2.1, 0.85)
  drawn++

  const n = puppet.at('nose'), nx = n * 3.5
  const smile = puppet.at('smile'), open = Math.max(0, puppet.at('mouthOpen'))
  g.fillStyle = look.nose
  g.beginPath()
  let mouthY = 44
  if (look.snout === 'cat') {
    g.moveTo(-15 + nx, 18)
    g.quadraticCurveTo(nx, 12, 15 + nx, 18)
    g.quadraticCurveTo(8 + nx, 33, nx, 34)
    g.quadraticCurveTo(-8 + nx, 33, -15 + nx, 18)
  } else if (look.snout === 'button') {
    // A small round black nose, high on a narrow face.
    g.ellipse(nx, 20, 12, 10 + Math.abs(n) * 2, 0, 0, Math.PI * 2)
  } else if (look.snout === 'muzzle') {
    // A wide soft muzzle with two nostrils that flare: the yak does everything with them.
    mouthY = 62
    g.ellipse(0, 34, 46, 26, 0, 0, Math.PI * 2)
    g.fill()
    drawn++
    g.fillStyle = INK
    g.beginPath()
    for (const side of [-1, 1]) { g.moveTo(side * 18 + 7 + Math.max(0, n) * 4, 30); g.ellipse(side * 18, 30, 7 + Math.max(0, n) * 4, 5 + Math.max(0, n) * 4 - Math.max(0, -n) * 3, 0, 0, Math.PI * 2) }
  } else {
    // A pink nose that never stops, and two front teeth below it.
    g.moveTo(-10 + nx, 16 + n * 2)
    g.lineTo(10 + nx, 16 - n * 2)
    g.lineTo(nx, 28)
    g.closePath()
  }
  g.fill()
  drawn++
  if (open > 0.08) {
    g.fillStyle = '#a5483a'
    g.beginPath()
    g.ellipse(0, mouthY + 8 + open * 9, 15 + open * 7, 4 + open * 17, 0, 0, Math.PI * 2)
    g.fill()
    drawn++
  }
  if (look.snout === 'bunny') {
    g.fillStyle = PAPER
    g.strokeStyle = GRAPHITE
    g.lineWidth = 1.4
    g.beginPath()
    g.rect(-9, mouthY + 2, 18, 14 + open * 6)
    g.fill()
    g.stroke()
    drawn++
  }
  // The mouth: the line down from the nose, and a curve that smiles or droops.
  const mouth: Point[][] = [[{ x: -27, y: mouthY + 3 - smile * 11 }, { x: -11, y: mouthY + 2 + smile * 6 }, { x: 0, y: mouthY }, { x: 11, y: mouthY + 2 + smile * 6 }, { x: 27, y: mouthY + 3 - smile * 11 }]]
  if (look.snout !== 'muzzle') mouth.push([{ x: nx, y: look.snout === 'bunny' ? 28 : 34 }, { x: 0, y: mouthY }])
  lines(g, mouth, 2, 0.85)
  drawn++
  if (look.snout === 'cat' || look.snout === 'bunny') {
    g.fillStyle = INK
    g.beginPath()
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const wx = side * (34 + i * 9) + nx * 0.5, wy = 40 + (i % 2) * 6
      g.moveTo(wx + 1.7, wy)
      g.arc(wx, wy, 1.7, 0, Math.PI * 2)
    }
    g.fill()
    drawn++
  }
  return drawn
}
