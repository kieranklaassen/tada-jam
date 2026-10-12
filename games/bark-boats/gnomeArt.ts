import { GNOME_BACK, GNOME_HAT_TIP, GNOME_MOUTH, GNOME_NOSE } from './acts'
import type { Spot } from './layout'
import { INK, flat, grained, line, oval, printOnce, shape, stamp, trace, wiped, type G, type Stamp } from './print'
import type { GnomeRig } from './rig'

// The gnome, who rides the boat and shows what he thinks of it. He faces
// downstream, to the left, and is drawn half as large again as a thumb would
// be beside the boat, so his face reads from across a table. His tunic (with
// and without the lamp on his back), his head with its beard and nose, and
// his hat are printed once; his legs, his arms, his hands, his eyes and his
// mouth are the pen's, one path each. Springy: his hat says it first.

export type GnomeStamps = { body: Stamp; bare: Stamp; head: Stamp; hat: Stamp }

/** From his hips: how far down his feet are when he stands, the middle of his head, and where his hat sits. */
export const GNOME_LEGS = 45
const HEAD = { x: -4.5, y: -93 } as const
const BRIM = { x: -4.5, y: -117 } as const
const EYES = [{ x: -13.5, y: -6 }, { x: 10.5, y: -6 }] as const

function tunic(g: G, lamp: boolean): void {
  if (lamp) {
    // The lamp on his back, shut: a small box with a hoop.
    oval(g, GNOME_BACK.x + 10, GNOME_BACK.y - 5, 7, 7)
    line(g, 1.8)
    shape(g, [GNOME_BACK.x - 4, GNOME_BACK.y, GNOME_BACK.x + 23, GNOME_BACK.y, GNOME_BACK.x + 26, GNOME_BACK.y + 36, GNOME_BACK.x - 7, GNOME_BACK.y + 36])
    wiped(g, INK.ochre, '#a9792c', GNOME_BACK.y, GNOME_BACK.y + 36)
    line(g, 1.8)
  }
  trace(g, [-6, -75, 27, -66, 39, -18, 30, 6, -30, 6, -39, -18, -30, -66], true)
  wiped(g, '#4f77b5', INK.indigo, -75, 6)
  line(g, 2.2)
  // A belt, off level, with its buckle to one side.
  trace(g, [-36, -14, -8, -8, 36, -16])
  line(g, 4, INK.barkDeep)
  oval(g, -12, -9, 5, 5)
  flat(g, INK.ochre)
}

export function printGnome(density: number): GnomeStamps {
  const body = printOnce(120, 110, 50, 94, density, (g) => { tunic(g, true); grained(g, -50, -94, 120, 110, 0.16) })
  const bare = printOnce(120, 110, 50, 94, density, (g) => { tunic(g, false); grained(g, -50, -94, 120, 110, 0.16) })
  const nose = { x: GNOME_NOSE.x - HEAD.x, y: GNOME_NOSE.y - HEAD.y }
  const head = printOnce(100, 130, 54, 42, density, (g) => {
    oval(g, 0, 0, 31, 30)
    flat(g, INK.skin)
    line(g, 2.2)
    // His beard, down to his belt.
    trace(g, [-28, 6, -34, 42, -16, 72, 4, 60, 20, 39, 26, 9, 8, 18, -8, 15], true)
    wiped(g, INK.white, '#ded6bd', 6, 72)
    line(g, 2)
    // His nose: the largest thing on his face.
    oval(g, nose.x, nose.y, 12, 10.5)
    flat(g, '#e9a78a')
    line(g, 1.8)
    grained(g, -54, -42, 100, 130, 0.14)
  })
  const tip = { x: GNOME_HAT_TIP.x - BRIM.x, y: GNOME_HAT_TIP.y - BRIM.y }
  const hat = printOnce(100, 128, 48, 116, density, (g) => {
    trace(g, [-39, 0, -20, -50, 0, -92, tip.x, tip.y, 16, -70, 33, 0, 0, 9], true)
    wiped(g, INK.red, INK.redDeep, tip.y, 9)
    line(g, 2.2)
    trace(g, [-42, 0, 0, 10, 36, 0])
    line(g, 5, INK.redDeep)
    grained(g, -48, -116, 100, 128, 0.16)
  })
  return { body, bare, head, hat }
}

/** Where his hand is when he points downstream, from his hips. */
const POINT = { x: -78, y: -62 } as const

/** One arm, shoulder to hand: folded tight at -1, at his side at 0, thrown up at 1. Returns the elbow and the hand, to be drawn. */
function arm(_g: G, side: number, a: number): Spot & { ex: number; ey: number; sx: number } {
  const up = Math.max(0, a), fold = Math.max(0, -a)
  const ex = side * (40 + 10 * up - 4 * fold), ey = -45 - 36 * up + 9 * fold
  const hx = (side * 36 - 6) * (1 - up) * (1 - fold) + side * 51 * up - side * 12 * fold, hy = -18 * (1 - up) * (1 - fold) - 111 * up - 39 * fold
  return { x: hx, y: hy, ex, ey, sx: side * 28 - 3 }
}

/**
 * Draws the gnome with his hips at `at`. `lamp` says whether the lamp is still on his back. Every field of
 * his rig is read here.
 */
export function drawGnome(g: G, stamps: GnomeStamps, r: GnomeRig, at: Spot, lamp: boolean): void {
  const wide = 1 + r.squash * 0.4, tall = 1 - r.squash * 0.4
  g.save()
  // Ducked under a blanket he is lower by a head.
  g.translate(at.x + r.dx, at.y + r.dy + r.hide * 26)
  g.rotate(r.lean)
  g.scale(wide, tall)
  // Legs: straight down when he stands; over the side and swinging when he sits.
  g.beginPath()
  for (const [hip, phase] of [[-13, 1], [13, -1]] as const) {
    const tap = phase > 0 ? 1 - r.sit : 0
    const kneeX = hip - 24 * r.sit, kneeY = 21 - 9 * r.sit
    const footX = hip - 33 * r.sit + Math.sin(r.leg * phase) * 21 * r.sit - Math.sin(r.leg) * 12 * tap
    const footY = GNOME_LEGS - 3 * r.sit - Math.abs(Math.sin(r.leg)) * 10 * tap
    g.moveTo(hip, 0)
    g.quadraticCurveTo(kneeX, kneeY, footX, footY)
    g.lineTo(footX - 9, footY + 1)
  }
  line(g, 14, INK.line)
  line(g, 9, '#6c5a3c')
  stamp(g, lamp ? stamps.body : stamps.bare, 0, 0)
  g.beginPath()
  const left = arm(g, -1, r.armL), right = arm(g, 1, r.armR)
  // Pointing: his downstream arm goes out straight and level from the shoulder, past his nose.
  if (r.point > 0.01) {
    left.x += (POINT.x - left.x) * r.point
    left.y += (POINT.y - left.y) * r.point
    left.ex += ((left.sx + POINT.x) / 2 - left.ex) * r.point
    left.ey += (-60 - left.ey) * r.point
  }
  for (const each of [left, right]) {
    g.moveTo(each.sx, -60)
    g.quadraticCurveTo(each.ex, each.ey, each.x, each.y)
  }
  line(g, 14, INK.line)
  line(g, 9.5, '#4f77b5')
  g.beginPath()
  for (const hand of [left, right]) {
    g.moveTo(hand.x + 8, hand.y)
    g.ellipse(hand.x, hand.y, 8, 8, 0, 0, Math.PI * 2)
  }
  flat(g, INK.skin)
  // His head: turned to look behind him it is seen from the other side.
  g.save()
  g.translate(HEAD.x, HEAD.y)
  g.scale(1 - 2 * r.turn, 1)
  stamp(g, stamps.head, 0, 0)
  if (r.beard > 0.02) {
    // Berry juice down his beard.
    g.globalAlpha = Math.min(1, r.beard)
    trace(g, [-22, 22, -24, 44, -10, 60, 6, 48, 10, 26], true)
    flat(g, '#d9604a')
    g.globalAlpha = 1
  }
  // Eyes that follow the finger, or shut; and a mouth half hidden in his beard.
  g.beginPath()
  for (const eye of EYES) {
    if (r.lids > 0.3) {
      const ex = eye.x + r.lookX * 3.6, ey = eye.y + r.lookY * 3.3
      g.moveTo(ex + 4.2, ey)
      g.ellipse(ex, ey, 4.2, 4.8 * r.lids, 0, 0, Math.PI * 2)
    } else {
      g.moveTo(eye.x - 6, eye.y - 1)
      g.quadraticCurveTo(eye.x, eye.y + 4, eye.x + 6, eye.y - 1)
      g.quadraticCurveTo(eye.x, eye.y + 1.5, eye.x - 6, eye.y - 1)
    }
  }
  flat(g, INK.line)
  const mx = GNOME_MOUTH.x - HEAD.x, my = GNOME_MOUTH.y - HEAD.y
  trace(g, [mx - 13, my - r.mouth * 3, mx, my + r.mouth * 8, mx + 13, my - r.mouth * 3])
  line(g, 2.6, r.mouth > 0.5 ? INK.redDeep : INK.line)
  g.restore()
  // His hat: lifted, tipped, drooping over his eyes, or streaming out flat downwind.
  const flutter = r.stream * 0.08 * Math.sin(r.stream * 40 + r.lean * 50)
  stamp(g, stamps.hat, BRIM.x + r.hatX, BRIM.y + r.hatY, -r.hatTilt * 0.5 - r.stream * 1.25 + flutter, 1, 1 + r.stream * 0.16)
  g.restore()
}
