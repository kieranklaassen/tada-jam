import type { Face } from './body'
import { BLOB, CAST, DIAL, PIECE, RELEASE, SPRING, WALL } from './layout'
import type { Kind } from './pieces'
import { PAINT, bake, rounded, type Can, type Canvases, type Pen, type Sprite } from './stencil'
import { BRICK } from './wall'

// Every figure that moves, painted once into a sprite: the blob in its four
// faces, the spring, the six pieces, the two controls, the cast in their
// parts, and the paint a touch leaves. Each is a stencil of two or three flat
// colours over a white undercoat that was held a little off, so a pale edge
// shows at one side.
//
// The working things are the plainest and the cast holds the look.
//
// Nothing here forms a letter, a numeral or a sign. A spring is one wire in
// uneven turns with round elbows, no two strokes of anything are level and
// equal, no row of marks is even, and no eye is shut as a level bar.

const UNDER: readonly [number, number] = [2.5, 3]

/** A figure that stays where it was sprayed takes the wall's courses: the stage height its sprite is placed at. */
const courses = (y: number) => ({ top: y, pitch: BRICK.h })

/**
 * The blob's face, in the blob's own frame: +x is the way it runs and -y is up. Its two eyes are of two sizes, the
 * bigger one in front. `pupils` says whether the view puts pupils in them, which look where the blob is going.
 */
export const FACES: Record<Face, { eyes: readonly { x: number; y: number; r: number }[]; pupils: boolean }> = {
  run: { eyes: [{ x: 22, y: -14, r: 15 }, { x: -10, y: -11, r: 11 }], pupils: true },
  crouch: { eyes: [{ x: 22, y: -8, r: 15 }, { x: -10, y: -6, r: 11 }], pupils: false },
  air: { eyes: [{ x: 21, y: -16, r: 18 }, { x: -13, y: -13, r: 13 }], pupils: true },
  flat: { eyes: [{ x: 16, y: -24, r: 17 }, { x: -6, y: 6, r: 12 }], pupils: true },
}

function blob(make: Canvases, density: number, colour: string, face: Face): Sprite {
  const half = BLOB.size / 2, eyes = FACES[face].eyes
  return bake(make, density, BLOB.size + 28, BLOB.size + 28, half + 14, half + 14, 11, (can) => {
    can.layer(PAINT.white, (pen) => rounded(pen, -half, -half, BLOB.size, BLOB.size, 22), 0, [-2.5, -3])
    can.layer(colour, (pen) => rounded(pen, -half, -half, BLOB.size, BLOB.size, 22), 6)
    can.grain(-half, -half, BLOB.size, BLOB.size)
    if (face === 'crouch') {
      // Eyes screwed shut: two arcs of two sizes, and a mouth held tight.
      can.line(PAINT.white, 5, (pen) => {
        for (const eye of eyes) {
          pen.moveTo(eye.x - eye.r * 0.8, eye.y + 3)
          pen.quadraticCurveTo(eye.x, eye.y - eye.r * 0.8, eye.x + eye.r * 0.8, eye.y + 5)
        }
      }, 0)
      can.line(PAINT.black, 4.5, (pen) => {
        pen.moveTo(-12, 22)
        pen.bezierCurveTo(-2, 14, 6, 30, 16, 20)
        pen.quadraticCurveTo(24, 14, 30, 20)
      }, 0)
      return
    }
    can.layer(PAINT.white, (pen) => {
      for (const eye of eyes) {
        pen.moveTo(eye.x + eye.r, eye.y)
        pen.arc(eye.x, eye.y, eye.r, 0, Math.PI * 2)
      }
    }, 0)
    if (face === 'run') {
      // A lopsided grin with one tooth.
      can.layer(PAINT.black, (pen) => {
        pen.moveTo(-14, 16)
        pen.quadraticCurveTo(10, 22, 36, 10)
        pen.quadraticCurveTo(26, 40, -2, 34)
        pen.quadraticCurveTo(-12, 30, -14, 16)
        pen.closePath()
      }, 0)
      can.layer(PAINT.white, (pen) => rounded(pen, 12, 16, 11, 10, 3), 0)
    } else if (face === 'air') {
      // Mouth wide open, tongue and all.
      can.layer(PAINT.black, (pen) => pen.ellipse(8, 24, 17, 14, -0.15, 0, Math.PI * 2), 0)
      can.layer(PAINT.deep, (pen) => pen.ellipse(4, 31, 10, 6, -0.1, 0, Math.PI * 2), 0)
    } else {
      // Flat: a wobbly line of a mouth, and its tongue out at one end.
      can.line(PAINT.black, 4.5, (pen) => {
        pen.moveTo(-20, 26)
        pen.bezierCurveTo(-8, 18, -2, 36, 10, 28)
        pen.quadraticCurveTo(18, 22, 26, 30)
      }, 0)
      can.layer(PAINT.deep, (pen) => rounded(pen, 20, 28, 12, 15, 6), 0)
    }
  })
}

/** A spring: one coiled wire seen from the side, in uneven turns, with a flat turn for a foot and a curl at the top. */
function spring(make: Canvases, density: number, colour: string): Sprite {
  // Drawn as a coil 30 wide and 28 tall, and painted at the size the layout gives a spring.
  const k = SPRING.width / 30, w = 30, h = 28
  return scaled(k, bake(make, density * k, w + 20, h + 18, w / 2 + 10, h + 9, 12, (can) => {
    const coil = (pen: Pen) => {
      const turns: [number, number][] = [[-13, -2.5], [11, -3.5], [-11, -9.5], [12, -13.5], [-9, -19.5], [10, -23.5], [-2, -27.5]]
      pen.moveTo(turns[0][0], turns[0][1])
      // Round elbows: each turn is taken as a curve through the corner.
      for (let i = 1; i < turns.length - 1; i++) {
        const [x, y] = turns[i], [nx, ny] = turns[i + 1]
        pen.quadraticCurveTo(x, y, (x + nx) / 2, (y + ny) / 2)
      }
      pen.lineTo(turns[turns.length - 1][0], turns[turns.length - 1][1])
    }
    can.line(PAINT.white, 8, coil, 0)
    can.line(colour, 4.6, coil, 2.5)
  }))
}

/** A sprite painted `k` times the size it was drawn at. */
function scaled(k: number, sprite: Sprite): Sprite {
  return { image: sprite.image, w: sprite.w * k, h: sprite.h * k, ox: sprite.ox * k, oy: sprite.oy * k }
}

// --- The six pieces. Each stands on the line: its foot is at the origin, -y is up and +x the way the blob runs. ------

/** The pieces are drawn 42 wide in the numbers below, and painted at the size the layout gives a piece. */
const DRAWN = 42 / PIECE.width
const HALF_PIECE = (PIECE.width * DRAWN) / 2, WIDE = PIECE.width * DRAWN
/** The wall as drawn: its upright stands where the layout says, whatever the size of the rest. */
const UPRIGHT = { ahead: WALL.ahead * DRAWN, thick: WALL.thick * DRAWN, height: WALL.height * DRAWN }

const PIECES: Record<Kind, (can: Can) => void> = {
  // A drum pad: a gold skin on a dark shell, on two splayed feet.
  drum: (can) => {
    const feet = (pen: Pen) => {
      pen.moveTo(-13, -6)
      pen.lineTo(-18, -1)
      pen.moveTo(12, -6)
      pen.lineTo(19, -1)
    }
    can.line(PAINT.black, 5, feet, 2)
    can.layer(PAINT.white, (pen) => rounded(pen, -HALF_PIECE, -24, WIDE, 20, 6), 4, UNDER)
    can.layer(PAINT.black, (pen) => rounded(pen, -HALF_PIECE + 1, -23, WIDE - 2, 18, 6), 4)
    can.layer(PAINT.gold, (pen) => pen.ellipse(0, -23, HALF_PIECE - 1, 5.5, 0, 0, Math.PI * 2), 0)
    can.grain(-HALF_PIECE, -28, WIDE, 24)
  },
  // A chime step: a stair of two treads with a bright bar let into the top one.
  chime: (can) => {
    const stair = (pen: Pen) => {
      pen.moveTo(-HALF_PIECE, 0)
      pen.lineTo(-HALF_PIECE, -12)
      pen.lineTo(-3, -12)
      pen.lineTo(-3, -22)
      pen.lineTo(HALF_PIECE, -22)
      pen.lineTo(HALF_PIECE, 0)
      pen.closePath()
    }
    can.layer(PAINT.white, stair, 4, UNDER)
    can.layer(PAINT.black, stair, 4)
    can.layer(PAINT.white, (pen) => rounded(pen, -6, -29, 28, 9, 4), 0, [1, 1])
    can.layer(PAINT.teal, (pen) => rounded(pen, -6, -28, 27, 7, 3.5), 2)
    can.grain(-HALF_PIECE, -22, WIDE, 22)
  },
  // A flip: a ramp, low where the blob runs onto it and sweeping up to its far end. Its inside is one shallow
  // curve from tip to top, so it is a solid wedge at every turn and never a thin foot with a thin upright.
  flip: (can) => {
    const scoop = (pen: Pen) => {
      pen.moveTo(-HALF_PIECE, 0)
      pen.lineTo(HALF_PIECE - 3, 0)
      pen.lineTo(HALF_PIECE, -28)
      pen.lineTo(HALF_PIECE - 5, -29)
      pen.quadraticCurveTo(HALF_PIECE - 25, -13, -HALF_PIECE, -4)
      pen.closePath()
    }
    can.layer(PAINT.white, scoop, 4, UNDER)
    can.layer(PAINT.gold, scoop, 4)
    can.line(PAINT.black, 3, (pen) => {
      pen.moveTo(-HALF_PIECE + 2, -1)
      pen.lineTo(HALF_PIECE - 4, -1)
    }, 0)
    can.grain(-HALF_PIECE, -28, WIDE, 28)
  },
  // A splitter: a curved blade on a block.
  splitter: (can) => {
    const blade = (pen: Pen) => {
      pen.moveTo(-9, -5)
      pen.quadraticCurveTo(-8, -20, 5, -28)
      pen.quadraticCurveTo(9, -16, 13, -5)
      pen.closePath()
    }
    can.layer(PAINT.white, (pen) => rounded(pen, -16, -7, 32, 7, 3), 3, UNDER)
    can.layer(PAINT.black, (pen) => rounded(pen, -15, -6, 30, 6, 3), 3)
    can.layer(PAINT.black, blade, 3, [1.5, 0])
    can.layer(PAINT.white, blade, 0)
    can.line(PAINT.teal, 2.6, (pen) => {
      pen.moveTo(-7, -7)
      pen.quadraticCurveTo(-6, -19, 4, -26)
    }, 0)
  },
  // A tunnel mouth: the end of a pipe lying on the line, seen a little from the front. One grey shape, the barrel
  // running back from a rim that bulges towards the blob, and the dark of its inside set back in it, so the lip is
  // thick on the near side and nothing on the far one. No ring stands inside another.
  tunnel: (can) => {
    const barrel = (pen: Pen) => {
      pen.moveTo(-8, -27)
      pen.lineTo(17, -25)
      pen.quadraticCurveTo(21, -24, 21, -20)
      pen.lineTo(21, -4)
      pen.quadraticCurveTo(21, 0, 17, 0)
      pen.lineTo(-10, 0)
      pen.bezierCurveTo(-21, -2, -20, -26, -8, -27)
      pen.closePath()
    }
    can.layer(PAINT.white, barrel, 4, UNDER)
    can.layer(PAINT.grey, barrel, 4)
    can.layer(PAINT.black, (pen) => pen.ellipse(-5.5, -13.5, 6.5, 11, -0.08, 0, Math.PI * 2), 0)
    // Where the next length of pipe joins on.
    can.cut(1.6, (pen) => {
      pen.moveTo(12, -25)
      pen.quadraticCurveTo(15.5, -13, 12.5, -1)
    })
    can.grain(-18, -27, 39, 27)
  },
  // A wall: a stub of brickwork ahead of the beat, its face to the blob that runs at it, stepped down behind as a
  // wall that has lost its bricks is, with what came off it lying on the beat as grit. The stub has no foot: joined
  // to one, or beside two flat lumps, it made the shape of a letter.
  wall: (can) => {
    const x = UPRIGHT.ahead - UPRIGHT.thick / 2, top = -UPRIGHT.height
    const stub = (pen: Pen) => {
      pen.moveTo(x, 0)
      pen.lineTo(x, top + 4)
      pen.lineTo(x + 2.5, top)
      pen.lineTo(x + UPRIGHT.thick, top + 2)
      // Behind the face it steps down, a brick at a time.
      pen.lineTo(x + UPRIGHT.thick, top + 13)
      pen.lineTo(x + UPRIGHT.thick + 4, top + 13)
      pen.lineTo(x + UPRIGHT.thick + 4, top + 25)
      pen.lineTo(x + UPRIGHT.thick + 8, top + 25)
      pen.lineTo(x + UPRIGHT.thick + 8, 0)
      pen.closePath()
    }
    // What came off it lies on the beat as grit and one shard: a scatter, not a bar. Two flat lumps there made a
    // foot for the stub, and an upright with a foot is a letter one way up and a numeral the other.
    const shard = (pen: Pen) => {
      pen.moveTo(-7, -0.5)
      pen.lineTo(-5.5, -4)
      pen.lineTo(-2.5, -2.5)
      pen.lineTo(-3, -0.5)
      pen.closePath()
    }
    can.layer(PAINT.white, stub, 4, UNDER)
    can.layer(PAINT.black, stub, 4)
    can.specks(PAINT.black, -8, -2.5, 5, 12)
    can.specks(PAINT.black, 3, -2, 4.5, 10)
    can.specks(PAINT.black, 10, -2.5, 3, 6)
    can.layer(PAINT.black, shard, 1)
    // The courses of the brickwork, where the stencil's bridges left the undercoat showing.
    can.cut(1.4, (pen) => {
      pen.moveTo(x, top + 13)
      pen.lineTo(x + UPRIGHT.thick + 4, top + 13)
      pen.moveTo(x, top + 25)
      pen.lineTo(x + UPRIGHT.thick + 8, top + 25)
    })
  },
}

/** How much room a piece's sprite has round its foot: to the back, to the front, upward and below. */
export const PIECE_BOX = { back: 38, front: 68, up: 64, down: 10 } as const

function pieceSprite(make: Canvases, density: number, kind: Kind, seed: number): Sprite {
  const box = { back: PIECE_BOX.back * DRAWN, front: PIECE_BOX.front * DRAWN, up: PIECE_BOX.up * DRAWN, down: PIECE_BOX.down * DRAWN }
  return scaled(1 / DRAWN, bake(make, density / DRAWN, box.back + box.front, box.up + box.down, box.back, box.up, seed, PIECES[kind]))
}

/** A soft round of one colour: the flash of a mark, the glow of the guidance. */
function soft(make: Canvases, density: number, size: number, colour: string, core: number): Sprite {
  return bake(make, density, size, size, size / 2, size / 2, 13, (can) => {
    const pen = can.pen
    const fill = pen.createRadialGradient(0, 0, 0, 0, 0, size / 2)
    fill.addColorStop(0, colour)
    fill.addColorStop(core, colour)
    fill.addColorStop(1, 'rgba(255, 255, 255, 0)')
    pen.fillStyle = fill
    pen.fillRect(-size / 2, -size / 2, size, size)
  })
}

/** What a tap leaves on the wall: a burst from the can, with its specks and one short run. */
function burst(make: Canvases, density: number, colour: string, seed: number): Sprite {
  return bake(make, density, 96, 110, 48, 48, seed, (can) => {
    const pen = can.pen
    const fill = pen.createRadialGradient(0, 0, 4, 0, 0, 30)
    fill.addColorStop(0, colour)
    fill.addColorStop(0.5, colour)
    fill.addColorStop(1, 'rgba(255, 255, 255, 0)')
    pen.fillStyle = fill
    pen.globalAlpha = 0.9
    pen.beginPath()
    pen.arc(0, 0, 30, 0, Math.PI * 2)
    pen.fill()
    pen.globalAlpha = 1
    can.specks(colour, 0, 0, 44, 60)
    can.drip(colour, 5, 12, 26, 2.4)
    can.grain(-30, -30, 60, 60)
  })
}

/** The dust a landing knocks off the wall: three puffs of three sizes. */
function dust(make: Canvases, density: number): Sprite {
  return bake(make, density, 110, 50, 55, 36, 14, (can) => {
    const pen = can.pen
    for (const [x, y, r] of [[-34, -6, 13], [30, -9, 10], [44, -2, 6]] as const) {
      const fill = pen.createRadialGradient(x, y, 1, x, y, r)
      fill.addColorStop(0, 'rgba(241, 235, 221, 0.95)')
      fill.addColorStop(0.6, 'rgba(241, 235, 221, 0.7)')
      fill.addColorStop(1, 'rgba(241, 235, 221, 0)')
      pen.fillStyle = fill
      pen.fillRect(x - r, y - r, r * 2, r * 2)
    }
    can.specks(PAINT.white, -36, -8, 16, 12)
    can.specks(PAINT.white, 34, -8, 14, 9)
  })
}

/** Flecks of paint spat sideways off a drum pad. */
function flecks(make: Canvases, density: number): Sprite {
  return bake(make, density, 110, 60, 55, 44, 19, (can) => {
    can.specks(PAINT.gold, -30, -10, 22, 26)
    can.specks(PAINT.gold, 30, -12, 22, 22)
    can.specks(PAINT.white, 0, -20, 30, 12)
  })
}

/** One of the pigeon's feathers, loose. */
function feather(make: Canvases, density: number): Sprite {
  return bake(make, density, 60, 30, 30, 15, 20, (can) => {
    const vane = (pen: Pen) => {
      pen.moveTo(-22, 2)
      pen.quadraticCurveTo(-2, -12, 22, -2)
      pen.quadraticCurveTo(2, 10, -22, 2)
      pen.closePath()
    }
    can.layer(PAINT.white, vane, 2, [1, 1.5])
    can.layer(PAINT.grey, vane, 2)
    can.cut(1.6, (pen) => {
      pen.moveTo(-18, 2)
      pen.quadraticCurveTo(0, -3, 20, -2)
    })
  })
}

/** The smear a piece leaves as it slides down the wall. */
function smear(make: Canvases, density: number): Sprite {
  return bake(make, density, 50, 90, 25, 12, 26, (can) => {
    const pen = can.pen
    const fill = pen.createLinearGradient(0, 0, 0, 70)
    fill.addColorStop(0, 'rgba(241, 235, 221, 0.75)')
    fill.addColorStop(1, 'rgba(241, 235, 221, 0)')
    pen.fillStyle = fill
    pen.beginPath()
    pen.moveTo(-15, 0)
    pen.quadraticCurveTo(-11, 40, -5, 66)
    pen.lineTo(9, 72)
    pen.quadraticCurveTo(14, 36, 16, 0)
    pen.closePath()
    pen.fill()
    can.grain(-16, 0, 32, 72)
  })
}

/** The ghost hand: a fist with one finger out, white with a dark edge. Placed by its fingertip. */
function hand(make: Canvases, density: number): Sprite {
  return bake(make, density, 96, 120, 34, 12, 15, (can) => {
    const shape = (pen: Pen) => {
      rounded(pen, -10, 0, 20, 58, 10)
      rounded(pen, -14, 40, 52, 52, 16)
      pen.moveTo(-6, 64)
      pen.ellipse(-16, 64, 9, 17, 0.5, 0, Math.PI * 2)
    }
    const pen = can.pen
    pen.save()
    pen.strokeStyle = PAINT.black
    pen.lineWidth = 7
    pen.lineJoin = 'round'
    pen.shadowColor = PAINT.black
    pen.shadowBlur = 4 * can.density
    pen.beginPath()
    shape(pen)
    pen.stroke()
    pen.restore()
    can.layer(PAINT.white, shape, 0)
    // The knuckles of the folded fingers: three creases, none like another.
    can.cut(2.4, (p) => {
      p.moveTo(13, 44)
      p.quadraticCurveTo(15, 54, 12, 66)
      p.moveTo(23, 50)
      p.quadraticCurveTo(26, 56, 24, 62)
      p.moveTo(32, 47)
      p.quadraticCurveTo(33, 52, 31, 56)
    })
  })
}

/** The grip of the release: a weight on the end of the cord, like the pull of a lamp. Placed by its middle. */
function grip(make: Canvases, density: number): Sprite {
  const r = RELEASE.r
  return bake(make, density, r * 2 + 30, r * 2 + 34, r + 15, r + 15, 16, (can) => {
    const weight = (pen: Pen) => {
      pen.moveTo(-8, -r + 6)
      pen.lineTo(8, -r + 6)
      pen.bezierCurveTo(12, -8, r - 2, 0, r - 2, r - 12)
      pen.quadraticCurveTo(r - 2, r, r - 14, r)
      pen.lineTo(-r + 14, r)
      pen.quadraticCurveTo(-r + 2, r, -r + 2, r - 12)
      pen.bezierCurveTo(-r + 2, 0, -12, -8, -8, -r + 6)
      pen.closePath()
    }
    can.layer(PAINT.white, weight, 5, UNDER)
    can.layer(PAINT.hot, weight, 5)
    // A collar where the cord goes in, and the shine down one side.
    can.layer(PAINT.black, (pen) => rounded(pen, -10, -r, 20, 10, 4), 0)
    can.line(PAINT.white, 4, (pen) => {
      pen.moveTo(-r + 12, 2)
      pen.quadraticCurveTo(-r + 9, r - 14, -r + 17, r - 8)
    }, 0)
    can.grain(-r, -r, r * 2, r * 2)
    can.drip(PAINT.hot, 9, r - 1, 9, 2.2)
  })
}

/** The dial's knob, with its pointer straight up. Placed by its middle and turned. */
function knob(make: Canvases, density: number): Sprite {
  const r = DIAL.r
  return bake(make, density, r * 2 + 30, r * 2 + 30, r + 15, r + 15, 17, (can) => {
    can.layer(PAINT.white, (pen) => pen.arc(0, 0, r - 2, 0, Math.PI * 2), 4, UNDER)
    can.layer(PAINT.gold, (pen) => pen.arc(0, 0, r - 4, 0, Math.PI * 2), 5)
    // Two dents worn by fingers, of two sizes, a dark cap, and the pointer.
    can.layer('rgba(28, 26, 31, 0.3)', (pen) => {
      pen.ellipse(-r + 16, 20, 7, 12, 0.5, 0, Math.PI * 2)
      pen.moveTo(r - 8, 34)
      pen.ellipse(r - 17, 30, 9, 6, -0.6, 0, Math.PI * 2)
    }, 0)
    can.layer(PAINT.black, (pen) => pen.arc(0, 0, r - 24, 0, Math.PI * 2), 0)
    can.layer(PAINT.white, (pen) => {
      pen.moveTo(0, -r + 5)
      pen.lineTo(9, -r + 30)
      pen.lineTo(-9, -r + 30)
      pen.closePath()
    }, 0)
    can.layer(PAINT.gold, (pen) => pen.arc(0, 0, 9, 0, Math.PI * 2), 0)
    can.grain(-r, -r, r * 2, r * 2)
  })
}

/** The camera on its joint, pointing right. Placed by the joint and turned. */
function camera(make: Canvases, density: number): Sprite {
  return bake(make, density, 170, 96, 28, 48, 18, (can) => {
    const box = (pen: Pen) => {
      rounded(pen, -12, -24, 104, 48, 9)
      pen.moveTo(90, -17)
      pen.lineTo(122, -27)
      pen.lineTo(122, 27)
      pen.lineTo(90, 17)
      pen.closePath()
      // A rain hood over the top.
      rounded(pen, -18, -33, 122, 12, 5)
    }
    can.layer(PAINT.white, box, 5, UNDER)
    can.layer(PAINT.black, box, 5)
    // The seam under the hood, and a dent in the box.
    can.cut(2.6, (pen) => {
      pen.moveTo(-18, -21.5)
      pen.lineTo(104, -21.5)
    })
    can.cut(2, (pen) => {
      pen.moveTo(8, 20)
      pen.quadraticCurveTo(22, 4, 44, 8)
    })
    // The lens: one oval of glass, with a glint to one side of it. Never an oval inside an oval.
    can.layer(PAINT.teal, (pen) => pen.ellipse(112, 0, 6, 15, 0, 0, Math.PI * 2), 0)
    can.layer(PAINT.white, (pen) => pen.ellipse(110.5, -7.5, 1.5, 3.6, 0.2, 0, Math.PI * 2), 0)
    can.grain(-12, -30, 134, 56)
  })
}

// --- The pigeon -----------------------------------------------------------------

/** Where the pigeon's parts join, from the point it is placed by. */
export const PIGEON = { neck: { x: 38, y: -34 }, shoulder: { x: 20, y: -18 }, eyes: [{ x: 21, y: -47, r: 10 }, { x: 40, y: -55, r: 7.5 }], beak: { x: 45, y: -41 }, belly: { x: -6, y: 26 }, feet: [{ x: -15, y: 99 }, { x: 26, y: 99 }] } as const

function pigeonBody(make: Canvases, density: number): Sprite {
  const place = CAST.pigeon
  return bake(make, density, 260, 190, 140, 78, 21, (can) => {
    const body = (pen: Pen) => {
      pen.moveTo(-122, 50)
      pen.bezierCurveTo(-84, -4, -42, -50, 14, -50)
      pen.bezierCurveTo(64, -50, 94, -8, 82, 32)
      pen.bezierCurveTo(72, 68, 26, 84, -18, 78)
      pen.bezierCurveTo(-52, 74, -70, 60, -92, 64)
      pen.bezierCurveTo(-102, 66, -116, 60, -122, 50)
      pen.closePath()
    }
    const legs = (pen: Pen) => {
      // Each foot is three splayed toes, and no two legs are alike.
      for (const [x, lean] of [[-12, -3], [22, 4]] as const) {
        pen.moveTo(x, 72)
        pen.lineTo(x + lean, 96)
        pen.lineTo(x + lean + 17, 102)
        pen.moveTo(x + lean, 96)
        pen.lineTo(x + lean + 9, 91)
        pen.moveTo(x + lean, 96)
        pen.lineTo(x + lean - 10, 103)
      }
    }
    can.line(PAINT.white, 9, legs, 0)
    can.line(PAINT.hot, 5.5, legs, 2)
    can.layer(PAINT.white, body, 6, UNDER)
    can.layer(PAINT.black, body, 6)
    // The tail's feathers, as three slits.
    can.cut(2.6, (pen) => {
      pen.moveTo(-124, 52)
      pen.lineTo(-70, 30)
      pen.moveTo(-112, 63)
      pen.lineTo(-84, 56)
    })
    // A pale belly, sprayed through a second stencil.
    can.layer(PAINT.white, (pen) => {
      pen.moveTo(40, 64)
      pen.bezierCurveTo(66, 50, 78, 22, 70, -2)
      pen.bezierCurveTo(66, 30, 44, 52, 8, 70)
      pen.closePath()
    }, 0)
    can.grain(-124, -52, 212, 136, courses(place.y))
  })
}

function pigeonWing(make: Canvases, density: number): Sprite {
  return bake(make, density, 170, 110, 140, 30, 22, (can) => {
    const wing = (pen: Pen) => {
      pen.moveTo(8, -8)
      pen.bezierCurveTo(-24, -26, -78, -4, -124, 56)
      pen.bezierCurveTo(-78, 54, -18, 50, 8, -8)
      pen.closePath()
    }
    can.layer(PAINT.white, wing, 0, [-2, -2.5])
    can.layer(PAINT.grey, wing, 3)
    // Two feathers: a long one bowed one way and a short one bowed the other, so they are not a pair of bars.
    can.line(PAINT.black, 5, (pen) => {
      pen.moveTo(-56, 2)
      pen.quadraticCurveTo(-38, 20, -42, 45)
      pen.moveTo(-85, 20)
      pen.quadraticCurveTo(-83, 37, -64, 45)
    }, 0)
    can.grain(-124, -20, 132, 78)
  })
}

function pigeonHead(make: Canvases, density: number): Sprite {
  return bake(make, density, 130, 130, 44, 96, 23, (can) => {
    const head = (pen: Pen) => {
      pen.moveTo(-24, 20)
      pen.bezierCurveTo(-22, -16, -12, -44, 6, -60)
      pen.bezierCurveTo(22, -74, 48, -66, 48, -44)
      pen.lineTo(72, -36)
      pen.lineTo(47, -31)
      pen.bezierCurveTo(44, -22, 36, -18, 32, -4)
      pen.bezierCurveTo(30, 10, 28, 18, 20, 26)
      pen.closePath()
    }
    can.layer(PAINT.white, head, 5, UNDER)
    can.layer(PAINT.black, head, 5)
    // The sheen on its neck.
    can.layer(PAINT.teal, (pen) => {
      pen.moveTo(-19, -8)
      pen.quadraticCurveTo(6, 0, 32, -10)
      pen.lineTo(29, 8)
      pen.quadraticCurveTo(4, 16, -23, 8)
      pen.closePath()
    }, 0)
    can.cut(2.4, (pen) => {
      pen.moveTo(-24, 0)
      pen.quadraticCurveTo(4, 9, 33, -1)
    })
    // Two eyes, the nearer one the larger: its head is turned a little towards the yard.
    can.layer(PAINT.hot, (pen) => {
      for (const eye of PIGEON.eyes) {
        pen.moveTo(eye.x + eye.r, eye.y)
        pen.arc(eye.x, eye.y, eye.r, 0, Math.PI * 2)
      }
    }, 0)
    can.grain(-24, -66, 76, 92)
  })
}

function pigeonBeak(make: Canvases, density: number): Sprite {
  return bake(make, density, 44, 26, 8, 8, 24, (can) => {
    can.layer(PAINT.black, (pen) => {
      pen.moveTo(0, 0)
      pen.lineTo(24, 3)
      pen.lineTo(1, 9)
      pen.closePath()
    }, 2)
  })
}

// --- The rat --------------------------------------------------------------------

/** Where the rat's parts join, from the point between its feet. */
export const RAT = { neck: { x: 12, y: -258 }, shoulder: { x: 40, y: -186 }, heel: { x: 26, y: -8 }, tail: { x: -62, y: -52 }, eye: { x: 42, y: -52 }, cup: { x: -26, y: -46 }, band: { x: 52, y: -50 }, mouth: { x: 34, y: -6 }, whiskers: { x: 86, y: -30 } } as const

function ratBody(make: Canvases, density: number): Sprite {
  const place = CAST.rat
  return bake(make, density, 230, 320, 112, 304, 31, (can) => {
    const body = (pen: Pen) => {
      pen.moveTo(-68, -34)
      pen.bezierCurveTo(-98, -118, -82, -228, -30, -268)
      pen.bezierCurveTo(-4, -286, 34, -282, 48, -260)
      pen.bezierCurveTo(78, -214, 90, -118, 70, -54)
      pen.bezierCurveTo(62, -30, 46, -16, 30, -10)
      // The hind foot it stands on.
      pen.lineTo(14, -12)
      pen.bezierCurveTo(18, -4, 8, 0, -2, 0)
      pen.lineTo(-58, 0)
      pen.bezierCurveTo(-72, 0, -74, -16, -68, -34)
      pen.closePath()
    }
    can.layer(PAINT.white, body, 6, UNDER)
    can.layer(PAINT.black, body, 6)
    // A pale belly through a second stencil, and the bridge that held it.
    can.layer(PAINT.white, (pen) => {
      pen.moveTo(36, -232)
      pen.bezierCurveTo(66, -196, 76, -118, 58, -62)
      pen.bezierCurveTo(42, -44, 22, -52, 16, -84)
      pen.bezierCurveTo(8, -140, 14, -196, 36, -232)
      pen.closePath()
    }, 0)
    can.cut(3, (pen) => {
      pen.moveTo(10, -150)
      pen.lineTo(80, -158)
    })
    can.drip(PAINT.black, -40, -4, 3, 2.4)
    can.grain(-96, -284, 190, 286, courses(place.y))
  })
}

function ratTail(make: Canvases, density: number): Sprite {
  return bake(make, density, 130, 170, 108, 128, 32, (can) => {
    const tail = (pen: Pen) => {
      pen.moveTo(4, 2)
      pen.bezierCurveTo(-40, 28, -84, -6, -74, -70)
      pen.bezierCurveTo(-70, -106, -40, -110, -38, -84)
    }
    can.line(PAINT.white, 15, tail, 0)
    can.line(PAINT.black, 10, tail, 4)
    can.cut(2.4, (pen) => {
      pen.moveTo(-86, -30)
      pen.lineTo(-62, -26)
      pen.moveTo(-84, -60)
      pen.lineTo(-62, -64)
    })
  })
}

function ratFoot(make: Canvases, density: number): Sprite {
  return bake(make, density, 100, 44, 16, 28, 33, (can) => {
    const foot = (pen: Pen) => {
      pen.moveTo(-6, -14)
      pen.bezierCurveTo(20, -18, 52, -14, 68, -6)
      pen.bezierCurveTo(76, -2, 74, 6, 64, 6)
      pen.lineTo(0, 6)
      pen.bezierCurveTo(-10, 6, -12, -8, -6, -14)
      pen.closePath()
    }
    can.layer(PAINT.white, foot, 4, UNDER)
    can.layer(PAINT.black, foot, 4)
    can.cut(2, (pen) => {
      pen.moveTo(50, -2)
      pen.lineTo(72, 0)
      pen.moveTo(40, 0)
      pen.lineTo(60, 4)
    })
  })
}

function ratHead(make: Canvases, density: number): Sprite {
  return bake(make, density, 210, 190, 76, 142, 34, (can) => {
    const head = (pen: Pen) => {
      pen.moveTo(-42, 12)
      pen.bezierCurveTo(-60, -30, -42, -78, 0, -84)
      pen.bezierCurveTo(32, -88, 62, -70, 98, -46)
      pen.bezierCurveTo(110, -40, 110, -24, 98, -20)
      pen.bezierCurveTo(72, -8, 52, 8, 32, 18)
      pen.bezierCurveTo(10, 30, -26, 30, -42, 12)
      pen.closePath()
      // The far ear, which stands up behind the band.
      pen.moveTo(40, -102)
      pen.arc(14, -102, 26, 0, Math.PI * 2)
    }
    can.layer(PAINT.white, head, 6, UNDER)
    can.layer(PAINT.black, head, 6)
    // The inside of the far ear: a flat half, towards the head. Never a disc inside a disc.
    can.layer(PAINT.white, (pen) => {
      pen.arc(15, -103, 16, Math.PI * 0.2, Math.PI * 1.1)
      pen.closePath()
    }, 0)
    can.layer(PAINT.white, (pen) => pen.ellipse(42, -52, 13, 10, -0.2, 0, Math.PI * 2), 0)
    can.layer(PAINT.hot, (pen) => pen.arc(103, -33, 7.5, 0, Math.PI * 2), 2)
    can.grain(-56, -128, 164, 156)
  })
}

/**
 * Where the rat's three whiskers end, from the point on its snout they hang from. They droop down and back, each
 * from its own root, six units from the next, and each of its own length and slant, the longest at the back: so
 * they never reach the ring's line, never fan from one point, and are not three like strokes side by side.
 */
export const WHISKER_TIPS = [{ x: -16, y: 20 }, { x: -3, y: 17 }, { x: 7, y: 11 }] as const

function ratWhiskers(make: Canvases, density: number): Sprite {
  return bake(make, density, 60, 58, 24, 12, 35, (can) => {
    can.line(PAINT.white, 2.4, (pen) => {
      pen.moveTo(-4, 0)
      pen.quadraticCurveTo(-7, 12, WHISKER_TIPS[0].x, WHISKER_TIPS[0].y)
      pen.moveTo(2, 2)
      pen.quadraticCurveTo(2, 11, WHISKER_TIPS[1].x, WHISKER_TIPS[1].y)
      pen.moveTo(8, -1)
      pen.quadraticCurveTo(10, 6, WHISKER_TIPS[2].x, WHISKER_TIPS[2].y)
    }, 1.5)
  })
}

function ratGrin(make: Canvases, density: number): Sprite {
  return bake(make, density, 80, 44, 8, 20, 36, (can) => {
    can.layer(PAINT.white, (pen) => {
      pen.moveTo(0, 8)
      pen.quadraticCurveTo(32, 4, 62, -14)
      pen.quadraticCurveTo(40, 22, 4, 20)
      pen.closePath()
    }, 0)
    can.cut(2, (pen) => {
      // Two front teeth, one wider than the other.
      for (const x of [20, 43]) {
        pen.moveTo(x, -8)
        pen.lineTo(x - 3, 22)
      }
    })
  })
}

function ratPhones(make: Canvases, density: number): Sprite {
  return bake(make, density, 130, 130, 62, 84, 37, (can) => {
    const band = (pen: Pen) => {
      pen.moveTo(-4, -30)
      pen.bezierCurveTo(0, -62, 30, -72, 52, -50)
    }
    can.line(PAINT.white, 13, band, 0)
    can.line(PAINT.teal, 8.5, band, 3)
    // A plain round cup in one colour: no cushion ring and no dark middle, so it is an ear cup, not a lock or a target.
    const cup = (pen: Pen) => pen.ellipse(-1, 1, 29, 34, 0.12, 0, Math.PI * 2)
    can.layer(PAINT.white, cup, 4, UNDER)
    can.layer(PAINT.teal, cup, 4)
    can.cut(2.2, (pen) => {
      pen.moveTo(-29, 16)
      pen.lineTo(-15, 11)
    })
    can.grain(-30, -34, 58, 70)
  })
}

function ratArm(make: Canvases, density: number): Sprite {
  return bake(make, density, 150, 150, 30, 118, 38, (can) => {
    const arm = (pen: Pen) => {
      pen.moveTo(0, 0)
      pen.quadraticCurveTo(26, 14, 56, -8)
    }
    const tin = (pen: Pen) => rounded(pen, 46, -78, 32, 66, 6)
    can.line(PAINT.white, 27, arm, 0)
    can.line(PAINT.black, 21, arm, 4)
    can.layer(PAINT.white, (pen) => {
      rounded(pen, 44, -80, 36, 70, 7)
      rounded(pen, 51, -93, 22, 16, 4)
    }, 4, UNDER)
    can.layer(PAINT.hot, tin, 4)
    can.layer(PAINT.white, (pen) => rounded(pen, 52, -91, 20, 12, 3), 0)
    can.layer(PAINT.black, (pen) => {
      rounded(pen, 58, -99, 8, 9, 2)
      // Its paint has run over the tin's shoulder and down one side; and the paw that holds it.
      pen.moveTo(47, -77)
      pen.lineTo(77, -77)
      pen.lineTo(77, -48)
      pen.bezierCurveTo(72, -44, 70, -58, 64, -56)
      pen.bezierCurveTo(58, -54, 58, -68, 52, -66)
      pen.bezierCurveTo(49, -65, 47, -70, 47, -77)
      pen.closePath()
      pen.moveTo(58, -22)
      pen.arc(50, -22, 9, 0, Math.PI * 2)
      pen.moveTo(66, -10)
      pen.arc(58, -10, 9, 0, Math.PI * 2)
      pen.moveTo(76, -30)
      pen.arc(68, -30, 8, 0, Math.PI * 2)
    }, 0)
    can.grain(44, -80, 36, 70)
  })
}

// --- The cat --------------------------------------------------------------------

/** Where the cat's parts join, from the point on the ledge under its middle. */
/** `reach` is how far the tail and its tip hang below the point they swing from. */
export const CAT = { reach: 82 + 44, head: { x: -72, y: -50 }, ear: { x: -90, y: -78 }, paw: { x: -38, y: -6 }, tail: { x: 90, y: -12 }, tip: 82, eyes: [{ x: -86, y: -52 }, { x: -58, y: -52 }], mouth: { x: -72, y: -32 } } as const

function catBody(make: Canvases, density: number): Sprite {
  const place = CAST.cat
  return bake(make, density, 250, 130, 126, 112, 41, (can) => {
    const body = (pen: Pen) => {
      pen.moveTo(-66, 0)
      pen.lineTo(98, 0)
      pen.bezierCurveTo(122, -4, 126, -62, 92, -82)
      pen.bezierCurveTo(54, -102, -14, -98, -44, -78)
      pen.bezierCurveTo(-64, -62, -74, -30, -66, 0)
      pen.closePath()
    }
    can.layer(PAINT.white, body, 6, UNDER)
    can.layer(PAINT.black, body, 6)
    // A tabby's bars, as slits that show the undercoat.
    can.line(PAINT.white, 5, (pen) => {
      for (const [x, lean, long] of [[2, 5, 30], [40, 1, 44], [84, -9, 24]] as const) {
        pen.moveTo(x, -88 + Math.abs(x - 40) * 0.12)
        pen.quadraticCurveTo(x + lean + 6, -88 + long * 0.5, x + lean, -88 + long)
      }
    }, 0)
    can.grain(-70, -98, 190, 98, courses(place.y))
  })
}

function catFur(make: Canvases, density: number, from: number): Sprite {
  return bake(make, density, 80, 50, 40, 40, 42 + from, (can) => {
    can.layer(PAINT.black, (pen) => {
      for (let i = 0; i < 4; i++) {
        const x = -30 + i * 17
        pen.moveTo(x - 9, 2)
        pen.lineTo(x + (i % 2 ? 3 : -3), -30 + (i % 2) * 6)
        pen.lineTo(x + 9, 2)
        pen.closePath()
      }
    }, 3)
  })
}

function catHead(make: Canvases, density: number): Sprite {
  return bake(make, density, 120, 110, 60, 62, 46, (can) => {
    const head = (pen: Pen) => {
      pen.moveTo(40, 0)
      pen.ellipse(0, 0, 40, 34, 0, 0, Math.PI * 2)
      // The far ear. The near one, turned to the ring, is a part of its own.
      pen.moveTo(8, -28)
      pen.lineTo(30, -58)
      pen.lineTo(38, -16)
      pen.closePath()
    }
    can.layer(PAINT.white, head, 5, UNDER)
    can.layer(PAINT.black, head, 5)
    can.layer(PAINT.white, (pen) => {
      pen.moveTo(18, -30)
      pen.lineTo(29, -47)
      pen.lineTo(33, -24)
      pen.closePath()
    }, 0)
    can.layer(PAINT.hot, (pen) => {
      pen.moveTo(-6, 6)
      pen.lineTo(6, 6)
      pen.lineTo(0, 13)
      pen.closePath()
    }, 0)
    can.line(PAINT.white, 2.2, (pen) => {
      for (const side of [-1, 1]) {
        // Two whiskers a side, splayed from one patch of the cheek: a long one that sweeps up and a short one that
        // droops, of unlike lengths and slants. Their roots are apart, so they make no arrowhead, and they are
        // nowhere near level or equal, so they make no pair of bars.
        pen.moveTo(side * 15, 9)
        pen.quadraticCurveTo(side * 31, 6, side * 48, -5)
        pen.moveTo(side * 12, 16)
        pen.quadraticCurveTo(side * 19, 25, side * 29, 28)
      }
    }, 1)
    can.grain(-40, -34, 80, 68)
  })
}

function catEar(make: Canvases, density: number): Sprite {
  return bake(make, density, 60, 60, 30, 46, 47, (can) => {
    const ear = (pen: Pen) => {
      pen.moveTo(-16, 6)
      pen.lineTo(-10, -34)
      pen.lineTo(16, 0)
      pen.closePath()
    }
    can.layer(PAINT.white, ear, 3, UNDER)
    can.layer(PAINT.black, ear, 3)
    can.layer(PAINT.white, (pen) => {
      pen.moveTo(-9, 0)
      pen.lineTo(-7, -22)
      pen.lineTo(7, -2)
      pen.closePath()
    }, 0)
  })
}

function catPaw(make: Canvases, density: number): Sprite {
  return bake(make, density, 50, 70, 25, 14, 48, (can) => {
    const paw = (pen: Pen) => rounded(pen, -12, -6, 24, 48, 12)
    can.layer(PAINT.white, paw, 4, UNDER)
    can.layer(PAINT.black, paw, 4)
    can.cut(2, (pen) => {
      pen.moveTo(-5, 31)
      pen.quadraticCurveTo(-2, 37, -4, 43)
      pen.moveTo(3, 35)
      pen.quadraticCurveTo(6, 38, 5, 41)
    })
  })
}

function catTail(make: Canvases, density: number): Sprite {
  return bake(make, density, 50, 120, 25, 16, 49, (can) => {
    const tail = (pen: Pen) => {
      pen.moveTo(0, 0)
      pen.lineTo(0, CAT.tip)
    }
    can.line(PAINT.white, 21, tail, 0)
    can.line(PAINT.black, 16, tail, 4)
    can.line(PAINT.white, 5, (pen) => {
      for (const [y, tilt] of [[20, -5], [57, 3]] as const) {
        pen.moveTo(-8, y)
        pen.lineTo(8, y + tilt)
      }
    }, 0)
  })
}

function catTip(make: Canvases, density: number): Sprite {
  return bake(make, density, 50, 80, 25, 16, 50, (can) => {
    const tip = (pen: Pen) => {
      pen.moveTo(0, 0)
      pen.quadraticCurveTo(0, 30, -10, 44)
    }
    can.line(PAINT.white, 21, tip, 0)
    can.line(PAINT.black, 16, tip, 4)
  })
}

function catYawn(make: Canvases, density: number): Sprite {
  return bake(make, density, 50, 50, 25, 10, 51, (can) => {
    // An open mouth with a tongue lolling to one side. The undercoat is the mouth's own shape slipped a little, a
    // sliver along one edge: a white oval all round a red one was a ring in a ring.
    const mouth = (pen: Pen) => pen.ellipse(0, 12, 13, 15, 0, 0, Math.PI * 2)
    can.layer(PAINT.white, mouth, 0, [1.5, 1.5])
    can.layer(PAINT.hot, mouth, 0)
    can.layer(PAINT.deep, (pen) => {
      pen.moveTo(-9, 17)
      pen.quadraticCurveTo(-7, 9, 1, 14)
      pen.quadraticCurveTo(5, 21, -2, 26)
      pen.quadraticCurveTo(-8, 25, -9, 17)
      pen.closePath()
    }, 0)
    can.layer(PAINT.white, (pen) => {
      for (const side of [-1, 1]) {
        pen.moveTo(side * 10, 0)
        pen.lineTo(side * 6, 11)
        pen.lineTo(side * 3, 0)
        pen.closePath()
      }
    }, 0)
  })
}

// --- The neighbour at the window ---------------------------------------------------

/** Where the neighbour's parts join, from the point on the sill under its middle. */
export const NEIGHBOUR = { eye: { x: -16, y: -76 }, elbow: { x: 22, y: -18 }, plant: { x: -40, y: 0 } } as const

function neighbourBody(make: Canvases, density: number): Sprite {
  return bake(make, density, 130, 140, 62, 128, 71, (can) => {
    // Head and shoulders in profile, facing the ring: a big nose, a woollen hat with a bobble.
    const bust = (pen: Pen) => {
      pen.moveTo(-46, 0)
      pen.bezierCurveTo(-46, -30, -30, -44, -14, -46)
      pen.bezierCurveTo(-30, -54, -36, -70, -30, -84)
      pen.lineTo(-44, -80)
      pen.lineTo(-33, -92)
      pen.bezierCurveTo(-26, -112, 14, -116, 24, -90)
      pen.bezierCurveTo(30, -72, 22, -54, 8, -47)
      pen.bezierCurveTo(30, -44, 46, -28, 46, 0)
      pen.closePath()
    }
    can.layer(PAINT.white, bust, 5, UNDER)
    can.layer(PAINT.black, bust, 5)
    can.layer(PAINT.hot, (pen) => {
      pen.moveTo(-34, -92)
      pen.bezierCurveTo(-28, -116, 16, -120, 25, -90)
      pen.quadraticCurveTo(-4, -100, -34, -92)
      pen.closePath()
      pen.moveTo(8, -116)
      pen.arc(-1, -116, 9, 0, Math.PI * 2)
    }, 2)
    can.layer(PAINT.white, (pen) => pen.ellipse(NEIGHBOUR.eye.x, NEIGHBOUR.eye.y, 8, 7, 0, 0, Math.PI * 2), 0)
    can.grain(-46, -112, 92, 112)
  })
}

function neighbourArm(make: Canvases, density: number): Sprite {
  return bake(make, density, 90, 70, 60, 50, 72, (can) => {
    const arm = (pen: Pen) => {
      pen.moveTo(0, 0)
      pen.quadraticCurveTo(-14, 8, -34, -6)
    }
    can.line(PAINT.white, 19, arm, 0)
    can.line(PAINT.black, 14, arm, 3)
    // The mug in its hand.
    can.layer(PAINT.white, (pen) => rounded(pen, -52, -30, 23, 27, 4), 3, [1.5, 2])
    can.layer(PAINT.teal, (pen) => rounded(pen, -51, -29, 21, 25, 4), 3)
    can.line(PAINT.teal, 4, (pen) => {
      pen.moveTo(-30, -24)
      pen.quadraticCurveTo(-20, -18, -30, -10)
    }, 0)
  })
}

/** The curtain, hung by its top edge, as wide as the window. The view draws it across by its width. */
function curtain(make: Canvases, density: number): Sprite {
  return bake(make, density, 110, 220, 100, 6, 73, (can) => {
    const cloth = (pen: Pen) => {
      pen.moveTo(-90, 0)
      pen.lineTo(0, 0)
      pen.lineTo(0, 196)
      pen.bezierCurveTo(-20, 204, -34, 188, -52, 198)
      pen.bezierCurveTo(-66, 204, -80, 192, -90, 198)
      pen.closePath()
    }
    can.layer(PAINT.white, cloth, 3, [-2, 2])
    can.layer(PAINT.gold, cloth, 3)
    // Its folds: three, at three spacings.
    can.cut(2.6, (pen) => {
      for (const [x, lean] of [[-20, 4], [-48, -3], [-70, 6]] as const) {
        pen.moveTo(x, 4)
        pen.quadraticCurveTo(x + lean, 100, x - lean, 192)
      }
    })
    can.grain(-90, 0, 90, 198)
  })
}

/** The plant on the sill: three leaves of three sizes on one stem, placed by the foot of the stem. */
function leaves(make: Canvases, density: number): Sprite {
  return bake(make, density, 80, 90, 40, 80, 74, (can) => {
    const leaf = (pen: Pen, x: number, y: number, long: number, turn: number) => {
      const c = Math.cos(turn), s2 = Math.sin(turn)
      const at = (u: number, v: number): [number, number] => [x + u * c - v * s2, y + u * s2 + v * c]
      pen.moveTo(...at(0, 0))
      pen.quadraticCurveTo(...at(long * 0.5, -long * 0.34), ...at(long, 0))
      pen.quadraticCurveTo(...at(long * 0.5, long * 0.3), ...at(0, 0))
    }
    const all = (pen: Pen) => {
      leaf(pen, 0, -18, 44, -1.9)
      leaf(pen, 0, -12, 30, -0.7)
      leaf(pen, -1, -8, 24, -2.7)
    }
    can.line(PAINT.black, 4, (pen) => {
      pen.moveTo(0, 0)
      pen.lineTo(0, -20)
    }, 0)
    can.layer(PAINT.white, all, 0, [1.5, 2])
    can.layer(PAINT.teal, all, 2)
  })
}

export type Sprites = {
  /** The blob and its twin, in each face. */
  blob: Record<Face, Sprite>
  twin: Record<Face, Sprite>
  spring: Sprite
  springHalf: Sprite
  piece: Record<Kind, Sprite>
  flash: Sprite
  glow: Sprite
  puff: Sprite
  burst: Sprite
  burstHalf: Sprite
  dust: Sprite
  flecks: Sprite
  feather: Sprite
  smear: Sprite
  hand: Sprite
  grip: Sprite
  knob: Sprite
  camera: Sprite
  pigeon: { body: Sprite; wing: Sprite; head: Sprite; beak: Sprite }
  rat: { body: Sprite; tail: Sprite; foot: Sprite; head: Sprite; whiskers: Sprite; grin: Sprite; phones: Sprite; arm: Sprite }
  cat: { body: Sprite; fur: Sprite[]; head: Sprite; ear: Sprite; paw: Sprite; tail: Sprite; tip: Sprite; yawn: Sprite }
  neighbour: { body: Sprite; arm: Sprite; curtain: Sprite; leaves: Sprite }
}

const FACE_NAMES: readonly Face[] = ['run', 'crouch', 'air', 'flat']
const KIND_NAMES: readonly Kind[] = ['drum', 'chime', 'flip', 'splitter', 'tunnel', 'wall']
const each = <K extends string, V>(names: readonly K[], make: (name: K, i: number) => V): Record<K, V> => Object.fromEntries(names.map((name, i) => [name, make(name, i)])) as Record<K, V>

/** Paints every sprite at a density of pixels to a stage unit. Called when the surface is sized, and never in a frame. */
export function paintSprites(make: Canvases, density: number): Sprites {
  return {
    blob: each(FACE_NAMES, (face) => blob(make, density, PAINT.hot, face)),
    twin: each(FACE_NAMES, (face) => blob(make, density, PAINT.teal, face)),
    spring: spring(make, density, PAINT.black),
    springHalf: spring(make, density, PAINT.teal),
    piece: each(KIND_NAMES, (kind, i) => pieceSprite(make, density, kind, 80 + i)),
    flash: soft(make, density, 110, 'rgba(255, 252, 240, 0.95)', 0.2),
    glow: soft(make, density, 170, 'rgba(255, 214, 92, 0.85)', 0.25),
    puff: soft(make, density, 90, 'rgba(141, 138, 134, 0.9)', 0.3),
    burst: burst(make, density, PAINT.hot, 61),
    burstHalf: burst(make, density, PAINT.teal, 62),
    dust: dust(make, density),
    flecks: flecks(make, density),
    feather: feather(make, density),
    smear: smear(make, density),
    hand: hand(make, density),
    grip: grip(make, density),
    knob: knob(make, density),
    camera: camera(make, density),
    pigeon: { body: pigeonBody(make, density), wing: pigeonWing(make, density), head: pigeonHead(make, density), beak: pigeonBeak(make, density) },
    rat: { body: ratBody(make, density), tail: ratTail(make, density), foot: ratFoot(make, density), head: ratHead(make, density), whiskers: ratWhiskers(make, density), grin: ratGrin(make, density), phones: ratPhones(make, density), arm: ratArm(make, density) },
    cat: { body: catBody(make, density), fur: [0, 1, 2].map((from) => catFur(make, density, from)), head: catHead(make, density), ear: catEar(make, density), paw: catPaw(make, density), tail: catTail(make, density), tip: catTip(make, density), yawn: catYawn(make, density) },
    neighbour: { body: neighbourBody(make, density), arm: neighbourArm(make, density), curtain: curtain(make, density), leaves: leaves(make, density) },
  }
}
