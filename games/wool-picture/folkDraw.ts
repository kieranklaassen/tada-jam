import type { MothPose, Pose } from './cast'
import type { Ctx, Felt } from './felted'
import { INK, type FolkArt } from './folkArt'
import { GOOSE, PIG, SHEEP, SHEPHERD } from './layout'

// Puts each figure together from its felt pieces, by its pose (cast.ts).
// Every function draws at (x, y), the point between the figure's feet, in
// whatever units `c` is set to, at the size and facing of its stance, and returns how many draws it made: a stamp
// of a piece, a stroke or a fill each count as one.

/** Stamps a felt piece with its own (0, 0) at (x, y), turned and stretched about that point. */
function put(c: Ctx, piece: Felt, x: number, y: number, turn = 0, sx = 1, sy = 1): number {
  if (turn === 0 && sx === 1 && sy === 1) {
    c.drawImage(piece.canvas, x - piece.ox, y - piece.oy, piece.w, piece.h)
    return 1
  }
  c.save()
  c.translate(x, y)
  c.rotate(turn)
  c.scale(sx, sy)
  c.drawImage(piece.canvas, -piece.ox, -piece.oy, piece.w, piece.h)
  c.restore()
  return 1
}

/**
 * How a figure is set on the stage: how large against its own pieces, which way it faces, how much of it is sunk
 * out of sight from the feet up (in water), and whether a cloud on its head hides its eyes. `mist` is the line
 * where the mist it stands in ends, as a height on the stage, or null out of mist: in mist only its ears are
 * drawn (the shepherd's hat; the goose's head down to under its eye, with its bill), on that line or where they
 * are if that is higher.
 */
export type Stance = { scale: number; flip: boolean; sunk: number; blind: boolean; mist: number | null }
export const UPRIGHT: Stance = { scale: 1, flip: false, sunk: 0, blind: false, mist: null }
/** How far above its feet each figure's ears begin, at rest, against its own pieces: the sheep's ears, the pig's ears, the brim of the shepherd's hat. The goose's is read from its neck. */
export const EARS_FROM = { sheep: 112, shepherd: 274, pig: 108 } as const
/** How far below the middle of its head the goose stands out of mist, against its own pieces: down to under its eye and its bill, so that it is read as a goose. */
export const GOOSE_SHOWS = 11

/** Where a figure in mist is drawn: its feet as low as puts the line its ears begin on at the top of the mist, and never higher than they are. */
function sink(y: number, earsFrom: number, stance: Stance): number {
  return stance.mist === null ? y : Math.max(y, stance.mist + earsFrom * stance.scale)
}
/** A figure's body and head in a coat, where it wears one: the same pieces with the wool on them. */
export type Skin = { body: Felt; head: Felt }

/** The body's own frame: feet at (x, y), at the stance's size and facing, then slid, leant and stretched about the feet. The caller restores. */
function stand(c: Ctx, x: number, y: number, pose: Pose, stance: Stance, tall: number): void {
  c.save()
  if (stance.sunk > 0 && stance.mist === null) {
    // Sunk in water: only what stands above it is drawn.
    c.beginPath()
    c.rect(x - 400, y - 1200, 800, 1200 - stance.sunk * tall * stance.scale)
    c.clip()
  }
  c.translate(x, y)
  c.scale(stance.flip ? -stance.scale : stance.scale, stance.scale)
  c.translate(pose.dx, pose.dy)
  c.rotate(pose.lean)
  c.scale(pose.sx, pose.sy)
}

type Eye = readonly [x: number, y: number, r: number]

/**
 * The dark of a face in one fill: two pupils that follow the gaze, or two shut lines in a blink, and a brow
 * over each eye that lifts when it is lively and tilts inward when it is worried. A blink first covers the eyes
 * with `lid`, the colour of the head, which is one more fill.
 */
function face(c: Ctx, eyes: readonly Eye[], pupil: number, reach: number, pose: Pose, lid: string, extra?: (c: Ctx) => void): number {
  let draws = 1
  const shut = pose.lid > 0.5
  if (shut) {
    c.fillStyle = lid
    c.beginPath()
    for (const [x, y, r] of eyes) { c.moveTo(x + r + 1, y); c.arc(x, y, r + 1, 0, Math.PI * 2) }
    c.fill()
    draws++
  }
  c.fillStyle = INK
  c.beginPath()
  eyes.forEach(([x, y, r], i) => {
    if (shut) c.rect(x - r * 0.8, y - 1.2, r * 1.6, 2.4)
    else {
      const px = x + pose.eyeX * reach, py = y + pose.eyeY * reach
      c.moveTo(px + pupil, py)
      c.arc(px, py, pupil, 0, Math.PI * 2)
    }
    // The brow: a thin slanted bar. The inner end is the one toward the other eye.
    const inner = i === 0 ? 1 : -1, lift = 5 + 4 * Math.max(0, pose.brow), tilt = -Math.min(0, pose.brow) * 5
    const by = y - r - lift
    c.moveTo(x - r * 0.9, by + inner * tilt)
    c.lineTo(x + r * 0.9, by - inner * tilt)
    c.lineTo(x + r * 0.9, by - inner * tilt + 2.6)
    c.lineTo(x - r * 0.9, by + inner * tilt + 2.6)
    c.closePath()
  })
  if (extra) extra(c)
  c.fill()
  return draws
}

const SHEEP_EYES: readonly Eye[] = [[-12, -6, 10], [13, -8, 12]]
const GOOSE_EYES: readonly Eye[] = [[-5, -7, 10]]
const SHEPHERD_EYES: readonly Eye[] = [[-13, -7, 8.5], [13, -7, 8.5]]
const PIG_EYES: readonly Eye[] = [[-18, -12, 10.5], [11, -14, 12]]

function sheep(c: Ctx, art: FolkArt['sheep'], x: number, y: number, pose: Pose, stance: Stance, skin: Skin | null): number {
  const out = stance.mist === null
  stand(c, x, sink(y, EARS_FROM.sheep, stance), pose, stance, 170)
  let draws = out ? put(c, skin ? skin.body : art.body, 0, 0) : 0
  c.translate(-80 + pose.headX, -100 + pose.headY)
  c.rotate(pose.headTilt)
  // The ears: up when it is lively, flat when it is not, with a flick now and then.
  const droop = Math.max(-0.9, Math.min(1.2, 0.45 - 1.25 * pose.b))
  draws += put(c, art.ear, -24, -18, Math.PI - droop, 1, -1)
  draws += put(c, art.ear, 24, -20, droop)
  // In mist the ears are all of it that shows.
  if (out) {
    // The jaw goes sideways as it chews and drops when it bleats.
    draws += put(c, art.jaw, pose.a * 5, 32 + pose.mouth * 9)
    draws += put(c, skin ? skin.head : art.head, 0, 0)
    if (!stance.blind) draws += face(c, SHEEP_EYES, 5, 4, pose, 'rgb(74,68,88)')
  }
  c.restore()
  return draws
}

function goose(c: Ctx, art: FolkArt['goose'], x: number, y: number, pose: Pose, stance: Stance, skin: Skin | null): number {
  const hx = -46 + pose.headX + Math.min(0, pose.a) * 14, hy = -230 - 46 * pose.a + pose.headY
  if (stance.mist !== null) {
    // In mist: its head down to under the eye, with its bill, and no neck: enough to be read as a goose.
    stand(c, x, sink(y, -hy - GOOSE_SHOWS, stance), pose, stance, 280)
    c.translate(hx, hy)
    c.rotate(pose.headTilt)
    c.beginPath()
    c.rect(-70, -40, 110, 40 + GOOSE_SHOWS)
    c.clip()
    let head = put(c, art.bill, -17, 1)
    head += put(c, art.bill, -17, 6, -0.1 - 0.5 * pose.c, 1, -1)
    head += put(c, skin ? skin.head : art.head, 0, 0)
    if (!stance.blind) head += face(c, GOOSE_EYES, 4.6, 3.4, pose, 'rgb(246,243,235)')
    c.restore()
    return head
  }
  stand(c, x, y, pose, stance, 280)
  let draws = put(c, skin ? skin.body : art.body, 0, 0)
  draws += put(c, art.wing, -6, -98, -0.95 * pose.b)
  // The neck: one thick line from the shoulder to wherever the head is, long when it is lively and low when it hisses.
  c.lineCap = 'round'
  c.strokeStyle = 'rgb(240,237,229)'
  c.lineWidth = 28
  c.beginPath()
  c.moveTo(-28, -122)
  c.bezierCurveTo(-64, -158, hx + 36, hy + 62, hx + 4, hy + 10)
  c.stroke()
  draws++
  c.translate(hx, hy)
  c.rotate(pose.headTilt)
  draws += put(c, art.bill, -17, 1)
  draws += put(c, art.bill, -17, 6, -0.1 - 0.5 * pose.c, 1, -1)
  draws += put(c, skin ? skin.head : art.head, 0, 0)
  if (!stance.blind) draws += face(c, GOOSE_EYES, 4.6, 3.4, pose, 'rgb(246,243,235)')
  c.restore()
  return draws
}

function shepherd(c: Ctx, art: FolkArt['shepherd'], x: number, y: number, pose: Pose, stance: Stance, skin: Skin | null): number {
  const out = stance.mist === null
  stand(c, x + 2.5 * pose.c * stance.scale, sink(y, EARS_FROM.shepherd, stance), pose, stance, 336)
  let draws = 0
  const hx = pose.headX, hy = -262 + pose.headY
  // In mist his hat is all of him that shows.
  if (out) {
    draws += put(c, skin ? skin.body : art.body, 0, 0, 0, 1 - 0.03 * pose.c, 1)
    c.save()
    c.translate(hx, hy)
    c.rotate(pose.headTilt)
    draws += put(c, skin ? skin.head : art.head, 0, 0)
    if (!stance.blind) draws += face(c, SHEPHERD_EYES, 4.2, 3, pose, 'rgb(238,192,162)', pose.mouth > 0.05 ? (p) => { p.moveTo(6, 29); p.ellipse(0, 29, 6, 5.5 * pose.mouth, 0, 0, Math.PI * 2) } : undefined)
    c.restore()
    // The free arm: down at his side, or up with the mitten over his eyes.
    draws += put(c, art.arm, 36, -224, 2.4 * pose.b)
  }
  // The hat: the brim sags when he is wet or worried, tips up when he is lively, and hops off his head at a poke.
  const a = pose.a, off = Math.max(0, a - 1), tip = Math.max(0, Math.min(1, a)), sag = Math.max(0, -a)
  c.translate(hx, hy)
  c.rotate(pose.headTilt)
  draws += put(c, art.hat, 0, -26 + 5 * sag - 5 * tip - 36 * off, -0.2 * tip - 0.22 * off, 1 + 0.05 * sag, 1 + 0.32 * sag)
  c.restore()
  return draws
}

function pig(c: Ctx, art: FolkArt['pig'], x: number, y: number, pose: Pose, stance: Stance, skin: Skin | null): number {
  const out = stance.mist === null
  stand(c, x, sink(y, EARS_FROM.pig, stance), pose, stance, 146)
  let draws = 0
  if (out) {
    // The tail: a curl that winds and unwinds, and spins when it is lively.
    c.strokeStyle = 'rgb(232,150,158)'
    c.lineWidth = 6
    c.lineCap = 'round'
    c.beginPath()
    c.arc(97, -92, 9, 2.2 + pose.b, 2.2 + pose.b + 4.6)
    c.stroke()
    draws += 1 + put(c, skin ? skin.body : art.body, 0, 0)
  }
  c.translate(-56 + pose.headX, -80 + pose.headY)
  c.rotate(pose.headTilt)
  draws += put(c, art.ear, -24, -30, -0.55 + 0.75 * pose.c)
  draws += put(c, art.ear, 22, -34, 0.5 - 0.75 * pose.c)
  // In mist the ears are all of it that shows.
  if (!out) { c.restore(); return draws }
  draws += put(c, skin ? skin.head : art.head, 0, 0)
  draws += put(c, art.snout, -30 + 3 * pose.a, 10, 0.16 * pose.a)
  if (!stance.blind) draws += face(c, PIG_EYES, 4.8, 3.8, pose, 'rgb(242,182,186)', pose.mouth > 0.05 ? (p) => { p.moveTo(-16, 31); p.ellipse(-24, 31, 8, 6 * pose.mouth, 0, 0, Math.PI * 2) } : undefined)
  c.restore()
  return draws
}

/** Draws one figure with its feet at (x, y), in the dish or on the sheet. */
export function drawFigure(c: Ctx, art: FolkArt, who: number, x: number, y: number, pose: Pose, stance: Stance = UPRIGHT, skin: Skin | null = null): number {
  if (who === SHEEP) return sheep(c, art.sheep, x, y, pose, stance, skin)
  if (who === GOOSE) return goose(c, art.goose, x, y, pose, stance, skin)
  if (who === SHEPHERD) return shepherd(c, art.shepherd, x, y, pose, stance, skin)
  if (who === PIG) return pig(c, art.pig, x, y, pose, stance, skin)
  return 0
}

/** Where the tips of the moth's feelers are, above its middle: the highest thing of it that is drawn. `MOTH_UP` in layout.ts clears it. */
export const FEELER_TIP = -40

/** Draws the moth with its middle at (x, y), turned by `turn`. */
export function drawMoth(c: Ctx, art: FolkArt['moth'], x: number, y: number, turn: number, pose: MothPose): number {
  // Its jaws work while it eats: the whole moth nods in small quick bites.
  y += 2.5 * pose.bite
  c.save()
  c.translate(x, y + pose.bob)
  c.rotate(turn)
  const lift = -0.15 - 0.85 * pose.wing
  let draws = put(c, art.wing, 3, -2, lift)
  c.save()
  c.scale(-1, 1)
  draws += put(c, art.wing, 3, -2, lift)
  c.restore()
  draws += put(c, art.body, 0, 0)
  // The feelers: one of them is drawn down over the face while it cleans it.
  c.strokeStyle = 'rgb(120,100,84)'
  c.lineWidth = 1.8
  c.lineCap = 'round'
  c.beginPath()
  c.moveTo(-4, -20)
  c.quadraticCurveTo(-12, -32, -17, FEELER_TIP)
  c.moveTo(4, -20)
  c.quadraticCurveTo(12, -32 + pose.feeler * 10, 17 - pose.feeler * 10, FEELER_TIP + pose.feeler * 24)
  c.stroke()
  c.restore()
  return draws + 1
}
