import { PAW, type Raccoon } from './motion'
import { disc, INK, roundRect, type Ctx } from './paint'

// The old hand, awake on her stool at the far left of the bench, seen from
// the mender's seat as the customers are: head and shoulders over the
// counter, her mug before her on the bench, one paw on it and one free. She
// is drawn from her model each frame (motion.ts): about eighty paint calls.
//
// Everything is about the middle of her face. The counter's far edge is
// `edge` below it; what is drawn by `Behind` is cut off there by the counter,
// and `Front` draws what reaches over it: her forearms, her paws, her mug.

const FUR = { fur: '#8a929a', back: '#747c85', chest: '#a3aab0', mask: '#2b3037', pale: '#e8eaeb', ring: '#3a4048', eye: '#f3ecd2', apron: '#cdbf9c', apronDark: '#b5a67f', pink: '#d98c8c' }

const ellipse = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, turn = 0) => {
  c.beginPath()
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), turn, 0, Math.PI * 2)
  c.fillStyle = fill
  c.fill()
}

/** A ring of fur standing on end round an oval: one path, one fill. */
function bristle(c: Ctx, x: number, y: number, rx: number, ry: number, spikes: number, long: number, from: number, to: number, fill: string): void {
  c.beginPath()
  for (let i = 0; i <= spikes * 2; i++) {
    const a = from + ((to - from) * i) / (spikes * 2), out = i % 2 ? long : 0
    c.lineTo(x + Math.cos(a) * (rx + out), y + Math.sin(a) * (ry + out))
  }
  c.closePath()
  c.fillStyle = fill
  c.fill()
}

/** Her head tilts toward what she looks at, and lifts a little when her eyes are wide. */
const headOf = (r: Raccoon) => ({ x: r.gaze.x * 5, y: r.gaze.y * 3 - r.eye * 5 + r.breath * 1.2 + (r.doing === 'yawn' ? -r.swing * 6 : 0) + r.mug * -5, tilt: r.gaze.x * 0.07 + (r.doing === 'side-eye' ? r.swing * 0.08 : 0) + (r.doing === 'huff' ? -r.swing * 0.1 : 0) })

/** Everything of her that the counter cuts off: tail, shoulders, apron, head. */
export function paintOldHandBehind(c: Ctx, x: number, y: number, r: Raccoon): void {
  const fur = Math.max(0, Math.min(1.3, r.fur.x))
  c.save()
  c.translate(x, y)
  // The tail, up behind her left shoulder: rings of dark on grey, and it swishes.
  const swish = (r.doing === 'tail-swish' ? Math.sin(r.progress * Math.PI * 4) * 16 * r.swing : 0) + r.breath * 2
  for (let i = 0; i <= 12; i++) {
    const t = i / 12
    disc(c, -70 - 16 * Math.sin(t * 2.4) + swish * t * t, 98 - 112 * t, (19 - 7 * t) * (1 + fur * 0.5), i % 4 < 2 ? FUR.fur : FUR.ring)
  }
  // Shoulders and chest, which rise with each slow breath; the apron over them.
  if (fur > 0.04) bristle(c, 0, 104, 86, 66, 13, 15 * fur, Math.PI, Math.PI * 2, FUR.back)
  ellipse(c, 0, 104 - r.breath * 1.5, 88, 66 + r.breath * 1.5, FUR.back)
  ellipse(c, 0, 100, 46, 40, FUR.chest)
  roundRect(c, -36, 66, 72, 70, 10)
  c.fillStyle = FUR.apron
  c.fill()
  c.strokeStyle = FUR.apronDark
  c.lineWidth = 4
  c.beginPath()
  c.moveTo(-30, 68)
  c.lineTo(-44, 46)
  c.moveTo(30, 68)
  c.lineTo(44, 46)
  c.stroke()
  // The pocket, with a pencil and a screwdriver in it.
  c.fillStyle = INK.pencil
  c.fillRect(-13, 72, 5, 16)
  c.fillStyle = '#d9685c'
  c.fillRect(-4, 70, 6, 18)
  roundRect(c, -20, 84, 40, 30, 5)
  c.fillStyle = FUR.apronDark
  c.fill()

  const head = headOf(r)
  c.translate(head.x, head.y)
  c.rotate(head.tilt)
  // The head: ears, the ruff of her cheeks, the mask.
  if (fur > 0.04) bristle(c, 0, 0, 58, 46, 20, 17 * fur, 0, Math.PI * 2, FUR.fur)
  for (const side of [-1, 1]) {
    const flick = (r.doing === (side < 0 ? 'ear-flick-left' : 'ear-flick-right') ? Math.sin(r.progress * Math.PI * 3) * 0.5 : 0) + (side > 0 && r.ear > 0 ? Math.sin((r.ear / 0.7) * Math.PI) * 0.6 : 0)
    const back = (r.doing === 'huff' || r.doing === 'guard' ? r.swing * 0.35 : 0) + r.eye * -0.2
    c.save()
    c.translate(side * 38, -30)
    c.rotate(side * (0.25 + back + flick))
    c.fillStyle = FUR.mask
    c.beginPath()
    c.moveTo(-15, 4)
    c.quadraticCurveTo(-4, -34, 4, -30)
    c.quadraticCurveTo(14, -24, 15, 4)
    c.closePath()
    c.fill()
    c.fillStyle = FUR.pale
    c.beginPath()
    c.moveTo(-7, 2)
    c.quadraticCurveTo(-1, -19, 3, -18)
    c.quadraticCurveTo(8, -14, 8, 2)
    c.closePath()
    c.fill()
    c.restore()
  }
  c.fillStyle = FUR.pale
  for (const side of [-1, 1]) {
    c.beginPath()
    c.moveTo(side * 44, -6)
    c.lineTo(side * (74 + fur * 10), 10)
    c.lineTo(side * 54, 14)
    c.lineTo(side * (72 + fur * 10), 28)
    c.lineTo(side * 40, 32)
    c.closePath()
    c.fill()
  }
  ellipse(c, 0, 0, 60, 48, FUR.fur)
  ellipse(c, 0, -16, 46, 15, FUR.pale)
  for (const side of [-1, 1]) ellipse(c, side * 25, 0, 28, 17, FUR.mask, side * 0.32)
  ellipse(c, 0, 24, 26, 19, FUR.pale)

  // The eyes. Heavy-lidded by habit; round at a fright; shut for a sip, a yawn or a blink; and behind her goggles, enormous.
  const shut = Math.max(r.blink, r.doing === 'yawn' ? r.swing * 1.4 : 0, r.mug > 0.6 ? 1 : 0, r.doing === 'whisker-preen' ? r.swing * 0.8 : 0)
  const narrow = r.doing === 'guard' || r.doing === 'huff' ? 0.3 * r.swing : 0
  const lids = Math.min(1, Math.max(0, 0.36 + narrow - r.eye * 0.5) + shut)
  const big = 1 + r.goggles * 0.5
  for (const side of [-1, 1]) {
    const ex = side * 24, ey = -1, er = (9 + r.eye * 2.4) * big
    disc(c, ex, ey, er, FUR.eye)
    disc(c, ex + r.gaze.x * er * 0.36, ey + r.gaze.y * er * 0.3, er * (0.52 - r.eye * 0.16), INK.black)
    disc(c, ex + r.gaze.x * er * 0.36 - er * 0.16, ey + r.gaze.y * er * 0.3 - er * 0.18, er * 0.15, INK.white)
    if (lids > 0.03) {
      c.save()
      c.beginPath()
      c.arc(ex, ey, er + 0.7, 0, Math.PI * 2)
      c.clip()
      c.fillStyle = FUR.mask
      c.fillRect(ex - er - 1, ey - er - 1, er * 2 + 2, (er * 2 + 2) * lids)
      c.restore()
      // The edge of the lid, so a half-shut eye reads as a look and not as a hole.
      c.strokeStyle = '#4a5059'
      c.lineWidth = 1.6
      c.beginPath()
      c.moveTo(ex - er * 0.9, ey - er + (er * 2) * lids)
      c.lineTo(ex + er * 0.9, ey - er + (er * 2) * lids)
      c.stroke()
    }
  }
  // The brows: two pale dashes on the mask. One goes up for a sideways look; both come down over a glare.
  const glare = r.doing === 'guard' || r.doing === 'huff' ? r.swing : 0
  c.strokeStyle = FUR.pale
  c.lineWidth = 3.4
  c.lineCap = 'round'
  for (const side of [-1, 1]) {
    const up = r.eye * 7 + (r.doing === 'side-eye' && side > 0 ? r.swing * 6 : 0) + r.goggles * 2
    const slant = glare * 0.5 - r.eye * 0.15
    c.beginPath()
    c.moveTo(side * 14, -17 - up + slant * 9)
    c.lineTo(side * 34, -17 - up - slant * 5)
    c.stroke()
  }

  // The nose and the mouth: a line that says nothing, a yawn with two small teeth, a pout for a huff.
  ellipse(c, 0, 15, 8, 6, INK.black)
  disc(c, -2.5, 13, 1.8, 'rgba(255, 255, 255, 0.5)')
  const yawn = r.doing === 'yawn' ? r.swing : r.eye * 0.5, chew = r.doing === 'dunk' && r.progress > 0.7 ? Math.abs(Math.sin(r.progress * Math.PI * 22)) : 0
  if (yawn > 0.12) {
    ellipse(c, 0, 31 + yawn * 3, 6 + yawn * 6, 2 + yawn * 9, '#3a2428')
    ellipse(c, 0, 35 + yawn * 7, 3 + yawn * 4, 1 + yawn * 3.4, FUR.pink)
    c.fillStyle = INK.white
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(side * (4 + yawn * 3), 25); c.lineTo(side * (2 + yawn * 2), 31); c.lineTo(side * (7 + yawn * 4), 26); c.closePath(); c.fill() }
  } else {
    c.strokeStyle = INK.black
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(0, 21)
    c.lineTo(0, 27 + chew * 2)
    c.moveTo(-9, 28 + glare * 3 + chew * 2)
    c.quadraticCurveTo(-4, 33 - glare * 4 + chew * 3, 0, 27 + chew * 2)
    c.quadraticCurveTo(4, 33 - glare * 4 + chew * 3, 9, 28 + glare * 3 + chew * 2)
    c.stroke()
  }
  // Whiskers: at rest they lie back along the cheek; at a short they stand straight out, longer and wider.
  const out = Math.max(-0.25, Math.min(1.5, r.whiskers.x))
  c.strokeStyle = FUR.pale
  c.lineWidth = 1.7 + out * 0.5
  for (const side of [-1, 1]) for (let w = -1; w <= 1; w++) {
    c.beginPath()
    // A fan that sucks draws them all over toward the bench, which lies to her right and below.
    c.moveTo(side * 19, 24 + w * 3)
    c.lineTo(side * (60 + out * 26) + r.drawn * (side > 0 ? 8 : 26), 22 + w * (10 + out * 12) - out * 6 + r.drawn * 12)
    c.stroke()
  }

  // Her goggles: pushed up on her forehead, or down over her eyes.
  const g = r.goggles, gy = -36 + g * 35, gr = 12.5 + g * 4
  c.strokeStyle = '#4a4f55'
  c.lineWidth = 5
  c.beginPath()
  c.moveTo(-56, gy + 6 - g * 4)
  c.quadraticCurveTo(0, gy - 6 + g * 4, 56, gy + 6 - g * 4)
  c.stroke()
  for (const side of [-1, 1]) {
    disc(c, side * (20 + g * 4), gy, gr + 3, '#868f97')
    disc(c, side * (20 + g * 4), gy, gr, g > 0.5 ? 'rgba(196, 226, 238, 0.42)' : '#bcd9e4')
    c.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    c.lineWidth = 2.2
    c.beginPath()
    c.arc(side * (20 + g * 4), gy, gr - 4, 3.6, 4.6)
    c.stroke()
  }
  c.restore()
}

/** A paw: dark, with four short fingers. */
function paw(c: Ctx, x: number, y: number, turn: number): void {
  c.save()
  c.translate(x, y)
  c.rotate(turn)
  ellipse(c, 0, 0, 14, 12, FUR.mask)
  for (let f = -1.5; f <= 1.5; f++) ellipse(c, f * 6.4, 11, 3.6, 7, FUR.mask)
  c.restore()
}

/** A forearm from the counter's edge to a paw: one thick stroke of fur. */
function forearm(c: Ctx, fromX: number, fromY: number, toX: number, toY: number): void {
  c.strokeStyle = FUR.fur
  c.lineCap = 'round'
  c.lineWidth = 25
  c.beginPath()
  c.moveTo(fromX, fromY)
  c.lineTo(toX, toY)
  c.stroke()
}

/** Her mug, seen from above where it stands on the bench: white enamel, a blue rim, tea, and a handle. The tea swings when it is knocked. */
function mugOnBench(c: Ctx, x: number, y: number, slosh: number): void {
  disc(c, x + 3, y + 6, 29, 'rgba(28, 36, 44, 0.22)')
  c.strokeStyle = INK.white
  c.lineWidth = 8
  c.beginPath()
  c.arc(x + 30, y + 4, 13, -1.2, 1.3)
  c.stroke()
  disc(c, x, y, 28, INK.white)
  disc(c, x, y, 22, '#a8672f')
  ellipse(c, x - 6 + slosh * 5, y - 7, 5 + Math.abs(slosh) * 3, 5, 'rgba(255, 255, 255, 0.35)')
  c.strokeStyle = '#2f5fa8'
  c.lineWidth = 3.4
  c.beginPath()
  c.arc(x, y, 26.5, 0, Math.PI * 2)
  c.stroke()
}

/** The same mug from the side, at her mouth. */
function mugInPaw(c: Ctx, x: number, y: number, tip: number): void {
  c.save()
  c.translate(x, y)
  c.rotate(tip)
  c.strokeStyle = INK.white
  c.lineWidth = 7
  c.beginPath()
  c.arc(-24, 2, 11, Math.PI * 0.5, Math.PI * 1.5)
  c.stroke()
  roundRect(c, -22, -20, 44, 42, 8)
  c.fillStyle = INK.white
  c.fill()
  c.fillStyle = '#2f5fa8'
  c.fillRect(-22, -20, 44, 5)
  c.restore()
}

/**
 * What reaches over the counter: the paw on her mug and the free one, each on
 * its forearm, and the mug itself, on the bench or at her mouth. `mug` is
 * where the mug stands, about the middle of her face; `edge` how far below it
 * the counter's far edge is. `carried` draws the part of the child's that she has picked up, where her paw has it.
 */
export function paintOldHandFront(c: Ctx, x: number, y: number, r: Raccoon, mug: { x: number; y: number }, edge: number, carried?: (x: number, y: number) => void): void {
  c.save()
  c.translate(x, y)
  const head = headOf(r), lifted = r.mug
  // The paw that keeps the mug: on its rim while it stands, round it when it is at her mouth.
  const hold = { x: mug.x + (head.x - 2 - mug.x) * lifted, y: mug.y - 27 + (head.y + 40 - (mug.y - 27)) * lifted }
  if (lifted < 0.5) mugOnBench(c, mug.x, mug.y - lifted * 30, r.slosh.x)
  forearm(c, -62, edge - 6, hold.x - 4, hold.y - 4)
  if (lifted >= 0.5) mugInPaw(c, hold.x + 4, hold.y + 4, -0.5 * lifted)
  paw(c, hold.x, hold.y, lifted * 1.2)
  if (lifted > 0.6) {
    // The steam goes up past her nose.
    c.strokeStyle = `rgba(255, 255, 255, ${0.5 * r.swing})`
    c.lineWidth = 2.4
    c.beginPath()
    c.moveTo(hold.x + 10, hold.y - 22)
    c.quadraticCurveTo(hold.x + 18, hold.y - 34, hold.x + 8, hold.y - 46)
    c.stroke()
  }
  // The free paw, wherever it has got to, and what is in it.
  const px = r.paw.x.x, py = r.paw.y.x, away = Math.hypot(px - PAW.rest.x, py - PAW.rest.y)
  forearm(c, 64, Math.min(edge - 6, py + 30), px + 3, py - 6)
  if (r.holds === 'part' && carried) carried(px + 2, py + 20)
  if (r.holds === 'biscuit') {
    disc(c, px + 2, py + 16, 11, '#d9a35e')
    for (const [dx, dy] of [[-2, 12], [5, 18], [0, 21]]) disc(c, px + dx, py + dy, 1.5, '#b97f3f')
  }
  paw(c, px, py, away > 8 ? Math.atan2(py - PAW.rest.y, px - PAW.rest.x) - Math.PI / 2 : 0)
  c.restore()
}
