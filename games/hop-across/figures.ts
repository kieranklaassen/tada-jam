import { INK, SHADOW_OFFSET, ellipse, roundRect } from './backdrop'
import { CAT, CAT_SHOWS_TO, MOUTH, SQUARE } from './layout'

// Everything that moves, as painters that take numbers and draw: turned wooden pawns with painted faces, wooden
// vehicles with a peg driver, a log, a turtle, the train, the fish, the duck and the cat at the table's edge.
// Flat paint with no contour lines, a gloss streak on turned wood, and a hard shadow.

type Ctx = CanvasRenderingContext2D

export type PawnLook = {
  /** How big it is beside the rabbit, who is 1. */
  size: number
  head: string
  body: string
  band: string
  ear: string
  /** How its ears hang at rest, in radians from upright: the dozy one's trail. */
  earRest: number
  /** The wobbly one has one ear bent. */
  bent: boolean
  /** The dozy one's eyes are half shut. */
  sleepy: boolean
  /** The old rabbit wears spectacles. */
  specs: boolean
}

export const LOOKS: readonly PawnLook[] = [
  { size: 1.3, head: '#fbf1dc', body: '#e2504c', band: '#fff4ea', ear: '#fbf1dc', earRest: 0.16, bent: false, sleepy: false, specs: false },
  { size: 0.9, head: '#fbf1dc', body: '#f4c13d', band: '#fff4ea', ear: '#fbf1dc', earRest: 0.06, bent: false, sleepy: false, specs: false },
  { size: 0.9, head: '#f3e2c4', body: '#3fb7a8', band: '#fff4ea', ear: '#f3e2c4', earRest: 1.15, bent: false, sleepy: true, specs: false },
  { size: 0.9, head: '#fbf1dc', body: '#9b7ae0', band: '#fff4ea', ear: '#fbf1dc', earRest: 0.2, bent: true, sleepy: false, specs: false },
]
export const OLD_LOOK: PawnLook = { size: 1.66, head: '#c9b193', body: '#5b79c4', band: '#f4c542', ear: '#c9b193', earRest: 0.5, bent: false, sleepy: false, specs: true }

export type PawnPose = {
  /** Where its base stands, and how far it is off the ground. */
  x: number
  y: number
  lift: number
  wide: number
  tall: number
  lean: number
  /** 1 flat as a card, 0 upright, below 0 stretched. */
  flat: number
  /** How far the ears are thrown: along the hop (1 streaming behind), and which way the hop goes. */
  ears: number
  goX: number
  goY: number
  shut: boolean
  /** Where it looks, a pixel or two. */
  lookX: number
  lookY: number
  /** 0 to 1: wet, dripping, ears down. */
  wet: number
  /** 0 to 1: a tyre track across its tummy, or the stripes of the sleepers when the train left them. */
  track: number
  sleepers: boolean
  /** How far its ears have whirled round, in radians: the rabbit shaking herself dry. */
  whirl: number
  /** How far each ear has gone round, one each way, in radians: she windmills them for balance on a log. */
  mill: number
  /** -1 to 1: the wind of a passing train lays both ears over, to the left or to the right. */
  blown: number
  /** 0 to 1: its ears are folded down over its eyes. */
  hide: number
  /** Where one ear is across its tummy as it dusts a tyre track off, -1 to 1, or null when it is not dusting. */
  dust: number | null
  /** 0 to 1: it has lain down on its side. */
  lie: number
  /** 0 to 1: it is wrapped in the napkin. */
  napkin: number
  /** 0 to 1: it is up on its toes. */
  toes: number
  /** 0 to 1: its eyes are wide. */
  wide_eyed: number
  /** Seconds, for drips. */
  time: number
}

/** The hard shadow of a pawn: on the ground where it stands, sliding away and shrinking as the pawn rises. */
export function pawnShadow(ctx: Ctx, look: PawnLook, pose: PawnPose): void {
  // A flat pawn lies on the board and throws none.
  const s = look.size, f = Math.min(1, Math.max(0, pose.flat))
  if (f > 0.9) return
  ctx.fillStyle = INK.shadow
  const away = 1 + pose.lift / 90
  ellipse(ctx, pose.x + SHADOW_OFFSET.x * away * (1 - f), pose.y + SHADOW_OFFSET.y * away * (1 - f), 27 * s * pose.wide / Math.sqrt(away), 10 * s / Math.sqrt(away))
  ctx.fill()
}

function ear(ctx: Ctx, look: PawnLook, side: -1 | 1, angle: number, droop: number, gloss: boolean): void {
  ctx.save()
  ctx.translate(side * 9, -78)
  ctx.rotate(angle)
  ctx.fillStyle = look.ear
  if (look.bent && side === 1) {
    // Bent in the middle: the lower half upright, the tip folded over.
    roundRect(ctx, -6.5, -20, 13, 24, 6.5)
    ctx.fill()
    ctx.translate(0, -18)
    ctx.rotate(1.1 + droop * 0.4)
    roundRect(ctx, -6.5, -19, 13, 22, 6.5)
    ctx.fill()
  } else {
    roundRect(ctx, -6.5, -40, 13, 44, 6.5)
    ctx.fill()
    ctx.fillStyle = '#f3a6a0'
    roundRect(ctx, -3, -34, 6, 28, 3)
    ctx.fill()
    if (gloss) {
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      roundRect(ctx, -5, -36, 2.2, 22, 1.1)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** A turned wooden rabbit: a skittle body in bright paint, a ball head, two paddle ears, a painted face. */
export function pawn(ctx: Ctx, look: PawnLook, pose: PawnPose, gloss: boolean): void {
  const s = look.size, f = pose.flat
  const squashed = Math.min(1, Math.max(0, f)), stretched = Math.max(0, -f)
  ctx.save()
  // Flat, it lies on its back on the square, pressed a little wider than it was, face up. On the way down and
  // on the way up it buckles in the middle, and stretched it is taller and thinner than itself.
  ctx.translate(pose.x, pose.y - pose.lift + squashed * 20 * s - pose.lie * 14 * s)
  ctx.rotate(pose.lean * (1 - squashed) + pose.lie * 1.35)
  const buckle = 1 - 0.55 * Math.sin(squashed * Math.PI)
  ctx.scale(s * (pose.wide + (1.24 - pose.wide) * squashed) * (1 - stretched * 0.2), s * (pose.tall + (1 - pose.tall) * squashed) * buckle * (1 + stretched * 0.5))

  // Ears first, behind the head. They trail against the hop, or splay for a hop up or down the board, and hang when wet.
  const thrown = pose.ears
  const droop = pose.wet * 1.1
  // The big flat feet stick out in front, and lift off the ground on tiptoe.
  ctx.fillStyle = look.head
  for (const side of [-1, 1]) {
    ellipse(ctx, side * 14, -2 - pose.toes * 5, 12, 6 - pose.toes * 2.5, side * 0.25)
    ctx.fill()
  }
  if (pose.hide < 0.5) {
    for (const side of [-1, 1] as const) {
      // The ear that dusts is drawn in front, across the tummy.
      if (side === -1 && pose.dust !== null) continue
      const rest = side * (look.earRest + droop + squashed * 1.2)
      const trail = pose.goX !== 0 ? -pose.goX * thrown * 0.95 : side * thrown * 0.5 * (pose.goY !== 0 ? 1 : 0.6)
      const own = rest + trail + pose.whirl + side * pose.mill
      ear(ctx, look, side, own * (1 - Math.abs(pose.blown)) + pose.blown * 1.45, droop, gloss)
    }
  }

  // The base, the body and the collar band.
  ctx.fillStyle = look.body
  ellipse(ctx, 0, -6, 27, 9)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-27, -7)
  ctx.bezierCurveTo(-34, -30, -24, -44, -14, -48)
  ctx.lineTo(14, -48)
  ctx.bezierCurveTo(24, -44, 34, -30, 27, -7)
  ctx.closePath()
  ctx.fill()
  if (gloss && squashed < 0.5) {
    // Lathe rings, and the gloss streak down one side.
    ctx.fillStyle = 'rgba(0,0,0,0.1)'
    roundRect(ctx, -29, -18, 58, 2.4, 1.2)
    ctx.fill()
    roundRect(ctx, -26, -34, 52, 2, 1)
    ctx.fill()
    ctx.fillStyle = 'rgba(255,255,255,0.42)'
    ctx.beginPath()
    ctx.ellipse(-17, -27, 3.2, 13, 0.18, 0, Math.PI * 2)
    ctx.fill()
  }
  if (pose.track > 0.02 && pose.sleepers) {
    // Striped by the sleepers it was pressed into.
    ctx.fillStyle = `rgba(110, 72, 40, ${0.7 * pose.track})`
    for (let n = 0; n < 4; n++) {
      roundRect(ctx, -26 + n * 1.5, -42 + n * 9, 52 - n * 3, 4.5, 2)
      ctx.fill()
    }
  } else if (pose.track > 0.02) {
    // The tyre track across its tummy.
    ctx.fillStyle = `rgba(52, 48, 54, ${0.75 * pose.track})`
    for (let n = -3; n <= 3; n++) {
      roundRect(ctx, n * 8 - 2.6, -30, 5.2, 5, 1.5)
      ctx.fill()
      roundRect(ctx, n * 8 + 1.4, -22, 5.2, 5, 1.5)
      ctx.fill()
    }
  }
  if (pose.napkin > 0.02) {
    // Wrapped in the napkin, tummy to chin.
    ctx.fillStyle = '#fff4ea'
    roundRect(ctx, -31 * pose.napkin, -50, 62 * pose.napkin, 40, 12)
    ctx.fill()
    ctx.fillStyle = 'rgba(226, 80, 76, 0.55)'
    for (let n = 0; n < 3; n++) ctx.fillRect(-31 * pose.napkin, -44 + n * 12, 62 * pose.napkin, 4)
  }
  ctx.fillStyle = look.band
  ellipse(ctx, 0, -47, 15.5, 5.5)
  ctx.fill()

  // The head and the face.
  ctx.fillStyle = look.head
  ellipse(ctx, 0, -64, 21, 20)
  ctx.fill()
  if (gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.5)'
    ctx.beginPath()
    ctx.ellipse(-11, -72, 3, 7, 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  const ex = pose.lookX, ey = pose.lookY
  ctx.fillStyle = '#2b2622'
  const big = 1 + pose.wide_eyed * 0.7
  for (const side of [-1, 1]) {
    if (pose.shut) {
      roundRect(ctx, side * 8 - 4, -64.8, 8, 1.8, 0.9)
      ctx.fill()
    } else if (look.sleepy && pose.wide_eyed < 0.5) {
      // Half shut: the lower half of the eye under a lid.
      ctx.beginPath()
      ctx.arc(side * 8 + ex * 0.5, -65 + ey * 0.5, 3.3, 0, Math.PI)
      ctx.fill()
    } else {
      ellipse(ctx, side * 8 + ex, -65 + ey, 3.1 * big, 3.3 * big)
      ctx.fill()
    }
  }
  if (pose.wide_eyed > 0.3 && !pose.shut) {
    ctx.fillStyle = '#ffffff'
    for (const side of [-1, 1]) {
      ellipse(ctx, side * 8 + ex - 1, -66.4 + ey, 1.2, 1.2)
      ctx.fill()
    }
  }
  if (look.specs) {
    ctx.strokeStyle = '#3a3340'
    ctx.lineWidth = 1.6
    for (const side of [-1, 1]) {
      ellipse(ctx, side * 8, -65, 6.4, 6)
      ctx.stroke()
    }
    ctx.beginPath()
    ctx.moveTo(-1.8, -65)
    ctx.lineTo(1.8, -65)
    ctx.stroke()
  }
  ctx.fillStyle = '#ee8f92'
  ellipse(ctx, ex * 0.4, -58.2 + ey * 0.4, 2.7, 2.1)
  ctx.fill()
  // Round painted cheeks.
  ctx.fillStyle = 'rgba(238, 143, 146, 0.45)'
  for (const side of [-1, 1]) {
    ellipse(ctx, side * 14.5, -58.5, 4.2, 3)
    ctx.fill()
  }
  if (pose.dust !== null && pose.hide < 0.5) {
    // One ear bent down from the side of its head, brushing to and fro across the tyre track on its tummy.
    ctx.save()
    ctx.translate(-25, -60)
    ctx.rotate(-(0.42 + pose.dust * 0.34))
    ctx.fillStyle = look.ear
    roundRect(ctx, -6.5, -2, 13, 46, 6.5)
    ctx.fill()
    ctx.fillStyle = '#f3a6a0'
    roundRect(ctx, -3, 8, 6, 28, 3)
    ctx.fill()
    ctx.restore()
  }
  if (pose.hide >= 0.5) {
    // Its ears, folded down over its eyes.
    ctx.fillStyle = look.ear
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * 13, -80)
      ctx.rotate(side * -0.32)
      roundRect(ctx, -7, 0, 14, 30, 7)
      ctx.fill()
      ctx.restore()
    }
  }
  if (look.specs) {
    // Whiskers, which shake when it laughs.
    ctx.fillStyle = '#fffaf0'
    for (const side of [-1, 1]) {
      roundRect(ctx, side * 5 + (side < 0 ? -13 : 0), -57, 13, 1.5, 0.7)
      ctx.fill()
      roundRect(ctx, side * 5 + (side < 0 ? -12 : 0), -54, 12, 1.5, 0.7)
      ctx.fill()
    }
  }
  ctx.restore()

  // Drips fall from a wet pawn, straight down whatever its lean.
  if (pose.wet > 0.05 && squashed < 0.3) {
    ctx.fillStyle = `rgba(86, 178, 236, ${0.9 * pose.wet})`
    for (let n = 0; n < 3; n++) {
      const t = (pose.time * 1.7 + n * 0.37) % 1
      ellipse(ctx, pose.x + (n - 1) * 15 * s, pose.y - pose.lift - (56 - t * 50) * s, 2.3 * s, 3.6 * s)
      ctx.fill()
    }
  }
}

export type CarPose = { x: number; y: number; dir: 1 | -1; nod: number; pop: number; colour: string; lookBack: number }

/** A wooden toy car seen from above at a slight angle: a block on four wheels, a peg driver with wide eyes, lamps at the front. `nod` rocks it on its springs and `pop` shoots the driver's head up. */
export function car(ctx: Ctx, pose: CarPose, gloss: boolean): void {
  const { x, y, dir } = pose
  ctx.fillStyle = INK.shadow
  roundRect(ctx, x - 34 + SHADOW_OFFSET.x, y - 40 + SHADOW_OFFSET.y + 6, 68, 84, 16)
  ctx.fill()
  ctx.fillStyle = '#33303a'
  for (const side of [-1, 1]) for (const end of [-1, 1]) {
    roundRect(ctx, x + side * 33 - 7, y + end * 24 - 11 + 3, 14, 22, 6)
    ctx.fill()
  }
  // The side of the block shows below its top, which is what makes it stand up from the board.
  ctx.fillStyle = shade(pose.colour, -0.22)
  roundRect(ctx, x - 34, y - 38 + 8, 68, 82, 16)
  ctx.fill()
  ctx.fillStyle = pose.colour
  roundRect(ctx, x - 34, y - 42, 68, 82, 16)
  ctx.fill()
  // Lamps at the front.
  ctx.fillStyle = '#fff3b0'
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 20, y + dir * 32 - 1, 7, 5.5)
    ctx.fill()
  }
  // The cabin rocks against the way it goes when it nods.
  const cy = y - 3 - dir * pose.nod * 46
  ctx.fillStyle = shade(pose.colour, 0.2)
  roundRect(ctx, x - 23, cy - 21, 46, 40, 11)
  ctx.fill()
  if (gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    roundRect(ctx, x - 28, y - 34, 4, 46, 2)
    ctx.fill()
  }
  // The peg driver.
  const hy = cy - 4 - pose.pop * 16
  ctx.fillStyle = '#e9c79a'
  ellipse(ctx, x, hy, 13 + pose.pop * 2, 13 + pose.pop * 2)
  ctx.fill()
  // Its eyes go round the rim of the peg head as it spins to look behind.
  ctx.fillStyle = '#ffffff'
  const turn = pose.lookBack
  for (const side of [-1, 1]) {
    const a = side * 1.05 + turn * Math.PI
    ellipse(ctx, x + 6 * Math.sin(a), hy + dir * 6 * Math.cos(a), 4.2 + pose.pop * 1.6, 4.2 + pose.pop * 1.6)
    ctx.fill()
  }
  ctx.fillStyle = '#2b2622'
  for (const side of [-1, 1]) {
    const a = side * 1.05 + turn * Math.PI
    ellipse(ctx, x + 6 * Math.sin(a), hy + dir * 8.8 * Math.cos(a), 2, 2)
    ctx.fill()
  }
}

export type LorryPose = { x: number; y: number; dir: 1 | -1; shake: number; puff: number }

/** A wooden lorry two squares long, with `y` the middle of its front square: a cab with a driver who stares ahead, and a flat plank bed behind it. */
export function lorry(ctx: Ctx, pose: LorryPose, gloss: boolean): void {
  const { x, dir } = pose
  const front = pose.y, back = pose.y - dir * SQUARE.h
  const top = Math.min(front, back) - 44, len = SQUARE.h + 88
  ctx.fillStyle = INK.shadow
  roundRect(ctx, x - 38 + SHADOW_OFFSET.x, top + SHADOW_OFFSET.y + 8, 76, len, 12)
  ctx.fill()
  ctx.fillStyle = '#33303a'
  for (const side of [-1, 1]) for (const at of [front + dir * 14, back + dir * 22, back - dir * 22]) {
    roundRect(ctx, x + side * 37 - 7, at - 12 + 4, 14, 24, 6)
    ctx.fill()
  }
  // The bed: planks with a low rail, and a tailboard that shivers when the lorry stops.
  const bedY = dir === 1 ? back - 46 : back - 66
  ctx.fillStyle = '#a9773d'
  roundRect(ctx, x - 38, bedY + 8, 76, 104, 8)
  ctx.fill()
  ctx.fillStyle = '#dcae68'
  roundRect(ctx, x - 38, bedY, 76, 104, 8)
  ctx.fill()
  ctx.fillStyle = '#c4904c'
  for (let n = 1; n < 4; n++) ctx.fillRect(x - 38 + n * 19 - 1, bedY + 5, 2, 94)
  ctx.fillStyle = '#8f5f2c'
  roundRect(ctx, x - 38, bedY, 5, 104, 2.5)
  ctx.fill()
  roundRect(ctx, x + 33, bedY, 5, 104, 2.5)
  ctx.fill()
  const tail = dir === 1 ? bedY : bedY + 98
  roundRect(ctx, x - 38 + pose.shake * 60, tail, 76, 6, 3)
  ctx.fill()
  // The cab.
  ctx.fillStyle = '#b8442a'
  roundRect(ctx, x - 36, front - 34 + 8, 72, 74, 14)
  ctx.fill()
  ctx.fillStyle = '#ee6a3c'
  roundRect(ctx, x - 36, front - 38, 72, 74, 14)
  ctx.fill()
  ctx.fillStyle = '#fff3b0'
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * 22, front + dir * 28 - 2, 7.5, 5.5)
    ctx.fill()
  }
  ctx.fillStyle = '#f6905f'
  roundRect(ctx, x - 25, front - 22, 50, 40, 10)
  ctx.fill()
  if (gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    roundRect(ctx, x - 31, front - 30, 4, 44, 2)
    ctx.fill()
  }
  // The driver, who looks straight ahead and at nothing else.
  ctx.fillStyle = '#d9b48a'
  ellipse(ctx, x, front - 3, 14, 14)
  ctx.fill()
  ctx.fillStyle = '#2b2622'
  for (const side of [-1, 1]) {
    roundRect(ctx, x + side * 5.5 - 3, front - 3 + dir * 4 - 1, 6, 2.2, 1)
    ctx.fill()
  }
  // The pipe, and a puff from it as the lorry sets off.
  ctx.fillStyle = '#6e6a72'
  ellipse(ctx, x + 30, front - dir * 30, 5, 5)
  ctx.fill()
  if (pose.puff > 0 && pose.puff < 1) {
    ctx.fillStyle = `rgba(250, 246, 238, ${0.8 * (1 - pose.puff)})`
    ellipse(ctx, x + 34 + pose.puff * 10, front - dir * (30 + pose.puff * 34), 6 + pose.puff * 12, 6 + pose.puff * 12)
    ctx.fill()
  }
}

export type LogPose = { x: number; y: number; dir: 1 | -1; bob: number; turn: number; /** Tilted over a turtle's shell or rocked by the fish, in radians. */ tilt: number }

/** A turned log two squares long, with `y` the middle of its front square. It bobs, and rolls so that its knot comes round like an eye. */
export function log(ctx: Ctx, pose: LogPose, gloss: boolean): void {
  const { dir } = pose
  const mid = pose.y - dir * SQUARE.h * 0.5
  ctx.save()
  ctx.translate(pose.x, mid)
  ctx.rotate(pose.tilt)
  ctx.translate(-pose.x, -mid)
  logBody(ctx, pose, gloss)
  ctx.restore()
}

function logBody(ctx: Ctx, pose: LogPose, gloss: boolean): void {
  const { x, dir } = pose
  const back = pose.y - dir * SQUARE.h
  const top = Math.min(pose.y, back) - 44, len = SQUARE.h + 88
  const w = 66 * (1 + pose.bob)
  // The ring of lighter water it pushes aside, in place of a shadow.
  ctx.fillStyle = 'rgba(201, 236, 255, 0.55)'
  roundRect(ctx, x - w / 2 - 7, top - 5, w + 14, len + 10, 36)
  ctx.fill()
  ctx.fillStyle = '#7d5326'
  roundRect(ctx, x - w / 2, top + 5, w, len, 30)
  ctx.fill()
  ctx.fillStyle = '#b07d43'
  roundRect(ctx, x - w / 2, top, w, len, 30)
  ctx.fill()
  // Bark lines that slide across as it rolls.
  ctx.save()
  roundRect(ctx, x - w / 2, top, w, len, 30)
  ctx.clip()
  const phase = pose.turn * Math.PI * 2
  for (let n = 0; n < 4; n++) {
    const a = phase + (n / 4) * Math.PI * 2
    if (Math.cos(a) < -0.1) continue
    ctx.fillStyle = `rgba(110, 72, 32, ${0.25 + 0.4 * Math.cos(a)})`
    roundRect(ctx, x + Math.sin(a) * (w / 2 - 4) - 1.5, top + 22, 3, len - 44, 1.5)
    ctx.fill()
  }
  // The knot.
  const k = phase + 0.6
  if (Math.cos(k) > 0) {
    const kx = x + Math.sin(k) * (w / 2 - 12), ky = pose.y - dir * 30
    ctx.fillStyle = '#7d5326'
    ellipse(ctx, kx, ky, 9 * Math.cos(k), 11)
    ctx.fill()
    ctx.fillStyle = '#4a2f14'
    ellipse(ctx, kx, ky, 4 * Math.cos(k), 5)
    ctx.fill()
  }
  if (gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.28)'
    roundRect(ctx, x - w / 2 + 7, top + 26, 4, len - 52, 2)
    ctx.fill()
  }
  ctx.restore()
  // The cut ends, with their rings.
  for (const end of [top + 9, top + len - 9]) {
    ctx.fillStyle = '#e3bd85'
    ellipse(ctx, x, end, w / 2 - 6, 8)
    ctx.fill()
    ctx.fillStyle = '#b07d43'
    ellipse(ctx, x, end, w / 2 - 16, 4)
    ctx.fill()
  }
}

/** The fish's shadow under the printed waves. */
export function fishShadow(ctx: Ctx, x: number, y: number, wag: number): void {
  ctx.fillStyle = 'rgba(16, 70, 130, 0.42)'
  ellipse(ctx, x, y, 17, 30)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(x, y + 24)
  ctx.lineTo(x - 13 + wag * 9, y + 46)
  ctx.lineTo(x + 13 + wag * 9, y + 46)
  ctx.closePath()
  ctx.fill()
}

export type FishPose = {
  x: number
  y: number
  /** 0 under water, 1 fully up. */
  up: number
  /** 0 to 1: how far its cheeks are puffed. */
  puff: number
  /** Its mouth: 0 shut round the rabbit, 1 wide open in the spit. */
  open: number
  /** Whose ears stick out of its mouth, as that pawn's ear colour, or null when it holds nobody. */
  holds: string | null
  pleased: boolean
}

/** The fish, up out of the water: a round wooden head with a white edge, big eyes, cheeks that puff, and a pair of ears sticking out of its mouth. */
export function fish(ctx: Ctx, pose: FishPose, gloss: boolean): void {
  if (pose.up <= 0.01) return
  const { x, y } = pose
  const r = 36 * pose.up
  ctx.save()
  // It comes up through the water: nothing of it shows below the waterline.
  ctx.beginPath()
  ctx.rect(x - 80, y - 150, 160, 150 + 20)
  ctx.clip()
  const cy = y - 6 - 34 * pose.up
  ctx.fillStyle = 'rgba(201, 236, 255, 0.8)'
  ellipse(ctx, x, y + 6, 48 * pose.up, 15 * pose.up)
  ctx.fill()
  if (pose.holds) {
    ctx.fillStyle = pose.holds
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(x + side * 9, cy - r * 0.2)
      ctx.rotate(side * 0.35)
      roundRect(ctx, -6, -r - 22, 12, 40, 6)
      ctx.fill()
      ctx.restore()
    }
  }
  ctx.fillStyle = '#fffaf0'
  ellipse(ctx, x, cy, r * (1.08 + pose.puff * 0.2) + 3, r + 3)
  ctx.fill()
  ctx.fillStyle = '#f08a2e'
  ellipse(ctx, x, cy, r * (1.08 + pose.puff * 0.2), r)
  ctx.fill()
  ctx.fillStyle = '#f7b25c'
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * r * (0.7 + pose.puff * 0.2), cy + r * 0.2, r * (0.3 + pose.puff * 0.22), r * (0.26 + pose.puff * 0.18))
    ctx.fill()
  }
  if (gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.beginPath()
    ctx.ellipse(x - r * 0.55, cy - r * 0.5, r * 0.1, r * 0.3, 0.6, 0, Math.PI * 2)
    ctx.fill()
  }
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#ffffff'
    ellipse(ctx, x + side * r * 0.42, cy - r * 0.3, r * 0.26, r * 0.28)
    ctx.fill()
    ctx.fillStyle = '#2b2622'
    if (pose.pleased) {
      roundRect(ctx, x + side * r * 0.42 - r * 0.2, cy - r * 0.32, r * 0.4, r * 0.09, r * 0.04)
      ctx.fill()
    } else {
      ellipse(ctx, x + side * r * 0.42, cy - r * 0.36, r * 0.11, r * 0.12)
      ctx.fill()
    }
  }
  ctx.fillStyle = '#7a2e12'
  ellipse(ctx, x, cy + r * 0.34 - pose.open * r * 0.1, r * (0.3 - pose.open * 0.08), r * (0.07 + pose.open * 0.24))
  ctx.fill()
  ctx.restore()
}

/** A splash: a ring on the water and drops thrown up from it. `t` runs from 0 to 1. */
export function splash(ctx: Ctx, x: number, y: number, t: number, size: number): void {
  if (t <= 0 || t >= 1) return
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * (1 - t)})`
  ctx.lineWidth = 4 * (1 - t) + 1
  ellipse(ctx, x, y + 4, (18 + 44 * t) * size, (7 + 15 * t) * size)
  ctx.stroke()
  ctx.fillStyle = `rgba(214, 240, 255, ${1 - t * t})`
  for (let n = 0; n < 7; n++) {
    const a = -Math.PI / 2 + (n - 3) * 0.33
    const far = (30 + (n % 3) * 16) * size
    ellipse(ctx, x + Math.cos(a) * far * t * 1.6, y + Math.sin(a) * far * 2.4 * t + 150 * t * t * size, 5 * size * (1 - t * 0.5), 7 * size * (1 - t * 0.5))
    ctx.fill()
  }
}

/** A puff of dust where a pawn landed or a pancake peeled up. `t` runs from 0 to 1. */
export function dust(ctx: Ctx, x: number, y: number, t: number, size: number, colour: string): void {
  if (t <= 0 || t >= 1) return
  ctx.fillStyle = colour
  ctx.globalAlpha = 0.7 * (1 - t)
  for (const side of [-1, 1]) {
    ellipse(ctx, x + side * (16 + 26 * t) * size, y - 3 - 8 * t * size, (7 + 7 * t) * size, (5 + 5 * t) * size)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

export type CatPose = {
  /** Where its eyes go, in pixels. */
  lookX: number
  lookY: number
  /** 0 to 1: purring, eyes closing. */
  purr: number
  /** 0 to 1: flinching, ears flat and eyes squeezed. */
  flinch: number
  /** 0 to 1: its pupils wide, at the fish, and its tongue over its nose. */
  keen: number
  shut: boolean
  /** A slow sway of the head, in radians, and the twitch of one ear, 0 to 1. */
  sway: number
  twitch: number
  /** 0 to 1: its tail is up over the cards, for a thump. */
  tail: number
  /** 0 to 1: it has ducked down behind the cards. */
  duck: number
}

/** The cat that looks over the cards at the far edge: ears, a striped forehead and two big eyes that follow the rabbit. The cards in front of it are painted again over it by the view. */
export function cat(ctx: Ctx, pose: CatPose, gloss: boolean): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(CAT.x - 260, -400, 520, CAT_SHOWS_TO + 2 + 400)
  ctx.clip()
  const fur = '#ef9a3c', dark = '#c46f1f'
  // The tail, which comes up beside it and thumps.
  if (pose.tail > 0.01) {
    ctx.save()
    ctx.translate(CAT.x + CAT.rx + 26, CAT_SHOWS_TO + 30)
    ctx.rotate(-0.5 + pose.tail * 0.9)
    ctx.fillStyle = fur
    roundRect(ctx, -11, -84 * pose.tail, 22, 100, 11)
    ctx.fill()
    ctx.fillStyle = dark
    for (let n = 0; n < 3; n++) ctx.fillRect(-11, -74 * pose.tail + n * 18, 22, 6)
    ctx.restore()
  }
  ctx.translate(CAT.x, CAT.y + pose.flinch * 12 - pose.purr * 3 + pose.duck * 90)
  ctx.rotate(pose.sway + pose.purr * 0.07)
  // Ears, which go flat sideways in a flinch.
  for (const side of [-1, 1] as const) {
    ctx.save()
    ctx.translate(side * 70, -34)
    ctx.rotate(side * (0.2 + pose.flinch * 1.0) + (side === 1 ? pose.twitch * 0.3 : 0))
    ctx.fillStyle = fur
    ctx.beginPath()
    ctx.moveTo(-30, 22)
    ctx.quadraticCurveTo(-8, -40, 4, -54)
    ctx.quadraticCurveTo(22, -30, 32, 22)
    ctx.closePath()
    ctx.fill()
    ctx.fillStyle = '#f7b9a8'
    ctx.beginPath()
    ctx.moveTo(-14, 16)
    ctx.quadraticCurveTo(-2, -22, 4, -34)
    ctx.quadraticCurveTo(14, -16, 18, 16)
    ctx.closePath()
    ctx.fill()
    ctx.restore()
  }
  ctx.fillStyle = fur
  ellipse(ctx, 0, 0, CAT.rx, CAT.ry)
  ctx.fill()
  // Stripes on the forehead.
  ctx.fillStyle = dark
  for (const [dx, w, h] of [[-26, 9, 20], [0, 10, 26], [26, 9, 20]] as const) {
    roundRect(ctx, dx - w / 2, -CAT.ry + 5, w, h, w / 2)
    ctx.fill()
  }
  if (gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.22)'
    ctx.beginPath()
    ctx.ellipse(-66, -24, 8, 18, 0.7, 0, Math.PI * 2)
    ctx.fill()
  }
  // The eyes.
  const squeeze = Math.max(pose.purr, pose.flinch * 0.7)
  for (const side of [-1, 1]) {
    const x = side * 40, y = -14
    if (pose.shut || squeeze > 0.75) {
      ctx.fillStyle = '#2b2622'
      roundRect(ctx, x - 20, y - 2.5, 40, 5.5, 2.7)
      ctx.fill()
      continue
    }
    ctx.fillStyle = '#f7f3c8'
    ellipse(ctx, x, y, 23, 18 * (1 - squeeze * 0.7))
    ctx.fill()
    ctx.fillStyle = '#2b2622'
    ellipse(ctx, x + pose.lookX, y + pose.lookY * (1 - squeeze), 5.5 + pose.keen * 9, 14 * (1 - squeeze * 0.7))
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ellipse(ctx, x + pose.lookX - 4, y + pose.lookY - 6 * (1 - squeeze), 3, 3)
    ctx.fill()
  }
  // Its nose shows just over the cards, and its tongue comes up over it when the fish does.
  ctx.fillStyle = '#e8748a'
  ellipse(ctx, 0, 6, 8, 5.5)
  ctx.fill()
  if (pose.keen > 0.05) {
    ctx.fillStyle = '#f29bb0'
    ellipse(ctx, Math.sin(pose.keen * Math.PI * 3) * 9, 7 - pose.keen * 2, 7, 6 * pose.keen + 2)
    ctx.fill()
  }
  ctx.restore()
}

/** The cake the old rabbit holds out on its stand, with a cherry: `slices` of five are left of it. */
export function cake(ctx: Ctx, x: number, y: number, bob: number, slices: number): void {
  ctx.fillStyle = INK.shadow
  ellipse(ctx, x + SHADOW_OFFSET.x * 0.7, y + SHADOW_OFFSET.y * 0.7 + 3, 26, 10)
  ctx.fill()
  ctx.fillStyle = '#b98a58'
  ellipse(ctx, x, y + 2 - bob, 27, 10)
  ctx.fill()
  ctx.fillStyle = '#fffaf0'
  ellipse(ctx, x, y - 1 - bob, 22, 7.5)
  ctx.fill()
  if (slices <= 0) {
    // Crumbs.
    ctx.fillStyle = '#f2c9a0'
    for (const [dx, dy] of [[-8, -2], [3, 0], [10, -3]]) {
      ellipse(ctx, x + dx, y + dy - bob, 2.4, 1.6)
      ctx.fill()
    }
    return
  }
  const w = 6 + 6.5 * slices
  ctx.fillStyle = '#f2c9a0'
  roundRect(ctx, x - w / 2, y - 20 - bob, w, 19, 6)
  ctx.fill()
  ctx.fillStyle = '#fffaf0'
  ellipse(ctx, x, y - 20 - bob, w / 2, 6.5)
  ctx.fill()
  ctx.fillStyle = '#f29bb0'
  ellipse(ctx, x, y - 10 - bob, w / 2, 3)
  ctx.fill()
  ctx.fillStyle = '#d7263d'
  ellipse(ctx, x, y - 25.5 - bob, 5, 5)
  ctx.fill()
}

/** One slice of the cake, on its way to a guest or in front of one: `eaten` from 0 to 1 takes bites out of it. */
export function slice(ctx: Ctx, x: number, y: number, size: number, eaten: number): void {
  if (eaten >= 1) return
  const w = 22 * size * (1 - eaten * 0.75), h = 15 * size
  ctx.fillStyle = '#ffffff'
  ellipse(ctx, x, y + 3, 17 * size, 6.5 * size)
  ctx.fill()
  ctx.fillStyle = '#f2c9a0'
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y + 2)
  ctx.lineTo(x - w / 2, y - h)
  ctx.lineTo(x + w / 2, y - h * 0.6)
  ctx.lineTo(x + w / 2, y + 2)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = '#f29bb0'
  ctx.fillRect(x - w / 2, y - h * 0.5, w, 2.6 * size)
  ctx.fillStyle = '#fffaf0'
  ctx.beginPath()
  ctx.moveTo(x - w / 2, y - h)
  ctx.lineTo(x + w / 2, y - h * 0.6)
  ctx.lineTo(x + w / 2, y - h * 0.6 + 3 * size)
  ctx.lineTo(x - w / 2, y - h + 3 * size)
  ctx.closePath()
  ctx.fill()
}

export type TurtlePose = {
  x: number
  y: number
  /** How deep it lies: 0 head high, 0.5 shell awash, 1 under. */
  depth: number
  /** Where its eyes look: up at its rider is (0, -1). */
  lookX: number
  lookY: number
  shut: boolean
  /** A stream of bubbles from under a log, 0 to 1 through it, or -1. */
  bubbles: number
  /** A slosh as its count changes. */
  slosh: number
  /** 0 to 1: how far its head is out at the least, to look up at whoever stands on it, even with its shell awash. */
  peek: number
}

/** A turtle: a round patterned shell that stays where it is, a head that pokes out towards the near edge, and four flippers. Under, it is a dark shape and a ring of bubbles. */
export function turtle(ctx: Ctx, pose: TurtlePose, gloss: boolean): void {
  const { x, y } = pose
  const d = Math.min(1, Math.max(0, pose.depth))
  if (d > 0.9) {
    // Gone under: its shape under the waves, and the ring of bubbles it left.
    ctx.fillStyle = 'rgba(16, 70, 130, 0.3)'
    ellipse(ctx, x, y + 6, 34, 28)
    ctx.fill()
    // A loose ring of bubbles of all sizes, none of them in step with the next.
    ctx.fillStyle = 'rgba(232, 247, 255, 0.9)'
    for (const [a, size, far] of [[0.3, 5, 1], [1.05, 2.6, 0.9], [2.2, 4, 1.06], [2.75, 2.2, 0.82], [3.9, 5.4, 1], [4.4, 3, 1.1], [5.5, 3.6, 0.94]] as const) {
      ellipse(ctx, x + Math.cos(a) * 30 * far, y + 4 + Math.sin(a) * 21 * far, size, size)
      ctx.fill()
    }
    return
  }
  const sink = d * 16
  // The ring of lighter water round it, wider as it sinks.
  ctx.fillStyle = 'rgba(201, 236, 255, 0.6)'
  ellipse(ctx, x, y + 6, 47 + d * 8 + pose.slosh * 50, 39 + d * 6 + pose.slosh * 40)
  ctx.fill()
  const shell = '#3e9b6b', rim = '#2c7a55', skin = '#b9d86a'
  // Flippers and tail.
  ctx.fillStyle = skin
  if (d < 0.3) {
    for (const [dx, dy, turn] of [[-36, -20, -0.7], [36, -20, 0.7], [-34, 26, 0.6], [34, 26, -0.6]] as const) {
      ellipse(ctx, x + dx, y + dy, 13, 8, turn)
      ctx.fill()
    }
  }
  // The head, towards the near edge: high, or drawn in.
  const out = Math.max(1 - Math.min(1, d * 2), pose.peek)
  if (out > 0.02) {
    const hy = y + 26 + out * 16
    ellipse(ctx, x, hy, 15, 14)
    ctx.fill()
    for (const side of [-1, 1]) {
      ctx.fillStyle = '#ffffff'
      ellipse(ctx, x + side * 7, hy + 1, 5, 5)
      ctx.fill()
      ctx.fillStyle = '#2b2622'
      if (pose.shut) {
        roundRect(ctx, x + side * 7 - 4.5, hy, 9, 2, 1)
        ctx.fill()
      } else {
        ellipse(ctx, x + side * 7 + pose.lookX * 2, hy + 1 + pose.lookY * 2, 2.4, 2.6)
        ctx.fill()
      }
    }
  }
  ctx.fillStyle = rim
  ellipse(ctx, x, y + 5 + sink * 0.2, 38, 32)
  ctx.fill()
  ctx.fillStyle = shell
  ellipse(ctx, x, y + sink * 0.2, 38, 32)
  ctx.fill()
  // The pattern on its shell.
  ctx.fillStyle = '#f4d35e'
  ellipse(ctx, x, y + sink * 0.2, 13, 11)
  ctx.fill()
  for (let n = 0; n < 6; n++) {
    const a = (n / 6) * Math.PI * 2
    ellipse(ctx, x + Math.cos(a) * 25, y + sink * 0.2 + Math.sin(a) * 21, 6.5, 5.5)
    ctx.fill()
  }
  if (gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.beginPath()
    ctx.ellipse(x - 20, y - 12 + sink * 0.2, 4, 11, 0.7, 0, Math.PI * 2)
    ctx.fill()
  }
  if (d > 0.25) {
    // Awash: the water laps over the rim of the shell.
    ctx.fillStyle = `rgba(86, 178, 236, ${0.25 + d * 0.5})`
    ellipse(ctx, x, y + 4, 40, 34)
    ctx.fill()
    ctx.fillStyle = shell
    ellipse(ctx, x, y - 2, 24 - d * 6, 19 - d * 5)
    ctx.fill()
    ctx.fillStyle = '#f4d35e'
    ellipse(ctx, x, y - 2, 11, 9)
    ctx.fill()
  }
  if (pose.bubbles >= 0 && pose.bubbles < 1) {
    ctx.fillStyle = `rgba(232, 247, 255, ${1 - pose.bubbles})`
    for (let n = 0; n < 5; n++) {
      ellipse(ctx, x - 44 - n * 5 - pose.bubbles * 18, y + 30 - n * 9 - pose.bubbles * 26, 5 - n * 0.5, 5 - n * 0.5)
      ctx.fill()
    }
  }
}

export type TrainFace = {
  x: number
  /** In the far arch, or the near one. */
  far: boolean
  /** 0 asleep, 0.5 one eye open, 1 wide awake. */
  awake: number
  /** The bubble at its funnel: 0 to 1 as it grows, and gone at 1. */
  bubble: number
  /** 0 to 1: steam snorted as it wakes. */
  steam: number
  /** Its breath, a slow in and out. */
  breath: number
  /** 0 to 1: its eyes are bleary. */
  bleary: number
  /** 0 to 1: how wide it yawns, after a run. */
  yawn: number
}

/** The train's face in the mouth of its tunnel: a round red nose-plate, two lamps for eyes, a funnel, and the bubble it blows as it snores. */
export function trainFace(ctx: Ctx, pose: TrainFace): void {
  const y = pose.far ? MOUTH.far : MOUTH.near
  const { x } = pose
  const r = 24 + pose.breath * 1.2
  ctx.fillStyle = '#b3342b'
  ellipse(ctx, x, y + 2, r + 2, r * 0.86 + 2)
  ctx.fill()
  ctx.fillStyle = '#e2504c'
  ellipse(ctx, x, y, r, r * 0.86)
  ctx.fill()
  // The funnel.
  ctx.fillStyle = '#3a3340'
  roundRect(ctx, x - 7, y - r - 8, 14, 13, 3)
  ctx.fill()
  roundRect(ctx, x - 10, y - r - 11, 20, 6, 3)
  ctx.fill()
  // The eyes: shut lines asleep, one and then both open awake, half-lidded when bleary.
  for (const side of [-1, 1]) {
    const open = side === -1 ? Math.min(1, pose.awake * 2) : Math.max(0, pose.awake * 2 - 1)
    const ex = x + side * 10, ey = y - 3
    if (open < 0.15) {
      // A shut eye: a lid curved down like a sleeper's, with lashes at its outer end.
      ctx.fillStyle = '#2b2622'
      ctx.beginPath()
      ctx.moveTo(ex - 7, ey - 2)
      ctx.quadraticCurveTo(ex, ey + 6, ex + 7, ey - 2)
      ctx.quadraticCurveTo(ex, ey + 2.2, ex - 7, ey - 2)
      ctx.closePath()
      ctx.fill()
      continue
    }
    ctx.fillStyle = '#fff3b0'
    ellipse(ctx, ex, ey, 7.5, 7.5 * open * (1 - pose.bleary * 0.5))
    ctx.fill()
    ctx.fillStyle = '#2b2622'
    ellipse(ctx, ex, ey + pose.bleary * 2, 3, 3 * open * (1 - pose.bleary * 0.5))
    ctx.fill()
    if (pose.bleary > 0.3) {
      ctx.fillStyle = '#e2504c'
      ctx.fillRect(ex - 8, ey - 8, 16, 8 * pose.bleary)
    }
  }
  // Its mouth: a small smile under a round brass nose, so the face is a face.
  ctx.fillStyle = '#f4c542'
  ellipse(ctx, x, y + r * 0.12, 4.5, 4)
  ctx.fill()
  ctx.fillStyle = '#5a1712'
  ctx.beginPath()
  ctx.moveTo(x - 9, y + r * 0.38)
  ctx.quadraticCurveTo(x, y + r * 0.38 + 9, x + 9, y + r * 0.38)
  ctx.quadraticCurveTo(x, y + r * 0.38 + 4, x - 9, y + r * 0.38)
  ctx.closePath()
  ctx.fill()
  // A yawn: its mouth opens wide under its eyes, which squeeze shut, and closes again.
  if (pose.yawn > 0.03) {
    ctx.fillStyle = '#5a1712'
    ellipse(ctx, x, y + r * 0.4, 7 + pose.yawn * 6, 2 + pose.yawn * 12)
    ctx.fill()
    ctx.fillStyle = '#f29bb0'
    ellipse(ctx, x, y + r * 0.4 + pose.yawn * 7, 4 + pose.yawn * 3, pose.yawn * 4)
    ctx.fill()
  }
  if (pose.bubble > 0.02 && pose.bubble < 1) {
    const br = 4 + pose.bubble * 12
    ctx.fillStyle = 'rgba(232, 247, 255, 0.75)'
    ellipse(ctx, x + 14 + br * 0.6, y - r - 10 - br * 0.6, br, br)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
    ellipse(ctx, x + 14 + br * 0.3, y - r - 10 - br * 0.9, br * 0.25, br * 0.25)
    ctx.fill()
  }
  if (pose.steam > 0.02 && pose.steam < 1) {
    ctx.fillStyle = `rgba(250, 246, 238, ${0.85 * (1 - pose.steam)})`
    for (const side of [-1, 1]) {
      ellipse(ctx, x + side * (22 + pose.steam * 30), y + 8 - pose.steam * 10, 8 + pose.steam * 12, 7 + pose.steam * 9)
      ctx.fill()
    }
  }
}

/** The train running its lane: an engine with its face in front and two wagons behind, three squares long, with `y` the middle of its face. `dir` is 1 going towards the near edge. */
export function trainRunning(ctx: Ctx, x: number, y: number, dir: 1 | -1, shut: boolean, bleary: number, gloss: boolean): void {
  const len = SQUARE.h * 3
  const top = dir === 1 ? y - len + 40 : y - 40
  ctx.fillStyle = INK.shadow
  roundRect(ctx, x - 40 + SHADOW_OFFSET.x, top + SHADOW_OFFSET.y + 6, 80, len, 16)
  ctx.fill()
  // The wagons, then the engine.
  for (let n = 2; n >= 1; n--) {
    const wy = y - dir * n * SQUARE.h
    ctx.fillStyle = n === 1 ? '#2f8f83' : '#f4c542'
    roundRect(ctx, x - 36, wy - 44, 72, 88, 10)
    ctx.fill()
    ctx.fillStyle = 'rgba(0,0,0,0.14)'
    roundRect(ctx, x - 26, wy - 34, 52, 68, 6)
    ctx.fill()
  }
  ctx.fillStyle = '#b3342b'
  roundRect(ctx, x - 40, y - 44 + 6, 80, 90, 18)
  ctx.fill()
  ctx.fillStyle = '#e2504c'
  roundRect(ctx, x - 40, y - 46, 80, 90, 18)
  ctx.fill()
  ctx.fillStyle = '#3a3340'
  ellipse(ctx, x, y - dir * 8, 13, 13)
  ctx.fill()
  ctx.fillStyle = '#6e6a72'
  ellipse(ctx, x, y - dir * 8, 7, 7)
  ctx.fill()
  if (gloss) {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    roundRect(ctx, x - 34, y - 36, 4, 60, 2)
    ctx.fill()
  }
  for (const side of [-1, 1]) {
    const ex = x + side * 18, ey = y + dir * 26
    if (shut) {
      // A shut eye is a curved lid, never a bar.
      ctx.strokeStyle = '#2b2622'
      ctx.lineWidth = 3.2
      ctx.lineCap = 'round'
      ctx.beginPath()
      ctx.arc(ex, ey - 5, 8.5, 0.2 * Math.PI, 0.8 * Math.PI)
      ctx.stroke()
    } else {
      ctx.fillStyle = '#fff3b0'
      ellipse(ctx, ex, ey, 9, 9 * (1 - bleary * 0.5))
      ctx.fill()
      ctx.fillStyle = '#2b2622'
      ellipse(ctx, ex, ey + dir * 2, 3.6, 3.6 * (1 - bleary * 0.5))
      ctx.fill()
    }
  }
  // Steam streaming behind it.
  ctx.fillStyle = 'rgba(250, 246, 238, 0.75)'
  for (let n = 0; n < 3; n++) {
    ellipse(ctx, x + (n % 2 ? 9 : -7), y - dir * (40 + n * 42), 13 + n * 5, 11 + n * 4)
    ctx.fill()
  }
}

export type DuckPose = {
  x: number
  y: number
  lift: number
  /** Which way it faces: 1 to the right. */
  face: 1 | -1
  /** Its rock from foot to foot, in radians. */
  rock: number
  /** 1 flat as a card, 0 upright. */
  flat: number
  /** 0 to 1: its beak is open in a quack. */
  quack: number
  /** 0 to 1: shaking itself. */
  shake: number
  shut: boolean
  /** 0 to 1: striped by the sleepers, or tyre-marked. */
  track: number
}

/** The duck: a yellow wooden pull-along duck with its chest out, an orange beak and one bright eye. */
export function duck(ctx: Ctx, pose: DuckPose, gloss: boolean): void {
  const f = Math.min(1, Math.max(0, pose.flat))
  if (f < 0.9) {
    ctx.fillStyle = INK.shadow
    const away = 1 + pose.lift / 90
    ellipse(ctx, pose.x + SHADOW_OFFSET.x * away, pose.y + SHADOW_OFFSET.y * away, 30 / Math.sqrt(away), 11 / Math.sqrt(away))
    ctx.fill()
  }
  ctx.save()
  ctx.translate(pose.x + Math.sin(pose.shake * 40) * 4 * pose.shake, pose.y - pose.lift + f * 16)
  ctx.rotate(pose.rock * (1 - f))
  ctx.scale(pose.face * (1 + f * 0.25), 1 - f * 0.72)
  const body = '#f7d038', dark = '#e0b21c'
  // The wheels of a pull-along toy.
  ctx.fillStyle = '#e2504c'
  for (const dx of [-15, 15]) {
    ellipse(ctx, dx, -4, 8, 8)
    ctx.fill()
  }
  // The body, chest out in front, tail up behind.
  ctx.fillStyle = body
  ctx.beginPath()
  ctx.moveTo(-34, -30)
  ctx.quadraticCurveTo(-30, -6, 0, -6)
  ctx.quadraticCurveTo(34, -6, 30, -36)
  ctx.quadraticCurveTo(22, -44, 6, -38)
  ctx.quadraticCurveTo(-16, -30, -34, -44)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = dark
  ellipse(ctx, -6, -22, 14, 8, -0.2)
  ctx.fill()
  // The head, held high.
  ctx.fillStyle = body
  ellipse(ctx, 20, -56, 17, 16)
  ctx.fill()
  ctx.fillStyle = '#ef8a2e'
  roundRect(ctx, 30, -58 - pose.quack * 5, 20, 6, 3)
  ctx.fill()
  roundRect(ctx, 30, -52 + pose.quack * 5, 18, 5, 2.5)
  ctx.fill()
  ctx.fillStyle = '#2b2622'
  if (pose.shut) {
    roundRect(ctx, 18, -61, 9, 2, 1)
    ctx.fill()
  } else {
    ellipse(ctx, 23, -60, 3.2, 3.4)
    ctx.fill()
  }
  if (gloss && f < 0.5) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)'
    ctx.beginPath()
    ctx.ellipse(12, -62, 3, 6, 0.5, 0, Math.PI * 2)
    ctx.fill()
  }
  if (pose.track > 0.02) {
    ctx.fillStyle = `rgba(52, 48, 54, ${0.7 * pose.track})`
    for (let n = -2; n <= 2; n++) {
      roundRect(ctx, n * 9 - 3, -26, 6, 5, 1.5)
      ctx.fill()
      roundRect(ctx, n * 9 + 1.5, -18, 6, 5, 1.5)
      ctx.fill()
    }
  }
  ctx.restore()
}

/** The bell on its plate, which wobbles as it rings: `ring` runs from 1 to 0. */
export function bell(ctx: Ctx, x: number, y: number, ring: number, time: number): void {
  ctx.save()
  ctx.translate(x, y - 2)
  ctx.rotate(ring * 0.5 * Math.sin(time * 38))
  ctx.fillStyle = '#b07b1f'
  ellipse(ctx, 0, 3, 18, 8)
  ctx.fill()
  ctx.fillStyle = '#f4c542'
  ctx.beginPath()
  ctx.moveTo(-17, 2)
  ctx.quadraticCurveTo(-15, -24, 0, -26)
  ctx.quadraticCurveTo(15, -24, 17, 2)
  ctx.closePath()
  ctx.fill()
  ellipse(ctx, 0, -27, 4.5, 4.5)
  ctx.fill()
  ctx.fillStyle = 'rgba(255,255,255,0.55)'
  ctx.beginPath()
  ctx.ellipse(-8, -12, 2.6, 8, 0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  if (ring > 0.05) {
    // The ring, going out from it.
    ctx.strokeStyle = `rgba(255, 244, 190, ${ring})`
    ctx.lineWidth = 3.5
    for (const from of [0.5, 3.64]) {
      ctx.beginPath()
      ctx.ellipse(x, y - 6, 28 + (1 - ring) * 30, 19 + (1 - ring) * 20, 0, from, from + 2.1)
      ctx.stroke()
    }
  }
}

/** The pupils of an onlooker at the table's edge, over the eye whites the still picture holds, or its shut lids. */
export function pupils(ctx: Ctx, x: number, y: number, gap: number, r: number, lookX: number, lookY: number, shut: boolean, lid: string): void {
  for (const side of [-1, 1]) {
    if (shut) {
      ctx.fillStyle = lid
      ellipse(ctx, x + side * gap, y, r + 2.5, r + 2.5)
      ctx.fill()
      ctx.fillStyle = '#2b2622'
      roundRect(ctx, x + side * gap - r, y - 1, r * 2, 2.2, 1.1)
      ctx.fill()
    } else {
      ctx.fillStyle = '#2b2622'
      ellipse(ctx, x + side * gap + lookX, y + lookY, r * 0.62, r * 0.66)
      ctx.fill()
    }
  }
}

/** A snore bubble at somebody's nose, 0 to 1 as it grows. */
export function bubble(ctx: Ctx, x: number, y: number, grow: number): void {
  if (grow <= 0.02 || grow >= 1) return
  const r = 3 + grow * 10
  ctx.fillStyle = 'rgba(232, 247, 255, 0.8)'
  ellipse(ctx, x, y - r, r, r)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)'
  ellipse(ctx, x - r * 0.35, y - r * 1.35, r * 0.24, r * 0.24)
  ctx.fill()
}

/** The idle glow: a breathing ring round what can be touched now. */
export function glowRing(ctx: Ctx, x: number, y: number, rx: number, ry: number, strength: number): void {
  if (strength <= 0.01) return
  ctx.strokeStyle = `rgba(255, 246, 170, ${0.85 * strength})`
  ctx.lineWidth = 7
  ellipse(ctx, x, y, rx, ry)
  ctx.stroke()
  ctx.strokeStyle = `rgba(255, 255, 255, ${0.9 * strength})`
  ctx.lineWidth = 2.5
  ellipse(ctx, x, y, rx, ry)
  ctx.stroke()
}

/** The ghost hand: a mitten with one finger out, which comes down on a square and lifts again. */
export function hand(ctx: Ctx, x: number, y: number, press: number, opacity: number): void {
  if (opacity <= 0.01) return
  ctx.save()
  ctx.globalAlpha = opacity * 0.92
  ctx.translate(x + 26, y + 34 - press * 12)
  ctx.rotate(-0.5)
  const k = 1 - press * 0.06
  ctx.scale(k, k)
  ctx.fillStyle = 'rgba(46, 26, 12, 0.3)'
  roundRect(ctx, -22 + 7, -10 + 9, 48, 54, 20)
  ctx.fill()
  ctx.fillStyle = '#fffaf0'
  roundRect(ctx, -22, -10, 48, 54, 20)
  ctx.fill()
  roundRect(ctx, -19, -54, 17, 60, 8.5)
  ctx.fill()
  roundRect(ctx, 16, 0, 22, 15, 7.5)
  ctx.fill()
  ctx.fillStyle = 'rgba(226, 80, 76, 0.2)'
  roundRect(ctx, -16, -51, 11, 15, 5.5)
  ctx.fill()
  ctx.restore()
  // Where the finger comes down.
  if (press > 0.05) {
    ctx.strokeStyle = `rgba(255, 255, 255, ${opacity * press})`
    ctx.lineWidth = 4
    ellipse(ctx, x, y, 16 + press * 14, 9 + press * 8)
    ctx.stroke()
  }
}

/** A colour made lighter (above 0) or darker (below 0) by `by`, from -1 to 1. */
export function shade(hex: string, by: number): string {
  const n = parseInt(hex.slice(1), 16)
  const mix = (v: number) => Math.round(by >= 0 ? v + (255 - v) * by : v * (1 + by))
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`
}
