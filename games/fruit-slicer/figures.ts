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
  // Whiskers.
  ctx.lineWidth = 2.5
  for (const dy of [-10, 0, 10]) {
    ctx.beginPath()
    ctx.moveTo(62, -12)
    ctx.lineTo(96, -34 + dy * 2.4)
    ctx.stroke()
  }
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
  for (const [lx, bend] of [[-12, -8], [0, 0], [12, 8]] as const) {
    ctx.beginPath()
    ctx.moveTo(lx, 4)
    ctx.lineTo(lx + bend - 6, 20)
    ctx.lineTo(lx + bend - 12, 32)
    ctx.moveTo(lx, 4)
    ctx.lineTo(lx + bend + 8, 18 - lift * 26)
    ctx.lineTo(lx + bend + 14, 32 - lift * 52)
    ctx.stroke()
  }
  inked(ctx, oval(-24, 0, 17, 13), INK, 0)
  inked(ctx, oval(0, 2, 10, 9), INK, 0)
  inked(ctx, oval(21, -6, 14, 13), INK, 0)
  // A shine on the back, the one mark of the page on something this small.
  inked(ctx, oval(-28, -5, 6, 3, -0.4), RED, 0)
  eye(ctx, 26, -9, 5, 0.5, 0)
  for (const tip of [[36, -34], [46, -22]] as const) {
    ctx.beginPath()
    ctx.moveTo(26, -17)
    ctx.quadraticCurveTo(30, -30, tip[0], tip[1])
    ctx.stroke()
  }
  ctx.restore()
}

/** The dog under the counter, looking up over its edge. Origin at the top of its head. `tongue` is 0 to 1. */
export function dog(ctx: Ctx, screens: Screens, x: number, y: number, s: number, tongue = 0.6): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(s, s)
  const head = oval(0, 44, 56, 46)
  // Ears flop either side; one carries the patch.
  inked(ctx, oval(-56, 44, 20, 40, 0.35), INK, 5)
  inked(ctx, oval(56, 44, 20, 40, -0.35), WHITE, 5, screens.of(ctx, INK, 0.5))
  inked(ctx, head, WHITE, 6)
  shade(ctx, head, screens.of(ctx, BLUE, 0.3), oval(26, 70, 50, 38))
  inked(ctx, oval(-22, 26, 22, 20), WHITE, 0, screens.of(ctx, INK, 0.5))
  eye(ctx, -20, 26, 10, 0.1, -0.7)
  eye(ctx, 20, 26, 10, -0.1, -0.7)
  inked(ctx, oval(0, 56, 30, 22), WHITE, 5)
  inked(ctx, oval(0, 46, 12, 8), INK, 0)
  if (tongue > 0) inked(ctx, rect(-9, 66, 18, 10 + tongue * 22), RED, 4)
  ctx.restore()
}
