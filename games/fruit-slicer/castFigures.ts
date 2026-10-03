import type { CastPose } from './cast'
import type { Feast } from './feast'
import { BLUE, FLESH, INK, RED, RIND, WHITE, YELLOW, eye, inked, oval, poly, shade, type Screens } from './look'
import type { Fruit } from './measure'
import type { Who } from './orders'
import type { Show } from './scenes'

// The five customers, drawn in the look: flat colour, a dot screen on the
// shaded side, a black brush line round everything. Each is drawn about its
// feet, about 150 units tall at a scale of 1, facing right, from the pose its
// motion gives and from what it has eaten. Nothing about how a customer moves
// is decided here. What it ate shows through as flat bars of the fruit's
// colour, each at its own length: the fruit is never anything but a length.

type Ctx = CanvasRenderingContext2D
type Dots = Pick<Screens, 'of'>
/** What a figure is drawn from. `pose(member)` gives the pose of one of several bodies: a twin, or an ant of the file. */
export type Casting = {
  who: Who
  fruit: Fruit
  pose: (member: number) => CastPose
  feast: Feast
  show: Show | null
  /** For the ants: how many stand in the file, and how many parts the fruit is cut into, so a piece lies across the ants it is as long as. */
  count: number
  parts: number
}

const GREY = '#9aa6b8'

/** Stands a body on its feet at (x, y): its hop, its lean, how flat the roller left it and how tall it gathers itself. */
function stand(ctx: Ctx, x: number, y: number, s: number, pose: CastPose, body: () => void): void {
  ctx.save()
  ctx.translate(x, y - (pose.hop + pose.bob) * s)
  ctx.rotate(pose.lean)
  ctx.scale(s * (1 + 0.6 * pose.flat), s * (1 + pose.stretch) * (1 - 0.88 * pose.flat))
  body()
  ctx.restore()
}

/** A piece inside a customer: a flat bar of the fruit's colour, `size` of a whole fruit long when a whole is `whole` units. */
function lump(ctx: Ctx, fruit: Fruit, x: number, y: number, size: number, whole: number, h = 8): void {
  const w = Math.max(3, size * whole)
  ctx.fillStyle = FLESH[fruit]
  ctx.fillRect(x, y, w, h)
  ctx.lineWidth = 1.5
  ctx.strokeStyle = RIND[fruit]
  ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5)
}

/** A lid over an eye: half shut is a deadpan, shut is a blink. Wide eyes have none. */
function lid(ctx: Ctx, x: number, y: number, r: number, lids: number, fill: string): void {
  if (lids <= 0.05) return
  inked(ctx, (c) => c.ellipse(x, y - r * (1 - lids), r * 1.15, r * lids * 1.2 + 0.5, 0, 0, Math.PI * 2), fill, 2)
}

function pelican(ctx: Ctx, dots: Dots, cast: Casting): void {
  const pose = cast.pose(0), feast = cast.feast, show = cast.show
  const away = show?.kind === 'glider' ? show.away : 0, wings = show?.kind === 'glider' ? show.wings : 0
  const tries = show?.kind === 'glider' ? Math.abs(Math.sin(show.tries * Math.PI)) * (show.tries < 2 ? 1 : 0) : 0
  ctx.translate(away * 760, -away * 40)
  ctx.rotate(0.2 * wings - 0.1 * away)
  for (const fx of [-14, 12]) inked(ctx, poly([[fx, -4], [fx + 20, 2], [fx + 2, 4], [fx - 10, 2]]), YELLOW, 3, dots.of(ctx, RED, 0.35))
  const body = oval(0, -52, 38, 46)
  inked(ctx, body, WHITE, 4)
  shade(ctx, body, dots.of(ctx, BLUE, 0.3), oval(16, -34, 40, 44))
  ctx.save()
  ctx.translate(-10, -52)
  ctx.rotate(-0.25 - 0.9 * pose.bit - 1.5 * wings)
  inked(ctx, oval(0, 4 - 20 * wings, 22 + 26 * wings, 30 - 12 * wings), WHITE, 3.5, dots.of(ctx, BLUE, 0.5))
  ctx.restore()
  // What it ate lies in the belly, each piece at its own length, and shows through.
  ctx.save()
  ctx.beginPath()
  body(ctx)
  ctx.clip()
  feast.lumps.filter((one) => one.at >= 1).slice(-6).forEach((one, row) => lump(ctx, cast.fruit, -34, -28 - row * 11, Math.min(1, one.size), 70, 9))
  ctx.restore()
  // The neck, and a head that can turn away to preen.
  inked(ctx, poly([[-4, -90], [18, -96], [24, -122], [4, -126]]), WHITE, 4)
  ctx.save()
  ctx.translate(14, -124)
  ctx.rotate(pose.head)
  inked(ctx, poly([[-12, -14], [-20, -32 * pose.tuft - 6], [-8, -18], [-6, -34 * pose.tuft - 6], [2, -18], [8, -30 * pose.tuft - 6], [8, -12]]), WHITE, 3)
  inked(ctx, oval(2, 0, 20, 18), WHITE, 4)
  // The pouch: it sags by what is in it and by the open beak, and swings after the body, late.
  const open = Math.max(pose.mouth, feast.mouth, tries)
  const inPouch = feast.lumps.filter((one) => one.at < 1)
  const sag = 12 + 30 * open + 14 * inPouch.length
  inked(ctx, (c) => {
    c.moveTo(18, 4)
    c.bezierCurveTo(50 + 30 * pose.part, 6 + sag, 90 + 30 * pose.part, 10 + sag, 118, 14 + 10 * open)
    c.lineTo(18, -4)
    c.closePath()
  }, YELLOW, 4, dots.of(ctx, RED, 0.45))
  for (const one of inPouch) lump(ctx, cast.fruit, 100 - one.at * 80 - Math.min(1, one.size) * 30, 4 + sag * 0.5 - 4, Math.min(1, one.size), 60)
  inked(ctx, poly([[16, -8], [122, 8], [118, 14 + 10 * open], [18, 4 + 6 * open]]), YELLOW, 4)
  if (wings > 0 || away > 0) lump(ctx, cast.fruit, 60, -2, 1, 110, 12)
  eye(ctx, 6, -4, 6 * (pose.lids < 0 ? 1 - pose.lids * 0.3 : 1), 0.5 + pose.eyeX * 0.5, pose.eyeY)
  lid(ctx, 6, -4, 6, Math.max(0, pose.lids, 0.5 * feast.pleased), WHITE)
  ctx.restore()
}

function shrew(ctx: Ctx, dots: Dots, cast: Casting, member: number): void {
  const pose = cast.pose(member), feast = cast.feast
  ctx.beginPath()
  ctx.moveTo(-16, -12)
  ctx.bezierCurveTo(-40, -4, -44, -30 - 10 * pose.bit, -30, -36)
  ctx.lineWidth = 3.5
  ctx.strokeStyle = INK
  ctx.lineCap = 'round'
  ctx.stroke()
  const body = oval(0, -28, 22, 28)
  inked(ctx, body, GREY, 3.5)
  shade(ctx, body, dots.of(ctx, INK, 0.28), oval(-12, -16, 24, 24))
  inked(ctx, oval(3, -20, 11, 15), WHITE, 0)
  // Its share of what the two ate, each piece at its own length.
  const total = feast.lumps.reduce((sum, one) => sum + one.size, 0)
  let before = 0
  feast.lumps.filter((one) => one.at >= 1).forEach((one) => {
    const mine = (before + one.size / 2 < total / 2) === (member === 0)
    before += one.size
    if (mine) lump(ctx, cast.fruit, -14, -20 - (before * 40) % 18, Math.min(1, one.size), 56, 6)
  })
  for (const [ear, lift] of [[-10, 0], [8, 3]] as const) inked(ctx, oval(ear, -62 - lift - 4 * Math.abs(pose.bit), 8, 9 + 2 * pose.bit), GREY, 3, dots.of(ctx, RED, 0.5))
  ctx.save()
  ctx.translate(0, -46)
  ctx.rotate(pose.head * 0.5)
  // The long nose is its funny part: it twitches, and the tip twitches more.
  const tip = -6 + 9 * pose.part - 10 * Math.max(pose.mouth, feast.mouth)
  inked(ctx, poly([[-18, 4], [-8, -14], [12, -12], [50, tip], [14, 14], [-12, 14]]), GREY, 3.5)
  if (pose.mouth > 0.1 || feast.mouth > 0.1) inked(ctx, poly([[14, 12], [44, tip + 8 + 8 * Math.max(pose.mouth, feast.mouth)], [16, 18]]), RED, 2.5)
  inked(ctx, oval(50, tip, 4.5, 4), RED, 2.5)
  if (pose.tuft > 0.3) {
    ctx.lineWidth = 1.5
    for (const dy of [-8, 0, 8]) {
      ctx.beginPath()
      ctx.moveTo(34, tip + 2)
      ctx.lineTo(34 + 18 * pose.tuft, tip - 10 + dy * 1.6)
      ctx.stroke()
    }
  }
  eye(ctx, 8, -2, 4.5 * (pose.lids < 0 ? 1.3 : 1), 0.6 + 0.4 * pose.eyeX, pose.eyeY)
  lid(ctx, 8, -2, 4.5, Math.max(0, pose.lids, 0.6 * feast.pleased), GREY)
  ctx.restore()
  for (const foot of [-8, 8]) inked(ctx, oval(foot, 0, 8, 4), WHITE, 2.5)
}

function antBody(ctx: Ctx, pose: CastPose, flat: number): void {
  ctx.save()
  ctx.scale(1 + 0.5 * flat, 1 - 0.85 * flat)
  ctx.rotate(pose.head > 1 ? 0 : pose.lean)
  if (pose.head > Math.PI / 2) ctx.scale(-1, 1)
  ctx.strokeStyle = INK
  ctx.lineWidth = 2.6
  ctx.lineCap = 'round'
  // Six legs that never rest: the stride is the funny part.
  for (const [lx, pair] of [[-9, 0], [0, 1], [9, 2]] as const) {
    const stride = Math.sin(pose.part * 2 + pair * 2.1) * 5
    ctx.beginPath()
    ctx.moveTo(lx, -10)
    ctx.lineTo(lx - 4 + stride, -3)
    ctx.lineTo(lx - 7 + stride, 0)
    ctx.moveTo(lx, -10)
    ctx.lineTo(lx + 5 - stride, -3)
    ctx.lineTo(lx + 8 - stride, 0)
    ctx.stroke()
  }
  inked(ctx, oval(-15, -14, 10, 8), INK, 0)
  inked(ctx, oval(0, -13, 6, 6), INK, 0)
  inked(ctx, oval(13, -18, 9, 8.5), INK, 0)
  inked(ctx, oval(-17, -17, 4, 2, -0.4), RED, 0)
  eye(ctx, 16, -20, 3.4, 0.5, 0)
  if (pose.tuft > 0.3) {
    for (const reach of [1, 0.6]) {
      ctx.beginPath()
      ctx.moveTo(16, -25)
      ctx.quadraticCurveTo(18, -34 - 4 * pose.bit, 18 + 10 * reach, -30 - 8 * reach - 5 * pose.bit)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function cat(ctx: Ctx, dots: Dots, cast: Casting): void {
  const pose = cast.pose(0), feast = cast.feast
  // The tail is its funny part: it curls slowly, flicks, and stands up when the longer tin is filled.
  const curl = pose.part + 1.2 * feast.tail
  ctx.beginPath()
  ctx.moveTo(-26, -14)
  ctx.bezierCurveTo(-64, -10, -70 + 20 * Math.sin(curl), -60 - 30 * curl, -44 + 30 * Math.sin(curl * 1.7), -74 - 40 * Math.min(1.4, curl))
  ctx.lineWidth = 11
  ctx.strokeStyle = INK
  ctx.lineCap = 'round'
  ctx.stroke()
  ctx.lineWidth = 6
  ctx.strokeStyle = YELLOW
  ctx.stroke()
  const body = oval(0, -40, 32, 42)
  inked(ctx, body, YELLOW, 4, dots.of(ctx, RED, 0.4))
  inked(ctx, oval(4, -30, 17, 26), WHITE, 0)
  feast.lumps.filter((one) => one.at >= 1).slice(-5).forEach((one, row) => lump(ctx, cast.fruit, -18, -18 - row * 10, Math.min(1, one.size), 44))
  for (const paw of [-12, 14]) inked(ctx, oval(paw, -2, 11, 6), WHITE, 3)
  ctx.save()
  ctx.translate(4, -92)
  ctx.rotate(pose.head * 0.4)
  for (const side of [-1, 1]) inked(ctx, poly([[side * 8, -18], [side * 26, -40 - 6 * pose.bit * side], [side * 26, -8]]), YELLOW, 3.5, side > 0 ? dots.of(ctx, RED, 0.4) : undefined)
  inked(ctx, oval(0, 0, 28, 24), YELLOW, 4, dots.of(ctx, RED, 0.25))
  for (const side of [-1, 1]) {
    // Crossed over two equal shares; turned to the gap, then to the piece, when it was given the smaller one.
    const look = feast.cross > 0 ? -side * feast.cross : feast.gaze !== 0 ? feast.gaze : pose.eyeX
    eye(ctx, side * 11, -4, 7 * (pose.lids < 0 ? 1.25 : 1), look, pose.eyeY + 0.3 * feast.gaze * feast.gaze)
    lid(ctx, side * 11, -4, 7, Math.max(0, pose.lids, 0.7 * feast.pleased), YELLOW)
  }
  inked(ctx, poly([[-3, 6], [3, 6], [0, 10]]), RED, 2)
  const open = Math.max(pose.mouth, feast.mouth)
  if (open > 0.08) inked(ctx, oval(0, 15, 6, 2 + 8 * open), INK, 2)
  if (pose.tuft > 0.3) {
    ctx.lineWidth = 1.6
    ctx.strokeStyle = INK
    for (const side of [-1, 1]) for (const dy of [-4, 2]) {
      ctx.beginPath()
      ctx.moveTo(side * 10, 9)
      ctx.lineTo(side * (10 + 26 * pose.tuft), 9 + dy * 2 + 3 * pose.bit)
      ctx.stroke()
    }
  }
  ctx.restore()
}

function boa(ctx: Ctx, dots: Dots, cast: Casting): void {
  const pose = cast.pose(0), feast = cast.feast
  // The body is one long wave from the head back to the far end, which does everything last.
  const at = (u: number): [number, number] => {
    const lag = pose.part - u * 3.2
    const sneeze = feast.sneeze >= 0 ? 14 * Math.exp(-(((u - feast.sneeze) * 7) ** 2)) : 0
    return [70 - u * 150, -16 - 9 * Math.sin(lag * 2) * (0.4 + u) - sneeze - (1 - u) * (1 - u) * 60 * (u < 0.25 ? 1 - u * 4 : 0)]
  }
  const spine: [number, number][] = Array.from({ length: 31 }, (_, i) => at(i / 30))
  ctx.beginPath()
  spine.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))
  ctx.lineJoin = ctx.lineCap = 'round'
  ctx.lineWidth = 30
  ctx.strokeStyle = INK
  ctx.stroke()
  ctx.lineWidth = 23
  ctx.strokeStyle = WHITE
  ctx.stroke()
  ctx.lineWidth = 23
  ctx.strokeStyle = dots.of(ctx, BLUE, 0.5)
  ctx.stroke()
  // What it swallowed travels down it as swellings, each as long as the piece, and comes to rest along its length.
  feast.lumps.forEach((one, k) => {
    const rest = 0.3 + (0.62 * (k + 0.5)) / Math.max(1, feast.lumps.length)
    const u = one.at >= 1 ? rest : 0.05 + one.at * (rest - 0.05)
    const [x, y] = at(u)
    lump(ctx, cast.fruit, x - Math.min(1.2, one.size) * 17, y - 5, Math.min(1.2, one.size), 34, 10)
  })
  const [hx, hy] = at(0)
  ctx.save()
  ctx.translate(hx, hy - 6)
  ctx.rotate(-0.3 + pose.head * 0.6)
  const open = Math.max(pose.mouth, feast.mouth)
  if (pose.bit > 0.05) {
    ctx.beginPath()
    ctx.moveTo(22, 4)
    ctx.lineTo(22 + 22 * pose.bit, 2)
    ctx.lineTo(28 + 24 * pose.bit, -4)
    ctx.moveTo(22 + 22 * pose.bit, 2)
    ctx.lineTo(28 + 24 * pose.bit, 8)
    ctx.lineWidth = 2.5
    ctx.strokeStyle = RED
    ctx.stroke()
  }
  if (open > 0.08) inked(ctx, poly([[4, 6], [30, 6 + 16 * open], [4, 12]]), RED, 3)
  inked(ctx, oval(8, 0, 22, 13), WHITE, 4, dots.of(ctx, BLUE, 0.5))
  if (pose.tuft > 0.3) inked(ctx, poly([[-6, -11], [-2, -11 - 12 * pose.tuft], [4, -12], [8, -12 - 10 * pose.tuft], [12, -11]]), RED, 2.5)
  eye(ctx, 14, -4, 5 * (pose.lids < 0 ? 1.3 : 1), 0.5 + 0.5 * pose.eyeX, pose.eyeY)
  lid(ctx, 14, -4, 5, Math.max(0, pose.lids, 0.6 * feast.pleased), WHITE)
  ctx.restore()
}

/** How wide a customer stands at a scale of 1, for whoever lays out the window and the queue. */
export const WIDTH: Readonly<Record<Who, number>> = { pelican: 190, twins: 150, ants: 44, cat: 110, boa: 170 }

/**
 * Draws a customer standing with its feet at (x, y). The twins are two bodies facing each other; the ants are a
 * file of `count`, one for each part of the order, spaced to fit `room` units across.
 */
export function drawCustomer(ctx: Ctx, dots: Dots, cast: Casting, x: number, y: number, s: number, room = 400): void {
  if (cast.who === 'twins') {
    const feast = cast.feast
    for (const member of [0, 1]) {
      const side = member === 0 ? -1 : 1
      stand(ctx, x + side * 46 * s + feast.pull * 10 * s, y, s, cast.pose(member), () => {
        ctx.scale(-side, 1)
        ctx.rotate(-0.12 * Math.abs(feast.pull))
        shrew(ctx, dots, cast, member)
      })
    }
    // The longer piece, pulled between them like a rope.
    if (feast.pull !== 0) {
      ctx.save()
      ctx.translate(x + feast.pull * 16 * s, y - 50 * s)
      ctx.scale(s, s)
      lump(ctx, cast.fruit, -24, -4, 1, 48, 8)
      ctx.restore()
    }
    return
  }
  if (cast.who === 'ants') {
    const count = Math.max(1, cast.count)
    const gap = Math.min(44 * s, room / count)
    const k = gap / 44
    for (let member = 0; member < count; member++) {
      const pose = cast.pose(member)
      const flat = Math.max(pose.flat, cast.feast.flat[member] ?? 0)
      stand(ctx, x + member * gap, y, k, { ...pose, flat: 0 }, () => antBody(ctx, pose, flat))
    }
    // What they carry rides above the file, each piece as long as the ants it lies across.
    let along = 0
    for (const one of cast.feast.lumps) {
      const w = one.size * cast.parts * gap
      lump(ctx, cast.fruit, x - 20 * k + along, y - (38 + 40 * (1 - one.at)) * k, 1, w, 8 * k + 3)
      along += w
    }
    return
  }
  stand(ctx, x, y, s, cast.pose(0), () => {
    if (cast.who === 'pelican') pelican(ctx, dots, cast)
    else if (cast.who === 'cat') cat(ctx, dots, cast)
    else boa(ctx, dots, cast)
  })
}
