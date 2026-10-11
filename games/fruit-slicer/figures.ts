import type { DogPose } from './dogMotion'
import { BLUE, INK, RED, WHITE, YELLOW, eye, inked, oval, poly, shade, rect, type Screens } from './look'

// The characters, drawn in the look: flat colour, a dot screen on the shaded
// side, a black brush line round everything. Each is drawn about its own
// origin in design units and takes a pose as plain numbers, so a pure motion
// module can drive it later. The fruit is never drawn here.

type Ctx = CanvasRenderingContext2D

/** The pelican: slow, heavy, deadpan. Origin at the middle of its body; it faces right. `pouch` swells the pouch, 0 to 1. */
export function pelican(ctx: Ctx, screens: Screens, x: number, y: number, s: number, pouch = 0.2): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  const body = oval(0, 20, 92, 112)
  // Feet first, under the body.
  for (const fx of [-34, 26]) inked(ctx, poly([[fx, 120], [fx + 46, 138], [fx + 6, 142], [fx - 22, 138]]), YELLOW, 5, screens.of(ctx, RED, 0.35))
  inked(ctx, body, WHITE, 6)
  shade(ctx, body, screens.of(ctx, BLUE, 0.3), oval(38, 62, 96, 108))
  // The wing, folded.
  const wing = oval(-22, 34, 54, 72, -0.25)
  inked(ctx, wing, WHITE, 5, screens.of(ctx, BLUE, 0.5))
  // Neck and head.
  inked(ctx, poly([[-8, -70], [44, -84], [58, -150], [8, -160]]), WHITE, 6)
  const head = oval(34, -168, 50, 44)
  inked(ctx, head, WHITE, 6)
  shade(ctx, head, screens.of(ctx, BLUE, 0.3), oval(60, -146, 46, 36))
  // The tuft, the part a blade takes off and that pops back.
  inked(ctx, poly([[4, -204], [-14, -238], [16, -214], [20, -246], [36, -212], [52, -236], [50, -202]]), WHITE, 5)
  // The beak: a long upper bill and the pouch that hangs from it.
  const sag = 28 + pouch * 70
  inked(ctx, (c) => {
    c.moveTo(70, -160)
    c.bezierCurveTo(150, -150 + sag, 250, -140 + sag * 1.2, 318, -120)
    c.lineTo(72, -176)
    c.closePath()
  }, YELLOW, 6, screens.of(ctx, RED, 0.45))
  inked(ctx, poly([[66, -186], [330, -126], [318, -112], [70, -158]]), YELLOW, 6)
  inked(ctx, poly([[318, -112], [330, -126], [338, -104]]), RED, 4)
  // A deadpan eye under a heavy lid.
  eye(ctx, 46, -176, 13, 0.5, 0.2)
  inked(ctx, (c) => c.ellipse(46, -180, 15, 12, 0, Math.PI, Math.PI * 2), WHITE, 4)
  ctx.restore()
}

/** One of the twins: a shrew, quick and twitchy. Origin at the middle of its body. `facing` is 1 or -1. */
export function shrew(ctx: Ctx, screens: Screens, x: number, y: number, s: number, facing: 1 | -1, coat: string): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s * facing, s)
  // Tail, body, then the long nose that is its funny part.
  ctx.beginPath()
  ctx.moveTo(-30, 44)
  ctx.bezierCurveTo(-78, 60, -84, 6, -58, -6)
  ctx.lineWidth = 6
  ctx.strokeStyle = INK
  ctx.lineCap = 'round'
  ctx.stroke()
  const body = oval(0, 18, 40, 50)
  inked(ctx, body, coat, 5)
  shade(ctx, body, screens.of(ctx, INK, 0.28), oval(-22, 40, 44, 44))
  inked(ctx, oval(4, 36, 20, 26), WHITE, 0)
  for (const ear of [-20, 12]) inked(ctx, oval(ear, -52, 15, 17), coat, 5, screens.of(ctx, RED, 0.5))
  const head = poly([[-34, -30], [-14, -58], [24, -52], [92, -14], [26, 2], [-22, 0]])
  inked(ctx, head, coat, 5)
  inked(ctx, oval(92, -14, 8, 7), RED, 4)
  eye(ctx, 18, -30, 8, 0.6, 0.1)
  for (const foot of [-16, 14]) inked(ctx, oval(foot, 68, 14, 7), WHITE, 4)
  ctx.restore()
}

/** One ant of the file: tiny and brisk. Origin at its middle; it faces right. `lift` raises its front legs, 0 to 1. */
export function ant(ctx: Ctx, x: number, y: number, s: number, lift = 0): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  ctx.strokeStyle = INK
  ctx.lineWidth = 4
  ctx.lineCap = 'round'
  // Six legs, the part of an ant that is funny.
  // Each leg has a root of its own and keeps to its own strip under the body, so no leg crosses another.
  for (const lx of [-12, 0, 12]) {
    ctx.beginPath()
    ctx.moveTo(lx - 3, 4)
    ctx.lineTo(lx - 4, 18)
    ctx.lineTo(lx - 5, 32)
    ctx.moveTo(lx + 3, 4)
    ctx.lineTo(lx + 4, 18 - lift * 8)
    ctx.lineTo(lx + 5, 32 - lift * 16)
    ctx.stroke()
  }
  inked(ctx, oval(-24, 0, 17, 13), INK, 0)
  inked(ctx, oval(0, 2, 10, 9), INK, 0)
  inked(ctx, oval(21, -6, 14, 13), INK, 0)
  // A shine on the back, the one mark of the page on something this small.
  inked(ctx, oval(-28, -5, 6, 3, -0.4), RED, 0)
  eye(ctx, 26, -9, 5, 0.5, 0)
  // Two feelers, each from its own root.
  for (const [root, tip] of [[22, [36, -34]], [29, [46, -22]]] as const) {
    ctx.beginPath()
    ctx.moveTo(root, -17)
    ctx.quadraticCurveTo(root + 4, -30, tip[0], tip[1])
    ctx.stroke()
  }
  ctx.restore()
}

/** What `Screens` gives a figure: a dot screen of a colour and a tone. A test hands in a plain stand-in. */
type Dots = Pick<Screens, 'of'>

/**
 * The dog under the counter, looking up over its edge. Origin at the top of its head, at rest. The pose is the
 * numbers dogMotion.ts gives: nothing about how the dog moves is decided here.
 */
export function dog(ctx: Ctx, screens: Dots, x: number, y: number, s: number, pose: DogPose): void {
  ctx.save()
  ctx.translate(x, y - pose.lift * s)
  ctx.scale(s, s)
  // The tail stands up behind the head and swings from where it stands: it thumps at a bark.
  ctx.save()
  ctx.translate(34, 14)
  ctx.rotate(0.35 + pose.tail)
  inked(ctx, oval(0, -32, 8, 30), WHITE, 5, screens.of(ctx as CanvasRenderingContext2D, INK, 0.5))
  ctx.restore()
  // The whole head turns about its middle: a tilt, or the full circle it turns for the smallest things.
  ctx.translate(0, 44)
  ctx.rotate(pose.tilt + pose.spin)
  ctx.translate(0, -44)
  const head = oval(0, 44, 56, 46)
  // Ears flop either side, each on its own swing; one carries the patch.
  for (const [side, swing, fill] of [[-1, pose.earLeft, INK], [1, pose.earRight, WHITE]] as const) {
    ctx.save()
    ctx.translate(side * 46, 16)
    ctx.rotate(side * (-0.35 - swing))
    inked(ctx, oval(side * 4, 34, 20, 40), fill, 5, side > 0 ? screens.of(ctx as CanvasRenderingContext2D, INK, 0.5) : undefined)
    ctx.restore()
  }
  // Cheeks, behind the head, bulging by what is in them.
  if (pose.cheeks > 0.02) for (const side of [-1, 1]) inked(ctx, oval(side * (44 + 16 * pose.cheeks), 62, 14 + 16 * pose.cheeks, 14 + 12 * pose.cheeks), WHITE, 5)
  inked(ctx, head, WHITE, 6)
  shade(ctx, head, screens.of(ctx as CanvasRenderingContext2D, BLUE, 0.3), oval(26, 70, 50, 38))
  inked(ctx, oval(-22, 26, 22, 20), WHITE, 0, screens.of(ctx as CanvasRenderingContext2D, INK, 0.5))
  for (const side of [-1, 1]) {
    eye(ctx, side * 20, 26, 10, pose.eyeX, pose.eyeY)
    // A lid comes down over the eye: a blink, a yawn, the effort of a long piece.
    if (pose.lids > 0.05) inked(ctx, (c) => c.ellipse(side * 20, 26 - 11.5 * (1 - pose.lids), 11, 11.5 * pose.lids + 1, 0, 0, Math.PI * 2), WHITE, 3)
  }
  // The lower jaw drops under the muzzle, and the tongue with it.
  const drop = 16 * pose.jaw
  if (pose.jaw > 0.04) inked(ctx, oval(0, 62 + drop * 0.6, 22, 10 + drop * 0.5), INK, 4)
  if (pose.tongue > 0.04) inked(ctx, rect(-9, 64 + drop * 0.5, 18, 6 + pose.tongue * 24), RED, 4)
  inked(ctx, oval(0, 56, 30, 20), WHITE, 5)
  inked(ctx, oval(0, 46 - 2 * pose.sniff, 12 + 2 * pose.sniff, 8 + 1.5 * pose.sniff), INK, 0)
  ctx.restore()
}
