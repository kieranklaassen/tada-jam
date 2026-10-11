import { TOYS } from './layout'
import { C, INK, TUB, gloss, inked, oval, rounded, sprite, type G, type Sprite } from './paint'

// The three large toys that stand at the sides of the table, as moulded
// plastic figures: flat colour, an ink line, a gloss. Each is cut into a few
// sprites so that its own funniest part can move: the dragon's head and jaw
// on a long neck, the walrus's flippers over the rim of its tub, the
// elephant's ears. Eyes are left blank here: the view draws the pupils, so
// that every toy can watch the ball.

/** Where the parts of each toy go, in stage units. The view and the sprites share these. */
export const DRAGON = {
  base: { x: TOYS.dragon.x + 120, y: 430 },
  neckRoot: { x: TOYS.dragon.x + 116, y: 306 },
  head: { x: TOYS.dragon.x + 136, y: 216 },
  /** In the head sprite, from its anchor. */
  eyes: [{ x: 0, y: -40, r: 15 }, { x: 28, y: -42, r: 14 }],
  jaw: { x: 20, y: -4 },
  nostril: { x: 80, y: -36 },
  mouth: { x: 78, y: 2 },
} as const

export const WALRUS = {
  base: { x: TUB.x, y: 748 },
  /** In the body sprite, from its anchor at the foot. */
  eyes: [{ x: -40, y: -214, r: 14 }, { x: 40, y: -214, r: 14 }],
  muzzle: [{ x: -31, y: -150 }, { x: 31, y: -150 }],
  flipper: { x: 96, y: -112 },
} as const

export const ELEPHANT = {
  base: { x: TOYS.elephant.x + 126, y: 812 },
  head: { x: TOYS.elephant.x + 126, y: 572 },
  /** In the head sprite, from its anchor at the neck. */
  eyes: [{ x: -25, y: -76, r: 15 }, { x: 25, y: -76, r: 15 }],
  trunk: { x: 0, y: -46 },
  ear: { x: 50, y: -92 },
} as const

function eyeWhite(g: G, x: number, y: number, r: number): void {
  oval(g, x, y, r, r * 1.08)
  inked(g, C.white, 3.5)
}

// --- The dragon ------------------------------------------------------------------

/**
 * The tuft at the end of the dragon's tail: lobes round the tip, each `far` from it at `turn` from the way the
 * tail runs, with its radius. They are of four sizes and sit unevenly, the largest behind the tip, so the end of
 * the tail is a soft bunch with no point.
 */
export const TUFT: readonly { turn: number; far: number; r: number }[] = [
  { turn: 0.5, far: 9, r: 8 }, { turn: -0.9, far: 8, r: 6.5 }, { turn: 2.5, far: 6, r: 9.5 }, { turn: -2.4, far: 9, r: 5.5 },
]


/** The dragon's body. `tail` is its tail curled round to the front; without it the view draws the tail itself, out over the table. */
function dragonBody(density: number, tail: boolean): Sprite {
  return sprite(density, 220, 200, 110, 194, (g) => {
    if (tail) {
      // The tail, curled round to the front, with a tuft at its tip.
      g.beginPath()
      g.moveTo(150, 150)
      g.bezierCurveTo(206, 150, 214, 92, 184, 86)
      g.strokeStyle = INK
      g.lineWidth = 26
      g.stroke()
      g.strokeStyle = C.dragon
      g.lineWidth = 17
      g.stroke()
      // The same tuft the view draws on the tail when it is out over the table.
      const way = Math.atan2(-6, -30)
      // Filled twice, in ink a little larger and then in colour: the bunch has one ink line round all of it.
      for (const grow of [4.5, 0]) {
        g.beginPath()
        for (const lobe of TUFT) {
          const x = 184 + Math.cos(way + lobe.turn) * lobe.far, y = 86 + Math.sin(way + lobe.turn) * lobe.far
          g.moveTo(x + lobe.r + grow, y)
          g.arc(x, y, lobe.r + grow, 0, Math.PI * 2)
        }
        g.fillStyle = grow > 0 ? INK : C.dragonSpike
        g.fill()
      }
    }
    // Two small wings behind the shoulders.
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(110 + side * 40, 86)
      g.lineTo(110 + side * 92, 50)
      g.lineTo(110 + side * 84, 84)
      g.lineTo(110 + side * 98, 104)
      g.lineTo(110 + side * 50, 112)
      g.closePath()
      inked(g, C.dragonSpike, 4)
    }
    // The feet.
    for (const side of [-1, 1]) {
      oval(g, 110 + side * 38, 182, 30, 13)
      inked(g, C.dragon, 4.5)
    }
    // The body, a pear, with a pale belly and one fold across it.
    oval(g, 110, 124, 66, 68)
    inked(g, C.dragon, 5)
    oval(g, 110, 136, 42, 48)
    g.fillStyle = C.dragonBelly
    g.fill()
    g.strokeStyle = 'rgba(30,42,82,0.3)'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(110 - 36, 146)
    g.quadraticCurveTo(110 + 6, 160, 110 + 34, 140)
    g.stroke()
    // Two short arms folded on the belly.
    for (const side of [-1, 1]) {
      oval(g, 110 + side * 50, 122, 13, 20, side * 0.5)
      inked(g, C.dragonDark, 4)
    }
    gloss(g, 78, 82, 16, 7, -0.7, 0.5)
  })
}

function dragonHead(density: number): Sprite {
  return sprite(density, 160, 120, 52, 84, (g) => {
    g.translate(52, 84)
    // The horns.
    for (const [x, turn] of [[-18, -0.35], [14, 0.1]] as const) {
      g.save()
      g.translate(x, -66)
      g.rotate(turn)
      g.beginPath()
      g.moveTo(-9, 8)
      g.lineTo(0, -16)
      g.lineTo(9, 8)
      g.closePath()
      inked(g, C.dragonSpike, 4)
      g.restore()
    }
    // The skull and the snout, as one shape that points at the field.
    g.beginPath()
    g.moveTo(-40, -6)
    g.bezierCurveTo(-56, -50, -20, -80, 22, -70)
    g.bezierCurveTo(50, -64, 60, -52, 76, -50)
    g.bezierCurveTo(102, -48, 104, -6, 78, -2)
    g.lineTo(-10, 2)
    g.bezierCurveTo(-28, 2, -36, 0, -40, -6)
    g.closePath()
    inked(g, C.dragon, 5)
    // The nostrils.
    g.fillStyle = INK
    oval(g, 82, -34, 4, 6, 0.4)
    g.fill()
    oval(g, 68, -38, 3.5, 5, 0.4)
    g.fill()
    // A brow over the eyes.
    g.beginPath()
    g.moveTo(-18, -62)
    g.quadraticCurveTo(14, -74, 46, -58)
    g.strokeStyle = C.dragonDark
    g.lineWidth = 6
    g.stroke()
    for (const eye of DRAGON.eyes) eyeWhite(g, eye.x, eye.y, eye.r)
    gloss(g, -22, -54, 10, 4, -0.6, 0.45)
  })
}

function dragonJaw(density: number): Sprite {
  return sprite(density, 96, 44, 10, 10, (g) => {
    g.translate(10, 10)
    g.beginPath()
    g.moveTo(-4, -6)
    g.lineTo(60, -6)
    g.bezierCurveTo(84, -4, 84, 18, 58, 20)
    g.bezierCurveTo(30, 24, 4, 20, -4, -6)
    g.closePath()
    inked(g, C.dragonDark, 4.5)
    // Two teeth.
    g.fillStyle = C.white
    for (const x of [38, 56]) {
      g.beginPath()
      g.moveTo(x - 5, -6)
      g.lineTo(x, -14)
      g.lineTo(x + 5, -6)
      g.closePath()
      g.fill()
      g.strokeStyle = INK
      g.lineWidth = 2.5
      g.stroke()
    }
  })
}

// --- The walrus --------------------------------------------------------------------

function walrusBody(density: number): Sprite {
  return sprite(density, 244, 306, 122, 300, (g) => {
    g.translate(122, 300)
    // Shoulders and head, one great soft shape.
    g.beginPath()
    g.moveTo(-112, 0)
    g.bezierCurveTo(-124, -80, -104, -130, -84, -150)
    g.bezierCurveTo(-104, -230, -60, -286, 0, -286)
    g.bezierCurveTo(60, -286, 104, -230, 84, -150)
    g.bezierCurveTo(104, -130, 124, -80, 112, 0)
    g.closePath()
    inked(g, C.walrus, 5)
    // One fold of the neck.
    g.strokeStyle = C.walrusDark
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(-74, -104)
    g.quadraticCurveTo(-8, -84, 66, -108)
    g.stroke()
    // The tusks, under the muzzle.
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 12, -138)
      g.lineTo(side * 30, -138)
      g.bezierCurveTo(side * 34, -110, side * 32, -96, side * 24, -92)
      g.bezierCurveTo(side * 16, -96, side * 12, -112, side * 12, -138)
      g.closePath()
      inked(g, C.tusk, 4)
    }
    // The muzzle: two pale pads with whisker dots, and a nose between them.
    for (const pad of WALRUS.muzzle) {
      oval(g, pad.x, pad.y, 42, 33)
      inked(g, C.walrusMuzzle, 4.5)
      g.fillStyle = C.walrusDark
      for (const [dx, dy] of [[-10, -6], [4, -10], [-2, 6], [12, 2], [-16, 8]] as const) {
        oval(g, pad.x + Math.sign(pad.x) * dx, pad.y + dy, 2.6, 2.6)
        g.fill()
      }
    }
    g.beginPath()
    g.moveTo(-16, -180)
    g.quadraticCurveTo(0, -190, 16, -180)
    g.quadraticCurveTo(0, -156, -16, -180)
    g.closePath()
    inked(g, INK, 3)
    // Heavy brows.
    g.strokeStyle = C.walrusDark
    g.lineWidth = 7
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 22, -230)
      g.quadraticCurveTo(side * 42, -244, side * 62, -228)
      g.stroke()
    }
    for (const eye of WALRUS.eyes) eyeWhite(g, eye.x, eye.y, eye.r)
    gloss(g, -46, -256, 20, 7, -0.5, 0.4)
  })
}

function walrusFlipper(density: number): Sprite {
  return sprite(density, 84, 52, 76, 26, (g) => {
    g.beginPath()
    g.moveTo(78, 12)
    g.bezierCurveTo(40, 0, 10, 6, 6, 26)
    g.bezierCurveTo(8, 46, 44, 50, 78, 40)
    g.closePath()
    inked(g, C.walrusDark, 4.5)
    g.strokeStyle = 'rgba(30,42,82,0.4)'
    g.lineWidth = 2.5
    g.beginPath()
    g.moveTo(10, 24)
    g.quadraticCurveTo(20, 30, 30, 25)
    g.stroke()
  })
}

/** The front of the tin tub, which hides the walrus from the chest down. Its top edge is the near half of the rim. */
function tubFront(density: number): Sprite {
  const w = TUB.rx * 2 + 16, top = 34
  return sprite(density, w, TUB.foot - TUB.rimY + top + 12, w / 2, top, (g) => {
    g.translate(w / 2, top)
    const foot = TUB.foot - TUB.rimY
    g.beginPath()
    g.moveTo(-TUB.rx, 0)
    g.ellipse(0, 0, TUB.rx, 26, 0, Math.PI, 0, true)
    g.lineTo(TUB.rx - 16, foot - 10)
    g.quadraticCurveTo(TUB.rx - 18, foot, TUB.rx - 30, foot)
    g.lineTo(-TUB.rx + 30, foot)
    g.quadraticCurveTo(-TUB.rx + 18, foot, -TUB.rx + 16, foot - 10)
    g.closePath()
    const tin = g.createLinearGradient(-TUB.rx, 0, TUB.rx, 0)
    tin.addColorStop(0, '#9fb0c8')
    tin.addColorStop(0.3, '#eef3f9')
    tin.addColorStop(0.7, '#c9d5e3')
    tin.addColorStop(1, '#8d9db5')
    g.fillStyle = tin
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 5
    g.stroke()
    // One hoop round the tin, a dent, and a rolled rim.
    g.strokeStyle = 'rgba(30,42,82,0.25)'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(-TUB.rx + 6, 58)
    g.quadraticCurveTo(0, 88, TUB.rx - 6, 58)
    g.stroke()
    oval(g, 52, 104, 13, 8, -0.3)
    g.fillStyle = 'rgba(30,42,82,0.12)'
    g.fill()
    g.beginPath()
    g.ellipse(0, 4, TUB.rx - 3, 25, 0, Math.PI * 0.96, Math.PI * 0.04, true)
    g.strokeStyle = C.white
    g.lineWidth = 3
    g.stroke()
    // A handle at each side: a solid lug of tin, with no rivet and no loop.
    for (const side of [-1, 1]) {
      rounded(g, side * (TUB.rx - 3) - 8, 32, 16, 34, 6)
      inked(g, C.tubDark, 4)
    }
  })
}

// --- The elephant --------------------------------------------------------------------

function elephantBody(density: number): Sprite {
  return sprite(density, 248, 280, 124, 276, (g) => {
    g.translate(124, 276)
    // A great round belly, seated.
    oval(g, 0, -126, 112, 122)
    inked(g, C.elephant, 5)
    oval(g, 0, -108, 70, 84)
    g.fillStyle = 'rgba(255,255,255,0.22)'
    g.fill()
    // The feet, soles out, with pale toenails.
    for (const side of [-1, 1]) {
      oval(g, side * 62, -26, 48, 28)
      inked(g, C.elephantDark, 5)
      g.fillStyle = C.tusk
      for (const dx of [-24, 0, 24]) {
        g.beginPath()
        g.ellipse(side * 62 + dx, -8, 9, 7, 0, Math.PI, 0)
        g.closePath()
        g.fill()
        g.strokeStyle = INK
        g.lineWidth = 2.5
        g.stroke()
      }
    }
    // The arms, resting on the belly.
    for (const side of [-1, 1]) {
      oval(g, side * 84, -150, 20, 44, side * -0.35)
      inked(g, C.elephantDark, 4.5)
    }
    gloss(g, -52, -196, 22, 9, -0.6, 0.4)
  })
}

function elephantHead(density: number): Sprite {
  return sprite(density, 150, 160, 75, 148, (g) => {
    g.translate(75, 148)
    oval(g, 0, -72, 62, 66)
    inked(g, C.elephant, 5)
    // A tuft of hair on top: one solid lock, swept to one side. It is a filled shape, and no stroke that curls.
    g.beginPath()
    HAIR.forEach(([x, y], index) => (index === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
    g.closePath()
    inked(g, C.elephantDark, 3)
    // Cheeks.
    for (const side of [-1, 1]) {
      oval(g, side * 42, -48, 11, 8)
      g.fillStyle = 'rgba(255,169,196,0.75)'
      g.fill()
    }
    for (const eye of ELEPHANT.eyes) eyeWhite(g, eye.x, eye.y, eye.r)
    gloss(g, -30, -116, 16, 6, -0.5, 0.45)
  })
}

/** The elephant's lock of hair, as the corners of one closed shape on the top of its head: wide at the root, swept over to a point. */
export const HAIR: readonly (readonly [number, number])[] = [[-9, -135], [-6, -146], [1, -153], [12, -156], [19, -151], [10, -149], [5, -143], [4, -136]]

/** The right ear, rooted at its left edge; the left ear is this one mirrored. */
function elephantEar(density: number): Sprite {
  return sprite(density, 84, 170, 6, 62, (g) => {
    g.beginPath()
    g.moveTo(6, 40)
    g.bezierCurveTo(30, -6, 80, 0, 78, 62)
    g.bezierCurveTo(80, 120, 50, 170, 22, 160)
    g.bezierCurveTo(8, 150, 4, 110, 6, 40)
    g.closePath()
    inked(g, C.elephant, 5)
    g.beginPath()
    g.moveTo(14, 48)
    g.bezierCurveTo(30, 20, 66, 22, 64, 66)
    g.bezierCurveTo(64, 112, 44, 144, 26, 140)
    g.bezierCurveTo(16, 132, 13, 100, 14, 48)
    g.closePath()
    g.fillStyle = C.earIn
    g.fill()
  })
}

export type ToySprites = {
  dragonBody: Sprite; dragonBare: Sprite; dragonHead: Sprite; dragonJaw: Sprite
  walrusBody: Sprite; walrusFlipper: Sprite; tubFront: Sprite
  elephantBody: Sprite; elephantHead: Sprite; elephantEar: Sprite
}

export function paintToys(density: number): ToySprites {
  return {
    dragonBody: dragonBody(density, true), dragonBare: dragonBody(density, false), dragonHead: dragonHead(density), dragonJaw: dragonJaw(density),
    walrusBody: walrusBody(density), walrusFlipper: walrusFlipper(density), tubFront: tubFront(density),
    elephantBody: elephantBody(density), elephantHead: elephantHead(density), elephantEar: elephantEar(density),
  }
}
