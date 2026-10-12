import { INKS, css } from './colours'
import { CLOTHS, PAPER, PAPER_SHAPE, POT, PRINT, type ToolId } from './layout'
import { bake, type G, type MakeSheet, type Sprite } from './surface'

// Everything but the cat and the room that is drawn once and stamped after:
// the bird, the cloud, the cloths, the pots' liquid and sticks, the tools,
// the corner of paper, a print's sheet, and the ghost hand. The working
// pieces are the plainest things in the frame.

const TAU = Math.PI * 2
const WOOD = '#d2ac70'
const WOOD_LINE = '#8f6f3e'

export type BirdSprites = { body: Sprite; head: Sprite; wing: Sprite }

export function bakeBird(make: MakeSheet, k: number): BirdSprites {
  return {
    // Standing on the sill: legs, tail, body and belly, with its feet at the origin.
    body: bake(make, k, { x: -37, y: -35, w: 60, h: 37 }, (g) => {
      g.beginPath()
      g.moveTo(-3, -6)
      g.lineTo(-4, 0)
      g.moveTo(5, -6)
      g.lineTo(6, 0)
      g.strokeStyle = '#7a6248'
      g.lineWidth = 2
      g.stroke()
      g.beginPath()
      g.moveTo(-12, -22)
      g.lineTo(-34, -30)
      g.lineTo(-30, -18)
      g.closePath()
      g.fillStyle = '#57789a'
      g.fill()
      g.beginPath()
      g.ellipse(0, -18, 18, 14, -0.15, 0, TAU)
      g.fillStyle = '#6e8fb0'
      g.fill()
      g.beginPath()
      g.ellipse(4, -13, 11, 8, 0, 0, TAU)
      g.fillStyle = '#f0d27a'
      g.fill()
    }),
    head: bake(make, k, { x: -12, y: -12, w: 34, h: 24 }, (g) => {
      g.beginPath()
      g.moveTo(8, -3)
      g.lineTo(20, 1)
      g.lineTo(8, 4)
      g.closePath()
      g.fillStyle = '#e39a3c'
      g.fill()
      g.beginPath()
      g.ellipse(0, 0, 10.5, 10, 0, 0, TAU)
      g.fillStyle = '#6e8fb0'
      g.fill()
      g.beginPath()
      g.ellipse(3.5, -2, 2.4, 2.4, 0, 0, TAU)
      g.fillStyle = '#2a211c'
      g.fill()
    }),
    wing: bake(make, k, { x: -19, y: -6, w: 26, h: 16 }, (g) => {
      g.beginPath()
      g.ellipse(-6, 2, 12, 6.5, 0, 0, TAU)
      g.fillStyle = '#4d6c8c'
      g.fill()
    }),
  }
}

export function bakeCloud(make: MakeSheet, k: number): Sprite {
  return bake(make, k, { x: -54, y: -34, w: 116, h: 56 }, (g) => {
    g.beginPath()
    g.ellipse(0, 0, 44, 20, 0, 0, TAU)
    g.ellipse(30, -12, 30, 20, 0, 0, TAU)
    g.ellipse(-28, -8, 24, 16, 0, 0, TAU)
    g.fillStyle = '#fbfaf4'
    g.fill()
  })
}

/** The towel and the sock, each hanging from where it is pegged. `papers` are their sheets of marbled paper. */
export function bakeCloths(make: MakeSheet, k: number, papers: readonly CanvasImageSource[]): Sprite[] {
  return CLOTHS.map((cloth, i) => {
    const half = cloth.w / 2, long = cloth.h
    return bake(make, k, { x: -half * 2, y: -12, w: half * 3.4, h: long + 24 }, (g) => {
      g.beginPath()
      if (cloth.id === 'towel') {
        g.moveTo(-half, 0)
        g.lineTo(half, 0)
        g.lineTo(half, long - 8)
        for (let n = 0; n < 4; n++) g.quadraticCurveTo(half - (n + 0.5) * (cloth.w / 4), long + 8, half - (n + 1) * (cloth.w / 4), long - 8)
      } else {
        g.moveTo(-half * 0.6, 0)
        g.lineTo(half * 0.7, 0)
        g.lineTo(half * 0.7, long * 0.62)
        g.quadraticCurveTo(half * 0.8, long, -half * 0.4, long)
        g.quadraticCurveTo(-half * 1.9, long, -half * 1.7, long * 0.72)
        g.quadraticCurveTo(-half * 0.6, long * 0.66, -half * 0.6, long * 0.5)
      }
      g.closePath()
      g.save()
      g.clip()
      g.drawImage(papers[i], -half * 2, -4, 200, 150)
      g.restore()
      g.strokeStyle = 'rgba(70, 60, 50, 0.45)'
      g.lineWidth = 2
      g.stroke()
      g.fillStyle = '#c9a36a'
      for (const peg of cloth.id === 'sock' ? [0] : [-half * 0.32, half * 0.32]) g.fillRect(peg - 4, -9, 8, 20)
    })
  })
}

export type PotSprites = { liquid: Sprite[]; lying: Sprite[]; standing: Sprite[] }
/** A stick: how long it is, and how much of one end is wet. */
export const STICK = { long: 84, wet: 24 } as const

export function bakePots(make: MakeSheet, k: number): PotSprites {
  const stick = (pot: number, wetAt: number): Sprite => bake(make, k, { x: -8, y: -8, w: STICK.long + 16, h: 16 }, (g) => {
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(STICK.long, 0)
    g.strokeStyle = WOOD_LINE
    g.lineWidth = 13
    g.stroke()
    g.strokeStyle = WOOD
    g.lineWidth = 8.5
    g.stroke()
    g.beginPath()
    g.moveTo(wetAt, 0)
    g.lineTo(wetAt + (wetAt === 0 ? STICK.wet : -STICK.wet), 0)
    g.strokeStyle = css(INKS[pot + 1].face)
    g.lineWidth = 8.5
    g.stroke()
  })
  return {
    liquid: POT.ys.map((_, pot) => bake(make, k, { x: -50, y: -50, w: 100, h: 100 }, (g) => {
      g.beginPath()
      g.ellipse(0, 0, POT.r - 13, POT.r - 13, 0, 0, TAU)
      g.fillStyle = css(INKS[pot + 1].face)
      g.fill()
      g.beginPath()
      g.ellipse(-16, -18, 13, 7, -0.5, 0, TAU)
      g.fillStyle = 'rgba(255, 255, 255, 0.4)'
      g.fill()
    })),
    // Lying, its wet end rests in the pot. Standing, the wet end is the one held up.
    lying: POT.ys.map((_, pot) => stick(pot, 0)),
    standing: POT.ys.map((_, pot) => stick(pot, STICK.long)),
  }
}

/** The three tools, each with its middle at the origin. None of them is a level bar or an even row of marks: each lies askew and is uneven. */
export function bakeTools(make: MakeSheet, k: number): Record<ToolId, Sprite> {
  const box = { x: -70, y: -40, w: 140, h: 80 }
  return {
    // A wooden comb with a handle: five teeth, each a little shorter than the last.
    comb: bake(make, k, box, (g) => {
      g.rotate(-0.16)
      g.beginPath()
      g.moveTo(-58, -20)
      g.quadraticCurveTo(-64, -6, -50, -4)
      g.lineTo(50, -8)
      g.quadraticCurveTo(62, -12, 56, -24)
      g.quadraticCurveTo(0, -32, -58, -20)
      g.closePath()
      for (let i = 0; i < 5; i++) {
        const x = -8 + i * 14
        g.moveTo(x - 4, -8)
        g.lineTo(x - 1.5, 26 - i * 3)
        g.lineTo(x + 1.5, 26 - i * 3)
        g.lineTo(x + 4, -8)
      }
      g.fillStyle = '#c98f4e'
      g.fill()
      g.strokeStyle = '#8a5a2c'
      g.lineWidth = 2.5
      g.stroke()
    }),
    // A bendy straw: a long tube with a kink, wound with one stripe.
    straw: bake(make, k, box, (g) => {
      g.beginPath()
      g.moveTo(-58, 24)
      g.lineTo(26, -8)
      g.quadraticCurveTo(40, -14, 46, -28)
      g.strokeStyle = '#5f8f8a'
      g.lineWidth = 15
      g.stroke()
      g.strokeStyle = '#e9f1ec'
      g.lineWidth = 10.5
      g.stroke()
      g.setLineDash([7, 13])
      g.lineCap = 'butt'
      g.strokeStyle = '#d9605a'
      g.lineWidth = 10.5
      g.stroke()
      g.setLineDash([])
    }),
    // A lump of soap with a cluster of bubbles on one shoulder, no two the same size.
    soap: bake(make, k, box, (g) => {
      g.rotate(0.14)
      g.beginPath()
      g.moveTo(-40, -14)
      g.quadraticCurveTo(-46, 16, -30, 20)
      g.lineTo(32, 22)
      g.quadraticCurveTo(48, 14, 42, -12)
      g.quadraticCurveTo(0, -24, -40, -14)
      g.closePath()
      g.fillStyle = '#b9dccf'
      g.fill()
      g.strokeStyle = '#6f9f93'
      g.lineWidth = 2.5
      g.stroke()
      const bubbles = [[24, -18, 11], [38, -8, 6], [12, -26, 5]] as const
      for (const [x, y, r] of bubbles) {
        g.beginPath()
        g.ellipse(x, y, r, r, 0, 0, TAU)
        g.fillStyle = '#eef8f6'
        g.fill()
        g.stroke()
      }
    }),
  }
}

/** The corner of paper that sticks out from under the cat, with its tip curled up. Its box is `PAPER`, measured from the box's own corner. */
export function bakePaper(make: MakeSheet, k: number): Sprite {
  return bake(make, k, { x: -6, y: -6, w: PAPER.w + 30, h: PAPER.h + 12 }, (g) => {
    g.beginPath()
    PAPER_SHAPE.forEach((point, i) => (i === 0 ? g.moveTo(point.x, point.y) : g.lineTo(point.x, point.y)))
    g.closePath()
    g.fillStyle = '#fbf7ec'
    g.fill()
    g.strokeStyle = '#c9ba98'
    g.lineWidth = 2
    g.stroke()
    // The curl at its tip.
    g.beginPath()
    g.moveTo(18, 4)
    g.quadraticCurveTo(34, 22, 12, 30)
    g.lineTo(6, 44)
    g.closePath()
    g.fillStyle = '#e9dfc6'
    g.fill()
    g.stroke()
  })
}

/** A print: the picture on its sheet of paper, with the middle of the sheet at the origin, and a peg at its top when it hangs. */
export function bakePrint(make: MakeSheet, k: number, picture: CanvasImageSource, pegged: boolean): Sprite {
  const w = PRINT.w, h = PRINT.h
  return bake(make, k, { x: -w / 2 - 3, y: -h / 2 - 12, w: w + 6, h: h + 16 }, (g) => {
    g.fillStyle = '#fbf8ef'
    g.strokeStyle = '#c9ba98'
    g.lineWidth = 2
    g.beginPath()
    g.rect(-w / 2, -h / 2, w, h)
    g.fill()
    g.stroke()
    g.drawImage(picture, -w / 2 + 5, -h / 2 + 5, w - 10, h - 10)
    if (!pegged) return
    g.fillStyle = '#c9a36a'
    g.strokeStyle = '#8f6f3e'
    g.lineWidth = 1.5
    g.beginPath()
    g.rect(-5, -h / 2 - 10, 10, 22)
    g.fill()
    g.stroke()
  })
}

/** The ghost hand, with the tip of its finger at the origin. */
export function bakeHand(make: MakeSheet, k: number): Sprite {
  return bake(make, k, { x: -50, y: -24, w: 120, h: 150 }, (g) => {
    g.rotate(-0.3)
    g.beginPath()
    g.moveTo(-11, 0)
    g.quadraticCurveTo(0, -14, 11, 0)
    g.lineTo(12, 46)
    g.quadraticCurveTo(48, 40, 46, 76)
    g.quadraticCurveTo(40, 118, -6, 112)
    g.quadraticCurveTo(-34, 104, -28, 62)
    g.lineTo(-11, 52)
    g.closePath()
    g.fillStyle = '#fff6e6'
    g.fill()
    g.strokeStyle = '#5a4636'
    g.lineWidth = 3.5
    g.stroke()
  })
}

/** A hanging drop, as a path at the origin with its point up. */
export function dropPath(g: G, x: number, y: number, r: number): void {
  g.moveTo(x, y - r * 1.7)
  g.quadraticCurveTo(x + r * 1.1, y - r * 0.2, x + r, y + r * 0.3)
  g.arc(x, y + r * 0.3, r, 0, Math.PI, false)
  g.quadraticCurveTo(x - r * 1.1, y - r * 0.2, x, y - r * 1.7)
}
