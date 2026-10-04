import { ANSWERS, passerAt, passing, pigeonAt, sag, WASHING, type Lane } from './lane'
import { type Mouse } from './mouse'
import { disc, INK, roundRect, type Ctx } from './paint'
import { IRON_TIP, WASH } from './paintStall'
import { PILLAR_LEFT, STAGE, WINDOW_LEFT } from './stage'

export { passing, PASSERS, type Passer } from './lane'

// What goes on at the edges of the stall and has nothing to do with any
// mend: whoever passes down the lane, a pigeon on the doorstep across the
// way, the clockwork mouse on the bare mat, the wisp of smoke from the
// soldering iron. All of it is drawn each frame from the clock alone, or from
// a few numbers, and all of it is lower in contrast than the working pieces.

const ellipse = (c: Ctx, x: number, y: number, rx: number, ry: number, fill: string, turn = 0) => {
  c.beginPath()
  c.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), turn, 0, Math.PI * 2)
  c.fillStyle = fill
  c.fill()
}

// --- The lane ----------------------------------------------------------------------

const GIRAFFE = { hide: '#e9cf94', patch: '#c79a5c', horn: '#8a6a44', muzzle: '#f1e2bd' }

/** Whoever is going down the lane behind the customers, and how each answers a finger. Returns how many it drew. */
export function paintPasser(c: Ctx, lane: Lane): number {
  const seconds = lane.seconds, now = passing(seconds)
  if (!now) return 0
  const x = passerAt(now.who, now.along, seconds).x, floor = STAGE.counterTop
  // Touched, it answers for a moment: `jolt` is 1 at the touch and gone a little over a second later.
  const poked = lane.poked?.who === now.who ? lane.poked.age : -1, jolt = poked < 0 ? 0 : Math.max(0, 1 - poked / ANSWERS)
  c.save()
  c.beginPath()
  // The lane shows between the corner post and the pillar: whoever passes comes out from behind the one and goes behind the other.
  c.rect(WINDOW_LEFT + 2, 0, PILLAR_LEFT - 2 - (WINDOW_LEFT + 2), floor)
  c.clip()
  if (now.who === 'giraffe') {
    // Only its neck and its head come as high as this. It chews as it goes, and has a look in as it passes the stall.
    // Touched, it stops chewing, opens its eye all the way, and puts its tongue out at whoever it was. Then it goes on.
    const step = Math.sin(seconds * 3.4), y = 66 + step * 3 - Math.sin(jolt * Math.PI) * 5
    c.strokeStyle = GIRAFFE.hide
    c.lineCap = 'round'
    c.lineWidth = 30
    c.beginPath()
    c.moveTo(x + 34, floor + 20)
    c.quadraticCurveTo(x + 30, 130, x + 6, y + 14)
    c.stroke()
    for (const [py, px, r] of [[176, 34, 9], [148, 26, 8], [122, 24, 7], [98, 14, 6]] as const) ellipse(c, x + px, py + step * 2, r, r * 1.2, GIRAFFE.patch)
    c.strokeStyle = GIRAFFE.horn
    c.lineWidth = 4
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(x + 6 + side * 7, y - 10); c.lineTo(x + 8 + side * 9, y - 26); c.stroke(); disc(c, x + 8 + side * 9, y - 27, 4, GIRAFFE.horn) }
    ellipse(c, x + 26, y - 6, 12, 6, GIRAFFE.hide, 0.5)
    ellipse(c, x, y + 4, 19, 16, GIRAFFE.hide)
    const chew = jolt > 0 ? 0 : Math.sin(seconds * 7) * 1.6
    ellipse(c, x - 20, y + 14 + chew * 0.5, 16, 11, GIRAFFE.muzzle, 0.2)
    disc(c, x - 28, y + 10, 1.8, GIRAFFE.horn)
    c.strokeStyle = GIRAFFE.horn
    c.lineWidth = 2
    c.beginPath()
    c.moveTo(x - 32, y + 18 + chew)
    c.quadraticCurveTo(x - 22, y + 22 + chew, x - 12, y + 18 + chew)
    c.stroke()
    if (jolt > 0) {
      const out = Math.sin(Math.min(1, (1 - jolt) * 2.2) * Math.PI)
      ellipse(c, x - 30, y + 22 + out * 9, 4.5, 3 + out * 9, '#d98a94', 0.25)
    }
    // The eye: half shut, and it slides round to the stall as it goes by.
    const look = Math.max(-1, Math.min(1, (700 - x) / 260))
    disc(c, x - 2, y - 1, 5.4, INK.white)
    disc(c, x - 2 + look * 2.2, y + 0.6, 3, INK.black)
    if (jolt <= 0) {
      c.fillStyle = GIRAFFE.hide
      c.fillRect(x - 8, y - 7.4, 12, 4.6)
    }
    c.restore()
    return 13
  }
  if (now.who === 'crates') {
    // A porter nobody sees under a tower of crates, and on the top one a cat, asleep, who has done this before.
    // Touched, the tower lurches, and the cat opens both eyes and puts its tail up until it is steady again.
    const sway = Math.sin(seconds * 2.6) * 0.045 + Math.sin(poked * 13) * 0.09 * jolt
    c.translate(x, floor + 10)
    c.rotate(sway)
    const colours = ['#cdb48a', '#c3a87c', '#d6c098']
    for (let i = 0; i < 3; i++) {
      c.rotate(sway * 0.8)
      roundRect(c, -30 + (i % 2) * 5, -58 - i * 46, 58, 44, 3)
      c.fillStyle = colours[i]
      c.fill()
      c.fillStyle = 'rgba(120, 96, 64, 0.35)'
      // One broad band round each, and a knot hole.
      c.fillRect(-30 + (i % 2) * 5, -40 - i * 46, 58, 9)
      disc(c, -12 + (i % 2) * 22, -22 - i * 46, 2.6, 'rgba(120, 96, 64, 0.45)')
    }
    // The cat.
    const top = -58 - 2 * 46
    ellipse(c, 2, top - 9, 22, 11, '#8d8f93')
    disc(c, -15, top - 13, 9, '#8d8f93')
    c.fillStyle = '#8d8f93'
    for (const side of [-1, 1]) { c.beginPath(); c.moveTo(-15 + side * 7, top - 18); c.lineTo(-15 + side * 9, top - 27); c.lineTo(-15 + side * 2, top - 21); c.closePath(); c.fill() }
    c.strokeStyle = '#8d8f93'
    c.lineWidth = 5
    c.lineCap = 'round'
    c.beginPath()
    c.moveTo(22, top - 6)
    if (jolt > 0) c.quadraticCurveTo(40, top - 14, 34, top - 30 - jolt * 8)
    else c.quadraticCurveTo(34, top + 4, 30, top + 18 + Math.sin(seconds * 1.3) * 4)
    c.stroke()
    if (jolt > 0) {
      for (const ex of [-18, -12]) { disc(c, ex, top - 13, 2.8, '#e8e2a8'); disc(c, ex, top - 13, 1.3, INK.black) }
    } else {
      c.strokeStyle = '#5d5f63'
      c.lineWidth = 1.6
      c.beginPath()
      c.arc(-18, top - 13, 2.4, 0.2, Math.PI - 0.2)
      c.moveTo(-9.6, top - 13)
      c.arc(-12, top - 13, 2.4, 0.2, Math.PI - 0.2)
      c.stroke()
    }
    c.restore()
    return 16
  }
  // A balloon that has got away from somebody, on the wind, with its string after it.
  // Touched, it is batted up and comes down again, squashed for a moment where the finger was.
  const bat = Math.sin(Math.min(1, (1 - jolt) * 1.4) * Math.PI) * (jolt > 0 ? 1 : 0)
  const y = passerAt('balloon', now.along, seconds).y - bat * 30, lean = Math.sin(seconds * 1.7) * 0.12 + Math.sin(poked * 11) * 0.3 * jolt
  c.strokeStyle = 'rgba(120, 110, 96, 0.7)'
  c.lineWidth = 1.4
  c.beginPath()
  c.moveTo(x, y + 26)
  c.bezierCurveTo(x + 14, y + 50, x - 6, y + 70, x + 16, y + 96)
  c.stroke()
  c.translate(x, y)
  c.rotate(lean)
  ellipse(c, 0, 0, 21 + jolt * jolt * 5, 26 - jolt * jolt * 6, '#d9685c')
  ellipse(c, -7, -9, 5, 8, 'rgba(255, 255, 255, 0.35)', -0.5)
  c.fillStyle = '#c4574b'
  c.beginPath()
  c.moveTo(-4, 25)
  c.lineTo(4, 25)
  c.lineTo(0, 31)
  c.closePath()
  c.fill()
  c.restore()
  return 4
}

/**
 * A pigeon on the doorstep across the way: it struts, it pecks, and at a bang
 * or a finger it is gone, and comes back when it thinks nobody saw. Returns
 * how many it drew.
 */
export function paintPigeon(c: Ctx, lane: Lane): number {
  const seconds = lane.seconds, scare = lane.scare
  const { x, y, away, fleeing } = pigeonAt(seconds, scare)
  if (away >= 1) return 0
  const facing = Math.cos(seconds * 0.5) >= 0 ? 1 : -1
  // It pecks twice, every so often.
  const cycle = seconds % 3.1, peck = cycle < 0.5 ? Math.abs(Math.sin(cycle * Math.PI * 4)) : 0
  const bob = Math.sin(seconds * 4) * 1.5
  c.save()
  c.translate(x, y)
  c.scale(facing, 1)
  ellipse(c, 0, -11, 15, 10, '#aab0b8', -0.15)
  ellipse(c, -6, -12, 11, 6, '#959ca6', -0.3)
  if (fleeing) { ellipse(c, -2, -22, 16, 7, '#c2c7cd', -0.8 + Math.sin(scare * 60) * 0.6) }
  c.save()
  c.translate(11 + bob, -17)
  c.rotate(peck * 1.1)
  ellipse(c, 2, -5, 5, 8, '#8f97a1', 0.3)
  disc(c, 4, -11, 6, '#aab0b8')
  ellipse(c, 2, -5, 5, 3, '#8fb0a8')
  disc(c, 6, -12, 1.5, INK.black)
  c.fillStyle = '#d9a35e'
  c.beginPath()
  c.moveTo(9, -12)
  c.lineTo(15, -10)
  c.lineTo(9, -8.5)
  c.closePath()
  c.fill()
  c.restore()
  c.strokeStyle = '#c98a7c'
  c.lineWidth = 1.6
  c.beginPath()
  c.moveTo(-2, -2)
  c.lineTo(-2, 4)
  c.moveTo(3, -2)
  c.lineTo(3 + Math.sin(seconds * 4) * 1.5, 4)
  c.stroke()
  c.restore()
  return fleeing ? 9 : 8
}

/**
 * The washing on its line across the lane: somebody's enormous drawers, and
 * two mittens that do not match. Each hangs by its pegs and swings about them
 * when a finger lands on it; its neighbours feel the line shake. Returns how
 * many it drew.
 */
export function paintWashing(c: Ctx, lane: Lane): number {
  // A peg grips the line from below: it hangs down from it and does not cross it.
  const peg = (x: number) => { c.fillStyle = WASH.peg; c.fillRect(x - 1.5, -0.5, 3, 8) }
  let mittens = 0
  WASHING.forEach((item, i) => {
    c.save()
    c.translate(item.x, sag(item.x))
    c.rotate(lane.swing[i].x)
    if (item.what === 'mitten') {
      // A mitten, hung by its cuff: a round hand and a thumb. The two are of different wools, and their thumbs point apart.
      const thumb = mittens ? 1 : -1
      c.fillStyle = WASH.cloth[mittens ? 1 : 0]
      mittens++
      roundRect(c, -9, 4, 18, 26, 9)
      c.fill()
      c.beginPath()
      c.ellipse(thumb * 10, 15, 4.5, 8, thumb * 0.5, 0, Math.PI * 2)
      c.fill()
      c.fillStyle = WASH.cuff
      roundRect(c, -8, 0, 16, 8, 3)
      c.fill()
      peg(0)
    } else {
      // The drawers: wide, spotted, a leg each side.
      c.fillStyle = WASH.cloth[2]
      c.beginPath()
      c.moveTo(-30, 0)
      c.lineTo(30, 0)
      c.lineTo(34, 40)
      c.lineTo(6, 40)
      c.lineTo(0, 22)
      c.lineTo(-6, 40)
      c.lineTo(-34, 40)
      c.closePath()
      c.fill()
      c.fillStyle = WASH.spot
      c.beginPath()
      for (const [sx, sy] of [[-18, 10], [-4, 8], [12, 12], [22, 26], [-22, 28], [-12, 20], [16, 30]]) { c.moveTo(sx + 2.4, sy); c.arc(sx, sy, 2.4, 0, Math.PI * 2) }
      c.fill()
      c.fillStyle = WASH.cloth[0]
      c.fillRect(-30, 0, 60, 4)
      peg(-24)
      peg(24)
    }
    c.restore()
  })
  return WASHING.length
}

// --- The bench ---------------------------------------------------------------------

/** How large the mouse is drawn: as long as a cell and a half. */
const SIZE = 1.5
const TIN = { body: '#8fa7ba', dark: '#6f889c', ear: '#e3a7a0', key: '#c9a66a' }

/** The clockwork mouse, seen from above: a tin body, two ears, a wire tail, and the key in its back going round. Returns how many it drew. */
export function paintMouse(c: Ctx, mouse: Mouse): number {
  const hop = Math.max(0, mouse.hop), home = mouse.where === 'home'
  c.save()
  // In its box only its tail and its key show.
  if (home) {
    c.beginPath()
    c.rect(mouse.at.x - 2, mouse.at.y - 40, 90, 80)
    c.clip()
  }
  c.translate(mouse.at.x - (home ? 30 : 0), mouse.at.y)
  ellipse(c, 3 + hop * 8, 7 + hop * 12, 23 * SIZE, 13 * SIZE, 'rgba(28, 36, 44, 0.22)', mouse.heading)
  c.rotate(mouse.heading)
  c.scale(SIZE * (1 + hop * 0.22), SIZE * (1 + hop * 0.22))
  // The tail: a curl of wire behind it.
  c.strokeStyle = '#7d8790'
  c.lineWidth = 2.4
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(-20, 0)
  c.bezierCurveTo(-34, -10, -40, 10, -50, 2 + Math.sin(mouse.key * 0.7) * 4)
  c.stroke()
  // Wheels, the body, the ears, the nose.
  c.fillStyle = '#4a4f55'
  c.fillRect(-12, -15, 12, 4)
  c.fillRect(-12, 11, 12, 4)
  c.beginPath()
  c.moveTo(28, 0)
  c.quadraticCurveTo(10, -17, -14, -13)
  c.quadraticCurveTo(-26, 0, -14, 13)
  c.quadraticCurveTo(10, 17, 28, 0)
  c.closePath()
  c.fillStyle = TIN.body
  c.fill()
  // The seam of its two halves, from the key forward: the key stands behind it, not across it.
  c.strokeStyle = TIN.dark
  c.lineWidth = 1.6
  c.beginPath()
  c.moveTo(2, 0)
  c.lineTo(22, 0)
  c.stroke()
  for (const side of [-1, 1]) { disc(c, 8, side * 11, 6.5, TIN.dark); disc(c, 8, side * 11, 4.2, TIN.ear) }
  for (const side of [-1, 1]) disc(c, 17, side * 4.5, 1.8, INK.black)
  disc(c, 28, 0, 2.6, '#3a3f45')
  // The key: two loops on a stem, seen turning as a bar that goes wide and thin.
  const wide = Math.abs(Math.cos(mouse.key))
  c.fillStyle = TIN.dark
  c.fillRect(-9, -1.6, 5, 3.2)
  ellipse(c, -6, -5 - wide * 4, 3.4, 1.6 + wide * 4.4, TIN.key)
  ellipse(c, -6, 5 + wide * 4, 3.4, 1.6 + wide * 4.4, TIN.key)
  c.restore()
  return 13
}

/** A wisp of smoke from the tip of the soldering iron, which she has left on again. `puff` is 0 to 1: a touch on her corner sends up a thicker one. */
export function paintSmoke(c: Ctx, seconds: number, puff: number): number {
  c.lineCap = 'round'
  for (let i = 0; i < 2; i++) {
    const t = (seconds * 0.22 + i * 0.5) % 1
    c.strokeStyle = `rgba(255, 255, 255, ${(0.34 + puff * 0.4) * (1 - t)})`
    c.lineWidth = 2 + t * 5 + puff * 4
    c.beginPath()
    c.moveTo(IRON_TIP.x - 10 + Math.sin(t * 6 + i) * 3, IRON_TIP.y - 4 - t * 54)
    c.quadraticCurveTo(IRON_TIP.x - 10 + Math.sin(t * 6 + i + 1) * 9, IRON_TIP.y - 16 - t * 60, IRON_TIP.x - 8 + Math.sin(t * 6 + i + 2) * 5, IRON_TIP.y - 26 - t * 64)
    c.stroke()
  }
  return 2
}
