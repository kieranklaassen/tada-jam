import { RIG, type VisitorId } from './cast'
import { BOOT, CAT, FLOOR_Y, TABLE, VASE } from './layout'
import { Brush, sheet, tone, type G } from './paint'
import { makeRng } from './rng'

// The painted figures that move: the goat in its parts, the cat, the robin,
// the table and the boot that stand in front of them, the scissors and the
// ghost hand. Each is painted once into a sprite and stamped with one call;
// what bends or blinks is a separate part, so no two creatures share a move.

/** A sprite and where its anchor sits inside it, in stage units. */
export type Figure = { canvas: HTMLCanvasElement; ax: number; ay: number; w: number; h: number }

function figure(left: number, top: number, right: number, bottom: number, density: number, seed: number, paint: (brush: Brush, g: G) => void): Figure {
  const w = right - left, h = bottom - top
  const { canvas, g } = sheet(w, h, density)
  g.translate(-left, -top)
  paint(new Brush(g, makeRng(seed)), g)
  return { canvas, ax: -left, ay: -top, w, h }
}

/** Stamps a figure with its anchor at the origin of `g`. */
export function stamp(g: G, fig: Figure): void {
  g.drawImage(fig.canvas, -fig.ax, -fig.ay, fig.w, fig.h)
}

const FUR = '#ecdfc6', FUR_SHADE = '#bfab88', FUR_LIGHT = '#fbf4e2'

export type Figures = ReturnType<typeof paintFigures>

export function paintFigures(density: number) {
  // --- The goat. Its parts are drawn about the middle of its head. ------------

  // Its floor is this far under the middle of its head: it stands upright on its hind legs, like a customer.
  const goatFloor = FLOOR_Y - RIG.goat.headY
  const goatBody = figure(-190, 24, 190, goatFloor + 8, density, 11, (brush) => {
    // Hind legs with shaggy trousers of fur, and split hooves.
    for (const side of [-1, 1]) {
      brush.stroke([side * 58, 222, side * 62, 286, side * 54, goatFloor - 16], 40, '#d9c9a6', 0.5)
      for (let i = 0; i < 8; i++) brush.stroke([side * 58 + brush.vary(-16, 16), 236 + i * 8, side * 58 + brush.vary(-17, 17), 258 + i * 8], 9, tone(['#cdbd99', '#d6c6a2', FUR_SHADE][i % 3], brush.vary(-0.1, 0.02)), 0.5)
      brush.dab(side * 54 - 4, goatFloor - 6, 24, 10, 0, '#43311f')
      brush.stroke([side * 54 - 4, goatFloor - 14, side * 54 - 4, goatFloor], 2, '#8c7350', 0)
    }
    // A stub of a tail, up.
    brush.stroke([150, 196, 172, 176, 180, 160], 13, FUR_LIGHT, 0.6)
    brush.within(-170, 30, 170, 250).fill((p) => {
      p.moveTo(-44, 34); p.lineTo(44, 34)
      p.bezierCurveTo(70, 96, 150, 120, 164, 200)
      p.quadraticCurveTo(160, 252, 96, 250)
      p.lineTo(-96, 250)
      p.quadraticCurveTo(-160, 252, -164, 200)
      p.bezierCurveTo(-150, 120, -70, 96, -44, 34)
    }, '#e3d4b6', 0, 1.5)
    // Shaggy fur, pulled downwards in short loaded strokes, lighter on the window side.
    for (let i = 0; i < 100; i++) {
      const y = brush.vary(46, 232), spread = Math.min(150, 40 + (y - 34) * 0.72)
      const x = brush.vary(-spread, spread)
      const lit = x < -10 ? 0.18 : x > 60 ? -0.2 : 0
      brush.stroke([x, y, x + brush.vary(-5, 5), y + brush.vary(16, 30)], brush.vary(7, 12), tone([FUR, '#e0d0b0', FUR_LIGHT][i % 3], lit + brush.vary(-0.08, 0.08)), 0.6)
    }
    // A brown saddle over one shoulder, a pale belly, and a ragged hem of tufts: no plain triangle.
    for (let i = 0; i < 26; i++) {
      const x = brush.vary(40, 128), y = brush.vary(84, 168)
      brush.stroke([x, y, x + brush.vary(-4, 6), y + brush.vary(14, 26)], brush.vary(7, 11), tone('#9a6f44', brush.vary(-0.15, 0.15)), 0.6)
    }
    for (let i = 0; i < 16; i++) brush.stroke([brush.vary(-52, 30), brush.vary(150, 212), brush.vary(-52, 30), brush.vary(176, 236)], 9, tone(FUR_LIGHT, brush.vary(0, 0.2)), 0.5)
    for (let i = 0; i < 15; i++) { const x = -150 + i * 21.5; brush.stroke([x, 226, x + brush.vary(-5, 5), 246 + brush.vary(0, 9)], 11, [FUR, '#d7c8a8', FUR_LIGHT][i % 3], 0.7) }
    // The shadow under the chin, a red collar and its brass bell.
    for (let i = 0; i < 7; i++) brush.stroke([-34 + i * 11, 40, -30 + i * 11, 70], 10, tone(FUR_SHADE, -0.12), 0.3)
    brush.stroke([-52, 104, 0, 122, 52, 104], 15, '#b3321d')
    brush.dab(1, 139, 12, 13, 0, '#d9a638')
    brush.dab(1, 147, 5, 2.4, 0, '#4a3212', 0)
  })

  const goatHead = figure(-112, -176, 112, 116, density, 12, (brush) => {
    // The horns, ridged, sweeping up and back.
    for (const side of [-1, 1]) {
      brush.stroke([side * 26, -64, side * 40, -112, side * 66, -150, side * 92, -158], 17, '#b29a6c')
      for (let i = 0; i < 6; i++) {
        const t = i / 6
        const x = side * (30 + t * 52), y = -78 - t * 76
        brush.stroke([x - 7, y + 3 * side, x + 7, y - 3 * side], 2.2, '#6d5632', 0)
      }
    }
    const skull = (p: G): void => {
      p.moveTo(-50, -70)
      p.quadraticCurveTo(0, -90, 50, -70)
      p.bezierCurveTo(74, -44, 68, 12, 42, 50)
      p.bezierCurveTo(36, 72, 36, 92, 28, 100)
      p.quadraticCurveTo(0, 110, -28, 100)
      p.bezierCurveTo(-36, 92, -36, 72, -42, 50)
      p.bezierCurveTo(-68, 12, -74, -44, -50, -70)
    }
    brush.within(-70, -88, 70, 106).fill(skull, FUR, 0, 1.5)
    // The long face, painted down its length: light on the window side, shadow on the other.
    for (let i = 0; i < 46; i++) {
      const y = brush.vary(-66, 72), half = y < 40 ? 56 - Math.abs(y + 14) * 0.2 : 30
      const x = brush.vary(-half, half)
      brush.stroke([x, y, x + brush.vary(-3, 3), y + brush.vary(14, 26)], brush.vary(6, 11), tone(x > 18 ? FUR_SHADE : x < -22 ? FUR_LIGHT : FUR, brush.vary(-0.08, 0.1)), 0.5)
    }
    for (let i = 0; i < 7; i++) brush.stroke([(i - 3) * 5, -86, (i - 3) * 9, -52 + Math.abs(i - 3) * 3], 6, i % 2 ? FUR_LIGHT : '#e2d2b2', 0.7)
    brush.dab(0, 66, 30, 30, 0, '#f6eeda', 0.4)
    // The eyes: amber, wide apart. Their level pupils are drawn each frame.
    for (const side of [-1, 1]) {
      brush.dab(side * 41, -22, 19, 15, 0, '#3a2414', 0)
      brush.dab(side * 41, -22, 16.5, 12.5, 0, '#e4b238', 0.5)
    }
    // The nose, and the line of the lip under it.
    brush.dab(0, 75, 12, 7.5, 0, '#d8a69a', 0.6)
    brush.stroke([-9, 71, -4, 78], 2.6, '#5a2a28', 0)
    brush.stroke([9, 71, 4, 78], 2.6, '#5a2a28', 0)
    brush.stroke([0, 82, 0, 97], 1.8, '#8a6450', 0)
    brush.stroke([-24, 95, 0, 103, 24, 95], 2.4, '#7a5644', 0)
  })

  const goatEar = figure(-8, -30, 100, 30, density, 13, (brush) => {
    brush.within(0, -24, 92, 24).fill((p) => { p.moveTo(0, -8); p.bezierCurveTo(30, -30, 70, -22, 92, 4); p.bezierCurveTo(64, 26, 26, 22, 0, 10); p.closePath() }, '#e2d3b4', 4, 0.1)
    brush.stroke([10, 2, 46, 0, 78, 5], 9, '#d9a79b', 0.4)
  })

  const goatJaw = figure(-46, -14, 46, 100, density, 14, (brush) => {
    brush.dab(0, 6, 27, 12, 0, '#e8dabd')
    // The beard: a tuft that wags a beat behind the jaw.
    for (let i = 0; i < 9; i++) brush.stroke([(i - 4) * 4, 12, (i - 4) * 3.2, 46, (i - 4) * 1.4 + brush.vary(-3, 3), 72 + brush.vary(0, 18)], 7, [FUR, '#d7c8a8', FUR_LIGHT, FUR_SHADE][i % 4], 0.6)
  })

  // --- The stone table. ---------------------------------------------------------

  const table = figure(TABLE.left - 12, TABLE.top - 8, TABLE.right + 12, TABLE.bottom + 8, density, 21, (brush) => {
    const { left, right, top, bottom } = TABLE
    const mid = (left + right) / 2
    brush.within(mid - 80, top + 22, mid + 80, bottom).fill((p) => {
      p.moveTo(mid - 20, top + 22)
      p.bezierCurveTo(mid - 62, top + 52, mid - 40, top + 86, mid - 18, top + 100)
      p.lineTo(mid - 74, bottom - 16); p.lineTo(mid - 78, bottom); p.lineTo(mid + 78, bottom); p.lineTo(mid + 74, bottom - 16)
      p.lineTo(mid + 18, top + 100)
      p.bezierCurveTo(mid + 40, top + 86, mid + 62, top + 52, mid + 20, top + 22)
      p.closePath()
    }, '#8c8170', 14, 1.5)
    brush.within(left, top, right, top + 28).fill((p) => p.rect(left, top, right - left, 27), '#a69b87', 16, 0, 1)
    brush.stroke([left + 4, top + 3, right - 4, top + 3], 5, '#d6cbb4', 0.7)
    brush.stroke([left + 6, top + 25, right - 6, top + 25], 4, '#5f5647', 0.4)
  })

  // --- The goat's old boot: the leather the pieces stand behind. ---------------

  const boot = figure(BOOT.x - 116, BOOT.mouthY - 26, BOOT.x + 54, TABLE.top + 6, density, 22, (brush, g) => {
    const x = BOOT.x, y = BOOT.mouthY, m = BOOT.halfMouth
    const leather = '#7d4b28'
    // The tongue of the boot, standing up behind the front of the mouth.
    brush.within(x - m - 4, y - 22, x - 6, y + 12).fill((p) => { p.moveTo(x - m + 2, y + 10); p.quadraticCurveTo(x - m - 6, y - 24, x - 20, y - 20); p.quadraticCurveTo(x - 6, y - 16, x - 8, y + 10); p.closePath() }, '#6a3d20', 3, 1.4)
    brush.within(x - 106, y, x + 44, y + 98).fill((p) => {
      p.moveTo(x - m, y)
      p.lineTo(x - m - 2, y + 56)
      p.quadraticCurveTo(x - 62, y + 60, x - 90, y + 72)
      p.quadraticCurveTo(x - 108, y + 82, x - 104, y + 96)
      p.lineTo(x + 40, y + 96)
      p.lineTo(x + 41, y + 66)
      p.quadraticCurveTo(x + m, y + 30, x + m, y)
      p.quadraticCurveTo(x, y + 18, x - m, y)
    }, leather, 16, 1.4)
    // The scuffed toe, a patch on the heel, the sole and the heel block.
    brush.dab(x - 84, y + 84, 20, 12, -0.15, '#93603a')
    brush.within(x + 4, y + 40, x + 34, y + 68).fill((p) => p.rect(x + 6, y + 42, 26, 24), '#9a6a3c', 3, 0.3, 0.7)
    for (let i = 0; i < 4; i++) brush.dab(x + 9 + i * 7, y + 44, 1.2, 1.2, 0, '#e0cfa2', 0)
    brush.stroke([x - 104, y + 97, x + 40, y + 97], 7, '#2a1a10', 0.6)
    brush.within(x + 4, y + 90, x + 42, y + 100).fill((p) => p.rect(x + 6, y + 90, 35, 10), '#1f130b', 0, 0, 0.4)
    // Brass eyelets up the front, and one lace hanging loose.
    for (let i = 0; i < 4; i++) brush.dab(x - m + 8, y + 10 + i * 12, 3, 3, 0, '#d9b45a', 0.6)
    brush.stroke([x - m + 8, y + 10, x - m - 12, y + 26, x - m - 6, y + 52, x - m - 22, y + 70], 2.2, '#d9c79a', 0.5)
    // The lit front of the rim.
    g.lineCap = 'round'
    brush.stroke([x - m + 2, y + 2, x, y + 10, x + m - 2, y + 2], 3.4, '#b98250', 0.6)
  })

  // --- The jar and the tall vase. -------------------------------------------------

  const jar = figure(VASE.jar.x - 62, VASE.jar.mouthY - 8, VASE.jar.x + 62, TABLE.top + 6, density, 23, (brush, g) => {
    const x = VASE.jar.x, y = VASE.jar.mouthY, m = VASE.jar.halfMouth, floor = TABLE.top
    const body = (p: G): void => {
      p.moveTo(x - m, y); p.lineTo(x - m, y + 8)
      p.quadraticCurveTo(x - 54, y + 12, x - 54, y + 26)
      p.lineTo(x - 52, floor - 6); p.quadraticCurveTo(x - 52, floor, x - 44, floor)
      p.lineTo(x + 44, floor); p.quadraticCurveTo(x + 52, floor, x + 52, floor - 6)
      p.lineTo(x + 54, y + 26); p.quadraticCurveTo(x + 54, y + 12, x + m, y + 8); p.lineTo(x + m, y)
      p.quadraticCurveTo(x, y + 14, x - m, y)
    }
    // Thick green glass with water in it: the stalks are dim shapes behind it.
    g.globalAlpha = 0.86
    brush.within(x - 56, y, x + 56, floor).fill(body, '#8fb9ad', 5, Math.PI / 2, 1.2)
    g.globalAlpha = 1
    brush.within(x - 50, y + 26, x + 50, floor - 3).fill((p) => p.rect(x - 49, y + 28, 98, floor - y - 32), 'rgba(96,150,150,0.55)', 4, 0, 0)
    brush.stroke([x - 48, y + 28, x + 48, y + 28], 2.2, '#d9f0ea', 0)
    brush.stroke([x - 42, y + 20, x - 44, floor - 12], 5, '#e6f6f0', 0)
    brush.stroke([x + 40, y + 30, x + 40, floor - 16], 2.4, '#c6e2da', 0)
    // The screw thread of the neck, and the lit front of the rim.
    brush.stroke([x - m, y + 5, x + m, y + 5], 3, '#6f9a8e', 0.4)
    brush.stroke([x - m + 2, y + 2, x, y + 11, x + m - 2, y + 2], 3.2, '#d2ece4', 0.6)
  })

  const tallVase = figure(VASE.vase.x - 46, VASE.vase.mouthY - 8, VASE.vase.x + 46, TABLE.top + 6, density, 24, (brush) => {
    const x = VASE.vase.x, y = VASE.vase.mouthY, m = VASE.vase.halfMouth, floor = TABLE.top
    brush.within(x - 40, y, x + 40, floor).fill((p) => {
      p.moveTo(x - m - 5, y)
      p.bezierCurveTo(x - m + 4, y + 30, x - 40, y + 60, x - 36, y + 98)
      p.bezierCurveTo(x - 34, y + 126, x - 20, y + 132, x - 24, floor)
      p.lineTo(x + 24, floor)
      p.bezierCurveTo(x + 20, y + 132, x + 34, y + 126, x + 36, y + 98)
      p.bezierCurveTo(x + 40, y + 60, x + m - 4, y + 30, x + m + 5, y)
      p.quadraticCurveTo(x, y + 12, x - m - 5, y)
    }, '#ece9df', 8, Math.PI / 2, 1.4)
    // Blue brushwork: a band at the neck, a band at the foot, and loose leaves between.
    brush.stroke([x - m, y + 22, x, y + 27, x + m, y + 22], 4, '#33558f', 0.5)
    brush.stroke([x - 25, floor - 12, x, floor - 8, x + 25, floor - 12], 5, '#33558f', 0.5)
    for (let i = 0; i < 9; i++) brush.dab(x + brush.vary(-24, 24), y + brush.vary(50, 118), brush.vary(6, 10), brush.vary(3, 4.5), brush.vary(-1.2, 1.2), tone('#3f66a6', brush.vary(-0.1, 0.25)), 0.6)
    brush.stroke([x - 26, y + 60, x - 28, y + 104], 4, '#ffffff', 0)
    brush.stroke([x - m - 3, y + 2, x, y + 9, x + m + 3, y + 2], 3, '#ffffff', 0.5)
  })

  // --- The bee-keeper: round, padded, slow. Her parts are drawn about the middle of her head. ---

  const keeperFloor = FLOOR_Y - RIG.beekeeper.headY
  const SUIT = '#ece4cf'
  const keeperBody = figure(-150, 40, 150, keeperFloor + 8, density, 71, (brush) => {
    for (const side of [-1, 1]) {
      brush.stroke([side * 44, 270, side * 46, keeperFloor - 18], 46, '#d9cfb6', 0.5)
      brush.dab(side * 50, keeperFloor - 8, 34, 13, 0, '#5a4a36')
    }
    brush.dab(0, 186, 128, 118, 0, SUIT)
    // Quilting: rows of padded seams, lit from the window.
    for (let row = 0; row < 6; row++) {
      const y = 98 + row * 34, half = Math.sqrt(Math.max(0, 1 - ((y - 186) / 118) ** 2)) * 122
      brush.stroke([-half, y, 0, y + 10, half, y], 3, '#bdb295', 0.2)
      for (let i = 0; i < 7; i++) { const x = -half + ((i + 0.5) / 7) * half * 2; brush.dab(x, y + 20 - Math.abs(x) * 0.03, half / 8, 11, 0, tone(SUIT, x < 0 ? 0.25 : -0.08), 0.5) }
    }
    brush.stroke([-118, 214, 0, 232, 118, 214], 13, '#7a5a34', 0.7)
    brush.dab(0, 232, 11, 9, 0, '#d9a638')
    // The collar the veil is tucked into.
    brush.stroke([-62, 78, 0, 94, 62, 78], 16, '#d9cfb6', 0.6)
  })
  const keeperFace = figure(-40, -20, 40, 70, density, 72, (brush) => {
    brush.stroke([0, 30, 0, 64], 24, '#e8bf9c', 0.4)
    brush.dab(0, 16, 25, 27, 0, '#f0c9a6', 0.5)
    brush.dab(-14, 26, 6, 4, 0, '#e89a8a', 0)
    brush.dab(14, 26, 6, 4, 0, '#e89a8a', 0)
    brush.dab(0, 28, 3.4, 2.6, 0, '#d98f7a', 0)
    brush.stroke([-7, 40, 0, 44, 7, 40], 2, '#9a4a3c', 0)
  })
  const keeperVeil = figure(-100, -64, 100, 100, density, 73, (brush, g) => {
    g.globalAlpha = 0.6
    brush.within(-92, -56, 92, 92).fill((p) => { p.moveTo(-86, -52); p.lineTo(86, -52); p.quadraticCurveTo(70, 30, 58, 90); p.lineTo(-58, 90); p.quadraticCurveTo(-70, 30, -86, -52) }, '#5a5f52', 0, 0, 0.6)
    g.globalAlpha = 1
    // The mesh, in two directions.
    for (let i = -8; i <= 8; i++) brush.stroke([i * 10, -52, i * 7.4, 90], 0.9, 'rgba(226,230,214,0.55)', 0)
    for (let j = 0; j < 12; j++) { const y = -46 + j * 12; brush.stroke([-84 + j * 2.2, y, 0, y + 4, 84 - j * 2.2, y], 0.9, 'rgba(226,230,214,0.5)', 0) }
  })
  const keeperHat = figure(-110, -126, 110, -30, density, 74, (brush) => {
    const straw = '#d6b25c'
    brush.dab(0, -52, 100, 19, 0, straw)
    brush.within(-52, -122, 52, -50).fill((p) => { p.moveTo(-50, -52); p.bezierCurveTo(-52, -112, -24, -122, 0, -122); p.bezierCurveTo(24, -122, 52, -112, 50, -52); p.closePath() }, '#e0bf6a', 8, 0, 1)
    // Coiled like a straw hive, with a door for the bees.
    for (let i = 0; i < 4; i++) brush.stroke([-48 + i * 3, -64 - i * 14, 0, -58 - i * 14, 48 - i * 3, -64 - i * 14], 3, '#a8843a', 0.3)
    brush.dab(0, -66, 9, 7, 0, '#3a2a14', 0)
    brush.stroke([-96, -50, 0, -42, 96, -50], 3, '#f1d58a', 0.4)
  })

  // --- The bride: tall, floating, in a long train. ---------------------------------

  const brideFloor = FLOOR_Y - RIG.bride.headY
  const brideBody = figure(-110, 34, 210, brideFloor + 8, density, 81, (brush) => {
    const white = '#f3ede2'
    // The train, swept out behind her along the ground.
    brush.within(20, 300, 204, brideFloor).fill((p) => { p.moveTo(30, 300); p.bezierCurveTo(90, 340, 150, 390, 204, brideFloor - 4); p.lineTo(20, brideFloor); p.closePath() }, '#e6ded0', 10, 0.5, 1)
    brush.within(-90, 130, 90, brideFloor).fill((p) => {
      p.moveTo(-26, 132); p.bezierCurveTo(-40, 240, -84, 340, -88, brideFloor - 2)
      p.quadraticCurveTo(0, brideFloor + 8, 88, brideFloor - 2)
      p.bezierCurveTo(84, 340, 40, 240, 26, 132); p.closePath()
    }, white, 0, 1.5)
    for (let i = 0; i < 30; i++) { const x = brush.vary(-70, 70); brush.stroke([x * 0.4, 150 + brush.vary(0, 40), x, brideFloor - brush.vary(10, 60)], brush.vary(7, 12), tone(white, x > 10 ? brush.vary(-0.16, -0.04) : brush.vary(0, 0.3)), 0.5) }
    // The bodice, long neck and shoulders, a sash.
    brush.stroke([0, 34, 0, 62], 17, '#f0c9a6', 0.4)
    brush.within(-40, 56, 40, 140).fill((p) => { p.moveTo(-40, 62); p.quadraticCurveTo(0, 50, 40, 62); p.lineTo(26, 136); p.lineTo(-26, 136); p.closePath() }, '#faf6ee', 5, 1.5, 1)
    brush.stroke([-27, 132, 0, 138, 27, 132], 9, '#e9a9b4', 0.7)
    for (let i = 0; i < 9; i++) brush.dab(-84 + i * 21, brideFloor - 6, 12, 7, 0, '#fffaf0', 0.6)
  })
  const brideHead = figure(-46, -60, 46, 46, density, 82, (brush) => {
    // Dark hair gathered up, a long oval face, two round cheeks.
    brush.dab(0, -16, 36, 40, 0, '#4a2c1a')
    brush.dab(0, -44, 17, 13, 0, '#5a3822')
    brush.dab(0, 2, 28, 34, 0, '#f3cfae', 0.5)
    for (let i = 0; i < 5; i++) brush.stroke([-24 + i * 12, -34, -20 + i * 11, -22], 8, i % 2 ? '#4a2c1a' : '#5a3822', 0.5)
    brush.dab(-16, 12, 7, 5, 0, '#ee9d98', 0)
    brush.dab(16, 12, 7, 5, 0, '#ee9d98', 0)
    brush.dab(0, 10, 3, 4, 0, '#e2b190', 0)
    brush.stroke([-6, 26, 0, 29, 6, 26], 2.4, '#c2504e', 0)
  })
  // Her veil hangs from the top of her head, its top at the origin and its hem pointing down.
  const brideVeil = figure(-80, -8, 80, 300, density, 83, (brush, g) => {
    g.globalAlpha = 0.5
    brush.within(-74, 0, 74, 296).fill((p) => { p.moveTo(-10, 0); p.bezierCurveTo(-60, 60, -70, 200, -72, 292); p.quadraticCurveTo(0, 304, 72, 292); p.bezierCurveTo(70, 200, 60, 60, 10, 0); p.closePath() }, '#fffdf6', 0, 0, 0.8)
    g.globalAlpha = 1
    for (let i = 0; i < 9; i++) brush.stroke([(i - 4) * 3, 6, (i - 4) * 16, 288], 1.2, 'rgba(255,255,255,0.7)', 0)
    for (let i = 0; i < 8; i++) brush.dab(-63 + i * 18, 290, 9, 4, 0, 'rgba(255,255,255,0.85)', 0)
  })

  // --- The aunt: thin, stiff, upright. ---------------------------------------------

  const auntFloor = FLOOR_Y - RIG.aunt.headY
  const auntBody = figure(-70, 40, 70, auntFloor + 8, density, 91, (brush) => {
    const plum = '#4b2b45'
    for (const side of [-1, 1]) {
      brush.stroke([side * 12, auntFloor - 30, side * 12, auntFloor - 10], 8, '#2a1c22', 0.4)
      brush.within(side * 12 - 22, auntFloor - 14, side * 12 + 22, auntFloor).fill((p) => { p.moveTo(side * 12 + 8, auntFloor - 12); p.lineTo(side * 12 - 22, auntFloor - 2); p.lineTo(side * 12 + 8, auntFloor); p.closePath() }, '#1c1216', 0, 0, 0.6)
    }
    brush.within(-50, 70, 50, auntFloor - 20).fill((p) => { p.moveTo(-34, 74); p.lineTo(34, 74); p.lineTo(46, auntFloor - 22); p.lineTo(-46, auntFloor - 22); p.closePath() }, plum, 0, 1.5)
    for (let i = 0; i < 9; i++) { const x = -32 + i * 8; brush.stroke([x, 86, x * 1.3, auntFloor - 26], 5, tone(plum, x < 0 ? 0.14 : -0.2), 0.4) }
    // A high lace collar, a brooch, a row of buttons.
    brush.stroke([0, 42, 0, 70], 15, '#e9d3bd', 0.3)
    brush.stroke([-17, 66, 0, 72, 17, 66], 11, '#efe6d6', 0.6)
    for (let i = 0; i < 5; i++) brush.dab(-12 + i * 6, 62, 3, 3, 0, '#fffaf0', 0.3)
    brush.dab(0, 84, 7, 8, 0, '#c9972e')
    brush.dab(0, 84, 3.2, 3.8, 0, '#7a1f2c', 0.6)
    for (let i = 0; i < 7; i++) brush.dab(0, 110 + i * 28, 2.6, 2.6, 0, '#1c1216', 0.5)
  })
  const auntHead = figure(-40, -62, 40, 62, density, 92, (brush) => {
    // Grey hair drawn back hard, a long narrow face, a sharp nose, a mouth like a seam.
    brush.dab(0, -22, 29, 34, 0, '#9a968e')
    for (let i = 0; i < 6; i++) brush.stroke([-22 + i * 9, -18, -14 + i * 6, -52], 5, i % 2 ? '#b8b4aa' : '#86827a', 0.5)
    brush.within(-26, -30, 26, 58).fill((p) => { p.moveTo(-24, -26); p.quadraticCurveTo(0, -36, 24, -26); p.bezierCurveTo(27, 10, 18, 44, 0, 56); p.bezierCurveTo(-18, 44, -27, 10, -24, -26) }, '#ecd6c0', 4, Math.PI / 2, 0.6)
    brush.within(-7, -6, 9, 26).fill((p) => { p.moveTo(-2, -6); p.lineTo(8, 24); p.lineTo(-5, 22); p.closePath() }, '#dcc0a6', 0, 0, 0.5)
    brush.stroke([-9, 38, 9, 37], 2, '#8a4a4a', 0)
    brush.stroke([-12, 46, 0, 50, 12, 46], 1.2, '#c9ae96', 0)
  })
  const auntBun = figure(-26, -26, 26, 26, density, 93, (brush) => {
    brush.dab(0, 0, 21, 20, 0, '#9a968e')
    for (let i = 0; i < 5; i++) brush.stroke([-14 + i * 2, -12 + i * 6, 0, -16 + i * 6, 14 - i * 2, -10 + i * 6], 3, i % 2 ? '#b8b4aa' : '#7c7870', 0.4)
    brush.stroke([-24, -4, 24, 4], 2.4, '#3a2a1a', 0.3)
  })

  // --- The cat on the sill, asleep. Its tail and its eye are drawn each frame. --

  const cat = figure(CAT.x - 100, CAT.y - 54, CAT.x + 100, CAT.y + 22, density, 31, (brush) => {
    const x = CAT.x, y = CAT.y
    const ginger = '#c7742b'
    brush.dab(x + 14, y - 6, 72, 23, 0, ginger)
    brush.dab(x + 52, y - 12, 36, 27, 0, '#bd6a24')
    for (let i = 0; i < 7; i++) brush.stroke([x - 22 + i * 16, y - 27 - Math.sin(i * 0.6) * 4, x - 16 + i * 16, y - 8], 5, '#8a4716', 0.5)
    // Ears, then the head resting on a paw.
    for (const ex of [-76, -50]) brush.within(x + ex - 10, y - 46, x + ex + 12, y - 22).fill((p) => { p.moveTo(x + ex - 9, y - 22); p.lineTo(x + ex, y - 44); p.lineTo(x + ex + 11, y - 24); p.closePath() }, '#b96420', 0, 0)
    brush.dab(x - 62, y - 10, 27, 22, 0, ginger)
    brush.stroke([x - 70, y - 30, x - 66, y - 18], 3, '#8a4716', 0.4)
    brush.stroke([x - 60, y - 31, x - 58, y - 19], 3, '#8a4716', 0.4)
    brush.dab(x - 70, y - 1, 13, 8, 0, '#f1e7d3')
    brush.dab(x - 76, y - 5, 2.6, 2, 0, '#d98a80', 0)
    brush.dab(x - 40, y + 9, 17, 7, 0, '#f1e7d3')
    for (const dy of [-3, 1]) brush.stroke([x - 80, y + dy, x - 96, y + dy * 2.4 - 1], 0.9, '#f3ead9', 0)
  })

  // --- The robin. ---------------------------------------------------------------

  const robin = figure(-28, -40, 30, 8, density, 41, (brush) => {
    brush.stroke([-10, -14, -24, -6], 6, '#5a4936')
    brush.dab(0, -17, 17, 15, 0, '#6f5b45')
    brush.dab(7, -13, 11, 12, 0, '#e0562a')
    brush.dab(3, -5, 9, 5, 0, '#d9ccb4', 0.4)
    brush.dab(9, -27, 10, 9, 0, '#6f5b45', 0.6)
    brush.dab(13, -22, 6, 6, 0, '#e0562a', 0.5)
    brush.dab(12, -29, 2.2, 2.2, 0, '#150d08', 0)
    brush.dab(11.3, -29.7, 0.8, 0.8, 0, '#fff7e6', 0)
    brush.within(18, -30, 28, -24).fill((p) => { p.moveTo(18, -29); p.lineTo(27, -26); p.lineTo(18, -24); p.closePath() }, '#33261a', 0, 0, 0)
    brush.stroke([-2, -3, -3, 5], 1.4, '#33261a', 0)
    brush.stroke([4, -3, 5, 5], 1.4, '#33261a', 0)
  })
  const robinWing = figure(-22, -8, 6, 8, density, 42, (brush) => {
    brush.dab(-8, 0, 13, 6.5, 0, '#57452f')
    brush.stroke([-18, 1, -2, -1], 2, '#8a7458', 0)
  })

  // --- One half of the scissors, its pivot at the origin and its blade pointing up. --

  const blade = figure(-10, -86, 36, 60, density, 51, (brush, g) => {
    brush.within(-8, -82, 10, 8).fill((p) => { p.moveTo(-5, 6); p.lineTo(0, -80); p.quadraticCurveTo(7, -40, 8, 6); p.closePath() }, '#c3ccce', 3, Math.PI / 2)
    brush.stroke([-2.5, 0, 0, -72], 1.6, '#f4f8f8', 0)
    brush.stroke([2, 6, 9, 20, 15, 28], 6, '#8d2a1b')
    g.lineWidth = 6.5
    g.strokeStyle = 'rgba(40,10,6,0.55)'
    g.beginPath(); g.ellipse(18.4, 42.6, 11, 14, 0.3, 0, Math.PI * 2); g.stroke()
    g.strokeStyle = '#a33220'
    g.beginPath(); g.ellipse(17, 41, 11, 14, 0.3, 0, Math.PI * 2); g.stroke()
    g.lineWidth = 1.6
    g.strokeStyle = 'rgba(255,190,160,0.8)'
    g.beginPath(); g.ellipse(16, 40, 12.6, 15.6, 0.3, Math.PI * 1.05, Math.PI * 1.6); g.stroke()
    brush.dab(1, 3, 3.2, 3.2, 0, '#5f6a6c', 0.6)
  })

  // --- The ghost hand of the idle ladder: its fingertip at the origin. ----------

  const hand = figure(-34, -8, 44, 104, density, 61, (brush) => {
    const skin = '#f1d9bb'
    brush.dab(10, 64, 28, 27, 0, skin)
    brush.stroke([-12, 58, -24, 40], 13, skin)
    brush.stroke([0, 46, 0, 6], 15, skin)
    for (let i = 0; i < 3; i++) brush.dab(16 + i * 9, 42 + i * 3, 6.5, 9, 0.1, tone(skin, -0.06))
    brush.stroke([-3, 10, -3, 30], 1.6, '#fff6e6', 0)
  })

  const pots = { boot, jar, vase: tallVase }
  /** How far under the middle of its head each visitor's feet are. */
  const floors: Record<VisitorId, number> = { goat: goatFloor, beekeeper: keeperFloor, bride: brideFloor, aunt: auntFloor }
  return { goatBody, goatHead, goatEar, goatJaw, keeperBody, keeperFace, keeperVeil, keeperHat, brideBody, brideHead, brideVeil, auntBody, auntHead, auntBun, table, pots, floors, cat, robin, robinWing, blade, hand }
}
