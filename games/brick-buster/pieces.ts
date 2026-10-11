import { BALL_R, BELL, BUMPER, BUMPER_SHAPE, FOLDED, LADYBIRD, SLOT, WALL } from './layout'
import { C, INK, gloss, inked, oval, rounded, sprite, type G, type Sprite } from './paint'

// The pieces that move, each cut once as a sprite at the density the surface
// asks for. The working pieces (the ball, the bumper, the bell) are the
// plainest things on the table: one colour each, an ink line and a gloss.
// Each kind of brick is its own material: clear plastic, a jelly on a plate,
// a block of ice, a wooden seed, a brick asleep under a quilt. Eyes are left
// out here: the view draws them, so that every face can watch the ball.

const PAD = 6
const W = WALL.brickW, H = WALL.brickH

/** A brick sprite, anchored at the middle of the brick's box. */
function brickSprite(density: number, draw: (g: G) => void): Sprite {
  return sprite(density, W + PAD * 2, H + PAD * 2, PAD + W / 2, PAD + H / 2, (g) => {
    g.translate(PAD, PAD)
    draw(g)
  })
}

/** A glass brick: a clear plastic insert, lit from below. The face behind it is drawn live. */
function paintGlass(density: number, cracked: boolean): Sprite {
  return brickSprite(density, (g) => {
    rounded(g, 0, 0, W, H, 10)
    const fill = g.createLinearGradient(0, 0, 0, H)
    fill.addColorStop(0, 'rgba(233,251,255,0.95)')
    fill.addColorStop(0.45, 'rgba(143,224,240,0.9)')
    fill.addColorStop(1, 'rgba(79,185,214,0.92)')
    g.fillStyle = fill
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3.5
    g.stroke()
    // The light from below: a paler pool along the foot.
    rounded(g, 6, H - 12, W - 12, 7, 4)
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.fill()
    gloss(g, 16, 9, 11, 3.5, -0.2, 0.8)
    gloss(g, W - 12, H - 9, 3, 2, 0, 0.6)
    if (!cracked) return
    // One jagged crack down the brick's right end, clear of the face, with a chip out of the corner.
    const line = () => {
      g.beginPath()
      g.moveTo(W - 15, 1)
      g.lineTo(W - 20, 11)
      g.lineTo(W - 10, 17)
      g.lineTo(W - 18, 27)
      g.lineTo(W - 9, 33)
      g.lineTo(W - 13, H - 1)
    }
    line()
    g.strokeStyle = INK
    g.lineWidth = 4
    g.stroke()
    line()
    g.strokeStyle = C.white
    g.lineWidth = 1.6
    g.stroke()
    g.beginPath()
    g.moveTo(W - 15, -1)
    g.lineTo(W + 2, -1)
    g.lineTo(W + 2, 9)
    g.closePath()
    g.fillStyle = C.wallBoard
    g.fill()
    g.beginPath()
    g.moveTo(W - 15, 1)
    g.lineTo(W - 1, 10)
    g.strokeStyle = INK
    g.lineWidth = 3
    g.stroke()
  })
}

/** Glass a hot ball has sagged: a soft slump with one long drip, all of it inside the brick's box. */
function paintSagged(density: number): Sprite {
  return brickSprite(density, (g) => {
    g.beginPath()
    g.moveTo(4, 8)
    g.bezierCurveTo(20, 2, W - 22, 3, W - 4, 9)
    g.bezierCurveTo(W + 1, 20, W - 10, 26, W - 22, 24)
    g.bezierCurveTo(W - 30, 23, W - 30, 30, W - 28, H - 8)
    g.bezierCurveTo(W - 28, H + 1, W - 42, H + 1, W - 42, H - 8)
    g.bezierCurveTo(W - 41, 30, W - 46, 25, W - 56, 27)
    g.bezierCurveTo(40, 30, 4, 30, 4, 8)
    g.closePath()
    const fill = g.createLinearGradient(0, 0, 0, H)
    fill.addColorStop(0, 'rgba(233,251,255,0.95)')
    fill.addColorStop(1, 'rgba(110,205,228,0.92)')
    g.fillStyle = fill
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3.5
    g.stroke()
    gloss(g, 18, 11, 10, 3, -0.1, 0.8)
    gloss(g, W - 35, H - 9, 3, 4, 0, 0.7)
  })
}

/** A jelly on its plate, anchored at the middle of its foot so that it can swell upwards and slump. */
function paintJelly(density: number): Sprite {
  return sprite(density, W + PAD * 2, H + PAD * 2, PAD + W / 2, PAD + H, (g) => {
    g.translate(PAD, PAD)
    // The plate.
    oval(g, W / 2, H - 5, W / 2 - 1, 6)
    inked(g, C.plate, 3)
    // The jelly: a dome with a fluted foot.
    g.beginPath()
    g.moveTo(7, H - 7)
    g.bezierCurveTo(5, 12, 20, 1, W / 2, 1)
    g.bezierCurveTo(W - 20, 1, W - 5, 12, W - 7, H - 7)
    g.quadraticCurveTo(W - 16, H - 1, W - 26, H - 7)
    g.quadraticCurveTo(W / 2 + 6, H - 1, W / 2 - 6, H - 7)
    g.quadraticCurveTo(22, H - 1, 7, H - 7)
    g.closePath()
    const fill = g.createLinearGradient(0, 0, 0, H)
    fill.addColorStop(0, C.jellyLight)
    fill.addColorStop(0.5, C.jelly)
    fill.addColorStop(1, C.jellyDark)
    g.fillStyle = fill
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3.5
    g.stroke()
    gloss(g, 22, 10, 9, 3.5, -0.5, 0.85)
    gloss(g, W - 16, 18, 2.5, 4, 0.3, 0.6)
  })
}

/** A block of ice: frosted, with one bevelled corner. */
function paintIce(density: number): Sprite {
  return brickSprite(density, (g) => {
    g.beginPath()
    g.moveTo(8, 0)
    g.lineTo(W - 2, 0)
    g.lineTo(W, 4)
    g.lineTo(W, H - 9)
    g.lineTo(W - 9, H)
    g.lineTo(3, H)
    g.lineTo(0, H - 4)
    g.lineTo(0, 8)
    g.closePath()
    const fill = g.createLinearGradient(0, 0, W, H)
    fill.addColorStop(0, C.frost)
    fill.addColorStop(0.5, C.ice)
    fill.addColorStop(1, C.iceDark)
    g.fillStyle = fill
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3.5
    g.stroke()
    // The frost: a pale bloom over the face, and a hard light on one edge.
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.beginPath()
    g.moveTo(6, 6)
    g.lineTo(34, 6)
    g.lineTo(12, 30)
    g.lineTo(6, 26)
    g.closePath()
    g.fill()
    g.beginPath()
    g.moveTo(W - 30, H - 5)
    g.lineTo(W - 6, H - 22)
    g.lineTo(W - 5, H - 12)
    g.lineTo(W - 12, H - 5)
    g.closePath()
    g.fill()
  })
}

/** The icicle a wet ball leaves on the ice: it hangs inside the brick's box, from under its top edge. */
function paintIcicle(density: number): Sprite {
  return sprite(density, 22, 34, 11, 2, (g) => {
    g.beginPath()
    g.moveTo(2, 2)
    g.lineTo(20, 2)
    g.quadraticCurveTo(15, 12, 12, 31)
    g.quadraticCurveTo(8, 14, 2, 2)
    g.closePath()
    inked(g, C.frost, 2.5)
    gloss(g, 9, 9, 1.6, 5, 0.1, 0.9)
  })
}

/** The pool an ice brick melts into: it lies flat where the brick stood, inside that brick's box. */
function paintPool(density: number): Sprite {
  return brickSprite(density, (g) => {
    g.beginPath()
    g.moveTo(8, 22)
    g.bezierCurveTo(2, 8, 26, 5, 38, 9)
    g.bezierCurveTo(52, 2, W - 4, 8, W - 6, 22)
    g.bezierCurveTo(W + 2, 34, W - 24, H - 2, W - 40, H - 5)
    g.bezierCurveTo(30, H + 1, 2, H - 4, 8, 22)
    g.closePath()
    g.fillStyle = C.pool
    g.fill()
    g.strokeStyle = C.poolDark
    g.lineWidth = 3
    g.stroke()
    gloss(g, 26, 16, 12, 3.5, -0.15, 0.75)
    gloss(g, W - 24, 28, 6, 2, -0.1, 0.55)
  })
}

/** A seed: a fat wooden nut with one seam and a cap. */
function paintSeed(density: number): Sprite {
  return brickSprite(density, (g) => {
    g.beginPath()
    g.moveTo(3, H / 2 + 2)
    g.bezierCurveTo(3, 6, 22, 5, W / 2, 5)
    g.bezierCurveTo(W - 22, 5, W - 3, 6, W - 3, H / 2 + 2)
    g.bezierCurveTo(W - 3, H - 1, W - 24, H - 1, W / 2, H - 1)
    g.bezierCurveTo(24, H - 1, 3, H - 1, 3, H / 2 + 2)
    g.closePath()
    const fill = g.createLinearGradient(0, 0, 0, H)
    fill.addColorStop(0, C.seedLight)
    fill.addColorStop(0.6, C.seed)
    fill.addColorStop(1, C.seedDark)
    g.fillStyle = fill
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 3.5
    g.stroke()
    // The seam, off to one side.
    g.beginPath()
    g.moveTo(W - 24, 8)
    g.quadraticCurveTo(W - 13, H / 2, W - 26, H - 4)
    g.strokeStyle = 'rgba(30,42,82,0.35)'
    g.lineWidth = 2.5
    g.stroke()
    // The cap it hung by.
    g.beginPath()
    g.moveTo(W / 2 - 15, 8)
    g.quadraticCurveTo(W / 2, -2, W / 2 + 15, 8)
    g.quadraticCurveTo(W / 2, 13, W / 2 - 15, 8)
    g.closePath()
    inked(g, C.seedDark, 2.5)
    gloss(g, 18, 14, 8, 3, -0.3, 0.5)
  })
}

/** A sleepy brick: a brick in bed, a quilt pulled up to its chin, on a pillow. Its shut eyes are drawn live. */
function paintSleepy(density: number): Sprite {
  return brickSprite(density, (g) => {
    rounded(g, 0, 0, W, H, 11)
    inked(g, C.sleepy, 3.5)
    // The pillow at its head.
    rounded(g, 4, 4, 30, H - 8, 9)
    inked(g, C.pillow, 2.5)
    // The quilt over the rest of it, in patches of two colours.
    g.save()
    rounded(g, 40, 2, W - 42, H - 4, 9)
    g.clip()
    g.fillStyle = C.sleepyDark
    g.fillRect(40, 0, W, H)
    g.fillStyle = 'rgba(255,255,255,0.28)'
    for (const [x, y, w, h] of [[40, 2, 13, 13], [61, 15, 11, 14], [44, 27, 15, 13], [70, 2, 8, 11]] as const) g.fillRect(x, y, w, h)
    g.restore()
    g.beginPath()
    g.moveTo(40, 3)
    g.quadraticCurveTo(46, H / 2, 40, H - 3)
    g.strokeStyle = INK
    g.lineWidth = 3
    g.stroke()
    gloss(g, 14, 9, 6, 2.5, -0.3, 0.7)
  })
}

/** The steel ball in one of its four kinds: plain chrome, wet and blue, hot and orange, heavy and dull. */
function paintBall(density: number, kind: 'plain' | 'wet' | 'hot' | 'heavy'): Sprite {
  const r = BALL_R
  const stops = {
    plain: ['#ffffff', '#d9e2ee', '#8f9db5', '#56627e'],
    wet: ['#ffffff', '#b7e6fb', C.wetBall, '#1f7fc4'],
    hot: ['#fff6c2', '#ffc94d', C.hotBall, '#d94a1a'],
    heavy: ['#a9b0be', '#7b8394', C.heavyBall, '#3b4252'],
  }[kind]
  return sprite(density, r * 2 + PAD * 2, r * 2 + PAD * 2, r + PAD, r + PAD, (g) => {
    g.translate(r + PAD, r + PAD)
    oval(g, 0, 0, r, r)
    const metal = g.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r)
    stops.forEach((colour, i) => metal.addColorStop([0, 0.35, 0.75, 1][i], colour))
    g.fillStyle = metal
    g.fill()
    g.save()
    g.clip()
    if (kind === 'plain') {
      // What it mirrors: a band of the board's warm colour low down, and the rail as a pale line.
      g.fillStyle = 'rgba(255,170,110,0.45)'
      g.fillRect(-r, r * 0.42, r * 2, r)
      g.fillStyle = 'rgba(255,255,255,0.55)'
      g.fillRect(-r, r * 0.3, r * 2, 2.2)
    } else if (kind === 'wet') {
      // Drops standing on it.
      g.fillStyle = 'rgba(255,255,255,0.75)'
      for (const [x, y, d] of [[6, 5, 3], [-3, 9, 2.2], [9, -6, 2]] as const) {
        oval(g, x, y, d, d * 1.25)
        g.fill()
      }
    } else if (kind === 'hot') {
      // A white-hot heart.
      oval(g, 2, 3, r * 0.45, r * 0.4)
      g.fillStyle = 'rgba(255,250,210,0.6)'
      g.fill()
    } else {
      // Dull: a flat shade low down and no mirror at all.
      g.fillStyle = 'rgba(20,24,36,0.3)'
      g.fillRect(-r, r * 0.2, r * 2, r)
    }
    g.restore()
    oval(g, 0, 0, r, r)
    g.strokeStyle = INK
    g.lineWidth = kind === 'heavy' ? 4 : 3
    g.stroke()
    if (kind !== 'heavy') gloss(g, -r * 0.38, -r * 0.42, r * 0.3, r * 0.18, -0.6, 0.95)
  })
}

function paintShadow(density: number): Sprite {
  const r = BALL_R + 6
  return sprite(density, r * 2, r * 2, r, r, (g) => {
    const soft = g.createRadialGradient(r, r, r * 0.3, r, r, r)
    soft.addColorStop(0, 'rgba(60,45,20,0.4)')
    soft.addColorStop(1, 'rgba(60,45,20,0)')
    g.fillStyle = soft
    g.fillRect(0, 0, r * 2, r * 2)
  })
}

/** The bumper's cap: a bar of red rubber. Plain: one colour, an ink line and a gloss. */
export const CAP = { w: BUMPER.half * 2, h: BUMPER_SHAPE.capH } as const
function paintCap(density: number): Sprite {
  return sprite(density, CAP.w + PAD * 2, CAP.h + PAD * 2, PAD + CAP.w / 2, PAD, (g) => {
    g.translate(PAD, PAD)
    rounded(g, 0, 0, CAP.w, CAP.h, BUMPER_SHAPE.capRound)
    inked(g, C.rubber, 4.5)
    rounded(g, 8, CAP.h - 13, CAP.w - 16, 8, 4)
    g.fillStyle = C.rubberDark
    g.fill()
    gloss(g, CAP.w / 2 - 6, 9, CAP.w * 0.36, 4, 0, 0.55)
  })
}

/** The bumper's foot: a chrome column that stands on the drum skin, with one band of light down it and two rivets. */
export const STEM = { w: BUMPER_SHAPE.stemHalf * 2, h: 62 } as const
function paintStem(density: number): Sprite {
  return sprite(density, STEM.w + PAD * 2, STEM.h + PAD * 2, PAD + STEM.w / 2, PAD + STEM.h, (g) => {
    g.translate(PAD, PAD)
    rounded(g, 0, 0, STEM.w, STEM.h, 8)
    const metal = g.createLinearGradient(0, 0, STEM.w, 0)
    metal.addColorStop(0, '#7f8ea8')
    metal.addColorStop(0.3, '#eef3f9')
    metal.addColorStop(0.6, '#b9c6d8')
    metal.addColorStop(1, '#6d7c97')
    g.fillStyle = metal
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 4.5
    g.stroke()
    g.fillStyle = 'rgba(30,42,82,0.4)'
    oval(g, 16, STEM.h - 14, 4, 4)
    g.fill()
    oval(g, STEM.w - 19, STEM.h - 22, 3, 3)
    g.fill()
  })
}

/** The bell: a chrome dome with a red rubber clapper, hung by its top. */
function paintBell(density: number): Sprite {
  const r = BELL.r
  return sprite(density, r * 2 + 20, r * 2 + 30, r + 10, 6, (g) => {
    g.translate(r + 10, 6)
    // The clapper shows under the lip.
    oval(g, 0, r * 2 + 6, 7, 7)
    inked(g, C.rubber, 3)
    g.beginPath()
    g.moveTo(-r * 0.5, r * 0.5)
    g.bezierCurveTo(-r * 0.5, -r * 0.5, r * 0.5, -r * 0.5, r * 0.5, r * 0.5)
    g.bezierCurveTo(r * 0.62, r * 1.3, r * 0.9, r * 1.55, r, r * 1.95)
    g.lineTo(-r, r * 1.95)
    g.bezierCurveTo(-r * 0.9, r * 1.55, -r * 0.62, r * 1.3, -r * 0.5, r * 0.5)
    g.closePath()
    const metal = g.createLinearGradient(-r, 0, r, 0)
    metal.addColorStop(0, '#8493ad')
    metal.addColorStop(0.35, '#f4f7fb')
    metal.addColorStop(1, '#7b8aa5')
    g.fillStyle = metal
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 4
    g.stroke()
    oval(g, 0, 0, 5, 5)
    inked(g, C.chrome, 3)
  })
}

/**
 * The folded wall: a concertina of plain board, its leaves fanned a little at the near end and held by a strap of
 * rubber band that slants across its far end. It shows no brick. It lies in the lower part of its box, with room over it
 * to lift its near corner.
 */
export const PACK = { h: 34 } as const
function paintFolded(density: number): Sprite {
  const w = FOLDED.w, h = PACK.h
  return sprite(density, w + PAD * 2, h + PAD * 2 + 10, PAD, PAD + 10 + h, (g) => {
    g.translate(PAD, PAD + 10)
    // Four leaves, each a little longer and more tilted than the one under it.
    for (let leaf = 0; leaf < 4; leaf++) {
      const rise = leaf * 2.2, lift = leaf * leaf * 0.9
      g.beginPath()
      g.moveTo(leaf * 2, h - 9 - rise)
      g.lineTo(w - 10 - leaf * 7, h - 9 - rise - lift)
      g.lineTo(w - 4 - leaf * 7, h - rise - lift)
      g.lineTo(leaf * 2 + 4, h - rise)
      g.closePath()
      inked(g, leaf % 2 ? C.wallBoardLine : C.wallBoard, 3)
    }
    // The rubber band: a strap that slants over the far end of the pack.
    g.beginPath()
    g.moveTo(42, h - 27)
    g.lineTo(58, h - 28)
    g.lineTo(46, h + 1)
    g.lineTo(30, h + 1)
    g.closePath()
    inked(g, C.rubber, 3)
    gloss(g, 47, h - 19, 2.5, 6, 0.4, 0.5)
  })
}

/** The ladybird, seen from above, facing right. */
function paintLadybird(density: number): Sprite {
  const r = LADYBIRD.r
  return sprite(density, r * 2 + 16, r * 2 + 8, r + 8, r + 4, (g) => {
    g.translate(r + 8, r + 4)
    g.strokeStyle = INK
    g.lineWidth = 2.5
    // Legs, splayed at angles of their own.
    for (const [x, lean] of [[-10, -6], [-1, 1], [9, 6]] as const) {
      g.beginPath()
      g.moveTo(x, -r * 0.7)
      g.lineTo(x + lean, -r * 0.7 - 6)
      g.moveTo(x, r * 0.7)
      g.lineTo(x + lean, r * 0.7 + 6)
      g.stroke()
    }
    oval(g, r * 0.72, 0, r * 0.38, r * 0.5)
    inked(g, INK, 2)
    oval(g, r * 0.86, -4, 2.2, 2.2)
    g.fillStyle = C.white
    g.fill()
    oval(g, r * 0.86, 4, 2.2, 2.2)
    g.fill()
    oval(g, -2, 0, r * 0.82, r * 0.74)
    inked(g, C.lady, 3)
    g.fillStyle = INK
    for (const [x, y, d] of [[-8, -8, 3.4], [4, -9, 3], [-9, 7, 3.8], [5, 10, 2.6], [-14, -1, 2.6]] as const) {
      oval(g, x, y, d, d)
      g.fill()
    }
    gloss(g, 2, -r * 0.42, r * 0.3, r * 0.1, 0, 0.6)
  })
}

/** A round soft light, stamped additively: under an insert, over a lamp, and as the glow of the idle ladder. */
function paintLight(density: number, r: number, colour: string): Sprite {
  return sprite(density, r * 2, r * 2, r, r, (g) => {
    const soft = g.createRadialGradient(r, r, 0, r, r, r)
    soft.addColorStop(0, colour)
    soft.addColorStop(1, 'rgba(0,0,0,0)')
    g.fillStyle = soft
    g.fillRect(0, 0, r * 2, r * 2)
  })
}

/** The ghost hand of the idle ladder: a pale mitt with one finger out, under a heavy dark line that reads on the pale board. */
function paintHand(density: number): Sprite {
  return sprite(density, 78, 104, 30, 10, (g) => {
    g.translate(4, 4)
    const mitt = () => {
      g.beginPath()
      g.moveTo(16, 40)
      g.lineTo(16, 16)
      g.bezierCurveTo(16, 2, 36, 2, 36, 16)
      g.lineTo(36, 40)
      g.bezierCurveTo(62, 36, 66, 56, 62, 70)
      g.bezierCurveTo(58, 92, 22, 94, 12, 78)
      g.bezierCurveTo(4, 66, 4, 52, 16, 40)
      g.closePath()
    }
    // A soft shade under the hand, then the hand itself.
    g.save()
    g.translate(3, 4)
    mitt()
    g.fillStyle = 'rgba(30,42,82,0.28)'
    g.fill()
    g.restore()
    mitt()
    g.strokeStyle = INK
    g.lineWidth = 8
    g.stroke()
    g.fillStyle = '#fff8e6'
    g.fill()
    // The thumb's fold.
    g.beginPath()
    g.moveTo(36, 42)
    g.quadraticCurveTo(34, 54, 24, 58)
    g.strokeStyle = 'rgba(30,42,82,0.5)'
    g.lineWidth = 3
    g.stroke()
  })
}

// --- What lies in the tray: flat pieces, painted at one size ---------------------------

function slotSprite(density: number, draw: (g: G) => void): Sprite {
  return sprite(density, SLOT.w + 4, SLOT.h + 4, SLOT.w / 2 + 2, SLOT.h / 2 + 2, (g) => {
    g.translate(2, 2)
    draw(g)
  })
}

/** The chips of one glass brick: rounded pieces of several sizes, lying flat. */
function paintChips(density: number): Sprite {
  return slotSprite(density, (g) => {
    const chips: readonly (readonly [number, number, number, number, number])[] = [[9, 15, 8, 6, 0.4], [21, 9, 9, 6, -0.3], [33, 16, 10, 7, 0.2], [44, 9, 6, 5, 0.7], [24, 19, 5, 4, 0]]
    chips.forEach(([x, y, rx, ry, turn], i) => {
      oval(g, x, y, rx, ry, turn)
      g.fillStyle = i % 2 ? C.glassLight : C.glass
      g.fill()
      g.strokeStyle = INK
      g.lineWidth = 2
      g.stroke()
    })
  })
}

/** A jelly that was shaken off its plate: a splat with three blobs thrown out of it. */
function paintSplat(density: number, colour: string, dark: string): Sprite {
  return slotSprite(density, (g) => {
    g.beginPath()
    g.moveTo(6, 13)
    g.bezierCurveTo(2, 4, 16, 2, 22, 6)
    g.bezierCurveTo(30, 0, 44, 3, 44, 10)
    g.bezierCurveTo(52, 12, 50, 21, 42, 20)
    g.bezierCurveTo(36, 25, 20, 24, 14, 20)
    g.bezierCurveTo(6, 22, 2, 18, 6, 13)
    g.closePath()
    g.fillStyle = colour
    g.fill()
    g.strokeStyle = dark
    g.lineWidth = 2.5
    g.stroke()
    gloss(g, 18, 9, 6, 2.2, -0.2, 0.8)
  })
}

/** The puffed white flower a popped seed turns into. Five petals, no two the same. */
function paintFlower(density: number): Sprite {
  return slotSprite(density, (g) => {
    const cx = SLOT.w / 2, cy = SLOT.h / 2
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 + 0.3, r = 7 + (i % 3)
      oval(g, cx + Math.cos(a) * 9, cy + Math.sin(a) * 5.5, r, r * 0.72, a)
      inked(g, C.petal, 2)
    }
    oval(g, cx, cy, 5, 4)
    inked(g, C.fruit, 2)
  })
}

/** The fat sprout that comes up where a seed was driven in: two leaves on a short stalk, anchored at its foot. */
function paintSprout(density: number): Sprite {
  return sprite(density, SLOT.w + 4, SLOT.h + 4, SLOT.w / 2 + 2, SLOT.h + 1, (g) => {
    g.translate(2, 2)
    const cx = SLOT.w / 2
    g.beginPath()
    g.moveTo(cx, SLOT.h - 1)
    g.quadraticCurveTo(cx - 3, 14, cx, 9)
    g.strokeStyle = INK
    g.lineWidth = 7
    g.stroke()
    g.strokeStyle = C.vine
    g.lineWidth = 4
    g.stroke()
    for (const [side, len] of [[-1, 15], [1, 12]] as const) {
      oval(g, cx + side * len * 0.62, 9 - (side > 0 ? 2 : 0), len * 0.62, 5.5, side * -0.35)
      inked(g, C.vine, 2.2)
    }
  })
}

/** A sleepy brick lying in the tray: small, under its quilt. */
function paintSleeper(density: number): Sprite {
  return slotSprite(density, (g) => {
    rounded(g, 3, 3, SLOT.w - 6, SLOT.h - 6, 7)
    inked(g, C.sleepy, 2.5)
    rounded(g, 5, 5, 17, SLOT.h - 10, 5)
    inked(g, C.pillow, 2)
    rounded(g, 26, 4, SLOT.w - 30, SLOT.h - 8, 5)
    g.fillStyle = C.sleepyDark
    g.fill()
  })
}

export type Pieces = {
  glass: Sprite; glassCracked: Sprite; glassSagged: Sprite; jelly: Sprite; ice: Sprite; icicle: Sprite; pool: Sprite; seed: Sprite; sleepy: Sprite
  balls: Record<'plain' | 'wet' | 'hot' | 'heavy', Sprite>
  chips: Sprite; splat: Sprite; syrup: Sprite; flower: Sprite; sprout: Sprite; sleeper: Sprite
  shadow: Sprite; cap: Sprite; stem: Sprite; bell: Sprite; folded: Sprite; ladybird: Sprite
  lampLight: Sprite; insertLight: Sprite; hotLight: Sprite; glow: Sprite; hand: Sprite
}

export function paintPieces(density: number): Pieces {
  return {
    glass: paintGlass(density, false),
    glassCracked: paintGlass(density, true),
    glassSagged: paintSagged(density),
    jelly: paintJelly(density),
    ice: paintIce(density),
    icicle: paintIcicle(density),
    pool: paintPool(density),
    seed: paintSeed(density),
    sleepy: paintSleepy(density),
    balls: { plain: paintBall(density, 'plain'), wet: paintBall(density, 'wet'), hot: paintBall(density, 'hot'), heavy: paintBall(density, 'heavy') },
    chips: paintChips(density),
    splat: paintSplat(density, C.jelly, C.jellyDark),
    syrup: paintSplat(density, C.syrup, C.jellyDark),
    flower: paintFlower(density),
    sprout: paintSprout(density),
    sleeper: paintSleeper(density),
    shadow: paintShadow(density),
    cap: paintCap(density),
    stem: paintStem(density),
    bell: paintBell(density),
    folded: paintFolded(density),
    ladybird: paintLadybird(density),
    lampLight: paintLight(density, 30, 'rgba(255,224,102,0.9)'),
    insertLight: paintLight(density, 70, 'rgba(190,245,255,0.75)'),
    hotLight: paintLight(density, 44, 'rgba(255,150,60,0.7)'),
    glow: paintLight(density, 120, 'rgba(255,255,255,0.8)'),
    hand: paintHand(density),
  }
}

export type { G }
