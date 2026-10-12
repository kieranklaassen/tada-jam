import type { Spot } from './layout'
import { INK, flat, grained, line, oval, printOnce, stamp, trace, wiped, type G, type Stamp } from './print'
import type { FrogRig } from './rig'

// The frog: fat, slow and heavy. Everything of him that stands still is
// printed once: his stone, his body with its legs and the two bulges his
// eyes sit in, and his throat sac. Each frame he is two stamps and what he
// acts with, each one path: his pupils, his lids, his mouth, and when they
// are out his cheek and his tongue.

export type FrogStamps = { stone: Stamp; body: Stamp; throat: Stamp }

/** Where his eyes sit, from his seat. */
const EYE = { x: 42, y: -150, r: 17 } as const

export function printFrog(density: number): FrogStamps {
  const stone = printOnce(250, 84, 125, 30, density, (g) => {
    oval(g, 0, 14, 116, 30)
    wiped(g, '#c4c6ba', INK.stoneDeep, -16, 44)
    line(g, 2.2)
    trace(g, [-70, 6, -30, 0, 20, 4])
    line(g, 1.4, 'rgba(34,52,92,0.5)')
    grained(g, -125, -30, 250, 84, 0.22)
  })
  const body = printOnce(260, 200, 130, 190, density, (g) => {
    // Hind legs, folded, one each side.
    for (const side of [-1, 1]) {
      trace(g, [side * 62, -10, side * 112, -30, side * 118, -4, side * 96, 6, side * 60, 8], true)
      wiped(g, INK.frog, INK.frogDeep, -30, 8)
      line(g, 2.2)
      trace(g, [side * 96, 4, side * 122, 2, side * 126, 8])
      line(g, 2.2)
    }
    // The bulges his eyes sit in, behind the body's line.
    for (const side of [-1, 1]) {
      oval(g, side * EYE.x, EYE.y, 25, 25)
      flat(g, '#9cc063')
      line(g, 2.2)
    }
    // The body: a pear that is widest where he sits.
    trace(g, [0, -150, 56, -138, 84, -92, 98, -40, 82, 2, 0, 8, -82, 2, -98, -40, -84, -92, -56, -138], true)
    wiped(g, '#9cc063', INK.frogDeep, -150, 14)
    line(g, 2.4)
    for (const side of [-1, 1]) {
      oval(g, side * EYE.x, EYE.y, EYE.r, EYE.r)
      flat(g, INK.white)
      line(g, 1.6)
    }
    // The pale belly.
    trace(g, [0, -70, 46, -56, 58, -20, 40, 2, 0, 6, -40, 2, -58, -20, -46, -56], true)
    wiped(g, '#f2e7b6', '#d9cf92', -70, 6)
    line(g, 1.6)
    // Spots on his shoulders, no two alike.
    for (const [x, y, r] of [[-66, -86, 8], [-76, -56, 5], [70, -76, 7], [60, -106, 4]] as const) {
      oval(g, x, y, r, r * 0.8)
      flat(g, INK.frogDeep)
    }
    // Front legs and their toes.
    for (const side of [-1, 1]) {
      trace(g, [side * 40, -46, side * 52, -14, side * 44, 4])
      line(g, 11, INK.line)
      line(g, 7, INK.frog)
      g.beginPath()
      for (const toe of [-12, 0, 12]) {
        g.moveTo(side * 44, 4)
        g.lineTo(side * 44 + toe, 12)
      }
      line(g, 3)
    }
    grained(g, -130, -190, 260, 200, 0.18)
  })
  const throat = printOnce(140, 100, 70, 50, density, (g) => {
    oval(g, 0, 0, 64, 42)
    wiped(g, '#f6eec6', '#e3d58f', -42, 42)
    line(g, 2)
  })
  return { stone, body, throat }
}

/**
 * Draws the frog with his seat at `at`. Swimming, he is cut off at the water he is in. His tongue reaches for
 * a spot of the stage, whatever shape he is in. Every field of his rig is read here.
 */
export function drawFrog(g: G, stamps: FrogStamps, r: FrogRig, at: Spot): void {
  const x = at.x + r.dx, sunk = r.under * 104, y = at.y + r.dy + sunk
  const size = 1 + 0.5 * r.swell
  const wide = size * (1 + r.squash * 0.5), tall = size * (1 - r.squash * 0.5)
  g.save()
  if (r.under > 0.02) {
    g.beginPath()
    g.rect(x - 320, at.y - 420, 640, 424)
    g.clip()
  }
  stamp(g, stamps.body, x, y - 4, r.tilt, wide, tall)
  g.translate(x, y - 4)
  g.rotate(r.tilt)
  g.scale(wide, tall)
  // The throat sac: cream, and as big as the croak.
  const sac = 0.22 + r.throat
  stamp(g, stamps.throat, 0, -84 + 22 * sac, 0, sac * 0.8, sac)
  // A cheek with a berry in it.
  if (r.cheek > 0.02) {
    oval(g, 70, -96, 26 * r.cheek, 22 * r.cheek)
    flat(g, '#9cc063')
  }
  // The mouth: a wide line that sags, or a red hole.
  if (r.mouth > 0.06) {
    oval(g, 0, -106, 56, 5 + r.mouth * 26)
    flat(g, INK.redDeep)
  } else {
    trace(g, [-62, -112, -30, -103, 0, -101, 30, -103, 62, -112])
    line(g, 2.6)
  }
  // Pupils: each follows what he watches, and both turn in to his nose when he is cross-eyed.
  g.beginPath()
  for (const side of [-1, 1]) {
    const px = side * EYE.x + r.lookX * 8 * (1 - r.cross) - side * 9 * r.cross, py = EYE.y + r.lookY * 7 * (1 - r.cross) - 3 * r.cross
    g.moveTo(px + 7.5, py)
    g.ellipse(px, py, 7.5, 7.5, 0, 0, Math.PI * 2)
  }
  flat(g, INK.line)
  // Lids: each eye by itself, coming down from the top.
  if (r.lidL < 0.95 || r.lidR < 0.95) {
    g.beginPath()
    for (const [side, lid] of [[-1, r.lidL], [1, r.lidR]] as const) {
      if (lid >= 0.95) continue
      const shut = 1 - Math.max(0, lid)
      g.moveTo(side * EYE.x + EYE.r + 1, EYE.y - EYE.r + EYE.r * shut)
      g.ellipse(side * EYE.x, EYE.y - EYE.r + EYE.r * shut, EYE.r + 1, EYE.r * shut + 1, 0, 0, Math.PI * 2)
    }
    flat(g, '#86ad52')
  }
  g.restore()
  // The tongue goes where the thing is.
  if (r.tongue > 0.02) {
    const fx = x, fy = y - 108 * tall
    const tx = fx + (r.tongueX - fx) * r.tongue, ty = fy + (r.tongueY - fy) * r.tongue
    g.beginPath()
    g.moveTo(fx, fy)
    g.quadraticCurveTo((fx + tx) / 2, Math.min(fy, ty) - 24, tx, ty)
    line(g, 8, '#e98c8c')
  }
  // The water he swims in closes round him.
  if (r.under > 0.02) {
    g.beginPath()
    g.ellipse(x, at.y + 2, 96 * wide, 12, 0, Math.PI * 1.08, Math.PI * 1.92)
    line(g, 2.4, INK.white)
  }
}
