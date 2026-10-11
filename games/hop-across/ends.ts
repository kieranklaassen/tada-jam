import { INK, SHADOW_OFFSET, card, ellipse, roundRect } from './backdrop'
import { COVER, ENDS, LANES } from './layout'
import type { FarEnd, NearEnd } from './scenery'

// What stands on the table at the two ends of a lane, painted into the still picture. At the far end: the card a
// mover goes under (a brick arch for a road, a bank of reeds for a river, a stone tunnel for rails), the burrow,
// the picnic hamper, and at the end of a grass lane one of the toys that look on over the board's edge. At the
// near end: the same cards, and on the table between them the loose things of a playroom.

type Ctx = CanvasRenderingContext2D

/** Where the far things stand and how tall a card is there; where the near things stand. */
const FAR_Y = ENDS.far
const NEAR_Y = ENDS.near

/** An onlooker's chin rests on the table at the board's far edge, clear of the leaf that lifts, and it is no taller than a card. */
const ONLOOKER = { base: LANES.y - 10, scale: 0.84 } as const
/** An onlooker's eyes as it is drawn, before it is made that small: how far above its chin, how far apart, how large. */
const FACE: Partial<Record<FarEnd, { dy: number; gap: number; r: number }>> = {
  teddy: { dy: -40, gap: 15, r: 6 },
  robot: { dy: -36, gap: 17, r: 8 },
  giraffe: { dy: -42, gap: 14, r: 6 },
  doll: { dy: -34, gap: 15, r: 6 },
}
/** Where an onlooker's eyes are on the stage, from the middle of its column: the view draws the pupils, which follow the rabbit. */
export function eyesOf(what: FarEnd): { y: number; gap: number; r: number } | null {
  const face = FACE[what]
  return face ? { y: ONLOOKER.base + face.dy * ONLOOKER.scale, gap: face.gap * ONLOOKER.scale, r: face.r * ONLOOKER.scale } : null
}

function arch(ctx: Ctx, x: number, y: number, h: number): void {
  card(ctx, x, y, 106, h, () => {
    ctx.fillStyle = '#c9583e'
    roundRect(ctx, x - 49, y - h + 4, 98, h - 8, 8)
    ctx.fill()
    ctx.fillStyle = '#a84530'
    for (let row = 0; row < 3; row++) for (let n = 0; n < 4; n++) {
      roundRect(ctx, x - 45 + n * 24 + (row % 2) * 10, y - h + 9 + row * 9, 16, 4, 2)
      ctx.fill()
    }
    ctx.fillStyle = '#2e2224'
    ctx.beginPath()
    const top = y - h * 0.62
    ctx.moveTo(x - 35, y - 4)
    ctx.lineTo(x - 35, top + 16)
    ctx.quadraticCurveTo(x - 35, top, x, top)
    ctx.quadraticCurveTo(x + 35, top, x + 35, top + 16)
    ctx.lineTo(x + 35, y - 4)
    ctx.closePath()
    ctx.fill()
  })
}

function reeds(ctx: Ctx, x: number, y: number, h: number): void {
  card(ctx, x, y, 106, h, () => {
    ctx.fillStyle = '#58a6a0'
    roundRect(ctx, x - 49, y - h + 4, 98, h - 8, 8)
    ctx.fill()
    ctx.fillStyle = '#3f8f4a'
    for (const dx of [-34, -16, 2, 20, 36]) {
      ctx.beginPath()
      ctx.moveTo(x + dx - 4, y - 5)
      ctx.quadraticCurveTo(x + dx - 6, y - h * 0.6, x + dx + 2, y - h + 8)
      ctx.quadraticCurveTo(x + dx + 4, y - h * 0.6, x + dx + 5, y - 5)
      ctx.closePath()
      ctx.fill()
    }
    ctx.fillStyle = '#7a4a26'
    for (const dx of [-25, 11, 29]) {
      roundRect(ctx, x + dx - 4, y - h + 12, 8, 20, 4)
      ctx.fill()
    }
  })
}

/** A stone tunnel with a round mouth, in which the train sleeps. */
function tunnel(ctx: Ctx, x: number, y: number, h: number): void {
  card(ctx, x, y, 106, h, () => {
    ctx.fillStyle = '#8d8a9c'
    roundRect(ctx, x - 49, y - h + 4, 98, h - 8, 8)
    ctx.fill()
    ctx.fillStyle = '#a7a4b5'
    for (const [dx, dy, w] of [[-42, 8, 18], [-18, 6, 14], [22, 9, 20], [-44, 30, 10], [36, 32, 10]] as const) {
      roundRect(ctx, x + dx, y - h + dy, w, 7, 3)
      ctx.fill()
    }
    ctx.fillStyle = '#231c2a'
    ellipse(ctx, x, y - 4 - (h - 16) * 0.48, 34, (h - 16) * 0.5)
    ctx.fill()
    ctx.fillRect(x - 34, y - 4 - (h - 16) * 0.48, 68, (h - 16) * 0.48)
  })
}

function tree(ctx: Ctx, x: number, y: number, h: number): void {
  const k = h / 86
  card(ctx, x, y, 84 * k, h, () => {
    ctx.fillStyle = '#8a5a3c'
    roundRect(ctx, x - 7 * k, y - 40 * k, 14 * k, 36 * k, 4)
    ctx.fill()
    ctx.fillStyle = '#4fa24a'
    ellipse(ctx, x, y - 54 * k, 33 * k, 26 * k)
    ctx.fill()
    ctx.fillStyle = '#6fbf5a'
    ellipse(ctx, x - 8 * k, y - 60 * k, 14 * k, 11 * k)
    ctx.fill()
    ctx.fillStyle = '#e2504c'
    for (const [dx, dy] of [[14, -48], [-16, -44], [2, -66]]) {
      ellipse(ctx, x + dx * k, y + dy * k, 4.5 * k, 4.5 * k)
      ctx.fill()
    }
  })
}

function burrow(ctx: Ctx, x: number): void {
  const y = LANES.y + 96
  card(ctx, x, y, 102, 104, () => {
    // A mound with a dark door, and a tuft on top.
    ctx.fillStyle = '#b98a58'
    ctx.beginPath()
    ctx.moveTo(x - 46, y - 5)
    ctx.quadraticCurveTo(x - 43, y - 94, x, y - 96)
    ctx.quadraticCurveTo(x + 43, y - 94, x + 46, y - 5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#3a2618'
    ctx.beginPath()
    ctx.moveTo(x - 22, y - 5)
    ctx.quadraticCurveTo(x - 22, y - 58, x, y - 60)
    ctx.quadraticCurveTo(x + 22, y - 58, x + 22, y - 5)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = INK.grassDark
    ellipse(ctx, x - 14, y - 90, 17, 7)
    ctx.fill()
    ellipse(ctx, x + 10, y - 92, 19, 8)
    ctx.fill()
    // Four little hooks by the door, for four coats.
    for (const [dx, colour] of [[-34, '#e2504c'], [-30, '#f4c13d'], [30, '#3fb7a8'], [34, '#9b7ae0']] as const) {
      ctx.fillStyle = colour
      ellipse(ctx, x + dx, y - 30 - Math.abs(dx - 32) * 0.1, 4, 6)
      ctx.fill()
    }
  })
}

/** The picnic hamper behind whoever sits on the cloth's seat: wicker, with a loaf and a bottle sticking out. */
function hamper(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = INK.shadow
  roundRect(ctx, x - 48 + SHADOW_OFFSET.x, y - 48 + SHADOW_OFFSET.y, 96, 48, 10)
  ctx.fill()
  ctx.fillStyle = '#e8c78a'
  ctx.save()
  ctx.translate(x - 22, y - 44)
  ctx.rotate(-0.9)
  roundRect(ctx, -7, -22, 14, 36, 7)
  ctx.fill()
  ctx.restore()
  ctx.fillStyle = '#5a8f3a'
  roundRect(ctx, x + 14, y - 60, 13, 24, 5)
  ctx.fill()
  ctx.fillStyle = '#f4c542'
  roundRect(ctx, x + 16.5, y - 65, 8, 8, 3)
  ctx.fill()
  ctx.fillStyle = '#b98a58'
  roundRect(ctx, x - 48, y - 48, 96, 48, 10)
  ctx.fill()
  ctx.fillStyle = '#d6aa72'
  for (let row = 0; row < 3; row++) for (let n = 0; n < 6; n++) {
    roundRect(ctx, x - 44 + n * 15 + (row % 2) * 7, y - 43 + row * 14, 10, 6, 3)
    ctx.fill()
  }
  ctx.fillStyle = INK.clothRed
  roundRect(ctx, x - 50, y - 52, 100, 10, 5)
  ctx.fill()
}

/** A toy's hard shadow, as a blob behind its head. */
function toyShadow(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = INK.shadow
  roundRect(ctx, x - w / 2 + SHADOW_OFFSET.x, y - h + SHADOW_OFFSET.y, w, h, w * 0.4)
  ctx.fill()
}

function eyeWhites(ctx: Ctx, x: number, y: number, what: FarEnd, rim = '#ffffff'): void {
  const eyes = FACE[what]
  if (!eyes) return
  ctx.fillStyle = rim
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * eyes.gap, y + eyes.dy, eyes.r + 2.5, eyes.r + 2.5)
    ctx.fill()
  }
}

// The onlookers are toys that have come to watch: each rests its chin on the rim of the board, paws beside it.
// `y` is the rim. None is taller than a card, so the cat shows over all of them.

/** A teddy bear. */
function teddy(ctx: Ctx, x: number, y: number): void {
  toyShadow(ctx, x, y, 96, 66)
  const fur = '#c98f54', pale = '#ecd0a0'
  ctx.fillStyle = fur
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 36, y - 56, 13, 13)
    ctx.fill()
  }
  ellipse(ctx, x, y - 32, 47, 32)
  ctx.fill()
  ctx.fillStyle = pale
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 36, y - 56, 6.5, 6.5)
    ctx.fill()
  }
  ellipse(ctx, x, y - 20, 21, 15)
  ctx.fill()
  ctx.fillStyle = '#4a2f1c'
  ellipse(ctx, x, y - 27, 7, 5)
  ctx.fill()
  eyeWhites(ctx, x, y, 'teddy')
  ctx.fillStyle = fur
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 40, y + 1, 15, 10)
    ctx.fill()
  }
}

/** A tin robot with a square head and a short aerial. */
function robot(ctx: Ctx, x: number, y: number): void {
  toyShadow(ctx, x, y, 88, 60)
  ctx.fillStyle = '#5f97ab'
  roundRect(ctx, x - 2.5, y - 68, 5, 10, 2)
  ctx.fill()
  ctx.fillStyle = '#e2504c'
  ellipse(ctx, x, y - 66, 4.5, 4.5)
  ctx.fill()
  ctx.fillStyle = '#7fb6c9'
  for (const side of [-1, 1]) {
    roundRect(ctx, x + side * 46 - 6, y - 42, 12, 20, 4)
    ctx.fill()
  }
  ctx.fillStyle = '#a5d3e2'
  roundRect(ctx, x - 44, y - 60, 88, 60, 13)
  ctx.fill()
  eyeWhites(ctx, x, y, 'robot', '#fffbe0')
  ctx.fillStyle = '#5f97ab'
  roundRect(ctx, x - 20, y - 17, 40, 8, 4)
  ctx.fill()
  ctx.fillStyle = '#a5d3e2'
  for (const dx of [-10, 0, 10]) ctx.fillRect(x + dx - 1, y - 17, 2, 8)
  ctx.fillStyle = 'rgba(255,255,255,0.45)'
  roundRect(ctx, x - 38, y - 54, 5, 36, 2.5)
  ctx.fill()
  ctx.fillStyle = '#7fb6c9'
  for (const side of [-1, 1]) {
    roundRect(ctx, x + side * 38 - 13, y - 5, 26, 12, 6)
    ctx.fill()
  }
}

/** A wooden giraffe: two little horns, ears out sideways and a long pale muzzle. */
function giraffe(ctx: Ctx, x: number, y: number): void {
  toyShadow(ctx, x, y, 76, 64)
  const hide = '#f4c13d', spot = '#c9772b'
  ctx.fillStyle = spot
  for (const side of [-1, 1]) {
    roundRect(ctx, x + side * 11 - 2.5, y - 68, 5, 14, 2.5)
    ctx.fill()
    ellipse(ctx, x + side * 11, y - 66, 4.5, 4.5)
    ctx.fill()
  }
  ctx.fillStyle = hide
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 38, y - 46, 14, 7, side * -0.4)
    ctx.fill()
  }
  ellipse(ctx, x, y - 36, 31, 26)
  ctx.fill()
  ctx.fillStyle = spot
  for (const [dx, dy, r] of [[-19, -50, 5], [20, -48, 4.5], [0, -57, 4]] as const) {
    ellipse(ctx, x + dx, y + dy, r, r * 0.85)
    ctx.fill()
  }
  ctx.fillStyle = '#fbe6a8'
  ellipse(ctx, x, y - 15, 26, 17)
  ctx.fill()
  ctx.fillStyle = '#7a4a26'
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 8, y - 17, 2.6, 2.6)
    ctx.fill()
  }
  eyeWhites(ctx, x, y, 'giraffe')
}

/** A rag doll with two pigtails. */
function doll(ctx: Ctx, x: number, y: number): void {
  toyShadow(ctx, x, y, 84, 64)
  ctx.fillStyle = '#d96a2b'
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 47, y - 28, 11, 18, side * 0.4)
    ctx.fill()
  }
  ctx.fillStyle = '#f6d7b8'
  ellipse(ctx, x, y - 32, 41, 32)
  ctx.fill()
  ctx.fillStyle = '#d96a2b'
  ctx.beginPath()
  ctx.ellipse(x, y - 46, 41, 19, 0, Math.PI, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#f29bb0'
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 26, y - 20, 7, 4.5)
    ctx.fill()
  }
  eyeWhites(ctx, x, y, 'doll')
  ctx.fillStyle = '#f6d7b8'
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 36, y + 2, 12, 8)
    ctx.fill()
  }
}

function onlooker(ctx: Ctx, toy: (ctx: Ctx, x: number, y: number) => void, x: number): void {
  ctx.save()
  ctx.translate(x, ONLOOKER.base)
  ctx.scale(ONLOOKER.scale, ONLOOKER.scale)
  toy(ctx, 0, 0)
  ctx.restore()
}

const TOYS: Partial<Record<FarEnd, (ctx: Ctx, x: number, y: number) => void>> = { teddy, robot, giraffe, doll }

/**
 * An onlooker that has been touched, drawn again over the still picture as it swells: `wide` and `tall` are 1 or
 * more and it grows from its chin, so the head in the still picture is always covered.
 */
export function paintOnlooker(ctx: Ctx, what: FarEnd, x: number, wide: number, tall: number): void {
  const toy = TOYS[what]
  if (!toy) return
  ctx.save()
  ctx.translate(x, ONLOOKER.base)
  ctx.scale(ONLOOKER.scale * wide, ONLOOKER.scale * tall)
  toy(ctx, 0, 0)
  ctx.restore()
}

/**
 * The hamper, touched: its cloth flap is thrown up at one end and an apple hops out of it and drops back.
 * `open` is 0 to 1. Drawn over the still picture, where the flap lies shut.
 */
export function hamperOpen(ctx: Ctx, x: number, open: number, hop: number): void {
  const y = FAR_Y - 4
  // The dark inside shows where the flap lay.
  ctx.fillStyle = '#6b4a2a'
  roundRect(ctx, x - 50, y - 53, 100, 12, 5)
  ctx.fill()
  ctx.fillStyle = '#d8433f'
  ellipse(ctx, x - 37, y - 50 - hop * 46, 11, 10)
  ctx.fill()
  ctx.fillStyle = '#5a8f3a'
  ellipse(ctx, x - 33, y - 61 - hop * 46, 5, 2.5, -0.6)
  ctx.fill()
  ctx.save()
  ctx.translate(x - 50, y - 47)
  ctx.rotate(-open * 0.62)
  ctx.fillStyle = INK.clothRed
  roundRect(ctx, 0, -5, 100, 10, 5)
  ctx.fill()
  ctx.restore()
}

/** What stands at the far end of the column whose middle is `x`. */
export function paintFar(ctx: Ctx, what: FarEnd, x: number, seed: number): void {
  const y = FAR_Y
  switch (what) {
    case 'arch': return arch(ctx, x, y, COVER.far)
    case 'reeds': return reeds(ctx, x, y, COVER.far)
    case 'tunnel': return tunnel(ctx, x, y, COVER.far)
    case 'tree': return tree(ctx, x + ((seed % 9) - 4), y, COVER.far)
    case 'burrow': return burrow(ctx, x)
    case 'hamper': return hamper(ctx, x, y - 4)
    case 'teddy': return onlooker(ctx, teddy, x)
    case 'robot': return onlooker(ctx, robot, x)
    case 'giraffe': return onlooker(ctx, giraffe, x)
    case 'doll': return onlooker(ctx, doll, x)
  }
}

/** A wooden spinning top on its side: a round body in two paints and a peg. Nothing on it is a mark to count. */
function top(ctx: Ctx, x: number, y: number, turn: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.fillStyle = INK.shadow
  ellipse(ctx, 6, 7, 20, 17)
  ctx.fill()
  ctx.fillStyle = '#c9a26b'
  roundRect(ctx, -4, -34, 8, 22, 4)
  ctx.fill()
  ctx.fillStyle = '#ef6f8f'
  ellipse(ctx, 0, 0, 20, 17)
  ctx.fill()
  ctx.fillStyle = '#4fb3bf'
  ctx.beginPath()
  ctx.moveTo(-17, 8)
  ctx.quadraticCurveTo(0, 16, 17, 8)
  ctx.quadraticCurveTo(8, 30, 0, 34)
  ctx.quadraticCurveTo(-8, 30, -17, 8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ellipse(ctx, -8, -7, 5, 3.5, -0.5)
  ctx.fill()
  ctx.restore()
}

/** A rubber ball in one colour with a paler cap. */
function ball(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = INK.shadow
  ellipse(ctx, x + 7, y + 7, 19, 16)
  ctx.fill()
  ctx.fillStyle = '#f2b33d'
  ellipse(ctx, x, y, 19, 19)
  ctx.fill()
  ctx.fillStyle = '#f8d98a'
  ellipse(ctx, x - 5, y - 8, 11, 7, -0.5)
  ctx.fill()
}

/** A little wooden car on its wheels, seen from the side: a block, a cab and two wheels. */
function woodenCar(ctx: Ctx, x: number, y: number, turn: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.fillStyle = INK.shadow
  roundRect(ctx, -24 + 7, -12 + 7, 48, 24, 7)
  ctx.fill()
  ctx.fillStyle = '#8ccf5a'
  roundRect(ctx, -24, -6, 48, 18, 7)
  ctx.fill()
  roundRect(ctx, -12, -18, 24, 16, 7)
  ctx.fill()
  ctx.fillStyle = '#c9a26b'
  for (const side of [-1, 1]) {
    ellipse(ctx, side * 14, 13, 8, 8)
    ctx.fill()
  }
  ctx.restore()
}

/** A spare pawn lying on its side. */
function spare(ctx: Ctx, x: number, y: number, colour: string, turn: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(turn)
  ctx.fillStyle = INK.shadow
  ellipse(ctx, 6 + SHADOW_OFFSET.x * 0.6, SHADOW_OFFSET.y * 0.8, 30, 15)
  ctx.fill()
  ctx.fillStyle = colour
  ellipse(ctx, 0, 0, 28, 15)
  ctx.fill()
  ctx.fillStyle = '#fbf1dc'
  ellipse(ctx, 32, 0, 13, 13)
  ctx.fill()
  roundRect(ctx, 40, -9, 22, 7, 3.5)
  ctx.fill()
  roundRect(ctx, 40, 2, 22, 7, 3.5)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.35)'
  roundRect(ctx, -16, -9, 24, 4, 2)
  ctx.fill()
  ctx.restore()
}

/** The lid of the game's box, pushed half under the frame's edge. */
function lid(ctx: Ctx, x: number, y: number): void {
  ctx.fillStyle = INK.shadow
  roundRect(ctx, x - 55 + 9, y - 52 + 8, 110, 90, 8)
  ctx.fill()
  ctx.fillStyle = '#2f8f83'
  roundRect(ctx, x - 55, y - 52, 110, 90, 8)
  ctx.fill()
  ctx.save()
  roundRect(ctx, x - 55, y - 52, 110, 90, 8)
  ctx.clip()
  ctx.fillStyle = '#f4c542'
  for (let n = -1; n < 5; n++) {
    ctx.beginPath()
    ctx.moveTo(x - 55 + n * 30, y - 52)
    ctx.lineTo(x - 40 + n * 30, y - 52)
    ctx.lineTo(x - 70 + n * 30, y - 22)
    ctx.lineTo(x - 85 + n * 30, y - 22)
    ctx.closePath()
    ctx.fill()
  }
  // A picture of a rabbit's ears on the lid, and nothing written.
  ctx.fillStyle = '#fbf1dc'
  ellipse(ctx, x + 4, y + 16, 20, 18)
  ctx.fill()
  for (const side of [-1, 1]) {
    roundRect(ctx, x + 4 + side * 9 - 5.5, y - 18, 11, 30, 5.5)
    ctx.fill()
  }
  ctx.restore()
}

/** What stands or lies at the near end of the column whose middle is `x`. */
export function paintNear(ctx: Ctx, what: NearEnd, x: number, seed: number): void {
  const y = NEAR_Y
  const tilt = ((seed % 13) - 6) * 0.06
  switch (what) {
    case 'none': return
    case 'arch': return arch(ctx, x, y, COVER.near)
    case 'reeds': return reeds(ctx, x, y, COVER.near)
    case 'tunnel': return tunnel(ctx, x, y, COVER.near)
    case 'lid': return lid(ctx, x, y - 6)
    case 'toys':
      top(ctx, x - 30, y - 24, 1.1 + tilt)
      ball(ctx, x + 2, y - 30)
      woodenCar(ctx, x + 32, y - 16, -tilt)
      return
    case 'marbles':
      for (const [dx, dy, r, colour] of [[-30, -22, 13, '#4fb3bf'], [-2, -30, 11, '#ef6f8f'], [24, -18, 14, '#f2b33d'], [2, -8, 9, '#9a86e8']] as const) {
        ctx.fillStyle = INK.shadow
        ellipse(ctx, x + dx + 5, y + dy + 5, r, r * 0.8)
        ctx.fill()
        ctx.fillStyle = colour
        ellipse(ctx, x + dx, y + dy, r, r)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.6)'
        ellipse(ctx, x + dx - r * 0.35, y + dy - r * 0.35, r * 0.28, r * 0.28)
        ctx.fill()
      }
      return
    case 'spare':
      return spare(ctx, x - 14, y - 24, ['#e9a23b', '#7b6fd0', '#58a6a0'][seed % 3], tilt * 2)
    case 'crayons':
      for (const [n, colour] of [[0, '#e2504c'], [1, '#3d6fb0'], [2, '#f4c542']] as const) {
        ctx.save()
        ctx.translate(x - 24 + n * 22, y - 24)
        ctx.rotate(tilt + (n - 1) * 0.5)
        ctx.fillStyle = INK.shadow
        roundRect(ctx, -5 + 5, -26 + 5, 11, 52, 4)
        ctx.fill()
        ctx.fillStyle = colour
        roundRect(ctx, -5.5, -26, 11, 52, 4)
        ctx.fill()
        ctx.fillStyle = '#fff4ea'
        ctx.fillRect(-5.5, -8, 11, 18)
        ctx.restore()
      }
      return
    case 'blocks':
      for (const [dx, dy, s, colour] of [[-28, -22, 34, '#6fbf5a'], [12, -18, 36, '#ef6f8f'], [-6, -44, 30, '#f2b33d']] as const) {
        ctx.fillStyle = INK.shadow
        roundRect(ctx, x + dx - s / 2 + 7, y + dy - s / 2 + 6, s, s, 5)
        ctx.fill()
        ctx.fillStyle = colour
        roundRect(ctx, x + dx - s / 2, y + dy - s / 2, s, s, 5)
        ctx.fill()
        ctx.fillStyle = 'rgba(255,255,255,0.3)'
        roundRect(ctx, x + dx - s / 2 + 4, y + dy - s / 2 + 4, s - 8, 5, 2.5)
        ctx.fill()
      }
      return
  }
}
